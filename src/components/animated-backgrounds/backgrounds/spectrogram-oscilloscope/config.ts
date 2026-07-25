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
    description:
      'Pitch of the first oscillator in Hz. With FM off this is the lowest bright band on the spectrogram.',
    category: 'VCO 1',
  },
  {
    key: 'vco1Amplitude',
    label: 'VCO 1 Amplitude',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    description: 'Level of the first oscillator going into the mixer.',
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
    description:
      'Waveform of the first oscillator, and the fastest way to see what harmonics are. A sine has a single partial; triangle and square have odd harmonics only; sawtooth has every harmonic. Watch bands appear on the spectrogram as you move through them.',
    category: 'VCO 1',
  },
  {
    key: 'vco1Phase',
    label: 'VCO 1 Phase',
    type: 'slider',
    min: 0.0,
    max: 6.28,
    step: 0.1,
    description:
      'Starting phase offset. On its own it is inaudible — it matters through how it lines up against the second oscillator.',
    category: 'VCO 1',
  },
  {
    key: 'vco1FMAmount',
    label: 'VCO 1 FM Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    description:
      'Modulation index. Raise it and sidebands appear in pairs either side of the carrier, spaced at the FM frequency. That pair-spawning is the whole of FM synthesis, and it is why two oscillators can make a bell.',
    category: 'VCO 1',
  },
  {
    key: 'vco1FMFrequency',
    label: 'VCO 1 FM Frequency',
    type: 'slider',
    min: 0.01,
    max: 10.0,
    step: 0.01,
    description:
      'Rate of the modulator, which sets how far apart the sidebands sit. Simple ratios against the carrier sound harmonic; irrational ones sound like metal.',
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
    description:
      'Pitch of the second oscillator in Hz. It defaults a fifth above the first.',
    category: 'VCO 2',
  },
  {
    key: 'vco2Amplitude',
    label: 'VCO 2 Amplitude',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    description: 'Level of the second oscillator going into the mixer.',
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
    description: 'Waveform of the second oscillator.',
    category: 'VCO 2',
  },
  {
    key: 'vco2Phase',
    label: 'VCO 2 Phase',
    type: 'slider',
    min: 0.0,
    max: 6.28,
    step: 0.1,
    description:
      'Starting phase offset for the second oscillator, relative to the first.',
    category: 'VCO 2',
  },
  {
    key: 'vco2FMAmount',
    label: 'VCO 2 FM Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    description: 'Modulation index for the second oscillator.',
    category: 'VCO 2',
  },
  {
    key: 'vco2FMFrequency',
    label: 'VCO 2 FM Frequency',
    type: 'slider',
    min: 0.01,
    max: 10.0,
    step: 0.01,
    description: 'Modulator rate for the second oscillator.',
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
    description:
      'Balance between the two oscillators — 0 is all VCO 1, 1 is all VCO 2.',
    category: 'Mixer',
  },
  {
    key: 'detune',
    label: 'VCO 2 Detune',
    type: 'slider',
    min: -0.1,
    max: 0.1,
    step: 0.001,
    description:
      'Offsets VCO 2 slightly from its nominal pitch. Small amounts produce slow beating as the two drift in and out of phase, which you can see as a pulsing in the oscilloscope trace.',
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
    description: 'How long the echo waits before repeating.',
    category: 'Delay/Echo',
  },
  {
    key: 'delayFeedback',
    label: 'Delay Feedback',
    type: 'slider',
    min: 0.0,
    max: 0.95,
    step: 0.05,
    description:
      'How much of the delayed signal is fed back in. High values repeat for a long time; near the top it barely decays at all.',
    category: 'Delay/Echo',
  },
  {
    key: 'delayMix',
    label: 'Delay Mix',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    description: 'Balance between the dry signal and the echo.',
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
    description:
      'Which frequencies survive. Lowpass keeps the bottom, highpass the top, bandpass a slice around the cutoff.',
    category: 'Filter',
  },
  {
    key: 'filterCutoff',
    label: 'Filter Cutoff',
    type: 'slider',
    min: 0.01,
    max: 0.99,
    step: 0.01,
    description:
      'The frequency the filter is centred on. Sweep it and watch the top of the spectrogram open and close.',
    category: 'Filter',
  },
  {
    key: 'filterResonance',
    label: 'Filter Resonance',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    description:
      'Emphasis right at the cutoff. High settings make the filter ring at that frequency, and the peak shows up as a bright band that tracks the cutoff.',
    category: 'Filter',
  },
  {
    key: 'filterLFOAmount',
    label: 'Filter LFO Amount',
    type: 'slider',
    min: 0.0,
    max: 0.5,
    step: 0.01,
    description: 'How far the cutoff is swept automatically.',
    category: 'Filter',
  },
  {
    key: 'filterLFOSpeed',
    label: 'Filter LFO Speed',
    type: 'slider',
    min: 0.01,
    max: 10.0,
    step: 0.01,
    description: 'How fast that sweep runs.',
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
    description:
      'How hard the signal is driven. Distortion generates new harmonics above the ones already present, so the spectrogram fills in upward.',
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
    description:
      'The shape of the non-linearity. Soft clipping adds harmonics gradually; the wave folder and bit crusher are far more aggressive and generate content that is not harmonically related at all.',
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
    description:
      'Frequency of the modulating sine. Ring modulation produces sum and difference tones rather than harmonics, so you get two new bands either side rather than a series above.',
    category: 'Ring Mod',
  },
  {
    key: 'ringModAmount',
    label: 'Ring Mod Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    description:
      'How much ring modulation is mixed in. Because the tones it produces are not harmonically related to the carrier, this is what makes a sound read as metallic or bell-like.',
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
    description:
      'How much noise is mixed in. Noise is broadband, so it raises the whole spectrogram rather than adding bands.',
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
    description:
      'White noise has equal energy per hertz; pink falls off with frequency and sounds more natural; brown falls off faster still and sounds like distant rumble.',
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
    description: 'How much of the reverberated signal is mixed in.',
    category: 'Reverb',
  },
  {
    key: 'reverbDecay',
    label: 'Reverb Decay',
    type: 'slider',
    min: 0.1,
    max: 2.0,
    step: 0.1,
    description: 'How long the reverb tail takes to fade.',
    category: 'Reverb',
  },
  {
    key: 'reverbPredelay',
    label: 'Reverb Predelay',
    type: 'slider',
    min: 0.0,
    max: 0.5,
    step: 0.01,
    description:
      'Gap between the dry sound and the onset of reverb. Longer predelay reads as a larger room.',
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
    description: 'Brightness of the oscilloscope trace along the top.',
    category: 'Visualization',
  },
  {
    key: 'spectrogramBrightness',
    label: 'Spectrogram Brightness',
    type: 'slider',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    description:
      'Brightness of the spectrogram below. Raise it to bring out quiet partials, at the cost of washing out the loud ones.',
    category: 'Visualization',
  },
  {
    key: 'waveformThickness',
    label: 'Waveform Thickness',
    type: 'slider',
    min: 0.5,
    max: 3.0,
    step: 0.1,
    description: 'Line weight of the oscilloscope trace.',
    category: 'Visualization',
  },
  {
    key: 'spectrogramSmoothing',
    label: 'Spectrogram Smoothing',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    description:
      'Blends the analysis window from rectangular to Hann. Rectangular gives the sharpest peaks and the worst spectral leakage — energy smeared across neighbouring bins. Hann widens each peak slightly but suppresses the skirts around it, which reads as a cleaner spectrum. This is a real change to the transform, not a blur applied afterwards.',
    category: 'Visualization',
  },
  {
    key: 'frequencyScale',
    label: 'Frequency Scale',
    type: 'slider',
    min: 1.0,
    max: 10.0,
    step: 0.5,
    description:
      'How much of the frequency range the linear scale covers. No effect when the logarithmic scale is selected.',
    category: 'Visualization',
  },
  {
    key: 'timeScale',
    label: 'Spectrogram Speed',
    type: 'slider',
    min: 0.001,
    max: 1.0,
    step: 0.001,
    description:
      'How fast the spectrogram scrolls, which sets how much history is on screen.',
    category: 'Visualization',
  },
  {
    key: 'fftWindowSize',
    label: 'FFT Window Size',
    type: 'slider',
    min: 16,
    max: 128,
    step: 16,
    description:
      'How many samples each analysis window covers. Longer windows resolve closely spaced partials but smear anything that moves — the time-versus-frequency tradeoff that every spectrogram has to pick a point on. Each sample evaluates the full synthesis chain, so this is also the main performance dial here.',
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
    description:
      'Logarithmic spacing gives each octave equal width, which matches how pitch is heard and keeps the bass legible. Linear spreads the high end out instead, which suits looking at harmonic series.',
    category: 'Visualization',
  },
  {
    key: 'minLogFreq',
    label: 'Min Frequency (Hz)',
    type: 'slider',
    min: 10,
    max: 100,
    step: 5,
    description: 'Lowest frequency shown on the logarithmic scale.',
    category: 'Visualization',
  },
  {
    key: 'maxLogFreq',
    label: 'Max Frequency (Hz)',
    type: 'slider',
    min: 2000,
    max: 20000,
    step: 500,
    description:
      'Highest frequency shown. Most musical content sits below 5 kHz; above that you are mostly looking at the harmonics of the distortion.',
    category: 'Visualization',
  },

  // Color settings specific to spectrogram oscilloscope
  {
    key: 'colors.primary',
    label: 'Mid Amplitude Color',
    type: 'color',
    description: 'Mid-level bins on the spectrogram.',
    category: 'Colors',
  },
  {
    key: 'colors.secondary',
    label: 'High Amplitude Color',
    type: 'color',
    description: 'Loud bins.',
    category: 'Colors',
  },
  {
    key: 'colors.accent',
    label: 'Peak Amplitude Color',
    type: 'color',
    description: 'The loudest bins — peaks.',
    category: 'Colors',
  },
  {
    key: 'colors.background',
    label: 'Low Amplitude Color',
    type: 'color',
    description: 'Near-silent bins, and the canvas behind everything.',
    category: 'Colors',
  },
  {
    key: 'colors.grid',
    label: 'Grid Color',
    type: 'color',
    description:
      "The frequency, time and octave gridlines, and the oscilloscope's graticule.",
    category: 'Colors',
  },
];

// Create the complete background configuration
export const spectrogramOscilloscopeConfig = createBackgroundConfig({
  id: 'spectrogram-oscilloscope',
  name: 'Dual FM Oscillator',
  description:
    "A working FM synthesizer. Two oscillators, one modulating the other's phase — the trick that let a DX7 make a bell out of two sine waves while subtractive synths needed a filter bank. The signal then runs through filter, delay, distortion, and reverb. Top is an oscilloscope: amplitude against time. Bottom is a spectrogram: frequency low-to-high, scrolling left-to-right, brightness as intensity. Every spectrogram bin is a windowed DFT of the same samples the oscilloscope draws, so the sidebands, harmonic series and ring-mod tones are measured rather than drawn. Same signal in both domains at once, which is the fastest way to build intuition for what FM does to a spectrum. Hold the speaker button to hear it.",
  component: SpectrogramOscilloscopeBackground,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
  // A continuous field has no discrete element to size.
  omitStandardSettings: ['elementSize'],
  blogPostSection: '#fm-synthesis',
});
