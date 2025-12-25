/**
 * INTERACTIVE COOKIE VIDEO SYSTEM
 * 
 * Handles the interactive cookie video animation in the notebook background.
 * Provides click-to-progress functionality through predefined playhead positions.
 * 
 * Features:
 * - Click to advance video to next playhead position
 * - Smooth playback between positions
 * - Automatic cursor management
 * - Final state handling (disable interaction)
 * - Configuration-driven positioning and timing
 */

import { GLOBAL_CONFIG } from './config.js';

export class CookieVideoController {
  constructor() {
    this.container = null;
    this.video = null;
    this.currentPosition = 0;
    this.isPlaying = false;
    this.isComplete = false;
    
    // Get config values
    this.config = GLOBAL_CONFIG.COOKIE_VIDEO;
    this.playheadPositions = this.config.playheadPositions;
    
    this.init();
  }
  
  /**
   * Initialize the cookie video system
   */
  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupElements());
    } else {
      this.setupElements();
    }
  }
  
  /**
   * Setup DOM elements and event listeners
   */
  setupElements() {
    this.container = document.getElementById('interactive-cookie');
    this.video = document.getElementById('cookie-video');
    
    if (!this.container || !this.video) {
      console.warn('Cookie video elements not found');
      return;
    }
    
    // Apply configuration to container
    this.applyConfiguration();
    
    // Setup video properties
    this.setupVideo();
    
    // Add click event listener
    this.container.addEventListener('click', (e) => this.handleClick(e));
    
    // Setup video event listeners
    this.setupVideoEvents();
    
    console.log('Cookie video system initialized');
  }

  /**
   * Apply configuration values to container styling
   */
  applyConfiguration() {
    const { position, size } = this.config;
    
    // Apply positioning from config
    this.container.style.top = position.top;
    this.container.style.right = position.right;
    this.container.style.width = size.width;
    this.container.style.height = size.height;

    // Apply z-index from config to ensure it's clickable
    if (position.zIndex) {
      this.container.style.zIndex = position.zIndex;
    }
  }
  
  /**
   * Setup video element properties
   */
  setupVideo() {
    const { playback } = this.config;
    
    // Set video properties
    this.video.muted = playback.muted;
    this.video.loop = playback.loop;
    this.video.playbackRate = playback.speed;
    
    // Set initial position to the VERY FIRST timecode.
    this.video.currentTime = this.playheadPositions[0];
    
    // Ensure video loads metadata
    this.video.load();
  }
  
  /**
   * Setup video event listeners
   */
  setupVideoEvents() {
    // Handle when video metadata is loaded
    this.video.addEventListener('loadedmetadata', () => {
      console.log('Cookie video metadata loaded');
      this.video.currentTime = this.playheadPositions[0];
    });
    
    // Handle video loading errors
    this.video.addEventListener('error', (e) => {
      console.error('Cookie video error:', e);
    });
    
    // Handle when video reaches target position
    this.video.addEventListener('timeupdate', () => {
      if (this.isPlaying) {
        this.checkTargetPosition();
      }
    });
    
    // Handle when video ends
    this.video.addEventListener('ended', () => {
      this.handleVideoEnd();
    });
  }
  
  /**
   * Handle click on cookie container
   * Note: event.preventDefault() and event.stopPropagation() ensure this click does NOT trigger notebook zoom.
   * This is coordinated with zoomManager.js's isScrollEvent, which also excludes #interactive-cookie from zoom triggers.
   */
  handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Ignore clicks if video is already playing or complete
    if (this.isPlaying || this.isComplete) {
      return;
    }
    
    // On first click, we want to play TO the next position.
    // Subsequent clicks advance from there.
    const nextPosition = this.currentPosition + 1;

    // Check if we're at the last position
    if (nextPosition >= this.playheadPositions.length) {
      this.completeInteraction();
      return;
    }
    
    // Advance to next position
    this.advanceToNextPosition(nextPosition);
  }
  
  /**
   * Advance video to next playhead position
   */
  advanceToNextPosition(nextPosition) {
    const targetTime = this.playheadPositions[nextPosition];
    
    console.log(`Advancing from position ${this.currentPosition} to ${nextPosition} (target: ${targetTime}s)`);
    
    this.currentPosition = nextPosition;
    this.isPlaying = true;
    
    // Start playback to target position
    this.video.play().then(() => {
      // Video started successfully
    }).catch(error => {
      console.error('Error playing cookie video:', error);
      this.isPlaying = false;
    });
  }
  
  /**
   * Check if video has reached target position
   */
  checkTargetPosition() {
    if (!this.isPlaying) return;
    
    const targetTime = this.playheadPositions[this.currentPosition];
    const currentTime = this.video.currentTime;
    
    // Check if we've reached or passed the target time
    if (currentTime >= targetTime) {
      this.pauseAtPosition(targetTime);
    }
  }
  
  /**
   * Pause video at specific position
   */
  pauseAtPosition(time) {
    this.video.pause();
    this.video.currentTime = time;
    this.isPlaying = false;
    
    console.log(`Video paused at position ${this.currentPosition} (${time}s)`);
    
    // Check if we've reached the final position
    if (this.currentPosition >= this.playheadPositions.length - 1) {
      this.completeInteraction();
    }
  }
  
  /**
   * Handle video end (reached final frame)
   */
  handleVideoEnd() {
    this.isPlaying = false;
    this.completeInteraction();
  }
  
  /**
   * Complete the interaction (disable further clicks)
   */
  completeInteraction() {
    this.isComplete = true;
    this.isPlaying = false;
    
    // Update cursor and disable interaction
    this.container.classList.add('cookie-complete');
    this.container.style.cursor = this.config.interaction.feedback.cursorDisabled;
    
    console.log('Cookie video interaction complete');
  }
  
  /**
   * Reset the cookie video to initial state (for debugging)
   */
  reset() {
    this.currentPosition = 0;
    this.isPlaying = false;
    this.isComplete = false;
    
    this.video.currentTime = this.playheadPositions[0];
    this.video.pause();
    
    this.container.classList.remove('cookie-complete');
    this.container.style.cursor = this.config.interaction.feedback.cursor;
    
    console.log('Cookie video reset to initial state');
  }
  
  /**
   * Get current state for debugging
   */
  getState() {
    return {
      currentPosition: this.currentPosition,
      isPlaying: this.isPlaying,
      isComplete: this.isComplete,
      videoCurrentTime: this.video?.currentTime || 0,
      targetTime: this.playheadPositions[this.currentPosition] || 0
    };
  }
}

// Initialize cookie video system when module is loaded
let cookieVideoController = null;

// Export initialization function
export function initializeCookieVideo() {
  if (!cookieVideoController) {
    cookieVideoController = new CookieVideoController();
  }
  return cookieVideoController;
}

// Export controller for external access
export function getCookieVideoController() {
  return cookieVideoController;
}
