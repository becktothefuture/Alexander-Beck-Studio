import { MODES } from '../core/constants.js';
import { getGlobals } from '../core/state.js';
import {
  cancelStableAnimationFrame,
  requestStableAnimationFrame,
} from '../../../lib/legacy-runtime-scope.js';
import { TITLE_PLANE_INVALIDATE_EVENT } from '../../../lib/motion/route-transition-title-plane.js';

export const TITLE_DEPTH_PLANE_Z = 0.5;
const TITLE_RENDER_MAX_LINES = 4;
const TITLE_RENDER_MAX_GLYPHS = 64;
export const TITLE_SCENE_PLACEMENT = Object.freeze({
  BEHIND: 'behind',
  DEPTH_PLANE: 'depth-plane',
  HIDDEN: 'hidden'
});

const titleRenderCache = {
  signature: '',
  lastRefreshMs: 0,
  active: false,
  visible: false,
  lineCount: 0,
  maxOpacity: 0,
  sourceCenterX: 0,
  sourceCenterY: 0,
  backingDpr: 1,
  lines: Array.from({ length: TITLE_RENDER_MAX_LINES }, () => ({
    text: '',
    x: 0,
    y: 0,
    font: '',
    color: '',
    opacity: 0,
    letterSpacingPx: 0,
    fontSizeCssPx: 0,
    blurPx: 0,
    glyphCount: 0,
    glyphs: Array.from({ length: TITLE_RENDER_MAX_GLYPHS }, () => ({
      text: '',
      x: 0,
      y: 0,
      font: '',
      color: '',
      finalOpacity: 0,
      blurPx: 0,
      driftPx: 0,
      flashColors: null,
      finalColor: '',
      state: null,
    })),
  })),
  state: {
    active: false,
    visible: false,
    lineCount: 0,
    maxOpacity: 0,
    firstLineFontSizeCssPx: 0,
    firstLineX: 0,
    firstLineY: 0,
    firstGlyphX: 0,
    firstGlyphY: 0,
    entranceMovementCanvasOwned: false,
    sourceId: 'hero-title',
    sourceConnected: false,
    retainedPixels: false,
    renderRevision: 0,
    invalidationRevision: 0,
    sleeping: true,
  }
};

let titlePlaneController = null;

const titleCenterCache = {
  signature: '',
  lastRefreshMs: 0,
  x: 0,
  y: 0
};

const DEPTH_PLANE_TITLE_MODES = new Set([
  MODES.SPHERE_3D,
  MODES.CUBE_3D
]);

function getCanvasCenter(canvas) {
  return {
    x: canvas ? canvas.width * 0.5 : 0,
    y: canvas ? canvas.height * 0.5 : 0
  };
}

export function resolveTitleScenePlacement(mode) {
  return DEPTH_PLANE_TITLE_MODES.has(mode)
    ? TITLE_SCENE_PLACEMENT.DEPTH_PLANE
    : TITLE_SCENE_PLACEMENT.BEHIND;
}

export function modeUsesDepthTitlePlane(mode) {
  return resolveTitleScenePlacement(mode) === TITLE_SCENE_PLACEMENT.DEPTH_PLANE;
}

export function invalidateHomepageCanvasTitleGeometry() {
  titleRenderCache.signature = '';
  titleRenderCache.lastRefreshMs = 0;
  titleCenterCache.signature = '';
  titleCenterCache.lastRefreshMs = 0;
  titleRenderCache.state.invalidationRevision += 1;
  titlePlaneController?.requestRender();
}

