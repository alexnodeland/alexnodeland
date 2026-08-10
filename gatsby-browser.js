import './src/styles/global.scss';

import React from 'react';
import { BackgroundProvider } from './src/components/BackgroundProvider';
import { SettingsPanelProvider } from './src/components/SettingsPanelContext';
import { BackgroundManager } from './src/components/animated-backgrounds';
import { ChatProvider } from './src/components/chat';

// Shared-element continuity for the brand. Just before the route changes —
// while the old page's DOM is still on screen — remember where "alex" was
// (the homepage title, or the crumb in a subpage hero). The next page's
// Layout reads this and FLIPs its own brand anchor from that box to its new
// home, so navigating reads as the same word sliding and scaling rather than
// two unrelated pages.
export const onPreRouteUpdate = () => {
  if (typeof window === 'undefined') return;
  // Timestamp of the client-side navigation, so the incoming Layout can tell
  // "arrived by link" (soften the entrance) from a cold load (render plainly).
  window.__navAt = Date.now();
  const el = document.querySelector('[data-brand-anchor]');
  if (!el) return;
  window.__brandAnchorRect = {
    rect: el.getBoundingClientRect(),
    at: Date.now(),
  };
};

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
