"""Engine vs JAX greedy decode for the published adapter, on its own training rows.

The reproduction behind the refusal finding in README.md ("Results so far"):
identical tokens and weights, matching first-token logits, diverging decode.
Pulls everything it needs from the Hub.

    cd apps/model && JAX_PLATFORMS=cpu uv run --no-sync python scripts/engine_vs_jax.py
"""
import json
import pickle

import jax
import jax.numpy as jnp
import needle
import numpy as np
from huggingface_hub import hf_hub_download
from needle.model.architecture import SimpleAttentionNetwork
from needle.model.finetune import merge_lora, render_example
from needle.model.quantize import configure_deploy, cq_ste_mixed_params, parse_bits_map
from needle.model.run import load_checkpoint
from needle.model.tokenizer import BOS_ID, EOS_ID, IM_END, get_tokenizer

REPO, REV = "alexnodeland/site-needle", "main"
cact = hf_hub_download(REPO, "site-needle.cact", revision=REV)
adapter = pickle.load(open(hf_hub_download(REPO, "adapter.pkl", revision=REV), "rb"))
tools = json.load(open(hf_hub_download(REPO, "tools.json", revision=REV)))
system = open(hf_hub_download(REPO, "system.txt", revision=REV)).read().strip()
ckpt = hf_hub_download("Cactus-Compute/needle2", "checkpoints/needle2.pkl")

params, config = load_checkpoint(ckpt)            # float16 params, as `needle build` merges them
lora = {tuple(k.split("/")): {"A": jnp.asarray(v["A"]), "B": jnp.asarray(v["B"])}
        for k, v in adapter["lora"].items()}
merged = merge_lora(params, lora, adapter["scale"])
bits_map, default = parse_bits_map(adapter["qat_bits_map"])
configure_deploy(act_bits=config.act_bits, kv_bits=config.kv_bits)
config.dtype = "float32"
merged32 = jax.tree.map(lambda a: jnp.asarray(np.asarray(a, np.float32)), merged)
q = cq_ste_mixed_params(merged32, bits_map, default)
model, tok = SimpleAttentionNetwork(config), get_tokenizer(config.vocab_size)
im_end = tok.encode(IM_END)

@jax.jit
def logits_at(ids):  # fixed length so the loop compiles once
    return model.apply({"params": q}, ids[None], quant=True)[0]

def jax_greedy(query, n=48):
    prompt, _ = render_example({"query": query, "tools": tools, "system": system, "answers": []})
    ids = [BOS_ID] + tok.encode(prompt)
    out = []
    for _ in range(n):
        padded = jnp.asarray(ids + out + [0] * (512 - len(ids) - len(out)), jnp.int32)
        nxt = int(jnp.argmax(logits_at(padded)[len(ids) + len(out) - 1]))
        out.append(nxt)
        if nxt == EOS_ID or out[-len(im_end):] == im_end:
            break
    return tok.decode(out).replace("\n", " ")

engine = needle.Needle(tools=tools, system=system, weights=cact)
refusals = ["what's the capital of France?", "who won the world cup in 2022?",
            "what time is it in Singapore?", "how do I bake sourdough?",
            "give me a recipe for banana bread", "what's 17 times 23?"]
calls = ["did Alex work at perch insights?", "what was Alex doing at Perch Insights?"]
for query in refusals + calls:
    e = engine.complete(query)
    engine.reset()
    print(f"\nQ: {query}\n  engine: calls={json.dumps(e['function_calls'])}  "
          f"reasoning={e['reasoning']!r}\n  jax   : {jax_greedy(query)}")
