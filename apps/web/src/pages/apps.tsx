import React from 'react';
import ControlRow from '../components/ui/ControlRow';
import Dropdown from '../components/ui/Dropdown';
import SEO from '../components/seo';
import { DropdownOption } from '../components/ui/Dropdown';
import { ProjectCard } from '../components/projects/ProjectCard';
import useHashScroll from '../components/projects/useHashScroll';
import { appsConfig, appsGraph, projectsInTier } from '../config';
import type { AppPlatform } from '../config';
// The cards, the grid and the control row are the projects page's own; the
// two pages are the same kind of list, and this one only adds the notes
// under its section titles.
import '../styles/projects.scss';

// The picker's "no filter" option, as on the projects page.
const ALL = '__all__';

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

  useHashScroll();

  const sections = React.useMemo(
    () =>
      PLATFORMS.filter(
        section => platform === null || section.id === platform
      ).map(section => ({
        ...section,
        apps: APPS.filter(app => app.platform === section.id),
      })),
    [platform]
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

  return (
    <>
      <SEO
        title="apps"
        description="small open source apps and tools by alex nodeland: mac apps, command-line tools, plugins, and hardware"
        pathname={location?.pathname}
        jsonLd={appsGraph()}
      />
      <div className="projects-page apps-page">
        {/* The platform picker, alone: a dozen cards in curated order need
            no sort and no search. */}
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
        </ControlRow>

        {sections.map(section => (
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
        ))}
      </div>
    </>
  );
};

export default AppsPage;
