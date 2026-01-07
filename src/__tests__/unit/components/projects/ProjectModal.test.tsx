import { fireEvent, render, screen } from '@testing-library/react';
import ProjectModal from '../../../../components/projects/ProjectModal';
import type { Project } from '../../../../config/projects';

// Mock project data
const mockProject: Project = {
  id: 'test-project',
  name: 'Test Project',
  tagline: 'a test project for unit testing',
  category: 'library',
  status: 'active',
  featured: true,
  description: `
## Overview

This is a test project description with **markdown**.

## Features

- Feature one
- Feature two
  `.trim(),
  highlights: ['Highlight 1', 'Highlight 2', 'Highlight 3'],
  links: [
    { type: 'github', url: 'https://github.com/test/test' },
    { type: 'docs', url: 'https://docs.test.com' },
    { type: 'blog', url: '/blog/test-project' },
  ],
  tags: ['typescript', 'react', 'testing', 'monads'],
  year: 2024,
  github: {
    repo: 'test/test',
    stars: 100,
  },
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
  forkReason: 'Custom modifications',
};

describe('ProjectModal Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body overflow
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Clean up body overflow
    document.body.style.overflow = '';
  });

  it('should not render when isOpen is false', () => {
    render(
      <ProjectModal
        project={mockProject}
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should not render when project is null', () => {
    render(
      <ProjectModal project={null} isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true and project is provided', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('should display project header information', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(
      screen.getByText('a test project for unit testing')
    ).toBeInTheDocument();
    expect(screen.getByText('library')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
  });

  it('should render project description', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    // ReactMarkdown is mocked in setupTests.js to just render children
    expect(screen.getByText(/Overview/)).toBeInTheDocument();
  });

  it('should render project highlights', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('highlights')).toBeInTheDocument();
    expect(screen.getByText('Highlight 1')).toBeInTheDocument();
    expect(screen.getByText('Highlight 2')).toBeInTheDocument();
    expect(screen.getByText('Highlight 3')).toBeInTheDocument();
  });

  it('should render all tags', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
    expect(screen.getByText('monads')).toBeInTheDocument();
  });

  it('should render link buttons', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Blog Post')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    const overlay = screen.getByRole('dialog');
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when modal content is clicked', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    // Click on the modal title (inside modal content)
    const title = screen.getByText('Test Project');
    fireEvent.click(title);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should set body overflow to hidden when open', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should render fork information for fork projects', () => {
    render(
      <ProjectModal
        project={mockForkProject}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('fork')).toBeInTheDocument();
    expect(screen.getByText(/fork of/)).toBeInTheDocument();
    expect(screen.getByText('Original Project')).toBeInTheDocument();
    expect(screen.getByText(/Custom modifications/)).toBeInTheDocument();
  });

  it('should not render highlights section if project has no highlights', () => {
    const projectWithoutHighlights: Project = {
      ...mockProject,
      highlights: undefined,
    };

    render(
      <ProjectModal
        project={projectWithoutHighlights}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('highlights')).not.toBeInTheDocument();
  });

  it('should not render year badge if project has no year', () => {
    const projectWithoutYear: Project = {
      ...mockProject,
      year: undefined,
    };

    render(
      <ProjectModal
        project={projectWithoutYear}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('2024')).not.toBeInTheDocument();
  });

  it('should have correct aria attributes', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('should render links with correct href', () => {
    render(
      <ProjectModal project={mockProject} isOpen={true} onClose={mockOnClose} />
    );

    const githubLink = screen.getByText('GitHub').closest('a');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/test/test');
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
