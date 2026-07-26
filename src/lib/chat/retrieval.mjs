/**
 * Hybrid retrieval for the in-browser chat.
 *
 * Dependency-free and isomorphic on purpose: the browser worker and the
 * offline eval script run this exact code, so a retrieval score tuned on the
 * command line is the score the visitor gets.
 *
 * Why hybrid rather than just embeddings: the corpus is one person's life, so
 * almost everything in it is semantically adjacent to everything else, and a
 * 384-dimension vector cannot separate "Musiio" from "Influize" the way an
 * exact term match trivially can. BM25 carries the proper nouns (fugue,
 * COBOL, Stony Brook, quiver); the embeddings carry the paraphrases ("where
 * did he go to school"). Reciprocal rank fusion combines them without needing
 * the two score scales to be commensurable — which they are not.
 */

const STOPWORDS = new Set(
  ('a an and are as at be been but by can did do does for from had has have he ' +
    'her him his how i if in into is it its me my of on or our so than that the ' +
    'their them then there these they this those to was we were what when where ' +
    'which who whom why will with you your yours am does doing done about would ' +
    'could should tell give show know like want please just any some more most')
    .split(' ')
    .filter(Boolean)
);

/** Pronouns and names that mark a question as being *about the site's subject*
 *  even when no content word matches. Used by the off-topic gate. */
const SUBJECT_TERMS =
  /\b(alex|nodeland|he|him|his|himself|you|your|yours|yourself|this (?:guy|person|site))\b/i;

/**
 * Attempts to talk to the assistant rather than about Alex.
 *
 * These need their own check because they defeat the topicality signals: they
 * are addressed to "you", which reads as on-topic, and they are phrased
 * fluently enough to embed close to the corpus. Refusing them here means the
 * model is never asked to police its own instructions — a job a 1.2B model
 * loses more often than it wins.
 */
const INJECTION_PATTERN =
  /\b(ignore|disregard|forget|override|bypass)\b[^.?!]{0,40}\b(previous|prior|above|earlier|your|all|any|the)\b[^.?!]{0,20}\b(instruction|prompt|rule|direction|guideline|context)/i;

/**
 * The question is an imperative asking the assistant to perform a task.
 * "tell", "show", "list" and "describe" are deliberately absent: those are how
 * people ask about a person ("tell me about Musiio"), not how they ask for
 * work to be done.
 */
const TASK_REQUEST_PATTERN =
  /^\s*(?:please\s+|can you\s+|could you\s+)?(write|create|generate|make|build|code|implement|explain|summari[sz]e|translate|convert|calculate|compute|solve|draft|compose|rewrite|fix|debug|refactor|optimi[sz]e|pretend|act as|roleplay|simulate)\b/i;

/**
 * Light suffix stripping — enough to unify wavelet/wavelets and
 * compress/compression without dragging in a full Porter stemmer. Over-
 * stemming is cheap here because BM25 is only one of two fused signals.
 */
function stem(word) {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  for (const suffix of ['ational', 'iveness', 'ization', 'fulness', 'ousness']) {
    if (w.length > suffix.length + 3 && w.endsWith(suffix)) {
      return w.slice(0, -suffix.length);
    }
  }
  for (const suffix of ['ements', 'ations', 'ement', 'ation', 'ingly', 'edly']) {
    if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
      return w.slice(0, -suffix.length);
    }
  }
  for (const suffix of ['ing', 'ers', 'er', 'ed', 'es', 's']) {
    if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  // Collapse a trailing y onto i so study/studied and apply/applied unify —
  // "where did Alex study" against a CV that says "studied" is exactly the
  // query this costs us otherwise.
  if (w.length > 3 && w.endsWith('y')) w = `${w.slice(0, -1)}i`;
  return w;
}

export function tokenize(text) {
  const out = [];
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, ' ')
    .split(/[\s.]+/);
  for (const raw of words) {
    const w = raw.replace(/^[-.]+|[-.]+$/g, '');
    if (w.length < 2 || STOPWORDS.has(w)) continue;
    out.push(stem(w));
  }
  return out;
}

const BM25_K1 = 1.2;
const BM25_B = 0.7;

/** Precomputes term frequencies, document frequencies and length norms. */
export function buildLexicalIndex(chunks) {
  const postings = new Map(); // stem -> Map(docIndex -> tf)
  const docLen = new Float32Array(chunks.length);
  const titleTerms = new Set();

  chunks.forEach((chunk, i) => {
    for (const t of tokenize(chunk.title)) titleTerms.add(t);
    // The title is indexed twice: a passage whose title names the thing being
    // asked about is nearly always the right passage, and BM25 has no other
    // way to know that one part of the text is a label.
    const terms = tokenize(`${chunk.title} ${chunk.title} ${chunk.text}`);
    docLen[i] = terms.length;
    for (const t of terms) {
      let plist = postings.get(t);
      if (!plist) postings.set(t, (plist = new Map()));
      plist.set(i, (plist.get(i) || 0) + 1);
    }
  });

  let total = 0;
  for (let i = 0; i < docLen.length; i++) total += docLen[i];

  return {
    postings,
    docLen,
    titleTerms,
    avgdl: docLen.length ? total / docLen.length : 0,
    numDocs: chunks.length,
  };
}

