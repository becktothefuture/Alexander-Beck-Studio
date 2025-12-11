// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                KEYBOARD INPUT                                ║
// ║              Panel toggle and mode switching (1,2,3,4,5)                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { setMode, MODES } from '../modes/mode-controller.js';
import { updateModeButtonsUI } from './controls.js';

export function setupKeyboardShortcuts() {
  const panel = document.getElementById('controlPanel');
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    // Toggle panel
    if ((k === '/' || e.code === 'Slash') && panel) {
      e.preventDefault();
      panel.classList.toggle('hidden');
      panel.style.display = panel.classList.contains('hidden') ? 'none' : '';
      return;
    }
    // Mode switching: 1=pit, 2=flies, 3=weightless, 4=water, 5=vortex, 6=ping-pong, 7=magnetic, 8=bubbles
    if (k === '1') {
      e.preventDefault();
      setMode(MODES.PIT);
      updateModeButtonsUI('pit');
    } else if (k === '2') {
      e.preventDefault();
      setMode(MODES.FLIES);
      updateModeButtonsUI('flies');
    } else if (k === '3') {
      e.preventDefault();
      setMode(MODES.WEIGHTLESS);
      updateModeButtonsUI('weightless');
    } else if (k === '4') {
      e.preventDefault();
      setMode(MODES.WATER);
      updateModeButtonsUI('water');
    } else if (k === '5') {
      e.preventDefault();
      setMode(MODES.VORTEX);
      updateModeButtonsUI('vortex');
    } else if (k === '6') {
      e.preventDefault();
      setMode(MODES.PING_PONG);
      updateModeButtonsUI('ping-pong');
    } else if (k === '7') {
      e.preventDefault();
      setMode(MODES.MAGNETIC);
      updateModeButtonsUI('magnetic');
    } else if (k === '8') {
      e.preventDefault();
      setMode(MODES.BUBBLES);
      updateModeButtonsUI('bubbles');
    }
  });
  
  console.log('✓ Keyboard shortcuts registered');
}
