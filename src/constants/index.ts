// Application constants
export const APP_NAME = 'Alex Nodeland';
export const APP_VERSION = '1.0.0';

// Theme constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

// Animation durations
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 350,
} as const;

// Breakpoints
export const BREAKPOINTS = {
  MOBILE: '768px',
  TABLET: '1024px',
  DESKTOP: '1200px',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'theme',
} as const;
