// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           PERFORMANCE / FPS                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

const HUD_ID = 'dev-perf-hud';
const HUD_UPDATE_INTERVAL_MS = 250;
const FPS_INTERVAL_MS = 1000;
const LONG_FRAME_60_FPS_MS = 16.67;
const LONG_FRAME_120_FPS_MS = 8.33;

let lastFpsUpdate = 0;
let lastHudUpdate = 0;
let lastFrameNow = 0;
let frames = 0;
let currentFPS = 0;
let frameTimeMs = 0;
let longFramesOver16 = 0;
let longFramesOver8 = 0;
let totalFrames = 0;
let throttledFramesWindow = 0;
let throttleShare = 0;
let hudEl = null;
let hudEnabled = true;
let lastSnapshot = {
  targetFPS: 60,
  throttleLevel: 0,
  throttled: false,
  rendered: true
};

function isDevBuild() {
  try {
    if (typeof __DEV__ === 'boolean') return __DEV__;
  } catch (e) {}

  try {
    const port = String(globalThis?.location?.port ?? '');
    if (port === '8001' || port === '8012' || port === '8013') return true;
    const host = String(globalThis?.location?.hostname ?? '');
    if ((host === 'localhost' || host === '127.0.0.1') && port !== '') return true;
  } catch (e) {}

  try {
    const scripts = Array.from(document?.scripts || []);
    return scripts.some((script) => {
      const type = (script.getAttribute('type') || '').toLowerCase();
      if (type !== 'module') return false;
      const src = script.getAttribute('src') || '';
      return /(^|\/)main\.js(\?|#|$)/.test(src);
    });
  } catch (e) {
    return false;
  }
}

function shouldShowHud() {
  if (!hudEnabled || !isDevBuild()) return false;
  try {
    const g = getGlobals();
    return g?.performanceHudEnabled !== false;
  } catch (e) {
    return true;
  }
}

function ensureHud() {
  if (hudEl || typeof document === 'undefined') return hudEl;
  const el = document.createElement('div');
  el.id = HUD_ID;
  el.className = 'dev-perf-hud';
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('role', 'presentation');
  el.style.pointerEvents = 'none';
  el.style.userSelect = 'none';
  el.style.zIndex = '9999';
  document.body?.appendChild(el);
  hudEl = el;
  return hudEl;
}

function removeHud() {
  if (!hudEl) return;
  try {
    hudEl.remove();
  } catch (e) {}
  hudEl = null;
}

function formatHudLine(snapshot) {
  const g = getGlobals();
  const fps = Number.isFinite(currentFPS) ? currentFPS : 0;
  const target = Number.isFinite(snapshot.targetFPS) ? Math.round(snapshot.targetFPS) : 60;
  const ms = Number.isFinite(frameTimeMs) ? frameTimeMs.toFixed(2) : '0.00';
  const throttleLevel = Number.isFinite(snapshot.throttleLevel) ? snapshot.throttleLevel : 0;
  const throttled = snapshot.throttled ? 'yes' : 'no';
  const throttlePct = `${Math.round(throttleShare * 100)}%`;
  const base = `FPS ${fps} / ${target} | ${ms}ms | throttle L${throttleLevel} (${throttled}, ${throttlePct}) | >16.67ms ${longFramesOver16} | >8.33ms ${longFramesOver8}`;
  const pitSummary = g?.pitPerfSummary;
  if (!pitSummary || g?.currentMode !== 'pit') return base;
  const frameP95 = Number(pitSummary.frameP95Ms || 0).toFixed(1);
  const physicsP95 = Number(pitSummary.physicsP95Ms || 0).toFixed(1);
  const collisionP95 = Number(pitSummary.collisionP95Ms || 0).toFixed(1);
  const renderP95 = Number(pitSummary.renderP95Ms || 0).toFixed(1);
  return `${base} | PIT p95 frame ${frameP95}ms (phy ${physicsP95} col ${collisionP95} rnd ${renderP95})`;
}

function updateHud(now, snapshot) {
  if (now - lastHudUpdate < HUD_UPDATE_INTERVAL_MS) return;
  lastHudUpdate = now;

  if (!shouldShowHud()) {
    removeHud();
    return;
  }

  const el = ensureHud();
  if (!el) return;
  el.textContent = formatHudLine(snapshot);
}

export function trackFrame(now, snapshot = {}) {
  const safeNow = Number(now) || performance.now();
  if (lastFpsUpdate === 0) lastFpsUpdate = safeNow;

  if (lastFrameNow > 0) {
    frameTimeMs = safeNow - lastFrameNow;
    if (frameTimeMs > LONG_FRAME_60_FPS_MS) longFramesOver16++;
    if (frameTimeMs > LONG_FRAME_120_FPS_MS) longFramesOver8++;
  }
  lastFrameNow = safeNow;

  totalFrames++;
  frames++;
  if (snapshot.throttled) throttledFramesWindow++;
  lastSnapshot = {
    targetFPS: Number(snapshot.targetFPS) || lastSnapshot.targetFPS,
    throttleLevel: Number(snapshot.throttleLevel) || 0,
    throttled: Boolean(snapshot.throttled),
    rendered: snapshot.rendered !== false
  };

  if (safeNow - lastFpsUpdate >= FPS_INTERVAL_MS) {
    const interval = Math.max(1, safeNow - lastFpsUpdate);
    currentFPS = Math.round((frames * 1000) / interval);
    throttleShare = frames > 0 ? (throttledFramesWindow / frames) : 0;
    frames = 0;
    throttledFramesWindow = 0;
    lastFpsUpdate = safeNow;

    // Back-compat hook used by older debugging markup.
    const legacyFpsEl = document.getElementById('render-fps');
    if (legacyFpsEl) legacyFpsEl.textContent = String(currentFPS);
  }

  updateHud(safeNow, lastSnapshot);
}

export function getPerformanceMetrics() {
  return {
    currentFPS,
    targetFPS: lastSnapshot.targetFPS,
    frameTimeMs,
    throttleLevel: lastSnapshot.throttleLevel,
    throttled: lastSnapshot.throttled,
    throttleShare,
    longFramesOver16,
    longFramesOver8,
    totalFrames
  };
}

export function resetPerformanceMetrics() {
  lastFpsUpdate = 0;
  lastHudUpdate = 0;
  lastFrameNow = 0;
  frames = 0;
  currentFPS = 0;
  frameTimeMs = 0;
  longFramesOver16 = 0;
  longFramesOver8 = 0;
  totalFrames = 0;
  throttledFramesWindow = 0;
  throttleShare = 0;
  lastSnapshot = {
    targetFPS: 60,
    throttleLevel: 0,
    throttled: false,
    rendered: true
  };
  removeHud();
}

export function setPerformanceHudEnabled(enabled) {
  hudEnabled = !!enabled;
  if (!hudEnabled) removeHud();
}
