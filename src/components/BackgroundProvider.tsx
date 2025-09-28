import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  BackgroundManagerState,
  BackgroundSettings,
} from '../types/animated-backgrounds';
import { backgroundRegistry, getBackgroundById } from './animated-backgrounds';
import { useSettingsPanel } from './SettingsPanelContext';

interface BackgroundContextType {
  // Current state
  state: BackgroundManagerState;

  // Background control functions
  switchToNextBackground: () => void;
  switchToPreviousBackground: () => void;
  selectBackground: (backgroundId: string) => void;
  updateCurrentSettings: (newSettings: Partial<BackgroundSettings>) => void;

  // Settings panel controls
  toggleSettingsPanel: () => void;
  closeSettingsPanel: () => void;

  // Audio controls (for spectrogram-oscilloscope background)
  audioControls: {
    startAudio: (() => void) | null;
    stopAudio: (() => void) | null;
    isPlaying: boolean;
  };
  setAudioControls: (controls: {
    startAudio: (() => void) | null;
    stopAudio: (() => void) | null;
    isPlaying: boolean;
  }) => void;

  // Cycling state for smooth transitions
  overlayOpacity: number;
  setOverlayOpacity: (opacity: number) => void;

  // Computed values
  currentBackground: ReturnType<typeof getBackgroundById>;
  currentSettings: BackgroundSettings;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(
  undefined
);

interface BackgroundProviderProps {
  children: ReactNode;
  initialBackgroundId?: string;
}

const getRandomBackgroundId = (): string => {
  const backgroundIds = backgroundRegistry.map(bg => bg.id);
  const randomIndex = Math.floor(Math.random() * backgroundIds.length);
  return backgroundIds[randomIndex];
};

export const BackgroundProvider: React.FC<BackgroundProviderProps> = ({
  children,
  initialBackgroundId,
}) => {
  // Initialize state with persistence first
  const [state, setState] = useState<BackgroundManagerState>(() => {
    const initialSettings: Record<string, BackgroundSettings> = {};
    backgroundRegistry.forEach(bg => {
      initialSettings[bg.id] = { ...bg.defaultSettings };
    });

    // Try to load from localStorage first
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('animatedBackgroundSettings');
        if (saved) {
          const parsedState = JSON.parse(saved);
          // Validate that the saved background still exists
          if (getBackgroundById(parsedState.currentBackgroundId)) {
            return {
              ...parsedState,
              settings: { ...initialSettings, ...parsedState.settings },
              showSettingsPanel: false, // Never restore panel open state
              closingSettingsPanel: false,
            };
          }
        }
      } catch (error) {
        console.warn(
          'Failed to load background settings from localStorage:',
          error
        );
      }
    }

    // Use provided initialBackgroundId or select a random one
    const selectedBackgroundId = initialBackgroundId || getRandomBackgroundId();

    return {
      currentBackgroundId: selectedBackgroundId,
      settings: initialSettings,
      showSettingsPanel: false,
      closingSettingsPanel: false,
    };
  });

  // Audio control state
  const [audioControls, setAudioControls] = useState<{
    startAudio: (() => void) | null;
    stopAudio: (() => void) | null;
    isPlaying: boolean;
  }>({ startAudio: null, stopAudio: null, isPlaying: false });

  // Cycling overlay state for smooth transitions
  // Start with overlay transparent (0) so background is immediately visible
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0);

  // Access global settings panel state after state initialization
  const {
    isSettingsPanelOpen,
    setSettingsPanelOpen,
    isClosingSettingsPanel,
    setClosingSettingsPanel,
  } = useSettingsPanel();

  // Persist settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'animatedBackgroundSettings',
          JSON.stringify(state)
        );
      } catch (error) {
        console.warn(
          'Failed to save background settings to localStorage:',
          error
        );
      }
    }
  }, [state]);

  // Computed values
  const currentBackground = useMemo(() => {
    return getBackgroundById(state.currentBackgroundId);
  }, [state.currentBackgroundId]);

  const currentSettings = useMemo(() => {
    return state.settings[state.currentBackgroundId];
  }, [state.settings, state.currentBackgroundId]);

  // Background switching functions
  const switchToNextBackground = useCallback(() => {
    setState(prev => {
      const currentIndex = backgroundRegistry.findIndex(
        bg => bg.id === prev.currentBackgroundId
      );
      const nextIndex = (currentIndex + 1) % backgroundRegistry.length;
      const nextBackgroundId = backgroundRegistry[nextIndex].id;
      return {
        ...prev,
        currentBackgroundId: nextBackgroundId,
      };
    });
  }, []);

  const switchToPreviousBackground = useCallback(() => {
    setState(prev => {
      const currentIndex = backgroundRegistry.findIndex(
        bg => bg.id === prev.currentBackgroundId
      );
      const previousIndex =
        currentIndex === 0 ? backgroundRegistry.length - 1 : currentIndex - 1;
      const previousBackgroundId = backgroundRegistry[previousIndex].id;
      return {
        ...prev,
        currentBackgroundId: previousBackgroundId,
      };
    });
  }, []);

  const selectBackground = useCallback((backgroundId: string) => {
    setState(prev => ({
      ...prev,
      currentBackgroundId: backgroundId,
    }));
  }, []);

  const updateCurrentSettings = useCallback(
    (newSettings: Partial<BackgroundSettings>) => {
      setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [prev.currentBackgroundId]: {
            ...prev.settings[prev.currentBackgroundId],
            ...newSettings,
          },
        },
      }));
    },
    []
  );

  // Sync BackgroundProvider state with SettingsPanelProvider state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      showSettingsPanel: isSettingsPanelOpen,
      closingSettingsPanel: isClosingSettingsPanel,
    }));
  }, [isSettingsPanelOpen, isClosingSettingsPanel]);

  // Settings panel controls - delegate to global settings panel provider
  const toggleSettingsPanel = useCallback(() => {
    if (isSettingsPanelOpen && !isClosingSettingsPanel) {
      // Close with animation
      setClosingSettingsPanel(true);
      setTimeout(() => {
        setSettingsPanelOpen(false);
        setClosingSettingsPanel(false);
      }, 300);
    } else if (!isSettingsPanelOpen && !isClosingSettingsPanel) {
      // Open immediately
      setSettingsPanelOpen(true);
    }
  }, [
    isSettingsPanelOpen,
    isClosingSettingsPanel,
    setSettingsPanelOpen,
    setClosingSettingsPanel,
  ]);

  const closeSettingsPanel = useCallback(() => {
    if (isSettingsPanelOpen) {
      setClosingSettingsPanel(true);
      setTimeout(() => {
        setSettingsPanelOpen(false);
        setClosingSettingsPanel(false);
      }, 300);
    }
  }, [isSettingsPanelOpen, setSettingsPanelOpen, setClosingSettingsPanel]);

  const contextValue: BackgroundContextType = {
    state,
    switchToNextBackground,
    switchToPreviousBackground,
    selectBackground,
    updateCurrentSettings,
    toggleSettingsPanel,
    closeSettingsPanel,
    audioControls,
    setAudioControls,
    overlayOpacity,
    setOverlayOpacity,
    currentBackground,
    currentSettings,
  };

  return (
    <BackgroundContext.Provider value={contextValue}>
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
};
