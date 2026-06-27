// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      BOUNCY BALLS – MAIN ENTRY (COMPLETE)                    ║
// ║                       Modular Architecture Bootstrap                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES, NARRATIVE_MODE_SEQUENCE } from './modules/core/constants.js';
import { initState, setCanvas, getGlobals, applyLayoutCSSVars } from './modules/core/state.js';
import { getDailyMode } from './modules/core/daily-scheduler.js';
import { initializeDarkMode } from './modules/visual/dark-mode-v2.js';
import { getPaletteTemplateOverrideFromUrl, getWeatherDrivenPaletteTemplate, maybeAutoPickCursorColor, rotatePaletteChapterOnReload } from './modules/visual/colors.js';
import { initNoiseSystem } from './modules/visual/noise-system.js';
import { initWallShadowPlateSystem } from './modules/visual/wall-shadow-plate.js';
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
import { setMode, getForceApplicator, initModeSystem } from './modules/modes/mode-controller.js';
import { startMainLoop } from './modules/rendering/loop.js';
import { loadSettings } from './modules/utils/storage.js';
import { initCVModal } from './modules/ui/cv-modal.js';
import { initPortfolioModal } from './modules/ui/portfolio-modal.js';
import { initContactModal } from './modules/ui/contact-modal.js';
import { initModalOverlay } from './modules/ui/modal-overlay.js';
import { createSoundToggle } from './modules/ui/sound-toggle.js';
import { createThemeToggle } from './modules/ui/theme-toggle.js';
import { initSoundEngine, applySoundConfigFromRuntimeConfig } from './modules/audio/sound-engine.js';
import { upgradeSocialIcons } from './modules/ui/social-icons.js';
import { initTimeDisplay } from './modules/ui/time-display.js';
import { initQuoteDisplay } from './modules/ui/quote-display.js';
import { initQuotePuck } from './modules/ui/quote-puck.js';
import { applyExpertiseLegendColors } from './modules/ui/legend-colors.js';
// Note: Legend interactivity is now inlined in main.js for reliability
import { initLegendFilterSystem } from './modules/ui/legend-filter.js';
import { initLinkCursorHop } from './modules/ui/link-cursor-hop.js';
import { initTactileLayer, updateTactileLayer } from './modules/visual/tactile-layer.js';
import { setApplyVisualCSSVars, setUpdateTactileLayer } from './modules/ui/control-registry.js';
import { updateModeButtonsUI } from './modules/ui/controls.js';
// Layout controls now integrated into master panel
import { initSceneImpactReact } from './modules/ui/scene-impact-react.js';
import { initSceneChangeSFX } from './modules/ui/scene-change-sfx.js';
import { loadRuntimeText, getText } from './modules/utils/text-loader.js';
import { applyRuntimeTextToDOM } from './modules/ui/apply-text.js';
import { loadRuntimeConfig } from './modules/utils/runtime-config.js';
import { waitForFonts } from './modules/utils/font-loader.js';
import { getShellConfig, loadShellConfig, syncShellToDocument } from './modules/visual/site-shell.js';
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

function setBootLifecycleState(state) {
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.absBootState = String(state || '');
    }
  } catch (e) {}
}

function signalRouteReady(routeId) {
  if (typeof window === 'undefined' || !routeId) return;
  requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('abs:route-ready', { detail: { routeId } }));
  });
}

function getUrlStartupModeOverride() {
  try {
    const mode = String(new URLSearchParams(window.location.search).get('mode') || '').trim();
    if (!mode) return '';
    return NARRATIVE_MODE_SEQUENCE.includes(mode) ? mode : '';
  } catch (e) {
    return '';
  }
}

/**
 * Apply two-level padding CSS variables from global state to :root
 * 
 * Two-level system:
 * 1. --container-border: insets #simulations from viewport (reveals body bg as outer frame)
 * 2. --simulation-padding: padding inside container around canvas (inner breathing room)
 * 
 * The canvas radius auto-calculates via CSS: calc(var(--container-radius) - var(--simulation-padding))
 */
