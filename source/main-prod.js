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

function pickStartupMode() {
  return MODES.PIT;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             PAGE FADE-IN (PROD)                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
// Production uses `source/index.html` as a template, which includes a blocking rule:
//   <style id="fade-blocking">#fade-content{opacity:0}</style>
// In dev (`main.js`) and on other pages (portfolio/cv), JS always reveals the content.
// `main-prod.js` previously never did, which makes production look “blank” except for
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

    // Reveal UI content that starts blocked at first paint.
    // Fonts are awaited in the background so copy doesn't “pop”.
    try { await waitForFonts(); } catch (e) {}
    startIndexFadeIn();

    // Start simulation
    const startupMode = pickStartupMode();
    setMode(startupMode);
    startMainLoop();

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

