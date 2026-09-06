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
  // The soft-skills list is gone from both views. Nine unfalsifiable adjectives
  // sat directly under fifteen achievement bullets that had already shown the
  // same thing; the reader learned nothing from the row that the roles above
  // it had not already earned.
  //
  // With it went the "technical skills" subheading. Once the section held one
  // group, the subheading was the section title said twice, a line apart.
  return (
    <section className={`skills-section${className ? ` ${className}` : ''}`}>
      <h2 className="cv-section-title">Skills</h2>

      <div className="skill-category-direct">
        <div className="skill-tags">
          {skills.technical.map((skill, index) => (
            <span key={index} className="skill-tag technical">
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CVSkillsSection;
