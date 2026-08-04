// A real 60 Hz display commonly reports frame intervals just below 16.667 ms.
// This tolerance prevents a healthy cadence from dropping to every other frame.
export const FRAME_INTERVAL_TOLERANCE_MS = 0.75;

/**
 * Return the next scheduler cursor for an accepted callback, or null to reject it.
 * Early callbacks admitted by tolerance consume the full interval. Truly late
 * callbacks retain only their remainder so delayed work does not cause drift.
 */
export function advanceFrameScheduler(lastFrameTime, nowMs, targetFPS) {
  const minFrameInterval = 1000 / targetFPS;
  const elapsed = nowMs - lastFrameTime;

  if (elapsed + FRAME_INTERVAL_TOLERANCE_MS < minFrameInterval) return null;
  if (elapsed < minFrameInterval) return nowMs;
  return nowMs - (elapsed % minFrameInterval);
}
