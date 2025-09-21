import React from 'react'
import { Helmet } from 'react-helmet'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  url?: string
}

const SEO: React.FC<SEOProps> = ({ 
  title = 'Alex Nodeland', 
  description = 'Experienced engineer and mathematician with a strong background in high-performance computing, AI system design, and startup development.',
  image = '/images/og-image.jpg',
  url = 'https://alexnodeland.com'
}) => {
  const fullTitle = title === 'Alex Nodeland' ? title : `${title} | Alex Nodeland`
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
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
