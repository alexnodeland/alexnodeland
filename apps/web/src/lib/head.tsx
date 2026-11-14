import React from 'react';
import { resolveHero } from '../components/heroes';
import { LD } from '../config/linked-data';
import { siteConfig } from '../config/site';
import latin from '../fonts/jetbrains-mono-latin-400.woff2';
import latinItalic from '../fonts/jetbrains-mono-latin-400-italic.woff2';

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
 *
 * - The cuts of the typeface the page opens with, preloaded: the regular
 *   every page is set in and — where the hero has a tagline, which is set in
 *   it — the italic. A font is otherwise not requested until the stylesheet
 *   has been parsed and the text that needs it laid out, which leaves the
 *   first screen in the fallback face for a beat on every cold load. The
 *   italic is left off a page that opens without it (a post, the 404): a
 *   preload nothing uses is a download in front of the ones that matter.
 *   `crossOrigin` is not optional, same origin or not: fonts are fetched in
 *   CORS mode, and a preload without it is fetched once for nothing and then
 *   again for real. The other cuts (see src/styles/fonts.scss) are left to
 *   load when a page sets something in them.
 */
export const headComponents = (pathname = '/'): React.ReactElement[] => [
  ...[latin, ...(resolveHero(pathname).pinned ? [] : [latinItalic])].map(
    href => (
      <link
        key={`font:${href}`}
        rel="preload"
        as="font"
        type="font/woff2"
        href={href}
        crossOrigin="anonymous"
      />
    )
  ),
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
