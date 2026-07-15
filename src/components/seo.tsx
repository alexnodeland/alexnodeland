import { withPrefix } from 'gatsby';
import React from 'react';
import { Helmet } from 'react-helmet';
import { siteConfig } from '../config';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

const SEO: React.FC<SEOProps> = ({
  title = siteConfig.seo.defaultTitle,
  description = siteConfig.seo.defaultDescription,
  image = siteConfig.seo.defaultImage,
  url = siteConfig.siteUrl,
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

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="icon" href={iconHref} />
      <link rel="apple-touch-icon" href={iconHref} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
    </Helmet>
  );
};

export default SEO;
