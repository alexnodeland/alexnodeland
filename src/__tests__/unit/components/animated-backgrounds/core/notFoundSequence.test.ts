import {
  NOT_FOUND_FORM_SECONDS,
  NOT_FOUND_RELEASE_SECONDS,
  NotFoundSequence,
  viewportReshaped,
} from '../../../../../components/animated-backgrounds/core/notFoundSequence';

describe('NotFoundSequence', () => {
  it('forms over the form time and eases, then holds', () => {
    const s = new NotFoundSequence();
    expect(s.value).toBe(0);
    expect(s.active).toBe(false);
    s.advance(NOT_FOUND_FORM_SECONDS / 2, true);
    expect(s.raw).toBeCloseTo(0.5, 5);
    expect(s.value).toBeCloseTo(0.5, 5);
    expect(s.active).toBe(true);
    s.advance(NOT_FOUND_FORM_SECONDS, true);
    expect(s.raw).toBe(1);
    expect(s.value).toBe(1);
    expect(s.seconds).toBeCloseTo(NOT_FOUND_FORM_SECONDS * 1.5, 5);
  });

  it('eases in rather than snapping', () => {
    const s = new NotFoundSequence();
    s.advance(NOT_FOUND_FORM_SECONDS * 0.1, true);
    expect(s.value).toBeLessThan(s.raw);
    s.advance(NOT_FOUND_FORM_SECONDS * 0.8, true);
    expect(s.value).toBeGreaterThan(s.raw);
  });

  it('lets go faster than it formed, and forgets the clock once gone', () => {
    const s = new NotFoundSequence();
    s.advance(NOT_FOUND_FORM_SECONDS, true);
    s.advance(NOT_FOUND_RELEASE_SECONDS / 2, false);
    expect(s.raw).toBeCloseTo(0.5, 5);
    expect(s.seconds).toBeGreaterThan(0);
    s.advance(NOT_FOUND_RELEASE_SECONDS, false);
    expect(s.raw).toBe(0);
    expect(s.seconds).toBe(0);
    expect(s.active).toBe(false);
  });

  it('settles to either end at once', () => {
    const s = new NotFoundSequence();
    expect(s.settle(true)).toBe(1);
    expect(s.seconds).toBe(NOT_FOUND_FORM_SECONDS);
    expect(s.settle(false)).toBe(0);
    expect(s.seconds).toBe(0);
  });
});

describe('viewportReshaped', () => {
  it('ignores a URL bar sliding in and out', () => {
    expect(
      viewportReshaped({ width: 390, height: 664 }, { width: 390, height: 750 })
    ).toBe(false);
  });

  it('notices a width change or a real change of shape', () => {
    expect(
      viewportReshaped({ width: 390, height: 664 }, { width: 750, height: 664 })
    ).toBe(true);
    expect(
      viewportReshaped({ width: 800, height: 400 }, { width: 800, height: 900 })
    ).toBe(true);
    expect(
      viewportReshaped({ width: 800, height: 900 }, { width: 800, height: 400 })
    ).toBe(true);
  });
});