export function getHeroTitleCanvasCenter(globals) {
  const canvas = globals?.canvas;
  if (!canvas || typeof document === 'undefined') return getCanvasCenter(canvas);

  const title = document.getElementById('hero-title');
  if (!title) return getCanvasCenter(canvas);

  const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
  const root = document.documentElement;
  const scene = document.getElementById('abs-scene');
  const signature = `${canvas.width}|${canvas.height}|${title.textContent}|${root?.className || ''}`;
  if (
    titleCenterCache.signature === signature
    && !shouldTrackTitleGeometryEveryFrame(scene)
  ) {
    return { x: titleCenterCache.x, y: titleCenterCache.y };
  }

  const canvasRect = canvas.getBoundingClientRect();
  const titleRect = title.getBoundingClientRect();
  globals.titleLayoutReadCount = (Number(globals.titleLayoutReadCount) || 0) + 2;
  if (
    !canvasRect ||
    !titleRect ||
    canvasRect.width <= 0 ||
    canvasRect.height <= 0 ||
    titleRect.width <= 0 ||
    titleRect.height <= 0
  ) {
    return getCanvasCenter(canvas);
  }

  titleCenterCache.signature = signature;
  titleCenterCache.lastRefreshMs = now;
  titleCenterCache.x = ((titleRect.left + titleRect.width * 0.5) - canvasRect.left) * (canvas.width / canvasRect.width);
  titleCenterCache.y = ((titleRect.top + titleRect.height * 0.5) - canvasRect.top) * (canvas.height / canvasRect.height);
  return { x: titleCenterCache.x, y: titleCenterCache.y };
}

