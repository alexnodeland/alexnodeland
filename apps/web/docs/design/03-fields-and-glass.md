# design — the fields in three dimensions, and the glass over them

Companion to [`01-decisions.md`](./01-decisions.md) and
[`02-motion-and-spacing-audit.md`](./02-motion-and-spacing-audit.md). Those two
set the page: a fixed window of scrim over six flat simulations. This pass is
the other half. The simulations stopped being pictures of their mathematics and
became the objects the mathematics describes — a membrane, a swell, a skyline,
a waterfall, two landscapes — and the page's chrome was re-cut for what is now
behind it.

**Status.** Built and reviewed by screenshot, on one branch. Verified in a
headless browser on a software rasteriser; **not yet measured on a real GPU or
a real phone** (see §9). Where this document reverses something `01` decided,
it says so.

| §   | topic                         | decision                                                               |
| --- | ----------------------------- | ---------------------------------------------------------------------- |
| 1   | one stage                     | every field draws through one renderer, camera, pointer and post chain |
| 2   | six scenes                    | each gets a third axis that _means_ something in its own mathematics   |
| 3   | colour                        | hue families kept, re-cut as one set on one ground                     |
| 4   | glass                         | **reverses `01`:** heavier scrim and frost, cards filled, title larger |
| 5   | the pointer                   | a press on the bare field belongs to the simulation; the camera leans  |
| 6   | composition around the window | scenes dim under the title; sparse scenes rest closer than the screen  |
| 7   | what a visitor's browser kept | saved settings are a versioned difference from the defaults            |
| 8   | tests                         | three is real in Jest; only the renderer is a stand-in                 |

---

## what the owner decided

Four questions were put before any chrome was touched, and these are the answers
the rest follows from:

- **Chrome: push further.** Not only restraint (keep the type, the layout, the
  lowercase; refine the glass) but three reversals of `01`: faint fills on
  cards, heavier frosted glass, a larger hero title.
- **A press on the field acts on the simulation.** It paints cells, pushes the
  membrane, drops ripples, sets the search's goal. The camera only leans toward
  the pointer; there is no drag-to-orbit.
- **Colours: re-cut as one set.** Each field keeps its hue family, retuned to
  sit on the same ground at comparable brightness. A colour a visitor chose
  themselves still applies.
- **Both of the bold ones.** Pathfinding as a landscape of cost, and the
  oscillator as a waterfall.

## §1 — one stage

Each of the six used to stand up its own renderer, resize handling, frame loop
and idea of what a pointer was. They share all of it now
(`core/stage/`), and a background is a function that builds a scene and
answers a frame (`useStageScene`).

- **`stage.ts`** — the renderer, the loop, stills (`frozen`: one frame, drawn
  arrived, then nothing), a lost context, and failure: a scene that throws
  stops with a console note and the page above it is untouched.
- **`post.ts`** — the scene is drawn in linear light into a half-float,
  multisampled target, so a source can be brighter than white. Then a bloom
  (thirteen-tap downsample with a soft-knee threshold, tent upsample), an
  exposure shoulder that takes a saturated source pale at its core instead of
  clipping it, a vignette, the canopy (§6) and a pixel of grain against
  banding. Its own small chain rather than three's `EffectComposer`, so the
  multisampled target is resolved once.
- **`rig.ts`** — the camera. A scene gives three poses (at rest, with the page
  hidden, squared up to read the 404) and the rig does the rest the same way on
  every field: a lean toward the pointer, a slow drift, a tip forward as the
  window scrolls, a small turn per page of the site so a navigation is a move
  through the scene rather than a cut, and an arrival.
- **`pointer.ts`** — one set of passive listeners on the window. The canvas
  takes no events (everything the visitor reads is above it), so "the field"
  is whatever was hit when nothing was: the document itself, the band the hero
  sits in, or an element marked `data-field-surface`.
- **`quality.ts`** — a tier chosen once (a phone gets no multisampling, a
  shorter bloom chain, fewer elements) and a governor that gives resolution
  back before frame rate when frames run long.
- **`telemetry.ts`** — a one-line readout a scene writes a few times a second.

Settings colours are display colours — the swatch in the panel is what is
drawn — and are converted to linear light on the way in.

## §2 — the six scenes

The rule for every one: the simulation is untouched, and the third axis has to
be something the mathematics already had. Nothing is extruded for effect.

