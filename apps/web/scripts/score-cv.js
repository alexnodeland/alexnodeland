#!/usr/bin/env node
/**
 * Scores each CV PDF for how well a machine reads it and how well it answers
 * the role profiles in `role-profiles/`, and holds the scores to a baseline.
 *
 * `check-cv-text.js` is the pass-or-fail half: the text layer is sound or the
 * build is red. This is the signal half. It measures three things that have
 * no right answer, only better and worse, and reports them so a change to a
 * bullet can be judged by its effect rather than by taste:
 *
 *   parseability — of the fields OpenResume is expected to recover from the
 *     PDF (name, email, each job with its dates, each school, the skills),
 *     the share it did.
 *
 *   keywords — of the lexicon terms the family's profiles ask for, weighted
 *     by how many profiles ask, the share the extracted text covers. What a
 *     keyword filter sees.
 *
 *   semantic — for every requirement line in the family's profiles, the
 *     cosine between its embedding and the nearest resume line's; the mean
 *     across requirements is the score. What a reader sees, roughly.
 *
 * A role variant is scored against the family of the same name (fde against
 * `role-profiles/fde/`); a document with no family of its own is scored
 * against all of them.
 *
 * With `--baseline`, a score that falls below `cv-scores.baseline.json` by
 * more than its tolerance fails the run. The baseline is what the documents
 * scored the last time someone decided the numbers were right, and
 * `--update-baseline` is how that decision is recorded. A change that lowers
 * a score is not necessarily wrong — it is a change that has to say so.
 *
 * Usage:
 *   node scripts/score-cv.js                     # score, print a table
 *   node scripts/score-cv.js --build             # typeset first
 *   node scripts/score-cv.js --baseline          # and fail on a regression
 *   node scripts/score-cv.js --update-baseline   # record these scores
 *   node scripts/score-cv.js --verbose           # the missing terms and the
 *                                                # weakest requirements too
 *
 * Writes `.eval/cv-scores.json` and, when GITHUB_STEP_SUMMARY is set, the
 * Markdown table to it.
 */

const fs = require('fs');
const path = require('path');

const { ROOT, OUT_DIR, cvTargets } = require('./lib/cv-targets.js');
const { ensureClone, parseResumePdf } = require('./lib/openresume.js');
const { have, extractText, run } = require('./lib/cv-text.js');
const score = require('./lib/cv-score.js');

const PROFILES_DIR = path.join(ROOT, 'role-profiles');
const BASELINE = path.join(ROOT, 'cv-scores.baseline.json');
const OUTPUT = path.join(ROOT, '.eval', 'cv-scores.json');

/**
 * A requirement at or above this cosine is counted as covered in the
 * reported coverage figure. Calibrated on the first run: requirements that
 * a bullet plainly answers sit above it, and generic ones ("clear
 * communication") sit below, so the figure reads as "requirements a line on
 * the page speaks to".
 */
const THRESHOLD = 0.7;

const round = value => Math.round(value * 1000) / 1000;
const pct = value => `${(value * 100).toFixed(1)}%`;

// --- inputs ----------------------------------------------------------------

/** Every family in `role-profiles/`, with its profiles parsed. */
const loadFamilies = () =>
  fs
    .readdirSync(PROFILES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
    .map(family => {
      const dir = path.join(PROFILES_DIR, family);
      const profiles = fs
        .readdirSync(dir)
        .filter(name => name.endsWith('.md'))
        .sort()
        .map(name => ({
          id: name.replace(/\.md$/, ''),
          ...score.parseProfile(fs.readFileSync(path.join(dir, name), 'utf8')),
        }));
      return { family, profiles };
    });

const loadLexicon = () =>
  score.compileLexicon(
    JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, 'lexicon.json'), 'utf8'))
  );

