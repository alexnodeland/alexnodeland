import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Layout from '../../components/layout';
import ThemeToggle from '../../components/ThemeToggle';
import { useTheme } from '../../hooks/useTheme';

// Mock the config
jest.mock('../../config', () => ({
  siteConfig: {
    siteName: 'Test Site',
    navigation: {
      main: [
        { name: 'Home', href: '/' },
        { name: 'About', href: '/about' },
      ],
    },
    contact: {
      email: 'test@example.com',
    },
    author: 'Test Author',
  },
  getAllSocialLinks: jest.fn(() => [
    { platform: 'github', url: 'https://github.com/test' },
  ]),
}));

// Mock the MDXProvider component
jest.mock('../../components/mdx/MDXProvider', () => {
  return function MockMDXProvider({ children }: { children: React.ReactNode }) {
    return <div data-testid="mdx-provider">{children}</div>;
  };
});

describe.skip('Theme System Integration', () => {
  const TestComponent = () => {
    const { theme } = useTheme();
    return (
      <div data-testid="theme-display" data-theme={theme}>
        Current theme: {theme}
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset localStorage mock
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    (localStorage.setItem as jest.Mock).mockImplementation(() => {});
    
    // Reset matchMedia mock
    (window.matchMedia as jest.Mock).mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });
    
    // Reset document.documentElement.setAttribute
    document.documentElement.setAttribute = jest.fn();
  });

  describe('Layout and ThemeToggle Integration', () => {
    it('should render Layout with ThemeToggle', () => {
      render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      expect(screen.getByTestId('theme-display')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument(); // ThemeToggle button
    });

    it('should update theme when ThemeToggle is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeDisplay = screen.getByTestId('theme-display');
      const themeToggle = screen.getByRole('button');
      
      // Initial theme should be light
      expect(themeDisplay).toHaveAttribute('data-theme', 'light');
      
      // Click theme toggle
      await user.click(themeToggle);
      
      // Theme should change to dark
      await waitFor(() => {
        expect(themeDisplay).toHaveAttribute('data-theme', 'dark');
      });
    });

    it('should persist theme changes in localStorage', async () => {
      const user = userEvent.setup();
      
      render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeToggle = screen.getByRole('button');
      
      // Click theme toggle
      await user.click(themeToggle);
      
      // Should save to localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should update document attribute when theme changes', async () => {
      const user = userEvent.setup();
      
      render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeToggle = screen.getByRole('button');
      
      // Click theme toggle
      await user.click(themeToggle);
      
      // Should update document attribute
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });
  });

  describe('Theme Persistence Across Renders', () => {
    it('should restore theme from localStorage on mount', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('dark');
      
      render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeDisplay = screen.getByTestId('theme-display');
      expect(themeDisplay).toHaveAttribute('data-theme', 'dark');
    });

    it('should use system preference when no saved theme', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });
      
      render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeDisplay = screen.getByTestId('theme-display');
      expect(themeDisplay).toHaveAttribute('data-theme', 'dark');
    });

    it('should prioritize saved theme over system preference', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('light');
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });
      
      render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeDisplay = screen.getByTestId('theme-display');
      expect(themeDisplay).toHaveAttribute('data-theme', 'light');
    });
  });

  describe('Multiple Theme Toggle Interactions', () => {
    it('should handle multiple rapid theme toggles', async () => {
      const user = userEvent.setup();
      
      render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeDisplay = screen.getByTestId('theme-display');
      const themeToggle = screen.getByRole('button');
      
      // Multiple rapid clicks
      await user.click(themeToggle);
      await user.click(themeToggle);
      await user.click(themeToggle);
      
      // Should end up in dark theme (light -> dark -> light -> dark)
      await waitFor(() => {
        expect(themeDisplay).toHaveAttribute('data-theme', 'dark');
      });
    });

    it('should maintain theme state across component re-renders', async () => {
      const user = userEvent.setup();
      
      const { rerender } = render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeToggle = screen.getByRole('button');
      
      // Change theme
      await user.click(themeToggle);
      
      // Re-render component
      rerender(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeDisplay = screen.getByTestId('theme-display');
      expect(themeDisplay).toHaveAttribute('data-theme', 'dark');
    });
  });

  describe('Theme Toggle Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeToggle = screen.getByRole('button');
      expect(themeToggle).toHaveAttribute('aria-label');
      expect(themeToggle).toHaveAttribute('data-theme');
    });

    it('should update ARIA label when theme changes', async () => {
      const user = userEvent.setup();
      
      render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeToggle = screen.getByRole('button');
      
      // Initial ARIA label should mention switching to dark
      expect(themeToggle).toHaveAttribute('aria-label', 'Switch to dark mode');
      
      // Click to change theme
      await user.click(themeToggle);
      
      // ARIA label should update to mention switching to light
      await waitFor(() => {
        expect(themeToggle).toHaveAttribute('aria-label', 'Switch to light mode');
      });
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      
      render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeToggle = screen.getByRole('button');
      const themeDisplay = screen.getByTestId('theme-display');
      
      // Focus and activate with keyboard
      themeToggle.focus();
      expect(themeToggle).toHaveFocus();
      
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(themeDisplay).toHaveAttribute('data-theme', 'dark');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock localStorage to throw error
      (localStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      render(
        <Layout>
          <TestComponent />
        </Layout>
      );
      
      const themeToggle = screen.getByRole('button');
      
      // Should not throw error when clicking toggle
      await expect(user.click(themeToggle)).resolves.not.toThrow();
    });

    it('should handle matchMedia errors gracefully', () => {
      // Mock matchMedia to throw error
      (window.matchMedia as jest.Mock).mockImplementation(() => {
        throw new Error('matchMedia error');
      });
      
      // Should not throw error when rendering
      expect(() => {
        render(
          <Layout>
            <TestComponent />
          </Layout>
        );
      }).not.toThrow();
    });
  });
});
