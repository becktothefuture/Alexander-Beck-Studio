export const THEME_DARK_CLASS = 'dark-mode';
export const THEME_ATTR = 'data-abs-theme';

export function isDarkThemeDocument(doc = document) {
  const root = doc?.documentElement;
  const body = doc?.body;
  return root?.classList?.contains(THEME_DARK_CLASS)
    || body?.classList?.contains(THEME_DARK_CLASS)
    || root?.getAttribute?.(THEME_ATTR) === 'dark'
    || body?.getAttribute?.(THEME_ATTR) === 'dark';
}

export function applyThemeState(isDark, options = {}) {
  const doc = options.document || document;
  const root = doc?.documentElement;
  const body = doc?.body;
  const targets = [root, body, options.container].filter(Boolean);
  const theme = isDark ? 'dark' : 'light';

  targets.forEach((target) => {
    target.classList?.toggle(THEME_DARK_CLASS, Boolean(isDark));
    target.setAttribute?.(THEME_ATTR, theme);
  });

  if (root?.style) {
    root.style.colorScheme = theme;
  }

  return theme;
}

export function mergeBodyClassWithTheme(className = '', doc = document) {
  const classes = new Set(String(className).split(/\s+/).map((name) => name.trim()).filter(Boolean));
  if (isDarkThemeDocument(doc)) {
    classes.add(THEME_DARK_CLASS);
  } else {
    classes.delete(THEME_DARK_CLASS);
  }
  return Array.from(classes).join(' ');
}
