"""The LoRA loop, on Needle's own building blocks.

Needle's ``finetune_local`` is one function: load, encode, split, train,
save once at the end. This is the same loop — the same checkpoint loader,
encoder, LoRA targets, QAT numerics, schedule, optimiser and loss — opened
up in the two places a run on a CPU budget needs:

- the validation rows are chosen by the caller (``fit_path`` and
  ``dev_path``), so they can be held out by *target* rather than at random
  and paraphrases of one target do not sit on both sides;
- an ``on_epoch`` hook sees the adapter after every epoch and can save it,
  so one run yields one candidate per epoch instead of one at the end.

Everything else is imported from ``needle.model``; the version range in
``pyproject.toml`` is what keeps that honest.
"""

from __future__ import annotations

import pickle
import time
from pathlib import Path

import numpy as np


def save_adapter(path: Path, lora, scale: float, base: str, rank: int, qat_bits,
                 qat_bits_map, seed: int) -> None:
    """Needle's adapter pickle, byte-for-byte the shape ``build_main`` reads."""
    payload = {
        "lora": {"/".join(p): {"A": np.asarray(v["A"]), "B": np.asarray(v["B"])}
                 for p, v in lora.items()},
        "scale": float(scale),
        "base": base,
        "rank": rank,
        "qat_bits": qat_bits,
        "qat_bits_map": qat_bits_map,
        "seed": seed,
    }
    with open(path, "wb") as handle:
        pickle.dump(payload, handle)


