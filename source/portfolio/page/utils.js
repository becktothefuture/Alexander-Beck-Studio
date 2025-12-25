/**
 * MATHEMATICAL UTILITY FUNCTIONS
 *
 * This module provides essential mathematical operations used throughout the animation system.
 * These functions are building blocks for smooth animations and value transformations.
 */

/**
 * CLAMP FUNCTION
 * Constrains a value between minimum and maximum bounds.
 *
 * Use cases:
 * - Preventing scroll values from going negative or beyond page count
 * - Ensuring opacity values stay between 0 and 1
 * - Keeping rotation angles within reasonable ranges
 *
 * @param {number} val - The value to constrain
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} The clamped value
 *
 * Example: clamp(150, 0, 100) returns 100
 */
export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * LINEAR INTERPOLATION (LERP)
 * Blends between two values based on a progress parameter.
 *
 * Use cases:
 * - Smooth transitions between two positions
 * - Color blending between two colors
 * - Animating any numeric property over time
 *
 * @param {number} start - Starting value
 * @param {number} end - Ending value
 * @param {number} t - Progress from 0 (start) to 1 (end)
 * @returns {number} The interpolated value
 *
 * Example: lerp(0, 100, 0.5) returns 50 (halfway between 0 and 100)
 */
export const lerp = (start, end, t) => start + (end - start) * t;

/**
 * RANGE MAPPING
 * Converts a value from one numeric range to another.
 * Essential for converting scroll positions to rotation angles, etc.
 *
 * Use cases:
 * - Converting scroll position (0-1) to rotation angle (0-270°)
 * - Mapping page position (0-7) to z-depth (0-100px)
 * - Transforming any input range to any output range
 *
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @param {number} val - Value to map from input range
 * @returns {number} Mapped value in output range
 *
 * Example: mapRange(0, 10, 0, 100, 5) returns 50
 * (5 is halfway through 0-10, so result is halfway through 0-100)
 */
export const mapRange = (inMin, inMax, outMin, outMax, val) =>
  ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

// === EASING FUNCTIONS ===
//
// Easing functions control the rate of change during animations.
// They make animations feel more natural by varying the speed over time.
//
// All easing functions take a parameter t (time) from 0 to 1:
// - t = 0: Animation start
// - t = 1: Animation end
// - Return value: Progress (usually 0 to 1, but can overshoot for bounce effects)

/**
 * EASE-OUT CUBIC
 * Starts fast, then slows down (decelerates).
 * Creates a natural "settling" feeling.
 *
 * Use cases:
 * - Objects coming to rest
 * - UI elements appearing
 * - Fade-in effects
 * - Any animation that should feel like it's "landing"
 *
 * @param {number} t - Time progress from 0 to 1
 * @returns {number} Eased progress value
 */
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

/**
 * EASE-IN CUBIC
 * Starts slow, then speeds up (accelerates).
 * Creates a natural "launching" feeling.
 *
 * Use cases:
 * - Objects starting to move
 * - UI elements disappearing
 * - Fade-out effects
 * - Any animation that should feel like it's "taking off"
 *
 * @param {number} t - Time progress from 0 to 1
 * @returns {number} Eased progress value
 */
export const easeInCubic = t => t * t * t;

/**
 * EASE-IN-OUT CUBIC
 * Starts slow, speeds up in middle, then slows down.
 * Most natural feeling for general animations.
 *
 * Use cases:
 * - Page flipping animations
 * - General UI transitions
 * - Any animation that should feel smooth and natural
 * - Default choice when unsure which easing to use
 *
 * @param {number} t - Time progress from 0 to 1
 * @returns {number} Eased progress value
 */
export const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * LINEAR EASING
 * Constant speed throughout the animation.
 * No acceleration or deceleration.
 *
 * Use cases:
 * - Mechanical movements
 * - Loading bars
 * - When you want constant, predictable motion
 * - Debug/testing animations
 *
 * @param {number} t - Time progress from 0 to 1
 * @returns {number} Same as input (no easing applied)
 */
export const linear = t => t;

/**
 * EASE-IN-OUT EXPO
 * Accelerates rapidly, then decelerates rapidly. Very smooth for rotation.
 * @param {number} t - Time progress from 0 to 1
 * @returns {number} Eased progress value
 */
