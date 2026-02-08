// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               CV PAGE BOOTSTRAP                               ║
// ║     Loads runtime text + shared chrome (dark mode, time, socials, sound)      ║
// ║                     PORTFOLIO PARITY: Matching bootstrap sequence             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from './core/state.js';
import { loadRuntimeConfig } from './utils/runtime-config.js';
import { loadRuntimeText } from './utils/text-loader.js';
import { applyRuntimeTextToDOM } from './ui/apply-text.js';
import { initializeDarkMode } from './visual/dark-mode-v2.js';
import { maybeAutoPickCursorColor, rotatePaletteChapterOnReload } from './visual/colors.js';
import { initTimeDisplay } from './ui/time-display.js';
import { upgradeSocialIcons } from './ui/social-icons.js';
import { createSoundToggle } from './ui/sound-toggle.js';
import { waitForFonts } from './utils/font-loader.js';
import { applyWallFrameFromConfig, applyWallFrameLayout, syncWallFrameColors } from './visual/wall-frame.js';
import { initNoiseSystem } from './visual/noise-system.js';
import { initPortfolioWallCanvas } from './portfolio/wall-only-canvas.js';
import { initCvScrollTypography } from './cv/cv-scroll-typography.js';
import { initCvPhotoSlideshow } from './cv/cv-photo-slideshow.js';
import { initCvPanel } from './cv/cv-panel.js';
import { initSharedChrome } from './ui/shared-chrome.js';
import { 
  navigateWithTransition, 
  resetTransitionState, 
  setupPrefetchOnHover,
  NAV_STATES 
} from './utils/page-nav.js';

async function bootstrapCvPage() {
  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 1: LOAD RUNTIME TEXT                                 ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    await loadRuntimeText();
    applyRuntimeTextToDOM();
  } catch (e) {
    // Non-fatal: continue with defaults.
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 2: WAIT FOR FONTS (Portfolio parity)                 ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    await waitForFonts();
  } catch (e) {}

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 3: DRAMATIC ENTRANCE (Portfolio parity)              ║
  // ║        Runs BEFORE config/dark mode - matches Portfolio bootstrap order      ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    const g = getGlobals();
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
      fadeContent.style.opacity = '1';
      fadeContent.style.transform = 'translateZ(0)';
      removeBlocker();
      // Also reveal central content elements
      const cvContainer = document.querySelector('.cv-scroll-container');
      if (cvContainer) {
        cvContainer.style.opacity = '1';
        cvContainer.style.visibility = 'visible';
      }
      console.warn(`⚠️ CV entrance fallback (${reason})`);
    };

    // Check if View Transition just handled the animation (skip entrance entirely)
    const { didViewTransitionRun } = await import('./utils/page-nav.js');
    const viewTransitionHandled = didViewTransitionRun();
    
    if (viewTransitionHandled) {
      // View Transition handled animation - just reveal elements instantly
      if (fadeContent) {
        fadeContent.style.opacity = '1';
        fadeContent.style.visibility = 'visible';
        fadeContent.style.transform = 'translateZ(0)';
      }
      const cvContainer = document.querySelector('.cv-scroll-container');
      if (cvContainer) {
        cvContainer.style.opacity = '1';
        cvContainer.style.visibility = 'visible';
      }
      removeBlocker();
      console.log('✓ CV entrance skipped (View Transition handled it)');
    } else if (!g.entranceEnabled || reduceMotion) {
      if (fadeContent) {
        fadeContent.style.opacity = '1';
        fadeContent.style.transform = 'translateZ(0)';
      }
      // Also reveal central content elements
      const cvContainer = document.querySelector('.cv-scroll-container');
      if (cvContainer) {
        cvContainer.style.opacity = '1';
        cvContainer.style.visibility = 'visible';
      }
      removeBlocker();
      console.log('✓ CV entrance animation skipped (disabled or reduced motion)');
    } else {
      const { orchestrateEntrance } = await import('./visual/entrance-animation.js');
      await orchestrateEntrance({
        waitForFonts: async () => {
          try { await waitForFonts(); } catch (e) {}
        },
        skipWallAnimation: true,
        centralContent: [
          '.cv-scroll-container'
        ]
      });
      removeBlocker();
      console.log('✓ Dramatic entrance animation orchestrated (CV)');
    }

    // Failsafe watchdog: never allow a stuck hidden page (Portfolio parity)
    window.setTimeout(() => {
      if (!fadeContent) return;
      const opacity = window.getComputedStyle(fadeContent).opacity;
      if (opacity === '0') forceVisible('watchdog');
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
    requestAnimationFrame(() => {
      applyWallFrameLayout();
    });
    // CV needs the same visible rubber wall as index, but without running the balls simulation.
    // Draw the wall ring onto a dedicated canvas layered above the content.
    try { initPortfolioWallCanvas({ canvasSelector: '.cv-wall-canvas' }); } catch (e) {}
    // Procedural noise texture (no GIF): generates a small texture once and animates via CSS only.
    try { initNoiseSystem(getGlobals()); } catch (e) {}
    
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
  // ║                    STEP 6: PALETTE + DARK MODE                               ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  // Palette chapters: rotate on each reload (applies only to cursor + palette-driven dots).
  rotatePaletteChapterOnReload();

  initializeDarkMode();
  
  // Ensure wall colors are applied after dark mode initialization
  // (dark mode syncCssVarsFromConfig might override them, so re-apply from config/globals)
  const g = getGlobals();
  const root = document.documentElement;
  
  if (runtimeConfig) {
    // Re-apply wall colors to ensure they match index page
    syncWallFrameColors(runtimeConfig);
  } else {
    // Fallback: use globals if config not available
    const frameLight = g?.frameColorLight || g?.frameColor;
    const frameDark = g?.frameColorDark || g?.frameColor;
    if (frameLight) root.style.setProperty('--frame-color-light', frameLight);
    if (frameDark) root.style.setProperty('--frame-color-dark', frameDark);
  }
  
  // Force update from globals to ensure values are correct (globals have processed values from initState)
  const frameLight = g?.frameColorLight || g?.frameColor;
  const frameDark = g?.frameColorDark || g?.frameColor;
  if (frameLight) {
    root.style.setProperty('--frame-color-light', frameLight);
  }
  if (frameDark) {
    root.style.setProperty('--frame-color-dark', frameDark);
  }
  
  // Also update theme-color meta tag with the correct wall color for browser chrome
  const currentWallColor = g.isDarkMode ? frameDark : frameLight;
  if (currentWallColor) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = currentWallColor;
    root.style.setProperty('--chrome-bg', currentWallColor);
  }

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

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                       CV-SPECIFIC: CONFIG PANEL (DEV ONLY)                   ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    // Production builds intentionally ship with baked-in config (no tuning UI).
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      initCvPanel();
    }
  } catch (e) {
    console.warn('CV config panel failed to initialize', e);
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

document.addEventListener('DOMContentLoaded', () => {
  bootstrapCvPage();
});
