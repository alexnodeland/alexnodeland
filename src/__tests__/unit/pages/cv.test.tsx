import { render, screen } from '@testing-library/react';
import React from 'react';
import CVPage from '../../../pages/cv';

// Mock components barrel to avoid animated backgrounds
jest.mock('../../../components', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
  SEO: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
  ExportButtons: ({ className }: { className?: string }) => (
    <div data-testid="export-buttons" className={className} />
  ),
  CVSectionNav: ({
    className,
    sections,
  }: {
    className?: string;
    sections: any[];
  }) => (
    <nav data-testid="cv-section-nav" className={className}>
      {sections.map((section, index) => (
        <div key={index} data-section-id={section.id}>
          {section.label}
        </div>
      ))}
    </nav>
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
