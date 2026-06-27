import { getShellConfig, getSimulationWarmupMs } from './site-shell.js';
import { getTransitionPhase, isRouteTransitionPhase } from '../../../lib/transition-phase.js';

const DEFAULT_BOOT_SELECTORS = ['#abs-scene', '#app-frame'];
const BOOT_READY_STATES = new Set(['revealing', 'ready', 'failed']);
const BOOT_OVERLAY_EXIT_FALLBACK_MS = 420;
const DIRECT_BOOT_MIN_VISIBLE_MS = 750;

// ─────────────────────────────────────────────────────────────────────────────
// Boot state helpers
// ─────────────────────────────────────────────────────────────────────────────

function getRootElement() {
  return document.documentElement;
}

function getAppRoot() {
  return document.getElementById('root');
}

function getBootOverlay() {
  return document.getElementById('abs-boot-overlay');
}

function getCurrentBootState() {
  return getRootElement().dataset.absBootState || 'booting';
}

function isDirectBootBlocked() {
  return isRouteTransitionPhase(getTransitionPhase());
}

function isLocalHost() {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function shouldHoldBootOverlay(options = {}) {
  if (options.force) return false;
  if (!isLocalHost()) return false;
  try {
    return new URLSearchParams(window.location.search).get('absBootHold') === '1';
  } catch {
    return false;
  }
}

function getBootClockNow(startedAt) {
  if (startedAt > 100000000000) return Date.now();
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}

function getBootStartedAt() {
  const startedAt = Number(window.__ABS_BOOT_STARTED_AT__);
  if (Number.isFinite(startedAt) && startedAt > 0) return startedAt;
  return getBootClockNow(0);
}

function waitForMinimumBootVisible(options = {}) {
  const minVisibleMs = Math.max(0, Number(options.minimumVisibleMs ?? DIRECT_BOOT_MIN_VISIBLE_MS) || 0);
  if (minVisibleMs <= 0 || !getBootOverlay()) return Promise.resolve();
  const startedAt = getBootStartedAt();
  const elapsed = Math.max(0, getBootClockNow(startedAt) - startedAt);
  const remaining = Math.max(0, minVisibleMs - elapsed);
  if (remaining <= 0) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, remaining));
}

export function setPageBootState(state, detail) {
  try {
    const root = getRootElement();
    root.dataset.absBootState = String(state || 'booting');
    if (detail) {
      root.dataset.absBootDetail = String(detail);
    }
  } catch {
    return;
  }
}

export function setPageBootDetail(detail) {
  try {
    const root = getRootElement();
    if (detail) {
      root.dataset.absBootDetail = String(detail);
    } else {
      delete root.dataset.absBootDetail;
    }
  } catch {
    return;
  }
}

export function clearFadeBlocking() {
  const blocker = document.getElementById('fade-blocking');
  if (blocker) blocker.remove();
}

// ─────────────────────────────────────────────────────────────────────────────
// Visibility release helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeAppRootInteractive() {
  const appRoot = getAppRoot();
  if (!appRoot) return;
  appRoot.removeAttribute('inert');
  appRoot.removeAttribute('aria-hidden');
}

export function revealDirectBootSurface(selectors = DEFAULT_BOOT_SELECTORS) {
  if (isDirectBootBlocked()) {
    return false;
  }

  const root = getRootElement();
  makeAppRootInteractive();
  root.classList.add('abs-direct-boot-ready', 'abs-direct-boot-staging');
  root.classList.remove('entrance-pre-transition', 'entrance-transitioning');
  root.classList.add('entrance-complete', 'ui-entered');

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.style.opacity = '1';
      element.style.visibility = 'visible';
      element.style.transform = 'translateZ(0)';
    });
  });

  clearFadeBlocking();
  return true;
}

function runBootCompletionCallback(callback, detail) {
  if (typeof callback !== 'function') return;
  try {
    callback({ detail });
  } catch (error) {
    console.warn('Direct boot completion callback failed', error);
  }
}

function finishBootOverlay(overlay, detail, options = {}) {
  overlay?.remove();
  getRootElement().classList.remove('abs-direct-boot-staging');
  setPageBootState(options.finalState || 'ready', detail || 'ready');
  runBootCompletionCallback(options.onOverlayHidden, detail || 'ready');
}

