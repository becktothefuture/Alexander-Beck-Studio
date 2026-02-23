// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PAGE NAVIGATION UTILITIES                            ║
// ║     Unified navigation state: transitions, modal routing, animation skip     ║
// ║     Now with View Transitions API support + Safari departure fallback        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const NAV_STATE_KEY = 'abs_nav_state';
const NAV_TIMESTAMP_KEY = 'abs_nav_ts';
const NAV_EXPIRY_MS = 5000; // 5 second window for page transitions

/**
 * Check if View Transitions API is supported (Chrome 126+)
 * @returns {boolean}
 */
export function supportsViewTransitions() {
  return typeof document.startViewTransition === 'function';
}

/**
 * Check if this page load was the result of a View Transition.
 * Returns the cached result from module load + pagereveal detection.
 * @returns {boolean}
 */
export function didViewTransitionRun() {
  return _viewTransitionDetected;
}

// Listen for pagereveal event to detect View Transition arrival (backup)
if (typeof window !== 'undefined') {
  window.addEventListener('pagereveal', (event) => {
    if (event.viewTransition) {
      _viewTransitionDetected = true;
      console.log('✓ View Transition detected on pagereveal');
      
      // CRITICAL: Remove entrance-pre-transition class immediately so content is visible
      // during the View Transition animation. The View Transition handles the animation,
      // so we don't need the entrance animation's initial hidden state.
      document.documentElement.classList.remove('entrance-pre-transition', 'entrance-transitioning');
      document.documentElement.classList.add('entrance-complete');
      
      // Ensure key elements are visible (they may have inline opacity: 0 from HTML)
      const elementsToReveal = ['#app-frame', '#abs-scene', '#brand-logo', '#main-links'];
      elementsToReveal.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
          el.style.opacity = '1';
          el.style.visibility = 'visible';
        }
      });
      
      // Also reveal main-links buttons
      document.querySelectorAll('#main-links .footer_link').forEach(btn => {
        btn.style.opacity = '1';
        btn.style.transform = 'translateY(0) scale(1)';
        btn.style.filter = 'blur(0)';
      });
    }
  });
  
  // Close overlays before navigation to prevent ghost UI in view transitions
  window.addEventListener('pageswap', () => {
    closeOverlaysBeforeNavigation();
  });
  
  window.addEventListener('pagehide', () => {
    closeOverlaysBeforeNavigation();
  });
}

/**
 * Close all modals, panels, and overlays before navigation.
 * Prevents ghost UI artifacts in View Transitions.
 */
function closeOverlaysBeforeNavigation() {
  // Close modals
  const modals = document.querySelectorAll('.modal.active, [data-modal].active');
  modals.forEach(modal => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  });
  
  // Close modal overlay
  const overlay = document.getElementById('modal-overlay');
  if (overlay?.classList.contains('active')) {
    overlay.classList.remove('active');
  }
  
  // Close settings/master panel if open
  const panel = document.getElementById('master-panel');
  if (panel?.classList.contains('open')) {
    panel.classList.remove('open');
  }
  
  // Remove any modal-active class from html
  document.documentElement.classList.remove('modal-active');
}

// Navigation state types
export const NAV_STATES = {
  INTERNAL: 'internal',                 // General internal navigation
  OPEN_CV_MODAL: 'open_cv',             // Open CV modal on arrival
  OPEN_PORTFOLIO_MODAL: 'open_portfolio', // Open Portfolio modal on arrival
  OPEN_CONTACT_MODAL: 'open_contact',   // Open Contact modal on arrival
};

// ============================================================================
// VIEW TRANSITION DETECTION (must run at module load, before state is cleared)
// ============================================================================
// Check IMMEDIATELY at module load whether we arrived via View Transition.
// This must happen before getNavigationState() clears the sessionStorage.
let _viewTransitionDetected = false;
try {
  const navState = sessionStorage.getItem(NAV_STATE_KEY);
  const navTs = parseInt(sessionStorage.getItem(NAV_TIMESTAMP_KEY) || '0', 10);
  const isRecent = Date.now() - navTs < NAV_EXPIRY_MS;
  const browserSupportsVT = typeof document.startViewTransition === 'function';
  
  if (navState && isRecent && browserSupportsVT) {
    _viewTransitionDetected = true;
    console.log('✓ View Transition detected at module load');
  }
} catch (e) {
  // sessionStorage unavailable
}

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
 * Uses View Transitions API on Chrome, departure animation fallback on Safari.
 * Sets navigation state and debounces rapid clicks.
 * @param {string} href - Destination URL
 * @param {string} state - Navigation state from NAV_STATES
 */
