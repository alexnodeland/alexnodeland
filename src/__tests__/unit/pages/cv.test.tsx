import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { cvData, resumeData } from '../../../config';
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
  // The sticky control row owns the view state and the downloads; the page
  // owns which length is on screen, so the mock has to report both the value
  // it was handed and a way to change it.
  CVControlBar: ({
    view,
    onViewChange,
  }: {
    view: string;
    onViewChange: (view: string) => void;
  }) => (
    <div data-testid="cv-control-bar" data-view={view}>
      <button type="button" onClick={() => onViewChange('resume')}>
        pick one page
      </button>
    </div>
  ),
  // Search is not chrome and did not move into the row — it keeps its own
  // panel below it, and its own copy of the data.
  CVSearch: ({
    resumeData,
  }: {
    resumeData: { personal: { name: string } };
  }) => <div data-testid="cv-search" data-name={resumeData.personal.name} />,
  ExperienceSection: () => <section id="cv-experience-body" />,
  EducationSection: () => <section id="cv-education-body" />,
  SkillsSection: () => <section id="cv-skills-body" />,
}));

// Mock SCSS import
jest.mock('../../../styles/cv.scss', () => ({}));

describe('CV Page', () => {
  it('renders CV header and sections', () => {
    render(<CVPage />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', 'cv');
    expect(screen.getByText('cv')).toBeInTheDocument();
    // The sections the search scrolls to are the ones the page puts ids on.
    expect(document.getElementById('cv-experience')).toBeInTheDocument();
    expect(document.getElementById('cv-education')).toBeInTheDocument();
    expect(document.getElementById('cv-skills')).toBeInTheDocument();
  });

  it('drives the whole page from the one control row', async () => {
    const user = userEvent.setup();
    render(<CVPage />);

    // One row of chrome — the old two-button toggle and the three download
    // buttons in their own panel are gone.
    expect(screen.getByTestId('cv-control-bar')).toHaveAttribute(
      'data-view',
      'full'
    );
    expect(document.querySelector('.cv-view-toggle')).toBeNull();
    expect(document.querySelector('.cv-export')).toBeNull();
    // The search kept its own panel below the row.
    expect(screen.getByTestId('cv-search')).toBeInTheDocument();

    const fullSummary = screen.getByText(cvData.personal.summary);
    expect(fullSummary).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'pick one page' }));

    expect(screen.getByTestId('cv-control-bar')).toHaveAttribute(
      'data-view',
      'resume'
    );
    expect(screen.getByText(resumeData.personal.summary)).toBeInTheDocument();
    // Both consumers are handed the length that is now on screen.
    expect(screen.getByTestId('cv-search')).toHaveAttribute(
      'data-name',
      resumeData.personal.name
    );
  });
});
