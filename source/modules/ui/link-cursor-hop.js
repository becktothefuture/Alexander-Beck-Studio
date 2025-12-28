// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                     LINK HOVER — CURSOR "HOP" EFFECT                        ║
// ║  Two-mode hover subsystem (index overlay vs portfolio/dialog UI)             ║
// ║  - Index overlay: subtle pill background + WCAG-safe illuminated text + dot  ║
// ║  - UI overlay: cursor color becomes background only; label shifts slightly   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

let isInitialized = false;
let activeLink = null;
let rafPending = false;
let pendingClientX = 0;
let pendingClientY = 0;
let pendingHasPoint = false;
let activeRect = null;

const HOVER_CLASS = 'abs-link-hovering';
const MODE_INDEX_CLASS = 'abs-hover-mode-index';
const MODE_UI_CLASS = 'abs-hover-mode-ui';
const DOT_SIZE_VAR = '--abs-cursor-hop-dot-size'; // legacy (kept for compatibility)
const PULSE_CLASS = 'abs-cursor-pulse'; // legacy marker (kept)
const PULSE_MS_VAR = '--abs-cursor-pulse-ms';
const DEFAULT_PULSE_MS = 520;
const PULSE_RING_CLASS = 'abs-hover-pulse-ring';

const TARGET_BASE_CLASS = 'abs-hover-target';
const TARGET_INDEX_CLASS = 'abs-hover-target--index';
const TARGET_UI_CLASS = 'abs-hover-target--ui';

const INDEX_BG_VAR = '--abs-hover-index-bg';
const INDEX_FG_VAR = '--abs-hover-index-fg';

function parseNum(value) {
  const n = Number.parseFloat(String(value || '').trim());
  return Number.isFinite(n) ? n : 0;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function parseHexChannel(hex) {
  const n = Number.parseInt(hex, 16);
  return Number.isFinite(n) ? n : 0;
}

function parseCssColorToRgb(color) {
  const s = String(color || '').trim();
  if (!s) return null;

  // #rgb / #rrggbb
  if (s[0] === '#') {
    const h = s.slice(1).trim();
    if (h.length === 3) {
      const r = parseHexChannel(h[0] + h[0]);
      const g = parseHexChannel(h[1] + h[1]);
      const b = parseHexChannel(h[2] + h[2]);
      return { r, g, b };
    }
    if (h.length === 6) {
      const r = parseHexChannel(h.slice(0, 2));
      const g = parseHexChannel(h.slice(2, 4));
      const b = parseHexChannel(h.slice(4, 6));
      return { r, g, b };
    }
    return null;
  }

  // rgb()/rgba()
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(',').map((p) => parseNum(p));
    if (parts.length >= 3) {
      const r = Math.round(parts[0]);
      const g = Math.round(parts[1]);
      const b = Math.round(parts[2]);
      return { r, g, b };
    }
  }

  return null;
}

function srgbToLinear(c255) {
  const c = clamp01(c255 / 255);
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }) {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(a, b) {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

function mixRgb(a, b, t) {
  const tt = clamp01(t);
  return {
    r: Math.round(a.r + (b.r - a.r) * tt),
    g: Math.round(a.g + (b.g - a.g) * tt),
    b: Math.round(a.b + (b.b - a.b) * tt),
  };
}

function rgbToCss({ r, g, b }) {
  return `rgb(${r} ${g} ${b})`;
}

function rgbaToCss({ r, g, b }, a) {
  const aa = clamp01(a);
  return `rgb(${r} ${g} ${b} / ${aa})`;
}

function parseScaleFromTransform(transform) {
  const t = String(transform || '').trim();
  if (!t || t === 'none') return 1;

  // Common path: explicit scale()
  const scaleMatch = t.match(/scale\(([^)]+)\)/);
  if (scaleMatch) {
    const parts = scaleMatch[1].split(',').map((p) => parseNum(p));
    return parts[0] || 1;
  }

  // matrix(a,b,c,d,tx,ty)
  const matrixMatch = t.match(/matrix\(([^)]+)\)/);
  if (matrixMatch) {
    const parts = matrixMatch[1].split(',').map((p) => parseNum(p));
    if (parts.length >= 4) {
      const a = parts[0];
      const b = parts[1];
      const c = parts[2];
      const d = parts[3];
      const scaleX = Math.hypot(a, b) || 1;
      const scaleY = Math.hypot(c, d) || 1;
      return Math.max(scaleX, scaleY);
    }
    return 1;
  }

  // matrix3d(...) (very defensive; we only need uniform-ish scale)
  const matrix3dMatch = t.match(/matrix3d\(([^)]+)\)/);
  if (matrix3dMatch) {
    const parts = matrix3dMatch[1].split(',').map((p) => parseNum(p));
    if (parts.length >= 16) {
      const scaleX = Math.hypot(parts[0], parts[1], parts[2]) || 1;
      const scaleY = Math.hypot(parts[4], parts[5], parts[6]) || 1;
      return Math.max(scaleX, scaleY);
    }
    return 1;
  }

  return 1;
}

