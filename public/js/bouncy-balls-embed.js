/* Alexander Beck Studio – Bouncy Balls | Build: 2025-12-13T00:53:38.060Z */
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
    BUBBLES: 'bubbles'
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
  // ║                      STATE STORE (COMPLETE)                                  ║
  // ║               All global state - extracted from balls-source.html            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  const state = {
    config: {},
    currentMode: MODES.FLIES,
    balls: [],
    canvas: null,
    ctx: null,
    container: null,
    mouseX: CONSTANTS.OFFSCREEN_MOUSE,
    mouseY: CONSTANTS.OFFSCREEN_MOUSE,
    mouseInCanvas: false,
    
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
    
    // Device
    DPR: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    
    // Size
    sizeScale: 1.2,
    sizeVariation: 0,
    responsiveScale: 1.0,
    R_MIN_BASE: 6,
    R_MAX_BASE: 24,
    R_MIN: 6 * 1.2 * 0.75,
    R_MAX: 24 * 1.2 * 1.25,
    
    // Ball properties
    ballSoftness: 20,
    
    // Corner (matches CSS border-radius for collision bounds)
    cornerRadius: 42,
    
    // Inner border (soft visual transition)
    
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
    bubblesMaxCount: 150,
    bubblesDeflectRadius: 80,
    
    
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
    
    // Pulse Grid mode
    gridColumns: 40,
    gridBallCount: 120,
    pulseInterval: 0.8,
    
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
    
    // Two-level padding system (in pixels)
    containerBorder: 0,    // Outer: insets container from viewport (reveals body bg as frame)
    simulationPadding: 0,  // Inner: padding inside container around canvas
    
    // Rubber Wall Visual System (4 user-controllable parameters)
    wallThickness: 12,        // Thickness of rubber tube walls (px)
    wallSoftness: 20,         // Blur radius for cushioned glow (px)
    wallRadius: 42,           // Corner radius - shared by all rounded elements (px)
    wallBounceIntensity: 0,   // Current bounce highlight (0-1, animated on impact)
    wallBounceHighlightMax: 0.3, // Max flash intensity when balls hit (user-controllable)
    
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
    if (config.gravityMultiplier) state.gravityMultiplier = config.gravityMultiplier;
    if (config.restitution) state.REST = config.restitution;
    if (config.friction) state.FRICTION = config.friction;
    if (config.ballScale) state.sizeScale = config.ballScale;
    
    // Two-level padding system
    if (config.containerBorder !== undefined) state.containerBorder = config.containerBorder;
    if (config.simulationPadding !== undefined) state.simulationPadding = config.simulationPadding;
    
    // Rubber wall visuals
    if (config.wallThickness !== undefined) state.wallThickness = config.wallThickness;
    if (config.wallSoftness !== undefined) state.wallSoftness = config.wallSoftness;
    if (config.wallRadius !== undefined) state.wallRadius = config.wallRadius;
    
    // Recalculate R_MIN and R_MAX
    const baseSize = (state.R_MIN_BASE + state.R_MAX_BASE) / 2;
    state.R_MIN = baseSize * state.sizeScale * 0.75;
    state.R_MAX = baseSize * state.sizeScale * 1.25;
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

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                        COLOR PALETTE SYSTEM (COMPLETE)                       ║
  // ║              Extracted from balls-source.html lines 1405-1558                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  const COLOR_TEMPLATES = {
    industrialTeal: { 
      label: 'Industrial Teal',
      light: ['#b7bcb7', '#e4e9e4', '#ffffff', '#00695c', '#000000', '#ff4013', '#0d5cb6', '#ffa000'],
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

  const COLOR_WEIGHTS = [0.50, 0.25, 0.12, 0.06, 0.03, 0.02, 0.01, 0.01];

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
    
    for (let i = 0; i < Math.min(colors.length, COLOR_WEIGHTS.length); i++) {
      cumulativeWeight += COLOR_WEIGHTS[i];
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
  // ║                    SOUND ENGINE — "UNDERWATER PEBBLES"                       ║
  // ║        Dreamy, muffled collision sounds using Web Audio API synthesis        ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  /**
   * Sound Design: Underwater Pebbles
   * - Sine wave body with subtle 2nd harmonic for warmth
   * - Low-pass filter (2-3.5kHz) simulates water absorption
   * - Shared reverb bus for cohesion
   * - Pentatonic pitch mapping ensures pleasant overlaps
   * - Ball radius → pitch (large = low, small = high)
   * - Collision intensity → volume + filter brightness
   */

  // ════════════════════════════════════════════════════════════════════════════════
  // PENTATONIC SCALE FREQUENCIES (C Major Pentatonic: C-D-E-G-A)
  // Always harmonious when multiple sounds overlap
  // ════════════════════════════════════════════════════════════════════════════════
  const PENTATONIC_FREQUENCIES = [
    131.0,  // C3
    147.0,  // D3
    165.0,  // E3
    196.0,  // G3
    220.0,  // A3
    262.0,  // C4
    294.0,  // D4
    330.0,  // E4
    392.0,  // G4
    440.0,  // A4
    523.0,  // C5
  ];

  // ════════════════════════════════════════════════════════════════════════════════
  // CONFIGURATION (mutable for runtime tweaking)
  // ════════════════════════════════════════════════════════════════════════════════
  let CONFIG = {
    // Synthesis — instant attack, soft decay
    attackTime: 0,               // 0ms = instant onset (sub-1ms response)
    decayTime: 0.045,            // Wooden: quick, dry "clack"
    harmonicGain: 0.12,          // Wooden: a bit more body (warmth)
    
    // Filter — soft but present
    filterBaseFreq: 2100,        // Wooden: mid-range, not glassy
    filterVelocityRange: 320,    // Wooden: less brightness swing
    filterQ: 0.45,               // Slightly more focused than "soft click"
    
    // Reverb — gentle tail
    reverbDecay: 0.18,           // Wooden: drier room
    reverbWetMix: 0.12,          // Wooden: low wet mix
    reverbHighDamp: 0.65,        // Damped highs
    
    // Volume — soft but clicky
    minGain: 0.03,               // Lower floor (avoid constant “ticking”)
    maxGain: 0.18,               // Cap peaks (keeps scene calm)
    masterGain: 0.42,            // Lower overall loudness
    
    // Performance (voice pool size is fixed at 8)
    minTimeBetweenSounds: 0.008, // Per-ball debounce (8ms, tighter)
    
    // Stereo
    maxPan: 0.22,                // Subtle width
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ENERGY-BASED SOUND SYSTEM — Small Wooden Play Circles
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Collision threshold (soft touches are silent, like real wooden pieces)
    collisionMinImpact: 0.12,    // Light taps still audible, feather touches silent
    
    // Rolling rumble (wood-on-surface friction)
    // Think: wooden beads rolling on a table — subtle, textured
    rollingEnabled: true,
    rollingMaxVelocity: 80,      // Only when rolling slowly (settling)
    rollingMinVelocity: 15,      // Below this = too slow, silent
    rollingGain: 0.02,           // Very subtle — background texture only
    rollingFreq: 130,            // Slightly higher (lighter wooden timbre)
    
    // Air whoosh — DISABLED for small wooden pieces
    // These are too small/light to displace air audibly
    whooshEnabled: false,        // ← Disabled! Not realistic for small objects
    whooshMinVelocity: 500,      // (unused)
    whooshGain: 0.0,             // (unused)
    whooshFreq: 800,             // (unused)
  };

  // ════════════════════════════════════════════════════════════════════════════════
  // SOUND PRESETS
  // ════════════════════════════════════════════════════════════════════════════════
  const SOUND_PRESETS = {
    // ═══════════════════════════════════════════════════════════════════════════════
    // MATERIAL FAMILY — same "room/space", different material response
    //
    // Philosophy:
    // - We keep Space constant across materials (reverbDecay/reverbWetMix fixed),
    //   because the *environment* is stable while the *material* changes.
    // - Material primarily shifts: brightness (filterBaseFreq), body (harmonicGain),
    //   onset/decay (decayTime), silence threshold (collisionMinImpact),
    //   and surface friction (rollingGain/rollingFreq).
    //
    // Shared Space (dry-ish studio / classroom room tone)
    //   reverbDecay: 0.18, reverbWetMix: 0.12
    // ═══════════════════════════════════════════════════════════════════════════════

    materialWood: {
      label: 'Material — Wood',
      description: 'Warm clacks · dry room · subtle surface friction',
      attackTime: 0,
      decayTime: 0.045,
      harmonicGain: 0.12,
      filterBaseFreq: 2100,
      filterVelocityRange: 320,
      filterQ: 0.45,
      reverbDecay: 0.18,
      reverbWetMix: 0.12,
      masterGain: 0.42,
      minGain: 0.03,
      maxGain: 0.18,
      collisionMinImpact: 0.12,
      rollingEnabled: true,
      rollingGain: 0.02,
      rollingFreq: 130,
      rollingMinVelocity: 14,
      rollingMaxVelocity: 85,
      whooshEnabled: false,
    },

    materialStone: {
      label: 'Material — Stone',
      description: 'Crisper taps · slightly brighter · more “tick”',
      attackTime: 0,
      decayTime: 0.04,
      harmonicGain: 0.08,      // stone is “hard”, less warm harmonic body
      filterBaseFreq: 2850,    // brighter than wood
      filterVelocityRange: 520,
      filterQ: 0.55,
      reverbDecay: 0.18,
      reverbWetMix: 0.12,
      masterGain: 0.4,
      minGain: 0.03,
      maxGain: 0.2,
      collisionMinImpact: 0.14, // small contacts often silent (hard, quick)
      rollingEnabled: true,
      rollingGain: 0.012,       // stone rolling is quieter at this scale
      rollingFreq: 110,
      rollingMinVelocity: 14,
      rollingMaxVelocity: 85,
      whooshEnabled: false,
    },

    materialPlastic: {
      label: 'Material — Plastic',
      description: 'Softer “tok” · less bright · slightly longer decay',
      attackTime: 0,
      decayTime: 0.06,
      harmonicGain: 0.16,     // a bit more “hollow” body
      filterBaseFreq: 1650,   // darker, less brittle
      filterVelocityRange: 260,
      filterQ: 0.35,
      reverbDecay: 0.18,
      reverbWetMix: 0.12,
      masterGain: 0.44,
      minGain: 0.03,
      maxGain: 0.19,
      collisionMinImpact: 0.1,  // plastic transmits small taps more audibly
      rollingEnabled: true,
      rollingGain: 0.024,       // slightly more surface chatter
      rollingFreq: 155,
      rollingMinVelocity: 14,
      rollingMaxVelocity: 85,
      whooshEnabled: false,
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // DEFAULT — Wooden Discs (preschool play circles)
    // Design goal: soft woody "clack", dry room, light collisions mostly silent
    // ═══════════════════════════════════════════════════════════════════════════════
    woodenDiscs: {
      label: 'Wooden Discs',
      description: 'Warm woody clacks · subtle table friction · no air whoosh',
      // Collision voice
      attackTime: 0,
      decayTime: 0.045,
      harmonicGain: 0.12,
      filterBaseFreq: 2100,
      filterVelocityRange: 320,
      filterQ: 0.45,
      reverbDecay: 0.18,
      reverbWetMix: 0.12,
      // Loudness shaping (so the scene stays calm)
      masterGain: 0.42,
      minGain: 0.03,
      maxGain: 0.18,
      // Energy system
      collisionMinImpact: 0.12,
      rollingEnabled: true,
      rollingGain: 0.02,
      rollingFreq: 130,
      rollingMinVelocity: 14,
      rollingMaxVelocity: 85,
      whooshEnabled: false,
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // DEFAULT — soft click, instant, dissipating
    // All presets use attackTime: 0 for sub-1ms response
    // ═══════════════════════════════════════════════════════════════════════════════
    softClick: {
      label: 'Soft Click',
      description: 'Instant, clicky, gently fading',
      attackTime: 0, decayTime: 0.055, harmonicGain: 0.09,
      filterBaseFreq: 2400, filterVelocityRange: 380, filterQ: 0.4,
      reverbDecay: 0.28, reverbWetMix: 0.22, masterGain: 0.52,
      minGain: 0.05, maxGain: 0.28,
      collisionMinImpact: 0.13,
      rollingEnabled: true, rollingGain: 0.018, rollingFreq: 120, rollingMinVelocity: 14, rollingMaxVelocity: 85,
      whooshEnabled: false,
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // FAVORITES — River Stones & Rain Drops adjacent
    // ═══════════════════════════════════════════════════════════════════════════════
    riverStones: {
      label: 'River Stones',
      description: 'Crisp, tactile taps',
      attackTime: 0, decayTime: 0.05, harmonicGain: 0.18,
      filterBaseFreq: 2800, filterVelocityRange: 600, filterQ: 0.55,
      reverbDecay: 0.2, reverbWetMix: 0.15, masterGain: 0.48,
      minGain: 0.04, maxGain: 0.22,
      collisionMinImpact: 0.14,
      rollingEnabled: true, rollingGain: 0.016, rollingFreq: 110, rollingMinVelocity: 14, rollingMaxVelocity: 85,
      whooshEnabled: false,
    },
    rainDrops: {
      label: 'Rain Drops',
      description: 'Light, delicate plinks',
      attackTime: 0, decayTime: 0.042, harmonicGain: 0.11,
      filterBaseFreq: 3200, filterVelocityRange: 450, filterQ: 0.45,
      reverbDecay: 0.35, reverbWetMix: 0.3, masterGain: 0.4,
      minGain: 0.03, maxGain: 0.18,
      collisionMinImpact: 0.12,
      rollingEnabled: true, rollingGain: 0.014, rollingFreq: 135, rollingMinVelocity: 14, rollingMaxVelocity: 85,
      whooshEnabled: false,
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // NEW ADDITIONS — organic variations
    // ═══════════════════════════════════════════════════════════════════════════════
    silkTouch: {
      label: 'Silk Touch',
      description: 'Ultra-smooth, barely there',
      attackTime: 0, decayTime: 0.065, harmonicGain: 0.04,
      filterBaseFreq: 1800, filterVelocityRange: 250, filterQ: 0.3,
      reverbDecay: 0.4, reverbWetMix: 0.35, masterGain: 0.32,
      minGain: 0.02, maxGain: 0.14,
      collisionMinImpact: 0.16,
      rollingEnabled: true, rollingGain: 0.012, rollingFreq: 115, rollingMinVelocity: 14, rollingMaxVelocity: 85,
      whooshEnabled: false,
    },
    morningDew: {
      label: 'Morning Dew',
      description: 'Fresh, hopeful sparkle',
      attackTime: 0, decayTime: 0.048, harmonicGain: 0.14,
      filterBaseFreq: 3600, filterVelocityRange: 550, filterQ: 0.5,
      reverbDecay: 0.32, reverbWetMix: 0.28, masterGain: 0.38,
      minGain: 0.03, maxGain: 0.19,
      collisionMinImpact: 0.12,
      rollingEnabled: true, rollingGain: 0.014, rollingFreq: 140, rollingMinVelocity: 14, rollingMaxVelocity: 85,
      whooshEnabled: false,
    },
    bamboo: {
      label: 'Bamboo',
      description: 'Hollow, zen garden taps',
      attackTime: 0, decayTime: 0.08, harmonicGain: 0.2,
      filterBaseFreq: 2200, filterVelocityRange: 400, filterQ: 0.65,
      reverbDecay: 0.25, reverbWetMix: 0.2, masterGain: 0.45,
      minGain: 0.04, maxGain: 0.22,
      collisionMinImpact: 0.13,
      rollingEnabled: true, rollingGain: 0.018, rollingFreq: 105, rollingMinVelocity: 14, rollingMaxVelocity: 85,
      whooshEnabled: false,
    },
    whisper: {
      label: 'Whisper',
      description: 'Almost silent, intimate',
      attackTime: 0, decayTime: 0.07, harmonicGain: 0.03,
      filterBaseFreq: 1400, filterVelocityRange: 180, filterQ: 0.25,
      reverbDecay: 0.5, reverbWetMix: 0.45, masterGain: 0.22,
      minGain: 0.015, maxGain: 0.11,
      collisionMinImpact: 0.17,
      rollingEnabled: true, rollingGain: 0.01, rollingFreq: 110, rollingMinVelocity: 14, rollingMaxVelocity: 85,
      whooshEnabled: false,
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // WILDCARD — unpredictable
    // ═══════════════════════════════════════════════════════════════════════════════
    glitch: {
      label: 'Glitch',
      description: 'Digital artifacts, unstable',
      attackTime: 0, decayTime: 0.025, harmonicGain: 0.55,
      filterBaseFreq: 5500, filterVelocityRange: 2500, filterQ: 2.5,
      reverbDecay: 0.08, reverbWetMix: 0.05, masterGain: 0.35,
      minGain: 0.03, maxGain: 0.2,
      collisionMinImpact: 0.08,
      rollingEnabled: true, rollingGain: 0.02, rollingFreq: 160, rollingMinVelocity: 14, rollingMaxVelocity: 85,
      whooshEnabled: false,
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // SCARY — dark and unsettling (slight attack for eerie effect)
    // ═══════════════════════════════════════════════════════════════════════════════
    theVoid: {
      label: 'The Void',
      description: 'Dark, hollow, unsettling',
      attackTime: 0.005, decayTime: 0.25, harmonicGain: 0.02,
      filterBaseFreq: 350, filterVelocityRange: 100, filterQ: 0.8,
      reverbDecay: 0.85, reverbWetMix: 0.7, masterGain: 0.55,
      minGain: 0.06, maxGain: 0.32,
      collisionMinImpact: 0.11,
      rollingEnabled: true, rollingGain: 0.012, rollingFreq: 80, rollingMinVelocity: 14, rollingMaxVelocity: 85,
      whooshEnabled: false,
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // COOL & UNDERSTATED — elegant mystery
    // ═══════════════════════════════════════════════════════════════════════════════
    midnight: {
      label: 'Midnight',
      description: 'Subtle, mysterious, elegant',
      attackTime: 0, decayTime: 0.09, harmonicGain: 0.07,
      filterBaseFreq: 1900, filterVelocityRange: 280, filterQ: 0.35,
      reverbDecay: 0.55, reverbWetMix: 0.4, masterGain: 0.36,
      minGain: 0.03, maxGain: 0.18,
      collisionMinImpact: 0.15,
      rollingEnabled: true, rollingGain: 0.012, rollingFreq: 120, rollingMinVelocity: 14, rollingMaxVelocity: 85,
      whooshEnabled: false,
    }
  };

  let currentPreset = 'woodenDiscs';

  // ════════════════════════════════════════════════════════════════════════════════
  // STATE
  // ════════════════════════════════════════════════════════════════════════════════
  let audioContext = null;
  let masterGain = null;
  let reverbNode = null;
  let dryGain = null;
  let wetGain = null;
  let limiter = null;

  let isEnabled$1 = false;
  let isUnlocked = false;

  // Voice pool for efficient sound playback (reusable nodes)
  const VOICE_POOL_SIZE = 8; // Max simultaneous sounds
  let voicePool = [];
  let lastGlobalSoundTime = 0;
  const GLOBAL_MIN_INTERVAL = 0.005; // 5ms between ANY sounds (200 sounds/sec max)

  let lastSoundTime = new Map(); // ball id → timestamp

  // Reduced motion preference
  let prefersReducedMotion = false;

  // ════════════════════════════════════════════════════════════════════════════════
  // AMBIENT SOUND SOURCES (continuous, energy-modulated)
  // ════════════════════════════════════════════════════════════════════════════════
  let rollingOsc = null;        // Low-frequency oscillator for rumble
  let rollingGain = null;       // Gain control for rolling
  let rollingFilter = null;     // Low-pass for warmth

  let whooshNoise = null;       // Noise source for whoosh
  let whooshGain = null;        // Gain control for whoosh
  let whooshFilter = null;      // Band-pass for air sound

  // Energy tracking (smoothed for natural transitions)
  let currentRollingEnergy = 0;
  let currentWhooshEnergy = 0;
  const ENERGY_SMOOTH = 0.15;   // Smoothing factor (0-1, lower = smoother)

  // ════════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Initialize the sound engine (call once at startup)
   * Does NOT create AudioContext yet — that requires user interaction
   */
  function initSoundEngine() {
    // Check reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion = motionQuery.matches;
      motionQuery.addEventListener('change', (e) => {
        prefersReducedMotion = e.matches;
      });
    }
    
    console.log('✓ Sound engine initialized (awaiting user unlock)');
  }

  /**
   * Unlock audio (must be called from user gesture like click)
   * Creates AudioContext and builds the audio graph
   */
  async function unlockAudio() {
    if (isUnlocked) return true;
    
    try {
      // Create AudioContext with lowest latency possible
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported');
        return false;
      }
      
      // 'interactive' = smallest buffer size for real-time response
      // Typically 128 samples @ 44.1kHz = ~2.9ms latency
      audioContext = new AudioCtx({ 
        latencyHint: 'interactive',
        sampleRate: 44100  // Standard rate, well-optimized
      });
      
      // Resume if suspended (Safari requirement)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Build audio graph
      buildAudioGraph();
      
      isUnlocked = true;
      isEnabled$1 = true;
      
      // Log actual latency achieved
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
   * Voice Pool → [Dry + Reverb] → Limiter → Master → Output
   */
  function buildAudioGraph() {
    // Master gain (overall volume control)
    masterGain = audioContext.createGain();
    masterGain.gain.value = CONFIG.masterGain;
    
    // Limiter (prevent clipping with many simultaneous sounds)
    limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;
    
    // Dry/wet routing for reverb
    dryGain = audioContext.createGain();
    dryGain.gain.value = 1 - CONFIG.reverbWetMix;
    
    wetGain = audioContext.createGain();
    wetGain.gain.value = CONFIG.reverbWetMix;
    
    // Create reverb (algorithmic approach using delay network)
    reverbNode = createReverbEffect();
    
    // Connect graph
    dryGain.connect(limiter);
    wetGain.connect(reverbNode);
    reverbNode.connect(limiter);
    limiter.connect(masterGain);
    masterGain.connect(audioContext.destination);
    
    // Initialize voice pool
    initVoicePool();
    
    // Initialize ambient sounds (rolling rumble + air whoosh)
    initAmbientSounds();
  }

  /**
   * Initialize continuous ambient sound sources
   * These run constantly but with gain = 0 until energy is fed in
   */
  function initAmbientSounds() {
    // ─── ROLLING TEXTURE ────────────────────────────────────────────────────────
    // Wood-on-surface friction: primarily noise with subtle tonal component
    // Think: wooden beads rolling on a table, gentle and textured
    if (CONFIG.rollingEnabled) {
      // Subtle tonal component (triangle wave = slightly wooden)
      rollingOsc = audioContext.createOscillator();
      rollingOsc.type = 'triangle';
      rollingOsc.frequency.value = CONFIG.rollingFreq;
      
      const rollingOscGain = audioContext.createGain();
      rollingOscGain.gain.value = 0.3; // Tonal is secondary to noise
      
      // Primary: filtered noise (friction texture)
      const rollingNoise = createNoiseSource();
      const rollingNoiseGain = audioContext.createGain();
      rollingNoiseGain.gain.value = 0.7; // Noise is primary (friction)
      
      // Bandpass filter for "woody" character (not too bassy, not too hissy)
      rollingFilter = audioContext.createBiquadFilter();
      rollingFilter.type = 'bandpass';
      rollingFilter.frequency.value = 350;  // Mid-range, wooden
      rollingFilter.Q.value = 0.8;          // Gentle bandwidth
      
      rollingGain = audioContext.createGain();
      rollingGain.gain.value = 0; // Start silent
      
      // Connect: (osc + noise) → filter → gain → dry bus
      rollingOsc.connect(rollingOscGain);
      rollingOscGain.connect(rollingFilter);
      rollingNoise.connect(rollingNoiseGain);
      rollingNoiseGain.connect(rollingFilter);
      rollingFilter.connect(rollingGain);
      rollingGain.connect(dryGain);
      
      rollingOsc.start();
    }
    
    // ─── AIR WHOOSH ─────────────────────────────────────────────────────────────
    // Filtered noise for wind/air displacement
    if (CONFIG.whooshEnabled) {
      whooshNoise = createNoiseSource();
      
      whooshFilter = audioContext.createBiquadFilter();
      whooshFilter.type = 'bandpass';
      whooshFilter.frequency.value = CONFIG.whooshFreq;
      whooshFilter.Q.value = 0.8;
      
      whooshGain = audioContext.createGain();
      whooshGain.gain.value = 0; // Start silent
      
      // Connect: noise → filter → gain → dry bus
      whooshNoise.connect(whooshFilter);
      whooshFilter.connect(whooshGain);
      whooshGain.connect(dryGain);
    }
  }

  /**
   * Create a white noise source (for rumble texture and whoosh)
   */
  function createNoiseSource() {
    const bufferSize = audioContext.sampleRate * 2; // 2 seconds
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.start();
    
    return noise;
  }

  /**
   * Initialize the voice pool with pre-allocated audio nodes
   * Each voice has: oscillator placeholder, filter, envelope, panner
   */
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
        // Oscillators created per-use (can't restart, but lightweight)
        osc: null,
        osc2: null,
        harmGain: null,
      };
      
      // Configure filter
      voice.filter.type = 'lowpass';
      
      // Connect persistent chain: filter → envelope → panner → dry/wet
      voice.filter.connect(voice.envelope);
      voice.envelope.connect(voice.panner);
      voice.panner.connect(dryGain);
      voice.panner.connect(voice.reverbSend);
      voice.reverbSend.connect(wetGain);
      
      voicePool.push(voice);
    }
  }

  /**
   * Create a simple algorithmic reverb using feedback delay network
   * More efficient than ConvolverNode for real-time synthesis
   */
  function createReverbEffect() {
    const input = audioContext.createGain();
    const output = audioContext.createGain();
    
    // Multi-tap delay network for diffuse reverb
    const delays = [0.029, 0.037, 0.053, 0.067]; // Prime-ish ratios for diffusion
    const feedbackGain = 0.4; // Controls reverb length
    
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
    
    // High-frequency damping filter (underwater sound absorption)
    const dampingFilter = audioContext.createBiquadFilter();
    dampingFilter.type = 'lowpass';
    dampingFilter.frequency.value = 2000 * (1 - CONFIG.reverbHighDamp);
    dampingFilter.Q.value = 0.5;
    
    // Connect delay network
    delayNodes.forEach((delay, i) => {
      input.connect(delay);
      delay.connect(feedbacks[i]);
      feedbacks[i].connect(dampingFilter);
      // Cross-feed to next delay for diffusion
      feedbacks[i].connect(delayNodes[(i + 1) % delayNodes.length]);
    });
    
    dampingFilter.connect(output);
    input.connect(output); // Early reflections
    
    // Return as pseudo-node
    input._output = output;
    return input;
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
    // Skip if disabled or not unlocked
    if (!isEnabled$1 || !isUnlocked || !audioContext) return;
    
    // Skip if reduced motion preferred
    if (prefersReducedMotion) return;
    
    // ═══ ENERGY THRESHOLD: Soft touches are silent (like real life) ═══
    if (intensity < CONFIG.collisionMinImpact) return;
    
    const now = audioContext.currentTime;
    
    // Global rate limiter (max ~200 sounds/sec across ALL sources)
    if (now - lastGlobalSoundTime < GLOBAL_MIN_INTERVAL) return;
    
    // Per-ball debounce (prevent rapid-fire from same ball)
    if (ballId !== null) {
      const lastTime = lastSoundTime.get(ballId) || 0;
      if (now - lastTime < CONFIG.minTimeBetweenSounds) return;
      lastSoundTime.set(ballId, now);
    }
    
    // Update global timestamp
    lastGlobalSoundTime = now;
    
    // Clean up old entries periodically
    if (lastSoundTime.size > 200) {
      const threshold = now - 0.5;
      for (const [id, time] of lastSoundTime) {
        if (time < threshold) lastSoundTime.delete(id);
      }
    }
    
    // Get a voice (free or steal oldest)
    const voice = acquireVoice();
    if (!voice) return; // Should never happen with stealing
    
    // Map ball radius to pentatonic pitch
    const frequency = radiusToFrequency(ballRadius);
    
    // Clamp intensity
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    
    // Play using the pooled voice
    playVoice(voice, frequency, clampedIntensity, xPosition, now);
  }

  /**
   * Acquire a voice from the pool (with voice stealing)
   * Returns the oldest voice if all are in use
   */
  function acquireVoice(now) {
    // First, look for a free voice
    for (const voice of voicePool) {
      if (!voice.inUse) {
        return voice;
      }
    }
    
    // All voices in use - steal the oldest one
    let oldestVoice = voicePool[0];
    for (const voice of voicePool) {
      if (voice.startTime < oldestVoice.startTime) {
        oldestVoice = voice;
      }
    }
    
    // Stop the old oscillators immediately
    releaseVoice(oldestVoice);
    
    return oldestVoice;
  }

  /**
   * Release a voice (stop oscillators, mark as free)
   */
  function releaseVoice(voice) {
    if (voice.osc) {
      try {
        voice.osc.stop();
        voice.osc.disconnect();
      } catch (e) { /* already stopped */ }
      voice.osc = null;
    }
    if (voice.osc2) {
      try {
        voice.osc2.stop();
        voice.osc2.disconnect();
      } catch (e) { /* already stopped */ }
      voice.osc2 = null;
    }
    if (voice.harmGain) {
      try { voice.harmGain.disconnect(); } catch (e) {}
      voice.harmGain = null;
    }
    voice.inUse = false;
  }

  /**
   * Play a sound using a pooled voice
   */
  function playVoice(voice, frequency, intensity, xPosition, now) {
    voice.inUse = true;
    voice.startTime = now;
    
    // Pre-calculate all parameters (minimize runtime math)
    const gain = CONFIG.minGain + (CONFIG.maxGain - CONFIG.minGain) * intensity;
    const filterFreq = CONFIG.filterBaseFreq + CONFIG.filterVelocityRange * intensity;
    const duration = CONFIG.decayTime + 0.015; // Tight buffer
    const reverbAmount = 1 - (intensity * 0.5);
    const panValue = (xPosition - 0.5) * 2 * CONFIG.maxPan;
    
    // ─── INSTANT PARAMETER UPDATES (reused nodes) ───────────────────────────────
    // Use .value for immediate effect (faster than setValueAtTime for static values)
    voice.filter.frequency.value = filterFreq;
    voice.filter.Q.value = CONFIG.filterQ;
    voice.panner.pan.value = panValue;
    voice.reverbSend.gain.value = reverbAmount;
    
    // ─── ENVELOPE: INSTANT ATTACK ───────────────────────────────────────────────
    // Cancel any pending automation, set gain INSTANTLY, then decay
    voice.envelope.gain.cancelScheduledValues(now);
    voice.envelope.gain.setValueAtTime(gain, now);  // INSTANT onset (0ms attack)
    voice.envelope.gain.exponentialRampToValueAtTime(0.001, now + CONFIG.decayTime);
    
    // ─── OSCILLATORS (must be new - Web Audio limitation) ───────────────────────
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency; // Use .value (faster)
    
    const osc2 = audioContext.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = frequency * 2;
    
    const harmGain = audioContext.createGain();
    harmGain.gain.value = CONFIG.harmonicGain;
    
    // Store refs for cleanup
    voice.osc = osc;
    voice.osc2 = osc2;
    voice.harmGain = harmGain;
    
    // ─── CONNECT & START ────────────────────────────────────────────────────────
    osc.connect(voice.filter);
    osc2.connect(harmGain);
    harmGain.connect(voice.filter);
    
    osc.start(now);
    osc2.start(now);
    osc.stop(now + duration);
    osc2.stop(now + duration);
    
    // Schedule release
    osc.onended = () => releaseVoice(voice);
  }

  /**
   * Map ball radius to pentatonic frequency
   * Uses inverse mapping: larger radius = lower frequency
   */
  function radiusToFrequency(radius) {
    // Assume radius range ~10-50 (DPR-scaled)
    // Normalize to 0-1 then invert (large = 0, small = 1)
    const minR = 8, maxR = 55;
    const normalized = 1 - Math.max(0, Math.min(1, (radius - minR) / (maxR - minR)));
    
    // Map to pentatonic scale index with slight randomization
    const baseIndex = normalized * (PENTATONIC_FREQUENCIES.length - 1);
    const randomOffset = (Math.random() - 0.5) * 1.5; // ±0.75 index variation
    const index = Math.max(0, Math.min(PENTATONIC_FREQUENCIES.length - 1, 
      Math.round(baseIndex + randomOffset)));
    
    // Add subtle detuning for organic feel (±3%)
    const detune = 1 + (Math.random() - 0.5) * 0.06;
    
    return PENTATONIC_FREQUENCIES[index] * detune;
  }


  // ════════════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Toggle sound on/off
   * @returns {boolean} New enabled state
   */
  function toggleSound() {
    if (!isUnlocked) return false;
    isEnabled$1 = !isEnabled$1;
    return isEnabled$1;
  }

  /**
   * Get current sound state
   * @returns {{ isUnlocked: boolean, isEnabled: boolean }}
   */
  function getSoundState() {
    return {
      isUnlocked,
      isEnabled: isEnabled$1,
      activeSounds: voicePool.filter(v => v.inUse).length,
      poolSize: VOICE_POOL_SIZE,
      rollingEnergy: currentRollingEnergy,
      whooshEnergy: currentWhooshEnergy,
    };
  }

  /**
   * UPDATE AMBIENT SOUNDS based on ball velocities
   * Call this every frame from the main loop
   * 
   * @param {Array} balls - Array of ball objects with {vx, vy, y, r} properties
   * @param {number} floorY - Y coordinate of the floor (for detecting rolling)
   */
  function updateAmbientSounds(balls, floorY = Infinity) {
    if (!isEnabled$1 || !isUnlocked || !audioContext) return;
    if (prefersReducedMotion) return;
    
    let rollingSum = 0;
    let rollingCount = 0;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ROLLING: Wooden pieces rolling on surface
    // Only when: touching floor + moving horizontally + not bouncing
    // ═══════════════════════════════════════════════════════════════════════════════
    if (CONFIG.rollingEnabled) {
      for (const ball of balls) {
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        const horizSpeed = Math.abs(ball.vx);
        const vertSpeed = Math.abs(ball.vy);
        
        // Must be near floor
        const isNearFloor = (ball.y + ball.r) >= (floorY - 3);
        
        // Must be moving primarily horizontally (rolling, not bouncing)
        const isRolling = horizSpeed > vertSpeed * 2;
        
        // Must be in the right speed range
        const inSpeedRange = speed > CONFIG.rollingMinVelocity && speed < CONFIG.rollingMaxVelocity;
        
        if (isNearFloor && isRolling && inSpeedRange) {
          // Weight by horizontal velocity
          rollingSum += horizSpeed / CONFIG.rollingMaxVelocity;
          rollingCount++;
        }
      }
    }
    
    // Smooth the rolling energy (prevents jarring)
    const targetRolling = rollingCount > 0 
      ? Math.min(1, rollingSum / Math.max(1, rollingCount * 0.7))
      : 0;
    
    currentRollingEnergy += (targetRolling - currentRollingEnergy) * ENERGY_SMOOTH;
    
    // Apply rolling sound (very subtle, background texture)
    if (rollingGain && CONFIG.rollingEnabled) {
      const rollVol = currentRollingEnergy * CONFIG.rollingGain;
      rollingGain.gain.setTargetAtTime(rollVol, audioContext.currentTime, 0.08);
      
      // Gentle pitch modulation based on rolling speed
      if (rollingOsc) {
        const pitchMod = 1 + currentRollingEnergy * 0.15; // Subtle +15% at max
        rollingOsc.frequency.setTargetAtTime(CONFIG.rollingFreq * pitchMod, audioContext.currentTime, 0.15);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // WHOOSH: Disabled for small wooden pieces (not realistic)
    // Keep gain at 0 to silence any existing nodes
    // ═══════════════════════════════════════════════════════════════════════════════
    if (whooshGain) {
      whooshGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.05);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // CONFIG API - Runtime parameter tweaking
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Get current config values
   * @returns {object} Copy of current config
   */
  function getSoundConfig() {
    return { ...CONFIG };
  }

  /**
   * Update specific config parameters
   * @param {object} updates - Key/value pairs to update
   */
  function updateSoundConfig(updates) {
    for (const [key, value] of Object.entries(updates)) {
      if (key in CONFIG) {
        CONFIG[key] = value;
      }
    }
    
    // Update wet/dry mix if reverb params changed
    if (wetGain && dryGain && 'reverbWetMix' in updates) {
      wetGain.gain.value = CONFIG.reverbWetMix;
      dryGain.gain.value = 1 - CONFIG.reverbWetMix;
    }
    
    // Update master gain if changed
    if (masterGain && 'masterGain' in updates) {
      masterGain.gain.value = CONFIG.masterGain;
    }
  }

  /**
   * Apply a sound preset
   * @param {string} presetName - Key from SOUND_PRESETS
   * @returns {boolean} Success
   */
  function applySoundPreset(presetName) {
    const preset = SOUND_PRESETS[presetName];
    if (!preset) {
      console.warn(`Unknown sound preset: ${presetName}`);
      return false;
    }
    
    currentPreset = presetName;
    
    // Apply preset values to config (1:1 with CONFIG keys)
    // NOTE: We intentionally exclude label/description from updateSoundConfig.
    const { label, description, ...values } = preset;
    updateSoundConfig(values);
    
    console.log(`🎵 Applied sound preset: ${preset.label}`);
    return true;
  }

  /**
   * Get current preset name
   * @returns {string}
   */
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
        const rSum = A.r + B.r;
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

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                        RUBBER WALL VISUAL SYSTEM                            ║
  // ║                                                                              ║
  // ║  Simple elastic wall effect:                                                 ║
  // ║  - Corners are ANCHORED (stuck, no elasticity)                               ║
  // ║  - Straight sections between corners FLEX inward on impact                   ║
  // ║  - Natural spring-back decay                                                 ║
  // ║  - Walls always at viewport edges, deformation is visual only                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // ═══════════════════════════════════════════════════════════════════════════════
  // CONSTANTS
  // ═══════════════════════════════════════════════════════════════════════════════
  const SEGMENTS_PER_WALL = 12;  // Resolution for smooth curves
  const SPRING_DAMPING = 18;     // How quickly oscillation dies down
  const MAX_DEFORM = 30;         // Maximum inward flex (pixels at DPR 1)

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
      // Clamp position to middle section (avoid corners)
      const pos = Math.max(0.1, Math.min(0.9, normalizedPos));
      const segmentIdx = pos * (SEGMENTS_PER_WALL - 1);
      const impulse = MAX_DEFORM * intensity;
      
      // Gaussian spread with corner falloff
      const sigma = 2.0;
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
      // First and last segments are ANCHORED (no movement)
      this.deformations[0] = 0;
      this.deformations[SEGMENTS_PER_WALL - 1] = 0;
      this.velocities[0] = 0;
      this.velocities[SEGMENTS_PER_WALL - 1] = 0;
      
      for (let i = 1; i < SEGMENTS_PER_WALL - 1; i++) {
        // Damped spring: F = -k*x - c*v
        const force = -400 * this.deformations[i] - SPRING_DAMPING * this.velocities[i];
        this.velocities[i] += force * dt;
        this.deformations[i] += this.velocities[i] * dt;
        
        // Clamp to prevent runaway
        this.deformations[i] = Math.max(0, Math.min(MAX_DEFORM, this.deformations[i]));
        
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
    
    // Skip low-intensity impacts
    if (intensity < 0.05) return;
    
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
    
    // Skip if no deformation
    if (!wallState.hasAnyDeformation()) return;
    
    // Get chrome color
    const chromeColor = getChromeColorFromCSS();
    
    // Corner radius (walls curve around this)
    const cr = (g.wallRadius || 42) * (g.DPR || 1);
    
    // Wall thickness (visual stroke width)
    const thickness = (g.wallThickness || 12) * (g.DPR || 1);
    
    // Viewport top (Ball Pit mode starts lower)
    const viewportTop = (g.currentMode === 'pit') ? (h / 3) : 0;
    
    ctx.save();
    ctx.fillStyle = chromeColor;
    
    // ─────────────────────────────────────────────────────────────────────────
    // BOTTOM WALL
    // Anchored at corners (cr from edges), flexible in middle
    // ─────────────────────────────────────────────────────────────────────────
    if (wallState.bottom.hasDeformation()) {
      ctx.beginPath();
      
      // Start outside canvas at bottom-left corner zone
      ctx.moveTo(cr, h + thickness);
      
      // Draw deformed edge from left corner to right corner
      for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
        const t = i / SEGMENTS_PER_WALL;
        // Map t to the straight section between corners
        const x = cr + t * (w - 2 * cr);
        const deform = wallState.bottom.getDeformAt(t);
        // Positive deform = chrome pushes UP into canvas
        ctx.lineTo(x, h - deform);
      }
      
      // Close path below canvas
      ctx.lineTo(w - cr, h + thickness);
      ctx.closePath();
      ctx.fill();
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // TOP WALL  
    // ─────────────────────────────────────────────────────────────────────────
    if (wallState.top.hasDeformation()) {
      ctx.beginPath();
      
      ctx.moveTo(cr, viewportTop - thickness);
      
      for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
        const t = i / SEGMENTS_PER_WALL;
        const x = cr + t * (w - 2 * cr);
        const deform = wallState.top.getDeformAt(t);
        // Positive deform = chrome pushes DOWN into canvas
        ctx.lineTo(x, viewportTop + deform);
      }
      
      ctx.lineTo(w - cr, viewportTop - thickness);
      ctx.closePath();
      ctx.fill();
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // LEFT WALL
    // ─────────────────────────────────────────────────────────────────────────
    if (wallState.left.hasDeformation()) {
      ctx.beginPath();
      
      ctx.moveTo(-thickness, viewportTop + cr);
      
      for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
        const t = i / SEGMENTS_PER_WALL;
        const y = viewportTop + cr + t * (h - viewportTop - 2 * cr);
        const deform = wallState.left.getDeformAt(t);
        // Positive deform = chrome pushes RIGHT into canvas
        ctx.lineTo(deform, y);
      }
      
      ctx.lineTo(-thickness, h - cr);
      ctx.closePath();
      ctx.fill();
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // RIGHT WALL
    // ─────────────────────────────────────────────────────────────────────────
    if (wallState.right.hasDeformation()) {
      ctx.beginPath();
      
      ctx.moveTo(w + thickness, viewportTop + cr);
      
      for (let i = 0; i <= SEGMENTS_PER_WALL; i++) {
        const t = i / SEGMENTS_PER_WALL;
        const y = viewportTop + cr + t * (h - viewportTop - 2 * cr);
        const deform = wallState.right.getDeformAt(t);
        // Positive deform = chrome pushes LEFT into canvas
        ctx.lineTo(w - deform, y);
      }
      
      ctx.lineTo(w + thickness, h - cr);
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
      
      const viewportTop = (currentMode === MODES.PIT) ? (h / 3) : 0;
      
      // Corner radius: container radius minus simulation padding, scaled by DPR
      // Uses getCanvasCornerRadius() for auto-calculation based on current padding
      const cr = (globals.getCanvasCornerRadius() || 100) * (DPR || 1);
      
      // No border inset - balls use full canvas bounds
      const borderInset = 0;
      
      let hasWallCollision = false;
      
      // ════════════════════════════════════════════════════════════════════════
      // CORNER COLLISION: Push balls out of rounded corner zones
      // Check if ball center is within a corner quadrant and too close to arc
      // ════════════════════════════════════════════════════════════════════════
      const corners = [
        { cx: cr, cy: viewportTop + cr },           // Top-left
        { cx: w - cr, cy: viewportTop + cr },       // Top-right
        { cx: cr, cy: h - cr },                      // Bottom-left
        { cx: w - cr, cy: h - cr }                   // Bottom-right
      ];
      
      for (let i = 0; i < corners.length; i++) {
        const corner = corners[i];
        // Check if ball is in this corner's quadrant
        const inXZone = (i % 2 === 0) ? (this.x < cr) : (this.x > w - cr);
        const inYZone = (i < 2) ? (this.y < viewportTop + cr) : (this.y > h - cr);
        
        if (inXZone && inYZone) {
          const dx = this.x - corner.cx;
          const dy = this.y - corner.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = cr - this.r; // Ball must stay inside the arc
          
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
      const minX = borderInset;
      const maxX = w - borderInset;
      const minY = viewportTop + borderInset;
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
      
      // Top (ceiling)
      if (this.y - this.r < minY) {
        hasWallCollision = true;
        this.y = minY + this.r;
        this.vy = -this.vy * rest;
        const impact = Math.min(1, Math.abs(this.vy) / (this.r * 90));
        this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
        this.squashNormalAngle = Math.PI / 2;
        // Sound: ceiling impact (threshold handled by sound engine)
        playCollisionSound(this.r, impact * 0.6, this.x / w, this._soundId);
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
        registerWallImpact('right', (this.y - viewportTop) / (h - viewportTop), impact);
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
        registerWallImpact('left', (this.y - viewportTop) / (h - viewportTop), impact);
      }
      
      // Wake on wall collision (prevents sleeping balls from getting stuck in walls)
      if (hasWallCollision && this.isSleeping) {
        this.wake();
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.theta);
      
      // Apply squash
      if (this.squashAmount > 0.001) {
        const squashX = 1 - this.squashAmount * 0.3;
        const squashY = 1 + this.squashAmount * 0.3;
        ctx.rotate(this.squashNormalAngle);
        ctx.scale(squashX, squashY);
        ctx.rotate(-this.squashNormalAngle);
      }
      
      ctx.beginPath();
      ctx.arc(0, 0, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.alpha;
      ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.restore();
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

  var water = /*#__PURE__*/Object.freeze({
    __proto__: null,
    applyWaterForces: applyWaterForces,
    createWaterRipple: createWaterRipple,
    initializeWater: initializeWater,
    updateWaterRipples: updateWaterRipples
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                             CURSOR BALL RENDERING                            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function drawCursor(ctx) {
    const g = getGlobals();
    if (!g.mouseInCanvas) return;
    if (g.isTouchDevice === true) return;
    if (g.cursorBallVisible === false) return;
    
    const r = Math.max(6 * g.DPR, (g.R_MIN + g.R_MAX) * 0.12);
    ctx.save();
    ctx.beginPath();
    ctx.arc(g.mouseX, g.mouseY, r, 0, Math.PI * 2);
    ctx.fillStyle = g.currentColors ? (g.currentColors[4] || '#000000') : '#000000';
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

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
    
    if (!canvas || balls.length === 0) return;
    
    acc += dtSeconds;
    let physicsSteps = 0;
    
    while (acc >= DT && physicsSteps < CONSTANTS.MAX_PHYSICS_STEPS) {
      // Integrate physics for all modes
        const len = balls.length;
        for (let i = 0; i < len; i++) {
          balls[i].step(DT, applyForcesFunc);
        }
      
      // Ball-to-ball collisions (disabled for Flies mode)
      if (globals.currentMode !== MODES.FLIES) {
        resolveCollisions(10); // more solver iterations for stability
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
    
    // Water ripple updates run per-frame
    if (globals.currentMode === MODES.WATER) {
      updateWaterRipples(dtSeconds);
    }
    
    // Update rubber wall physics (always runs, only renders when deformed)
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
    
    // Draw rubber walls FIRST (behind everything, only when deformed)
    drawWalls(ctx, canvas.width, canvas.height);
    
    // Draw water ripples (behind balls for gorgeous effect)
    if (globals.currentMode === MODES.WATER) ;
    
    // Draw balls
    for (let i = 0; i < balls.length; i++) {
      balls[i].draw(ctx);
    }
    
    // Cursor overlay
    drawCursor(ctx);
  }

  /**
   * Get the current balls array (for sound system etc.)
   * @returns {Array} Array of Ball objects
   */
  function getBalls() {
    const globals = getGlobals();
    return globals.balls || [];
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    MODERN DARK MODE SYSTEM (Best Practices)                 ║
  // ║          Native feel with prefers-color-scheme + manual override            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // Theme states: 'auto', 'light', 'dark'
  let currentTheme = 'light'; // Default to light mode
  let systemPreference = 'light';

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
    
    console.log(`🎨 Theme set to: ${theme} (rendering: ${shouldBeDark ? 'dark' : 'light'})`);
  }

  /**
   * Initialize dark mode system
   */
  function initializeDarkMode() {
    // Detect system preference (for auto mode later)
    systemPreference = detectSystemPreference();
    console.log(`🖥️ System prefers: ${systemPreference}`);
    
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
        console.log(`🖥️ System preference changed to: ${systemPreference}`);
        
        // If in auto mode, update
        if (currentTheme === 'auto') {
          setTheme('auto');
        }
      });
    }
    
    console.log('✓ Modern dark mode initialized');
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
  // ║                          RENDERER (COMPLETE)                                 ║
  // ║                 Canvas setup, resize, and rendering                          ║
  // ║      Sizes relative to container (supports frame padding/border)             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let canvas, ctx;

  function setupRenderer() {
    canvas = document.getElementById('c');
    ctx = canvas ? canvas.getContext('2d') : null;
    
    if (!canvas || !ctx) {
      console.error('Canvas not found');
      return;
    }
    
    // NOTE: Don't call resize() here - globals.container may not be set yet
    // main.js will call resize() after setCanvas() to ensure container is available
    window.addEventListener('resize', resize);
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
    
    // Canvas sits inside the rubber walls (wall thickness is the inset)
    const wallThickness = globals.wallThickness || 0;
    const canvasWidth = containerWidth - (wallThickness * 2);
    const canvasHeight = containerHeight - (wallThickness * 2);
    
    // Canvas fills container - CSS handles mode-specific heights
    // Ball Pit: CSS sets 150vh, Other modes: CSS sets 100%
    const simHeight = canvasHeight;
    const DPR = CONSTANTS.DPR;
    
    // Set canvas buffer size (high-DPI)
    canvas.width = Math.floor(canvasWidth * DPR);
    canvas.height = Math.floor(simHeight * DPR);
    
    // Let CSS handle display sizing via var(--wall-thickness)
    // But set explicit values for consistency in non-CSS environments
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = simHeight + 'px';
    
    applyCanvasShadow(canvas);
  }

  function getCanvas() {
    return canvas;
  }

  function getContext() {
    return ctx;
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
    // GLOBAL PROPERTIES
    // ═══════════════════════════════════════════════════════════════════════════
    global: {
      title: 'Global Properties',
      icon: '🎱',
      defaultOpen: true,
      controls: [
        {
          id: 'sizeGlobal',
          label: 'Size',
          stateKey: 'sizeScale',
          type: 'range',
          min: 0.1, max: 6.0, step: 0.05,
          default: 1.2,
          format: v => v.toFixed(2),
          parse: parseFloat,
          onChange: (g, val) => {
            const base = (g.R_MIN_BASE + g.R_MAX_BASE) / 2;
            g.R_MIN = base * val * 0.75;
            g.R_MAX = base * val * 1.25;
            const newSize = (g.R_MIN + g.R_MAX) / 2;
            g.balls.forEach(b => { b.r = newSize; b.rBase = newSize; });
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
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // WALLS
    // ═══════════════════════════════════════════════════════════════════════════
    walls: {
      title: 'Walls',
      icon: '🧱',
      defaultOpen: false,
      controls: [
        {
          id: 'wallThickness',
          label: 'Thickness',
          stateKey: 'wallThickness',
          type: 'range',
          min: 0, max: 40, step: 1,
          default: 12,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          cssVar: '--wall-thickness'
        },
        {
          id: 'wallSoftness',
          label: 'Softness',
          stateKey: 'wallSoftness',
          type: 'range',
          min: 0, max: 60, step: 1,
          default: 20,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          cssVar: '--wall-softness'
        },
        {
          id: 'wallRadius',
          label: 'Corner Radius',
          stateKey: 'wallRadius',
          type: 'range',
          min: 0, max: 80, step: 2,
          default: 42,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          cssVar: '--wall-radius',
          onChange: (g, val) => { g.cornerRadius = val; }
        },
        {
          id: 'wallBounceHighlight',
          label: 'Bounce Flash',
          stateKey: 'wallBounceHighlightMax',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0.3,
          format: v => v.toFixed(2),
          parse: parseFloat
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // VISUAL EFFECTS
    // ═══════════════════════════════════════════════════════════════════════════
    effects: {
      title: 'Effects',
      icon: '🎭',
      defaultOpen: false,
      controls: [
        // Noise
        {
          id: 'noiseSizeBase',
          label: 'Noise Back Size',
          stateKey: 'noiseSizeBase',
          group: 'Noise Texture',
          type: 'range',
          min: 50, max: 200, step: 5,
          default: 100,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          cssVar: '--noise-size-base'
        },
        {
          id: 'noiseSizeTop',
          label: 'Noise Front Size',
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
          label: 'Noise Back Opacity',
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
          label: 'Noise Front Opacity',
          stateKey: 'noiseFrontOpacity',
          type: 'range',
          min: 0, max: 0.05, step: 0.001,
          default: 0.01,
          format: v => v.toFixed(3),
          parse: parseFloat,
          cssVar: '--noise-front-opacity'
        },
        // Vignette
        {
          id: 'vignetteLightIntensity',
          label: 'Light Intensity',
          stateKey: 'vignetteLightIntensity',
          group: 'Vignette',
          type: 'range',
          min: 0, max: 1, step: 0.01,
          default: 0.08,
          format: v => v.toFixed(2),
          parse: parseFloat,
          cssVar: '--vignette-light-intensity'
        },
        {
          id: 'vignetteDarkIntensity',
          label: 'Dark Intensity',
          stateKey: 'vignetteDarkIntensity',
          type: 'range',
          min: 0, max: 1, step: 0.01,
          default: 0.05,
          format: v => v.toFixed(2),
          parse: parseFloat,
          cssVar: '--vignette-dark-intensity'
        },
        {
          id: 'vignetteBlurOuter',
          label: 'Outer Blur',
          stateKey: 'vignetteBlurOuter',
          type: 'range',
          min: 0, max: 400, step: 10,
          default: 180,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          cssVar: '--vignette-blur-outer'
        },
        {
          id: 'vignetteBlurMid',
          label: 'Mid Blur',
          stateKey: 'vignetteBlurMid',
          type: 'range',
          min: 0, max: 300, step: 10,
          default: 100,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          cssVar: '--vignette-blur-mid'
        },
        {
          id: 'vignetteBlurInner',
          label: 'Inner Blur',
          stateKey: 'vignetteBlurInner',
          type: 'range',
          min: 0, max: 200, step: 5,
          default: 40,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          cssVar: '--vignette-blur-inner'
        },
        {
          id: 'vignetteSpread',
          label: 'Spread',
          stateKey: 'vignetteSpread',
          type: 'range',
          min: -50, max: 50, step: 1,
          default: 0,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          cssVar: '--vignette-spread'
        },
        {
          id: 'vignetteTransition',
          label: 'Animation',
          stateKey: 'vignetteTransition',
          type: 'range',
          min: 0, max: 2000, step: 50,
          default: 800,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          cssVar: '--vignette-transition'
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // MODE-SPECIFIC CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    pit: {
      title: 'Ball Pit Settings',
      icon: '🎯',
      mode: 'pit',
      defaultOpen: true,
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
      title: 'Flies Settings',
      icon: '🕊️',
      mode: 'flies',
      defaultOpen: true,
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
      title: 'Zero-G Settings',
      icon: '🌌',
      mode: 'weightless',
      defaultOpen: true,
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
      title: 'Water Settings',
      icon: '🌊',
      mode: 'water',
      defaultOpen: true,
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
      title: 'Vortex Settings',
      icon: '🌀',
      mode: 'vortex',
      defaultOpen: true,
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
      title: 'Ping Pong Settings',
      icon: '🏓',
      mode: 'ping-pong',
      defaultOpen: true,
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
      title: 'Magnetic Settings',
      icon: '🧲',
      mode: 'magnetic',
      defaultOpen: true,
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
      title: 'Bubbles Settings',
      icon: '🫧',
      mode: 'bubbles',
      defaultOpen: true,
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
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // HTML GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════

  function generateControlHTML(control) {
    if (!isControlVisible(control.id)) return '';
    
    const sliderId = control.id + 'Slider';
    const valId = control.id + 'Val';
    
    return `
      <label data-control-id="${control.id}">
        <span>${control.label}<span class="val" id="${valId}">${control.format(control.default)}</span></span>
        <input type="range" id="${sliderId}" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.default}">
      </label>`;
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
    
    // Wrap in accordion/details if not mode-specific
    if (section.mode) {
      return `
  <div id="${section.mode}Controls" class="mode-controls${section.mode === 'flies' ? ' active' : ''}">
    <details ${section.defaultOpen ? 'open' : ''}>
      <summary>${section.title}</summary>
      <div class="group">${html}</div>
    </details>
  </div>`;
    }
    
    return `
  <details ${section.defaultOpen ? 'open' : ''}>
    <summary>${section.title}</summary>
    <div class="group">${html}</div>
  </details>`;
  }

  function generatePanelHTML() {
    let html = `
  <!-- Screen reader announcements -->
  <div role="status" aria-live="polite" aria-atomic="true" class="sr-only" id="announcer"></div>
  
  <div class="panel-content">
  
  <!-- Theme Segment Control -->
  <div class="panel-section">
    <div class="section-title">🎨 Theme</div>
    <div class="theme-segment-control" role="group" aria-label="Theme selector">
      <button id="themeAuto" class="theme-segment-btn" aria-label="Auto theme">Auto</button>
      <button id="themeLight" class="theme-segment-btn active" aria-label="Light theme">Light</button>
      <button id="themeDark" class="theme-segment-btn" aria-label="Dark theme">Dark</button>
    </div>
    <div id="themeStatus" class="panel-status">☀️ Light Mode</div>
  </div>
  
  <!-- Mode Switcher -->
  <div class="panel-section">
    <div class="section-title">Mode</div>
    <div class="mode-switcher" role="group" aria-label="Simulation mode selector">
      <button class="mode-button" data-mode="pit" aria-label="Ball Pit mode">🎯 Pit</button>
      <button class="mode-button active" data-mode="flies" aria-label="Flies mode">🕊️ Flies</button>
      <button class="mode-button" data-mode="weightless" aria-label="Zero-G mode">🌌 Zero-G</button>
      <button class="mode-button" data-mode="water" aria-label="Water mode">🌊 Water</button>
      <button class="mode-button" data-mode="vortex" aria-label="Vortex mode">🌀 Vortex</button>
      <button class="mode-button" data-mode="ping-pong" aria-label="Ping Pong mode">🏓 Pong</button>
      <button class="mode-button" data-mode="magnetic" aria-label="Magnetic mode">🧲 Magnet</button>
      <button class="mode-button" data-mode="bubbles" aria-label="Bubbles mode">🫧 Bubbles</button>
    </div>
  </div>`;

    // Non-mode sections
    for (const [key, section] of Object.entries(CONTROL_SECTIONS)) {
      if (!section.mode) {
        html += generateSectionHTML(key, section);
      }
    }
    
    // Colors (special handling)
    html += `
  <details>
    <summary>Colors</summary>
    <div class="group">
      <label>
        <span>Color Template</span>
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
  <!-- Save Config -->
  <div class="panel-section panel-section--action">
    <button id="saveConfigBtn" class="primary">💾 Save Config</button>
  </div>
  
  <!-- Keyboard shortcuts -->
  <div class="panel-footer">
    <kbd>R</kbd> reset · <kbd>/</kbd> panel · click cycles modes
  </div>
  
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
        const sliderId = control.id + 'Slider';
        const valId = control.id + 'Val';
        const el = document.getElementById(sliderId);
        const valEl = document.getElementById(valId);
        
        if (!el) continue;
        
        el.addEventListener('input', () => {
          const rawVal = control.parse(el.value);
          
          // Update state
          if (control.stateKey && !control.onChange) {
            g[control.stateKey] = rawVal;
          }
          
          // Custom handler
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
            
            // Special case: wall thickness triggers resize
            if (control.id === 'wallThickness') {
              resize();
            }
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
  // ║                              BALL SPAWNING                                   ║
  // ║              Extracted from balls-source.html lines 2249-2284                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function clamp(val, min, max) {
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
    const sizeInfluence = clamp((r / ((globals.R_MIN + globals.R_MAX) * 0.5)), 0.6, 1.4);
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

  var flies = /*#__PURE__*/Object.freeze({
    __proto__: null,
    applyFliesForces: applyFliesForces,
    initializeFlies: initializeFlies
  });

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
    globals.DPR;
    
    // Ball Pit canvas is 150vh tall (150% of viewport)
    // Top 1/3 (50vh) is above viewport = spawn area [0, h/3]
    // Bottom 2/3 (100vh) is visible viewport = play area [h/3, h]
    // viewportTop = h/3 marks where visible area begins
    
    const viewportTop = h / 3;
    
    // Spawn in top 70% of the hidden area (concentrated near top)
    // This creates the effect of balls "falling in from the top"
    const spawnYTop = 0;
    const spawnYBottom = viewportTop * 0.7;  // Use top 70% of spawn area
    
    // Spawn across full width
    const spawnXLeft = 0;
    const spawnXRight = w;
    
    // First, ensure at least one ball of each color (0-7)
    for (let colorIndex = 0; colorIndex < 8; colorIndex++) {
      const x = spawnXLeft + Math.random() * (spawnXRight - spawnXLeft);
      const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);
      
      const ball = spawnBall(x, y, getColorByIndex(colorIndex));
      // Small downward velocity and random horizontal drift
      ball.vx = (Math.random() - 0.5) * 100;
      ball.vy = Math.random() * 50;
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
      ball.vy = Math.random() * 50;
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

  var weightless = /*#__PURE__*/Object.freeze({
    __proto__: null,
    initializeWeightless: initializeWeightless
  });

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

  var vortex = /*#__PURE__*/Object.freeze({
    __proto__: null,
    applyVortexForces: applyVortexForces,
    initializeVortex: initializeVortex
  });

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

  var pingPong = /*#__PURE__*/Object.freeze({
    __proto__: null,
    applyPingPongForces: applyPingPongForces,
    initializePingPong: initializePingPong
  });

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

  var magnetic = /*#__PURE__*/Object.freeze({
    __proto__: null,
    applyMagneticForces: applyMagneticForces,
    initializeMagnetic: initializeMagnetic
  });

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
    const count = g.bubblesMaxCount || 150;
    
    // Spawn bubbles distributed across the screen (some already rising)
    // First ensure one of each color
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = h * 0.3 + Math.random() * h * 0.6; // Middle 60% of screen
      createBubble(x, y, getColorByIndex(colorIndex), true); // Already scaled in
    }
    
    // Fill rest with random colors
    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = h * 0.3 + Math.random() * h * 0.6;
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
    ball.y = h + 20 + Math.random() * 30; // Just below screen
    
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
    
    // Start spawn animation (scale up from 0)
    ball.r = 0.1;
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
    
    // Cursor deflection
    if (g.mouseInCanvas) {
      const dx = ball.x - g.mouseX;
      const dy = ball.y - g.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const deflectRadius = (g.bubblesDeflectRadius || 80) * g.DPR;
      
      if (dist < deflectRadius && dist > 1) {
        const force = (1 - dist / deflectRadius) * 300;
        const nx = dx / dist;
        const ny = dy / dist;
        ball.vx += nx * force * dt;
        ball.vy += ny * force * dt;
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
      bubbles: 'Carbonated Bubbles'
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
    }
    return null;
  }

  var modeController = /*#__PURE__*/Object.freeze({
    __proto__: null,
    MODES: MODES,
    getForceApplicator: getForceApplicator,
    setMode: setMode
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            UI CONTROLS WIRING                                ║
  // ║      Wires sliders/selects to global state and systems                       ║
  // ║      Uses centralized control-registry.js for consistent definitions         ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function bindSlider(id, onChange) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => onChange(el));
  }

  function setVal(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setupControls() {
    const g = getGlobals();
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BIND ALL REGISTERED CONTROLS FROM REGISTRY
    // ═══════════════════════════════════════════════════════════════════════════
    bindRegisteredControls();

    // ═══════════════════════════════════════════════════════════════════════════
    // MODE BUTTONS - Critical for panel mode switching
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
    // GLOBAL SETTINGS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('sizeSliderGlobal', (el) => {
      g.sizeScale = parseFloat(el.value);
      setVal('sizeValGlobal', g.sizeScale.toFixed(2));
      // Update current balls to new base size
      const base = (g.R_MIN_BASE + g.R_MAX_BASE) / 2;
      g.R_MIN = base * g.sizeScale * 0.75;
      g.R_MAX = base * g.sizeScale * 1.25;
      const newSize = (g.R_MIN + g.R_MAX) / 2;
      for (let i = 0; i < g.balls.length; i++) {
        g.balls[i].r = newSize; g.balls[i].rBase = newSize;
      }
      autoSaveSettings();
    });
    bindSlider('ballSoftnessSliderGlobal', (el) => {
      g.ballSoftness = parseInt(el.value, 10);
      setVal('ballSoftnessValGlobal', String(g.ballSoftness));
      autoSaveSettings();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // RUBBER WALL CONTROLS - 4 parameters for the simulation walls
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Wall thickness (rubber tube width)
    bindSlider('wallThicknessSlider', (el) => {
      g.wallThickness = parseInt(el.value, 10);
      setVal('wallThicknessVal', String(g.wallThickness));
      applyVisualCSSVars({ wallThickness: g.wallThickness });
      resize(); // Canvas sits inside walls
      autoSaveSettings();
    });
    
    // Wall softness (blur/glow radius)
    bindSlider('wallSoftnessSlider', (el) => {
      g.wallSoftness = parseInt(el.value, 10);
      setVal('wallSoftnessVal', String(g.wallSoftness));
      applyVisualCSSVars({ wallSoftness: g.wallSoftness });
      autoSaveSettings();
    });
    
    // Wall radius (corner radius shared by all rounded elements)
    bindSlider('wallRadiusSlider', (el) => {
      g.wallRadius = parseInt(el.value, 10);
      g.cornerRadius = g.wallRadius; // Sync with physics
      setVal('wallRadiusVal', String(g.wallRadius));
      applyVisualCSSVars({ wallRadius: g.wallRadius });
      autoSaveSettings();
    });
    
    // Bounce highlight intensity (max flash brightness on impact)
    bindSlider('wallBounceHighlightSlider', (el) => {
      g.wallBounceHighlightMax = parseFloat(el.value);
      setVal('wallBounceHighlightVal', g.wallBounceHighlightMax.toFixed(2));
      autoSaveSettings();
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VISUAL EFFECTS CONTROLS (Noise & Vignette)
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Noise texture sizing
    bindSlider('noiseSizeBaseSlider', (el) => {
      const config = { noiseSizeBase: parseInt(el.value, 10) };
      setVal('noiseSizeBaseVal', String(config.noiseSizeBase));
      applyVisualCSSVars(config);
      autoSaveSettings();
    });
    
    bindSlider('noiseSizeTopSlider', (el) => {
      const config = { noiseSizeTop: parseInt(el.value, 10) };
      setVal('noiseSizeTopVal', String(config.noiseSizeTop));
      applyVisualCSSVars(config);
      autoSaveSettings();
    });
    
    // Noise opacity
    bindSlider('noiseBackOpacitySlider', (el) => {
      const config = { noiseBackOpacity: parseFloat(el.value) };
      setVal('noiseBackOpacityVal', config.noiseBackOpacity.toFixed(3));
      applyVisualCSSVars(config);
      autoSaveSettings();
    });
    
    bindSlider('noiseFrontOpacitySlider', (el) => {
      const config = { noiseFrontOpacity: parseFloat(el.value) };
      setVal('noiseFrontOpacityVal', config.noiseFrontOpacity.toFixed(3));
      applyVisualCSSVars(config);
      autoSaveSettings();
    });
    
    // Vignette intensity
    bindSlider('vignetteLightIntensitySlider', (el) => {
      const config = { vignetteLightIntensity: parseFloat(el.value) };
      setVal('vignetteLightIntensityVal', config.vignetteLightIntensity.toFixed(2));
      applyVisualCSSVars(config);
      autoSaveSettings();
    });
    
    bindSlider('vignetteDarkIntensitySlider', (el) => {
      const config = { vignetteDarkIntensity: parseFloat(el.value) };
      setVal('vignetteDarkIntensityVal', config.vignetteDarkIntensity.toFixed(2));
      applyVisualCSSVars(config);
      autoSaveSettings();
    });
    
    // Vignette blur layers (organic depth)
    bindSlider('vignetteBlurOuterSlider', (el) => {
      const config = { vignetteBlurOuter: parseInt(el.value, 10) };
      setVal('vignetteBlurOuterVal', String(config.vignetteBlurOuter));
      applyVisualCSSVars(config);
      autoSaveSettings();
    });
    
    bindSlider('vignetteBlurMidSlider', (el) => {
      const config = { vignetteBlurMid: parseInt(el.value, 10) };
      setVal('vignetteBlurMidVal', String(config.vignetteBlurMid));
      applyVisualCSSVars(config);
      autoSaveSettings();
    });
    
    bindSlider('vignetteBlurInnerSlider', (el) => {
      const config = { vignetteBlurInner: parseInt(el.value, 10) };
      setVal('vignetteBlurInnerVal', String(config.vignetteBlurInner));
      applyVisualCSSVars(config);
      autoSaveSettings();
    });
    
    // Vignette spread and animation
    bindSlider('vignetteSpreadSlider', (el) => {
      const config = { vignetteSpread: parseInt(el.value, 10) };
      setVal('vignetteSpreadVal', String(config.vignetteSpread));
      applyVisualCSSVars(config);
      autoSaveSettings();
    });
    
    bindSlider('vignetteTransitionSlider', (el) => {
      const config = { vignetteTransition: parseInt(el.value, 10) };
      setVal('vignetteTransitionVal', String(config.vignetteTransition));
      applyVisualCSSVars(config);
      autoSaveSettings();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // BALL PIT MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('gravityPitSlider', (el) => {
      g.gravityMultiplierPit = parseFloat(el.value);
      setVal('gravityPitVal', g.gravityMultiplierPit.toFixed(2));
      if (g.currentMode === 'pit') g.G = g.GE * g.gravityMultiplierPit;
      autoSaveSettings();
    });
    bindSlider('weightPitSlider', (el) => {
      g.ballMassKg = parseFloat(el.value);
      setVal('weightPitVal', g.ballMassKg.toFixed(0));
      for (let i = 0; i < g.balls.length; i++) g.balls[i].m = g.ballMassKg;
      autoSaveSettings();
    });
    bindSlider('restitutionSlider', (el) => {
      g.REST = parseFloat(el.value);
      setVal('restitutionVal', g.REST.toFixed(2));
      autoSaveSettings();
    });
    bindSlider('frictionSlider', (el) => {
      g.FRICTION = parseFloat(el.value);
      setVal('frictionVal', g.FRICTION.toFixed(4));
      autoSaveSettings();
    });

    // Repeller
    const repellerEnabledPit = document.getElementById('repellerEnabledPit');
    if (repellerEnabledPit) {
      repellerEnabledPit.addEventListener('change', () => {
        g.repellerEnabled = !!repellerEnabledPit.checked;
        autoSaveSettings();
      });
    }
    bindSlider('repelSizeSlider', (el) => {
      g.repelRadius = parseFloat(el.value);
      setVal('repelSizeVal', g.repelRadius.toFixed(0));
      autoSaveSettings();
    });
    bindSlider('repelPowerSlider', (el) => {
      const sliderPos = parseFloat(el.value);
      // Map slider [0..10000] to exponential power range
      const s = Math.max(0, Math.min(10000, sliderPos)) / 10000;
      const power = Math.pow(2, (s - 0.5) * 12) * 12000 * 2.0; // approx mapping
      g.repelPower = power;
      setVal('repelPowerVal', Math.round(g.repelPower).toString());
      autoSaveSettings();
    });
    bindSlider('repelSoftSlider', (el) => {
      g.repelSoft = parseFloat(el.value);
      setVal('repelSoftVal', g.repelSoft.toFixed(1));
      autoSaveSettings();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // FLIES MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('fliesBallCountSlider', (el) => {
      g.fliesBallCount = parseInt(el.value, 10);
      setVal('fliesBallCountVal', String(g.fliesBallCount));
      if (g.currentMode === 'flies') {
        Promise.resolve().then(function () { return flies; }).then(({ initializeFlies }) => {
          initializeFlies();
        });
      }
    });
    bindSlider('attractPowerSlider', (el) => {
      g.attractionPower = parseFloat(el.value);
      setVal('attractPowerVal', Math.round(g.attractionPower).toString());
    });
    bindSlider('swarmSpeedSlider', (el) => {
      g.swarmSpeed = parseFloat(el.value);
      setVal('swarmSpeedVal', g.swarmSpeed.toFixed(1));
    });
    bindSlider('fliesSeparationSlider', (el) => {
      g.fliesSeparation = parseFloat(el.value);
      setVal('fliesSeparationVal', Math.round(g.fliesSeparation).toString());
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // ZERO-G MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('weightlessCountSlider', (el) => {
      g.weightlessBallCount = parseInt(el.value, 10);
      setVal('weightlessCountVal', String(g.weightlessBallCount));
      if (g.currentMode === 'weightless') {
        Promise.resolve().then(function () { return weightless; }).then(({ initializeWeightless }) => {
          initializeWeightless();
        });
      }
    });
    bindSlider('weightlessSpeedSlider', (el) => {
      g.weightlessInitialSpeed = parseFloat(el.value);
      setVal('weightlessSpeedVal', g.weightlessInitialSpeed.toFixed(0));
      if (g.currentMode === 'weightless') {
        Promise.resolve().then(function () { return weightless; }).then(({ initializeWeightless }) => {
          initializeWeightless();
        });
      }
    });
    bindSlider('weightlessBounceSlider', (el) => {
      g.weightlessBounce = parseFloat(el.value);
      setVal('weightlessBounceVal', g.weightlessBounce.toFixed(2));
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // WATER MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('waterBallCountSlider', (el) => {
      g.waterBallCount = parseInt(el.value, 10);
      setVal('waterBallCountVal', String(g.waterBallCount));
      if (g.currentMode === 'water') {
        Promise.resolve().then(function () { return water; }).then(({ initializeWater }) => {
          initializeWater();
        });
      }
      autoSaveSettings();
    });
    bindSlider('waterRippleStrengthSlider', (el) => {
      g.waterRippleStrength = parseFloat(el.value);
      setVal('waterRippleStrengthVal', g.waterRippleStrength.toFixed(0));
      autoSaveSettings();
    });
    bindSlider('waterMotionSlider', (el) => {
      const intensity = parseFloat(el.value);
      g.waterDriftStrength = intensity;
      g.waterInitialVelocity = intensity * 5;
      setVal('waterMotionVal', intensity.toFixed(0));
      if (g.currentMode === 'water') {
        Promise.resolve().then(function () { return water; }).then(({ initializeWater }) => {
          initializeWater();
        });
      }
      autoSaveSettings();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // VORTEX MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('vortexBallCountSlider', (el) => {
      g.vortexBallCount = parseInt(el.value, 10);
      setVal('vortexBallCountVal', String(g.vortexBallCount));
      if (g.currentMode === 'vortex') {
        Promise.resolve().then(function () { return vortex; }).then(({ initializeVortex }) => {
          initializeVortex();
        });
      }
    });
    bindSlider('vortexSwirlSlider', (el) => {
      g.vortexSwirlStrength = parseFloat(el.value);
      setVal('vortexSwirlVal', g.vortexSwirlStrength.toFixed(0));
    });
    bindSlider('vortexPullSlider', (el) => {
      g.vortexRadialPull = parseFloat(el.value);
      setVal('vortexPullVal', g.vortexRadialPull.toFixed(0));
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PING PONG MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('pingPongBallCountSlider', (el) => {
      g.pingPongBallCount = parseInt(el.value, 10);
      setVal('pingPongBallCountVal', String(g.pingPongBallCount));
      if (g.currentMode === 'ping-pong') {
        Promise.resolve().then(function () { return pingPong; }).then(({ initializePingPong }) => {
          initializePingPong();
        });
      }
    });
    bindSlider('pingPongSpeedSlider', (el) => {
      g.pingPongSpeed = parseFloat(el.value);
      setVal('pingPongSpeedVal', g.pingPongSpeed.toFixed(0));
      if (g.currentMode === 'ping-pong') {
        Promise.resolve().then(function () { return pingPong; }).then(({ initializePingPong }) => {
          initializePingPong();
        });
      }
    });
    bindSlider('pingPongCursorSlider', (el) => {
      g.pingPongCursorRadius = parseFloat(el.value);
      setVal('pingPongCursorVal', g.pingPongCursorRadius.toFixed(0));
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // MAGNETIC MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('magneticBallCountSlider', (el) => {
      g.magneticBallCount = parseInt(el.value, 10);
      setVal('magneticBallCountVal', String(g.magneticBallCount));
      if (g.currentMode === 'magnetic') {
        Promise.resolve().then(function () { return magnetic; }).then(({ initializeMagnetic }) => {
          initializeMagnetic();
        });
      }
    });
    bindSlider('magneticStrengthSlider', (el) => {
      g.magneticStrength = parseFloat(el.value);
      setVal('magneticStrengthVal', g.magneticStrength.toFixed(0));
    });
    bindSlider('magneticVelocitySlider', (el) => {
      g.magneticMaxVelocity = parseFloat(el.value);
      setVal('magneticVelocityVal', g.magneticMaxVelocity.toFixed(0));
    });
    bindSlider('magneticIntervalSlider', (el) => {
      g.magneticExplosionInterval = parseInt(el.value, 10);
      setVal('magneticIntervalVal', String(g.magneticExplosionInterval));
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // BUBBLES MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('bubblesRateSlider', (el) => {
      g.bubblesSpawnRate = parseInt(el.value, 10);
      setVal('bubblesRateVal', String(g.bubblesSpawnRate));
    });
    bindSlider('bubblesSpeedSlider', (el) => {
      g.bubblesRiseSpeed = parseFloat(el.value);
      setVal('bubblesSpeedVal', g.bubblesRiseSpeed.toFixed(0));
    });
    bindSlider('bubblesWobbleSlider', (el) => {
      g.bubblesWobble = parseFloat(el.value);
      setVal('bubblesWobbleVal', g.bubblesWobble.toFixed(0));
    });
    bindSlider('bubblesMaxSlider', (el) => {
      g.bubblesMaxCount = parseInt(el.value, 10);
      setVal('bubblesMaxVal', String(g.bubblesMaxCount));
    });
    bindSlider('bubblesDeflectSlider', (el) => {
      g.bubblesDeflectRadius = parseFloat(el.value);
      setVal('bubblesDeflectVal', g.bubblesDeflectRadius.toFixed(0));
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // COLOR TEMPLATE SELECT
    // ═══════════════════════════════════════════════════════════════════════════
    populateColorSelect();
    const colorSelect = document.getElementById('colorSelect');
    if (colorSelect) {
      colorSelect.addEventListener('change', () => {
        applyColorTemplate(colorSelect.value);
        autoSaveSettings();
      });
    }
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
        'pit': 'Ball Pit',
        'flies': 'Flies to Light', 
        'weightless': 'Zero-G',
        'water': 'Water Swimming',
        'vortex': 'Vortex Sheets',
        'ping-pong': 'Ping Pong',
        'magnetic': 'Magnetic',
        'bubbles': 'Carbonated Bubbles'
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
        gravityMultiplier: g.gravityMultiplierPit,
        ballMass: g.ballMassKg,
        sizeScale: g.sizeScale,
        sizeVariation: g.sizeVariation,
        restitution: g.REST,
        friction: g.FRICTION,
        repelRadius: g.repelRadius,
        repelPower: g.repelPower,
        repelSoftness: g.repelSoft,
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
  // ║                          PANEL DOCK CONTROLLER                              ║
  // ║        Unified container for Control Panel and Sound Panel                  ║
  // ║        Both panels collapsed and visible by default                         ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let dockElement = null;
  let controlPanelElement = null;
  let soundPanelElement = null;
  let dockToggleElement = null;

  // Drag state
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dockStartX = 0;
  let dockStartY = 0;

  // ════════════════════════════════════════════════════════════════════════════════
  // SOUND PANEL HTML (simplified for dock)
  // ════════════════════════════════════════════════════════════════════════════════

  const SOUND_PANEL_CONTENT = `
  <!-- Sound Enable/Disable -->
  <div class="sound-dock__enable">
    <button id="soundEnableBtn" class="sound-dock__enable-btn">
      🔇 Enable Sound
    </button>
  </div>
  
  <!-- Controls (visible when sound enabled) -->
  <div id="soundControlsWrapper" class="sound-dock__controls" style="display: none;">
    <!-- Preset -->
    <div class="sound-dock__section">
      <select id="soundPresetSelect" class="sound-dock__select"></select>
      <p id="presetDescription" class="sound-dock__desc"></p>
    </div>
    
    <!-- Core: 5 most important parameters (1:1 with sound-engine CONFIG) -->
    <div class="sound-dock__section">
      <div class="sound-dock__group">
        <label class="sound-dock__row">
          <span class="sound-dock__label">Master</span>
          <input type="range" id="masterGain" class="sound-dock__slider" min="10" max="100" step="1">
          <span class="sound-dock__val" id="masterVal">42%</span>
        </label>
        <label class="sound-dock__row">
          <span class="sound-dock__label">Silence Threshold</span>
          <input type="range" id="collisionMinImpact" class="sound-dock__slider" min="0" max="30" step="1">
          <span class="sound-dock__val" id="thresholdVal">12%</span>
        </label>
        <label class="sound-dock__row">
          <span class="sound-dock__label">Click Length</span>
          <input type="range" id="decayTime" class="sound-dock__slider" min="20" max="180" step="1">
          <span class="sound-dock__val" id="decayVal">45ms</span>
        </label>
        <label class="sound-dock__row">
          <span class="sound-dock__label">Brightness</span>
          <input type="range" id="filterBaseFreq" class="sound-dock__slider" min="300" max="6000" step="50">
          <span class="sound-dock__val" id="filterVal">2100Hz</span>
        </label>
        <label class="sound-dock__row">
          <span class="sound-dock__label">Surface Texture</span>
          <input type="range" id="rollingGain" class="sound-dock__slider" min="0" max="8" step="0.1">
          <span class="sound-dock__val" id="rollingVal">2.0%</span>
        </label>
      </div>
    </div>
  </div>
`;

  // ════════════════════════════════════════════════════════════════════════════════
  // DOCK CREATION
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Create the unified panel dock with both panels
   */
  function createPanelDock() {
    // Initialize sound engine (non-blocking)
    initSoundEngine();
    
    // Create dock container
    dockElement = document.createElement('div');
    dockElement.className = 'panel-dock';
    dockElement.id = 'panelDock';
    
    // Create Control Panel
    controlPanelElement = createControlPanel();
    
    // Create Sound Panel
    soundPanelElement = createSoundPanel();
    
    // Add panels to dock (Sound on top, Controls below)
    dockElement.appendChild(soundPanelElement);
    dockElement.appendChild(controlPanelElement);
    
    // Create dock toggle button
    dockToggleElement = createDockToggle();
    
    // Append to body
    document.body.appendChild(dockElement);
    document.body.appendChild(dockToggleElement);
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts$1();
    
    // Setup dragging
    setupDragging();
    
    console.log('✓ Panel dock created (both panels collapsed by default)');
    return dockElement;
  }

  /**
   * Create the control panel element
   */
  function createControlPanel() {
    const panel = document.createElement('div');
    panel.id = 'controlPanel';
    panel.className = 'panel collapsed'; // Start collapsed
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Simulation controls');
    
    // Custom header for dock
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
    <div class="panel-title">
      <span class="panel-icon">⚙️</span>
      <span>Controls</span>
    </div>
    <button class="collapse-btn" aria-label="Expand/collapse controls">▼</button>
  `;
    
    // Content wrapper
    const content = document.createElement('div');
    content.className = 'panel-content';
    content.innerHTML = PANEL_HTML.replace(/<div class="panel-header"[\s\S]*?<\/div>/, ''); // Remove original header
    
    panel.appendChild(header);
    panel.appendChild(content);
    
    // Setup header click to toggle
    header.addEventListener('click', () => togglePanelCollapse(panel));
    
    // Initialize dark mode and controls
    setTimeout(() => {
      initializeDarkMode();
      setupControls();
      setupBuildControls();
    }, 0);
    
    return panel;
  }

  /**
   * Create the sound panel element
   */
  function createSoundPanel() {
    const panel = document.createElement('div');
    panel.id = 'soundPanel';
    panel.className = 'panel sound-panel collapsed'; // Start collapsed
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Sound configuration');
    
    // Custom header for dock
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
    <div class="panel-title">
      <span class="panel-icon">🔊</span>
      <span>Sound</span>
    </div>
    <button class="collapse-btn" aria-label="Expand/collapse sound">▼</button>
  `;
    
    // Content wrapper
    const content = document.createElement('div');
    content.className = 'panel-content';
    content.innerHTML = SOUND_PANEL_CONTENT;
    
    panel.appendChild(header);
    panel.appendChild(content);
    
    // Setup header click to toggle
    header.addEventListener('click', () => togglePanelCollapse(panel));
    
    // Setup sound controls
    setTimeout(() => setupSoundControls(panel), 0);
    
    return panel;
  }

  /**
   * Create the dock toggle button (shows when dock is hidden)
   */
  function createDockToggle() {
    const btn = document.createElement('button');
    btn.className = 'dock-toggle';
    btn.id = 'dockToggle';
    btn.setAttribute('aria-label', 'Show panels');
    btn.innerHTML = '⚙️';
    
    btn.addEventListener('click', () => {
      dockElement.classList.remove('hidden');
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
    });
    
    return btn;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // DRAG FUNCTIONALITY
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Setup drag handlers for the dock
   */
  function setupDragging() {
    if (!dockElement) return;
    
    // Get all panel headers in the dock
    const headers = dockElement.querySelectorAll('.panel-header');
    
    headers.forEach(header => {
      // Add drag handle indicator
      const titleEl = header.querySelector('.panel-title');
      if (titleEl && !titleEl.querySelector('.drag-indicator')) {
        const dragIndicator = document.createElement('span');
        dragIndicator.className = 'drag-indicator';
        dragIndicator.innerHTML = '⋮⋮';
        dragIndicator.setAttribute('aria-hidden', 'true');
        titleEl.insertBefore(dragIndicator, titleEl.firstChild);
      }
      
      // Mouse events
      header.addEventListener('mousedown', handleDragStart);
      
      // Touch events
      header.addEventListener('touchstart', handleDragStart, { passive: false });
    });
    
    // Global move/end listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
    
    // Load saved position
    loadDockPosition();
  }

  /**
   * Handle drag start
   */
  function handleDragStart(e) {
    // Only drag from header, not from buttons or controls
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
      return;
    }
    
    // Check if this is a collapse toggle (short click) or drag start
    const header = e.target.closest('.panel-header');
    if (!header) return;
    
    // Get position
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Store start positions
    dragStartX = clientX;
    dragStartY = clientY;
    
    // Get dock's current position
    const rect = dockElement.getBoundingClientRect();
    dockStartX = rect.left;
    dockStartY = rect.top;
    
    // Mark as potentially dragging (will confirm after threshold)
    isDragging = false;
    
    // Store header for click detection
    header._dragStartTime = Date.now();
    header._dragMoved = false;
    
    // Prevent text selection during drag
    e.preventDefault();
  }

  /**
   * Handle drag move
   */
  function handleDragMove(e) {
    if (dragStartX === 0 && dragStartY === 0) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStartX;
    const deltaY = clientY - dragStartY;
    
    // Threshold to differentiate click from drag
    const dragThreshold = 5;
    
    if (!isDragging && (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)) {
      isDragging = true;
      dockElement.classList.add('dragging');
      
      // Switch to fixed positioning with current position
      dockElement.style.position = 'fixed';
      dockElement.style.top = `${dockStartY}px`;
      dockElement.style.left = `${dockStartX}px`;
      dockElement.style.right = 'auto';
    }
    
    if (isDragging) {
      // Calculate new position
      let newX = dockStartX + deltaX;
      let newY = dockStartY + deltaY;
      
      // Constrain to viewport
      const dockRect = dockElement.getBoundingClientRect();
      const minX = 0;
      const maxX = window.innerWidth - dockRect.width;
      const minY = 0;
      const maxY = window.innerHeight - dockRect.height;
      
      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));
      
      // Apply position
      dockElement.style.left = `${newX}px`;
      dockElement.style.top = `${newY}px`;
      
      // Mark moved
      const headers = dockElement.querySelectorAll('.panel-header');
      headers.forEach(h => h._dragMoved = true);
      
      e.preventDefault();
    }
  }

  /**
   * Handle drag end
   */
  function handleDragEnd(e) {
    if (isDragging) {
      isDragging = false;
      dockElement.classList.remove('dragging');
      
      // Save position
      saveDockPosition();
    }
    
    // Reset drag tracking
    dragStartX = 0;
    dragStartY = 0;
  }

  /**
   * Save dock position to localStorage
   */
  function saveDockPosition() {
    if (!dockElement) return;
    
    try {
      const position = {
        left: dockElement.style.left,
        top: dockElement.style.top,
        useCustomPosition: true
      };
      localStorage.setItem('panel_dock_position', JSON.stringify(position));
    } catch (e) {}
  }

  /**
   * Load dock position from localStorage
   */
  function loadDockPosition() {
    if (!dockElement) return;
    
    try {
      const stored = localStorage.getItem('panel_dock_position');
      if (stored) {
        const position = JSON.parse(stored);
        if (position.useCustomPosition) {
          dockElement.style.position = 'fixed';
          dockElement.style.left = position.left;
          dockElement.style.top = position.top;
          dockElement.style.right = 'auto';
        }
      }
    } catch (e) {}
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // PANEL COLLAPSE/EXPAND
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Toggle a panel's collapsed state (only if not dragged)
   */
  function togglePanelCollapse(panel) {
    // Get the header
    const header = panel.querySelector('.panel-header');
    
    // Don't toggle if we just finished dragging
    if (header && header._dragMoved) {
      header._dragMoved = false;
      return;
    }
    
    panel.classList.toggle('collapsed');
  }

  /**
   * Toggle the entire dock visibility
   */
  function toggleDock() {
    if (!dockElement) return;
    
    const isHidden = dockElement.classList.toggle('hidden');
    
    if (dockToggleElement) {
      dockToggleElement.style.opacity = isHidden ? '1' : '0';
      dockToggleElement.style.pointerEvents = isHidden ? 'auto' : 'none';
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // SOUND CONTROLS SETUP
  // ════════════════════════════════════════════════════════════════════════════════

  function setupSoundControls(panel) {
    const enableBtn = panel.querySelector('#soundEnableBtn');
    const controlsWrapper = panel.querySelector('#soundControlsWrapper');
    const presetSelect = panel.querySelector('#soundPresetSelect');
    const presetDesc = panel.querySelector('#presetDescription');
    
    // Sound enable button
    if (enableBtn) {
      enableBtn.addEventListener('click', async () => {
        const state = getSoundState();
        
        if (!state.isUnlocked) {
          // First click: unlock audio
          const success = await unlockAudio();
          if (success) {
            enableBtn.textContent = '🔊 Sound On';
            enableBtn.style.background = 'rgba(76, 175, 80, 0.3)';
            if (controlsWrapper) controlsWrapper.style.display = '';
            updateSoundIcon(true);
          }
        } else {
          // Toggle sound
          const newState = toggleSound();
          enableBtn.textContent = newState ? '🔊 Sound On' : '🔇 Sound Off';
          enableBtn.style.background = newState ? 'rgba(76, 175, 80, 0.3)' : '';
          if (controlsWrapper) controlsWrapper.style.display = newState ? '' : 'none';
          updateSoundIcon(newState);
        }
      });
    }
    
    // Preset select
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
        syncSoundSliders(panel);
      });
    }
    
    // Setup sliders
    setupSoundSliders(panel);
  }

  function setupSoundSliders(panel) {
    const sliderConfigs = [
      // Core 5 (1:1 with CONFIG keys in sound-engine.js)
      { id: 'masterGain', valId: 'masterVal', format: v => `${Math.round(v)}%`, toConfig: v => v / 100 },
      { id: 'collisionMinImpact', valId: 'thresholdVal', format: v => `${Math.round(v)}%`, toConfig: v => v / 100 },
      { id: 'decayTime', valId: 'decayVal', format: v => `${Math.round(v)}ms`, toConfig: v => v / 1000 },
      { id: 'filterBaseFreq', valId: 'filterVal', format: v => `${Math.round(v)}Hz`, toConfig: v => v },
      { id: 'rollingGain', valId: 'rollingVal', format: v => `${v.toFixed(1)}%`, toConfig: v => v / 100 },
    ];
    
    for (const config of sliderConfigs) {
      const slider = panel.querySelector(`#${config.id}`);
      const valDisplay = panel.querySelector(`#${config.valId}`);
      
      if (!slider) continue;
      
      slider.addEventListener('input', () => {
        const rawValue = parseFloat(slider.value);
        const configValue = config.toConfig(rawValue);
        
        if (valDisplay) {
          valDisplay.textContent = config.format(rawValue);
        }
        
        updateSoundConfig({ [config.id]: configValue });
      });
    }
    
    syncSoundSliders(panel);
  }

  function syncSoundSliders(panel) {
    const config = getSoundConfig();
    
    const mappings = [
      { id: 'masterGain', valId: 'masterVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
      { id: 'collisionMinImpact', valId: 'thresholdVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
      { id: 'decayTime', valId: 'decayVal', fromConfig: v => v * 1000, format: v => `${Math.round(v)}ms` },
      { id: 'filterBaseFreq', valId: 'filterVal', fromConfig: v => v, format: v => `${Math.round(v)}Hz` },
      { id: 'rollingGain', valId: 'rollingVal', fromConfig: v => v * 100, format: v => `${v.toFixed(1)}%` },
    ];
    
    for (const mapping of mappings) {
      const slider = panel.querySelector(`#${mapping.id}`);
      const valDisplay = panel.querySelector(`#${mapping.valId}`);
      
      if (slider && config[mapping.id] !== undefined) {
        const sliderValue = mapping.fromConfig(config[mapping.id]);
        slider.value = sliderValue;
        
        if (valDisplay) {
          valDisplay.textContent = mapping.format(sliderValue);
        }
      }
    }
  }

  function updateSoundIcon(enabled) {
    const header = soundPanelElement?.querySelector('.panel-header .panel-icon');
    if (header) {
      header.textContent = enabled ? '🔊' : '🔇';
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS (S and C only - / is handled by keyboard.js)
  // ════════════════════════════════════════════════════════════════════════════════

  function setupKeyboardShortcuts$1() {
    document.addEventListener('keydown', (e) => {
      // Skip if typing in input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      
      // Note: / for dock toggle is handled in keyboard.js
      switch (e.key) {
        case 's':
        case 'S':
          // Toggle sound panel collapse
          if (dockElement && !dockElement.classList.contains('hidden') && soundPanelElement) {
            togglePanelCollapse(soundPanelElement);
          }
          break;
        case 'c':
        case 'C':
          // Toggle control panel collapse (avoid conflict with browser shortcuts)
          if (e.ctrlKey || e.metaKey) return; // Don't override Ctrl+C / Cmd+C
          if (dockElement && !dockElement.classList.contains('hidden') && controlPanelElement) {
            togglePanelCollapse(controlPanelElement);
          }
          break;
      }
    });
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                                KEYBOARD INPUT                                ║
  // ║              Panel dock toggle and mode switching (1-8)                      ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function setupKeyboardShortcuts() {
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
      
      // Mode switching: 1=pit, 2=flies, 3=weightless, 4=water, 5=vortex, 6=ping-pong, 7=magnetic, 8=bubbles
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
      }
    });
    
    console.log('✓ Keyboard shortcuts registered');
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                 BRAND LOGO – CURSOR DISTANCE SCALE (SUBTLE)                  ║
  // ║          Center of viewport → 0.9x | Farthest (corner) → 1.1x                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  /**
   * Performance posture:
   * - No continuous loop.
   * - Pointer updates are rAF-throttled (max 1 style write per frame).
   * - Only a single element is updated via a CSS custom property.
   */

  const CSS_VAR = '--abs-brand-logo-scale';
  const DEFAULT_SCALE = 1;
  const MIN_SCALE = 0.9;
  const MAX_SCALE = 1.1;
  const EPSILON = 0.001;

  let targetEl = null;
  let isEnabled = false;

  let viewportW = 0;
  let viewportH = 0;
  let maxDist = 1;

  let pendingClientX = null;
  let pendingClientY = null;
  let rafId = 0;
  let lastAppliedScale = null;

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function recomputeViewport() {
    viewportW = window.innerWidth || 0;
    viewportH = window.innerHeight || 0;
    maxDist = Math.hypot(viewportW * 0.5, viewportH * 0.5) || 1;
  }

  function applyPending() {
    rafId = 0;
    if (!isEnabled || !targetEl) return;
    if (pendingClientX == null || pendingClientY == null) return;

    const dx = pendingClientX - viewportW * 0.5;
    const dy = pendingClientY - viewportH * 0.5;
    const t = clamp01(Math.hypot(dx, dy) / maxDist);
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
    isEnabled = true;

    // Seed with a neutral default until the first mousemove arrives.
    targetEl.style.setProperty(CSS_VAR, String(DEFAULT_SCALE));

    window.addEventListener('resize', recomputeViewport, { passive: true });
  }

  /**
   * Feed pointer positions in CSS pixels (clientX/clientY).
   * rAF throttles updates to avoid per-event style writes.
   */
  function updateBrandLogoCursorScaleFromClient(clientX, clientY) {
    if (!isEnabled || !targetEl) return;

    pendingClientX = clientX;
    pendingClientY = clientY;

    if (rafId) return;
    rafId = window.requestAnimationFrame(applyPending);
  }

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
  let clickCycleEnabled = false; // DISABLED by default - click/tap cycles through modes

  const MODE_CYCLE = [
    MODES.PIT,
    MODES.FLIES,
    MODES.WEIGHTLESS,
    MODES.WATER,
    MODES.VORTEX,
    MODES.PING_PONG,
    MODES.MAGNETIC,
    MODES.BUBBLES
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
    
    // Initialize clickCycleEnabled from global state
    clickCycleEnabled = globals.clickCycleEnabled || false;
    
    if (!canvas) {
      console.error('Canvas not available for pointer setup');
      return;
    }
    
    const DPR = globals.DPR;
    
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
     * Document-level mouse move tracking
     * Works even when canvas is behind content (z-index: -1)
     * PASSIVE - doesn't interfere with panel interactions
     */
    document.addEventListener('mousemove', (e) => {
      // Title/logo micro-interaction (viewport based) — keep responsive even over UI.
      updateBrandLogoCursorScaleFromClient(e.clientX, e.clientY);

      // Don't track if over panel
      if (e.target.closest('#controlPanel')) return;
      
      const pos = getCanvasPosition(e.clientX, e.clientY);
    
      // Calculate mouse velocity for water ripples
      const now = performance.now();
      const dt = now - lastMoveTime;
      if (dt > 0 && lastMoveTime > 0) {
        const dx = pos.x - lastMouseX;
        const dy = pos.y - lastMouseY;
        mouseVelocity = Math.sqrt(dx * dx + dy * dy) / dt;
      }
      
      // Update globals
      globals.mouseX = pos.x;
      globals.mouseY = pos.y;
      globals.mouseInCanvas = pos.inBounds;
      if (typeof window !== 'undefined') window.mouseInCanvas = pos.inBounds;
      
      // ════════════════════════════════════════════════════════════════════════
      // WATER MODE: Create ripples based on mouse movement velocity
      // ════════════════════════════════════════════════════════════════════════
      if (globals.currentMode === MODES.WATER && pos.inBounds) {
        // Only create ripple if moving fast enough and throttle time passed
        if (mouseVelocity > 0.3 && (now - lastRippleTime) > RIPPLE_THROTTLE_MS) {
          // Scale ripple strength based on velocity (faster = stronger)
          const velocityFactor = Math.min(mouseVelocity * 2, 3);
          createWaterRipple(pos.x, pos.y, velocityFactor);
          lastRippleTime = now;
        }
      }

      
      // Store for velocity calculation
      lastMouseX = pos.x;
      lastMouseY = pos.y;
      lastMoveTime = now;
    }, { passive: true });
    
    /**
     * Document-level click handler
     * Responds to mode-specific interactions
     */
    document.addEventListener('click', (e) => {
      // Ignore clicks on panel or interactive elements
      if (e.target.closest('#controlPanel')) return;
      if (e.target.closest('a')) return;
      if (e.target.closest('button')) return;
      
      const pos = getCanvasPosition(e.clientX, e.clientY);
      
      // Only process if click is within canvas bounds
      if (!pos.inBounds) return;
      
      // NO click effects on any simulation - only mouse movement triggers interactions
      // Click cycles mode (if enabled)
      if (clickCycleEnabled) {
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
        
        // Water mode: create ripples on touch move
        const now = performance.now();
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
      if (e.target.closest('#controlPanel')) return;
      if (e.target.closest('a')) return;
      if (e.target.closest('button')) return;
      
      if (e.touches && e.touches[0]) {
        const pos = getCanvasPosition(e.touches[0].clientX, e.touches[0].clientY);
        
        if (!pos.inBounds) return;
        
        // NO tap effects on any simulation - only finger drag triggers interactions
        // Double-tap cycles mode (if enabled)
        const now = performance.now();
        if (now - lastTapTime < 300 && clickCycleEnabled) {
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
  // ║                              MAIN RENDER LOOP                                ║
  // ║                Extracted from balls-source.html lines 2472-2592              ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let last = performance.now() / 1000;

  function startMainLoop(applyForcesFunc) {
    function frame(nowMs) {
      const now = nowMs / 1000;
      let dt = Math.min(0.033, now - last);
      last = now;
      
      // Physics update
      updatePhysics(dt, applyForcesFunc);
      
      // Render
      render();
      
      // Update ambient sounds (rolling rumble + air whoosh)
      const balls = getBalls();
      const globals = getGlobals();
      const floorY = globals.canvas ? globals.canvas.height - (globals.simulationPadding || 0) : Infinity;
      updateAmbientSounds(balls, floorY);
      
      // FPS tracking
      trackFrame(performance.now());
      
      requestAnimationFrame(frame);
    }
    
    requestAnimationFrame(frame);
  }

  /**
   * CV Gate Controller
   * Handles the password protection UI for the CV download.
   */

  function initCVGate() {
      const trigger = document.getElementById('cv-gate-trigger');
      const logo = document.getElementById('brand-logo');
      const gate = document.getElementById('cv-gate');
      const inputs = Array.from(document.querySelectorAll('.cv-digit'));
      const body = document.body;
      
      // Correct Code
      const CODE = '1111';
      
      if (!trigger || !logo || !gate || inputs.length === 0) {
          console.warn('CV Gate: Missing required elements');
          return;
      }

      // State
      let isOpen = false;

      // --- Actions ---

      const openGate = (e) => {
          e.preventDefault();
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
                  // Success
                  body.classList.add('flash-green');
                  setTimeout(() => {
                      window.location.href = 'cv-test.html';
                  }, 400);
              } else {
                  // Failure
                  body.classList.add('flash-red');
                  setTimeout(() => {
                      body.classList.remove('flash-red');
                      inputs.forEach(input => input.value = '');
                      inputs[0].focus();
                  }, 400);
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
    buttonElement.className = 'sound-toggle footer_link is-orange';
    buttonElement.id = 'sound-toggle';
    buttonElement.type = 'button';
    buttonElement.setAttribute('aria-label', 'Toggle collision sounds');
    buttonElement.setAttribute('aria-pressed', 'false');
    buttonElement.setAttribute('data-enabled', 'false');
    
    // Style overrides for button reset to match link style
    buttonElement.style.background = 'none';
    buttonElement.style.border = 'none';
    buttonElement.style.padding = '0';
    buttonElement.style.font = 'inherit';
    buttonElement.style.cursor = 'pointer';
    buttonElement.style.position = 'fixed'; /* Default fixed if not in grid */
    buttonElement.style.zIndex = '200'; /* Above noise (100) */
    buttonElement.style.bottom = '3.5em'; /* Align with footer padding roughly */
    buttonElement.style.left = '4em'; /* Align with social links roughly? No, wait. */

    // Initial text (sound starts off)
    buttonElement.textContent = 'Sound Off'; // "Off" capitalized per request
    
    // Click handler
    buttonElement.addEventListener('click', handleToggleClick);
    
    // Insert into body for now, fixed position
    document.body.appendChild(buttonElement);
    
    console.log('✓ Sound toggle created');
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
        updateButtonState(true);
      } else {
        // Failed to unlock - show error state briefly, then revert
        buttonElement.textContent = 'Audio unavailable';
        setTimeout(() => {
          buttonElement.textContent = 'Sound off';
        }, 2000);
      }
    } else {
      // Subsequent clicks: toggle on/off
      const newState = toggleSound();
      updateButtonState(newState);
    }
  }

  /**
   * Update button text and state attributes
   * @param {boolean} enabled - Current enabled state
   */
  function updateButtonState(enabled) {
    if (!buttonElement) return;
    
    buttonElement.setAttribute('data-enabled', enabled ? 'true' : 'false');
    buttonElement.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    buttonElement.setAttribute('aria-label', 'Toggle collision sounds');
    
    buttonElement.textContent = enabled ? 'Sound On' : 'Sound Off';
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
    root.style.setProperty('--container-border', `${g.containerBorder || 0}px`);
    
    // Inner padding: canvas inset from container
    root.style.setProperty('--simulation-padding', `${g.simulationPadding || 0}px`);
  }

  /**
   * Apply visual CSS variables (noise opacity/size, vignette, walls) from config to :root
   */
  function applyVisualCSSVars(config) {
    const root = document.documentElement;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // RUBBER WALL SYSTEM - 4 controllable parameters
    // ═══════════════════════════════════════════════════════════════════════════════
    if (config.wallThickness !== undefined) {
      root.style.setProperty('--wall-thickness', `${config.wallThickness}px`);
    }
    if (config.wallSoftness !== undefined) {
      root.style.setProperty('--wall-softness', `${config.wallSoftness}px`);
    }
    if (config.wallRadius !== undefined) {
      root.style.setProperty('--wall-radius', `${config.wallRadius}px`);
    }
    if (config.wallBounceIntensity !== undefined) {
      root.style.setProperty('--wall-bounce-intensity', String(config.wallBounceIntensity));
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
    
    // Vignette intensity
    if (config.vignetteLightIntensity !== undefined) {
      root.style.setProperty('--vignette-light-intensity', String(config.vignetteLightIntensity));
    }
    if (config.vignetteDarkIntensity !== undefined) {
      root.style.setProperty('--vignette-dark-intensity', String(config.vignetteDarkIntensity));
    }
    
    // Vignette blur layers
    if (config.vignetteBlurOuter !== undefined) {
      root.style.setProperty('--vignette-blur-outer', `${config.vignetteBlurOuter}px`);
    }
    if (config.vignetteBlurMid !== undefined) {
      root.style.setProperty('--vignette-blur-mid', `${config.vignetteBlurMid}px`);
    }
    if (config.vignetteBlurInner !== undefined) {
      root.style.setProperty('--vignette-blur-inner', `${config.vignetteBlurInner}px`);
    }
    
    // Vignette spread and animation
    if (config.vignetteSpread !== undefined) {
      root.style.setProperty('--vignette-spread', `${config.vignetteSpread}px`);
    }
    if (config.vignetteTransition !== undefined) {
      root.style.setProperty('--vignette-transition', `${config.vignetteTransition}ms`);
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
    
    const noiseStyle = getComputedStyle(existingNoise);
    const bgImage = (noiseStyle.backgroundImage && noiseStyle.backgroundImage !== 'none') 
      ? noiseStyle.backgroundImage 
      : null;
    
    // Create noise-2 if it doesn't exist
    if (!document.querySelector('.noise-2')) {
      const noise2 = document.createElement('div');
      noise2.className = 'noise-2';
      if (bgImage) noise2.style.backgroundImage = bgImage;
      
      noise2.style.position = 'fixed';
      noise2.style.inset = '0';
      noise2.style.pointerEvents = 'none';
      noise2.style.backgroundRepeat = 'repeat';
      noise2.style.backgroundPosition = '50%';
      noise2.style.backgroundAttachment = 'fixed';
      noise2.style.mixBlendMode = 'luminosity';
      
      existingNoise.insertAdjacentElement('afterend', noise2);
      console.log('✓ Created .noise-2 element');
    }
    
    // Create noise-3 if it doesn't exist (on top of noise-2)
    const noise2 = document.querySelector('.noise-2');
    if (noise2 && !document.querySelector('.noise-3')) {
      const noise3 = document.createElement('div');
      noise3.className = 'noise-3';
      if (bgImage) noise3.style.backgroundImage = bgImage;
      
      noise3.style.position = 'fixed';
      noise3.style.inset = '0';
      noise3.style.pointerEvents = 'none';
      noise3.style.backgroundRepeat = 'repeat';
      noise3.style.backgroundPosition = '50%';
      noise3.style.backgroundAttachment = 'fixed';
      noise3.style.mixBlendMode = 'luminosity';
      
      noise2.insertAdjacentElement('afterend', noise3);
      console.log('✓ Created .noise-3 element');
    }
  }

  (async function init() {
    // Mark JS as enabled immediately (for CSS fallback detection)
    document.documentElement.classList.add('js-enabled');
    
    // Wire up control registry to use CSS vars function (avoids circular dependency)
    setApplyVisualCSSVars(applyVisualCSSVars);
    
    try {
      console.log('🚀 Initializing modular bouncy balls...');
      
      const config = await loadRuntimeConfig();
      initState(config);
      console.log('✓ Config loaded');
      
      // Apply frame padding CSS vars from config (controls border thickness)
      applyFramePaddingCSSVars();
      console.log('✓ Frame padding applied');
      
      // Apply visual CSS vars (noise, vignette) from config
      applyVisualCSSVars(config);
      console.log('✓ Visual effects configured');
      
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
      
      // Set canvas reference in state (needed for container-relative sizing)
      setCanvas(canvas, ctx, container);
      
      // NOW resize - container is available for container-relative sizing
      resize();
      console.log('✓ Canvas initialized (container-relative sizing)');
      
      // Ensure initial mouseInCanvas state is false for tests
      const globals = getGlobals();
      globals.mouseInCanvas = false;
      if (typeof window !== 'undefined') window.mouseInCanvas = false;
      
      // Setup pointer tracking BEFORE dark mode (needed for interactions)
      setupPointer();
      console.log('✓ Pointer tracking configured');

      // Subtle brand logo micro-interaction (cursor distance scaling)
      initBrandLogoCursorScale();
      
      // Load any saved settings
      loadSettings();
      
      // Initialize dark mode BEFORE colors (determines which palette variant to load)
      initializeDarkMode();
      console.log('✓ Dark mode initialized');
      
      // Initialize color system
      applyColorTemplate(getGlobals().currentTemplate);
      console.log('✓ Color system initialized');
      
      // Setup UI - unified panel dock (both panels visible, collapsed by default)
      createPanelDock();
      populateColorSelect();
      console.log('✓ Panel dock created (Sound + Controls)');
      
      setupKeyboardShortcuts();
      console.log('✓ Keyboard shortcuts registered');
      
      // Initialize password gate (CV protection)
      initCVGate();
      console.log('✓ Password gate initialized');
      
      // Create quick sound toggle button (bottom-left)
      createSoundToggle();
      console.log('✓ Sound toggle button created');
      
      // Initialize starting mode (Flies by default)
      setMode(MODES.FLIES);
      console.log('✓ Mode initialized');
      
      // Start main render loop
      const getForces = () => getForceApplicator();
      startMainLoop((ball, dt) => {
        const forceFn = getForces();
        if (forceFn) forceFn(ball, dt);
      });
      
      console.log('✅ Bouncy Balls running (modular)');
      
      // PAGE FADE-IN: Signal that everything is ready
      // Small delay ensures first frame renders before fade begins
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.body.classList.add('page-ready');
          console.log('✓ Page fade-in triggered');
        });
      });
      
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
