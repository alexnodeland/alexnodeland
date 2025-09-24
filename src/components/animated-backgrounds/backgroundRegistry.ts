import { AnimatedBackgroundConfig, BackgroundSettings, SettingsSchema } from '../../types/animated-backgrounds';
import CellularAutomatonBackground from './CellularAutomatonBackground';
import SimpleWaveBackground from './SimpleWaveBackground';
import GraphTopologyBackground from './GraphTopologyBackground';
import SpectrogramOscilloscopeBackground from './SpectrogramOscilloscopeBackground';
import ShortestPathLabBackground from './ShortestPathLabBackground';

// Default settings for Cellular Automaton background
export const cellularAutomatonDefaultSettings: BackgroundSettings = {
  // Visual appearance - Zoomed out for better overview
  cellSize: 0.006,                 // Much smaller cells for more detail
  cellBaseSize: 0.03,             // Smaller base cell size
  cellSizeMultiplier: 0.08,       // Moderate size variation
  opacity: 0.75,                  // Less overpowering
  
  // Animation speeds - Much slower for observable growth dynamics
  globalTimeMultiplier: 0.4,      // Very slow global time
  evolutionSpeed1: 1.2,           // Slow primary evolution
  evolutionSpeed2: 1.8,           // Slow secondary evolution  
  diagonalEvolutionSpeed: 2.5,    // Slow diagonal propagation
  updateAnimationSpeed: 2.0,      // Slow state updates
  
  // Evolution properties - More concentrated patterns
  waveAmplitude: 1.2,             // Higher amplitude for stronger patterns
  
  // Colors (RGB values 0-1) - More organic, less harsh
  colors: {
    alive: [0.1, 0.8, 0.3],        // Forest green for alive cells
    neutral: [0.15, 0.15, 0.2],    // Dark blue-gray for empty space
    active: [0.9, 0.4, 0.1],       // Warm orange for active cells
    highActivity: [1.0, 0.7, 0.2], // Golden yellow for high activity
    gridOverlay: [0.25, 0.3, 0.35] // Subtle grid lines
  },
  
  // Cellular automaton properties - Enhanced for concentrated growth
  connectionLineWidth: 0.012,     // Thicker connections for visibility
  diagonalConnectionWeight: 0.6,  // Strong diagonal connections for communities
  activityIntensity: 1.4          // High intensity for dramatic growth zones
};

// Settings schema for Cellular Automaton background
export const cellularAutomatonSettingsSchema: SettingsSchema[] = [
  // Visual appearance category
  {
    key: 'cellSize',
    label: 'Cell Size',
    type: 'slider',
    min: 0.02,
    max: 0.15,
    step: 0.005,
    category: 'Visual'
  },
  {
    key: 'cellBaseSize',
    label: 'Cell Base Size',
    type: 'slider',
    min: 0.01,
    max: 0.05,
    step: 0.001,
    category: 'Visual'
  },
  {
    key: 'cellSizeMultiplier',
    label: 'Cell Size Response',
    type: 'slider',
    min: 0.01,
    max: 0.08,
    step: 0.001,
    category: 'Visual'
  },
  {
    key: 'opacity',
    label: 'Background Opacity',
    type: 'slider',
    min: 0.1,
    max: 1.0,
    step: 0.05,
    category: 'Visual'
  },
  
  // Animation speeds category
  {
    key: 'globalTimeMultiplier',
    label: 'Global Animation Speed',
    type: 'slider',
    min: 0.1,
    max: 3.0,
    step: 0.1,
    category: 'Animation'
  },
  {
    key: 'evolutionSpeed1',
    label: 'Primary Evolution Speed',
    type: 'slider',
    min: 1.0,
    max: 10.0,
    step: 0.5,
    category: 'Animation'
  },
  {
    key: 'evolutionSpeed2',
    label: 'Secondary Evolution Speed',
    type: 'slider',
    min: 1.0,
    max: 10.0,
    step: 0.5,
    category: 'Animation'
  },
  {
    key: 'diagonalEvolutionSpeed',
    label: 'Diagonal Evolution Speed',
    type: 'slider',
    min: 1.0,
    max: 12.0,
    step: 0.5,
    category: 'Animation'
  },
  {
    key: 'updateAnimationSpeed',
    label: 'Update Animation Speed',
    type: 'slider',
    min: 2.0,
    max: 15.0,
    step: 0.5,
    category: 'Animation'
  },
  
  // Evolution properties category
  {
    key: 'waveAmplitude',
    label: 'Evolution Amplitude',
    type: 'slider',
    min: 0.1,
    max: 1.0,
    step: 0.05,
    category: 'Evolution'
  },
  
  // Colors category
  {
    key: 'colors.alive',
    label: 'Alive Cell Color',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.neutral',
    label: 'Neutral Cell Color',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.active',
    label: 'Active Cell Color',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.highActivity',
    label: 'High Activity Color',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.gridOverlay',
    label: 'Grid Overlay Color',
    type: 'color',
    category: 'Colors'
  },
  
  // Cellular automaton properties category
  {
    key: 'connectionLineWidth',
    label: 'Connection Line Width',
    type: 'slider',
    min: 0.001,
    max: 0.01,
    step: 0.0005,
    category: 'Automaton'
  },
  {
    key: 'diagonalConnectionWeight',
    label: 'Diagonal Connection Weight',
    type: 'slider',
    min: 0.1,
    max: 0.8,
    step: 0.05,
    category: 'Automaton'
  },
  {
    key: 'activityIntensity',
    label: 'Activity Intensity',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Automaton'
  }
];

