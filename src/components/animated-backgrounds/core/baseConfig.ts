import React from 'react';
import {
  createBackgroundSettings,
  createSettingsSchema,
  defaultStandardSettings,
} from './standardSettings';
import { BackgroundConfig, SettingsSchema, StandardSettings } from './types';

// Utility to create a complete background configuration
export function createBackgroundConfig<
  TCustomSettings extends Record<string, any>,
>(config: {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<any>;
  customSettings: TCustomSettings;
  customSettingsSchema: SettingsSchema[];
  standardOverrides?: Partial<StandardSettings>;
}): BackgroundConfig<TCustomSettings> {
  const standardSettings = {
    ...defaultStandardSettings,
    ...config.standardOverrides,
  };

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    component: config.component,
    standardSettings,
    customSettings: config.customSettings,
    customSettingsSchema: config.customSettingsSchema,
  };
}

// Utility to get the complete settings for a background (standard + custom)
export function getCompleteSettings<
  TCustomSettings extends Record<string, any>,
>(
  config: BackgroundConfig<TCustomSettings>
): StandardSettings & TCustomSettings {
  return createBackgroundSettings(
    config.customSettings,
    config.standardSettings
  );
}

// Utility to get the complete settings schema for a background
export function getCompleteSettingsSchema<
  TCustomSettings extends Record<string, any>,
>(config: BackgroundConfig<TCustomSettings>): SettingsSchema[] {
  return createSettingsSchema(config.customSettingsSchema);
}

// Legacy compatibility function - converts new config to old format
export function toLegacyConfig(config: BackgroundConfig<any>) {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    component: config.component,
    defaultSettings: getCompleteSettings(config),
    settingsSchema: getCompleteSettingsSchema(config),
  };
}
