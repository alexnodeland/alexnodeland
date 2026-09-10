#!/usr/bin/env node
/**
 * Orchestrates eval runs and writes analysis-ready output.
 *
 * `chat-eval.mjs` grades one configuration once. Everything around that — is
 * the production build current, is a server up, run it for three models, run
 * each three times because a single run moves by about a case either way,
 * collect it all into something you can open in a notebook — was being done by
 * hand, badly, and several ten-minute runs were lost to a mistyped shell loop.
 * That is this script's whole job.
 *
 * Two things it deliberately owns:
 *
 *   - **The server.** It reuses one that is already listening and otherwise
 *     starts its own, and it only tears down what it started. Evals against a
 *     stale `public/` are worse than no evals, so `--build` rebuilds first.
 *   - **Repetition.** `--repeat` exists because the objective moves ~±0.015
 *     between identical runs. Optimising against a single sample chases noise;
 *     the summary reports mean and spread so a change can be judged against it.
 *
 * Usage:
 *   node scripts/eval-run.mjs                          one run, default model
 *   node scripts/eval-run.mjs --repeat 3               three runs, averaged
 *   node scripts/eval-run.mjs --models lfm-1.2b,other  a batch across models
 *   node scripts/eval-run.mjs --build --format csv     rebuild first, CSV out
 *   node scripts/eval-run.mjs --baseline .eval/baseline.json   gate on a diff
 */
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 9124;
const BASE = `http://localhost:${PORT}`;

const argv = process.argv.slice(2);
const flags = new Map();
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  if (next !== undefined && !next.startsWith('--')) {
    flags.set(argv[i].slice(2), next);
    i++;
  } else {
    flags.set(argv[i].slice(2), 'true');
  }
}
const flag = (name, fallback = null) =>
  flags.has(name) ? flags.get(name) : fallback;

const REPEAT = Number(flag('repeat', 1));
const MODELS = String(flag('models', ''))
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
/** '' means "whatever chatConfig defaults to" — one unnamed job. */
const JOBS = MODELS.length ? MODELS : [''];
const FORMAT = String(flag('format', 'both')); // csv | json | both
const BASELINE = flag('baseline');
const SHOULD_BUILD = flags.has('build');
const OUT_DIR = path.resolve(
  ROOT,
  flag('out-dir', `.eval/runs/${stamp()}`)
);

function stamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

const log = (...a) => console.log('[eval-run]', ...a);

async function serverIsUp() {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Returns a teardown function — a no-op when an existing server was reused. */
async function ensureServer() {
  if (await serverIsUp()) {
    log(`reusing the server already listening on ${PORT}`);
    return () => {};
  }

  log(`starting gatsby serve on ${PORT}`);
  const child = spawn('npx', ['gatsby', 'serve', '-p', String(PORT)], {
    cwd: ROOT,
    stdio: 'ignore',
    detached: false,
  });

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (await serverIsUp()) {
      log('server ready');
      return () => {
        log('stopping the server this run started');
        try {
          child.kill('SIGTERM');
        } catch {
          /* already gone */
        }
      };
    }
  }
  child.kill('SIGTERM');
  throw new Error(`server did not come up on ${PORT} within 60s`);
}

/** One graded run. Returns the parsed artifact. */
function runOnce(model, repIndex) {
  const label = `${model || 'default'}#${repIndex + 1}`;
  const out = path.join(OUT_DIR, `raw-${model || 'default'}-${repIndex + 1}.json`);
  log(`running ${label}`);

  const res = spawnSync(
    'node',
    [path.join(ROOT, 'scripts/chat-eval.mjs'), BASE, '--out', out],
    {
      cwd: ROOT,
      // Inherited so a long run still shows per-case progress rather than
      // going silent for ten minutes.
      stdio: ['ignore', 'inherit', 'inherit'],
      env: model ? { ...process.env, EVAL_MODEL: model } : process.env,
    }
  );

  if (!fs.existsSync(out)) {
    log(`${label} produced no artifact (exit ${res.status}) — skipping`);
    return null;
  }
  const parsed = JSON.parse(fs.readFileSync(out, 'utf8'));
  parsed.$model = model || 'default';
  parsed.$rep = repIndex + 1;
  return parsed;
}

/** Long-format table: one row per case per run. The shape a notebook wants —
 *  group by whatever you like, and `pandas.read_csv(...).to_parquet(...)` is a
 *  one-liner away if you need columnar. */