function getCursorRenderedSizePx() {
  const cursor = document.getElementById('custom-cursor');
  if (!cursor) return 0;

  // Get the base cursor size (before any transforms)
  const cs = window.getComputedStyle(cursor);
  const base = Math.max(parseNum(cs.width), parseNum(cs.height));
  if (!(base > 0)) return 0;

  // Return the dot size (cursor dot is scaled to 0.25 in simulation mode)
  // This matches the DOT_SCALE factor from cursor.js: 'translate(-50%, -50%) scale(0.25)'
  const DOT_SCALE_FACTOR = 0.25;
  return base * DOT_SCALE_FACTOR;
}

function isEventOnPanelUI(target) {
  if (!target || !target.closest) return false;
  return Boolean(
    target.closest('#panelDock') ||
    target.closest('#masterPanel') ||
    target.closest('#dockToggle') ||
    target.closest('.panel-dock') ||
    target.closest('.panel')
  );
}

function getNearestAction(target) {
  if (!target || !target.closest) return null;
  const el = target.closest('a, button, [role="button"]');
  if (!el) return null;

  // Portfolio carousel cards are `div[role="button"].slide` (drag surface).
  // We intentionally exclude them from cursor-hover so hover doesn’t add noise
  // while the user is browsing/dragging the wheel.
  try {
    if (el.classList?.contains?.('slide')) return null;
    if (el.closest?.('.slide')) return null;
  } catch (e) {}

  return el;
}

function clearLinkVars(link) {
  try {
    link?.style?.removeProperty?.(DOT_SIZE_VAR);
    link?.style?.removeProperty?.(INDEX_BG_VAR);
    link?.style?.removeProperty?.(INDEX_FG_VAR);
  } catch (e) {}
}

function applyLinkVars(link) {
  const sizePx = getCursorRenderedSizePx();
  if (!(sizePx > 0)) {
    clearLinkVars(link);
    return;
  }
  try {
    // Legacy dot variable (previous behavior). We keep it so older CSS doesn't break.
    link.style.setProperty(DOT_SIZE_VAR, `${sizePx}px`);
  } catch (e) {}
}

function isGateOverlayActive() {
  try {
    const overlay = document.getElementById('gate-overlay');
    if (!overlay) return false;
    return overlay.classList.contains('active') || overlay.getAttribute('aria-hidden') === 'false';
  } catch (e) {
    return false;
  }
}

function detectHoverMode(link) {
  try {
    if (document.body.classList.contains('portfolio-page')) return 'ui';
    if (document.body.classList.contains('detail-open')) return 'ui';
  } catch (e) {}

  if (isGateOverlayActive()) return 'ui';

  try {
    if (link?.closest?.('.project-detail')) return 'ui';
    if (link?.closest?.('#gate-overlay')) return 'ui';
    if (link?.closest?.('.gate-modal-host')) return 'ui';
    if (link?.closest?.('#cv-gate') || link?.closest?.('#portfolio-gate') || link?.closest?.('#contact-gate')) return 'ui';
  } catch (e) {}

  return 'index';
}

function getCursorColorRgb() {
  try {
    const cs = getComputedStyle(document.documentElement);
    const raw = cs.getPropertyValue('--cursor-color').trim();
    const parsed = parseCssColorToRgb(raw);
    if (parsed) return parsed;
  } catch (e) {}
  return null;
}

function getBaseBackgroundRgb() {
  // Prefer the actual inner surface element if present.
  const candidates = [
    document.querySelector('.wall-frame'),
    document.getElementById('bravia-balls'),
    document.getElementById('fade-content'),
    document.body,
    document.documentElement,
  ].filter(Boolean);

  for (const el of candidates) {
    try {
      const bg = getComputedStyle(el).backgroundColor;
      const parsed = parseCssColorToRgb(bg);
      if (!parsed) continue;
      // Skip transparent/near-transparent (we don't parse alpha; treat "rgb(...)" as opaque).
      if (parsed.r === 0 && parsed.g === 0 && parsed.b === 0 && bg.includes('rgba') && /,\s*0(\.0+)?\s*\)/.test(bg)) continue;
      return parsed;
    } catch (e) {}
  }

  return { r: 245, g: 245, b: 245 };
}

