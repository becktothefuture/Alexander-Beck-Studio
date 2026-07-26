import { useEffect, useMemo, useState } from 'react';
import {
  getLondonWeatherPalette,
} from '../../palette/londonPalettes.js';
import { getTimeOfDayPaletteId } from '../../palette/timeOfDayPalette.js';
import { withBasePath } from '../../lib/base-path.js';
import { useRenderedThemeIsDark } from '../../hooks/useRenderedTheme.js';
import {
  DEFAULT_MOBILE_SIMULATION_BODY_SCALE,
  normalizeMobileSimulationBodyScale,
} from '../../lib/mobileSimulationSizing.js';

export const DAILY_FOCUS_DESIGN_SYSTEM_URL = withBasePath('/config/design-system.json');

const dailyFocusJsonPromises = new Map();

const RAW_DEFAULT_PALETTE = getLondonWeatherPalette(getTimeOfDayPaletteId())?.dark || [];
const DEFAULT_PALETTE = RAW_DEFAULT_PALETTE.slice();

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

function requestDailyFocusJson(url) {
  const cached = dailyFocusJsonPromises.get(url);
  if (cached) return cached;
  const pending = fetch(url, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${url} (${response.status}).`);
      return response.json();
    })
    .catch((error) => {
      if (dailyFocusJsonPromises.get(url) === pending) dailyFocusJsonPromises.delete(url);
      throw error;
    });
  dailyFocusJsonPromises.set(url, pending);
  return pending;
}

export function prewarmDailyFocusJson(url, { signal } = {}) {
  const pending = requestDailyFocusJson(url);
  if (!signal) return pending;
  if (signal.aborted) return Promise.reject(new DOMException('JSON prewarm aborted.', 'AbortError'));
  return new Promise((resolve, reject) => {
    const handleAbort = () => reject(new DOMException('JSON prewarm aborted.', 'AbortError'));
    signal.addEventListener('abort', handleAbort, { once: true });
    pending.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', handleAbort);
        reject(error);
      },
    );
  });
}

export async function loadDailyFocusJson(url, fallback) {
  try {
    return await requestDailyFocusJson(url);
  } catch {
    return fallback;
  }
}

export function resolveDailyFocusTheme(
  designSystem,
  isDarkMode = false,
  paletteId = getTimeOfDayPaletteId(),
) {
  const runtime = designSystem?.runtime || {};
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
    isDark: isDarkMode,
    paletteId,
    palette: rawPalette.slice(),
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
  const [paletteId, setPaletteId] = useState(() => getTimeOfDayPaletteId());

  useEffect(() => {
    const handlePaletteChange = () => setPaletteId(getTimeOfDayPaletteId());
    window.addEventListener('bb:paletteChanged', handlePaletteChange);
    return () => window.removeEventListener('bb:paletteChanged', handlePaletteChange);
  }, []);

  return useMemo(
    () => resolveDailyFocusTheme(designSystem, isDark, paletteId),
    [designSystem, isDark, paletteId],
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
