import React from 'react'
import { Helmet } from 'react-helmet'
import { siteConfig } from '../config/site'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  url?: string
}

const SEO: React.FC<SEOProps> = ({ 
  title = siteConfig.seo.defaultTitle, 
  description = siteConfig.seo.defaultDescription,
  image = siteConfig.seo.defaultImage,
  url = siteConfig.siteUrl
}) => {
  const fullTitle = title === siteConfig.siteName ? title : `${title} | ${siteConfig.siteName}`
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="icon" href="/images/icon.png" />
      <link rel="apple-touch-icon" href="/images/icon.png" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  )
}

export default SEO
