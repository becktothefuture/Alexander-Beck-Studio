/** Fit the mural around the original balls and put its lowest row on the ledge. */
export function portraitFieldGeometry(map, width, radius, spacing) {
  const pitch = radius * 2 * (1 + spacing);
  const size = pitch / map.pitch;
  const portraitHeight = size / map.aspect;
  let firstX = 1, lastX = 0, firstY = 1, lastY = 0;
  for (const target of map.targets) {
    firstX = Math.min(firstX, target.x);
    lastX = Math.max(lastX, target.x);
    firstY = Math.min(firstY, target.y);
    lastY = Math.max(lastY, target.y);
  }
  const occupiedWidth = (lastX - firstX) * size + radius * 2;
  const occupiedHeight = (lastY - firstY) * portraitHeight + radius * 2;
  const outlet = Math.ceil(radius * 2 + 2);
  const headroom = Math.round(Math.max(164, Math.min(304, width * .22)));
  const ledgeTop = Math.ceil(outlet + headroom + occupiedHeight);
  const ledgeThickness = Math.round(Math.max(10, Math.min(20, width * .014)));
  const sideClearance = Math.max(16, radius * 2);
  const fieldWidth = Math.ceil(Math.max(width, occupiedWidth + sideClearance * 2));
  return { width: fieldWidth, height: ledgeTop + ledgeThickness, size, portraitHeight, radius, pitch,
    left: (fieldWidth - (firstX + lastX) * size) / 2,
    top: ledgeTop - lastY * portraitHeight - radius,
    machineLeft: (fieldWidth - width) / 2,
    outlet, headroom, floorY: lastY, ledge: { top: ledgeTop, thickness: ledgeThickness } };
}

/** Reuse a buffered bitmap until native scrolling approaches its edge. */
export function portraitViewportRect(field, width, height, scrollTop, panLeft, previous) {
  width = Math.min(field.width, width);
  height = Math.min(field.height, height);
  const bitmapWidth = Math.min(field.width, Math.ceil(width * 1.25));
  const bitmapHeight = Math.min(field.height, Math.ceil(height * 1.25));
  const x = Math.max(0, Math.min(field.width - width, panLeft));
  const y = Math.max(0, Math.min(field.height - height, scrollTop));
  const marginX = Math.max(0, bitmapWidth - width);
  const marginY = Math.max(0, bitmapHeight - height);
  if (previous && previous.width === bitmapWidth && previous.height === bitmapHeight
    && x >= previous.left + (previous.left > 0 ? marginX / 4 : 0)
    && x + width <= previous.left + bitmapWidth - (previous.left + bitmapWidth < field.width ? marginX / 4 : 0)
    && y >= previous.top + (previous.top > 0 ? marginY / 4 : 0)
    && y + height <= previous.top + bitmapHeight - (previous.top + bitmapHeight < field.height ? marginY / 4 : 0)) return previous;
  return { width: bitmapWidth, height: bitmapHeight,
    left: Math.floor(Math.max(0, Math.min(field.width - bitmapWidth, x - marginX / 2))),
    top: Math.floor(Math.max(0, Math.min(field.height - bitmapHeight, y - marginY / 2))) };
}
