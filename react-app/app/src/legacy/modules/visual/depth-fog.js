function clamp01(value, fallback) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(0, Math.min(1, next));
}

function smoothstep(t) {
  return t * t * (3 - (2 * t));
}

// Normalized depth convention: 0 = far/back/fogged, 1 = near/front/clear.
export function resolveDistanceFogOpacity(depth, options = {}) {
  const normalizedDepth = clamp01(depth, 1);
  const fogStart = clamp01(options.fogStart, 0.95);
  const fogMin = clamp01(options.fogMin, 0.58);

  if (fogStart <= 0 || normalizedDepth >= fogStart) return 1;

  const fogT = (fogStart - normalizedDepth) / fogStart;
  const fogAmount = smoothstep(Math.max(0, Math.min(1, fogT)));
  return 1 - (fogAmount * (1 - fogMin));
}
