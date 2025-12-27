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
import { readTokenVar } from './utils/tokens.js';

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
  // ║                             PAGE FADE-IN (INDEX PARITY)                     ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  // Match the index page fade-in behavior: #fade-content starts at opacity:0
  // (via <style id="fade-blocking">) and is animated to 1 with WAAPI + failsafes.

  try {
    await waitForFonts();
  } catch (e) {}

  try {
    const FADE_DELAY_MS = 500;
    const FADE_DURATION_MS = 200;
    const FADE_EASING = 'ease-out';
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
        console.log('✓ Page fade-in skipped (prefers-reduced-motion)');
        return;
      }

      // If WAAPI is missing, fall back to inline style.
      if (typeof fadeContent.animate !== 'function') {
        forceFadeVisible(fadeContent, 'WAAPI unsupported');
        return;
      }

      const anim = fadeContent.animate(
        [
          { opacity: 0 },
          { opacity: 1 },
        ],
        { duration: FADE_DURATION_MS, easing: FADE_EASING, fill: 'forwards' }
      );

      // Stamp final opacity so it can't get stuck hidden.
      anim?.addEventListener?.('finish', () => {
        fadeContent.style.opacity = '1';
        fadeContent.style.transform = 'translateZ(0)';
        console.log('✓ Page fade-in finished');
      });

      anim?.addEventListener?.('cancel', () => {
        forceFadeVisible(fadeContent, 'animation canceled');
      });

      console.log('✓ Page fade-in started (WAAPI)');

      // Ultimate failsafe: never allow permanent hidden UI.
      window.setTimeout(() => {
        const opacity = window.getComputedStyle(fadeContent).opacity;
        if (opacity === '0') forceFadeVisible(fadeContent, 'opacity still 0 after failsafe window');
      }, FADE_FAILSAFE_MS);
    }, FADE_DELAY_MS);
  } catch (e) {
    // Fallback: use new entrance animation system
    try {
      const { orchestrateEntrance } = await import('./visual/entrance-animation.js');
      const { getGlobals } = await import('./core/state.js');
      const g = getGlobals();
      
      if (g.entranceEnabled && !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
        await orchestrateEntrance({
          waitForFonts: async () => {
            try {
              await waitForFonts();
            } catch (e) {}
          }
        });
      }
    } catch (err) {
      console.warn('⚠️ Entrance animation fallback failed:', err);
    }
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
