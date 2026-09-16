import React from 'react';
import { LD } from '../config/linked-data';
import { siteConfig } from '../config/site';

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
 * - The Atom and JSON Feed forms of the timeline (gatsby-node writes them at
 *   the end of the build). The RSS link is gatsby-plugin-feed's own, already
 *   in every head.
 */
export const headComponents = (): React.ReactElement[] => [
  <link
    key="atom"
    rel="alternate"
    type="application/atom+xml"
    title={`${siteConfig.siteName} — timeline`}
    href="/atom.xml"
  />,
  <link
    key="jsonfeed"
    rel="alternate"
    type="application/feed+json"
    title={`${siteConfig.siteName} — timeline`}
    href="/feed.json"
  />,
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
