/* Alexander Beck Studio | 2026-01-27 */
import { i as isDev, r as resetCurrentMode, N as NARRATIVE_MODE_SEQUENCE, s as setMode, g as getGlobals, M as MODES, a as getState, b as NARRATIVE_QUOTES, p as playCollisionSound, l as loadRuntimeText, c as applyRuntimeTextToDOM, d as group, m as mark, e as log, f as loadRuntimeConfig, h as initState, j as applyLayoutCSSVars, k as initNoiseSystem, n as setupRenderer, o as getCanvas, q as setCanvas, t as resize, u as setupPointer, v as setupCustomCursor, w as initLinkCursorHop, x as initSceneImpactReact, y as loadSettings, z as rotatePaletteChapterOnReload, A as initSoundEngine, B as applySoundConfigFromRuntimeConfig, C as initializeDarkMode, D as initModalOverlay, E as initCVModal, F as initPortfolioModal, G as initContactModal, H as upgradeSocialIcons, I as initTimeDisplay, J as createSoundToggle, K as maybeAutoPickCursorColor, L as startMainLoop, O as measure, P as table, Q as groupEnd, R as printConsoleBanner, S as initConsolePolicy, T as waitForFonts, U as getContext, V as getText, W as FEATURED_MODES, X as setForceRenderCallback, Y as getForceApplicator, Z as render } from './shared.js';
import { updateModeButtonsUI } from './controls.js';
import { applyExpertiseLegendColors } from './legend-colors.js';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                KEYBOARD INPUT                                ║
// ║              Panel dock toggle and mode switching (1-9)                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


let isKeyboardWired = false;

function navigateNarrative(delta) {
  const g = getGlobals();
  const mode = g?.currentMode || MODES.PIT;
  const seq = NARRATIVE_MODE_SEQUENCE;
  if (!seq || !seq.length) return;
  const idx = seq.indexOf(mode);
  const base = (idx >= 0) ? idx : 0;
  const next = (base + delta + seq.length) % seq.length;
  const nextMode = seq[next];
  setMode(nextMode);
  updateModeButtonsUI(nextMode);
}

function setupKeyboardShortcuts() {
  if (isKeyboardWired) return;
  isKeyboardWired = true;

  window.addEventListener('keydown', (e) => {
    // Skip if typing in an input
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    
    const k = e.key.toLowerCase();
    
    // Toggle dock with /
    if (k === '/' || e.code === 'Slash') {
      e.preventDefault();
      // DEV-ONLY: The config panel is a dev tool and must never ship/appear in production.
      // Avoid a static import so Rollup can drop panel-dock from production bundles.
      if (!isDev()) return;
      import('./panel-dock.js')
        .then((mod) => {
          try { mod.toggleDock?.(); } catch (err) {}
        })
        .catch(() => {});
      return;
    }

    // Reset current simulation with R
    if (k === 'r') {
      e.preventDefault();
      resetCurrentMode();
      try {
        const g = getGlobals();
        updateModeButtonsUI(g.currentMode);
      } catch (e) {}
      return;
    }

    // Narrative navigation
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateNarrative(1);
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateNarrative(-1);
      return;
    }
    // Direct simulation key mappings are intentionally disabled.
    // Switch simulations using:
    // - ArrowLeft / ArrowRight (narrative sequence)
    // - Right-click (previous simulation)
    // - Panel mode buttons
  });

  // Right-click navigation: go to previous simulation
  window.addEventListener('contextmenu', (e) => {
    // Only prevent default and navigate if not on an interactive element
    const target = e.target;
    const isInteractive = target.tagName === 'A' || 
                          target.tagName === 'BUTTON' || 
                          target.closest('a') || 
                          target.closest('button') ||
                          target.closest('.panel') ||
                          target.id === 'panelDock' ||
                          target.id === 'masterPanel' ||
                          target.id === 'dockToggle';
    
    if (!isInteractive) {
      e.preventDefault();
      navigateNarrative(-1); // Go to previous simulation
    }
  });
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      OVERSCROLL LOCK (iOS RUBBER-BAND FIX)                   ║
// ║   Prevents page rubber-banding / scroll bounce while allowing internal       ║
// ║   scrolling for UI containers (gates + panel).                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * iOS Safari can still rubber-band even when body is overflow:hidden, especially
 * during touchmove gestures. This installs a capture-phase touchmove listener
 * (passive:false) that blocks scrolling unless the gesture originates inside a
 * whitelisted scroll container.
 *
 * IMPORTANT:
 * - We only preventDefault on touchmove, not touchstart, so taps/clicks still work.
 * - We allow scrolling only inside dedicated scroll containers (panel). Gates are NOT scrollable.
 */