function pickAccessibleIlluminatedText(cursorRgb, bgEffectiveRgb) {
  // WCAG 2.2 AA target for normal text.
  const target = 4.5;

  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  // Two directions: brighten toward white and deepen toward black.
  const tryDirection = (toward) => {
    let best = null;
    for (let i = 0; i <= 20; i += 1) {
      const t = i / 20;
      const cand = mixRgb(cursorRgb, toward, t);
      const cr = contrastRatio(cand, bgEffectiveRgb);
      if (cr >= target) {
        best = { rgb: cand, t, cr };
        break;
      }
    }
    return best;
  };

  const towardWhite = tryDirection(white);
  const towardBlack = tryDirection(black);

  if (towardWhite && towardBlack) {
    // Prefer smallest adjustment (keeps hue closer to cursor color).
    return towardWhite.t <= towardBlack.t ? towardWhite.rgb : towardBlack.rgb;
  }
  if (towardWhite) return towardWhite.rgb;
  if (towardBlack) return towardBlack.rgb;

  // Fallback: choose higher contrast between raw cursor and white/black.
  const rawCr = contrastRatio(cursorRgb, bgEffectiveRgb);
  const whiteCr = contrastRatio(white, bgEffectiveRgb);
  const blackCr = contrastRatio(black, bgEffectiveRgb);
  if (rawCr >= target) return cursorRgb;
  return whiteCr >= blackCr ? white : black;
}

function setBodyMode(mode) {
  try {
    document.body.classList.toggle(MODE_INDEX_CLASS, mode === 'index');
    document.body.classList.toggle(MODE_UI_CLASS, mode === 'ui');
  } catch (e) {}
}

function activate(link) {
  if (!link) return;

  // When moving between links, remove the variable from the old one.
  if (activeLink && activeLink !== link) clearLinkVars(activeLink);
  activeLink = link;
  const mode = detectHoverMode(activeLink);
  setBodyMode(mode);

  try {
    activeLink.classList.add(TARGET_BASE_CLASS);
    activeLink.classList.toggle(TARGET_INDEX_CLASS, mode === 'index');
    activeLink.classList.toggle(TARGET_UI_CLASS, mode === 'ui');
  } catch (e) {}

  applyLinkVars(activeLink);
  try {
    activeRect = activeLink.getBoundingClientRect?.() || null;
  } catch (e) {
    activeRect = null;
  }

  // Index mode: compute accessible illuminated text + subtle cursor-tint background.
  if (mode === 'index') {
    const cursorRgb = getCursorColorRgb();
    const baseBg = getBaseBackgroundRgb();
    if (cursorRgb) {
      const bgAlpha = 0.12;
      const bgEffective = mixRgb(baseBg, cursorRgb, bgAlpha);
      const fg = pickAccessibleIlluminatedText(cursorRgb, bgEffective);
      try {
        activeLink.style.setProperty(INDEX_BG_VAR, rgbaToCss(cursorRgb, bgAlpha));
        activeLink.style.setProperty(INDEX_FG_VAR, rgbToCss(fg));
      } catch (e) {}
    } else {
      clearLinkVars(activeLink);
    }
  } else {
    // UI mode: background-only; keep label adjustments in CSS (theme-aware).
    try {
      activeLink.style.removeProperty(INDEX_BG_VAR);
      activeLink.style.removeProperty(INDEX_FG_VAR);
    } catch (e) {}
  }

  try {
    document.body.classList.add(HOVER_CLASS);
  } catch (e) {}
}

function deactivate() {
  try {
    document.body.classList.remove(HOVER_CLASS);
  } catch (e) {}
  if (activeLink) {
    try {
      activeLink.classList.remove(TARGET_BASE_CLASS);
      activeLink.classList.remove(TARGET_INDEX_CLASS);
      activeLink.classList.remove(TARGET_UI_CLASS);
      activeLink.classList.remove(PULSE_CLASS);
      activeLink.querySelectorAll?.(`.${PULSE_RING_CLASS}`)?.forEach?.((n) => n.remove());
    } catch (e) {}
    clearLinkVars(activeLink);
  }
  activeLink = null;
  activeRect = null;
  try {
    document.body.classList.remove(MODE_INDEX_CLASS);
    document.body.classList.remove(MODE_UI_CLASS);
  } catch (e) {}
}

