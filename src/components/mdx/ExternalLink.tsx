import React from 'react'

interface ExternalLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

const ExternalLink: React.FC<ExternalLinkProps> = ({ href, children, className }) => {
  const isExternal = href.startsWith('http://') || href.startsWith('https://')
  
  if (isExternal) {
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    )
  }
  
  // For internal links, return a regular anchor tag
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

export default ExternalLink
