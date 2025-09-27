// Version: 2024-09-20 - Removed 3D rendering, simplified shadows
(() => {
  // Constants for magic numbers
  const CONSTANTS = {
    CANVAS_HEIGHT_VH: 1.5,        // 150vh canvas height
    OFFSCREEN_MOUSE: -1e9,        // Offscreen mouse position
    MIN_DISTANCE_EPSILON: 1e-6,   // Minimum distance for collision calculations
    MIN_REPEL_DISTANCE: 1e-4,     // Minimum repeller distance
    ACCUMULATOR_RESET_THRESHOLD: 3, // Reset accumulator if behind by this many frames
    INITIAL_SEED_BALLS: 200,      // Initial balls to seed
    BALL_SPAWN_OFFSET: 2,         // Offset for ball spawning
    BALL_CLUSTER_SPACING: 8,      // Spacing between clustered balls
    BALL_CLUSTER_Y_OFFSET: 12,    // Y offset for clustered balls
    MAX_PHYSICS_STEPS: 2,         // Maximum physics steps per frame
    FPS_UPDATE_INTERVAL: 1.0,     // FPS counter update interval in seconds
    // Spin & squash tuning
    SPIN_DAMP_PER_S: 2.0,         // angular damping per second
    SPIN_GAIN: 0.25,              // how strongly tangential slip converts to spin
    SPIN_GAIN_TANGENT: 0.18,      // ball–ball tangential slip to spin
    ROLL_FRICTION_PER_S: 1.5,     // rolling friction for horizontal speed per second when grounded
    SQUASH_MAX: 0.20,             // maximum squash amount (moderate, prevents elongated look)
    SQUASH_DECAY_PER_S: 18.0,     // faster relaxation for snappy feel
    WALL_REST_VEL_THRESHOLD: 70,  // below this, wall bounce becomes inelastic (settles)
    GROUND_COUPLING_PER_S: 8.0    // match roll (vx) to spin (omega) when grounded
  };

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d', { alpha: true });
  const panel = document.getElementById('controlPanel');
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  // Spawn area controls (viewport-relative)
  // Defaults: xCenter = 50vw, y = -50vh, width = 100vw, height = 50vh
  let SPAWN_X_CENTER_VW = 50;
  let SPAWN_Y_VH = -50;
  let SPAWN_W_VW = 100;
  let SPAWN_H_VH = 50;

  // Resize canvas to 150vh (with top 50vh hidden above viewport)
  function resize() {
    const simHeight = window.innerHeight * CONSTANTS.CANVAS_HEIGHT_VH;
    canvas.width  = Math.floor(window.innerWidth * DPR);
    canvas.height = Math.floor(simHeight * DPR);
  }
  const setCSSSize = () => {
    // CSS size is handled by CSS (150vh, bottom-aligned)
  };
  setCSSSize(); resize();
  window.addEventListener('resize', () => { setCSSSize(); resize(); updateEffectiveScaleAndBallSizes(); updateTextColliders(); updateRepelRadius(); });

  // Physics parameters (initial)
  const GE = 1960;        // Earth gravity in px/s^2 at our scale
  let gravityMultiplier = 1.10; // 1.1× Earth
  let G = GE * gravityMultiplier;
  let REST = 0.88;        // restitution (bounciness) - from screenshot
  let FRICTION = 0.0030;  // air drag per frame - from screenshot
  let EMIT_INTERVAL = 0.030; // seconds between drops - from screenshot
  let MAX_BALLS = 400;    // from screenshot
  const SOLVER_ITERS = 6;    // Optimized for realistic collisions without jitter
  const POS_CORRECT_PERCENT = 0.8; // Reduced for more stable contacts
  const POS_CORRECT_SLOP = 0.5 * DPR; // Slightly more tolerance to prevent jitter
  const REST_VEL_THRESHOLD = 30; // Lower threshold for more realistic settling

  // Base radius values
  const R_MIN_BASE = 6;
  const R_MAX_BASE = 24;
  let sizeScale = 2.0;     // from screenshot
  let sizeVariation = 0.1; // from screenshot
  // Responsive scale: reduce ball size by 60% on mobile breakpoints (≤768px)
  let responsiveScale = 1.0;
  let lastEffectiveScale = null; // tracks previous (sizeScale * responsiveScale)
  // Global mass model: all balls share the same mass in kg
  let ballMassKg = 19.80; // from screenshot
  const MASS_BASELINE_KG = 1.0; // reference mass for scaling drag/forces
  // Mass influence tuning
  const MASS_GRAVITY_EXP = 0.35; // how much mass influences gravity (perceptual)
  const MASS_REST_EXP = 0.15;    // how much mass influences bounce restitution
  let gravityScale = 1.0;        // computed from mass
  function recomputeMassDerivedScales() {
    gravityScale = Math.max(0.5, Math.min(3.0, Math.pow(ballMassKg / MASS_BASELINE_KG, MASS_GRAVITY_EXP)));
  }
  recomputeMassDerivedScales();
  let R_MIN = R_MIN_BASE * sizeScale;
  let R_MAX = R_MAX_BASE * sizeScale;

  function computeResponsiveScale() {
    // Use canvas container width for proper embed behavior
    const containerWidth = canvas.clientWidth || window.innerWidth;
    return (containerWidth <= 768) ? 0.4 : 1.0;
  }

  function updateEffectiveScaleAndBallSizes() {
    responsiveScale = computeResponsiveScale();
    const effectiveScale = sizeScale * responsiveScale;
    if (lastEffectiveScale === null) {
      lastEffectiveScale = effectiveScale;
      R_MIN = R_MIN_BASE * effectiveScale;
      R_MAX = R_MAX_BASE * effectiveScale;
      return;
    }
    const ratio = effectiveScale / lastEffectiveScale;
    if (ratio !== 1) {
      for (let i = 0; i < balls.length; i++) {
        balls[i].r *= ratio;
      }
      lastEffectiveScale = effectiveScale;
    }
    R_MIN = R_MIN_BASE * effectiveScale;
    R_MAX = R_MAX_BASE * effectiveScale;
  }

  // Update text collision rectangles by measuring DOM elements
  function updateTextColliders() {
    textColliders = []; // Clear existing colliders
    
    const textElement = document.querySelector(TEXT_SELECTOR);
    if (!textElement) return; // No text element found
    
    const textRect = textElement.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate cap height (height of capital letters only)
    const capHeight = calculateCapHeight(textElement);
    
    // Center the collision box vertically on the visual text
    const heightDifference = textRect.height - capHeight;
    const verticalOffset = heightDifference * 0.5; // Center the cap height within the full text height
    
    // Convert to canvas coordinates with device pixel ratio
    const collider = {
      x: (textRect.left - canvasRect.left) * DPR,
      y: (textRect.top - canvasRect.top + verticalOffset) * DPR,
      width: textRect.width * DPR,
      height: capHeight * DPR
    };
    
    // Only add collider if it's within canvas bounds and has valid dimensions
    if (collider.width > 0 && collider.height > 0 && 
        collider.x < canvas.width && collider.y < canvas.height &&
        collider.x + collider.width > 0 && collider.y + collider.height > 0) {
      textColliders.push(collider);
    }
  }
  
  // Calculate the cap height of text element (height of capital letters)
  function calculateCapHeight(element) {
    // Create a temporary element with just capital letters to measure cap height
    const tempElement = document.createElement('span');
    tempElement.style.cssText = window.getComputedStyle(element).cssText;
    tempElement.style.position = 'absolute';
    tempElement.style.visibility = 'hidden';
    tempElement.style.whiteSpace = 'nowrap';
    tempElement.textContent = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    document.body.appendChild(tempElement);
    const capHeight = tempElement.getBoundingClientRect().height;
    document.body.removeChild(tempElement);
    
    return capHeight;
  }

  // Emitter sweep (natural hand-like motion across the top band)
  let EMITTER_SWEEP_ENABLED = true;
  let emitterPhase = 0;                 // radians
  const EMITTER_SWEEP_HZ = 0.12;        // cycles per second
  const EMITTER_SWEEP_AMPL_VW = 20;     // sweep amplitude in vw
  let emitterSweepDir = 1;              // +1 sweeping right, -1 sweeping left (derived)

  // 8-Color system with weighted distribution (50%, 25%, 12%, 6%, 3%, 2%, 1%, 1%)
  // Color 1 (50%): Dominant/background color
  // Color 2 (25%): Secondary color  
  // Color 3 (15%): Tertiary color
  // Color 4 (7.5%): Accent color
  // Color 5 (2.5%): Rare/special color
  const COLOR_TEMPLATES = {
    industrialTeal: { label: 'Industrial Teal', colors: ['#b7bcb7', '#e4e9e4', '#ffffff', '#00695c', '#000000', '#ff4013', '#0d5cb6', '#ffa000'] },
    modern: { label: 'Modern European', colors: ['#9ca3af', '#d1d5db', '#ffffff', '#ff3b30', '#000000', '#00e5ff', '#1976d2', '#ffc107'] },
    corporate: { label: 'Corporate Modern', colors: ['#a0a8b1', '#d2d8de', '#ffffff', '#1a73e8', '#000000', '#ff5722', '#7b1fa2', '#ffa000'] },
    minimal: { label: 'Helvetica Minimal', colors: ['#bdbdbd', '#e0e0e0', '#ffffff', '#6b7280', '#000000', '#40e0d0', '#303f9f', '#ff9800'] },
    euroBlue: { label: 'European Blue', colors: ['#9aa6b2', '#d4dde5', '#ffffff', '#0a66c2', '#000000', '#ff4081', '#388e3c', '#ffb300'] },
    scandi: { label: 'Scandinavian Bright', colors: ['#aab2b7', '#e6eaee', '#ffffff', '#74b9ff', '#000000', '#e91e63', '#1976d2', '#4caf50'] },
    neonCyan: { label: 'Graphite Neon Cyan', colors: ['#9aa0a6', '#d5d9dd', '#ffffff', '#00e5ff', '#000000', '#ff9800', '#9c27b0', '#4caf50'] },
    coralTech: { label: 'Coral Tech', colors: ['#9da3a9', '#d8dde2', '#ffffff', '#ff6b6b', '#000000', '#00e676', '#3f51b5', '#ff5722'] },
    violetMidnight: { label: 'Violet Midnight', colors: ['#9fa3b1', '#d9dce3', '#ffffff', '#7c3aed', '#000000', '#e91e63', '#388e3c', '#ffb300'] },
    mintSage: { label: 'Mint Sage', colors: ['#a0a7a2', '#dbe0dd', '#ffffff', '#00c896', '#000000', '#ff1744', '#3f51b5', '#ff9800'] },
    slateAzure: { label: 'Slate Azure', colors: ['#9aa3ad', '#d8dee6', '#ffffff', '#3b82f6', '#000000', '#ff4081', '#388e3c', '#ffc107'] },
    vaporPop: { label: 'Vapor Pop', colors: ['#9ea0a8', '#d6d7dc', '#ffffff', '#ff00e5', '#000000', '#00bcd4', '#673ab7', '#ff5722'] },
    cyberMagenta: { label: 'Cyber Magenta', colors: ['#9c9fad', '#d6d9e3', '#ffffff', '#ff007a', '#000000', '#40e0d0', '#1976d2', '#ff9800'] },
    streetLime: { label: 'Street Lime', colors: ['#9aa19a', '#d6dbd6', '#ffffff', '#baff00', '#000000', '#e91e63', '#3f51b5', '#ff6f00'] },
    cmykPop: { label: 'CMYK Pop', colors: ['#9f9f9f', '#d9d9d9', '#ffffff', '#ffd400', '#000000', '#ff1744', '#7b1fa2', '#4caf50'] }
  };

  let currentTemplate = 'industrialTeal';
  let currentColors = COLOR_TEMPLATES.industrialTeal.colors.slice(); // 8 colors
  // Cursor color: default to Color 6 (highlight)
  let cursorBallIndex = 5;
  let cursorBallColor = currentColors[cursorBallIndex] || '#ff4013';

  // Expose palette as CSS variables for use by page elements
  function syncPaletteVars(colors = currentColors) {
    try {
      const root = document.documentElement;
      const list = (colors && colors.length ? colors : currentColors).slice(0, 8);
      for (let i = 0; i < 8; i++) {
        const hex = list[i] || '#ffffff';
        root.style.setProperty(`--ball-${i+1}`, hex);
      }
    } catch (_) { /* no-op */ }
  }

  // Color weights: Color 1: 50%, Color 2: 25%, Color 3: 15%, Color 4: 7.5%, Color 5: 2.5%
  const COLOR_WEIGHTS = [0.50, 0.25, 0.12, 0.06, 0.03, 0.02, 0.01, 0.01];
  
  function pickRandomColor() {
    try {
      if (!currentColors || currentColors.length === 0) {
        console.warn('No colors available, using fallback');
        return '#ffffff'; // Fallback color
      }
      
      // Use weighted random selection
      const random = Math.random();
      let cumulativeWeight = 0;
      
      for (let i = 0; i < Math.min(currentColors.length, COLOR_WEIGHTS.length); i++) {
        cumulativeWeight += COLOR_WEIGHTS[i];
        if (random <= cumulativeWeight) {
          return currentColors[i];
        }
      }
      
      // Fallback to last color if something goes wrong
      return currentColors[Math.min(currentColors.length - 1, 7)];
    } catch (error) {
      console.error('Error picking random color:', error);
      return '#ffffff'; // Fallback color
    }
  }

  // Repeller controls
  let repelRadius = 135;   // px (CSS px) - from screenshot
  let repelPower = 1536000;  // from screenshot (mapped display value)
  let repelSoft = 3.4;     // exponent falloff - from screenshot
  let mouseX = CONSTANTS.OFFSCREEN_MOUSE, mouseY = CONSTANTS.OFFSCREEN_MOUSE; // offscreen until moved
  let repellerEnabled = false; // disabled by default; enabled by preset or sliders
  const REPELLER_GLOBAL_MULTIPLIER = 20.0; // doubled overall repeller strength
  // Responsive repeller sizing
  let repelResponsive = true;
  let repelMinSize = 60;   // CSS px at 375px viewport
  let repelMaxSize = 200;  // CSS px at 1128px+ viewport
  // Unified input handling state (pointer vs mouse)
  const HAS_POINTER_EVENTS = 'PointerEvent' in window;
  let isTouchActive = false;
  let activePointerId = null;
  let lastPointerType = 'mouse';
  // Hide visual cursor ball on mobile-like inputs
  let hideCursorOnMobile = true;
  function isMobileLikeInput() {
    try {
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const noHover = window.matchMedia && window.matchMedia('(hover: none)').matches;
      return coarse || noHover || (responsiveScale < 1.0);
    } catch (_) {
      return (responsiveScale < 1.0);
    }
  }
  function updateRepellerFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (clientX - rect.left) * DPR;
    mouseY = (clientY - rect.top) * DPR;
  }

  // Repeller slider mapping (wide dynamic range; midpoint equals 2× previous default)
  const REPEL_BASE_POWER = 12000; // previous default baseline
  const REPEL_SLIDER_MAX = 1000;  // slider range [0..1000]
  const REPEL_CENTER_MULTIPLIER = 2.0; // midpoint = 2× base
  const REPEL_N_OCTAVES = 12; // wide range (~1/32x .. 128x around center)
  function repelSliderToPower(sliderValue) {
    const s = Math.max(0, Math.min(REPEL_SLIDER_MAX, Number(sliderValue))) / REPEL_SLIDER_MAX;
    const mult = REPEL_CENTER_MULTIPLIER * Math.pow(2, (s - 0.5) * REPEL_N_OCTAVES);
    return REPEL_BASE_POWER * mult;
  }

  // Compute responsive repel radius based on viewport width, clamped between min/max
  function computeResponsiveRepelRadius() {
    const minW = 375;
    const maxW = 1128;
    const w = canvas.clientWidth || window.innerWidth;
    const t = clamp((w - minW) / (maxW - minW), 0, 1);
    const minR = Math.min(repelMinSize, repelMaxSize);
    const maxR = Math.max(repelMinSize, repelMaxSize);
    return minR + (maxR - minR) * t;
  }
  function updateRepelRadius() {
    if (repelResponsive) {
      repelRadius = computeResponsiveRepelRadius();
    }
    // sync UI label if present
    const lbl = document.getElementById('repelSizeVal');
    if (lbl) lbl.textContent = Math.round(repelRadius).toString();
  }
  function powerToRepelSlider(power) {
    const safe = Math.max(1, Number(power));
    const x = safe / (REPEL_BASE_POWER * REPEL_CENTER_MULTIPLIER);
    const s = 0.5 + (Math.log2(x) / REPEL_N_OCTAVES);
    return Math.round(Math.max(0, Math.min(1, s)) * REPEL_SLIDER_MAX);
  }

  // Shadows removed for better performance and realism
  
  // High refresh mode is now default
  let highRefreshMode = true; // Always enabled for best performance
  
  // Rounded corners for simulation area
  let cornerRadius = 0; // Corner radius in pixels (0 = square corners)
  
  // Text collision system
  const TEXT_SELECTOR = '#hero-text'; // ID selector for the main text element
  let textColliders = []; // Array of text collision rectangles
  
  // Behavior modes
  const BEHAVIOR_MODES = { pit: 'pit', flies: 'flies', print: 'print' };
  let behaviorMode = BEHAVIOR_MODES.pit;
  // Flies tuning
  let fliesSpeedMul = 3.4;       // percentage 0.25..4.0
  let fliesMaxSpeed = 1910;      // px/s cap (base)
  let fliesSeekGain = 360;       // acceleration towards light (base)
  let fliesWanderStrength = 120; // idle wander force (base)
  let fliesJitter = 3.0;         // randomness around light target
  let fliesScatterRadius = 490;  // desired orbit radius around light
  let fliesScatterVarPct = 1.00; // 0..1 radius variance per fly
  let lightActive = false;       // whether the light (pointer/touch) is present
  // Trail tuning (formerly print)
  let trailSmoothing = 0;        // -500% to 400% trail smoothing
  let generalSmoothing = 0;      // -500% to 400% general smoothing
  let trailLength = 75;          // maximum trail particles (3x longer)
  let trailSpawnRate = 50;       // ms between trail particles
  let trailLastTime = 0;         // timestamp of last trail particle
  let trailColorIndex = 0;       // current color index for alternation
  let trailPositions = [];       // array of smoothed trail positions
  let targetMouseX = 0;          // smoothed mouse X position
  let targetMouseY = 0;          // smoothed mouse Y position
  // Temporal trail for simple motion blur (0 = off, up to ~0.25)
  let trailFade = 0.025; // from screenshot
  let trailSubtlety = 1.80; // from screenshot
  
  // Performance optimizations and FPS tracking
  let renderFrameCount = 0;
  let physicsStepCount = 0;
  let lastFPSTime = 0;
  let currentRenderFPS = 0;
  let currentPhysicsFPS = 0;
  const renderFpsElement = document.getElementById('render-fps');
  const physicsFpsElement = document.getElementById('physics-fps');
  // Removed performance mode indicators
  
  // Shadow system removed for better performance

  // Ball model - updated to remove 3D rendering
  class Ball {
    constructor(x, y, r, color) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random()*2 - 1) * 200; // random lateral kick
      this.vy = -Math.random()*200;          // slight upward variation
      this.r = r;
      this.m = ballMassKg;                    // all balls share the same mass
      this.color = color;
      this.t = 0;
      // Entry drift state for natural side-throw effect
      this.age = 0;           // seconds since spawn
      this.driftAx = 0;       // lateral acceleration during entry (px/s^2)
      this.driftTime = 0;     // duration of entry drift (s)
      // Spin & squash state
      this.omega = 0;         // angular velocity (rad/s)
      this.squash = 1.0;      // visual squash factor (1 = round)
      this.squashDirX = 1;    // squash direction components (unit vector)
      this.squashDirY = 0;
      // Improved rotation & world-aligned squash
      this.theta = 0;               // integrated angular position (rad)
      this.squashAmount = 0.0;      // 0 = no squash, up to SQUASH_MAX
      this.squashNormalAngle = 0.0; // world-space normal direction for squash
      // Flies/wander state
      this.wanderAngle = Math.random() * Math.PI * 2;
      this.wanderTimer = 0;
      // Snake chain helpers
      this.prevX = x; this.prevY = y;
    }
    // Integrate motion with simple Euler step
    step(dt) {
      // Advance timers
        this.t += dt;
      this.age += dt;

      // Flies mode uses custom integrator (no gravity/standard drag). Early return.
      if (behaviorMode === BEHAVIOR_MODES.flies) {
        stepFlies(this, dt);
        return;
      }
      

      // Gravity scaled by mass to make weight perceptible without changing G globally
      this.vy += (G * gravityScale) * dt;
      // Mass-aware drag (heavier balls lose proportionally less velocity)
      const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
      const drag = Math.max(0, 1 - (FRICTION / massScale));
      this.vx *= drag;
      this.vy *= drag;
      // Apply short-lived lateral drift to simulate being thrown from the side above
      if (this.driftAx !== 0 && this.age < this.driftTime) {
        this.vx += (this.driftAx * dt) / massScale;
      } else if (this.driftAx !== 0) {
        this.driftAx = 0; // Clear drift when expired to skip future checks
      }
      if (behaviorMode === BEHAVIOR_MODES.pit) {
        applyRepeller(this, dt);
      } else if (behaviorMode === BEHAVIOR_MODES.print) {
        // Print mode uses normal physics with gravity
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      // Angular damping
      const spinDamp = Math.max(0, 1 - CONSTANTS.SPIN_DAMP_PER_S * dt);
      this.omega *= spinDamp;
      // Integrate angular position for visible rotation
      this.theta += this.omega * dt;
      if (this.theta > Math.PI) this.theta -= Math.PI * 2; else if (this.theta < -Math.PI) this.theta += Math.PI * 2;
      // Relax squash amount back to 0 (area-preserving)
      const decay = Math.min(1, CONSTANTS.SQUASH_DECAY_PER_S * dt);
      this.squashAmount += (0 - this.squashAmount) * decay;
      this.squash = 1 - this.squashAmount;
    }
    // Resolve collision with walls (with rounded corners)
    // Skip wall collisions for flies behavior
    walls(w, h, dt) {
      if (behaviorMode === BEHAVIOR_MODES.flies) {
        return; // Flies can move beyond boundaries
      }
      if (cornerRadius === 0) {
        // Standard rectangular collision
      if (this.y + this.r > h) { 
        this.y = h - this.r; 
        // Pre-impact speed for squash amplitude
        const preVy = this.vy;
        // Rolling friction & spin from tangential slip
        const slip = this.vx - this.omega * this.r; // world x is tangential at bottom contact
        const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
        // convert part of slip to spin, reduce horizontal speed (rolling tendency)
        this.omega += (slip / this.r) * CONSTANTS.SPIN_GAIN / massScale;
        const rollDamp = Math.max(0, 1 - CONSTANTS.ROLL_FRICTION_PER_S * dt / massScale);
        this.vx *= rollDamp;
        // Bounce with mass-aware restitution
        const wallRest = Math.abs(preVy) < CONSTANTS.WALL_REST_VEL_THRESHOLD ? 0 : REST;
        this.vy = -this.vy * (wallRest * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
        // Squash on impact using pre-impact speed
        const impact = Math.min(1, Math.abs(preVy) / (this.r * 90));
        this.squashAmount = Math.min(CONSTANTS.SQUASH_MAX, impact * 0.8);
        this.squash = 1 - this.squashAmount;
        this.squashNormalAngle = -Math.PI / 2; // ground normal upwards
        // Ground coupling: tend towards pure rolling without slipping
        const rollTarget = this.vx / this.r;
        this.omega += (rollTarget - this.omega) * Math.min(1, CONSTANTS.GROUND_COUPLING_PER_S * dt);
      }
      if (this.vy > 0 && this.y - this.r < 0) { 
        this.y = this.r; 
        const preVy = this.vy;
        this.vy = -this.vy * REST; 
        const impact = Math.min(1, Math.abs(preVy) / (this.r * 90));
        this.squashAmount = Math.min(CONSTANTS.SQUASH_MAX, impact * 0.8);
        this.squash = 1 - this.squashAmount;
        this.squashNormalAngle = Math.PI / 2; // ceiling normal downwards
      }
      if (this.x + this.r > w) { 
        this.x = w - this.r; 
        {
          const slip = this.vy - this.omega * this.r; // approximate tangential along y
          const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
          this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
        }
        this.vx = -this.vx * REST; 
        const impact = Math.min(1, Math.abs(this.vx) / (this.r * 90));
        this.squashAmount = Math.min(CONSTANTS.SQUASH_MAX, impact * 0.8);
        this.squash = 1 - this.squashAmount;
        this.squashNormalAngle = Math.PI; // right wall normal leftwards
      }
        if (this.x - this.r < 0) { 
          this.x = this.r; 
          {
            const slip = this.vy - this.omega * this.r;
            const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
            this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
          }
          this.vx = -this.vx * REST; 
          const impact = Math.min(1, Math.abs(this.vx) / (this.r * 90));
          this.squashAmount = Math.min(CONSTANTS.SQUASH_MAX, impact * 0.8);
          this.squash = 1 - this.squashAmount;
          this.squashNormalAngle = 0; // left wall normal rightwards
        }
      } else {
        // Rounded corner collision detection
        this.handleRoundedWallCollision(w, h);
      }
      
      // Text collision detection
      this.checkTextCollisions(dt);
    }
    
    // Check collision with text elements
    checkTextCollisions(dt) {
      for (let i = 0; i < textColliders.length; i++) {
        const rect = textColliders[i];
        
        // Check if ball overlaps with text rectangle
        const closestX = Math.max(rect.x, Math.min(this.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(this.y, rect.y + rect.height));
        
        const dx = this.x - closestX;
        const dy = this.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.r) {
          // Collision detected - resolve it
          if (distance === 0) {
            // Ball center is inside rectangle - push out in shortest direction
            const distToLeft = this.x - rect.x;
            const distToRight = (rect.x + rect.width) - this.x;
            const distToTop = this.y - rect.y;
            const distToBottom = (rect.y + rect.height) - this.y;
            
            const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
            
            if (minDist === distToLeft) {
              this.x = rect.x - this.r;
              this.vx = -Math.abs(this.vx) * REST;
            } else if (minDist === distToRight) {
              this.x = rect.x + rect.width + this.r;
              this.vx = Math.abs(this.vx) * REST;
            } else if (minDist === distToTop) {
              this.y = rect.y - this.r;
              this.vy = -Math.abs(this.vy) * REST;
            } else {
              this.y = rect.y + rect.height + this.r;
              this.vy = Math.abs(this.vy) * REST;
            }
          } else {
            // Normal collision resolution
            const overlap = this.r - distance;
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Move ball out of collision
            this.x += nx * overlap;
            this.y += ny * overlap;
            
            // Reflect velocity with restitution
            const dotProduct = this.vx * nx + this.vy * ny;
            if (dotProduct < 0) {
              this.vx -= 2 * dotProduct * nx * REST;
              this.vy -= 2 * dotProduct * ny * REST;
              
              // Add squash effect for visual impact
              const impact = Math.min(1, Math.abs(dotProduct) / (this.r * 70));
              this.squash = 1 - CONSTANTS.SQUASH_MAX * impact;
              this.squashDirX = Math.abs(nx) > Math.abs(ny) ? 1 : 0;
              this.squashDirY = Math.abs(ny) > Math.abs(nx) ? 1 : 0;
            }
          }
        }
      }
    }
    
    // Handle collision with rounded corner boundaries
    handleRoundedWallCollision(w, h) {
      const r = cornerRadius;
      
      // Check collision with each corner circle
      const corners = [
        { x: r, y: r },           // Top-left
        { x: w - r, y: r },       // Top-right
        { x: w - r, y: h - r },   // Bottom-right
        { x: r, y: h - r }        // Bottom-left
      ];
      
      for (let i = 0; i < corners.length; i++) {
        const corner = corners[i];
        const dx = this.x - corner.x;
        const dy = this.y - corner.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Check if ball is in corner region and colliding with corner circle
        const inCornerRegion = this.isInCornerRegion(corner, w, h, r);
        if (inCornerRegion && dist + this.r > r) {
          // Collision with corner circle
          const overlap = r - (dist - this.r);
          if (overlap > 0 && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Move ball out of collision
            this.x += nx * overlap;
            this.y += ny * overlap;
            
            // Reflect velocity
            const dot = this.vx * nx + this.vy * ny;
            this.vx -= 2 * dot * nx * REST;
            this.vy -= 2 * dot * ny * REST;
            // Squash aligned to corner normal, proportional to impact
            const impact = Math.min(1, Math.abs(dot) / (this.r * 90));
            this.squashAmount = Math.min(CONSTANTS.SQUASH_MAX, impact * 0.8);
            this.squash = 1 - this.squashAmount;
            this.squashNormalAngle = Math.atan2(ny, nx);
          }
        }
      }
      
      // Handle straight wall collisions (outside corner regions)
      // Bottom wall
      if (this.y + this.r > h && (this.x < r || this.x > w - r)) {
        this.y = h - this.r;
        this.vy = -this.vy * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      }
      
      // Top wall
      if (this.y - this.r < 0 && (this.x < r || this.x > w - r)) {
        this.y = this.r;
        this.vy = -this.vy * REST;
      }
      
      // Right wall
      if (this.x + this.r > w && (this.y < r || this.y > h - r)) {
        this.x = w - this.r;
        // Wall contact: add spin from tangential slip (vertical normal)
        {
          const slip = this.vy - this.omega * this.r; // approximate tangential along y
          const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
          this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
        }
        this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
        // Squash aligned to wall normal
        const impact = Math.min(1, Math.abs(this.vx)/(this.r*70));
        this.squashAmount = Math.min(CONSTANTS.SQUASH_MAX, impact);
        this.squash = 1 - this.squashAmount;
        this.squashNormalAngle = Math.PI; // normal leftwards
      }
      
      // Left wall
      if (this.x - this.r < 0 && (this.y < r || this.y > h - r)) {
        this.x = this.r;
        {
          const slip = this.vy - this.omega * this.r;
          const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
          this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
        }
        this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
        const impact = Math.min(1, Math.abs(this.vx)/(this.r*70));
        this.squashAmount = Math.min(CONSTANTS.SQUASH_MAX, impact);
        this.squash = 1 - this.squashAmount;
        this.squashNormalAngle = 0; // normal rightwards
      }
      
      // Handle straight sections of walls
      if (this.y + this.r > h && this.x >= r && this.x <= w - r) {
        this.y = h - this.r;
        this.vy = -this.vy * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      }
      if (this.y - this.r < 0 && this.x >= r && this.x <= w - r) {
        this.y = this.r;
        this.vy = -this.vy * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      }
      if (this.x + this.r > w && this.y >= r && this.y <= h - r) {
        this.x = w - this.r;
        this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      }
      if (this.x - this.r < 0 && this.y >= r && this.y <= h - r) {
        this.x = this.r;
        this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      }
    }
    
    // Check if ball is in a corner region
    isInCornerRegion(corner, w, h, r) {
      // Top-left corner
      if (corner.x === r && corner.y === r) {
        return this.x <= r && this.y <= r;
      }
      // Top-right corner
      if (corner.x === w - r && corner.y === r) {
        return this.x >= w - r && this.y <= r;
      }
      // Bottom-right corner
      if (corner.x === w - r && corner.y === h - r) {
        return this.x >= w - r && this.y >= h - r;
      }
      // Bottom-left corner
      if (corner.x === r && corner.y === h - r) {
        return this.x <= r && this.y >= h - r;
      }
      return false;
    }
    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      // World-aligned squash/stretch only if significant
      const amt = Math.min(CONSTANTS.SQUASH_MAX, Math.max(0, this.squashAmount));
      if (amt > 0.001) {
        // Area-preserving squash: s * (1/s) maintains roundness perception
        const s = 1 + amt;
        const inv = 1 / s;
        ctx.rotate(this.squashNormalAngle);
        ctx.scale(s, inv);
        ctx.rotate(-this.squashNormalAngle);
      }
      // Body
      ctx.beginPath();
      ctx.arc(0, 0, this.r, 0, Math.PI*2);
      ctx.fillStyle = this.color;
      ctx.fill();
      // Spin indicator removed for cleaner visuals and performance
      ctx.restore();
    }
  }

  const balls = [];
  // For snake mode, we treat the balls array as an ordered chain
  function initTrail() {
    balls.length = 0; // Clear existing balls
    trailColorIndex = 0; // Reset color alternation
    trailLastTime = 0; // Reset timer
    trailPositions = []; // Clear trail positions
    targetMouseX = mouseX !== CONSTANTS.OFFSCREEN_MOUSE ? mouseX : canvas.width / 2;
    targetMouseY = mouseY !== CONSTANTS.OFFSCREEN_MOUSE ? mouseY : canvas.height / 2;
  }

  function updateTrail(dt, currentTime) {
    // Update smoothed mouse position with general smoothing
    if (mouseX !== CONSTANTS.OFFSCREEN_MOUSE && mouseY !== CONSTANTS.OFFSCREEN_MOUSE) {
      const generalSmoothFactor = getSmoothingFactor(generalSmoothing);
      const smoothRate = generalSmoothFactor * dt * 60; // 60fps normalized
      targetMouseX += (mouseX - targetMouseX) * smoothRate;
      targetMouseY += (mouseY - targetMouseY) * smoothRate;
    }
    
    // Check if it's time to spawn a new trail particle
    if (currentTime - trailLastTime >= trailSpawnRate) {
      if (mouseX !== CONSTANTS.OFFSCREEN_MOUSE && mouseY !== CONSTANTS.OFFSCREEN_MOUSE) {
        // Remove oldest ball if we've reached the trail length limit
        if (balls.length >= trailLength) {
          balls.shift(); // Remove first (oldest) ball
        }
        
        // Create new ball with alternating color
        const r = (R_MIN + R_MAX) / 2; // consistent size
        const color = currentColors[trailColorIndex % currentColors.length];
        trailColorIndex = (trailColorIndex + 1) % currentColors.length;
        
        const ball = new Ball(targetMouseX, targetMouseY, r, color);
        ball.vx = 0; // No initial velocity for trail mode
        ball.vy = 0;
        balls.push(ball);
        
        trailLastTime = currentTime;
      }
    }
    
    // Update existing trail particles to follow with degrading smoothing
    const trailSmoothFactor = getSmoothingFactor(trailSmoothing);
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      const distanceFromHead = balls.length - 1 - i; // 0 for newest, higher for older
      const smoothingDegradation = Math.pow(0.85, distanceFromHead); // Each segment is 15% less smooth
      const followFactor = trailSmoothFactor * smoothingDegradation * dt * 60;
      
      if (i === balls.length - 1) {
        // Newest ball follows the smoothed mouse position
        ball.x += (targetMouseX - ball.x) * followFactor;
        ball.y += (targetMouseY - ball.y) * followFactor;
      } else {
        // Older balls follow the ball ahead of them in the chain
        const nextBall = balls[i + 1];
        ball.x += (nextBall.x - ball.x) * followFactor;
        ball.y += (nextBall.y - ball.y) * followFactor;
      }
    }
  }

  // Convert smoothing percentage (-500% to 400%) to usable factor
  function getSmoothingFactor(smoothingPercent) {
    if (smoothingPercent === 0) return 1.0; // Default: immediate response
    if (smoothingPercent > 0) {
      // Positive values: slower response (more smoothing)
      return 1.0 / (1.0 + smoothingPercent / 100.0);
    } else {
      // Negative values: faster response (less smoothing, more jittery)
      return Math.min(10.0, 1.0 + Math.abs(smoothingPercent) / 100.0);
    }
  }

  // Helpers
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function randBetween(a, b) { return a + Math.random() * (b - a); }
  // Compute mass from radius using current weight slider as density baseline
  // Removed radius-based mass; shared mass is used instead
  
  // Draw rounded boundary visualization
  function drawRoundedBoundary(ctx, w, h) {
    const r = cornerRadius;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Start from top-left corner (after the curve)
    ctx.moveTo(r, 0);
    
    // Top edge
    ctx.lineTo(w - r, 0);
    
    // Top-right corner
    ctx.arcTo(w, 0, w, r, r);
    
    // Right edge
    ctx.lineTo(w, h - r);
    
    // Bottom-right corner
    ctx.arcTo(w, h, w - r, h, r);
    
    // Bottom edge
    ctx.lineTo(r, h);
    
    // Bottom-left corner
    ctx.arcTo(0, h, 0, h - r, r);
    
    // Left edge
    ctx.lineTo(0, r);
    
    // Top-left corner
    ctx.arcTo(0, 0, r, 0, r);
    
    ctx.closePath();
    ctx.stroke();
  }
  
  function spawnBall(x, y, color = pickRandomColor()) {
    // Calculate size range with variation (ensure positive values)
    const baseSize = (R_MIN + R_MAX) / 2;
    
    let r;
    if (sizeVariation === 0) {
      // No variation: all balls exactly the same size
      r = baseSize;
    } else {
      // Apply variation
      const range = (R_MAX - R_MIN) / 2;
      const variedRange = range * sizeVariation;
      const minR = Math.max(1, baseSize - variedRange);
      const maxR = baseSize + variedRange;
      r = randBetween(minR, maxR);
    }
    
    const ball = new Ball(x, y, r, color);

    // Natural entry throw with size-aware impulse and sweep-aware direction
    const centerX = canvas.width * 0.5;
    // Prefer current sweep direction if enabled; otherwise side-based
    const dir = EMITTER_SWEEP_ENABLED ? (emitterSweepDir >= 0 ? 1 : -1) : ((x < centerX) ? 1 : -1);
    const sizeInfluence = clamp((r / ((R_MIN + R_MAX) * 0.5)), 0.6, 1.4);
    const baseKick = 140 * sizeInfluence;  // scale with size
    const randKick = 180 * sizeInfluence;  // scale with size
    const upwardKick = 120;                // small upward speed to soften entry
    ball.vx = dir * (baseKick + Math.random() * randKick);
    ball.vy = -Math.random() * upwardKick;

    // Short lived lateral acceleration to feel like being pushed from the side (size-aware)
    ball.driftAx = dir * (360 + Math.random() * 420) * sizeInfluence; // px/s^2
    ball.driftTime = 0.22 + Math.random() * 0.28;                    // 0.22–0.5s of drift

    balls.push(ball);
    return ball;
  }

  // Continuous emitter within a vw/vh-defined rectangle
  let emitterTimer = 0;
  function pickSpawnPoint() {
    const wCss = canvas.clientWidth;
    const hCss = canvas.clientHeight;
    const widthCss = clamp((SPAWN_W_VW / 100) * wCss, 0, wCss);
    let xCenterCss = clamp((SPAWN_X_CENTER_VW / 100) * wCss, 0, wCss);
    // Apply sweeping emitter motion across the band for natural hand-like movement
    if (EMITTER_SWEEP_ENABLED) {
      const amplPx = (EMITTER_SWEEP_AMPL_VW / 100) * wCss;
      const sweepOffset = Math.sin(emitterPhase) * amplPx;
      const prevX = xCenterCss;
      xCenterCss = clamp(xCenterCss + sweepOffset, 0, wCss);
      emitterSweepDir = (xCenterCss >= prevX) ? 1 : -1;
    }
    // Allow slight offscreen horizontal spawn for natural side entry feel
    const offX = Math.min(40, widthCss * 0.1); // up to 40px or 10% width
    const xLeftCss = clamp(xCenterCss - widthCss / 2 - offX, -offX, wCss);
    const xRightCss = clamp(xCenterCss + widthCss / 2 + offX, -offX, wCss);
    const yTopCss = (SPAWN_Y_VH / 100) * hCss;
    const yBotCss = yTopCss + (SPAWN_H_VH / 100) * hCss;
    // Slight bias along sweep direction to emit closer to the leading edge
    const bias = 0.3; // 0 = uniform, 1 = fully biased to leading edge
    const u = Math.random();
    const biased = bias > 0 ? (emitterSweepDir > 0 ? Math.pow(u, 1 - bias) : 1 - Math.pow(1 - u, 1 - bias)) : u;
    const x = (xLeftCss + (xRightCss - xLeftCss) * biased) * DPR;
    // Add slight upward randomness to spawn height for organic feel
    const y = randBetween(yTopCss * DPR, yBotCss * DPR) - (R_MAX + CONSTANTS.BALL_SPAWN_OFFSET + randBetween(0, 10 * DPR));
    return { x, y };
  }
  function emit(dt) {
    emitterTimer += dt;
    while (emitterTimer >= EMIT_INTERVAL) {
      // Jitter emissions slightly for organic timing
      const jitter = (Math.random() - 0.5) * EMIT_INTERVAL * 0.5; // ±25%
      emitterTimer -= (EMIT_INTERVAL + jitter);
      // Advance sweep phase based on elapsed time segment (approx)
      emitterPhase += (2 * Math.PI) * EMITTER_SWEEP_HZ * (EMIT_INTERVAL + jitter);
      const p = pickSpawnPoint();
      // Occasionally emit small clusters to mimic handful tosses
      const drops = (Math.random() < 0.35 ? 3 : 1);
      for (let i=0; i<drops; i++) {
        if (balls.length < MAX_BALLS) {
          // Slight horizontal staggering to suggest sideways motion
          const xOffset = i * CONSTANTS.BALL_CLUSTER_SPACING * (Math.random() < 0.5 ? 1 : -1);
          spawnBall(p.x + xOffset, p.y - i * CONSTANTS.BALL_CLUSTER_Y_OFFSET);
        }
      }
    }
  }

  // Spatial hash grid to accelerate broad-phase (optimized)
  const spatialGrid = new Map();
  
  function collectPairsSorted() {
    const n = balls.length;
    if (n < 2) return []; // Early exit for trivial cases
    const cellSize = Math.max(1, R_MAX * 2); // Optimized cell size
    const gridWidth = Math.ceil(canvas.width / cellSize) + 1; // Dynamic grid width
    spatialGrid.clear(); // Reuse map
    
    // Build grid with numeric keys (faster than string concatenation)
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      const cx = (b.x / cellSize) | 0;
      const cy = (b.y / cellSize) | 0;
      const key = cy * gridWidth + cx; // Numeric key
      let arr = spatialGrid.get(key);
      if (!arr) { arr = []; spatialGrid.set(key, arr); }
      arr.push(i);
    }
    
    const pairs = [];
    for (const [key, arr] of spatialGrid) {
      const cy = (key / gridWidth) | 0;
      const cx = key % gridWidth;
      
      // Check 9 neighboring cells (including self)
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const neighborKey = (cy + oy) * gridWidth + (cx + ox);
          const nb = spatialGrid.get(neighborKey);
          if (!nb) continue;
          
          for (let ii = 0; ii < arr.length; ii++) {
            const i = arr[ii];
            for (let jj = 0; jj < nb.length; jj++) {
              const j = nb[jj];
              if (j <= i) continue;
              
              const A = balls[i], B = balls[j];
              const dx = B.x - A.x, dy = B.y - A.y;
              const rSum = A.r + B.r;
              const dist2 = dx*dx + dy*dy;
              
              if (dist2 < rSum*rSum) {
                const dist = Math.sqrt(Math.max(dist2, CONSTANTS.MIN_DISTANCE_EPSILON));
                const overlap = rSum - dist;
                pairs.push({ i, j, overlap });
              }
            }
          }
        }
      }
    }
    
    // Sort by overlap (most overlapping first for stability)
    pairs.sort((a, b) => b.overlap - a.overlap);
    return pairs;
  }

  // Circle–circle collisions: sequential impulses + Baumgarte positional correction
  function resolveCollisions(iterations = SOLVER_ITERS) {
    const pairs = collectPairsSorted();
    for (let iter = 0; iter < iterations; iter++) {
      for (let k = 0; k < pairs.length; k++) {
        const { i, j } = pairs[k];
        const A = balls[i];
        const B = balls[j];
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const rSum = A.r + B.r;
        const dist2 = dx * dx + dy * dy;
        // Performance optimization: early exits
        if (dist2 === 0 || dist2 > rSum * rSum) continue;
        // Skip very small overlaps for performance (< 5% overlap)
        if (dist2 > rSum * rSum * 0.95) continue;
        const dist = Math.sqrt(dist2);
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = rSum - dist;
        const invA = 1 / Math.max(A.m, 0.001);
        const invB = 1 / Math.max(B.m, 0.001);

        // Positional correction
        const correctionMag = POS_CORRECT_PERCENT * Math.max(overlap - POS_CORRECT_SLOP, 0) / (invA + invB);
        const cx = correctionMag * nx;
        const cy = correctionMag * ny;
        A.x -= cx * invA; A.y -= cy * invA;
        B.x += cx * invB; B.y += cy * invB;

        // Velocity impulse along the normal
        const rvx = B.vx - A.vx;
        const rvy = B.vy - A.vy;
        const velAlongNormal = rvx * nx + rvy * ny;
        if (velAlongNormal < 0) {
          const e = Math.abs(velAlongNormal) < REST_VEL_THRESHOLD ? 0 : REST;
          const j = -(1 + e) * velAlongNormal / (invA + invB);
          const ix = j * nx;
          const iy = j * ny;
          A.vx -= ix * invA; A.vy -= iy * invA;
          B.vx += ix * invB; B.vy += iy * invB;

          // Tangential slip to spin (approximate rolling/spin transfer)
          const tvx = rvx - velAlongNormal * nx;
          const tvy = rvy - velAlongNormal * ny;
          const slipMag = Math.hypot(tvx, tvy);
          if (slipMag > 1e-3) {
            const tangentSign = (tvx * -ny + tvy * nx) >= 0 ? 1 : -1; // right-hand tangent
            const gain = CONSTANTS.SPIN_GAIN_TANGENT;
            A.omega -= tangentSign * gain * slipMag / Math.max(A.r, 1);
            B.omega += tangentSign * gain * slipMag / Math.max(B.r, 1);
          }
          // Visual squash aligned to contact normal based on impact
          const impact = Math.min(1, Math.abs(velAlongNormal) / ((A.r + B.r) * 50));
          const sAmt = Math.min(CONSTANTS.SQUASH_MAX, impact * 0.8);
          A.squashAmount = Math.max(A.squashAmount, sAmt * 0.8);
          A.squashNormalAngle = Math.atan2(-ny, -nx);
          B.squashAmount = Math.max(B.squashAmount, sAmt * 0.8);
          B.squashNormalAngle = Math.atan2(ny, nx);
        }
      }
    }
  }

  // Main loop optimized for 120fps
  let last = performance.now() / 1000;
  let acc = 0;
  const DT = 1/120; // Target 120fps physics
  function frame(nowMs) {
    const now = nowMs / 1000;
    let dt = Math.min(0.008, now - last); // Cap at ~120fps for high refresh displays
    last = now;
    acc += dt;

  // FPS counters (render and physics) - only update if elements exist
    renderFrameCount++;
    if ((renderFpsElement || physicsFpsElement) && now - lastFPSTime >= CONSTANTS.FPS_UPDATE_INTERVAL) {
      if (renderFpsElement && renderFrameCount !== currentRenderFPS) {
        currentRenderFPS = renderFrameCount;
        renderFpsElement.textContent = currentRenderFPS.toString();
      }
      if (physicsFpsElement && physicsStepCount !== currentPhysicsFPS) {
        currentPhysicsFPS = physicsStepCount;
        physicsFpsElement.textContent = currentPhysicsFPS.toString();
      }
      
      renderFrameCount = 0;
      physicsStepCount = 0;
      lastFPSTime = now;
    }

    // Emit only for pit/flies (other modes manage their own balls)
    if (behaviorMode !== BEHAVIOR_MODES.print) emit(dt);
    
    // Update text colliders periodically (every ~60 frames for performance)
    if (renderFrameCount % 60 === 0) {
      updateTextColliders();
    }

    // Physics iterations optimized for realistic, stable simulation
    let physicsSteps = 0;
    while (acc >= DT && physicsSteps < CONSTANTS.MAX_PHYSICS_STEPS) {
      if (behaviorMode === BEHAVIOR_MODES.print) {
        updateTrail(DT, now * 1000); // Convert to milliseconds
      } else {
        for (let i=0; i<balls.length; i++) balls[i].step(DT);
        resolveCollisions(3); // Balanced quality vs performance
        for (let i=0; i<balls.length; i++) balls[i].walls(canvas.width, canvas.height, DT);
      }
      acc -= DT;
      physicsSteps++;
      physicsStepCount++; // Count physics steps for FPS measurement
    }
    
    // Reset accumulator if we're falling behind
    if (acc > DT * CONSTANTS.ACCUMULATOR_RESET_THRESHOLD) acc = 0;

    // Clear or fade canvas for motion blur trail
    if (trailFade > 0 && trailSubtlety > 0) {
      // Map sliders to effective fade alpha
      const TRAIL_FADE_UI_MAX = 1.5;      // slider max for trail length
      const TRAIL_SUBTLE_UI_MAX = 3.0;    // slider max for subtlety
      const maxAlpha = 0.35;              // shortest trail (more aggressive clear)
      const minAlpha = 0.0015;            // longest trail (very subtle clear)
      const normLen = Math.max(0, Math.min(1, trailFade / TRAIL_FADE_UI_MAX));
      const baseFade = maxAlpha + (minAlpha - maxAlpha) * normLen; // low slider -> big fade
      const subtleNorm = Math.max(0, Math.min(1, trailSubtlety / TRAIL_SUBTLE_UI_MAX));
      // Blend between full clear (1.0 alpha) at low subtlety and baseFade at high subtlety
      let effectiveFade = 1.0 + (baseFade - 1.0) * subtleNorm;
      // Clamp to safe bounds
      effectiveFade = Math.max(0.001, Math.min(1.0, effectiveFade));
      ctx.fillStyle = `rgba(0,0,0,${effectiveFade})`;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    
    // Draw rounded boundary if corner radius > 0 (cache boundary path for performance)
    if (cornerRadius > 0) {
      drawRoundedBoundary(ctx, canvas.width, canvas.height);
    }
    
    // Shadow rendering removed for better performance and realism
    
    // Render balls with individual colors
    for (let i=0; i<balls.length; i++) balls[i].draw(ctx);
    // Draw cursor ball last
    drawCursorBall(ctx);

    // Use requestAnimationFrame for proper vsync
    requestAnimationFrame(frame);
  }
  
  // Start the main loop with requestAnimationFrame
  console.log('High refresh mode enabled - using requestAnimationFrame');
  requestAnimationFrame(frame);

  // Reset balls to spawn positions (preserves all settings)
  function resetBallsToSpawn() {
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      const p = pickSpawnPoint();
      ball.x = p.x;
      ball.y = p.y;
      // Re-apply natural entry throw on reset (sweep-aware, size-aware)
      const centerX = canvas.width * 0.5;
      const dir = EMITTER_SWEEP_ENABLED ? (emitterSweepDir >= 0 ? 1 : -1) : ((ball.x < centerX) ? 1 : -1);
      const sizeInfluence = clamp((ball.r / ((R_MIN + R_MAX) * 0.5)), 0.6, 1.4);
      const baseKick = 140 * sizeInfluence;
      const randKick = 180 * sizeInfluence;
      const upwardKick = 120;
      ball.vx = dir * (baseKick + Math.random() * randKick);
      ball.vy = -Math.random() * upwardKick;
      ball.age = 0;
      ball.driftAx = dir * (360 + Math.random() * 420) * sizeInfluence;
      ball.driftTime = 0.22 + Math.random() * 0.28;
    }
  }

  // Keyboard: reset balls to spawn, toggle panel
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'r') {
      // Move balls back to spawn area - preserve all parameter settings
      resetBallsToSpawn();
      e.preventDefault(); // Prevent any default browser behavior
    }
    if (k === '/' && panel) {
      e.preventDefault();
      panel.classList.toggle('hidden');
    }
  });

  // Seed initial balls across the spawn area for quicker fill
  function seedArea(n = 160) {
    for (let i=0; i<n && balls.length < MAX_BALLS; i++) {
      const p = pickSpawnPoint();
      spawnBall(p.x, p.y);
    }
  }
  seedArea(CONSTANTS.INITIAL_SEED_BALLS);

  // Initialize panel to show correct controls for default mode
  updatePanelForMode(behaviorMode);

  // Shadow system removed for better performance



  // Pointer-first input for repeller (covers mouse, pen, touch)
  if (HAS_POINTER_EVENTS) {
    canvas.addEventListener('pointerdown', (e) => {
      lastPointerType = e.pointerType || 'mouse';
      if (e.pointerType === 'touch') {
        isTouchActive = true;
        activePointerId = e.pointerId;
        updateRepellerFromClient(e.clientX, e.clientY);
        if (repelPower > 0 && repelRadius > 0) repellerEnabled = true;
        lightActive = true;
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      } else {
        updateRepellerFromClient(e.clientX, e.clientY);
        if (repelPower > 0 && repelRadius > 0) repellerEnabled = true;
        lightActive = true;
      }
    }, { passive: true });

    canvas.addEventListener('pointermove', (e) => {
      lastPointerType = e.pointerType || lastPointerType;
      if (e.pointerType === 'touch') {
        if (isTouchActive && e.pointerId === activePointerId) {
          updateRepellerFromClient(e.clientX, e.clientY);
        }
      } else if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        updateRepellerFromClient(e.clientX, e.clientY);
        if (repelPower > 0 && repelRadius > 0) repellerEnabled = true;
        lightActive = true;
      }
    }, { passive: true });

    const clearTouch = () => { isTouchActive = false; activePointerId = null; mouseX = CONSTANTS.OFFSCREEN_MOUSE; mouseY = CONSTANTS.OFFSCREEN_MOUSE; };
    canvas.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') { clearTouch(); lightActive = false; } }, { passive: true });
    canvas.addEventListener('pointercancel', (e) => { if (e.pointerType === 'touch') { clearTouch(); lightActive = false; } }, { passive: true });
    canvas.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') { mouseX = CONSTANTS.OFFSCREEN_MOUSE; mouseY = CONSTANTS.OFFSCREEN_MOUSE; lightActive = false; }
    }, { passive: true });
  } else {
    // Fallback: mouse + touch events
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * DPR;
      mouseY = (e.clientY - rect.top) * DPR;
      if (repelPower > 0 && repelRadius > 0) repellerEnabled = true;
      lightActive = true;
    });
    canvas.addEventListener('mouseleave', () => { mouseX = CONSTANTS.OFFSCREEN_MOUSE; mouseY = CONSTANTS.OFFSCREEN_MOUSE; lightActive = false; });

    canvas.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length === 0) return;
      isTouchActive = true;
      const t = e.touches[0];
      updateRepellerFromClient(t.clientX, t.clientY);
      if (repelPower > 0 && repelRadius > 0) repellerEnabled = true;
      lightActive = true;
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (!isTouchActive || !e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      updateRepellerFromClient(t.clientX, t.clientY);
      // prevent page scroll while interacting with the canvas
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }, { passive: false });
    const endTouch = () => { isTouchActive = false; mouseX = CONSTANTS.OFFSCREEN_MOUSE; mouseY = CONSTANTS.OFFSCREEN_MOUSE; lightActive = false; };
    canvas.addEventListener('touchend', endTouch, { passive: true });
    canvas.addEventListener('touchcancel', endTouch, { passive: true });
  }

  // Draw a cursor as a ball matching the simulation style
  function drawCursorBall(ctx) {
    // Hide cursor ball entirely on mobile-like inputs
    if (hideCursorOnMobile && isMobileLikeInput()) return;
    // Hide cursor ball while actively touching (finger occludes)
    if (isTouchActive && lastPointerType === 'touch') return;
    if (mouseX === CONSTANTS.OFFSCREEN_MOUSE || mouseY === CONSTANTS.OFFSCREEN_MOUSE) return;
    const x = mouseX, y = mouseY;
    const baseSize = (R_MIN + R_MAX) / 2;
    const r = baseSize;
    const color = cursorBallColor;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function applyRepeller(b, dt) {
    // Respect "Off" template by treating zero or near-zero params as disabled
    if (!repellerEnabled) return;
    if (repelPower <= 0 || repelRadius <= 0) return;
    const rPx = repelRadius * DPR;
    const dx = b.x - mouseX;
    const dy = b.y - mouseY;
    const d2 = dx*dx + dy*dy;
    const r2 = rPx * rPx;
    if (d2 > r2) return;
    const d = Math.max(Math.sqrt(d2), CONSTANTS.MIN_REPEL_DISTANCE);
    const nx = dx / d;
    const ny = dy / d;
    const q = Math.max(0, 1 - d / rPx);
    const strength = (repelPower * REPELLER_GLOBAL_MULTIPLIER) * Math.pow(q, repelSoft);
    // Heavier balls respond less to the same field
    const massScale = Math.max(0.25, b.m / MASS_BASELINE_KG);
    b.vx += (nx * strength * dt) / massScale;
    b.vy += (ny * strength * dt) / massScale;
  }

  // Flies behavior: boids-like wander + seek with drift; custom integrator
  function stepFlies(b, dt) {
    const massScale = Math.max(0.25, b.m / MASS_BASELINE_KG);
    // Slight air drag only
    const drag = Math.max(0, 1 - (FRICTION * 0.2 / massScale));
    b.vx *= drag; b.vy *= drag;

    // Wander: slowly rotate a unit vector and add as acceleration
    b.wanderTimer += dt;
    if (b.wanderTimer > 0.08) {
      b.wanderTimer = 0;
      b.wanderAngle += (Math.random() - 0.5) * 0.9;
    }
    let ax = Math.cos(b.wanderAngle) * (fliesWanderStrength * fliesSpeedMul);
    let ay = Math.sin(b.wanderAngle) * (fliesWanderStrength * fliesSpeedMul);

    // Seek the light when active: spring-damper towards a moving orbit target with jitter
    if (lightActive && mouseX !== CONSTANTS.OFFSCREEN_MOUSE && mouseY !== CONSTANTS.OFFSCREEN_MOUSE) {
      // Each fly gets a pseudo-stable orbit radius using its inherent random seed
      if (b._scatterPhase === undefined) { b._scatterPhase = Math.random() * Math.PI * 2; }
      if (b._scatterFactor === undefined) { b._scatterFactor = 1 + (Math.random() * 2 - 1) * fliesScatterVarPct; }
      const radius = Math.max(0, fliesScatterRadius * b._scatterFactor) * DPR;
      b._scatterPhase += dt * (0.6 + Math.random() * 0.8) * fliesSpeedMul; // slow orbiting
      // Orbit center around mouse
      let tx = mouseX + Math.cos(b._scatterPhase) * radius;
      let ty = mouseY + Math.sin(b._scatterPhase) * radius;
      // Jitter to avoid lock-step
      tx += (Math.random() - 0.5) * fliesJitter * 20 * DPR;
      ty += (Math.random() - 0.5) * fliesJitter * 20 * DPR;
      const dx = tx - b.x; const dy = ty - b.y;
      // Critical damping approx: a = k*dx - c*v
      const k = (fliesSeekGain * 0.8) * fliesSpeedMul; // slightly lower to keep orbit-y feel
      const c = Math.sqrt(k) * 1.8; // damping term to prevent overshoot
      ax += k * dx - c * b.vx;
      ay += k * dy - c * b.vy;
    }

    // Apply acceleration (mass-aware), integrate
    b.vx += (ax * dt) / massScale;
    b.vy += (ay * dt) / massScale;

    // Clamp speed for lively motion, not slow-mo
    const maxS = Math.max(200, fliesMaxSpeed * fliesSpeedMul);
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > maxS) { const k = maxS / sp; b.vx *= k; b.vy *= k; }

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    
    // Ensure balls remain circular by resetting squash in flies mode
    const decay = Math.min(1, CONSTANTS.SQUASH_DECAY_PER_S * dt);
    b.squashAmount += (0 - b.squashAmount) * decay;
    b.squash = 1 - b.squashAmount;
  }

  // UI elements
  const frictionSlider = document.getElementById('frictionSlider');
  const emitterSlider = document.getElementById('emitterSlider');
    
    // Apply liquid forces
    applyLiquidCohesion(b, dt);
    applyLiquidSurfaceTension(b, dt);
    applyLiquidBuoyancy(b, dt);
    
    // Integrate motion
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    
    // Maintain circular shape (liquid particles stay round)
    const decay = Math.min(1, CONSTANTS.SQUASH_DECAY_PER_S * dt);
    b.squashAmount += (0 - b.squashAmount) * decay;
    b.squash = 1 - b.squashAmount;
  }

  // UI elements
  const frictionSlider = document.getElementById('frictionSlider');
  const emitterSlider = document.getElementById('emitterSlider');
  const sizeSlider = document.getElementById('sizeSlider');
  const maxBallsSlider = document.getElementById('maxBallsSlider');
  const sizeVariationSlider = document.getElementById('sizeVariationSlider');
  const weightSlider = document.getElementById('weightSlider');
  const spawnYSlider = document.getElementById('spawnYSlider');
  const spawnWidthSlider = document.getElementById('spawnWidthSlider');
  const spawnCenterSlider = document.getElementById('spawnCenterSlider');
  const spawnHeightSlider = document.getElementById('spawnHeightSlider');
  const repelSizeSlider = document.getElementById('repelSizeSlider');
  const repelPowerSlider = document.getElementById('repelPowerSlider');
  const repelSoftSlider = document.getElementById('repelSoftSlider');
  // Color controls
  const colorSelect = document.getElementById('colorSelect');
  const color1 = document.getElementById('color1');
  const color2 = document.getElementById('color2');
  const color3 = document.getElementById('color3');
            const dist = Math.sqrt(distSq);
            const strength = liquidCohesion * (1 - dist / cohesionRadius);
            const nx = deltaX / dist;
            const ny = deltaY / dist;
            
            fx += nx * strength;
            fy += ny * strength;
            neighborCount++;
          }
        }
      }
    }
    
    if (neighborCount > 0) {
      ball.vx += (fx * dt) / massScale;
      ball.vy += (fy * dt) / massScale;
    }
  }

  // Apply surface tension: smooth out blob surfaces (optimized with spatial grid)
  function applyLiquidSurfaceTension(ball, dt) {
    const tensionRadius = ball.r * 1.8;
    const massScale = Math.max(0.25, ball.m / MASS_BASELINE_KG);
    let fx = 0, fy = 0;
    let neighborCount = 0;
    
    // Use spatial grid for performance - only check nearby cells
    const cellSize = Math.max(1, R_MAX * 2);
    const gridWidth = Math.ceil(canvas.width / cellSize) + 1;
    const cx = (ball.x / cellSize) | 0;
    const cy = (ball.y / cellSize) | 0;
    
    // Check 3x3 grid around ball
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = (cy + dy) * gridWidth + (cx + dx);
        const cellBalls = spatialGrid.get(key);
        if (!cellBalls) continue;
        
        for (let i = 0; i < cellBalls.length; i++) {
          const otherIndex = cellBalls[i];
          const other = balls[otherIndex];
          if (other === ball) continue;
          
          const deltaX = other.x - ball.x;
          const deltaY = other.y - ball.y;
          const distSq = deltaX * deltaX + deltaY * deltaY;
          const tensionRadiusSq = tensionRadius * tensionRadius;
          
          if (distSq < tensionRadiusSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const desiredDist = (ball.r + other.r) * 1.1;
            const diff = desiredDist - dist;
            const strength = liquidSurfaceTension * diff * 0.5;
            
            const nx = deltaX / dist;
            const ny = deltaY / dist;
})();
