// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                 BOUNCY BALLS – MAIN ENTRY (PRODUCTION BUILD)                 ║
// ║         No config panel is shipped; config is hardcoded at build-time         ║
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
import { setMode, MODES, getForceApplicator, initModeSystem } from './modules/modes/mode-controller.js';
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
import { initLinkCursorHop } from './modules/ui/link-cursor-hop.js';
import { initSceneImpactReact } from './modules/ui/scene-impact-react.js';
import { initSceneChangeSFX } from './modules/ui/scene-change-sfx.js';
import { loadRuntimeText } from './modules/utils/text-loader.js';
import { applyRuntimeTextToDOM } from './modules/ui/apply-text.js';
import { loadRuntimeConfig } from './modules/utils/runtime-config.js';
import { waitForFonts } from './modules/utils/font-loader.js';
import { readTokenVar } from './modules/utils/tokens.js';
import {
  initConsolePolicy,
  printConsoleBanner,
  group,
  groupEnd,
  log,
  mark,
  measure,
  table
} from './modules/utils/logger.js';

const CONTENT_FADE_DURATION_MS = 800;
const CONTENT_FADE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

function pickStartupMode() {
  return MODES.PIT;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             PAGE FADE-IN (PROD)                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
// Production uses `source/index.html` as a template, which includes a blocking rule:
//   <style id="fade-blocking">#fade-content{opacity:0}</style>
// In dev (`main.js`) and on other pages (portfolio/cv), JS always reveals the content.
// `main-prod.js` previously never did, which makes production look "blank" except for
// the footer buttons that live outside `#fade-content`.
function startIndexFadeIn() {
  const FADE_DELAY_MS = 400;
  const FADE_DURATION_MS = 260;
  const FADE_EASING = readTokenVar('--ease-fade', 'cubic-bezier(0.16, 1, 0.3, 1)');
  const FADE_FAILSAFE_MS = FADE_DELAY_MS + FADE_DURATION_MS + 750;

  const forceFadeVisible = (fadeEl, reason) => {
    fadeEl.style.opacity = '1';
    fadeEl.style.transform = 'translateZ(0)';
    console.warn(`⚠️ Fade failsafe: forcing #fade-content visible (${reason})`);
  };

  window.setTimeout(() => {
    const fadeContent = document.getElementById('fade-content');
    if (!fadeContent) {
      console.warn('⚠️ #fade-content not found (fade skipped)');
      return;
    }

    // Accessibility: respect reduced motion by skipping animation entirely.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      fadeContent.style.opacity = '1';
      fadeContent.style.transform = 'translateZ(0)';
      return;
    }

    // If WAAPI is missing, fall back to inline style.
    if (typeof fadeContent.animate !== 'function') {
      forceFadeVisible(fadeContent, 'WAAPI unsupported');
      return;
    }

    const anim = fadeContent.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: FADE_DURATION_MS, easing: FADE_EASING, fill: 'forwards' }
    );

    // Stamp final opacity so it can't get stuck hidden.
    anim?.addEventListener?.('finish', () => {
      fadeContent.style.opacity = '1';
      fadeContent.style.transform = 'translateZ(0)';
    });

    anim?.addEventListener?.('cancel', () => {
      forceFadeVisible(fadeContent, 'animation canceled');
    });

    // Ultimate failsafe: never allow permanent hidden UI.
    window.setTimeout(() => {
      const opacity = window.getComputedStyle(fadeContent).opacity;
      if (opacity === '0') forceFadeVisible(fadeContent, 'opacity still 0 after failsafe window');
    }, FADE_FAILSAFE_MS);
  }, FADE_DELAY_MS);
}

