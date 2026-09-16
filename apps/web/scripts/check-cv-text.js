#!/usr/bin/env node
/**
 * Asserts that the generated CV PDFs survive text extraction.
 *
 * A resume is read twice: once by a person, and once by whatever parses it into
 * fields. The second reader is the one that rejects you, and it sees only the
 * PDF's text layer — which is not the same thing as what the page looks like.
 * Two ways that layer has gone wrong here, both invisible on screen:
 *
 *   Small-caps headings. `\scshape` sets "Summary" as a full-size S followed by
 *   capital-shaped glyphs at lowercase size. Every extractor reads the size
 *   change as a word boundary and returns "S UMMARY". A parser looking for the
 *   standard section names finds none of them and loses every section boundary.
 *
 *   Page breaks. `pdftotext` separates pages with a form feed and puts the next
 *   page's first line immediately after it. A parser that strips control
 *   characters without substituting whitespace fuses that line onto the last
 *   line of the previous page — "Infrastructure as CodeTechnical Strategy
 *   Consultant" — and the two entries become one.
 *
 * So each variant is checked twice: once on `pdftotext` output as it comes, and
 * once with the form feeds deleted outright, which is the worst a careless
 * parser can do. Everything the source promises — every section heading, every
 * job title and company, every date range — has to start a line under both.
 *
 * Usage:
 *   node scripts/check-cv-text.js          # check what is in static/cv
 *   node scripts/check-cv-text.js --build  # build first, then check
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const {
  ROOT,
  OUT_DIR,
  loadCVConfig,
  cvTargets,
} = require('./lib/cv-targets.js');

/** The section names a parser is looking for, as the template emits them. */
const SECTIONS = ['SUMMARY', 'EXPERIENCE', 'EDUCATION', 'SKILLS'];

const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 32e6 });
  if (result.status !== 0) {
    throw new Error(`${cmd} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
};

const have = cmd => spawnSync(cmd, ['-v'], { stdio: 'ignore' }).status !== null;

/**
 * Collapses the soft line wrapping the PDF's column width imposes.
 *
 * A long job title wraps inside its own column, so "Artist in Residence, Center
 * of Excellence in Wireless Information Technology" arrives as two lines. That
 * is not the fusion this script is looking for, and treating it as a failure
 * would make the check unusable. Comparing against a space-normalised copy of
 * the whole document tells the two apart: a wrapped title is still present and
 * still starts its own line, a fused one does not start a line at all.
 */
const normalise = text => text.replace(/\s+/g, ' ').trim();

/** Does some line begin with `phrase`, allowing for a wrap inside it? */
const startsALine = (lines, phrase) => {
  const wanted = normalise(phrase);
  return lines.some(line => {
    const candidate = normalise(line);
    if (candidate.length === 0) return false;
    // Either the line carries the whole phrase, or it is the head of a phrase
    // that wrapped — in which case the line is a prefix of it.
    return candidate.startsWith(wanted) || wanted.startsWith(candidate);
  });
};

/**
 * Every assertion for one extraction of one document.
 *
 * @returns {string[]} the failures, empty when the text layer is sound
 */
const checkText = (text, target) => {
  const failures = [];
  const lines = text.split('\n');
  const flat = normalise(text);

  for (const heading of SECTIONS) {
    if (!lines.some(line => normalise(line) === heading)) {
      failures.push(`section heading "${heading}" does not start a line`);
    }
  }

  if (target.data.projects && target.data.projects.length > 0) {
    if (!lines.some(line => normalise(line) === 'PROJECTS')) {
      failures.push('section heading "PROJECTS" does not start a line');
    }
  }

  for (const role of target.data.experience) {
    const entry = `${role.title}, ${role.company}`;

    if (!flat.includes(normalise(entry))) {
      failures.push(`job entry "${entry}" is missing or fused`);
      continue;
    }
    if (!startsALine(lines, entry)) {
      failures.push(`job entry "${entry}" does not start a line`);
    }
  }

  // Every date has to land inside its own entry: after that entry's title and
  // before whatever comes next — the next job's title, or the next section.
  //
  // That span, rather than "on or just under the title", is what a field
  // parser actually depends on: it reads top to bottom and hands a date to the
  // last title it saw. The right-aligned dates on the one-pagers show why the
  // distinction matters. In pdftotext's reflow mode the wide gap before a date
  // splits it into a block of its own, and for some entries that block is read
  // after the bullets — title, bullets, date. Still correctly attributed, and
  // OpenResume parses it so. What must fail is a date that crosses into the
  // next entry, because the result is a CV that looks valid and says the wrong
  // thing.
  const lineOf = role =>
    lines.findIndex(line =>
      normalise(line).startsWith(
        normalise(`${role.title}, ${role.company}`).slice(0, 40)
      )
    );
  const boundaries = [
    ...target.data.experience.map(lineOf),
    ...lines
      .map((line, index) =>
        [...SECTIONS, 'PROJECTS', 'CERTIFICATIONS'].includes(normalise(line))
          ? index
          : -1
      )
      .filter(index => index !== -1),
  ].filter(index => index !== -1);

  for (const role of target.data.experience) {
    const entry = `${role.title}, ${role.company}`;
    const at = lineOf(role);
    if (at === -1) continue; // already reported as missing above

    const end = Math.min(
      lines.length,
      ...boundaries.filter(index => index > at)
    );
    const span = lines.slice(at, end).map(normalise).join(' ');
    if (!span.includes(normalise(role.duration))) {
      failures.push(
        `date range "${role.duration}" is not inside "${entry}" —` +
          ` it crossed into the next entry or is missing`
      );
    }
  }

  for (const project of target.data.projects || []) {
    if (!startsALine(lines, project.name)) {
      failures.push(`project "${project.name}" does not start a line`);
    }

    // A link that survives as pixels but not as text is worse than no link:
    // it looks right on the page and 404s when anyone copies it out. Hyphens
    // are where this happens, because a hyphen at a line break is deleted as
    // hyphenation.
    const link = project.github || project.url;
    if (link && !flat.includes(link.replace(/^https?:\/\//, ''))) {
      failures.push(
        `link for "${project.name}" does not extract intact —` +
          ` expected ${link.replace(/^https?:\/\//, '')}`
      );
    }
  }

  // The entries have to come out in the order they went in. A parser assigns
  // dates to whichever entry it last saw, so a reordered pair silently moves a
  // date range from one job onto another.
  const positions = target.data.experience.map(role => ({
    entry: `${role.title}, ${role.company}`,
    at: flat.indexOf(normalise(`${role.title}, ${role.company}`)),
  }));
  for (let i = 1; i < positions.length; i++) {
    if (positions[i].at !== -1 && positions[i].at < positions[i - 1].at) {
      failures.push(
        `"${positions[i].entry}" extracts before "${positions[i - 1].entry}"`
      );
    }
  }

  return failures;
};

