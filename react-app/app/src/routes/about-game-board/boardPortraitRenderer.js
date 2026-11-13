import {
  getSimulationBodyMaterialAtlas, subscribeSimulationBodyMaterial,
} from '../../legacy/modules/rendering/materials/simulation-body-material.js';
import { portraitViewportRect } from './boardPortraitGeometry.js';

/** Native scrolling moves the full-size mural. Only arrivals repaint it. */
export function createPortraitRenderer(canvas, capture, getColours, onMaterialChange) {
  const context = canvas.getContext('2d', { alpha: true });
  const settledCanvas = document.createElement('canvas');
  const settledContext = settledCanvas.getContext('2d', { alpha: true });
  const bitmap = canvas.parentElement;
  let geometry = null, dpr = 1;
  let entryGeometry = null;
  let viewport = null;
  let materialDirty = true, cacheDirty = true, painted = 0, paintedRevision = -1;
  let atlas = null, colours = [], appearanceTheme = '';
  let paints = 0, cacheRebuilds = 0;

  function resize(next) {
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    const previous = geometry;
    geometry = next;
    entryGeometry = { ...next };
    capture.setEntryGeometry(entryGeometry);
    if (previous && nextDpr === dpr && ['width', 'height', 'size', 'left', 'top', 'boardScale']
      .every(key => previous[key] === next[key])) return;
    dpr = nextDpr;
    viewport = null;
    cacheDirty = true;
  }

  function updateViewport(width, height, scrollTop, panLeft) {
    if (!geometry) return;
    entryGeometry.machineLeft = panLeft;
    const next = portraitViewportRect(geometry, width, height, scrollTop, panLeft, viewport);
    if (next === viewport) return;
    viewport = next;
    bitmap.style.left = `${next.left}px`; bitmap.style.top = `${next.top}px`;
    bitmap.style.width = `${next.width}px`; bitmap.style.height = `${next.height}px`;
    const nextWidth = Math.max(1, Math.round(next.width * dpr));
    const nextHeight = Math.max(1, Math.round(next.height * dpr));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = settledCanvas.width = nextWidth;
      canvas.height = settledCanvas.height = nextHeight;
    }
    cacheDirty = true;
  }

  function paint(ctx, record) {
    const x = geometry.left + record.x * geometry.size - viewport.left;
    const y = geometry.top + record.y * geometry.portraitHeight - viewport.top;
    const radius = record.sourceRadius * geometry.boardScale;
    if (x + radius < 0 || y + radius < 0 || x - radius > viewport.width || y - radius > viewport.height) return;
    const colour = colours[record.pigment];
    if (atlas) {
      const sx = atlas.getSlot(colour) * atlas.cellStridePx + atlas.gutterPx;
      ctx.drawImage(atlas.canvas, sx, atlas.gutterPx, atlas.detailPx, atlas.detailPx,
        x - radius, y - radius, radius * 2, radius * 2);
    } else {
      ctx.fillStyle = colour;
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    }
  }

  function prepare() {
    if (!geometry || !context) return;
    const theme = document.documentElement.dataset.absTheme === 'dark' ? 'dark' : 'light';
    const nextColours = getColours();
    if (materialDirty || appearanceTheme !== theme || colours !== nextColours) {
      appearanceTheme = theme; colours = nextColours;
      atlas = getSimulationBodyMaterialAtlas(colours, { theme });
      materialDirty = false; cacheDirty = true;
    }
  }

  function draw() {
    if (!viewport || !context || (!cacheDirty && paintedRevision === capture.revision)) return;
    const { width, height } = viewport;
    settledContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (cacheDirty) {
      settledContext.clearRect(0, 0, width, height);
      painted = 0; cacheRebuilds += 1; cacheDirty = false;
    }
    for (; painted < capture.settled.length; painted += 1) {
      paint(settledContext, capture.records[capture.settled[painted]]);
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(settledCanvas, 0, 0);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let index = 0; index < capture.activeCount; index += 1) {
      paint(context, capture.records[capture.active[index]]);
    }
    paintedRevision = capture.revision; paints += 1;
  }

  const unsubscribe = subscribeSimulationBodyMaterial(() => {
    materialDirty = true; onMaterialChange();
  });
  return { resize, updateViewport, prepare, draw,
    invalidate: () => { materialDirty = true; },
    inspect: () => ({ ...geometry, viewport, paints, cacheRebuilds,
      backingPixels: canvas.width * canvas.height + settledCanvas.width * settledCanvas.height,
      atlasKey: atlas?.key || null, colours }),
    dispose: () => { unsubscribe(); canvas.width = canvas.height = 1;
      settledCanvas.width = settledCanvas.height = 1; },
  };
}
