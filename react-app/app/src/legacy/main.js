// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      BOUNCY BALLS – MAIN ENTRY (COMPLETE)                    ║
// ║                       Modular Architecture Bootstrap                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES, NARRATIVE_MODE_SEQUENCE } from './modules/core/constants.js';
import { setCanvas, getGlobals } from './modules/core/state.js';
import { getDailyMode } from './modules/core/daily-scheduler.js';
import { maybeAutoPickCursorColor } from './modules/visual/colors.js';
import {
  setupRenderer,
  getCanvas,
  getContext,
  resize,
  setForceRenderCallback,
  disposeRendererListeners,
} from './modules/rendering/renderer.js';
import { render } from './modules/physics/engine.js';

import { setupKeyboardShortcuts } from './modules/ui/keyboard.js';
import { setupPointer } from './modules/input/pointer.js';
import { setupOverscrollLock } from './modules/input/overscroll-lock.js';
import { setupCustomCursor } from './modules/rendering/cursor.js';
import { setMode, getForceApplicator, getModeCustomStep, initModeSystem, disposeModeSystem } from './modules/modes/mode-controller.js';
import { startMainLoop, stopMainLoop } from './modules/rendering/loop.js';
import { loadSettings } from './modules/utils/storage.js';
import { initSoundEngine, applySoundConfigFromRuntimeConfig } from './modules/audio/sound-engine.js';
import { initQuoteDisplay } from './modules/ui/quote-display.js';
import { initQuotePuck } from './modules/ui/quote-puck.js';
import { applyExpertiseLegendColors } from './modules/ui/legend-colors.js';
// Note: Legend interactivity is now inlined in main.js for reliability
import { initLegendFilterSystem } from './modules/ui/legend-filter.js';
import { initTactileLayer, updateTactileLayer } from './modules/visual/tactile-layer.js';
import { setApplyVisualCSSVars, setUpdateTactileLayer } from './modules/ui/control-registry.js';
import { updateModeButtonsUI } from './modules/ui/controls.js';
// Layout controls now integrated into master panel
import { initSceneImpactReact } from './modules/ui/scene-impact-react.js';
import { initSceneChangeSFX } from './modules/ui/scene-change-sfx.js';
import { loadRuntimeText } from './modules/utils/text-loader.js';
import { applyRuntimeTextToDOM } from './modules/ui/apply-text.js';
import { waitForFonts } from './modules/utils/font-loader.js';
import { getShellConfig } from './modules/visual/site-shell.js';
import {
  completeDirectBoot,
  failDirectBoot,
  forceBootVisible,
  getPageWarmupMs,
  waitForCanvasReady,
  waitForFrames,
  waitForPageReadyBarrier,
} from './modules/visual/page-orchestrator.js';
import { getTransitionPhase, isRouteTransitionPhase } from '../lib/transition-phase.js';
import {
  runSimulationVisualTransition,
  setInitialSimulationVisualScale,
} from '../lib/simulationVisualTransition.js';
import {
  clearHomeEntrancePhase,
  createEntranceSequence,
} from '../lib/motion/entrance-sequence.js';
import {
  initConsolePolicy,
  printConsoleBanner,
  group,
  groupEnd,
  isDev,
  log,
  mark,
  measure,
  table
} from './modules/utils/logger.js';

// Compile-time dev flag (Rollup `replace()` sets __DEV__ in bundled builds).
// Preview/production on localhost must still behave like production, so only the
// compile-time flag enables authoring UI.
const ABS_DEV = import.meta.env.DEV;

function isLocalBuildPanelPreviewEnabled() {
  if (ABS_DEV || typeof window === 'undefined') return false;
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (!isLocalHost) return false;

  const params = new URLSearchParams(window.location.search);
  return params.get('panel') === '1' || params.get('configPanel') === '1';
}

function isHomeRuntimeAuditEnabled() {
  if (ABS_DEV) return true;
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('absAudit') === '1' || params.get('audit') === 'home-runtime';
}

function setBootLifecycleState(state) {
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.absBootState = String(state || '');
    }
  } catch (e) {}
}

function setHomeRouteReadyState(ready) {
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.absHomeRouteReady = ready ? 'true' : 'false';
    }
  } catch (e) {}
}

function setHomeSimulationReadyState(state) {
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.absHomeSimulationReady = String(state || 'false');
    }
  } catch (e) {}
}

