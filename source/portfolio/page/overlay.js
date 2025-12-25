/**
 * OVERLAY HINTS MODULE
 * 
 * Shows interaction hints (Click to Zoom & Scroll to Flip) on page load
 * Auto-hides after timeout or user interaction
 * Integrates with scrollEngine to prevent scrolling while overlay is visible
 */

import { GLOBAL_CONFIG } from './config.js';

class OverlayHints {
  constructor() {
    this.overlayElement = null;
    this.hideTimeout = null;
    this.scrollEngine = null;
    this.isVisible = false;
    this.hasBeenDismissed = false;
  }

  /**
   * Initialize the overlay system
   * @param {VirtualScrollEngine} scrollEngine - The scroll engine instance
   */
  initialize(scrollEngine) {
    if (!GLOBAL_CONFIG.OVERLAY.enabled) {
      console.log('🚫 Overlay hints disabled in config');
      return;
    }

    this.scrollEngine = scrollEngine;
    
    // Create and show overlay
    this.createOverlay();
    this.show();
    
    console.log('🎯 Overlay hints initialized');
  }

  /**
   * Create the overlay HTML structure
   */
  createOverlay() {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.className = 'overlay--hints';
    overlay.setAttribute('data-name', 'overlay--hints');
    
    // Create inner content
    overlay.innerHTML = `
      <div class="overlay--hints__inner">
        <div class="overlay--hints__content">
          <!-- Click to Zoom Animation -->
          <div class="overlay--hints__wrapper">
            <div class="overlay--hints__animation overlay--hints__animation--circles">
              <svg class="overlay--hints__svg" xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" fill="none">
                <g id="overlay-animation_1_0">
                  <circle id="overlay-node_4_1" opacity="0" cx="99.5" cy="99.5" r="84.5" stroke="#ffffff" stroke-width="2" />
                  <circle id="overlay-node_3_2" opacity="0.3" cx="99.5" cy="99.5" r="60.5" stroke="#ffffff" stroke-width="2" />
                  <circle id="overlay-node_2_3" cx="99.5" cy="99.5" r="25.5" stroke="#ffffff" stroke-width="2" />
                  <circle id="overlay-node_1_4" opacity="0" cx="99.5" cy="99.5" r="18.5" stroke="#ffffff" stroke-width="2" />
                  <circle id="overlay-node_4_5" opacity="0" cx="99.5" cy="99.5" r="84.5" stroke="#ffffff" stroke-width="2" />
                </g>
              </svg>
            </div>
            <div class="overlay--hints__label">CLICK TO ZOOM</div>
          </div>
          
          <!-- Scroll to Flip Animation -->
          <div class="overlay--hints__wrapper">
            <div class="overlay--hints__animation overlay--hints__animation--lines">
              <svg class="overlay--hints__svg" xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" fill="none">
                <g id="overlay-animation_4_0">
                  <g id="overlay-animation2wrapper_1">
                    <path id="overlay-Line07_2" opacity="0" d="M42 195H158" stroke="#ffffff" stroke-width="2" />
                    <path id="overlay-Line06_3" opacity="0.5" d="M42 168H158" stroke="#ffffff" stroke-width="2" />
                    <path id="overlay-Line05_4" d="M42 141H158" stroke="#ffffff" stroke-width="2" />
                    <path id="overlay-Line04_5" d="M42 114H158" stroke="#ffffff" stroke-width="2" />
                    <path id="overlay-Line03_6" d="M42 87H158" stroke="#ffffff" stroke-width="2" />
                    <path id="overlay-Line02_7" d="M42 60H158" stroke="#ffffff" stroke-width="2" />
                    <path id="overlay-Line01_8" opacity="0.5" d="M42 33H158" stroke="#ffffff" stroke-width="2" />
                  </g>
                </g>
              </svg>
            </div>
            <div class="overlay--hints__label">SCROLL TO FLIP</div>
          </div>
        </div>
      </div>
    `;
    
    this.overlayElement = overlay;
    document.body.appendChild(overlay);
    
    // Add event listeners
    this.setupEventListeners();
    
    // Setup animation loops
    this.setupAnimationLoops();
  }

