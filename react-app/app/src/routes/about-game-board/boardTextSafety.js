const ARCHITECTURE_SHAPE_SELECTOR = [
  'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
].join(',');

function intersects(left, right, padding = 0) {
  return left.right > right.left - padding
    && left.left < right.right + padding
    && left.bottom > right.top - padding
    && left.top < right.bottom + padding;
}

function renderedLineRects(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
  range.detach?.();
  return rects;
}

function isHiddenByAncestor(element, scope) {
  // WebKit can retain SVG bounds under a display:none group. Bounds alone
  // must not turn a deliberately removed bumper into a phantom text obstacle.
  for (let node = element; node && node !== scope; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return true;
  }
  return false;
}

function architectureShapes(scope) {
  const geometry = scope.querySelector('.about-board-art #Geometry');
  if (!geometry) return [];
  return [...geometry.querySelectorAll(ARCHITECTURE_SHAPE_SELECTOR)].flatMap((element) => {
    if (!(element instanceof SVGGeometryElement)) return [];
    if (isHiddenByAncestor(element, scope)) return [];
    const rect = element.getBoundingClientRect();
    const matrix = element.getScreenCTM();
    if (!matrix || (!rect.width && !rect.height)) return [];
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return [];
    const hasFill = style.fill !== 'none' && Number(style.fillOpacity) > 0;
    const hasStroke = style.stroke !== 'none' && Number(style.strokeOpacity) > 0
      && Number.parseFloat(style.strokeWidth) > 0;
    if (!hasFill && !hasStroke) return [];
    const scale = (Math.hypot(matrix.a, matrix.b) + Math.hypot(matrix.c, matrix.d)) / 2;
    const strokePadding = hasStroke
      ? Number.parseFloat(style.strokeWidth) * scale / 2 + 1
      : 0;
    return [{
      element,
      rect,
      matrix,
      hasFill,
      hasStroke,
      strokePadding,
      textPocket: element.closest('[data-board-text-keepout="true"]')
        ?.dataset.boardTextPocket || '',
    }];
  });
}

function architectureKeepouts(scope) {
  return [...scope.querySelectorAll('[data-board-text-keepout="true"]')].flatMap((element) => {
    if (isHiddenByAncestor(element, scope)) return [];
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return [];
    return [{
      element,
      rect,
      textPocket: element.dataset.boardTextPocket || '',
    }];
  });
}

function shapePaintsPoint(shape, x, y) {
  let inverse;
  try {
    inverse = shape.matrix.inverse();
  } catch {
    return false;
  }
  const point = new DOMPoint(x, y).matrixTransform(inverse);
  return (shape.hasFill && shape.element.isPointInFill(point))
    || (shape.hasStroke && shape.element.isPointInStroke(point));
}

function lineCrossesShape(line, shape, sampleStepPx) {
  if (!intersects(line, shape.rect, shape.strokePadding)) return false;
  const left = Math.max(line.left, shape.rect.left - shape.strokePadding);
  const right = Math.min(line.right, shape.rect.right + shape.strokePadding);
  const top = Math.max(line.top, shape.rect.top - shape.strokePadding);
  const bottom = Math.min(line.bottom, shape.rect.bottom + shape.strokePadding);
  for (let y = top; y <= bottom; y += sampleStepPx) {
    for (let x = left; x <= right; x += sampleStepPx) {
      if (shapePaintsPoint(shape, x, y)) return true;
    }
  }
  return shapePaintsPoint(shape, right, bottom)
    || shapePaintsPoint(shape, left, top)
    || shapePaintsPoint(shape, (left + right) / 2, (top + bottom) / 2);
}

/** Inspect rendered line boxes against the exact painted SVG geometry. The
 * result is layout evidence; callers decide whether to move copy or use the
 * normal-flow reader fallback. */
export function findTextArchitectureOverlaps(scope, { sampleStepPx = 2 } = {}) {
  if (!scope) return [];
  const scopeRect = scope.getBoundingClientRect();
  const shapes = architectureShapes(scope);
  const keepouts = architectureKeepouts(scope);
  const overlaps = [];
  for (const text of scope.querySelectorAll('.about-board-world .about-board-text')) {
    const lines = renderedLineRects(text);
    const textSlot = text.dataset.boardTextSlot || text.textContent.trim().slice(0, 48);
    if (lines.some(line => line.left < scopeRect.left - 0.5
      || line.right > scopeRect.right + 0.5)) {
      overlaps.push({ text: textSlot, architecture: 'viewport-edge' });
      continue;
    }
    const keepout = keepouts.find(region => region.textPocket !== textSlot
      && lines.some(line => intersects(line, region.rect)));
    if (keepout) {
      overlaps.push({
        text: textSlot,
        architecture: keepout.element.id || 'architecture-keepout',
      });
      continue;
    }
    for (const shape of shapes) {
      if (shape.textPocket && shape.textPocket === textSlot) continue;
      if (!lines.some(line => lineCrossesShape(line, shape, sampleStepPx))) continue;
      overlaps.push({
        text: textSlot,
        architecture: shape.element.id || shape.element.parentElement?.id || 'anonymous-shape',
      });
      break;
    }
  }
  return overlaps;
}
