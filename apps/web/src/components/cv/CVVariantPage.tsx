import React from 'react';
import { CVData, CVVariant, cvPdfPath } from '../../config/cv';
import SEO from '../seo';
import EducationSection from './CVEducationSection';
import ExperienceSection from './CVExperienceSection';
import SkillsSection from './CVSkillsSection';
import '../../styles/cv.scss';

interface CVVariantPageProps {
  variant: CVVariant;
  data: CVData;
  /** Shown as the page heading and in the tab title. */
  label: string;
  location?: { pathname?: string };
}

/**
 * A role-specific resume on a page of its own.
 *
 * These are not linked from the nav or from /cv/: they exist so a single
 * address can be pasted into an application beside the PDF, for a reader who
 * would rather scroll than download. `noindex` keeps them out of search, which
 * is the difference between unlisted and published — the PDF is the artifact
 * that matters, and this is the courtesy copy of it.
 */
const CVVariantPage: React.FC<CVVariantPageProps> = ({
  variant,
  data,
  label,
  location,
}) => {
  const { personal } = data;

  return (
    <>
      <SEO
        title={label.toLowerCase()}
        description={`${personal.name} — ${label}`}
        pathname={location?.pathname}
        noindex
      />
      <div className="cv cv-variant">
        <header className="cv-variant-header">
          <h1>{personal.name}</h1>
          <p className="cv-variant-label">{label}</p>
          <p className="cv-variant-contact">
            {personal.location}
            {' · '}
            <a href={`mailto:${personal.email}`}>{personal.email}</a>
            {' · '}
            <a href={`https://${personal.website}`}>{personal.website}</a>
          </p>
          <a className="cv-variant-download" href={cvPdfPath(variant)} download>
            download pdf
          </a>
        </header>

        <section className="overview-section">
          <h2 className="cv-section-title">Summary</h2>
          <p>{personal.summary}</p>
        </section>

        <ExperienceSection experiences={data.experience} />

        {data.projects && data.projects.length > 0 && (
          <section className="projects-section">
            <h2 className="cv-section-title">Projects</h2>
            <ul className="cv-variant-projects">
              {data.projects.map(project => (
                <li key={project.name}>
                  <strong>{project.name}</strong> — {project.description}{' '}
                  {project.github && (
                    <a href={project.github}>
                      {project.github.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <EducationSection education={data.education} />
        <SkillsSection skills={data.skills} />
      </div>
    </>
  );
};

export default CVVariantPage;
