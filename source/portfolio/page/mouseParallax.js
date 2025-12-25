// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        MOUSE PARALLAX SYSTEM                                 ║
// ║              Performant scene tilt based on mouse position                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { GLOBAL_CONFIG } from './config.js';

// Configuration (will be exposed for runtime control via panel)
const PARALLAX_CONFIG = {
  enabled: true,
  // Max rotation in degrees
  maxRotateX: 3,    // Vertical tilt (looking up/down)
  maxRotateY: 5,    // Horizontal tilt (looking left/right)
  // Smoothing (0-1, lower = smoother but more lag)
  smoothing: 0.12,
  // Center dead zone (0-1, fraction of viewport where tilt is minimal)
  deadZone: 0.1,
};

// State
let currentRotateX = 0;
let currentRotateY = 0;
let targetRotateX = 0;
let targetRotateY = 0;
let rafId = null;
let notebookEl = null;

/**
 * Initialize parallax system
 */
export function initMouseParallax() {
  notebookEl = document.querySelector('.notebook') || document.getElementById('notebook');
  
  if (!notebookEl) {
    console.warn('Mouse parallax: notebook element not found');
    return;
  }

  // Listen for mouse move (throttled via RAF)
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  
  // Start animation loop
  startAnimationLoop();
  
  console.log('✓ Mouse parallax initialized');
}

/**
 * Handle mouse move events
 */
function onMouseMove(e) {
  if (!PARALLAX_CONFIG.enabled) return;
  
  // Normalize mouse position to -1...1 range
  const x = (e.clientX / window.innerWidth) * 2 - 1;   // -1 (left) to 1 (right)
  const y = (e.clientY / window.innerHeight) * 2 - 1;  // -1 (top) to 1 (bottom)
  
  // Apply dead zone (reduce sensitivity near center)
  const deadZone = PARALLAX_CONFIG.deadZone;
  const xAdjusted = Math.abs(x) < deadZone ? 0 : (x - Math.sign(x) * deadZone) / (1 - deadZone);
  const yAdjusted = Math.abs(y) < deadZone ? 0 : (y - Math.sign(y) * deadZone) / (1 - deadZone);
  
  // Calculate target rotations (inverted for natural feel)
  targetRotateX = -yAdjusted * PARALLAX_CONFIG.maxRotateX; // Mouse up = tilt down
  targetRotateY = xAdjusted * PARALLAX_CONFIG.maxRotateY;  // Mouse right = tilt right
}

/**
 * Animation loop with smooth interpolation
 */
function startAnimationLoop() {
  function animate() {
    if (!PARALLAX_CONFIG.enabled) {
      // Reset to neutral when disabled
      targetRotateX = 0;
      targetRotateY = 0;
    }
    
    // Smooth interpolation (lerp)
    const smoothing = PARALLAX_CONFIG.smoothing;
    currentRotateX += (targetRotateX - currentRotateX) * smoothing;
    currentRotateY += (targetRotateY - currentRotateY) * smoothing;
    
    // Apply transform (layer on top of existing flipping transforms)
    if (notebookEl) {
      // Use CSS custom properties so we can combine with flip animations
      notebookEl.style.setProperty('--mouse-rotate-x', `${currentRotateX}deg`);
      notebookEl.style.setProperty('--mouse-rotate-y', `${currentRotateY}deg`);
    }
    
    rafId = requestAnimationFrame(animate);
  }
  
  animate();
}

/**
 * Update config at runtime (for panel controls)
 */
export function updateParallaxConfig(updates) {
  Object.assign(PARALLAX_CONFIG, updates);
}

/**
 * Get current config (for panel UI)
 */
export function getParallaxConfig() {
  return { ...PARALLAX_CONFIG };
}

/**
 * Cleanup
 */
export function destroyMouseParallax() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  document.removeEventListener('mousemove', onMouseMove);
}

// Expose for console debugging
if (typeof window !== 'undefined') {
  window.notebookParallax = {
    config: PARALLAX_CONFIG,
    update: updateParallaxConfig,
    get: getParallaxConfig,
  };
}

