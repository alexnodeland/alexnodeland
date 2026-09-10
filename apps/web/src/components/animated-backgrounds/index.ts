// New modular animated backgrounds system
export * from './core/baseConfig';
export * from './core/standardSettings';
export * from './core/types';

// Background configurations
export { cellularAutomatonConfig } from './backgrounds/cellular-automaton/config';
export { graphTopologyConfig } from './backgrounds/graph-topology/config';
export { shortestPathLabConfig } from './backgrounds/shortest-path-lab/config';
export { simpleWaveConfig } from './backgrounds/simple-waves/config';
export { spectrogramOscilloscopeConfig } from './backgrounds/spectrogram-oscilloscope/config';
export { pdeSolverConfig } from './backgrounds/pde-solver/config';

// No component re-exports: the simulations are reached lazily through their
// configs (see each config.ts), and a static export here would haul all six —
// and three.js — back into whatever bundle imports this barrel. Tests import
// components from their own files.

// Management components
export { default as BackgroundControls } from './BackgroundControls';
export { default as BackgroundManager } from './BackgroundManager';
export { default as SettingsPanel } from './SettingsPanel';

// Registry and utilities
import { cellularAutomatonConfig } from './backgrounds/cellular-automaton/config';
import { graphTopologyConfig } from './backgrounds/graph-topology/config';
import { shortestPathLabConfig } from './backgrounds/shortest-path-lab/config';
import { simpleWaveConfig } from './backgrounds/simple-waves/config';
import { spectrogramOscilloscopeConfig } from './backgrounds/spectrogram-oscilloscope/config';
import { pdeSolverConfig } from './backgrounds/pde-solver/config';
import { toLegacyConfig } from './core/baseConfig';
import type { AnimatedBackgroundConfig } from './core/types';

// Registry of all available animated backgrounds in the new format
export const backgroundConfigs = [
  cellularAutomatonConfig,
  simpleWaveConfig,
  graphTopologyConfig,
  spectrogramOscilloscopeConfig,
  shortestPathLabConfig,
  pdeSolverConfig,
];

// Legacy compatibility - convert new configs to old format for existing components
export const backgroundRegistry: AnimatedBackgroundConfig[] =
  backgroundConfigs.map(config => toLegacyConfig(config));

// Helper functions for background management
export const getBackgroundById = (id: string) => {
  return backgroundRegistry.find(bg => bg.id === id);
};

export const getBackgroundIds = (): string[] => {
  return backgroundRegistry.map(bg => bg.id);
};

// New helper functions for the modern API
export const getBackgroundConfigById = (id: string) => {
  return backgroundConfigs.find(config => config.id === id);
};

export const getAllBackgroundConfigs = () => {
  return backgroundConfigs;
};
