// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           RENDERING EFFECTS                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

export function applyCanvasShadow(canvas) {
  // Shadows disabled - always clear filter
    canvas.style.filter = '';
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}



