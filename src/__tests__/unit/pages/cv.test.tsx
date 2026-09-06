import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { cvData, resumeData } from '../../../config';
import CVPage from '../../../pages/cv';

// Mock components barrel to avoid animated backgrounds
jest.mock('../../../components/seo', () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
}));

jest.mock('../../../components/cv/CVControlBar', () => ({
  __esModule: true,
  default: ({
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
}));

jest.mock('../../../components/cv/CVSearch', () => ({
  __esModule: true,
  default: ({ resumeData }: { resumeData: { personal: { name: string } } }) => (
    <div data-testid="cv-search" data-name={resumeData.personal.name} />
  ),
}));

jest.mock('../../../components/cv/CVExperienceSection', () => ({
  __esModule: true,
  default: () => <section id="cv-experience-body" />,
}));

jest.mock('../../../components/cv/CVEducationSection', () => ({
  __esModule: true,
  default: () => <section id="cv-education-body" />,
}));

jest.mock('../../../components/cv/CVSkillsSection', () => ({
  __esModule: true,
  default: () => <section id="cv-skills-body" />,
}));

// Mock SCSS import
jest.mock('../../../styles/cv.scss', () => ({}));

describe('CV Page', () => {
  it('renders SEO and its sections, and no hero of its own', () => {
    render(<CVPage />);
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', 'cv');
    // The "alex → cv" title and its tagline live in the hero registry the
    // shell reads, not here.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
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
