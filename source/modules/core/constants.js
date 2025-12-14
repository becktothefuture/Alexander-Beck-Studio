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
  PING_PONG: 'ping-pong',
  MAGNETIC: 'magnetic',
  BUBBLES: 'bubbles',
  KALEIDOSCOPE: 'kaleidoscope',
  // Simulation 11: ball-only “critters” (no keyboard shortcut yet)
  CRITTERS: 'critters'
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
