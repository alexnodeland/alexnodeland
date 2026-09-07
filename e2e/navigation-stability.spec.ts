import { expect, test, type Page } from '@playwright/test';

/**
 * What a page must look like after arriving at it, as opposed to landing on
 * it.
 *
 * The shell mounts once and every page after the first arrives through it, so
 * a hero can be measured, folded, ghosted and swapped without the document
 * ever reloading. Each of those left something behind at least once: an
 * origin written on the title that turned every later fold about the wrong
 * point, an outgoing hero that dropped out of the folded row it was wearing,
 * an arrival animation that held the hero at rest over content already
 * rising, a ghost that stayed in the stage's column and pushed the window
 * down by its own height, and a focus the router moves for accessibility that
 * left the window unscrollable from the keyboard.
 *
 * None of them showed on a cold load, which is why they are all written the
 * same way here: do it the long way round, and assert the page is the one a
 * visitor would have got by typing the address.
 */

// The shell takes a beat to mount: the background is lazy-loaded, the panels
// restore from localStorage after hydration, and the fold's distances are
// measured from rendered text.
const settle = async (page: Page, ms = 1100) => {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(ms);
};

// The window is the scroll container; the page never scrolls. Twice, because
// the first pass can land while the arriving content is still settling.
const scrollToEnd = async (page: Page) => {
  for (let pass = 0; pass < 2; pass += 1) {
    await page.evaluate(() => {
      const layout = document.querySelector('.layout') as HTMLElement;
      layout.scrollTop = layout.scrollHeight;
    });
    await page.waitForTimeout(250);
  }
};

const goHome = (page: Page) => page.click('.site-hero [data-brand-anchor]');
const goTo = (page: Page, href: string) =>
  page.click(`.nav a[href="${href}"], .nav a[href="${href}/"]`);

// The folded row, to a tenth of a pixel: where the title and the tagline
// finish, and where the window's hairline finishes with them.
const foldedRow = (page: Page) =>
  page.evaluate(() => {
    const hero = document.querySelector('.site-hero') as HTMLElement;
    const box = (el: Element | null) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return [+rect.left.toFixed(1), +rect.top.toFixed(1)];
    };
    return {
      title: box(hero.querySelector('h1')),
      tagline: box(hero.querySelector('p')),
      edge: box(document.querySelector('.window-edge')),
      band: getComputedStyle(document.querySelector('.window-band')!).height,
    };
  });

// Every test here does the long way round — a cold load to take the reading,
// then the same page reached through the shell — so each is several page
// loads and several deliberate settles. The default per-test budget is for
// one page.
test.describe.configure({ timeout: 120_000 });

