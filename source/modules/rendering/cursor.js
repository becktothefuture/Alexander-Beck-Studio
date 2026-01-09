// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          CUSTOM CURSOR RENDERER                              ║
// ║     Border area: default cursor | Simulation: cursor scales down to dot      ║
// ║     Gate overlays: cursor shows at full size (round button)                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { isOverlayActive } from '../ui/modal-overlay.js';

let cursorElement = null;
let isInitialized = false;
let isInSimulation = false;
let cachedContainerRect = null;
let rectCacheTime = 0;
const RECT_CACHE_MS = 100; // Cache rect for 100ms to avoid excessive layout reads
let fadeInStarted = false;
let fadeInAnimation = null;

/**
 * Check if mouse is inside simulation container
 * Uses cached bounding rect for performance
 */
function isMouseInSimulation(clientX, clientY) {
  const container = document.getElementById('bravia-balls');
  if (!container) return false;
  
  // Cache rect to avoid expensive layout reads on every mouse move
  const now = performance.now();
  if (!cachedContainerRect || (now - rectCacheTime) > RECT_CACHE_MS) {
    cachedContainerRect = container.getBoundingClientRect();
    rectCacheTime = now;
  }
  
  const rect = cachedContainerRect;
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

/**
 * Get the current cursor color
 * Used for trail rendering
 * @returns {string} Cursor hex color
 */
export function getCursorColor() {
  const globals = getGlobals();
  return (globals?.cursorColorHex && typeof globals.cursorColorHex === 'string') 
    ? globals.cursorColorHex 
    : '#000000';
}

// Legacy export name for backward compatibility
export const getCursorBrightenedColor = getCursorColor;

/**
 * Initialize custom cursor element
 * Creates a circular cursor that follows the mouse
 */
export function setupCustomCursor() {
  if (isInitialized) return;
  
  // Create cursor element
  cursorElement = document.createElement('div');
  cursorElement.id = 'custom-cursor';
  cursorElement.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursorElement);
  
  // Show default cursor in border area, hide in simulation
  // We'll control this dynamically based on mouse position
  
  // Initially hide cursor (will show when mouse moves)
  cursorElement.style.display = 'none';
  // Start with opacity 0 for fade-in animation
  cursorElement.style.opacity = '0';
  
  isInitialized = true;
  updateCursorSize();
  
  // Start fade-in animation after page fade-in completes
  startCursorFadeIn();
}

/**
 * Update cursor size based on state
 * Size matches average ball size multiplied by cursorSize
 */
export function updateCursorSize() {
  if (!cursorElement) return;
  
  const globals = getGlobals();
  const averageBallSize = (globals.R_MIN + globals.R_MAX) * 0.5;
  const baseSize = averageBallSize * globals.cursorSize * 2;
  
  cursorElement.style.width = `${baseSize}px`;
  cursorElement.style.height = `${baseSize}px`;
  cursorElement.style.borderRadius = '50%';
  cursorElement.style.marginLeft = '0';
  cursorElement.style.marginTop = '0';
  
  // Reset transform if not in simulation
  if (!isInSimulation) {
    cursorElement.style.transform = 'translate(-50%, -50%) scale(1)';
    // Don't set opacity - let fade-in animation control it
  }
}

const DOT_SCALE = 'translate(-50%, -50%) scale(0.25)';
const FULL_SCALE = 'translate(-50%, -50%) scale(1)';

/**
 * Check if hovering over a link
 * @returns {boolean} True if body has abs-link-hovering class
 */
function isHoveringOverLink() {
  try {
    return Boolean(document?.body?.classList?.contains?.('abs-link-hovering'));
  } catch (e) {
    return false;
  }
}

/**
 * Check if cursor fade-in has completed
 * @returns {boolean} True if fade-in is complete or not started
 */
function isFadeInComplete() {
  if (!fadeInStarted) return false; // Fade-in hasn't started yet, don't allow opacity changes
  if (!fadeInAnimation) return true; // Animation not created (fallback path), allow opacity
  return fadeInAnimation.playState === 'finished';
}

/**
 * Update cursor position and state
 * Called from pointer.js on mouse move
 * @param {number} clientX - Mouse X position
 * @param {number} clientY - Mouse Y position
 */
