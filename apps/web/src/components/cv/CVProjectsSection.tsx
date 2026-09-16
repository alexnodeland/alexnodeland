import React from 'react';
import { ProjectItem } from '../../config/cv';
import { GitHubIcon, LinkIcon } from '../ui/EntryIcons';

interface CVProjectsSectionProps {
  projects: ProjectItem[];
  className?: string;
}

/**
 * The projects a CV variant names, in the certification cards' grammar.
 *
 * A project carries about as much as a certification does — a name, a line
 * saying what it is, and two small facts — so it takes the same card: the
 * name, the description under it, and one meta band at the foot with the
 * language at one end and the projects page's own link marks at the other —
 * the whole card clicking through to the site, or to the repo where there is
 * no site. The descriptions come from
 * `src/config/projects.ts`, the same text the projects page shows.
 *
 * Every class is `cv-`-prefixed: the projects page already owns
 * `.project-card`, `.project-name` and `.projects-grid`, and Gatsby ships all
 * of the site's CSS as one stylesheet, so a shared name would pull that page's
 * card styles in here.
 */
const CVProjectsSection: React.FC<CVProjectsSectionProps> = ({
  projects,
  className,
}) => (
  <section className={`cv-projects-section${className ? ` ${className}` : ''}`}>
    <h2 className="cv-section-title">Projects</h2>
    <div className="cv-projects-grid">
      {projects.map(project => (
        <article key={project.name} className="cv-card cv-project-card">
          <div className="cv-project-header">
            <h3 className="cv-project-name">{project.name}</h3>
          </div>
          <p className="cv-project-description">{project.description}</p>
          <div className="cv-project-meta">
            <span className="cv-project-stack">
              {project.technologies.join(', ')}
            </span>
            {/* The projects page's ways out, and its click: the chain to the
                project's own site where there is one, then the octocat.
                Whichever the card follows (the site if there is one, the
                repo if not) stretches across the whole card, and the other
                stays a mark you hit directly. */}
            <span className="project-link-indicator">
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-out project-out-site is-card-link"
                >
                  <LinkIcon />
                  <span className="sr-only">{`visit the ${project.name} site`}</span>
                </a>
              )}
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`project-out project-out-repo ${
                    project.url ? 'is-raised' : 'is-card-link'
                  }`}
                >
                  <GitHubIcon />
                  <span className="sr-only">{`view ${project.name} on github`}</span>
                </a>
              )}
            </span>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default CVProjectsSection;
