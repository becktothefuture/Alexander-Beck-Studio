import { resolveHomeSimulationBodyRadius } from '../../lib/homeSimulationSizing.js';

// A fixed calibration plane preserves perspective and keeps size independent of fog.
export const HOME_SIZE_REFERENCE_DEPTH_WU = 8;

export function resolveRollercoasterBodySize(appearance, width, height, focalLengthPx) {
  const radiusPx = resolveHomeSimulationBodyRadius(appearance.homeSimulationBodyRadiusPx,
    appearance, { cssWidth: width, cssHeight: height });
  return { radiusPx, radiusWU: focalLengthPx > 0 ? radiusPx * HOME_SIZE_REFERENCE_DEPTH_WU / focalLengthPx : 0 };
}

function smoothstep(start, end, value) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

/** Same camera-depth corridor for every surface, including the final wall. */
export function sampleRollercoasterVisibility(depth, corridor) {
  return smoothstep(corridor.nearHidden, corridor.nearClear, depth)
    * (1 - smoothstep(corridor.farClear, corridor.farHidden, depth));
}

export const ROLLERCOASTER_VISIBILITY_GLSL = `
  float corridorVisibility(float depth) {
    return smoothstep(uVisibility.x, uVisibility.y, depth)
      * (1.0 - smoothstep(uVisibility.z, uVisibility.w, depth));
  }
`;

// Used only when the browser cannot provide multisample coverage. Hidden pixels
// are discarded before depth writes, so the next surface stays visible.
export const ROLLERCOASTER_COVERAGE_GLSL = `
  float corridorCoverage(float visibility) {
    if (uDitherVisibility > 0.5) {
      float threshold = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(0.06711056, 0.00583715))));
      if (visibility <= threshold) discard;
      return 1.0;
    }
    return visibility;
  }
`;