def finetune(args, progress=None, on_epoch=None) -> dict:
    """``args`` carries: checkpoint, fit_path, dev_path (or None), length_path
    (the file the sequence length is fitted over), epochs, batch_size, lr,
    lora_rank, lora_alpha, max_len, seed, qat_bits, out.

    ``progress(line)`` receives the same lines ``needle finetune`` prints.
    ``on_epoch(epoch, record, save)`` runs after each epoch's validation
    pass with ``record = {epoch, loss, val_loss}`` and ``save(path)`` that
    writes the adapter as it stands; whatever it adds to ``record`` is kept.
    Returns the run's shape and the epoch records."""
    import jax
    import jax.numpy as jnp
    import optax
    from needle.model.architecture import SimpleAttentionNetwork
    from needle.model.finetune import (
        _training_rng,
        fit_max_len,
        init_lora,
        load_jsonl,
        lora_target_paths,
        merge_lora,
    )
    from needle.model.quantize import (
        configure_deploy,
        cq_ste_mixed_params,
        cq_ste_params,
        parse_bits_map,
    )
    from needle.model.run import load_checkpoint
    from needle.model.tokenizer import get_tokenizer

    def emit(msg: str) -> None:
        print(msg, flush=True)
        if progress:
            progress(msg)

    base_path = str(args.checkpoint)
    params, config = load_checkpoint(base_path)
    config.dtype = "float32"
    params = jax.tree.map(lambda a: np.asarray(a).astype(np.float32), params)
    backend = jax.default_backend().lower()
    if backend == "metal":
        config.flash = False
        config.remat = False
        config.scan_unroll = config.num_layers
    params = jax.device_put(params)
    emit(f"  {'backend':<9} {backend}  float32")

    tokenizer = get_tokenizer(config.vocab_size)
    max_len = fit_max_len(str(args.length_path), tokenizer, args.max_len)
    seqs, masks = load_jsonl(str(args.fit_path), tokenizer, max_len)
    if len(seqs) == 0:
        raise SystemExit(f"no usable examples in {args.fit_path}")
    if args.dev_path:
        val_seqs, val_masks = load_jsonl(str(args.dev_path), tokenizer, max_len)
    else:
        val_seqs, val_masks = np.zeros((0, max_len), np.int32), np.zeros((0, max_len), np.float32)
    n_val = len(val_seqs)
    emit(f"  {'data':<9} {len(seqs) + n_val} examples  seq_len {max_len}  cap {args.max_len}")

    model = SimpleAttentionNetwork(config)
    qat_mode = "none" if args.qat_bits is None else str(args.qat_bits).lower()
    qat_bits = None
    qat_bits_map = None
    parsed_bits_map = None
    if qat_mode == "auto":
        qat_bits_map = getattr(config, "weight_bits", "") or None
        if qat_bits_map:
            parsed_bits_map = parse_bits_map(qat_bits_map)
        else:
            qat_bits = 4
    elif qat_mode in ("2", "4"):
        qat_bits = int(qat_mode)
    elif qat_mode != "none":
        raise ValueError("qat_bits must be auto, none, 2, or 4")
    qat_enabled = qat_bits is not None or qat_bits_map is not None
    if qat_enabled:
        configure_deploy(act_bits=getattr(config, "act_bits", 8),
                         kv_bits=getattr(config, "kv_bits", 8))
        scheme = f"mixed[{qat_bits_map}]" if qat_bits_map else f"W{qat_bits}"
        emit(f"  {'numerics':<9} CQ {scheme} STE + A8 (matches export)")
    else:
        emit(f"  {'numerics':<9} full precision")

    paths = lora_target_paths(params)
    scale = args.lora_alpha / args.lora_rank
    seed = int(args.seed)
    rng = _training_rng(seed)
    lora = init_lora(params, paths, args.lora_rank, jax.random.PRNGKey(seed))
    emit(f"  {'lora':<9} rank {args.lora_rank}  alpha {args.lora_alpha:g}  "
         f"{len(paths)} weight groups")
    if n_val:
        emit(f"  {'holdout':<9} {n_val} examples for validation (by target)")

    batch, count = args.batch_size, len(seqs)
    steps_per_epoch = -(-count // batch)
    total_steps = args.epochs * steps_per_epoch
    warmup = min(max(1, total_steps // 20), total_steps - 1)
    schedule = optax.warmup_cosine_decay_schedule(
        init_value=0.0, peak_value=args.lr, warmup_steps=warmup, decay_steps=total_steps)
    optimizer = optax.chain(optax.clip_by_global_norm(1.0), optax.adamw(schedule))
    opt_state = optimizer.init(lora)
    emit(f"  {'schedule':<9} {total_steps} steps  warmup {warmup}  cosine decay  clip 1.0  "
         "(compiling...)")

    def loss_fn(lora, ids, mask):
        merged = merge_lora(params, lora, scale)
        if qat_bits_map is not None:
            bits_map, default_bits = parsed_bits_map
            merged = cq_ste_mixed_params(merged, bits_map, default_bits)
        elif qat_bits is not None:
            merged = cq_ste_params(merged, qat_bits)
        logits = model.apply({"params": merged}, ids, quant=qat_enabled)
        logits, targets, mask = logits[:, :-1], ids[:, 1:], mask[:, 1:]
        ce = optax.softmax_cross_entropy_with_integer_labels(logits, targets)
        return (ce * mask).sum() / jnp.maximum(mask.sum(), 1.0)

    @jax.jit
    def train_step(lora, opt_state, ids, mask):
        loss, grads = jax.value_and_grad(loss_fn)(lora, ids, mask)
        updates, opt_state = optimizer.update(grads, opt_state, lora)
        return optax.apply_updates(lora, updates), opt_state, loss

    eval_step = jax.jit(loss_fn)

    def save(path: Path) -> None:
        save_adapter(Path(path), lora, scale, base_path, args.lora_rank, qat_bits,
                     qat_bits_map, seed)

    every = max(1, total_steps // 50)
    step_i = 0
    records: list[dict] = []
    started = time.time()
    for epoch in range(args.epochs):
        order = rng.permutation(count)
        last = 0.0
        for start in range(0, count, batch):
            idx = order[start:start + batch]
            lora, opt_state, loss = train_step(lora, opt_state, jnp.asarray(seqs[idx]),
                                               jnp.asarray(masks[idx]))
            last = float(loss)
            step_i += 1
            if step_i % every == 0:
                emit(f"  {'step':<9} {step_i}/{total_steps}  loss {last:.4f}")
        val = None
        if n_val > 0:
            val = float(np.mean([
                float(eval_step(lora, jnp.asarray(val_seqs[i:i + batch]),
                                jnp.asarray(val_masks[i:i + batch])))
                for i in range(0, n_val, batch)]))
        record = {"epoch": epoch + 1, "loss": last, "val_loss": val,
                  "elapsed_s": round(time.time() - started, 1)}
        if on_epoch:
            on_epoch(epoch + 1, record, save)
        records.append(record)
        tail = f"  val {val:.4f}" if val is not None else ""
        emit(f"  {'epoch':<9} {epoch + 1}/{args.epochs}  loss {last:.4f}{tail}")

    if getattr(args, "out", None):
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        save(Path(args.out))
        print(f"  {'adapter':<9} {args.out}")
    return {
        "examples": count + n_val,
        "fit_examples": count,
        "val_examples": n_val,
        "seq_len": max_len,
        "total_steps": total_steps,
        "warmup_steps": warmup,
        "lora_groups": len(paths),
        "qat": (f"mixed[{qat_bits_map}]" if qat_bits_map
                else (f"W{qat_bits}" if qat_bits else "none")),
        "epochs": records,
        "seconds": round(time.time() - started, 1),
    }
