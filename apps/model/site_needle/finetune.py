"""The LoRA loop, on Needle's own building blocks.

Needle's ``finetune_local`` is one function: load, encode, split, train,
save once at the end. This is the same loop — the same checkpoint loader,
template, LoRA targets, QAT numerics, schedule, optimiser and loss — opened
up in the places a run on a laptop budget needs:

- the validation rows are chosen by the caller (``fit_path`` and
  ``dev_path``), so they can be held out by *target* rather than at random
  and paraphrases of one target do not sit on both sides;
- an ``on_epoch`` hook sees the adapter after every epoch and can save it,
  so one run yields one candidate per epoch instead of one at the end;
- the catalogue prefix every row shares is encoded once and cached, the way
  the engine caches it, so a step processes the question and the answer
  rather than 512 tokens per row (``site_needle.prefix``);
- refusal rows can be weighted in the loss (``refusal_weight``).

Everything else is imported from ``needle.model``; the version range in
``pyproject.toml`` is what keeps that honest.
"""

from __future__ import annotations

import json
import pickle
import time
from pathlib import Path

import numpy as np

from .prefix import Encoded, SharedPrefixModel, encode_groups, fit_seq_len, pad_to


def save_adapter(path: Path, lora, scale: float, base: str, rank: int, qat_bits,
                 qat_bits_map, seed: int, extra: dict | None = None) -> None:
    """Needle's adapter pickle, byte-for-byte the shape ``build_main`` reads,
    plus whatever ``extra`` records about how it was trained."""
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
    payload.update(extra or {})
    with open(path, "wb") as handle:
        pickle.dump(payload, handle)


def _read_rows(path: str | None) -> list[dict]:
    if not path:
        return []
    rows = []
    with open(path) as handle:
        for line in handle:
            line = line.strip()
            if line:
                row = json.loads(line)
                if "query" in row:
                    rows.append(row)
    return rows


def _row_weights(rows: list[dict], refusal_weight: float) -> np.ndarray:
    return np.asarray([refusal_weight if not row.get("answers") else 1.0 for row in rows],
                      np.float32)


REFUSAL_TARGETS = ("phrase", "span")


def shape_refusals(rows: list[dict], target: str) -> list[dict]:
    """``phrase`` keeps the corpus reasoning ("general knowledge; no site
    tool answers it"). ``span`` rewrites every refusal's reasoning into the
    shape the tool-call rows use — ``'<query>' -> no tool`` — so the first
    token after ``<think>`` no longer decides between refusing and calling;
    the decision moves to after the quoted span, where the tool rows make
    theirs. Extraction refusals (a passage with nothing to extract) keep
    their reasoning. The calls are untouched, so grading is unaffected."""
    if target not in REFUSAL_TARGETS:
        raise ValueError(f"refusal_target must be one of {REFUSAL_TARGETS}")
    if target == "phrase":
        return rows
    out = []
    for row in rows:
        if not row.get("answers") and row.get("kind") != "extraction":
            row = {**row, "reasoning": f"'{row['query']}' -> no tool"}
        out.append(row)
    return out


