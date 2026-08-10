import React from 'react';
import { Dropdown, SEO } from '../components';
import { DropdownOption } from '../components/ui/Dropdown';
import { projectsConfig, getLanguageColor } from '../config';
import type { GitHubProject, ProjectCategory } from '../config';
import '../styles/projects.scss';

// The category filter's "no filter" option. The rest of the page keys off a
// real ProjectCategory, so this is the stand-in the dropdown needs.
const ALL_CATEGORIES = '__all__';

type ProjectSort = 'curated' | 'stars' | 'name';

// Curated is the config's own order — hand-ranked within each section — so it
// is the default, and it is named rather than left implicit.
const SORT_OPTIONS: DropdownOption[] = [
  { value: 'curated', label: 'curated' },
  { value: 'stars', label: 'most starred' },
  { value: 'name', label: 'name a–z' },
];

const sortProjects = (
  projects: GitHubProject[],
  sort: ProjectSort
): GitHubProject[] => {
  if (sort === 'curated') return projects;
  const sorted = [...projects];
  if (sort === 'stars') {
    // Unstarred repos are worth 0 rather than worth nothing, so they sort to
    // the bottom instead of dropping out of the comparison.
    sorted.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
};

const matchesSearch = (project: GitHubProject, term: string): boolean => {
  if (!term) return true;
  const haystack =
    `${project.name} ${project.description} ${project.tags.join(' ')}`.toLowerCase();
  return haystack.includes(term);
};

const ProjectCard: React.FC<{ project: GitHubProject }> = ({ project }) => {
  const languageColor = getLanguageColor(project.language);

  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className="project-card"
    >
      <div className="project-card-content">
        <div className="project-header">
          <div className="project-icon">
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
            </svg>
          </div>
          <h3 className="project-name">{project.name}</h3>
        </div>

        <p className="project-description">{project.description}</p>

        <div className="project-tags">
          {project.tags.map(tag => (
            <span key={tag} className="project-tag">
              {tag}
            </span>
          ))}
        </div>

        <div className="project-footer">
          <div className="project-language">
            <span
              className="language-dot"
              style={{ backgroundColor: languageColor }}
            />
            <span className="language-name">{project.language}</span>
            {typeof project.stars === 'number' && project.stars > 0 && (
              <span className="project-stars">★ {project.stars}</span>
            )}
          </div>
          <div className="project-link-indicator">
            <span>view on github</span>
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-2.19l5.22 5.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L4 4.81v2.19a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 3.25 2.75Zm6.5-1h4.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0V3.56l-5.22 5.22a.749.749 0 0 1-1.06-1.06L12.69 2.5h-2.44a.75.75 0 0 1 0-1.5Z" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
};

const ProjectsPage: React.FC = () => {
  const [category, setCategory] = React.useState<ProjectCategory | null>(null);
  const [sort, setSort] = React.useState<ProjectSort>('curated');
  const [searchTerm, setSearchTerm] = React.useState('');

  // The page scrolls inside the fixed window (.layout), not the document, so
  // the browser's own fragment navigation has nothing to scroll. Resolve the
  // hash to its section and scroll the container ourselves.
  //
  // The wait is long enough for the shell's navigation transition to settle
  // (the hero peels, then the region eases to its new height, and the window
  // resizes with it). Scrolling into a frame that is still growing lands in
  // the wrong place, and the hero collapse would fight the reset; once the
  // shell is still, the smooth scroll drives the collapse normally.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const scrollToHash = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const timer = window.setTimeout(scrollToHash, 420);
    window.addEventListener('hashchange', scrollToHash);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, []);

  const search = searchTerm.trim().toLowerCase();

  // Sections keep their ids and their order whatever the controls say — the
  // hero subtitle deep-links at them, so filtering renders fewer sections
  // rather than renumbering the ones that survive.
  const categorySections = React.useMemo(
    () =>
      projectsConfig.categories
        .filter(section => category === null || section.id === category)
        .map(section => ({
          ...section,
          projects: sortProjects(
            projectsConfig.projects.filter(
              project =>
                project.category === section.id &&
                matchesSearch(project, search)
            ),
            sort
          ),
        }))
        // A section with nothing left in it is a heading over a gap, so it goes.
        .filter(section => section.projects.length > 0),
    [category, search, sort]
  );

  const categoryOptions: DropdownOption[] = React.useMemo(
    () => [
      { value: ALL_CATEGORIES, label: 'all' },
      ...projectsConfig.categories.map(section => ({
        value: section.id,
        label: section.title,
      })),
    ],
    []
  );

  const categoryLabel =
    categoryOptions.find(
      option => option.value === (category ?? ALL_CATEGORIES)
    )?.label ?? 'all';

  const sortLabel =
    SORT_OPTIONS.find(option => option.value === sort)?.label ?? 'curated';

  const hasFilters =
    category !== null || sort !== 'curated' || searchTerm !== '';

  const clearFilters = () => {
    setCategory(null);
    setSort('curated');
    setSearchTerm('');
  };

  return (
    <>
      <SEO
        title="projects"
        description="open source projects, experiments, and tools by alex nodeland"
      />
      <div className="projects-page">
        {/* The two pickers and the reset, loose chips sticky to the top of
            the window's scroll — the same row the cv and the blog carry. */}
        <div className="projects-control-bar">
          <Dropdown
            ariaLabel="Filter projects by category"
            triggerLabel={categoryLabel}
            options={categoryOptions}
            value={category ?? ALL_CATEGORIES}
            onSelect={value =>
              setCategory(
                value === ALL_CATEGORIES ? null : (value as ProjectCategory)
              )
            }
            className="projects-category-dropdown"
          />

          <Dropdown
            ariaLabel="Sort projects"
            triggerLabel={sortLabel}
            options={SORT_OPTIONS}
            value={sort}
            onSelect={value => setSort(value as ProjectSort)}
            className="projects-sort-dropdown"
          />

          <button
            type="button"
            className="ui-chip-button projects-clear-chip"
            onClick={clearFilters}
            disabled={!hasFilters}
          >
            clear filters
          </button>
        </div>

        {/* Somewhere to type rather than a piece of chrome, so it keeps its
            own panel below the row. */}
        <div className="ui-search-panel projects-search-panel">
          <input
            type="text"
            placeholder="search projects..."
            aria-label="Search projects"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {categorySections.length === 0 ? (
          <p className="projects-empty">
            no projects match &quot;{searchTerm.trim()}&quot;.
          </p>
        ) : (
          categorySections.map(section => (
            <section
              key={section.id}
              id={section.id}
              className="projects-section"
            >
              <h2 className="section-title">{section.title}</h2>
              <div className="projects-grid">
                {section.projects.map(project => (
                  <ProjectCard key={project.name} project={project} />
                ))}
              </div>
            </section>
          ))
        )}

        <div className="github-cta">
          <p>want to see more?</p>
          <a
            href="https://github.com/alexnodeland"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <svg
              viewBox="0 0 16 16"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            <span>view all repositories on github</span>
          </a>
        </div>
      </div>
    </>
  );
};

export default ProjectsPage;
