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

  // Two housings and no third place: what is shown, at the start, and what
  // can be taken away, at the far end — with the way back to the top opening
  // on the inner side of that one, so nothing at the row's end moves.
  it('houses the pickers at the start, and the actions with the way back at the end', () => {
    const { container } = render(
      <div className="layout">
        <div className="window-band" />
        <ControlRow
          className="timeline-control-bar"
          actions={<a href="/rss.xml">feed</a>}
        >
          <button type="button">all</button>
          <button type="button">newest first</button>
        </ControlRow>
      </div>
    );
    const housings = Array.from(
      container.querySelectorAll('.timeline-control-bar > .ui-toolbar')
    );
    expect(housings).toHaveLength(2);
    const named = (housing: Element) =>
      Array.from(housing.children).map(
        node => node.getAttribute('aria-label') ?? node.textContent
      );
    expect(named(housings[0])).toEqual(['all', 'newest first']);
    expect(housings[1]).toHaveClass('ui-toolbar-end');
    expect(housings[1]).not.toHaveClass('is-bare');
    expect(named(housings[1])).toEqual(['back to the top', 'feed']);
  });

  it('marks the far housing bare when the way back is all it holds', () => {
    // Bare, it is not drawn at all until the row is afloat: an empty housing
    // at the end of a row at rest would be a box around nothing.
    const { container } = mount(<button type="button">all</button>);
    const end = container.querySelector('.ui-toolbar-end') as HTMLElement;
    expect(end).toHaveClass('is-bare');
    expect(end.children).toHaveLength(1);
    expect(end.firstElementChild).toHaveAttribute(
      'aria-label',
      'back to the top'
    );
  });

  it('draws no housing for pickers a row does not have', () => {
    // A role page's CV is one document: nothing to pick, only to take away.
    const { container } = render(
      <div className="layout">
        <div className="window-band" />
        <ControlRow
          className="cv-control-bar"
          actions={<button type="button">download</button>}
        />
      </div>
    );
    const housings = container.querySelectorAll(
      '.cv-control-bar > .ui-toolbar'
    );
    expect(housings).toHaveLength(1);
    expect(housings[0]).toHaveClass('ui-toolbar-end');
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
});
