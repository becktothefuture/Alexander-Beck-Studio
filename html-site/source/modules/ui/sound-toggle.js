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
  buttonElement.className = 'sound-toggle abs-icon-btn';
  buttonElement.id = 'sound-toggle';
  buttonElement.type = 'button';
  buttonElement.setAttribute('aria-label', 'Toggle collision sounds');
  buttonElement.setAttribute('aria-pressed', 'false');
  buttonElement.setAttribute('data-enabled', 'false');
  
  // No inline styles - CSS handles all styling via .sound-toggle class

  // Initial icon (sound starts off)
  buttonElement.innerHTML = ICON_SOUND_OFF;
  
  // Click handler
  buttonElement.addEventListener('click', handleToggleClick);
  
  // Preferred mounts:
  // - Mobile: a full-width row under legend + description (#top-elements-soundRow)
  // - Desktop: top-right row next to the decorative text (#top-elements-rightRow)
  // Fallback: append to #app-frame so it fades with other content.
  const fadeContent = document.getElementById('app-frame');
  const topSlot = document.getElementById('sound-toggle-slot');
  const soundRow = document.getElementById('top-elements-soundRow');
  const socialLinks = document.getElementById('social-links');
  const footerMeta = document.querySelector('.ui-meta-right'); // New slot
  const canMountInTopSlot = !!topSlot;
  const canMountInSocialLinks = socialLinks && (!fadeContent || fadeContent.contains(socialLinks));
  const prefersMobileFullWidth =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 600px)').matches;
  
  const mountInto = (parent) => {
    if (!parent) return false;
    // Move if already mounted somewhere else
    try {
      if (buttonElement.parentElement && buttonElement.parentElement !== parent) {
        buttonElement.parentElement.removeChild(buttonElement);
      }
    } catch (e) {}
    // If mounting into ui-meta-right, put it before the time element
    if (parent.classList.contains('ui-meta-right')) {
        const timeEl = parent.querySelector('time');
        if (timeEl) {
            parent.insertBefore(buttonElement, timeEl);
            return true;
        }
    }
    parent.appendChild(buttonElement);
    return true;
  };

  if (prefersMobileFullWidth && soundRow) {
    buttonElement.classList.add('sound-toggle--top');
    buttonElement.classList.add('sound-toggle--topwide');
    mountInto(soundRow);
  } else if (canMountInTopSlot) {
    // Priority: Top Right Slot (Desktop/Tablet)
    buttonElement.classList.add('sound-toggle--top');
    mountInto(topSlot);
  } else if (footerMeta) {
    // Fallback: Footer Meta
    mountInto(footerMeta);
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
      const mq = window.matchMedia('(max-width: 600px)');
      const handler = () => {
        const sr = document.getElementById('top-elements-soundRow');
        const ts = document.getElementById('sound-toggle-slot');
        const shouldBeWide = mq.matches && !!sr;
        buttonElement.classList.toggle('sound-toggle--topwide', shouldBeWide);
        if (shouldBeWide) {
          mountInto(sr);
        } else if (ts) {
          mountInto(ts);
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
      if (s) {
        updateButtonState(!!(s.isUnlocked && s.isEnabled));
      }
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

