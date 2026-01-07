import React from 'react';
import type { Project, ProjectLinkType } from '../../config/projects';
import { categoryConfig, statusConfig } from '../../config/projects';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  featured?: boolean;
}

// Link type icons
const linkIcons: Record<ProjectLinkType, React.ReactNode> = {
  github: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  ),
  docs: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z" />
    </svg>
  ),
  blog: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z" />
    </svg>
  ),
  demo: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z" />
    </svg>
  ),
  paper: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75ZM5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574V2.75a2.25 2.25 0 0 0-2.25-2.25Zm3.247 9.572a3.75 3.75 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25l-.005 7.322Z" />
    </svg>
  ),
  npm: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M0 0v16h16V0H0zm13 13H8v-2H5v2H3V3h10v10zm-5-7H5v5h3V6zm5 0h-3v5h1V7h1v4h1V6z" />
    </svg>
  ),
  crates: (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M8 0L0 4v8l8 4 8-4V4L8 0zm6.5 4.5L8 8 1.5 4.5 8 1l6.5 3.5zM1 5.5l6.5 3.25V15L1 11.5V5.5zm7.5 9.5V8.75L15 5.5v6l-6.5 3.5z" />
    </svg>
  ),
};

const linkLabels: Record<ProjectLinkType, string> = {
  github: 'GitHub',
  docs: 'Docs',
  blog: 'Blog',
  demo: 'Demo',
  paper: 'Paper',
  npm: 'npm',
  crates: 'crates.io',
};

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onClick,
  featured = false,
}) => {
  const categoryStyle = categoryConfig[project.category];
  const statusStyle = statusConfig[project.status];
  const isArchived = project.status === 'archived';

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <article
      className={`project-card ${featured ? 'featured' : ''} ${isArchived ? 'archived' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="project-card-content">
        {/* Header with badges */}
        <div className="project-card-header">
          <span
            className="category-badge"
            style={{ backgroundColor: categoryStyle.color }}
          >
            {categoryStyle.label}
          </span>
          {project.status !== 'stable' && (
            <span
              className="status-indicator"
              style={{ color: statusStyle.color }}
            >
              <span
                className="status-dot"
                style={{ backgroundColor: statusStyle.color }}
              />
              {statusStyle.label}
            </span>
          )}
        </div>

        {/* Title and tagline */}
        <h3 className="project-name">{project.name}</h3>
        <p className="project-tagline">{project.tagline}</p>

        {/* Fork info */}
        {project.upstream && (
          <p className="fork-info">
            fork of{' '}
            <a
              href={project.upstream.url}
              onClick={e => handleLinkClick(e, project.upstream!.url)}
            >
              {project.upstream.name}
            </a>
            {project.forkReason && <span> — {project.forkReason}</span>}
          </p>
        )}

        {/* Tags */}
        <div className="project-tags">
          {project.tags.slice(0, 4).map(tag => (
            <span key={tag} className="project-tag">
              {tag}
            </span>
          ))}
          {project.tags.length > 4 && (
            <span className="project-tag more">+{project.tags.length - 4}</span>
          )}
        </div>

        {/* Footer with GitHub stats and links */}
        <div className="project-card-footer">
          {project.github && (
            <div className="github-stats">
              {project.github.stars !== undefined && (
                <span className="stat">
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    fill="currentColor"
                  >
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                  </svg>
                  {project.github.stars}
                </span>
              )}
              {project.github.lastCommit && (
                <span className="stat updated">
                  updated {formatRelativeDate(project.github.lastCommit)}
                </span>
              )}
            </div>
          )}

          <div className="project-links">
            {project.links.slice(0, 3).map(link => (
              <button
                key={`${link.type}-${link.url}`}
                className="link-button"
                onClick={e => handleLinkClick(e, link.url)}
                title={link.label || linkLabels[link.type]}
              >
                {linkIcons[link.type]}
                <span className="link-label">
                  {link.label || linkLabels[link.type]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
};

// Helper to format relative dates
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export default ProjectCard;
