import './src/styles/global.scss';

import React from 'react';
import { BackgroundProvider } from './src/components/BackgroundProvider';
import { SettingsPanelProvider } from './src/components/SettingsPanelContext';
import { BackgroundManager } from './src/components/animated-backgrounds';
import { ChatProvider } from './src/components/chat';
import Layout from './src/components/layout';

// The shell — nav capsule, hero region, window frame, chat — wraps the page
// rather than the page rendering it, so it mounts once and survives every
// client-side navigation. Only `element`, the page itself, swaps. That is what
// stops the chat pill replaying its entry, the window frame blinking, and the
// control rows re-appearing on every link.
export const wrapPageElement = ({ element, props }) => (
  <Layout location={props.location}>{element}</Layout>
);

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
