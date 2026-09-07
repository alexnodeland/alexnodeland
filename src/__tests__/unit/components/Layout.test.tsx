import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { SettingsPanelProvider } from '../../../components/SettingsPanelContext';
import { ChatProvider } from '../../../components/chat';
import Layout from '../../../components/layout';
import { getAllSocialLinks } from '../../../config';
import { markNotFound } from '../../../lib/notFound';

// Mock the config. The hero registry reads homepageConfig and projectsConfig,
// so this mock has to carry them too — Layout resolves its own hero now.
jest.mock('../../../config', () => ({
  siteConfig: {
    siteName: 'Test Site',
    navigation: {
      main: [
        { name: 'Home', href: '/' },
        { name: 'About', href: '/about' },
        { name: 'Blog', href: '/blog' },
        { name: 'CV', href: '/cv' },
      ],
    },
    contact: {
      email: 'test@example.com',
    },
    author: 'Test Author',
  },
  homepageConfig: {
    hero: {
      title: 'alex nodeland',
      subtitleLinks: [
        { label: 'math', href: '/projects#math' },
        { label: 'ai', href: '/projects#ai' },
      ],
    },
  },
  projectsConfig: {
    title: 'projects',
    subtitle: 'open source projects, tools, and experiments.',
  },
  getAllSocialLinks: jest.fn(() => [
    { platform: 'github', url: 'https://github.com/test' },
    { platform: 'linkedin', url: 'https://linkedin.com/in/test' },
    { platform: 'twitter', url: 'https://twitter.com/test' },
  ]),
}));

// Mock the chat components to avoid complex setup
jest.mock('../../../components/chat/ChatIcon', () => {
  return function MockChatIcon() {
    return <div data-testid="chat-icon">Chat Icon</div>;
  };
});

jest.mock('../../../components/chat/ChatModal', () => {
  return function MockChatModal() {
    return <div data-testid="chat-modal">Chat Modal</div>;
  };
});

jest.mock('../../../components/chat/KeyboardShortcuts', () => {
  return function MockKeyboardShortcuts() {
    return <div data-testid="keyboard-shortcuts">Keyboard Shortcuts</div>;
  };
});

// Test wrapper component to provide necessary contexts. The shell wraps the
// page now (wrapPageElement), so what it is handed is a location and the page
// element — never a hero.
const TestWrapper: React.FC<{
  children: React.ReactNode;
  pathname?: string;
}> = ({ children, pathname = '/nowhere' }) => {
  return (
    <SettingsPanelProvider>
      <ChatProvider>
        <Layout location={{ pathname }}>{children}</Layout>
      </ChatProvider>
    </SettingsPanelProvider>
  );
};

