import { render, screen } from '@testing-library/react';
import React from 'react';
import NotFoundPage from '../../../pages/404';

// Mock the Layout component to keep DOM simple
jest.mock('../../../components/layout', () => {
  return function MockLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock the SEO component
jest.mock('../../../components/seo', () => {
  return function MockSEO({ title }: { title?: string }) {
    return <div data-testid="seo" data-title={title}></div>;
  };
});

// Mock SCSS import
jest.mock('../../../styles/404.scss', () => ({}));

describe('404 Page', () => {
  it('renders the 404 page content', () => {
    render(<NotFoundPage />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', '404');
    expect(screen.getByText('404: Not Found')).toBeInTheDocument();
    const backLink = screen.getByText('← Back to Home');
    expect(backLink).toHaveAttribute('href', '/');
    expect(backLink).toHaveClass('back-home');
  });
});