// Cellular Automaton background configuration
export const cellularAutomatonConfig: AnimatedBackgroundConfig = {
  id: 'cellular-automaton',
  name: 'Cellular Automaton',
  description: 'An evolving cellular automaton showing emergent patterns, life-like behaviors, and state propagation across a computational grid.',
  component: CellularAutomatonBackground,
  defaultSettings: cellularAutomatonDefaultSettings,
  settingsSchema: cellularAutomatonSettingsSchema
};

// Simple Wave background configuration (example of easy extensibility)
export const simpleWaveConfig: AnimatedBackgroundConfig = {
  id: 'simple-waves',
  name: 'Simple Sine Waves',
  description: 'A simple animated background with colorful sine wave patterns.',
  component: SimpleWaveBackground,
  defaultSettings: {
    ...cellularAutomatonDefaultSettings,
    // Customize some settings for this background
    opacity: 0.6,
    globalTimeMultiplier: 2.0,
    waveAmplitude: 0.8,
    colors: {
      alive: [0.2, 0.1, 0.8],        // Deep blue
      neutral: [0.8, 0.2, 0.8],      // Magenta
      active: [1.0, 0.6, 0.1],       // Orange
      highActivity: [1.0, 1.0, 0.8], // Light yellow
      gridOverlay: [0.3, 0.3, 0.3]
    }
  },
  settingsSchema: cellularAutomatonSettingsSchema.filter(setting => 
    // Only include relevant settings for the simple wave background
    ['opacity', 'globalTimeMultiplier', 'waveAmplitude', 'waveSpeed1', 'waveSpeed2'].includes(setting.key) ||
    setting.key.startsWith('colors.')
  )
};

// Graph Topology background defaults and schema
export const graphTopologyDefaultSettings: BackgroundSettings = {
  ...cellularAutomatonDefaultSettings,
  // Core graph settings
  opacity: 0.9,
  totalNodes: 32,
  clusterCount: 3,
  requestedNodes: 8,
  animationSpeed: 1.0,
  scale: 1.0,
  cellBaseSize: 0.02,
  edgeThickness: 2.0,
  // Legacy settings (kept for compatibility)
  globalTimeMultiplier: 1.0,
  evolutionSpeed1: 6.0,
  evolutionSpeed2: 6.0,
  diagonalEvolutionSpeed: 6.0,
  updateAnimationSpeed: 4.0,
  waveAmplitude: cellularAutomatonDefaultSettings.waveAmplitude
};

