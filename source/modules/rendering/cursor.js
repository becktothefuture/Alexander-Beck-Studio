// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             CURSOR BALL RENDERING                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

export function drawCursor(ctx) {
  const g = getGlobals();
  if (!g.mouseInCanvas) return;
  if (g.isTouchDevice === true) return;
  if (g.cursorBallVisible === false) return;
  
  const r = Math.max(6 * g.DPR, (g.R_MIN + g.R_MAX) * 0.12);
  ctx.save();
  ctx.beginPath();
  ctx.arc(g.mouseX, g.mouseY, r, 0, Math.PI * 2);
  ctx.fillStyle = g.currentColors ? (g.currentColors[4] || '#000000') : '#000000';
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.restore();
}