function scheduleSync() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    if (!activeLink) return;
    applyLinkVars(activeLink);
  });
}

function onPointerOver(e) {
  const link = getNearestAction(e.target);
  if (!link) return;
  if (isEventOnPanelUI(link)) return;
  pendingClientX = e?.clientX ?? pendingClientX;
  pendingClientY = e?.clientY ?? pendingClientY;
  pendingHasPoint = Number.isFinite(pendingClientX) && Number.isFinite(pendingClientY);
  activate(link);
}

function onPointerOut(e) {
  const link = getNearestAction(e.target);
  if (!link || link !== activeLink) return;

  const to = e.relatedTarget;
  if (to && link.contains(to)) return; // still within the same link subtree

  deactivate();
}

function onPointerMove(e) {
  pendingClientX = e?.clientX ?? pendingClientX;
  pendingClientY = e?.clientY ?? pendingClientY;
  pendingHasPoint = Number.isFinite(pendingClientX) && Number.isFinite(pendingClientY);
  if (!activeLink) return;
  scheduleSync();
}

function emitPulseRing(link, mode) {
  if (!link) return;
  try {
    const ring = document.createElement('span');
    ring.className = PULSE_RING_CLASS;
    ring.setAttribute('aria-hidden', 'true');

    const cursor = getCursorColorRgb();
    const alpha = mode === 'index' ? 0.22 : 0.18;
    const color = cursor ? rgbaToCss(cursor, alpha) : `rgb(var(--abs-rgb-black) / ${alpha})`;

    ring.style.setProperty('--abs-pulse-color', color);
    ring.style.setProperty('--abs-pulse-ms', `${Math.max(0, DEFAULT_PULSE_MS)}ms`);
    ring.style.setProperty('--abs-pulse-size', `var(${DOT_SIZE_VAR}, 24px)`);
    ring.style.setProperty('--abs-pulse-mode', mode);

    link.appendChild(ring);
    const remove = () => {
      try { ring.remove(); } catch (e) {}
    };
    ring.addEventListener('animationend', remove, { once: true });
    window.setTimeout(remove, DEFAULT_PULSE_MS + 120);
  } catch (e) {}
}

function onPointerDown(e) {
  const link = getNearestAction(e.target);
  if (!link) return;
  if (isEventOnPanelUI(link)) return;

  // Only pulse on the currently active target (ensures the pulse originates from the hover state).
  if (activeLink && link !== activeLink) return;
  if (!activeLink) return;

  // Update position immediately so the pulse origin matches the down point.
  pendingClientX = e?.clientX ?? pendingClientX;
  pendingClientY = e?.clientY ?? pendingClientY;
  pendingHasPoint = Number.isFinite(pendingClientX) && Number.isFinite(pendingClientY);
  scheduleSync();

  // Pulse: create a transient ring element (avoids pseudo-element conflicts with dot-under-label).
  const mode = detectHoverMode(activeLink);
  emitPulseRing(activeLink, mode);
}

export function initLinkCursorHop() {
  if (isInitialized) return;
  isInitialized = true;

  // Ensure a clean baseline in case of hot reload.
  deactivate();

  // Pointer events (preferred)
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);
  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerdown', onPointerDown, true);

  // Mouse fallback (older browsers)
  if (!window.PointerEvent) {
    document.addEventListener('mouseover', onPointerOver, true);
    document.addEventListener('mouseout', onPointerOut, true);
    document.addEventListener('mousemove', onPointerMove, { passive: true });
    document.addEventListener('mousedown', onPointerDown, true);
  }

  window.addEventListener('blur', deactivate, { passive: true });
  window.addEventListener(
    'mouseout',
    (event) => {
      if (!event.relatedTarget && !event.toElement) deactivate();
    },
    { passive: true }
  );

  // Keep hover geometry correct if layout shifts while hovering.
  window.addEventListener('resize', () => {
    if (!activeLink) return;
    try {
      activeRect = activeLink.getBoundingClientRect?.() || null;
    } catch (e) {
      activeRect = null;
    }
    scheduleSync();
  }, { passive: true });

  window.addEventListener('scroll', () => {
    if (!activeLink) return;
    try {
      activeRect = activeLink.getBoundingClientRect?.() || null;
    } catch (e) {
      activeRect = null;
    }
    scheduleSync();
  }, { passive: true, capture: true });
}

// Backwards-compat export (kept; no-op)
export function setLinkHoverMode() {}
