import { MODES } from '../core/constants.js';

export const TITLE_DEPTH_PLANE_Z = 0.5;
const TITLE_RENDER_REFRESH_MS = 500;
const TITLE_RENDER_MAX_LINES = 4;
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
    lineHeightPx: 0,
    blurPx: 0,
    reveal: 1
  })),
  state: {
    active: false,
    visible: false,
    lineCount: 0,
    maxOpacity: 0,
    firstLineFontSizeCssPx: 0,
    firstLineX: 0,
    firstLineY: 0,
    sourceId: 'hero-title'
  }
};

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
    && now - titleCenterCache.lastRefreshMs <= TITLE_RENDER_REFRESH_MS
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

function parseClipReveal(value, lineHeightPx) {
  const clipPath = String(value || '').trim();
  if (!clipPath || clipPath === 'none') return 1;
  const match = clipPath.match(/^inset\(\s*([\d.]+)(%|px)/i);
  if (!match) return 1;
  const inset = Number.parseFloat(match[1]) || 0;
  const clippedRatio = match[2] === '%'
    ? inset / 100
    : inset / Math.max(1, lineHeightPx);
  return 1 - clamp01(clippedRatio);
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
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
  const bootEntranceActive = root.classList.contains('abs-home-post-boot-enter')
    || root.classList.contains('abs-home-post-boot-pending');
  return root.classList.contains('entrance-transitioning')
    || bootEntranceActive
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
    root?.className || '',
    root?.dataset?.absTransitionPhase || '',
    root?.dataset?.absBootState || '',
    body?.className || '',
    scene?.className || '',
    scene?.style?.getPropertyValue('--abs-scene-impact-logo-scale') || '',
    document.fonts?.status || ''
  ].join('|');
}

function refreshCanvasTitleCache(ctx, globals) {
  const canvas = globals?.canvas;
  if (!ctx || !canvas || typeof document === 'undefined') return markCanvasTitleInactive(globals);

  const title = document.getElementById('hero-title');
  if (!isCanvasTitleSource(title)) return markCanvasTitleInactive(globals);

  const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
  const root = document.documentElement;
  const body = document.body;
  const scene = document.getElementById('abs-scene');
  const signature = buildTitleRenderSignature(canvas, title, root, body, scene);
  const needsRefresh = titleRenderCache.signature !== signature
    || shouldRefreshEveryFrame(root, scene)
    || now - titleRenderCache.lastRefreshMs > TITLE_RENDER_REFRESH_MS;

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
  const rootStyle = root ? getComputedStyle(root) : null;
  const uiObscured = clamp01(parseCssPx(rootStyle?.getPropertyValue('--ui-obscured'), 0));
  const canvasTitleOpacity = clamp01(
    parseCssPx(titleStyle.getPropertyValue('--canvas-title-opacity'), 1 - uiObscured)
  );
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
    target.lineHeightPx = 0;
    target.blurPx = 0;
    target.reveal = 1;
    if (!source) continue;

    const text = source.textContent?.trim() || '';
    const lineRect = source.getBoundingClientRect();
    if (!text || !lineRect || lineRect.width <= 0 || lineRect.height <= 0) continue;

    const style = getComputedStyle(source);
    const cssFontSize = parseCssPx(style.fontSize, 16);
    const fontSizeCssPx = Math.max(1, cssFontSize * stableTitleScale);
    const fontPx = Math.max(1, fontSizeCssPx * scaleY);
    const lineHeightPx = Math.max(1, lineRect.height * scaleY);
    const opacity = clamp01(parseCssPx(style.opacity, 1) * canvasTitleOpacity);
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
    target.lineHeightPx = lineHeightPx;
    target.blurPx = parseBlurPx(style.filter) * scaleY;
    target.reveal = parseClipReveal(style.clipPath, lineRect.height);

    titleRenderCache.lineCount += 1;
    titleRenderCache.maxOpacity = Math.max(titleRenderCache.maxOpacity, opacity);
    if (opacity > 0.01) titleRenderCache.visible = true;
  }

  titleRenderCache.state.active = titleRenderCache.active;
  titleRenderCache.state.visible = titleRenderCache.visible;
  titleRenderCache.state.lineCount = titleRenderCache.lineCount;
  titleRenderCache.state.maxOpacity = titleRenderCache.maxOpacity;
  titleRenderCache.state.firstLineFontSizeCssPx = titleRenderCache.lines[0].fontSizeCssPx;
  titleRenderCache.state.firstLineX = titleRenderCache.lines[0].x;
  titleRenderCache.state.firstLineY = titleRenderCache.lines[0].y;
  globals.canvasTitleRenderState = titleRenderCache.state;

  return titleRenderCache;
}

export function drawHomepageCanvasTitle(ctx, globals) {
  const cache = refreshCanvasTitleCache(ctx, globals);
  const canvas = globals?.canvas;
  if (!canvas || !cache.active || cache.lineCount <= 0) return false;

  // Claim visual ownership before this frame is composed. This makes the DOM
  // fallback disappear in the same frame as the first visible canvas draw.
  if (cache.visible && document.documentElement.dataset.absHomeCanvasTitleReady !== 'true') {
    document.documentElement.dataset.absHomeCanvasTitleReady = 'true';
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('fontKerning' in ctx) ctx.fontKerning = 'normal';
  if ('textRendering' in ctx) ctx.textRendering = 'geometricPrecision';

  for (let i = 0; i < cache.lines.length; i += 1) {
    const line = cache.lines[i];
    if (!line.text || line.opacity <= 0.01 || line.reveal <= 0.001) continue;
    ctx.save();
    // The mask is only needed while the line is entering. Removing it at the
    // settled frame preserves the typeface's real glyph bounds, including the
    // descender on the final "Technologist." line.
    if (line.reveal < 0.999) {
      const lineTop = line.y - (line.lineHeightPx * 0.5);
      const revealTop = lineTop + ((1 - line.reveal) * line.lineHeightPx);
      const descenderOverscanPx = line.lineHeightPx * 0.18;
      ctx.beginPath();
      ctx.rect(
        0,
        revealTop,
        canvas.width,
        Math.max(0, (line.lineHeightPx * line.reveal) + descenderOverscanPx)
      );
      ctx.clip();
    }
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
  return cache.visible;
}
