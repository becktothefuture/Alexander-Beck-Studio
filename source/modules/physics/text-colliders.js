// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           TEXT COLLIDERS (DOM)                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

export function updateTextColliders() {
  const globals = getGlobals();
  const container = globals.container;
  if (!container) return;
  const rects = [];
  const nodes = document.querySelectorAll('h1, h2, h3, p, a, li, .text-collider');
  const DPR = globals.DPR;
  const canvasRect = globals.canvas.getBoundingClientRect();
  nodes.forEach((el) => {
    const r = el.getBoundingClientRect();
    // Only include if intersects canvas area
    const intersects = !(r.right < canvasRect.left || r.left > canvasRect.right || r.bottom < canvasRect.top || r.top > canvasRect.bottom);
    if (!intersects) return;
    rects.push({
      x: (r.left - canvasRect.left) * DPR,
      y: (r.top - canvasRect.top) * DPR,
      width: r.width * DPR,
      height: r.height * DPR
    });
  });
  globals.textColliders = rects;
}



