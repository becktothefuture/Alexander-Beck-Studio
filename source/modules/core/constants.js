// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          CONSTANTS (COMPLETE)                                ║
// ║                    Extracted from balls-source.html                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export const MODES = {
  PIT: 'pit',
  FLIES: 'flies',
  WEIGHTLESS: 'weightless',
  WATER: 'water',
  VORTEX: 'vortex',
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
export const NARRATIVE_MODE_SEQUENCE = [
  MODES.PIT,
  MODES.FLIES,
  MODES.CUBE_3D,
  MODES.BUBBLES,
  MODES.MAGNETIC,
  MODES.WATER,
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
  MODES.PARTICLE_FOUNTAIN
];

// Short chapter titles (no numbers) — used by the left-edge narrative label.
// These are meant to read like “how an idea forms” chapters (emergence → swarm → synthesis),
// not literal mode names.
export const NARRATIVE_CHAPTER_TITLES = {
  [MODES.PIT]: 'SOURCE MATERIAL',
  [MODES.FLIES]: 'IDEA SPARK',
  [MODES.BUBBLES]: 'NOISE SIGNAL',
  [MODES.MAGNETIC]: 'DESIGN FORCES',
  [MODES.WATER]: 'USER FLOW',
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
  [MODES.PARTICLE_FOUNTAIN]: 'PARTICLE FLOW'
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
  MAX_PHYSICS_STEPS: 4, // Increased from 2 to handle low-framerate mobile (30fps → needs 4 steps at 120Hz)
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
  SLEEP_VELOCITY_THRESHOLD: 12.0,     // px/s - higher = settles sooner (less idle jiggle)
  SLEEP_ANGULAR_THRESHOLD: 0.18,      // rad/s - higher = settles sooner (less idle spin)
  TIME_TO_SLEEP: 0.25,                // seconds - faster sleep for quicker settling
  
  PHYSICS_DT: 1/120,
  PHYSICS_DT_MOBILE: 1/60,  // Lower physics Hz on mobile (60Hz vs 120Hz)
  GE: 1960
};

// ═══════════════════════════════════════════════════════════════════════════════
// WALL PRESETS
// ═══════════════════════════════════════════════════════════════════════════════
export const WALL_PRESETS = {
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
