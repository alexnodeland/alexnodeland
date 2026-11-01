import { render, screen, within } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ProjectsPage from '../../../pages/projects';
import { projectsConfig, projectsInTier } from '../../../config/projects';

// Mock components barrel to avoid animated backgrounds
jest.mock('../../../components/seo', () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
}));

jest.mock('../../../components/ui/ActivityPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="activity-panel" />,
}));

// Mock SCSS
jest.mock('../../../styles/projects.scss', () => ({}));

const FLAGSHIP = projectsInTier('flagship');
const LAB = projectsInTier('lab');
const APPS = projectsInTier('app');

// The categories the page has something in, in the config's order — the
// picker's options and the sections both follow it.
const PAGE_CATEGORIES = projectsConfig.categories.filter(
  category =>
    [...FLAGSHIP, ...LAB].some(p => p.category === category.id) ||
    (projectsConfig.writing[category.id]?.posts.length ?? 0) > 0
);

// The sections the page draws at "all": a category with cards or writing,
// then the experiments.
const SECTION_IDS = [
  ...PAGE_CATEGORIES.filter(
    c =>
      FLAGSHIP.some(p => p.category === c.id) ||
      (projectsConfig.writing[c.id]?.posts.length ?? 0) > 0
  ).map(c => c.id),
  projectsConfig.lab.id,
];

// What the page query hands the page: every post the writing names, with a
// title and date of its own, plus one post nothing names.
const WRITTEN = Object.values(projectsConfig.writing).flatMap(
  w => w?.posts ?? []
);
const DATA = {
  allMarkdownRemark: {
    nodes: [
      ...WRITTEN.map((slug, i) => ({
        fields: { slug: `/${slug}/` },
        frontmatter: {
          title: `Post ${slug}`,
          date: `${2016 + i}-01-01T00:00:00.000Z`,
          description: `About ${slug}.`,
        },
      })),
      {
        fields: { slug: '/999999_unrelated/' },
        frontmatter: { title: 'Unrelated', date: '2026-01-01' },
      },
    ],
  },
};

