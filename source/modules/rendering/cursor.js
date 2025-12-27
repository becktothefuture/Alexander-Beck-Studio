// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          CUSTOM CURSOR RENDERER                              ║
// ║     Border area: default cursor | Simulation: cursor scales down to dot      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

let cursorElement = null;
let cursorOverlay = null; // White overlay for blend mode brightening
let isInitialized = false;
let isInSimulation = false;
let baseSize = 0;
let currentVelocity = 0;
let lastVelocityUpdateTime = 0;
// Velocity smoothing for smooth color transitions
let smoothedVelocity = 0;
let decayAnimationFrameId = null;

// Velocity thresholds for robust effect
// Common cursor speeds: ~0.1-0.3 px/ms
// Fast cursor speeds: ~0.5-1.0+ px/ms
const MIN_VELOCITY_THRESHOLD = 0.35; // px/ms - below this, no effect (keeps palette color at common speeds)
const MAX_VELOCITY_THRESHOLD = 1.2; // px/ms - above this, max vibrancy reached
const VELOCITY_SMOOTH_FACTOR = 0.25; // How quickly velocity increases affect color
const VELOCITY_DECAY_FACTOR = 0.4; // Faster decay when idle (higher = faster fade)
const IDLE_DECAY_RATE = 0.91; // Per frame decay when mouse stops moving (lower = faster decay)

// Vibrancy effect parameters (using blend mode overlay opacity)
// Overlay blend mode increases saturation and contrast for vibrant colors
const MIN_VIBRANCY_OPACITY = 0.0; // Overlay opacity at min speed (0% = no effect, stays in palette)
const MAX_VIBRANCY_OPACITY = 0.85; // Overlay opacity at max speed (85% = strong vibrancy via overlay blend)

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
 * Continuous decay loop for velocity effects
 * Runs even when mouse isn't moving to ensure it always returns to resting state
 */
function startDecayLoop() {
  if (decayAnimationFrameId !== null) return; // Already running
  
  function decayLoop() {
    if (!cursorElement || !isInSimulation) {
      // Ensure resting state before stopping
      if (cursorOverlay) {
        cursorOverlay.style.opacity = '0';
      }
      smoothedVelocity = 0;
      decayAnimationFrameId = null;
      return;
    }
    
    const now = performance.now();
    const timeSinceUpdate = now - lastVelocityUpdateTime;
    
    // If mouse hasn't moved in ~100ms, start decaying
    if (timeSinceUpdate > 100) {
      if (smoothedVelocity > 0.001) {
        smoothedVelocity *= IDLE_DECAY_RATE;
        if (smoothedVelocity < 0.001) smoothedVelocity = 0;
        
        // Clamp to ensure we don't go below 0
        smoothedVelocity = Math.max(0, smoothedVelocity);
      } else {
        // Already at or below threshold, ensure it's exactly 0
        smoothedVelocity = 0;
      }
      
      // Always update effects to ensure resting state is applied
      updateCursorEffects();
      
      // If velocity is effectively zero, ensure overlay is explicitly reset
      if (smoothedVelocity <= 0.001 && cursorOverlay) {
        cursorOverlay.style.opacity = '0';
      }
    }
    
    decayAnimationFrameId = requestAnimationFrame(decayLoop);
  }
  
  decayAnimationFrameId = requestAnimationFrame(decayLoop);
}

/**
 * Stop the decay loop
 */
function stopDecayLoop() {
  if (decayAnimationFrameId !== null) {
    cancelAnimationFrame(decayAnimationFrameId);
    decayAnimationFrameId = null;
  }
}

/**
 * Calculate normalized velocity ratio (0-1) with min/max thresholds
 * @returns {number} Normalized velocity ratio from 0 (min speed) to 1 (max speed)
 */