function setupOverscrollLock() {
  if (typeof document === 'undefined') return;

  const isAllowedScrollTarget = (target) => {
    if (!(target instanceof Element)) return false;

    // Allow scroll inside the panel content (dock + legacy panel)
    if (target.closest('.panel-dock .panel .panel-content')) return true;
    if (target.closest('#controlPanel')) return true;

    return false;
  };

  document.addEventListener('touchmove', (e) => {
    // If a scrollable UI wants the gesture, let it through.
    if (isAllowedScrollTarget(e.target)) return;

    // Otherwise: lock the page in place (no rubber-banding / bounce).
    // Note: must be passive:false for iOS.
    e.preventDefault();
  }, { passive: false, capture: true });
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       QUOTE DISPLAY COMPONENT                                 ║
// ║   Displays curated quotes from thinkers/creatives based on current mode       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


let quoteContainer = null;
let contentWrapper = null;
let quoteTextEl = null;
let quoteAuthorEl = null;
let isAnimating = false;

// Animation timing (matches CSS)
const ANIM_DURATION = 320;

/**
 * Creates the quote display DOM structure and appends it to the page.
 * Positioned above the bottom-right meta area (London · time button).
 */
function createQuoteElement() {
  // Check if already created
  if (document.getElementById('quote-display')) {
    return document.getElementById('quote-display');
  }

  // Create container
  quoteContainer = document.createElement('div');
  quoteContainer.id = 'quote-display';
  quoteContainer.className = 'quote-display';
  quoteContainer.setAttribute('aria-live', 'polite');
  quoteContainer.setAttribute('aria-atomic', 'true');

  // Create content wrapper for animations
  contentWrapper = document.createElement('div');
  contentWrapper.className = 'quote-display__content quote-display__content--entering';

  // Create quote text element
  quoteTextEl = document.createElement('p');
  quoteTextEl.className = 'quote-display__text';

  // Create author element
  quoteAuthorEl = document.createElement('p');
  quoteAuthorEl.className = 'quote-display__author';

  // Assemble
  contentWrapper.appendChild(quoteTextEl);
  contentWrapper.appendChild(quoteAuthorEl);
  quoteContainer.appendChild(contentWrapper);

  // Find the target parent (ui-meta-right or corner-dock--br)
  const metaRight = document.querySelector('.ui-meta-right');
  if (metaRight) {
    // Insert before the meta-right element's first child
    metaRight.insertBefore(quoteContainer, metaRight.firstChild);
  } else {
    // Fallback: append to body with absolute positioning
    document.body.appendChild(quoteContainer);
  }

  return quoteContainer;
}

/**
 * Updates the quote display with the current mode's quote.
 * Includes subtle enter/exit animation.
 * @param {string} [mode] - Optional mode override; uses state.currentMode if not provided
 * @param {boolean} [animate=true] - Whether to animate the transition
 */
function updateQuote(mode, animate = true) {
  if (!quoteContainer || !contentWrapper) return;

  const currentMode = mode || getState().currentMode;
  const quoteData = NARRATIVE_QUOTES[currentMode];

  if (!quoteData) {
    // No quote for this mode - hide the container
    quoteContainer.classList.add('quote-display--hidden');
    return;
  }

  quoteContainer.classList.remove('quote-display--hidden');

  // Skip animation for initial load or if already animating
  if (!animate || isAnimating) {
    quoteTextEl.textContent = quoteData.quote;
    quoteAuthorEl.textContent = quoteData.author;
    contentWrapper.classList.remove('quote-display__content--entering', 'quote-display__content--exiting');
    return;
  }

  // Animate out → update → animate in
  isAnimating = true;
  contentWrapper.classList.add('quote-display__content--exiting');

  setTimeout(() => {
    // Update content while hidden
    quoteTextEl.textContent = quoteData.quote;
    quoteAuthorEl.textContent = quoteData.author;

    // Switch to entering state
    contentWrapper.classList.remove('quote-display__content--exiting');
    contentWrapper.classList.add('quote-display__content--entering');

    // Animate in
    contentWrapper.classList.remove('quote-display__content--entering');

    setTimeout(() => {
      isAnimating = false;
    }, ANIM_DURATION);
  }, ANIM_DURATION);
}

/**
 * Initializes the quote display component.
 * Creates DOM elements and sets up mode change listener.
 */
function initQuoteDisplay() {
  // Create the quote element
  createQuoteElement();

  // Set initial quote based on current mode (no animation)
  const state = getState();
  if (state.currentMode) {
    updateQuote(state.currentMode, false);
    // Trigger enter animation after a brief delay
    requestAnimationFrame(() => {
      contentWrapper?.classList.remove('quote-display__content--entering');
    });
  }

  // Listen for mode changes (with animation)
  window.addEventListener('bb:modeChanged', (e) => {
    const newMode = e.detail?.mode;
    if (newMode) {
      updateQuote(newMode, true);
    }
  });
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           LEGEND TOOLTIP SYSTEM                              ║
// ║  Purpose:                                                                   ║
// ║  - Provide hover tooltips (writes to #legend-tooltip-output)                 ║
// ║  - Expose a no-op `window.legendFilter.syncAllBalls()` for backwards compat  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Initialize legend tooltip system.
 *
 * Notes:
 * - This runs once at startup.
 * - It is safe in production: no panel dependencies, no dev-only behavior.
 * - Hover shows tooltip; click/keyboard filtering has been removed.
 */
function initLegendFilterSystem() {
  // Expose no-op sync hook for backwards compatibility with mode-controller.
  try {
    if (typeof window !== 'undefined') {
      if (!window.legendFilter) window.legendFilter = {};
      window.legendFilter.syncAllBalls = () => {}; // No-op (filtering removed)
    }
  } catch (e) {}

  // Attach tooltip behavior.
  try {
    const legend = document.getElementById('expertise-legend');
    const tooltipOutput = document.getElementById('legend-tooltip-output');
    if (!legend) return;

    const legendItems = Array.from(legend.querySelectorAll('.legend__item'));

    for (const item of legendItems) {
      if (!item) continue;

      // Add class for CSS hover effects (not clickable)
      item.classList.add('legend__item--interactive');

      // Tooltip output: hover only (doesn't allocate in hot paths).
      if (tooltipOutput) {
        item.addEventListener('mouseenter', () => {
          const tooltipText = item.getAttribute('data-tooltip');
          if (!tooltipText) return;
          tooltipOutput.textContent = tooltipText;
          tooltipOutput.style.opacity = '1';
          tooltipOutput.style.visibility = 'visible';
        });

        item.addEventListener('mouseleave', () => {
          tooltipOutput.style.opacity = '0';
          window.setTimeout(() => {
            if (tooltipOutput.style.opacity === '0') {
              tooltipOutput.style.visibility = 'hidden';
            }
          }, 50);
        });
      }
    }

    if (tooltipOutput) {
      tooltipOutput.style.visibility = 'hidden';
      tooltipOutput.style.opacity = '0';
    }
  } catch (e) {
    // Never allow legend setup to crash boot.
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         SCENE CHANGE SOUND (SFX)                             ║
// ║      Soft “pebble-like” tick on simulation change (bb:modeChanged event)     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


let enabled = false;

function initSceneChangeSFX() {
  if (typeof window === 'undefined') return;
  if (enabled) return;
  enabled = true;

  window.addEventListener('bb:modeChanged', (e) => {
    const g = getGlobals();
    if (g?.sceneChangeSoundEnabled === false) return;

    const detail = e?.detail || {};
    const didChange = detail.prevMode && detail.mode && detail.prevMode !== detail.mode;
    if (!didChange) return;

    // “Pebble-like” = small radius, moderate intensity, centered pan.
    const radius = Number(g?.sceneChangeSoundRadius ?? 18);
    const intensity = Number(g?.sceneChangeSoundIntensity ?? 0.35);
    playCollisionSound(radius, intensity, 0.5, null);
  }, { passive: true });
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      BOUNCY BALLS – MAIN ENTRY (COMPLETE)                    ║
// ║                       Modular Architecture Bootstrap                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const CONTENT_FADE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

function pickStartupMode() {
  // Random mode from FEATURED tier only (ensures visitors always see best work first)
  return FEATURED_MODES[Math.floor(Math.random() * FEATURED_MODES.length)];
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
function applyFramePaddingCSSVars() {
  // Back-compat export: this project previously applied only frame padding here.
  // Layout is now vw-native in config/state, with px derived and stamped centrally.
  applyLayoutCSSVars();
}

/**
 * Apply visual CSS variables (noise opacity/size, walls) from config to :root
 */
function applyVisualCSSVars(config) {
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
  
  // Noise blend mode
  if (config.noiseBlendMode !== undefined) {
    root.style.setProperty('--noise-blend-mode', String(config.noiseBlendMode));
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
 * Fade in all content (abs-scene) with a gentle ease-out.
 * Uses WAAPI when available, falling back to a CSS transition.
 * Excludes background/wall color (which remains visible throughout).
 * abs-scene contains: canvas (#bravia-balls), UI (#app-frame), logo, edges, etc.
 */
function fadeInContentLayer(options = {}) {
  const fadeTarget = document.getElementById('abs-scene');
  if (!fadeTarget) return Promise.resolve();
  
  // Get config values from globals (with fallbacks)
  const g = getGlobals();
  const delay = options.delay ?? g?.contentFadeInDelay ?? 500;
  const duration = options.duration ?? g?.contentFadeInDuration ?? 1000;
  const easing = options.easing ?? CONTENT_FADE_EASING;
  
  return new Promise((resolve) => {
    let finished = false;
    const finalize = () => {
      if (finished) return;
      finished = true;
      try {
        fadeTarget.style.opacity = '1';
        fadeTarget.style.visibility = 'visible';
        fadeTarget.style.willChange = 'auto';
        const blocker = document.getElementById('fade-blocking');
        if (blocker) blocker.remove();
      } catch (e) {}
      resolve();
    };

    const startAnimation = () => {
      // Remove fade-blocking style tag BEFORE starting animation to avoid conflicts
      const blocker = document.getElementById('fade-blocking');
      if (blocker) blocker.remove();
      
      fadeTarget.style.visibility = 'visible';
      fadeTarget.style.willChange = 'opacity';
      // Ensure initial opacity is 0 for animation
      fadeTarget.style.opacity = '0';

      if (typeof fadeTarget.animate === 'function') {
        const anim = fadeTarget.animate(
          [
            { opacity: 0 },
            { opacity: 1 }
          ],
          { duration, easing, fill: 'forwards' }
        );
        anim.addEventListener('finish', finalize);
        anim.addEventListener('cancel', finalize);
      } else {
        fadeTarget.style.transition = `opacity ${duration}ms ${easing}`;
        requestAnimationFrame(() => {
          fadeTarget.style.opacity = '1';
        });
        window.setTimeout(finalize, duration + 50);
      }
    };

    // Apply delay before starting animation
    if (delay > 0) {
      setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }
  });
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
  {
    try {
      const mod = await import('./shared.js').then(function (n) { return n.aM; });
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
    
    // Ensure base noise element exists (for modular dev environments)
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
    {
      try {
        const panelDock = await import('./panel-dock.js');
        panelDock.createPanelDock?.();
        const colors = await import('./shared.js').then(function (n) { return n.aK; });
        colors.populateColorSelect?.();
      } catch (e) {}
    }
    mark('bb:ui');
    log('✓ Panel dock created (Sound + Controls)' );

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
    log('✓ Theme toggle button created');
    
    // Layout controls integrated into master panel
    
    // Initialize starting mode (randomized on each reload)
    const startMode = pickStartupMode();
    // Cursor color: auto-pick a new contrasty ball color per simulation load.
    // Must run after theme/palette is initialized (initializeDarkMode → applyColorTemplate).
    maybeAutoPickCursorColor?.('startup');
    setMode(startMode);
    try {
      const ui = await import('./controls.js');
      ui.updateModeButtonsUI?.(startMode);
    } catch (e) {}
    mark('bb:mode');
    log('✓ Mode initialized');
    
    // Initialize quote display (shows curated quotes based on current mode)
    initQuoteDisplay();
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
      const { orchestrateEntrance, revealAllLateElements } = await import('./shared.js').then(function (n) { return n.aO; });
      const { 
        getModalToAutoOpen, 
        shouldSkipWallAnimation, 
        resetTransitionState,
        setupPrefetchOnHover,
        initSpeculativePrefetch,
        didViewTransitionRun
      } = await import('./shared.js').then(function (n) { return n.aN; });
      
      const g = getGlobals();
      const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      // Check navigation state BEFORE consuming it (getModalToAutoOpen reads but doesn't clear)
      const autoOpenModal = getModalToAutoOpen();
      
      // Check if we should skip wall animation (internal nav or browser back/forward)
      // Note: shouldSkipWallAnimation() consumes the navigation state
      const skipWall = shouldSkipWallAnimation();
      
      // Check if View Transition just ran (Chrome) - skip entrance animation entirely
      const skipEntrance = didViewTransitionRun();
      
      // Handle bfcache restore (browser back/forward with cached page)
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          resetTransitionState();
          const absScene = document.getElementById('abs-scene');
          if (absScene) absScene.style.opacity = '1';
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
        // Use config values for content fade-in (delay + duration)
        await fadeInContentLayer();
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
          skipWallAnimation: skipWall,
          skipEntranceAnimation: skipEntrance
        });
        console.log(skipEntrance 
          ? '✓ Entrance skipped (View Transition handled it)'
          : skipWall 
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
      
      // Initialize speculative prefetch system for faster page transitions
      initSpeculativePrefetch();
      
    } catch (e) {
      console.warn('⚠️ Entrance animation failed, falling back to simple fade:', e);
      try { await waitForFonts(); } catch (e) {}
      // Use config values for content fade-in (delay + duration)
      await fadeInContentLayer();
      // Fallback: also reveal late elements so nothing stays hidden
      try {
        const { revealAllLateElements } = await import('./shared.js').then(function (n) { return n.aO; });
        revealAllLateElements();
      } catch (err) {
        // Manual fallback if module import fails
        // NOTE: Do NOT clear transform - CSS may rely on it for positioning
        // REMOVE inline opacity so CSS controls it (enables modal fade transitions)
        ['main-links', 'brand-logo'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) {
            el.style.removeProperty('opacity');
            if (id === 'brand-logo') {
              el.style.removeProperty('filter');
            }
            el.style.visibility = 'visible';
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

export { applyFramePaddingCSSVars, applyVisualCSSVars };
//# sourceMappingURL=app.js.map
