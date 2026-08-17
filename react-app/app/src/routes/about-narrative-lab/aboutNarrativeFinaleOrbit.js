const PIXELS_PER_LINE = 16;

function positiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function getScrollDeltaPixels(deltaY, deltaMode, viewportHeight) {
  const height = positiveNumber(viewportHeight, 1);
  const mode = Number(deltaMode) || 0;
  return (Number(deltaY) || 0) * (
    mode === 1 ? PIXELS_PER_LINE : mode === 2 ? height : 1
  );
}

/**
 * Convert browser wheel units into pixels before mapping them to Story WU.
 * A viewport of continued scroll therefore advances the finale at the same
 * rate as the authored orbit, independent of mouse, trackpad, or browser.
 */
export function getAboutNarrativeFinaleScrollDeltaWU({
  deltaY,
  deltaMode = 0,
  viewportHeight,
  storyPerScrollWU = 1,
}) {
  const height = positiveNumber(viewportHeight, 1);
  const pixels = getScrollDeltaPixels(deltaY, deltaMode, height);
  return (pixels / height) * positiveNumber(storyPerScrollWU, 1);
}

/**
 * Split one forward gesture at the physical end of the page. Smooth scrolling
 * can lag behind its input target, so the target is authoritative when it is
 * ahead of the painted scroll position. Only the overflow becomes extra orbit.
 */
export function getAboutNarrativeFinaleOverflowPixels({
  deltaY,
  deltaMode = 0,
  viewportHeight,
  scrollTop = 0,
  targetScrollTop = scrollTop,
  maximumScrollTop,
}) {
  const deltaPixels = getScrollDeltaPixels(deltaY, deltaMode, viewportHeight);
  const maximum = Math.max(0, Number(maximumScrollTop) || 0);
  if (deltaPixels <= 0 || maximum <= 0) return 0;
  const target = Number(targetScrollTop);
  // The smoothing target can be ahead of or behind the painted position.
  // Lenis applies the next delta to that target, so using the painted value
  // during a direction change would steal distance from the new gesture.
  const inputPosition = Math.min(maximum, Math.max(
    0,
    Number.isFinite(target) ? target : Number(scrollTop) || 0,
  ));
  return Math.max(0, deltaPixels - Math.max(0, maximum - inputPosition));
}

export function getAboutNarrativeFinaleOrbitCycleWU(orbit) {
  const durationWU = Math.max(
    0.000001,
    positiveNumber(Number(orbit?.endWU) - Number(orbit?.startWU), 0.000001),
  );
  const arcDegrees = Math.max(0.000001, Math.abs(Number(orbit?.arcDegrees) || 0));
  return durationWU * (360 / arcDegrees);
}

/**
 * Retain only the nearest equivalent revolution. This permits unlimited
 * forward spinning without allowing a huge accumulated angle to lose float
 * precision or trap the visitor at the end when they reverse direction.
 */
export function wrapAboutNarrativeFinaleOrbitWU(value, cycleWU) {
  const cycle = positiveNumber(cycleWU);
  if (!cycle) return 0;
  const halfCycle = cycle / 2;
  return (((((Number(value) || 0) + halfCycle) % cycle) + cycle) % cycle) - halfCycle;
}

export function advanceAboutNarrativeFinaleOrbitWU(currentWU, deltaWU, orbit) {
  return wrapAboutNarrativeFinaleOrbitWU(
    (Number(currentWU) || 0) + (Number(deltaWU) || 0),
    getAboutNarrativeFinaleOrbitCycleWU(orbit),
  );
}
