import { useState, useEffect } from 'react';
import { THEMES, STORAGE_KEYS } from '../constants';

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(THEMES.LIGHT);

  useEffect(() => {
    try {
      // Check for saved theme preference or default to light
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as
        | 'light'
        | 'dark'
        | null;
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

      // Validate saved theme
      const validSavedTheme = savedTheme === THEMES.LIGHT || savedTheme === THEMES.DARK ? savedTheme : null;
      
      const initialTheme =
        validSavedTheme || (prefersDark ? THEMES.DARK : THEMES.LIGHT);
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    } catch (error) {
      // Fallback to system preference or default
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      const initialTheme = prefersDark ? THEMES.DARK : THEMES.LIGHT;
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
  };

  return { theme, toggleTheme };
};
