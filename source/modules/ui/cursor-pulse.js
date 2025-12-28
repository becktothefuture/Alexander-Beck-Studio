// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║              CURSOR PULSE EFFECT ON MODE CHANGE (REDESIGNED)                 ║
// ║         Substantial radial gradient expansion synchronized with mode switch   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

let pulseContainer = null;
let isInitialized = false;
let activePulses = new Set();

/**
 * Initialize cursor pulse system
 * Creates a container for pulse effects
 */
export function initCursorPulse() {
  if (isInitialized || typeof window === 'undefined' || typeof document === 'undefined') return;

  // Create container for pulse effects
  // Append to #bravia-balls so it's in the same stacking context as canvas
  const sceneContainer = document.getElementById('bravia-balls');
  if (!sceneContainer) {
    // Fallback to body if container doesn't exist yet
    pulseContainer = document.createElement('div');
    pulseContainer.id = 'cursor-pulse-container';
    pulseContainer.setAttribute('aria-hidden', 'true');
    pulseContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1; /* Below canvas/wall (z:5) and noise (z:2), above background */
    `;
    document.body.appendChild(pulseContainer);
  } else {
    pulseContainer = document.createElement('div');
    pulseContainer.id = 'cursor-pulse-container';
    pulseContainer.setAttribute('aria-hidden', 'true');
    pulseContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1; /* Below canvas (z:5) and noise (z:2), above background */
    `;
    sceneContainer.appendChild(pulseContainer);
  }

  isInitialized = true;
}

/**
 * Create a substantial radial gradient pulse from cursor position
 * Synchronized with mode change for better integration
 * @param {number} clientX - Cursor X position
 * @param {number} clientY - Cursor Y position
 */
export function emitCursorPulse(clientX, clientY) {
  if (!isInitialized || !pulseContainer) {
    initCursorPulse();
    if (!pulseContainer) return;
  }

  const g = getGlobals();
  if (g?.cursorPulseEnabled === false) return;

  // Respect reduced motion
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

  // Use white color for pulse (no cursor color)
  const rgb = { r: 255, g: 255, b: 255 };
  
  // Get pulse config from globals
  const pulseDuration = g?.cursorPulseDuration ?? 500; // Faster, more decisive
  const pulseIntensity = g?.cursorPulseIntensity ?? 0.7; // Higher opacity for clear white point
  const pulseFadeStart = g?.cursorPulseFadeStart ?? 0.5; // Earlier fade start for better visibility
  
  // Calculate viewport dimensions for full coverage
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxDistance = Math.max(
    Math.hypot(clientX, clientY),
    Math.hypot(viewportWidth - clientX, clientY),
    Math.hypot(clientX, viewportHeight - clientY),
    Math.hypot(viewportWidth - clientX, viewportHeight - clientY)
  );
  const maxRadius = maxDistance * 1.1; // Slight padding for full coverage
  
  // Create radial gradient pulse element
  const pulse = document.createElement('div');
  pulse.className = 'cursor-pulse-gradient';
  const pulseId = `pulse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  pulse.id = pulseId;
  
  // Create radial gradient: strong white center, fades to transparent
  // Stronger center point for better visibility
  const gradientStop1 = pulseIntensity; // Bright white center
  const gradientStop2 = pulseIntensity * 0.6; // Mid fade
  const gradientStop3 = pulseIntensity * 0.2; // Outer fade
  const gradientStop4 = 0; // Fully transparent edge
  
  pulse.style.cssText = `
    position: absolute;
    left: ${clientX}px;
    top: ${clientY}px;
    width: ${maxRadius * 2}px;
    height: ${maxRadius * 2}px;
    border-radius: 50%;
    background: radial-gradient(
      circle at center,
      rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gradientStop1}) 0%,
      rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gradientStop2}) ${pulseFadeStart * 30}%,
      rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gradientStop3}) ${pulseFadeStart * 60}%,
      rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gradientStop4}) 100%
    );
    transform: translate(-50%, -50%) scale(0);
    pointer-events: none;
    will-change: transform, opacity;
  `;

  pulseContainer.appendChild(pulse);
  activePulses.add(pulseId);

  // Animate pulse expansion with confident, decisive timing
  const animation = pulse.animate(
    [
      {
        transform: 'translate(-50%, -50%) scale(0)',
        opacity: 1
      },
      {
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 0.8
      },
      {
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 0
      }
    ],
    {
      duration: pulseDuration,
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', // Confident ease-out
      fill: 'forwards'
    }
  );

  // Cleanup on finish
  animation.addEventListener('finish', () => {
    if (pulse.parentNode) {
      pulse.parentNode.removeChild(pulse);
    }
    activePulses.delete(pulseId);
  });

  animation.addEventListener('cancel', () => {
    if (pulse.parentNode) {
      pulse.parentNode.removeChild(pulse);
    }
    activePulses.delete(pulseId);
  });
}

/**
 * Get current cursor position from the cursor element
 * @returns {{x: number, y: number} | null}
 */
export function getCurrentCursorPosition() {
  const cursorElement = document.getElementById('custom-cursor');
  if (!cursorElement) return null;

  const rect = cursorElement.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}
