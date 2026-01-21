// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    PAGE DEPARTURE ANIMATION                                  ║
// ║   Safari/Firefox fallback for View Transitions API                          ║
// ║   Animates content out before navigation to mask page reload                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Check if View Transitions API is supported
 * @returns {boolean}
 */
export function supportsViewTransitions() {
  return typeof document.startViewTransition === 'function';
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

/**
 * Animate page content out before navigation (departure animation)
 * Used for Safari/Firefox fallback when View Transitions API isn't available
 * 
 * @param {Object} options
 * @param {number} options.duration - Animation duration in ms (default: 300)
 * @param {string} options.easing - CSS easing function (default: cubic-bezier)
 * @returns {Promise<void>} Resolves when animation completes
 */
export async function animateDeparture(options = {}) {
  const duration = options.duration ?? 300;
  const easing = options.easing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
  
  // Skip animation for reduced motion
  if (prefersReducedMotion()) {
    return Promise.resolve();
  }
  
  // Content zones to animate out
  const contentSelectors = [
    '#expertise-legend',
    '.decorative-script',
    '.portfolio-stage',
    '#portfolioMeta',
    '.cv-scroll-container',
    '#bravia-balls canvas',
    '.ui-top',
    '.ui-bottom',
    '#main-links'
  ];
  
  const elements = contentSelectors
    .map(sel => document.querySelector(sel))
    .filter(Boolean);
  
  if (elements.length === 0) {
    return Promise.resolve();
  }
  
  // Use WAAPI for GPU-accelerated animation
  const animations = elements.map(el => {
    return el.animate(
      [
        { 
          opacity: 1, 
          transform: 'scale(1) translateZ(0)', 
          filter: 'blur(0)' 
        },
        { 
          opacity: 0, 
          transform: 'scale(0.95) translateZ(-30px)', 
          filter: 'blur(4px)' 
        }
      ],
      {
        duration,
        easing,
        fill: 'forwards'
      }
    );
  });
  
  // Wait for all animations to complete
  await Promise.all(animations.map(anim => anim.finished));
}

/**
 * Initialize departure animation for navigation links
 * Intercepts clicks on [data-transition] links and animates before navigation
 */
export function initDepartureNavigation() {
  // Skip if View Transitions API is supported (browser handles it)
  if (supportsViewTransitions()) {
    console.log('✓ View Transitions API supported, skipping departure fallback');
    return;
  }
  
  console.log('✓ Setting up departure animation fallback for Safari/Firefox');
  
  // Handle clicks on transition-enabled links
  document.addEventListener('click', async (e) => {
    const link = e.target.closest('[data-transition]');
    if (!link) return;
    
    const href = link.href || link.dataset.href;
    if (!href) return;
    
    // Don't intercept if modifier keys are pressed
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    
    e.preventDefault();
    
    // Animate out
    await animateDeparture();
    
    // Navigate
    window.location.href = href;
  });
}

/**
 * Trigger departure animation and navigate to URL
 * Use this for programmatic navigation (e.g., after gate success)
 * 
 * @param {string} url - Destination URL
 * @param {Object} options - Animation options
 */
export async function departAndNavigate(url, options = {}) {
  // If View Transitions API is supported, just navigate (browser handles animation)
  if (supportsViewTransitions()) {
    window.location.href = url;
    return;
  }
  
  // Safari/Firefox fallback: animate then navigate
  await animateDeparture(options);
  window.location.href = url;
}

/**
 * Initialize speculative prefetching on hover
 * Prefetches destination pages when user hovers over links
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
   * Prefetch a URL by injecting a link[rel=prefetch]
   * @param {string} url 
   */
  function prefetchUrl(url) {
    if (prefetched.has(url)) return;
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.as = 'document';
    document.head.appendChild(link);
    prefetched.add(url);
    console.log(`↓ Prefetched: ${url}`);
  }
  
  /**
   * Handle hover/focus on navigation elements
   * @param {Element} target 
   */
  function handleHoverStart(target) {
    const href = target.href || target.dataset.href;
    if (!href || !href.endsWith('.html')) return;
    
    // Delay prefetch to avoid prefetching on quick mouse passes
    const timeout = setTimeout(() => prefetchUrl(href), HOVER_DELAY);
    
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
  
  // Listen for hover/focus on links with hrefs
  document.addEventListener('mouseenter', (e) => {
    const link = e.target.closest('a[href], [data-href]');
    if (link) handleHoverStart(link);
  }, { capture: true });
  
  document.addEventListener('focusin', (e) => {
    const link = e.target.closest('a[href], [data-href]');
    if (link) handleHoverStart(link);
  });
  
  // Mobile: prefetch on touchstart
  document.addEventListener('touchstart', (e) => {
    const link = e.target.closest('a[href], [data-href]');
    if (link) {
      const href = link.href || link.dataset.href;
      if (href?.endsWith('.html')) {
        prefetchUrl(href);
      }
    }
  }, { passive: true });
  
  console.log('✓ Speculative prefetch initialized');
}
