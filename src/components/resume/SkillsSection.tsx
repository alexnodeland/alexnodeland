import React from 'react'
import { ResumeData } from '../../types'

interface SkillsSectionProps {
  skills: ResumeData['skills']
  className?: string
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ skills, className = '' }) => {
  return (
    <section className={`skills-section ${className}`}>
      <h2>Skills</h2>
      <div className="skills-grid">
        <div className="skill-category">
          <h3>Technical Skills</h3>
          <div className="skill-tags">
            {skills.technical.map((skill, index) => (
              <span key={index} className="skill-tag technical">{skill}</span>
            ))}
          </div>
        </div>
        
        <div className="skill-category">
          <h3>Soft Skills</h3>
          <div className="skill-tags">
            {skills.soft.map((skill, index) => (
              <span key={index} className="skill-tag soft">{skill}</span>
            ))}
          </div>
        </div>
        
        {skills.languages && skills.languages.length > 0 && (
          <div className="skill-category">
            <h3>Languages</h3>
            <div className="skill-tags">
              {skills.languages.map((language, index) => (
                <span key={index} className="skill-tag language">{language}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default SkillsSection
