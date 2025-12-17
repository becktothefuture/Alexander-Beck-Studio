// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          CONSTANTS (COMPLETE)                                ║
// ║                    Extracted from balls-source.html                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export const MODES = {
  PIT: 'pit',
  PIT_THROWS: 'pit-throws',
  FLIES: 'flies',
  WEIGHTLESS: 'weightless',
  WATER: 'water',
  VORTEX: 'vortex',
  PING_PONG: 'ping-pong',
  MAGNETIC: 'magnetic',
  BUBBLES: 'bubbles',
  KALEIDOSCOPE: 'kaleidoscope',
  KALEIDOSCOPE_1: 'kaleidoscope-1', // Minimal: 5 balls, simple morph
  KALEIDOSCOPE_2: 'kaleidoscope-2', // Medium: 15-20 balls, medium complexity
  KALEIDOSCOPE_3: 'kaleidoscope-3', // Glorious: 40-50 balls, complex morph
  // Simulation 11: ball-only "critters" (no keyboard shortcut yet)
  CRITTERS: 'critters',
  ORBIT_3D: 'orbit-3d',
  ORBIT_3D_2: 'orbit-3d-2',
  NEURAL: 'neural',
  LATTICE: 'lattice',
  // Parallax (depth perception) simulations
  PARALLAX_LINEAR: 'parallax-linear',
  PARALLAX_PERSPECTIVE: 'parallax-perspective'
};

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       NARRATIVE MODE SEQUENCE (ORDERED)                       ║
// ║          Used for ArrowLeft/ArrowRight navigation (looping)                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// Story arc: arrival → foundation → first breath → creatures → swarm → current
//           → storm → forces → duel → release → transformation (finale)
export const NARRATIVE_MODE_SEQUENCE = [
  MODES.PIT,
  MODES.BUBBLES,
  MODES.CRITTERS,
  MODES.FLIES,
  MODES.PIT_THROWS,
  MODES.WATER,
  MODES.VORTEX,
  MODES.MAGNETIC,
  MODES.PING_PONG,
  MODES.WEIGHTLESS,
  // Kaleidoscope variants (treated as variants; kept consecutive)
  MODES.KALEIDOSCOPE_1,
  MODES.KALEIDOSCOPE_2,
  MODES.KALEIDOSCOPE_3,
  MODES.KALEIDOSCOPE,
  MODES.ORBIT_3D,
  MODES.ORBIT_3D_2,
  MODES.LATTICE,
  MODES.NEURAL,
  MODES.PARALLAX_LINEAR,
  MODES.PARALLAX_PERSPECTIVE
];

// Short chapter titles (no numbers) — used by the left-edge narrative label.
// These are meant to read like “how an idea forms” chapters (emergence → swarm → synthesis),
// not literal mode names.
export const NARRATIVE_CHAPTER_TITLES = {
  [MODES.PIT]: 'SOURCE MATERIAL',
  [MODES.BUBBLES]: 'SIGNAL NOISE',
  [MODES.CRITTERS]: 'CONCEPT MODEL',
  [MODES.FLIES]: 'SWARM LOGIC',
  [MODES.PIT_THROWS]: 'SOURCE ITERATION',
  [MODES.WATER]: 'FLOW STATE',
  [MODES.VORTEX]: 'ORDERED CHAOS',
  [MODES.MAGNETIC]: 'FORCE FIELDS',
  [MODES.PING_PONG]: 'FEEDBACK PATTERNS',
  [MODES.WEIGHTLESS]: 'ZERO GRAVITY',
  [MODES.KALEIDOSCOPE]: 'A NEW LANGUAGE',
  [MODES.KALEIDOSCOPE_1]: 'LANGUAGE SEED',
  [MODES.KALEIDOSCOPE_2]: 'LANGUAGE FLOW',
  [MODES.KALEIDOSCOPE_3]: 'LANGUAGE BLOOM',
  [MODES.ORBIT_3D]: 'AXIAL STORM',
  [MODES.ORBIT_3D_2]: 'TIGHT SWARM',
  [MODES.LATTICE]: 'CRYSTAL LOGIC',
  [MODES.NEURAL]: 'SYNAPTIC WEB',
  [MODES.PARALLAX_LINEAR]: 'DEPTH DRIFT',
  [MODES.PARALLAX_PERSPECTIVE]: 'PERSPECTIVE FIELD'
};