export const easeInOutExpo = t =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2;

/**
 * Damped spring easing for multiple bounces.
 * @param {number} t - Time progress from 0 to 1
 * @param {number} bounces - Number of bounces (e.g., 2.5)
 * @param {number} damping - Damping factor (e.g., 5-10, higher = less bounce)
 * @returns {number} Eased progress value
 */
export function easeOutDampedSpring(t, bounces = 2.5, damping = 8) {
  if (t === 0 || t === 1) return t;
  const expo = Math.exp(-damping * t);
  const sine = Math.sin(bounces * Math.PI * t);
  return 1 - expo * sine;
}

/**
 * Realistic single-bounce spring easing.
 * @param {number} t - Time progress from 0 to 1
 * @param {number} overshoot - How far past the target to go (e.g., 0.05 for 5%)
 * @returns {number} Eased progress value
 */
export function easeOutSingleSpring(t, overshoot = 0.05) {
  const s = overshoot;
  return 1 + s * Math.exp(-8 * t) * Math.sin(10 * t - 1.5);
}

/**
 * Generate layered shadow CSS for realistic depth effect
 * @param {Object} config - Shadow configuration from PAGE_ANIMATION.layeredShadow
 * @param {number} tiltX - Current X tilt in normalized range (-1 to 1)
 * @param {number} tiltY - Current Y tilt in normalized range (-1 to 1)
 * @returns {string} CSS box-shadow value
 */
export function generateLayeredShadow(config, tiltX = 0, tiltY = 0) {
  if (!config.enabled) return 'none';

  const shadows = [];

  for (let i = 0; i < config.layers; i++) {
    // Calculate layer properties
    const layerMultiplier = i + 1;
    const blur = config.baseBlur + config.blurStep * i;
    const spread = config.baseSpread + config.spreadStep * i;
    const opacity = config.baseOpacity * Math.pow(config.opacityDecay, i);

    // Apply tilt influence to shadow position
    const tiltInfluence = config.tiltMultiplier * layerMultiplier;
    const offsetX = config.offsetX + config.offsetStep * i + tiltX * tiltInfluence * 20;
    const offsetY = config.offsetY + config.offsetStep * i + tiltY * tiltInfluence * 10;

    // Create shadow layer
    const shadowValue = `${offsetX}px ${offsetY}px ${blur}px ${spread}px rgba(${config.color}, ${opacity})`;
    shadows.push(shadowValue);
  }

  return shadows.join(', ');
}

/**
 * Apply layered shadow to an element with performance optimization
 * Uses a debounce/throttle technique to limit shadow updates
 * for better performance on lower-end devices
 *
 * @param {HTMLElement} element - Element to apply shadow to
 * @param {Object} config - Shadow configuration
 * @param {number} tiltX - X tilt value (-1 to 1)
 * @param {number} tiltY - Y tilt value (-1 to 1)
 */
// Cache for shadow values to avoid recalculations of identical values
const shadowCache = new Map();
// Track last update time for throttling
let lastShadowUpdate = 0;
// Track last values to detect significant changes
let lastTiltX = 0;
let lastTiltY = 0;
// Minimum interval between shadow updates (ms)
const SHADOW_UPDATE_INTERVAL = 16; // ~60fps
// Minimum change in tilt to trigger update
const TILT_CHANGE_THRESHOLD = 0.01;