test.describe('navigation stability', () => {
  test('a hero folds to the same row it was arrived at as it was loaded at', async ({
    page,
  }) => {
    // The homepage is the one that shows it: its title carries the brand
    // anchor, so the flip that travels "alex" between two heroes lands on the
    // very element the fold scales — and an origin left behind on it folded
    // the name about its top rather than its middle, half a line above the
    // page picker it is supposed to sit level with.
    await page.goto('/');
    await settle(page);
    await scrollToEnd(page);
    const loaded = await foldedRow(page);

    await goTo(page, '/blog');
    await page.waitForURL(/\/blog\/?$/);
    await page.waitForTimeout(900);
    await goHome(page);
    await page.waitForURL(/\/$/);
    await page.waitForTimeout(900);
    await scrollToEnd(page);

    expect(await foldedRow(page)).toEqual(loaded);
  });

  test('every page folds the same way round the site as it does on arrival', async ({
    page,
  }) => {
    // Sixteen page loads and twelve navigations, each with a settle of its own.
    test.setTimeout(300_000);
    const pages = ['/', '/blog', '/projects', '/cv'];
    const loaded: Record<string, unknown> = {};
    for (const path of pages) {
      await page.goto(path);
      await settle(page);
      await scrollToEnd(page);
      loaded[path] = await foldedRow(page);
    }

    for (const from of pages) {
      for (const to of pages) {
        if (from === to) continue;
        await page.goto(from);
        await settle(page, 700);
        if (to === '/') await goHome(page);
        else await goTo(page, to);
        await page.waitForURL(new RegExp(`^.*${to === '/' ? '/' : to}/?$`));
        await page.waitForTimeout(900);
        await scrollToEnd(page);
        expect(await foldedRow(page), `${from} → ${to}`).toEqual(loaded[to]);
      }
    }
  });

  test('the window holds its box while one hero is swapped for another', async ({
    page,
  }) => {
    await page.goto('/');
    await settle(page);
    const windowBox = () =>
      page.evaluate(() => {
        const rect = document.querySelector('.window')!.getBoundingClientRect();
        return [+rect.top.toFixed(1), +rect.height.toFixed(1)];
      });
    const before = await windowBox();

    // The outgoing hero is a second .site-hero parked over the live one. Ranked
    // below the collapsible hero's own rules it took their `position: relative`
    // and stayed in the stage's column — a hero-sized box in the flow, which
    // pushed the window down by its height for the length of every navigation:
    // 144px on a desktop, 126px on a phone.
    //
    // Within a pixel, not to the bit. The edge is pinned by a cancellation —
    // the band the hero's negative bottom margin gives back is the height it
    // occupies — which is exact, but the folded height it lands on is a token
    // sum that a hero with a taller tagline would legitimately move. A pixel
    // is a long way inside the regression this is here to catch.
    await goTo(page, '/blog');
    for (let sample = 0; sample < 8; sample += 1) {
      await page.waitForTimeout(60);
      const [top, height] = await windowBox();
      expect(top, `window top at sample ${sample}`).toBeCloseTo(before[0], 0);
      expect(height, `window height at sample ${sample}`).toBeCloseTo(
        before[1],
        0
      );
    }
  });

  test('the hero folds under a reader who scrolls the moment they arrive', async ({
    page,
  }) => {
    await page.goto('/');
    await settle(page);
    await page.goto('/cv');
    await settle(page);
    await scrollToEnd(page);
    const loaded = await foldedRow(page);

    // The arrival animates the title, the tagline and the brand, and each of
    // them holds `transform` outright while it runs — which outranks the fold.
    // Scrolled into, the hero used to sit at rest above content already
    // rising, and then snap into the row when the arrival finished.
    await page.goto('/');
    await settle(page);
    await goTo(page, '/cv');
    await page.waitForURL(/\/cv\/?$/);
    await scrollToEnd(page);

    expect(await foldedRow(page)).toEqual(loaded);
  });

  test('the outgoing hero keeps the fold the reader was looking at', async ({
    page,
  }) => {
    await page.goto('/');
    await settle(page);
    await scrollToEnd(page);
    const live = await page.evaluate(() => {
      const rect = document
        .querySelector('.site-hero h1')!
        .getBoundingClientRect();
      return [+rect.left.toFixed(1), +rect.top.toFixed(1)];
    });

    // The fold's distances are the rendered text's, so they live on the live
    // region — and the ghost is its sibling, not its child. Without a copy it
    // spent its whole exit snapped back to the resting, centred layout: the
    // one thing it exists to avoid.
    await goTo(page, '/blog');
    const ghost = await page.evaluate(async () => {
      for (let tries = 0; tries < 40; tries += 1) {
        const el = document.querySelector('.hero-ghost h1');
        if (el) {
          const rect = el.getBoundingClientRect();
          return [+rect.left.toFixed(1), +rect.top.toFixed(1)];
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return null;
    });

    expect(ghost, 'the outgoing hero should be on screen').not.toBeNull();
    expect(ghost![0]).toBeCloseTo(live[0], 0);
    expect(ghost![1]).toBeCloseTo(live[1], 0);
  });

  test('the page keys still scroll the window after a link is followed', async ({
    page,
  }) => {
    await page.goto('/');
    await settle(page);

    // The router moves focus to its own wrapper after every client-side
    // navigation, and that wrapper is outside the scroller — so reading
    // "something is focused" as "someone else will handle this" left the
    // window unscrollable from the keyboard until a click put focus back in
    // it. Only a field or a scroller of its own owns these keys.
    await goTo(page, '/blog');
    await page.waitForURL(/\/blog\/?$/);
    await page.waitForTimeout(900);

    const scrollTop = () =>
      page.evaluate(
        () => (document.querySelector('.layout') as HTMLElement).scrollTop
      );
    expect(await scrollTop()).toBe(0);
    await page.keyboard.press('PageDown');
    await expect
      .poll(scrollTop, { message: 'PageDown should page the window' })
      .toBeGreaterThan(0);

    // A field still keeps its own keys. The search box is folded away behind
    // the chip in the control row until it is asked for.
    await page.click('.ui-search-toggle');
    await page.click('#blog-search .search-input');
    const parked = await scrollTop();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    expect(await scrollTop()).toBe(parked);
  });
});
