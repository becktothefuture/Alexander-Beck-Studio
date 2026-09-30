/** Scroll-owned poses are pure functions of position. Reversing the scroll
 * retraces the same pose; elapsed time must never advance these controls. */
export const BOARD_SCROLL_BAND = Object.freeze({ start: .78, end: .42 });

export function boardMechanismProgress(positionPx, scrollTop, viewportHeight) {
  if (!(viewportHeight > 0)) return 0;
  const { start, end } = BOARD_SCROLL_BAND;
  return Math.max(0, Math.min(1,
    (scrollTop + viewportHeight * start - positionPx) / (viewportHeight * (start - end))));
}

/** Resolve fast scrubbing within the current displayed frame. Intermediate
 * collision solves sweep the valve through space without adding visual lag. */
export function boardValveSweepSteps(travel, radius) {
  return Math.max(1, Math.min(64, Math.ceil(Math.abs(travel) / Math.max(1, radius * .45))));
}
