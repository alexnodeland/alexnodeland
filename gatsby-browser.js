import './src/styles/global.scss';

import React from 'react';
import { SettingsPanelProvider } from './src/components/SettingsPanelContext';
import { BackgroundManager } from './src/components/animated-backgrounds';

export const wrapRootElement = ({ element }) => {
  return (
    <SettingsPanelProvider>
      <BackgroundManager />
      {element}
    </SettingsPanelProvider>
  );
};
