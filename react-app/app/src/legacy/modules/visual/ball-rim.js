// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       BALL RIM  –  directional depth edge                  ║
// ║  Adds a subtle light/shadow rim to each ball for material depth.           ║
// ║  Designed for O(1)-ish per ball: one linearGradient + one stroke call.     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { drawPebbleBodyRim, getPebbleBodyRotation } from './pebble-body.js';

// ── Tuned defaults (from depth-test-a config panel) ──
const LIGHT_X       = -0.10;
const LIGHT_Y       = -0.15;
const RIM_WIDTH     =  0.12;   // fraction of radius
const LIGHT_STR     =  0.35;   // lighten amount
const SHADOW_STR    =  0.35;   // darken amount
const LIGHT_ALPHA   =  0.60;
const SHADOW_ALPHA  =  0.40;
const FADE_START    =  0.33;   // transparent band start
const FADE_END      =  0.83;   // transparent band end
const RIM_INSET     =  0.55;   // stroke inset factor

// ── Hex-to-RGB cache (avoids parsing every frame) ──
const rgbCache = new Map();

function getRgb(hex) {
  let rgb = rgbCache.get(hex);
  if (rgb) return rgb;
  const v = parseInt(hex.charAt(0) === '#' ? hex.slice(1) : hex, 16);
  rgb = [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  rgbCache.set(hex, rgb);
  return rgb;
}

function lighten(rgb, t) {
  return `${rgb[0] + (255 - rgb[0]) * t | 0},${rgb[1] + (255 - rgb[1]) * t | 0},${rgb[2] + (255 - rgb[2]) * t | 0}`;
}

function darken(rgb, t) {
  return `${rgb[0] * (1 - t) | 0},${rgb[1] * (1 - t) | 0},${rgb[2] * (1 - t) | 0}`;
}

/**
 * Draw directional rim for a single ball.
 * Call AFTER the flat fill has been drawn.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x    - ball centre x
 * @param {number} y    - ball centre y
 * @param {number} r    - ball radius
 * @param {string} color - hex colour string
 */
export function drawBallRim(ctx, x, y, r, color) {
  const rgb = getRgb(color);
  const lw = r * RIM_WIDTH;
  const strokeR = r - lw * RIM_INSET;

  const grad = ctx.createLinearGradient(
    x + LIGHT_X * r, y + LIGHT_Y * r,
    x - LIGHT_X * r, y - LIGHT_Y * r
  );
  const lit = lighten(rgb, LIGHT_STR);
  const shd = darken(rgb, SHADOW_STR);
  const mid = `${rgb[0]},${rgb[1]},${rgb[2]}`;

  grad.addColorStop(0,          `rgba(${lit},${LIGHT_ALPHA})`);
  grad.addColorStop(FADE_START, `rgba(${mid},0)`);
  grad.addColorStop(FADE_END,   `rgba(${mid},0)`);
  grad.addColorStop(1,          `rgba(${shd},${SHADOW_ALPHA})`);

  ctx.strokeStyle = grad;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(x, y, strokeR, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Draw a directional rim along a closed path rendered around a body.
 * The gradient stays screen-space aligned so light and shadow land consistently.
 */
export function drawDirectionalPathRim(ctx, x, y, r, color, drawPath, opts = {}) {
  if (typeof drawPath !== 'function') return;

  const rgb = getRgb(color);
  const lightX = Number.isFinite(opts.lightX) ? opts.lightX : LIGHT_X;
  const lightY = Number.isFinite(opts.lightY) ? opts.lightY : LIGHT_Y;
  const rimWidth = Number.isFinite(opts.rimWidth) ? opts.rimWidth : RIM_WIDTH;
  const rimInset = Number.isFinite(opts.rimInset) ? opts.rimInset : RIM_INSET;
  const lightStr = Number.isFinite(opts.lightStr) ? opts.lightStr : LIGHT_STR;
  const shadowStr = Number.isFinite(opts.shadowStr) ? opts.shadowStr : SHADOW_STR;
  const lightAlpha = Number.isFinite(opts.lightAlpha) ? opts.lightAlpha : LIGHT_ALPHA;
  const shadowAlpha = Number.isFinite(opts.shadowAlpha) ? opts.shadowAlpha : SHADOW_ALPHA;
  const fadeStart = Number.isFinite(opts.fadeStart) ? opts.fadeStart : FADE_START;
  const fadeEnd = Number.isFinite(opts.fadeEnd) ? opts.fadeEnd : FADE_END;
  const strokeR = r - (r * rimWidth * rimInset);
  const lit = lighten(rgb, lightStr);
  const shd = darken(rgb, shadowStr);
  const mid = `${rgb[0]},${rgb[1]},${rgb[2]}`;

  const grad = ctx.createLinearGradient(
    x + lightX * r, y + lightY * r,
    x - lightX * r, y - lightY * r
  );

  grad.addColorStop(0, `rgba(${lit},${lightAlpha})`);
  grad.addColorStop(fadeStart, `rgba(${mid},0)`);
  grad.addColorStop(fadeEnd, `rgba(${mid},0)`);
  grad.addColorStop(1, `rgba(${shd},${shadowAlpha})`);

  ctx.save();
  ctx.translate(x, y);
  if (Number.isFinite(opts.rotationRad) && opts.rotationRad !== 0) {
    ctx.rotate(opts.rotationRad);
  }
  ctx.strokeStyle = grad;
  ctx.lineWidth = r * rimWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  drawPath(ctx, strokeR);
  ctx.stroke();
  ctx.restore();
}

/**
 * Batch-draw rims for an array of balls.
 * Call AFTER all flat fills have been drawn.
 * Skips tiny/culled balls for performance.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} balls - array of Ball objects (need .x, .y, .r or getDisplayRadius(), .color)
 * @param {object} [opts]
 * @param {number} [opts.canvasWidth]
 * @param {number} [opts.canvasHeight]
 * @param {number} [opts.minRadius] - skip balls below this radius (LOD)
 */
export function drawBallRims(ctx, balls, opts) {
  if (!balls || balls.length === 0) return;
  const globals = getGlobals();
  const cw = opts?.canvasWidth ?? Number.POSITIVE_INFINITY;
  const ch = opts?.canvasHeight ?? Number.POSITIVE_INFINITY;
  const minR = opts?.minRadius ?? 0;

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const r = (typeof b.getDisplayRadius === 'function') ? b.getDisplayRadius() : b.r;
    if ((b?.squashAmount || 0) > 0.01) continue;
    if (r <= minR) continue;
    if (b.x + r < 0 || b.y + r < 0 || b.x - r > cw || b.y - r > ch) continue;
    drawPebbleBodyRim(ctx, b, b.x, b.y, r, b.color, globals, {
      rotationRad: getPebbleBodyRotation(b),
    });
  }
}
