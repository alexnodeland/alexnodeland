import React from 'react';
import { ExperienceItem } from '../../types';

interface CVExperienceSectionProps {
  experiences: ExperienceItem[];
  className?: string;
}

const CVExperienceSection: React.FC<CVExperienceSectionProps> = ({
  experiences,
  className = '',
}) => {
  return (
    <section className={`experience-section ${className}`}>
      <h2>Experience</h2>
      {experiences.map((exp, index) => (
        <div key={index} className="experience-item">
          <div className="experience-header">
            <h3>
              {exp.title}, {exp.company}
            </h3>
            <span className="experience-duration">{exp.duration}</span>
          </div>
          <div className="experience-location">{exp.location}</div>
          {exp.description && (
            <p className="experience-description">{exp.description}</p>
          )}
          <ul className="experience-achievements">
            {exp.achievements.map((achievement, idx) => (
              <li key={idx}>{achievement}</li>
            ))}
          </ul>
          {exp.skills && exp.skills.length > 0 && (
            <div className="experience-skills">
              <strong>Key Skills:</strong> {exp.skills.join(', ')}
            </div>
          )}
        </div>
      ))}
    </section>
  );
};

export default CVExperienceSection;
