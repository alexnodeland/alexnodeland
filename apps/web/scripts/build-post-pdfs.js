#!/usr/bin/env node
/**
 * Typesets every post in `src/content/blog/` as a PDF.
 *
 *   static/timeline/pdf/<slug>.pdf
 *
 * The post pages link straight at these, so they are built before
 * `gatsby build` copies `static/` into the bundle — the same arrangement, and
 * for the same reasons, as the CV artifacts next door (scripts/build-cv.js).
 * Nothing here is committed; see `.gitignore`.
 *
 * Two external dependencies, both optional:
 *
 *   pdflatex  — without it the script warns and exits 0, so a local
 *               `npm run build` on a box with no TeX still produces a working
 *               site, just with no PDFs to download.
 *   a webp decoder (dwebp, or ImageMagick's magick/convert) — the photographs
 *               in the posts are webp, which pdflatex cannot include. Without
 *               one the PDFs are built anyway and a figure comes out as its
 *               credit line alone.
 *
 * Usage:
 *   node scripts/build-post-pdfs.js            # build all of them
 *   node scripts/build-post-pdfs.js --keep     # keep the .tex and .log
 *   node scripts/build-post-pdfs.js 161114     # just the slugs that match
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { renderPostTex } = require('../templates/timeline/post.tex.js');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'blog');
const STATIC_DIR = path.join(ROOT, 'static');
const OUT_DIR = path.join(STATIC_DIR, 'timeline', 'pdf');

// The address and the name come from the site's own config rather than being
// written down a second time here: a relative link has to leave the PDF as
// something a reader can follow, and the footer has to name the same person
// the site's footer does. Same trick the CV builder uses to read cv.ts.
require('@babel/register')({
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  cwd: ROOT,
  only: [path.join(ROOT, 'src')],
});
const { siteConfig } = require('../src/config/site.ts');
const SITE_URL = siteConfig.siteUrl;
const AUTHOR = siteConfig.author;

const has = (command, args = ['--version']) =>
  spawnSync(command, args, { stdio: 'ignore' }).status === 0;

/**
 * Frontmatter and body, split by hand.
 *
 * A YAML parser would be the obvious thing, and there is not one in the tree:
 * the frontmatter across the whole corpus is four quoted scalars, and the
 * exporter beside this one (scripts/export-site-content.mjs) reads them the
 * same way.
 */
const readPost = file => {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!match) return null;

  const [, head, body] = match;
  const field = name => {
    const found = new RegExp(`^${name}:\\s*(.*)$`, 'm').exec(head);
    if (!found) return '';
    return found[1].trim().replace(/^['"]|['"]$/g, '');
  };

  return {
    slug: file.replace(/\.md$/, ''),
    title: field('title'),
    date: field('date'),
    category: field('category'),
    description: field('description'),
    body,
  };
};

/**
 * `july 26, 2026` — the date as the site writes it, since this is the site's
 * document. A hand-parse of the ISO string, for the reason given in
 * src/lib/utils/dates.ts: `new Date` moves the day west of UTC.
 */
const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
const formatDate = iso => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
};

/**
 * A picture from the markup, as a file pdflatex will take.
 *
 * The site's photographs are webp — the right format for the web and one no
 * TeX engine reads — so each one is decoded into the working directory once
 * and handed over as a png. Whichever decoder the box has: dwebp if libwebp is
 * installed, ImageMagick otherwise.
 */
const imageResolver = (workDir, decoder) => {
  const seen = new Map();

  return src => {
    if (!src.startsWith('/')) return null;
    const source = path.join(STATIC_DIR, src.replace(/^\/+/, ''));
    if (!fs.existsSync(source)) return null;

    // Anything pdflatex already reads goes straight in.
    if (/\.(png|jpe?g|pdf)$/i.test(source)) return source;
    if (!decoder) return null;
    if (seen.has(source)) return seen.get(source);

    const out = path.join(
      workDir,
      `${path.basename(source).replace(/\.[^.]+$/, '')}.png`
    );
    const result =
      decoder === 'dwebp'
        ? spawnSync('dwebp', [source, '-o', out], { stdio: 'ignore' })
        : spawnSync(decoder, [source, out], { stdio: 'ignore' });

    const made = result.status === 0 && fs.existsSync(out) ? out : null;
    seen.set(source, made);
    return made;
  };
};

const pageCount = logPath => {
  if (!fs.existsSync(logPath)) return null;
  const match = fs
    .readFileSync(logPath, 'utf8')
    .match(/Output written on .*?\((\d+) pages?,/);
  return match ? Number(match[1]) : null;
};

const build = (post, { keep, decoder }) => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `post-${post.slug}-`));
  const texPath = path.join(workDir, `${post.slug}.tex`);

  fs.writeFileSync(
    texPath,
    renderPostTex(
      // `date` is the line the title block prints; `iso` is the same date for
      // the footer, which wants the year off the front of it.
      { ...post, iso: post.date, date: formatDate(post.date) },
      {
        siteUrl: SITE_URL,
        author: AUTHOR,
        resolveImage: imageResolver(workDir, decoder),
      }
    )
  );

  // Twice, so anything positioned against the page settles.
  for (let pass = 0; pass < 2; pass++) {
    const result = spawnSync(
      'pdflatex',
      ['-interaction=nonstopmode', '-halt-on-error', `${post.slug}.tex`],
      { cwd: workDir, encoding: 'utf8' }
    );
    if (result.status !== 0) {
      const log = path.join(workDir, `${post.slug}.log`);
      const detail = fs.existsSync(log)
        ? fs
            .readFileSync(log, 'utf8')
            .split('\n')
            .filter(line => line.startsWith('!'))
            .join('\n')
        : result.stdout;
      throw new Error(`pdflatex failed for ${post.slug}:\n${detail}`);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pdfOut = path.join(OUT_DIR, `${post.slug}.pdf`);
  fs.copyFileSync(path.join(workDir, `${post.slug}.pdf`), pdfOut);

  const pages = pageCount(path.join(workDir, `${post.slug}.log`));
  console.log(
    `  ${path.relative(ROOT, pdfOut)}  ${pages ?? '?'} page${pages === 1 ? '' : 's'}`
  );

  if (keep) {
    fs.copyFileSync(texPath, path.join(OUT_DIR, `${post.slug}.tex`));
  } else {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
};

const main = () => {
  const args = process.argv.slice(2);
  const keep = args.includes('--keep');
  const filters = args.filter(arg => !arg.startsWith('--'));

  if (!has('pdflatex')) {
    console.warn(
      'build-post-pdfs: pdflatex not found — skipping post artifacts.\n' +
        '                 The site will build, but the download on each post will 404.\n' +
        '                 macOS: brew install texlive   Debian/Ubuntu: see .github/workflows/deploy.yml'
    );
    return;
  }

  const decoder = has('dwebp', ['-version'])
    ? 'dwebp'
    : has('magick')
      ? 'magick'
      : has('convert')
        ? 'convert'
        : null;
  if (!decoder) {
    console.warn(
      'build-post-pdfs: no webp decoder (dwebp or ImageMagick) — the photographs\n' +
        '                 will be left out and their credits printed on their own.'
    );
  }

  const posts = fs
    .readdirSync(POSTS_DIR)
    .filter(file => file.endsWith('.md'))
    .filter(file => !filters.length || filters.some(f => file.includes(f)))
    .map(readPost)
    .filter(Boolean);

  console.log(`build-post-pdfs: typesetting ${posts.length} posts`);
  for (const post of posts) build(post, { keep, decoder });
};

main();