/** The embedder the chat index uses, so the two agree on what "close" is. */
const loadEmbedder = async () => {
  await import('./lib/transformers-env.mjs');
  const { pipeline } = await import('@huggingface/transformers');
  const { EMBEDDING_MODEL } = await import('../src/config/retrieval.mjs');
  const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, {
    dtype: 'q8',
  });
  return async texts => {
    // BGE is trained with CLS pooling. Both sides are embedded bare: this is
    // sentence-to-sentence similarity, not a query against passages.
    const output = await extractor(texts, { pooling: 'cls', normalize: true });
    const dim = output.dims[output.dims.length - 1];
    const flat = Float32Array.from(output.data);
    return texts.map((_, i) => flat.subarray(i * dim, (i + 1) * dim));
  };
};

// --- scoring ---------------------------------------------------------------

const scoreVariant = async (target, families, lexicon, embed, parserReady) => {
  const pdf = path.join(OUT_DIR, `${target.name}.pdf`);
  if (!fs.existsSync(pdf)) {
    throw new Error(
      `${path.relative(ROOT, pdf)} was never built — run npm run build:cv`
    );
  }

  const result = { families: {} };

  if (parserReady) {
    const parsed = await parseResumePdf(pdf);
    const parseability = score.parseabilityOf(parsed, target.data);
    result.parseability = round(parseability.score);
    result.parseabilityChecks = parseability.checks;
  }

  const text = extractText(pdf);
  const units = score.resumeUnits(target.data);
  const unitVectors = await embed(units);

  // A variant with a family of its own is measured against that family
  // alone; the neutral documents are measured against every family.
  const own = families.filter(f => f.family === target.variant);
  for (const { family, profiles, requirementVectors, frequency } of own.length
    ? own
    : families) {
    const keywords = score.keywordCoverage(text, frequency, lexicon);
    const semantic = score.semanticCoverage(
      requirementVectors,
      unitVectors,
      THRESHOLD
    );

    // The requirements least answered by any line, for the verbose report.
    const requirements = profiles.flatMap(profile =>
      score.requirementsOf(profile).map(text => ({ profile: profile.id, text }))
    );
    const weakest = semantic.nearest
      .map((value, i) => ({ ...requirements[i], cosine: round(value) }))
      .sort((a, b) => a.cosine - b.cosine)
      .slice(0, 8);

    result.families[family] = {
      keywords: round(keywords.score),
      semantic: round(semantic.score),
      semanticCoverage: round(semantic.coverage),
      missing: keywords.missing.slice(0, 12),
      weakest,
    };
  }

  return result;
};

// --- reporting -------------------------------------------------------------

const delta = (now, was) => {
  if (typeof was !== 'number') return ' (new)';
  const diff = now - was;
  if (Math.abs(diff) < 0.0005) return '';
  return ` (${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)})`;
};

