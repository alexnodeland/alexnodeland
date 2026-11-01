import { graphql } from 'gatsby';
import React from 'react';
import ActivityPanel from '../components/ui/ActivityPanel';
import ControlRow from '../components/ui/ControlRow';
import Dropdown from '../components/ui/Dropdown';
import SEO from '../components/seo';
import { DropdownOption } from '../components/ui/Dropdown';
import {
  LabList,
  ProjectCard,
  WritingList,
} from '../components/projects/ProjectCard';
import type { WritingEntry } from '../components/projects/ProjectCard';
import useHashScroll from '../components/projects/useHashScroll';
import { projectsConfig, projectsGraph, projectsInTier } from '../config';
import type { ProjectCategory } from '../config';
import '../styles/projects.scss';

// The flagship work, in sections by category, then the experiments as one
// short list. The small tools are on /apps.
const FLAGSHIP = projectsInTier('flagship');
const LAB = projectsInTier('lab');

// The picker's "no filter" option. The rest of the page keys off a real
// ProjectCategory, so this is the stand-in the dropdown needs.
const ALL = '__all__';

// Only the categories something on this page is about — a project, or the
// writing that stands in for one. The picker offering a category with nothing
// in it would be a way to empty the page on purpose.
const CATEGORIES = projectsConfig.categories.filter(
  category =>
    [...FLAGSHIP, ...LAB].some(project => project.category === category.id) ||
    (projectsConfig.writing[category.id]?.posts.length ?? 0) > 0
);

interface PostNode {
  fields: { slug: string };
  frontmatter: { title: string; date: string; description?: string };
}

export interface ProjectsPageProps {
  /** The posts, for the categories whose section is writing; see the query. */
  data?: { allMarkdownRemark: { nodes: PostNode[] } };
  // What Gatsby hands every page; optional so the page can still be rendered
  // bare (tests do).
  location?: { pathname?: string };
}

/**
 * The posts a category's writing names, in the order it names them. A slug
 * with no post behind it is dropped rather than drawn as a dead row; the
 * config test holds every slug to a file in src/content/blog.
 */
const writingFor = (
  category: ProjectCategory,
  nodes: PostNode[]
): WritingEntry[] => {
  const bySlug = new Map(
    nodes.map(node => [node.fields.slug.replace(/^\/+|\/+$/g, ''), node])
  );
  return (projectsConfig.writing[category]?.posts ?? []).flatMap(slug => {
    const node = bySlug.get(slug);
    if (!node) return [];
    return [
      {
        slug,
        title: node.frontmatter.title,
        date: node.frontmatter.date,
        description: node.frontmatter.description,
      },
    ];
  });
};

const ProjectsPage: React.FC<ProjectsPageProps> = ({ data, location }) => {
  const nodes = data?.allMarkdownRemark.nodes;
  const [category, setCategory] = React.useState<ProjectCategory | null>(null);

  useHashScroll();

  // Sections keep their ids and their order whatever the controls say — the
  // hero subtitle deep-links at them, so filtering renders fewer sections
  // rather than renumbering the ones that survive.
  const categorySections = React.useMemo(
    () =>
      CATEGORIES.filter(section => category === null || section.id === category)
        .map(section => ({
          ...section,
          projects: FLAGSHIP.filter(project => project.category === section.id),
          writing: writingFor(section.id, nodes ?? []),
          note: projectsConfig.writing[section.id]?.note,
        }))
        // A category only the experiments are about has no cards of its own,
        // and a heading over a gap is not a section.
        .filter(
          section => section.projects.length > 0 || section.writing.length > 0
        ),
    [category, nodes]
  );

  // The experiments answer the same picker as the cards above them, so a
  // category narrows the whole page, not only its top half.
  const lab = React.useMemo(
    () =>
      LAB.filter(project => category === null || project.category === category),
    [category]
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

  return (
    <>
      <SEO
        title="projects"
        description="open source libraries, systems, and experiments by alex nodeland"
        pathname={location?.pathname}
        jsonLd={projectsGraph()}
      />
      <div className="projects-page">
        {/* The category picker, alone. Seven cards and a short list need
            no sort and no search: the curated order is the one worth
            reading, and everything is on screen within a scroll or two. The
            picker resets itself through its own "all" option. */}
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
        </ControlRow>

        {categorySections.map(section => (
          <section
            key={section.id}
            id={section.id}
            className="projects-section"
          >
            <h2 className="section-title">{section.title}</h2>
            {section.projects.length > 0 && (
              <div className="projects-grid projects-grid--flagship">
                {section.projects.map(project => (
                  <ProjectCard key={project.name} project={project} />
                ))}
              </div>
            )}
            {section.writing.length > 0 && (
              <>
                {section.note && (
                  <p className="projects-section-note">{section.note}</p>
                )}
                <WritingList posts={section.writing} />
              </>
            )}
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

// Every post's slug, title, date and description, for the sections whose
// work is writing rather than code. A page query rather than a copy in the
// config, so a retitled post retitles its row.
export const query = graphql`
  query ProjectsPageQuery {
    allMarkdownRemark {
      nodes {
        fields {
          slug
        }
        frontmatter {
          title
          date
          description
        }
      }
    }
  }
`;

export default ProjectsPage;
