// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      BOUNCY BALLS – MAIN ENTRY (COMPLETE)                    ║
// ║                       Modular Architecture Bootstrap                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS } from './modules/core/constants.js';
import { initState, setCanvas, getGlobals, applyLayoutCSSVars } from './modules/core/state.js';
import { initializeDarkMode } from './modules/visual/dark-mode-v2.js';
import { applyColorTemplate, maybeAutoPickCursorColor, rotatePaletteChapterOnReload } from './modules/visual/colors.js';
import { initNoiseSystem } from './modules/visual/noise-system.js';
import { setupRenderer, getCanvas, getContext, resize, setForceRenderCallback } from './modules/rendering/renderer.js';
import { render } from './modules/physics/engine.js';
import { setupKeyboardShortcuts } from './modules/ui/keyboard.js';
import { setupPointer } from './modules/input/pointer.js';
import { setupOverscrollLock } from './modules/input/overscroll-lock.js';
import { setupCustomCursor } from './modules/rendering/cursor.js';
import { setMode, MODES, getForceApplicator } from './modules/modes/mode-controller.js';
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
import { applyExpertiseLegendColors } from './modules/ui/legend-colors.js';
// Note: Legend interactivity is now inlined in main.js for reliability
import { initLegendFilterSystem } from './modules/ui/legend-filter.js';
import { initLinkCursorHop } from './modules/ui/link-cursor-hop.js';
// Layout controls now integrated into master panel
import { initSceneImpactReact } from './modules/ui/scene-impact-react.js';
import { initSceneChangeSFX } from './modules/ui/scene-change-sfx.js';
import { loadRuntimeText, getText } from './modules/utils/text-loader.js';
import { applyRuntimeTextToDOM } from './modules/ui/apply-text.js';
import { loadRuntimeConfig } from './modules/utils/runtime-config.js';
import { waitForFonts } from './modules/utils/font-loader.js';
import { readTokenVar } from './modules/utils/tokens.js';
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
// In source/dev mode (unbundled), `__DEV__` is undefined and we fall back to runtime detection.
const ABS_DEV = (typeof __DEV__ !== 'undefined') ? __DEV__ : isDev();
const CONTENT_FADE_DURATION_MS = 800;
const CONTENT_FADE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

function pickStartupMode() {
  // Narrative opening: start with Ball Pit.
  return MODES.PIT;
}

/**
 * Apply two-level padding CSS variables from global state to :root
 * 
 * Two-level system:
 * 1. --container-border: insets #bravia-balls from viewport (reveals body bg as outer frame)
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
  if (config.noiseSizeBase !== undefined) {
    root.style.setProperty('--noise-size-base', `${config.noiseSizeBase}px`);
  }
  if (config.noiseSizeTop !== undefined) {
    root.style.setProperty('--noise-size-top', `${config.noiseSizeTop}px`);
  }
  
  // Noise opacity (light mode)
  if (config.noiseBackOpacity !== undefined) {
    // Keep both legacy + current variable names for compatibility.
    root.style.setProperty('--noise-back-opacity', String(config.noiseBackOpacity));
    root.style.setProperty('--noise-back-opacity-light', String(config.noiseBackOpacity));
  }
  if (config.noiseFrontOpacity !== undefined) {
    root.style.setProperty('--noise-front-opacity', String(config.noiseFrontOpacity));
    root.style.setProperty('--noise-front-opacity-light', String(config.noiseFrontOpacity));
  }
  
  // Noise opacity (dark mode)
  if (config.noiseBackOpacityDark !== undefined) {
    root.style.setProperty('--noise-back-opacity-dark', String(config.noiseBackOpacityDark));
  }
  if (config.noiseFrontOpacityDark !== undefined) {
    root.style.setProperty('--noise-front-opacity-dark', String(config.noiseFrontOpacityDark));
  }
}

/**
 * Fade in the primary content wrapper with a gentle ease-out.
 * Uses WAAPI when available, falling back to a CSS transition.
 */
