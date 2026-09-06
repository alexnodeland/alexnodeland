# design audit — motion, spacing, and what else turned up

Companion to [`00-original-review.md`](./00-original-review.md) and
[`01-decisions.md`](./01-decisions.md). Those two set the system; this is a
fine-tooth pass over what shipped, looking for the places the system is not yet
one system.

**Scope.** Every stylesheet (`src/styles/*.scss`, 8,661 lines), every component
that carries motion or chrome, the shell (`layout.tsx`), the pages, and the
config. Where a claim could be measured it was: the numbers below come from a
dev build at 1440×900 and 390×844, read with a headless browser.

**Status.** Findings only. Nothing here has been changed. Each item carries a
grade — **P1** visibly wrong today, **P2** two answers to one question, **P3**
hygiene — and the last section proposes the standards that would close most of
the P2s at once.

---

## 0. the hero collapse jitters on a phone

Reported by the owner, reproduced in the mechanism if not on a device. The
collapse (`layout.tsx`, `.site-hero.is-collapsible` in `layout.scss`) is a
scroll-linked effect written from JavaScript, and on a phone it does four
things per scroll frame that are each known to stutter on touch.

### what the probe shows

Scrolling the window from 0 to 160px, reading the hero and window boxes after
each step:

| viewport | hero height, rest → collapsed | window top moves | window height changes | content speed vs finger |
| -------- | ----------------------------- | ---------------- | --------------------- | ----------------------- |
| 390 wide | 193.8px → 76.6px              | 117px            | 578px → 695px         | ~1.73×                  |
| 1440 wide | 228px → 145px               | 83px             | 568px → 651px         | ~1.52×                  |

And the published value steps in hundredths: `scrollTop` 1 and 2 both read
`--hero-collapse: 0.01`; on the desktop a single step moves the title 3.5px.

### why it jitters, in order of weight

1. **The scroll container is resized during the gesture.** The window is
   `flex: 1` under the hero, so every pixel the hero gives up is a pixel the
   window grows by, on the same frame the finger is moving it. Two things
   follow. The browser has to re-lay-out the scroller and re-clamp its scroll
   position mid-gesture, which is the classic source of touch stutter. And the
   content on screen moves at the finger's speed *plus* the collapse rate —
   1.7× on a phone — so it slips under the thumb rather than tracking it 1:1,
   which the eye reads as jitter even when every frame is on time. Nothing
   else on the site breaks 1:1 tracking; this is the one place touch does not
   feel native.
2. **Four layout properties ride the scroll.** `padding-top`, `padding-bottom`
   and the `h1`'s `margin-bottom` on the hero, and the tagline's `max-height`,
   are all functions of `--hero-collapse`. Each write is a style recalc plus a
   layout of the stage and everything under it, then a repaint of the blurred
   window whose box just changed. The comment in `layout.scss` says the
   transitions on these were removed so the layout engine would stop running
   past every notch; it still runs on every frame that moves.
3. **The `ResizeObserver` forces a layout read every frame.** The split
   measurement (`measure()` in `layout.tsx`) is re-run by the observer on
   every frame of the collapse, because the hero *is* the element resizing.
   The key check drops the style writes, but the reads — `offsetWidth`,
   `offsetHeight`, `clientWidth` — still force a synchronous layout on each
   call, so the browser lays out twice per frame: once for the write, once for
   the read.
4. **The value is quantised to 1/100.** `write()` rounds to two decimals and
   skips equal values. That is a 1.6px scroll granularity and, on the desktop,
   a 3.5px title jump per step; on a phone, a 0.6px translate and a 0.5%
   scale step. With the exponential ease on the desktop this is smoothed; on a
   phone, where the finger's own position is written straight through, every
   step is a discrete jump. It also means a slow, deliberate drag moves the
   title in visible increments.
5. **The title carries a `text-shadow` while it scales.** The `over-background`
   halo is a two-layer shadow on the `h1`, and a shadowed text run that scales
   cannot be composited from a cached raster — it re-rasterises every frame.
   Nothing in the collapse is promoted to its own layer (`will-change` is only
   used on the 404), so the whole hero paints on the main thread each step.
6. **Two large backdrop blurs share the frame.** The veil (`blur(18px)`, 140px
   tall on a phone) fades in over exactly the same first 90px of scroll, and
   the chips run `blur(10px)` under it. The mixin comments already acknowledge
   the chip blur was halved on phones for this reason; the veil kept its full
   radius.
7. **The homepage runs a scroll spy for a class nothing styles.** `index.tsx`
   still calls `useScrollSpy('.expertise-item')`, which attaches a capturing
   scroll listener and calls `getBoundingClientRect()` on six cards every
   frame that moves — and `index.scss` has no `.is-active` rule left to
   consume it. That is a forced layout per frame, on the page with the
   collapse.
8. **JS scroll linkage is one frame behind by construction.** The scroll event
   fires, the rAF writes, the next paint shows it. On a phone with momentum
   this reads as the title lagging the content by a frame. This is not
   fixable while the collapse is driven from JS; it is why the structural fix
   below matters.

### fixes

Quick, in the order they pay off:

- **Stop resizing the window during the gesture.** Give the hero a fixed
  height (its rest height) and let the title and tagline move by transform
  alone. Hand the freed space back once, at rest — either by transitioning
  the hero's height in a single 200ms ease when the collapse crosses a
  threshold (the way a native large-title header snaps), or by translating
  the window up via `transform` and letting it overhang the bottom inset by
  the difference until the scroll settles. Either way the scroller's box is
  constant while the finger is down, and content tracks 1:1.
- **Move the remaining collapse properties off layout.** `max-height` on the
  tagline becomes `transform: scaleY()` + `opacity` with
  `transform-origin: top`; the `h1` margin hand-back goes with the height
  change above. After this the per-frame work is transform and opacity only.
