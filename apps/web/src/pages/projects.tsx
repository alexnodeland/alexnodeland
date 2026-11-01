import React from 'react';
import ActivityPanel from '../components/ui/ActivityPanel';
import ControlRow from '../components/ui/ControlRow';
import Dropdown from '../components/ui/Dropdown';
import SearchToggle from '../components/ui/SearchToggle';
import SEO from '../components/seo';
import { DropdownOption } from '../components/ui/Dropdown';
import { LabList, ProjectCard } from '../components/projects/ProjectCard';
import {
  ALL,
  ProjectSort,
  SORT_OPTIONS,
  matchesSearch,
  sortProjects,
} from '../components/projects/catalogue';
import useHashScroll from '../components/projects/useHashScroll';
import { projectsConfig, projectsGraph, projectsInTier } from '../config';
import type { ProjectCategory } from '../config';
import '../styles/projects.scss';

// The flagship work, in sections by category, then the experiments as one
// short list. The small tools are on /apps.
const FLAGSHIP = projectsInTier('flagship');
const LAB = projectsInTier('lab');

// Only the categories something on this page is about. The picker offering a
// category with nothing in it would be a way to empty the page on purpose.
const CATEGORIES = projectsConfig.categories.filter(category =>
  [...FLAGSHIP, ...LAB].some(project => project.category === category.id)
);

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

  useHashScroll();

  const search = searchTerm.trim().toLowerCase();

  const shown = React.useCallback(
    (project: { category: ProjectCategory }) =>
      category === null || project.category === category,
    [category]
  );

  // Sections keep their ids and their order whatever the controls say — the
  // hero subtitle deep-links at them, so filtering renders fewer sections
  // rather than renumbering the ones that survive.
  const categorySections = React.useMemo(
    () =>
      CATEGORIES.filter(section => category === null || section.id === category)
        .map(section => ({
          ...section,
          projects: sortProjects(
            FLAGSHIP.filter(
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

  // The experiments answer the same controls as the cards above them, so a
  // category or a search narrows the whole page, not only its top half.
  const lab = React.useMemo(
    () =>
      sortProjects(
        LAB.filter(project => shown(project) && matchesSearch(project, search)),
        sort
      ),
    [shown, search, sort]
  );

  const categoryOptions: DropdownOption[] = React.useMemo(
    () => [
      { value: ALL, label: 'all' },
      ...CATEGORIES.map(section => ({
        value: section.id,
        label: section.title,
      })),
    ],
    []
  );

  const categoryLabel =
    categoryOptions.find(option => option.value === (category ?? ALL))?.label ??
    'all';

  const sortLabel =
    SORT_OPTIONS.find(option => option.value === sort)?.label ?? 'curated';

  const nothing = categorySections.length === 0 && lab.length === 0;

  return (
    <>
      <SEO
        title="projects"
        description="open source libraries, systems, and experiments by alex nodeland"
        pathname={location?.pathname}
        jsonLd={projectsGraph()}
      />
      <div className="projects-page">
        {/* The two pickers, left, and the way to the search box at the far
            end: the one row every list page carries (see the cv and the
            blog). Each picker resets itself through its own "all" or default
            option, so there is no separate reset. */}
        <ControlRow className="projects-control-bar">
          <Dropdown
            ariaLabel="Filter projects by category"
            triggerLabel={categoryLabel}
            options={categoryOptions}
            value={category ?? ALL}
            onSelect={value =>
              setCategory(value === ALL ? null : (value as ProjectCategory))
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
        </ControlRow>

        {/* Somewhere to type rather than a piece of chrome, so it keeps its
            own panel below the row, folded away behind the chip above until
            it is asked for. */}
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

        {nothing ? (
          <p className="projects-empty">
            no projects match &quot;{searchTerm.trim()}&quot;.
          </p>
        ) : (
          <>
            {categorySections.map(section => (
              <section
                key={section.id}
                id={section.id}
                className="projects-section"
              >
                <h2 className="section-title">{section.title}</h2>
                <div className="projects-grid projects-grid--flagship">
                  {section.projects.map(project => (
                    <ProjectCard key={project.name} project={project} />
                  ))}
                </div>
              </section>
            ))}

            {lab.length > 0 && (
              <section
                id={projectsConfig.lab.id}
                className="projects-section projects-lab"
              >
                <h2 className="section-title">{projectsConfig.lab.title}</h2>
                <p className="projects-section-note">
                  {projectsConfig.lab.description}
                </p>
                <LabList projects={lab} />
              </section>
            )}
          </>
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
