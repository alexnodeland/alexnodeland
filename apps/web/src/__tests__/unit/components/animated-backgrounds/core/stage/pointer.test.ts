import {
  acquirePointer,
  fieldTouchedAt,
  isFieldTarget,
} from '../../../../../../components/animated-backgrounds/core/stage/pointer';

// jsdom's pointer events are mouse events with a few more fields; built by
// hand so the test does not depend on which jsdom has the constructor.
const pointer = (
  type: string,
  target: EventTarget,
  init: {
    x?: number;
    y?: number;
    pointerType?: string;
    button?: number;
    buttons?: number;
    pointerId?: number;
    isPrimary?: boolean;
  } = {}
) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
    button: init.button ?? 0,
    buttons: init.buttons ?? 0,
  });
  Object.defineProperties(event, {
    pointerType: { value: init.pointerType ?? 'mouse' },
    pointerId: { value: init.pointerId ?? 1 },
    isPrimary: { value: init.isPrimary ?? true },
  });
  target.dispatchEvent(event);
};

const root = () => document.documentElement;

describe('the pointer, as the field sees it', () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 500,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalHeight,
    });
    document.body.innerHTML = '';
  });

  describe('what counts as the field', () => {
    it('is whatever was hit when nothing was', () => {
      // The canvas takes no events and everything else is a layer over it,
      // so a miss arrives as the document itself.
      expect(isFieldTarget(document.documentElement)).toBe(true);
      expect(isFieldTarget(document.body)).toBe(true);
    });

    it('is the band the hero sits in, and anything that says it is', () => {
      const band = document.createElement('div');
      band.className = 'window-band';
      const surface = document.createElement('button');
      surface.setAttribute('data-field-surface', '');
      const inside = document.createElement('span');
      surface.appendChild(inside);
      document.body.append(band, surface);
      expect(isFieldTarget(band)).toBe(true);
      expect(isFieldTarget(surface)).toBe(true);
      expect(isFieldTarget(inside)).toBe(true);
    });

    it('is not the page', () => {
      const card = document.createElement('article');
      document.body.appendChild(card);
      expect(isFieldTarget(card)).toBe(false);
      expect(isFieldTarget(null)).toBe(false);
    });
  });

  it('keeps the position in device coordinates, y up, wherever it is', () => {
    const handle = acquirePointer();
    const card = document.createElement('article');
    document.body.appendChild(card);
    expect(handle.state.present).toBe(false);

    pointer('pointermove', card, { x: 750, y: 125 });
    expect(handle.state.present).toBe(true);
    expect(handle.state.x).toBeCloseTo(0.5);
    expect(handle.state.y).toBeCloseTo(0.5);
    // Over the page, not the field — but still followed.
    expect(handle.state.overField).toBe(false);
    handle.release();
  });

  it('marks the root while the pointer is over bare field', () => {
    const handle = acquirePointer();
    const card = document.createElement('article');
    document.body.appendChild(card);

    pointer('pointermove', root(), { x: 10, y: 10 });
    expect(handle.state.overField).toBe(true);
    expect(root().classList.contains('over-field')).toBe(true);

    pointer('pointermove', card, { x: 500, y: 250 });
    expect(handle.state.overField).toBe(false);
    expect(root().classList.contains('over-field')).toBe(false);
    handle.release();
  });

  it('measures how far the pointer has travelled between asks', () => {
    const handle = acquirePointer();
    pointer('pointermove', root(), { x: 500, y: 250 });
    handle.takeTravel();
    pointer('pointermove', root(), { x: 1000, y: 250 });
    expect(handle.takeTravel()).toBeCloseTo(1);
    expect(handle.takeTravel()).toBe(0);
    handle.release();
  });

  it('holds a press that began on the field, and calls a short one a tap', () => {
    const handle = acquirePointer();
    const before = fieldTouchedAt();

    pointer('pointerdown', root(), { x: 250, y: 125 });
    expect(handle.state.pressed).toBe(true);
    expect(root().classList.contains('field-pressing')).toBe(true);

    pointer('pointerup', root(), { x: 252, y: 126 });
    expect(handle.state.pressed).toBe(false);
    expect(root().classList.contains('field-pressing')).toBe(false);

    const taps = handle.takeTaps();
    expect(taps).toHaveLength(1);
    expect(taps[0].x).toBeCloseTo(-0.496);
    expect(taps[0].y).toBeCloseTo(0.496);
    // Taken once.
    expect(handle.takeTaps()).toHaveLength(0);
    // And the manager can tell a hand was on the field.
    expect(fieldTouchedAt()).toBeGreaterThanOrEqual(before);
    expect(fieldTouchedAt()).toBeGreaterThan(0);
    handle.release();
  });

  it('does not call a drag a tap', () => {
    const handle = acquirePointer();
    pointer('pointerdown', root(), { x: 100, y: 100 });
    pointer('pointermove', root(), { x: 300, y: 100, buttons: 1 });
    expect(handle.state.pressed).toBe(true);
    pointer('pointerup', root(), { x: 300, y: 100 });
    expect(handle.takeTaps()).toHaveLength(0);
    handle.release();
  });

  it('keeps the field for a press dragged across the page', () => {
    const handle = acquirePointer();
    const card = document.createElement('article');
    document.body.appendChild(card);

    pointer('pointerdown', root(), { x: 10, y: 10 });
    pointer('pointermove', card, { x: 500, y: 250, buttons: 1 });
    // Still the same gesture.
    expect(handle.state.pressed).toBe(true);
    expect(handle.state.overField).toBe(true);

    pointer('pointerup', card, { x: 500, y: 250 });
    expect(handle.state.pressed).toBe(false);
    handle.release();
  });

  it('leaves a press on the page to the page', () => {
    const handle = acquirePointer();
    const card = document.createElement('article');
    document.body.appendChild(card);
    pointer('pointerdown', card, { x: 500, y: 250 });
    expect(handle.state.pressed).toBe(false);
    pointer('pointerup', card, { x: 500, y: 250 });
    expect(handle.takeTaps()).toHaveLength(0);
    handle.release();
  });

  it('ignores a second finger and a right button', () => {
    const handle = acquirePointer();
    pointer('pointerdown', root(), { isPrimary: false });
    expect(handle.state.pressed).toBe(false);
    pointer('pointerdown', root(), { button: 2 });
    expect(handle.state.pressed).toBe(false);
    handle.release();
  });

  it('lets go of a press the browser took away, without a tap', () => {
    const handle = acquirePointer();
    pointer('pointerdown', root(), { x: 100, y: 100, pointerType: 'touch' });
    expect(handle.state.pressed).toBe(true);
    pointer('pointercancel', root(), { x: 100, y: 100, pointerType: 'touch' });
    expect(handle.state.pressed).toBe(false);
    expect(handle.takeTaps()).toHaveLength(0);
    // A finger that has lifted is not hovering anywhere.
    expect(handle.state.present).toBe(false);
    handle.release();
  });

  it('lets go of a press whose release was never delivered', () => {
    // The button let go over another window: the next the page hears is the
    // mouse moving with nothing held.
    const handle = acquirePointer();
    const card = document.createElement('article');
    document.body.appendChild(card);
    pointer('pointerdown', root(), { x: 10, y: 10 });
    pointer('pointermove', card, { x: 500, y: 250, buttons: 0 });
    expect(handle.state.pressed).toBe(false);
    expect(root().classList.contains('field-pressing')).toBe(false);
    // Not a tap, and no longer the field's: it is over the page.
    expect(handle.takeTaps()).toHaveLength(0);
    expect(handle.state.overField).toBe(false);
    handle.release();
  });

  it("keeps a finger's press through a move, whatever its buttons say", () => {
    const handle = acquirePointer();
    pointer('pointerdown', root(), { x: 10, y: 10, pointerType: 'touch' });
    pointer('pointermove', root(), { x: 60, y: 60, pointerType: 'touch' });
    expect(handle.state.pressed).toBe(true);
    pointer('pointerup', root(), { x: 60, y: 60, pointerType: 'touch' });
    handle.release();
  });

  it('lets go of everything when the window loses focus', () => {
    const handle = acquirePointer();
    pointer('pointerdown', root(), { x: 10, y: 10 });
    window.dispatchEvent(new Event('blur'));
    expect(handle.state.pressed).toBe(false);
    expect(handle.state.present).toBe(false);
    expect(root().classList.contains('field-pressing')).toBe(false);
    expect(handle.takeTaps()).toHaveLength(0);
    handle.release();
  });

  it('listens for as long as anyone is, and tidies up after the last', () => {
    // A background switching in mounts before the one it replaces has gone.
    const first = acquirePointer();
    const second = acquirePointer();
    first.release();

    pointer('pointermove', root(), { x: 10, y: 10 });
    expect(second.state.overField).toBe(true);

    second.release();
    expect(root().classList.contains('over-field')).toBe(false);
    expect(second.state.present).toBe(false);

    // Nobody listening: the page moves the pointer and nothing is marked.
    pointer('pointermove', root(), { x: 20, y: 20 });
    expect(root().classList.contains('over-field')).toBe(false);
    // Releasing twice is not releasing someone else's.
    first.release();
    const third = acquirePointer();
    pointer('pointermove', root(), { x: 30, y: 30 });
    expect(third.state.overField).toBe(true);
    third.release();
  });
});
