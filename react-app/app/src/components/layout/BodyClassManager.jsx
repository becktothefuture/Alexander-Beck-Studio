import { useEffect } from 'react';
import { isDarkThemeDocument, mergeBodyClassWithTheme, THEME_ATTR } from '../../lib/theme-state.js';

function splitClasses(className = '') {
  return String(className).split(/\s+/).map((name) => name.trim()).filter(Boolean);
}

export function BodyClassManager({ className = '', htmlClassName = '' }) {
  useEffect(() => {
    const original = document.body.className;
    const htmlClasses = splitClasses(htmlClassName);
    const theme = isDarkThemeDocument() ? 'dark' : 'light';

    document.body.className = mergeBodyClassWithTheme(className);
    document.body.setAttribute(THEME_ATTR, theme);
    htmlClasses.forEach((name) => document.documentElement.classList.add(name));

    return () => {
      document.body.className = original;
      document.body.setAttribute(THEME_ATTR, isDarkThemeDocument() ? 'dark' : 'light');
      htmlClasses.forEach((name) => document.documentElement.classList.remove(name));
    };
  }, [className, htmlClassName]);

  return null;
}
