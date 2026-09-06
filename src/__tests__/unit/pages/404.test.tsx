import { render, screen } from '@testing-library/react';
import React from 'react';
import { isNotFound } from '../../../lib/notFound';
import NotFoundPage from '../../../pages/404';

// No Layout mock: the shell wraps the page (wrapPageElement) rather than the
// page rendering it, so a 404 is just its own content — plus the flag it
// raises so the shell wears the 404 hero, and the scene it puts behind it.

jest.mock('../../../components/seo', () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
}));

// The scene is a canvas animation; what the page owes it is a variant.
jest.mock('../../../components/NotFoundScene', () => ({
  __esModule: true,
  default: ({ variant }: { variant: string }) => (
    <div data-testid="not-found-scene" data-variant={variant} />
  ),
  pickNotFoundVariant: () => 'decay',
}));

jest.mock('../../../styles/404.scss', () => ({}));

describe('404 Page', () => {
  it('renders the 404 page content', () => {
    render(<NotFoundPage />);
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', '404');
    expect(
      screen.getByText(/there is no page at this address/)
    ).toBeInTheDocument();
    const backLink = screen.getByText('back to the front page');
    expect(backLink).toHaveAttribute('href', '/');
    expect(backLink).toHaveClass('back-home');
  });

  it('raises the not-found flag while mounted and lowers it after', () => {
    const { unmount } = render(<NotFoundPage />);
    expect(isNotFound()).toBe(true);
    unmount();
    expect(isNotFound()).toBe(false);
  });

  it('marks the document and puts a scene behind the page', () => {
    const { unmount } = render(<NotFoundPage />);
    expect(document.documentElement.dataset.notFound).toBe('decay');
    expect(document.documentElement.style.getPropertyValue('--nf-dy')).toMatch(
      /px$/
    );
    expect(screen.getByTestId('not-found-scene')).toHaveAttribute(
      'data-variant',
      'decay'
    );
    unmount();
    expect(document.documentElement.dataset.notFound).toBeUndefined();
    expect(document.documentElement.style.getPropertyValue('--nf-dy')).toBe('');
  });
});