def finetune(args, progress=None, on_epoch=None) -> dict:
    """``args`` carries: checkpoint, fit_path, dev_path (or None), epochs,
    batch_size, lr, lora_rank, lora_alpha, max_len, seed, qat_bits, out, and
    optionally prefix_regime ("tuned" or "base"), prefix_grad (False: the
    tuned prefix cache is recomputed every step but not trained through,
    which is what the Metal backend can compile), refusal_weight (1.0) and
    refusal_target ("phrase" or "span", see ``shape_refusals``).

    ``progress(line)`` receives the same lines ``needle finetune`` prints.
    ``on_epoch(epoch, record, save)`` runs after each epoch's validation
    pass with ``record = {epoch, loss, val_loss}`` and ``save(path)`` that
    writes the adapter as it stands; whatever it adds to ``record`` is kept.
    Returns the run's shape and the epoch records."""
    import jax
    import jax.numpy as jnp
    import optax
    from needle.model.finetune import (
        _training_rng,
        init_lora,
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

    prefix_regime = str(getattr(args, "prefix_regime", "tuned") or "tuned")
    if prefix_regime not in ("tuned", "base"):
        raise ValueError("prefix_regime must be 'tuned' or 'base'")
    refusal_weight = float(getattr(args, "refusal_weight", 1.0) or 1.0)
    refusal_target = str(getattr(args, "refusal_target", "phrase") or "phrase")
    prefix_grad = bool(getattr(args, "prefix_grad", False))

    base_path = str(args.checkpoint)
    params, config = load_checkpoint(base_path)
    config.dtype = "float32"
    params = jax.tree.map(lambda a: np.asarray(a).astype(np.float32), params)
    backend = jax.default_backend().lower()
    params = jax.device_put(params)
    emit(f"  {'backend':<9} {backend}  float32")

    tokenizer = get_tokenizer(config.vocab_size)
    fit_rows = shape_refusals(_read_rows(str(args.fit_path)), refusal_target)
    if not fit_rows:
        raise SystemExit(f"no usable examples in {args.fit_path}")
    dev_rows = shape_refusals(_read_rows(args.dev_path), refusal_target)
    # One group per distinct prefix (the catalogue, plus one per extraction
    # schema); each group has its own cache and its own compiled step.
    fit_groups = [pad_to(g, min(fit_seq_len(g), args.max_len))
                  for g in encode_groups(fit_rows, tokenizer, max_len=args.max_len)]
    dev_groups = [pad_to(g, min(fit_seq_len(g), args.max_len))
                  for g in encode_groups(dev_rows, tokenizer, max_len=args.max_len)]
    n_val = len(dev_rows)
    fit_weights = _row_weights(fit_rows, refusal_weight)
    main = fit_groups[0]
    emit(f"  {'data':<9} {len(fit_rows) + n_val} examples  prefix {main.prefix_len} tokens (cached)"
         f"  turn+target {main.seq_len}  cap {args.max_len}"
         + (f"  +{len(fit_groups) - 1} extraction prefix(es)" if len(fit_groups) > 1 else ""))

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

    def quantised(tree):
        if qat_bits_map is not None:
            bits_map, default_bits = parsed_bits_map
            return cq_ste_mixed_params(tree, bits_map, default_bits)
        if qat_bits is not None:
            return cq_ste_params(tree, qat_bits)
        return tree

    paths = lora_target_paths(params)
    scale = args.lora_alpha / args.lora_rank
    seed = int(args.seed)
    rng = _training_rng(seed)
    lora = init_lora(params, paths, args.lora_rank, jax.random.PRNGKey(seed))
    emit(f"  {'lora':<9} rank {args.lora_rank}  alpha {args.lora_alpha:g}  "
         f"{len(paths)} weight groups")
    if prefix_regime == "base":
        emit(f"  {'prefix':<9} cached from the base weights (engine regime)")
    elif prefix_grad:
        emit(f"  {'prefix':<9} from the tuned weights, recomputed each step, trained through")
    else:
        emit(f"  {'prefix':<9} from the tuned weights, recomputed each step, not trained through")
    if n_val:
        emit(f"  {'holdout':<9} {n_val} examples for validation (by target)")
    if refusal_weight != 1.0:
        emit(f"  {'weights':<9} refusal rows x{refusal_weight:g} in the loss")
    if refusal_target != "phrase":
        emit(f"  {'refusals':<9} reasoning reshaped as '<query>' -> no tool")

    batch, count = args.batch_size, len(fit_rows)
    steps_per_epoch = sum(-(-len(g.rows) // batch) for g in fit_groups)
    total_steps = args.epochs * steps_per_epoch
    warmup = min(max(1, total_steps // 20), total_steps - 1)
    schedule = optax.warmup_cosine_decay_schedule(
        init_value=0.0, peak_value=args.lr, warmup_steps=warmup, decay_steps=total_steps)
    optimizer = optax.chain(optax.clip_by_global_norm(1.0), optax.adamw(schedule))
    opt_state = optimizer.init(lora)
    emit(f"  {'schedule':<9} {total_steps} steps  warmup {warmup}  cosine decay  clip 1.0  "
         "(compiling...)")

    class _Group:
        """A prefix group's model, cache and compiled steps."""

        def __init__(self, enc: Encoded):
            self.enc = enc
            self.model = SharedPrefixModel(config, enc.prefix_len, enc.seq_len, quant=qat_enabled)
            self.prefix_ids = jnp.asarray(enc.prefix)
            self.base_cache = None
            if prefix_regime == "base":
                self.base_cache = jax.jit(
                    lambda p: self.model.prefix_cache(p, self.prefix_ids))(quantised(params))
            self.train_step = jax.jit(self._train_step)
            self.eval_step = jax.jit(self._loss)

        def _loss(self, lora, tokens, mask, valid, weights):
            merged = quantised(merge_lora(params, lora, scale))
            if self.base_cache is not None:
                cache = self.base_cache
            else:
                cache = self.model.prefix_cache(merged, self.prefix_ids)
                if not prefix_grad:
                    cache = jax.lax.stop_gradient(cache)
            logits = self.model.logits(merged, cache, self.prefix_ids, tokens, valid)
            logits, targets = logits[:, :-1], tokens[:, 1:]
            mask = mask[:, 1:] * weights[:, None]
            ce = optax.softmax_cross_entropy_with_integer_labels(logits, targets)
            return (ce * mask).sum() / jnp.maximum(mask.sum(), 1.0)

        def _train_step(self, lora, opt_state, tokens, mask, valid, weights):
            loss, grads = jax.value_and_grad(self._loss)(lora, tokens, mask, valid, weights)
            updates, opt_state = optimizer.update(grads, opt_state, lora)
            return optax.apply_updates(lora, updates), opt_state, loss

        def batch(self, idx, weights=None):
            """``idx`` indexes this group's rows; the batch is padded to the
            batch size by repeating rows, with their loss masked out."""
            enc = self.enc
            full = np.zeros(batch, np.int64)
            full[:len(idx)] = idx
            keep = (np.arange(batch) < len(idx)).astype(np.float32)
            w = np.ones(batch, np.float32) if weights is None else weights[enc.rows[full]]
            return (jnp.asarray(enc.tokens[full]), jnp.asarray(enc.mask[full] * keep[:, None]),
                    jnp.asarray(enc.valid[full]), jnp.asarray(w))

    groups = [_Group(g) for g in fit_groups]
    val_groups = [_Group(g) for g in dev_groups]

    trained_with = {"prefix_regime": prefix_regime, "prefix_grad": prefix_grad,
                    "refusal_weight": refusal_weight, "refusal_target": refusal_target,
                    "prefix_len": main.prefix_len, "seq_len": main.seq_len,
                    "prefixes": len(fit_groups)}

    def save(path: Path) -> None:
        save_adapter(Path(path), lora, scale, base_path, args.lora_rank, qat_bits,
                     qat_bits_map, seed, extra={"site_needle": trained_with})

    every = max(1, total_steps // 50)
    step_i = 0
    records: list[dict] = []
    started = time.time()
    for epoch in range(args.epochs):
        batches = []
        for group in groups:
            order = rng.permutation(len(group.enc.rows))
            batches += [(group, order[i:i + batch]) for i in range(0, len(order), batch)]
        rng.shuffle(batches)
        last = 0.0
        for group, idx in batches:
            lora, opt_state, loss = group.train_step(
                lora, opt_state, *group.batch(idx, fit_weights))
            last = float(loss)
            step_i += 1
            if step_i % every == 0:
                emit(f"  {'step':<9} {step_i}/{total_steps}  loss {last:.4f}")
        val = None
        if val_groups:
            losses, sizes = [], []
            for group in val_groups:
                n = len(group.enc.rows)
                for i in range(0, n, batch):
                    idx = np.arange(i, min(i + batch, n))
                    losses.append(float(group.eval_step(lora, *group.batch(idx))))
                    sizes.append(len(idx))
            val = float(np.average(losses, weights=sizes))
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
        "prefix_len": main.prefix_len,
        "seq_len": main.seq_len,
        "prefixes": len(fit_groups),
        "prefix_regime": prefix_regime,
        "prefix_grad": prefix_grad,
        "refusal_weight": refusal_weight,
        "refusal_target": refusal_target,
        "total_steps": total_steps,
        "warmup_steps": warmup,
        "lora_groups": len(paths),
        "qat": (f"mixed[{qat_bits_map}]" if qat_bits_map
                else (f"W{qat_bits}" if qat_bits else "none")),
        "epochs": records,
        "seconds": round(time.time() - started, 1),
    }