- **Drop the quantisation or make it fine.** Round to three decimals (a 0.16px
  scroll step) or not at all; a style write of one custom property is far
  cheaper than the layout it currently triggers, and once the layout
  properties are gone the write is all that is left.
- **Promote the moving parts and lose the shadow while they move.**
  `will-change: transform` on the `h1` and `p` for the duration of the
  collapse (set when `--hero-collapse` leaves 0, cleared at rest), and swap
  the `text-shadow` halo for a `filter: drop-shadow()` on a promoted layer or
  drop it during the move — the hero is over the field where the halo does
  its work, but a halo on a scaling glyph is what forces the re-raster.
- **Guard the observer.** Have `measure()` early-return while
  `--hero-collapse` is between 0 and 1, and measure at rest only; the widths
  it wants do not change during a collapse.
- **Remove the homepage scroll spy** (or restore the `.is-active` rule it
  feeds — the decision in `index.scss` says the emphasis was deliberately
  stripped, so remove).
- **Halve the veil's blur on a phone** the way the chips were, and consider
  gating it off the same touch media query — the veil's job is to hide the
  chip collision, and on a phone the row is already frosted.

Structural, one of:

- **Scroll-driven animations.** `animation-timeline: scroll(nearest)` on the
  window, with the collapse written as a keyframe animation on the `h1`, `p`
  and hero, replaces the whole publisher: the browser drives it on the
  compositor with zero lag and no quantisation, and the JS becomes a
  `@supports not (animation-timeline: scroll())` fallback. Support is broad
  in Chromium and has landed in Safari; check the current state before
  committing to it as the only path.
- **Put the hero inside the scroller.** The native pattern for a title that
  tucks as you scroll is that the large title is the first thing in the
  scroll content and scrolls away at 1:1, while a small title is `position:
  sticky` at the top. It is compositor-only and needs no JS. The cost is the
  design decision in `01-decisions.md` that the hero sits on the field above
  the frame; a sticky collapsed row could still be drawn outside the scrim
  visually, but the DOM would move.

Recommendation: do the quick list now (it removes every layout property from
the per-frame path and is a day of work), then prototype scroll-driven
animations behind `@supports` as the buttery version.

---

## 1. motion

### 1.1 the timing vocabulary (P2)

Every duration and easing found in the stylesheets and the shell, by count:

| family | where | count |
| ------ | ----- | ----- |
| `var(--transition-fast)` 150ms `ease-in-out` | controls, links | 32 |
| `var(--transition-normal)` 250ms `ease-in-out` | buttons, cards | 19 |
| `0.2s cubic-bezier(0.4, 0, 0.2, 1)` | chat buttons, dialogs, outline-button | 9 |
| `0.3s cubic-bezier(0.16, 1, 0.3, 1)` | stage, nav, sidebars, pills | 8 |
| `0.3s ease-out` / `0.2s ease-out` / `0.15s ease-out` | dialog, popovers, dropdown | 8 |
| `0.2s ease` / `0.4s ease` / `0.15s ease` / `0.28s ease` | progress cancel, hint, play button, explore chrome | 5 |
| `80ms linear` | veil | 1 |
| `var(--transition-slow)` 350ms | — | 0 (unused) |
| JS: 160 / 240 / 260 / 380ms, `cubic-bezier(0.16, 1, 0.3, 1)` and its reflection | hero transition | — |
| JS: 120ms `ease-out` | shortcuts panel | — |

Fourteen distinct durations between 80 and 400ms, and four easing families in
the chrome alone (`ease-in-out` in the tokens, the expo-out curve on the
shell, the material curve in the chat, and the browser keywords). The three
tokens use a symmetric `ease-in-out`, which is the one curve the shell itself
does *not* use: the stage, nav, sidebars and the hero transition all take
`cubic-bezier(0.16, 1, 0.3, 1)`. So a hover on a card eases one way and the
panel sliding in beside it eases another.

Proposal: three durations and two curves as tokens, and nothing else.

```scss
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);   // arriving, settling, hover on
--ease-in:  cubic-bezier(0.7, 0, 0.84, 0);   // leaving (the reflection, already in layout.tsx)
--duration-fast:   120ms;  // ink, hairline, wash — state changes under the pointer
--duration-normal: 240ms;  // lifts, disclosures, popovers
--duration-slow:   320ms;  // panels, the stage, the hero
```

The three existing `--transition-*` tokens would compose from these, so the 51
sites already using them move for free; the 9 material-curve sites in the chat
and the ~13 `ease-out`/`ease` sites are the migration. The JS constants in
`layout.tsx`, `ChatIcon.tsx`, `ChatModal.tsx` and `KeyboardShortcuts.tsx`
should read the same numbers (see 1.7).

### 1.2 keyframe names collide, and which one wins depends on the page (P1)

Keyframes are global, and four names are declared more than once with
different bodies. Confirmed in the built CSS: the blog page carries four copies
of `fadeIn` and the last one wins.

| name | declared in | bodies differ? | consumed by | what actually plays |
| ---- | ----------- | -------------- | ----------- | ------------------- |
| `fadeIn` | `animations.scss` (opacity + `translateY(10px)`), `chat.scss` (opacity only) | yes | `.clear-confirm-overlay`, `.export-chat-overlay` | on `/` and `/blog` the `animations.scss` copy is emitted last (those pages `@import 'animations'` again), so a full-screen overlay **slides up 10px** as it fades |
| `slideDown` | `animated-backgrounds.scss` (opacity + `translateY(-0.5rem)`), `chat.scss` (`max-height` 0→500px + `padding` 0→1rem) | yes | `.category-content` (settings), `.thinking-content` (chat) | `chat.scss` is imported after `animated-backgrounds.scss` in `global.scss`, so the **settings accordion animates layout** — max-height and padding — and its padding-top runs 0→1rem then snaps to its real 0.5rem at the end |
| `slideInFromRightWithFade` | `animations.scss` (`20px`), `chat.scss` (`2rem`) | yes, slightly | `.chat-icon-container` | page-dependent 20px vs 32px |
| `slideInFromRight` | `animated-backgrounds.scss`, `chat.scss` | no | `.chat-sidebar.opening` | duplicate only |

