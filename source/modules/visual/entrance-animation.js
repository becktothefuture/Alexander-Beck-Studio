// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    ENTRANCE ANIMATION SYSTEM                                 ║
// ║        Orchestrates dramatic page entrance: browser default → wall-state   ║
// ║        Elements fade in with 3D perspective (scale + z-axis movement)      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { readTokenVar } from '../utils/tokens.js';

/**
 * Detects aspect ratio category (landscape, square, portrait)
 * Returns the category string for CSS class application
 */
export function detectAspectRatioCategory() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = width / height;
  
  if (ratio > 1.1) return 'landscape';
  if (ratio < 0.9) return 'portrait';
  return 'square';
}

/**
 * Applies aspect ratio class to html element for CSS perspective targeting
 */
export function applyAspectRatioClass() {
  const category = detectAspectRatioCategory();
  document.documentElement.classList.remove('aspect-landscape', 'aspect-square', 'aspect-portrait');
  document.documentElement.classList.add(`aspect-${category}`);
  
  // Update on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const newCategory = detectAspectRatioCategory();
      if (newCategory !== category) {
        document.documentElement.classList.remove('aspect-landscape', 'aspect-square', 'aspect-portrait');
        document.documentElement.classList.add(`aspect-${newCategory}`);
      }
    }, 150);
  });
}

/**
 * Gets perspective value based on aspect ratio and config
 */
function getPerspectiveValue() {
  const g = getGlobals();
  const category = detectAspectRatioCategory();
  
  switch (category) {
    case 'landscape':
      return g.entrancePerspectiveLandscape || 1200;
    case 'portrait':
      return g.entrancePerspectivePortrait || 800;
    case 'square':
    default:
      return g.entrancePerspectiveSquare || 1000;
  }
}

/**
 * Applies perspective CSS variable to root
 */
export function applyPerspectiveCSS() {
  const perspective = getPerspectiveValue();
  document.documentElement.style.setProperty('--entrance-perspective', `${perspective}px`);
}

/**
 * Sets initial browser-default state
 * Page starts looking like a normal browser page (white background, default styling)
 * 
 * NOTE: Wall color is NOT set here - it's already set by the critical inline script
 * in <head> which runs before CSS loads. Manipulating wall color here would cause
 * flashing by fighting with the early script. Trust the early script to have set
 * the correct theme-aware background.
 */
export function setInitialBrowserDefaultState() {
  const html = document.documentElement;
  
  // Hide all custom-styled elements initially (entrance animation will reveal them)
  html.classList.add('entrance-pre-transition');
}

/**
 * Transitions from browser default to wall-state
 * Wall "grows" from beyond the viewport with synchronized scale and corner rounding
 * 
 * NOTE: Wall color is controlled by the early inline script and CSS tokens.
 * This function only manages the wall ANIMATION (scale + border-radius),
 * not the color transitions.
 */