describe('Layout Component', () => {
  const mockChildren = <div data-testid="test-children">Test Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children correctly', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    expect(screen.getByTestId('test-children')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should not render a brand link in the nav', () => {
    // The way home is the breadcrumb in each page's hero title; the nav is
    // just the capsule of page links.
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    expect(screen.queryByText('Test Site')).not.toBeInTheDocument();
    expect(document.querySelector('.nav-brand')).not.toBeInTheDocument();
  });

  it('should render navigation links', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('CV')).toBeInTheDocument();
  });

  it('should have correct href attributes for navigation links', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    expect(screen.getByText('Home')).toHaveAttribute('href', '/');
    expect(screen.getByText('About')).toHaveAttribute('href', '/about');
    expect(screen.getByText('Blog')).toHaveAttribute('href', '/blog');
    expect(screen.getByText('CV')).toHaveAttribute('href', '/cv');
  });

  it('should float the nav capsule outside the stage', () => {
    // It is a control on the field alongside the chat pill now, not a row of
    // chrome inside the page column — so it must not live in the stage.
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    const nav = screen.getByRole('navigation');
    const stage = document.querySelector('.stage') as HTMLElement;

    expect(nav).toHaveClass('nav');
    expect(stage).not.toContainElement(nav);
    expect(document.querySelector('.header-fixed')).toBeNull();
    expect(nav.querySelector('.nav-menu')).not.toBeNull();
  });

  it('should render the nav with no theme toggle', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    const navMenu = document.querySelector('.nav-menu') as HTMLElement;
    expect(navMenu).not.toBeNull();
    // The nav holds the navigation links and nothing else — the theme toggle
    // was removed with light mode.
    expect(navMenu.querySelectorAll('button')).toHaveLength(0);
    expect(navMenu.querySelectorAll('a.nav-link')).toHaveLength(4);
  });

  it('should not set a theme attribute on the document', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('should render email link in footer', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    const emailLink = document.querySelector(
      'a.footer-link[data-platform="email"]'
    ) as HTMLAnchorElement;
    expect(emailLink).not.toBeNull();
    expect(emailLink).toHaveAttribute('href', 'mailto:test@example.com');
    expect(emailLink).toHaveAttribute('data-platform', 'email');
  });

  it('should render social links in footer', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    const socialLinkElements = screen
      .getAllByRole('link')
      .filter(
        link =>
          link.getAttribute('data-platform') &&
          link.getAttribute('data-platform') !== 'email'
      );

    expect(socialLinkElements).toHaveLength(3);

    const byPlatform = (platform: string) =>
      socialLinkElements.find(
        link => link.getAttribute('data-platform') === platform
      );

    expect(byPlatform('github')).toHaveAttribute(
      'href',
      'https://github.com/test'
    );
    expect(byPlatform('linkedin')).toHaveAttribute(
      'href',
      'https://linkedin.com/in/test'
    );
    expect(byPlatform('twitter')).toHaveAttribute(
      'href',
      'https://twitter.com/test'
    );
  });

  it('should draw every footer mark inline in one stroked set', () => {
    // The vendor logos were data-URI backgrounds — a mix of outline and solid
    // marks inverted to white. They are one inline monoline set now, taking
    // currentColor, so the hover is the link's own colour change.
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    const icons = document.querySelectorAll('.footer-link .icon svg');
    // email + the three social links
    expect(icons).toHaveLength(4);
    icons.forEach(icon => {
      expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
      expect(icon).toHaveAttribute('stroke', 'currentColor');
      expect(icon).toHaveAttribute('fill', 'none');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    // The links are icon-only, so each carries its own name.
    document.querySelectorAll('.footer-link').forEach(link => {
      expect(link.getAttribute('aria-label')).toBeTruthy();
    });
  });

  it('should have correct target and rel attributes for social links', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    screen
      .getAllByRole('link')
      .filter(
        link =>
          link.getAttribute('data-platform') &&
          link.getAttribute('data-platform') !== 'email'
      )
      .forEach(link => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
  });

  it('should render copyright notice in footer', () => {
    const { container } = render(<TestWrapper>{mockChildren}</TestWrapper>);

    // Read as one line rather than one text node: the name is wrapped in its
    // own element so a narrow phone cannot break it across two lines.
    expect(container.querySelector('.footer-copyright')).toHaveTextContent(
      `© ${new Date().getFullYear()} all rights reserved, test author`
    );
  });

  it('should have proper HTML structure', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveClass('nav');
  });

  it('should have correct CSS classes', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    expect(screen.getByRole('main')).toHaveClass('main');
    expect(screen.getByRole('contentinfo')).toHaveClass('footer');
  });

  describe('hero resolution', () => {
    // The hero is no longer handed up by the page: the shell mounts once and
    // reads the path.
    it('should wear the cover on the homepage', () => {
      render(<TestWrapper pathname="/">{mockChildren}</TestWrapper>);

      const region = document.querySelector('.site-hero') as HTMLElement;
      expect(region.querySelector('.hero')).not.toBeNull();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'alex nodeland'
      );
      // The cover title is the brand anchor itself; the subtitle links out to
      // the projects page's sections.
      expect(region.querySelector('h1[data-brand-anchor]')).not.toBeNull();
      expect(region.querySelectorAll('.hero-subtitle-link')).toHaveLength(2);
    });

    it.each([
      ['/blog', '.blog-header', 'blog', 'notes and press.'],
      [
        '/projects',
        '.projects-header',
        'projects',
        'open source projects, tools, and experiments.',
      ],
      ['/cv', '.cv-page-header', 'cv', 'roles, research, and skills.'],
    ])(
      'should wear the %s crumb hero',
      (pathname, selector, label, tagline) => {
        render(<TestWrapper pathname={pathname}>{mockChildren}</TestWrapper>);

        const region = document.querySelector('.site-hero') as HTMLElement;
        expect(region.querySelector(selector)).not.toBeNull();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
          `alex → ${label}`
        );
        expect(screen.getByText(tagline)).toBeInTheDocument();

        // The crumb is the way home and the thing the brand FLIP lands on.
        const crumb = region.querySelector(
          'a.hero-crumb[data-brand-anchor]'
        ) as HTMLAnchorElement;
        expect(crumb).toHaveAttribute('href', '/');
      }
    );

    it('should tolerate a trailing slash', () => {
      render(<TestWrapper pathname="/blog/">{mockChildren}</TestWrapper>);

      expect(document.querySelector('.blog-header')).not.toBeNull();
    });

    it.each([['/blog/some-post'], ['/not-a-page']])(
      'should wear the brand alone, pinned folded, on %s',
      pathname => {
        render(<TestWrapper pathname={pathname}>{mockChildren}</TestWrapper>);

        const region = document.querySelector('.site-hero') as HTMLElement;
        // A page with no title of its own still carries the way home: the
        // crumb without its tail, worn folded from the start so it sits on
        // the line the other heroes fold to.
        expect(region.querySelector('.brand-header')).not.toBeNull();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
          'alex'
        );
        expect(
          region.querySelector('a.hero-crumb[data-brand-anchor]')
        ).toHaveAttribute('href', '/');
        expect(region).toHaveClass('is-collapsible');
        expect(document.querySelector('.stage')).toHaveClass('is-pinned');
      }
    );

    it('should mark every real hero collapsible', () => {
      ['/', '/blog', '/projects', '/cv'].forEach(pathname => {
        const { unmount } = render(
          <TestWrapper pathname={pathname}>{mockChildren}</TestWrapper>
        );
        expect(document.querySelector('.site-hero')).toHaveClass(
          'is-collapsible'
        );
        unmount();
      });
    });
  });

  it('should nest the hero and the window in one stage', () => {
    render(<TestWrapper pathname="/blog">{mockChildren}</TestWrapper>);

    const stage = document.querySelector('.stage') as HTMLElement;
    expect(stage).not.toBeNull();

    // The hero sits on the field, outside the scrolling window; only the
    // page's own content is inside it.
    const region = document.querySelector('.site-hero') as HTMLElement;
    const windowPanel = document.querySelector('.layout') as HTMLElement;

    expect(stage).toContainElement(region);
    expect(stage).toContainElement(windowPanel);
    expect(windowPanel).not.toContainElement(region);
    expect(windowPanel).toContainElement(screen.getByTestId('test-children'));

    // The heroes are still <header> elements, so each one is wrapped in the
    // region rather than sitting loose in the stage — the shell contributes
    // no header of its own now that the nav has left it.
    expect(stage.querySelectorAll(':scope > header')).toHaveLength(0);
    screen.queryAllByRole('banner').forEach(banner => {
      expect(region).toContainElement(banner);
    });
  });

  describe('navigation transition', () => {
    // jsdom implements neither Element.animate nor layout, so what is under
    // test here is the bookkeeping: the hero swaps for the new path, the
    // window goes back to the top, and none of it fires on first mount.
    const Shell: React.FC<{ pathname: string; label: string }> = ({
      pathname,
      label,
    }) => (
      <SettingsPanelProvider>
        <ChatProvider>
          <Layout location={{ pathname }}>
            <div data-testid="page">{label}</div>
          </Layout>
        </ChatProvider>
      </SettingsPanelProvider>
    );

    it('should swap the hero when the path changes', () => {
      const { rerender } = render(<Shell pathname="/blog" label="blog" />);
      expect(document.querySelector('.blog-header')).not.toBeNull();

      act(() => {
        rerender(<Shell pathname="/cv" label="cv" />);
      });

      expect(document.querySelector('.blog-header')).toBeNull();
      expect(document.querySelector('.cv-page-header')).not.toBeNull();
      expect(screen.getByTestId('page')).toHaveTextContent('cv');
    });

    it('should keep the shell itself across a navigation', () => {
      const { rerender } = render(<Shell pathname="/blog" label="blog" />);
      const windowPanel = document.querySelector('.layout');
      const nav = document.querySelector('.nav');

      act(() => {
        rerender(<Shell pathname="/cv" label="cv" />);
      });

      // Same nodes, not replacements: this is what stops the frame blinking
      // and the chat pill replaying its entry on every link.
      expect(document.querySelector('.layout')).toBe(windowPanel);
      expect(document.querySelector('.nav')).toBe(nav);
    });

    it('should put the window back to the top on a new path', () => {
      const { rerender } = render(<Shell pathname="/blog" label="blog" />);
      const windowPanel = document.querySelector('.layout') as HTMLElement;
      windowPanel.scrollTop = 400;

      act(() => {
        rerender(<Shell pathname="/cv" label="cv" />);
      });

      expect(windowPanel.scrollTop).toBe(0);
      // The reset lands on the veil itself — the one element that reads it.
      const veil = document.querySelector('.window-veil') as HTMLElement;
      expect(veil.style.getPropertyValue('--veil-strength')).toBe('0');
      expect(windowPanel.style.getPropertyValue('--veil-strength')).toBe('');
    });

    describe('the crossfade', () => {
      // jsdom has no Element.animate, so the animated path only runs with one
      // stubbed in. `finished` is left pending on purpose: the ghost is meant
      // to be on screen for the length of its exit, and that is the thing
      // being asserted.
      let animate: jest.Mock;

      beforeEach(() => {
        animate = jest.fn(() => ({
          finished: new Promise<void>(() => {}),
          cancel: jest.fn(),
        }));
        (Element.prototype as unknown as { animate: unknown }).animate =
          animate;
      });

      afterEach(() => {
        delete (Element.prototype as unknown as { animate?: unknown }).animate;
      });

      it('should keep the outgoing hero on screen while the new one arrives', () => {
        const { rerender } = render(<Shell pathname="/blog" label="blog" />);

        act(() => {
          rerender(<Shell pathname="/cv" label="cv" />);
        });

        // Both heroes exist in the same frame — the swap is immediate and the
        // one that is leaving is held as a ghost, so there is never a moment
        // with no hero at all.
        const ghost = document.querySelector('.hero-ghost') as HTMLElement;
        expect(ghost).not.toBeNull();
        expect(ghost.querySelector('.blog-header')).not.toBeNull();
        expect(
          document.querySelector('.site-hero:not(.hero-ghost)')
        ).toContainElement(document.querySelector('.cv-page-header'));

        // It is a picture of a page that is gone, so nothing can reach it.
        expect(ghost).toHaveAttribute('aria-hidden', 'true');
        expect(ghost).toHaveAttribute('inert');

        // And it wears the collapse the reader was actually looking at rather
        // than the resting one the live region has gone back to.
        expect(ghost.style.getPropertyValue('--hero-collapse')).toBe('0');
      });

      it('should drop the ghost once its exit finishes', async () => {
        let finish: () => void = () => {};
        animate.mockImplementation(() => ({
          finished: new Promise<void>(resolve => {
            finish = resolve;
          }),
          cancel: jest.fn(),
        }));

        const { rerender } = render(<Shell pathname="/blog" label="blog" />);
        act(() => {
          rerender(<Shell pathname="/cv" label="cv" />);
        });
        expect(document.querySelector('.hero-ghost')).not.toBeNull();

        await act(async () => {
          finish();
        });

        expect(document.querySelector('.hero-ghost')).toBeNull();
      });

      it('should ghost the pinned brand, folded, when leaving a post', () => {
        const { rerender } = render(
          <Shell pathname="/blog/a-post" label="post" />
        );

        act(() => {
          rerender(<Shell pathname="/cv" label="cv" />);
        });

        // The brand was on screen, folded; it leaves as it stood while the
        // crumb hero rises in under it.
        const ghost = document.querySelector('.hero-ghost') as HTMLElement;
        expect(ghost).not.toBeNull();
        expect(ghost).toHaveClass('is-pinned');
        expect(ghost.style.getPropertyValue('--hero-collapse')).toBe('1');
        expect(document.querySelector('.cv-page-header')).not.toBeNull();
      });
    });

    it('should leave a hash-only change alone', () => {
      // The projects page resolves its own anchors; the shell must not fight
      // it by resetting the scroll under it.
      const { rerender } = render(
        <Shell pathname="/projects" label="projects" />
      );
      const windowPanel = document.querySelector('.layout') as HTMLElement;
      windowPanel.scrollTop = 400;

      act(() => {
        rerender(<Shell pathname="/projects" label="projects" />);
      });

      expect(windowPanel.scrollTop).toBe(400);
    });
  });

  // The ResizeObserver stub hands back its callback so a re-measure can be
  // driven by hand; both the fold and the split geometry lean on it.
  let observers: (() => void)[] = [];
  let observe: jest.Mock;
  let disconnect: jest.Mock;
  let originalResizeObserver: typeof ResizeObserver;

  beforeEach(() => {
    observers = [];
    observe = jest.fn();
    disconnect = jest.fn();
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = class {
      observe = observe;
      unobserve = jest.fn();
      disconnect = disconnect;
      constructor(callback: () => void) {
        observers.push(callback);
      }
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
  });

  describe('the hero fold', () => {
    it('should mark the stage on a page whose hero folds, and not on a post', () => {
      const { unmount } = render(
        <TestWrapper pathname="/blog">{mockChildren}</TestWrapper>
      );
      expect(document.querySelector('.stage')).toHaveClass('has-fold');
      // The window is three layers plus the band the content starts under.
      const layout = document.querySelector('.layout') as HTMLElement;
      expect(layout.parentElement).toHaveClass('window');
      expect(document.querySelector('.window-frame')).not.toBeNull();
      expect(document.querySelector('.window-edge')).not.toBeNull();
      expect(layout.firstElementChild).toHaveClass('window-band');
      unmount();

      // A post wears the brand pinned folded: the stage folds, and says so.
      render(<TestWrapper pathname="/blog/a-post">{mockChildren}</TestWrapper>);
      expect(document.querySelector('.stage')).toHaveClass('has-fold');
      expect(document.querySelector('.stage')).toHaveClass('is-pinned');
    });

    // jsdom has no CSS.supports, so this is the published path: the browsers
    // that cannot run the fold off the scroll timeline get the progress
    // written once per frame, on the three elements that read it.
    it('should publish the scroll progress across the band on the fallback path', () => {
      render(<TestWrapper pathname="/blog">{mockChildren}</TestWrapper>);

      const stage = document.querySelector('.stage') as HTMLElement;
      const region = document.querySelector('.site-hero') as HTMLElement;
      const frame = document.querySelector('.window-frame') as HTMLElement;
      const edge = document.querySelector('.window-edge') as HTMLElement;
      const windowPanel = document.querySelector('.layout') as HTMLElement;

      // jsdom lays nothing out, so the band — the hero's bottom less the
      // window's top — is planted: 100px.
      Object.defineProperty(region, 'getBoundingClientRect', {
        value: () => ({ bottom: 200 }),
        configurable: true,
      });
      Object.defineProperty(windowPanel, 'getBoundingClientRect', {
        value: () => ({ top: 100 }),
        configurable: true,
      });

      // jsdom runs rAF callbacks on a timer, so drive the frame by hand. Two
      // scroll events land in the same frame here on purpose: the value is
      // published once per frame however many arrive (the veil's publisher
      // shares the event and queues a frame of its own).
      const scrollTo = (top: number) => {
        const queue: ((time: number) => void)[] = [];
        const raf = jest
          .spyOn(window, 'requestAnimationFrame')
          .mockImplementation(cb => {
            queue.push(cb);
            return 1;
          });
        Object.defineProperty(windowPanel, 'scrollTop', {
          value: top,
          configurable: true,
        });
        windowPanel.dispatchEvent(new Event('scroll'));
        windowPanel.dispatchEvent(new Event('scroll'));
        queue.forEach(cb => cb(performance.now()));
        raf.mockRestore();
      };

      // The band is read back when the hero is measured; the measurement is
      // driven by the ResizeObserver stub above.
      observers.forEach(callback => callback());

      expect(region.style.getPropertyValue('--hero-collapse')).toBe('0');

      scrollTo(10);
      for (const reader of [region, frame, edge]) {
        expect(reader.style.getPropertyValue('--hero-collapse')).toBe('0.1');
      }
      expect(region).not.toHaveClass('is-folded');

      // A fifth of the way in the phone's tagline has faded, and is taken
      // out of hit-testing.
      scrollTo(50);
      expect(region.style.getPropertyValue('--hero-collapse')).toBe('0.5');
      expect(region).toHaveClass('is-folded');

      // Past the band it saturates rather than running away.
      scrollTo(4000);
      expect(region.style.getPropertyValue('--hero-collapse')).toBe('1');
      expect(region).toHaveClass('is-folded');

      scrollTo(0);
      expect(region.style.getPropertyValue('--hero-collapse')).toBe('0');
      expect(region).not.toHaveClass('is-folded');

      // And never on the stage or the window: a custom property inherits, and
      // a per-frame write there would restyle the whole page.
      expect(stage.style.getPropertyValue('--hero-collapse')).toBe('');
      expect(windowPanel.style.getPropertyValue('--hero-collapse')).toBe('');
    });
  });

  describe('hero split geometry', () => {
    // jsdom lays nothing out — every box is 0×0 — so the numbers the effect
    // reads have to be planted on the elements by hand.
    const stub = (el: HTMLElement, box: Record<string, number>) => {
      Object.entries(box).forEach(([key, value]) => {
        Object.defineProperty(el, key, { value, configurable: true });
      });
    };

    const plant = (widths: { title: number; sub: number }) => {
      const heroRegion = document.querySelector('.site-hero') as HTMLElement;
      const container = heroRegion.firstElementChild as HTMLElement;
      stub(container, { clientWidth: 1000 });
      stub(container.querySelector('h1') as HTMLElement, {
        offsetWidth: widths.title,
        offsetHeight: 60,
      });
      stub(container.querySelector('p') as HTMLElement, {
        offsetWidth: widths.sub,
        offsetHeight: 30,
      });
      return heroRegion;
    };

    it('should publish the travel distances the split choreography needs', () => {
      const { unmount } = render(
        <TestWrapper pathname="/projects">{mockChildren}</TestWrapper>
      );

      const heroRegion = plant({ title: 200, sub: 900 });

      // The region is what is watched; the column the boxes travel across is
      // the hero element inside it.
      expect(observe).toHaveBeenCalledWith(heroRegion);
      observers.forEach(callback => callback());

      // Each box travels half of its own leftover space, so at full collapse
      // the title sits on the left edge and the tagline on the right.
      expect(heroRegion.style.getPropertyValue('--title-shift')).toBe('400px');
      expect(heroRegion.style.getPropertyValue('--sub-shift')).toBe('50px');
      // Half of the stacked height is what puts the tagline on the title's
      // row. It lands on the stage, with the resting height, because the
      // window's frame reads the band the two make and it is not in the
      // hero's subtree.
      const stage = document.querySelector('.stage') as HTMLElement;
      expect(stage.style.getPropertyValue('--row-lift')).toBe('45px');
      expect(stage.style.getPropertyValue('--hero-rest-height')).toBe('0px');
      // The title's centre line, from its planted 60px box at the top of the
      // region, and the nav capsule's (0 in jsdom, which lays nothing out):
      // the phone's fold carries the one to the other.
      expect(heroRegion.style.getPropertyValue('--title-centre')).toBe('30px');
      expect(stage.style.getPropertyValue('--rail-centre')).toBe('0px');
      // 900 does not fit beside 200 × 0.55 with a 24px gap in 1000, so the
      // tagline gives back exactly the overrun.
      expect(
        Number(heroRegion.style.getPropertyValue('--sub-scale'))
      ).toBeCloseTo((1000 - 200 * 0.55 - 24) / 900, 6);

      unmount();
      expect(disconnect).toHaveBeenCalled();
    });

    it('should leave a tagline that already fits at full size', () => {
      render(<TestWrapper pathname="/projects">{mockChildren}</TestWrapper>);

      const heroRegion = plant({ title: 200, sub: 300 });
      observers.forEach(callback => callback());

      // Room to spare never becomes a scale-up: the tagline is drawn at its
      // own size, as it is on the homepage.
      expect(heroRegion.style.getPropertyValue('--sub-scale')).toBe('1');
    });

    it('should re-measure when the hero itself changes', () => {
      const Shell: React.FC<{ pathname: string }> = ({ pathname }) => (
        <SettingsPanelProvider>
          <ChatProvider>
            <Layout location={{ pathname }}>{mockChildren}</Layout>
          </ChatProvider>
        </SettingsPanelProvider>
      );

      const { rerender } = render(<Shell pathname="/projects" />);
      observe.mockClear();

      act(() => {
        rerender(<Shell pathname="/cv" />);
      });

      // New hero, new text, new distances — the observer is re-armed on the
      // hero's identity rather than only on the collapsible flag.
      expect(observe).toHaveBeenCalled();
    });

    it('should measure the pinned brand too, for the row it sits on', () => {
      render(<TestWrapper pathname="/blog/a-post">{mockChildren}</TestWrapper>);

      const heroRegion = document.querySelector('.site-hero') as HTMLElement;
      // The brand folds onto the same line the crumb heroes do, from the
      // same measurements.
      expect(observe).toHaveBeenCalledWith(heroRegion);
      expect(heroRegion.style.getPropertyValue('--title-centre')).toBe('0px');
    });
  });

  it('should handle empty children', () => {
    render(<TestWrapper>{null}</TestWrapper>);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeEmptyDOMElement();
  });

  it('should handle multiple children', () => {
    const multipleChildren = (
      <>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
      </>
    );

    render(<TestWrapper>{multipleChildren}</TestWrapper>);

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('should call getAllSocialLinks', () => {
    // Clear previous calls from other tests
    (getAllSocialLinks as jest.Mock).mockClear();

    render(<TestWrapper>{mockChildren}</TestWrapper>);

    // The function should be called at least once (React StrictMode may cause double calls)
    expect(getAllSocialLinks).toHaveBeenCalledWith();
    expect(getAllSocialLinks).toHaveBeenCalled();
  });
});

describe('the 404 hero', () => {
  const mockChildren = <div>Test Content</div>;

  afterEach(() => {
    act(() => markNotFound(false));
  });

  it('wears the 404 crumb hero while the not-found flag is up', () => {
    render(<TestWrapper pathname="/not-a-page">{mockChildren}</TestWrapper>);
    const region = document.querySelector('.site-hero') as HTMLElement;
    // Until the page raises its flag the address is just one with no hero of
    // its own, and wears the brand alone.
    expect(region.querySelector('.brand-header')).not.toBeNull();

    act(() => markNotFound(true));
    expect(region.querySelector('.not-found-header')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'alex → 404'
    );
    expect(
      screen.getByText('nothing here. the page came apart.')
    ).toBeInTheDocument();

    act(() => markNotFound(false));
    expect(region.querySelector('.brand-header')).not.toBeNull();
  });
});

describe('scrolling the window from the field', () => {
  const mockChildren = <div>Test Content</div>;

  it('forwards a wheel turned outside the window to the window', () => {
    render(<TestWrapper pathname="/blog">{mockChildren}</TestWrapper>);
    const panel = document.querySelector('.layout') as HTMLElement;
    panel.scrollTop = 0;

    act(() => {
      document.body.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 120, bubbles: true })
      );
    });
    expect(panel.scrollTop).toBe(120);
  });

  it('leaves a wheel turned inside the window to the browser', () => {
    render(<TestWrapper pathname="/blog">{mockChildren}</TestWrapper>);
    const panel = document.querySelector('.layout') as HTMLElement;
    panel.scrollTop = 0;

    act(() => {
      screen
        .getByText('Test Content')
        .dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true }));
    });
    expect(panel.scrollTop).toBe(0);
  });

  it('scrolls the window on PageDown when nothing has focus', () => {
    render(<TestWrapper pathname="/blog">{mockChildren}</TestWrapper>);
    const panel = document.querySelector('.layout') as HTMLElement;
    panel.scrollTop = 0;
    Object.defineProperty(panel, 'clientHeight', {
      value: 1000,
      configurable: true,
    });
    (document.activeElement as HTMLElement | null)?.blur();

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true })
      );
    });
    expect(panel.scrollTop).toBe(850);
  });

  it('is focusable, so a click inside hands it the keyboard', () => {
    render(<TestWrapper pathname="/blog">{mockChildren}</TestWrapper>);
    expect(document.querySelector('.layout')).toHaveAttribute('tabindex', '-1');
  });
});
