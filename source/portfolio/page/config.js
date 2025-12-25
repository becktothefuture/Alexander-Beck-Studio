/**
 * GLOBAL CONFIGURATION SYSTEM
 *
 * This file centralizes all layout, performance, and visual parameters.
 * All configuration values are globally defined (NOT in JSON).
 * Based on the Ring-Bound Notebook Technical Specification.
 *
 * COORDINATE SYSTEM:
 * - X: Left/Right (positive = right)
 * - Y: Up/Down (positive = down in screen space, up in 3D space)
 * - Z: Forward/Back (positive = toward viewer)
 * - Rotations in degrees (0° = flat, 90° = vertical, 180° = upside down)
 */

import {
  easeInCubic,
  easeInOutCubic,
  easeInOutExpo,
  easeOutCubic,
  easeOutDampedSpring,
  easeOutSingleSpring,
} from './utils.js';
import { getPageLiftHeight } from './physics.js';

export const GLOBAL_CONFIG = {
  LAYOUT: {
    // WORKING ✓ - Controls page aspect ratio in portfolioLoader.js and CSS --page-aspect-ratio
    // Enforces 4:3 aspect ratio for all pages within responsive container
    // Used in: render.js:331, style.css:27 as CSS custom property
    pageAspectRatio: 4 / 3, // Enforced globally across all page elements

    // WORKING ✓ - Controls content alignment within pages
    // Applied as CSS class suffix in portfolioLoader.js:187 (page-content--bottom)
    // Determines where content sits within each page (top/center/bottom)
    contentAlignment: 'bottom', // Enforced globally - creates CSS class page-content--{alignment}

    // WORKING ✓ - Defines ring hole area height at top of pages
    // Used in: render.js:332, style.css:28 as --safe-zone-height CSS property
    // Creates visual spacing for ring holes, prevents content overlap with rings
    safeZoneHeight: 50, // px - ring hole area height, applied to .page-holes elements

    // === COVER SIZING SYSTEM ===
    // WORKING ✓ - Controls cover sizing relative to regular pages
    // Front cover sizing (first page) - same size as regular pages
    frontCover: {
      // Width multiplier relative to page size (1.0 = same size as pages)
      widthMultiplier: 1.0, // Cover width same as regular pages (100%)
      
      // Height multiplier relative to page size (1.0 = same size as pages)  
      heightMultiplier: 1.0, // Cover height same as regular pages (100%)
      
      // Left offset (0 = no offset, aligned with pages)
      leftOffset: 0, // % - no offset, same position as regular pages
      
      // Top offset (0 = no offset, aligned with pages)
      topOffset: 0, // % - no offset, same position as regular pages
    },
    
    // Back cover sizing (last page) - same size as regular pages
    backCover: {
      // Width multiplier relative to page size (1.0 = same size as pages)
      widthMultiplier: 1.0, // Cover width same as regular pages (100%)
      
      // Height multiplier relative to page size (1.0 = same size as pages)
      heightMultiplier: 1.0, // Cover height same as regular pages (100%)
      
      // Left offset (0 = no offset, aligned with pages)
      leftOffset: 0, // % - no offset, same position as regular pages
      
      // Top offset (0 = no offset, aligned with pages)
      topOffset: 0, // % - no offset, same position as regular pages
    },
  },

  PERFORMANCE: {
    // WORKING ✓ - Target frame rate for performance monitoring
    // Used in: performance.js:41 as this.targetFPS for FPS tracking and quality scaling decisions
    // Triggers quality reduction when FPS drops below 70% of this value (84fps)
    targetFPS: 120, // Target frames per second - performance monitoring baseline

    // WORKING ✓ - Target frame time in milliseconds (1000/targetFPS)
    // Used in: performance.js:42, performanceAwareScheduler for task time budgeting
    // Used to determine if frames are taking too long and trigger optimizations
    frameTimeTarget: 16.67, // ms - maximum time per frame to maintain targetFPS

    // WORKING ✓ - Maximum pages rendered simultaneously for performance
    // Used in: render.js:93 for viewport culling, performance.js:241 for quality scaling
    // Controls how many pages are visible/rendered at once, directly impacts memory/performance
    maxVisiblePages: 8, // Pages rendered simultaneously - key performance control

    // WORKING ✓ - Memory usage limit in MB before triggering optimizations
    // Used in: performance.js:43 as this.memoryLimit for memory monitoring
    // When exceeded, triggers aggressive content culling and quality reduction
    memoryLimit: 50, // MB - memory limit before performance optimizations kick in

    // WORKING ✓ - Minimum quality scale when performance is poor
    // Used in: performance.js:201,208 as lower bound for quality scaling
    // Prevents quality from dropping below 50% even on very slow devices
    qualityScaleMin: 0.5, // Minimum visual quality scale (0.5 = 50% quality)

    // WORKING ✓ - Maximum quality scale for optimal performance
    // Used in: performance.js:31 as initial qualityScale value
    // Starting point for quality scaling, reduces when performance drops
    qualityScaleMax: 1.0, // Maximum visual quality scale (1.0 = 100% quality)
    
    // WORKING ✓ - Emergency FPS threshold for critical performance issues
    // Used in: performance.js for emergency quality scaling when FPS is critically low
    // Below this FPS, system enters emergency mode with minimal effects
    emergencyFpsThreshold: 15, // FPS below which emergency optimizations activate

    // WORKING ✓ - Emergency mode page limit for critical performance
    // Used when emergencyFpsThreshold is hit to drastically reduce visible pages
    // Ensures basic functionality even on extremely slow devices
    emergencyMaxVisiblePages: 3, // Pages visible during emergency performance mode

    // WORKING ✓ - Emergency mode quality scale for critical performance
    // Applied when FPS drops below emergencyFpsThreshold
    // Disables most visual effects to maintain basic functionality
    emergencyQualityScale: 0.2, // Quality scale during emergency performance mode

    // WORKING ✓ - Controls background asset loading system
    // Used in asset loading logic to enable/disable background preloading
    // Helps reduce initial load time by deferring non-critical assets
    backgroundLoadingEnabled: true, // Whether to use background asset loading

    // WORKING ✓ - Delay before starting background asset loading
    // Prevents background loading from interfering with critical page rendering
    // Ensures user sees content quickly before loading secondary assets
    backgroundLoadDelay: 150, // ms delay before background loading starts

    // WORKING ✓ - Speed reduction factor for background loading
    // Slows down background loading to avoid impacting user interactions
    // 0.5 = background loading at 50% speed to prioritize user experience
    backgroundLoadSpeedReduction: 0.5, // Factor to slow background loading (0-1)
  },

  // === LOCKED PORTFOLIO SYSTEM ===
  LOCK: {
    // 3-digit numeric unlock code
    code: [1, 2, 3],

    // Name of cookie storing unlocked state
    cookieName: 'portfolioUnlocked',

    // Cookie Time-to-live in seconds (1 year)
    cookieTTL: 31536000,

    // Enable persistent cookie? Set to false to always show lock (dev mode)
    persistence: false,

    // Animation parameters (adjustable)
    strapSlideDistanceVW: 2, // How far straps move outward (vw units)
    strapDuration: 1500,     // ms - slide duration
    bandDuration: 1500,       // ms - lift/fade duration
    bandLift: 80,            // px - translateZ or translateY distance
    bandScale: 1.1,          // final scale factor
    bandBlur: 10,             // px - blur at end

    // Cover rumble effect
    coverRumbleMaxDeg: 1.8, // subtler resistance knock
  },

  // 3D Notebook Depth Model - Controls Z-axis positioning of pages
  DEPTH: {
    // WORKING ✓ - Starting Z position for bottom unread page
    // Used in: pageTransforms.js:17 as BOTTOM_UNREAD_Z constant
    // Foundation for the entire 3D stacking system - all other depths calculated from this
    bottomUnreadZ: 5, // px - Z position of bottom unread sheet (foundation of stack)

    // WORKING ✓ - Z spacing between each page in the stack
    // Used in: pageTransforms.js:18 as SPACING_Z for calculating page depths
    // Each page is spacingZ pixels closer to camera than the one below it
    spacingZ: 2, // px - Z distance between adjacent pages in stack

    // Dynamically derived from paper weight for material realism
    liftHeight: getPageLiftHeight(150), // 150 gsm default → 37.5 px
  },

  // === PHYSICAL PROPERTIES (real materiality) ===
  PHYSICAL: {
    pageGSM: 150,      // default paper weight
    baseLiftPx: 28,    // lift for 80 gsm baseline – increased to avoid shadow collision
  },

  // Flip Animation - Controls how pages flip and respond to input
  ANIMATION: {
    // WORKING ✓ - Duration of page flip animation in milliseconds
    // Used in: pageTransforms.js:20, render.js:412, scrollEngine.js:406
    // Controls how long it takes for a page to complete a 180° flip
    duration: 200, // ms - time for complete page flip (0° to 180°)

    // WORKING ✓ - Threshold for automatic page snap completion
    // Used in: scrollEngine.js:25, config.js:302 in PAGE_ANIMATION legacy mapping
    // When flip progress reaches this percentage, page automatically completes flip
    snapThreshold: 45, // % - flip progress where page commits to completing flip

    // WORKING ✓ - Duration for snap-back or snap-forward animations
    // Used in: scrollEngine.js:406 as default duration for snapToPage()
    // How quickly pages snap when user doesn't complete a full flip gesture
    snapDuration: 150, // ms - quick fall with gravity, ease-out only

    // WORKING ✓ - Mouse wheel sensitivity for desktop
    // Used in: scrollEngine.js:37, config.js:298 in PAGE_ANIMATION
    // Higher values = more sensitive to mouse wheel input (faster page flipping)
    scrollSensitivity: 0.20, // Desktop scroll input sensitivity (higher = more sensitive)

    // WORKING ✓ - Touch sensitivity for mobile devices
    // Used in: scrollEngine.js:36 when isMobile is detected
    // Separate sensitivity for touch devices due to different input characteristics
    scrollSensitivityMobile: 0.18, // Mobile touch input sensitivity

    // User-specified easing curves for different animation phases
    easing: {
      // WORKING ✓ - Used in CSS transitions for page lift and hinge motion (0% → 50%)
      // Applied during first half of flip when page lifts and starts rotating
      liftHinge: 'cubic-bezier(.55,.05,.67,.19)', // Easing for lift & hinge phase

      // WORKING ✓ - Used in CSS transitions for page drop and settle motion (50% → 100%)
      // Applied during second half of flip when page drops and settles into place
      dropSettle: 'cubic-bezier(.25,.46,.45,1)', // Easing for drop & settle phase

      // WORKING ✓ - Used for page content opacity changes during flips
      // Applied when content fades in/out during page transitions
      contentFade: 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Page content visibility changes

      // WORKING ✓ - Used for motion blur and ring rotation animations
      // Applied to ring movements and motion blur effects during page flips
      // CONSOLIDATED: Combined motionBlur and ringRotation (same easing curve)
      smooth: 'cubic-bezier(0.25, 0.46, 0.45, 1)', // Smooth transitions for rings and motion blur

      // WORKING ✓ - Used for shadow skewing and scaling animations
      // Applied to dynamic shadows that appear when pages flip
      shadowTransform: 'cubic-bezier(0.33, 1, 0.68, 1)', // Shadow skewing/scaling easing
    },

    // Global transition durations for different visual effects
    transitions: {
      // WORKING ✓ - Duration for page content opacity changes
      // Used in render.js for content fade transitions during flips
      contentFade: 150, // ms for page content opacity changes

      // WORKING ✓ - Duration for motion blur to appear
      // Controls how quickly motion blur effect activates during fast flips
      motionBlurEntry: 100, // ms for motion blur to appear

      // WORKING ✓ - Duration for motion blur to disappear
      // Controls how quickly motion blur effect fades after flip completes
      motionBlurExit: 200, // ms for motion blur to disappear

      // WORKING ✓ - Duration for ring rotation animations
      // Used in render.js:159 as --rings-transition-duration CSS property
      ringMovement: 100, // ms for ring rotations

      // WORKING ✓ - Duration for shadow transform animations
      // Used in render.js for shadow skewing and scaling during page flips
      shadowMovement: 120, // ms for shadow transformations
    },

    // Momentum-driven page flipping system for natural feel
    momentum: {
      // WORKING ✓ - Whether momentum system is active
      // Used in: scrollEngine.js:48 via getAdaptiveMomentumConfig()
      // Enables physics-based momentum after user stops scrolling
      enabled: false, // Enable momentum-driven page flipping

      // Physics parameters for momentum calculations
      // WORKING ✓ - Velocity decay rate for desktop
      // Used in: scrollEngine.js momentum calculations, utils.js:394 adaptive config
      // Lower values = momentum lasts longer, higher = stops quicker
      decay: 0.01, // Desktop momentum decay rate (lower = longer momentum)

      // WORKING ✓ - Velocity decay rate for mobile
      // Used in: utils.js:394 when isMobile is detected
      // Slightly faster decay for mobile due to different interaction patterns
      decayMobile: 0.0015, // Mobile momentum decay rate

      // WORKING ✓ - Minimum velocity to trigger momentum
      // Used in: scrollEngine.js:247 to determine if momentum should start
      // Below this velocity, pages just snap to nearest position
      minVelocity: 0.003, // Minimum velocity to start momentum animation

      // WORKING ✓ - Dead zone velocity to prevent unwanted momentum
      // Used in: scrollEngine.js:241 to prevent momentum right after snaps
      // Prevents accidental momentum when user has just completed an action
      deadZoneVelocity: 0.008, // Velocity threshold for dead zone prevention

      // WORKING ✓ - Maximum duration for momentum animation
      // Used in: scrollEngine.js:259 as safety cap for momentum duration
      // Prevents momentum from continuing indefinitely on slow devices
      maxDuration: 1000, // ms - maximum momentum duration

      // Velocity-to-page conversion factors
      // WORKING ✓ - Desktop velocity to pages conversion factor
      // Used in: scrollEngine.js:311 to calculate how many pages to flip based on velocity
      // Higher values = more aggressive page turning with same velocity
      velocityToPages: 300, // Desktop velocity-to-pages conversion factor

      // WORKING ✓ - Mobile velocity to pages conversion factor
      // Used in: scrollEngine.js:311 when isMobile is detected
      // Different factor for mobile due to touch input characteristics
      velocityToPagesMobile: 200, // Mobile velocity-to-pages conversion factor

      // WORKING ✓ - Maximum extra pages per momentum burst
      // Used in: scrollEngine.js:312 to cap momentum-driven page flipping
      // Prevents momentum from flipping too many pages at once
      maxExtraPages: 5, // Maximum pages per momentum burst

      // Dynamic snap duration based on momentum distance
      // WORKING ✓ - Base duration for momentum snaps
      // Used in: scrollEngine.js:324 for calculating dynamic snap duration
      // Starting point for momentum snap timing
      baseDuration: 100, // ms - base snap duration for momentum

      // WORKING ✓ - Additional time per page for momentum snaps
      // Used in: scrollEngine.js:324 to scale duration based on distance
      // Longer distances get proportionally more time
      durationMultiplier: 20, // ms - additional time per page distance

      // WORKING ✓ - Maximum snap duration cap
      // Used in: scrollEngine.js:324 to prevent overly long momentum animations
      // Ensures momentum snaps don't take too long even for large distances
      maxSnapDuration: 300, // ms - maximum momentum snap duration
    },

    // === DIRECT SCROLL-TO-FLIP OPTIONS ===
    momentumEnabled: false, // Disable momentum by default for 1-to-1 wheel mapping
    autoSnap: true,         // Enable automatic completion when progress crosses threshold

    // Flip feel parameters (tweakable in debug panel)
    liftAccel: 1.0,        // Direct linear lift (unused in direct mode)
    landingDamping: 0,     // No damping – direct mapping
    liftSplit: 0.2,        // First 20% of progress is “lift” phase
  },

  // === AUDIO SETTINGS ===
  SOUND: {
    scrollWheel: {
      enabled: false, // Disabled: using page flip sound instead of wheel ticks
      baseGain: 0.15,            // very quiet clicks
      minVelocityThreshold: 50,     // below -> stop
      // Multiplier to convert wheel velocity (px/s) to click loop playback rate (Hz)
      velocityToHzMultiplier: 0.02, // maps 50 px/s → 1 Hz (tweakable in debug panel)
      maxPlaybackRate: 8,           // upper clamp (safety)
      lockGainMul: 0.5,             // relative block gain factor
      paperCutoffHz: 1000,        // high-pass for unlocked paper click
      blockCutoffHz: 450,         // low-pass for blocked click
      blockGainMul: 1.2,          // louder thunk when locked
    },
    pageFlip: {
      enabled: true,
      baseGain: 0.35,            // softer volume for page turn
      minVelocityPxPerS: 0,      // play on every flip (threshold disabled)
      velocityToRateMul: 0,      // no speed scaling – constant playback
      // Deprecated: kept for debug panel compatibility (no effect)
      velocityToGainMul: 0,
    },
    blockKnock: {
      gain: 0.6,         // loudness of knock
      cutoffHz: 400,     // low-pass cutoff for dull thud
    },
    rustle: {
      baseGain: 0.25,    // master gain for continuous rustle
    },
  },

  SCENE: {
    // WORKING ✓ - 3D perspective distance for entire scene
    // Used in: render.js:314, config.js:311 as CSS --perspective-distance
    // Controls depth perception - higher = less dramatic 3D, lower = more dramatic
    // REDUCED: From 13000px to 3000px for better depth buffer precision
    // Typical values: 1000-5000px. Lower values = more dramatic 3D, better precision
    perspective: 3000, // px - 3D perspective distance (reduced for precision)

    // WORKING ✓ - Horizontal perspective origin point
    // Used in: render.js:315, config.js:312 as CSS --perspective-origin-x
    // Controls horizontal vanishing point for 3D perspective
    perspectiveOriginX: '50%', // Horizontal perspective origin (50% = center)

    // WORKING ✓ - Vertical perspective origin point
    // Used in: render.js:316, config.js:313 as CSS --perspective-origin-y
    // 350% = far below viewport, creates looking-down-at-notebook effect
    perspectiveOriginY: '350%', // Vertical perspective origin (350% = far below)

    // WORKING ✓ - Horizontal transform origin for page rotations
    // Used in: render.js:335, config.js:290 as CSS --transform-origin-x
    // Controls horizontal pivot point for page flips
    transformOriginX: '50%', // Horizontal transform origin for page flips

    // WORKING ✓ - Vertical transform origin for page rotations
    // Used in: render.js:336, config.js:291 as CSS --transform-origin-y
    // -2% = slightly above page top, creates natural hinge effect above ring holes
    transformOriginY: '2%', // Vertical transform origin (-1% = 1% above top edge)

    // WORKING ✓ - Z-index for ring elements
    // Used in: app.js:161 as CSS --ring-z-index property
    // Ensures rings always appear on top of pages
    ringZIndex: 5000, // Z-index for rings (always on top)

    // WORKING ✓ - Z-index for currently active/flipping page
    // Used in: app.js:162 as CSS --active-page-z-index property
    // Ensures flipping page appears above other pages during animation
    activePageZIndex: 1000, // Z-index for active/flipping pages
  },

  // Zoom System Configuration - Controls click-to-zoom functionality
  // PANEL CONTROLS: Press "/" to open control panel with live zoom adjustment
  // RUNTIME API: window.notebook.zoom.setScales(initial, focused) for programmatic control
  ZOOM: {
    // WORKING ✓ - Default notebook scale (initial zoom level)
    // Used in: zoomManager.js:applyCSSConfiguration() as CSS --notebook-zoom-scale
    // Panel Control: "Initial Zoom" slider (50%-120%)
    // Starting scale for notebook - allows zoom in for better readability
    defaultScale: 0.78, // Default notebook scale (78% - allows room to zoom in)

    // WORKING ✓ - Focused notebook scale when zoomed in
    // Used in: zoomManager.js:applyCSSConfiguration() as CSS --notebook-zoom-focused-scale
    // Panel Control: "Focused Zoom" slider (80%-150%)
    // Scale when user clicks to zoom in for detailed viewing
    focusedScale: 1.1, // Focused notebook scale (110% - zoomed in for detail)

    // WORKING ✓ - Transform origin point for zoom animation
    // Used in: zoomManager.js zoom calculations
    // Controls where zoom animation centers from (50% 60% = center-bottom)
    transformOrigin: '50% 60%', // Zoom origin point (center-bottom area)

    // WORKING ✓ - Duration of zoom transition animation
    // Used in: zoomManager.js:applyCSSConfiguration() as CSS --zoom-duration
    // Panel Control: "Transition Speed" slider (100-800ms)
    // How long it takes to zoom in/out when user clicks
    transitionDuration: 350, // ms - zoom animation duration

    // WORKING ✓ - Easing function for zoom transitions
    // Used in: zoomManager.js:applyCSSConfiguration() as CSS --zoom-easing
    // Creates smooth, natural feeling zoom animation
    transitionEasing: 'cubic-bezier(0.25, 0.5, 0.5, 1)', // Zoom animation easing
    
    // Background zoom for realistic camera effect
    background: {
      // WORKING ✓ - Default background scale
      // Used in: zoomManager.js:70 as CSS --background-zoom-scale
      // Background stays at 100% when notebook is at default scale
      defaultScale: 1.0, // Default background scale (100%)

      // WORKING ✓ - Background scale when notebook is focused
      // Used in: zoomManager.js:71 as CSS --background-zoom-focused-scale
      // Background scales down slightly to simulate camera zoom effect
      focusedScale: 0.98, // Background scale when focused (97% - subtle zoom out)
      
      // Blur radius for background when focused (in px)
      blurRadius: 8,
    },
    
    // Coordination with scroll animations
    // WORKING ✓ - Whether to pause scrolling during zoom transitions
    // Used in: zoomManager.js:121,151 to pause/resume scroll input
    // Prevents scroll conflicts during zoom animation
    pauseScrollDuringZoom: true, // Prevent scroll conflicts during zoom

    // WORKING ✓ - Delay before re-enabling scroll after zoom
    // Used in: zoomManager.js:198 for resumeScrollDelay timeout
    // Brief pause after zoom completes before allowing scroll input
    resumeScrollDelay: 100, // ms - delay before re-enabling scroll after zoom
  },

  RINGS: {
    // Ring positioning - individual control for front and back rings
    front: {
      // === START STATE (when stack is unflipped) ===
      // WORKING ✓ - Z distance offset from calculated front position when unflipped
      // Used in: render.js for front ring Z positioning
      offsetZStart: 0, // px - additional Z offset from calculated front position when unflipped

      // WORKING ✓ - Z distance offset from calculated front position when fully flipped
      // Used in: render.js for front ring Z positioning during animation
      offsetZEnd: 0, // px - additional Z offset from calculated front position when flipped

      // WORKING ✓ - Vertical offset from page center when stack is unflipped
      // Used in: render.js for ring positioning and animation calculations
      // Negative values move rings up relative to page center
      offsetYStart: 10, // % - vertical offset when stack is unflipped

      // WORKING ✓ - Vertical offset from page center when stack is fully flipped
      // Used in: render.js ring animation calculations for interpolation during flipping
      // Allows rings to move down as pages are flipped (creates dynamic positioning)
      offsetYEnd: 24, // % - vertical offset when stack is fully flipped

      // WORKING ✓ - Horizontal scale factor for front rings when unflipped
      // Used in: render.js in transform calculations
      // 1.02 = 2% larger than page width for realistic overhang
      scaleXStart: 1.02, // Horizontal scale factor when unflipped

      // WORKING ✓ - Horizontal scale factor for front rings when fully flipped
      // Used in: render.js in transform calculations during animation
      scaleXEnd: 1.0, // Horizontal scale factor when flipped

      // WORKING ✓ - Vertical scale factor for front rings when unflipped
      // Used in: render.js in transform calculations
      // 1.3 = 30% taller for realistic ring proportions
      scaleYStart: 1.3, // Vertical scale factor when unflipped

      // WORKING ✓ - Vertical scale factor for front rings when fully flipped
      // Used in: render.js in transform calculations during animation
      scaleYEnd: 1.8, // Vertical scale factor when flipped

      // WORKING ✓ - Rotation when no pages are flipped
      // Used in: render.js for initial and progress-based rotation
      // Positive rotation tilts rings forward when stack is full
      rotationStart: 20, // degrees - rotation when stack is unflipped

      // WORKING ✓ - Rotation when all pages are flipped
      // Used in: render.js for calculating rotation progress
      // Negative rotation tilts rings backward when stack is empty
      rotationEnd: -45, // degrees - rotation when stack is fully flipped

      // === LEGACY COMPATIBILITY (will be removed) ===
      rotationUnflipped: 20, // DEPRECATED - use rotationStart
      rotationFlipped: -45, // DEPRECATED - use rotationEnd
      scaleX: 1.02, // DEPRECATED - use scaleXStart/scaleXEnd
      scaleY: 1.3, // DEPRECATED - use scaleYStart/scaleYEnd
    },
    back: {
      // === START STATE (when stack is unflipped) ===
      // WORKING ✓ - Z distance behind bottom page when unflipped
      // Used in: render.js for back ring positioning
      offsetZStart: 3, // px - distance behind bottom page when unflipped

      // WORKING ✓ - Z distance behind bottom page when fully flipped
      // Used in: render.js for back ring positioning during animation
      offsetZEnd: 3, // px - distance behind bottom page when flipped

      // WORKING ✓ - Vertical offset from page center when unflipped
      // Used in: render.js as CSS --rings-back-offset-y
      // More negative than front rings to create depth separation
      offsetYStart: 10, // % - vertical offset when stack is unflipped (moved down to align with spine)

      // WORKING ✓ - Vertical offset from page center when fully flipped
      // Used in: render.js for back ring animation calculations
      offsetYEnd: 10, // % - vertical offset when stack is fully flipped (kept constant for now)

      // WORKING ✓ - Horizontal scale factor for back rings when unflipped
      // Used in: render.js in transform calculations
      scaleXStart: 1.05, // Horizontal scale factor when unflipped

      // WORKING ✓ - Horizontal scale factor for back rings when fully flipped
      // Used in: render.js in transform calculations during animation
      scaleXEnd: 1.05, // Horizontal scale factor when flipped

      // WORKING ✓ - Vertical scale factor for back rings when unflipped
      // Used in: render.js in transform calculations
      scaleYStart: 1.3, // Vertical scale factor when unflipped

      // WORKING ✓ - Vertical scale factor for back rings when fully flipped
      // Used in: render.js in transform calculations during animation
      scaleYEnd: 1.3, // Vertical scale factor when flipped

      // WORKING ✓ - Rotation when no pages are flipped
      // Used in: render.js for initial and progress-based rotation
      // Less rotation than front rings for subtle depth effect
      rotationStart: 0, // degrees - rotation when stack is unflipped

      // WORKING ✓ - Rotation when all pages are flipped
      // Used in: render.js for calculating rotation progress
      // Less rotation than front rings for subtle depth effect
      rotationEnd: 0, // degrees - rotation when stack is fully flipped

      // === LEGACY COMPATIBILITY (will be removed) ===
      offsetZ: 3, // DEPRECATED - use offsetZStart/offsetZEnd
      offsetY: -30, // DEPRECATED - use offsetYStart/offsetYEnd
      scaleX: 1.05, // DEPRECATED - use scaleXStart/scaleXEnd
      scaleY: 1.3, // DEPRECATED - use scaleYStart/scaleYEnd
      rotationUnflipped: 0, // DEPRECATED - use rotationStart
      rotationFlipped: 0, // DEPRECATED - use rotationEnd
    },
    
    // Animation settings for ring movements
    // WORKING ✓ - Smoothing factor for ring animations (0-1)
    // Used in ring animation calculations for smooth movement
    // Lower values = smoother but slower response to page flips
    animationSmoothing: 0.08, // 0-1 - lower = smoother but slower response

    // WORKING ✓ - CSS easing function for ring transitions (uses consolidated smooth easing)
    // Used in: render.js:159 as CSS transition easing
    // Creates smooth, natural ring movement during page flips
    easingTransition: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Ring transition easing

    // WORKING ✓ - Duration for ring movement transitions
    // Used in: render.js:159 as CSS transition duration
    // How long ring movements take to complete
    transitionDuration: 120, // ms - ring movement transition duration

    // WORKING ✓ - Perspective distance for ring container
    // Used in: render.js:357 as CSS --rings-perspective
    // Creates 3D perspective specifically for ring elements
    perspective: 1000, // px - perspective distance for ring container
    
    // Y position animation (shared between both rings)
    // WORKING ✓ - Y position when no pages are flipped
    // Used in: render.js:358,453,458,632,635,661,665 for Y positioning
    // Negative values move rings up when stack is full
    yPositionUnflipped: -14, // % - Y position when stack is unflipped

    // WORKING ✓ - Y position when all pages are flipped
    // Used in: render.js:359,632,635 for Y positioning based on flip progress
    // Less negative = rings move down as pages are flipped
    yPositionFlipped: -4, // % - Y position when stack is fully flipped
  },

  /**
   * Skewed Page Shadow Settings - Controls dynamic shadows during page flips
   * WORKING ✓ - All shadow settings are used in render.js updatePageShadow()
   * Creates realistic shadows that appear on pages when the page above them flips
   */
  SHADOW: {
    // Shadow gradient colors for CSS background
    // WORKING ✓ - Used in render.js:365 as CSS --page-shadow-start
    // Darkest part of shadow gradient (0% stop)
    gradientStart: 'rgba(0,0,0,0.78)', // 0% stop - darkest part of shadow

    // WORKING ✓ - Used in render.js:366 as CSS --page-shadow-mid
    // Middle part of shadow gradient (50% stop)
    gradientMid: 'rgba(0,0,0,0.39)', // 50% stop - middle part of shadow

    // WORKING ✓ - Used in render.js:367 as CSS --page-shadow-end
    // Transparent end of shadow gradient (100% stop)
    gradientEnd: 'rgba(0,0,0,0)', // 100% stop - transparent end

    // WORKING ✓ - Used in render.js:369 as CSS --shadow-mid-stop
    // Position of middle color in gradient
    gradientMidStop: 50, // % - position of middle color stop

    // WORKING ✓ - Used in render.js:368 as CSS --page-shadow-angle
    // Direction of shadow gradient (180° = straight down)
    gradientAngle: 180, // degrees - gradient direction (180° = straight down)
    
    // Shadow transform animation parameters
    // WORKING ✓ - Used in render.js:278,258 for shadow skewing animation
    // Maximum skew angle when page above is fully flipped
    maxSkew: -45, // degrees - maximum skew angle (0° to -45°)

    // WORKING ✓ - Used in render.js:281,258 for shadow scaling animation
    // Minimum height scale when shadow animation completes
    minHeightScale: 0, // scale factor - minimum height scale (1.0 to 0.0)
    
    // Shadow opacity animation during page flip
    // WORKING ✓ - Used in render.js:287,258 for shadow opacity calculation
    // Shadow opacity when page above starts flipping
    startOpacity: 1.0, // opacity when page above starts flipping (0°)

    // WORKING ✓ - Used in render.js:288,258 for shadow opacity calculation
    // Shadow opacity when page above completes flip
    endOpacity: 0.5, // opacity when page above completes flip (120°)
    
    // Animation timing and curve parameters
    // WORKING ✓ - Used in render.js:253,265 to determine when shadow animation completes
    // Rotation angle of page above when shadow reaches final state
    flipLimitDeg: 140, // degrees - rotation of page above when shadow completes

    // WORKING ✓ - Used in render.js:269 for exponential shadow movement calculation
    // Controls how shadow movement accelerates (higher = more dramatic curve)
    exponentialCurve: 2, // curve factor - controls shadow movement speed curve

    // WORKING ✓ - Used in CSS transitions for shadow elements
    // Duration of CSS transitions for shadow transforms
    transitionDuration: 80, // ms - CSS transition duration for shadows

    // WORKING ✓ - Used in CSS transitions for shadow elements
    // Easing function for smooth shadow animations
    easingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)', // CSS easing for shadow animations
  },

  /**
   * Page Backface Settings - Controls appearance of page backs when flipped
   * WORKING ✓ - All backface settings used in render.js initializeRenderingContext()
   */
  BACKFACE: {
    // WORKING ✓ - Used in render.js:373 as CSS --backface-color
    // Base color for page backs when flipped over (uses COLORS.default)
    color: '#f5f5f5', // Base color for page backs (light gray)

    // WORKING ✓ - Used in render.js:375 as CSS --backface-gradient (when not null)
    // Optional gradient override for page backs
    gradient: null, // Optional gradient override (null = use solid color)

    // WORKING ✓ - Used in render.js:378 as CSS --backface-texture (when not null)
    // Optional texture/pattern URL for page backs
    texture: null, // Optional texture/pattern URL for page backs

    // WORKING ✓ - Used in CSS for page-back border-radius
    // Inherits border radius from page-front for consistency
    borderRadius: 'inherit', // Inherit border radius from page-front

    // WORKING ✓ - Used for Z positioning of page-back relative to page-front
    // Ensures page back appears behind page front
    zOffset: -1, // px - Z offset behind page-front

    // Alternative backface colors for different page types
    // WORKING ✓ - Used for cover pages when they're flipped
    // Darker brown color for cover page backs
    coverColor: 'rgba(139, 69, 19, 0.9)', // Darker brown for cover page backs

    // WORKING ✓ - Used for video pages when they're flipped
    // Dark color for video page backs
    videoPageColor: 'rgba(0, 0, 0, 0.9)', // Dark color for video page backs
    
    // Strength multiplier for backface shadow opacity
    shadowStrength: 1.2,
    
    // Shadow gradient settings for page backs
    shadowGradient: {
      // WORKING ✓ - Used in render.js:382 to enable/disable backface shadows
      // Whether to show shadow gradients on page backs
      enabled: true, // Enable shadow gradients on page backs

      // WORKING ✓ - Used in render.js:383 for shadow gradient direction
      // Direction of diagonal shadow on page backs
      direction: 'to bottom right', // Diagonal shadow direction

      // WORKING ✓ - Used in render.js:383 for shadow gradient start color
      // Starting color of shadow gradient (lighter)
      startColor: 'rgba(0, 0, 0, 0.3)', // Shadow gradient start color

      // WORKING ✓ - Used in render.js:383 for shadow gradient end color
      // Ending color of shadow gradient (darker)
      endColor: 'rgba(0, 0, 0, 0.6)', // Shadow gradient end color

      // WORKING ✓ - Used in render.js:383 for gradient positioning
      // Where shadow gradient starts
      startPosition: '0%', // Shadow gradient start position

      // WORKING ✓ - Used in render.js:383 for gradient positioning
      // Where shadow gradient ends
      endPosition: '100%', // Shadow gradient end position
      
      // Backface shadow animation during page flip
      animation: {
        // WORKING ✓ - Used in render.js:684 to enable/disable shadow animation
        // Whether shadow opacity changes during page flip
        enabled: true, // Enable shadow opacity animation during flip

        // WORKING ✓ - Used in render.js:699 for shadow opacity calculation
        // Shadow opacity when page starts flipping
        startOpacity: 0.75, // opacity when page starts flipping (0°)

        // WORKING ✓ - Used in render.js:704,709 for shadow opacity calculation
        // Shadow opacity when page finishes flipping
        endOpacity: 0.25, // opacity when page finishes flipping (180°)

        // WORKING ✓ - Used in render.js:697 to determine when fade starts
        // Rotation angle when shadow fade animation begins
        fadeStartAngle: 90, // degrees - when shadow fade animation starts

        // WORKING ✓ - Used in render.js:697,700 to determine when fade ends
        // Rotation angle when shadow fade animation completes
        fadeEndAngle: 120, // degrees - when shadow fade animation ends

        // WORKING ✓ - Used for CSS will-change property on shadow elements
        // Enables GPU acceleration for smooth shadow animations
        hardwareAccelerated: true, // Enable GPU acceleration for shadow animations
      },
    },
  },

  // Application colors for pages and UI elements
  COLORS: {
    // WORKING ✓ - Used as fallback color for pages and BACKFACE.color
    // Default page background color when no specific color is set
    default: '#f5f5f5', // Default page background color (also used for backface.color)
    
    // WORKING ✓ - Used in portfolioLoader.js:360 for chapter cover colors
    // Pastel color palette for chapter covers and tabs
    // Colors are mapped to project.color values from portfolio.json
    palette: {
      coral: '#ffb3ba',      // Soft coral pink for chapter covers/tabs
      peach: '#ffdfba',      // Gentle peach for chapter covers/tabs
      lavender: '#bae1ff',   // Light lavender blue for chapter covers/tabs
      mint: '#baffc9',       // Soft mint green for chapter covers/tabs
      lemon: '#ffffba',      // Pale lemon yellow for chapter covers/tabs
      rose: '#ffb3e6',       // Light rose pink for chapter covers/tabs
      sky: '#c9e4ff',        // Soft sky blue for chapter covers/tabs
      sage: '#c9ffba',       // Sage green for chapter covers/tabs
      cream: '#fff2e6',      // Warm cream for chapter covers/tabs
      lilac: '#e6ccff'       // Soft lilac for chapter covers/tabs
    }
  },

  // WORKING ✓ - Used in render.js:36-37 for typewriter effect timing
  // Controls commentary text animation timing
  COMMENTARY: {
    // Delay before commentary typewriter effect starts
    // Used when pages change to create natural reading rhythm
    typewriterDelay: 400, // ms - delay before commentary text starts typing
  },

  // WORKING ✓ - Used in overlay.js:24,210,246 for hint overlay system
  // Controls the initial instruction overlay shown to users
  OVERLAY: {
    // Whether to show instruction overlay on page load
    enabled: true, // Show instruction overlay on page load

    // How long overlay stays visible before auto-hiding
    autoHideDelay: 3000, // ms - auto-hide overlay after 3 seconds

    // Duration of overlay fade-out animation
    fadeOutDuration: 300, // ms - overlay fade-out animation duration

    // Backdrop blur amount for overlay background
    backdropBlur: 10, // px - backdrop blur amount for overlay

    // Overlay background color with transparency
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // Semi-transparent overlay background

    // Z-index for overlay (below noise but above everything else)
    zIndex: 90000, // Z-index for overlay (below noise overlay at 99999)
  },

  // WORKING ✓ - Used in app.js:193 for head bobble animation system
  // Controls subtle head movement animation for realism
  HEAD_BOBBLE: {
    // Whether head bobble animation is enabled
    enabled: true, // Enable subtle head movement animation

    // Vertical movement amplitude in pixels
    amplitude: 2, // px - up/down movement amplitude (very subtle)

    // Forward/back rotation in degrees
    pitchDeg: 0.6, // degrees - forward/back rotation (minimal for subtlety)

    // Left/right tilt in degrees
    tiltDeg: 0, // degrees - left/right head tilt

    // Animation frequency in cycles per second
    frequency: 0.15, // cycles/second - very slow breathing-like movement (~9 breaths/min)

    // Target element for animation (null = auto-detect)
    target: null, // Target element (null = auto-detect .head-bobble-wrapper)
    
    // Organic movement settings for natural feel
    // Intensity of organic variations (0-2)
    organicIntensity: 1.2, // 0-2 - subtle organic movement variations

    // Natural breathing irregularity factor (0-1)
    breathingVariation: 0.7, // 0-1 - natural breathing rhythm irregularity

    // Enable micro-movements for enhanced realism
    microMovements: true, // Enable micro-movements for enhanced realism
  },

  // WORKING ✓ - Interactive Cookie Video System
  // Controls the interactive cookie video animation in the notebook background
  COOKIE_VIDEO: {
    // Video file path relative to src directory
    src: 'assets/videos/cookie-animation.webm',
    
    // Positioning relative to notebook background (to match static cookie image)
    position: {
      top: '43%',     // Distance from top of notebook background
      right: '12%',    // Distance from right edge of notebook background
      zIndex: 1000,      // Ensure cookie is on top of other elements
    },
    
    // Size relative to notebook background (square aspect ratio to match static cookie)
    size: {
      width: '12%',   // Width as percentage of notebook background (much larger)
      height: '12%',  // Height as percentage of notebook background (kept square)
    },
    
    // WORKING ✓ - Playhead positions in seconds for click progression
    // Timecodes represent the PAUSE points for the video.
    // 0:00:00:21 -> 0.7s
    // 0:00:01:14 -> 1.467s
    // 0:00:01:29 -> 1.967s
    // 0:00:03:02 -> 3.067s
    // 0:00:03:12 -> 3.4s
    // 0:00:04:01 -> 4.033s
    // 0:00:04:23 -> 4.767s
    playheadPositions: [0.7, 1.467, 1.967, 3.067, 3.4, 4.033, 4.767],
    
    // Interaction settings
    interaction: {
      // Whether cookie is clickable (disabled when reaching final position)
      enabled: true,
      
      // Visual feedback during interaction
      feedback: {
        // Show cursor pointer when hoverable
        cursor: 'pointer',
        
        // Remove cursor when video reaches end
        cursorDisabled: 'default',
      },
    },
    
    // Video playback settings
    playback: {
      // Auto-pause when reaching target position
      autopause: true,
      
      // Playback speed (1.0 = normal speed)
      speed: 1.0,
      
      // Whether to loop the video (false for one-time progression)
      loop: false,
      
      // Mute video by default
      muted: true,
    },
  },

  // --- Developer experience & debugging tools ---
  // Enables logging for key events and state changes, and activates debug panels.
  DEBUG: {
    panel: true, // debug panel enabled by default
    audio: false, // enable verbose audio logs
  },

  // --- Experimental feature flags ---
  // Use these to toggle new features during development without breaking main functionality.
  EXPERIMENTS: {
    // Enables the new direct force scroll model, bypassing momentum and easing.
    directForce: true,
    // When enabled, uses the PagePhysics module for settling animations.
    physicsEnabled: false,
  },
};

