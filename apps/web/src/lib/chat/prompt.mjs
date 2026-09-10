/**
 * Prompt assembly for the grounded chat.
 *
 * Two structural decisions here, and the tension between them is the whole
 * design:
 *
 * 1. The system prompt is *static*. It no longer carries the CV, so it is
 *    byte-identical on every turn, which is what lets the worker prefill it
 *    once during loading and reuse that KV cache on the first question.
 *
 * 2. Retrieved passages ride in the user turn, and only the *live* user turn
 *    keeps them (see pruneHistory). Stale passages left in history are a real
 *    hallucination source — the model answering turn four out of turn one's
 *    context, confidently and with a citation.
 *
 * The second decision costs the first: rewriting history invalidates the KV
 * cache from turn two on. That is worth paying here, because what gets
 * reprefilled is now ~1,000 tokens of retrieved context rather than the
 * ~4,500 the whole-CV prompt carried, and dropping the two classifier passes
 * that used to run before every answer buys back more time than it costs.
 */
import { MAX_CONTEXT_CHARS } from '../../config/retrieval.mjs';

export const REFUSAL_MESSAGE =
  "that's outside what i know — i can only answer from Alex's site. try asking about his work, background, writing, or projects.";

/**
 * Instructions only. Roughly 200 tokens against the ~4,000 the full CV used to
 * occupy, and unlike the CV it is the same 200 tokens every single turn.
 */
export const SYSTEM_PROMPT = `You are "chat", a small AI model running locally in the visitor's browser on Alex Nodeland's personal website. You answer questions about Alex.

Each question arrives with numbered SOURCES retrieved from Alex's site — his CV, his writing, his projects, and his homepage.

How to answer:
- Write a normal English answer in your own words. Never reproduce the SOURCES list, its headings, or its numbering as your reply.
- Use only the SOURCES. Never invent or guess a fact, date, employer, title, or number.
- A question can assume something untrue — an award, a degree, a book, a reason for leaving a job. Check the assumption before answering it. If the SOURCES do not show the thing the question takes for granted, say so plainly instead of answering around it.
- Never work a fact out that the SOURCES do not state. Not an age from dates, not a duration from a range, not a completed degree from a started one, not a motive from a job change. If it is not written down, the answer is that you don't know it.
- Cite what you used with bracketed numbers, like [2] or [1][3], placed inline after the clause they support. A citation never starts your answer.
- If the SOURCES don't answer the question, say so directly and name what you could answer instead.
- Stop as soon as you have answered. Do not add a softening clause, a related aside, or a "but he has also…" — if a sentence is not supported by a SOURCE, it does not go in the answer, even when it sounds reasonable and even when it makes the answer feel more complete.
- Asked which role or company came before another, name exactly one and stop. Do not continue down the timeline listing further moves; recited from memory they come out in the wrong order.
- Two or three sentences is usually right. Expand only when asked for detail.
- Write like a person: plain, lowercase, specific. No preamble, no restating the question.
- Never mention "the sources" or "the context" in your answer — say "Alex's CV" or "his site", or just state the fact and cite it.
- If asked who or what you are: you're chat, a small model running entirely in this browser — no server, no API key, nothing leaves the machine.`;

// Few-shot examples were tried here and removed. The reasoning was sound —
// small models imitate patterns more reliably than they follow abstract rules,
// and the KV cache now makes anything in this prompt nearly free after the
// first prefill — but measurement went the other way on both counts. They did
// not stop the 230M fabricating (it still answered "Yes, Alex knows COBOL"
// with a near-identical Haskell denial two hundred tokens above the question),
// and they *broke* the 1.2B: an example mentioning Musiio was enough for it to
// answer "Alex worked at Musiio before he joined Influize" on the multi-turn
// case it had been getting right. Concrete names in a cached prefix get
// reached for. If you retry this, use examples with no corpus entities in
// them at all, and re-run `npm run eval:chat` for every model in the lineup.

/**
 * Folds the always-present passages into the system prompt.
 *
 * These two — who Alex is, and his career timeline — are in every prompt
 * regardless of what retrieval returns, so they are standing context rather
 * than evidence retrieved for a particular question. Putting them here rather
 * than in the user turn is a cache decision: the system message is the one
 * block that is byte-identical on every turn, so anything inside it gets
 * prefilled once at load and reused for the rest of the session. Moving them
 * roughly doubles the number of tokens the KV cache covers.
 *
 * They are deliberately not numbered — the model cites retrieved sources, and
 * a citation pointing at background the visitor cannot see as a link is worse
 * than no citation.
 */
export function buildSystemPrompt(pinned = []) {
  if (!pinned.length) return SYSTEM_PROMPT;
  const background = pinned.map(p => p.text).join('\n\n');
  return `${SYSTEM_PROMPT}\n\nStanding background on Alex, true for every question — use it freely, but it is not a numbered SOURCE and should not be cited:\n\n${background}`;
}

/**
 * Renders retrieved passages as a numbered source list plus the question.
 *
 * Most always-present context lives in the system prompt (buildSystemPrompt),
 * where the KV cache covers it. `nearQuestion` is the exception: the handful
 * of facts that have to sit where the model reads hardest, immediately above
 * the question, and are therefore re-prefilled every turn. Keep it short.
 *
 * @param {string} question
 * @param {Array<object>} hits
 * @param {Array<object>} [nearQuestion] pin-tier-2 passages, rendered
 *   unnumbered just above the question.
 * @param {{question: string, answer?: string} | null} [followUp] Set only for
 *   anaphoric follow-ups; restated above the question so "that" resolves.
 */
