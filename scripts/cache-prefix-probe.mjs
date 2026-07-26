#!/usr/bin/env node
/**
 * How much of each turn's prompt could a KV cache possibly cover?
 *
 * A KV cache can only reuse a token-for-token prefix, so the ceiling on any
 * caching scheme is a property of how the conversation is templated, not of
 * the cache code. This measures that ceiling directly — tokenizer only, no
 * model, no browser — so a design can be judged before it is built.
 *
 * Three layouts are compared:
 *
 *   A. current      — SOURCES ride in the live user turn and are stripped from
 *                     history once the next turn arrives. Only the static
 *                     system message is ever cacheable.
 *   B. stable-prefix— also cache the pruned history (plain questions and
 *                     answers), which *is* a genuine prefix of the next turn.
 *   C. append-only  — each turn's new passages are appended next to that turn's
 *                     question and never removed, so nothing before the tail
 *                     ever changes and the whole conversation is cacheable.
 *
 * Usage: node scripts/cache-prefix-probe.mjs
 */
import { AutoTokenizer } from '@huggingface/transformers';
import { buildSystemPrompt, buildGroundedTurn } from '../src/lib/chat/prompt.mjs';

const MODEL_ID = 'LiquidAI/LFM2.5-1.2B-Instruct-ONNX';

/** Stand-in passages. Only length and stability matter here. */
const passage = (id, title, words) => ({
  id,
  title,
  url: `/${id}/`,
  kind: 'cv',
  text: `${title}. ${'lorem ipsum dolor sit amet consectetur adipiscing elit '.repeat(words)}`,
});

const PINNED = [
  passage('cv:who', 'Who Alex is', 12),
  passage('cv:timeline', 'Career timeline', 20),
];

const P = {
  perch: passage('cv:perch', 'Senior AI Engineer', 18),
  skills: passage('cv:skills', 'Technical skills', 14),
  influize: passage('cv:influize', 'Head of AI, Influize', 16),
  timeline2: passage('cv:timeline2', 'Career timeline detail', 20),
  archanan: passage('cv:archanan', 'CEO, Archanan', 22),
  musiio: passage('cv:musiio', 'Tech lead, Musiio', 15),
  education: passage('cv:education', 'Education', 12),
  stony: passage('cv:stonybrook', 'Stony Brook', 16),
  writing: passage('blog:list', 'Writing', 20),
  rust: passage('blog:rust', 'Rust posts', 18),
  fugue: passage('proj:fugue', 'fugue', 17),
  quiver: passage('proj:quiver', 'quiver', 15),
};

/**
 * A plausible session. The first four turns stay on one topic — which is the
 * realistic case, and the one where retrieval repeats itself — then it moves
 * on, which is where an append-only layout has to pay.
 */
const TURNS = [
  {
    q: "what's Alex's current role?",
    hits: [P.perch, P.skills],
    a: 'alex is a senior ai engineer at perch insights, where he builds agent orchestration and evaluation infrastructure.',
  },
  {
    q: 'and which company before that?',
    hits: [P.influize, P.timeline2],
    a: 'before perch he was head of ai at influize.',
  },
  {
    q: 'what did he do in singapore?',
    hits: [P.archanan, P.musiio],
    a: 'he co-founded archanan in singapore and ran it as ceo for four years, building cloud emulators of supercomputers.',
  },
  {
    // A follow-up that retrieves exactly what the previous turn did.
    q: 'how long was he there?',
    hits: [P.archanan, P.timeline2],
    a: 'four years.',
  },
  {
    q: 'where did he study?',
    hits: [P.education, P.stony],
    a: 'he studied applied mathematics and statistics at stony brook university.',
  },
  {
    q: 'which rust projects are his?',
    hits: [P.fugue, P.quiver],
    a: 'fugue, a probabilistic programming library, and quiver, an audio synthesis crate.',
  },
];

const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
const systemPrompt = buildSystemPrompt(PINNED);

const tpl = (messages, addGenerationPrompt) =>
  Array.from(
    tokenizer.apply_chat_template(messages, {
      add_generation_prompt: addGenerationPrompt,
      return_dict: true,
    }).input_ids.data
  ).map(Number);

const lcp = (a, b) => {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
};

const SYSTEM_MSG = { role: 'system', content: systemPrompt };
const systemOnly = tpl([SYSTEM_MSG], false);

// --- layout A/B: SOURCES only in the live turn -----------------------------
// History is plain questions and answers, exactly as prepareTurn builds it
// (`plain` strips SOURCES from every user message before pruneHistory runs).
const rowsAB = [];
{
  const history = [];
  for (const [i, turn] of TURNS.entries()) {
    const { prompt } = buildGroundedTurn(turn.q, turn.hits, [], null);
    const full = tpl([SYSTEM_MSG, ...history, { role: 'user', content: prompt }], true);
    const stable = tpl([SYSTEM_MSG, ...history], false);
    rowsAB.push({
      turn: i + 1,
      prompt: full.length,
      cachedA: lcp(full, systemOnly),
      cachedB: lcp(full, stable),
      stableLen: stable.length,
      exact: lcp(full, stable) === stable.length,
    });
    history.push({ role: 'user', content: turn.q });
    history.push({ role: 'assistant', content: turn.a });
  }
}