export const graphTopologySettingsSchema: SettingsSchema[] = [
  // Core graph topology settings
  {
    key: 'totalNodes',
    label: 'Total Nodes in Network',
    type: 'slider',
    min: 16,
    max: 64,
    step: 4,
    category: 'Graph Topology'
  },
  {
    key: 'clusterCount',
    label: 'Number of Clusters',
    type: 'slider',
    min: 2,
    max: 6,
    step: 1,
    category: 'Graph Topology'
  },
  {
    key: 'requestedNodes',
    label: 'Requested Subgraph Size',
    type: 'slider',
    min: 3,
    max: 16,
    step: 1,
    category: 'Graph Topology'
  },
  
  // Animation and visual settings
  {
    key: 'animationSpeed',
    label: 'Animation Speed',
    type: 'slider',
    min: 0.2,
    max: 3.0,
    step: 0.1,
    category: 'Animation'
  },
  {
    key: 'scale',
    label: 'Graph Scale',
    type: 'slider',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    category: 'Visual'
  },
  {
    key: 'nodeBaseSize',
    label: 'Node Size',
    type: 'slider',
    min: 0.01,
    max: 0.05,
    step: 0.002,
    category: 'Visual'
  },
  {
    key: 'edgeThickness',
    label: 'Edge Thickness',
    type: 'slider',
    min: 0.5,
    max: 5.0,
    step: 0.25,
    category: 'Visual'
  },
  {
    key: 'opacity',
    label: 'Background Opacity',
    type: 'slider',
    min: 0.1,
    max: 1.0,
    step: 0.05,
    category: 'Visual'
  },
  
  // Color settings (reuse existing)
  ...cellularAutomatonSettingsSchema.filter(s => s.key.toString().startsWith('colors.'))
];

export const graphTopologyConfig: AnimatedBackgroundConfig = {
  id: 'graph-topology',
  name: 'High-Conductivity Subgraphs (Random Walk)',
  description: 'Random-walk search for high-conductivity n-node subgraphs on a network interconnect; edge length (loosely) encodes latency.',
  component: GraphTopologyBackground,
  defaultSettings: graphTopologyDefaultSettings,
  settingsSchema: graphTopologySettingsSchema
};

// Spectrogram Oscilloscope background defaults
export const spectrogramOscilloscopeDefaultSettings: BackgroundSettings = {
  // Global settings
  opacity: 0.9,
  globalTimeMultiplier: 0.1, // Slower default for more hypnotic effect
  
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
  
  // Colors - Vibrant spectrum
  colors: {
    low: [0.0, 0.1, 0.4],      // Deep blue for low amplitude
    mid: [0.0, 0.8, 1.0],      // Bright cyan for mid amplitude
    high: [1.0, 0.4, 0.8],     // Hot magenta for high amplitude
    peak: [1.0, 1.0, 0.0],     // Bright yellow for peak amplitude
    waveform: [0.0, 1.0, 0.5], // Bright green for waveform
    // Standard colors for compatibility
    alive: [0.0, 0.2, 0.8],
    neutral: [0.1, 0.8, 0.1],
    active: [1.0, 0.3, 0.0],
    highActivity: [1.0, 1.0, 0.2],
    gridOverlay: [0.2, 0.3, 0.4]
  },
  
  // Legacy settings (for compatibility)
  cellSize: 0.08,
  cellBaseSize: 0.02,
  cellSizeMultiplier: 0.03,
  evolutionSpeed1: 4.0,
  evolutionSpeed2: 5.0,
  diagonalEvolutionSpeed: 6.0,
  updateAnimationSpeed: 8.0,
  waveAmplitude: 0.4,
  connectionLineWidth: 0.003,
  diagonalConnectionWeight: 0.25,
  activityIntensity: 0.4
};

