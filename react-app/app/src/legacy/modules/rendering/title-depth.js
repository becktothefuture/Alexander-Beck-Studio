import { MODES } from '../core/constants.js';
import { getGlobals } from '../core/state.js';
import { subscribeScenePointer } from '../input/pointer.js';

export const TITLE_DEPTH_PLANE_Z = 0.5;
const TITLE_RENDER_MAX_LINES = 4;
const TITLE_RENDER_MAX_GLYPHS = 64;
const TITLE_BLOOM_MAX_SCALE = 1.015;
const TITLE_BLOOM_RADIUS_FONT_MULTIPLIER = 1.25;
const TITLE_BLOOM_RADIUS_MIN_CSS_PX = 72;
const TITLE_BLOOM_RADIUS_MAX_CSS_PX = 120;
const TITLE_BLOOM_FOLLOW_MS = 90;
const TITLE_BLOOM_RELEASE_MS = 160;
const TITLE_BLOOM_SETTLE_EPSILON = 0.0001;
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
      bloomScale: 1,
      bloomTargetScale: 1,
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
    sourceId: 'hero-title',
    sourceConnected: false,
    retainedPixels: false,
    bloomActive: false,
    bloomAffectedGlyphCount: 0,
    bloomRadiusCssPx: 0,
    bloomMaxRenderedScale: 1,
    bloomMaxTargetScale: 1,
    bloomSettled: true,
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
  MODES.CUBE_3D,
  MODES.PARALLAX_FLOAT
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
    && !shouldRefreshEveryFrame(root, scene)
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

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function resolveTitleBloomInfluence(distance, radius) {
  if (!(radius > 0) || !(distance < radius)) return 0;
  const proximity = 1 - clamp01(distance / radius);
  return proximity * proximity * (3 - (2 * proximity));
}

function resetTitleBloomState({ immediate = false } = {}) {
  let settled = true;
  for (let lineIndex = 0; lineIndex < titleRenderCache.lines.length; lineIndex += 1) {
    const line = titleRenderCache.lines[lineIndex];
    for (let glyphIndex = 0; glyphIndex < line.glyphs.length; glyphIndex += 1) {
      const glyph = line.glyphs[glyphIndex];
      glyph.bloomTargetScale = 1;
      if (immediate) glyph.bloomScale = 1;
      if (Math.abs(glyph.bloomScale - 1) > TITLE_BLOOM_SETTLE_EPSILON) settled = false;
    }
  }
  titleRenderCache.state.bloomActive = false;
  titleRenderCache.state.bloomAffectedGlyphCount = 0;
  titleRenderCache.state.bloomMaxTargetScale = 1;
  titleRenderCache.state.bloomMaxRenderedScale = immediate ? 1 : titleRenderCache.state.bloomMaxRenderedScale;
  titleRenderCache.state.bloomSettled = immediate || settled;
}

// Specialized evaluator for cubic-bezier(0.22, 0, 0.16, 1). Keeping this
// numeric avoids parsing strings or allocating objects in the render loop.
function easeTitleGlyphProgress(progress) {
  const t = clamp01(progress);
  const cx = 0.66;
  const bx = -0.84;
  const ax = 1.18;
  const cy = 0;
  const by = 3;
  const ay = -2;
  let x = t;
  for (let i = 0; i < 5; i += 1) {
    const estimate = ((ax * x + bx) * x + cx) * x - t;
    const derivative = (3 * ax * x + 2 * bx) * x + cx;
    if (Math.abs(estimate) < 0.0001 || Math.abs(derivative) < 0.0001) break;
    x = clamp01(x - estimate / derivative);
  }
  return clamp01(((ay * x + by) * x + cy) * x);
}

function resolveGlyphProgress(state, now) {
  if (!state || state.settled) return 1;
  if (state.phase !== 'playing' || !(state.startedAt > 0)) return 0;
  return easeTitleGlyphProgress(
    (now - state.startedAt - state.delayMs) / Math.max(1, state.durationMs),
  );
}

function markCanvasTitleInactive(globals) {
  resetTitleBloomState({ immediate: true });
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
  titleRenderCache.state.sourceConnected = false;
  titleRenderCache.state.retainedPixels = false;
  if (globals) globals.canvasTitleRenderState = titleRenderCache.state;
  return titleRenderCache;
}