function setHomeCanvasTitlePreparedState(ready) {
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.absHomeCanvasTitlePrepared = ready ? 'true' : 'false';
    }
  } catch (e) {}
}

function isCanvasHomeTitlePrepared() {
  const titleState = getGlobals().canvasTitleRenderState || {};
  return (
    titleState.active === true
    && Number(titleState.lineCount) >= 3
    && Number(titleState.firstLineFontSizeCssPx) > 0
    && Number.isFinite(Number(titleState.firstLineX))
    && Number.isFinite(Number(titleState.firstLineY))
  );
}

function isCanvasHomeTitleDrawn() {
  const titleState = getGlobals().canvasTitleRenderState || {};
  return (
    titleState.active === true
    && titleState.visible === true
    && Number(titleState.lineCount) >= 3
  );
}

function getUrlStartupModeOverride() {
  try {
    const params = new URLSearchParams(window.location.search);
    const mode = String(
      params.get('mode')
      || params.get('focus')
      || params.get('simulation')
      || ''
    ).trim();
    if (!mode) return '';
    const auditAllowsMode = globalThis.__ABS_ROUTE_PERF_AUDIT__ === true
      && Object.values(MODES).includes(mode);
    return (NARRATIVE_MODE_SEQUENCE.includes(mode) || auditAllowsMode) ? mode : '';
  } catch (e) {
    return '';
  }
}

/**
 * Apply two-level padding CSS variables from global state to :root
 *
 * Two-level system:
 * 1. --container-border: insets #simulations from viewport (reveals body bg as outer frame)
 * 2. --simulation-padding: deprecated/no-op; simulation corners use --abs-frame-radius
 *
 * The canvas, wall, frame, and physics corner radius all use --abs-frame-radius.
 */
/**
 * Apply visual CSS variables (noise opacity/size, walls) from config to :root
 */
export function applyVisualCSSVars(config) {
  const root = document.documentElement;

  // Layout CSS vars are owned by the shared React shell runtime.

  // Brand logo sizing (shared token; driven by runtime config + dev panel slider).
  if (config.topLogoWidthVw !== undefined) {
    root.style.setProperty('--top-logo-width-vw', String(config.topLogoWidthVw));
  }

  // Container inner shadow removed

  // Noise texture sizing
  if (config.noiseSize !== undefined) {
    root.style.setProperty('--noise-size', `${config.noiseSize}px`);
  }

  // Noise opacity
  if (config.noiseOpacityLight !== undefined) {
    root.style.setProperty('--noise-opacity-light', String(config.noiseOpacityLight));
  }
  if (config.noiseOpacityDark !== undefined) {
    root.style.setProperty('--noise-opacity-dark', String(config.noiseOpacityDark));
  }

  // Noise colors
  if (config.noiseColorLight !== undefined) {
    root.style.setProperty('--noise-color-light', String(config.noiseColorLight));
  }
  if (config.noiseColorDark !== undefined) {
    root.style.setProperty('--noise-color-dark', String(config.noiseColorDark));
  }

}

function applyHomeHeroRuntimeConfig() {
  try {
    const globals = getGlobals();
    const hero = getShellConfig()?.hero || {};
    globals.homeHeroKeepClear = {
      enabled: true,
      centerWidthRatio: Number(hero.centerKeepClearWidthRatio),
      centerHeightRatio: Number(hero.centerKeepClearHeightRatio),
      navWidthRatio: Number(hero.navKeepClearWidthRatio),
      navHeightRatio: Number(hero.navKeepClearHeightRatio),
      navOffsetRatio: Number(hero.navKeepClearOffsetRatio),
      force: Number(hero.centerKeepClearForce),
      spawnBiasX: Number(hero.pitSpawnBiasX),
      spawnBandWidthRatio: Number(hero.pitSpawnBandWidthRatio),
    };
  } catch (e) {}
}

const HOME_CANVAS_READY_TIMEOUT_MS = 3200;
const HOME_TITLE_PREPARE_GRACE_MS = 1200;

function isSimulationFocusTransitionActive() {
  const phase = document.documentElement.dataset.absSimulationFocusTransition
    || window.__ABS_SIMULATION_FOCUS_TRANSITION__?.phase
    || 'idle';
  return phase === 'out' || phase === 'hold' || phase === 'in';
}

