import { render, screen } from '@testing-library/react';
import React from 'react';
import ProjectsPage from '../../../pages/projects';
import { projectsConfig } from '../../../config/projects';

// Mock components barrel to avoid animated backgrounds
jest.mock('../../../components', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
  SEO: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
}));

// Mock SCSS
jest.mock('../../../styles/projects.scss', () => ({}));

describe('Projects Page', () => {
  it('renders layout, SEO, and header', () => {
    render(<ProjectsPage />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', 'projects');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'projects'
    );
  });

  it('renders the featured section', () => {
    render(<ProjectsPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'featured' })
    ).toBeInTheDocument();
  });

  it('renders a section per category with projects', () => {
    render(<ProjectsPage />);
    projectsConfig.categories.forEach(category => {
      const hasProjects = projectsConfig.projects.some(
        p => !p.featured && p.category === category.id
      );
      if (hasProjects) {
        expect(
          screen.getByRole('heading', { level: 2, name: category.title })
        ).toBeInTheDocument();
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
});
