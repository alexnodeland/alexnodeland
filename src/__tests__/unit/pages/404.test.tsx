import { render, screen } from '@testing-library/react';
import React from 'react';
import { isNotFound } from '../../../lib/notFound';
import NotFoundPage from '../../../pages/404';

// No Layout mock: the shell wraps the page (wrapPageElement) rather than the
// page rendering it, so a 404 is just its own content — plus the flag it
// raises so the shell wears the 404 hero and the background plays its
// sequence. Nothing is drawn over the field by the page itself, and no ways
// back are drawn inside the window: the hero's crumb and the nav capsule are
// already those.

jest.mock('../../../components/seo', () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
}));

jest.mock('../../../styles/404.scss', () => ({}));

describe('404 Page', () => {
  it('renders the 404 page content', () => {
    render(<NotFoundPage />);
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', '404');
    expect(
      screen.getByText(/there is no page at this address/)
    ).toBeInTheDocument();
  });

  it('draws no links of its own — the shell already carries the ways back', () => {
    const { container } = render(<NotFoundPage />);
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('nav')).toBeNull();
  });

  it('shows the address that was typed, once mounted', () => {
    window.history.pushState({}, '', '/no/such/page');
    render(<NotFoundPage />);
    expect(screen.getByText('/no/such/page')).toBeInTheDocument();
    window.history.pushState({}, '', '/');
  });

  it('raises the not-found flag while mounted and lowers it after', () => {
    const { unmount } = render(<NotFoundPage />);
    expect(isNotFound()).toBe(true);
    unmount();
    expect(isNotFound()).toBe(false);
  });

  it('marks the document for the chrome to come apart, and unmarks it', () => {
    const { unmount } = render(<NotFoundPage />);
    const root = document.documentElement;
    expect(root.hasAttribute('data-not-found')).toBe(true);
    expect(root.style.getPropertyValue('--nf-dy')).toMatch(/px$/);
    expect(root.style.getPropertyValue('--nf-dx')).toMatch(/px$/);
    unmount();
    expect(root.hasAttribute('data-not-found')).toBe(false);
    expect(root.style.getPropertyValue('--nf-dy')).toBe('');
  });

  it('draws nothing of its own over the field', () => {
    const { container } = render(<NotFoundPage />);
    expect(container.querySelector('canvas')).toBeNull();
    expect(document.body.querySelector('canvas')).toBeNull();
  });
});
