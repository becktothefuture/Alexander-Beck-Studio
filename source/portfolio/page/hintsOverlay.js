// hintsOverlay.js – handles static overlay clicks
import { resumeContext as enableAudio } from './audioManager.js';

export function initializeHintsOverlay(scrollEngine) {
  const overlay = document.getElementById('overlay-hints');
  if (!overlay) return;

  function dismiss() {
    overlay.classList.add('overlay--hints--hidden');
    // enable audio
    enableAudio();
    // resume scroll input
    if (scrollEngine) scrollEngine.resumeInput();
  }

  overlay.addEventListener('click', dismiss, { once: true });
  // Optional: allow space/enter key to dismiss
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      dismiss();
    }
  }, { once: true });
} 