/**
 * True when a query term is a name belonging to this corpus — "musiio",
 * "archanan", "fugue", "quiver", "wavelet".
 *
 * Two conditions, and both are load-bearing. Appearing in a passage *title*
 * is what separates a name from a word that merely happens to be rare:
 * "capital" occurs exactly once in the corpus and "transformer" twice, but
 * neither ever titles anything, so rarity alone would have waved "what's the
 * capital of France" straight through. A low document frequency is what
 * separates a name from a common topic: "python" titles a blog post but
 * appears in sixteen passages, and someone typing it is as likely to want
 * coding help as to be asking about Alex.
 */
function isEntityTerm(lex, term) {
  if (!lex.titleTerms?.has(term)) return false;
  const df = lex.postings.get(term)?.size ?? 0;
  return df > 0 && df <= 8;
}

/**
 * BM25 over a weighted bag of terms. `weights` lets the pseudo-relevance
 * feedback pass add expansion terms at a fraction of an original term's pull.
 */
export function bm25(lex, terms, weights = null) {
  const scores = new Float32Array(lex.numDocs);
  const { postings, docLen, avgdl, numDocs } = lex;

  terms.forEach((term, ti) => {
    const plist = postings.get(term);
    if (!plist) return;
    const df = plist.size;
    const idf = Math.log(1 + (numDocs - df + 0.5) / (df + 0.5));
    const weight = weights ? (weights[ti] ?? 1) : 1;
    for (const [doc, tf] of plist) {
      const norm = tf + BM25_K1 * (1 - BM25_B + (BM25_B * docLen[doc]) / avgdl);
      scores[doc] += weight * idf * ((tf * (BM25_K1 + 1)) / norm);
    }
  });

  return scores;
}

/** Cosine similarity against every chunk. Vectors are stored L2-normalized,
 *  so this is a plain dot product. */
export function denseScores(matrix, dim, query) {
  const n = matrix.length / dim;
  const scores = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const off = i * dim;
    let dot = 0;
    for (let d = 0; d < dim; d++) dot += matrix[off + d] * query[d];
    scores[i] = dot;
  }
  return scores;
}

/**
 * Descending argsort, returning at most `limit` indices.
 *
 * The relative floor matters more than it looks. Fusion is rank-based, so a
 * ranking built from noise is weighted exactly like a ranking built from real
 * matches — a document scraping the bottom of the lexical list would arrive at
 * the fusion looking as credible as the dense retriever's best hit. Dropping
 * everything far below the top score keeps weak lexical evidence from voting.
 */
function rankOf(scores, limit, relativeFloor = 0) {
  let max = 0;
  for (let i = 0; i < scores.length; i++) if (scores[i] > max) max = scores[i];
  if (max <= 0) return [];

  const cutoff = max * relativeFloor;
  const idx = [];
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > 0 && scores[i] >= cutoff) idx.push(i);
  }
  idx.sort((a, b) => scores[b] - scores[a]);
  return idx.slice(0, limit);
}

/** Fraction of the top lexical score a document must reach to enter fusion. */
const LEXICAL_FLOOR = 0.2;

/**
 * Keeps only query terms that can actually discriminate.
 *
 * "alex" occurs in all 83 passages of a corpus about Alex. Its IDF is
 * effectively zero, so BM25 ranks purely on length normalization and hands
 * back the shortest documents in the corpus — which then fuse in as though
 * they were real matches. Terms this common are dropped before scoring.
 */
function discriminativeTerms(lex, terms) {
  const ceiling = lex.numDocs * 0.4;
  return terms.filter(t => {
    const df = lex.postings.get(t)?.size ?? 0;
    return df > 0 && df <= ceiling;
  });
}

const RRF_K = 60;

/** Reciprocal rank fusion over any number of ranked lists. */
export function fuse(rankings, weights = null) {
  const fused = new Map();
  rankings.forEach((ranking, r) => {
    const w = weights ? (weights[r] ?? 1) : 1;
    ranking.forEach((doc, rank) => {
      fused.set(doc, (fused.get(doc) || 0) + w / (RRF_K + rank + 1));
    });
  });
  return fused;
}

