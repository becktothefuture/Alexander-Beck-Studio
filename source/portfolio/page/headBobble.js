/**
 * HEAD BOBBLE MODULE
 * 
 * Applies a subtle head bobble animation to the document body
 * for a more dynamic and engaging user experience.
 * 
 * The animation creates a gentle vertical movement combined with
 * a slight pitch rotation to simulate natural head movement.
 */

export class HeadBobble {
  constructor(options = {}) {
    // Configuration with human-like defaults
    this.config = {
      amplitude: options.amplitude || 2,      // px up/down movement (very subtle for realism)
      pitchDeg: options.pitchDeg || 1,        // degrees forward/back rotation (minimal for subtlety)
      tiltDeg: options.tiltDeg || 0.8,        // degrees left/right tilt (head tilting)
      frequency: options.frequency || 0.15,  // cycles per second (very slow, chilled breathing ~9 breaths/min)
      enabled: options.enabled !== false,    // enabled by default
      target: options.target || document.querySelector('.head-bobble-wrapper') || document.body, // target wrapper element
      
      // Organic movement settings
      organicIntensity: options.organicIntensity || 0.8, // 0-2, subtle organic variations
      breathingVariation: options.breathingVariation || 0.7, // 0-1, natural breathing irregularity
      microMovements: options.microMovements !== false, // enable micro-movements for realism
      
      ...options
    };

    // Animation state
    this.isRunning = false;
    this.animationId = null;
    this.startTime = null;
    this.originalTransform = null;

    // Bind methods
    this.animate = this.animate.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Initialize the head bobble animation
   */
  initialize() {
    if (!this.config.enabled) {
      return;
    }

    // Store original transform for cleanup
    this.originalTransform = this.config.target.style.transform || '';

    // Set up CSS properties for optimal performance
    this.setupTargetElement();

    // Start the animation
    this.start();

    // Handle page visibility changes for performance
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    console.log('🎭 Head bobble animation initialized');
  }

  /**
   * Set up the target element for optimal animation performance
   */
  setupTargetElement() {
    const target = this.config.target;
    
    // Set transform origin to top center for natural bobbing
    target.style.transformOrigin = '50% 0';
    
    // Promote to its own layer for better performance
    target.style.willChange = 'transform';
    
    // Ensure smooth animations
    if (!target.style.transition) {
      target.style.transition = 'none'; // Prevent conflicts with animation
    }
  }

  /**
   * Start the bobble animation
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startTime = performance.now();
    this.animationId = requestAnimationFrame(this.animate);
  }

  /**
   * Stop the bobble animation
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Animation loop function with truly organic, human-like head movement
   */
  animate(now) {
    if (!this.isRunning || document.hidden) {
      if (this.isRunning) {
        this.animationId = requestAnimationFrame(this.animate);
      }
      return;
    }

    // PERFORMANCE OPTIMIZATION: Throttle head bobble updates to every 4th frame
    // since it's a very subtle effect that doesn't need per-frame precision
    if (!this.frameCounter) this.frameCounter = 0;
    this.frameCounter++;
    if (this.frameCounter % 4 !== 0) {
      this.animationId = requestAnimationFrame(this.animate);
      return;
    }

    const elapsed = (now - this.startTime) / 1000;
    
    // Generate organic movement using Perlin-like noise simulation
    const t = elapsed * this.config.frequency;
    
    // Create natural breathing rhythm with irregular timing
    const breathCycle = this.organicBreathing(t);
    
    // Add subtle micro-movements and fidgeting
    const microMovements = this.generateMicroMovements(t);
    
    // Occasional larger adjustments (like shifting position)
    const positionShifts = this.generatePositionShifts(t);
    
    // Generate subtle head tilting movements
    const headTilt = this.generateHeadTilt(t);
    
    // Combine all movement types
    const totalY = (breathCycle + microMovements + positionShifts) * this.config.amplitude;
    const totalPitch = (breathCycle * 0.8 + microMovements * 0.3) * this.config.pitchDeg;
    const totalTilt = headTilt * this.config.tiltDeg;

    // Apply transform with hardware acceleration
    this.config.target.style.transform = 
      `translate3d(0, ${totalY}px, 0) rotateX(${totalPitch}deg) rotateZ(${totalTilt}deg)`;

    // Continue animation
    this.animationId = requestAnimationFrame(this.animate);
  }

  /**
   * Generate organic breathing pattern with natural irregularities - chilled rhythm
   */
  organicBreathing(t) {
    // Base breathing rhythm - slow and relaxed
    const baseBreath = Math.sin(t * Math.PI * 2);
    
    // Add natural breathing variations - slower and more organic
    const breathVariation1 = Math.sin(t * 0.6 * Math.PI * 2) * 0.18;
    const breathVariation2 = Math.sin(t * 1.1 * Math.PI * 2) * 0.12;
    
    // Occasional deeper breaths or sighs - very slow
    const deepBreath = Math.sin(t * 0.08 * Math.PI * 2) * 0.35;
    
    // Very subtle breath holding variations
    const breathHold = Math.sin(t * 0.04 * Math.PI * 2) * 0.1;
    
    return baseBreath + breathVariation1 + breathVariation2 + deepBreath + breathHold;
  }

  /**
   * Generate subtle micro-movements like natural fidgeting
   */
  generateMicroMovements(t) {
    if (!this.config.microMovements) return 0;
    
    // Very subtle, slower micro-adjustments for chilled feel
    const micro1 = Math.sin(t * 0.18 * Math.PI * 2) * 0.14;
    const micro2 = Math.sin(t * 0.29 * Math.PI * 2) * 0.09;
    const micro3 = Math.sin(t * 0.41 * Math.PI * 2) * 0.06;
    
    return (micro1 + micro2 + micro3) * this.config.organicIntensity;
  }

  /**
   * Generate occasional larger position shifts
   */
  generatePositionShifts(t) {
    // Very slow, subtle position changes - more relaxed
    const shift1 = Math.sin(t * 0.03 * Math.PI * 2) * 0.25;
    const shift2 = Math.sin(t * 0.06 * Math.PI * 2) * 0.18;
    
    return (shift1 + shift2) * this.config.breathingVariation;
  }

  /**
   * Generate subtle head tilting movements
   */
  generateHeadTilt(t) {
    // Very slow head tilting like natural head positioning
    const mainTilt = Math.sin(t * 0.07 * Math.PI * 2) * 0.8;
    
    // Subtle micro-tilts
    const microTilt1 = Math.sin(t * 0.19 * Math.PI * 2) * 0.3;
    const microTilt2 = Math.sin(t * 0.31 * Math.PI * 2) * 0.2;
    
    // Occasional larger tilts (like adjusting head position)
    const adjustmentTilt = Math.sin(t * 0.02 * Math.PI * 2) * 0.4;
    
    return (mainTilt + microTilt1 + microTilt2 + adjustmentTilt) * this.config.organicIntensity;
  }

  /**
   * Smooth easing function for more natural movement
   */
  easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  /**
   * Handle page visibility changes for performance optimization
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, animation will pause automatically
      console.log('🎭 Head bobble paused (page hidden)');
    } else {
      // Page is visible, animation will resume
      console.log('🎭 Head bobble resumed (page visible)');
    }
  }

  /**
   * Update configuration and restart animation if needed
   */
  updateConfig(newConfig) {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }

    // Merge new configuration
    Object.assign(this.config, newConfig);

    if (wasRunning && this.config.enabled) {
      this.start();
    }

    console.log('🎭 Head bobble configuration updated:', newConfig);
  }