export const CONSTANTS = {
  DPR: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
  CANVAS_HEIGHT_VH_PIT: 1.5,
  CANVAS_HEIGHT_VH_DEFAULT: 1.0,
  OFFSCREEN_MOUSE: -1e9,
  MIN_DISTANCE_EPSILON: 1e-6,
  MIN_REPEL_DISTANCE: 1e-4,
  ACCUMULATOR_RESET_THRESHOLD: 3,
  INITIAL_SEED_BALLS: 200,
  BALL_SPAWN_OFFSET: 2,
  BALL_CLUSTER_SPACING: 8,
  BALL_CLUSTER_Y_OFFSET: 12,
  MAX_PHYSICS_STEPS: 2,
  FPS_UPDATE_INTERVAL: 1.0,
  SPIN_DAMP_PER_S: 3.0,             // Faster spin decay to prevent endless rotation
  SPIN_GAIN: 0.25,
  SPIN_GAIN_TANGENT: 0.18,
  ROLL_FRICTION_PER_S: 2.5,         // Higher rolling friction for faster settling
  SQUASH_MAX_BASE: 0.20,
  SQUASH_DECAY_PER_S: 18.0,
  WALL_REST_VEL_THRESHOLD: 70,
  GROUND_COUPLING_PER_S: 12.0,      // Stronger ground coupling for realistic rolling
  
  // Sleep threshold for jitter reduction (Box2D-inspired)
  SLEEP_VELOCITY_THRESHOLD: 8.0,      // px/s - slightly higher to catch more jitter
  SLEEP_ANGULAR_THRESHOLD: 0.1,       // rad/s - catch slow rotation too
  TIME_TO_SLEEP: 0.25,                // seconds - faster sleep for quicker settling
  
  PHYSICS_DT: 1/120,
  GE: 1960
};

