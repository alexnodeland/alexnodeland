/**
 * What a machine reads out of a CV PDF, and the poppler tools that read it.
 *
 * `check-cv-text.js` asserts against this text, and `score-cv.js` measures
 * against it, so the two agree on what "the extracted text" is: `pdftotext`
 * in its two modes, each with and without the form feeds it writes between
 * pages. The form-feed-stripped copy is the worst a careless parser does —
 * delete control characters without substituting whitespace — and it is what
 * fused two entries across a page break once.
 */

const { spawnSync } = require('child_process');

const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 32e6 });
  if (result.status !== 0) {
    throw new Error(`${cmd} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
};

/** Is `cmd` on the path? poppler-utils is the usual thing missing. */
const have = cmd => spawnSync(cmd, ['-v'], { stdio: 'ignore' }).status !== null;

/**
 * The four readings of one PDF.
 *
 * @returns {Array<{label: string, text: string}>}
 */
const extractions = pdf => {
  const modes = [
    { label: 'pdftotext', text: run('pdftotext', [pdf, '-']) },
    {
      label: 'pdftotext -layout',
      text: run('pdftotext', ['-layout', pdf, '-']),
    },
  ];
  return modes.flatMap(mode => [
    mode,
    {
      label: `${mode.label}, form feeds stripped`,
      text: mode.text.replace(/\f/g, ''),
    },
  ]);
};

/** The reflowed reading alone, for measurements that need one text. */
const extractText = pdf => run('pdftotext', [pdf, '-']);

/** Collapses whitespace, including the soft wraps the column width imposes. */
const normalise = text => text.replace(/\s+/g, ' ').trim();

/**
 * Folds what LaTeX and extraction legitimately change about a string, so the
 * source and the text layer can be compared for what matters.
 *
 * pdflatex sets `--` and `---` as en and em dashes and curls straight quotes;
 * extraction may hand back a soft hyphen. None of those are the defects the
 * checks are hunting (a word split in two, a hyphen dropped at a line end), so
 * they are normalised away on both sides before comparing.
 */
const foldTypography = text =>
  text
    .replace(/­/g, '')
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();

/** Pages, counted from the form feeds `pdftotext` writes between them. */
const pageCount = text =>
  text.split('\f').filter(part => part.length > 0).length;

/**
 * The document's fonts, as `pdffonts` lists them.
 *
 * @returns {Array<{name: string, embedded: boolean, unicode: boolean}>}
 */
const pdfFonts = pdf =>
  run('pdffonts', [pdf])
    .split('\n')
    .slice(2)
    .filter(line => line.trim())
    .map(line => {
      // name type encoding emb sub uni object ID — the name can hold spaces,
      // so the columns are read from the right.
      const cols = line.trim().split(/\s+/);
      const [emb, , uni] = cols.slice(-5, -2);
      return { name: cols[0], embedded: emb === 'yes', unicode: uni === 'yes' };
    });

/** The document's metadata, as `pdfinfo` lists it: Title, Author, Pages… */
const pdfInfo = pdf => {
  const info = {};
  for (const line of run('pdfinfo', [pdf]).split('\n')) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) info[match[1].trim()] = match[2].trim();
  }
  return info;
};

module.exports = {
  have,
  run,
  extractions,
  extractText,
  normalise,
  foldTypography,
  pageCount,
  pdfFonts,
  pdfInfo,
};
