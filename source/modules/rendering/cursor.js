// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          CUSTOM CURSOR RENDERER                              ║
// ║     Border area: default cursor | Simulation: cursor scales down to dot      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

let cursorElement = null;
let isInitialized = false;
let isInSimulation = false;
let baseSize = 0;

/**
 * Check if mouse is inside simulation container
 */
function isMouseInSimulation(clientX, clientY) {
  const container = document.getElementById('bravia-balls');
  if (!container) return false;
  
  const rect = container.getBoundingClientRect();
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

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
  
  isInitialized = true;
  updateCursorSize();
}

/**
 * Update cursor size based on state
 * Size matches average ball size multiplied by cursorSize
 */
export function updateCursorSize() {
  if (!cursorElement) return;
  
  const globals = getGlobals();
  const averageBallSize = (globals.R_MIN + globals.R_MAX) / 2;
  const cursorRadius = averageBallSize * globals.cursorSize;
  baseSize = cursorRadius * 2;
  
  cursorElement.style.width = `${baseSize}px`;
  cursorElement.style.height = `${baseSize}px`;
  cursorElement.style.borderRadius = '50%';
  // Remove margin offsets - transform translate(-50%, -50%) handles centering
  cursorElement.style.marginLeft = '0';
  cursorElement.style.marginTop = '0';
  
  // Reset transform if not in simulation
  if (!isInSimulation) {
    cursorElement.style.transform = 'translate(-50%, -50%) scale(1)';
    cursorElement.style.opacity = '1';
  }
}

/**
 * Update cursor position and state
 * Called from pointer.js on mouse move
 */
export function updateCursorPosition(clientX, clientY) {
  if (!cursorElement) return;
  
  const wasInSimulation = isInSimulation;
  isInSimulation = isMouseInSimulation(clientX, clientY);
  
  cursorElement.style.left = `${clientX}px`;
  cursorElement.style.top = `${clientY}px`;
  
  // Always hide default cursor - we use custom cursor only
  document.body.style.cursor = 'none';
  
  // Transition between border and simulation
  if (isInSimulation) {
    // In simulation: show cursor and animate to visible dot
    cursorElement.style.display = 'block';
    
    if (!wasInSimulation) {
      // Entering simulation: show at full size first, then animate to visible dot
      cursorElement.style.transform = 'translate(-50%, -50%) scale(1)';
      cursorElement.style.opacity = '1';
      // Force reflow to ensure initial state is rendered
      cursorElement.offsetHeight;
      // Then animate to visible dot (larger scale, full opacity for visibility)
      requestAnimationFrame(() => {
        cursorElement.style.transform = 'translate(-50%, -50%) scale(0.25)';
        cursorElement.style.opacity = '1';
      });
    } else {
      // Already in simulation - ensure dot state is maintained
      cursorElement.style.opacity = '1';

      // Check if we're already at dot scale, if not set it
      const currentTransform = cursorElement.style.transform;
      if (!currentTransform.includes('scale(0.25)')) {
        cursorElement.style.transform = 'translate(-50%, -50%) scale(0.25)';
      }
    }
  } else {
    // In border area: hide custom cursor completely
    cursorElement.style.display = 'none';
    if (wasInSimulation) {
      // Reset transform for next entry
      cursorElement.style.transform = 'translate(-50%, -50%) scale(1)';
      cursorElement.style.opacity = '1';
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
