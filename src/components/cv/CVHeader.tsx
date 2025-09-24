import React from 'react';
import { CVData } from '../../types';

interface CVHeaderProps {
  personal: CVData['personal'];
  className?: string;
}

const CVHeader: React.FC<CVHeaderProps> = ({ personal, className = '' }) => {
  return (
    <header className={`cv-header ${className}`}>
      <h1>{personal.name}</h1>
      <h2 className="cv-title">{personal.title}</h2>
      <div className="cv-contact">
        <div className="contact-item">
          <strong>Location:</strong> {personal.location}
        </div>
        <div className="contact-item">
          <strong>Email:</strong>{' '}
          <a href={`mailto:${personal.email}`}>{personal.email}</a>
        </div>
        <div className="contact-item">
          <strong>Website:</strong>{' '}
          <a
            href={`https://${personal.website}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {personal.website}
          </a>
        </div>
        {personal.phone && (
          <div className="contact-item">
            <strong>Phone:</strong>{' '}
            <a href={`tel:${personal.phone}`}>{personal.phone}</a>
          </div>
        )}
      </div>
      <div className="cv-summary">
        <p>{personal.summary}</p>
      </div>
    </header>
  );
};

export default CVHeader;
