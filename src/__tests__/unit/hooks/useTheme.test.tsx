import { act, renderHook } from '@testing-library/react';
import { STORAGE_KEYS, THEMES } from '../../../config';
import { useTheme } from '../../../lib/hooks/useTheme';

// Mock the constants
jest.mock('../../../config', () => ({
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
  },
  STORAGE_KEYS: {
    THEME: 'theme',
  },
}));

describe('useTheme Hook', () => {
  beforeEach(() => {
    // Clear all mocks before each test
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

  it('should initialize with light theme by default', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe(THEMES.LIGHT);
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      THEMES.LIGHT
    );
  });

  it('should initialize with saved theme from localStorage', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(THEMES.DARK);

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe(THEMES.DARK);
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      THEMES.DARK
    );
  });

  it('should initialize with dark theme when system prefers dark', () => {
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

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe(THEMES.DARK);
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      THEMES.DARK
    );
  });

  it('should prioritize saved theme over system preference', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(THEMES.LIGHT);
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

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe(THEMES.LIGHT);
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      THEMES.LIGHT
    );
  });

  it('should toggle theme from light to dark', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe(THEMES.DARK);
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      THEMES.DARK
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.THEME,
      THEMES.DARK
    );
  });

  it('should toggle theme from dark to light', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(THEMES.DARK);

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe(THEMES.LIGHT);
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      THEMES.LIGHT
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.THEME,
      THEMES.LIGHT
    );
  });

  it('should handle multiple toggle calls correctly', () => {
    const { result } = renderHook(() => useTheme());

    // Initial state should be light
    expect(result.current.theme).toBe(THEMES.LIGHT);

    // First toggle to dark
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe(THEMES.DARK);

    // Second toggle back to light
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe(THEMES.LIGHT);

    // Third toggle to dark again
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe(THEMES.DARK);
  });

  it('should call localStorage.getItem with correct key on initialization', () => {
    renderHook(() => useTheme());

    expect(localStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.THEME);
  });

  it('should call localStorage.setItem with correct key and value on toggle', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.THEME,
      THEMES.DARK
    );
  });

  it('should call document.documentElement.setAttribute on initialization', () => {
    renderHook(() => useTheme());

    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      THEMES.LIGHT
    );
  });

  it('should call document.documentElement.setAttribute on toggle', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      THEMES.DARK
    );
  });

  it('should handle invalid localStorage value gracefully', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue('invalid-theme');

    const { result } = renderHook(() => useTheme());

    // Should fall back to system preference or default
    expect(result.current.theme).toBe(THEMES.LIGHT);
  });

  it('should handle localStorage errors gracefully', () => {
    (localStorage.getItem as jest.Mock).mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const { result } = renderHook(() => useTheme());

    // Should still work with system preference or default
    expect(result.current.theme).toBe(THEMES.LIGHT);
  });
});
