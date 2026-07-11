// Canvas-native studio light pools. The anchors are sampled from the active
// scene on mode/size changes (or use the shared palette for direct-canvas modes),
// then remain fixed in the window: no pointer input,
// DOM compositing, pixel readback, filters, or per-frame gradient construction.

const DESKTOP_POOL_COUNT = 2;
const MOBILE_POOL_COUNT = 1;
const SPRITE_SIZE = 128;
const MIN_POOL_RADIUS = 180;
const MAX_POOL_RADIUS = 520;
const FALLBACK_POOL_COLORS = ['#ff9d00', '#0d5cb6'];
const coarsePointerMedia = typeof window !== 'undefined'
  ? window.matchMedia?.('(hover: none) and (pointer: coarse)')
  : null;

function isHomeCanvasSurface() {
  const body = document.body;
  return Boolean(body)
    && !body.classList.contains('portfolio-page')
    && !body.classList.contains('cv-page');
}

function shouldSkipForDevice(globals) {
  return globals?.liteModeEnabled === true;
}

function getPoolCount(globals) {
  if (globals?.isMobile || globals?.isMobileViewport || coarsePointerMedia?.matches === true) {
    return MOBILE_POOL_COUNT;
  }
  return DESKTOP_POOL_COUNT;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function colorToRgba(color, alpha) {
  const value = String(color || '').trim();
  const hex = value.startsWith('#') ? value.slice(1) : '';
  const expanded = hex.length === 3
    ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    : hex;
  if (expanded.length === 6) {
    const numeric = Number.parseInt(expanded, 16);
    if (Number.isFinite(numeric)) {
      const r = (numeric >> 16) & 255;
      const g = (numeric >> 8) & 255;
      const b = numeric & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `rgba(255, 255, 255, ${alpha})`;
}

function getColorSaturation(color) {
  const value = String(color || '').trim();
  const hex = value.startsWith('#') ? value.slice(1) : '';
  const expanded = hex.length === 3
    ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    : hex;
  if (expanded.length !== 6) return 0;
  const numeric = Number.parseInt(expanded, 16);
  if (!Number.isFinite(numeric)) return 0;
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

function createPoolSprite(color) {
  const sprite = document.createElement('canvas');
  sprite.width = SPRITE_SIZE;
  sprite.height = SPRITE_SIZE;
  const spriteCtx = sprite.getContext('2d', { alpha: true });
  if (!spriteCtx) return null;

  const center = SPRITE_SIZE * 0.5;
  const gradient = spriteCtx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, colorToRgba(color, 0.82));
  gradient.addColorStop(0.18, colorToRgba(color, 0.32));
  gradient.addColorStop(0.52, colorToRgba(color, 0.09));
  gradient.addColorStop(1, colorToRgba(color, 0));
  spriteCtx.fillStyle = gradient;
  spriteCtx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  return sprite;
}

function selectPoolAnchors(globals, state, poolCount) {
  const balls = globals.balls;
  const canvas = globals.canvas;
  if (!canvas) return false;

  const width = canvas.width;
  const height = canvas.height;
  const targets = [[width * 0.7, height * 0.28], [width * 0.3, height * 0.7]];
  const minDimension = Math.min(width, height);
  const poolRadius = clamp(minDimension * 0.44, MIN_POOL_RADIUS, MAX_POOL_RADIUS);
  state.pools.length = 0;

  if (!Array.isArray(balls) || balls.length === 0) {
    for (let targetIndex = 0; targetIndex < poolCount; targetIndex += 1) {
      const target = targets[targetIndex];
      state.pools.push({
        x: target[0],
        y: target[1],
        radius: poolRadius,
        sprite: createPoolSprite(FALLBACK_POOL_COLORS[targetIndex]),
      });
    }
    state.mode = globals.currentMode;
    state.width = width;
    state.height = height;
    state.ballCount = 0;
    state.poolCount = poolCount;
    return true;
  }

  for (let targetIndex = 0; targetIndex < poolCount; targetIndex += 1) {
    const target = targets[targetIndex];
    let chosen = null;
    let bestScore = -Infinity;
    for (let index = 0; index < balls.length; index += 1) {
      const ball = balls[index];
      if (!ball || ball.alpha === 0) continue;
      const radius = Number(ball.getDisplayRadius?.() ?? ball.r) || 0;
      if (radius <= 0) continue;
      const dx = ball.x - target[0];
      const dy = ball.y - target[1];
      const score = radius * 3
        + getColorSaturation(ball.color) * 64
        - Math.sqrt(dx * dx + dy * dy) * 0.18;
      if (score > bestScore) {
        bestScore = score;
        chosen = ball;
      }
    }
    if (!chosen) continue;
    const color = chosen.color || '#ffffff';
    state.pools.push({
      x: chosen.x,
      y: chosen.y,
      radius: poolRadius,
      sprite: createPoolSprite(color),
    });
  }

  state.mode = globals.currentMode;
  state.width = width;
  state.height = height;
  state.ballCount = balls.length;
  state.poolCount = poolCount;
  return state.pools.length > 0;
}

/** Draws cached light sprites beneath the title and simulation bodies. */
export function drawCanvasLightFilm(ctx, globals) {
  const intensity = Number(globals?.studioLightFilmOpacity);
  if (!Number.isFinite(intensity) || intensity <= 0 || !isHomeCanvasSurface() || shouldSkipForDevice(globals)) return;

  const canvas = globals.canvas;
  if (!canvas) return;
  const ballCount = globals.balls?.length || 0;
  const poolCount = getPoolCount(globals);
  const state = globals.canvasLightFilmState || (globals.canvasLightFilmState = {
    mode: '', width: 0, height: 0, ballCount: 0, poolCount: 0, pools: []
  });
  const needsAnchorRefresh = state.mode !== globals.currentMode
    || state.width !== canvas.width
    || state.height !== canvas.height
    || state.ballCount !== ballCount
    || state.poolCount !== poolCount;
  if (needsAnchorRefresh && !selectPoolAnchors(globals, state, poolCount)) return;
  if (state.pools.length === 0) return;

  ctx.save();
  ctx.globalAlpha = clamp(intensity, 0, 0.4) * 0.58;
  for (let index = 0; index < state.pools.length; index += 1) {
    const pool = state.pools[index];
    if (!pool.sprite) continue;
    const diameter = pool.radius * 2;
    ctx.drawImage(pool.sprite, pool.x - pool.radius, pool.y - pool.radius, diameter, diameter);
  }
  ctx.restore();
}
