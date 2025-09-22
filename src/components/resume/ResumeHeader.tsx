import React from 'react'
import { ResumeData } from '../../config/resume'

interface ResumeHeaderProps {
  personal: ResumeData['personal']
  className?: string
}

const ResumeHeader: React.FC<ResumeHeaderProps> = ({ personal, className = '' }) => {
  return (
    <header className={`resume-header ${className}`}>
      <h1>{personal.name}</h1>
      <h2 className="resume-title">{personal.title}</h2>
      <div className="resume-contact">
        <div className="contact-item">
          <strong>Location:</strong> {personal.location}
        </div>
        <div className="contact-item">
          <strong>Email:</strong> <a href={`mailto:${personal.email}`}>{personal.email}</a>
        </div>
        <div className="contact-item">
          <strong>Website:</strong> <a href={`https://${personal.website}`} target="_blank" rel="noopener noreferrer">{personal.website}</a>
        </div>
        {personal.phone && (
          <div className="contact-item">
            <strong>Phone:</strong> <a href={`tel:${personal.phone}`}>{personal.phone}</a>
          </div>
        )}
      </div>
      <div className="resume-summary">
        <p>{personal.summary}</p>
      </div>
    </header>
  )
}

export default ResumeHeader
