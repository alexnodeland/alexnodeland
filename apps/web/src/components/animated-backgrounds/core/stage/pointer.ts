/**
 * The pointer, as the field sees it.
 *
 * The simulations sit under the page: their canvas takes no pointer events,
 * because the window, the rail and the panels are all above it and all of
 * them have to keep working. So nothing here is an event handler on the
 * canvas. It is one set of passive listeners on the window, shared by
 * whichever background is up, that keeps three facts current:
 *
 *   where the pointer is     — always, over chrome or not. A scene reads it
 *                              every frame to place its probe and to lean
 *                              the camera, and a light under the glass that
 *                              follows the cursor across a paragraph is most
 *                              of what makes the field feel like a place.
 *   whether it is on the     — the bare field: the margins beside the window,
 *   field                      the band the hero sits in, or the whole screen
 *                              once the chrome is hidden. Only there does a
 *                              press belong to the simulation.
 *   what it did there        — a press held (paint, push, drag), or a tap
 *                              (drop a pattern, set a goal), queued for the
 *                              scene to take on its next frame.
 *
 * Reference counted: a background switching in mounts before the one it
 * replaces has unmounted, and the listeners should not flap for that.
 */

export interface FieldTap {
  /** Normalised device coordinates, −1 → 1, y up. */
  x: number;
  y: number;
  /** `performance.now()` at release. */
  time: number;
}

export interface PointerState {
  /** Normalised device coordinates of the last known position, y up. */
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  /** Whether a pointer is on the page at all. False until one moves, and
   * again once a mouse leaves the window or a finger lifts. */
  present: boolean;
  /** Whether what is under the pointer is the bare field. */
  overField: boolean;
  /** Whether a press that began on the field is being held. */
  pressed: boolean;
  /** `performance.now()` of the last movement. */
  lastMove: number;
  /** How far the pointer has travelled since the scene last asked, in NDC. */
  travel: number;
  pointerType: string;
}

// A press that lets go this soon, this close to where it began, was a tap.
const TAP_MS = 320;
const TAP_SLOP_PX = 8;

// The classes the stylesheet answers: a probe's cursor over the field, and no
// text selection while a press that began there is dragged across the page.
const OVER_CLASS = 'over-field';
const PRESS_CLASS = 'field-pressing';

/**
 * Whether an event target is the field rather than something drawn on it.
 * Everything on the site is a fixed layer over the canvas, and the canvas
 * takes no events, so "nothing was hit" arrives as the document itself. Two
 * more things count: the band at the top of the window's scroll, which is
 * bare field until the frame folds up over it, and anything that says so —
 * the phone's explore surface is a button covering the whole screen.
 */
export const isFieldTarget = (target: EventTarget | null): boolean => {
  if (typeof document === 'undefined') return false;
  if (target === document.documentElement || target === document.body)
    return true;
  if (!(target instanceof Element)) return false;
  return (
    target.classList.contains('window-band') ||
    target.closest('[data-field-surface]') !== null
  );
};

const state: PointerState = {
  x: 0,
  y: 0,
  clientX: 0,
  clientY: 0,
  present: false,
  overField: false,
  pressed: false,
  lastMove: 0,
  travel: 0,
  pointerType: 'mouse',
};

let taps: FieldTap[] = [];
let users = 0;
// `performance.now()` of the last time a press had hold of the field, and
// zero until one has. The manager reads it before it changes the background:
// a simulation someone is in the middle of pushing around is not swapped out
// from under their hand.
let touchedAt = 0;

/** When the field was last pressed, dragged across or tapped. 0 if never. */
export const fieldTouchedAt = (): number => touchedAt;
let pressStart: { x: number; y: number; time: number; id: number } | null =
  null;

const toNdc = (clientX: number, clientY: number) => {
  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;
  return {
    x: (clientX / width) * 2 - 1,
    y: 1 - (clientY / height) * 2,
  };
};

const setOverField = (over: boolean) => {
  if (state.overField === over) return;
  state.overField = over;
  document.documentElement.classList.toggle(OVER_CLASS, over);
};

