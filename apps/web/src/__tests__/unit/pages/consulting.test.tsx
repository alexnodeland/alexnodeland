import { render, screen } from '@testing-library/react';
import React from 'react';
import { homepageConfig } from '../../../config';
import { cvSource } from '../../../config/cv';
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

  it('names no company the CV names', () => {
    const { container } = render(<ConsultingPage />);
    const page = container.textContent?.toLowerCase() ?? '';

    // Every client on this page is described, not named, and the CV is where
    // the names that could leak onto it live — Influize among them, whose
    // consulting start is one of the stories here. "Freelance" is not a
    // company, and a parenthetical like "(acquired by SoundCloud)" is checked
    // as its own name.
    const names = cvSource.experience
      .flatMap(role => role.company.split(/[(),]/))
      .map(part =>
        part
          .replace(/acquired by/i, '')
          .trim()
          .toLowerCase()
      )
      .filter(name => name.length > 3 && name !== 'freelance');

    expect(names).toContain('influize');
    for (const name of names) {
      expect(page).not.toContain(name);
    }
  });

  it('ends on both ways to get in touch, with nothing between them and the past work', () => {
    const { container } = render(<ConsultingPage />);
    const last = Array.from(
      container.querySelectorAll('.home > section')
    ).pop();
    // The last section is the buttons alone: no sentence above them.
    expect(last?.querySelector('p')).toBeNull();
    expect(last?.querySelector('.cta-buttons')).not.toBeNull();
    expect(
      screen.getByRole('link', { name: consulting.ctaButtons.primary.text })
    ).toHaveAttribute('href', expect.stringMatching(/^mailto:/));
    expect(
      screen.getByRole('link', { name: consulting.ctaButtons.secondary.text })
    ).toHaveAttribute('target', '_blank');
  });
});