| field       | what it is now                                                   | what height means                                        | the pointer                                                                      |
| ----------- | ---------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| membrane    | a lit plate over a bench, with contours and a faint reflection   | the solution `u`                                         | a term in the equation: a push (wave) or a held temperature (heat); a tap pulses |
| waves       | a sheet of water out to a horizon, evaluated in the shader       | the sum of the three sines                               | each ripple is one more wave in the sum                                          |
| automaton   | a board larger than the view, live cells standing on it          | how long a cell has lived                                | stirs cells awake; a press paints; a tap stamps a glider, R-pentomino or ship    |
| oscillator  | a waterfall: the spectrum now at the front, its history receding | level at a frequency, in decibels                        | a probe reads frequency, note and level; a tap plucks a note at that pitch       |
| scheduling  | the network on a bench                                           | the search: considered, in the best set, or both         | picks a node up and moves it; a tap reheats the search                           |
| pathfinding | the graph as the landscape the search is exploring               | the cost `g` from the start, so the path is the way down | a tap sets the goal and the search starts again                                  |

Two of these are worth the sentence each:

- **The oscillator stopped being a shader of `t`.** A function of time alone
  has no memory, so the old filter, delay and reverb were faked. The synth is
  now state advanced a sample at a time into a ring (`synth.ts`): accumulated
  phase, a state-variable filter, a delay line, taps on the signal. The scope
  draws the ring and the waterfall is a constant-Q transform of the same
  samples. It is tested as a synthesizer: in tune, calibrated, a sawtooth with
  a sawtooth's harmonics.
- **Pathfinding's picture is the algorithm.** Dijkstra lifts a round bowl
  around the start; raising the heuristic's weight stretches it into a trough
  toward the goal. The found path is drawn as what it is on such a surface: a
  marble rolling from the goal down to the start.

Every scene still plays the 404 — its own problem with the number as the
input — and for it the camera comes round to straight overhead, at the
distance where the ground plane is exactly the screen, so the number reads flat
and the layout arithmetic that placed it is the arithmetic it always was.

## §3 — colour

The six were tuned one at a time over several months and did not sit together:
one field was near-black, another saturated edge to edge. Each keeps its hue
family and is re-cut against the same ground (`--bg-stage`, `#07080a`) to peak
at about the same brightness once the bloom and the shoulder have had their
say.

| field       | hue family              | what changed                                                          |
| ----------- | ----------------------- | --------------------------------------------------------------------- |
| membrane    | cyan against coral      | zero is near-black blue, so the plate has a dark state to rise out of |
| waves       | indigo → magenta → gold | darker water, contour-led; the gold is kept for the crests            |
| automaton   | green with amber births | brighter, cleaner green; old cells go pale gold                       |
| oscillator  | cyan → violet → cream   | the magenta mid became violet; the peak a warm white, not pure yellow |
| scheduling  | cyan, gold, magenta     | the unreached network is a quiet blue-grey rather than near-black     |
| pathfinding | blue path, gold search  | the frontier is gold, not pure yellow; the start a softer red         |

## §4 — the glass (three reversals of `01`)

`01` tuned the scrim _down_ to 0.38 over a 5px blur so that flat fields would
read through the page, kept every block an outline because "a fill inside
glass reads as a lid on the animation", and brought the title down to 2.75rem.
All three were right for what was behind the page then. Behind it now are lit
scenes, and what the window wants from one is its light, not its lines.

- **Scrim 0.38 → 0.56, blur 5px → 20px, saturation put back (×1.5).** The
  scene under the window is colour and movement; the scene beside it is sharp;
  the difference is what says the window is in front. A phone takes 12px. The
  three filters are tokens (`--glass-window`, `--glass-panel`, `--glass-chip`)
  and everything that sets a backdrop filter takes one.
- **Every surface is lit from above.** A brighter top hairline, a dimmer foot,
  a line of light inside the top edge (`lit-edge`, `--edge-light`), and a sheen
  down from the window's top. Three border colours and nothing cleverer, so
  every engine draws it the same.
- **The window casts a shadow.** It could not before: its frame is clipped by
  the fold, and a clip removes exactly what falls outside the box. The sheen
  and the shadow live on the edge layer, whose box is the window as it is seen
  at every point of the fold.
- **Cards are surfaces.** `outline-block` keeps its name and gains a wash of
  5% falling to under 2% — at those alphas the field's light still comes
  through, so it is not the lid `01` was avoiding. What it buys is that a card
  is a thing and the gap between two cards is not.