function toCsv(runs) {
  const cols = [
    'model',
    'rep',
    'case_id',
    'category',
    'score',
    'pass',
    'ttfa_ms',
    'total_ms',
    'retrieval_ms',
    'prefill_ms',
    'decode_ms',
    'prompt_tokens',
    'output_tokens',
    'kv_hit',
    'sources',
    'critique',
    'answer',
  ];
  const esc = v => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = [cols.join(',')];
  for (const run of runs) {
    for (const c of run.cases) {
      const t = c.timing || {};
      rows.push(
        [
          run.$model,
          run.$rep,
          c.id,
          c.category ?? '',
          c.score ?? '',
          c.pass ? 1 : 0,
          c.ttfaMs ?? '',
          c.totalMs ?? '',
          t.retrievalMs ?? '',
          t.prefillMs ?? '',
          t.decodeMs ?? '',
          t.promptTokens ?? '',
          t.outputTokens ?? '',
          t.systemKvHit === undefined ? '' : t.systemKvHit ? 1 : 0,
          (c.sources || []).length,
          (c.critique || []).join(' | '),
          (c.answer || '').replace(/\s+/g, ' ').slice(0, 300),
        ]
          .map(esc)
          .join(',')
      );
    }
  }
  return rows.join('\n');
}

const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stdev = xs => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)));
};

/** Aggregates repeats per model, and per case across repeats. */
function summarise(runs) {
  const byModel = new Map();
  for (const run of runs) {
    const row = byModel.get(run.$model) || { objectives: [], passed: [], runs: [] };
    row.objectives.push(run.objective);
    row.passed.push(run.passed);
    row.runs.push(run);
    byModel.set(run.$model, row);
  }

  const models = [];
  for (const [model, row] of byModel) {
    // Per-case mean across repeats — the stable per-case signal, and the thing
    // to sort by when looking for what to fix next.
    const caseScores = new Map();
    for (const run of row.runs) {
      for (const c of run.cases) {
        const e = caseScores.get(c.id) || { scores: [], category: c.category };
        e.scores.push(c.score ?? 0);
        caseScores.set(c.id, e);
      }
    }
    const cases = [...caseScores]
      .map(([id, e]) => ({
        id,
        category: e.category,
        mean: Math.round(mean(e.scores) * 1000) / 1000,
        stdev: Math.round(stdev(e.scores) * 1000) / 1000,
        n: e.scores.length,
      }))
      .sort((a, b) => a.mean - b.mean);

    const categories = {};
    for (const c of cases) {
      const k = c.category || 'uncategorised';
      categories[k] = categories[k] || [];
      categories[k].push(c.mean);
    }

    models.push({
      model,
      reps: row.objectives.length,
      objective: Math.round(mean(row.objectives) * 1000) / 1000,
      objectiveStdev: Math.round(stdev(row.objectives) * 1000) / 1000,
      passed: Math.round(mean(row.passed) * 10) / 10,
      total: row.runs[0]?.cases.length ?? 0,
      categories: Object.fromEntries(
        Object.entries(categories).map(([k, v]) => [
          k,
          Math.round(mean(v) * 1000) / 1000,
        ])
      ),
      weakest: cases.slice(0, 8),
    });
  }
  return { models };
}

/** Summarises and writes every requested format. Returns the summary. */
function writeOutputs(runs, dir = OUT_DIR) {
  const summary = summarise(runs);
  try {
    fs.mkdirSync(dir, { recursive: true });
    if (FORMAT === 'json' || FORMAT === 'both') {
      fs.writeFileSync(
        path.join(dir, 'summary.json'),
        JSON.stringify({ summary, runs }, null, 2)
      );
    }
    if (FORMAT === 'csv' || FORMAT === 'both') {
      fs.writeFileSync(path.join(dir, 'cases.csv'), toCsv(runs));
    }
  } catch (e) {
    log(`could not write outputs: ${e.message}`);
  }
  return summary;
}

function printSummary(summary) {
  for (const m of summary.models) {
    console.log(
      `\n=== ${m.model} — objective ${m.objective.toFixed(3)}` +
        (m.reps > 1 ? ` ±${m.objectiveStdev.toFixed(3)} over ${m.reps} runs` : '') +
        ` | ${m.passed}/${m.total} passed ===`
    );
    for (const [cat, score] of Object.entries(m.categories).sort(
      (a, b) => a[1] - b[1]
    )) {
      console.log(`  ${cat.padEnd(14)} ${score.toFixed(2)}`);
    }
    console.log('  weakest cases:');
    for (const c of m.weakest) {
      if (c.mean >= 1) break;
      const spread = c.n > 1 ? ` ±${c.stdev.toFixed(2)}` : '';
      console.log(`    ${c.mean.toFixed(2)}${spread}  ${c.id}  (${c.category})`);
    }
  }
}