function getNormalizedVelocityRatio() {
  // Clamp velocity to thresholds
  const clampedVelocity = Math.max(0, Math.min(smoothedVelocity, MAX_VELOCITY_THRESHOLD));
  
  // If below minimum threshold, return 0 (no effect)
  if (clampedVelocity < MIN_VELOCITY_THRESHOLD) {
    return 0;
  }
  
  // Normalize between min and max thresholds
  const range = MAX_VELOCITY_THRESHOLD - MIN_VELOCITY_THRESHOLD;
  const normalized = (clampedVelocity - MIN_VELOCITY_THRESHOLD) / range;
  
  // Clamp to 0-1 for safety
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Apply vibrancy to hex color using overlay blend mode simulation
 * This is used for the trail which can't use CSS blend modes
 * Overlay blend mode increases saturation and contrast for vibrant colors
 * @param {string} hex - Hex color string (e.g., '#ff4013')
 * @param {number} overlayOpacity - Overlay opacity (0-1) representing blend mode vibrancy
 * @returns {string} More vibrant hex color
 */
function applyBrightnessToHex(hex, overlayOpacity) {
  if (!hex || typeof hex !== 'string') return '#000000';
  if (overlayOpacity <= 0) return hex; // No effect, return original
  
  // Parse hex to RGB
  const h = hex.trim();
  const s = h[0] === '#' ? h.slice(1) : h;
  if (!(s.length === 3 || s.length === 6)) return hex;
  
  const full = s.length === 3
    ? (s[0] + s[0] + s[1] + s[1] + s[2] + s[2])
    : s;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return hex;
  
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  
  // Convert to 0-1 range for blend calculations
  const r01 = r / 255;
  const g01 = g / 255;
  const b01 = b / 255;
  
  // White overlay for overlay blend mode
  const white = 1.0;
  
  // Overlay blend mode simulation:
  // If base < 0.5: multiply (2 * base * overlay)
  // If base >= 0.5: screen (1 - 2 * (1 - base) * (1 - overlay))
  // This increases contrast and saturation, making colors more vibrant
  function overlayBlend(base, overlay) {
    if (base < 0.5) {
      return 2 * base * overlay;
    } else {
      return 1 - 2 * (1 - base) * (1 - overlay);
    }
  }
  
  // Apply overlay blend mode
  const blendedR = overlayBlend(r01, white);
  const blendedG = overlayBlend(g01, white);
  const blendedB = overlayBlend(b01, white);
  
  // Interpolate between original and blended based on opacity
  // Apply stronger effect with enhanced saturation boost
  const intensity = overlayOpacity * 1.15; // Boost intensity by 15% for stronger effect
  const finalR = r01 + (blendedR - r01) * intensity;
  const finalG = g01 + (blendedG - g01) * intensity;
  const finalB = b01 + (blendedB - b01) * intensity;
  
  // Additional saturation boost for stronger vibrancy
  // Increase saturation by pushing colors away from gray
  const luminance = 0.299 * finalR + 0.587 * finalG + 0.114 * finalB;
  const satBoost = overlayOpacity * 0.2; // Additional 20% saturation boost at max
  const boostedR = finalR + (finalR - luminance) * satBoost;
  const boostedG = finalG + (finalG - luminance) * satBoost;
  const boostedB = finalB + (finalB - luminance) * satBoost;
  
  // Use boosted values
  const finalRBoosted = Math.max(0, Math.min(1, boostedR));
  const finalGBoosted = Math.max(0, Math.min(1, boostedG));
  const finalBBoosted = Math.max(0, Math.min(1, boostedB));
  
  // Convert back to 0-255 range and clamp
  r = Math.max(0, Math.min(255, Math.round(finalRBoosted * 255)));
  g = Math.max(0, Math.min(255, Math.round(finalGBoosted * 255)));
  b = Math.max(0, Math.min(255, Math.round(finalBBoosted * 255)));
  
  // Convert back to hex
  const rgb = (r << 16) | (g << 8) | b;
  return `#${rgb.toString(16).padStart(6, '0')}`;
}

/**
 * Get the current brightened cursor color based on velocity
 * Used for trail rendering (simulates blend mode brightening)
 * @returns {string} Brightened hex color
 */
export function getCursorBrightenedColor() {
  const globals = getGlobals();
  const baseColor = (globals && typeof globals.cursorColorHex === 'string' && globals.cursorColorHex) 
    ? globals.cursorColorHex 
    : '#000000';
  
  // Get normalized velocity ratio (0-1)
  const velocityRatio = getNormalizedVelocityRatio();
  
  // Calculate overlay opacity for blend mode vibrancy effect
  const overlayOpacity = MIN_VIBRANCY_OPACITY + 
    (velocityRatio * (MAX_VIBRANCY_OPACITY - MIN_VIBRANCY_OPACITY));
  
  // Simulate overlay blend mode for trail (increases saturation/contrast)
  return applyBrightnessToHex(baseColor, overlayOpacity);
}

/**
 * Update cursor visual effects based on current smoothed velocity
 * Uses overlay blend mode for vibrancy effect (increases saturation/contrast)
 * Always ensures resting state when velocity is zero
 */
function updateCursorEffects() {
  if (!cursorElement || !cursorOverlay || !isInSimulation) return;
  
  // If velocity is effectively zero, ensure resting state (palette color)
  if (smoothedVelocity <= 0.001) {
    cursorOverlay.style.opacity = '0';
    const globals = getGlobals();
    const baseColor = (globals && typeof globals.cursorColorHex === 'string' && globals.cursorColorHex) 
      ? globals.cursorColorHex 
      : '#000000';
    cursorElement.style.backgroundColor = baseColor;
    return;
  }
  
  // Get normalized velocity ratio (0-1) between min and max thresholds
  const velocityRatio = getNormalizedVelocityRatio();
  
  // Calculate overlay opacity for blend mode vibrancy
  // Overlay blend mode increases saturation and contrast, making colors more vibrant
  const overlayOpacity = MIN_VIBRANCY_OPACITY + 
    (velocityRatio * (MAX_VIBRANCY_OPACITY - MIN_VIBRANCY_OPACITY));
  
  // Apply overlay opacity - overlay blend mode will make the color more vibrant
  cursorOverlay.style.opacity = overlayOpacity.toString();
  
  // Reset background to base palette color (overlay handles vibrancy via blend mode)
  const globals = getGlobals();
  const baseColor = (globals && typeof globals.cursorColorHex === 'string' && globals.cursorColorHex) 
    ? globals.cursorColorHex 
    : '#000000';
  cursorElement.style.backgroundColor = baseColor;
}

/**
 * Initialize custom cursor element
 * Creates a circular cursor that follows the mouse with blend mode overlay
 */
export function setupCustomCursor() {
  if (isInitialized) return;
  
  // Create cursor element (base layer)
  cursorElement = document.createElement('div');
  cursorElement.id = 'custom-cursor';
  cursorElement.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursorElement);
  
  // Create vibrant overlay for blend mode effect
  // Uses a lighter, more saturated version of the cursor color for vibrancy
  // Overlay uses absolute positioning relative to cursor element (which is position: fixed)
  cursorOverlay = document.createElement('div');
  cursorOverlay.setAttribute('aria-hidden', 'true');
  cursorOverlay.style.position = 'absolute';
  cursorOverlay.style.inset = '0';
  cursorOverlay.style.borderRadius = 'inherit';
  // Use white for overlay - overlay blend mode will make colors more vibrant
  cursorOverlay.style.backgroundColor = '#ffffff';
  cursorOverlay.style.pointerEvents = 'none';
  cursorOverlay.style.mixBlendMode = 'overlay'; // Overlay increases saturation and contrast for vibrancy
  cursorOverlay.style.opacity = '0';
  cursorOverlay.style.transition = 'opacity 0.12s ease-out';
  cursorElement.appendChild(cursorOverlay);
  
  // Show default cursor in border area, hide in simulation
  // We'll control this dynamically based on mouse position
  
  // Initially hide cursor (will show when mouse moves)
  cursorElement.style.display = 'none';
  
  isInitialized = true;
  updateCursorSize();
  lastVelocityUpdateTime = performance.now();
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
  
  // Ensure overlay covers the cursor (it uses inset: 0, so it will auto-size)
  if (cursorOverlay) {
    cursorOverlay.style.borderRadius = 'inherit';
  }
  
  // Reset transform if not in simulation
  if (!isInSimulation) {
    cursorElement.style.transform = 'translate(-50%, -50%) scale(1)';
    cursorElement.style.opacity = '1';
  }
}

