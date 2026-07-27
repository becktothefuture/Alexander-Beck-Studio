function readMeasuredWidth(measureText, text) {
  const measurement = measureText(text);
  const width = typeof measurement === 'number'
    ? measurement
    : Number(measurement?.width);
  return Number.isFinite(width) ? width : null;
}

export function resolvePairKerningEm({
  measureText,
  previousGlyph,
  currentGlyph,
  fontSizePx,
}) {
  if (
    typeof measureText !== 'function'
    || !previousGlyph
    || !currentGlyph
    || !Number.isFinite(fontSizePx)
    || fontSizePx <= 0
  ) {
    return 0;
  }

  try {
    const previousWidth = readMeasuredWidth(measureText, previousGlyph);
    const currentWidth = readMeasuredWidth(measureText, currentGlyph);
    const pairWidth = readMeasuredWidth(measureText, `${previousGlyph}${currentGlyph}`);
    if (previousWidth == null || currentWidth == null || pairWidth == null) return 0;

    const adjustmentPx = pairWidth - previousWidth - currentWidth;
    return Number.isFinite(adjustmentPx) ? adjustmentPx / fontSizePx : 0;
  } catch {
    return 0;
  }
}
