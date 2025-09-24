import { render, screen } from '@testing-library/react';
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

// Mock the ThemeToggle component
jest.mock('../../../components/ThemeToggle', () => {
  return function MockThemeToggle() {
    return <button data-testid="theme-toggle">Theme Toggle</button>;
  };
});

// Mock the SettingsPanel hook
jest.mock('../../../components/SettingsPanelContext', () => ({
  useSettingsPanel: () => ({
    isSettingsPanelOpen: false,
    isClosingSettingsPanel: false,
    setSettingsPanelOpen: jest.fn(),
    setClosingSettingsPanel: jest.fn(),
  }),
}));

describe('Layout Component', () => {
  const mockChildren = <div data-testid="test-children">Test Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children correctly', () => {
    render(<Layout>{mockChildren}</Layout>);

    expect(screen.getByTestId('test-children')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render site name in header', () => {
    render(<Layout>{mockChildren}</Layout>);

    const siteNameLink = screen.getByText('Test Site');
    expect(siteNameLink).toBeInTheDocument();
    expect(siteNameLink).toHaveAttribute('href', '/');
    expect(siteNameLink).toHaveClass('nav-link');
  });

  it('should render navigation links', () => {
    render(<Layout>{mockChildren}</Layout>);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('CV')).toBeInTheDocument();
  });

  it('should have correct href attributes for navigation links', () => {
    render(<Layout>{mockChildren}</Layout>);

    const homeLink = screen.getByText('Home');
    const aboutLink = screen.getByText('About');
    const blogLink = screen.getByText('Blog');
    const cvLink = screen.getByText('CV');

    expect(homeLink).toHaveAttribute('href', '/');
    expect(aboutLink).toHaveAttribute('href', '/about');
    expect(blogLink).toHaveAttribute('href', '/blog');
    expect(cvLink).toHaveAttribute('href', '/cv');
  });

  it('should render theme toggle in navigation', () => {
    render(<Layout>{mockChildren}</Layout>);

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('should render email link in footer', () => {
    render(<Layout>{mockChildren}</Layout>);

    const emailLink = document.querySelector(
      'a.footer-link[data-platform="email"]'
    ) as HTMLAnchorElement;
    expect(emailLink).not.toBeNull();
    expect(emailLink).toHaveAttribute('href', 'mailto:test@example.com');
    expect(emailLink).toHaveAttribute('data-platform', 'email');
  });

  it('should render social links in footer', () => {
    render(<Layout>{mockChildren}</Layout>);

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
    render(<Layout>{mockChildren}</Layout>);

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
    render(<Layout>{mockChildren}</Layout>);

    expect(
      screen.getByText('© 2025 all rights reserved, test author')
    ).toBeInTheDocument();
  });

  it('should have proper HTML structure', () => {
    render(<Layout>{mockChildren}</Layout>);

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
    render(<Layout>{mockChildren}</Layout>);

    expect(screen.getByRole('banner')).toHaveClass('header-fixed');
    expect(screen.getByRole('main')).toHaveClass('main');
    expect(screen.getByRole('contentinfo')).toHaveClass('footer');
  });

  it('should handle empty children', () => {
    render(<Layout>{null}</Layout>);

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

    render(<Layout>{multipleChildren}</Layout>);

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('should call getAllSocialLinks', () => {
    render(<Layout>{mockChildren}</Layout>);

    expect(getAllSocialLinks).toHaveBeenCalledTimes(1);
  });
});
