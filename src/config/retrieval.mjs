/**
 * Retrieval settings shared by the index builder, the browser worker and the
 * offline eval. Kept as `.mjs` so plain Node scripts and the webpack worker
 * bundle can both import it without a transpile step, which is what lets
 * `npm run eval:retrieval` tune thresholds that the site actually uses.
 */

/** 32MB at q8. Small enough that it finishes downloading long before the
 *  language model does, so retrieval is warm by the time anyone can type. */
export const EMBEDDING_MODEL = 'Xenova/bge-small-en-v1.5';
export const EMBEDDING_DIM = 384;

/** BGE was trained with an asymmetric objective: queries carry this prefix and
 *  passages do not. Dropping it costs several points of recall. */
export const QUERY_PREFIX =
  'Represent this sentence for searching relevant passages: ';

/** Where the browser fetches the prebuilt index from. */
export const INDEX_PATH = '/chat-index.json';

/**
 * Tuned by `npm run eval:retrieval` against the graded question set in
 * `scripts/retrieval-eval.mjs`. Change a number here, rerun that, and the
 * effect on recall and on off-topic precision is visible in about a second.
 */
export const RETRIEVAL_OPTIONS = {
  topK: 4,
  poolSize: 20,
  prfTerms: 6,
  prfDocs: 2,
  prfWeight: 0.35,
  // Both from `--sweep`. Off-topic questions in the eval set top out at 0.56
  // cosine and on-topic ones bottom out at 0.61, so 0.60 sits in the gap with
  // room on either side; the sweep scores 100% anywhere from 0.58 to 0.62.
  gateHigh: 0.6,
  gateLow: 0.42,
  fusionWeights: [1, 0.9],
  hitFloor: 0.7,
};

/** Cap on characters of retrieved context handed to the model. The whole point
 *  of retrieving is to keep prefill short; without a ceiling a few long blog
 *  passages would quietly undo that. */
export const MAX_CONTEXT_CHARS = 3200;

/**
 * Ceiling on the always-present passages folded into the system prompt.
 *
 * They no longer compete with retrieval for the context budget — they moved
 * into the system message so the KV cache can cover them — but they are still
 * paid for on every prefill, so unbounded growth there would quietly undo the
 * saving. Sized so the current pinned pair fits with room to spare.
 */
export const MAX_PINNED_CHARS = 1900;
