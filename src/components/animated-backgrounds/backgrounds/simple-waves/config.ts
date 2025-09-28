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
    category: 'Wave Properties',
  },
  {
    key: 'waveAmplitude',
    label: 'Wave Amplitude',
    type: 'slider',
    min: 0.1,
    max: 2.0,
    step: 0.1,
    category: 'Wave Properties',
  },

  // Color settings specific to simple waves
  {
    key: 'colors.primary',
    label: 'Primary Wave Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.secondary',
    label: 'Secondary Wave Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.accent',
    label: 'Accent Wave Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.background',
    label: 'Background Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.grid',
    label: 'Grid Color',
    type: 'color',
    category: 'Colors',
  },
];

// Create the complete background configuration
export const simpleWaveConfig = createBackgroundConfig({
  id: 'simple-waves',
  name: 'Simple Sine Waves',
  description:
    'Visualization of wave interference - the fundamental physics governing sound, light, radio, and quantum mechanics. Multiple sine waves combine through superposition, creating constructive interference (bright warm colors) when waves align, destructive interference (dark cool colors) when they cancel. Essential for understanding audio processing, signal analysis, noise cancellation, and communications systems. Colors map wave amplitude: bright indicates reinforcement, dark shows cancellation.',
  component: SimpleWaveBackground,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
  blogPostSection: '#wave-interference',
});
