// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           SOUND TOGGLE UI                                    ║
// ║            Button to enable/disable underwater pebble collision sounds       ║
// ║         Positioned at right edge, vertically centered (bonus feature)        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { 
  unlockAudio, 
  toggleSound, 
  getSoundState,
  SOUND_STATE_EVENT,
  initSoundEngine 
} from '../audio/sound-engine.js';

// Icon font glyphs (Tabler Icons Outline)
const ICON_SOUND_OFF = '<i class="ti ti-volume-off" aria-hidden="true"></i>';
const ICON_SOUND_ON = '<i class="ti ti-volume-2" aria-hidden="true"></i>';

let buttonElement = null;
let soundStateListenerBound = false;

function mountSoundToggle(button) {
  const fadeContent = document.getElementById('app-frame');
  const topSlot = document.getElementById('sound-toggle-slot');
  const socialLinks = document.getElementById('social-links');
  const footerMeta = document.querySelector('.ui-meta-right');
  const canMountInTopSlot = !!topSlot;
  const canMountInSocialLinks = socialLinks && (!fadeContent || fadeContent.contains(socialLinks));

  button.classList.remove('sound-toggle--top', 'sound-toggle--social');

  const mountInto = (parent) => {
    if (!parent) return false;
    try {
      if (button.parentElement && button.parentElement !== parent) {
        button.parentElement.removeChild(button);
      }
    } catch (e) {}
    if (parent.classList.contains('ui-meta-right')) {
      const timeEl = parent.querySelector('time');
      if (timeEl) {
        parent.insertBefore(button, timeEl);
        return true;
      }
    }
    parent.appendChild(button);
    return true;
  };

  if (canMountInTopSlot) {
    button.classList.add('sound-toggle--top');
    mountInto(topSlot);
  } else if (footerMeta) {
    mountInto(footerMeta);
  } else if (canMountInSocialLinks) {
    let item = socialLinks.querySelector('.sound-toggle-item');
    if (!item) {
      item = document.createElement('li');
      item.className = 'margin-bottom_none sound-toggle-item';
      socialLinks.appendChild(item);
    }
    button.classList.add('sound-toggle--social');
    mountInto(item);
  } else if (fadeContent) {
    mountInto(fadeContent);
  } else {
    mountInto(document.body);
  }
}

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
  
  buttonElement = buttonElement || document.getElementById('sound-toggle');

  if (!buttonElement) {
    buttonElement = document.createElement('button');
    buttonElement.className = 'sound-toggle abs-icon-btn';
    buttonElement.id = 'sound-toggle';
    buttonElement.type = 'button';
    buttonElement.setAttribute('aria-label', 'Toggle collision sounds');
    buttonElement.setAttribute('aria-pressed', 'false');
    buttonElement.setAttribute('data-enabled', 'false');
    buttonElement.innerHTML = ICON_SOUND_OFF;
    buttonElement.addEventListener('click', handleToggleClick);
  }

  mountSoundToggle(buttonElement);

  console.log('✓ Sound toggle created');

  // Sync initial UI with current sound state (if enabled elsewhere)
  try {
    const state = getSoundState();
    updateButtonState(!!(state.isUnlocked && state.isEnabled));
  } catch (e) {}

  // Stay in sync with panel toggles
  if (!soundStateListenerBound && typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener(SOUND_STATE_EVENT, (e) => {
      const s = e && e.detail ? e.detail : null;
      if (s) {
        updateButtonState(!!(s.isUnlocked && s.isEnabled));
      }
    });
    soundStateListenerBound = true;
  }

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
      if (buttonElement) {
        buttonElement.innerHTML = ICON_SOUND_OFF;
        buttonElement.setAttribute('aria-label', 'Audio unavailable');
      }
      setTimeout(() => {
        updateButtonState(false);
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
  buttonElement.setAttribute('aria-label', enabled ? 'Sound on' : 'Sound off');
  buttonElement.innerHTML = enabled ? ICON_SOUND_ON : ICON_SOUND_OFF;
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
