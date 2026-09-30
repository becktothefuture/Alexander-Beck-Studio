/** The loading margin is wider than the visible overlap. The larger release
 * margin prevents repeated allocation when somebody scrubs across the seam. */
export const BOARD_SCENE_LIFECYCLE = Object.freeze({
  prepareViewports: 3,
  releaseViewports: 4,
  restoreViewports: 1,
  restoreReleaseViewports: 1.5,
  frameIntervalMs: 1000 / 60,
  reducedFrameIntervalMs: 1000 / 30,
});

/** React can detach refs before passive effect cleanup cancels a queued RAF.
 * Keep only work owned by the still-mounted route; a newly keyed canvas in
 * that same route is valid, but a null or detached replacement is not. */
export function boardOwnsMountedSurface(owner, currentOwner, surface) {
  return Boolean(owner?.isConnected && owner === currentOwner && surface?.isConnected);
}

export function boardSceneActivity({ scrollTop, viewportHeight, worldBottom,
  stageTop, stageHeight, spatialReady }) {
  const spatialVisible = scrollTop + viewportHeight >= stageTop
    && scrollTop <= stageTop + stageHeight;
  const spatialCovered = spatialReady && scrollTop >= stageTop;
  return {
    machineVisible: scrollTop < worldBottom && !spatialCovered,
    spatialVisible,
    spatialCovered,
    shouldPrepare: scrollTop + viewportHeight * BOARD_SCENE_LIFECYCLE.prepareViewports >= stageTop,
    shouldRelease: scrollTop + viewportHeight * BOARD_SCENE_LIFECYCLE.releaseViewports < stageTop,
  };
}

/** Restore a returning machine before it appears. Keep the restored solver
 * across small seam reversals, but release it again after a deeper 3D visit.
 * This controls allocation only; a covered machine still never advances. */
export function boardShouldKeepMachineWarm({ scrollTop, previousScrollTop,
  stageTop, viewportHeight, suspended, prewarmed }) {
  const distance = scrollTop - stageTop;
  if (prewarmed) {
    return distance <= viewportHeight * BOARD_SCENE_LIFECYCLE.restoreReleaseViewports;
  }
  return suspended && scrollTop < previousScrollTop
    && distance <= viewportHeight * BOARD_SCENE_LIFECYCLE.restoreViewports;
}

/** Keep presentation on a stable phase rather than restarting its interval at
 * each RAF. A slightly late callback must not lose the remainder and slowly
 * turn 60 Hz into 50 Hz. Missed slots are dropped, never drawn in a burst.
 * The caller keeps its actual physics delta separately from this deadline. */
export function createBoardFramePacer(reducedMotion = false) {
  const interval = reducedMotion ? BOARD_SCENE_LIFECYCLE.reducedFrameIntervalMs
    : BOARD_SCENE_LIFECYCLE.frameIntervalMs;
  const tolerance = 0.75;
  let nextDeadline = null;
  return Object.freeze({
    takeFrame(now) {
      if (nextDeadline === null) {
        nextDeadline = now + interval;
        return true;
      }
      if (now + tolerance < nextDeadline) return false;
      const elapsedSlots = Math.floor((now + tolerance - nextDeadline) / interval) + 1;
      nextDeadline += elapsedSlots * interval;
      return true;
    },
    reset() { nextDeadline = null; },
  });
}