/**
 * Fallbacks, kept in step with `src/config/retrieval.mjs` — which is the
 * tuned copy the worker and the evals actually pass in, and the one to edit.
 * These exist so `retrieve` is callable without wiring up config, mainly from
 * unit tests; a silent divergence between the two would make those tests
 * assert against settings the site does not use.
 */
export const DEFAULT_OPTIONS = {
  /** Passages handed to the model, excluding pinned ones. */
  topK: 4,
  /** Candidates considered from each retriever before fusion. */
  poolSize: 20,
  /** Expansion terms drafted from the top passages of the first hop. */
  prfTerms: 6,
  /** How many top passages feed the expansion. */
  prfDocs: 2,
  /** Pull of an expansion term relative to a term the visitor actually typed. */
  prfWeight: 0.35,
  /** Cosine at or above which a question is on-topic regardless of phrasing. */
  gateHigh: 0.6,
  /** Cosine floor for a question that explicitly names Alex or uses "he"/"you". */
  gateLow: 0.42,
  /** Weights for [dense, lexical] in the fusion. */
  fusionWeights: [1, 0.9],
  /** A hit must reach this fraction of the best cosine to be included. */
  hitFloor: 0.7,
};

/**
 * Runs the full two-hop retrieval.
 *
 * Hop 1 fuses dense and lexical rankings. Hop 2 is pseudo-relevance feedback:
 * the highest-IDF terms from the best passages of hop 1 are folded back into
 * the lexical query at reduced weight and the lexical side is re-scored. It
 * costs no model call and recovers the case where the visitor's wording shares
 * nothing with the corpus ("what did he do in Singapore" → "archanan").
 *
 * Returns the chosen passages plus the signals the caller needs to decide
 * whether to answer at all.
 */
export function retrieve(index, queryText, queryVector, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { chunks, lex, matrix, dim } = index;

  const queryTerms = discriminativeTerms(lex, tokenize(queryText));
  const dense = queryVector
    ? denseScores(matrix, dim, queryVector)
    : new Float32Array(chunks.length);

  const denseRank = rankOf(dense, opts.poolSize);
  const lexScores = bm25(lex, queryTerms);
  const lexRank = rankOf(lexScores, opts.poolSize, LEXICAL_FLOOR);

  let fused = fuse([denseRank, lexRank], opts.fusionWeights);

  // --- hop 2: pseudo-relevance feedback ---
  let expansion = [];
  const seeds = [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, opts.prfDocs)
    .map(([doc]) => doc);

  if (seeds.length && opts.prfTerms > 0) {
    const seen = new Set(queryTerms);
    const candidates = new Map();
    for (const doc of seeds) {
      for (const term of tokenize(chunks[doc].text)) {
        if (seen.has(term)) continue;
        const df = lex.postings.get(term)?.size ?? 0;
        if (df === 0 || df > lex.numDocs / 3) continue; // too common to help
        const idf = Math.log(1 + (lex.numDocs - df + 0.5) / (df + 0.5));
        candidates.set(term, Math.max(candidates.get(term) || 0, idf));
      }
    }
    expansion = [...candidates.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, opts.prfTerms)
      .map(([term]) => term);

    if (expansion.length) {
      const allTerms = [...queryTerms, ...expansion];
      const weights = [
        ...queryTerms.map(() => 1),
        ...expansion.map(() => opts.prfWeight),
      ];
      const expandedRank = rankOf(
        bm25(lex, allTerms, weights),
        opts.poolSize,
        LEXICAL_FLOOR
      );
      fused = fuse([denseRank, lexRank, expandedRank], [
        opts.fusionWeights[0],
        opts.fusionWeights[1],
        opts.fusionWeights[1] * 0.6,
      ]);
    }
  }

  const ordered = [...fused.entries()].sort((a, b) => b[1] - a[1]);

  let maxDense = 0;
  for (let i = 0; i < dense.length; i++) {
    if (dense[i] > maxDense) maxDense = dense[i];
  }

  // Pinned passages ride along free of the top-k budget — see chat-corpus.mjs.
  const pinned = [];
  chunks.forEach((c, i) => {
    if (c.pin) pinned.push(i);
  });
  const pinnedSet = new Set(pinned);

  // Fusion will happily fill all topK slots, including with a passage that
  // only ranked because one query word happened to appear in it. Requiring
  // each hit to be within `hitFloor` of the best semantic match drops those:
  // "where did Alex study?" otherwise pulls in a finance blog post at 0.41
  // cosine, purely on the word "study", and spends 800 characters of prefill
  // on it. Relative rather than absolute so it adapts to how well the corpus
  // matched the question at all.
  const floor = maxDense * opts.hitFloor;

  const picked = [];
  for (const [doc] of ordered) {
    if (pinnedSet.has(doc)) continue;
    if (dense[doc] < floor) continue;
    picked.push(doc);
    if (picked.length >= opts.topK) break;
  }

  const namesEntity = queryTerms.some(t => isEntityTerm(lex, t));
  const namesSubject = SUBJECT_TERMS.test(queryText);
  const injection = INJECTION_PATTERN.test(queryText);

  // "write me a function", "explain how X works", "calculate Y" — a job for an
  // assistant, not a question about a person. Embeddings are poor at this
  // distinction because the words are drawn from the same technical
  // vocabulary the CV uses; the grammatical mood separates them cleanly. A
  // request that does name Alex ("summarize his career") is left alone.
  const taskRequest = TASK_REQUEST_PATTERN.test(queryText) && !namesSubject;

  const onTopic =
    !injection &&
    !taskRequest &&
    (maxDense >= opts.gateHigh ||
      namesEntity ||
      (namesSubject && maxDense >= opts.gateLow));

  const toHit = doc => ({
    ...chunks[doc],
    dense: dense[doc],
    score: fused.get(doc) ?? 0,
  });

  return {
    hits: picked.map(toHit),
    pinned: pinned.map(toHit),
    maxDense,
    namesSubject,
    namesEntity,
    injection,
    taskRequest,
    onTopic,
    queryTerms,
    expansion,
  };
}

