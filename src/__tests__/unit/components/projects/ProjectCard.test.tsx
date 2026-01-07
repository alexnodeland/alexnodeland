import { fireEvent, render, screen } from '@testing-library/react';
import ProjectCard from '../../../../components/projects/ProjectCard';
import type { Project } from '../../../../config/projects';

// Mock project data
const mockProject: Project = {
  id: 'test-project',
  name: 'Test Project',
  tagline: 'a test project for unit testing',
  category: 'library',
  status: 'active',
  featured: false,
  description: 'This is a test project description.',
  highlights: ['Feature 1', 'Feature 2'],
  links: [
    { type: 'github', url: 'https://github.com/test/test' },
    { type: 'docs', url: 'https://docs.test.com' },
  ],
  tags: ['typescript', 'react', 'testing'],
  year: 2024,
  github: {
    repo: 'test/test',
    stars: 42,
    lastCommit: new Date().toISOString(),
  },
};

const mockFeaturedProject: Project = {
  ...mockProject,
  id: 'featured-project',
  name: 'Featured Project',
  featured: true,
};

const mockArchivedProject: Project = {
  ...mockProject,
  id: 'archived-project',
  name: 'Archived Project',
  status: 'archived',
};

const mockForkProject: Project = {
  ...mockProject,
  id: 'fork-project',
  name: 'Fork Project',
  category: 'fork',
  upstream: {
    name: 'Original Project',
    url: 'https://github.com/original/project',
  },
  forkReason: 'Added custom features',
};

describe('ProjectCard Component', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render project card with basic information', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(
      screen.getByText('a test project for unit testing')
    ).toBeInTheDocument();
    expect(screen.getByText('library')).toBeInTheDocument();
  });

  it('should render status indicator for active projects', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('should render project tags', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
  });

  it('should render GitHub stats when available', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render link buttons', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

    const githubButton = screen.getByTitle('GitHub');
    const docsButton = screen.getByTitle('Docs');

    expect(githubButton).toBeInTheDocument();
    expect(docsButton).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

    const card = screen.getByTestId('project-card');
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should apply featured class when featured prop is true', () => {
    render(
      <ProjectCard
        project={mockFeaturedProject}
        onClick={mockOnClick}
        featured
      />
    );

    const card = screen.getByTestId('project-card');
    expect(card).toHaveClass('featured');
  });

  it('should apply archived class for archived projects', () => {
    render(<ProjectCard project={mockArchivedProject} onClick={mockOnClick} />);

    const card = screen.getByTestId('project-card');
    expect(card).toHaveClass('archived');
  });

  it('should render fork information for fork projects', () => {
    render(<ProjectCard project={mockForkProject} onClick={mockOnClick} />);

    expect(screen.getByText('fork')).toBeInTheDocument();
    expect(screen.getByText(/fork of/i)).toBeInTheDocument();
    expect(screen.getByText('Original Project')).toBeInTheDocument();
    expect(screen.getByText(/Added custom features/)).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

    const card = screen.getByTestId('project-card');

    // Test Enter key
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockOnClick).toHaveBeenCalledTimes(1);

    // Test Space key
    fireEvent.keyDown(card, { key: ' ' });
    expect(mockOnClick).toHaveBeenCalledTimes(2);
  });

  it('should stop propagation when link button is clicked', () => {
    const windowOpen = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

    const githubButton = screen.getByTitle('GitHub');
    fireEvent.click(githubButton);

    // onClick should not be called when clicking the link button
    expect(mockOnClick).not.toHaveBeenCalled();
    expect(windowOpen).toHaveBeenCalledWith(
      'https://github.com/test/test',
      '_blank',
      'noopener,noreferrer'
    );

    windowOpen.mockRestore();
  });

  it('should limit displayed tags to 4', () => {
    const projectWithManyTags: Project = {
      ...mockProject,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
    };

    render(<ProjectCard project={projectWithManyTags} onClick={mockOnClick} />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
    expect(screen.getByText('tag4')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.queryByText('tag5')).not.toBeInTheDocument();
  });

  it('should not show status indicator for stable projects', () => {
    const stableProject: Project = {
      ...mockProject,
      status: 'stable',
    };

    render(<ProjectCard project={stableProject} onClick={mockOnClick} />);

    expect(screen.queryByText('stable')).not.toBeInTheDocument();
  });

  it('should render correctly without GitHub metadata', () => {
    const projectWithoutGithub: Project = {
      ...mockProject,
      github: undefined,
    };

    render(<ProjectCard project={projectWithoutGithub} onClick={mockOnClick} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });
});
