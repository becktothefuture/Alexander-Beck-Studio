// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           SOUND TOGGLE UI                                    ║
// ║            Button to enable/disable underwater pebble collision sounds       ║
// ║         Positioned at right edge, vertically centered (bonus feature)        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { 
  unlockAudio, 
  toggleSound, 
  getSoundState,
  initSoundEngine 
} from '../audio/sound-engine.js';

let buttonElement = null;

/**
 * Create and inject the sound toggle button into the DOM
 * Positioned at right edge, vertically centered
 * Hover triggers background color transition (grey → white)
 */
export function createSoundToggle() {
  // Initialize sound engine (non-blocking)
  initSoundEngine();
  
  // Check if prefers-reduced-motion (don't create button)
  if (typeof window !== 'undefined' && window.matchMedia) {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      console.log('⏸ Sound toggle hidden (prefers-reduced-motion)');
      return null;
    }
  }
  
  // Create button element
  buttonElement = document.createElement('button');
  buttonElement.className = 'sound-toggle';
  buttonElement.id = 'sound-toggle';
  buttonElement.type = 'button';
  buttonElement.setAttribute('aria-label', 'Toggle collision sounds');
  buttonElement.setAttribute('aria-pressed', 'false');
  buttonElement.setAttribute('data-enabled', 'false');
  
  // No inline styles - CSS handles all styling via .sound-toggle class

  // Initial text (sound starts off)
  buttonElement.textContent = 'Sound Off';
  
  // Click handler
  buttonElement.addEventListener('click', handleToggleClick);
  
  // Insert into body for now, fixed position
  document.body.appendChild(buttonElement);
  
  console.log('✓ Sound toggle created');
  return buttonElement;
}

/**
 * Handle mouse enter - add hover class to body for background transition
 */
function handleHoverEnter() {
  document.body.classList.add('sound-hover');
}

/**
 * Handle mouse leave - remove hover class from body
 */
function handleHoverLeave() {
  document.body.classList.remove('sound-hover');
}

/**
 * Handle button click - unlock audio on first click, toggle thereafter
 */
async function handleToggleClick() {
  const state = getSoundState();
  
  if (!state.isUnlocked) {
    // First click: unlock audio context
    const success = await unlockAudio();
    if (success) {
      updateButtonState(true);
    } else {
      // Failed to unlock - show error state briefly, then revert
      buttonElement.textContent = 'Audio unavailable';
      setTimeout(() => {
        buttonElement.textContent = 'Sound off';
      }, 2000);
    }
  } else {
    // Subsequent clicks: toggle on/off
    const newState = toggleSound();
    updateButtonState(newState);
  }
}

/**
 * Update button text and state attributes
 * @param {boolean} enabled - Current enabled state
 */
function updateButtonState(enabled) {
  if (!buttonElement) return;
  
  buttonElement.setAttribute('data-enabled', enabled ? 'true' : 'false');
  buttonElement.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  buttonElement.setAttribute('aria-label', 'Toggle collision sounds');
  
  buttonElement.textContent = enabled ? 'Sound On' : 'Sound Off';
}

/**
 * Get the button element reference
 * @returns {HTMLButtonElement|null}
 */
export function getSoundToggleElement() {
  return buttonElement;
}

/**
 * Programmatically update the toggle UI state
 * (useful if sound is disabled from elsewhere)
 * @param {boolean} enabled
 */
export function setSoundToggleState(enabled) {
  updateButtonState(enabled);
}

