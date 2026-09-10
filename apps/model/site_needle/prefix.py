"""Training forward that shares the catalogue prefix the way the engine does.

Every row in the corpus opens with the same system turn and tool catalogue
(about 380 tokens); only the question and the answer differ (about 15 and
40 tokens). Needle's ``finetune_local`` re-encodes the prefix for every row,
so a batch of eight is eight copies of the same 380 tokens padded to 512.

The native engine does not work that way. ``needle_init`` encodes the prefix
once into the KV cache and ``needle_complete`` appends the turn, so the
prefix's keys and values are computed once and then read. This module
trains under the same arrangement: the prefix cache is built once (from the
weights named by ``prefix_regime``), broadcast across the batch, and only the
turn and target tokens go through the model on every step.

Two regimes are offered. ``"tuned"`` computes the prefix cache from the
weights being trained, which is what Needle's own loop assumes and what the
engine's first-token logits show it does with tuned weights loaded.
``"base"`` computes it from the untouched base weights; it exists as an
experiment knob from the investigation in ``README.md`` ("Results so far"),
where a base-weight prefix happened to reproduce the engine's decisions on
refusal rows without reproducing its logits.

The forward is Needle's cached decoder (``needle.model.decode``) with two
changes: the attention products are plain batched matmuls, because the
einsum form does not compile for the backward pass on Metal, and the
activation and KV-cache fake-quantisation of the training forward
(``needle.model.architecture``) is put back, so the numerics are the ones
``needle finetune`` trains under. Everything else — layers, mHC, engram,
Hadamard MLP, RoPE — is imported from Needle.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class Encoded:
    """Rows that share one prefix, encoded for the shared-prefix forward."""

    prefix: np.ndarray  # (P,) the ids every row shares, BOS first; or (N, P) per row
    tokens: np.ndarray  # (N, S) turn + target ids, right-padded
    mask: np.ndarray  # (N, S) 1.0 where the token is a supervised target
    valid: np.ndarray  # (N, S) True where tokens[i, j] is a real token
    rows: np.ndarray | None = None  # (N,) indices into the rows that were encoded
    prefix_valid: np.ndarray | None = None  # (N, P) when prefixes are per row, left-padded

    @property
    def shared(self) -> bool:
        return self.prefix.ndim == 1

    @property
    def prefix_len(self) -> int:
        return int(self.prefix.shape[-1])

    @property
    def seq_len(self) -> int:
        return int(self.tokens.shape[1])


def split_prompt(example: dict) -> tuple[str, str, str]:
    """Return ``(prefix, turn, target)`` text; ``prefix + turn`` is the prompt.

    The turn starts at the newline before the query, which is where the
    engine's ``needle_complete`` starts too (its turn ids begin with ``\\n``)."""
    from needle.model.finetune import TOOLS_END, render_example

    prompt, target = render_example(example)
    cut = prompt.rindex(TOOLS_END) + len(TOOLS_END)
    return prompt[:cut], prompt[cut:], target


def encode_rows(rows: list[dict], tokenizer, max_len: int | None = None,
                prefix: np.ndarray | None = None) -> Encoded:
    """Encode rows that share one prefix. The prompt is tokenised whole (the
    engine's split tokenisation gives identical ids, checked in the tests)
    and cut at the prefix length. ``prefix`` pins the expected prefix ids so a
    dev split is encoded against the fit split's prefix."""
    from needle.model.tokenizer import BOS_ID, EOS_ID, PAD_ID

    turns, masks = [], []
    shared = None if prefix is None else [int(t) for t in prefix]
    for row in rows:
        prefix_text, turn_text, target_text = split_prompt(row)
        prompt_ids = [BOS_ID] + tokenizer.encode(prefix_text + turn_text)
        n = 1 + len(tokenizer.encode(prefix_text))
        this_prefix, turn_ids = prompt_ids[:n], prompt_ids[n:]
        if shared is None:
            shared = this_prefix
        elif this_prefix != shared:
            raise ValueError(
                f"row {row.get('id', '?')!r} does not share the corpus prefix "
                f"({len(this_prefix)} vs {len(shared)} tokens); the shared-prefix "
                "forward needs one system turn and one tool catalogue")
        target_ids = tokenizer.encode(target_text) + [EOS_ID]
        turns.append(turn_ids + target_ids)
        masks.append([0.0] * len(turn_ids) + [1.0] * len(target_ids))
    longest = max(len(t) for t in turns)
    seq_len = longest if max_len is None else min(longest, max_len)
    n = len(turns)
    tokens = np.full((n, seq_len), PAD_ID, np.int32)
    mask = np.zeros((n, seq_len), np.float32)
    valid = np.zeros((n, seq_len), bool)
    for i, (t, m) in enumerate(zip(turns, masks, strict=True)):
        t, m = t[:seq_len], m[:seq_len]
        tokens[i, :len(t)] = t
        mask[i, :len(m)] = m
        valid[i, :len(t)] = True
    return Encoded(np.asarray(shared, np.int32), tokens, mask, valid)


