import React from 'react';
import { BackgroundProvider } from './src/components/BackgroundProvider';
import { SettingsPanelProvider } from './src/components/SettingsPanelContext';
import { BackgroundManager } from './src/components/animated-backgrounds';
import { ChatProvider } from './src/components/chat/ChatContext';
import Layout from './src/components/layout';
import { siteConfig } from './src/config/site';
import { LD } from './src/config/linked-data';

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

/**
 * What every page's head says about the site, before the page says anything
 * about itself (that is SEO's job, per page). These do not change from page
 * to page, so they are set once here rather than repeated through Helmet.
 *
 * - `lang`: the document's language, which screen readers and any RDF
 *   consumer reading language-tagged literals both want and which Gatsby's
 *   template does not set.
 * - `rel="me"` to the profiles the footer links: the site claims those
 *   accounts, and they link back — IndieWeb identity, and what RelMeAuth
 *   verifies.
 * - The site's linked data: the FOAF profile for autodiscovery (`rel="meta"`
 *   is the FOAF convention), and the VoID description that says what the
 *   dataset is and where its dumps are.
 *
 * Not the feed: gatsby-plugin-feed already links /rss.xml from every head,
 * which is what a reader's autodiscovery finds.
 */
export const headComponents = (): React.ReactElement[] => [
  ...Object.values(siteConfig.social)
    .filter((url): url is string => Boolean(url))
    .map(url => <link key={`me:${url}`} rel="me" href={url} />),
  <link key="me:email" rel="me" href={`mailto:${siteConfig.contact.email}`} />,
  <link
    key="foaf"
    rel="meta"
    type="text/turtle"
    title="FOAF"
    href={LD.profileTurtle}
  />,
  <link
    key="void"
    rel="describedby"
    type="text/turtle"
    title="VoID"
    href={LD.void}
  />,
];

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
