const clamp = (value, min, max, fallback) => {
  const numeric = Number(value);
  return Math.min(max, Math.max(min, Number.isFinite(numeric) ? numeric : fallback));
};

const smoothstep = (start, end, value) => {
  if (start === end) return value >= end ? 1 : 0;
  const progress = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return progress * progress * (3 - 2 * progress);
};

export const BOARD_TEXT_PRESENTATION_DEFAULTS = Object.freeze({
  faintOpacity: 0.1,
  focusOpacity: 1,
  drawViewport: 0.3,
});

/** One route-wide line-drawing model, shared by both site themes. */
export function boardTextPresentationFromRuntimeConfig(runtime = {}) {
  const faintOpacity = clamp(runtime.aboutBoardTextFaintOpacity, 0.05, 0.4,
    BOARD_TEXT_PRESENTATION_DEFAULTS.faintOpacity);
  const focusOpacity = Math.max(faintOpacity, clamp(runtime.aboutBoardTextFocusOpacity,
    0.3, 1, BOARD_TEXT_PRESENTATION_DEFAULTS.focusOpacity));
  const drawViewport = clamp(runtime.aboutBoardTextDrawViewport, 0.12, 0.46,
    BOARD_TEXT_PRESENTATION_DEFAULTS.drawViewport);
  return Object.freeze({ faintOpacity, focusOpacity, drawViewport });
}

/** A line draws from left to right while it crosses the bottom 30vh. Scroll
 * reversal retracts it exactly; lines never fade out at the top. */
export function boardTextDrawProgressAtViewportRatio(lineTopRatio, presentation) {
  const ratio = Number.isFinite(Number(lineTopRatio)) ? Number(lineTopRatio) : 1;
  return Math.min(1, Math.max(0, (1 - ratio) / presentation.drawViewport));
}

/** The arrow is an entrance cue rather than a second progress indicator. */
export function boardScrollCueOpacity(progress) {
  return 1 - smoothstep(0, 0.08, Number(progress) || 0);
}