export async function navigateWithTransition(href, state = NAV_STATES.INTERNAL) {
  if (isTransitioning) return; // Debounce rapid clicks
  isTransitioning = true;
  
  setNavigationState(state);
  
  const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  
  // If View Transitions API is supported, just navigate (browser handles animation via CSS)
  if (supportsViewTransitions()) {
    window.location.href = href;
    return;
  }
  
  // Safari/Firefox fallback: departure animation before navigation
  document.body.classList.add('page-transitioning');
  
  try {
    // Dynamic import to avoid loading if not needed
    const { animateDeparture } = await import('../visual/page-departure.js');
    await animateDeparture({ duration: reduceMotion ? 150 : 300 });
  } catch (e) {
    // Fallback delay if module fails
    await new Promise(r => setTimeout(r, reduceMotion ? 150 : 300));
  }
  
  window.location.href = href;
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

/**
 * Initialize speculative prefetching system.
 * Prefetches pages on hover/focus with a small delay.
 * Respects data saver mode.
 */
export function initSpeculativePrefetch() {
  const prefetched = new Set();
  const HOVER_DELAY = 100; // ms before triggering prefetch
  
  // Respect data saver mode
  const connection = navigator.connection;
  if (connection?.saveData) {
    console.log('✓ Data saver enabled, skipping speculative prefetch');
    return;
  }
  
  /**
   * Handle hover/focus on navigation elements
   * @param {Element} target 
   */
  function handleHoverStart(target) {
    const href = target.href || target.dataset.href;
    if (!href || prefetched.has(href)) return;
    if (!href.endsWith('.html') && !href.includes('/')) return;
    
    // Delay prefetch to avoid prefetching on quick mouse passes
    const timeout = setTimeout(() => {
      prefetchPage(href);
      prefetched.add(href);
    }, HOVER_DELAY);
    
    // Cancel if mouse leaves quickly
    const cancel = () => {
      clearTimeout(timeout);
      target.removeEventListener('mouseleave', cancel);
      target.removeEventListener('touchend', cancel);
      target.removeEventListener('blur', cancel);
    };
    
    target.addEventListener('mouseleave', cancel, { once: true });
    target.addEventListener('touchend', cancel, { once: true });
    target.addEventListener('blur', cancel, { once: true });
  }
  
  // Listen for hover/focus on links
  document.addEventListener('mouseenter', (e) => {
    try {
      if (!e.target || typeof e.target.closest !== 'function') return;
      const link = e.target.closest('a[href], [data-href], [data-transition]');
      if (link) handleHoverStart(link);
    } catch (err) {
      console.error('Prefetch mouseenter error:', err);
    }
  }, { capture: true });

  document.addEventListener('focusin', (e) => {
    try {
      if (!e.target || typeof e.target.closest !== 'function') return;
      const link = e.target.closest('a[href], [data-href], [data-transition]');
      if (link) handleHoverStart(link);
    } catch (err) {
      console.error('Prefetch focusin error:', err);
    }
  });

  // Mobile: prefetch on touchstart
  document.addEventListener('touchstart', (e) => {
    try {
      if (!e.target || typeof e.target.closest !== 'function') return;
      const link = e.target.closest('a[href], [data-href], [data-transition]');
      if (link) {
        const href = link.href || link.dataset.href;
        if (href && !prefetched.has(href)) {
          prefetchPage(href);
          prefetched.add(href);
        }
      }
    } catch (err) {
      console.error('Prefetch touchstart error:', err);
    }
  }, { passive: true });
  
  console.log('✓ Speculative prefetch initialized');
}
