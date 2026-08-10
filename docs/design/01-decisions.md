# design review — decisions log

Working companion to [`00-original-review.md`](./00-original-review.md).

The original review is a proposal written from the outside. This file records what
we actually decided, point by point, and why. Where we diverge from the review, the
divergence is stated rather than silently applied.

**Status:** triage complete — every section decided. Next: tasks → prototype spike.

| §   | topic                    | decision          | notes                                                 |
| --- | ------------------------ | ----------------- | ----------------------------------------------------- |
| —   | governing rule           | **rejected**      | colour only where it carries semantic meaning         |
| 1   | one column, left aligned | **reinterpreted** | fixed window, inner scroll; full-bleed on mobile      |
| 2   | hierarchy — size + space | **accepted+**     | systematic spacing scale + fluid `clamp()` type scale |
| 3   | type — no bold           | **modified**      | two weights: regular + one heavier for emphasis only  |
| 4   | decorative rules         | **accepted**      | kill the pink bar and the `h2` border                 |
| 5   | scrim                    | **modified**      | scrim + halo hybrid                                   |
| 6   | light mode               | **accepted±**     | kill now; leave door open to `prefers-color-scheme`   |
| 7   | schematic icons          | **accepted+**     | draw the set; SVG illustrations with SVG animations   |
| —   | secondary observations   | **triaged**       | tokens/rename/shadows in scope; content→md later      |

---

## codebase facts established before we started

Grounding for the discussion below — what the review describes, verified against the
tree at `design/review-triage`.

- **SCSS is 9,521 lines across 13 files.** `chat.scss` (2,660) and `cv.scss` (1,805)
  are the two largest; `variables.scss` is only 160 and `mixins.scss` only 204. The
  weight is in page styles, not the token layer.
- **`over-background` is used in 18 places** across 8 stylesheets — nav, footer, page
  titles, 404, cv, chat, blog, projects, index. Replacing it with a scrim is an
  18-site change, not a one-line one.
- **`academic-underline` is used in exactly 2 places** — `blog.scss:26` and
  `index.scss:114`. The review calls it "every `h1`"; it is not. Removal is genuinely
  cheap.
- **Light mode is a 62-line block in `variables.scss` plus** a `[data-theme='light']
body` override in `global.scss`, `ThemeToggle.tsx`, `useTheme.ts`, and theme
  branches in 8 more stylesheets — with 4 test files covering it
  (`ThemeToggle.test.tsx`, `useTheme.test.tsx`, `theme-system.test.tsx`,
  `Layout.test.tsx`). Removing it touches tests, not just styles.
- **The three token systems are real**: `--accent-*` (fills/glows), `--ink-*` (the
  same hues re-cut to clear 4.5:1 as text), and a `// Legacy compatibility` block
  (`--accent-color`, `--retro-*`). `--ink-*` is not redundant with `--accent-*` — it
  exists for a documented contrast reason. Only the legacy block is dead weight.
- **`--accent-color` does resolve to pink** (`#ff0080`), and it is what
  `button-primary`, `button-secondary`, `card-hover`, `retro-border`, and
  `academic-underline` all reach for. The misleading name is load-bearing.

---

## §0 — the governing rule

> The background is the only element allowed to have colour. Everything else is white.
> Exception: links stay green.

**Rejected — the absolutism, not the direction.**

Colour gets _reduced_, not relocated wholesale. The rule adopted in its place, refined
over the discussion, is functional rather than aesthetic:

> **Colour only where it carries semantic meaning.** A few meaning-carrying colours
> are fine (links, success/fail states, the consulting CTA); decorative colour goes.

This changes the downstream maths of the review: hierarchy keeps colour as a lever
(see §2), and the decorative-rule and type decisions no longer follow automatically
from a governing constraint — each one gets judged on its own merits.

## §1 — layout

