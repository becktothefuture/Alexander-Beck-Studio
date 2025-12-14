// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                KEYBOARD INPUT                                ║
// ║              Panel dock toggle and mode switching (0-9)                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { setMode, MODES } from '../modes/mode-controller.js';
import { updateModeButtonsUI } from './controls.js';
import { toggleDock } from './panel-dock.js';

let isKeyboardWired = false;

export function setupKeyboardShortcuts() {
  if (isKeyboardWired) return;
  isKeyboardWired = true;

  window.addEventListener('keydown', (e) => {
    // Skip if typing in an input
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    
    const k = e.key.toLowerCase();
    
    // Toggle dock with /
    if (k === '/' || e.code === 'Slash') {
      e.preventDefault();
      toggleDock();
      return;
    }
    
    // Mode switching: 1=pit, 2=flies, 3=weightless, 4=water, 5=vortex, 6=ping-pong, 7=magnetic, 8=bubbles, 9=kaleidoscope
    if (k === '0') {
      e.preventDefault();
      setMode(MODES.CRYSTAL);
      updateModeButtonsUI('crystal');
    } else if (k === '1') {
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
    } else if (k === '9') {
      e.preventDefault();
      setMode(MODES.KALEIDOSCOPE);
      updateModeButtonsUI('kaleidoscope');
    }
  });
}
