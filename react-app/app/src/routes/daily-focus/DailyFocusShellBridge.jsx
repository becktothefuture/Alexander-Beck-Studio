import { useLayoutEffect } from 'react';
import { initState, applyLayoutCSSVars, getGlobals } from '../../legacy/modules/core/state.js';
import { applyRuntimeTextToDOM } from '../../legacy/modules/ui/apply-text.js';
import { initContactModal } from '../../legacy/modules/ui/contact-modal.js';
import { initCVModal } from '../../legacy/modules/ui/cv-modal.js';
import { loadRuntimeConfig } from '../../legacy/modules/utils/runtime-config.js';
import { loadRuntimeText } from '../../legacy/modules/utils/text-loader.js';
import {
  completeDirectBoot,
  waitForFrames,
  waitForPageReadyBarrier,
  waitForUsableRects,
} from '../../legacy/modules/visual/page-orchestrator.js';
import { initializeDarkMode } from '../../legacy/modules/visual/dark-mode-v2.js';
import { loadShellConfig, syncShellToDocument } from '../../legacy/modules/visual/site-shell.js';
import { applyExpertiseLegendColors } from '../../legacy/modules/ui/legend-colors.js';
import { initLegendFilterSystem } from '../../legacy/modules/ui/legend-filter.js';
import { initModalOverlay } from '../../legacy/modules/ui/modal-overlay.js';
import { initPortfolioModal } from '../../legacy/modules/ui/portfolio-modal.js';
import { createSoundToggle } from '../../legacy/modules/ui/sound-toggle.js';
import { initTimeDisplay } from '../../legacy/modules/ui/time-display.js';
import { isSimulationVisualTransitionSourceActive } from '../../lib/simulationVisualTransition.js';

let runtimeConfigPromise = null;
let shellConfigPromise = null;
let runtimeTextPromise = null;
const DAILY_FOCUS_READY_TIMEOUT_MS = 3600;
const DAILY_FOCUS_READY_POLL_MS = 50;
const DAILY_FOCUS_BOOT_SELECTORS = ['#abs-scene', '#app-frame', '#simulation-stage'];

function loadDailyFocusRuntimeConfig() {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = loadRuntimeConfig();
  }
  return runtimeConfigPromise;
}

function loadDailyFocusShellConfig() {
  if (!shellConfigPromise) {
    shellConfigPromise = loadShellConfig();
  }
  return shellConfigPromise;
}

function loadDailyFocusRuntimeText() {
  if (!runtimeTextPromise) {
    runtimeTextPromise = loadRuntimeText();
  }
  return runtimeTextPromise;
}

