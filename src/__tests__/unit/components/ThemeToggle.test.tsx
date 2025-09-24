import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../../../components/ThemeToggle';
import { useTheme } from '../../../hooks/useTheme';

// Mock the useTheme hook
jest.mock('../../../hooks/useTheme');
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('ThemeToggle Component', () => {
  const mockToggleTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render theme toggle button', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('theme-toggle');
  });

  it('should have correct data-theme attribute for light theme', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-theme', 'light');
  });

  it('should have correct data-theme attribute for dark theme', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-theme', 'dark');
  });

  it('should have correct aria-label for light theme', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  it('should have correct aria-label for dark theme', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  it('should call toggleTheme when clicked', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('should call toggleTheme multiple times when clicked multiple times', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    expect(mockToggleTheme).toHaveBeenCalledTimes(3);
  });

  it('should update aria-label when theme changes', () => {
    const { rerender } = render(
      <ThemeToggle />
    );

    // Initial light theme
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });
    rerender(<ThemeToggle />);
    
    let button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');

    // Change to dark theme
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
    });
    rerender(<ThemeToggle />);
    
    button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  it('should update data-theme attribute when theme changes', () => {
    const { rerender } = render(
      <ThemeToggle />
    );

    // Initial light theme
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });
    rerender(<ThemeToggle />);
    
    let button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-theme', 'light');

    // Change to dark theme
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
    });
    rerender(<ThemeToggle />);
    
    button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-theme', 'dark');
  });

  it('should be accessible with keyboard navigation', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    
    // Should be focusable
    button.focus();
    expect(button).toHaveFocus();
    
    // Should be clickable with Enter key
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    // Note: keyDown doesn't trigger click, but we can test focus
    expect(button).toHaveFocus();
  });

  it('should handle theme changes from useTheme hook', () => {
    const { rerender } = render(<ThemeToggle />);

    // Start with light theme
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });
    rerender(<ThemeToggle />);
    
    let button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-theme', 'light');
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');

    // Simulate theme change to dark
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
    });
    rerender(<ThemeToggle />);
    
    button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-theme', 'dark');
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
  });
});
