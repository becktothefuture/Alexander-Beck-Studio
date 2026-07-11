import { useLayoutEffect } from 'react';
import {
  THEME_ATTR,
  THEME_DARK_CLASS,
  isDarkThemeDocument,
  mergeBodyClassWithTheme,
} from '../../lib/theme-state.js';

function splitClasses(className = '') {
  return String(className).split(/\s+/).map((name) => name.trim()).filter(Boolean);
}

export function BodyClassManager({ className = '', htmlClassName = '', routeId = '' }) {
  useLayoutEffect(() => {
    const original = splitClasses(document.body.className)
      .filter((name) => name !== THEME_DARK_CLASS)
      .join(' ');
    const originalRouteId = document.documentElement.dataset.shellRoute;
    const htmlClasses = splitClasses(htmlClassName);
    const theme = isDarkThemeDocument() ? 'dark' : 'light';

    document.body.className = mergeBodyClassWithTheme(className);
    document.body.setAttribute(THEME_ATTR, theme);
    if (routeId) document.documentElement.dataset.shellRoute = routeId;
    htmlClasses.forEach((name) => document.documentElement.classList.add(name));

    return () => {
      const restoredTheme = isDarkThemeDocument() ? 'dark' : 'light';
      document.body.className = mergeBodyClassWithTheme(original);
      document.body.setAttribute(THEME_ATTR, restoredTheme);
      if (originalRouteId) document.documentElement.dataset.shellRoute = originalRouteId;
      else delete document.documentElement.dataset.shellRoute;
      htmlClasses.forEach((name) => document.documentElement.classList.remove(name));
    };
  }, [className, htmlClassName, routeId]);

  return null;
}
