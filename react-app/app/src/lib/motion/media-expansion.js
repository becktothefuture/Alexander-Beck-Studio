/** A single scale preserves pixels; a changing crop reveals the target shape. */
export function getMediaExpansionFrame(source, target, radius = 0) {
  if (!(source?.width > 0 && source?.height > 0 && target?.width > 0 && target?.height > 0)) {
    return { transform: 'none', clipPath: 'inset(0px round 0px)', scale: 1 };
  }
  const scale = Math.max(source.width / target.width, source.height / target.height);
  const x = source.left + source.width / 2 - target.left - target.width / 2;
  const y = source.top + source.height / 2 - target.top - target.height / 2;
  const insetX = Math.max(0, (target.width - source.width / scale) / 2);
  const insetY = Math.max(0, (target.height - source.height / scale) / 2);
  return {
    transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
    clipPath: `inset(${insetY}px ${insetX}px round ${Math.max(0, Number(radius) || 0) / scale}px)`,
    scale,
  };
}

export function fitMediaSize(width, height, aspectRatio) {
  const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const fittedWidth = Math.max(1, Math.min(Math.max(1, width), Math.max(1, height) * ratio));
  return { width: fittedWidth, height: fittedWidth / ratio };
}

function objectOffset(value, freeSpace) {
  if (value === 'left' || value === 'top') return 0;
  if (value === 'right' || value === 'bottom') return freeSpace;
  if (String(value).endsWith('%')) return freeSpace * Number.parseFloat(value) / 100;
  if (String(value).endsWith('px')) return Number.parseFloat(value);
  return freeSpace / 2;
}

/** Keep the actual image crop continuous when a portrait cover enters a
 * narrower phone hero or a wide desktop hero. Both scales remain uniform. */
export function getCoverImageExpansion(source, target, aspectRatio,
  sourcePosition = '50% 50%', targetPosition = '50% 50%') {
  if (!(source?.width > 0 && source?.height > 0 && target?.width > 0 && target?.height > 0
    && Number.isFinite(aspectRatio) && aspectRatio > 0)) return null;
  const outerScale = getMediaExpansionFrame(source, target).scale;
  const width = Math.max(target.width, target.height * aspectRatio);
  const height = width / aspectRatio;
  const sourceWidth = Math.max(source.width, source.height * aspectRatio);
  const sourceHeight = sourceWidth / aspectRatio;
  const sourceScale = sourceWidth / (width * outerScale);
  const sourceAxes = sourcePosition.trim().split(/\s+/);
  const targetAxes = targetPosition.trim().split(/\s+/);
  const x = (target.width - source.width / outerScale) / 2
    + objectOffset(sourceAxes[0], source.width - sourceWidth) / outerScale;
  const y = (target.height - source.height / outerScale) / 2
    + objectOffset(sourceAxes[1], source.height - sourceHeight) / outerScale;
  const targetX = objectOffset(targetAxes[0], target.width - width);
  const targetY = objectOffset(targetAxes[1], target.height - height);
  return {
    width, height, sourceScale, outerScale,
    from: `translate3d(${x}px, ${y}px, 0) scale(${sourceScale})`,
    to: `translate3d(${targetX}px, ${targetY}px, 0) scale(1)`,
  };
}