export function transitionToWallState() {
  const g = getGlobals();
  const html = document.documentElement;
  const delay = g.entranceWallTransitionDelay || 300;
  const duration = g.entranceWallTransitionDuration || 800;
  
  // Get the wall container (#bravia-balls)
  const wallContainer = document.getElementById('bravia-balls');
  if (!wallContainer) {
    console.warn('⚠️ #bravia-balls not found, falling back to simple transition');
    setTimeout(() => {
      html.classList.remove('entrance-pre-transition');
      html.classList.add('entrance-transitioning');
      setTimeout(() => {
        html.classList.remove('entrance-transitioning');
        html.classList.add('entrance-complete');
      }, duration);
    }, delay);
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 1: LOCK VALUES (prevent CSS variable interference)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Read final border-radius from state (source of truth, stable value)
  // Simulation page: always use 0 (radius controlled entirely by rubber wall system)
  // Portfolio page: use wallRadius if available
  const isPortfolioPage = document.body.classList.contains('portfolio-page');
  const finalRadius = isPortfolioPage 
    ? ((g.wallRadius && typeof g.wallRadius === 'number' && g.wallRadius > 0) 
        ? `${g.wallRadius}px` 
        : '42px')
    : '0px'; // Simulation page: no CSS border-radius, rubber wall controls visual radius
  
  // Initial scale (1.1 = subtle growth effect, not too dramatic)
  const initialScale = g.entranceWallInitialScale || 1.1;
  
  // Animation easing
  const easing = g.entranceWallEasing || 'cubic-bezier(0.16, 1, 0.3, 1)';
  
  // Store original transition to restore after animation
  const originalTransition = wallContainer.style.transition;
  
  setTimeout(() => {
    // ═══════════════════════════════════════════════════════════════════════════════
    // PHASE 2: REVEAL (remove browser default class, show wall)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    html.classList.remove('entrance-pre-transition');
    html.classList.add('entrance-transitioning');
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PHASE 3: SET INITIAL STATE (no transitions, instant values)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Disable ALL CSS transitions to prevent conflicts
    wallContainer.style.transition = 'none';
    
    // Set starting state:
    // - Scale: 1.1 (slightly larger, will animate to 1.0)
    // - Border-radius: 0px (sharp corners, will animate to rounded)
    // - Opacity: 1 (fully visible, no fade)
    wallContainer.style.transform = `scale(${initialScale})`;
    wallContainer.style.transformOrigin = 'center center';
    wallContainer.style.borderRadius = '0px';
    wallContainer.style.opacity = '1';
    wallContainer.style.visibility = 'visible';
    
    // Force browser reflow to apply initial state
    wallContainer.offsetHeight;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PHASE 4: ANIMATE (synchronized scale and border-radius growth)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    if (typeof wallContainer.animate === 'function') {
      // Use Web Animations API (performant, no style conflicts)
      
      // Animation 1: Scale from 1.1 to 1.0 (wall grows into viewport)
      const scaleAnim = wallContainer.animate(
        [
          { transform: `scale(${initialScale})` },
          { transform: 'scale(1)' }
        ],
        {
          duration,
          easing,
          fill: 'forwards'
        }
      );
      
      // Animation 2: Border-radius from 0 to final (corners grow out)
      const radiusAnim = wallContainer.animate(
        [
          { borderRadius: '0px' },
          { borderRadius: finalRadius }
        ],
        {
          duration,
          easing,
          fill: 'forwards'
        }
      );
      
      // ═══════════════════════════════════════════════════════════════════════════════
      // PHASE 5: CLEANUP (lock final values, restore normal behavior)
      // ═══════════════════════════════════════════════════════════════════════════════
      
      let scaleComplete = false;
      let radiusComplete = false;
      
      const finishAnimation = () => {
        if (scaleComplete && radiusComplete) {
          // Lock final values with inline styles
          wallContainer.style.transform = 'scale(1)';
          wallContainer.style.borderRadius = finalRadius;
          wallContainer.style.opacity = '1';
          
          // Brief delay before restoring transitions (allows animation to settle)
          setTimeout(() => {
            wallContainer.style.transition = originalTransition || '';
            html.classList.remove('entrance-transitioning');
            html.classList.add('entrance-complete');
          }, 50);
        }
      };
      
      scaleAnim.addEventListener('finish', () => {
        scaleComplete = true;
        finishAnimation();
      });
      
      scaleAnim.addEventListener('cancel', () => {
        scaleComplete = true;
        finishAnimation();
      });
      
      radiusAnim.addEventListener('finish', () => {
        radiusComplete = true;
        finishAnimation();
      });
      
      radiusAnim.addEventListener('cancel', () => {
        radiusComplete = true;
        finishAnimation();
      });
      
    } else {
      // Fallback: CSS transitions (for browsers without WAAPI)
      requestAnimationFrame(() => {
        wallContainer.style.transition = `transform ${duration}ms ${easing}, border-radius ${duration}ms ${easing}`;
        requestAnimationFrame(() => {
          wallContainer.style.transform = 'scale(1)';
          wallContainer.style.borderRadius = finalRadius;
        });
      });
      
      setTimeout(() => {
        wallContainer.style.transition = originalTransition || '';
        html.classList.remove('entrance-transitioning');
        html.classList.add('entrance-complete');
      }, duration + 50);
    }
  }, delay);
}

/**
 * Animates a single element with 3D entrance effect
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Animation options
 */
export function animateElementEntrance(element, options = {}) {
  const g = getGlobals();
  
  if (!element || typeof element.animate !== 'function') {
    // Fallback: just show element
    element.style.opacity = '1';
    return null;
  }
  
  const delay = options.delay ?? 0;
  const duration = options.duration ?? g.entranceElementDuration ?? 800;
  const scaleStart = options.scaleStart ?? g.entranceElementScaleStart ?? 0.95;
  const scaleEnd = options.scaleEnd ?? 1;
  const translateZStart = options.translateZStart ?? g.entranceElementTranslateZStart ?? -20;
  const translateZEnd = options.translateZEnd ?? 0;
  const easing = options.easing ?? g.entranceElementEasing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
  
  // Set initial state
  element.style.opacity = '0';
  element.style.transform = `translateZ(${translateZStart}px) scale(${scaleStart})`;
  element.style.willChange = 'opacity, transform';
  
  // Wait for delay
  setTimeout(() => {
    const anim = element.animate(
      [
        {
          opacity: 0,
          transform: `translateZ(${translateZStart}px) scale(${scaleStart})`
        },
        {
          opacity: 1,
          transform: `translateZ(${translateZEnd}px) scale(${scaleEnd})`
        }
      ],
      {
        duration,
        easing,
        fill: 'forwards'
      }
    );
    
    anim.addEventListener('finish', () => {
      element.style.opacity = '1';
      element.style.transform = `translateZ(${translateZEnd}px) scale(${scaleEnd})`;
      element.style.willChange = 'auto';
    });
    
    anim.addEventListener('cancel', () => {
      element.style.opacity = '1';
      element.style.transform = `translateZ(${translateZEnd}px) scale(${scaleEnd})`;
      element.style.willChange = 'auto';
    });
    
    return anim;
  }, delay);
}

/**
 * Reveals a late element by clearing its inline hidden styles and optionally animating
 * @param {HTMLElement} element - Element to reveal
 * @param {Object} options - Animation options
 *   - delay: ms before animation starts
 *   - duration: animation duration in ms
 *   - easing: CSS easing function
 *   - scaleFrom: starting scale (e.g. 0.9 = 90%)
 *   - scaleTo: ending scale (default 1)
 * @returns {Promise} Resolves when animation completes
 */
export function revealLateElement(element, options = {}) {
  return new Promise((resolve) => {
    if (!element) {
      resolve();
      return;
    }
    
    const g = getGlobals();
    const delay = options.delay ?? 0;
    const duration = (options.duration ?? g.entranceLateElementDuration ?? 600) * 2;
    const easing = options.easing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
    
    setTimeout(() => {
      // Disable ALL transitions to prevent Safari flash
      element.style.transition = 'none';
      element.style.visibility = 'visible';
      
      // Animate with fill: forwards - never cancel, let it hold the final state
      const anim = element.animate(
        [
          { opacity: 0 },
          { opacity: 1 }
        ],
        { duration, easing, fill: 'forwards' }
      );
      
      // After animation finishes, set final state and re-enable transitions
      anim.finished.then(() => {
        // Set inline opacity to match animation end state
        element.style.opacity = '1';
        // Wait a frame before re-enabling transitions
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            element.style.removeProperty('transition');
            document.documentElement.classList.add('entrance-complete');
          });
        });
      }).catch(() => {});
      
      resolve();
    }, delay);
  });
}