// Settings schema for Spectrogram Oscilloscope background
export const spectrogramOscilloscopeSettingsSchema: SettingsSchema[] = [
  // VCO 1 Settings
  {
    key: 'vco1Frequency',
    label: 'VCO 1 Frequency (Hz)',
    type: 'slider',
    min: 20,
    max: 2000,
    step: 10,
    category: 'VCO 1'
  },
  {
    key: 'vco1Amplitude',
    label: 'VCO 1 Amplitude',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'VCO 1'
  },
  {
    key: 'vco1WaveformType',
    label: 'VCO 1 Waveform',
    type: 'select',
    options: [
      { value: 0, label: 'Sine' },
      { value: 1, label: 'Square' },
      { value: 2, label: 'Triangle' },
      { value: 3, label: 'Sawtooth' }
    ],
    category: 'VCO 1'
  },
  {
    key: 'vco1Phase',
    label: 'VCO 1 Phase',
    type: 'slider',
    min: 0.0,
    max: 6.28,
    step: 0.1,
    category: 'VCO 1'
  },
  {
    key: 'vco1FMAmount',
    label: 'VCO 1 FM Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'VCO 1'
  },
  {
    key: 'vco1FMFrequency',
    label: 'VCO 1 FM Frequency',
    type: 'slider',
    min: 0.01,
    max: 10.0,
    step: 0.01,
    category: 'VCO 1'
  },
  
  // VCO 2 Settings
  {
    key: 'vco2Frequency',
    label: 'VCO 2 Frequency (Hz)',
    type: 'slider',
    min: 20,
    max: 2000,
    step: 10,
    category: 'VCO 2'
  },
  {
    key: 'vco2Amplitude',
    label: 'VCO 2 Amplitude',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'VCO 2'
  },
  {
    key: 'vco2WaveformType',
    label: 'VCO 2 Waveform',
    type: 'select',
    options: [
      { value: 0, label: 'Sine' },
      { value: 1, label: 'Square' },
      { value: 2, label: 'Triangle' },
      { value: 3, label: 'Sawtooth' }
    ],
    category: 'VCO 2'
  },
  {
    key: 'vco2Phase',
    label: 'VCO 2 Phase',
    type: 'slider',
    min: 0.0,
    max: 6.28,
    step: 0.1,
    category: 'VCO 2'
  },
  {
    key: 'vco2FMAmount',
    label: 'VCO 2 FM Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'VCO 2'
  },
  {
    key: 'vco2FMFrequency',
    label: 'VCO 2 FM Frequency',
    type: 'slider',
    min: 0.01,
    max: 10.0,
    step: 0.01,
    category: 'VCO 2'
  },
  
  // Mixer Settings
  {
    key: 'mixRatio',
    label: 'VCO Mix Ratio',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Mixer'
  },
  {
    key: 'detune',
    label: 'VCO 2 Detune',
    type: 'slider',
    min: -0.1,
    max: 0.1,
    step: 0.001,
    category: 'Mixer'
  },
  
  // Delay/Echo Settings
  {
    key: 'delayTime',
    label: 'Delay Time',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Delay/Echo'
  },
  {
    key: 'delayFeedback',
    label: 'Delay Feedback',
    type: 'slider',
    min: 0.0,
    max: 0.95,
    step: 0.05,
    category: 'Delay/Echo'
  },
  {
    key: 'delayMix',
    label: 'Delay Mix',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Delay/Echo'
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
      { value: 3, label: 'Bandpass' }
    ],
    category: 'Filter'
  },
  {
    key: 'filterCutoff',
    label: 'Filter Cutoff',
    type: 'slider',
    min: 0.01,
    max: 0.99,
    step: 0.01,
    category: 'Filter'
  },
  {
    key: 'filterResonance',
    label: 'Filter Resonance',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Filter'
  },
  {
    key: 'filterLFOAmount',
    label: 'Filter LFO Amount',
    type: 'slider',
    min: 0.0,
    max: 0.5,
    step: 0.01,
    category: 'Filter'
  },
  {
    key: 'filterLFOSpeed',
    label: 'Filter LFO Speed',
    type: 'slider',
    min: 0.01,
    max: 10.0,
    step: 0.01,
    category: 'Filter'
  },
  
  // Distortion Settings
  {
    key: 'distortionAmount',
    label: 'Distortion Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Distortion'
  },
  {
    key: 'distortionType',
    label: 'Distortion Type',
    type: 'select',
    options: [
      { value: 0, label: 'Soft Clip' },
      { value: 1, label: 'Hard Clip' },
      { value: 2, label: 'Foldback' },
      { value: 3, label: 'Bitcrush' }
    ],
    category: 'Distortion'
  },
  
  // Ring Modulator Settings
  {
    key: 'ringModFrequency',
    label: 'Ring Mod Frequency',
    type: 'slider',
    min: 10,
    max: 1000,
    step: 10,
    category: 'Ring Mod'
  },
  {
    key: 'ringModAmount',
    label: 'Ring Mod Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Ring Mod'
  },
  
  // Noise Settings
  {
    key: 'noiseAmount',
    label: 'Noise Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Noise'
  },
  {
    key: 'noiseType',
    label: 'Noise Type',
    type: 'select',
    options: [
      { value: 0, label: 'White' },
      { value: 1, label: 'Pink' },
      { value: 2, label: 'Brown' }
    ],
    category: 'Noise'
  },
  
  // Reverb Settings
  {
    key: 'reverbAmount',
    label: 'Reverb Amount',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Reverb'
  },
  {
    key: 'reverbDecay',
    label: 'Reverb Decay',
    type: 'slider',
    min: 0.1,
    max: 2.0,
    step: 0.1,
    category: 'Reverb'
  },
  {
    key: 'reverbPredelay',
    label: 'Reverb Predelay',
    type: 'slider',
    min: 0.0,
    max: 0.5,
    step: 0.01,
    category: 'Reverb'
  },
  
  // Visual Settings
  {
    key: 'opacity',
    label: 'Background Opacity',
    type: 'slider',
    min: 0.1,
    max: 1.0,
    step: 0.05,
    category: 'Visual'
  },
  {
    key: 'globalTimeMultiplier',
    label: 'Animation Speed',
    type: 'slider',
    min: 0.01, // Allow very slow speeds for ambient effects
    max: 5.0,  // And faster speeds for energetic visualizations
    step: 0.01,
    category: 'Animation'
  },
  {
    key: 'waveformBrightness',
    label: 'Waveform Brightness',
    type: 'slider',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    category: 'Visual'
  },
  {
    key: 'spectrogramBrightness',
    label: 'Spectrogram Brightness',
    type: 'slider',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    category: 'Visual'
  },
  {
    key: 'waveformThickness',
    label: 'Waveform Thickness',
    type: 'slider',
    min: 0.5,
    max: 3.0,
    step: 0.1,
    category: 'Visual'
  },
  {
    key: 'spectrogramSmoothing',
    label: 'Spectrogram Smoothing',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Visual'
  },
  {
    key: 'frequencyScale',
    label: 'Frequency Scale',
    type: 'slider',
    min: 1.0,
    max: 10.0,
    step: 0.5,
    category: 'Visual'
  },
  {
    key: 'timeScale',
    label: 'Spectrogram Speed',
    type: 'slider',
    min: 0.001,
    max: 1.0,
    step: 0.001,
    category: 'Animation'
  },
  {
    key: 'fftWindowSize',
    label: 'FFT Window Size',
    type: 'slider',
    min: 16,
    max: 256,
    step: 16,
    category: 'Visual'
  },
  {
    key: 'useLogScale',
    label: 'Frequency Scale',
    type: 'select',
    options: [
      { value: 0, label: 'Linear' },
      { value: 1, label: 'Logarithmic' }
    ],
    category: 'Visual'
  },
  {
    key: 'minLogFreq',
    label: 'Min Frequency (Hz)',
    type: 'slider',
    min: 10,
    max: 100,
    step: 5,
    category: 'Visual'
  },
  {
    key: 'maxLogFreq',
    label: 'Max Frequency (Hz)',
    type: 'slider',
    min: 2000,
    max: 20000,
    step: 500,
    category: 'Visual'
  },
  
  // Color Settings
  {
    key: 'colors.low',
    label: 'Low Amplitude Color',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.mid',
    label: 'Mid Amplitude Color',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.high',
    label: 'High Amplitude Color',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.peak',
    label: 'Peak Amplitude Color',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.waveform',
    label: 'Waveform Color',
    type: 'color',
    category: 'Colors'
  }
];

