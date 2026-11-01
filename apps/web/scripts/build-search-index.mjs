#!/usr/bin/env node
/**
 * Builds `static/search-index.json` — what the site-wide search (⌘K) looks
 * through. See scripts/lib/search-corpus.mjs for what goes in it.
 *
 * Keywords only, no embeddings: the search answers as a person types, and
 * waiting on a model the size of the chat's for each keystroke would make it
 * the slowest thing on the site. The browser fetches this the first time the
 * search opens, and ranks with the chat's own BM25 (src/lib/chat/retrieval.mjs).
 *
 * Usage: node scripts/build-search-index.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSearchDocs } from './lib/search-corpus.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'static', 'search-index.json');

const docs = buildSearchDocs();
const payload = { version: 1, docs };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload));

const counts = docs.reduce((acc, doc) => {
  acc[doc.kind] = (acc[doc.kind] || 0) + 1;
  return acc;
}, {});
console.log(
  `search: ${docs.length} documents (${Object.entries(counts)
    .map(([kind, n]) => `${n} ${kind}`)
    .join(
      ', '
    )}), ${(fs.statSync(OUT).size / 1024).toFixed(0)}KB → ${path.relative(ROOT, OUT)}`
);
