import { withPrefix } from 'gatsby';
import React from 'react';
import { Helmet } from 'react-helmet';
import { siteConfig } from '../config';
import { JsonLdNode, jsonLdDocument } from '../config/linked-data';

/** A machine-readable form of the page, offered beside the HTML. */
export interface Alternate {
  href: string;
  type: string;
  title?: string;
  /** `alternate` unless the link is something else — `meta` for a FOAF profile. */
  rel?: string;
}

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
  /**
   * Structured data for the page, emitted as JSON-LD. A list of nodes is
   * wrapped as one `@graph` document (see config/linked-data); an object is
   * emitted as it is, for a document that already carries its context.
   */
  jsonLd?: JsonLdNode[] | Record<string, unknown>;
  /** What kind of page this is to Open Graph and Dublin Core. */
  type?: 'website' | 'article' | 'profile';
  /** When the page's content was published, ISO 8601. Posts have one. */
  published?: string;
  /** What the page is about, for Dublin Core's subject. */
  keywords?: string[];
  /** Other serialisations of the page — Turtle, JSON-LD — for autodiscovery. */
  alternates?: Alternate[];
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

/** The Dublin Core type of a page: Text is the DCMI type for all of them. */
const DC_TYPE = 'Text';

/**
 * A Dublin Core meta with an encoding scheme. `scheme` is the attribute DCMI
 * specifies for it and React's meta typings do not know, so it is spread in.
 */
const dcMeta = (name: string, content: string, scheme?: string) => (
  <meta
    name={name}
    content={content}
    {...(scheme ? ({ scheme } as Record<string, string>) : {})}
  />
);

const SEO: React.FC<SEOProps> = ({
  title = siteConfig.seo.defaultTitle,
  description = siteConfig.seo.defaultDescription,
  image = siteConfig.seo.defaultImage,
  url,
  pathname,
  jsonLd,
  type = 'website',
  published,
  keywords,
  alternates,
  noindex = false,
}) => {
  const fullTitle =
    title === siteConfig.siteName ? title : `${title} | ${siteConfig.siteName}`;

  // No icon links here: gatsby-plugin-manifest owns the favicon and the
  // apple-touch-icons (see gatsby-config), and a second `rel="icon"` from
  // this component used to override its set with the portrait avatar.

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

  const structuredData =
    jsonLd === undefined
      ? undefined
      : Array.isArray(jsonLd)
        ? jsonLdDocument(jsonLd)
        : jsonLd;

  const year = published
    ? published.slice(0, 4)
    : String(new Date().getFullYear());
  const rights = `© ${year} ${siteConfig.author}, all rights reserved`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex ? (
        <meta name="robots" content="noindex" />
      ) : (
        <link rel="canonical" href={pageUrl} />
      )}
      {/* The way to the person behind every page, and the one address the
          microformats authorship algorithm follows to the representative
          h-card in the footer. */}
      <link rel="author" href={`${siteConfig.siteUrl}/`} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteConfig.siteName} />
      <meta property="og:locale" content="en_US" />
      {type === 'article' && published && (
        <meta property="article:published_time" content={published} />
      )}
      {type === 'article' && (
        <meta property="article:author" content={`${siteConfig.siteUrl}/`} />
      )}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />

      {/* Dublin Core, the vocabulary libraries and archives read. The two
          schema links declare the prefixes; every DC.* name below resolves
          against them (DCMI's "Expressing Dublin Core in HTML"). */}
      <link rel="schema.DC" href="http://purl.org/dc/elements/1.1/" />
      <link rel="schema.DCTERMS" href="http://purl.org/dc/terms/" />
      <meta name="DC.title" content={title} />
      <meta name="DC.description" content={description} />
      <meta name="DC.creator" content={siteConfig.author} />
      <meta name="DC.publisher" content={siteConfig.author} />
      {dcMeta('DC.language', 'en', 'DCTERMS.RFC4646')}
      {dcMeta('DC.identifier', pageUrl, 'DCTERMS.URI')}
      {dcMeta('DC.format', 'text/html', 'DCTERMS.IMT')}
      {dcMeta('DC.type', DC_TYPE, 'DCTERMS.DCMIType')}
      <meta name="DC.rights" content={rights} />
      {published && dcMeta('DCTERMS.issued', published, 'DCTERMS.W3CDTF')}
      {keywords && keywords.length > 0 && (
        <meta name="DC.subject" content={keywords.join('; ')} />
      )}
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}

      {alternates?.map(alt => (
        <link
          key={`${alt.rel ?? 'alternate'}:${alt.href}`}
          rel={alt.rel ?? 'alternate'}
          type={alt.type}
          href={alt.href}
          title={alt.title}
        />
      ))}

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