// Spectrogram Oscilloscope background configuration
export const spectrogramOscilloscopeConfig: AnimatedBackgroundConfig = {
  id: 'spectrogram-oscilloscope',
  name: 'Oscilloscope // Spectrogram',
  description: 'Rich audio synthesis visualization with dual oscillators, effects chain, and real-time frequency analysis. Features logarithmic spectrum display with harmonics.',
  component: SpectrogramOscilloscopeBackground,
  defaultSettings: spectrogramOscilloscopeDefaultSettings,
  settingsSchema: spectrogramOscilloscopeSettingsSchema
};

// Example preset with interesting effects enabled
export const spectrogramOscilloscopePresetAmbient: BackgroundSettings = {
  ...spectrogramOscilloscopeDefaultSettings,
  // Create an ambient soundscape
  vco1Frequency: 110.0, // Low drone
  vco1Amplitude: 0.6,
  vco1WaveformType: 2, // Triangle
  vco2Frequency: 165.0, // Fifth above
  vco2Amplitude: 0.4,
  vco2WaveformType: 0, // Sine
  mixRatio: 0.6,
  detune: 0.03, // Slight beating
  
  // Add spacey delay
  delayTime: 0.7,
  delayFeedback: 0.6,
  delayMix: 0.5,
  
  // Gentle filter sweep
  filterType: 1, // Lowpass
  filterCutoff: 0.4,
  filterResonance: 0.6,
  filterLFOAmount: 0.25,
  filterLFOSpeed: 0.5,
  
  // Touch of distortion for harmonics
  distortionAmount: 0.1,
  distortionType: 0, // Soft clip
  
  // Add texture with noise
  noiseAmount: 0.15,
  noiseType: 1, // Pink noise
  
  // Big reverb for space
  reverbAmount: 0.7,
  reverbDecay: 1.5,
  reverbPredelay: 0.2,
};

