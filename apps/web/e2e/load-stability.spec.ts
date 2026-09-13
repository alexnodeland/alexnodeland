import { expect, test, type Page } from '@playwright/test';

/**
 * What a page must look like on the frame it first appears, as opposed to
 * once its JavaScript has arrived.
 *
 * The counterpart to navigation-stability.spec.ts, which asks the same
 * question of a page arrived at rather than landed on. Everything here is
 * about the gap between the two: the server's markup is on screen long before
 * the page bundle has downloaded and hydrated, and for that whole window the
 * page is whatever the stylesheet alone can make of it.
 *
 * It used not to be much. The fold's distances are properties of rendered
 * text, so they are measured rather than written down, and until the shell had
 * mounted and measured them the window sat a whole band too low — 82px on a
 * desktop, 114 on a phone — with a post's brand still centred 467px from where
 * it belongs. On a fast connection that was two frames. On a phone it was a
 * second of a visibly wrong page and then everything moving at once, which is
 * the bug this file exists to keep fixed: the measuring now happens in the
 * markup, in a script the shell renders immediately after the hero (see
 * src/lib/foldAnchor.ts), so the first frame is the settled one.
 */

// A post is in here on purpose: its hero is pinned, so its brand is folded from
// the first frame rather than folding as the reader scrolls — which made it the
// worst of the shifts (467px sideways on a desktop) and makes it the one most
// worth holding still.
const ROUTES = [
  '/',
  '/cv/',
  '/projects/',
  '/timeline/',
  '/timeline/260913_statusbar/',
];

// Everything a reload used to move. The window in its three layers, the hero's
// title, and the three floating controls on the field.
const MARKS = [
  '.window',
  '.window-frame',
  '.window-edge',
  '.layout',
  '.window-band',
  '.stage > .site-hero:not(.hero-ghost) h1',
  '.nav',
  '.chat-icon-container',
  '.background-controls',
  '.mobile-interactivity-launcher',
];

type Boxes = Record<string, [number, number, number, number] | null>;

// Registered before anything on the page runs, so the reading is taken on the
// first frame the browser offers rather than the first one this test asks for.
//
// The frame it waits for is the first one with a window in it. A body that
// arrives in pieces gets painted in pieces, and the earliest frames are the
// hero on its own — nothing has told the browser where the window goes because
// the window is not there yet. The question this file asks starts the moment it
// is: wherever it first appears is where it has to stay.
const captureFirstFrame = (marks: string[]) => {
  const read = (): Record<string, number[] | null> => {
    const out: Record<string, number[] | null> = {};
    for (const selector of marks) {
      const el = document.querySelector(selector);
      if (!el) {
        out[selector] = null;
        continue;
      }
      const rect = el.getBoundingClientRect();
      out[selector] = [rect.x, rect.y, rect.width, rect.height].map(
        value => Math.round(value * 10) / 10
      );
    }
    return out;
  };
  (window as unknown as { __read: typeof read }).__read = read;
  const watch = () => {
    if (document.querySelector('.layout')) {
      (window as unknown as { __firstFrame: unknown }).__firstFrame = read();
      return;
    }
    requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
};

const firstFrame = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __firstFrame: Boxes }).__firstFrame
  );

const settled = (page: Page) =>
  page.evaluate(() => (window as unknown as { __read: () => Boxes }).__read());

for (const route of ROUTES) {
  test(`${route} is already where it lands on the frame it appears`, async ({
    page,
  }) => {
    // The dev server hands over an empty shell and builds the page in the
    // browser, so there is no served frame to hold still — this is a question
    // about markup, and it can only be asked of a build. Point the suite at
    // one (PLAYWRIGHT_BASE_URL against `gatsby serve`) to run it. Asked of the
    // response rather than of the rendered page, because a page the browser
    // built would answer yes to everything below and pass for no reason.
    const served = await (await page.request.get(route)).text();
    test.skip(
      !served.includes('class="layout"'),
      'no server-rendered markup: run against a build, not the dev server'
    );

    await page.addInitScript(captureFirstFrame, MARKS);
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);

    const first = await firstFrame(page);
    expect(first, 'never saw a frame with a window in it').toBeTruthy();

    const last = await settled(page);

    for (const selector of MARKS) {
      // A mark that only exists at one of the two widths, or that mounts with
      // the simulation, is not what this is about. Anything present on the
      // first frame has to still be exactly there on the last.
      if (first[selector] === null) continue;
      expect(last[selector], `${selector} left its place`).toEqual(
        first[selector]
      );
    }
  });
}

test('the anchor is measured in the markup, ahead of what it measures for', async ({
  page,
}) => {
  await page.goto('/timeline/');
  await page.waitForLoadState('networkidle');

  // The script has to sit between the hero it reads and the window whose
  // geometry is the answer. Moved after the window — or to the foot of the
  // document, where it started — the browser gets to paint the window before
  // anything has told it where the window goes, which on a slow connection is
  // exactly the shift this is guarding.
  const order = await page.evaluate(() => {
    const stage = document.querySelector('.stage');
    if (!stage) return null;
    const children = Array.from(stage.children);
    return {
      hero: children.findIndex(el => el.matches('.site-hero:not(.hero-ghost)')),
      anchor: children.findIndex(
        el =>
          el.tagName === 'SCRIPT' &&
          el.textContent?.includes('--hero-rest-height')
      ),
      window: children.findIndex(el => el.matches('.window')),
    };
  });

  expect(order).not.toBeNull();
  expect(order!.hero).toBeGreaterThanOrEqual(0);
  expect(order!.anchor).toBeGreaterThan(order!.hero);
  expect(order!.window).toBeGreaterThan(order!.anchor);
});