/**
 * Reveals the brand logo with a soft blur/scale/translate intro.
 * Maintains the logo's base transform while animating in.
 * @param {HTMLElement} element - Logo element to reveal
 * @param {Object} options - Animation options
 *   - delay: ms before animation starts
 *   - duration: animation duration in ms
 *   - easing: CSS easing function
 * @returns {Promise} Resolves when animation completes
 */
function revealLogoStaggered(element, options = {}) {
  return new Promise((resolve) => {
    if (!element) {
      resolve();
      return;
    }

    const g = getGlobals();
    const delay = options.delay ?? 0;
    const duration = options.duration ?? g.entranceLateElementDuration ?? 600;
    const easing = options.easing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
    const baseScale = 'calc(var(--abs-scene-impact-logo-scale, 1) * var(--brand-logo-user-scale, 1))';
    const fromTransform = `translateY(calc(var(--brand-logo-offset-y) - var(--gap-xs))) scale(calc(${baseScale} * 0.96))`;
    const toTransform = `translateY(var(--brand-logo-offset-y)) scale(${baseScale})`;

    setTimeout(() => {
      element.style.transition = 'none';
      element.style.visibility = 'visible';

      const anim = element.animate(
        [
          {
            opacity: 0,
            transform: fromTransform,
            filter: 'blur(calc(var(--link-impact-blur) * 0.6))'
          },
          {
            opacity: 1,
            transform: toTransform,
            filter: 'blur(0px)'
          }
        ],
        { duration, easing, fill: 'forwards' }
      );

      anim.finished.then(() => {
        element.style.opacity = '1';
        element.style.filter = 'blur(0px)';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            element.style.removeProperty('transition');
            element.style.removeProperty('transform');
            element.style.removeProperty('filter');
            resolve();
          });
        });
      }).catch(() => {
        resolve();
      });
    }, delay);
  });
}

