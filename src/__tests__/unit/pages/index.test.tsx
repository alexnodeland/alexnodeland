import { render, screen } from '@testing-library/react';
import React from 'react';
import { homepageConfig } from '../../../config';
import IndexPage from '../../../pages/index';

jest.mock('../../../components/seo', () => {
  return function MockSEO({
    title,
    description,
  }: {
    title?: string;
    description?: string;
  }) {
    return (
      <div
        data-testid="seo"
        data-title={title}
        data-description={description}
      ></div>
    );
  };
});

// Mock SCSS import
jest.mock('../../../styles/index.scss', () => ({}));

describe('Index Page', () => {
  it('renders its SEO and its content, and no hero of its own', () => {
    const { container } = render(<IndexPage />);
    expect(screen.getByTestId('seo')).toHaveAttribute(
      'data-title',
      'alex nodeland'
    );
    // The cover lives in the hero registry the shell reads, so the page has no
    // h1 at all — what it owns is the prose and the sections.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(container.querySelector('.home')).not.toBeNull();
    expect(screen.getByText('consulting')).toBeInTheDocument();
  });

  it('draws one expertise icon per card, hidden from assistive tech', () => {
    const { container } = render(<IndexPage />);

    const cards = container.querySelectorAll('.expertise-item');
    const icons = container.querySelectorAll('.expertise-icon svg');
    expect(cards).toHaveLength(homepageConfig.expertise.items.length);
    expect(icons).toHaveLength(homepageConfig.expertise.items.length);

    // The visible title does the labelling, so the drawing stays decorative
    // and no card announces its name twice.
    icons.forEach(icon => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveAttribute('viewBox', '0 0 48 48');
    });

    // Every icon animation has to be switchable off by the user's motion
    // preference, which is what the scoped <style> block carries.
    const styles = container.querySelectorAll('.expertise-icon svg style');
    expect(styles).toHaveLength(homepageConfig.expertise.items.length);
    styles.forEach(style => {
      expect(style.textContent).toContain(
        '@media (prefers-reduced-motion: reduce)'
      );
    });
  });
});
