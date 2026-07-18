export const DEFAULT_MOBILE_SIMULATION_BODY_SCALE = 0.8;

const MOBILE_MAX_WIDTH_PX = 600;
const MOBILE_LANDSCAPE_MAX_WIDTH_PX = 900;
const MOBILE_LANDSCAPE_MAX_HEIGHT_PX = 600;

function positiveDimension(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function normalizeMobileSimulationBodyScale(
  value,
  fallback = DEFAULT_MOBILE_SIMULATION_BODY_SCALE,
) {
  const fallbackNumber = Number(fallback);
  const normalizedFallback = Number.isFinite(fallbackNumber)
    ? Math.min(1, Math.max(0.5, fallbackNumber))
    : DEFAULT_MOBILE_SIMULATION_BODY_SCALE;
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(1, Math.max(0.5, number))
    : normalizedFallback;
}

export function isMobileSimulationViewport(metrics = {}) {
  if (metrics.isMobileDevice === true) return true;

  const width = positiveDimension(metrics.cssWidth ?? metrics.width)
    ?? (typeof window !== 'undefined' ? positiveDimension(window.innerWidth) : null);
  const height = positiveDimension(metrics.cssHeight ?? metrics.height)
    ?? (typeof window !== 'undefined' ? positiveDimension(window.innerHeight) : null);

  if (width !== null && width <= MOBILE_MAX_WIDTH_PX) return true;
  if (
    width !== null
    && height !== null
    && width <= MOBILE_LANDSCAPE_MAX_WIDTH_PX
    && height <= MOBILE_LANDSCAPE_MAX_HEIGHT_PX
  ) {
    return true;
  }

  if (metrics.isMobileDevice === false || typeof window === 'undefined') return false;
  const userAgent = window.navigator?.userAgent || '';
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)
    || window.matchMedia?.('(hover: none) and (pointer: coarse)').matches === true;
}

export function resolveMobileSimulationBodyScale(configuredScale, metrics = {}) {
  if (!isMobileSimulationViewport(metrics)) return 1;
  return normalizeMobileSimulationBodyScale(configuredScale);
}

export function resolveMobileSimulationMultiplier(
  value,
  metrics = {},
  { fallback = 1, min = 0.5, max = 1.5 } = {},
) {
  if (!isMobileSimulationViewport(metrics)) return 1;
  const normalizedMin = Number.isFinite(Number(min)) ? Number(min) : 0.5;
  const normalizedMax = Number.isFinite(Number(max))
    ? Math.max(normalizedMin, Number(max))
    : Math.max(normalizedMin, 1.5);
  const normalizedFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : 1;
  const numeric = Number.isFinite(Number(value)) ? Number(value) : normalizedFallback;
  return Math.min(normalizedMax, Math.max(normalizedMin, numeric));
}
