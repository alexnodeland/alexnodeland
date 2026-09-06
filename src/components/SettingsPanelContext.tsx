import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface SettingsPanelContextType {
  isSettingsPanelOpen: boolean;
  isClosingSettingsPanel: boolean;
  isChatPanelOpen: boolean;
  isClosingChatPanel: boolean;
  isContentHidden: boolean;
  setSettingsPanelOpen: (isOpen: boolean) => void;
  setClosingSettingsPanel: (isClosing: boolean) => void;
  setChatPanelOpen: (isOpen: boolean) => void;
  setClosingChatPanel: (isClosing: boolean) => void;
  setContentHidden: (isHidden: boolean) => void;
}

const SettingsPanelContext = createContext<
  SettingsPanelContextType | undefined
>(undefined);

interface SettingsPanelProviderProps {
  children: ReactNode;
}

export const SettingsPanelProvider: React.FC<SettingsPanelProviderProps> = ({
  children,
}) => {
  // Both flags drive real markup — the header and layout wrappers take
  // `*-panel-open` classes from them, and ChatModal renders nothing when the
  // chat flag is false. Reading localStorage in the initializer would make the
  // first client render disagree with the SSR HTML for anyone who left a panel
  // open, so start closed (as the server does) and restore after mount.
  // BackgroundProvider does the same thing for the same reason.
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isClosingSettingsPanel, setIsClosingSettingsPanel] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [isClosingChatPanel, setIsClosingChatPanel] = useState(false);
  const [isContentHidden, setIsContentHidden] = useState(false);

  // Tracks client mount so the persistence effects below cannot write the
  // pre-restore defaults over what was saved.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const restore = (key: string, apply: (open: boolean) => void) => {
      try {
        const saved = localStorage.getItem(key);
        // Loose on purpose: a spec-compliant store answers null for a missing
        // key, but stubbed stores (tests, privacy shims) answer undefined,
        // and either one means "nothing saved" — not "saved: closed".
        if (saved != null) apply(saved === 'true');
      } catch (error) {
        console.warn(`Failed to load ${key} from localStorage:`, error);
      }
    };

    // The settings panel is per visit: it used to be restored here too, so
    // anyone who had opened it once got it open on every page of every later
    // visit. The key it wrote is cleared so an old value cannot linger.
    try {
      localStorage.removeItem('settings-panel-open');
    } catch {
      // Storage unavailable: nothing to clear.
    }
    restore('chat-panel-open', setIsChatPanelOpen);
    setHydrated(true);
  }, []);

  // Persist chat panel state to localStorage
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('chat-panel-open', isChatPanelOpen.toString());
      } catch (error) {
        console.warn('Failed to save chat panel state to localStorage:', error);
      }
    }
  }, [isChatPanelOpen, hydrated]);

  // Stable setter identities and a memoized value: half the site consumes
  // this context (the shell, both panels, the background manager), and every
  // panel toggle re-renders them all — handing out fresh setter functions on
  // top of that defeated every downstream memo and effect dep list.
  const setSettingsPanelOpen = useCallback((isOpen: boolean) => {
    setIsSettingsPanelOpen(isOpen);
  }, []);

  const setClosingSettingsPanel = useCallback((isClosing: boolean) => {
    setIsClosingSettingsPanel(isClosing);
  }, []);

  const setChatPanelOpen = useCallback((isOpen: boolean) => {
    setIsChatPanelOpen(isOpen);
  }, []);

  const setClosingChatPanel = useCallback((isClosing: boolean) => {
    setIsClosingChatPanel(isClosing);
  }, []);

  const setContentHidden = useCallback((isHidden: boolean) => {
    setIsContentHidden(isHidden);
  }, []);

  const value = useMemo(
    () => ({
      isSettingsPanelOpen,
      isClosingSettingsPanel,
      isChatPanelOpen,
      isClosingChatPanel,
      isContentHidden,
      setSettingsPanelOpen,
      setClosingSettingsPanel,
      setChatPanelOpen,
      setClosingChatPanel,
      setContentHidden,
    }),
    [
      isSettingsPanelOpen,
      isClosingSettingsPanel,
      isChatPanelOpen,
      isClosingChatPanel,
      isContentHidden,
      setSettingsPanelOpen,
      setClosingSettingsPanel,
      setChatPanelOpen,
      setClosingChatPanel,
      setContentHidden,
    ]
  );

  return (
    <SettingsPanelContext.Provider value={value}>
      {children}
    </SettingsPanelContext.Provider>
  );
};

export const useSettingsPanel = () => {
  const context = useContext(SettingsPanelContext);
  if (context === undefined) {
    throw new Error(
      'useSettingsPanel must be used within a SettingsPanelProvider'
    );
  }
  return context;
};