// --- layout C: append-only -------------------------------------------------
// Each turn appends only the passages it has not already shown, next to its
// own question, and nothing is ever rewritten.
const rowsC = [];
{
  const history = [];
  const shown = new Map(); // id -> source number, stable for the whole session
  let prevFull = null;
  for (const [i, turn] of TURNS.entries()) {
    const fresh = turn.hits.filter(h => !shown.has(h.id));
    for (const h of fresh) shown.set(h.id, shown.size + 1);
    const block = fresh.length
      ? `SOURCES\n${fresh.map(h => `Source ${shown.get(h.id)} — ${h.title}\n${h.text}`).join('\n\n')}\n\n`
      : '';
    const content = `${block}QUESTION\n${turn.q}`;
    const full = tpl([SYSTEM_MSG, ...history, { role: 'user', content }], true);
    rowsC.push({
      turn: i + 1,
      prompt: full.length,
      cached: prevFull ? lcp(full, prevFull) : lcp(full, systemOnly),
      newPassages: fresh.length,
    });
    history.push({ role: 'user', content });
    history.push({ role: 'assistant', content: turn.a });
    // What the cache holds after this turn: the whole conversation including
    // the answer just generated.
    prevFull = tpl([SYSTEM_MSG, ...history], false);
  }
}

// --- layout D: sources first, history after --------------------------------
// The reason nothing but the system message is cacheable today is that history
// sits *between* the system message and the SOURCES block, and history grows
// by ~30 tokens a turn — which shifts every source token and breaks the prefix
// before it starts. Putting the retrieved passages directly after the system
// message pins them to a fixed offset, so a turn that retrieves what the last
// turn retrieved matches token-for-token.
//
// Passages are ordered by when they were first shown rather than by score, so
// a partial overlap still shares a leading run instead of being reshuffled
// into a miss. Only the live turn's passages are included — nothing stale is
// retained, unlike C.
const rowsD = [];
{
  const history = [];
  const firstShown = new Map(); // id -> order index, stable for the session
  let prevCache = null; // what the cache holds entering this turn
  for (const [i, turn] of TURNS.entries()) {
    const ordered = [...turn.hits].sort((a, b) => {
      const ai = firstShown.has(a.id) ? firstShown.get(a.id) : Infinity;
      const bi = firstShown.has(b.id) ? firstShown.get(b.id) : Infinity;
      return ai - bi;
    });
    for (const h of ordered) {
      if (!firstShown.has(h.id)) firstShown.set(h.id, firstShown.size);
    }
    const block =
      `SOURCES\n` +
      ordered.map((h, n) => `Source ${n + 1} — ${h.title}\n${h.text}`).join('\n\n');

    const messages = [
      SYSTEM_MSG,
      { role: 'user', content: block },
      { role: 'assistant', content: 'ok' },
      ...history,
      { role: 'user', content: `QUESTION\n${turn.q}` },
    ];
    const full = tpl(messages, true);
    rowsD.push({
      turn: i + 1,
      prompt: full.length,
      cached: prevCache ? lcp(full, prevCache) : lcp(full, systemOnly),
    });
    history.push({ role: 'user', content: `QUESTION\n${turn.q}` });
    history.push({ role: 'assistant', content: turn.a });
    // After the answer, the cache covers this turn's prompt plus its answer.
    prevCache = tpl(
      [
        SYSTEM_MSG,
        { role: 'user', content: block },
        { role: 'assistant', content: 'ok' },
        ...history,
      ],
      false
    );
  }
}

const pct = (n, d) => `${Math.round((n / d) * 100)}%`;
const sum = (xs, f) => xs.reduce((n, r) => n + f(r), 0);

console.log(`\nmodel ${MODEL_ID}`);
console.log(`system message (instructions + pinned background): ${systemOnly.length} tokens\n`);

console.log('     |  A: today   |  B: +history |  C: append-only |  D: sources-first');
console.log('turn | prom prefill | prom  prefill | prompt  prefill | prompt  prefill');
console.log('-----+--------------+---------------+-----------------+------------------');
for (let i = 0; i < TURNS.length; i++) {
  const a = rowsAB[i];
  const c = rowsC[i];
  const d = rowsD[i];
  console.log(
    `  ${String(a.turn).padStart(2)} | ` +
      `${String(a.prompt).padStart(4)} ${String(a.prompt - a.cachedA).padStart(7)} | ` +
      `${String(a.prompt).padStart(4)} ${String(a.prompt - a.cachedB).padStart(8)} | ` +
      `${String(c.prompt).padStart(6)} ${String(c.prompt - c.cached).padStart(8)} | ` +
      `${String(d.prompt).padStart(6)} ${String(d.prompt - d.cached).padStart(8)}`
  );
}

const tA = sum(rowsAB, r => r.prompt);
const tC = sum(rowsC, r => r.prompt);
console.log(
  `\nover ${TURNS.length} turns, tokens that must actually be prefilled:\n` +
    `  A today        : ${tA - sum(rowsAB, r => r.cachedA)}  (${pct(sum(rowsAB, r => r.cachedA), tA)} cached)\n` +
    `  B + history    : ${tA - sum(rowsAB, r => r.cachedB)}  (${pct(sum(rowsAB, r => r.cachedB), tA)} cached)\n` +
    `  C append-only  : ${tC - sum(rowsC, r => r.cached)}  (${pct(sum(rowsC, r => r.cached), tC)} cached)\n` +
    `  D sources-first: ${sum(rowsD, r => r.prompt) - sum(rowsD, r => r.cached)}  (${pct(sum(rowsD, r => r.cached), sum(rowsD, r => r.prompt))} cached)`
);

console.log(
  `\nB is a genuine prefix on every turn: ${rowsAB.every(r => r.exact) ? 'yes' : 'NO'}`
);
console.log(
  `history growth per turn (what B buys): ` +
    rowsAB.map((r, i) => (i ? r.stableLen - rowsAB[i - 1].stableLen : 0)).join(', ') +
    ' tokens'
);
console.log(
  `new passages per turn (what C pays): ` + rowsC.map(r => r.newPassages).join(', ')
);