// Preset showing full frequency spectrum
export const spectrogramOscilloscopePresetFullSpectrum: BackgroundSettings = {
  ...spectrogramOscilloscopeDefaultSettings,
  // Use harmonic-rich waveforms
  vco1Frequency: 55.0, // Low A
  vco1Amplitude: 0.7,
  vco1WaveformType: 3, // Sawtooth - rich in harmonics
  vco2Frequency: 110.0, // A2
  vco2Amplitude: 0.5,
  vco2WaveformType: 1, // Square - odd harmonics
  mixRatio: 0.5,
  detune: 0.005, // Slight detune for movement
  
  // No delay for clarity
  delayMix: 0.0,
  
  // Open filter to show all frequencies
  filterType: 0, // Bypass
  
  // Add some distortion for even more harmonics
  distortionAmount: 0.2,
  distortionType: 0, // Soft clip
  
  // Ring mod for sidebands across spectrum
  ringModFrequency: 333,
  ringModAmount: 0.3,
  
  // Slight noise for full spectrum coverage
  noiseAmount: 0.08,
  noiseType: 0, // White noise
  
  // Light reverb
  reverbAmount: 0.3,
  reverbDecay: 0.8,
  
  // Optimized visual settings for full spectrum
  useLogScale: 1.0,
  minLogFreq: 20.0,
  maxLogFreq: 10000.0,
  spectrogramBrightness: 2.0
};

// Slow ambient drone preset
export const spectrogramOscilloscopePresetDrone: BackgroundSettings = {
  ...spectrogramOscilloscopeDefaultSettings,
  // Very slow evolving drone
  globalTimeMultiplier: 0.02, // Extremely slow
  
  // Deep bass drones
  vco1Frequency: 55.0, // Low A
  vco1Amplitude: 0.8,
  vco1WaveformType: 2, // Triangle for softer sound
  vco1FMAmount: 0.05,
  vco1FMFrequency: 0.02, // Very slow FM
  
  vco2Frequency: 82.5, // E - perfect fifth
  vco2Amplitude: 0.6,
  vco2WaveformType: 0, // Sine for purity
  vco2FMAmount: 0.03,
  vco2FMFrequency: 0.03,
  
  mixRatio: 0.7,
  detune: 0.002, // Very subtle beating
  
  // Long, ethereal delay
  delayTime: 0.8,
  delayFeedback: 0.7,
  delayMix: 0.6,
  
  // Slow filter sweep
  filterType: 1,
  filterCutoff: 0.3,
  filterResonance: 0.5,
  filterLFOAmount: 0.4,
  filterLFOSpeed: 0.02, // Very slow sweep
  
  // No distortion for purity
  distortionAmount: 0.0,
  
  // No ring mod
  ringModAmount: 0.0,
  
  // Minimal noise
  noiseAmount: 0.02,
  noiseType: 2, // Brown noise for depth
  
  // Huge reverb
  reverbAmount: 0.9,
  reverbDecay: 2.0,
  reverbPredelay: 0.3,
  
  // Slow spectrogram scroll
  timeScale: 0.01,
  spectrogramBrightness: 2.2
};