// ═══════════════════════════════════════════════════════════════════════════════
// WALL PRESETS
// ═══════════════════════════════════════════════════════════════════════════════
export const WALL_PRESETS = {
  rubber: {    // DEFAULT - balanced, natural
    wallWobbleMaxDeform: 45,
    wallWobbleStiffness: 2200,
    wallWobbleDamping: 35,
    wallWobbleImpactThreshold: 140,
    wallWobbleSettlingSpeed: 75,
    wallWobbleSigma: 2.0,
    wallWobbleCornerClamp: 0.6
  },
  trampoline: { // Very bouncy, quick response
    wallWobbleMaxDeform: 55,
    wallWobbleStiffness: 2800,
    wallWobbleDamping: 15,
    wallWobbleImpactThreshold: 100,
    wallWobbleSettlingSpeed: 40,
    wallWobbleSigma: 2.5,
    wallWobbleCornerClamp: 0.5
  },
  jelly: {      // Soft, slow, wobbly
    wallWobbleMaxDeform: 80,
    wallWobbleStiffness: 800,
    wallWobbleDamping: 12,
    wallWobbleImpactThreshold: 80,
    wallWobbleSettlingSpeed: 30,
    wallWobbleSigma: 3.5,
    wallWobbleCornerClamp: 0.4
  },
  stiff: {      // Minimal deformation
    wallWobbleMaxDeform: 20,
    wallWobbleStiffness: 3000,
    wallWobbleDamping: 60,
    wallWobbleImpactThreshold: 180,
    wallWobbleSettlingSpeed: 90,
    wallWobbleSigma: 1.5,
    wallWobbleCornerClamp: 0.8
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODE PRESETS - Curated configurations for each simulation
// ═══════════════════════════════════════════════════════════════════════════════

// Parallax Linear (3D grid)
export const PARALLAX_LINEAR_PRESETS = {
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
    parallaxLinearSpanX: 1.45,
    parallaxLinearSpanY: 1.45,
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
    parallaxLinearSpanX: 1.35,
    parallaxLinearSpanY: 1.35,
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
    parallaxLinearSpanX: 1.6,
    parallaxLinearSpanY: 1.6,
    parallaxLinearZNear: 70,
    parallaxLinearZFar: 800,
    parallaxLinearFocalLength: 380,
    parallaxLinearParallaxStrength: 220
  }
};

// Parallax Perspective (3D grid + jitter)
export const PARALLAX_PERSPECTIVE_PRESETS = {
  default: {
    label: 'Default (Nebula Grid)',
    parallaxPerspectiveDotSizeMul: 1.8,
    sizeVariationParallaxPerspective: 0,
    parallaxPerspectiveGridX: 16,
    parallaxPerspectiveGridY: 12,
    parallaxPerspectiveGridZ: 8,
    parallaxPerspectiveSpanX: 1.45,
    parallaxPerspectiveSpanY: 1.45,
    parallaxPerspectiveZNear: 40,
    parallaxPerspectiveZFar: 1200,
    parallaxPerspectiveFocalLength: 420,
    parallaxPerspectiveParallaxStrength: 280,
    parallaxPerspectiveRandomness: 0.6
  },
  calm: {
    label: 'Calm Mist',
    parallaxPerspectiveDotSizeMul: 1.9,
    sizeVariationParallaxPerspective: 0.08,
    parallaxPerspectiveGridX: 14,
    parallaxPerspectiveGridY: 10,
    parallaxPerspectiveGridZ: 6,
    parallaxPerspectiveSpanX: 1.4,
    parallaxPerspectiveSpanY: 1.4,
    parallaxPerspectiveZNear: 60,
    parallaxPerspectiveZFar: 900,
    parallaxPerspectiveFocalLength: 420,
    parallaxPerspectiveParallaxStrength: 180,
    parallaxPerspectiveRandomness: 0.25
  },
  deep: {
    label: 'Deep Space',
    parallaxPerspectiveDotSizeMul: 1.6,
    sizeVariationParallaxPerspective: 0.06,
    parallaxPerspectiveGridX: 18,
    parallaxPerspectiveGridY: 13,
    parallaxPerspectiveGridZ: 12,
    parallaxPerspectiveSpanX: 1.55,
    parallaxPerspectiveSpanY: 1.55,
    parallaxPerspectiveZNear: 30,
    parallaxPerspectiveZFar: 2200,
    parallaxPerspectiveFocalLength: 520,
    parallaxPerspectiveParallaxStrength: 340,
    parallaxPerspectiveRandomness: 0.55
  },
  wild: {
    label: 'Wild Nebula',
    parallaxPerspectiveDotSizeMul: 1.7,
    sizeVariationParallaxPerspective: 0.18,
    parallaxPerspectiveGridX: 16,
    parallaxPerspectiveGridY: 12,
    parallaxPerspectiveGridZ: 10,
    parallaxPerspectiveSpanX: 1.6,
    parallaxPerspectiveSpanY: 1.6,
    parallaxPerspectiveZNear: 20,
    parallaxPerspectiveZFar: 1600,
    parallaxPerspectiveFocalLength: 420,
    parallaxPerspectiveParallaxStrength: 360,
    parallaxPerspectiveRandomness: 0.9
  },
  minimal: {
    label: 'Minimal Stars',
    parallaxPerspectiveDotSizeMul: 2.6,
    sizeVariationParallaxPerspective: 0.22,
    parallaxPerspectiveGridX: 10,
    parallaxPerspectiveGridY: 7,
    parallaxPerspectiveGridZ: 5,
    parallaxPerspectiveSpanX: 1.75,
    parallaxPerspectiveSpanY: 1.75,
    parallaxPerspectiveZNear: 70,
    parallaxPerspectiveZFar: 1100,
    parallaxPerspectiveFocalLength: 380,
    parallaxPerspectiveParallaxStrength: 220,
    parallaxPerspectiveRandomness: 0.35
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ORBIT 3D PRESETS (real gravitational physics)
// ═══════════════════════════════════════════════════════════════════════════════
export const ORBIT3D_PRESETS = {
  serene: {      // DEFAULT - calm, stable circular orbits
    label: 'Serene',
    orbit3dMoonCount: 50,
    orbit3dGravity: 40000,
    orbit3dVelocityMult: 1.0,    // exactly circular
    orbit3dMinOrbit: 10,
    orbit3dMaxOrbit: 22,
    orbit3dDepthScale: 0.5,
    orbit3dDamping: 0.01
  },
  swarm: {       // Many fast-moving moons, tight orbits
    label: 'Swarm',
    orbit3dMoonCount: 100,
    orbit3dGravity: 80000,
    orbit3dVelocityMult: 1.1,    // slightly elliptical outward
    orbit3dMinOrbit: 5,
    orbit3dMaxOrbit: 14,
    orbit3dDepthScale: 0.4,
    orbit3dDamping: 0
  },
  halo: {        // Wide ring, slow majestic orbits
    label: 'Halo',
    orbit3dMoonCount: 35,
    orbit3dGravity: 25000,
    orbit3dVelocityMult: 1.0,
    orbit3dMinOrbit: 14,
    orbit3dMaxOrbit: 28,
    orbit3dDepthScale: 0.65,
    orbit3dDamping: 0.02
  },
  elliptical: {  // Comet-like elongated orbits
    label: 'Elliptical',
    orbit3dMoonCount: 40,
    orbit3dGravity: 60000,
    orbit3dVelocityMult: 0.7,    // sub-circular = falls inward then slingshots
    orbit3dMinOrbit: 8,
    orbit3dMaxOrbit: 24,
    orbit3dDepthScale: 0.55,
    orbit3dDamping: 0
  },
  dense: {       // Tight cluster, strong gravity
    label: 'Dense',
    orbit3dMoonCount: 80,
    orbit3dGravity: 120000,
    orbit3dVelocityMult: 1.0,
    orbit3dMinOrbit: 6,
    orbit3dMaxOrbit: 12,
    orbit3dDepthScale: 0.45,
    orbit3dDamping: 0.005
  }
};
