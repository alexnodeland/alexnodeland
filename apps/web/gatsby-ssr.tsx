import React from 'react';
import { BackgroundProvider } from './src/components/BackgroundProvider';
import { SettingsPanelProvider } from './src/components/SettingsPanelContext';
import { BackgroundManager } from './src/components/animated-backgrounds';
import { ChatProvider } from './src/components/chat/ChatContext';
import Layout from './src/components/layout';
import { headComponents } from './src/lib/head';

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

// The site-wide head (src/lib/head.tsx) and the document language. Only
// Gatsby's own SSR APIs may be exported from this file, which is why the
// components themselves live elsewhere.
export const onRenderBody = ({
  setHtmlAttributes,
  setHeadComponents,
}: {
  setHtmlAttributes: (attributes: Record<string, string>) => void;
  setHeadComponents: (components: React.ReactElement[]) => void;
}) => {
  setHtmlAttributes({ lang: 'en' });
  setHeadComponents(headComponents());
};
