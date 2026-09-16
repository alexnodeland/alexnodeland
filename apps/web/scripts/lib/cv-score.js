/**
 * The arithmetic behind `score-cv.js`, kept free of files, PDFs and models so
 * it can be tested on fabricated inputs.
 *
 * Three scores per document:
 *
 *   parseability — of the fields a parser is expected to recover (name,
 *     email, each job with its dates, each school, a skills line), how many
 *     it did. Counted from OpenResume's output against the source.
 *
 *   keywords — of the lexicon terms the family's profiles ask for, weighted
 *     by how many profiles ask, how much the extracted text covers.
 *
 *   semantic — for each requirement in the family's profiles, how close the
 *     nearest resume sentence comes, as a cosine between embeddings. The mean
 *     is the score; the share above a threshold is reported beside it.
 *
 * Every score is a number in [0, 1] here. The driver prints them as percents
 * and rounds them for the baseline; nothing in this file rounds.
 */

// --- profiles --------------------------------------------------------------

/**
 * Reads one role profile: its frontmatter and the bullets under its sections.
 *
 * @returns {{meta: object, sections: Record<string, string[]>, text: string}}
 */
const parseProfile = markdown => {
  const meta = {};
  let body = markdown;
  const front = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (front) {
    for (const line of front[1].split('\n')) {
      const match = line.match(/^([\w-]+):\s*(.*)$/);
      if (match) meta[match[1]] = match[2].replace(/^"(.*)"$/, '$1');
    }
    body = markdown.slice(front[0].length);
  }

  const sections = {};
  let current = null;
  for (const line of body.split('\n')) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = heading[1].trim();
      sections[current] = [];
      continue;
    }
    const bullet = line.match(/^-\s+(.+)$/);
    if (bullet && current) {
      const text = bullet[1].trim();
      // An empty section is recorded as one line saying so.
      if (!/^none listed/i.test(text)) sections[current].push(text);
    }
  }

  return { meta, sections, text: body };
};

/** The lines of a profile that describe the work, as the semantic score reads them. */
const requirementsOf = profile =>
  [
    'Responsibilities',
    'Required qualifications',
    'Preferred qualifications',
  ].flatMap(name => profile.sections[name] || []);

// --- keywords --------------------------------------------------------------

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Compiles the lexicon into one whole-word matcher per term.
 *
 * Whole words, not substrings: matched as a substring, "ts" is in "agents"
 * and "eval" swallows "evaluation" before its own alias runs. Aliases are
 * tried longest first so "vector search" wins over "search". A boundary is
 * anything that is not a word character, which lets "c++" and "ci/cd" match
 * at the ends they have.
 */
const compileLexicon = lexicon =>
  Object.entries(lexicon.terms).map(([term, aliases]) => ({
    term,
    pattern: new RegExp(
      `(?<![\\w+#])(?:${[...aliases]
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join('|')})(?![\\w+#])`,
      'i'
    ),
  }));

/** The lexicon terms `text` mentions, by any alias. */
const termsIn = (text, compiled) =>
  new Set(
    compiled.filter(({ pattern }) => pattern.test(text)).map(t => t.term)
  );

/**
 * How many of `profiles` mention each term.
 *
 * @returns {Map<string, number>} term → count, terms mentioned by none omitted
 */
const documentFrequency = (profiles, compiled) => {
  const counts = new Map();
  for (const profile of profiles) {
    for (const term of termsIn(profile.text, compiled)) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }
  }
  return counts;
};

/**
 * Weighted keyword coverage of one text against one family.
 *
 * Each term weighs what it is asked for: a term in twelve of fifteen profiles
 * is worth twelve, one that a single posting mentions is worth one. Coverage
 * is the weight of the terms present over the weight of all of them.
 *
 * @returns {{score: number, present: string[], missing: Array<{term: string, profiles: number}>}}
 */
const keywordCoverage = (text, frequency, compiled) => {
  const present = termsIn(text, compiled);
  let covered = 0;
  let total = 0;
  const missing = [];
  for (const [term, count] of frequency) {
    total += count;
    if (present.has(term)) covered += count;
    else missing.push({ term, profiles: count });
  }
  missing.sort(
    (a, b) => b.profiles - a.profiles || a.term.localeCompare(b.term)
  );
  return {
    score: total === 0 ? 0 : covered / total,
    present: [...present].filter(term => frequency.has(term)).sort(),
    missing,
  };
};

// --- semantic --------------------------------------------------------------

/**
 * The sentences of one resume, as the semantic score reads them: the
 * summary sentence by sentence, each bullet, each project with its
 * description, the skills as one line, and each role's title line.
 *
 * From the source rather than the extracted text. `check-cv-text.js` asserts
 * that every one of these lines survives extraction intact, so the source is
 * the same text without the job of re-segmenting a reflowed page.
 */
const resumeUnits = data => {
  const units = [];
  for (const sentence of data.personal.summary.split(/(?<=[.!?])\s+/)) {
    if (sentence.trim()) units.push(sentence.trim());
  }
  for (const role of data.experience) {
    units.push(`${role.title}, ${role.company}`);
    for (const bullet of role.achievements) units.push(bullet);
  }
  for (const project of data.projects || []) {
    units.push(`${project.name}: ${project.description}`);
  }
  units.push(data.skills.technical.join(', '));
  return units;
};