function parseCssPx(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBlurPx(value) {
  const match = String(value || '').match(/blur\(\s*([\d.]+)px\s*\)/i);
  return match ? Math.max(0, Number.parseFloat(match[1]) || 0) : 0;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

// Specialized evaluator for cubic-bezier(0.22, 0.6, 0.4, 0.9). Keeping this
// numeric avoids parsing strings or allocating objects in the render loop.
function easeTitleGlyphProgress(progress) {
  const t = clamp01(progress);
  const cx = 0.66;
  const bx = -0.12;
  const ax = 0.46;
  const cy = 1.8;
  const by = -0.9;
  const ay = 0.1;
  let x = t;
  for (let i = 0; i < 5; i += 1) {
    const estimate = ((ax * x + bx) * x + cx) * x - t;
    const derivative = (3 * ax * x + 2 * bx) * x + cx;
    if (Math.abs(estimate) < 0.0001 || Math.abs(derivative) < 0.0001) break;
    x = clamp01(x - estimate / derivative);
  }
  return clamp01(((ay * x + by) * x + cy) * x);
}

function resolveGlyphLinearProgress(state, now) {
  if (!state || state.settled) return 1;
  if (state.phase !== 'playing' || !(state.startedAt > 0)) return -1;
  const elapsed = now - state.startedAt - state.delayMs;
  if (elapsed < 0) return -1;
  return clamp01(elapsed / Math.max(1, state.durationMs));
}

function markCanvasTitleInactive(globals) {
  titleRenderCache.active = false;
  titleRenderCache.visible = false;
  titleRenderCache.lineCount = 0;
  titleRenderCache.maxOpacity = 0;
  titleRenderCache.state.active = false;
  titleRenderCache.state.visible = false;
  titleRenderCache.state.lineCount = 0;
  titleRenderCache.state.maxOpacity = 0;
  titleRenderCache.state.firstLineFontSizeCssPx = 0;
  titleRenderCache.state.firstLineX = 0;
  titleRenderCache.state.firstLineY = 0;
  titleRenderCache.state.firstGlyphX = 0;
  titleRenderCache.state.firstGlyphY = 0;
  titleRenderCache.state.entranceMovementCanvasOwned = false;
  titleRenderCache.state.sourceConnected = false;
  titleRenderCache.state.retainedPixels = false;
  if (globals) globals.canvasTitleRenderState = titleRenderCache.state;
  return titleRenderCache;
}

function retainCanvasTitlePixels(globals) {
  titleRenderCache.state.sourceConnected = false;
  titleRenderCache.state.retainedPixels = titleRenderCache.state.renderRevision > 0;
  if (globals) globals.canvasTitleRenderState = titleRenderCache.state;
  return titleRenderCache;
}

function shouldTrackTitleGeometryEveryFrame(scene) {
  return Boolean(scene?.classList?.contains('abs-scene--animating')
    && scene.getAnimations?.({ subtree: true })?.some((animation) => {
      if (animation.playState !== 'running') return false;
      const name = String(animation.animationName || '');
      return !name.startsWith('abs-noise-');
    }));
}

function nodeContainsHomepageTitle(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  return node.id === 'hero-title' || Boolean(node.querySelector?.('#hero-title'));
}

function shouldInvalidateHomepageTitleForMutations(records, simulations) {
  const title = document.getElementById('hero-title');
  const scene = document.getElementById('abs-scene');
  return records.some((record) => {
    const target = record.target;
    if (
      target === simulations
      || target === scene
      || target === title
      || title?.contains?.(target)
    ) {
      return true;
    }
    if (record.type !== 'childList') return false;
    return [...record.addedNodes, ...record.removedNodes].some(nodeContainsHomepageTitle);
  });
}

function isCanvasTitleSource(title) {
  if (!title || title.classList?.contains('hero-title--portfolio')) return false;
  if (title.dataset?.canvasTitleSource !== 'home') return false;
  const body = document.body;
  return !body?.classList.contains('portfolio-page') && !body?.classList.contains('cv-page');
}

function getTitleRelevantBodySignature(body) {
  if (!body?.classList) return '';
  return ['portfolio-page', 'cv-page', 'atmosphere-lab-page']
    .filter((name) => body.classList.contains(name))
    .join(' ');
}

function buildTitleRenderSignature(canvas, title, root, body, scene) {
  return [
    canvas.width,
    canvas.height,
    canvas.id || '',
    title.textContent,
    title.dataset?.routeEnterGlyphRevision || '',
    root?.className || '',
    root?.dataset?.absTransitionPhase || '',
    root?.dataset?.absBootState || '',
    getTitleRelevantBodySignature(body),
    scene?.className || '',
    scene?.style?.getPropertyValue('--abs-scene-impact-logo-scale') || '',
    document.fonts?.status || ''
  ].join('|');
}

function refreshCanvasTitleCache(ctx, canvas, globals) {
  if (!ctx || !canvas || typeof document === 'undefined') return markCanvasTitleInactive(globals);

  const title = document.getElementById('hero-title');
  if (!isCanvasTitleSource(title)) {
    return titleRenderCache.state.renderRevision > 0
      ? retainCanvasTitlePixels(globals)
      : markCanvasTitleInactive(globals);
  }

  const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
  const root = document.documentElement;
  const body = document.body;
  const scene = document.getElementById('abs-scene');
  const signature = buildTitleRenderSignature(canvas, title, root, body, scene);
  const needsRefresh = titleRenderCache.signature !== signature
    || shouldTrackTitleGeometryEveryFrame(scene);

  if (!needsRefresh) return titleRenderCache;

  const canvasRect = canvas.getBoundingClientRect();
  const titleRect = title.getBoundingClientRect();
  globals.titleLayoutReadCount = (Number(globals.titleLayoutReadCount) || 0) + 2;
  if (
    !canvasRect ||
    !titleRect ||
    canvasRect.width <= 0 ||
    canvasRect.height <= 0 ||
    titleRect.width <= 0 ||
    titleRect.height <= 0
  ) {
    return markCanvasTitleInactive(globals);
  }

  const scaleX = canvas.width / canvasRect.width;
  const scaleY = canvas.height / canvasRect.height;
  const titleStyle = getComputedStyle(title);
  const lineNodes = title.querySelectorAll(
    '.hero-title__name, .hero-title__role, .hero-title__line, .hero-title__eyebrow'
  );

  titleRenderCache.signature = signature;
  titleRenderCache.lastRefreshMs = now;
  titleRenderCache.active = true;
  titleRenderCache.visible = false;
  titleRenderCache.lineCount = 0;
  titleRenderCache.maxOpacity = 0;
  titleRenderCache.sourceCenterX = (
    (titleRect.left + titleRect.width * 0.5) - canvasRect.left
  ) * scaleX;
  titleRenderCache.sourceCenterY = (
    (titleRect.top + titleRect.height * 0.5) - canvasRect.top
  ) * scaleY;

  const sourceLines = lineNodes.length ? lineNodes : [title];
  const sceneImpactLogoScale = parseCssPx(
    titleStyle.getPropertyValue('--abs-scene-impact-logo-scale'),
    1
  );
  const brandLogoUserScale = parseCssPx(
    titleStyle.getPropertyValue('--brand-logo-user-scale'),
    1
  );
  const stableTitleScale = Math.max(0.01, sceneImpactLogoScale * brandLogoUserScale);
  for (let i = 0; i < titleRenderCache.lines.length; i += 1) {
    const target = titleRenderCache.lines[i];
    const source = sourceLines[i];
    target.text = '';
    target.opacity = 0;
    target.fontSizeCssPx = 0;
    target.blurPx = 0;
    target.glyphCount = 0;
    if (!source) continue;

    const text = source.textContent?.trim() || '';
    const lineRect = source.getBoundingClientRect();
    if (!text || !lineRect || lineRect.width <= 0 || lineRect.height <= 0) continue;

    const style = getComputedStyle(source);
    const glyphNodes = source.querySelectorAll?.('[data-route-enter-glyph]') || [];
    const cssFontSize = parseCssPx(style.fontSize, 16);
    const fontSizeCssPx = Math.max(1, cssFontSize * stableTitleScale);
    const fontPx = Math.max(1, fontSizeCssPx * scaleY);
    // Surface obscuring belongs to the stable plane's CSS presentation. Never
    // bake it into pixels or a shell transition could destructively erase the
    // title bitmap needed by the following frame.
    const opacity = clamp01(parseCssPx(style.opacity, 1));
    const letterSpacingPx = parseCssPx(style.letterSpacing, 0) * stableTitleScale * scaleX;
    const fontStyle = style.fontStyle && style.fontStyle !== 'normal' ? `${style.fontStyle} ` : '';
    const fontWeight = style.fontWeight || '400';

    target.text = text;
    target.x = ((lineRect.left + (lineRect.width * 0.5)) - canvasRect.left) * scaleX;
    target.y = ((lineRect.top + (lineRect.height * 0.5)) - canvasRect.top) * scaleY;
    target.font = `${fontStyle}${fontWeight} ${fontPx.toFixed(3)}px ${style.fontFamily || 'sans-serif'}`;
    target.color = style.color || titleStyle.color || '#000';
    target.opacity = opacity;
    target.letterSpacingPx = Number.isFinite(letterSpacingPx) ? letterSpacingPx : 0;
    target.fontSizeCssPx = fontSizeCssPx;
    target.blurPx = parseBlurPx(style.filter) * scaleY;

    let drawAsSettledLine = body?.classList?.contains('atmosphere-lab-page') && glyphNodes.length > 0;
    for (let glyphIndex = 0; drawAsSettledLine && glyphIndex < glyphNodes.length; glyphIndex += 1) {
      if (glyphNodes[glyphIndex].__absRouteEntranceState?.settled !== true) drawAsSettledLine = false;
    }
    target.glyphCount = drawAsSettledLine
      ? 0
      : Math.min(TITLE_RENDER_MAX_GLYPHS, glyphNodes.length);
    for (let glyphIndex = 0; glyphIndex < target.glyphs.length; glyphIndex += 1) {
      const glyphTarget = target.glyphs[glyphIndex];
      const glyphSource = glyphNodes[glyphIndex];
      glyphTarget.text = '';
      glyphTarget.state = null;
      glyphTarget.flashColors = null;
      glyphTarget.finalColor = '';
      if (!glyphSource || glyphIndex >= target.glyphCount) continue;
      const state = glyphSource.__absRouteEntranceState || null;
      const entranceOwnsPresentation = state && state.settled !== true;
      // Canvas-owned Home glyphs keep the hidden semantic source at its live
      // responsive endpoint. DOM-rendered bookends retain their staged snapshot
      // until settlement.
      const glyphRect = state?.canvasOwnsMovement || state?.settled === true
        ? glyphSource.getBoundingClientRect()
        : state?.finalRect || glyphSource.getBoundingClientRect();
      const glyphCenterX = glyphRect.left + (glyphRect.width * 0.5);
      const glyphCenterY = glyphRect.top + (glyphRect.height * 0.5);
      glyphTarget.text = String(glyphSource.textContent || '').replace(/\u00a0/g, ' ');
      glyphTarget.x = (glyphCenterX - canvasRect.left) * scaleX;
      glyphTarget.y = (glyphCenterY - canvasRect.top) * scaleY;
      glyphTarget.font = target.font;
      glyphTarget.color = target.color;
      glyphTarget.finalOpacity = clamp01(
        entranceOwnsPresentation ? state.finalOpacity : opacity
      );
      glyphTarget.blurPx = 0;
      glyphTarget.driftPx = glyphRect.width * (Number(state?.travelPercent) || 0) * -0.01 * scaleX;
      glyphTarget.flashColors = state?.flashColors || null;
      // Settled glyphs must follow the live semantic source. Keeping their
      // entrance-time endpoint here leaves the Canvas on the previous theme
      // and discards the authored opacity of secondary title lines.
      glyphTarget.finalColor = entranceOwnsPresentation && state.finalColor
        ? state.finalColor
        : target.color;
      glyphTarget.state = state;
    }

    titleRenderCache.lineCount += 1;
    if (target.glyphCount === 0) {
      titleRenderCache.maxOpacity = Math.max(titleRenderCache.maxOpacity, opacity);
      if (opacity > 0.01) titleRenderCache.visible = true;
    }
  }

  titleRenderCache.state.active = titleRenderCache.active;
  titleRenderCache.state.visible = titleRenderCache.visible;
  titleRenderCache.state.lineCount = titleRenderCache.lineCount;
  titleRenderCache.state.maxOpacity = titleRenderCache.maxOpacity;
  titleRenderCache.state.firstLineFontSizeCssPx = titleRenderCache.lines[0].fontSizeCssPx;
  titleRenderCache.state.firstLineX = titleRenderCache.lines[0].x;
  titleRenderCache.state.firstLineY = titleRenderCache.lines[0].y;
  titleRenderCache.state.firstGlyphX = titleRenderCache.lines[0].glyphCount > 0
    ? titleRenderCache.lines[0].glyphs[0].x
    : 0;
  titleRenderCache.state.firstGlyphY = titleRenderCache.lines[0].glyphCount > 0
    ? titleRenderCache.lines[0].glyphs[0].y
    : 0;
  let entranceMovementCanvasOwned = false;
  for (let lineIndex = 0; lineIndex < titleRenderCache.lineCount; lineIndex += 1) {
    const line = titleRenderCache.lines[lineIndex];
    for (let glyphIndex = 0; glyphIndex < line.glyphCount; glyphIndex += 1) {
      const glyphState = line.glyphs[glyphIndex].state;
      if (glyphState?.canvasOwnsMovement && glyphState.settled !== true) {
        entranceMovementCanvasOwned = true;
        break;
      }
    }
    if (entranceMovementCanvasOwned) break;
  }
  titleRenderCache.state.entranceMovementCanvasOwned = entranceMovementCanvasOwned;
  titleRenderCache.state.sourceConnected = true;
  titleRenderCache.state.retainedPixels = false;
  globals.canvasTitleRenderState = titleRenderCache.state;

  return titleRenderCache;
}

function drawHomepageCanvasTitleCache(ctx, canvas, globals) {
  const cache = refreshCanvasTitleCache(ctx, canvas, globals);
  if (!canvas || !cache.active || cache.lineCount <= 0) return false;

  // A keyed route swap temporarily removes the semantic source. Keep the
  // stable plane's last good bitmap until its replacement can be measured.
  if (!cache.state.sourceConnected) return cache.visible;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('fontKerning' in ctx) ctx.fontKerning = 'normal';
  if ('textRendering' in ctx) ctx.textRendering = 'geometricPrecision';

  const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
  let visible = false;
  let maxOpacity = 0;
  for (let i = 0; i < cache.lines.length; i += 1) {
    const line = cache.lines[i];
    if (line.glyphCount > 0) {
      for (let glyphIndex = 0; glyphIndex < line.glyphCount; glyphIndex += 1) {
        const glyph = line.glyphs[glyphIndex];
        if (!glyph.text) continue;
        const linearProgress = resolveGlyphLinearProgress(glyph.state, now);
        if (linearProgress < 0) continue;
        const movementProgress = easeTitleGlyphProgress(linearProgress);
        const opacity = linearProgress < 1 ? 1 : glyph.finalOpacity;
        maxOpacity = Math.max(maxOpacity, opacity);
        if (opacity <= 0.01) continue;
        const flashColors = glyph.flashColors;
        const colorIndex = flashColors?.length && linearProgress < 1
          ? Math.min(flashColors.length - 1, Math.floor(linearProgress * flashColors.length))
          : -1;
        visible = true;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = colorIndex >= 0 ? flashColors[colorIndex] : glyph.finalColor;
        ctx.font = glyph.font;
        ctx.filter = 'none';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.fillText(
          glyph.text,
          glyph.x + (glyph.driftPx * (1 - movementProgress)),
          glyph.y,
        );
        ctx.restore();
      }
      continue;
    }
    if (!line.text || line.opacity <= 0.01) continue;
    visible = true;
    maxOpacity = Math.max(maxOpacity, line.opacity);
    ctx.save();
    ctx.globalAlpha = line.opacity;
    ctx.fillStyle = line.color;
    ctx.font = line.font;
    ctx.filter = line.blurPx > 0.01 ? `blur(${line.blurPx.toFixed(3)}px)` : 'none';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${line.letterSpacingPx.toFixed(3)}px`;
    ctx.fillText(line.text, line.x, line.y);
    ctx.restore();
  }

  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.restore();
  cache.visible = visible;
  cache.maxOpacity = maxOpacity;
  cache.state.visible = visible;
  cache.state.maxOpacity = maxOpacity;
  cache.state.renderRevision += 1;
  cache.state.retainedPixels = false;
  cache.state.sleeping = false;
  canvas.dataset.titlePlaneReady = visible ? 'true' : 'false';
  canvas.dataset.titlePlaneRenderRevision = String(cache.state.renderRevision);
  if (visible && document.documentElement.dataset.absHomeCanvasTitleReady !== 'true') {
    document.documentElement.dataset.absHomeCanvasTitleReady = 'true';
  }
  return visible;
}

function hasActiveTitleGlyphs(cache, now) {
  for (let lineIndex = 0; lineIndex < cache.lines.length; lineIndex += 1) {
    const line = cache.lines[lineIndex];
    for (let glyphIndex = 0; glyphIndex < line.glyphCount; glyphIndex += 1) {
      const state = line.glyphs[glyphIndex].state;
      if (
        state?.phase === 'playing'
        && state.settled !== true
        && resolveGlyphLinearProgress(state, now) < 1
      ) {
        return true;
      }
    }
  }
  return false;
}

function preserveCanvasDuringResize(canvas, width, height, nextDpr) {
  if (canvas.width === width && canvas.height === height) return false;
  const previousWidth = canvas.width;
  const previousHeight = canvas.height;
  const previousDpr = Math.max(0.01, Number(titleRenderCache.backingDpr) || nextDpr);
  let previous = null;
  if (previousWidth > 0 && previousHeight > 0 && titleRenderCache.state.renderRevision > 0) {
    previous = document.createElement('canvas');
    previous.width = previousWidth;
    previous.height = previousHeight;
    previous.getContext('2d', { alpha: true })?.drawImage(canvas, 0, 0);
  }
  canvas.width = width;
  canvas.height = height;
  if (previous) {
    const context = canvas.getContext('2d', { alpha: true });
    const uniformScale = nextDpr / previousDpr;
    const sourceAnchorX = Number.isFinite(titleRenderCache.sourceCenterX)
      && titleRenderCache.sourceCenterX > 0
      ? titleRenderCache.sourceCenterX
      : previousWidth * 0.5;
    const sourceAnchorY = Number.isFinite(titleRenderCache.sourceCenterY)
      && titleRenderCache.sourceCenterY > 0
      ? titleRenderCache.sourceCenterY
      : previousHeight * 0.5;
    const targetAnchorX = (sourceAnchorX / previousWidth) * width;
    const targetAnchorY = (sourceAnchorY / previousHeight) * height;
    const drawWidth = previousWidth * uniformScale;
    const drawHeight = previousHeight * uniformScale;
    const drawX = targetAnchorX - (sourceAnchorX * uniformScale);
    const drawY = targetAnchorY - (sourceAnchorY * uniformScale);
    // A retained title may outlive its keyed semantic source for a frame. Move
    // that bitmap as one rigid plane: independent width/height scaling visibly
    // squeezes the letterforms during live resize.
    context?.drawImage(
      previous,
      0,
      0,
      previousWidth,
      previousHeight,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );
  }
  titleRenderCache.backingDpr = nextDpr;
  return true;
}

function syncTitlePlaneBackingStore(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  return preserveCanvasDuringResize(
    canvas,
    Math.max(1, Math.round(rect.width * dpr)),
    Math.max(1, Math.round(rect.height * dpr)),
    dpr,
  );
}

function publishTitlePlaneState(canvas, globals) {
  const state = titleRenderCache.state;
  state.sleeping = titlePlaneController?.rafId ? false : true;
  canvas.dataset.titlePlaneSourceConnected = state.sourceConnected ? 'true' : 'false';
  canvas.dataset.titlePlaneRetainedPixels = state.retainedPixels ? 'true' : 'false';
  if (globals) globals.canvasTitleRenderState = state;
  window.dispatchEvent(new CustomEvent('abs:simulation-title-plane-rendered', {
    detail: getHomepageCanvasTitleSnapshot(),
  }));
}

function renderTitlePlane(controller) {
  if (!controller || controller.disposed || !controller.canvas.isConnected) return false;
  const { canvas, context } = controller;
  syncTitlePlaneBackingStore(canvas);
  const globals = getGlobals();
  const source = document.getElementById('hero-title');
  if (source !== controller.observedSource) {
    if (controller.observedSource) controller.resizeObserver?.unobserve(controller.observedSource);
    controller.observedSource = isCanvasTitleSource(source) ? source : null;
    if (controller.observedSource) controller.resizeObserver?.observe(controller.observedSource);
    titleRenderCache.signature = '';
  }
  const visible = drawHomepageCanvasTitleCache(context, canvas, globals);
  publishTitlePlaneState(canvas, globals);

  const scene = document.getElementById('abs-scene');
  const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
  if (titleRenderCache.state.sourceConnected
    && (
      shouldTrackTitleGeometryEveryFrame(scene)
      || hasActiveTitleGlyphs(titleRenderCache, now)
    )) {
    controller.requestRender();
  }
  return visible;
}

function createTitlePlaneController(canvas) {
  const context = canvas.getContext('2d', {
    alpha: true,
    desynchronized: true,
  }) || canvas.getContext('2d');
  if (!context) throw new Error('Stable simulation title plane requires a 2D context.');

  const controller = {
    canvas,
    context,
    disposed: false,
    rafId: 0,
    observedSource: null,
    resizeObserver: null,
    mutationObserver: null,
    rootMutationObserver: null,
    requestRender() {
      if (this.disposed || this.rafId) return;
      titleRenderCache.state.sleeping = false;
      this.rafId = requestStableAnimationFrame(() => {
        this.rafId = 0;
        renderTitlePlane(this);
        if (!this.rafId) {
          titleRenderCache.state.sleeping = true;
          this.canvas.dataset.titlePlaneSleeping = 'true';
        } else {
          this.canvas.dataset.titlePlaneSleeping = 'false';
        }
      });
    },
  };

  const invalidate = () => invalidateHomepageCanvasTitleGeometry();
  controller.resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(invalidate)
    : null;
  controller.resizeObserver?.observe(canvas);

  const simulations = canvas.parentElement;
  controller.mutationObserver = typeof MutationObserver === 'function' && simulations
    ? new MutationObserver((records) => {
      // The simulation subtree also contains the clock, controls, footer, and
      // other entrance targets. Their text/style changes cannot move the Home
      // title, so do not wake its render plane for unrelated mutations.
      if (shouldInvalidateHomepageTitleForMutations(records, simulations)) invalidate();
    })
    : null;
  controller.mutationObserver?.observe(simulations, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'data-route-enter-glyph-revision'],
  });

  controller.lastRelevantBodySignature = getTitleRelevantBodySignature(document.body);
  controller.rootMutationObserver = typeof MutationObserver === 'function'
    ? new MutationObserver((records) => {
      const hasNonBodyMutation = records.some((record) => record.target !== document.body);
      const nextBodySignature = getTitleRelevantBodySignature(document.body);
      const bodyContractChanged = nextBodySignature !== controller.lastRelevantBodySignature;
      controller.lastRelevantBodySignature = nextBodySignature;
      if (hasNonBodyMutation || bodyContractChanged) invalidate();
    })
    : null;
  controller.rootMutationObserver?.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [
      'class',
      'style',
      'data-abs-transition-phase',
      'data-abs-boot-state',
      'data-abs-theme',
      'data-shell-route',
    ],
  });
  if (document.body) {
    controller.rootMutationObserver?.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
  }

  controller.handleViewportChange = invalidate;
  controller.handleThemeChange = invalidate;
  controller.handleFontChange = invalidate;
  controller.handlePresentationChange = invalidate;
  window.addEventListener('resize', controller.handleViewportChange, { passive: true });
  window.addEventListener('orientationchange', controller.handleViewportChange, { passive: true });
  window.addEventListener('abs:theme-changed', controller.handleThemeChange);
  window.addEventListener(TITLE_PLANE_INVALIDATE_EVENT, controller.handlePresentationChange);
  document.fonts?.addEventListener?.('loadingdone', controller.handleFontChange);
  document.fonts?.ready?.then(() => {
    if (!controller.disposed) invalidate();
  });
  return controller;
}

/**
 * Attaches the one shell-owned visual title plane. The returned disposer only
 * releases observers; it deliberately leaves the bitmap intact.
 */
export function attachHomepageCanvasTitlePlane(canvas) {
  if (!canvas || typeof window === 'undefined') return undefined;
  if (titlePlaneController?.canvas === canvas && !titlePlaneController.disposed) {
    titlePlaneController.requestRender();
    return () => {};
  }
  titlePlaneController?.dispose?.();
  const controller = createTitlePlaneController(canvas);
  controller.dispose = () => {
    if (controller.disposed) return;
    controller.disposed = true;
    if (controller.rafId) cancelStableAnimationFrame(controller.rafId);
    controller.rafId = 0;
    controller.resizeObserver?.disconnect();
    controller.mutationObserver?.disconnect();
    controller.rootMutationObserver?.disconnect();
    window.removeEventListener('resize', controller.handleViewportChange);
    window.removeEventListener('orientationchange', controller.handleViewportChange);
    window.removeEventListener('abs:theme-changed', controller.handleThemeChange);
    window.removeEventListener(TITLE_PLANE_INVALIDATE_EVENT, controller.handlePresentationChange);
    document.fonts?.removeEventListener?.('loadingdone', controller.handleFontChange);
    if (titlePlaneController === controller) titlePlaneController = null;
  };
  titlePlaneController = controller;
  canvas.dataset.titlePlaneIdentity = 'shell-owned';
  controller.requestRender();
  return controller.dispose;
}

export function getHomepageCanvasTitleSnapshot() {
  const state = titleRenderCache.state;
  return {
    ...state,
    canvasId: titlePlaneController?.canvas?.id || '',
    connected: titlePlaneController?.canvas?.isConnected === true,
  };
}

export function waitForHomepageCanvasTitleReady({ timeoutMs = 2000 } = {}) {
  if (titleRenderCache.state.visible && titleRenderCache.state.sourceConnected) {
    return Promise.resolve(getHomepageCanvasTitleSnapshot());
  }
  titlePlaneController?.requestRender();
  return new Promise((resolve, reject) => {
    let timeoutId = 0;
    const settle = () => {
      const snapshot = getHomepageCanvasTitleSnapshot();
      if (!snapshot.visible || !snapshot.sourceConnected) return;
      window.removeEventListener('abs:simulation-title-plane-rendered', settle);
      window.clearTimeout(timeoutId);
      resolve(snapshot);
    };
    window.addEventListener('abs:simulation-title-plane-rendered', settle);
    timeoutId = window.setTimeout(() => {
      window.removeEventListener('abs:simulation-title-plane-rendered', settle);
      reject(new Error('Stable simulation title plane did not become ready in time.'));
    }, Math.max(1, timeoutMs));
  });
}

/**
 * Compatibility for authoring controllers that used to own a second title
 * canvas. The shell controller is now the only visual renderer.
 */
export function drawHomepageCanvasTitle() {
  if (!titlePlaneController) return false;
  if (!titleRenderCache.state.sourceConnected) titlePlaneController.requestRender();
  return titleRenderCache.state.visible;
}
