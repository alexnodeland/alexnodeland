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
  // Initialize states with values from localStorage if available
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('settings-panel-open');
        return saved !== null ? saved === 'true' : false;
      } catch (error) {
        console.warn(
          'Failed to load settings panel state from localStorage:',
          error
        );
        return false;
      }
    }
    return false;
  });

  const [isClosingSettingsPanel, setIsClosingSettingsPanel] = useState(false);

  const [isChatPanelOpen, setIsChatPanelOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('chat-panel-open');
        return saved !== null ? saved === 'true' : false;
      } catch (error) {
        console.warn(
          'Failed to load chat panel state from localStorage:',
          error
        );
        return false;
      }
    }
    return false;
  });

  const [isClosingChatPanel, setIsClosingChatPanel] = useState(false);
  const [isContentHidden, setIsContentHidden] = useState(false);

  // Persist settings panel state to localStorage
  useEffect(() => {
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
  }, [isSettingsPanelOpen]);

  // Persist chat panel state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('chat-panel-open', isChatPanelOpen.toString());
      } catch (error) {
        console.warn('Failed to save chat panel state to localStorage:', error);
      }
    }
  }, [isChatPanelOpen]);

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
