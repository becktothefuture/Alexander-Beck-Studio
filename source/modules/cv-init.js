// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               CV PAGE BOOTSTRAP                               ║
// ║     Loads runtime text + shared chrome (dark mode, time, socials, sound)      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { loadRuntimeText } from './utils/text-loader.js';
import { applyRuntimeTextToDOM } from './ui/apply-text.js';
import { initializeDarkMode } from './visual/dark-mode-v2.js';
import { initTimeDisplay } from './ui/time-display.js';
import { upgradeSocialIcons } from './ui/social-icons.js';
import { createSoundToggle } from './ui/sound-toggle.js';

async function bootstrapCvPage() {
  try {
    await loadRuntimeText();
    applyRuntimeTextToDOM();
  } catch (e) {
    // Non-fatal: continue with defaults.
  }

  initializeDarkMode();
  initTimeDisplay();
  upgradeSocialIcons();
  createSoundToggle();
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrapCvPage();
});

