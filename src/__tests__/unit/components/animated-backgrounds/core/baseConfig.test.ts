import React from 'react';
import {
  createBackgroundConfig,
  getCompleteSettings,
  getCompleteSettingsSchema,
  toLegacyConfig,
} from '../../../../../components/animated-backgrounds/core/baseConfig';
import {
  defaultStandardSettings,
  standardSettingsSchema,
} from '../../../../../components/animated-backgrounds/core/standardSettings';

describe('baseConfig helpers', () => {
  const Dummy = () => React.createElement('div', null, 'dummy');
  const config = createBackgroundConfig({
    id: 'dummy',
    name: 'Dummy Background',
    description: 'Testing background config helpers',
    component: Dummy,
    customSettings: { foo: 1 },
    customSettingsSchema: [
      {
        key: 'foo',
        label: 'Foo',
        type: 'slider',
        min: 0,
        max: 10,
        step: 1,
        category: 'General',
      },
    ],
    standardOverrides: { opacity: 0.5 },
  });

  it('merges standard overrides and retains defaults', () => {
    expect(config.standardSettings.opacity).toBe(0.5);
    expect(config.standardSettings.elementSize).toBe(
      defaultStandardSettings.elementSize
    );
  });

  it('returns combined settings object', () => {
    const settings = getCompleteSettings(config);
    expect(settings.foo).toBe(1);
    expect(settings.opacity).toBe(0.5);
    expect(settings.globalTimeMultiplier).toBe(
      defaultStandardSettings.globalTimeMultiplier
    );
  });

  it('combines custom and standard schema', () => {
    const schema = getCompleteSettingsSchema(config);
    expect(schema).toHaveLength(1 + standardSettingsSchema.length);
    expect(schema[0].key).toBe('foo');
  });

  it('produces legacy config shape', () => {
    const legacy = toLegacyConfig(config);
    expect(legacy.id).toBe('dummy');
    expect(legacy.defaultSettings.foo).toBe(1);
    expect(legacy.settingsSchema.length).toBe(
      1 + standardSettingsSchema.length
    );
  });
});
