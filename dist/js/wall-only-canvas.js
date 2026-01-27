/* Alexander Beck Studio | 2026-01-27 */
import { q as setCanvas, ac as setEffectiveDPR, ad as drawWalls, g as getGlobals } from './shared.js';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        PORTFOLIO WALL-ONLY CANVAS                            ║
// ║                                                                              ║
// ║  The index page wall is rendered by the simulation canvas via drawWalls().   ║
// ║  The portfolio page has no balls simulation, but still needs the same wall.  ║
// ║                                                                              ║
// ║  This module draws ONLY the rubber wall ring (no balls, no physics loop).    ║
// ║  It is event-driven (resize/theme change) to avoid per-frame costs.          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function create2dContext(canvas) {
  // Match renderer defaults where possible; fall back silently.
  let ctx = null;
  try {
    ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false,
    });
  } catch (e) {}
  if (!ctx) {
    try { ctx = canvas.getContext('2d'); } catch (e) {}
  }
  if (ctx) ctx.imageSmoothingEnabled = false;
  return ctx;
}

function initPortfolioWallCanvas({
  containerId = 'bravia-balls',
  canvasSelector = '.portfolio-wall-canvas',
} = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  /** @type {HTMLCanvasElement | null} */
  const canvas = container.querySelector(canvasSelector);
  if (!canvas) return null;

  const ctx = create2dContext(canvas);
  if (!ctx) return null;

  // Provide canvas references to shared systems that read globals.canvas/ctx.
  // (We won't boot the full engine, but drawWalls() reads globals + DPR.)
  setCanvas(canvas, ctx, container);

  const g = getGlobals();
  // IMPORTANT: `g.DPR` is a getter-only property (backed by state’s internal DPR).
  // Assigning to it throws in ES module strict mode, which would prevent the wall from drawing.
  // Use the official setter instead.
  //
  // Clamp to avoid huge buffers on high-DPR devices for a static wall.
  const rawDpr = Number(window.devicePixelRatio || 1);
  const clamped = Number.isFinite(rawDpr) ? Math.max(1, Math.min(2, rawDpr)) : 1;
  try { setEffectiveDPR(clamped); } catch (e) {}

  let rafId = 0;
  let pending = false;

  const resize = () => {
    // Canvas CSS is calc(100% + 2px), so add 2px to container dimensions for buffer sizing
    const CSS_EDGE_OVERFLOW = 2;
    const wCss = container.clientWidth + CSS_EDGE_OVERFLOW;
    const hCss = container.clientHeight + CSS_EDGE_OVERFLOW;
    if (!(wCss > 0 && hCss > 0)) return;

    const dpr = g.DPR || 1;
    const nextW = Math.max(1, Math.ceil(wCss * dpr));
    const nextH = Math.max(1, Math.ceil(hCss * dpr));
    if (canvas.width !== nextW) canvas.width = nextW;
    if (canvas.height !== nextH) canvas.height = nextH;
    scheduleDraw();
  };

  const draw = () => {
    rafId = 0;
    pending = false;

    const w = canvas.width;
    const h = canvas.height;
    if (!(w > 0 && h > 0)) return;

    ctx.clearRect(0, 0, w, h);
    drawWalls(ctx, w, h);
  };

  const scheduleDraw = () => {
    if (pending) return;
    pending = true;
    rafId = window.requestAnimationFrame(draw);
  };

  // First paint + keep in sync.
  resize();

  // Resize-driven layout changes.
  window.addEventListener('resize', resize, { passive: true });

  // Theme changes change --wall-color and thus wall fill.
  const mo = new MutationObserver(() => scheduleDraw());
  try {
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  } catch (e) {}

  return {
    canvas,
    ctx,
    resize,
    redraw: scheduleDraw,
    destroy() {
      try { window.removeEventListener('resize', resize); } catch (e) {}
      try { mo.disconnect(); } catch (e) {}
      try { if (rafId) window.cancelAnimationFrame(rafId); } catch (e) {}
    },
  };
}

export { initPortfolioWallCanvas as i };
//# sourceMappingURL=wall-only-canvas.js.map