/** The scores as a Markdown table, with the change against the baseline. */
const markdown = (scores, baseline, families, verbose) => {
  const lines = [];
  lines.push(
    '| document | parseability | family | keywords | semantic (mean) | requirements ≥ ' +
      THRESHOLD +
      ' |'
  );
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const [variant, now] of Object.entries(scores)) {
    const was = baseline[variant] || {};
    const familyNames = Object.keys(now.families);
    familyNames.forEach((family, i) => {
      const nowFamily = now.families[family];
      const wasFamily = (was.families || {})[family] || {};
      lines.push(
        `| ${i === 0 ? `**${variant}**` : ''} ` +
          `| ${i === 0 && typeof now.parseability === 'number' ? pct(now.parseability) + delta(now.parseability, was.parseability) : i === 0 ? '—' : ''} ` +
          `| ${family} ` +
          `| ${pct(nowFamily.keywords)}${delta(nowFamily.keywords, wasFamily.keywords)} ` +
          `| ${nowFamily.semantic.toFixed(3)}${delta(nowFamily.semantic, wasFamily.semantic)} ` +
          `| ${pct(nowFamily.semanticCoverage)} |`
      );
    });
  }
  lines.push('');
  lines.push(
    `Profiles: ${families.map(f => `${f.family} ${f.profiles.length}`).join(', ')}. ` +
      'Parenthesised figures are the change against the baseline, in points.'
  );

  if (verbose) {
    for (const [variant, now] of Object.entries(scores)) {
      for (const [family, f] of Object.entries(now.families)) {
        lines.push(
          '',
          `<details><summary>${variant} against ${family}</summary>`,
          ''
        );
        lines.push(
          'Terms the profiles ask for that the document does not name:',
          ''
        );
        for (const { term, profiles } of f.missing) {
          lines.push(`- ${term} (${profiles} profiles)`);
        }
        lines.push('', 'Requirements no line comes close to:', '');
        for (const { profile, text, cosine } of f.weakest) {
          lines.push(`- ${cosine.toFixed(3)} · ${profile}: ${text}`);
        }
        lines.push('', '</details>');
      }
      if (now.parseabilityChecks) {
        const failed = now.parseabilityChecks.filter(c => !c.ok);
        if (failed.length) {
          lines.push('', `Fields not recovered from ${variant}:`, '');
          for (const c of failed)
            lines.push(`- ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
        }
      }
    }
  }
  return lines.join('\n');
};

/** The baseline's shape: scores only, no reports. */
const forBaseline = scores =>
  Object.fromEntries(
    Object.entries(scores).map(([variant, now]) => [
      variant,
      {
        parseability: now.parseability,
        families: Object.fromEntries(
          Object.entries(now.families).map(([family, f]) => [
            family,
            { keywords: f.keywords, semantic: f.semantic },
          ])
        ),
      },
    ])
  );

// --- driver ----------------------------------------------------------------

const main = async () => {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter(a => a.startsWith('--')));
  const only = args.filter(a => !a.startsWith('--'));

  if (!have('pdftotext')) {
    console.error(
      'score-cv: pdftotext not found (brew install poppler / apt-get install poppler-utils)'
    );
    process.exit(1);
  }
  if (flags.has('--build')) run('node', [path.join(__dirname, 'build-cv.js')]);

  const parserReady = ensureClone();
  if (!parserReady) {
    console.warn(
      'score-cv: the OpenResume parser is unavailable — parseability will not be scored'
    );
  }

  const lexicon = loadLexicon();
  const embed = await loadEmbedder();

  const families = loadFamilies();
  for (const entry of families) {
    entry.frequency = score.documentFrequency(entry.profiles, lexicon);
    entry.requirementVectors = await embed(
      entry.profiles.flatMap(score.requirementsOf)
    );
  }

  const targets = cvTargets().filter(
    t => only.length === 0 || only.includes(t.variant)
  );
  const scores = {};
  for (const target of targets) {
    scores[target.variant] = await scoreVariant(
      target,
      families,
      lexicon,
      embed,
      parserReady
    );
  }

  const baseline = fs.existsSync(BASELINE)
    ? JSON.parse(fs.readFileSync(BASELINE, 'utf8'))
    : {};

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(scores, null, 2) + '\n');

  const table = markdown(scores, baseline, families, flags.has('--verbose'));
  console.log('\n' + table + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## CV scores\n\n${table}\n`
    );
  }

  if (flags.has('--update-baseline')) {
    if (only.length) {
      console.error(
        'score-cv: the baseline is recorded for every document at once — drop the variant argument'
      );
      process.exit(1);
    }
    fs.writeFileSync(
      BASELINE,
      JSON.stringify(forBaseline(scores), null, 2) + '\n'
    );
    console.log(
      `score-cv: baseline written to ${path.relative(ROOT, BASELINE)}`
    );
    return;
  }

  if (flags.has('--baseline')) {
    const found = score.regressions(scores, baseline);
    if (found.length) {
      console.error('score-cv: a score fell below the baseline:');
      for (const r of found) {
        console.error(
          `  ${r.variant}${r.family ? ` against ${r.family}` : ''}: ${r.metric} ` +
            `${r.was} → ${r.now}`
        );
      }
      console.error(
        '\nIf the change is deliberate, run `npm run score:cv -- --update-baseline` and commit the result.'
      );
      process.exit(1);
    }
    console.log('score-cv: no score fell below the baseline');
  }
};

main().catch(error => {
  console.error(`score-cv: ${error.message}`);
  process.exit(1);
});
