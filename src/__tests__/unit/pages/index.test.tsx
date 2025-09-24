import { render, screen } from '@testing-library/react';
import React from 'react';
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

// Mock image imports used by the page
jest.mock('../../../images/development.png', () => 'development-icon');
jest.mock('../../../images/gear.png', () => 'gear-icon');
jest.mock('../../../images/observability.png', () => 'observability-icon');
jest.mock('../../../images/report.png', () => 'report-icon');
jest.mock('../../../images/strategy.png', () => 'strategy-icon');
jest.mock('../../../images/systems.png', () => 'systems-icon');

describe('Index Page', () => {
  it('renders hero and SEO', () => {
    render(<IndexPage />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', 'home');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
