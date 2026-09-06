import React from 'react';
import { ExperienceItem } from '../../types';
import { BriefcaseIcon, EntryKind } from '../ui/EntryIcons';

interface CVExperienceSectionProps {
  experiences: ExperienceItem[];
  className?: string;
}

// The list used to light whichever entry the scroll had arrived at. That is
// gone: on a page of collapsible cards, the only thing that should mark a card
// is the pointer on it or the fact that it is the one you opened.
const CVExperienceSection: React.FC<CVExperienceSectionProps> = ({
  experiences,
  className,
}) => {
  return (
    <section
      className={`experience-section${className ? ` ${className}` : ''}`}
    >
      <h2 className="cv-section-title">Experience</h2>
      {experiences.map((exp, index) => (
        <details key={index} className="cv-card cv-collapse">
          <summary className="cv-collapse-summary">
            {/* The kind mark in the card's corner, then the title row. */}
            <EntryKind>
              <BriefcaseIcon />
            </EntryKind>
            <div className="experience-header">
              <div className="cv-entry-title">
                <h3>
                  {exp.title}, {exp.company}
                </h3>
              </div>
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
    </section>
  );
};

export default CVExperienceSection;
