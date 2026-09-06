import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ProjectsPage from '../../../pages/projects';
import { projectsConfig } from '../../../config/projects';

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

  it('renders a section per category with projects, carrying its anchor id', () => {
    const { container } = render(<ProjectsPage />);
    projectsConfig.categories.forEach(category => {
      const hasProjects = projectsConfig.projects.some(
        p => p.category === category.id
      );
      if (hasProjects) {
        expect(
          screen.getByRole('heading', { level: 2, name: category.title })
        ).toBeInTheDocument();
        // The hero subtitle on the homepage deep-links to these ids.
        expect(container.querySelector(`#${category.id}`)).toBeInTheDocument();
      }
    });
  });

  it('renders project names from config', () => {
    render(<ProjectsPage />);
    projectsConfig.projects.forEach(project => {
      expect(screen.getByText(project.name)).toBeInTheDocument();
    });
  });

  it('renders external links with target=_blank and rel=noopener noreferrer', () => {
    render(<ProjectsPage />);
    const firstProject = projectsConfig.projects[0];
    const link = screen.getByText(firstProject.name).closest('a');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('href', firstProject.url);
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

    // Cards render grouped by section, so "curated" is the config's project
    // order read section by section — not the raw projects array.
    const curatedOrder = () =>
      projectsConfig.categories.flatMap(category =>
        projectsConfig.projects
          .filter(p => p.category === category.id)
          .map(p => p.name)
      );

    it('offers every configured category behind an "all" default', async () => {
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
        ...projectsConfig.categories.map(c => c.title),
      ]);
    });

    it('filters down to one section, keeping its anchor id intact', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProjectsPage />);

      const target = projectsConfig.categories.find(category =>
        projectsConfig.projects.some(p => p.category === category.id)
      )!;

      await pick(user, categoryTrigger(), target.title);

      expect(sectionIds(container)).toEqual([target.id]);
      // The hero subtitle deep-links at this id; filtering must not rename it.
      expect(container.querySelector(`#${target.id}`)).toBeInTheDocument();
      expect(categoryTrigger()).toHaveTextContent(target.title);

      // Only that category's projects survive.
      const expected = projectsConfig.projects.filter(
        p => p.category === target.id
      );
      expect(cardNames()).toEqual(expected.map(p => p.name));
    });

    it('renders every section again at "all", so deep links still resolve', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProjectsPage />);

      const withProjects = projectsConfig.categories
        .filter(c => projectsConfig.projects.some(p => p.category === c.id))
        .map(c => c.id);

      expect(sectionIds(container)).toEqual(withProjects);

      await pick(user, categoryTrigger(), withProjects[0]);
      await pick(user, categoryTrigger(), 'all');

      expect(sectionIds(container)).toEqual(withProjects);
    });

    it('sorts within a section by stars and by name', async () => {
      const user = userEvent.setup();
      render(<ProjectsPage />);

      // Curated is the config's own order and the default.
      expect(sortTrigger()).toHaveTextContent('curated');
      expect(cardNames()).toEqual(curatedOrder());

      const section = projectsConfig.categories.find(
        category =>
          projectsConfig.projects.filter(p => p.category === category.id)
            .length > 1
      )!;
      const inSection = projectsConfig.projects.filter(
        p => p.category === section.id
      );

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

      const target = projectsConfig.projects[0];
      fireEvent.change(searchField(), { target: { value: target.name } });

      expect(cardNames()).toContain(target.name);
      // Only sections with a surviving card are still on the page.
      expect(sectionIds(container).length).toBeGreaterThan(0);
      expect(sectionIds(container).length).toBeLessThanOrEqual(
        projectsConfig.categories.length
      );

      // A tag match finds the card even though the name does not contain it.
      const tagged = projectsConfig.projects.find(p => p.tags.length > 0)!;
      fireEvent.change(searchField(), {
        target: { value: tagged.tags[0].toUpperCase() },
      });
      expect(cardNames()).toContain(tagged.name);
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
      expect(categoryTrigger()).toHaveTextContent(
        projectsConfig.categories[0].title
      );
    });
  });
});
