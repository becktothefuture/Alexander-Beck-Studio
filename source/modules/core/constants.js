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
  PARALLAX_FLOAT: 'parallax-float',
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
  MODES.PARALLAX_FLOAT,
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
  [MODES.PARALLAX_FLOAT]: 'ORGANIC DRIFT',
  [MODES.PARTICLE_FOUNTAIN]: 'PARTICLE FLOW'
};

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       NARRATIVE QUOTES (CURATED)                              ║
// ║      Real quotes from creatives, thinkers, and makers — one per mode          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// Selection principles:
// - Authentic, verified quotes only (no paraphrases or misattributions)
// - Mix of designers, artists, musicians, scientists, philosophers
// - Each quote resonates with the simulation's visual/physical metaphor
// - Loose narrative arc: foundation → emergence → synthesis → infinity
export const NARRATIVE_QUOTES = {
  [MODES.PIT]: {
    quote: 'The details are not the details. They make the design.',
    author: 'Charles Eames'
  },
  [MODES.FLIES]: {
    quote: 'No man ever steps in the same river twice.',
    author: 'Heraclitus'
  },
  [MODES.CUBE_3D]: {
    quote: 'Less, but better.',
    author: 'Dieter Rams'
  },
  [MODES.BUBBLES]: {
    quote: 'In the middle of difficulty lies opportunity.',
    author: 'Albert Einstein'
  },
  [MODES.MAGNETIC]: {
    quote: 'Order is never observed; it is disorder that attracts attention.',
    author: 'Henri Bergson'
  },
  [MODES.WATER]: {
    quote: 'Be like water making its way through cracks.',
    author: 'Bruce Lee'
  },
  [MODES.DVD_LOGO]: {
    quote: 'Do not fear mistakes. There are none.',
    author: 'Miles Davis'
  },
  [MODES.NEURAL]: {
    quote: 'The best design is invisible.',
    author: 'Tobias van Schneider'
  },
  [MODES.SPHERE_3D]: {
    quote: 'Nature uses only the longest threads to weave her patterns.',
    author: 'Richard Feynman'
  },
  [MODES.WEIGHTLESS]: {
    quote: 'An empty space is never empty.',
    author: 'John Cage'
  },
  [MODES.PARALLAX_LINEAR]: {
    quote: "We don't see things as they are, we see them as we are.",
    author: 'Anaïs Nin'
  },
  [MODES.CRITTERS]: {
    quote: 'The whole is other than the sum of the parts.',
    author: 'Kurt Koffka'
  },
  [MODES.ELASTIC_CENTER]: {
    quote: 'Having guts always works out for me.',
    author: 'Stefan Sagmeister'
  },
  [MODES.VORTEX]: {
    quote: 'In all chaos there is a cosmos, in all disorder a secret order.',
    author: 'Carl Jung'
  },
  [MODES.KALEIDOSCOPE]: {
    quote: 'Creativity takes courage.',
    author: 'Henri Matisse'
  },
  [MODES.STARFIELD_3D]: {
    quote: 'The cosmos is within us. We are made of star-stuff.',
    author: 'Carl Sagan'
  },
  [MODES.PARALLAX_FLOAT]: {
    quote: 'Nature does not hurry, yet everything is accomplished.',
    author: 'Lao Tzu'
  },
  [MODES.PARTICLE_FOUNTAIN]: {
    quote: "You can't use up creativity. The more you use, the more you have.",
    author: 'Maya Angelou'
  }
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
// WALL PRESETS (REMOVED - Deformation system deprecated, replaced by rumble)
// Empty export for backward compatibility
// ═══════════════════════════════════════════════════════════════════════════════
export const WALL_PRESETS = {};

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
