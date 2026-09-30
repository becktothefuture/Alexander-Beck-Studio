import {
  DEFAULT_HOME_SIMULATION_BODY_RADIUS_PX,
  normalizeHomeSimulationBodyRadius,
  resolveHomeSimulationBodyRadius,
} from '../../lib/homeSimulationSizing.js';
import {
  DEFAULT_MOBILE_SIMULATION_BODY_SCALE,
  normalizeMobileSimulationBodyScale,
} from '../../lib/mobileSimulationSizing.js';

export const BOARD_BALL_PRESENTATION_DEFAULTS = Object.freeze({
  homeSimulationBodyRadiusPx: DEFAULT_HOME_SIMULATION_BODY_RADIUS_PX,
  mobileSimulationBodyScale: DEFAULT_MOBILE_SIMULATION_BODY_SCALE,
});

// Figma units are not CSS pixels. Convert Home's actual screen radius through
// the board scale, then use that same radius for drawing and collisions.
export const BOARD_AUTHORED_MAX_MOVING_BALL_RADIUS = 13;
export const BOARD_BALL_SAFE_RADIUS_SCALE_MIN = 0.1;
export const BOARD_BALL_SAFE_RADIUS_SCALE_MAX = 8;

function clampBoardBallRadiusScale(value) {
  return Math.min(BOARD_BALL_SAFE_RADIUS_SCALE_MAX,
    Math.max(BOARD_BALL_SAFE_RADIUS_SCALE_MIN, value));
}

/** Home, Contact and About share one authored screen-space size. */
export function boardBallPresentationFromRuntimeConfig(runtime = {}) {
  return Object.freeze({
    homeSimulationBodyRadiusPx: normalizeHomeSimulationBodyRadius(
      runtime.homeSimulationBodyRadiusPx,
      BOARD_BALL_PRESENTATION_DEFAULTS.homeSimulationBodyRadiusPx,
    ),
    mobileSimulationBodyScale: normalizeMobileSimulationBodyScale(
      runtime.mobileSimulationBodyScale,
      BOARD_BALL_PRESENTATION_DEFAULTS.mobileSimulationBodyScale,
    ),
  });
}

/** Resolve a deterministic multiplier for authored board-space radii. Pass
 * explicit viewport metrics from the route so physics and both renderers are
 * rebuilt from the same mobile/desktop decision. */
export function resolveBoardBallRadiusScale(presentation = {}, viewportMetrics = {}) {
  const resolved = boardBallPresentationFromRuntimeConfig(presentation);
  const boardWidth = Math.max(1, Number(viewportMetrics.boardWidth)
    || Number(viewportMetrics.cssWidth) || 960);
  const radiusPx = resolveHomeSimulationBodyRadius(resolved.homeSimulationBodyRadiusPx,
    resolved, viewportMetrics);
  return clampBoardBallRadiusScale(radiusPx * 960 / boardWidth
    / BOARD_AUTHORED_MAX_MOVING_BALL_RADIUS);
}

export function normalizeBoardBallRadiusScale(value, fallback = 1) {
  const fallbackNumber = Number(fallback);
  const normalizedFallback = Number.isFinite(fallbackNumber) && fallbackNumber > 0
    ? fallbackNumber
    : 1;
  const number = Number(value);
  return clampBoardBallRadiusScale(
    Number.isFinite(number) && number > 0 ? number : normalizedFallback,
  );
}

export function resolveBoardBallRadius(sourceRadius, radiusScale = 1) {
  const radius = Number(sourceRadius);
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new TypeError('A board ball needs a positive finite radius.');
  }
  return BOARD_AUTHORED_MAX_MOVING_BALL_RADIUS * normalizeBoardBallRadiusScale(radiusScale);
}
