import { render, screen } from '@testing-library/react';
import React from 'react';
import { SettingsPanelProvider } from '../../../components/SettingsPanelContext';
import { ChatProvider } from '../../../components/chat';
import Layout from '../../../components/layout';
import { getAllSocialLinks } from '../../../config';

// Mock the config
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

// Test wrapper component to provide necessary contexts
const TestWrapper: React.FC<{
  children: React.ReactNode;
  hero?: React.ReactNode;
  collapsibleHero?: boolean;
}> = ({ children, hero, collapsibleHero }) => {
  return (
    <SettingsPanelProvider>
      <ChatProvider>
        <Layout hero={hero} collapsibleHero={collapsibleHero}>
          {children}
        </Layout>
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

  it('should not render a brand link in the header', () => {
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

    const homeLink = screen.getByText('Home');
    const aboutLink = screen.getByText('About');
    const blogLink = screen.getByText('Blog');
    const cvLink = screen.getByText('CV');

    expect(homeLink).toHaveAttribute('href', '/');
    expect(aboutLink).toHaveAttribute('href', '/about');
    expect(blogLink).toHaveAttribute('href', '/blog');
    expect(cvLink).toHaveAttribute('href', '/cv');
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

    const socialLinks = screen.getAllByRole('link');
    const socialLinkElements = socialLinks.filter(
      link =>
        link.getAttribute('data-platform') &&
        link.getAttribute('data-platform') !== 'email'
    );

    expect(socialLinkElements).toHaveLength(3);

    const githubLink = socialLinkElements.find(
      link => link.getAttribute('data-platform') === 'github'
    );
    const linkedinLink = socialLinkElements.find(
      link => link.getAttribute('data-platform') === 'linkedin'
    );
    const twitterLink = socialLinkElements.find(
      link => link.getAttribute('data-platform') === 'twitter'
    );

    expect(githubLink).toHaveAttribute('href', 'https://github.com/test');
    expect(linkedinLink).toHaveAttribute(
      'href',
      'https://linkedin.com/in/test'
    );
    expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/test');
  });

  it('should have correct target and rel attributes for social links', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    const socialLinks = screen.getAllByRole('link');
    const externalLinks = socialLinks.filter(
      link =>
        link.getAttribute('data-platform') &&
        link.getAttribute('data-platform') !== 'email'
    );

    externalLinks.forEach(link => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('should render copyright notice in footer', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    expect(
      screen.getByText(
        `© ${new Date().getFullYear()} all rights reserved, test author`
      )
    ).toBeInTheDocument();
  });

  it('should have proper HTML structure', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    // Check main layout structure
    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('main')).toBeInTheDocument(); // main
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer

    // Check navigation structure
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveClass('nav');
  });

  it('should have correct CSS classes', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    expect(screen.getByRole('banner')).toHaveClass('header-fixed');
    expect(screen.getByRole('main')).toHaveClass('main');
    expect(screen.getByRole('contentinfo')).toHaveClass('footer');
  });

  it('should nest the header, the hero and the window in one stage', () => {
    render(
      <TestWrapper hero={<p data-testid="test-hero">Hero</p>}>
        {mockChildren}
      </TestWrapper>
    );

    const stage = document.querySelector('.stage') as HTMLElement;
    expect(stage).not.toBeNull();

    // The header and the hero sit on the field, outside the scrolling window;
    // only the page's own content is inside it.
    const header = screen.getByRole('banner');
    const hero = screen.getByTestId('test-hero');
    const windowPanel = document.querySelector('.layout') as HTMLElement;

    expect(stage).toContainElement(header);
    expect(stage).toContainElement(hero);
    expect(stage).toContainElement(windowPanel);
    expect(windowPanel).not.toContainElement(header);
    expect(windowPanel).not.toContainElement(hero);
    expect(windowPanel).toContainElement(screen.getByTestId('test-children'));

    // The hero's own region, so a page hero cannot claim a second banner.
    expect(hero.closest('.site-hero')).not.toBeNull();
    expect(screen.getAllByRole('banner')).toHaveLength(1);
  });

  it('should render no hero region when a page has no hero', () => {
    render(<TestWrapper>{mockChildren}</TestWrapper>);

    expect(document.querySelector('.site-hero')).toBeNull();
    expect(document.querySelector('.stage')).not.toBeNull();
    expect(screen.getByTestId('test-children')).toBeInTheDocument();
  });

  it('should only mark the hero collapsible when the page asks for it', () => {
    const { unmount } = render(
      <TestWrapper hero={<p>Hero</p>}>{mockChildren}</TestWrapper>
    );
    expect(document.querySelector('.site-hero')).not.toHaveClass(
      'is-collapsible'
    );
    unmount();

    render(
      <TestWrapper hero={<p>Hero</p>} collapsibleHero>
        {mockChildren}
      </TestWrapper>
    );
    expect(document.querySelector('.site-hero')).toHaveClass('is-collapsible');
  });

  it('should publish the window scroll position as hero collapse progress', () => {
    render(
      <TestWrapper hero={<p>Hero</p>} collapsibleHero>
        {mockChildren}
      </TestWrapper>
    );

    const stage = document.querySelector('.stage') as HTMLElement;
    const windowPanel = document.querySelector('.layout') as HTMLElement;

    // jsdom runs rAF callbacks on a timer, so drive the frame by hand.
    const flushFrame = () => {
      const callbacks: ((time: number) => void)[] = [];
      const raf = jest
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation(cb => {
          callbacks.push(cb);
          return 1;
        });
      windowPanel.dispatchEvent(new Event('scroll'));
      raf.mockRestore();
      callbacks.forEach(cb => cb(0));
    };

    expect(stage.style.getPropertyValue('--hero-collapse')).toBe('0');

    Object.defineProperty(windowPanel, 'scrollTop', {
      value: 80,
      configurable: true,
    });
    flushFrame();
    expect(stage.style.getPropertyValue('--hero-collapse')).toBe('0.5');

    // Past the range it saturates rather than running away.
    Object.defineProperty(windowPanel, 'scrollTop', {
      value: 4000,
      configurable: true,
    });
    flushFrame();
    expect(stage.style.getPropertyValue('--hero-collapse')).toBe('1');
  });

  describe('hero split geometry', () => {
    // jsdom lays nothing out — every box is 0×0 — so the numbers the effect
    // reads have to be planted on the elements by hand, and the ResizeObserver
    // stub has to hand back its callback so the re-measure can be driven.
    const stub = (el: HTMLElement, box: Record<string, number>) => {
      Object.entries(box).forEach(([key, value]) => {
        Object.defineProperty(el, key, { value, configurable: true });
      });
    };

    let observers: (() => void)[] = [];
    let observe: jest.Mock;
    let disconnect: jest.Mock;
    let original: typeof ResizeObserver;

    beforeEach(() => {
      observers = [];
      observe = jest.fn();
      disconnect = jest.fn();
      original = global.ResizeObserver;
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
      global.ResizeObserver = original;
    });

    const pageHero = (
      <header data-testid="page-hero">
        <h1>projects</h1>
        <p>a collection of open source projects.</p>
      </header>
    );

    it('should publish the travel distances the split choreography needs', () => {
      const { unmount } = render(
        <TestWrapper hero={pageHero} collapsibleHero>
          {mockChildren}
        </TestWrapper>
      );

      const heroRegion = document.querySelector('.site-hero') as HTMLElement;
      const container = screen.getByTestId('page-hero');
      stub(container, { clientWidth: 1000 });
      stub(container.querySelector('h1') as HTMLElement, {
        offsetWidth: 200,
        offsetHeight: 60,
      });
      stub(container.querySelector('p') as HTMLElement, {
        offsetWidth: 900,
        offsetHeight: 30,
      });

      // The region is what is watched; the column the boxes travel across is
      // the page's own hero element inside it.
      expect(observe).toHaveBeenCalledWith(heroRegion);
      observers.forEach(callback => callback());

      // Each box travels half of its own leftover space, so at full collapse
      // the title sits on the left edge and the tagline on the right.
      expect(heroRegion.style.getPropertyValue('--title-shift')).toBe('400px');
      expect(heroRegion.style.getPropertyValue('--sub-shift')).toBe('50px');
      // Half of the stacked height is what puts the tagline on the title's row.
      expect(heroRegion.style.getPropertyValue('--row-lift')).toBe('45px');
      // 900 does not fit beside 200 × 0.55 with a 24px gap in 1000, so the
      // tagline gives back exactly the overrun.
      expect(
        Number(heroRegion.style.getPropertyValue('--sub-scale'))
      ).toBeCloseTo((1000 - 200 * 0.55 - 24) / 900, 6);

      unmount();
      expect(disconnect).toHaveBeenCalled();
    });

    it('should leave a tagline that already fits at full size', () => {
      render(
        <TestWrapper hero={pageHero} collapsibleHero>
          {mockChildren}
        </TestWrapper>
      );

      const heroRegion = document.querySelector('.site-hero') as HTMLElement;
      const container = screen.getByTestId('page-hero');
      stub(container, { clientWidth: 1000 });
      stub(container.querySelector('h1') as HTMLElement, {
        offsetWidth: 200,
        offsetHeight: 60,
      });
      stub(container.querySelector('p') as HTMLElement, {
        offsetWidth: 300,
        offsetHeight: 30,
      });
      observers.forEach(callback => callback());

      // Room to spare never becomes a scale-up: the tagline is drawn at its
      // own size, as it is on the homepage.
      expect(heroRegion.style.getPropertyValue('--sub-scale')).toBe('1');
    });

    it('should measure nothing for a hero that is not a title and a tagline', () => {
      render(
        <TestWrapper hero={<p data-testid="bare-hero">Hero</p>} collapsibleHero>
          {mockChildren}
        </TestWrapper>
      );

      const heroRegion = document.querySelector('.site-hero') as HTMLElement;
      observers.forEach(callback => callback());

      expect(heroRegion.style.getPropertyValue('--title-shift')).toBe('');
      expect(heroRegion.style.getPropertyValue('--sub-scale')).toBe('');
    });

    it('should not measure a hero the page has not made collapsible', () => {
      render(<TestWrapper hero={pageHero}>{mockChildren}</TestWrapper>);

      expect(observe).not.toHaveBeenCalled();
      expect(
        (
          document.querySelector('.site-hero') as HTMLElement
        ).style.getPropertyValue('--title-shift')
      ).toBe('');
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