**Reinterpreted.** Not "kill the cards." The intent is that content should be
**contained in a static window on the screen — a viewport**. Clarified to the most
literal reading: a **fixed frame with inner scroll**. The page itself never scrolls;
the window is fixed on screen and content scrolls _inside_ it, with the simulation
fully visible around the frame at all times. A device-screen metaphor — the most
TE reading of the layout, and more radical than what the review proposed.

**Mobile:** full-bleed, keep the metaphor — on small screens the window expands to
near-full screen with a thin margin of simulation visible as a border, and inner
scroll behaviour is kept.

Known costs to design for: accessibility of inner-scroll regions (keyboard focus,
reduced-motion), and in-page anchors/deep links now scrolling a container rather
than the document.

## §2 — hierarchy

**Accepted, strengthened: systematic + fluid.** A defined spacing scale (vertical
rhythm) _and_ a fluid `clamp()`-based type scale, replacing the fixed
3 / 2.25 / 1.875rem steps and the single 768px breakpoint. This settles the review's
open questions 1 and 5 in one move. Because §0 was rejected, colour remains available
as a hierarchy lever — but the spacing/type system is adopted on its own merits, not
because it is the only lever left.

## §3 — type

**Modified: two weights, not one.** The review's "no bold anywhere" is rejected as
too strict for monospace prose, where single-weight inline emphasis becomes invisible.
Rule adopted instead: **regular + one heavier weight for genuine emphasis** (strong in
prose, possibly active nav state). Headings still may not use bold — they earn
prominence through size and space. JetBrains Mono and lowercase `h1–h6` stay, per the
review and without dispute.

## §4 — decorative rules

**Accepted: kill both.** The centered pink `academic-underline` bar (2 call sites:
`blog.scss:26`, `index.scss:114` — not "every page" as the review claims) and the
global `h2` border-bottom both go. The judgement stands independently of the rejected
monochrome mandate: they add noise that size and space communicate better.

## §5 — scrim

**Modified: scrim + halo hybrid.** Scrim as the main legibility device behind the
content window; the existing `over-background` halo mixin stays for content that sits
outside it (nav, footer, floating elements). Lower migration risk than a wholesale
replacement of the mixin's 18 call sites; accepted cost is maintaining two mechanisms.

Interacts strongly with the §1 reinterpretation: a static content window and a scrim
panel are plausibly the _same element_.

## §6 — light mode

**Accepted, with a door left open.** Remove the toggle, the `[data-theme='light']`
palette, `ThemeToggle.tsx`, `useTheme.ts`, the theme branches in 8 stylesheets, and
the 4 covering test files now. But do not architecturally foreclose a later
`prefers-color-scheme` treatment — one that would adapt the _simulations_ (e.g.
dimming) rather than inverting surfaces.

## §7 — illustration

**Accepted, extended.** Schematic / technical-diagram direction confirmed for the six
"what i work on" icons; **draw them as a set** (not sourced) as **SVG illustrations
with SVG animations** — the animation requirement is an addition beyond the review.
Consistent stroke weight across the set. With §0 rejected the icons need not be pure
white, but under the semantic-colour rule they carry no meaning-colour, so they stay
neutral/monochrome in practice.

## review open question 4 — consulting section

**Normalize, accent the CTA.** The section body becomes a peer section — same type
scale, same spacing. Its call-to-action keeps an accent treatment, justified under
the semantic-colour rule (conversion path = meaning), so the path stays visible
without the section shouting.

## secondary observations

**Pulled into scope:**

- **Collapse the three token systems** (`--accent-*`, `--ink-*`, legacy `--retro-*`)
  into one set, structured around the semantic-colour rule. Light-mode removal is the
  natural moment.
- **Rename `--accent-color`** (the silently-pink, load-bearing alias) as part of that
  collapse.
- **Retune or drop the shadow tokens** — black at 0.1 alpha over `#0a0a0a` does
  nothing; re-cut them for the single dark mode.

**Resolved by this document:** the "two design intentions in one file" conflict —
this pass establishes the third direction the review predicted.