/** Everything finished so far, so a signal handler can flush it. */
let COMPLETED = [];

// A batch is minutes to over an hour. Being killed — Ctrl-C, a CI timeout, a
// harness tearing down the process group — should cost the run in progress,
// not every run before it.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    if (COMPLETED.length) {
      log(`caught ${signal} — flushing ${COMPLETED.length} completed run(s)`);
      writeOutputs(COMPLETED);
    }
    process.exit(130);
  });
}

/**
 * Rebuilds the summary and CSV from raw artifacts already on disk.
 *
 * Aggregation is deliberately separable from execution. Each graded run writes
 * its own complete `raw-*.json` as it goes, so if the orchestrator dies — and
 * it can die in ways no handler catches — nothing measured is lost, and this
 * recovers the reports in about a second without touching a browser.
 */
function reportOnly(dir) {
  const runs = fs
    .readdirSync(dir)
    .filter(f => f.startsWith('raw-') && f.endsWith('.json'))
    .sort()
    .map(f => {
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      // raw-<model>-<rep>.json
      const m = f.replace(/^raw-/, '').replace(/\.json$/, '');
      const rep = Number(m.slice(m.lastIndexOf('-') + 1)) || 1;
      parsed.$model = parsed.$model ?? m.slice(0, m.lastIndexOf('-'));
      parsed.$rep = parsed.$rep ?? rep;
      return parsed;
    });

  if (!runs.length) throw new Error(`no raw-*.json artifacts in ${dir}`);
  log(`aggregating ${runs.length} run(s) from ${path.relative(ROOT, dir)}`);
  const summary = writeOutputs(runs, dir);
  printSummary(summary);
  console.log(`\nwrote ${path.relative(ROOT, dir)}/`);
  if (BASELINE) compare(summary, path.resolve(ROOT, BASELINE));
}

async function main() {
  const reportDir = flag('report');
  if (reportDir) return reportOnly(path.resolve(ROOT, reportDir));

  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (SHOULD_BUILD) {
    log('rebuilding (worker + index + site)');
    const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('build failed');
  }

  const stopServer = await ensureServer();
  const runs = [];
  try {
    for (const model of JOBS) {
      for (let rep = 0; rep < REPEAT; rep++) {
        const result = runOnce(model, rep);
        if (result) {
          runs.push(result);
          COMPLETED = runs;
        }
        // Flush after every completed run. A three-model × three-repeat batch
        // is over an hour, and writing only at the end means an interruption
        // at the last run throws away all nine.
        if (runs.length) writeOutputs(runs);
      }
    }
  } finally {
    stopServer();
  }

  if (!runs.length) throw new Error('every run failed to produce an artifact');

  const summary = writeOutputs(runs);
  printSummary(summary);
  console.log(`\nwrote ${path.relative(ROOT, OUT_DIR)}/`);

  if (BASELINE) {
    compare(summary, path.resolve(ROOT, BASELINE));
  }
}

/** Gates the run against a stored summary. Exit 1 on a real drop. */
function compare(summary, baselinePath) {
  let base;
  try {
    const raw = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    base = raw.summary ?? raw;
  } catch (e) {
    log(`baseline ${baselinePath} unreadable (${e.message}) — not gating`);
    return;
  }

  for (const m of summary.models) {
    const prev =
      base.models?.find(x => x.model === m.model) ??
      // A single-run chat-eval artifact, promoted straight to a baseline.
      (base.objective !== undefined ? { objective: base.objective } : null);
    if (!prev) continue;

    const delta = m.objective - prev.objective;
    const sign = delta >= 0 ? '+' : '';
    // Tolerance scales with observed run-to-run spread rather than being a
    // fixed guess: a noisy configuration should need a bigger move to count.
    const tolerance = Math.max(0.02, m.objectiveStdev * 2);
    console.log(
      `\n${m.model}: ${prev.objective.toFixed(3)} -> ${m.objective.toFixed(3)} ` +
        `(${sign}${delta.toFixed(3)}, tolerance ${tolerance.toFixed(3)})`
    );
    if (delta < -tolerance) {
      console.log('REGRESSION');
      process.exitCode = 1;
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
