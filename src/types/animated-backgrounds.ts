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
  colors: {
    cold: [number, number, number];      // RGB values 0-1
    neutral: [number, number, number];
    hot: [number, number, number];
    hottest: [number, number, number];
    gridOverlay: [number, number, number];
    mouseWave: [number, number, number];
  };
  
  // Grid and stencil properties
  stencilLineWidth: number;
  diagonalStencilWeight: number;
  computeActivityIntensity: number;
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
}
