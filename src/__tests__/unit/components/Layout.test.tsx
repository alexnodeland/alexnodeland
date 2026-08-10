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

  it('should render site name in header when not on home page', () => {
    // Mock window.location to simulate being on a non-home page
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/about',
      },
      writable: true,
    });

    render(<TestWrapper>{mockChildren}</TestWrapper>);

    // The brand ships both spellings — the full name and a short form the
    // mobile stylesheet swaps in — so the link is what carries the href.
    const siteName = screen.getByText('Test Site');
    expect(siteName).toBeInTheDocument();
    expect(siteName).toHaveClass('nav-brand-full');
    expect(screen.getByText('Test')).toHaveClass('nav-brand-short');

    const siteNameLink = siteName.closest('a');
    expect(siteNameLink).toHaveAttribute('href', '/');
    expect(siteNameLink).toHaveClass('nav-link');

    // Whichever spelling is hidden at the current width leaves the a11y tree
    // with it, so the accessible name has to come from the link itself.
    expect(screen.getByRole('link', { name: 'Test Site' })).toBe(siteNameLink);
  });

  it('should not render site name on home page', () => {
    // Mock window.location to simulate being on home page
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
      },
      writable: true,
    });

    render(<TestWrapper>{mockChildren}</TestWrapper>);

    expect(screen.queryByText('Test Site')).not.toBeInTheDocument();
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
      screen.getByText('© 2025 all rights reserved, test author')
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
