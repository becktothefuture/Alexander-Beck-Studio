export const CUBE_3D_DEFAULTS = Object.freeze({
  cube3dSizeVw: 44.5,
  cube3dEdgeDensity: 9,
  cube3dFaceGrid: 0,
  cube3dIdleSpeed: 0.34,
  cube3dCursorInfluence: 2.75,
  cube3dTumbleSpeed: 6.1,
  cube3dTumbleDamping: 0.95,
  cube3dFocalLength: 1100,
  cube3dDotSizeMul: 1.2,
  cube3dFogStart: 0.86,
  cube3dFogMin: 0.18,
  cube3dReducedMotionScale: 0.18,
  cube3dWarmupFrames: 10,
});

export const CUBE_3D_LIMITS = Object.freeze({
  cube3dSizeVw: Object.freeze({ min: 10, max: 50 }),
  cube3dEdgeDensity: Object.freeze({ min: 2, max: 30 }),
  cube3dFaceGrid: Object.freeze({ min: 0, max: 10 }),
  cube3dIdleSpeed: Object.freeze({ min: 0, max: 1 }),
  cube3dCursorInfluence: Object.freeze({ min: 0, max: 4 }),
  cube3dTumbleSpeed: Object.freeze({ min: 0, max: 10 }),
  cube3dTumbleDamping: Object.freeze({ min: 0, max: 1 }),
  cube3dFocalLength: Object.freeze({ min: 80, max: 2000 }),
  cube3dDotSizeMul: Object.freeze({ min: 0.2, max: 4 }),
  cube3dFogStart: Object.freeze({ min: 0, max: 1 }),
  cube3dFogMin: Object.freeze({ min: 0, max: 1 }),
  cube3dReducedMotionScale: Object.freeze({ min: 0, max: 1 }),
  cube3dWarmupFrames: Object.freeze({ min: 0, max: 240 }),
});

function clampNumber(value, fallback, { min, max }) {
  const numeric = Number(value);
  return Math.min(max, Math.max(min, Number.isFinite(numeric) ? numeric : fallback));
}

function clampInt(value, fallback, limits) {
  return Math.round(clampNumber(value, fallback, limits));
}

export function normalizeCube3DConfig(source = {}, fallback = CUBE_3D_DEFAULTS) {
  const value = (key) => source[key] ?? fallback[key] ?? CUBE_3D_DEFAULTS[key];
  return {
    cube3dSizeVw: clampNumber(value('cube3dSizeVw'), CUBE_3D_DEFAULTS.cube3dSizeVw, CUBE_3D_LIMITS.cube3dSizeVw),
    cube3dEdgeDensity: clampInt(value('cube3dEdgeDensity'), CUBE_3D_DEFAULTS.cube3dEdgeDensity, CUBE_3D_LIMITS.cube3dEdgeDensity),
    cube3dFaceGrid: clampInt(value('cube3dFaceGrid'), CUBE_3D_DEFAULTS.cube3dFaceGrid, CUBE_3D_LIMITS.cube3dFaceGrid),
    cube3dIdleSpeed: clampNumber(value('cube3dIdleSpeed'), CUBE_3D_DEFAULTS.cube3dIdleSpeed, CUBE_3D_LIMITS.cube3dIdleSpeed),
    cube3dCursorInfluence: clampNumber(value('cube3dCursorInfluence'), CUBE_3D_DEFAULTS.cube3dCursorInfluence, CUBE_3D_LIMITS.cube3dCursorInfluence),
    cube3dTumbleSpeed: clampNumber(value('cube3dTumbleSpeed'), CUBE_3D_DEFAULTS.cube3dTumbleSpeed, CUBE_3D_LIMITS.cube3dTumbleSpeed),
    cube3dTumbleDamping: clampNumber(value('cube3dTumbleDamping'), CUBE_3D_DEFAULTS.cube3dTumbleDamping, CUBE_3D_LIMITS.cube3dTumbleDamping),
    cube3dFocalLength: clampInt(value('cube3dFocalLength'), CUBE_3D_DEFAULTS.cube3dFocalLength, CUBE_3D_LIMITS.cube3dFocalLength),
    cube3dDotSizeMul: clampNumber(value('cube3dDotSizeMul'), CUBE_3D_DEFAULTS.cube3dDotSizeMul, CUBE_3D_LIMITS.cube3dDotSizeMul),
    cube3dFogStart: clampNumber(value('cube3dFogStart'), CUBE_3D_DEFAULTS.cube3dFogStart, CUBE_3D_LIMITS.cube3dFogStart),
    cube3dFogMin: clampNumber(value('cube3dFogMin'), CUBE_3D_DEFAULTS.cube3dFogMin, CUBE_3D_LIMITS.cube3dFogMin),
    cube3dReducedMotionScale: clampNumber(value('cube3dReducedMotionScale'), CUBE_3D_DEFAULTS.cube3dReducedMotionScale, CUBE_3D_LIMITS.cube3dReducedMotionScale),
    cube3dWarmupFrames: clampInt(value('cube3dWarmupFrames'), CUBE_3D_DEFAULTS.cube3dWarmupFrames, CUBE_3D_LIMITS.cube3dWarmupFrames),
  };
}

export function resolveCube3DSizePx(canvasWidth, sizeVw) {
  const width = Math.max(0, Number(canvasWidth) || 0);
  const size = clampNumber(sizeVw, CUBE_3D_DEFAULTS.cube3dSizeVw, CUBE_3D_LIMITS.cube3dSizeVw);
  return Math.max(10, (size / 100) * width);
}

export function resolveCube3DMotionScale(reducedMotion, configuredScale) {
  if (!reducedMotion) return 1;
  return clampNumber(
    configuredScale,
    CUBE_3D_DEFAULTS.cube3dReducedMotionScale,
    CUBE_3D_LIMITS.cube3dReducedMotionScale,
  );
}
