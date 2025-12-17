// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           BALL SIZING (MODULAR)                               ║
// ║     Per-mode size variation + global multiplier (allocation-free)             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { MODES } from '../core/constants.js';

function clamp(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function getModeSizeVariation01(g, mode) {
  switch (mode) {
    case MODES.PIT: return g.sizeVariationPit ?? 0;
    case MODES.PIT_THROWS: return g.sizeVariationPitThrows ?? 0;
    case MODES.FLIES: return g.sizeVariationFlies ?? 0;
    case MODES.WEIGHTLESS: return g.sizeVariationWeightless ?? 0;
    case MODES.WATER: return g.sizeVariationWater ?? 0;
    case MODES.VORTEX: return g.sizeVariationVortex ?? 0;
    case MODES.PING_PONG: return g.sizeVariationPingPong ?? 0;
    case MODES.MAGNETIC: return g.sizeVariationMagnetic ?? 0;
    case MODES.BUBBLES: return g.sizeVariationBubbles ?? 0;
    case MODES.KALEIDOSCOPE: return g.sizeVariationKaleidoscope ?? 0;
    case MODES.KALEIDOSCOPE_1: return g.sizeVariationKaleidoscope ?? 0;
    case MODES.KALEIDOSCOPE_2: return g.sizeVariationKaleidoscope ?? 0;
    case MODES.KALEIDOSCOPE_3: return g.sizeVariationKaleidoscope ?? 0;
    case MODES.ORBIT_3D: return g.sizeVariationOrbit3d ?? 0;
    case MODES.ORBIT_3D_2: return g.sizeVariationOrbit3d2 ?? 0;
    case MODES.CRITTERS: return g.sizeVariationCritters ?? 0;
    case MODES.NEURAL: return g.sizeVariationNeural ?? 0;
    case MODES.LATTICE: return g.sizeVariationLattice ?? 0;
    case MODES.PARALLAX_LINEAR: return g.sizeVariationParallaxLinear ?? 0;
    case MODES.PARALLAX_PERSPECTIVE: return g.sizeVariationParallaxPerspective ?? 0;
    default: return 0;
  }
}

/**
 * Compute per-mode radius bounds from the global cap and multiplier.
 * - `g.R_MED` is the medium radius (derived from sizeScale * responsiveScale).
 * - `g.sizeVariationCap` is the max fractional deviation at per-mode=1 and globalMul=1.
 * - `g.sizeVariationGlobalMul` scales all per-mode sliders (default 1 = neutral).
 */
export function getRadiusBoundsForMode(g, mode) {
  const med = Math.max(1, g.R_MED || (g.R_MIN + g.R_MAX) * 0.5 || 10);
  const cap = clamp(Number(g.sizeVariationCap ?? 0.12), 0, 0.5);
  const mul = clamp(Number(g.sizeVariationGlobalMul ?? 1.0), 0, 2);
  const per = clamp(Number(getModeSizeVariation01(g, mode) ?? 0), 0, 1);
  const v = clamp(cap * mul * per, 0, 0.5);
  return { minR: Math.max(1, med * (1 - v)), maxR: Math.max(1, med * (1 + v)), medR: med };
}

/**
 * Compute the fractional size variance for a mode based on the global cap + multiplier.
 * Returns 0..0.5 representing +/- fraction around a base radius.
 */
export function getModeSizeVarianceFrac(g, mode) {
  const cap = clamp(Number(g.sizeVariationCap ?? 0.12), 0, 0.5);
  const mul = clamp(Number(g.sizeVariationGlobalMul ?? 1.0), 0, 2);
  const per = clamp(Number(getModeSizeVariation01(g, mode) ?? 0), 0, 1);
  return clamp(cap * mul * per, 0, 0.5);
}

/**
 * Kaleidoscope radius helper (vh-based):
 * - Base radius derives from canvas height (vh feel)
 * - Area multiplier defaults to 0.7 (≈30% smaller area)
 * - Uses per-variant size variance for more control
 */
export function randomRadiusForKaleidoscopeVh(g, mode) {
  const canvas = g?.canvas;
  const h = canvas?.height || 0;
  if (!h) return randomRadiusForMode(g, mode);

  const getVh = () => {
    if (mode === MODES.KALEIDOSCOPE_1) return Number(g.kaleidoscope1DotSizeVh ?? g.kaleidoscopeDotSizeVh ?? 0.95);
    if (mode === MODES.KALEIDOSCOPE_2) return Number(g.kaleidoscope2DotSizeVh ?? g.kaleidoscopeDotSizeVh ?? 0.95);
    if (mode === MODES.KALEIDOSCOPE_3) return Number(g.kaleidoscope3DotSizeVh ?? g.kaleidoscopeDotSizeVh ?? 0.95);
    return Number(g.kaleidoscopeDotSizeVh ?? 0.95);
  };
  const getAreaMul = () => {
    if (mode === MODES.KALEIDOSCOPE_1) return Number(g.kaleidoscope1DotAreaMul ?? g.kaleidoscopeDotAreaMul ?? 0.7);
    if (mode === MODES.KALEIDOSCOPE_2) return Number(g.kaleidoscope2DotAreaMul ?? g.kaleidoscopeDotAreaMul ?? 0.7);
    if (mode === MODES.KALEIDOSCOPE_3) return Number(g.kaleidoscope3DotAreaMul ?? g.kaleidoscopeDotAreaMul ?? 0.7);
    return Number(g.kaleidoscopeDotAreaMul ?? 0.7);
  };
  // Per-variant size variance (0..1) - controls how much ball sizes differ
  const getSizeVariance = () => {
    if (mode === MODES.KALEIDOSCOPE_1) return Number(g.kaleidoscope1SizeVariance ?? g.kaleidoscopeSizeVariance ?? 0.3);
    if (mode === MODES.KALEIDOSCOPE_2) return Number(g.kaleidoscope2SizeVariance ?? g.kaleidoscopeSizeVariance ?? 0.3);
    if (mode === MODES.KALEIDOSCOPE_3) return Number(g.kaleidoscope3SizeVariance ?? g.kaleidoscopeSizeVariance ?? 0.3);
    return Number(g.kaleidoscopeSizeVariance ?? 0.3);
  };

  const vh = clamp(getVh(), 0.1, 6.0);
  const areaMul = clamp(getAreaMul(), 0.1, 2.0);
  const base = Math.max(1, (vh * 0.01) * h * Math.sqrt(areaMul));

  // Use per-variant size variance directly (scaled to ±50% max deviation)
  const v = clamp(getSizeVariance() * 0.5, 0, 0.5);
  const minR = Math.max(1, base * (1 - v));
  const maxR = Math.max(1, base * (1 + v));
  if (maxR - minR < 1e-6) return base;
  return lerp(minR, maxR, Math.random());
}

/**
 * Allocation-free random radius for a specific mode.
 * When per-mode variation is 0, returns exactly the medium radius.
 */
export function randomRadiusForMode(g, mode) {
  const { minR, maxR, medR } = getRadiusBoundsForMode(g, mode);
  if (maxR - minR < 1e-6) return medR;
  return lerp(minR, maxR, Math.random());
}


