// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       QUOTE DISPLAY COMPONENT                                 ║
// ║   Displays curated quotes from thinkers/creatives based on current mode       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getState } from '../core/state.js';
import { NARRATIVE_QUOTES } from '../core/constants.js';

let quoteContainer = null;
let contentWrapper = null;
let quoteTextEl = null;
let quoteAuthorEl = null;
let isAnimating = false;

// Animation timing (matches CSS)
const ANIM_DURATION = 320;

/**
 * Creates the quote display DOM structure and appends it to the page.
 * Positioned above the bottom-right meta area (London · time button).
 */
function createQuoteElement() {
  // Check if already created
  if (document.getElementById('quote-display')) {
    return document.getElementById('quote-display');
  }

  // Create container
  quoteContainer = document.createElement('div');
  quoteContainer.id = 'quote-display';
  quoteContainer.className = 'quote-display';
  quoteContainer.setAttribute('aria-live', 'polite');
  quoteContainer.setAttribute('aria-atomic', 'true');

  // Create content wrapper for animations
  contentWrapper = document.createElement('div');
  contentWrapper.className = 'quote-display__content quote-display__content--entering';

  // Create quote text element
  quoteTextEl = document.createElement('p');
  quoteTextEl.className = 'quote-display__text';

  // Create author element
  quoteAuthorEl = document.createElement('p');
  quoteAuthorEl.className = 'quote-display__author';

  // Assemble
  contentWrapper.appendChild(quoteTextEl);
  contentWrapper.appendChild(quoteAuthorEl);
  quoteContainer.appendChild(contentWrapper);

  // Find the target parent (ui-meta-right or corner-dock--br)
  const metaRight = document.querySelector('.ui-meta-right');
  if (metaRight) {
    // Insert before the meta-right element's first child
    metaRight.insertBefore(quoteContainer, metaRight.firstChild);
  } else {
    // Fallback: append to body with absolute positioning
    document.body.appendChild(quoteContainer);
  }

  return quoteContainer;
}

/**
 * Updates the quote display with the current mode's quote.
 * Includes subtle enter/exit animation.
 * @param {string} [mode] - Optional mode override; uses state.currentMode if not provided
 * @param {boolean} [animate=true] - Whether to animate the transition
 */
function updateQuote(mode, animate = true) {
  if (!quoteContainer || !contentWrapper) return;

  const currentMode = mode || getState().currentMode;
  const quoteData = NARRATIVE_QUOTES[currentMode];

  if (!quoteData) {
    // No quote for this mode - hide the container
    quoteContainer.classList.add('quote-display--hidden');
    return;
  }

  quoteContainer.classList.remove('quote-display--hidden');

  // Skip animation for initial load or if already animating
  if (!animate || isAnimating) {
    quoteTextEl.textContent = quoteData.quote;
    quoteAuthorEl.textContent = quoteData.author;
    contentWrapper.classList.remove('quote-display__content--entering', 'quote-display__content--exiting');
    return;
  }

  // Animate out → update → animate in
  isAnimating = true;
  contentWrapper.classList.add('quote-display__content--exiting');

  setTimeout(() => {
    // Update content while hidden
    quoteTextEl.textContent = quoteData.quote;
    quoteAuthorEl.textContent = quoteData.author;

    // Switch to entering state
    contentWrapper.classList.remove('quote-display__content--exiting');
    contentWrapper.classList.add('quote-display__content--entering');

    // Force reflow to restart animation
    void contentWrapper.offsetWidth;

    // Animate in
    contentWrapper.classList.remove('quote-display__content--entering');

    setTimeout(() => {
      isAnimating = false;
    }, ANIM_DURATION);
  }, ANIM_DURATION);
}

/**
 * Initializes the quote display component.
 * Creates DOM elements and sets up mode change listener.
 */
export function initQuoteDisplay() {
  // Create the quote element
  createQuoteElement();

  // Set initial quote based on current mode (no animation)
  const state = getState();
  if (state.currentMode) {
    updateQuote(state.currentMode, false);
    // Trigger enter animation after a brief delay
    requestAnimationFrame(() => {
      contentWrapper?.classList.remove('quote-display__content--entering');
    });
  }

  // Listen for mode changes (with animation)
  window.addEventListener('bb:modeChanged', (e) => {
    const newMode = e.detail?.mode;
    if (newMode) {
      updateQuote(newMode, true);
    }
  });
}

/**
 * Manually trigger a quote update (useful for testing or external control).
 * @param {string} mode - The mode to display the quote for
 */
export function setQuote(mode) {
  updateQuote(mode, true);
}
