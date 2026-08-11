#!/usr/bin/env node
/**
 * Clears the chat worker's previous build outputs from `static/` before
 * webpack emits fresh ones.
 *
 * The worker bundles into `static/` alongside real static assets (CNAME,
 * images/, cv/, chat-index.json), so webpack's own `output.clean` can never
 * be turned on — it would take the whole directory with it. But without any
 * cleaning, the content-hashed companions (the onnxruntime .wasm and .mjs
 * the worker loads at runtime) accumulate: every dependency bump renames
 * them, the old ones stay behind, and Gatsby copies the corpses into every
 * deploy. When this script was written, a 22 MB wasm from a long-replaced
 * onnxruntime version had been shipping in the artifact for that reason —
 * doubling its weight for nothing.
 *
 * Only the shapes webpack emits are touched, and only at the top level:
 * worker.js, hashed .wasm / .mjs, and their .LICENSE.txt companions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const staticDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'static'
);

const isWorkerArtifact = name =>
  name === 'worker.js' ||
  name.endsWith('.wasm') ||
  name.endsWith('.mjs') ||
  name.endsWith('.LICENSE.txt');

for (const entry of fs.readdirSync(staticDir, { withFileTypes: true })) {
  if (!entry.isFile() || !isWorkerArtifact(entry.name)) continue;
  fs.rmSync(path.join(staticDir, entry.name));
  console.log(`cleaned static/${entry.name}`);
}
