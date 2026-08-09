export const SCROLL_SOUND_DEFAULTS = Object.freeze({
  minimumSpeedPxPerSec: 42,
  maximumSpeedPxPerSec: 1800,
  slowSpacingPx: 40,
  fastSpacingPx: 18,
  slowIntervalMs: 76,
  fastIntervalMs: 36,
  maximumSampleGapMs: 240,
  speedSmoothing: 0.48,
});

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (from, to, progress) => from + ((to - from) * progress);
const ignoreDetent = () => false;

/**
 * Convert scroll or camera movement into bounded crystalline detents.
 *
 * Distance controls when a detent is due. Speed tightens the spacing and
 * interval, and is passed to the sound voice so it can brighten without a
 * large volume jump. At most one audio voice can be created per sample.
 */
export function createScrollSoundController({
  source = 'scroll',
  playDetent = ignoreDetent,
  now = () => performance.now(),
  ...overrides
} = {}) {
  const config = { ...SCROLL_SOUND_DEFAULTS, ...overrides };
  const emitDetent = typeof playDetent === 'function' ? playDetent : ignoreDetent;
  let previousX = 0;
  let previousY = 0;
  let previousAt = 0;
  let accumulatedDistance = 0;
  let smoothedSpeed = 0;
  let lastDetentAt = Number.NEGATIVE_INFINITY;

  const reset = () => {
    previousX = 0;
    previousY = 0;
    previousAt = 0;
    accumulatedDistance = 0;
    smoothedSpeed = 0;
    lastDetentAt = Number.NEGATIVE_INFINITY;
  };

  const samplePosition = (x, y, at = now()) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(at)) return false;
    if (previousAt <= 0) {
      previousX = x;
      previousY = y;
      previousAt = at;
      return false;
    }

    const elapsedMs = at - previousAt;
    const deltaX = x - previousX;
    const deltaY = y - previousY;
    previousX = x;
    previousY = y;
    previousAt = at;

    if (elapsedMs <= 0 || elapsedMs > config.maximumSampleGapMs) {
      accumulatedDistance = 0;
      smoothedSpeed = 0;
      return false;
    }

    const distance = Math.hypot(deltaX, deltaY);
    if (distance <= 0) return false;

    const instantaneousSpeed = distance * (1000 / elapsedMs);
    smoothedSpeed = smoothedSpeed > 0
      ? mix(smoothedSpeed, instantaneousSpeed, config.speedSmoothing)
      : instantaneousSpeed;

    if (smoothedSpeed < config.minimumSpeedPxPerSec) {
      accumulatedDistance = 0;
      return false;
    }

    const speedNorm = clamp01(
      (smoothedSpeed - config.minimumSpeedPxPerSec)
        / (config.maximumSpeedPxPerSec - config.minimumSpeedPxPerSec),
    );
    const response = 1 - ((1 - speedNorm) ** 2);
    const spacingPx = mix(config.slowSpacingPx, config.fastSpacingPx, response);
    const intervalMs = mix(config.slowIntervalMs, config.fastIntervalMs, response);
    accumulatedDistance += distance;

    if (accumulatedDistance < spacingPx) return false;
    if (at - lastDetentAt < intervalMs) {
      accumulatedDistance = Math.min(accumulatedDistance, spacingPx);
      return false;
    }

    accumulatedDistance %= spacingPx;
    lastDetentAt = at;
    const direction = Math.sign(Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX);
    return Boolean(emitDetent({
      direction,
      source,
      speed: smoothedSpeed,
      speedNorm,
    }));
  };

  return {
    reset,
    samplePosition,
    getSnapshot: () => ({
      accumulatedDistance,
      lastDetentAt,
      smoothedSpeed,
    }),
  };
}
