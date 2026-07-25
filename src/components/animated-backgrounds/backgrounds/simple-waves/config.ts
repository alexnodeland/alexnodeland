import { createBackgroundConfig } from '../../core/baseConfig';
import { SettingsSchema, StandardSettings } from '../../core/types';
import SimpleWaveBackground from './SimpleWaveBackground';

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

  // Colorful wave palette
  colors: {
    primary: [0.2, 0.1, 0.8], // Deep blue
    secondary: [0.8, 0.2, 0.8], // Magenta
    accent: [1.0, 0.6, 0.1], // Orange
    background: [0.15, 0.15, 0.2],
    grid: [0.3, 0.3, 0.3],
  },
};

// Standard settings overrides for simple waves
const standardOverrides: Partial<StandardSettings> = {
  opacity: 0.6,
  globalTimeMultiplier: 2.0,
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
  description:
    'Three sine waves summed: one along x, one along y at 0.8x the frequency, one diagonal at 0.6x, each drifting at a different rate. Color maps the resulting amplitude — bright where the components reinforce, dark where they cancel. Superposition and nothing else, which is the point: interference underpins most of signal processing and takes three lines of arithmetic.',
  component: SimpleWaveBackground,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
  // A continuous field has no discrete element to size.
  omitStandardSettings: ['elementSize'],
  blogPostSection: '#wave-interference',
});
