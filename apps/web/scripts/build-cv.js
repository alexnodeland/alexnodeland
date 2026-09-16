#!/usr/bin/env node
/**
 * Builds the downloadable CV artifacts from `src/config/cv.ts`.
 *
 *   static/cv/alex-nodeland-resume.pdf       — the neutral one-pager
 *   static/cv/alex-nodeland-fde.pdf          — one page for FDE roles
 *   static/cv/alex-nodeland-ai-engineer.pdf  — one page for AI Engineer roles
 *   static/cv/alex-nodeland-music-tech.pdf   — one page for music technology roles
 *   static/cv/alex-nodeland-cv.pdf           — everything
 *
 * The site's CV page links straight at these, so they are built before
 * `gatsby build` copies `static/` into the bundle. Nothing here is committed;
 * see `.gitignore`.
 *
 * pdflatex is the only external dependency. If it is missing the script warns
 * and exits 0 rather than failing the build — a local `npm run build` without
 * TeX installed still produces a working site, just without fresh PDFs.
 *
 * Usage:
 *   node scripts/build-cv.js           # build all four
 *   node scripts/build-cv.js --keep    # keep the .tex and .log for debugging
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { ROOT, OUT_DIR, cvTargets } = require('./lib/cv-targets.js');
const { renderResumeTex } = require('../templates/cv/resume.tex.js');

const hasPdflatex = () =>
  spawnSync('pdflatex', ['--version'], { stdio: 'ignore' }).status === 0;

/**
 * Page count, read from the pdflatex log.
 *
 * The PDF itself is no help here: pdflatex writes its page tree into a
 * compressed object stream, so `/Count` never appears as plain bytes. The log
 * states it outright — "Output written on x.pdf (2 pages, 41003 bytes)".
 */
const pageCount = logPath => {
  if (!fs.existsSync(logPath)) return null;
  const match = fs
    .readFileSync(logPath, 'utf8')
    .match(/Output written on .*?\((\d+) pages?,/);
  return match ? Number(match[1]) : null;
};

const build = ({ variant, data, name, maxPages }, { keep }) => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `cv-${variant}-`));
  const texPath = path.join(workDir, `${name}.tex`);
  fs.writeFileSync(texPath, renderResumeTex(data, { variant }));

  // Twice, so \hfill-positioned dates and any page references settle.
  for (let pass = 0; pass < 2; pass++) {
    const result = spawnSync(
      'pdflatex',
      ['-interaction=nonstopmode', '-halt-on-error', `${name}.tex`],
      { cwd: workDir, encoding: 'utf8' }
    );
    if (result.status !== 0) {
      const log = path.join(workDir, `${name}.log`);
      const detail = fs.existsSync(log)
        ? fs
            .readFileSync(log, 'utf8')
            .split('\n')
            .filter(line => line.startsWith('!'))
            .join('\n')
        : result.stdout;
      throw new Error(`pdflatex failed for ${name}:\n${detail}`);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pdfOut = path.join(OUT_DIR, `${name}.pdf`);
  fs.copyFileSync(path.join(workDir, `${name}.pdf`), pdfOut);

  const pages = pageCount(path.join(workDir, `${name}.log`));
  console.log(
    `  ${path.relative(ROOT, pdfOut)}  ${pages ?? '?'} page${pages === 1 ? '' : 's'}`
  );

  // Not a gate — the build still succeeds — but silently shipping a two-page
  // "one page" resume is the exact failure this pipeline exists to avoid.
  // `check-cv-text.js` is the gate; this is the warning you see while editing.
  if (maxPages !== null && pages !== null && pages > maxPages) {
    console.warn(
      `  ⚠ ${name} is ${pages} pages, not ${maxPages}. Trim bullets in src/config/cv.ts,\n` +
        `    or tighten the knobs at the top of preamble() in templates/cv/resume.tex.js.`
    );
  }

  if (keep) {
    fs.copyFileSync(texPath, path.join(OUT_DIR, `${name}.tex`));
    console.log(
      `  kept ${path.relative(ROOT, path.join(OUT_DIR, `${name}.tex`))}`
    );
  } else {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
};

const main = () => {
  const keep = process.argv.includes('--keep');

  if (!hasPdflatex()) {
    console.warn(
      'build-cv: pdflatex not found — skipping CV artifacts.\n' +
        '          The site will build, but /cv/*.pdf will 404.\n' +
        '          macOS: brew install texlive   Debian/Ubuntu: see .github/workflows/deploy.yml'
    );
    return;
  }

  console.log('build-cv: rendering CV artifacts');
  for (const target of cvTargets()) build(target, { keep });
};

main();
