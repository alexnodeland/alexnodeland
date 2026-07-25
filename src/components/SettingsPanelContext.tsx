import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
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
        if (saved !== null) apply(saved === 'true');
      } catch (error) {
        console.warn(`Failed to load ${key} from localStorage:`, error);
      }
    };

    restore('settings-panel-open', setIsSettingsPanelOpen);
    restore('chat-panel-open', setIsChatPanelOpen);
    setHydrated(true);
  }, []);

  // Persist settings panel state to localStorage
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'settings-panel-open',
          isSettingsPanelOpen.toString()
        );
      } catch (error) {
        console.warn(
          'Failed to save settings panel state to localStorage:',
          error
        );
      }
    }
  }, [isSettingsPanelOpen, hydrated]);

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

  const setSettingsPanelOpen = (isOpen: boolean) => {
    setIsSettingsPanelOpen(isOpen);
  };

  const setClosingSettingsPanel = (isClosing: boolean) => {
    setIsClosingSettingsPanel(isClosing);
  };

  const setChatPanelOpen = (isOpen: boolean) => {
    setIsChatPanelOpen(isOpen);
  };

  const setClosingChatPanel = (isClosing: boolean) => {
    setIsClosingChatPanel(isClosing);
  };

  const setContentHidden = (isHidden: boolean) => {
    setIsContentHidden(isHidden);
  };

  return (
    <SettingsPanelContext.Provider
      value={{
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
      }}
    >
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
