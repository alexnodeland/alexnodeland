import {
  backgroundConfigs,
  backgroundRegistry,
  getAllBackgroundConfigs,
  getBackgroundById,
  getBackgroundConfigById,
  getBackgroundIds,
} from '../../../../components/animated-backgrounds';

describe('animated-backgrounds index', () => {
  it('exports legacy backgroundRegistry with expected backgrounds', () => {
    const ids = backgroundRegistry.map(bg => bg.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'cellular-automaton',
        'simple-waves',
        'shortest-path-lab',
        'spectrogram-oscilloscope',
        'graph-topology',
      ])
    );
  });

  it('legacy registry has proper structure', () => {
    for (const config of backgroundRegistry) {
      expect(config.component).toBeDefined();
      expect(config.defaultSettings).toBeDefined();
      expect(config.settingsSchema.length).toBeGreaterThan(0);
      expect(config.id).toBeTruthy();
      expect(config.name).toBeTruthy();
      expect(config.description).toBeTruthy();
    }
  });

  it('exports modern backgroundConfigs', () => {
    expect(backgroundConfigs.length).toBeGreaterThan(0);
    for (const config of backgroundConfigs) {
      expect(config.component).toBeDefined();
      expect(config.standardSettings).toBeDefined();
      expect(config.customSettings).toBeDefined();
      expect(config.customSettingsSchema.length).toBeGreaterThan(0);
    }
  });

  it('helper functions work correctly', () => {
    const ids = getBackgroundIds();
    expect(ids.length).toBeGreaterThan(0);

    const firstId = ids[0];
    const byId = getBackgroundById(firstId);
    expect(byId).toBeDefined();
    expect(byId?.id).toBe(firstId);

    const configById = getBackgroundConfigById(firstId);
    expect(configById).toBeDefined();
    expect(configById?.id).toBe(firstId);

    const allConfigs = getAllBackgroundConfigs();
    expect(allConfigs).toEqual(backgroundConfigs);
  });

  it('handles missing IDs gracefully', () => {
    expect(getBackgroundById('nonexistent')).toBeUndefined();
    expect(getBackgroundConfigById('nonexistent')).toBeUndefined();
  });
});
