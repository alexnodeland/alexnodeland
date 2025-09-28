import React from 'react';
import { EducationItem } from '../../types';

interface CVEducationSectionProps {
  education: EducationItem[];
}

const CVEducationSection: React.FC<CVEducationSectionProps> = ({
  education,
}) => {
  return (
    <>
      <h2 className="cv-section-title">Education</h2>
      {education.map((edu, index) => (
        <details key={index} className="cv-card cv-collapse">
          <summary className="cv-collapse-summary">
            <div className="education-header">
              <h3>{edu.degree}</h3>
              <div className="summary-right">
                <span className="education-duration">{edu.duration}</span>
                <span className="cv-collapse-chevron" aria-hidden>
                  ▾
                </span>
              </div>
            </div>
            <div className="education-institution education-institution-collapsed">
              {edu.institution}
            </div>
            {edu.relevantCoursework && edu.relevantCoursework.length > 0 && (
              <div className="cv-summary-skills">
                <span className="cv-summary-label">coursework:</span>
                <span className="cv-summary-list">
                  {edu.relevantCoursework.join(' • ')}
                </span>
              </div>
            )}
          </summary>

          <div className="cv-collapse-details">
            <div className="education-location">{edu.location}</div>
            {edu.gpa && <div className="education-gpa">GPA: {edu.gpa}</div>}
            {edu.description && (
              <p className="education-description">{edu.description}</p>
            )}
            {edu.achievements && edu.achievements.length > 0 && (
              <ul className="education-achievements">
                {edu.achievements.map((achievement, idx) => (
                  <li key={idx}>{achievement}</li>
                ))}
              </ul>
            )}
          </div>
        </details>
      ))}
    </>
  );
};

export default CVEducationSection;
