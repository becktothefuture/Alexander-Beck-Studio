/**
 * ZOOM MANAGER - NOTEBOOK FOCUS SYSTEM
 * 
 * Handles zooming in/out of the notebook with smooth transitions.
 * Coordinates with scroll engine to prevent conflicts during zoom animations.
 * 
 * ZOOM STATES:
 * - Default: 80% scale (overview mode)
 * - Focused: 100% scale (detail mode)
 * 
 * COORDINATION:
 * - Pauses scroll input during zoom transitions
 * - Resumes scroll after configurable delay
 * - Maintains scroll position across zoom changes
 */

import { GLOBAL_CONFIG } from './config.js';

class ZoomManager {
  constructor() {
    this.isZoomed = false; // Current zoom state
    this.isTransitioning = false; // Prevents multiple simultaneous transitions
    this.scrollEngine = null; // Reference to scroll engine for coordination
    this.notebook = null; // Reference to notebook element
    this.container = null; // Reference to click container
    
    // Configuration from global config
    this.config = GLOBAL_CONFIG.ZOOM;
    
    console.log('🔍 ZoomManager initialized');
    console.log('🔍 Click anywhere on the background to toggle zoom (80% ⟷ 100%)');
  }

  /**
   * Initialize zoom system with required references
   * @param {HTMLElement} notebook - Notebook element to zoom
   * @param {HTMLElement} container - Container element for click detection
   * @param {VirtualScrollEngine} scrollEngine - Scroll engine for coordination
   */
  initialize(notebook, container, scrollEngine) {
    this.notebook = notebook;
    this.container = container;
    this.scrollEngine = scrollEngine;
    
    if (!this.notebook) {
      console.error('❌ ZoomManager: Notebook element not found');
      return;
    }
    
    this.setupEventListeners();
    this.applyCSSConfiguration();
    this.applyDefaultZoom();
    
    console.log('🔍 ZoomManager initialized with notebook:', this.notebook.id, this.notebook.className);
    console.log('🔍 Container for click detection:', this.container === document.body ? 'document.body' : this.container);
  }

  /**
   * Apply configuration values to CSS variables
   * Optimized to batch DOM updates using cssText for better performance
   */
  applyCSSConfiguration() {
    const root = document.documentElement;
    
    // Batch CSS variable updates for better performance
    // Using individual setProperty calls is fine for this small number of variables
    // but we avoid triggering unnecessary reflows by grouping related changes
    requestAnimationFrame(() => {
      root.style.setProperty('--notebook-zoom-scale', this.config.defaultScale);
      root.style.setProperty('--notebook-zoom-focused-scale', this.config.focusedScale);
      root.style.setProperty('--zoom-duration', `${this.config.transitionDuration}ms`);
      root.style.setProperty('--zoom-easing', this.config.transitionEasing);
      root.style.setProperty('--background-zoom-scale', this.config.background.defaultScale);
      root.style.setProperty('--background-zoom-focused-scale', this.config.background.focusedScale);
      root.style.setProperty('--background-blur-radius', `${this.config.background.blurRadius}px`);
      
      // CRITICAL: Adjust perspective dynamically based on zoom to maintain depth precision
      // When zoomed in, reduce perspective to prevent z-fighting from precision loss
      const basePerspective = GLOBAL_CONFIG.SCENE.perspective;
      const defaultPerspective = basePerspective;
      const focusedPerspective = basePerspective * 0.85; // Reduce by 15% when zoomed for better precision
      root.style.setProperty('--perspective-distance-default', `${defaultPerspective}px`);
      root.style.setProperty('--perspective-distance-focused', `${focusedPerspective}px`);
    });
    
    console.log('🔍 CSS variables updated from config:');
    console.log(`   Notebook: ${this.config.defaultScale} → ${this.config.focusedScale}`);
    console.log(`   Background: ${this.config.background.defaultScale} → ${this.config.background.focusedScale}`);
    console.log(`   Duration: ${this.config.transitionDuration}ms`);
  }

  /**
   * Apply the default zoom state (80% scale)
   */
  applyDefaultZoom() {
    if (!this.notebook) return;
    
    this.notebook.classList.remove('notebook--focused');
    document.body.classList.remove('zoom-focused');
    // Update container cursor for visual feedback
    if (this.container) {
      this.container.classList.remove('zoom-focused');
    }
    this.isZoomed = false;
    
    console.log('🔍 Applied default zoom (80% scale)');
  }

  /**
   * Toggle between zoomed and default states
   */
  toggleZoom() {
    if (this.isTransitioning) {
      console.log('🔍 Zoom transition in progress, ignoring toggle');
      return;
    }

    if (this.isZoomed) {
      this.zoomOut();
    } else {
      this.zoomIn();
    }
  }