function applyHomeUiConfigVars() {
  const globals = getGlobals();
  const root = document.documentElement;

  if (Number.isFinite(globals?.topLogoWidthVw)) {
    root.style.setProperty('--top-logo-width-vw', String(globals.topLogoWidthVw));
  }
  if (Number.isFinite(globals?.homeMainLinksBelowLogoPx)) {
    root.style.setProperty('--home-main-links-below-logo-px', `${Math.round(globals.homeMainLinksBelowLogoPx)}px`);
  }
  if (Number.isFinite(globals?.footerNavBarTopVh)) {
    root.style.setProperty('--footer-nav-bar-top', `${globals.footerNavBarTopVh}vh`);
    root.style.setProperty('--footer-nav-bar-top-svh', `${globals.footerNavBarTopVh}svh`);
    root.style.setProperty('--footer-nav-bar-top-dvh', `${globals.footerNavBarTopVh}dvh`);
  }
  if (Number.isFinite(globals?.footerNavBarGapVw)) {
    const minPx = Math.round(globals.footerNavBarGapVw * 9.6);
    const maxPx = Math.round(minPx * 1.67);
    root.style.setProperty('--footer-nav-bar-gap', `clamp(${minPx}px, ${globals.footerNavBarGapVw}vw, ${maxPx}px)`);
  }
  if (Number.isFinite(globals?.uiHitAreaMul)) {
    root.style.setProperty('--ui-hit-area-mul', String(globals.uiHitAreaMul));
  }
  if (Number.isFinite(globals?.uiIconCornerRadiusMul)) {
    root.style.setProperty('--ui-icon-corner-radius-mul', String(globals.uiIconCornerRadiusMul));
  }
  if (Number.isFinite(globals?.uiIconFramePx) && Math.round(globals.uiIconFramePx) > 0) {
    root.style.setProperty('--ui-icon-frame-size', `${Math.round(globals.uiIconFramePx)}px`);
  }
  if (Number.isFinite(globals?.uiIconGlyphPx) && Math.round(globals.uiIconGlyphPx) > 0) {
    root.style.setProperty('--ui-icon-glyph-size', `${Math.round(globals.uiIconGlyphPx)}px`);
  }
  if (Number.isFinite(globals?.linkTextPadding)) {
    const padding = Math.round(globals.linkTextPadding);
    root.style.setProperty('--link-text-padding', `${padding}px`);
    root.style.setProperty('--link-text-margin', `${-padding}px`);
  }
  if (Number.isFinite(globals?.linkIconPadding)) {
    const padding = Math.round(globals.linkIconPadding);
    root.style.setProperty('--link-icon-padding', `${padding}px`);
    root.style.setProperty('--link-icon-margin', `${-padding}px`);
  }
  if (Number.isFinite(globals?.linkColorInfluence)) {
    root.style.setProperty('--link-color-influence', String(globals.linkColorInfluence));
  }
  if (Number.isFinite(globals?.linkImpactScale)) {
    root.style.setProperty('--link-impact-scale', String(globals.linkImpactScale));
  }
  if (Number.isFinite(globals?.linkImpactBlur)) {
    root.style.setProperty('--link-impact-blur', `${globals.linkImpactBlur}px`);
  }
  if (Number.isFinite(globals?.linkImpactDuration)) {
    root.style.setProperty('--link-impact-duration', `${Math.round(globals.linkImpactDuration)}ms`);
  }
  if (Number.isFinite(globals?.linkHoverNudge)) {
    root.style.setProperty('--link-nudge', `${globals.linkHoverNudge}px`);
  }
}

function initializeSharedHomeChrome() {
  initTimeDisplay();
  applyExpertiseLegendColors();

  const legendAlreadyInteractive = !!document.querySelector('#expertise-legend .legend__item--interactive');
  if (!legendAlreadyInteractive) {
    initLegendFilterSystem();
  }

  createSoundToggle();
}

function initializeSharedHomeModals(config) {
  try {
    initModalOverlay(config);
  } catch {
    /* Daily focus should still reveal if a modal helper fails. */
  }

  try {
    initCVModal();
  } catch {
    /* no-op */
  }

  try {
    initPortfolioModal();
  } catch {
    /* no-op */
  }

  try {
    initContactModal();
  } catch {
    /* no-op */
  }
}