// Fast, glitchy preset
export const spectrogramOscilloscopePresetGlitch: BackgroundSettings = {
  ...spectrogramOscilloscopeDefaultSettings,
  // Fast, chaotic
  globalTimeMultiplier: 3.0,
  
  // High frequency chaos
  vco1Frequency: 880.0,
  vco1Amplitude: 0.6,
  vco1WaveformType: 1, // Square
  vco1FMAmount: 0.8,
  vco1FMFrequency: 7.0, // Fast FM
  
  vco2Frequency: 1320.0,
  vco2Amplitude: 0.5,
  vco2WaveformType: 3, // Sawtooth
  vco2FMAmount: 0.6,
  vco2FMFrequency: 5.3,
  
  mixRatio: 0.5,
  detune: 0.1, // Heavy detune
  
  // Short, rhythmic delay
  delayTime: 0.1,
  delayFeedback: 0.5,
  delayMix: 0.7,
  
  // Aggressive filter
  filterType: 3, // Bandpass
  filterCutoff: 0.6,
  filterResonance: 0.9,
  filterLFOAmount: 0.5,
  filterLFOSpeed: 8.0, // Fast modulation
  
  // Heavy distortion
  distortionAmount: 0.7,
  distortionType: 3, // Bitcrush
  
  // Crazy ring mod
  ringModFrequency: 666,
  ringModAmount: 0.6,
  
  // Lots of noise
  noiseAmount: 0.3,
  noiseType: 0, // White noise
  
  // Short reverb
  reverbAmount: 0.2,
  reverbDecay: 0.2,
  
  // Fast spectrogram
  timeScale: 0.8,
  maxLogFreq: 15000.0 // Show higher frequencies
};

