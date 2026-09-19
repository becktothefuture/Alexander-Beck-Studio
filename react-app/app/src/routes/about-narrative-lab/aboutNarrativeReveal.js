const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export const ABOUT_NARRATIVE_REVEAL_START_VIEWPORT_Y = 0.72;
export const ABOUT_NARRATIVE_REVEAL_TRAVEL_VIEWPORT = 0.22;
export const ABOUT_NARRATIVE_REVEAL_ROW_TOLERANCE_PX = 1;
export const ABOUT_NARRATIVE_REVEAL_ROW_ADVANCE_CAP = 1.25;
export const ABOUT_NARRATIVE_REVEAL_SOFTNESS_MIN_PX = 4;
export const ABOUT_NARRATIVE_REVEAL_SOFTNESS_MAX_PX = 18;
export const ABOUT_NARRATIVE_EDITORIAL_UPCOMING_OPACITY = 0.88;
export const ABOUT_NARRATIVE_EDITORIAL_ACTIVE_OPACITY = 1;
export const ABOUT_NARRATIVE_EDITORIAL_PHRASE_THRESHOLD = 0.12;
export const ABOUT_NARRATIVE_EDITORIAL_EXIT_START_VIEWPORT_Y = 0.32;
export const ABOUT_NARRATIVE_EDITORIAL_EXIT_END_VIEWPORT_Y = 0.12;

export function getAboutNarrativeEditorialFocusOpacity(
  _lineProgress,
  viewportY,
  reducedMotion = false,
) {
  if (reducedMotion) return 1;
  // One restrained paragraph entrance. Once visible, copy remains readable all
  // the way to the viewport edge; there is no internal dimmed reading band.
  const t = clamp01((1 - Number(viewportY)) / 0.12);
  return 0.88 + 0.12 * t * t * (3 - 2 * t);
}

export function getAboutNarrativeEditorialPhraseOpacity() {
  return 1;
}

export function getAboutNarrativeReadingOrderRevealMetrics(items = []) {
  const rows = [];
  const metrics = new Array(items.length);

  items.forEach((item, index) => {
    const top = Number(item?.top) || 0;
    const height = Math.max(1, Number(item?.height) || 0);
    const currentRow = rows.at(-1);
    if (!currentRow || Math.abs(top - currentRow.top) > ABOUT_NARRATIVE_REVEAL_ROW_TOLERANCE_PX) {
      rows.push({ top, height, items: [{ atomic: item?.atomic === true, index }] });
      return;
    }
    currentRow.height = Math.max(currentRow.height, height);
    currentRow.items.push({ atomic: item?.atomic === true, index });
  });

  rows.forEach((row, rowIndex) => {
    const nextTop = Number(rows[rowIndex + 1]?.top);
    const naturalAdvance = Number.isFinite(nextTop) && nextTop > row.top
      ? nextTop - row.top
      : row.height;
    const rowAdvance = Math.max(
      1,
      Math.min(naturalAdvance, row.height * ABOUT_NARRATIVE_REVEAL_ROW_ADVANCE_CAP),
    );
    const step = rowAdvance / Math.max(1, row.items.length);
    const softnessPx = clamp(
      step * 0.9,
      ABOUT_NARRATIVE_REVEAL_SOFTNESS_MIN_PX,
      ABOUT_NARRATIVE_REVEAL_SOFTNESS_MAX_PX,
    );

    const atomicRow = row.items.every((item) => item.atomic);
    row.items.forEach(({ index }, itemIndex) => {
      metrics[index] = {
        revealOffsetPx: atomicRow
          ? row.top
          : row.top - rowAdvance + (step * (itemIndex + 1)),
        revealSoftnessPx: softnessPx,
      };
    });
  });

  return metrics;
}

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
