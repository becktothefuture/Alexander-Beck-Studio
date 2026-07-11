// Canvas-native studio light pools. The anchors are sampled from the active
// scene on mode/size changes, then remain fixed in the window: no pointer input,
// DOM compositing, pixel readback, filters, or per-frame gradient construction.

const DESKTOP_POOL_COUNT = 2;
const SPRITE_SIZE = 128;
const MIN_POOL_RADIUS = 180;
const MAX_POOL_RADIUS = 520;
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
  if (globals?.isMobile || globals?.isMobileViewport || globals?.liteModeEnabled) return true;
  return coarsePointerMedia?.matches === true;
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

function createPoolSprite(color) {
  const sprite = document.createElement('canvas');
  sprite.width = SPRITE_SIZE;
  sprite.height = SPRITE_SIZE;
  const spriteCtx = sprite.getContext('2d', { alpha: true });
  if (!spriteCtx) return null;

  const center = SPRITE_SIZE * 0.5;
  const gradient = spriteCtx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, colorToRgba(color, 0.68));
  gradient.addColorStop(0.18, colorToRgba(color, 0.26));
  gradient.addColorStop(0.52, colorToRgba(color, 0.08));
  gradient.addColorStop(1, colorToRgba(color, 0));
  spriteCtx.fillStyle = gradient;
  spriteCtx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  return sprite;
}

function selectPoolAnchors(globals, state) {
  const balls = globals.balls;
  const canvas = globals.canvas;
  if (!Array.isArray(balls) || balls.length === 0 || !canvas) return false;

  const width = canvas.width;
  const height = canvas.height;
  const targets = [[width * 0.7, height * 0.28], [width * 0.3, height * 0.7]];
  const minDimension = Math.min(width, height);
  const poolRadius = clamp(minDimension * 0.44, MIN_POOL_RADIUS, MAX_POOL_RADIUS);
  state.pools.length = 0;

  for (let targetIndex = 0; targetIndex < DESKTOP_POOL_COUNT; targetIndex += 1) {
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
      const score = radius * 3 - Math.sqrt(dx * dx + dy * dy) * 0.18;
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
  return state.pools.length > 0;
}

/** Draws cached light sprites beneath the title and simulation bodies. */
export function drawCanvasLightFilm(ctx, globals) {
  const intensity = Number(globals?.studioLightFilmOpacity);
  if (!Number.isFinite(intensity) || intensity <= 0 || !isHomeCanvasSurface() || shouldSkipForDevice(globals)) return;

  const canvas = globals.canvas;
  if (!canvas) return;
  const ballCount = globals.balls?.length || 0;
  const state = globals.canvasLightFilmState || (globals.canvasLightFilmState = {
    mode: '', width: 0, height: 0, ballCount: 0, pools: []
  });
  const needsAnchorRefresh = state.mode !== globals.currentMode
    || state.width !== canvas.width
    || state.height !== canvas.height
    || state.ballCount !== ballCount;
  if (needsAnchorRefresh && !selectPoolAnchors(globals, state)) return;
  if (state.pools.length === 0) return;

  ctx.save();
  ctx.globalAlpha = clamp(intensity, 0, 0.4) * 0.34;
  for (let index = 0; index < state.pools.length; index += 1) {
    const pool = state.pools[index];
    if (!pool.sprite) continue;
    const diameter = pool.radius * 2;
    ctx.drawImage(pool.sprite, pool.x - pool.radius, pool.y - pool.radius, diameter, diameter);
  }
  ctx.restore();
}
