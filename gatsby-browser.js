import './src/styles/global.scss';

import React from 'react';
import { BackgroundProvider } from './src/components/BackgroundProvider';
import { SettingsPanelProvider } from './src/components/SettingsPanelContext';
import { BackgroundManager } from './src/components/animated-backgrounds';
import { ChatProvider } from './src/components/chat';

export const wrapRootElement = ({ element }) => {
  return (
    <SettingsPanelProvider>
      <ChatProvider>
        <BackgroundProvider>
          <BackgroundManager />
          {element}
        </BackgroundProvider>
      </ChatProvider>
    </SettingsPanelProvider>
  );
};
