import {
  getSimulationBodyMaterialAtlas,
  subscribeSimulationBodyMaterial,
} from '../../legacy/modules/rendering/materials/simulation-body-material.js';
import {
  normalizeBoardBallRadiusScale,
  resolveBoardBallRadius,
} from './boardBallPresentation.js';
import {
  ballColourFromRoleColours,
  BOARD_WIDTH,
  createBoardBallRoleAssignments,
  resolveBoardBallRoleColours,
} from './boardScene.js';
import { createBoardViewportWindow } from './boardViewportWindow.js';
import { boardSocketMetrics } from './boardGrid.js';

/**
 * Draw the board into a bounded strip that lives inside the native scrolling
 * world. The last bitmap and the SVG therefore move together on the browser's
 * compositor, even when physics or JavaScript is briefly late.
 */
export function createBoardRenderer(canvas, {
  getBalls,
  getBodies,
  getGrid,
  getPalette,
  getLayout,
  getRadiusScale = () => 1,
}) {
  // A normal synchronized context keeps presentation ordering deterministic.
  // Desynchronized mode allowed an old viewport bitmap to outrun the SVG.
  const context = canvas.getContext('2d', { alpha: true });
  const viewportWindow = createBoardViewportWindow();
  const viewport = {
    valid: false,
    stripOriginCssPx: 0,
    stripHeightCssPx: 0,
    stripEndCssPx: 0,
    boardTop: 0,
    boardBottom: 0,
    pixelsPerBoardUnit: 1,
    sampledScroll: 0,
    revision: 0,
  };
  let lastMetrics = null;
  let appliedRevision = -1;
  let cssWidth = 0;
  let cssHeight = 0;
  let dpr = 1;
  let atlas = null;
  let atlasKey = '';
  let paletteIdentity = null;
  let appearanceTheme = '';
  let materialDirty = true;
  let roleColours = resolveBoardBallRoleColours(getPalette());
  let roleAssignments = createBoardBallRoleAssignments(getBalls(), getPalette());
  let socketColour = '#d3d3d3';
  let paintCount = 0;
  let reusedPaintCount = 0;
  let rebaseCount = 0;
  let paintedRevision = -1;
  let paintedBodiesRevision = null;
  let paintedGridProgress = null;
  let paintedGridOccupancy = -1;
  let paintedGridCapturing = -1;
  let paintedSocketShadow = null;
  let paintedRadiusScale = null;
  let pixelsDirty = true;
  let renderedScrollTop = 0;
  let released = canvas.width <= 1 && canvas.height <= 1;
  let disposed = false;
  const socketMetrics = {};

  /**
   * Consume route-cached dimensions. This performs no layout measurement and
   * no paint; the next draw applies a rebase and its pixels atomically.
   */
  function updateViewport(metrics) {
    if (disposed || !metrics) return viewport;
    lastMetrics = metrics;
    const strip = viewportWindow.update(metrics);
    if (!strip.valid) return viewport;
    const scale = strip.worldWidth / BOARD_WIDTH;
    const layout = getLayout();
    viewport.valid = true;
    viewport.stripOriginCssPx = strip.stripOriginCssPx;
    viewport.stripHeightCssPx = strip.stripHeightCssPx;
    viewport.stripEndCssPx = strip.stripEndCssPx;
    viewport.boardTop = layout.inverseY(strip.stripOriginCssPx / scale);
    viewport.boardBottom = layout.inverseY(strip.stripEndCssPx / scale);
    viewport.pixelsPerBoardUnit = scale;
    viewport.sampledScroll = strip.sampledScroll;
    viewport.revision = strip.revision;
    return viewport;
  }

  function resize(metrics = lastMetrics) {
    if (!metrics) return viewport;
    return updateViewport({ ...metrics, force: true });
  }

  function applyCanvasGeometry() {
    if (!viewport.valid || disposed) return false;
    const nextWidth = lastMetrics?.worldWidth || 0;
    const nextHeight = viewport.stripHeightCssPx;
    if (nextWidth <= 0 || nextHeight <= 0) return false;
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    const geometryChanged = released
      || appliedRevision !== viewport.revision
      || Math.abs(cssWidth - nextWidth) > 0.5
      || Math.abs(cssHeight - nextHeight) > 0.5
      || nextDpr !== dpr;
    if (!geometryChanged) return true;

    canvas.style.left = '0px';
    canvas.style.top = String(viewport.stripOriginCssPx) + 'px';
    canvas.style.width = String(nextWidth) + 'px';
    canvas.style.height = String(nextHeight) + 'px';
    const backingWidth = Math.max(1, Math.round(nextWidth * nextDpr));
    const backingHeight = Math.max(1, Math.round(nextHeight * nextDpr));
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
    }
    cssWidth = nextWidth;
    cssHeight = nextHeight;
    dpr = nextDpr;
    appliedRevision = viewport.revision;
    pixelsDirty = true;
    released = false;
    return true;
  }

  function drawBall(x, y, radius, colour) {
    if (x + radius < 0 || x - radius > cssWidth
      || y + radius < 0 || y - radius > cssHeight) return;
    if (atlas) {
      const slot = atlas.getSlot(colour);
      const size = atlas.detailPx;
      const sourceX = slot * atlas.cellStridePx + atlas.gutterPx;
      context.drawImage(atlas.canvas, sourceX, atlas.gutterPx, size, size,
        x - radius, y - radius, radius * 2, radius * 2);
      return;
    }
    context.fillStyle = colour;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  function draw() {
    if (!context || disposed || !applyCanvasGeometry()) return;

    const scale = viewport.pixelsPerBoardUnit;
    const layout = getLayout();
    const firstY = viewport.boardTop - 32;
    const lastY = viewport.boardBottom + 32;
    const palette = getPalette();
    const theme = document.documentElement.dataset.absTheme === 'dark' ? 'dark' : 'light';
    if (palette !== paletteIdentity || theme !== appearanceTheme || materialDirty) {
      pixelsDirty = true;
      paletteIdentity = palette;
      appearanceTheme = theme;
      materialDirty = false;
      roleColours = resolveBoardBallRoleColours(palette);
      roleAssignments = createBoardBallRoleAssignments(getBalls(), palette);
      const architecture = canvas.closest('.about-game-board');
      socketColour = getComputedStyle(architecture || canvas)
        .getPropertyValue('--about-architecture-fixture').trim() || '#d3d3d3';
      const nextAtlas = getSimulationBodyMaterialAtlas(roleColours, { theme });
      if (nextAtlas?.key !== atlasKey) {
        atlas = nextAtlas;
        atlasKey = nextAtlas?.key || '';
      }
    }
    const radiusScale = normalizeBoardBallRadiusScale(getRadiusScale());
    const active = getBodies();
    const grid = getGrid();
    const occupiedCount = grid.occupied?.size ?? 0;
    const capturingCount = grid.capturing?.size ?? 0;
    if (!pixelsDirty && Number.isFinite(active.revision)
      && active.revision === paintedBodiesRevision && radiusScale === paintedRadiusScale
      && grid.progress === paintedGridProgress && occupiedCount === paintedGridOccupancy
      && capturingCount === paintedGridCapturing
      && grid.socketShadowOpacity === paintedSocketShadow) {
      // Native scrolling moves the valid bitmap with the architecture. This
      // acknowledges that presentation without reporting another Canvas paint.
      renderedScrollTop = viewport.sampledScroll;
      reusedPaintCount += 1;
      return;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);

    // Paint empty recesses first. Never cut holes through the Canvas: that
    // erased nearby balls and made sockets appear to sit above arrivals.
    for (const cell of grid.entries) {
      if (grid.occupied?.has(cell.id)) continue;
      const x = cell.flatX + (cell.bentX - cell.flatX) * grid.progress;
      const y = cell.flatY + (cell.bentY - cell.flatY) * grid.progress;
      if (y < firstY || y > lastY) continue;
      const socket = boardSocketMetrics(cell, radiusScale, socketMetrics);
      const px = x * scale;
      const py = layout.mapY(y) * scale - viewport.stripOriginCssPx;
      context.fillStyle = socketColour;
      context.beginPath();
      context.arc(px, py, socket.outerRadius * scale, 0, Math.PI * 2);
      context.arc(px, py + socket.holeOffsetY * scale, socket.holeRadius * scale, 0, Math.PI * 2);
      context.fill('evenodd');
    }
    // Once occupied, a cell shows only its ball and a small inset shadow.
    for (const cell of grid.entries) {
      const occupant = grid.occupied?.get(cell.id);
      if (!occupant) continue;
      const x = cell.flatX + (cell.bentX - cell.flatX) * grid.progress;
      const y = cell.flatY + (cell.bentY - cell.flatY) * grid.progress;
      if (y < firstY || y > lastY) continue;
      const radius = cell.radius + (cell.bentRadius - cell.radius) * grid.progress;
      const px = x * scale;
      const py = layout.mapY(y) * scale - viewport.stripOriginCssPx;
      const ballRadius = Math.max(1.35, resolveBoardBallRadius(radius, radiusScale) * scale);
      drawBall(px, py, ballRadius,
        occupant.colour || ballColourFromRoleColours(cell, roleColours, roleAssignments));
      const shadow = grid.socketShadowOpacity ?? 1;
      if (shadow > .001) {
        context.save();
        context.beginPath();
        context.arc(px, py, ballRadius, 0, Math.PI * 2);
        context.clip();
        context.strokeStyle = 'rgba(0,0,0,' + String(.18 * shadow) + ')';
        context.lineWidth = Math.max(1, ballRadius * .16);
        context.beginPath();
        context.arc(px, py + ballRadius * .1, ballRadius, Math.PI * 1.15, Math.PI * 1.85);
        context.stroke();
        context.restore();
      }
    }
    for (const body of active.bodies) {
      const { x, y } = body.position;
      if (y < firstY || y > lastY) continue;
      const renderScale = Number.isFinite(body.plugin?.boardRenderScale)
        ? body.plugin.boardRenderScale : 1;
      drawBall(x * scale, layout.mapY(y) * scale - viewport.stripOriginCssPx,
        Math.max(.25, body.circleRadius * scale * renderScale), body.plugin.boardColour);
    }
    paintCount += 1;
    pixelsDirty = false;
    paintedBodiesRevision = active.revision;
    paintedGridProgress = grid.progress;
    paintedGridOccupancy = occupiedCount;
    paintedGridCapturing = capturingCount;
    paintedSocketShadow = grid.socketShadowOpacity;
    paintedRadiusScale = radiusScale;
    if (paintedRevision !== viewport.revision) {
      paintedRevision = viewport.revision;
      rebaseCount += 1;
    }
    renderedScrollTop = viewport.sampledScroll;
  }

  const unsubscribeMaterial = subscribeSimulationBodyMaterial(() => {
    if (disposed) return;
    materialDirty = true;
    if (!released) draw();
  });

  function shrink() {
    if (released) return;
    canvas.width = 1;
    canvas.height = 1;
    canvas.style.width = '1px';
    canvas.style.height = '1px';
    cssWidth = 0;
    cssHeight = 0;
    dpr = 1;
    appliedRevision = -1;
    released = true;
  }

  function inspect() {
    return {
      stripOriginCssPx: viewport.stripOriginCssPx,
      stripHeightCssPx: viewport.stripHeightCssPx,
      stripEndCssPx: viewport.stripEndCssPx,
      backingBytes: canvas.width * canvas.height * 4,
      paintCount,
      reusedPaintCount,
      rebaseCount,
      sampledScroll: viewport.sampledScroll,
      renderedScrollTop,
      cssWidth,
      cssHeight,
      dpr,
      released,
      disposed,
    };
  }

  function dispose() {
    if (disposed) return;
    unsubscribeMaterial();
    atlas = null;
    shrink();
    disposed = true;
  }

  return { draw, updateViewport, resize, shrink, inspect, dispose };
}
