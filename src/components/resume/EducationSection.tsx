import React from 'react'
import { EducationItem } from '../../config/resume'

interface EducationSectionProps {
  education: EducationItem[]
  className?: string
}

const EducationSection: React.FC<EducationSectionProps> = ({ education, className = '' }) => {
  return (
    <section className={`education-section ${className}`}>
      <h2>Education</h2>
      {education.map((edu, index) => (
        <div key={index} className="education-item">
          <div className="education-header">
            <h3>{edu.degree}</h3>
            <span className="education-duration">{edu.duration}</span>
          </div>
          <div className="education-institution">
            <strong>{edu.institution}</strong>, {edu.location}
          </div>
          {edu.gpa && (
            <div className="education-gpa">GPA: {edu.gpa}</div>
          )}
          {edu.description && (
            <p className="education-description">{edu.description}</p>
          )}
          {edu.relevantCoursework && edu.relevantCoursework.length > 0 && (
            <div className="education-coursework">
              <strong>Relevant Coursework:</strong> {edu.relevantCoursework.join(', ')}
            </div>
          )}
          {edu.achievements && edu.achievements.length > 0 && (
            <ul className="education-achievements">
              {edu.achievements.map((achievement, idx) => (
                <li key={idx}>{achievement}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  )
}

export default EducationSection