/**
 * Clears inline hidden styles from late elements (for reduced-motion / fallback paths)
 * Call this to ensure nothing stays stuck hidden
 * NOTE: Does NOT clear transform - elements may have CSS transforms (e.g. translateX(-50%))
 */
export function revealAllLateElements() {
  const html = document.documentElement;
  const logo = document.getElementById('brand-logo');
  const mainLinks = document.getElementById('main-links');
  
  // Clear inline styles that hide elements (from HTML initial state)
  if (logo) {
    logo.style.removeProperty('opacity');
    logo.style.visibility = 'visible';
  }
  if (mainLinks) {
    mainLinks.style.removeProperty('opacity');
    mainLinks.style.visibility = 'visible';
  }
  
  // Set entered state - CSS will derive visibility
  html.classList.add('ui-entered');
  
  // Remove the fade-blocking style tag
  const fadeBlocking = document.getElementById('fade-blocking');
  if (fadeBlocking) fadeBlocking.remove();
}

/**
 * Show logo and links with CSS state-based animation
 * Sets html.ui-entered - CSS handles the animation with staggered delays
 */
export function showLogoAndLinks(options = {}) {
  const html = document.documentElement;
  const logo = document.getElementById('brand-logo');
  const mainLinks = document.getElementById('main-links');
  
  // Clear inline styles that hide elements (from HTML initial state)
  if (logo) {
    logo.style.removeProperty('opacity');
    logo.style.visibility = 'visible';
  }
  if (mainLinks) {
    mainLinks.style.removeProperty('opacity');
    mainLinks.style.visibility = 'visible';
  }
  
  // Set entered state - CSS will derive visibility and animate
  // CSS handles staggered delays via --i custom property on each button
  html.classList.add('ui-entered');
}

/**
 * Hide logo and links (when modal opens)
 * This is now handled by modal-overlay.js adding html.modal-active
 * which sets --ui-obscured: 1 and CSS derives opacity: 0
 * 
 * This function is kept for compatibility but does nothing -
 * modal visibility is controlled by the modal-active class on <html>
 */
export function hideLogoAndLinks() {
  // No-op: modal-overlay.js handles this via html.modal-active class
  // CSS derives visibility from --ui-obscured state variable
}

