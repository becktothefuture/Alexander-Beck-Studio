const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

function smoothstep01(value) {
  const progress = clamp01(value);
  return progress * progress * (3 - (2 * progress));
}

export function applyAboutNarrativeTrackEasing(name, value) {
  const progress = clamp01(value);
  if (name === 'linear') return progress;
  if (name === 'hold') return progress < 1 ? 0 : 1;
  if (name === 'ease-in') return progress ** 3;
  if (name === 'ease-out') return 1 - ((1 - progress) ** 3);
  if (name === 'ease-in-out') {
    return progress < 0.5
      ? 4 * (progress ** 3)
      : 1 - (((-2 * progress) + 2) ** 3) / 2;
  }
  return smoothstep01(progress);
}

/**
 * Schema v5 World motion historically passed an eased timeline value through
 * a second shader smoothstep. Compose those stages here so transitionProgress
 * is the one authoritative visual progress without changing authored pacing.
 */
export function applyAboutNarrativeWorldTransitionEasing(name, value) {
  return smoothstep01(applyAboutNarrativeTrackEasing(name, value));
}

export function normalizeAboutNarrativeWorldTransitionProgress(value) {
  return clamp01(value);
}

export function resolveAboutNarrativeMotionTimeMix(mode, mixedWeight = 0.5) {
  if (mode === 'story') return 1;
  if (mode === 'mixed') return clamp01(mixedWeight);
  return 0;
}

export function isAboutNarrativeShortLandscape({
  layoutProfile,
  width,
  height,
}) {
  const inlineSize = Math.max(0, Number(width) || 0);
  const blockSize = Math.max(0, Number(height) || 0);
  return layoutProfile === 'mobile'
    && inlineSize > blockSize
    && blockSize <= 600;
}
