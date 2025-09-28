import React from 'react';
import { CVData } from '../../types';

interface CVSkillsSectionProps {
  skills: CVData['skills'];
  className?: string;
}

const CVSkillsSection: React.FC<CVSkillsSectionProps> = ({
  skills,
  className,
}) => {
  return (
    <section className={`skills-section${className ? ` ${className}` : ''}`}>
      <h2 className="cv-section-title">Skills</h2>

      <div className="skill-category-direct">
        <h3 className="skill-subtitle">Technical Skills</h3>
        <div className="skill-tags">
          {skills.technical.map((skill, index) => (
            <span key={index} className="skill-tag technical">
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="skill-category-direct">
        <h3 className="skill-subtitle">Soft Skills</h3>
        <div className="skill-tags">
          {skills.soft.map((skill, index) => (
            <span key={index} className="skill-tag soft">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {skills.languages && skills.languages.length > 0 && (
        <div className="skill-category-direct">
          <h3 className="skill-subtitle">Languages</h3>
          <div className="skill-tags">
            {skills.languages.map((language, index) => (
              <span key={index} className="skill-tag language">
                {language}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default CVSkillsSection;