// Legacy aliases for compatibility
export const animateLogoAndLinks = showLogoAndLinks;
export const fadeOutLogoAndLinks = hideLogoAndLinks;
export const fadeInLogoAndLinks = showLogoAndLinks;

/**
 * Simple 200ms fade-in for reduced motion users.
 * Shows content quickly without jarring instant appearance.
 */
function performReducedMotionFade() {
  const fadeTarget = document.getElementById('app-frame');
  const brandLogo = document.getElementById('brand-logo');
  const mainLinks = document.getElementById('main-links');
  const buttons = mainLinks ? Array.from(mainLinks.querySelectorAll('.footer_link')) : [];
  const html = document.documentElement;
  
  // Mark entrance as complete immediately
  html.classList.remove('entrance-pre-transition', 'entrance-transitioning');
  html.classList.add('entrance-complete');
  
  // Simple 200ms fade for all elements
  const elements = [fadeTarget, brandLogo, mainLinks, ...buttons].filter(Boolean);
  elements.forEach(el => {
    el.style.transition = 'opacity 200ms ease-out';
    el.style.opacity = '0';
    el.style.visibility = 'visible';
  });
  
  // Trigger reflow then fade in
  fadeTarget?.offsetHeight;
  
  requestAnimationFrame(() => {
    elements.forEach(el => {
      el.style.opacity = '1';
    });
    
    // Cleanup after animation
    setTimeout(() => {
      elements.forEach(el => {
        el.style.removeProperty('transition');
        el.style.removeProperty('opacity');
        el.style.removeProperty('filter');
        el.style.removeProperty('transform');
      });
      
      // Remove fade-blocking
      const fadeBlocking = document.getElementById('fade-blocking');
      if (fadeBlocking) fadeBlocking.remove();
    }, 250);
  });
}

/**
 * Orchestrates the complete entrance sequence
 * @param {Object} options - Configuration options
 *   - waitForFonts: async function to wait for fonts
 *   - skipWallAnimation: boolean to skip wall growth animation
 *   - skipEntranceAnimation: boolean to skip all entrance animation (View Transition handles it)
 *   - centralContent: array of selectors/elements for page-specific central content
 *   - reducedMotion: boolean to use simple 200ms fade (auto-detected if not provided)
 */