// Legacy compatibility - maps old PAGE_ANIMATION to new GLOBAL_CONFIG
// WORKING ✓ - Used throughout codebase for backward compatibility
// Provides access to config values through old property names
export const PAGE_ANIMATION = {
  stack: {
    // WORKING ✓ - Maps to PERFORMANCE.maxVisiblePages
    visibleDepth: GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages,
  },
  flip: {
    maxAngle: 180, // Fixed value for complete page flip
    speed: 400, // Legacy speed value
    easing: easeInOutExpo, // Legacy easing function
    // WORKING ✓ - Maps to SCENE transform origins
    rotationOriginX: GLOBAL_CONFIG.SCENE.transformOriginX,
    rotationOriginY: GLOBAL_CONFIG.SCENE.transformOriginY,
  },
  loop: {
    infinite: false, // Infinite loop disabled
    // WORKING ✓ - Maps to PERFORMANCE.maxVisiblePages
    buffer: GLOBAL_CONFIG.PERFORMANCE.maxVisiblePages,
  },
  misc: {
    // WORKING ✓ - Maps to ANIMATION.scrollSensitivity
    scrollSensitivity: GLOBAL_CONFIG.ANIMATION.scrollSensitivity,
  },
  snap: {
    delay: 0, // No snap delay
    // WORKING ✓ - Maps to ANIMATION snap settings
    threshold: GLOBAL_CONFIG.ANIMATION.snapThreshold,
    duration: GLOBAL_CONFIG.ANIMATION.snapDuration,
    easing: easeInOutCubic, // Legacy snap easing
  },
  jump: {
    duration: 500, // Legacy jump duration
    easing: easeInOutCubic, // Legacy jump easing
  },
  perspective: {
    // WORKING ✓ - Maps to SCENE perspective settings
    distance: GLOBAL_CONFIG.SCENE.perspective,
    originX: GLOBAL_CONFIG.SCENE.perspectiveOriginX,
    originY: GLOBAL_CONFIG.SCENE.perspectiveOriginY,
  },
};