def encode_groups(rows: list[dict], tokenizer, max_len: int | None = None,
                  merge_rest: bool = True) -> list[Encoded]:
    """Encode a corpus whose rows carry more than one prefix (the extraction
    rows each declare a single record schema as their tools). The largest
    prefix gets a shared group; with ``merge_rest`` every other row lands in
    one group whose prefixes are per row, left-padded to the longest and
    masked, so a corpus compiles two shapes rather than one per schema.
    Left padding keeps every relative position, which is all RoPE and the
    engram n-grams read. ``rows`` on each group indexes back into the input."""
    from needle.model.tokenizer import BOS_ID, PAD_ID

    by_prefix: dict[tuple[int, ...], list[int]] = {}
    for i, row in enumerate(rows):
        prefix_text, _, _ = split_prompt(row)
        key = tuple([BOS_ID] + tokenizer.encode(prefix_text))
        by_prefix.setdefault(key, []).append(i)
    groups = []
    for key, idx in sorted(by_prefix.items(), key=lambda kv: -len(kv[1])):
        enc = encode_rows([rows[i] for i in idx], tokenizer, max_len=max_len,
                          prefix=np.asarray(key, np.int32))
        enc.rows = np.asarray(idx, np.int64)
        groups.append(enc)
    if not merge_rest or len(groups) <= 2:
        return groups
    rest = groups[1:]
    p = max(g.prefix_len for g in rest)
    s = max(g.seq_len for g in rest)
    n = sum(len(g.rows) for g in rest)
    prefixes = np.full((n, p), PAD_ID, np.int32)
    prefix_valid = np.zeros((n, p), bool)
    tokens = np.full((n, s), PAD_ID, np.int32)
    mask = np.zeros((n, s), np.float32)
    valid = np.zeros((n, s), bool)
    index = np.zeros(n, np.int64)
    at = 0
    for g in rest:
        k, m = len(g.rows), g.prefix_len
        prefixes[at:at + k, p - m:] = g.prefix[None]
        prefix_valid[at:at + k, p - m:] = True
        tokens[at:at + k, :g.seq_len] = g.tokens
        mask[at:at + k, :g.seq_len] = g.mask
        valid[at:at + k, :g.seq_len] = g.valid
        index[at:at + k] = g.rows
        at += k
    return [groups[0], Encoded(prefixes, tokens, mask, valid, index, prefix_valid)]