export async function completeDirectBoot(options = {}) {
  if (isDirectBootBlocked()) {
    return false;
  }

  const detail = options.detail || 'ready';
  const selectors = options.selectors || DEFAULT_BOOT_SELECTORS;

  if (shouldHoldBootOverlay(options)) {
    window.__ABS_RELEASE_BOOT_OVERLAY__ = () => completeDirectBoot({
      ...options,
      force: true,
      detail: options.releaseDetail || detail,
    });
    setPageBootDetail('held');
    return false;
  }

  await waitForMinimumBootVisible(options);

  if (!revealDirectBootSurface(selectors)) {
    return false;
  }

  const overlay = getBootOverlay();
  if (!overlay) {
    setPageBootState(options.finalState || 'ready', detail);
    getRootElement().classList.remove('abs-direct-boot-staging');
    runBootCompletionCallback(options.onOverlayHidden, detail);
    return true;
  }

  setPageBootState('revealing', detail);
  overlay.setAttribute('aria-hidden', 'true');
  overlay.classList.add('is-exiting');

  return new Promise((resolve) => {
    let finished = false;
    const finalize = () => {
      if (finished) return;
      finished = true;
      overlay.removeEventListener('transitionend', finalize);
      window.clearTimeout(fallbackTimer);
      finishBootOverlay(overlay, detail, options);
      resolve(true);
    };
    const fallbackTimer = window.setTimeout(finalize, BOOT_OVERLAY_EXIT_FALLBACK_MS);
    overlay.addEventListener('transitionend', finalize);
  });
}

export function failDirectBoot(options = {}) {
  if (isDirectBootBlocked()) {
    return Promise.resolve(false);
  }
  setPageBootState('failed', options.detail || 'failed');
  return completeDirectBoot({
    ...options,
    force: true,
    detail: options.detail || 'failed',
    finalState: 'failed',
  });
}

export function forceBootVisible(selectors = DEFAULT_BOOT_SELECTORS) {
  if (isDirectBootBlocked()) {
    return false;
  }

  revealDirectBootSurface(selectors);
  getBootOverlay()?.remove();
  getRootElement().classList.remove('abs-direct-boot-staging');
  setPageBootState('ready', 'force-visible');
  return true;
}

export const forcePageVisible = forceBootVisible;

// ─────────────────────────────────────────────────────────────────────────────
// Readiness helpers
// ─────────────────────────────────────────────────────────────────────────────

export function waitForFrames(count = 2) {
  const frameCount = Math.max(1, Math.round(Number(count) || 1));
  return new Promise((resolve) => {
    let remaining = frameCount;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve(true);
        return;
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

function rectIsUsable(rect) {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function isCanvasBackingStoreReady(canvas) {
  if (!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  if (!rectIsUsable(rect)) return false;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const minWidth = Math.max(1, Math.floor(rect.width * dpr) - 2);
  const minHeight = Math.max(1, Math.floor(rect.height * dpr) - 2);
  return canvas.width >= minWidth && canvas.height >= minHeight;
}

export function waitForCanvasReady(options = {}) {
  const selector = options.selector || '#c';
  const timeoutMs = Math.max(250, Number(options.timeoutMs) || 3000);

  return new Promise((resolve) => {
    const startedAt = performance.now();
    const tick = () => {
      const canvas = document.querySelector(selector);
      if (isCanvasBackingStoreReady(canvas)) {
        resolve(true);
        return;
      }
      if ((performance.now() - startedAt) >= timeoutMs) {
        resolve(false);
        return;
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

export function waitForUsableRects(selectors = [], options = {}) {
  const timeoutMs = Math.max(250, Number(options.timeoutMs) || 2400);
  const required = selectors.filter(Boolean);

  return new Promise((resolve) => {
    const startedAt = performance.now();
    const tick = () => {
      const ready = required.every((selector) => {
        const element = document.querySelector(selector);
        return rectIsUsable(element?.getBoundingClientRect());
      });
      if (ready) {
        resolve(true);
        return;
      }
      if ((performance.now() - startedAt) >= timeoutMs) {
        resolve(false);
        return;
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

export async function waitForPageReadyBarrier(options = {}) {
  const waitForFonts = options.waitForFonts;
  const minimumMs = Math.max(0, Number(options.minimumMs) || 0);
  const extraMs = Math.max(0, Number(options.extraMs) || 0);

  if (!isDirectBootBlocked() && !BOOT_READY_STATES.has(getCurrentBootState())) {
    setPageBootState('booting', 'waiting');
  }

  const tasks = [];
  if (typeof waitForFonts === 'function') {
    tasks.push(
      Promise.resolve()
        .then(() => waitForFonts())
        .catch(() => false)
        .then(() => {
          setPageBootDetail('fonts-ready');
        })
    );
  } else {
    setPageBootDetail('fonts-ready');
  }

  setPageBootDetail('layout-reserved');

  if (minimumMs > 0) {
    tasks.push(new Promise((resolve) => window.setTimeout(resolve, minimumMs)));
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  if (extraMs > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, extraMs));
  }

  setPageBootDetail('content-ready');
}

// ─────────────────────────────────────────────────────────────────────────────
// Failsafe timing helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getPageWarmupMs(options = {}) {
  const config = options.config || getShellConfig();
  return getSimulationWarmupMs(config);
}
