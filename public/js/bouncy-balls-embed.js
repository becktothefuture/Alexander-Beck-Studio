/* Alexander Beck Studio – Bouncy Balls | Build: 2025-12-14T18:14:34.870Z */
var BouncyBalls = (function (exports) {
  'use strict';

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                          CONSTANTS (COMPLETE)                                ║
  // ║                    Extracted from balls-source.html                          ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  const MODES = {
    PIT: 'pit',
    FLIES: 'flies',
    WEIGHTLESS: 'weightless',
    WATER: 'water',
    VORTEX: 'vortex',
    PING_PONG: 'ping-pong',
    MAGNETIC: 'magnetic',
    BUBBLES: 'bubbles',
    KALEIDOSCOPE: 'kaleidoscope',
    // Simulation 11 (no keyboard shortcut yet)
    WORMS: 'worms'
  };

  const CONSTANTS = {
    DPR: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    OFFSCREEN_MOUSE: -1e9,
    MIN_DISTANCE_EPSILON: 1e-6,
    ACCUMULATOR_RESET_THRESHOLD: 3,
    MAX_PHYSICS_STEPS: 2,
    SPIN_DAMP_PER_S: 2.0,
    SPIN_GAIN: 0.25,
    SPIN_GAIN_TANGENT: 0.18,
    ROLL_FRICTION_PER_S: 1.5,
    SQUASH_MAX_BASE: 0.20,
    SQUASH_DECAY_PER_S: 18.0,
    WALL_REST_VEL_THRESHOLD: 70,
    GROUND_COUPLING_PER_S: 8.0,
    
    // Sleep threshold for jitter reduction (Box2D-inspired)
    SLEEP_VELOCITY_THRESHOLD: 5.0,      // px/s (Box2D uses 0.05 m/s)
    SLEEP_ANGULAR_THRESHOLD: 0.05,      // rad/s
    TIME_TO_SLEEP: 0.5,                 // seconds - must be still this long to sleep
    
    PHYSICS_DT: 1/120};

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                       STATE STORE (OPTIMIZED)                               ║
  // ║               All global state - extracted from balls-source.html            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // ════════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE: Dynamic DPR getter - allows runtime adaptation
  // The renderer can reduce DPR on weak devices for better performance
  // ════════════════════════════════════════════════════════════════════════════════
  let _effectiveDPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function setEffectiveDPR(dpr) {
    _effectiveDPR = dpr;
  }

  const state = {
    config: {},
    // Default boot mode (overridden by main.js on init, but kept consistent here too).
    currentMode: MODES.WORMS,
    balls: [],
    canvas: null,
    ctx: null,
    container: null,
    mouseX: CONSTANTS.OFFSCREEN_MOUSE,
    mouseY: CONSTANTS.OFFSCREEN_MOUSE,
    mouseInCanvas: false,
    lastPointerMoveMs: 0,
    lastPointerMoveX: CONSTANTS.OFFSCREEN_MOUSE,
    lastPointerMoveY: CONSTANTS.OFFSCREEN_MOUSE,
    
    // Physics constants
    GE: 1960,
    G: 0,
    gravityScale: 1.0,
    gravityMultiplier: 0,
    gravityMultiplierPit: 1.10,
    REST: 0.69,
    FRICTION: 0.0060,
    ballMassKg: 129,
    MASS_BASELINE_KG: 129,
    MASS_REST_EXP: 0.15,
    MASS_GRAVITY_EXP: 0.35,
    
    // Device - now a getter that returns the adaptive DPR
    get DPR() { return _effectiveDPR; },
    
    // Size
    sizeScale: 1.2,
    sizeVariation: 0,
    responsiveScale: 1.0,       // Runtime responsive scale (calculated on init)
    responsiveScaleMobile: 0.75, // Scale factor for mobile devices (iPad/iPhone)
    isMobile: false,            // Mobile device detected?
    R_MIN_BASE: 6,
    R_MAX_BASE: 24,
    R_MIN: 6 * 1.2 * 0.75,
    R_MAX: 24 * 1.2 * 1.25,
    
    // Custom cursor
    cursorSize: 1.0,  // Multiplier for cursor size (1.0 = average ball size)
    
    // Ball properties
    ballSoftness: 20,
    ballSpacing: 2.5,     // Extra collision padding between balls (px, 0 = no extra spacing)
    
    // Corner (matches CSS border-radius for collision bounds)
    cornerRadius: 42,
    
    // Wall collision inset (px). Helps prevent visual overlap with the wall edge.
    // This is distinct from radius: it shrinks the effective collision bounds uniformly.
    wallInset: 3,

    // Vortex mode params
    vortexSwirlStrength: 420,
    vortexRadialPull: 180,
    vortexBallCount: 180,
    
    
    // Magnetic mode params (updated defaults)
    magneticBallCount: 180,
    magneticStrength: 65000,
    magneticMaxVelocity: 2800,
    magneticExplosionInterval: 5,
    
    // Bubbles mode params
    bubblesSpawnRate: 8,
    bubblesRiseSpeed: 150,
    bubblesWobble: 40,
    bubblesMaxCount: 200,
    bubblesDeflectRadius: 200,
    
    
    // Ping Pong mode params (left-right bounce, cursor obstacle)
    pingPongBallCount: 35,
    pingPongSpeed: 800,
    pingPongCursorRadius: 50,
    
    // Colors
    currentColors: ['#b7bcb7', '#e4e9e4', '#ffffff', '#00695c', '#000000', '#ff4013', '#0d5cb6', '#ffa000'],
    currentTemplate: 'industrialTeal',
    
    // Flies mode
    fliesBallCount: 60,
    attractionPower: 5000,
    orbitRadius: 180,
    swarmSpeed: 0.4,
    fliesSeparation: 15000,
    
    // Weightless mode
    weightlessCount: 80,
    weightlessInitialSpeed: 250,
    weightlessBounce: 0.97,
    
    // Kaleidoscope mode (mouse-driven mirrored wedges)
    kaleidoscopeBallCount: 23,
    kaleidoscopeSegments: 12,
    kaleidoscopeMirror: 1,
    kaleidoscopeBallSpacing: 9, // Mode-only spacing (px). Applied only while in Kaleidoscope.
    kaleidoscopeSwirlStrength: 52,
    kaleidoscopeRadialPull: 260,
    kaleidoscopeRotationFollow: 1.0,
    kaleidoscopePanStrength: 0.75,
    kaleidoscopeMaxSpeed: 2600,
    // Idle baseline factor (0..1). 0 = frozen when idle, 1 = full-strength even when idle.
    // Keep very low by default so the mode feels calm until the mouse moves.
    kaleidoscopeIdleMotion: 0.03,
    kaleidoscopeEase: 0.18,       // 0..1: easing for force response (higher = snappier)
    kaleidoscopeWander: 0.25,     // 0..1: organic drift amount (unique per ball)
    
    // Water mode
    waterBallCount: 300,
    waterDrag: 0.015,
    waterRippleSpeed: 300,
    waterRippleStrength: 18000,
    waterDriftStrength: 40,
    waterInitialVelocity: 200,
    
    // Repeller
    repelRadius: 120,
    repelPower: 274000,
    repelSoft: 3.4,
    repellerEnabled: false,
    
    // Emitter
    emitterTimer: 0,
    
    // Dark mode
    autoDarkModeEnabled: true,
    isDarkMode: false,
    
    // Click-to-cycle mode switching
    clickCycleEnabled: true,
    
    // Two-level padding system (in pixels)
    containerBorder: 20,   // Outer: insets container from viewport (reveals body bg as frame)
    simulationPadding: 0,  // Inner: padding inside container around canvas

    // Text wrapper padding (in pixels) for UI text blocks (legend, top-right statement)
    contentPadding: 40,    // Space between frame edge and content elements

    // Container inner shadow controls (inside rounded content wrapper)
    containerInnerShadowOpacity: 0.12,
    containerInnerShadowBlur: 80,
    containerInnerShadowSpread: -10,
    containerInnerShadowOffsetY: 0,
    
    // Unified Frame System (walls, chrome, border all share these)
    frameColor: '#0a0a0a',    // Frame color (browser chrome + walls + border)
    wallThickness: 20,        // Unified: wall tubes + body border (px)
    wallRadius: 42,           // Corner radius - shared by all rounded elements (px)
    wallInset: 3,             // Physics-only inset from edges (px at DPR 1)

    // Rubber wall wobble tuning (visual-only deformation, no collision changes)
    wallWobbleMaxDeform: 148,         // Max inward deformation (px at DPR 1)
    wallWobbleStiffness: 1300,        // Spring stiffness (higher = snappier)
    wallWobbleDamping: 34,            // Spring damping (higher = less oscillation)
    wallWobbleSigma: 4.0,             // Impact spread (gaussian sigma in segment units)
    wallWobbleCornerClamp: 1.00,      // Corner stickiness (0 = free, 1 = fully pinned)
    
    // Helpers
    getSquashMax() {
      if (this.ballSoftness === 0) return 0;
      return CONSTANTS.SQUASH_MAX_BASE * (this.ballSoftness / 40.0);
    },
    
    // Canvas corner radius = container radius - simulation padding
    // Used by physics for corner collision detection
    getCanvasCornerRadius() {
      return Math.max(0, this.cornerRadius - this.simulationPadding);
    }
  };

  function initState(config) {
    state.config = { ...config };
    if (config.ballMass) state.ballMassKg = config.ballMass;
    // Treat config.gravityMultiplier as the Ball Pit gravity multiplier (historical naming)
    if (config.gravityMultiplier !== undefined) {
      state.gravityMultiplier = config.gravityMultiplier;
      state.gravityMultiplierPit = config.gravityMultiplier;
    }
    if (config.restitution) state.REST = config.restitution;
    if (config.friction) state.FRICTION = config.friction;
    if (config.ballScale) state.sizeScale = config.ballScale;
    if (config.maxBalls !== undefined) state.maxBalls = config.maxBalls;
    if (config.repelRadius !== undefined) state.repelRadius = config.repelRadius;
    if (config.repelPower !== undefined) state.repelPower = config.repelPower;
    if (config.responsiveScaleMobile !== undefined) state.responsiveScaleMobile = config.responsiveScaleMobile;
    
    // Detect mobile/tablet devices and apply responsive scaling
    detectResponsiveScale();
    
    // Kaleidoscope (optional config overrides)
    if (config.kaleidoscopeBallCount !== undefined) state.kaleidoscopeBallCount = config.kaleidoscopeBallCount;
    if (config.kaleidoscopeSegments !== undefined) state.kaleidoscopeSegments = config.kaleidoscopeSegments;
    if (config.kaleidoscopeMirror !== undefined) state.kaleidoscopeMirror = config.kaleidoscopeMirror;
    if (config.kaleidoscopeBallSpacing !== undefined) state.kaleidoscopeBallSpacing = config.kaleidoscopeBallSpacing;
    if (config.kaleidoscopeSwirlStrength !== undefined) state.kaleidoscopeSwirlStrength = config.kaleidoscopeSwirlStrength;
    if (config.kaleidoscopeRadialPull !== undefined) state.kaleidoscopeRadialPull = config.kaleidoscopeRadialPull;
    if (config.kaleidoscopeRotationFollow !== undefined) state.kaleidoscopeRotationFollow = config.kaleidoscopeRotationFollow;
    if (config.kaleidoscopePanStrength !== undefined) state.kaleidoscopePanStrength = config.kaleidoscopePanStrength;
    if (config.kaleidoscopeMaxSpeed !== undefined) state.kaleidoscopeMaxSpeed = config.kaleidoscopeMaxSpeed;
    if (config.kaleidoscopeEase !== undefined) state.kaleidoscopeEase = config.kaleidoscopeEase;
    if (config.kaleidoscopeWander !== undefined) state.kaleidoscopeWander = config.kaleidoscopeWander;
    
    // Two-level padding system
    if (config.containerBorder !== undefined) state.containerBorder = config.containerBorder;
    if (config.simulationPadding !== undefined) state.simulationPadding = config.simulationPadding;
    if (config.contentPadding !== undefined) state.contentPadding = config.contentPadding;
    if (config.containerInnerShadowOpacity !== undefined) state.containerInnerShadowOpacity = config.containerInnerShadowOpacity;
    if (config.containerInnerShadowBlur !== undefined) state.containerInnerShadowBlur = config.containerInnerShadowBlur;
    if (config.containerInnerShadowSpread !== undefined) state.containerInnerShadowSpread = config.containerInnerShadowSpread;
    if (config.containerInnerShadowOffsetY !== undefined) state.containerInnerShadowOffsetY = config.containerInnerShadowOffsetY;
    
    // Unified frame + rubber wall visuals
    if (config.frameColor !== undefined) state.frameColor = config.frameColor;
    if (config.wallThickness !== undefined) state.wallThickness = config.wallThickness;
    if (config.wallRadius !== undefined) {
      state.wallRadius = config.wallRadius;
      // Keep physics corner collision aligned to the visual radius.
      state.cornerRadius = config.wallRadius;
    }
    if (config.wallInset !== undefined) state.wallInset = config.wallInset;
    if (config.wallInset !== undefined) state.wallInset = config.wallInset;

    // Ball spacing (collision padding)
    if (config.ballSpacing !== undefined) state.ballSpacing = config.ballSpacing;

    // Rubber wall wobble tuning
    if (config.wallWobbleMaxDeform !== undefined) state.wallWobbleMaxDeform = config.wallWobbleMaxDeform;
    if (config.wallWobbleStiffness !== undefined) state.wallWobbleStiffness = config.wallWobbleStiffness;
    if (config.wallWobbleDamping !== undefined) state.wallWobbleDamping = config.wallWobbleDamping;
    if (config.wallWobbleSigma !== undefined) state.wallWobbleSigma = config.wallWobbleSigma;
    if (config.wallWobbleCornerClamp !== undefined) state.wallWobbleCornerClamp = config.wallWobbleCornerClamp;
    
    // Ball sizes are recalculated in detectResponsiveScale (called above)
    // which applies both sizeScale and responsiveScale
  }

  function getGlobals() {
    return state;
  }

  function setCanvas(canvas, ctx, container) {
    state.canvas = canvas;
    state.ctx = ctx;
    state.container = container;
  }

  function setMode$1(mode) {
    state.currentMode = mode;
  }

  function clearBalls() {
    state.balls.length = 0;
  }

  /**
   * Detect device type and apply responsive ball scaling
   * iPad and iPhone get smaller balls for better visual balance
   */
  function detectResponsiveScale() {
    const ua = navigator.userAgent || '';
    const isIPad = /iPad/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
    const isIPhone = /iPhone/.test(ua);
    
    if (isIPad || isIPhone) {
      state.isMobile = true;
      state.responsiveScale = state.responsiveScaleMobile;
      console.log(`✓ Mobile device detected - ball scale: ${state.responsiveScale}x`);
    } else {
      state.isMobile = false;
      state.responsiveScale = 1.0;
    }
    
    // Recalculate ball sizes with responsive scale applied
    updateBallSizes();
  }

  /**
   * Update ball size calculations based on current sizeScale and responsiveScale
   */
  function updateBallSizes() {
    const baseSize = (state.R_MIN_BASE + state.R_MAX_BASE) / 2;
    const totalScale = state.sizeScale * state.responsiveScale;
    state.R_MIN = baseSize * totalScale * 0.75;
    state.R_MAX = baseSize * totalScale * 1.25;
  }

  var state$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    clearBalls: clearBalls,
    detectResponsiveScale: detectResponsiveScale,
    getGlobals: getGlobals,
    initState: initState,
    setCanvas: setCanvas,
    setEffectiveDPR: setEffectiveDPR,
    setMode: setMode$1,
    updateBallSizes: updateBallSizes
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                        COLOR PALETTE SYSTEM (COMPLETE)                       ║
  // ║              Extracted from balls-source.html lines 1405-1558                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  const COLOR_TEMPLATES = {
    industrialTeal: { 
      label: 'Industrial Teal',
      light: ['#b7bcb7', '#d0d0d0', '#ffffff', '#00695c', '#000000', '#ff4013', '#0d5cb6', '#ffa000'],
      dark: ['#6b726b', '#3d453d', '#8a928a', '#00e6c3', '#d5d5d5', '#ff6b47', '#5b9aff', '#ffb84d']
    },
    sunsetCoral: { 
      label: 'Sunset Coral', 
      light: ['#bdbbb8', '#e8e6e3', '#ffffff', '#ff3b3b', '#000000', '#00f5d4', '#1e40af', '#fb923c'],
      dark: ['#716f6b', '#3f3d3a', '#8e8c88', '#ff6b6b', '#d8d8d8', '#00ffe7', '#6ba3ff', '#ffb570']
    },
    violetPunch: { 
      label: 'Violet Punch', 
      light: ['#b8b7c2', '#e6e5ed', '#ffffff', '#9333ea', '#000000', '#dc2626', '#0ea5e9', '#facc15'],
      dark: ['#6d6c7a', '#3a3845', '#8b8a98', '#c266ff', '#dad6e8', '#ff5c5c', '#42d4ff', '#fff066']
    },
    citrusBlast: { 
      label: 'Citrus Blast', 
      light: ['#bfbdb5', '#eae8df', '#ffffff', '#ea580c', '#000000', '#e11d48', '#2563eb', '#059669'],
      dark: ['#74726a', '#403e38', '#918f87', '#ff8c4d', '#dbd9d1', '#ff5c7a', '#6ba3ff', '#00d699']
    },
    cobaltSpark: { 
      label: 'Cobalt Spark', 
      light: ['#b5b8be', '#e3e6eb', '#ffffff', '#1d4ed8', '#000000', '#ea580c', '#db2777', '#d97706'],
      dark: ['#696d75', '#3a3e45', '#878b93', '#6b9dff', '#d6dae2', '#ff8c5c', '#ff66b3', '#ffc266']
    }
  };

  const COLOR_WEIGHTS$1 = [0.50, 0.25, 0.12, 0.06, 0.03, 0.02, 0.01, 0.01];

  function getCurrentPalette(templateName) {
    const globals = getGlobals();
    const template = COLOR_TEMPLATES[templateName];
    if (!template) return COLOR_TEMPLATES.industrialTeal.light;
    return globals.isDarkMode ? template.dark : template.light;
  }

  function pickRandomColor() {
    const globals = getGlobals();
    const colors = globals.currentColors;
    
    if (!colors || colors.length === 0) {
      console.warn('No colors available, using fallback');
      return '#ffffff';
    }
    
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < Math.min(colors.length, COLOR_WEIGHTS$1.length); i++) {
      cumulativeWeight += COLOR_WEIGHTS$1[i];
      if (random <= cumulativeWeight) {
        return colors[i];
      }
    }
    
    return colors[Math.min(colors.length - 1, 7)];
  }

  /**
   * Get a specific color by index (0-7)
   * Ensures all 8 colors are accessible for guaranteed representation
   */
  function getColorByIndex(index) {
    const globals = getGlobals();
    const colors = globals.currentColors;
    
    if (!colors || colors.length === 0) {
      console.warn('No colors available, using fallback');
      return '#ffffff';
    }
    
    const clampedIndex = Math.max(0, Math.min(7, Math.floor(index)));
    return colors[clampedIndex] || '#ffffff';
  }

  function applyColorTemplate(templateName) {
    const globals = getGlobals();
    globals.currentTemplate = templateName;
    globals.currentColors = getCurrentPalette(templateName);
    globals.cursorBallColor = globals.currentColors[globals.cursorBallIndex || 4];
    
    // Update existing ball colors
    updateExistingBallColors();
    
    // Sync CSS variables
    syncPaletteVars(globals.currentColors);
    
    // Update UI color pickers
    updateColorPickersUI();
  }

  function updateExistingBallColors() {
    const globals = getGlobals();
    const balls = globals.balls;
    const colors = globals.currentColors;
    
    // Guarantee: ensure at least one ball uses each palette color (matches legend circles).
    // This runs only on palette changes, not in hot paths.
    if (balls.length > 0 && colors && colors.length > 0) {
      const count = Math.min(8, colors.length, balls.length);
      const start = Math.floor(Math.random() * count);
      for (let i = 0; i < count; i++) {
        balls[i].color = colors[(start + i) % count];
      }
      for (let i = count; i < balls.length; i++) {
        balls[i].color = pickRandomColor();
      }
      return;
    }

    for (let i = 0; i < balls.length; i++) {
      balls[i].color = pickRandomColor();
    }
  }

  function syncPaletteVars(colors) {
    try {
      const root = document.documentElement;
      const list = (colors && colors.length ? colors : []).slice(0, 8);
      for (let i = 0; i < 8; i++) {
        const hex = list[i] || '#ffffff';
        root.style.setProperty(`--ball-${i+1}`, hex);
      }
    } catch (_) { /* no-op */ }
  }

  function updateColorPickersUI() {
    const globals = getGlobals();
    const colors = globals.currentColors;
    
    for (let i = 1; i <= 8; i++) {
      const picker = document.getElementById(`color${i}`);
      const display = document.getElementById(`color${i}Val`);
      if (picker && colors[i-1]) {
        picker.value = colors[i-1];
        if (display) display.textContent = colors[i-1].toUpperCase();
      }
    }
  }

  function populateColorSelect() {
    const select = document.getElementById('colorSelect');
    if (!select) return;
    
    select.innerHTML = '';
    for (const [key, template] of Object.entries(COLOR_TEMPLATES)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = template.label;
      select.appendChild(option);
    }
    
    const globals = getGlobals();
    select.value = globals.currentTemplate;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    SOUND ENGINE — "SOFT ORGANIC IMPACTS"                     ║
  // ║    Realistic, non-melodic collision sounds with intensity-driven dynamics    ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  /**
   * Sound Design: Soft Organic Impacts
   * 
   * Key principles for realism:
   * - Intensity drives EVERYTHING: soft touches ≈ silent, hard hits ≈ audible
   * - Non-linear dynamics: energy^1.5 curve means gentle hits are very quiet
   * - Darker timbre baseline: only hard impacts reveal high frequencies
   * - Micro-variance on all parameters: no two hits sound identical
   * - Aggressive high-frequency rolloff: prevents harsh/clacky artifacts
   * - Soft limiting: peaks are compressed, never clip
   * 
   * Performance: 8-voice pool, O(1) per collision, ~3ms audio latency
   */

  // ════════════════════════════════════════════════════════════════════════════════
  // MICRO-VARIATION HELPER
  // Real-world collisions NEVER sound identical.
  // ════════════════════════════════════════════════════════════════════════════════

  /** Add random variance to a value: vary(100, 0.15) → 85–115 */
  function vary(base, variance = 0.15) {
    return base * (1 + (Math.random() - 0.5) * 2 * variance);
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // CONFIGURATION — Locked baseline for soft organic impacts
  // ════════════════════════════════════════════════════════════════════════════════
  const BASE_CONFIG = {
    // Synthesis
    attackTime: 0.005,
    decayTime: 0.075,
    harmonicGain: 0.0,
    
    // Filter (timbre)
    filterBaseFreq: 580,
    filterVelocityRange: 400,
    filterQ: 0.18,
    filterMinHz: 350,
    filterMaxHz: 2800,
    
    // Pitch mapping (radius → frequency)
    pitchMinHz: 145,
    pitchMaxHz: 280,
    pitchCurve: 1.0,
    
    // Reverb
    reverbDecay: 0.14,
    reverbWetMix: 0.08,
    reverbHighDamp: 0.80,
    
    // Volume / dynamics
    minGain: 0.008,
    maxGain: 0.09,
    masterGain: 0.28,
    voiceGainMax: 0.14,
    
    // Performance
    minTimeBetweenSounds: 0.012,
    
    // Stereo
    maxPan: 0.15,
    
    // Noise transient (impact "snap")
    noiseTransientEnabled: true,
    noiseTransientGain: 0.045,
    noiseTransientDecay: 0.008,
    noiseTransientFilterMin: 500,
    noiseTransientFilterMax: 1800,
    noiseTransientQ: 1.2,
    
    // Sparkle partial (glass-like micro-chimes; disabled by default)
    sparkleGain: 0.0,
    sparkleRatioMin: 2.3,
    sparkleRatioMax: 4.1,
    sparkleDecayMul: 0.65,
    
    // Micro-variation (organic feel)
    variancePitch: 0.06,
    varianceDecay: 0.20,
    varianceGain: 0.15,
    varianceFilter: 0.18,
    varianceNoise: 0.25,
    
    // Intensity-driven dynamics
    velocityNoiseScale: 1.8,
    velocityBrightnessScale: 1.4,
    velocityDecayScale: 0.65,
    intensityExponent: 1.5,
    
    // Tone safety (anti-harshness)
    toneSafetyMinHz: 130,
    toneSafetyMaxHz: 480,
    toneSafetyExponent: 2.2,
    toneSafetyHighGainAtten: 0.25,
    toneSafetyLowGainAtten: 0.06,
    toneSafetyHighBrightAtten: 0.45,
    
    // Energy threshold
    collisionMinImpact: 0.58,
    
    // High-shelf EQ (aggressive high rolloff)
    highShelfFreq: 2200,
    highShelfGain: -6,
  };

  // Mutable config (initialized after presets are defined)
  let CONFIG = null;

  // ════════════════════════════════════════════════════════════════════════════════
  // PRESETS — Different sound characters for different aesthetics
  // ════════════════════════════════════════════════════════════════════════════════
  const SOUND_PRESETS = {
    // Default: balanced, warm, natural
    organicImpact: {
      label: 'Organic Impact',
      description: 'Warm, natural thuds with intensity dynamics',
      ...BASE_CONFIG,
    },
    
    // Brighter, more resonant — like glass marbles on hard surface
    glassMarbles: {
      label: 'Glass Marbles',
      description: 'Clear, glassy impacts with more presence',
      ...BASE_CONFIG,
      pitchMinHz: 260,
      pitchMaxHz: 780,
      pitchCurve: 1.05,
      filterBaseFreq: 850,
      filterVelocityRange: 600,
      noiseTransientGain: 0.065,
      noiseTransientFilterMin: 650,
      noiseTransientFilterMax: 2200,
      noiseTransientQ: 1.6,
      decayTime: 0.055,
      intensityExponent: 1.3,
      highShelfGain: -4.5,
    },
    
    // ★ PREFERRED: Clear, close, soothing crystalline micro-chimes
    crystalPebbles: {
      label: 'Crystal Pebbles ★',
      description: 'Crisp, close, soothing micro-chimes (non-repetitive)',
      ...BASE_CONFIG,
      // Higher, lighter pitch mapping
      pitchMinHz: 420,
      pitchMaxHz: 1600,
      pitchCurve: 1.15,
      // Brighter timbre, still softened
      filterBaseFreq: 1300,
      filterVelocityRange: 1700,
      filterQ: 0.22,
      filterMaxHz: 6200,
      // Short + delicate
      decayTime: 0.040,
      intensityExponent: 1.65,
      collisionMinImpact: 0.70,
      minTimeBetweenSounds: 0.018,
      // Sparkle instead of "snap"
      noiseTransientGain: 0.020,
      noiseTransientDecay: 0.006,
      noiseTransientFilterMin: 1200,
      noiseTransientFilterMax: 7000,
      noiseTransientQ: 2.8,
      sparkleGain: 0.12,
      sparkleRatioMin: 2.6,
      sparkleRatioMax: 4.4,
      sparkleDecayMul: 0.55,
      // Keep it close (less distance)
      reverbWetMix: 0.04,
      reverbDecay: 0.10,
      highShelfGain: -4,
      masterGain: 0.24,
    },
    
    // ★ PREFERRED: Very soft, minimal transient — like wooden beads
    woodenBeads: {
      label: 'Wooden Beads ★',
      description: 'Ultra-soft, muted thuds (recommended)',
      ...BASE_CONFIG,
      filterBaseFreq: 420,
      filterVelocityRange: 200,
      noiseTransientGain: 0.025,
      noiseTransientFilterMin: 380,
      noiseTransientFilterMax: 1400,
      noiseTransientQ: 1.1,
      decayTime: 0.095,
      intensityExponent: 1.7,
      collisionMinImpact: 0.62,
      highShelfGain: -7.5,
      reverbWetMix: 0.12,
    },
    
    // Longer decay, more bounce — playful rubber balls
    rubberBalls: {
      label: 'Rubber Balls',
      description: 'Bouncy, playful with longer decay',
      ...BASE_CONFIG,
      pitchMinHz: 160,
      pitchMaxHz: 360,
      filterBaseFreq: 520,
      filterVelocityRange: 350,
      noiseTransientGain: 0.035,
      noiseTransientFilterMin: 450,
      noiseTransientFilterMax: 1600,
      noiseTransientQ: 1.2,
      decayTime: 0.120,
      intensityExponent: 1.4,
      reverbWetMix: 0.14,
      highShelfGain: -5,
    },
    
    // Sharper attack, brighter — crisp and percussive
    metallicClick: {
      label: 'Metallic Click',
      description: 'Crisp, percussive impacts',
      ...BASE_CONFIG,
      pitchMinHz: 220,
      pitchMaxHz: 620,
      pitchCurve: 1.1,
      filterBaseFreq: 720,
      filterVelocityRange: 550,
      noiseTransientGain: 0.080,
      noiseTransientFilterMin: 700,
      noiseTransientFilterMax: 2400,
      noiseTransientQ: 1.8,
      noiseTransientDecay: 0.006,
      decayTime: 0.045,
      intensityExponent: 1.2,
      highShelfGain: -3.5,
      collisionMinImpact: 0.50,
    },
  };

  // Default preset (crystalPebbles is tuned for crisp, soothing presence)
  let currentPreset = 'crystalPebbles';

  // Initialize CONFIG with the default preset
  CONFIG = { ...SOUND_PRESETS[currentPreset] };
  delete CONFIG.label;
  delete CONFIG.description;

  // ════════════════════════════════════════════════════════════════════════════════
  // STATE
  // ════════════════════════════════════════════════════════════════════════════════
  let audioContext = null;
  let masterGain = null;
  let reverbNode = null;
  let dryGain = null;
  let wetGain = null;
  let limiter = null;
  let saturator = null;
  let highShelf = null;

  let isEnabled$2 = false;
  let isUnlocked = false;

  // Broadcast state changes so UI stays in sync
  const SOUND_STATE_EVENT = 'bravia-balls:sound-state';
  function emitSoundStateChange() {
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent(SOUND_STATE_EVENT, { detail: getSoundState() }));
      }
    } catch (e) {}
  }

  // Voice pool for efficient sound playback (reusable nodes)
  const VOICE_POOL_SIZE = 8;
  let voicePool = [];
  let lastGlobalSoundTime = 0;
  const GLOBAL_MIN_INTERVAL = 0.005; // 5ms between ANY sounds (200/sec max)

  let lastSoundTime = new Map(); // ball id → timestamp

  // Reduced motion preference
  let prefersReducedMotion = false;

  // Shared noise buffer (created once, reused)
  let sharedNoiseBuffer = null;

  let isSoundEngineInitialized = false;

  // ════════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Initialize the sound engine (call once at startup)
   * Does NOT create AudioContext yet — that requires user interaction
   */
  function initSoundEngine() {
    if (isSoundEngineInitialized) return;
    isSoundEngineInitialized = true;

    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion = motionQuery.matches;
      motionQuery.addEventListener('change', (e) => {
        prefersReducedMotion = e.matches;
      });
    }
  }

  /**
   * Unlock audio (must be called from user gesture like click)
   * Creates AudioContext and builds the audio graph
   */
  async function unlockAudio() {
    if (isUnlocked) return true;
    
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported');
        return false;
      }
      
      audioContext = new AudioCtx({ 
        latencyHint: 'interactive',
        sampleRate: 44100
      });
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      buildAudioGraph();
      
      isUnlocked = true;
      isEnabled$2 = true;
      emitSoundStateChange();
      
      const latencyMs = (audioContext.baseLatency || 0) * 1000;
      console.log(`✓ Audio unlocked (${latencyMs.toFixed(1)}ms base latency)`);
      return true;
      
    } catch (error) {
      console.error('Failed to unlock audio:', error);
      return false;
    }
  }

  /**
   * Build the audio processing graph:
   * Voice Pool → [Dry + Reverb] → Soft Clip → High Shelf → Limiter → Master → Output
   */
  function buildAudioGraph() {
    // Master gain
    masterGain = audioContext.createGain();
    masterGain.gain.value = CONFIG.masterGain;
    
    // Limiter (prevent clipping)
    limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 10;
    limiter.ratio.value = 16;
    limiter.attack.value = 0.0005;
    limiter.release.value = 0.08;

    // High-shelf EQ (tame highs)
    highShelf = audioContext.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = CONFIG.highShelfFreq;
    highShelf.gain.value = CONFIG.highShelfGain;
    highShelf.Q.value = 0.7;

    // Soft clipper (gentle saturation)
    saturator = audioContext.createWaveShaper();
    saturator.curve = makeSoftClipCurve(0.55);
    saturator.oversample = '2x';
    
    // Dry/wet routing for reverb
    dryGain = audioContext.createGain();
    dryGain.gain.value = 1 - CONFIG.reverbWetMix;
    
    wetGain = audioContext.createGain();
    wetGain.gain.value = CONFIG.reverbWetMix;
    
    // Reverb (algorithmic delay network)
    reverbNode = createReverbEffect();
    const reverbOut = reverbNode._output;
    
    // Connect graph
    dryGain.connect(saturator);
    wetGain.connect(reverbNode);
    reverbOut.connect(saturator);
    saturator.connect(highShelf);
    highShelf.connect(limiter);
    limiter.connect(masterGain);
    masterGain.connect(audioContext.destination);
    
    // Initialize voice pool
    initVoicePool();
  }

  /** Create a gentle soft-clipping curve (tanh-style) */
  function makeSoftClipCurve(amount = 0.55) {
    const n = 1024;
    const curve = new Float32Array(n);
    const drive = 1 + amount * 8;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
    }
    return curve;
  }

  /** Create algorithmic reverb using feedback delay network */
  function createReverbEffect() {
    const input = audioContext.createGain();
    const output = audioContext.createGain();
    
    const delays = [0.029, 0.037, 0.053, 0.067];
    const feedbackGain = 0.4;
    
    const delayNodes = delays.map(time => {
      const delay = audioContext.createDelay(0.1);
      delay.delayTime.value = time * CONFIG.reverbDecay;
      return delay;
    });
    
    const feedbacks = delayNodes.map(() => {
      const gain = audioContext.createGain();
      gain.gain.value = feedbackGain;
      return gain;
    });
    
    const dampingFilter = audioContext.createBiquadFilter();
    dampingFilter.type = 'lowpass';
    dampingFilter.frequency.value = 2000 * (1 - CONFIG.reverbHighDamp);
    dampingFilter.Q.value = 0.5;
    
    delayNodes.forEach((delay, i) => {
      input.connect(delay);
      delay.connect(feedbacks[i]);
      feedbacks[i].connect(dampingFilter);
      feedbacks[i].connect(delayNodes[(i + 1) % delayNodes.length]);
    });
    
    dampingFilter.connect(output);
    input.connect(output);
    
    input._output = output;
    return input;
  }

  /** Initialize the voice pool with pre-allocated audio nodes */
  function initVoicePool() {
    voicePool = [];
    
    for (let i = 0; i < VOICE_POOL_SIZE; i++) {
      const voice = {
        id: i,
        inUse: false,
        startTime: 0,
        // Persistent nodes (reused)
        filter: audioContext.createBiquadFilter(),
        envelope: audioContext.createGain(),
        panner: audioContext.createStereoPanner(),
        reverbSend: audioContext.createGain(),
        noiseFilter: audioContext.createBiquadFilter(),
        noiseEnvelope: audioContext.createGain(),
        // Per-use nodes
        osc: null,
        harmonicOsc: null,
        sparkleOsc: null,
        noiseSource: null,
      };
      
      voice.filter.type = 'lowpass';
      voice.noiseFilter.type = 'bandpass';
      voice.noiseFilter.Q.value = 1.2;
      
      // Connect persistent chain
      voice.filter.connect(voice.envelope);
      voice.envelope.connect(voice.panner);
      voice.panner.connect(dryGain);
      voice.panner.connect(voice.reverbSend);
      voice.reverbSend.connect(wetGain);
      
      voice.noiseFilter.connect(voice.noiseEnvelope);
      voice.noiseEnvelope.connect(voice.panner);
      
      voicePool.push(voice);
    }
  }

  /** Create a short noise burst for transient "snap" */
  function createTransientNoise() {
    if (!sharedNoiseBuffer) {
      const bufferSize = audioContext.sampleRate * 2;
      sharedNoiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = sharedNoiseBuffer.getChannelData(0);
      
      // Pink-ish noise (more natural than pure white)
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.25;
      }
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = sharedNoiseBuffer;
    noise.loopStart = Math.random() * 1.5;
    noise.loopEnd = noise.loopStart + 0.1;
    noise.loop = false;
    
    return noise;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // SOUND PLAYBACK
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Play a collision sound using voice pool with stealing
   * @param {number} ballRadius - Ball radius (maps to pitch)
   * @param {number} intensity - Collision intensity 0-1 (maps to volume + brightness)
   * @param {number} xPosition - Ball X position 0-1 (maps to stereo pan)
   * @param {string|number} ballId - Unique ball identifier for debouncing
   */
  function playCollisionSound(ballRadius, intensity, xPosition = 0.5, ballId = null) {
    if (!isEnabled$2 || !isUnlocked || !audioContext || prefersReducedMotion) return;
    
    // Energy threshold: soft touches are silent
    if (intensity < CONFIG.collisionMinImpact) return;
    
    const now = audioContext.currentTime;
    
    // Global rate limiter
    if (now - lastGlobalSoundTime < GLOBAL_MIN_INTERVAL) return;
    
    // Per-ball debounce
    if (ballId !== null) {
      const lastTime = lastSoundTime.get(ballId) || 0;
      if (now - lastTime < CONFIG.minTimeBetweenSounds) return;
      lastSoundTime.set(ballId, now);
    }
    
    lastGlobalSoundTime = now;
    
    // Periodic cleanup of old entries
    if (lastSoundTime.size > 200) {
      const threshold = now - 0.5;
      for (const [id, time] of lastSoundTime) {
        if (time < threshold) lastSoundTime.delete(id);
      }
    }
    
    const voice = acquireVoice();
    if (!voice) return;
    
    const frequency = radiusToFrequency(ballRadius);
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    
    playVoice(voice, frequency, clampedIntensity, xPosition, now);
  }

  /**
   * Play a short test hit (for UI auditioning).
   * Useful for the synth-style control surface: lets you "fumble" settings without
   * needing a physical collision to happen.
   */
  function playTestSound({ intensity = 0.82, radius = 18, xPosition = 0.72 } = {}) {
    playCollisionSound(radius, intensity, xPosition, null);
  }

  /** Acquire a voice from the pool (with voice stealing) */
  function acquireVoice(now) {
    // Look for free voice
    for (let i = 0; i < VOICE_POOL_SIZE; i++) {
      if (!voicePool[i].inUse) return voicePool[i];
    }
    
    // Steal oldest
    let oldestVoice = voicePool[0];
    for (let i = 1; i < VOICE_POOL_SIZE; i++) {
      if (voicePool[i].startTime < oldestVoice.startTime) {
        oldestVoice = voicePool[i];
      }
    }
    
    releaseVoice(oldestVoice);
    return oldestVoice;
  }

  /** Release a voice (stop oscillators, mark as free) */
  function releaseVoice(voice) {
    if (voice.osc) {
      try { voice.osc.stop(); voice.osc.disconnect(); } catch (e) {}
      voice.osc = null;
    }
    if (voice.harmonicOsc) {
      try { voice.harmonicOsc.stop(); voice.harmonicOsc.disconnect(); } catch (e) {}
      voice.harmonicOsc = null;
    }
    if (voice.sparkleOsc) {
      try { voice.sparkleOsc.stop(); voice.sparkleOsc.disconnect(); } catch (e) {}
      voice.sparkleOsc = null;
    }
    if (voice.noiseSource) {
      try { voice.noiseSource.stop(); voice.noiseSource.disconnect(); } catch (e) {}
      voice.noiseSource = null;
    }
    voice.inUse = false;
  }

  /** Play a sound using a pooled voice */
  function playVoice(voice, frequency, intensity, xPosition, now) {
    voice.inUse = true;
    voice.startTime = now;
    
    // Non-linear intensity curve (soft hits MUCH quieter)
    const energy = Math.max(0, Math.min(1, intensity));
    const gainShape = Math.pow(energy, CONFIG.intensityExponent);
    
    const variedFreq = vary(frequency, CONFIG.variancePitch);
    
    // Decay (harder = snappier)
    const decayVar = vary(CONFIG.decayTime, CONFIG.varianceDecay);
    const finalDecay = decayVar * (1 - gainShape * (1 - CONFIG.velocityDecayScale));
    const duration = finalDecay + 0.02;

    // Gain (non-linear intensity mapping)
    let gain = CONFIG.minGain + (CONFIG.maxGain - CONFIG.minGain) * gainShape;
    gain *= vary(1.0, CONFIG.varianceGain);

    // Filter (brightness scales with intensity)
    const brightnessScale = 1 + (CONFIG.velocityBrightnessScale - 1) * gainShape;
    let filterFreq = CONFIG.filterBaseFreq + CONFIG.filterVelocityRange * Math.pow(gainShape, 1.3);
    filterFreq *= vary(1.0, CONFIG.varianceFilter) * brightnessScale;
    
    const panValue = (xPosition - 0.5) * 2 * CONFIG.maxPan;
    const reverbAmount = 0.12 + (1 - gainShape) * 0.5;
    
    // Tone safety
    ({ gain, filterFreq } = applyToneSafety(variedFreq, gain, filterFreq));
    
    voice.filter.frequency.value = filterFreq;
    voice.filter.Q.value = CONFIG.filterQ;
    voice.panner.pan.value = panValue;
    voice.reverbSend.gain.value = reverbAmount;
    voice.noiseFilter.Q.value = clamp$3(CONFIG.noiseTransientQ || 1.2, 0.5, 8.0);
    
    // Main envelope
    voice.envelope.gain.cancelScheduledValues(now);
    voice.envelope.gain.setValueAtTime(gain, now);
    voice.envelope.gain.exponentialRampToValueAtTime(0.001, now + finalDecay);
    
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = variedFreq;
    
    voice.osc = osc;
    osc.connect(voice.filter);

    // Harmonic warmth (subtle 2nd partial)
    if ((CONFIG.harmonicGain || 0) > 0.001) {
      const harmonicOsc = audioContext.createOscillator();
      harmonicOsc.type = 'sine';
      harmonicOsc.frequency.value = variedFreq * 2;
      
      const harmonicEnv = audioContext.createGain();
      harmonicEnv.gain.cancelScheduledValues(now);
      harmonicEnv.gain.setValueAtTime(gain * CONFIG.harmonicGain, now);
      harmonicEnv.gain.exponentialRampToValueAtTime(0.001, now + finalDecay);
      
      voice.harmonicOsc = harmonicOsc;
      harmonicOsc.connect(harmonicEnv);
      harmonicEnv.connect(voice.filter);
      harmonicOsc.onended = () => {
        try { harmonicEnv.disconnect(); } catch (e) {}
      };
      harmonicOsc.start(now);
      harmonicOsc.stop(now + duration);
    } else {
      voice.harmonicOsc = null;
    }

    // Sparkle partial (glass-like micro-chime) — short, delicate, non-repetitive
    if ((CONFIG.sparkleGain || 0) > 0.001) {
      const sparkleOsc = audioContext.createOscillator();
      sparkleOsc.type = 'sine';
      
      const rMin = CONFIG.sparkleRatioMin || 2.3;
      const rMax = CONFIG.sparkleRatioMax || 4.1;
      const ratio = clamp$3(rMin + Math.random() * (rMax - rMin), 1.2, 10.0);
      sparkleOsc.frequency.value = variedFreq * vary(ratio, 0.02);
      
      const sparkleEnv = audioContext.createGain();
      const sparkleDecay = Math.max(
        0.012,
        finalDecay * clamp$3(CONFIG.sparkleDecayMul || 0.65, 0.25, 0.95)
      );
      sparkleEnv.gain.cancelScheduledValues(now);
      sparkleEnv.gain.setValueAtTime(gain * CONFIG.sparkleGain, now);
      sparkleEnv.gain.exponentialRampToValueAtTime(0.001, now + sparkleDecay);
      
      voice.sparkleOsc = sparkleOsc;
      sparkleOsc.connect(sparkleEnv);
      sparkleEnv.connect(voice.filter);
      sparkleOsc.onended = () => {
        try { sparkleEnv.disconnect(); } catch (e) {}
      };
      sparkleOsc.start(now);
      sparkleOsc.stop(now + duration);
    } else {
      voice.sparkleOsc = null;
    }

    // Noise transient (only on harder hits)
    if (CONFIG.noiseTransientEnabled && gainShape > 0.25) {
      const noiseSource = createTransientNoise();
      voice.noiseSource = noiseSource;
      
      const noiseIntensity = Math.pow(gainShape, 1.4);
      const noiseFilterBase = CONFIG.noiseTransientFilterMin + 
        (CONFIG.noiseTransientFilterMax - CONFIG.noiseTransientFilterMin) * noiseIntensity;
      voice.noiseFilter.frequency.value = vary(noiseFilterBase, CONFIG.varianceNoise);
      
      const noiseGain = CONFIG.noiseTransientGain * CONFIG.velocityNoiseScale * noiseIntensity * gain;
      const noiseDecay = vary(CONFIG.noiseTransientDecay, CONFIG.varianceNoise);
      
      voice.noiseEnvelope.gain.cancelScheduledValues(now);
      voice.noiseEnvelope.gain.setValueAtTime(noiseGain, now);
      voice.noiseEnvelope.gain.exponentialRampToValueAtTime(0.001, now + noiseDecay);
      
      noiseSource.connect(voice.noiseFilter);
      noiseSource.start(now);
      noiseSource.stop(now + noiseDecay + 0.01);
    } else {
      voice.noiseSource = null;
    }
    
    osc.start(now);
    osc.stop(now + duration);
    osc.onended = () => releaseVoice(voice);
  }

  function clamp$3(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  /** Apply tone safety (prevent brittle/ugly extreme tones) */
  function applyToneSafety(frequency, gain, filterFreq) {
    const t = clamp$3(
      (frequency - CONFIG.toneSafetyMinHz) / (CONFIG.toneSafetyMaxHz - CONFIG.toneSafetyMinHz),
      0, 1
    );

    const exp = CONFIG.toneSafetyExponent;
    const high = Math.pow(t, exp);
    const low = Math.pow(1 - t, exp);

    const gainMul = clamp$3(
      1 - (CONFIG.toneSafetyHighGainAtten * high) - (CONFIG.toneSafetyLowGainAtten * low),
      0.6, 1
    );
    let safeGain = Math.min(gain * gainMul, CONFIG.voiceGainMax);

    const brightMul = clamp$3(1 - CONFIG.toneSafetyHighBrightAtten * high, 0.55, 1);
    let safeFilter = clamp$3(filterFreq * brightMul, CONFIG.filterMinHz, CONFIG.filterMaxHz);

    return { gain: safeGain, filterFreq: safeFilter };
  }

  /** Map ball radius to organic frequency (non-melodic) */
  function radiusToFrequency(radius) {
    const minR = 8, maxR = 55;
    const normalized = clamp$3((radius - minR) / (maxR - minR), 0, 1);
    const inv = 1 - normalized;
    
    const minHz = clamp$3(CONFIG.pitchMinHz || 145, 40, 6000);
    const maxHz = clamp$3(CONFIG.pitchMaxHz || 280, minHz + 10, 12000);
    const curve = clamp$3(CONFIG.pitchCurve || 1.0, 0.5, 2.5);
    const shaped = Math.pow(inv, curve);
    
    const baseFreq = minHz + shaped * (maxHz - minHz);
    return baseFreq * vary(1, (CONFIG.variancePitch || 0.06) * 1.5);
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════════════════════════

  /** Toggle sound on/off */
  function toggleSound() {
    if (!isUnlocked) return false;
    isEnabled$2 = !isEnabled$2;
    emitSoundStateChange();
    return isEnabled$2;
  }

  /** Get current sound state */
  function getSoundState() {
    return {
      isUnlocked,
      isEnabled: isEnabled$2,
      activeSounds: voicePool.filter(v => v.inUse).length,
      poolSize: VOICE_POOL_SIZE,
    };
  }

  /** Get current config (for debugging) */
  function getSoundConfig() {
    return { ...CONFIG };
  }

  /** Update specific config parameters at runtime */
  function updateSoundConfig(updates) {
    for (const [key, value] of Object.entries(updates)) {
      if (key in CONFIG) {
        CONFIG[key] = value;
      }
    }
    
    // Update audio nodes if needed
    if (wetGain && dryGain && 'reverbWetMix' in updates) {
      wetGain.gain.value = CONFIG.reverbWetMix;
      dryGain.gain.value = 1 - CONFIG.reverbWetMix;
    }
    if (highShelf && ('highShelfFreq' in updates || 'highShelfGain' in updates)) {
      highShelf.frequency.value = CONFIG.highShelfFreq;
      highShelf.gain.value = CONFIG.highShelfGain;
    }
    if (masterGain && 'masterGain' in updates) {
      masterGain.gain.value = CONFIG.masterGain;
    }
  }

  /** Apply a sound preset */
  function applySoundPreset(presetName) {
    const preset = SOUND_PRESETS[presetName];
    if (!preset) return false;
    currentPreset = presetName;
    const { label, description, ...values } = preset;
    updateSoundConfig(values);
    return true;
  }

  /** Get current preset name */
  function getCurrentPreset() {
    return currentPreset;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                         COLLISION DETECTION (COMPLETE)                       ║
  // ║              Spatial hashing + resolution from lines 2350-2466               ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  const spatialGrid = new Map();

  function collectPairsSorted() {
    const globals = getGlobals();
    const balls = globals.balls;
    const canvas = globals.canvas;
    const R_MAX = globals.R_MAX;
    const spacing = (globals.ballSpacing || 0) * (globals.DPR || 1); // Extra spacing in pixels
    
    const n = balls.length;
    if (n < 2) return [];
    
    const cellSize = Math.max(1, R_MAX * 2);
    const gridWidth = Math.ceil(canvas.width / cellSize) + 1;
    spatialGrid.clear();
    
    // Build grid
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      const cx = (b.x / cellSize) | 0;
      const cy = (b.y / cellSize) | 0;
      const key = cy * gridWidth + cx;
      let arr = spatialGrid.get(key);
      if (!arr) { arr = []; spatialGrid.set(key, arr); }
      arr.push(i);
    }
    
    const pairs = [];
    for (const [key, arr] of spatialGrid) {
      const cy = (key / gridWidth) | 0;
      const cx = key % gridWidth;
      
      // Check 9 neighboring cells
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
              const rSum = A.r + B.r + spacing; // Add extra spacing to collision radius
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
    
    pairs.sort((a, b) => b.overlap - a.overlap);
    return pairs;
  }

  function resolveCollisions(iterations = 10) {
    const globals = getGlobals();
    const balls = globals.balls;
    const pairs = collectPairsSorted();
    const REST = globals.REST;
    const POS_CORRECT_PERCENT = 0.8;
    const POS_CORRECT_SLOP = 0.5 * globals.DPR;
    const REST_VEL_THRESHOLD = 30;
    const spacing = (globals.ballSpacing || 0) * (globals.DPR || 1); // Extra spacing in pixels
    
    for (let iter = 0; iter < iterations; iter++) {
      for (let k = 0; k < pairs.length; k++) {
        const { i, j } = pairs[k];
        const A = balls[i];
        const B = balls[j];
        
        // Skip pairs where both are sleeping (sleep islands)
        if (A.isSleeping && B.isSleeping) continue;
        // Wake only the sleeping one if colliding with an awake body
        if (A.isSleeping) A.wake();
        if (B.isSleeping) B.wake();
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const rSum = A.r + B.r + spacing; // Add extra spacing to collision radius
        const dist2 = dx * dx + dy * dy;
        if (dist2 === 0 || dist2 > rSum * rSum) continue;
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

        // Velocity impulse
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

          // Spin transfer
          const tvx = rvx - velAlongNormal * nx;
          const tvy = rvy - velAlongNormal * ny;
          const slipMag = Math.hypot(tvx, tvy);
          if (slipMag > 1e-3) {
            const tangentSign = (tvx * -ny + tvy * nx) >= 0 ? 1 : -1;
            const gain = CONSTANTS.SPIN_GAIN_TANGENT;
            A.omega -= tangentSign * gain * slipMag / Math.max(A.r, 1);
            B.omega += tangentSign * gain * slipMag / Math.max(B.r, 1);
          }
          
          // Squash
          const impact = Math.min(1, Math.abs(velAlongNormal) / ((A.r + B.r) * 50));
          const sAmt = Math.min(globals.getSquashMax(), impact * 0.8);
          A.squashAmount = Math.max(A.squashAmount, sAmt * 0.8);
          A.squashNormalAngle = Math.atan2(-ny, -nx);
          B.squashAmount = Math.max(B.squashAmount, sAmt * 0.8);
          B.squashNormalAngle = Math.atan2(ny, nx);
          
          // ════════════════════════════════════════════════════════════════════════
          // SOUND: Play collision sound (threshold handled by sound engine)
          // Only on first iteration to avoid duplicate sounds
          // ════════════════════════════════════════════════════════════════════════
          if (iter === 0) {
            const avgRadius = (A.r + B.r) / 2;
            const midX = (A.x + B.x) / 2;
            const canvasWidth = globals.canvas?.width || 1;
            const xNormalized = midX / canvasWidth;
            // Use combined index as unique ID to debounce
            const collisionId = `${i}-${j}`;
            playCollisionSound(avgRadius, impact, xNormalized, collisionId);
          }
        }
      }
    }
  }

  /**
   * Kaleidoscope-friendly collision resolution:
   * - Avoids large, sudden positional corrections ("popping")
   * - Optionally disables sound/squash/spin side-effects
   * - Caps per-pair correction magnitude to keep motion continuous
   */
  function resolveCollisionsCustom({
    iterations = 4,
    positionalCorrectionPercent = 0.25,
    positionalCorrectionSlopPx = null,
    maxCorrectionPx = null,
    enableSound = true
  } = {}) {
    const globals = getGlobals();
    const balls = globals.balls;
    const pairs = collectPairsSorted();
    const REST = globals.REST;
    const POS_CORRECT_PERCENT = positionalCorrectionPercent;
    const POS_CORRECT_SLOP = (positionalCorrectionSlopPx ?? (0.5 * globals.DPR));
    const REST_VEL_THRESHOLD = 30;
    const spacing = (globals.ballSpacing || 0) * (globals.DPR || 1);
    const correctionCap = (maxCorrectionPx ?? (2.0 * (globals.DPR || 1)));

    for (let iter = 0; iter < iterations; iter++) {
      for (let k = 0; k < pairs.length; k++) {
        const { i, j } = pairs[k];
        const A = balls[i];
        const B = balls[j];

        if (A.isSleeping && B.isSleeping) continue;
        if (A.isSleeping) A.wake();
        if (B.isSleeping) B.wake();

        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const rSum = A.r + B.r + spacing;
        const dist2 = dx * dx + dy * dy;
        if (dist2 === 0 || dist2 > rSum * rSum) continue;

        const dist = Math.sqrt(dist2);
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = rSum - dist;
        const invA = 1 / Math.max(A.m, 0.001);
        const invB = 1 / Math.max(B.m, 0.001);

        // Positional correction (capped to prevent visible pops)
        let correctionMag = POS_CORRECT_PERCENT * Math.max(overlap - POS_CORRECT_SLOP, 0) / (invA + invB);
        if (correctionMag > correctionCap) correctionMag = correctionCap;
        const cx = correctionMag * nx;
        const cy = correctionMag * ny;
        A.x -= cx * invA; A.y -= cy * invA;
        B.x += cx * invB; B.y += cy * invB;

        // Velocity impulse (keeps them from re-overlapping immediately)
        const rvx = B.vx - A.vx;
        const rvy = B.vy - A.vy;
        const velAlongNormal = rvx * nx + rvy * ny;
        if (velAlongNormal < 0) {
          const e = Math.abs(velAlongNormal) < REST_VEL_THRESHOLD ? 0 : REST;
          const jImpulse = -(1 + e) * velAlongNormal / (invA + invB);
          const ix = jImpulse * nx;
          const iy = jImpulse * ny;
          A.vx -= ix * invA; A.vy -= iy * invA;
          B.vx += ix * invB; B.vy += iy * invB;

          // SOUND (optional)
          if (enableSound && iter === 0) {
            const avgRadius = (A.r + B.r) / 2;
            const midX = (A.x + B.x) / 2;
            const canvasWidth = globals.canvas?.width || 1;
            const xNormalized = midX / canvasWidth;
            const impact = Math.min(1, Math.abs(velAlongNormal) / ((A.r + B.r) * 50));
            const collisionId = `${i}-${j}`;
            playCollisionSound(avgRadius, impact, xNormalized, collisionId);
          }
        }
      }
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                        RUBBER WALL VISUAL SYSTEM                            ║
  // ║                                                                              ║
  // ║  Simple elastic wall effect:                                                 ║
  // ║  - Corners are ANCHORED (stuck, no elasticity)                               ║
  // ║  - Straight sections between corners FLEX inward on impact                   ║
  // ║  - Natural spring-back decay                                                 ║
  // ║  - Walls anchored to FULL container width/height                             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // ═══════════════════════════════════════════════════════════════════════════════
  // CONSTANTS
  // ═══════════════════════════════════════════════════════════════════════════════
  const SEGMENTS_PER_WALL = 12;  // Resolution for smooth curves (kept constant for perf)
  const SPRING_STIFFNESS = 400;  // Default spring stiffness
  const SPRING_DAMPING = 18;     // Default spring damping
  const MAX_DEFORM = 30;         // Default max inward flex (px at DPR 1)
  // Bounce flash removed (was previously implemented via CSS var --wall-bounce-intensity)

  // ═══════════════════════════════════════════════════════════════════════════════
  // WALL EDGE - Straight section between two corners
  // Segments near corners (0 and N-1) are pinned, middle segments flex
  // ═══════════════════════════════════════════════════════════════════════════════
  class WallEdge {
    constructor() {
      this.deformations = new Float32Array(SEGMENTS_PER_WALL);
      this.velocities = new Float32Array(SEGMENTS_PER_WALL);
    }
    
    /**
     * Register impact at normalized position (0-1)
     * Corners (0 and 1) don't flex - only middle sections
     */
    impact(normalizedPos, intensity) {
      const g = getGlobals();
      const clamp = Math.max(0, Math.min(0.45, g.wallWobbleCornerClamp ?? 0.1));
      // Clamp position away from corners (keeps corners "stuck")
      const pos = Math.max(clamp, Math.min(1 - clamp, normalizedPos));
      const segmentIdx = pos * (SEGMENTS_PER_WALL - 1);
      const maxDeform = g.wallWobbleMaxDeform ?? MAX_DEFORM;
      const impulse = maxDeform * intensity;
      
      // Gaussian spread with corner falloff
      const sigma = Math.max(0.25, g.wallWobbleSigma ?? 2.0);
      for (let i = 1; i < SEGMENTS_PER_WALL - 1; i++) { // Skip first and last (corners)
        const dist = Math.abs(i - segmentIdx);
        const falloff = Math.exp(-(dist * dist) / (2 * sigma * sigma));
        
        // Additional falloff near corners (segments 0,1 and N-2,N-1)
        const cornerDist = Math.min(i, SEGMENTS_PER_WALL - 1 - i);
        const cornerFalloff = Math.min(1, cornerDist / 2);
        
        this.velocities[i] += impulse * falloff * cornerFalloff;
      }
    }
    
    /**
     * Spring physics update - corners stay pinned at 0
     */
    step(dt) {
      const g = getGlobals();
      const stiffness = Math.max(1, g.wallWobbleStiffness ?? SPRING_STIFFNESS);
      const damping = Math.max(0, g.wallWobbleDamping ?? SPRING_DAMPING);
      const maxDeform = Math.max(0, g.wallWobbleMaxDeform ?? MAX_DEFORM);
      // First and last segments are ANCHORED (no movement)
      this.deformations[0] = 0;
      this.deformations[SEGMENTS_PER_WALL - 1] = 0;
      this.velocities[0] = 0;
      this.velocities[SEGMENTS_PER_WALL - 1] = 0;
      
      for (let i = 1; i < SEGMENTS_PER_WALL - 1; i++) {
        // Damped spring: F = -k*x - c*v
        const force = -stiffness * this.deformations[i] - damping * this.velocities[i];
        this.velocities[i] += force * dt;
        this.deformations[i] += this.velocities[i] * dt;
        
        // Clamp to prevent runaway
        this.deformations[i] = Math.max(0, Math.min(maxDeform, this.deformations[i]));
        
        // Kill tiny values
        if (Math.abs(this.deformations[i]) < 0.05 && Math.abs(this.velocities[i]) < 0.1) {
          this.deformations[i] = 0;
          this.velocities[i] = 0;
        }
      }
    }
    
    /**
     * Get smooth interpolated deformation with Catmull-Rom-like smoothing
     */
    getDeformAt(t) {
      const idx = Math.max(0, Math.min(1, t)) * (SEGMENTS_PER_WALL - 1);
      const lo = Math.floor(idx);
      const hi = Math.min(lo + 1, SEGMENTS_PER_WALL - 1);
      const frac = idx - lo;
      
      // Smooth interpolation
      const smoothT = frac * frac * (3 - 2 * frac); // Smoothstep
      return this.deformations[lo] * (1 - smoothT) + this.deformations[hi] * smoothT;
    }
    
    /**
     * Peak deformation (for optimization)
     */
    getMaxDeformation() {
      let max = 0;
      for (let i = 0; i < SEGMENTS_PER_WALL; i++) {
        if (this.deformations[i] > max) max = this.deformations[i];
      }
      return max;
    }
    
    hasDeformation() {
      return this.getMaxDeformation() > 0.1;
    }
    
    reset() {
      this.deformations.fill(0);
      this.velocities.fill(0);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // WALL STATE SINGLETON
  // ═══════════════════════════════════════════════════════════════════════════════
  const wallState = {
    top: new WallEdge(),
    bottom: new WallEdge(),
    left: new WallEdge(),
    right: new WallEdge(),
    
    /**
     * Update all wall physics
     */
    step(dt) {
      this.top.step(dt);
      this.bottom.step(dt);
      this.left.step(dt);
      this.right.step(dt);
    },
    
    reset() {
      this.top.reset();
      this.bottom.reset();
      this.left.reset();
      this.right.reset();
    },
    
    hasAnyDeformation() {
      return this.top.hasDeformation() ||
             this.bottom.hasDeformation() ||
             this.left.hasDeformation() ||
             this.right.hasDeformation();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // IMPACT REGISTRATION
  // Called from Ball.walls() - corners are ignored, only edges flex
  // ═══════════════════════════════════════════════════════════════════════════════
  function registerWallImpact(wall, normalizedPos, intensity) {
    // Skip corner impacts - corners are stuck
    if (wall.startsWith('corner')) return;
    
    if (wall === 'top') {
      wallState.top.impact(normalizedPos, intensity);
    } else if (wall === 'bottom') {
      wallState.bottom.impact(normalizedPos, intensity);
    } else if (wall === 'left') {
      wallState.left.impact(normalizedPos, intensity);
    } else if (wall === 'right') {
      wallState.right.impact(normalizedPos, intensity);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // WALL RENDERING
  // Draws rubber walls anchored at viewport edges with flexible middles
  // ═══════════════════════════════════════════════════════════════════════════════
  function drawWalls(ctx, w, h) {
    const g = getGlobals();
    
    // Get chrome color
    const chromeColor = getChromeColorFromCSS();
    
    // Wall thickness (visual stroke width)
    const thickness = (g.wallThickness || 12) * (g.DPR || 1);
    
    // Walls always at canvas edges - no special mode offsets
    
    ctx.save();
    ctx.fillStyle = chromeColor;
    
    // ─────────────────────────────────────────────────────────────────────────
    // BOTTOM WALL - Only draw when there's deformation (like other walls)
    // ─────────────────────────────────────────────────────────────────────────
    if (wallState.bottom.hasDeformation()) {
      ctx.beginPath();
      ctx.moveTo(0, h + thickness);
      
      for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
        const t = i / SEGMENTS_PER_WALL;
        const x = t * w;
        const deform = wallState.bottom.getDeformAt(t);
        // Inner edge at h, deform pushes inward
        ctx.lineTo(x, h - deform);
      }
      
      ctx.lineTo(w, h + thickness);
      ctx.closePath();
      ctx.fill();
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // TOP WALL  
    // ─────────────────────────────────────────────────────────────────────────
    if (wallState.top.hasDeformation()) {
      ctx.beginPath();
      
      ctx.moveTo(0, -thickness);
      
      for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
        const t = i / SEGMENTS_PER_WALL;
        const x = t * w;
        const deform = wallState.top.getDeformAt(t);
        // Positive deform = chrome pushes DOWN into canvas
        ctx.lineTo(x, deform);
      }
      
      ctx.lineTo(w, -thickness);
      ctx.closePath();
      ctx.fill();
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // LEFT WALL
    // ─────────────────────────────────────────────────────────────────────────
    if (wallState.left.hasDeformation()) {
      ctx.beginPath();
      
      ctx.moveTo(-thickness, 0);
      
      for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
        const t = i / SEGMENTS_PER_WALL;
        const y = t * h;
        const deform = wallState.left.getDeformAt(t);
        // Positive deform = chrome pushes RIGHT into canvas
        ctx.lineTo(deform, y);
      }
      
      ctx.lineTo(-thickness, h);
      ctx.closePath();
      ctx.fill();
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // RIGHT WALL
    // ─────────────────────────────────────────────────────────────────────────
    if (wallState.right.hasDeformation()) {
      ctx.beginPath();
      
      ctx.moveTo(w + thickness, 0);
      
      for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
        const t = i / SEGMENTS_PER_WALL;
        const y = t * h;
        const deform = wallState.right.getDeformAt(t);
        // Positive deform = chrome pushes LEFT into canvas
        ctx.lineTo(w - deform, y);
      }
      
      ctx.lineTo(w + thickness, h);
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════
  function getChromeColorFromCSS() {
    try {
      const style = getComputedStyle(document.documentElement);
      // Use --wall-color (which equals --frame-color-* which equals --chrome-bg-*)
      return style.getPropertyValue('--wall-color').trim() || '#0a0a0a';
    } catch {
      return '#0a0a0a';  // Must match --frame-color-* in main.css
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                              BALL CLASS (COMPLETE)                           ║
  // ║                   Extracted from balls-source.html lines 1823-2234           ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // Unique ID counter for ball sound debouncing
  let ballIdCounter = 0;

  class Ball {
    constructor(x, y, r, color) {
      const globals = getGlobals();
      this.x = x;
      this.y = y;
      this.vx = (Math.random()*2 - 1) * 200;
      this.vy = -Math.random()*200;
      this.r = r;
      this.rBase = r;
      this.m = globals.ballMassKg;
      this.color = color;
      this.t = 0;
      this.age = 0;
      this.driftAx = 0;
      this.driftTime = 0;
      this.omega = 0;
      this.squash = 1.0;
      this.squashDirX = 1;
      this.squashDirY = 0;
      this.theta = 0;
      this.squashAmount = 0.0;
      this.squashNormalAngle = 0.0;
      this.alpha = 1.0;
      this.isSleeping = false;
      this.sleepTimer = 0;  // Time spent below sleep threshold
      this._soundId = `ball-${ballIdCounter++}`; // Unique ID for sound debouncing
    }

    step(dt, applyForcesFunc) {
      const globals = getGlobals();
      const { currentMode, G, gravityScale, FRICTION, MASS_BASELINE_KG } = globals;
      
      this.t += dt;
      this.age += dt;
      
      // Wake up if sleeping and mouse is nearby (Ball Pit mode only)
      if (this.isSleeping && currentMode === MODES.PIT) {
        const mouseX = globals.mouseX;
        const mouseY = globals.mouseY;
        const wakeRadius = (globals.repelRadius || 710) * globals.DPR * 1.2; // 20% larger than repel radius
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const dist2 = dx * dx + dy * dy;
        
        if (dist2 < wakeRadius * wakeRadius) {
          this.wake();
        }
      }
      
      // Skip all physics if sleeping (Box2D approach)
      if (this.isSleeping) {
        return;
      }

      // Gravity (skip in weightless)
      if (currentMode !== MODES.WEIGHTLESS) {
        this.vy += (G * gravityScale) * dt;
      }
      
      // Drag
      const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
      const dragAmount = (currentMode === MODES.WEIGHTLESS) ? 0.0001 : FRICTION;
      const drag = Math.max(0, 1 - (dragAmount / massScale));
      this.vx *= drag;
      this.vy *= drag;
      
      // Drift
      if (this.driftAx !== 0 && this.age < this.driftTime) {
        this.vx += (this.driftAx * dt) / massScale;
      } else if (this.driftAx !== 0) {
        this.driftAx = 0;
      }
      
      // External forces
      if (applyForcesFunc) applyForcesFunc(this, dt);
      
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      
      // Spin
      const spinDamp = Math.max(0, 1 - CONSTANTS.SPIN_DAMP_PER_S * dt);
      this.omega *= spinDamp;
      this.theta += this.omega * dt;
      
      // Squash decay
      const decay = Math.min(1, CONSTANTS.SQUASH_DECAY_PER_S * dt);
      this.squashAmount += (0 - this.squashAmount) * decay;
      this.squash = 1 - this.squashAmount;
      
      // Sleep detection (Ball Pit mode only, Box2D-style)
      if (currentMode === MODES.PIT) {
        this.updateSleepState(dt, globals);
      }
    }
    
    /**
     * Box2D-inspired sleep detection
     * Only sleeps if grounded AND below velocity threshold for sustained time
     */
    updateSleepState(dt, globals) {
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const angularSpeed = Math.abs(this.omega);
      const canvas = globals.canvas;
      
      // Check if grounded (within 1px of bottom)
      const isGrounded = canvas && (this.y + this.r >= canvas.height - 1);
      
      // Box2D uses 0.05 m/s threshold, we use 5 px/s
      const belowThreshold = speed < CONSTANTS.SLEEP_VELOCITY_THRESHOLD && 
                            angularSpeed < CONSTANTS.SLEEP_ANGULAR_THRESHOLD;
      
      if (isGrounded && belowThreshold) {
        this.sleepTimer += dt;
        
        // Must be below threshold for TIME_TO_SLEEP seconds (stability check)
        if (this.sleepTimer >= CONSTANTS.TIME_TO_SLEEP) {
          this.vx = 0;
          this.vy = 0;
          this.omega = 0;
          this.isSleeping = true;
        }
      } else {
        // Reset timer if ball moves or lifts off ground
        this.sleepTimer = 0;
      }
    }
    
    /**
     * Wake up a sleeping ball (Box2D-style)
     * Called when external forces are about to be applied
     */
    wake() {
      this.isSleeping = false;
      this.sleepTimer = 0;
    }

    walls(w, h, dt, customRest) {
      const globals = getGlobals();
      const { REST, MASS_BASELINE_KG, MASS_REST_EXP, currentMode, DPR } = globals;
      const rest = customRest !== undefined ? customRest : REST;
      
      // Corner radius for rounded corner collision
      const cornerRadiusPx = (typeof globals.getCanvasCornerRadius === 'function')
        ? globals.getCanvasCornerRadius()
        : (globals.cornerRadius ?? globals.wallRadius ?? 42);
      const cr = Math.max(0, cornerRadiusPx) * (DPR || 1);
      
      // Small inset to create a gap between balls and walls (prevents overlap)
      // Positive value = balls stop before the edge
      const borderInset = Math.max(0, (globals.wallInset ?? 3)) * (DPR || 1);
      // If we inset the playable bounds, the corner arc radius must shrink by the same amount
      // so the straight edges and the rounded corners remain perfectly tangent/aligned.
      const cornerArc = Math.max(0, cr - borderInset);
      
      let hasWallCollision = false;
      
      // ════════════════════════════════════════════════════════════════════════
      // CORNER COLLISION: Push balls out of rounded corner zones
      // Check if ball center is within a corner quadrant and too close to arc
      // ════════════════════════════════════════════════════════════════════════
      const corners = [
        { cx: cr, cy: cr },           // Top-left
        { cx: w - cr, cy: cr },       // Top-right
        { cx: cr, cy: h - cr },       // Bottom-left
        { cx: w - cr, cy: h - cr }    // Bottom-right
      ];
      
      for (let i = 0; i < corners.length; i++) {
        // Skip top corners (0, 1) in Ball Pit mode so balls can fall in
        if (currentMode === MODES.PIT && i < 2) continue;
        
        const corner = corners[i];
        // Check if ball is in this corner's quadrant
        const inXZone = (i % 2 === 0) ? (this.x < cr) : (this.x > w - cr);
        const inYZone = (i < 2) ? (this.y < cr) : (this.y > h - cr);
        
        if (inXZone && inYZone) {
          const dx = this.x - corner.cx;
          const dy = this.y - corner.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = cornerArc - this.r; // Ball must stay inside the inset arc
          
          if (dist > minDist && minDist > 0) {
            // Push ball back inside the rounded corner
            hasWallCollision = true;
            const overlap = dist - minDist;
            const nx = dx / dist;
            const ny = dy / dist;
            this.x -= nx * overlap;
            this.y -= ny * overlap;
            
            // Reflect velocity off the arc tangent
            const velDotN = this.vx * nx + this.vy * ny;
            if (velDotN > 0) {
              this.vx -= (1 + rest) * velDotN * nx;
              this.vy -= (1 + rest) * velDotN * ny;
              // Note: Corners are ANCHORED - no rubber wall impact
            }
          }
        }
      }
      
      // Effective boundaries (accounting for inner border)
      // Same for ALL modes - walls never move
      const minX = borderInset;
      const maxX = w - borderInset;
      const minY = borderInset;  // No special viewportTop offset - walls stay fixed
      const maxY = h - borderInset;
      
      // Bottom
      if (this.y + this.r > maxY) {
        hasWallCollision = true;
        this.y = maxY - this.r;
        const preVy = this.vy;
        const slip = this.vx - this.omega * this.r;
        const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
        this.omega += (slip / this.r) * CONSTANTS.SPIN_GAIN / massScale;
        const rollDamp = Math.max(0, 1 - CONSTANTS.ROLL_FRICTION_PER_S * dt / massScale);
        this.vx *= rollDamp;
        const wallRest = Math.abs(preVy) < CONSTANTS.WALL_REST_VEL_THRESHOLD ? 0 : rest;
        this.vy = -this.vy * (wallRest * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
        const impact = Math.min(1, Math.abs(preVy) / (this.r * 90));
        this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
        this.squashNormalAngle = -Math.PI / 2;
        const rollTarget = this.vx / this.r;
        this.omega += (rollTarget - this.omega) * Math.min(1, CONSTANTS.GROUND_COUPLING_PER_S * dt);
        // Sound: floor impact (threshold handled by sound engine)
        playCollisionSound(this.r, impact * 0.7, this.x / w, this._soundId);
        // Rubbery wall wobble
        registerWallImpact('bottom', this.x / w, impact);
      }
      
      // Top (ceiling) - Skip in Ball Pit mode so balls can fall in from above
      if (currentMode !== MODES.PIT && this.y - this.r < minY) {
        hasWallCollision = true;
        this.y = minY + this.r;
        const preVy = this.vy;  // Capture BEFORE reversal for impact calculation
        this.vy = -this.vy * rest;
        const impact = Math.min(1, Math.abs(preVy) / (this.r * 90));
        this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
        this.squashNormalAngle = Math.PI / 2;
        // Sound: ceiling impact (threshold handled by sound engine)
        playCollisionSound(this.r, impact * 0.7, this.x / w, this._soundId);
        // Rubbery wall wobble
        registerWallImpact('top', this.x / w, impact);
      }
      
      // Right
      if (this.x + this.r > maxX) {
        hasWallCollision = true;
        this.x = maxX - this.r;
        const preVx = this.vx;
        const slip = this.vy - this.omega * this.r;
        const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
        this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
        this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
        const impact = Math.min(1, Math.abs(preVx)/(this.r*70));
        this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
        this.squashNormalAngle = Math.PI;
        // Sound: right wall impact (threshold handled by sound engine)
        playCollisionSound(this.r, impact * 0.6, 1.0, this._soundId);
        // Rubbery wall wobble
        registerWallImpact('right', this.y / h, impact);
      }
      
      // Left
      if (this.x - this.r < minX) {
        hasWallCollision = true;
        this.x = minX + this.r;
        const preVx = this.vx;
        const slip = this.vy - this.omega * this.r;
        const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
        this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
        this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
        const impact = Math.min(1, Math.abs(preVx)/(this.r*70));
        this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
        this.squashNormalAngle = 0;
        // Sound: left wall impact (threshold handled by sound engine)
        playCollisionSound(this.r, impact * 0.6, 0.0, this._soundId);
        // Rubbery wall wobble
        registerWallImpact('left', this.y / h, impact);
      }
      
      // Wake on wall collision (prevents sleeping balls from getting stuck in walls)
      if (hasWallCollision && this.isSleeping) {
        this.wake();
      }
    }

    draw(ctx) {
      // ══════════════════════════════════════════════════════════════════════════════
      // PERFORMANCE: Optimized draw with minimal state changes
      // - Skip save/restore when possible (expensive operations)
      // - Batch similar operations
      // - Only use transforms when necessary
      // ══════════════════════════════════════════════════════════════════════════════
      
      const hasSquash = this.squashAmount > 0.001;
      const hasAlpha = this.alpha < 1.0;
      
      // Only use save/restore when we have transforms that need cleanup
      if (hasSquash || hasAlpha) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (hasSquash) {
          ctx.rotate(this.theta + this.squashNormalAngle);
          const squashX = 1 - this.squashAmount * 0.3;
          const squashY = 1 + this.squashAmount * 0.3;
          ctx.scale(squashX, squashY);
          ctx.rotate(-this.squashNormalAngle);
        } else {
          ctx.rotate(this.theta);
        }
        
        if (hasAlpha) {
          ctx.globalAlpha = this.alpha;
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        ctx.restore();
      } else {
        // Fast path: no squash, no alpha - draw directly without save/restore
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            WATER/SWIMMING MODE                               ║
  // ║           Balls swim through water with gorgeous ripple effects             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // Ripple system
  const ripples = [];

  function initializeWater() {
    const globals = getGlobals();
    clearBalls();
    ripples.length = 0;
    
    const canvas = globals.canvas;
    if (!canvas) return;
    
    const w = canvas.width;
    const h = canvas.height;
    const count = globals.waterBallCount || 100;
    
    // First, ensure at least one ball of each color (0-7)
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = globals.R_MIN + Math.random() * (globals.R_MAX - globals.R_MIN);
      const color = getColorByIndex(colorIndex);
      const ball = new Ball(x, y, size, color);
      
      // Random initial velocities (snowglobe-style movement)
      const v0 = globals.waterInitialVelocity || 120;
      ball.vx = (Math.random() - 0.5) * v0;
      ball.vy = (Math.random() - 0.5) * v0;
      
      globals.balls.push(ball);
    }
    
    // Then fill the rest with random colors
    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = globals.R_MIN + Math.random() * (globals.R_MAX - globals.R_MIN);
      const color = pickRandomColor();
      const ball = new Ball(x, y, size, color);
      
      // Random initial velocities (snowglobe-style movement)
      const v0 = globals.waterInitialVelocity || 120;
      ball.vx = (Math.random() - 0.5) * v0;
      ball.vy = (Math.random() - 0.5) * v0;
      
      globals.balls.push(ball);
    }
  }

  function applyWaterForces(ball, dt) {
    const globals = getGlobals();
    
    // Strong water resistance (damping)
    const waterDrag = globals.waterDrag || 0.015;
    ball.vx *= (1 - waterDrag);
    ball.vy *= (1 - waterDrag);
    ball.omega *= (1 - waterDrag * 0.5);
    
    // Apply ripple forces
    for (let i = 0; i < ripples.length; i++) {
      const ripple = ripples[i];
      const dx = ball.x - ripple.x;
      const dy = ball.y - ripple.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Ripple affects balls in expanding ring
      const rippleThickness = 40;
      const innerRadius = ripple.radius - rippleThickness;
      const outerRadius = ripple.radius + rippleThickness;
      
      if (dist > innerRadius && dist < outerRadius) {
        // Calculate force based on distance from ripple edge
        const distFromEdge = Math.abs(dist - ripple.radius);
        const forceMag = ripple.strength * (1 - distFromEdge / rippleThickness);
        
        if (dist > 0.1) {
          const nx = dx / dist;
          const ny = dy / dist;
          ball.vx += nx * forceMag * dt;
          ball.vy += ny * forceMag * dt;
        }
      }
    }
    
    // Gentle ambient drift (like currents)
    const driftStrength = globals.waterDriftStrength || 25;
    ball.vx += Math.sin(ball.t * 0.5 + ball.x * 0.01) * driftStrength * dt;
    ball.vy += Math.cos(ball.t * 0.7 + ball.y * 0.01) * driftStrength * dt;
  }

  function updateWaterRipples(dt) {
    const globals = getGlobals();
    const rippleSpeed = globals.waterRippleSpeed || 300;
    
    // Update existing ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const ripple = ripples[i];
      ripple.radius += rippleSpeed * dt;
      ripple.age += dt;
      ripple.strength *= 0.96; // Decay
      
      // Remove old/weak ripples
      if (ripple.age > 3.0 || ripple.strength < 10) {
        ripples.splice(i, 1);
      }
    }
  }

  /**
   * Create a water ripple at the given position
   * @param {number} x - X position
   * @param {number} y - Y position  
   * @param {number} [velocityFactor=1] - Multiplier for ripple strength (based on mouse velocity)
   */
  function createWaterRipple(x, y, velocityFactor = 1) {
    const globals = getGlobals();
    const baseStrength = globals.waterRippleStrength || 15000;
    
    // Scale strength based on velocity factor
    const strength = baseStrength * Math.min(velocityFactor, 5);
    
    ripples.push({
      x,
      y,
      radius: 0,
      strength,
      age: 0
    });
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                              BALL SPAWNING                                   ║
  // ║              Extracted from balls-source.html lines 2249-2284                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function clamp$2(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawnBall(x, y, color) {
    if (!color) color = pickRandomColor();
    const globals = getGlobals();
    const baseSize = (globals.R_MIN + globals.R_MAX) / 2;
    
    let r;
    if (globals.sizeVariation === 0) {
      r = baseSize;
    } else {
      const maxVariation = baseSize * 0.1;
      const minR = Math.max(1, baseSize - maxVariation);
      const maxR = baseSize + maxVariation;
      r = randBetween(minR, maxR);
    }
    
    const ball = new Ball(x, y, r, color);
    
    const centerX = globals.canvas.width * 0.5;
    const dir = (x < centerX) ? 1 : -1;
    const sizeInfluence = clamp$2((r / ((globals.R_MIN + globals.R_MAX) * 0.5)), 0.6, 1.4);
    const baseKick = 140 * sizeInfluence;
    const randKick = 180 * sizeInfluence;
    const upwardKick = 120;
    ball.vx = dir * (baseKick + Math.random() * randKick);
    ball.vy = -Math.random() * upwardKick;
    ball.driftAx = dir * (360 + Math.random() * 420) * sizeInfluence;
    ball.driftTime = 0.22 + Math.random() * 0.28;
    
    globals.balls.push(ball);
    return ball;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                                FLIES MODE                                    ║
  // ║            Extracted from balls-source.html lines 3521-3551                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeFlies() {
    const globals = getGlobals();
    clearBalls();
    
    const targetBalls = 60;
    const w = globals.canvas.width;
    const h = globals.canvas.height;
    const centerX = w * 0.5;
    const centerY = h * 0.5;
    const swarmRadius = 150 * globals.DPR;
    
    // First, ensure at least one ball of each color (0-7)
    for (let colorIndex = 0; colorIndex < 8; colorIndex++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * swarmRadius;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      const ball = spawnBall(x, y, getColorByIndex(colorIndex));
      
      const speedVariation = 0.5 + Math.random() * 0.5;
      const vAngle = Math.random() * Math.PI * 2;
      const speed = 300 * speedVariation;
      ball.vx = Math.cos(vAngle) * speed;
      ball.vy = Math.sin(vAngle) * speed;
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
    
    // Then fill the rest with random colors
    for (let i = 8; i < targetBalls; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * swarmRadius;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      const ball = spawnBall(x, y);
      
      const speedVariation = 0.5 + Math.random() * 0.5;
      const vAngle = Math.random() * Math.PI * 2;
      const speed = 300 * speedVariation;
      ball.vx = Math.cos(vAngle) * speed;
      ball.vy = Math.sin(vAngle) * speed;
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
  }

  function applyFliesForces(ball, dt) {
    const globals = getGlobals();
    const attractionPower = 5000;
    const swarmSpeed = 0.4;
    
    const swarmCenterX = (globals.mouseX === -1e9) ? globals.canvas.width * 0.5 : globals.mouseX;
    const swarmCenterY = (globals.mouseY === -1e9) ? globals.canvas.height * 0.5 : globals.mouseY;
    
    const dx = swarmCenterX - ball.x;
    const dy = swarmCenterY - ball.y;
    const d = Math.sqrt(dx*dx + dy*dy + 1);
    
    const dirX = dx / d;
    const dirY = dy / d;
    
    const attractForce = attractionPower * swarmSpeed * 2.0;
    ball.vx += dirX * attractForce * dt;
    ball.vy += dirY * attractForce * dt;
    
    // Separation
    const separationRadius = 120 * globals.DPR;
    let sepX = 0, sepY = 0, neighborCount = 0;
    for (let i = 0; i < globals.balls.length; i++) {
      const other = globals.balls[i];
      if (other === ball) continue;
      const dx2 = ball.x - other.x;
      const dy2 = ball.y - other.y;
      const d2 = dx2*dx2 + dy2*dy2;
      if (d2 < separationRadius * separationRadius && d2 > 0) {
        const d_other = Math.sqrt(d2);
        const strength = 1 - (d_other / separationRadius);
        sepX += (dx2 / d_other) * strength;
        sepY += (dy2 / d_other) * strength;
        neighborCount++;
      }
    }
    if (neighborCount > 0) {
      const separationForce = 15000;
      ball.vx += (sepX / neighborCount) * separationForce * dt;
      ball.vy += (sepY / neighborCount) * separationForce * dt;
    }
    
    // Jitter
    const jitterBase = 2500 * swarmSpeed;
    ball.vx += (Math.random() - 0.5) * jitterBase * dt;
    ball.vy += (Math.random() - 0.5) * jitterBase * dt;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                              BALL PIT MODE                                   ║
  // ║            Extracted from balls-source.html lines 3489-3518                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeBallPit() {
    const globals = getGlobals();
    clearBalls();
    
    const targetBalls = 300; // MAX_BALLS
    const w = globals.canvas.width;
    const h = globals.canvas.height;
    const DPR = globals.DPR;
    
    // Spawn balls ABOVE the canvas (negative Y coordinates)
    // They will fall into the visible area via gravity
    // This is "negative spacing" - spawn area extends above y=0
    const spawnHeight = h * 0.5;  // Spawn within 50% of canvas height above canvas
    const spawnYTop = -spawnHeight;
    const spawnYBottom = 0;
    
    // Spawn across full width (with padding for wall thickness)
    const padding = (globals.wallThickness || 20) * DPR;
    const spawnXLeft = padding;
    const spawnXRight = w - padding;
    
    // First, ensure at least one ball of each color (0-7)
    for (let colorIndex = 0; colorIndex < 8; colorIndex++) {
      const x = spawnXLeft + Math.random() * (spawnXRight - spawnXLeft);
      const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);
      
      const ball = spawnBall(x, y, getColorByIndex(colorIndex));
      // Small downward velocity and random horizontal drift
      ball.vx = (Math.random() - 0.5) * 100;
      ball.vy = Math.random() * 50 + 50;  // Initial downward velocity
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
    
    // Then fill the rest with random colors
    for (let i = 8; i < targetBalls; i++) {
      const x = spawnXLeft + Math.random() * (spawnXRight - spawnXLeft);
      const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);
      
      const ball = spawnBall(x, y);
      // Small downward velocity and random horizontal drift
      ball.vx = (Math.random() - 0.5) * 100;
      ball.vy = Math.random() * 50 + 50;  // Initial downward velocity
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
  }

  function applyBallPitForces(ball, dt) {
    const globals = getGlobals();
    const repelPower = globals.repelPower;
    const repelRadius = globals.repelRadius;
    const mouseX = globals.mouseX;
    const mouseY = globals.mouseY;
    
    if (!globals.repellerEnabled || repelPower <= 0 || repelRadius <= 0) return;
    
    const rPx = repelRadius * globals.DPR;
    const dx = ball.x - mouseX;
    const dy = ball.y - mouseY;
    const d2 = dx*dx + dy*dy;
    const r2 = rPx * rPx;
    if (d2 > r2) return;
    
    const d = Math.max(Math.sqrt(d2), 1e-4);
    const nx = dx / d;
    const ny = dy / d;
    const q = Math.max(0, 1 - d / rPx);
    const strength = (repelPower * 20.0) * Math.pow(q, globals.repelSoft || 3.4);
    const massScale = Math.max(0.25, ball.m / globals.MASS_BASELINE_KG);
    ball.vx += (nx * strength * dt) / massScale;
    ball.vy += (ny * strength * dt) / massScale;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            WEIGHTLESS MODE                                   ║
  // ║            Extracted from balls-source.html lines 3559-3585                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeWeightless() {
    const globals = getGlobals();
    clearBalls();
    
    const targetBalls = globals.weightlessCount;
    const w = globals.canvas.width;
    const h = globals.canvas.height;
    const margin = 40 * globals.DPR;
    
    // First, ensure at least one ball of each color (0-7)
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < targetBalls; colorIndex++) {
      const x = margin + Math.random() * (w - 2 * margin);
      const y = margin + Math.random() * (h - 2 * margin);
      
      const ball = spawnBall(x, y, getColorByIndex(colorIndex));
      
      const angle = Math.random() * Math.PI * 2;
      const speed = globals.weightlessInitialSpeed * (0.7 + Math.random() * 0.3);
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
    
    // Then fill the rest with random colors
    for (let i = 8; i < targetBalls; i++) {
      const x = margin + Math.random() * (w - 2 * margin);
      const y = margin + Math.random() * (h - 2 * margin);
      
      const ball = spawnBall(x, y);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = globals.weightlessInitialSpeed * (0.7 + Math.random() * 0.3);
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                           RENDERING EFFECTS                                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function applyCanvasShadow(canvas) {
    const g = getGlobals();
    const enabled = g.canvasShadowEnabled || false;
    if (!enabled) {
      canvas.style.filter = '';
      return;
    }
    const x = g.shadowOffsetX || 1;
    const y = g.shadowOffsetY || 1;
    const blur = g.shadowBlur || 0;
    const color = g.shadowColor || '#000000';
    const op = g.shadowOpacity || 0.29;
    const second = g.shadow2Enabled ? ` drop-shadow(0 0 ${g.shadow2Blur||4}px rgba(0,0,0,${g.shadow2Opacity||0.10}))` : '';
    canvas.style.filter = `drop-shadow(${x}px ${y}px ${blur}px ${hexToRgba(color, op)})${second}`;
  }

  function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                          RENDERER (OPTIMIZED)                               ║
  // ║                 Canvas setup, resize, and rendering                          ║
  // ║      Electron-grade performance optimizations for all browsers               ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let canvas, ctx;

  // ════════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE: Adaptive DPR based on device capability
  // High-end: full DPR, Low-end: reduced for smooth 60fps
  // ════════════════════════════════════════════════════════════════════════════════
  let effectiveDPR = CONSTANTS.DPR;

  function detectOptimalDPR() {
    const baseDPR = window.devicePixelRatio || 1;
    
    // Check for low-power hints
    const isLowPower = navigator.connection?.saveData || 
                       navigator.hardwareConcurrency <= 4 ||
                       /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Cap DPR more aggressively on mobile/low-power devices
    if (isLowPower && baseDPR > 1.5) {
      effectiveDPR = 1.5;
      console.log('⚡ Adaptive DPR: Reduced to 1.5x for performance');
    } else {
      effectiveDPR = Math.min(baseDPR, 2);
    }
    
    // Sync with global state so all modules use the same DPR
    setEffectiveDPR(effectiveDPR);
    
    return effectiveDPR;
  }

  function setupRenderer() {
    canvas = document.getElementById('c');
    
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }
    
    // ══════════════════════════════════════════════════════════════════════════════
    // PERFORMANCE: Optimized canvas context flags (Electron-grade)
    // 
    // alpha: true         → Canvas is transparent (required for page background)
    // desynchronized: true → Low-latency rendering, bypasses compositor (Chrome/Edge)
    // willReadFrequently: false → GPU can optimize for write-only operations
    // ══════════════════════════════════════════════════════════════════════════════
    ctx = canvas.getContext('2d', {
      alpha: true,               // Keep transparency for page background
      desynchronized: true,      // Bypass compositor for lower latency
      willReadFrequently: false  // We never read pixels back
    });
    
    if (!ctx) {
      // Fallback for browsers that don't support all options
      ctx = canvas.getContext('2d');
      console.warn('⚠️ Desynchronized mode unavailable, using standard context');
    }
    
    // Detect optimal DPR for this device
    detectOptimalDPR();
    
    // ══════════════════════════════════════════════════════════════════════════════
    // PERFORMANCE: Disable image smoothing for crisp, fast circle rendering
    // Circles are mathematically perfect, no interpolation needed
    // ══════════════════════════════════════════════════════════════════════════════
    ctx.imageSmoothingEnabled = false;
    
    // NOTE: Don't call resize() here - globals.container may not be set yet
    // main.js will call resize() after setCanvas() to ensure container is available
    window.addEventListener('resize', resize);
    
    console.log(`✓ Renderer optimized (DPR: ${effectiveDPR.toFixed(2)}, desync: ${ctx.getContextAttributes?.()?.desynchronized ?? 'unknown'})`);
  }

  /**
   * Resize canvas to match container dimensions minus wall thickness.
   * 
   * The rubber wall system uses wall thickness as the inset for the canvas.
   * CSS handles positioning (top/left/right/bottom = wallThickness)
   * JS handles buffer dimensions for high-DPI rendering.
   */
  function resize() {
    if (!canvas) return;
    
    const globals = getGlobals();
    
    // Use container dimensions if available, fallback to window for safety
    const container = globals.container || document.getElementById('bravia-balls');
    const containerWidth = container ? container.clientWidth : window.innerWidth;
    const containerHeight = container ? container.clientHeight : window.innerHeight;
    
    // Canvas fills the container completely (rubber walls are drawn at the edges)
    // We removed the layout inset to fix the "double wall" visual issue
    const canvasWidth = containerWidth;
    const canvasHeight = containerHeight;
    
    // Canvas fills container - CSS handles mode-specific heights
    // Ball Pit: CSS sets 150vh, Other modes: CSS sets 100%
    const simHeight = canvasHeight;
    
    // Use adaptive DPR for performance (may be lower than device DPR on weak hardware)
    const DPR = effectiveDPR;
    
    // Set canvas buffer size (high-DPI)
    canvas.width = Math.floor(canvasWidth * DPR);
    canvas.height = Math.floor(simHeight * DPR);
    
    // Let CSS handle display sizing via var(--wall-thickness)
    // But set explicit values for consistency in non-CSS environments
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = simHeight + 'px';
    
    // Re-apply context optimizations after resize (some browsers reset them)
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
    }
    
    applyCanvasShadow(canvas);
  }

  function getCanvas() {
    return canvas;
  }

  function getContext() {
    return ctx;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                             VORTEX SHEETS MODE                               ║
  // ║      Invisible swirl field anchored to cursor; spirals + radial pull         ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  const FAR_FALLOFF = 0.0015;    // reduces effect with distance

  function initializeVortex() {
    const g = getGlobals();
    clearBalls();
    const canvas = g.canvas;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const count = Math.min(g.vortexBallCount || 180, g.maxBalls || 300);

    // Ensure at least one of each color
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const c = getColorByIndex(colorIndex);
      const b = new Ball(x, y, r, c);
      b.vx = (Math.random() - 0.5) * 80;
      b.vy = (Math.random() - 0.5) * 80;
      g.balls.push(b);
    }

    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const c = pickRandomColor();
      const b = new Ball(x, y, r, c);
      b.vx = (Math.random() - 0.5) * 80;
      b.vy = (Math.random() - 0.5) * 80;
      g.balls.push(b);
    }
  }

  function applyVortexForces(ball, dt) {
    const g = getGlobals();
    if (g.currentMode !== MODES.VORTEX) return;

    const mx = g.mouseX;
    const my = g.mouseY;
    if (!g.mouseInCanvas) return;

    const swirlStrength = g.vortexSwirlStrength || 420;
    const radialPull = g.vortexRadialPull || 180;

    const dx = ball.x - mx;
    const dy = ball.y - my;
    const dist2 = dx * dx + dy * dy;
    const dist = Math.max(8, Math.sqrt(dist2));
    const inv = 1 / (1 + dist * FAR_FALLOFF);

    // Tangential swirl (perp to radial)
    const nx = dx / dist;
    const ny = dy / dist;
    const tx = -ny;
    const ty = nx;
    const swirl = swirlStrength * inv;
    ball.vx += tx * swirl * dt;
    ball.vy += ty * swirl * dt;

    // Mild inward pull
    const pull = radialPull * inv;
    ball.vx -= nx * pull * dt;
    ball.vy -= ny * pull * dt;
    
    // Gentle drag to prevent runaway speeds
    ball.vx *= 0.995;
    ball.vy *= 0.995;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            PING PONG MODE                                    ║
  // ║     Balls bounce left-right continuously; ONLY cursor disrupts their path    ║
  // ║                    No drag, no friction, pure momentum                       ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializePingPong() {
    const g = getGlobals();
    clearBalls();
    const canvas = g.canvas;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const count = Math.min(g.pingPongBallCount || 80, g.maxBalls || 300);
    const baseSpeed = g.pingPongSpeed || 400;

    // Ensure at least one of each color
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = h * 0.15 + Math.random() * h * 0.7; // Middle 70% vertically
      const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const c = getColorByIndex(colorIndex);
      const b = new Ball(x, y, r, c);
      // Pure horizontal velocity - no vertical component
      const dir = Math.random() > 0.5 ? 1 : -1;
      b.vx = dir * (baseSpeed * 0.8 + Math.random() * baseSpeed * 0.4);
      b.vy = 0; // Start with zero vertical
      b.isPingPong = true; // Mark for special handling
      g.balls.push(b);
    }

    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = h * 0.15 + Math.random() * h * 0.7;
      const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const c = pickRandomColor();
      const b = new Ball(x, y, r, c);
      const dir = Math.random() > 0.5 ? 1 : -1;
      b.vx = dir * (baseSpeed * 0.8 + Math.random() * baseSpeed * 0.4);
      b.vy = 0;
      b.isPingPong = true;
      g.balls.push(b);
    }
  }

  function applyPingPongForces(ball, dt) {
    const g = getGlobals();
    if (g.currentMode !== MODES.PING_PONG) return;
    if (!ball.isPingPong) return;

    // ═══════════════════════════════════════════════════════════════════════════
    // CURSOR COLLISION - The ONLY thing that disrupts ball movement
    // ═══════════════════════════════════════════════════════════════════════════
    if (g.mouseInCanvas) {
      const cursorRadius = (g.pingPongCursorRadius || 100) * g.DPR;
      const mx = g.mouseX;
      const my = g.mouseY;
      const dx = ball.x - mx;
      const dy = ball.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = cursorRadius + ball.r;
      
      if (dist < minDist && dist > 0.1) {
        // Push ball out of cursor
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x += nx * overlap * 1.1; // Push out with small buffer
        ball.y += ny * overlap * 1.1;
        
        // Reflect velocity perfectly (elastic collision)
        const velDotN = ball.vx * nx + ball.vy * ny;
        if (velDotN < 0) {
          ball.vx -= 2 * velDotN * nx;
          ball.vy -= 2 * velDotN * ny;
          // Add some spin for visual flair
          ball.omega += velDotN * 0.02;
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAINTAIN HORIZONTAL ENERGY - Restore any lost horizontal speed
    // ═══════════════════════════════════════════════════════════════════════════
    const targetSpeed = g.pingPongSpeed || 400;
    const currentHSpeed = Math.abs(ball.vx);
    
    // If horizontal speed drops below target, restore it
    if (currentHSpeed < targetSpeed * 0.9) {
      const dir = ball.vx >= 0 ? 1 : -1;
      ball.vx = dir * targetSpeed;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DAMPEN VERTICAL DRIFT - Gently return to horizontal motion
    // ═══════════════════════════════════════════════════════════════════════════
    // Very slowly reduce vertical velocity to return to pure horizontal motion
    ball.vy *= 0.995;
    
    // NO OTHER DRAG - balls maintain momentum perfectly
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            MAGNETIC MODE                                     ║
  // ║    Cursor creates POWERFUL magnetic field - balls are violently attracted    ║
  // ║    or repelled based on their "charge". Auto-explosion every 10s.            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeMagnetic() {
    const g = getGlobals();
    clearBalls();
    const canvas = g.canvas;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const count = Math.min(g.magneticBallCount || 180, g.maxBalls || 300);

    // Ensure at least one of each color
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const c = getColorByIndex(colorIndex);
      const b = new Ball(x, y, r, c);
      b.vx = (Math.random() - 0.5) * 100;
      b.vy = (Math.random() - 0.5) * 100;
      // Assign magnetic charge: positive (attracted) or negative (repelled)
      b.charge = Math.random() > 0.5 ? 1 : -1;
      b.baseAlpha = 1;
      g.balls.push(b);
    }

    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const c = pickRandomColor();
      const b = new Ball(x, y, r, c);
      b.vx = (Math.random() - 0.5) * 100;
      b.vy = (Math.random() - 0.5) * 100;
      b.charge = Math.random() > 0.5 ? 1 : -1;
      b.baseAlpha = 1;
      g.balls.push(b);
    }
  }

  function applyMagneticForces(ball, dt) {
    const g = getGlobals();
    if (g.currentMode !== MODES.MAGNETIC) return;
    if (!g.mouseInCanvas) return;

    const mx = g.mouseX;
    const my = g.mouseY;
    const dx = mx - ball.x;
    const dy = my - ball.y;
    const dist = Math.max(30, Math.sqrt(dx * dx + dy * dy));
    
    // EXAGGERATED magnetic force - inverse square law with high multiplier
    const magneticStrength = g.magneticStrength || 65000;
    
    // Force magnitude: strong inverse-square attraction/repulsion
    const forceMag = magneticStrength / (dist * dist) * 1000;
    
    // Normalize direction
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Apply force based on charge (positive = attracted, negative = repelled)
    const charge = ball.charge || 1;
    ball.vx += nx * forceMag * charge * dt;
    ball.vy += ny * forceMag * charge * dt;
    
    // Velocity cap to prevent explosion
    const maxVel = g.magneticMaxVelocity || 2800;
    const vel = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (vel > maxVel) {
      ball.vx = (ball.vx / vel) * maxVel;
      ball.vy = (ball.vy / vel) * maxVel;
    }
    
    // Very light drag to prevent chaos (but keep it snappy)
    ball.vx *= 0.998;
    ball.vy *= 0.998;
  }

  /**
   * Update magnetic mode per-frame
   */
  function updateMagnetic(dt) {
    const g = getGlobals();
    if (g.currentMode !== MODES.MAGNETIC) return;

    // Explosions & countdown flashing have been disabled.
    // Keep alpha stable to preserve clean look.
    for (let i = 0; i < g.balls.length; i++) {
      g.balls[i].alpha = 1;
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                         CARBONATED BUBBLES MODE                              ║
  // ║    Bubbles rise from bottom with wobble, dissipate at top, then recycle      ║
  // ║    Scale up from 0 on spawn, scale down to 0 on dissipate                    ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeBubbles() {
    const g = getGlobals();
    // Clear existing balls
    g.balls.length = 0;
    
    const canvas = g.canvas;
    if (!canvas) return;
    
    const w = canvas.width;
    const h = canvas.height;
    const count = g.bubblesMaxCount || 200; // Increased for continuous coverage
    
    // Spawn bubbles distributed across entire screen height for continuous flow
    // First ensure one of each color
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = Math.random() * h; // Full screen height
      createBubble(x, y, getColorByIndex(colorIndex), true); // Already scaled in
    }
    
    // Fill rest with random colors across full height
    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h; // Full screen height
      createBubble(x, y, pickRandomColor(), true); // Already scaled in
    }
  }

  /**
   * Create a bubble ball at position (x, y) with given color
   * @param {boolean} alreadyVisible - If true, skip spawn animation (for initial setup)
   */
  function createBubble(x, y, color, alreadyVisible = false) {
    const g = getGlobals();
    
    // Variable bubble sizes
    const minR = g.R_MIN * 0.5;
    const maxR = g.R_MAX * 0.8;
    const targetRadius = minR + Math.random() * (maxR - minR);
    
    const b = new Ball(x, y, alreadyVisible ? targetRadius : 0.1, color);
    b.isBubble = true;
    b.baseRadius = targetRadius;
    b.targetRadius = targetRadius;
    b.wobblePhase = Math.random() * Math.PI * 2;
    b.wobbleFreq = 2 + Math.random() * 3;
    b.vx = (Math.random() - 0.5) * 20;
    b.vy = -50 - Math.random() * 50;
    
    // Animation states
    b.spawning = !alreadyVisible;
    b.spawnProgress = alreadyVisible ? 1 : 0;
    b.dissipating = false;
    b.dissipateProgress = 0;
    b.alpha = 1;
    
    g.balls.push(b);
    return b;
  }

  /**
   * Recycle a bubble - reset it to the bottom with new properties
   */
  function recycleBubble(ball) {
    const g = getGlobals();
    const canvas = g.canvas;
    if (!canvas) return;
    
    const w = canvas.width;
    const h = canvas.height;
    
    // New random x position at bottom
    ball.x = Math.random() * w;
    // Spawn 60-90px below screen so scale-in completes as bubble enters view
    // (bubbles rise ~50px during 0.33s spawn animation)
    ball.y = h + 60 + Math.random() * 30;
    
    // Reset velocity
    ball.vx = (Math.random() - 0.5) * 20;
    ball.vy = -50 - Math.random() * 50;
    
    // New wobble phase
    ball.wobblePhase = Math.random() * Math.PI * 2;
    ball.wobbleFreq = 2 + Math.random() * 3;
    
    // New random color from full palette
    ball.c = pickRandomColor();
    
    // New target size
    const minR = g.R_MIN * 0.5;
    const maxR = g.R_MAX * 0.8;
    ball.targetRadius = minR + Math.random() * (maxR - minR);
    ball.baseRadius = ball.targetRadius;
    
    // Start spawn animation (scale up from 0 to full size)
    ball.r = 0.1;
    ball.rBase = 0.1;
    ball.spawning = true;
    ball.spawnProgress = 0;
    ball.dissipating = false;
    ball.dissipateProgress = 0;
    ball.alpha = 1;
  }

  function applyBubblesForces(ball, dt) {
    const g = getGlobals();
    if (g.currentMode !== MODES.BUBBLES) return;
    if (!ball.isBubble) return;
    
    const canvas = g.canvas;
    if (!canvas) return;
    
    // Handle spawn animation (scale up from 0)
    if (ball.spawning) {
      ball.spawnProgress += dt * 3; // Scale up over ~0.33s
      
      // Ease out for smooth appearance
      const ease = 1 - Math.pow(1 - Math.min(1, ball.spawnProgress), 3);
      ball.r = ball.targetRadius * ease;
      ball.rBase = ball.r;
      
      if (ball.spawnProgress >= 1) {
        ball.spawning = false;
        ball.r = ball.targetRadius;
        ball.rBase = ball.targetRadius;
      }
    }
    
    // Handle dissipation animation (scale down to 0)
    if (ball.dissipating) {
      ball.dissipateProgress += dt * 3; // Scale down over ~0.33s
      
      // Ease in for smooth disappearance
      const ease = Math.pow(ball.dissipateProgress, 2);
      ball.r = ball.targetRadius * Math.max(0, 1 - ease);
      ball.rBase = ball.r;
      ball.alpha = Math.max(0, 1 - ease * 0.5); // Slight fade
      
      // Slow down during dissipation
      ball.vy *= 0.92;
      ball.vx *= 0.92;
      
      // When fully dissipated, recycle
      if (ball.dissipateProgress >= 1) {
        recycleBubble(ball);
      }
      return;
    }
    
    const riseSpeed = g.bubblesRiseSpeed || 150;
    const wobbleStrength = (g.bubblesWobble || 40) * 0.01;
    
    // Buoyancy force (rise upward)
    const buoyancy = riseSpeed * g.DPR;
    ball.vy -= buoyancy * dt;
    
    // Wobble (side-to-side oscillation)
    ball.wobblePhase += ball.wobbleFreq * dt;
    const wobble = Math.sin(ball.wobblePhase) * wobbleStrength * 100;
    ball.vx += wobble * dt;
    
    // Horizontal drag
    ball.vx *= 0.92;
    
    // Vertical drag
    ball.vy *= 0.96;
    
    // Cursor collision force (powerful solid-object push)
    if (g.mouseInCanvas) {
      const dx = ball.x - g.mouseX;
      const dy = ball.y - g.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const collisionRadius = (g.bubblesDeflectRadius || 200) * g.DPR;
      
      if (dist < collisionRadius && dist > 1) {
        // Cubic falloff for very strong close-range collision feel
        const normalizedDist = dist / collisionRadius;
        const falloff = Math.pow(1 - normalizedDist, 3);
        
        // Much stronger base force for solid collision feel
        const baseForce = 3000;
        const force = falloff * baseForce;
        
        // Direction away from cursor
        const nx = dx / dist;
        const ny = dy / dist;
        
        // Apply strong repulsion
        ball.vx += nx * force * dt;
        ball.vy += ny * force * dt;
        
        // Add extra "impact" velocity when very close (collision feel)
        if (dist < collisionRadius * 0.3) {
          const impactBoost = (1 - dist / (collisionRadius * 0.3)) * 500;
          ball.vx += nx * impactBoost * dt;
          ball.vy += ny * impactBoost * dt;
        }
      }
    }
    
    // Check if bubble reached very top - start dissipating
    const topThreshold = ball.targetRadius * 2; // Very close to top edge
    
    if (ball.y < topThreshold && !ball.dissipating && !ball.spawning) {
      ball.dissipating = true;
      ball.dissipateProgress = 0;
    }
    
    // Safety: recycle if bubble goes off sides
    if (ball.x < -ball.r * 4 || ball.x > canvas.width + ball.r * 4) {
      recycleBubble(ball);
    }
  }

  function updateBubbles(dt) {
    // Bubbles recycle automatically via applyBubblesForces
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                           KALEIDOSCOPE MODE (NEW)                            ║
  // ║    Center-anchored mirrored wedges; mouse-reactive rotation; circle style     ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  const TAU$1 = Math.PI * 2;
  const EPS = 1e-6;

  // Render-time smoothing state (mouse-driven mapping should ease-in/out)
  let _lastRenderMs = 0;

  function clamp$1(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function getLensCenter(g) {
    const canvas = g.canvas;
    // IMPORTANT: The kaleidoscope origin is always anchored at viewport center.
    // Mouse still affects the image via rotation/phase, but the lens does not follow.
    return { x: canvas.width * 0.5, y: canvas.height * 0.5 };
  }

  function getViewportUnit(g) {
    // Use 1000px as a neutral baseline. Values scale proportionally with viewport size.
    const canvas = g.canvas;
    if (!canvas) return 1;
    return clamp$1(Math.min(canvas.width, canvas.height) / 1000, 0.35, 3.0);
  }

  function isOverlapping(existing, x, y, r) {
    for (let i = 0; i < existing.length; i++) {
      const o = existing[i];
      const dx = x - o.x;
      const dy = y - o.y;
      const rr = r + o.r;
      if (dx * dx + dy * dy < rr * rr) return true;
    }
    return false;
  }

  function getRenderDtSeconds() {
    const now = performance.now();
    const last = _lastRenderMs || now;
    _lastRenderMs = now;
    // Clamp dt to avoid big spikes when tab regains focus
    return clamp$1((now - last) / 1000, 0, 0.05);
  }

  function springTo(state, target, dt, omega = 10) {
    // Critically damped spring: natural ease-in/out, no overshoot.
    // omega controls responsiveness (higher = snappier).
    const k = omega * omega;
    const c = 2 * omega;
    state.v += (target - state.x) * k * dt;
    state.v *= Math.max(0, 1 - c * dt);
    state.x += state.v * dt;
    return state.x;
  }

  function applyKaleidoscopeBounds(ball, w, h, dt) {
    // Bounds for Kaleidoscope only:
    // - Keep balls inside the canvas
    // - No sounds, no rubber wall impacts, no corner repellers
    // - Gentle reflection with mild energy loss for stability
    const g = getGlobals();
    const inset = Math.max(2, (g.wallInset || 3)) * (g.DPR || 1);
    const minX = inset + ball.r;
    const maxX = w - inset - ball.r;
    const minY = inset + ball.r;
    const maxY = h - inset - ball.r;

    const rest = 0.92;
    const damp = Math.max(0.0, 1 - 0.15 * dt); // mild per-second damping on bounces

    if (ball.x < minX) {
      ball.x = minX;
      ball.vx = Math.abs(ball.vx) * rest * damp;
    } else if (ball.x > maxX) {
      ball.x = maxX;
      ball.vx = -Math.abs(ball.vx) * rest * damp;
    }

    if (ball.y < minY) {
      ball.y = minY;
      ball.vy = Math.abs(ball.vy) * rest * damp;
    } else if (ball.y > maxY) {
      ball.y = maxY;
      ball.vy = -Math.abs(ball.vy) * rest * damp;
    }
  }

  function initializeKaleidoscope() {
    const g = getGlobals();
    clearBalls();

    const canvas = g.canvas;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const centerX = w * 0.5;
    const centerY = h * 0.5;
    const unit = getViewportUnit(g);

    const maxBalls = g.maxBalls || 300;
    const count = clamp$1(g.kaleidoscopeBallCount ?? 23, 10, maxBalls);

    // Spawn as a loose ring so the first frame is already “kaleidoscopic”.
    // Wide range ensures coverage across the whole viewport without central clumping
    // (spacing + non-overlap keeps it airy).
    const ringMin = Math.min(w, h) * 0.10;
    const ringMax = Math.min(w, h) * 0.95;

    // Non-overlapping spawn (one-time O(n²), acceptable at init)
    const placed = [];
    const maxAttemptsPerBall = 90;
    const margin = Math.max(2, g.wallInset || 3) * g.DPR;

    function spawnOne(color) {
      const radius = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const minX = margin + radius;
      const maxX = w - margin - radius;
      const minY = margin + radius;
      const maxY = h - margin - radius;

      for (let attempt = 0; attempt < maxAttemptsPerBall; attempt++) {
        const a = Math.random() * TAU$1;
        const rr = ringMin + Math.random() * (ringMax - ringMin);
        const x = clamp$1(centerX + Math.cos(a) * rr, minX, maxX);
        const y = clamp$1(centerY + Math.sin(a) * rr, minY, maxY);
        if (!isOverlapping(placed, x, y, radius + g.ballSpacing * g.DPR)) {
          placed.push({ x, y, r: radius + g.ballSpacing * g.DPR });
          const b = new Ball(x, y, radius, color);
          b._kaleiSeed = Math.random() * TAU$1;
          // Viewport-relative tangential speed (baseline: 12–24 at 1000px min-dim).
          const speed = (12 + Math.random() * 12) * unit;
          b.vx = -Math.sin(a) * speed;
          b.vy = Math.cos(a) * speed;
          b.driftAx = 0;
          b.driftTime = 0;
          g.balls.push(b);
          return;
        }
      }

      // Fallback: accept overlap if we couldn't place it (rare at sane counts)
      const a = Math.random() * TAU$1;
      const rr = ringMin + Math.random() * (ringMax - ringMin);
      const x = centerX + Math.cos(a) * rr;
      const y = centerY + Math.sin(a) * rr;
      const b = new Ball(x, y, radius, color);
      b._kaleiSeed = Math.random() * TAU$1;
      const speed = (12 + Math.random() * 12) * unit;
      b.vx = -Math.sin(a) * speed;
      b.vy = Math.cos(a) * speed;
      b.driftAx = 0;
      b.driftTime = 0;
      g.balls.push(b);
    }

    // Ensure at least one of each palette color
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      spawnOne(getColorByIndex(colorIndex));
    }

    for (let i = 8; i < count; i++) {
      spawnOne(pickRandomColor());
    }
  }

  function applyKaleidoscopeForces(ball, dt) {
    const g = getGlobals();
    if (g.currentMode !== MODES.KALEIDOSCOPE) return;

    const canvas = g.canvas;
    if (!canvas) return;

    const { x: cx, y: cy } = getLensCenter(g);
    const unit = getViewportUnit(g);
    const nowMs = performance.now();
    const sinceMoveMs = nowMs - (g.lastPointerMoveMs || 0);
    const movingRecently = sinceMoveMs < 90; // small grace window for smooth release

    // Smooth activity envelope: ramps in/out with easing (no snapping).
    if (g._kaleiActivity === undefined) g._kaleiActivity = 0;
    const target = movingRecently ? 1 : 0;
    const tauIn = 0.08;
    const tauOut = 0.22;
    const tau = target > g._kaleiActivity ? tauIn : tauOut;
    const k = 1 - Math.exp(-dt / Math.max(1e-4, tau));
    g._kaleiActivity += (target - g._kaleiActivity) * k;

    // Idle baseline is intentionally tiny; motion is mostly driven by activity.
    const idleBase = clamp$1(g.kaleidoscopeIdleMotion ?? 0.03, 0, 1);
    const motionFactor = idleBase + g._kaleiActivity * (1 - idleBase);

    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const dist = Math.max(EPS, Math.hypot(dx, dy));
    const nx = dx / dist;
    const ny = dy / dist;

    const tx = -ny;
    const ty = nx;

    // Distance falloff keeps the field controllable across screen sizes.
    const farFalloff = 1 / Math.max(240, Math.min(canvas.width, canvas.height) * 0.65);
    const inv = 1 / (1 + dist * farFalloff);

    const swirlStrength = (g.kaleidoscopeSwirlStrength ?? 52) * unit * inv * motionFactor;
    const radialPull = (g.kaleidoscopeRadialPull ?? 260) * unit * inv * motionFactor;

    // Organic drift: per-ball low-frequency wander that gently perturbs direction.
    const t = nowMs * 0.001;
    const seed = (ball._kaleiSeed ?? 0) + ball.age * 0.07;
    const wanderAmt = clamp$1(g.kaleidoscopeWander ?? 0.25, 0, 1) * inv * motionFactor;
    const rot = Math.sin(t * 0.35 + seed) * (0.55 * wanderAmt); // radians
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    // Rotate tangential direction slightly toward/away from radial for “organic” flow
    const tRx = tx * cr - nx * sr;
    const tRy = ty * cr - ny * sr;

    // Mild inward pull (negative radial)
    const dvxTarget = (tRx * swirlStrength - nx * radialPull) * dt;
    const dvyTarget = (tRy * swirlStrength - ny * radialPull) * dt;

    // Ease velocity changes (frame-rate independent)
    const ease = clamp$1(g.kaleidoscopeEase ?? 0.18, 0, 1);
    const alpha = 1 - Math.pow(1 - ease, dt * 60);
    ball.vx += dvxTarget * alpha;
    ball.vy += dvyTarget * alpha;

    // Gentle damping to prevent runaway energy
    // Idle should be a slow, continuous loop (no start/stop).
    // Too much damping causes velocities to die, then collision correction "kicks" them (visible pops).
    const damp = (g._kaleiActivity < 0.05) ? 0.9985 : 0.996;
    ball.vx *= damp;
    ball.vy *= damp;

    // Soft speed clamp (user-tunable)
    const maxSpeed = clamp$1((g.kaleidoscopeMaxSpeed ?? 2600) * unit, 300, 12000);
    const s2 = ball.vx * ball.vx + ball.vy * ball.vy;
    if (s2 > maxSpeed * maxSpeed) {
      const s = Math.sqrt(s2);
      const k = maxSpeed / Math.max(EPS, s);
      ball.vx *= k;
      ball.vy *= k;
    }
  }

  function renderKaleidoscope(ctx) {
    const g = getGlobals();
    if (g.currentMode !== MODES.KALEIDOSCOPE) return;

    const canvas = g.canvas;
    if (!canvas) return;

    const dt = getRenderDtSeconds();

    const balls = g.balls;
    const w = canvas.width;
    const h = canvas.height;
    const unit = getViewportUnit(g);

    const segmentsRaw = g.kaleidoscopeSegments ?? 12;
    const segments = clamp$1(Math.round(segmentsRaw), 3, 24);
    const mirror = Boolean(g.kaleidoscopeMirror ?? true);

    const { x: cx, y: cy } = getLensCenter(g);

    // “Proper” kaleidoscope mapping:
    // Fold polar angle into a single wedge, mirror within wedge, then replicate across wedges.
    // Mouse affects the mapping (pan + phase), not the kaleidoscope center position.

    const wedgeAngle = TAU$1 / segments;
    const rotationFollow = clamp$1(g.kaleidoscopeRotationFollow ?? 1.0, 0, 3);
    const seamEps = Math.max(1e-5, wedgeAngle * 1e-4); // keep away from exact seam angles

    // Mouse-driven mapping offsets
    const mx = g.mouseInCanvas ? g.mouseX : cx;
    const my = g.mouseInCanvas ? g.mouseY : cy;
    const mdx = mx - cx;
    const mdy = my - cy;
    const mAngle = Math.atan2(mdy, mdx);
    const mDist = Math.hypot(mdx, mdy);
    const mDistN = clamp$1(mDist / Math.max(1, Math.min(w, h) * 0.5), 0, 1);
    const invertT = g.mouseInCanvas ? (1 - mDistN) : 0; // Inverted interaction: outside => “center” (neutral)

    // Phase controls which “slice” you see; distance contributes a zoom-ish feel.
    const phaseTarget = (mAngle * 0.6 * invertT + invertT * 1.2) * rotationFollow;

    // Pan: shifts the sampling field so the kaleidoscope changes, not just rotates.
    const panStrength = clamp$1(g.kaleidoscopePanStrength ?? 0.75, 0, 2);
    const panXTarget = mdx * panStrength * invertT;
    const panYTarget = mdy * panStrength * invertT;

    // Smooth pan + phase so direction changes ease-in/out (no snappy reversals)
    if (!g._kaleiEase) {
      g._kaleiEase = {
        panX: { x: 0, v: 0 },
        panY: { x: 0, v: 0 },
        phase: { x: 0, v: 0 },
        lastMouseX: mx,
        lastMouseY: my,
        lastInCanvas: Boolean(g.mouseInCanvas),
      };
    }

    // Slightly different responsiveness for pan vs phase feels best
    const ex = g._kaleiEase;
    const inCanvasNow = Boolean(g.mouseInCanvas);
    const movedPx = Math.hypot(mx - ex.lastMouseX, my - ex.lastMouseY);
    const moved = movedPx > 0.5 || inCanvasNow !== ex.lastInCanvas; // includes enter/leave

    let panX = ex.panX.x;
    let panY = ex.panY.x;
    let phase = ex.phase.x;

    if (moved) {
      ex.lastMouseX = mx;
      ex.lastMouseY = my;
      ex.lastInCanvas = inCanvasNow;

      panX = springTo(ex.panX, panXTarget, dt, 9);
      panY = springTo(ex.panY, panYTarget, dt, 9);
      phase = springTo(ex.phase, phaseTarget, dt, 11);
    } else {
      // Freeze when the mouse isn't moving: no settling/inertia.
      ex.panX.v = 0;
      ex.panY.v = 0;
      ex.phase.v = 0;
    }

    // Draw
    for (let bi = 0; bi < balls.length; bi++) {
      const ball = balls[bi];

      // Map into center-relative coords, then apply pan (mouse changes mapping).
      const rx = (ball.x - cx) + panX;
      const ry = (ball.y - cy) + panY;
      // Scale radius to ensure full-viewport coverage (and spill beyond edges if needed).
      const fillScale = 1.8 * unit;
      const r = Math.hypot(rx, ry) * fillScale;
      if (r < EPS) continue;

      // Canonical kaleidoscope fold:
      // - If mirror is enabled: fold angle into [0, wedgeAngle] using a 2*wedgeAngle period reflection.
      //   This guarantees continuity across wedge boundaries (no “flip seams”).
      // - If mirror is disabled: simple modulo into [0, wedgeAngle).
      const period = mirror ? (2 * wedgeAngle) : wedgeAngle;
      let local = Math.atan2(ry, rx) + phase;
      local = ((local % period) + period) % period; // wrap to [0, period)
      if (mirror && local > wedgeAngle) local = period - local; // reflect into [0, wedgeAngle]

      // Avoid exact seam angles (helps prevent razor-thin discontinuities from float/AA).
      local = clamp$1(local, seamEps, wedgeAngle - seamEps);

      // Replicate across wedges
      for (let wi = 0; wi < segments; wi++) {
        const outA = (wi * wedgeAngle) + local;

        const x = cx + Math.cos(outA) * r;
        const y = cy + Math.sin(outA) * r;

        // Draw circle (same style)
        if (ball.alpha < 1) ctx.globalAlpha = ball.alpha;
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(x, y, ball.r, 0, TAU$1);
        ctx.fill();
        if (ball.alpha < 1) ctx.globalAlpha = 1;
      }
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                           WORMS MODE (SIM 11)                                ║
  // ║        Biologically-grounded worm locomotion (Verlet + constraints)          ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  //
  // Design goals (per spec):
  // - Overhead view: organisms roam the full viewport (no ground plane).
  // - Each worm is a chain of circle segments (4–9), head leads, body follows.
  // - Verlet integration + distance constraints (rope/soft-body style).
  // - Multiple constraint passes per frame for stability.
  // - Segment-vs-segment collisions (same worm non-adjacent + different worms).
  // - Mouse interaction: organisms flee from the pointer.
  // - Disney-ish squash & stretch (render-time) with follow-through/overlap (solver-time).
  //
  // Performance:
  // - No per-frame allocations in update/render hot paths.
  // - O(n²) collision is OK at current scale (≤ ~90 segments).


  const TAU = Math.PI * 2;

  // Simulation sizing targets (tuned for this canvas system)
  const WORMS_MIN = 10;
  // User override: allow some organisms to be a single ball.
  const SEG_MIN_SINGLE = 1;
  const SEG_MIN_CHAIN = 4;
  const SEG_MAX = 9;
  const SINGLE_ORGANISM_CHANCE = 0.22; // fraction of worms that are a single segment

  // Constraint solver
  const CONSTRAINT_PASSES = 6;
  const COLLISION_PASSES = 2;
  const DAMP_AIR = 0.88;           // stronger damping (prevents glide/float)

  // Locomotion (head drive)
  const BASE_SPEED = 420;          // px/s baseline crawl (faster)
  const STEP_HZ = 3.4;             // step cadence (bursty feel)
  const STEP_PULSE_SHARPNESS = 2.2;// larger = more “step-like”
  const TURN_DAMP = 8.5;           // higher = more inertial turning
  const TURN_NOISE = 2.0;          // random walk strength
  const TURN_RATE_MAX = 2.1;       // rad/s clamp (prevents instant turning)
  const TURN_SEEK = 6.5;           // how strongly we steer toward a target direction (mouse/peers)

  // Micro-pauses (jittery, step-like)
  const PAUSE_CHANCE_PER_S = 0.35;
  const PAUSE_MIN_S = 0.04;
  const PAUSE_MAX_S = 0.18;

  // Flee + awareness interaction
  const FLEE_RADIUS = 260;         // px (scaled by DPR)
  const FLEE_FORCE = 1.6;          // heading bias away from mouse
  const PANIC_SPEED_BOOST = 0.85;  // extra speed multiplier at max panic

  const SENSE_RADIUS = 220;        // px (scaled by DPR)
  const AVOID_FORCE = 0.9;         // how strongly heads avoid other heads
  const AVOID_SWIRL = 0.35;        // adds a small tangential dodge (prevents deadlocks)
  const CROWD_SPEED_BOOST = 0.22;  // extra speed when near other heads

  // Visual squash/stretch
  const SQUASH_DECAY = 0.86;
  const SPEED_STRETCH_GAIN = 0.0011;
  const SPEED_STRETCH_MAX = 0.38;

  // Precomputed sine lookup table (avoids heavy trig in hot loops).
  const SIN_LUT_SIZE = 256;
  const SIN_LUT = (() => {
    const lut = new Float32Array(SIN_LUT_SIZE);
    for (let i = 0; i < SIN_LUT_SIZE; i++) {
      lut[i] = Math.sin((i / SIN_LUT_SIZE) * TAU);
    }
    return lut;
  })();

  function sinLut(theta) {
    // theta in radians, map to [0, SIN_LUT_SIZE)
    const t = theta * (SIN_LUT_SIZE / TAU);
    // Fast wrap (supports negative).
    let idx = t | 0;
    idx %= SIN_LUT_SIZE;
    if (idx < 0) idx += SIN_LUT_SIZE;
    return SIN_LUT[idx];
  }

  function cosLut(theta) {
    return sinLut(theta + Math.PI / 2);
  }

  function clamp01$2(x) {
    return x < 0 ? 0 : (x > 1 ? 1 : x);
  }

  function clamp(x, lo, hi) {
    return x < lo ? lo : (x > hi ? hi : x);
  }

  // Simple deterministic per-worm RNG (LCG) to avoid Math.random in hot paths.
  function lcgNext(stateU32) {
    // Numerical Recipes constants (good enough here).
    return (Math.imul(stateU32, 1664525) + 1013904223) >>> 0;
  }

  function lcgFloat01(stateU32) {
    // Use top 24 bits for a stable float in [0,1).
    return (stateU32 >>> 8) * (1 / 16777216);
  }

  function smoothStep01(x) {
    // Smoothstep(0,1,x): 3x^2 - 2x^3
    x = clamp01$2(x);
    return x * x * (3 - 2 * x);
  }

  function stepPulse(phase01) {
    // Make a step-like gait envelope from a sine-ish phase without trig:
    // Use a triangle wave -> smoothstep -> sharpen.
    const t = phase01 < 0.5 ? phase01 * 2 : (1 - phase01) * 2; // 0..1..0
    const s = smoothStep01(t);
    return Math.pow(s, STEP_PULSE_SHARPNESS);
  }

  function getReducedMotion() {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  }

  /**
   * Initialize the worms simulation.
   * Stores all worm state on `globals.wormSim`.
   */
  function initializeWorms() {
    const g = getGlobals();
    const canvas = g.canvas;
    if (!canvas) return;

    // Clear ball-based scene (this mode uses its own data).
    if (g.balls) g.balls.length = 0;

    const inset = Math.max(0, (g.wallInset ?? 3)) * (g.DPR || 1);
    const w = canvas.width;
    const h = canvas.height;

    // Segment radius: tie to global ball sizing so the mode “fits” the system.
    // Use the smaller side of the current ball range to keep worms readable.
    const rBase = Math.max(6, Math.min(18, (g.R_MIN || 10) * 0.95));
    const linkBase = rBase * 1.85;

    // User override: "Create twice as many" (originally 12 here) -> 24 minimum.
    const wormCount = Math.max(WORMS_MIN, 24);

    // First pass: decide segment counts and total segments.
    const wormSegCount = new Uint8Array(wormCount);
    const wormStart = new Uint16Array(wormCount);
    const wormTheta = new Float32Array(wormCount);
    const wormTurnRate = new Float32Array(wormCount);
    const wormStepPhase = new Float32Array(wormCount);
    const wormPause = new Float32Array(wormCount);
    const wormRng = new Uint32Array(wormCount);
    const wormColorIdx = new Uint8Array(wormCount);

    let totalSegs = 0;
    for (let wi = 0; wi < wormCount; wi++) {
      // Seed rng from time + index; deterministic enough per init.
      let seed = ((performance.now() * 1000) | 0) ^ (wi * 2654435761);
      seed = (seed >>> 0) || 1;
      wormRng[wi] = seed;

      wormRng[wi] = lcgNext(wormRng[wi]);
      const u = lcgFloat01(wormRng[wi]);
      let segs;
      if (u < SINGLE_ORGANISM_CHANCE) {
        segs = SEG_MIN_SINGLE;
      } else {
        wormRng[wi] = lcgNext(wormRng[wi]);
        segs = SEG_MIN_CHAIN + (wormRng[wi] % (SEG_MAX - SEG_MIN_CHAIN + 1));
      }
      wormSegCount[wi] = segs;
      wormStart[wi] = totalSegs;
      totalSegs += segs;
    }

    // Flat segment arrays (tight, cache-friendly).
    const x = new Float32Array(totalSegs);
    const y = new Float32Array(totalSegs);
    const px = new Float32Array(totalSegs);
    const py = new Float32Array(totalSegs);
    const r = new Float32Array(totalSegs);
    const segWorm = new Uint8Array(totalSegs);
    const segIndex = new Uint8Array(totalSegs);
    const squash = new Float32Array(totalSegs);

    // Overhead view: place organisms across the whole viewport.
    const minX = inset + rBase + 6;
    const maxX = w - inset - rBase - 6;
    const minY = inset + rBase + 6;
    const maxY = h - inset - rBase - 6;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    for (let wi = 0; wi < wormCount; wi++) {
      const start = wormStart[wi];
      const segs = wormSegCount[wi];

      wormRng[wi] = lcgNext(wormRng[wi]);
      const fx = lcgFloat01(wormRng[wi]);
      wormRng[wi] = lcgNext(wormRng[wi]);
      const fy = lcgFloat01(wormRng[wi]);
      const headX = minX + fx * spanX;
      const headY = minY + fy * spanY;

      // Initial direction free (overhead view).
      wormRng[wi] = lcgNext(wormRng[wi]);
      const dir = lcgFloat01(wormRng[wi]) * TAU;
      wormTheta[wi] = dir;
      wormTurnRate[wi] = 0;
      wormStepPhase[wi] = lcgFloat01(wormRng[wi]);
      wormPause[wi] = 0;

      // Color selection: keep within existing 8-color palette.
      wormRng[wi] = lcgNext(wormRng[wi]);
      wormColorIdx[wi] = wormRng[wi] % 8;

      for (let si = 0; si < segs; si++) {
        const i = start + si;
        segWorm[i] = wi;
        segIndex[i] = si;
        r[i] = rBase * (1 - si * 0.03); // subtle taper
        squash[i] = 0;

        // Lay out body behind head.
        const off = si * linkBase;
        const xx = headX - Math.cos(dir) * off;
        const yy = headY;
        x[i] = xx;
        y[i] = yy;
        px[i] = xx;
        py[i] = yy;
      }
    }

    g.wormSim = {
      // Geometry
      wormCount,
      totalSegs,
      wormSegCount,
      wormStart,
      wormColorIdx,
      linkBase,
      rBase,

      // Worm dynamics
      wormTheta,
      wormTurnRate,
      wormStepPhase,
      wormPause,
      wormRng,

      // Segment buffers
      x, y, px, py, r,
      segWorm, segIndex,
      squash,
    };

    console.log(`✓ Worms initialized: ${wormCount} worms, ${totalSegs} segments`);
  }

  function applyBoundsAndGround(sim, canvasW, canvasH, inset) {
    const x = sim.x;
    const y = sim.y;
    const px = sim.px;
    const py = sim.py;
    const r = sim.r;
    const n = sim.totalSegs;

    const minX = inset;
    const minY = inset;
    const maxX = canvasW - inset;
    const maxY = canvasH - inset;

    for (let i = 0; i < n; i++) {
      const ri = r[i];

      // Left/right bounds
      if (x[i] < minX + ri) {
        x[i] = minX + ri;
        px[i] = x[i];
      } else if (x[i] > maxX - ri) {
        x[i] = maxX - ri;
        px[i] = x[i];
      }

      // Ceiling (rare)
      if (y[i] < minY + ri) {
        y[i] = minY + ri;
        py[i] = y[i];
      }

      // Bottom bound
      if (y[i] > maxY - ri) {
        y[i] = maxY - ri;
        py[i] = y[i];
      }
    }
  }

  function solveLinks(sim) {
    const x = sim.x;
    const y = sim.y;
    const r = sim.r;
    const wormCount = sim.wormCount;
    const wormStart = sim.wormStart;
    const wormSegCount = sim.wormSegCount;
    const phase = sim.wormStepPhase;

    // Contraction wave (subtle): produces “soft caterpillar” propagation.
    // Keep it small to avoid springy/floating reads.
    const waveAmp = 0.05;
    const phaseOffset = 0.85;

    for (let wi = 0; wi < wormCount; wi++) {
      const start = wormStart[wi];
      const segs = wormSegCount[wi];
      const ph = phase[wi] * TAU;

      // Head leads: move follower more than leader for each link.
      // Farther from head: more symmetric.
      for (let si = 0; si < segs - 1; si++) {
        const a = start + si;
        const b = a + 1;

        const dx = x[b] - x[a];
        const dy = y[b] - y[a];
        const dist = Math.sqrt(dx * dx + dy * dy) + 1e-6;

        const taper = 0.7 + (r[a] / (sim.rBase || 1)) * 0.3;
        const rest = sim.linkBase * taper * (1 + waveAmp * sinLut(ph - si * phaseOffset));

        const delta = dist - rest;
        const nx = dx / dist;
        const ny = dy / dist;

        // Weighting biases: head leads, body follows.
        const t = si / Math.max(1, segs - 2);
        const wA = 0.18 + 0.22 * t; // leader moves little near head, more mid-body
        const wB = 1 - wA;

        const cx = nx * delta;
        const cy = ny * delta;

        x[a] += cx * wA;
        y[a] += cy * wA;
        x[b] -= cx * wB;
        y[b] -= cy * wB;
      }
    }
  }

  function solveCollisions(sim) {
    const x = sim.x;
    const y = sim.y;
    const r = sim.r;
    const segWorm = sim.segWorm;
    const segIndex = sim.segIndex;
    const squash = sim.squash;
    const n = sim.totalSegs;

    for (let i = 0; i < n; i++) {
      const xi = x[i];
      const yi = y[i];
      const ri = r[i];
      const wi = segWorm[i];
      const si = segIndex[i];

      for (let j = i + 1; j < n; j++) {
        // Skip adjacent segments on same worm (they are linked).
        if (wi === segWorm[j]) {
          const sj = segIndex[j];
          const d = sj > si ? (sj - si) : (si - sj);
          if (d <= 1) continue;
        }

        const dx = x[j] - xi;
        const dy = y[j] - yi;
        const rr = ri + r[j];
        const d2 = dx * dx + dy * dy;

        if (d2 < rr * rr) {
          const dist = Math.sqrt(d2) + 1e-6;
          const overlap = rr - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          // Soft nudge (positional separation, no bounce).
          const push = overlap * 0.5;
          x[i] -= nx * push;
          y[i] -= ny * push;
          x[j] += nx * push;
          y[j] += ny * push;

          // Visual squash on contact (decays later).
          const impact = clamp01$2(overlap / rr);
          if (impact > squash[i]) squash[i] = impact;
          if (impact > squash[j]) squash[j] = impact;
        }
      }
    }
  }

  function updateLocomotion(sim, dt, canvasW, inset, g) {
    const x = sim.x;
    const y = sim.y;
    const px = sim.px;
    const py = sim.py;
    const wormCount = sim.wormCount;
    const wormStart = sim.wormStart;
    const wormSegCount = sim.wormSegCount;
    const theta = sim.wormTheta;
    const turnRate = sim.wormTurnRate;
    const phase = sim.wormStepPhase;
    const pause = sim.wormPause;
    const rng = sim.wormRng;
    const canvasH = g.canvas?.height || 0;

    // Head steering away from walls (2D).
    const margin = 120 * (g.DPR || 1);
    const minX = inset + margin;
    const maxX = canvasW - inset - margin;
    const minY = inset + margin;
    const maxY = canvasH - inset - margin;

    const dpr = g.DPR || 1;
    const fleeR = FLEE_RADIUS * dpr;
    const fleeR2 = fleeR * fleeR;
    const senseR = SENSE_RADIUS * dpr;
    const senseR2 = senseR * senseR;

    const hasMouse = g.mouseInCanvas && g.mouseX > -1e8 && g.mouseY > -1e8;
    const mx = g.mouseX;
    const my = g.mouseY;

    for (let wi = 0; wi < wormCount; wi++) {
      // Advance gait phase
      let ph = phase[wi] + (STEP_HZ * dt);
      ph -= Math.floor(ph);
      phase[wi] = ph;

      // Pause timer + stochastic micro-pauses
      let p = pause[wi];
      if (p > 0) {
        p -= dt;
        if (p < 0) p = 0;
        pause[wi] = p;
      } else {
        rng[wi] = lcgNext(rng[wi]);
        const u = lcgFloat01(rng[wi]);
        if (u < PAUSE_CHANCE_PER_S * dt) {
          rng[wi] = lcgNext(rng[wi]);
          const u2 = lcgFloat01(rng[wi]);
          pause[wi] = PAUSE_MIN_S + (PAUSE_MAX_S - PAUSE_MIN_S) * u2;
        }
      }

      // Correlated random walk for direction (turning inertia).
      rng[wi] = lcgNext(rng[wi]);
      const noise = (lcgFloat01(rng[wi]) * 2 - 1) * TURN_NOISE;

      let tr = turnRate[wi];
      tr += (noise - tr * TURN_DAMP) * dt;

      // Wall steering bias (gentle) in X.
      const head = wormStart[wi];
      const hx = x[head];
      if (hx < minX) tr += (minX - hx) * 0.002;
      else if (hx > maxX) tr -= (hx - maxX) * 0.002;
      // Wall steering bias in Y: push heading away by nudging turnRate based on vertical position.
      // This is a cheap "keep within box" bias without changing speed.
      const hy = y[head];
      if (hy < minY) tr += (minY - hy) * 0.001;
      else if (hy > maxY) tr -= (hy - maxY) * 0.001;

      // Flee from mouse: steer away and run faster when close.
      let panic = 0;
      let steerX = 0;
      let steerY = 0;
      if (hasMouse) {
        const mdx = hx - mx;
        const mdy = hy - my;
        const md2 = mdx * mdx + mdy * mdy;
        if (md2 < fleeR2 && md2 > 1e-6) {
          const md = Math.sqrt(md2);
          const t = 1 - md / fleeR;
          const w = t * t; // eased
          const inv = 1 / md;
          steerX += (mdx * inv) * (w * FLEE_FORCE);
          steerY += (mdy * inv) * (w * FLEE_FORCE);
          panic = w;
        }
      }

      // "See each other": head-to-head avoidance + small tangential deflection.
      // O(w²) but tiny (24 worms).
      let crowd = 0;
      for (let wj = 0; wj < wormCount; wj++) {
        if (wj === wi) continue;
        const hj = wormStart[wj];
        const dx = hx - x[hj];
        const dy = hy - y[hj];
        const d2 = dx * dx + dy * dy;
        if (d2 < senseR2 && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const t = 1 - d / senseR;
          const w = t * t;
          const inv = 1 / d;
          const nx = dx * inv;
          const ny = dy * inv;
          steerX += nx * (w * AVOID_FORCE);
          steerY += ny * (w * AVOID_FORCE);
          // Tangential "slide past" to avoid getting stuck in pure repulsion.
          const tx = -ny;
          const ty = nx;
          const swirlSign = (wi & 1) ? 1 : -1;
          steerX += tx * (w * AVOID_SWIRL * swirlSign);
          steerY += ty * (w * AVOID_SWIRL * swirlSign);
          crowd = Math.max(crowd, w);
        }
      }

      // If we have a steering vector, nudge turn rate toward its direction.
      if (steerX !== 0 || steerY !== 0) {
        // Desired heading = current heading + steering.
        const th0 = theta[wi];
        const fx = cosLut(th0) + steerX;
        const fy = sinLut(th0) + steerY;
        const desired = Math.atan2(fy, fx);
        let da = desired - th0;
        // Wrap to [-π, π]
        if (da > Math.PI) da -= TAU;
        else if (da < -Math.PI) da += TAU;
        tr += da * TURN_SEEK * dt;
      }

      tr = clamp(tr, -TURN_RATE_MAX, TURN_RATE_MAX);
      turnRate[wi] = tr;

      let th = theta[wi] + tr * dt;
      // Keep theta in [-π, π] (optional but prevents drift).
      if (th > Math.PI) th -= TAU;
      else if (th < -Math.PI) th += TAU;
      theta[wi] = th;

      // Step envelope (bursty locomotion, eased).
      const pulse = stepPulse(ph);
      const pauseMul = pause[wi] > 0 ? 0 : 1;
      const speedBase = BASE_SPEED * (0.30 + 1.05 * pulse) * pauseMul;
      const speed = speedBase * (1 + panic * PANIC_SPEED_BOOST + crowd * CROWD_SPEED_BOOST);

      const dt2 = dt * dt;
      const ax = cosLut(th) * speed * dt2;
      const ay = sinLut(th) * speed * dt2;

      // Apply “muscle” to head as acceleration in Verlet form.
      x[head] += ax;
      y[head] += ay;

      // Follow-through: a small lag impulse propagated down the chain by constraints.
      // (No allocations; just slightly bias the second segment’s previous position.)
      const segs = wormSegCount[wi];
      if (segs > 2) {
        const neck = head + 1;
        const vx = x[head] - px[head];
        px[neck] -= vx * 0.05;
        py[neck] -= (y[head] - py[head]) * 0.02;
      }
    }
  }

  /**
   * Per-frame update for Worms mode.
   * Called from the physics engine's mode-specialized path.
   */
  function updateWorms(dtSeconds) {
    const g = getGlobals();
    const sim = g.wormSim;
    const canvas = g.canvas;
    if (!sim || !canvas) return;

    // Respect reduced motion: keep static (no autonomous movement).
    const reducedMotion = getReducedMotion();

    const dt = Math.min(0.033, Math.max(0, dtSeconds));
    if (dt <= 0) return;

    const inset = Math.max(0, (g.wallInset ?? 3)) * (g.DPR || 1);

    if (!reducedMotion) {
      // Locomotion state updates (head drive).
      updateLocomotion(sim, dt, canvas.width, inset, g);

      // Verlet integration for all segments.
      const x = sim.x;
      const y = sim.y;
      const px = sim.px;
      const py = sim.py;
      const n = sim.totalSegs;

      // Gravity term in Verlet form: a * dt^2
      const gy = 0;

      for (let i = 0; i < n; i++) {
        const vx = (x[i] - px[i]) * DAMP_AIR;
        const vy = (y[i] - py[i]) * DAMP_AIR;

        px[i] = x[i];
        py[i] = y[i];

        x[i] += vx;
        y[i] += (vy + gy);

        // Decay contact squash for visuals.
        sim.squash[i] *= SQUASH_DECAY;
      }

      // Constraint solver passes:
      // 1) link lengths (rope constraints)
      // 2) collisions (circle non-overlap)
      // 3) bounds + ground traction
      for (let p = 0; p < CONSTRAINT_PASSES; p++) {
        solveLinks(sim);
        applyBoundsAndGround(sim, canvas.width, canvas.height, inset);
      }

      for (let p = 0; p < COLLISION_PASSES; p++) {
        solveCollisions(sim);
        applyBoundsAndGround(sim, canvas.width, canvas.height, inset);
      }
    } else {
      // Reduced motion: still enforce bounds and decay squash.
      applyBoundsAndGround(sim, canvas.width, canvas.height, inset);
      for (let i = 0; i < sim.totalSegs; i++) {
        sim.squash[i] *= SQUASH_DECAY;
      }
    }
  }

  /**
   * Render worms as squashed/stretched circles (ellipses) aligned to velocity.
   * Called from physics engine render() when this mode is active.
   */
  function renderWorms(ctx) {
    const g = getGlobals();
    const sim = g.wormSim;
    const canvas = g.canvas;
    if (!sim || !canvas) return;

    const colors = g.currentColors || [];
    const x = sim.x;
    const y = sim.y;
    const px = sim.px;
    const py = sim.py;
    const r = sim.r;
    const squash = sim.squash;
    const segWorm = sim.segWorm;
    const wormColorIdx = sim.wormColorIdx;
    const n = sim.totalSegs;

    // Use a fixed dt for velocity visualization to keep stable at different frame rates.
    const dt = 1 / 60;
    const invDt = 1 / dt;

    for (let i = 0; i < n; i++) {
      const vx = (x[i] - px[i]) * invDt;
      const vy = (y[i] - py[i]) * invDt;
      const speed = Math.sqrt(vx * vx + vy * vy);

      // Stretch along velocity; preserve area via inverse scaling.
      const stretch = clamp(speed * SPEED_STRETCH_GAIN, 0, SPEED_STRETCH_MAX);
      const contact = clamp01$2(squash[i]);

      const sx = (1 + stretch) * (1 - contact * 0.22);
      const sy = (1 / (1 + stretch)) * (1 + contact * 0.35);

      // Align to velocity direction when moving; otherwise keep neutral.
      const ang = speed > 2 ? Math.atan2(vy, vx) : 0;

      const wi = segWorm[i];
      const ci = wormColorIdx[wi] % 8;
      const fill = colors[ci] || '#0a0a0a';

      ctx.save();
      ctx.translate(x[i], y[i]);
      if (ang !== 0) ctx.rotate(ang);
      ctx.scale(sx, sy);
      ctx.beginPath();
      ctx.arc(0, 0, r[i], 0, TAU);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            ACCESSIBILITY HELPERS                             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  function announceToScreenReader(message) {
    const announcer = document.getElementById('announcer');
    if (!announcer) return;
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = message; }, 10);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      MODE CONTROLLER (COMPLETE)                              ║
  // ║         Extracted from balls-source.html lines 3999-4085                     ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function setMode(mode) {
    const globals = getGlobals();

    // Worms uses click+drag interactions; prevent click-to-cycle while active.
    if (globals.currentMode === MODES.WORMS && mode !== MODES.WORMS) {
      if (globals._clickCycleBeforeWorms !== undefined) {
        globals.clickCycleEnabled = globals._clickCycleBeforeWorms;
        delete globals._clickCycleBeforeWorms;
      }
    }
    if (mode === MODES.WORMS) {
      if (globals._clickCycleBeforeWorms === undefined) {
        globals._clickCycleBeforeWorms = globals.clickCycleEnabled;
      }
      globals.clickCycleEnabled = false;
    }
    
    // Clean up Kaleidoscope spacing override when leaving the mode
    if (globals.currentMode === MODES.KALEIDOSCOPE && mode !== MODES.KALEIDOSCOPE) {
      if (globals._ballSpacingBeforeKaleidoscope !== undefined) {
        globals.ballSpacing = globals._ballSpacingBeforeKaleidoscope;
        delete globals._ballSpacingBeforeKaleidoscope;
      }
    }
    
    setMode$1(mode);
    
    console.log(`Switching to mode: ${mode}`);
    const modeNames = { 
      pit: 'Ball Pit', 
      flies: 'Flies to Light', 
      weightless: 'Zero Gravity', 
      water: 'Water Swimming',
      vortex: 'Vortex Sheets',
      'ping-pong': 'Ping Pong',
      magnetic: 'Magnetic',
      bubbles: 'Carbonated Bubbles',
      kaleidoscope: 'Kaleidoscope',
      worms: 'Worms'
    };
    announceToScreenReader(`Switched to ${modeNames[mode] || mode} mode`);
    
    // NOTE: UI button updates are handled by the caller (controls.js, keyboard.js)
    // to avoid circular dependencies
    
    // Update container class for mode-specific styling
    // PRESERVE dark-mode class when switching modes!
    if (globals.container) {
      const wasDark = globals.container.classList.contains('dark-mode');
      globals.container.className = '';
      if (mode === MODES.PIT) {
        globals.container.classList.add('mode-pit');
      }
      // Restore dark mode class if it was set
      if (wasDark || globals.isDarkMode) {
        globals.container.classList.add('dark-mode');
      }
    }
    
    // Resize canvas to match mode height
    resize();
    
    // Set physics parameters and initialize scene
    if (mode === MODES.PIT) {
      globals.gravityMultiplier = globals.gravityMultiplierPit;
      globals.G = globals.GE * globals.gravityMultiplier;
      globals.repellerEnabled = true;
      initializeBallPit();
    } else if (mode === MODES.FLIES) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeFlies();
    } else if (mode === MODES.WEIGHTLESS) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeWeightless();
    } else if (mode === MODES.WATER) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeWater();
    } else if (mode === MODES.VORTEX) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeVortex();
    } else if (mode === MODES.PING_PONG) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializePingPong();
    } else if (mode === MODES.MAGNETIC) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeMagnetic();
    } else if (mode === MODES.BUBBLES) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeBubbles();
    } else if (mode === MODES.KALEIDOSCOPE) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;

      // Mode-only spacing: keep Kaleidoscope airy without changing other modes.
      if (globals._ballSpacingBeforeKaleidoscope === undefined) {
        globals._ballSpacingBeforeKaleidoscope = globals.ballSpacing;
      }
      // Interpret kaleidoscopeBallSpacing as “px at 1000px min viewport dimension” for mobile consistency.
      const canvas = globals.canvas;
      const unit = canvas ? Math.max(0.35, Math.min(3.0, Math.min(canvas.width, canvas.height) / 1000)) : 1;
      const spacingBase = globals.kaleidoscopeBallSpacing ?? globals.ballSpacing;
      globals.ballSpacing = spacingBase * unit;

      initializeKaleidoscope();
    } else if (mode === MODES.WORMS) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeWorms();
    }
    
    console.log(`Mode ${mode} initialized with ${globals.balls.length} balls`);
  }

  function getForceApplicator() {
    const globals = getGlobals();
    if (globals.currentMode === MODES.FLIES) {
      return applyFliesForces;
    } else if (globals.currentMode === MODES.PIT) {
      return applyBallPitForces;
    } else if (globals.currentMode === MODES.WATER) {
      return applyWaterForces;
    } else if (globals.currentMode === MODES.VORTEX) {
      return applyVortexForces;
    } else if (globals.currentMode === MODES.PING_PONG) {
      return applyPingPongForces;
    } else if (globals.currentMode === MODES.MAGNETIC) {
      return applyMagneticForces;
    } else if (globals.currentMode === MODES.BUBBLES) {
      return applyBubblesForces;
    } else if (globals.currentMode === MODES.KALEIDOSCOPE) {
      return applyKaleidoscopeForces;
    }
    return null;
  }

  function getModeUpdater() {
    const globals = getGlobals();
    if (globals.currentMode === MODES.WATER) {
      return updateWaterRipples;
    } else if (globals.currentMode === MODES.MAGNETIC) {
      return updateMagnetic;
    } else if (globals.currentMode === MODES.BUBBLES) {
      return updateBubbles;
    }
    return null;
  }

  var modeController = /*#__PURE__*/Object.freeze({
    __proto__: null,
    MODES: MODES,
    getForceApplicator: getForceApplicator,
    getModeUpdater: getModeUpdater,
    setMode: setMode
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      PHYSICS ENGINE (COMPLETE)                               ║
  // ║           Fixed-timestep with collision detection                            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  const DT = CONSTANTS.PHYSICS_DT;
  let acc = 0;
  const CORNER_RADIUS = 42; // matches rounded container corners
  const CORNER_FORCE = 1800;

  function applyCornerRepellers(ball, canvas) {
    const corners = [
      { x: CORNER_RADIUS, y: CORNER_RADIUS },
      { x: canvas.width - CORNER_RADIUS, y: CORNER_RADIUS },
      { x: CORNER_RADIUS, y: canvas.height - CORNER_RADIUS },
      { x: canvas.width - CORNER_RADIUS, y: canvas.height - CORNER_RADIUS }
    ];
    for (let i = 0; i < corners.length; i++) {
      const cx = corners[i].x;
      const cy = corners[i].y;
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      const dist = Math.max(1, Math.hypot(dx, dy));
      if (dist < CORNER_RADIUS + ball.r) {
        const pen = (CORNER_RADIUS + ball.r) - dist;
        const strength = (pen / (CORNER_RADIUS + ball.r)) * CORNER_FORCE;
        const nx = dx / dist;
        const ny = dy / dist;
        ball.vx += nx * strength * DT;
        ball.vy += ny * strength * DT;
      }
    }
  }

  async function updatePhysics(dtSeconds, applyForcesFunc) {
    const globals = getGlobals();
    const balls = globals.balls;
    const canvas = globals.canvas;
    
    if (!canvas) return;

    // Worms mode is a non-ball simulation with its own data + solver.
    if (globals.currentMode === MODES.WORMS) {
      const dt = Math.min(0.033, Math.max(0, dtSeconds));
      updateWorms(dt);
      acc = 0;
      return;
    }

    if (balls.length === 0) return;

    // Kaleidoscope has its own lightweight physics path:
    // - Smooth (per-frame), not fixed-timestep accumulator
    // - Collisions on (prevents overlap)
    // - NO rubber wall deformation / impacts
    // - Simple bounds handling (no corner repellers, no wall wobble)
    if (globals.currentMode === MODES.KALEIDOSCOPE) {
      const dt = Math.min(0.033, Math.max(0, dtSeconds));
      const len = balls.length;
      for (let i = 0; i < len; i++) {
        balls[i].step(dt, applyForcesFunc);
      }

      // Keep circles apart (non-overlap) with a lighter solver
      resolveCollisionsCustom({
        iterations: 3,
        positionalCorrectionPercent: 0.22,
        maxCorrectionPx: 1.25 * (globals.DPR || 1),
        enableSound: false
      });

      // Simple bounds (no impacts / no wobble)
      for (let i = 0; i < len; i++) {
        applyKaleidoscopeBounds(balls[i], canvas.width, canvas.height, dt);
      }

      // No wallState.step() in Kaleidoscope
      acc = 0;
      return;
    }
    
    acc += dtSeconds;
    let physicsSteps = 0;
    
    while (acc >= DT && physicsSteps < CONSTANTS.MAX_PHYSICS_STEPS) {
      // Integrate physics for all modes
        const len = balls.length;
        for (let i = 0; i < len; i++) {
          balls[i].step(DT, applyForcesFunc);
        }
      
      // Ball-to-ball collisions:
      // - Disabled for Flies (swarm aesthetic)
      // - Reduced for Kaleidoscope (performance)
      // - Standard for Tilt (many light balls flow like water)
      if (globals.currentMode === MODES.KALEIDOSCOPE) {
        resolveCollisions(6); // fewer iterations than heavy modes; enough to prevent overlap
      } else if (globals.currentMode !== MODES.FLIES) {
        resolveCollisions(10); // standard solver iterations for stability
      }
      
      // Wall collisions + corner repellers
        const wallRestitution = (globals.currentMode === MODES.WEIGHTLESS) ? globals.weightlessBounce : globals.REST;
      const lenWalls = balls.length;
      for (let i = 0; i < lenWalls; i++) {
        applyCornerRepellers(balls[i], canvas);
          balls[i].walls(canvas.width, canvas.height, DT, wallRestitution);
      }
      
      acc -= DT;
      physicsSteps++;
    }
    
    // Mode-specific per-frame updates (water ripples, magnetic explosions, tilt transform, etc.)
    const modeUpdater = getModeUpdater();
    if (modeUpdater) {
      modeUpdater(dtSeconds);
    }
    
    // Update rubber wall physics (all non-kaleidoscope modes)
    wallState.step(dtSeconds);

    // Reset accumulator if falling behind
    if (acc > DT * CONSTANTS.ACCUMULATOR_RESET_THRESHOLD) acc = 0;
  }

  function render() {
    const globals = getGlobals();
    const ctx = globals.ctx;
    const balls = globals.balls;
    const canvas = globals.canvas;
    
    if (!ctx || !canvas) return;
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw water ripples (behind balls)
    if (globals.currentMode === MODES.WATER) ;
    
    // Draw balls (or mode-specific renderer)
    if (globals.currentMode === MODES.KALEIDOSCOPE) {
      renderKaleidoscope(ctx);
    } else if (globals.currentMode === MODES.WORMS) {
      renderWorms(ctx);
    } else {
    for (let i = 0; i < balls.length; i++) {
      balls[i].draw(ctx);
      }
    }
    
    // Draw rubber walls LAST (in front of balls)
    drawWalls(ctx, canvas.width, canvas.height);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                         DEV/PROD CONSOLE LOGGER                               ║
  // ║            Dev: structured, ordered logs | Prod: banner only                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  /**
   * Design goals:
   * - DEV: make initialization legible + provable (sequence + timings)
   * - PROD: keep console quiet for visitors (banner + ASCII only), but allow errors
   * - Safety: never throw, never allocate in hot paths (bootstrap only)
   */

  const rawConsole = (() => {
    // Capture early, in case prod stubs console methods.
    try {
      return {
        log: console.log?.bind(console) ?? (() => {}),
        info: console.info?.bind(console) ?? (() => {}),
        warn: console.warn?.bind(console) ?? (() => {}),
        error: console.error?.bind(console) ?? (() => {}),
        debug: console.debug?.bind(console) ?? (() => {}),
        groupCollapsed: console.groupCollapsed?.bind(console) ?? (() => {}),
        groupEnd: console.groupEnd?.bind(console) ?? (() => {}),
        table: console.table?.bind(console) ?? (() => {}),
      };
    } catch (e) {
      return {
        log: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
        groupCollapsed: () => {},
        groupEnd: () => {},
        table: () => {},
      };
    }
  })();

  let devMode = null;
  let seq = 0;
  let t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  let prodBannerPrinted = false;

  function detectDevMode() {
    // Bundled builds can inject true (boolean literal) via Rollup replace.
    // In unbundled dev (native modules), fall back to documented detection rules.
    try {
      if (typeof true === 'boolean') return true;
    } catch (e) {
      // true not defined
    }

    try {
      const port = String(globalThis?.location?.port ?? '');
      if (port === '8001') return true;
    } catch (e) {}

    try {
      // Docs: DEV if page contains `<script type="module" src="main.js">`
      const scripts = Array.from(document.scripts || []);
      const hasModuleMain = scripts.some((s) => {
        const type = (s.getAttribute('type') || '').toLowerCase();
        if (type !== 'module') return false;
        const src = s.getAttribute('src') || '';
        return /(^|\/)main\.js(\?|#|$)/.test(src);
      });
      if (hasModuleMain) return true;
    } catch (e) {}

    return false;
  }

  function isDev() {
    if (devMode === null) devMode = detectDevMode();
    return devMode;
  }

  // Color palette matching ball distribution (Industrial Teal light mode)
  // Weights: 50%, 25%, 12%, 6%, 3%, 2%, 1%, 1%
  const CONSOLE_COLORS = [
    '#b7bcb7', // gray (dominant)
    '#d0d0d0', // light gray
    '#ffffff', // white
    '#00695c', // teal (accent)
    '#1a1a1a', // near-black (readable)
    '#ff4013', // orange
    '#0d5cb6', // blue
    '#ffa000', // amber
  ];
  const COLOR_WEIGHTS = [0.50, 0.25, 0.12, 0.06, 0.03, 0.02, 0.01, 0.01];

  function pickWeightedColor() {
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < COLOR_WEIGHTS.length; i++) {
      cumulative += COLOR_WEIGHTS[i];
      if (r <= cumulative) return CONSOLE_COLORS[i];
    }
    return CONSOLE_COLORS[0];
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildColorMap(ascii, clusterSize = 3) {
    // Count total visible clusters (non-whitespace-only)
    const clusters = [];
    for (let row = 0; row < ascii.length; row++) {
      const line = ascii[row];
      for (let i = 0; i < line.length; i += clusterSize) {
        const chunk = line.slice(i, i + clusterSize);
        clusters.push({ row, col: i, visible: chunk.trim().length > 0 });
      }
    }
    
    const visibleIndices = clusters
      .map((c, i) => (c.visible ? i : -1))
      .filter((i) => i >= 0);
    
    // Guarantee all 8 colors appear at least once
    const colorAssignments = new Array(clusters.length).fill(null);
    const shuffledVisible = shuffle([...visibleIndices]);
    
    // Assign one of each color to the first 8 visible clusters
    for (let i = 0; i < Math.min(8, shuffledVisible.length); i++) {
      colorAssignments[shuffledVisible[i]] = CONSOLE_COLORS[i];
    }
    
    // Fill remaining visible clusters with weighted random
    for (const idx of visibleIndices) {
      if (colorAssignments[idx] === null) {
        colorAssignments[idx] = pickWeightedColor();
      }
    }
    
    // Non-visible clusters get transparent
    for (let i = 0; i < clusters.length; i++) {
      if (colorAssignments[i] === null) {
        colorAssignments[i] = 'transparent';
      }
    }
    
    return { clusters, colorAssignments };
  }

  function colorizeAsciiLines(ascii, clusterSize = 3) {
    const { colorAssignments } = buildColorMap(ascii, clusterSize);
    const results = [];
    let clusterIdx = 0;
    
    for (const line of ascii) {
      let format = '';
      const styles = [];
      for (let i = 0; i < line.length; i += clusterSize) {
        const chunk = line.slice(i, i + clusterSize);
        format += '%c' + chunk;
        const color = colorAssignments[clusterIdx];
        styles.push(`color: ${color}; font-family: monospace; font-weight: bold;`);
        clusterIdx++;
      }
      results.push([format, ...styles]);
    }
    
    return results;
  }

  function initConsolePolicy({
    sentence = 'Curious mind detected. Design meets engineering at 60fps.',
    ascii = [
      '██████  ███████  ██████ ██   ██',
      '██   ██ ██      ██      ██  ██ ',
      '██████  █████   ██      █████  ',
      '██   ██ ██      ██      ██  ██ ',
      '██████  ███████  ██████ ██   ██',
    ],
  } = {}) {
    // Only apply the policy once.
    if (prodBannerPrinted) return;

    const dev = isDev();
    if (dev) return;

    prodBannerPrinted = true;

    // Production: styled banner + multi-colored ASCII, then silence non-error logs.
    try {
      // Print sentence with subtle styling
      rawConsole.log('%c' + sentence, 'color: #888; font-style: italic;');
      rawConsole.log(''); // spacer
      // Print ASCII with distributed colors (all 8 guaranteed to appear)
      const coloredLines = colorizeAsciiLines(ascii, 3);
      for (const args of coloredLines) {
        rawConsole.log(...args);
      }
      rawConsole.log(''); // spacer
      // Copyright notice
      const year = new Date().getFullYear();
      rawConsole.log(
        '%c© ' + year + ' Alexander Beck Studio. All rights reserved. Unauthorized reproduction prohibited.',
        'color: #555; font-size: 10px;'
      );
    } catch (e) {
      // If console is not writable, ignore.
    }

    try {
      // Keep console.error intact for real failures; silence everything else.
      console.log = () => {};
      console.info = () => {};
      console.warn = () => {};
      console.debug = () => {};
      console.table = () => {};
      console.group = () => {};
      console.groupCollapsed = () => {};
      console.groupEnd = () => {};
    } catch (e) {}
  }

  function group(label) {
    if (!isDev()) return;
    rawConsole.groupCollapsed(label);
  }

  function groupEnd() {
    if (!isDev()) return;
    rawConsole.groupEnd();
  }

  function log(message, data) {
    if (!isDev()) return;
    const dt = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0;
    seq += 1;
    {
      rawConsole.log(`[${String(seq).padStart(2, '0')}] +${dt.toFixed(1)}ms ${message}`);
    }
  }

  function mark(name) {
    if (!isDev()) return;
    try {
      performance.mark(name);
    } catch (e) {}
  }

  function measure(name, startMark, endMark) {
    if (!isDev()) return null;
    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name);
      const last = entries && entries.length ? entries[entries.length - 1] : null;
      return last ? last.duration : null;
    } catch (e) {
      return null;
    }
  }

  function table(rows) {
    if (!isDev()) return;
    try {
      rawConsole.table(rows);
    } catch (e) {}
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    MODERN DARK MODE SYSTEM (Best Practices)                 ║
  // ║          Native feel with prefers-color-scheme + manual override            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // Theme states: 'auto', 'light', 'dark'
  let currentTheme = 'light'; // Default to light mode
  let systemPreference = 'light';
  let isDarkModeInitialized = false;

  // Fallback colors if CSS vars not available
  // MUST match --frame-color-light / --frame-color-dark in main.css
  const FALLBACK_COLORS = {
    light: '#0a0a0a',  // Dark frame even in light mode
    dark: '#0a0a0a'    // Dark frame in dark mode (seamless)
  };

  /**
   * Read CSS variable from :root, with fallback
   */
  function readCssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  /**
   * Detect system color scheme preference
   */
  function detectSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Update browser chrome/theme color for Safari and Chrome
   * Reads from CSS variables (--chrome-bg*) for unified color management
   */
  function updateThemeColor(isDark) {
    // Read colors from CSS variables (single source of truth)
    const lightColor = readCssVar('--chrome-bg-light', FALLBACK_COLORS.light);
    const darkColor = readCssVar('--chrome-bg-dark', FALLBACK_COLORS.dark);
    const currentColor = isDark ? darkColor : lightColor;
    
    // Update existing meta tag or create new one
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = currentColor;
    
    // Safari-specific: Update for both light and dark modes
    let metaThemeLight = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
    if (!metaThemeLight) {
      metaThemeLight = document.createElement('meta');
      metaThemeLight.name = 'theme-color';
      metaThemeLight.media = '(prefers-color-scheme: light)';
      document.head.appendChild(metaThemeLight);
    }
    metaThemeLight.content = lightColor;
    
    let metaThemeDark = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
    if (!metaThemeDark) {
      metaThemeDark = document.createElement('meta');
      metaThemeDark.name = 'theme-color';
      metaThemeDark.media = '(prefers-color-scheme: dark)';
      document.head.appendChild(metaThemeDark);
    }
    metaThemeDark.content = darkColor;
  }

  /**
   * Apply dark mode to DOM
   */
  function applyDarkModeToDOM(isDark) {
    const globals = getGlobals();
    globals.isDarkMode = isDark;
    
    // Set color-scheme for native form controls (Safari)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    
    // Apply dark-mode class
    if (isDark) {
      globals.container?.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    } else {
      globals.container?.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
    }
    
    // Update browser chrome color
    updateThemeColor(isDark);
    
    // Switch color palette variant
    applyColorTemplate(globals.currentTemplate);
    
    // Update UI
    updateSegmentControl();
  }

  /**
   * Update segment control UI
   */
  function updateSegmentControl() {
    const autoBtn = document.getElementById('themeAuto');
    const lightBtn = document.getElementById('themeLight');
    const darkBtn = document.getElementById('themeDark');
    
    if (!autoBtn || !lightBtn || !darkBtn) return;
    
    // Remove active class from all
    [autoBtn, lightBtn, darkBtn].forEach(btn => btn.classList.remove('active'));
    
    // Add active to current
    if (currentTheme === 'auto') {
      autoBtn.classList.add('active');
    } else if (currentTheme === 'light') {
      lightBtn.classList.add('active');
    } else {
      darkBtn.classList.add('active');
    }
    
    // Update status text
    const status = document.getElementById('themeStatus');
    if (status) {
      const globals = getGlobals();
      if (currentTheme === 'auto') {
        status.textContent = globals.isDarkMode ? '🌙 Auto (Dark)' : '☀️ Auto (Light)';
      } else if (currentTheme === 'light') {
        status.textContent = '☀️ Light Mode';
      } else {
        status.textContent = '🌙 Dark Mode';
      }
    }
  }

  /**
   * Set theme (auto, light, or dark)
   */
  function setTheme(theme) {
    currentTheme = theme;
    
    let shouldBeDark = false;
    
    if (theme === 'auto') {
      shouldBeDark = systemPreference === 'dark';
    } else if (theme === 'dark') {
      shouldBeDark = true;
    } else {
      shouldBeDark = false;
    }
    
    applyDarkModeToDOM(shouldBeDark);
    
    // Save preference
    try {
      localStorage.setItem('theme-preference', theme);
    } catch (e) {
      // localStorage unavailable
    }
    
    log(`🎨 Theme set to: ${theme} (rendering: ${shouldBeDark ? 'dark' : 'light'})`);
  }

  /**
   * Initialize dark mode system
   */
  function initializeDarkMode() {
    if (isDarkModeInitialized) return;
    isDarkModeInitialized = true;

    // Detect system preference (for auto mode later)
    systemPreference = detectSystemPreference();
    log(`🖥️ System prefers: ${systemPreference}`);
    
    // FORCE START IN LIGHT MODE (ignore saved preference on initial load)
    // User can still switch modes via the theme buttons
    setTheme('light');
    
    // Setup segment control listeners
    const autoBtn = document.getElementById('themeAuto');
    const lightBtn = document.getElementById('themeLight');
    const darkBtn = document.getElementById('themeDark');
    
    if (autoBtn) autoBtn.addEventListener('click', () => setTheme('auto'));
    if (lightBtn) lightBtn.addEventListener('click', () => setTheme('light'));
    if (darkBtn) darkBtn.addEventListener('click', () => setTheme('dark'));
    
    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        systemPreference = e.matches ? 'dark' : 'light';
        log(`🖥️ System preference changed to: ${systemPreference}`);
        
        // If in auto mode, update
        if (currentTheme === 'auto') {
          setTheme('auto');
        }
      });
    }
    log('✓ Modern dark mode initialized');
  }

  /**
   * Get current theme
   */
  function getCurrentTheme() {
    return currentTheme;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      LOCALSTORAGE PERSISTENCE                                ║
  // ║              Extracted from balls-source.html lines 1587-1748                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function saveSettings() {
    {
      console.log('⚠️ localStorage is disabled');
      return;
    }
  }

  function loadSettings() {
    {
      console.log('⚠️ localStorage is disabled - using defaults');
      return false;
    }
  }

  function autoSaveSettings() {
    clearTimeout(window.settingsSaveTimeout);
    window.settingsSaveTimeout = setTimeout(saveSettings, 500);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                     CENTRALIZED CONTROL REGISTRY                             ║
  // ║        Single source of truth for all panel controls                         ║
  // ║        Supports visibility toggling and dynamic HTML generation              ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // Will be set by main.js to avoid circular dependency
  let applyVisualCSSVars$1 = null;
  function setApplyVisualCSSVars(fn) {
    applyVisualCSSVars$1 = fn;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTROL VISIBILITY STATE
  // Which controls are visible in the panel (persisted to localStorage)
  // ═══════════════════════════════════════════════════════════════════════════════

  const VISIBILITY_STORAGE_KEY = 'panel_control_visibility';

  let controlVisibility = {};

  function loadVisibility() {
    try {
      const stored = localStorage.getItem(VISIBILITY_STORAGE_KEY);
      if (stored) controlVisibility = JSON.parse(stored);
    } catch (e) {
      controlVisibility = {};
    }
  }

  function isControlVisible(id) {
    // Default to true if not specified
    return controlVisibility[id] !== false;
  }

  // Initialize visibility state
  loadVisibility();

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTROL REGISTRY
  // Complete definition of ALL controls with metadata
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Control definition schema:
   * {
   *   id: string,           // Unique identifier (matches slider ID without 'Slider' suffix)
   *   label: string,        // Display label
   *   stateKey: string,     // Key in global state to read/write
   *   type: 'range' | 'checkbox' | 'select',
   *   min?: number,         // For range inputs
   *   max?: number,
   *   step?: number,
   *   default: number,      // Default value
   *   format: (v) => string, // Format value for display
   *   parse: (v) => number,  // Parse input value
   *   onChange?: (g, val) => void, // Custom handler after state update
   * }
   */

  const CONTROL_SECTIONS = {
    // ═══════════════════════════════════════════════════════════════════════════
    // BALLS - Size, softness, spacing
    // ═══════════════════════════════════════════════════════════════════════════
    balls: {
      title: 'Balls',
      icon: '🎱',
      defaultOpen: false,
      controls: [
        {
          id: 'sizeGlobal',
          label: 'Size',
          stateKey: 'sizeScale',
          type: 'range',
          min: 0.1, max: 6.0, step: 0.05,
          default: 0.8,
          format: v => v.toFixed(2),
          parse: parseFloat,
          onChange: (g, val) => {
            // Use updateBallSizes to apply both sizeScale and responsiveScale
            Promise.resolve().then(function () { return state$1; }).then(({ updateBallSizes }) => {
              updateBallSizes();
              const newSize = (g.R_MIN + g.R_MAX) / 2;
              g.balls.forEach(b => { b.r = newSize; b.rBase = newSize; });
            });
            Promise.resolve().then(function () { return cursor; }).then(({ updateCursorSize }) => {
              updateCursorSize();
            });
          }
        },
        {
          id: 'responsiveScaleMobile',
          label: 'Mobile Scale',
          stateKey: 'responsiveScaleMobile',
          type: 'range',
          min: 0.5, max: 1.5, step: 0.05,
          default: 0.75,
          format: v => v.toFixed(2) + 'x',
          parse: parseFloat,
          hint: 'Ball size multiplier for iPad/iPhone (requires reload)',
          onChange: (g, val) => {
            // Refresh responsive scale detection
            Promise.resolve().then(function () { return state$1; }).then(({ detectResponsiveScale }) => {
              detectResponsiveScale();
              const newSize = (g.R_MIN + g.R_MAX) / 2;
              g.balls.forEach(b => { b.r = newSize; b.rBase = newSize; });
            });
          }
        },
        {
          id: 'ballSoftnessGlobal',
          label: 'Softness',
          stateKey: 'ballSoftness',
          type: 'range',
          min: 0, max: 100, step: 1,
          default: 20,
          format: v => String(v),
          parse: v => parseInt(v, 10)
        },
        {
          id: 'ballSpacing',
          label: 'Spacing',
          stateKey: 'ballSpacing',
          type: 'range',
          min: 0, max: 10, step: 0.5,
          default: 2.5,
          format: v => v.toFixed(1) + 'px',
          parse: parseFloat
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CURSOR
    // ═══════════════════════════════════════════════════════════════════════════
    cursor: {
      title: 'Cursor',
      icon: '👆',
      defaultOpen: false,
      controls: [
        {
          id: 'cursorSize',
          label: 'Size',
          stateKey: 'cursorSize',
          type: 'range',
          min: 0.1, max: 3.0, step: 0.05,
          default: 1.0,
          format: v => v.toFixed(2),
          parse: parseFloat,
          onChange: (g, val) => {
            Promise.resolve().then(function () { return cursor; }).then(({ updateCursorSize }) => {
              updateCursorSize();
            });
          }
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // FRAME - Color only (thickness/radius controlled via Layout section)
    // ═══════════════════════════════════════════════════════════════════════════
    frame: {
      title: 'Frame',
      icon: '🖼️',
      defaultOpen: false,
      controls: [
        {
          id: 'frameColor',
          label: 'Color',
          stateKey: 'frameColor',
          type: 'color',
          default: '#0a0a0a',
          onChange: (g, val) => {
            const root = document.documentElement;
            root.style.setProperty('--frame-color-light', val);
            root.style.setProperty('--frame-color-dark', val);
            root.style.setProperty('--wall-color', val);
            root.style.setProperty('--chrome-bg', val);
            root.style.setProperty('--chrome-bg-light', val);
            root.style.setProperty('--chrome-bg-dark', val);
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.content = val;
          }
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SHADOW - Inner shadow on container
    // ═══════════════════════════════════════════════════════════════════════════
    shadow: {
      title: 'Inner Shadow',
      icon: '🌑',
      defaultOpen: false,
      controls: [
        {
          id: 'containerInnerShadowOpacity',
          label: 'Strength',
          stateKey: 'containerInnerShadowOpacity',
          type: 'range',
          min: 0.0, max: 0.4, step: 0.01,
          default: 0.12,
          format: v => v.toFixed(2),
          parse: parseFloat,
          cssVar: '--container-inner-shadow-opacity'
        },
        {
          id: 'containerInnerShadowBlur',
          label: 'Blur',
          stateKey: 'containerInnerShadowBlur',
          type: 'range',
          min: 0, max: 250, step: 5,
          default: 80,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10),
          cssVar: '--container-inner-shadow-blur'
        },
        {
          id: 'containerInnerShadowSpread',
          label: 'Spread',
          stateKey: 'containerInnerShadowSpread',
          type: 'range',
          min: -50, max: 50, step: 1,
          default: -10,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10),
          cssVar: '--container-inner-shadow-spread'
        },
        {
          id: 'containerInnerShadowOffsetY',
          label: 'Offset Y',
          stateKey: 'containerInnerShadowOffsetY',
          type: 'range',
          min: -60, max: 60, step: 1,
          default: 0,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10),
          cssVar: '--container-inner-shadow-offset-y'
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // WOBBLE - Rubber wall physics
    // ═══════════════════════════════════════════════════════════════════════════
    wobble: {
      title: 'Wall Wobble',
      icon: '〰️',
      defaultOpen: false,
      controls: [
        {
          id: 'wallWobbleMaxDeform',
          label: 'Strength',
          stateKey: 'wallWobbleMaxDeform',
          type: 'range',
          min: 0, max: 150, step: 1,
          default: 148,
          format: v => `${v}px`,
          parse: v => parseInt(v, 10)
        },
        {
          id: 'wallWobbleStiffness',
          label: 'Return Speed',
          stateKey: 'wallWobbleStiffness',
          type: 'range',
          min: 50, max: 3000, step: 10,
          default: 1300,
          format: v => String(v),
          parse: v => parseInt(v, 10)
        },
        {
          id: 'wallWobbleDamping',
          label: 'Damping',
          stateKey: 'wallWobbleDamping',
          type: 'range',
          min: 0, max: 80, step: 1,
          default: 34,
          format: v => String(v),
          parse: v => parseInt(v, 10)
        },
        {
          id: 'wallWobbleSigma',
          label: 'Impact Spread',
          stateKey: 'wallWobbleSigma',
          type: 'range',
          min: 0.5, max: 4.0, step: 0.1,
          default: 4.0,
          format: v => v.toFixed(1),
          parse: parseFloat
        },
        {
          id: 'wallWobbleCornerClamp',
          label: 'Corner Stickiness',
          stateKey: 'wallWobbleCornerClamp',
          type: 'range',
          min: 0.0, max: 1.0, step: 0.01,
          default: 1.00,
          format: v => v.toFixed(2),
          parse: parseFloat
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // NOISE - Texture overlay
    // ═══════════════════════════════════════════════════════════════════════════
    noise: {
      title: 'Noise',
      icon: '📺',
      defaultOpen: false,
      controls: [
        {
          id: 'noiseSizeBase',
          label: 'Back Size',
          stateKey: 'noiseSizeBase',
          type: 'range',
          min: 50, max: 200, step: 5,
          default: 100,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          cssVar: '--noise-size-base'
        },
        {
          id: 'noiseSizeTop',
          label: 'Front Size',
          stateKey: 'noiseSizeTop',
          type: 'range',
          min: 40, max: 150, step: 5,
          default: 80,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          cssVar: '--noise-size-top'
        },
        {
          id: 'noiseBackOpacity',
          label: 'Back Opacity',
          stateKey: 'noiseBackOpacity',
          type: 'range',
          min: 0, max: 0.1, step: 0.001,
          default: 0.015,
          format: v => v.toFixed(3),
          parse: parseFloat,
          cssVar: '--noise-back-opacity'
        },
        {
          id: 'noiseFrontOpacity',
          label: 'Front Opacity',
          stateKey: 'noiseFrontOpacity',
          type: 'range',
          min: 0, max: 0.05, step: 0.001,
          default: 0.01,
          format: v => v.toFixed(3),
          parse: parseFloat,
          cssVar: '--noise-front-opacity'
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // MODE-SPECIFIC CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    pit: {
      title: 'Ball Pit',
      icon: '🎯',
      mode: 'pit',
      defaultOpen: false,
      controls: [
        {
          id: 'gravityPit',
          label: 'Gravity',
          stateKey: 'gravityMultiplierPit',
          type: 'range',
          min: 0, max: 2, step: 0.05,
          default: 1.1,
          format: v => v.toFixed(2),
          parse: parseFloat,
          onChange: (g, val) => {
            if (g.currentMode === 'pit') g.G = g.GE * val;
          }
        },
        {
          id: 'weightPit',
          label: 'Weight',
          stateKey: 'ballMassKg',
          type: 'range',
          min: 10, max: 200, step: 1,
          default: 129,
          format: v => v.toFixed(0),
          parse: parseFloat,
          onChange: (g, val) => {
            g.balls.forEach(b => { b.m = val; });
          }
        },
        {
          id: 'restitution',
          label: 'Bounciness',
          stateKey: 'REST',
          type: 'range',
          min: 0, max: 1, step: 0.01,
          default: 0.69,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'friction',
          label: 'Air Friction',
          stateKey: 'FRICTION',
          type: 'range',
          min: 0, max: 0.01, step: 0.0005,
          default: 0.006,
          format: v => v.toFixed(4),
          parse: parseFloat
        },
        {
          id: 'repelSize',
          label: 'Repel Size',
          stateKey: 'repelRadius',
          type: 'range',
          min: 50, max: 1000, step: 5,
          default: 120,
          format: v => v.toFixed(0),
          parse: parseFloat
        },
        {
          id: 'repelPower',
          label: 'Repel Power',
          stateKey: 'repelPower',
          type: 'range',
          min: 0, max: 10000, step: 100,
          default: 8500,
          format: v => Math.round(v).toString(),
          parse: parseFloat,
          // Custom exponential mapping
          onChange: (g, sliderVal) => {
            const s = Math.max(0, Math.min(10000, sliderVal)) / 10000;
            g.repelPower = Math.pow(2, (s - 0.5) * 12) * 12000 * 2.0;
          }
        }
      ]
    },

    flies: {
      title: 'Flies',
      icon: '🕊️',
      mode: 'flies',
      defaultOpen: false,
      controls: [
        {
          id: 'fliesBallCount',
          label: 'Ball Count',
          stateKey: 'fliesBallCount',
          type: 'range',
          min: 20, max: 150, step: 5,
          default: 60,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'attractPower',
          label: 'Attraction',
          stateKey: 'attractionPower',
          type: 'range',
          min: 100, max: 8000, step: 50,
          default: 5000,
          format: v => Math.round(v).toString(),
          parse: parseFloat
        },
        {
          id: 'swarmSpeed',
          label: 'Swarm Speed',
          stateKey: 'swarmSpeed',
          type: 'range',
          min: 0.2, max: 5, step: 0.1,
          default: 0.4,
          format: v => v.toFixed(1),
          parse: parseFloat
        },
        {
          id: 'fliesSeparation',
          label: 'Separation',
          stateKey: 'fliesSeparation',
          type: 'range',
          min: 5000, max: 30000, step: 1000,
          default: 15000,
          format: v => Math.round(v).toString(),
          parse: parseFloat
        }
      ]
    },

    weightless: {
      title: 'Zero-G',
      icon: '🌌',
      mode: 'weightless',
      defaultOpen: false,
      controls: [
        {
          id: 'weightlessCount',
          label: 'Ball Count',
          stateKey: 'weightlessBallCount',
          type: 'range',
          min: 20, max: 200, step: 10,
          default: 80,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'weightlessSpeed',
          label: 'Initial Speed',
          stateKey: 'weightlessInitialSpeed',
          type: 'range',
          min: 100, max: 600, step: 25,
          default: 250,
          format: v => v.toFixed(0),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'weightlessBounce',
          label: 'Bounce',
          stateKey: 'weightlessBounce',
          type: 'range',
          min: 0.5, max: 1, step: 0.05,
          default: 0.95,
          format: v => v.toFixed(2),
          parse: parseFloat
        }
      ]
    },

    water: {
      title: 'Water',
      icon: '🌊',
      mode: 'water',
      defaultOpen: false,
      controls: [
        {
          id: 'waterBallCount',
          label: 'Ball Count',
          stateKey: 'waterBallCount',
          type: 'range',
          min: 50, max: 400, step: 10,
          default: 300,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'waterRippleStrength',
          label: 'Ripple Strength',
          stateKey: 'waterRippleStrength',
          type: 'range',
          min: 5000, max: 30000, step: 1000,
          default: 18000,
          format: v => v.toFixed(0),
          parse: parseFloat
        },
        {
          id: 'waterMotion',
          label: 'Motion',
          stateKey: 'waterDriftStrength',
          type: 'range',
          min: 0, max: 80, step: 1,
          default: 40,
          format: v => v.toFixed(0),
          parse: parseFloat,
          onChange: (g, val) => {
            g.waterInitialVelocity = val * 5;
          },
          reinitMode: true
        }
      ]
    },

    vortex: {
      title: 'Vortex',
      icon: '🌀',
      mode: 'vortex',
      defaultOpen: false,
      controls: [
        {
          id: 'vortexBallCount',
          label: 'Ball Count',
          stateKey: 'vortexBallCount',
          type: 'range',
          min: 50, max: 300, step: 10,
          default: 180,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'vortexSwirl',
          label: 'Swirl Strength',
          stateKey: 'vortexSwirlStrength',
          type: 'range',
          min: 100, max: 800, step: 20,
          default: 420,
          format: v => v.toFixed(0),
          parse: parseFloat
        },
        {
          id: 'vortexPull',
          label: 'Radial Pull',
          stateKey: 'vortexRadialPull',
          type: 'range',
          min: 0, max: 400, step: 10,
          default: 180,
          format: v => v.toFixed(0),
          parse: parseFloat
        }
      ]
    },

    'ping-pong': {
      title: 'Ping Pong',
      icon: '🏓',
      mode: 'ping-pong',
      defaultOpen: false,
      controls: [
        {
          id: 'pingPongBallCount',
          label: 'Ball Count',
          stateKey: 'pingPongBallCount',
          type: 'range',
          min: 10, max: 100, step: 5,
          default: 35,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'pingPongSpeed',
          label: 'Ball Speed',
          stateKey: 'pingPongSpeed',
          type: 'range',
          min: 200, max: 1200, step: 50,
          default: 800,
          format: v => v.toFixed(0),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'pingPongCursor',
          label: 'Cursor Size',
          stateKey: 'pingPongCursorRadius',
          type: 'range',
          min: 20, max: 200, step: 10,
          default: 50,
          format: v => v.toFixed(0),
          parse: parseFloat
        }
      ]
    },

    magnetic: {
      title: 'Magnetic',
      icon: '🧲',
      mode: 'magnetic',
      defaultOpen: false,
      controls: [
        {
          id: 'magneticBallCount',
          label: 'Ball Count',
          stateKey: 'magneticBallCount',
          type: 'range',
          min: 50, max: 300, step: 10,
          default: 180,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'magneticStrength',
          label: 'Strength',
          stateKey: 'magneticStrength',
          type: 'range',
          min: 10000, max: 100000, step: 5000,
          default: 65000,
          format: v => v.toFixed(0),
          parse: parseFloat
        },
        {
          id: 'magneticVelocity',
          label: 'Max Velocity',
          stateKey: 'magneticMaxVelocity',
          type: 'range',
          min: 500, max: 4000, step: 100,
          default: 2800,
          format: v => v.toFixed(0),
          parse: parseFloat
        }
      ]
    },

    bubbles: {
      title: 'Bubbles',
      icon: '🫧',
      mode: 'bubbles',
      defaultOpen: false,
      controls: [
        {
          id: 'bubblesRate',
          label: 'Bubble Rate',
          stateKey: 'bubblesSpawnRate',
          type: 'range',
          min: 1, max: 20, step: 1,
          default: 8,
          format: v => String(v),
          parse: v => parseInt(v, 10)
        },
        {
          id: 'bubblesSpeed',
          label: 'Rise Speed',
          stateKey: 'bubblesRiseSpeed',
          type: 'range',
          min: 50, max: 400, step: 25,
          default: 150,
          format: v => v.toFixed(0),
          parse: parseFloat
        },
        {
          id: 'bubblesWobble',
          label: 'Wobble',
          stateKey: 'bubblesWobble',
          type: 'range',
          min: 0, max: 100, step: 5,
          default: 40,
          format: v => v.toFixed(0),
          parse: parseFloat
        },
        {
          id: 'bubblesMax',
          label: 'Max Bubbles',
          stateKey: 'bubblesMaxCount',
          type: 'range',
          min: 50, max: 300, step: 10,
          default: 150,
          format: v => String(v),
          parse: v => parseInt(v, 10)
        },
        {
          id: 'bubblesDeflect',
          label: 'Cursor Deflection',
          stateKey: 'bubblesDeflectRadius',
          type: 'range',
          min: 20, max: 150, step: 10,
          default: 80,
          format: v => v.toFixed(0),
          parse: parseFloat
        }
      ]
    },

    tilt: {
      title: 'Tilt',
      icon: '⚖️',
      mode: 'tilt',
      defaultOpen: false,
      controls: [
        {
          id: 'tiltBallCount',
          label: 'Particle Count',
          stateKey: 'tiltBallCount',
          type: 'range',
          min: 100, max: 500, step: 10,
          default: 300,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'tiltMaxAngle',
          label: 'Max Angle',
          stateKey: 'tiltMaxAngle',
          type: 'range',
          min: 0.5, max: 10, step: 0.5,
          default: 2,
          format: v => v.toFixed(1) + '°',
          parse: parseFloat
        },
        {
          id: 'tiltLerpSpeed',
          label: 'Smoothness',
          stateKey: 'tiltLerpSpeed',
          type: 'range',
          min: 0.01, max: 0.5, step: 0.01,
          default: 0.08,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'tiltGlassMass',
          label: 'Particle Mass',
          stateKey: 'tiltGlassBallMass',
          type: 'range',
          min: 0.02, max: 0.3, step: 0.01,
          default: 0.08,
          format: v => v.toFixed(2) + 'x',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'tiltFriction',
          label: 'Friction',
          stateKey: 'tiltFriction',
          type: 'range',
          min: 0.002, max: 0.02, step: 0.001,
          default: 0.008,
          format: v => v.toFixed(3),
          parse: parseFloat
        }
      ]
    },

    kaleidoscope: {
      title: 'Kaleidoscope',
      icon: '🪞',
      mode: 'kaleidoscope',
      defaultOpen: false,
      controls: [
        {
          id: 'kaleiBallCount',
          label: 'Ball Count',
          stateKey: 'kaleidoscopeBallCount',
          type: 'range',
          min: 10, max: 200, step: 1,
          default: 23,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'kaleiSegments',
          label: 'Wedges',
          stateKey: 'kaleidoscopeSegments',
          type: 'range',
          min: 3, max: 24, step: 1,
          default: 12,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10)
        },
        {
          id: 'kaleiMirror',
          label: 'Mirror',
          stateKey: 'kaleidoscopeMirror',
          type: 'range',
          min: 0, max: 1, step: 1,
          default: 1,
          format: v => (v ? 'On' : 'Off'),
          parse: v => parseInt(v, 10)
        },
        {
          id: 'kaleiSpacing',
          label: 'Spacing',
          stateKey: 'kaleidoscopeBallSpacing',
          type: 'range',
          min: 0, max: 20, step: 0.5,
          default: 9,
          format: v => v.toFixed(1) + 'px',
          parse: parseFloat,
          onChange: (g, val) => {
            // Apply immediately only in Kaleidoscope, otherwise it would affect all modes.
            if (g.currentMode === 'kaleidoscope') {
              const canvas = g.canvas;
              const unit = canvas ? Math.max(0.35, Math.min(3.0, Math.min(canvas.width, canvas.height) / 1000)) : 1;
              g.ballSpacing = val * unit;
            }
          }
        },
        {
          id: 'kaleiSwirl',
          label: 'Swirl',
          stateKey: 'kaleidoscopeSwirlStrength',
          type: 'range',
          min: 0, max: 800, step: 5,
          default: 52,
          format: v => String(Math.round(v)),
          parse: parseFloat
        },
        {
          id: 'kaleiPull',
          label: 'Pull',
          stateKey: 'kaleidoscopeRadialPull',
          type: 'range',
          min: 0, max: 800, step: 10,
          default: 260,
          format: v => String(Math.round(v)),
          parse: parseFloat
        },
        {
          id: 'kaleiRotFollow',
          label: 'Rotation Follow',
          stateKey: 'kaleidoscopeRotationFollow',
          type: 'range',
          min: 0, max: 3, step: 0.05,
          default: 1.0,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'kaleiPan',
          label: 'Pan',
          stateKey: 'kaleidoscopePanStrength',
          type: 'range',
          min: 0, max: 2, step: 0.05,
          default: 0.75,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'kaleiEase',
          label: 'Easing',
          stateKey: 'kaleidoscopeEase',
          type: 'range',
          min: 0, max: 1, step: 0.01,
          default: 0.18,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'kaleiWander',
          label: 'Organic',
          stateKey: 'kaleidoscopeWander',
          type: 'range',
          min: 0, max: 1, step: 0.01,
          default: 0.25,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'kaleiMaxSpeed',
          label: 'Speed Clamp',
          stateKey: 'kaleidoscopeMaxSpeed',
          type: 'range',
          min: 300, max: 8000, step: 100,
          default: 2600,
          format: v => String(Math.round(v)),
          parse: parseFloat
        }
      ]
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // HTML GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════

  function generateControlHTML(control) {
    if (!isControlVisible(control.id)) return '';
    
    const sliderId = control.id + 'Slider';
    const valId = control.id + 'Val';
    const pickerId = control.id + 'Picker';
    
    // Color picker type
    if (control.type === 'color') {
      return `
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
          <span class="control-value" id="${valId}">${control.default}</span>
        </div>
        <input type="color" id="${pickerId}" value="${control.default}" aria-label="${control.label}" />
      </label>
      ${control.hint ? `<p class="control-hint">${control.hint}</p>` : ''}`;
    }
    
    // Default: range slider
    const hintHtml = control.hint ? `<p class="control-hint">${control.hint}</p>` : '';
    
    return `
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
          <span class="control-value" id="${valId}">${control.format(control.default)}</span>
        </div>
        <input type="range" id="${sliderId}" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.default}">
      </label>
      ${hintHtml}`;
  }

  function generateSectionHTML(key, section) {
    const visibleControls = section.controls.filter(c => isControlVisible(c.id));
    if (visibleControls.length === 0) return '';
    
    // Group controls by 'group' property
    let currentGroup = null;
    let html = '';
    
    for (const control of visibleControls) {
      // Insert group header if new group
      if (control.group && control.group !== currentGroup) {
        if (currentGroup !== null) html += '</div>'; // Close previous group
        html += `<div class="section-title" style="margin-top: 12px;">${control.group}</div><div class="group">`;
        currentGroup = control.group;
      } else if (!control.group && currentGroup !== null) {
        html += '</div>'; // Close group, back to ungrouped
        currentGroup = null;
      }
      
      html += generateControlHTML(control);
    }
    
    // Close any open group
    if (currentGroup !== null) html += '</div>';
    
    // Wrap in the unified accordion style used by the master panel
    // (single scroll container in `.panel-content`, no nested overflow traps)
    const detailsAttrs = `${section.defaultOpen ? 'open' : ''}`;
    const header = `
    <summary class="panel-section-header">
      ${section.icon ? `<span class="section-icon">${section.icon}</span>` : ''}
      <span class="section-label">${section.title}</span>
    </summary>`;
    const body = `<div class="panel-section-content">${html}</div>`;

    if (section.mode) {
      return `
      <div id="${section.mode}Controls" class="mode-controls">
        <details class="panel-section-accordion" ${detailsAttrs}>
          ${header}
          ${body}
        </details>
      </div>`;
    }

    return `
    <details class="panel-section-accordion" ${detailsAttrs}>
      ${header}
      ${body}
    </details>`;
  }

  function generatePanelHTML() {
    // NOTE: Don't wrap in .panel-content here - panel-dock.js creates that wrapper

    let html = `
    <!-- Screen reader announcements -->
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only" id="announcer"></div>

    <!-- Theme -->
    <details class="panel-section-accordion" open>
      <summary class="panel-section-header">
        <span class="section-icon">🎨</span>
        <span class="section-label">Theme</span>
      </summary>
      <div class="panel-section-content">
        <div class="theme-segment-control" role="group" aria-label="Theme selector">
          <button id="themeAuto" class="theme-segment-btn" aria-label="Auto theme">Auto</button>
          <button id="themeLight" class="theme-segment-btn active" aria-label="Light theme">Light</button>
          <button id="themeDark" class="theme-segment-btn" aria-label="Dark theme">Dark</button>
        </div>
        <div id="themeStatus" class="panel-status">☀️ Light Mode</div>
      </div>
    </details>

    <!-- Mode -->
    <details class="panel-section-accordion" open>
      <summary class="panel-section-header">
        <span class="section-icon">🎛️</span>
        <span class="section-label">Mode</span>
      </summary>
      <div class="panel-section-content">
        <div class="mode-switcher" role="group" aria-label="Simulation mode selector">
          <button class="mode-button active" data-mode="worms" aria-label="Worms mode">🪱 Worms</button>
          <button class="mode-button" data-mode="pit" aria-label="Ball Pit mode">🎯 Pit</button>
          <button class="mode-button" data-mode="flies" aria-label="Flies mode">🕊️ Flies</button>
          <button class="mode-button" data-mode="weightless" aria-label="Zero-G mode">🌌 Zero-G</button>
          <button class="mode-button" data-mode="water" aria-label="Water mode">🌊 Water</button>
          <button class="mode-button" data-mode="vortex" aria-label="Vortex mode">🌀 Vortex</button>
          <button class="mode-button" data-mode="ping-pong" aria-label="Ping Pong mode">🏓 Pong</button>
          <button class="mode-button" data-mode="magnetic" aria-label="Magnetic mode">🧲 Magnet</button>
          <button class="mode-button" data-mode="bubbles" aria-label="Bubbles mode">🫧 Bubbles</button>
          <button class="mode-button" data-mode="kaleidoscope" aria-label="Kaleidoscope mode">🪞 Kalei</button>
        </div>
      </div>
    </details>`;

    // Non-mode sections
    for (const [key, section] of Object.entries(CONTROL_SECTIONS)) {
      if (!section.mode) {
        html += generateSectionHTML(key, section);
      }
    }
    
    // Colors (special handling)
    html += `
    <details class="panel-section-accordion">
      <summary class="panel-section-header">
        <span class="section-icon">🌈</span>
        <span class="section-label">Colors</span>
      </summary>
      <div class="panel-section-content">
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Color Template</span>
            <span class="control-value"></span>
          </div>
          <select id="colorSelect"></select>
        </label>
      </div>
    </details>`;
    
    // Mode-specific sections
    for (const [key, section] of Object.entries(CONTROL_SECTIONS)) {
      if (section.mode) {
        html += generateSectionHTML(key, section);
      }
    }
    
    // Footer
    html += `
    <div class="panel-section panel-section--action">
      <button id="saveConfigBtn" class="primary">💾 Save Config</button>
    </div>
    <div class="panel-footer">
      <kbd>R</kbd> reset · <kbd>/</kbd> panel · <kbd>9</kbd> kalei · Worms has no key (yet)
    </div>`;
    
    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTROL BINDING (wire sliders to state)
  // ═══════════════════════════════════════════════════════════════════════════════

  function bindRegisteredControls() {
    const g = getGlobals();
    
    for (const [sectionKey, section] of Object.entries(CONTROL_SECTIONS)) {
      for (const control of section.controls) {
        const valId = control.id + 'Val';
        const valEl = document.getElementById(valId);
        
        // Color picker binding
        if (control.type === 'color') {
          const pickerId = control.id + 'Picker';
          const pickerEl = document.getElementById(pickerId);
          
          if (!pickerEl) continue;
          
          pickerEl.addEventListener('input', () => {
            const colorVal = pickerEl.value;
            
            // Update state
            if (control.stateKey) {
              g[control.stateKey] = colorVal;
            }
            
            // Custom handler (most color pickers use this for multi-var updates)
            if (control.onChange) {
              control.onChange(g, colorVal);
            }
            
            // Update display value
            if (valEl) {
              valEl.textContent = colorVal;
            }
            
            autoSaveSettings();
          });
          
          continue;
        }
        
        // Default: Range slider binding
        const sliderId = control.id + 'Slider';
        const el = document.getElementById(sliderId);
        
        if (!el) continue;
        
        el.addEventListener('input', () => {
          const rawVal = control.parse(el.value);
          
          // Update state (ALWAYS if stateKey exists)
          if (control.stateKey) {
            g[control.stateKey] = rawVal;
          }
          
          // Custom handler (AFTER state update)
          if (control.onChange) {
            control.onChange(g, rawVal);
          }
          
          // Update display value
          if (valEl) {
            const displayVal = control.stateKey ? g[control.stateKey] : rawVal;
            valEl.textContent = control.format(displayVal);
          }
          
          // Apply CSS variable if defined
          if (control.cssVar && applyVisualCSSVars$1) {
            // Map control key to CSS var config object
            const cssConfig = {};
            const cssKey = control.cssVar.replace('--', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            cssConfig[cssKey] = rawVal;
            applyVisualCSSVars$1(cssConfig);
          }
          
          // Re-init mode if needed
          if (control.reinitMode && g.currentMode === section.mode) {
            section.mode.replace('-', '');
            import(`../modes/${section.mode}.js`).then(mod => {
              const initFn = Object.values(mod).find(fn => 
                typeof fn === 'function' && fn.name.toLowerCase().includes('initialize')
              );
              if (initFn) initFn();
            }).catch(() => {});
          }
          
          autoSaveSettings();
        });
      }
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                         CONTROL PANEL HTML TEMPLATE                          ║
  // ║           Generated from centralized control-registry.js                     ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // For backwards compatibility, also export PANEL_HTML constant
  // Note: This won't update if visibility changes at runtime
  const PANEL_HTML = generatePanelHTML();

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            UI CONTROLS WIRING                                ║
  // ║              Thin orchestrator for panel controls                            ║
  // ║    All slider bindings are handled by control-registry.js                    ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  /**
   * Initialize all panel controls
   * - Registry handles all slider/picker bindings via bindRegisteredControls()
   * - This file handles only: mode buttons, color select, and UI updates
   */
  function setupControls() {
    // ═══════════════════════════════════════════════════════════════════════════
    // BIND ALL REGISTERED CONTROLS FROM REGISTRY (single source of truth)
    // ═══════════════════════════════════════════════════════════════════════════
    bindRegisteredControls();

    // ═══════════════════════════════════════════════════════════════════════════
    // MODE BUTTONS — Critical for panel mode switching
    // ═══════════════════════════════════════════════════════════════════════════
    const modeButtons = document.querySelectorAll('.mode-button');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.getAttribute('data-mode');
        console.log('Mode button clicked:', mode);
        setMode(mode);
        updateModeButtonsUI(mode);
      });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // COLOR TEMPLATE SELECT — Special handling (not in registry)
    // ═══════════════════════════════════════════════════════════════════════════
    populateColorSelect();
    const colorSelect = document.getElementById('colorSelect');
    if (colorSelect) {
      colorSelect.addEventListener('change', () => {
        applyColorTemplate(colorSelect.value);
        autoSaveSettings();
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // THEME BUTTONS — Manual binding (not in registry)
    // ═══════════════════════════════════════════════════════════════════════════
    const themeAuto = document.getElementById('themeAuto');
    const themeLight = document.getElementById('themeLight');
    const themeDark = document.getElementById('themeDark');
    
    // Theme buttons are handled by dark-mode-v2.js, just add visual feedback here
    [themeAuto, themeLight, themeDark].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          // Remove active from all, add to clicked
          [themeAuto, themeLight, themeDark].forEach(b => b?.classList.remove('active'));
          btn.classList.add('active');
        });
      }
    });
  }

  /**
   * Update mode button UI to reflect active mode
   */
  function updateModeButtonsUI(activeMode) {
    const buttons = document.querySelectorAll('.mode-button');
    buttons.forEach(btn => {
      const isActive = btn.getAttribute('data-mode') === activeMode;
      btn.classList.toggle('active', isActive);
    });
    
    // Show/hide mode-specific controls
    document.querySelectorAll('.mode-controls').forEach(el => el.classList.remove('active'));
    const controlId = activeMode + 'Controls';
    const activeControls = document.getElementById(controlId);
    if (activeControls) activeControls.classList.add('active');
    
    // Update announcer for accessibility
    const announcer = document.getElementById('announcer');
    if (announcer) {
      const modeNames = {
        'worms': 'Worms',
        'pit': 'Ball Pit',
        'flies': 'Flies to Light', 
        'weightless': 'Zero-G',
        'water': 'Water Swimming',
        'vortex': 'Vortex Sheets',
        'ping-pong': 'Ping Pong',
        'magnetic': 'Magnetic',
        'bubbles': 'Carbonated Bubbles',
        'kaleidoscope': 'Kaleidoscope'
      };
      announcer.textContent = `Switched to ${modeNames[activeMode] || activeMode} mode`;
    }
  }

  var controls = /*#__PURE__*/Object.freeze({
    __proto__: null,
    setupControls: setupControls,
    updateModeButtonsUI: updateModeButtonsUI
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                             BUILD / SAVE CONFIG                              ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function setupBuildControls() {
    const btn = document.getElementById('saveConfigBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const g = getGlobals();
      const config = {
        maxBalls: g.maxBalls,
        gravityMultiplier: g.gravityMultiplierPit,
        ballMass: g.ballMassKg,
        ballSpacing: g.ballSpacing,
        sizeScale: g.sizeScale,
        sizeVariation: g.sizeVariation,
        restitution: g.REST,
        friction: g.FRICTION,
        repelRadius: g.repelRadius,
        repelPower: g.repelPower,
        repelSoft: g.repelSoft,
        
        // Frame & Walls
        frameColor: g.frameColor,
        containerBorder: g.containerBorder,
        simulationPadding: g.simulationPadding,
        contentPadding: g.contentPadding,
        containerInnerShadowOpacity: g.containerInnerShadowOpacity,
        containerInnerShadowBlur: g.containerInnerShadowBlur,
        containerInnerShadowSpread: g.containerInnerShadowSpread,
        containerInnerShadowOffsetY: g.containerInnerShadowOffsetY,
        
        // Noise
        noiseSizeBase: g.noiseSizeBase,
        noiseSizeTop: g.noiseSizeTop,
        noiseBackOpacity: g.noiseBackOpacity,
        noiseFrontOpacity: g.noiseFrontOpacity,
        noiseBackOpacityDark: g.noiseBackOpacityDark,
        noiseFrontOpacityDark: g.noiseFrontOpacityDark,

        wallThickness: g.wallThickness,
        wallRadius: g.wallRadius,
        wallInset: g.wallInset,
        wallWobbleMaxDeform: g.wallWobbleMaxDeform,
        wallWobbleStiffness: g.wallWobbleStiffness,
        wallWobbleDamping: g.wallWobbleDamping,
        wallWobbleSigma: g.wallWobbleSigma,
        wallWobbleCornerClamp: g.wallWobbleCornerClamp,
        
        cursorColorIndex: 5,
        enableLOD: false
      };
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'current-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    SOUND CONTROL REGISTRY                                   ║
  // ║        Centralized definition of all sound panel controls                   ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  /**
   * Sound Control Registry
   * 
   * Each control defines:
   * - id: matches CONFIG key in sound-engine.js
   * - label: display label
   * - min/max/step: slider range
   * - format: function to format display value
   * - toConfig: function to convert slider value to CONFIG value
   * - fromConfig: function to convert CONFIG value to slider value
   * - group: optional grouping
   */

  const SOUND_CONTROLS = {
    // ═══════════════════════════════════════════════════════════════════════════════
    // CORE (most important for quick tweaking)
    // ═══════════════════════════════════════════════════════════════════════════════
    core: {
      title: 'Core',
      controls: [
        {
          id: 'masterGain',
          label: 'Master Volume',
          min: 10, max: 100, step: 1,
          format: v => `${Math.round(v)}%`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
        {
          id: 'collisionMinImpact',
          label: 'Silence Threshold',
          min: 20, max: 85, step: 1,
          format: v => `${Math.round(v)}%`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // ENVELOPE (attack/decay shape)
    // ═══════════════════════════════════════════════════════════════════════════════
    envelope: {
      title: 'Envelope',
      controls: [
        {
          id: 'decayTime',
          label: 'Click Length',
          min: 20, max: 180, step: 1,
          format: v => `${Math.round(v)}ms`,
          toConfig: v => v / 1000,
          fromConfig: v => v * 1000,
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // TONE (filter/harmonic character)
    // ═══════════════════════════════════════════════════════════════════════════════
    tone: {
      title: 'Tone',
      controls: [
        {
          id: 'filterBaseFreq',
          label: 'Brightness',
          min: 300, max: 6000, step: 50,
          format: v => `${Math.round(v)}Hz`,
          toConfig: v => v,
          fromConfig: v => v,
        },
        {
          id: 'harmonicGain',
          label: 'Warmth',
          min: 0, max: 50, step: 1,
          format: v => `${Math.round(v)}%`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
        {
          id: 'filterQ',
          label: 'Resonance',
          min: 10, max: 200, step: 5,
          format: v => `${(v / 100).toFixed(2)}`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // CRYSTAL (pitch + sparkle character)
    // ═══════════════════════════════════════════════════════════════════════════════
    crystal: {
      title: 'Crystal',
      controls: [
        {
          id: 'pitchMinHz',
          label: 'Pitch Low',
          min: 80, max: 1200, step: 10,
          format: v => `${Math.round(v)}Hz`,
          toConfig: v => v,
          fromConfig: v => v,
        },
        {
          id: 'pitchMaxHz',
          label: 'Pitch High',
          min: 200, max: 4000, step: 20,
          format: v => `${Math.round(v)}Hz`,
          toConfig: v => v,
          fromConfig: v => v,
        },
        {
          id: 'pitchCurve',
          label: 'Pitch Curve',
          min: 70, max: 160, step: 1,
          format: v => `${(v / 100).toFixed(2)}×`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
        {
          id: 'sparkleGain',
          label: 'Sparkle',
          min: 0, max: 35, step: 1,
          format: v => `${Math.round(v)}%`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
        {
          id: 'sparkleRatioMin',
          label: 'Sparkle Min',
          min: 120, max: 600, step: 10,
          format: v => `${(v / 100).toFixed(2)}×`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
        {
          id: 'sparkleRatioMax',
          label: 'Sparkle Max',
          min: 160, max: 800, step: 10,
          format: v => `${(v / 100).toFixed(2)}×`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
        {
          id: 'sparkleDecayMul',
          label: 'Sparkle Decay',
          min: 20, max: 95, step: 1,
          format: v => `${Math.round(v)}%`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
        {
          id: 'noiseTransientQ',
          label: 'Sparkle Q',
          min: 60, max: 600, step: 5,
          format: v => `${(v / 100).toFixed(2)}`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // SPACE (reverb)
    // ═══════════════════════════════════════════════════════════════════════════════
    space: {
      title: 'Space',
      controls: [
        {
          id: 'reverbWetMix',
          label: 'Reverb Mix',
          min: 0, max: 50, step: 1,
          format: v => `${Math.round(v)}%`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
        {
          id: 'reverbDecay',
          label: 'Room Size',
          min: 5, max: 80, step: 1,
          format: v => `${(v / 100).toFixed(2)}s`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // DYNAMICS (gain limits)
    // ═══════════════════════════════════════════════════════════════════════════════
    dynamics: {
      title: 'Dynamics',
      controls: [
        {
          id: 'minGain',
          label: 'Min Hit Volume',
          min: 0, max: 20, step: 1,
          format: v => `${Math.round(v)}%`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
        {
          id: 'maxGain',
          label: 'Max Hit Volume',
          min: 5, max: 50, step: 1,
          format: v => `${Math.round(v)}%`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // REALISM (what makes it sound alive)
    // ═══════════════════════════════════════════════════════════════════════════════
    realism: {
      title: 'Realism',
      controls: [
        {
          id: 'noiseTransientGain',
          label: 'Impact Snap',
          min: 0, max: 80, step: 1,
          format: v => `${Math.round(v)}%`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
        {
          id: 'varianceGain',
          label: 'Volume Variance',
          min: 0, max: 50, step: 1,
          format: v => `±${Math.round(v)}%`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
        {
          id: 'variancePitch',
          label: 'Pitch Variance',
          min: 0, max: 25, step: 1,
          format: v => `±${Math.round(v)}%`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
        {
          id: 'velocityNoiseScale',
          label: 'Hard Hit Crack',
          min: 100, max: 500, step: 10,
          format: v => `${(v / 100).toFixed(1)}×`,
          toConfig: v => v / 100,
          fromConfig: v => v * 100,
        },
      ]
    },
  };

  /**
   * Generate HTML for all sound controls
   */
  function generateSoundControlsHTML() {
    let html = '';
    
    for (const [sectionKey, section] of Object.entries(SOUND_CONTROLS)) {
      html += `<div class="sound-dock__section">`;
      html += `<div class="sound-dock__section-title">${section.title}</div>`;
      html += `<div class="sound-dock__group">`;
      
      for (const control of section.controls) {
        html += `
        <label class="sound-dock__row">
          <span class="sound-dock__label">${control.label}</span>
          <input type="range" 
            id="sound_${control.id}" 
            class="sound-dock__slider" 
            min="${control.min}" 
            max="${control.max}" 
            step="${control.step}">
          <span class="sound-dock__val" id="sound_${control.id}_val">${control.format(control.fromConfig(0))}</span>
        </label>`;
      }
      
      html += `</div></div>`;
    }
    
    return html;
  }

  /**
   * Bind all sound controls to the sound engine
   */
  function bindSoundControls(panel, getSoundConfig, updateSoundConfig) {
    const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

    for (const section of Object.values(SOUND_CONTROLS)) {
      for (const control of section.controls) {
        const slider = panel.querySelector(`#sound_${control.id}`);
        const valDisplay = panel.querySelector(`#sound_${control.id}_val`);
        
        if (!slider) continue;

        const applyRawValue = (rawValue) => {
          const min = parseFloat(slider.min);
          const max = parseFloat(slider.max);
          const next = clamp(rawValue, min, max);
          slider.value = String(next);
          const configValue = control.toConfig(next);
          if (valDisplay) valDisplay.textContent = control.format(next);
          updateSoundConfig({ [control.id]: configValue });
        };
        
        slider.addEventListener('input', () => {
          applyRawValue(parseFloat(slider.value));
        });

        // DAW-style: scroll to adjust (Shift/Alt = finer)
        slider.addEventListener('wheel', (e) => {
          // Avoid fighting browser zoom gestures (trackpad pinch)
          if (e.ctrlKey) return;

          const stepBase = parseFloat(slider.step) || 1;
          const fineMul = e.altKey ? 0.1 : (e.shiftKey ? 0.2 : 1.0);
          const step = stepBase * fineMul;

          const dir = e.deltaY < 0 ? 1 : -1;
          const current = parseFloat(slider.value);

          e.preventDefault();
          applyRawValue(current + dir * step);
        }, { passive: false });

        // Convenience: wheel over the value readout too
        if (valDisplay) {
          valDisplay.addEventListener('wheel', (e) => {
            if (e.ctrlKey) return;

            const stepBase = parseFloat(slider.step) || 1;
            const fineMul = e.altKey ? 0.1 : (e.shiftKey ? 0.2 : 1.0);
            const step = stepBase * fineMul;

            const dir = e.deltaY < 0 ? 1 : -1;
            const current = parseFloat(slider.value);

            e.preventDefault();
            applyRawValue(current + dir * step);
          }, { passive: false });
        }
      }
    }
  }

  /**
   * Sync all sound sliders to current config
   */
  function syncSoundControlsToConfig(panel, getSoundConfig) {
    const config = getSoundConfig();
    
    for (const section of Object.values(SOUND_CONTROLS)) {
      for (const control of section.controls) {
        const slider = panel.querySelector(`#sound_${control.id}`);
        const valDisplay = panel.querySelector(`#sound_${control.id}_val`);
        
        if (!slider || config[control.id] === undefined) continue;
        
        const sliderValue = control.fromConfig(config[control.id]);
        slider.value = sliderValue;
        
        if (valDisplay) {
          valDisplay.textContent = control.format(sliderValue);
        }
      }
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                       UNIFIED MASTER PANEL                                   ║
  // ║           Single panel with collapsible sections                             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let dockElement = null;
  let masterPanelElement = null;

  // ════════════════════════════════════════════════════════════════════════════════
  // STATE PERSISTENCE
  // ════════════════════════════════════════════════════════════════════════════════

  const STORAGE_KEYS = {
    // v2: avoid inheriting old “too low” positions
    position: 'panel_dock_position_v2',
    dockHidden: 'panel_dock_hidden',
    panelCollapsed: 'master_panel_collapsed',
    panelSize: 'panel_dock_size'
  };

  function loadPanelCollapsed() {
    try {
      const v = localStorage.getItem(STORAGE_KEYS.panelCollapsed);
      // Default: collapsed (avoid obstructing content on first visit).
      if (v === null) return true;
      return v === 'true';
    } catch (e) {
      return true;
    }
  }

  function savePanelCollapsed(collapsed) {
    try {
      localStorage.setItem(STORAGE_KEYS.panelCollapsed, String(collapsed));
    } catch (e) {}
  }

  function saveDockHiddenState(hidden) {
    try {
      localStorage.setItem(STORAGE_KEYS.dockHidden, String(hidden));
    } catch (e) {}
  }

  function loadPanelSize() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.panelSize);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const width = Number(parsed.width);
      const height = Number(parsed.height);
      if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
      return {
        width: Math.round(width),
        height: Math.round(height),
      };
    } catch (e) {
      return null;
    }
  }

  function savePanelSizeFromElement(el) {
    try {
      if (!el) return;
      if (el.classList.contains('collapsed')) return;
      const rect = el.getBoundingClientRect();
      const next = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
      localStorage.setItem(STORAGE_KEYS.panelSize, JSON.stringify(next));
    } catch (e) {}
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // DRAG STATE
  // ════════════════════════════════════════════════════════════════════════════════

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let elementStartX = 0;
  let elementStartY = 0;

  // ════════════════════════════════════════════════════════════════════════════════
  // MASTER PANEL HTML
  // ════════════════════════════════════════════════════════════════════════════════

  function getMasterPanelContent() {
    // Get current CSS values for layout controls
    const getVar = (name) => {
      const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return parseInt(val) || 0;
    };
    const frameVal = getVar('--container-border') || 20;
    const radiusVal = getVar('--wall-radius') || 42;
    const contentPadVal = getVar('--content-padding') || 40;
    const g = getGlobals();
    const wallInsetVal = Math.max(0, Math.round(g.wallInset ?? 3));

    return `
    <!-- ═══════════════════════════════════════════════════════════════════════
         LAYOUT SECTION - Frame & Content Spacing
         ═══════════════════════════════════════════════════════════════════════ -->
    <details class="panel-section-accordion" id="layoutSection">
      <summary class="panel-section-header">
        <span class="section-icon">📐</span>
        <span class="section-label">Layout</span>
      </summary>
      <div class="panel-section-content">
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Frame</span>
            <span class="control-value" id="frameValue">${frameVal}px</span>
          </div>
          <input type="range" id="layoutFrame" min="0" max="100" value="${frameVal}" />
        </label>
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Content Padding</span>
            <span class="control-value" id="contentPadValue">${contentPadVal}px</span>
          </div>
          <input type="range" id="contentPadding" min="0" max="80" value="${contentPadVal}" />
        </label>
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Radius</span>
            <span class="control-value" id="radiusValue">${radiusVal}px</span>
          </div>
          <input type="range" id="layoutRadius" min="0" max="100" value="${radiusVal}" />
        </label>
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Wall Inset</span>
            <span class="control-value" id="wallInsetValue">${wallInsetVal}px</span>
          </div>
          <input type="range" id="layoutWallInset" min="0" max="20" value="${wallInsetVal}" />
        </label>
      </div>
    </details>

    <!-- ═══════════════════════════════════════════════════════════════════════
         SOUND SECTION
         ═══════════════════════════════════════════════════════════════════════ -->
    <details class="panel-section-accordion" id="soundSection">
      <summary class="panel-section-header">
        <span class="section-icon">🔊</span>
        <span class="section-label">Sound</span>
      </summary>
      <div class="panel-section-content">
        <div class="sound-enable-row">
          <button id="soundEnableBtn" class="sound-enable-btn" aria-label="Enable sound" title="Enable sound">🔇</button>
        </div>
        <div id="soundControlsWrapper" class="sound-controls" style="display: none;">
          <div class="sound-perf" aria-label="Sound performance controls">
            <button type="button" id="soundTapBtn" class="sound-perf__btn" aria-label="Play test hit">▶︎</button>
            <button type="button" id="soundResetBtn" class="sound-perf__btn" aria-label="Reset to preset">↺</button>
            <button type="button" id="soundShuffleBtn" class="sound-perf__btn" aria-label="Shuffle (subtle) sound">🎲</button>
            <span class="sound-perf__hint">wheel adjusts · shift/alt = fine</span>
          </div>
          <label class="control-row">
            <span class="control-label">Preset</span>
            <select id="soundPresetSelect" class="control-select"></select>
          </label>
          <p id="presetDescription" class="control-hint"></p>
          ${generateSoundControlsHTML()}
        </div>
      </div>
    </details>

    <!-- ═══════════════════════════════════════════════════════════════════════
         CONTROLS SECTION - Theme & Mode
         ═══════════════════════════════════════════════════════════════════════ -->
    <details class="panel-section-accordion" id="controlsSection" open>
      <summary class="panel-section-header">
        <span class="section-icon">⚙️</span>
        <span class="section-label">Controls</span>
      </summary>
      <div class="panel-section-content">
        ${PANEL_HTML}
      </div>
    </details>
  `;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // DOCK CREATION
  // ════════════════════════════════════════════════════════════════════════════════

  function createPanelDock() {
    // Remove any legacy placeholders
    try {
      const existingControl = document.getElementById('controlPanel');
      if (existingControl) existingControl.remove();
      const existingSound = document.getElementById('soundPanel');
      if (existingSound) existingSound.remove();
    } catch (e) {}
    
    // Create dock container
    dockElement = document.createElement('div');
    dockElement.className = 'panel-dock';
    dockElement.id = 'panelDock';
    
    // Always start hidden on load (user summons with `/`)
    dockElement.classList.add('hidden');
    saveDockHiddenState(true);
    
    // Create master panel
    masterPanelElement = createMasterPanel();
    dockElement.appendChild(masterPanelElement);

    // Append to body as first child for maximum z-index stacking
    document.body.insertBefore(dockElement, document.body.firstChild);
    
    // Setup interactions
    setupDragging();
    setupResizePersistence();

    return dockElement;
  }

  function createMasterPanel() {
    const panel = document.createElement('div');
    panel.id = 'masterPanel';
    panel.className = loadPanelCollapsed() ? 'panel collapsed' : 'panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Settings');
    
    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';
    const modeLabel = isDev() ? 'DEV MODE' : 'BUILD MODE';
    header.innerHTML = `
    <div class="mac-titlebar">
      <div class="mac-traffic" aria-hidden="true">
        <span class="mac-dot mac-dot--red"></span>
        <span class="mac-dot mac-dot--yellow"></span>
        <span class="mac-dot mac-dot--green"></span>
      </div>
      <div class="panel-title mac-title">Settings</div>
      <div class="mac-right">
        <span class="panel-mode-pill" role="status" aria-label="Runtime mode">${modeLabel}</span>
        <button class="collapse-btn mac-collapse" aria-label="Collapse panel" title="Collapse">▾</button>
      </div>
    </div>
  `;
    
    // Content
    const content = document.createElement('div');
    content.className = 'panel-content';
    content.innerHTML = getMasterPanelContent();
    
    panel.appendChild(header);
    panel.appendChild(content);

    // Restore size (if previously resized)
    const savedSize = loadPanelSize();
    if (savedSize) {
      panel.style.width = `${savedSize.width}px`;
      panel.style.height = `${savedSize.height}px`;
      panel.style.maxHeight = 'none';
    }
    
    // Collapse button
    const collapseBtn = header.querySelector('.collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePanelCollapse(panel);
      });
    }
    // Header click should NOT toggle collapse.
    // For a Mac-window feel, the titlebar is for dragging; collapse is explicit via the button.
    
    // Initialize controls
    setTimeout(() => {
      setupControls();
      setupBuildControls();
      setupSoundControls(panel);
      setupLayoutControls(panel);
    }, 0);
    
    return panel;
  }

  function setupResizePersistence() {
    if (!masterPanelElement) return;
    if (typeof ResizeObserver === 'undefined') return;

    let t = 0;
    const ro = new ResizeObserver(() => {
      if (!masterPanelElement) return;
      // Avoid persisting while collapsed (it forces a short height)
      if (masterPanelElement.classList.contains('collapsed')) return;

      window.clearTimeout(t);
      t = window.setTimeout(() => {
        savePanelSizeFromElement(masterPanelElement);
      }, 150);
    });

    try {
      ro.observe(masterPanelElement);
    } catch (e) {}
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // DRAG FUNCTIONALITY
  // ════════════════════════════════════════════════════════════════════════════════

  function setupDragging() {
    if (!masterPanelElement) return;
    
    const header = masterPanelElement.querySelector('.panel-header');
    if (!header) return;
    
    header.addEventListener('mousedown', handleDragStart);
    header.addEventListener('touchstart', handleDragStart, { passive: false });
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
    
    loadPanelPosition();
  }

  function handleDragStart(e) {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    if (!dockElement) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const rect = dockElement.getBoundingClientRect();
    dragStartX = clientX;
    dragStartY = clientY;
    elementStartX = rect.left;
    elementStartY = rect.top;
    isDragging = false;
  }

  function handleDragMove(e) {
    if (dragStartX === 0 && dragStartY === 0) return;
    if (!dockElement) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStartX;
    const deltaY = clientY - dragStartY;
    const threshold = 5;
    
    if (!isDragging && (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold)) {
      isDragging = true;
      dockElement.classList.add('dragging');
      dockElement.style.position = 'fixed';
      dockElement.style.top = `${elementStartY}px`;
      dockElement.style.left = `${elementStartX}px`;
      dockElement.style.right = 'auto';
    }
    
    if (isDragging) {
      let newX = elementStartX + deltaX;
      let newY = elementStartY + deltaY;
      
      const rect = dockElement.getBoundingClientRect();
      newX = Math.max(0, Math.min(window.innerWidth - rect.width, newX));
      newY = Math.max(0, Math.min(window.innerHeight - rect.height, newY));
      
      dockElement.style.left = `${newX}px`;
      dockElement.style.top = `${newY}px`;
      e.preventDefault();
    }
  }

  function handleDragEnd() {
    if (isDragging) {
      isDragging = false;
      if (dockElement) dockElement.classList.remove('dragging');
      savePanelPosition();
    }
    
    dragStartX = 0;
    dragStartY = 0;
    
    setTimeout(() => { }, 10);
  }

  function savePanelPosition() {
    try {
      if (!dockElement) return;
      const pos = {
        left: dockElement.style.left,
        top: dockElement.style.top,
        custom: true
      };
      localStorage.setItem(STORAGE_KEYS.position, JSON.stringify(pos));
    } catch (e) {}
  }

  function loadPanelPosition() {
    try {
      if (!dockElement) return;
      const pos = JSON.parse(localStorage.getItem(STORAGE_KEYS.position) || '{}');
      if (pos.custom) {
        dockElement.style.position = 'fixed';
        dockElement.style.left = pos.left;
        dockElement.style.top = pos.top;
        dockElement.style.right = 'auto';
      }
    } catch (e) {}
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // PANEL COLLAPSE
  // ════════════════════════════════════════════════════════════════════════════════

  function togglePanelCollapse(panel) {
    panel.classList.toggle('collapsed');
    savePanelCollapsed(panel.classList.contains('collapsed'));
  }

  function toggleDock() {
    if (!dockElement) return;
    
    const isHidden = dockElement.classList.toggle('hidden');
    saveDockHiddenState(isHidden);
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // SOUND CONTROLS
  // ════════════════════════════════════════════════════════════════════════════════

  function setupSoundControls(panel) {
    const enableBtn = panel.querySelector('#soundEnableBtn');
    const controlsWrapper = panel.querySelector('#soundControlsWrapper');
    const presetSelect = panel.querySelector('#soundPresetSelect');
    const presetDesc = panel.querySelector('#presetDescription');
    const soundDetails = panel.querySelector('#soundSection');
    const tapBtn = panel.querySelector('#soundTapBtn');
    const resetBtn = panel.querySelector('#soundResetBtn');
    const shuffleBtn = panel.querySelector('#soundShuffleBtn');

    // Icon-only button labels (no text), with accessible aria-label/title.
    const ICON_SOUND_OFF = '<i class="ti ti-volume-off" aria-hidden="true"></i>';
    const ICON_SOUND_ON = '<i class="ti ti-volume-2" aria-hidden="true"></i>';

    const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
    const jitter = (base, amount) => base + (Math.random() - 0.5) * 2 * amount;

    const syncSoundSectionUI = (state, { openIfEnabled = false } = {}) => {
      if (!enableBtn) return;
      const s = state || getSoundState();
      const enabled = !!(s.isUnlocked && s.isEnabled);
      const unlocked = !!s.isUnlocked;

      // Icon-only (no text). Use aria-label/title for accessibility.
      enableBtn.innerHTML = (unlocked && enabled) ? ICON_SOUND_ON : ICON_SOUND_OFF;
      enableBtn.setAttribute('aria-label', unlocked ? (enabled ? 'Sound on' : 'Sound off') : 'Enable sound');
      enableBtn.title = unlocked ? (enabled ? 'Sound on' : 'Sound off') : 'Enable sound';

      enableBtn.classList.toggle('enabled', enabled);

      if (controlsWrapper) {
        controlsWrapper.style.display = enabled ? '' : 'none';
      }

      if (openIfEnabled && enabled && soundDetails && !soundDetails.open) {
        soundDetails.open = true;
      }
    };

    // Performance controls (audition / reset / gentle shuffle)
    if (tapBtn) {
      tapBtn.addEventListener('click', () => {
        // If sound isn't enabled, do nothing; user can hit "Enable Sound" first
        playTestSound({ intensity: 0.86, radius: 18, xPosition: 0.72 });
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const preset = getCurrentPreset();
        applySoundPreset(preset);
        if (presetDesc && SOUND_PRESETS[preset]) presetDesc.textContent = SOUND_PRESETS[preset].description;
        syncSoundControlsToConfig(panel, getSoundConfig);
      });
    }

    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => {
        // Subtle, musical micro-randomization: never wild, just "alive".
        const c = getSoundConfig();
        const next = {
          // Tone / crystal
          filterBaseFreq: clamp(jitter(c.filterBaseFreq, 120), 300, 8000),
          filterQ: clamp(jitter(c.filterQ, 0.04), 0.05, 0.9),
          pitchCurve: clamp(jitter(c.pitchCurve, 0.06), 0.6, 1.8),
          sparkleGain: clamp(jitter(c.sparkleGain, 0.03), 0.0, 0.35),
          sparkleDecayMul: clamp(jitter(c.sparkleDecayMul, 0.05), 0.25, 0.95),
          noiseTransientQ: clamp(jitter(c.noiseTransientQ, 0.25), 0.6, 6.0),

          // Space / dynamics
          reverbWetMix: clamp(jitter(c.reverbWetMix, 0.02), 0.0, 0.35),
          reverbDecay: clamp(jitter(c.reverbDecay, 0.03), 0.05, 0.40),
          collisionMinImpact: clamp(jitter(c.collisionMinImpact, 0.03), 0.45, 0.90),

          // Humanization
          variancePitch: clamp(jitter(c.variancePitch, 0.01), 0.0, 0.20),
          varianceGain: clamp(jitter(c.varianceGain, 0.02), 0.0, 0.35),
        };

        updateSoundConfig(next);
        syncSoundControlsToConfig(panel, getSoundConfig);
        playTestSound({ intensity: 0.86, radius: 18, xPosition: 0.72 });
      });
    }
    
    if (enableBtn) {
      enableBtn.addEventListener('click', async () => {
        const state = getSoundState();
        
        if (!state.isUnlocked) {
          const success = await unlockAudio();
          if (success) {
            syncSoundSectionUI(null, { openIfEnabled: true });
          }
        } else {
          const newState = toggleSound();
          syncSoundSectionUI({ ...state, isEnabled: newState });
        }
      });
    }
    
    if (presetSelect) {
      for (const [key, preset] of Object.entries(SOUND_PRESETS)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = preset.label;
        presetSelect.appendChild(option);
      }
      
      presetSelect.value = getCurrentPreset();
      if (presetDesc && SOUND_PRESETS[getCurrentPreset()]) {
        presetDesc.textContent = SOUND_PRESETS[getCurrentPreset()].description;
      }
      
      presetSelect.addEventListener('change', () => {
        applySoundPreset(presetSelect.value);
        if (presetDesc && SOUND_PRESETS[presetSelect.value]) {
          presetDesc.textContent = SOUND_PRESETS[presetSelect.value].description;
        }
        syncSoundControlsToConfig(panel, getSoundConfig);
      });
    }
    
    bindSoundControls(panel, getSoundConfig, updateSoundConfig);
    syncSoundControlsToConfig(panel, getSoundConfig);

    // Initial state (if sound was enabled elsewhere, show controls immediately)
    syncSoundSectionUI();

    // Stay in sync with external toggles (e.g. the floating sound toggle button)
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener(SOUND_STATE_EVENT, (e) => {
        syncSoundSectionUI(e && e.detail ? e.detail : null);
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // LAYOUT CONTROLS
  // ════════════════════════════════════════════════════════════════════════════════

  function setupLayoutControls(panel) {
    const frameSlider = panel.querySelector('#layoutFrame');
    const frameValue = panel.querySelector('#frameValue');
    const contentPadSlider = panel.querySelector('#contentPadding');
    const contentPadValue = panel.querySelector('#contentPadValue');
    const radiusSlider = panel.querySelector('#layoutRadius');
    const radiusValue = panel.querySelector('#radiusValue');
    const wallInsetSlider = panel.querySelector('#layoutWallInset');
    const wallInsetValue = panel.querySelector('#wallInsetValue');
    const g = getGlobals();
    
    // Frame (outer dark border around content + wall thickness)
    if (frameSlider && frameValue) {
      frameSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        frameValue.textContent = `${val}px`;
        // Update frame border CSS
        document.documentElement.style.setProperty('--container-border', `${val}px`);
        // Sync wall thickness to frame thickness
        document.documentElement.style.setProperty('--wall-thickness', `${val}px`);
        g.wallThickness = val;
        // Keep state in sync for config export
        g.containerBorder = val;
        // Trigger canvas resize to account for new frame size
        resize();
      });
    }
    
    // Content padding (space between frame edge and content elements)
    if (contentPadSlider && contentPadValue) {
      contentPadSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        contentPadValue.textContent = `${val}px`;
        // Update content padding CSS
        document.documentElement.style.setProperty('--content-padding', `${val}px`);
        // Keep state in sync for config export
        g.contentPadding = val;
      });
    }
    
    // Corner radius (syncs wallRadius + cornerRadius)
    if (radiusSlider && radiusValue) {
      radiusSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        radiusValue.textContent = `${val}px`;
        document.documentElement.style.setProperty('--wall-radius', `${val}px`);
        // Keep state in sync for config export
        g.wallRadius = val;
        g.cornerRadius = val;
      });
    }

    // Wall inset (physics-only): shrinks the effective collision bounds uniformly
    if (wallInsetSlider && wallInsetValue) {
      wallInsetSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        wallInsetValue.textContent = `${val}px`;
        g.wallInset = val;
      });
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                                KEYBOARD INPUT                                ║
  // ║              Panel dock toggle and mode switching (1-9)                      ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let isKeyboardWired = false;

  function setupKeyboardShortcuts() {
    if (isKeyboardWired) return;
    isKeyboardWired = true;

    window.addEventListener('keydown', (e) => {
      // Skip if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      
      const k = e.key.toLowerCase();
      
      // Toggle dock with /
      if (k === '/' || e.code === 'Slash') {
        e.preventDefault();
        toggleDock();
        return;
      }
      
      // Mode switching: 1=pit, 2=flies, 3=weightless, 4=water, 5=vortex, 6=ping-pong, 7=magnetic, 8=bubbles, 9=kaleidoscope
      if (k === '1') {
        e.preventDefault();
        setMode(MODES.PIT);
        updateModeButtonsUI('pit');
      } else if (k === '2') {
        e.preventDefault();
        setMode(MODES.FLIES);
        updateModeButtonsUI('flies');
      } else if (k === '3') {
        e.preventDefault();
        setMode(MODES.WEIGHTLESS);
        updateModeButtonsUI('weightless');
      } else if (k === '4') {
        e.preventDefault();
        setMode(MODES.WATER);
        updateModeButtonsUI('water');
      } else if (k === '5') {
        e.preventDefault();
        setMode(MODES.VORTEX);
        updateModeButtonsUI('vortex');
      } else if (k === '6') {
        e.preventDefault();
        setMode(MODES.PING_PONG);
        updateModeButtonsUI('ping-pong');
      } else if (k === '7') {
        e.preventDefault();
        setMode(MODES.MAGNETIC);
        updateModeButtonsUI('magnetic');
      } else if (k === '8') {
        e.preventDefault();
        setMode(MODES.BUBBLES);
        updateModeButtonsUI('bubbles');
      } else if (k === '9') {
        e.preventDefault();
        setMode(MODES.KALEIDOSCOPE);
        updateModeButtonsUI('kaleidoscope');
      }
    });
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                 BRAND LOGO – CURSOR DISTANCE SCALE (SUBTLE)                  ║
  // ║     Inner ellipse (½ viewport) → 0.9x | Outer band (min side) → 1.1x         ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  /**
   * Performance posture:
   * - No continuous loop.
   * - Pointer updates are rAF-throttled (max 1 style write per frame).
   * - Only a single element is updated via a CSS custom property.
   */

  const CSS_VAR = '--abs-brand-logo-scale';
  const DEFAULT_SCALE = 1;
  const MIN_SCALE = 0.98;
  const MAX_SCALE = 1.02;
  const EPSILON = 0.001;

  let targetEl = null;
  let isEnabled$1 = false;

  let viewportW = 0;
  let viewportH = 0;
  let outerRadius = 1;
  let innerRx = 1;
  let innerRy = 1;

  let pendingClientX = null;
  let pendingClientY = null;
  let rafId = 0;
  let lastAppliedScale = null;

  function clamp01$1(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function recomputeViewport() {
    viewportW = window.innerWidth || 0;
    viewportH = window.innerHeight || 0;

    // OUTER BAND: circle radius = half the shortest viewport side (distance to nearest edge)
    outerRadius = Math.max(1, Math.min(viewportW, viewportH) * 0.5);

    // INNER BAND: centered ellipse with ½ the viewport size (so radii are ¼ of viewport)
    innerRx = Math.max(1, viewportW * 0.25);
    innerRy = Math.max(1, viewportH * 0.25);
  }

  function applyPending() {
    rafId = 0;
    if (!isEnabled$1 || !targetEl) return;
    if (pendingClientX == null || pendingClientY == null) return;

    const dx = pendingClientX - viewportW * 0.5;
    const dy = pendingClientY - viewportH * 0.5;

    // Distance from center in CSS pixels
    const r = Math.hypot(dx, dy);

    // Inner ellipse boundary distance along the cursor ray (dx,dy).
    // For a ray from origin: (x,y) = u*(dx,dy)
    // Ellipse equation: (x/rx)^2 + (y/ry)^2 = 1 -> u = 1 / sqrt((dx^2/rx^2 + dy^2/ry^2))
    let rInner = 0;
    if (r > 0) {
      const denom = Math.sqrt((dx * dx) / (innerRx * innerRx) + (dy * dy) / (innerRy * innerRy));
      rInner = denom > 0 ? 1 / denom : 0;
    }

    // Band mapping:
    // - Inside inner ellipse: clamp to MIN_SCALE (0.9)
    // - Between inner ellipse and outer circle: lerp MIN→MAX
    // - Beyond outer circle: clamp to MAX_SCALE (1.1)
    let t = 0;
    if (r <= rInner) {
      t = 0;
    } else if (r >= outerRadius) {
      t = 1;
    } else {
      const span = Math.max(1e-6, outerRadius - rInner);
      t = clamp01$1((r - rInner) / span);
    }

    const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * t;

    if (lastAppliedScale != null && Math.abs(scale - lastAppliedScale) < EPSILON) return;

    targetEl.style.setProperty(CSS_VAR, scale.toFixed(4));
    lastAppliedScale = scale;
  }

  /**
   * Initialize once during app bootstrap.
   * Safe no-op if the element isn't present (e.g., dev pages).
   */
  function initBrandLogoCursorScale() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Prefer scaling the inner wrapper so we don't override any Webflow transforms on #brand-logo.
    targetEl =
      document.querySelector('#brand-logo .hero__text') ||
      document.querySelector('#brand-logo') ||
      null;

    if (!targetEl) return;

    recomputeViewport();
    isEnabled$1 = true;

    // Seed with a neutral default until the first mousemove arrives.
    targetEl.style.setProperty(CSS_VAR, String(DEFAULT_SCALE));

    window.addEventListener('resize', recomputeViewport, { passive: true });
  }

  /**
   * Feed pointer positions in CSS pixels (clientX/clientY).
   * rAF throttles updates to avoid per-event style writes.
   */
  function updateBrandLogoCursorScaleFromClient(clientX, clientY) {
    if (!isEnabled$1 || !targetEl) return;

    pendingClientX = clientX;
    pendingClientY = clientY;

    if (rafId) return;
    rafId = window.requestAnimationFrame(applyPending);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                          CUSTOM CURSOR RENDERER                              ║
  // ║     Border area: default cursor | Simulation: cursor scales down to dot      ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let cursorElement = null;
  let isInitialized = false;
  let isInSimulation = false;
  let baseSize = 0;

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
   * Initialize custom cursor element
   * Creates a circular cursor that follows the mouse
   */
  function setupCustomCursor() {
    if (isInitialized) return;
    
    // Create cursor element
    cursorElement = document.createElement('div');
    cursorElement.id = 'custom-cursor';
    cursorElement.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursorElement);
    
    // Show default cursor in border area, hide in simulation
    // We'll control this dynamically based on mouse position
    
    // Initially hide cursor (will show when mouse moves)
    cursorElement.style.display = 'none';
    
    isInitialized = true;
    updateCursorSize();
  }

  /**
   * Update cursor size based on state
   * Size matches average ball size multiplied by cursorSize
   */
  function updateCursorSize() {
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
    
    // Reset transform if not in simulation
    if (!isInSimulation) {
      cursorElement.style.transform = 'translate(-50%, -50%) scale(1)';
      cursorElement.style.opacity = '1';
    }
  }

  /**
   * Update cursor position and state
   * Called from pointer.js on mouse move
   */
  function updateCursorPosition(clientX, clientY) {
    if (!cursorElement) return;
    
    const wasInSimulation = isInSimulation;
    isInSimulation = isMouseInSimulation(clientX, clientY);
    
    cursorElement.style.left = `${clientX}px`;
    cursorElement.style.top = `${clientY}px`;
    
    // Always hide default cursor - we use custom cursor only
    document.body.style.cursor = 'none';
    
    // Transition between border and simulation
    if (isInSimulation) {
      // In simulation: show cursor and animate to visible dot
      cursorElement.style.display = 'block';
      
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
        // Check if we're already at dot scale, if not set it
        const currentTransform = cursorElement.style.transform;
        if (!currentTransform.includes('scale(0.25)')) {
          cursorElement.style.transform = 'translate(-50%, -50%) scale(0.25)';
          cursorElement.style.opacity = '1';
        }
      }
    } else {
      // In border area: hide custom cursor completely
      cursorElement.style.display = 'none';
      if (wasInSimulation) {
        // Reset transform for next entry
        cursorElement.style.transform = 'translate(-50%, -50%) scale(1)';
        cursorElement.style.opacity = '1';
      }
    }
  }

  /**
   * Hide cursor (when mouse leaves window)
   */
  function hideCursor() {
    if (!cursorElement) return;
    cursorElement.style.display = 'none';
    document.body.style.cursor = 'none';
    isInSimulation = false;
  }

  /**
   * Show cursor (when mouse enters window)
   */
  function showCursor() {
    if (!cursorElement) return;
    // Will be shown/hidden by updateCursorPosition based on location
    isInSimulation = false;
  }

  var cursor = /*#__PURE__*/Object.freeze({
    __proto__: null,
    hideCursor: hideCursor,
    setupCustomCursor: setupCustomCursor,
    showCursor: showCursor,
    updateCursorPosition: updateCursorPosition,
    updateCursorSize: updateCursorSize
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      MOUSE/TOUCH TRACKING (COMPLETE)                         ║
  // ║              Unified document-level pointer system for all modes             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // Mouse velocity tracking for water ripples
  let lastMouseX = 0;
  let lastMouseY = 0;
  let lastMoveTime = 0;
  let mouseVelocity = 0;
  let lastTapTime = 0;
  // Click/tap cycles through modes (value stored on globals; avoid caching so modes can override).

  const MODE_CYCLE = [
    MODES.WORMS,
    MODES.PIT,
    MODES.FLIES,
    MODES.WEIGHTLESS,
    MODES.WATER,
    MODES.VORTEX,
    MODES.PING_PONG,
    MODES.MAGNETIC,
    MODES.BUBBLES,
    MODES.KALEIDOSCOPE
  ];

  function cycleMode() {
    const globals = getGlobals();
    const current = globals.currentMode;
    const idx = MODE_CYCLE.indexOf(current);
    const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length] || MODE_CYCLE[0];
    Promise.resolve().then(function () { return modeController; }).then(({ setMode }) => {
      setMode(next);
    });
    Promise.resolve().then(function () { return controls; }).then(({ updateModeButtonsUI }) => {
      updateModeButtonsUI(next);
    });
  }

  // Throttle for water ripple creation
  let lastRippleTime = 0;
  const RIPPLE_THROTTLE_MS = 80; // Create ripple every 80ms max

  /**
   * GLOBAL UNIFIED MOUSE SYSTEM
   * Handles all mouse/touch interactions at document level
   * Works regardless of canvas z-index or pointer-events
   */
  function setupPointer() {
    const globals = getGlobals();
    const canvas = globals.canvas;
    
    // Ensure the flag exists (some modes may override it at runtime).
    if (globals.clickCycleEnabled === undefined) globals.clickCycleEnabled = false;
    
    if (!canvas) {
      console.error('Canvas not available for pointer setup');
      return;
    }
    
    const DPR = globals.DPR;

    /**
     * Panel/UI hit-test: when interacting with the settings UI, we must NOT
     * update simulation mouse state (repel/attract), and the UI must receive
     * pointer events normally.
     */
    function isEventOnUI(target) {
      if (!target || !target.closest) return false;
      return Boolean(
        target.closest('#panelDock') ||
        target.closest('#masterPanel') ||
        target.closest('#dockToggle') ||
        target.closest('.panel-dock') ||
        target.closest('.panel')
      );
    }
    
    /**
     * Get mouse position relative to canvas from any event
     */
    function getCanvasPosition(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * DPR,
        y: (clientY - rect.top) * DPR,
        inBounds: clientX >= rect.left && clientX <= rect.right && 
                  clientY >= rect.top && clientY <= rect.bottom
      };
    }

    /**
     * Shared move handler (mouse + pointer).
     * Mobile Playwright projects may not emit `mousemove` reliably; `pointermove`
     * is the canonical cross-input signal.
     */
    function handleMove(clientX, clientY, target, { isMouseLike } = { isMouseLike: true }) {
      // Title/logo micro-interaction (viewport based) — keep responsive even over UI.
      updateBrandLogoCursorScaleFromClient(clientX, clientY);

      // Update custom cursor position only for mouse-like pointers.
      if (isMouseLike) {
        updateCursorPosition(clientX, clientY);
      } else {
        // Ensure cursor is hidden for touch/pen inputs that aren't mouse-like
        hideCursor();
      }

      // Don't track simulation interactions if the user is over the panel UI
      if (isEventOnUI(target)) return;

      const pos = getCanvasPosition(clientX, clientY);

      // Calculate mouse velocity for water ripples
      const now = performance.now();
      const dt = now - lastMoveTime;
      if (dt > 0 && lastMoveTime > 0) {
        const dx = pos.x - lastMouseX;
        const dy = pos.y - lastMouseY;
        mouseVelocity = Math.sqrt(dx * dx + dy * dy) / dt;
      }

      // Update globals with 1:1 mouse position
      globals.mouseX = pos.x;
      globals.mouseY = pos.y;
      globals.mouseInCanvas = pos.inBounds;
      if (typeof window !== 'undefined') window.mouseInCanvas = pos.inBounds;

      // Track real movement for “only move when mouse moves” modes (Kaleidoscope)
      // Use a small threshold to ignore subpixel jitter.
      const movedPx = Math.hypot(pos.x - (globals.lastPointerMoveX ?? pos.x), pos.y - (globals.lastPointerMoveY ?? pos.y));
      if (movedPx > 0.5) {
        globals.lastPointerMoveMs = now;
        globals.lastPointerMoveX = pos.x;
        globals.lastPointerMoveY = pos.y;
      }

      // WATER MODE: Create ripples based on mouse movement velocity
      if (globals.currentMode === MODES.WATER && pos.inBounds) {
        if (mouseVelocity > 0.3 && (now - lastRippleTime) > RIPPLE_THROTTLE_MS) {
          const velocityFactor = Math.min(mouseVelocity * 2, 3);
          createWaterRipple(pos.x, pos.y, velocityFactor);
          lastRippleTime = now;
        }
      }

      // Store for velocity calculation
      lastMouseX = pos.x;
      lastMouseY = pos.y;
      lastMoveTime = now;
    }
    
    /**
     * Document-level mouse move tracking
     * Works even when canvas is behind content (z-index: -1)
     * PASSIVE - doesn't interfere with panel interactions
     */
    document.addEventListener('mousemove', (e) => {
      // If Pointer Events are supported, they handle this with better granularity (pointerType)
      // This prevents synthetic mousemove events from touch interactions from showing the cursor
      if (window.PointerEvent) return;
      
      handleMove(e.clientX, e.clientY, e.target, { isMouseLike: true });
    }, { passive: true });

    document.addEventListener('pointermove', (e) => {
      const isMouseLike = e.pointerType === 'mouse' || e.pointerType === 'pen';
      handleMove(e.clientX, e.clientY, e.target, { isMouseLike });
    }, { passive: true });
    
    /**
     * Document-level click handler
     * Responds to mode-specific interactions
     */
    document.addEventListener('click', (e) => {
      // Ignore clicks on panel or interactive elements
      if (isEventOnUI(e.target)) return;
      if (e.target.closest('a')) return;
      if (e.target.closest('button')) return;
      if (e.target.closest('input')) return;
      if (e.target.closest('select')) return;
      if (e.target.closest('textarea')) return;
      
      const pos = getCanvasPosition(e.clientX, e.clientY);
      
      // Only process if click is within canvas bounds
      if (!pos.inBounds) return;
      
      // NO click effects on any simulation - only mouse movement triggers interactions
      // Click cycles mode (if enabled)
      // Worms uses click/drag for interaction; never cycle from clicks there.
      if (globals.currentMode === MODES.WORMS) return;
      if (globals.clickCycleEnabled) {
        cycleMode();
      }
    });
    
    /**
     * Touch move tracking for mobile
     */
    document.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        const pos = getCanvasPosition(e.touches[0].clientX, e.touches[0].clientY);
        globals.mouseX = pos.x;
        globals.mouseY = pos.y;
        globals.mouseInCanvas = pos.inBounds;
        const now = performance.now();
        const movedPx = Math.hypot(pos.x - (globals.lastPointerMoveX ?? pos.x), pos.y - (globals.lastPointerMoveY ?? pos.y));
        if (movedPx > 0.5) {
          globals.lastPointerMoveMs = now;
          globals.lastPointerMoveX = pos.x;
          globals.lastPointerMoveY = pos.y;
        }
        
        // Water mode: create ripples on touch move
        if (globals.currentMode === MODES.WATER && pos.inBounds) {
          if ((now - lastRippleTime) > RIPPLE_THROTTLE_MS) {
            createWaterRipple(pos.x, pos.y, 2);
            lastRippleTime = now;
          }
        }
      }
    }, { passive: true });
    
    /**
     * Touch tap handler for mobile interactions
     * Water creates ripple on tap
     */
    document.addEventListener('touchstart', (e) => {
      // Ignore touches on panel
      if (isEventOnUI(e.target)) return;
      
      // Explicitly hide cursor on touch start to prevent it getting stuck
      hideCursor();

      if (e.target.closest('a')) return;
      if (e.target.closest('button')) return;
      if (e.target.closest('input')) return;
      if (e.target.closest('select')) return;
      if (e.target.closest('textarea')) return;
      
      if (e.touches && e.touches[0]) {
        const pos = getCanvasPosition(e.touches[0].clientX, e.touches[0].clientY);
        
        if (!pos.inBounds) return;
        
        // NO tap effects on any simulation - only finger drag triggers interactions
        // Double-tap cycles mode (if enabled)
        const now = performance.now();
        if (globals.currentMode === MODES.WORMS) return;
        if (now - lastTapTime < 300 && globals.clickCycleEnabled) {
          cycleMode();
        }
        lastTapTime = now;
      }
    }, { passive: true });
    
    /**
     * Reset mouse when leaving window
     */
    document.addEventListener('mouseleave', () => {
      globals.mouseX = CONSTANTS.OFFSCREEN_MOUSE;
      globals.mouseY = CONSTANTS.OFFSCREEN_MOUSE;
      globals.mouseInCanvas = false;
      mouseVelocity = 0;
      if (typeof window !== 'undefined') window.mouseInCanvas = false;
      hideCursor();
    });
    
    /**
     * Show cursor when mouse enters window
     */
    document.addEventListener('mouseenter', () => {
      showCursor();
    });
    
    /**
     * Touch end - reset tracking
     */
    document.addEventListener('touchend', () => {
      globals.mouseX = CONSTANTS.OFFSCREEN_MOUSE;
      globals.mouseY = CONSTANTS.OFFSCREEN_MOUSE;
      globals.mouseInCanvas = false;
    }, { passive: true });
    
    console.log('✓ Unified pointer system configured (document-level)');

    // Test hook: allow Playwright to wait for pointer wiring across engines.
    globals.__pointerReady = true;
    if (typeof window !== 'undefined') window.__pointerReady = true;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                           PERFORMANCE / FPS                                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  let lastFpsUpdate = 0;
  let frames = 0;
  let currentFPS = 0;

  function trackFrame(now) {
    frames++;
    if (now - lastFpsUpdate > 1000) {
      currentFPS = frames;
      frames = 0;
      lastFpsUpdate = now;
      const el = document.getElementById('render-fps');
      if (el) el.textContent = String(currentFPS);
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║               BRAND LOGO – “MAKE SPACE FOR BALLS” (RETREAT)                   ║
  // ║       Ball proximity near logo → logo subtly recedes (scale/offset)           ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  /**
   * Exposed CSS var: 0..1
   * - 0: no retreat (logo at rest)
   * - 1: maximum retreat (logo yields space)
   */
  const CSS_VAR_RETREAT = '--abs-brand-logo-retreat';

  // Throttle heavy work (ball scan) – keeps overhead negligible.
  const UPDATE_INTERVAL_MS = 90; // ~11Hz

  // Mapping tuning (in CSS pixels, then converted to canvas pixels via DPR)
  const INNER_PADDING_PX = 18; // how close balls can get before logo yields strongly

  let el = null;
  let isEnabled = false;

  let lastUpdateMs = 0;
  let lastApplied = null;

  // Cached geometry
  let logoCxClient = 0;
  let logoCyClient = 0;
  let logoInnerRadiusClient = 1; // based on logo box

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function refreshLogoGeometry() {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    logoCxClient = rect.left + rect.width * 0.5;
    logoCyClient = rect.top + rect.height * 0.5;
    // Inner “personal space” radius derived from logo size (feels natural across breakpoints)
    logoInnerRadiusClient = Math.max(1, Math.min(rect.width, rect.height) * 0.6);
  }

  /**
   * Initialize once during app bootstrap.
   * Safe no-op if logo isn’t present.
   */
  function initBrandLogoBallSpace() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    el =
      document.querySelector('#brand-logo .hero__text') ||
      document.querySelector('#brand-logo') ||
      null;

    if (!el) return;

    refreshLogoGeometry();
    window.addEventListener('resize', refreshLogoGeometry, { passive: true });

    // Seed
    el.style.setProperty(CSS_VAR_RETREAT, '0');
    isEnabled = true;
  }

  /**
   * Called from the main loop. Cheap early returns + throttled scan.
   */
  function tickBrandLogoBallSpace(nowMs) {
    if (!isEnabled || !el) return;
    if ((nowMs - lastUpdateMs) < UPDATE_INTERVAL_MS) return;
    lastUpdateMs = nowMs;

    const g = getGlobals();
    const balls = g.balls || [];
    const canvas = g.canvas;
    if (!canvas || balls.length === 0) {
      if (lastApplied !== 0) {
        el.style.setProperty(CSS_VAR_RETREAT, '0');
        lastApplied = 0;
      }
      return;
    }

    // Convert logo center (client) → canvas space
    const rect = canvas.getBoundingClientRect();
    const dpr = g.DPR || 1;
    const cx = (logoCxClient - rect.left) * dpr;
    const cy = (logoCyClient - rect.top) * dpr;

    // OUTER BAND: “shortest side of viewport” (in canvas space)
    // i.e. distance from center to nearest edge in client px, then scale by DPR.
    const outerRadius = Math.max(1, Math.min(window.innerWidth, window.innerHeight) * 0.5 * dpr);

    // INNER BAND: based on logo size + padding (in canvas space)
    const innerRadius = (logoInnerRadiusClient + INNER_PADDING_PX) * dpr;

    // Measure nearest ball edge distance to logo center
    let nearestEdge = Infinity;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const dx = b.x - cx;
      const dy = b.y - cy;
      const centerDist = Math.hypot(dx, dy);
      const edgeDist = Math.max(0, centerDist - (b.r || 0));
      if (edgeDist < nearestEdge) nearestEdge = edgeDist;
      // Early exit: if already “inside” the inner zone, we’re done.
      if (nearestEdge <= innerRadius) break;
    }

    // Map to retreat factor:
    // - nearestEdge <= innerRadius => 1 (logo yields)
    // - nearestEdge >= outerRadius => 0 (at rest)
    // - in between => smooth interpolation
    let retreat = 0;
    if (nearestEdge <= innerRadius) {
      retreat = 1;
    } else if (nearestEdge >= outerRadius) {
      retreat = 0;
    } else {
      retreat = 1 - clamp01((nearestEdge - innerRadius) / Math.max(1e-6, outerRadius - innerRadius));
    }

    // Quantize tiny changes to avoid style churn
    const q = Number(retreat.toFixed(3));
    if (lastApplied != null && Math.abs(q - lastApplied) < 0.001) return;
    el.style.setProperty(CSS_VAR_RETREAT, String(q));
    lastApplied = q;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                         MAIN RENDER LOOP (OPTIMIZED)                        ║
  // ║              Electron-grade performance with adaptive throttling             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // ════════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE: Frame timing and throttling state
  // ════════════════════════════════════════════════════════════════════════════════
  let last = performance.now() / 1000;
  let lastFrameTime = 0;
  let isPageVisible = true;
  let frameId = null;

  // Target 60fps (16.67ms) - prevents 120Hz displays from doubling CPU work
  const TARGET_FPS = 60;
  const MIN_FRAME_INTERVAL = 1000 / TARGET_FPS;

  // Adaptive throttling: if we detect sustained low FPS, reduce work
  let recentFrameTimes = [];
  const FPS_SAMPLE_SIZE = 30;
  let adaptiveThrottleLevel = 0; // 0 = none, 1 = light, 2 = heavy

  function updateAdaptiveThrottle(frameTime) {
    recentFrameTimes.push(frameTime);
    if (recentFrameTimes.length > FPS_SAMPLE_SIZE) {
      recentFrameTimes.shift();
    }
    
    if (recentFrameTimes.length === FPS_SAMPLE_SIZE) {
      const avgFrameTime = recentFrameTimes.reduce((a, b) => a + b, 0) / FPS_SAMPLE_SIZE;
      const avgFPS = 1000 / avgFrameTime;
      
      // Adjust throttle level based on sustained performance
      if (avgFPS < 30 && adaptiveThrottleLevel < 2) {
        adaptiveThrottleLevel++;
        console.log(`⚡ Adaptive throttle increased to level ${adaptiveThrottleLevel} (avg FPS: ${avgFPS.toFixed(1)})`);
      } else if (avgFPS > 55 && adaptiveThrottleLevel > 0) {
        adaptiveThrottleLevel--;
        console.log(`⚡ Adaptive throttle decreased to level ${adaptiveThrottleLevel} (avg FPS: ${avgFPS.toFixed(1)})`);
      }
    }
  }

  function startMainLoop(applyForcesFunc) {
    // ══════════════════════════════════════════════════════════════════════════════
    // PERFORMANCE: Visibility API - pause when tab is hidden
    // Saves CPU/battery when user isn't looking
    // ══════════════════════════════════════════════════════════════════════════════
    document.addEventListener('visibilitychange', () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) {
        // Reset timing to prevent huge dt spike when resuming
        last = performance.now() / 1000;
        lastFrameTime = performance.now();
        console.log('▶️ Animation resumed');
        // Restart the loop if it was stopped
        if (!frameId) {
          frameId = requestAnimationFrame(frame);
        }
      } else {
        console.log('⏸️ Animation paused (tab hidden)');
        // Cancel the next frame to fully pause
        if (frameId) {
          cancelAnimationFrame(frameId);
          frameId = null;
        }
      }
    });
    
    function frame(nowMs) {
      // Skip if page not visible (belt and suspenders with visibility handler)
      if (!isPageVisible) {
        frameId = null;
        return;
      }
      
      // ════════════════════════════════════════════════════════════════════════════
      // PERFORMANCE: 60fps throttle - prevents 120Hz displays from wasting CPU
      // On a 120Hz display, this skips every other frame (rendering at 60Hz)
      // ════════════════════════════════════════════════════════════════════════════
      const elapsed = nowMs - lastFrameTime;
      if (elapsed < MIN_FRAME_INTERVAL) {
        frameId = requestAnimationFrame(frame);
        return;
      }
      lastFrameTime = nowMs - (elapsed % MIN_FRAME_INTERVAL); // Maintain timing accuracy
      
      // Track frame time for adaptive throttling
      updateAdaptiveThrottle(elapsed);
      
      const now = nowMs / 1000;
      let dt = Math.min(0.033, now - last);
      last = now;
      
      // Physics update (may be throttled at level 2)
      if (adaptiveThrottleLevel < 2 || Math.random() > 0.5) {
        updatePhysics(dt, applyForcesFunc);
      }
      
      // Render
      render();

      // UI micro-interactions driven by simulation state (throttled internally)
      // Skip at heavy throttle level
      if (adaptiveThrottleLevel < 2) {
        tickBrandLogoBallSpace(nowMs);
      }
      
      // FPS tracking
      trackFrame(performance.now());
      
      frameId = requestAnimationFrame(frame);
    }
    
    frameId = requestAnimationFrame(frame);
    console.log('✓ Render loop started (60fps throttle, visibility-aware)');
  }

  /**
   * CV Gate Controller
   * Handles the password protection UI for the CV download.
   */

  /**
   * Create the page flash overlay element if it doesn't exist
   */
  function createPageFlash$1() {
      const flash = document.createElement('div');
      flash.id = 'page-flash';
      flash.className = 'page-flash';
      flash.setAttribute('aria-hidden', 'true');
      document.body.appendChild(flash);
      return flash;
  }

  /**
   * Trigger a flash effect on the page
   * @param {HTMLElement} flashEl - The flash overlay element
   * @param {'success' | 'error'} type - The type of flash
   */
  function triggerFlash$1(flashEl, type) {
      // Remove any existing flash classes
      flashEl.classList.remove('page-flash--success', 'page-flash--error');
      
      // Force reflow to restart animation
      void flashEl.offsetWidth;
      
      // Add the appropriate class
      flashEl.classList.add(`page-flash--${type}`);
      
      // Remove after animation completes
      const duration = type === 'success' ? 600 : 300;
      setTimeout(() => {
          flashEl.classList.remove(`page-flash--${type}`);
      }, duration);
  }

  function initCVGate() {
      const trigger = document.getElementById('cv-gate-trigger');
      const logo = document.getElementById('brand-logo');
      const gate = document.getElementById('cv-gate');
      const portfolioGate = document.getElementById('portfolio-gate'); // Get portfolio gate to check/close if open
      const inputs = Array.from(document.querySelectorAll('.cv-digit'));
      const pageFlash = document.getElementById('page-flash');
      const gateLabel = document.getElementById('cv-gate-label');
      
      // Correct Code
      const CODE = '1111';
      
      if (!trigger || !logo || !gate || inputs.length === 0) {
          console.warn('CV Gate: Missing required elements');
          return;
      }
      
      // Set label text if element exists
      if (gateLabel) {
          gateLabel.innerHTML = `
            <h2 class="gate-title">Download Bio/CV</h2>
            <p class="gate-description">Because spam bots don't deserve nice things—and neither do recruiters who don't read portfolios. This keeps my inbox slightly more civilized.</p>
        `;
      }
      
      // Create page-flash element if it doesn't exist
      const flash = pageFlash || createPageFlash$1();

      // State
      let isOpen = false;

      // --- Actions ---

      const openGate = (e) => {
          e.preventDefault();
          
          // Close portfolio gate if it's open
          if (portfolioGate && portfolioGate.classList.contains('active')) {
              portfolioGate.classList.remove('active');
              setTimeout(() => {
                  portfolioGate.classList.add('hidden');
              }, 400);
          }
          
          isOpen = true;
          
          // Animate Logo Out (Up)
          logo.classList.add('fade-out-up');
          
          // Animate Gate In (Up)
          gate.classList.remove('hidden');
          // Force reflow
          void gate.offsetWidth; 
          gate.classList.add('active');
          
          // Focus first input
          inputs[0].focus();
      };

      const closeGate = () => {
          isOpen = false;
          
          // Clear inputs
          inputs.forEach(input => input.value = '');
          
          // Animate Gate Out (Down)
          gate.classList.remove('active');
          
          // Animate Logo In (Down)
          logo.classList.remove('fade-out-up');
          
          setTimeout(() => {
              if (!isOpen) gate.classList.add('hidden');
          }, 400); // Match transition time
      };

      const checkCode = () => {
          const enteredCode = inputs.map(input => input.value).join('');
          
          if (enteredCode.length === 4) {
              if (enteredCode === CODE) {
                  // Success - Green flash, then redirect
                  triggerFlash$1(flash, 'success');
                  setTimeout(() => {
                      window.location.href = 'cv.html';
                  }, 500);
              } else {
                  // Failure - Red flash, clear inputs
                  triggerFlash$1(flash, 'error');
                  setTimeout(() => {
                      inputs.forEach(input => input.value = '');
                      inputs[0].focus();
                  }, 350);
              }
          }
      };

      // --- Event Listeners ---

      trigger.addEventListener('click', openGate);

      // Close on Escape or click outside (optional, sticking to ESC for now)
      document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && isOpen) {
              closeGate();
          }
      });

      inputs.forEach((input, index) => {
          input.addEventListener('keydown', (e) => {
              if (e.key === 'Backspace') {
                  if (input.value === '') {
                      if (index > 0) {
                          inputs[index - 1].focus();
                      } else {
                          // Backspace on empty first input closes gate
                          closeGate();
                      }
                  }
              }
          });

          input.addEventListener('input', (e) => {
              const val = e.target.value;
              
              // Only allow numbers
              if (!/^\d*$/.test(val)) {
                  e.target.value = val.replace(/\D/g, '');
                  return;
              }

              if (val.length === 1) {
                  if (index < inputs.length - 1) {
                      inputs[index + 1].focus();
                  } else {
                      // Last digit entered
                      checkCode();
                  }
              } else if (val.length > 1) {
                  // Handle paste or fast typing
                  const chars = val.split('');
                  e.target.value = chars[0];
                  let nextIndex = index + 1;
                  for (let i = 1; i < chars.length && nextIndex < inputs.length; i++) {
                      inputs[nextIndex].value = chars[i];
                      nextIndex++;
                  }
                  if (nextIndex < inputs.length) {
                      inputs[nextIndex].focus();
                  } else {
                      checkCode();
                  }
              }
          });
          
          // Prevent default navigation
          input.addEventListener('focus', () => {
              // Optional: Select all on focus
              input.select();
          });
      });
  }

  /**
   * Portfolio Gate Controller
   * Handles the password protection UI for the portfolio section.
   */

  /**
   * Create the page flash overlay element if it doesn't exist
   */
  function createPageFlash() {
      const flash = document.createElement('div');
      flash.id = 'page-flash';
      flash.className = 'page-flash';
      flash.setAttribute('aria-hidden', 'true');
      document.body.appendChild(flash);
      return flash;
  }

  /**
   * Trigger a flash effect on the page
   * @param {HTMLElement} flashEl - The flash overlay element
   * @param {'success' | 'error'} type - The type of flash
   */
  function triggerFlash(flashEl, type) {
      // Remove any existing flash classes
      flashEl.classList.remove('page-flash--success', 'page-flash--error');
      
      // Force reflow to restart animation
      void flashEl.offsetWidth;
      
      // Add the appropriate class
      flashEl.classList.add(`page-flash--${type}`);
      
      // Remove after animation completes
      const duration = type === 'success' ? 600 : 300;
      setTimeout(() => {
          flashEl.classList.remove(`page-flash--${type}`);
      }, duration);
  }

  function initPortfolioGate() {
      const trigger = document.getElementById('portfolio-gate-trigger');
      const logo = document.getElementById('brand-logo');
      const gate = document.getElementById('portfolio-gate');
      const cvGate = document.getElementById('cv-gate'); // Get CV gate to check/close if open
      const inputs = Array.from(document.querySelectorAll('.portfolio-digit'));
      const pageFlash = document.getElementById('page-flash');
      const gateLabel = document.getElementById('portfolio-gate-label');
      
      // Correct Code
      const CODE = '1234';
      
      if (!trigger || !logo || !gate || inputs.length === 0) {
          console.warn('Portfolio Gate: Missing required elements');
          return;
      }
      
      // Set label text if element exists
      if (gateLabel) {
          gateLabel.innerHTML = `
            <h2 class="gate-title">View Portfolio</h2>
            <p class="gate-description">Good work deserves good context. This small step ensures you're here with intention, not just browsing. Quality takes time—yours and mine.</p>
        `;
      }
      
      // Create page-flash element if it doesn't exist
      const flash = pageFlash || createPageFlash();

      // State
      let isOpen = false;

      // --- Actions ---

      const openGate = (e) => {
          e.preventDefault();
          
          // Close CV gate if it's open
          if (cvGate && cvGate.classList.contains('active')) {
              cvGate.classList.remove('active');
              setTimeout(() => {
                  cvGate.classList.add('hidden');
              }, 400);
          }
          
          isOpen = true;
          
          // Animate Logo Out (Up)
          logo.classList.add('fade-out-up');
          
          // Animate Gate In (Up)
          gate.classList.remove('hidden');
          // Force reflow
          void gate.offsetWidth; 
          gate.classList.add('active');
          
          // Focus first input
          inputs[0].focus();
      };

      const closeGate = () => {
          isOpen = false;
          
          // Clear inputs
          inputs.forEach(input => input.value = '');
          
          // Animate Gate Out (Down)
          gate.classList.remove('active');
          
          // Animate Logo In (Down)
          logo.classList.remove('fade-out-up');
          
          setTimeout(() => {
              if (!isOpen) gate.classList.add('hidden');
          }, 400); // Match transition time
      };

      const checkCode = () => {
          const enteredCode = inputs.map(input => input.value).join('');
          
          if (enteredCode.length === 4) {
              if (enteredCode === CODE) {
                  // Success - Green flash, then redirect
                  triggerFlash(flash, 'success');
                  setTimeout(() => {
                      // TODO: Update with actual portfolio URL when ready
                      window.location.href = 'portfolio.html';
                  }, 500);
              } else {
                  // Failure - Red flash, clear inputs
                  triggerFlash(flash, 'error');
                  setTimeout(() => {
                      inputs.forEach(input => input.value = '');
                      inputs[0].focus();
                  }, 350);
              }
          }
      };

      // --- Event Listeners ---

      trigger.addEventListener('click', openGate);

      // Close on Escape or click outside (optional, sticking to ESC for now)
      document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && isOpen) {
              closeGate();
          }
      });

      inputs.forEach((input, index) => {
          input.addEventListener('keydown', (e) => {
              if (e.key === 'Backspace') {
                  if (input.value === '') {
                      if (index > 0) {
                          inputs[index - 1].focus();
                      } else {
                          // Backspace on empty first input closes gate
                          closeGate();
                      }
                  }
              }
          });

          input.addEventListener('input', (e) => {
              const val = e.target.value;
              
              // Only allow numbers
              if (!/^\d*$/.test(val)) {
                  e.target.value = val.replace(/\D/g, '');
                  return;
              }

              if (val.length === 1) {
                  if (index < inputs.length - 1) {
                      inputs[index + 1].focus();
                  } else {
                      // Last digit entered
                      checkCode();
                  }
              } else if (val.length > 1) {
                  // Handle paste or fast typing
                  const chars = val.split('');
                  e.target.value = chars[0];
                  let nextIndex = index + 1;
                  for (let i = 1; i < chars.length && nextIndex < inputs.length; i++) {
                      inputs[nextIndex].value = chars[i];
                      nextIndex++;
                  }
                  if (nextIndex < inputs.length) {
                      inputs[nextIndex].focus();
                  } else {
                      checkCode();
                  }
              }
          });
          
          // Prevent default navigation
          input.addEventListener('focus', () => {
              // Optional: Select all on focus
              input.select();
          });
      });
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                           SOUND TOGGLE UI                                    ║
  // ║            Button to enable/disable underwater pebble collision sounds       ║
  // ║         Positioned at right edge, vertically centered (bonus feature)        ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // Icon font glyphs (Tabler Icons Outline)
  const ICON_SOUND_OFF = '<i class="ti ti-volume-off" aria-hidden="true"></i>';
  const ICON_SOUND_ON = '<i class="ti ti-volume-2" aria-hidden="true"></i>';

  let buttonElement = null;

  /**
   * Create and inject the sound toggle button into the DOM
   * Positioned at right edge, vertically centered
   * Hover triggers background color transition (grey → white)
   */
  function createSoundToggle() {
    // Initialize sound engine (non-blocking)
    initSoundEngine();
    
    // Check if prefers-reduced-motion (don't create button)
    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motionQuery.matches) {
        console.log('⏸ Sound toggle hidden (prefers-reduced-motion)');
        return null;
      }
    }
    
    // Create button element
    buttonElement = document.createElement('button');
    buttonElement.className = 'sound-toggle';
    buttonElement.id = 'sound-toggle';
    buttonElement.type = 'button';
    buttonElement.setAttribute('aria-label', 'Toggle collision sounds');
    buttonElement.setAttribute('aria-pressed', 'false');
    buttonElement.setAttribute('data-enabled', 'false');
    
    // No inline styles - CSS handles all styling via .sound-toggle class

    // Initial icon (sound starts off)
    buttonElement.innerHTML = ICON_SOUND_OFF;
    buttonElement.title = 'Sound off';
    
    // Click handler
    buttonElement.addEventListener('click', handleToggleClick);
    
    // Preferred mounts:
    // - Mobile: a full-width row under legend + description (#top-elements-soundRow)
    // - Desktop: top-right row next to the decorative text (#top-elements-rightRow)
    // Fallback: append to #fade-content so it fades with other content.
    const fadeContent = document.getElementById('fade-content');
    const topSlot = document.getElementById('sound-toggle-slot');
    const soundRow = document.getElementById('top-elements-soundRow');
    const socialLinks = document.getElementById('social-links');
    const footerMeta = document.querySelector('.ui-meta-right'); // New slot
    const canMountInTopSlot = !!topSlot;
    const canMountInSocialLinks = socialLinks && (!fadeContent || fadeContent.contains(socialLinks));
    const prefersMobileFullWidth =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 480px)').matches;
    
    const mountInto = (parent) => {
      if (!parent) return false;
      // Move if already mounted somewhere else
      try {
        if (buttonElement.parentElement && buttonElement.parentElement !== parent) {
          buttonElement.parentElement.removeChild(buttonElement);
        }
      } catch (e) {}
      // If mounting into ui-meta-right, put it before the time element
      if (parent.classList.contains('ui-meta-right')) {
          const timeEl = parent.querySelector('time');
          if (timeEl) {
              parent.insertBefore(buttonElement, timeEl);
              return true;
          }
      }
      parent.appendChild(buttonElement);
      return true;
    };

    if (prefersMobileFullWidth && soundRow) {
      buttonElement.classList.add('sound-toggle--top');
      buttonElement.classList.add('sound-toggle--topwide');
      mountInto(soundRow);
    } else if (canMountInTopSlot) {
      // Priority: Top Right Slot (Desktop/Tablet)
      buttonElement.classList.add('sound-toggle--top');
      mountInto(topSlot);
    } else if (footerMeta) {
      // Fallback: Footer Meta
      mountInto(footerMeta);
    } else if (canMountInSocialLinks) {
      const li = document.createElement('li');
      li.className = 'margin-bottom_none sound-toggle-item';
      buttonElement.classList.add('sound-toggle--social');
      li.appendChild(buttonElement);
      socialLinks.appendChild(li);
    } else if (fadeContent) {
      fadeContent.appendChild(buttonElement);
    } else {
      document.body.appendChild(buttonElement);
    }

    // If the viewport crosses the mobile breakpoint, re-mount to keep layout correct.
    try {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        const mq = window.matchMedia('(max-width: 480px)');
        const handler = () => {
          const sr = document.getElementById('top-elements-soundRow');
          const ts = document.getElementById('sound-toggle-slot');
          const shouldBeWide = mq.matches && !!sr;
          buttonElement.classList.toggle('sound-toggle--topwide', shouldBeWide);
          if (shouldBeWide) {
            mountInto(sr);
          } else if (ts) {
            mountInto(ts);
          }
        };
        // Prefer modern API, fall back gracefully.
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
        else if (typeof mq.addListener === 'function') mq.addListener(handler);
      }
    } catch (e) {}
    
    console.log('✓ Sound toggle created');

    // Sync initial UI with current sound state (if enabled elsewhere)
    try {
      const state = getSoundState();
      updateButtonState$1(!!(state.isUnlocked && state.isEnabled));
    } catch (e) {}

    // Stay in sync with panel toggles
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener(SOUND_STATE_EVENT, (e) => {
        const s = e && e.detail ? e.detail : null;
        if (s) updateButtonState$1(!!(s.isUnlocked && s.isEnabled));
      });
    }

    return buttonElement;
  }

  /**
   * Handle button click - unlock audio on first click, toggle thereafter
   */
  async function handleToggleClick() {
    const state = getSoundState();
    
    if (!state.isUnlocked) {
      // First click: unlock audio context
      const success = await unlockAudio();
      if (success) {
        updateButtonState$1(true);
      } else {
        // Failed to unlock - show error state briefly, then revert
        if (buttonElement) {
          buttonElement.innerHTML = ICON_SOUND_OFF;
          buttonElement.setAttribute('aria-label', 'Audio unavailable');
          buttonElement.title = 'Audio unavailable';
        }
        setTimeout(() => {
          updateButtonState$1(false);
        }, 2000);
      }
    } else {
      // Subsequent clicks: toggle on/off
      const newState = toggleSound();
      updateButtonState$1(newState);
    }
  }

  /**
   * Update button text and state attributes
   * @param {boolean} enabled - Current enabled state
   */
  function updateButtonState$1(enabled) {
    if (!buttonElement) return;
    
    buttonElement.setAttribute('data-enabled', enabled ? 'true' : 'false');
    buttonElement.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    buttonElement.setAttribute('aria-label', enabled ? 'Sound on' : 'Sound off');
    buttonElement.title = enabled ? 'Sound on' : 'Sound off';
    buttonElement.innerHTML = enabled ? ICON_SOUND_ON : ICON_SOUND_OFF;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                           THEME TOGGLE BUTTON                                ║
  // ║          Standalone button for quick light/dark mode switching               ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function createThemeToggle() {
    // Check if toggle already exists
    if (document.getElementById('theme-toggle-btn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'theme-toggle-btn';
    btn.className = 'theme-toggle'; // Styles defined in main.css
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.setAttribute('type', 'button');
    
    // Set initial state
    updateButtonState(btn);
    
    // Toggle on click
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const current = getCurrentTheme();
      // Toggle between light and dark (skipping auto for simplicity in this button)
      const next = current === 'dark' ? 'light' : 'dark';
      
      setTheme(next);
      updateButtonState(btn);
      
      // Announce to screen readers
      const announcer = document.getElementById('announcer');
      if (announcer) {
        announcer.textContent = `Theme switched to ${next} mode`;
      }
    });
    
    // Add to body
    document.body.appendChild(btn);
  }

  function updateButtonState(btn) {
    const current = getCurrentTheme();
    // Use simple icon instead of text label
    btn.textContent = current === 'dark' ? '☀' : '☾';
    btn.title = current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                           SOCIAL ICONS UPGRADE                               ║
  // ║      Replace Webflow-exported icons with a self-hosted icon font             ║
  // ║                 (no inline SVGs in the DOM)                                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  const ICON_BY_LABEL = new Map([
    ['apple music', '<i class="ti ti-brand-apple" aria-hidden="true"></i>'],
    ['instagram', '<i class="ti ti-brand-instagram" aria-hidden="true"></i>'],
    ['linkedin', '<i class="ti ti-brand-linkedin" aria-hidden="true"></i>'],
  ]);

  function upgradeSocialIcons() {
    const list = document.getElementById('social-links');
    if (!list) return;

    // Idempotent: if we already upgraded one icon, bail out fast.
    if (list.querySelector('i.ti')) return;

    const links = Array.from(list.querySelectorAll('a.footer_icon-link[aria-label]'));
    for (const a of links) {
      const label = (a.getAttribute('aria-label') || '').trim().toLowerCase();
      const iconHtml = ICON_BY_LABEL.get(label);
      if (!iconHtml) continue;

      const existingSvg = a.querySelector('svg');
      if (existingSvg) {
        // Replace only the icon; preserve the screen-reader text span.
        a.insertAdjacentHTML('afterbegin', iconHtml);
        existingSvg.remove();
      } else {
        a.insertAdjacentHTML('afterbegin', iconHtml);
      }
    }
  }

  /**
   * Updates the footer time display to show current London time.
   */
  function initTimeDisplay() {
    const timeDisplay = document.getElementById('time-display');
    if (!timeDisplay) return;

    function updateTime() {
      const now = new Date();
      // Get London time
      const timeString = now.toLocaleTimeString('en-GB', {
        timeZone: 'Europe/London',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).toUpperCase(); // AM/PM usually upper case

      // Remove any leading zero if present (en-GB/US might add it depending on browser, 
      // but hour: 'numeric' usually suppresses it).
      // Also, usually AM/PM is with space.
      
      timeDisplay.textContent = timeString;
    }

    // Update immediately
    updateTime();

    // Update every second to ensure accuracy (lightweight)
    setInterval(updateTime, 1000);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      BOUNCY BALLS – MAIN ENTRY (COMPLETE)                    ║
  // ║                       Modular Architecture Bootstrap                         ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  async function loadRuntimeConfig() {
    try {
      const paths = ['config/default-config.json', 'js/config.json', '../public/js/config.json'];
      for (const path of paths) {
        try {
          const res = await fetch(path, { cache: 'no-cache' });
          if (res.ok) return await res.json();
        } catch (e) {
          // Try next
        }
      }
      throw new Error('No config found');
    } catch (e) {
      console.warn('Config load failed, using defaults');
      return { gravityMultiplier: 1.05, ballMass: 91, maxBalls: 300 };
    }
  }

  /**
   * Apply two-level padding CSS variables from global state to :root
   * 
   * Two-level system:
   * 1. --container-border: insets #bravia-balls from viewport (reveals body bg as outer frame)
   * 2. --simulation-padding: padding inside container around canvas (inner breathing room)
   * 
   * The canvas radius auto-calculates via CSS: calc(var(--container-radius) - var(--simulation-padding))
   */
  function applyFramePaddingCSSVars() {
    const g = getGlobals();
    const root = document.documentElement;
    
    // Outer frame: container inset from viewport
    root.style.setProperty('--container-border', `${g.containerBorder ?? 20}px`);
    
    // Inner padding: canvas inset from container
    root.style.setProperty('--simulation-padding', `${g.simulationPadding || 0}px`);
  }

  /**
   * Apply visual CSS variables (noise opacity/size, walls) from config to :root
   */
  function applyVisualCSSVars(config) {
    const root = document.documentElement;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // RUBBER WALL SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════════
    if (config.wallThickness !== undefined) {
      root.style.setProperty('--wall-thickness', `${config.wallThickness}px`);
    }
    if (config.wallRadius !== undefined) {
      root.style.setProperty('--wall-radius', `${config.wallRadius}px`);
    }
    
    // Content padding (space between frame edge and content elements)
    if (config.contentPadding !== undefined) {
      root.style.setProperty('--content-padding', `${config.contentPadding}px`);
    }

    // Container inner shadow (inside rounded container wrapper)
    if (config.containerInnerShadowOpacity !== undefined) {
      root.style.setProperty('--container-inner-shadow-opacity', String(config.containerInnerShadowOpacity));
    }
    if (config.containerInnerShadowBlur !== undefined) {
      root.style.setProperty('--container-inner-shadow-blur', `${config.containerInnerShadowBlur}px`);
    }
    if (config.containerInnerShadowSpread !== undefined) {
      root.style.setProperty('--container-inner-shadow-spread', `${config.containerInnerShadowSpread}px`);
    }
    if (config.containerInnerShadowOffsetY !== undefined) {
      root.style.setProperty('--container-inner-shadow-offset-y', `${config.containerInnerShadowOffsetY}px`);
    }
    
    // Noise texture sizing
    if (config.noiseSizeBase !== undefined) {
      root.style.setProperty('--noise-size-base', `${config.noiseSizeBase}px`);
    }
    if (config.noiseSizeTop !== undefined) {
      root.style.setProperty('--noise-size-top', `${config.noiseSizeTop}px`);
    }
    
    // Noise opacity (light mode)
    if (config.noiseBackOpacity !== undefined) {
      root.style.setProperty('--noise-back-opacity', String(config.noiseBackOpacity));
    }
    if (config.noiseFrontOpacity !== undefined) {
      root.style.setProperty('--noise-front-opacity', String(config.noiseFrontOpacity));
    }
    
    // Noise opacity (dark mode)
    if (config.noiseBackOpacityDark !== undefined) {
      root.style.setProperty('--noise-back-opacity-dark', String(config.noiseBackOpacityDark));
    }
    if (config.noiseFrontOpacityDark !== undefined) {
      root.style.setProperty('--noise-front-opacity-dark', String(config.noiseFrontOpacityDark));
    }
  }

  /**
   * Ensure .noise-2 and .noise-3 elements exist (for modular dev where Webflow HTML isn't present).
   * Creates them as siblings to .noise inside the #bravia-balls container.
   */
  function ensureNoiseElements() {
    // Check if we have a noise texture image to use
    const existingNoise = document.querySelector('.noise');
    if (!existingNoise) {
      // No noise system present (modular dev without Webflow assets) - skip
      return;
    }

    // Keep noise layers scoped to the simulation container (rounded/inset frame),
    // otherwise `position: fixed` + body-append will blanket the entire viewport.
    const container =
      existingNoise.closest('#bravia-balls') ||
      document.getElementById('bravia-balls') ||
      existingNoise.parentElement ||
      document.body;
    
    const noiseStyle = getComputedStyle(existingNoise);
    const bgImage = (noiseStyle.backgroundImage && noiseStyle.backgroundImage !== 'none') 
      ? noiseStyle.backgroundImage 
      : null;
    
    // Create noise-2 if it doesn't exist
    if (!document.querySelector('.noise-2')) {
      const noise2 = document.createElement('div');
      noise2.className = 'noise-2';
      if (bgImage) noise2.style.backgroundImage = bgImage;

      // Let CSS own positioning/blend/opacity so it stays in sync with config vars.
      container.appendChild(noise2);
      console.log('✓ Created .noise-2 element');
    }
    
    // Create noise-3 if it doesn't exist (on top of noise-2)
    if (!document.querySelector('.noise-3')) {
      const noise3 = document.createElement('div');
      noise3.className = 'noise-3';
      if (bgImage) noise3.style.backgroundImage = bgImage;

      // Let CSS own positioning/blend/opacity so it stays in sync with config vars.
      container.appendChild(noise3);
      console.log('✓ Created .noise-3 element');
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    FOOTER LINKS — MOBILE WRAP ENHANCEMENTS                    ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  // We avoid editing the Webflow export HTML directly by enhancing at runtime.
  function enhanceFooterLinksForMobile() {
    try {
      const cv = document.getElementById('cv-gate-trigger');
      if (cv && !cv.querySelector('.footer-link-nowrap')) {
        const raw = (cv.textContent || '').trim().replace(/\s+/g, ' ');
        if (raw.toLowerCase() === 'download bio/cv') {
          cv.innerHTML = 'Download <span class="footer-link-nowrap">Bio/CV</span>';
        }
      }
    } catch (e) {}
  }

  (async function init() {
    // Mark JS as enabled (for CSS fallback detection)
    document.documentElement.classList.add('js-enabled');

    // Production console policy (banner + silence). DEV remains verbose.
    // Production console policy: multi-colored ASCII banner matching ball palette.
    // Uses defaults from logger.js (sentence + ASCII defined there for single source of truth).
    initConsolePolicy();
    
    // Wire up control registry to use CSS vars function (avoids circular dependency)
    setApplyVisualCSSVars(applyVisualCSSVars);
    
    try {
      group('BouncyBalls bootstrap');
      mark('bb:start');
      log('🚀 Initializing modular bouncy balls...');
      
      const config = await loadRuntimeConfig();
      initState(config);
      mark('bb:config');
      log('✓ Config loaded');

      // Test/debug compatibility: expose key config-derived values on window
      // (Playwright tests assert these exist and match the runtime config)
      try {
        const g = getGlobals();
        if (typeof window !== 'undefined') {
          window.REST = g.REST;
          window.FRICTION = g.FRICTION;
          window.MAX_BALLS = g.maxBalls;
          window.repelRadius = g.repelRadius;
          window.repelPower = g.repelPower;
        }
      } catch (e) {}
      
      // Apply frame padding CSS vars from config (controls border thickness)
      applyFramePaddingCSSVars();
      log('✓ Frame padding applied');
      
      // Apply visual CSS vars (noise, inner shadow) from config
      applyVisualCSSVars(config);
      log('✓ Visual effects configured');
      
      // Ensure noise-2 and noise-3 elements exist (for modular dev environments)
      ensureNoiseElements();
      
      // Setup canvas (attaches resize listener, but doesn't resize yet)
      setupRenderer();
      const canvas = getCanvas();
      const ctx = getContext();
      const container = document.getElementById('bravia-balls');
      
      if (!canvas || !ctx || !container) {
        throw new Error('Missing DOM elements');
      }

      // Accessibility: the canvas is an interactive surface (keyboard + pointer).
      // Ensure we expose it as an application-like region for AT.
      try {
        canvas.setAttribute('role', 'application');
        if (!canvas.getAttribute('aria-label')) {
          canvas.setAttribute('aria-label', 'Interactive bouncy balls physics simulation');
        }
      } catch (e) {}
      
      // Set canvas reference in state (needed for container-relative sizing)
      setCanvas(canvas, ctx, container);
      
      // NOW resize - container is available for container-relative sizing
      resize();
      mark('bb:renderer');
      log('✓ Canvas initialized (container-relative sizing)');
      
      // Ensure initial mouseInCanvas state is false for tests
      const globals = getGlobals();
      globals.mouseInCanvas = false;
      if (typeof window !== 'undefined') window.mouseInCanvas = false;
      
      // Setup pointer tracking BEFORE dark mode (needed for interactions)
      setupPointer();
      log('✓ Pointer tracking configured');
      
      // Setup custom cursor (circular, matches ball size)
      setupCustomCursor();
      mark('bb:input');
      log('✓ Custom cursor initialized');

      // Subtle brand logo micro-interaction (cursor distance scaling)
      initBrandLogoCursorScale();

      // Brand logo yields when balls crowd its area (simulation-driven, throttled)
      initBrandLogoBallSpace();
      
      // Load any saved settings
      loadSettings();

      // Initialize sound engine once (no AudioContext yet; unlock requires user gesture)
      initSoundEngine();
      log('✓ Sound engine primed (awaiting user unlock)');
      
      // Setup UI (panel DOM must exist before theme init binds buttons)
      createPanelDock();
      populateColorSelect();
      mark('bb:ui');
      log('✓ Panel dock created (Sound + Controls)');

      // Initialize dark mode AFTER panel creation (theme buttons exist now)
      initializeDarkMode();
      mark('bb:theme');
      
      setupKeyboardShortcuts();
      log('✓ Keyboard shortcuts registered');
      
      // Initialize password gates (CV and Portfolio protection)
      initCVGate();
      log('✓ CV password gate initialized');
      
      initPortfolioGate();
      log('✓ Portfolio password gate initialized');

      // Compose the top UI (LEGACY FUNCTION REMOVED - NOW IN DOM)
      // setupTopElementsLayout();

      // Normalize social icons (line SVGs) across dev + build.
      // (Build uses webflow-export HTML; we patch at runtime for consistency.)
      upgradeSocialIcons();

      // Initialize time display (London time)
      initTimeDisplay();

      // Footer: mobile-friendly wrapping tweaks (keeps "Bio/CV" together)
      enhanceFooterLinksForMobile();
      
      // Create quick sound toggle button (bottom-right, next to time)
      createSoundToggle();
      log('✓ Sound toggle button created');
      
      // Create quick theme toggle button (bottom-left)
      createThemeToggle();
      log('✓ Theme toggle button created');
      
      // Layout controls integrated into master panel
      
      // Initialize starting mode (Simulation 11: Worms, active by default for now)
      setMode(MODES.WORMS);
      mark('bb:mode');
      log('✓ Mode initialized');
      
      // Start main render loop
      const getForces = () => getForceApplicator();
      startMainLoop((ball, dt) => {
        const forceFn = getForces();
        if (forceFn) forceFn(ball, dt);
      });
      
      mark('bb:end');
      log('✅ Bouncy Balls running (modular)');

      // DEV-only: summarize init timings in a compact table.
      const rows = [
        { phase: 'config', ms: measure('bb:m:config', 'bb:start', 'bb:config') },
        { phase: 'renderer', ms: measure('bb:m:renderer', 'bb:config', 'bb:renderer') },
        { phase: 'input', ms: measure('bb:m:input', 'bb:renderer', 'bb:input') },
        { phase: 'ui', ms: measure('bb:m:ui', 'bb:input', 'bb:ui') },
        { phase: 'theme', ms: measure('bb:m:theme', 'bb:ui', 'bb:theme') },
        { phase: 'mode+loop', ms: measure('bb:m:mode', 'bb:theme', 'bb:mode') },
        { phase: 'total', ms: measure('bb:m:total', 'bb:start', 'bb:end') },
      ].filter((r) => typeof r.ms === 'number');
      if (rows.length) table(rows.map((r) => ({ ...r, ms: Number(r.ms.toFixed(2)) })));
      groupEnd();
      
      // ╔══════════════════════════════════════════════════════════════════════════════╗
      // ║                             PAGE FADE-IN                                    ║
      // ╚══════════════════════════════════════════════════════════════════════════════╝
      // Goal: fade ALL UI content (inside #fade-content) from 0 → 1 on reload.
      //
      // Why this is tricky in this project:
      // - Much of the UI is `position: fixed` (Webflow export + our overrides).
      // - Fixed descendants can be composited outside a normal wrapper, so fading
      //   a parent via CSS can appear “broken”.
      // - We solve this with a fixed + transformed `#fade-content` (CSS) and we
      //   run the fade using Web Animations API (WAAPI) for maximum robustness.
      //
      // Failsafe:
      // If, for any reason, the animation gets canceled or never runs, we force
      // the content visible after a short timeout so the page never “sticks” hidden.

      const FADE_DELAY_MS = 400;
      const FADE_DURATION_MS = 3000;
      // Expo-ish ease-out approximation (WAAPI accepts CSS easing strings)
      // Intention: commits quickly, then settles gently.
      const FADE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
      const FADE_FAILSAFE_MS = FADE_DELAY_MS + FADE_DURATION_MS + 750;

      const forceFadeVisible = (fadeEl, reason) => {
        // Inline style beats stylesheet opacity:0
        fadeEl.style.opacity = '1';
        console.warn(`⚠️ Fade failsafe: forcing #fade-content visible (${reason})`);
      };

      setTimeout(() => {
        const fadeContent = document.getElementById('fade-content');
        // Legacy #top-elements is gone, now part of #fade-content

        if (!fadeContent) {
          console.warn('⚠️ #fade-content not found (fade skipped)');
          return;
        }

        // Accessibility: respect reduced motion by skipping animation entirely.
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
          if (fadeContent) fadeContent.style.opacity = '1';
          console.log('✓ Page fade-in skipped (prefers-reduced-motion)');
          return;
        }

        // If WAAPI is missing (older browsers / restricted contexts), fall back to inline style.
        if (fadeContent && typeof fadeContent.animate !== 'function') {
          forceFadeVisible(fadeContent, 'WAAPI unsupported');
          return;
        }

        const animateOpacity = (el) => {
          if (!el || typeof el.animate !== 'function') return null;
          return el.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            {
              duration: FADE_DURATION_MS,
              easing: FADE_EASING,
              fill: 'forwards',
            }
          );
        };

        const anim = animateOpacity(fadeContent);

        // When finished, stamp final opacity as an inline style. This prevents edge cases
        // where a later style recalc/compositing change makes it appear hidden again.
        anim?.addEventListener?.('finish', () => {
          if (fadeContent) fadeContent.style.opacity = '1';
          console.log('✓ Page fade-in finished');
        });

        anim?.addEventListener?.('cancel', () => {
          if (fadeContent) forceFadeVisible(fadeContent, 'animation canceled');
        });

        console.log('✓ Page fade-in started (WAAPI)');

        // Ultimate failsafe: never allow permanent hidden UI.
        setTimeout(() => {
          if (fadeContent) {
            const opacity = window.getComputedStyle(fadeContent).opacity;
            if (opacity === '0') forceFadeVisible(fadeContent, 'opacity still 0 after failsafe window');
          }
        }, FADE_FAILSAFE_MS);
      }, FADE_DELAY_MS);
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      document.body.innerHTML = `<div style="padding: 20px; color: red; background: white;">
      <h2>Initialization Error</h2>
      <pre>${error.message}\n${error.stack}</pre>
    </div>`;
    }
  })();

  exports.applyFramePaddingCSSVars = applyFramePaddingCSSVars;
  exports.applyVisualCSSVars = applyVisualCSSVars;

  return exports;

})({});
//# sourceMappingURL=bouncy-balls-embed.js.map
