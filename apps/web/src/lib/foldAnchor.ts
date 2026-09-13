/**
 * The fold's measured distances — the numbers the stylesheet cannot work out
 * for itself, because they are properties of rendered text.
 *
 * The hero folds as the window scrolls: the title shrinks and parks on the
 * column's left edge, the tagline rises to sit beside it, and the window's
 * frame climbs into the room the hero gives up. How far each of those travels
 * depends on how wide this page's title happens to be set, which is a question
 * only a laid-out document can answer. So they are measured and published as
 * custom properties, and the stylesheet does the choreography from there (see
 * `.site-hero.is-collapsible` in layout.scss).
 *
 * The catch is *when*. Layout re-measures on every resize and every
 * navigation, but its first run cannot happen until the page bundle has
 * downloaded and hydrated — and the server's markup has been on screen since
 * long before that. Until the numbers land, `--hero-rest-height` is unset,
 * `--fold-band` computes to zero, and the window sits the whole band too low
 * with the title still centred. On a fast connection that is two frames. On a
 * phone it was over a second of a visibly wrong page, and then everything
 * moving at once.
 *
 * So this is also the page's anchor: the shell puts this function's own source
 * into a script tag in the markup, immediately after the hero (see FOLD_ANCHOR
 * and its use in layout.tsx), and it runs there as the page parses.
 *
 * Immediately after the hero, and not at the end of the body, because a body
 * that arrives over a slow connection is parsed and painted in pieces — the
 * browser does not wait for the last byte to show the first screen. Measured at
 * the end, the numbers landed a frame or two after the window had already been
 * painted in the wrong place, which is the whole bug wearing a smaller hat.
 * Everything this reads — the nav capsule, the stage, the hero and its two
 * lines — is above it in the document and final by the time it runs; the window
 * whose position depends on the answer is below it and has not been laid out
 * yet. So the first frame that contains the window contains it in the right
 * place.
 *
 * That is also what the shape of this file is about. It is one function with no
 * imports and no free names but the globals, because it has to survive being
 * turned back into source by `toString()` and dropped into a script tag on
 * its own. Nothing here may reach outside itself.
 */
