#!/usr/bin/env node
/**
 * Builds `static/chat-index.json` — the retrieval index the in-browser chat
 * searches before it answers anything.
 *
 * Embedding happens here, at build time, not in the visitor's browser. That is
 * the single biggest reason the chat feels instant: the browser only ever has
 * to embed the *question* (one forward pass over ~15 tokens, single-digit
 * milliseconds), never the corpus. Adding a blog post costs the visitor
 * nothing at runtime.
 *
 * Vectors are stored int8. A normalized float32 index would be ~127KB for this
 * corpus; int8 is ~32KB and the cosine error is under half a percent, which is
 * far below the margin between a relevant and an irrelevant passage.
 *
 * Usage: node scripts/build-chat-index.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@huggingface/transformers';
import { buildCorpus } from './lib/chat-corpus.mjs';
import { quantize } from '../src/lib/chat/retrieval.mjs';
import { EMBEDDING_MODEL, EMBEDDING_DIM } from '../src/config/retrieval.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'static', 'chat-index.json');

async function main() {
  const chunks = buildCorpus();
  console.log(`corpus: ${chunks.length} passages`);

  const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, {
    dtype: 'q8',
  });

  const t0 = Date.now();
  // BGE is trained with CLS pooling; mean pooling measurably degrades it.
  // Passages are embedded bare — only queries take the instruction prefix.
  const output = await extractor(
    chunks.map(c => c.text),
    { pooling: 'cls', normalize: true }
  );
  console.log(`embedded in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const dim = output.dims[output.dims.length - 1];
  if (dim !== EMBEDDING_DIM) {
    throw new Error(
      `embedding dim ${dim} does not match EMBEDDING_DIM ${EMBEDDING_DIM} in src/config/retrieval.mjs`
    );
  }

  const flat = Float32Array.from(output.data);
  const bytes = new Uint8Array(chunks.length * dim);
  for (let i = 0; i < chunks.length; i++) {
    bytes.set(quantize(flat.subarray(i * dim, (i + 1) * dim)), i * dim);
  }

  const payload = {
    model: EMBEDDING_MODEL,
    dim,
    count: chunks.length,
    // Deliberately no build timestamp: the index is fetched and cached by the
    // browser, and a field that changes every build busts that cache for no
    // reason. Content changes already change the bytes.
    chunks: chunks.map(({ id, kind, title, url, text, pin }) => ({
      id,
      kind,
      title,
      url,
      text,
      // 1 = cached background in the system prompt, 2 = rendered next to the
      // question. See chat-corpus.mjs.
      ...(pin ? { pin } : {}),
    })),
    vectors: Buffer.from(bytes).toString('base64'),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload));

  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  const byKind = {};
  for (const c of chunks) byKind[c.kind] = (byKind[c.kind] || 0) + 1;
  console.log(
    `wrote ${path.relative(ROOT, OUT)} — ${kb}KB, ${dim}d, ${JSON.stringify(byKind)}`
  );
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
