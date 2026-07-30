const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

export const ABOUT_NARRATIVE_REVEAL_START_VIEWPORT_Y = 1;
export const ABOUT_NARRATIVE_REVEAL_TRAVEL_VIEWPORT = 0.2;

export function getAboutNarrativeSharedRevealProgress(
  viewportY,
  revealStartViewportY = ABOUT_NARRATIVE_REVEAL_START_VIEWPORT_Y,
  revealTravelViewport = ABOUT_NARRATIVE_REVEAL_TRAVEL_VIEWPORT,
  reducedMotion = false,
) {
  const startY = clamp01(revealStartViewportY);
  const travel = Math.max(0.001, Number(revealTravelViewport) || 0);
  if (reducedMotion) return Number(Number(viewportY) <= startY);
  const linearProgress = clamp01((startY - Number(viewportY)) / travel);
  return linearProgress * linearProgress * (3 - (2 * linearProgress));
}