describe('Projects Page', () => {
  it('renders SEO and its sections, and no hero of its own', () => {
    render(<ProjectsPage data={DATA} />);
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', 'projects');
    // The "alex → projects" title and the tagline live in the hero registry
    // the shell reads; the page owns the control row and the catalogue.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Filter projects by category' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('activity-panel')).toBeInTheDocument();
  });

  it('renders a section per category with flagship work, carrying its anchor id', () => {
    const { container } = render(<ProjectsPage data={DATA} />);
    projectsConfig.categories.forEach(category => {
      const hasFlagship = FLAGSHIP.some(p => p.category === category.id);
      if (hasFlagship) {
        expect(
          screen.getByRole('heading', { level: 2, name: category.title })
        ).toBeInTheDocument();
        // The hero subtitle on the homepage deep-links to these ids.
        expect(container.querySelector(`#${category.id}`)).toBeInTheDocument();
      }
    });
  });

  it('keeps every anchor the homepage subtitle links to', () => {
    // math → audio dsp → distributed systems → ai: each one a section here.
    const { container } = render(<ProjectsPage data={DATA} />);
    for (const id of ['math', 'audio-dsp', 'distributed-systems', 'ai']) {
      expect(container.querySelector(`#${id}`)).toBeInTheDocument();
    }
  });

  it('renders the flagship work as cards and the experiments as a list', () => {
    const { container } = render(<ProjectsPage data={DATA} />);
    const cards = Array.from(
      container.querySelectorAll('.project-card .project-name')
    ).map(node => node.textContent);
    const rows = Array.from(
      container.querySelectorAll(
        `#${projectsConfig.lab.id} .lab-item .lab-item-name`
      )
    ).map(node => node.textContent);

    expect([...cards].sort()).toEqual(FLAGSHIP.map(p => p.name).sort());
    expect(rows).toEqual(LAB.map(p => p.name));
    expect(
      screen.getByRole('heading', { level: 2, name: projectsConfig.lab.title })
    ).toBeInTheDocument();
  });

  it('leaves the apps to the apps page', () => {
    render(<ProjectsPage data={DATA} />);
    for (const app of APPS) {
      expect(screen.queryByText(app.name)).not.toBeInTheDocument();
    }
  });

  it('renders external links with target=_blank and rel=noopener noreferrer', () => {
    render(<ProjectsPage data={DATA} />);
    const firstProject = FLAGSHIP[0];
    // The card is a box, not a link: the ways out are the marks at its foot.
    const card = screen
      .getByText(firstProject.name)
      .closest('.project-card') as HTMLElement;
    expect(card.tagName).toBe('ARTICLE');
    const repo = card.querySelector('.project-out-repo') as HTMLElement;
    expect(repo).toHaveAttribute('target', '_blank');
    expect(repo).toHaveAttribute('rel', 'noopener noreferrer');
    expect(repo).toHaveAttribute('href', firstProject.url);
  });

  it('anchors every card and row at the fragment its search result and URI use', () => {
    const { container } = render(<ProjectsPage data={DATA} />);
    for (const project of [...FLAGSHIP, ...LAB]) {
      const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      expect(container.querySelector(`#project-${slug}`)).toHaveTextContent(
        project.name
      );
    }
  });

  describe('the ways out of a card', () => {
    const cardFor = (name: string) =>
      screen.getByText(name).closest('.project-card') as HTMLElement;

    it('links to the site as well as the repo, when there is one', () => {
      const withSite = FLAGSHIP.find(project => project.site);
      if (!withSite) throw new Error('no flagship project carries a site');
      render(<ProjectsPage data={DATA} />);
      const card = cardFor(withSite.name);

      const site = card.querySelector('.project-out-site') as HTMLElement;
      expect(site).toHaveAttribute('href', withSite.site as string);
      expect(site).toHaveAttribute('target', '_blank');
      expect(site).toHaveAttribute('rel', 'noopener noreferrer');
      expect(site).toHaveAccessibleName(`visit the ${withSite.name} site`);

      // The chain sits to the left of the octocat, which keeps the corner.
      const marks = Array.from(
        card.querySelectorAll('.project-link-indicator > a')
      ).map(mark => mark.className.split(' ')[1]);
      expect(marks.slice(-2)).toEqual(['project-out-site', 'project-out-repo']);
    });

    it('draws no chain on a project with no site of its own', () => {
      const noSite = FLAGSHIP.find(project => !project.site);
      if (!noSite) throw new Error('every flagship project carries a site');
      render(<ProjectsPage data={DATA} />);
      expect(
        cardFor(noSite.name).querySelector('.project-out-site')
      ).toBeNull();
    });

    it('follows the site with the whole card, and the repo where there is none', () => {
      const withSite = FLAGSHIP.find(project => project.site);
      const noSite = FLAGSHIP.find(project => !project.site);
      if (!withSite || !noSite) throw new Error('need one of each');
      render(<ProjectsPage data={DATA} />);

      // The card's link is the one that stretches across it. With a site,
      // that is the chain, and the octocat is lifted clear so it can still be
      // hit; with no site, the octocat is the card.
      const site = cardFor(withSite.name);
      expect(site.querySelector('.project-out-site')).toHaveClass(
        'is-card-link'
      );
      expect(site.querySelector('.project-out-repo')).toHaveClass('is-raised');

      const repoOnly = cardFor(noSite.name);
      expect(repoOnly.querySelector('.project-out-repo')).toHaveClass(
        'is-card-link'
      );
    });

    it('leads with the arrow into the post, where there is one, lifted clear', () => {
      const withPost = FLAGSHIP.find(project => project.post);
      if (!withPost) throw new Error('no flagship project has a post');
      render(<ProjectsPage data={DATA} />);
      const card = cardFor(withPost.name);

      const post = card.querySelector('.project-out-post') as HTMLElement;
      expect(post).toHaveAttribute('href', `/timeline/${withPost.post}/`);
      expect(post).toHaveClass('is-raised');
      // An internal page: it opens in place, not in a new tab.
      expect(post).not.toHaveAttribute('target');
      expect(post).toHaveAccessibleName(`read the post about ${withPost.name}`);
      expect(card.querySelector('.project-link-indicator > a')).toBe(post);
    });

    it('shows the install line where a project has one', () => {
      const installable = FLAGSHIP.find(project => project.install);
      const bare = FLAGSHIP.find(project => !project.install);
      if (!installable || !bare) throw new Error('need one of each');
      render(<ProjectsPage data={DATA} />);

      expect(
        cardFor(installable.name).querySelector('.project-install code')
      ).toHaveTextContent(installable.install as string);
      expect(cardFor(bare.name).querySelector('.project-install')).toBeNull();
    });

    it('says where a command is typed when it is not a shell install', () => {
      const labelled = FLAGSHIP.find(project => project.installLabel);
      const plain = FLAGSHIP.find(
        project => project.install && !project.installLabel
      );
      if (!labelled || !plain) throw new Error('need one of each');
      render(<ProjectsPage data={DATA} />);

      expect(
        cardFor(labelled.name).querySelector('.project-install-label')
      ).toHaveTextContent(labelled.installLabel as string);
      expect(
        cardFor(plain.name).querySelector('.project-install-label')
      ).toBeNull();
    });

    it('points every site link at a real address', () => {
      for (const project of projectsConfig.projects) {
        if (!project.site) continue;
        expect(project.site).toMatch(/^https:\/\//);
      }
    });
  });

  describe('control row', () => {
    const categoryTrigger = () =>
      screen.getByRole('button', { name: 'Filter projects by category' });

    const pick = async (
      user: ReturnType<typeof userEvent.setup>,
      trigger: HTMLElement,
      optionName: string
    ) => {
      await user.click(trigger);
      await user.click(screen.getByRole('option', { name: optionName }));
    };

    const sectionIds = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('.projects-section')).map(
        section => section.id
      );

    const cardNames = () =>
      Array.from(document.querySelectorAll('.project-name')).map(
        node => node.textContent
      );

    const labNames = () =>
      Array.from(
        document.querySelectorAll(`#${projectsConfig.lab.id} .lab-item-name`)
      ).map(node => node.textContent);

    it('is the category picker alone: no sort, no search', () => {
      render(<ProjectsPage data={DATA} />);
      expect(
        screen.queryByRole('button', { name: 'Sort projects' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText('search projects...')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'clear filters' })
      ).not.toBeInTheDocument();
    });

    it('lists the cards in the config order, section by section', () => {
      render(<ProjectsPage data={DATA} />);
      expect(cardNames()).toEqual(
        projectsConfig.categories.flatMap(category =>
          FLAGSHIP.filter(p => p.category === category.id).map(p => p.name)
        )
      );
      expect(labNames()).toEqual(LAB.map(p => p.name));
    });

    it('offers only the categories the page has something in, behind "all"', async () => {
      const user = userEvent.setup();
      render(<ProjectsPage data={DATA} />);

      expect(categoryTrigger()).toHaveTextContent('all');
      await user.click(categoryTrigger());

      expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual([
        'all',
        ...PAGE_CATEGORIES.map(c => c.title),
      ]);
    });

    it('filters down to one category, keeping its anchor id intact', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProjectsPage data={DATA} />);

      const target = PAGE_CATEGORIES.find(category =>
        FLAGSHIP.some(p => p.category === category.id)
      )!;

      await pick(user, categoryTrigger(), target.title);

      // The category's section, and the experiments' list only if one of
      // them is about it too.
      const labInCategory = LAB.filter(p => p.category === target.id);
      expect(sectionIds(container)).toEqual([
        target.id,
        ...(labInCategory.length > 0 ? [projectsConfig.lab.id] : []),
      ]);
      // The hero subtitle deep-links at this id; filtering must not rename it.
      expect(container.querySelector(`#${target.id}`)).toBeInTheDocument();
      expect(categoryTrigger()).toHaveTextContent(target.title);

      // Only that category's projects survive, cards and rows alike.
      expect(cardNames()).toEqual(
        FLAGSHIP.filter(p => p.category === target.id).map(p => p.name)
      );
      expect(labNames()).toEqual(labInCategory.map(p => p.name));
    });

    it('renders every section again at "all", so deep links still resolve', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProjectsPage data={DATA} />);

      const withProjects = SECTION_IDS;

      expect(sectionIds(container)).toEqual(withProjects);

      await pick(user, categoryTrigger(), PAGE_CATEGORIES[0].title);
      await pick(user, categoryTrigger(), 'all');

      expect(sectionIds(container)).toEqual(withProjects);
    });

    it('drives the category picker from the keyboard', async () => {
      const user = userEvent.setup();
      render(<ProjectsPage data={DATA} />);

      categoryTrigger().focus();
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('listbox')).toHaveFocus();

      // all → first category, then take it.
      await user.keyboard('{ArrowDown}{Enter}');

      expect(categoryTrigger()).toHaveFocus();
      expect(categoryTrigger()).toHaveTextContent(PAGE_CATEGORIES[0].title);
    });
  });

  describe('writing in place of code', () => {
    it('names only posts that exist', () => {
      const blog = path.join(__dirname, '../../../content/blog');
      for (const slug of WRITTEN) {
        expect(fs.existsSync(path.join(blog, `${slug}.md`))).toBe(true);
      }
    });

    it('draws a row per post, in the order the config names them', () => {
      const { container } = render(<ProjectsPage data={DATA} />);
      for (const [id, writing] of Object.entries(projectsConfig.writing)) {
        if (!writing) continue;
        const section = container.querySelector(`#${id}`) as HTMLElement;
        expect(section).toBeInTheDocument();
        expect(within(section).getByText(writing.note)).toBeInTheDocument();
        const rows = Array.from(
          section.querySelectorAll('.writing-list .lab-item')
        );
        expect(
          rows.map(row => row.querySelector('.lab-item-name')?.textContent)
        ).toEqual(writing.posts.map(slug => `Post ${slug}`));

        // The year, and the arrow into the post covering the whole row.
        const first = rows[0] as HTMLElement;
        expect(first).toHaveTextContent(
          DATA.allMarkdownRemark.nodes[0].frontmatter.date.slice(0, 4)
        );
        const link = first.querySelector('.project-out-post') as HTMLElement;
        expect(link).toHaveAttribute('href', `/timeline/${writing.posts[0]}/`);
        expect(link).toHaveClass('is-card-link');
      }
    });

    it('drops a named post the query does not have, rather than a dead row', () => {
      const [dropped, ...kept] = DATA.allMarkdownRemark.nodes;
      const { container } = render(
        <ProjectsPage data={{ allMarkdownRemark: { nodes: kept } }} />
      );
      expect(container.textContent).not.toContain(dropped.frontmatter.title);
      expect(
        container.querySelectorAll('.writing-list .lab-item')
      ).toHaveLength(WRITTEN.length - 1);
    });

    it('renders bare, with no query data, and leaves the writing out', () => {
      const { container } = render(<ProjectsPage />);
      expect(container.querySelectorAll('.writing-list')).toHaveLength(0);
      expect(container.querySelectorAll('.project-card')).toHaveLength(
        FLAGSHIP.length
      );
    });
  });
});