export function publishFoldMeasures(hero?: HTMLElement | null): void {
  // The live hero, not the one leaving: a navigation parks a ghost copy in
  // the stage, and it carries its own frozen measures (see the ghost's
  // inline style in layout.tsx).
  const region =
    hero ||
    document.querySelector<HTMLElement>(
      '.stage > .site-hero.is-collapsible:not(.hero-ghost)'
    );
  if (!region) return;

  const stage = region.parentElement;
  const h1 = region.querySelector<HTMLElement>('h1');
  const sub = region.querySelector<HTMLElement>('p');
  // The registry owns the element the two sit in, so that — not the hero
  // region, which is padded — is the column they travel across. A hero of
  // some other shape simply gets no split.
  const container = h1 ? h1.parentElement : null;
  if (!stage || !h1 || !sub || !container) return;

  // Everything is read before anything is written: a custom property landing
  // on the region invalidates its subtree, and a measurement taken after it
  // pays for the recalculation. The whole point of this pass is that it costs
  // one layout, not seven.
  const width = container.clientWidth;
  const titleWidth = h1.offsetWidth;
  const titleHeight = h1.offsetHeight;
  const subWidth = sub.offsetWidth;
  const subHeight = sub.offsetHeight;

  // Where the title's line box sits at rest, from the top of the stage (the
  // region is the offset parent, and it starts at the stage's top). Summed up
  // the offset chain rather than taken from a rect, which is unaffected by any
  // transform on the way — the point being that the title is measured while it
  // may be mid-fold.
  let titleTop = 0;
  let node: HTMLElement | null = h1;
  while (node && node !== region) {
    titleTop += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }

  // The line the phone's folded title lands on: the nav capsule's centre. Real
  // pixels rather than a guess from the font — the cover's title and the
  // crumb's have different metrics, and an em-based rise put them on different
  // lines.
  const rail = document.querySelector<HTMLElement>('.nav');
  const railCentre = rail ? rail.offsetTop + rail.offsetHeight / 2 : null;

  // How far the title shrinks when folded. The stylesheet's number, per
  // breakpoint, read back rather than restated here.
  const DEFAULT_TITLE_SCALE = 0.55;
  const declared = parseFloat(
    getComputedStyle(region).getPropertyValue('--collapsed-title-scale')
  );
  const titleScale = declared || DEFAULT_TITLE_SCALE;

  // Whether the tagline actually fits beside the shrunken title. Most of them
  // do, and this is 1; the projects tagline is nearly the full column wide, so
  // it scales down — pinned to its right edge — by exactly the amount it
  // overruns rather than colliding with the title. COLLAPSED_GAP is the space
  // left between the two once they share a row.
  const COLLAPSED_GAP = 24;
  const room = width - titleWidth * titleScale - COLLAPSED_GAP;
  const subScale = subWidth > 0 ? Math.min(1, room / subWidth) : 1;

  // Written only where the value is actually new. Layout calls this from a
  // ResizeObserver, which fires on every frame of the hero's height ease, and
  // the text-derived distances are the same on all of them — re-stating one
  // would invalidate the hero's subtree once per animation frame. The check is
  // against the inline style, so it costs a string compare and no layout.
  const set = (el: HTMLElement, name: string, value: string): void => {
    if (el.style.getPropertyValue(name) !== value) {
      el.style.setProperty(name, value);
    }
  };

  // The split: at full collapse the title parks on the left edge and the
  // tagline on the right, each travelling half of its leftover space, and the
  // tagline rises to the title's centreline.
  set(region, '--title-shift', `${(width - titleWidth) / 2}px`);
  set(region, '--sub-shift', `${(width - subWidth) / 2}px`);
  set(region, '--sub-scale', String(subScale));
  set(region, '--title-centre', `${titleTop + titleHeight / 2}px`);

  // These two land on the stage rather than the hero: the window's frame reads
  // the band they make, and it is not in the hero's subtree.
  if (railCentre !== null) {
    set(stage, '--rail-centre', `${railCentre}px`);
  } else {
    stage.style.removeProperty('--rail-centre');
  }
  set(stage, '--row-lift', `${(titleHeight + subHeight) / 2}px`);

  // The hero's resting box, which the stylesheet turns into the band the
  // window reaches up by — and the band is what the hero's negative bottom
  // margin gives back, so the window's top edge holds still only while the two
  // describe the same box. That is why this is the region as it stands rather
  // than the height it is settling at: during a navigation the region eases
  // between two heroes, and a band fixed at the destination would step the
  // window's edge down by the difference and then walk it back over the
  // transition.
  //
  // The real box, unrounded, rather than the offset height. The cancellation
  // above is what pins the window's edge, and it cancels exactly only if the
  // band is the height the region actually occupies: rounded, each hero leaked
  // its own fraction into that edge, so the drawn hairline sat at a slightly
  // different place per page (76.45 on the cover, 75.98 on the blog at a 2.75
  // pixel ratio) and shifted as one gave way to the other. Rounding it back to
  // hundredths left a tenth of that; the raw reading is already snapped to the
  // device's own grid.
  set(
    stage,
    '--hero-rest-height',
    `${region.getBoundingClientRect().height}px`
  );
}

/**
 * The anchor as a line of script: the function above, its own source, called
 * where it stands. Rendered into the markup by layout.tsx.
 *
 * It is a `<script>` in the middle of the document on purpose. Parsing stops
 * for as long as it takes, which is one forced layout of a hero that was about
 * to be laid out anyway, and in exchange nothing downstream of it is ever
 * painted un-measured.
 */
export const FOLD_ANCHOR = `(${publishFoldMeasures})()`;
