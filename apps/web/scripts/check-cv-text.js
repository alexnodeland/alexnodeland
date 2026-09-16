#!/usr/bin/env node
/**
 * Asserts that the generated CV PDFs survive text extraction.
 *
 * A resume is read twice: once by a person, and once by whatever parses it into
 * fields. The second reader sees only the PDF's text layer — which is not the
 * same thing as what the page looks like. Two ways that layer has gone wrong
 * here, both invisible on screen:
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
 * Beyond the lines, the text as a whole: every bullet the source carries has
 * to come back word for word (a dropped hyphen or a glued pair of words is a
 * bullet a keyword filter cannot match), no line may end in a hyphen, no
 * ligature glyph may reach the text layer, the contact details have to be
 * separate tokens, the sections have to come out in order, every font has to
 * be embedded with a Unicode map, and the PDF has to say whose it is.
 *
 * What this file does not do is score anything. It is the pass-or-fail half;
 * `score-cv.js` is the signal half, and the two read the same extractions
 * (scripts/lib/cv-text.js).
 *
 * Usage:
 *   node scripts/check-cv-text.js          # check what is in static/cv
 *   node scripts/check-cv-text.js --build  # build first, then check
 */

const fs = require('fs');
const path = require('path');

const {
  ROOT,
  OUT_DIR,
  loadCVConfig,
  cvTargets,
} = require('./lib/cv-targets.js');
const {
  have,
  run,
  extractions,
  normalise,
  foldTypography,
  pageCount,
  pdfFonts,
  pdfInfo,
} = require('./lib/cv-text.js');

/** The section names a parser is looking for, as the template emits them. */
const SECTIONS = ['SUMMARY', 'EXPERIENCE', 'EDUCATION', 'SKILLS'];

/** Every heading the template can emit, in the order it emits them. */
const SECTION_ORDER = [
  'SUMMARY',
  'EXPERIENCE',
  'PROJECTS',
  'EDUCATION',
  'SKILLS',
  'CERTIFICATIONS',
];

// `normalise` collapses the soft line wrapping the PDF's column width imposes.
// A long job title wraps inside its own column, so "Artist in Residence, Center
// of Excellence in Wireless Information Technology" arrives as two lines. That
// is not the fusion this script is looking for, and treating it as a failure
// would make the check unusable. Comparing against a space-normalised copy of
// the whole document tells the two apart: a wrapped title is still present and
// still starts its own line, a fused one does not start a line at all.

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

  // The sections too, in the order the template writes them. A parser
  // that finds SKILLS above EXPERIENCE files the bullets under the wrong
  // heading, and every one of them is lost to the job history.
  const headingsSeen = lines
    .map(normalise)
    .filter(line => SECTION_ORDER.includes(line));
  const expectedOrder = SECTION_ORDER.filter(h => headingsSeen.includes(h));
  if (headingsSeen.join(' ') !== expectedOrder.join(' ')) {
    failures.push(`sections extract as ${headingsSeen.join(', ')}`);
  }

  // Every bullet, word for word. The line checks above prove the skeleton
  // survives; this proves the flesh does. A keyword filter matches whole
  // words, so a bullet that comes back with two words glued together, or a
  // hyphen deleted at a line end, is a bullet that says nothing to it.
  // Dashes, quotes and soft hyphens are folded on both sides first: those
  // are what typesetting legitimately changes.
  const folded = foldTypography(text);
  const wordFor = phrase => foldTypography(phrase);
  for (const role of target.data.experience) {
    for (const bullet of role.achievements) {
      if (!folded.includes(wordFor(bullet))) {
        failures.push(
          `a bullet under "${role.title}, ${role.company}" does not extract` +
            ` intact: "${bullet.slice(0, 60)}…"`
        );
      }
    }
  }
  if (!folded.includes(wordFor(target.data.personal.summary))) {
    failures.push('the summary does not extract intact');
  }

  // A hyphen at a line end is either hyphenation, which a parser will
  // delete and be right, or a real hyphen, which it will delete and be
  // wrong. The template forbids hyphenation across a URL for exactly this
  // reason; here every line end is held to it.
  for (const line of lines) {
    if (/[\w]-$/.test(line.trimEnd())) {
      failures.push(`a line ends in a hyphen: "${line.trim().slice(-40)}"`);
    }
  }

  // Ligatures. "fi" and "fl" set as single glyphs reach the text layer as
  // U+FB01 and U+FB02 unless the font carries a map back to the letters,
  // and then "efficient" is not the word "efficient" to a string comparison.
  if (/[\ufb00-\ufb06]/.test(text)) {
    failures.push('a ligature glyph (ﬁ, ﬂ, …) reached the text layer');
  }
  if (/\u00ad/.test(text)) {
    failures.push('a soft hyphen reached the text layer');
  }

  // The contact details have to be their own tokens. An email that comes
  // out as "USA·alex@…" is an email no field parser finds — which is what
  // the interword glue in the header did once.
  const tokens = flat.split(' ');
  for (const [field, value] of [
    ['email', target.data.personal.email],
    ['website', target.data.personal.website],
  ]) {
    if (!tokens.includes(value)) {
      failures.push(
        `the ${field} "${value}" does not extract as a token of its own`
      );
    }
  }

  return failures;
};

const check = target => {
  const pdf = path.join(OUT_DIR, `${target.name}.pdf`);
  if (!fs.existsSync(pdf)) {
    return [`${path.relative(ROOT, pdf)} was never built`];
  }

  const failures = [];

  // -layout preserves the columns, the default reflows them. A parser may do
  // either, so neither is allowed to lose an entry.
  const readings = extractions(pdf);
  for (const { label, text } of readings) {
    failures.push(...checkText(text, target).map(f => `[${label}] ${f}`));
  }

  const pages = pageCount(readings[0].text);
  if (target.maxPages !== null && pages > target.maxPages) {
    failures.push(
      `is ${pages} pages, and must be ${target.maxPages}` +
        ' — trim bullets in src/config/cv.ts'
    );
  }

  // A font that is not embedded is rendered with whatever the reader has,
  // and one without a Unicode map extracts as glyph ids. Either is a
  // document that looks fine and reads as nothing.
  for (const font of pdfFonts(pdf)) {
    if (!font.embedded) failures.push(`font ${font.name} is not embedded`);
    if (!font.unicode) failures.push(`font ${font.name} has no Unicode map`);
  }

  // The metadata, as the template sets it. Whoever downloads the file sees
  // the Title before a word of the page.
  const info = pdfInfo(pdf);
  const { name, title } = target.data.personal;
  if (info.Title !== `${name} - ${title}`) {
    failures.push(
      `PDF Title is ${JSON.stringify(info.Title || '')}, expected "${name} - ${title}"`
    );
  }
  if (info.Author !== name) {
    failures.push(
      `PDF Author is ${JSON.stringify(info.Author || '')}, expected "${name}"`
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
