// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PAGE NAVIGATION UTILITIES                            ║
// ║     Unified navigation state: transitions, modal routing, animation skip     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const NAV_STATE_KEY = 'abs_nav_state';
const NAV_TIMESTAMP_KEY = 'abs_nav_ts';
const NAV_EXPIRY_MS = 5000; // 5 second window for page transitions

// Navigation state types
export const NAV_STATES = {
  INTERNAL: 'internal',                 // General internal navigation
  OPEN_CV_MODAL: 'open_cv',             // Open CV modal on arrival
  OPEN_PORTFOLIO_MODAL: 'open_portfolio', // Open Portfolio modal on arrival
  OPEN_CONTACT_MODAL: 'open_contact',   // Open Contact modal on arrival
};

// Debounce state (prevents rapid click navigation)
let isTransitioning = false;

/**
 * Set navigation state before navigating to another page.
 * State is consumed on arrival (one-time use).
 * @param {string} state - Navigation state from NAV_STATES
 */
export function setNavigationState(state = NAV_STATES.INTERNAL) {
  try {
    sessionStorage.setItem(NAV_STATE_KEY, state);
    sessionStorage.setItem(NAV_TIMESTAMP_KEY, String(Date.now()));
  } catch (e) {
    // Storage unavailable (private browsing) - navigation will show wall animation (safe default)
  }
}

/**
 * Get and consume the navigation state.
 * Returns null if no state or expired. Clears state after reading.
 * Also clears legacy flags for backwards compatibility.
 * @returns {string|null} Navigation state or null
 */
export function getNavigationState() {
  try {
    const state = sessionStorage.getItem(NAV_STATE_KEY);
    const ts = parseInt(sessionStorage.getItem(NAV_TIMESTAMP_KEY) || '0', 10);
    const isRecent = Date.now() - ts < NAV_EXPIRY_MS;
    
    // Clear after reading (one-time use)
    sessionStorage.removeItem(NAV_STATE_KEY);
    sessionStorage.removeItem(NAV_TIMESTAMP_KEY);
    
    // Also clear legacy flags for clean migration
    sessionStorage.removeItem('abs_open_cv_modal');
    sessionStorage.removeItem('abs_open_cv_gate');
    sessionStorage.removeItem('abs_open_portfolio_modal');
    sessionStorage.removeItem('abs_open_contact_modal');
    sessionStorage.removeItem('abs_internal_nav');
    
    if (state && isRecent) return state;
  } catch (e) {
    // Storage unavailable
  }
  return null;
}

/**
 * Check if page was loaded via browser back/forward navigation.
 * Uses Performance Navigation Timing API.
 * @returns {boolean}
 */
export function isBackForwardNavigation() {
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      return navEntries[0].type === 'back_forward';
    }
  } catch (e) {
    // API unavailable
  }
  return false;
}

/**
 * Determine if wall animation should be skipped.
 * Returns true for internal navigation or browser back/forward.
 * @returns {boolean}
 */
export function shouldSkipWallAnimation() {
  // Check internal navigation state first (consumes it)
  const navState = getNavigationState();
  // Also check browser back/forward
  return navState !== null || isBackForwardNavigation();
}

/**
 * Get which modal should auto-open on page load.
 * Must be called BEFORE shouldSkipWallAnimation() since that consumes the state.
 * @returns {string|null} 'cv', 'portfolio', 'contact', or null
 */
export function getModalToAutoOpen() {
  try {
    const state = sessionStorage.getItem(NAV_STATE_KEY);
    if (state === NAV_STATES.OPEN_CV_MODAL) return 'cv';
    if (state === NAV_STATES.OPEN_PORTFOLIO_MODAL) return 'portfolio';
    if (state === NAV_STATES.OPEN_CONTACT_MODAL) return 'contact';
  } catch (e) {
    // Storage unavailable
  }
  return null;
}

/**
 * Navigate to a page with smooth fade-out transition.
 * Sets navigation state and applies page-transitioning class.
 * Debounces rapid clicks during transition.
 * @param {string} href - Destination URL
 * @param {string} state - Navigation state from NAV_STATES
 */
export function navigateWithTransition(href, state = NAV_STATES.INTERNAL) {
  if (isTransitioning) return; // Debounce rapid clicks
  isTransitioning = true;
  
  setNavigationState(state);
  document.body.classList.add('page-transitioning');
  
  setTimeout(() => {
    window.location.href = href;
  }, 300); // Match CSS animation duration
}

/**
 * Reset transitioning state.
 * Call on bfcache restore (pageshow with persisted=true).
 */
export function resetTransitionState() {
  isTransitioning = false;
  document.body.classList.remove('page-transitioning');
}

/**
 * Add prefetch link for a page (once per session).
 * Improves navigation speed by preloading destination.
 * @param {string} href - URL to prefetch
 */
export function prefetchPage(href) {
  // Check if already prefetched
  const existing = document.querySelector(`link[rel="prefetch"][href="${href}"]`);
  if (existing) return;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Setup prefetch on hover for a link element.
 * Only prefetches once (first hover).
 * @param {HTMLElement} element - Element to watch for hover
 * @param {string} href - URL to prefetch on hover
 */
export function setupPrefetchOnHover(element, href) {
  if (!element) return;
  element.addEventListener('mouseenter', () => prefetchPage(href), { once: true });
}
