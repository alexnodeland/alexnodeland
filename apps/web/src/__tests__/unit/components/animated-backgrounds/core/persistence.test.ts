import {
  overridesOf,
  parseSaved,
  SETTINGS_VERSION,
  toSaved,
  withOverrides,
} from '../../../../../components/animated-backgrounds/core/persistence';

const defaults = {
  opacity: 0.9,
  rule: 'conway',
  glideSpeed: 0.35,
  colors: {
    primary: [0.16, 0.92, 0.5],
    secondary: [1.0, 0.56, 0.18],
  },
};

describe('what is saved of the backgrounds', () => {
  describe('the difference from the defaults', () => {
    it('is nothing when nothing was changed', () => {
      expect(overridesOf({ ...defaults }, defaults)).toEqual({});
    });

    it('is the one setting that was', () => {
      expect(overridesOf({ ...defaults, opacity: 0.4 }, defaults)).toEqual({
        opacity: 0.4,
      });
      expect(overridesOf({ ...defaults, rule: 'maze' }, defaults)).toEqual({
        rule: 'maze',
      });
    });

    it('is one colour when one colour was changed', () => {
      const settings = {
        ...defaults,
        colors: { ...defaults.colors, primary: [1, 0, 1] },
      };
      expect(overridesOf(settings, defaults)).toEqual({
        colors: { primary: [1, 0, 1] },
      });
    });

    it('does not mistake a colour that came back a hair off for a choice', () => {
      // Through a colour picker and back: eight bits a channel.
      const settings = {
        ...defaults,
        colors: {
          ...defaults.colors,
          primary: [41 / 255, 235 / 255, 128 / 255],
        },
      };
      expect(overridesOf(settings, defaults)).toEqual({});
      // The next swatch along is a choice.
      const nudged = {
        ...defaults,
        colors: {
          ...defaults.colors,
          primary: [42 / 255, 235 / 255, 128 / 255],
        },
      };
      expect(overridesOf(nudged, defaults)).toEqual({
        colors: { primary: [42 / 255, 235 / 255, 128 / 255] },
      });
    });

    it('takes a slider at its word, however small its step', () => {
      const fine = { rate: 0.0005 };
      expect(overridesOf({ rate: 0.001 }, fine)).toEqual({ rate: 0.001 });
    });
  });

  describe('laying it back over the defaults', () => {
    it('takes today’s default for everything that was not saved', () => {
      const merged = withOverrides(defaults, { opacity: 0.4 });
      expect(merged).toEqual({ ...defaults, opacity: 0.4 });
    });

    it('keeps the colours that were not changed', () => {
      const merged = withOverrides(defaults, {
        colors: { primary: [1, 0, 1] },
      });
      expect(merged.colors).toEqual({
        primary: [1, 0, 1],
        secondary: defaults.colors.secondary,
      });
    });

    it('does not hand a scene a value of the wrong kind', () => {
      // A string where a number is expected reaches three.js as NaN.
      const merged = withOverrides(defaults, {
        opacity: 'opaque',
        colors: 'red',
        glideSpeed: [1, 2, 3],
      });
      expect(merged).toEqual(defaults);
    });

    it('leaves the defaults themselves alone', () => {
      const before = JSON.stringify(defaults);
      const merged = withOverrides(defaults, {
        colors: { primary: [0, 0, 0] },
      });
      merged.colors.secondary = [0, 0, 0];
      expect(JSON.stringify(defaults)).toBe(before);
    });
  });

  describe('reading what is in storage', () => {
    it('is nothing when there is nothing, or nothing usable', () => {
      expect(parseSaved(null)).toBeNull();
      expect(parseSaved('')).toBeNull();
      expect(parseSaved('{not json')).toBeNull();
      expect(parseSaved('[]')).toBeNull();
      expect(parseSaved('{"settings":{}}')).toBeNull();
    });

    it('reads the current shape as it was written', () => {
      const raw = JSON.stringify({
        version: SETTINGS_VERSION,
        currentBackgroundId: 'simple-waves',
        settings: { 'simple-waves': { waveFrequency: 9 }, junk: 3 },
      });
      expect(parseSaved(raw)).toEqual({
        version: SETTINGS_VERSION,
        currentBackgroundId: 'simple-waves',
        settings: { 'simple-waves': { waveFrequency: 9 } },
      });
    });

    it('accepts a background with nothing changed', () => {
      const saved = parseSaved('{"currentBackgroundId":"pde-solver"}');
      expect(saved?.currentBackgroundId).toBe('pde-solver');
      expect(saved?.settings).toEqual({});
    });

    describe('from before the backgrounds were rebuilt', () => {
      // The whole state, as it used to be written: every setting of every
      // background, chosen or not, and the panel's flags.
      const legacy = (waves: Record<string, unknown>) =>
        JSON.stringify({
          currentBackgroundId: 'simple-waves',
          showSettingsPanel: true,
          closingSettingsPanel: false,
          settings: {
            'simple-waves': waves,
            'pde-solver': {
              heightScale: 0.6,
              colors: {
                positive: [0.1, 0.6, 1.0],
                negative: [1.0, 0.3, 0.4],
                zero: [0.1, 0.1, 0.15],
              },
            },
          },
        });

      it('keeps which background was up', () => {
        const saved = parseSaved(legacy({ opacity: 0.6 }));
        expect(saved?.version).toBe(SETTINGS_VERSION);
        expect(saved?.currentBackgroundId).toBe('simple-waves');
      });

      it('lets go of every number tuned against the old pictures', () => {
        const saved = parseSaved(
          legacy({
            opacity: 0.6,
            globalTimeMultiplier: 2,
            waveFrequency: 9,
            colors: {
              primary: [0.2, 0.1, 0.8],
              secondary: [0.8, 0.2, 0.8],
              accent: [1.0, 0.6, 0.1],
              background: [0.15, 0.15, 0.2],
              grid: [0.3, 0.3, 0.3],
            },
          })
        );
        // Nothing here was chosen: the colours are the ones it shipped with.
        expect(saved?.settings).toEqual({});
      });

      it('keeps a colour somebody chose, and only that', () => {
        const saved = parseSaved(
          legacy({
            opacity: 0.2,
            colors: {
              primary: [0.2, 0.1, 0.8],
              secondary: [0.1, 0.9, 0.3],
              accent: [1.0, 0.6, 0.1],
            },
          })
        );
        expect(saved?.settings).toEqual({
          'simple-waves': { colors: { secondary: [0.1, 0.9, 0.3] } },
        });
      });

      it('does not bring across what is not a colour', () => {
        const saved = parseSaved(
          legacy({
            colors: {
              primary: 'blue',
              secondary: [0.1, 0.9],
              accent: [0.1, 0.9, Number.NaN],
              made_up: [0.5, 0.5, 0.5],
            },
          })
        );
        expect(saved?.settings).toEqual({});
      });
    });
  });

  describe('what is written', () => {
    it('is the background that is up and what was changed, versioned', () => {
      const saved = toSaved(
        'two',
        {
          one: { ...defaults },
          two: { ...defaults, opacity: 0.5 },
        },
        { one: defaults, two: defaults }
      );
      expect(saved).toEqual({
        version: SETTINGS_VERSION,
        currentBackgroundId: 'two',
        settings: { two: { opacity: 0.5 } },
      });
    });

    it('comes back as what it was', () => {
      const settings = {
        one: {
          ...defaults,
          colors: { ...defaults.colors, primary: [1, 0, 0] },
        },
      };
      const raw = JSON.stringify(toSaved('one', settings, { one: defaults }));
      const saved = parseSaved(raw);
      expect(withOverrides(defaults, saved?.settings.one)).toEqual(
        settings.one
      );
    });
  });
});
