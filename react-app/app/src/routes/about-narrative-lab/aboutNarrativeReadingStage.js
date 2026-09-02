// Native copy remains readable through the entire studio window. Only feather
// its actual viewport edges; the landscape does not reserve a hidden text band.
export const ABOUT_READING_STAGE = Object.freeze({ top: 0, bottom: 1, featherPx: 18 });

export function writeAboutNarrativeReadingStage(
  target,
  fieldTopPx,
  fieldHeightPx,
  viewportHeight,
  stage = ABOUT_READING_STAGE,
  bottomInsetPx = 0,
) {
  const height = Math.max(1, Number(viewportHeight) || 1);
  const top = Number(fieldTopPx) || 0;
  const fieldHeight = Math.max(0, Number(fieldHeightPx) || 0);
  const bottomInset = Math.min(height - 1, Math.max(0, Number(bottomInsetPx) || 0));
  const start = height * stage.top - top;
  const end = height * stage.bottom - bottomInset - top;
  target.startPx = start;
  target.endPx = end;
  target.clipTopPx = Math.min(fieldHeight, Math.max(0, start));
  target.clipBottomPx = Math.min(fieldHeight, Math.max(0, fieldHeight - end));
  target.featherPx = Math.min(stage.featherPx, height * 0.035);
  target.visible = fieldHeight > 0 && end > 0 && start < fieldHeight;
  return target;
}
