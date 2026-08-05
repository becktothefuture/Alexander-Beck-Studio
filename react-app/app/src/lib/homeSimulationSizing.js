import { resolveMobileSimulationBodyScale } from './mobileSimulationSizing.js';

export const DEFAULT_HOME_SIMULATION_BODY_RADIUS_PX = 8.9;
export const HOME_SIMULATION_BODY_RADIUS_MIN_PX = 6;
export const HOME_SIMULATION_BODY_RADIUS_MAX_PX = 16;

export function normalizeHomeSimulationBodyRadius(
  value,
  fallback = DEFAULT_HOME_SIMULATION_BODY_RADIUS_PX,
) {
  const fallbackNumber = Number(fallback);
  const normalizedFallback = Number.isFinite(fallbackNumber)
    ? Math.min(HOME_SIMULATION_BODY_RADIUS_MAX_PX, Math.max(HOME_SIMULATION_BODY_RADIUS_MIN_PX, fallbackNumber))
    : DEFAULT_HOME_SIMULATION_BODY_RADIUS_PX;
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(HOME_SIMULATION_BODY_RADIUS_MAX_PX, Math.max(HOME_SIMULATION_BODY_RADIUS_MIN_PX, number))
    : normalizedFallback;
}

export function resolveHomeSimulationBodyRadius(value, theme = {}, metrics = {}) {
  return normalizeHomeSimulationBodyRadius(value)
    * resolveMobileSimulationBodyScale(theme.mobileSimulationBodyScale, metrics);
}
