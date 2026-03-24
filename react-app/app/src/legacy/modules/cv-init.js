// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               CV PAGE BOOTSTRAP                               ║
// ║     Loads runtime text + shared chrome (dark mode, time, socials, sound)      ║
// ║                     PORTFOLIO PARITY: Matching bootstrap sequence             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from './core/state.js';
import { disposeRendererListeners } from './rendering/renderer.js';
import { loadRuntimeConfig } from './utils/runtime-config.js';
import { loadRuntimeText } from './utils/text-loader.js';
import { applyRuntimeTextToDOM } from './ui/apply-text.js';
import { initializeDarkMode } from './visual/dark-mode-v2.js';
import { getPaletteTemplateOverrideFromUrl, getWeatherDrivenPaletteTemplate, maybeAutoPickCursorColor, rotatePaletteChapterOnReload } from './visual/colors.js';
import { initTimeDisplay } from './ui/time-display.js';
import { upgradeSocialIcons } from './ui/social-icons.js';
import { waitForFonts } from './utils/font-loader.js';
import { applyWallFrameFromConfig, applyWallFrameLayout } from './visual/wall-frame.js';
import { initNoiseSystem } from './visual/noise-system.js';
import { initPortfolioWallCanvas } from './portfolio/wall-only-canvas.js';
import { initCvScrollTypography } from './cv/cv-scroll-typography.js';
import { initCvPhotoSlideshow } from './cv/cv-photo-slideshow.js';
import { initCvPanel } from './cv/cv-panel.js';
import { applyCvConfig, loadCvRuntimeConfig } from './cv/config.js';
import { initSharedChrome } from './ui/shared-chrome.js';
import { setupPointer } from './input/pointer.js';
import { setupOverscrollLock } from './input/overscroll-lock.js';
import { setupCustomCursor, updateCursorSize } from './rendering/cursor.js';
import { getShellConfig, loadShellConfig, syncShellToDocument } from './visual/site-shell.js';
import { forceBootVisible, waitForPageReadyBarrier } from './visual/page-orchestrator.js';
import { getTransitionPhase, isRouteTransitionPhase } from '../../lib/transition-phase.js';
import { 
  navigateWithTransition, 
  resetTransitionState, 
  setupPrefetchOnHover,
  NAV_STATES 
} from './utils/page-nav.js';

