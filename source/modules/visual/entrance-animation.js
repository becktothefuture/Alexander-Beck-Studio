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
 */
export function setInitialBrowserDefaultState() {
  const html = document.documentElement;
  const g = getGlobals();
  
  // Get original wall color from config or CSS
  const root = getComputedStyle(html);
  const resolvedWallColor = root.getPropertyValue('--wall-color').trim();
  const hasBodyDark = document.body && document.body.classList.contains('dark-mode');
  const isDarkMode = html.classList.contains('dark-mode') || hasBodyDark || g.isDarkMode;

  // Theme-aware wall colors with safe fallbacks (never white)
  // Use #f5f5f5 for light and #0a0a0a for dark (safe fallbacks; never white)
  const wallColorLight = g.frameColorLight || readTokenVar('--wall-color-light', '#f5f5f5');
  const wallColorDark = g.frameColorDark || readTokenVar('--wall-color-dark', '#0a0a0a');

  const originalWallColor = resolvedWallColor || (isDarkMode ? wallColorDark : wallColorLight);
  
  // Store original color for transition
  html.dataset.originalWallColor = originalWallColor;
  
  // Set browser default background based on current theme
  // IMPORTANT: Never fallback to #ffffff - use theme-correct wall colors throughout
  const browserDefaultBg = isDarkMode
    ? (g.browserDefaultBgDark || wallColorDark || originalWallColor || '#0a0a0a')
    : (g.browserDefaultBgLight || wallColorLight || originalWallColor || '#f5f5f5');

  html.style.setProperty('--wall-color', browserDefaultBg, 'important');
  html.style.setProperty('background', browserDefaultBg, 'important');
  html.style.setProperty('background-color', browserDefaultBg, 'important');
  
  // Hide all custom-styled elements initially
  html.classList.add('entrance-pre-transition');
}

/**
 * Transitions from browser default to wall-state
 * Wall "grows" from beyond the viewport with synchronized scale and corner rounding
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
        const originalColor = html.dataset.originalWallColor || g.frameColor || '#0a0a0a';
        html.style.setProperty('--wall-color', originalColor);
        html.style.setProperty('background', originalColor);
        html.style.setProperty('background-color', originalColor);
        setTimeout(() => {
          html.classList.remove('entrance-transitioning');
          html.classList.add('entrance-complete');
          // Remove inline --wall-color override so CSS can control it based on theme
          html.style.removeProperty('--wall-color');
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
    // PHASE 2: REVEAL (remove browser default, show wall)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    html.classList.remove('entrance-pre-transition');
    html.classList.add('entrance-transitioning');
    
    // Restore wall color immediately
    const originalColor = html.dataset.originalWallColor || g.frameColor || '#0a0a0a';
    html.style.setProperty('--wall-color', originalColor);
    html.style.setProperty('background', originalColor);
    html.style.setProperty('background-color', originalColor);
    
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
            // Remove inline --wall-color override so CSS can control it based on theme
            html.style.removeProperty('--wall-color');
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
        // Remove inline --wall-color override so CSS can control it based on theme
        html.style.removeProperty('--wall-color');
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
    // Double the duration for more dramatic effect
    const baseDuration = options.duration ?? g.entranceLateElementDuration ?? 600;
    const duration = baseDuration * 2;
    const easing = options.easing ?? g.entranceElementEasing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
    const scaleFrom = options.scaleFrom ?? g.entranceLateElementScaleFrom ?? 0.92;
    const scaleTo = options.scaleTo ?? 1;
    const blurFrom = options.blurFrom ?? 8; // Start with blur
    const blurTo = options.blurTo ?? 0; // End with no blur
    const animate = options.animate !== false && typeof element.animate === 'function';
    
    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;
      // Clear inline hidden styles so CSS can take over
      // NOTE: Do NOT clear transform - elements may have CSS transforms (e.g. translateX(-50%))
      element.style.opacity = '1';
      element.style.visibility = 'visible';
      element.style.filter = 'blur(0px)';
      element.style.willChange = 'auto';
      resolve();
    };
    
    setTimeout(() => {
      if (animate) {
        element.style.visibility = 'visible';
        element.style.willChange = 'opacity, transform, filter';
        
        // Get existing CSS transform (e.g. translateX(-50%) for centering)
        // We'll combine it with scale so both transforms work together
        const computedStyle = window.getComputedStyle(element);
        const existingTransform = computedStyle.transform;
        
        // Set transform-origin to center so scaling happens from the middle
        element.style.transformOrigin = 'center center';
        
        // Parse existing transform to extract translate values
        // If transform is "none" or empty, we'll just use scale
        let translateX = 0;
        let translateY = 0;
        
        if (existingTransform && existingTransform !== 'none') {
          // Try to extract translateX from matrix or translate
          const matrixMatch = existingTransform.match(/matrix\([^)]+\)/);
          if (matrixMatch) {
            const matrix = matrixMatch[0].match(/[-+]?[0-9]*\.?[0-9]+/g);
            if (matrix && matrix.length >= 4) {
              translateX = parseFloat(matrix[4]) || 0;
              translateY = parseFloat(matrix[5]) || 0;
            }
          } else {
            const translateMatch = existingTransform.match(/translateX\(([^)]+)\)/);
            if (translateMatch) {
              translateX = parseFloat(translateMatch[1]) || 0;
            }
          }
        }
        
        // Animate opacity + scale + blur, preserving existing translate
        const anim = element.animate(
          [
            { 
              opacity: 0, 
              transform: `translate(${translateX}px, ${translateY}px) scale(${scaleFrom})`,
              filter: `blur(${blurFrom}px)`
            },
            { 
              opacity: 1, 
              transform: `translate(${translateX}px, ${translateY}px) scale(${scaleTo})`,
              filter: `blur(${blurTo}px)`
            }
          ],
          { duration, easing, fill: 'forwards' }
        );
        
        anim.addEventListener('finish', finalize);
        anim.addEventListener('cancel', finalize);
        
        // Safety timeout: ensure element is revealed even if animation fails
        setTimeout(finalize, duration + 100);
      } else {
        finalize();
      }
    }, delay);
  });
}

/**
 * Clears inline hidden styles from late elements (for reduced-motion / fallback paths)
 * Call this to ensure nothing stays stuck hidden
 * NOTE: Does NOT clear transform - elements may have CSS transforms (e.g. translateX(-50%))
 */
