export const THEME_DARK_CLASS = 'dark-mode';
export const THEME_ATTR = 'data-abs-theme';
export const THEME_CHANGE_EVENT = 'abs:theme-changed';
export const THEME_STORAGE_KEY = 'theme-preference-v2';
export const LEGACY_THEME_STORAGE_KEY = 'theme-preference';

const VALID_THEME_PREFERENCES = new Set(['auto', 'light', 'dark']);

export function normalizeThemePreference(value, fallback = 'auto') {
  return VALID_THEME_PREFERENCES.has(value) ? value : fallback;
}

function getLocalStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function readThemePreference(storage = getLocalStorage()) {
  if (!storage) return 'auto';

  try {
    const saved = storage.getItem(THEME_STORAGE_KEY);
    if (VALID_THEME_PREFERENCES.has(saved)) return saved;

    const legacy = storage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (VALID_THEME_PREFERENCES.has(legacy)) {
      storage.setItem(THEME_STORAGE_KEY, legacy);
      storage.removeItem(LEGACY_THEME_STORAGE_KEY);
      return legacy;
    }
  } catch {
    // Storage may be unavailable in private or embedded contexts.
  }

  return 'auto';
}

export function writeThemePreference(value, storage = getLocalStorage()) {
  const preference = normalizeThemePreference(value);
  if (!storage) return preference;

  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
    storage.removeItem(LEGACY_THEME_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in private or embedded contexts.
  }

  return preference;
}

export function resolveThemeIsDark(preference, systemPrefersDark = false) {
  const normalized = normalizeThemePreference(preference);
  if (normalized === 'auto') return Boolean(systemPrefersDark);
  return normalized === 'dark';
}

export function isDarkThemeDocument(doc = document) {
  const root = doc?.documentElement;
  const body = doc?.body;
  const rootTheme = root?.getAttribute?.(THEME_ATTR);
  if (rootTheme === 'dark' || rootTheme === 'light') return rootTheme === 'dark';
  if (root?.classList?.contains(THEME_DARK_CLASS)) return true;

  const bodyTheme = body?.getAttribute?.(THEME_ATTR);
  if (bodyTheme === 'dark' || bodyTheme === 'light') return bodyTheme === 'dark';
  return body?.classList?.contains(THEME_DARK_CLASS) || false;
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
