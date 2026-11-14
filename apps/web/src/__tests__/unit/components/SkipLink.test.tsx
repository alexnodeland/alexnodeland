import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import SkipLink, { MAIN_ID } from '../../../components/ui/SkipLink';

describe('SkipLink', () => {
  const link = () => screen.getByRole('link', { name: 'skip to content' });

  it('is a real link to the fragment, so it works before the bundle has loaded', () => {
    render(<SkipLink />);
    expect(link()).toHaveAttribute('href', `#${MAIN_ID}`);
  });

  it('moves focus into <main> and leaves the address alone', () => {
    render(
      <>
        <SkipLink />
        <main id={MAIN_ID} tabIndex={-1} />
      </>
    );
    const followed = fireEvent.click(link());
    // The click is handled, not followed: a fragment in the address bar
    // would read as somewhere the visitor had gone.
    expect(followed).toBe(false);
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('falls back to the fragment when there is no <main> to focus', () => {
    // The phone's explore mode takes the whole page off the field. The link
    // then has nothing to hand focus to, and must not swallow the click.
    render(<SkipLink />);
    expect(fireEvent.click(link())).toBe(true);
  });
});