function rectIsUsable(rect) {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function rectsMatchWithinThreshold(previous, next, thresholdPx = 1.5) {
  if (!rectIsUsable(previous) || !rectIsUsable(next)) return false;
  return (
    Math.abs(previous.top - next.top) <= thresholdPx
    && Math.abs(previous.left - next.left) <= thresholdPx
    && Math.abs(previous.width - next.width) <= thresholdPx
    && Math.abs(previous.height - next.height) <= thresholdPx
  );
}

function readCvPresentationSnapshot() {
  const wall = document.getElementById('simulations');
  const topbar = document.querySelector('.ui-top-main.route-topbar');
  const scroll = document.querySelector('.cv-scroll-container');

  return {
    wallRect: wall?.getBoundingClientRect() || null,
    topbarRect: topbar?.getBoundingClientRect() || null,
    scrollRect: scroll?.getBoundingClientRect() || null,
    ready: Boolean(
      rectIsUsable(wall?.getBoundingClientRect?.())
      && rectIsUsable(topbar?.getBoundingClientRect?.())
      && rectIsUsable(scroll?.getBoundingClientRect?.())
    ),
  };
}

async function waitForStableCvPresentation(options = {}) {
  const timeoutMs = Math.max(400, Number(options.timeoutMs) || 1800);
  const thresholdPx = Math.max(0.5, Number(options.thresholdPx) || 1.5);

  return new Promise((resolve) => {
    const startedAt = performance.now();
    let previous = null;
    let stablePasses = 0;

    const tick = () => {
      const snapshot = readCvPresentationSnapshot();
      if (snapshot.ready && previous) {
        const stable = (
          rectsMatchWithinThreshold(previous.wallRect, snapshot.wallRect, thresholdPx)
          && rectsMatchWithinThreshold(previous.topbarRect, snapshot.topbarRect, thresholdPx)
          && rectsMatchWithinThreshold(previous.scrollRect, snapshot.scrollRect, thresholdPx)
        );
        stablePasses = stable ? stablePasses + 1 : 0;
      } else if (!snapshot.ready) {
        stablePasses = 0;
      }

      if (snapshot.ready && stablePasses >= 1) {
        resolve(true);
        return;
      }

      if ((performance.now() - startedAt) >= timeoutMs) {
        resolve(snapshot.ready);
        return;
      }

      previous = snapshot;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

function signalRouteReady(routeId) {
  if (typeof window === 'undefined' || !routeId) return;
  requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('abs:route-ready', { detail: { routeId } }));
  });
}

export async function bootstrapCvPage() {
  // CV has no `#c` sim canvas — drop home/portfolio resize observers if SPA navigated here.
  try {
    disposeRendererListeners();
  } catch (e) {
    /* ignore */
  }

  const ABS_DEV = (typeof __DEV__ !== 'undefined') ? __DEV__ : false;
  const shellRouteTransitionActive = isRouteTransitionPhase(getTransitionPhase());

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 1: LOAD RUNTIME TEXT                                 ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    await loadRuntimeText();
    applyRuntimeTextToDOM();
  } catch (e) {
    // Non-fatal: continue with defaults.
  }

  await loadShellConfig();
  syncShellToDocument({
    isDark: document.documentElement.classList.contains('dark-mode')
  });

  try {
    const cvConfig = await loadCvRuntimeConfig();
    applyCvConfig(cvConfig);
  } catch (e) {
    applyCvConfig();
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 3: DRAMATIC ENTRANCE (Portfolio parity)              ║
  // ║        Runs BEFORE config/dark mode - matches Portfolio bootstrap order      ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    const g = getGlobals();
    const shellConfig = getShellConfig();
    const revealDuration = shellConfig?.motion?.contentRevealMs ?? 420;
    const fadeContent = document.getElementById('app-frame');
    const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const removeBlocker = () => {
      try {
        const blocker = document.getElementById('fade-blocking');
        if (blocker) blocker.remove();
      } catch (e) {}
    };
    const forceVisible = (reason) => {
      if (!fadeContent) return;
      forceBootVisible(['#abs-scene', '#app-frame', '.cv-scroll-container']);
      console.warn(`⚠️ CV entrance fallback (${reason})`);
    };
    const waitForVisualReady = async () => {
      await waitForPageReadyBarrier({
        waitForFonts: async () => {
          try {
            await waitForFonts();
          } catch {
            return false;
          }
          return true;
        },
        minimumMs: shellConfig?.motion?.shellRevealMs ?? 180
      });
    };

    // Check if View Transition just handled the animation (skip entrance entirely)
    const { didViewTransitionRun } = await import('./utils/page-nav.js');
    const viewTransitionHandled = didViewTransitionRun();
    
    if (shellRouteTransitionActive) {
      // SPA route transitions are orchestrated by useShellRouteTransition.
      // Skip legacy entrance work and let the shell own reveal timing.
      await waitForVisualReady();
      removeBlocker();
      console.log('✓ CV entrance skipped (shell route transition active)');
    } else if (viewTransitionHandled) {
      await waitForVisualReady();
      // View Transition handled animation - just reveal elements instantly
      forceBootVisible(['#abs-scene', '#app-frame', '.cv-scroll-container']);
      removeBlocker();
      console.log('✓ CV entrance skipped (View Transition handled it)');
    } else if (!g.entranceEnabled || reduceMotion) {
      await waitForVisualReady();
      forceBootVisible(['#abs-scene', '#app-frame', '.cv-scroll-container']);
      removeBlocker();
      console.log('✓ CV entrance animation skipped (disabled or reduced motion)');
    } else {
      await waitForVisualReady();
      const { orchestrateEntrance } = await import('./visual/entrance-animation.js');
      await orchestrateEntrance({
        waitForFonts: null,
        skipWallAnimation: true,
        centralContent: [
          '.cv-scroll-container'
        ],
        contentFadeDelay: 0,
        contentFadeDuration: revealDuration,
        lateElementDuration: revealDuration,
        allowScaleEntrance: shellConfig?.motion?.allowScaleEntrance
      });
      removeBlocker();
      console.log('✓ Dramatic entrance animation orchestrated (CV)');
    }

    // Failsafe watchdog: never allow a stuck hidden page (Portfolio parity)
    window.setTimeout(() => {
      const shellOpacity = fadeContent ? window.getComputedStyle(fadeContent).opacity : '1';
      const cvContainer = document.querySelector('.cv-scroll-container');
      const cvStyles = cvContainer ? window.getComputedStyle(cvContainer) : null;
      const cvHidden = !!cvStyles && (cvStyles.opacity === '0' || cvStyles.visibility === 'hidden');

      if (shellOpacity === '0' || cvHidden) {
        forceVisible('watchdog');
      }
    }, 2500);
  } catch (e) {
    const fadeContent = document.getElementById('app-frame');
    if (fadeContent) {
      fadeContent.style.opacity = '1';
      fadeContent.style.transform = 'translateZ(0)';
    }
    // Failsafe: reveal CV content
    const cvContainer = document.querySelector('.cv-scroll-container');
    if (cvContainer) {
      cvContainer.style.opacity = '1';
      cvContainer.style.visibility = 'visible';
    }
    console.warn('⚠️ CV entrance animation failed, forcing content visible', e);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 4: LOAD CONFIG + WALL FRAME                          ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  let runtimeConfig = null;
  try {
    runtimeConfig = await loadRuntimeConfig();
    // Initialize state with runtime config so all global parameters are available
    applyWallFrameFromConfig(runtimeConfig);
    syncShellToDocument({
      isDark: document.documentElement.classList.contains('dark-mode')
    });
    requestAnimationFrame(() => {
      applyWallFrameLayout();
    });
    // CV needs the same visible rubber wall as index, but without running the balls simulation.
    // Draw the wall ring onto a dedicated canvas layered above the content.
    try { initPortfolioWallCanvas({ canvasSelector: '.cv-wall-canvas' }); } catch (e) {}
    // Procedural noise texture (no GIF): generates a small texture once and animates via CSS only.
    try { initNoiseSystem(getGlobals()); } catch (e) {}

    const gPointer = getGlobals();
    gPointer.mouseInCanvas = false;
    if (typeof window !== 'undefined') window.mouseInCanvas = false;
    if (gPointer.canvas) {
      setupPointer();
      setupOverscrollLock();
      setupCustomCursor();
      updateCursorSize();
    }

    // Keep the frame responsive to viewport changes (same behavior as index).
    window.addEventListener('resize', applyWallFrameLayout, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', applyWallFrameLayout, { passive: true });
    }
  } catch (e) {
    // Safe fallback: keep the page readable if config loading fails.
    // Still try to initialize noise with defaults
    try { initNoiseSystem(); } catch (e2) {}
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 5: MODAL/GATE SYSTEM (Portfolio parity)              ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  // Initialize shared chrome (modals + cursor hiding) with CV-specific config
  initSharedChrome({
    contactModal: true,
    cvModal: false, // Already on CV page
    portfolioModal: true,
    cursorHiding: true,
    modalOverlayConfig: runtimeConfig || {}
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 6: PALETTE + DEV PANEL + DARK MODE                   ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  // Palette chapters: URL override wins for review/screenshot flows.
  const paletteOverride = getPaletteTemplateOverrideFromUrl();
  if (paletteOverride) {
    getGlobals().currentTemplate = paletteOverride;
  } else {
    getGlobals().currentTemplate = getWeatherDrivenPaletteTemplate() || rotatePaletteChapterOnReload();
  }

  // Panel before dark mode init so theme segment buttons in the dock receive listeners (init runs once).
  try {
    if (ABS_DEV) {
      await initCvPanel();
    }
  } catch (e) {
    console.warn('CV config panel failed to initialize', e);
  }

  initializeDarkMode();

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 7: SHARED UI CHROME                                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  maybeAutoPickCursorColor?.('startup');
  initTimeDisplay();
  upgradeSocialIcons();
  // Sound toggle removed from CV page - no sound on this page
  // createSoundToggle();

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                       CV-SPECIFIC: SCROLL TYPOGRAPHY                         ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    // Ensure fonts are settled so line breaking is stable.
    try { await waitForFonts(); } catch (e) {}
    initCvScrollTypography({
      scrollContainerSelector: '.cv-right',
      contentSelector: '.cv-right__inner',
    });
  } catch (e) {}

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                       CV-SPECIFIC: PHOTO SLIDESHOW                           ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    initCvPhotoSlideshow();
  } catch (e) {
    console.warn('CV photo slideshow failed to initialize', e);
  }

  const cvPresentationSettled = await waitForStableCvPresentation();
  if (!cvPresentationSettled && import.meta.env?.DEV) {
    console.warn('[cv] Presentation did not fully settle before route-ready dispatch.');
  }
  if (shellRouteTransitionActive) {
    signalRouteReady('cv');
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║              SMOOTH PAGE TRANSITIONS (Unified Navigation System)             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  
  // Handle back navigation with smooth transition
  document.querySelectorAll('[data-nav-transition]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateWithTransition(link.href, NAV_STATES.INTERNAL);
    });
  });
  
  // Handle bfcache restore (browser back/forward with cached page)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      resetTransitionState();
      const appFrame = document.getElementById('app-frame');
      if (appFrame) appFrame.style.opacity = '1';
    }
  });
  
  // Prefetch index on back link hover
  const backLink = document.querySelector('[data-nav-transition][href*="index"]');
  if (backLink) {
    setupPrefetchOnHover(backLink, 'index.html');
  }
  
}