/**
 * Rehydrates a built index. Vectors ship as int8 (see build-chat-index.mjs);
 * they are widened to float32 once here so query time is a plain dot product.
 */
export function hydrateIndex(payload) {
  const { chunks, dim } = payload;
  const bytes =
    typeof payload.vectors === 'string'
      ? decodeBase64(payload.vectors)
      : payload.vectors;

  const matrix = new Float32Array(chunks.length * dim);
  for (let i = 0; i < chunks.length; i++) {
    const off = i * dim;
    let norm = 0;
    for (let d = 0; d < dim; d++) {
      // int8 round-trip loses ~0.4% of the norm; renormalizing keeps the
      // dot product an honest cosine so gate thresholds stay meaningful.
      const v = (bytes[off + d] << 24) >> 24; // sign-extend
      matrix[off + d] = v;
      norm += v * v;
    }
    norm = Math.sqrt(norm) || 1;
    for (let d = 0; d < dim; d++) matrix[off + d] /= norm;
  }

  return { chunks, dim, matrix, lex: buildLexicalIndex(chunks) };
}

function decodeBase64(b64) {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/** Openers that mean the question cannot be understood on its own. */
const FOLLOW_UP_CUE =
  /^\s*(and|but|so|what about|how about|ok|okay|then|why|how come|before|after|which one|what else|anything else|more|tell me more|go on)\b/i;

/**
 * Words that point at something said earlier. "he", "his" and "him" are
 * deliberately excluded: on a site about one person they refer to Alex in
 * essentially every question, so treating them as anaphora would expand
 * "where did he study?" — which retrieves perfectly well on its own — with
 * whatever happened to be asked before it.
 */
const ANAPHOR = /\b(there|then|that|this|those|these|it|its|one|ones|same|such)\b/i;

/**
 * Decontextualizes a follow-up for retrieval — "and before that?" retrieves
 * nothing on its own.
 *
 * The usual fix is to ask the model to rewrite the question into a standalone
 * one, which costs a whole extra generation before the visitor sees a single
 * token. On a corpus that is entirely about one person, the cheap version
 * works nearly as well: carry the previous question's words into the query
 * when the current one is too short or too anaphoric to stand alone. Zero
 * model calls, so the answer starts streaming immediately.
 *
 * Only the *retrieval* query is expanded. The model still sees the question
 * the visitor actually typed.
 */
export function resolveQuery(messages) {
  const userTurns = messages.filter(m => m.role === 'user');
  const current = userTurns[userTurns.length - 1]?.content?.trim() || '';
  const previous = userTurns[userTurns.length - 2]?.content?.trim() || '';
  if (!previous) return { query: current, previousQuestion: null };

  const terms = tokenize(current);
  const needsContext =
    terms.length === 0 ||
    FOLLOW_UP_CUE.test(current) ||
    (ANAPHOR.test(current) && terms.length <= 3);

  return needsContext
    ? { query: `${previous} ${current}`, previousQuestion: previous }
    : { query: current, previousQuestion: null };
}

/** The search query alone. */
export function buildRetrievalQuery(messages) {
  return resolveQuery(messages).query;
}

/** Quantizes an L2-normalized float vector to int8. Inverse of hydrateIndex. */
export function quantize(vector) {
  const out = new Int8Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    out[i] = Math.max(-127, Math.min(127, Math.round(vector[i] * 127)));
  }
  return out;
}