/**
 * Update cursor position and state
 * Called from pointer.js on mouse move
 * @param {number} clientX - Mouse X position
 * @param {number} clientY - Mouse Y position
 * @param {number} velocity - Mouse velocity in px/ms (optional)
 */
export function updateCursorPosition(clientX, clientY, velocity = 0) {
  if (!cursorElement) return;
  
  const wasInSimulation = isInSimulation;
  isInSimulation = isMouseInSimulation(clientX, clientY);
  
  cursorElement.style.left = `${clientX}px`;
  cursorElement.style.top = `${clientY}px`;
  
  // Update velocity-based effects
  currentVelocity = velocity;
  lastVelocityUpdateTime = performance.now();
  
  // Smooth velocity changes: faster decay when idle, slower buildup when moving
  // Clamp velocity to reasonable range for robustness
  const clampedVelocity = Math.max(0, Math.min(currentVelocity, MAX_VELOCITY_THRESHOLD * 1.5));
  
  if (clampedVelocity < MIN_VELOCITY_THRESHOLD) {
    // Mouse is idle: decay faster towards 0
    smoothedVelocity *= (1 - VELOCITY_DECAY_FACTOR);
    // Clamp to 0 to prevent floating point drift - ensure it reaches exactly 0
    if (smoothedVelocity < 0.001) {
      smoothedVelocity = 0;
      // Immediately ensure resting state when velocity reaches zero
      if (cursorOverlay && isInSimulation) {
        cursorOverlay.style.opacity = '0';
      }
    }
  } else {
    // Mouse is moving: smooth interpolation towards current velocity
    smoothedVelocity += (clampedVelocity - smoothedVelocity) * VELOCITY_SMOOTH_FACTOR;
    // Clamp smoothed velocity to max threshold for robustness
    smoothedVelocity = Math.min(smoothedVelocity, MAX_VELOCITY_THRESHOLD);
  }
  
  // Always hide default cursor - we use custom cursor only
  document.body.style.cursor = 'none';
  
  // Transition between border and simulation
  if (isInSimulation) {
    // In simulation: show cursor and animate to visible dot
    cursorElement.style.display = 'block';
    
    // Update visual effects based on current smoothed velocity
    updateCursorEffects();
    
    // Start decay loop if not already running
    if (decayAnimationFrameId === null) {
      startDecayLoop();
    }
    
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
    stopDecayLoop(); // Stop decay loop when leaving simulation
    if (wasInSimulation) {
      // Reset transform and effects for next entry
      cursorElement.style.transform = 'translate(-50%, -50%) scale(1)';
      cursorElement.style.opacity = '1';
      cursorElement.style.backgroundColor = ''; // Reset to CSS default
      cursorElement.style.filter = '';
      if (cursorOverlay) {
        cursorOverlay.style.opacity = '0'; // Reset overlay
      }
      smoothedVelocity = 0; // Reset velocity when leaving simulation
    }
  }
}

/**
 * Hide cursor (when mouse leaves window)
 * Ensures resting state before hiding
 */
export function hideCursor() {
  if (!cursorElement) return;
  
  // Ensure resting state
  smoothedVelocity = 0;
  if (cursorOverlay) {
    cursorOverlay.style.opacity = '0';
  }
  const globals = getGlobals();
  const baseColor = (globals && typeof globals.cursorColorHex === 'string' && globals.cursorColorHex) 
    ? globals.cursorColorHex 
    : '#000000';
  cursorElement.style.backgroundColor = baseColor;
  
  cursorElement.style.display = 'none';
  document.body.style.cursor = 'none';
  isInSimulation = false;
  stopDecayLoop();
}

/**
 * Show cursor (when mouse enters window)
 */
export function showCursor() {
  if (!cursorElement) return;
  // Will be shown/hidden by updateCursorPosition based on location
  isInSimulation = false;
}

