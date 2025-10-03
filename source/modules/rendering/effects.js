// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           RENDERING EFFECTS                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

export function applyCanvasShadow(canvas) {
  const g = getGlobals();
  const enabled = g.canvasShadowEnabled || false;
  if (!enabled) {
    canvas.style.filter = '';
    return;
  }
  const x = g.shadowOffsetX || 1;
  const y = g.shadowOffsetY || 1;
  const blur = g.shadowBlur || 0;
  const color = g.shadowColor || '#000000';
  const op = g.shadowOpacity || 0.29;
  const second = g.shadow2Enabled ? ` drop-shadow(0 0 ${g.shadow2Blur||4}px rgba(0,0,0,${g.shadow2Opacity||0.10}))` : '';
  canvas.style.filter = `drop-shadow(${x}px ${y}px ${blur}px ${hexToRgba(color, op)})${second}`;
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}