// ════════════════════════════════════════════════════════════════════════════════
// APP-FRAME FADE-IN (PRODUCTION)
// ════════════════════════════════════════════════════════════════════════════════
// The HTML template starts with `#app-frame { opacity: 0 }` (see `source/index.html`).
// In dev (`source/main.js`) this is released as part of the entrance animation pipeline.
// Production must also release it, otherwise the page looks "blank" except for elements
// outside `#app-frame` (e.g. fixed main links).
function fadeInContentLayer(options = {}) {
  const fadeTarget = document.getElementById('app-frame');
  if (!fadeTarget) return Promise.resolve();

  const duration = options.duration ?? CONTENT_FADE_DURATION_MS;
  const easing = options.easing ?? CONTENT_FADE_EASING;
  const externalFinalize = typeof options.finalize === 'function' ? options.finalize : null;

  return new Promise((resolve) => {
    let finished = false;
    const finalize = () => {
      if (finished) return;
      finished = true;
      if (externalFinalize) {
        try { externalFinalize(); } catch (e) {}
      } else {
        try {
          fadeTarget.style.opacity = '1';
          fadeTarget.style.transform = 'translateZ(0)';
          fadeTarget.style.visibility = 'visible';
          fadeTarget.style.willChange = 'auto';
          const blocker = document.getElementById('fade-blocking');
          if (blocker) blocker.remove();
        } catch (e) {}
      }
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

async function revealFadeContentWithFailsafe() {
  const fadeTarget = document.getElementById('app-frame');
  if (!fadeTarget) return;

  const g = (() => { try { return getGlobals(); } catch (e) { return {}; } })();
  const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const elementDuration = g?.entranceElementDuration ?? CONTENT_FADE_DURATION_MS;
  const elementEasing = g?.entranceElementEasing ?? CONTENT_FADE_EASING;

  let finalized = false;
  const finalize = () => {
    if (finalized) return;
    finalized = true;
    try {
      fadeTarget.style.opacity = '1';
      fadeTarget.style.transform = 'translateZ(0)';
      fadeTarget.style.visibility = 'visible';
      fadeTarget.style.willChange = 'auto';
      const blocker = document.getElementById('fade-blocking');
      if (blocker) blocker.remove();
    } catch (e) {}
  };

  // Failsafe: never allow a stuck hidden page.
  const watchdog = window.setTimeout(finalize, Math.max(2500, elementDuration + 200));
  let settleTimer = null;

  try {
    // Prefer no "pop-in": wait for fonts, but don't let it stall the reveal.
    try { await waitForFonts(); } catch (e) {}

    // Optional: run the same entrance orchestration as dev when enabled.
    if (g?.entranceEnabled && !reduceMotion) {
      try {
        const { orchestrateEntrance } = await import('./modules/visual/entrance-animation.js');
        await orchestrateEntrance({
          waitForFonts: async () => {
            try { await waitForFonts(); } catch (e) {}
          }
        });
        const wallDelay = g?.entranceWallTransitionDelay ?? 300;
        const wallDuration = g?.entranceWallTransitionDuration ?? 800;
        const elementDelay = wallDelay + (wallDuration * 0.3);
        settleTimer = window.setTimeout(finalize, elementDelay + elementDuration + 50);
      } catch (e) {
        await fadeInContentLayer({
          duration: elementDuration,
          easing: elementEasing,
          finalize
        });
      }
    } else {
      await fadeInContentLayer({
        duration: elementDuration,
        easing: elementEasing,
        finalize
      });
    }
  } finally {
    window.clearTimeout(watchdog);
    if (!finalized) {
      if (!settleTimer) {
        window.setTimeout(finalize, 0);
      }
    }
  }
}

/**
 * Apply two-level padding CSS variables from global state to :root
 */
export function applyFramePaddingCSSVars() {
  applyLayoutCSSVars();
}

/**
 * Apply visual CSS variables (noise opacity/size, walls) from config to :root
 */
export function applyVisualCSSVars(config) {
  const root = document.documentElement;

  if (config.topLogoWidthVw !== undefined) {
    root.style.setProperty('--top-logo-width-vw', String(config.topLogoWidthVw));
  }

  if (config.noiseSize !== undefined) {
    root.style.setProperty('--noise-size', `${config.noiseSize}px`);
  }

  if (config.noiseOpacityLight !== undefined) {
    root.style.setProperty('--noise-opacity-light', String(config.noiseOpacityLight));
  }
  if (config.noiseOpacityDark !== undefined) {
    root.style.setProperty('--noise-opacity-dark', String(config.noiseOpacityDark));
  }

if (config.noiseBlendModeLight !== undefined) {
    root.style.setProperty('--noise-blend-mode-light', String(config.noiseBlendModeLight));
  }
  if (config.noiseBlendModeDark !== undefined) {
    root.style.setProperty('--noise-blend-mode-dark', String(config.noiseBlendModeDark));
  }

  if (config.noiseColorLight !== undefined) {
    root.style.setProperty('--noise-color-light', String(config.noiseColorLight));
  }
  if (config.noiseColorDark !== undefined) {
    root.style.setProperty('--noise-color-dark', String(config.noiseColorDark));
  }
}

function ensureNoiseElements() {
  const existingNoise = document.querySelector('.noise');
  if (!existingNoise) return;
}

function enhanceFooterLinksForMobile() {
  try {
    const cv = document.getElementById('cv-gate-trigger');
    if (cv && !cv.querySelector('.footer-link-nowrap')) {
      // Minimal: keep the existing DOM text together if it includes a slash.
      const raw = (cv.textContent || '').trim().replace(/\s+/g, ' ');
      if (raw && raw.includes('/')) {
        cv.innerHTML = `<span class="footer-link-nowrap">${raw}</span>`;
      }
    }
  } catch (e) {}
}

(async function init() {
  // Production bundle: never ship config panel tooling.
  const ABS_DEV = false;

  document.documentElement.classList.add('js-enabled');

  try {
    await loadRuntimeText();
    applyRuntimeTextToDOM();
  } catch (e) {}

  try {
    group('BouncyBalls bootstrap');
    mark('bb:start');

    const config = await loadRuntimeConfig();
    initState(config);
    mark('bb:config');

    applyFramePaddingCSSVars();
    mark('bb:layout');
    applyVisualCSSVars(config);

    // Apply config-driven UI CSS variables (layout + interactions)
    try {
      const globals = getGlobals();
      const root = document.documentElement;
      if (Number.isFinite(globals?.topLogoWidthVw)) {
        root.style.setProperty('--top-logo-width-vw', String(globals.topLogoWidthVw));
      }
      if (Number.isFinite(globals?.homeMainLinksBelowLogoPx)) {
        root.style.setProperty('--home-main-links-below-logo-px', String(globals.homeMainLinksBelowLogoPx));
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
        root.style.setProperty('--link-text-padding', `${Math.round(globals.linkTextPadding)}px`);
        root.style.setProperty('--link-text-margin', `${-Math.round(globals.linkTextPadding)}px`);
      }
      if (Number.isFinite(globals?.linkIconPadding)) {
        root.style.setProperty('--link-icon-padding', `${Math.round(globals.linkIconPadding)}px`);
        root.style.setProperty('--link-icon-margin', `${-Math.round(globals.linkIconPadding)}px`);
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
    } catch (e) {}

    // Visual system
    try {
      applyColorTemplate();
      maybeAutoPickCursorColor();
    } catch (e) {}

    ensureNoiseElements();
    initNoiseSystem(config);

    // Renderer + canvas boot
    setupRenderer();
    const canvas = getCanvas();
    const ctx = getContext();
    const container = document.getElementById('bravia-balls');

    if (!canvas || !ctx || !container) {
      throw new Error('Missing DOM elements');
    }

    try {
      const logo = document.getElementById('brand-logo');
      if (logo && logo.parentElement !== container) {
        container.prepend(logo);
      }
    } catch (e) {}

    try {
      canvas.setAttribute('role', 'application');
      if (!canvas.getAttribute('aria-label')) {
        canvas.setAttribute('aria-label', 'Interactive bouncy balls physics simulation');
      }
    } catch (e) {}

    setCanvas(canvas, ctx, container);
    setForceRenderCallback(render);
    resize();
    mark('bb:renderer');

    // Expose key globals for safety/testing parity
    const globals = getGlobals();
    globals.mouseInCanvas = false;
    if (typeof window !== 'undefined') window.mouseInCanvas = false;

    setupPointer();
    setupOverscrollLock();
    setupCustomCursor();
    initLinkCursorHop();

    initSceneImpactReact();
    loadSettings();
    rotatePaletteChapterOnReload();

    initSoundEngine();
    try { applySoundConfigFromRuntimeConfig(config); } catch (e) {}
    initSceneChangeSFX();

    mark('bb:ui');
    log('✓ UI initialized (panel stripped from production build)');

    // Theme after UI nodes exist
    initializeDarkMode();
    mark('bb:theme');

    applyExpertiseLegendColors();
    setupKeyboardShortcuts();

    initModalOverlay(config);
    initCVModal();
    initPortfolioModal();
    initContactModal();

    upgradeSocialIcons();
    initTimeDisplay();
    enhanceFooterLinksForMobile();

    createSoundToggle();
    createThemeToggle();

    // Reveal UI content that starts blocked at first paint.
    // Fonts are awaited in the background so copy doesn't “pop”.
    try { await waitForFonts(); } catch (e) {}
    startIndexFadeIn();

    // Start simulation
    initModeSystem();
    const startupMode = pickStartupMode();
    await setMode(startupMode);
    
    // Apply mode-specific forces to each ball during physics step
    const getForces = () => getForceApplicator();
    startMainLoop((ball, dt) => {
      const forceFn = getForces();
      if (forceFn) forceFn(ball, dt);
    });

    // Release initial `#app-frame` opacity lock in production (with failsafe)
    // so the UI layer can't get stuck hidden.
    try { await revealFadeContentWithFailsafe(); } catch (e) {}

    // Console policy (production)
    initConsolePolicy();
    try { printConsoleBanner(readTokenVar('--panel-brand', '#f59e0b')); } catch (e) {}

    measure('bb:total', 'bb:start', 'bb:theme');
    groupEnd();

    // Keep the existing structured table output minimal in production
    try { table([{ mode: startupMode, panel: 'removed' }]); } catch (e) {}
  } catch (e) {
    try { groupEnd(); } catch (err) {}
    // Keep errors visible in production.
    console.error(e);
  }
})();
