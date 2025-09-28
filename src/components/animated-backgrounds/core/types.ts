import React from 'react';

// Standard settings that ALL backgrounds must support
export interface StandardSettings {
  // Visual settings - truly universal
  opacity: number;
  elementSize: number; // Universal element/node/cell size

  // Animation settings - truly universal
  globalTimeMultiplier: number; // Global animation speed
}

// Schema for individual settings
export interface SettingsSchema {
  key: string;
  label: string;
  type: 'slider' | 'number' | 'color' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: any; label: string }[];
  category: string;
}

// Props for animated background components
export interface AnimatedBackgroundProps<TSettings = StandardSettings> {
  className?: string;
  settings: TSettings;
}

// Configuration for a background with custom settings
export interface BackgroundConfig<TCustomSettings = {}> {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<
    AnimatedBackgroundProps<StandardSettings & TCustomSettings>
  >;
  standardSettings: StandardSettings;
  customSettings: TCustomSettings;
  customSettingsSchema: SettingsSchema[];
  blogPostSection?: string; // Optional link to blog post section
}

// Combined settings type
export type BackgroundSettings<TCustomSettings = {}> = StandardSettings &
  TCustomSettings;

// Legacy compatibility - can be removed later
export type BackgroundManagerState = {
  currentBackgroundId: string;
  settings: Record<string, any>;
  showSettingsPanel: boolean;
  closingSettingsPanel: boolean;
};

// Re-export for backwards compatibility - matches the original interface structure
export interface AnimatedBackgroundConfig {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<any>;
  defaultSettings: any;
  settingsSchema: SettingsSchema[];
  blogPostSection?: string;
}
