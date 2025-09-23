import React, { useState, useCallback } from 'react';
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
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    Visual: true,
    Animation: false,
    Waves: false,
    Colors: false,
    Stencil: false,
    'VCO 1': false,
    'VCO 2': false,
    Mixer: false,
    'Delay/Echo': false,
    Filter: false,
    Distortion: false,
    'Ring Mod': false,
    Noise: false,
    Reverb: false,
    'Graph Topology': false
  });

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

  // Group settings by category
  const settingsByCategory = settingsSchema.reduce((acc, setting) => {
    const category = setting.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(setting);
    return acc;
  }, {} as Record<string, SettingsSchema[]>);

  // Render setting input based on type
  const renderSettingInput = (setting: SettingsSchema) => {
    const value = getNestedValue(settings, setting.key);

    switch (setting.type) {
      case 'slider':
        return (
          <div className="setting-input">
            <input
              type="range"
              min={setting.min}
              max={setting.max}
              step={setting.step}
              value={value}
              onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value))}
              className="slider"
            />
            <span className="setting-value">{value?.toFixed(3)}</span>
          </div>
        );

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
      
      <div className="settings-content">
        {Object.entries(settingsByCategory).map(([category, categorySettings]) => (
          <div key={category} className="settings-category">
            <button
              className={`category-header ${openCategories[category] ? 'open' : ''}`}
              onClick={() => toggleCategory(category)}
            >
              <span>{category?.toLowerCase?.() || ''}</span>
              <span className="category-toggle" />
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
        ))}
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