// Global error handler for unhandled rejections and errors
window.addEventListener('error', (event) => {
  // Silently ignore fetch errors - they're handled locally
  if (event.message && event.message.includes('Failed to fetch')) {
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Silently ignore fetch errors - they're handled locally
  if (event.reason?.message && event.reason.message.includes('Failed to fetch')) {
    event.preventDefault();
  }
});

export async function bootstrapHomePage(runtimeContext = {}) {
  const {
    signal,
    isCurrent: isRuntimeCurrent,
    registerCleanup,
    markReady,
  } = runtimeContext;
  let disposed = false;
  let rendererOwner = null;
  let directEntrance = null;
  const isCurrent = () => (
    !disposed
    && !signal?.aborted
    && (typeof isRuntimeCurrent !== 'function' || isRuntimeCurrent())
  );
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    directEntrance?.cancel({ clearPhase: true });
    clearHomeEntrancePhase();
    try {
      disposeModeSystem();
    } catch (e) {
      /* ignore */
    }
    if (rendererOwner !== null) {
      try {
        disposeRendererListeners(rendererOwner);
      } catch (e) {
        /* ignore */
      }
    }
  };
  registerCleanup?.(cleanup);

  const shellRouteTransitionActiveAtStart = (
    isRouteTransitionPhase(getTransitionPhase())
    || isSimulationFocusTransitionActive()
  );
  if (shellRouteTransitionActiveAtStart) {
    setBootLifecycleState('ready');
  } else {
    setBootLifecycleState('booting');
  }
  setHomeRouteReadyState(false);
  setHomeSimulationReadyState('false');
  setHomeCanvasTitlePreparedState(false);
  document.documentElement.dataset.absHomeCanvasTitleReady = 'false';

  // Mark JS as enabled (for CSS fallback detection)
  document.documentElement.classList.add('js-enabled');

  // TEXT (SOURCE OF TRUTH):
  // Load and apply all copy BEFORE fade-in so there is no visible “pop-in”.
  let runtimeTextLoaded = false;
  try {
    await loadRuntimeText();
    runtimeTextLoaded = true;
  } catch (e) {}
  if (!isCurrent()) return cleanup;
  if (runtimeTextLoaded) applyRuntimeTextToDOM();

  // Console banner will be printed after colors are initialized (see below)

  // DEV-only: wire control registry to use CSS vars function (avoids circular dependency).
  // In production we ship no config panel, so the registry is not loaded.
  if (ABS_DEV) {
    try {
      setApplyVisualCSSVars?.(applyVisualCSSVars);
      setUpdateTactileLayer?.(updateTactileLayer);
    } catch (e) {}
  }

  try {
    group('BouncyBalls bootstrap');
    mark('bb:start');
    log('🚀 Initializing modular bouncy balls...');

    const config = getGlobals().config || {};
    applyHomeHeroRuntimeConfig();
    mark('bb:config');
    log('✓ Config loaded');

    // Test/debug compatibility: expose key config-derived values on window
    // (Playwright tests assert these exist and match the runtime config)
    try {
      const g = getGlobals();
      if (typeof window !== 'undefined') {
        window.REST = g.REST;
        window.FRICTION = g.FRICTION;
        window.MAX_BALLS = g.maxBalls;
        window.repelRadius = g.repelRadius;
        window.repelPower = g.repelPower;
      }
    } catch (e) {}

    // Apply visual CSS vars (noise, inner shadow) from config
    applyVisualCSSVars(config);
    log('✓ Visual effects configured');

    // Setup canvas (attaches resize listener, but doesn't resize yet)
    rendererOwner = setupRenderer();
    const canvas = getCanvas();
    const ctx = getContext();
    const container = document.getElementById('simulations');

    if (!canvas || !ctx || !container) {
      throw new Error('Missing DOM elements');
    }

    // Accessibility: the canvas is an interactive surface (keyboard + pointer).
    // Ensure we expose it as an application-like region for AT.
    try {
      canvas.setAttribute('role', 'application');
      if (!canvas.getAttribute('aria-label')) {
        canvas.setAttribute('aria-label', 'Interactive bouncy balls physics simulation');
      }
    } catch (e) {}

    // Set canvas reference in state (needed for container-relative sizing)
    setCanvas(canvas, ctx, container);

    // NOW resize - container is available for container-relative sizing
    resize();
    mark('bb:renderer');
    log('✓ Canvas initialized (container-relative sizing)');

    // Canvas logo removed; the DOM title now feeds the canvas title renderer.
    log('✓ Hero title source mounted for canvas rendering');

    // Ensure initial mouseInCanvas state is false for tests
    const globals = getGlobals();
    globals.mouseInCanvas = false;
    if (typeof window !== 'undefined') window.mouseInCanvas = false;

    // Setup pointer tracking BEFORE dark mode (needed for interactions)
    setupPointer();
    log('✓ Pointer tracking configured');

    // iOS Safari: prevent page rubber-banding while still allowing UI internal scrolling.
    setupOverscrollLock();
    log('✓ Overscroll lock configured');

    // Setup custom cursor (circular, matches ball size)
    setupCustomCursor();
    mark('bb:input');
    log('✓ Custom cursor initialized');

    // Initialize Tactile Layer (Unicorn Studio)
    try {
      initTactileLayer(config);
      log('✓ Tactile layer initialized');
    } catch (e) {
      console.warn('Tactile layer init failed:', e);
    }

    // Scene micro-interaction: subtle "clicked-in" response on simulation changes
    initSceneImpactReact();

    // Load any saved settings
    loadSettings();

    // Initialize sound engine once (no AudioContext yet; unlock requires user gesture)
    initSoundEngine();
    // Apply sound settings from runtime config (so panel + exports round-trip).
    try {
      applySoundConfigFromRuntimeConfig(config);
    } catch (e) {}
    log('✓ Sound engine primed (awaiting user unlock)');

    // Scene change SFX (soothing “pebble-like” tick on mode change)
    initSceneChangeSFX();

    // Legend dots: assign discipline colors (palette-driven + story overrides)
    applyExpertiseLegendColors();
    // Interactive legend: hover + click filtering (shared module; must run in prod too)
    initLegendFilterSystem();
    log('✓ Legend filter system configured');

    setupKeyboardShortcuts();
    log('✓ Keyboard shortcuts registered');

    // Layout controls integrated into master panel

    // Initialize starting mode. A non-empty startupMode overrides reload selection
    // until it is cleared again in the authored shell config.
    const urlMode = getUrlStartupModeOverride();
    const configuredHeroMode = String(getShellConfig()?.hero?.startupMode || '').trim();
    const startMode = urlMode || configuredHeroMode || getDailyMode() || MODES.PIT;
    const startupReduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    setInitialSimulationVisualScale(startupReduceMotion ? 1 : 0);

    // Initialize mode runtime (handles eager/lazy mode rollout flags)
    initModeSystem();
    await setMode(startMode);
    if (!isCurrent()) return cleanup;
    if (!shellRouteTransitionActiveAtStart || startupReduceMotion) {
      setInitialSimulationVisualScale(1);
    }

    if (isHomeRuntimeAuditEnabled() && typeof window !== 'undefined') {
      window.__ABS_HOME_AUDIT__ = {
        getGlobals,
        getShellConfig,
        stopMainLoop,
        stepCurrentMode: (dt) => getModeCustomStep()?.(dt),
        getRuntimeSnapshot: () => {
          const globals = getGlobals();
          const balls = Array.isArray(globals.balls) ? globals.balls : [];
          let behindTitleCount = 0;
          let inFrontOfTitleCount = 0;
          for (let i = 0; i < balls.length; i += 1) {
            const z = balls[i]?.z;
            if (!Number.isFinite(z)) continue;
            if (z < 0.5) behindTitleCount += 1;
            else inFrontOfTitleCount += 1;
          }

          const frontCanvas = globals.depthTitleFrontCanvas || document.getElementById('simulation-front-depth-canvas');
          const container = globals.container || document.getElementById('simulations');
          const title = document.getElementById('hero-title');
          const canvasTitleState = globals.canvasTitleRenderState || {};
          return {
            mode: globals.currentMode,
            pointerX: globals.pointerX,
            pointerY: globals.pointerY,
            pointerInCanvas: globals.pointerInCanvas,
            pointerActive: globals.pointerActive,
            pointerType: globals.pointerType,
            pointerSequence: globals.pointerSequence,
            pointerJustEnteredCanvas: globals.pointerJustEnteredCanvas,
            mouseX: globals.mouseX,
            mouseY: globals.mouseY,
            mouseInCanvas: globals.mouseInCanvas,
            depthTitleLayerActive: container?.classList?.contains('simulation-depth-title-layer-active') === true,
            frontDepthCanvasActive: frontCanvas?.dataset?.active === 'true',
            canvasTitleActive: canvasTitleState.active === true,
            canvasTitleVisible: canvasTitleState.visible === true,
            canvasTitleLineCount: Number(canvasTitleState.lineCount) || 0,
            canvasTitleMaxOpacity: Number(canvasTitleState.maxOpacity) || 0,
            canvasTitleFontSizeCssPx: Number(canvasTitleState.firstLineFontSizeCssPx) || 0,
            canvasTitleFirstLineX: Number(canvasTitleState.firstLineX) || 0,
            canvasTitleFirstLineY: Number(canvasTitleState.firstLineY) || 0,
            ballCount: balls.length,
            dpr: Number(globals.DPR) || 1,
            targetFps: Number(globals.currentTargetFps) || 0,
            adaptiveFps: Number(globals.adaptiveAverageFps) || 0,
            throttleLevel: Number(globals.adaptiveThrottleLevel) || 0,
            renderQualityTier: globals.renderQualityTierResolved || null,
            titleLayoutReadCount: Number(globals.titleLayoutReadCount) || 0,
            semanticTitleText: title?.textContent?.replace(/\s+/g, ' ').trim() || '',
            behindTitleCount,
            inFrontOfTitleCount,
            sphereRotationMatrix: globals.sphere3dState?.rotationMatrix ? [...globals.sphere3dState.rotationMatrix] : null,
            sphereCenter: globals.sphere3dState
              ? { x: globals.sphere3dState.cx, y: globals.sphere3dState.cy }
              : null
          };
        }
      };
    }

    const localBuildPanelPreview = isLocalBuildPanelPreviewEnabled();

    // Dev panel after setMode so Simulation HTML includes the active mode's controls.
    // Production builds stay panel-free, except an explicit localhost preview hook for
    // tuning the built bundle without exposing the panel on the live site.
    if (ABS_DEV || localBuildPanelPreview) {
      try {
        if (ABS_DEV) {
          const panelManager = await import('./modules/ui/panel-popup-manager.js');
          if (!isCurrent()) return cleanup;
          panelManager.registerDevPanelRoute?.({
            page: 'home',
            pageLabel: 'Home',
            productLabel: 'Alexander Beck Studio',
          });
        } else {
          const panelDock = await import('./modules/ui/panel-dock.js');
          if (!isCurrent()) return cleanup;
          window.__PANEL_INITIALLY_VISIBLE__ = true;
          panelDock.createPanelDock?.({
            page: 'home',
            pageLabel: 'Home',
            panelTitle: 'Settings',
            modeLabel: 'BUILD MODE',
            skipToggleButton: true,
            footerHint: '<kbd>R</kbd> reset · local build panel',
          });
        }
        const colors = await import('./modules/visual/colors.js');
        if (!isCurrent()) return cleanup;
        colors.populateColorSelect?.();
        updateModeButtonsUI?.(startMode);
      } catch (e) {}
    }
    if (!isCurrent()) return cleanup;
    mark('bb:ui');
    log(ABS_DEV
      ? '✓ Dev panel launcher ready'
      : (localBuildPanelPreview ? '✓ Local build panel ready' : '✓ UI initialized (panel disabled in production)'));

    // Theme is initialized by the shared React shell before this runtime starts.
    mark('bb:theme');

    // Cursor color: auto-pick after the shared theme has been applied.
    maybeAutoPickCursorColor?.('startup');

    mark('bb:mode');
    log('✓ Mode initialized');

    // Initialize quote display (shows curated quotes based on current mode)
    initQuoteDisplay();
    initQuotePuck();
    log('✓ Quote display initialized');

    // Register force render callback for resize (prevents blank frames during drag-resize)
    setForceRenderCallback(render);

    // NOTE: Scroll FX is portfolio-only (see `source/modules/portfolio/`).

    // Start main render loop
    // PERF: getForcesFn is resolved once per frame in the loop, not per particle
    startMainLoop(null, { getForcesFn: getForceApplicator });
    if (shellRouteTransitionActiveAtStart) {
      setHomeRouteReadyState(true);
      markReady?.();
    }
    const confirmCanvasTitleDraw = () => {
      if (!isCurrent()) return;
      if (isCanvasHomeTitleDrawn()) {
        document.documentElement.dataset.absHomeCanvasTitleReady = 'true';
        return;
      }
      requestAnimationFrame(confirmCanvasTitleDraw);
    };
    requestAnimationFrame(confirmCanvasTitleDraw);

    mark('bb:end');
    log('✅ Bouncy Balls running (modular)');

    // DEV-only: summarize init timings in a compact table.
    const rows = [
      { phase: 'config', ms: measure('bb:m:config', 'bb:start', 'bb:config') },
      { phase: 'renderer', ms: measure('bb:m:renderer', 'bb:config', 'bb:renderer') },
      { phase: 'input', ms: measure('bb:m:input', 'bb:renderer', 'bb:input') },
      { phase: 'ui', ms: measure('bb:m:ui', 'bb:input', 'bb:ui') },
      { phase: 'theme', ms: measure('bb:m:theme', 'bb:ui', 'bb:theme') },
      { phase: 'mode+loop', ms: measure('bb:m:mode', 'bb:theme', 'bb:mode') },
      { phase: 'total', ms: measure('bb:m:total', 'bb:start', 'bb:end') },
    ].filter((r) => typeof r.ms === 'number');
    if (rows.length) table(rows.map((r) => ({ ...r, ms: Number(r.ms.toFixed(2)) })));
    groupEnd();

    // Console banner: print AFTER colors are initialized and group is closed so it's always visible
    // - DEV: show the same colored banner (but keep logs)
    // - PROD: show banner and silence non-error console output
    try {
      if (isDev()) {
        printConsoleBanner();
      } else {
        initConsolePolicy();
      }
    } catch (bannerError) {
      // Ensure banner always prints even if there's an error
      try {
        console.error('Banner print error:', bannerError);
        // Fallback: print simple banner
        console.log('%cCurious mind detected. Design meets engineering at 60fps.', 'color: var(--color-detected-888); font-style: italic;');
      } catch (e) {
        // Console completely unavailable
      }
    }

    // ╔══════════════════════════════════════════════════════════════════════════════╗
    // ║                         DIRECT BOOT REVEAL                                  ║
    // ║  The page is composed behind the first-paint overlay, then revealed once     ║
    // ║  fonts, layout, canvas sizing, and the first simulation frame are stable.    ║
    // ╚══════════════════════════════════════════════════════════════════════════════╝

    try {
      const {
        shouldSkipWallAnimation,
        resetTransitionState,
        setupPrefetchOnHover,
        initSpeculativePrefetch,
        didViewTransitionRun
      } = await import('./modules/utils/page-nav.js');
      if (!isCurrent()) return cleanup;

      const shellConfig = getShellConfig();
      const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      // Check if we should skip wall animation (internal nav or browser back/forward)
      // Note: shouldSkipWallAnimation() consumes the navigation state
      const skipWall = shouldSkipWallAnimation();

      // Check if View Transition just ran (Chrome) - skip entrance animation entirely
      const skipEntrance = didViewTransitionRun();
      const warmupMs = (skipWall || skipEntrance) ? 0 : getPageWarmupMs({ config: shellConfig });
      const waitForVisualReady = async () => {
        let fontsReady = false;
        await waitForPageReadyBarrier({
          waitForFonts: async () => {
            try {
              fontsReady = await waitForFonts();
            } catch {
              return false;
            }
            return fontsReady;
          },
          minimumMs: warmupMs
        });
        if (!isCurrent()) return;
        if (!fontsReady) {
          throw new Error('Home fonts did not become ready');
        }

        try {
          resize();
          render();
        } catch (error) {
          void error;
        }

        const canvasReady = await waitForCanvasReady({
          selector: '#c',
          timeoutMs: HOME_CANVAS_READY_TIMEOUT_MS,
        });
        if (!canvasReady) {
          throw new Error('Home canvas backing store did not become ready');
        }
        if (!isCurrent()) return;

        await waitForFrames(2);
        if (!isCurrent()) return;
        setHomeSimulationReadyState('true');

        const titlePrepareDeadline = performance.now() + HOME_TITLE_PREPARE_GRACE_MS;

        while (isCurrent() && performance.now() < titlePrepareDeadline) {
          if (isCanvasHomeTitlePrepared()) {
            setHomeCanvasTitlePreparedState(true);
            return;
          }
          await waitForFrames(1);
        }

        setHomeCanvasTitlePreparedState(false);
      };

      // Handle bfcache restore (browser back/forward with cached page)
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          resetTransitionState();
          directEntrance?.cancel({ clearPhase: true });
          clearHomeEntrancePhase();
          forceBootVisible(['#abs-scene', '#app-frame']);
        }
      });

      // Setup prefetch on hover for gate triggers
      document.querySelectorAll('[data-route-tab]').forEach((tab) => {
        const href = tab.getAttribute('href');
        if (href) setupPrefetchOnHover(tab, href);
      });

      // Run the home UI entrance for every direct landing/reload. Shell route
      // transitions restore stable UI without replaying choreography.
      const shellRouteTransitionActive = (
        isRouteTransitionPhase(getTransitionPhase())
        || isSimulationFocusTransitionActive()
      );
      const shouldRunHomePostBootEntrance = !shellRouteTransitionActive;
      const runHomeBootSimulationEnter = () => {
        if (reduceMotion || shellRouteTransitionActive) {
          setInitialSimulationVisualScale(1);
          return;
        }
        setInitialSimulationVisualScale(0);
        void runSimulationVisualTransition('in', {
          durationMs: 760,
          localDurationMs: 420,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          reason: 'home-direct-boot',
        });
      };
      const onHomeOverlayHidden = () => {
        if (!isCurrent()) return;
        if (shouldRunHomePostBootEntrance) {
          return directEntrance?.play();
        } else {
          clearHomeEntrancePhase();
        }
        return undefined;
      };

      if (shellRouteTransitionActive) {
        directEntrance?.cancel({ clearPhase: true });
        clearHomeEntrancePhase();
        await waitForVisualReady();
        if (!isCurrent()) return cleanup;
        setBootLifecycleState('ready');
        setHomeRouteReadyState(true);
        markReady?.();
        if (reduceMotion) {
          setInitialSimulationVisualScale(1);
        } else {
          await runSimulationVisualTransition('in', {
            durationMs: 520,
            localDurationMs: 320,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            reason: 'home-route-return',
          });
          if (!isCurrent()) return cleanup;
        }
        console.log('✓ Home simulation route-return entrance completed');
      } else {
        if (shouldRunHomePostBootEntrance) {
          directEntrance?.cancel({ clearPhase: true });
          directEntrance = createEntranceSequence({
            scopes: document,
            profile: 'direct',
            diagnosticRoot: document.documentElement,
            reducedMotion: reduceMotion,
          });
          directEntrance.stage();
        } else {
          clearHomeEntrancePhase();
        }
        await waitForVisualReady();
        if (!isCurrent()) return cleanup;
        await completeDirectBoot({
          selectors: ['#abs-scene', '#app-frame'],
          detail: reduceMotion
            ? 'home-ready-reduced-motion'
            : skipEntrance
              ? 'home-ready-view-transition'
              : skipWall
                ? 'home-ready-return'
                : 'home-ready',
          onOverlayHidden: onHomeOverlayHidden,
          onRevealStart: runHomeBootSimulationEnter,
        });
        if (!isCurrent()) return cleanup;
        setHomeRouteReadyState(true);
        console.log('✓ Home direct boot revealed from settled first frame');
      }

      // Initialize speculative prefetch system for faster page transitions
      initSpeculativePrefetch();

    } catch (e) {
      if (!isCurrent()) return cleanup;
      console.warn('⚠️ Direct boot reveal failed, forcing settled content visible:', e);
      setHomeSimulationReadyState('failed');
      setInitialSimulationVisualScale(1);
      await failDirectBoot({
        selectors: ['#abs-scene', '#app-frame'],
        detail: 'home-reveal-failed',
        onOverlayHidden: () => {
          if (!isCurrent()) return undefined;
          return directEntrance?.play();
        },
      });
      if (!isCurrent()) return cleanup;
      setHomeRouteReadyState(true);
    }

    if (document.documentElement.dataset.absBootDetail !== 'held') {
      setBootLifecycleState('ready');
    }

    return cleanup;
  } catch (error) {
    if (!isCurrent()) return cleanup;
    setBootLifecycleState('failed');
    console.error('❌ Initialization failed:', error);
    document.body.innerHTML = `<div style="padding: var(--radius-lg); color: red; background: white;">
      <h2>Initialization Error</h2>
      <pre>${error.message}\n${error.stack}</pre>
    </div>`;
    throw error;
  }
}