function fadeInContentLayer(options = {}) {
  const fadeTarget = document.getElementById('app-frame');
  if (!fadeTarget) return Promise.resolve();
  
  const duration = options.duration ?? CONTENT_FADE_DURATION_MS;
  const easing = options.easing ?? CONTENT_FADE_EASING;
  
  return new Promise((resolve) => {
    let finished = false;
    const finalize = () => {
      if (finished) return;
      finished = true;
      try {
        fadeTarget.style.opacity = '1';
        fadeTarget.style.transform = 'translateZ(0)';
        fadeTarget.style.visibility = 'visible';
        fadeTarget.style.willChange = 'auto';
        const blocker = document.getElementById('fade-blocking');
        if (blocker) blocker.remove();
      } catch (e) {}
      resolve();
    };

    fadeTarget.style.visibility = 'visible';
    fadeTarget.style.willChange = 'opacity, transform';

    if (typeof fadeTarget.animate === 'function') {
      const anim = fadeTarget.animate(
        [
          { opacity: 0, transform: 'translateZ(0)' },
          { opacity: 1, transform: 'translateZ(0)' }
        ],
        { duration, easing, fill: 'forwards' }
      );
      anim.addEventListener('finish', finalize);
      anim.addEventListener('cancel', finalize);
    } else {
      fadeTarget.style.transition = `opacity ${duration}ms ${easing}`;
      requestAnimationFrame(() => {
        fadeTarget.style.opacity = '1';
        fadeTarget.style.transform = 'translateZ(0)';
      });
      window.setTimeout(finalize, duration + 50);
    }
  });
}

/**
 * Ensure .noise-2 and .noise-3 elements exist (for dev environments where the full exported HTML isn't present).
 * Creates them as siblings to .noise inside the #bravia-balls container.
 */