Related: `blog.scss` and `index.scss` each `@import 'animations'`, and all ten
page and component stylesheets `@import 'variables'`. Sass `@import` re-emits
the file's CSS every time, so the `:root` token block is in the bundle ten
times and `glow`/`bounce`/`pulse`/`rotate` (all unused, see §8) three times.
`@use` instead of `@import` fixes both, and the keyframes should be declared
once, in one file, with one body each.

### 1.3 the lift vocabulary (P2)

`mixins.scss` states the card rule plainly: "No lift, no scale, no shadow
ramp." The cards obey it. The controls do not agree with each other:

| control | hover | active |
| ------- | ----- | ------ |
| `.cta-button` (primary, secondary) | `translateY(-2px)` + `--shadow-md` | `translateY(0)` |
| `.sample-prompt-pill` | `translateY(-2px)` + shadow, icon `scale(1.1)` | `translateY(-1px)` |
| `outline-button` (download, retry, reset) | `translateY(-1px)` + `--shadow-lg` | `translateY(0)` + `--shadow-md` |
| `.chat-icon`, `.background-toolbar` | `translateY(-1px)` | `translateY(0)` |
| `.chat-send-button`, `.info-button`, `.export-copy/download`, `.preview-button`, `.play-sound-button`, `.clear-confirm-actions button` | `translateY(-1px)` | — |
| `.feature-item` (not interactive) | `translateY(-1px)` + shadow | — |
| `.footer-link` | `scale(1.05)`, icon `scale(1.1)` | `scale(0.95)` |
| `.mobile-interactivity-btn`, `.mobile-explore-exit` | — | `scale(0.97)` |
| `.chat-progress-cancel`, `.copy-button` | — | `scale(0.95)` |
| `.nav-link`, chips, cards, `.skill-tag`, `.read-more` | none (ink/hairline only) | — |
| `.thinking-block` (a container) | `--shadow-md` ramp | — |

Three lift distances, two scale factors, and the heaviest shadow in the system
(`--shadow-lg`) on the quietest button (the outline). The footer is the only
place anything scales on hover, and it scales twice (link and icon). Proposal:
controls answer the pointer the way the cards and chips already do — ink,
hairline, wash — and nothing lifts. If a lift is kept for the one filled CTA,
it is the only one, at one distance.

### 1.4 direction (P2)

`layout.tsx` sets a rule: "One distance for the whole transition, and one
direction: everything moves up through the frame." Dropdowns, popovers, the
shortcuts panel and the sample prompts all rise. The clear-chat dialog
(`slideIn`: `scale(0.9) translateY(-20px)` → rest) is the one thing on the
site that **descends**, and it also scales, which nothing else does on entry.

### 1.5 entrances that do not end where the element rests (P1)

- `.loading-message` runs `fadeInOut` to `opacity: 0.6` over 3s, then the
  animation ends without `forwards` and the element **pops back to its own
  `opacity: 0.9`**.
- `.category-content` (settings) — see the `slideDown` collision above:
  padding animates to `1rem` and snaps to `0.5rem`.
- `.mobile-explore-chrome` transitions at `0.28s`, everything beside it at
  `0.3s`; the two are visibly the same and should be the same number.

### 1.6 reduced-motion coverage (P2)

The global block in `global.scss` and the per-component guards cover the
shell, the panels, the pills, the dropdown, the shortcuts hint, the icons and
the 404. Not covered:

- `.mobile-interactivity-launcher` entry (`slideInFromLeftWithFade`).
- `.mobile-explore-chrome` opacity/transform transition and
  `.mobile-explore-hint` fade.
- `.sample-prompts` (`fadeInUp`), `.sources-popover` and `.info-popover`
  (`slideUp`), `.clear-confirm-overlay`/`-dialog` (`fadeIn`, `slideIn`),
  `.export-chat-overlay`.
- `.category-content` and `.thinking-content` (`slideDown`).
- `.thinking-cursor` `blink` (decorative; the `loadingDots` and
  `thinkingTyping` loops are status and can stay).
- `.footer-link` scale transitions.
- Smooth-scroll calls in JS: `CVSearch.scrollToSection`, the projects hash
  scroll, and `ChatModal.scrollToBottom` all pass `behavior: 'smooth'`
  unconditionally, while `cv.tsx` and `layout.tsx` check the preference first.

### 1.7 the same number in five places (P3)

- The 300ms panel duration is a CSS literal in `chat.scss` and
  `animated-backgrounds.scss`, and a `setTimeout(…, 300)` in `ChatIcon.tsx`,
  `ChatModal.tsx` (twice) and `KeyboardShortcuts.tsx`. The close choreography
  is also implemented three times (icon, modal, shortcut) rather than once in
  the context.
- `TITLE_SCALE = 0.55` in `layout.tsx` is `scale(calc(1 - 0.45 * …))` in
  `layout.scss`, and the phone's `--collapsed-title-scale: 0.5` has no JS twin
  at all — the fit calculation uses 0.55 on every width.
- `HERO_COLLAPSE_RANGE = 160` and the veil's `/ 90` are related constants
  with no relation expressed.

### 1.8 what is right

For the record, so it is not "fixed": the stage and nav share one curve and
one duration; the hero transition is a single gesture with a reflected
easing; the dropdown, shortcuts and card hairlines all treat a pointed-at
thing as a state rather than an event; the phone sheet drops its blur while
it moves; the 404 rotates nothing that scrolls. These are the standards the
rest should be brought to.

---

## 2. spacing

### 2.1 token adoption by surface (P2)

`variables.scss` says the scale is being adopted "page by page". The pages
are done; the panels are not.