  /**
   * Zoom in to focused state (100% scale)
   */
  zoomIn() {
    if (this.isZoomed || this.isTransitioning) return;
    
    this.startTransition();
    
    // Pause scroll during zoom if configured
    if (this.config.pauseScrollDuringZoom && this.scrollEngine) {
      this.scrollEngine.pauseInput();
    }
    
    // Apply zoom
    this.notebook.classList.add('notebook--focused');
    document.body.classList.add('zoom-focused');
    // Update container cursor for visual feedback
    if (this.container) {
      this.container.classList.add('zoom-focused');
    }
    // CRITICAL: Reduce perspective when zoomed to maintain depth buffer precision
    const root = document.documentElement;
    root.style.setProperty('--perspective-distance', root.style.getPropertyValue('--perspective-distance-focused') || `${GLOBAL_CONFIG.SCENE.perspective * 0.7}px`);
    this.isZoomed = true;
    
    // Schedule transition end
    setTimeout(() => {
      this.endTransition();
    }, this.config.transitionDuration);
    
    console.log('🔍 Zooming in to focused state (100% scale)');
  }

  /**
   * Zoom out to default state (80% scale)
   */
  zoomOut() {
    if (!this.isZoomed || this.isTransitioning) return;
    
    this.startTransition();
    
    // Pause scroll during zoom if configured
    if (this.config.pauseScrollDuringZoom && this.scrollEngine) {
      this.scrollEngine.pauseInput();
    }
    
    // Apply zoom
    this.notebook.classList.remove('notebook--focused');
    document.body.classList.remove('zoom-focused');
    // Update container cursor for visual feedback
    if (this.container) {
      this.container.classList.remove('zoom-focused');
    }
    // CRITICAL: Restore default perspective when zoomed out
    const root = document.documentElement;
    root.style.setProperty('--perspective-distance', root.style.getPropertyValue('--perspective-distance-default') || `${GLOBAL_CONFIG.SCENE.perspective}px`);
    this.isZoomed = false;
    
    // Schedule transition end
    setTimeout(() => {
      this.endTransition();
    }, this.config.transitionDuration);
    
    console.log('🔍 Zooming out to default state (80% scale)');
  }

  /**
   * Start zoom transition
   */
  startTransition() {
    this.isTransitioning = true;
    
    // Add transition class for additional styling if needed
    if (this.notebook) {
      this.notebook.classList.add('notebook--transitioning');
    }
    
    console.log('🔍 Zoom transition started');
  }

  /**
   * End zoom transition and resume scroll input
   */
  endTransition() {
    this.isTransitioning = false;
    
    // Remove transition class
    if (this.notebook) {
      this.notebook.classList.remove('notebook--transitioning');
    }
    
    // Resume scroll input after delay
    if (this.config.pauseScrollDuringZoom && this.scrollEngine) {
      setTimeout(() => {
        this.scrollEngine.resumeInput();
        console.log('🔍 Scroll input resumed after zoom');
      }, this.config.resumeScrollDelay);
    }
    
    console.log('🔍 Zoom transition completed');
  }

  /**
   * Setup event listeners for zoom triggers
   */
  setupEventListeners() {
    if (!this.container) {
      console.warn('⚠️ ZoomManager: No container provided, using document');
      this.container = document;
    }
    
    // Create bound methods for better performance
    this.boundHandleClick = (event) => this.handleClick(event);
    this.boundHandleTouch = (event) => this.handleTouch(event);
    
    // Handle click/tap events on the container
    this.container.addEventListener('click', this.boundHandleClick, { passive: true });
    
    // Handle touch events for mobile  
    this.container.addEventListener('touchend', this.boundHandleTouch, { passive: true });
    
    console.log('🔍 Zoom event listeners attached to:', this.container === document.body ? 'body' : this.container.tagName);
  }

  /**
   * Handle click events
   * @param {MouseEvent} event - Click event
   */
  handleClick(event) {
    console.log('🔍 Click detected on:', event.target, 'zoom transitioning:', this.isTransitioning);
    
    // Prevent triggering zoom on scroll-related interactions
    if (this.isScrollEvent(event)) {
      console.log('🔍 Click ignored - scroll-related element');
      return;
    }
    
    // Prevent triggering during existing transitions
    if (this.isTransitioning) {
      console.log('🔍 Click ignored - transition in progress');
      return;
    }
    
    console.log('🔍 Click accepted, toggling zoom');
    this.toggleZoom();
  }

  /**
   * Handle touch events
   * @param {TouchEvent} event - Touch event
   */
  handleTouch(event) {
    // Only handle single-touch taps
    if (event.changedTouches.length !== 1) {
      return;
    }
    
    // Prevent triggering zoom on scroll-related interactions
    if (this.isScrollEvent(event)) {
      return;
    }
    
    // Prevent triggering during existing transitions
    if (this.isTransitioning) {
      return;
    }
    
    console.log('🔍 Tap detected, toggling zoom');
    this.toggleZoom();
  }

  /**
   * Check if event is related to scrolling or should block zoom (e.g. interactive elements)
   * Note: Clicks on #interactive-cookie are intentionally excluded from zoom triggers, coordinated with cookieVideo.js click handler.
   * This ensures clicking the cookie only triggers its animation, not zoom.
   */
  isScrollEvent(event) {
    const target = event.target;

    if (target.closest('.rings') || target.closest('.rings-wrapper') || target.closest('#interactive-cookie') || target.closest('.page-tab') || target.closest('.commentary') || target.closest('.overlay--rotate') || target.closest('.heading-wrapper') || target.closest('h1') || target.closest('h2')) {
      return true;
    }

    return false;
  }

