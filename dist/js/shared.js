/* Alexander Beck Studio | 2026-01-18 */
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
  DVD_LOGO: 'dvd-logo',
  MAGNETIC: 'magnetic',
  BUBBLES: 'bubbles',
  KALEIDOSCOPE: 'kaleidoscope-3', // Glorious: 40-50 balls, complex morph
  // Simulation 11: ball-only "critters" (no keyboard shortcut yet)
  CRITTERS: 'critters',
  NEURAL: 'neural',
  // Parallax (depth perception) simulations
  PARALLAX_LINEAR: 'parallax-linear',
  SPHERE_3D: '3d-sphere',
  CUBE_3D: '3d-cube',
  STARFIELD_3D: 'starfield-3d',
  ELASTIC_CENTER: 'elastic-center',
  SNAKE: 'snake',
  PARTICLE_FOUNTAIN: 'particle-fountain'
};

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       NARRATIVE MODE SEQUENCE (ORDERED)                       ║
// ║          Used for ArrowLeft/ArrowRight navigation (looping)                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// Story arc (curated alternation):
// - Keep tonal contrast between adjacent sims (avoid “similar twice in a row”)
// - Ball Pit opens the story
// - Kaleidoscopes are contiguous and increase complexity
const NARRATIVE_MODE_SEQUENCE = [
  MODES.PIT,
  MODES.FLIES,
  MODES.CUBE_3D,
  MODES.BUBBLES,
  MODES.MAGNETIC,
  MODES.WATER,
  MODES.PING_PONG,
  MODES.DVD_LOGO,
  MODES.NEURAL,
  MODES.SPHERE_3D,
  MODES.WEIGHTLESS,
  MODES.PARALLAX_LINEAR,
  MODES.CRITTERS,
  MODES.ELASTIC_CENTER,
  MODES.VORTEX,
  MODES.KALEIDOSCOPE,
  MODES.STARFIELD_3D,
  MODES.SNAKE,
  MODES.PARTICLE_FOUNTAIN
];

// Short chapter titles (no numbers) — used by the left-edge narrative label.
// These are meant to read like “how an idea forms” chapters (emergence → swarm → synthesis),
// not literal mode names.
const NARRATIVE_CHAPTER_TITLES = {
  [MODES.PIT]: 'SOURCE MATERIAL',
  [MODES.FLIES]: 'IDEA SPARK',
  [MODES.BUBBLES]: 'NOISE SIGNAL',
  [MODES.MAGNETIC]: 'DESIGN FORCES',
  [MODES.WATER]: 'USER FLOW',
  [MODES.PING_PONG]: 'FEEDBACK CYCLE',
  [MODES.DVD_LOGO]: 'DVD SCREENSAVER',
  [MODES.NEURAL]: 'CONNECTION MAP',
  [MODES.VORTEX]: 'ATOMIC STRUCTURE',
  [MODES.WEIGHTLESS]: 'OPEN SPACE',
  [MODES.PARALLAX_LINEAR]: 'PERSPECTIVE SHIFT',
  [MODES.CRITTERS]: 'BEHAVIOR MODEL',
  [MODES.ELASTIC_CENTER]: 'ELASTIC CENTER',
  [MODES.SPHERE_3D]: '3D SHELL',
  [MODES.CUBE_3D]: '3D FRAME',
  [MODES.KALEIDOSCOPE]: 'VOCAB BLOOM',
  [MODES.STARFIELD_3D]: 'DEPTH FIELD',
  [MODES.SNAKE]: 'SNAKE',
  [MODES.PARTICLE_FOUNTAIN]: 'PARTICLE FLOW'
};

const CONSTANTS = {
  DPR: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
  OFFSCREEN_MOUSE: -1e9,
  MIN_DISTANCE_EPSILON: 1e-6,
  ACCUMULATOR_RESET_THRESHOLD: 3,
  MAX_PHYSICS_STEPS: 4, // Increased from 2 to handle low-framerate mobile (30fps → needs 4 steps at 120Hz)
  SPIN_DAMP_PER_S: 3.0,             // Faster spin decay to prevent endless rotation
  SPIN_GAIN: 0.25,
  SPIN_GAIN_TANGENT: 0.18,
  ROLL_FRICTION_PER_S: 2.5,         // Higher rolling friction for faster settling
  SQUASH_MAX_BASE: 0.20,
  SQUASH_DECAY_PER_S: 18.0,
  WALL_REST_VEL_THRESHOLD: 70,
  GROUND_COUPLING_PER_S: 12.0,      // Stronger ground coupling for realistic rolling
  
  // Sleep threshold for jitter reduction (Box2D-inspired)
  SLEEP_VELOCITY_THRESHOLD: 12.0,     // px/s - higher = settles sooner (less idle jiggle)
  SLEEP_ANGULAR_THRESHOLD: 0.18,      // rad/s - higher = settles sooner (less idle spin)
  TIME_TO_SLEEP: 0.25,                // seconds - faster sleep for quicker settling
  
  PHYSICS_DT: 1/120,
  PHYSICS_DT_MOBILE: 1/60};

// ═══════════════════════════════════════════════════════════════════════════════
// WALL PRESETS
// ═══════════════════════════════════════════════════════════════════════════════
const WALL_PRESETS = {
  // NOTE: These are intended to be "wall types" and should update the wall sliders in real time.
  // Keep values explicit for all key wall params so switching presets resets everything consistently.
  rubber: {
    label: 'Rubber (balanced)',
    description: 'Balanced rubber ring with clear bounce and crisp ripples.',
    values: {
      wallWobbleMaxDeform: 50,
      wallWobbleStiffness: 2100,
      wallWobbleDamping: 34,
      wallWobbleSigma: 2.2,
      wallWobbleCornerClamp: 0.6,
      wallWobbleImpactThreshold: 110,
      wallWobbleSettlingSpeed: 70,
      wallWobbleMaxVel: 900,
      wallWobbleMaxImpulse: 240,
      wallWobbleMaxEnergyPerStep: 24000,
      wallInset: 3
    }
  },
  pudding: {
    label: 'Pudding (thick, soft)',
    description: 'Overdamped, broad blobs. Big squish, quick settling, minimal ringing.',
    values: {
      wallWobbleMaxDeform: 85,
      wallWobbleStiffness: 520,
      wallWobbleDamping: 82,
      wallWobbleSigma: 5.2,
      wallWobbleCornerClamp: 0.25,
      wallWobbleImpactThreshold: 55,
      wallWobbleSettlingSpeed: 94,
      wallWobbleMaxVel: 650,
      wallWobbleMaxImpulse: 180,
      wallWobbleMaxEnergyPerStep: 22000,
      wallInset: 3
    }
  },
  trampoline: {
    label: 'Trampoline (snappy)',
    description: 'High elasticity and low viscosity. Fast rebound with lively oscillation.',
    values: {
      wallWobbleMaxDeform: 60,
      wallWobbleStiffness: 2900,
      wallWobbleDamping: 14,
      wallWobbleSigma: 2.4,
      wallWobbleCornerClamp: 0.55,
      wallWobbleImpactThreshold: 95,
      wallWobbleSettlingSpeed: 35,
      wallWobbleMaxVel: 1200,
      wallWobbleMaxImpulse: 320,
      wallWobbleMaxEnergyPerStep: 30000,
      wallInset: 3
    }
  },
  jelly: {
    label: 'Jelly (slow wobble)',
    description: 'Soft and springy with slow, smooth undulation. More “gel sheet”.',
    values: {
      wallWobbleMaxDeform: 95,
      wallWobbleStiffness: 820,
      wallWobbleDamping: 16,
      wallWobbleSigma: 3.6,
      wallWobbleCornerClamp: 0.4,
      wallWobbleImpactThreshold: 75,
      wallWobbleSettlingSpeed: 28,
      wallWobbleMaxVel: 900,
      wallWobbleMaxImpulse: 260,
      wallWobbleMaxEnergyPerStep: 26000,
      wallInset: 3
    }
  },
  stiff: {
    label: 'Stiff (rigid-ish)',
    description: 'Small deformation with heavy damping: feels like thick industrial gasket.',
    values: {
      wallWobbleMaxDeform: 28,
      wallWobbleStiffness: 3200,
      wallWobbleDamping: 62,
      wallWobbleSigma: 1.7,
      wallWobbleCornerClamp: 0.8,
      wallWobbleImpactThreshold: 160,
      wallWobbleSettlingSpeed: 92,
      wallWobbleMaxVel: 700,
      wallWobbleMaxImpulse: 160,
      wallWobbleMaxEnergyPerStep: 20000,
      wallInset: 3
    }
  },
  steel: {
    label: 'Steel (almost solid)',
    description: 'Barely moves; impact gating high. Useful as a near-static control case.',
    values: {
      wallWobbleMaxDeform: 10,
      wallWobbleStiffness: 3600,
      wallWobbleDamping: 75,
      wallWobbleSigma: 1.2,
      wallWobbleCornerClamp: 0.9,
      wallWobbleImpactThreshold: 190,
      wallWobbleSettlingSpeed: 98,
      wallWobbleMaxVel: 500,
      wallWobbleMaxImpulse: 90,
      wallWobbleMaxEnergyPerStep: 16000,
      wallInset: 3
    }
  },
  latex: {
    label: 'Latex (tight snap)',
    description: 'Taut membrane: smaller blobs, higher tension, crisp rebounds.',
    values: {
      wallWobbleMaxDeform: 55,
      wallWobbleStiffness: 2600,
      wallWobbleDamping: 22,
      wallWobbleSigma: 1.8,
      wallWobbleCornerClamp: 0.7,
      wallWobbleImpactThreshold: 105,
      wallWobbleSettlingSpeed: 55,
      wallWobbleMaxVel: 1100,
      wallWobbleMaxImpulse: 300,
      wallWobbleMaxEnergyPerStep: 28000,
      wallInset: 3
    }
  },
  memoryFoam: {
    label: 'Memory Foam (slow sink)',
    description: 'Very soft with heavy damping: sinks in and slowly recovers.',
    values: {
      wallWobbleMaxDeform: 120,
      wallWobbleStiffness: 420,
      wallWobbleDamping: 88,
      wallWobbleSigma: 6.0,
      wallWobbleCornerClamp: 0.2,
      wallWobbleImpactThreshold: 45,
      wallWobbleSettlingSpeed: 96,
      wallWobbleMaxVel: 520,
      wallWobbleMaxImpulse: 150,
      wallWobbleMaxEnergyPerStep: 22000,
      wallInset: 3
    }
  },
  hydraulic: {
    label: 'Hydraulic (damped)',
    description: 'Medium squish with very high viscosity: controlled, “mechanical” response.',
    values: {
      wallWobbleMaxDeform: 70,
      wallWobbleStiffness: 1400,
      wallWobbleDamping: 78,
      wallWobbleSigma: 3.0,
      wallWobbleCornerClamp: 0.55,
      wallWobbleImpactThreshold: 85,
      wallWobbleSettlingSpeed: 90,
      wallWobbleMaxVel: 650,
      wallWobbleMaxImpulse: 200,
      wallWobbleMaxEnergyPerStep: 24000,
      wallInset: 3
    }
  },
  gelSheet: {
    label: 'Gel Sheet (wide ripples)',
    description: 'Wide, slow waves with moderate bounce. Feels like a gel panel.',
    values: {
      wallWobbleMaxDeform: 95,
      wallWobbleStiffness: 1000,
      wallWobbleDamping: 28,
      wallWobbleSigma: 4.8,
      wallWobbleCornerClamp: 0.35,
      wallWobbleImpactThreshold: 70,
      wallWobbleSettlingSpeed: 45,
      wallWobbleMaxVel: 900,
      wallWobbleMaxImpulse: 260,
      wallWobbleMaxEnergyPerStep: 26000,
      wallDeformPhysicsPrecision: 75,
      wallInset: 3
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODE PRESETS - Curated configurations for each simulation
// ═══════════════════════════════════════════════════════════════════════════════

// Parallax Linear (3D grid)
const PARALLAX_LINEAR_PRESETS = {
  default: {
    label: 'Default (Full View Grid)',
    parallaxLinearDotSizeMul: 1.8,
    sizeVariationParallaxLinear: 0,
    parallaxLinearGridX: 14,
    parallaxLinearGridY: 10,
    parallaxLinearGridZ: 7,
    parallaxLinearSpanX: 1.35,
    parallaxLinearSpanY: 1.35,
    parallaxLinearZNear: 50,
    parallaxLinearZFar: 900,
    parallaxLinearFocalLength: 420,
    parallaxLinearParallaxStrength: 260,
  },
  dense: {
    label: 'Dense (More Vertices)',
    parallaxLinearDotSizeMul: 1.6,
    sizeVariationParallaxLinear: 0.1,
    parallaxLinearGridX: 18,
    parallaxLinearGridY: 13,
    parallaxLinearGridZ: 9,
    parallaxLinearSpanX: 1.25,
    parallaxLinearSpanY: 1.25,
    parallaxLinearZNear: 45,
    parallaxLinearZFar: 1000,
    parallaxLinearFocalLength: 420,
    parallaxLinearParallaxStrength: 240
  },
  deep: {
    label: 'Deep Field (Stronger Depth)',
    parallaxLinearDotSizeMul: 1.7,
    sizeVariationParallaxLinear: 0.08,
    parallaxLinearGridX: 14,
    parallaxLinearGridY: 10,
    parallaxLinearGridZ: 10,
    parallaxLinearSpanX: 2.2,
    parallaxLinearSpanY: 2.2,
    parallaxLinearZNear: 30,
    parallaxLinearZFar: 1500,
    parallaxLinearFocalLength: 520,
    parallaxLinearParallaxStrength: 320
  },
  calm: {
    label: 'Calm (Slow Camera)',
    parallaxLinearDotSizeMul: 1.8,
    sizeVariationParallaxLinear: 0.05,
    parallaxLinearGridX: 12,
    parallaxLinearGridY: 9,
    parallaxLinearGridZ: 6,
    parallaxLinearSpanX: 2.0,
    parallaxLinearSpanY: 2.0,
    parallaxLinearZNear: 60,
    parallaxLinearZFar: 900,
    parallaxLinearFocalLength: 420,
    parallaxLinearParallaxStrength: 160
  },
  minimal: {
    label: 'Minimal (Big Dots)',
    parallaxLinearDotSizeMul: 2.4,
    sizeVariationParallaxLinear: 0.15,
    parallaxLinearGridX: 10,
    parallaxLinearGridY: 7,
    parallaxLinearGridZ: 4,
    parallaxLinearSpanX: 2.6,
    parallaxLinearSpanY: 2.6,
    parallaxLinearZNear: 70,
    parallaxLinearZFar: 800,
    parallaxLinearFocalLength: 380,
    parallaxLinearParallaxStrength: 220
  }
};
// with configurable orbital rings, rotation, and tumble via control panel

// Token helpers: read resolved CSS custom properties with safe fallbacks.

function getTokenSnapshot() {
  try {
    if (typeof window === 'undefined') return null;
    const snapshot = window.__TOKENS__;
    if (!snapshot || typeof snapshot !== 'object') return null;
    return snapshot;
  } catch (e) {
    return null;
  }
}

function readComputedVar(name) {
  try {
    if (typeof document === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  } catch (e) {
    return '';
  }
}

function resolveWithSnapshot(value, snapshot) {
  const src = String(value || '');
  if (!src.includes('var(')) return src.trim();
  if (!snapshot) return src.trim();
  const varRegex = /var\((--[a-z0-9-_]+)(?:\s*,\s*([^)]+))?\)/gi;
  let out = src;
  let guard = 0;
  while (out.includes('var(') && guard < 8) {
    out = out.replace(varRegex, (_match, name, fallback) => {
      const resolved = snapshot.resolved?.[name] ?? snapshot.cssVars?.[name];
      if (resolved !== undefined && resolved !== null) return String(resolved).trim();
      if (fallback) return String(fallback).trim();
      return '';
    });
    guard += 1;
  }
  return out.trim();
}

function readTokenVar(name, fallback = '') {
  const varName = String(name).startsWith('--') ? name : `--${name}`;
  const snapshot = getTokenSnapshot();
  const computed = readComputedVar(varName);

  if (computed && !computed.includes('var(')) return computed;

  if (snapshot) {
    const direct = snapshot.resolved?.[varName] ?? snapshot.cssVars?.[varName];
    const resolved = resolveWithSnapshot(direct ?? computed, snapshot);
    if (resolved && !resolved.includes('var(')) return resolved;
  }

  if (computed && !computed.includes('var(')) return computed;
  return fallback;
}

function readTokenNumber(name, fallback) {
  const value = readTokenVar(name, '');
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function readTokenPx(name, fallback) {
  const value = readTokenVar(name, '');
  if (!value) return fallback;
  const n = parseFloat(String(value).replace(/px$/i, ''));
  return Number.isFinite(n) ? n : fallback;
}

function readTokenMs(name, fallback) {
  const value = readTokenVar(name, '');
  if (!value) return fallback;
  const raw = String(value).trim().toLowerCase();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  if (raw.endsWith('ms')) return n;
  if (raw.endsWith('s')) return n * 1000;
  return n;
}

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

function getEffectiveDPR() {
  return _effectiveDPR;
}

const state = {
  config: {},
  // Default boot mode (overridden by main.js on init, but kept consistent here too).
  currentMode: MODES.CRITTERS,
  // Mode-switch warmup: engine consumes this before first render after init.
  // Units: render frames at 60fps (each warmup frame advances ~1/60s via physics steps).
  warmupFramesRemaining: 0,
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

  // Global "material world" defaults (snooker-ish balls + thick boundary)
  REST: 0.31,
  FRICTION: 0.011,
  ballMassKg: 240,
  MASS_BASELINE_KG: 240,
  MASS_REST_EXP: 0.15,
  MASS_GRAVITY_EXP: 0.35,
  
  // Device - now a getter that returns the adaptive DPR
  get DPR() { return _effectiveDPR; },
  
  // Size
  sizeScale: 1.2,
  // Global sizing variation system:
  // - Per-mode sliders (0..1): how much this mode varies sizes
  // - Global multiplier (0..2): scales all per-mode variations (default 1 = neutral)
  // - Internal cap: max fractional deviation from medium radius when per-mode=1 and globalMul=1
  sizeVariationGlobalMul: 1.0,
  sizeVariationCap: 0.12,
  // Per-mode variation (0..1)
  sizeVariationPit: 0,
  sizeVariationFlies: 0,
  sizeVariationWeightless: 0,
  sizeVariationWater: 0,
  sizeVariationVortex: 0.2,
  sizeVariationPingPong: 0,
  sizeVariationMagnetic: 0,
  sizeVariationBubbles: 0.2,
  sizeVariationKaleidoscope: 0,
  sizeVariationCritters: 0.2,
  sizeVariationNeural: 0.05,
  sizeVariationParallaxLinear: 0,
  
  // Warmup (per simulation) — how many "startup frames" to pre-run before first render.
  // Default 10 for all modes (quick settle; avoids visible pop-in while testing).
  pitWarmupFrames: 10,
  fliesWarmupFrames: 10,
  weightlessWarmupFrames: 10,
  waterWarmupFrames: 10,
  vortexWarmupFrames: 10,
  pingPongWarmupFrames: 10,
  magneticWarmupFrames: 10,
  bubblesWarmupFrames: 10,
  kaleidoscope3WarmupFrames: 10,
  crittersWarmupFrames: 10,
  neuralWarmupFrames: 10,
  parallaxLinearWarmupFrames: 10,
  // 3D Sphere (Mode 16)
  sphere3dRadiusVw: 18,
  sphere3dDensity: 140,
  sphere3dFocalLength: 600,
  sphere3dDotSizeMul: 1.5,
  sphere3dIdleSpeed: 0.15,
  sphere3dCursorInfluence: 1.2,
  sphere3dTumbleSpeed: 2.5,
  sphere3dTumbleDamping: 0.94,
  sphere3dWarmupFrames: 10,
  // 3D Cube (Mode 17)
  cube3dSizeVw: 50,
  cube3dEdgeDensity: 8,
  cube3dFaceGrid: 0,
  cube3dIdleSpeed: 0.2,
  cube3dCursorInfluence: 1.5,
  cube3dTumbleSpeed: 3,
  cube3dTumbleDamping: 0.95,
  cube3dFocalLength: 500,
  cube3dDotSizeMul: 1.5,
  cube3dWarmupFrames: 10,
  // 3D Starfield (Mode 23)
  starfieldCount: 200,
  starfieldSpanX: 1.5,
  starfieldSpanY: 1.2,
  starfieldZNear: 100,
  starfieldZFar: 2000,
  starfieldFocalLength: 500,
  starfieldParallaxStrength: 320,
  starfieldSpeed: 400,
  starfieldDotSizeMul: 1.0,
  starfieldIdleJitter: 0,
  starfieldFadeDuration: 0.5,
  starfield3dWarmupFrames: 10,
  // Legacy (pre per-mode system) — kept for back-compat; prefer the per-mode keys above.
  sizeVariation: 0,
  // Fixed ball sizes in pixels
  ballSizeDesktop: 18,        // Ball radius in px for desktop
  ballSizeMobile: 8.64,        // Ball radius in px for mobile
  isMobile: false,            // Mobile *device* detected? (UA/touch heuristic)
  isMobileViewport: false,    // Mobile viewport detected? (width breakpoint)
  // Mobile performance: completely disable wall deformation on mobile for 60 FPS
  // Set during initialization based on isMobile/isMobileViewport
  wallDeformationEnabled: true,
  // Mobile performance: global multiplier applied to object counts (0..1).
  // 1.0 = no reduction, 0.0 = (effectively) no objects.
  mobileObjectReductionFactor: 0.5,
  // Only reduce object counts on mobile when counts exceed this threshold.
  mobileObjectReductionThreshold: 200,
  // Lite mode: global multiplier applied to object counts (0..1).
  // Toggleable at runtime for a low-cost simulation profile.
  liteModeEnabled: false,
  liteModeObjectReductionFactor: 0.6,
  // Ball sizes (set by updateBallSizes based on device)
  R_MED: 18,
  R_MIN: 18,
  R_MAX: 18,
  
  // Custom cursor
  cursorSize: 1.0,  // Multiplier for cursor size (1.0 = average ball size)
  
  // Cursor color (dot + trail)
  // - `cursorColorMode`: 'auto' picks a new contrasty palette color on startup/mode/reset.
  // - `cursorColorIndex`: palette index 0..7 (used when manual; also the current selection in auto).
  // - `cursorColorHex`: resolved hex string stamped into CSS (--cursor-color) and used by the trail.
  cursorColorMode: 'auto',
  cursorColorIndex: 5,
  cursorColorHex: '#ff4013',
  // Relative luminance threshold (0..1). Higher = more permissive, lower = more contrasty.
  // Cursor must never be white / light greys; we filter aggressively by default.
  cursorColorLumaMax: 0.62,
  // Optional override lists (0..7). If allowlist is set, we only choose from it.
  cursorColorAllowIndices: [],
  cursorColorDenyIndices: [],

  // Mouse trail (canvas-rendered)
  mouseTrailEnabled: true,
  mouseTrailLength: 18,     // number of samples to keep
  mouseTrailSize: 1.3,      // CSS px (scaled by DPR at draw time)
  mouseTrailFadeMs: 220,    // lifetime of a sample
  mouseTrailOpacity: 0.35,  // 0..1
  
  // Cursor explosion (particle dispersion on button hover)
  cursorExplosionEnabled: true,
  cursorExplosionParticleCount: 6,       // Base count (scales with velocity)
  cursorExplosionSpeed: 180,             // Base speed (scales with impact)
  cursorExplosionSpreadDeg: 360,
  cursorExplosionLifetime: 0.5,          // Base lifetime (scales with velocity)
  cursorExplosionFadeStartRatio: 0.4,    // Fade threshold
  cursorExplosionDrag: 0.88,             // Velocity decay
  cursorExplosionShrinkEnabled: true,
  
  // Impact scaling (how mouse velocity affects explosion)
  cursorExplosionImpactMinFactor: 0.5,   // Minimum impact multiplier (slow hover)
  cursorExplosionImpactMaxFactor: 4.0,   // Maximum impact multiplier (fast impact)
  cursorExplosionImpactSensitivity: 400, // Velocity sensitivity (higher = less sensitive)
  cursorExplosionLifetimeImpactMin: 0.7, // Min lifetime multiplier for slow
  cursorExplosionLifetimeImpactMax: 1.8, // Max lifetime multiplier for fast
  cursorExplosionLifetimeImpactSensitivity: 600, // Lifetime velocity sensitivity
  
  // Ball properties
  ballSoftness: 20,
  ballSpacing: 0.08,    // Extra collision padding as ratio of ball radius (0.1 = 10% of ball size)

  // Sleep tuning (Ball Pit modes only)
  // Higher thresholds = balls settle/sleep sooner (less idle jiggle).
  sleepVelocityThreshold: 12.0, // px/s
  sleepAngularThreshold: 0.18,  // rad/s
  timeToSleep: 0.25,            // seconds

  // ─────────────────────────────────────────────────────────────────────────────
  // Physics Performance (Global)
  // These controls are intended to apply across physics-based modes.
  // Defaults are conservative and should preserve the current feel.
  // ─────────────────────────────────────────────────────────────────────────────
  physicsCollisionIterations: 10,        // solver iterations for ball-ball collisions
  physicsSkipSleepingCollisions: true,   // skip non-positional work for sleeping pairs
  physicsSleepThreshold: 12.0,           // px/s (global sleep threshold for non-pit modes)
  physicsSleepTime: 0.25,                // seconds (global sleep delay for non-pit modes)
  physicsSkipSleepingSteps: true,        // skip Ball.step() work when sleeping
  physicsSpatialGridOptimization: true,  // reuse spatial grid storage to reduce allocations

  // Wall performance tuning (visual-only wobble system)
  wallPhysicsSamples: 48,        // sample count for wall wobble physics (visual-only)
  wallPhysicsSkipInactive: true, // skip wall wobble integration when inactive
  wallPhysicsUpdateHz: 30,       // Tier 1: Physics update frequency (10-60 Hz, default 30)
  wallPhysicsMaxSubstepHz: 60,   // Stability: substep integration to avoid large dt
  wallPhysicsInterpolation: true, // Tier 1: Smooth interpolation between physics updates
  wallPhysicsAdaptiveSamples: true, // Tier 2: Dynamically reduce samples when inactive
  wallPhysicsMinSamples: 24,     // Tier 2: Minimum samples when inactive (8-48)
  wallVisualDeformMul: 1.0,      // Debug/visual: multiply wall deformation (1 = normal)
  wallRenderDecimation: 2,       // render every Nth sample (1=full, 2=half, 4=quarter, 12≈8-sided)

  // Wall color: removed - use frameColor as single master (all wall colors point to frameColor)
  // wallColorLight and wallColorDark are deprecated - frameColor is the single source of truth

  // Critters (Simulation 11) — ball-only “little creatures”
  critterCount: 90,
  critterSpeed: 680,          // thrust scale (px/s-ish)
  critterMaxSpeed: 1400,      // clamp
  critterStepHz: 5.0,         // step cadence
  critterStepSharpness: 2.4,  // higher = more staccato steps
  critterTurnNoise: 2.2,      // wander
  critterTurnDamp: 10.0,      // turning inertia damping
  critterTurnSeek: 10.0,      // steering toward desired heading
  critterAvoidRadius: 90,     // px (tighter packs; separation is now mostly near-field)
  critterAvoidForce: 9500,    // separation acceleration
  critterEdgeAvoid: 1.0,      // edge repulsion strength
  critterMousePull: 1.0,      // attraction strength inside mouse zone
  critterMouseRadiusVw: 30,   // zone radius (vw)
  critterRestitution: 0.18,   // collision “bounciness” override while mode active
  critterFriction: 0.018,     // drag override while mode active
  
  // Corner (matches CSS border-radius for collision bounds)
  cornerRadius: 42,

  // ─────────────────────────────────────────────────────────────────────────────
  // Layout: vw-native controls (derived to px on demand)
  //
  // Goal: keep UI + config in viewport-relative units, while keeping hot paths
  // (physics + layout reads) in pixels with zero per-frame conversion.
  //
  // - `layoutViewportWidthPx`: if > 0, we treat this as the viewport width used
  //   for vw→px conversion (debug “virtual viewport width”).
  // - When 0, we use `window.innerWidth`.
  // ─────────────────────────────────────────────────────────────────────────────
  layoutViewportWidthPx: 0,

  // Canonical layout knobs (vw units)
  containerBorderVw: 0,     // outer inset from viewport (vw)
  simulationPaddingVw: 0,   // inner inset around canvas (vw)
  // Additive content padding as a fraction of the viewport-size metric:
  //   viewportSizePx = sqrt(viewportWidthPx * viewportHeightPx)
  //   contentPaddingAddPx = viewportSizePx * contentPaddingRatio
  // (Back-compat: if config provides a large value (|v| > 1), we treat it as legacy px.)
  contentPaddingRatio: 0.03,
  contentPaddingHorizontalRatio: 1.0, // horizontal padding = base × ratio (>1 = wider sides)
  contentPaddingBottomRatio: 1.3,     // bottom padding multiplier (applied to vertical padding)
  mobileWallThicknessXFactor: 1.4,    // wall thickness multiplier for LEFT/RIGHT on mobile (1.0 = same as desktop)
  desktopWallThicknessFactor: 1.0,    // wall thickness multiplier for TOP/BOTTOM on desktop (1.0 = base)
  mobileEdgeLabelsVisible: true,     // whether to show edge labels on mobile (default: visible)
  wallRadiusVw: 0,          // corner radius (vw) (also drives physics corner collision)
  wallThicknessVw: 0,       // wall tube thickness (vw)
  wallThicknessAreaMultiplier: 1.0,  // multiplier for area-based wall thickness scaling (1.0 = no area scaling)

  // Procedural noise (no GIF): texture + cinematic controls
  noiseEnabled: true,
  noiseSeed: 1337,
  noiseTextureSize: 256,
  noiseDistribution: 'gaussian', // 'uniform' | 'gaussian'
  noiseMonochrome: false, // Allow multicolored grain by default
  noiseChroma: 0.9, // 0..1 (color intensity when not monochrome)
  noiseMotion: 'jitter', // 'jitter' | 'drift' | 'static'
  noiseMotionAmount: 1.2, // Increased for more alive movement
  noiseSpeedMs: 1100, // Single speed for unified layer
  noiseSpeedVariance: 0.3, // 0..1, timing variance (0 = no variance, 1 = max variance)
  noiseFlicker: 0.08, // Lighter flicker
  noiseFlickerSpeedMs: 180, // Faster flicker for more alive feel
  noiseBlurPx: 0,
  noiseContrast: 1.2, // Slightly reduced for lighter look
  noiseBrightness: 1.15, // Increased brightness for lighter look
  noiseSaturation: 1.0,
  noiseHue: 0,
  // Single layer controls
  noiseSize: 85, // Grain size (px)
  noiseOpacity: 0.08, // Overall opacity (0-1)
  noiseOpacityLight: 0.08, // Opacity for light mode
  noiseOpacityDark: 0.12, // Opacity for dark mode
  noiseBlendMode: 'normal', // CSS mix-blend-mode (normal = off by default)
  // Color controls (separate for light/dark)
  noiseColorLight: '#ffffff', // Grain color for light mode (hex)
  noiseColorDark: '#ffffff', // Grain color for dark mode (hex)
  detailNoiseOpacity: 1, // Overall opacity multiplier for detail page noise (0-1)

  // Minimum clamp targets (px)
  // These define the “clamp down towards” values on small viewports, where vw-derived
  // padding/radius can become too tight. Kept here so:
  // - The clamp logic uses the same source of truth
  // - The control panel can display the effective minimums
  layoutMinWallRadiusPx: 28,
  
  // Wall collision inset (px). Helps prevent visual overlap with the wall edge.
  // This is distinct from radius: it shrinks the effective collision bounds uniformly.
  wallInset: 3,

  // Vortex mode params (electron orbital effect)
  vortexSwirlStrength: 450,
  vortexBallCount: 90,
  vortexSpeedMultiplier: 2.6,
  vortexRadius: 100, // Preferred orbital radius (0 = auto-scale)
  vortexRotationDirection: 1, // 1 = counterclockwise, -1 = clockwise
  vortexDepthVariation: 0.95, // How much size changes with z-depth (0-1)
  vortexSpiralTightness: 0.15, // How tightly balls spiral in 3D (0-1)
  
  
  // Magnetic mode params (updated defaults)
  magneticBallCount: 180,
  magneticStrength: 65000,
  magneticMaxVelocity: 2800,
  magneticRadius: 0, // 0 = unlimited, otherwise max distance in px
  magneticExplosionInterval: 5,
  
  // Bubbles mode params
  bubblesSpawnRate: 16,
  bubblesRiseSpeed: 650,
  bubblesWobble: 65,
  bubblesMaxCount: 200,
  // Derived (px): set in `applyLayoutFromVwToPx()` from `cursorInfluenceRadiusVw`.
  bubblesDeflectRadius: 0,
  
  
  // Ping Pong mode params (left-right bounce, cursor obstacle)
  pingPongBallCount: 35,
  pingPongSpeed: 400,
  // Derived (px): set in `applyLayoutFromVwToPx()` from `cursorInfluenceRadiusVw`.
  pingPongCursorRadius: 0,
  
  // Colors
  // Palette chapters ("colour schemes") — see `source/modules/visual/colors.js`
  // Keep these aligned with the Industrial Teal base palette so:
  // - CSS fallback matches JS-driven palette chapters
  // - early paints (before JS applies templates) look correct
  currentColors: ['#b5b7b6', '#bbbdbd', '#ffffff', '#00695c', '#000000', '#ff4013', '#0d5cb6', '#ffa000'],
  currentTemplate: 'industrialTeal',
  // If true, rotate to the next palette chapter on each reload.
  // If false, respect `currentTemplate` from runtime config.
  paletteRotateOnReload: false,
  // Color Distribution (labels ↔ palette indices ↔ weights)
  // Used by `pickRandomColor()` for ALL modes.
  // NOTE: 7 disciplines choose 7 distinct palette indices (0..7). One palette color may remain unused.
  colorDistribution: [
    { label: 'Product & Systems', colorIndex: 0, weight: 30 },
    { label: 'Interaction & Motion', colorIndex: 4, weight: 18 },
    { label: 'Creative Technology', colorIndex: 3, weight: 15 },
    { label: 'AI-Driven Design', colorIndex: 2, weight: 12 },
    { label: 'Experience Direction', colorIndex: 5, weight: 10 },
    { label: 'Art & Visual Direction', colorIndex: 6, weight: 10 },
    { label: 'Prototyping', colorIndex: 7, weight: 5 }
  ],
  
  // Flies mode
  fliesBallCount: 60,
  attractionPower: 5000,
  orbitRadius: 180,
  swarmSpeed: 0.4,
  fliesSeparation: 15000,
  
  // Weightless mode
  weightlessCount: 66, // Triangle with 11 rows = 66 balls
  weightlessInitialSpeed: 250,
  weightlessBounce: 0.70,
  weightlessRepelRadius: 220,
  weightlessRepelPower: 50000,
  
  // DVD Logo mode params
  dvdLogoSpeed: 200, // px/s
  dvdLogoSize: 0.7, // scale multiplier
  dvdLogoBallCount: 60, // total balls for letters
  dvdLogoBallSpacing: 1.5, // spacing multiplier between balls
  dvdLogoLetterSpacing: 1.5, // spacing multiplier between letters
  dvdLogoMassMultiplier: 2.0,
  dvdLogoWarmupFrames: 10,

  // Elastic Center mode params
  elasticCenterBallCount: 93,
  elasticCenterMassMultiplier: 2.0,
  elasticCenterSpacingMultiplier: 2.8, // multiplier for spacing between balls (higher = larger gaps)
  elasticCenterElasticStrength: 2000, // px/s² - force pulling dots back to center (lower = circle moves more)
  elasticCenterMouseRepelStrength: 12000, // px/s² - force pushing dots away from mouse
  elasticCenterMouseRadius: 200, // px - distance where mouse affects dots
  elasticCenterDamping: 0.94, // velocity damping for stability
  elasticCenterWarmupFrames: 10,
  
  // Snake mode (classic snake game behavior - head moves continuously, body follows path)
  snakeBallCount: 95,
  snakeRestLength: 29, // Distance between connected balls (px) - tight for snake trail
  snakeSpringStrength: 238, // Spring force strength - gentle to keep snake together without wiggling
  snakeDamping: 0.92, // Velocity damping - high damping for high-friction ground
  snakeGroundFriction: 1.90, // Additional ground friction - simulates high-friction surface
  snakeSpeed: 400, // Constant speed for snake head movement (px/s) - classic snake game behavior
  snakeWarmupFrames: 10,
  
  // Particle Fountain mode (water-like behavior)
  particleFountainEmissionRate: 29, // particles per second
  particleFountainInitialVelocity: 4700, // px/s - initial upward velocity
  particleFountainSpreadAngle: 20, // degrees - how wide the fountain spreads
  particleFountainWaterDrag: 0.02, // water-like drag (lower for natural water droplets with less air resistance)
  particleFountainGravityMultiplier: 1.7, // gravity multiplier (particles fall after rising)
  particleFountainUpwardForce: 300, // optional upward force in px/s², 0 = disabled
  particleFountainMaxParticles: 230, // maximum active particles
  particleFountainLifetime: 8.0, // seconds - how long particles live before fading out
  particleFountainWarmupFrames: 120, // skip ahead ~2s on load for instant flow
  particleFountainMouseRepelStrength: 50000, // px/s² - very strong force for barrier effect (like hand over fountain)
  particleFountainMouseRepelRadiusVw: 5.0, // vw - radius of mouse repulsion (viewport width)
  // Derived (px): set in `applyLayoutFromVwToPx()` from `particleFountainMouseRepelRadiusVw`
  particleFountainMouseRepelRadius: 0,
  
  weightlessRepelSoft: 5.4,
  
  // Kaleidoscope mode (mouse-driven mirrored wedges) - using KALEIDOSCOPE_3 parameters
  kaleidoscopeMirror: 1,
  // Normalized idle drift (0..0.05). Subtle movement when idle.
  kaleidoscopeIdleDrift: 0.012,
  // Kaleidoscope III parameters (now the only kaleidoscope mode)
  kaleidoscope3BallCount: 150,
  kaleidoscope3Wedges: 10,
  kaleidoscope3WedgesMobile: 6,  // Reduced wedges on mobile for performance (50% fewer draw calls)
  kaleidoscope3Speed: 1.2,
  kaleidoscope3DotSizeVh: 1.05,
  kaleidoscope3DotAreaMul: 0.75,
  kaleidoscope3SpawnAreaMul: 1.05,
  kaleidoscope3SizeVariance: 0.5,
  kaleidoscope3WarmupFrames: 65,

  // Neural mode (emergent "synapses")
  neuralBallCount: 311,
  neuralLinkDistanceVw: 5.0,
  neuralLineOpacity: 0.06,
  neuralConnectorDensity: 3,
  neuralWanderStrength: 1000,
  neuralMouseStrength: 150000,
  neuralSeparationRadius: 100,
  neuralSeparationStrength: 11000,
  neuralMaxLinksPerBall: 6,
  neuralDamping: 0.900,

  // Parallax modes (mouse-driven depth parallax)
  // NOTE: Older parallax parameters are kept for compatibility with older presets/UI,
  // but the current Parallax implementations use the 3D grid keys below.
  parallaxLinearDotCount: 95,
  parallaxLinearRowPattern: 'thirds',
  parallaxLinearSpacingPattern: 'even',
  parallaxLinearFarPct: 0.42,
  parallaxLinearMidPct: 0.32,
  parallaxLinearFarSpeed: 0.15,
  parallaxLinearMidSpeed: 0.5,
  parallaxLinearNearSpeed: 1.0,
  parallaxLinearFollowStrength: 16.0,
  parallaxLinearDamping: 12.0,
  // Parallax (3D grid) — fills the viewport and responds to mouse like a camera pan.
  // These are the canonical knobs for the rebuilt Parallax simulations.
  parallaxLinearGridX: 14,
  parallaxLinearGridY: 10,
  parallaxLinearGridZ: 7,
  // Grid span in viewport units (multipliers applied to canvas width/height).
  // 1.0 ≈ edge-to-edge in the grid's *world* space; use >1 to counter perspective shrink.
  parallaxLinearSpanX: 5.0,
  parallaxLinearSpanY: 2.6,
  parallaxLinearZNear: 50,
  parallaxLinearZFar: 900,
  parallaxLinearFocalLength: 420,
  parallaxLinearParallaxStrength: 260,
  parallaxLinearDotSizeMul: 1.8,
  
  // Water mode
  waterBallCount: 300,
  waterDrag: 0.015,
  waterRippleSpeed: 300,
  waterRippleStrength: 18000,
  waterDriftStrength: 40,
  waterInitialVelocity: 200,
  
  // Vortex mode
  vortexDrag: 0.005,
  
  // Ping Pong mode
  pingPongVerticalDamp: 0.911,
  
  // Magnetic mode
  magneticDamping: 0.998,
  
  // Repeller
  repelRadius: 120,
  repelPower: 274000,
  repelSoft: 3.4,
  repellerEnabled: false,

  // Universal cursor influence (vw-based, derived to px on layout updates)
  // Goal: one radius that scales with viewport width so mobile/touch interaction
  // feels “near the finger” instead of using desktop-fixed pixel distances.
  cursorInfluenceRadiusVw: 14,          // 14vw ≈ 140px at 1000px viewport
  cursorInfluenceRadiusPx: 140,         // derived (px)
  
  // Emitter
  emitterTimer: 0,
  
  // Dark mode
  autoDarkModeEnabled: true,
  isDarkMode: false,

  // Browser ↔ Wall harmony (when browsers ignore theme-color on desktop)
  // - 'auto': only adapt on browsers where theme-color is typically ignored
  // - 'site': always keep site wall (benchmark / Safari look)
  // - 'browser': always adapt wall to browser UI palette (artful extension)
  // Default should preserve the benchmark look (no forced wall adaptation).
  chromeHarmonyMode: 'site',
  // Night window heuristic (local clock): if enabled and theme is Auto, prefer Dark during this window.
  // Default: 18:00–06:00 (privacy-first; no geolocation).
  autoDarkNightStartHour: 18,
  autoDarkNightEndHour: 6,
  
  // Click-to-cycle mode switching
  clickCycleEnabled: true,

  // ─────────────────────────────────────────────────────────────────────────────
  // Scene micro-interaction (mode change “click-in”)
  // These are visual-only and applied via CSS vars + `scene-impact-react.js`.
  // ─────────────────────────────────────────────────────────────────────────────
  sceneImpactEnabled: true,
  sceneImpactMul: 0.005,        // scale depth per unit impact (tuned down for more stillness)
  // Mobile-only multiplier applied on top of sceneImpactMul.
  // Allows “more depth” on small screens without re-tuning desktop.
  sceneImpactMobileMulFactor: 1.0,
  // Logo counter-scale gain (multiplies the compensation so the logo stays "anchored")
  sceneImpactLogoCompMul: 1.8,
  sceneImpactOvershoot: 0.22,   // release overshoot amount (unitless)
  sceneImpactAnticipation: 0.0, // micro pre-pop opposite direction; 0 disables
  sceneImpactPressMs: 0,        // ms (press-in duration)
  sceneImpactReleaseMs: 620,    // ms (bounce-out duration)

  // Scene change SFX (plays only when sound is enabled/unlocked)
  sceneChangeSoundEnabled: true,
  sceneChangeSoundIntensity: 0.35, // 0..1 (maps to volume/brightness)
  sceneChangeSoundRadius: 18,      // pseudo “ball size” driving pitch

  // Legacy (logo-only micro interaction) — kept for config/panel back-compat; no longer used.
  brandLogoImpactMul: 0.014,
  brandLogoSquashMul: 1.0,
  brandLogoOvershoot: 0.22,
  brandLogoAnticipation: 0.0,
  brandLogoTiltDeg: 0.0,
  brandLogoSkewDeg: 0.0,
  brandLogoPressMs: 75,
  brandLogoHoldMs: 55,
  brandLogoReleaseMs: 220,
  
  // Two-level padding system (in pixels)
  containerBorder: 20,   // Outer Y: insets container top/bottom from viewport
  containerBorderX: 20,  // Outer X: insets container left/right (mobile factor applied)
  simulationPadding: 0,  // Inner: padding inside container around canvas

  // Text wrapper padding (in pixels) for UI text blocks (legend, top-right statement)
  // Content padding is a ratio of wall thickness
  contentPadding: 40,    // Space between frame edge and content elements (base = wallThickness × ratio)
  contentPaddingX: 40,   // Horizontal padding (derived: base × horizontalRatio)
  contentPaddingY: 40,   // Vertical padding (always = base)

  // Container inner shadow removed
  
  // Unified Color System (backgrounds, frame, walls)
  bgLight: '#f5f5f5',       // Light mode background color
  bgDark: '#0a0a0a',        // Dark mode background color
  frameColor: '#242529',    // Frame color (legacy - use frameColorLight/frameColorDark)
  frameColorLight: '#242529',  // Frame/wall color in light mode (browser chrome + walls + border)
  frameColorDark: '#242529',   // Frame/wall color in dark mode (browser chrome + walls + border)
  
  // Text Colors
  textColorLight: '#161616',          // Primary text (light mode)
  textColorLightMuted: '#2f2f2f',     // Secondary/muted text (light mode)
  textColorDark: '#7a8fa3',  // Primary text (dark mode) — harmonized blue-gray to match dark blue/green background
  textColorDarkMuted: '#9db0c4', // Secondary/muted text (dark mode) — harmonized light blue-gray
  // Edge labels now derive from `--text-muted` in CSS (not independently tunable).
  edgeLabelInsetAdjustPx: 0,
  
  // Link Colors
  linkHoverColor: '#ff4013',          // Link hover accent (shared)

  // Logo colors now derive from `--text-primary` in CSS (same for index + portfolio).
  // Logo sizing + index main link placement (CSS vars)
  topLogoWidthVw: 35,                 // Sets `--top-logo-width-vw` (clamped by CSS min/max tokens)
  homeMainLinksBelowLogoPx: 40,       // Sets `--home-main-links-below-logo-px` (index only)
  footerNavBarTopVh: 50,              // Sets `--footer-nav-bar-top-*` (viewport units)
  footerNavBarGapVw: 2.5,             // Sets `--footer-nav-bar-gap` (viewport units)
  wallThickness: 12,        // Unified: wall tubes + body border (px)
  wallRadius: 42,           // Corner radius - shared by all rounded elements (px)
  wallInset: 3,             // Physics-only inset from edges (px at DPR 1)

  // Rubber wall wobble tuning (visual-only deformation, no collision changes)
  // High-level controls (0-100)
  wallPreset: 'pudding',            // Preset name: rubber, pudding, trampoline, jelly, stiff
  wallSoftness: 50,                 // Legacy support / manual tweak
  wallBounciness: 50,               // Legacy support / manual tweak
  
  // Low-level parameters (derived from above or set manually)
  // Pudding baseline: broad, overdamped blobs (soft boundary, minimal “rubber band” ripple)
  wallWobbleMaxDeform: 70,          // Max inward deformation (px at DPR 1)
  wallWobbleStiffness: 420,         // Spring stiffness (lower = softer)
  wallWobbleDamping: 92,            // Damping (higher = more viscous)
  wallWobbleSigma: 5.5,             // Impact spread (higher = larger blobs)
  wallWobbleCornerClamp: 0.25,      // Corner grip (lower = more flow around corners)
  wallWobbleMaxVel: 620,            // Clamp: max wall deformation velocity (prevents erratic spikes)
  wallWobbleMaxImpulse: 160,        // Clamp: max per-sample impulse injection (prevents runaway)
  wallWobbleMaxEnergyPerStep: 20000, // Clamp: total impact energy budget per physics tick
  
  // Settling parameters (Advanced)
  wallWobbleImpactThreshold: 60,    // Min velocity (px/s) to trigger wobble
  wallWobbleSettlingSpeed: 94,      // Controls snap-to-zero aggression (0-100)
  
  // Gate overlay (blur backdrop for dialogs)
  modalOverlayEnabled: true,         // Enable/disable overlay
  modalOverlayOpacity: 0.01,          // White wash opacity (0-1)
  modalOverlayBlurPx: 8,             // Backdrop blur amount (px)
  modalOverlayTransitionMs: 800,     // Blur-in transition duration (ms)
  modalOverlayTransitionOutMs: 600,  // Blur-out transition duration (ms)
  modalOverlayContentDelayMs: 200,   // Delay before dialog content appears (ms)
  modalDepthScale: 0.96,             // Scene scale when gate is open (0.9-1.0)
  modalDepthTranslateY: 8,           // Scene Y translation when gate is open (px)
  logoBlurInactive: 0,               // Logo blur when gate is closed (px)
  logoBlurActive: 12,                // Logo blur when gate is active (px)
  
  // Entrance Animation (browser default → wall-state)
  entranceEnabled: true,            // Enable dramatic entrance animation
  entranceWallTransitionDelay: 300,  // Delay before wall-state transition starts (ms)
  entranceWallTransitionDuration: 800, // Wall growth animation duration (ms)
  entranceWallInitialScale: 1.1,    // Initial scale (wall starts slightly larger, scales down to 1.0)
  entranceWallEasing: 'cubic-bezier(0.16, 1, 0.3, 1)', // Easing for wall growth (organic ease-out)
  entranceElementDuration: 800,     // Individual element fade duration (ms)
  entranceElementScaleStart: 0.95,  // Initial scale for elements (0-1)
  entranceElementTranslateZStart: -20, // Initial z-axis position (px, negative = back)
  contentFadeInDelay: 500,          // Delay before content fade-in starts (ms)
  contentFadeInDuration: 1000,       // Duration of content fade-in animation (ms)
  entranceElementEasing: 'cubic-bezier(0.16, 1, 0.3, 1)', // Easing function for element animations
  entranceLateElementDuration: 600, // Duration for late elements (logo + links) animation (ms)
  entranceLateElementStagger: 250,  // Stagger delay between late elements (ms)
  entranceLateElementScaleFrom: 0.92, // Starting scale for late elements (logo + links)
  entrancePerspectiveLandscape: 1200, // Perspective for landscape aspect ratio (px)
  entrancePerspectiveSquare: 1000,   // Perspective for square aspect ratio (px)
  entrancePerspectivePortrait: 800,  // Perspective for portrait aspect ratio (px)
  
  // Link Controls (Panel Tunable)
  uiHitAreaMul: 1,                    // Multiplier for most UI hit areas (links/buttons); drives `--ui-hit-area-mul`
  uiIconCornerRadiusMul: 0.5,         // Icon button corner radius as a fraction of wall radius; drives `--ui-icon-corner-radius-mul` (directly tracks wall)
  uiIconFramePx: 0,                  // Icon button square frame size (px). 0 = use token-derived default
  uiIconGlyphPx: 0,                  // Icon glyph size (px). 0 = use token-derived default
  uiIconGroupMarginPx: 0,            // Social icon group margin (px). Can be negative to push icons outward.
  linkTextPadding: 30,               // Padding for text links (px)
  linkIconPadding: 24,               // Padding for icon links (px)
  linkColorInfluence: 1,            // How much cursor color affects link colors (0-1)
  linkImpactScale: 0.95,             // Scale when link is pressed (0.7-1.0)
  linkImpactBlur: 10,                // Blur amount when link is pressed (px)
  linkImpactDuration: 150,           // Duration of press animation (ms)
  hoverSnapEnabled: true,            // Hover targets: scale-only bounce on hover entry (no color delay)
  hoverSnapDuration: 450,            // Hover snap duration (ms)
  hoverSnapOvershoot: 1.08,          // Hover snap peak scale (>= 1.0)
  hoverSnapUndershoot: 0.98,         // Hover snap recoil scale (<= 1.0)
  
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

function clampNumber$1(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampInt$2(v, min, max, fallback) {
  const n = clampNumber$1(v, min, max, fallback);
  return Math.round(n);
}

function getLayoutViewportWidthPx() {
  // Virtual viewport width (debug) → allows tuning vw values without resizing window.
  // IMPORTANT: keep this O(1) and allocation-free.
  const forced = Number(state.layoutViewportWidthPx);
  if (Number.isFinite(forced) && forced > 0) return forced;
  return Math.max(1, window.innerWidth || 1);
}

function getLayoutViewportHeightPx() {
  // Get viewport height, respecting visual viewport on mobile (keyboard-aware).
  // IMPORTANT: keep this O(1) and allocation-free.
  try {
    const vv = window.visualViewport;
    if (vv && typeof vv.height === 'number' && vv.height > 0) {
      return Math.max(1, vv.height);
    }
  } catch (e) {}
  return Math.max(1, window.innerHeight || 1);
}

/**
 * Calculate screen area (width × height) in pixels
 * @returns {number} Screen area in square pixels
 */
function getScreenAreaPx() {
  const w = getLayoutViewportWidthPx();
  const h = getLayoutViewportHeightPx();
  return w * h;
}

/**
 * Calculate normalized screen area relative to a reference size (800×800 = 640,000)
 * Returns 1.0 at reference size, <1.0 for smaller screens, >1.0 for larger screens
 * @param {number} referenceAreaPx - Reference area in square pixels (default: 800×800)
 * @returns {number} Normalized area multiplier (0.0 to ~infinity)
 */
function getNormalizedScreenArea(referenceAreaPx = 640000) {
  const area = getScreenAreaPx();
  if (area <= 0 || referenceAreaPx <= 0) return 1.0;
  return area / referenceAreaPx;
}

function pxToVw(px, viewportWidthPx) {
  const w = Math.max(1, viewportWidthPx || getLayoutViewportWidthPx());
  const p = Number(px);
  if (!Number.isFinite(p)) return 0;
  return (p / w) * 100;
}

function vwToPx(vw, viewportWidthPx) {
  const w = Math.max(1, viewportWidthPx || getLayoutViewportWidthPx());
  const v = Number(vw);
  if (!Number.isFinite(v)) return 0;
  return (v / 100) * w;
}

function applyLayoutFromVwToPx() {
  // Derive px values once, then everything downstream remains px-based.
  const w = getLayoutViewportWidthPx();
  const h = getLayoutViewportHeightPx();

  // Wall thickness defines the wall inset / frame thickness.
  // Content padding is layout-only (space between wall and content), and MUST NOT
  // change the wall geometry or collisions.
  const wallThicknessVw = (Number.isFinite(state.wallThicknessVw) && state.wallThicknessVw > 0)
    ? state.wallThicknessVw
    : 0;
  // Legacy fallback: if wallThicknessVw is unset, keep using containerBorderVw.
  const derivedBorderVw = (wallThicknessVw > 0)
    ? wallThicknessVw
    : (Number.isFinite(state.containerBorderVw) ? state.containerBorderVw : 0);
  // Keep legacy value in sync so UI readbacks + exports remain consistent.
  state.containerBorderVw = derivedBorderVw;

  const borderPx = vwToPx(derivedBorderVw, w);
  const simPadPx = vwToPx(state.simulationPaddingVw, w);
  const radiusPx = vwToPx(state.wallRadiusVw, w);

  const minWallRadiusPx = Math.max(0, Math.round(state.layoutMinWallRadiusPx || 0));

  // Wall thickness (vw). Legacy fallback: if unset, treat the derived border as thickness.
  const thicknessVw = (wallThicknessVw > 0) ? wallThicknessVw : derivedBorderVw;
  const baseThicknessPx = vwToPx(thicknessVw, w);

  // Apply area-based scaling: normalize screen area and blend with user-controlled multiplier
  // Formula: base × (1.0 + (normalizedArea - 1.0) × multiplier)
  // - multiplier = 0.0: no area scaling (pure vw-based, matches current behavior)
  // - multiplier = 1.0: full area scaling (scales linearly with viewport area)
  // - multiplier > 1.0: exaggerated area scaling
  const normalizedArea = getNormalizedScreenArea();
  const areaMultiplier = Number.isFinite(state.wallThicknessAreaMultiplier) && state.wallThicknessAreaMultiplier >= 0
    ? state.wallThicknessAreaMultiplier
    : 0.0;
  const areaBlend = 1.0 + (normalizedArea - 1.0) * areaMultiplier;
  const areaScaledThicknessPx = baseThicknessPx * areaBlend;

  const isMobileLayout = state.isMobile || state.isMobileViewport;
  
  // Apply mobile wall thickness factor to LEFT/RIGHT only (horizontal)
  const mobileWallXFactor = isMobileLayout
    ? Math.max(0.5, state.mobileWallThicknessXFactor || 1.0)
    : 1.0;
  // Desktop-only vertical thickening for the bottom band (and matching top)
  const desktopWallFactor = isMobileLayout
    ? 1.0
    : Math.max(0.5, state.desktopWallThicknessFactor || 1.0);
  
  // Vertical (top/bottom) uses desktop factor, horizontal (left/right) gets mobile factor
  state.containerBorder = Math.round(borderPx * desktopWallFactor); // Y (top/bottom)
  state.containerBorderX = Math.round(borderPx * mobileWallXFactor); // X (left/right)
  state.simulationPadding = Math.round(simPadPx);
  
  // Wall thickness: area-scaled base × axis-specific factor (desktop = Y, mobile = X)
  const thicknessMul = isMobileLayout ? mobileWallXFactor : desktopWallFactor;
  state.wallThickness = Math.round(areaScaledThicknessPx * thicknessMul);
  
  // Content padding: additive to wall thickness (viewport-size fraction)
  const viewportSizePx = Math.max(1, Math.sqrt(w * h));
  const raw = Number.isFinite(state.contentPaddingRatio) ? state.contentPaddingRatio : 0;
  // Back-compat: if the value looks like legacy px, convert to fraction on the fly.
  const frac = (Math.abs(raw) > 1) ? (raw / viewportSizePx) : raw;
  const contentPaddingAdditivePx = viewportSizePx * frac;
  state.contentPadding = Math.round(state.wallThickness + contentPaddingAdditivePx);
  
  // Derive directional padding: horizontal = base × ratio, vertical = base
  const horizRatio = Math.max(0.1, state.contentPaddingHorizontalRatio || 1.0);
  state.contentPaddingY = state.contentPadding;
  state.contentPaddingX = Math.round(state.contentPadding * horizRatio);
  
  state.wallRadius = Math.max(minWallRadiusPx, Math.round(radiusPx));
  state.cornerRadius = state.wallRadius;

  // Cursor influence radius (vw → px), then apply mode multipliers.
  // This keeps a single “interaction zone” definition that naturally scales on mobile.
  const baseCursorPx = Math.max(0, vwToPx(state.cursorInfluenceRadiusVw || 0, w));
  state.cursorInfluenceRadiusPx = Math.round(baseCursorPx);
  // Universal: all cursor interaction radii share the same base value.
  state.repelRadius = Math.round(baseCursorPx);
  state.weightlessRepelRadius = Math.round(baseCursorPx);
  state.pingPongCursorRadius = Math.round(baseCursorPx);
  state.bubblesDeflectRadius = Math.round(baseCursorPx);
  
  // Particle Fountain mouse repulsion radius (separate vw-based value)
  const particleFountainMouseRepelRadiusVw = state.particleFountainMouseRepelRadiusVw ?? 5.0;
  const particleFountainMouseRepelRadiusPx = Math.max(0, vwToPx(particleFountainMouseRepelRadiusVw, w));
  state.particleFountainMouseRepelRadius = Math.round(particleFountainMouseRepelRadiusPx);
}

function applyLayoutCSSVars() {
  // Single place that stamps layout CSS vars from the derived px fields.
  // Keeps CSS + physics aligned, and allows vw-based tuning without touching
  // performance-sensitive paths.
  const root = document.documentElement;
  
  // Calculate mobile factor for CSS vars (X = left/right only)
  const isMobileLayout = state.isMobile || state.isMobileViewport;
  const mobileWallXFactor = isMobileLayout
    ? Math.max(0.5, state.mobileWallThicknessXFactor || 1.0)
    : 1.0;
  const desktopWallFactor = isMobileLayout
    ? 1.0
    : Math.max(0.5, state.desktopWallThicknessFactor || 1.0);
  
  // Set all layout CSS vars (px values override CSS calcs)
  // Y = top/bottom (no mobile factor), X = left/right (with mobile factor)
  root.style.setProperty('--container-border', `${state.containerBorder}px`); // Y (top/bottom)
  root.style.setProperty('--container-border-x', `${state.containerBorderX}px`); // X (left/right)
  root.style.setProperty('--container-border-y', `${state.containerBorder}px`); // alias for clarity
  root.style.setProperty('--simulation-padding', `${state.simulationPadding}px`);
  root.style.setProperty('--content-padding', `${state.contentPadding}px`);
  root.style.setProperty('--content-padding-x', `${state.contentPaddingX}px`);
  root.style.setProperty('--content-padding-y', `${state.contentPaddingY}px`);
  root.style.setProperty('--wall-radius', `${state.wallRadius}px`);
  root.style.setProperty('--wall-thickness', `${state.wallThickness}px`);

  // Viewport metrics (used for debugging + CSS-only sizing when needed)
  try {
    const w = getLayoutViewportWidthPx();
    const h = getLayoutViewportHeightPx();
    const area = Math.max(0, w * h);
    const size = Math.sqrt(area);
    root.style.setProperty('--layout-viewport-area-px', String(Math.round(area)));
    root.style.setProperty('--layout-viewport-size-px', `${Math.round(size)}px`);
  } catch (e) {}
  
  // Also update vw-based vars for CSS calc fallbacks
  const baseContainerVw = state.containerBorderVw || 1.3;
  root.style.setProperty('--container-border-vw', `${baseContainerVw * desktopWallFactor}`);
  root.style.setProperty('--container-border-x-vw', `${baseContainerVw * mobileWallXFactor}`);
  
  const baseThicknessVw = (Number.isFinite(state.wallThicknessVw) && state.wallThicknessVw > 0)
    ? state.wallThicknessVw
    : state.containerBorderVw;
  const wallThicknessVwMul = isMobileLayout ? mobileWallXFactor : desktopWallFactor;
  root.style.setProperty('--wall-thickness-vw', `${baseThicknessVw * wallThicknessVwMul}`);
  
  // Edge label inset: CSS handles calculation via --wall-thickness + --edge-label-inset-gap + --edge-label-inset-adjust
  // Just set the adjust variable if needed (CSS will calculate the rest)
  const edgeLabelAdjust = state.edgeLabelInsetAdjustPx || 0;
  root.style.setProperty('--edge-label-inset-adjust', `${edgeLabelAdjust}px`);
  // CSS will calculate: --edge-label-inset = calc(--wall-thickness + --edge-label-inset-gap + --edge-label-inset-adjust)
  
  // True inner offset: wall thickness + content padding (for edge-inset CSS var)
  const edgeInset = state.wallThickness + state.contentPadding;
  root.style.setProperty('--edge-inset', `${edgeInset}px`);
  root.style.setProperty('--edge-inset-lg', `${edgeInset}px`);
  
  // Mobile edge label visibility (CSS only applies this var on mobile via @media)
  if (isMobileLayout) {
    const displayValue = state.mobileEdgeLabelsVisible ? 'flex' : 'none';
    root.style.setProperty('--edge-label-mobile-display', displayValue);
  } else {
    root.style.removeProperty('--edge-label-mobile-display');
  }

  // UI sizing vars (panel-tunable, but also needed in production without the panel)
  root.style.setProperty('--ui-hit-area-mul', String(state.uiHitAreaMul ?? 1));
  root.style.setProperty('--ui-icon-corner-radius-mul', String(state.uiIconCornerRadiusMul ?? 0.5));

  // Optional explicit overrides (0 = use token-derived defaults)
  if (Number.isFinite(state.uiIconFramePx) && state.uiIconFramePx > 0) {
    root.style.setProperty('--ui-icon-frame-size', `${Math.round(state.uiIconFramePx)}px`);
  } else {
    root.style.removeProperty('--ui-icon-frame-size');
  }
  if (Number.isFinite(state.uiIconGlyphPx) && state.uiIconGlyphPx > 0) {
    root.style.setProperty('--ui-icon-glyph-size', `${Math.round(state.uiIconGlyphPx)}px`);
  } else {
    root.style.removeProperty('--ui-icon-glyph-size');
  }

  // Social icon group margin (allows negative to push outward)
  if (Number.isFinite(state.uiIconGroupMarginPx) && state.uiIconGroupMarginPx !== 0) {
    root.style.setProperty('--ui-icon-group-margin', `${Math.round(state.uiIconGroupMarginPx)}px`);
  } else {
    root.style.removeProperty('--ui-icon-group-margin');
  }
}

function initState(config) {
  state.config = { ...config };
  // Virtual viewport width must be read early so px→vw migrations use the intended basis.
  if (config.layoutViewportWidthPx !== undefined) {
    state.layoutViewportWidthPx = clampNumber$1(config.layoutViewportWidthPx, 0, 4096, 0);
  }
  if (config.ballMass) state.ballMassKg = config.ballMass;
  // Treat config.gravityMultiplier as the Ball Pit gravity multiplier (historical naming)
  if (config.gravityMultiplier !== undefined) {
    state.gravityMultiplier = config.gravityMultiplier;
    state.gravityMultiplierPit = config.gravityMultiplier;
  }
  if (config.restitution) state.REST = config.restitution;
  if (config.friction) state.FRICTION = config.friction;
  // Size scale: accept both legacy `ballScale` and newer `sizeScale`
  if (config.ballScale !== undefined) state.sizeScale = config.ballScale;
  if (config.sizeScale !== undefined) state.sizeScale = config.sizeScale;
  // Global variation multiplier
  if (config.sizeVariationGlobalMul !== undefined) {
    state.sizeVariationGlobalMul = clampNumber$1(config.sizeVariationGlobalMul, 0, 2, state.sizeVariationGlobalMul);
  }
  if (config.sizeVariationCap !== undefined) {
    state.sizeVariationCap = clampNumber$1(config.sizeVariationCap, 0, 0.2, state.sizeVariationCap);
  }
  // Per-mode variation sliders (0..1)
  if (config.sizeVariationPit !== undefined) state.sizeVariationPit = clampNumber$1(config.sizeVariationPit, 0, 1, state.sizeVariationPit);
  if (config.sizeVariationFlies !== undefined) state.sizeVariationFlies = clampNumber$1(config.sizeVariationFlies, 0, 1, state.sizeVariationFlies);
  if (config.sizeVariationWeightless !== undefined) state.sizeVariationWeightless = clampNumber$1(config.sizeVariationWeightless, 0, 1, state.sizeVariationWeightless);
  if (config.sizeVariationWater !== undefined) state.sizeVariationWater = clampNumber$1(config.sizeVariationWater, 0, 1, state.sizeVariationWater);
  if (config.sizeVariationVortex !== undefined) state.sizeVariationVortex = clampNumber$1(config.sizeVariationVortex, 0, 1, state.sizeVariationVortex);
  if (config.sizeVariationPingPong !== undefined) state.sizeVariationPingPong = clampNumber$1(config.sizeVariationPingPong, 0, 1, state.sizeVariationPingPong);
  if (config.sizeVariationMagnetic !== undefined) state.sizeVariationMagnetic = clampNumber$1(config.sizeVariationMagnetic, 0, 1, state.sizeVariationMagnetic);
  if (config.sizeVariationBubbles !== undefined) state.sizeVariationBubbles = clampNumber$1(config.sizeVariationBubbles, 0, 1, state.sizeVariationBubbles);
  if (config.sizeVariationKaleidoscope !== undefined) state.sizeVariationKaleidoscope = clampNumber$1(config.sizeVariationKaleidoscope, 0, 1, state.sizeVariationKaleidoscope);
  if (config.sizeVariationCritters !== undefined) state.sizeVariationCritters = clampNumber$1(config.sizeVariationCritters, 0, 1, state.sizeVariationCritters);
  if (config.sizeVariationNeural !== undefined) state.sizeVariationNeural = clampNumber$1(config.sizeVariationNeural, 0, 1, state.sizeVariationNeural);
  if (config.sizeVariationParallaxLinear !== undefined) state.sizeVariationParallaxLinear = clampNumber$1(config.sizeVariationParallaxLinear, 0, 1, state.sizeVariationParallaxLinear);
  // Legacy key (kept): does not affect per-mode sliders, but we store it.
  if (config.sizeVariation !== undefined) state.sizeVariation = config.sizeVariation;

  // Color distribution (7 rows)
  // Accepts: [{ label: string, colorIndex: 0..7, weight: 0..100 }, ...]
  // We clamp indices + weights for safety; UI enforces uniqueness + sum=100.
  if (Array.isArray(config.colorDistribution)) {
    const src = config.colorDistribution;
    // Build on top of existing defaults so missing entries don't explode the UI.
    const base = Array.isArray(state.colorDistribution) ? state.colorDistribution : [];
    const out = [];
    for (let i = 0; i < 7; i++) {
      const b = base[i] || {};
      const s = src[i] || {};
      let label = (typeof s.label === 'string' && s.label.trim())
        ? s.label.trim()
        : (typeof b.label === 'string' ? b.label : `Discipline ${i + 1}`);
      // Backward compat: rename "Frontend Craft" → "Art & Visual Direction"
      if (String(label).trim().toLowerCase() === 'frontend craft') {
        label = 'Art & Visual Direction';
      }
      const colorIndex = clampInt$2(s.colorIndex, 0, 7, clampInt$2(b.colorIndex, 0, 7, 0));
      const weight = clampInt$2(s.weight, 0, 100, clampInt$2(b.weight, 0, 100, 0));
      out.push({ label, colorIndex, weight });
    }
    state.colorDistribution = out;
  }

  // Warmup frames (per simulation) — integer 0..240
  if (config.pitWarmupFrames !== undefined) state.pitWarmupFrames = clampInt$2(config.pitWarmupFrames, 0, 240, state.pitWarmupFrames);
  if (config.fliesWarmupFrames !== undefined) state.fliesWarmupFrames = clampInt$2(config.fliesWarmupFrames, 0, 240, state.fliesWarmupFrames);
  if (config.weightlessWarmupFrames !== undefined) state.weightlessWarmupFrames = clampInt$2(config.weightlessWarmupFrames, 0, 240, state.weightlessWarmupFrames);
  if (config.waterWarmupFrames !== undefined) state.waterWarmupFrames = clampInt$2(config.waterWarmupFrames, 0, 240, state.waterWarmupFrames);
  if (config.vortexWarmupFrames !== undefined) state.vortexWarmupFrames = clampInt$2(config.vortexWarmupFrames, 0, 240, state.vortexWarmupFrames);
  if (config.pingPongWarmupFrames !== undefined) state.pingPongWarmupFrames = clampInt$2(config.pingPongWarmupFrames, 0, 240, state.pingPongWarmupFrames);
  if (config.magneticWarmupFrames !== undefined) state.magneticWarmupFrames = clampInt$2(config.magneticWarmupFrames, 0, 240, state.magneticWarmupFrames);
  if (config.bubblesWarmupFrames !== undefined) state.bubblesWarmupFrames = clampInt$2(config.bubblesWarmupFrames, 0, 240, state.bubblesWarmupFrames);
  if (config.kaleidoscope3WarmupFrames !== undefined) state.kaleidoscope3WarmupFrames = clampInt$2(config.kaleidoscope3WarmupFrames, 0, 240, state.kaleidoscope3WarmupFrames);
  if (config.crittersWarmupFrames !== undefined) state.crittersWarmupFrames = clampInt$2(config.crittersWarmupFrames, 0, 240, state.crittersWarmupFrames);
  if (config.neuralWarmupFrames !== undefined) state.neuralWarmupFrames = clampInt$2(config.neuralWarmupFrames, 0, 240, state.neuralWarmupFrames);
  if (config.parallaxLinearWarmupFrames !== undefined) state.parallaxLinearWarmupFrames = clampInt$2(config.parallaxLinearWarmupFrames, 0, 240, state.parallaxLinearWarmupFrames);
  if (config.elasticCenterWarmupFrames !== undefined) state.elasticCenterWarmupFrames = clampInt$2(config.elasticCenterWarmupFrames, 0, 240, state.elasticCenterWarmupFrames);

  if (config.maxBalls !== undefined) state.maxBalls = config.maxBalls;
  if (config.repelRadius !== undefined) state.repelRadius = config.repelRadius;
  if (config.repelPower !== undefined) state.repelPower = config.repelPower;
  // Repel softness: accept both `repelSoft` and `repelSoftness`
  if (config.repelSoft !== undefined) state.repelSoft = config.repelSoft;
  if (config.repelSoftness !== undefined) state.repelSoft = config.repelSoftness;

  // Universal cursor influence radius (vw) + mode multipliers.
  // Back-compat: if `cursorInfluenceRadiusVw` isn't provided, infer it from the legacy
  // pixel-based repel radius (treating it as “desktop px” at a 1000px viewport baseline).
  if (config.cursorInfluenceRadiusVw !== undefined) {
    state.cursorInfluenceRadiusVw = clampNumber$1(config.cursorInfluenceRadiusVw, 0, 80, state.cursorInfluenceRadiusVw);
  } else if (config.repelRadius !== undefined) {
    state.cursorInfluenceRadiusVw = clampNumber$1(config.repelRadius / 10, 0, 80, state.cursorInfluenceRadiusVw);
  }
  if (config.ballSizeDesktop !== undefined) state.ballSizeDesktop = config.ballSizeDesktop;
  if (config.ballSizeMobile !== undefined) state.ballSizeMobile = config.ballSizeMobile;
  if (config.liteModeEnabled !== undefined) state.liteModeEnabled = Boolean(config.liteModeEnabled);
  if (config.liteModeObjectReductionFactor !== undefined) {
    state.liteModeObjectReductionFactor = clampNumber$1(
      config.liteModeObjectReductionFactor,
      0,
      1,
      state.liteModeObjectReductionFactor
    );
  }
  if (config.mobileObjectReductionFactor !== undefined) {
    state.mobileObjectReductionFactor = clampNumber$1(
      config.mobileObjectReductionFactor,
      0,
      1,
      state.mobileObjectReductionFactor
    );
  }
  if (config.mobileObjectReductionThreshold !== undefined) {
    state.mobileObjectReductionThreshold = clampInt$2(
      config.mobileObjectReductionThreshold,
      0,
      10000,
      state.mobileObjectReductionThreshold
    );
  }
  
  // Detect mobile/tablet devices and set ball sizes
  detectResponsiveScale();
  
  // Always ensure ball sizes are set (detectResponsiveScale may early-out on desktop)
  updateBallSizes();
  
  // Kaleidoscope (optional config overrides)
  if (config.kaleidoscopeBallCount !== undefined) {
    state.kaleidoscopeBallCount = clampNumber$1(config.kaleidoscopeBallCount, 10, 300, state.kaleidoscopeBallCount);
  }
  if (config.kaleidoscopeDotSizeVh !== undefined) {
    state.kaleidoscopeDotSizeVh = clampNumber$1(config.kaleidoscopeDotSizeVh, 0.1, 6.0, state.kaleidoscopeDotSizeVh);
  }
  if (config.kaleidoscopeDotAreaMul !== undefined) {
    state.kaleidoscopeDotAreaMul = clampNumber$1(config.kaleidoscopeDotAreaMul, 0.1, 2.0, state.kaleidoscopeDotAreaMul);
  }
  if (config.kaleidoscopeSpawnAreaMul !== undefined) {
    state.kaleidoscopeSpawnAreaMul = clampNumber$1(config.kaleidoscopeSpawnAreaMul, 0.2, 2.0, state.kaleidoscopeSpawnAreaMul);
  }
  if (config.kaleidoscopeSizeVariance !== undefined) {
    state.kaleidoscopeSizeVariance = clampNumber$1(config.kaleidoscopeSizeVariance, 0, 1, state.kaleidoscopeSizeVariance);
  }

  // Kaleidoscope III parameters (now the only kaleidoscope mode)
  if (config.kaleidoscope3BallCount !== undefined) state.kaleidoscope3BallCount = clampNumber$1(config.kaleidoscope3BallCount, 3, 300, state.kaleidoscope3BallCount);
  if (config.kaleidoscope3Wedges !== undefined) state.kaleidoscope3Wedges = clampNumber$1(config.kaleidoscope3Wedges, 3, 24, state.kaleidoscope3Wedges);
  if (config.kaleidoscope3Speed !== undefined) state.kaleidoscope3Speed = clampNumber$1(config.kaleidoscope3Speed, 0.2, 2.0, state.kaleidoscope3Speed);
  if (config.kaleidoscope3DotSizeVh !== undefined) state.kaleidoscope3DotSizeVh = clampNumber$1(config.kaleidoscope3DotSizeVh, 0.1, 6.0, state.kaleidoscope3DotSizeVh);
  if (config.kaleidoscope3DotAreaMul !== undefined) state.kaleidoscope3DotAreaMul = clampNumber$1(config.kaleidoscope3DotAreaMul, 0.1, 2.0, state.kaleidoscope3DotAreaMul);
  if (config.kaleidoscope3SpawnAreaMul !== undefined) state.kaleidoscope3SpawnAreaMul = clampNumber$1(config.kaleidoscope3SpawnAreaMul, 0.2, 2.0, state.kaleidoscope3SpawnAreaMul);
  if (config.kaleidoscope3SizeVariance !== undefined) state.kaleidoscope3SizeVariance = clampNumber$1(config.kaleidoscope3SizeVariance, 0, 1, state.kaleidoscope3SizeVariance);
  // New key: kaleidoscopeWedges (preferred). Back-compat: kaleidoscopeSegments.
  if (config.kaleidoscopeWedges !== undefined) {
    state.kaleidoscopeWedges = clampNumber$1(config.kaleidoscopeWedges, 3, 24, state.kaleidoscopeWedges);
  } else if (config.kaleidoscopeSegments !== undefined) {
    state.kaleidoscopeWedges = clampNumber$1(config.kaleidoscopeSegments, 3, 24, state.kaleidoscopeWedges);
  }
  if (config.kaleidoscopeMirror !== undefined) {
    state.kaleidoscopeMirror = clampNumber$1(config.kaleidoscopeMirror, 0, 1, state.kaleidoscopeMirror);
  }
  // New key: kaleidoscopeSpeed (preferred). Back-compat: kaleidoscopeSwirlStrength (mapped).
  if (config.kaleidoscopeSpeed !== undefined) {
    state.kaleidoscopeSpeed = clampNumber$1(config.kaleidoscopeSpeed, 0.2, 2.0, state.kaleidoscopeSpeed);
  } else if (config.kaleidoscopeSwirlStrength !== undefined) {
    // Historical values were in a much larger range (0..800-ish). Map 0..800 → 0.2..2.0.
    const legacy = clampNumber$1(config.kaleidoscopeSwirlStrength, 0, 800, 52);
    state.kaleidoscopeSpeed = clampNumber$1(0.2 + (legacy / 800) * 1.8, 0.2, 2.0, state.kaleidoscopeSpeed);
  }

  // Critters (Simulation 11) config overrides
  if (config.critterCount !== undefined) state.critterCount = config.critterCount;
  if (config.critterSpeed !== undefined) state.critterSpeed = config.critterSpeed;
  if (config.critterMaxSpeed !== undefined) state.critterMaxSpeed = config.critterMaxSpeed;
  if (config.critterStepHz !== undefined) state.critterStepHz = config.critterStepHz;
  if (config.critterStepSharpness !== undefined) state.critterStepSharpness = config.critterStepSharpness;
  if (config.critterTurnNoise !== undefined) state.critterTurnNoise = config.critterTurnNoise;
  if (config.critterTurnDamp !== undefined) state.critterTurnDamp = config.critterTurnDamp;
  if (config.critterTurnSeek !== undefined) state.critterTurnSeek = config.critterTurnSeek;
  if (config.critterAvoidRadius !== undefined) state.critterAvoidRadius = config.critterAvoidRadius;
  if (config.critterAvoidForce !== undefined) state.critterAvoidForce = config.critterAvoidForce;
  if (config.critterEdgeAvoid !== undefined) state.critterEdgeAvoid = config.critterEdgeAvoid;
  if (config.critterMousePull !== undefined) state.critterMousePull = config.critterMousePull;
  
  // Layout min clamp targets (px)
  // These define the minimum padding/radius we clamp down towards on small viewports.
  if (config.layoutMinWallRadiusPx !== undefined) {
    state.layoutMinWallRadiusPx = clampNumber$1(config.layoutMinWallRadiusPx, 0, 400, state.layoutMinWallRadiusPx);
  } else {
    state.layoutMinWallRadiusPx = readTokenPx('--layout-min-wall-radius', state.layoutMinWallRadiusPx);
  }
  if (config.critterMouseRadiusVw !== undefined) state.critterMouseRadiusVw = config.critterMouseRadiusVw;
  if (config.critterRestitution !== undefined) state.critterRestitution = config.critterRestitution;
  if (config.critterFriction !== undefined) state.critterFriction = config.critterFriction;

  // Neural (config overrides)
  if (config.neuralBallCount !== undefined) state.neuralBallCount = clampNumber$1(config.neuralBallCount, 8, 400, state.neuralBallCount);
  if (config.neuralLinkDistanceVw !== undefined) state.neuralLinkDistanceVw = clampNumber$1(config.neuralLinkDistanceVw, 1, 50, state.neuralLinkDistanceVw);
  if (config.neuralLineOpacity !== undefined) state.neuralLineOpacity = clampNumber$1(config.neuralLineOpacity, 0, 1, state.neuralLineOpacity);
  if (config.neuralConnectorDensity !== undefined) state.neuralConnectorDensity = clampNumber$1(config.neuralConnectorDensity, 0, 10, state.neuralConnectorDensity);
  if (config.neuralWanderStrength !== undefined) state.neuralWanderStrength = clampNumber$1(config.neuralWanderStrength, 0, 4000, state.neuralWanderStrength);
  if (config.neuralMouseStrength !== undefined) state.neuralMouseStrength = clampNumber$1(config.neuralMouseStrength, 0, 300000, state.neuralMouseStrength);
  if (config.neuralSeparationRadius !== undefined) state.neuralSeparationRadius = clampNumber$1(config.neuralSeparationRadius, 50, 300, state.neuralSeparationRadius);
  if (config.neuralSeparationStrength !== undefined) state.neuralSeparationStrength = clampNumber$1(config.neuralSeparationStrength, 0, 30000, state.neuralSeparationStrength);
  if (config.neuralMaxLinksPerBall !== undefined) state.neuralMaxLinksPerBall = clampNumber$1(config.neuralMaxLinksPerBall, 0, 16, state.neuralMaxLinksPerBall);
  if (config.neuralDamping !== undefined) state.neuralDamping = clampNumber$1(config.neuralDamping, 0.8, 1.0, state.neuralDamping);

  // Lattice (config overrides)

  // Parallax (config overrides)
  if (config.parallaxLinearDotCount !== undefined) state.parallaxLinearDotCount = clampNumber$1(config.parallaxLinearDotCount, 20, 220, state.parallaxLinearDotCount);
  if (config.parallaxLinearGridJitter !== undefined) state.parallaxLinearGridJitter = clampNumber$1(config.parallaxLinearGridJitter, 0, 1, state.parallaxLinearGridJitter);
  if (config.parallaxLinearFarSpeed !== undefined) state.parallaxLinearFarSpeed = clampNumber$1(config.parallaxLinearFarSpeed, 0, 1.5, state.parallaxLinearFarSpeed);
  if (config.parallaxLinearMidSpeed !== undefined) state.parallaxLinearMidSpeed = clampNumber$1(config.parallaxLinearMidSpeed, 0, 1.5, state.parallaxLinearMidSpeed);
  if (config.parallaxLinearNearSpeed !== undefined) state.parallaxLinearNearSpeed = clampNumber$1(config.parallaxLinearNearSpeed, 0, 1.5, state.parallaxLinearNearSpeed);
  if (config.parallaxLinearGridX !== undefined) state.parallaxLinearGridX = clampInt$2(config.parallaxLinearGridX, 3, 40, state.parallaxLinearGridX);
  if (config.parallaxLinearGridY !== undefined) state.parallaxLinearGridY = clampInt$2(config.parallaxLinearGridY, 3, 40, state.parallaxLinearGridY);
  if (config.parallaxLinearGridZ !== undefined) state.parallaxLinearGridZ = clampInt$2(config.parallaxLinearGridZ, 2, 20, state.parallaxLinearGridZ);
  if (config.parallaxLinearSpanX !== undefined) state.parallaxLinearSpanX = clampNumber$1(config.parallaxLinearSpanX, 0.2, 3.0, state.parallaxLinearSpanX);
  if (config.parallaxLinearSpanY !== undefined) state.parallaxLinearSpanY = clampNumber$1(config.parallaxLinearSpanY, 0.2, 3.0, state.parallaxLinearSpanY);
  if (config.parallaxLinearZNear !== undefined) state.parallaxLinearZNear = clampNumber$1(config.parallaxLinearZNear, 10, 1200, state.parallaxLinearZNear);
  if (config.parallaxLinearZFar !== undefined) state.parallaxLinearZFar = clampNumber$1(config.parallaxLinearZFar, 50, 3000, state.parallaxLinearZFar);
  if (config.parallaxLinearFocalLength !== undefined) state.parallaxLinearFocalLength = clampNumber$1(config.parallaxLinearFocalLength, 80, 2000, state.parallaxLinearFocalLength);
  if (config.parallaxLinearParallaxStrength !== undefined) state.parallaxLinearParallaxStrength = clampNumber$1(config.parallaxLinearParallaxStrength, 0, 2000, state.parallaxLinearParallaxStrength);
  if (config.parallaxLinearDotSizeMul !== undefined) state.parallaxLinearDotSizeMul = clampNumber$1(config.parallaxLinearDotSizeMul, 0.1, 6.0, state.parallaxLinearDotSizeMul);
  if (config.parallaxLinearFollowStrength !== undefined) state.parallaxLinearFollowStrength = clampNumber$1(config.parallaxLinearFollowStrength, 1, 80, state.parallaxLinearFollowStrength);
  if (config.parallaxLinearDamping !== undefined) state.parallaxLinearDamping = clampNumber$1(config.parallaxLinearDamping, 1, 80, state.parallaxLinearDamping);

  // Cursor explosion impact parameters
  if (config.cursorExplosionImpactMinFactor !== undefined) state.cursorExplosionImpactMinFactor = clampNumber$1(config.cursorExplosionImpactMinFactor, 0.1, 2.0, state.cursorExplosionImpactMinFactor);
  if (config.cursorExplosionImpactMaxFactor !== undefined) state.cursorExplosionImpactMaxFactor = clampNumber$1(config.cursorExplosionImpactMaxFactor, 1.0, 8.0, state.cursorExplosionImpactMaxFactor);
  if (config.cursorExplosionImpactSensitivity !== undefined) state.cursorExplosionImpactSensitivity = clampNumber$1(config.cursorExplosionImpactSensitivity, 100, 1000, state.cursorExplosionImpactSensitivity);
  if (config.cursorExplosionLifetimeImpactMin !== undefined) state.cursorExplosionLifetimeImpactMin = clampNumber$1(config.cursorExplosionLifetimeImpactMin, 0.3, 1.5, state.cursorExplosionLifetimeImpactMin);
  if (config.cursorExplosionLifetimeImpactMax !== undefined) state.cursorExplosionLifetimeImpactMax = clampNumber$1(config.cursorExplosionLifetimeImpactMax, 1.0, 3.0, state.cursorExplosionLifetimeImpactMax);
  if (config.cursorExplosionLifetimeImpactSensitivity !== undefined) state.cursorExplosionLifetimeImpactSensitivity = clampNumber$1(config.cursorExplosionLifetimeImpactSensitivity, 200, 1500, state.cursorExplosionLifetimeImpactSensitivity);
  
  // Generic "apply like-for-like" config keys to state
  // This ensures panel-exported config round-trips cleanly across modes.
  for (const [key, val] of Object.entries(config || {})) {
    if (!(key in state)) continue;
    if (key === 'config') continue;
    if (key === 'soundConfig' || key === 'soundPreset') continue; // handled by sound engine
    if (typeof state[key] === 'function') continue;
    // Only allow primitives + arrays (no nested objects).
    const isArray = Array.isArray(val);
    const isPrimitive = val === null || ['string', 'number', 'boolean'].includes(typeof val);
    if (!isArray && !isPrimitive) continue;
    if (val === undefined) continue;
    state[key] = val;
  }

  // 3D Sphere (Mode 16)
  if (config.sphere3dRadiusVw !== undefined) state.sphere3dRadiusVw = clampNumber$1(config.sphere3dRadiusVw, 5, 40, state.sphere3dRadiusVw);
  if (config.sphere3dDensity !== undefined) state.sphere3dDensity = clampInt$2(config.sphere3dDensity, 30, 600, state.sphere3dDensity);
  if (config.sphere3dFocalLength !== undefined) state.sphere3dFocalLength = clampInt$2(config.sphere3dFocalLength, 80, 2000, state.sphere3dFocalLength);
  if (config.sphere3dDotSizeMul !== undefined) state.sphere3dDotSizeMul = clampNumber$1(config.sphere3dDotSizeMul, 0.2, 4.0, state.sphere3dDotSizeMul);
  if (config.sphere3dIdleSpeed !== undefined) state.sphere3dIdleSpeed = clampNumber$1(config.sphere3dIdleSpeed, 0, 1, state.sphere3dIdleSpeed);
  if (config.sphere3dCursorInfluence !== undefined) state.sphere3dCursorInfluence = clampNumber$1(config.sphere3dCursorInfluence, 0, 4, state.sphere3dCursorInfluence);
  if (config.sphere3dTumbleSpeed !== undefined) state.sphere3dTumbleSpeed = clampNumber$1(config.sphere3dTumbleSpeed, 0, 10, state.sphere3dTumbleSpeed);
  if (config.sphere3dTumbleDamping !== undefined) state.sphere3dTumbleDamping = clampNumber$1(config.sphere3dTumbleDamping, 0.8, 0.99, state.sphere3dTumbleDamping);
  if (config.sphere3dWarmupFrames !== undefined) state.sphere3dWarmupFrames = clampInt$2(config.sphere3dWarmupFrames, 0, 240, state.sphere3dWarmupFrames);

  // 3D Cube (Mode 17)
  if (config.cube3dSizeVw !== undefined) state.cube3dSizeVw = clampNumber$1(config.cube3dSizeVw, 10, 50, state.cube3dSizeVw);
  if (config.cube3dEdgeDensity !== undefined) state.cube3dEdgeDensity = clampInt$2(config.cube3dEdgeDensity, 2, 30, state.cube3dEdgeDensity);
  if (config.cube3dFaceGrid !== undefined) state.cube3dFaceGrid = clampInt$2(config.cube3dFaceGrid, 0, 10, state.cube3dFaceGrid);
  if (config.cube3dIdleSpeed !== undefined) state.cube3dIdleSpeed = clampNumber$1(config.cube3dIdleSpeed, 0, 1, state.cube3dIdleSpeed);
  if (config.cube3dCursorInfluence !== undefined) state.cube3dCursorInfluence = clampNumber$1(config.cube3dCursorInfluence, 0, 4, state.cube3dCursorInfluence);
  if (config.cube3dTumbleSpeed !== undefined) state.cube3dTumbleSpeed = clampNumber$1(config.cube3dTumbleSpeed, 0, 10, state.cube3dTumbleSpeed);
  if (config.cube3dTumbleDamping !== undefined) state.cube3dTumbleDamping = clampNumber$1(config.cube3dTumbleDamping, 0.8, 0.99, state.cube3dTumbleDamping);
  if (config.cube3dFocalLength !== undefined) state.cube3dFocalLength = clampInt$2(config.cube3dFocalLength, 80, 2000, state.cube3dFocalLength);
  if (config.cube3dDotSizeMul !== undefined) state.cube3dDotSizeMul = clampNumber$1(config.cube3dDotSizeMul, 0.2, 4.0, state.cube3dDotSizeMul);
  if (config.cube3dWarmupFrames !== undefined) state.cube3dWarmupFrames = clampInt$2(config.cube3dWarmupFrames, 0, 240, state.cube3dWarmupFrames);

  // 3D Starfield (Mode 23)
  if (config.starfieldCount !== undefined) state.starfieldCount = clampInt$2(config.starfieldCount, 20, 500, state.starfieldCount);
  if (config.starfieldSpanX !== undefined) state.starfieldSpanX = clampNumber$1(config.starfieldSpanX, 0.4, 4.0, state.starfieldSpanX);
  if (config.starfieldSpanY !== undefined) state.starfieldSpanY = clampNumber$1(config.starfieldSpanY, 0.4, 4.0, state.starfieldSpanY);
  if (config.starfieldZNear !== undefined) state.starfieldZNear = clampInt$2(config.starfieldZNear, 20, 800, state.starfieldZNear);
  if (config.starfieldZFar !== undefined) state.starfieldZFar = clampInt$2(config.starfieldZFar, 400, 4000, state.starfieldZFar);
  if (config.starfieldFocalLength !== undefined) state.starfieldFocalLength = clampInt$2(config.starfieldFocalLength, 100, 2000, state.starfieldFocalLength);
  if (config.starfieldParallaxStrength !== undefined) state.starfieldParallaxStrength = clampInt$2(config.starfieldParallaxStrength, 0, 1200, state.starfieldParallaxStrength);
  if (config.starfieldSpeed !== undefined) state.starfieldSpeed = clampInt$2(config.starfieldSpeed, 10, 1600, state.starfieldSpeed);
  if (config.starfieldDotSizeMul !== undefined) state.starfieldDotSizeMul = clampNumber$1(config.starfieldDotSizeMul, 0.2, 4.0, state.starfieldDotSizeMul);
  if (config.starfieldIdleJitter !== undefined) state.starfieldIdleJitter = clampNumber$1(config.starfieldIdleJitter, 0, 20, state.starfieldIdleJitter);
  if (config.starfieldFadeDuration !== undefined) state.starfieldFadeDuration = clampNumber$1(config.starfieldFadeDuration, 0, 3, state.starfieldFadeDuration);
  if (config.starfield3dWarmupFrames !== undefined) state.starfield3dWarmupFrames = clampInt$2(config.starfield3dWarmupFrames, 0, 240, state.starfield3dWarmupFrames);
  

  // DVD Logo mode
  if (config.dvdLogoSpeed !== undefined) state.dvdLogoSpeed = clampInt$2(config.dvdLogoSpeed, 200, 800, state.dvdLogoSpeed);
  if (config.dvdLogoSize !== undefined) state.dvdLogoSize = clampNumber$1(config.dvdLogoSize, 0.5, 2.0, state.dvdLogoSize);
  if (config.dvdLogoBallCount !== undefined) state.dvdLogoBallCount = clampInt$2(config.dvdLogoBallCount, 30, 120, state.dvdLogoBallCount);
  if (config.dvdLogoBallSpacing !== undefined) state.dvdLogoBallSpacing = clampNumber$1(config.dvdLogoBallSpacing, 1.0, 2.0, state.dvdLogoBallSpacing);
  if (config.dvdLogoLetterSpacing !== undefined) state.dvdLogoLetterSpacing = clampNumber$1(config.dvdLogoLetterSpacing, 0.5, 2.0, state.dvdLogoLetterSpacing);
  if (config.dvdLogoMassMultiplier !== undefined) state.dvdLogoMassMultiplier = clampNumber$1(config.dvdLogoMassMultiplier, 1.0, 5.0, state.dvdLogoMassMultiplier);
  if (config.dvdLogoWarmupFrames !== undefined) state.dvdLogoWarmupFrames = clampInt$2(config.dvdLogoWarmupFrames, 0, 240, state.dvdLogoWarmupFrames);

  // Elastic Center mode
  if (config.elasticCenterBallCount !== undefined) state.elasticCenterBallCount = clampInt$2(config.elasticCenterBallCount, 20, 120, state.elasticCenterBallCount);
  if (config.elasticCenterMassMultiplier !== undefined) state.elasticCenterMassMultiplier = clampNumber$1(config.elasticCenterMassMultiplier, 0.5, 5.0, state.elasticCenterMassMultiplier);
  if (config.elasticCenterSpacingMultiplier !== undefined) state.elasticCenterSpacingMultiplier = clampNumber$1(config.elasticCenterSpacingMultiplier, 2.0, 4.0, state.elasticCenterSpacingMultiplier);
  if (config.elasticCenterElasticStrength !== undefined) state.elasticCenterElasticStrength = clampInt$2(config.elasticCenterElasticStrength, 0, 15000, state.elasticCenterElasticStrength);
  if (config.elasticCenterMouseRepelStrength !== undefined) state.elasticCenterMouseRepelStrength = clampInt$2(config.elasticCenterMouseRepelStrength, 3000, 25000, state.elasticCenterMouseRepelStrength);
  if (config.elasticCenterMouseRadius !== undefined) state.elasticCenterMouseRadius = clampInt$2(config.elasticCenterMouseRadius, 50, 400, state.elasticCenterMouseRadius);
  if (config.elasticCenterDamping !== undefined) state.elasticCenterDamping = clampNumber$1(config.elasticCenterDamping, 0.85, 0.99, state.elasticCenterDamping);
  if (config.elasticCenterWarmupFrames !== undefined) state.elasticCenterWarmupFrames = clampInt$2(config.elasticCenterWarmupFrames, 0, 240, state.elasticCenterWarmupFrames);

  // Snake mode (classic snake game behavior)
  if (config.snakeBallCount !== undefined) state.snakeBallCount = clampInt$2(config.snakeBallCount, 20, 100, state.snakeBallCount);
  if (config.snakeRestLength !== undefined) state.snakeRestLength = clampNumber$1(config.snakeRestLength, 15, 80, state.snakeRestLength);
  if (config.snakeSpringStrength !== undefined) state.snakeSpringStrength = clampInt$2(config.snakeSpringStrength, 1, 1000, state.snakeSpringStrength);
  if (config.snakeDamping !== undefined) state.snakeDamping = clampNumber$1(config.snakeDamping, 0.90, 0.995, state.snakeDamping);
  if (config.snakeGroundFriction !== undefined) state.snakeGroundFriction = clampNumber$1(config.snakeGroundFriction, 0, 2.0, state.snakeGroundFriction);
  if (config.snakeSpeed !== undefined) state.snakeSpeed = clampInt$2(config.snakeSpeed, 100, 800, state.snakeSpeed);
  if (config.snakeWarmupFrames !== undefined) state.snakeWarmupFrames = clampInt$2(config.snakeWarmupFrames, 0, 240, state.snakeWarmupFrames);

  // Particle Fountain mode (simplified, water-like)
  if (config.particleFountainEmissionRate !== undefined) state.particleFountainEmissionRate = clampInt$2(config.particleFountainEmissionRate, 5, 100, state.particleFountainEmissionRate);
  if (config.particleFountainInitialVelocity !== undefined) state.particleFountainInitialVelocity = clampInt$2(config.particleFountainInitialVelocity, 200, 10000, state.particleFountainInitialVelocity);
  if (config.particleFountainSpreadAngle !== undefined) state.particleFountainSpreadAngle = clampInt$2(config.particleFountainSpreadAngle, 10, 120, state.particleFountainSpreadAngle);
  if (config.particleFountainWaterDrag !== undefined) state.particleFountainWaterDrag = clampNumber$1(config.particleFountainWaterDrag, 0.01, 0.2, state.particleFountainWaterDrag);
  if (config.particleFountainGravityMultiplier !== undefined) state.particleFountainGravityMultiplier = clampNumber$1(config.particleFountainGravityMultiplier, 0, 2.0, state.particleFountainGravityMultiplier);
  if (config.particleFountainUpwardForce !== undefined) state.particleFountainUpwardForce = clampInt$2(config.particleFountainUpwardForce, 0, 800, state.particleFountainUpwardForce);
  if (config.particleFountainMaxParticles !== undefined) state.particleFountainMaxParticles = clampInt$2(config.particleFountainMaxParticles, 20, 300, state.particleFountainMaxParticles);
  if (config.particleFountainLifetime !== undefined) state.particleFountainLifetime = clampNumber$1(config.particleFountainLifetime, 1.0, 30.0, state.particleFountainLifetime);
  if (config.particleFountainMouseRepelStrength !== undefined) state.particleFountainMouseRepelStrength = clampInt$2(config.particleFountainMouseRepelStrength, 10000, 100000, state.particleFountainMouseRepelStrength);
  if (config.particleFountainMouseRepelRadiusVw !== undefined) state.particleFountainMouseRepelRadiusVw = clampNumber$1(config.particleFountainMouseRepelRadiusVw, 1.0, 20.0, state.particleFountainMouseRepelRadiusVw);
  if (config.particleFountainWarmupFrames !== undefined) state.particleFountainWarmupFrames = clampInt$2(config.particleFountainWarmupFrames, 0, 240, state.particleFountainWarmupFrames);

  // Clamp scene micro-reaction tuning (defensive; UI-only)
  if (config.sceneImpactEnabled !== undefined) {
    state.sceneImpactEnabled = Boolean(config.sceneImpactEnabled);
  }
  if (config.sceneImpactMul !== undefined) {
    state.sceneImpactMul = clampNumber$1(config.sceneImpactMul, 0, 0.05, state.sceneImpactMul);
  } else if (config.brandLogoImpactMul !== undefined) {
    // Back-compat: reuse old logo tuning if scene tuning is absent.
    state.sceneImpactMul = clampNumber$1(config.brandLogoImpactMul, 0, 0.05, state.sceneImpactMul);
  }
  if (config.sceneImpactMobileMulFactor !== undefined) {
    state.sceneImpactMobileMulFactor = clampNumber$1(config.sceneImpactMobileMulFactor, 0.25, 3.0, state.sceneImpactMobileMulFactor);
  }
  if (config.sceneImpactLogoCompMul !== undefined) {
    state.sceneImpactLogoCompMul = clampNumber$1(config.sceneImpactLogoCompMul, 0.25, 6.0, state.sceneImpactLogoCompMul);
  }
  if (config.sceneImpactOvershoot !== undefined) {
    state.sceneImpactOvershoot = clampNumber$1(config.sceneImpactOvershoot, 0, 0.8, state.sceneImpactOvershoot);
  } else if (config.brandLogoOvershoot !== undefined) {
    state.sceneImpactOvershoot = clampNumber$1(config.brandLogoOvershoot, 0, 0.8, state.sceneImpactOvershoot);
  }
  if (config.sceneImpactAnticipation !== undefined) {
    state.sceneImpactAnticipation = clampNumber$1(config.sceneImpactAnticipation, 0, 0.6, state.sceneImpactAnticipation);
  } else if (config.brandLogoAnticipation !== undefined) {
    state.sceneImpactAnticipation = clampNumber$1(config.brandLogoAnticipation, 0, 0.6, state.sceneImpactAnticipation);
  }
  if (config.sceneImpactPressMs !== undefined) {
    state.sceneImpactPressMs = clampNumber$1(config.sceneImpactPressMs, 20, 300, state.sceneImpactPressMs);
  } else if (config.brandLogoPressMs !== undefined) {
    state.sceneImpactPressMs = clampNumber$1(config.brandLogoPressMs, 20, 300, state.sceneImpactPressMs);
  }
  if (config.sceneImpactReleaseMs !== undefined) {
    state.sceneImpactReleaseMs = clampNumber$1(config.sceneImpactReleaseMs, 40, 1200, state.sceneImpactReleaseMs);
  } else if (config.brandLogoReleaseMs !== undefined) {
    state.sceneImpactReleaseMs = clampNumber$1(config.brandLogoReleaseMs, 40, 1200, state.sceneImpactReleaseMs);
  }

  // Scene change SFX
  if (config.sceneChangeSoundEnabled !== undefined) state.sceneChangeSoundEnabled = Boolean(config.sceneChangeSoundEnabled);
  if (config.sceneChangeSoundIntensity !== undefined) state.sceneChangeSoundIntensity = clampNumber$1(config.sceneChangeSoundIntensity, 0, 1, state.sceneChangeSoundIntensity);
  if (config.sceneChangeSoundRadius !== undefined) state.sceneChangeSoundRadius = clampNumber$1(config.sceneChangeSoundRadius, 6, 60, state.sceneChangeSoundRadius);
  
  // Two-level padding system
  if (config.containerBorder !== undefined) state.containerBorder = config.containerBorder;
  if (config.simulationPadding !== undefined) state.simulationPadding = config.simulationPadding;
  if (config.contentPadding !== undefined) state.contentPadding = config.contentPadding;
  // Container inner shadow removed
  
  // Unified color system (backgrounds + frame)
  if (config.bgLight !== undefined) state.bgLight = config.bgLight;
  else state.bgLight = readTokenVar('--bg-light', state.bgLight);
  if (config.bgDark !== undefined) state.bgDark = config.bgDark;
  else state.bgDark = readTokenVar('--bg-dark', state.bgDark);
  // Frame colors (wall + browser chrome)
  if (config.frameColorLight !== undefined) {
    state.frameColorLight = config.frameColorLight;
  } else {
    state.frameColorLight = readTokenVar('--frame-color-light', state.frameColorLight);
  }
  if (config.frameColorDark !== undefined) {
    state.frameColorDark = config.frameColorDark;
  } else {
    state.frameColorDark = readTokenVar('--frame-color-dark', state.frameColorDark);
  }
  // Backward compatibility: if frameColor is set, use it for both light and dark
  if (config.frameColor !== undefined) {
    state.frameColor = config.frameColor;
    state.frameColorLight = config.frameColor;
    state.frameColorDark = config.frameColor;
  } else {
    // Unified wall color: use the first available value (light, dark, or default)
    // Then enforce it across all variants
    const unifiedColor = state.frameColorLight || state.frameColorDark || '#242529';
    state.frameColor = unifiedColor;
    state.frameColorLight = unifiedColor;
    state.frameColorDark = unifiedColor;
  }
  // Enforce unified wall/chrome color across light and dark modes (always the same)
  state.frameColorLight = state.frameColor;
  state.frameColorDark = state.frameColor;
  
  // Text colors
  if (config.textColorLight !== undefined) state.textColorLight = config.textColorLight;
  else state.textColorLight = readTokenVar('--text-color-light', state.textColorLight);
  if (config.textColorLightMuted !== undefined) state.textColorLightMuted = config.textColorLightMuted;
  else state.textColorLightMuted = readTokenVar('--text-color-light-muted', state.textColorLightMuted);
  if (config.textColorDark !== undefined) state.textColorDark = config.textColorDark;
  else state.textColorDark = readTokenVar('--text-color-dark', state.textColorDark);
  if (config.textColorDarkMuted !== undefined) state.textColorDarkMuted = config.textColorDarkMuted;
  else state.textColorDarkMuted = readTokenVar('--text-color-dark-muted', state.textColorDarkMuted);
  if (config.edgeLabelInsetAdjustPx !== undefined) {
    state.edgeLabelInsetAdjustPx = clampNumber$1(config.edgeLabelInsetAdjustPx, -500, 500, state.edgeLabelInsetAdjustPx);
  }
  
  // UI layout knobs (CSS var driven)
  if (config.topLogoWidthVw !== undefined) {
    state.topLogoWidthVw = clampNumber$1(config.topLogoWidthVw, 0, 120, state.topLogoWidthVw);
  }
  if (config.homeMainLinksBelowLogoPx !== undefined) {
    state.homeMainLinksBelowLogoPx = clampNumber$1(config.homeMainLinksBelowLogoPx, -500, 500, state.homeMainLinksBelowLogoPx);
  }
  if (config.footerNavBarTopVh !== undefined) {
    state.footerNavBarTopVh = clampNumber$1(config.footerNavBarTopVh, 0, 100, state.footerNavBarTopVh);
  }
  if (config.footerNavBarGapVw !== undefined) {
    state.footerNavBarGapVw = clampNumber$1(config.footerNavBarGapVw, 0, 30, state.footerNavBarGapVw);
  }

  // Link colors
  if (config.linkHoverColor !== undefined) state.linkHoverColor = config.linkHoverColor;
  else state.linkHoverColor = readTokenVar('--link-hover-color', state.linkHoverColor);

  // Link controls (hit areas + interaction)
  if (config.uiHitAreaMul !== undefined) {
    state.uiHitAreaMul = clampNumber$1(config.uiHitAreaMul, 0.5, 3.0, state.uiHitAreaMul);
  }
  if (config.uiIconCornerRadiusMul !== undefined) {
    state.uiIconCornerRadiusMul = clampNumber$1(config.uiIconCornerRadiusMul, 0.0, 1.0, state.uiIconCornerRadiusMul);
  }
  if (config.uiIconFramePx !== undefined) {
    state.uiIconFramePx = clampInt$2(config.uiIconFramePx, 0, 240, state.uiIconFramePx);
  } else {
    state.uiIconFramePx = clampInt$2(readTokenPx('--ui-icon-frame-size', state.uiIconFramePx), 0, 240, state.uiIconFramePx);
  }
  if (config.uiIconGlyphPx !== undefined) {
    state.uiIconGlyphPx = clampInt$2(config.uiIconGlyphPx, 0, 120, state.uiIconGlyphPx);
  } else {
    state.uiIconGlyphPx = clampInt$2(readTokenPx('--ui-icon-glyph-size', state.uiIconGlyphPx), 0, 120, state.uiIconGlyphPx);
  }
  if (config.uiIconGroupMarginPx !== undefined) {
    state.uiIconGroupMarginPx = clampInt$2(config.uiIconGroupMarginPx, -200, 200, state.uiIconGroupMarginPx);
  } else {
    state.uiIconGroupMarginPx = clampInt$2(readTokenPx('--ui-icon-group-margin', state.uiIconGroupMarginPx), -200, 200, state.uiIconGroupMarginPx);
  }

  // Layout: content padding clamp mode (area-based)
  if (config.linkTextPadding !== undefined) {
    state.linkTextPadding = clampNumber$1(config.linkTextPadding, 0, 200, state.linkTextPadding);
  }
  if (config.linkIconPadding !== undefined) {
    state.linkIconPadding = clampNumber$1(config.linkIconPadding, 0, 200, state.linkIconPadding);
  }
  if (config.linkColorInfluence !== undefined) {
    state.linkColorInfluence = clampNumber$1(config.linkColorInfluence, 0, 1, state.linkColorInfluence);
  }
  if (config.linkImpactScale !== undefined) {
    state.linkImpactScale = clampNumber$1(config.linkImpactScale, 0.5, 1.0, state.linkImpactScale);
  }
  if (config.linkImpactBlur !== undefined) {
    state.linkImpactBlur = clampNumber$1(config.linkImpactBlur, 0, 40, state.linkImpactBlur);
  }
  if (config.linkImpactDuration !== undefined) {
    state.linkImpactDuration = clampInt$2(config.linkImpactDuration, 0, 3000, state.linkImpactDuration);
  }

  // Hover target snap/bounce (scale-only; colors remain instant)
  if (config.hoverSnapEnabled !== undefined) {
    state.hoverSnapEnabled = Boolean(config.hoverSnapEnabled);
  }
  if (config.hoverSnapDuration !== undefined) {
    state.hoverSnapDuration = clampInt$2(config.hoverSnapDuration, 0, 2000, state.hoverSnapDuration);
  }
  if (config.hoverSnapOvershoot !== undefined) {
    state.hoverSnapOvershoot = clampNumber$1(config.hoverSnapOvershoot, 1.0, 1.35, state.hoverSnapOvershoot);
  }
  if (config.hoverSnapUndershoot !== undefined) {
    state.hoverSnapUndershoot = clampNumber$1(config.hoverSnapUndershoot, 0.7, 1.0, state.hoverSnapUndershoot);
  }
  
  // Logo colors derive from CSS (`--text-primary`) now; no config wiring needed.

  // Procedural noise (no GIF): texture + motion + look
  if (config.noiseEnabled !== undefined) state.noiseEnabled = Boolean(config.noiseEnabled);
  if (config.noiseSeed !== undefined) state.noiseSeed = clampInt$2(config.noiseSeed, 0, 999999, state.noiseSeed);
  if (config.noiseTextureSize !== undefined) state.noiseTextureSize = clampInt$2(config.noiseTextureSize, 64, 512, state.noiseTextureSize);
  if (config.noiseDistribution !== undefined) {
    const v = String(config.noiseDistribution);
    state.noiseDistribution = (v === 'uniform' || v === 'gaussian') ? v : state.noiseDistribution;
  }
  if (config.noiseMonochrome !== undefined) state.noiseMonochrome = Boolean(config.noiseMonochrome);
  if (config.noiseChroma !== undefined) state.noiseChroma = clampNumber$1(config.noiseChroma, 0, 1, state.noiseChroma);
  if (config.noiseMotion !== undefined) {
    const v = String(config.noiseMotion);
    state.noiseMotion = (v === 'jitter' || v === 'drift' || v === 'static') ? v : state.noiseMotion;
  }
  if (config.noiseMotionAmount !== undefined) state.noiseMotionAmount = clampNumber$1(config.noiseMotionAmount, 0, 2.5, state.noiseMotionAmount);
  if (config.noiseSpeedMs !== undefined) state.noiseSpeedMs = clampInt$2(config.noiseSpeedMs, 0, 10000, state.noiseSpeedMs);
  if (config.noiseSpeedVariance !== undefined) state.noiseSpeedVariance = clampNumber$1(config.noiseSpeedVariance, 0, 1, state.noiseSpeedVariance);
  if (config.noiseFlicker !== undefined) state.noiseFlicker = clampNumber$1(config.noiseFlicker, 0, 1, state.noiseFlicker);
  if (config.noiseFlickerSpeedMs !== undefined) state.noiseFlickerSpeedMs = clampInt$2(config.noiseFlickerSpeedMs, 0, 5000, state.noiseFlickerSpeedMs);
  if (config.noiseBlurPx !== undefined) state.noiseBlurPx = clampNumber$1(config.noiseBlurPx, 0, 6, state.noiseBlurPx);
  if (config.noiseContrast !== undefined) state.noiseContrast = clampNumber$1(config.noiseContrast, 0.25, 5, state.noiseContrast);
  if (config.noiseBrightness !== undefined) state.noiseBrightness = clampNumber$1(config.noiseBrightness, 0.25, 3, state.noiseBrightness);
  if (config.noiseSaturation !== undefined) state.noiseSaturation = clampNumber$1(config.noiseSaturation, 0, 3, state.noiseSaturation);
  if (config.noiseHue !== undefined) state.noiseHue = clampNumber$1(config.noiseHue, 0, 360, state.noiseHue);
  if (config.noiseSize !== undefined) state.noiseSize = clampNumber$1(config.noiseSize, 20, 600, state.noiseSize);
  if (config.noiseOpacity !== undefined) state.noiseOpacity = clampNumber$1(config.noiseOpacity, 0, 1, state.noiseOpacity);
  if (config.noiseOpacityLight !== undefined) state.noiseOpacityLight = clampNumber$1(config.noiseOpacityLight, 0, 1, state.noiseOpacityLight);
  if (config.noiseOpacityDark !== undefined) state.noiseOpacityDark = clampNumber$1(config.noiseOpacityDark, 0, 1, state.noiseOpacityDark);
  if (config.noiseBlendMode !== undefined) {
    const validModes = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'];
    const v = String(config.noiseBlendMode);
    state.noiseBlendMode = validModes.includes(v) ? v : state.noiseBlendMode;
  }
  if (config.noiseColorLight !== undefined) state.noiseColorLight = String(config.noiseColorLight);
  if (config.noiseColorDark !== undefined) state.noiseColorDark = String(config.noiseColorDark);
  if (config.detailNoiseOpacity !== undefined) state.detailNoiseOpacity = clampNumber$1(config.detailNoiseOpacity, 0, 1, state.detailNoiseOpacity);
  
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
  if (config.wallPreset !== undefined) state.wallPreset = config.wallPreset;

  // If a preset is specified, apply it as a baseline BEFORE reading any explicit low-level keys.
  // This ensures presets actually do something from config/load (and per-key overrides still win).
  if (state.wallPreset) {
    const preset = WALL_PRESETS?.[state.wallPreset];
    const values = preset?.values ? preset.values : preset;
    if (values) Object.assign(state, values);
  }

  if (config.wallSoftness !== undefined) state.wallSoftness = config.wallSoftness;
  if (config.wallBounciness !== undefined) state.wallBounciness = config.wallBounciness;
  
  if (config.wallWobbleMaxDeform !== undefined) state.wallWobbleMaxDeform = config.wallWobbleMaxDeform;
  if (config.wallWobbleStiffness !== undefined) state.wallWobbleStiffness = config.wallWobbleStiffness;
  if (config.wallWobbleDamping !== undefined) state.wallWobbleDamping = config.wallWobbleDamping;
  if (config.wallWobbleSigma !== undefined) state.wallWobbleSigma = config.wallWobbleSigma;
  if (config.wallWobbleCornerClamp !== undefined) state.wallWobbleCornerClamp = config.wallWobbleCornerClamp;
  if (config.wallWobbleMaxVel !== undefined) state.wallWobbleMaxVel = config.wallWobbleMaxVel;
  if (config.wallWobbleMaxImpulse !== undefined) state.wallWobbleMaxImpulse = config.wallWobbleMaxImpulse;
  if (config.wallWobbleMaxEnergyPerStep !== undefined) state.wallWobbleMaxEnergyPerStep = config.wallWobbleMaxEnergyPerStep;
  
  if (config.wallWobbleImpactThreshold !== undefined) state.wallWobbleImpactThreshold = config.wallWobbleImpactThreshold;
  if (config.wallWobbleSettlingSpeed !== undefined) state.wallWobbleSettlingSpeed = config.wallWobbleSettlingSpeed;
  
  // Wall performance tuning (Tier 1 & 2 optimizations)
  if (config.wallPhysicsSamples !== undefined) state.wallPhysicsSamples = config.wallPhysicsSamples;
  if (config.wallPhysicsSkipInactive !== undefined) state.wallPhysicsSkipInactive = config.wallPhysicsSkipInactive;
  if (config.wallPhysicsUpdateHz !== undefined) state.wallPhysicsUpdateHz = config.wallPhysicsUpdateHz;
  if (config.wallPhysicsMaxSubstepHz !== undefined) state.wallPhysicsMaxSubstepHz = config.wallPhysicsMaxSubstepHz;
  if (config.wallPhysicsInterpolation !== undefined) state.wallPhysicsInterpolation = config.wallPhysicsInterpolation;
  if (config.wallPhysicsAdaptiveSamples !== undefined) state.wallPhysicsAdaptiveSamples = config.wallPhysicsAdaptiveSamples;
  if (config.wallPhysicsMinSamples !== undefined) state.wallPhysicsMinSamples = config.wallPhysicsMinSamples;
  if (config.wallVisualDeformMul !== undefined) state.wallVisualDeformMul = config.wallVisualDeformMul;
  if (config.wallRenderDecimation !== undefined) state.wallRenderDecimation = config.wallRenderDecimation;

  // Wall colors: use frameColorLight/frameColorDark (all wall colors point to frameColor via CSS)
  // Legacy config support: if wallColorLight/wallColorDark are set, update frame colors
  if (config.wallColorLight !== undefined) {
    state.frameColorLight = config.wallColorLight;
    state.frameColor = config.wallColorLight; // Legacy compatibility
  }
  if (config.wallColorDark !== undefined) {
    state.frameColorDark = config.wallColorDark;
    if (!config.wallColorLight) {
      // Only update legacy frameColor if light wasn't set
      state.frameColor = config.wallColorDark;
    }
  }
  
  // Gate overlay settings
  if (config.modalOverlayEnabled !== undefined) state.modalOverlayEnabled = config.modalOverlayEnabled;
  if (config.modalOverlayOpacity !== undefined) state.modalOverlayOpacity = config.modalOverlayOpacity;
  if (config.modalOverlayBlurPx !== undefined) state.modalOverlayBlurPx = config.modalOverlayBlurPx;
  if (config.modalOverlayTransitionMs !== undefined) state.modalOverlayTransitionMs = config.modalOverlayTransitionMs;
  if (config.modalOverlayTransitionOutMs !== undefined) state.modalOverlayTransitionOutMs = config.modalOverlayTransitionOutMs;
  
  // Ball sizes are recalculated in detectResponsiveScale (called above)
  // which applies both sizeScale and responsiveScale

  // ─────────────────────────────────────────────────────────────────────────────
  // Layout: vw-native inputs + backwards-compatible px migration
  // ─────────────────────────────────────────────────────────────────────────────
  const basisW = getLayoutViewportWidthPx();

  // Canonical vw keys (preferred)
  if (config.containerBorderVw !== undefined) state.containerBorderVw = clampNumber$1(config.containerBorderVw, 0, 20, state.containerBorderVw);
  if (config.simulationPaddingVw !== undefined) state.simulationPaddingVw = clampNumber$1(config.simulationPaddingVw, 0, 20, state.simulationPaddingVw);
  if (config.contentPaddingRatio !== undefined) {
    const v = Number(config.contentPaddingRatio);
    if (Number.isFinite(v)) {
      // Back-compat: treat large values as legacy px (allow negatives), otherwise clamp as fraction.
      state.contentPaddingRatio = (Math.abs(v) > 1)
        ? clampNumber$1(v, -500, 500, state.contentPaddingRatio)
        : clampNumber$1(v, -0.2, 0.2, state.contentPaddingRatio);
    }
  }
  if (config.contentPaddingHorizontalRatio !== undefined) state.contentPaddingHorizontalRatio = clampNumber$1(config.contentPaddingHorizontalRatio, 0.1, 3.0, state.contentPaddingHorizontalRatio);
  if (config.contentPaddingBottomRatio !== undefined) {
    state.contentPaddingBottomRatio = clampNumber$1(config.contentPaddingBottomRatio, 0.5, 2.5, 1.3);
    document.documentElement.style.setProperty('--abs-content-pad-mul-bottom', String(state.contentPaddingBottomRatio));
  }
  if (config.mobileWallThicknessXFactor !== undefined) state.mobileWallThicknessXFactor = clampNumber$1(config.mobileWallThicknessXFactor, 0.5, 3.0, state.mobileWallThicknessXFactor);
  if (config.desktopWallThicknessFactor !== undefined) state.desktopWallThicknessFactor = clampNumber$1(config.desktopWallThicknessFactor, 0.5, 3.0, state.desktopWallThicknessFactor);
  if (config.mobileEdgeLabelsVisible !== undefined) state.mobileEdgeLabelsVisible = !!config.mobileEdgeLabelsVisible;
  if (config.wallRadiusVw !== undefined) state.wallRadiusVw = clampNumber$1(config.wallRadiusVw, 0, 40, state.wallRadiusVw);
  if (config.wallThicknessVw !== undefined) state.wallThicknessVw = clampNumber$1(config.wallThicknessVw, 0, 20, state.wallThicknessVw);
  if (config.wallThicknessAreaMultiplier !== undefined) state.wallThicknessAreaMultiplier = clampNumber$1(config.wallThicknessAreaMultiplier, 0, 10, state.wallThicknessAreaMultiplier);

  if (!(Number.isFinite(state.containerBorderVw) && state.containerBorderVw > 0)) {
    const tokenBorderVw = readTokenNumber('--container-border-vw', null);
    if (Number.isFinite(tokenBorderVw) && tokenBorderVw > 0) state.containerBorderVw = tokenBorderVw;
  }
  if (!(Number.isFinite(state.wallRadiusVw) && state.wallRadiusVw > 0)) {
    const tokenRadiusVw = readTokenNumber('--wall-radius-vw', null);
    if (Number.isFinite(tokenRadiusVw) && tokenRadiusVw > 0) state.wallRadiusVw = tokenRadiusVw;
  }
  if (!(Number.isFinite(state.wallThicknessVw) && state.wallThicknessVw > 0)) {
    const tokenThicknessVw = readTokenNumber('--wall-thickness-vw', null);
    if (Number.isFinite(tokenThicknessVw) && tokenThicknessVw > 0) state.wallThicknessVw = tokenThicknessVw;
  }

  // If vw values are missing, migrate from px so the current look is preserved at
  // the current (or virtual) viewport width.
  if (!(Number.isFinite(state.containerBorderVw) && state.containerBorderVw > 0)) {
    state.containerBorderVw = pxToVw(state.containerBorder, basisW);
  }
  if (!(Number.isFinite(state.simulationPaddingVw) && state.simulationPaddingVw >= 0)) {
    state.simulationPaddingVw = pxToVw(state.simulationPadding, basisW);
  }
  if (!(Number.isFinite(state.wallRadiusVw) && state.wallRadiusVw > 0)) {
    state.wallRadiusVw = pxToVw(state.wallRadius, basisW);
  }
  if (!(Number.isFinite(state.wallThicknessVw) && state.wallThicknessVw > 0)) {
    state.wallThicknessVw = pxToVw(state.wallThickness, basisW);
  }

  // Finally, derive px from vw (so downstream users always read px fields).
  applyLayoutFromVwToPx();
}

function getState() {
  return state;
}

function getGlobals() {
  return state;
}

/**
 * Mobile performance helper: apply `mobileObjectReductionFactor` to any
 * mode count/size that represents “number of objects”. On non-mobile,
 * returns the base count unchanged.
 */
function getMobileAdjustedCount(baseCount) {
  const globals = getGlobals();
  const n = Math.round(Number(baseCount) || 0);
  let factor = 1;
  if (globals.isMobile) {
    const mobileFactor = Math.max(0, Math.min(1, Number(globals.mobileObjectReductionFactor ?? 0.7)));
    const reductionThreshold = Math.max(0, Number(globals.mobileObjectReductionThreshold ?? 0));
    const shouldReduce = reductionThreshold > 0 ? n >= reductionThreshold : true;
    if (shouldReduce) {
      factor *= mobileFactor;
    }
  }
  if (globals.liteModeEnabled) {
    const liteFactor = Math.max(0, Math.min(1, Number(globals.liteModeObjectReductionFactor ?? 0.6)));
    factor *= liteFactor;
  }
  return Math.max(0, Math.round(n * factor));
}

function getConfig() {
  return state.config;
}

function setCanvas(canvas, ctx, container) {
  state.canvas = canvas;
  state.ctx = ctx;
  state.container = container;
}

function setMode$1(mode) {
  state.currentMode = mode;
}

function getBalls$1() {
  return state.balls;
}

function clearBalls() {
  state.balls.length = 0;
}

/**
 * Detect device type and apply fixed ball sizing
 * Desktop: 22px, Mobile: 15px
 */
function detectResponsiveScale() {
  const ua = navigator.userAgent || '';
  const isIPad = /iPad/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone/.test(ua);

  // Viewport breakpoint (lets desktop "responsive mode" behave like mobile)
  let isMobileViewport = false;
  try {
    const mediaMatch = Boolean(window.matchMedia && window.matchMedia('(max-width: 600px)').matches);
    const widthCandidates = [
      window.visualViewport?.width,
      window.innerWidth,
      document.documentElement?.clientWidth
    ].filter((value) => Number.isFinite(value));
    const measuredWidth = widthCandidates.length ? Math.min(...widthCandidates) : null;
    const widthMatch = Number.isFinite(measuredWidth) ? measuredWidth <= 600 : false;
    isMobileViewport = mediaMatch || widthMatch;
  } catch (e) {}

  const isMobileDevice = Boolean(isIPad || isIPhone);
  const nextMobileViewport = isMobileViewport;
  const nextMobileDevice = isMobileDevice;

  // Early-out: avoid work during resize drags unless we actually cross a breakpoint.
  const didChange =
    state.isMobile !== nextMobileDevice ||
    state.isMobileViewport !== nextMobileViewport;
  if (!didChange) return;

  state.isMobile = nextMobileDevice;
  state.isMobileViewport = nextMobileViewport;
  
  // Disable wall deformation on mobile for 60 FPS performance
  state.wallDeformationEnabled = !(state.isMobile || state.isMobileViewport);
  
  // Mobile performance optimizations
  if (state.isMobile || state.isMobileViewport) {
    state.physicsCollisionIterations = 4;
    state.mouseTrailEnabled = false;
  }

  // Update ball sizes based on device type
  updateBallSizes();

  // Update existing balls with new size
  try {
    const newSize = state.R_MED;
    if (Number.isFinite(newSize) && newSize > 0 && Array.isArray(state.balls) && state.balls.length) {
      for (let i = 0; i < state.balls.length; i++) {
        const b = state.balls[i];
        if (!b) continue;
        b.r = newSize;
        b.rBase = newSize;
      }
    }
  } catch (e) {}
}

/**
 * Update ball sizes based on device type (fixed pixel sizes)
 * Desktop: ballSizeDesktop (22px), Mobile: ballSizeMobile (15px)
 */
function updateBallSizes() {
  const isMobileDevice = state.isMobile || state.isMobileViewport;
  const size = isMobileDevice ? state.ballSizeMobile : state.ballSizeDesktop;
  state.R_MED = size;
  state.R_MIN = size;
  state.R_MAX = size;
}

var state$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  applyLayoutCSSVars: applyLayoutCSSVars,
  applyLayoutFromVwToPx: applyLayoutFromVwToPx,
  clearBalls: clearBalls,
  detectResponsiveScale: detectResponsiveScale,
  getBalls: getBalls$1,
  getConfig: getConfig,
  getEffectiveDPR: getEffectiveDPR,
  getGlobals: getGlobals,
  getLayoutViewportHeightPx: getLayoutViewportHeightPx,
  getLayoutViewportWidthPx: getLayoutViewportWidthPx,
  getMobileAdjustedCount: getMobileAdjustedCount,
  getNormalizedScreenArea: getNormalizedScreenArea,
  getScreenAreaPx: getScreenAreaPx,
  getState: getState,
  initState: initState,
  pxToVw: pxToVw,
  setCanvas: setCanvas,
  setEffectiveDPR: setEffectiveDPR,
  setMode: setMode$1,
  updateBallSizes: updateBallSizes,
  vwToPx: vwToPx
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        COLOR PALETTE SYSTEM (COMPLETE)                       ║
// ║              Extracted from balls-source.html lines 1405-1558                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function clamp01$2(t) {
  const n = Number(t);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function hexToRgb255(hex) {
  const h = String(hex || '').trim();
  if (!h) return null;
  const s = h[0] === '#' ? h.slice(1) : h;
  if (!(s.length === 3 || s.length === 6)) return null;
  const full = s.length === 3
    ? (s[0] + s[0] + s[1] + s[1] + s[2] + s[2])
    : s;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgb255ToHex({ r, g, b }) {
  const rr = (r | 0) & 255;
  const gg = (g | 0) & 255;
  const bb = (b | 0) & 255;
  const n = (rr << 16) | (gg << 8) | bb;
  return `#${n.toString(16).padStart(6, '0')}`;
}

function rgb01ToHsv({ r, g, b }) {
  const rr = clamp01$2(r);
  const gg = clamp01$2(g);
  const bb = clamp01$2(b);

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  if (d > 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max <= 0 ? 0 : (d / max);
  const v = max;
  return { h, s, v };
}

function hsvToRgb01({ h, s, v }) {
  const hh = ((Number(h) % 360) + 360) % 360;
  const ss = clamp01$2(s);
  const vv = clamp01$2(v);

  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;

  let rr = 0, gg = 0, bb = 0;
  if (hh < 60) { rr = c; gg = x; bb = 0; }
  else if (hh < 120) { rr = x; gg = c; bb = 0; }
  else if (hh < 180) { rr = 0; gg = c; bb = x; }
  else if (hh < 240) { rr = 0; gg = x; bb = c; }
  else if (hh < 300) { rr = x; gg = 0; bb = c; }
  else { rr = c; gg = 0; bb = x; }

  return { r: rr + m, g: gg + m, b: bb + m };
}

function clampHsvSat(s) {
  // Keep "alive" but still industrial (no neon).
  return Math.max(0, Math.min(0.88, Number(s) || 0));
}

function energizeHex(hex, { satMul = 0, valMul = 0 } = {}) {
  const rgb = hexToRgb255(hex);
  if (!rgb) return String(hex || '').trim() || '#ffffff';

  const hsv = rgb01ToHsv({ r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 });
  const s = clampHsvSat(hsv.s * (1 + (Number(satMul) || 0)));
  const v = clamp01$2(hsv.v * (1 + (Number(valMul) || 0)));
  const out = hsvToRgb01({ h: hsv.h, s, v });

  return rgb255ToHex({
    r: Math.round(out.r * 255),
    g: Math.round(out.g * 255),
    b: Math.round(out.b * 255)
  });
}

function lerp255(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function mixHex(a, b, t) {
  const tt = clamp01$2(t);
  const ra = hexToRgb255(a);
  const rb = hexToRgb255(b);
  if (!ra && !rb) return '#ffffff';
  if (!ra) return String(b);
  if (!rb) return String(a);
  const r = lerp255(ra.r, rb.r, tt);
  const g = lerp255(ra.g, rb.g, tt);
  const bb = lerp255(ra.b, rb.b, tt);
  return rgb255ToHex({ r, g, b: bb });
}

function clamp255(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 255 ? 255 : x;
}

/**
 * Push a color away from an anchor by a factor (>= 1).
 * Example: factor=1.25 makes the color 25% more "radical" vs the anchor.
 * This is used only at palette-build time (not in hot paths).
 */
function pushAwayHex(anchorHex, colorHex, factor = 1) {
  const f = Math.max(1, Number(factor) || 1);
  const a = hexToRgb255(anchorHex);
  const c = hexToRgb255(colorHex);
  if (!a && !c) return '#ffffff';
  if (!a) return String(colorHex);
  if (!c) return String(colorHex);
  const r = clamp255(a.r + (c.r - a.r) * f);
  const g = clamp255(a.g + (c.g - a.g) * f);
  const b = clamp255(a.b + (c.b - a.b) * f);
  return rgb255ToHex({ r, g, b });
}

function blendPalette(base, variant, variantWeight = 0.5) {
  const t = clamp01$2(variantWeight);
  const out = new Array(8);
  for (let i = 0; i < 8; i++) {
    out[i] = mixHex(base?.[i], variant?.[i], t);
  }
  return out;
}

function radicalizeVariant(tealBase, variant, factor = 1.25) {
  const out = new Array(8);
  for (let i = 0; i < 8; i++) out[i] = variant?.[i];
  // Only push the "character" slots: primary + accents.
  // Keep neutrals/white/black stable so overall contrast stays familiar.
  const idx = [3, 5, 6, 7];
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k];
    out[i] = pushAwayHex(tealBase?.[i], variant?.[i], factor);
  }
  return out;
}

function energizePalette(palette, energizeOpts) {
  const out = new Array(8);
  for (let i = 0; i < 8; i++) out[i] = palette?.[i];

  // Accent-only: keep neutrals stable so UI + contrast remains consistent.
  const idx = [3, 5, 6, 7];
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k];
    out[i] = energizeHex(out[i], energizeOpts);
  }
  return out;
}

function boostMostSaturatedInPalette(palette, satMul = 0.2) {
  const out = new Array(8);
  for (let i = 0; i < 8; i++) out[i] = palette?.[i];

  let bestIdx = -1;
  let bestSat = -1;
  for (let i = 0; i < 8; i++) {
    const hex = out[i];
    if (!hex) continue;
    const s = hsvSaturation(hex);
    if (s > bestSat) {
      bestSat = s;
      bestIdx = i;
    }
  }

  if (bestIdx >= 0) {
    out[bestIdx] = energizeHex(out[bestIdx], { satMul, valMul: 0 });
  }
  return out;
}

const BASE_PALETTES = {
  industrialTeal: {
    label: 'Industrial Teal',
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#00695c', '#000000', '#ff4013', '#0d5cb6', '#ffa000'],
    dark: ['#5b8378', '#345d51', '#8a928a', '#00e6c3', '#d5d5d5', '#ff6b47', '#5b9aff', '#ffb84d']
  },
  industrialRust: {
    label: 'Industrial Rust',
    // Warm copper + cobalt: distinct from teal chapter while still “industrial”.
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#a33a22', '#000000', '#00695c', '#1f4bb8', '#ff8a1f'],
    dark: ['#7f6f64', '#54433a', '#b6b1aa', '#ff6a3d', '#d5d5d5', '#00e6c3', '#6aa0ff', '#ffb15a']
  },
  industrialSlate: {
    label: 'Industrial Slate',
    // Cold slate + cyan/violet/orange: more chromatic “chapter” separation.
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#1f2937', '#000000', '#00a8cc', '#7c3aed', '#ff5d2e'],
    dark: ['#6f7780', '#3f4851', '#98a2b3', '#7dd3fc', '#d5d5d5', '#22d3ee', '#c084fc', '#ff7a45']
  },
  industrialAmber: {
    label: 'Industrial Amber',
    // Amber + violet + red: keeps industrial warmth but avoids “all teal-adjacent”.
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#d97706', '#000000', '#00695c', '#6b46c1', '#ff4013'],
    dark: ['#82745d', '#5a4b35', '#a9a193', '#fbbf24', '#d5d5d5', '#00e6c3', '#c4b5fd', '#ff6b47']
  },
  industrialViolet: {
    label: 'Industrial Violet',
    // Violet + muted chartreuse + rose: a clear “alt chapter” while staying restrained.
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#6b46c1', '#000000', '#00695c', '#7fbf2a', '#d94666'],
    dark: ['#7a6f83', '#52475b', '#a7a0b0', '#c084fc', '#d5d5d5', '#00e6c3', '#bef264', '#fb7185']
  },
  industrialForest: {
    label: 'Industrial Forest',
    // Forest + amber + violet: richer, less monotone “green-on-green”.
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#166534', '#000000', '#00695c', '#f59e0b', '#7c3aed'],
    dark: ['#637563', '#3d4f3f', '#98a593', '#4ade80', '#d5d5d5', '#00e6c3', '#fcd34d', '#c4b5fd']
  },
  industrialSteel: {
    label: 'Industrial Steel',
    // Steel + cyan + copper + olive: more contrast vs slate/teal.
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#334155', '#000000', '#0ea5e9', '#c2410c', '#65a30d'],
    dark: ['#6f737a', '#464a52', '#98a2ab', '#94a3b8', '#d5d5d5', '#38bdf8', '#fb923c', '#a3e635']
  }
};

// NOTE: The base palettes carry the “industrial teal psychology” via:
// - shared neutral roles (grey/white/black slots)
// - a recurring teal accent slot (index 5)
// We still add a *small* teal bias to keep chapters related, but let each chapter read clearly.
const TEAL_ANCHOR_WEIGHT_VARIANT = 0.85;
const TEAL_BASE = BASE_PALETTES.industrialTeal;
const RADICAL_FACTOR = 1.35; // push accents further from teal so chapters don’t collapse into the same hue band

// Make all chapters feel as "alive" (variance + vibrance) as Industrial Teal without shifting the core palette roles.
// Applied only at palette-build time (not hot paths).
const VARIANT_ENERGIZE_LIGHT = { satMul: 0.10, valMul: 0.03 };
const VARIANT_ENERGIZE_DARK = { satMul: 0.14, valMul: 0.07 };

const COLOR_TEMPLATES = {
  industrialTeal: {
    label: TEAL_BASE.label,
    light: boostMostSaturatedInPalette(TEAL_BASE.light, 0.2),
    dark: boostMostSaturatedInPalette(TEAL_BASE.dark, 0.2)
  },
  industrialRust: {
    label: BASE_PALETTES.industrialRust.label,
    light: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.light,
          radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialRust.light, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_LIGHT
      ),
      0.2
    ),
    dark: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.dark,
          radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialRust.dark, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_DARK
      ),
      0.2
    )
  },
  industrialSlate: {
    label: BASE_PALETTES.industrialSlate.label,
    light: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.light,
          radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialSlate.light, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_LIGHT
      ),
      0.2
    ),
    dark: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.dark,
          radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialSlate.dark, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_DARK
      ),
      0.2
    )
  },
  industrialAmber: {
    label: BASE_PALETTES.industrialAmber.label,
    light: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.light,
          radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialAmber.light, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_LIGHT
      ),
      0.2
    ),
    dark: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.dark,
          radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialAmber.dark, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_DARK
      ),
      0.2
    )
  },
  industrialViolet: {
    label: BASE_PALETTES.industrialViolet.label,
    light: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.light,
          radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialViolet.light, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_LIGHT
      ),
      0.2
    ),
    dark: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.dark,
          radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialViolet.dark, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_DARK
      ),
      0.2
    )
  },
  industrialForest: {
    label: BASE_PALETTES.industrialForest.label,
    light: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.light,
          radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialForest.light, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_LIGHT
      ),
      0.2
    ),
    dark: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.dark,
          radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialForest.dark, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_DARK
      ),
      0.2
    )
  },
  industrialSteel: {
    label: BASE_PALETTES.industrialSteel.label,
    light: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.light,
          radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialSteel.light, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_LIGHT
      ),
      0.2
    ),
    dark: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.dark,
          radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialSteel.dark, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_DARK
      ),
      0.2
    )
  }
};

// Story order for "chapters" (used by the template select + reload rotation).
const PALETTE_CHAPTER_ORDER = [
  'industrialTeal',
  'industrialRust',
  'industrialSlate',
  'industrialAmber',
  'industrialViolet',
  'industrialForest',
  'industrialSteel'
];

const PALETTE_ROTATION_STORAGE_KEY = 'abs_palette_chapter';

// Legacy fallback weights (only used if no valid `colorDistribution` is present).
const LEGACY_COLOR_WEIGHTS = [0.50, 0.25, 0.12, 0.06, 0.03, 0.02, 0.01, 0.01];

function clampIntFallback(v, min, max, fallback = min) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i < min ? min : i > max ? max : i;
}

function getDistribution(g) {
  const dist = g?.colorDistribution;
  return Array.isArray(dist) ? dist : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CURSOR COLOR (contrasty-only palette selection)
// - Single source of truth for cursor dot + trail
// - Event-driven (mode switch / reset / startup / palette change), not in hot paths
// ═══════════════════════════════════════════════════════════════════════════════

const CURSOR_SAFE_FALLBACK_INDICES = [3, 5, 6, 7];
const CURSOR_SAT_MIN = 0.18; // exclude greys/white/black; keep “ball color” feel

function clampInt$1(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return i < min ? min : i > max ? max : i;
}

function isArrayOfNumbers(v) {
  return Array.isArray(v) && v.every(x => Number.isFinite(Number(x)));
}

function hexToRgb01(hex) {
  const h = String(hex || '').trim();
  if (!h) return null;
  const s = h[0] === '#' ? h.slice(1) : h;
  if (!(s.length === 3 || s.length === 6)) return null;
  const full = s.length === 3
    ? (s[0] + s[0] + s[1] + s[1] + s[2] + s[2])
    : s;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return null;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return { r: r / 255, g: g / 255, b: b / 255 };
}

function srgbToLinear(c) {
  return c <= 0.04045 ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const rgb = hexToRgb01(hex);
  if (!rgb) return 1;
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hsvSaturation(hex) {
  const rgb = hexToRgb01(hex);
  if (!rgb) return 0;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const d = max - min;
  if (max <= 0) return 0;
  return d / max;
}

/**
 * Compute a WCAG-safe hover text color based on cursor color and background.
 * This is computed once when cursor color changes (not per-hover).
 * Returns a CSS rgb() string.
 */
function computeSafeHoverTextColor(cursorHex) {
  const globals = getGlobals();
  const isDark = globals?.isDarkMode || false;
  
  // Parse cursor color
  const cursorRgb = hexToRgb255(cursorHex);
  if (!cursorRgb) return null;
  
  // Get background color
  const bgHex = isDark ? (globals.bgDark || '#0a0a0a') : (globals.bgLight || '#f5f5f5');
  const baseBgRgb = hexToRgb255(bgHex);
  if (!baseBgRgb) return null;
  
  // Mix cursor color with background at 12% alpha (simulating the pill background)
  const bgAlpha = 0.12;
  const mixedBgRgb = {
    r: Math.round(baseBgRgb.r + (cursorRgb.r - baseBgRgb.r) * bgAlpha),
    g: Math.round(baseBgRgb.g + (cursorRgb.g - baseBgRgb.g) * bgAlpha),
    b: Math.round(baseBgRgb.b + (cursorRgb.b - baseBgRgb.b) * bgAlpha)
  };
  
  // Compute accessible text color
  const mixedLuma = relativeLuminance(rgb255ToHex(mixedBgRgb));
  const preferDirection = mixedLuma > 0.45 ? 'black' : 'white';
  const safeRgb = computeAccessibleColor(cursorRgb, mixedBgRgb, preferDirection);
  
  return `rgb(${safeRgb.r} ${safeRgb.g} ${safeRgb.b})`;
}

/**
 * Compute a WCAG AA-compliant color (4.5:1 contrast ratio).
 * Mixes the cursor color toward white or black until contrast is safe.
 */
function computeAccessibleColor(cursorRgb, bgRgb, preferDirection = null) {
  const target = 4.5; // WCAG AA for normal text
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  
  const tryDirection = (toward) => {
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const candidate = {
        r: Math.round(cursorRgb.r + (toward.r - cursorRgb.r) * t),
        g: Math.round(cursorRgb.g + (toward.g - cursorRgb.g) * t),
        b: Math.round(cursorRgb.b + (toward.b - cursorRgb.b) * t)
      };
      const cr = computeContrastRatio(candidate, bgRgb);
      if (cr >= target) return { rgb: candidate, t, cr };
    }
    return null;
  };
  
  const towardWhite = tryDirection(white);
  const towardBlack = tryDirection(black);
  
  // Prefer direction based on background luminance
  if (towardWhite && towardBlack) {
    if (preferDirection === 'black') return towardBlack.rgb;
    if (preferDirection === 'white') return towardWhite.rgb;
    // Default: smallest adjustment
    return towardWhite.t <= towardBlack.t ? towardWhite.rgb : towardBlack.rgb;
  }
  if (towardWhite) return towardWhite.rgb;
  if (towardBlack) return towardBlack.rgb;
  
  // Final fallback
  const whiteCr = computeContrastRatio(white, bgRgb);
  const blackCr = computeContrastRatio(black, bgRgb);
  return whiteCr >= blackCr ? white : black;
}

/**
 * WCAG contrast ratio between two RGB colors
 */
function computeContrastRatio(rgb1, rgb2) {
  const luma1 = computeRelativeLuminance(rgb1);
  const luma2 = computeRelativeLuminance(rgb2);
  const hi = Math.max(luma1, luma2);
  const lo = Math.min(luma1, luma2);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Relative luminance for RGB255 values
 */
function computeRelativeLuminance({ r, g, b }) {
  const toLinear = (c) => {
    const val = c / 255;
    return val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Desaturate greys (indices 0, 1) and align them with background hue
 * This makes greys less colored and more harmonious with the background
 * In dark mode, also darkens the greys for better contrast
 */
function desaturateGreysToBackground(palette, bgHex, isDarkMode = false) {
  if (!palette || !Array.isArray(palette)) return palette;
  const out = [...palette];
  
  // Extract hue from background color
  const bgRgb = hexToRgb01(bgHex);
  if (!bgRgb) return out;
  const bgHsv = rgb01ToHsv(bgRgb);
  
  // If background is too desaturated (pure grey), use a neutral hue (0)
  // Otherwise use the background's hue for harmony
  const bgHue = bgHsv.s < 0.05 ? 0 : bgHsv.h;
  
  // Process grey indices (0, 1) - skip neutrals (2 = white, 4 = black)
  const greyIndices = [0, 1];
  for (const idx of greyIndices) {
    const greyHex = out[idx];
    if (!greyHex) continue;
    
    const greyRgb = hexToRgb01(greyHex);
    if (!greyRgb) continue;
    const greyHsv = rgb01ToHsv(greyRgb);
    
    // Desaturate significantly (reduce to 5-10% of original saturation)
    // but shift hue to match background for harmony
    const desaturatedSat = Math.max(0, Math.min(0.15, greyHsv.s * 0.1));
    
    // In dark mode, darken the greys (reduce value/lightness by ~40-45%)
    // This makes them more subtle and better integrated with dark backgrounds
    let adjustedValue = greyHsv.v;
    if (isDarkMode) {
      // Darken: reduce value by ~45% (multiply by 0.55)
      // Keep a minimum value to ensure they're still visible
      adjustedValue = Math.max(0.15, greyHsv.v * 0.55);
    }
    
    // Convert back to RGB with desaturated saturation and background hue
    const desaturatedHsv = {
      h: bgHue,
      s: desaturatedSat,
      v: adjustedValue
    };
    
    const desaturatedRgb = hsvToRgb01(desaturatedHsv);
    out[idx] = rgb255ToHex({
      r: Math.round(desaturatedRgb.r * 255),
      g: Math.round(desaturatedRgb.g * 255),
      b: Math.round(desaturatedRgb.b * 255)
    });
  }
  
  return out;
}

function stampCursorCSSVar(hex) {
  try {
    document.documentElement.style.setProperty('--cursor-color', String(hex).trim() || '#000000');
    
    // Compute and set a WCAG-safe hover text color (once per cursor color change)
    const hoverFg = computeSafeHoverTextColor(hex);
    if (hoverFg) {
      document.documentElement.style.setProperty('--cursor-hover-fg', hoverFg);
    }
  } catch (_) { /* no-op */ }
}

function resolveCursorHexFromIndex(colors, idx) {
  const list = colors && colors.length ? colors : [];
  const i = clampInt$1(idx, 0, Math.max(0, Math.min(7, list.length - 1)));
  return list[i] || '#000000';
}

function getCursorCandidateIndices(colors, globalsOverride) {
  const g = globalsOverride || getGlobals();
  const list = colors && colors.length ? colors : [];
  const maxIdx = Math.min(7, list.length - 1);
  if (maxIdx < 0) return [];

  const lumaMax = Number.isFinite(Number(g.cursorColorLumaMax)) ? Number(g.cursorColorLumaMax) : 0.62;
  const allow = isArrayOfNumbers(g.cursorColorAllowIndices)
    ? g.cursorColorAllowIndices.map(x => clampInt$1(x, 0, 7))
    : [];
  const deny = isArrayOfNumbers(g.cursorColorDenyIndices)
    ? g.cursorColorDenyIndices.map(x => clampInt$1(x, 0, 7))
    : [];

  const denySet = new Set(deny);
  const allowSet = allow.length ? new Set(allow) : null;

  const out = [];
  for (let i = 0; i <= maxIdx; i++) {
    if (denySet.has(i)) continue;
    if (allowSet && !allowSet.has(i)) continue;
    const hex = list[i];
    if (!hex) continue;
    const luma = relativeLuminance(hex);
    if (luma > lumaMax) continue;          // too light
    const sat = hsvSaturation(hex);
    if (sat < CURSOR_SAT_MIN) continue;    // too grey/neutral
    out.push(i);
  }

  if (out.length) return out;

  // Hard fallback: always try the “nice” indices first.
  const safe = [];
  for (const i of CURSOR_SAFE_FALLBACK_INDICES) {
    if (i <= maxIdx && !denySet.has(i) && (!allowSet || allowSet.has(i))) safe.push(i);
  }
  if (safe.length) return safe;

  // Last resort: any existing index not denied.
  for (let i = 0; i <= maxIdx; i++) {
    if (!denySet.has(i) && (!allowSet || allowSet.has(i))) safe.push(i);
  }
  return safe;
}

function applyCursorColorIndex(index, { forceMode } = {}) {
  const g = getGlobals();
  const colors = g.currentColors;
  const candidates = getCursorCandidateIndices(colors, g);

  // If the desired index is not a candidate, snap to first candidate.
  const desired = clampInt$1(index, 0, 7);
  const finalIdx = candidates.includes(desired) ? desired : (candidates[0] ?? desired);
  const hex = resolveCursorHexFromIndex(colors, finalIdx);

  if (forceMode) g.cursorColorMode = forceMode;
  g.cursorColorIndex = finalIdx;
  g.cursorColorHex = hex;
  stampCursorCSSVar(hex);
  return { index: finalIdx, hex };
}

function maybeAutoPickCursorColor(reason = 'auto') {
  const g = getGlobals();
  if (g.cursorColorMode !== 'auto') {
    // Still ensure CSS var is aligned with current palette variant.
    applyCursorColorIndex(g.cursorColorIndex, { forceMode: g.cursorColorMode });
    return false;
  }

  const colors = g.currentColors;
  const candidates = getCursorCandidateIndices(colors, g);
  if (!candidates.length) return false;

  const last = Number.isFinite(Number(g._lastCursorColorIndex)) ? Number(g._lastCursorColorIndex) : -1;
  let pick = candidates[(Math.random() * candidates.length) | 0];
  if (candidates.length > 1 && pick === last) {
    // Avoid immediate repeats when possible.
    pick = candidates[(Math.random() * candidates.length) | 0];
    if (pick === last) pick = candidates[(candidates.indexOf(last) + 1) % candidates.length];
  }
  g._lastCursorColorIndex = pick;

  applyCursorColorIndex(pick, { forceMode: 'auto' });
  return true;
}

function getCurrentPalette(templateName) {
  const globals = getGlobals();
  const template = COLOR_TEMPLATES[templateName];
  if (!template) return COLOR_TEMPLATES.industrialTeal.light;
  
  const rawPalette = globals.isDarkMode ? template.dark : template.light;
  const isDarkMode = globals.isDarkMode || false;
  
  // Desaturate greys to align with background hue (all palettes)
  // In dark mode, also darken the greys for better contrast
  const bgColor = isDarkMode ? (globals.bgDark || '#0a0a0a') : (globals.bgLight || '#f5f5f5');
  return desaturateGreysToBackground(rawPalette, bgColor, isDarkMode);
}

/**
 * Pick a random color and return both the color hex and the distribution index
 * @returns {{ color: string, distributionIndex: number }} Color and its distribution index (0-6)
 */
function pickRandomColorWithIndex() {
  const globals = getGlobals();
  const colors = globals.currentColors;
  
  if (!colors || colors.length === 0) {
    console.warn('No colors available, using fallback');
    return { color: '#ffffff', distributionIndex: 0 };
  }
  
  // Primary: use the runtime color distribution (7 labels → 7 distinct palette indices).
  // Hot-path safe: O(7) work, zero allocations.
  const dist = getDistribution(globals);
  if (dist && dist.length) {
    let total = 0;
    for (let i = 0; i < dist.length; i++) {
      const w = Number(dist[i]?.weight);
      if (Number.isFinite(w) && w > 0) total += w;
    }
    if (total > 0) {
      let r = Math.random() * total;
      for (let i = 0; i < dist.length; i++) {
        const row = dist[i];
        const w = Number(row?.weight);
        if (!Number.isFinite(w) || w <= 0) continue;
        r -= w;
        if (r <= 0) {
          const idx = clampIntFallback(row?.colorIndex, 0, 7, 0);
          return { color: colors[idx] || colors[0] || '#ffffff', distributionIndex: i };
        }
      }
      // Numeric edge case: fall through to a deterministic row.
      const last = dist[dist.length - 1];
      const idx = clampIntFallback(last?.colorIndex, 0, 7, 0);
      return { color: colors[idx] || colors[0] || '#ffffff', distributionIndex: dist.length - 1 };
    }
  }

  // Fallback: legacy weights over the first 8 palette entries.
  const random = Math.random();
  let cumulativeWeight = 0;
  const maxIdx = Math.min(colors.length, LEGACY_COLOR_WEIGHTS.length, 8);
  for (let i = 0; i < maxIdx; i++) {
    cumulativeWeight += LEGACY_COLOR_WEIGHTS[i];
    if (random <= cumulativeWeight) return { color: colors[i], distributionIndex: i };
  }
  return { color: colors[Math.min(colors.length - 1, 7)] || '#ffffff', distributionIndex: 0 };
}

function pickRandomColor() {
  return pickRandomColorWithIndex().color;
}

function applyColorTemplate(templateName) {
  const globals = getGlobals();
  globals.currentTemplate = templateName;
  globals.currentColors = getCurrentPalette(templateName);

  // Persist for chapter rotation and keep any UI selects in sync.
  try {
    localStorage.setItem(PALETTE_ROTATION_STORAGE_KEY, String(templateName || ''));
  } catch (_) { /* no-op */ }
  try {
    const select = document.getElementById('colorSelect');
    if (select) select.value = templateName;
  } catch (_) { /* no-op */ }
  
  // Cursor color must remain valid across template + theme changes.
  // Do NOT auto-rotate here; only re-resolve to the new palette variant (or snap if invalid).
  if (globals.cursorColorMode !== 'auto' && globals.cursorColorMode !== 'manual') {
    globals.cursorColorMode = 'auto';
  }
  applyCursorColorIndex(globals.cursorColorIndex, { forceMode: globals.cursorColorMode });
  
  // Update existing ball colors
  updateExistingBallColors();
  
  // Sync CSS variables
  syncPaletteVars(globals.currentColors);
  
  // Update UI color pickers
  updateColorPickersUI();
  
  // Notify optional UI consumers (e.g., dev control panel swatches).
  // Event-driven; not used in hot paths.
  try {
    window.dispatchEvent(new CustomEvent('bb:paletteChanged', { detail: { template: templateName } }));
  } catch (_) { /* no-op */ }
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
  for (const key of PALETTE_CHAPTER_ORDER) {
    const template = COLOR_TEMPLATES[key];
    if (!template) continue;
    const option = document.createElement('option');
    option.value = key;
    option.textContent = template.label;
    select.appendChild(option);
  }
  
  const globals = getGlobals();
  select.value = globals.currentTemplate;
}

/**
 * Rotate to the next palette chapter.
 * - Intended to be called once on each page load (before initializeDarkMode()).
 * - Applies only to cursor + balls (via applyColorTemplate in dark-mode init).
 */
function rotatePaletteChapterOnReload() {
  const globals = getGlobals();
  const order = Array.isArray(PALETTE_CHAPTER_ORDER) && PALETTE_CHAPTER_ORDER.length
    ? PALETTE_CHAPTER_ORDER
    : Object.keys(COLOR_TEMPLATES);
  if (!order.length) return null;

  let lastKey = null;
  try { lastKey = localStorage.getItem(PALETTE_ROTATION_STORAGE_KEY); } catch (_) {}

  const lastIndex = typeof lastKey === 'string' ? order.indexOf(lastKey) : -1;
  // First visit (or invalid stored key): start on a random chapter for surprise,
  // then continue rotating in story order on subsequent reloads.
  const nextIndex = lastIndex >= 0
    ? (lastIndex + 1) % order.length
    : ((Math.random() * order.length) | 0);
  const nextKey = order[nextIndex];

  globals.currentTemplate = nextKey;
  try { localStorage.setItem(PALETTE_ROTATION_STORAGE_KEY, nextKey); } catch (_) {}
  return nextKey;
}

var colors$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  COLOR_TEMPLATES: COLOR_TEMPLATES,
  PALETTE_CHAPTER_ORDER: PALETTE_CHAPTER_ORDER,
  applyColorTemplate: applyColorTemplate,
  applyCursorColorIndex: applyCursorColorIndex,
  getCurrentPalette: getCurrentPalette,
  getCursorCandidateIndices: getCursorCandidateIndices,
  maybeAutoPickCursorColor: maybeAutoPickCursorColor,
  pickRandomColor: pickRandomColor,
  pickRandomColorWithIndex: pickRandomColorWithIndex,
  populateColorSelect: populateColorSelect,
  rotatePaletteChapterOnReload: rotatePaletteChapterOnReload
});

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
  // Synthesis (longer decay for chime-like sustain)
  attackTime: 0.003,
  decayTime: 0.12,
  harmonicGain: 0.02,
  
  // Filter (timbre)
  filterBaseFreq: 580,
  filterVelocityRange: 400,
  filterQ: 0.18,
  filterMinHz: 350,
  filterMaxHz: 2800,
  
  // Pitch mapping (radius → frequency) - wider range for melodic chimes
  pitchMinHz: 220,
  pitchMaxHz: 880,
  pitchCurve: 1.2,
  
  // Reverb (ethereal shimmer)
  reverbDecay: 0.25,
  reverbWetMix: 0.18,
  reverbHighDamp: 0.55,
  
  // Volume / dynamics (reduced 50% for subtle chimes)
  minGain: 0.001,
  maxGain: 0.0125,
  masterGain: 0.28,
  voiceGainMax: 0.02,
  
  // Performance
  minTimeBetweenSounds: 0.012,
  
  // Stereo
  maxPan: 0.15,
  
  // Noise transient (softened for chime character)
  noiseTransientEnabled: true,
  noiseTransientGain: 0.018,
  noiseTransientDecay: 0.004,
  noiseTransientFilterMin: 800,
  noiseTransientFilterMax: 2400,
  noiseTransientQ: 0.8,
  
  // Sparkle partial (glass-like micro-chimes for aethereal quality)
  sparkleGain: 0.035,
  sparkleRatioMin: 2.0,
  sparkleRatioMax: 5.0,
  sparkleDecayMul: 0.85,
  
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

let WHEEL_SFX_CONFIG = {
  // Continuous wheel loop (legacy). When disabled, `updateWheelSfx()` will stop any loops.
  continuousEnabled: false,
  tickGainMul: 1.0,
  swishGainMul: 1.0,

  tickBaseGain: 0.05,
  tickMinVelocity: 50,
  tickMaxVelocity: 1600,
  tickMinRate: 0.6,
  tickMaxRate: 9,
  swishBaseGain: 0.04,
  swishMinVelocity: 220,
  swishMaxVelocity: 2200,
  swishMinHz: 600,
  swishMaxHz: 2200,

  // Discrete click used by portfolio carousel when a project passes center
  centerGain: 0.08,
  centerFilterHz: 1600,

  snapGain: 0.12,
  openGain: 0.12,
  openFilterHz: 1800,
  closeGain: 0.10,
  closeFilterHz: 1600,
  snapDebounceMs: 300,
  stopDelayMs: 60,
};

function updateWheelSfxConfig(updates) {
  for (const [key, value] of Object.entries(updates)) {
    if (key in WHEEL_SFX_CONFIG) {
      WHEEL_SFX_CONFIG[key] = value;
    }
  }
}

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
let wheelBus = null;

let isEnabled$1 = false;
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
let prefersReducedMotion$3 = false;

// Shared noise buffer (created once, reused)
let sharedNoiseBuffer = null;

// Wheel SFX state
let wheelTickBuffer = null;
let wheelTickSource = null;
let wheelTickGain = null;
let wheelTickFilter = null;
let wheelSwishBuffer = null;
let wheelSwishSource = null;
let wheelSwishGain = null;
let wheelSwishFilter = null;
let wheelStopTimer = null;

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
    prefersReducedMotion$3 = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => {
      prefersReducedMotion$3 = e.matches;
    });
  }
}

/**
 * Apply runtime-config overrides for sound.
 *
 * Supported config shapes:
 * - { soundPreset: "crystalPebbles", soundConfig: { ...CONFIG_KEYS } }
 * - { soundPreset: "crystalPebbles", <CONFIG_KEYS>: <value>, ... }
 */
function applySoundConfigFromRuntimeConfig(runtimeConfig) {
  const cfg = runtimeConfig && typeof runtimeConfig === 'object' ? runtimeConfig : null;
  if (!cfg) return;

  // Preset first (sets baseline)
  if (typeof cfg.soundPreset === 'string') {
    applySoundPreset(cfg.soundPreset);
  }

  // Explicit object overrides
  if (cfg.soundConfig && typeof cfg.soundConfig === 'object') {
    updateSoundConfig(cfg.soundConfig);
    return;
  }

  // Flat-key overrides (only if key exists in CONFIG)
  const updates = {};
  let hasAny = false;
  for (const [k, v] of Object.entries(cfg)) {
    if (k in CONFIG) {
      updates[k] = v;
      hasAny = true;
    }
  }
  if (hasAny) updateSoundConfig(updates);
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
    isEnabled$1 = true;
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
  
  // Limiter (aggressive clip prevention)
  limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 3;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;

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

  ensureWheelBus();
  
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

function ensureWheelBus() {
  if (!audioContext) return;
  if (!wheelBus) {
    wheelBus = audioContext.createGain();
    wheelBus.gain.value = 1;
  } else {
    try { wheelBus.disconnect(); } catch (e) {}
  }
  if (limiter) {
    wheelBus.connect(limiter);
  } else {
    wheelBus.connect(audioContext.destination);
  }
}

function createWheelTickBuffer() {
  if (wheelTickBuffer || !audioContext) return;
  const sampleRate = audioContext.sampleRate;
  const duration = 0.045;
  const length = Math.floor(sampleRate * duration);
  wheelTickBuffer = audioContext.createBuffer(1, length, sampleRate);
  const data = wheelTickBuffer.getChannelData(0);
  const noiseEnd = Math.floor(sampleRate * 0.003);
  const sineEnd = Math.floor(sampleRate * 0.010);
  for (let i = 0; i < noiseEnd; i++) {
    const decay = Math.exp(-i / noiseEnd * 6);
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  const freq = 880;
  for (let i = noiseEnd; i < sineEnd; i++) {
    const t = i / sampleRate;
    const env = 0.65 * (1 - (i - noiseEnd) / (sineEnd - noiseEnd));
    data[i] = Math.sin(2 * Math.PI * freq * t) * env;
  }
}

function createWheelSwishBuffer() {
  if (wheelSwishBuffer || !audioContext) return;
  const sampleRate = audioContext.sampleRate;
  const duration = 0.28;
  const length = Math.floor(sampleRate * duration);
  wheelSwishBuffer = audioContext.createBuffer(1, length, sampleRate);
  const data = wheelSwishBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = t < 0.08 ? t / 0.08 : (t > 0.92 ? (1 - t) / 0.08 : 1);
    data[i] = (Math.random() * 2 - 1) * env * 0.6;
  }
}

function startWheelLoops() {
  if (!audioContext) return;
  if (wheelTickSource && wheelSwishSource) return;
  ensureWheelBus();
  createWheelTickBuffer();
  wheelTickSource = audioContext.createBufferSource();
  wheelTickSource.buffer = wheelTickBuffer;
  wheelTickSource.loop = true;
  wheelTickGain = audioContext.createGain();
  wheelTickGain.gain.value = 0;
  wheelTickFilter = audioContext.createBiquadFilter();
  wheelTickFilter.type = 'highpass';
  wheelTickFilter.frequency.value = 700;
  wheelTickSource.connect(wheelTickFilter).connect(wheelTickGain).connect(wheelBus);
  wheelTickSource.start();

  createWheelSwishBuffer();
  wheelSwishSource = audioContext.createBufferSource();
  wheelSwishSource.buffer = wheelSwishBuffer;
  wheelSwishSource.loop = true;
  wheelSwishGain = audioContext.createGain();
  wheelSwishGain.gain.value = 0;
  wheelSwishFilter = audioContext.createBiquadFilter();
  wheelSwishFilter.type = 'bandpass';
  wheelSwishFilter.frequency.value = WHEEL_SFX_CONFIG.swishMinHz;
  wheelSwishFilter.Q.value = 0.8;
  wheelSwishSource.connect(wheelSwishFilter).connect(wheelSwishGain).connect(wheelBus);
  wheelSwishSource.start();
}

function stopWheelLoops() {
  if (wheelStopTimer) {
    clearTimeout(wheelStopTimer);
    wheelStopTimer = null;
  }
  if (wheelTickSource) {
    try { wheelTickSource.stop(); } catch (e) {}
    wheelTickSource.disconnect();
    wheelTickGain.disconnect();
    wheelTickFilter.disconnect();
    wheelTickSource = wheelTickGain = wheelTickFilter = null;
  }
  if (wheelSwishSource) {
    try { wheelSwishSource.stop(); } catch (e) {}
    wheelSwishSource.disconnect();
    wheelSwishGain.disconnect();
    wheelSwishFilter.disconnect();
    wheelSwishSource = wheelSwishGain = wheelSwishFilter = null;
  }
}

function playWheelClick(gain, filterHz) {
  if (!isEnabled$1 || !isUnlocked || !audioContext || prefersReducedMotion$3) return;
  ensureWheelBus();
  createWheelTickBuffer();
  const src = audioContext.createBufferSource();
  src.buffer = wheelTickBuffer;
  const g = audioContext.createGain();
  g.gain.value = gain;
  const lp = audioContext.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = filterHz;
  src.connect(lp).connect(g).connect(wheelBus);
  src.start();
}

function updateWheelSfx(velocityPxPerSec = 0) {
  if (!isEnabled$1 || !isUnlocked || !audioContext || prefersReducedMotion$3) {
    stopWheelLoops();
    return;
  }
  if (!WHEEL_SFX_CONFIG.continuousEnabled) {
    stopWheelLoops();
    return;
  }
  const speed = Math.abs(velocityPxPerSec);
  if (!Number.isFinite(speed)) return;

  if (speed < WHEEL_SFX_CONFIG.tickMinVelocity) {
    if (wheelTickGain) {
      const now = audioContext.currentTime;
      wheelTickGain.gain.setTargetAtTime(0, now, 0.05);
    }
    if (wheelSwishGain) {
      const now = audioContext.currentTime;
      wheelSwishGain.gain.setTargetAtTime(0, now, 0.08);
    }
    if (!wheelStopTimer) {
      wheelStopTimer = setTimeout(stopWheelLoops, WHEEL_SFX_CONFIG.stopDelayMs);
    }
    return;
  }

  if (wheelStopTimer) {
    clearTimeout(wheelStopTimer);
    wheelStopTimer = null;
  }

  startWheelLoops();
  const now = audioContext.currentTime;
  const tickNorm = clamp$6(
    (speed - WHEEL_SFX_CONFIG.tickMinVelocity) /
      (WHEEL_SFX_CONFIG.tickMaxVelocity - WHEEL_SFX_CONFIG.tickMinVelocity),
    0,
    1
  );
  const tickRate = WHEEL_SFX_CONFIG.tickMinRate +
    ((WHEEL_SFX_CONFIG.tickMaxRate - WHEEL_SFX_CONFIG.tickMinRate) * tickNorm);
  if (wheelTickSource) {
    wheelTickSource.playbackRate.setTargetAtTime(tickRate, now, 0.04);
  }
  if (wheelTickGain) {
    const mul = Number.isFinite(WHEEL_SFX_CONFIG.tickGainMul) ? WHEEL_SFX_CONFIG.tickGainMul : 1.0;
    const gain = (WHEEL_SFX_CONFIG.tickBaseGain * (0.35 + tickNorm * 0.75)) * Math.max(0, mul);
    wheelTickGain.gain.setTargetAtTime(gain, now, 0.05);
  }

  const swishNorm = clamp$6(
    (speed - WHEEL_SFX_CONFIG.swishMinVelocity) /
      (WHEEL_SFX_CONFIG.swishMaxVelocity - WHEEL_SFX_CONFIG.swishMinVelocity),
    0,
    1
  );
  if (wheelSwishGain) {
    const mul = Number.isFinite(WHEEL_SFX_CONFIG.swishGainMul) ? WHEEL_SFX_CONFIG.swishGainMul : 1.0;
    const gain = (WHEEL_SFX_CONFIG.swishBaseGain * Math.pow(swishNorm, 1.4)) * Math.max(0, mul);
    wheelSwishGain.gain.setTargetAtTime(gain, now, 0.08);
  }
  if (wheelSwishFilter) {
    const freq = WHEEL_SFX_CONFIG.swishMinHz +
      ((WHEEL_SFX_CONFIG.swishMaxHz - WHEEL_SFX_CONFIG.swishMinHz) * swishNorm);
    wheelSwishFilter.frequency.setTargetAtTime(freq, now, 0.08);
  }
}

function playWheelSnap() {
  playWheelClick(WHEEL_SFX_CONFIG.snapGain, 1600);
}

function playWheelCenterClick() {
  playWheelClick(WHEEL_SFX_CONFIG.centerGain, WHEEL_SFX_CONFIG.centerFilterHz || 1600);
}

function playWheelOpen() {
  playWheelClick(WHEEL_SFX_CONFIG.openGain, WHEEL_SFX_CONFIG.openFilterHz || 1800);
}

function playWheelClose() {
  playWheelClick(WHEEL_SFX_CONFIG.closeGain, WHEEL_SFX_CONFIG.closeFilterHz || 1600);
}

function playHoverSound() {
  if (!isEnabled$1 || !isUnlocked || !audioContext || prefersReducedMotion$3) return;
  playWheelClick(0.099, 2200);
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
  if (!isEnabled$1 || !isUnlocked || !audioContext || prefersReducedMotion$3) return;
  
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
  voice.noiseFilter.Q.value = clamp$6(CONFIG.noiseTransientQ || 1.2, 0.5, 8.0);
  
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
    const ratio = clamp$6(rMin + Math.random() * (rMax - rMin), 1.2, 10.0);
    sparkleOsc.frequency.value = variedFreq * vary(ratio, 0.02);
    
    const sparkleEnv = audioContext.createGain();
    const sparkleDecay = Math.max(
      0.012,
      finalDecay * clamp$6(CONFIG.sparkleDecayMul || 0.65, 0.25, 0.95)
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

function clamp$6(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/** Apply tone safety (prevent brittle/ugly extreme tones) */
function applyToneSafety(frequency, gain, filterFreq) {
  const t = clamp$6(
    (frequency - CONFIG.toneSafetyMinHz) / (CONFIG.toneSafetyMaxHz - CONFIG.toneSafetyMinHz),
    0, 1
  );

  const exp = CONFIG.toneSafetyExponent;
  const high = Math.pow(t, exp);
  const low = Math.pow(1 - t, exp);

  const gainMul = clamp$6(
    1 - (CONFIG.toneSafetyHighGainAtten * high) - (CONFIG.toneSafetyLowGainAtten * low),
    0.6, 1
  );
  let safeGain = Math.min(gain * gainMul, CONFIG.voiceGainMax);

  const brightMul = clamp$6(1 - CONFIG.toneSafetyHighBrightAtten * high, 0.55, 1);
  let safeFilter = clamp$6(filterFreq * brightMul, CONFIG.filterMinHz, CONFIG.filterMaxHz);

  return { gain: safeGain, filterFreq: safeFilter };
}

/** Map ball radius to organic frequency (non-melodic) */
function radiusToFrequency(radius) {
  const minR = 8, maxR = 55;
  const normalized = clamp$6((radius - minR) / (maxR - minR), 0, 1);
  const inv = 1 - normalized;
  
  const minHz = clamp$6(CONFIG.pitchMinHz || 145, 40, 6000);
  const maxHz = clamp$6(CONFIG.pitchMaxHz || 280, minHz + 10, 12000);
  const curve = clamp$6(CONFIG.pitchCurve || 1.0, 0.5, 2.5);
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
  isEnabled$1 = !isEnabled$1;
  if (!isEnabled$1) stopWheelLoops();
  emitSoundStateChange();
  return isEnabled$1;
}

/** Get current sound state */
function getSoundState() {
  return {
    isUnlocked,
    isEnabled: isEnabled$1,
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
const reusablePairs = [];
const pairPool = [];

function collectPairsSorted() {
  const globals = getGlobals();
  const balls = globals.balls;
  const canvas = globals.canvas;
  const R_MAX = globals.R_MAX;
  const spacingRatio = globals.ballSpacing || 0; // Ratio of average radius (0.1 = 10% of ball size)
  
  const n = balls.length;
  // Always reuse the same array to avoid per-frame allocations.
  reusablePairs.length = 0;
  if (n < 2) return reusablePairs;

  const reuseGrid = globals.physicsSpatialGridOptimization !== false;

  // Fast path: if everything is sleeping, avoid grid build + pair sort entirely.
  // (Very common in Pit mode after settling.)
  if (reuseGrid) {
    let anyAwake = false;
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (b && !b.isSleeping) { anyAwake = true; break; }
    }
    if (!anyAwake) return reusablePairs;
  }
  
  // Cell size must account for spacing: max collision distance is R_MAX*2*(1+spacingRatio/2)
  // since spacing is applied to the average radius. Using (1 + spacingRatio) to be safe.
  const cellSize = Math.max(1, R_MAX * 2 * (1 + spacingRatio));
  const gridWidth = Math.ceil(canvas.width / cellSize) + 1;
  if (reuseGrid) {
    for (const arr of spatialGrid.values()) arr.length = 0;
  } else {
    spatialGrid.clear();
  }
  
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
  
  for (const [key, arr] of spatialGrid) {
    if (arr.length === 0) continue;
    const cy = (key / gridWidth) | 0;
    const cx = key % gridWidth;
    
    // Check 9 neighboring cells
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const neighborKey = (cy + oy) * gridWidth + (cx + ox);
        const nb = spatialGrid.get(neighborKey);
        if (!nb) continue;
        if (nb.length === 0) continue;
        
        for (let ii = 0; ii < arr.length; ii++) {
          const i = arr[ii];
          for (let jj = 0; jj < nb.length; jj++) {
            const j = nb[jj];
            if (j <= i) continue;
            
            const A = balls[i], B = balls[j];
            const dx = B.x - A.x, dy = B.y - A.y;
            const avgRadius = (A.r + B.r) / 2;
            const rSum = A.r + B.r + (avgRadius * spacingRatio); // Spacing as ratio of average radius
            const dist2 = dx*dx + dy*dy;
            
            if (dist2 < rSum*rSum) {
              const dist = Math.sqrt(Math.max(dist2, CONSTANTS.MIN_DISTANCE_EPSILON));
              const overlap = rSum - dist;
              const idx = reusablePairs.length;
              let p = pairPool[idx];
              if (!p) { p = { i: 0, j: 0, overlap: 0 }; pairPool[idx] = p; }
              p.i = i;
              p.j = j;
              p.overlap = overlap;
              reusablePairs.push(p);
            }
          }
        }
      }
    }
  }
  
  // PERF: Sort removed - O(n log n) overhead not needed for convergence
  // Collision resolution works fine without prioritizing by overlap size
  return reusablePairs;
}

function resolveCollisions(iterations = 10) {
  const globals = getGlobals();
  const balls = globals.balls;
  const pairs = collectPairsSorted();
  const REST = globals.REST;
  const POS_CORRECT_PERCENT = 0.8;
  const POS_CORRECT_SLOP = 0.5 * globals.DPR;
  const REST_VEL_THRESHOLD = 30;
  const spacingRatio = globals.ballSpacing || 0; // Ratio of average radius
  const skipSleepingCollisions = Boolean(globals.physicsSkipSleepingCollisions);
  
  for (let iter = 0; iter < iterations; iter++) {
    for (let k = 0; k < pairs.length; k++) {
      const { i, j } = pairs[k];
      const A = balls[i];
      const B = balls[j];
      
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const avgRadius = (A.r + B.r) / 2;
      const rSum = A.r + B.r + (avgRadius * spacingRatio); // Spacing as ratio of average radius
      const dist2 = dx * dx + dy * dy;
      if (dist2 === 0 || dist2 > rSum * rSum) continue;
      const dist = Math.sqrt(dist2);
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = rSum - dist;
      const invA = 1 / Math.max(A.m, 0.001);
      const invB = 1 / Math.max(B.m, 0.001);

      const bothSleeping = A.isSleeping && B.isSleeping;

      // Positional correction (always applied to prevent overlap, even for sleeping bodies)
      const correctionMag = POS_CORRECT_PERCENT * Math.max(overlap - POS_CORRECT_SLOP, 0) / (invA + invB);
      const cx = correctionMag * nx;
      const cy = correctionMag * ny;
      A.x -= cx * invA; A.y -= cy * invA;
      B.x += cx * invB; B.y += cy * invB;

      // ════════════════════════════════════════════════════════════════════════════
      // BALL-ON-BALL SUPPORT DETECTION (Pit modes only)
      // If ball B is resting on ball A (B above A, contact normal pointing up),
      // mark B as "supported" so gravity is balanced by normal force next step.
      // This prevents gravity→collision→bounce jitter in stacked balls.
      // ════════════════════════════════════════════════════════════════════════════
      const isPitLike = (globals.currentMode === 'pit');
      if (isPitLike && ny < -0.3) { // Normal pointing up = B is on top of A
        // B is supported from below by A
        B.hasSupport = true;
      } else if (isPitLike && ny > 0.3) { // Normal pointing down = A is on top of B
        // A is supported from below by B
        A.hasSupport = true;
      }

      // PERFORMANCE: When both bodies are sleeping, we still need positional correction
      // (prevents overlap drift), but we can skip all velocity/sound/squash work.
      if (skipSleepingCollisions && bothSleeping) continue;

      // If both bodies are sleeping, skip velocity impulses entirely
      // (prevents micro-jiggle in fully settled stacks).
      if (bothSleeping) continue;

      // Velocity impulse calculation
      const rvx = B.vx - A.vx;
      const rvy = B.vy - A.vy;
      const velAlongNormal = rvx * nx + rvy * ny;
      
      // ════════════════════════════════════════════════════════════════════════════
      // REAL PHYSICS: Only wake sleeping balls if impulse is significant
      // Small positional corrections shouldn't wake settled stacks (causes cascade)
      // Threshold DPR-scaled: physics runs in canvas pixels (displayPx * DPR)
      // ════════════════════════════════════════════════════════════════════════════
      const DPR = globals.DPR || 1;
      const WAKE_VEL_THRESHOLD = 15 * DPR; // px/s - only wake if approaching at meaningful speed
      const shouldWake = velAlongNormal < -WAKE_VEL_THRESHOLD;
      
      if (A.isSleeping && !shouldWake) continue; // Don't wake from tiny impulse
      if (B.isSleeping && !shouldWake) continue;
      if (A.isSleeping) A.wake();
      if (B.isSleeping) B.wake();

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
  const spacingRatio = globals.ballSpacing || 0; // Ratio of average radius
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
      const avgRadius = (A.r + B.r) / 2;
      const rSum = A.r + B.r + (avgRadius * spacingRatio); // Spacing as ratio of average radius
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
// ║                          RUBBER RING WALL SYSTEM                             ║
// ║                                                                              ║
// ║  Phase 1 (visual-only):                                                      ║
// ║  - Replace 4 separate edges with ONE continuous rubber ring                  ║
// ║  - Corners are part of the same material (no breaks)                         ║
// ║  - Collisions remain rigid/rounded-rect (Ball.walls)                          ║
// ║  - Impacts/pressure still come from Ball.walls via side names                ║
// ║  - Designed for performance: fixed sample count, typed arrays, O(N)          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS (kept small + fixed for perf)
// ═══════════════════════════════════════════════════════════════════════════════
const RING_SAMPLES = 768; // Very high density for perfectly smooth corners
// Uniform perimeter distribution ensures consistent sample spacing everywhere.
// All 768 samples are used for rendering (no decimation) for maximum smoothness.
const DEFAULT_STIFFNESS = 2200;
const DEFAULT_DAMPING = 35;
const DEFAULT_MAX_DEFORM = 45; // CSS px at DPR 1
const DEFAULT_TENSION_MUL = 0.18; // Neighbor coupling relative to stiffness
const DEFAULT_RENDER_THRESHOLD_PX = 2.0; // Skip drawing micro-wobbles
// Visual test multiplier (Phase 1): exaggerate inward wall deformation without
// changing collision bounds. Set back to 1 to return to normal.
const WALL_VISUAL_TEST_DEFORM_MUL = 1.0; // normal (no exaggeration)
// Performance caps (hard limits; UI ranges can remain expressive)
const MAX_RING_IMPACTS_PER_PHYSICS_STEP = 64;
const MAX_RING_PRESSURE_EVENTS_PER_PHYSICS_STEP = 256;
const MAX_IMPACT_SIGMA = 6.0; // cap for safety if config sets extreme values
const MAX_IMPACT_SPAN_SAMPLES = 24; // caps gaussian work: 2*span+1 writes
const MAX_WALL_STEP_DT = 1 / 30; // clamp wall integration step for stability

// Pressure→stability coupling:
// In dense bottom stacks we want the wall to feel heavier and avoid rare spikes.
// We automatically attenuate impact injection and max velocity in high-pressure zones.
const PRESSURE_IMPULSE_ATTENUATION = 0.65; // 0..1
const PRESSURE_MAXVEL_ATTENUATION = 0.55;  // 0..1
const PRESSURE_ATTEN_MIN = 0.25;           // never drop below this (keeps responsiveness)

// Cached wall fill color (avoid per-frame getComputedStyle)
let CACHED_WALL_COLOR = null;

/**
 * Apply a named preset to the global state
 * @param {string} presetName key in WALL_PRESETS
 * @param {object} g global state object
 */
function applyWallPreset(presetName, g) {
  const preset = WALL_PRESETS[presetName];
  if (!preset) return;
  // Presets may be either a plain values object or a { label, description, values } record.
  const values = preset?.values ? preset.values : preset;
  Object.assign(g, values);
  g.wallPreset = presetName;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUBBER RING (1D wave + spring model around a rounded-rect perimeter)
// - Each sample stores inward deformation (CSS px at DPR 1)
// - Neighbor coupling makes the wall feel like a single continuous material
// ═══════════════════════════════════════════════════════════════════════════════
class RubberRingWall {
  constructor(sampleCount) {
    const n = Math.max(8, Math.round(sampleCount || RING_SAMPLES));
    this.n = n;
    this.deformations = new Float32Array(n);
    this.velocities = new Float32Array(n);
    this.pressure = new Float32Array(n);
    // Render-time smoothing buffer (no allocations in draw path).
    this.renderDeformations = new Float32Array(n);

    // Cached geometry (canvas px space)
    this._w = 0;
    this._h = 0;
    this._r = 0;
    this._Lt = 0;
    this._Lr = 0;
    this._La = 0;
    this._L = 0;
    this._offTop = 0;
    this._offRight = 0;
    this._offBottom = 0;
    this._offLeft = 0;
    this._offTopLeft = 0;
    this._offTopRight = 0;
    this._offBottomLeft = 0;
    this._offBottomRight = 0;

    // Per-sample geometry (canvas px space), recomputed on resize only.
    this.baseX = new Float32Array(n);
    this.baseY = new Float32Array(n);
    this.normX = new Float32Array(n);
    this.normY = new Float32Array(n);
    this.cornerMask = new Float32Array(n); // 1 on corners, 0 on straights

    this._maxDeform = 0;
    this._maxVel = 0;
    this._active = false;

    // Safety: cap total impact energy injected per physics tick
    this._energyThisStep = 0;
  }

  /**
   * Ensure this ring uses the requested sample count.
   * Reallocates typed arrays only when the count changes (not a hot-path operation).
   *
   * IMPORTANT: This preserves deformation/velocity/pressure by resampling the
   * previous arrays into the new resolution. Without this, changing sample count
   * would zero impulses and make the wall appear "stuck".
   */
  ensureSampleCount(sampleCount) {
    const target = Math.max(8, Math.round(Number(sampleCount) || RING_SAMPLES));
    if (target === this.n) return;

    const prevN = this.n;
    const prevDef = this.deformations;
    const prevVel = this.velocities;
    const prevP = this.pressure;

    const nextDef = new Float32Array(target);
    const nextVel = new Float32Array(target);
    const nextP = new Float32Array(target);
    const nextRender = new Float32Array(target);

    // Resample ring fields with wrap-around linear interpolation in index space.
    // This is stable and cheap enough because it only runs when sample count changes.
    if (prevN > 0) {
      let maxDef = 0;
      let maxVel = 0;
      for (let i = 0; i < target; i++) {
        const f = (i / target) * prevN;
        const i0 = Math.floor(f) % prevN;
        const t = f - i0;
        const i1 = (i0 + 1) % prevN;

        const d = (1 - t) * prevDef[i0] + t * prevDef[i1];
        const v = (1 - t) * prevVel[i0] + t * prevVel[i1];
        const p = (1 - t) * prevP[i0] + t * prevP[i1];

        nextDef[i] = d;
        nextVel[i] = v;
        nextP[i] = p;

        if (d > maxDef) maxDef = d;
        const vAbs = Math.abs(v);
        if (vAbs > maxVel) maxVel = vAbs;
      }
      this._maxDeform = maxDef;
      this._maxVel = maxVel;
      this._active = maxDef > 0 || maxVel > 0;
    } else {
      this._maxDeform = 0;
      this._maxVel = 0;
      this._active = false;
    }

    this.n = target;
    this.deformations = nextDef;
    this.velocities = nextVel;
    this.pressure = nextP;
    this.renderDeformations = nextRender;

    this.baseX = new Float32Array(target);
    this.baseY = new Float32Array(target);
    this.normX = new Float32Array(target);
    this.normY = new Float32Array(target);
    this.cornerMask = new Float32Array(target);

    // Invalidate cached geometry so next ensureGeometry recomputes everything.
    this._w = 0;
    this._h = 0;
    this._r = 0;
    this._Lt = 0;
    this._Lr = 0;
    this._La = 0;
    this._L = 0;
    this._offTop = 0;
    this._offRight = 0;
    this._offBottom = 0;
    this._offLeft = 0;
    this._offTopLeft = 0;
    this._offTopRight = 0;
    this._offBottomLeft = 0;
    this._offBottomRight = 0;
  }

  clearPressure() {
    this.pressure.fill(0);
  }

  reset() {
    this.deformations.fill(0);
    this.velocities.fill(0);
    this.pressure.fill(0);
    this.renderDeformations.fill(0);
    this._maxDeform = 0;
    this._maxVel = 0;
    this._active = false;
    this._energyThisStep = 0;
  }

  hasDeformation() {
    return this._maxDeform > DEFAULT_RENDER_THRESHOLD_PX;
  }

  ensureGeometry(w, h, rCanvasPx) {
    const ww = Math.max(1, w | 0);
    const hh = Math.max(1, h | 0);
    const rr = Math.max(0, Math.min(Number(rCanvasPx) || 0, Math.min(ww, hh) * 0.5));
    if (ww === this._w && hh === this._h && Math.abs(rr - this._r) < 1e-3) return;

    this._w = ww;
    this._h = hh;
    this._r = rr;

    if (rr <= 0) {
      const Lt = ww;
      const Lr = hh;
      const L = 2 * (Lt + Lr);
      this._Lt = Lt;
      this._Lr = Lr;
      this._La = 0;
      this._L = L;
      // Start at MIDDLE OF BOTTOM EDGE (least visible seam location)
      this._offBottom = 0;
      this._offRight = Lt / 2;
      this._offTop = Lt / 2 + Lr;
      this._offLeft = Lt / 2 + Lr + Lt;
      this._offTopLeft = 0;
      this._offTopRight = 0;
      this._offBottomLeft = 0;
      this._offBottomRight = 0;

      for (let i = 0; i < this.n; i++) {
        // Start at middle of bottom edge, go clockwise
        const s = ((i / this.n) * L + (Lt / 2)) % L;
        const middleX = ww / 2; // Middle of bottom edge
        if (s < Lt / 2) {
          // Bottom straight (middle -> right)
          this.baseX[i] = middleX + s; // Go from middle to right edge
          this.baseY[i] = hh;
          this.normX[i] = 0;
          this.normY[i] = -1;
        } else if (s < Lt / 2 + Lr) {
          // Right straight (bottom -> top)
          const t = s - Lt / 2;
          this.baseX[i] = ww;
          this.baseY[i] = t;
          this.normX[i] = -1;
          this.normY[i] = 0;
        } else if (s < Lt / 2 + Lr + Lt) {
          // Top straight (right -> left)
          const t = s - (Lt / 2 + Lr);
          this.baseX[i] = ww - t;
          this.baseY[i] = 0;
          this.normX[i] = 0;
          this.normY[i] = 1;
        } else if (s < Lt / 2 + Lr + Lt + Lr) {
          // Left straight (top -> bottom)
          const t = s - (Lt / 2 + Lr + Lt);
          this.baseX[i] = 0;
          this.baseY[i] = hh - t;
          this.normX[i] = 1;
          this.normY[i] = 0;
        } else {
          // Bottom straight (left half, wraps to start)
          const t = s - (Lt / 2 + Lr + Lt + Lr);
          this.baseX[i] = t; // Go from left edge (0) to middle
          this.baseY[i] = hh;
          this.normX[i] = 0;
          this.normY[i] = -1;
        }
        this.cornerMask[i] = 0;
      }
      return;
    }

    const Lt = Math.max(0, ww - 2 * rr);
    const Lr = Math.max(0, hh - 2 * rr);
    const La = 0.5 * Math.PI * rr;
    const L = 2 * (Lt + Lr) + 4 * La;
    this._Lt = Lt;
    this._Lr = Lr;
    this._La = La;
    this._L = L;
    
    // Offsets for legacy compatibility (some code may reference these)
    this._offBottom = 0;
    this._offBottomRight = Lt / 2;
    this._offRight = Lt / 2 + La;
    this._offTopRight = Lt / 2 + La + Lr;
    this._offTop = Lt / 2 + La + Lr + La;
    this._offTopLeft = Lt / 2 + La + Lr + La + Lt;
    this._offLeft = Lt / 2 + La + Lr + La + Lt + La;
    this._offBottomLeft = Lt / 2 + La + Lr + La + Lt + La + Lr;

    // ════════════════════════════════════════════════════════════════════════════
    // UNIFORM PERIMETER DISTRIBUTION for perfectly smooth walls
    // 
    // Strategy: Distribute samples evenly along the perimeter by arc length.
    // This ensures consistent spacing everywhere - no density discontinuities
    // at corner/edge transitions that would create visible edges.
    // 
    // The key insight: visible "corners" were caused by sample density changes,
    // not by the rounded rectangle shape itself. Uniform distribution eliminates this.
    // ════════════════════════════════════════════════════════════════════════════
    
    // Calculate actual segment lengths for proportional distribution
    const segLengths = [
      Lt / 2,  // Segment 0: Bottom right half
      La,      // Segment 1: Bottom-right arc
      Lr,      // Segment 2: Right straight
      La,      // Segment 3: Top-right arc
      Lt,      // Segment 4: Top straight
      La,      // Segment 5: Top-left arc
      Lr,      // Segment 6: Left straight
      La,      // Segment 7: Bottom-left arc
    ];
    
    // Normalize to get segment weights proportional to LENGTH (uniform density)
    const totalLength = segLengths.reduce((sum, l) => sum + l, 0);
    const segmentWeights = segLengths.map(l => l / totalLength);
    
    // Compute cumulative weights for segment boundary detection
    const cumulativeWeights = [0];
    for (let i = 0; i < segmentWeights.length; i++) {
      cumulativeWeights.push(cumulativeWeights[i] + segmentWeights[i]);
    }

    const w0 = ww;
    const h0 = hh;
    const r0 = rr;
    const n = this.n;

    // Helper function to calculate arc point
    const arcPoint = (cx, cy, radius, startAngle, endAngle, t) => {
      const angle = startAngle + (endAngle - startAngle) * t;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      return {
        x: cx + radius * ca,
        y: cy + radius * sa,
        nx: -ca,
        ny: -sa
      };
    };

    // Key positions
    const middleX = r0 + (Lt / 2);
    const rightCornerX = w0 - r0;

    for (let i = 0; i < n; i++) {
      // Use NORMALIZED parameter (0-1) instead of absolute perimeter distance
      // This makes sample distribution independent of viewport size
      const normalizedT = i / n;
      
      let x = 0, y = 0, nx = 0, ny = 0;
      let isCorner = 0;

      // Find which segment this sample belongs to using normalized weights
      let segmentIndex = 0;
      for (let j = 0; j < segmentWeights.length; j++) {
        if (normalizedT >= cumulativeWeights[j] && normalizedT < cumulativeWeights[j + 1]) {
          segmentIndex = j;
          break;
        }
      }

      // Handle edge case: last sample (normalizedT = 1.0 or very close)
      if (normalizedT >= cumulativeWeights[segmentWeights.length]) {
        segmentIndex = segmentWeights.length - 1;
      }

      // Normalized position within the segment (0-1)
      const segmentT = (normalizedT - cumulativeWeights[segmentIndex]) / segmentWeights[segmentIndex];

      switch (segmentIndex) {
        case 0: // Bottom right half (middle -> right corner)
          x = middleX + segmentT * (Lt / 2);
          y = h0;
          nx = 0;
          ny = -1;
          break;
        
        case 1: // Bottom-right arc (bottom edge -> right edge)
          const pt1 = arcPoint(w0 - r0, h0 - r0, r0, Math.PI / 2, 0, segmentT);
          x = pt1.x;
          y = pt1.y;
          nx = pt1.nx;
          ny = pt1.ny;
          isCorner = 1;
          break;
        
        case 2: // Right straight (bottom -> top)
          x = w0;
          y = (h0 - r0) - segmentT * Lr;
          nx = -1;
          ny = 0;
          break;
        
        case 3: // Top-right arc (right edge -> top edge)
          const pt3 = arcPoint(w0 - r0, r0, r0, 0, -Math.PI / 2, segmentT);
          x = pt3.x;
          y = pt3.y;
          nx = pt3.nx;
          ny = pt3.ny;
          isCorner = 1;
          break;
        
        case 4: // Top straight (right -> left)
          x = rightCornerX - segmentT * Lt;
          y = 0;
          nx = 0;
          ny = 1;
          break;
        
        case 5: // Top-left arc (top edge -> left edge)
          const pt5 = arcPoint(r0, r0, r0, 3 * Math.PI / 2, Math.PI, segmentT);
          x = pt5.x;
          y = pt5.y;
          nx = pt5.nx;
          ny = pt5.ny;
          isCorner = 1;
          break;
        
        case 6: // Left straight (top -> bottom)
          x = 0;
          y = r0 + segmentT * Lr;
          nx = 1;
          ny = 0;
          break;
        
        case 7: // Bottom-left arc (left edge -> bottom edge)
          const pt7 = arcPoint(r0, h0 - r0, r0, Math.PI, Math.PI / 2, segmentT);
          x = pt7.x;
          y = pt7.y;
          nx = pt7.nx;
          ny = pt7.ny;
          isCorner = 1;
          break;
      }

      this.baseX[i] = x;
      this.baseY[i] = y;
      this.normX[i] = nx;
      this.normY[i] = ny;
      this.cornerMask[i] = isCorner ? 1 : 0;
    }
  }

  /**
   * Map a point in inner-wall space to ring t (0..1).
   * Used for sampling deformation AND for injecting impacts/pressure at the true contact point.
   */
  tFromPoint(x, y) {
    const w = this._w;
    const h = this._h;
    const r = this._r;
    const n = this.n;
    if (n === 0 || !(w > 0 && h > 0)) return 0;

    const innerW = w;
    const innerH = h;
    const innerR = r;

    // Check if point is in a corner region
    const inTopLeftCorner = x < innerR && y < innerR;
    const inTopRightCorner = x > innerW - innerR && y < innerR;
    const inBottomLeftCorner = x < innerR && y > innerH - innerR;
    const inBottomRightCorner = x > innerW - innerR && y > innerH - innerR;

    let t = 0;
    if (inTopLeftCorner) {
      // Top-left corner: arc goes from π to 3π/2 (bottom of left edge to top of top edge)
      // In new order: top-left arc starts at _offTopLeft
      const dx = x - innerR;
      const dy = y - innerR;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const angle = Math.atan2(dy, dx); // -π to π
        // Map angle from [π, 3π/2] to [0, 1] for corner arc
        const normalizedAngle = (angle - Math.PI) / (Math.PI / 2); // 0 to 1
        const cornerStart = this._offTopLeft / this._L;
        const cornerEnd = (this._offTopLeft + this._La) / this._L;
        t = cornerStart + Math.max(0, Math.min(1, normalizedAngle)) * (cornerEnd - cornerStart);
      } else {
        t = this._offTopLeft / this._L;
      }
    } else if (inTopRightCorner) {
      // Top-right corner: arc goes from -π/2 to 0 (top of top edge to top of right edge)
      // In new order: top-right arc starts at _offTopRight
      const dx = x - (innerW - innerR);
      const dy = y - innerR;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const angle = Math.atan2(dy, dx); // -π to π
        // Map angle from [-π/2, 0] to [0, 1]
        const normalizedAngle = (angle + Math.PI / 2) / (Math.PI / 2); // 0 to 1
        const cornerStart = this._offTopRight / this._L;
        const cornerEnd = (this._offTopRight + this._La) / this._L;
        t = cornerStart + Math.max(0, Math.min(1, normalizedAngle)) * (cornerEnd - cornerStart);
      } else {
        t = this._offTopRight / this._L;
      }
    } else if (inBottomRightCorner) {
      // Bottom-right corner: arc goes from 0 to π/2 (top of right edge to top of bottom edge)
      // In new order: bottom-right arc starts at _offBottomRight
      const dx = x - (innerW - innerR);
      const dy = y - (innerH - innerR);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const angle = Math.atan2(dy, dx); // -π to π
        // Map angle from [0, π/2] to [0, 1]
        const normalizedAngle = angle / (Math.PI / 2); // 0 to 1
        const cornerStart = this._offBottomRight / this._L;
        const cornerEnd = (this._offBottomRight + this._La) / this._L;
        t = cornerStart + Math.max(0, Math.min(1, normalizedAngle)) * (cornerEnd - cornerStart);
      } else {
        t = this._offBottomRight / this._L;
      }
    } else if (inBottomLeftCorner) {
      // Bottom-left corner: arc goes from π/2 to π (top of bottom edge to bottom of left edge)
      // In new order: bottom-left arc starts at _offBottomLeft (wraps to 0)
      const dx = x - innerR;
      const dy = y - (innerH - innerR);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const angle = Math.atan2(dy, dx); // -π to π
        // Map angle from [π/2, π] to [0, 1]
        const normalizedAngle = (angle - Math.PI / 2) / (Math.PI / 2); // 0 to 1
        const cornerStart = this._offBottomLeft / this._L;
        const cornerEnd = 1.0; // Wraps to start (0)
        t = cornerStart + Math.max(0, Math.min(1, normalizedAngle)) * (cornerEnd - cornerStart);
        if (t >= 1.0) t = t - 1.0; // Wrap around
      } else {
        t = this._offBottomLeft / this._L;
      }
    } else {
      // On a straight edge
      if (y < innerR) {
        // Top edge (left -> right)
        const s = Math.max(0, Math.min(this._Lt, x - innerR));
        t = (this._offTop + s) / this._L;
      } else if (x > innerW - innerR) {
        // Right edge (bottom -> top)
        const s = Math.max(0, Math.min(this._Lr, y - innerR));
        t = (this._offRight + s) / this._L;
      } else if (y > innerH - innerR) {
        // Bottom edge - split in half with seam in middle
        // Bottom edge goes: middle (start) -> right -> right corner -> left corner -> left -> middle (wrap)
        const xFromRight = (innerW - innerR) - x;
        if (xFromRight <= this._Lt / 2) {
          // Right half of bottom edge (from middle to right corner)
          const s = this._Lt / 2 - xFromRight;
          t = (this._offBottom + s) / this._L;
        } else {
          // Left half of bottom edge (from left corner to middle, wraps to start)
          // After bottom-left arc, we're at _offBottomLeft + La
          // Then we go left -> middle, which is the remaining Lt/2
          const xFromLeft = x - innerR;
          const s = this._Lt / 2 + (this._Lt / 2 - xFromLeft);
          t = (this._offBottom + s) / this._L;
          if (t >= 1.0) t = t - 1.0; // Wrap around
        }
      } else if (x < innerR) {
        // Left edge (top -> bottom)
        const s = Math.max(0, Math.min(this._Lr, (innerH - innerR) - y));
        t = (this._offLeft + s) / this._L;
      }
    }

    return ((t % 1 + 1) % 1);
  }

  /**
   * Get deformation at a specific x,y position (inner-wall space).
   * Returns the inward deformation amount in CSS px (authored at DPR 1).
   */
  getDeformationAtPoint(x, y) {
    const n = this.n;
    if (n === 0) return 0;
    const t = this.tFromPoint(x, y);

    // Interpolate deformation at this t value
    const idx = t * n;
    const i0 = Math.floor(idx) % n;
    const i1 = (i0 + 1) % n;
    const frac = idx - i0;
    const def0 = this.deformations[i0];
    const def1 = this.deformations[i1];
    return (1 - frac) * def0 + frac * def1;
  }

  /**
   * Inject an impact at a point (inner-wall space).
   */
  impactAtPoint(x, y, intensity) {
    const t = this.tFromPoint(x, y);
    this.impactAtT(t, intensity);
  }

  /**
   * Add pressure at a point (inner-wall space).
   */
  addPressureAtPoint(x, y, amount, options = {}) {
    const t = this.tFromPoint(x, y);
    this.addPressureAtT(t, amount, options);
  }

  /**
   * Map a side + normalized position to ring t (0..1).
   * This is intentionally cheap: piecewise linear on straight spans.
   * Corners still participate via neighbor coupling (continuous ring).
   */
  tFromWall(wall, normalizedPos) {
    const w = this._w;
    const h = this._h;
    const r = this._r;
    const Lt = this._Lt;
    const Lr = this._Lr;
    const L = this._L;
    if (!(L > 0)) return 0;

    const p = Math.max(0, Math.min(1, Number(normalizedPos) || 0));

    if (wall === 'top') {
      const x = p * w;
      const s = Math.max(0, Math.min(Lt, x - r));
      return (this._offTop + s) / L;
    }
    if (wall === 'right') {
      const y = p * h;
      const s = Math.max(0, Math.min(Lr, y - r));
      return (this._offRight + s) / L;
    }
    if (wall === 'bottom') {
      const x = p * w;
      const s = Math.max(0, Math.min(Lt, (w - r) - x));
      return (this._offBottom + s) / L;
    }
    if (wall === 'left') {
      const y = p * h;
      const s = Math.max(0, Math.min(Lr, (h - r) - y));
      return (this._offLeft + s) / L;
    }
    return 0;
  }

  impactAtT(t, intensity) {
    const g = getGlobals();
    const n = this.n;
    if (n <= 0) return;
    const maxDeform = Math.max(0, g.wallWobbleMaxDeform ?? DEFAULT_MAX_DEFORM);
    const impulse = maxDeform * Math.max(0, Math.min(1, Number(intensity) || 0));
    if (!(impulse > 0)) return;

    const sigma = Math.max(0.25, Math.min(MAX_IMPACT_SIGMA, g.wallWobbleSigma ?? 2.0));
    const idx = ((Number(t) || 0) % 1 + 1) % 1 * n;

    // Stabilizers:
    // - clamp per-sample impulse injection (prevents huge spikes when many impacts stack)
    // - clamp absolute velocity (prevents erratic overshoot and deformation "slamming" maxDeform)
    const maxImpulse = Math.max(0, Number(g.wallWobbleMaxImpulse ?? 220) || 0); // deform-vel units
    const maxVelClamp = Math.max(0, Number(g.wallWobbleMaxVel ?? 800) || 0);     // deform-vel units
    const maxEnergy = Math.max(0, Number(g.wallWobbleMaxEnergyPerStep ?? 20000) || 0);

    // Only touch a local window (perf): 3σ contains ~99.7% of gaussian energy.
    const span = Math.max(2, Math.min(n, Math.min(MAX_IMPACT_SPAN_SAMPLES, Math.ceil(sigma * 3))));
    for (let k = -span; k <= span; k++) {
      const i = ((Math.round(idx) + k) % n + n) % n;
      const dist = Math.abs(idx - i);
      const d = Math.min(dist, n - dist);
      const falloff = Math.exp(-(d * d) / (2 * sigma * sigma));
      let add = impulse * falloff;
      if (maxImpulse > 0 && add > maxImpulse) add = maxImpulse;

      // Heavier goo under load: attenuate injection where pressure is high.
      // (Pressure is 0..1; higher means more balls resting here.)
      const p = this.pressure[i] || 0;
      if (p > 0) {
        const atten = Math.max(PRESSURE_ATTEN_MIN, 1 - p * PRESSURE_IMPULSE_ATTENUATION);
        add *= atten;
      }
      // Energy budget: once we hit a per-tick budget, stop injecting.
      if (maxEnergy > 0) {
        const remaining = maxEnergy - this._energyThisStep;
        if (remaining <= 0) break;
        if (add > remaining) add = remaining;
      }
      let v = this.velocities[i] + add;
      if (maxVelClamp > 0) {
        // Under pressure, reduce the velocity cap further (prevents bottom spikes).
        const p = this.pressure[i] || 0;
        const localClamp = p > 0
          ? (maxVelClamp * Math.max(PRESSURE_ATTEN_MIN, 1 - p * PRESSURE_MAXVEL_ATTENUATION))
          : maxVelClamp;
        if (v > localClamp) v = localClamp;
        else if (v < -localClamp) v = -localClamp;
      }
      this.velocities[i] = v;
      if (maxEnergy > 0) this._energyThisStep += Math.abs(add);
    }
    this._active = true;
  }

  addPressureAtT(t, amount, options = {}) {
    const n = this.n;
    if (n <= 0) return;
    const a = Math.max(0, Math.min(1, Number(amount) || 0));
    if (!(a > 0)) return;

    const idx = ((Number(t) || 0) % 1 + 1) % 1 * n;
    const center = Math.round(idx) % n;

    // Simple local pressure spread (linear falloff).
    const spread = options.fast ? 1 : 3;
    for (let k = -spread; k <= spread; k++) {
      const i = ((center + k) % n + n) % n;
      const falloff = Math.max(0, 1 - Math.abs(k) / (spread + 1));
      const next = this.pressure[i] + a * falloff;
      this.pressure[i] = next > 1 ? 1 : next;
    }
    this._active = true;
  }

  step(dt) {
    const g = getGlobals();
    const n = this.n;
    if (n <= 0) return;

    const dtSafe = Math.min(MAX_WALL_STEP_DT, Math.max(0, Number(dt) || 0));
    if (!(dtSafe > 0)) return;

    // When inactive, apply strong restoring force to pull wall back to perfect rounded rectangle
    if (!this._active) {
      let hasAnyDeform = false;
      const RESTORE_FORCE = 200.0; // Much stronger restoring force when inactive
      const TOP_EDGE_BOOST = 3.0; // Extra boost for top edge to prevent sagging
      const TOP_LEFT_BOOST = 5.0; // Extra boost specifically for top-left corner (wrap-around point)
      
      for (let i = 0; i < n; i++) {
        if (this.deformations[i] > 0.001 || Math.abs(this.velocities[i]) > 0.001) {
          hasAnyDeform = true;
          
          // Identify if this is a top edge sample (y = 0, not a corner)
          // Use a more lenient threshold to catch all top edge samples, including near corners
          const isTopEdge = this.baseY[i] < 1.0 && !this.cornerMask[i] && this.normY[i] > 0.7;
          // Also check if sample is near top corners - treat them like top edge for restoring force
          // Be more lenient for top-left corner area
          const nearTopLeftCorner = !this.cornerMask[i] && this.baseX[i] < this._r + 2.0 && this.baseY[i] < this._r + 2.0;
          const nearTopRightCorner = !this.cornerMask[i] && this.baseX[i] > this._w - this._r - 1.0 && this.baseY[i] < this._r + 1.0;
          const isNearTopCorner = nearTopLeftCorner || nearTopRightCorner;
          // Check if this IS a top corner sample (actual corner arc, not just nearby)
          // Use position-based detection for reliability - be more lenient for top-left corner
          const isTopLeftCorner = this.cornerMask[i] && this.baseX[i] < this._r + 3.0 && this.baseY[i] < this._r + 3.0;
          const isTopRightCorner = this.cornerMask[i] && this.baseX[i] > this._w - this._r - 2.0 && this.baseY[i] < this._r + 2.0;
          const isTopCorner = isTopLeftCorner || isTopRightCorner;
          
          // Top-left corner gets extra boost (it's at wrap-around point, needs more help)
          const forceMultiplier = isTopLeftCorner || nearTopLeftCorner 
            ? RESTORE_FORCE * TOP_EDGE_BOOST * TOP_LEFT_BOOST 
            : ((isTopEdge || isNearTopCorner || isTopCorner) ? RESTORE_FORCE * TOP_EDGE_BOOST : RESTORE_FORCE);
          
          // Strong restoring force: pull deformation to zero
          const restoreAccel = -forceMultiplier * this.deformations[i] - 20.0 * this.velocities[i];
          this.velocities[i] += restoreAccel * dtSafe;
          this.deformations[i] += this.velocities[i] * dtSafe;
          
          // Clamp to [-maxDeform, +maxDeform] range (allow outward bulge)
          const maxDeform = Math.max(0, g.wallWobbleMaxDeform ?? DEFAULT_MAX_DEFORM);
          if (this.deformations[i] < -maxDeform) {
            this.deformations[i] = -maxDeform;
            this.velocities[i] = 0;
          } else if (this.deformations[i] > maxDeform) {
            this.deformations[i] = maxDeform;
            this.velocities[i] = 0;
          }
          
          // Aggressive snap to zero (especially for top edge and top corners)
          const isTopArea = isTopEdge || isNearTopCorner || isTopCorner;
          // Top-left corner gets even more aggressive snap
          const isTopLeftArea = isTopLeftCorner || nearTopLeftCorner;
          const snapThreshold = isTopLeftArea ? 0.01 : (isTopArea ? 0.02 : 0.1); // Most aggressive for top-left
          const velThreshold = isTopLeftArea ? 0.2 : (isTopArea ? 0.3 : 1.0); // Lower velocity threshold for top-left
          if (this.deformations[i] < snapThreshold && Math.abs(this.velocities[i]) < velThreshold) {
            this.deformations[i] = 0;
            this.velocities[i] = 0;
          }
        }
      }
      // Update active state
      this._active = hasAnyDeform;
      if (!hasAnyDeform) {
        this._maxDeform = 0;
        this._maxVel = 0;
      }
      return;
    }

    const stiffnessBase = Math.max(1, g.wallWobbleStiffness ?? DEFAULT_STIFFNESS);
    const baseDamping = Math.max(0, g.wallWobbleDamping ?? DEFAULT_DAMPING);
    const maxDeform = Math.max(0, g.wallWobbleMaxDeform ?? DEFAULT_MAX_DEFORM);
    const maxVelClamp = Math.max(0, Number(g.wallWobbleMaxVel ?? 800) || 0); // deform-vel units

    // Neighbor coupling/tension: makes impacts behave like a single ring.
    const tension = stiffnessBase * DEFAULT_TENSION_MUL;

    // Settling speed (0-100): controls snap thresholds + pressure damping.
    const settlingSpeed = Math.max(0, Math.min(100, g.wallWobbleSettlingSpeed ?? 50));
    const settleFactor = settlingSpeed / 100;
    const pressureDampingMult = 5.0 + (30.0 * settleFactor);
    const snapScale = 0.5 + (1.5 * settleFactor);

    let maxDef = 0;
    let maxVel = 0;

    // Semi-implicit Euler with Laplacian coupling.
    for (let i = 0; i < n; i++) {
      const prev = i === 0 ? (n - 1) : (i - 1);
      const next = i === (n - 1) ? 0 : (i + 1);

      const def = this.deformations[i];
      const vel = this.velocities[i];

      // UNIFIED STIFFNESS: Identical behavior for corners and edges
      // This eliminates ALL visible discontinuities at corner/edge boundaries
      // The entire wall behaves as a single continuous elastic membrane
      const isTopEdge = this.baseY[i] < 1.0 && this.normY[i] > 0.7;
      
      // Single uniform stiffness for the entire wall ring
      // No corner vs edge distinction = no visible spikes or discontinuities
      const kLocal = stiffnessBase * (isTopEdge ? 1.9 : 1.7);

      // Progressive damping: higher at low amplitude to kill micro-jitter.
      const defAbs = Math.abs(def);
      const velAbs = Math.abs(vel);

      const amplitudeFactor = Math.max(0, Math.min(1, 1 - defAbs / 20));
      const progressiveDamping = baseDamping * (1 + amplitudeFactor * 1.0);

      // Pressure adds friction (resting balls damp the ring).
      const pressure = this.pressure[i];
      const pressureDamping = progressiveDamping * (1 + pressure * pressureDampingMult);

      // Approximate critical damping cap (include tension influence).
      const critical = 2 * Math.sqrt(kLocal + 2 * tension);
      const effectiveDamping = Math.min(pressureDamping, critical * 0.95);

      // Laplacian (neighbor coupling) promotes smooth, continuous waves.
      const lap = (this.deformations[prev] + this.deformations[next] - 2 * def);
      const force = -kLocal * def + (tension * lap) - effectiveDamping * vel;

      let vNext = vel + force * dtSafe;
      if (maxVelClamp > 0) {
        // Under pressure, reduce max velocity (heavier goo / less jitter in stacks).
        const p = this.pressure[i] || 0;
        const localClamp = p > 0
          ? (maxVelClamp * Math.max(PRESSURE_ATTEN_MIN, 1 - p * PRESSURE_MAXVEL_ATTENUATION))
          : maxVelClamp;
        if (vNext > localClamp) vNext = localClamp;
        else if (vNext < -localClamp) vNext = -localClamp;
      }
      let dNext = def + vNext * dtSafe;

      // Clamp deformation: allow outward bulge (negative) for realistic bounce-back
      // Range: -maxDeform (outward bulge) to +maxDeform (inward dent)
      let clampedLow = false;
      let clampedHigh = false;
      if (dNext < -maxDeform) { dNext = -maxDeform; clampedLow = true; }
      if (dNext > maxDeform) { dNext = maxDeform; clampedHigh = true; }

      // Stability: prevent "bouncing" against hard deformation clamps.
      // If we are clamped and velocity is still pushing further into the clamp,
      // zero that component so the wall settles instead of jittering.
      if (clampedLow && vNext < 0) vNext = 0;
      if (clampedHigh && vNext > 0) vNext = 0;

      // Snap-to-zero thresholds (scaled by pressure + settling).
      // UNIFIED snap behavior for entire wall - no corner/edge distinction
      const isTopEdgeSnap = this.baseY[i] < 1.0 && this.normY[i] > 0.7;
      // Top edge gets boosted snap-to-zero, all other samples treated uniformly
      const snapBoost = isTopEdgeSnap ? 4.0 : 2.0;
      const baseDeformThresh = pressure > 0.5 ? 0.3 : (pressure > 0.1 ? 0.8 : 2.0);
      const baseVelThresh = pressure > 0.5 ? 0.5 : (pressure > 0.1 ? 3.0 : 10.0);
      const deformThresh = baseDeformThresh * snapScale * snapBoost;
      const velThresh = baseVelThresh * snapScale * snapBoost;
      if (Math.abs(dNext) < deformThresh && velAbs < velThresh) {
        this.deformations[i] = 0;
        this.velocities[i] = 0;
      } else {
        this.deformations[i] = dNext;
        this.velocities[i] = vNext;
      }

      if (this.deformations[i] > maxDef) maxDef = this.deformations[i];
      const vAbsNext = Math.abs(this.velocities[i]);
      if (vAbsNext > maxVel) maxVel = vAbsNext;
    }

    // Hard failsafe: if anything becomes non-finite, reset immediately.
    // This prevents rare NaN/Infinity cascades from producing visual explosions.
    if (!Number.isFinite(maxDef) || !Number.isFinite(maxVel)) {
      this.reset();
      return;
    }

    this._maxDeform = maxDef;
    this._maxVel = maxVel;
    this._active = maxDef > 0 || maxVel > 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER INDEX GENERATION - All samples for maximum smoothness
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create render sample indices for smooth wall rendering.
 * 
 * NO DECIMATION: Use all samples for perfectly smooth corners.
 * With 768 samples and uniform perimeter distribution, corners are buttery smooth.
 * 
 * @param {RubberRingWall} physicsRing - High-res physics ring
 * @returns {number[]} All sample indices for rendering (no decimation)
 */
function createAdaptiveRenderIndices(physicsRing) {
  const n = physicsRing.n;
  if (n === 0) return [];
  
  const selected = [];
  
  // NO DECIMATION: Use all samples for maximum smoothness
  // 768 samples with uniform perimeter distribution = perfectly smooth corners
  for (let i = 0; i < n; i++) {
    selected.push(i);
  }
  
  return selected;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL STATE SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════
const wallState = {
  // Two-ring strategy:
  // - ringPhysics: high sample count for accurate integration/impulses (768)
  // - ringRender: same resolution (all samples used for rendering)
  ringPhysics: new RubberRingWall(RING_SAMPLES),
  ringRender: new RubberRingWall(RING_SAMPLES),
  _impactsThisStep: 0,
  _pressureEventsThisStep: 0,
  
  // Tier 1: Physics update frequency decoupling
  _physicsUpdateInterval: 1/30, // 30Hz physics (configurable, default 30fps)
  _physicsAccumulator: 0,
  _interpolationAlpha: 0, // 0-1 for lerp between states
  _prevDeformations: null, // Previous state for interpolation

  // Render index cache (perf): all sample indices for rendering
  _adaptiveIndices: null, // Computed once per geometry change
  
  // Render cache (perf): avoid remapping+filtering every render frame.
  // We update these only on wall physics ticks, then linearly interpolate per-frame.
  _renderSmPrev: null,
  _renderSmCurr: null,
  _renderMapTmp: null,
  
  /**
   * Reset per-physics-step budgets/counters.
   * IMPORTANT: Do NOT clear `pressure` here — pressure is meant to accumulate
   * across the render-frame so the wall can settle under load.
   */
  resetStepBudgets() {
    this._impactsThisStep = 0;
    this._pressureEventsThisStep = 0;
    // Reset energy budget accumulator for this physics tick.
    this.ringPhysics._energyThisStep = 0;
  },

  /**
   * Clear accumulated pressure (call once per render-frame).
   */
  clearPressureFrame() {
    this.ringPhysics.clearPressure();
  },
  
  /**
   * Update all wall physics
   * Tier 1: Runs at lower frequency (default 30Hz) with interpolation for smooth visuals
   */
  step(dt) {
    const g = getGlobals();

    // Tier 2: Adaptive sample count (stability rule)
    // Only change sample count on "physics ticks" (when we are about to integrate),
    // not every render-frame. This prevents visual thrash and reduces path artifacts.
    const enableAdaptive = g.wallPhysicsAdaptiveSamples !== false;
    const minSamples = Math.max(8, Math.min(48, Math.round(Number(g.wallPhysicsMinSamples ?? 24) || 24)));
    const maxSamples = Math.min(RING_SAMPLES, Math.round(Number(g.wallPhysicsSamples ?? RING_SAMPLES) || RING_SAMPLES));

    // Optional: skip stepping when inactive (ring.step already has a cheap early return).
    // BUT: always run step() to allow restoring force to maintain perfect rounded rectangle shape
    // The ring.step() will handle the inactive case with strong restoring force
    if (g.wallPhysicsSkipInactive !== false && !this.ringPhysics._active) {
      // Still run step() to allow restoring force to work, but skip expensive interpolation updates
      this.ringPhysics.step(dt);
      this.ringRender.step(dt);
      this._interpolationAlpha = 1.0;
      return;
    }

    // Tier 1: Decouple physics update frequency from render frequency
    const updateHz = Math.max(10, Math.min(60, Number(g.wallPhysicsUpdateHz ?? 30) || 30));
    const updateInterval = 1 / updateHz;
    const enableInterpolation = g.wallPhysicsInterpolation !== false;

    this._physicsAccumulator += dt;

    // Only run physics when accumulator reaches update interval
    if (this._physicsAccumulator >= updateInterval) {
      // Tier 2: choose target sample count ONLY on physics ticks
      if (enableAdaptive) {
        const currentSamples = this.ringPhysics.n;
        let desiredSamples = currentSamples;

        if (!this.ringPhysics._active) {
          desiredSamples = Math.max(minSamples, Math.min(maxSamples, currentSamples - 1));
        } else {
          // Use last-step maxima to decide if we can downshift quality
          const maxDeform = this.ringPhysics._maxDeform || 0;
          const maxVel = this.ringPhysics._maxVel || 0;
          if (maxDeform < 5.0 && maxVel < 2.0) {
            desiredSamples = Math.max(minSamples, Math.min(maxSamples, currentSamples - 1));
          } else {
            desiredSamples = Math.min(maxSamples, Math.max(minSamples, currentSamples + 1));
          }
        }

        if (desiredSamples !== currentSamples) {
          this.ringPhysics.ensureSampleCount(desiredSamples);
        }
      } else {
        // Fixed sample count (no adaptive)
        const fixedSamples = Math.max(8, Math.min(RING_SAMPLES, maxSamples));
        if (this.ringPhysics.n !== fixedSamples) this.ringPhysics.ensureSampleCount(fixedSamples);
      }

      // Store previous state for interpolation BEFORE running physics (only if interpolation enabled)
      if (enableInterpolation && this.ringPhysics.n > 0) {
        const n = this.ringPhysics.n;
        if (!this._prevDeformations || this._prevDeformations.length !== n) {
          // Allocate arrays on first use or when sample count changes
          this._prevDeformations = new Float32Array(n);
          // Initialize with current state on first allocation (so interpolation works from the start)
          this._prevDeformations.set(this.ringPhysics.deformations);
        } else {
          // Copy current deformation state to previous (geometry doesn't change between physics steps)
          this._prevDeformations.set(this.ringPhysics.deformations);
        }
      }

      // Use exactly one interval for physics, keep remainder in accumulator
      let remaining = updateInterval;
      this._physicsAccumulator -= updateInterval; // Keep remainder

      // Stability: substep wall integration so we never integrate with a large dt.
      // This prevents "big dt" overshoot when Tier 1 lowers update cadence.
      const maxSubHz = Math.max(30, Math.min(240, Number(g.wallPhysicsMaxSubstepHz ?? 60) || 60));
      const maxSubDt = 1 / maxSubHz;
      let steps = 0;
      const maxSteps = 6; // hard safety cap (prevents runaway loops)

      while (remaining > 1e-6 && steps < maxSteps) {
        const dtStep = remaining > maxSubDt ? maxSubDt : remaining;
        this.ringPhysics.step(dtStep);
        remaining -= dtStep;
        steps++;
      }

      // PERF: update render smoothing cache only on physics ticks.
      // This replaces per-frame remap+low-pass cost inside drawWalls().
      try {
        const ringPhysics = this.ringPhysics;
        const ringRender = this.ringRender;
        const nPhys = ringPhysics.n | 0;
        const nR = ringRender.n | 0;
        if (nPhys > 0 && nR > 0) {
          if (!this._renderSmPrev || this._renderSmPrev.length !== nR) {
            this._renderSmPrev = new Float32Array(nR);
            this._renderSmCurr = new Float32Array(nR);
            this._renderMapTmp = new Float32Array(nR);
            // Initialize prev/curr as zero.
          } else {
            this._renderSmPrev.set(this._renderSmCurr);
          }

          const srcPhys = ringPhysics.deformations;
          const tmp = this._renderMapTmp;
          const curr = this._renderSmCurr;

          // Map physics samples -> render samples (linear interpolation in ring parameter space)
          for (let i = 0; i < nR; i++) {
            const f = (i / nR) * nPhys;
            const i0 = Math.floor(f) % nPhys;
            const t = f - i0;
            const i1 = (i0 + 1) % nPhys;
            tmp[i] = (1 - t) * srcPhys[i0] + t * srcPhys[i1];
          }

          // TWO-PASS 5-tap low-pass around the ring (wrap-around) for ultra-smooth corners.
          // Each pass uses Kernel: [1, 4, 6, 4, 1] / 16
          // Two passes create a 9-tap effective filter that eliminates all visible spikes
          
          // Pass 1: tmp -> curr
          for (let i = 0; i < nR; i++) {
            const m2 = (i - 2 + nR) % nR;
            const m1 = (i - 1 + nR) % nR;
            const p1 = (i + 1) % nR;
            const p2 = (i + 2) % nR;
            curr[i] = (tmp[m2] + 4 * tmp[m1] + 6 * tmp[i] + 4 * tmp[p1] + tmp[p2]) * (1 / 16);
          }
          
          // Pass 2: curr -> tmp -> curr (reusing tmp as scratch)
          for (let i = 0; i < nR; i++) {
            const m2 = (i - 2 + nR) % nR;
            const m1 = (i - 1 + nR) % nR;
            const p1 = (i + 1) % nR;
            const p2 = (i + 2) % nR;
            tmp[i] = (curr[m2] + 4 * curr[m1] + 6 * curr[i] + 4 * curr[p1] + curr[p2]) * (1 / 16);
          }
          // Copy final result back to curr
          for (let i = 0; i < nR; i++) {
            curr[i] = tmp[i];
          }
        }
      } catch (e) {}

      // Calculate interpolation alpha based on remainder
      if (enableInterpolation) {
        this._interpolationAlpha = Math.max(0, Math.min(1, this._physicsAccumulator / updateInterval));
      } else {
        this._interpolationAlpha = 1.0; // No interpolation: use current state
      }
    } else {
      // Between physics updates: calculate interpolation alpha for smooth rendering
      if (enableInterpolation) {
        this._interpolationAlpha = Math.max(0, Math.min(1, this._physicsAccumulator / updateInterval));
      } else {
        this._interpolationAlpha = 1.0; // No interpolation: use current state
      }
    }
  },
  
  reset() {
    this.ringPhysics.reset();
    this.ringRender.reset();
    this._physicsAccumulator = 0;
    this._interpolationAlpha = 0;
    this._prevDeformations = null;
    this._renderSmPrev = null;
    this._renderSmCurr = null;
    this._adaptiveIndices = null; // Clear render index cache
    this._lastGeometryN = 0;
    this._renderMapTmp = null;
  },
  
  hasAnyDeformation() {
    return this.ringPhysics.hasDeformation();
  },

  /**
   * Get wall deformation at a specific point (canvas px coordinates).
   * Returns deformation in canvas pixels (scaled by DPR).
   * Used by ball collision to adjust boundaries dynamically.
   */
  getDeformationAtPoint(x, y) {
    const ring = this.ringPhysics;
    if (!ring || ring.n === 0) return 0;
    const g = getGlobals();
    const canvas = g.canvas;
    if (!canvas) return 0;
    
    // Convert canvas coordinates to inner wall coordinates.
    // Must match drawWalls(): inset = wallThickness * DPR.
    const DPR = g.DPR || 1;
    const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
    const insetPx = wallThicknessPx;
    const innerX = x - insetPx;
    const innerY = y - insetPx;
    
    // IMPORTANT UNIT NOTE:
    // `RubberRingWall.deformations[]` are authored/stepped in CSS px @ DPR=1
    // (see wallWobbleMaxDeform in state/config). Rendering scales by DPR.
    // Collisions operate in canvas px, so we scale the sampled deformation by DPR here.
    const dCssPx = ring.getDeformationAtPoint(innerX, innerY);
    return (dCssPx > 0) ? (dCssPx * DPR) : 0;
  }
};

/**
 * Register an impact by contact point (canvas px space).
 * This is preferred for SDF collisions because it correctly drives corners/arcs.
 */
function registerWallImpactAtPoint(x, y, intensity) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const rCssPx = (typeof g.getCanvasCornerRadius === 'function')
    ? g.getCanvasCornerRadius()
    : (g.cornerRadius ?? g.wallRadius ?? 0);
  const rCanvasPx = Math.max(0, (Number(rCssPx) || 0) * (g.DPR || 1));

  // Ensure geometry matches drawWalls() / Ball.walls():
  // inner dims are inset by wallThickness only, radius is clamped to inner dims.
  const DPR = g.DPR || 1;
  const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
  const insetPx = wallThicknessPx;
  const innerW = Math.max(1, canvas.width - insetPx * 2);
  const innerH = Math.max(1, canvas.height - insetPx * 2);
  const innerR = Math.max(0, Math.min(rCanvasPx, innerW * 0.5, innerH * 0.5));
  wallState.ringPhysics.ensureGeometry(innerW, innerH, innerR);

  const ix = x - insetPx;
  const iy = y - insetPx;

  // Cap work in pathological cases (tons of impacts in a single physics step).
  if (wallState._impactsThisStep < MAX_RING_IMPACTS_PER_PHYSICS_STEP) {
    wallState.ringPhysics.impactAtPoint(ix, iy, intensity);
  } else {
    // Cheap fallback: keep responsiveness without the gaussian loop.
    const n = wallState.ringPhysics.n;
    if (n > 0) {
      const t = wallState.ringPhysics.tFromPoint(ix, iy);
      const idx = ((Number(t) || 0) % 1 + 1) % 1 * n;
      const i = Math.round(idx) % n;
      const maxDeform = Math.max(0, g.wallWobbleMaxDeform ?? DEFAULT_MAX_DEFORM);
      const impulse = maxDeform * Math.max(0, Math.min(1, Number(intensity) || 0));
      wallState.ringPhysics.velocities[i] += impulse;
      wallState.ringPhysics._active = true;
    }
  }

  wallState._impactsThisStep++;
}

/**
 * Register resting pressure by contact point (canvas px space).
 * Preferred for SDF collisions because it works consistently at corners.
 */
function registerWallPressureAtPoint(x, y, amount = 1.0) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const rCssPx = (typeof g.getCanvasCornerRadius === 'function')
    ? g.getCanvasCornerRadius()
    : (g.cornerRadius ?? g.wallRadius ?? 0);
  const rCanvasPx = Math.max(0, (Number(rCssPx) || 0) * (g.DPR || 1));

  // Ensure geometry matches drawWalls() / Ball.walls():
  const DPR = g.DPR || 1;
  const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
  const insetPx = wallThicknessPx;
  const innerW = Math.max(1, canvas.width - insetPx * 2);
  const innerH = Math.max(1, canvas.height - insetPx * 2);
  const innerR = Math.max(0, Math.min(rCanvasPx, innerW * 0.5, innerH * 0.5));
  wallState.ringPhysics.ensureGeometry(innerW, innerH, innerR);

  const ix = x - insetPx;
  const iy = y - insetPx;

  const fast = wallState._pressureEventsThisStep >= MAX_RING_PRESSURE_EVENTS_PER_PHYSICS_STEP;
  wallState.ringPhysics.addPressureAtPoint(ix, iy, amount, { fast });
  wallState._pressureEventsThisStep++;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL RENDERING
// Draws a continuous, deformed rubber ring (visual-only).
// On mobile (wallDeformationEnabled = false), draws a simple static rounded rect.
// ═══════════════════════════════════════════════════════════════════════════════
function drawWalls(ctx, w, h) {
  const g = getGlobals();
  if (!ctx) return;

  const chromeColor = CACHED_WALL_COLOR || getChromeColorFromCSS();
  const DPR = g.DPR || 1;

  const rCssPx = (typeof g.getCanvasCornerRadius === 'function')
    ? g.getCanvasCornerRadius()
    : (g.cornerRadius ?? g.wallRadius ?? 0);
  const rCanvasPx = Math.max(0, (Number(rCssPx) || 0) * DPR);
  
  // Wall inset rule:
  // The wall inner edge (collision boundary) is defined ONLY by wall thickness.
  // Content padding is layout-only and must not affect wall geometry.
  const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
  const insetPx = wallThicknessPx;
  
  const innerW = Math.max(1, w - (insetPx * 2));
  const innerH = Math.max(1, h - (insetPx * 2));
  const innerR = Math.max(0, Math.min(rCanvasPx, innerW * 0.5, innerH * 0.5));
  
  // Small padding beyond canvas edges for sub-pixel path rounding safety (clipped by canvas anyway)
  const pad = Math.max(2, 2 * DPR);

  ctx.save();
  ctx.fillStyle = chromeColor;
  ctx.beginPath();

  // Outer path (CW): canvas edges (container fills viewport, wall is inset inside)
  ctx.moveTo(-pad, -pad);
  ctx.lineTo(w + pad, -pad);
  ctx.lineTo(w + pad, h + pad);
  ctx.lineTo(-pad, h + pad);
  ctx.closePath();

  // ════════════════════════════════════════════════════════════════════════════════
  // MOBILE FAST PATH: Draw static rounded rectangle (no deformation)
  // Eliminates ~46,000 path segments/second on mobile for 60 FPS performance
  // ════════════════════════════════════════════════════════════════════════════════
  const wallDeformEnabled = g.wallDeformationEnabled !== false;
  if (!wallDeformEnabled) {
    // Draw simple static rounded rect (CCW for even-odd fill)
    const x = insetPx;
    const y = insetPx;
    const r = innerR;
    
    // CCW rounded rectangle path
    ctx.moveTo(x + r, y + innerH);
    ctx.lineTo(x + innerW - r, y + innerH);
    ctx.arcTo(x + innerW, y + innerH, x + innerW, y + innerH - r, r);
    ctx.lineTo(x + innerW, y + r);
    ctx.arcTo(x + innerW, y, x + innerW - r, y, r);
    ctx.lineTo(x + r, y);
    ctx.arcTo(x, y, x, y + r, r);
    ctx.lineTo(x, y + innerH - r);
    ctx.arcTo(x, y + innerH, x + r, y + innerH, r);
    ctx.closePath();
    
    try {
      ctx.fill('evenodd');
    } catch (e) {
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // DESKTOP PATH: Full deformed rubber ring rendering
  // ════════════════════════════════════════════════════════════════════════════════
  
  // DEBUG/TEST: allow exaggerating deformation (visual-only).
  // Default should remain 1.0 in config.
  const visualMul = Math.max(0, Math.min(10, Number(g.wallVisualDeformMul ?? 1.0) || 1.0));
  
  // Ensure both rings share the same geometric basis (so t-mapping aligns).
  // Use inner dimensions for the wall geometry (wall is inset from container edges)
  // This creates the inner edge of the wall border - outer edge is at canvas boundaries
  wallState.ringPhysics.ensureGeometry(innerW, innerH, innerR);
  wallState.ringRender.ensureGeometry(innerW, innerH, innerR);

  // Inner path (CCW): deformed rounded-rect perimeter.
  const ringPhysics = wallState.ringPhysics;
  const ringRender = wallState.ringRender;
  const nPhys = ringPhysics.n;
  const n = ringRender.n;
  if (n > 0 && nPhys > 0) {
    // Smooth look:
    // Use the cached smoothed deformation field (updated only on wall physics ticks),
    // then interpolate across ticks for a continuous render.
    const enableInterpolation = g.wallPhysicsInterpolation !== false;
    const alpha = enableInterpolation ? Math.max(0, Math.min(1, wallState._interpolationAlpha || 0)) : 1.0;

    const sm = ringRender.renderDeformations; // scratch buffer for interpolated sm
    const prevSm = wallState._renderSmPrev;
    const currSm = wallState._renderSmCurr;
    const canUseCache = prevSm && currSm && prevSm.length === n && currSm.length === n;

    if (canUseCache) {
      for (let i = 0; i < n; i++) {
        const pv = prevSm[i];
        sm[i] = pv + (currSm[i] - pv) * alpha;
      }
    } else {
      // Fallback: map + two-pass smooth if cache isn't ready.
      const srcPhys = ringPhysics.deformations;
      const src = ringRender.deformations;
      for (let i = 0; i < n; i++) {
        const f = (i / n) * nPhys;
        const i0 = Math.floor(f) % nPhys;
        const t = f - i0;
        const i1 = (i0 + 1) % nPhys;
        src[i] = (1 - t) * srcPhys[i0] + t * srcPhys[i1];
      }
      // Pass 1: src -> sm
      for (let i = 0; i < n; i++) {
        const m2 = (i - 2 + n) % n;
        const m1 = (i - 1 + n) % n;
        const p1 = (i + 1) % n;
        const p2 = (i + 2) % n;
        sm[i] = (src[m2] + 4 * src[m1] + 6 * src[i] + 4 * src[p1] + src[p2]) * (1 / 16);
      }
      // Pass 2: sm -> src -> sm (ultra-smooth)
      for (let i = 0; i < n; i++) {
        const m2 = (i - 2 + n) % n;
        const m1 = (i - 1 + n) % n;
        const p1 = (i + 1) % n;
        const p2 = (i + 2) % n;
        src[i] = (sm[m2] + 4 * sm[m1] + 6 * sm[i] + 4 * sm[p1] + sm[p2]) * (1 / 16);
      }
      for (let i = 0; i < n; i++) {
        sm[i] = src[i];
      }
    }

    const baseX = ringRender.baseX;
    const baseY = ringRender.baseY;
    const normX = ringRender.normX;
    const normY = ringRender.normY;

    // Render-only safety clamp:
    // - still respects configured max deform
    // - also prevents self-intersection on extreme configs
    const minDim = Math.max(1, Math.min(w, h));
    const maxDispGeomPx = Math.max(0, minDim * 0.18);
    const maxDeformCfg = Math.max(0, Number(g.wallWobbleMaxDeform ?? DEFAULT_MAX_DEFORM) || DEFAULT_MAX_DEFORM);
    const maxDispCfgPx = maxDeformCfg * DPR * WALL_VISUAL_TEST_DEFORM_MUL * visualMul;
    const maxDispCanvasPx = Math.min(maxDispGeomPx, maxDispCfgPx);
    const dispCanvasPx = (idx) => {
      const d = (sm[idx] * DPR * WALL_VISUAL_TEST_DEFORM_MUL * visualMul);
      if (!(d > 0)) return 0;
      return d > maxDispCanvasPx ? maxDispCanvasPx : d;
    };

    // Offset inner path by wall inset to position it inset from container edges
    const pointX = (idx) => (baseX[idx] + normX[idx] * dispCanvasPx(idx)) + insetPx;
    const pointY = (idx) => (baseY[idx] + normY[idx] * dispCanvasPx(idx)) + insetPx;

    // ════════════════════════════════════════════════════════════════════════════
    // UNIFORM RENDERING: All samples used for maximum smoothness
    // - 768 samples with uniform perimeter distribution
    // - No decimation = perfectly smooth corners everywhere
    // ════════════════════════════════════════════════════════════════════════════
    
    // Build render index cache (only when geometry changes)
    if (!wallState._adaptiveIndices || wallState._lastGeometryN !== n) {
      wallState._adaptiveIndices = createAdaptiveRenderIndices(ringRender);
      wallState._lastGeometryN = n;
    }
    
    const indices = wallState._adaptiveIndices;
    
    if (indices && indices.length > 0) {
      // Start at last adaptive sample (draw CCW for even-odd fill)
      const firstIdx = indices[indices.length - 1];
      ctx.moveTo(pointX(firstIdx), pointY(firstIdx));
      
      // Draw through adaptive samples in reverse order (CCW)
      for (let j = indices.length - 2; j >= 0; j--) {
        const idx = indices[j];
        ctx.lineTo(pointX(idx), pointY(idx));
      }
      
      ctx.closePath();
    }
  }

  // Prefer even-odd to define the ring; fallback to non-zero (inner path is CCW).
  try {
    ctx.fill('evenodd');
  } catch (e) {
    ctx.fill();
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function getChromeColorFromCSS() {
  try {
    // Use --wall-color (theme-aware, single-token consumer).
    // In some contexts tokens might be scoped; try root → body → container.
    const root = document.documentElement;
    const body = document.body;
    const container = document.getElementById('bravia-balls');

    const read = (el, name) => {
      if (!el) return '';
      try {
        const value = getComputedStyle(el).getPropertyValue(name).trim();
        // If value is empty or just whitespace, try reading the resolved value
        if (!value) {
          // Try reading the actual computed color value
          const computed = getComputedStyle(el);
          // For --wall-color, check if it resolves to a color
          const resolved = computed.getPropertyValue(name).trim();
          return resolved;
        }
        return value;
      } catch (e) {
        return '';
      }
    };

    // Try --wall-color first (theme-aware)
    let color = read(root, '--wall-color');
    if (!color) {
      // Fallback: check if dark mode and use --wall-color-dark directly
      const isDark = root.classList.contains('dark-mode') || body.classList.contains('dark-mode');
      if (isDark) {
        color = read(root, '--wall-color-dark') || read(root, '--frame-color-dark');
      } else {
        color = read(root, '--wall-color-light') || read(root, '--frame-color-light');
      }
    }
    
    // If still no color, try body and container
    if (!color) {
      color = read(body, '--wall-color') || read(container, '--wall-color');
    }
    
    return color || '#0a0a0a';
  } catch {
    return '#0a0a0a';  // Must match --frame-color-* in main.css
  }
}

function updateChromeColor() {
  CACHED_WALL_COLOR = getChromeColorFromCSS();
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
    this.isGrounded = false; // Set during wall collisions (bottom contact)
    this.hasSupport = false; // Set during ball-ball collisions (ball below supports this one)
    this._soundId = `ball-${ballIdCounter++}`; // Unique ID for sound debouncing
  }

  step(dt, applyForcesFunc) {
    const globals = getGlobals();
    const { currentMode, G, gravityScale, FRICTION, MASS_BASELINE_KG } = globals;
    
    this.t += dt;
    this.age += dt;
    if (this.isSleeping) {
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
    // Can be disabled for debugging / extreme tuning.
    if (this.isSleeping && globals.physicsSkipSleepingSteps !== false) {
      return;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // REAL PHYSICS: Skip gravity for supported balls (simulates normal force)
    // In reality, gravity on a resting ball is BALANCED by the floor's OR another
    // ball's normal force. Without this, we get gravity→bounce oscillation = jitter.
    // hasSupport = resting on another ball; isGrounded = touching floor
    // ════════════════════════════════════════════════════════════════════════════
    const DPR = globals.DPR || 1;
    const wasGrounded = this.isGrounded;
    const wasSupported = this.hasSupport;
    this.isGrounded = false; // Clear; will be re-set in walls() if still touching floor
    this.hasSupport = false; // Clear; will be re-set in collision resolution if supported
    
    // Gravity (skip in weightless, skip for grounded/supported balls not jumping)
    if (currentMode !== MODES.WEIGHTLESS) {
      // Only apply gravity if:
      // 1. Ball was not grounded OR supported last frame (truly airborne), OR
      // 2. Ball has significant upward velocity (jumping)
      // Threshold DPR-scaled: 8 display-px/s upward motion still gets gravity
      const JUMP_VEL_THRESHOLD = -8 * DPR;
      if ((!wasGrounded && !wasSupported) || this.vy < JUMP_VEL_THRESHOLD) {
        this.vy += (G * gravityScale) * dt;
      }
    }
    
    // ════════════════════════════════════════════════════════════════════════════
    // PROGRESSIVE DRAG - Higher damping at low velocities to prevent micro-jitters
    // This simulates rolling resistance and static friction engaging at low speeds
    // DPR-scaled thresholds: physics runs in canvas pixels (displayPx * DPR)
    // ════════════════════════════════════════════════════════════════════════════
    const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    
    // Base drag from config (skip for WEIGHTLESS; managed separately)
    const baseDrag = currentMode === MODES.WEIGHTLESS ? 0 : FRICTION;
    
    // Progressive drag: multiply instead of divide for stability
    // At high speed (>100 px/s * DPR): base drag only (multiplier = 0)
    // At low speed (<10 px/s * DPR): up to 2x base drag (multiplier = 1)
    const speedMultiplier = Math.max(0, Math.min(1, 1 - speed / (100 * DPR)));
    const progressiveDrag = baseDrag * (1 + speedMultiplier * 1.0); // Up to 2x at low speed
    
    const drag = Math.max(0, 1 - (progressiveDrag / massScale));
    this.vx *= drag;
    this.vy *= drag;
    
    // ════════════════════════════════════════════════════════════════════════════
    // MICRO-JITTER PREVENTION - Snap tiny velocities to zero
    // Below this threshold, friction would dominate anyway
    // ════════════════════════════════════════════════════════════════════════════
    const MICRO_VEL_THRESHOLD = 2.0 * DPR; // px/s - below this, snap to zero
    if (Math.abs(this.vx) < MICRO_VEL_THRESHOLD) this.vx = 0;
    if (Math.abs(this.vy) < MICRO_VEL_THRESHOLD && currentMode === MODES.WEIGHTLESS) {
      // Only snap vy in weightless (gravity modes need vy to settle naturally)
      this.vy = 0;
    }
    
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
    
    // ════════════════════════════════════════════════════════════════════════════
    // SPIN DAMPING - Progressive damping prevents endless rotation
    // ════════════════════════════════════════════════════════════════════════════
    const angularSpeed = Math.abs(this.omega);
    // Multiply instead of divide for stability: higher damping at low angular velocity
    const angularMultiplier = Math.max(0, Math.min(1, 1 - angularSpeed / 2.0));
    const progressiveSpinDamp = CONSTANTS.SPIN_DAMP_PER_S * (1 + angularMultiplier * 0.5); // Up to 1.5x
    const spinDamp = Math.max(0, 1 - progressiveSpinDamp * dt);
    this.omega *= spinDamp;
    this.theta += this.omega * dt;
    
    // Snap tiny angular velocity to zero
    if (Math.abs(this.omega) < 0.01) this.omega = 0;
    
    // Squash decay (skip for balls that should stay round)
    if (!this._noSquash) {
      const decay = Math.min(1, CONSTANTS.SQUASH_DECAY_PER_S * dt);
      this.squashAmount += (0 - this.squashAmount) * decay;
      this.squash = 1 - this.squashAmount;
    } else {
      this.squashAmount = 0;
      this.squash = 1;
    }
    
    // Sleep detection (Ball Pit mode only, Box2D-style)
    // NOTE: Sleep evaluation is done after constraints (collisions + walls) in the engine.
  }
  
  /**
   * Box2D-inspired sleep detection
   * Only sleeps if grounded AND below velocity threshold for sustained time
   */
  updateSleepState(dt, globals) {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const angularSpeed = Math.abs(this.omega);
    
    // Sleep thresholds are tunable via runtime config / control panel (Pit modes only).
    // Fall back to constants if missing.
    // DPR-scale velocity threshold: physics runs in canvas pixels (displayPx * DPR)
    const DPR = globals.DPR || 1;
    const vThresh = (Number.isFinite(globals.sleepVelocityThreshold)
      ? globals.sleepVelocityThreshold
      : CONSTANTS.SLEEP_VELOCITY_THRESHOLD) * DPR;
    const wThresh = Number.isFinite(globals.sleepAngularThreshold)
      ? globals.sleepAngularThreshold
      : CONSTANTS.SLEEP_ANGULAR_THRESHOLD;
    const tSleep = Number.isFinite(globals.timeToSleep)
      ? globals.timeToSleep
      : CONSTANTS.TIME_TO_SLEEP;

    // Critical: only allow sleep when grounded OR supported by another ball.
    // Without this, balls stacked on other balls can never settle (jitter).
    const isSettled = !!this.isGrounded || !!this.hasSupport;
    const belowThreshold = isSettled && speed < vThresh && angularSpeed < wThresh;
    
    // Simplified sleep (Pit-like modes):
    // If a ball is truly idle (supported by other balls or the floor), let it sleep.
    // Gravity will prevent mid-air balls from staying below threshold for long.
    if (belowThreshold) {
      this.sleepTimer += dt;
      
      // Must be below threshold for TIME_TO_SLEEP seconds (stability check)
      if (this.sleepTimer >= tSleep) {
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

  walls(w, h, dt, customRest, options = {}) {
    const registerEffects = options.registerEffects !== false && !this._skipWallEffects;
    const globals = getGlobals();
    const { REST, MASS_BASELINE_KG, currentMode, DPR } = globals;
    const rest = customRest !== undefined ? customRest : REST;
    const wobbleThreshold = globals.wallWobbleImpactThreshold ?? CONSTANTS.WALL_REST_VEL_THRESHOLD;
    
    // Spacing ratio: additional gap as a ratio of ball radius (matches ball-ball spacing)
    const spacingRatio = globals.ballSpacing || 0;
    const effectiveRadius = this.r * (1 + spacingRatio);
    
    // Corner radius for rounded corner collision
    // Must match the wall rendering's inner radius calculation exactly (same fallback chain)
    const cornerRadiusPx = (typeof globals.getCanvasCornerRadius === 'function')
      ? globals.getCanvasCornerRadius()
      : (globals.cornerRadius ?? globals.wallRadius ?? 0);
    const cr = Math.max(0, Number(cornerRadiusPx) || 0) * (DPR || 1);
    
    // Balls collide with the INNER EDGE of the wall, which is inset by wall thickness only.
    // Content padding is layout-only and must not affect physics.
    const wallThicknessPx = Math.max(0, (globals.wallThickness ?? 0) * (DPR || 1));
    const insetPx = wallThicknessPx;
    
    // Small additional inset to create a gap between balls and walls (prevents overlap)
    // This is physics-only padding on top of wall thickness
    const borderInset = Math.max(0, (globals.wallInset ?? 3)) * (DPR || 1);
    
    // Corner arc radius must match wall rendering's INNER geometry:
    // innerR is clamped to inner dims, then borderInset applies as physics-only padding.
    const innerW = Math.max(1, w - insetPx * 2);
    const innerH = Math.max(1, h - insetPx * 2);
    const innerR = Math.max(0, Math.min(cr, innerW * 0.5, innerH * 0.5));
    
    let hasWallCollision = false;
    // Note: isGrounded is cleared at start of step() and re-set here if touching floor
    
    // ════════════════════════════════════════════════════════════════════════
    // SIMPLE ROUNDED-RECT SDF COLLISION
    // ════════════════════════════════════════════════════════════════════════
    const isPitMode = currentMode === MODES.PIT;
    
    // SDF parameters: inner boundary is inset by wallThickness
    const hx = innerW * 0.5;  // half-width
    const hy = innerH * 0.5;  // half-height
    const rr = innerR;        // corner radius
    
    // Transform ball position to inner coordinate space (centered)
    const cx = insetPx + hx;  // center x in canvas coords
    const cy = insetPx + hy;  // center y in canvas coords
    
    // Local coords relative to center
    const lx = this.x - cx;
    const ly = this.y - cy;
    const ax = Math.abs(lx);
    const ay = Math.abs(ly);
    
    // Distance to inner rect (shrunk by corner radius)
    const dx = ax - (hx - rr);
    const dy = ay - (hy - rr);
    
    // SDF formula for rounded rect
    const outsideCorner = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
    const insideRect = Math.min(Math.max(dx, dy), 0);
    const sdfDist = outsideCorner + insideRect - rr;
    
    // Compute outward normal (gradient direction)
    let nx = 0, ny = 0;
    if (dx > 0 && dy > 0) {
      // In corner region: normal points away from corner center
      const len = Math.hypot(dx, dy);
      if (len > 1e-6) {
        nx = dx / len;
        ny = dy / len;
      }
    } else if (dx > dy) {
      // Closer to vertical edge
      nx = 1;
      ny = 0;
    } else {
      // Closer to horizontal edge
      nx = 0;
      ny = 1;
    }
    
    // Apply sign based on quadrant
    nx *= lx < 0 ? -1 : 1;
    ny *= ly < 0 ? -1 : 1;
    
    // Ball Pit mode: skip collision if normal points upward (allow entry from top)
    const skipForPit = isPitMode && ny < -0.5;
    // Bubbles mode: skip ceiling collision so bubbles can exit/pop without getting pinned
    const skipForBubbles = currentMode === MODES.BUBBLES && ny < -0.5;
    
    // Margin: ball radius + physics padding
    const margin = effectiveRadius + borderInset;
    const penetration = sdfDist + margin;
    
    if (penetration > 0 && !skipForPit && !skipForBubbles) {
      hasWallCollision = true;
      
      // Capture pre-collision velocity
      const preVn = this.vx * nx + this.vy * ny;
      
      // Push ball inward (opposite to outward normal)
      this.x -= nx * penetration;
      this.y -= ny * penetration;
      
      // Reflect velocity only if moving into wall (positive = outward = into wall)
      if (preVn > 0) {
        this.vx -= (1 + rest) * preVn * nx;
        this.vy -= (1 + rest) * preVn * ny;
      }
      
      // Determine wall classification for effects
      const isFloor = ny > 0.7;  // Mostly downward-facing = floor
      
      // Calculate impact strength
      const impactSpeed = Math.abs(preVn);
      const impact = Math.min(1, impactSpeed / (this.r * 80));
      
      // Floor-specific: grounding and rolling friction
      if (isFloor) {
        this.isGrounded = true;
        
        // Rolling friction
        const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
        const groundSpeed = Math.abs(this.vx);
        const frictionMul = Math.max(0, Math.min(1, 1 - groundSpeed / (80 * DPR)));
        const rollFriction = CONSTANTS.ROLL_FRICTION_PER_S * (1 + frictionMul);
        const rollDamp = Math.max(0, 1 - rollFriction * dt / massScale);
        this.vx *= rollDamp;
        
        if (Math.abs(this.vx) < 3.0 * DPR) this.vx = 0;
        
        // Spin coupling
        const slip = this.vx - this.omega * this.r;
        this.omega += (slip / this.r) * CONSTANTS.SPIN_GAIN / massScale;
        const rollTarget = this.vx / this.r;
        this.omega += (rollTarget - this.omega) * Math.min(1, CONSTANTS.GROUND_COUPLING_PER_S * dt);
        if (Math.abs(this.omega) < 0.05) this.omega = 0;
      }
      
      // Visual squash (skip for DVD logo and other no-squash balls)
      if (!this._noSquash) {
        this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
        this.squashNormalAngle = Math.atan2(-ny, -nx);
      }
      
      // Sound and wobble effects
      if (registerEffects) {
        // Sound panned by x position
        const pan = this.x / Math.max(1, w);
        playCollisionSound(this.r, impact * 0.65, pan, this._soundId);
        
        // Wobble registration - use ball position for impact point
        const impactSpeedN = Math.max(0, preVn);
        // For meteors, use a lower threshold to ensure impacts register even after bouncing
        const isMeteor = this.isMeteor === true;
        const effectiveThreshold = isMeteor ? Math.max(20, wobbleThreshold * 0.3) : wobbleThreshold;
        if (!this.isSleeping && impactSpeedN >= effectiveThreshold) {
          // Impact intensity: scale by velocity and mass for dramatic effects
          // Mass multiplier: heavier balls (like meteors) create more dramatic deformation
          // Use square root of mass ratio for more natural scaling (9x mass → ~3x impact)
          const massRatio = this.m / MASS_BASELINE_KG;
          const massMultiplier = Math.max(0.5, Math.min(4.0, 0.5 + Math.sqrt(massRatio) * 0.5));
          const baseImpactN = Math.min(1, impactSpeedN / (this.r * 80));
          const impactN = Math.min(1, baseImpactN * massMultiplier);
          const contactX = this.x - nx * effectiveRadius;
          const contactY = this.y - ny * effectiveRadius;
          registerWallImpactAtPoint(contactX, contactY, impactN);
        }
        
        // Pressure registration (dampens wobble from resting contact)
        const pressureAmount = this.isSleeping ? 1.0 : Math.max(0, (wobbleThreshold - impactSpeed) / wobbleThreshold);
        if (pressureAmount > 0.1) {
          const contactX = this.x - nx * effectiveRadius;
          const contactY = this.y - ny * effectiveRadius;
          registerWallPressureAtPoint(contactX, contactY, pressureAmount);
        }
      }
    }
    
    // Wake on wall collision (prevents sleeping balls from getting stuck in walls)
    // Always wake meteors on wall collision to ensure they register impacts
    if (hasWallCollision) {
      if (this.isSleeping || this.isMeteor === true) {
        this.wake();
      }
    }
  }

  /**
   * Get effective radius considering filter size multiplier
   * @returns {number} The radius to use for rendering (physics uses this.r)
   */
  getDisplayRadius() {
    const filterSizeMul = this.filterSizeMultiplier ?? 1;
    return this.r * filterSizeMul;
  }

  draw(ctx) {
    // ══════════════════════════════════════════════════════════════════════════════
    // PERFORMANCE: Optimized draw with minimal state changes
    // - Skip save/restore when possible (expensive operations)
    // - Batch similar operations
    // - Only use transforms when necessary
    // ══════════════════════════════════════════════════════════════════════════════
    
    const hasSquash = this.squashAmount > 0.01;
    // Combine alpha with filter opacity (for legend filtering)
    const filterOpacity = this.filterOpacity ?? 1;
    const effectiveAlpha = this.alpha * filterOpacity;
    const hasAlpha = effectiveAlpha < 1.0;
    
    // Get display radius (may be scaled by legend filter)
    const displayRadius = this.getDisplayRadius();
    
    // Only use save/restore when we have transforms that need cleanup
    const needsSaveRestore = hasSquash || hasAlpha;
    
    if (needsSaveRestore) {
      ctx.save();
      
      if (hasSquash || hasAlpha) {
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
          ctx.globalAlpha = effectiveAlpha;
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, displayRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
      
      ctx.restore();
    } else {
      // Fast path: no squash, no alpha - draw directly without save/restore
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, displayRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           BALL SIZING (MODULAR)                               ║
// ║     Per-mode size variation + global multiplier (allocation-free)             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function clamp$5(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

function lerp$1(a, b, t) {
  return a + (b - a) * t;
}

const SIZE_VARIATION_MAX = 0.2;

function getModeSizeVariation01(g, mode) {
  switch (mode) {
    case MODES.PIT: return g.sizeVariationPit ?? 0;
    case MODES.FLIES: return g.sizeVariationFlies ?? 0;
    case MODES.WEIGHTLESS: return g.sizeVariationWeightless ?? 0;
    case MODES.WATER: return g.sizeVariationWater ?? 0;
    case MODES.VORTEX: return g.sizeVariationVortex ?? 0;
    case MODES.PING_PONG: return g.sizeVariationPingPong ?? 0;
    case MODES.MAGNETIC: return g.sizeVariationMagnetic ?? 0;
    case MODES.BUBBLES: return g.sizeVariationBubbles ?? 0;
    case MODES.KALEIDOSCOPE: return g.sizeVariationKaleidoscope ?? 0;
    case MODES.CRITTERS: return g.sizeVariationCritters ?? 0;
    case MODES.NEURAL: return g.sizeVariationNeural ?? 0;
    case MODES.PARALLAX_LINEAR: return g.sizeVariationParallaxLinear ?? 0;
    default: return 0;
  }
}

/**
 * Compute per-mode radius bounds from the global cap and multiplier.
 * - `g.R_MED` is the medium radius (derived from sizeScale * responsiveScale).
 * - `g.sizeVariationCap` is the max fractional deviation at per-mode=1 and globalMul=1.
 * - `g.sizeVariationGlobalMul` scales all per-mode sliders (default 1 = neutral).
 */
function getRadiusBoundsForMode(g, mode) {
  const med = Math.max(1, g.R_MED || (g.R_MIN + g.R_MAX) * 0.5 || 10);
  const cap = clamp$5(Number(g.sizeVariationCap ?? 0.12), 0, SIZE_VARIATION_MAX);
  const mul = clamp$5(Number(g.sizeVariationGlobalMul ?? 1.0), 0, 2);
  const per = clamp$5(Number(getModeSizeVariation01(g, mode) ?? 0), 0, 1);
  const v = clamp$5(cap * mul * per, 0, SIZE_VARIATION_MAX);
  return { minR: Math.max(1, med * (1 - v)), maxR: Math.max(1, med * (1 + v)), medR: med };
}

/**
 * Compute the fractional size variance for a mode based on the global cap + multiplier.
 * Returns 0..SIZE_VARIATION_MAX representing +/- fraction around a base radius.
 */
function getModeSizeVarianceFrac(g, mode) {
  const cap = clamp$5(Number(g.sizeVariationCap ?? 0.12), 0, SIZE_VARIATION_MAX);
  const mul = clamp$5(Number(g.sizeVariationGlobalMul ?? 1.0), 0, 2);
  const per = clamp$5(Number(getModeSizeVariation01(g, mode) ?? 0), 0, 1);
  return clamp$5(cap * mul * per, 0, SIZE_VARIATION_MAX);
}

function clampRadiusToGlobalBounds(g, r) {
  const minR = Number.isFinite(g?.R_MIN) ? Math.max(1, g.R_MIN) : 0;
  const maxR = Number.isFinite(g?.R_MAX) ? Math.max(minR || 1, g.R_MAX) : 0;
  if (minR > 0 && maxR > 0) return clamp$5(r, minR, maxR);
  const med = Math.max(1, g?.R_MED || r || 1);
  const minFallback = med * (1 - SIZE_VARIATION_MAX);
  const maxFallback = med * (1 + SIZE_VARIATION_MAX);
  return clamp$5(r, minFallback, maxFallback);
}

/**
 * Kaleidoscope radius helper (vh-based):
 * - Base radius derives from canvas height (vh feel)
 * - Area multiplier defaults to 0.7 (≈30% smaller area)
 * - Uses per-variant size variance for more control
 */
function randomRadiusForKaleidoscopeVh(g, mode) {
  const canvas = g?.canvas;
  const h = canvas?.height || 0;
  if (!h) return randomRadiusForMode(g, mode);

  const getVh = () => {
    return Number(g.kaleidoscope3DotSizeVh ?? g.kaleidoscopeDotSizeVh ?? 1.05);
  };
  const getAreaMul = () => {
    return Number(g.kaleidoscope3DotAreaMul ?? g.kaleidoscopeDotAreaMul ?? 0.75);
  };
  // Size variance (0..1) - controls how much ball sizes differ
  const getSizeVariance = () => {
    return Number(g.kaleidoscope3SizeVariance ?? g.kaleidoscopeSizeVariance ?? 0.5);
  };

  const vh = clamp$5(getVh(), 0.1, 6.0);
  const areaMul = clamp$5(getAreaMul(), 0.1, 2.0);
  const base = Math.max(1, (vh * 0.01) * h * Math.sqrt(areaMul));

  // Use per-variant size variance directly (scaled and capped to global max deviation)
  const v = clamp$5(getSizeVariance() * 0.5, 0, SIZE_VARIATION_MAX);
  const minR = Math.max(1, base * (1 - v));
  const maxR = Math.max(1, base * (1 + v));
  if (maxR - minR < 1e-6) return clampRadiusToGlobalBounds(g, base);
  return clampRadiusToGlobalBounds(g, lerp$1(minR, maxR, Math.random()));
}

/**
 * Allocation-free random radius for a specific mode.
 * When per-mode variation is 0, returns exactly the medium radius.
 */
function randomRadiusForMode(g, mode) {
  const { minR, maxR, medR } = getRadiusBoundsForMode(g, mode);
  if (maxR - minR < 1e-6) return medR;
  return lerp$1(minR, maxR, Math.random());
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
  const count = getMobileAdjustedCount(globals.waterBallCount || 100);
  if (count <= 0) return;
  
  // Initial velocity (DPR-scaled)
  const DPR = globals.DPR || 1;
  const v0 = (globals.waterInitialVelocity || 120) * DPR;
  
  // First, ensure at least one ball of each color (0-7)
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = randomRadiusForMode(globals, MODES.WATER);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(x, y, size, color);
    ball.distributionIndex = distributionIndex;
    
    // Random initial velocities (snowglobe-style movement)
    ball.vx = (Math.random() - 0.5) * v0;
    ball.vy = (Math.random() - 0.5) * v0;
    
    globals.balls.push(ball);
  }
  
  // Then fill the rest with random colors
  for (let i = 8; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = randomRadiusForMode(globals, MODES.WATER);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(x, y, size, color);
    ball.distributionIndex = distributionIndex;
    
    // Random initial velocities (snowglobe-style movement)
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
  const DPR = globals.DPR || 1;
  for (let i = 0; i < ripples.length; i++) {
    const ripple = ripples[i];
    const dx = ball.x - ripple.x;
    const dy = ball.y - ripple.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Ripple affects balls in expanding ring (DPR-scaled)
    const rippleThickness = 40 * DPR;
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
// ║                        CANVAS DEPTH WASH                                    ║
// ║     Radial gradient overlay rendered between balls and wall                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// Gradient cache: rebuild only on resize/theme changes
let cachedGradient = null;
let cachedWidth = 0;
let cachedHeight = 0;
let cachedIsDark = false;

/**
 * Build radial gradient for depth wash (cached per canvas size + theme)
 */
function createDepthGradient(ctx, w, h, isDark) {
  // Center at 50% x, 30% y as specified
  const centerX = w / 2;
  const centerY = h * 0.3;
  const radius = Math.max(w, h) * 0.8; // Extend to cover canvas
  
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  
  if (isDark) {
    // Dark mode gradient (desaturated, opaque at center for top-down lighting)
    gradient.addColorStop(1, 'rgba(5, 2, 15, 0.8)');
    gradient.addColorStop(0, 'rgba(25, 30, 35, 0)');
  } else {
    // Light mode gradient (from CSS overlay)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(20, 43, 72, 0.05)');
  }
  
  return gradient;
}

/**
 * Draw depth wash overlay between balls and wall
 * Blend modes: light = "lighter" (additive), dark = "color-burn"
 */
function drawDepthWash(ctx, w, h) {
  const g = getGlobals();
  const isDark = g.isDarkMode || false;
  
  // Cache invalidation: rebuild gradient on resize or theme change
  if (!cachedGradient || 
      Math.abs(w - cachedWidth) > 1 || 
      Math.abs(h - cachedHeight) > 1 || 
      isDark !== cachedIsDark) {
    cachedGradient = createDepthGradient(ctx, w, h, isDark);
    cachedWidth = w;
    cachedHeight = h;
    cachedIsDark = isDark;
  }
  
  // Save state (blend mode + alpha will be modified)
  ctx.save();
  
  // Set blend mode based on theme
  // Light: "color-dodge" (intense radiant brightening, inverse of color-burn)
  // Dark: "color-burn" (rich darkening with color interaction)
  ctx.globalCompositeOperation = isDark ? 'color-burn' : 'color-dodge';
  
  // Set opacity (same as CSS overlay)
  ctx.globalAlpha = 0.65;
  
  // Fill full canvas with gradient (wall will be drawn on top, hiding overflow)
  ctx.fillStyle = cachedGradient;
  ctx.fillRect(0, 0, w, h);
  
  // Restore state (critical: don't affect wall rendering)
  ctx.restore();
}

/**
 * Invalidate gradient cache (call on theme change)
 */
function invalidateDepthWashCache() {
  cachedGradient = null;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              BALL SPAWNING                                   ║
// ║              Extracted from balls-source.html lines 2249-2284                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function clamp$4(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function spawnBall(x, y, color, distributionIndex) {
  const globals = getGlobals();
  
  // If no color provided, pick one with its distribution index
  if (!color) {
    const picked = pickRandomColorWithIndex();
    color = picked.color;
    distributionIndex = picked.distributionIndex;
  }
  
  // Per-mode sizing rule:
  // Radius depends on the current mode's 0..1 variation slider, scaled by global multiplier.
  const r = randomRadiusForMode(globals, globals.currentMode || MODES.PIT);
  
  const ball = new Ball(x, y, r, color);
  
  // Store the distribution index for legend filtering
  // This maps to the colorDistribution array (0-6 for 7 labels)
  ball.distributionIndex = (distributionIndex !== undefined) ? distributionIndex : -1;
  
  const centerX = globals.canvas.width * 0.5;
  const dir = (x < centerX) ? 1 : -1;
  const sizeInfluence = clamp$4((r / ((globals.R_MIN + globals.R_MAX) * 0.5)), 0.6, 1.4);
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
  
  const targetBalls = getMobileAdjustedCount(globals.fliesBallCount ?? 60);
  if (targetBalls <= 0) return;
  const w = globals.canvas.width;
  const h = globals.canvas.height;
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  const swarmRadius = 150 * globals.DPR;
  
  // Initial velocity base (DPR-scaled)
  const baseSpeed = 300 * globals.DPR;
  
  // First, ensure at least one ball of each color (0-7)
  for (let colorIndex = 0; colorIndex < 8; colorIndex++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * swarmRadius;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    
    const ball = spawnBall(x, y, pickRandomColor());
    
    const speedVariation = 0.5 + Math.random() * 0.5;
    const vAngle = Math.random() * Math.PI * 2;
    const speed = baseSpeed * speedVariation;
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
    const speed = baseSpeed * speedVariation;
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


function spawnPourBallPit(globals, targetBalls) {
  const w = globals.canvas.width;
  const h = globals.canvas.height;
  const DPR = globals.DPR;

  // Spawn balls ABOVE the canvas (negative Y coordinates)
  // They will fall into the visible area via gravity
  // This is "negative spacing" - spawn area extends above y=0
  // Drop-in from higher: +30% taller spawn band above the canvas.
  const spawnHeight = h * 0.65; // was 0.50h
  const spawnYTop = -spawnHeight;
  const spawnYBottom = 0;

  // Spawn from the top, biased toward the right but ~1/3 in toward center.
  // Keep a narrow band so the drop-in reads as a deliberate "pour".
  const padding = (globals.wallThickness || 20) * DPR;
  const spawnXLeft = padding;
  const spawnXRight = w - padding;
  const usableW = spawnXRight - spawnXLeft;
  const spawnBandWidth = Math.max(1, usableW * 0.22);
  const anchorX = spawnXLeft + usableW * (2 / 3); // one-third in from right edge
  const spawnXMin = Math.max(spawnXLeft, anchorX - spawnBandWidth * 0.5);
  const spawnXMax = Math.min(spawnXRight, anchorX + spawnBandWidth * 0.5);

  const count = Math.max(0, targetBalls | 0);
  
  // Initial velocity base values (DPR-scaled)
  const vxBase = 100 * DPR;
  const vyBase = 50 * DPR;

  // Color distribution is handled by spawnBall() via pickRandomColor().
  for (let i = 0; i < count; i++) {
    const x = spawnXMin + Math.random() * (spawnXMax - spawnXMin);
    const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);

    const ball = spawnBall(x, y);
    // Small downward velocity and random horizontal drift (DPR-scaled)
    ball.vx = (Math.random() - 0.5) * vxBase;
    ball.vy = Math.random() * vyBase + vyBase; // Initial downward velocity
    ball.driftAx = 0;
    ball.driftTime = 0;
  }
}

function initializeBallPit() {
  const globals = getGlobals();
  clearBalls();
  
  const targetBalls = getMobileAdjustedCount(globals.maxBalls ?? 300);
  spawnPourBallPit(globals, targetBalls);
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
// ║            Snooker-style triangle arrangement in center                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


/**
 * Calculate number of rows needed for a triangle arrangement to fit target ball count
 * Triangle with n rows has n*(n+1)/2 balls
 */
function calculateTriangleRows(targetBalls) {
  let rows = 1;
  while (rows * (rows + 1) / 2 < targetBalls) {
    rows++;
  }
  return rows;
}

/**
 * Arrange balls in a triangle formation (snooker rack style) centered in viewport
 */
function arrangeBallsInTriangle(globals, targetBalls) {
  const canvas = globals.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const DPR = globals.DPR || 1;
  
  // Calculate rows needed for triangle
  const rows = calculateTriangleRows(targetBalls);
  const actualBalls = Math.min(targetBalls, rows * (rows + 1) / 2);
  
  // Get average ball radius for spacing
  const avgRadius = ((globals.R_MIN || 15) + (globals.R_MAX || 25)) * 0.5 * DPR;
  const spacing = avgRadius * 2.1; // Slight gap between balls
  
  // Center of viewport
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  
  // Calculate total triangle width and height
  const triangleWidth = (rows - 1) * spacing;
  const triangleHeight = (rows - 1) * spacing * Math.sqrt(3) / 2;
  
  // Starting position (top of triangle, centered horizontally)
  const startX = centerX - triangleWidth * 0.5;
  const startY = centerY - triangleHeight * 0.5;
  
  let ballIndex = 0;
  
  // Create triangle arrangement: row 1 has 1 ball, row 2 has 2, etc.
  for (let row = 0; row < rows && ballIndex < actualBalls; row++) {
    const ballsInRow = row + 1;
    const rowWidth = (ballsInRow - 1) * spacing;
    const rowX = startX + (triangleWidth - rowWidth) * 0.5;
    const rowY = startY + row * spacing * Math.sqrt(3) / 2;
    
    for (let col = 0; col < ballsInRow && ballIndex < actualBalls; col++) {
      const x = rowX + col * spacing;
      const y = rowY;
      
      const ball = spawnBall(x, y);
      
      // Start stationary (zero velocity) - will move when mouse interacts
      ball.vx = 0;
      ball.vy = 0;
      ball.omega = 0;
      ball.driftAx = 0;
      ball.driftTime = 0;
      
      ballIndex++;
    }
  }
  
  return ballIndex;
}

function initializeWeightless() {
  const globals = getGlobals();
  clearBalls();
  
  const targetBalls = getMobileAdjustedCount(globals.weightlessCount);
  if (targetBalls <= 0) return;
  
  // Arrange balls in triangle formation (snooker rack style)
  arrangeBallsInTriangle(globals, targetBalls);
}

function applyWeightlessForces(ball, dt) {
  const globals = getGlobals();
  if (!globals.mouseInCanvas) return;

  const radius = globals.weightlessRepelRadius ?? 0;
  const power = globals.weightlessRepelPower ?? 0;
  if (radius <= 0 || power <= 0) return;

  // Treat as “CSS px” and scale into canvas units via DPR (matches Ball Pit repeller behavior).
  const rPx = radius * (globals.DPR || 1);
  const dx = ball.x - globals.mouseX;
  const dy = ball.y - globals.mouseY;
  const d2 = dx * dx + dy * dy;
  const r2 = rPx * rPx;
  if (d2 > r2) return;

  const d = Math.max(Math.sqrt(d2), 1e-4);
  const nx = dx / d;
  const ny = dy / d;

  // Strong near-field impulse (“explosion” feel), smoothly falling off to 0 at the radius.
  const q = Math.max(0, 1 - d / rPx);
  const soft = globals.weightlessRepelSoft ?? 2.2;
  const strength = (power * 20.0) * Math.pow(q, soft);

  const massScale = Math.max(0.25, ball.m / globals.MASS_BASELINE_KG);
  ball.vx += (nx * strength * dt) / massScale;
  ball.vy += (ny * strength * dt) / massScale;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           RENDERING EFFECTS                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function applyCanvasShadow(canvas) {
  // Shadows disabled - always clear filter
    canvas.style.filter = '';
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

// Track previous canvas dimensions for dynamic ball repositioning on resize
let prevCanvasWidth = 0;
let prevCanvasHeight = 0;

// Debounce resize to prevent excessive recalculation during drag-resize
let resizeDebounceId = null;

// Callback to force immediate render after canvas dimensions change
// This prevents blank frames during resize
let forceRenderCallback = null;

/**
 * Register a callback to force render after canvas dimension changes
 * Called by main.js after render loop is set up
 */
function setForceRenderCallback(callback) {
  forceRenderCallback = callback;
}

// Cached canvas clip path (rounded rect) — recomputed on resize only.
// This prevents iOS/mobile corner “bleed” where canvas pixels can peek past the
// container’s rounded corners during fast motion / compositing.
let cachedClipW = 0;
let cachedClipH = 0;
let cachedClipR = 0;

function buildRoundedRectPath(w, h, r) {
  // Build a rounded-rect path in *canvas pixel* space.
  // Important: keep allocation out of hot paths (called only on resize).
  const rr = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));
  if (typeof Path2D === 'undefined') return null;
  const p = new Path2D();

  if (rr <= 0) {
    p.rect(0, 0, w, h);
    return p;
  }

  // Rounded rect via arcTo (widely supported).
  p.moveTo(rr, 0);
  p.lineTo(w - rr, 0);
  p.arcTo(w, 0, w, rr, rr);
  p.lineTo(w, h - rr);
  p.arcTo(w, h, w - rr, h, rr);
  p.lineTo(rr, h);
  p.arcTo(0, h, 0, h - rr, rr);
  p.lineTo(0, rr);
  p.arcTo(0, 0, rr, 0, rr);
  p.closePath();
  return p;
}

function detectOptimalDPR() {
  const baseDPR = window.devicePixelRatio || 1;
  
  // Check for low-power hints
  const isLowPower = navigator.connection?.saveData || 
                     navigator.hardwareConcurrency <= 4 ||
                     /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  // Cap DPR more aggressively on mobile/low-power devices
  if (isLowPower) {
    const lowPowerCap = 1.25;
    effectiveDPR = Math.min(baseDPR, lowPowerCap);
    console.log(`⚡ Adaptive DPR: Reduced to ${effectiveDPR}x for performance`);
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
  
  // Debounced resize handler for smooth continuous resize (e.g., drag resize)
  const debouncedResize = () => {
    if (resizeDebounceId) cancelAnimationFrame(resizeDebounceId);
    resizeDebounceId = requestAnimationFrame(() => {
      resize();
      resizeDebounceId = null;
    });
  };
  
  window.addEventListener('resize', debouncedResize);
  
  // Enhanced responsiveness: handle edge cases where 'resize' event doesn't fire
  // - iOS Safari: virtual keyboard, safe area changes, rotation quirks
  // - Android: virtual keyboard showing/hiding
  // - Desktop: browser DevTools dock changes
  window.addEventListener('orientationchange', () => {
    // iOS needs a delay after orientation change for accurate dimensions
    setTimeout(resize, 100);
    setTimeout(resize, 300); // Fallback for slow devices
  });
  
  // Visual Viewport API: catches more edge cases (iOS notch, virtual keyboard)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', debouncedResize);
    window.visualViewport.addEventListener('scroll', debouncedResize); // For notch/safe-area shifts
  }
  
  // ResizeObserver: catches CSS-driven size changes that don't trigger window resize
  // (e.g., DevTools open/close, dynamic padding changes, CSS transitions)
  if (typeof ResizeObserver !== 'undefined') {
    const container = document.getElementById('bravia-balls');
    if (container) {
      const resizeObserver = new ResizeObserver((entries) => {
        // Debounce to avoid thrashing during CSS transitions
        debouncedResize();
      });
      resizeObserver.observe(container);
    }
  }
  
  console.log(`✓ Renderer optimized (DPR: ${effectiveDPR.toFixed(2)}, desync: ${ctx.getContextAttributes?.()?.desynchronized ?? 'unknown'})`);
}

/**
 * Resize canvas to match container dimensions minus wall thickness.
 * 
 * The rubber wall system uses wall thickness as the inset for the canvas.
 * CSS handles positioning (top/left/right/bottom = wallThickness)
 * JS handles buffer dimensions for high-DPI rendering.
 * 
 * DYNAMIC BALL REPOSITIONING:
 * When the canvas resizes, balls are scaled proportionally to maintain their
 * relative positions within the viewport. This prevents balls from:
 * - Disappearing outside new bounds when shrinking
 * - Clustering in one corner when expanding
 */
function resize() {
  if (!canvas) return;
  
  const globals = getGlobals();

  // ══════════════════════════════════════════════════════════════════════════════
  // iOS SAFARI VIEWPORT FIX:
  // Keep a CSS var synced to the *visual* viewport height (keyboard + URL bar aware).
  // This ensures fixed-position "frame" layers size to the actually visible area.
  // Runs only on resize events (debounced by rAF), not in hot render loops.
  // ══════════════════════════════════════════════════════════════════════════════
  try {
    const vv = window.visualViewport;
    // iOS Safari can transiently report 0 for vv.width/height during keyboard/zoom.
    // Never propagate 0-sized viewport values into layout CSS vars.
    const rawVh = (vv && typeof vv.height === 'number') ? vv.height : window.innerHeight;
    const rawVw = (vv && typeof vv.width === 'number') ? vv.width : window.innerWidth;
    const vhPx = rawVh > 0 ? rawVh : window.innerHeight;
    const vwPx = rawVw > 0 ? rawVw : window.innerWidth;

    const rawTop = (vv && typeof vv.offsetTop === 'number') ? vv.offsetTop : 0;
    const rawLeft = (vv && typeof vv.offsetLeft === 'number') ? vv.offsetLeft : 0;
    const topPx = Number.isFinite(rawTop) ? rawTop : 0;
    const leftPx = Number.isFinite(rawLeft) ? rawLeft : 0;
    // Center of the *visual* viewport (keyboard + URL bar aware).
    let centerYPx = topPx + (vhPx / 2);
    let centerXPx = leftPx + (vwPx / 2);
    // Safety: if anything is still degenerate, fall back to the layout viewport center.
    if (!(centerXPx > 0)) centerXPx = window.innerWidth / 2;
    if (!(centerYPx > 0)) centerYPx = window.innerHeight / 2;

    const rootStyle = document.documentElement?.style;
    rootStyle?.setProperty('--abs-viewport-h', `${vhPx}px`);
    rootStyle?.setProperty('--abs-vv-offset-top', `${topPx}px`);
    rootStyle?.setProperty('--abs-vv-offset-left', `${leftPx}px`);
    rootStyle?.setProperty('--abs-vv-h', `${vhPx}px`);
    rootStyle?.setProperty('--abs-vv-w', `${vwPx}px`);
    rootStyle?.setProperty('--abs-vv-center-x', `${centerXPx}px`);
    rootStyle?.setProperty('--abs-vv-center-y', `${centerYPx}px`);
  } catch (e) {}

  // Keep vw-based layout responsive: on any resize we recompute derived px and
  // restamp CSS vars before measuring container dimensions.
  try {
    applyLayoutFromVwToPx();
    applyLayoutCSSVars();
  } catch (e) {}

  // Keep "mobile scaling" responsive to viewport width (safe: early-outs unless breakpoint changes).
  try { detectResponsiveScale(); } catch (e) {}
  
  // Use container dimensions if available, fallback to window for safety
  const container = globals.container || document.getElementById('bravia-balls');
  const containerWidth = container ? container.clientWidth : window.innerWidth;
  const containerHeight = container ? container.clientHeight : window.innerHeight;
  
  // ══════════════════════════════════════════════════════════════════════════════
  // SAFETY: Skip resize if container reports invalid dimensions
  // This can happen during CSS transitions or when the element is temporarily hidden.
  // Processing 0/negative dimensions would corrupt ball positions (all become 0).
  // ══════════════════════════════════════════════════════════════════════════════
  if (containerWidth <= 0 || containerHeight <= 0) {
    return;
  }
  
  // Canvas CSS is calc(100% + 2px) for edge coverage, so buffer should be container + 2px.
  // This ensures the wall drawing fills to the actual CSS edges.
  const CSS_EDGE_OVERFLOW = 2;
  const canvasWidth = containerWidth + CSS_EDGE_OVERFLOW;
  const canvasHeight = containerHeight + CSS_EDGE_OVERFLOW;
  
  // Canvas fills container - CSS handles mode-specific heights
  // Ball Pit: CSS sets 150vh, Other modes: CSS sets 100%
  const simHeight = canvasHeight;
  
  // Use adaptive DPR for performance (may be lower than device DPR on weak hardware)
  const DPR = effectiveDPR;
  
  // Calculate new buffer dimensions (ceil to prevent sub-pixel gaps at edges)
  const newWidth = Math.ceil(canvasWidth * DPR);
  const newHeight = Math.ceil(simHeight * DPR);
  
  // Safety: ensure we have valid positive dimensions after DPR scaling
  if (newWidth <= 0 || newHeight <= 0) {
    return;
  }
  
  // Early-out if dimensions haven't changed (prevents unnecessary canvas clearing)
  if (newWidth === prevCanvasWidth && newHeight === prevCanvasHeight) {
    return;
  }
  
  // ══════════════════════════════════════════════════════════════════════════════
  // DYNAMIC BALL REPOSITIONING
  // Scale ball positions proportionally when canvas dimensions change.
  // This keeps balls in valid positions relative to the new viewport bounds.
  // ══════════════════════════════════════════════════════════════════════════════
  if (prevCanvasWidth > 0 && prevCanvasHeight > 0 && globals.balls && globals.balls.length > 0) {
    const scaleX = newWidth / prevCanvasWidth;
    const scaleY = newHeight / prevCanvasHeight;
    
    // Safety: only reposition if scale factors are reasonable (not 0, not extreme)
    // Extreme scales (>10x or <0.1x) likely indicate invalid intermediate states
    if (scaleX > 0.1 && scaleX < 10 && scaleY > 0.1 && scaleY < 10) {
      const balls = globals.balls;
      for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];
        if (!ball) continue;
        
        // Scale position proportionally
        ball.x *= scaleX;
        ball.y *= scaleY;
        
        // Clamp to ensure ball stays within new bounds (with radius margin)
        const r = ball.r || 10;
        ball.x = Math.max(r, Math.min(newWidth - r, ball.x));
        ball.y = Math.max(r, Math.min(newHeight - r, ball.y));
        
        // Wake sleeping balls so they can settle into new positions
        if (ball.isSleeping) {
          ball.isSleeping = false;
          ball.sleepTimer = 0;
        }
      }
    }
  }
  
  // Store dimensions for next resize comparison
  prevCanvasWidth = newWidth;
  prevCanvasHeight = newHeight;
  
  // ══════════════════════════════════════════════════════════════════════════════
  // CANVAS DIMENSION UPDATE with flicker prevention
  // Setting canvas.width/height clears the buffer. To prevent flicker:
  // 1. Only update if dimensions actually need changing
  // 2. Immediately render after update (no gap for transparent frame)
  // ══════════════════════════════════════════════════════════════════════════════
  
  // Check if canvas buffer dimensions need updating
  const needsUpdate = canvas.width !== newWidth || canvas.height !== newHeight;
  
  if (needsUpdate) {
    // Set canvas buffer size (high-DPI) - this clears the canvas buffer
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Re-apply context optimizations after resize (some browsers reset them)
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
    }
  }
  
  // Always update CSS display size (doesn't cause flicker)
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = simHeight + 'px';
  
  if (needsUpdate) {
    applyCanvasShadow(canvas);
    
    // Force immediate render after canvas dimension change to prevent blank frame
    if (forceRenderCallback) {
      try {
        forceRenderCallback();
      } catch (e) {
        // Ignore render errors during resize
      }
    }
  }

  // Update cached clip path (rounded-rect) on any resize that changes buffer dims
  // Radius is controlled entirely by rubber wall system - canvas uses rectangular clip (0 radius)
  // This ensures visual rounded corners come only from wall rendering, not canvas clipping
  try {
    // Force 0 radius for canvas clip - rubber wall system controls visual radius
    const rCanvasPx = 0;
    if (canvas.width !== cachedClipW || canvas.height !== cachedClipH || Math.abs(rCanvasPx - cachedClipR) > 1e-3) {
      cachedClipW = canvas.width;
      cachedClipH = canvas.height;
      cachedClipR = rCanvasPx;
      globals.canvasClipPath = buildRoundedRectPath(canvas.width, canvas.height, rCanvasPx);
    }
  } catch (e) {}
}

function getCanvas() {
  return canvas;
}

function getContext() {
  return ctx;
}

var renderer = /*#__PURE__*/Object.freeze({
  __proto__: null,
  getCanvas: getCanvas,
  getContext: getContext,
  resize: resize,
  setForceRenderCallback: setForceRenderCallback,
  setupRenderer: setupRenderer
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          ELECTRONS MODE (3D SPIRAL ORBITS)                    ║
// ║  Balls orbit the mouse in 3D spirals - simple circular orbits with depth    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// Store orbital state per ball using WeakMaps
const orbitalAngle = new WeakMap(); // Current angle in orbit (0 to 2π)
const orbitalRadius = new WeakMap(); // Radius of the orbit
const spiralPhase = new WeakMap(); // Phase for 3D spiral (depth position)
const spiralSpeed = new WeakMap(); // Speed of spiral rotation
const orbitalSpeed = new WeakMap(); // Speed of orbital rotation

function initializeVortex() {
  const g = getGlobals();
  clearBalls();
  // WeakMaps automatically garbage collect when balls are cleared
  
  const canvas = g.canvas;
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const baseCount = Math.min(g.vortexBallCount || 180, g.maxBalls || 500);
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;
  
  // Parameters for spiral orbital initialization
  const DPR = g.DPR || 1;
  const speedMultiplier = g.vortexSpeedMultiplier ?? 1.0;
  const baseOrbitalRadius = g.vortexRadius !== undefined ? g.vortexRadius : 300;
  
  // Create multiple spiral groups with different radii and speeds
  const spiralGroupCount = 3; // Number of different spiral groups
  
  let ballIndex = 0;
  
  // Ensure at least one of each color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = randomRadiusForMode(g, MODES.VORTEX);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(x, y, r, color);
    b.distributionIndex = distributionIndex;
    
    // Initialize 3D spiral orbital parameters
    initSpiralOrbit(b, baseOrbitalRadius, speedMultiplier, DPR, ballIndex % spiralGroupCount);
    
    g.balls.push(b);
    ballIndex++;
  }

  // Add remaining electrons
  for (let i = ballIndex; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = randomRadiusForMode(g, MODES.VORTEX);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(x, y, r, color);
    b.distributionIndex = distributionIndex;
    
    // Initialize 3D spiral orbital parameters
    initSpiralOrbit(b, baseOrbitalRadius, speedMultiplier, DPR, i % spiralGroupCount);
    
    g.balls.push(b);
  }
}

/**
 * Initialize 3D spiral orbital parameters for a ball
 * Creates circular orbits at different radii with 3D spiral depth
 */
function initSpiralOrbit(ball, baseRadius, speedMultiplier, DPR, groupIndex) {
  // Store base radius for 3D size scaling
  ball._vortexBaseRadius = ball.r;
  
  // Orbital radius - varies by group to create distinct spirals
  const radiusVariation = 0.6 + (groupIndex / 3) * 0.8; // 0.6x to 1.4x of base radius
  const orbitRadius = baseRadius * radiusVariation;
  orbitalRadius.set(ball, orbitRadius);
  
  // Starting angle in orbit (random position around the circle)
  const startAngle = Math.random() * Math.PI * 2;
  orbitalAngle.set(ball, startAngle);
  
  // 3D spiral phase - determines depth position in the spiral
  // Each ball starts at a different phase to create the spiral effect
  const spiralPhaseValue = Math.random() * Math.PI * 2;
  spiralPhase.set(ball, spiralPhaseValue);
  
  // Orbital speed - how fast the ball rotates around the mouse
  // Different groups rotate at slightly different speeds for variety
  const baseOrbitalSpeed = 0.8 * speedMultiplier; // Base rotation speed
  const speedVariation = 0.8 + (groupIndex / 3) * 0.4; // 0.8x to 1.2x speed
  const orbitSpeed = baseOrbitalSpeed * speedVariation;
  orbitalSpeed.set(ball, orbitSpeed);
  
  // Spiral speed - how fast the 3D spiral rotates (depth changes)
  // Creates the 3D effect as balls move in and out
  const baseSpiralSpeed = 0.4 * speedMultiplier; // Base spiral speed
  const spiralSpeedValue = baseSpiralSpeed * (0.7 + Math.random() * 0.6); // Vary slightly
  spiralSpeed.set(ball, spiralSpeedValue);
}

function applyVortexForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.VORTEX) return;

  // Use mouse position, or center of canvas if mouse not in canvas
  const mx = g.mouseInCanvas ? g.mouseX : (g.canvas ? g.canvas.width * 0.5 : 0);
  const my = g.mouseInCanvas ? g.mouseY : (g.canvas ? g.canvas.height * 0.5 : 0);
  
  // Get orbital parameters
  let angle = orbitalAngle.get(ball);
  const orbitRad = orbitalRadius.get(ball);
  let spiralPhaseValue = spiralPhase.get(ball);
  const spiralSpeedValue = spiralSpeed.get(ball);
  const orbitSpeedValue = orbitalSpeed.get(ball);
  
  // Initialize if missing (backwards compatibility)
  if (angle === undefined || orbitRad === undefined) {
    const baseRadius = g.vortexRadius !== undefined ? g.vortexRadius : 300;
    initSpiralOrbit(ball, baseRadius, g.vortexSpeedMultiplier ?? 1.0, g.DPR || 1, 0);
    angle = orbitalAngle.get(ball);
    spiralPhaseValue = spiralPhase.get(ball);
  }
  const rotationDirection = g.vortexRotationDirection ?? 1; // 1 = counterclockwise, -1 = clockwise
  const depthVariation = g.vortexDepthVariation ?? 0.6; // How much size changes with z-depth (0-1)
  const spiralTightness = g.vortexSpiralTightness ?? 0.5; // How tightly balls spiral (0-1)
  angle += orbitSpeedValue * rotationDirection * dt;
  // Keep angle in [0, 2π] range
  if (angle > Math.PI * 2) angle -= Math.PI * 2;
  if (angle < 0) angle += Math.PI * 2;
  orbitalAngle.set(ball, angle);
  
  // Update spiral phase - creates 3D depth effect
  // As this changes, the ball moves in and out of the screen
  spiralPhaseValue += spiralSpeedValue * rotationDirection * dt;
  if (spiralPhaseValue > Math.PI * 2) spiralPhaseValue -= Math.PI * 2;
  if (spiralPhaseValue < 0) spiralPhaseValue += Math.PI * 2;
  spiralPhase.set(ball, spiralPhaseValue);
  
  // Calculate 3D depth based on spiral phase
  // Use sine wave to smoothly cycle through depth (0 = back, 1 = front)
  const zDepth = (Math.sin(spiralPhaseValue) + 1) / 2; // 0 to 1
  
  // Effective orbital radius varies with 3D depth (spiral effect)
  // When ball is closer (zDepth = 1), it's at the base radius
  // When ball is farther (zDepth = 0), it's at a larger radius
  const depthRadiusVariation = 1.0 + (1 - zDepth) * spiralTightness * 0.4; // Up to 40% larger when far
  const effectiveRadius = orbitRad * depthRadiusVariation;
  
  // Calculate target position based on orbital angle and effective radius
  const targetX = mx + Math.cos(angle) * effectiveRadius;
  const targetY = my + Math.sin(angle) * effectiveRadius;
  
  // Calculate desired velocity for smooth circular motion
  // Velocity is perpendicular to radius vector (tangential to circle)
  const dx = ball.x - mx;
  const dy = ball.y - my;
  const currentDist = Math.max(30, Math.sqrt(dx * dx + dy * dy));
  
  // Target velocity for circular orbit: v = r * ω (tangential speed)
  const tangentialSpeed = effectiveRadius * orbitSpeedValue * rotationDirection;
  
  // Direction perpendicular to radius (tangential)
  const tangentX = -Math.sin(angle) * rotationDirection;
  const tangentY = Math.cos(angle) * rotationDirection;
  
  // Desired velocity components
  const desiredVx = tangentX * tangentialSpeed;
  const desiredVy = tangentY * tangentialSpeed;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SMOOTH MOVEMENT TOWARD ORBIT (ENHANCED CURSOR FOLLOWING)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Apply forces to guide ball toward circular orbit
  // Use spring-like forces for smooth orbital motion
  const orbitalStrength = g.vortexSwirlStrength || 450;
  
  // Radial force - pulls ball toward correct orbital radius
  // Enhanced for better cursor following
  const radialError = currentDist - effectiveRadius;
  const radialForce = -radialError * orbitalStrength * 0.2; // Increased from 0.1 for better following
  const radialDirX = dx / currentDist;
  const radialDirY = dy / currentDist;
  
  ball.vx += radialDirX * radialForce * dt;
  ball.vy += radialDirY * radialForce * dt;
  
  // Tangential force - maintains circular motion
  // Enhanced for better cursor following
  const currentVx = ball.vx;
  const currentVy = ball.vy;
  const vErrorX = desiredVx - currentVx;
  const vErrorY = desiredVy - currentVy;
  const tangentialForceStrength = orbitalStrength * 0.25; // Increased from 0.15 for better following
  
  ball.vx += vErrorX * tangentialForceStrength * dt;
  ball.vy += vErrorY * tangentialForceStrength * dt;
  
  // Additional direct cursor following force for responsive tracking
  // This makes balls quickly adjust when cursor moves
  const cursorFollowStrength = orbitalStrength * 0.15; // Additional force to follow cursor
  const cursorErrorX = targetX - ball.x;
  const cursorErrorY = targetY - ball.y;
  const cursorDistance = Math.max(1, Math.sqrt(cursorErrorX * cursorErrorX + cursorErrorY * cursorErrorY));
  
  // Only apply cursor following if ball is far from target orbit
  if (cursorDistance > effectiveRadius * 0.2) {
    const followForceX = (cursorErrorX / cursorDistance) * cursorFollowStrength;
    const followForceY = (cursorErrorY / cursorDistance) * cursorFollowStrength;
    ball.vx += followForceX * dt;
    ball.vy += followForceY * dt;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 3D SIZE VARIATION (PERSPECTIVE EFFECT)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Scale ball radius based on z-depth (farther = smaller, closer = larger)
  // Initialize base radius if not set
  if (ball._vortexBaseRadius === undefined) {
    ball._vortexBaseRadius = ball.rBase || ball.r;
  }
  const sizeVariation = 1 - (zDepth * depthVariation); // 1.0 (closest) to (1-depthVariation) (farthest)
  ball.r = ball._vortexBaseRadius * (0.4 + sizeVariation * 0.6); // Scale between 40% and 100% of base
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // DAMPING FOR SMOOTH MOTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Light damping to smooth out motion
  const drag = Math.max(0, Math.min(1, g.vortexDrag ?? 0.01));
  ball.vx *= (1 - drag);
  ball.vy *= (1 - drag);
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
  const baseCount = Math.min(g.pingPongBallCount || 80, g.maxBalls || 300);
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;
  const baseSpeed = g.pingPongSpeed || 400;

  // Ensure at least one of each color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = h * 0.15 + Math.random() * h * 0.7; // Middle 70% vertically
    const r = randomRadiusForMode(g, MODES.PING_PONG);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(x, y, r, color);
    b.distributionIndex = distributionIndex;
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
    const r = randomRadiusForMode(g, MODES.PING_PONG);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(x, y, r, color);
    b.distributionIndex = distributionIndex;
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
    // Cursor radius is derived from vw-based layout in `applyLayoutFromVwToPx()`.
    // Keep this hot path allocation-free and avoid per-frame vw→px conversions.
    const cursorRadius = Math.max(0, (g.pingPongCursorRadius || 0)) * g.DPR;
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
  const vertDamp = Math.max(0, Math.min(1, g.pingPongVerticalDamp ?? 0.995));
  ball.vy *= vertDamp;
  
  // NO OTHER DRAG - balls maintain momentum perfectly
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            MAGNETIC MODE                                     ║
// ║    All balls are attracted to the cursor like metal to a magnet             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function initializeMagnetic() {
  const g = getGlobals();
  clearBalls();
  const canvas = g.canvas;
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const baseCount = Math.min(g.magneticBallCount || 180, g.maxBalls || 300);
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;

  // Initial velocity (DPR-scaled)
  const DPR = g.DPR || 1;
  const initSpeed = 100 * DPR;
  
  // Ensure at least one of each color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = randomRadiusForMode(g, MODES.MAGNETIC);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(x, y, r, color);
    b.distributionIndex = distributionIndex;
    b.vx = (Math.random() - 0.5) * initSpeed;
    b.vy = (Math.random() - 0.5) * initSpeed;
    b.baseAlpha = 1;
    g.balls.push(b);
  }

  for (let i = 8; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = randomRadiusForMode(g, MODES.MAGNETIC);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const b = new Ball(x, y, r, color);
    b.distributionIndex = distributionIndex;
    b.vx = (Math.random() - 0.5) * initSpeed;
    b.vy = (Math.random() - 0.5) * initSpeed;
    b.baseAlpha = 1;
    g.balls.push(b);
  }
}

function applyMagneticForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.MAGNETIC) return;
  if (!g.mouseInCanvas) return;
  
  const DPR = g.DPR || 1;
  const magneticStrength = g.magneticStrength || 65000;
  const magneticRadius = g.magneticRadius || 0; // Optional: max effective radius (0 = unlimited)
  
  const mx = g.mouseX;
  const my = g.mouseY;
  const dx = mx - ball.x;
  const dy = my - ball.y;
  const distSq = dx * dx + dy * dy;
  const dist = Math.max(30 * DPR, Math.sqrt(distSq));
  
  // Check if within magnetic radius (if specified)
  if (magneticRadius > 0) {
    const radiusPx = magneticRadius * DPR;
    if (dist > radiusPx) return; // Too far away, no magnetic effect
  }
  
  // Force magnitude: inverse-square attraction (like metal to magnet)
  // Stronger when closer to cursor
  const forceMag = (magneticStrength / distSq) * 1000;
  
  // Normalize direction (toward cursor)
  const nx = dx / dist;
  const ny = dy / dist;
  
  // Always attract (like metal to magnet) - no repulsion
  ball.vx += nx * forceMag * dt;
  ball.vy += ny * forceMag * dt;
  
  // Remove rotation to prevent spiraling - zero angular velocity
  ball.omega = 0;
  
  // Velocity cap to prevent explosion (DPR-scaled)
  const maxVel = (g.magneticMaxVelocity || 2800) * DPR;
  const vel = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (vel > maxVel) {
    ball.vx = (ball.vx / vel) * maxVel;
    ball.vy = (ball.vy / vel) * maxVel;
  }
  
  // Damping (configurable)
  const damping = g.magneticDamping ?? 0.998;
  ball.vx *= damping;
  ball.vy *= damping;
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
// ║    Bubbles rise from bottom with wobble, pop instantly at top, then recycle  ║
// ║    Scale up from 0 on every spawn for a clean entrance                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function initializeBubbles() {
  const g = getGlobals();
  // Clear existing balls
  g.balls.length = 0;
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const count = getMobileAdjustedCount(g.bubblesMaxCount || 200); // Increased for continuous coverage
  if (count <= 0) return;
  
  // Initial distribution: spread across the entire height with staggered spawn progress
  // to avoid clumping at the bottom on first frame. Recycles still come from below.
  // First ensure one of each color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const seededProgress = Math.random(); // staggered scale-in phase
    createBubble(x, y, color, distributionIndex, false, seededProgress);
  }
  
  // Fill rest with random colors across height, staggered progress
  for (let i = 8; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const seededProgress = Math.random();
    createBubble(x, y, color, distributionIndex, false, seededProgress);
  }
}

/**
 * Create a bubble ball at position (x, y) with given color
 * @param {boolean} alreadyVisible - If true, skip spawn animation (for initial setup)
 * @param {number} [spawnProgressSeed] - Optional 0..1 seed to stagger initial spawn
 */
function createBubble(x, y, color, distributionIndex, alreadyVisible = false, spawnProgressSeed) {
  const g = getGlobals();
  const DPR = g.DPR || 1;
  
  // Per-mode sizing system: bubbles vary only according to the Bubbles variation slider.
  const sizeBias = 0.9 + Math.random() * 0.2; // Tight spread: ~0.9–1.1 for similar sizes
  const targetRadius = randomRadiusForMode(g, MODES.BUBBLES) * sizeBias;
  
  const baseProgress = Number.isFinite(spawnProgressSeed) ? Math.max(0, Math.min(1, spawnProgressSeed)) : (alreadyVisible ? 1 : 0);
  const initialEase = 1 - Math.pow(1 - baseProgress, 3);
  const initialRadius = targetRadius * initialEase;
  const b = new Ball(x, y, initialRadius, color);
  b.distributionIndex = distributionIndex;
  b.isBubble = true;
  b.baseRadius = targetRadius;
  b.targetRadius = targetRadius;
  b.wobblePhase = Math.random() * Math.PI * 2;
  b.wobbleFreq = 2 + Math.random() * 3;
  // Initial velocity (DPR-scaled)
  b.vx = (Math.random() - 0.5) * 28 * DPR;
  b.vy = (-160 - Math.random() * 140) * DPR;
  
  // Animation states
  b.spawning = baseProgress < 1 && !alreadyVisible;
  b.spawnProgress = baseProgress;
  b.dissipating = false;
  b.dissipateProgress = 0;
  b.alpha = 1;
  b.microBurst = false;
  b.microTime = 0;
  b.microLife = 0;
  b.microStartRadius = 0;
  b.wobbleMul = 0.6 + Math.random() * 0.8; // Per-bubble wobble strength
  
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
  
  const DPR = g.DPR || 1;
  const w = canvas.width;
  const h = canvas.height;
  
  // New random x position at bottom
  ball.x = Math.random() * w;
  // Spawn 60-90px below screen so scale-in completes as bubble enters view
  // (bubbles rise ~50px during 0.33s spawn animation)
  ball.y = h + (60 + Math.random() * 30) * DPR;
  
  // Reset velocity (DPR-scaled)
  ball.vx = (Math.random() - 0.5) * 20 * DPR;
  ball.vy = (-50 - Math.random() * 50) * DPR;
  
  // New wobble phase
  ball.wobblePhase = Math.random() * Math.PI * 2;
  ball.wobbleFreq = 2 + Math.random() * 3;
  
  // New random color from full palette (using weighted distribution)
  ball.color = pickRandomColor();
  
  // New target size (bias toward smaller)
  const sizeBias = 0.9 + Math.random() * 0.2;
  ball.targetRadius = randomRadiusForMode(g, MODES.BUBBLES) * sizeBias;
  ball.baseRadius = ball.targetRadius;
  
  // Start spawn animation (scale up from 0 to full size)
  ball.r = 0;
  ball.rBase = 0;
  ball.spawning = true;
  ball.spawnProgress = 0;
  ball.dissipating = false;
  ball.dissipateProgress = 0;
  ball.alpha = 1;
  ball.microBurst = false;
  ball.microTime = 0;
  ball.microLife = 0;
  ball.microStartRadius = 0;
  ball.wobbleMul = 0.6 + Math.random() * 0.8;
}

function applyBubblesForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.BUBBLES) return;
  if (!ball.isBubble) return;
  
  const canvas = g.canvas;
  if (!canvas) return;

  // Micro-burst phase: tiny burst that fades quickly, then recycle
  if (ball.microBurst) {
    ball.microTime += dt;
    const life = ball.microLife || 0.18;
    const t = Math.min(1, life > 0 ? ball.microTime / life : 1);
    const shrink = Math.max(0, 1 - t);
    ball.vx *= 0.94;
    ball.vy *= 0.90;
    ball.r = ball.microStartRadius * shrink;
    ball.rBase = ball.r;
    ball.alpha = Math.max(0, 1 - t);
    if (t >= 1) {
      ball.microBurst = false;
      recycleBubble(ball);
    }
    return;
  }
  
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
  
  const riseSpeed = g.bubblesRiseSpeed || 150;
  const wobbleStrength = ((g.bubblesWobble || 40) * 0.01) * (ball.wobbleMul || 1);
  
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
    // Cursor deflect radius is derived from vw-based layout in `applyLayoutFromVwToPx()`.
    // Keep this hot path allocation-free and avoid per-frame vw→px conversions.
    const collisionRadius = Math.max(0, (g.bubblesDeflectRadius || 0)) * g.DPR;
    
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
  
  // Check if bubble reached very top - instantly pop and recycle
  const topThreshold = ball.targetRadius * 2; // Very close to top edge
  
  if (ball.y < topThreshold && !ball.spawning && !ball.microBurst) {
    // Start micro-burst pop: quick fade/shrink, then recycle to bottom
    ball.microBurst = true;
    ball.microTime = 0;
    ball.microLife = 0.18;
    ball.microStartRadius = Math.max(0.2, ball.targetRadius * 0.5);
    ball.r = ball.microStartRadius;
    ball.rBase = ball.r;
    ball.alpha = 1;
    ball.vx = (Math.random() - 0.5) * 40 * g.DPR;
    ball.vy = -(260 + Math.random() * 140) * g.DPR;
    return;
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


const TAU = Math.PI * 2;
const EPS = 1e-6;

// Render-time smoothing state (mouse-driven rotation should ease-in/out)
let _lastRenderMs = 0;

function clamp$3(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function getLensCenterX(canvas) {
  return canvas.width * 0.5;
}

function getLensCenterY(canvas) {
  return canvas.height * 0.5;
}

function getViewportUnit(g) {
  // Use 1000px as a neutral baseline. Values scale proportionally with viewport size.
  const canvas = g.canvas;
  if (!canvas) return 1;
  return clamp$3(Math.min(canvas.width, canvas.height) / 1000, 0.35, 3.0);
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
  return clamp$3((now - last) / 1000, 0, 0.05);
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

function getKaleidoscopeParams(g) {
  // Use KALEIDOSCOPE_3 parameters (now the only kaleidoscope mode)
  return {
    count: g.kaleidoscope3BallCount ?? g.kaleidoscopeBallCount ?? 150,
    wedges: g.kaleidoscope3Wedges ?? g.kaleidoscopeWedges ?? 10,
    speed: g.kaleidoscope3Speed ?? g.kaleidoscopeSpeed ?? 1.2,
    complexity: 1.35,
    spawnAreaMul: g.kaleidoscope3SpawnAreaMul ?? g.kaleidoscopeSpawnAreaMul ?? 1.05,
    sizeVariance: g.kaleidoscope3SizeVariance ?? g.kaleidoscopeSizeVariance ?? 0.5
  };
}

// Initialize with specific ball count (used by all kaleidoscope variants)
function initializeKaleidoscopeWithCount(count, mode) {
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
  const clampedCount = clamp$3(Math.max(0, count | 0), 0, maxBalls);
  if (clampedCount <= 0) return;

  // Get mode-specific params including spawn area multiplier
  const params = getKaleidoscopeParams(g);
  const spawnAreaMul = clamp$3(params.spawnAreaMul ?? 1.0, 0.2, 2.0);

  // Spawn as a loose ring so the first frame is already "kaleidoscopic".
  // SpawnAreaMul controls density: smaller = tighter/denser, larger = more spread
  const viewportSize = Math.min(w, h);
  const ringMin = viewportSize * 0.05;
  // Base ringMax at 2.8, scaled by spawn area multiplier
  const ringMax = viewportSize * 2.8 * spawnAreaMul;

  // Non-overlapping spawn (one-time O(n²), acceptable at init)
  const placed = [];
  const maxAttemptsPerBall = 90;

  const palette = Array.isArray(g.currentColors) ? g.currentColors : [];
  const distribution = Array.isArray(g.colorDistribution) ? g.colorDistribution : [];
  const ACCENT_INDICES = [5, 6, 7, 3, 0];  // vivid anchors + light grey (index 0)
  const NEUTRAL_INDICES = [0, 1, 2, 4]; // greys/black

  function findDistributionIndexForPaletteIdx(idx) {
    const clamped = Math.max(0, Math.min(7, idx | 0));
    for (let i = 0; i < distribution.length; i++) {
      const row = distribution[i];
      if ((row?.colorIndex | 0) === clamped) return i;
    }
    return 0;
  }

  function pickBiasedColor(rr) {
    const rNorm = Math.max(0, Math.min(1, rr / Math.max(ringMax, 1)));
    // Inner/mid bands = saturated accents; outer band = neutrals.
    const useAccents = rNorm <= 0.55 ? true : rNorm >= 0.75 ? false : Math.random() < 0.65;
    const pool = useAccents ? ACCENT_INDICES : NEUTRAL_INDICES;
    const paletteIdx = pool[Math.floor(Math.random() * pool.length)] ?? 0;
    const color = palette[paletteIdx] || palette[0] || '#ffffff';
    const distributionIndex = findDistributionIndexForPaletteIdx(paletteIdx);
    return { color, distributionIndex };
  }

  function spawnOne() {
    const radius = randomRadiusForKaleidoscopeVh(g, mode);
    // Allow spawning well beyond viewport bounds (for 200% more surface area)
    const spawnMargin = ringMax * 1.2; // Extra margin beyond max radius
    const minX = centerX - spawnMargin;
    const maxX = centerX + spawnMargin;
    const minY = centerY - spawnMargin;
    const maxY = centerY + spawnMargin;

    for (let attempt = 0; attempt < maxAttemptsPerBall; attempt++) {
      const a = Math.random() * TAU;
      const rr = ringMin + Math.random() * (ringMax - ringMin);
      const x = clamp$3(centerX + Math.cos(a) * rr, minX, maxX);
      const y = clamp$3(centerY + Math.sin(a) * rr, minY, maxY);
      // Spacing is now a ratio of ball radius (e.g., 0.1 = 10% of radius)
      const spacedRadius = radius * (1 + (g.ballSpacing || 0));
      if (!isOverlapping(placed, x, y, spacedRadius)) {
        placed.push({ x, y, r: spacedRadius });
        const { color, distributionIndex } = pickBiasedColor(rr);
        const b = new Ball(x, y, radius, color);
        b.distributionIndex = distributionIndex;
        b._kaleiSeed = Math.random() * TAU;
        // Lock in an individual "orbit band" so the system stays distributed
        // (prevents everything collapsing into a single ring).
        const ddx = x - centerX;
        const ddy = y - centerY;
        b._kaleiR0 = Math.sqrt(ddx * ddx + ddy * ddy);
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
    const a = Math.random() * TAU;
    const rr = ringMin + Math.random() * (ringMax - ringMin);
    const x = centerX + Math.cos(a) * rr;
    const y = centerY + Math.sin(a) * rr;
    const { color, distributionIndex } = pickBiasedColor(rr);
    const b = new Ball(x, y, radius, color);
    b.distributionIndex = distributionIndex;
    b._kaleiSeed = Math.random() * TAU;
    const ddx = x - centerX;
    const ddy = y - centerY;
    b._kaleiR0 = Math.sqrt(ddx * ddx + ddy * ddy);
    const speed = (12 + Math.random() * 12) * unit;
    b.vx = -Math.sin(a) * speed;
    b.vy = Math.cos(a) * speed;
    b.driftAx = 0;
    b.driftTime = 0;
    g.balls.push(b);
  }

  for (let i = 0; i < clampedCount; i++) {
    spawnOne();
  }
}

function initializeKaleidoscope() {
  const g = getGlobals();
  const count = getMobileAdjustedCount(g.kaleidoscope3BallCount ?? g.kaleidoscopeBallCount ?? 150);
  initializeKaleidoscopeWithCount(count, MODES.KALEIDOSCOPE);
}

// Helper to check if we're in kaleidoscope mode
function isKaleidoscopeMode(mode) {
  return mode === MODES.KALEIDOSCOPE;
}

// Get complexity level for current mode (affects morph intensity)
function getKaleidoscopeComplexity(g) {
  return getKaleidoscopeParams(g).complexity;
}

function applyKaleidoscopeForces(ball, dt) {
  const g = getGlobals();
  if (!isKaleidoscopeMode(g.currentMode)) return;

  const canvas = g.canvas;
  if (!canvas) return;

  // IMPORTANT:
  // - Keep this force model simple and predictable.
  // - User-facing control is `kaleidoscopeSpeed` (config + panel).
  // - No per-frame allocations in this hot path.
  // - Movement ONLY when mouse is moving; still when idle.

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const unit = getViewportUnit(g);
  const speed = clamp$3(getKaleidoscopeParams(g).speed ?? 1.0, 0.2, 2.0);

  // ───────────────────────────────────────────────────────────────────────────
  // Activity envelope: ramps up when mouse moves, decays to zero when idle.
  // This makes the kaleidoscope perfectly still when you stop moving.
  // ───────────────────────────────────────────────────────────────────────────
  const nowMs = performance.now();
  const sinceMoveMs = nowMs - (g.lastPointerMoveMs || 0);
  const movingRecently = sinceMoveMs < 120; // grace window for smooth release

  if (g._kaleiActivity === undefined) g._kaleiActivity = 0;
  const targetActivity = movingRecently ? 1 : 0;
  const tauIn = 0.45;   // ramp-up time constant (seconds) - much smoother eased start
  const tauOut = 0.65;  // decay time constant (seconds) - very gentle stop
  const tau = targetActivity > g._kaleiActivity ? tauIn : tauOut;
  const k = 1 - Math.exp(-dt / Math.max(1e-4, tau));
  g._kaleiActivity += (targetActivity - g._kaleiActivity) * k;

  const activity = g._kaleiActivity;
  const complexity = getKaleidoscopeComplexity(g);

  // Very subtle idle movement: gentle drift keeps scene alive when pointer rests.
  const idleBase = Math.max(0, g.kaleidoscopeIdleDrift ?? 0.012);
  const idleStrength = g.prefersReducedMotion ? 0 : idleBase * complexity * (1 - Math.min(1, activity * 0.7));

  if (idleStrength > 0) {
    const t = nowMs * 0.00035;
    const seed = (ball._kaleiSeed ?? 0) + ball.age * 0.02;
    const driftAngle = seed + t;
    const driftX = Math.cos(driftAngle) * idleStrength * 9;
    const driftY = Math.sin(driftAngle * 1.1) * idleStrength * 9;
    ball.vx += driftX * dt;
    ball.vy += driftY * dt;
  }

  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const dist = Math.max(EPS, Math.sqrt(dx * dx + dy * dy));
  const nx = dx / dist;
  const ny = dy / dist;

  const tx = -ny;
  const ty = nx;

  // Tangential swirl accel (px/s²). 6x slower than before (30 vs 180).
  // The `unit` keeps it consistent across viewports.
  const swirlA = (30 * unit) * speed * activity;

  // Radial band stabilizer: each ball keeps its own orbit radius (seeded at spawn)
  // so the pattern remains distributed (no single "ring lock").
  const targetR = (ball._kaleiR0 !== undefined) ? ball._kaleiR0 : dist;
  const radialError = dist - targetR;
  const radialA = -(radialError * (2.5 * speed * activity)); // gentler spring

  // Apply accelerations
  ball.vx += (tx * swirlA + nx * radialA) * dt;
  ball.vy += (ty * swirlA + ny * radialA) * dt;

  // Gentle damping to prevent runaway energy
  const damp = 0.992;
  ball.vx *= damp;
  ball.vy *= damp;
}

function renderKaleidoscope(ctx) {
  const g = getGlobals();
  if (!isKaleidoscopeMode(g.currentMode)) return;

  const canvas = g.canvas;
  if (!canvas) return;

  const dt = getRenderDtSeconds();

  const balls = g.balls;
  const w = canvas.width;
  const h = canvas.height;
  const unit = getViewportUnit(g);

  // Use reduced wedge count on mobile for performance (50% fewer draw calls)
  const isMobile = g.isMobile || g.isMobileViewport;
  const wedgesRaw = isMobile
    ? (g.kaleidoscope3WedgesMobile ?? 6)
    : (getKaleidoscopeParams(g).wedges ?? 12);
  const wedges = clamp$3(Math.round(wedgesRaw), 3, 24);
  const mirror = Boolean(g.kaleidoscopeMirror ?? true);

  const cx = getLensCenterX(canvas);
  const cy = getLensCenterY(canvas);

  // “Proper” kaleidoscope mapping:
  // Fold polar angle into a single wedge, mirror within wedge, then replicate across wedges.
  // Mouse affects the mapping (pan + phase), not the kaleidoscope center position.

  const wedgeAngle = TAU / wedges;
  const seamEps = Math.max(1e-5, wedgeAngle * 1e-4); // keep away from exact seam angles

  // Mouse-driven mapping offsets
  const mx = g.mouseInCanvas ? g.mouseX : cx;
  const my = g.mouseInCanvas ? g.mouseY : cy;
  const mdx = mx - cx;
  const mdy = my - cy;
  const mouseAngle = Math.atan2(mdy, mdx);
  const mDist = Math.hypot(mdx, mdy);
  const mDistN = clamp$3(mDist / Math.max(1, Math.min(w, h) * 0.5), 0, 1);

  // Real kaleidoscope morphing: mouse position shifts which part of the source pattern
  // gets sampled, creating transformation (not just rotation).
  // We need both phase (rotation) and pan (position shift) for true morphing.
  if (!g._kaleiMorph) {
    g._kaleiMorph = {
      phase: { x: 0, v: 0 },
      panX: { x: 0, v: 0 },
      panY: { x: 0, v: 0 },
      lastMouseX: mx,
      lastMouseY: my,
      lastInCanvas: Boolean(g.mouseInCanvas)
    };
  }
  const morph = g._kaleiMorph;
  const inCanvasNow = Boolean(g.mouseInCanvas);
  const movedPx = Math.hypot(mx - morph.lastMouseX, my - morph.lastMouseY);
  const moved = movedPx > 0.5 || inCanvasNow !== morph.lastInCanvas;

  // Pan strength: how much mouse movement shifts the sampling point (creates morphing).
  // Complexity affects morph intensity (more complex = more dramatic transformations).
  // Increased base values for more complex movement.
  const speed = clamp$3(getKaleidoscopeParams(g).speed ?? 1.0, 0.2, 2.0);
  const complexity = getKaleidoscopeComplexity(g);
  const panStrength = 0.65 * speed * complexity; // Increased from 0.35 for more complex movement
  const panXTarget = mdx * panStrength * (g.mouseInCanvas ? 1 : 0);
  const panYTarget = mdy * panStrength * (g.mouseInCanvas ? 1 : 0);
  const phaseTarget = mouseAngle * (0.7 * complexity) * (g.mouseInCanvas ? 1 : 0); // Increased from 0.4 for more rotation

  // Idle evolution: slow continuous rotation when mouse isn't moving
  // This keeps the kaleidoscope "alive" and mesmerizing even when idle
  const idleSpeed = g.kaleidoscopeIdleSpeed ?? 0.08; // radians per second base
  const idleSpeedScaled = idleSpeed * complexity * (g.prefersReducedMotion ? 0 : 1);
  
  if (moved) {
    morph.lastMouseX = mx;
    morph.lastMouseY = my;
    morph.lastInCanvas = inCanvasNow;
    springTo(morph.phase, phaseTarget, dt, 4.5); // Slow eased rotation
    springTo(morph.panX, panXTarget, dt, 5.0);   // Slow eased pan X
    springTo(morph.panY, panYTarget, dt, 5.0);   // Slow eased pan Y
  } else {
    // When idle, slowly evolve the phase for continuous gentle rotation
    if (idleSpeedScaled > 0) {
      morph.phase.x += idleSpeedScaled * dt;
      // Keep phase in reasonable range to avoid floating point issues
      const twoPi = Math.PI * 2;
      if (morph.phase.x > twoPi) morph.phase.x -= twoPi;
      if (morph.phase.x < -twoPi) morph.phase.x += twoPi;
    }
    morph.phase.v = 0;
    morph.panX.v = 0;
    morph.panY.v = 0;
  }

  const phase = morph.phase.x;
  const panX = morph.panX.x;
  const panY = morph.panY.x;

  // "Breathing" depth: as you move the mouse outward/inward, the rings zoom.
  const speed01 = clamp$3((speed - 0.2) / 1.8, 0, 1);
  const zoomRange = 0.22 + 0.18 * speed01; // 0.22..0.40
  const zoom = 1 - zoomRange + (1 - mDistN) * (2 * zoomRange); // maps to [1-zoomRange, 1+zoomRange]

  // Pre-compute cos/sin lookup table for wedge base angles (avoids trig in hot loop)
  const wedgeCos = new Float32Array(wedges);
  const wedgeSin = new Float32Array(wedges);
  for (let wi = 0; wi < wedges; wi++) {
    const baseAngle = wi * wedgeAngle;
    wedgeCos[wi] = Math.cos(baseAngle);
    wedgeSin[wi] = Math.sin(baseAngle);
  }

  // Draw
  for (let bi = 0; bi < balls.length; bi++) {
    const ball = balls[bi];

    // Center-relative coords WITH pan offset. Pan shifts which part gets sampled = morphing.
    const rx = (ball.x - cx) + panX;
    const ry = (ball.y - cy) + panY;
    // Scale radius to fill entire screen. Increased from 1.8 to 3.5 to cover full viewport
    // and beyond (accounts for expanded spawn area and ensures no empty edges).
    const fillScale = 3.5 * unit;
    const r = Math.hypot(rx, ry) * fillScale * zoom;
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
    local = clamp$3(local, seamEps, wedgeAngle - seamEps);

    // Replicate across wedges using precomputed cos/sin + angle addition formula
    // cos(a+b) = cos(a)cos(b) - sin(a)sin(b)
    // sin(a+b) = sin(a)cos(b) + cos(a)sin(b)
    const localCos = Math.cos(local);
    const localSin = Math.sin(local);
    
    for (let wi = 0; wi < wedges; wi++) {
      // Use angle addition formula instead of Math.cos/sin(outA)
      const baseCos = wedgeCos[wi];
      const baseSin = wedgeSin[wi];
      const outCos = baseCos * localCos - baseSin * localSin;
      const outSin = baseSin * localCos + baseCos * localSin;

      const x = cx + outCos * r;
      const y = cy + outSin * r;

      // Draw circle (same style)
      if (ball.alpha < 1) ctx.globalAlpha = ball.alpha;
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(x, y, ball.r, 0, TAU);
      ctx.fill();
      if (ball.alpha < 1) ctx.globalAlpha = 1;
    }
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               CRITTERS MODE                                   ║
// ║           Ball-only “little creatures” (step locomotion + steering)           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function clamp$2(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

function wrapAngle(a) {
  // Wrap to [-PI, PI]
  if (a > Math.PI) a -= Math.PI * 2;
  else if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function smoothstep01(t) {
  t = clamp$2(t, 0, 1);
  return t * t * (3 - 2 * t);
}

function stepPulse01(phase01, sharpness) {
  // Triangle wave -> smoothstep -> power for “staccato steps”
  const tri = phase01 < 0.5 ? (phase01 * 2) : (2 - phase01 * 2); // 0..1..0
  const s = smoothstep01(tri);
  const p = clamp$2(sharpness, 0.5, 6.0);
  return Math.pow(s, p);
}

function initializeCritters() {
  const globals = getGlobals();
  clearBalls();

  const w = globals.canvas.width;
  const h = globals.canvas.height;

  const baseCount = Math.max(10, Math.min(260, globals.critterCount | 0));
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;

  // First, ensure at least one critter of each color (0-7) for palette representation
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = (Math.random() * w) | 0;
    const y = (Math.random() * h) | 0;
    const color = pickRandomColor();
    const ball = spawnBall(x, y, color);

    // Critter size now follows the global sizing system (R_MIN..R_MAX),
    // so critters are not an outlier across simulations.
    const rr = randomRadiusForMode(globals, MODES.CRITTERS);
    ball.r = rr;
    ball.rBase = rr;
    ball.m = Math.max(1, rr * rr * 0.12);

    ball.vx = 0;
    ball.vy = 0;

    // Per-ball "critter brain" (stored on the ball object; no per-frame allocs)
    ball._critterHeading = Math.random() * Math.PI * 2;
    ball._critterTurn = 0;
    ball._critterPhase = Math.random();
    ball._critterLastPhase = ball._critterPhase;
    ball._critterWander = (Math.random() * 2 - 1); // stable personality
    ball._critterPause = 0;
  }

  // Then fill the rest with weighted random colors
  for (let i = 8; i < count; i++) {
    const x = (Math.random() * w) | 0;
    const y = (Math.random() * h) | 0;

    // Use weighted color distribution (matches Ball Pit ratio)
    const color = pickRandomColor();
    const ball = spawnBall(x, y, color);

    const rr = randomRadiusForMode(globals, MODES.CRITTERS);
    ball.r = rr;
    ball.rBase = rr;
    ball.m = Math.max(1, rr * rr * 0.12);

    ball.vx = 0;
    ball.vy = 0;

    // Per-ball “critter brain” (stored on the ball object; no per-frame allocs)
    ball._critterHeading = Math.random() * Math.PI * 2;
    ball._critterTurn = 0;
    ball._critterPhase = Math.random();
    ball._critterLastPhase = ball._critterPhase;
    ball._critterWander = (Math.random() * 2 - 1); // stable personality
    ball._critterPause = 0;
  }
}

function applyCrittersForces(ball, dt) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // ---- Parameters (config-driven, DPR-scaled where needed) ----
  const DPR = g.DPR || 1;
  const speed = Math.max(0, g.critterSpeed || 0);
  const vMax = Math.max(50, g.critterMaxSpeed || 0) * DPR;
  const stepHz = Math.max(0, g.critterStepHz || 0);
  const sharp = g.critterStepSharpness ?? 2.4;
  const turnNoise = Math.max(0, g.critterTurnNoise || 0);
  const turnDamp = Math.max(0.1, g.critterTurnDamp || 0);
  const turnSeek = Math.max(0, g.critterTurnSeek || 0);
  const avoidR = Math.max(0, (g.critterAvoidRadius || 0) * (g.DPR || 1));
  const avoidF = Math.max(0, g.critterAvoidForce || 0);
  const edgeAvoid = Math.max(0, g.critterEdgeAvoid || 0);
  const mousePull = Math.max(0, g.critterMousePull || 0);
  const mouseRadiusVw = Math.max(0, g.critterMouseRadiusVw || 0);

  // ---- Internal state ----
  let heading = ball._critterHeading || 0;
  let turn = ball._critterTurn || 0;
  let phase = ball._critterPhase || 0;
  let lastPhase = ball._critterLastPhase ?? phase;
  let pause = ball._critterPause || 0;
  const personality = ball._critterWander || 0;

  // ---- Micro-pause gating (little “think” moments) ----
  if (pause > 0) {
    pause = Math.max(0, pause - dt);
  } else {
    // Low probability pause; scaled by dt so it’s frame-rate independent
    if (Math.random() < 0.25 * dt) {
      pause = 0.03 + Math.random() * 0.09;
    }
  }

  // ---- Desired heading (wander + edge + mouse + local avoid) ----
  let steerX = 0;
  let steerY = 0;

  // Edge avoidance (soft inward pull in an “edge zone”)
  if (edgeAvoid > 0) {
    const w = canvas.width;
    const h = canvas.height;
    const zone = Math.max(24 * (g.DPR || 1), Math.min(w, h) * 0.08);
    const x = ball.x;
    const y = ball.y;

    if (x < zone) steerX += (1 - x / zone);
    else if (x > w - zone) steerX -= (1 - (w - x) / zone);

    if (y < zone) steerY += (1 - y / zone);
    else if (y > h - zone) steerY -= (1 - (h - y) / zone);

    const s = edgeAvoid * 1.35;
    steerX *= s;
    steerY *= s;
  }

  // Mouse fear zone (in vw): flee when close, graze when far
  // Also adds a panic boost (speed + turn noise) for “frantic” motion near cursor.
  let panic01 = 0;
  if (mousePull > 0 && g.mouseX !== -1e9) {
    const vw = (window.innerWidth || canvas.width) / 100;
    const r = Math.max(1, mouseRadiusVw * vw) * (g.DPR || 1);
    const dx = ball.x - g.mouseX;
    const dy = ball.y - g.mouseY;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) + 1e-6;
      const q = 1 - (d / r);
      panic01 = q;
      const fear = mousePull * (0.85 + 0.65 * q);
      steerX += (dx / d) * fear;
      steerY += (dy / d) * fear;

      // subtle orbit so they don’t deadlock into straight lines
      const orbit = 0.25 * q * fear;
      steerX += (-dy / d) * orbit;
      steerY += (dx / d) * orbit;

      // Panic: suppress pauses so they keep moving when threatened
      pause = 0;
    }
  }

  // Local avoidance (cheap n^2; critter counts are intentionally modest)
  if (avoidR > 0 && avoidF > 0) {
    const balls = g.balls;
    const rr2 = avoidR * avoidR;
    let ax = 0;
    let ay = 0;
    let n = 0;
    for (let i = 0; i < balls.length; i++) {
      const o = balls[i];
      if (o === ball) continue;
      const dx = ball.x - o.x;
      const dy = ball.y - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < rr2) {
        const d = Math.sqrt(d2);
        // Make separation mostly *near-field* so critters can travel in tighter packs.
        const q = 1 - (d / avoidR);
        const q2 = q * q;
        const inv = 1 / (d + 1e-6);
        ax += dx * inv * q2;
        ay += dy * inv * q2;
        n++;
      }
    }
    if (n > 0) {
      const invN = 1 / n;
      steerX += (ax * invN) * 1.15;
      steerY += (ay * invN) * 1.15;

      // Apply a direct velocity push too (feels like a “flinch”)
      ball.vx += (ax * invN) * (avoidF * 0.65) * dt;
      ball.vy += (ay * invN) * (avoidF * 0.65) * dt;
    }
  }

  // Wander: correlated random walk (turn inertia, “personality” bias)
  // Panic adds extra jitter so motion reads “skittery”
  const panicNoiseBoost = 1 + (panic01 * 1.35 * mousePull);
  const noise = (Math.random() * 2 - 1) * (turnNoise * panicNoiseBoost);
  turn += (noise + personality * 0.35 * turnNoise) * dt;

  // Convert steer vector to desired heading (if any)
  const steerLen2 = steerX * steerX + steerY * steerY;
  if (steerLen2 > 1e-6) {
    const desired = Math.atan2(steerY, steerX);
    const delta = wrapAngle(desired - heading);
    turn += delta * (turnSeek * dt);
  }

  // Turn damping + integrate heading
  turn *= Math.exp(-turnDamp * dt);
  heading = wrapAngle(heading + turn * dt);

  // Stride phase update
  if (stepHz > 0) {
    lastPhase = phase;
    phase += stepHz * dt;
    phase -= (phase | 0);
  }

  // “Disney locomotion”: anticipate (squash), then hop (impulse), then stretch.
  // This reads as little jumps from place to place rather than constant glide.
  const pulse = (pause > 0) ? 0 : stepPulse01(phase, sharp);
  const panicSpeedBoost = 1 + (panic01 * 0.95 * mousePull);

  // Anticipation: just before step reset, compress along travel direction.
  if (pause <= 0 && phase > 0.82) {
    const anticip = (phase - 0.82) / 0.18; // 0..1
    const amt = 0.10 * anticip * (0.65 + 0.35 * panicSpeedBoost);
    if (amt > ball.squashAmount) {
      ball.squashAmount = amt;
      ball.squashNormalAngle = -Math.PI / 2; // compress along heading
    }
  }

  // Hop impulse once per stride (on wrap). Panic increases hop amplitude + randomness.
  const wrapped = (stepHz > 0) && (phase < lastPhase);
  if (pause <= 0 && wrapped) {
    const massScale = Math.max(0.25, ball.m / (g.MASS_BASELINE_KG || 129));
    const hopBase = speed * (0.55 + 0.55 * pulse) * panicSpeedBoost;
    const hop = hopBase * (0.85 + 0.30 * Math.random());
    const cx = Math.cos(heading);
    const cy = Math.sin(heading);
    const px = -cy;
    const py = cx;
    const lateral = (Math.random() * 2 - 1) * 0.18 * (0.35 + 0.65 * panic01) * hop;
    ball.vx += ((cx * hop) + (px * lateral)) / massScale;
    ball.vy += ((cy * hop) + (py * lateral)) / massScale;

    // Stretch on launch (along heading)
    ball.squashAmount = Math.max(ball.squashAmount, 0.20 + 0.15 * panic01);
    ball.squashNormalAngle = Math.PI / 2; // stretch along heading
  }

  // Low “grazing” thrust between hops (keeps them alive when stepHz is low)
  const thrust = speed * (0.08 + 0.25 * pulse) * panicSpeedBoost;
  ball.vx += Math.cos(heading) * thrust * dt;
  ball.vy += Math.sin(heading) * thrust * dt;

  // Clamp max speed (prevents “floaty” accelerations)
  const vx = ball.vx;
  const vy = ball.vy;
  const v2 = vx * vx + vy * vy;
  const max2 = vMax * vMax;
  if (v2 > max2) {
    const s = vMax / (Math.sqrt(v2) + 1e-6);
    ball.vx = vx * s;
    ball.vy = vy * s;
  }

  // Store back
  ball._critterHeading = heading;
  ball._critterTurn = turn;
  ball._critterPhase = phase;
  ball._critterLastPhase = lastPhase;
  ball._critterPause = pause;

  // Use heading as rotation for nicer squash/stretch orientation
  ball.theta = heading;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              NEURAL MODE                                     ║
// ║                   Emergent connectivity ("synapses")                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// Neural network mode — dense nodes with ball-based connections
// - Calm wander with gentle group dynamics
// - Connector balls positioned between nearby nodes (synapses)
// - Dense, interconnected network appearance
// - Smooth mouse interaction

// Store connector balls and their connection info
let connectorBalls = [];
let nodeBalls = []; // Track which balls are nodes (not connectors)

function initializeNeural() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;
  clearBalls();
  
  // Clear connector tracking
  connectorBalls = [];
  nodeBalls = [];

  const baseCount = Math.max(8, Math.min(g.neuralBallCount ?? 180, 400));
  const targetBalls = getMobileAdjustedCount(baseCount);
  if (targetBalls <= 0) return;
  const w = canvas.width;
  const h = canvas.height;
  const margin = 40 * (g.DPR || 1);

  // Ensure at least one ball of each color (0-7)
  const first = Math.min(8, targetBalls);
  for (let colorIndex = 0; colorIndex < first; colorIndex++) {
    const x = margin + Math.random() * (w - 2 * margin);
    const y = margin + Math.random() * (h - 2 * margin);
    const ball = spawnBall(x, y, pickRandomColor());

    const rr = randomRadiusForMode(g, MODES.NEURAL);
    ball.r = rr;
    ball.rBase = rr;
    ball.m = Math.max(1, rr * rr * 0.12);

    ball.vx = 0;
    ball.vy = 0;
    ball.driftAx = 0;
    ball.driftTime = 0;
    // Calm, slow rotation for gentle curving motion
    ball._neuralAngle = Math.random() * Math.PI * 2;
    ball._neuralRotSpeed = 0.15 + Math.random() * 0.15; // Slower, more neutral
    ball._isNeuralNode = true; // Mark as node ball
    nodeBalls.push(ball);
  }

  for (let i = first; i < targetBalls; i++) {
    const x = margin + Math.random() * (w - 2 * margin);
    const y = margin + Math.random() * (h - 2 * margin);
    const ball = spawnBall(x, y, pickRandomColor());

    const rr = randomRadiusForMode(g, MODES.NEURAL);
    ball.r = rr;
    ball.rBase = rr;
    ball.m = Math.max(1, rr * rr * 0.12);

    ball.vx = 0;
    ball.vy = 0;
    ball.driftAx = 0;
    ball.driftTime = 0;
    ball._neuralAngle = Math.random() * Math.PI * 2;
    ball._neuralRotSpeed = 0.15 + Math.random() * 0.15;
    ball._isNeuralNode = true; // Mark as node ball
    nodeBalls.push(ball);
  }
  
  // Create connector balls based on initial connections
  updateNeuralConnectors();
}

function applyNeuralForces(ball, dt) {
  // Skip physics for connector balls (they're positioned manually)
  if (ball._isNeuralConnector) return;
  
  const g = getGlobals();
  const massScale = Math.max(0.25, ball.m / g.MASS_BASELINE_KG);
  const DPR = g.DPR || 1;

  // ════════════════════════════════════════════════════════════════════════════
  // CALM WANDER — gentle directional flow
  // ════════════════════════════════════════════════════════════════════════════
  const wanderStrength = Math.max(0, g.neuralWanderStrength ?? 350); // Neutral, calm
  const angle = ball._neuralAngle ?? 0;
  const rotSpeed = ball._neuralRotSpeed ?? 0.2;
  
  // Rotate direction very slowly for smooth, predictable motion
  ball._neuralAngle = angle + dt * rotSpeed;
  
  // Apply gentle constant-force wander
  const ax = Math.cos(angle) * wanderStrength;
  const ay = Math.sin(angle) * wanderStrength;
  ball.vx += (ax * dt) / massScale;
  ball.vy += (ay * dt) / massScale;

  // ════════════════════════════════════════════════════════════════════════════
  // SUBTLE LOCAL INTERACTIONS — adds interest without chaos
  // ════════════════════════════════════════════════════════════════════════════
  const separationRadius = (g.neuralSeparationRadius ?? 100) * DPR;
  const separationStrength = g.neuralSeparationStrength ?? 8000; // Gentle push
  let sepX = 0, sepY = 0, neighborCount = 0;
  
  // Check nearby neighbors for subtle avoidance (only node balls, not connectors)
  const balls = g.balls;
  for (let i = 0; i < balls.length; i++) {
    const other = balls[i];
    if (other === ball || other._isNeuralConnector) continue; // Skip connector balls
    
    const dx = ball.x - other.x;
    const dy = ball.y - other.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    
    // Gentle repulsion when too close
    if (dist < separationRadius && dist > 0.1) {
      const strength = 1 - (dist / separationRadius);
      sepX += (dx / dist) * strength;
      sepY += (dy / dist) * strength;
      neighborCount++;
    }
  }
  
  // Apply separation force (subtle, not aggressive)
  if (neighborCount > 0) {
    ball.vx += (sepX / neighborCount) * separationStrength * dt / massScale;
    ball.vy += (sepY / neighborCount) * separationStrength * dt / massScale;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOUSE INTERACTION — smooth, gentle attraction
  // ════════════════════════════════════════════════════════════════════════════
  if (g.mouseInCanvas) {
    const mx = g.mouseX;
    const my = g.mouseY;
    const dx = mx - ball.x;
    const dy = my - ball.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.max(20 * DPR, Math.sqrt(distSq));
    
    // Gentle, smooth attraction — doesn't overpower wander
    const mouseStrength = g.neuralMouseStrength ?? 40000; // More neutral
    const maxDist = 300 * DPR;
    const distFactor = dist > maxDist ? 0 : 1 - (dist / maxDist);
    const forceMag = (mouseStrength * distFactor) / (dist + 50 * DPR);
    
    // Normalize direction
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Apply attractive force (blends with wander)
    ball.vx += (nx * forceMag * dt) / massScale;
    ball.vy += (ny * forceMag * dt) / massScale;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DAMPING — higher for calm, settled motion
  // ════════════════════════════════════════════════════════════════════════════
  const damp60 = Math.max(0.0, Math.min(1.0, g.neuralDamping ?? 0.985)); // More damping
  const damp = Math.pow(damp60, dt * 60);
  ball.vx *= damp;
  ball.vy *= damp;
}

/**
 * Update connector balls between connected nodes
 */
function updateNeuralConnectors() {
  const g = getGlobals();
  if (g.currentMode !== MODES.NEURAL) return;
  
  const linkDistanceVw = g.neuralLinkDistanceVw ?? 18;
  const maxLinksPerBall = g.neuralMaxLinksPerBall ?? 6;
  const connectorDensity = g.neuralConnectorDensity ?? 3; // Balls per connection
  const DPR = g.DPR || 1;
  const vw = (g.canvas.width / 100) || 10;
  const maxLinkDist = linkDistanceVw * vw * DPR;
  const maxLinkDistSq = maxLinkDist * maxLinkDist;
  
  // Get node balls (filter out connector balls)
  const nodes = g.balls.filter(b => b._isNeuralNode);
  if (nodes.length < 2) return;
  
  // Find connections and create/update connector balls
  const connections = [];
  
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    let linkCount = 0;
    
    for (let j = i + 1; j < nodes.length && linkCount < maxLinksPerBall; j++) {
      const nodeB = nodes[j];
      const dx = nodeA.x - nodeB.x;
      const dy = nodeA.y - nodeB.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < maxLinkDistSq && distSq > 0.1) {
        connections.push({ nodeA, nodeB, dist: Math.sqrt(distSq) });
        linkCount++;
      }
    }
  }
  
  // Calculate how many connector balls we need
  const neededConnectors = connections.length * connectorDensity;
  
  // Remove excess connectors or create new ones
  let currentConnectors = g.balls.filter(b => !b._isNeuralNode);
  
  // Remove excess connectors
  while (currentConnectors.length > neededConnectors) {
    const connector = currentConnectors.pop();
    const index = g.balls.indexOf(connector);
    if (index > -1) {
      g.balls.splice(index, 1);
      const connIndex = connectorBalls.indexOf(connector);
      if (connIndex > -1) connectorBalls.splice(connIndex, 1);
    }
  }
  
  // Create new connectors if needed
  while (currentConnectors.length < neededConnectors) {
    const connector = new Ball(0, 0, (g.ballSizeDesktop || 9) * 0.4 * DPR, '#888');
    connector._isNeuralNode = false;
    connector._isNeuralConnector = true;
    connector.vx = 0;
    connector.vy = 0;
    connector.m = connector.r * connector.r * 0.05; // Lighter
    connector.alpha = 0.6; // Slightly transparent
    g.balls.push(connector);
    connectorBalls.push(connector);
    currentConnectors.push(connector); // Update local array to avoid infinite loop
  }
  
  // Get fresh list after any additions/removals
  const allConnectors = g.balls.filter(b => !b._isNeuralNode);
  
  // Update connector positions along connection paths
  let connectorIndex = 0;
  for (const conn of connections) {
    const { nodeA, nodeB } = conn;
    
    // Position connectors evenly along the path
    for (let i = 0; i < connectorDensity && connectorIndex < allConnectors.length; i++) {
      const t = (i + 1) / (connectorDensity + 1); // 0..1, excluding endpoints
      const connector = allConnectors[connectorIndex];
      
      connector.x = nodeA.x + (nodeB.x - nodeA.x) * t;
      connector.y = nodeA.y + (nodeB.y - nodeA.y) * t;
      
      connectorIndex++;
    }
  }
}

/**
 * Update connector positions each frame
 */
function updateNeural() {
  updateNeuralConnectors();
}

function preRenderNeural(_ctx) {
  // Connector balls are regular balls, rendered automatically
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          PARALLAX (LINEAR) MODE                               ║
// ║              Perfect 3D cubic grid projected into 2D space                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function initializeParallaxLinear() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();

  const w = canvas.width;
  const h = canvas.height;

  // Grid dimensions (number of vertices in each dimension)
  const gridX = getMobileAdjustedCount(Math.max(0, Math.min(40, Math.round(g.parallaxLinearGridX ?? 14))));
  const gridY = getMobileAdjustedCount(Math.max(0, Math.min(40, Math.round(g.parallaxLinearGridY ?? 10))));
  const gridZ = getMobileAdjustedCount(Math.max(0, Math.min(20, Math.round(g.parallaxLinearGridZ ?? 7))));
  if (gridX <= 0 || gridY <= 0 || gridZ <= 0) return;

  // Grid span: how much of the viewport the grid occupies in world space.
  // Use >1 to counter perspective shrink and visually reach the edges.
  const spanX = Math.max(0.2, Math.min(8.0, g.parallaxLinearSpanX ?? 1.35));
  const spanY = Math.max(0.2, Math.min(8.0, g.parallaxLinearSpanY ?? 1.35));
  const xMin = -0.5 * w * spanX;
  const yMin = -0.5 * h * spanY;
  const xStep = (w * spanX) / Math.max(1, gridX - 1);
  const yStep = (h * spanY) / Math.max(1, gridY - 1);

  // Z-depth range (how far back the grid extends)
  const zNear = Math.max(10, g.parallaxLinearZNear ?? 50);
  const zFar = Math.max(zNear + 100, g.parallaxLinearZFar ?? 800);
  const zStep = (zFar - zNear) / Math.max(1, gridZ - 1);

  // Camera/projection
  const focalLength = Math.max(80, g.parallaxLinearFocalLength ?? 420);

  const dotSizeMul = Math.max(0.1, Math.min(6.0, g.parallaxLinearDotSizeMul ?? 1.8));
  const baseR = (g.R_MED || 20) * 0.32 * 2.4 * (g.DPR || 1) * dotSizeMul;
  const varFrac = getModeSizeVarianceFrac(g, MODES.PARALLAX_LINEAR);

  // Create perfect 3D grid
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  // Render back-to-front: start with far (iz=gridZ-1) so near dots draw last (on top)
  for (let iz = gridZ - 1; iz >= 0; iz--) {
    const z = zNear + iz * zStep;
    
    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        // 3D grid position (centered)
        const x3d = xMin + ix * xStep;
        const y3d = yMin + iy * yStep;
        const z3d = z;

        // Project to 2D (perspective projection)
        const scale = focalLength / (focalLength + z3d);
        const x2d = centerX + x3d * scale;
        const y2d = centerY + y3d * scale;

        // Size (opacity is constant)
        const r = baseR * scale;
        const alpha = 1.0;

        const color = pickRandomColor();
        const ball = spawnBall(x2d, y2d, color);
        ball.r = clampRadiusToGlobalBounds(g, r);
        ball.vx = 0;
        ball.vy = 0;
        ball.alpha = alpha;
        ball._parallax3D = { x: x3d, y: y3d, z: z3d, baseScale: scale };
        ball._parallaxSizeMul = (varFrac <= 1e-6) ? 1.0 : (1 + (Math.random() * 2 - 1) * varFrac);
        ball._isParallax = true; // Skip all standard physics
      }
    }
  }
}

function applyParallaxLinearForces(ball, dt) {
  if (!ball._parallax3D) return;

  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // Mouse offset (normalized -1 to 1)
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  let mx = 0, my = 0;
  
  if (g.mouseInCanvas) {
    mx = Math.max(-1, Math.min(1, (g.mouseX - cx) / (canvas.width * 0.5)));
    my = Math.max(-1, Math.min(1, (g.mouseY - cy) / (canvas.height * 0.5)));
  }

  // Camera parameters
  const focalLength = Math.max(100, g.parallaxLinearFocalLength ?? 400);
  const parallaxStrength = Math.max(0, g.parallaxLinearParallaxStrength ?? 120);

  // Apply mouse-driven camera rotation/pan
  const { x, y, z } = ball._parallax3D;
  
  // Parallax offset (simulates camera pan)
  const offsetX = mx * parallaxStrength;
  const offsetY = my * parallaxStrength;

  // Project 3D position to 2D with parallax
  const scale = focalLength / (focalLength + z);
  const targetX = cx + (x + offsetX) * scale;
  const targetY = cy + (y + offsetY) * scale;

  // Update size based on depth
  const dotSizeMul = Math.max(0.1, Math.min(6.0, g.parallaxLinearDotSizeMul ?? 1.8));
  const sizeMul = Number.isFinite(ball._parallaxSizeMul) ? ball._parallaxSizeMul : 1.0;
  const rawR = (g.R_MED || 20) * 0.32 * 2.4 * (g.DPR || 1) * dotSizeMul * sizeMul * scale;
  ball.r = clampRadiusToGlobalBounds(g, rawR);

  // No easing: snap directly to cursor-driven projection
  ball.x = targetX;
  ball.y = targetY;
  ball.vx = 0;
  ball.vy = 0;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           3D SPHERE POINT CLOUD                              ║
// ║      Hollow sphere that rotates with cursor; camera-locked like cube         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function fibonacciSphere(count) {
  const pts = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    pts.push({ theta, phi });
  }
  return pts;
}

function rotateXYZ$1(x, y, z, rx, ry, rz) {
  // Yaw (Y)
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  // Pitch (X)
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;

  // Roll (Z)
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const x3 = x1 * cosZ - y2 * sinZ;
  const y3 = x1 * sinZ + y2 * cosZ;

  return { x: x3, y: y3, z: z2 };
}

function initialize3DSphere() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();

  const densityBase = Math.max(10, Math.round(g.sphere3dDensity ?? 140));
  const count = getMobileAdjustedCount(densityBase);
  if (count <= 0) return;

  const radiusVw = g.sphere3dRadiusVw ?? 18;
  const radiusPx = Math.max(10, (radiusVw / 100) * canvas.width);
  const dotSizeMul = Math.max(0.1, g.sphere3dDotSizeMul ?? 1.5);
  const baseR = (g.R_MED || 20) * 0.30 * 2.0 * (g.DPR || 1);

  g.sphere3dState = {
    cx: canvas.width * 0.5,
    cy: canvas.height * 0.5,
    radiusPx,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    tumbleX: 0,
    tumbleY: 0,
    dotSizeMul
  };

  const pts = fibonacciSphere(count);
  for (let i = 0; i < pts.length; i++) {
    const ball = spawnBall(0, 0);
    if (!ball) continue;
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    ball.r = clampRadiusToGlobalBounds(g, baseR * dotSizeMul);
    ball._cloudBaseR = baseR;
    ball._sphere3d = { theta: pts[i].theta, phi: pts[i].phi };
    ball._cloudMode = 'sphere';
    ball.isSleeping = false;
  }
}

function apply3DSphereForces(ball, dt) {
  const g = getGlobals();
  const canvas = g.canvas;
  const state = g.sphere3dState;
  if (!canvas || !state || !ball || !ball._sphere3d) return;

  // Read runtime params for real-time updates
  const idleSpeed = g.sphere3dIdleSpeed ?? 0.15;
  const tumbleSpeed = g.sphere3dTumbleSpeed ?? 2.5;
  const tumbleDamping = Math.max(0, Math.min(0.999, g.sphere3dTumbleDamping ?? 0.94));
  const dotSizeMul = Math.max(0.1, g.sphere3dDotSizeMul ?? 1.5);

  // Update shared rotation once per frame (first ball)
  if (ball === g.balls[0]) {
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;
    
    // Only calculate mouse movement if mouse is in canvas
    if (g.mouseInCanvas) {
      // Track mouse movement for rotation
      const prevMouseX = state.prevMouseX ?? g.mouseX;
      const prevMouseY = state.prevMouseY ?? g.mouseY;
      
      // Calculate movement delta (clamped to prevent extreme spins)
      const rawDx = g.mouseX - prevMouseX;
      const rawDy = g.mouseY - prevMouseY;
      const maxDelta = 100 * (g.DPR || 1); // max pixels per frame
      const mouseDx = Math.max(-maxDelta, Math.min(maxDelta, rawDx));
      const mouseDy = Math.max(-maxDelta, Math.min(maxDelta, rawDy));
      
      state.prevMouseX = g.mouseX;
      state.prevMouseY = g.mouseY;

      // Calculate mouse position relative to sphere center
      const relX = g.mouseX - cx;
      const relY = g.mouseY - cy;
      const distFromCenter = Math.sqrt(relX * relX + relY * relY);
      
      // Check if mouse is over the sphere (within visual radius)
      const visualRadius = state.radiusPx * state.dotSizeMul * 1.5;
      
      if (distFromCenter < visualRadius) {
        // Mouse is over sphere: dragging spins it
        // Horizontal drag → yaw (spin around Y axis)
        // Vertical drag → pitch (spin around X axis)
        const spinGain = tumbleSpeed * 0.02; // sensitivity
        state.tumbleY += mouseDx * spinGain;
        state.tumbleX += -mouseDy * spinGain; // negative because down = pitch forward
      }
    } else {
      // Mouse left viewport: reset tracking to prevent jumps when it returns
      state.prevMouseX = undefined;
      state.prevMouseY = undefined;
    }

    // Damping
    state.tumbleX *= tumbleDamping;
    state.tumbleY *= tumbleDamping;

    // Apply rotation: idle + tumble (no static cursor influence)
    state.rotY += (idleSpeed + state.tumbleY) * dt;
    state.rotX += (idleSpeed * 0.6 + state.tumbleX) * dt;
    state.rotZ += idleSpeed * 0.2 * dt;
  }

  const { theta, phi } = ball._sphere3d;
  const r = state.radiusPx;

  // Local sphere coordinates
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);

  const rotated = rotateXYZ$1(x, y, z, state.rotX, state.rotY, state.rotZ);
  const focal = Math.max(80, g.sphere3dFocalLength ?? 600);
  const zShift = rotated.z + r; // keep positive for projection
  const scale = focal / (focal + zShift);

  const targetX = state.cx + rotated.x * scale;
  const targetY = state.cy + rotated.y * scale;

  const rawR = ball._cloudBaseR * dotSizeMul * scale;

  ball.r = clampRadiusToGlobalBounds(g, rawR);
  ball.x = targetX;
  ball.y = targetY;
  ball.vx = 0;
  ball.vy = 0;
  ball.omega = 0;
  ball.isSleeping = false;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             3D CUBE POINT CLOUD                              ║
// ║     Rotating cube (edges/faces) projected in 3D with cursor-driven tumble     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function clamp01$1(v) {
  return Math.max(-1, Math.min(1, v));
}

function rotateXYZ(x, y, z, rx, ry, rz) {
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;

  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const x3 = x1 * cosZ - y2 * sinZ;
  const y3 = x1 * sinZ + y2 * cosZ;

  return { x: x3, y: y3, z: z2 };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function generateCubePoints(size, edgeDensity, faceGrid) {
  const pts = [];
  const half = size * 0.5;
  const density = Math.max(2, edgeDensity | 0);
  const faceSteps = Math.max(0, faceGrid | 0);

  // Vertices
  const verts = [
    [-half, -half, -half], [half, -half, -half],
    [-half, half, -half],  [half, half, -half],
    [-half, -half, half],  [half, -half, half],
    [-half, half, half],   [half, half, half]
  ];

  // Edges (pairs of vertex indices)
  const edges = [
    [0, 1], [2, 3], [4, 5], [6, 7], // X edges
    [0, 2], [1, 3], [4, 6], [5, 7], // Y edges
    [0, 4], [1, 5], [2, 6], [3, 7]  // Z edges
  ];

  for (const [a, b] of edges) {
    for (let i = 0; i <= density; i++) {
      const t = i / density;
      pts.push({
        x: lerp(verts[a][0], verts[b][0], t),
        y: lerp(verts[a][1], verts[b][1], t),
        z: lerp(verts[a][2], verts[b][2], t)
      });
    }
  }

  // Faces (optional grid)
  if (faceSteps > 0) {
    const steps = faceSteps + 1;
    const step = size / steps;
    const coords = [];
    for (let i = 0; i <= steps; i++) coords.push(-half + i * step);

    const faces = [
      { axis: 'z', value: -half }, { axis: 'z', value: half },
      { axis: 'x', value: -half }, { axis: 'x', value: half },
      { axis: 'y', value: -half }, { axis: 'y', value: half }
    ];

    for (const face of faces) {
      for (let i = 0; i < coords.length; i++) {
        for (let j = 0; j < coords.length; j++) {
          let x = 0, y = 0, z = 0;
          if (face.axis === 'z') {
            x = coords[i]; y = coords[j]; z = face.value;
          } else if (face.axis === 'x') {
            x = face.value; y = coords[i]; z = coords[j];
          } else {
            x = coords[i]; y = face.value; z = coords[j];
          }
          pts.push({ x, y, z });
        }
      }
    }
  }

  return pts;
}

function initialize3DCube() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();

  const edgeDensity = Math.max(2, Math.round(g.cube3dEdgeDensity ?? 8));
  const faceGrid = Math.max(0, Math.round(g.cube3dFaceGrid ?? 0));
  const sizeVw = g.cube3dSizeVw ?? 25;
  const sizePx = Math.max(10, (sizeVw / 100) * canvas.width);
  const baseR = (g.R_MED || 20) * 0.30 * 2.0 * (g.DPR || 1);
  const dotSizeMul = Math.max(0.1, g.cube3dDotSizeMul ?? 1.5);

  const ptsRaw = generateCubePoints(sizePx, edgeDensity, faceGrid);
  const count = getMobileAdjustedCount(ptsRaw.length);
  const pts = ptsRaw.slice(0, count);

  g.cube3dState = {
    cx: canvas.width * 0.5,
    cy: canvas.height * 0.5,
    sizePx,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    idleSpeed: g.cube3dIdleSpeed ?? 0.2,
    cursorInfluence: g.cube3dCursorInfluence ?? 1.5,
    tumbleX: 0,
    tumbleY: 0,
    tumbleDamping: Math.max(0, Math.min(0.999, g.cube3dTumbleDamping ?? 0.95)),
    tumbleSpeed: g.cube3dTumbleSpeed ?? 3,
    dotSizeMul
  };

  for (let i = 0; i < pts.length; i++) {
    const ball = spawnBall(0, 0);
    if (!ball) continue;
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    ball.r = clampRadiusToGlobalBounds(g, baseR * dotSizeMul);
    ball._cloudBaseR = baseR;
    ball._cube3d = { x: pts[i].x, y: pts[i].y, z: pts[i].z };
    ball._cloudMode = 'cube';
    ball.isSleeping = false;
  }
}

function apply3DCubeForces(ball, dt) {
  const g = getGlobals();
  const canvas = g.canvas;
  const state = g.cube3dState;
  if (!canvas || !state || !ball || !ball._cube3d) return;

  // Read runtime params each frame for real-time updates
  const idleSpeed = g.cube3dIdleSpeed ?? 0.2;
  const cursorInfluence = g.cube3dCursorInfluence ?? 1.5;
  const tumbleSpeed = g.cube3dTumbleSpeed ?? 3;
  const tumbleDamping = Math.max(0, Math.min(0.999, g.cube3dTumbleDamping ?? 0.95));
  const dotSizeMul = Math.max(0.1, g.cube3dDotSizeMul ?? 1.5);

  // Update shared rotation once per frame
  if (ball === g.balls[0]) {
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;
    const nx = g.mouseInCanvas ? clamp01$1((g.mouseX - cx) / (canvas.width * 0.5)) : 0;
    const ny = g.mouseInCanvas ? clamp01$1((g.mouseY - cy) / (canvas.height * 0.5)) : 0;

    const dx = nx - (state.prevNx ?? 0);
    const dy = ny - (state.prevNy ?? 0);
    state.prevNx = nx;
    state.prevNy = ny;

    // Tumble impulse from mouse movement (drag-like)
    state.tumbleX += -dy * tumbleSpeed;
    state.tumbleY += dx * tumbleSpeed;

    // Damping
    state.tumbleX *= tumbleDamping;
    state.tumbleY *= tumbleDamping;

    // Apply rotation: idle + cursor + tumble
    state.rotY += (idleSpeed + nx * cursorInfluence + state.tumbleY) * dt;
    state.rotX += (idleSpeed * 0.6 + ny * cursorInfluence + state.tumbleX) * dt;
    state.rotZ += idleSpeed * 0.2 * dt;
  }

  const { x, y, z } = ball._cube3d;
  const rotated = rotateXYZ(x, y, z, state.rotX, state.rotY, state.rotZ);
  const focal = Math.max(80, g.cube3dFocalLength ?? 500);
  const zShift = rotated.z + (state.sizePx || 1);
  const scale = focal / (focal + zShift);

  const targetX = state.cx + rotated.x * scale;
  const targetY = state.cy + rotated.y * scale;
  const rawR = ball._cloudBaseR * dotSizeMul * scale;

  ball.r = clampRadiusToGlobalBounds(g, rawR);
  ball.x = targetX;
  ball.y = targetY;
  ball.vx = 0;
  ball.vy = 0;
  ball.omega = 0;
  ball.isSleeping = false;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             3D STARFIELD MODE                                 ║
// ║         Direct canvas rendering - bypasses ball system entirely               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// Module-level star array (not balls, just data)
let _stars = [];
let _lastTime = 0;
const SPAN_MULTIPLIER = 4;

function createStar(w, h, zNear, zFar, spanX, spanY) {
  return {
    x: (Math.random() * 2 - 1) * w * spanX * 0.5,
    y: (Math.random() * 2 - 1) * h * spanY * 0.5,
    z: zNear + Math.random() * (zFar - zNear),
    color: pickRandomColor(),
    alpha: 0, // Start invisible for fade-in
    fadeState: 'fadingIn' // 'fadingIn', 'visible', 'fadingOut'
  };
}

function initializeStarfield3D() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // Clear any existing balls (we don't use them)
  clearBalls();

  const w = canvas.width;
  const h = canvas.height;
  const count = Math.max(50, Math.min(500, Math.round(g.starfieldCount ?? 200)));
  const baseSpanX = Math.max(0.5, Math.min(4.0, g.starfieldSpanX ?? 1.5));
  const baseSpanY = Math.max(0.5, Math.min(4.0, g.starfieldSpanY ?? 1.2));
  const spanX = baseSpanX * SPAN_MULTIPLIER;
  const spanY = baseSpanY * SPAN_MULTIPLIER;
  const zNear = Math.max(20, g.starfieldZNear ?? 100);
  const zFar = Math.max(zNear + 200, g.starfieldZFar ?? 2000);

  // Create stars array (not balls)
  _stars = [];
  for (let i = 0; i < count; i++) {
    const star = createStar(w, h, zNear, zFar, spanX, spanY);
    star.fadeTimer = 0;
    _stars.push(star);
  }

  _lastTime = performance.now();
}

// Custom renderer - draws stars directly to canvas
function renderStarfield3D(ctx) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas || _stars.length === 0) return;

  const now = performance.now();
  const dt = Math.min(0.1, (now - _lastTime) / 1000);
  _lastTime = now;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w * 0.5;
  const cy = h * 0.5;

  // Config
  const baseSpanX = Math.max(0.5, Math.min(4.0, g.starfieldSpanX ?? 1.5));
  const baseSpanY = Math.max(0.5, Math.min(4.0, g.starfieldSpanY ?? 1.2));
  const spanX = baseSpanX * SPAN_MULTIPLIER;
  const spanY = baseSpanY * SPAN_MULTIPLIER;
  const zNear = Math.max(20, g.starfieldZNear ?? 100);
  const zFar = Math.max(zNear + 200, g.starfieldZFar ?? 2000);
  const focalLength = Math.max(100, g.starfieldFocalLength ?? 500);
  const speed = Math.max(10, g.starfieldSpeed ?? 400);
  const dotSizeMul = Math.max(0.2, Math.min(4.0, g.starfieldDotSizeMul ?? 1.0));
  const baseR = (g.R_MED || 20) * dotSizeMul * 2; // 2× base size requested

  // Vanishing point stays fixed at center (cursor ignored)
  const centerX = cx;
  const centerY = cy;

  // Fade duration from config (in seconds)
  const fadeDuration = Math.max(0, g.starfieldFadeDuration ?? 0.5);

  // Update and draw each star
  for (let i = 0; i < _stars.length; i++) {
    const star = _stars[i];

    // Advance toward camera
    star.z -= speed * dt;

    // Recycle when past camera
    if (star.z < zNear) {
      star.z = zFar + Math.random() * (zFar - zNear) * 0.3;
      star.x = (Math.random() * 2 - 1) * w * spanX * 0.5;
      star.y = (Math.random() * 2 - 1) * h * spanY * 0.5;
      star.color = pickRandomColor();
      star.alpha = 0;
      star.fadeState = 'fadingIn';
      star.fadeTimer = 0;
    }

    // Update fade state
    if (fadeDuration > 0) {
      // Initialize fade state if not set
      if (!star.fadeState) {
        star.fadeState = 'fadingIn';
        star.fadeTimer = 0;
      }
      if (star.fadeTimer === undefined) star.fadeTimer = 0;
      
      if (star.fadeState === 'fadingIn') {
        star.fadeTimer += dt;
        if (star.fadeTimer >= fadeDuration) {
          star.alpha = 1;
          star.fadeState = 'visible';
          star.fadeTimer = 0;
        } else {
          star.alpha = star.fadeTimer / fadeDuration;
        }
      } else if (star.fadeState === 'visible') {
        // Check if approaching recycle point (start fading out)
        const fadeOutStart = zNear + (zFar - zNear) * 0.1; // Start fading 10% before recycle
        if (star.z < fadeOutStart) {
          star.fadeState = 'fadingOut';
          star.fadeTimer = 0;
        } else {
          star.alpha = 1;
        }
      } else if (star.fadeState === 'fadingOut') {
        star.fadeTimer += dt;
        if (star.fadeTimer >= fadeDuration) {
          star.alpha = 0;
          star.fadeTimer = 0;
        } else {
          star.alpha = 1 - (star.fadeTimer / fadeDuration);
        }
      }
    } else {
      // No fade - instant visibility
      star.alpha = 1;
    }

    // Perspective projection with fixed center (mouse ignored)
    const scale = focalLength / (focalLength + star.z);
    const x2d = centerX + star.x * scale;
    const y2d = centerY + star.y * scale;
    // Keep radius constant regardless of distance (don't scale with perspective)
    const r = baseR;

    // Draw circle with alpha
    if (star.alpha > 0) {
      ctx.globalAlpha = star.alpha;
      ctx.beginPath();
      ctx.arc(x2d, y2d, r, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// No-op force applicator (we don't use balls)
function applyStarfield3DForces(ball, dt) {}

// No-op updater
function updateStarfield3D(renderDt) {}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          ELASTIC CENTER MODE                                  ║
// ║     Circle made of many dots, elastically drawn to center with instant        ║
// ║              mouse interaction causing dots to scatter                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// Center position (fixed at canvas center)
let centerX = 0;
let centerY = 0;

/**
 * Create composite circle from many small balls arranged in a circular pattern
 */
function createCompositeCircle(globals, targetBalls) {
  const canvas = globals.canvas;
  if (!canvas) return;
  const avgRadius = (globals.R_MIN + globals.R_MAX) * 0.5;
  // Increased spacing for larger gaps between balls
  const spacingMultiplier = globals.elasticCenterSpacingMultiplier || 2.8;
  const spacing = avgRadius * spacingMultiplier; // Larger gaps between ball centers
  
  // Calculate layers needed for target ball count
  let totalPlaced = 0;
  let layer = 0;
  const ballPositions = [];
  
  // Center ball
  if (targetBalls > 0) {
    ballPositions.push({ x: 0, y: 0, layer: 0, index: 0 });
    totalPlaced++;
  }
  
  // Add layers
  layer = 1;
  while (totalPlaced < targetBalls) {
    const layerRadius = layer * spacing;
    const circumference = layerRadius * 2 * Math.PI;
    // Calculate balls based on spacing distance (not diameter) for consistent gaps
    const ballsInLayer = Math.max(6, Math.floor(circumference / spacing));
    
    for (let i = 0; i < ballsInLayer && totalPlaced < targetBalls; i++) {
      const angle = (i / ballsInLayer) * Math.PI * 2;
      const x = Math.cos(angle) * layerRadius;
      const y = Math.sin(angle) * layerRadius;
      ballPositions.push({ x, y, layer, index: totalPlaced });
      totalPlaced++;
    }
    layer++;
  }
  
  // Create balls from positions
  // First 8 get one of each color
  for (let i = 0; i < Math.min(8, ballPositions.length); i++) {
    const pos = ballPositions[i];
    const r = randomRadiusForMode(globals, MODES.ELASTIC_CENTER);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(centerX + pos.x, centerY + pos.y, r, color);
    ball.distributionIndex = distributionIndex;
    ball.isElasticCenter = true;
    ball._targetOffsetX = pos.x;
    ball._targetOffsetY = pos.y;
    ball._targetRadius = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    const massMultiplier = globals.elasticCenterMassMultiplier || 2.0;
    ball.m = globals.MASS_BASELINE_KG * massMultiplier;
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    globals.balls.push(ball);
  }
  
  // Rest get random colors
  for (let i = 8; i < ballPositions.length; i++) {
    const pos = ballPositions[i];
    const r = randomRadiusForMode(globals, MODES.ELASTIC_CENTER);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(centerX + pos.x, centerY + pos.y, r, color);
    ball.distributionIndex = distributionIndex;
    ball.isElasticCenter = true;
    ball._targetOffsetX = pos.x;
    ball._targetOffsetY = pos.y;
    ball._targetRadius = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    const massMultiplier = globals.elasticCenterMassMultiplier || 2.0;
    ball.m = globals.MASS_BASELINE_KG * massMultiplier;
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    globals.balls.push(ball);
  }
}

function initializeElasticCenter() {
  const g = getGlobals();
  clearBalls();
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  
  // Set center position at canvas center
  centerX = w * 0.5;
  centerY = h * 0.5;
  
  // Create composite circle
  const baseCount = g.elasticCenterBallCount ?? 60;
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;
  
  createCompositeCircle(g, count);
}

function applyElasticCenterForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.ELASTIC_CENTER) return;
  if (!ball.isElasticCenter) return;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ELASTIC CENTER FORCE - Pull ball back toward its target position
  // ═══════════════════════════════════════════════════════════════════════════
  const elasticStrength = (g.elasticCenterElasticStrength ?? 2000) * g.DPR;
  
  // Calculate target position relative to center
  const targetX = centerX + ball._targetOffsetX;
  const targetY = centerY + ball._targetOffsetY;
  
  // Calculate displacement from target
  const dx = targetX - ball.x;
  const dy = targetY - ball.y;
  const dist = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
  
  // Apply elastic spring force (proportional to displacement)
  const force = elasticStrength * dist * dt;
  const nx = dx / dist;
  const ny = dy / dist;
  
  ball.vx += nx * force;
  ball.vy += ny * force;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MOUSE REPULSION - Instant reaction to scatter dots
  // ═══════════════════════════════════════════════════════════════════════════
  if (g.mouseInCanvas) {
    const mouseRepelStrength = (g.elasticCenterMouseRepelStrength ?? 12000) * g.DPR;
    const mouseRepelRadius = (g.elasticCenterMouseRadius ?? 200) * g.DPR;
    
    const mx = g.mouseX;
    const my = g.mouseY;
    const mdx = ball.x - mx;
    const mdy = ball.y - my;
    const mdist2 = mdx * mdx + mdy * mdy;
    const mdist = Math.sqrt(mdist2);
    
    if (mdist < mouseRepelRadius && mdist > 0.1) {
      // Inverse square falloff for smooth transition
      const falloff = 1 - (mdist / mouseRepelRadius);
      const repelForce = mouseRepelStrength * falloff * falloff * dt;
      
      const mnx = mdx / mdist;
      const mny = mdy / mdist;
      
      // Apply instant repulsion
      ball.vx += mnx * repelForce;
      ball.vy += mny * repelForce;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DAMPING - Smooth out oscillations for stability
  // ═══════════════════════════════════════════════════════════════════════════
  const damping = g.elasticCenterDamping ?? 0.94;
  ball.vx *= damping;
  ball.vy *= damping;
}

function updateElasticCenter(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.ELASTIC_CENTER) return;
  
  // Update center position if canvas resized (shouldn't happen often, but handle it)
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  centerX = w * 0.5;
  centerY = h * 0.5;
  
  // Optional: Add gentle rotation or other effects here if desired
  // For now, just maintain center position
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            DVD LOGO MODE                                       ║
// ║     Classic DVD screensaver: "DVD" spelled in balls, bouncing linearly        ║
// ║              with color changes on wall bounce                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// Logo state: center position and velocity
let logoCenterX = 0;
let logoCenterY = 0;
let logoVelX = 0;
let logoVelY = 0;
let currentColorIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// LETTER SHAPE DEFINITIONS (RELATIVE POSITIONS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Define letter "D" shape using relative positions (normalized coordinates)
 * Returns array of {x, y} positions relative to letter center
 */
function getLetterDShape() {
  const points = [];
  
  // Left vertical line (5 points)
  for (let i = 0; i < 5; i++) {
    points.push({ x: -1, y: -2 + i });
  }
  
  // Top horizontal (2 points)
  points.push({ x: 0, y: -2 });
  points.push({ x: 1, y: -2 });
  
  // Right curve (3 points)
  points.push({ x: 1.5, y: -1 });
  points.push({ x: 1.5, y: 0 });
  points.push({ x: 1.5, y: 1 });
  
  // Bottom horizontal (2 points)
  points.push({ x: 1, y: 2 });
  points.push({ x: 0, y: 2 });
  
  return points;
}

/**
 * Define letter "V" shape using relative positions
 */
function getLetterVShape() {
  const points = [];
  
  // Left diagonal (3 points)
  points.push({ x: -1.5, y: -2 });
  points.push({ x: -1, y: -0.5 });
  points.push({ x: -0.5, y: 1 });
  
  // Bottom point (2 points for emphasis)
  points.push({ x: 0, y: 2 });
  points.push({ x: 0, y: 2.2 });
  
  // Right diagonal (3 points)
  points.push({ x: 0.5, y: 1 });
  points.push({ x: 1, y: -0.5 });
  points.push({ x: 1.5, y: -2 });
  
  return points;
}

/**
 * Calculate ball positions for the full "DVD" logo
 * @param {number} targetBallCount - Total balls to distribute across letters
 * @param {number} ballRadius - Radius of each ball
 * @param {number} ballSpacingMul - Spacing multiplier between balls
 * @param {number} letterSpacingMul - Spacing multiplier between letters
 * @returns Array of {x, y} absolute positions
 */
function calculateDvdPositions(targetBallCount, ballRadius, ballSpacingMul, letterSpacingMul) {
  const positions = [];
  
  // Get letter shapes (normalized coordinates)
  const letterD = getLetterDShape();
  const letterV = getLetterVShape();
  
  // Calculate spacing based on ball radius (no overlap)
  const spacing = ballRadius * 2 * ballSpacingMul; // Each ball gets diameter * multiplier
  const letterSpacing = spacing * 3 * letterSpacingMul; // Space between letters
  
  // Calculate how many balls per letter (distribute evenly)
  const ballsPerLetter = Math.floor(targetBallCount / 3);
  const remainder = targetBallCount % 3;
  
  // Create ball positions for each letter
  const letters = [
    { shape: letterD, offset: -letterSpacing, count: ballsPerLetter + (remainder > 0 ? 1 : 0) },
    { shape: letterV, offset: 0, count: ballsPerLetter + (remainder > 1 ? 1 : 0) },
    { shape: letterD, offset: letterSpacing, count: ballsPerLetter }
  ];
  
  letters.forEach(letter => {
    const shapePoints = letter.shape;
    const pointCount = shapePoints.length;
    
    // Distribute balls evenly across letter shape points (no jitter to prevent overlap)
    for (let i = 0; i < letter.count; i++) {
      const pointIndex = Math.floor((i / letter.count) * pointCount);
      const point = shapePoints[pointIndex % pointCount];
      
      positions.push({
        x: point.x * spacing + letter.offset,
        y: point.y * spacing
      });
    }
  });
  
  return positions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function initializeDvdLogo() {
  const g = getGlobals();
  clearBalls();
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const DPR = g.DPR || 1;
  
  // Configuration
  const ballCount = g.dvdLogoBallCount || 60;
  const logoSize = g.dvdLogoSize || 1.0;
  const speed = (g.dvdLogoSpeed || 200) * DPR;
  const ballSpacingMul = g.dvdLogoBallSpacing || 1.3; // Multiplier for spacing between balls
  const letterSpacingMul = g.dvdLogoLetterSpacing || 1.0; // Multiplier for spacing between letters
  
  // Use consistent ball radius for uniform spacing (scaled by logo size)
  const baseRadius = randomRadiusForMode(g, MODES.DVD_LOGO);
  const uniformRadius = baseRadius * logoSize;
  
  // Calculate ball positions with proper spacing
  const positions = calculateDvdPositions(ballCount, uniformRadius, ballSpacingMul, letterSpacingMul);
  
  // Initial logo center (random position or center)
  const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
  const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
  const margin = wallInset + borderInset + uniformRadius * 10; // Extra margin for logo bounds
  
  logoCenterX = margin + Math.random() * (w - margin * 2);
  logoCenterY = margin + Math.random() * (h - margin * 2);
  
  // Initial velocity (random direction, constant speed)
  // Ensure angle is at least 30 degrees from horizontal/vertical (avoid shallow bounces)
  const minAngleDeg = 30;
  const minAngleRad = minAngleDeg * (Math.PI / 180);
  
  // Pick a random quadrant and angle within that quadrant (30-60 degrees from each axis)
  const quadrant = Math.floor(Math.random() * 4); // 0=NE, 1=SE, 2=SW, 3=NW
  const angleInQuadrant = minAngleRad + Math.random() * (Math.PI / 2 - minAngleRad * 2);
  const angle = quadrant * (Math.PI / 2) + angleInQuadrant;
  
  logoVelX = Math.cos(angle) * speed;
  logoVelY = Math.sin(angle) * speed;
  
  // Color sequence: prioritize bright colors, use only one grey
  const dvdColorSequence = [
    '#ff4013', // Red/orange (bright)
    '#0d5cb6', // Blue (bright)
    '#ffa000', // Amber (bright)
    '#00695c', // Teal (bright)
    '#ffffff', // White (bright)
    '#b5b7b6', // Grey (single grey only)
    '#000000'  // Black
  ];
  
  // Start with first bright color
  currentColorIndex = 0;
  const initialColor = dvdColorSequence[currentColorIndex];
  
  // Create balls at calculated positions (all with same radius for uniform spacing)
  positions.forEach(pos => {
    const x = logoCenterX + pos.x;
    const y = logoCenterY + pos.y;
    const ball = new Ball(x, y, uniformRadius, initialColor);
    ball.isDvdLogo = true;
    ball._dvdOffsetX = pos.x; // Store relative position
    ball._dvdOffsetY = pos.y;
    
    // Normal mass - wall impacts will be disabled anyway
    ball.m = g.MASS_BASELINE_KG;
    
    // Set velocity (will be overridden in update loop)
    ball.vx = logoVelX;
    ball.vy = logoVelY;
    ball.omega = 0; // No rotation
    
    // Disable wall effects and squash for DVD logo balls
    ball._skipWallEffects = true;
    ball.squashAmount = 0; // Keep perfectly round
    ball._noSquash = true; // Prevent squash updates
    
    g.balls.push(ball);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORCE APPLICATION (NO-OP - LINEAR MOVEMENT ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

function applyDvdLogoForces(ball, dt) {
  // No forces needed - movement is purely kinematic (handled in update)
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE LOOP - LINEAR MOVEMENT AND WALL BOUNCE
// ═══════════════════════════════════════════════════════════════════════════════

function updateDvdLogo(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.DVD_LOGO) return;
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const DPR = g.DPR || 1;
  
  const balls = g.balls;
  if (balls.length === 0) return;
  
  // Wall boundaries
  const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
  const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
  const totalInset = wallInset + borderInset;
  
  // Calculate logo bounds (bounding box of all balls)
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    if (!ball.isDvdLogo) continue;
    const ballLeft = ball.x - ball.r;
    const ballRight = ball.x + ball.r;
    const ballTop = ball.y - ball.r;
    const ballBottom = ball.y + ball.r;
    
    if (ballLeft < minX) minX = ballLeft;
    if (ballRight > maxX) maxX = ballRight;
    if (ballTop < minY) minY = ballTop;
    if (ballBottom > maxY) maxY = ballBottom;
  }
  
  // Check for wall collisions and bounce (perfect linear reflection)
  let hitWall = false;
  let newColor = null;
  
  // Minimum angle from axes (30 degrees = 0.524 radians)
  const minAngleDeg = 30;
  const minAngleRad = minAngleDeg * (Math.PI / 180);
  const minRatio = Math.tan(minAngleRad); // tan(30°) ≈ 0.577
  
  // Left wall - perfect reflection
  if (minX <= totalInset) {
    if (logoVelX < 0) {
      logoVelX = Math.abs(logoVelX); // Ensure positive (moving right)
      logoCenterX += (totalInset - minX); // Push away from wall
      hitWall = true;
      
      // Ensure angle isn't too shallow (at least 30° from vertical)
      if (Math.abs(logoVelX) < Math.abs(logoVelY) * minRatio) {
        logoVelX = Math.abs(logoVelY) * minRatio * Math.sign(logoVelX || 1);
      }
    }
  }
  
  // Right wall - perfect reflection
  if (maxX >= w - totalInset) {
    if (logoVelX > 0) {
      logoVelX = -Math.abs(logoVelX); // Ensure negative (moving left)
      logoCenterX -= (maxX - (w - totalInset)); // Push away from wall
      hitWall = true;
      
      // Ensure angle isn't too shallow
      if (Math.abs(logoVelX) < Math.abs(logoVelY) * minRatio) {
        logoVelX = -Math.abs(logoVelY) * minRatio;
      }
    }
  }
  
  // Top wall - perfect reflection
  if (minY <= totalInset) {
    if (logoVelY < 0) {
      logoVelY = Math.abs(logoVelY); // Ensure positive (moving down)
      logoCenterY += (totalInset - minY); // Push away from wall
      hitWall = true;
      
      // Ensure angle isn't too shallow (at least 30° from horizontal)
      if (Math.abs(logoVelY) < Math.abs(logoVelX) * minRatio) {
        logoVelY = Math.abs(logoVelX) * minRatio * Math.sign(logoVelY || 1);
      }
    }
  }
  
  // Bottom wall - perfect reflection
  if (maxY >= h - totalInset) {
    if (logoVelY > 0) {
      logoVelY = -Math.abs(logoVelY); // Ensure negative (moving up)
      logoCenterY -= (maxY - (h - totalInset)); // Push away from wall
      hitWall = true;
      
      // Ensure angle isn't too shallow
      if (Math.abs(logoVelY) < Math.abs(logoVelX) * minRatio) {
        logoVelY = -Math.abs(logoVelX) * minRatio;
      }
    }
  }
  
  // If hit wall, change color
  if (hitWall) {
    // Cycle to next color in sequence (bright colors first, single grey, then black)
    const dvdColorSequence = [
      '#ff4013', // Red/orange (bright)
      '#0d5cb6', // Blue (bright)
      '#ffa000', // Amber (bright)
      '#00695c', // Teal (bright)
      '#ffffff', // White (bright)
      '#b5b7b6', // Grey (single grey only)
      '#000000'  // Black
    ];
    currentColorIndex = (currentColorIndex + 1) % dvdColorSequence.length;
    newColor = dvdColorSequence[currentColorIndex];
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ADJUST VELOCITY TO MATCH CONFIGURED SPEED (dynamic speed control)
  // ═══════════════════════════════════════════════════════════════════════════
  const targetSpeed = (g.dvdLogoSpeed || 200) * DPR;
  const currentSpeed = Math.sqrt(logoVelX * logoVelX + logoVelY * logoVelY);
  
  if (currentSpeed > 0.1) {
    // Adjust velocity magnitude to match target speed while maintaining direction
    const speedRatio = targetSpeed / currentSpeed;
    logoVelX *= speedRatio;
    logoVelY *= speedRatio;
  }
  
  // Update logo center position based on velocity
  logoCenterX += logoVelX * dt;
  logoCenterY += logoVelY * dt;
  
  // Update all ball positions and velocities
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    if (!ball.isDvdLogo) continue;
    
    // Update position relative to logo center
    ball.x = logoCenterX + ball._dvdOffsetX;
    ball.y = logoCenterY + ball._dvdOffsetY;
    
    // Set velocity (for physics engine compatibility)
    ball.vx = logoVelX;
    ball.vy = logoVelY;
    ball.omega = 0; // No rotation
    
    // Keep balls perfectly round (no squash)
    ball.squashAmount = 0;
    
    // Change color if we hit a wall
    if (newColor) {
      ball.color = newColor;
    }
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              SNAKE MODE                                      ║
// ║     Classic snake game behavior - head moves continuously, body follows path ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// Store chain structure using WeakMaps
const chainNext = new WeakMap(); // Next ball in chain (null if last)
const chainPrev = new WeakMap(); // Previous ball in chain (null if first)
const chainIndex = new WeakMap(); // Index in chain (0 = head)
const chainRestLength = new WeakMap(); // Rest length of connection to next ball

// Path tracking for snake game behavior
let snakePath = []; // Array of {x, y, time} points for path following
const MAX_PATH_POINTS = 2000; // Maximum path points to store

/**
 * Initialize snake mode - creates a trail of connected balls
 */
function initializeSnake() {
  const g = getGlobals();
  clearBalls();
  
  const canvas = g.canvas;
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  
  // Configuration
  const baseCount = g.snakeBallCount ?? 50;
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;
  
  const DPR = g.DPR || 1;
  const avgRadius = (g.R_MIN + g.R_MAX) * 0.5;
  const baseRestLength = (g.snakeRestLength ?? 25) * DPR;
  // Rest length = ball diameter (touching) + small gap
  const effectiveRestLength = avgRadius * 2.0 + (baseRestLength - avgRadius * 2.0) * 0.3;
  
  // Position snake around the center of the viewport
  const margin = effectiveRestLength * 2;
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  
  // Starting position is exactly at the center of the viewport
  const startX = centerX;
  const startY = centerY;
  
  // Create a natural "sleeping" snake layout - curled/coiled position around center
  // Snake should look like it's lying down asleep, coiled around the center
  const coilRadius = effectiveRestLength * count * 0.12; // Radius of the coil (slightly smaller for tighter coil)
  const coilTurns = 1.8 + Math.random() * 0.7; // 1.8 to 2.5 turns for natural curl
  const coilAngleOffset = Math.random() * Math.PI * 2; // Random starting angle for coil
  
  // Initialize path with coiled positions
  snakePath = [];
  const now = performance.now();
  
  // Create trail of balls - snake positioned in a natural curled/coiled sleeping position
  const balls = [];
  
  for (let i = 0; i < count; i++) {
    // Calculate position in a coiled/curled pattern (like a sleeping snake)
    const progress = i / Math.max(1, count - 1); // 0 to 1
    
    // Create a spiral coil pattern - tighter at center, looser at edges
    const angle = coilAngleOffset + progress * Math.PI * 2 * coilTurns;
    const radius = coilRadius * (0.3 + progress * 0.7); // Start smaller, grow outward
    
    // Add some natural variation to make it look more organic
    const variation = Math.sin(progress * Math.PI * 4) * effectiveRestLength * 0.3;
    
    // Position in a curled/coiled pattern centered at start position
    const x = startX + Math.cos(angle) * (radius + variation);
    const y = startY + Math.sin(angle) * (radius + variation);
    
    // Clamp to ensure snake stays within scene bounds
    const clampedX = Math.max(margin, Math.min(w - margin, x));
    const clampedY = Math.max(margin, Math.min(h - margin, y));
    
    // Add to path (all at same time since snake is "asleep" - not moving)
    snakePath.push({ x: clampedX, y: clampedY, time: now });
    
    const r = randomRadiusForMode(g, MODES.SNAKE);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(clampedX, clampedY, r, color);
    ball.distributionIndex = distributionIndex;
    ball.isSnake = true;
    
    // Initialize velocity to zero - snake is "asleep" and stationary
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    
    // Mark as sleeping initially to prevent any movement
    if (i === 0) {
      ball._snakeAsleep = true;
    }
    
    // Store chain relationships
    chainIndex.set(ball, i);
    
    if (i > 0) {
      const prev = balls[i - 1];
      chainPrev.set(ball, prev);
      chainNext.set(prev, ball);
      chainRestLength.set(prev, effectiveRestLength);
    } else {
      chainPrev.set(ball, null);
    }
    
    if (i === count - 1) {
      chainNext.set(ball, null);
    }
    
    balls.push(ball);
    g.balls.push(ball);
  }
  
  // Store reference to head for path tracking
  g._snakeHead = balls[0];
}

/**
 * Get point on path at a given distance from the end
 */
function getPathPointAtDistance(targetDistance) {
  if (snakePath.length < 2) {
    return snakePath.length > 0 ? snakePath[0] : null;
  }
  
  let accumulatedDistance = 0;
  
  // Walk backwards from the end of the path
  for (let i = snakePath.length - 1; i > 0; i--) {
    const p1 = snakePath[i];
    const p2 = snakePath[i - 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    
    if (accumulatedDistance + segmentLength >= targetDistance) {
      // Interpolate along this segment
      const t = (targetDistance - accumulatedDistance) / segmentLength;
      return {
        x: p1.x + dx * t,
        y: p1.y + dy * t,
        time: p1.time + (p2.time - p1.time) * t
      };
    }
    
    accumulatedDistance += segmentLength;
  }
  
  // If we haven't found it, return the oldest point
  return snakePath[0];
}

/**
 * Apply snake forces - classic snake game behavior
 */
function applySnakeForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.SNAKE) return;
  if (!ball.isSnake) return;
  
  const DPR = g.DPR || 1;
  const springStrength = (g.snakeSpringStrength ?? 50) * DPR; // Much lower default to prevent wiggling
  const damping = g.snakeDamping ?? 0.97;
  const groundFriction = g.snakeGroundFriction ?? 1.0;
  const snakeSpeed = (g.snakeSpeed ?? 400) * DPR; // Constant speed for snake head
  
  const index = chainIndex.get(ball);
  const prev = chainPrev.get(ball);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SNAKE HEAD: Moves continuously in direction toward mouse (classic snake)
  // ═══════════════════════════════════════════════════════════════════════════
  if (index === 0) {
    // Check if snake is "asleep" (initial state) - wake up when mouse moves
    const now = performance.now();
    const mouseIdleThreshold = 150; // ms - if mouse hasn't moved in this time, it's idle
    const isMouseIdle = (now - (g.lastPointerMoveMs || 0)) > mouseIdleThreshold;
    
    // Wake up snake when mouse moves (if it was asleep)
    if (ball._snakeAsleep && g.mouseInCanvas && !isMouseIdle) {
      ball._snakeAsleep = false;
    }
    
    // If snake is asleep, don't move at all
    if (ball._snakeAsleep) {
      ball.vx = 0;
      ball.vy = 0;
      return; // Skip all movement logic
    }
    
    // Record current position in path (only if moving)
    const currentPathPoint = { x: ball.x, y: ball.y, time: now };
    
    // Add to path (only if moved enough to avoid duplicate points)
    if (snakePath.length === 0 || 
        Math.hypot(ball.x - snakePath[snakePath.length - 1].x, 
                   ball.y - snakePath[snakePath.length - 1].y) > 0.5) {
      snakePath.push(currentPathPoint);
      
      // Limit path length to prevent memory issues
      if (snakePath.length > MAX_PATH_POINTS) {
        snakePath.shift(); // Remove oldest points
      }
    }
    
    // Snake only moves when mouse is active (not idle) and in canvas
    if (g.mouseInCanvas && !isMouseIdle) {
      // Calculate direction toward mouse
      const dx = g.mouseX - ball.x;
      const dy = g.mouseY - ball.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0.1) {
        // Normalize direction
        const nx = dx / dist;
        const ny = dy / dist;
        
        // Set constant velocity in direction toward mouse (classic snake movement)
        ball.vx = nx * snakeSpeed;
        ball.vy = ny * snakeSpeed;
      } else {
        // If very close to mouse, maintain current direction
        const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (currentSpeed < 10) {
          // If stopped, maintain zero velocity (don't start moving randomly)
          ball.vx = 0;
          ball.vy = 0;
        }
      }
    } else {
      // When mouse is idle or leaves canvas, stop moving
      ball.vx = 0;
      ball.vy = 0;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SNAKE BODY: Follow path that head took (classic snake game behavior)
  // ═══════════════════════════════════════════════════════════════════════════
  if (prev && index > 0) {
    // Calculate distance along path this segment should be from previous
    const avgRadius = (g.R_MIN + g.R_MAX) * 0.5;
    const baseRestLength = (g.snakeRestLength ?? 25) * DPR;
    const restLength = chainRestLength.get(prev) ?? (avgRadius * 2.0 + (baseRestLength - avgRadius * 2.0) * 0.3);
    
    // Target distance along path = index * restLength (each segment follows path)
    const targetDistance = index * restLength;
    
    // Get target position on path
    const targetPoint = getPathPointAtDistance(targetDistance);
    
    if (targetPoint) {
      // Move toward target point on path
      const dx = targetPoint.x - ball.x;
      const dy = targetPoint.y - ball.y;
      const dist = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
      
      // Gentle spring to follow path (reduced multiplier to prevent wiggling)
      const springForce = springStrength * dist * dt * 0.5; // Reduced from 3.0 to 0.5
      const nx = dx / dist;
      const ny = dy / dist;
      
      ball.vx += nx * springForce;
      ball.vy += ny * springForce;
      
      // Cap velocity for smooth following
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const maxSpeed = snakeSpeed * 1.5; // Body can move slightly faster to catch up
      if (speed > maxSpeed) {
        ball.vx = (ball.vx / speed) * maxSpeed;
        ball.vy = (ball.vy / speed) * maxSpeed;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DAMPING & GROUND FRICTION - High friction ground simulation
  // ═══════════════════════════════════════════════════════════════════════════
  // Apply high damping for high-friction ground
  ball.vx *= damping;
  ball.vy *= damping;
  
  // Additional ground friction (simulates high-friction surface)
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed > 0) {
    // Apply additional friction force proportional to velocity
    const frictionForce = groundFriction * speed * dt;
    const frictionX = -(ball.vx / speed) * frictionForce;
    const frictionY = -(ball.vy / speed) * frictionForce;
    ball.vx += frictionX;
    ball.vy += frictionY;
  }
  
  // Angular damping (reduce spinning)
  if (ball.omega) {
    ball.omega *= damping * 0.95;
  }
}

/**
 * Update snake mode - clean up old path points
 */
function updateSnake(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.SNAKE) return;
  
  // Clean up path points older than 10 seconds (prevent memory buildup)
  const now = performance.now();
  const maxAge = 10000; // 10 seconds
  
  while (snakePath.length > 0 && (now - snakePath[0].time) > maxAge) {
    snakePath.shift();
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       PARTICLE FOUNTAIN MODE                                  ║
// ║    Simple water-like particles emit from bottom, rise, fall, recycle on ground ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// Emission timer for continuous particle spawning
let emissionTimer = 0;
const FADE_DURATION = 2.0;
const MOBILE_PEAK_HEIGHT_RATIO = 0.6;

/**
 * Initialize particle fountain mode - start emitting immediately
 */
function initializeParticleFountain() {
  const g = getGlobals();
  const canvas = g.canvas;
  // Clear existing balls
  g.balls.length = 0;
  
  if (!canvas) {
    emissionTimer = -0.1;
    return;
  }
  
  // Create a few initial particles immediately for instant visibility
  // This ensures particles appear right away rather than waiting for first update
  const maxParticles = getMobileAdjustedCount(g.particleFountainMaxParticles || 100);
  const initialCount = Math.min(5, maxParticles); // Start with 5 particles or max, whichever is smaller
  
  for (let i = 0; i < initialCount; i++) {
    createParticle();
  }
  
  // Reset emission timer to start continuous emission
  emissionTimer = 0;
}

/**
 * Create a new particle at the fountain source
 */
function createParticle() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return null;
  
  const DPR = g.DPR || 1;
  const w = canvas.width;
  const h = canvas.height;
  
  // Get radius for this mode
  const targetRadius = randomRadiusForMode(g, MODES.PARTICLE_FOUNTAIN);
  
  // Calculate bottom center position (accounting for wall inset)
  // Position slightly above bottom so particles don't immediately trigger recycling
  const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
  const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
  const bottomInset = wallInset + borderInset;
  const fountainX = w / 2;
  // Start slightly above the ground threshold so particles have room to rise
  const fountainY = h - bottomInset - (targetRadius * 0.5);
  
  // Get color
  const { color, distributionIndex } = pickRandomColorWithIndex();
  
  const ball = new Ball(fountainX, fountainY, targetRadius, color);
  ball.distributionIndex = distributionIndex;
  ball.isParticleFountain = true;
  ball.alpha = 1.0;
  
  // Lifetime tracking - age starts at 0, increments each frame
  ball.age = 0;
  ball.fading = false;
  ball.fadeProgress = 0;
  ball.originalRadius = targetRadius; // Store original radius for fade animation
  
  // Assign initial velocity with spread
  const baseVelocity = getFountainBaseVelocity(g, canvas, fountainY);
  const velocityVariation = 0.9 + Math.random() * 0.2; // ±10% variation
  const velocity = baseVelocity * velocityVariation;
  
  // Spread angle in radians (symmetric around vertical)
  const spreadAngleDeg = g.particleFountainSpreadAngle ?? 50;
  const spreadAngleRad = (spreadAngleDeg * Math.PI) / 180;
  const angle = (Math.random() - 0.5) * spreadAngleRad;
  
  // Vertical component (upward, negative y)
  ball.vy = -velocity * Math.cos(angle);
  // Horizontal component
  ball.vx = velocity * Math.sin(angle);
  
  g.balls.push(ball);
  return ball;
}

/**
 * Recycle a particle - reset it to bottom center with new properties
 */
function recycleParticle(ball) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;
  
  const DPR = g.DPR || 1;
  const w = canvas.width;
  const h = canvas.height;
  
  // Get target radius for this mode (need to recalculate since ball might have shrunk during fade)
  const targetRadius = randomRadiusForMode(g, MODES.PARTICLE_FOUNTAIN);
  
  // Calculate bottom center position
  // Position slightly above bottom so particles don't immediately trigger recycling
  const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
  const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
  const bottomInset = wallInset + borderInset;
  const fountainX = w / 2;
  // Start slightly above the ground threshold so particles have room to rise
  const fountainY = h - bottomInset - (targetRadius * 0.5);
  
  // Reset position
  ball.x = fountainX;
  ball.y = fountainY;
  
  // Reset alpha and radius
  ball.alpha = 1.0;
  ball.r = targetRadius;
  ball.rBase = targetRadius;
  
  // Reset lifetime tracking
  ball.age = 0;
  ball.fading = false;
  ball.fadeProgress = 0;
  ball.originalRadius = targetRadius;
  
  // Assign new initial velocity with spread
  const baseVelocity = getFountainBaseVelocity(g, canvas, fountainY);
  const velocityVariation = 0.9 + Math.random() * 0.2;
  const velocity = baseVelocity * velocityVariation;
  
  // Spread angle
  const spreadAngleDeg = g.particleFountainSpreadAngle ?? 50;
  const spreadAngleRad = (spreadAngleDeg * Math.PI) / 180;
  const angle = (Math.random() - 0.5) * spreadAngleRad;
  
  ball.vy = -velocity * Math.cos(angle);
  ball.vx = velocity * Math.sin(angle);
  
  // Optional: assign new color occasionally for variety
  if (Math.random() < 0.3) {
    const { color, distributionIndex } = pickRandomColorWithIndex();
    ball.color = color;
    ball.distributionIndex = distributionIndex;
  }
}

function getFountainBaseVelocity(g, canvas, fountainY) {
  const DPR = g.DPR || 1;
  const baseVelocity = (g.particleFountainInitialVelocity || 600) * DPR;
  const isMobile = g.isMobile || g.isMobileViewport;
  if (!isMobile) {
    return baseVelocity;
  }
  const h = canvas.height;
  const targetPeakY = h * MOBILE_PEAK_HEIGHT_RATIO;
  const riseDistance = Math.max(0, fountainY - targetPeakY);
  const gravity = Math.max(0.01, Math.abs(g.G || (g.GE * (g.gravityMultiplier || 1))));
  const targetVelocity = Math.sqrt(2 * gravity * riseDistance);
  return Math.min(baseVelocity, targetVelocity);
}

function applyParticleFountainForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.PARTICLE_FOUNTAIN) return;
  if (!ball.isParticleFountain) return;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LIFETIME TRACKING & FADE ANIMATION
  // ═══════════════════════════════════════════════════════════════════════════
  const lifetime = g.particleFountainLifetime ?? 8.0;
  const fadeDuration = FADE_DURATION; // 2 seconds fade animation
  
  // Increment age if not already fading
  if (!ball.fading) {
    ball.age += dt;
    
    // Check if lifetime has expired - start fade animation
    if (ball.age >= lifetime) {
      ball.fading = true;
      ball.fadeProgress = 0;
      // Ensure originalRadius is set for fade
      if (!ball.originalRadius) {
        ball.originalRadius = ball.rBase || ball.r;
      }
    }
  }
  
  // Handle fade animation (2s, ease-in-circ)
  if (ball.fading) {
    ball.fadeProgress += dt;
    const t = Math.min(1.0, ball.fadeProgress / fadeDuration);
    
    // Ease-in-circ: 1 - sqrt(1 - t²)
    const easeInCirc = 1 - Math.sqrt(1 - (t * t));
    
    // Fade alpha from 1.0 to 0.0
    ball.alpha = Math.max(0, 1.0 - easeInCirc);
    
    // If fade is complete, particle will be removed in updateParticleFountain
    if (t >= 1.0) {
      ball.alpha = 0;
    }
    
    // Skip physics during fade (particle is disappearing)
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MOUSE REPULSION - Gentle deflection
  // ═══════════════════════════════════════════════════════════════════════════
  if (g.mouseInCanvas) {
    // Radius is already in px (derived from vw in applyLayoutFromVwToPx)
    // Multiply by DPR to account for device pixel ratio
    const mouseRepelStrength = (g.particleFountainMouseRepelStrength ?? 15000) * g.DPR;
    const mouseRepelRadius = (g.particleFountainMouseRepelRadius ?? 0) * g.DPR;
    
    const mx = g.mouseX;
    const my = g.mouseY;
    const mdx = ball.x - mx;
    const mdy = ball.y - my;
    const mdist2 = mdx * mdx + mdy * mdy;
    const mdist = Math.sqrt(mdist2);
    
    if (mdist < mouseRepelRadius && mdist > 0.1) {
      const falloff = 1 - (mdist / mouseRepelRadius);
      const repelForce = mouseRepelStrength * falloff * dt;
      
      const mnx = mdx / mdist;
      const mny = mdy / mdist;
      
      ball.vx += mnx * repelForce;
      ball.vy += mny * repelForce;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WATER-LIKE DRAG - Smooth fluid motion
  // ═══════════════════════════════════════════════════════════════════════════
  const waterDrag = g.particleFountainWaterDrag ?? 0.02;
  ball.vx *= (1 - waterDrag);
  ball.vy *= (1 - waterDrag);
  ball.omega *= (1 - waterDrag * 0.5);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONAL UPWARD FORCE - Buoyancy-style force (if enabled)
  // ═══════════════════════════════════════════════════════════════════════════
  const upwardForce = g.particleFountainUpwardForce || 0;
  if (upwardForce > 0) {
    const force = upwardForce * g.DPR;
    ball.vy -= force * dt; // Negative y is upward
  }
}

function updateParticleFountain(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.PARTICLE_FOUNTAIN) return;
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const DPR = g.DPR || 1;
  const h = canvas.height;
  const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
  const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
  const bottomThreshold = h - wallInset - borderInset;
  const velocityThreshold = 20 * DPR; // Very slow upward velocity
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REMOVE PARTICLES - Faded out or hit ground
  // ═══════════════════════════════════════════════════════════════════════════
  // Remove particles that have fully faded (alpha <= 0) or hit the ground
  for (let i = g.balls.length - 1; i >= 0; i--) {
    const ball = g.balls[i];
    if (!ball.isParticleFountain) continue;
    
    // Remove particles that have fully faded out (alpha <= 0 and faded)
    if (ball.fading && ball.alpha <= 0) {
      g.balls.splice(i, 1);
      continue;
    }
    
    // Recycle particles that have landed on the ground (only if not fading)
    // Only recycle if clearly on ground: past threshold AND moving downward or very slow
    if (!ball.fading && ball.y >= bottomThreshold) {
      // Only recycle if moving downward (positive vy) or very slow (nearly stopped)
      // This prevents recycling particles that are still bouncing upward
      if (ball.vy >= -velocityThreshold) {
        recycleParticle(ball);
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // IMMEDIATE EMISSION - Spawn particles continuously from the start
  // ═══════════════════════════════════════════════════════════════════════════
  const emissionRate = g.particleFountainEmissionRate || 30; // particles per second
  const lifetime = g.particleFountainLifetime ?? 8.0;
  const targetMaxParticles = Math.max(1, Math.round(emissionRate * (lifetime + FADE_DURATION)));
  const isMobile = g.isMobile || g.isMobileViewport;
  const maxParticles = getMobileAdjustedCount(
    isMobile ? targetMaxParticles : (g.particleFountainMaxParticles || targetMaxParticles)
  );
  
  // Emit new particles immediately if under max
  emissionTimer += dt;
  const timePerParticle = 1.0 / emissionRate;
  let activeCount = 0;
  let recyclableCandidate = null;
  let oldestCandidate = null;
  let oldestAge = -Infinity;
  for (let i = 0; i < g.balls.length; i++) {
    const ball = g.balls[i];
    if (ball.isParticleFountain) {
      activeCount += 1;
      if (!recyclableCandidate) {
        const isGrounded = ball.y >= bottomThreshold && ball.vy >= -velocityThreshold;
        if (ball.fading || isGrounded) {
          recyclableCandidate = ball;
        }
      }
      const age = ball.age ?? 0;
      if (age > oldestAge) {
        oldestAge = age;
        oldestCandidate = ball;
      }
    }
  }
  
  // Emit particles up to max
  while (emissionTimer >= timePerParticle) {
    if (activeCount < maxParticles) {
      createParticle();
      activeCount += 1;
    } else {
      const candidate = recyclableCandidate || oldestCandidate;
      if (candidate) {
        recycleParticle(candidate);
      }
    }
    emissionTimer -= timePerParticle;
  }
  
  // Reset timer if it accumulates too much (safety measure)
  if (emissionTimer > timePerParticle * 2) {
    emissionTimer = 0;
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

/**
 * Reset adaptive throttle state - call when switching modes
 * Prevents stale FPS data from affecting new mode performance
 */
function resetAdaptiveThrottle() {
  recentFrameTimes = [];
  adaptiveThrottleLevel = 0;
}

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
    
    // FPS tracking
    trackFrame(performance.now());
    
    frameId = requestAnimationFrame(frame);
  }
  
  frameId = requestAnimationFrame(frame);
  console.log('✓ Render loop started (60fps throttle, visibility-aware)');
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      MODE CONTROLLER (COMPLETE)                              ║
// ║         Extracted from balls-source.html lines 3999-4085                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function getWarmupFramesForMode(mode, globals) {
  // Per-simulation warmup frames (render-frame units).
  // Default is 10 everywhere unless overridden via config/panel.
  switch (mode) {
    case MODES.PIT: return globals.pitWarmupFrames ?? 10;
    case MODES.FLIES: return globals.fliesWarmupFrames ?? 10;
    case MODES.WEIGHTLESS: return globals.weightlessWarmupFrames ?? 10;
    case MODES.WATER: return globals.waterWarmupFrames ?? 10;
    case MODES.VORTEX: return globals.vortexWarmupFrames ?? 10;
    case MODES.PING_PONG: return globals.pingPongWarmupFrames ?? 10;
    case MODES.MAGNETIC: return globals.magneticWarmupFrames ?? 10;
    case MODES.BUBBLES: return globals.bubblesWarmupFrames ?? 10;
    case MODES.KALEIDOSCOPE: return globals.kaleidoscope3WarmupFrames ?? globals.kaleidoscopeWarmupFrames ?? 10;
    case MODES.CRITTERS: return globals.crittersWarmupFrames ?? 10;
    case MODES.NEURAL: return globals.neuralWarmupFrames ?? 10;
    case MODES.SPHERE_3D: return globals.sphere3dWarmupFrames ?? 10;
    case MODES.CUBE_3D: return globals.cube3dWarmupFrames ?? 10;
    case MODES.PARALLAX_LINEAR: return globals.parallaxLinearWarmupFrames ?? 10;
    case MODES.STARFIELD_3D: return globals.starfield3dWarmupFrames ?? 10;
    case MODES.ELASTIC_CENTER: return globals.elasticCenterWarmupFrames ?? 10;
    case MODES.DVD_LOGO: return globals.dvdLogoWarmupFrames ?? 10;
    case MODES.SNAKE: return globals.snakeWarmupFrames ?? 10;
    case MODES.PARTICLE_FOUNTAIN: return globals.particleFountainWarmupFrames ?? 0;
    default: return 10;
  }
}

function setMode(mode) {
  const globals = getGlobals();
  const prevMode = globals.currentMode;
  
  // ════════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE: Reset all stateful systems on mode switch to prevent accumulation
  // This fixes the "slower and slower" bug when switching through modes
  // ════════════════════════════════════════════════════════════════════════════════
  resetPhysicsAccumulator();
  resetAdaptiveThrottle();
  
  // Reset wall deformation state (physics + render rings, caches)
  if (wallState?.ringPhysics?.reset) {
    wallState.ringPhysics.reset();
  }
  if (wallState?.ringRender?.reset) {
    wallState.ringRender.reset();
  }
  // Clear interpolation caches
  wallState._renderSmPrev = null;
  wallState._renderSmCurr = null;
  wallState._impactsThisStep = 0;
  wallState._pressureEventsThisStep = 0;
  
  // Restore physics overrides when leaving Critters mode
  if (globals.currentMode === MODES.CRITTERS && mode !== MODES.CRITTERS) {
    if (globals._restBeforeCritters !== undefined) {
      globals.REST = globals._restBeforeCritters;
      delete globals._restBeforeCritters;
    }
    if (globals._frictionBeforeCritters !== undefined) {
      globals.FRICTION = globals._frictionBeforeCritters;
      delete globals._frictionBeforeCritters;
    }
    // Critters-only spacing override cleanup
    if (globals._ballSpacingBeforeCritters !== undefined) {
      globals.ballSpacing = globals._ballSpacingBeforeCritters;
      delete globals._ballSpacingBeforeCritters;
    }
  }
  
  
  // Kaleidoscope no longer overrides global spacing (keeps parameters config-driven).
  
  setMode$1(mode);
  
  // Cursor color: only auto-cycle when switching to a different mode.
  if (mode !== prevMode) {
    try { maybeAutoPickCursorColor?.('mode'); } catch (e) {}
  }
  
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
    'kaleidoscope-3': 'Kaleidoscope',
    critters: 'Critters',
    neural: 'Neural Network',
    'parallax-linear': 'Parallax (Linear)',
    '3d-sphere': '3D Sphere',
    '3d-cube': '3D Cube',
    'starfield-3d': '3D Starfield',
    'elastic-center': 'Elastic Center',
    'dvd-logo': 'DVD Logo',
    'snake': 'Snake',
    'particle-fountain': 'Particle Fountain'
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
    initializeKaleidoscope();
  } else if (mode === MODES.SPHERE_3D) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initialize3DSphere();
  } else if (mode === MODES.CUBE_3D) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initialize3DCube();
  } else if (mode === MODES.CRITTERS) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;

    // Critters are “crawl-y”: lower restitution + higher drag (mode-only overrides).
    if (globals._restBeforeCritters === undefined) globals._restBeforeCritters = globals.REST;
    if (globals._frictionBeforeCritters === undefined) globals._frictionBeforeCritters = globals.FRICTION;
    globals.REST = globals.critterRestitution ?? globals.REST;
    globals.FRICTION = globals.critterFriction ?? globals.FRICTION;

    // Critters should feel more “clumpy” than the global default spacing.
    // Keep this mode-local so other modes retain their tuned spacing.
    if (globals._ballSpacingBeforeCritters === undefined) {
      globals._ballSpacingBeforeCritters = globals.ballSpacing;
    }
    globals.ballSpacing = Math.min(globals.ballSpacing || 0, 1.0);

    initializeCritters();
  } else if (mode === MODES.NEURAL) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = true;
    initializeNeural();
  } else if (mode === MODES.PARALLAX_LINEAR) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeParallaxLinear();
  } else if (mode === MODES.STARFIELD_3D) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeStarfield3D();
  } else if (mode === MODES.ELASTIC_CENTER) {
    // Disable gravity for elastic center mode
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeElasticCenter();
  } else if (mode === MODES.DVD_LOGO) {
    // Disable gravity for linear screensaver movement
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeDvdLogo();
  } else if (mode === MODES.SNAKE) {
    // Disable gravity for snake mode
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeSnake();
  } else if (mode === MODES.PARTICLE_FOUNTAIN) {
    // Enable gravity for particle fountain (particles fall after rising)
    globals.gravityMultiplier = globals.particleFountainGravityMultiplier || 1.0;
    globals.G = globals.GE * globals.gravityMultiplier;
    globals.repellerEnabled = true; // Enable mouse repulsion for particles
    initializeParticleFountain();
  }
  
  console.log(`Mode ${mode} initialized with ${globals.balls.length} balls`);

  // Sync legend filter system with new balls
  if (typeof window !== 'undefined' && window.legendFilter && window.legendFilter.syncAllBalls) {
    try {
      window.legendFilter.syncAllBalls();
    } catch (e) {
      console.warn('Legend filter sync failed:', e);
    }
  }

  // Schedule warmup consumption (no rendering during warmup).
  // The physics engine will consume this before the first render after mode init.
  const warmupFrames = Math.max(0, Math.round(getWarmupFramesForMode(mode, globals) || 0));
  globals.warmupFramesRemaining = warmupFrames;

  // Broadcast mode changes for lightweight UI micro-interactions (e.g., logo pulse).
  // Keep this decoupled from UI modules to avoid circular dependencies.
  if (typeof window !== 'undefined' && mode !== prevMode) {
    try {
      window.dispatchEvent(new CustomEvent('bb:modeChanged', { detail: { prevMode, mode } }));
    } catch (e) {}
  }
}

function resetCurrentMode() {
  const globals = getGlobals();
  // Cursor color: auto-cycle on explicit resets (even though mode stays the same).
  try { maybeAutoPickCursorColor?.('reset'); } catch (e) {}
  setMode(globals.currentMode);
}

function getForceApplicator() {
  const globals = getGlobals();
  if (globals.currentMode === MODES.FLIES) {
    return applyFliesForces;
  } else if (globals.currentMode === MODES.PIT) {
    return applyBallPitForces;
  } else if (globals.currentMode === MODES.WEIGHTLESS) {
    return applyWeightlessForces;
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
  } else if (globals.currentMode === MODES.SPHERE_3D) {
    return apply3DSphereForces;
  } else if (globals.currentMode === MODES.CUBE_3D) {
    return apply3DCubeForces;
  } else if (globals.currentMode === MODES.CRITTERS) {
    return applyCrittersForces;
  } else if (globals.currentMode === MODES.NEURAL) {
    return applyNeuralForces;
  } else if (globals.currentMode === MODES.PARALLAX_LINEAR) {
    return applyParallaxLinearForces;
  } else if (globals.currentMode === MODES.STARFIELD_3D) {
    return applyStarfield3DForces;
  } else if (globals.currentMode === MODES.ELASTIC_CENTER) {
    return applyElasticCenterForces;
  } else if (globals.currentMode === MODES.DVD_LOGO) {
    return applyDvdLogoForces;
  } else if (globals.currentMode === MODES.SNAKE) {
    return applySnakeForces;
  } else if (globals.currentMode === MODES.PARTICLE_FOUNTAIN) {
    return applyParticleFountainForces;
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
  } else if (globals.currentMode === MODES.STARFIELD_3D) {
    return updateStarfield3D;
  } else if (globals.currentMode === MODES.ELASTIC_CENTER) {
    return updateElasticCenter;
  } else if (globals.currentMode === MODES.DVD_LOGO) {
    return updateDvdLogo;
  } else if (globals.currentMode === MODES.NEURAL) {
    return updateNeural;
  } else if (globals.currentMode === MODES.SNAKE) {
    return updateSnake;
  } else if (globals.currentMode === MODES.PARTICLE_FOUNTAIN) {
    return updateParticleFountain;
  }
  return null;
}

function getModeRenderer() {
  const globals = getGlobals();
  if (globals.currentMode === MODES.NEURAL) {
    return {
      preRender: preRenderNeural
    };
  } else if (globals.currentMode === MODES.STARFIELD_3D) {
    return {
      preRender: renderStarfield3D
    };
  }
  return null;
}

var modeController = /*#__PURE__*/Object.freeze({
  __proto__: null,
  MODES: MODES,
  getForceApplicator: getForceApplicator,
  getModeRenderer: getModeRenderer,
  getModeUpdater: getModeUpdater,
  resetCurrentMode: resetCurrentMode,
  setMode: setMode
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         MODAL BLUR OVERLAY SYSTEM                            ║
// ║  Two-layer architecture: blur layer (isolated) + content layer (modals)      ║
// ║  Separating blur from content eliminates compositing conflicts              ║
// ║  Click on content layer dismisses active modal (modal-overlay-dismiss event)  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// Two-layer references
let blurLayerElement = null;    // #modal-blur-layer - backdrop-filter only, no children
let contentLayerElement = null; // #modal-content-layer - holds modals, no blur
let modalHostElement = null;    // #modal-modal-host - inside content layer

let isEnabled = true;
let isInitialized$2 = false;
const modalOriginalPlacement = new WeakMap();
let blurExplicitlySet = false; // Track if blur was set from config

function ensureModalHost() {
    if (!contentLayerElement) return null;
    if (modalHostElement && modalHostElement.isConnected) return modalHostElement;

    let host = document.getElementById('modal-modal-host');
    if (!host) {
        host = document.createElement('div');
        host.id = 'modal-modal-host';
        host.className = 'modal-modal-host';
        contentLayerElement.appendChild(host);
    }
    modalHostElement = host;
    return modalHostElement;
}

function mountModalIntoOverlay(modalEl) {
    if (!contentLayerElement || !modalEl) return;
    const host = ensureModalHost();
    if (!host) return;

    if (!modalOriginalPlacement.has(modalEl)) {
        modalOriginalPlacement.set(modalEl, { parent: modalEl.parentNode, nextSibling: modalEl.nextSibling });
    }
    host.appendChild(modalEl);
}

function unmountModalFromOverlay(modalEl) {
    if (!modalEl) return;
    const rec = modalOriginalPlacement.get(modalEl);
    if (!rec || !rec.parent) return;
    try {
        if (rec.nextSibling && rec.nextSibling.parentNode === rec.parent) {
            rec.parent.insertBefore(modalEl, rec.nextSibling);
        } else {
            rec.parent.appendChild(modalEl);
        }
    } catch (e) {}
}

/**
 * Get wall thickness from CSS variable or state
 */
function getWallThickness() {
    const thickness = readTokenVar('--wall-thickness', '');
    if (thickness && !/calc\(|vw|vh|vmin|vmax|%/i.test(thickness)) {
        const parsed = parseFloat(thickness);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    
    // Fallback to state
    const g = getGlobals();
    return g?.wallThickness || 12;
}

/**
 * Calculate and update blur based on wall thickness
 * Only updates if modalOverlayBlurPx is not explicitly set in config
 */
function updateBlurFromWallThickness(reason = 'direct') {
    if (!blurLayerElement) return;
    
    // Only auto-calculate if blur was not explicitly set in config
    if (!blurExplicitlySet) {
        const wallThickness = getWallThickness();
        const blurPx = wallThickness / 4;
        blurLayerElement.style.setProperty('--modal-overlay-blur', `${blurPx}px`);
    }
}

/**
 * Initialize the modal overlay system with config values
 * @param {Object} config - Configuration object with overlay settings
 */
function initModalOverlay(config) {
    blurLayerElement = document.getElementById('modal-blur-layer');
    contentLayerElement = document.getElementById('modal-content-layer');
    
    if (!blurLayerElement || !contentLayerElement) {
        console.warn('Modal Overlay: #modal-blur-layer or #modal-content-layer not found');
        return;
    }
    
    // Check if overlay is enabled
    isEnabled = config.modalOverlayEnabled !== false;
    
    if (!isEnabled) {
        console.log('Modal Overlay: Disabled by config');
        blurLayerElement.style.display = 'none';
        contentLayerElement.style.display = 'none';
        return;
    }
    
    // Ensure layers are visible when enabled
    blurLayerElement.style.display = '';
    contentLayerElement.style.display = '';

    // Ensure modal host exists
    ensureModalHost();
    
    // Inject CSS custom properties from config
    const opacity = config.modalOverlayOpacity ?? readTokenNumber('--modal-overlay-opacity', 0.01);
    const transitionMs = config.modalOverlayTransitionMs ?? readTokenMs('--modal-overlay-transition-duration', 800);
    const transitionOutMs = config.modalOverlayTransitionOutMs ?? readTokenMs('--modal-overlay-transition-out-duration', 600);
    const contentDelayMs = config.modalOverlayContentDelayMs ?? readTokenMs('--modal-content-delay', 200);
    
    // Depth effect settings
    const depthScale = config.modalDepthScale ?? readTokenNumber('--modal-depth-scale', 0.96);
    const depthY = config.modalDepthTranslateY ?? readTokenPx('--modal-depth-translate-y', 8);
    
    // Logo blur settings (blur when modal is active)
    const logoBlurInactive = config.logoBlurInactive ?? readTokenPx('--logo-blur-inactive', 0);
    const logoBlurActive = config.logoBlurActive ?? readTokenPx('--logo-blur-active-target', 12);
    
    // Set depth variables on root so they are available to all scene elements
    const root = document.documentElement;
    root.style.setProperty('--modal-depth-scale', depthScale);
    root.style.setProperty('--modal-depth-translate-y', `${depthY}px`);
    root.style.setProperty('--modal-depth-duration', `${transitionMs}ms`);
    root.style.setProperty('--modal-depth-out-duration', `${transitionOutMs}ms`);
    root.style.setProperty('--modal-content-delay', `${contentDelayMs}ms`);
    
    // Set logo blur variables
    root.style.setProperty('--logo-blur-inactive', `${logoBlurInactive}px`);
    root.style.setProperty('--logo-blur-active-target', `${logoBlurActive}px`);
    root.style.setProperty('--logo-blur-active', `${logoBlurInactive}px`);
    
    // Set blur: use config value if provided, otherwise calculate from wall thickness
    if (config.modalOverlayBlurPx !== undefined) {
        blurExplicitlySet = true;
        blurLayerElement.style.setProperty('--modal-overlay-blur', `${config.modalOverlayBlurPx}px`);
    } else {
        blurExplicitlySet = false;
        updateBlurFromWallThickness('init');
    }

    // Idempotency check: if already initialized, just update config/blur and return
    if (isInitialized$2) return;
    isInitialized$2 = true;

    // Set CSS variables on root for global access (modals, blur layer, etc.)
    root.style.setProperty('--modal-overlay-opacity', opacity);
    root.style.setProperty('--modal-overlay-transition-duration', `${transitionMs}ms`);
    root.style.setProperty('--modal-overlay-transition-out-duration', `${transitionOutMs}ms`);
    
    // Ensure initial state: not active
    blurLayerElement.classList.remove('active');
    contentLayerElement.classList.remove('active');
    blurLayerElement.setAttribute('aria-hidden', 'true');
    contentLayerElement.setAttribute('aria-hidden', 'true');
    
    // Explicitly ensure blur is cleared on initialization (no modal active)
    applyDepthEffect(false);
    
    // Click on content layer dismisses active modal
    contentLayerElement.addEventListener('click', handleOverlayClick, { capture: true });
    
    // Listen for layout changes to update blur
    window.addEventListener('resize', () => updateBlurFromWallThickness('resize'));
    
    // Also listen for custom layout update events if they exist
    document.addEventListener('layout-updated', () => updateBlurFromWallThickness('layout-updated'));
    
    const blurPx = getWallThickness() / 2;
    console.log(`Modal Overlay: Initialized (two-layer architecture, blur: ${blurPx}px, transition: ${transitionMs}ms)`);
}

/**
 * Handle click on content layer - dispatch dismiss event for modals to listen
 */
function handleOverlayClick(e) {
    // If layers are hidden or disabled, do nothing
    if (!isEnabled || !contentLayerElement.classList.contains('active')) {
        return;
    }

    // Ignore clicks on interactive elements within modals (buttons, inputs, etc.)
    if (e.target.closest('button')) return;
    if (e.target.closest('input')) return;
    if (e.target.closest('a')) return;
    if (e.target.closest('select')) return;
    if (e.target.closest('textarea')) return;
    
    // Accept clicks on content layer, modal host, or modal containers (but not their interactive children)
    const isGateContainer = e.target.id === 'cv-modal' || 
                           e.target.id === 'portfolio-modal' || 
                           e.target.id === 'contact-modal' ||
                           e.target.classList.contains('modal-label') ||
                           e.target.classList.contains('modal-description');
    
    const isContentLayerSurface = e.target === contentLayerElement || e.target?.id === 'modal-modal-host';
    if (isContentLayerSurface || isGateContainer) {
        // Dispatch custom event with instant flag (false = smooth close)
        document.dispatchEvent(new CustomEvent('modal-overlay-dismiss', { detail: { instant: false } }));
    }
}

/**
 * Apply depth effect by setting CSS variables on root
 */
function applyDepthEffect(active) {
    const root = document.documentElement;
    const scene = document.getElementById('abs-scene');
    
    if (active) {
        const scale = getComputedStyle(root).getPropertyValue('--modal-depth-scale').trim() || '0.96';
        const ty = getComputedStyle(root).getPropertyValue('--modal-depth-translate-y').trim() || '8px';
        const logoBlurActive = getComputedStyle(root).getPropertyValue('--logo-blur-active-target').trim() 
                             || root.style.getPropertyValue('--logo-blur-active-target') 
                             || '12px';
        
        root.style.setProperty('--modal-depth-scale-active', scale);
        root.style.setProperty('--modal-depth-ty-active', ty);
        root.style.setProperty('--logo-blur-active', logoBlurActive);
        
        if (scene) scene.classList.add('gate-depth-active');
    } else {
        const logoBlurInactive = getComputedStyle(root).getPropertyValue('--logo-blur-inactive').trim() || '0px';

        root.style.setProperty('--modal-depth-scale-active', '1');
        root.style.setProperty('--modal-depth-ty-active', '0px');
        root.style.setProperty('--logo-blur-active', logoBlurInactive);

        if (scene) scene.classList.remove('gate-depth-active');
    }
}

// Logo/nav fade is now handled purely by CSS via html.modal-active class
// The CSS sets --ui-obscured: 1 which derives opacity: 0 for logo and nav

/**
 * Show the overlay with smooth blur animation
 */
function showOverlay() {
    if (!blurLayerElement || !contentLayerElement || !isEnabled) return;
    
    // Ensure blur CSS variable is current
    updateBlurFromWallThickness('showOverlay');

    // Global flag for modal-active styling (CSS derives logo/nav visibility from this)
    document.documentElement.classList.add('modal-active');
    
    // Update aria states
    blurLayerElement.setAttribute('aria-hidden', 'false');
    contentLayerElement.setAttribute('aria-hidden', 'false');
    
    // Add active class to BOTH layers simultaneously
    // Blur layer handles backdrop-filter transition independently
    // Content layer handles modal content without affecting blur
    blurLayerElement.classList.add('active');
    contentLayerElement.classList.add('active');
    
    // Transform cursor to larger transparent circle
    const cursor = document.getElementById('custom-cursor');
    if (cursor) {
        let isMobileViewport = false;
        try {
            isMobileViewport = Boolean(window.matchMedia && window.matchMedia('(max-width: 600px)').matches);
        } catch (e) {}

        if (isMobileViewport) {
            cursor.classList.remove('modal-active');
            cursor.style.display = 'none';
        } else {
            cursor.classList.add('modal-active');
            cursor.style.display = 'block';
        }
    }
    
    // Apply depth effect to scene
    applyDepthEffect(true);
}

/**
 * Hide the overlay with smooth blur animation
 */
function hideOverlay() {
    if (!blurLayerElement || !contentLayerElement || !isEnabled) return;
    
    // Remove active class from BOTH layers
    blurLayerElement.classList.remove('active');
    contentLayerElement.classList.remove('active');
    
    // Remove modal-active (CSS will animate logo/nav back in)
    document.documentElement.classList.remove('modal-active');
    
    blurLayerElement.setAttribute('aria-hidden', 'true');
    contentLayerElement.setAttribute('aria-hidden', 'true');
    
    // Restore normal cursor
    const cursor = document.getElementById('custom-cursor');
    if (cursor) cursor.classList.remove('modal-active');
    
    // Remove depth effect from scene
    applyDepthEffect(false);
}

/**
 * Check if overlay is currently active
 * @returns {boolean} True if overlay is visible
 */
function isOverlayActive() {
    if (!contentLayerElement) return false;
    return contentLayerElement.classList.contains('active');
}

/**
 * Update overlay blur
 * @param {number} [blurPx] - Optional explicit blur value in pixels
 */
function updateOverlayBlur(blurPx) {
    if (!blurLayerElement) return;
    
    if (blurPx !== undefined) {
        blurExplicitlySet = true;
        blurLayerElement.style.setProperty('--modal-overlay-blur', `${blurPx}px`);
    } else {
        updateBlurFromWallThickness();
    }
}

/**
 * Update overlay opacity value (for live control panel adjustment)
 */
function updateOverlayOpacity(opacity) {
    if (!blurLayerElement) return;
    blurLayerElement.style.setProperty('--modal-overlay-opacity', opacity);
}

/**
 * Update overlay transition duration (for live control panel adjustment)
 */
function updateOverlayTransition(transitionMs) {
    if (!blurLayerElement) return;
    blurLayerElement.style.setProperty('--modal-overlay-transition-duration', `${transitionMs}ms`);
    document.documentElement.style.setProperty('--modal-depth-duration', `${transitionMs}ms`);
    applyDepthEffect(isOverlayActive());
}

/**
 * Update overlay transition-out duration (for live control panel adjustment)
 */
function updateOverlayTransitionOut(transitionMs) {
    if (!blurLayerElement) return;
    blurLayerElement.style.setProperty('--modal-overlay-transition-out-duration', `${transitionMs}ms`);
    document.documentElement.style.setProperty('--modal-depth-out-duration', `${transitionMs}ms`);
    applyDepthEffect(isOverlayActive());
}

/**
 * Update depth scale (for live control panel adjustment)
 */
function updateGateDepthScale(scale) {
    document.documentElement.style.setProperty('--modal-depth-scale', scale);
    applyDepthEffect(isOverlayActive());
}

/**
 * Update content delay (for live control panel adjustment)
 */
function updateGateContentDelay(ms) {
    document.documentElement.style.setProperty('--modal-content-delay', `${ms}ms`);
}


/**
 * Update depth translate Y (for live control panel adjustment)
 */
function updateGateDepthTranslateY(px) {
    document.documentElement.style.setProperty('--modal-depth-translate-y', `${px}px`);
    applyDepthEffect(isOverlayActive());
}

/**
 * Update logo blur when inactive (for live control panel adjustment)
 */
function updateLogoBlurInactive(px) {
    const root = document.documentElement;
    root.style.setProperty('--logo-blur-inactive', `${px}px`);
    if (!isOverlayActive()) {
        root.style.setProperty('--logo-blur-active', `${px}px`);
    }
    applyDepthEffect(isOverlayActive());
}

/**
 * Update logo blur when active (for live control panel adjustment)
 */
function updateLogoBlurActive(px) {
    const root = document.documentElement;
    root.style.setProperty('--logo-blur-active-target', `${px}px`);
    if (isOverlayActive()) {
        root.style.setProperty('--logo-blur-active', `${px}px`);
    }
    applyDepthEffect(isOverlayActive());
}

var modalOverlay = /*#__PURE__*/Object.freeze({
  __proto__: null,
  hideOverlay: hideOverlay,
  initModalOverlay: initModalOverlay,
  isOverlayActive: isOverlayActive,
  mountModalIntoOverlay: mountModalIntoOverlay,
  showOverlay: showOverlay,
  unmountModalFromOverlay: unmountModalFromOverlay,
  updateBlurFromWallThickness: updateBlurFromWallThickness,
  updateGateContentDelay: updateGateContentDelay,
  updateGateDepthScale: updateGateDepthScale,
  updateGateDepthTranslateY: updateGateDepthTranslateY,
  updateLogoBlurActive: updateLogoBlurActive,
  updateLogoBlurInactive: updateLogoBlurInactive,
  updateOverlayBlur: updateOverlayBlur,
  updateOverlayOpacity: updateOverlayOpacity,
  updateOverlayTransition: updateOverlayTransition,
  updateOverlayTransitionOut: updateOverlayTransitionOut
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      CURSOR EXPLOSION PARTICLE SYSTEM                        ║
// ║     Visceral particle dispersion when cursor enters button areas             ║
// ║     - Pooled typed arrays for zero-allocation performance                    ║
// ║     - Impact-based parameters (velocity, direction, range)                   ║
// ║     - Beautiful cartoony character with visceral motion                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL STATE (pooled particle system)
// ═══════════════════════════════════════════════════════════════════════════════

const PARTICLE_POOL_SIZE = 64;
let particleCount = 0;

// Typed arrays for performance (no object allocations in hot path)
const xs$1 = new Float32Array(PARTICLE_POOL_SIZE);
const ys$1 = new Float32Array(PARTICLE_POOL_SIZE);
const vxs = new Float32Array(PARTICLE_POOL_SIZE);
const vys = new Float32Array(PARTICLE_POOL_SIZE);
const ages = new Float32Array(PARTICLE_POOL_SIZE);
const lifetimes = new Float32Array(PARTICLE_POOL_SIZE);
const alphas = new Float32Array(PARTICLE_POOL_SIZE);
const radii = new Float32Array(PARTICLE_POOL_SIZE);
const colors = new Array(PARTICLE_POOL_SIZE); // Hex strings (not numeric)
let lastMouseDirX = 0;
let lastMouseDirY = 0;

function prefersReducedMotion$2() {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch (e) {
    return false;
  }
}

function clamp$1(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/**
 * Variate a color by small random RGB offsets (characterful but subtle)
 */
function variateColor(hex, variance = 0.15) {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const vr = Math.round(clamp$1(r + (Math.random() - 0.5) * variance * 255, 0, 255));
    const vg = Math.round(clamp$1(g + (Math.random() - 0.5) * variance * 255, 0, 255));
    const vb = Math.round(clamp$1(b + (Math.random() - 0.5) * variance * 255, 0, 255));
    
    return `#${vr.toString(16).padStart(2, '0')}${vg.toString(16).padStart(2, '0')}${vb.toString(16).padStart(2, '0')}`;
  } catch (e) {
    return hex;
  }
}

/**
 * Update mouse velocity/direction tracking (called from pointer.js)
 */
function updateMouseVelocity(velocity, dirX, dirY) {
  if (velocity > 0) {
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len > 0.01) {
      lastMouseDirX = dirX / len;
      lastMouseDirY = dirY / len;
    }
  }
}

/**
 * Trigger cursor explosion at position with impact-based parameters
 * @param {number} x - Canvas X position
 * @param {number} y - Canvas Y position
 * @param {string} color - Cursor color hex
 * @param {number} velocity - Mouse velocity (px/ms)
 */
function triggerCursorExplosion(x, y, color, velocity = 0) {
  const g = getGlobals();
  if (!g?.cursorExplosionEnabled) return;
  if (prefersReducedMotion$2()) return;
  if (!g.canvas || !g.ctx) return;
  
  const dpr = g.DPR || 1;
  
  // Base parameters from config
  const baseSpeed = (g.cursorExplosionSpeed ?? 400) * dpr;
  const baseCount = Math.floor(g.cursorExplosionParticleCount ?? 16);
  const baseSpreadDeg = g.cursorExplosionSpreadDeg ?? 360;
  const baseLifetime = g.cursorExplosionLifetime ?? 0.8;
  
  // Impact adjustments (visceral, responsive to movement)
  // Higher velocity = MORE dramatic effect (more particles, faster, farther)
  const impactMin = g.cursorExplosionImpactMinFactor ?? 0.5;
  const impactMax = g.cursorExplosionImpactMaxFactor ?? 4.0;
  const impactSensitivity = g.cursorExplosionImpactSensitivity ?? 400;
  
  // Calculate velocity factor: scales from min to max based on mouse velocity
  const velocityFactor = clamp$1(impactMin + (velocity / impactSensitivity), impactMin, impactMax);
  const particlesToCreate = Math.floor(baseCount * velocityFactor);
  const particleSpeed = baseSpeed * velocityFactor;
  const spreadDeg = Math.min(baseSpreadDeg * (0.6 + velocityFactor * 0.4), 360);
  
  // Lifetime also scales with impact (fast = particles travel farther)
  const lifetimeMin = g.cursorExplosionLifetimeImpactMin ?? 0.7;
  const lifetimeMax = g.cursorExplosionLifetimeImpactMax ?? 1.8;
  const lifetimeSensitivity = g.cursorExplosionLifetimeImpactSensitivity ?? 600;
  const scaledLifetime = baseLifetime * clamp$1(lifetimeMin + (velocity / lifetimeSensitivity), lifetimeMin, lifetimeMax);
  
  // Direction bias: particles favor mouse movement direction (cartoony impact)
  let spreadCenter = Math.random() * Math.PI * 2;
  if (lastMouseDirX !== 0 || lastMouseDirY !== 0) {
    // Calculate angle from movement direction
    const moveAngle = Math.atan2(lastMouseDirY, lastMouseDirX);
    // Bias toward movement direction with some randomness
    const biasStrength = clamp$1(velocity / 500, 0.3, 0.8);
    spreadCenter = moveAngle + (Math.random() - 0.5) * (1 - biasStrength) * Math.PI * 2;
  }
  
  const spreadRad = (spreadDeg * Math.PI) / 180;
  
  // Create particles (up to pool capacity)
  const maxToCreate = Math.min(particlesToCreate, PARTICLE_POOL_SIZE - particleCount);
  
  for (let i = 0; i < maxToCreate; i++) {
    const idx = particleCount + i;
    if (idx >= PARTICLE_POOL_SIZE) break; // Pool full
    
    // Random angle within spread cone (biased toward movement direction)
    const angleVariation = (Math.random() - 0.5) * spreadRad;
    const angle = spreadCenter + angleVariation;
    
    // Velocity variation for organic feel (80-120% of base)
    const velVariation = 0.8 + Math.random() * 0.4;
    const vel = particleSpeed * velVariation;
    
    // Position (start at cursor, tiny random offset for natural spread)
    const offsetRadius = (g.cursorSize ?? 1.15) * (g.R_MIN ?? 5) * 0.3 * dpr;
    const offsetAngle = Math.random() * Math.PI * 2;
    xs$1[idx] = x + Math.cos(offsetAngle) * offsetRadius * Math.random();
    ys$1[idx] = y + Math.sin(offsetAngle) * offsetRadius * Math.random();
    
    // Velocity components
    vxs[idx] = Math.cos(angle) * vel;
    vys[idx] = Math.sin(angle) * vel;
    
    // Lifetime variation (90-110% for natural randomness)
    const lifetimeVariation = 0.9 + Math.random() * 0.2;
    lifetimes[idx] = scaledLifetime * lifetimeVariation;
    ages[idx] = 0;
    
    // Visual properties
    alphas[idx] = 1.0;
    // Particle size: original thickness (2-6px radius, scaled by DPR) - but fewer, slower particles
    const baseRadius = clamp$1((g.cursorSize ?? 1.15) * 3 * dpr, 2 * dpr, 6 * dpr);
    radii[idx] = baseRadius * (0.8 + Math.random() * 0.4); // 80-120% size variation
    
    // Color with slight variation for character
    colors[idx] = Math.random() < 0.7 ? color : variateColor(color, 0.12);
  }
  
  particleCount += maxToCreate;
}

/**
 * Update particle positions, lifetimes, and cull expired ones
 */
function updateCursorExplosion(dt) {
  const g = getGlobals();
  if (!g?.cursorExplosionEnabled) return;
  if (!particleCount) return;
  const drag = g.cursorExplosionDrag ?? 0.95; // Velocity decay per frame
  const fadeStartRatio = g.cursorExplosionFadeStartRatio ?? 0.6; // Start fading at 60% lifetime
  
  // Update all particles (compact array in place to remove expired)
  let writeIdx = 0;
  
  for (let readIdx = 0; readIdx < particleCount; readIdx++) {
    const age = ages[readIdx] + dt;
    const lifetime = lifetimes[readIdx];
    
    // Cull expired particles
    if (age >= lifetime) {
      continue; // Skip this particle (effectively removes it)
    }
    
    // Update age
    ages[readIdx] = age;
    
    // Velocity decay (natural motion)
    vxs[readIdx] *= drag;
    vys[readIdx] *= drag;
    
    // Update position
    xs$1[readIdx] += vxs[readIdx] * dt;
    ys$1[readIdx] += vys[readIdx] * dt;
    
    // Fade out over lifetime (ease-in for smooth disappearance)
    const lifetimeProgress = age / lifetime;
    let alpha = 1.0;
    
    if (lifetimeProgress >= fadeStartRatio) {
      // Fade from fadeStartRatio to 1.0
      const fadeProgress = (lifetimeProgress - fadeStartRatio) / (1.0 - fadeStartRatio);
      // Ease-in-cubic: t³ for smooth fade
      alpha = 1.0 - (fadeProgress * fadeProgress * fadeProgress);
    }
    
    alphas[readIdx] = Math.max(0, alpha);
    
    // Optional: slight shrink over time (cartoony character)
    if (g.cursorExplosionShrinkEnabled !== false) {
      const shrinkProgress = lifetimeProgress;
      const shrinkAmount = shrinkProgress * 0.3; // Shrink to 70% size
      radii[readIdx] = radii[readIdx] * (1.0 - shrinkAmount);
    }
    
    // Move particle to write position if needed (compact array, remove gaps)
    if (readIdx !== writeIdx) {
      xs$1[writeIdx] = xs$1[readIdx];
      ys$1[writeIdx] = ys$1[readIdx];
      vxs[writeIdx] = vxs[readIdx];
      vys[writeIdx] = vys[readIdx];
      ages[writeIdx] = ages[readIdx];
      lifetimes[writeIdx] = lifetimes[readIdx];
      alphas[writeIdx] = alphas[readIdx];
      radii[writeIdx] = radii[readIdx];
      colors[writeIdx] = colors[readIdx];
    }
    
    writeIdx++;
  }
  
  // Update particle count (removed expired particles)
  particleCount = writeIdx;
}

/**
 * Draw all active particles (batched by color for performance)
 */
function drawCursorExplosion(ctx) {
  const g = getGlobals();
  if (!g?.cursorExplosionEnabled) return;
  if (prefersReducedMotion$2()) return;
  if (!particleCount || !ctx) return;
  
  // Group particles by color for batching (reduces fillStyle changes)
  const byColor = new Map();
  
  for (let i = 0; i < particleCount; i++) {
    const color = colors[i];
    if (!byColor.has(color)) {
      byColor.set(color, []);
    }
    byColor.get(color).push(i);
  }
  
  // Save canvas state
  const prevAlpha = ctx.globalAlpha;
  const prevComp = ctx.globalCompositeOperation;
  
  ctx.globalCompositeOperation = 'source-over';
  
  // Draw particles in color batches
  for (const [color, indices] of byColor) {
    ctx.fillStyle = color;
    
    for (const idx of indices) {
      const alpha = alphas[idx];
      if (alpha <= 0) continue;
      
      const radius = Math.max(0.5, radii[idx]);
      
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(xs$1[idx], ys$1[idx], radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Restore canvas state
  ctx.globalAlpha = prevAlpha;
  ctx.globalCompositeOperation = prevComp;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║               SCENE – MODE CHANGE “CLICK-IN” MICRO-REACTION                  ║
// ║      Trigger: simulation/mode switch only (no cursor position / proximity)   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


const CSS_VAR_IMPACT = '--abs-scene-impact'; // unitless (can be +/- for rebound)
const CSS_VAR_IMPACT_DUR = '--abs-scene-impact-dur'; // e.g. "100ms"
const CSS_VAR_IMPACT_MUL = '--abs-scene-impact-mul';
const CSS_VAR_LOGO_COMP_MUL = '--abs-scene-impact-logo-comp-mul';
const CSS_VAR_LOGO_SCALE = '--abs-scene-impact-logo-scale';

let el = null;
let enabled = false;

let impactToken = 0;
let releaseTimeoutId = 0;
let cleanupTimeoutId = 0;
let manualArmed = false;

function isMobileNow(g) {
  // Prefer state flags (kept current by renderer.resize() → detectResponsiveScale()).
  if (g?.isMobile || g?.isMobileViewport) return true;
  // Fallback for edge cases (devtools emulation / early init).
  try {
    return Boolean(window.matchMedia && window.matchMedia('(max-width: 600px)').matches);
  } catch (e) {
    return false;
  }
}

function computeEffectiveImpactMul(g) {
  const base = Number(g?.sceneImpactMul);
  const baseMul = Number.isFinite(base) ? base : 0;
  const f = Number(g?.sceneImpactMobileMulFactor);
  const factor = (Number.isFinite(f) && f > 0) ? f : 1.0;
  return baseMul * (isMobileNow(g) ? factor : 1.0);
}

function applyImpactMulFromGlobals() {
  if (!el) return;
  let g = null;
  try { g = getGlobals(); } catch (e) {}
  if (!g) return;
  const eff = computeEffectiveImpactMul(g);
  el.style.setProperty(CSS_VAR_IMPACT_MUL, String(eff));

  // Keep logo counter-scale gain synced from config/panel.
  // Applied to #abs-scene so #brand-logo (descendant) inherits it.
  const comp = Number(g.sceneImpactLogoCompMul);
  if (Number.isFinite(comp) && comp > 0) {
    el.style.setProperty(CSS_VAR_LOGO_COMP_MUL, String(comp));
  }
}

function computeLogoScaleFromImpact(impact01, g) {
  const effMul = computeEffectiveImpactMul(g);
  // Must match CSS: scale(1 - (impact * mul))
  // Note: `0.008` in CSS is only the fallback value for `--abs-scene-impact-mul`.
  const x = Math.max(0, Number(impact01) || 0) * effMul;
  const sceneScale = Math.max(0.001, 1 - x);
  const exactComp = 1 / sceneScale;

  // Extra anchoring beyond exact compensation (still derived from same x),
  // so motion stays visually “connected”.
  const compMul = Number(g?.sceneImpactLogoCompMul);
  const gain = (Number.isFinite(compMul) && compMul > 0) ? compMul : 1.0;
  const extra = 1 + ((gain - 1) * x);

  // Defensive clamp (UI-only)
  const out = exactComp * extra;
  return Math.max(0.5, Math.min(4.0, out));
}

function prefersReducedMotion$1() {
  try {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {
    return false;
  }
}

function resolveTarget() {
  return (
    document.querySelector('#abs-scene') || null
  );
}

function clearTimers() {
  if (releaseTimeoutId) {
    window.clearTimeout(releaseTimeoutId);
    releaseTimeoutId = 0;
  }
  if (cleanupTimeoutId) {
    window.clearTimeout(cleanupTimeoutId);
    cleanupTimeoutId = 0;
  }
}

function initSceneImpactReact() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  el = resolveTarget();
  if (!el) return;

  // Always seed vars so CSS has deterministic defaults.
  el.style.setProperty(CSS_VAR_IMPACT, '0');
  el.style.setProperty(CSS_VAR_IMPACT_DUR, '100ms');
  el.style.setProperty(CSS_VAR_LOGO_SCALE, '1');

  // Stamp tunable multipliers (if available) so config/panel changes apply.
  applyImpactMulFromGlobals();

  // Respect reduced motion: keep stable/robust and do not animate.
  if (prefersReducedMotion$1()) return;

  enabled = true;

  // Keep impact transition rules stable to prevent end-of-animation snapping.
  // Gate-depth can still override via `.gate-depth-active`.
  el.classList.add('abs-scene--impact');

  // Keep multiplier responsive across mobile breakpoints (resize-driven).
  // Cheap: only a single style write per resize.
  try {
    window.addEventListener('resize', applyImpactMulFromGlobals, { passive: true });
  } catch (e) {}

  // Mode change pulse (dispatched from mode-controller.js).
  window.addEventListener('bb:modeChanged', (e) => {
    const globals = getGlobals();
    if (globals?.sceneImpactEnabled === false) return;
    if (manualArmed) {
      // Pointer-driven mode switching uses explicit press/release calls.
      manualArmed = false;
      return;
    }

    const detail = e?.detail || {};
    const didChange = detail.prevMode && detail.mode && detail.prevMode !== detail.mode;
    pulseSceneImpact(didChange ? 1 : 0.75, { armManual: false });
  }, { passive: true });
}

/**
 * Mode change pulse: “click-in” (press) → rebound → settle.
 */
function pulseSceneImpact(strength = 1, opts = {}) {
  if (!enabled || !el) return;

  const g = getGlobals();
  if (g?.sceneImpactEnabled === false) return;

  const s = Math.max(0, Math.min(1, Number(strength) || 0));
  const token = ++impactToken;

  clearTimers();

  // Mark as animating to opt-in to will-change only during the pulse.
  el.classList.add('abs-scene--animating');
  // `.abs-scene--impact` is kept on permanently (init) to avoid transition swaps.

  if (opts?.armManual) manualArmed = true;

  const pressMsBase = g?.sceneImpactPressMs ?? 75;
  const releaseMsBase = g?.sceneImpactReleaseMs ?? 220;
  // Timing skew (requested): press in faster, return slower.
  const pressMs = Math.max(1, Math.round((Number(pressMsBase) || 0) * 0.8));
  const releaseMs = Math.max(1, Math.round((Number(releaseMsBase) || 0) * 1.2));
  // No standalone config for hold: derive from press duration so the “click” feel
  // stays consistent when users tune pressMs.
  const holdMs = Math.round(Math.min(80, Math.max(0, (Number(pressMs) || 0) * 0.4)));

  // Press in.
  el.style.setProperty(CSS_VAR_IMPACT_DUR, `${Math.round(pressMs)}ms`);
  window.requestAnimationFrame(() => {
    if (!enabled || !el) return;
    if (token !== impactToken) return;
    el.style.setProperty(CSS_VAR_IMPACT, String(s));
    el.style.setProperty(CSS_VAR_LOGO_SCALE, String(computeLogoScaleFromImpact(s, g)));
  });

  // Hold briefly at full press, then release out.
  releaseTimeoutId = window.setTimeout(() => {
    applySceneImpactRelease({ token, releaseMs });
  }, Math.max(0, Math.round(pressMs) + holdMs));

  cleanupTimeoutId = window.setTimeout(() => {
    cleanupTimeoutId = 0;
    if (!el) return;
    // Keep `.abs-scene--impact` to prevent transition swaps that can cause snapping.
    el.classList.remove('abs-scene--animating');
  }, Math.max(0, Math.round(pressMs) + holdMs + Math.round(releaseMs) + 80));
}

function applySceneImpactRelease({ token, releaseMs }) {
  clearTimers();
  if (!enabled || !el) return;
  if (token !== impactToken) return;

  el.style.setProperty(CSS_VAR_IMPACT_DUR, `${Math.round(releaseMs)}ms`);
  // Smooth return to rest (no bounce): animate impact back to 0.
  window.requestAnimationFrame(() => {
    if (!enabled || !el) return;
    if (token !== impactToken) return;
    el.style.setProperty(CSS_VAR_IMPACT, '0');
    el.style.setProperty(CSS_VAR_LOGO_SCALE, '1');
  });

  // Ensure we always drop will-change after release (covers pointer-hold path).
  cleanupTimeoutId = window.setTimeout(() => {
    cleanupTimeoutId = 0;
    if (!el) return;
    // Keep `.abs-scene--impact` to prevent transition swaps that can cause snapping.
    el.classList.remove('abs-scene--animating');
  }, Math.max(0, Math.round(releaseMs) + 80));
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      MOUSE/TOUCH TRACKING (COMPLETE)                         ║
// ║              Unified document-level pointer system for all modes             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// Mouse velocity tracking for water ripples and cursor explosion
let lastMouseX = 0;
let lastMouseY = 0;
let lastMoveTime = 0;
let mouseVelocity = 0;
let mouseDirX = 0; // Normalized direction X (-1 to 1)
let mouseDirY = 0; // Normalized direction Y (-1 to 1)
// Simple click tracking - just debounce to prevent rapid clicks
let lastClickTime = 0;
const CLICK_DEBOUNCE_MS = 150; // Prevent duplicate clicks within 150ms

function cycleMode() {
  const globals = getGlobals();
  const current = globals.currentMode;
  const seq = NARRATIVE_MODE_SEQUENCE;
  const idx = seq.indexOf(current);
  const base = idx >= 0 ? idx : 0;
  const next = seq[(base + 1) % seq.length];

  Promise.resolve().then(function () { return modeController; }).then(({ setMode }) => {
    setMode(next);
  });
  import('./controls.js').then(function (n) { return n.i; }).then(({ updateModeButtonsUI }) => {
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
      target.closest('.panel') ||
      target.closest('#expertise-legend') ||  // Legend area is UI
      target.closest('.legend__item')  // Individual legend items
    );
  }
  
  /**
   * Get mouse position relative to canvas from any event
   */
  function getCanvasPosition(clientX, clientY) {
    // SIMPLICITY > cleverness:
    // Always compute the rect at the time of the event, then map into the canvas buffer.
    // This guarantees cursor + trail alignment even during fast motion and scene transforms
    // (gate depth, impact reactions, etc.) that change rect dimensions without resize events.
    const rect = canvas.getBoundingClientRect();
    const rw = rect.width || 1;
    const rh = rect.height || 1;
    const sx = canvas.width / rw;
    const sy = canvas.height / rh;
    return {
      x: (clientX - rect.left) * sx,
      y: (clientY - rect.top) * sy,
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
    const pos = getCanvasPosition(clientX, clientY);
    
    // Calculate mouse velocity early (for cursor effects and water ripples)
    const now = performance.now();
    const dt = now - lastMoveTime;
    if (dt > 0 && lastMoveTime > 0) {
      const dx = pos.x - lastMouseX;
      const dy = pos.y - lastMouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      mouseVelocity = dist / dt;
      
      // Normalize direction for explosion bias
      if (dist > 0.1) {
        mouseDirX = dx / dist;
        mouseDirY = dy / dist;
      }
    }
    
    // Update custom cursor position only for mouse-like pointers
    if (isMouseLike) {
      updateCursorPosition(clientX, clientY);
    } else {
      // Ensure cursor is hidden for touch/pen inputs that aren't mouse-like
      hideCursor();
    }

    // Don't track simulation interactions if the user is over the panel UI.
    if (isEventOnUI(target)) return;
    
    // Don't track simulation interactions when gates/overlay are active
    if (isOverlayActive()) return;

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

    // Mouse trail (canvas-rendered): record only for mouse-like pointers and real movement.
    if (isMouseLike && movedPx > 0.5) {
      notifyMouseTrailMove(pos.x, pos.y, now, pos.inBounds);
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
   * Document-level press handler (pointerdown/up)
   * - Press in + switch sim on down
   * - Bounce out on release
   */
  function isTargetInteractive(el) {
    if (!el || !el.closest) return false;
    return Boolean(
      el.closest('a') ||
      el.closest('button') ||
      el.closest('input') ||
      el.closest('select') ||
      el.closest('textarea') ||
      el.closest('[role="button"]') ||  // ARIA buttons (e.g., legend items)
      el.closest('.legend__item--interactive')  // Interactive legend items
    );
  }

  /**
   * Simple click handler for mode cycling - forward only
   * Left click = next mode
   */
  document.addEventListener('click', (e) => {
    // Skip if cycling is disabled
    if (!globals.clickCycleEnabled) return;
    
    // Skip if clicking on UI elements
    if (isEventOnUI(e.target)) return;
    if (isTargetInteractive(e.target)) return;
    if (isOverlayActive()) return;
    
    // Check if click is within canvas bounds
    const pos = getCanvasPosition(e.clientX, e.clientY);
    if (!pos.inBounds) return;
    
    // Debounce to prevent rapid clicks
    const now = performance.now();
    if (now - lastClickTime < CLICK_DEBOUNCE_MS) return;
    lastClickTime = now;
    
    // Only handle left clicks (button 0) - forward only
    // Ignore right clicks (button 2) and middle clicks (button 1)
    const button = e.button !== undefined ? e.button : (e.which === 3 ? 2 : e.which === 2 ? 1 : 0);
    if (button === 0) {
      // Left button: go forward
      cycleMode();
    }
  }, { passive: true });
  
  /**
   * Touch move tracking for mobile
   */
  document.addEventListener('touchmove', (e) => {
    // Ignore touch when gates/overlay are active
    if (isOverlayActive()) return;
    
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
   * Touch tap handler for mobile - simple tap to cycle forward
   * Touch events fire click events, so they're already handled by handleModeCycleClick
   * This just handles cursor hiding for touch
   */
  document.addEventListener('touchstart', (e) => {
    if (window.PointerEvent) return; // Pointer events handle this
    if (isEventOnUI(e.target)) return;
    if (isOverlayActive()) return;
    
    // Hide cursor on touch
    hideCursor();
    
    // Touch taps will fire click events which are handled by handleModeCycleClick
    // For touch, click events have button === 0 (left), so they'll go forward
  }, { passive: true });

  /**
   * Reset mouse when leaving window
   */
  document.addEventListener('mouseleave', () => {
    globals.mouseX = CONSTANTS.OFFSCREEN_MOUSE;
    globals.mouseY = CONSTANTS.OFFSCREEN_MOUSE;
    globals.mouseInCanvas = false;
    mouseVelocity = 0;
    mouseDirX = 0;
    mouseDirY = 0;
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

/**
 * Enable/disable click-to-cycle mode switching
 */
/**
 * Get current mouse velocity (px/ms)
 * Used for impact-based cursor explosion
 */
function getMouseVelocity() {
  return mouseVelocity || 0;
}

/**
 * Get current mouse direction (normalized vector)
 * Returns {x, y} with magnitude ~1.0, or {x: 0, y: 0} if no movement
 */
function getMouseDirection() {
  return { x: mouseDirX || 0, y: mouseDirY || 0 };
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          CUSTOM CURSOR RENDERER                              ║
// ║     Border area: default cursor | Simulation: cursor scales down to dot      ║
// ║     Gate overlays: cursor shows at full size (round button)                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


let cursorElement = null;
let isInitialized$1 = false;
let isInSimulation = false;
let cachedContainerRect = null;
let rectCacheTime = 0;
const RECT_CACHE_MS = 100; // Cache rect for 100ms to avoid excessive layout reads
let fadeInStarted = false;
let fadeInAnimation = null;
let wasOverLink = false; // Track previous hover state for transition detection

/**
 * Check if mouse is inside simulation container
 * Uses cached bounding rect for performance
 */
function isMouseInSimulation(clientX, clientY) {
  const container = document.getElementById('bravia-balls');
  if (!container) return false;
  
  // Cache rect to avoid expensive layout reads on every mouse move
  const now = performance.now();
  if (!cachedContainerRect || (now - rectCacheTime) > RECT_CACHE_MS) {
    cachedContainerRect = container.getBoundingClientRect();
    rectCacheTime = now;
  }
  
  const rect = cachedContainerRect;
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

/**
 * Get the current cursor color
 * Used for trail rendering
 * @returns {string} Cursor hex color
 */
function getCursorColor() {
  const globals = getGlobals();
  return (globals?.cursorColorHex && typeof globals.cursorColorHex === 'string') 
    ? globals.cursorColorHex 
    : '#000000';
}

/**
 * Initialize custom cursor element
 * Creates a circular cursor that follows the mouse
 */
function setupCustomCursor() {
  if (isInitialized$1) return;
  
  // Create cursor element
  cursorElement = document.createElement('div');
  cursorElement.id = 'custom-cursor';
  cursorElement.setAttribute('aria-hidden', 'true');
  
  // Insert cursor inside #bravia-balls to be in same stacking context as canvas/wall
  // This is necessary because #bravia-balls has transform: translateZ(0) which creates
  // a stacking context - elements outside cannot be layered behind elements inside
  const container = document.getElementById('bravia-balls');
  if (container) {
    container.appendChild(cursorElement);
  } else {
    // Fallback to body if container doesn't exist yet
    document.body.appendChild(cursorElement);
  }
  
  // Show default cursor in border area, hide in simulation
  // We'll control this dynamically based on mouse position
  
  // Initially hide cursor (will show when mouse moves)
  cursorElement.style.display = 'none';
  // Start with opacity 0 for fade-in animation
  cursorElement.style.opacity = '0';
  
  isInitialized$1 = true;
  updateCursorSize();
  
  // Start fade-in animation after page fade-in completes
  startCursorFadeIn();
}

/**
 * Update cursor size based on state
 * Size matches average ball size multiplied by cursorSize
 */
function updateCursorSize() {
  if (!cursorElement) return;
  
  const globals = getGlobals();
  const averageBallSize = (globals.R_MIN + globals.R_MAX) * 0.5;
  const baseSize = averageBallSize * globals.cursorSize * 2;
  
  cursorElement.style.width = `${baseSize}px`;
  cursorElement.style.height = `${baseSize}px`;
  cursorElement.style.borderRadius = '50%';
  cursorElement.style.marginLeft = '0';
  cursorElement.style.marginTop = '0';
  
  // Reset transform if not in simulation - start at zero scale
  if (!isInSimulation) {
    cursorElement.style.transform = ZERO_SCALE;
    // Don't set opacity - let fade-in animation control it
  }
}

const ZERO_SCALE = 'translate(-50%, -50%) scale(0)';
const DOT_SCALE = 'translate(-50%, -50%) scale(0.25)';
const FULL_SCALE = 'translate(-50%, -50%) scale(1)';

/**
 * Check if hovering over a link
 * @returns {boolean} True if body has abs-link-hovering class
 */
function isHoveringOverLink() {
  try {
    return Boolean(document?.body?.classList?.contains?.('abs-link-hovering'));
  } catch (e) {
    return false;
  }
}

/**
 * Update cursor position and state
 * Called from pointer.js on mouse move
 * @param {number} clientX - Mouse X position
 * @param {number} clientY - Mouse Y position
 */
/**
 * Get canvas position from client coordinates
 * Helper for explosion trigger (converts screen coords to canvas coords)
 * Matches pattern from pointer.js for consistency
 */
function getCanvasPosition(clientX, clientY) {
  const globals = getGlobals();
  const canvas = globals?.canvas;
  if (!canvas) return null;
  
  const rect = canvas.getBoundingClientRect();
  const rw = rect.width || 1;
  const rh = rect.height || 1;
  const sx = canvas.width / rw;
  const sy = canvas.height / rh;
  
  return {
    x: (clientX - rect.left) * sx,
    y: (clientY - rect.top) * sy,
    inBounds: clientX >= rect.left && clientX <= rect.right && 
              clientY >= rect.top && clientY <= rect.bottom
  };
}

function updateCursorPosition(clientX, clientY) {
  if (!cursorElement) return;
  
  // Hide cursor when hovering over links (trail is already suppressed)
  const isOverLink = isHoveringOverLink();
  
  // Detect transition: cursor about to hide (entering button area)
  // Trigger explosion at the moment of transition
  if (isOverLink && !wasOverLink) {
    // Cursor is about to disappear - trigger explosion!
    // Use the last known canvas position if cursor is outside bounds (buttons are often outside canvas)
    const canvasPos = getCanvasPosition(clientX, clientY);
    if (canvasPos) {
      const globals = getGlobals();
      const canvas = globals?.canvas;
      
      // If cursor is outside canvas, clamp to canvas bounds for explosion
      let x = canvasPos.x;
      let y = canvasPos.y;
      
      if (!canvasPos.inBounds && canvas) {
        // Clamp to canvas edges (particles will still be visible)
        x = Math.max(0, Math.min(canvas.width, x));
        y = Math.max(0, Math.min(canvas.height, y));
      }
      
      // Only trigger if we have valid canvas coordinates
      if (canvas && x >= 0 && y >= 0 && x <= canvas.width && y <= canvas.height) {
        const color = getCursorColor();
        const velocity = getMouseVelocity();
        const dir = getMouseDirection();
        
        // Trigger beautiful visceral explosion
        triggerCursorExplosion(x, y, color, velocity);
        
        // Update velocity tracking in explosion module (for direction bias)
        if (dir && (dir.x !== 0 || dir.y !== 0)) {
          updateMouseVelocity(velocity, dir.x, dir.y);
        }
      }
    }
  }
  
  wasOverLink = isOverLink;
  
  if (isOverLink) {
    cursorElement.style.display = 'none';
    return;
  }
  
  const wasInSimulation = isInSimulation;
  isInSimulation = isMouseInSimulation(clientX, clientY);
  
  // Check if gate overlay is active - cursor should show at full size
  const overlayIsActive = isOverlayActive();
  
  // When modals are active, move cursor to body and use fixed positioning (above modals)
  // Otherwise, keep it inside #bravia-balls for proper z-index stacking behind wall
  const container = document.getElementById('bravia-balls');
  if (overlayIsActive) {
    // Move cursor to body when modals are active so it can be above modals (z-index: 20000)
    if (container && container.contains(cursorElement)) {
      document.body.appendChild(cursorElement);
      cursorElement.style.position = 'fixed';
      cursorElement.style.zIndex = '20000';
    }
    // Position relative to viewport when on body
    cursorElement.style.left = `${clientX}px`;
    cursorElement.style.top = `${clientY}px`;
  } else {
    // Move cursor back to #bravia-balls when modals close (for behind-wall behavior)
    if (container && !container.contains(cursorElement)) {
      container.appendChild(cursorElement);
      cursorElement.style.position = 'absolute';
      cursorElement.style.zIndex = '3';
    }
    // Position relative to container when inside #bravia-balls
    if (container) {
      const rect = container.getBoundingClientRect();
      cursorElement.style.left = `${clientX - rect.left}px`;
      cursorElement.style.top = `${clientY - rect.top}px`;
    } else {
      // Fallback: position relative to viewport if container doesn't exist
      cursorElement.style.left = `${clientX}px`;
      cursorElement.style.top = `${clientY}px`;
    }
  }
  document.body.style.cursor = 'none';
  
  // When gate overlay is active, show cursor at full size (round button)
  if (overlayIsActive) {
    cursorElement.style.display = 'block';
    cursorElement.style.transform = FULL_SCALE;
    return;
  }
  
  if (isInSimulation) {
    cursorElement.style.display = 'block';
    
    if (!wasInSimulation) {
      // Entering simulation: animate from zero to dot size
      cursorElement.style.transform = ZERO_SCALE;
      requestAnimationFrame(() => {
        cursorElement.style.transform = DOT_SCALE;
        // Don't set opacity - let fade-in animation control it
      });
    } else {
      // Already in simulation: maintain dot state
      // Don't set opacity - let fade-in animation control it
      if (cursorElement.style.transform !== DOT_SCALE) {
        cursorElement.style.transform = DOT_SCALE;
      }
    }
  } else {
    // Border area: hide cursor
    cursorElement.style.display = 'none';
    if (wasInSimulation) {
      // Scale down to zero when leaving simulation
      cursorElement.style.transform = ZERO_SCALE;
      // Don't set opacity - let fade-in animation control it
      cursorElement.style.backgroundColor = '';
      cursorElement.style.filter = '';
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

/**
 * Start cursor fade-in animation
 * Cursor fades in slowly after page fade-in completes, ensuring alignment with trail
 */
function startCursorFadeIn() {
  if (fadeInStarted || !cursorElement) return;
  fadeInStarted = true;
  
  // Calculate timing based on entrance animation
  // Page fade-in completes around: wallDelay (300ms) + wallDuration*0.3 (240ms) + elementDuration (500ms) = ~1040ms
  // Start cursor fade-in after page fade-in completes, with additional delay for alignment
  const globals = getGlobals();
  const wallDelay = globals.entranceWallTransitionDelay ?? 300;
  const wallDuration = globals.entranceWallTransitionDuration ?? 800;
  const elementDuration = globals.entranceElementDuration ?? 500;
  const pageFadeComplete = wallDelay + (wallDuration * 0.3) + elementDuration;
  
  // Cursor fade-in starts after page fade-in completes + extra delay for alignment
  // Increased delay to ensure canvas rect is fully synchronized with trail
  const CURSOR_FADE_DELAY = pageFadeComplete + 600; // 600ms extra for alignment and rect sync
  const CURSOR_FADE_DURATION = 800; // Slow fade-in (800ms)
  const CURSOR_FADE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'; // Same as page fade-in
  
  // Respect reduced motion preference
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    // Skip animation, show immediately after delay
    setTimeout(() => {
      if (cursorElement) {
        cursorElement.style.opacity = '1';
      }
    }, CURSOR_FADE_DELAY);
    return;
  }
  
  setTimeout(() => {
    if (!cursorElement) return;
    
    // Wait for canvas rect to be properly initialized and layout to settle
    // This ensures cursor and trail are aligned before fade-in starts
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cursorElement) return;
        
        // Check if WAAPI is available
        if (typeof cursorElement.animate !== 'function') {
          // Fallback: simple opacity transition
          cursorElement.style.opacity = '1';
          cursorElement.style.transition = `opacity ${CURSOR_FADE_DURATION}ms ${CURSOR_FADE_EASING}`;
          return;
        }
        
        // Make cursor visible (but transparent) so fade-in animation can be seen
        // Only if mouse is in simulation area (otherwise it will show when mouse moves)
        if (isInSimulation) {
          cursorElement.style.display = 'block';
        }
        
        // Animate fade-in using WAAPI
        fadeInAnimation = cursorElement.animate(
          [
            { opacity: 0 },
            { opacity: 1 }
          ],
          {
            duration: CURSOR_FADE_DURATION,
            easing: CURSOR_FADE_EASING,
            fill: 'forwards'
          }
        );
        
        // Stamp final opacity on finish to prevent getting stuck
        fadeInAnimation?.addEventListener?.('finish', () => {
          if (cursorElement) {
            cursorElement.style.opacity = '1';
          }
        });
        
        fadeInAnimation?.addEventListener?.('cancel', () => {
          // Failsafe: ensure cursor is visible if animation is canceled
          if (cursorElement) {
            cursorElement.style.opacity = '1';
          }
        });
      });
    });
  }, CURSOR_FADE_DELAY);
}

var cursor = /*#__PURE__*/Object.freeze({
  __proto__: null,
  getCursorColor: getCursorColor,
  hideCursor: hideCursor,
  setupCustomCursor: setupCustomCursor,
  showCursor: showCursor,
  updateCursorPosition: updateCursorPosition,
  updateCursorSize: updateCursorSize
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           MOUSE TRAIL (PERFORMANT)                           ║
// ║      Canvas-rendered pointer trail with pooled ring buffer + rAF draw         ║
// ║      - No DOM nodes, no allocations in hot path                               ║
// ║      - Respects prefers-reduced-motion                                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL STATE (pooled ring buffer)
// ═══════════════════════════════════════════════════════════════════════════════

let cap = 0;
let xs = null;
let ys = null;
let ts = null; // timestamps (ms)
let head = 0; // next write index
let size = 0; // number of valid samples (<= cap)
let lastSuppressed = false;

function isSuppressedByLinkHover() {
  try {
    return Boolean(document?.body?.classList?.contains?.('abs-link-hovering'));
  } catch (e) {
    return false;
  }
}

function syncSuppressedState() {
  const suppressed = isSuppressedByLinkHover();
  if (suppressed && !lastSuppressed) {
    // Drop all samples so the trail never “pops back” when leaving a link quickly.
    head = 0;
    size = 0;
  }
  lastSuppressed = suppressed;
  return suppressed;
}

function prefersReducedMotion() {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch (e) {
    return false;
  }
}

function ensureCapacity(nextCap) {
  const c = Math.max(0, nextCap | 0);
  if (c <= 0) return;
  if (cap === c && xs && ys && ts) return;

  cap = c;
  xs = new Float32Array(cap);
  ys = new Float32Array(cap);
  ts = new Float64Array(cap);
  head = 0;
  size = 0;
}

function getStrokeStyle() {
  // Use the same color as the cursor dot
  // This ensures perfect synchronization between cursor and trail
  return getCursorColor();
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API (called from pointer.js + render loop)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record a pointer sample in canvas coordinates (DPR-scaled).
 * Called only for mouse-like pointers, and only when not over UI.
 */
function notifyMouseTrailMove(x, y, nowMs, inBounds) {
  if (syncSuppressedState()) return;

  const g = getGlobals();
  if (!g?.mouseTrailEnabled) return;
  if (!inBounds) return;
  if (prefersReducedMotion()) return;

  // Cap can be tuned live; only reallocate if needed (rare).
  const wanted = clamp((g.mouseTrailLength ?? 18) | 0, 4, 96);
  ensureCapacity(wanted);
  if (!cap) return;

  // Implicit spacing: derived from size.
  // Keep this tight so the stroke reads continuous at small sizes.
  const dpr = g.DPR || 1;
  const widthPx = clamp(Number(g.mouseTrailSize ?? 1.3), 0.5, 10) * dpr;
  const minDist = Math.max(0.35, widthPx * 0.55);
  const minDistSq = minDist * minDist;

  if (size > 0) {
    const lastIdx = (head - 1 + cap) % cap;
    if (distSq(x, y, xs[lastIdx], ys[lastIdx]) < minDistSq) {
      // Update the last timestamp so the head doesn't "die" while hovering.
      ts[lastIdx] = nowMs;
      return;
    }
  }

  xs[head] = x;
  ys[head] = y;
  ts[head] = nowMs;
  head = (head + 1) % cap;
  if (size < cap) size++;
}

/**
 * Draw the current trail. Call from the main render loop.
 */
function drawMouseTrail(ctx) {
  if (syncSuppressedState()) return;

  const g = getGlobals();
  if (!g?.mouseTrailEnabled) return;
  if (prefersReducedMotion()) return;
  if (!ctx || !size || !cap) return;

  const now = performance.now();
  const lifetimeMs = clamp(Number(g.mouseTrailFadeMs ?? 220), 40, 2000);
  const baseAlpha = clamp(Number(g.mouseTrailOpacity ?? 0.35), 0, 1);
  if (baseAlpha <= 0) return;

  const dpr = g.DPR || 1;
  const widthPx = clamp(Number(g.mouseTrailSize ?? 1.3), 0.5, 10) * dpr;

  // Cull expired points from the tail side (oldest).
  // We do this lazily: walk from oldest forward while expired.
  // Oldest index is (head - size).
  while (size > 0) {
    const oldest = (head - size + cap) % cap;
    const age = now - ts[oldest];
    if (age <= lifetimeMs) break;
    size--;
  }
  if (!size) return;

  // If only one sample remains, skip drawing (avoids "dot" artifacts).
  if (size < 2) return;

  const stroke = getStrokeStyle();

  // Save minimal state; keep this effect isolated.
  const prevAlpha = ctx.globalAlpha;
  const prevComp = ctx.globalCompositeOperation;
  const prevLineCap = ctx.lineCap;
  const prevLineJoin = ctx.lineJoin;
  const prevStrokeStyle = ctx.strokeStyle;
  const prevLineWidth = ctx.lineWidth;

  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke;
  ctx.lineWidth = widthPx;
  ctx.globalAlpha = baseAlpha;

  // Smooth stroke through samples (no stamping, no visible connector dots).
  const count = size;
  const start = (head - count + cap) % cap;

  ctx.beginPath();
  const x0 = xs[start];
  const y0 = ys[start];
  ctx.moveTo(x0, y0);

  if (count === 2) {
    const x1 = xs[(start + 1) % cap];
    const y1 = ys[(start + 1) % cap];
    ctx.lineTo(x1, y1);
  } else {
    // Quadratic smoothing via midpoints
    for (let i = 1; i < count - 1; i++) {
      const iCurr = (start + i) % cap;
      const iNext = (start + i + 1) % cap;
      const cx = xs[iCurr];
      const cy = ys[iCurr];
      const mx = (cx + xs[iNext]) * 0.5;
      const my = (cy + ys[iNext]) * 0.5;
      ctx.quadraticCurveTo(cx, cy, mx, my);
    }
    // Finish to last point
    const iLast = (start + count - 1) % cap;
    ctx.lineTo(xs[iLast], ys[iLast]);
  }

  ctx.stroke();

  // Restore
  ctx.globalAlpha = prevAlpha;
  ctx.globalCompositeOperation = prevComp;
  ctx.lineCap = prevLineCap;
  ctx.lineJoin = prevLineJoin;
  ctx.strokeStyle = prevStrokeStyle;
  ctx.lineWidth = prevLineWidth;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      PHYSICS ENGINE (COMPLETE)                               ║
// ║           Fixed-timestep with collision detection                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


const DT_DESKTOP = CONSTANTS.PHYSICS_DT;
const DT_MOBILE = CONSTANTS.PHYSICS_DT_MOBILE;
let acc = 0;
const CORNER_RADIUS = 42; // matches rounded container corners
const CORNER_FORCE = 1800;
const WARMUP_FRAME_DT = 1 / 60;

/**
 * Reset physics accumulator - call when switching modes to prevent timing spikes
 */
function resetPhysicsAccumulator() {
  acc = 0;
}

// ════════════════════════════════════════════════════════════════════════════════
// PERF: Reusable color batch cache to eliminate per-frame Map/array allocations
// ════════════════════════════════════════════════════════════════════════════════
const colorBatchCache = {
  map: new Map(),
  arrays: [],
  arrayIndex: 0
};

function getColorArray() {
  if (colorBatchCache.arrayIndex < colorBatchCache.arrays.length) {
    const arr = colorBatchCache.arrays[colorBatchCache.arrayIndex++];
    arr.length = 0;
    return arr;
  }
  const newArr = [];
  colorBatchCache.arrays.push(newArr);
  colorBatchCache.arrayIndex++;
  return newArr;
}

function resetColorBatchCache() {
  colorBatchCache.map.clear();
  colorBatchCache.arrayIndex = 0;
}

function applyCornerRepellers(ball, canvas, dt, mobile = false) {
  const corners = [
    { x: CORNER_RADIUS, y: CORNER_RADIUS },
    { x: canvas.width - CORNER_RADIUS, y: CORNER_RADIUS },
    { x: CORNER_RADIUS, y: canvas.height - CORNER_RADIUS },
    { x: canvas.width - CORNER_RADIUS, y: canvas.height - CORNER_RADIUS }
  ];
  const cornerCount = mobile ? 2 : corners.length;
  for (let i = 0; i < cornerCount; i++) {
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
      ball.vx += nx * strength * dt;
      ball.vy += ny * strength * dt;
    }
  }
}

function updatePhysicsInternal(dtSeconds, applyForcesFunc) {
  const globals = getGlobals();
  const balls = globals.balls;
  const canvas = globals.canvas;
  
  if (!canvas) return;

  if (balls.length === 0) return;

  // Select physics timestep based on device type (60Hz mobile, 120Hz desktop)
  const DT = (globals.isMobile || globals.isMobileViewport) ? DT_MOBILE : DT_DESKTOP;

  // Kaleidoscope mode has its own lightweight physics path:
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

  // Wall input accumulation:
  // The wall ring integrates at a configurable cadence (Tier 1), but impacts/pressure
  // are registered during the fixed-timestep loop. If we clear pressure inside the
  // 120Hz loop, the wall never sees stable "resting pressure" and can become overly wobbly.
  // Clear pressure ONCE per render-frame, then accumulate across physics substeps.
  // Skip entirely on mobile for performance (wallDeformationEnabled = false)
  const wallDeformEnabled = globals.wallDeformationEnabled !== false;
  if (wallDeformEnabled) {
    wallState.clearPressureFrame();
  }
  
  while (acc >= DT && physicsSteps < CONSTANTS.MAX_PHYSICS_STEPS) {
    // Integrate physics for all modes
      const len = balls.length;
      for (let i = 0; i < len; i++) {
        balls[i].step(DT, applyForcesFunc);
      }
    
    // Collision solver iterations (performance tuning)
    const collisionIterations = Math.max(
      1,
      Math.min(20, Math.round(Number(globals.physicsCollisionIterations ?? 10) || 10))
    );

    // Ball-to-ball collisions:
    // - Disabled for Flies (swarm aesthetic)
    // - Reduced for Kaleidoscope mode (performance)
    // - Standard for remaining physics modes
    if (globals.currentMode === MODES.KALEIDOSCOPE) {
      resolveCollisions(6); // handled by kaleidoscope early-return, kept for safety
    } else if (globals.currentMode !== MODES.FLIES &&
               globals.currentMode !== MODES.SPHERE_3D &&
               globals.currentMode !== MODES.CUBE_3D &&
               globals.currentMode !== MODES.PARALLAX_LINEAR &&
               globals.currentMode !== MODES.STARFIELD_3D &&
               globals.currentMode !== MODES.DVD_LOGO &&
               globals.currentMode !== MODES.SNAKE) {
      resolveCollisions(collisionIterations); // configurable solver iterations
    } else if (globals.currentMode === MODES.SNAKE) {
      // Snake uses lighter collision resolution to avoid breaking chain
      resolveCollisionsCustom({
        iterations: 3,
        positionalCorrectionPercent: 0.3,
        maxCorrectionPx: 1.0 * (globals.DPR || 1),
        enableSound: false
      });
    }

    // Reset per-step caps/counters (impacts + pressure-event budget)
    // Skip on mobile for performance
    if (wallDeformEnabled) {
      wallState.resetStepBudgets();
    }
    
    // Wall collisions + corner repellers
    // Skip for Parallax modes (internal wrap logic, no wall physics)
    if (globals.currentMode !== MODES.SPHERE_3D &&
        globals.currentMode !== MODES.CUBE_3D &&
        globals.currentMode !== MODES.PARALLAX_LINEAR &&
        globals.currentMode !== MODES.STARFIELD_3D) {
      const wallRestitution = (globals.currentMode === MODES.WEIGHTLESS) ? globals.weightlessBounce : globals.REST;
      const isPitLike = (globals.currentMode === MODES.PIT);
      const lenWalls = balls.length;
      // On mobile, disable wall impact/pressure registration for performance
      const wallEffectsOptions = wallDeformEnabled ? {} : { registerEffects: false };
      const isMobile = globals.isMobile || globals.isMobileViewport;
      for (let i = 0; i < lenWalls; i++) {
        const ball = balls[i];
        // Skip wall collisions for DVD logo balls (they handle their own bouncing)
        if (ball.isDvdLogo) continue;
        
        // Ball Pit has explicit rounded-corner arc clamping in Ball.walls().
        // Avoid an additional velocity-based corner repeller there, which can
        // create local compressions in dense corner stacks.
        if (!isPitLike) applyCornerRepellers(ball, canvas, DT, isMobile);
        ball.walls(canvas.width, canvas.height, DT, wallRestitution, wallEffectsOptions);
      }
    }

    // Ball Pit stabilization:
    // Wall/corner clamping can re-introduce overlaps in dense stacks (especially near the floor).
    // Run a small post-wall collision pass for Pit-like modes only.
    if (globals.currentMode === MODES.PIT) {
      resolveCollisions(3);

      // The post-wall collision pass can push bodies slightly outside the inset wall bounds.
      // Clamp once more without registering wall effects (sound/pressure/wobble).
      const wallRestitution = globals.REST;
      const lenClamp = balls.length;
      for (let i = 0; i < lenClamp; i++) {
        balls[i].walls(canvas.width, canvas.height, DT, wallRestitution, { registerEffects: false });
      }

      // ══════════════════════════════════════════════════════════════════════════
      // POST-PHYSICS STABILIZATION (Pit modes only)
      // After all constraints, aggressively dampen near-stationary balls.
      // This simulates static friction and prevents perpetual micro-wiggle on mobile.
      // ══════════════════════════════════════════════════════════════════════════
      const DPR = globals.DPR || 1;
      // Thresholds must be DPR-scaled: physics runs in canvas pixels (displayPx * DPR)
      // Same apparent motion = DPRx higher velocity in canvas space
      const vThresh = (Number.isFinite(globals.sleepVelocityThreshold) ? globals.sleepVelocityThreshold : 12.0) * DPR;
      const wThresh = Number.isFinite(globals.sleepAngularThreshold) ? globals.sleepAngularThreshold : 0.18;
      const tSleep = globals.timeToSleep ?? 0.25;
      
      for (let i = 0; i < lenClamp; i++) {
        const b = balls[i];
        if (!b || b.isSleeping) continue;
        
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const angSpeed = Math.abs(b.omega);
        
        // Aggressive stabilization: if grounded OR supported with tiny velocity, zero it
        // hasSupport = resting on another ball; isGrounded = touching floor
        const isSettled = b.isGrounded || b.hasSupport;
        if (isSettled && speed < vThresh && angSpeed < wThresh) {
          // Aggressively dampen toward zero (static friction simulation)
          b.vx *= 0.5;
          b.vy *= 0.5;
          b.omega *= 0.5;
          
          // If really tiny, snap to zero (DPR-scaled)
          if (speed < 2 * DPR) {
            b.vx = 0;
            b.vy = 0;
          }
          if (angSpeed < 0.02) {
            b.omega = 0;
          }
          
          // Accumulate sleep timer
          b.sleepTimer += DT;
          if (b.sleepTimer >= tSleep) {
            b.vx = 0;
            b.vy = 0;
            b.omega = 0;
            b.isSleeping = true;
          }
        } else {
          // Moving too fast - reset sleep timer
          b.sleepTimer = 0;
        }
      }
    }

    // Global sleep (non-pit physics modes):
    // If enabled, allow truly-stationary balls to sleep to reduce per-ball work.
    // Uses physicsSleepThreshold/physicsSleepTime (DPR-scaled) and the shared angular threshold.
    if (globals.physicsSkipSleepingSteps !== false) {
      const mode = globals.currentMode;
      const eligible =
        mode !== MODES.FLIES &&
        mode !== MODES.SPHERE_3D &&
        mode !== MODES.CUBE_3D &&
        mode !== MODES.PARALLAX_LINEAR &&
        mode !== MODES.KALEIDOSCOPE &&
        mode !== MODES.PIT;

      if (eligible) {
        const DPR = globals.DPR || 1;
        const vThresh = Math.max(0, Number(globals.physicsSleepThreshold ?? 12.0) || 0) * DPR;
        const tSleep = Math.max(0, Number(globals.physicsSleepTime ?? 0.25) || 0);
        const wThresh = Number.isFinite(globals.sleepAngularThreshold) ? globals.sleepAngularThreshold : 0.18;

        if (vThresh > 0 && tSleep > 0) {
          const lenSleep = balls.length;
          for (let i = 0; i < lenSleep; i++) {
            const b = balls[i];
            if (!b || b.isSleeping) continue;
            
            // Never allow meteors to sleep - they need to register wall impacts
            if (b.isMeteor === true) {
              b.sleepTimer = 0;
              continue;
            }

            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            const angSpeed = Math.abs(b.omega);
            if (speed < vThresh && angSpeed < wThresh) {
              b.sleepTimer += DT;
              if (b.sleepTimer >= tSleep) {
                b.vx = 0;
                b.vy = 0;
                b.omega = 0;
                b.isSleeping = true;
              }
            } else {
              b.sleepTimer = 0;
            }
          }
        }
      }
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
  // Skip on mobile for performance (wallDeformationEnabled = false)
  if (wallDeformEnabled) {
    wallState.step(dtSeconds);
  }

  // Reset accumulator if falling behind
  if (acc > DT * CONSTANTS.ACCUMULATOR_RESET_THRESHOLD) acc = 0;
}

async function updatePhysics(dtSeconds, applyForcesFunc) {
  const globals = getGlobals();
  const canvas = globals.canvas;
  const balls = globals.balls;

  if (!canvas) return;
  if (!balls || balls.length === 0) return;

  // Mode warmup: consume synchronously before first render after init.
  // This prevents visible “settling” motion (no pop-in/flash) by advancing physics
  // N render-frames without drawing.
  const warmupFrames = Math.max(0, Math.round(globals.warmupFramesRemaining || 0));
  if (warmupFrames > 0) {
    globals.warmupFramesRemaining = 0;
    acc = 0;

    for (let i = 0; i < warmupFrames; i++) {
      updatePhysicsInternal(WARMUP_FRAME_DT, applyForcesFunc);
    }
    // No further physics this frame; render will show the settled state.
    return;
  }

  updatePhysicsInternal(dtSeconds, applyForcesFunc);
  
  // Update cursor explosion particles
  updateCursorExplosion(dtSeconds);
}

function render() {
  const globals = getGlobals();
  const ctx = globals.ctx;
  const balls = globals.balls;
  const canvas = globals.canvas;
  
  if (!ctx || !canvas) return;
  
  // Clear frame (ghost trails removed per performance optimization plan)
  // Clear BEFORE applying clip so the corners never accumulate stale pixels.
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ══════════════════════════════════════════════════════════════════════════════
  // OPTIMIZATION #5: Skip clip when corner radius is 0 (save/restore is expensive)
  // ══════════════════════════════════════════════════════════════════════════════
  const clipPath = globals.canvasClipPath;
  const cornerRadius = globals.cornerRadius ?? globals.wallRadius ?? 0;
  const needsClip = clipPath && cornerRadius > 0;
  
  if (needsClip) {
    ctx.save();
    try { ctx.clip(clipPath); } catch (e) {}
  }
  
  const modeRenderer = getModeRenderer();
  if (modeRenderer && modeRenderer.preRender) {
    modeRenderer.preRender(ctx);
  }
  
  // ══════════════════════════════════════════════════════════════════════════════
  // OPTIMIZATION #1: Batch balls by color to reduce ctx.fillStyle changes
  // Typical scene: 300 balls, 8-12 unique colors
  // Before: 300 fillStyle changes per frame
  // After: 8-12 fillStyle changes per frame (~25x reduction)
  // 
  // IMPORTANT: This does NOT change ball color distribution - we're only
  // optimizing how they're rendered, not how colors are assigned to balls.
  // ══════════════════════════════════════════════════════════════════════════════
  if (globals.currentMode === MODES.KALEIDOSCOPE) {
    renderKaleidoscope(ctx);
  } else {
    // Group balls by color (O(n) pass, minimal overhead)
    // PERF: Reuse cached Map and arrays to eliminate per-frame allocations
    resetColorBatchCache();
    const ballsByColor = colorBatchCache.map;
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      const color = ball.color;
      if (!ballsByColor.has(color)) {
        ballsByColor.set(color, getColorArray());
      }
      ballsByColor.get(color).push(ball);
    }
    
    // Draw in batches (far fewer fillStyle state changes)
    for (const [color, group] of ballsByColor) {
      ctx.fillStyle = color;
      
      for (let i = 0; i < group.length; i++) {
        const ball = group[i];
        
        // Handle special rendering cases (squash, alpha, filtering)
        const hasSquash = ball.squashAmount > 0.01;
        const filterOpacity = ball.filterOpacity ?? 1;
        const effectiveAlpha = ball.alpha * filterOpacity;
        const hasAlpha = effectiveAlpha < 1.0;
        
        if (hasSquash || hasAlpha) {
          // Use existing Ball.draw() for complex cases
          ball.draw(ctx);
        } else {
          // Fast path: simple circle (no transforms, no save/restore)
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.getDisplayRadius(), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  if (modeRenderer && modeRenderer.postRender) {
    modeRenderer.postRender(ctx);
  }
  
  // Restore clip BEFORE drawing walls (walls extend beyond canvas edges)
  if (needsClip) {
    ctx.restore();
  }
  
  // Mouse trail: draw after clip restore so it's always visible
  drawMouseTrail(ctx);
  
  // Cursor explosion: draw after trail (particles dissipate beautifully)
  drawCursorExplosion(ctx);
  
  // Depth wash: gradient overlay between balls/trail and wall
  drawDepthWash(ctx, canvas.width, canvas.height);
  
  // Draw rubber walls LAST (in front of balls, outside clip path)
  drawWalls(ctx, canvas.width, canvas.height);
}

/**
 * Sync chrome color from CSS (call on theme change)
 */
function syncChromeColor() {
  updateChromeColor();
}

/**
 * Get the current balls array (for sound system etc.)
 * @returns {Array} Array of Ball objects
 */
function getBalls() {
  const globals = getGlobals();
  return globals.balls || [];
}

var engine = /*#__PURE__*/Object.freeze({
  __proto__: null,
  getBalls: getBalls,
  render: render,
  resetPhysicsAccumulator: resetPhysicsAccumulator,
  syncChromeColor: syncChromeColor,
  updatePhysics: updatePhysics
});

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
let bannerPrinted = false;

function detectDevMode() {
  // Bundled builds can inject true (boolean literal) via Rollup replace.
  // In unbundled dev (native modules), fall back to documented detection rules.
  try {
    return true;
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

// Fallback color palette (Industrial Teal light mode) - used if currentColors not available
// Weights: 50%, 25%, 12%, 6%, 3%, 2%, 1%, 1%
const FALLBACK_CONSOLE_COLORS = [
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

/**
 * Get current color scheme colors from globals, with fallback to hardcoded palette
 * This ensures terminal text matches the ball colors
 */
function getConsoleColors() {
  try {
    const globals = getGlobals();
    const colors = globals?.currentColors;
    if (Array.isArray(colors) && colors.length >= 8) {
      return colors.slice(0, 8);
    }
  } catch (e) {
    // If getGlobals fails or colors not available, use fallback
  }
  return FALLBACK_CONSOLE_COLORS;
}

function pickWeightedColor(colors) {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < COLOR_WEIGHTS.length; i++) {
    cumulative += COLOR_WEIGHTS[i];
    if (r <= cumulative) return colors[i];
  }
  return colors[0];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildColorMap(ascii, clusterSize = 3) {
  // Get current color scheme (matches ball colors)
  // Wrap in try-catch to ensure we always have valid colors
  let colors;
  try {
    colors = getConsoleColors();
    // Ensure we have exactly 8 colors
    if (!Array.isArray(colors) || colors.length < 8) {
      colors = FALLBACK_CONSOLE_COLORS;
    }
  } catch (e) {
    colors = FALLBACK_CONSOLE_COLORS;
  }
  
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
    const colorIndex = Math.min(i, colors.length - 1);
    colorAssignments[shuffledVisible[i]] = colors[colorIndex] || FALLBACK_CONSOLE_COLORS[colorIndex];
  }
  
  // Fill remaining visible clusters with weighted random
  for (const idx of visibleIndices) {
    if (colorAssignments[idx] === null) {
      colorAssignments[idx] = pickWeightedColor(colors);
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
  
  // Base style applied to all chunks to ensure consistent width
  const baseStyle = 'font-family: monospace; font-weight: bold; font-size: 12px; letter-spacing: 0;';
  
  for (const line of ascii) {
    let format = '';
    const styles = [];
    for (let i = 0; i < line.length; i += clusterSize) {
      const chunk = line.slice(i, i + clusterSize);
      format += '%c' + chunk;
      const color = colorAssignments[clusterIdx];
      styles.push(`color: ${color}; ${baseStyle}`);
      clusterIdx++;
    }
    results.push([format, ...styles]);
  }
  
  return results;
}

function printConsoleBanner({
  sentence = 'Curious mind detected. Design meets engineering at 60fps.',
  ascii = [
    '██████  ███████  ██████ ██   ██',
    '██   ██ ██      ██      ██  ██ ',
    '██████  █████   ██      █████  ',
    '██   ██ ██      ██      ██  ██ ',
    '██████  ███████  ██████ ██   ██',
  ],
  silence = false,
} = {}) {
  // Print only once per page load (dev or prod).
  if (bannerPrinted) return;
  bannerPrinted = true;

  try {
    // Sentence (subtle styling)
    rawConsole.log('%c' + sentence, 'color: #888; font-style: italic;');
    rawConsole.log(''); // spacer

    // ASCII (distributed colors; all 8 guaranteed to appear)
    // Wrap in try-catch to ensure banner always prints even if colorization fails
    try {
      const coloredLines = colorizeAsciiLines(ascii, 3);
      for (const args of coloredLines) rawConsole.log(...args);
    } catch (colorError) {
      // Fallback: print ASCII without colors if colorization fails
      for (const line of ascii) {
        rawConsole.log(line);
      }
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

  if (!silence) return;

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
  const dev = isDev();
  if (dev) return;

  // Production: banner + multi-colored ASCII, then silence non-error logs.
  printConsoleBanner({ sentence, ascii, silence: true });
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
// ║                  BROWSER ↔ WALL CHROME HARMONY                               ║
// ║     When desktop browsers ignore theme-color, adapt the wall to the UI       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


let _siteFrameLight = null;
let _siteFrameDark = null;

function captureSiteFrameColorsIfNeeded() {
  if (_siteFrameLight && _siteFrameDark) return;
  // Try to get from globals first (they have the config values), fallback to CSS tokens
  const g = getGlobals();
  _siteFrameLight = g?.frameColorLight || g?.frameColor || readTokenVar('--frame-color-light', '#0a0a0a');
  _siteFrameDark = g?.frameColorDark || g?.frameColor || readTokenVar('--frame-color-dark', '#0a0a0a');
}

function detectBrowserFamily() {
  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';

  const isFirefox = /Firefox\//.test(ua);
  const isSafari = /Safari\//.test(ua) && /Apple/.test(vendor) && !/Chrome\//.test(ua) && !/Chromium\//.test(ua);
  const isChromium = /Chrome\//.test(ua) || /Chromium\//.test(ua) || /Edg\//.test(ua);

  return {
    isFirefox,
    isSafari,
    isChromium,
    ua
  };
}

function detectThemeColorLikelyApplied() {
  // Heuristic: theme-color is reliably applied on mobile address bars, and on installed PWAs.
  // On desktop Chrome/Edge normal tabs, theme-color is often ignored.
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/.test(ua);
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
  const isMobile = isAndroid || isIOS;

  const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches)
    // iOS Safari standalone flag
    || (navigator.standalone === true);

  return isMobile || isStandalone;
}

function applyWallColor(hex) {
  const root = document.documentElement;
  // Set frameColor (master) - wall colors automatically point to this via CSS tokens
  root.style.setProperty('--frame-color-light', hex);
  root.style.setProperty('--frame-color-dark', hex);
  // Wall colors are automatically updated via CSS: --wall-color-light: var(--frame-color-light)
}

function restoreSiteWallColor(isDark) {
  // If we've previously adapted the wall/frame, restore to the captured site values.
  // Set frameColor (master) - wall colors automatically point to this via CSS tokens
  if (_siteFrameLight && _siteFrameDark) {
    const root = document.documentElement;
    root.style.setProperty('--frame-color-light', _siteFrameLight);
    root.style.setProperty('--frame-color-dark', _siteFrameDark);
    // Wall colors are automatically updated via CSS: --wall-color-light: var(--frame-color-light)
    return;
  }
  // Otherwise, try to get values from globals first (they have the config values)
  const g = getGlobals();
  const root = document.documentElement;
  const light = g?.frameColorLight || g?.frameColor || readTokenVar('--frame-color-light', '#0a0a0a');
  const dark = g?.frameColorDark || g?.frameColor || readTokenVar('--frame-color-dark', '#0a0a0a');
  root.style.setProperty('--frame-color-light', light);
  root.style.setProperty('--frame-color-dark', dark);
  // Wall colors are automatically updated via CSS: --wall-color-light: var(--frame-color-light)
}

function applyBrowserWallColor(isDark, family) {
  captureSiteFrameColorsIfNeeded();
  // Default uses a Chrome-like Material palette; can be extended per family later.
  // CSS vars allow art-direction without touching JS.
  const fallback = readTokenVar(isDark ? '--wall-color-browser-dark' : '--wall-color-browser-light', isDark ? '#202124' : '#f1f3f4');
  applyWallColor(fallback);
}

/**
 * Decide whether to adapt the wall color to browser UI defaults.
 * This is the "clever approach": when we can't tint chrome, we tint the wall.
 */
function applyChromeHarmony(isDark) {
  const g = getGlobals();
  const mode = String(g.chromeHarmonyMode || 'auto');
  const family = detectBrowserFamily();

  if (mode === 'site') {
    restoreSiteWallColor();
    return { mode, family, themeColorLikelyApplied: detectThemeColorLikelyApplied() };
  }

  if (mode === 'browser') {
    applyBrowserWallColor(isDark);
    return { mode, family, themeColorLikelyApplied: detectThemeColorLikelyApplied() };
  }

  // auto
  const themeColorLikelyApplied = detectThemeColorLikelyApplied();

  // Preserve the Safari benchmark: we don't force wall adaptation there.
  if (family.isSafari) {
    restoreSiteWallColor();
    return { mode, family, themeColorLikelyApplied };
  }

  // Desktop Chromium tabs are the primary mismatch case: chrome can't be tinted -> adapt wall.
  if (family.isChromium && !themeColorLikelyApplied) {
    applyBrowserWallColor(isDark);
    return { mode, family, themeColorLikelyApplied };
  }

  // Firefox + others: stay on site wall unless explicitly forced.
  restoreSiteWallColor();
  return { mode, family, themeColorLikelyApplied };
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    MODERN DARK MODE SYSTEM (Best Practices)                 ║
// ║          Native feel with prefers-color-scheme + manual override            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


const THEME_STORAGE_KEY = 'theme-preference-v2';
const LEGACY_THEME_STORAGE_KEY = 'theme-preference';

// Theme states: 'auto', 'light', 'dark'
let currentTheme = 'auto'; // Default to auto (system + night heuristic)
let systemPreference = 'light';
let isDarkModeInitialized = false;

function readStoredThemePreference() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'auto' || saved === 'light' || saved === 'dark') return saved;
    // Legacy key: treat any stored value as stale and migrate to auto.
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacy === 'auto' || legacy === 'light' || legacy === 'dark') {
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      localStorage.setItem(THEME_STORAGE_KEY, 'auto');
    }
  } catch (e) {}
  return 'auto';
}

function writeStoredThemePreference(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  } catch (e) {
    // localStorage unavailable
  }
}

/**
 * Sync CSS variables from config values (called at init)
 * This ensures config-driven colors override CSS defaults
 */
function syncCssVarsFromConfig() {
  const g = getGlobals();
  const root = document.documentElement;
  
  // Scene interior backgrounds (used only for #bravia-balls container, not browser chrome)
  if (g?.bgLight) {
    root.style.setProperty('--bg-light', g.bgLight);
  }
  if (g?.bgDark) {
    root.style.setProperty('--bg-dark', g.bgDark);
  }
  // Unified wall and browser chrome color (always #242529, no light/dark variants)
  // Frame color is now unified - prefer frameColor, then frameColorLight/frameColorDark, then CSS default
  const unifiedWallColor = g?.frameColor || g?.frameColorLight || g?.frameColorDark || '#242529';
  root.style.setProperty('--frame-color', unifiedWallColor);
  root.style.setProperty('--wall-color', unifiedWallColor);
  root.style.setProperty('--chrome-bg', unifiedWallColor);
  // Legacy aliases for compatibility
  root.style.setProperty('--frame-color-light', unifiedWallColor);
  root.style.setProperty('--frame-color-dark', unifiedWallColor);
  root.style.setProperty('--wall-color-light', unifiedWallColor);
  root.style.setProperty('--wall-color-dark', unifiedWallColor);
  root.style.setProperty('--chrome-bg-light', unifiedWallColor);
  root.style.setProperty('--chrome-bg-dark', unifiedWallColor);
  
  // Update browser chrome meta tag
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = unifiedWallColor;
  
  // Text colors
  if (g?.textColorLight) {
    root.style.setProperty('--text-color-light', g.textColorLight);
  }
  if (g?.textColorLightMuted) {
    root.style.setProperty('--text-color-light-muted', g.textColorLightMuted);
  }
  if (g?.textColorDark) {
    root.style.setProperty('--text-color-dark', g.textColorDark);
  }
  if (g?.textColorDarkMuted) {
    root.style.setProperty('--text-color-dark-muted', g.textColorDarkMuted);
  }

  // Edge labels (vertical chapter/copyright)
  if (Number.isFinite(g?.edgeLabelInsetAdjustPx)) {
    root.style.setProperty('--edge-label-inset-adjust', `${g.edgeLabelInsetAdjustPx}px`);
  }
  
  // Link colors
  if (g?.linkHoverColor) {
    root.style.setProperty('--link-hover-color', g.linkHoverColor);
  }
  
  // Logo + edge label colors are now derived from the core text tokens in CSS.
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

function isNightByLocalClock() {
  const g = getGlobals();
  if (!g.autoDarkModeEnabled) return false;
  const start = Number.isFinite(g.autoDarkNightStartHour) ? g.autoDarkNightStartHour : 18;
  const end = Number.isFinite(g.autoDarkNightEndHour) ? g.autoDarkNightEndHour : 6;
  const h = new Date().getHours();
  // Handles windows that cross midnight (e.g., 18 → 6).
  if (start === end) return false;
  if (start < end) return h >= start && h < end;
  return h >= start || h < end;
}

/**
 * Update browser chrome/theme color for Safari and Chrome
 * Uses unified wall color (#242529) for browser chrome - consistent across all modes
 */
function updateThemeColor(isDark) {
  const g = getGlobals();
  // Unified wall color (always #242529, no light/dark variants)
  // Prefer frameColor, then frameColorLight/frameColorDark, then CSS token, then default
  const unifiedColor = g?.frameColor || g?.frameColorLight || g?.frameColorDark || readTokenVar('--wall-color', '#242529');
  
  // Update existing meta tag or create new one
  let metaTheme = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = unifiedColor;
  
  // Safari-specific: Update for both light and dark modes (both use unified color)
  let metaThemeLight = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
  if (!metaThemeLight) {
    metaThemeLight = document.createElement('meta');
    metaThemeLight.name = 'theme-color';
    metaThemeLight.media = '(prefers-color-scheme: light)';
    document.head.appendChild(metaThemeLight);
  }
  metaThemeLight.content = unifiedColor;
  
  let metaThemeDark = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
  if (!metaThemeDark) {
    metaThemeDark = document.createElement('meta');
    metaThemeDark.name = 'theme-color';
    metaThemeDark.media = '(prefers-color-scheme: dark)';
    document.head.appendChild(metaThemeDark);
  }
  metaThemeDark.content = unifiedColor;
  
  // Safari iOS PWA: Update apple-mobile-web-app-status-bar-style
  // black-translucent: transparent status bar (allows unified wall color to show)
  let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleStatusBar) {
    appleStatusBar = document.createElement('meta');
    appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
    document.head.appendChild(appleStatusBar);
  }
  appleStatusBar.content = 'black-translucent';
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
  
  // 1) If the browser ignores theme-color (desktop Chrome tabs), adapt the wall to match the browser UI.
  // 2) Then update meta theme-color from the (possibly updated) CSS vars.
  applyChromeHarmony(isDark);
  updateThemeColor();
  
  // Sync chrome color for rubbery walls
  syncChromeColor();
  
  // Invalidate depth wash cache on theme change
  invalidateDepthWashCache();
  
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
    shouldBeDark = (systemPreference === 'dark') || isNightByLocalClock();
  } else if (theme === 'dark') {
    shouldBeDark = true;
  } else {
    shouldBeDark = false;
  }
  
  applyDarkModeToDOM(shouldBeDark);
  
  // Save preference
  writeStoredThemePreference(theme);
  
  log(`🎨 Theme set to: ${theme} (rendering: ${shouldBeDark ? 'dark' : 'light'})`);
}

/**
 * Clear color-related localStorage cache
 * Called when wall color system changes to prevent stale color values
 */
function clearColorCache() {
  try {
    // Clear theme preferences (will be re-initialized with unified color)
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    // Clear palette rotation cache (from colors.js - actual key name)
    localStorage.removeItem('abs_palette_chapter');
    log('🗑️ Cleared color-related localStorage cache');
  } catch (e) {
    // localStorage unavailable or error
  }
}

/**
 * Initialize dark mode system
 */
function initializeDarkMode() {
  if (isDarkModeInitialized) return;
  isDarkModeInitialized = true;

  // Clear color cache to prevent stale wall color values
  clearColorCache();

  // Sync CSS variables from config FIRST (before theme application)
  syncCssVarsFromConfig();

  // Detect system preference (for auto mode later)
  systemPreference = detectSystemPreference();
  log(`🖥️ System prefers: ${systemPreference}`);
  
  // Restore saved preference if available; otherwise default to Auto.
  const initial = readStoredThemePreference();
  setTheme(initial);
  
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

  // Night-window re-evaluation (privacy-first heuristic; only applies in Auto mode)
  window.setInterval(() => {
    if (currentTheme !== 'auto') return;
    setTheme('auto');
  }, 60_000);

  log('✓ Modern dark mode initialized');
}

/**
 * Get current theme
 */
function getCurrentTheme() {
  return currentTheme;
}

/**
 * Toggle between light and dark mode manually
 */
function toggleDarkMode() {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

var darkModeV2 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  getCurrentTheme: getCurrentTheme,
  initializeDarkMode: initializeDarkMode,
  setTheme: setTheme,
  toggleDarkMode: toggleDarkMode
});

// Procedural film-grain / noise system (no external GIF).
// Generates a small noise texture at runtime and drives motion via CSS-only animations.

let initialized = false;
let current = null;

let textureCanvas = null;
let textureCtx = null;
let cachedImageData = null;
let cachedData32 = null;
let cachedSize = 0;

let activeObjectUrl = null;
let pendingGenerateId = 0;
let regenTimer = null;
let lastTextureKey = '';

const NOISE_KEYS = [
  'noiseEnabled',
  'noiseSeed',
  'noiseTextureSize',
  'noiseDistribution',
  'noiseMonochrome',
  'noiseChroma',
  'noiseMotion',
  'noiseMotionAmount',
  'noiseSpeedMs',
  'noiseSpeedVariance',
  'noiseFlicker',
  'noiseFlickerSpeedMs',
  'noiseBlurPx',
  'noiseContrast',
  'noiseBrightness',
  'noiseSaturation',
  'noiseHue',
  'noiseSize',
  'noiseOpacity',
  'noiseOpacityLight',
  'noiseOpacityDark',
  'noiseBlendMode',
  'noiseColorLight',
  'noiseColorDark',
  'detailNoiseOpacity',
];

function pickNoiseKeys(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const key of NOISE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key];
  }
  return out;
}

function clampNumber(v, min, max, fallback) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampInt(v, min, max, fallback) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clamp01(v, fallback = 0) {
  return clampNumber(v, 0, 1, fallback);
}

function pickEnum(v, allowed, fallback) {
  return allowed.includes(v) ? v : fallback;
}

function readRootVarNumber(name, fallback) {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian01(rng) {
  // Fast-ish Gaussian-ish sampler (no trig/log):
  // Irwin–Hall approximation via averaging 3 uniforms (triangular-ish → near-normal).
  const v = (rng() + rng() + rng()) / 3;
  // Slightly widen the mid-tones to feel more "filmic" after contrast is applied.
  return Math.max(0, Math.min(1, 0.5 + (v - 0.5) * 1.15));
}

function ensureTextureCanvas(size) {
  if (!textureCanvas) {
    textureCanvas = document.createElement('canvas');
    textureCtx = textureCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!textureCtx) return null;
  if (textureCanvas.width !== size) textureCanvas.width = size;
  if (textureCanvas.height !== size) textureCanvas.height = size;
  if (cachedSize !== size) {
    cachedSize = size;
    cachedImageData = null;
    cachedData32 = null;
  }
  return textureCtx;
}

async function canvasToBlob(canvas) {
  return await new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } catch (e) {
      resolve(null);
    }
  });
}

async function generateNoiseTextureUrl({
  size,
  seed,
  distribution,
  monochrome,
  chroma,
  contrast,
  brightness,
  saturation,
  hue,
}) {
  const ctx = ensureTextureCanvas(size);
  if (!ctx) return null;

  if (!cachedImageData) {
    cachedImageData = ctx.createImageData(size, size);
    cachedData32 = new Uint32Array(cachedImageData.data.buffer);
  }

  const data32 = cachedData32;
  const rng = mulberry32(seed);

  const useGaussian = distribution === 'gaussian';
  const colorMix = clamp01(chroma, 0);
  const invColorMix = 1 - colorMix;

  const c = clampNumber(contrast, 0.25, 5, 1);
  const bMul = clampNumber(brightness, 0.25, 3, 1);
  const sat = clampNumber(saturation, 0, 3, 1);
  const hueDeg = clampNumber(hue, 0, 360, 0);

  const doContrastBrightness = c !== 1 || bMul !== 1;
  const doSaturation = sat !== 1;
  const doHue = hueDeg !== 0;

  // Luma constants (match CSS filter conventions).
  const lumR = 0.213;
  const lumG = 0.715;
  const lumB = 0.072;

  // Hue rotation matrix (CSS hue-rotate) — computed once per regeneration.
  let hr00 = 1, hr01 = 0, hr02 = 0;
  let hr10 = 0, hr11 = 1, hr12 = 0;
  let hr20 = 0, hr21 = 0, hr22 = 1;
  if (doHue) {
    const a = (hueDeg * Math.PI) / 180;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    hr00 = lumR + cosA * (1 - lumR) - sinA * lumR;
    hr01 = lumG - cosA * lumG - sinA * lumG;
    hr02 = lumB - cosA * lumB + sinA * (1 - lumB);
    hr10 = lumR - cosA * lumR + sinA * 0.143;
    hr11 = lumG + cosA * (1 - lumG) + sinA * 0.140;
    hr12 = lumB - cosA * lumB - sinA * 0.283;
    hr20 = lumR - cosA * lumR - sinA * (1 - lumR);
    hr21 = lumG - cosA * lumG + sinA * lumG;
    hr22 = lumB + cosA * (1 - lumB) + sinA * lumB;
  }

  for (let i = 0; i < data32.length; i++) {
    const base = useGaussian ? gaussian01(rng) : rng();

    let r = base;
    let g = base;
    let b = base;

    if (!monochrome) {
      const r2 = useGaussian ? gaussian01(rng) : rng();
      const g2 = useGaussian ? gaussian01(rng) : rng();
      const b2 = useGaussian ? gaussian01(rng) : rng();
      r = base * invColorMix + r2 * colorMix;
      g = base * invColorMix + g2 * colorMix;
      b = base * invColorMix + b2 * colorMix;
    }

    // Contrast + brightness (point-wise, tile-safe).
    if (doContrastBrightness) {
      r = (r - 0.5) * c + 0.5;
      g = (g - 0.5) * c + 0.5;
      b = (b - 0.5) * c + 0.5;
      r *= bMul;
      g *= bMul;
      b *= bMul;
    }

    // Saturation (lerp to luma) — point-wise, tile-safe.
    if (doSaturation) {
      const l = r * lumR + g * lumG + b * lumB;
      r = l * (1 - sat) + r * sat;
      g = l * (1 - sat) + g * sat;
      b = l * (1 - sat) + b * sat;
    }

    // Hue rotate — point-wise, tile-safe.
    if (doHue) {
      const nr = r * hr00 + g * hr01 + b * hr02;
      const ng = r * hr10 + g * hr11 + b * hr12;
      const nb = r * hr20 + g * hr21 + b * hr22;
      r = nr; g = ng; b = nb;
    }

    // Clamp + pack into RGBA (uint32) for fewer writes.
    const rr = Math.max(0, Math.min(255, Math.round(r * 255)));
    const gg = Math.max(0, Math.min(255, Math.round(g * 255)));
    const bb = Math.max(0, Math.min(255, Math.round(b * 255)));
    data32[i] = (255 << 24) | (bb << 16) | (gg << 8) | rr;
  }

  ctx.putImageData(cachedImageData, 0, 0);

  const blob = await canvasToBlob(textureCanvas);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

function applyCssVars(cfg) {
  const root = document.documentElement;

  // Enable/disable without removing DOM nodes (keeps layout stable).
  root.style.setProperty('--abs-noise-enabled', cfg.noiseEnabled ? '1' : '0');

  // Animation selection + timing.
  const motion = cfg.noiseMotion;
  const keyframes = motion === 'static'
    ? 'none'
    : (motion === 'drift' ? 'abs-noise-drift' : 'abs-noise-jitter');
  // Use steps(1) for instant jumps - no smooth transitions, more realistic noise
  const timing = motion === 'drift' ? 'linear' : 'steps(1, end)';

  root.style.setProperty('--abs-noise-keyframes', keyframes);
  root.style.setProperty('--abs-noise-timing', timing);

  // Single speed with variance applied via animation-duration calculation
  const baseSpeedMs = clampNumber(cfg.noiseSpeedMs ?? 1100, 0, 10000, 1100);
  const variance = clampNumber(cfg.noiseSpeedVariance ?? 0, 0, 1, 0);
  // Variance creates timing variation: use seeded random to create a stable but varied duration
  // Generate a timing multiplier based on seed and variance
  const prngTiming = mulberry32((cfg.noiseSeed ^ 0x7F3A2B1C) >>> 0);
  const timingRand = variance > 0 ? (prngTiming() * 2 - 1) * variance : 0; // -variance to +variance
  const speedMs = baseSpeedMs * (1 + timingRand);
  root.style.setProperty('--abs-noise-speed', `${Math.max(0, Math.round(speedMs))}ms`);
  root.style.setProperty('--abs-noise-speed-variance', String(variance));
  root.style.setProperty('--abs-noise-motion-amount', String(cfg.noiseMotionAmount));

  root.style.setProperty('--abs-noise-flicker', String(cfg.noiseFlicker));
  root.style.setProperty('--abs-noise-flicker-speed', `${Math.max(0, Math.round(cfg.noiseFlickerSpeedMs))}ms`);

  // Lowest runtime cost: keep heavy look adjustments baked into the generated tile.
  // Only keep blur as an optional CSS filter (blur can't be baked seamlessly without wrap-aware filtering).
  const blurPx = clampNumber(cfg.noiseBlurPx, 0, 6, 0);
  root.style.setProperty('--abs-noise-blur', `${blurPx.toFixed(2)}px`);
  root.style.setProperty('--abs-noise-filter', blurPx > 0 ? `blur(${blurPx.toFixed(2)}px)` : 'none');

  // Motion overscan + deterministic jitter path (px-based so it never reveals edges on large viewports).
  const motionAmount = clampNumber(cfg.noiseMotionAmount, 0, 2.5, 1);
  const hasMotion = cfg.noiseMotion !== 'static' && motionAmount > 0;
  // Keep motion amplitude bounded so grain stays subtle and GPU surfaces stay small,
  // even if the user cranks noise scale.
  const noiseSize = clampNumber(cfg.noiseSize ?? 85, 20, 600, 85);
  const baseMotionPx = clampNumber(noiseSize * 0.55, 24, 120, 82);
  const amp = hasMotion ? baseMotionPx * motionAmount : 0;
  const pad = Math.ceil(amp + (blurPx > 0 ? blurPx * 6 : 0) + 32);
  root.style.setProperty('--abs-noise-overscan', `-${pad}px`);

  // Seeded path: stable for a given seed, different between layers via differing speeds.
  // Generate many more jitter positions (40) for more alive, chaotic noise
  const prng = mulberry32((cfg.noiseSeed ^ 0xA53A9E37) >>> 0);
  const maxNorm = 0.9;
  const jitterCount = 40; // Many more positions = more alive, realistic noise
  for (let i = 1; i <= jitterCount; i++) {
    const x = (prng() * 2 - 1) * maxNorm * amp;
    const y = (prng() * 2 - 1) * maxNorm * amp;
    root.style.setProperty(`--abs-noise-j${i}-x`, `${Math.round(x)}px`);
    root.style.setProperty(`--abs-noise-j${i}-y`, `${Math.round(y)}px`);
  }

  const angle = prng() * Math.PI * 2;
  root.style.setProperty('--abs-noise-drift-x', `${Math.round(Math.cos(angle) * amp)}px`);
  root.style.setProperty('--abs-noise-drift-y', `${Math.round(Math.sin(angle) * amp)}px`);

  // Single layer controls
  root.style.setProperty('--noise-size', `${Math.round(noiseSize)}px`);
  
  // Opacity (theme-aware)
  const opacityLight = clampNumber(cfg.noiseOpacityLight ?? cfg.noiseOpacity ?? 0.08, 0, 1, 0.08);
  const opacityDark = clampNumber(cfg.noiseOpacityDark ?? cfg.noiseOpacity ?? 0.12, 0, 1, 0.12);
  root.style.setProperty('--noise-opacity-light', String(opacityLight));
  root.style.setProperty('--noise-opacity-dark', String(opacityDark));
  
  // Blend mode (normal = off by default)
  const blendMode = cfg.noiseBlendMode ?? 'normal';
  root.style.setProperty('--noise-blend-mode', blendMode);
  
  // Color controls (separate for light/dark)
  const colorLight = cfg.noiseColorLight ?? '#ffffff';
  const colorDark = cfg.noiseColorDark ?? '#ffffff';
  root.style.setProperty('--noise-color-light', colorLight);
  root.style.setProperty('--noise-color-dark', colorDark);
  
  root.style.setProperty('--detail-noise-opacity', String(cfg.detailNoiseOpacity ?? 1));
}

function sanitizeConfig(input = {}) {
  const cssNoiseSize = readRootVarNumber('--noise-size', 85);
  const cssOpacityLight = readRootVarNumber('--noise-opacity-light', 0.08);
  const cssOpacityDark = readRootVarNumber('--noise-opacity-dark', 0.12);

  const out = {
    // Texture
    noiseSeed: clampInt(input.noiseSeed, 0, 999999, 1337),
    noiseTextureSize: clampInt(input.noiseTextureSize, 64, 512, 256),
    noiseDistribution: pickEnum(input.noiseDistribution, ['uniform', 'gaussian'], 'gaussian'),
    noiseMonochrome: input.noiseMonochrome !== undefined ? Boolean(input.noiseMonochrome) : false,
    noiseChroma: clamp01(input.noiseChroma, 0.9),

    // Motion
    noiseEnabled: input.noiseEnabled !== undefined ? Boolean(input.noiseEnabled) : true,
    noiseMotion: pickEnum(input.noiseMotion, ['jitter', 'drift', 'static'], 'jitter'),
    noiseMotionAmount: clampNumber(input.noiseMotionAmount, 0, 2.5, 1.0),
    noiseSpeedMs: clampInt(input.noiseSpeedMs, 0, 10000, 1100),
    noiseSpeedVariance: clampNumber(input.noiseSpeedVariance, 0, 1, 0),
    noiseFlicker: clampNumber(input.noiseFlicker, 0, 1, 0.12),
    noiseFlickerSpeedMs: clampInt(input.noiseFlickerSpeedMs, 0, 5000, 220),

    // Look (baked into tile for minimal runtime cost; blur remains optional CSS filter)
    noiseBlurPx: clampNumber(input.noiseBlurPx, 0, 6, 0),
    noiseContrast: clampNumber(input.noiseContrast, 0.25, 5, 1.35),
    noiseBrightness: clampNumber(input.noiseBrightness, 0.25, 3, 1.0),
    noiseSaturation: clampNumber(input.noiseSaturation, 0, 3, 1.0),
    noiseHue: clampNumber(input.noiseHue, 0, 360, 0),

    // Single layer controls
    noiseSize: clampNumber(input.noiseSize, 20, 600, cssNoiseSize),
    noiseOpacity: clampNumber(input.noiseOpacity, 0, 1, 0.08),
    noiseOpacityLight: clampNumber(input.noiseOpacityLight, 0, 1, cssOpacityLight),
    noiseOpacityDark: clampNumber(input.noiseOpacityDark, 0, 1, cssOpacityDark),
    noiseBlendMode: pickEnum(input.noiseBlendMode, [
      'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
      'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'
    ], 'normal'),
    noiseColorLight: typeof input.noiseColorLight === 'string' ? input.noiseColorLight : '#ffffff',
    noiseColorDark: typeof input.noiseColorDark === 'string' ? input.noiseColorDark : '#ffffff',
    detailNoiseOpacity: clampNumber(input.detailNoiseOpacity, 0, 1, 1),
  };

  // If monochrome is on, chroma does nothing but keep a stable number.
  if (out.noiseMonochrome) out.noiseChroma = clamp01(out.noiseChroma, 0.9);

  return out;
}

function scheduleTextureRegeneration(cfg, { force = false } = {}) {
  const textureKey = JSON.stringify({
    seed: cfg.noiseSeed,
    size: cfg.noiseTextureSize,
    distribution: cfg.noiseDistribution,
    monochrome: cfg.noiseMonochrome,
    chroma: cfg.noiseChroma,
    contrast: Number(cfg.noiseContrast).toFixed(3),
    brightness: Number(cfg.noiseBrightness).toFixed(3),
    saturation: Number(cfg.noiseSaturation).toFixed(3),
    hue: Number(cfg.noiseHue).toFixed(1),
  });

  // If disabled, skip generation and clear any existing texture to avoid work.
  if (!cfg.noiseEnabled) {
    if (regenTimer) window.clearTimeout(regenTimer);
    regenTimer = null;
    pendingGenerateId++;
    lastTextureKey = '';
    try {
      const root = document.documentElement;
      root.style.setProperty('--abs-noise-texture', 'none');
      // Remove noise-ready class when disabled
      document.body?.classList.remove('noise-ready');
    } catch (e) {}
    if (activeObjectUrl) {
      try { URL.revokeObjectURL(activeObjectUrl); } catch (e) {}
    }
    activeObjectUrl = null;
    return;
  }

  if (!force && textureKey === lastTextureKey) {
    // Texture already exists, ensure noise-ready class is present
    if (activeObjectUrl && cfg.noiseEnabled) {
      document.body?.classList.add('noise-ready');
    }
    return;
  }
  lastTextureKey = textureKey;

  if (regenTimer) window.clearTimeout(regenTimer);

  // Debounce heavy work (sliders fire rapidly).
  regenTimer = window.setTimeout(async () => {
    regenTimer = null;
    const genId = ++pendingGenerateId;

    const url = await generateNoiseTextureUrl({
      size: cfg.noiseTextureSize,
      seed: cfg.noiseSeed,
      distribution: cfg.noiseDistribution,
      monochrome: cfg.noiseMonochrome,
      chroma: cfg.noiseChroma,
      contrast: cfg.noiseContrast,
      brightness: cfg.noiseBrightness,
      saturation: cfg.noiseSaturation,
      hue: cfg.noiseHue,
    });

    // Discard if a newer request is in-flight.
    if (genId !== pendingGenerateId) {
      if (url) URL.revokeObjectURL(url);
      return;
    }

    if (!url) return;

    try {
      const root = document.documentElement;
      root.style.setProperty('--abs-noise-texture', `url("${url}")`);
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = url;
      // Add noise-ready class to enable noise visibility
      document.body?.classList.add('noise-ready');
    } catch (e) {
      URL.revokeObjectURL(url);
    }
  }, 140);
}

function mergeConfig(nextPartial = {}) {
  const base = current || sanitizeConfig({});
  const merged = { ...base, ...pickNoiseKeys(nextPartial) };
  return sanitizeConfig(merged);
}

function initNoiseSystem(initialConfig = {}) {
  // Safe to call multiple times (idempotent).
  current = mergeConfig(initialConfig);
  initialized = true;

  applyCssVars(current);
  scheduleTextureRegeneration(current, { force: true });
  
  // If noise is enabled and texture already exists, ensure noise-ready class is present
  if (current.noiseEnabled && activeObjectUrl) {
    document.body?.classList.add('noise-ready');
  }
}

function applyNoiseSystem(nextConfig = {}) {
  if (!initialized) initNoiseSystem(nextConfig);

  current = mergeConfig(nextConfig);
  applyCssVars(current);

  // Only regenerate the texture if texture-related knobs changed.
  scheduleTextureRegeneration(current);
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
// ║                      CONFIG SYNC CLIENT                                       ║
// ║                                                                              ║
// ║  Frontend module that syncs config changes back to source files via API      ║
// ║  Only active in dev mode (port 8001)                                        ║
// ║  Debounces rapid changes to prevent excessive writes                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


const SYNC_SERVER_URL = 'http://localhost:8002/api/config-sync';
const SYNC_SERVER_BULK_URL = 'http://localhost:8002/api/config-sync-bulk';
const DEBOUNCE_MS = 300; // Wait 300ms after last change before syncing

// Pending sync operations (keyed by configType + path)
const pendingSyncs = new Map();

// Debounce timers (keyed by configType + path)
const debounceTimers = new Map();

/**
 * Generate sync key for debouncing
 */
function getSyncKey(configType, path) {
  return `${configType}:${path}`;
}

/**
 * Sync a config value to the source file
 * 
 * @param {string} configType - 'default' or 'portfolio'
 * @param {string} path - Config path (e.g., 'gravityMultiplier' or 'runtime.sound.masterGain')
 * @param {any} value - Value to set
 */
async function syncConfigToFile(configType, path, value) {
  // Only sync in dev mode
  if (!isDev()) {
    return;
  }

  // Validate inputs
  if (!configType || !path) {
    console.warn('[config-sync] Invalid sync request:', { configType, path });
    return;
  }

  if (configType !== 'default' && configType !== 'portfolio') {
    console.warn('[config-sync] Invalid configType:', configType);
    return;
  }

  const syncKey = getSyncKey(configType, path);

  // Store pending value (overwrites previous if same key)
  pendingSyncs.set(syncKey, { configType, path, value });

  // Clear existing debounce timer
  if (debounceTimers.has(syncKey)) {
    clearTimeout(debounceTimers.get(syncKey));
  }

  // Set new debounce timer
  const timer = setTimeout(async () => {
    debounceTimers.delete(syncKey);
    
    const pending = pendingSyncs.get(syncKey);
    if (!pending) return;
    
    pendingSyncs.delete(syncKey);

    // Perform sync
    try {
      const response = await fetch(SYNC_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configType: pending.configType,
          path: pending.path,
          value: pending.value
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.warn('[config-sync] Sync failed:', error.error || `HTTP ${response.status}`);
        return;
      }
      // Success: keep quiet (panel remains responsive even if sync server is down).
      await response.json().catch(() => null);
    } catch (e) {
      // Fail silently if server unavailable (doesn't break UI)
      // Network errors are expected and should not be logged
    }
  }, DEBOUNCE_MS);

  debounceTimers.set(syncKey, timer);
}

/**
 * Save entire config object at once (bulk save)
 * This avoids race conditions from multiple simultaneous writes
 * 
 * @param {string} configType - 'default' or 'portfolio'
 * @param {object} configObject - Complete config object to save
 */
async function saveConfigBulk(configType, configObject) {
  if (!isDev()) return false;

  try {
    const response = await fetch(SYNC_SERVER_BULK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configType, config: configObject })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.warn('[config-sync] Bulk save failed:', error.error || `HTTP ${response.status}`);
      return false;
    }

    const result = await response.json();
    return result.success;
  } catch (e) {
    // Fail silently - network errors are expected
    return false;
  }
}

var configSync = /*#__PURE__*/Object.freeze({
  __proto__: null,
  saveConfigBulk: saveConfigBulk,
  syncConfigToFile: syncConfigToFile
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          TEXT LOADER (SOURCE OF TRUTH)                       ║
// ║  Loads `source/config/contents-home.json` (dev) or reads `window.__TEXT__`    ║
// ║                 Guarantee: no dialog/text pop-in once visible                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

let cachedText = null;

function isObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readWindowText() {
  try {
    const t = (typeof window !== 'undefined') ? window.__TEXT__ : null;
    return isObject(t) ? t : null;
  } catch (e) {
    return null;
  }
}

async function fetchTextJSON() {
  const paths = [
    'config/contents-home.json',
    'js/contents-home.json',
    '../dist/js/contents-home.json',
  ];

  for (const path of paths) {
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) continue;
      const json = await res.json();
      if (isObject(json)) return json;
    } catch (e) {
      // Try next path
    }
  }
  throw new Error('No contents-home.json found');
}

/**
 * Load the runtime text dictionary.
 * - Production: already inlined at build-time as window.__TEXT__ (zero fetch)
 * - Dev: fetched once at startup, cached and installed on window.__TEXT__
 */
async function loadRuntimeText() {
  if (cachedText) return cachedText;

  const fromWindow = readWindowText();
  if (fromWindow) {
    cachedText = fromWindow;
    return cachedText;
  }

  const fetched = await fetchTextJSON();
  cachedText = fetched;
  try {
    if (typeof window !== 'undefined') window.__TEXT__ = fetched;
  } catch (e) {}
  return cachedText;
}

/**
 * Sync getter (for modules that already run after loadRuntimeText()).
 */
function getRuntimeTextSync() {
  return cachedText || readWindowText();
}

/**
 * Read a nested key path from the loaded text dictionary.
 * Example: getText('gates.cv.title', 'Fallback')
 */
function getText(path, fallback = '') {
  const root = getRuntimeTextSync();
  if (!root) return fallback;
  if (!path) return fallback;

  const parts = String(path).split('.').filter(Boolean);
  let cur = root;
  for (const p of parts) {
    if (!isObject(cur) && !Array.isArray(cur)) return fallback;
    cur = cur?.[p];
    if (cur === undefined || cur === null) return fallback;
  }
  return cur;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PAGE NAVIGATION UTILITIES                            ║
// ║     Unified navigation state: transitions, modal routing, animation skip     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const NAV_STATE_KEY = 'abs_nav_state';
const NAV_TIMESTAMP_KEY = 'abs_nav_ts';
const NAV_EXPIRY_MS = 5000; // 5 second window for page transitions

// Navigation state types
const NAV_STATES = {
  INTERNAL: 'internal',                 // General internal navigation
  OPEN_CV_MODAL: 'open_cv',             // Open CV modal on arrival
  OPEN_PORTFOLIO_MODAL: 'open_portfolio', // Open Portfolio modal on arrival
  OPEN_CONTACT_MODAL: 'open_contact',   // Open Contact modal on arrival
};

// Debounce state (prevents rapid click navigation)
let isTransitioning = false;

/**
 * Set navigation state before navigating to another page.
 * State is consumed on arrival (one-time use).
 * @param {string} state - Navigation state from NAV_STATES
 */
function setNavigationState(state = NAV_STATES.INTERNAL) {
  try {
    sessionStorage.setItem(NAV_STATE_KEY, state);
    sessionStorage.setItem(NAV_TIMESTAMP_KEY, String(Date.now()));
  } catch (e) {
    // Storage unavailable (private browsing) - navigation will show wall animation (safe default)
  }
}

/**
 * Get and consume the navigation state.
 * Returns null if no state or expired. Clears state after reading.
 * Also clears legacy flags for backwards compatibility.
 * @returns {string|null} Navigation state or null
 */
function getNavigationState() {
  try {
    const state = sessionStorage.getItem(NAV_STATE_KEY);
    const ts = parseInt(sessionStorage.getItem(NAV_TIMESTAMP_KEY) || '0', 10);
    const isRecent = Date.now() - ts < NAV_EXPIRY_MS;
    
    // Clear after reading (one-time use)
    sessionStorage.removeItem(NAV_STATE_KEY);
    sessionStorage.removeItem(NAV_TIMESTAMP_KEY);
    
    // Also clear legacy flags for clean migration
    sessionStorage.removeItem('abs_open_cv_modal');
    sessionStorage.removeItem('abs_open_cv_gate');
    sessionStorage.removeItem('abs_open_portfolio_modal');
    sessionStorage.removeItem('abs_open_contact_modal');
    sessionStorage.removeItem('abs_internal_nav');
    
    if (state && isRecent) return state;
  } catch (e) {
    // Storage unavailable
  }
  return null;
}

/**
 * Check if page was loaded via browser back/forward navigation.
 * Uses Performance Navigation Timing API.
 * @returns {boolean}
 */
function isBackForwardNavigation() {
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      return navEntries[0].type === 'back_forward';
    }
  } catch (e) {
    // API unavailable
  }
  return false;
}

/**
 * Determine if wall animation should be skipped.
 * Returns true for internal navigation or browser back/forward.
 * @returns {boolean}
 */
function shouldSkipWallAnimation() {
  // Check internal navigation state first (consumes it)
  const navState = getNavigationState();
  // Also check browser back/forward
  return navState !== null || isBackForwardNavigation();
}

/**
 * Get which modal should auto-open on page load.
 * Must be called BEFORE shouldSkipWallAnimation() since that consumes the state.
 * @returns {string|null} 'cv', 'portfolio', 'contact', or null
 */
function getModalToAutoOpen() {
  try {
    const state = sessionStorage.getItem(NAV_STATE_KEY);
    if (state === NAV_STATES.OPEN_CV_MODAL) return 'cv';
    if (state === NAV_STATES.OPEN_PORTFOLIO_MODAL) return 'portfolio';
    if (state === NAV_STATES.OPEN_CONTACT_MODAL) return 'contact';
  } catch (e) {
    // Storage unavailable
  }
  return null;
}

/**
 * Navigate to a page with smooth fade-out transition.
 * Sets navigation state and applies page-transitioning class.
 * Debounces rapid clicks during transition.
 * @param {string} href - Destination URL
 * @param {string} state - Navigation state from NAV_STATES
 */
function navigateWithTransition(href, state = NAV_STATES.INTERNAL) {
  if (isTransitioning) return; // Debounce rapid clicks
  isTransitioning = true;
  
  setNavigationState(state);
  document.body.classList.add('page-transitioning');
  
  setTimeout(() => {
    window.location.href = href;
  }, 300); // Match CSS animation duration
}

/**
 * Reset transitioning state.
 * Call on bfcache restore (pageshow with persisted=true).
 */
function resetTransitionState() {
  isTransitioning = false;
  document.body.classList.remove('page-transitioning');
}

/**
 * Add prefetch link for a page (once per session).
 * Improves navigation speed by preloading destination.
 * @param {string} href - URL to prefetch
 */
function prefetchPage(href) {
  // Check if already prefetched
  const existing = document.querySelector(`link[rel="prefetch"][href="${href}"]`);
  if (existing) return;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Setup prefetch on hover for a link element.
 * Only prefetches once (first hover).
 * @param {HTMLElement} element - Element to watch for hover
 * @param {string} href - URL to prefetch on hover
 */
function setupPrefetchOnHover(element, href) {
  if (!element) return;
  element.addEventListener('mouseenter', () => prefetchPage(href), { once: true });
}

var pageNav = /*#__PURE__*/Object.freeze({
  __proto__: null,
  NAV_STATES: NAV_STATES,
  getModalToAutoOpen: getModalToAutoOpen,
  getNavigationState: getNavigationState,
  isBackForwardNavigation: isBackForwardNavigation,
  navigateWithTransition: navigateWithTransition,
  prefetchPage: prefetchPage,
  resetTransitionState: resetTransitionState,
  setNavigationState: setNavigationState,
  setupPrefetchOnHover: setupPrefetchOnHover,
  shouldSkipWallAnimation: shouldSkipWallAnimation
});

/**
 * CV Modal Controller
 * Handles the password-gating UI for the CV download.
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
    
    // Add the appropriate class
    flashEl.classList.add(`page-flash--${type}`);
    
    // Remove after animation completes
    const duration = 300;
    setTimeout(() => {
        flashEl.classList.remove(`page-flash--${type}`);
    }, duration);
}

function initCVModal() {
    const trigger = document.getElementById('cv-modal-trigger');
    const logo = document.getElementById('brand-logo');
    const modal = document.getElementById('cv-modal');
    const portfolioGate = document.getElementById('portfolio-modal'); // Get portfolio modal to check/close if open
    const contactGate = document.getElementById('contact-modal'); // Get contact modal to check/close if open
    const inputs = Array.from(document.querySelectorAll('.cv-digit'));
    const pageFlash = document.getElementById('page-flash');
    const modalLabel = document.getElementById('cv-modal-label');
    
    // Correct Code
    const CODE = '1111';
    
    if (!trigger || !modal || inputs.length === 0) {
        console.warn('CV Gate: Missing required elements');
        return;
    }
    
    // Logo is optional (not present on CV page)

    if (modal.dataset.modalInitialized === 'true') return;
    modal.dataset.modalInitialized = 'true';
    
    const BACK_TEXT = getText('gates.common.backText', 'BACK');
    const BACK_ARIA = getText('gates.common.backAriaLabel', 'Back');
    const TITLE = getText('gates.cv.title', 'Bio/CV');
    const DESC = getText(
        'gates.cv.description',
        "Because spam bots don't deserve nice things. This keeps my inbox a little more civilised. Need access? Get in touch for the code."
    );

    // Set label text if element exists
    if (modalLabel) {
        modalLabel.innerHTML = `
            <div class="modal-nav">
                <button type="button" class="gate-back abs-icon-btn" data-modal-back aria-label="${BACK_ARIA}">
                    <i class="ti ti-arrow-left" aria-hidden="true"></i>
                    <span>${BACK_TEXT}</span>
                </button>
            </div>
            <h2 class="modal-title">${TITLE}</h2>
            <p class="modal-description">${DESC}</p>
        `;
    }
    
    // Create page-flash element if it doesn't exist
    const flash = pageFlash || createPageFlash$1();

    // State
    let isOpen = false;

    // Helper to check if any modal is currently active
    const isAnyGateActive = () => {
        return (modal && modal.classList.contains('active')) ||
               (portfolioGate && portfolioGate.classList.contains('active')) ||
               (contactGate && contactGate.classList.contains('active'));
    };

    // --- Actions ---

    const openGate = (e) => {
        e?.preventDefault?.();
        
        // Check if any other modal is currently open
        const wasAnyGateActive = isAnyGateActive();
        
        // Close portfolio modal if it's open
        if (portfolioGate && portfolioGate.classList.contains('active')) {
            portfolioGate.classList.remove('active');
            portfolioGate.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                portfolioGate.classList.add('hidden');
                unmountModalFromOverlay(portfolioGate);
            }, 400);
        }

        // Close contact modal if it's open (keep modals mutually exclusive)
        if (contactGate && contactGate.classList.contains('active')) {
            contactGate.classList.remove('active');
            contactGate.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                contactGate.classList.add('hidden');
                unmountModalFromOverlay(contactGate);
            }, 400);
        }
        
        isOpen = true;
        
        // Show overlay only if no modal was previously active
        if (!wasAnyGateActive) {
            showOverlay();
        }
        
        // Animate Logo Out (Up) - optional on pages without logo
        if (logo) {
            logo.classList.add('fade-out-up');
        }
        
        // Fade out CV content on CV page
        const cvContainer = document.querySelector('.cv-scroll-container');
        if (cvContainer) {
            cvContainer.classList.add('fade-out-up');
        }

        // Defer modal DOM operations to next frame to avoid interrupting overlay's backdrop-filter transition
        requestAnimationFrame(() => {
            // Modal: mount modal inside overlay flex container
            mountModalIntoOverlay(modal);

            // Animate Modal In (Up)
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            modal.classList.add('active');
            
            // Focus first input
            inputs[0].focus();
        });
    };

    const closeGate = (instant = false) => {
        // Close must be responsive immediately (Back/background/Escape).
        isOpen = false;
        
        // Clear inputs
        inputs.forEach(input => input.value = '');
        
        if (instant) {
            // Instant close: disable transition, remove active, then re-enable
            modal.style.transition = 'none';
            if (logo) {
                logo.style.transition = 'none';
            }
            
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
            modal.classList.add('hidden');
            unmountModalFromOverlay(modal);
            if (logo) {
                logo.classList.remove('fade-out-up');
            }
            
            // Fade CV content back in on CV page
            const cvContainer = document.querySelector('.cv-scroll-container');
            if (cvContainer) {
                cvContainer.classList.remove('fade-out-up');
            }
            
            // Hide overlay immediately if no other modal is active
            if (!isAnyGateActive()) {
                hideOverlay();
            }
            
            // Re-enable transitions after a frame
            requestAnimationFrame(() => {
                modal.style.removeProperty('transition');
                if (logo) {
                    logo.style.removeProperty('transition');
                }
            });
        } else {
            // Smooth close: use CSS transition
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            if (logo) {
                logo.classList.remove('fade-out-up');
            }
            
            // Fade CV content back in on CV page
            const cvContainer = document.querySelector('.cv-scroll-container');
            if (cvContainer) {
                cvContainer.classList.remove('fade-out-up');
            }
            
            // Hide overlay immediately to animate blur in parallel with content
            if (!isAnyGateActive()) {
                hideOverlay();
            }
        
            setTimeout(() => {
                if (!isOpen) {
                    modal.classList.add('hidden');
                    unmountModalFromOverlay(modal);
                }
            }, 1700); // Match transition time
        }
    };

    // Back button closes modal (matches new UI pattern)
    try {
        const backBtn = modalLabel?.querySelector?.('[data-modal-back]');
        if (backBtn) backBtn.addEventListener('click', () => closeGate(false));
    } catch (e) {}
    
    // Click on modal background (not on inputs) also closes instantly
    modal.addEventListener('click', (e) => {
        // Only close if clicking the modal container itself or non-interactive areas
        if (e.target === modal || e.target.classList.contains('modal-label') || 
            e.target.classList.contains('modal-description') || e.target.tagName === 'H2' ||
            e.target.tagName === 'P') {
            closeGate(false);
        }
    });

    const checkCode = () => {
        const enteredCode = inputs.map(input => input.value).join('');
        
        if (enteredCode.length === 4) {
            if (enteredCode === CODE) {
                // Success - Pulse on inputs container
                const inputsContainer = document.querySelector('.cv-modal-inputs');
                if (inputsContainer) {
                    inputsContainer.classList.remove('pulse-energy');
                    inputsContainer.classList.add('pulse-energy');
                    
                    setTimeout(() => {
                        inputsContainer.classList.remove('pulse-energy');
                    }, 600);
                }
                
                // Smooth page fade-out + redirect using unified navigation
                setTimeout(() => {
                    navigateWithTransition('cv.html', NAV_STATES.INTERNAL);
                }, 200); // Brief delay after pulse starts
                
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

    // Auto-open check (e.g. navimodald from portfolio page)
    try {
        if (sessionStorage.getItem('abs_open_cv_modal')) {
            sessionStorage.removeItem('abs_open_cv_modal');
            // Small delay to allow page init
            setTimeout(() => openGate(), 300);
        }
    } catch (e) {}

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            closeGate();
        }
    });
    
    // Close when overlay is clicked (dismiss event from modal-overlay.js)
    document.addEventListener('modal-overlay-dismiss', (e) => {
        if (isOpen) {
            const instant = e.detail?.instant || false;
            closeGate(instant);
        }
    });

    inputs.forEach((input, index) => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (input.value === '') {
                    if (index > 0) {
                        inputs[index - 1].focus();
                    } else {
                        // Backspace on empty first input closes modal
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
 * Portfolio Modal Controller
 * Handles the password-gating UI for the portfolio section.
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
    
    // Add the appropriate class
    flashEl.classList.add(`page-flash--${type}`);
    
    // Remove after animation completes
    const duration = 300;
    setTimeout(() => {
        flashEl.classList.remove(`page-flash--${type}`);
    }, duration);
}

function initPortfolioModal() {
    const trigger = document.getElementById('portfolio-modal-trigger');
    const modal = document.getElementById('portfolio-modal');
    // Brand logo is optional (some layouts remove it); modal should still function without it.
    const logo = document.getElementById('brand-logo');
    const cvGate = document.getElementById('cv-modal'); // Get CV modal to check/close if open
    const contactGate = document.getElementById('contact-modal'); // Get contact modal to check/close if open
    const inputs = Array.from(document.querySelectorAll('.portfolio-digit'));
    const pageFlash = document.getElementById('page-flash');
    const modalLabel = document.getElementById('portfolio-modal-label');
    
    // Correct Code
    const CODE = '1234';
    
    if (!trigger || !modal || inputs.length === 0) {
        console.warn('Portfolio Gate: Missing required elements');
        return;
    }

    if (modal.dataset.modalInitialized === 'true') return;
    modal.dataset.modalInitialized = 'true';
    
    const BACK_TEXT = getText('gates.common.backText', 'BACK');
    const BACK_ARIA = getText('gates.common.backAriaLabel', 'Back');
    const TITLE = getText('gates.portfolio.title', 'View Portfolio');
    const DESC = getText(
        'gates.portfolio.description',
        "Good work deserves good context. Many of my projects across finance, automotive, and digital innovation startups are NDA-protected, so access is code-gated."
    );

    // Set label text if element exists
    if (modalLabel) {
        modalLabel.innerHTML = `
            <div class="modal-nav">
                <button type="button" class="gate-back abs-icon-btn" data-modal-back aria-label="${BACK_ARIA}">
                    <i class="ti ti-arrow-left" aria-hidden="true"></i>
                    <span>${BACK_TEXT}</span>
                </button>
            </div>
            <h2 class="modal-title">${TITLE}</h2>
            <p class="modal-description">${DESC}</p>
        `;
    }
    
    // Create page-flash element if it doesn't exist
    const flash = pageFlash || createPageFlash();

    // State
    let isOpen = false;

    // Helper to check if any modal is currently active
    const isAnyGateActive = () => {
        return (modal && modal.classList.contains('active')) ||
               (cvGate && cvGate.classList.contains('active')) ||
               (contactGate && contactGate.classList.contains('active'));
    };

    // --- Actions ---

    const openGate = (e) => {
        if (e) e.preventDefault();
        
        // Check if any other modal is currently open
        const wasAnyGateActive = isAnyGateActive();

        // Prefetch portfolio resources (non-blocking)
        const basePath = (() => {
            try {
                const b = window.PORTFOLIO_BASE || '';
                return b && !b.endsWith('/') ? `${b}/` : b;
            } catch (e) {
                return '';
            }
        })();
        const bundlePath = isDev()
            ? 'modules/portfolio/app.js'
            : 'js/portfolio-bundle.js';
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = `${basePath}${bundlePath}`;
        document.head.appendChild(prefetchLink);
        
        // Warm the cache with a lightweight, non-blocking hint.
        // Use `prefetch` (not `preload`) to avoid “preloaded but not used” console warnings.
        const preloadImg = document.createElement('link');
        preloadImg.rel = 'prefetch';
        // Note: portfolio page assets are chapter-indexed starting at 1.
        preloadImg.href = `${basePath}images/portfolio/pages/chapter-1-1.webp`;
        document.head.appendChild(preloadImg);
        
        // Close CV modal if it's open
        if (cvGate && cvGate.classList.contains('active')) {
            cvGate.classList.remove('active');
            cvGate.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                cvGate.classList.add('hidden');
                unmountModalFromOverlay(cvGate);
            }, 400);
        }

        // Close contact modal if it's open (keep modals mutually exclusive)
        if (contactGate && contactGate.classList.contains('active')) {
            contactGate.classList.remove('active');
            contactGate.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                contactGate.classList.add('hidden');
                unmountModalFromOverlay(contactGate);
            }, 400);
        }
        
        isOpen = true;
        
        // Show overlay only if no modal was previously active
        if (!wasAnyGateActive) {
            showOverlay();
        }
        
        // Animate Logo Out (Up)
        if (logo) logo.classList.add('fade-out-up');
        
        // Fade out CV content on CV page
        const cvContainer = document.querySelector('.cv-scroll-container');
        if (cvContainer) {
            cvContainer.classList.add('fade-out-up');
        }

        // Defer modal DOM operations to next frame to avoid interrupting overlay's backdrop-filter transition
        requestAnimationFrame(() => {
            // Modal: mount modal inside overlay flex container
            mountModalIntoOverlay(modal);

            // Animate Modal In (Up)
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            modal.classList.add('active');
            
            // Focus first input
            inputs[0].focus();
        });
    };

    const closeGate = (instant = false) => {
        // Close must be responsive immediately (Back/background/Escape).
        isOpen = false;
        
        // Clear inputs
        inputs.forEach(input => input.value = '');
        
        if (instant) {
            // Instant close: disable transition, remove active, then re-enable
            modal.style.transition = 'none';
            if (logo) logo.style.transition = 'none';
            
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
            modal.classList.add('hidden');
            unmountModalFromOverlay(modal);
            if (logo) logo.classList.remove('fade-out-up');
            
            // Fade CV content back in on CV page
            const cvContainer = document.querySelector('.cv-scroll-container');
            if (cvContainer) {
                cvContainer.classList.remove('fade-out-up');
            }
            
            // Hide overlay immediately if no other modal is active
            if (!isAnyGateActive()) {
                hideOverlay();
            }
            
            // Re-enable transitions after a frame
            requestAnimationFrame(() => {
                modal.style.removeProperty('transition');
                if (logo) logo.style.removeProperty('transition');
            });
        } else {
            // Smooth close: use CSS transition
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            if (logo) logo.classList.remove('fade-out-up');
            
            // Fade CV content back in on CV page
            const cvContainer = document.querySelector('.cv-scroll-container');
            if (cvContainer) {
                cvContainer.classList.remove('fade-out-up');
            }
            
            // Hide overlay immediately to animate blur in parallel with content
            if (!isAnyGateActive()) {
                hideOverlay();
            }
        
            setTimeout(() => {
                if (!isOpen) {
                    modal.classList.add('hidden');
                    unmountModalFromOverlay(modal);
                }
            }, 1700); // Match transition time
        }
    };

    // Back button closes modal (matches new UI pattern)
    try {
        const backBtn = modalLabel?.querySelector?.('[data-modal-back]');
        if (backBtn) backBtn.addEventListener('click', () => closeGate(false));
    } catch (e) {}
    
    // Click on modal background (not on inputs) also closes instantly
    modal.addEventListener('click', (e) => {
        // Only close if clicking the modal container itself or non-interactive areas
        if (e.target === modal || e.target.classList.contains('modal-label') || 
            e.target.classList.contains('modal-description') || e.target.tagName === 'H2' ||
            e.target.tagName === 'P') {
            closeGate(false);
        }
    });

    const checkCode = () => {
        const enteredCode = inputs.map(input => input.value).join('');
        
        if (enteredCode.length === 4) {
            if (enteredCode === CODE) {
                // Success - Pulse on inputs container
                const inputsContainer = document.querySelector('.portfolio-modal-inputs');
                if (inputsContainer) {
                    inputsContainer.classList.remove('pulse-energy');
                    inputsContainer.classList.add('pulse-energy');
                    
                    setTimeout(() => {
                        inputsContainer.classList.remove('pulse-energy');
                    }, 600);
                }
                
                // Set session token (soft modal)
                sessionStorage.setItem('abs_portfolio_ok', Date.now());
                
                // Smooth page fade-out + redirect using unified navigation
                setTimeout(() => {
                    navigateWithTransition('portfolio.html', NAV_STATES.INTERNAL);
                }, 200); // Brief delay after pulse starts
                
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

    // Auto-open check (if redirected back from portfolio.html)
    if (sessionStorage.getItem('abs_open_portfolio_modal')) {
        sessionStorage.removeItem('abs_open_portfolio_modal');
        // Small delay to allow page init
        setTimeout(() => openGate(), 300);
    }

    trigger.addEventListener('click', openGate);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            closeGate();
        }
    });
    
    // Close when overlay is clicked (dismiss event from modal-overlay.js)
    document.addEventListener('modal-overlay-dismiss', (e) => {
        if (isOpen) {
            const instant = e.detail?.instant || false;
            closeGate(instant);
        }
    });

    inputs.forEach((input, index) => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (input.value === '') {
                    if (index > 0) {
                        inputs[index - 1].focus();
                    } else {
                        // Backspace on empty first input closes modal
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
// ║                         CONTACT MODAL CONTROLLER                             ║
// ║                  Same transition as CV/Portfolio modals                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// Goals:
// - Clicking "Contact" (and inline "Let's chat.") opens a modal overlay
// - Modal uses the same logo ↔ modal swap transition as CV/Portfolio
// - Email row copies the email to clipboard (no mailto)
// - Modal includes a small BACK button (arrow + BACK) to close
//
// Privacy:
// - No network calls
// - No user text stored (clipboard copy is a single fixed string)


const TRANSITION_MS = 1700; // Must match modal transitions defined in main.css
const COPY_FEEDBACK_MS = 3000;

async function copyToClipboard(text) {
  // Preferred API (secure contexts)
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // Fall through to legacy fallback
  }

  // Legacy fallback (best-effort)
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', 'true');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand?.('copy') === true;
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

function initContactModal() {
  const CONTACT_EMAIL = getText('contact.email', 'alexander@beck.fyi');
  const BACK_TEXT = getText('gates.common.backText', 'BACK');
  const BACK_ARIA = getText('gates.common.backAriaLabel', 'Back');
  const TITLE = getText('gates.contact.title', 'Contact');
  const DESC = getText(
    'gates.contact.description',
    'For collaborations, product design work, AI prototyping, or anything that needs a crisp creative + technical brain. For job opportunities, drop me a note.'
  );
  const COPY_ARIA = getText('contact.copy.buttonAriaLabel', 'Copy email address');
  const COPIED_TEXT = getText('contact.copy.statusCopied', 'Copied');
  const ERROR_TEXT = getText('contact.copy.statusError', 'Copy failed');

  const triggers = [
    document.getElementById('contact-email'),
    document.getElementById('contact-email-inline')
  ].filter(Boolean);

  const logo = document.getElementById('brand-logo');
  const modal = document.getElementById('contact-modal');
  const modalLabel = document.getElementById('contact-modal-label');
  const modalInputs = document.getElementById('contact-modal-inputs');

  const cvGate = document.getElementById('cv-modal');
  const portfolioGate = document.getElementById('portfolio-modal');

  if (!triggers.length || !modal || !modalLabel || !modalInputs) {
    console.warn('Contact Gate: Missing required elements');
    return;
  }
  
  // Logo is optional (not present on CV page)

  // Idempotency check: prevent duplicate listeners if initialized multiple times
  if (modal.dataset.modalInitialized === 'true') return;
  modal.dataset.modalInitialized = 'true';

  // Match CV/Portfolio structure:
  // - modalLabel: back + title + description (fades in with slight delay)
  // - modalInputs: “field” row (arrives with the modal transition like the digit inputs)
  modalLabel.innerHTML = `
    <div class="modal-nav">
      <button type="button" class="gate-back abs-icon-btn" data-modal-back aria-label="${BACK_ARIA}">
        <i class="ti ti-arrow-left" aria-hidden="true"></i>
        <span>${BACK_TEXT}</span>
      </button>
    </div>
    <h2 class="modal-title">${TITLE}</h2>
    <p class="modal-description">
      ${DESC}
    </p>
  `;

  modalInputs.innerHTML = `
    <button type="button" class="contact-email-row" data-copy-email aria-label="${COPY_ARIA}">
      <span class="contact-email-text">${CONTACT_EMAIL}</span>
      <span class="contact-email-copy" data-copy-icon-container>
        <i class="ti ti-copy" aria-hidden="true"></i>
      </span>
    </button>
    <div class="contact-copy-status" data-copy-status aria-live="polite"></div>
  `;

  const backBtn = modalLabel.querySelector('[data-modal-back]');
  const emailRowBtn = modalInputs.querySelector('[data-copy-email]');
  modalInputs.querySelector('[data-copy-icon-container]');
  const statusEl = modalInputs.querySelector('[data-copy-status]');
  const iconI = modalInputs.querySelector('.contact-email-copy i');

  // State
  let isOpen = false;
  let copyTimer = null;

  // Helper to check if any modal is currently active
  const isAnyGateActive = () => {
    return (modal && modal.classList.contains('active')) ||
           (cvGate && cvGate.classList.contains('active')) ||
           (portfolioGate && portfolioGate.classList.contains('active'));
  };

  const setCopyUI = (state) => {
    if (!emailRowBtn || !statusEl) return;
    if (copyTimer) window.clearTimeout(copyTimer);

    if (state === 'copied') {
      emailRowBtn.classList.add('is-copied');
      emailRowBtn.classList.remove('is-error');
      statusEl.textContent = COPIED_TEXT;
      if (iconI) {
        iconI.className = 'ti ti-check';
        iconI.parentElement.classList.add('is-active'); // For pop up
      }
      copyTimer = window.setTimeout(() => setCopyUI('idle'), COPY_FEEDBACK_MS);
      return;
    }

    if (state === 'error') {
      emailRowBtn.classList.add('is-error');
      emailRowBtn.classList.remove('is-copied');
      statusEl.textContent = ERROR_TEXT;
      if (iconI) {
        iconI.className = 'ti ti-alert-triangle';
        iconI.parentElement.classList.add('is-active');
      }
      copyTimer = window.setTimeout(() => setCopyUI('idle'), COPY_FEEDBACK_MS);
      return;
    }

    // idle
    emailRowBtn.classList.remove('is-copied', 'is-error');
    statusEl.textContent = '';
    if (iconI) {
      iconI.className = 'ti ti-copy';
      iconI.parentElement.classList.remove('is-active');
    }
  };

  const openGate = (e) => {
    e?.preventDefault?.();

    // Check if any other modal is currently open
    const wasAnyGateActive = isAnyGateActive();

    // Close other modals if open (match existing behavior)
    if (cvGate && cvGate.classList.contains('active')) {
      cvGate.classList.remove('active');
      cvGate.setAttribute('aria-hidden', 'true');
      setTimeout(() => {
        cvGate.classList.add('hidden');
        unmountModalFromOverlay(cvGate);
      }, TRANSITION_MS);
    }
    if (portfolioGate && portfolioGate.classList.contains('active')) {
      portfolioGate.classList.remove('active');
      portfolioGate.setAttribute('aria-hidden', 'true');
      setTimeout(() => {
        portfolioGate.classList.add('hidden');
        unmountModalFromOverlay(portfolioGate);
      }, TRANSITION_MS);
    }

    isOpen = true;
    
    // Show overlay only if no modal was previously active
    if (!wasAnyGateActive) {
      showOverlay();
    }
    setCopyUI('idle');

    // Animate Logo Out (Up) - optional on pages without logo
    if (logo) {
      logo.classList.add('fade-out-up');
    }
    
    // Fade out CV content on CV page
    const cvContainer = document.querySelector('.cv-scroll-container');
    if (cvContainer) {
      cvContainer.classList.add('fade-out-up');
    }

    // Defer modal DOM operations to next frame to avoid interrupting overlay's backdrop-filter transition
    requestAnimationFrame(() => {
      // Modal: mount modal inside overlay flex container
      mountModalIntoOverlay(modal);

      // Animate Modal In (Up)
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('active');

      // Focus email button for keyboard users
      emailRowBtn?.focus?.();
    });
  };

  const closeGate = (instant = false) => {
    // Close must be responsive immediately (Back/background/Escape).
    // Any “ghost click” prevention should be handled via pointer routing, not time blocks.
    isOpen = false;
    setCopyUI('idle');

    if (instant) {
      // Instant close: disable transition, remove active, then re-enable
      modal.style.transition = 'none';
      if (logo) {
        logo.style.transition = 'none';
      }

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
      modal.classList.add('hidden');
      unmountModalFromOverlay(modal);
      if (logo) {
        logo.classList.remove('fade-out-up');
      }
      
      // Fade CV content back in on CV page
      const cvContainer = document.querySelector('.cv-scroll-container');
      if (cvContainer) {
        cvContainer.classList.remove('fade-out-up');
      }
      
      // Hide overlay immediately if no other modal is active
      if (!isAnyGateActive()) {
        hideOverlay();
      }
      
      // Re-enable transitions after a frame
      requestAnimationFrame(() => {
        modal.style.removeProperty('transition');
        if (logo) {
          logo.style.removeProperty('transition');
        }
      });
    } else {
      // Smooth close: use CSS transition
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      if (logo) {
        logo.classList.remove('fade-out-up');
      }
      
      // Fade CV content back in on CV page
      const cvContainer = document.querySelector('.cv-scroll-container');
      if (cvContainer) {
        cvContainer.classList.remove('fade-out-up');
      }

      // Hide overlay immediately to animate blur in parallel with content
      if (!isAnyGateActive()) {
        hideOverlay();
      }

      setTimeout(() => {
        if (!isOpen) {
          modal.classList.add('hidden');
          unmountModalFromOverlay(modal);
        }
      }, TRANSITION_MS);
    }
  };

  // Triggers
  // Capture phase so we win against any legacy exported interactions on these links.
  triggers.forEach((t) => t.addEventListener('click', openGate, { capture: true }));
  backBtn?.addEventListener('click', () => closeGate(false));
  
  // Click on modal background (not on buttons) also closes instantly
  modal.addEventListener('click', (e) => {
    // Only close if clicking the modal container itself or non-interactive areas
    if (e.target === modal || e.target.classList.contains('modal-label') || 
        e.target.classList.contains('modal-description') || e.target.tagName === 'H2' ||
        e.target.tagName === 'P') {
      closeGate(false);
    }
  });

  // Copy interaction
  const onCopy = async (e) => {
    const ok = await copyToClipboard(CONTACT_EMAIL);
    
    if (ok) {
      // Trigger pulse animation
      emailRowBtn.classList.remove('pulse-energy');
      emailRowBtn.classList.add('pulse-energy');
      
      // Cleanup class after animation
      setTimeout(() => {
        emailRowBtn.classList.remove('pulse-energy');
      }, 800);
    }
    
    setCopyUI(ok ? 'copied' : 'error');
  };
  emailRowBtn?.addEventListener('click', onCopy);

  // Escape closes (consistent with other modals)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeGate();
  });
  
  // Close when overlay is clicked (dismiss event from modal-overlay.js)
  document.addEventListener('modal-overlay-dismiss', (e) => {
    if (isOpen) {
      const instant = e.detail?.instant || false;
      closeGate(instant);
    }
  });

  // Allow other pages (e.g. portfolio) to route via index and auto-open Contact modal.
  try {
    if (sessionStorage.getItem('abs_open_contact_modal')) {
      sessionStorage.removeItem('abs_open_contact_modal');
      // Defer one frame so other init steps (overlay, layout) are fully settled.
      requestAnimationFrame(() => openGate());
    }
  } catch (e) {}
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
let tooltipElement = null;
let tooltipTimeout = null;

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
  buttonElement.className = 'sound-toggle abs-icon-btn';
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
  // Fallback: append to #app-frame so it fades with other content.
  const fadeContent = document.getElementById('app-frame');
  const topSlot = document.getElementById('sound-toggle-slot');
  const soundRow = document.getElementById('top-elements-soundRow');
  const socialLinks = document.getElementById('social-links');
  const footerMeta = document.querySelector('.ui-meta-right'); // New slot
  const canMountInTopSlot = !!topSlot;
  const canMountInSocialLinks = socialLinks && (!fadeContent || fadeContent.contains(socialLinks));
  const prefersMobileFullWidth =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 600px)').matches;
  
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
      const mq = window.matchMedia('(max-width: 600px)');
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
    updateButtonState(!!(state.isUnlocked && state.isEnabled));
  } catch (e) {}

  // Stay in sync with panel toggles
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener(SOUND_STATE_EVENT, (e) => {
      const s = e && e.detail ? e.detail : null;
      if (s) {
        updateButtonState(!!(s.isUnlocked && s.isEnabled));
        // Hide tooltip if sound is enabled
        if (s.isUnlocked && s.isEnabled) {
          hideSoundTooltip();
        }
      }
    });
  }

  // Create and schedule tooltip
  createSoundTooltip();

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
      hideSoundTooltip();
    } else {
      // Failed to unlock - show error state briefly, then revert
      if (buttonElement) {
        buttonElement.innerHTML = ICON_SOUND_OFF;
        buttonElement.setAttribute('aria-label', 'Audio unavailable');
        buttonElement.title = 'Audio unavailable';
      }
      setTimeout(() => {
        updateButtonState(false);
      }, 2000);
    }
  } else {
    // Subsequent clicks: toggle on/off
    const newState = toggleSound();
    updateButtonState(newState);
    if (newState) {
      hideSoundTooltip();
    }
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
  buttonElement.setAttribute('aria-label', enabled ? 'Sound on' : 'Sound off');
  buttonElement.title = enabled ? 'Sound on' : 'Sound off';
  buttonElement.innerHTML = enabled ? ICON_SOUND_ON : ICON_SOUND_OFF;
}

/**
 * Create tooltip that appears after 5s if sound isn't enabled
 */
function createSoundTooltip() {
  if (!buttonElement) return;

  // Check if sound is already enabled - don't show tooltip
  const state = getSoundState();
  if (state.isUnlocked && state.isEnabled) {
    return;
  }

  // Create tooltip element
  tooltipElement = document.createElement('div');
  tooltipElement.className = 'sound-tooltip';
  tooltipElement.setAttribute('role', 'tooltip');
  tooltipElement.setAttribute('aria-hidden', 'true');
  
  // Tooltip content
  tooltipElement.innerHTML = `<span class="sound-tooltip-text">Try sound on?</span>`;

  // Append to same parent as button (or body as fallback) BEFORE positioning
  const parent = buttonElement.parentElement || document.body;
  parent.appendChild(tooltipElement);

  // Position relative to button (after appending so we can measure width)
  updateTooltipPosition();

  // Schedule appearance after 7.6 seconds
  tooltipTimeout = setTimeout(() => {
    if (tooltipElement) {
      // Double-check sound still isn't enabled
      const currentState = getSoundState();
      if (!(currentState.isUnlocked && currentState.isEnabled)) {
        // Update position with accurate width before showing
        updateTooltipPosition();
        tooltipElement.classList.add('sound-tooltip--visible');
        tooltipElement.setAttribute('aria-hidden', 'false');
      }
    }
  }, 7600);

  // Hide on interaction with button
  buttonElement.addEventListener('mouseenter', hideSoundTooltip);
  buttonElement.addEventListener('focus', hideSoundTooltip);
  buttonElement.addEventListener('click', hideSoundTooltip);

  // Update position on resize
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('resize', updateTooltipPosition);
  }
}

/**
 * Update tooltip position to point at button
 * Arrow peak should be directly below sound icon center at all times
 * Tooltip box extends right from the arrow position (10% of box width to left of arrow)
 * Uses fixed positioning so coordinates are always relative to viewport
 */
function updateTooltipPosition() {
  if (!tooltipElement || !buttonElement) return;

  // Get button position in viewport coordinates
  const buttonRect = buttonElement.getBoundingClientRect();
  const buttonCenterX = buttonRect.left + (buttonRect.width / 2);
  const buttonBottomY = buttonRect.bottom;
  
  // Ensure we have valid button coordinates
  if (!buttonRect.width || !buttonRect.height) {
    console.warn('Sound tooltip: Button rect not available, skipping position update');
    return;
  }

  // Force layout to get accurate tooltip width
  // Position off-screen temporarily for accurate measurement
  tooltipElement.style.position = 'fixed';
  tooltipElement.style.left = '-9999px';
  tooltipElement.style.top = '-9999px';
  tooltipElement.style.visibility = 'visible';
  tooltipElement.style.opacity = '0'; // Invisible but still laid out
  
  // Get accurate width now that it's fully laid out
  const tooltipBoxWidth = tooltipElement.offsetWidth || 120;

  // Check if mobile (same breakpoint as CSS)
  const isMobile = typeof window !== 'undefined' && 
                   typeof window.matchMedia === 'function' &&
                   window.matchMedia('(max-width: 600px)').matches;

  let tooltipLeft;
  if (isMobile) {
    // On mobile: center the tooltip at button center X
    // CSS will use transform: translateX(-50%) to center it
    tooltipLeft = buttonCenterX;
  } else {
    // Desktop: Arrow positioned at 82% from left (18% from right) of tooltip box
    // This means 82% of box is to the left of arrow, 18% to the right
    // The arrow peak (left edge of the 0-width triangle) must be at button center X
    // Calculation: tooltipLeft + (tooltipBoxWidth * 0.82) = buttonCenterX
    // Therefore: tooltipLeft = buttonCenterX - (tooltipBoxWidth * 0.82)
    tooltipLeft = buttonCenterX - (tooltipBoxWidth * 0.82);
  }
  
  const tooltipTop = buttonBottomY + 12; // 12px gap below button

  // Restore visibility
  tooltipElement.style.opacity = '';
  
  // Apply position in viewport coordinates (fixed positioning)
  tooltipElement.style.left = `${tooltipLeft}px`;
  tooltipElement.style.top = `${tooltipTop}px`;
}

/**
 * Hide and remove tooltip
 */
function hideSoundTooltip() {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }

  if (tooltipElement) {
    tooltipElement.classList.remove('sound-tooltip--visible');
    tooltipElement.setAttribute('aria-hidden', 'true');
    
    // Remove after fade-out animation completes
    setTimeout(() => {
      if (tooltipElement && tooltipElement.parentElement) {
        tooltipElement.parentElement.removeChild(tooltipElement);
      }
      tooltipElement = null;
    }, 300); // Match CSS transition duration
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           SOCIAL ICONS UPGRADE                               ║
// ║      Replace exported icons with a self-hosted icon font                     ║
// ║                 (no inline SVGs in the DOM)                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const ICON_BY_LABEL = new Map([
  ['apple music', '<i class="ti ti-brand-apple" aria-hidden="true"></i>'],
  ['instagram', '<i class="ti ti-brand-instagram" aria-hidden="true"></i>'],
  ['linkedin', '<i class="ti ti-brand-linkedin" aria-hidden="true"></i>'],
  ['x', '<i class="ti ti-brand-x" aria-hidden="true"></i>'],
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
 * Clicking the time toggles between light/dark mode.
 */
function initTimeDisplay() {
  const timeDisplay = document.getElementById('time-display');
  const siteYear = document.getElementById('site-year');
  if (!timeDisplay) return;

  // Prebuild formatter so we avoid reallocating inside the interval.
  const formatTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  function updateTime() {
    const now = new Date();
    timeDisplay.textContent = formatTime.format(now).toUpperCase();
  }

  // Update immediately
  updateTime();

  // Update every second to keep display current without extra work.
  setInterval(updateTime, 1000);

  // Click on time element toggles dark/light mode
  if (siteYear) {
    siteYear.addEventListener('click', toggleDarkMode);
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                     LINK HOVER — CURSOR HIDE SYSTEM                          ║
// ║  Minimal hover detection: hides custom cursor when over interactive elements ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


let isInitialized = false;
const HOVER_CLASS = 'abs-link-hovering';

function isEventOnPanelUI(target) {
  if (!target || !target.closest) return false;
  return Boolean(
    target.closest('#panelDock') ||
    target.closest('#masterPanel') ||
    target.closest('#dockToggle') ||
    target.closest('.panel-dock') ||
    target.closest('.panel')
  );
}

function getNearestAction(target) {
  if (!target || !target.closest) return null;
  const el = target.closest('a, button, [role="button"]');
  if (!el) return null;

  // Exclude portfolio carousel slides
  try {
    if (el.classList?.contains?.('slide')) return null;
    if (el.closest?.('.slide')) return null;
  } catch (e) {}

  return el;
}

function onPointerOver(e) {
  const link = getNearestAction(e.target);
  if (!link || isEventOnPanelUI(link)) return;
  
  try {
    document.body.classList.add(HOVER_CLASS);
    playHoverSound();
  } catch (e) {}
}

function onPointerOut(e) {
  const link = getNearestAction(e.target);
  if (!link) return;

  const to = e.relatedTarget;
  if (to && link.contains(to)) return; // Still within same link

  try {
    document.body.classList.remove(HOVER_CLASS);
  } catch (e) {}
}

function initLinkCursorHop() {
  if (isInitialized) return;
  isInitialized = true;

  // Clean baseline
  try {
    document.body.classList.remove(HOVER_CLASS);
  } catch (e) {}

  // Pointer events
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);

  // Mouse fallback for older browsers
  if (!window.PointerEvent) {
    document.addEventListener('mouseover', onPointerOver, true);
    document.addEventListener('mouseout', onPointerOut, true);
  }

  // Cleanup on blur
  window.addEventListener('blur', () => {
    try {
      document.body.classList.remove(HOVER_CLASS);
    } catch (e) {}
  }, { passive: true });

  // Cleanup when mouse leaves viewport
  window.addEventListener(
    'mouseout',
    (event) => {
      if (!event.relatedTarget && !event.toElement) {
        try {
          document.body.classList.remove(HOVER_CLASS);
        } catch (e) {}
      }
    },
    { passive: true }
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           APPLY RUNTIME TEXT (DOM)                            ║
// ║  Single source of truth: source/config/contents-home.json → window.__TEXT__   ║
// ║     Goal: apply ALL user-facing copy before fade-in (no pop-in)               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


function setText(el, text) {
  if (!el) return;
  el.textContent = String(text ?? '');
}

function setAttr(el, name, value) {
  if (!el) return;
  if (value === undefined || value === null) return;
  try {
    el.setAttribute(name, String(value));
  } catch (e) {}
}

function applyMeta() {
  const title = getText('meta.title', '');
  if (title) document.title = title;

  const description = getText('meta.description', '');
  if (description) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);
  }
}

function applyEdge() {
  const taglineEl = document.getElementById('edge-caption-tagline');
  const tagline = getText('edge.tagline', getText('edge.copyright', ''));
  setText(taglineEl, tagline);
}

function applyLegend() {
  const nav = document.getElementById('expertise-legend');
  setAttr(nav, 'aria-label', getText('legend.ariaLabel', ''));

  const items = getText('legend.items', null);
  if (!Array.isArray(items) || !nav) return;

  const itemEls = nav.querySelectorAll('.legend__item');
  for (let i = 0; i < itemEls.length && i < items.length; i++) {
    const itemEl = itemEls[i];
    const label = items?.[i]?.label;
    const tooltip = items?.[i]?.tooltip;
    const colorClass = items?.[i]?.colorClass;

    const labelSpan = itemEl.querySelector('span');
    if (label && labelSpan) labelSpan.textContent = label;

    // Tooltips are driven by the data-tooltip attribute (used by legend-interactive.js).
    if (tooltip) itemEl.setAttribute('data-tooltip', tooltip);

    // Keep the legend dot color in sync with config (fallback HTML should still match).
    if (colorClass) {
      const dot = itemEl.querySelector('.circle');
      if (dot) {
        // Remove any existing bg-ball-* classes, then apply the configured one.
        const next = [];
        for (const cls of String(dot.className || '').split(/\s+/).filter(Boolean)) {
          if (!cls.startsWith('bg-ball-')) next.push(cls);
        }
        next.push(colorClass);
        dot.className = next.join(' ');
      }
    }
  }
}

function applyPhilosophy() {
  // Only apply on pages that actually include the decorative-script block (index).
  const p = document.querySelector('.decorative-script p');
  if (!p) return;

  const before = getText('philosophy.textBeforeLink', '');
  const linkId = getText('philosophy.link.id', 'contact-email-inline') || 'contact-email-inline';
  const linkHref = getText('philosophy.link.href', '#') || '#';
  const linkText = getText('philosophy.link.text', '') || '';

  let link = document.getElementById(linkId);
  if (!link) link = p.querySelector('a');
  if (!link) return;

  // Ensure correct id/href/text
  link.id = linkId;
  link.setAttribute('href', linkHref);
  link.textContent = linkText;

  // Ensure the text before the link is a single text node directly before the <a>
  const prev = link.previousSibling;
  if (prev && prev.nodeType === Node.TEXT_NODE) {
    prev.nodeValue = before;
  } else {
    p.insertBefore(document.createTextNode(before), link);
  }

  // Remove stray text nodes after link to avoid drift.
  const next = link.nextSibling;
  if (next && next.nodeType === Node.TEXT_NODE) {
    next.nodeValue = '';
  }
}

function applyFooter() {
  const nav = document.getElementById('main-links');
  setAttr(nav, 'aria-label', getText('footer.navAriaLabel', ''));

  const links = getText('footer.links', null);
  if (!links || typeof links !== 'object') return;

  for (const key of ['contact', 'portfolio', 'cv']) {
    const entry = links?.[key];
    if (!entry) continue;
    const el = document.getElementById(entry.id || '');
    if (!el) continue;
    if (entry.href) el.setAttribute('href', entry.href);
    if (entry.text) el.textContent = entry.text;
  }
}

function applySocials() {
  const ul = document.getElementById('social-links');
  setAttr(ul, 'aria-label', getText('socials.ariaLabel', ''));

  const items = getText('socials.items', null);
  if (!ul || !items || typeof items !== 'object') return;

  const order = ['appleMusic', 'x', 'linkedin'];
  const anchors = ul.querySelectorAll('a.footer_icon-link');

  for (let i = 0; i < anchors.length && i < order.length; i++) {
    const a = anchors[i];
    const cfg = items?.[order[i]];
    if (!cfg) continue;
    if (cfg.url) a.setAttribute('href', cfg.url);
    if (cfg.ariaLabel) a.setAttribute('aria-label', cfg.ariaLabel);

    const sr = a.querySelector('.screen-reader');
    if (sr && cfg.screenReaderText) sr.textContent = cfg.screenReaderText;
  }
}

function applyHeaderCvLink() {
  // Reuse footer.links.cv as the single source of truth for the Bio/CV label + href.
  const link = document.getElementById('header-cv-link');
  if (!link) return;

  const entry = getText('footer.links.cv', null);
  if (!entry || typeof entry !== 'object') return;

  if (entry.href) link.setAttribute('href', entry.href);
  if (entry.text) link.textContent = entry.text;
}

function applyPortfolioBlurb() {
  // Only applies on portfolio UI pages.
  const p = document.querySelector('[data-portfolio-ui] .decorative-script p');
  if (!p) return;
  const text = getText('portfolio.blurb', '');
  if (text) {
    p.textContent = text;
  }
}

/**
 * Apply runtime text to all user-facing DOM nodes.
 * Must be called AFTER `loadRuntimeText()` and BEFORE fade-in starts.
 */
function applyRuntimeTextToDOM() {
  try {
    applyMeta();
    applyEdge();
    applyLegend();
    applyPhilosophy();
    applyFooter();
    applySocials();
    applyHeaderCvLink();
    applyPortfolioBlurb();
  } catch (e) {
    // Never allow copy application to crash boot.
  }
}

// Shared runtime config loader for pages that need studio-level parameters.
// Keeps the fetch/inlined-config logic in one place for consistency.

async function loadRuntimeConfig() {
  try {
    // Production builds can inline config into HTML (hardcoded at build time).
    // This is the preferred path for production: no fetch, no runtime variability.
    try {
      if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__ && typeof window.__RUNTIME_CONFIG__ === 'object') {
        return window.__RUNTIME_CONFIG__;
      }
    } catch (e) {}

    const paths = [
      'config/default-config.json',
      '../config/default-config.json',
      'js/config.json',
      '../js/config.json',
      '../dist/js/config.json'
    ];
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

const DEFAULT_FONT_FACES = [
  '1em "Geist"',
  '1em "Geist Mono"',
  '1em "Sarina"',
  '1em "tabler-icons"',
];

async function waitForFonts({ timeoutMs = 4000, fontFaces = DEFAULT_FONT_FACES } = {}) {
  const root = document.documentElement;
  if (root) root.classList.add('fonts-loading');

  if (!document.fonts || !document.fonts.ready) {
    if (root) root.classList.remove('fonts-loading');
    return false;
  }

  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = window.setTimeout(() => resolve(false), timeoutMs);
  });

  const loadPromise = Promise.all(
    fontFaces.map((face) => document.fonts.load(face).catch(() => null))
  )
    .then(() => document.fonts.ready)
    .then(() => true)
    .catch(() => false);

  const loaded = await Promise.race([loadPromise, timeoutPromise]);

  if (timeoutId) window.clearTimeout(timeoutId);
  if (root) root.classList.remove('fonts-loading');

  return loaded;
}

// Wall frame helpers shared across pages.
// Applies the studio "wall" layout variables from the runtime config without booting the simulation.


function syncWallFrameColors(config) {
  const root = document.documentElement;

  // Brand logo sizing (shared across pages).
  if (config.topLogoWidthVw !== undefined) {
    root.style.setProperty('--top-logo-width-vw', String(config.topLogoWidthVw));
  }

  // Backgrounds (inner surface uses --bg-light / --bg-dark like the studio index).
  if (config.bgLight) {
    root.style.setProperty('--bg-light', config.bgLight);
    root.style.setProperty('--chrome-bg-light', config.bgLight);
  }
  if (config.bgDark) {
    root.style.setProperty('--bg-dark', config.bgDark);
    root.style.setProperty('--chrome-bg-dark', config.bgDark);
  }

  // Frame colors: separate light and dark mode wall colors
  // --wall-color-light and --wall-color-dark point to frameColorLight/frameColorDark via CSS tokens
  // Always set both light and dark colors (use frameColor as fallback if separate values not provided)
  const frameLight = config.frameColorLight || config.frameColor;
  const frameDark = config.frameColorDark || config.frameColor;
  if (frameLight) {
    root.style.setProperty('--frame-color-light', frameLight);
  }
  if (frameDark) {
    root.style.setProperty('--frame-color-dark', frameDark);
  }
  // Wall colors automatically point to frameColor via CSS (--wall-color-light: var(--frame-color-light))
}

function applyWallFrameFromConfig(config) {
  if (!config) return;

  // Seed layout + mobile logic from the shared config/state system.
  initState(config);
  syncWallFrameColors(config);
  applyWallFrameLayout();
}

function applyWallFrameLayout() {
  // Keep vw-based layout vars synced to the current viewport.
  try { detectResponsiveScale(); } catch (e) {}
  try { applyLayoutFromVwToPx(); } catch (e) {}
  try { applyLayoutCSSVars(); } catch (e) {}
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      SHARED CHROME INITIALIZATION BUNDLE                     ║
// ║  Centralizes common UI initialization across all pages (index, portfolio, CV) ║
// ║      Each page calls this with a config object specifying features to enable  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


/**
 * Initialize shared chrome features across pages
 * @param {Object} options - Configuration object
 * @param {boolean} options.contactModal - Initialize contact modal
 * @param {boolean} options.cvModal - Initialize CV modal
 * @param {boolean} options.portfolioModal - Initialize portfolio modal
 * @param {boolean} options.cursorHiding - Initialize cursor hiding system
 * @param {Object} options.modalOverlayConfig - Config object for modal overlay
 */
function initSharedChrome(options = {}) {
  const {
    contactModal = false,
    cvModal = false,
    portfolioModal = false,
    cursorHiding = true,
    modalOverlayConfig = {}
  } = options;

  // Modal overlay (required for any modal)
  if (contactModal || cvModal || portfolioModal) {
    try {
      initModalOverlay(modalOverlayConfig);
    } catch (e) {
      console.warn('Failed to initialize modal overlay:', e);
    }
  }

  // Individual modals
  if (contactModal) {
    try {
      initContactModal();
    } catch (e) {
      console.warn('Failed to initialize contact modal:', e);
    }
  }

  if (cvModal) {
    try {
      initCVModal();
    } catch (e) {
      console.warn('Failed to initialize CV modal:', e);
    }
  }

  if (portfolioModal) {
    try {
      initPortfolioModal();
    } catch (e) {
      console.warn('Failed to initialize portfolio modal:', e);
    }
  }

  // Cursor hiding system (enabled by default)
  if (cursorHiding) {
    try {
      initLinkCursorHop();
    } catch (e) {
      console.warn('Failed to initialize cursor hiding:', e);
    }
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    ENTRANCE ANIMATION SYSTEM                                 ║
// ║        Orchestrates dramatic page entrance: browser default → wall-state   ║
// ║        Elements fade in with 3D perspective (scale + z-axis movement)      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


/**
 * Detects aspect ratio category (landscape, square, portrait)
 * Returns the category string for CSS class application
 */
function detectAspectRatioCategory() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = width / height;
  
  if (ratio > 1.1) return 'landscape';
  if (ratio < 0.9) return 'portrait';
  return 'square';
}

/**
 * Applies aspect ratio class to html element for CSS perspective targeting
 */
function applyAspectRatioClass() {
  const category = detectAspectRatioCategory();
  document.documentElement.classList.remove('aspect-landscape', 'aspect-square', 'aspect-portrait');
  document.documentElement.classList.add(`aspect-${category}`);
  
  // Update on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const newCategory = detectAspectRatioCategory();
      if (newCategory !== category) {
        document.documentElement.classList.remove('aspect-landscape', 'aspect-square', 'aspect-portrait');
        document.documentElement.classList.add(`aspect-${newCategory}`);
      }
    }, 150);
  });
}

/**
 * Gets perspective value based on aspect ratio and config
 */
function getPerspectiveValue() {
  const g = getGlobals();
  const category = detectAspectRatioCategory();
  
  switch (category) {
    case 'landscape':
      return g.entrancePerspectiveLandscape || 1200;
    case 'portrait':
      return g.entrancePerspectivePortrait || 800;
    case 'square':
    default:
      return g.entrancePerspectiveSquare || 1000;
  }
}

/**
 * Applies perspective CSS variable to root
 */
function applyPerspectiveCSS() {
  const perspective = getPerspectiveValue();
  document.documentElement.style.setProperty('--entrance-perspective', `${perspective}px`);
}

/**
 * Sets initial browser-default state
 * Page starts looking like a normal browser page (white background, default styling)
 * 
 * NOTE: Wall color is NOT set here - it's already set by the critical inline script
 * in <head> which runs before CSS loads. Manipulating wall color here would cause
 * flashing by fighting with the early script. Trust the early script to have set
 * the correct theme-aware background.
 */
function setInitialBrowserDefaultState() {
  const html = document.documentElement;
  
  // Hide all custom-styled elements initially (entrance animation will reveal them)
  html.classList.add('entrance-pre-transition');
}

/**
 * Transitions from browser default to wall-state
 * Wall "grows" from beyond the viewport with synchronized scale and corner rounding
 * 
 * NOTE: Wall color is controlled by the early inline script and CSS tokens.
 * This function only manages the wall ANIMATION (scale + border-radius),
 * not the color transitions.
 */
function transitionToWallState() {
  const g = getGlobals();
  const html = document.documentElement;
  const delay = g.entranceWallTransitionDelay || 300;
  const duration = g.entranceWallTransitionDuration || 800;
  
  // Get the wall container (#bravia-balls)
  const wallContainer = document.getElementById('bravia-balls');
  if (!wallContainer) {
    console.warn('⚠️ #bravia-balls not found, falling back to simple transition');
    setTimeout(() => {
      html.classList.remove('entrance-pre-transition');
      html.classList.add('entrance-transitioning');
      setTimeout(() => {
        html.classList.remove('entrance-transitioning');
        html.classList.add('entrance-complete');
      }, duration);
    }, delay);
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 1: LOCK VALUES (prevent CSS variable interference)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Read final border-radius from state (source of truth, stable value)
  // Simulation page: always use 0 (radius controlled entirely by rubber wall system)
  // Portfolio page: use wallRadius if available
  const isPortfolioPage = document.body.classList.contains('portfolio-page');
  const finalRadius = isPortfolioPage 
    ? ((g.wallRadius && typeof g.wallRadius === 'number' && g.wallRadius > 0) 
        ? `${g.wallRadius}px` 
        : '42px')
    : '0px'; // Simulation page: no CSS border-radius, rubber wall controls visual radius
  
  // Initial scale (1.1 = subtle growth effect, not too dramatic)
  const initialScale = g.entranceWallInitialScale || 1.1;
  
  // Animation easing
  const easing = g.entranceWallEasing || 'cubic-bezier(0.16, 1, 0.3, 1)';
  
  // Store original transition to restore after animation
  const originalTransition = wallContainer.style.transition;
  
  setTimeout(() => {
    // ═══════════════════════════════════════════════════════════════════════════════
    // PHASE 2: REVEAL (remove browser default class, show wall)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    html.classList.remove('entrance-pre-transition');
    html.classList.add('entrance-transitioning');
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PHASE 3: SET INITIAL STATE (no transitions, instant values)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Disable ALL CSS transitions to prevent conflicts
    wallContainer.style.transition = 'none';
    
    // Set starting state:
    // - Scale: 1.1 (slightly larger, will animate to 1.0)
    // - Border-radius: 0px (sharp corners, will animate to rounded)
    // - Opacity: 1 (fully visible, no fade)
    wallContainer.style.transform = `scale(${initialScale})`;
    wallContainer.style.transformOrigin = 'center center';
    wallContainer.style.borderRadius = '0px';
    wallContainer.style.opacity = '1';
    wallContainer.style.visibility = 'visible';
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PHASE 4: ANIMATE (synchronized scale and border-radius growth)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    if (typeof wallContainer.animate === 'function') {
      // Use Web Animations API (performant, no style conflicts)
      
      // Animation 1: Scale from 1.1 to 1.0 (wall grows into viewport)
      const scaleAnim = wallContainer.animate(
        [
          { transform: `scale(${initialScale})` },
          { transform: 'scale(1)' }
        ],
        {
          duration,
          easing,
          fill: 'forwards'
        }
      );
      
      // Animation 2: Border-radius from 0 to final (corners grow out)
      const radiusAnim = wallContainer.animate(
        [
          { borderRadius: '0px' },
          { borderRadius: finalRadius }
        ],
        {
          duration,
          easing,
          fill: 'forwards'
        }
      );
      
      // ═══════════════════════════════════════════════════════════════════════════════
      // PHASE 5: CLEANUP (lock final values, restore normal behavior)
      // ═══════════════════════════════════════════════════════════════════════════════
      
      let scaleComplete = false;
      let radiusComplete = false;
      
      const finishAnimation = () => {
        if (scaleComplete && radiusComplete) {
          // Lock final values with inline styles
          wallContainer.style.transform = 'scale(1)';
          wallContainer.style.borderRadius = finalRadius;
          wallContainer.style.opacity = '1';
          
          // Brief delay before restoring transitions (allows animation to settle)
          setTimeout(() => {
            wallContainer.style.transition = originalTransition || '';
            html.classList.remove('entrance-transitioning');
            html.classList.add('entrance-complete');
          }, 50);
        }
      };
      
      scaleAnim.addEventListener('finish', () => {
        scaleComplete = true;
        finishAnimation();
      });
      
      scaleAnim.addEventListener('cancel', () => {
        scaleComplete = true;
        finishAnimation();
      });
      
      radiusAnim.addEventListener('finish', () => {
        radiusComplete = true;
        finishAnimation();
      });
      
      radiusAnim.addEventListener('cancel', () => {
        radiusComplete = true;
        finishAnimation();
      });
      
    } else {
      // Fallback: CSS transitions (for browsers without WAAPI)
      requestAnimationFrame(() => {
        wallContainer.style.transition = `transform ${duration}ms ${easing}, border-radius ${duration}ms ${easing}`;
        requestAnimationFrame(() => {
          wallContainer.style.transform = 'scale(1)';
          wallContainer.style.borderRadius = finalRadius;
        });
      });
      
      setTimeout(() => {
        wallContainer.style.transition = originalTransition || '';
        html.classList.remove('entrance-transitioning');
        html.classList.add('entrance-complete');
      }, duration + 50);
    }
  }, delay);
}

/**
 * Reveals a late element by clearing its inline hidden styles and optionally animating
 * @param {HTMLElement} element - Element to reveal
 * @param {Object} options - Animation options
 *   - delay: ms before animation starts
 *   - duration: animation duration in ms
 *   - easing: CSS easing function
 *   - scaleFrom: starting scale (e.g. 0.9 = 90%)
 *   - scaleTo: ending scale (default 1)
 * @returns {Promise} Resolves when animation completes
 */
function revealLateElement(element, options = {}) {
  return new Promise((resolve) => {
    if (!element) {
      resolve();
      return;
    }
    
    const g = getGlobals();
    const delay = options.delay ?? 0;
    const duration = (options.duration ?? g.entranceLateElementDuration ?? 600) * 2;
    const easing = options.easing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
    
    setTimeout(() => {
      // Disable ALL transitions to prevent Safari flash
      element.style.transition = 'none';
      element.style.visibility = 'visible';
      
      // Animate with fill: forwards - never cancel, let it hold the final state
      const anim = element.animate(
        [
          { opacity: 0 },
          { opacity: 1 }
        ],
        { duration, easing, fill: 'forwards' }
      );
      
      // After animation finishes, set final state and re-enable transitions
      anim.finished.then(() => {
        // Set inline opacity to match animation end state
        element.style.opacity = '1';
        // Wait a frame before re-enabling transitions
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            element.style.removeProperty('transition');
            document.documentElement.classList.add('entrance-complete');
          });
        });
      }).catch(() => {});
      
      resolve();
    }, delay);
  });
}

/**
 * Reveals the brand logo with a soft blur/scale/translate intro.
 * Maintains the logo's base transform while animating in.
 * @param {HTMLElement} element - Logo element to reveal
 * @param {Object} options - Animation options
 *   - delay: ms before animation starts
 *   - duration: animation duration in ms
 *   - easing: CSS easing function
 * @returns {Promise} Resolves when animation completes
 */
function revealLogoStaggered(element, options = {}) {
  return new Promise((resolve) => {
    if (!element) {
      resolve();
      return;
    }

    const g = getGlobals();
    const delay = options.delay ?? 0;
    const duration = options.duration ?? g.entranceLateElementDuration ?? 600;
    const easing = options.easing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
    const baseScale = 'calc(var(--abs-scene-impact-logo-scale, 1) * var(--brand-logo-user-scale, 1))';
    const fromTransform = `translateY(calc(var(--brand-logo-offset-y) - var(--gap-xs))) scale(calc(${baseScale} * 0.96))`;
    const toTransform = `translateY(var(--brand-logo-offset-y)) scale(${baseScale})`;

    setTimeout(() => {
      element.style.transition = 'none';
      element.style.visibility = 'visible';

      const anim = element.animate(
        [
          {
            opacity: 0,
            transform: fromTransform,
            filter: 'blur(calc(var(--link-impact-blur) * 0.6))'
          },
          {
            opacity: 1,
            transform: toTransform,
            filter: 'blur(0px)'
          }
        ],
        { duration, easing, fill: 'forwards' }
      );

      anim.finished.then(() => {
        element.style.opacity = '1';
        element.style.filter = 'blur(0px)';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            element.style.removeProperty('transition');
            element.style.removeProperty('transform');
            element.style.removeProperty('filter');
            resolve();
          });
        });
      }).catch(() => {
        resolve();
      });
    }, delay);
  });
}

/**
 * Clears inline hidden styles from late elements (for reduced-motion / fallback paths)
 * Call this to ensure nothing stays stuck hidden
 * NOTE: Does NOT clear transform - elements may have CSS transforms (e.g. translateX(-50%))
 */
function revealAllLateElements() {
  const html = document.documentElement;
  const logo = document.getElementById('brand-logo');
  const mainLinks = document.getElementById('main-links');
  
  // Clear inline styles that hide elements (from HTML initial state)
  if (logo) {
    logo.style.removeProperty('opacity');
    logo.style.visibility = 'visible';
  }
  if (mainLinks) {
    mainLinks.style.removeProperty('opacity');
    mainLinks.style.visibility = 'visible';
  }
  
  // Set entered state - CSS will derive visibility
  html.classList.add('ui-entered');
  
  // Remove the fade-blocking style tag
  const fadeBlocking = document.getElementById('fade-blocking');
  if (fadeBlocking) fadeBlocking.remove();
}

/**
 * Simple 200ms fade-in for reduced motion users.
 * Shows content quickly without jarring instant appearance.
 */
function performReducedMotionFade() {
  const fadeTarget = document.getElementById('app-frame');
  const brandLogo = document.getElementById('brand-logo');
  const mainLinks = document.getElementById('main-links');
  const buttons = mainLinks ? Array.from(mainLinks.querySelectorAll('.footer_link')) : [];
  const html = document.documentElement;
  
  // Mark entrance as complete immediately
  html.classList.remove('entrance-pre-transition', 'entrance-transitioning');
  html.classList.add('entrance-complete');
  
  // Simple 200ms fade for all elements
  const elements = [fadeTarget, brandLogo, mainLinks, ...buttons].filter(Boolean);
  elements.forEach(el => {
    el.style.transition = 'opacity 200ms ease-out';
    el.style.opacity = '0';
    el.style.visibility = 'visible';
  });
  
  requestAnimationFrame(() => {
    elements.forEach(el => {
      el.style.opacity = '1';
    });
    
    // Cleanup after animation
    setTimeout(() => {
      elements.forEach(el => {
        el.style.removeProperty('transition');
        el.style.removeProperty('opacity');
        el.style.removeProperty('filter');
        el.style.removeProperty('transform');
      });
      
      // Remove fade-blocking
      const fadeBlocking = document.getElementById('fade-blocking');
      if (fadeBlocking) fadeBlocking.remove();
    }, 250);
  });
}

/**
 * Orchestrates the complete entrance sequence
 * @param {Object} options - Configuration options
 *   - waitForFonts: async function to wait for fonts
 *   - skipWallAnimation: boolean to skip wall growth animation
 *   - centralContent: array of selectors/elements for page-specific central content
 *   - reducedMotion: boolean to use simple 200ms fade (auto-detected if not provided)
 */
async function orchestrateEntrance(options = {}) {
  const g = getGlobals();
  const skipWallAnimation = Boolean(options.skipWallAnimation);
  const centralContent = options.centralContent || [];
  
  // Check for reduced motion preference
  const reducedMotion = options.reducedMotion ?? 
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  
  // Apply aspect ratio detection (always needed for layout)
  applyAspectRatioClass();
  applyPerspectiveCSS();
  
  // Wait for fonts to load
  if (options.waitForFonts) {
    await options.waitForFonts();
  }
  
  // Reduced motion: simple 200ms fade (not instant, not jarring)
  if (reducedMotion) {
    performReducedMotionFade();
    return;
  }
  
  // Set initial browser default state unless caller wants the wall already present
  if (!skipWallAnimation) {
    setInitialBrowserDefaultState();
  } else {
    document.documentElement.classList.remove('entrance-pre-transition', 'entrance-transitioning');
    document.documentElement.classList.add('entrance-complete');
  }
  
  // Start wall-state transition (optional)
  if (!skipWallAnimation) {
    transitionToWallState();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STAGED ELEMENT REVEAL SEQUENCE
  // Order: #abs-scene fade → #brand-logo → #main-links (buttons sequentially)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const elementEasing = g.entranceElementEasing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
  
  // Content fade-in config
  const contentFadeDelay = g.contentFadeInDelay ?? 500;
  const contentFadeDuration = g.contentFadeInDuration ?? 1000;
  
  // Logo and links timing
  const lateElementDuration = g.entranceLateElementDuration ?? 500;
  
  // 1. Fade in entire scene (#abs-scene)
  const fadeTarget = document.getElementById('abs-scene');
  if (fadeTarget) {
    const fadeBlocking = document.getElementById('fade-blocking');
    if (fadeBlocking) fadeBlocking.remove();
    
    fadeTarget.style.opacity = '0';
    fadeTarget.style.visibility = 'visible';
    fadeTarget.style.willChange = 'opacity';
    
    setTimeout(() => {
      if (typeof fadeTarget.animate === 'function') {
        const anim = fadeTarget.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: contentFadeDuration, easing: elementEasing, fill: 'forwards' }
        );
        anim.addEventListener('finish', () => {
          fadeTarget.style.opacity = '1';
          fadeTarget.style.willChange = 'auto';
        });
        anim.addEventListener('cancel', () => {
          fadeTarget.style.opacity = '1';
          fadeTarget.style.willChange = 'auto';
        });
      } else {
        fadeTarget.style.transition = `opacity ${contentFadeDuration}ms ${elementEasing}`;
        requestAnimationFrame(() => { fadeTarget.style.opacity = '1'; });
      }
    }, contentFadeDelay);
  }
  
  // 2. Reveal brand logo (after main UI)
  const logoLinksDelay = contentFadeDelay + contentFadeDuration * 0.6;
  const brandLogo = document.getElementById('brand-logo');
  if (brandLogo) {
    setTimeout(() => {
      revealLogoStaggered(brandLogo, {
        delay: 0,
        duration: lateElementDuration,
        easing: elementEasing
      });
    }, logoLinksDelay);
  }
  
  // 3. Central content (page-specific) - animate after logo/links start
  const contentElements = [];
  for (const item of centralContent) {
    const el = typeof item === 'string' ? document.querySelector(item) : item;
    if (el) contentElements.push(el);
  }
  
  const centralContentDelay = logoLinksDelay + lateElementDuration * 0.5;
  for (let i = 0; i < contentElements.length; i++) {
    const el = contentElements[i];
    setTimeout(() => {
      revealLateElement(el, {
        delay: 0,
        duration: lateElementDuration,
        easing: elementEasing});
    }, centralContentDelay + i * 150);
  }
  
  // 4. Reveal main links LAST (if present)
  const mainLinksDelay = logoLinksDelay + lateElementDuration * 0.35;
  const mainLinks = document.getElementById('main-links');
  if (mainLinks) {
    mainLinks.classList.add('main-links--staggered');
    setTimeout(() => {
      mainLinks.style.transition = 'none';
      mainLinks.style.visibility = 'visible';
      mainLinks.style.opacity = '1';
      mainLinks.classList.add('main-links--staggered-in');
      requestAnimationFrame(() => {
        mainLinks.style.removeProperty('transition');
      });
      
      // Remove stagger classes after animation completes so hover animations can work
      // Duration: 600ms animation + 600ms last child delay + buffer
      const staggerDuration = 600 + 600 + 100;
      setTimeout(() => {
        // Lock final state on each link before removing animation classes
        const links = mainLinks.querySelectorAll('.footer_link');
        links.forEach(link => {
          link.style.opacity = '1';
          link.style.transform = 'translateY(0) scale(1)';
          link.style.filter = 'blur(0)';
        });
        mainLinks.classList.remove('main-links--staggered', 'main-links--staggered-in');
      }, staggerDuration);
    }, mainLinksDelay);
  }
  
  // Note: fade-blocking style tag is removed before app-frame animation starts above
}

var entranceAnimation = /*#__PURE__*/Object.freeze({
  __proto__: null,
  applyAspectRatioClass: applyAspectRatioClass,
  applyPerspectiveCSS: applyPerspectiveCSS,
  detectAspectRatioCategory: detectAspectRatioCategory,
  orchestrateEntrance: orchestrateEntrance,
  revealAllLateElements: revealAllLateElements,
  revealLateElement: revealLateElement,
  setInitialBrowserDefaultState: setInitialBrowserDefaultState,
  transitionToWallState: transitionToWallState
});

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

export { navigateWithTransition as $, initializeDarkMode as A, initModalOverlay as B, initCVModal as C, initPortfolioModal as D, initContactModal as E, upgradeSocialIcons as F, initTimeDisplay as G, createSoundToggle as H, maybeAutoPickCursorColor as I, startMainLoop as J, measure as K, table as L, MODES as M, NARRATIVE_MODE_SEQUENCE as N, groupEnd as O, printConsoleBanner as P, initConsolePolicy as Q, waitForFonts as R, getContext as S, getText as T, setForceRenderCallback as U, render as V, getForceApplicator as W, applyWallFrameFromConfig as X, applyWallFrameLayout as Y, initSharedChrome as Z, syncWallFrameColors as _, applyRuntimeTextToDOM as a, NAV_STATES as a0, resetTransitionState as a1, setupPrefetchOnHover as a2, updateWheelSfxConfig as a3, playWheelSnap as a4, playWheelCenterClick as a5, playWheelOpen as a6, playWheelClose as a7, updateWheelSfx as a8, setEffectiveDPR as a9, applyWallPreset as aA, wallState as aB, WALL_PRESETS as aC, NARRATIVE_CHAPTER_TITLES as aD, populateColorSelect as aE, state$1 as aF, colors$1 as aG, renderer as aH, modeController as aI, modalOverlay as aJ, cursor as aK, engine as aL, darkModeV2 as aM, configSync as aN, pageNav as aO, entranceAnimation as aP, drawWalls as aa, applyColorTemplate as ab, clearBalls as ac, clampRadiusToGlobalBounds as ad, spawnBall as ae, getCurrentPreset as af, getSoundConfig as ag, generateSoundControlsHTML as ah, saveConfigBulk as ai, applySoundPreset as aj, SOUND_PRESETS as ak, syncSoundControlsToConfig as al, updateSoundConfig as am, unlockAudio as an, bindSoundControls as ao, SOUND_STATE_EVENT as ap, getLayoutViewportWidthPx as aq, applyLayoutFromVwToPx as ar, getSoundState as as, playTestSound as at, toggleSound as au, playHoverSound as av, PARALLAX_LINEAR_PRESETS as aw, applyNoiseSystem as ax, autoSaveSettings as ay, syncConfigToFile as az, group as b, log as c, loadRuntimeConfig as d, initState as e, applyLayoutCSSVars as f, getGlobals as g, initNoiseSystem as h, isDev as i, setupRenderer as j, getCanvas as k, loadRuntimeText as l, mark as m, setCanvas as n, resize as o, playCollisionSound as p, setupPointer as q, resetCurrentMode as r, setMode as s, setupCustomCursor as t, initLinkCursorHop as u, initSceneImpactReact as v, loadSettings as w, rotatePaletteChapterOnReload as x, initSoundEngine as y, applySoundConfigFromRuntimeConfig as z };
//# sourceMappingURL=shared.js.map
