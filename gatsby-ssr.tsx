import React from 'react';
import { SettingsPanelProvider } from './src/contexts/SettingsPanelContext';
import { BackgroundManager } from './src/components/animated-backgrounds';

export const wrapRootElement = ({ element }: { element: React.ReactNode }) => {
  return (
    <SettingsPanelProvider>
      <BackgroundManager />
      {element}
    </SettingsPanelProvider>
  );
};


