import { useEffect, useMemo, useState } from 'react';
import {
  getLondonWeatherPalette,
  resolveLondonWeatherPaletteId,
} from '../../palette/londonPalettes.js';
import { desaturateGreysToBackground } from '../../palette/paletteTransforms.js';
import { getTimeOfDayPaletteId } from '../../palette/timeOfDayPalette.js';
import { withBasePath } from '../../lib/base-path.js';
import { useRenderedThemeIsDark } from '../../hooks/useRenderedTheme.js';
import {
  DEFAULT_MOBILE_SIMULATION_BODY_SCALE,
  normalizeMobileSimulationBodyScale,
} from '../../lib/mobileSimulationSizing.js';

export const DAILY_FOCUS_DESIGN_SYSTEM_URL = withBasePath('/config/design-system.json');

const DEFAULT_DAILY_FOCUS_PALETTE_ID = getTimeOfDayPaletteId();

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
  mobileSimulationBodyScale: DEFAULT_MOBILE_SIMULATION_BODY_SCALE,
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

export function resolveDailyFocusTheme(designSystem, isDarkMode = false) {
  const runtime = designSystem?.runtime || {};
  const paletteId = resolveLondonWeatherPaletteId(
    runtime.paletteId
      || runtime.palette
      || runtime.paletteTemplate
      || runtime.paletteSlug
      || DEFAULT_DAILY_FOCUS_PALETTE_ID,
  ) || DEFAULT_DAILY_FOCUS_PALETTE_ID;
  const palette = getLondonWeatherPalette(paletteId);
  const bgLight = runtime.bgLight || DEFAULT_DAILY_FOCUS_THEME.light;
  const bgDark = runtime.bgDark || DEFAULT_DAILY_FOCUS_THEME.dark;
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
    mobileSimulationBodyScale: normalizeMobileSimulationBodyScale(
      runtime.mobileSimulationBodyScale,
    ),
  };
}

export function useDailyFocusTheme(designSystem) {
  const isDark = useRenderedThemeIsDark();
  return useMemo(
    () => resolveDailyFocusTheme(designSystem, isDark),
    [designSystem, isDark],
  );
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
