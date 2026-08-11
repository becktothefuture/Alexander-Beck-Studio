const CIRCLE_BLEND_THRESHOLD = 0.02;

export function shouldBatchFlatCircleBodies(pebbleBlend) {
  const blend = Number(pebbleBlend);
  return Number.isFinite(blend) && blend <= CIRCLE_BLEND_THRESHOLD;
}

export function resolveFlatCircleBatchingStrategy(pebbleBlend, mobileViewport = false) {
  if (!shouldBatchFlatCircleBodies(pebbleBlend)) return 'none';
  return mobileViewport ? 'mobile-simple' : 'exact-exceptions';
}
