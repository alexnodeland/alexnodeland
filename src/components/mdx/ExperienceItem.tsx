import React from 'react'

interface ExperienceItemProps {
  title: string
  company: string
  duration: string
  children: React.ReactNode
}

const ExperienceItem: React.FC<ExperienceItemProps> = ({ title, company, duration, children }) => {
  return (
    <div className="experience-item">
      <div className="experience-header">
        <h3>{title}, {company}</h3>
        <span className="experience-duration">{duration}</span>
      </div>
      <ul className="experience-bullets">
        {children}
      </ul>
    </div>
  )
}

export default ExperienceItem
