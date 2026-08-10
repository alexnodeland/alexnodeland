# design review — decisions log

Working companion to [`00-original-review.md`](./00-original-review.md).

The original review is a proposal written from the outside. This file records what
we actually decided, point by point, and why. Where we diverge from the review, the
divergence is stated rather than silently applied.

**Status:** in progress — walking the review section by section.

| §   | topic                    | decision  | notes |
| --- | ------------------------ | --------- | ----- |
| —   | governing rule           | _pending_ |       |
| 1   | one column, left aligned | _pending_ |       |
| 2   | hierarchy — size + space | _pending_ |       |
| 3   | type — no bold           | _pending_ |       |
| 4   | decorative rules         | _pending_ |       |
| 5   | scrim                    | _pending_ |       |
| 6   | light mode               | _pending_ |       |
| 7   | schematic icons          | _pending_ |       |
| —   | secondary observations   | _pending_ |       |

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

_pending_

## §1 — layout

_pending_

## §2 — hierarchy

_pending_

## §3 — type

_pending_

## §4 — decorative rules

_pending_

## §5 — scrim

_pending_

## §6 — light mode

_pending_

## §7 — illustration

_pending_

## secondary observations

_pending_
