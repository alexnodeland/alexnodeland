import { render, screen } from '@testing-library/react';
import React from 'react';
import { homepageConfig } from '../../../config';
import IndexPage from '../../../pages/index';

// Mock the Layout and SEO components
jest.mock('../../../components/layout', () => {
  return function MockLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="layout">{children}</div>;
  };
});
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

// Fully mock components barrel to avoid animated backgrounds side effects
jest.mock('../../../components', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
  SEO: ({ title, description }: { title?: string; description?: string }) => (
    <div data-testid="seo" data-title={title} data-description={description} />
  ),
}));

describe('Index Page', () => {
  it('renders hero and SEO', () => {
    render(<IndexPage />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', 'home');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
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