| stylesheet | raw `rem` margin/padding/gap | `--space-*` |
| ---------- | ---------------------------- | ----------- |
| `blog.scss` | 5 | 37 |
| `projects.scss` | 7 | 28 |
| `cv.scss` | 23 | 55 |
| `index.scss` | 2 | 19 |
| `layout.scss` | 11 | 9 |
| `controls.scss` | 12 | 2 |
| `shortcuts.scss` | 9 | 0 |
| `mobile-interactivity.scss` | 6 | 0 |
| `animated-backgrounds.scss` | 55 | 1 |
| `chat.scss` | 136 | 0 |

The chat and settings panels — the two largest surfaces after the window —
have not started. Because they were tuned independently they disagree with
each other (see 2.3) and with the window.

### 2.2 the scale has a hole (P2)

Off-scale values used in spacing, by count: `0.75rem` ×68, `0.375rem` ×17,
`0.125rem` ×13, `0.4rem` ×12, `0.625rem` ×11, `0.3rem` ×8, `1.25rem` ×5,
`0.55rem` ×5, `0.1875rem` ×5, then a long tail (`0.35`, `0.875`, `0.6`,
`0.85`, `0.7`, `0.65`, `0.3125`, `0.2`, `0.9`, `0.5625`, `0.45`, `0.4375`,
`0.15`, `0.1`).

`0.75rem` is the most-used spacing value on the site and it is not on the
scale: the scale steps `0.5 → 1`, and the panels, list items (`global.scss
li`), the chevron gap and the summary row all want the value between. Add
one step (`--space-2-5: 0.75rem`, or renumber to a 4px-based scale:
4/8/12/16/24/32/48/64/96) and most of the tail can be rounded onto it.
`0.375rem`/`0.4rem` and `0.625rem`/`0.6rem`/`0.65rem` are the same intention
written five ways.

### 2.3 measured inconsistencies

All numbers from the dev build.

| what | where | measured | note | grade |
| ---- | ----- | -------- | ---- | ----- |
| card padding on a phone | `.post-preview`, `.project-card-content` vs `.cv-collapse-summary` | 24px vs **32px** | cv.scss's phone rule targets `.experience-item`/`.education-item`, classes no component renders; the CV cards never step down | P1 |
| meta band top padding | `.post-meta`, `.project-footer`, `.cv-summary-skills` vs `.cert-meta` | 16px vs **24px** | the certification card is the odd one | P2 |
| CV hero on a phone | `.cv-page-header h1 / p` vs blog/projects heroes | **32px / 16px** vs 30.4px / 16.98px | cv.scss re-pins the sizes at 768px; the other heroes follow the fluid scale. blog.scss's comment says the hand-set mobile sizes are gone — not on the CV | P1 |
| space under the search panel | `.blog-search-panel` vs projects/cv | **48px** vs 32px | the three list pages are meant to share one row | P2 |
| space above the footer | blog `.blog-content` + `.main`; projects `.projects-page` + `.main`; cv `#resume-content` + `.main` | 64+48, 48+48, 32+48 | three list pages end at three distances | P2 |
| section rhythm | `.projects-section` vs `#resume-content` gap | 48px vs 32px | | P2 |
| anchor clearance on a phone | `#cv-*` `scroll-margin-top` vs the sticky row's height | **50px** vs a 60px row | the mobile rule *reduces* the margin (80→60→50) while the row got taller (thumb padding); anchors land under the chips. Projects uses 76px at every width, `.cv-collapse` 76px | P1 |
| control-row chips vs rail | `.ui-dropdown-trigger` vs `.nav-link` / pills | 14.4px vs 14px | `frosted-chip` is 0.9rem, the capsules 0.875rem; the nav-link comment says they match | P3 |
| chat header row heights | `.model-selector .ui-dropdown-trigger` vs the buttons beside it | ~29px vs 34px | the chip is a smaller font at a smaller padding in a row of 34px boxes | P2 |
| panel gutters | `.chat-header` vs `.sidebar-header` | 24px vs 16px 24px | chat messages `1rem 1.5rem`, settings categories `0.75rem 1rem` — two inner gutters | P2 |
| panel dividers | chat `rgba(255,255,255,0.1)` vs settings `0.05` vs cards `0.08` | | three interior hairlines | P2 |
| footer padding | `.footer-content` desktop vs 768px | 24px 32px vs **32px 16px** | more vertical padding on a phone than a desktop, and the only place that inverts | P3 |
| footer link box | 2.75rem, restated identically at 768px; `.footer-links` gap likewise | | dead restatements | P3 |
| sticky row padding | `sticky-control-row` `0.4rem 0` desktop, `0.85rem` top on a phone | | raw values; the 0.85 is a tuned number worth a token or a comment | P3 |

### 2.4 spacing rules with no effect (P3)

- `.hero h1 { margin-bottom: var(--space-5) }` in `index.scss` loses to
  `.site-hero.is-collapsible h1` on specificity; the home title's gap is
  `--space-3` like the others. Delete or intend it.
