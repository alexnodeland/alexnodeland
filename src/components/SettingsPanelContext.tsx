import React, { createContext, ReactNode, useContext, useState } from 'react';

interface SettingsPanelContextType {
  isSettingsPanelOpen: boolean;
  isClosingSettingsPanel: boolean;
  isContentHidden: boolean;
  setSettingsPanelOpen: (isOpen: boolean) => void;
  setClosingSettingsPanel: (isClosing: boolean) => void;
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
  const [isContentHidden, setIsContentHidden] = useState(false);

  const setSettingsPanelOpen = (isOpen: boolean) => {
    setIsSettingsPanelOpen(isOpen);
  };

  const setClosingSettingsPanel = (isClosing: boolean) => {
    setIsClosingSettingsPanel(isClosing);
  };

  const setContentHidden = (isHidden: boolean) => {
    setIsContentHidden(isHidden);
  };

  return (
    <SettingsPanelContext.Provider
      value={{
        isSettingsPanelOpen,
        isClosingSettingsPanel,
        isContentHidden,
        setSettingsPanelOpen,
        setClosingSettingsPanel,
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
