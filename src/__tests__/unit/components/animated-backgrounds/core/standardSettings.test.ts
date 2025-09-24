import {
  createBackgroundSettings,
  createSettingsSchema,
  defaultStandardSettings,
  standardSettingsSchema,
} from '../../../../../components/animated-backgrounds/core/standardSettings';

describe('standardSettings helpers', () => {
  it('merges overrides and custom settings', () => {
    const result = createBackgroundSettings({ custom: true }, { opacity: 0.6 });

    expect(result.opacity).toBe(0.6);
    expect(result.elementSize).toBe(defaultStandardSettings.elementSize);
    expect(result.custom).toBe(true);
  });

  it('appends standard schema to custom schema', () => {
    const customSchema = [
      {
        key: 'custom.setting',
        label: 'Custom Setting',
        type: 'slider',
        min: 0,
        max: 10,
        step: 1,
        category: 'Custom',
      },
    ];

    const schema = createSettingsSchema(customSchema);

    expect(schema).toHaveLength(1 + standardSettingsSchema.length);
    expect(schema[0].key).toBe('custom.setting');
  });
});