- **The title tops out at 3.5rem.** The slope is cut so the two curves cross at
  768px: nothing below a tablet moves, and the growth is all in the room a
  wide screen has to give. The fold's scale is re-stepped (four steps above a
  tablet instead of two) to keep the folded brand at the rail's type size.

Unchanged, on purpose: JetBrains Mono, lowercase, 400 with 600 for emphasis
only, colour only where it means something, one chamfer, nothing lifts.

## §5 — the pointer

- **On the field, the simulation answers** (§2). The cursor there is a
  crosshair; a press dragged across the page stays the field's and does not
  select the paragraphs it crosses.
- **On the glass, the page answers.** A soft disc of light follows the cursor,
  blended as an overlay so it brightens what is already lit and leaves the dark
  alone: hairlines catch it, the field's glow under the scrim pools, ink comes
  up a step. One element moved by `transform`. The alternative — the pointer's
  position published on the root for every card to read — is the
  document-wide custom-property publisher `02` already paid to remove.
- **The cycle waits for a hand.** A background's twelve seconds are for
  watching; one that is being pushed around is not faded out from under the
  hand, and moves on nine seconds after the last touch.
- **A readout chip beside the pill** says what the simulation is doing —
  a generation count, a temperature, a frontier — a few times a second. It is
  hidden from assistive technology: it would be a voice that never stops
  counting.
- **On a phone** the explore surface is field to a finger: a drag pushes the
  simulation, a tap still toggles the controls.

## §6 — composition around the window

The window covers the middle of every screen. Two things follow.

- **The canopy.** The title and tagline sit at the top on the bare field, and a
  halo on the letters only goes so far against a field that is allowed to be
  brighter than white. So the picture gives way there: it dims toward the top,
  in light, before the shoulder — which reads as the scene receding rather
  than a band laid over it. It lifts when the page's content is hidden and
  when the 404's number is forming. The halo itself gained a third, wider
  layer.
- **Sparse scenes rest closer than the screen.** The two graphs were composed
  to fit the screen, which put them under the window: a few glows through the
  glass and an empty field around it. At rest they are now larger than the
  screen — clusters in the margins and the bands above and below, links
  running under the glass — and step back to take the whole graph in when the
  page is hidden. The scheduler's network starts its slow turn a twelfth of a
  turn on, so the top of the screen is between clusters for the first stretch
  of a visit.

## §7 — what a visitor's browser kept

The whole settings state used to be saved, changed or not, which made a default
something a visitor got once. Every returning visitor would have seen the new
scenes through the old ones' numbers. What is saved now is a versioned
difference: the background that was up, and only the settings that are not the
defaults (`core/persistence.ts`).

A blob from before the change is read once: the background that was up is kept,
and so is any colour that is not the colour the old version shipped — a
visitor's own palette is theirs. Every other number in it is let go; they were
tuned against pictures that no longer exist.

## §8 — tests

The shared Jest setup mocked three by hand, which let a scene mount and proved
nothing about it. The library is real in tests now (the module build, mapped in
`jest.config.js`) and only `WebGLRenderer` is a stand-in.

- `scenes.test.tsx` asks one contract of all six: start without complaint,
  draw, hold a still, play the 404, take a new look without restarting, follow
  the viewport, leave nothing behind — and leave the page standing where there
  is no WebGL.
- The stage, post chain, rig, governor, pointer and readout are tested on their
  own with the frame clock in the test's hands; the membrane's framing is
  checked against the projection it is drawn with.
- What cannot be asked in jsdom is what a frame looks like. That is what the
  screenshots were for, and it is why this pass was reviewed by eye.

`window.__fieldQuality = { governor: false, pixelRatio: n }` pins the
resolution for a test or a capture.

## §9 — what this pass did not establish

- **Performance on real hardware.** Everything was run on a software
  rasteriser. The tier, the governor and the phone's lighter blur are the
  design's answer to cost, and none of them has been measured on a phone. The
  heavier frost in particular is a full-window backdrop filter over a canvas
  that repaints every frame; if a device struggles, `--window-blur` is the
  first number to bring down.
- **Firefox and WebKit.** The end-to-end suite was run here on Chromium,
  desktop and phone-sized; the other engines run in CI.
- **The post about the backgrounds** (`250928_interactive-algorithm-
visualizations.md`) describes the flat pictures in places. Its prose was
  left alone; the sentences that no longer match were listed for the owner.
- **`prefers-color-scheme`.** `01` left a door open for a light treatment that
  adapts the simulations. The exposure and canopy in the grade pass are where
  that would now be done; nothing uses them for it yet.