function retainCanvasTitlePixels(globals) {
  titleRenderCache.state.bloomActive = false;
  titleRenderCache.state.bloomAffectedGlyphCount = 0;
  titleRenderCache.state.bloomMaxTargetScale = 1;
  titleRenderCache.state.sourceConnected = false;
  titleRenderCache.state.retainedPixels = titleRenderCache.state.renderRevision > 0;
  if (globals) globals.canvasTitleRenderState = titleRenderCache.state;
  return titleRenderCache;
}

function shouldRefreshEveryFrame(root, scene) {
  const sceneAnimationRunning = scene?.classList?.contains('abs-scene--animating')
    && scene.getAnimations?.({ subtree: true })?.some((animation) => animation.playState === 'running');
  if (!root?.classList) return Boolean(sceneAnimationRunning);
  // The stable shell is marked entrance-complete before the route-owned Home
  // content enters. Follow the dedicated content phase so the canvas-rendered
  // title mirrors every semantic DOM opacity frame after the loader detaches.
  const bootEntranceActive = root.classList.contains('abs-home-post-boot-enter');
  return root.classList.contains('entrance-transitioning')
    || bootEntranceActive
    || root.dataset?.absTransitionPhase === 'route-loading'
    || root.dataset?.absTransitionPhase === 'route-in'
    || sceneAnimationRunning;
}

function isCanvasTitleSource(title) {
  if (!title || title.classList?.contains('hero-title--portfolio')) return false;
  if (title.dataset?.canvasTitleSource !== 'home') return false;
  const body = document.body;
  return !body?.classList.contains('portfolio-page') && !body?.classList.contains('cv-page');
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
    body?.className || '',
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
    || shouldRefreshEveryFrame(root, scene);

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
    const cssFontSize = parseCssPx(style.fontSize, 16);
    const fontSizeCssPx = Math.max(1, cssFontSize * stableTitleScale);
    const fontPx = Math.max(1, fontSizeCssPx * scaleY);
    // Modal obscuring belongs to the stable plane's CSS presentation. Never
    // bake it into pixels or opening the chooser would destructively erase the
    // title bitmap needed by the following switch transaction.
    const opacity = clamp01(parseCssPx(style.opacity, 1));
    const letterSpacingPx = parseCssPx(style.letterSpacing, 0) * stableTitleScale * scaleX;
    const fontStyle = style.fontStyle && style.fontStyle !== 'normal' ? `${style.fontStyle} ` : '';
    const fontWeight = style.fontWeight || '400';

    target.text = text;
    target.x = ((lineRect.left + lineRect.width * 0.5) - canvasRect.left) * scaleX;
    target.y = ((lineRect.top + lineRect.height * 0.5) - canvasRect.top) * scaleY;
    target.font = `${fontStyle}${fontWeight} ${fontPx.toFixed(3)}px ${style.fontFamily || 'sans-serif'}`;
    target.color = style.color || titleStyle.color || '#000';
    target.opacity = opacity;
    target.letterSpacingPx = Number.isFinite(letterSpacingPx) ? letterSpacingPx : 0;
    target.fontSizeCssPx = fontSizeCssPx;
    target.blurPx = parseBlurPx(style.filter) * scaleY;

    const glyphNodes = source.querySelectorAll?.('[data-route-enter-glyph]') || [];
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
      if (!glyphSource || glyphIndex >= target.glyphCount) continue;
      const state = glyphSource.__absRouteEntranceState || null;
      // Entrance snapshots are valid only while their glyph is animating. Once
      // settled, responsive layout becomes the sole geometry owner again.
      const glyphRect = state?.settled === true
        ? glyphSource.getBoundingClientRect()
        : state?.finalRect || glyphSource.getBoundingClientRect();
      glyphTarget.text = String(glyphSource.textContent || '').replace(/\u00a0/g, ' ');
      glyphTarget.x = ((glyphRect.left + glyphRect.width * 0.5) - canvasRect.left) * scaleX;
      glyphTarget.y = ((glyphRect.top + glyphRect.height * 0.5) - canvasRect.top) * scaleY;
      glyphTarget.font = target.font;
      glyphTarget.color = target.color;
      glyphTarget.finalOpacity = clamp01(
        state ? state.finalOpacity : opacity
      );
      glyphTarget.blurPx = Math.max(0, Number(state?.blurPx) || 0) * scaleY;
      glyphTarget.driftPx = fontSizeCssPx * (Number(state?.driftEm) || 0) * scaleX;
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
  titleRenderCache.state.sourceConnected = true;
  titleRenderCache.state.retainedPixels = false;
  globals.canvasTitleRenderState = titleRenderCache.state;

  return titleRenderCache;
}

