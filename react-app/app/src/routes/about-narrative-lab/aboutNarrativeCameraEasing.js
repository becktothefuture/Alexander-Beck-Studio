export const ABOUT_NARRATIVE_DEFAULT_CAMERA_EASING = 'cubic-bezier(0.32, 0, 0.18, 1)';
export const ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MIN = 0;
export const ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MAX = 0.96;

const CAMERA_BEZIER_PATTERN = /^cubic-bezier\(\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*\)$/;
const SOFT_TANGENT_EPSILON = 0.000001;
const LEGACY_CAMERA_EASINGS = new Set(['linear', 'smoothstep', 'ease-in-out']);
const LEGACY_CAMERA_EASING_CURVES = Object.freeze({
  linear: Object.freeze({ x1: 0, y1: 0, x2: 1, y2: 1 }),
  smoothstep: Object.freeze({ x1: 1 / 3, y1: 0, x2: 2 / 3, y2: 1 }),
  'ease-in-out': Object.freeze({ x1: 0.5, y1: 0, x2: 0.5, y2: 1 }),
});

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

export function getEditableAboutNarrativeCameraEasingCurve(value) {
  return parseAboutNarrativeCameraEasing(value)
    || LEGACY_CAMERA_EASING_CURVES[value]
    || parseAboutNarrativeCameraEasing(ABOUT_NARRATIVE_DEFAULT_CAMERA_EASING);
}

export function formatAboutNarrativeCameraEasing(x1, x2) {
  return `cubic-bezier(${Number(x1).toFixed(2)}, 0, ${Number(x2).toFixed(2)}, 1)`;
}

function clampEasingStrength(value) {
  return Math.min(
    ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MAX,
    Math.max(ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MIN, Number(value) || 0),
  );
}

function orderedCameraKeys(keys) {
  return [...(keys || [])].sort((left, right) => (
    Number(left.atWU) - Number(right.atWU) || String(left.id).localeCompare(String(right.id))
  ));
}

function createEasingHandle(ownerKey, fromKey, toKey, direction) {
  const curve = getEditableAboutNarrativeCameraEasingCurve(ownerKey.easing);
  return {
    direction,
    ownerKey,
    fromKey,
    toKey,
    easing: ownerKey.easing,
    curve,
    strength: direction === 'incoming' ? 1 - curve.x2 : curve.x1,
  };
}

export function resolveAboutNarrativeCameraKeyEasingHandles(keys, keyId) {
  const ordered = orderedCameraKeys(keys);
  const index = ordered.findIndex((key) => key.id === keyId);
  if (index < 0) return null;
  const key = ordered[index];
  const previousKey = ordered[index - 1] || null;
  const nextKey = ordered[index + 1] || null;
  return {
    key,
    previousKey,
    nextKey,
    incoming: previousKey
      ? createEasingHandle(previousKey, previousKey, key, 'incoming')
      : null,
    outgoing: nextKey
      ? createEasingHandle(key, key, nextKey, 'outgoing')
      : null,
  };
}

export function setAboutNarrativeCameraKeyEasingStrength(keys, keyId, direction, value) {
  const context = resolveAboutNarrativeCameraKeyEasingHandles(keys, keyId);
  const handle = context?.[direction];
  if (!handle || !['incoming', 'outgoing'].includes(direction)) return null;
  const strength = clampEasingStrength(value);
  const easing = direction === 'incoming'
    ? formatAboutNarrativeCameraEasing(handle.curve.x1, 1 - strength)
    : formatAboutNarrativeCameraEasing(strength, handle.curve.x2);
  handle.ownerKey.easing = easing;
  return {
    direction,
    keyId,
    segmentKeyId: handle.ownerKey.id,
    strength,
    easing,
  };
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
  if (target === 0 || target === 1) return target;
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