function isRectUsable(rect) {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function isElementSurfaceReady(element) {
  return Boolean(element && isRectUsable(element.getBoundingClientRect()));
}

function isCanvasSurfaceReady(selector) {
  const canvas = document.querySelector(selector);
  return Boolean(
    isElementSurfaceReady(canvas)
    && Number(canvas.width) >= 64
    && Number(canvas.height) >= 64
  );
}

function getDailyFocusRuntimeElement(simulationId) {
  const id = String(simulationId || '');
  return Array.from(document.querySelectorAll('.daily-focus-runtime'))
    .find((element) => element?.dataset?.simulationId === id) || null;
}

function isDailyFocusRuntimeReady(simulationId) {
  const id = String(simulationId || '');
  const stage = document.getElementById('simulation-stage');
  if (!id || stage?.dataset?.simulationId !== id || !isElementSurfaceReady(stage)) return false;

  const runtime = getDailyFocusRuntimeElement(id);
  if (!isElementSurfaceReady(runtime)) return false;

  switch (id) {
    case 'wall-repel':
      return isCanvasSurfaceReady('#wall-repel-canvas')
        && isSimulationVisualTransitionSourceActive(id);
    case 'flock-of-birds':
      return isCanvasSurfaceReady('#flock-of-birds-canvas')
        && isSimulationVisualTransitionSourceActive(id);
    case 'mineral-growth':
      return isCanvasSurfaceReady('#mineral-growth-canvas')
        && isSimulationVisualTransitionSourceActive(id);
    case 'napoleon-point-cloud': {
      const figure = runtime.querySelector('.napoleon-point-cloud');
      const loadState = figure?.dataset?.pointCloudLoadState;
      return Boolean(
        loadState === 'error'
        || (
          loadState === 'ready'
          && isCanvasSurfaceReady('.napoleon-point-cloud__canvas--front')
          && isSimulationVisualTransitionSourceActive(id)
        )
      );
    }
    case 'beach-ball-room': {
      const loadState = runtime.dataset?.beachBallRoomLoadState;
      return Boolean(
        loadState === 'error'
        || (
          loadState === 'ready'
          && isCanvasSurfaceReady('.beach-ball-room-canvas')
          && isSimulationVisualTransitionSourceActive(id)
        )
      );
    }
    default:
      return true;
  }
}

function waitForDailyFocusRuntimeReady(simulationId, options = {}) {
  const timeoutMs = Math.max(250, Number(options.timeoutMs) || DAILY_FOCUS_READY_TIMEOUT_MS);

  return new Promise((resolve) => {
    const startedAt = performance.now();
    const tick = () => {
      if (isDailyFocusRuntimeReady(simulationId)) {
        resolve(true);
        return;
      }
      if ((performance.now() - startedAt) >= timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, DAILY_FOCUS_READY_POLL_MS);
    };
    window.requestAnimationFrame(tick);
  });
}

function waitForFonts() {
  try {
    return document.fonts?.ready || Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

function signalDailyFocusRouteReady(simulationId) {
  if (!simulationId) return;
  window.requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('abs:route-ready', {
      detail: { routeId: simulationId },
    }));
  });
}

export function DailyFocusShellBridge({ simulationId = '' }) {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let cancelled = false;
    let runtimeConfig = null;
    let shellConfig = null;
    let modalSystemsInitialized = false;

    const applyShellVars = () => {
      if (cancelled || !runtimeConfig || !shellConfig) return;
      initState(runtimeConfig);
      syncShellToDocument({
        config: shellConfig,
        isDark: document.documentElement.classList.contains('dark-mode'),
      });
      applyLayoutCSSVars();
      applyHomeUiConfigVars();
      initializeDarkMode();
      applyHomeUiConfigVars();
      initializeSharedHomeChrome();
      document.documentElement.classList.add('js-enabled');
    };

    async function revealDailyFocusRoute() {
      const [config, loadedShellConfig] = await Promise.all([
        loadDailyFocusRuntimeConfig(),
        loadDailyFocusShellConfig(),
      ]);
      if (cancelled) return;
      runtimeConfig = config;
      shellConfig = loadedShellConfig;
      try {
        await loadDailyFocusRuntimeText();
        applyRuntimeTextToDOM();
      } catch {
        /* Text fallbacks are handled by the modal modules. */
      }
      applyShellVars();
      if (!modalSystemsInitialized) {
        modalSystemsInitialized = true;
        initializeSharedHomeModals(config);
      }

      await waitForPageReadyBarrier({
        waitForFonts,
        minimumMs: 80,
      });
      if (cancelled) return;

      await waitForUsableRects(DAILY_FOCUS_BOOT_SELECTORS, {
        timeoutMs: 2600,
      });
      const runtimeReady = await waitForDailyFocusRuntimeReady(simulationId, {
        timeoutMs: DAILY_FOCUS_READY_TIMEOUT_MS,
      });
      await waitForFrames(2);
      if (cancelled) return;

      const bootState = document.documentElement.dataset.absBootState || '';
      if (document.getElementById('abs-boot-overlay') || bootState === 'booting') {
        await completeDirectBoot({
          selectors: DAILY_FOCUS_BOOT_SELECTORS,
          detail: runtimeReady
            ? `daily-focus-${simulationId}-ready`
            : `daily-focus-${simulationId}-fallback`,
        });
      }
      signalDailyFocusRouteReady(simulationId);
    }

    revealDailyFocusRoute().catch(() => undefined);

    window.addEventListener('resize', applyShellVars);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', applyShellVars);
    };
  }, [simulationId]);

  return null;
}