def fit_seq_len(encoded: Encoded, bucket: int = 32) -> int:
    """Round the longest turn+target up to a bucket so recompiles are rare."""
    return -(-encoded.seq_len // bucket) * bucket


def pad_to(encoded: Encoded, seq_len: int) -> Encoded:
    from needle.model.tokenizer import PAD_ID

    n, s = encoded.tokens.shape
    if s >= seq_len:
        return encoded
    tokens = np.full((n, seq_len), PAD_ID, np.int32)
    tokens[:, :s] = encoded.tokens
    mask = np.zeros((n, seq_len), np.float32)
    mask[:, :s] = encoded.mask
    valid = np.zeros((n, seq_len), bool)
    valid[:, :s] = encoded.valid
    return Encoded(encoded.prefix, tokens, mask, valid, encoded.rows, encoded.prefix_valid)


def _attn(x, lp, k_cache_l, v_cache_l, pos, cos_s, sin_s, cfg, key_valid, quant):
    """``decode._attn_cached`` with matmul attention and fake-quant hooks."""
    import math

    import jax
    import jax.numpy as jnp
    from needle.model.architecture import apply_rope
    from needle.model.decode import _zcrms
    from needle.model.quantize import fake_quant_act, maybe_quant_kv

    B, S, _ = x.shape
    H, KV = cfg.num_heads, cfg.num_kv_heads
    hd = cfg.attn_dim // H
    if quant:
        x = fake_quant_act(x)
    q = (x @ lp["q"]).reshape(B, S, H, hd).transpose(0, 2, 1, 3)
    k = (x @ lp["k"]).reshape(B, S, KV, hd).transpose(0, 2, 1, 3)
    v = (x @ lp["v"]).reshape(B, S, KV, hd).transpose(0, 2, 1, 3)
    q = _zcrms(q, lp["qn"])
    k = _zcrms(k, lp["kn"])
    q = apply_rope(q, cos_s, sin_s)
    k = apply_rope(k, cos_s, sin_s)
    if quant:
        k = maybe_quant_kv(k, True)
        v = maybe_quant_kv(v, True)
    k_cache_l = jax.lax.dynamic_update_slice(k_cache_l, k, (0, 0, pos, 0))
    v_cache_l = jax.lax.dynamic_update_slice(v_cache_l, v, (0, 0, pos, 0))
    max_len = k_cache_l.shape[2]

    reps = H // KV
    qg = q.reshape(B * KV, reps * S, hd)
    kg = k_cache_l.reshape(B * KV, max_len, hd)
    vg = v_cache_l.reshape(B * KV, max_len, hd)
    aw = jnp.matmul(qg, kg.transpose(0, 2, 1)) / math.sqrt(hd)
    aw = aw.reshape(B, KV, reps, S, max_len)
    qpos = pos + jnp.arange(S)
    kpos = jnp.arange(max_len)
    causal = (kpos[None, :] <= qpos[:, None])[None]
    mask = (causal & key_valid[:, None, :])[:, None, None, :, :]
    aw = jnp.where(mask, aw, jnp.finfo(aw.dtype).min)
    aw = jax.nn.softmax(aw, axis=-1)
    out = jnp.matmul(aw.reshape(B * KV, reps * S, max_len), vg)
    out = out.reshape(B, KV, reps, S, hd).reshape(B, H, S, hd)
    out = out.transpose(0, 2, 1, 3).reshape(B, S, cfg.attn_dim)
    out = out * jax.nn.sigmoid(x @ lp["attn_gate_proj"])
    if quant:
        out = fake_quant_act(out)
    return out @ lp["o"], k_cache_l, v_cache_l


def _block(x, lp, k_cache_l, v_cache_l, pos, cos_s, sin_s, cfg, key_valid, quant):
    import jax
    from needle.model.decode import _hadamard, _zcrms

    skip = x
    h = _zcrms(x, lp["pre"])
    attn, k_cache_l, v_cache_l = _attn(h, lp, k_cache_l, v_cache_l, pos, cos_s, sin_s,
                                       cfg, key_valid, quant)
    attn = _zcrms(attn, lp["post"])
    x = skip + jax.nn.sigmoid(lp["attn_gate"]) * attn
    skip = x
    h = _zcrms(x, lp["pre_hada"])
    return skip + _hadamard(h, lp["hd1"], lp["hd2"], lp["hd3"], cfg.d_model), k_cache_l, v_cache_l


def _engram_kv(params, cfg, hist, hist_valid, pos, S, quant):
    """``decode._engram_kv`` with the fake-quant of ``architecture.Engram``."""
    import jax
    import jax.numpy as jnp
    from needle.model.architecture import ENGRAM_CONV_TAPS, _shift_right, engram_indices
    from needle.model.decode import _engram_window
    from needle.model.quantize import fake_quant_act

    W = _engram_window(cfg)
    B = hist.shape[0]
    padded = jnp.pad(hist, ((0, 0), (W, 0)))
    win = jax.lax.dynamic_slice(padded, (0, pos), (B, W + S))
    pv = jnp.pad(hist_valid, ((0, 0), (W, 0)))
    win_valid = jax.lax.dynamic_slice(pv, (0, pos), (B, W + S)).astype(jnp.float32)
    orders, heads = cfg.engram_orders, cfg.engram_heads
    idx = engram_indices(win, orders, heads, cfg.engram_slots)
    ngram_ok = jnp.stack([_shift_right(win_valid, o - 1) for o in orders for _ in range(heads)],
                         axis=-1)
    tap_ok = jnp.stack([_shift_right(win_valid, j * max(orders)) for j in range(ENGRAM_CONV_TAPS)])
    ks, vs = [], []
    for site in range(len(cfg.engram_layers)):
        ep = params[f"engrams_{site}"]
        tables = ep["embedding"]
        fetched = tables[jnp.arange(tables.shape[0]), idx] * ngram_ok[..., None]
        e = fetched.reshape(B, W + S, -1)
        if quant:
            e = fake_quant_act(e)
        k = e @ ep["key_proj"]["kernel"]
        v = e @ ep["value_proj"]["kernel"]
        taps = ep["taps"]
        v = sum(taps[j] * _shift_right(v, j * max(orders)) * tap_ok[j][..., None]
                for j in range(ENGRAM_CONV_TAPS))
        ks.append(k[:, W:])
        vs.append(v[:, W:])
    return jnp.stack(ks), jnp.stack(vs)


def forward(params, cfg, tokens, k_cache, v_cache, pos, cos, sin, key_valid, hist, quant):
    """``decode._forward_cached`` on the blocks above. ``hist`` (B, max_len)
    carries the ids the engram n-grams read; ``key_valid`` (B, max_len) marks
    the cache positions a query may attend to and the engram may read."""
    import math

    import jax
    import jax.numpy as jnp
    from needle.model.architecture import _rms_unit, _sinkhorn
    from needle.model.decode import _layer, _mhc, _zcrms
    from needle.model.quantize import fake_quant_act

    emb = params["embedding"]["embedding"].astype(jnp.float32)
    x = emb[tokens] * math.sqrt(cfg.d_model)
    B, S = tokens.shape
    cos_s = jax.lax.dynamic_slice_in_dim(cos, pos, S, axis=0)
    sin_s = jax.lax.dynamic_slice_in_dim(sin, pos, S, axis=0)
    ekv = None
    if cfg.engram_layers:
        ekv = _engram_kv(params, cfg, hist, key_valid, pos, S, quant)
    n, C = cfg.mhc_lanes, cfg.d_model
    hc = _mhc(params, cfg)
    x = jnp.broadcast_to(x[:, :, None, :], (B, S, n, C))
    new_k, new_v = [], []
    for i in range(cfg.num_layers):
        nx = _rms_unit(x.reshape(B, S, n * C))
        hpre = jax.nn.sigmoid(hc["a_pre"][i] * (nx @ hc["phi_pre"][i])
                              + hc["b_pre"][i] + hc["pre_off"][i])
        u = jnp.einsum("btn,btnc->btc", hpre, x)
        bx = u
        if ekv is not None and i in cfg.engram_layers:
            site = cfg.engram_layers.index(i)
            ek, ev = ekv
            alpha = jax.nn.sigmoid(
                jnp.einsum("btd,btd->bt", _rms_unit(u), _rms_unit(ek[site])) / math.sqrt(C))
            bx = u + alpha[..., None] * ev[site]
        y, k_cache_i, v_cache_i = _block(bx, _layer(params, i), k_cache[i], v_cache[i], pos,
                                         cos_s, sin_s, cfg, key_valid, quant)
        y = y - u
        hpost = 2 * jax.nn.sigmoid(hc["a_post"][i] * (nx @ hc["phi_post"][i])
                                   + hc["b_post"][i] + hc["post_off"][i])
        res = nx @ hc["phi_res"][i]
        hres = _sinkhorn(hc["a_res"][i] * res.reshape(B, S, n, n) + hc["b_res"][i])
        x = jnp.einsum("btij,btjc->btic", hres, x) + hpost[..., None] * y[:, :, None, :]
        new_k.append(k_cache_i)
        new_v.append(v_cache_i)
    x = jnp.mean(x, axis=2)
    x = _zcrms(x, params["stack"]["final_norm"]["scale"])
    if quant:
        x = fake_quant_act(x)
    return x @ emb.T, jnp.stack(new_k), jnp.stack(new_v)


class SharedPrefixModel:
    """The cached forward with a fixed prefix; ``config`` is Needle's.

    ``max_len`` is the cache length: prefix plus the longest turn+target.
    ``quant`` applies the activation and KV fake-quantisation of Needle's
    training forward (the weights are fake-quantised by the caller)."""

    def __init__(self, config, prefix_len: int, seq_len: int, quant: bool = True):
        from needle.model.architecture import precompute_rope_freqs
        from needle.model.decode import decode_cfg

        self.config = config
        self.prefix_len = int(prefix_len)
        self.seq_len = int(seq_len)
        self.max_len = self.prefix_len + self.seq_len
        self.quant = bool(quant)
        head_dim = (getattr(config, "attn_dim", 0) or config.d_model) // config.num_heads
        self.cos, self.sin = precompute_rope_freqs(head_dim, self.max_len, config.rope_theta)
        self.cfg = decode_cfg(config, kv_window=0)

    def prefix_cache(self, params, prefix_ids, prefix_valid=None):
        """Keys and values for the prefix under ``params``: ``(k, v)`` with
        shape ``(layers, B, kv_heads, max_len, head_dim)``, where B is 1 for
        a shared prefix (``prefix_ids`` of shape (P,)) and the batch size for
        per-row prefixes ((B, P), left-padded, with ``prefix_valid`` marking
        the real tokens). Differentiable, so under the ``tuned`` regime it
        can sit inside the loss."""
        import jax.numpy as jnp
        from needle.model.decode import init_kv_cache

        ids = jnp.asarray(prefix_ids, jnp.int32)
        if ids.ndim == 1:
            ids = ids[None]
        b = ids.shape[0]
        ok = (jnp.ones((b, self.prefix_len), bool) if prefix_valid is None
              else jnp.asarray(prefix_valid, bool))
        kc, vc = init_kv_cache(self.config, b, self.max_len)
        hist = jnp.zeros((b, self.max_len), jnp.int32).at[:, :self.prefix_len].set(ids)
        valid = jnp.zeros((b, self.max_len), bool).at[:, :self.prefix_len].set(ok)
        _, kc, vc = forward(params, self.cfg, ids, kc, vc, jnp.asarray(0, jnp.int32),
                            self.cos, self.sin, valid, hist, self.quant)
        return kc, vc

    def logits(self, params, cache, prefix_ids, tokens, valid, prefix_valid=None):
        """Logits for ``tokens`` (B, S) after the cached prefix.

        ``valid`` (B, S) marks real tokens; padding is masked out of the keys
        so a short row is not attending to its own padding. A shared cache
        (batch 1) is broadcast over the rows."""
        import jax.numpy as jnp

        kc, vc = cache
        b, s = tokens.shape
        if kc.shape[1] == 1:
            kc = jnp.broadcast_to(kc, (kc.shape[0], b) + kc.shape[2:])
            vc = jnp.broadcast_to(vc, (vc.shape[0], b) + vc.shape[2:])
        prefix = jnp.asarray(prefix_ids, jnp.int32)
        if prefix.ndim == 1:
            prefix = jnp.broadcast_to(prefix[None], (b, self.prefix_len))
        ok = (jnp.ones((b, self.prefix_len), bool) if prefix_valid is None
              else jnp.asarray(prefix_valid, bool))
        hist = jnp.concatenate([prefix, tokens], axis=1)
        key_valid = jnp.concatenate([ok, valid], axis=1)
        pad = self.max_len - hist.shape[1]
        if pad:
            hist = jnp.pad(hist, ((0, 0), (0, pad)))
            key_valid = jnp.pad(key_valid, ((0, 0), (0, pad)))
        logits, _, _ = forward(params, self.cfg, tokens, kc, vc,
                               jnp.asarray(self.prefix_len, jnp.int32),
                               self.cos, self.sin, key_valid, hist, self.quant)
        return logits
