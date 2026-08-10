import { render, screen } from '@testing-library/react';
import React from 'react';
import CVPage from '../../../pages/cv';

// Mock components barrel to avoid animated backgrounds
jest.mock('../../../components', () => ({
  // The page hero renders above the window now, as a Layout prop rather than
  // as part of the page's children — so the mock has to put it back in the
  // tree or every assertion about a page title fails on a structural change.
  Layout: ({
    children,
    hero,
  }: {
    children: React.ReactNode;
    hero?: React.ReactNode;
  }) => (
    <div data-testid="layout">
      <div data-testid="layout-hero">{hero}</div>
      {children}
    </div>
  ),
  SEO: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
  ExportButtons: ({ className }: { className?: string }) => (
    <div data-testid="export-buttons" className={className} />
  ),
  ExperienceSection: () => <section id="experience-section" />,
  EducationSection: () => <section id="education-section" />,
  SkillsSection: () => <section id="skills-section" />,
}));

// Mock SCSS import
jest.mock('../../../styles/cv.scss', () => ({}));

describe('CV Page', () => {
  it('renders CV header and sections', () => {
    render(<CVPage />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', 'cv');
    expect(screen.getByText('cv')).toBeInTheDocument();
    // Sections exist
    expect(document.getElementById('experience-section')).toBeInTheDocument();
    expect(document.getElementById('education-section')).toBeInTheDocument();
    expect(document.getElementById('skills-section')).toBeInTheDocument();
  });
});
