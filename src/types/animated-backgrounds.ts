export type BackgroundColors = {
  cold: [number, number, number];      // RGB values 0-1
  neutral: [number, number, number];
  hot: [number, number, number];
  hottest: [number, number, number];
  gridOverlay: [number, number, number];
  mouseWave: [number, number, number];
} & Record<string, [number, number, number]>;

export interface BackgroundSettings {
  // Visual appearance
  gridSize: number;
  nodeBaseSize: number;
  nodeSizeMultiplier: number;
  opacity: number;
  
  // Animation speeds
  globalTimeMultiplier: number;
  waveSpeed1: number;
  waveSpeed2: number;
  diagonalWaveSpeed: number;
  flowAnimationSpeed: number;
  mouseWaveSpeed: number;
  
  // Wave properties
  waveAmplitude: number;
  mouseInfluenceRadius: number;
  mouseInfluenceStrength: number;
  
  // Colors
  colors: BackgroundColors;
  
  // Grid and stencil properties
  stencilLineWidth: number;
  diagonalStencilWeight: number;
  computeActivityIntensity: number;
  
  // Graph topology properties (optional)
  totalNodes?: number;
  clusterCount?: number;
  requestedNodes?: number;
  animationSpeed?: number;
  scale?: number;
  edgeThickness?: number;

  // Spectrogram/Oscillator visualization properties (optional)
  vco1Frequency?: number;
  vco1Amplitude?: number;
  vco1WaveformType?: number;
  vco1Phase?: number;
  vco1FMAmount?: number;
  vco1FMFrequency?: number;
  vco2Frequency?: number;
  vco2Amplitude?: number;
  vco2WaveformType?: number;
  vco2Phase?: number;
  vco2FMAmount?: number;
  vco2FMFrequency?: number;
  mixRatio?: number;
  detune?: number;
  delayTime?: number;
  delayFeedback?: number;
  delayMix?: number;
  filterType?: number;
  filterCutoff?: number;
  filterResonance?: number;
  filterLFOAmount?: number;
  filterLFOSpeed?: number;
  distortionAmount?: number;
  distortionType?: number;
  ringModFrequency?: number;
  ringModAmount?: number;
  noiseAmount?: number;
  noiseType?: number;
  reverbAmount?: number;
  reverbDecay?: number;
  reverbPredelay?: number;
  waveformBrightness?: number;
  spectrogramBrightness?: number;
  waveformThickness?: number;
  spectrogramSmoothing?: number;
  frequencyScale?: number;
  timeScale?: number;
  fftWindowSize?: number;
  useLogScale?: number;
  minLogFreq?: number;
  maxLogFreq?: number;

  // Shortest-Path Lab (graph pathfinding) properties (optional)
  spTotalNodes?: number;
  spEdgeDensity?: number; // 0-1 probability for edges
  spHeuristicWeight?: number; // 0 = Dijkstra, 1 = A*, >1 = weighted A*
  spAllowDiagonals?: number; // boolean-like 0/1 for grid heuristic variants
  spAnimationSpeed?: number; // steps per second
  spStartNode?: number;
  spGoalNode?: number;

  // Shortest-Path Lab visuals
  spBaseEdgeAlpha?: number;
  spBaseEdgeThickness?: number;
  spActionEdgeThickness?: number;
  spDotSize?: number;
  spDotGlow?: number;
  spTraversalSpeed?: number; // edge-lengths per second

  // Shortest-Path Lab curved edges and bloom (optional)
  spCurvedEdges?: number; // 0/1 toggle
  spCurveAmount?: number; // curvature multiplier
  spCurveSegments?: number; // segments per curve
  spGlowBloom?: number; // 0/1 toggle
  spGlowStrength?: number;
  spGlowRadius?: number;
  spGlowThreshold?: number;
}

export interface AnimatedBackgroundConfig {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<AnimatedBackgroundProps>;
  defaultSettings: BackgroundSettings;
  settingsSchema: SettingsSchema[];
}

export interface AnimatedBackgroundProps {
  className?: string;
  settings: BackgroundSettings;
}

export interface SettingsSchema {
  key: keyof BackgroundSettings | string; // string for nested keys like 'colors.cold'
  label: string;
  type: 'number' | 'slider' | 'color' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: any; label: string }[];
  category?: string;
}

export interface BackgroundManagerState {
  currentBackgroundId: string;
  settings: Record<string, BackgroundSettings>;
  showSettingsPanel: boolean;
  closingSettingsPanel: boolean;
}