export function updateCursorPosition(clientX, clientY) {
  if (!cursorElement) return;
  
  // Hide cursor when hovering over links (trail is already suppressed)
  const isOverLink = isHoveringOverLink();
  if (isOverLink) {
    cursorElement.style.display = 'none';
    return;
  }
  
  const wasInSimulation = isInSimulation;
  isInSimulation = isMouseInSimulation(clientX, clientY);
  
  // Check if gate overlay is active - cursor should show at full size
  const overlayIsActive = isOverlayActive();
  
  cursorElement.style.left = `${clientX}px`;
  cursorElement.style.top = `${clientY}px`;
  document.body.style.cursor = 'none';
  
  // When gate overlay is active, show cursor at full size (round button)
  if (overlayIsActive) {
    cursorElement.style.display = 'block';
    cursorElement.style.transform = FULL_SCALE;
    return;
  }
  
  if (isInSimulation) {
    cursorElement.style.display = 'block';
    
    if (!wasInSimulation) {
      // Entering simulation: animate from full size to dot
      cursorElement.style.transform = FULL_SCALE;
      // Don't set opacity - let fade-in animation control it
      cursorElement.offsetHeight; // Force reflow
      requestAnimationFrame(() => {
        cursorElement.style.transform = DOT_SCALE;
        // Don't set opacity - let fade-in animation control it
      });
    } else {
      // Already in simulation: maintain dot state
      // Don't set opacity - let fade-in animation control it
      if (cursorElement.style.transform !== DOT_SCALE) {
        cursorElement.style.transform = DOT_SCALE;
      }
    }
  } else {
    // Border area: hide cursor
    cursorElement.style.display = 'none';
    if (wasInSimulation) {
      cursorElement.style.transform = FULL_SCALE;
      // Don't set opacity - let fade-in animation control it
      cursorElement.style.backgroundColor = '';
      cursorElement.style.filter = '';
    }
  }
}

/**
 * Hide cursor (when mouse leaves window)
 */
export function hideCursor() {
  if (!cursorElement) return;
  
  cursorElement.style.display = 'none';
  document.body.style.cursor = 'none';
  isInSimulation = false;
}

/**
 * Show cursor (when mouse enters window)
 */
export function showCursor() {
  if (!cursorElement) return;
  // Will be shown/hidden by updateCursorPosition based on location
  isInSimulation = false;
}

/**
 * Start cursor fade-in animation
 * Cursor fades in slowly after page fade-in completes, ensuring alignment with trail
 */
function startCursorFadeIn() {
  if (fadeInStarted || !cursorElement) return;
  fadeInStarted = true;
  
  // Calculate timing based on entrance animation
  // Page fade-in completes around: wallDelay (300ms) + wallDuration*0.3 (240ms) + elementDuration (500ms) = ~1040ms
  // Start cursor fade-in after page fade-in completes, with additional delay for alignment
  const globals = getGlobals();
  const wallDelay = globals.entranceWallTransitionDelay ?? 300;
  const wallDuration = globals.entranceWallTransitionDuration ?? 800;
  const elementDuration = globals.entranceElementDuration ?? 500;
  const pageFadeComplete = wallDelay + (wallDuration * 0.3) + elementDuration;
  
  // Cursor fade-in starts after page fade-in completes + extra delay for alignment
  // Increased delay to ensure canvas rect is fully synchronized with trail
  const CURSOR_FADE_DELAY = pageFadeComplete + 600; // 600ms extra for alignment and rect sync
  const CURSOR_FADE_DURATION = 800; // Slow fade-in (800ms)
  const CURSOR_FADE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'; // Same as page fade-in
  
  // Respect reduced motion preference
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    // Skip animation, show immediately after delay
    setTimeout(() => {
      if (cursorElement) {
        cursorElement.style.opacity = '1';
      }
    }, CURSOR_FADE_DELAY);
    return;
  }
  
  setTimeout(() => {
    if (!cursorElement) return;
    
    // Wait for canvas rect to be properly initialized and layout to settle
    // This ensures cursor and trail are aligned before fade-in starts
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cursorElement) return;
        
        // Check if WAAPI is available
        if (typeof cursorElement.animate !== 'function') {
          // Fallback: simple opacity transition
          cursorElement.style.opacity = '1';
          cursorElement.style.transition = `opacity ${CURSOR_FADE_DURATION}ms ${CURSOR_FADE_EASING}`;
          return;
        }
        
        // Make cursor visible (but transparent) so fade-in animation can be seen
        // Only if mouse is in simulation area (otherwise it will show when mouse moves)
        if (isInSimulation) {
          cursorElement.style.display = 'block';
        }
        
        // Animate fade-in using WAAPI
        fadeInAnimation = cursorElement.animate(
          [
            { opacity: 0 },
            { opacity: 1 }
          ],
          {
            duration: CURSOR_FADE_DURATION,
            easing: CURSOR_FADE_EASING,
            fill: 'forwards'
          }
        );
        
        // Stamp final opacity on finish to prevent getting stuck
        fadeInAnimation?.addEventListener?.('finish', () => {
          if (cursorElement) {
            cursorElement.style.opacity = '1';
          }
        });
        
        fadeInAnimation?.addEventListener?.('cancel', () => {
          // Failsafe: ensure cursor is visible if animation is canceled
          if (cursorElement) {
            cursorElement.style.opacity = '1';
          }
        });
      });
    });
  }, CURSOR_FADE_DELAY);
}