const place = (event: PointerEvent) => {
  const { x, y } = toNdc(event.clientX, event.clientY);
  if (state.present) state.travel += Math.hypot(x - state.x, y - state.y);
  state.x = x;
  state.y = y;
  state.clientX = event.clientX;
  state.clientY = event.clientY;
  state.present = true;
  state.lastMove = performance.now();
  state.pointerType = event.pointerType || 'mouse';
};

// Let go of a press without calling it anything: no tap comes of it.
const dropPress = () => {
  if (!pressStart) return;
  pressStart = null;
  state.pressed = false;
  document.documentElement.classList.remove(PRESS_CLASS);
};

const onMove = (event: PointerEvent) => {
  place(event);
  // A release is not always delivered — the button let go over another
  // window, a context menu taking the gesture — and a press that never ends
  // would have the pointer painting wherever it went from then on. A mouse
  // that is moving with no button down is not pressing.
  if (state.pressed && event.pointerType === 'mouse' && event.buttons === 0)
    dropPress();
  // A held press keeps the field for as long as it is held: dragged across
  // the window's edge, it is still the same gesture.
  if (state.pressed) touchedAt = state.lastMove;
  else setOverField(isFieldTarget(event.target));
};

const onDown = (event: PointerEvent) => {
  if (!event.isPrimary || event.button !== 0) return;
  place(event);
  const onField = isFieldTarget(event.target);
  setOverField(onField);
  if (!onField) return;
  state.pressed = true;
  touchedAt = state.lastMove;
  pressStart = {
    x: event.clientX,
    y: event.clientY,
    time: performance.now(),
    id: event.pointerId,
  };
  document.documentElement.classList.add(PRESS_CLASS);
};

const endPress = (event: PointerEvent, completed: boolean) => {
  if (!pressStart || event.pointerId !== pressStart.id) return;
  const start = pressStart;
  pressStart = null;
  state.pressed = false;
  document.documentElement.classList.remove(PRESS_CLASS);
  if (!completed) return;
  const now = performance.now();
  touchedAt = now;
  const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
  if (now - start.time <= TAP_MS && moved <= TAP_SLOP_PX) {
    const { x, y } = toNdc(event.clientX, event.clientY);
    taps.push({ x, y, time: now });
    // A scene that is not running (a still, a hidden tab) never drains the
    // queue; it must not grow for that.
    if (taps.length > 8) taps = taps.slice(-8);
  }
};

const onUp = (event: PointerEvent) => {
  endPress(event, true);
  // A finger that lifts is gone; a mouse is still wherever it was.
  if (event.pointerType === 'touch') {
    state.present = false;
    setOverField(false);
  }
};

const onCancel = (event: PointerEvent) => {
  endPress(event, false);
  if (event.pointerType === 'touch') {
    state.present = false;
    setOverField(false);
  }
};

const onLeave = () => {
  state.present = false;
  setOverField(false);
};

// The window losing focus mid-press: whatever was held is let go.
const onBlur = () => {
  dropPress();
  onLeave();
};

const attach = () => {
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onCancel, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onBlur);
};

const detach = () => {
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerdown', onDown);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onCancel);
  document.documentElement.removeEventListener('pointerleave', onLeave);
  window.removeEventListener('blur', onBlur);
  document.documentElement.classList.remove(OVER_CLASS, PRESS_CLASS);
  state.present = false;
  state.overField = false;
  state.pressed = false;
  state.travel = 0;
  pressStart = null;
  taps = [];
};

export interface PointerHandle {
  state: Readonly<PointerState>;
  /** The taps on the field since the last call, oldest first. */
  takeTaps: () => FieldTap[];
  /** How far the pointer has travelled since the last call, in NDC. */
  takeTravel: () => number;
  release: () => void;
}

/** Start listening (if nobody is yet) and hand back the shared state. */
export const acquirePointer = (): PointerHandle => {
  if (typeof window !== 'undefined' && users === 0) attach();
  users += 1;
  let released = false;
  return {
    state,
    takeTaps: () => {
      if (taps.length === 0) return taps;
      const taken = taps;
      taps = [];
      return taken;
    },
    takeTravel: () => {
      const travelled = state.travel;
      state.travel = 0;
      return travelled;
    },
    release: () => {
      if (released) return;
      released = true;
      users -= 1;
      if (typeof window !== 'undefined' && users === 0) detach();
    },
  };
};
