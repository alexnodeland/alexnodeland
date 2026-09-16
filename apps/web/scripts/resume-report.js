#!/usr/bin/env node
/**
 * What a resume variant looks like to the software that reads it first.
 *
 * Two questions, neither of which the source can answer:
 *
 *   Did it parse? `scripts/check-cv-text.js` proves the words survive
 *   extraction. This goes a step further and runs OpenResume's parser, which
 *   turns a PDF into *fields* — name, email, one record per job with its dates.
 *   A document whose every line is intact can still hand an employer the wrong
 *   date range, and only a field-level parse shows it.
 *
 *   Does it say what the postings ask for? Given a corpus of real job
 *   descriptions in `jd-corpus/`, this reports the terms that come up across
 *   them and appear nowhere in the variant. It is a gap list, not a score —
 *   what to consider adding *if it is true*, never a target to optimise.
 *
 * Deliberately not in CI. The parse check that gates the build is the
 * deterministic one; this needs a network clone on first run, and a keyword gap
 * is a judgement call rather than a pass or a fail.
 *
 * Usage:
 *   node scripts/resume-report.js               # every variant
 *   node scripts/resume-report.js fde           # one of them
 *   node scripts/resume-report.js --keywords    # the gap report alone
 */

const fs = require('fs');
const path = require('path');

const { ROOT, OUT_DIR, cvTargets } = require('./lib/cv-targets.js');
const { ensureClone, parseResumePdf } = require('./lib/openresume.js');

const JD_DIR = path.join(ROOT, 'jd-corpus');

/**
 * Terms that mean the same thing to a reader and different things to a string
 * comparison. Each group collapses to its first member, so a posting asking for
 * "k8s" and a resume saying "Kubernetes" are not reported as a gap.
 */
const SYNONYMS = [
  ['kubernetes', 'k8s'],
  ['llm', 'llms', 'large language model', 'large language models'],
  ['evals', 'eval', 'evaluation', 'evaluations'],
  ['rag', 'retrieval augmented generation', 'retrieval-augmented generation'],
  ['ci/cd', 'cicd', 'ci cd', 'continuous integration'],
  ['postgresql', 'postgres'],
  ['typescript', 'ts'],
  ['javascript', 'js'],
  ['infrastructure as code', 'iac', 'terraform', 'cloudformation'],
  ['observability', 'monitoring', 'telemetry'],
  ['vector search', 'vector database', 'vector db', 'embeddings'],
  ['agents', 'agent', 'agentic'],
  ['aws', 'amazon web services'],
  ['gcp', 'google cloud'],
];

/** Words too common to be evidence of anything. */
const STOPWORDS = new Set(
  `a an the and or but if then else for of to in on at by with from as is are was
   were be been being do does did have has had will would shall should can could
   may might must you your we our they their he she it its this that these those
   not no yes all any each more most other some such only own same so than too
   very just about into over under again further once here there when where why
   how what which who whom
   experience experienced work working works team teams role roles year years
   strong excellent ability able across within using use used help helps new
   including include includes well good great high highly plus etc via`
    .split(/\s+/)
    .filter(Boolean)
);

const normalise = text =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Collapses every synonym in `text` onto its group's first member. */
const canonicalise = text => {
  let result = normalise(text);
  for (const group of SYNONYMS) {
    for (const alias of group.slice(1)) {
      result = result.split(alias).join(group[0]);
    }
  }
  return result;
};

// --- the parse check -------------------------------------------------------

const parseReport = async target => {
  const pdf = path.join(OUT_DIR, `${target.name}.pdf`);
  if (!fs.existsSync(pdf)) {
    console.log(
      `  ${path.relative(ROOT, pdf)} was never built — run npm run build:cv`
    );
    return;
  }

  const parsed = await parseResumePdf(pdf);
  const { profile, workExperiences, educations, skills } = parsed;
  const expected = target.data;

  console.log(`  name     ${profile.name || '— not found'}`);
  console.log(`  email    ${profile.email || '— not found'}`);
  console.log(
    `  jobs     ${workExperiences.length} parsed, ${expected.experience.length} in the source`
  );

  // The date is the field that goes wrong quietly: it can attach to the entry
  // below its own and still look like a valid CV.
  for (const role of expected.experience) {
    const entry = `${role.title}, ${role.company}`;
    const match = workExperiences.find(w =>
      [w.company, w.jobTitle].some(field => field && entry.startsWith(field))
    );
    if (!match) {
      console.log(`    ✗ "${entry}" was not recognised as a job entry`);
    } else if (
      !match.date ||
      !role.duration.startsWith(match.date.slice(0, 4))
    ) {
      console.log(
        `    ✗ "${entry}" parsed with date ${JSON.stringify(match.date)},` +
          ` source says ${JSON.stringify(role.duration)}`
      );
    }
  }

  console.log(
    `  schools  ${
      educations
        .map(e => e.school)
        .filter(Boolean)
        .join(', ') || '— none recognised'
    }`
  );
  const descriptions = (skills && skills.descriptions) || [];
  console.log(`  skills   ${descriptions.length} line(s) recognised`);
};

