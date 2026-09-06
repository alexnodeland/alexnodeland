import React from 'react';
import ActivityPanel from '../components/ui/ActivityPanel';
import Dropdown from '../components/ui/Dropdown';
import { GitHubIcon } from '../components/ui/EntryIcons';
import SearchToggle from '../components/ui/SearchToggle';
import SEO from '../components/seo';
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
        {/* The name, the body, the tags, and one meta band at the foot —
            the blog preview's grammar. */}
        <div className="project-header">
          <h3 className="project-name">{project.name}</h3>
        </div>

        <p className="project-description">{project.description}</p>

        {/* The tags as one quiet line, the way a cv card lists its key
            skills — not a row of chips. */}
        {project.tags.length > 0 && (
          <p className="project-tags">{project.tags.join(' • ')}</p>
        )}

        {/* The language and the stars at one end, the way out at the other:
            the octocat, in the link colour, since the whole card is a link
            to the repo and this is the one thing on it that says so. */}
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
          <span className="project-link-indicator">
            <GitHubIcon />
            <span className="sr-only">view on github</span>
          </span>
        </div>
      </div>
    </a>
  );
};

// `location` is what Gatsby hands every page; optional here so the page can
// still be rendered bare (tests do).
const ProjectsPage: React.FC<{ location?: { pathname?: string } }> = ({
  location,
}) => {
  const [category, setCategory] = React.useState<ProjectCategory | null>(null);
  const [sort, setSort] = React.useState<ProjectSort>('curated');
  const [searchTerm, setSearchTerm] = React.useState('');
  // Phone only: whether the search panel is folded out. Desktop ignores it.
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

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

  return (
    <>
      <SEO
        title="projects"
        description="open source projects, experiments, and tools by alex nodeland"
        pathname={location?.pathname}
      />
      <div className="projects-page">
        {/* The two pickers, left, and the way to the search box at the far
            end: the one row every list page carries (see the cv and the
            blog). Each picker resets itself through its own "all" or default
            option, so there is no separate reset. */}
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

          <SearchToggle
            open={searchOpen}
            onToggle={() => setSearchOpen(open => !open)}
            controls="projects-search"
          />
        </div>

        {/* Somewhere to type rather than a piece of chrome, so it keeps its
            own panel below the row. On a phone the panel is folded away
            behind the chip above until asked for. */}
        <div
          id="projects-search"
          className={`ui-search-panel projects-search-panel${
            searchOpen ? ' is-open' : ''
          }`}
        >
          <input
            ref={searchInputRef}
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

        {/* The year of github work, after the catalogue it produced, with
            the link out to the rest of github in its foot. It closes the
            page rather than opening it so the control row and the list sit
            where they sit on the blog and the cv — the first thing inside
            the window on all three. */}
        <ActivityPanel />
      </div>
    </>
  );
};

export default ProjectsPage;
