import { fireEvent, render, screen } from '@testing-library/react';
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
const PAGE_CATEGORIES = projectsConfig.categories.filter(category =>
  [...FLAGSHIP, ...LAB].some(p => p.category === category.id)
);

describe('Projects Page', () => {
  it('renders SEO and its sections, and no hero of its own', () => {
    render(<ProjectsPage />);
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
    const { container } = render(<ProjectsPage />);
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
    const { container } = render(<ProjectsPage />);
    for (const id of ['math', 'audio-dsp', 'distributed-systems', 'ai']) {
      expect(container.querySelector(`#${id}`)).toBeInTheDocument();
    }
  });

  it('renders the flagship work as cards and the experiments as a list', () => {
    const { container } = render(<ProjectsPage />);
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
    render(<ProjectsPage />);
    for (const app of APPS) {
      expect(screen.queryByText(app.name)).not.toBeInTheDocument();
    }
  });

  it('renders external links with target=_blank and rel=noopener noreferrer', () => {
    render(<ProjectsPage />);
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

  describe('the ways out of a card', () => {
    const cardFor = (name: string) =>
      screen.getByText(name).closest('.project-card') as HTMLElement;

    it('links to the site as well as the repo, when there is one', () => {
      const withSite = FLAGSHIP.find(project => project.site);
      if (!withSite) throw new Error('no flagship project carries a site');
      render(<ProjectsPage />);
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
      render(<ProjectsPage />);
      expect(
        cardFor(noSite.name).querySelector('.project-out-site')
      ).toBeNull();
    });

    it('follows the site with the whole card, and the repo where there is none', () => {
      const withSite = FLAGSHIP.find(project => project.site);
      const noSite = FLAGSHIP.find(project => !project.site);
      if (!withSite || !noSite) throw new Error('need one of each');
      render(<ProjectsPage />);

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
      render(<ProjectsPage />);
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
      render(<ProjectsPage />);

      expect(
        cardFor(installable.name).querySelector('.project-install code')
      ).toHaveTextContent(installable.install as string);
      expect(cardFor(bare.name).querySelector('.project-install')).toBeNull();
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
    const sortTrigger = () =>
      screen.getByRole('button', { name: 'Sort projects' });
    const searchField = () => screen.getByPlaceholderText('search projects...');

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
      Array.from(document.querySelectorAll('.lab-item-name')).map(
        node => node.textContent
      );

    // Cards render grouped by section, so "curated" is the config's project
    // order read section by section — not the raw projects array.
    const curatedOrder = () =>
      projectsConfig.categories.flatMap(category =>
        FLAGSHIP.filter(p => p.category === category.id).map(p => p.name)
      );

    it('offers only the categories the page has something in, behind "all"', async () => {
      const user = userEvent.setup();
      render(<ProjectsPage />);

      // The row is the two pickers and the search: no reset chip.
      expect(
        screen.queryByRole('button', { name: 'clear filters' })
      ).not.toBeInTheDocument();

      expect(categoryTrigger()).toHaveTextContent('all');
      await user.click(categoryTrigger());

      expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual([
        'all',
        ...PAGE_CATEGORIES.map(c => c.title),
      ]);
    });

    it('filters down to one category, keeping its anchor id intact', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProjectsPage />);

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
      const { container } = render(<ProjectsPage />);

      const withProjects = [
        ...projectsConfig.categories
          .filter(c => FLAGSHIP.some(p => p.category === c.id))
          .map(c => c.id),
        projectsConfig.lab.id,
      ];

      expect(sectionIds(container)).toEqual(withProjects);

      await pick(user, categoryTrigger(), PAGE_CATEGORIES[0].title);
      await pick(user, categoryTrigger(), 'all');

      expect(sectionIds(container)).toEqual(withProjects);
    });

    it('sorts within a section by stars and by name', async () => {
      const user = userEvent.setup();
      render(<ProjectsPage />);

      // Curated is the config's own order and the default.
      expect(sortTrigger()).toHaveTextContent('curated');
      expect(cardNames()).toEqual(curatedOrder());
      expect(labNames()).toEqual(LAB.map(p => p.name));

      const section = PAGE_CATEGORIES.find(
        category => FLAGSHIP.filter(p => p.category === category.id).length > 1
      )!;
      const inSection = FLAGSHIP.filter(p => p.category === section.id);

      await pick(user, categoryTrigger(), section.title);

      await pick(user, sortTrigger(), 'name a–z');
      expect(cardNames()).toEqual(
        [...inSection]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(p => p.name)
      );

      await pick(user, sortTrigger(), 'most starred');
      const byStars = [...inSection].sort(
        (a, b) => (b.stars ?? 0) - (a.stars ?? 0)
      );
      expect(cardNames()).toEqual(byStars.map(p => p.name));
      // Descending, with unstarred repos at the bottom rather than dropped.
      expect(cardNames()).toHaveLength(inSection.length);
    });

    it('searches name, description and tags, hiding sections it empties', () => {
      const { container } = render(<ProjectsPage />);

      const target = FLAGSHIP[0];
      fireEvent.change(searchField(), { target: { value: target.name } });

      expect(cardNames()).toContain(target.name);
      // Only sections with a surviving card are still on the page.
      expect(sectionIds(container).length).toBeGreaterThan(0);
      expect(sectionIds(container).length).toBeLessThanOrEqual(
        PAGE_CATEGORIES.length + 1
      );

      // A tag match finds the card even though the name does not contain it.
      const tagged = FLAGSHIP.find(p => p.tags.length > 0)!;
      fireEvent.change(searchField(), {
        target: { value: tagged.tags[0].toUpperCase() },
      });
      expect(cardNames()).toContain(tagged.name);
    });

    it('searches the experiments too', () => {
      const { container } = render(<ProjectsPage />);
      const target = LAB[0];
      fireEvent.change(searchField(), { target: { value: target.name } });

      expect(labNames()).toContain(target.name);
      expect(sectionIds(container)).toContain(projectsConfig.lab.id);
    });

    it('says so when a search matches nothing', () => {
      const { container } = render(<ProjectsPage />);

      fireEvent.change(searchField(), {
        target: { value: 'zzzz-no-such-project' },
      });

      expect(container.querySelectorAll('.projects-section')).toHaveLength(0);
      expect(
        screen.getByText(/no projects match "zzzz-no-such-project"/)
      ).toBeInTheDocument();
    });

    it('drives the category picker from the keyboard', async () => {
      const user = userEvent.setup();
      render(<ProjectsPage />);

      categoryTrigger().focus();
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('listbox')).toHaveFocus();

      // all → first category, then take it.
      await user.keyboard('{ArrowDown}{Enter}');

      expect(categoryTrigger()).toHaveFocus();
      expect(categoryTrigger()).toHaveTextContent(PAGE_CATEGORIES[0].title);
    });
  });
});
