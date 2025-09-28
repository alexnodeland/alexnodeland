import React from 'react';
import { ExperienceItem } from '../../types';

interface CVExperienceSectionProps {
  experiences: ExperienceItem[];
}

const CVExperienceSection: React.FC<CVExperienceSectionProps> = ({
  experiences,
}) => {
  return (
    <>
      <h2 className="cv-section-title">Experience</h2>
      {experiences.map((exp, index) => (
        <details key={index} className="cv-card cv-collapse">
          <summary className="cv-collapse-summary">
            <div className="experience-header">
              <h3>
                {exp.title}, {exp.company}
              </h3>
              <div className="summary-right">
                <span className="experience-duration">{exp.duration}</span>
                <span className="cv-collapse-chevron" aria-hidden>
                  ▾
                </span>
              </div>
            </div>
            {exp.skills && exp.skills.length > 0 && (
              <div className="cv-summary-skills">
                <span className="cv-summary-label">key skills:</span>
                <span className="cv-summary-list">
                  {exp.skills.join(' • ')}
                </span>
              </div>
            )}
          </summary>

          <div className="cv-collapse-details">
            <div className="experience-location">{exp.location}</div>
            {exp.description && (
              <p className="experience-description">{exp.description}</p>
            )}
            <ul className="experience-achievements">
              {exp.achievements.map((achievement, idx) => (
                <li key={idx}>{achievement}</li>
              ))}
            </ul>
          </div>
        </details>
      ))}
    </>
  );
};

export default CVExperienceSection;
