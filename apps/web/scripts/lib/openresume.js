/**
 * Runs OpenResume's resume parser over a local PDF, from Node.
 *
 * `scripts/check-cv-text.js` asserts that the text layer survives extraction —
 * that the words are there, in order, on their own lines. That is necessary and
 * not sufficient: an applicant tracking system does not read lines, it reads
 * *fields*, and a document whose every line is intact can still yield the wrong
 * employer for a date range. OpenResume (github.com/xitanggg/open-resume) is the
 * closest open parser to that job — group text items into lines, lines into
 * sections, sections into a resume — so it is the second opinion here.
 *
 * LICENSING. OpenResume is AGPL-3.0 and this repository is MIT. Nothing of
 * theirs is committed here: the clone below lands in `.openresume/`, which is
 * gitignored, and is fetched from upstream on first use. What lives in this
 * repository is the adapter, which is ours. Keep it that way — vendoring their
 * source into the tree would make this repository a redistributor and require
 * the carve-out that not committing it avoids.
 *
 * The clone is pinned to a commit. Their parser is internal to their app and
 * carries no compatibility promise, so an unpinned clone would turn an upstream
 * refactor into a broken build here on an unrelated day.
 *
 * Steps 2 to 4 of their pipeline are pure functions over text items and are used
 * as they are. Step 1 is not: their `read-pdf.ts` binds to a browser (a worker
 * entry, an object URL), so `readPdf` below produces the same `TextItem` shape
 * from a file path instead.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const Module = require('module');
const path = require('path');

const { ROOT } = require('./cv-targets.js');

const UPSTREAM = 'https://github.com/xitanggg/open-resume.git';
const PINNED = '4f8255a2c763479837f69f1dccf2a3338730cd79';
const CLONE_DIR = path.join(ROOT, '.openresume');
const LIB_DIR = path.join(CLONE_DIR, 'src', 'app', 'lib');

/**
 * The one value — as opposed to type — that the parser imports from outside
 * its own directory. It is `Array(6).fill({ skill: '', rating: 4 })`; pulling
 * the real module in would drag Redux Toolkit behind it for that.
 */
const REDUX_STUB = {
  initialFeaturedSkills: Array(6)
    .fill(null)
    .map(() => ({ skill: '', rating: 4 })),
};

const isCloned = () =>
  fs.existsSync(path.join(LIB_DIR, 'parse-resume-from-pdf', 'index.ts'));

/**
 * Fetches the pinned parser if it is not already on disk.
 *
 * @param {{quiet?: boolean}} options
 * @returns {boolean} whether the parser is available to run
 */
const ensureClone = ({ quiet = false } = {}) => {
  if (isCloned()) return true;

  if (!quiet) {
    console.log(`openresume: fetching the parser at ${PINNED.slice(0, 8)}`);
  }

  fs.rmSync(CLONE_DIR, { recursive: true, force: true });

  const clone = spawnSync(
    'git',
    ['clone', '--quiet', '--filter=blob:none', UPSTREAM, CLONE_DIR],
    { encoding: 'utf8' }
  );
  if (clone.status !== 0) {
    if (!quiet) {
      console.warn(
        `openresume: could not clone ${UPSTREAM} — ${(clone.stderr || '').trim()}`
      );
    }
    return false;
  }

  const checkout = spawnSync('git', ['checkout', '--quiet', PINNED], {
    cwd: CLONE_DIR,
    encoding: 'utf8',
  });
  if (checkout.status !== 0) {
    if (!quiet) {
      console.warn(
        `openresume: could not check out ${PINNED} — ${(checkout.stderr || '').trim()}`
      );
    }
    return false;
  }

  return isCloned();
};

let hooked = false;

/**
 * Teaches Node the `lib/...` specifier the parser is written against.
 *
 * Upstream resolves it through a tsconfig path alias, which only their bundler
 * honours. Rather than reproduce their build, the resolver is taught the one
 * mapping and Babel transpiles the TypeScript on the way in.
 */
const installResolver = () => {
  if (hooked) return;
  hooked = true;

  require('@babel/register')({
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    cwd: ROOT,
    only: [path.join(ROOT, 'src'), CLONE_DIR],
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      '@babel/preset-typescript',
    ],
    babelrc: false,
    configFile: false,
  });

  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (request === 'lib/redux/resumeSlice') return request;
    if (request.startsWith('lib/')) {
      return resolve.call(this, path.join(LIB_DIR, request.slice(4)), ...rest);
    }
    return resolve.call(this, request, ...rest);
  };

  const load = Module._load;
  Module._load = function (request, ...rest) {
    if (request === 'lib/redux/resumeSlice') return REDUX_STUB;
    return load.call(this, request, ...rest);
  };
};

/**
 * Step 1, for Node: a PDF path in, OpenResume's `TextItem[]` out.
 *
 * Mirrors their `read-pdf.ts` — same fields, same origin at the bottom left,
 * same soft-hyphen repair, same filtering of whitespace-only items — over the
 * legacy build, which is the one that runs outside a browser.
 */
const readPdf = async pdfPath => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(pdfPath)),
    useSystemFonts: true,
  }).promise;

  const items = [];

  for (let page = 1; page <= doc.numPages; page++) {
    const pdfPage = await doc.getPage(page);
    const content = await pdfPage.getTextContent();

    // Font names come back as loaded ids ("g_d8_f1") until the operator list
    // has been walked; the parser scores bold titles by font name, so this is
    // load-bearing rather than cosmetic.
    await pdfPage.getOperatorList();
    const commonObjs = pdfPage.commonObjs;

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const { str, transform, fontName, width, height, hasEOL } = item;

      let resolvedFont = fontName;
      try {
        resolvedFont = commonObjs.get(fontName)?.name ?? fontName;
      } catch {
        // The font was never registered; its loaded id is still a stable key.
      }

      items.push({
        text: String(str).replace(/-­‐/g, '-'),
        x: transform[4],
        y: transform[5],
        width,
        height,
        fontName: resolvedFont,
        hasEOL: Boolean(hasEOL),
      });
    }
  }

  return items.filter(item => item.hasEOL || item.text.trim() !== '');
};

/**
 * Parses one PDF into OpenResume's `Resume` shape.
 *
 * @param {string} pdfPath
 * @returns {Promise<object>} profile, workExperiences, educations, projects, skills
 */
const parseResumePdf = async pdfPath => {
  installResolver();

  const {
    groupTextItemsIntoLines,
  } = require('lib/parse-resume-from-pdf/group-text-items-into-lines');
  const {
    groupLinesIntoSections,
  } = require('lib/parse-resume-from-pdf/group-lines-into-sections');
  const {
    extractResumeFromSections,
  } = require('lib/parse-resume-from-pdf/extract-resume-from-sections');

  const textItems = await readPdf(pdfPath);
  return extractResumeFromSections(
    groupLinesIntoSections(groupTextItemsIntoLines(textItems))
  );
};

module.exports = { CLONE_DIR, PINNED, ensureClone, parseResumePdf };
