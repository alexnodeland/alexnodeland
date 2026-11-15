import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  heading,
  presenceOf,
  setHeading,
  smooth,
  staggered,
} from '../../../../../../components/animated-backgrounds/core/stage/passage';

describe('coming on and going off', () => {
  afterEach(() => setHeading(1));

  describe('which way the set is being walked', () => {
    it('is forward until told otherwise, and remembers', () => {
      expect(heading()).toBe(1);
      setHeading(-1);
      expect(heading()).toBe(-1);
      setHeading(1);
      expect(heading()).toBe(1);
    });
  });

  describe('the eases', () => {
    const eases = { smooth, easeIn, easeOut, easeOutBack };

    it.each(Object.entries(eases))(
      '%s starts at nothing and ends at all of it',
      (_name, ease) => {
        expect(ease(0)).toBeCloseTo(0);
        expect(ease(1)).toBeCloseTo(1);
        // And is asked for nothing outside the movement.
        expect(ease(-3)).toBeCloseTo(0);
        expect(ease(7)).toBeCloseTo(1);
      }
    );

    it('lets go slowly and settles slowly', () => {
      expect(easeIn(0.25)).toBeLessThan(0.25);
      expect(easeOut(0.25)).toBeGreaterThan(0.25);
      expect(smooth(0.5)).toBeCloseTo(0.5);
    });

    it('lands past its mark before coming back to it', () => {
      const peak = Math.max(
        ...Array.from({ length: 50 }, (_, i) => easeOutBack(i / 49))
      );
      expect(peak).toBeGreaterThan(1.02);
      expect(peak).toBeLessThan(1.2);
    });

    it('clamps', () => {
      expect(clamp01(-1)).toBe(0);
      expect(clamp01(0.4)).toBe(0.4);
      expect(clamp01(2)).toBe(1);
    });
  });

  describe('one element’s share of a movement', () => {
    it('moves everything together when each takes the whole of it', () => {
      for (const order of [0, 0.5, 1]) {
        expect(staggered(0.3, order, 1)).toBeCloseTo(0.3);
      }
    });

    it('starts the first at once and finishes the last at the end', () => {
      expect(staggered(0, 0, 0.25)).toBe(0);
      expect(staggered(0.25, 0, 0.25)).toBeCloseTo(1);
      expect(staggered(0.75, 1, 0.25)).toBeCloseTo(0);
      expect(staggered(1, 1, 0.25)).toBeCloseTo(1);
    });

    it('has every element done by the end and none started before the beginning', () => {
      for (let order = 0; order <= 1; order += 0.1) {
        for (const span of [0.05, 0.3, 0.8]) {
          expect(staggered(0, order, span)).toBe(0);
          expect(staggered(1, order, span)).toBeCloseTo(1);
        }
      }
    });

    it('passes through them in order', () => {
      const at = (order: number) => staggered(0.5, order, 0.3);
      expect(at(0.1)).toBeGreaterThan(at(0.5));
      expect(at(0.5)).toBeGreaterThan(at(0.9));
    });

    it('survives a span of nothing', () => {
      expect(Number.isFinite(staggered(0.5, 0.5, 0))).toBe(true);
      expect(staggered(0.49, 0.5, 0)).toBe(0);
      expect(staggered(0.51, 0.5, 0)).toBe(1);
    });
  });

  describe('how present a scene is', () => {
    it('is dark before it arrives and whole once it has', () => {
      expect(presenceOf({ intro: 0, outro: 0 })).toEqual({
        arrive: 0,
        leave: 0,
        light: 0,
      });
      expect(presenceOf({ intro: 1, outro: 0 })).toEqual({
        arrive: 1,
        leave: 0,
        light: 1,
      });
    });

    it('keeps its light through the first half of a leaving', () => {
      expect(presenceOf({ intro: 1, outro: 0.5 }).light).toBe(1);
      expect(presenceOf({ intro: 1, outro: 0.5 }).leave).toBe(0.5);
    });

    it('has none left when it has gone', () => {
      const late = presenceOf({ intro: 1, outro: 0.8 }).light;
      expect(late).toBeGreaterThan(0);
      expect(late).toBeLessThan(1);
      expect(presenceOf({ intro: 1, outro: 1 }).light).toBe(0);
    });

    it('never has more light than it had arrived with', () => {
      const half = presenceOf({ intro: 0.5, outro: 0 });
      expect(half.light).toBeCloseTo(half.arrive);
      expect(presenceOf({ intro: 0.5, outro: 1 }).light).toBe(0);
    });
  });
});