  /**
   * Enable the head bobble animation
   */
  enable() {
    this.config.enabled = true;
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Disable the head bobble animation
   */
  disable() {
    this.config.enabled = false;
    this.stop();
    
    // Reset transform to original state
    this.config.target.style.transform = this.originalTransform;
  }

  /**
   * Clean up resources and event listeners
   */
  destroy() {
    this.stop();
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Reset target element
    if (this.config.target && this.originalTransform !== null) {
      this.config.target.style.transform = this.originalTransform;
      this.config.target.style.willChange = 'auto';
    }

    console.log('🎭 Head bobble animation destroyed');
  }

  /**
   * Get current animation status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      enabled: this.config.enabled,
      config: { ...this.config }
    };
  }
}

// Export default instance for easy use
export const headBobble = new HeadBobble();

// Export configuration presets
export const BOBBLE_PRESETS = {
  subtle: {
    amplitude: 1,
    pitchDeg: 0.5,
    tiltDeg: 0.4,
    frequency: 0.12,
    organicIntensity: 0.5,
    breathingVariation: 0.4,
    microMovements: true
  },
  normal: {
    amplitude: 2,
    pitchDeg: 1,
    tiltDeg: 0.8,
    frequency: 0.15,
    organicIntensity: 0.8,
    breathingVariation: 0.7,
    microMovements: true
  },
  relaxed: {
    amplitude: 2.5,
    pitchDeg: 1.2,
    tiltDeg: 1.0,
    frequency: 0.12,
    organicIntensity: 1.0,
    breathingVariation: 0.9,
    microMovements: true
  },
  focused: {
    amplitude: 1.5,
    pitchDeg: 0.8,
    tiltDeg: 0.6,
    frequency: 0.18,
    organicIntensity: 0.6,
    breathingVariation: 0.5,
    microMovements: true
  },
  chilled: {
    amplitude: 3,
    pitchDeg: 1.5,
    tiltDeg: 1.2,
    frequency: 0.1,
    organicIntensity: 1.2,
    breathingVariation: 1.0,
    microMovements: true
  },
  mechanical: {
    amplitude: 3,
    pitchDeg: 1.5,
    tiltDeg: 0,
    frequency: 0.5,
    organicIntensity: 0,
    breathingVariation: 0,
    microMovements: false
  },
  disabled: {
    enabled: false
  }
}; 