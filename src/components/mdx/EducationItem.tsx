import React from 'react'

interface EducationItemProps {
  degree: string
  institution: string
  duration: string
  skills?: string
  coursework?: string
  children?: React.ReactNode
}

const EducationItem: React.FC<EducationItemProps> = ({ 
  degree, 
  institution, 
  duration, 
  skills, 
  coursework, 
  children 
}) => {
  return (
    <div className="education-item">
      <h3>{degree}</h3>
      <p><strong>{institution} | {duration}</strong></p>
      {skills && <p><strong>Acquired Skills:</strong> {skills}</p>}
      {coursework && <p><strong>Relevant coursework:</strong> {coursework}</p>}
      {children && <ul>{children}</ul>}
    </div>
  )
}

export default EducationItem
