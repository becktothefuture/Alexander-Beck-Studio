// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               CV PAGE BOOTSTRAP                               ║
// ║     Loads runtime text + shared chrome (dark mode, time, socials, sound)      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { loadRuntimeText } from './utils/text-loader.js';
import { applyRuntimeTextToDOM } from './ui/apply-text.js';
import { initializeDarkMode } from './visual/dark-mode-v2.js';
import { maybeAutoPickCursorColor, rotatePaletteChapterOnReload } from './visual/colors.js';
import { initTimeDisplay } from './ui/time-display.js';
import { upgradeSocialIcons } from './ui/social-icons.js';
import { createSoundToggle } from './ui/sound-toggle.js';
import { waitForFonts } from './utils/font-loader.js';
import { orchestrateEntrance } from './visual/entrance-animation.js';

async function bootstrapCvPage() {
  try {
    await loadRuntimeText();
    applyRuntimeTextToDOM();
  } catch (e) {
    // Non-fatal: continue with defaults.
  }

  // Palette chapters: rotate on each reload (cursor + ball palette vars only).
  rotatePaletteChapterOnReload();
  initializeDarkMode();
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
    } else {
      await orchestrateEntrance({
        waitForFonts: async () => {
          try { await waitForFonts(); } catch (e) {}
        },
        skipWallAnimation: true
      });
    }
  } catch (e) {
    const fadeTarget = document.getElementById('app-frame');
    if (fadeTarget) {
      fadeTarget.style.opacity = '1';
      fadeTarget.style.transform = 'translateZ(0)';
    }
    console.warn('⚠️ CV entrance animation failed, forcing content visible', e);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    LOGO VISIBILITY (NO FADE-IN)                              ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  // Logo is a background element - visible immediately, no fade-in animation
  try {
    const logo = document.getElementById('brand-logo');
    if (!logo) {
      console.warn('⚠️ #brand-logo not found');
    } else {
      // Make logo visible immediately (background element, no fade-in)
      logo.style.opacity = '1';
      console.log('✓ Logo visible immediately (background element, no fade-in)');
    }
  } catch (e) {
    console.warn('⚠️ Logo visibility setup failed:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrapCvPage();
});
