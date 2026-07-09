import { useEffect, useState } from 'react';
import {
  getLondonWeatherPalette,
  resolveLondonWeatherPaletteId,
} from '../../palette/londonPalettes.js';
import { desaturateGreysToBackground } from '../../palette/paletteTransforms.js';
import { getLondonWeatherPaletteIdFromAssessment } from '../../weather/londonWeatherAssessment.js';
import { withBasePath } from '../../lib/base-path.js';

export const DAILY_FOCUS_DESIGN_SYSTEM_URL = withBasePath('/config/design-system.json');

const DEFAULT_DAILY_FOCUS_PALETTE_ID = getLondonWeatherPaletteIdFromAssessment();

const RAW_DEFAULT_PALETTE = getLondonWeatherPalette(DEFAULT_DAILY_FOCUS_PALETTE_ID)?.dark || [
  '#a7afb0',
  '#c6cecf',
  '#f5f8f6',
  '#00a5a0',
  '#031210',
  '#d7ff2f',
  '#2c96ff',
  '#ff7e4a',
];
const DEFAULT_PALETTE = desaturateGreysToBackground(RAW_DEFAULT_PALETTE, '#f5f5f5', false);

const DEFAULT_COLOR_DISTRIBUTION = [
  { label: 'Product Design', colorIndex: 0, weight: 31 },
  { label: 'Experience Design', colorIndex: 3, weight: 13 },
  { label: 'Art Direction', colorIndex: 2, weight: 16 },
  { label: 'Motion & 3D', colorIndex: 6, weight: 20 },
  { label: 'Creative Engineering', colorIndex: 7, weight: 10 },
  { label: 'Parametric Systems', colorIndex: 5, weight: 10 },
];

export const DEFAULT_DAILY_FOCUS_THEME = Object.freeze({
  light: '#efefef',
  dark: '#202020',
  active: '#202020',
  palette: DEFAULT_PALETTE,
  colorDistribution: DEFAULT_COLOR_DISTRIBUTION,
});

export async function loadDailyFocusJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

export function resolveDailyFocusTheme(designSystem) {
  const runtime = designSystem?.runtime || {};
  const shellTheme = designSystem?.shell?.theme || {};
  const isDarkMode = typeof document !== 'undefined'
    && document.body?.classList?.contains('dark-mode');
  const paletteId = resolveLondonWeatherPaletteId(
    runtime.paletteId
      || runtime.palette
      || runtime.paletteTemplate
      || runtime.paletteSlug
      || DEFAULT_DAILY_FOCUS_PALETTE_ID,
  ) || DEFAULT_DAILY_FOCUS_PALETTE_ID;
  const palette = getLondonWeatherPalette(paletteId);
  const bgLight = runtime.bgLight || shellTheme.wallBaseLight || DEFAULT_DAILY_FOCUS_THEME.light;
  const bgDark = runtime.bgDark || shellTheme.wallBaseDark || DEFAULT_DAILY_FOCUS_THEME.dark;
  const activeBg = isDarkMode ? bgDark : bgLight;
  const rawPalette = Array.isArray(isDarkMode ? palette?.dark : palette?.light)
    ? (isDarkMode ? palette.dark : palette.light)
    : DEFAULT_DAILY_FOCUS_THEME.palette;

  return {
    light: bgLight,
    dark: bgDark,
    active: activeBg,
    palette: desaturateGreysToBackground(rawPalette, activeBg, isDarkMode),
    colorDistribution: Array.isArray(runtime.colorDistribution)
      ? runtime.colorDistribution
      : DEFAULT_DAILY_FOCUS_THEME.colorDistribution,
  };
}

export function useDailyFocusReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(media.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  return reducedMotion;
}
