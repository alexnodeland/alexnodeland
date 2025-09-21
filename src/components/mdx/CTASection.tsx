import React from 'react'

interface CTASectionProps {
  title: string
  description: string
  primaryButton: {
    text: string
    href: string
  }
  secondaryButton: {
    text: string
    href: string
  }
}

const CTASection: React.FC<CTASectionProps> = ({ 
  title, 
  description, 
  primaryButton, 
  secondaryButton 
}) => {
  return (
    <section className="consulting">
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="cta-buttons">
        <a href={primaryButton.href} className="cta-button primary">
          {primaryButton.text}
        </a>
        <a href={secondaryButton.href} className="cta-button secondary" target="_blank" rel="noopener noreferrer">
          {secondaryButton.text}
        </a>
      </div>
    </section>
  )
}

export default CTASection
