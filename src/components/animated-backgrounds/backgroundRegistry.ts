import { AnimatedBackgroundConfig, BackgroundSettings, SettingsSchema } from '../../types/animated-backgrounds';
import PDEStencilBackground from './PDEStencilBackground';
import SimpleWaveBackground from './SimpleWaveBackground';

// Default settings for PDE Stencil background
export const pdeStencilDefaultSettings: BackgroundSettings = {
  // Visual appearance
  gridSize: 0.08,
  nodeBaseSize: 0.02,
  nodeSizeMultiplier: 0.03,
  opacity: 0.85,
  
  // Animation speeds
  globalTimeMultiplier: 1.0,
  waveSpeed1: 4.0,
  waveSpeed2: 5.0,
  diagonalWaveSpeed: 6.0,
  flowAnimationSpeed: 8.0,
  mouseWaveSpeed: 10.0,
  
  // Wave properties
  waveAmplitude: 0.4,
  mouseInfluenceRadius: 2.0,
  mouseInfluenceStrength: 0.3,
  
  // Colors (RGB values 0-1)
  colors: {
    cold: [0.0, 0.2, 0.8],        // Blue for negative
    neutral: [0.1, 0.8, 0.1],     // Green for zero
    hot: [1.0, 0.3, 0.0],         // Red/orange for positive
    hottest: [1.0, 1.0, 0.2],     // Yellow for high positive
    gridOverlay: [0.2, 0.3, 0.4], // Grid lines
    mouseWave: [0.8, 0.9, 1.0]    // Mouse wave effect
  },
  
  // Grid and stencil properties
  stencilLineWidth: 0.003,
  diagonalStencilWeight: 0.25,
  computeActivityIntensity: 0.4
};

// Settings schema for PDE Stencil background
export const pdeStencilSettingsSchema: SettingsSchema[] = [
  // Visual appearance category
  {
    key: 'gridSize',
    label: 'Grid Size',
    type: 'slider',
    min: 0.02,
    max: 0.15,
    step: 0.005,
    category: 'Visual'
  },
  {
    key: 'nodeBaseSize',
    label: 'Node Base Size',
    type: 'slider',
    min: 0.01,
    max: 0.05,
    step: 0.001,
    category: 'Visual'
  },
  {
    key: 'nodeSizeMultiplier',
    label: 'Node Size Response',
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
    key: 'waveSpeed1',
    label: 'Primary Wave Speed',
    type: 'slider',
    min: 1.0,
    max: 10.0,
    step: 0.5,
    category: 'Animation'
  },
  {
    key: 'waveSpeed2',
    label: 'Secondary Wave Speed',
    type: 'slider',
    min: 1.0,
    max: 10.0,
    step: 0.5,
    category: 'Animation'
  },
  {
    key: 'diagonalWaveSpeed',
    label: 'Diagonal Wave Speed',
    type: 'slider',
    min: 1.0,
    max: 12.0,
    step: 0.5,
    category: 'Animation'
  },
  {
    key: 'flowAnimationSpeed',
    label: 'Flow Animation Speed',
    type: 'slider',
    min: 2.0,
    max: 15.0,
    step: 0.5,
    category: 'Animation'
  },
  {
    key: 'mouseWaveSpeed',
    label: 'Mouse Wave Speed',
    type: 'slider',
    min: 3.0,
    max: 20.0,
    step: 1.0,
    category: 'Animation'
  },
  
  // Wave properties category
  {
    key: 'waveAmplitude',
    label: 'Wave Amplitude',
    type: 'slider',
    min: 0.1,
    max: 1.0,
    step: 0.05,
    category: 'Waves'
  },
  {
    key: 'mouseInfluenceRadius',
    label: 'Mouse Influence Radius',
    type: 'slider',
    min: 0.5,
    max: 5.0,
    step: 0.1,
    category: 'Waves'
  },
  {
    key: 'mouseInfluenceStrength',
    label: 'Mouse Influence Strength',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Waves'
  },
  
  // Colors category
  {
    key: 'colors.cold',
    label: 'Cold Color (Blue)',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.neutral',
    label: 'Neutral Color (Green)',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.hot',
    label: 'Hot Color (Orange)',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.hottest',
    label: 'Hottest Color (Yellow)',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.gridOverlay',
    label: 'Grid Overlay Color',
    type: 'color',
    category: 'Colors'
  },
  {
    key: 'colors.mouseWave',
    label: 'Mouse Wave Color',
    type: 'color',
    category: 'Colors'
  },
  
  // Stencil properties category
  {
    key: 'stencilLineWidth',
    label: 'Stencil Line Width',
    type: 'slider',
    min: 0.001,
    max: 0.01,
    step: 0.0005,
    category: 'Stencil'
  },
  {
    key: 'diagonalStencilWeight',
    label: 'Diagonal Stencil Weight',
    type: 'slider',
    min: 0.1,
    max: 0.8,
    step: 0.05,
    category: 'Stencil'
  },
  {
    key: 'computeActivityIntensity',
    label: 'Compute Activity Intensity',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Stencil'
  }
];

// PDE Stencil background configuration
export const pdeStencilConfig: AnimatedBackgroundConfig = {
  id: 'pde-stencil',
  name: 'PDE Stencil Propagation',
  description: 'A computational visualization showing partial differential equation solving using finite difference stencils with wave propagation.',
  component: PDEStencilBackground,
  defaultSettings: pdeStencilDefaultSettings,
  settingsSchema: pdeStencilSettingsSchema
};

// Simple Wave background configuration (example of easy extensibility)
export const simpleWaveConfig: AnimatedBackgroundConfig = {
  id: 'simple-waves',
  name: 'Simple Sine Waves',
  description: 'A simple animated background with colorful sine wave patterns.',
  component: SimpleWaveBackground,
  defaultSettings: {
    ...pdeStencilDefaultSettings,
    // Customize some settings for this background
    opacity: 0.6,
    globalTimeMultiplier: 2.0,
    waveAmplitude: 0.8,
    colors: {
      cold: [0.2, 0.1, 0.8],      // Deep blue
      neutral: [0.8, 0.2, 0.8],   // Magenta
      hot: [1.0, 0.6, 0.1],       // Orange
      hottest: [1.0, 1.0, 0.8],   // Light yellow
      gridOverlay: [0.3, 0.3, 0.3],
      mouseWave: [1.0, 1.0, 1.0]
    }
  },
  settingsSchema: pdeStencilSettingsSchema.filter(setting => 
    // Only include relevant settings for the simple wave background
    ['opacity', 'globalTimeMultiplier', 'waveAmplitude', 'waveSpeed1', 'waveSpeed2'].includes(setting.key) ||
    setting.key.startsWith('colors.')
  )
};

// Registry of all available animated backgrounds
export const backgroundRegistry: AnimatedBackgroundConfig[] = [
  pdeStencilConfig,
  simpleWaveConfig
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