export function revealAllLateElements() {
  const lateElements = [
    document.getElementById('main-links'),
    document.getElementById('brand-logo')
  ];
  
  lateElements.forEach((el) => {
    if (el) {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      // Do NOT clear transform - CSS may rely on it for positioning
    }
  });
  
  // Also remove the fade-blocking style tag
  const fadeBlocking = document.getElementById('fade-blocking');
  if (fadeBlocking) fadeBlocking.remove();
}

/**
 * Orchestrates the complete entrance sequence
 * @param {Object} options - Configuration options
 *   - waitForFonts: async function to wait for fonts
 *   - skipWallAnimation: boolean to skip wall growth animation
 *   - centralContent: array of selectors/elements for page-specific central content
 */
export async function orchestrateEntrance(options = {}) {
  const g = getGlobals();
  const skipWallAnimation = Boolean(options.skipWallAnimation);
  const centralContent = options.centralContent || [];
  
  // Apply aspect ratio detection
  applyAspectRatioClass();
  applyPerspectiveCSS();
  
  // Set initial browser default state unless caller wants the wall already present
  if (!skipWallAnimation) {
    setInitialBrowserDefaultState();
  } else {
    document.documentElement.classList.remove('entrance-pre-transition', 'entrance-transitioning');
    document.documentElement.classList.add('entrance-complete');
  }
  
  // Wait for fonts to load
  if (options.waitForFonts) {
    await options.waitForFonts();
  }
  
  // Start wall-state transition (optional)
  if (!skipWallAnimation) {
    transitionToWallState();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STAGED ELEMENT REVEAL SEQUENCE
  // Order: #app-frame (main UI) → #brand-logo → centralContent → #main-links (last)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const wallDelay = g.entranceWallTransitionDelay ?? 300;
  const wallDuration = g.entranceWallTransitionDuration ?? 800;
  const elementDuration = g.entranceElementDuration ?? 500;
  const elementEasing = g.entranceElementEasing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
  
  // Late element timing (logo + main links + central content) - slower and more dramatic
  const lateElementDuration = g.entranceLateElementDuration ?? 600;
  const lateStagger = g.entranceLateElementStagger ?? 250; // Stagger between late elements
  
  // Calculate timing
  const appFrameDelay = skipWallAnimation ? 0 : (wallDelay + (wallDuration * 0.3));
  let currentDelay = appFrameDelay + elementDuration + lateStagger;
  
  // 1. Animate main UI wrapper (#app-frame)
  const fadeTarget = document.getElementById('app-frame');
  if (fadeTarget) {
    animateElementEntrance(fadeTarget, {
      delay: appFrameDelay,
      duration: elementDuration,
      scaleStart: g.entranceElementScaleStart ?? 0.95,
      translateZStart: g.entranceElementTranslateZStart ?? -20,
      easing: elementEasing
    });
  }
  
  // 2. Reveal brand logo (after main UI)
  const brandLogo = document.getElementById('brand-logo');
  if (brandLogo) {
    const brandLogoDelay = currentDelay;
    revealLateElement(brandLogo, {
      delay: brandLogoDelay,
      duration: lateElementDuration,
      easing: elementEasing,
      scaleFrom: g.entranceLateElementScaleFrom ?? 0.92
    });
    currentDelay += lateStagger;
  }
  
  // 3. Reveal central content (page-specific: portfolio stage/meta, CV content, etc.)
  const contentElements = [];
  for (const item of centralContent) {
    const el = typeof item === 'string' ? document.querySelector(item) : item;
    if (el) contentElements.push(el);
  }
  
  for (const el of contentElements) {
    revealLateElement(el, {
      delay: currentDelay,
      duration: lateElementDuration,
      easing: elementEasing,
      scaleFrom: g.entranceLateElementScaleFrom ?? 0.92
    });
    currentDelay += lateStagger;
  }
  
  // 4. Reveal main links LAST (if present)
  const mainLinks = document.getElementById('main-links');
  if (mainLinks) {
    revealLateElement(mainLinks, {
      delay: currentDelay,
      duration: lateElementDuration,
      easing: elementEasing,
      scaleFrom: g.entranceLateElementScaleFrom ?? 0.92
    });
    currentDelay += lateStagger;
  }
  
  // Remove fade-blocking style tag after all animations start
  setTimeout(() => {
    const fadeBlocking = document.getElementById('fade-blocking');
    if (fadeBlocking) fadeBlocking.remove();
  }, currentDelay + 100);
}