  /**
   * Get current zoom state
   * @returns {boolean} - True if zoomed in
   */
  isZoomedIn() {
    return this.isZoomed;
  }

  /**
   * Get current zoom scale
   * @returns {number} - Current scale factor
   */
  getCurrentScale() {
    return this.isZoomed ? this.config.focusedScale : this.config.defaultScale;
  }

  /**
   * Update zoom configuration at runtime
   * @param {Object} updates - Configuration updates { defaultScale?, focusedScale?, transitionDuration? }
   */
  updateConfig(updates = {}) {
    let needsUpdate = false;
    
    if (updates.defaultScale !== undefined && updates.defaultScale !== this.config.defaultScale) {
      this.config.defaultScale = updates.defaultScale;
      needsUpdate = true;
    }
    
    if (updates.focusedScale !== undefined && updates.focusedScale !== this.config.focusedScale) {
      this.config.focusedScale = updates.focusedScale;
      needsUpdate = true;
    }
    
    if (updates.transitionDuration !== undefined && updates.transitionDuration !== this.config.transitionDuration) {
      this.config.transitionDuration = updates.transitionDuration;
      needsUpdate = true;
    }
    
    if (updates.backgroundBlurRadius !== undefined && updates.backgroundBlurRadius !== this.config.background.blurRadius) {
      this.config.background.blurRadius = updates.backgroundBlurRadius;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      this.applyCSSConfiguration();
      console.log('🔍 Zoom configuration updated:', updates);
    }
  }

  /**
   * Get current zoom configuration
   * @returns {Object} - Current zoom config
   */
  getConfig() {
    return {
      defaultScale: this.config.defaultScale,
      focusedScale: this.config.focusedScale,
      transitionDuration: this.config.transitionDuration,
      isZoomed: this.isZoomed,
      currentScale: this.getCurrentScale()
    };
  }

  /**
   * Cleanup zoom manager
   */
  destroy() {
    if (this.container && this.boundHandleClick && this.boundHandleTouch) {
      this.container.removeEventListener('click', this.boundHandleClick);
      this.container.removeEventListener('touchend', this.boundHandleTouch);
    }
    
    this.notebook = null;
    this.container = null;
    this.scrollEngine = null;
    this.boundHandleClick = null;
    this.boundHandleTouch = null;
    
    console.log('🔍 ZoomManager destroyed');
  }
}

// Export singleton instance
export const zoomManager = new ZoomManager();
export { ZoomManager };

/**
 * GLOBAL UTILITIES - Expose zoom controls for debugging/runtime adjustment
 * Usage: window.notebook.zoom.in() / window.notebook.zoom.out() / window.notebook.zoom.setScales(0.8, 1.2)
 */
if (typeof window !== 'undefined') {
  window.notebook = window.notebook || {};
  window.notebook.zoom = {
    /**
     * Manually zoom in
     */
    in: () => {
      zoomManager.zoomIn();
      console.log('🔍 Manual zoom in triggered');
    },
    
    /**
     * Manually zoom out
     */
    out: () => {
      zoomManager.zoomOut();
      console.log('🔍 Manual zoom out triggered');
    },
    
    /**
     * Toggle zoom state
     */
    toggle: () => {
      zoomManager.toggleZoom();
      console.log('🔍 Manual zoom toggle triggered');
    },
    
    /**
     * Update zoom scales at runtime
     * @param {number} defaultScale - Initial zoom scale (e.g., 0.78)
     * @param {number} focusedScale - Focused zoom scale (e.g., 1.1)
     */
    setScales: (defaultScale, focusedScale) => {
      zoomManager.updateConfig({ defaultScale, focusedScale });
      console.log(`🔍 Zoom scales updated: ${defaultScale} → ${focusedScale}`);
    },
    
    /**
     * Update transition duration
     * @param {number} duration - Duration in milliseconds
     */
    setDuration: (duration) => {
      zoomManager.updateConfig({ transitionDuration: duration });
      console.log(`🔍 Zoom duration updated: ${duration}ms`);
    },
    
    /**
     * Update background blur radius
     * @param {number} radius - Blur radius in pixels
     */
    setBlurRadius: (radius) => {
      zoomManager.updateConfig({ backgroundBlurRadius: radius });
      console.log(`🔍 Background blur radius updated: ${radius}px`);
    },
    
    /**
     * Get current zoom state and configuration
     */
    getState: () => {
      const state = zoomManager.getConfig();
      console.log('🔍 Current zoom state:', state);
      return state;
    },
    
    /**
     * Check if currently zoomed
     */
    isZoomed: () => zoomManager.isZoomedIn()
  };
  
  console.log('🔍 Global zoom utilities registered at window.notebook.zoom');
} 