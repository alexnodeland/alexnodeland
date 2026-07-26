#!/usr/bin/env node
//
// Sweeps every page in both themes and reports text that will not read where it
// sits. Two different failures, because this site has two kinds of surface:
//
//   1. Text on a page surface (a card, a panel) that falls under WCAG AA — 4.5:1
//      against whatever is actually painted behind it, not against the token it
//      nominally sits on.
//
//   2. Text on the animated background with no halo. The backgrounds are the
//      same six in both themes and run from a near-black graph to a saturated
//      yellow PDE field, so no single colour survives them. The only defence is
//      a text-shadow, and this flags anything missing one.
//
// Run against the dev server:
//
//   npm run develop          # in one shell
//   npm run audit:contrast   # in another
//
// Exits non-zero if anything is flagged, so it can gate a branch if you ever
// want it to.
//
// Known blind spot, reported as `skipped`: an element filled with a CSS
// gradient has a transparent `backgroundColor`, so there is no single value to
// measure against and no way to know which stop sits under the text. Those are
// counted and listed rather than guessed at — check them by eye, or against the
// darkest stop of the gradient.

import { chromium } from 'playwright';

const BASE_URL = process.env.AUDIT_BASE_URL ?? 'http://localhost:8000';
const THEMES = ['light', 'dark'];
const VIEWPORT = { width: 1280, height: 900 };

// AA for body text. Large text is allowed 3:1, but nothing here relies on that,
// and holding one bar keeps the output honest.
const MIN_RATIO = 4.5;

/**
 * Runs in the page. Returns every text-bearing element that fails, plus the
 * ones it could not judge.
 */
const AUDIT = minRatio => {
  const lin = c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const parse = s => {
    const m = s.match(
      /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/
    );
    return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
  };
  const lum = a => 0.2126 * lin(a[0]) + 0.7152 * lin(a[1]) + 0.0722 * lin(a[2]);
  const ratio = (a, b) => {
    const l1 = lum(a);
    const l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const composite = (fg, bg) =>
    [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]));

  const describe = el =>
    el.tagName.toLowerCase() +
    (typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).join('.')
      : '');

  // Walks up for the first ancestor that actually paints something solid.
  //
  // Stops at body on purpose: body's own colour is not what you see, because
  // the background stage and the simulation canvas are painted over it. Text
  // whose nearest opaque ancestor is body is text on the animated background.
  //
  // A translucent surface below this threshold is treated as not-a-surface,
  // since what shows through it is the background and therefore unknowable.
  const OPAQUE_ENOUGH = 0.85;
  const backdrop = el => {
    let node = el;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      if (style.backgroundImage.includes('gradient')) {
        return { kind: 'gradient', gradient: style.backgroundImage };
      }
      const colour = parse(style.backgroundColor);
      if (colour && colour[3] > OPAQUE_ENOUGH) {
        return { kind: 'solid', colour };
      }
      node = node.parentElement;
    }
    return { kind: 'background' };
  };

  const failures = [];
  const skipped = [];

  document.querySelectorAll('body *').forEach(el => {
    // Only elements holding their own visible text — otherwise every wrapper
    // reports its children's problems a second time.
    const own = Array.from(el.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent.trim())
      .join(' ')
      .trim();
    if (!own) return;

    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;

    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.opacity === '0') return;

    const fg = parse(style.color);
    if (!fg) return;

    const hasHalo = style.textShadow && style.textShadow !== 'none';
    const under = backdrop(el);

    if (under.kind === 'background') {
      // Painted straight onto the animated background, which can be any
      // colour. A halo is the whole defence; without one there is nothing.
      if (hasHalo) return;
      failures.push({
        sel: describe(el),
        text: own.slice(0, 32),
        ratio: null,
        colour: style.color,
        against: 'the animated background, with no halo',
        size: style.fontSize,
      });
      return;
    }

    if (under.kind === 'gradient') {
      skipped.push({
        sel: describe(el),
        text: own.slice(0, 32),
        colour: style.color,
        against: under.gradient.slice(0, 60),
      });
      return;
    }

    // A halo makes the measurement meaningless — the text is no longer sitting
    // directly on the surface below it.
    if (hasHalo) return;

    const r = ratio(composite(fg, under.colour), under.colour);
    if (r >= minRatio) return;
    failures.push({
      sel: describe(el),
      text: own.slice(0, 32),
      ratio: +r.toFixed(2),
      colour: style.color,
      against:
        'rgb(' + under.colour.slice(0, 3).map(Math.round).join(', ') + ')',
      size: style.fontSize,
    });
  });

  // One row per selector/colour pair — a list of twenty identical chips is one
  // problem, not twenty.
  const dedupe = rows => {
    const seen = new Map();
    rows.forEach(row => {
      const key = row.sel + '|' + row.colour + '|' + row.against;
      if (!seen.has(key)) seen.set(key, row);
    });
    return Array.from(seen.values());
  };

  return {
    failures: dedupe(failures).sort((a, b) => (a.ratio ?? 0) - (b.ratio ?? 0)),
    skipped: dedupe(skipped),
  };
};

/** The blog post slugs move, so take one from the index rather than pinning it. */
async function discoverPages(page) {
  await page.goto(`${BASE_URL}/blog/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const post = await page.evaluate(() => {
    const link = Array.from(
      document.querySelectorAll('a[href^="/blog/"]')
    ).find(a => a.getAttribute('href') !== '/blog/');
    return link ? link.getAttribute('href') : null;
  });
  return ['/', '/blog/', '/projects/', '/cv/', '/404/', post].filter(Boolean);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });

const pages = await discoverPages(page);
let totalFailures = 0;
let totalSkipped = 0;

for (const theme of THEMES) {
  for (const path of pages) {
    await page.goto(BASE_URL + path, { waitUntil: 'domcontentloaded' });
    await page.evaluate(t => localStorage.setItem('theme', t), theme);
    await page.reload({ waitUntil: 'domcontentloaded' });
    // The backgrounds mount client-side and the cards settle after them.
    await page.waitForTimeout(900);
    // Open every collapsible, so what they hide is audited too.
    await page.evaluate(() =>
      document.querySelectorAll('details').forEach(d => (d.open = true))
    );
    await page.waitForTimeout(200);

    const { failures, skipped } = await page.evaluate(AUDIT, MIN_RATIO);
    totalFailures += failures.length;
    totalSkipped += skipped.length;

    const tally = failures.length === 0 ? 'ok' : `${failures.length} failing`;
    const note = skipped.length ? `, ${skipped.length} on gradients` : '';
    console.log(`\n${theme.padEnd(5)} ${path.padEnd(28)} ${tally}${note}`);

    failures.forEach(f => {
      const score = f.ratio === null ? '  —  ' : String(f.ratio).padStart(5);
      console.log(
        `  ${score}  ${f.sel}\n         "${f.text}"  ${f.colour} on ${f.against} @${f.size}`
      );
    });
    skipped.forEach(s => {
      console.log(
        `     ?   ${s.sel}  "${s.text}"  ${s.colour} on ${s.against}`
      );
    });
  }
}

await browser.close();

console.log(
  `\n${totalFailures} failing, ${totalSkipped} on gradients (judge those by eye).`
);
process.exit(totalFailures === 0 ? 0 : 1);
