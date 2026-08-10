import React from 'react';
import { BackgroundProvider } from './src/components/BackgroundProvider';
import { SettingsPanelProvider } from './src/components/SettingsPanelContext';
import { BackgroundManager } from './src/components/animated-backgrounds';
import { ChatProvider } from './src/components/chat';
import Layout from './src/components/layout';

// Mirrors gatsby-browser: the shell wraps the page instead of the page
// rendering it, so the markup Gatsby ships for a cold load is the same tree
// the browser then keeps across navigations and hydration has nothing to
// reconcile.
export const wrapPageElement = ({
  element,
  props,
}: {
  element: React.ReactNode;
  props: { location?: { pathname?: string } };
}) => <Layout location={props.location}>{element}</Layout>;

export const wrapRootElement = ({ element }: { element: React.ReactNode }) => {
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
