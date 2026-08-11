export const DESKTOP_PHYSICS_REFERENCE_HZ = 120;
export const MOBILE_PHYSICS_REFERENCE_HZ = 60;
export const RENDER_REFERENCE_HZ = 60;
const RENDER_STEPPED_MODES = new Set(['kaleidoscope', 'kaleidoscope-rift']);

export function resolveReferenceStepHz(globals) {
  if (RENDER_STEPPED_MODES.has(globals?.currentMode)) return RENDER_REFERENCE_HZ;
  return globals?.isMobile || globals?.isMobileViewport
    ? MOBILE_PHYSICS_REFERENCE_HZ
    : DESKTOP_PHYSICS_REFERENCE_HZ;
}

export function normalizePerStepMultiplier(multiplier, dtSeconds, referenceHz) {
  const base = Math.max(0, Number(multiplier) || 0);
  const dt = Math.max(0, Number(dtSeconds) || 0);
  const hz = Math.max(1, Number(referenceHz) || RENDER_REFERENCE_HZ);
  return Math.pow(base, dt * hz);
}