/** Pages, counted from the form feeds `pdftotext` writes between them. */
const pageCount = text =>
  text.split('\f').filter(part => part.length > 0).length;

const check = target => {
  const pdf = path.join(OUT_DIR, `${target.name}.pdf`);
  if (!fs.existsSync(pdf)) {
    return [`${path.relative(ROOT, pdf)} was never built`];
  }

  const failures = [];

  // -layout preserves the columns, the default reflows them. A parser may do
  // either, so neither is allowed to lose an entry.
  const modes = [
    { label: 'pdftotext', text: run('pdftotext', [pdf, '-']) },
    {
      label: 'pdftotext -layout',
      text: run('pdftotext', ['-layout', pdf, '-']),
    },
  ];

  for (const mode of modes) {
    for (const label of [mode.label, `${mode.label}, form feeds stripped`]) {
      const text = label.endsWith('stripped')
        ? mode.text.replace(/\f/g, '')
        : mode.text;
      failures.push(...checkText(text, target).map(f => `[${label}] ${f}`));
    }
  }

  const pages = pageCount(modes[0].text);
  if (target.maxPages !== null && pages > target.maxPages) {
    failures.push(
      `is ${pages} pages, and must be ${target.maxPages}` +
        ' — trim bullets in src/config/cv.ts'
    );
  }

  return failures;
};

const main = () => {
  if (!have('pdftotext')) {
    console.error(
      'check-cv-text: pdftotext not found. It ships with poppler-utils:\n' +
        '               macOS: brew install poppler   Debian/Ubuntu: apt-get install poppler-utils'
    );
    process.exit(1);
  }

  if (process.argv.includes('--build')) {
    run('node', [path.join(__dirname, 'build-cv.js')]);
  }

  const unknown = loadCVConfig().unknownProjectNames();
  if (unknown.length > 0) {
    console.error(
      `check-cv-text: cvSource.projects names ${unknown.length} project(s) that ` +
        `src/config/projects.ts does not define: ${unknown.join(', ')}`
    );
    process.exit(1);
  }

  let failed = false;
  for (const target of cvTargets()) {
    const failures = check(target);
    if (failures.length === 0) {
      console.log(`  ✓ ${target.name}`);
      continue;
    }
    failed = true;
    console.log(`  ✗ ${target.name}`);
    for (const failure of failures) console.log(`      ${failure}`);
  }

  if (failed) {
    console.error(
      '\ncheck-cv-text: a generated PDF does not survive text extraction.\n' +
        'See the notes at the top of this file for what usually causes it.'
    );
    process.exit(1);
  }
  console.log('check-cv-text: every variant extracts cleanly');
};

main();