// --- the keyword gap -------------------------------------------------------

/** Every posting in `jd-corpus/`, as canonicalised text. */
const loadCorpus = () => {
  if (!fs.existsSync(JD_DIR)) return [];
  return (
    fs
      .readdirSync(JD_DIR)
      // The directory's own README is instructions, not a posting.
      .filter(name => /\.(md|txt)$/.test(name) && !/^readme\./i.test(name))
      .map(name => ({
        name,
        text: canonicalise(fs.readFileSync(path.join(JD_DIR, name), 'utf8')),
      }))
  );
};

/**
 * Terms common across the corpus and absent from `resumeText`.
 *
 * Unigrams and bigrams, ranked by how many separate postings ask for them —
 * a term in twelve of twenty postings is worth a sentence, a term in one is
 * that company's vocabulary.
 */
const keywordGap = (corpus, resumeText) => {
  const documentCount = new Map();

  for (const posting of corpus) {
    const words = posting.text.split(' ').filter(w => w && !STOPWORDS.has(w));
    const terms = new Set(words);
    for (let i = 0; i < words.length - 1; i++) {
      terms.add(`${words[i]} ${words[i + 1]}`);
    }
    for (const term of terms) {
      if (term.length < 3) continue;
      documentCount.set(term, (documentCount.get(term) || 0) + 1);
    }
  }

  const resume = canonicalise(resumeText);
  const threshold = Math.max(2, Math.ceil(corpus.length * 0.25));

  return [...documentCount.entries()]
    .filter(([term, count]) => count >= threshold && !resume.includes(term))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25);
};

const keywordReport = (target, corpus) => {
  if (corpus.length === 0) {
    console.log(
      `  no postings in ${path.relative(ROOT, JD_DIR)}/ — drop a few real` +
        ' job descriptions in as .md and run this again'
    );
    return;
  }

  // The parsed text, not the source: the gap that matters is against what a
  // reader actually receives.
  const { spawnSync } = require('child_process');
  const pdf = path.join(OUT_DIR, `${target.name}.pdf`);
  const text = spawnSync('pdftotext', [pdf, '-'], { encoding: 'utf8' }).stdout;

  const gaps = keywordGap(corpus, text || '');
  if (gaps.length === 0) {
    console.log(`  nothing common to ${corpus.length} postings is missing`);
    return;
  }

  console.log(`  missing, of ${corpus.length} postings:`);
  for (const [term, count] of gaps) {
    console.log(`    ${String(count).padStart(3)}×  ${term}`);
  }
  console.log(
    '  Add only what is true of work already described above — this is a' +
      ' prompt to check, not a list to paste.'
  );
};

// --- driver ----------------------------------------------------------------

const main = async () => {
  const args = process.argv.slice(2);
  const only = args.filter(a => !a.startsWith('--'));
  const keywordsOnly = args.includes('--keywords');

  const targets = cvTargets().filter(
    t => only.length === 0 || only.includes(t.variant)
  );
  if (targets.length === 0) {
    console.error(`resume-report: no variant matches ${only.join(', ')}`);
    process.exit(1);
  }

  const corpus = loadCorpus();
  const parserReady = keywordsOnly ? false : ensureClone();
  if (!keywordsOnly && !parserReady) {
    console.warn(
      'resume-report: the OpenResume parser is unavailable — reporting keywords only.\n'
    );
  }

  for (const target of targets) {
    console.log(`\n${target.variant}`);
    if (parserReady) await parseReport(target);
    keywordReport(target, corpus);
  }
};

main().catch(error => {
  console.error(`resume-report: ${error.message}`);
  process.exit(1);
});