/** Cosine of two L2-normalised vectors, which is their dot product. */
const cosine = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
};

/**
 * How well `unitVectors` answer each of `requirementVectors`.
 *
 * Per requirement, the nearest resume unit. The mean of those maxima is the
 * score — it moves smoothly when a bullet is reworded, which is what makes it
 * a signal. `coverage` is the share at or above `threshold`, easier to read
 * and coarser; it is reported, not gated.
 *
 * @returns {{score: number, coverage: number, nearest: number[]}}
 */
const semanticCoverage = (requirementVectors, unitVectors, threshold) => {
  if (requirementVectors.length === 0 || unitVectors.length === 0) {
    return { score: 0, coverage: 0, nearest: [] };
  }
  const nearest = requirementVectors.map(req =>
    Math.max(...unitVectors.map(unit => cosine(req, unit)))
  );
  const sum = nearest.reduce((a, b) => a + b, 0);
  return {
    score: sum / nearest.length,
    coverage:
      nearest.filter(value => value >= threshold).length / nearest.length,
    nearest,
  };
};

// --- parseability ----------------------------------------------------------

/**
 * Which fields OpenResume recovered, against the source.
 *
 * @param {object} parsed OpenResume's Resume
 * @param {object} data the CVData the PDF was typeset from
 * @returns {{score: number, checks: Array<{name: string, ok: boolean, detail?: string}>}}
 */
const parseabilityOf = (parsed, data) => {
  const checks = [];
  const { profile, workExperiences, educations, skills } = parsed;

  checks.push({
    name: 'name',
    ok: profile.name === data.personal.name,
    detail: profile.name,
  });
  checks.push({
    name: 'email',
    ok: profile.email === data.personal.email,
    detail: profile.email,
  });
  checks.push({
    name: 'job count',
    ok: workExperiences.length === data.experience.length,
    detail: `${workExperiences.length} parsed, ${data.experience.length} in the source`,
  });

  for (const role of data.experience) {
    const entry = `${role.title}, ${role.company}`;
    const match = workExperiences.find(w =>
      [w.company, w.jobTitle].some(field => field && entry.startsWith(field))
    );
    checks.push({ name: `job: ${entry}`, ok: Boolean(match) });
    // The year is the part a parser gets wrong quietly: the date lands on
    // the entry below its own and the CV still looks valid.
    const dated = Boolean(
      match && match.date && role.duration.startsWith(match.date.slice(0, 4))
    );
    checks.push({
      name: `date: ${entry}`,
      ok: dated,
      detail: match ? match.date : undefined,
    });
  }

  for (const school of data.education) {
    const match = educations.find(e =>
      [e.school, e.degree].some(
        field =>
          field &&
          (school.institution.includes(field) ||
            field.includes(school.institution))
      )
    );
    checks.push({ name: `school: ${school.institution}`, ok: Boolean(match) });
  }

  const descriptions = (skills && skills.descriptions) || [];
  checks.push({
    name: 'skills',
    ok: descriptions.length > 0,
    detail: `${descriptions.length} line(s)`,
  });

  return {
    score: checks.filter(c => c.ok).length / checks.length,
    checks,
  };
};

// --- the gate --------------------------------------------------------------

/** How far each score may fall before it counts as a regression. */
const TOLERANCE = {
  parseability: 0,
  keywords: 0,
  // Cosines from the quantised model differ in the third decimal between an
  // ARM laptop and the Linux runner; a gate tighter than this is red for
  // nothing.
  semantic: 0.01,
};

/**
 * Every score in `scores` that fell below `baseline` by more than its
 * tolerance.
 *
 * Both are the shape the driver writes: `{ [variant]: { parseability,
 * families: { [family]: { keywords, semantic } } } }`. A variant or family
 * missing from the baseline is new, and passes.
 *
 * @returns {Array<{variant: string, family?: string, metric: string, was: number, now: number}>}
 */
const regressions = (scores, baseline) => {
  const found = [];
  const compare = (variant, family, metric, was, now) => {
    if (typeof was !== 'number' || typeof now !== 'number') return;
    if (now < was - TOLERANCE[metric] - 1e-9) {
      found.push({ variant, family, metric, was, now });
    }
  };

  for (const [variant, now] of Object.entries(scores)) {
    const was = baseline[variant];
    if (!was) continue;
    compare(
      variant,
      undefined,
      'parseability',
      was.parseability,
      now.parseability
    );
    for (const [family, nowFamily] of Object.entries(now.families || {})) {
      const wasFamily = (was.families || {})[family];
      if (!wasFamily) continue;
      compare(
        variant,
        family,
        'keywords',
        wasFamily.keywords,
        nowFamily.keywords
      );
      compare(
        variant,
        family,
        'semantic',
        wasFamily.semantic,
        nowFamily.semantic
      );
    }
  }
  return found;
};

module.exports = {
  TOLERANCE,
  parseProfile,
  requirementsOf,
  compileLexicon,
  termsIn,
  documentFrequency,
  keywordCoverage,
  resumeUnits,
  cosine,
  semanticCoverage,
  parseabilityOf,
  regressions,
};
