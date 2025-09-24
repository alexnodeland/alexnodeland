import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BackgroundSettings, SettingsSchema } from '../../types/animated-backgrounds';

interface SettingsPanelProps {
  settings: BackgroundSettings;
  settingsSchema: SettingsSchema[];
  onSettingsChange: (newSettings: BackgroundSettings) => void;
  onClose: () => void;
  // Background info for sidebar header
  currentBackgroundId: string;
  currentBackgroundName: string;
  currentBackgroundDescription: string;
  totalBackgrounds: number;
  onPreviousBackground: () => void;
  onNextBackground: () => void;
  isClosing: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  settingsSchema,
  onSettingsChange,
  onClose,
  currentBackgroundId,
  currentBackgroundName,
  currentBackgroundDescription,
  totalBackgrounds,
  onPreviousBackground,
  onNextBackground,
  isClosing
}) => {
  // Define which categories are considered standard across all backgrounds
  const STANDARD_CATEGORY_ORDER = useMemo(() => ['Visual', 'Animation', 'Colors'], []);
  const STANDARD_CATEGORIES = useMemo(() => new Set<string>(STANDARD_CATEGORY_ORDER), [STANDARD_CATEGORY_ORDER]);

  // Group settings by category
  const settingsByCategory = useMemo(() => {
    return settingsSchema.reduce((acc, setting) => {
      const category = setting.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(setting);
      return acc;
    }, {} as Record<string, SettingsSchema[]>);
  }, [settingsSchema]);

  // Partition categories into custom (top) and standard (bottom)
  const { customCategories, standardCategories } = useMemo(() => {
    const allCategoryNames = Object.keys(settingsByCategory);
    const custom: string[] = [];
    const standard: string[] = [];
    for (const name of allCategoryNames) {
      if (STANDARD_CATEGORIES.has(name)) {
        standard.push(name);
      } else {
        custom.push(name);
      }
    }
    // Sort standard categories using fixed order
    const standardSorted = [...standard].sort((a, b) => {
      return STANDARD_CATEGORY_ORDER.indexOf(a) - STANDARD_CATEGORY_ORDER.indexOf(b);
    });
    return { customCategories: custom, standardCategories: standardSorted };
  }, [settingsByCategory, STANDARD_CATEGORIES, STANDARD_CATEGORY_ORDER]);

  // Track open/closed per-category; default: custom open, standard closed
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  // Initialize/merge open state when schema changes (e.g., switching backgrounds)
  useEffect(() => {
    setOpenCategories(prev => {
      const next: Record<string, boolean> = { ...prev };
      for (const name of customCategories) {
        if (next[name] === undefined) next[name] = true;
      }
      for (const name of standardCategories) {
        if (next[name] === undefined) next[name] = false;
      }
      return next;
    });
  }, [customCategories, standardCategories]);

  // Helper function to get nested property value
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Helper function to set nested property value
  const setNestedValue = (obj: any, path: string, value: any): any => {
    const keys = path.split('.');
    const result = { ...obj };
    let current = result;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      current[key] = { ...current[key] };
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return result;
  };

  // Handle setting change
  const handleSettingChange = useCallback((key: string, value: any) => {
    const newSettings = setNestedValue(settings, key, value);
    onSettingsChange(newSettings);
  }, [settings, onSettingsChange]);

  // Convert RGB array to hex color
  const rgbToHex = (rgb: [number, number, number]): string => {
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
  };

  // Convert hex color to RGB array
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      ];
    }
    return [0, 0, 0];
  };

  // Toggle category
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Collapse/expand helpers (VS Code-style controls)
  const collapseAllCustom = () => {
    setOpenCategories(prev => {
      const updated = { ...prev };
      customCategories.forEach(c => { updated[c] = false; });
      return updated;
    });
  };

  const expandAllCustom = () => {
    setOpenCategories(prev => {
      const updated = { ...prev };
      customCategories.forEach(c => { updated[c] = true; });
      return updated;
    });
  };

  const collapseAllStandard = () => {
    setOpenCategories(prev => {
      const updated = { ...prev };
      standardCategories.forEach(c => { updated[c] = false; });
      return updated;
    });
  };

  const expandAllStandard = () => {
    setOpenCategories(prev => {
      const updated = { ...prev };
      standardCategories.forEach(c => { updated[c] = true; });
      return updated;
    });
  };

  // Section computed states: if any open => show down chevron; if none open => right chevron
  const customAnyOpen = useMemo(() => customCategories.some(c => !!openCategories[c]), [customCategories, openCategories]);
  const standardAnyOpen = useMemo(() => standardCategories.some(c => !!openCategories[c]), [standardCategories, openCategories]);

  const toggleCustomSection = () => {
    if (customAnyOpen) {
      collapseAllCustom();
    } else {
      expandAllCustom();
    }
  };

  const toggleStandardSection = () => {
    if (standardAnyOpen) {
      collapseAllStandard();
    } else {
      expandAllStandard();
    }
  };

  // Render setting input based on type
  const renderSettingInput = (setting: SettingsSchema) => {
    const value = getNestedValue(settings, setting.key);

    switch (setting.type) {
      case 'slider':
        // Dynamic bounds for settings that depend on other settings
        {
          let dynamicMin = setting.min;
          let dynamicMax = setting.max;
          if (setting.key === 'spStartNode' || setting.key === 'spGoalNode') {
            const total = (settings as any).spTotalNodes ?? 0;
            dynamicMin = 0;
            dynamicMax = Math.max(0, (typeof total === 'number' ? total : 0) - 1);
          }
          const clampedValue = Math.max(
            dynamicMin ?? Number.NEGATIVE_INFINITY,
            Math.min(dynamicMax ?? Number.POSITIVE_INFINITY, value ?? 0)
          );
          return (
            <div className="setting-input">
              <input
                type="range"
                min={dynamicMin}
                max={dynamicMax}
                step={setting.step}
                value={clampedValue}
                onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value))}
                className="slider"
              />
              <span className="setting-value">{clampedValue?.toFixed?.(3)}</span>
            </div>
          );
        }

      case 'number':
        return (
          <div className="setting-input">
            <input
              type="number"
              min={setting.min}
              max={setting.max}
              step={setting.step}
              value={value}
              onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value))}
              className="number-input"
            />
          </div>
        );

      case 'color':
        return (
          <div className="setting-input">
            <input
              type="color"
              value={rgbToHex(value)}
              onChange={(e) => handleSettingChange(setting.key, hexToRgb(e.target.value))}
              className="color-input"
            />
            <span className="color-value">{rgbToHex(value)}</span>
          </div>
        );

      case 'select':
        return (
          <div className="setting-input">
            <select
              value={value}
              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
              className="select-input"
            >
              {setting.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label?.toLowerCase?.() || ''}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`settings-sidebar ${isClosing ? 'closing' : ''}`}>
      <div className="sidebar-header">
        <div className="background-header">
          <div className="background-controls-header">
            <div className="background-name">{currentBackgroundName?.toLowerCase?.() || ''}</div>
            <button onClick={onClose} className="close-button" aria-label="Close settings" />
          </div>
          <div className="background-description">
            {currentBackgroundDescription?.toLowerCase?.() || ''}
          </div>
          
          {currentBackgroundId === 'spectrogram-oscilloscope' && (
            <div className="special-hotkeys">
              <div className="special-hotkeys-title">special controls</div>
              <div className="special-hotkey-item">
                <kbd>P</kbd> play sound
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="settings-content" style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
        {/* Custom categories (top, fixed) */}
        <div className="settings-section settings-section-custom">
          <div className="section-header">
            <div className="section-left">
              <button
                className="section-action"
                onClick={toggleCustomSection}
                aria-label={customAnyOpen ? 'Collapse all custom' : 'Expand all custom'}
                title={customAnyOpen ? 'Collapse all' : 'Expand all'}
              >{customAnyOpen ? '▾' : '▸'}</button>
              <div className="section-title">custom settings</div>
            </div>
          </div>
          {customCategories.map(category => {
            const categorySettings = settingsByCategory[category] || [];
            return (
              <div key={category} className="settings-category">
                <button
                  className={`category-header ${openCategories[category] ? 'open' : ''}`}
                  onClick={() => toggleCategory(category)}
                  aria-expanded={!!openCategories[category]}
                >
                  <span className="category-left">
                    <span className="category-toggle" aria-hidden="true" />
                    <span className="category-title">{category?.toLowerCase?.() || ''}</span>
                  </span>
                </button>
                {openCategories[category] && (
                  <div className="category-content">
                    {categorySettings.map(setting => (
                      <div key={setting.key} className="setting-row">
                        <label className="setting-label">
                          {setting.label?.toLowerCase?.() || ''}
                        </label>
                        {renderSettingInput(setting)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Standard categories (bottom-justified) */}
        <div className="settings-section settings-section-standard" style={{ marginTop: 'auto' }}>
          <div className="section-header">
            <div className="section-left">
              <button
                className="section-action"
                onClick={toggleStandardSection}
                aria-label={standardAnyOpen ? 'Collapse all standard' : 'Expand all standard'}
                title={standardAnyOpen ? 'Collapse all' : 'Expand all'}
              >{standardAnyOpen ? '▾' : '▸'}</button>
              <div className="section-title">standard settings</div>
            </div>
          </div>
          {standardCategories.map(category => {
            const categorySettings = settingsByCategory[category] || [];
            return (
              <div key={category} className="settings-category">
                <button
                  className={`category-header ${openCategories[category] ? 'open' : ''}`}
                  onClick={() => toggleCategory(category)}
                  aria-expanded={!!openCategories[category]}
                >
                  <span className="category-left">
                    <span className="category-toggle" aria-hidden="true" />
                    <span className="category-title">{category?.toLowerCase?.() || ''}</span>
                  </span>
                </button>
                {openCategories[category] && (
                  <div className="category-content">
                    {categorySettings.map(setting => (
                      <div key={setting.key} className="setting-row">
                        <label className="setting-label">
                          {setting.label?.toLowerCase?.() || ''}
                        </label>
                        {renderSettingInput(setting)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="settings-panel-footer">
        <button 
          onClick={() => onSettingsChange(settings)} 
          className="reset-button"
        >
          reset to defaults
        </button>
        
        <div className="sidebar-keyboard-hints">
          <kbd>←</kbd><kbd>→</kbd> switch • <kbd>S</kbd> settings • <kbd>Esc</kbd> close
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
