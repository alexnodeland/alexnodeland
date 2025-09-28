import { createBackgroundConfig } from '../../core/baseConfig';
import { SettingsSchema, StandardSettings } from '../../core/types';
import SpectrogramOscilloscopeBackground from './SpectrogramOscilloscopeBackground';

// Custom settings specific to spectrogram oscilloscope
export interface SpectrogramOscilloscopeCustomSettings {
  // VCO 1 Parameters
  vco1Frequency: number;
  vco1Amplitude: number;
  vco1WaveformType: number;
  vco1Phase: number;
  vco1FMAmount: number;
  vco1FMFrequency: number;

  // VCO 2 Parameters
  vco2Frequency: number;
  vco2Amplitude: number;
  vco2WaveformType: number;
  vco2Phase: number;
  vco2FMAmount: number;
  vco2FMFrequency: number;

  // Mixer Parameters
  mixRatio: number;
  detune: number;

  // Delay/Echo Parameters
  delayTime: number;
  delayFeedback: number;
  delayMix: number;

  // Filter Parameters
  filterType: number;
  filterCutoff: number;
  filterResonance: number;
  filterLFOAmount: number;
  filterLFOSpeed: number;

  // Distortion Parameters
  distortionAmount: number;
  distortionType: number;

  // Ring Modulator Parameters
  ringModFrequency: number;
  ringModAmount: number;

  // Noise Generator Parameters
  noiseAmount: number;
  noiseType: number;

  // Reverb Parameters
  reverbAmount: number;
  reverbDecay: number;
  reverbPredelay: number;

  // Visual Parameters
  waveformBrightness: number;
  spectrogramBrightness: number;
  waveformThickness: number;
  spectrogramSmoothing: number;
  frequencyScale: number;
  timeScale: number;
  fftWindowSize: number;
  useLogScale: number;
  minLogFreq: number;
  maxLogFreq: number;

  // Colors specific to spectrogram oscilloscope
  colors: {
    primary: [number, number, number]; // Bright cyan for mid amplitude
    secondary: [number, number, number]; // Hot magenta for high amplitude
    accent: [number, number, number]; // Bright yellow for peak amplitude
    background: [number, number, number]; // Deep blue for low amplitude
    grid: [number, number, number]; // Grid overlay
  };
}

export type SpectrogramOscilloscopeSettings = StandardSettings &
  SpectrogramOscilloscopeCustomSettings;

// Default custom settings for spectrogram oscilloscope
const defaultCustomSettings: SpectrogramOscilloscopeCustomSettings = {
  // VCO 1 Parameters - Rich harmonic content
  vco1Frequency: 110.0, // A2 - low fundamental
  vco1Amplitude: 0.7,
  vco1WaveformType: 3, // Sawtooth - rich in harmonics
  vco1Phase: 0.0,
  vco1FMAmount: 0.15,
  vco1FMFrequency: 0.3,

  // VCO 2 Parameters - Complementary harmonics
  vco2Frequency: 165.0, // E3 - perfect fifth
  vco2Amplitude: 0.5,
  vco2WaveformType: 1, // Square - odd harmonics
  vco2Phase: 0.0,
  vco2FMAmount: 0.1,
  vco2FMFrequency: 0.25,

  // Mixer Parameters
  mixRatio: 0.6,
  detune: 0.008, // Subtle beating for movement

  // Delay/Echo Parameters - Add depth
  delayTime: 0.4,
  delayFeedback: 0.3,
  delayMix: 0.25, // Some delay for interest

  // Filter Parameters - Dynamic movement
  filterType: 1, // Lowpass for warmth
  filterCutoff: 0.5,
  filterResonance: 0.4,
  filterLFOAmount: 0.2, // Gentle sweep
  filterLFOSpeed: 0.8,

  // Distortion Parameters - Subtle harmonics
  distortionAmount: 0.08, // Just a touch
  distortionType: 0, // Soft clip

  // Ring Modulator Parameters - Metallic overtones
  ringModFrequency: 277.0, // C#4
  ringModAmount: 0.15, // Subtle ring mod

  // Noise Generator Parameters - Texture
  noiseAmount: 0.05, // Very subtle
  noiseType: 1, // Pink noise

  // Reverb Parameters - Space
  reverbAmount: 0.4, // Moderate reverb
  reverbDecay: 1.0,
  reverbPredelay: 0.05,

  // Visual Parameters
  waveformBrightness: 1.8,
  spectrogramBrightness: 2.2, // Brighter for better visibility
  waveformThickness: 2.0, // Thicker waveform
  spectrogramSmoothing: 0.7,
  frequencyScale: 3.0,
  timeScale: 0.1, // Slower scrolling for better observation
  fftWindowSize: 64.0,
  useLogScale: 1.0, // Use logarithmic by default
  minLogFreq: 20.0, // 20Hz minimum (bass)
  maxLogFreq: 5000.0, // 5kHz is enough for most musical content

  // Vibrant spectrum color scheme
  colors: {
    primary: [0.0, 0.8, 1.0], // Bright cyan for mid amplitude
    secondary: [1.0, 0.4, 0.8], // Hot magenta for high amplitude
    accent: [1.0, 1.0, 0.0], // Bright yellow for peak amplitude
    background: [0.0, 0.1, 0.4], // Deep blue for low amplitude
    grid: [0.2, 0.3, 0.4], // Grid overlay
  },
};