export async function orchestrateEntrance(options = {}) {
  const g = getGlobals();
  const skipWallAnimation = Boolean(options.skipWallAnimation);
  const skipEntranceAnimation = Boolean(options.skipEntranceAnimation);
  const centralContent = options.centralContent || [];
  
  // Check for reduced motion preference
  const reducedMotion = options.reducedMotion ?? 
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  
  // Apply aspect ratio detection (always needed for layout)
  applyAspectRatioClass();
  applyPerspectiveCSS();
  
  // Wait for fonts to load
  if (options.waitForFonts) {
    await options.waitForFonts();
  }
  
  // Skip entrance entirely if View Transition just ran (Chrome handles animation)
  if (skipEntranceAnimation) {
    document.documentElement.classList.remove('entrance-pre-transition', 'entrance-transitioning');
    document.documentElement.classList.add('entrance-complete');
    // Just reveal elements that may be hidden
    revealAllLateElements();
    console.log('✓ Entrance skipped (View Transition handled animation)');
    return;
  }
  
  // Reduced motion: simple 200ms fade (not instant, not jarring)
  if (reducedMotion) {
    performReducedMotionFade();
    return;
  }
  
  // Set initial browser default state unless caller wants the wall already present
  if (!skipWallAnimation) {
    setInitialBrowserDefaultState();
  } else {
    document.documentElement.classList.remove('entrance-pre-transition', 'entrance-transitioning');
    document.documentElement.classList.add('entrance-complete');
  }
  
  // Start wall-state transition (optional)
  if (!skipWallAnimation) {
    transitionToWallState();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STAGED ELEMENT REVEAL SEQUENCE
  // Order: #abs-scene fade → #brand-logo → #main-links (buttons sequentially)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const elementEasing = g.entranceElementEasing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
  
  // Content fade-in config
  const contentFadeDelay = g.contentFadeInDelay ?? 500;
  const contentFadeDuration = g.contentFadeInDuration ?? 1000;
  
  // Logo and links timing
  const lateElementDuration = g.entranceLateElementDuration ?? 500;
  const linkStagger = 80; // Stagger between each link button
  
  // 1. Fade in entire scene (#abs-scene)
  const fadeTarget = document.getElementById('abs-scene');
  if (fadeTarget) {
    const fadeBlocking = document.getElementById('fade-blocking');
    if (fadeBlocking) fadeBlocking.remove();
    
    fadeTarget.style.opacity = '0';
    fadeTarget.style.visibility = 'visible';
    fadeTarget.style.willChange = 'opacity';
    
    setTimeout(() => {
      if (typeof fadeTarget.animate === 'function') {
        const anim = fadeTarget.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: contentFadeDuration, easing: elementEasing, fill: 'forwards' }
        );
        anim.addEventListener('finish', () => {
          fadeTarget.style.opacity = '1';
          fadeTarget.style.willChange = 'auto';
        });
        anim.addEventListener('cancel', () => {
          fadeTarget.style.opacity = '1';
          fadeTarget.style.willChange = 'auto';
        });
      } else {
        fadeTarget.style.transition = `opacity ${contentFadeDuration}ms ${elementEasing}`;
        requestAnimationFrame(() => { fadeTarget.style.opacity = '1'; });
      }
    }, contentFadeDelay);
  }
  
  // 2. Reveal brand logo (after main UI)
  const logoLinksDelay = contentFadeDelay + contentFadeDuration * 0.6;
  const brandLogo = document.getElementById('brand-logo');
  if (brandLogo) {
    setTimeout(() => {
      revealLogoStaggered(brandLogo, {
        delay: 0,
        duration: lateElementDuration,
        easing: elementEasing
      });
    }, logoLinksDelay);
  }
  
  // 3. Central content (page-specific) - animate after logo/links start
  const contentElements = [];
  for (const item of centralContent) {
    const el = typeof item === 'string' ? document.querySelector(item) : item;
    if (el) contentElements.push(el);
  }
  
  const centralContentDelay = logoLinksDelay + lateElementDuration * 0.5;
  for (let i = 0; i < contentElements.length; i++) {
    const el = contentElements[i];
    setTimeout(() => {
      revealLateElement(el, {
        delay: 0,
        duration: lateElementDuration,
        easing: elementEasing,
        scaleFrom: g.entranceLateElementScaleFrom ?? 0.92
      });
    }, centralContentDelay + i * 150);
  }
  
  // 4. Reveal main links LAST (if present)
  const mainLinksDelay = logoLinksDelay + lateElementDuration * 0.35;
  const mainLinks = document.getElementById('main-links');
  if (mainLinks) {
    mainLinks.classList.add('main-links--staggered');
    setTimeout(() => {
      mainLinks.style.transition = 'none';
      mainLinks.style.visibility = 'visible';
      mainLinks.style.opacity = '1';
      mainLinks.classList.add('main-links--staggered-in');
      requestAnimationFrame(() => {
        mainLinks.style.removeProperty('transition');
      });
      
      // Remove stagger classes after animation completes so hover animations can work
      // Duration: 600ms animation + 600ms last child delay + buffer
      const staggerDuration = 600 + 600 + 100;
      setTimeout(() => {
        // Lock final state on each link before removing animation classes
        const links = mainLinks.querySelectorAll('.footer_link');
        links.forEach(link => {
          link.style.opacity = '1';
          link.style.transform = 'translateY(0) scale(1)';
          link.style.filter = 'blur(0)';
        });
        mainLinks.classList.remove('main-links--staggered', 'main-links--staggered-in');
      }, staggerDuration);
    }, mainLinksDelay);
  }
  
  // Note: fade-blocking style tag is removed before app-frame animation starts above
}
