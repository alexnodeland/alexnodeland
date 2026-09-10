import { SettingsSchema, StandardSettings } from './types';

// Default standard settings that work across all backgrounds
export const defaultStandardSettings: StandardSettings = {
  // Visual settings - truly universal
  opacity: 0.8,
  elementSize: 0.025, // Reasonable default for nodes/cells/elements

  // Animation settings - truly universal
  globalTimeMultiplier: 1.0, // Normal animation speed
};

// Schema for standard settings - these appear in the "Standard Settings" section
export const standardSettingsSchema: SettingsSchema[] = [
  // Visual category - only truly universal visual settings
  {
    key: 'opacity',
    label: 'Background Opacity',
    type: 'slider',
    min: 0.1,
    max: 1.0,
    step: 0.05,
    description:
      'How strongly the background reads against the page. Lower it when the animation competes with text in front of it.',
    category: 'Visual',
  },
  {
    key: 'elementSize',
    label: 'Element Size',
    type: 'slider',
    min: 0.005,
    max: 0.08,
    step: 0.002,
    description:
      'Base size for whatever the background draws — dots, cells, nodes. A rough zoom control.',
    category: 'Visual',
  },

  // Animation category - only truly universal animation settings
  {
    key: 'globalTimeMultiplier',
    label: 'Animation Speed',
    type: 'slider',
    min: 0.1,
    max: 5.0,
    step: 0.1,
    description:
      'Master speed for the whole animation. Slow it right down to study what a background is doing rather than watch it.',
    category: 'Animation',
  },
];

// Utility function to merge custom settings with standard defaults
export function createBackgroundSettings<T extends Record<string, any>>(
  customSettings: T,
  standardOverrides: Partial<StandardSettings> = {}
): StandardSettings & T {
  return {
    ...defaultStandardSettings,
    ...standardOverrides,
    ...customSettings,
  };
}

// Utility to create schema combining standard and custom.
//
// A "standard" setting is only standard if the background reads it. Element
// Size in particular has no meaning for a background that draws a continuous
// field rather than discrete elements, and offering a slider that does nothing
// is worse than offering nothing at all — so backgrounds can opt out by key.
export function createSettingsSchema(
  customSchema: SettingsSchema[],
  omitStandardKeys: readonly string[] = []
): SettingsSchema[] {
  const omitted = new Set(omitStandardKeys);
  return [
    ...customSchema,
    ...standardSettingsSchema.filter(setting => !omitted.has(setting.key)),
  ];
}
