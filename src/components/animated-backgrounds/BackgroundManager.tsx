import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BackgroundManagerState, BackgroundSettings } from '../../types/animated-backgrounds';
import { backgroundRegistry, getBackgroundById } from './backgroundRegistry';
import BackgroundControls from './BackgroundControls';
import SettingsPanel from './SettingsPanel';
import { useSettingsPanel } from '../../contexts/SettingsPanelContext';

interface BackgroundManagerProps {
  className?: string;
  initialBackgroundId?: string;
}

const BackgroundManager: React.FC<BackgroundManagerProps> = ({
  className,
  initialBackgroundId = 'pde-stencil'
}) => {
  // Use settings panel context
  const { setSettingsPanelOpen, setClosingSettingsPanel } = useSettingsPanel();

  // Initialize state with default settings for all backgrounds
  const [state, setState] = useState<BackgroundManagerState>(() => {
    const initialSettings: Record<string, BackgroundSettings> = {};
    backgroundRegistry.forEach(bg => {
      initialSettings[bg.id] = { ...bg.defaultSettings };
    });

    return {
      currentBackgroundId: initialBackgroundId,
      settings: initialSettings,
      showSettingsPanel: false,
      closingSettingsPanel: false
    };
  });

  // Get current background configuration
  const currentBackground = useMemo(() => {
    return getBackgroundById(state.currentBackgroundId);
  }, [state.currentBackgroundId]);

  // Get current background settings
  const currentSettings = useMemo(() => {
    return state.settings[state.currentBackgroundId];
  }, [state.settings, state.currentBackgroundId]);

  // Switch to next background
  const switchToNextBackground = useCallback(() => {
    const currentIndex = backgroundRegistry.findIndex(bg => bg.id === state.currentBackgroundId);
    const nextIndex = (currentIndex + 1) % backgroundRegistry.length;
    const nextBackgroundId = backgroundRegistry[nextIndex].id;

    setState(prev => ({
      ...prev,
      currentBackgroundId: nextBackgroundId
    }));
  }, [state.currentBackgroundId]);

  // Switch to previous background
  const switchToPreviousBackground = useCallback(() => {
    const currentIndex = backgroundRegistry.findIndex(bg => bg.id === state.currentBackgroundId);
    const previousIndex = currentIndex <= 0 ? backgroundRegistry.length - 1 : currentIndex - 1;
    const previousBackgroundId = backgroundRegistry[previousIndex].id;

    setState(prev => ({
      ...prev,
      currentBackgroundId: previousBackgroundId
    }));
  }, [state.currentBackgroundId]);

  // Close settings panel with animation
  const closeSettingsPanel = useCallback(() => {
    setState(prev => ({
      ...prev,
      closingSettingsPanel: true
    }));
    
    // Start closing animation - keep panel "open" state until animation finishes
    setClosingSettingsPanel(true);
    
    // After animation completes, fully close everything
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        showSettingsPanel: false,
        closingSettingsPanel: false
      }));
      
      // Update context - panel is now fully closed
      setSettingsPanelOpen(false);
      setClosingSettingsPanel(false);
    }, 300);
  }, [setSettingsPanelOpen, setClosingSettingsPanel]);

  // Toggle settings panel
  const toggleSettingsPanel = useCallback(() => {
    if (state.showSettingsPanel) {
      // If closing, use the close animation
      closeSettingsPanel();
    } else {
      // If opening, show immediately
      setState(prev => ({
        ...prev,
        showSettingsPanel: true,
        closingSettingsPanel: false
      }));
      
      // Update context to trigger layout changes
      setSettingsPanelOpen(true);
      setClosingSettingsPanel(false);
    }
  }, [state.showSettingsPanel, closeSettingsPanel, setSettingsPanelOpen, setClosingSettingsPanel]);

  // Update settings for current background
  const updateCurrentSettings = useCallback((newSettings: BackgroundSettings) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [state.currentBackgroundId]: newSettings
      }
    }));
  }, [state.currentBackgroundId]);

  // Reset current background to default settings
  const resetToDefaults = useCallback(() => {
    if (currentBackground) {
      updateCurrentSettings({ ...currentBackground.defaultSettings });
    }
  }, [currentBackground, updateCurrentSettings]);

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Only handle key events if not focused on an input element
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.code) {
      case 'ArrowLeft':
        event.preventDefault();
        switchToPreviousBackground();
        break;
      case 'ArrowRight':
        event.preventDefault();
        switchToNextBackground();
        break;
      case 'KeyS':
        event.preventDefault();
        toggleSettingsPanel();
        break;
      case 'Escape':
        if (state.showSettingsPanel) {
          event.preventDefault();
          closeSettingsPanel();
        }
        break;
    }
  }, [
    switchToNextBackground,
    switchToPreviousBackground,
    toggleSettingsPanel,
    closeSettingsPanel,
    state.showSettingsPanel
  ]);

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('animatedBackgroundSettings', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save background settings to localStorage:', error);
    }
  }, [state]);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('animatedBackgroundSettings');
      if (saved) {
        const parsedState = JSON.parse(saved);
        // Validate that the saved background still exists
        if (getBackgroundById(parsedState.currentBackgroundId)) {
          setState(prev => ({
            ...prev,
            ...parsedState,
            showSettingsPanel: false // Never restore panel open state
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to load background settings from localStorage:', error);
    }
  }, []);

  // Render current background
  const renderCurrentBackground = () => {
    if (!currentBackground || !currentSettings) {
      return null;
    }

    const BackgroundComponent = currentBackground.component;
    return (
      <BackgroundComponent
        className={className}
        settings={currentSettings}
      />
    );
  };

  return (
    <>
      {renderCurrentBackground()}
      
      {/* Background Controls */}
      <BackgroundControls
        currentBackgroundId={state.currentBackgroundId}
        currentBackgroundName={currentBackground?.name || 'Unknown'}
        showSettingsPanel={state.showSettingsPanel || state.closingSettingsPanel}
        closingSettingsPanel={state.closingSettingsPanel}
        onPreviousBackground={switchToPreviousBackground}
        onNextBackground={switchToNextBackground}
        onToggleSettings={toggleSettingsPanel}
        settings={currentSettings}
        settingsSchema={currentBackground?.settingsSchema}
        onSettingsChange={updateCurrentSettings}
        onCloseSettings={closeSettingsPanel}
      />

      {/* Settings panel moved into BackgroundControls anchor */}
    </>
  );
};

export default BackgroundManager;