// Registry of all available animated backgrounds
export const backgroundRegistry: AnimatedBackgroundConfig[] = [
  cellularAutomatonConfig,
  simpleWaveConfig,
  graphTopologyConfig,
  spectrogramOscilloscopeConfig,
  {
    id: 'shortest-path-lab',
    name: 'Shortest Path (Dijkstra/A*)',
    description: 'Interactive shortest-path exploration on a random geometric graph. Heuristic weight w: w=0 → Dijkstra (no heuristic), w=1 → standard A*, w>1 → weighted A* (greedy bias, faster but may be inadmissible).',
    component: ShortestPathLabBackground,
    defaultSettings: {
      cellSize: 0.08,
      cellBaseSize: 0.02,
      cellSizeMultiplier: 0.03,
      opacity: 0.9,
      globalTimeMultiplier: 1.0,
      evolutionSpeed1: 6.0,
      evolutionSpeed2: 6.0,
      diagonalEvolutionSpeed: 6.0,
      updateAnimationSpeed: 4.0,
      waveAmplitude: 0.4,
      colors: {
        alive: [0.0, 0.2, 0.8],
        neutral: [0.1, 0.8, 0.1],
        active: [1.0, 0.3, 0.0],
        highActivity: [1.0, 1.0, 0.2],
        gridOverlay: [0.2, 0.3, 0.4]
      },
      connectionLineWidth: 0.003,
      diagonalConnectionWeight: 0.25,
      activityIntensity: 0.4,
      spTotalNodes: 28,
      spEdgeDensity: 0.15,
      spHeuristicWeight: 1.0,
      spAllowDiagonals: 0,
      spAnimationSpeed: 4.0,
      spStartNode: 0,
      spGoalNode: 27
    },
    settingsSchema: [
      { key: 'opacity', label: 'Background Opacity', type: 'slider', min: 0.1, max: 1.0, step: 0.05, category: 'Visual' },
      { key: 'nodeBaseSize', label: 'Node Size', type: 'slider', min: 0.01, max: 0.05, step: 0.002, category: 'Visual' },
      { key: 'edgeThickness', label: 'Edge Thickness (legacy)', type: 'slider', min: 0.5, max: 5.0, step: 0.25, category: 'Visual' },
      { key: 'spBaseEdgeAlpha', label: 'Base Edge Alpha', type: 'slider', min: 0.05, max: 0.8, step: 0.05, category: 'Visual' },
      { key: 'spBaseEdgeThickness', label: 'Base Edge Thickness', type: 'slider', min: 0.5, max: 4.0, step: 0.25, category: 'Visual' },
      { key: 'spActionEdgeThickness', label: 'Action Edge Thickness', type: 'slider', min: 1.0, max: 8.0, step: 0.25, category: 'Visual' },
      { key: 'spDotSize', label: 'Traversal Dot Size', type: 'slider', min: 4, max: 24, step: 1, category: 'Visual' },
      { key: 'spDotGlow', label: 'Traversal Dot Glow', type: 'slider', min: 0.0, max: 1.0, step: 0.05, category: 'Visual' },
      { key: 'spCurvedEdges', label: 'Curved Edges (0/1)', type: 'slider', min: 0, max: 1, step: 1, category: 'Visual' },
      { key: 'spCurveAmount', label: 'Curve Amount', type: 'slider', min: 0.0, max: 0.8, step: 0.05, category: 'Visual' },
      { key: 'spCurveSegments', label: 'Curve Segments', type: 'slider', min: 8, max: 64, step: 1, category: 'Visual' },

      { key: 'spTotalNodes', label: 'Total Nodes', type: 'slider', min: 10, max: 80, step: 2, category: 'Graph' },
      { key: 'spEdgeDensity', label: 'Edge Density', type: 'slider', min: 0.05, max: 0.6, step: 0.01, category: 'Graph' },
      { key: 'spAnimationSpeed', label: 'Steps / Second', type: 'slider', min: 0.5, max: 12.0, step: 0.5, category: 'Animation' },
      { key: 'spTraversalSpeed', label: 'Traversal Speed (edges/sec)', type: 'slider', min: 0.2, max: 10.0, step: 0.2, category: 'Animation' },
      { key: 'spGlowBloom', label: 'Glow Bloom (0/1)', type: 'slider', min: 0, max: 1, step: 1, category: 'Animation' },
      { key: 'spGlowStrength', label: 'Glow Strength', type: 'slider', min: 0.0, max: 3.0, step: 0.05, category: 'Animation' },
      { key: 'spGlowRadius', label: 'Glow Radius', type: 'slider', min: 0.0, max: 1.0, step: 0.01, category: 'Animation' },
      { key: 'spGlowThreshold', label: 'Glow Threshold', type: 'slider', min: 0.0, max: 1.0, step: 0.01, category: 'Animation' },
      { key: 'spHeuristicWeight', label: 'Heuristic weight w (0=Dijkstra, 1=A*, >1 greedy)', type: 'slider', min: 0.0, max: 3.0, step: 0.05, category: 'Algorithm' },
      { key: 'spStartNode', label: 'Start Node', type: 'slider', min: 0, max: 79, step: 1, category: 'Algorithm' },
      { key: 'spGoalNode', label: 'Goal Node', type: 'slider', min: 0, max: 79, step: 1, category: 'Algorithm' }
    ]
  }
  // Add new background configurations here
];

// Helper function to get background by ID
export const getBackgroundById = (id: string): AnimatedBackgroundConfig | undefined => {
  return backgroundRegistry.find(bg => bg.id === id);
};

// Helper function to get all background IDs
export const getBackgroundIds = (): string[] => {
  return backgroundRegistry.map(bg => bg.id);
};
