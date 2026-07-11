import { useLayoutEffect } from 'react';
import { applyRuntimeTextToDOM } from '../../legacy/modules/ui/apply-text.js';
import { loadRuntimeConfig } from '../../legacy/modules/utils/runtime-config.js';
import { loadRuntimeText } from '../../legacy/modules/utils/text-loader.js';
import {
  completeDirectBoot,
  waitForFrames,
  waitForPageReadyBarrier,
  waitForUsableRects,
} from '../../legacy/modules/visual/page-orchestrator.js';
import { applyExpertiseLegendColors } from '../../legacy/modules/ui/legend-colors.js';
import { initLegendFilterSystem } from '../../legacy/modules/ui/legend-filter.js';
import { initModalOverlay } from '../../legacy/modules/ui/modal-overlay.js';
import { isSimulationVisualTransitionSourceActive } from '../../lib/simulationVisualTransition.js';

let runtimeConfigPromise = null;
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

function loadDailyFocusRuntimeText() {
  if (!runtimeTextPromise) {
    runtimeTextPromise = loadRuntimeText();
  }
  return runtimeTextPromise;
}

function initializeSharedHomeChrome() {
  applyExpertiseLegendColors();

  const legendAlreadyInteractive = !!document.querySelector('#expertise-legend .legend__item--interactive');
  if (!legendAlreadyInteractive) {
    initLegendFilterSystem();
  }

}

function initializeSharedHomeModals(config) {
  try {
    initModalOverlay(config);
  } catch {
    /* Daily focus should still reveal if a modal helper fails. */
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
    case 'repel-room':
      return isCanvasSurfaceReady('#repel-room-canvas')
        && isSimulationVisualTransitionSourceActive(id);
    case 'flock-of-birds':
      return isCanvasSurfaceReady('#flock-of-birds-canvas')
        && isSimulationVisualTransitionSourceActive(id);
    case 'mineral-growth':
      return isCanvasSurfaceReady('#mineral-growth-canvas')
        && isSimulationVisualTransitionSourceActive(id);
    case 'rift-rings':
      return isCanvasSurfaceReady('#rift-rings-canvas')
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

async function registerDailyFocusDevPanelRoute() {
  if (!import.meta.env.DEV) return;

  try {
    const { registerDevPanelRoute } = await import('../../legacy/modules/ui/panel-popup-manager.js');
    registerDevPanelRoute({
      page: 'home',
      pageLabel: 'Home',
      productLabel: 'Alexander Beck Studio',
      pageSectionTitle: 'Home',
      syncInitialControlSideEffects: false,
    });
  } catch (error) {
    console.warn('Daily focus panel init failed', error);
  }
}

export function DailyFocusShellBridge({ simulationId = '' }) {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let cancelled = false;
    let runtimeConfig = null;
    let modalSystemsInitialized = false;

    const initializeRouteChrome = () => {
      if (cancelled || !runtimeConfig) return;
      initializeSharedHomeChrome();
      document.documentElement.classList.add('js-enabled');
    };

    async function revealDailyFocusRoute() {
      const config = await loadDailyFocusRuntimeConfig();
      if (cancelled) return;
      runtimeConfig = config;
      try {
        await loadDailyFocusRuntimeText();
        applyRuntimeTextToDOM();
      } catch {
        /* Text fallbacks are handled by the modal modules. */
      }
      initializeRouteChrome();
      // Daily focus bypasses the legacy home bootstrap, so register the dev panel
      // after the shared config has initialized the legacy globals.
      registerDailyFocusDevPanelRoute();
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

    return () => {
      cancelled = true;
    };
  }, [simulationId]);

  return null;
}
