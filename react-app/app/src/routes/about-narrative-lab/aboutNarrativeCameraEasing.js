export const ABOUT_NARRATIVE_DEFAULT_CAMERA_EASING = 'cubic-bezier(0.32, 0, 0.18, 1)';

const CAMERA_BEZIER_PATTERN = /^cubic-bezier\(\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*\)$/;
const SOFT_TANGENT_EPSILON = 0.000001;
const LEGACY_CAMERA_EASINGS = new Set(['linear', 'smoothstep', 'ease-in-out']);

export function parseAboutNarrativeCameraEasing(value) {
  const match = CAMERA_BEZIER_PATTERN.exec(String(value || ''));
  if (!match) return null;
  const points = match.slice(1).map(Number);
  const [x1, y1, x2, y2] = points;
  if (!points.every(Number.isFinite)
    || x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1
    || Math.abs(y1) > SOFT_TANGENT_EPSILON
    || Math.abs(y2 - 1) > SOFT_TANGENT_EPSILON) return null;
  return Object.freeze({ x1, y1: 0, x2, y2: 1 });
}

export function normalizeAboutNarrativeCameraEasing(value) {
  if (parseAboutNarrativeCameraEasing(value)) return String(value).replace(/\s+/g, ' ');
  if (LEGACY_CAMERA_EASINGS.has(value)) return value;
  return ABOUT_NARRATIVE_DEFAULT_CAMERA_EASING;
}

export function compileAboutNarrativeCameraEasing(value) {
  const normalized = normalizeAboutNarrativeCameraEasing(value);
  return parseAboutNarrativeCameraEasing(normalized) || Object.freeze({ legacy: normalized });
}

function cubic(value, p1, p2) {
  const inverse = 1 - value;
  return (3 * inverse * inverse * value * p1) + (3 * inverse * value * value * p2) + (value * value * value);
}

export function applyAboutNarrativeCameraEasing(curve, progress) {
  const target = Math.min(1, Math.max(0, Number(progress) || 0));
  const activeCurve = curve || compileAboutNarrativeCameraEasing(ABOUT_NARRATIVE_DEFAULT_CAMERA_EASING);
  if (activeCurve.legacy === 'linear') return target;
  if (activeCurve.legacy === 'ease-in-out') {
    return target < 0.5 ? 4 * (target ** 3) : 1 - (((-2 * target) + 2) ** 3) / 2;
  }
  if (activeCurve.legacy === 'smoothstep') return target * target * (3 - (2 * target));
  let low = 0;
  let high = 1;
  // Invert x(t) with a fixed bisection loop. This is stable and allocation-free
  // in the frame sampler while retaining CSS cubic-bezier timing semantics.
  for (let index = 0; index < 12; index += 1) {
    const midpoint = (low + high) / 2;
    if (cubic(midpoint, activeCurve.x1, activeCurve.x2) < target) low = midpoint;
    else high = midpoint;
  }
  return cubic((low + high) / 2, activeCurve.y1, activeCurve.y2);
}
