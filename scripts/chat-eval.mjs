#!/usr/bin/env node
/**
 * Quantitative eval harness for the in-browser CV chatbot.
 *
 * Launches a fresh Chromium, loads the model cold, then runs a battery of
 * graded questions, measuring:
 *   - model load time (download + compile)
 *   - time to first visible answer token (includes thinking phase)
 *   - total generation time
 *   - tokens/sec (sampled from the app's own tps indicator during generation)
 *   - grading: required substrings, forbidden substrings (tag leaks, CV echo)
 *
 * Usage: node scripts/chat-eval.mjs [baseUrl]   (default http://localhost:9124)
 */
import { chromium } from '@playwright/test';

const BASE = process.argv[2] || 'http://localhost:9124';
const LOAD_TIMEOUT_MS = 5 * 60 * 1000;
const GEN_TIMEOUT_MS = 180 * 1000;
const GLOBAL_FORBIDDEN = ['<think', '</think', '<experience>', '<personal>'];

const CASES = [
  {
    id: 'current-role',
    q: "what's Alex's current role?",
    expectAny: ['perch insights', 'senior ai engineer'],
  },
  {
    id: 'multi-turn-prev-company',
    q: 'and which company did he work at before that?',
    // Influize (2023-2024) is the natural answer; the CV also lists an
    // overlapping Freelance engagement (2022-Present), so accept either.
    expectAny: ['influize', 'freelance'],
  },
  {
    id: 'education',
    q: 'where did Alex study?',
    expectAny: ['stony brook'],
  },
  {
    id: 'synthesis-ai-ml',
    q: 'what AI/ML experience does he have?',
    expectAny: ['musiio', 'perch', 'llm', 'machine learning'],
  },
  {
    id: 'skill-positive',
    // Guards must not swallow answerable skill questions: Python IS in the CV,
    // so the canned "not in Alex's CV" refusal here is a failure.
    q: 'does Alex know Python?',
    expectAny: ['yes', 'python'],
    forbidden: ["that's not in alex's cv"],
  },
  {
    id: 'refusal-off-topic',
    q: "what's the capital of France?",
    expectAny: ["not in alex's cv"],
    forbidden: ['paris is the capital'],
  },
  {
    id: 'hallucination-probe',
    q: 'does Alex know COBOL?',
    expectAny: ["not in alex's cv", 'no ', 'not '],
    forbidden: ['yes, alex knows cobol'],
  },
];

const now = () => Date.now();

async function assistantAnswers(page) {
  return page.$$eval('.chat-message.assistant .message-content', els =>
    els.map(el => {
      const clone = el.cloneNode(true);
      // strip the collapsible thinking block and timestamp so we grade only
      // the answer text
      clone
        .querySelectorAll(
          '[class*="thinking"], [class*="Thinking"], .message-timestamp'
        )
        .forEach(n => n.remove());
      return clone.textContent || '';
    })
  );
}

async function main() {
  // WebGPU needs a full browser (installed Chrome, or Chromium via
  // `playwright install chromium`) — the default headless shell has no GPU.
  const headless = process.env.EVAL_HEADED !== '1';
  const launchOpts = { headless, args: ['--enable-unsafe-webgpu'] };
  const browser = await chromium
    .launch({ ...launchOpts, channel: 'chrome' })
    .catch(() => chromium.launch({ ...launchOpts, channel: 'chromium' }))
    .catch(() => chromium.launch(launchOpts));
  const page = await browser.newPage();
  if (process.env.EVAL_DEBUG === '1') {
    page.on('console', msg => {
      const t = msg.text();
      if (/worker-dbg|stalled|error/i.test(t))
        console.log(`  [console ${new Date().toISOString().slice(14, 23)}]`, t.slice(0, 160));
    });
  }
  const results = { base: BASE, device: null, loadMs: null, cases: [] };

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Open chat' }).click();

  // --- model load ---
  const t0 = now();
  await page.getByRole('button', { name: /^download .* model$/i }).click();
  const loadingText = page.locator('.loading-message');
  try {
    await loadingText.waitFor({ state: 'visible', timeout: 15000 });
    results.device = /wasm/i.test((await loadingText.textContent()) || '')
      ? 'wasm'
      : 'webgpu';
  } catch {
    results.device = 'unknown';
  }
  await page
    .getByPlaceholder('ask about Alex...')
    .waitFor({ state: 'visible', timeout: LOAD_TIMEOUT_MS });
  await page.waitForFunction(
    () => !document.querySelector('input.chat-input[disabled], textarea[disabled]'),
    { timeout: LOAD_TIMEOUT_MS }
  );
  results.loadMs = now() - t0;
  console.log(`model loaded on ${results.device} in ${(results.loadMs / 1000).toFixed(1)}s`);

  // --- question battery ---
  for (const c of CASES) {
    const before = (await assistantAnswers(page)).length;
    const input = page.getByPlaceholder('ask about Alex...');
    await input.fill(c.q);
    const tSend = now();
    await page.getByRole('button', { name: 'Send message' }).click();

    let ttfaMs = null;
    let answer = '';
    let lastLen = -1;
    let stableSince = null;
    const tpsSamples = [];

    while (now() - tSend < GEN_TIMEOUT_MS) {
      const tps = await page
        .locator('.chat-tps-indicator')
        .textContent({ timeout: 100 })
        .catch(() => null);
      if (tps) {
        const m = tps.match(/([\d.]+)\s*tok\/s/);
        if (m) tpsSamples.push(parseFloat(m[1]));
      }
      const answers = await assistantAnswers(page);
      const current = (answers[before] || '').trim();
      if (current && ttfaMs === null) ttfaMs = now() - tSend;
      if (current.length !== lastLen) {
        lastLen = current.length;
        stableSince = now();
      }
      const generating = await page
        .locator('.chat-tps-indicator, .loading-dots')
        .first()
        .isVisible()
        .catch(() => false);
      if (current && !generating && stableSince && now() - stableSince > 2000) {
        answer = current;
        break;
      }
      await page.waitForTimeout(400);
    }
    const totalMs = now() - tSend;
    const lower = answer.toLowerCase();
    const passExpect = c.expectAny.some(s => lower.includes(s.toLowerCase()));
    const forbidden = [...GLOBAL_FORBIDDEN, ...(c.forbidden || [])];
    const leak = forbidden.filter(s => lower.includes(s.toLowerCase()));
    const tpsMax = tpsSamples.length ? Math.max(...tpsSamples) : null;

    results.cases.push({
      id: c.id,
      q: c.q,
      pass: passExpect && leak.length === 0 && !!answer,
      grounded: passExpect,
      leaks: leak,
      ttfaMs,
      totalMs,
      tpsMax,
      answer: answer.slice(0, 400),
    });
    console.log(
      `[${passExpect && leak.length === 0 && answer ? 'PASS' : 'FAIL'}] ${c.id} ` +
        `ttfa=${ttfaMs ? (ttfaMs / 1000).toFixed(1) : '?'}s ` +
        `total=${(totalMs / 1000).toFixed(1)}s ` +
        `tps=${tpsMax ?? '?'} :: ${answer.slice(0, 120).replace(/\n/g, ' ')}`
    );
  }

  await browser.close();

  const passed = results.cases.filter(c => c.pass).length;
  console.log(`\n=== ${passed}/${results.cases.length} passed ===`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