- `@media (max-width: 1024px) { .nav-menu { min-width: auto } }` — `.nav-menu`
  has no `min-width` to reset; the comment describes a matched footprint the
  capsule no longer has (`--rail-width` is applied to the two pills only, and
  the token's own comment says "three rail controls").
- `global.scss .container` (1200px, 1rem padding, and a 768px override) — no
  component renders `.container`.

---

## 3. material — hairlines, fills, blur, shadow

### 3.1 near-black borders over the scrim (P1)

`mixins.scss`, on `outline-block`: "The hairline is `--border-floating`
(white-alpha) and not `--border-color`, which is near-black and disappears
entirely against the scrim." The window and the three list pages follow it.
The chat and settings panels sit on the same scrim and still draw **43**
borders in `--border-color` (`#1a1a1a`) and 18 hover borders in
`--border-active` (`#2a2a2a`). Measured: the chat and settings close buttons
render with `rgb(26, 26, 26)` borders, which is invisible in the screenshot —
the × floats in nothing. Affected: every chat header button, the thinking
toggle, the chat input and send button, the assistant bubble and avatar, the
thinking block, the progress bar, the sources hairline, model options, the
info button, the export dialog and its buttons, the settings close, category
dividers, the number/select/colour inputs, the help dot and its tooltip, the
category tabs on a phone, `.special-hotkeys`, `.blog-post-link`,
`.huggingface-link`.

The fix is mechanical — `--border-color` → `--border-floating`,
`--border-active` → `rgba(255,255,255,0.45)` — and the PR that did the same
for the cards is the precedent. After it, `--border-color` and
`--border-active` have no remaining job and can go.

### 3.2 opaque fills inside glass (P2)

The decision was "outline, not fill", because a solid panel over the scrim
"reads as a lid on the animation". Still filled:

- `.chat-input` — `--bg-primary` (`#0a0a0a`, opaque), hover keeps it,
  focus goes `--bg-hover`.
- `.chat-message.assistant .message-content` — `--bg-hover` (`#141414`).
- `.sources-popover`, `.sources-toggle:hover`, `.blog-post-link`,
  `.huggingface-link` — `--bg-primary`.
- `.setting-tooltip` — `--bg-card` (`#0f0f0f`), the only use of that token,
  while `.activity-tooltip` is glass (`--window-scrim` + blur + white
  hairline). Two tooltip materials.
- `.chat-modal` (dead, see §8) and `.clear-confirm-dialog` —
  `rgba(0,0,0,0.7)` + `blur(20px)`, a third glass recipe.

### 3.3 the dialogs black the site out (P1)

`.clear-confirm-overlay` and `.export-chat-overlay` are
`position: fixed; inset: 0; background: var(--bg-primary)` — an **opaque
`#0a0a0a`** over the whole viewport (measured `rgb(10, 10, 10)`), with a
`backdrop-filter: blur(5px)` that blurs nothing because nothing shows
through. Opening "clear chat" hides the simulations, the window and the rail
entirely. Compare `shortcuts.scss`: "No scrim: the panel is small and the
field behind it is the point of the site." The export dialog itself is then
`--bg-secondary` — `rgba(0,0,0,0.1)`, all but transparent — on that black.
Both dialogs also sit at `z-index: 10000` against a ladder that tops out at
1003, and each button in the clear dialog carries its own
`backdrop-filter: blur(10px)`.

Proposal: the shortcuts panel's treatment — no scrim, or the window scrim at
most — and the `floating-panel` material for the dialog, at the next rung of
the existing z ladder.

### 3.4 hairline alphas (P2)

White-alpha values in use, by count: `0.08` ×23 (interior dividers), `0.45`
×22 (hover/active hairline), `0.06` ×9, `0.2` ×8, `0.1` ×7, `0.04` ×6,
`0.07` ×5, `0.6` ×4, `0.4` ×3, `0.05` ×3, and singles at `0.03 0.11 0.12
0.14 0.16 0.18 0.25 0.28 0.3 0.5`.

The system has three real hairlines — rest (`--border-floating`, 0.16),
interior (0.08), lit (0.45) — and two washes (0.04 field, 0.06–0.08 hover).
Everything else is drift: `0.4` on the chip hover and search toggle where
every other hover is `0.45`; `0.2` on `outline-button`, `button-secondary`,
`.preview-button`, `.clear-cancel-button` and the explore surface where the
rest is `0.16`; `0.1` and `0.05` on the panel dividers where the cards use
`0.08`; `0.6` on the phone tab and play button; `0.25` on the blockquote rail,
`0.3` on the search result rail, `0.28` on the grab handle.

Tokens would end it: `--hairline`, `--hairline-interior`, `--hairline-lit`,
`--wash-field`, `--wash-hover`, `--wash-active`.

### 3.5 blur radii (P3)

`5px` (window, sidebars), `10px` (floating panels, phone chips, dialog
buttons), `14px` + `saturate(140%)` (explore surface), `18px` (veil), `20px`
(desktop chips, clear dialog, dead modal), `8px` (explore hint). The chips
are expressed as `calc(var(--window-blur) * 4)`; the rest are literals.
`--blur-window`, `--blur-panel`, `--blur-chip` and one rule for the veil.

### 3.6 shadows (P3)

`0 24px 64px rgba(0,0,0,0.4)` is written out three times (window, both
sidebars) and once more at `0.5` (shortcuts panel); `capsule-housing` has its
own `0 8px 24px 0.3`; the explore surface `0 8px 28px 0.45`; the setting
tooltip `0 4px 16px 0.35`; the kbd caps `0 1px 2px 0.1` (which the token
comment already notes does nothing on this ground). `--shadow-xl` is used
only by the dead modal and the clear dialog (`var(--shadow-xl),
var(--shadow-xl)` — doubled by a copy-paste). A `--shadow-panel` token and
the existing scale cover all of it.

---

## 4. type

### 4.1 thirty-five sizes (P2)

`font-size` values in the stylesheets: 35 distinct, of which 6 are tokens.
The chat panel alone uses 17 (`0.6, 0.625, 0.65, 0.6875, 0.7, 0.71875, 0.72,
0.75, 0.78125, 0.8, 0.8125, 0.85, 0.875, 0.9, 0.9375, 1, 1.1rem`). Off-token
sizes with a token neighbour: `0.8rem` ×11 and `0.85rem` ×7 beside
`--text-small` (0.8125); `0.9rem` ×11 and `0.95rem` ×3 beside `--text-body`
(0.9375); `1rem` ×11 (`.overview-section p`, `.contact-value`,
`.result-title`, `.search-input`) beside both. `.footer-copyright` is
`0.8rem`, `.language-name`/`.project-stars`/`.activity-total` `0.85rem`, the
activity foot `0.72rem` ×4, the axis labels `9px`.

Proposal: a small-type scale under `--text-small` for chrome — `--text-xs:
0.75rem`, `--text-2xs: 0.6875rem` — and round everything else onto
`--text-small`/`--text-body`. The `0.6rem`–`0.65rem` sizes (`.setting-help`,
`.mobile-explore-sub`, `.mobile-explore-hint`, phone tab labels) are below
the floor a phone can read and should come up to `--text-2xs`.

### 4.2 tracking flips sign in the panels (P2)

Headings are `-0.02em`, chips and buttons `-0.01em`, across the site. Inside
the chat and settings: `.chat-title` `+0.02em`, the welcome `h3` `+0.02em`,
`.sample-prompts-title` `+0.02em`, `.sources-toggle` `+0.03em`,
`.thinking-label` `+0.025em`, `.section-title` and `.special-hotkeys-title`
`+0.5px`. Positive tracking on lowercase mono reads as a different voice.

### 4.3 three monospace stacks (P2)

The site: `'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'Courier
New', monospace`, restated in full some 30 times (a `--font-mono` token would
end that). Blog inline code and `pre`: `'Monaco', 'Menlo', 'Ubuntu Mono',
monospace` — a different face from the prose around it. `.thinking-text`:
`ui-monospace, 'SF Mono', 'Monaco', 'Menlo', 'Roboto Mono', …`. Chat code
blocks: JetBrains again. Code should be the same face as everything else on
a site that is already set entirely in one mono.

### 4.4 case leaks (P2)

The house rule is lowercase. Still capitalised or upper:

- `.thinking-label` is `text-transform: uppercase`; `.cached-badge` and
  `.device-badge` are uppercase (and the device badge renders `GPU`/`CPU`
  from JSX).
- Dates on blog cards and post headers render `July 26, 2026` via
  `toLocaleDateString` with no transform — the one title-case line on a card
  (screenshot confirms). The activity panel lowercases its months by hand
  (`jan`, `feb`…). One date formatter, lowercase.
- `.overview-section p` on the CV is the only prose paragraph on the site in
  sentence case ("Engineer and mathematician working on AI systems at Perch
  Insights…"), while `.post-description` is explicitly lowercased for the
  same reason.
- Welcome features: `never leaves your device` beside `Hardware accelerated`
  and `Works without internet`. `Chat` (`h3`, lowercased by CSS — fine),
  `Initializing model loading...`, `Generating response...` (sr-only — fine).
- `title` attributes are sentence case everywhere ("Click to open settings
  (S)", "Export chat as markdown") — tooltips are part of the surface too.

### 4.5 italic is doing four jobs (P3)

Hero taglines, section descriptions (`.expertise-description`,
`.experience-description`, `.education-description`, `.overview-section p`),
empty states (`.projects-empty`, `.no-results`), placeholders (chat only),
blockquotes, the `i` on the phone's description toggle. None of it is written
down as a rule. Decide what italic means (lead line? description?) and take it
off the rest — the empty states in particular have three treatments (blog
centred roman, projects left italic, CV centred italic muted).

### 4.6 line-height (P3)

`1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5, 1.6, 1.7` all in use. Three would do:
`1.3` headings/labels, `1.5` chrome, `1.7` prose (body is `1.6`, `.about p`
and `.cv` and `.post-content` `1.7` — pick one for prose).

### 4.7 weight (P3)

The rule is 400 everywhere, 600 for inline emphasis and active states.
`.activity-metric-value` is 600 at 1.35rem — a display number in the heavier
weight, which is defensible but is the only one. `.category-tab.active` on a
phone is 600 — permitted as an active state, but the desktop's active
category header is not bold, so the two disagree.

---

## 5. colour

- **Violet is still here (P1).** `chat.scss` says the thinking block "was the
  only violet thing on the site … It is now an inset panel." The panel is
  inset; the icon, label, typing dots, chevron and cursor are all still
  `#8b5cf6` (five sites). Under the semantic rule this is a state ("the model
  is reasoning") and could keep a colour, but if so it should be the site's
  green or a token, not a hex that appears nowhere else.
- **Bootstrap's palette in the badges (P2).** `#28a745`, `#17a2b8`,
  `#ffc107`, `#343a40` in `.cached-badge`/`.device-badge`, with `var(--success,
  …)` fallbacks to tokens that do not exist. The badges render in the model
  info popover.
- **Danger red is a literal (P3).** `#ff6b6b` ×3 (clear button, generation
  warning) and `rgba(255,107,107,…)` ×6. It is the one meaning-colour without
  a token; `--danger` / `--ink-danger`.
- **Opacity as a fourth grey (P2).** `.shortcuts-hint 0.85`,
  `.sidebar-keyboard-hints 0.9`, `.chat-keyboard-hints 0.7`,
  `.message-stats 0.75`, `.background-description 0.9`, `.expertise-icon 0.8`,
  `.category-tab.standard 0.75`, `.markdown-hr 0.6`, `.markdown-link:visited
  0.8`. Each is a shade that is not `--text-secondary` or `--text-muted`, and
  whole-element opacity thins hairlines and frost with the ink (the
  `.ui-chip-button:disabled` comment already learned this). Use the ink
  tokens.
- **Tokens with no readers (P3).** `--accent-cyan/blue/purple/yellow/pink`,
  `--ink-cyan/blue/purple/yellow/pink`, `--fill-purple`, `--primary-dark`,
  `--radius-xl`, `--transition-slow`: zero uses. `--bg-card`: one (the
  tooltip, see 3.2). `--bg-secondary` (`rgba(0,0,0,0.1)`): eight uses, all
  effectively invisible (disabled fills, kbd caps, the slider thumb ring, the
  export dialog). The decisions log asked for the token systems to collapse;
  the dead half can go now.

---

## 6. shape

- **`8px` written raw ten times** (`outline-button`, `.thinking-block`, chat
  progress, feature items, model options, info/send buttons, export and
  clear buttons) — it is `--radius-lg`, untokenised. `12px` twice
  (`.clear-confirm-dialog`, `.sample-prompt-pill`), `16px` once (dead modal),
  `2px` twice, `0.125rem` twice — none on the scale. (P3)
- **Pills came back on the phone (P2).** `capsule-housing`'s comment records
  the decision: "These were fully-round until the kit was looked at as a
  whole … One radius across everything." `.category-tab` is `999px`, and so
  is the sheet's grab handle.
- **A circle beside a square (P2).** On the phone sheet the `i` description
  toggle is `border-radius: 50%` next to the `×` close at `--radius-md`; the
  comment says they are built to the same 34px "so the two sit as one row".
  Screenshot confirms: one round, one square. `.setting-help` is also a circle.
- **Three closes (P2).** PR #49 was "one close": the chat and settings close
  are a 16px glyph in a 34px hairline box; `.shortcuts-close` is a bare `×`
  character at 1rem in a 20px box with no border; `.mobile-explore-exit` is
  the glyph in a frosted box. Two of the three are the same control drawn
  twice; the shortcuts one is a different control.

---

## 7. focus and interaction

### 7.1 three focus languages (P2)

- Global: `:focus-visible` → 2px green outline, offset 2.
- Chat (`.thinking-toggle`, header buttons, `.chat-input`, `.chat-send-button`,
  `.sample-prompt-pill`, clear-dialog buttons) and the settings close:
  `:focus` (not `:focus-visible`) → `box-shadow: 0 0 0 2px var(--primary-color)`.
  So a mouse click lights a green ring — exactly the behaviour the global
  comment describes fixing on the CV summaries.
- Controls, shortcuts, search: `outline: none` + neutral wash/hairline, on
  `:focus-visible` (and `:focus` for the hint).
- Removed outright: `.footer-link:focus { outline: none }` (no replacement —
  keyboard users get nothing on the five footer links), `.mobile-explore-surface`,
  `.layout` (intended), `.ui-dropdown-menu` (intended, the option is marked).

One rule: `:focus-visible` everywhere, and one treatment — the neutral
brighten-and-wash the controls use — with the green ring reserved for links
and actions if it is kept at all.

### 7.2 keyboard shortcuts fire on modified keys (P1)

`BackgroundManager` and `KeyboardShortcuts` switch on `event.code` without
checking `metaKey`/`ctrlKey`/`altKey` (the shortcuts modal does). Effects:

- **⌘C / Ctrl+C to copy selected text opens the chat** (`KeyC`), unless focus
  is in an input.
- **⌘S / Ctrl+S is `preventDefault`ed and opens the settings panel** instead
  of the browser's save.
- Ctrl+H (history) toggles the page content off.
- Arrow keys switch the background while a `<select>` in the settings panel
  or a non-input control has focus; `isTyping` in `ShortcutsModal` handles
  `SELECT` and `contentEditable`, the other two handlers do not.

### 7.3 a control that is not a control (P2)

`.background-toolbar` is a `<div onClick>`: no keyboard access, no focus, no
role — while its twin in the other corner (`.chat-icon`) is a `<button>`. The
two pills are meant to be one kit.

### 7.4 things that answer the pointer but do nothing (P2)

`.skill-tag` (`cursor: default`) brightens on hover; `.feature-item` in the
welcome screen lifts and shadows; `.thinking-block` (the container) ramps its
shadow; `.message-stats` brightens. The expertise cards were made static for
exactly this reason ("the cards state what the work is"); the same rule
applies here.

### 7.5 smaller

- The search inputs (`.search-input`) are `text-transform: lowercase`, so
  what the visitor types is re-cased under their cursor ("GPU" shows as
  "gpu"). Lowercase the placeholder, not the value.
- Two placeholder styles: search `--text-secondary` roman; chat
  `--text-muted` italic.
- `.chat-sidebar-footer` (`C chat • Enter send`) and `.sidebar-keyboard-hints`
  (`← → switch • S settings • H hide`) are still printed permanently at the
  foot of both panels, after the decision to put the shortcuts behind `?`
  ("two rows of key caps costing real vertical field for something a reader
  consults once"). The desktop settings panel therefore lists three of the
  five shortcuts in a second place, with a different kbd style
  (`--bg-accent`/`--border-color` vs the hint's `--bg-floating`/`--border-floating`).
- `.sample-prompt-pill` is `white-space: nowrap`; the longest prompt is ~44
  characters at 0.8rem mono ≈ 340px plus icon and padding, against ~400px of
  panel. It fits today by a margin a longer prompt would not.
- `.hero-crumb:hover` underline offset `0.2em`; `.hero-subtitle-link` and
  `.activity-link` `0.25em`; `.post-content a` browser default;
  `.markdown-link` uses a `border-bottom` instead of an underline. One
  underline.
- `.back-to-blog` is `color: white` + halo with a comment saying it "sits on
  the background"; it is inside the window now (`.post-footer` is in
  `.main`), so it is the one link on a surface that is not green.
- `.ui-dropdown-menu` has no `max-height`/scroll; the tag list is short today.
- `useScrollSpy` on the homepage — see §0, item 7.
- `.window-veil` on the CV: `z-index: 5` "under the cv control row (10)" —
  fine, but the veil's 88px band vs the row's 45px is a tuned pair worth one
  comment where both live.

---

## 8. dead code and stale comments (P3)

Rules whose selectors no component renders:

- `chat.scss` `.chat-modal` and its whole subtree (~230 lines, "keeping for
  reference/fallback"), plus the 768px `.chat-modal` block and
  `.chat-icon { bottom; right }` (the icon is not positioned; its container is).
  `.cached-badge` and `.model-info` inside it are also unreferenced.
- `cv.scss` `.cv-header`, `.cv-contact`, `.cv-title` (only `CVHeader.tsx`,
  which nothing mounts; its test is `describe.skip`), `.cv-section h2/h3`,
  `.experience-item`, `.education-item`, `.skills-grid`, `.resume-header` and
  subtree, `.latex-preview` and subtree (with the `#1e1e1e`/`#d4d4d4`
  literals), `.experience-bullets`, `.experience-skills`,
  `.education-coursework` (coursework renders inside `.cv-summary-skills`),
  `section[id] { position: relative }` and a second
  `html { scroll-behavior: smooth }`. The other `.experience-*` and
  `.education-*` detail classes are live.
- `animations.scss`: `glow`, `bounce`, `rotate`, `pulse` and the four
  `.animate-*` utilities — zero consumers. With the two colliding names moved
  to one home (§1.2), the file is empty.
- `layout.scss` `@keyframes twinkle`.
- `global.scss` `.container`; `body` radial gradients at 0.01–0.02 alpha and
  the `body::before` 20px grid at 0.01 — both painted under the fixed
  `.background-stage` and never visible, and the `::before` is a fixed layer
  the compositor keeps.
- `mobile-interactivity.scss` hides `.keyboard-shortcuts-toggle`, a class
  that does not exist.
- `ChatIcon.tsx`: `isChatAvailable = true` and the inline
  `opacity`/`pointerEvents` that key off it.
- Inline styles that belong in the stylesheet: `.chat-tps-indicator`
  (`ChatModal.tsx`), the worker-failed `.error-notice` (`WelcomeScreen.tsx`,
  with a Bootstrap yellow), the desktop settings `settings-content` flex
  block and `marginTop: auto` (`SettingsPanel.tsx`), `<div style={{ width:
  '100%' }}>` around the progress bars.

Comments that describe a previous state:

- `mixins.scss`: the paragraph above `outline-button` ("The panel a chip
  opens…") describes `floating-panel`, which sits below it.
- `layout.scss` `.nav-menu` 1024px rule and the `--rail-width` comment
  (§2.4).
- `animated-backgrounds.scss` `.background-name { font-size: 1rem } // Match
  chat panel font sizing` — the chat title is 1.1rem.
- `blog.scss` `.back-to-blog` "sits on the background" (§7.5).
- `chat.scss` "the only violet thing on the site … is now an inset panel"
  (§5).
- `layout.tsx` `TITLE_SCALE` "duplicated in the stylesheet" — the phone value
  is not.

---

## 9. the standards this pass would set

Everything above reduces to a short list of tokens and one-line rules. Adding
them first makes each migration a find-and-replace rather than a judgement.

```scss
// motion
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in: cubic-bezier(0.7, 0, 0.84, 0);
--duration-fast: 120ms;    --duration-normal: 240ms;    --duration-slow: 320ms;
--transition-fast: var(--duration-fast) var(--ease-out);   // etc.

// spacing: one more step, or renumber to a 4px base
--space-2-5: 0.75rem;

// material
--hairline: rgba(255, 255, 255, 0.16);          // = --border-floating
--hairline-interior: rgba(255, 255, 255, 0.08);
--hairline-lit: rgba(255, 255, 255, 0.45);
--wash-field: rgba(255, 255, 255, 0.04);
--wash-hover: rgba(255, 255, 255, 0.06);
--wash-active: rgba(255, 255, 255, 0.08);
--blur-window: 5px;  --blur-panel: 10px;  --blur-chip: 20px;
--shadow-panel: 0 24px 64px rgba(0, 0, 0, 0.4);

// type
--font-mono: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'Courier New', monospace;
--text-xs: 0.75rem;  --text-2xs: 0.6875rem;

// colour
--ink-danger: #ff6b6b;

// layering
--z-stage: 1000;  --z-rail: 1001;  --z-panel: 1002;  --z-dialog: 1003;  --z-tooltip: 1004;
```

Rules, each one sentence:

1. Controls answer the pointer with ink, hairline and wash; nothing lifts,
   nothing scales.
2. Everything that enters rises; everything that leaves rises; one distance.
3. `:focus-visible` only, neutral treatment, no `outline: none` without a
   replacement.
4. No `--border-color`/`--border-active` over the scrim; no opaque fill inside
   glass.
5. One radius scale, no pills, no raw pixels.
6. Lowercase is applied to everything rendered, dates and badges included.
7. Every scroll-linked or entrance animation has a reduced-motion answer, in
   CSS or in the call that starts it.
8. A number that lives in CSS and JS lives in one of them.

### sequencing

1. **The hero collapse** (§0) — it is the thing the owner can feel, and the
   quick list is contained to `layout.tsx` and `layout.scss`.
2. **Bring the chat and settings panels onto the window's material** (§3.1,
   3.2, 3.3, 2.1) — the largest visible gap, and mostly substitution.
3. **Fix the keyframe collisions and delete the dead stylesheets** (§1.2, §8)
   — small, and it removes the page-dependent behaviour before anything else
   is tuned on top of it.
4. **Add the tokens and migrate the vocabularies** (§1.1, 2.2, 3.4–3.6, 4.1,
   6) — one pass per token.
5. **Interaction fixes** (§7.2, 7.3, 7.1) — modifier keys and the toolbar
   button are an afternoon; the focus unification rides on step 2.

---

## appendix — how this was measured

A dev build (`gatsby develop`) read with headless Chromium at 1440×900 and
390×844 (touch). Computed styles and boxes were read for the elements named in
§2.3 and §3; the keyframe table in §1.2 is from enumerating
`CSSKeyframesRule`s in the page's stylesheets; the collapse table in §0 is
from setting the window's `scrollTop` in steps and reading the hero and window
boxes after two frames. The chat worker and retrieval index were not built,
so the chat panel was measured in its failed-to-load state; that does not
affect the chrome measured. The 404 could not be measured in a dev build
(Gatsby shows its own).