  /**
   * Setup event listeners for dismissing overlay
   */
  setupEventListeners() {
    // Click anywhere to dismiss
    this.overlayElement.addEventListener('click', () => {
      this.hide();
    });
    
    // Detect scroll attempt (wheel event)
    const wheelHandler = (e) => {
      e.preventDefault();
      this.hide();
      // Remove this listener after first wheel event
      window.removeEventListener('wheel', wheelHandler, { passive: false });
    };
    
    window.addEventListener('wheel', wheelHandler, { passive: false });
    
    // Touch events for mobile
    let touchStartY = null;
    const touchStartHandler = (e) => {
      touchStartY = e.touches[0].clientY;
    };
    
    const touchMoveHandler = (e) => {
      if (touchStartY !== null && Math.abs(e.touches[0].clientY - touchStartY) > 10) {
        e.preventDefault();
        this.hide();
        // Remove touch listeners after first swipe
        window.removeEventListener('touchstart', touchStartHandler);
        window.removeEventListener('touchmove', touchMoveHandler, { passive: false });
      }
    };
    
    window.addEventListener('touchstart', touchStartHandler);
    window.addEventListener('touchmove', touchMoveHandler, { passive: false });
  }

  /**
   * Setup animation loops for both circle and line animations
   */
  setupAnimationLoops() {
    // Animation 1: Circle animation loop
    const circleIdNames = ["overlay-node_3_2", "overlay-node_2_3", "overlay-node_1_4"];
    
    const circleCandidate = document.getElementById("overlay-node_1_4");
    if (circleCandidate) {
      circleCandidate.addEventListener("animationend", (event) => {
        if (event.animationName === "animation_node_1_4_flow_2" && this.isVisible) {
          circleIdNames.forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
              const animation = element.style.animation;
              element.style.animation = 'none';
              setTimeout(() => {
                if (this.isVisible) { // Check if overlay is still visible
                  element.style.animation = animation;
                }
              }, 5);
            }
          });
        }
      });
    }

    // Animation 2: Line animation loop
    const lineIdNames = ["overlay-Line07_2", "overlay-Line06_3", "overlay-Line05_4", "overlay-Line04_5", "overlay-Line03_6", "overlay-Line02_7", "overlay-Line01_8"];
    
    const lineCandidate = document.getElementById("overlay-Line01_8");
    if (lineCandidate) {
      lineCandidate.addEventListener("animationend", (event) => {
        if (event.animationName === "animation_Line01_8_flow_2" && this.isVisible) {
          lineIdNames.forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
              const animation = element.style.animation;
              element.style.animation = 'none';
              setTimeout(() => {
                if (this.isVisible) { // Check if overlay is still visible
                  element.style.animation = animation;
                }
              }, 5);
            }
          });
        }
      });
    }
  }

  /**
   * Show the overlay
   */
  show() {
    if (this.isVisible || this.hasBeenDismissed) return;
    
    this.isVisible = true;
    
    // Pause scroll input
    if (this.scrollEngine) {
      this.scrollEngine.pauseInput();
    }
    
    // Force layout and trigger animation
    this.overlayElement.offsetHeight;
    this.overlayElement.classList.add('overlay--hints--visible');
    
    // Setup auto-hide timeout
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, GLOBAL_CONFIG.OVERLAY.autoHideDelay);
    
    console.log('🎨 Overlay hints shown');
  }

  /**
   * Hide the overlay
   */
  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.hasBeenDismissed = true;
    
    // Clear timeout if exists
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    
    // Start fade out animation
    this.overlayElement.classList.remove('overlay--hints--visible');
    
    // Resume scroll input after animation
    setTimeout(() => {
      if (this.scrollEngine) {
        this.scrollEngine.resumeInput();
      }
      
      // Remove from DOM
      if (this.overlayElement && this.overlayElement.parentNode) {
        this.overlayElement.parentNode.removeChild(this.overlayElement);
        this.overlayElement = null;
      }
      
      console.log('🎨 Overlay hints hidden and removed');
    }, GLOBAL_CONFIG.OVERLAY.fadeOutDuration);
  }

  /**
   * Destroy the overlay system
   */
  destroy() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
    
    this.overlayElement = null;
    this.scrollEngine = null;
  }
}

// Export singleton instance
export const overlayHints = new OverlayHints(); 