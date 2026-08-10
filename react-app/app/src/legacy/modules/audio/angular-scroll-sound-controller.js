import { createScrollSoundController } from './scroll-sound-controller.js';

export const ANGULAR_SCROLL_SOUND_DEFAULTS = Object.freeze({
  distancePxPerRadian: 120,
});

const ignoreDetent = () => false;

/**
 * Adapt visible angular travel to the same bounded Scroll Crystal response used
 * by scrollable routes. Idle rotation stays outside this adapter; callers feed
 * only user-driven rotation and its intended inertial coast.
 */
export function createAngularScrollSoundController({
  distancePxPerRadian = ANGULAR_SCROLL_SOUND_DEFAULTS.distancePxPerRadian,
  playDetent = ignoreDetent,
  ...scrollOptions
} = {}) {
  const scale = Math.max(1, Number(distancePxPerRadian) || ANGULAR_SCROLL_SOUND_DEFAULTS.distancePxPerRadian);
  const scrollController = createScrollSoundController({
    ...scrollOptions,
    playDetent,
  });
  let positionPx = 0;

  const reset = () => {
    positionPx = 0;
    scrollController.reset();
  };

  const sampleAngularDelta = (deltaRadians, at) => {
    const delta = Number(deltaRadians);
    if (!Number.isFinite(delta) || delta === 0) return false;
    positionPx += delta * scale;
    return scrollController.samplePosition(positionPx, 0, at);
  };

  return {
    reset,
    sampleAngularDelta,
    getSnapshot: () => ({
      positionPx,
      ...scrollController.getSnapshot(),
    }),
  };
}
