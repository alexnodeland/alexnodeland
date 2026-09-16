import { render, screen } from '@testing-library/react';
import React from 'react';
import { homepageConfig } from '../../../config';
import ConsultingPage from '../../../pages/consulting';

jest.mock('../../../components/seo', () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
}));

const { consulting } = homepageConfig;

describe('Consulting page', () => {
  it('opens with the intro, then how an engagement runs, then the past work', () => {
    const { container } = render(<ConsultingPage />);

    expect(screen.getByText(consulting.description)).toBeInTheDocument();
    expect(
      Array.from(container.querySelectorAll('h2')).map(h => h.textContent)
    ).toEqual(['how an engagement runs', 'past work']);
    expect(container.querySelectorAll('.consulting-step')).toHaveLength(
      consulting.steps.length
    );
    expect(container.querySelectorAll('.consulting-case')).toHaveLength(
      consulting.caseStudies.length
    );
  });

  it('keeps every client anonymous', () => {
    const { container } = render(<ConsultingPage />);
    // The one past client the rest of the site does name: its consulting
    // start is on this page, described rather than named.
    expect(container.textContent?.toLowerCase()).not.toContain('influize');
    for (const study of consulting.caseStudies) {
      expect(study.client).toMatch(/^an? /);
    }
  });

  it('ends on the closing line and both ways to get in touch', () => {
    render(<ConsultingPage />);
    expect(screen.getByText(consulting.closing)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: consulting.ctaButtons.primary.text })
    ).toHaveAttribute('href', expect.stringMatching(/^mailto:/));
    expect(
      screen.getByRole('link', { name: consulting.ctaButtons.secondary.text })
    ).toHaveAttribute('target', '_blank');
  });
});
