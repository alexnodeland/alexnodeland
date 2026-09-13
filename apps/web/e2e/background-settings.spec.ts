import { expect, test, type Page } from '@playwright/test';

/**
 * The background settings panel, on a phone and on a desktop.
 *
 * Everything here was a way the panel hid its own contents. The sheet let its
 * header take three quarters of itself and scroll inside that, which left the
 * settings in a twenty-pixel slit under a paragraph with a scrollbar of its
 * own. And the note behind each control's `?` lived inside the scrolling list,
 * so the list clipped it — on a phone, where the list can be two rows tall, it
 * was never visible at all, and being shown on hover it could not be opened by
 * a thumb in the first place.
 *
 * So the tests are: every control that offers a note can be made to show one,
 * the note is inside the panel when it does, and the settings are reachable
 * whatever the description is doing.
 */

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

// Every background in the set, by the id the provider stores.
const BACKGROUNDS = [
  'simple-waves',
  'cellular-automaton',
  'pde-solver',
  'graph-topology',
  'shortest-path-lab',
  'spectrogram-oscilloscope',
];

// Which background is up is a restored setting, so the way to ask for one is to
// have been here before. Arrow-keying through the set from inside the open
// panel works for a reader and not for a test: the set also cycles on its own,
// and the panel it re-renders underneath is the thing being measured.
const openPanel = async (page: Page, phone: boolean, background?: string) => {
  if (background) {
    await page.addInitScript(id => {
      window.localStorage.setItem(
        'animatedBackgroundSettings',
        JSON.stringify({ currentBackgroundId: id, settings: {} })
      );
    }, background);
  }
  await page.goto('/timeline/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
  if (phone) {
    await page.click('.mobile-interactivity-btn');
    await page.waitForTimeout(500);
    await page.click('.mobile-explore-name');
  } else {
    await page.keyboard.press('s');
  }
  await page.waitForSelector('.settings-sidebar');
  await page.waitForTimeout(600);
};

// A desktop keeps its controls two levels down — sections, then the categories
// inside them, every one closed to start with. So every `?` in the panel is
// behind a click, and the sweep has to make them all.
const openEverySection = async (page: Page) => {
  const headers = page.locator('.category-header');
  for (let i = 0; i < (await headers.count()); i += 1) {
    const header = headers.nth(i);
    if (!(await header.isVisible())) continue;
    if ((await header.getAttribute('aria-expanded')) === 'true') continue;
    await header.click();
    await page.waitForTimeout(100);
  }
};

// The mark is the site's own, not the browser's. A <button> arrives with a
// light grey fill and the system's font unless it is told otherwise, and for a
// while these were four pale boxes in a column of hairlines.
const checkMark = async (page: Page) => {
  const worn = await page
    .locator('.setting-help')
    .first()
    .evaluate(el => {
      const style = getComputedStyle(el);
      return {
        background: style.backgroundColor,
        font: style.fontFamily,
        border: style.borderTopColor,
      };
    });
  expect(worn.background).toBe('rgba(0, 0, 0, 0)');
  expect(worn.font).toContain('JetBrains Mono');
  expect(worn.border).toBe('rgba(255, 255, 255, 0.16)');
};

// Open the note on one mark and check it landed inside the panel.
const checkNote = async (page: Page, mark: ReturnType<Page['locator']>) => {
  // Scrolled into view by hand rather than by the actionability check: the
  // panel sits over a canvas that repaints every frame, and "wait for the
  // element to be stable" can wait forever on one.
  await mark.evaluate(el =>
    el.scrollIntoView({
      block: 'center',
      behavior: 'instant',
    })
  );
  // The note is put away by a scroll of the list under it, so the list has to
  // have finished moving before the mark is pressed.
  await page.waitForTimeout(80);
  // Forced, and deliberately: the panel sits over a canvas that repaints every
  // frame and the actionability check can never call a chip on it "stable".
  // What is being tested is where the note lands, not whether a button can be
  // hit.
  await mark.click({ force: true });
  await expect(page.locator('.setting-note')).toBeVisible();

  // Read in one pass: two round trips leave a window for the note to be put
  // away between them by something the first one started.
  const seen = await page.evaluate(() => {
    const note = document.querySelector('.setting-note');
    const panel = document.querySelector('.settings-sidebar');
    if (!note || !panel) return null;
    const a = note.getBoundingClientRect();
    const b = panel.getBoundingClientRect();
    return {
      note: { x: a.x, y: a.y, right: a.right, bottom: a.bottom },
      panel: { x: b.x, y: b.y, right: b.right, bottom: b.bottom },
      text: (note.textContent ?? '').trim(),
    };
  });

  expect(seen).not.toBeNull();
  // Inside the panel on every side, to the pixel.
  expect(seen!.note.x).toBeGreaterThanOrEqual(seen!.panel.x - 1);
  expect(seen!.note.y).toBeGreaterThanOrEqual(seen!.panel.y - 1);
  expect(seen!.note.right).toBeLessThanOrEqual(seen!.panel.right + 1);
  expect(seen!.note.bottom).toBeLessThanOrEqual(seen!.panel.bottom + 1);
  // And carrying something to read.
  expect(seen!.text.length).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await expect(page.locator('.setting-note')).toHaveCount(0);
};

for (const phone of [true, false]) {
  const where = phone ? 'phone' : 'desktop';

  test.describe(`background settings — ${where}`, () => {
    // Reduced motion stops the twelve-second cycle, which would otherwise swap
    // the whole panel out from under the sweep mid-assertion. It is also the
    // honest way to ask: the panel has to work for a reader who asked for it.
    test.use({
      viewport: phone ? PHONE : DESKTOP,
      reducedMotion: 'reduce',
    });

    // Not under an emulated device. This file sets its own viewports — a
    // phone's and a desktop's — and asking a device that is a phone to be
    // 1440 wide is a request it declines.
    test.skip(
      ({ isMobile }) => Boolean(isMobile),
      'this file drives its own viewports; it does not want a device on top'
    );

    // The note has to be *in* the panel, not clipped off the end of a list
    // inside it. Checked against the panel's own box for every `?` in every
    // category of every background, which is the only way to catch the one
    // control near an edge that the others do not exercise.
    for (const background of BACKGROUNDS) {
      test(`every note ${background} offers opens inside the panel`, async ({
        page,
      }) => {
        // The oscillator alone carries two dozen controls across nine
        // categories, and every one of them is a press, a measurement and a
        // dismissal.
        test.setTimeout(150_000);
        await openPanel(page, phone, background);

        let checked = 0;
        const tabs = page.locator('.category-tabs button');
        const tabCount = phone ? await tabs.count() : 1;

        for (let t = 0; t < Math.max(tabCount, 1); t += 1) {
          if (phone) {
            const tab = tabs.nth(t);
            await tab.evaluate(el =>
              el.scrollIntoView({
                block: 'nearest',
                inline: 'center',
                behavior: 'instant',
              })
            );
            await tab.click({ force: true });
            await page.waitForTimeout(200);
          } else {
            await openEverySection(page);
          }

          // A ceiling per pass. The oscillator alone carries two dozen
          // controls over a live audio graph and a canvas repainting every
          // frame, and a browser driven through all of them at once stops
          // answering. What is being checked is where a note lands, which the
          // first few in each category establish as well as all of them.
          const marks = page.locator('.setting-help');
          const total = Math.min(await marks.count(), 4);
          for (let m = 0; m < total; m += 1) {
            const mark = marks.nth(m);
            if (!(await mark.isVisible())) continue;
            await checkNote(page, mark);
            checked += 1;
          }
        }

        // The sweep is worthless if it found nothing to sweep.
        expect(checked).toBeGreaterThan(0);
      });
    }

    test('a note closes on the next thing the reader does', async ({
      page,
    }) => {
      await openPanel(page, phone, 'shortest-path-lab');
      if (!phone) await openEverySection(page);
      await checkMark(page);
      const mark = page.locator('.setting-help').first();
      await mark.click({ force: true });
      await expect(page.locator('.setting-note')).toBeVisible();

      // The same mark again is "put it away".
      await mark.click({ force: true });
      await expect(page.locator('.setting-note')).toHaveCount(0);

      // So is a tap anywhere else in the panel.
      await mark.click({ force: true });
      await expect(page.locator('.setting-note')).toBeVisible();
      await page.locator('.settings-sidebar .background-name').click();
      await expect(page.locator('.setting-note')).toHaveCount(0);

      // So is scrolling the list out from under it. The note arms that listener
      // a frame after it opens — opening it resizes the list, and a list that
      // has just been resized emits a scroll of its own — so the frame has to
      // have happened before the scroll is sent.
      await mark.click({ force: true });
      await expect(page.locator('.setting-note')).toBeVisible();
      await page.waitForTimeout(250);
      await page.evaluate(() => {
        const list = document.querySelector('.settings-content');
        if (list) {
          list.scrollTop += 40;
          list.dispatchEvent(new Event('scroll'));
        }
      });
      await expect(page.locator('.setting-note')).toHaveCount(0);
    });
  });
}

test.describe('the settings sheet on a phone', () => {
  test.use({ viewport: PHONE, reducedMotion: 'reduce' });

  // Not under an emulated device — see the note in the suite above.
  test.skip(
    ({ isMobile }) => Boolean(isMobile),
    'this file drives its own viewports; it does not want a device on top'
  );

  // The header used to be allowed 45vh of a 60vh sheet and to scroll inside
  // that. Both numbers here are the point: the description fits without a
  // scrollbar of its own, and the controls keep a real share of the sheet.
  for (const background of BACKGROUNDS) {
    test(`${background}'s description fits, and leaves the controls room`, async ({
      page,
    }) => {
      await openPanel(page, true, background);

      await page.click('.description-toggle');
      await page.waitForTimeout(500);

      const measure = await page.evaluate(() => {
        const box = (selector: string) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          return {
            height: Math.round(el.getBoundingClientRect().height),
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
          };
        };
        return {
          sheet: box('.settings-sidebar'),
          header: box('.sidebar-header'),
          info: box('.background-info'),
          content: box('.settings-content'),
        };
      });

      // Nothing inside the header scrolls inside itself.
      expect(measure.info!.scrollHeight).toBeLessThanOrEqual(
        measure.info!.clientHeight + 1
      );
      expect(measure.header!.scrollHeight).toBeLessThanOrEqual(
        measure.header!.clientHeight + 1
      );
      // And the controls keep a real share of the sheet. The header used to be
      // allowed 45vh of a 60vh one and the list was left with twenty pixels.
      expect(measure.header!.height).toBeLessThan(measure.sheet!.height * 0.7);
      expect(measure.content!.height).toBeGreaterThan(60);
    });
  }

  // The reader's way out of a description they have finished with: go looking
  // for a control, and it goes away.
  test('the description folds away when the settings are scrolled', async ({
    page,
  }) => {
    await openPanel(page, true, 'pde-solver');
    await page.click('.description-toggle');
    await page.waitForTimeout(450);

    const open = () =>
      page.evaluate(() =>
        document
          .querySelector('.background-info')!
          .className.includes('is-open')
      );
    expect(await open()).toBe(true);
    const before = await page.evaluate(
      () => document.querySelector('.sidebar-header')!.clientHeight
    );

    // The gesture, not the offset: the description gets out of the way when the
    // reader reaches for a control, and a list too short to scroll would never
    // have told it so.
    await page.locator('.settings-content').dispatchEvent('wheel');
    await page.waitForTimeout(500);

    expect(await open()).toBe(false);
    // And the room it was holding is given back.
    const after = await page.evaluate(
      () => document.querySelector('.sidebar-header')!.clientHeight
    );
    expect(after).toBeLessThan(before);
  });
});
