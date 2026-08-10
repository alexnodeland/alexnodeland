# design review — alexnodeland.com

**scope:** layout and visual system only. no content is cut, added, or rewritten.
**site:** [alexnodeland.com](https://alexnodeland.com) · repo `alexnodeland/alexnodeland` · Gatsby 5.15, SCSS

---

## the governing rule

> **The background is the only element allowed to have colour. Everything else is white.**

Colour is not reduced — it is _relocated_. The six animated simulations keep their full
palette and stay exactly as they are. All content chrome above them drops to white:
text, rules, borders, buttons, icons.

One exception, deliberate: **links stay green.** With everything else monochrome, a link
needs a signal that isn't shared with body text, and green is already the site's
established link colour.

Everything below follows from this rule.

---

## 1. layout — one column, left aligned

**Now:** content sits in discrete cards, each with its own border, background fill, and
hover state. The eye has to re-enter a new container at every section.

**Change:** remove the card treatment. One content column, consistent max-width,
everything left aligned inside it.

`h1` is currently `text-align: center` in `global.scss` — this is a base-stylesheet
change, not a per-page one.

**Terminology note:** the fix is _removing the card treatment_, not adding scroll. The
problem was never scrolling; it was that content was chunked into boxes.

---

## 2. hierarchy — size and whitespace only

Three levers are normally available for hierarchy: **colour, weight, size/space.**
Colour is spent on the background. Weight is off the table (see §3). So size and
whitespace carry the entire structure alone.

This is a real constraint, not a stylistic preference. It means:

- **Spacing must be significantly more generous than it is now.** With no borders and no
  colour to separate sections, white space _is_ the separator. Under-spacing will read
  as undifferentiated mush.
- **The type scale must do more work.** The current fixed scale (3 / 2.25 / 1.875rem)
  with a single 768px breakpoint may need widening at the top, or a fluid scale.
- Spacing should be systematic — a defined vertical rhythm, not ad-hoc margins.

**Open:** whether to keep the fixed scale or move to fluid (`clamp()`).

---

## 3. type — crisp, no bold

**No bold anywhere.** One weight throughout the site.

"Crisp" here means _sharp and deliberate_ — clean edges, tight letter-spacing, confident
sizing — not _light_ or _thin_. Headings earn their prominence through size and the space
around them.

**Typeface stays JetBrains Mono**, and the forced `text-transform: lowercase` on
`h1–h6` stays. This is the site's voice and it reads as engineer's-notebook, which serves
_digital garden_ well.

> **Note on the Teenage Engineering reference:** TE uses a neo-grotesque with small
> uppercase labels — not monospace. The TE influence on this site should be understood as
> **layout, labelling, and iconography**, not typography. Applying it to type would fight
> the site's existing voice.

---

## 4. kill the decorative rules

Two base-stylesheet decorations go:

- the centered 60px pink bar under every `h1` (the `academic-underline` mixin)
- the `border-bottom` on every `h2`

Both are applied globally, so both are single-point removals. They add colour and visual
noise to every page while communicating nothing that size and space won't.

---

## 5. legibility over the backgrounds — subtle scrim

The backgrounds run from near-black to saturated yellow. White text on yellow is the
worst case, and it is already handled in one place: the `over-background` mixin applies a
dark text-shadow halo to the nav, footer, and page titles.

Once _all_ content is white, that mixin's job would expand to the whole site.

**Decision: use a subtle scrim instead** — a soft dark field behind the content column.
More legible than a per-glyph halo, and closer to how TE handles a panel over a field.

The scrim must be tuned carefully: heavy enough to guarantee contrast against the yellow
PDE field, light enough that the simulation stays visible through it. This is the single
riskiest item in the review and should be tested against all six backgrounds, not just
the default one.

---

## 6. kill light mode

The entire `[data-theme='light']` block in `variables.scss` is removed, along with the
theme toggle.

**Reasoning, for the record:** the site's identity is content floating over live
simulations on a dark field. Light mode inverted the surfaces but not the backgrounds —
which do not follow the theme — so the two halves never agreed with each other. One
well-executed mode beats two compromised ones. Maintaining a second full palette also
doubles the contrast-tuning burden for a mode that undercuts the concept.

_(Counter-argument, noted and rejected: Teenage Engineering's own visual identity is
predominantly light. The reference is being taken for layout and labelling, not surface
colour.)_

---

## 7. illustration — retro schematic

The six "what i work on" icons move to a more retro treatment. Direction: **schematic /
technical-diagram**, monochrome white, consistent stroke weight — closer to a panel
legend or a circuit diagram than to a modern icon set.

This is where the TE reference belongs most literally.

**Open:** source or draw. Given consistent stroke weight matters here, drawing them as a
set is likely better than assembling from a library.

---

## secondary observations

Found while reading the codebase. Not part of the decided scope — noted for later.

| observation                                                                                                                             | why it matters                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Three parallel token systems in `variables.scss`: `--accent-*`, `--ink-*`, and a `// Legacy compatibility` block of `--retro-*` aliases | Killing light mode and going monochrome is the natural moment to collapse these into one set                                                     |
| `--accent-color` silently resolves to pink                                                                                              | Misleading name; a maintenance trap                                                                                                              |
| Shadow tokens are black at 0.1 alpha over `#0a0a0a`                                                                                     | They do almost nothing in dark mode. With light mode gone, they can be re-tuned or dropped                                                       |
| Palette is commented "retro futuristic"; shadows are commented "academic feel"; there is a mixin named `academic-underline`             | Two design intentions coexisting in one file. This review resolves the conflict in favour of neither — it establishes a third, clearer direction |
| `chat.scss` is 2,660 lines — larger than any page stylesheet (9,521 lines of SCSS total)                                                | The chat box is, by styling volume, the biggest thing on the site. Worth asking whether its visual prominence matches that                       |
| Homepage, projects, and CV content live in TypeScript config files; only the blog is markdown                                           | Editing friction, if content changes ever become part of the work                                                                                |

---

## the target feel

A **personal digital garden** — professionally designed, good taste, owned by someone who
likes Teenage Engineering products.

Reading that as concrete properties:

- **garden** — one continuous column, generous space, unhurried, nothing shouting
- **professional** — systematic spacing, consistent stroke weights, deliberate scale
- **TE** — monochrome panel over a live field, schematic iconography, restraint everywhere
  except the one place colour is permitted

---

## open questions

1. Fixed type scale or fluid (`clamp()`)?
2. Scrim opacity — needs testing against all six backgrounds, especially the yellow PDE field
3. Icons — draw as a set, or source?
4. Does the consulting section's visual weight change under the new hierarchy, or hold its current prominence?
5. Vertical rhythm — define a spacing scale, or tune section by section?

---

## risk register

- **Scrim tuning** is the highest-risk item. Get it wrong toward opaque and the
  backgrounds — the whole concept — disappear. Get it wrong toward transparent and white
  text fails on yellow.
- **Hierarchy with two levers** is unforgiving. If spacing is not increased substantially,
  removing cards and colour will make the page read as flat rather than calm.
