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

  // True once the component has mounted on the client. Used to defer any
  // non-deterministic rendering (random background / persisted settings) until
  // after hydration so SSR and the first client render stay identical.
  mounted: boolean;
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
  // Initialize state DETERMINISTICALLY so the server render and the first
  // client (hydration) render are identical. Any non-deterministic selection
  // (localStorage restore or random pick) is applied after mount in a
  // useEffect below — never in the initializer — to avoid hydration mismatches.
  const [state, setState] = useState<BackgroundManagerState>(() => {
    const initialSettings: Record<string, BackgroundSettings> = {};
    backgroundRegistry.forEach(bg => {
      initialSettings[bg.id] = { ...bg.defaultSettings };
    });

    // Fixed default: honor an explicit prop, otherwise the first registered
    // background. This is stable across SSR and the initial client render.
    const selectedBackgroundId =
      initialBackgroundId || backgroundRegistry[0].id;

    return {
      currentBackgroundId: selectedBackgroundId,
      settings: initialSettings,
      showSettingsPanel: false,
      closingSettingsPanel: false,
    };
  });

  // Tracks client mount. Stays false through SSR and the first client render.
  const [mounted, setMounted] = useState(false);

  // After mount, apply persisted settings or a random background. Runs once on
  // the client only, so it cannot affect the hydration render. When an explicit
  // initialBackgroundId is provided (e.g. the PDE-solver blog integration) we
  // respect it and skip both the localStorage restore and the random pick.
  useEffect(() => {
    if (!initialBackgroundId) {
      let restored = false;
      try {
        const saved = localStorage.getItem('animatedBackgroundSettings');
        if (saved) {
          const parsedState = JSON.parse(saved);
          // Validate that the saved background still exists
          if (getBackgroundById(parsedState.currentBackgroundId)) {
            setState(prev => ({
              ...prev,
              ...parsedState,
              settings: { ...prev.settings, ...parsedState.settings },
              showSettingsPanel: false, // Never restore panel open state
              closingSettingsPanel: false,
            }));
            restored = true;
          }
        }
      } catch (error) {
        console.warn(
          'Failed to load background settings from localStorage:',
          error
        );
      }

      // No valid persisted background: pick a random one for this visit.
      if (!restored) {
        const randomId = getRandomBackgroundId();
        setState(prev => ({ ...prev, currentBackgroundId: randomId }));
      }
    }

    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBackgroundId]);

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

  // Persist settings to localStorage. Guarded by `mounted` so the deterministic
  // default state written during the first render can't clobber a user's
  // persisted settings before the restore effect above has run.
  useEffect(() => {
    if (!mounted) return;
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
  }, [state, mounted]);

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
    mounted,
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
