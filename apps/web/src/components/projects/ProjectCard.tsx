import { Link } from 'gatsby';
import React from 'react';
import { getLanguageColor, postPath } from '../../config';
import type { GitHubProject } from '../../config';
import { ArrowOutIcon, GitHubIcon, LinkIcon } from '../ui/EntryIcons';

/**
 * The ways out of a project, at the far end of its meta band: the arrow into
 * the post about it where there is one, the chain to its own site where there
 * is one, then the octocat. The octocat stays at the corner whatever else is
 * there, so the repo mark is always in the same place.
 *
 * Whichever the project as a whole follows — the site if it has one, the
 * repo if it does not — stretches across the box it sits in; the others are
 * lifted clear of that overlay so they are still hit directly. The post never
 * stretches: a project is the thing, and the post is about the thing.
 */
export const ProjectWaysOut: React.FC<{ project: GitHubProject }> = ({
  project,
}) => (
  <div className="project-link-indicator">
    {project.post && (
      <Link
        to={postPath(project.post)}
        className="project-out project-out-post is-raised"
      >
        <ArrowOutIcon />
        <span className="sr-only">{`read the post about ${project.name}`}</span>
      </Link>
    )}
    {project.site && (
      <a
        href={project.site}
        target="_blank"
        rel="noopener noreferrer"
        className="project-out project-out-site is-card-link"
      >
        <LinkIcon />
        <span className="sr-only">{`visit the ${project.name} site`}</span>
      </a>
    )}
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`project-out project-out-repo ${
        project.site ? 'is-raised' : 'is-card-link'
      }`}
    >
      <GitHubIcon />
      <span className="sr-only">{`view ${project.name} on github`}</span>
    </a>
  </div>
);

/** The language's dot and name, then the stars where there are any. */
const ProjectLanguage: React.FC<{ project: GitHubProject }> = ({ project }) => (
  <div className="project-language">
    <span
      className="language-dot"
      style={{ backgroundColor: getLanguageColor(project.language) }}
    />
    <span className="language-name">{project.language}</span>
    {typeof project.stars === 'number' && project.stars > 0 && (
      <span className="project-stars">★ {project.stars}</span>
    )}
  </div>
);

/**
 * A project as a card: the name, the body, the install line where there is
 * one, the tags, and one meta band at the foot — the blog preview's grammar.
 *
 * Not an anchor: a card with a site of its own carries two or three ways out,
 * and a link inside a link is not markup a browser will honour. The card is a
 * plain box, and one of the links at its foot stretches an overlay across the
 * whole of it (see .is-card-link in mixins.scss) — so the whole card is still
 * a single target, and the other marks are real links rather than click
 * handlers wearing a link's clothes.
 */
export const ProjectCard: React.FC<{ project: GitHubProject }> = ({
  project,
}) => (
  <article className="project-card">
    <div className="project-card-content">
      {/* The name and body are grouped: a card in a grid row is as tall as
          the tallest in that row, and this is the block that takes up the
          difference, so the slack lands under the description instead of
          inside it (see .project-card-body). */}
      <div className="project-card-body">
        <div className="project-header">
          <h3 className="project-name">{project.name}</h3>
        </div>

        <p className="project-description">{project.description}</p>
      </div>

      {/* The command, as it is typed. It sits above the card's overlay, so it
          can be selected — one click takes the whole line (user-select: all)
          — rather than following the card's link out. */}
      {project.install && (
        <p className="project-install">
          {project.installLabel && (
            <span className="project-install-label">
              {project.installLabel}
            </span>
          )}
          <code>{project.install}</code>
        </p>
      )}

      {/* The tags as one quiet line, the way a cv card lists its key
          skills — not a row of chips. */}
      {project.tags.length > 0 && (
        <p className="project-tags">{project.tags.join(' • ')}</p>
      )}

      <div className="project-footer">
        <ProjectLanguage project={project} />
        <ProjectWaysOut project={project} />
      </div>
    </div>
  </article>
);

/**
 * The experiments, as one outlined list rather than a grid of cards: a row
 * each, the name and the line about it on the left, the language and the ways
 * out on the right. Each row is one target the way a card is.
 */
export const LabList: React.FC<{ projects: GitHubProject[] }> = ({
  projects,
}) => (
  <ul className="lab-list">
    {projects.map(project => (
      <li key={project.name} className="lab-item">
        <div className="lab-item-text">
          <h3 className="lab-item-name">{project.name}</h3>
          <p className="lab-item-description">{project.description}</p>
        </div>
        <div className="lab-item-meta">
          <ProjectLanguage project={project} />
          <ProjectWaysOut project={project} />
        </div>
      </li>
    ))}
  </ul>
);

/** A timeline post, as much of it as a list row needs. */
export interface WritingEntry {
  slug: string;
  title: string;
  date: string;
  description?: string;
}

/**
 * Posts in place of projects, for a category whose work left no public
 * code: the same outlined list as the experiments, a row per post — its
 * title, the line about it, the year, and the arrow into it, which covers
 * the whole row.
 */
export const WritingList: React.FC<{ posts: WritingEntry[] }> = ({ posts }) => (
  <ul className="lab-list writing-list">
    {posts.map(post => (
      <li key={post.slug} className="lab-item">
        <div className="lab-item-text">
          <h3 className="lab-item-name">{post.title}</h3>
          {post.description && (
            <p className="lab-item-description">{post.description}</p>
          )}
        </div>
        <div className="lab-item-meta">
          <span className="language-name">{post.date.slice(0, 4)}</span>
          <div className="project-link-indicator">
            <Link
              to={postPath(post.slug)}
              className="project-out project-out-post is-card-link"
            >
              <ArrowOutIcon />
              <span className="sr-only">{`read ${post.title}`}</span>
            </Link>
          </div>
        </div>
      </li>
    ))}
  </ul>
);

export default ProjectCard;
