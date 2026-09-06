import { withPrefix } from 'gatsby';
import React from 'react';
import { Helmet } from 'react-helmet';
import { siteConfig } from '../config';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  /** An explicit page URL. Wins over `pathname` when both are given. */
  url?: string;
  /**
   * The router's pathname, as Gatsby hands it to the page. It becomes the
   * canonical URL and og:url, so every page names itself rather than the
   * site root; a page that passes neither this nor `url` falls back to the
   * root.
   */
  pathname?: string;
  /** Structured data for the page, emitted as JSON-LD. */
  jsonLd?: Record<string, unknown>;
  /**
   * A page that should not be indexed and has no canonical form — the 404,
   * which is served at whatever address was typed.
   */
  noindex?: boolean;
}

// Gatsby builds every page at a trailing-slash path and serves the bare one
// as an alias, so the canonical form is the one with the slash. The root is
// the root.
const canonicalPath = (pathname: string): string => {
  const prefixed = withPrefix(
    pathname.startsWith('/') ? pathname : `/${pathname}`
  );
  const trimmed = prefixed.replace(/\/+$/, '');
  return trimmed === '' ? '/' : `${trimmed}/`;
};

const SEO: React.FC<SEOProps> = ({
  title = siteConfig.seo.defaultTitle,
  description = siteConfig.seo.defaultDescription,
  image = siteConfig.seo.defaultImage,
  url,
  pathname,
  jsonLd,
  noindex = false,
}) => {
  const fullTitle =
    title === siteConfig.siteName ? title : `${title} | ${siteConfig.siteName}`;

  // Icon paths must respect the deploy pathPrefix.
  const iconHref = withPrefix('/images/icon.png');

  // Social crawlers require ABSOLUTE image URLs. Pass through anything already
  // absolute; otherwise resolve against the site URL (with pathPrefix applied).
  const absoluteImage = /^https?:\/\//.test(image)
    ? image
    : `${siteConfig.siteUrl}${withPrefix(image)}`;

  const pageUrl =
    url ??
    (pathname
      ? `${siteConfig.siteUrl}${canonicalPath(pathname)}`
      : siteConfig.siteUrl);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex ? (
        <meta name="robots" content="noindex" />
      ) : (
        <link rel="canonical" href={pageUrl} />
      )}
      <link rel="icon" href={iconHref} />
      <link rel="apple-touch-icon" href={iconHref} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEO;
