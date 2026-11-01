import React from 'react';
import ControlRow from '../components/ui/ControlRow';
import Dropdown from '../components/ui/Dropdown';
import SearchToggle from '../components/ui/SearchToggle';
import SEO from '../components/seo';
import { DropdownOption } from '../components/ui/Dropdown';
import { ProjectCard } from '../components/projects/ProjectCard';
import {
  ALL,
  ProjectSort,
  SORT_OPTIONS,
  matchesSearch,
  sortProjects,
} from '../components/projects/catalogue';
import useHashScroll from '../components/projects/useHashScroll';
import { appsConfig, appsGraph, projectsInTier } from '../config';
import type { AppPlatform } from '../config';
// The cards, the grid and the control row are the projects page's own; the
// two pages are the same kind of list, and this one only adds the notes
// under its section titles.
import '../styles/projects.scss';

const APPS = projectsInTier('app');

// Only the platforms something is on, for the same reason the projects page
// only offers the categories it has.
const PLATFORMS = appsConfig.platforms.filter(platform =>
  APPS.some(app => app.platform === platform.id)
);

/**
 * The small tools: things used every day rather than things to show, so the
 * page is grouped by where each one runs — the question someone about to
 * install one asks first — and every card that has an install line shows it.
 */
const AppsPage: React.FC<{ location?: { pathname?: string } }> = ({
  location,
}) => {
  const [platform, setPlatform] = React.useState<AppPlatform | null>(null);
  const [sort, setSort] = React.useState<ProjectSort>('curated');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useHashScroll();

  const search = searchTerm.trim().toLowerCase();

  const sections = React.useMemo(
    () =>
      PLATFORMS.filter(section => platform === null || section.id === platform)
        .map(section => ({
          ...section,
          apps: sortProjects(
            APPS.filter(
              app => app.platform === section.id && matchesSearch(app, search)
            ),
            sort
          ),
        }))
        .filter(section => section.apps.length > 0),
    [platform, search, sort]
  );

  const platformOptions: DropdownOption[] = React.useMemo(
    () => [
      { value: ALL, label: 'all' },
      ...PLATFORMS.map(section => ({
        value: section.id,
        label: section.title,
      })),
    ],
    []
  );

  const platformLabel =
    platformOptions.find(option => option.value === (platform ?? ALL))?.label ??
    'all';

  const sortLabel =
    SORT_OPTIONS.find(option => option.value === sort)?.label ?? 'curated';

  return (
    <>
      <SEO
        title="apps"
        description="small open source apps and tools by alex nodeland: mac apps, command-line tools, plugins, and hardware"
        pathname={location?.pathname}
        jsonLd={appsGraph()}
      />
      <div className="projects-page apps-page">
        <ControlRow className="projects-control-bar">
          <Dropdown
            ariaLabel="Filter apps by platform"
            triggerLabel={platformLabel}
            options={platformOptions}
            value={platform ?? ALL}
            onSelect={value =>
              setPlatform(value === ALL ? null : (value as AppPlatform))
            }
            className="projects-category-dropdown"
          />

          <Dropdown
            ariaLabel="Sort apps"
            triggerLabel={sortLabel}
            options={SORT_OPTIONS}
            value={sort}
            onSelect={value => setSort(value as ProjectSort)}
            className="projects-sort-dropdown"
          />

          <SearchToggle
            open={searchOpen}
            onToggle={() => setSearchOpen(open => !open)}
            controls="apps-search"
          />
        </ControlRow>

        <div
          id="apps-search"
          className={`ui-search-panel projects-search-panel${
            searchOpen ? ' is-open' : ''
          }`}
        >
          <input
            ref={searchInputRef}
            type="text"
            placeholder="search apps..."
            aria-label="Search apps"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {sections.length === 0 ? (
          <p className="projects-empty">
            no apps match &quot;{searchTerm.trim()}&quot;.
          </p>
        ) : (
          sections.map(section => (
            <section
              key={section.id}
              id={section.id}
              className="projects-section"
            >
              <h2 className="section-title">{section.title}</h2>
              {section.note && (
                <p className="projects-section-note">
                  {section.note.before}
                  {section.note.link && (
                    <>
                      {' '}
                      <a
                        href={section.note.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {section.note.link.label}
                      </a>
                    </>
                  )}
                  {section.note.after}
                </p>
              )}
              <div className="projects-grid">
                {section.apps.map(app => (
                  <ProjectCard key={app.name} project={app} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
};

export default AppsPage;