export function applyFramePaddingCSSVars() {
  // Back-compat export: this project previously applied only frame padding here.
  // Layout is now vw-native in config/state, with px derived and stamped centrally.
  applyLayoutCSSVars();
}

/**
 * Apply visual CSS variables (noise opacity/size, walls) from config to :root
 */
export function applyVisualCSSVars(config) {
  const root = document.documentElement;
  
  // NOTE: Layout CSS vars (frame/padding/radius/thickness) are applied via
  // `applyLayoutCSSVars()` from state (vw-native → px derived).

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

/**
 * Ensure the base .noise element exists (for dev environments where the full exported HTML isn't present).
 * Secondary noise layers are intentionally removed for performance.
 */
function ensureNoiseElements() {
  // Check if we have a noise texture image to use
  const existingNoise = document.querySelector('.noise');
  if (!existingNoise) {
    // No noise system present (minimal dev markup) - skip
    return;
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    MAIN LINKS — MOBILE WRAP ENHANCEMENTS                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
// We avoid editing exported HTML directly by enhancing at runtime.
function enhanceFooterLinksForMobile() {
  try {
    const cv = document.getElementById('cv-modal-trigger');
    if (cv && !cv.querySelector('.footer-link-nowrap')) {
      const expected = String(getText('footer.links.cv.text', '') || '').trim();
      const raw = (cv.textContent || '').trim().replace(/\s+/g, ' ');
      const txt = expected || raw;
      // Keep short compound labels together on mobile (e.g. "About me").
      if (txt && txt.includes('/') && raw === txt) {
        cv.innerHTML = `<span class="footer-link-nowrap">${txt}</span>`;
      }
    }
  } catch (e) {}
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

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                 HOME POST-BOOT UI ENTRANCE                                  ║
// ║  Direct-load only. The wall/canvas compose behind the boot overlay; these   ║
// ║  helpers reveal the non-canvas homepage UI after the overlay has gone.      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const HOME_POST_BOOT_ENTER_COMPLETE_MS = 3900;
let homePostBootEntranceTimer = 0;
let homePostBootEntranceRaf = 0;

function shouldReduceMotion() {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

function clearHomePostBootEntranceTimer() {
  if (homePostBootEntranceTimer) {
    window.clearTimeout(homePostBootEntranceTimer);
    homePostBootEntranceTimer = 0;
  }

  if (homePostBootEntranceRaf) {
    window.cancelAnimationFrame(homePostBootEntranceRaf);
    homePostBootEntranceRaf = 0;
  }
}

function clearHomePostBootEntrance() {
  clearHomePostBootEntranceTimer();
  const root = document.documentElement;
  root.classList.remove(
    'abs-home-post-boot-pending',
    'abs-home-post-boot-enter',
    'abs-home-post-boot-complete'
  );
}

function stageHomePostBootEntrance() {
  clearHomePostBootEntranceTimer();
  const root = document.documentElement;
  root.classList.remove('abs-home-post-boot-enter', 'abs-home-post-boot-complete');
  root.classList.add('abs-home-post-boot-pending');
}

function startHomePostBootEntrance() {
  clearHomePostBootEntranceTimer();
  const root = document.documentElement;

  homePostBootEntranceRaf = window.requestAnimationFrame(() => {
    homePostBootEntranceRaf = 0;

    if (isRouteTransitionPhase(getTransitionPhase())) {
      clearHomePostBootEntrance();
      return;
    }

    if (shouldReduceMotion()) {
      root.classList.remove('abs-home-post-boot-pending', 'abs-home-post-boot-enter');
      root.classList.add('abs-home-post-boot-complete');
      return;
    }

    root.classList.add('abs-home-post-boot-enter');
    root.classList.remove('abs-home-post-boot-pending');

    homePostBootEntranceTimer = window.setTimeout(() => {
      homePostBootEntranceTimer = 0;
      if (!root.classList.contains('abs-home-post-boot-enter')) return;
      root.classList.remove('abs-home-post-boot-enter');
      root.classList.add('abs-home-post-boot-complete');
    }, HOME_POST_BOOT_ENTER_COMPLETE_MS);
  });
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

export async function bootstrapHomePage() {
  setBootLifecycleState('booting');

  // Mark JS as enabled (for CSS fallback detection)
  document.documentElement.classList.add('js-enabled');

  // TEXT (SOURCE OF TRUTH):
  // Load and apply all copy BEFORE fade-in so there is no visible “pop-in”.
  try {
    await loadRuntimeText();
    applyRuntimeTextToDOM();
  } catch (e) {}

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

    await loadShellConfig();
    syncShellToDocument({
      isDark: document.documentElement.classList.contains('dark-mode')
    });
    
    const config = await loadRuntimeConfig();
    initState(config);
    applyHomeHeroRuntimeConfig();
    syncShellToDocument({
      isDark: document.documentElement.classList.contains('dark-mode')
    });
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
    
    // Apply vw-native layout (frame/padding/radius) as derived px CSS vars.
    applyLayoutCSSVars();
    log('✓ Layout applied');
    
    // Apply visual CSS vars (noise, inner shadow) from config
    applyVisualCSSVars(config);
    log('✓ Visual effects configured');

    // Apply config-driven UI CSS vars that aren't part of layout/colors stamping.
    // (Production ships without the panel, so config must fully drive these.)
    try {
      const g = getGlobals();
      const root = document.documentElement;
      const clampHoverPercent = (value) => {
        const normalized = Number(value);
        if (!Number.isFinite(normalized)) return '0%';
        const clamped = Math.max(0, Math.min(1, normalized));
        return `${(clamped * 100).toFixed(1)}%`;
      };
      if (Number.isFinite(g?.topLogoWidthVw)) {
        root.style.setProperty('--top-logo-width-vw', String(g.topLogoWidthVw));
      }
      if (Number.isFinite(g?.homeMainLinksBelowLogoPx)) {
        root.style.setProperty('--home-main-links-below-logo-px', g.homeMainLinksBelowLogoPx + 'px');
      }
      if (Number.isFinite(g?.footerNavBarTopVh)) {
        root.style.setProperty('--footer-nav-bar-top', `${g.footerNavBarTopVh}vh`);
        root.style.setProperty('--footer-nav-bar-top-svh', `${g.footerNavBarTopVh}svh`);
        root.style.setProperty('--footer-nav-bar-top-dvh', `${g.footerNavBarTopVh}dvh`);
      }
      if (Number.isFinite(g?.footerNavBarGapVw)) {
        /* Convert vw to clamp() pattern: min scales with vw, max = min * 1.67 (matching --gap-xl ratio) */
        const minPx = Math.round(g.footerNavBarGapVw * 9.6); // ~var(--space-lg) at var(--size-2.5) base
        const maxPx = Math.round(minPx * 1.67); // ~var(--space-3xl) at var(--size-2.5) base (maintains ratio)
        root.style.setProperty('--footer-nav-bar-gap', `clamp(${minPx}px, ${g.footerNavBarGapVw}vw, ${maxPx}px)`);
      }
      if (Number.isFinite(g?.uiHitAreaMul)) {
        root.style.setProperty('--ui-hit-area-mul', String(g.uiHitAreaMul));
      }
      if (Number.isFinite(g?.uiIconCornerRadiusMul)) {
        root.style.setProperty('--ui-icon-corner-radius-mul', String(g.uiIconCornerRadiusMul));
      }
      // Unified icon button geometry: frame size + glyph size (px)
      // 0 = use token-derived defaults (do not override CSS).
      if (Number.isFinite(g?.uiIconFramePx) && Math.round(g.uiIconFramePx) > 0) {
        root.style.setProperty('--ui-icon-frame-size', `${Math.round(g.uiIconFramePx)}px`);
      }
      if (Number.isFinite(g?.uiIconGlyphPx) && Math.round(g.uiIconGlyphPx) > 0) {
        root.style.setProperty('--ui-icon-glyph-size', `${Math.round(g.uiIconGlyphPx)}px`);
      }
      if (Number.isFinite(g?.linkTextPadding)) {
        root.style.setProperty('--link-text-padding', `${Math.round(g.linkTextPadding)}px`);
        root.style.setProperty('--link-text-margin', `${-Math.round(g.linkTextPadding)}px`);
      }
      if (Number.isFinite(g?.linkIconPadding)) {
        root.style.setProperty('--link-icon-padding', `${Math.round(g.linkIconPadding)}px`);
        root.style.setProperty('--link-icon-margin', `${-Math.round(g.linkIconPadding)}px`);
      }
      if (Number.isFinite(g?.linkColorInfluence)) {
        root.style.setProperty('--link-color-influence', String(g.linkColorInfluence));
      }
      if (Number.isFinite(g?.linkImpactScale)) {
        root.style.setProperty('--link-impact-scale', String(g.linkImpactScale));
      }
      if (Number.isFinite(g?.linkImpactBlur)) {
        root.style.setProperty('--link-impact-blur', `${g.linkImpactBlur}px`);
      }
      if (Number.isFinite(g?.linkImpactDuration)) {
        root.style.setProperty('--link-impact-duration', `${Math.round(g.linkImpactDuration)}ms`);
      }
      if (Number.isFinite(g?.linkHoverNudge)) {
        root.style.setProperty('--link-nudge', `${g.linkHoverNudge}px`);
      }
      if (Number.isFinite(g?.linkHoverIntensityLight)) {
        root.style.setProperty('--abs-hover-intensity-light', clampHoverPercent(g.linkHoverIntensityLight));
      }
      if (Number.isFinite(g?.linkHoverIntensityDark)) {
        root.style.setProperty('--abs-hover-intensity-dark', clampHoverPercent(g.linkHoverIntensityDark));
      }
      if (Number.isFinite(g?.linkHoverIntensityActive)) {
        root.style.setProperty('--abs-hover-intensity-active', clampHoverPercent(g.linkHoverIntensityActive));
      }

      // Hover target "snap" bounce (scale-only; color stays instant)
      if (g?.hoverSnapEnabled !== undefined) {
        root.style.setProperty('--abs-hover-snap-enabled', g.hoverSnapEnabled ? '1' : '0');
      }
      if (Number.isFinite(g?.hoverSnapDuration)) {
        root.style.setProperty('--abs-hover-snap-duration', `${Math.max(0, Math.round(g.hoverSnapDuration))}ms`);
      }
      if (Number.isFinite(g?.hoverSnapOvershoot)) {
        root.style.setProperty('--abs-hover-snap-overshoot', String(g.hoverSnapOvershoot));
      }
      if (Number.isFinite(g?.hoverSnapUndershoot)) {
        root.style.setProperty('--abs-hover-snap-undershoot', String(g.hoverSnapUndershoot));
      }
    } catch (e) {}
    
    // Ensure base noise element exists (for modular dev environments)
    ensureNoiseElements();

    // Procedural noise texture (no GIF): generates a small texture once and animates via CSS only.
    try {
      initNoiseSystem(getGlobals());
    } catch (e) {}

    try {
      initWallShadowPlateSystem(getGlobals());
    } catch (e) {}
    
    // Setup canvas (attaches resize listener, but doesn't resize yet)
    setupRenderer();
    const canvas = getCanvas();
    const ctx = getContext();
    const container = document.getElementById('simulations');
    
    if (!canvas || !ctx || !container) {
      throw new Error('Missing DOM elements');
    }

    // Logo is now positioned in .ui-center flex container (inside .fade-content)
    // No longer moved to #simulations - it stays in the UI layer for proper flex layout

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
    
    // Canvas logo removed — hero title is now a DOM <h1> inside #simulations
    log('✓ Hero title rendered via DOM (canvas logo removed)');
    
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

    // Link hover: hide cursor + trail; let hover dot “become” the cursor.
    initLinkCursorHop();

    // Scene micro-interaction: subtle "clicked-in" response on simulation changes
    initSceneImpactReact();
    
    // Load any saved settings
    loadSettings();

    // Palette chapters: URL override wins for review/screenshot flows.
    const paletteOverride = getPaletteTemplateOverrideFromUrl();
    if (paletteOverride) {
      getGlobals().currentTemplate = paletteOverride;
    } else {
      getGlobals().currentTemplate = getWeatherDrivenPaletteTemplate() || rotatePaletteChapterOnReload();
    }

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
    
    // Initialize modal blur overlay system
    try {
      initModalOverlay(config);
      log('✓ Modal overlay system initialized');
    } catch (e) {
      console.warn('Modal overlay initialization error:', e?.message);
    }

    // Initialize invite gates (CV and Portfolio access flow)
    try {
      initCVModal();
      log('✓ CV invite gate initialized');
    } catch (e) {
      console.warn('CV gate initialization error:', e?.message);
    }

    try {
      initPortfolioModal();
      log('✓ Portfolio invite gate initialized');
    } catch (e) {
      console.warn('Portfolio gate initialization error:', e?.message);
    }

    try {
      initContactModal();
      log('✓ Contact gate initialized');
    } catch (e) {
      console.warn('Contact gate initialization error:', e?.message);
    }

    // Compose the top UI (LEGACY FUNCTION REMOVED - NOW IN DOM)
    // setupTopElementsLayout();

    // Normalize social icons (line SVGs) across dev + build.
    // (Build uses the exported HTML; we patch at runtime for consistency.)
    upgradeSocialIcons();

    // Initialize time display (London time)
    initTimeDisplay();

    // Footer: mobile-friendly wrapping tweaks (keeps "About me" together)
    enhanceFooterLinksForMobile();
    
    // Create quick sound toggle button (bottom-right, next to time)
    createSoundToggle();
    log('✓ Sound toggle button created');
    
    // Create quick theme toggle button (bottom-left)
    createThemeToggle();
    log('✓ Theme toggle button created');
    
    // Layout controls integrated into master panel
    
    // Initialize mode runtime (handles eager/lazy mode rollout flags)
    initModeSystem();

    // Initialize starting mode. A non-empty startupMode overrides the daily rotation
    // until it is cleared again in the authored shell config.
    const urlMode = getUrlStartupModeOverride();
    const configuredHeroMode = String(getShellConfig()?.hero?.startupMode || '').trim();
    const startMode = urlMode || configuredHeroMode || getDailyMode() || MODES.PIT;

    await setMode(startMode);
    if (isRouteTransitionPhase(getTransitionPhase())) {
      signalRouteReady('home');
    }

    if (ABS_DEV && typeof window !== 'undefined') {
      window.__ABS_HOME_AUDIT__ = {
        getGlobals,
        getShellConfig,
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
          panelManager.registerDevPanelRoute?.({
            page: 'home',
            pageLabel: 'Home',
            productLabel: 'Alexander Beck Studio',
          });
        } else {
          window.__PANEL_INITIALLY_VISIBLE__ = true;
          const panelDock = await import('./modules/ui/panel-dock.js');
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
        colors.populateColorSelect?.();
        updateModeButtonsUI?.(startMode);
      } catch (e) {}
    }
    mark('bb:ui');
    log(ABS_DEV
      ? '✓ Dev panel launcher ready'
      : (localBuildPanelPreview ? '✓ Local build panel ready' : '✓ UI initialized (panel disabled in production)'));

    // Theme segment buttons live in the panel; init runs once after the dock exists.
    initializeDarkMode();
    mark('bb:theme');

    // Cursor color: auto-pick after dark mode + palette (initializeDarkMode → applyColorTemplate).
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
        getModalToAutoOpen, 
        shouldSkipWallAnimation, 
        resetTransitionState,
        setupPrefetchOnHover,
        initSpeculativePrefetch,
        didViewTransitionRun
      } = await import('./modules/utils/page-nav.js');
      
      const shellConfig = getShellConfig();
      const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      // Check navigation state BEFORE consuming it (getModalToAutoOpen reads but doesn't clear)
      const autoOpenModal = getModalToAutoOpen();
      
      // Check if we should skip wall animation (internal nav or browser back/forward)
      // Note: shouldSkipWallAnimation() consumes the navigation state
      const skipWall = shouldSkipWallAnimation();
      
      // Check if View Transition just ran (Chrome) - skip entrance animation entirely
      const skipEntrance = didViewTransitionRun();
      const warmupMs = (skipWall || skipEntrance) ? 0 : getPageWarmupMs({ config: shellConfig });
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
          minimumMs: warmupMs
        });
        try {
          resize();
          render();
        } catch (error) {
          void error;
        }
        await waitForCanvasReady({ selector: '#c', timeoutMs: 3200 });
        await waitForFrames(2);
      };
      
      // Handle bfcache restore (browser back/forward with cached page)
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          resetTransitionState();
          clearHomePostBootEntrance();
          forceBootVisible(['#abs-scene', '#app-frame']);
        }
      });
      
      // Setup prefetch on hover for gate triggers
      const cvTrigger = document.getElementById('cv-modal-trigger');
      const portfolioTrigger = document.getElementById('portfolio-modal-trigger');
      if (cvTrigger) setupPrefetchOnHover(cvTrigger, 'cv.html');
      if (portfolioTrigger) setupPrefetchOnHover(portfolioTrigger, 'portfolio.html');

      // Run the home UI entrance for every direct landing/reload. Shell route
      // transitions restore stable UI without replaying choreography.
      const shellRouteTransitionActive = isRouteTransitionPhase(getTransitionPhase());
      const shouldRunHomePostBootEntrance = !reduceMotion && !shellRouteTransitionActive;

      if (shellRouteTransitionActive) {
        clearHomePostBootEntrance();
        await waitForVisualReady();
        console.log('✓ Home entrance skipped (shell route transition active)');
      } else {
        if (shouldRunHomePostBootEntrance) {
          stageHomePostBootEntrance();
        } else {
          clearHomePostBootEntrance();
        }
        await waitForVisualReady();
        await completeDirectBoot({
          selectors: ['#abs-scene', '#app-frame'],
          detail: reduceMotion
            ? 'home-ready-reduced-motion'
            : skipEntrance
              ? 'home-ready-view-transition'
              : skipWall
                ? 'home-ready-return'
                : 'home-ready',
          onOverlayHidden: shouldRunHomePostBootEntrance
            ? startHomePostBootEntrance
            : clearHomePostBootEntrance,
        });
        console.log('✓ Home direct boot revealed from settled first frame');
      }
      
      // Auto-open modal if requested via navigation state
      if (autoOpenModal === 'cv') {
        // CV modal - trigger the gate open
        setTimeout(() => {
          const cvTriggerEl = document.getElementById('cv-modal-trigger');
          if (cvTriggerEl) cvTriggerEl.click();
        }, 400);
      } else if (autoOpenModal === 'contact') {
        // Contact modal - trigger the gate open
        setTimeout(() => {
          const contactTriggerEl = document.getElementById('contact-email');
          if (contactTriggerEl) contactTriggerEl.click();
        }, 400);
      }
      
      // Initialize speculative prefetch system for faster page transitions
      initSpeculativePrefetch();
      
    } catch (e) {
      console.warn('⚠️ Direct boot reveal failed, forcing settled content visible:', e);
      clearHomePostBootEntrance();
      await failDirectBoot({
        selectors: ['#abs-scene', '#app-frame'],
        detail: 'home-reveal-failed',
      });
    }

    if (document.documentElement.dataset.absBootDetail !== 'held') {
      setBootLifecycleState('ready');
    }

    return () => {
      try {
        disposeRendererListeners();
      } catch (e) {
        /* ignore */
      }
    };
  } catch (error) {
    setBootLifecycleState('failed');
    console.error('❌ Initialization failed:', error);
    document.body.innerHTML = `<div style="padding: var(--radius-lg); color: red; background: white;">
      <h2>Initialization Error</h2>
      <pre>${error.message}\n${error.stack}</pre>
    </div>`;
  }
  return undefined;
}
