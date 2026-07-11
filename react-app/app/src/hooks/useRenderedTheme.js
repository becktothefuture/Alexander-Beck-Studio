import { useEffect, useState } from 'react';
import { THEME_CHANGE_EVENT, isDarkThemeDocument } from '../lib/theme-state.js';

function readRenderedThemeIsDark() {
  return typeof document !== 'undefined' && isDarkThemeDocument(document);
}

export function useRenderedThemeIsDark() {
  const [isDark, setIsDark] = useState(readRenderedThemeIsDark);

  useEffect(() => {
    const syncTheme = (event) => {
      setIsDark(Boolean(event?.detail?.isDark ?? readRenderedThemeIsDark()));
    };

    syncTheme();
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
  }, []);

  return isDark;
}
