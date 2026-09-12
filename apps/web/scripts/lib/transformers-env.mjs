/**
 * Points Transformers.js at a cache directory that survives a clean install.
 *
 * The library's Node default is `node_modules/@huggingface/transformers/.cache`
 * (DEFAULT_CACHE_DIR, resolved against its own package directory), which is
 * inside the tree `npm ci` deletes. On a CI runner that means the embedding
 * model is downloaded fresh on every run, and a rate-limited Hugging Face
 * takes the whole job with it: a 429 here fails `build:index`, which fails
 * `npm run develop`, which fails Playwright's webServer before a single spec
 * has run.
 *
 * Setting HF_TRANSFORMERS_CACHE moves the cache somewhere the runner can
 * restore between runs. The variable is unset in local development, where the
 * library keeps its own default and nothing changes.
 *
 * Import this for its side effect before the first `pipeline()` call. The
 * cache directory is read when a model file is fetched, not when the module
 * loads, so import order among the other imports does not matter.
 */
import { env } from '@huggingface/transformers';

const cacheDir = process.env.HF_TRANSFORMERS_CACHE;

if (cacheDir) {
  env.cacheDir = cacheDir;
}
