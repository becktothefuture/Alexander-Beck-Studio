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
import { setMode, MODES, getForceApplicator } from './modules/modes/mode-controller.js';
import { startMainLoop } from './modules/rendering/loop.js';
import { loadSettings } from './modules/utils/storage.js';
import { initCVGate } from './modules/ui/cv-gate.js';
import { initPortfolioGate } from './modules/ui/portfolio-gate.js';
import { initContactGate } from './modules/ui/contact-gate.js';
import { initGateOverlay } from './modules/ui/gate-overlay.js';
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

// ════════════════════════════════════════════════════════════════════════════════
// PAGE FADE-IN (PRODUCTION)
// ════════════════════════════════════════════════════════════════════════════════
// The HTML template starts with `#app-frame { opacity: 0 }` (see `source/index.html`).
// In dev (`source/main.js`) this is released as part of the entrance animation pipeline.
// Production must also release it, otherwise the page looks "blank" except for elements
// outside `#app-frame` (e.g. fixed footer links).
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

  if (config.noiseSizeBase !== undefined) {
    root.style.setProperty('--noise-size-base', `${config.noiseSizeBase}px`);
  }
  if (config.noiseSizeTop !== undefined) {
    root.style.setProperty('--noise-size-top', `${config.noiseSizeTop}px`);
  }

  if (config.noiseBackOpacity !== undefined) {
    root.style.setProperty('--noise-back-opacity', String(config.noiseBackOpacity));
    root.style.setProperty('--noise-back-opacity-light', String(config.noiseBackOpacity));
  }
  if (config.noiseFrontOpacity !== undefined) {
    root.style.setProperty('--noise-front-opacity', String(config.noiseFrontOpacity));
    root.style.setProperty('--noise-front-opacity-light', String(config.noiseFrontOpacity));
  }

  if (config.noiseBackOpacityDark !== undefined) {
    root.style.setProperty('--noise-back-opacity-dark', String(config.noiseBackOpacityDark));
  }
  if (config.noiseFrontOpacityDark !== undefined) {
    root.style.setProperty('--noise-front-opacity-dark', String(config.noiseFrontOpacityDark));
  }
}

function ensureNoiseElements() {
  const existingNoise = document.querySelector('.noise');
  if (!existingNoise) return;

  const container =
    existingNoise.closest('#bravia-balls') ||
    document.getElementById('bravia-balls') ||
    existingNoise.parentElement ||
    document.body;

  const noiseStyle = getComputedStyle(existingNoise);
  const bgImage = (noiseStyle.backgroundImage && noiseStyle.backgroundImage !== 'none')
    ? noiseStyle.backgroundImage
    : null;

  if (!document.querySelector('.noise-2')) {
    const noise2 = document.createElement('div');
    noise2.className = 'noise-2';
    if (bgImage) noise2.style.backgroundImage = bgImage;
    container.appendChild(noise2);
  }

  if (!document.querySelector('.noise-3')) {
    const noise3 = document.createElement('div');
    noise3.className = 'noise-3';
    if (bgImage) noise3.style.backgroundImage = bgImage;
    container.appendChild(noise3);
  }
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

    // Visual system
    try {
      applyColorTemplate();
      maybeAutoPickCursorColor();
    } catch (e) {}

    ensureNoiseElements();
    initNoiseSystem(config);

    // Renderer + canvas boot
    setupRenderer();
    setCanvas(getCanvas());
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

    initGateOverlay(config);
    initCVGate();
    initPortfolioGate();
    initContactGate();

    upgradeSocialIcons();
    initTimeDisplay();
    enhanceFooterLinksForMobile();

    createSoundToggle();
    createThemeToggle();

    // Start simulation
    const startupMode = pickStartupMode();
    setMode(startupMode);
    startMainLoop();

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
