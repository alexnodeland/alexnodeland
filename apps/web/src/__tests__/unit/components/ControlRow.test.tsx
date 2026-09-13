import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ControlRow from '../../../components/ui/ControlRow';

// The row is a page's chrome but the scroll it answers to is the shell's, so
// every test here puts it where it actually lives: inside the window's
// scroller, under the band the hero's fold gives up. jsdom lays nothing out,
// so the band's height — which is the whole threshold — is stated rather than
// measured.
const BAND = 100;

const mount = (
  children: React.ReactNode = <button type="button">all</button>
) => {
  const view = render(
    <div className="layout">
      <div className="window-band" />
      <main>
        <ControlRow className="timeline-control-bar">{children}</ControlRow>
      </main>
    </div>
  );
  const panel = view.container.querySelector('.layout') as HTMLElement;
  return { ...view, panel };
};

const scrollTo = (panel: HTMLElement, top: number) => {
  Object.defineProperty(panel, 'scrollTop', { value: top, configurable: true });
  fireEvent.scroll(panel);
};

describe('ControlRow', () => {
  const raf = window.requestAnimationFrame;
  const height = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight'
  );

  beforeEach(() => {
    // The row reads the scroll once per frame; the tests want the read to have
    // happened by the time they look.
    window.requestAnimationFrame = ((cb: (time: number) => void) => {
      cb(0);
      return 0;
    }) as typeof window.requestAnimationFrame;
    // The band has to have a height before the row's first read, which happens
    // on mount — so it is given one on the prototype rather than on the node.
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains('window-band') ? BAND : 0;
      },
    });
  });

  afterEach(() => {
    window.requestAnimationFrame = raf;
    if (height) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
    } else {
      delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
    }
  });

  it('keeps the page in charge of what is in the row', () => {
    const { container } = mount(
      <>
        <button type="button">all</button>
        <button type="button">newest first</button>
      </>
    );
    const row = container.querySelector('.timeline-control-bar');
    expect(row).not.toBeNull();
    expect(screen.getByText('all')).toBeInTheDocument();
    expect(screen.getByText('newest first')).toBeInTheDocument();
  });

  // The way back to the top is only ever wanted by someone who has left it,
  // and the moment it is wanted is the moment the row has finished arriving:
  // pinned to the window's edge, with the list running underneath.
  it('holds the way back until the row is afloat', () => {
    const { container, panel } = mount();
    const row = container.querySelector('.timeline-control-bar')!;
    const top = container.querySelector('.ui-scroll-top')!;

    expect(row.className).not.toContain('is-afloat');
    expect(top).toHaveAttribute('aria-hidden', 'true');
    expect(top).toHaveAttribute('tabindex', '-1');

    // Part of the way: the row is still travelling up with the column.
    scrollTo(panel, BAND - 1);
    expect(row.className).not.toContain('is-afloat');

    scrollTo(panel, BAND);
    expect(row.className).toContain('is-afloat');
    expect(top).toHaveAttribute('aria-hidden', 'false');
    expect(top).toHaveAttribute('tabindex', '0');
  });

  it('puts the window back to the top when the way back is taken', async () => {
    const { container, panel } = mount();
    const scrollTo_ = jest.fn();
    panel.scrollTo = scrollTo_ as unknown as typeof panel.scrollTo;

    scrollTo(panel, BAND * 4);
    fireEvent.click(container.querySelector('.ui-scroll-top')!);

    await waitFor(() =>
      expect(scrollTo_).toHaveBeenCalledWith(
        expect.objectContaining({ top: 0 })
      )
    );
  });

  // The draw-in is the stylesheet's, off the window's scroll timeline — except
  // where the browser cannot read one, and then this is the same arrangement
  // the hero's fold keeps: a progress number published per frame. jsdom has no
  // CSS.supports, so this is the published path.
  it('publishes the draw-in for a browser with no scroll timeline', () => {
    const { container, panel } = mount();
    const row = container.querySelector('.timeline-control-bar') as HTMLElement;

    expect(row.style.getPropertyValue('--row-fold')).toBe('0');

    scrollTo(panel, BAND / 2);
    expect(row.style.getPropertyValue('--row-fold')).toBe('0.5');

    // Past the band it is finished, not overshooting: the transform it drives
    // is a fixed distance, not a rate.
    scrollTo(panel, BAND * 3);
    expect(row.style.getPropertyValue('--row-fold')).toBe('1');
  });
});
