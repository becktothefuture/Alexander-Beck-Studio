import Lenis from 'lenis';

export const SMOOTH_SCROLL_DEFAULT_SMOOTHING = 0.82;
export const SMOOTH_SCROLL_NATIVE_QUERY = '(max-width: 600px), (hover: none), (pointer: coarse)';
export const SMOOTH_SCROLL_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function resolveSmoothScrollLerp(smoothing = SMOOTH_SCROLL_DEFAULT_SMOOTHING) {
  return 0.22 - (clamp(smoothing, 0, 1) * 0.18);
}

export function createSmoothScrollMediaQueries(win = window) {
  return {
    reducedMotionQuery: win.matchMedia(SMOOTH_SCROLL_REDUCED_MOTION_QUERY),
    nativeScrollQuery: win.matchMedia(SMOOTH_SCROLL_NATIVE_QUERY),
  };
}

export function shouldUseNativeSmoothScroll({
  reducedMotionQuery,
  nativeScrollQuery,
  allowCoarsePointer = false,
  win = window,
} = {}) {
  const reducedMotionMatches = reducedMotionQuery?.matches
    ?? win.matchMedia?.(SMOOTH_SCROLL_REDUCED_MOTION_QUERY).matches;
  const nativeScrollMatches = nativeScrollQuery?.matches
    ?? win.matchMedia?.(SMOOTH_SCROLL_NATIVE_QUERY).matches;
  return Boolean(
    reducedMotionMatches
    || (!allowCoarsePointer && nativeScrollMatches)
  );
}

export function createSmoothScroll({
  wrapper,
  content,
  smoothing = SMOOTH_SCROLL_DEFAULT_SMOOTHING,
  allowCoarsePointer = false,
  ...options
}) {
  if (!wrapper || !content || shouldUseNativeSmoothScroll({ allowCoarsePointer })) return null;
  return new Lenis({
    wrapper,
    content,
    lerp: resolveSmoothScrollLerp(smoothing),
    smoothWheel: true,
    syncTouch: false,
    autoRaf: false,
    ...options,
  });
}