// Standard settings overrides for spectrogram oscilloscope
const standardOverrides: Partial<StandardSettings> = {
  opacity: 0.9,
  globalTimeMultiplier: 0.1, // Slower default for more hypnotic effect
};

// Settings schema for custom spectrogram oscilloscope settings
const customSettingsSchema: SettingsSchema[] = [
  // VCO 1 Settings
  {
    key: 'vco1Frequency',
    label: 'VCO 1 Frequency (Hz)',
    type: 'slider',
    min: 20,
    max: 2000,
    step: 10,
    category: 'VCO 1',
  },
  {
    key: 'vco1Amplitude',
    label: 'VCO 1 Amplitude',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'VCO 1',
  },
  {
    key: 'vco1WaveformType',
    label: 'VCO 1 Waveform',
    type: 'select',
    options: [
      { value: 0, label: 'Sine' },
      { value: 1, label: 'Square' },
      { value: 2, label: 'Triangle' },
      { value: 3, label: 'Sawtooth' },
    ],
    category: 'VCO 1',
  },
  {
    key: 'vco1Phase',
    label: 'VCO 1 Phase',
    type: 'slider',
    min: 0.0,
    max: 6.28,
    step: 0.1,
    category: 'VCO 1',
  },
  {
    key: 'vco1FMAmount',
    label: 'VCO 1 FM Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'VCO 1',
  },
  {
    key: 'vco1FMFrequency',
    label: 'VCO 1 FM Frequency',
    type: 'slider',
    min: 0.01,
    max: 10.0,
    step: 0.01,
    category: 'VCO 1',
  },

  // VCO 2 Settings
  {
    key: 'vco2Frequency',
    label: 'VCO 2 Frequency (Hz)',
    type: 'slider',
    min: 20,
    max: 2000,
    step: 10,
    category: 'VCO 2',
  },
  {
    key: 'vco2Amplitude',
    label: 'VCO 2 Amplitude',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'VCO 2',
  },
  {
    key: 'vco2WaveformType',
    label: 'VCO 2 Waveform',
    type: 'select',
    options: [
      { value: 0, label: 'Sine' },
      { value: 1, label: 'Square' },
      { value: 2, label: 'Triangle' },
      { value: 3, label: 'Sawtooth' },
    ],
    category: 'VCO 2',
  },
  {
    key: 'vco2Phase',
    label: 'VCO 2 Phase',
    type: 'slider',
    min: 0.0,
    max: 6.28,
    step: 0.1,
    category: 'VCO 2',
  },
  {
    key: 'vco2FMAmount',
    label: 'VCO 2 FM Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'VCO 2',
  },
  {
    key: 'vco2FMFrequency',
    label: 'VCO 2 FM Frequency',
    type: 'slider',
    min: 0.01,
    max: 10.0,
    step: 0.01,
    category: 'VCO 2',
  },

  // Mixer Settings
  {
    key: 'mixRatio',
    label: 'VCO Mix Ratio',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Mixer',
  },
  {
    key: 'detune',
    label: 'VCO 2 Detune',
    type: 'slider',
    min: -0.1,
    max: 0.1,
    step: 0.001,
    category: 'Mixer',
  },

  // Delay/Echo Settings
  {
    key: 'delayTime',
    label: 'Delay Time',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Delay/Echo',
  },
  {
    key: 'delayFeedback',
    label: 'Delay Feedback',
    type: 'slider',
    min: 0.0,
    max: 0.95,
    step: 0.05,
    category: 'Delay/Echo',
  },
  {
    key: 'delayMix',
    label: 'Delay Mix',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Delay/Echo',
  },

  // Filter Settings
  {
    key: 'filterType',
    label: 'Filter Type',
    type: 'select',
    options: [
      { value: 0, label: 'Bypass' },
      { value: 1, label: 'Lowpass' },
      { value: 2, label: 'Highpass' },
      { value: 3, label: 'Bandpass' },
    ],
    category: 'Filter',
  },
  {
    key: 'filterCutoff',
    label: 'Filter Cutoff',
    type: 'slider',
    min: 0.01,
    max: 0.99,
    step: 0.01,
    category: 'Filter',
  },
  {
    key: 'filterResonance',
    label: 'Filter Resonance',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Filter',
  },
  {
    key: 'filterLFOAmount',
    label: 'Filter LFO Amount',
    type: 'slider',
    min: 0.0,
    max: 0.5,
    step: 0.01,
    category: 'Filter',
  },
  {
    key: 'filterLFOSpeed',
    label: 'Filter LFO Speed',
    type: 'slider',
    min: 0.01,
    max: 10.0,
    step: 0.01,
    category: 'Filter',
  },

  // Distortion Settings
  {
    key: 'distortionAmount',
    label: 'Distortion Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Distortion',
  },
  {
    key: 'distortionType',
    label: 'Distortion Type',
    type: 'select',
    options: [
      { value: 0, label: 'Soft Clip' },
      { value: 1, label: 'Hard Clip' },
      { value: 2, label: 'Foldback' },
      { value: 3, label: 'Bitcrush' },
    ],
    category: 'Distortion',
  },

  // Ring Modulator Settings
  {
    key: 'ringModFrequency',
    label: 'Ring Mod Frequency',
    type: 'slider',
    min: 10,
    max: 1000,
    step: 10,
    category: 'Ring Mod',
  },
  {
    key: 'ringModAmount',
    label: 'Ring Mod Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Ring Mod',
  },

  // Noise Settings
  {
    key: 'noiseAmount',
    label: 'Noise Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Noise',
  },
  {
    key: 'noiseType',
    label: 'Noise Type',
    type: 'select',
    options: [
      { value: 0, label: 'White' },
      { value: 1, label: 'Pink' },
      { value: 2, label: 'Brown' },
    ],
    category: 'Noise',
  },

  // Reverb Settings
  {
    key: 'reverbAmount',
    label: 'Reverb Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Reverb',
  },
  {
    key: 'reverbDecay',
    label: 'Reverb Decay',
    type: 'slider',
    min: 0.1,
    max: 2.0,
    step: 0.1,
    category: 'Reverb',
  },
  {
    key: 'reverbPredelay',
    label: 'Reverb Predelay',
    type: 'slider',
    min: 0.0,
    max: 0.5,
    step: 0.01,
    category: 'Reverb',
  },

  // Visual Settings
  {
    key: 'waveformBrightness',
    label: 'Waveform Brightness',
    type: 'slider',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    category: 'Visualization',
  },
  {
    key: 'spectrogramBrightness',
    label: 'Spectrogram Brightness',
    type: 'slider',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    category: 'Visualization',
  },
  {
    key: 'waveformThickness',
    label: 'Waveform Thickness',
    type: 'slider',
    min: 0.5,
    max: 3.0,
    step: 0.1,
    category: 'Visualization',
  },
  {
    key: 'spectrogramSmoothing',
    label: 'Spectrogram Smoothing',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Visualization',
  },
  {
    key: 'frequencyScale',
    label: 'Frequency Scale',
    type: 'slider',
    min: 1.0,
    max: 10.0,
    step: 0.5,
    category: 'Visualization',
  },
  {
    key: 'timeScale',
    label: 'Spectrogram Speed',
    type: 'slider',
    min: 0.001,
    max: 1.0,
    step: 0.001,
    category: 'Visualization',
  },
  {
    key: 'fftWindowSize',
    label: 'FFT Window Size',
    type: 'slider',
    min: 16,
    max: 256,
    step: 16,
    category: 'Visualization',
  },
  {
    key: 'useLogScale',
    label: 'Frequency Scale',
    type: 'select',
    options: [
      { value: 0, label: 'Linear' },
      { value: 1, label: 'Logarithmic' },
    ],
    category: 'Visualization',
  },
  {
    key: 'minLogFreq',
    label: 'Min Frequency (Hz)',
    type: 'slider',
    min: 10,
    max: 100,
    step: 5,
    category: 'Visualization',
  },
  {
    key: 'maxLogFreq',
    label: 'Max Frequency (Hz)',
    type: 'slider',
    min: 2000,
    max: 20000,
    step: 500,
    category: 'Visualization',
  },

  // Color settings specific to spectrogram oscilloscope
  {
    key: 'colors.primary',
    label: 'Mid Amplitude Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.secondary',
    label: 'High Amplitude Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.accent',
    label: 'Peak Amplitude Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.background',
    label: 'Low Amplitude Color',
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
export const spectrogramOscilloscopeConfig = createBackgroundConfig({
  id: 'spectrogram-oscilloscope',
  name: 'Dual FM Oscillator',
  description:
    "Complete digital audio synthesizer demonstrating frequency modulation synthesis - a technique that creates complex harmonic content by having one oscillator modulate another's frequency. Two VCOs generate basic waveforms, then frequency modulate each other to produce rich timbres, passing through filters, delay, distortion, and reverb. Top display: oscilloscope showing waveform amplitude over time. Bottom: spectrogram showing frequency content evolution (low-to-high, left-to-right), with brightness indicating spectral intensity. Fundamental technique in electronic music production and audio DSP.",
  component: SpectrogramOscilloscopeBackground,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
  blogPostSection: '#fm-synthesis',
});
