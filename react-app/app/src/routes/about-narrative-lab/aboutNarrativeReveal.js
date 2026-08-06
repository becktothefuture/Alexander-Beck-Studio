const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export const ABOUT_NARRATIVE_REVEAL_START_VIEWPORT_Y = 1;
export const ABOUT_NARRATIVE_REVEAL_TRAVEL_VIEWPORT = 0.2;
export const ABOUT_NARRATIVE_REVEAL_ROW_TOLERANCE_PX = 1;
export const ABOUT_NARRATIVE_REVEAL_ROW_ADVANCE_CAP = 1.25;
export const ABOUT_NARRATIVE_REVEAL_SOFTNESS_MIN_PX = 4;
export const ABOUT_NARRATIVE_REVEAL_SOFTNESS_MAX_PX = 18;
export const ABOUT_NARRATIVE_EDITORIAL_UPCOMING_OPACITY = 0.04;
export const ABOUT_NARRATIVE_EDITORIAL_EARLIER_OPACITY = 0.14;
export const ABOUT_NARRATIVE_EDITORIAL_PREVIOUS_OPACITY = 0.4;
export const ABOUT_NARRATIVE_EDITORIAL_ACTIVE_OPACITY = 1;
export const ABOUT_NARRATIVE_EDITORIAL_ACTIVE_THRESHOLD = 0.18;
export const ABOUT_NARRATIVE_EDITORIAL_PHRASE_THRESHOLD = 0.12;

const smoothstep = (start, end, value) => {
  const progress = clamp01((Number(value) - start) / Math.max(0.000001, end - start));
  return progress * progress * (3 - (2 * progress));
};

export function getAboutNarrativeEditorialFocusOpacity(
  moduleIndex,
  lineProgress,
  activeModuleIndex,
  reducedMotion = false,
) {
  if (moduleIndex < activeModuleIndex - 1) return ABOUT_NARRATIVE_EDITORIAL_EARLIER_OPACITY;
  if (moduleIndex === activeModuleIndex - 1) return ABOUT_NARRATIVE_EDITORIAL_PREVIOUS_OPACITY;
  if (moduleIndex > activeModuleIndex || activeModuleIndex < 0) {
    return ABOUT_NARRATIVE_EDITORIAL_UPCOMING_OPACITY;
  }
  if (reducedMotion) {
    return Number(lineProgress) >= ABOUT_NARRATIVE_EDITORIAL_PHRASE_THRESHOLD
      ? ABOUT_NARRATIVE_EDITORIAL_ACTIVE_OPACITY
      : ABOUT_NARRATIVE_EDITORIAL_UPCOMING_OPACITY;
  }
  return ABOUT_NARRATIVE_EDITORIAL_UPCOMING_OPACITY + (
    (ABOUT_NARRATIVE_EDITORIAL_ACTIVE_OPACITY - ABOUT_NARRATIVE_EDITORIAL_UPCOMING_OPACITY)
    * smoothstep(0.12, 0.72, lineProgress)
  );
}

export function getAboutNarrativeEditorialPhraseOpacity(
  moduleIndex,
  lineProgress,
  activeModuleIndex,
  reducedMotion = false,
) {
  if (moduleIndex > activeModuleIndex
    || Number(lineProgress) < ABOUT_NARRATIVE_EDITORIAL_PHRASE_THRESHOLD) return 0;
  return reducedMotion || Number(lineProgress) >= ABOUT_NARRATIVE_EDITORIAL_PHRASE_THRESHOLD
    ? 1
    : 0;
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
