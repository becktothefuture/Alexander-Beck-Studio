// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               CV PAGE BOOTSTRAP                               ║
// ║     Loads runtime text + shared chrome (dark mode, time, socials, sound)      ║
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
import { orchestrateEntrance } from './visual/entrance-animation.js';
import { applyWallFrameFromConfig, applyWallFrameLayout, syncWallFrameColors } from './visual/wall-frame.js';
import { initNoiseSystem } from './visual/noise-system.js';
import { initPortfolioWallCanvas } from './portfolio/wall-only-canvas.js';
import { initCvScrollTypography } from './cv/cv-scroll-typography.js';
import { initCvPhotoSlideshow } from './cv/cv-photo-slideshow.js';
import { initCvPanel } from './cv/cv-panel.js';

async function bootstrapCvPage() {
  try {
    await loadRuntimeText();
    applyRuntimeTextToDOM();
  } catch (e) {
    // Non-fatal: continue with defaults.
  }

  let runtimeConfig = null;
  try {
    runtimeConfig = await loadRuntimeConfig();
    applyWallFrameFromConfig(runtimeConfig);
    try { initPortfolioWallCanvas({ canvasSelector: '.cv-wall-canvas' }); } catch (e) {}
    try { initNoiseSystem(getGlobals()); } catch (e) {}
    window.addEventListener('resize', applyWallFrameLayout, { passive: true });
  } catch (e) {
    // Safe fallback: keep the page readable if config loading fails.
    try { initNoiseSystem(); } catch (e2) {}
  }

  // Palette chapters: rotate on each reload (cursor + ball palette vars only).
  rotatePaletteChapterOnReload();
  initializeDarkMode();
  // Dark mode init can re-sync CSS vars; ensure runtime config remains the source of truth.
  try { if (runtimeConfig) syncWallFrameColors(runtimeConfig); } catch (e) {}
  maybeAutoPickCursorColor?.('startup');
  initTimeDisplay();
  upgradeSocialIcons();
  createSoundToggle();

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    SHARED ENTRANCE (STATIC WALL)                             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduceMotion) {
      const fadeTarget = document.getElementById('app-frame');
      if (fadeTarget) {
        fadeTarget.style.opacity = '1';
        fadeTarget.style.transform = 'translateZ(0)';
      }
      // Also reveal central content elements
      const cvContainer = document.querySelector('.cv-scroll-container');
      if (cvContainer) {
        cvContainer.style.opacity = '1';
        cvContainer.style.visibility = 'visible';
      }
    } else {
      await orchestrateEntrance({
        waitForFonts: async () => {
          try { await waitForFonts(); } catch (e) {}
        },
        skipWallAnimation: true,
        centralContent: [
          '.cv-scroll-container'
        ]
      });
    }
  } catch (e) {
    const fadeTarget = document.getElementById('app-frame');
    if (fadeTarget) {
      fadeTarget.style.opacity = '1';
      fadeTarget.style.transform = 'translateZ(0)';
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
  // ║                       SCROLL TYPOGRAPHY (CV ONLY)                           ║
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
  // ║                       PHOTO JITTER (CV ONLY)                                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    initCvPhotoSlideshow();
  } catch (e) {
    console.warn('CV photo jitter failed to initialize', e);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                       CONFIG PANEL (CV ONLY)                                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    initCvPanel();
  } catch (e) {
    console.warn('CV config panel failed to initialize', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrapCvPage();
});