function isTitleBloomTransitionBlocked(root) {
  const transitionPhase = root?.dataset?.absTransitionPhase || 'idle';
  return transitionPhase === 'route-out'
    || transitionPhase === 'route-loading'
    || transitionPhase === 'route-in'
    || transitionPhase === 'modal-open'
    || root?.classList?.contains('entrance-transitioning')
    || root?.classList?.contains('abs-home-post-boot-enter')
    || root?.classList?.contains('simulation-focus-modal-open');
}

function updateTitleBloomState(cache, controller, canvas, canvasRect, now) {
  const state = cache.state;
  const root = document.documentElement;
  const reducedMotion = controller.reducedMotionQuery?.matches === true;
  const glyphEntranceActive = hasActiveTitleGlyphs(cache);
  const routeIsHome = root?.dataset?.shellRoute === 'home';
  const transitionBlocked = isTitleBloomTransitionBlocked(root);
  const nonMouseInput = Boolean(controller.bloomPointerType)
    && controller.bloomPointerType !== 'mouse';
  const hardDisabled = reducedMotion
    || glyphEntranceActive
    || !routeIsHome
    || transitionBlocked
    || nonMouseInput;
  const pointerEligible = !hardDisabled
    && controller.bloomPointerValid === true
    && controller.bloomPointerType === 'mouse'
    && Number.isFinite(controller.bloomClientX)
    && Number.isFinite(controller.bloomClientY)
    && canvasRect?.width > 0
    && canvasRect?.height > 0;

  const radiusCssPx = clamp(
    state.firstLineFontSizeCssPx * TITLE_BLOOM_RADIUS_FONT_MULTIPLIER,
    TITLE_BLOOM_RADIUS_MIN_CSS_PX,
    TITLE_BLOOM_RADIUS_MAX_CSS_PX,
  );
  const scaleX = canvasRect?.width > 0 ? canvas.width / canvasRect.width : 1;
  const scaleY = canvasRect?.height > 0 ? canvas.height / canvasRect.height : 1;
  const radiusCanvasPx = radiusCssPx * ((scaleX + scaleY) * 0.5);
  const pointerX = pointerEligible
    ? (controller.bloomClientX - canvasRect.left) * scaleX
    : 0;
  const pointerY = pointerEligible
    ? (controller.bloomClientY - canvasRect.top) * scaleY
    : 0;
  const elapsedMs = controller.lastBloomFrameMs > 0
    ? Math.min(32, Math.max(0, now - controller.lastBloomFrameMs))
    : 1000 / 60;
  controller.lastBloomFrameMs = now;

  let bloomActive = false;
  let bloomSettled = true;
  let affectedGlyphCount = 0;
  let maxRenderedScale = 1;
  let maxTargetScale = 1;
  for (let lineIndex = 0; lineIndex < cache.lines.length; lineIndex += 1) {
    const line = cache.lines[lineIndex];
    for (let glyphIndex = 0; glyphIndex < line.glyphCount; glyphIndex += 1) {
      const glyph = line.glyphs[glyphIndex];
      let influence = 0;
      if (pointerEligible && glyph.state?.settled === true && glyph.text.trim()) {
        influence = resolveTitleBloomInfluence(
          Math.hypot(pointerX - glyph.x, pointerY - glyph.y),
          radiusCanvasPx,
        );
      }
      glyph.bloomTargetScale = 1 + ((TITLE_BLOOM_MAX_SCALE - 1) * influence);
      if (influence > 0) {
        bloomActive = true;
        affectedGlyphCount += 1;
      }

      if (hardDisabled) {
        glyph.bloomScale = 1;
      } else {
        const durationMs = glyph.bloomTargetScale > glyph.bloomScale
          ? TITLE_BLOOM_FOLLOW_MS
          : TITLE_BLOOM_RELEASE_MS;
        // Four time constants puts the visible response effectively at its
        // endpoint within the authored follow/release duration.
        const easing = 1 - Math.exp((-4 * elapsedMs) / durationMs);
        glyph.bloomScale += (glyph.bloomTargetScale - glyph.bloomScale) * easing;
        if (Math.abs(glyph.bloomTargetScale - glyph.bloomScale) <= TITLE_BLOOM_SETTLE_EPSILON) {
          glyph.bloomScale = glyph.bloomTargetScale;
        } else {
          bloomSettled = false;
        }
      }
      maxTargetScale = Math.max(maxTargetScale, glyph.bloomTargetScale);
      maxRenderedScale = Math.max(maxRenderedScale, glyph.bloomScale);
    }
  }

  state.bloomActive = bloomActive;
  state.bloomAffectedGlyphCount = affectedGlyphCount;
  state.bloomRadiusCssPx = radiusCssPx;
  state.bloomMaxRenderedScale = maxRenderedScale;
  state.bloomMaxTargetScale = maxTargetScale;
  state.bloomSettled = hardDisabled || bloomSettled;
  return !state.bloomSettled;
}