**Chat:** the review's implicit question ("does its prominence match its role?") is
answered **yes — chat is first-class**. It gets a proper place inside the window
layout and is restyled to the new system along with everything else, not demoted and
not carved out.

**Left for later:** moving homepage/projects/CV content from TypeScript config to
markdown. Real work, orthogonal to the visual system.

---

## sequencing

**Prototype the window first.** Spike the fixed-window + inner-scroll + scrim shell
on one page; validate against all six backgrounds and on mobile; only then roll out
to all pages and layer in tokens, type scale, and icons. The most radical decision
(§1) gets de-risked before anything else commits to it. Token/light-mode work — safe
and independent — can proceed in parallel or immediately after the spike validates.

---

## implementation addendum — what the live review changed

The plan above was implemented on this branch, with the owner reviewing the real
thing as it built. Decisions made from looking, recorded so the doc stays honest:

- **The window already existed structurally.** `.layout` was a fixed inset panel
  with inner scroll before this work began; the pass made it deliberate — tuned
  scrim, hairline frame, tokens (`--window-*`), rainbow bar and pink hairline gone.
- **Scrim, tuned down from the first guess.** 0.55 alpha over 10px blur buried the
  simulations; shipped at **0.38 over 5px**, which still clears white text on the
  yellow fields.
- **Type scale, tuned down.** The first fluid scale overshot; h1 now tops out at
  2.75rem (not 3.75) and body sits at 15px — monospace wears the smaller cut better.
- **Window geometry evolved through review:** the frame hugs the content column
  (`--window-max-width: 1240px`, side inset as the floor) instead of the viewport;
  the bottom inset is deep (8rem) so the frame rides just above the floating pills,
  which live on the field, not on the panel; the window's own scrollbar is hidden;
  all panel-open/close states animate through one `--window-side` token so nothing
  bounces.
- **The sidebars became floating peer panels** — same insets, scrim, blur, and
  frame as the window; the header tracks the window's geometry exactly in every
  panel state, so the nav no longer lurches. Mobile keeps the bottom-sheet
  (settings) and fullscreen (chat) treatments.
- **No-bold went further than planned:** headings and chrome all sit at 400, with
  600 reserved for inline emphasis and active states — 61 font-weight declarations
  removed.
- **The halo audit kept all ~20 sites.** Everything carrying the halo sits over the
  scrim with the animation behind it; nothing qualified for removal.
- **The header and the page heroes came back out of the window.** A second pass
  moved them onto the bare field: a fixed `.stage` column holds the nav, the
  page hero (`.site-hero`, a Layout prop) and the window, and the window wraps
  only the scrolling content. That killed the machinery the overlap needed —
  `--header-height` and its six consumers, the `.scrolled` header scrim, the
  `isScrolled` listener, and `.fixed-header-container` with its own copy of the
  panel-state matrix, which now lives once on the stage. The nav links took the
  window's language with them (scrim + blur + hairline), since they are
  controls on the simulation now rather than text on a panel. On every page but
  the homepage the hero collapses in step with the scroll — Layout publishes
  `--hero-collapse` (0 → 1) from the window's `scrollTop` and CSS interpolates
  — so the tagline gives its room back to the content.
- **One content width, `--content-max-width: 1100px`** — the projects page's,
  which was the widest. The nav, the heroes, `.main`, the footer and every page
  container cap there, and `--window-max-width` moved 1240 → 1140 so the frame
  keeps the same 20px of air around the column.
- **Beyond the review's scope, same session:** the projects page was rebuilt around
  the hero subtitle's arc (ai · math · audio dsp · distributed systems · misc, ai
  first), the old sections demoted to tags, the catalog refreshed against GitHub,
  and the hero subtitle turned into anchor links into those sections — with
  fragment navigation resolved by hand because the page scrolls inside the window.
  The six expertise icons shipped as hand-drawn animated inline-SVG schematics
  (one grammar, reduced-motion aware).