function ensureNoiseElements() {
  // Check if we have a noise texture image to use
  const existingNoise = document.querySelector('.noise');
  if (!existingNoise) {
    // No noise system present (minimal dev markup) - skip
    return;
  }

  // Keep noise layers scoped to the simulation container (rounded/inset frame),
  // otherwise `position: fixed` + body-append will blanket the entire viewport.
  const container =
    existingNoise.closest('#bravia-balls') ||
    document.getElementById('bravia-balls') ||
    existingNoise.parentElement ||
    document.body;
  
  const noiseStyle = getComputedStyle(existingNoise);
  const bgImage = (noiseStyle.backgroundImage && noiseStyle.backgroundImage !== 'none') 
    ? noiseStyle.backgroundImage 
    : null;
  
  // Create noise-2 if it doesn't exist
  if (!document.querySelector('.noise-2')) {
    const noise2 = document.createElement('div');
    noise2.className = 'noise-2';
    if (bgImage) noise2.style.backgroundImage = bgImage;

    // Let CSS own positioning/blend/opacity so it stays in sync with config vars.
    container.appendChild(noise2);
    console.log('✓ Created .noise-2 element');
  }
  
  // Create noise-3 if it doesn't exist (on top of noise-2)
  if (!document.querySelector('.noise-3')) {
    const noise3 = document.createElement('div');
    noise3.className = 'noise-3';
    if (bgImage) noise3.style.backgroundImage = bgImage;

    // Let CSS own positioning/blend/opacity so it stays in sync with config vars.
    container.appendChild(noise3);
    console.log('✓ Created .noise-3 element');
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    MAIN LINKS — MOBILE WRAP ENHANCEMENTS                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
// We avoid editing exported HTML directly by enhancing at runtime.
function enhanceFooterLinksForMobile() {
  try {
    const cv = document.getElementById('cv-gate-trigger');
    if (cv && !cv.querySelector('.footer-link-nowrap')) {
      const expected = String(getText('footer.links.cv.text', '') || '').trim();
      const raw = (cv.textContent || '').trim().replace(/\s+/g, ' ');
      const txt = expected || raw;
      // Keep short compound labels together on mobile (e.g. "Bio/CV").
      if (txt && txt.includes('/') && raw === txt) {
        cv.innerHTML = `<span class="footer-link-nowrap">${txt}</span>`;
      }
    }
  } catch (e) {}
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

(async function init() {
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
      const mod = await import('./modules/ui/control-registry.js');
      mod.setApplyVisualCSSVars?.(applyVisualCSSVars);
    } catch (e) {}
  }
  
  try {
    group('BouncyBalls bootstrap');
    mark('bb:start');
    log('🚀 Initializing modular bouncy balls...');
    
    const config = await loadRuntimeConfig();
    initState(config);
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
      if (Number.isFinite(g?.topLogoWidthVw)) {
        root.style.setProperty('--top-logo-width-vw', String(g.topLogoWidthVw));
      }
      if (Number.isFinite(g?.homeMainLinksBelowLogoPx)) {
        root.style.setProperty('--home-main-links-below-logo-px', String(g.homeMainLinksBelowLogoPx));
      }
      if (Number.isFinite(g?.footerNavBarTopVh)) {
        root.style.setProperty('--footer-nav-bar-top', `${g.footerNavBarTopVh}vh`);
        root.style.setProperty('--footer-nav-bar-top-svh', `${g.footerNavBarTopVh}svh`);
        root.style.setProperty('--footer-nav-bar-top-dvh', `${g.footerNavBarTopVh}dvh`);
      }
      if (Number.isFinite(g?.footerNavBarGapVw)) {
        /* Convert vw to clamp() pattern: min scales with vw, max = min * 1.67 (matching --gap-xl ratio) */
        const minPx = Math.round(g.footerNavBarGapVw * 9.6); // ~24px at 2.5vw base
        const maxPx = Math.round(minPx * 1.67); // ~40px at 2.5vw base (maintains ratio)
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
    
    // Ensure noise-2 and noise-3 elements exist (for modular dev environments)
    ensureNoiseElements();

    // Procedural noise texture (no GIF): generates a small texture once and animates via CSS only.
    try {
      initNoiseSystem(getGlobals());
    } catch (e) {}
    
    // Setup canvas (attaches resize listener, but doesn't resize yet)
    setupRenderer();
    const canvas = getCanvas();
    const ctx = getContext();
    const container = document.getElementById('bravia-balls');
    
    if (!canvas || !ctx || !container) {
      throw new Error('Missing DOM elements');
    }

    // Ensure the brand logo renders ABOVE the rounded window background.
    // We now paint the window background on `#bravia-balls` (single rounded surface)
    // to avoid end-of-scale corner snapping. That means the logo must live inside
    // the same stacking context to remain visible while still sitting behind balls.
    try {
      const logo = document.getElementById('brand-logo');
      if (logo && logo.parentElement !== container) {
        container.prepend(logo);
      }
    } catch (e) {}

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

    // Link hover: hide cursor + trail; let hover dot “become” the cursor.
    initLinkCursorHop();

    // Scene micro-interaction: subtle "clicked-in" response on simulation changes
    initSceneImpactReact();
    
    // Load any saved settings
    loadSettings();

    // Palette chapters: rotate on each reload (cursor + ball colors only).
    rotatePaletteChapterOnReload();

    // Initialize sound engine once (no AudioContext yet; unlock requires user gesture)
    initSoundEngine();
    // Apply sound settings from runtime config (so panel + exports round-trip).
    try {
      applySoundConfigFromRuntimeConfig(config);
    } catch (e) {}
    log('✓ Sound engine primed (awaiting user unlock)');

    // Scene change SFX (soothing “pebble-like” tick on mode change)
    initSceneChangeSFX();
    
    // DEV-only: setup configuration panel UI.
    // Production builds must ship without the panel (config is hardcoded during build).
    if (ABS_DEV) {
      try {
        const panelDock = await import('./modules/ui/panel-dock.js');
        panelDock.createPanelDock?.();
        const colors = await import('./modules/visual/colors.js');
        colors.populateColorSelect?.();
      } catch (e) {}
    }
    mark('bb:ui');
    log(ABS_DEV ? '✓ Panel dock created (Sound + Controls)' : '✓ UI initialized (panel disabled in production)');

    // Initialize dark mode AFTER panel creation (theme buttons exist now)
    initializeDarkMode();
    mark('bb:theme');

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

    // Initialize password gates (CV and Portfolio protection)
    try {
      initCVModal();
      log('✓ CV password gate initialized');
    } catch (e) {
      console.warn('CV gate initialization error:', e?.message);
    }

    try {
      initPortfolioModal();
      log('✓ Portfolio password gate initialized');
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

    // Footer: mobile-friendly wrapping tweaks (keeps "Bio/CV" together)
    enhanceFooterLinksForMobile();
    
    // Create quick sound toggle button (bottom-right, next to time)
    createSoundToggle();
    log('✓ Sound toggle button created');
    
    // Create quick theme toggle button (bottom-left)
    createThemeToggle();
    log('✓ Theme toggle button created');
    
    // Layout controls integrated into master panel
    
    // Initialize starting mode (randomized on each reload)
    const startMode = pickStartupMode();
    // Cursor color: auto-pick a new contrasty ball color per simulation load.
    // Must run after theme/palette is initialized (initializeDarkMode → applyColorTemplate).
    maybeAutoPickCursorColor?.('startup');
    setMode(startMode);
    try {
      const ui = await import('./modules/ui/controls.js');
      ui.updateModeButtonsUI?.(startMode);
    } catch (e) {}
    mark('bb:mode');
    log('✓ Mode initialized');
    
    // Register force render callback for resize (prevents blank frames during drag-resize)
    setForceRenderCallback(render);
    
    // NOTE: Scroll FX is portfolio-only (see `source/modules/portfolio/`).

    // Start main render loop
    const getForces = () => getForceApplicator();
    startMainLoop((ball, dt) => {
      const forceFn = getForces();
      if (forceFn) forceFn(ball, dt);
    });
    
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
        console.log('%cCurious mind detected. Design meets engineering at 60fps.', 'color: #888; font-style: italic;');
      } catch (e) {
        // Console completely unavailable
      }
    }
    
    // ╔══════════════════════════════════════════════════════════════════════════════╗
    // ║                    DRAMATIC ENTRANCE ANIMATION                               ║
    // ║        Browser default → wall-state with 3D perspective orchestration        ║
    // ║                                                                              ║
    // ║  Uses unified navigation state to determine if wall animation should play:   ║
    // ║  - Fresh session visit: Full wall grow animation                             ║
    // ║  - Return from portfolio/CV: Quick fade-in only (skip wall animation)        ║
    // ║  - Browser back/forward: Quick fade-in only (skip wall animation)            ║
    // ╚══════════════════════════════════════════════════════════════════════════════╝
    
    try {
      const { orchestrateEntrance, revealAllLateElements } = await import('./modules/visual/entrance-animation.js');
      const { 
        getModalToAutoOpen, 
        shouldSkipWallAnimation, 
        resetTransitionState,
        setupPrefetchOnHover 
      } = await import('./modules/utils/page-nav.js');
      
      const g = getGlobals();
      const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      const elementDuration = g.entranceElementDuration ?? CONTENT_FADE_DURATION_MS;
      const elementEasing = g.entranceElementEasing ?? CONTENT_FADE_EASING;

      // Check navigation state BEFORE consuming it (getModalToAutoOpen reads but doesn't clear)
      const autoOpenModal = getModalToAutoOpen();
      
      // Check if we should skip wall animation (internal nav or browser back/forward)
      // Note: shouldSkipWallAnimation() consumes the navigation state
      const skipWall = shouldSkipWallAnimation();
      
      // Handle bfcache restore (browser back/forward with cached page)
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          resetTransitionState();
          const appFrame = document.getElementById('app-frame');
          if (appFrame) appFrame.style.opacity = '1';
        }
      });
      
      // Setup prefetch on hover for gate triggers
      const cvTrigger = document.getElementById('cv-gate-trigger');
      const portfolioTrigger = document.getElementById('portfolio-gate-trigger');
      if (cvTrigger) setupPrefetchOnHover(cvTrigger, 'cv.html');
      if (portfolioTrigger) setupPrefetchOnHover(portfolioTrigger, 'portfolio.html');

      // Skip entrance animation if disabled or reduced motion preferred
      if (!g.entranceEnabled || reduceMotion) {
        try { await waitForFonts(); } catch (e) {}
        await fadeInContentLayer({ duration: elementDuration, easing: elementEasing });
        // Also reveal late elements (logo + main links) that have inline hidden styles
        revealAllLateElements();
        console.log('✓ Entrance animation skipped (disabled or reduced motion)');
      } else {
        // Orchestrate entrance (wall animation conditional on navigation state)
        await orchestrateEntrance({
          waitForFonts: async () => {
            try {
              await waitForFonts();
            } catch (e) {}
          },
          skipWallAnimation: skipWall
        });
        console.log(skipWall 
          ? '✓ Quick entrance (returning from internal page)' 
          : '✓ Dramatic entrance animation orchestrated');
      }
      
      // Auto-open modal if requested via navigation state
      if (autoOpenModal === 'cv') {
        // CV modal - trigger the gate open
        setTimeout(() => {
          const cvTriggerEl = document.getElementById('cv-gate-trigger');
          if (cvTriggerEl) cvTriggerEl.click();
        }, 400);
      } else if (autoOpenModal === 'contact') {
        // Contact modal - trigger the gate open
        setTimeout(() => {
          const contactTriggerEl = document.getElementById('contact-trigger');
          if (contactTriggerEl) contactTriggerEl.click();
        }, 400);
      }
      
    } catch (e) {
      console.warn('⚠️ Entrance animation failed, falling back to simple fade:', e);
      try { await waitForFonts(); } catch (e) {}
      const g = (() => { try { return getGlobals(); } catch (err) { return {}; } })();
      await fadeInContentLayer({
        duration: g.entranceElementDuration ?? CONTENT_FADE_DURATION_MS,
        easing: g.entranceElementEasing ?? CONTENT_FADE_EASING
      });
      // Fallback: also reveal late elements so nothing stays hidden
      try {
        const { revealAllLateElements } = await import('./modules/visual/entrance-animation.js');
        revealAllLateElements();
      } catch (err) {
        // Manual fallback if module import fails
        // NOTE: Do NOT clear transform - CSS may rely on it for positioning
        // REMOVE inline opacity so CSS controls it (enables modal fade transitions)
        ['main-links', 'brand-logo'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) {
            el.classList.remove('late-hidden', 'late-animating');
            el.classList.add('late-visible');
          }
        });
        const blocker = document.getElementById('fade-blocking');
        if (blocker) blocker.remove();
      }
    }
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    document.body.innerHTML = `<div style="padding: 20px; color: red; background: white;">
      <h2>Initialization Error</h2>
      <pre>${error.message}\n${error.stack}</pre>
    </div>`;
  }
})();