function drawHomepageCanvasTitleCache(ctx, canvas, globals, controller, canvasRect) {
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
  controller.bloomAnimating = updateTitleBloomState(cache, controller, canvas, canvasRect, now);
  let visible = false;
  let maxOpacity = 0;
  for (let i = 0; i < cache.lines.length; i += 1) {
    const line = cache.lines[i];
    if (line.glyphCount > 0) {
      for (let glyphIndex = 0; glyphIndex < line.glyphCount; glyphIndex += 1) {
        const glyph = line.glyphs[glyphIndex];
        if (!glyph.text) continue;
        const progress = resolveGlyphProgress(glyph.state, now);
        const opacity = glyph.finalOpacity * progress;
        maxOpacity = Math.max(maxOpacity, opacity);
        if (opacity <= 0.01) continue;
        visible = true;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = glyph.color;
        ctx.font = glyph.font;
        ctx.filter = glyph.blurPx * (1 - progress) > 0.01
          ? `blur(${(glyph.blurPx * (1 - progress)).toFixed(3)}px)`
          : 'none';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        const drawX = glyph.x + (glyph.driftPx * (1 - progress));
        if (glyph.bloomScale !== 1) {
          ctx.translate(drawX, glyph.y);
          ctx.scale(glyph.bloomScale, glyph.bloomScale);
          ctx.fillText(glyph.text, 0, 0);
        } else {
          ctx.fillText(glyph.text, drawX, glyph.y);
        }
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

function hasActiveTitleGlyphs(cache) {
  for (let lineIndex = 0; lineIndex < cache.lines.length; lineIndex += 1) {
    const line = cache.lines[lineIndex];
    for (let glyphIndex = 0; glyphIndex < line.glyphCount; glyphIndex += 1) {
      const state = line.glyphs[glyphIndex].state;
      if (state?.phase === 'playing' && state.settled !== true) return true;
    }
  }
  return false;
}

function preserveCanvasDuringResize(canvas, width, height) {
  if (canvas.width === width && canvas.height === height) return false;
  let previous = null;
  if (canvas.width > 0 && canvas.height > 0 && titleRenderCache.state.renderRevision > 0) {
    previous = document.createElement('canvas');
    previous.width = canvas.width;
    previous.height = canvas.height;
    previous.getContext('2d', { alpha: true })?.drawImage(canvas, 0, 0);
  }
  canvas.width = width;
  canvas.height = height;
  if (previous) {
    canvas.getContext('2d', { alpha: true })?.drawImage(previous, 0, 0, width, height);
  }
  return true;
}

function syncTitlePlaneBackingStore(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  preserveCanvasDuringResize(
    canvas,
    Math.max(1, Math.round(rect.width * dpr)),
    Math.max(1, Math.round(rect.height * dpr)),
  );
  return rect;
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
  const canvasRect = syncTitlePlaneBackingStore(canvas);
  const globals = getGlobals();
  const source = document.getElementById('hero-title');
  if (source !== controller.observedSource) {
    if (controller.observedSource) controller.resizeObserver?.unobserve(controller.observedSource);
    controller.observedSource = isCanvasTitleSource(source) ? source : null;
    if (controller.observedSource) controller.resizeObserver?.observe(controller.observedSource);
    titleRenderCache.signature = '';
    resetTitleBloomState({ immediate: true });
  }
  const visible = drawHomepageCanvasTitleCache(context, canvas, globals, controller, canvasRect);
  publishTitlePlaneState(canvas, globals);

  const root = document.documentElement;
  const scene = document.getElementById('abs-scene');
  if (titleRenderCache.state.sourceConnected
    && (shouldRefreshEveryFrame(root, scene)
      || hasActiveTitleGlyphs(titleRenderCache)
      || controller.bloomAnimating)) {
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
    unsubscribeScenePointer: null,
    reducedMotionQuery: null,
    bloomClientX: 0,
    bloomClientY: 0,
    bloomPointerType: '',
    bloomPointerValid: false,
    bloomAnimating: false,
    lastBloomFrameMs: 0,
    requestRender() {
      if (this.disposed || this.rafId) return;
      titleRenderCache.state.sleeping = false;
      this.rafId = window.requestAnimationFrame(() => {
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

  controller.clearBloomPointer = ({ immediate = false } = {}) => {
    controller.bloomPointerValid = false;
    if (immediate) resetTitleBloomState({ immediate: true });
    controller.requestRender();
  };
  controller.handleScenePointer = (type, detail = {}) => {
    const pointerType = detail.pointerType || '';
    controller.bloomPointerType = pointerType;
    if (
      pointerType === 'mouse'
      && detail.inBounds === true
      && Number.isFinite(detail.clientX)
      && Number.isFinite(detail.clientY)
      && type !== 'cancel'
    ) {
      controller.bloomClientX = detail.clientX;
      controller.bloomClientY = detail.clientY;
      controller.bloomPointerValid = true;
      controller.requestRender();
      return;
    }
    controller.clearBloomPointer({ immediate: Boolean(pointerType && pointerType !== 'mouse') });
  };
  controller.handlePointerLeave = () => controller.clearBloomPointer();
  controller.handleWindowBlur = () => controller.clearBloomPointer({ immediate: true });
  controller.handleVisibilityChange = () => {
    if (document.hidden) controller.clearBloomPointer({ immediate: true });
  };
  controller.handleReducedMotionChange = () => {
    if (controller.reducedMotionQuery?.matches) {
      controller.clearBloomPointer({ immediate: true });
    } else {
      controller.requestRender();
    }
  };
  controller.unsubscribeScenePointer = subscribeScenePointer(controller.handleScenePointer);
  controller.reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
  document.addEventListener('mouseleave', controller.handlePointerLeave, { passive: true });
  window.addEventListener('blur', controller.handleWindowBlur, { passive: true });
  document.addEventListener('visibilitychange', controller.handleVisibilityChange, { passive: true });
  controller.reducedMotionQuery?.addEventListener?.('change', controller.handleReducedMotionChange);

  const invalidate = () => invalidateHomepageCanvasTitleGeometry();
  controller.resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(invalidate)
    : null;
  controller.resizeObserver?.observe(canvas);

  const simulations = canvas.parentElement;
  controller.mutationObserver = typeof MutationObserver === 'function' && simulations
    ? new MutationObserver(invalidate)
    : null;
  controller.mutationObserver?.observe(simulations, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'data-route-enter-glyph-revision'],
  });

  controller.rootMutationObserver = typeof MutationObserver === 'function'
    ? new MutationObserver(invalidate)
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
  window.addEventListener('resize', controller.handleViewportChange, { passive: true });
  window.addEventListener('orientationchange', controller.handleViewportChange, { passive: true });
  window.addEventListener('abs:theme-changed', controller.handleThemeChange);
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
    if (controller.rafId) window.cancelAnimationFrame(controller.rafId);
    controller.rafId = 0;
    controller.resizeObserver?.disconnect();
    controller.mutationObserver?.disconnect();
    controller.rootMutationObserver?.disconnect();
    controller.unsubscribeScenePointer?.();
    document.removeEventListener('mouseleave', controller.handlePointerLeave);
    window.removeEventListener('blur', controller.handleWindowBlur);
    document.removeEventListener('visibilitychange', controller.handleVisibilityChange);
    controller.reducedMotionQuery?.removeEventListener?.('change', controller.handleReducedMotionChange);
    window.removeEventListener('resize', controller.handleViewportChange);
    window.removeEventListener('orientationchange', controller.handleViewportChange);
    window.removeEventListener('abs:theme-changed', controller.handleThemeChange);
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
