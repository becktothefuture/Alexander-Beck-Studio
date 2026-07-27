const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const EDGE_CLIP_ID = 'atmosphere-edge-light-clip';
const SQUIRCLE_EXPONENT = 4;
const SQUIRCLE_SEGMENTS_PER_CORNER = 16;

function formatPathNumber(value) {
  return Number(value.toFixed(3));
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width * 0.5, height * 0.5));
  const right = x + width;
  const bottom = y + height;
  return [
    `M ${x + r} ${y}`,
    `H ${right - r}`,
    `Q ${right} ${y} ${right} ${y + r}`,
    `V ${bottom - r}`,
    `Q ${right} ${bottom} ${right - r} ${bottom}`,
    `H ${x + r}`,
    `Q ${x} ${bottom} ${x} ${bottom - r}`,
    `V ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

function appendSuperellipseCorner(points, centerX, centerY, radiusX, radiusY, startAngle, endAngle) {
  const power = 2 / SQUIRCLE_EXPONENT;
  for (let index = 1; index <= SQUIRCLE_SEGMENTS_PER_CORNER; index += 1) {
    const progress = index / SQUIRCLE_SEGMENTS_PER_CORNER;
    const angle = startAngle + (endAngle - startAngle) * progress;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const offsetX = Math.sign(cosine) * Math.abs(cosine) ** power * radiusX;
    const offsetY = Math.sign(sine) * Math.abs(sine) ** power * radiusY;
    points.push(`${formatPathNumber(centerX + offsetX)} ${formatPathNumber(centerY + offsetY)}`);
  }
}

function squircleRectPath(x, y, width, height, radius) {
  const radiusX = Math.max(0, Math.min(radius, width * 0.5));
  const radiusY = Math.max(0, Math.min(radius, height * 0.5));
  if (radiusX <= 0 || radiusY <= 0) return roundedRectPath(x, y, width, height, 0);

  const right = x + width;
  const bottom = y + height;
  const points = [`M ${formatPathNumber(x + radiusX)} ${formatPathNumber(y)}`];
  points.push(`L ${formatPathNumber(right - radiusX)} ${formatPathNumber(y)}`);
  appendSuperellipseCorner(points, right - radiusX, y + radiusY, radiusX, radiusY, -Math.PI * 0.5, 0);
  points.push(`L ${formatPathNumber(right)} ${formatPathNumber(bottom - radiusY)}`);
  appendSuperellipseCorner(points, right - radiusX, bottom - radiusY, radiusX, radiusY, 0, Math.PI * 0.5);
  points.push(`L ${formatPathNumber(x + radiusX)} ${formatPathNumber(bottom)}`);
  appendSuperellipseCorner(points, x + radiusX, bottom - radiusY, radiusX, radiusY, Math.PI * 0.5, Math.PI);
  points.push(`L ${formatPathNumber(x)} ${formatPathNumber(y + radiusY)}`);
  appendSuperellipseCorner(points, x + radiusX, y + radiusY, radiusX, radiusY, Math.PI, Math.PI * 1.5);
  points.push('Z');
  return points.join(' ');
}

function usesSquircleCorner(cornerShape) {
  const normalized = String(cornerShape || '').trim().toLowerCase();
  return normalized === 'squircle' || /superellipse\(\s*2(?:\.0+)?\s*\)/.test(normalized);
}

function contourPath(x, y, width, height, radius, cornerShape) {
  return usesSquircleCorner(cornerShape)
    ? squircleRectPath(x, y, width, height, radius)
    : roundedRectPath(x, y, width, height, radius);
}

function createClipDefinition() {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.classList.add('atmosphere-edge-light-defs');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.pointerEvents = 'none';
  const definitions = document.createElementNS(SVG_NAMESPACE, 'defs');
  const clipPath = document.createElementNS(SVG_NAMESPACE, 'clipPath');
  clipPath.id = EDGE_CLIP_ID;
  clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');
  const path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('clip-rule', 'evenodd');
  path.setAttribute('fill-rule', 'evenodd');
  clipPath.append(path);
  definitions.append(clipPath);
  svg.append(definitions);
  return { svg, path };
}

export class AtmosphereEdgeLight {
  constructor(outputCanvas) {
    this.outputCanvas = outputCanvas;
    this.outputContext = outputCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!this.outputContext) throw new Error('Canvas 2D edge-light context unavailable');
    const clip = createClipDefinition();
    this.clipSvg = clip.svg;
    this.clipPath = clip.path;
    this.outputCanvas.style.clipPath = `url(#${EDGE_CLIP_ID})`;
    this.outputCanvas.style.webkitClipPath = `url(#${EDGE_CLIP_ID})`;
    this.resizeKey = '';
    this.filterKey = '';
    this.exposureFilter = 'none';
    this.smoothingQuality = 'high';
  }

  setQuality(qualityId) {
    this.smoothingQuality = qualityId === 'low' ? 'low' : qualityId === 'balanced' ? 'medium' : 'high';
  }

  resize(backingWidth, backingHeight, cssWidth, cssHeight, edgeWidthPx, cornerRadiusPx, cornerShape) {
    const width = Math.max(2, Math.round(backingWidth));
    const height = Math.max(2, Math.round(backingHeight));
    if (this.outputCanvas.width !== width || this.outputCanvas.height !== height) {
      this.outputCanvas.width = width;
      this.outputCanvas.height = height;
    }

    const displayWidth = Math.max(2, Number(cssWidth) || 2);
    const displayHeight = Math.max(2, Number(cssHeight) || 2);
    const edgeWidth = Math.max(1, Math.min(2, Number(edgeWidthPx) || 1.5));
    const radius = Math.max(
      edgeWidth,
      Math.min(Number(cornerRadiusPx) || 42, displayWidth * 0.5, displayHeight * 0.5),
    );
    const normalizedCornerShape = usesSquircleCorner(cornerShape) ? 'squircle' : 'round';
    const nextKey = `${displayWidth}:${displayHeight}:${edgeWidth}:${radius}:${normalizedCornerShape}`;
    if (nextKey === this.resizeKey) return;
    this.resizeKey = nextKey;

    const innerWidth = Math.max(0, displayWidth - edgeWidth * 2);
    const innerHeight = Math.max(0, displayHeight - edgeWidth * 2);
    this.clipPath.setAttribute(
      'd',
      `${contourPath(0, 0, displayWidth, displayHeight, radius, normalizedCornerShape)} ${contourPath(
        edgeWidth,
        edgeWidth,
        innerWidth,
        innerHeight,
        Math.max(0, radius - edgeWidth),
        normalizedCornerShape,
      )}`,
    );
  }

  render(sourceCanvas, intensity) {
    const context = this.outputContext;
    const width = this.outputCanvas.width;
    const height = this.outputCanvas.height;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.filter = 'none';
    context.clearRect(0, 0, width, height);
    if (!sourceCanvas || intensity <= 0) return;

    const strength = Math.min(2.5, Math.max(0, Number(intensity) || 0));
    context.globalAlpha = Math.min(1, strength);
    const filterKey = Math.round(strength * 100);
    if (filterKey !== this.filterKey) {
      this.filterKey = filterKey;
      this.exposureFilter = `brightness(${(1 + strength * 1.15).toFixed(2)}) saturate(${(1.15 + strength * 0.25).toFixed(2)})`;
    }
    context.filter = this.exposureFilter;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = this.smoothingQuality;
    context.drawImage(sourceCanvas, 0, 0, width, height);

    const exposurePass = Math.min(1, Math.max(0, strength - 0.75) * 0.65);
    if (exposurePass > 0) {
      context.globalCompositeOperation = 'lighter';
      context.globalAlpha = exposurePass;
      context.drawImage(sourceCanvas, 0, 0, width, height);
    }
    context.filter = 'none';
    context.globalAlpha = 1;
  }

  clear() {
    this.outputContext.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
  }

  destroy() {
    this.clear();
    this.outputCanvas.style.removeProperty('clip-path');
    this.outputCanvas.style.removeProperty('-webkit-clip-path');
    this.clipSvg.remove();
  }
}
