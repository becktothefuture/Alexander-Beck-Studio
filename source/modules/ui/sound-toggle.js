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

  // Initial icon (sound starts off)
  buttonElement.innerHTML = ICON_SOUND_OFF;
  buttonElement.title = 'Sound off';
  
  // Click handler
  buttonElement.addEventListener('click', handleToggleClick);
  
  // Preferred mounts:
  // - Mobile: a full-width row under legend + description (#top-elements-soundRow)
  // - Desktop: top-right row next to the decorative text (#top-elements-rightRow)
  // Fallback: append to #fade-content so it fades with other content.
  const fadeContent = document.getElementById('fade-content');
  const topRow = document.getElementById('top-elements-rightRow');
  const soundRow = document.getElementById('top-elements-soundRow');
  const socialLinks = document.getElementById('social-links');
  const canMountInTopRow = !!topRow;
  const canMountInSocialLinks = socialLinks && (!fadeContent || fadeContent.contains(socialLinks));
  const prefersMobileFullWidth =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 480px)').matches;
  
  const mountInto = (parent) => {
    if (!parent) return false;
    // Move if already mounted somewhere else
    try {
      if (buttonElement.parentElement && buttonElement.parentElement !== parent) {
        buttonElement.parentElement.removeChild(buttonElement);
      }
    } catch (e) {}
    parent.appendChild(buttonElement);
    return true;
  };

  if (prefersMobileFullWidth && soundRow) {
    buttonElement.classList.add('sound-toggle--top');
    buttonElement.classList.add('sound-toggle--topwide');
    mountInto(soundRow);
  } else if (canMountInTopRow) {
    buttonElement.classList.add('sound-toggle--top');
    topRow.appendChild(buttonElement);
  } else if (canMountInSocialLinks) {
    const li = document.createElement('li');
    li.className = 'margin-bottom_none sound-toggle-item';
    buttonElement.classList.add('sound-toggle--social');
    li.appendChild(buttonElement);
    socialLinks.appendChild(li);
  } else if (fadeContent) {
    fadeContent.appendChild(buttonElement);
  } else {
    document.body.appendChild(buttonElement);
  }

  // If the viewport crosses the mobile breakpoint, re-mount to keep layout correct.
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(max-width: 480px)');
      const handler = () => {
        const sr = document.getElementById('top-elements-soundRow');
        const tr = document.getElementById('top-elements-rightRow');
        const shouldBeWide = mq.matches && !!sr;
        buttonElement.classList.toggle('sound-toggle--topwide', shouldBeWide);
        if (shouldBeWide) {
          mountInto(sr);
        } else if (tr) {
          mountInto(tr);
        }
      };
      // Prefer modern API, fall back gracefully.
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
      else if (typeof mq.addListener === 'function') mq.addListener(handler);
    }
  } catch (e) {}
  
  console.log('✓ Sound toggle created');

  // Sync initial UI with current sound state (if enabled elsewhere)
  try {
    const state = getSoundState();
    updateButtonState(!!(state.isUnlocked && state.isEnabled));
  } catch (e) {}

  // Stay in sync with panel toggles
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener(SOUND_STATE_EVENT, (e) => {
      const s = e && e.detail ? e.detail : null;
      if (s) updateButtonState(!!(s.isUnlocked && s.isEnabled));
    });
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
        buttonElement.title = 'Audio unavailable';
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
  buttonElement.title = enabled ? 'Sound on' : 'Sound off';
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

