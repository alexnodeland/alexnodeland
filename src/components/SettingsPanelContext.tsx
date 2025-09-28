import React, { createContext, ReactNode, useContext, useState } from 'react';

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
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isClosingSettingsPanel, setIsClosingSettingsPanel] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [isClosingChatPanel, setIsClosingChatPanel] = useState(false);
  const [isContentHidden, setIsContentHidden] = useState(false);

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
