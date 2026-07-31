const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export const ABOUT_NARRATIVE_REVEAL_START_VIEWPORT_Y = 1;
export const ABOUT_NARRATIVE_REVEAL_TRAVEL_VIEWPORT = 0.2;
export const ABOUT_NARRATIVE_REVEAL_ROW_TOLERANCE_PX = 1;
export const ABOUT_NARRATIVE_REVEAL_ROW_ADVANCE_CAP = 1.25;
export const ABOUT_NARRATIVE_REVEAL_SOFTNESS_MIN_PX = 4;
export const ABOUT_NARRATIVE_REVEAL_SOFTNESS_MAX_PX = 18;

export function getAboutNarrativeReadingOrderRevealMetrics(items = []) {
  const rows = [];
  const metrics = new Array(items.length);

  items.forEach((item, index) => {
    const top = Number(item?.top) || 0;
    const height = Math.max(1, Number(item?.height) || 0);
    const currentRow = rows.at(-1);
    if (!currentRow || Math.abs(top - currentRow.top) > ABOUT_NARRATIVE_REVEAL_ROW_TOLERANCE_PX) {
      rows.push({ top, height, items: [{ index }] });
      return;
    }
    currentRow.height = Math.max(currentRow.height, height);
    currentRow.items.push({ index });
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

    row.items.forEach(({ index }, itemIndex) => {
      metrics[index] = {
        revealOffsetPx: row.top - rowAdvance + (step * (itemIndex + 1)),
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
