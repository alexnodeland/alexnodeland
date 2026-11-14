import { render, screen } from '@testing-library/react';
import React from 'react';
import { isNotFound } from '../../../lib/notFound';
import NotFoundPage from '../../../pages/404';

// No Layout mock: the shell wraps the page (wrapPageElement) rather than the
// page rendering it, so what a 404 renders is the flag it raises — the hero
// the shell then wears says everything the page used to say inside the window,
// and the background plays its sequence behind it. Nothing is drawn over the
// field by the page itself, not even the window's frame (the mark it puts on
// the document is what takes that away), and no ways back are drawn: the
// hero's crumb and the nav capsule are already those.

jest.mock('../../../components/seo', () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
}));

jest.mock('../../../styles/404.scss', () => ({}));

describe('404 Page', () => {
  it('names itself to the crawlers and says nothing else', () => {
    const { container } = render(<NotFoundPage />);
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', '404');
    // Empty on purpose: the line it used to hold and the address it used to
    // print were both the hero repeating itself, and the address is in the
    // address bar either way.
    expect(container.querySelector('.not-found')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('draws no links of its own — the shell already carries the ways back', () => {
    const { container } = render(<NotFoundPage />);
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('nav')).toBeNull();
  });

  it('raises the not-found flag while mounted and lowers it after', () => {
    const { unmount } = render(<NotFoundPage />);
    expect(isNotFound()).toBe(true);
    unmount();
    expect(isNotFound()).toBe(false);
  });

  it('marks the document while it is up, which is what takes the window’s frame away', () => {
    const root = document.documentElement;
    expect(root.hasAttribute('data-not-found')).toBe(false);
    const { unmount } = render(<NotFoundPage />);
    expect(root.hasAttribute('data-not-found')).toBe(true);
    unmount();
    expect(root.hasAttribute('data-not-found')).toBe(false);
  });

  it('leaves nothing else on the document behind it', () => {
    // The window used to drift off by a distance drawn per visit and kept on
    // the root. There is no window to drift now, and nothing to keep.
    const { unmount } = render(<NotFoundPage />);
    expect(document.documentElement.getAttribute('style') ?? '').toBe('');
    unmount();
    expect(document.documentElement.getAttribute('style') ?? '').toBe('');
  });

  it('draws nothing of its own over the field', () => {
    const { container } = render(<NotFoundPage />);
    expect(container.querySelector('canvas')).toBeNull();
    expect(document.body.querySelector('canvas')).toBeNull();
  });
});