export function applyLayeredShadow(element, config, tiltX = 0, tiltY = 0) {
  if (!element || !config.enabled) return;

  // Normalize tilt values to prevent extreme values
  tiltX = Math.max(-1, Math.min(1, tiltX));
  tiltY = Math.max(-1, Math.min(1, tiltY));

  // Check if we should skip this update for performance optimization
  const now = performance.now();
  const timeDelta = now - lastShadowUpdate;
  const xDelta = Math.abs(tiltX - lastTiltX);
  const yDelta = Math.abs(tiltY - lastTiltY);

  // Skip update if not enough time has passed or change is too small
  if (
    timeDelta < SHADOW_UPDATE_INTERVAL ||
    (xDelta < TILT_CHANGE_THRESHOLD && yDelta < TILT_CHANGE_THRESHOLD)
  ) {
    return;
  }

  // Round tilt values slightly to increase cache hits
  const roundedTiltX = Math.round(tiltX * 100) / 100;
  const roundedTiltY = Math.round(tiltY * 100) / 100;

  // Create cache key from configuration and tilt
  const cacheKey = `${roundedTiltX},${roundedTiltY}`;

  let shadowValue;
  // Check cache first
  if (shadowCache.has(cacheKey)) {
    shadowValue = shadowCache.get(cacheKey);
  } else {
    // Generate new shadow value
    shadowValue = generateLayeredShadow(config, roundedTiltX, roundedTiltY);
    // Store in cache (limit cache size to prevent memory issues)
    if (shadowCache.size > 100) {
      // Clear old entries if cache gets too large
      const oldestKey = shadowCache.keys().next().value;
      shadowCache.delete(oldestKey);
    }
    shadowCache.set(cacheKey, shadowValue);
  }

  // Apply shadow and update tracking variables
  element.style.setProperty('--layered-shadow-styles', shadowValue);
  lastShadowUpdate = now;
  lastTiltX = tiltX;
  lastTiltY = tiltY;
}

/**
 * Creates a debounced resize handler that prevents ResizeObserver loop issues
 * @param {Function} callback - Function to call after resize
 * @param {number} delay - Delay in milliseconds (default: 100)
 * @returns {Function} Debounced resize handler
 */
export function createDebouncedResizeHandler(callback, delay = 100) {
  let timeoutId = null;
  let frameId = null;
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;

  return function handleResize() {
    // Cancel any pending timeout and animation frame
    if (timeoutId) clearTimeout(timeoutId);
    if (frameId) cancelAnimationFrame(frameId);

    // Schedule the resize handling
    timeoutId = setTimeout(() => {
      frameId = requestAnimationFrame(() => {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;

        // Only trigger callback if size actually changed
        if (currentWidth !== lastWidth || currentHeight !== lastHeight) {
          lastWidth = currentWidth;
          lastHeight = currentHeight;
          callback();
        }
      });
    }, delay);
  };
}

/**
 * DEVICE PERFORMANCE DETECTION
 * Detect device capabilities for momentum tuning
 */

/**
 * Detect if device is mobile based on user agent and touch support
 * @returns {boolean} True if mobile device
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Estimate device performance level for adaptive configuration
 * @returns {string} 'high', 'medium', or 'low'
 */
export function getDevicePerformanceLevel() {
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;
  
  // Check device memory if available
  const memory = navigator.deviceMemory || 4;
  
  // Check if high refresh rate display
  const isHighRefresh = window.screen?.refreshRate > 60;
  
  // Check user agent for known low-power devices
  const userAgent = navigator.userAgent.toLowerCase();
  const isLowEndDevice = userAgent.includes('android') && 
    (userAgent.includes('go') || userAgent.includes('lite'));
  
  if (isLowEndDevice || (cores <= 2 && memory <= 2)) {
    return 'low';
  } else if (cores >= 8 && memory >= 8 && isHighRefresh) {
    return 'high';
  } else {
    return 'medium';
  }
}

/**
 * Get adaptive momentum configuration based on device capabilities
 * @param {Object} baseConfig - Base momentum configuration
 * @returns {Object} Tuned configuration for this device
 */
export function getAdaptiveMomentumConfig(baseConfig) {
  const isMobile = isMobileDevice();
  const performanceLevel = getDevicePerformanceLevel();
  
  // Clone base config
  const config = { ...baseConfig };
  
  // Apply mobile-specific adjustments
  if (isMobile) {
    config.decay = config.decayMobile || config.decay;
    config.velocityToPages = config.velocityToPagesMobile || config.velocityToPages;
  }
  
  // Apply performance-based adjustments
  switch (performanceLevel) {
    case 'low':
      config.decay *= 1.5; // Faster decay = shorter momentum duration
      config.maxDuration = Math.min(config.maxDuration, 800);
      config.maxExtraPages = Math.min(config.maxExtraPages, 2);
      break;
    case 'high':
      config.decay *= 0.8; // Slower decay = longer, smoother momentum
      config.maxDuration = Math.min(config.maxDuration, 1500);
      break;
    // 'medium' uses base values
  }
  
  return config;
}
