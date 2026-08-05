/* global __ABS_PRODUCTION_DESIGN_SYSTEM_CONFIG__:readonly */

import { useEffect, useMemo, useState } from 'react';
import { withBasePath } from '../../lib/base-path.js';
import { useRenderedThemeIsDark } from '../../hooks/useRenderedTheme.js';
import {
  DEFAULT_MOBILE_SIMULATION_BODY_SCALE,
  normalizeMobileSimulationBodyScale,
} from '../../lib/mobileSimulationSizing.js';
import {
  DEFAULT_HOME_SIMULATION_BODY_RADIUS_PX,
  normalizeHomeSimulationBodyRadius,
} from '../../lib/homeSimulationSizing.js';
import { getSimulationPaletteSnapshot } from '../../palette/simulationPaletteController.js';
import { useSimulationPalette } from '../../hooks/useSimulationPalette.js';

export const DAILY_FOCUS_DESIGN_SYSTEM_URL = withBasePath('/config/design-system.json');

// Vite embeds this only in the production bundle. Other JSON-backed lab
// simulations still load their own authored demo files as before.
const PRODUCTION_DESIGN_SYSTEM_CONFIG = typeof __ABS_PRODUCTION_DESIGN_SYSTEM_CONFIG__ === 'undefined'
  ? null
  : __ABS_PRODUCTION_DESIGN_SYSTEM_CONFIG__;

const dailyFocusJsonPromises = new Map();

const INITIAL_PALETTE_SNAPSHOT = getSimulationPaletteSnapshot();

export const DEFAULT_DAILY_FOCUS_THEME = Object.freeze({
  light: '#efefef',
  dark: '#202020',
  active: '#202020',
  paletteId: INITIAL_PALETTE_SNAPSHOT.paletteId,
  paletteGeneration: INITIAL_PALETTE_SNAPSHOT.generation,
  palette: INITIAL_PALETTE_SNAPSHOT.colors,
  colorDistribution: INITIAL_PALETTE_SNAPSHOT.distribution,
  homeSimulationBodyRadiusPx: DEFAULT_HOME_SIMULATION_BODY_RADIUS_PX,
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
  if (url === DAILY_FOCUS_DESIGN_SYSTEM_URL && PRODUCTION_DESIGN_SYSTEM_CONFIG) {
    return PRODUCTION_DESIGN_SYSTEM_CONFIG;
  }
  try {
    return await requestDailyFocusJson(url);
  } catch {
    return fallback;
  }
}

export function resolveDailyFocusTheme(
  designSystem,
  isDarkMode = false,
  paletteSnapshot = getSimulationPaletteSnapshot(),
) {
  const runtime = designSystem?.runtime || {};
  const snapshot = paletteSnapshot?.colors ? paletteSnapshot : getSimulationPaletteSnapshot();
  const bgLight = runtime.bgLight || DEFAULT_DAILY_FOCUS_THEME.light;
  const bgDark = runtime.bgDark || DEFAULT_DAILY_FOCUS_THEME.dark;
  const activeBg = isDarkMode ? bgDark : bgLight;

  return {
    light: bgLight,
    dark: bgDark,
    active: activeBg,
    isDark: isDarkMode,
    paletteId: snapshot.paletteId,
    paletteGeneration: snapshot.generation,
    paletteEffectiveAt: snapshot.effectiveAt,
    paletteSnapshot: snapshot,
    palette: snapshot.colors,
    colorDistribution: snapshot.distribution,
    homeSimulationBodyRadiusPx: normalizeHomeSimulationBodyRadius(
      runtime.homeSimulationBodyRadiusPx,
    ),
    mobileSimulationBodyScale: normalizeMobileSimulationBodyScale(
      runtime.mobileSimulationBodyScale,
    ),
  };
}

export function useDailyFocusTheme(designSystem) {
  const isDark = useRenderedThemeIsDark();
  const paletteSnapshot = useSimulationPalette();

  return useMemo(
    () => resolveDailyFocusTheme(designSystem, isDark, paletteSnapshot),
    [designSystem, isDark, paletteSnapshot],
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
