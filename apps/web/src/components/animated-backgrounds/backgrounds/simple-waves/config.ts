import { createBackgroundConfig } from '../../core/baseConfig';
import { SettingsSchema, StandardSettings } from '../../core/types';
import { lazy } from 'react';
// Lazy on purpose: the registry (and through it the persistent shell)
// imports every config, so a static component import here would pull
// the simulation — and three.js with it — into the critical bundle of
// every page. The chunk loads when the background first renders,
// behind the Suspense in BackgroundManager.
const load = () => import('./SimpleWaveBackground');
const SimpleWaveBackground = lazy(load);

// Custom settings specific to simple waves
export interface SimpleWaveCustomSettings {
  waveFrequency: number;
  waveAmplitude: number;

  // Colors specific to simple waves
  colors: {
    primary: [number, number, number]; // Deep blue
    secondary: [number, number, number]; // Magenta
    accent: [number, number, number]; // Orange
    background: [number, number, number];
    grid: [number, number, number];
  };
}

export type SimpleWaveSettings = StandardSettings & SimpleWaveCustomSettings;

// Default custom settings for simple waves
const defaultCustomSettings: SimpleWaveCustomSettings = {
  waveFrequency: 6.0,
  waveAmplitude: 0.8,

  // Read as display colours — the swatches in the panel are what is drawn.
  // Indigo water, rose in the troughs and amber on the crests, over a
  // ground that is nearly the stage's own.
  colors: {
    primary: [0.38, 0.34, 1.0], // Indigo: the body of the swell
    secondary: [0.98, 0.32, 0.72], // Rose: the troughs
    accent: [1.0, 0.7, 0.3], // Amber: the crests
    background: [0.03, 0.035, 0.075],
    grid: [0.3, 0.3, 0.3],
  },
};

// Standard settings overrides for simple waves
const standardOverrides: Partial<StandardSettings> = {
  opacity: 0.9,
  globalTimeMultiplier: 1.4,
};

// Settings schema for custom simple wave settings
const customSettingsSchema: SettingsSchema[] = [
  {
    key: 'waveFrequency',
    label: 'Wave Frequency',
    type: 'slider',
    min: 1.0,
    max: 20.0,
    step: 0.5,
    description:
      'Spatial frequency of all three components at once. Higher packs more interference fringes into the screen.',
    category: 'Wave Properties',
  },
  {
    key: 'waveAmplitude',
    label: 'Wave Amplitude',
    type: 'slider',
    min: 0.1,
    max: 2.0,
    step: 0.1,
    description:
      'Height of each component before they are summed. Larger amplitudes push more of the screen into full constructive or destructive interference and flatten the mid-tones.',
    category: 'Wave Properties',
  },

  // Color settings specific to simple waves
  {
    key: 'colors.primary',
    label: 'Primary Wave Color',
    type: 'color',
    description: 'Mid amplitudes, where the components partly cancel.',
    category: 'Colors',
  },
  {
    key: 'colors.secondary',
    label: 'Secondary Wave Color',
    type: 'color',
    description: 'Strong negative amplitude — troughs.',
    category: 'Colors',
  },
  {
    key: 'colors.accent',
    label: 'Accent Wave Color',
    type: 'color',
    description:
      'Strong positive amplitude, where all three components reinforce.',
    category: 'Colors',
  },
  {
    key: 'colors.background',
    label: 'Background Color',
    type: 'color',
    description: 'Shown where the three components cancel out completely.',
    category: 'Colors',
  },
];

// Create the complete background configuration
export const simpleWaveConfig = createBackgroundConfig({
  id: 'simple-waves',
  name: 'Simple Sine Waves',
  shortName: 'waves',
  description:
    'Three sine waves summed: one along x, one along y at 0.8x the frequency, one diagonal at ' +
    '0.6x, each drifting at its own rate. Height maps the amplitude — crests where they ' +
    'reinforce, flat where they cancel. Nothing but superposition.',
  component: SimpleWaveBackground,
  preload: load,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
  // A continuous field has no discrete element to size.
  omitStandardSettings: ['elementSize'],
  blogPostSection: '#wave-interference',
});