export function buildGroundedTurn(
  question,
  hits,
  nearQuestion = [],
  followUp = null
) {
  let budget = MAX_CONTEXT_CHARS;
  const lines = [];
  const sources = [];

  for (const p of hits) {
    if (budget <= 0) break;
    // Truncate on a word boundary rather than dropping a passage outright — a
    // clipped passage still carries its opening sentence, which is the part
    // that says what it is.
    let text = p.text;
    if (text.length > budget) {
      text = `${text.slice(0, budget).replace(/\s+\S*$/, '')}…`;
    }
    budget -= text.length;
    const n = sources.length + 1;
    // "Source 1 — Title", not "[1] Title". The block used to be headed with
    // the same bracket syntax the model is asked to cite with, and a 230M
    // copies what it sees: asked for Alex's current role it would answer
    // "[1] Senior AI Engineer at Perch Insights [2] CTO, Scala Computing …",
    // reproducing the list rather than reading it. Keeping the block's
    // formatting distinct from the citation's leaves nothing to mimic.
    lines.push(`Source ${n} — ${p.title}\n${text}`);
    sources.push({ n, id: p.id, title: p.title, url: p.url, kind: p.kind });
  }

  // Restate what an anaphoric follow-up refers to, immediately above the
  // question. Both halves are already in the conversation history, but with
  // three thousand characters of SOURCES sitting between them and the
  // question, a small model loses the thread — asked "and which company
  // before that?" it answers about whichever pair of companies sits nearest
  // in the timeline instead.
  //
  // The previous *answer* matters more than the previous question: "that"
  // refers to what was just said, and it is the answer that names it. Only
  // set when the query resolver judged the question anaphoric, so
  // self-contained questions are unaffected.
  const context = followUp?.question
    ? `\n\nThis question is a follow-up. The visitor previously asked: "${followUp.question}"` +
      (followUp.answer
        ? `\nAnd was told: "${truncate(followUp.answer, 220)}"\nResolve any "that", "there" or "it" in the question below against that exchange.`
        : '')
    : '';

  // Unnumbered, so the model does not try to cite them — they are facts, not
  // pages the visitor can be sent to.
  //
  // Gating these on whether the question looks temporal was tried and
  // reverted. The theory was that they bleed — asked just "archanan?" the
  // model answers "Alex worked at Archanan before joining Influize" instead
  // of saying what Archanan is. The theory was wrong: that recital comes from
  // the career timeline in the (always-present) system prompt, not from here,
  // so gating fixed nothing and cost two other cases.
  const anchors = nearQuestion.length
    ? `\n\n${nearQuestion.map(p => p.text).join('\n')}`
    : '';

  const prompt = `SOURCES\n${lines.join('\n\n')}${anchors}${context}\n\nQUESTION\n${question}`;
  return { prompt, sources };
}

/**
 * Strips the SOURCES block out of earlier turns.
 *
 * Only the live turn keeps its SOURCES. Passages left behind in history are a
 * real hallucination source — the model answering turn four out of turn one's
 * context, confidently and with a citation — and they inflate every subsequent
 * prefill for no benefit. Prior *answers* stay, so the conversation still
 * coheres and follow-ups still have something to refer back to.
 *
 * The cost is that rewriting history invalidates the KV cache from turn two
 * on. It is worth paying: the prefill it invalidates is now ~1,200 tokens of
 * retrieved context rather than the ~4,500 the whole-CV prompt used to carry,
 * and dropping the two classifier passes that used to run before every answer
 * buys back more time than the reprefill costs.
 */
export function pruneHistory(messages, keepContextFor = 1) {
  const userIndices = messages
    .map((m, i) => (m.role === 'user' ? i : -1))
    .filter(i => i >= 0);
  const keepFrom = userIndices[Math.max(0, userIndices.length - keepContextFor)];

  return messages.map((m, i) => {
    // Earlier answers keep their text but lose their citation markers. The
    // passages those numbers referred to have just been pruned, so leaving
    // them would show the model a conversation full of references to sources
    // that are no longer in front of it — and invite it to cite numbers that
    // do not exist in the current turn.
    if (m.role === 'assistant') {
      return { ...m, content: m.content.replace(/\s*\[\d+\]/g, '') };
    }
    if (m.role !== 'user' || i >= keepFrom) return m;
    return { ...m, content: stripSources(m.content) };
  });
}

/** Recovers the question a grounded turn was built around. */
export function stripSources(content) {
  const marker = content.lastIndexOf('\nQUESTION\n');
  return marker === -1 ? content : content.slice(marker + 10).trim();
}

/**
 * Collects the sources a finished answer actually cited, in citation order.
 * Uncited sources are dropped: a link list that includes passages the answer
 * never used trains visitors to ignore it.
 */
export function citedSources(answer, sources) {
  const order = [];
  const seen = new Set();
  const re = /\[(\d+)\]/g;
  let m;
  while ((m = re.exec(answer)) !== null) {
    const n = Number(m[1]);
    if (!seen.has(n)) {
      seen.add(n);
      order.push(n);
    }
  }

  const byUrl = new Map();
  for (const n of order) {
    const src = sources.find(s => s.n === n);
    if (src && !byUrl.has(src.url)) byUrl.set(src.url, src);
  }
  return [...byUrl.values()];
}

/** Clips to a word boundary, for quoting a previous answer back compactly. */
function truncate(text, max) {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max
    ? flat
    : `${flat.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

/** Several passages often share one page — four CV chunks are still one /cv
 *  link. Collapses them so the visible list is a list of pages. */
export function dedupeByUrl(sources) {
  const byUrl = new Map();
  for (const s of sources) if (!byUrl.has(s.url)) byUrl.set(s.url, s);
  return [...byUrl.values()];
}
