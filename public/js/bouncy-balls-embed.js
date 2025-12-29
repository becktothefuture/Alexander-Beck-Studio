/* Alexander Beck Studio | 2025-12-29 */
var BouncyBalls = (function (exports) {
  'use strict';

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                          CONSTANTS (COMPLETE)                                ║
  // ║                    Extracted from balls-source.html                          ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  const MODES = {
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
  // Story arc (curated alternation):
  // - Keep tonal contrast between adjacent sims (avoid “similar twice in a row”)
  // - Ball Pit opens the story
  // - Ball Pit (Throws) lands mid-story (the “filling up” iteration beat)
  // - Kaleidoscopes are contiguous and increase complexity
  // - Keep orbit and parallax variants separated
  const NARRATIVE_MODE_SEQUENCE = [
    MODES.PIT,
    MODES.FLIES,
    MODES.LATTICE,
    MODES.BUBBLES,
    MODES.PIT_THROWS,
    MODES.MAGNETIC,
    MODES.WATER,
    MODES.PING_PONG,
    MODES.NEURAL,
    MODES.VORTEX,
    MODES.ORBIT_3D,
    MODES.WEIGHTLESS,
    MODES.PARALLAX_LINEAR,
    MODES.CRITTERS,
    MODES.ORBIT_3D_2,
    MODES.PARALLAX_PERSPECTIVE,
    // Kaleidoscope variants (treated as variants; kept consecutive, increasing complexity)
    MODES.KALEIDOSCOPE_1,
    MODES.KALEIDOSCOPE_2,
    MODES.KALEIDOSCOPE_3,
    MODES.KALEIDOSCOPE
  ];

  // Short chapter titles (no numbers) — used by the left-edge narrative label.
  // These are meant to read like “how an idea forms” chapters (emergence → swarm → synthesis),
  // not literal mode names.
  const NARRATIVE_CHAPTER_TITLES = {
    [MODES.PIT]: 'SOURCE MATERIAL',
    [MODES.FLIES]: 'IDEA SPARK',
    [MODES.LATTICE]: 'SYSTEM FRAME',
    [MODES.BUBBLES]: 'NOISE SIGNAL',
    [MODES.PIT_THROWS]: 'PROTOTYPE LOOP',
    [MODES.MAGNETIC]: 'DESIGN FORCES',
    [MODES.WATER]: 'USER FLOW',
    [MODES.PING_PONG]: 'FEEDBACK CYCLE',
    [MODES.NEURAL]: 'CONNECTION MAP',
    [MODES.VORTEX]: 'EMERGENT ORDER',
    [MODES.ORBIT_3D]: 'SYSTEM DYNAMICS',
    [MODES.WEIGHTLESS]: 'OPEN SPACE',
    [MODES.PARALLAX_LINEAR]: 'PERSPECTIVE SHIFT',
    [MODES.CRITTERS]: 'BEHAVIOR MODEL',
    [MODES.ORBIT_3D_2]: 'EDGE CASES',
    [MODES.PARALLAX_PERSPECTIVE]: 'CONTEXT FIELD',
    [MODES.KALEIDOSCOPE_1]: 'VOCAB SEED',
    [MODES.KALEIDOSCOPE_2]: 'VOCAB FLOW',
    [MODES.KALEIDOSCOPE_3]: 'VOCAB BLOOM',
    [MODES.KALEIDOSCOPE]: 'VISUAL LANGUAGE'
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
    
    PHYSICS_DT: 1/120};

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
  const PARALLAX_PERSPECTIVE_PRESETS = {
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

    // Ball Pit (Throws) spawn tuning (mode: pit-throws)
    pitThrowSpeed: 650,          // px/s-ish (canvas units)
    pitThrowSpeedJitter: 0.22,   // 0..1 (multiplier jitter)
    pitThrowAngleJitter: 0.16,   // 0..1 (radians scaled by π)
    pitThrowBatchSize: 18,       // balls per color batch
    pitThrowIntervalMs: 70,      // ms between throws within a color
    pitThrowColorPauseMs: 180,   // ms pause between colors
    pitThrowTargetYFrac: 0.36,   // 0..1 (aim point in canvas height)
    pitThrowInletInset: 0.06,    // 0..1 (fraction of usable width from wall)
    pitThrowCrossBias: 0.12,     // 0..1 (cross-aim bias: left->right, right->left)
    pitThrowSpawnSpread: 0.02,   // 0..1 (fraction of usable width)
    pitThrowAimJitter: 0.04,     // 0..1 (fraction of canvas width)
    pitThrowPairChance: 0.35,    // 0..1 (chance to schedule a paired throw)
    pitThrowPairStaggerMs: 18,   // ms (delay for the paired throw)
    pitThrowSpeedVar: 0.18,      // 0..1 (per-throw speed multiplier variance)
    pitThrowSpreadVar: 0.25,     // 0..1 (per-throw spread multiplier variance)
    // Global “material world” defaults (snooker-ish balls + thick boundary)
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
    sizeVariationPitThrows: 0,
    sizeVariationFlies: 0,
    sizeVariationWeightless: 0,
    sizeVariationWater: 0,
    sizeVariationVortex: 0.2,
    sizeVariationPingPong: 0,
    sizeVariationMagnetic: 0,
    sizeVariationBubbles: 0.2,
    sizeVariationKaleidoscope: 0,
    sizeVariationOrbit3d: 0,
    sizeVariationCritters: 0.2,
    sizeVariationNeural: 0,
    sizeVariationLattice: 0,
    sizeVariationParallaxLinear: 0,
    sizeVariationParallaxPerspective: 0,
    
    // Warmup (per simulation) — how many “startup frames” to pre-run before first render.
    // Default 10 for all modes (quick settle; avoids visible pop-in while testing).
    pitWarmupFrames: 10,
    pitThrowsWarmupFrames: 10,
    fliesWarmupFrames: 10,
    weightlessWarmupFrames: 10,
    waterWarmupFrames: 10,
    vortexWarmupFrames: 10,
    pingPongWarmupFrames: 10,
    magneticWarmupFrames: 10,
    bubblesWarmupFrames: 10,
    kaleidoscopeWarmupFrames: 10,
    kaleidoscope1WarmupFrames: 10,
    kaleidoscope2WarmupFrames: 10,
    kaleidoscope3WarmupFrames: 10,
    orbit3dWarmupFrames: 10,
    orbit3d2WarmupFrames: 10,
    crittersWarmupFrames: 10,
    neuralWarmupFrames: 10,
    latticeWarmupFrames: 10,
    parallaxLinearWarmupFrames: 10,
    parallaxPerspectiveWarmupFrames: 10,
    // Legacy (pre per-mode system) — kept for back-compat; prefer the per-mode keys above.
    sizeVariation: 0,
    responsiveScale: 1.0,       // Runtime responsive scale (calculated on init)
    responsiveScaleMobile: 0.75, // Scale factor for mobile devices (iPad/iPhone)
    isMobile: false,            // Mobile *device* detected? (UA/touch heuristic)
    isMobileViewport: false,    // Mobile viewport detected? (width breakpoint)
    // Mobile performance: global multiplier applied to object counts (0..1).
    // 1.0 = no reduction, 0.0 = (effectively) no objects.
    mobileObjectReductionFactor: 0.7,
    R_MIN_BASE: 6,
    R_MAX_BASE: 24,
    // Derived by updateBallSizes()
    R_MED: 0,
    R_MIN: 0,
    R_MAX: 0,
    
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
    contentPaddingRatio: 0.0,
    contentPaddingHorizontalRatio: 1.0, // horizontal padding = base × ratio (>1 = wider sides)
    mobileWallThicknessXFactor: 1.4,    // wall thickness multiplier for LEFT/RIGHT on mobile (1.0 = same as desktop)
    mobileEdgeLabelsVisible: true,     // whether to show edge labels on mobile (default: visible)
    wallRadiusVw: 0,          // corner radius (vw) (also drives physics corner collision)
    wallThicknessVw: 0,       // wall tube thickness (vw)
    wallThicknessAreaMultiplier: 1.0,  // multiplier for area-based wall thickness scaling (1.0 = no area scaling)

    // Noise texture opacity (visual overlay) - lighter for subtle effect
    noiseBackOpacity: 0.015,        // back layer opacity (light mode) - lighter
    noiseFrontOpacity: 0.045,       // front layer opacity (light mode) - lighter
    noiseBackOpacityDark: 0.06,     // back layer opacity (dark mode) - lighter
    noiseFrontOpacityDark: 0.08,    // front layer opacity (dark mode) - lighter

    // Procedural noise (no GIF): texture + cinematic controls
    noiseEnabled: true,
    noiseSeed: 1337,
    noiseTextureSize: 256,
    noiseDistribution: 'gaussian', // 'uniform' | 'gaussian'
    noiseMonochrome: true,
    noiseChroma: 0.35, // 0..1 (ignored when monochrome)
    noiseMotion: 'jitter', // 'jitter' | 'drift' | 'static'
    noiseMotionAmount: 1.2, // Increased for more alive movement
    noiseSpeedBackMs: 1400, // Faster for more alive feel
    noiseSpeedFrontMs: 900,  // Faster for more alive feel
    noiseFlicker: 0.08, // Lighter flicker
    noiseFlickerSpeedMs: 180, // Faster flicker for more alive feel
    noiseBlurPx: 0,
    noiseContrast: 1.2, // Slightly reduced for lighter look
    noiseBrightness: 1.15, // Increased brightness for lighter look
    noiseSaturation: 1.0,
    noiseHue: 0,
    // Layer scale (noise-3 removed, so noiseTopOpacity no longer used) - finer grain
    noiseSizeBase: 65,  // Finer grain (smaller size)
    noiseSizeTop: 85,   // Finer grain (smaller size)
    noiseTopOpacity: 0, // Disabled: noise-3 layer removed to prevent covering cards
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

    // Vortex mode params
    vortexSwirlStrength: 420,
    vortexRadialPull: 180,
    vortexBallCount: 180,
    vortexSpeedMultiplier: 1.0,
    vortexRadius: 0, // 0 = unlimited (uses falloff)
    vortexFalloffCurve: 1.0, // 1.0 = linear, 2.0 = quadratic, 0.5 = sqrt
    vortexRotationDirection: 1, // 1 = counterclockwise, -1 = clockwise
    vortexCoreStrength: 1.0, // Multiplier for center strength
    vortexAccelerationZone: 0, // Radius where acceleration is strongest (0 = disabled)
    vortexOutwardPush: 0, // Outward force at edges (0 = disabled)
    vortexFalloffRate: 0.0015, // Distance-based falloff rate (when radius = 0)
    
    
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
    // Derived (px): set in `applyLayoutFromVwToPx()` from `cursorInfluenceRadiusVw`.
    bubblesDeflectRadius: 0,
    
    
    // Ping Pong mode params (left-right bounce, cursor obstacle)
    pingPongBallCount: 35,
    pingPongSpeed: 800,
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
      { label: 'AI Integration', colorIndex: 0, weight: 30 },
      { label: 'UI/UX Design', colorIndex: 4, weight: 18 },
      { label: 'Creative Strategy', colorIndex: 3, weight: 15 },
      { label: 'Frontend Development', colorIndex: 2, weight: 12 },
      { label: 'Brand Identity', colorIndex: 5, weight: 10 },
      { label: '3D Design', colorIndex: 6, weight: 10 },
      { label: 'Art Direction', colorIndex: 7, weight: 5 }
    ],
    
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
    weightlessRepelRadius: 220,
    weightlessRepelPower: 220000,
    weightlessRepelSoft: 2.2,
    
    // Kaleidoscope mode (mouse-driven mirrored wedges)
    kaleidoscopeBallCount: 23,
    // Number of mirrored wedges/segments in the kaleidoscope render.
    kaleidoscopeWedges: 12,
    kaleidoscopeMirror: 1,
    // Normalized swirl speed (0.2..2.0). Higher = faster orbiting.
    kaleidoscopeSpeed: 1.0,
    // Kaleidoscope dot sizing (vh-driven, ~30% smaller area by default)
    kaleidoscopeDotSizeVh: 0.95,
    kaleidoscopeDotAreaMul: 0.7,
    // Spawn area multiplier: smaller = denser, larger = more spread out (0.2..2.0)
    kaleidoscopeSpawnAreaMul: 1.0,
    // Size variance (0..1): higher = more variety in ball sizes
    kaleidoscopeSizeVariance: 0.3,

    // Kaleidoscope variants (I/II/III) — treated as variants of the same sim
    kaleidoscope1BallCount: 18,
    kaleidoscope1Wedges: 8,
    kaleidoscope1Speed: 0.8,
    kaleidoscope1DotSizeVh: 0.95,
    kaleidoscope1DotAreaMul: 0.7,
    kaleidoscope1SpawnAreaMul: 1.0,
    kaleidoscope1SizeVariance: 0.3,

    kaleidoscope2BallCount: 36,
    kaleidoscope2Wedges: 8,
    kaleidoscope2Speed: 1.15,
    kaleidoscope2DotSizeVh: 0.95,
    kaleidoscope2DotAreaMul: 0.7,
    kaleidoscope2SpawnAreaMul: 1.0,
    kaleidoscope2SizeVariance: 0.3,

    kaleidoscope3BallCount: 54,
    kaleidoscope3Wedges: 8,
    kaleidoscope3Speed: 1.55,
    kaleidoscope3DotSizeVh: 0.95,
    kaleidoscope3DotAreaMul: 0.7,
    kaleidoscope3SpawnAreaMul: 1.0,
    kaleidoscope3SizeVariance: 0.3,

    // Orbit 3D mode (real gravitational physics)
    orbit3dPreset: 'serene',     // active preset name
    orbit3dMoonCount: 80,         // number of moons
    orbit3dGravity: 5000,        // cursor gravitational force (lower = gentler pull)
    orbit3dMoonMass: 1.0,         // moon mass (lighter = more responsive, heavier = more stable)
    orbit3dVelocityMult: 150,     // orbital speed (px/s) - higher = faster orbits
    orbit3dTargetOrbit: 12,       // target orbit distance (vw) - ideal distance
    orbit3dMinOrbit: 3,           // min orbit distance (vw) - repulsion boundary
    orbit3dMaxOrbit: 3,          // max orbit distance (vw) - attraction boundary
    orbit3dDepthScale: 0.8,       // faux 3D depth effect strength
    orbit3dDamping: 0.02,         // velocity damping (min 0.01)

    // Orbit 3D Mode 2 (spiral vortex)
    orbit3d2MoonCount: 60,       // number of spirals
    orbit3d2Gravity: 3000,       // spiral attraction strength
    orbit3d2VelocityMult: 200,   // initial tangential speed
    orbit3d2MinOrbit: 5,         // min orbit distance (vw)
    orbit3d2MaxOrbit: 30,        // max orbit distance (vw)
    orbit3d2DepthScale: 0.5,     // faux 3D depth effect
    orbit3d2Damping: 0.98,       // velocity damping (higher = less damping)
    orbit3d2MoonMass: 1.0,       // moon mass (affects responsiveness)
    orbit3d2MaxSpeed: 800,       // speed limit to prevent instability

    // Neural mode (emergent "synapses")
    neuralBallCount: 80,
    neuralLinkDistanceVw: 14,
    neuralLineOpacity: 0.22,
    neuralWanderStrength: 420,
    neuralMaxLinksPerBall: 4,
    neuralDamping: 0.985,

    // Lattice mode (hex crystallization with living mesh animation)
    latticeBallCount: 90,
    latticeSpacingVw: 8.5,
    latticeStiffness: 2.2,
    latticeDamping: 0.92,
    latticeDisruptRadius: 600,
    latticeDisruptPower: 25.0,
    latticeMeshWaveStrength: 12.0,
    latticeMeshWaveSpeed: 0.8,
    latticeAlignment: 'center',

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
    parallaxPerspectiveDotCount: 240,
    parallaxPerspectiveDepthMul: 1.6,
    parallaxPerspectiveFocalLength: 400,
    parallaxPerspectiveFollowStrength: 16.0,
    parallaxPerspectiveDamping: 12.0,
    parallaxPerspectiveZ1: 1200,   // Deepest layer
    parallaxPerspectiveZ2: 700,
    parallaxPerspectiveZ3: 350,    // Middle layer
    parallaxPerspectiveZ4: 120,
    parallaxPerspectiveZ5: 35,     // Closest layer

    // Parallax (3D grid) — fills the viewport and responds to mouse like a camera pan.
    // These are the canonical knobs for the rebuilt Parallax simulations.
    parallaxLinearGridX: 14,
    parallaxLinearGridY: 10,
    parallaxLinearGridZ: 7,
    // Grid span in viewport units (multipliers applied to canvas width/height).
    // 1.0 ≈ edge-to-edge in the grid's *world* space; use >1 to counter perspective shrink.
    parallaxLinearSpanX: 1.35,
    parallaxLinearSpanY: 1.35,
    parallaxLinearZNear: 50,
    parallaxLinearZFar: 900,
    parallaxLinearFocalLength: 420,
    parallaxLinearParallaxStrength: 260,
    parallaxLinearDotSizeMul: 1.8,

    parallaxPerspectiveGridX: 16,
    parallaxPerspectiveGridY: 12,
    parallaxPerspectiveGridZ: 8,
    parallaxPerspectiveSpanX: 1.45,
    parallaxPerspectiveSpanY: 1.45,
    parallaxPerspectiveZNear: 40,
    parallaxPerspectiveZFar: 1200,
    parallaxPerspectiveParallaxStrength: 280,
    parallaxPerspectiveRandomness: 0.6,
    parallaxPerspectiveDotSizeMul: 1.8,
    
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
    pingPongVerticalDamp: 0.995,
    
    // Magnetic mode
    magneticDamping: 0.98,
    
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
    // Logo counter-scale gain (multiplies the compensation so the logo stays “anchored”)
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
    frameColor: '#0a0a0a',    // Frame color (legacy - use frameColorLight/frameColorDark)
    frameColorLight: '#0a0a0a',  // Frame/wall color in light mode (browser chrome + walls + border)
    frameColorDark: '#0a0a0a',   // Frame/wall color in dark mode (browser chrome + walls + border)
    
    // Text Colors
    textColorLight: '#161616',          // Primary text (light mode)
    textColorLightMuted: '#2f2f2f',     // Secondary/muted text (light mode)
    textColorDark: '#7a8fa3',  // Primary text (dark mode) — harmonized blue-gray to match dark blue/green background
    textColorDarkMuted: '#9db0c4', // Secondary/muted text (dark mode) — harmonized light blue-gray
    // Edge labels (vertical chapter/copyright) — independently tunable from body text
    edgeLabelColorLight: '#2f2f2f',
    edgeLabelColorDark: '#8a9ba8', // Harmonized blue-gray for edge labels
    edgeLabelInsetAdjustPx: 0,
    
    // Link Colors
    linkHoverColor: '#ff4013',          // Link hover accent (shared)
    
    // Logo Colors
    logoColorLight: '#161616',          // Logo color (light mode)
    logoColorDark: '#b8c5d3',           // Logo color (dark mode) — harmonized blue-gray to match dark blue/green background
    // Portfolio Logo Colors (separate from index)
    portfolioLogoColorLight: '#161616', // Portfolio logo color (light mode)
    portfolioLogoColorDark: '#374862',  // Portfolio logo color (dark mode) — darker blue-gray for portfolio
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
    gateOverlayEnabled: true,         // Enable/disable overlay
    gateOverlayOpacity: 0.01,          // White wash opacity (0-1)
    gateOverlayBlurPx: 16,            // Backdrop blur amount (px)
    gateOverlayTransitionMs: 800,     // Blur-in transition duration (ms)
    gateOverlayTransitionOutMs: 600,  // Blur-out transition duration (ms)
    gateOverlayContentDelayMs: 200,   // Delay before dialog content appears (ms)
    gateDepthScale: 0.96,             // Scene scale when gate is open (0.9-1.0)
    gateDepthTranslateY: 8,           // Scene Y translation when gate is open (px)
    logoOpacityInactive: 1,           // Logo opacity when gate is closed (0-1)
    logoOpacityActive: 0.2,           // Logo opacity when gate is active (0-1)
    logoBlurInactive: 0,              // Logo blur when gate is closed (px)
    logoBlurActive: 12,               // Logo blur when gate is active (px)
    
    // Entrance Animation (browser default → wall-state)
    entranceEnabled: true,            // Enable dramatic entrance animation
    entranceWallTransitionDelay: 300,  // Delay before wall-state transition starts (ms)
    entranceWallTransitionDuration: 800, // Wall growth animation duration (ms)
    entranceWallInitialScale: 1.1,    // Initial scale (wall starts slightly larger, scales down to 1.0)
    entranceWallEasing: 'cubic-bezier(0.16, 1, 0.3, 1)', // Easing for wall growth (organic ease-out)
    entranceElementDuration: 200,     // Individual element fade duration (ms)
    entranceElementScaleStart: 0.95,  // Initial scale for elements (0-1)
    entranceElementTranslateZStart: -20, // Initial z-axis position (px, negative = back)
    entranceElementEasing: 'ease-out', // Easing function for element animations
    entrancePerspectiveLandscape: 1200, // Perspective for landscape aspect ratio (px)
    entrancePerspectiveSquare: 1000,   // Perspective for square aspect ratio (px)
    entrancePerspectivePortrait: 800,  // Perspective for portrait aspect ratio (px)
    
    // Link Controls (Panel Tunable)
    uiHitAreaMul: 1,                    // Multiplier for most UI hit areas (links/buttons); drives `--ui-hit-area-mul`
    uiIconCornerRadiusMul: 0.4,         // Icon button corner radius as a fraction of wall radius; drives `--ui-icon-corner-radius-mul`
    uiIconFramePx: 0,                  // Icon button square frame size (px). 0 = use token-derived default
    uiIconGlyphPx: 0,                  // Icon glyph size (px). 0 = use token-derived default
    uiIconGroupMarginPx: 0,            // Social icon group margin (px). Can be negative to push icons outward.
    linkTextPadding: 30,               // Padding for text links (px)
    linkIconPadding: 24,               // Padding for icon links (px)
    linkColorInfluence: 1,            // How much cursor color affects link colors (0-1)
    linkImpactScale: 0.95,             // Scale when link is pressed (0.7-1.0)
    linkImpactBlur: 10,                // Blur amount when link is pressed (px)
    linkImpactDuration: 150,           // Duration of press animation (ms)
    
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

  function clampInt$3(v, min, max, fallback) {
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
    
    // Vertical (top/bottom) stays same, horizontal (left/right) gets mobile factor
    state.containerBorder = Math.round(borderPx); // Y (top/bottom)
    state.containerBorderX = Math.round(borderPx * mobileWallXFactor); // X (left/right)
    state.simulationPadding = Math.round(simPadPx);
    
    // Wall thickness: area-scaled base × mobile factor (matches left/right border)
    state.wallThickness = Math.round(areaScaledThicknessPx * mobileWallXFactor);
    
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
    root.style.setProperty('--container-border-vw', `${baseContainerVw}`);
    root.style.setProperty('--container-border-x-vw', `${baseContainerVw * mobileWallXFactor}`);
    
    const baseThicknessVw = (Number.isFinite(state.wallThicknessVw) && state.wallThicknessVw > 0)
      ? state.wallThicknessVw
      : state.containerBorderVw;
    root.style.setProperty('--wall-thickness-vw', `${baseThicknessVw * mobileWallXFactor}`);
    
    // Edge label inset: relative to wall (wallThickness) + small gap + user adjustment
    const edgeLabelGap = 8; // Base gap between wall and label (px)
    const edgeLabelAdjust = state.edgeLabelInsetAdjustPx || 0;
    const edgeLabelInset = state.wallThickness + edgeLabelGap + edgeLabelAdjust;
    root.style.setProperty('--edge-label-inset', `${edgeLabelInset}px`);
    root.style.setProperty('--edge-label-inset-adjust', `${edgeLabelAdjust}px`);
    
    // True inner offset: wall thickness + content padding (for edge-inset CSS var)
    const edgeInset = state.wallThickness + state.contentPadding;
    root.style.setProperty('--edge-inset', `${edgeInset}px`);
    root.style.setProperty('--edge-inset-lg', `${edgeInset}px`);
    
    // Mobile edge label visibility (CSS only applies this var on mobile via @media)
    const displayValue = (isMobileLayout && state.mobileEdgeLabelsVisible) ? 'flex' : 'none';
    root.style.setProperty('--edge-label-mobile-display', displayValue);

    // UI sizing vars (panel-tunable, but also needed in production without the panel)
    root.style.setProperty('--ui-hit-area-mul', String(state.uiHitAreaMul ?? 1));
    root.style.setProperty('--ui-icon-corner-radius-mul', String(state.uiIconCornerRadiusMul ?? 0.4));

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
    if (config.sizeVariationPitThrows !== undefined) state.sizeVariationPitThrows = clampNumber$1(config.sizeVariationPitThrows, 0, 1, state.sizeVariationPitThrows);
    if (config.sizeVariationFlies !== undefined) state.sizeVariationFlies = clampNumber$1(config.sizeVariationFlies, 0, 1, state.sizeVariationFlies);
    if (config.sizeVariationWeightless !== undefined) state.sizeVariationWeightless = clampNumber$1(config.sizeVariationWeightless, 0, 1, state.sizeVariationWeightless);
    if (config.sizeVariationWater !== undefined) state.sizeVariationWater = clampNumber$1(config.sizeVariationWater, 0, 1, state.sizeVariationWater);
    if (config.sizeVariationVortex !== undefined) state.sizeVariationVortex = clampNumber$1(config.sizeVariationVortex, 0, 1, state.sizeVariationVortex);
    if (config.sizeVariationPingPong !== undefined) state.sizeVariationPingPong = clampNumber$1(config.sizeVariationPingPong, 0, 1, state.sizeVariationPingPong);
    if (config.sizeVariationMagnetic !== undefined) state.sizeVariationMagnetic = clampNumber$1(config.sizeVariationMagnetic, 0, 1, state.sizeVariationMagnetic);
    if (config.sizeVariationBubbles !== undefined) state.sizeVariationBubbles = clampNumber$1(config.sizeVariationBubbles, 0, 1, state.sizeVariationBubbles);
    if (config.sizeVariationKaleidoscope !== undefined) state.sizeVariationKaleidoscope = clampNumber$1(config.sizeVariationKaleidoscope, 0, 1, state.sizeVariationKaleidoscope);
    if (config.sizeVariationOrbit3d !== undefined) state.sizeVariationOrbit3d = clampNumber$1(config.sizeVariationOrbit3d, 0, 1, state.sizeVariationOrbit3d);
    if (config.sizeVariationCritters !== undefined) state.sizeVariationCritters = clampNumber$1(config.sizeVariationCritters, 0, 1, state.sizeVariationCritters);
    if (config.sizeVariationNeural !== undefined) state.sizeVariationNeural = clampNumber$1(config.sizeVariationNeural, 0, 1, state.sizeVariationNeural);
    if (config.sizeVariationLattice !== undefined) state.sizeVariationLattice = clampNumber$1(config.sizeVariationLattice, 0, 1, state.sizeVariationLattice);
    if (config.sizeVariationParallaxLinear !== undefined) state.sizeVariationParallaxLinear = clampNumber$1(config.sizeVariationParallaxLinear, 0, 1, state.sizeVariationParallaxLinear);
    if (config.sizeVariationParallaxPerspective !== undefined) state.sizeVariationParallaxPerspective = clampNumber$1(config.sizeVariationParallaxPerspective, 0, 1, state.sizeVariationParallaxPerspective);
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
        const label = (typeof s.label === 'string' && s.label.trim())
          ? s.label.trim()
          : (typeof b.label === 'string' ? b.label : `Discipline ${i + 1}`);
        const colorIndex = clampInt$3(s.colorIndex, 0, 7, clampInt$3(b.colorIndex, 0, 7, 0));
        const weight = clampInt$3(s.weight, 0, 100, clampInt$3(b.weight, 0, 100, 0));
        out.push({ label, colorIndex, weight });
      }
      state.colorDistribution = out;
    }

    // Warmup frames (per simulation) — integer 0..240
    if (config.pitWarmupFrames !== undefined) state.pitWarmupFrames = clampInt$3(config.pitWarmupFrames, 0, 240, state.pitWarmupFrames);
    if (config.pitThrowsWarmupFrames !== undefined) state.pitThrowsWarmupFrames = clampInt$3(config.pitThrowsWarmupFrames, 0, 240, state.pitThrowsWarmupFrames);
    if (config.fliesWarmupFrames !== undefined) state.fliesWarmupFrames = clampInt$3(config.fliesWarmupFrames, 0, 240, state.fliesWarmupFrames);
    if (config.weightlessWarmupFrames !== undefined) state.weightlessWarmupFrames = clampInt$3(config.weightlessWarmupFrames, 0, 240, state.weightlessWarmupFrames);
    if (config.waterWarmupFrames !== undefined) state.waterWarmupFrames = clampInt$3(config.waterWarmupFrames, 0, 240, state.waterWarmupFrames);
    if (config.vortexWarmupFrames !== undefined) state.vortexWarmupFrames = clampInt$3(config.vortexWarmupFrames, 0, 240, state.vortexWarmupFrames);
    if (config.pingPongWarmupFrames !== undefined) state.pingPongWarmupFrames = clampInt$3(config.pingPongWarmupFrames, 0, 240, state.pingPongWarmupFrames);
    if (config.magneticWarmupFrames !== undefined) state.magneticWarmupFrames = clampInt$3(config.magneticWarmupFrames, 0, 240, state.magneticWarmupFrames);
    if (config.bubblesWarmupFrames !== undefined) state.bubblesWarmupFrames = clampInt$3(config.bubblesWarmupFrames, 0, 240, state.bubblesWarmupFrames);
    if (config.kaleidoscopeWarmupFrames !== undefined) state.kaleidoscopeWarmupFrames = clampInt$3(config.kaleidoscopeWarmupFrames, 0, 240, state.kaleidoscopeWarmupFrames);
    if (config.kaleidoscope1WarmupFrames !== undefined) state.kaleidoscope1WarmupFrames = clampInt$3(config.kaleidoscope1WarmupFrames, 0, 240, state.kaleidoscope1WarmupFrames);
    if (config.kaleidoscope2WarmupFrames !== undefined) state.kaleidoscope2WarmupFrames = clampInt$3(config.kaleidoscope2WarmupFrames, 0, 240, state.kaleidoscope2WarmupFrames);
    if (config.kaleidoscope3WarmupFrames !== undefined) state.kaleidoscope3WarmupFrames = clampInt$3(config.kaleidoscope3WarmupFrames, 0, 240, state.kaleidoscope3WarmupFrames);
    if (config.orbit3dWarmupFrames !== undefined) state.orbit3dWarmupFrames = clampInt$3(config.orbit3dWarmupFrames, 0, 240, state.orbit3dWarmupFrames);
    if (config.orbit3d2WarmupFrames !== undefined) state.orbit3d2WarmupFrames = clampInt$3(config.orbit3d2WarmupFrames, 0, 240, state.orbit3d2WarmupFrames);
    if (config.crittersWarmupFrames !== undefined) state.crittersWarmupFrames = clampInt$3(config.crittersWarmupFrames, 0, 240, state.crittersWarmupFrames);
    if (config.neuralWarmupFrames !== undefined) state.neuralWarmupFrames = clampInt$3(config.neuralWarmupFrames, 0, 240, state.neuralWarmupFrames);
    if (config.latticeWarmupFrames !== undefined) state.latticeWarmupFrames = clampInt$3(config.latticeWarmupFrames, 0, 240, state.latticeWarmupFrames);
    if (config.parallaxLinearWarmupFrames !== undefined) state.parallaxLinearWarmupFrames = clampInt$3(config.parallaxLinearWarmupFrames, 0, 240, state.parallaxLinearWarmupFrames);
    if (config.parallaxPerspectiveWarmupFrames !== undefined) state.parallaxPerspectiveWarmupFrames = clampInt$3(config.parallaxPerspectiveWarmupFrames, 0, 240, state.parallaxPerspectiveWarmupFrames);

    // Ensure sizing baselines are computed immediately after config is applied.
    // (Otherwise per-mode sizing falls back to placeholder values and sliders appear “dead”.)
    updateBallSizes();
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
    if (config.responsiveScaleMobile !== undefined) state.responsiveScaleMobile = config.responsiveScaleMobile;
    if (config.mobileObjectReductionFactor !== undefined) {
      state.mobileObjectReductionFactor = clampNumber$1(
        config.mobileObjectReductionFactor,
        0,
        1,
        state.mobileObjectReductionFactor
      );
    }
    
    // Detect mobile/tablet devices and apply responsive scaling
    detectResponsiveScale();
    
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

    // Kaleidoscope I/II/III overrides (variants)
    if (config.kaleidoscope1BallCount !== undefined) state.kaleidoscope1BallCount = clampNumber$1(config.kaleidoscope1BallCount, 3, 300, state.kaleidoscope1BallCount);
    if (config.kaleidoscope1Wedges !== undefined) state.kaleidoscope1Wedges = clampNumber$1(config.kaleidoscope1Wedges, 3, 24, state.kaleidoscope1Wedges);
    if (config.kaleidoscope1Speed !== undefined) state.kaleidoscope1Speed = clampNumber$1(config.kaleidoscope1Speed, 0.2, 2.0, state.kaleidoscope1Speed);
    if (config.kaleidoscope1DotSizeVh !== undefined) state.kaleidoscope1DotSizeVh = clampNumber$1(config.kaleidoscope1DotSizeVh, 0.1, 6.0, state.kaleidoscope1DotSizeVh);
    if (config.kaleidoscope1DotAreaMul !== undefined) state.kaleidoscope1DotAreaMul = clampNumber$1(config.kaleidoscope1DotAreaMul, 0.1, 2.0, state.kaleidoscope1DotAreaMul);
    if (config.kaleidoscope1SpawnAreaMul !== undefined) state.kaleidoscope1SpawnAreaMul = clampNumber$1(config.kaleidoscope1SpawnAreaMul, 0.2, 2.0, state.kaleidoscope1SpawnAreaMul);
    if (config.kaleidoscope1SizeVariance !== undefined) state.kaleidoscope1SizeVariance = clampNumber$1(config.kaleidoscope1SizeVariance, 0, 1, state.kaleidoscope1SizeVariance);

    if (config.kaleidoscope2BallCount !== undefined) state.kaleidoscope2BallCount = clampNumber$1(config.kaleidoscope2BallCount, 3, 300, state.kaleidoscope2BallCount);
    if (config.kaleidoscope2Wedges !== undefined) state.kaleidoscope2Wedges = clampNumber$1(config.kaleidoscope2Wedges, 3, 24, state.kaleidoscope2Wedges);
    if (config.kaleidoscope2Speed !== undefined) state.kaleidoscope2Speed = clampNumber$1(config.kaleidoscope2Speed, 0.2, 2.0, state.kaleidoscope2Speed);
    if (config.kaleidoscope2DotSizeVh !== undefined) state.kaleidoscope2DotSizeVh = clampNumber$1(config.kaleidoscope2DotSizeVh, 0.1, 6.0, state.kaleidoscope2DotSizeVh);
    if (config.kaleidoscope2DotAreaMul !== undefined) state.kaleidoscope2DotAreaMul = clampNumber$1(config.kaleidoscope2DotAreaMul, 0.1, 2.0, state.kaleidoscope2DotAreaMul);
    if (config.kaleidoscope2SpawnAreaMul !== undefined) state.kaleidoscope2SpawnAreaMul = clampNumber$1(config.kaleidoscope2SpawnAreaMul, 0.2, 2.0, state.kaleidoscope2SpawnAreaMul);
    if (config.kaleidoscope2SizeVariance !== undefined) state.kaleidoscope2SizeVariance = clampNumber$1(config.kaleidoscope2SizeVariance, 0, 1, state.kaleidoscope2SizeVariance);

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
    if (config.neuralBallCount !== undefined) state.neuralBallCount = clampNumber$1(config.neuralBallCount, 8, 260, state.neuralBallCount);
    if (config.neuralLinkDistanceVw !== undefined) state.neuralLinkDistanceVw = clampNumber$1(config.neuralLinkDistanceVw, 1, 50, state.neuralLinkDistanceVw);
    if (config.neuralLineOpacity !== undefined) state.neuralLineOpacity = clampNumber$1(config.neuralLineOpacity, 0, 1, state.neuralLineOpacity);
    if (config.neuralWanderStrength !== undefined) state.neuralWanderStrength = clampNumber$1(config.neuralWanderStrength, 0, 4000, state.neuralWanderStrength);
    if (config.neuralMaxLinksPerBall !== undefined) state.neuralMaxLinksPerBall = clampNumber$1(config.neuralMaxLinksPerBall, 0, 16, state.neuralMaxLinksPerBall);
    if (config.neuralDamping !== undefined) state.neuralDamping = clampNumber$1(config.neuralDamping, 0.8, 1.0, state.neuralDamping);

    // Lattice (config overrides)
    if (config.latticeBallCount !== undefined) state.latticeBallCount = clampNumber$1(config.latticeBallCount, 8, 260, state.latticeBallCount);
    if (config.latticeSpacingVw !== undefined) state.latticeSpacingVw = clampNumber$1(config.latticeSpacingVw, 1, 40, state.latticeSpacingVw);
    if (config.latticeStiffness !== undefined) state.latticeStiffness = clampNumber$1(config.latticeStiffness, 0, 20, state.latticeStiffness);
    if (config.latticeDamping !== undefined) state.latticeDamping = clampNumber$1(config.latticeDamping, 0.5, 1.0, state.latticeDamping);
    if (config.latticeDisruptRadius !== undefined) state.latticeDisruptRadius = clampNumber$1(config.latticeDisruptRadius, 50, 800, state.latticeDisruptRadius);
    if (config.latticeDisruptPower !== undefined) state.latticeDisruptPower = clampNumber$1(config.latticeDisruptPower, 0, 20, state.latticeDisruptPower);
    if (config.latticeMeshWaveStrength !== undefined) state.latticeMeshWaveStrength = clampNumber$1(config.latticeMeshWaveStrength, 0, 50, state.latticeMeshWaveStrength);
    if (config.latticeMeshWaveSpeed !== undefined) state.latticeMeshWaveSpeed = clampNumber$1(config.latticeMeshWaveSpeed, 0, 3.0, state.latticeMeshWaveSpeed);
    if (config.latticeAlignment !== undefined) state.latticeAlignment = String(config.latticeAlignment);

    // Parallax (config overrides)
    if (config.parallaxLinearDotCount !== undefined) state.parallaxLinearDotCount = clampNumber$1(config.parallaxLinearDotCount, 20, 220, state.parallaxLinearDotCount);
    if (config.parallaxLinearGridJitter !== undefined) state.parallaxLinearGridJitter = clampNumber$1(config.parallaxLinearGridJitter, 0, 1, state.parallaxLinearGridJitter);
    if (config.parallaxLinearFarSpeed !== undefined) state.parallaxLinearFarSpeed = clampNumber$1(config.parallaxLinearFarSpeed, 0, 1.5, state.parallaxLinearFarSpeed);
    if (config.parallaxLinearMidSpeed !== undefined) state.parallaxLinearMidSpeed = clampNumber$1(config.parallaxLinearMidSpeed, 0, 1.5, state.parallaxLinearMidSpeed);
    if (config.parallaxLinearNearSpeed !== undefined) state.parallaxLinearNearSpeed = clampNumber$1(config.parallaxLinearNearSpeed, 0, 1.5, state.parallaxLinearNearSpeed);
    if (config.parallaxLinearGridX !== undefined) state.parallaxLinearGridX = clampInt$3(config.parallaxLinearGridX, 3, 40, state.parallaxLinearGridX);
    if (config.parallaxLinearGridY !== undefined) state.parallaxLinearGridY = clampInt$3(config.parallaxLinearGridY, 3, 40, state.parallaxLinearGridY);
    if (config.parallaxLinearGridZ !== undefined) state.parallaxLinearGridZ = clampInt$3(config.parallaxLinearGridZ, 2, 20, state.parallaxLinearGridZ);
    if (config.parallaxLinearSpanX !== undefined) state.parallaxLinearSpanX = clampNumber$1(config.parallaxLinearSpanX, 0.2, 3.0, state.parallaxLinearSpanX);
    if (config.parallaxLinearSpanY !== undefined) state.parallaxLinearSpanY = clampNumber$1(config.parallaxLinearSpanY, 0.2, 3.0, state.parallaxLinearSpanY);
    if (config.parallaxLinearZNear !== undefined) state.parallaxLinearZNear = clampNumber$1(config.parallaxLinearZNear, 10, 1200, state.parallaxLinearZNear);
    if (config.parallaxLinearZFar !== undefined) state.parallaxLinearZFar = clampNumber$1(config.parallaxLinearZFar, 50, 3000, state.parallaxLinearZFar);
    if (config.parallaxLinearFocalLength !== undefined) state.parallaxLinearFocalLength = clampNumber$1(config.parallaxLinearFocalLength, 80, 2000, state.parallaxLinearFocalLength);
    if (config.parallaxLinearParallaxStrength !== undefined) state.parallaxLinearParallaxStrength = clampNumber$1(config.parallaxLinearParallaxStrength, 0, 2000, state.parallaxLinearParallaxStrength);
    if (config.parallaxLinearDotSizeMul !== undefined) state.parallaxLinearDotSizeMul = clampNumber$1(config.parallaxLinearDotSizeMul, 0.1, 6.0, state.parallaxLinearDotSizeMul);
    if (config.parallaxLinearFollowStrength !== undefined) state.parallaxLinearFollowStrength = clampNumber$1(config.parallaxLinearFollowStrength, 1, 80, state.parallaxLinearFollowStrength);
    if (config.parallaxLinearDamping !== undefined) state.parallaxLinearDamping = clampNumber$1(config.parallaxLinearDamping, 1, 80, state.parallaxLinearDamping);
    if (config.parallaxPerspectiveDotCount !== undefined) state.parallaxPerspectiveDotCount = clampNumber$1(config.parallaxPerspectiveDotCount, 40, 420, state.parallaxPerspectiveDotCount);
    if (config.parallaxPerspectiveDepthMul !== undefined) state.parallaxPerspectiveDepthMul = clampNumber$1(config.parallaxPerspectiveDepthMul, 0.5, 3.0, state.parallaxPerspectiveDepthMul);
    if (config.parallaxPerspectiveFocalLength !== undefined) state.parallaxPerspectiveFocalLength = clampNumber$1(config.parallaxPerspectiveFocalLength, 80, 1000, state.parallaxPerspectiveFocalLength);
    if (config.parallaxPerspectiveFollowStrength !== undefined) state.parallaxPerspectiveFollowStrength = clampNumber$1(config.parallaxPerspectiveFollowStrength, 1, 40, state.parallaxPerspectiveFollowStrength);
    if (config.parallaxPerspectiveDamping !== undefined) state.parallaxPerspectiveDamping = clampNumber$1(config.parallaxPerspectiveDamping, 1, 40, state.parallaxPerspectiveDamping);
    if (config.parallaxPerspectiveZ1 !== undefined) state.parallaxPerspectiveZ1 = clampNumber$1(config.parallaxPerspectiveZ1, 200, 2000, state.parallaxPerspectiveZ1);
    if (config.parallaxPerspectiveZ2 !== undefined) state.parallaxPerspectiveZ2 = clampNumber$1(config.parallaxPerspectiveZ2, 150, 1500, state.parallaxPerspectiveZ2);
    if (config.parallaxPerspectiveZ3 !== undefined) state.parallaxPerspectiveZ3 = clampNumber$1(config.parallaxPerspectiveZ3, 100, 1000, state.parallaxPerspectiveZ3);
    if (config.parallaxPerspectiveZ4 !== undefined) state.parallaxPerspectiveZ4 = clampNumber$1(config.parallaxPerspectiveZ4, 40, 600, state.parallaxPerspectiveZ4);
    if (config.parallaxPerspectiveZ5 !== undefined) state.parallaxPerspectiveZ5 = clampNumber$1(config.parallaxPerspectiveZ5, 10, 300, state.parallaxPerspectiveZ5);
    if (config.parallaxPerspectiveGridX !== undefined) state.parallaxPerspectiveGridX = clampInt$3(config.parallaxPerspectiveGridX, 3, 50, state.parallaxPerspectiveGridX);
    if (config.parallaxPerspectiveGridY !== undefined) state.parallaxPerspectiveGridY = clampInt$3(config.parallaxPerspectiveGridY, 3, 50, state.parallaxPerspectiveGridY);
    if (config.parallaxPerspectiveGridZ !== undefined) state.parallaxPerspectiveGridZ = clampInt$3(config.parallaxPerspectiveGridZ, 2, 25, state.parallaxPerspectiveGridZ);
    if (config.parallaxPerspectiveSpanX !== undefined) state.parallaxPerspectiveSpanX = clampNumber$1(config.parallaxPerspectiveSpanX, 0.2, 3.0, state.parallaxPerspectiveSpanX);
    if (config.parallaxPerspectiveSpanY !== undefined) state.parallaxPerspectiveSpanY = clampNumber$1(config.parallaxPerspectiveSpanY, 0.2, 3.0, state.parallaxPerspectiveSpanY);
    if (config.parallaxPerspectiveZNear !== undefined) state.parallaxPerspectiveZNear = clampNumber$1(config.parallaxPerspectiveZNear, 10, 1200, state.parallaxPerspectiveZNear);
    if (config.parallaxPerspectiveZFar !== undefined) state.parallaxPerspectiveZFar = clampNumber$1(config.parallaxPerspectiveZFar, 50, 4000, state.parallaxPerspectiveZFar);
    if (config.parallaxPerspectiveParallaxStrength !== undefined) state.parallaxPerspectiveParallaxStrength = clampNumber$1(config.parallaxPerspectiveParallaxStrength, 0, 2000, state.parallaxPerspectiveParallaxStrength);
    if (config.parallaxPerspectiveRandomness !== undefined) state.parallaxPerspectiveRandomness = clampNumber$1(config.parallaxPerspectiveRandomness, 0, 1, state.parallaxPerspectiveRandomness);
    if (config.parallaxPerspectiveDotSizeMul !== undefined) state.parallaxPerspectiveDotSizeMul = clampNumber$1(config.parallaxPerspectiveDotSizeMul, 0.1, 6.0, state.parallaxPerspectiveDotSizeMul);

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
      // If not set, use light mode value as fallback for legacy frameColor
      state.frameColor = state.frameColorLight;
    }
    
    // Text colors
    if (config.textColorLight !== undefined) state.textColorLight = config.textColorLight;
    else state.textColorLight = readTokenVar('--text-color-light', state.textColorLight);
    if (config.textColorLightMuted !== undefined) state.textColorLightMuted = config.textColorLightMuted;
    else state.textColorLightMuted = readTokenVar('--text-color-light-muted', state.textColorLightMuted);
    if (config.textColorDark !== undefined) state.textColorDark = config.textColorDark;
    else state.textColorDark = readTokenVar('--text-color-dark', state.textColorDark);
    if (config.textColorDarkMuted !== undefined) state.textColorDarkMuted = config.textColorDarkMuted;
    else state.textColorDarkMuted = readTokenVar('--text-color-dark-muted', state.textColorDarkMuted);
    if (config.edgeLabelColorLight !== undefined) state.edgeLabelColorLight = config.edgeLabelColorLight;
    else state.edgeLabelColorLight = readTokenVar('--edge-label-color-light', state.edgeLabelColorLight);
    if (config.edgeLabelColorDark !== undefined) state.edgeLabelColorDark = config.edgeLabelColorDark;
    else state.edgeLabelColorDark = readTokenVar('--edge-label-color-dark', state.edgeLabelColorDark);
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
      state.uiIconFramePx = clampInt$3(config.uiIconFramePx, 0, 240, state.uiIconFramePx);
    } else {
      state.uiIconFramePx = clampInt$3(readTokenPx('--ui-icon-frame-size', state.uiIconFramePx), 0, 240, state.uiIconFramePx);
    }
    if (config.uiIconGlyphPx !== undefined) {
      state.uiIconGlyphPx = clampInt$3(config.uiIconGlyphPx, 0, 120, state.uiIconGlyphPx);
    } else {
      state.uiIconGlyphPx = clampInt$3(readTokenPx('--ui-icon-glyph-size', state.uiIconGlyphPx), 0, 120, state.uiIconGlyphPx);
    }
    if (config.uiIconGroupMarginPx !== undefined) {
      state.uiIconGroupMarginPx = clampInt$3(config.uiIconGroupMarginPx, -200, 200, state.uiIconGroupMarginPx);
    } else {
      state.uiIconGroupMarginPx = clampInt$3(readTokenPx('--ui-icon-group-margin', state.uiIconGroupMarginPx), -200, 200, state.uiIconGroupMarginPx);
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
      state.linkImpactDuration = clampInt$3(config.linkImpactDuration, 0, 3000, state.linkImpactDuration);
    }
    
    // Logo colors
    if (config.logoColorLight !== undefined) state.logoColorLight = config.logoColorLight;
    else state.logoColorLight = readTokenVar('--logo-color-light', state.logoColorLight);
    if (config.logoColorDark !== undefined) state.logoColorDark = config.logoColorDark;
    else state.logoColorDark = readTokenVar('--logo-color-dark', state.logoColorDark);
    
    // Portfolio logo colors (separate from index)
    if (config.portfolioLogoColorLight !== undefined) state.portfolioLogoColorLight = config.portfolioLogoColorLight;
    else state.portfolioLogoColorLight = readTokenVar('--portfolio-logo-color-light', state.portfolioLogoColorLight);
    if (config.portfolioLogoColorDark !== undefined) state.portfolioLogoColorDark = config.portfolioLogoColorDark;
    else state.portfolioLogoColorDark = readTokenVar('--portfolio-logo-color-dark', state.portfolioLogoColorDark);
    
    // Noise texture opacity (visual overlay)
    if (config.noiseBackOpacity !== undefined) state.noiseBackOpacity = clampNumber$1(config.noiseBackOpacity, 0, 0.3, state.noiseBackOpacity);
    if (config.noiseFrontOpacity !== undefined) state.noiseFrontOpacity = clampNumber$1(config.noiseFrontOpacity, 0, 0.3, state.noiseFrontOpacity);
    if (config.noiseBackOpacityDark !== undefined) state.noiseBackOpacityDark = clampNumber$1(config.noiseBackOpacityDark, 0, 0.5, state.noiseBackOpacityDark);
    if (config.noiseFrontOpacityDark !== undefined) state.noiseFrontOpacityDark = clampNumber$1(config.noiseFrontOpacityDark, 0, 0.5, state.noiseFrontOpacityDark);

    // Procedural noise (no GIF): texture + motion + look
    if (config.noiseEnabled !== undefined) state.noiseEnabled = Boolean(config.noiseEnabled);
    if (config.noiseSeed !== undefined) state.noiseSeed = clampInt$3(config.noiseSeed, 0, 999999, state.noiseSeed);
    if (config.noiseTextureSize !== undefined) state.noiseTextureSize = clampInt$3(config.noiseTextureSize, 64, 512, state.noiseTextureSize);
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
    if (config.noiseSpeedBackMs !== undefined) state.noiseSpeedBackMs = clampInt$3(config.noiseSpeedBackMs, 0, 10000, state.noiseSpeedBackMs);
    if (config.noiseSpeedFrontMs !== undefined) state.noiseSpeedFrontMs = clampInt$3(config.noiseSpeedFrontMs, 0, 10000, state.noiseSpeedFrontMs);
    if (config.noiseFlicker !== undefined) state.noiseFlicker = clampNumber$1(config.noiseFlicker, 0, 1, state.noiseFlicker);
    if (config.noiseFlickerSpeedMs !== undefined) state.noiseFlickerSpeedMs = clampInt$3(config.noiseFlickerSpeedMs, 0, 5000, state.noiseFlickerSpeedMs);
    if (config.noiseBlurPx !== undefined) state.noiseBlurPx = clampNumber$1(config.noiseBlurPx, 0, 6, state.noiseBlurPx);
    if (config.noiseContrast !== undefined) state.noiseContrast = clampNumber$1(config.noiseContrast, 0.25, 5, state.noiseContrast);
    if (config.noiseBrightness !== undefined) state.noiseBrightness = clampNumber$1(config.noiseBrightness, 0.25, 3, state.noiseBrightness);
    if (config.noiseSaturation !== undefined) state.noiseSaturation = clampNumber$1(config.noiseSaturation, 0, 3, state.noiseSaturation);
    if (config.noiseHue !== undefined) state.noiseHue = clampNumber$1(config.noiseHue, 0, 360, state.noiseHue);
    if (config.noiseSizeBase !== undefined) state.noiseSizeBase = clampNumber$1(config.noiseSizeBase, 20, 400, state.noiseSizeBase);
    if (config.noiseSizeTop !== undefined) state.noiseSizeTop = clampNumber$1(config.noiseSizeTop, 20, 600, state.noiseSizeTop);
    if (config.noiseTopOpacity !== undefined) state.noiseTopOpacity = clampNumber$1(config.noiseTopOpacity, 0, 0.25, state.noiseTopOpacity);
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
    if (config.gateOverlayEnabled !== undefined) state.gateOverlayEnabled = config.gateOverlayEnabled;
    if (config.gateOverlayOpacity !== undefined) state.gateOverlayOpacity = config.gateOverlayOpacity;
    if (config.gateOverlayBlurPx !== undefined) state.gateOverlayBlurPx = config.gateOverlayBlurPx;
    if (config.gateOverlayTransitionMs !== undefined) state.gateOverlayTransitionMs = config.gateOverlayTransitionMs;
    if (config.gateOverlayTransitionOutMs !== undefined) state.gateOverlayTransitionOutMs = config.gateOverlayTransitionOutMs;
    
    // Orbit 3D mode (simplified energetic physics)
    if (config.orbit3dMoonCount !== undefined) state.orbit3dMoonCount = clampNumber$1(config.orbit3dMoonCount, 1, 1000, state.orbit3dMoonCount);
    if (config.orbit3dGravity !== undefined) state.orbit3dGravity = clampNumber$1(config.orbit3dGravity, 1000, 500000, state.orbit3dGravity);
    if (config.orbit3dMoonMass !== undefined) state.orbit3dMoonMass = clampNumber$1(config.orbit3dMoonMass, 0.1, 100, state.orbit3dMoonMass);
    if (config.orbit3dVelocityMult !== undefined) state.orbit3dVelocityMult = clampNumber$1(config.orbit3dVelocityMult, 10, 1000, state.orbit3dVelocityMult);
    if (config.orbit3dTargetOrbit !== undefined) state.orbit3dTargetOrbit = clampNumber$1(config.orbit3dTargetOrbit, 1, 100, state.orbit3dTargetOrbit);
    if (config.orbit3dMinOrbit !== undefined) state.orbit3dMinOrbit = clampNumber$1(config.orbit3dMinOrbit, 1, 100, state.orbit3dMinOrbit);
    if (config.orbit3dMaxOrbit !== undefined) state.orbit3dMaxOrbit = clampNumber$1(config.orbit3dMaxOrbit, 1, 200, state.orbit3dMaxOrbit);
    if (config.orbit3dDepthScale !== undefined) state.orbit3dDepthScale = clampNumber$1(config.orbit3dDepthScale, 0, 1.5, state.orbit3dDepthScale);
    if (config.orbit3dDamping !== undefined) state.orbit3dDamping = clampNumber$1(config.orbit3dDamping, 0.01, 0.2, state.orbit3dDamping);

    // Orbit 3D Mode 2 (tight swarm)
    if (config.orbit3d2MoonCount !== undefined) state.orbit3d2MoonCount = clampNumber$1(config.orbit3d2MoonCount, 1, 300, state.orbit3d2MoonCount);
    if (config.orbit3d2Gravity !== undefined) state.orbit3d2Gravity = clampNumber$1(config.orbit3d2Gravity, 1000, 500000, state.orbit3d2Gravity);
    if (config.orbit3d2VelocityMult !== undefined) state.orbit3d2VelocityMult = clampNumber$1(config.orbit3d2VelocityMult, 0.1, 2.0, state.orbit3d2VelocityMult);
    if (config.orbit3d2MinOrbit !== undefined) state.orbit3d2MinOrbit = clampNumber$1(config.orbit3d2MinOrbit, 1, 50, state.orbit3d2MinOrbit);
    if (config.orbit3d2MaxOrbit !== undefined) state.orbit3d2MaxOrbit = clampNumber$1(config.orbit3d2MaxOrbit, 1, 50, state.orbit3d2MaxOrbit);
    if (config.orbit3d2DepthScale !== undefined) state.orbit3d2DepthScale = clampNumber$1(config.orbit3d2DepthScale, 0, 0.95, state.orbit3d2DepthScale);
    if (config.orbit3d2Damping !== undefined) state.orbit3d2Damping = clampNumber$1(config.orbit3d2Damping, 0, 1, state.orbit3d2Damping);
    if (config.orbit3d2FollowSmoothing !== undefined) state.orbit3d2FollowSmoothing = clampNumber$1(config.orbit3d2FollowSmoothing, 1, 200, state.orbit3d2FollowSmoothing);
    if (config.orbit3d2Softening !== undefined) state.orbit3d2Softening = clampNumber$1(config.orbit3d2Softening, 1, 100, state.orbit3d2Softening);

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
    if (config.mobileWallThicknessXFactor !== undefined) state.mobileWallThicknessXFactor = clampNumber$1(config.mobileWallThicknessXFactor, 0.5, 3.0, state.mobileWallThicknessXFactor);
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
    if (!globals.isMobile) return Math.max(0, n);
    const factor = Math.max(0, Math.min(1, Number(globals.mobileObjectReductionFactor ?? 0.7)));
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
   * Detect device type and apply responsive ball scaling
   * iPad and iPhone get smaller balls for better visual balance
   */
  function detectResponsiveScale() {
    const ua = navigator.userAgent || '';
    const isIPad = /iPad/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
    const isIPhone = /iPhone/.test(ua);

    // Viewport breakpoint (lets desktop “responsive mode” behave like mobile)
    let isMobileViewport = false;
    try {
      isMobileViewport = Boolean(window.matchMedia && window.matchMedia('(max-width: 600px)').matches);
    } catch (e) {}

    const isMobileDevice = Boolean(isIPad || isIPhone);
    const nextMobileViewport = isMobileViewport;
    const nextMobileDevice = isMobileDevice;
    const nextResponsiveScale = (isMobileDevice || isMobileViewport) ? state.responsiveScaleMobile : 1.0;

    // Early-out: avoid work during resize drags unless we actually cross a breakpoint / scale changes.
    const didChange =
      state.isMobile !== nextMobileDevice ||
      state.isMobileViewport !== nextMobileViewport ||
      Math.abs((state.responsiveScale ?? 1.0) - nextResponsiveScale) > 1e-6;
    if (!didChange) return;

    state.isMobile = nextMobileDevice;
    state.isMobileViewport = nextMobileViewport;
    state.responsiveScale = nextResponsiveScale;

    if (state.isMobile || state.isMobileViewport) {
      console.log(`✓ Mobile scaling active - ball scale: ${state.responsiveScale}x (${state.isMobile ? 'device' : 'viewport'})`);
    }

    // Recalculate ball sizes with responsive scale applied
    updateBallSizes();

    // Update existing balls only when the scale actually changes (resize-safe).
    try {
      const newSize = (state.R_MIN + state.R_MAX) / 2;
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
   * Update ball size calculations based on current sizeScale and responsiveScale
   */
  function updateBallSizes() {
    const baseSize = (state.R_MIN_BASE + state.R_MAX_BASE) / 2;
    const totalScale = state.sizeScale * state.responsiveScale;
    const medium = baseSize * totalScale;
    state.R_MED = Math.max(1, medium);
    // R_MIN/R_MAX are the absolute cap for “max variation” (per-mode=1, globalMul=1).
    // Individual modes scale within this cap using their own 0..1 slider.
    const capMax = 0.2;
    const cap = clampNumber$1(state.sizeVariationCap, 0, capMax, 0.12);
    const mul = clampNumber$1(state.sizeVariationGlobalMul, 0, 2, 1.0);
    const v = clampNumber$1(cap * mul, 0, capMax, cap);
    state.R_MIN = Math.max(1, state.R_MED * (1 - v));
    state.R_MAX = Math.max(state.R_MIN, state.R_MED * (1 + v));
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

  function clampInt$2(v, min, max) {
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

  function srgbToLinear$1(c) {
    return c <= 0.04045 ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance$1(hex) {
    const rgb = hexToRgb01(hex);
    if (!rgb) return 1;
    const r = srgbToLinear$1(rgb.r);
    const g = srgbToLinear$1(rgb.g);
    const b = srgbToLinear$1(rgb.b);
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

  function stampCursorCSSVar(hex) {
    try {
      document.documentElement.style.setProperty('--cursor-color', String(hex).trim() || '#000000');
    } catch (_) { /* no-op */ }
  }

  function resolveCursorHexFromIndex(colors, idx) {
    const list = colors && colors.length ? colors : [];
    const i = clampInt$2(idx, 0, Math.max(0, Math.min(7, list.length - 1)));
    return list[i] || '#000000';
  }

  function getCursorCandidateIndices(colors, globalsOverride) {
    const g = globalsOverride || getGlobals();
    const list = colors && colors.length ? colors : [];
    const maxIdx = Math.min(7, list.length - 1);
    if (maxIdx < 0) return [];

    const lumaMax = Number.isFinite(Number(g.cursorColorLumaMax)) ? Number(g.cursorColorLumaMax) : 0.62;
    const allow = isArrayOfNumbers(g.cursorColorAllowIndices)
      ? g.cursorColorAllowIndices.map(x => clampInt$2(x, 0, 7))
      : [];
    const deny = isArrayOfNumbers(g.cursorColorDenyIndices)
      ? g.cursorColorDenyIndices.map(x => clampInt$2(x, 0, 7))
      : [];

    const denySet = new Set(deny);
    const allowSet = allow.length ? new Set(allow) : null;

    const out = [];
    for (let i = 0; i <= maxIdx; i++) {
      if (denySet.has(i)) continue;
      if (allowSet && !allowSet.has(i)) continue;
      const hex = list[i];
      if (!hex) continue;
      const luma = relativeLuminance$1(hex);
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
    const desired = clampInt$2(index, 0, 7);
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
    return globals.isDarkMode ? template.dark : template.light;
  }

  function pickRandomColor() {
    const globals = getGlobals();
    const colors = globals.currentColors;
    
    if (!colors || colors.length === 0) {
      console.warn('No colors available, using fallback');
      return '#ffffff';
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
            return colors[idx] || colors[0] || '#ffffff';
          }
        }
        // Numeric edge case: fall through to a deterministic row.
        const last = dist[dist.length - 1];
        const idx = clampIntFallback(last?.colorIndex, 0, 7, 0);
        return colors[idx] || colors[0] || '#ffffff';
      }
    }

    // Fallback: legacy weights over the first 8 palette entries.
    const random = Math.random();
    let cumulativeWeight = 0;
    const maxIdx = Math.min(colors.length, LEGACY_COLOR_WEIGHTS.length, 8);
    for (let i = 0; i < maxIdx; i++) {
      cumulativeWeight += LEGACY_COLOR_WEIGHTS[i];
      if (random <= cumulativeWeight) return colors[i];
    }
    return colors[Math.min(colors.length - 1, 7)] || '#ffffff';
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

  var colors = /*#__PURE__*/Object.freeze({
    __proto__: null,
    COLOR_TEMPLATES: COLOR_TEMPLATES,
    PALETTE_CHAPTER_ORDER: PALETTE_CHAPTER_ORDER,
    applyColorTemplate: applyColorTemplate,
    applyCursorColorIndex: applyCursorColorIndex,
    getCurrentPalette: getCurrentPalette,
    getCursorCandidateIndices: getCursorCandidateIndices,
    maybeAutoPickCursorColor: maybeAutoPickCursorColor,
    pickRandomColor: pickRandomColor,
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
  let prefersReducedMotion$2 = false;

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
      prefersReducedMotion$2 = motionQuery.matches;
      motionQuery.addEventListener('change', (e) => {
        prefersReducedMotion$2 = e.matches;
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
    if (!isEnabled$1 || !isUnlocked || !audioContext || prefersReducedMotion$2) return;
    
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
    
    reusablePairs.sort((a, b) => b.overlap - a.overlap);
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
        const isPitLike = (globals.currentMode === 'pit' || globals.currentMode === 'pit-throws');
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
  const RING_SAMPLES = 384; // Very high density for ultra-smooth corners (still performant on modern hardware)
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
      // Offsets for new starting point: MIDDLE OF BOTTOM EDGE (least visible seam location)
      // Segment order: bottom-middle -> bottom-right arc -> right -> top-right arc -> top -> top-left arc -> left -> bottom-left arc -> back to bottom-middle
      // Start at middle of bottom edge, go clockwise
      this._offBottom = 0;                  // Start: middle of bottom straight (going right -> left)
      this._offBottomRight = Lt / 2;        // Start: bottom-right arc
      this._offRight = Lt / 2 + La;         // Start: right straight
      this._offTopRight = Lt / 2 + La + Lr; // Start: top-right arc
      this._offTop = Lt / 2 + La + Lr + La; // Start: top straight
      this._offTopLeft = Lt / 2 + La + Lr + La + Lt; // Start: top-left arc
      this._offLeft = Lt / 2 + La + Lr + La + Lt + La; // Start: left straight
      this._offBottomLeft = Lt / 2 + La + Lr + La + Lt + La + Lr; // Start: bottom-left arc
      // Bottom straight continues from bottom-left arc back to start (wraps at Lt / 2 + La + Lr + La + Lt + La + Lr + La)

      // Precompute per-sample point + inward normal.
      // Perimeter order is clockwise, starting at MIDDLE OF BOTTOM EDGE.
      // This places the seam in the middle of the bottom edge (least visible location).
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

      // Define segment boundaries (cumulative distances from start)
      const seg0_end = Lt / 2;                    // Bottom right half
      const seg1_end = seg0_end + La;            // Bottom-right arc
      const seg2_end = seg1_end + Lr;            // Right straight
      const seg3_end = seg2_end + La;            // Top-right arc
      const seg4_end = seg3_end + Lt;            // Top straight
      const seg5_end = seg4_end + La;            // Top-left arc
      const seg6_end = seg5_end + Lr;            // Left straight
      const seg7_end = seg6_end + La;            // Bottom-left arc
      // seg8_end = seg7_end + Lt/2 = L (wraps to start)

      // Key positions
      const middleX = r0 + (Lt / 2); // Middle of bottom edge = w0/2
      const rightCornerX = w0 - r0;
      const leftCornerX = r0;

      for (let i = 0; i < n; i++) {
        // Start at MIDDLE OF BOTTOM EDGE, go clockwise
        let s = ((i / n) * L + (Lt / 2)) % L;
        let x = 0, y = 0, nx = 0, ny = 0;
        let isCorner = 0;

        if (s < seg0_end) {
          // Segment 0: Bottom right half (middle -> right corner)
          x = middleX + s;
          y = h0;
          nx = 0;
          ny = -1;
        } else if (s < seg1_end) {
          // Segment 1: Bottom-right arc (bottom edge -> right edge)
          const t = (s - seg0_end) / La;
          const pt = arcPoint(w0 - r0, h0 - r0, r0, Math.PI / 2, 0, t);
          x = pt.x;
          y = pt.y;
          nx = pt.nx;
          ny = pt.ny;
          isCorner = 1;
        } else if (s < seg2_end) {
          // Segment 2: Right straight (bottom -> top)
          // After bottom-right arc ends at (w0, h0-r0), go UP to (w0, r0)
          const t = s - seg1_end;
          x = w0;
          y = (h0 - r0) - t;  // FIXED: y decreases from h0-r0 to r0
          nx = -1;
          ny = 0;
        } else if (s < seg3_end) {
          // Segment 3: Top-right arc (right edge -> top edge)
          const t = (s - seg2_end) / La;
          const pt = arcPoint(w0 - r0, r0, r0, 0, -Math.PI / 2, t);
          x = pt.x;
          y = pt.y;
          nx = pt.nx;
          ny = pt.ny;
          isCorner = 1;
        } else if (s < seg4_end) {
          // Segment 4: Top straight (right -> left)
          const t = s - seg3_end;
          x = rightCornerX - t;
          y = 0;
          nx = 0;
          ny = 1;
        } else if (s < seg5_end) {
          // Segment 5: Top-left arc (top edge -> left edge)
          // Start at (r0, 0) = top edge left point (angle = -π/2 = 3π/2)
          // End at (0, r0) = left edge top point (angle = π)
          // Going clockwise in screen coords: angle decreases from 3π/2 to π
          const t = (s - seg4_end) / La;
          const pt = arcPoint(r0, r0, r0, 3 * Math.PI / 2, Math.PI, t);  // FIXED: swapped angles
          x = pt.x;
          y = pt.y;
          nx = pt.nx;
          ny = pt.ny;
          isCorner = 1;
        } else if (s < seg6_end) {
          // Segment 6: Left straight (top -> bottom)
          // After top-left arc ends at (0, r0), go DOWN to (0, h0-r0)
          const t = s - seg5_end;
          x = 0;
          y = r0 + t;  // FIXED: y increases from r0 to h0-r0
          nx = 1;
          ny = 0;
        } else if (s < seg7_end) {
          // Segment 7: Bottom-left arc (left edge -> bottom edge)
          const t = (s - seg6_end) / La;
          const pt = arcPoint(r0, h0 - r0, r0, Math.PI, Math.PI / 2, t);
          x = pt.x;
          y = pt.y;
          nx = pt.nx;
          ny = pt.ny;
          isCorner = 1;
        } else {
          // Segment 8: Bottom left half (left corner -> middle, wraps to start)
          const t = s - seg7_end;
          x = leftCornerX + t;
          y = h0;
          nx = 0;
          ny = -1;
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

      // Corner "stickiness" now acts as corner stiffness boost (continuous, no hard pins).
      const cornerClamp = Math.max(0, Math.min(1, Number(g.wallWobbleCornerClamp) || 0));
      const cornerStiffMul = 1 + 5.0 * cornerClamp;

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

        // Local stiffness boost on corner samples (keeps the classic "stable corners" feel).
        // For straight edges: much stronger base stiffness to prevent sagging and maintain robust rounded rectangle.
        const isCorner = this.cornerMask[i] ? 1 : 0;
        // Identify top edge specifically for extra stiffness (including samples near top corners)
        // Use a more lenient threshold to catch all top edge samples, including near corners
        // Check both by Y position and normal direction to catch edge cases
        const isTopEdge = !isCorner && this.baseY[i] < 1.0 && this.normY[i] > 0.7;
        // Also check if sample is near top corners (within corner radius) - treat them like top edge
        // Be more lenient for top-left corner area
        const nearTopLeftCorner = !isCorner && this.baseX[i] < this._r + 2.0 && this.baseY[i] < this._r + 2.0;
        const nearTopRightCorner = !isCorner && this.baseX[i] > this._w - this._r - 1.0 && this.baseY[i] < this._r + 1.0;
        const isNearTopCorner = nearTopLeftCorner || nearTopRightCorner;
        // Check if this IS a top corner sample (actual corner arc)
        // Use position-based detection for reliability - be more lenient for top-left corner
        // Top-left corner: near (r, r) with Y < r+3 (more lenient since it's on arc)
        // Top-right corner: near (w-r, r) with Y < r+2
        const isTopLeftCorner = isCorner && this.baseX[i] < this._r + 3.0 && this.baseY[i] < this._r + 3.0;
        const isTopRightCorner = isCorner && this.baseX[i] > this._w - this._r - 2.0 && this.baseY[i] < this._r + 2.0;
        // Top corners get extra stiffness boost (on top of corner multiplier) to match top edge robustness
        // Top-left corner gets even more boost since it's at wrap-around point
        const topCornerStiffBoost = isTopLeftCorner ? 3.0 : (isTopRightCorner ? 2.0 : 1.0);
        // Top edge (including near corners) gets 4x stiffness, other straight edges get 2x, corners get corner multiplier
        const straightEdgeStiffMul = isCorner ? topCornerStiffBoost : ((isTopEdge || isNearTopCorner) ? 4.0 : 2.0);
        const kLocal = stiffnessBase * (isCorner ? (cornerStiffMul * topCornerStiffBoost) : straightEdgeStiffMul);

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
        // Much more aggressive snap-to-zero for straight edges, especially top edge.
        const isStraightEdge = !this.cornerMask[i];
        // Recompute isTopEdge here with same logic as above for consistency
        const isTopEdgeSnap = !isCorner && this.baseY[i] < 1.0 && this.normY[i] > 0.7;
        // Also check if sample is near top corners - treat them like top edge
        // Be more lenient for top-left corner area
        const nearTopLeftCornerSnap = !isCorner && this.baseX[i] < this._r + 2.0 && this.baseY[i] < this._r + 2.0;
        const nearTopRightCornerSnap = !isCorner && this.baseX[i] > this._w - this._r - 1.0 && this.baseY[i] < this._r + 1.0;
        const isNearTopCornerSnap = nearTopLeftCornerSnap || nearTopRightCornerSnap;
        // Check if this IS a top corner sample (actual corner arc)
        // Use position-based detection for reliability - be more lenient for top-left corner
        const isTopLeftCornerSnap = isCorner && this.baseX[i] < this._r + 3.0 && this.baseY[i] < this._r + 3.0;
        const isTopRightCornerSnap = isCorner && this.baseX[i] > this._w - this._r - 2.0 && this.baseY[i] < this._r + 2.0;
        const isTopCornerSnap = isTopLeftCornerSnap || isTopRightCornerSnap;
        // Top edge and top corners (including nearby samples) get 5x boost, other straight edges get 3x, other corners get 1x
        const straightEdgeSnapBoost = (isTopEdgeSnap || isNearTopCornerSnap || isTopCornerSnap) ? 5.0 : (isStraightEdge ? 3.0 : 1.0);
        const baseDeformThresh = pressure > 0.5 ? 0.3 : (pressure > 0.1 ? 0.8 : 2.0);
        const baseVelThresh = pressure > 0.5 ? 0.5 : (pressure > 0.1 ? 3.0 : 10.0);
        const deformThresh = baseDeformThresh * snapScale * straightEdgeSnapBoost;
        const velThresh = baseVelThresh * snapScale * straightEdgeSnapBoost;
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
  // WALL STATE SINGLETON
  // ═══════════════════════════════════════════════════════════════════════════════
  const wallState = {
    // Two-ring strategy:
    // - ringPhysics: lower sample count for integration/impulses (visual-only physics)
    // - ringRender: fixed high sample count for smooth geometry/path building
    ringPhysics: new RubberRingWall(RING_SAMPLES),
    ringRender: new RubberRingWall(RING_SAMPLES),
    _impactsThisStep: 0,
    _pressureEventsThisStep: 0,
    
    // Tier 1: Physics update frequency decoupling
    _physicsUpdateInterval: 1/30, // 30Hz physics (configurable, default 30fps)
    _physicsAccumulator: 0,
    _interpolationAlpha: 0, // 0-1 for lerp between states
    _prevDeformations: null, // Previous state for interpolation

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

            // 5-tap low-pass around the ring (wrap-around).
            // Kernel: [1, 4, 6, 4, 1] / 16
            for (let i = 0; i < nR; i++) {
              const m2 = (i - 2 + nR) % nR;
              const m1 = (i - 1 + nR) % nR;
              const p1 = (i + 1) % nR;
              const p2 = (i + 2) % nR;
              curr[i] = (tmp[m2] + 4 * tmp[m1] + 6 * tmp[i] + 4 * tmp[p1] + tmp[p2]) * (1 / 16);
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
  // ═══════════════════════════════════════════════════════════════════════════════
  function drawWalls(ctx, w, h) {
    const g = getGlobals();
    if (!ctx) return;

    const chromeColor = CACHED_WALL_COLOR || getChromeColorFromCSS();
    const DPR = g.DPR || 1;
    // DEBUG/TEST: allow exaggerating deformation (visual-only).
    // Default should remain 1.0 in config.
    const visualMul = Math.max(0, Math.min(10, Number(g.wallVisualDeformMul ?? 1.0) || 1.0));

    const rCssPx = (typeof g.getCanvasCornerRadius === 'function')
      ? g.getCanvasCornerRadius()
      : (g.cornerRadius ?? g.wallRadius ?? 0);
    const rCanvasPx = Math.max(0, (Number(rCssPx) || 0) * DPR);
    
    // Wall inset rule:
    // The wall inner edge (collision boundary) is defined ONLY by wall thickness.
    // Content padding is layout-only and must not affect wall geometry.
    const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
    const insetPx = wallThicknessPx;
    
    // COORDINATE SYSTEM CLARIFICATION:
    // The wall is drawn as a "frame" - it has an outer edge (at canvas boundary) and inner edge.
    // We draw the INNER edge of the wall as a rounded rectangle path.
    // The space between outer and inner edge is filled to create the wall "tube".
    //
    // The corner radius (from config) should apply to the INNER edge, not the outer edge.
    // This is because:
    // 1. The inner edge is where balls collide (physics expects this)
    // 2. The visual appearance is defined by the inner cutout shape
    // 3. The outer edge is just the canvas boundary (no control needed)
    //
    // So: innerW/innerH = canvas size minus wall thickness inset
    //     innerR = corner radius clamped to inner dims
    //     The path is drawn in innerW/innerH space, then offset by insetPx
    const innerW = Math.max(1, w - (insetPx * 2));
    const innerH = Math.max(1, h - (insetPx * 2));
    const innerR = Math.max(0, Math.min(rCanvasPx, innerW * 0.5, innerH * 0.5));
    
    // Ensure both rings share the same geometric basis (so t-mapping aligns).
    // Use inner dimensions for the wall geometry (wall is inset from container edges)
    // This creates the inner edge of the wall border - outer edge is at canvas boundaries
    wallState.ringPhysics.ensureGeometry(innerW, innerH, innerR);
    wallState.ringRender.ensureGeometry(innerW, innerH, innerR);

    // Small padding beyond canvas edges to avoid AA gaps (clipped by canvas)
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
        // Fallback: map + smooth if cache isn't ready.
        const srcPhys = ringPhysics.deformations;
        const src = ringRender.deformations;
        for (let i = 0; i < n; i++) {
          const f = (i / n) * nPhys;
          const i0 = Math.floor(f) % nPhys;
          const t = f - i0;
          const i1 = (i0 + 1) % nPhys;
          src[i] = (1 - t) * srcPhys[i0] + t * srcPhys[i1];
        }
        for (let i = 0; i < n; i++) {
          const m2 = (i - 2 + n) % n;
          const m1 = (i - 1 + n) % n;
          const p1 = (i + 1) % n;
          const p2 = (i + 2) % n;
          sm[i] = (src[m2] + 4 * src[m1] + 6 * src[i] + 4 * src[p1] + src[p2]) * (1 / 16);
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
      // SIMPLE LINEAR PATH with high sample density
      // Draws straight lines between closely-spaced samples for smooth appearance
      // ════════════════════════════════════════════════════════════════════════════
      
      // Start at first point (draw CCW for even-odd fill)
      ctx.moveTo(pointX(n - 1), pointY(n - 1));
      
      // Draw lines through all samples in reverse order (CCW)
      for (let i = n - 2; i >= 0; i--) {
        ctx.lineTo(pointX(i), pointY(i));
      }
      
      ctx.closePath();
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
      
      // Base drag from config (skip for WEIGHTLESS and ORBIT modes - they manage their own damping)
      const baseDrag = (currentMode === MODES.WEIGHTLESS || currentMode === MODES.ORBIT_3D || currentMode === MODES.ORBIT_3D_2) ? 0 : FRICTION;
      
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
      // Skip for ORBIT modes (orbital velocities need to persist)
      // ════════════════════════════════════════════════════════════════════════════
      if (currentMode !== MODES.ORBIT_3D && currentMode !== MODES.ORBIT_3D_2) {
      const MICRO_VEL_THRESHOLD = 2.0 * DPR; // px/s - below this, snap to zero
      if (Math.abs(this.vx) < MICRO_VEL_THRESHOLD) this.vx = 0;
      if (Math.abs(this.vy) < MICRO_VEL_THRESHOLD && currentMode === MODES.WEIGHTLESS) {
        // Only snap vy in weightless (gravity modes need vy to settle naturally)
        this.vy = 0;
        }
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
      
      // Squash decay
      const decay = Math.min(1, CONSTANTS.SQUASH_DECAY_PER_S * dt);
      this.squashAmount += (0 - this.squashAmount) * decay;
      this.squash = 1 - this.squashAmount;
      
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
      const registerEffects = options.registerEffects !== false;
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
      const isPitMode = currentMode === MODES.PIT || currentMode === MODES.PIT_THROWS;
      
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
      
      // Margin: ball radius + physics padding
      const margin = effectiveRadius + borderInset;
      const penetration = sdfDist + margin;
      
      if (penetration > 0 && !skipForPit) {
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
        
        // Visual squash
        this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
        this.squashNormalAngle = Math.atan2(-ny, -nx);
        
        // Sound and wobble effects
        if (registerEffects) {
          // Sound panned by x position
          const pan = this.x / Math.max(1, w);
          playCollisionSound(this.r, impact * 0.65, pan, this._soundId);
          
          // Wobble registration - use ball position for impact point
          const impactSpeedN = Math.max(0, preVn);
          if (!this.isSleeping && impactSpeedN >= wobbleThreshold) {
            const impactN = Math.min(1, impactSpeedN / (this.r * 80));
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
  // ║                           BALL SIZING (MODULAR)                               ║
  // ║     Per-mode size variation + global multiplier (allocation-free)             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function clamp$5(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  const SIZE_VARIATION_MAX = 0.2;

  function getModeSizeVariation01(g, mode) {
    switch (mode) {
      case MODES.PIT: return g.sizeVariationPit ?? 0;
      case MODES.PIT_THROWS: return g.sizeVariationPitThrows ?? 0;
      case MODES.FLIES: return g.sizeVariationFlies ?? 0;
      case MODES.WEIGHTLESS: return g.sizeVariationWeightless ?? 0;
      case MODES.WATER: return g.sizeVariationWater ?? 0;
      case MODES.VORTEX: return g.sizeVariationVortex ?? 0;
      case MODES.PING_PONG: return g.sizeVariationPingPong ?? 0;
      case MODES.MAGNETIC: return g.sizeVariationMagnetic ?? 0;
      case MODES.BUBBLES: return g.sizeVariationBubbles ?? 0;
      case MODES.KALEIDOSCOPE: return g.sizeVariationKaleidoscope ?? 0;
      case MODES.KALEIDOSCOPE_1: return g.sizeVariationKaleidoscope ?? 0;
      case MODES.KALEIDOSCOPE_2: return g.sizeVariationKaleidoscope ?? 0;
      case MODES.KALEIDOSCOPE_3: return g.sizeVariationKaleidoscope ?? 0;
      case MODES.ORBIT_3D: return g.sizeVariationOrbit3d ?? 0;
      case MODES.ORBIT_3D_2: return g.sizeVariationOrbit3d2 ?? 0;
      case MODES.CRITTERS: return g.sizeVariationCritters ?? 0;
      case MODES.NEURAL: return g.sizeVariationNeural ?? 0;
      case MODES.LATTICE: return g.sizeVariationLattice ?? 0;
      case MODES.PARALLAX_LINEAR: return g.sizeVariationParallaxLinear ?? 0;
      case MODES.PARALLAX_PERSPECTIVE: return g.sizeVariationParallaxPerspective ?? 0;
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
      if (mode === MODES.KALEIDOSCOPE_1) return Number(g.kaleidoscope1DotSizeVh ?? g.kaleidoscopeDotSizeVh ?? 0.95);
      if (mode === MODES.KALEIDOSCOPE_2) return Number(g.kaleidoscope2DotSizeVh ?? g.kaleidoscopeDotSizeVh ?? 0.95);
      if (mode === MODES.KALEIDOSCOPE_3) return Number(g.kaleidoscope3DotSizeVh ?? g.kaleidoscopeDotSizeVh ?? 0.95);
      return Number(g.kaleidoscopeDotSizeVh ?? 0.95);
    };
    const getAreaMul = () => {
      if (mode === MODES.KALEIDOSCOPE_1) return Number(g.kaleidoscope1DotAreaMul ?? g.kaleidoscopeDotAreaMul ?? 0.7);
      if (mode === MODES.KALEIDOSCOPE_2) return Number(g.kaleidoscope2DotAreaMul ?? g.kaleidoscopeDotAreaMul ?? 0.7);
      if (mode === MODES.KALEIDOSCOPE_3) return Number(g.kaleidoscope3DotAreaMul ?? g.kaleidoscopeDotAreaMul ?? 0.7);
      return Number(g.kaleidoscopeDotAreaMul ?? 0.7);
    };
    // Per-variant size variance (0..1) - controls how much ball sizes differ
    const getSizeVariance = () => {
      if (mode === MODES.KALEIDOSCOPE_1) return Number(g.kaleidoscope1SizeVariance ?? g.kaleidoscopeSizeVariance ?? 0.3);
      if (mode === MODES.KALEIDOSCOPE_2) return Number(g.kaleidoscope2SizeVariance ?? g.kaleidoscopeSizeVariance ?? 0.3);
      if (mode === MODES.KALEIDOSCOPE_3) return Number(g.kaleidoscope3SizeVariance ?? g.kaleidoscopeSizeVariance ?? 0.3);
      return Number(g.kaleidoscopeSizeVariance ?? 0.3);
    };

    const vh = clamp$5(getVh(), 0.1, 6.0);
    const areaMul = clamp$5(getAreaMul(), 0.1, 2.0);
    const base = Math.max(1, (vh * 0.01) * h * Math.sqrt(areaMul));

    // Use per-variant size variance directly (scaled and capped to global max deviation)
    const v = clamp$5(getSizeVariance() * 0.5, 0, SIZE_VARIATION_MAX);
    const minR = Math.max(1, base * (1 - v));
    const maxR = Math.max(1, base * (1 + v));
    if (maxR - minR < 1e-6) return clampRadiusToGlobalBounds(g, base);
    return clampRadiusToGlobalBounds(g, lerp(minR, maxR, Math.random()));
  }

  /**
   * Allocation-free random radius for a specific mode.
   * When per-mode variation is 0, returns exactly the medium radius.
   */
  function randomRadiusForMode(g, mode) {
    const { minR, maxR, medR } = getRadiusBoundsForMode(g, mode);
    if (maxR - minR < 1e-6) return medR;
    return lerp(minR, maxR, Math.random());
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
      const color = pickRandomColor();
      const ball = new Ball(x, y, size, color);
      
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
      const color = pickRandomColor();
      const ball = new Ball(x, y, size, color);
      
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
  // ║                              BALL SPAWNING                                   ║
  // ║              Extracted from balls-source.html lines 2249-2284                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function clamp$4(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function spawnBall(x, y, color) {
    if (!color) color = pickRandomColor();
    const globals = getGlobals();
    
    // Per-mode sizing rule:
    // Radius depends on the current mode’s 0..1 variation slider, scaled by global multiplier.
    const r = randomRadiusForMode(globals, globals.currentMode || MODES.PIT);
    
    const ball = new Ball(x, y, r, color);
    
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
  // ║                       BALL PIT (SIDE THROWS) MODE                             ║
  // ║            Color-by-color batches thrown from top corners                     ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function clamp$3(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * Ball Pit color rule (to match the main Ball Pit look exactly):
   * - Always leave color undefined so spawnBall() uses pickRandomColor()
   *   (which is driven by the runtime colorDistribution for ALL modes).
   */
  function getNextPitLikeColor(state) {
    const i = state.spawnedTotal | 0;
    state.spawnedTotal = i + 1;
    return undefined;
  }

  function spawnOneThrow(g, color, side, { speedMul = 1, spreadMul = 1 } = {}) {
    const w = g.canvas.width;
    const h = g.canvas.height;
    const DPR = g.DPR;

    const padding = (g.wallThickness || 20) * DPR;
    const usableW = Math.max(1, w - 2 * padding);

    // Spawn just above the visible area, near the top-left / top-right “inlets”.
    const yTop = -h * 0.35;
    const yBottom = -h * 0.05;

    const inletInset = clamp$3(g.pitThrowInletInset ?? 0.06, 0.0, 0.2);
    const leftX = padding + usableW * inletInset;
    const rightX = w - padding - usableW * inletInset;

    const x0 = side === 0 ? leftX : rightX;
    const spawnSpreadBase = clamp$3(g.pitThrowSpawnSpread ?? 0.02, 0.0, 0.12);
    const spawnSpread = clamp$3(spawnSpreadBase * spreadMul, 0.0, 0.18);
    const x = x0 + randBetween(-usableW * spawnSpread, usableW * spawnSpread);
    const y = randBetween(yTop, yBottom);

    // Cross-aim (left throws slightly to the right, right throws slightly to the left)
    const targetYFrac = clamp$3(g.pitThrowTargetYFrac ?? 0.36, 0.12, 0.7);
    const crossBias = clamp$3(g.pitThrowCrossBias ?? 0.12, 0, 0.35);
    const aimJitterBase = clamp$3(g.pitThrowAimJitter ?? 0.04, 0.0, 0.2);
    const aimJitterFrac = clamp$3(aimJitterBase * spreadMul, 0.0, 0.25);
    const aimJitter = randBetween(-aimJitterFrac, aimJitterFrac);
    const aimX = w * (0.5 + (side === 0 ? crossBias : -crossBias) + aimJitter);
    const aimY = h * targetYFrac;

    // Base speed (DPR-scaled)
    const baseSpeed = clamp$3(g.pitThrowSpeed ?? 650, 50, 4000) * DPR;
    const speedJitter = clamp$3(g.pitThrowSpeedJitter ?? 0.22, 0, 0.8);
    const angleJitter = clamp$3(g.pitThrowAngleJitter ?? 0.16, 0, 0.8);

    const ball = spawnBall(x, y, color);

    // Aim vector toward (aimX, aimY), with angular jitter.
    const dx = aimX - x;
    const dy = aimY - y;
    const d = Math.max(1e-4, Math.sqrt(dx * dx + dy * dy));
    let nx = dx / d;
    let ny = dy / d;

    // Rotate unit vector by a small random angle.
    const a = randBetween(-Math.PI, Math.PI) * angleJitter;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const rx = nx * ca - ny * sa;
    const ry = nx * sa + ny * ca;
    nx = rx;
    ny = ry;

    // Speed with jitter.
    const v = baseSpeed * speedMul * (1 + randBetween(-speedJitter, speedJitter));
    ball.vx = nx * v;
    ball.vy = ny * v;

    // Ball Pit wants stable settling: disable default spawn drift impulse.
    ball.driftAx = 0;
    ball.driftTime = 0;

    return ball;
  }

  function initializePitThrows() {
    const g = getGlobals();
    clearBalls();

    const targetBalls = getMobileAdjustedCount(g.maxBalls ?? 300);
    if (targetBalls <= 0) return;

    // Emitter state (kept on globals to avoid per-frame allocations)
    const initialState = {
      spawnedTotal: 0,
      side: 0, // 0 = left, 1 = right
      cooldown: 0,
      batchCount: 0,       // balls thrown in current batch
      batchPaused: false,  // true during inter-batch pause
      queueA: -1,
      queueB: -1,
      queueColorA: undefined,
      queueColorB: undefined,
      queueSideA: 0,
      queueSideB: 1
    };
    
    g._pitThrows = initialState;

    // IMPORTANT: Physics loop early-returns if there are no balls, so seed with 1 throw.
    const c0 = getNextPitLikeColor(g._pitThrows);
    spawnOneThrow(g, c0, g._pitThrows.side);
    g._pitThrows.side = 1 - g._pitThrows.side;
  }

  function updatePitThrows(dtSeconds) {
    const g = getGlobals();
    if (!g || g.currentMode !== 'pit-throws') return;

    const targetBalls = Math.max(0, getMobileAdjustedCount(g.maxBalls ?? 300));
    if (targetBalls <= 0) return;
    if (g.balls.length >= targetBalls) return;

    const s = g._pitThrows;
    if (!s) return;

    // Timing config
    const intervalMs = clamp$3(g.pitThrowIntervalMs ?? 70, 10, 2000);
    const interval = intervalMs / 1000;
    const batchSize = clamp$3(g.pitThrowBatchSize ?? 12, 1, 100);
    const batchPauseMs = clamp$3(g.pitThrowColorPauseMs ?? 400, 0, 3000);
    const batchPause = batchPauseMs / 1000;
    const pairChance = clamp$3(g.pitThrowPairChance ?? 0.35, 0, 1);
    const pairStagger = clamp$3(g.pitThrowPairStaggerMs ?? 18, 0, 300) / 1000;
    const speedVar = clamp$3(g.pitThrowSpeedVar ?? 0.18, 0, 1);
    const spreadVar = clamp$3(g.pitThrowSpreadVar ?? 0.25, 0, 1);

    s.cooldown -= dtSeconds;
    if (s.cooldown < 0) s.cooldown = 0;

    // Cap how many we spawn per frame to keep frame time stable
    const maxSpawnsThisFrame = 6;
    let spawned = 0;

    // Service queued stagger throws (A/B lanes) - these don't count toward batch
    if (s.queueA >= 0) s.queueA -= dtSeconds;
    if (s.queueB >= 0) s.queueB -= dtSeconds;

    while (spawned < maxSpawnsThisFrame && g.balls.length < targetBalls) {
      let didQueueSpawn = false;

      if (s.queueA >= 0 && s.queueA <= 0) {
        const speedMul = 1 + randBetween(-speedVar, speedVar);
        const spreadMul = 1 + randBetween(-spreadVar, spreadVar);
        spawnOneThrow(g, s.queueColorA, s.queueSideA, { speedMul, spreadMul });
        s.queueA = -1;
        spawned++;
        didQueueSpawn = true;
      }

      if (spawned >= maxSpawnsThisFrame || g.balls.length >= targetBalls) break;

      if (s.queueB >= 0 && s.queueB <= 0) {
        const speedMul = 1 + randBetween(-speedVar, speedVar);
        const spreadMul = 1 + randBetween(-spreadVar, spreadVar);
        spawnOneThrow(g, s.queueColorB, s.queueSideB, { speedMul, spreadMul });
        s.queueB = -1;
        spawned++;
        didQueueSpawn = true;
      }

      if (!didQueueSpawn) break;
    }

    if (s.cooldown > 0) return;

    // Check if we're in a batch pause
    if (s.batchPaused) {
      // Batch pause complete → flip side for next batch, start fresh
      s.batchPaused = false;
      s.batchCount = 0;
      s.side = 1 - s.side; // Alternate side between batches
    }

    while (spawned < maxSpawnsThisFrame && g.balls.length < targetBalls) {
      // Check if batch is complete → enter pause
      if (batchPause > 0 && s.batchCount >= batchSize) {
        s.cooldown = batchPause;
        s.batchPaused = true;
        break;
      }

      // This entire batch comes from the same side
      const thisSide = s.side;

      const speedMul = 1 + randBetween(-speedVar, speedVar);
      const spreadMul = 1 + randBetween(-spreadVar, spreadVar);
      const color = getNextPitLikeColor(s);
      spawnOneThrow(g, color, thisSide, { speedMul, spreadMul });
      spawned++;
      s.batchCount++;

      // Optional extra ball from SAME side (handful effect)
      if (Math.random() < pairChance && g.balls.length < targetBalls && s.batchCount < batchSize) {
        const c2 = getNextPitLikeColor(s);
        if (s.queueA < 0) {
          s.queueA = pairStagger;
          s.queueColorA = c2;
          s.queueSideA = thisSide; // Same side for handful effect
          s.batchCount++;
        }
      }

      // Interval between throws within batch
      s.cooldown = interval;
      break;
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            WEIGHTLESS MODE                                   ║
  // ║            Extracted from balls-source.html lines 3559-3585                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeWeightless() {
    const globals = getGlobals();
    clearBalls();
    
    const targetBalls = getMobileAdjustedCount(globals.weightlessCount);
    if (targetBalls <= 0) return;
    const w = globals.canvas.width;
    const h = globals.canvas.height;
    const DPR = globals.DPR || 1;
    const margin = 40 * DPR;
    // Initial speed (DPR-scaled)
    const baseSpeed = globals.weightlessInitialSpeed * DPR;
    
    // Color distribution is handled by spawnBall() via pickRandomColor().
    for (let i = 0; i < targetBalls; i++) {
      const x = margin + Math.random() * (w - 2 * margin);
      const y = margin + Math.random() * (h - 2 * margin);
      
      const ball = spawnBall(x, y);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = baseSpeed * (0.7 + Math.random() * 0.3);
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
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
    
    // Canvas fills container completely - wall is drawn inset within canvas via wall rendering
    // Container fills viewport, canvas fills container, wall is drawn inside canvas
    const canvasWidth = containerWidth;
    const canvasHeight = containerHeight;
    
    // Canvas fills container - CSS handles mode-specific heights
    // Ball Pit: CSS sets 150vh, Other modes: CSS sets 100%
    const simHeight = canvasHeight;
    
    // Use adaptive DPR for performance (may be lower than device DPR on weak hardware)
    const DPR = effectiveDPR;
    
    // Calculate new buffer dimensions
    const newWidth = Math.floor(canvasWidth * DPR);
    const newHeight = Math.floor(simHeight * DPR);
    
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
  // ║                             VORTEX SHEETS MODE                               ║
  // ║      Enhanced swirl field with configurable radius, falloff, and strength    ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeVortex() {
    const g = getGlobals();
    clearBalls();
    const canvas = g.canvas;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const baseCount = Math.min(g.vortexBallCount || 180, g.maxBalls || 500);
    const count = getMobileAdjustedCount(baseCount);
    if (count <= 0) return;
    
    // Enhanced initial velocity based on speed multiplier (DPR-scaled)
    const DPR = g.DPR || 1;
    const speedMultiplier = g.vortexSpeedMultiplier ?? 1.0;
    const baseSpeed = 80 * speedMultiplier * DPR;

    // Ensure at least one of each color
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = randomRadiusForMode(g, MODES.VORTEX);
      const c = pickRandomColor();
      const b = new Ball(x, y, r, c);
      b.vx = (Math.random() - 0.5) * baseSpeed;
      b.vy = (Math.random() - 0.5) * baseSpeed;
      g.balls.push(b);
    }

    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = randomRadiusForMode(g, MODES.VORTEX);
      const c = pickRandomColor();
      const b = new Ball(x, y, r, c);
      b.vx = (Math.random() - 0.5) * baseSpeed;
      b.vy = (Math.random() - 0.5) * baseSpeed;
      g.balls.push(b);
    }
  }

  function applyVortexForces(ball, dt) {
    const g = getGlobals();
    if (g.currentMode !== MODES.VORTEX) return;

    const mx = g.mouseX;
    const my = g.mouseY;
    if (!g.mouseInCanvas) return;

    // Core parameters
    const swirlStrength = g.vortexSwirlStrength || 420;
    const radialPull = g.vortexRadialPull || 180;
    const speedMultiplier = g.vortexSpeedMultiplier ?? 1.0;
    
    // New parameters with defaults
    const radius = g.vortexRadius ?? 0; // 0 = unlimited (uses falloff)
    const falloffCurve = g.vortexFalloffCurve ?? 1.0; // 1.0 = linear, 2.0 = quadratic, 0.5 = sqrt
    const rotationDirection = g.vortexRotationDirection ?? 1; // 1 = counterclockwise, -1 = clockwise
    const coreStrength = g.vortexCoreStrength ?? 1.0; // Multiplier for center strength
    const accelerationZone = g.vortexAccelerationZone ?? 0; // Radius where acceleration is strongest (0 = disabled)
    const outwardPush = g.vortexOutwardPush ?? 0; // Outward force at edges (0 = disabled)

    const dx = ball.x - mx;
    const dy = ball.y - my;
    const dist2 = dx * dx + dy * dy;
    const dist = Math.max(8, Math.sqrt(dist2));
    
    // Radius cutoff (if configured)
    if (radius > 0 && dist > radius) {
      // Apply outward push at edges if configured
      if (outwardPush > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const pushStrength = outwardPush * ((dist - radius) / radius);
        ball.vx += nx * pushStrength * dt;
        ball.vy += ny * pushStrength * dt;
      }
      return;
    }
    
    // Enhanced falloff calculation
    let inv;
    if (radius > 0) {
      // Use radius-based falloff
      const normalizedDist = Math.min(1, dist / radius);
      inv = Math.pow(1 - normalizedDist, falloffCurve);
    } else {
      // Use distance-based falloff (original behavior, enhanced)
      const falloffRate = g.vortexFalloffRate ?? 0.0015;
      const rawInv = 1 / (1 + dist * falloffRate);
      inv = Math.pow(rawInv, falloffCurve);
    }
    
    // Core strength boost (stronger at center)
    const coreBoost = 1.0 + (coreStrength - 1.0) * (1.0 - Math.min(1, dist / (radius || 400)));
    const effectiveSwirl = swirlStrength * inv * coreBoost * speedMultiplier;
    const effectivePull = radialPull * inv * coreBoost * speedMultiplier;
    
    // Acceleration zone (extra boost in specific radius band)
    let accelerationBoost = 1.0;
    if (accelerationZone > 0) {
      const zoneDist = Math.abs(dist - accelerationZone);
      const zoneWidth = accelerationZone * 0.3; // 30% of zone radius
      if (zoneDist < zoneWidth) {
        accelerationBoost = 1.0 + (1.0 - zoneDist / zoneWidth) * 0.5; // Up to 50% boost
      }
    }

    // Tangential swirl (perp to radial) with rotation direction
    const nx = dx / dist;
    const ny = dy / dist;
    const tx = -ny * rotationDirection;
    const ty = nx * rotationDirection;
    const swirl = effectiveSwirl * accelerationBoost;
    ball.vx += tx * swirl * dt;
    ball.vy += ty * swirl * dt;

    // Radial pull (inward)
    const pull = effectivePull * accelerationBoost;
    ball.vx -= nx * pull * dt;
    ball.vy -= ny * pull * dt;
    
    // Configurable drag to prevent runaway speeds
    const drag = Math.max(0, Math.min(1, g.vortexDrag ?? 0.005));
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
      const c = pickRandomColor();
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
      const r = randomRadiusForMode(g, MODES.PING_PONG);
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
      const c = pickRandomColor();
      const b = new Ball(x, y, r, c);
      b.vx = (Math.random() - 0.5) * initSpeed;
      b.vy = (Math.random() - 0.5) * initSpeed;
      // Assign magnetic charge: positive (attracted) or negative (repelled)
      b.charge = Math.random() > 0.5 ? 1 : -1;
      b.baseAlpha = 1;
      g.balls.push(b);
    }

    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = randomRadiusForMode(g, MODES.MAGNETIC);
      const c = pickRandomColor();
      const b = new Ball(x, y, r, c);
      b.vx = (Math.random() - 0.5) * initSpeed;
      b.vy = (Math.random() - 0.5) * initSpeed;
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
    const DPR = g.DPR || 1;
    const dist = Math.max(30 * DPR, Math.sqrt(dx * dx + dy * dy));
    
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
    
    // Velocity cap to prevent explosion (DPR-scaled)
    const maxVel = (g.magneticMaxVelocity || 2800) * DPR;
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
    const count = getMobileAdjustedCount(g.bubblesMaxCount || 200); // Increased for continuous coverage
    if (count <= 0) return;
    
    // Spawn bubbles distributed across entire screen height for continuous flow
    // First ensure one of each color
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = Math.random() * h; // Full screen height
      createBubble(x, y, pickRandomColor(), true); // Already scaled in
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
    const DPR = g.DPR || 1;
    
    // Per-mode sizing system: bubbles vary only according to the Bubbles variation slider.
    const targetRadius = randomRadiusForMode(g, MODES.BUBBLES);
    
    const b = new Ball(x, y, alreadyVisible ? targetRadius : 0.1, color);
    b.isBubble = true;
    b.baseRadius = targetRadius;
    b.targetRadius = targetRadius;
    b.wobblePhase = Math.random() * Math.PI * 2;
    b.wobbleFreq = 2 + Math.random() * 3;
    // Initial velocity (DPR-scaled)
    b.vx = (Math.random() - 0.5) * 20 * DPR;
    b.vy = (-50 - Math.random() * 50) * DPR;
    
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
    
    // New target size
    ball.targetRadius = randomRadiusForMode(g, MODES.BUBBLES);
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


  const TAU = Math.PI * 2;
  const EPS = 1e-6;

  // Render-time smoothing state (mouse-driven rotation should ease-in/out)
  let _lastRenderMs = 0;

  function clamp$2(v, lo, hi) {
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
    return clamp$2(Math.min(canvas.width, canvas.height) / 1000, 0.35, 3.0);
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
    return clamp$2((now - last) / 1000, 0, 0.05);
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
    // Each variant has its own parameters; base Kaleidoscope uses the original keys.
    if (g.currentMode === MODES.KALEIDOSCOPE_1) {
      return {
        count: g.kaleidoscope1BallCount ?? 18,
        wedges: g.kaleidoscope1Wedges ?? g.kaleidoscopeWedges ?? 12,
        speed: g.kaleidoscope1Speed ?? 0.8,
        complexity: 0.55,
        spawnAreaMul: g.kaleidoscope1SpawnAreaMul ?? 1.0,
        sizeVariance: g.kaleidoscope1SizeVariance ?? 0.3
      };
    }
    if (g.currentMode === MODES.KALEIDOSCOPE_2) {
      return {
        count: g.kaleidoscope2BallCount ?? 36,
        wedges: g.kaleidoscope2Wedges ?? g.kaleidoscopeWedges ?? 12,
        speed: g.kaleidoscope2Speed ?? 1.15,
        complexity: 0.95,
        spawnAreaMul: g.kaleidoscope2SpawnAreaMul ?? 1.0,
        sizeVariance: g.kaleidoscope2SizeVariance ?? 0.3
      };
    }
    if (g.currentMode === MODES.KALEIDOSCOPE_3) {
      return {
        count: g.kaleidoscope3BallCount ?? 54,
        wedges: g.kaleidoscope3Wedges ?? g.kaleidoscopeWedges ?? 12,
        speed: g.kaleidoscope3Speed ?? 1.55,
        complexity: 1.35,
        spawnAreaMul: g.kaleidoscope3SpawnAreaMul ?? 1.0,
        sizeVariance: g.kaleidoscope3SizeVariance ?? 0.3
      };
    }
    return {
      count: g.kaleidoscopeBallCount ?? 23,
      wedges: g.kaleidoscopeWedges ?? g.kaleidoscopeSegments ?? 12,
      speed: g.kaleidoscopeSpeed ?? 1.0,
      complexity: 0.75,
      spawnAreaMul: g.kaleidoscopeSpawnAreaMul ?? 1.0,
      sizeVariance: g.kaleidoscopeSizeVariance ?? 0.3
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
    const clampedCount = clamp$2(Math.max(0, count | 0), 0, maxBalls);
    if (clampedCount <= 0) return;

    // Get mode-specific params including spawn area multiplier
    const params = getKaleidoscopeParams(g);
    const spawnAreaMul = clamp$2(params.spawnAreaMul ?? 1.0, 0.2, 2.0);

    // Spawn as a loose ring so the first frame is already "kaleidoscopic".
    // SpawnAreaMul controls density: smaller = tighter/denser, larger = more spread
    const viewportSize = Math.min(w, h);
    const ringMin = viewportSize * 0.05;
    // Base ringMax at 2.8, scaled by spawn area multiplier
    const ringMax = viewportSize * 2.8 * spawnAreaMul;

    // Non-overlapping spawn (one-time O(n²), acceptable at init)
    const placed = [];
    const maxAttemptsPerBall = 90;

    function spawnOne(color) {
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
        const x = clamp$2(centerX + Math.cos(a) * rr, minX, maxX);
        const y = clamp$2(centerY + Math.sin(a) * rr, minY, maxY);
        // Spacing is now a ratio of ball radius (e.g., 0.1 = 10% of radius)
        const spacedRadius = radius * (1 + (g.ballSpacing || 0));
        if (!isOverlapping(placed, x, y, spacedRadius)) {
          placed.push({ x, y, r: spacedRadius });
          const b = new Ball(x, y, radius, color);
          b._kaleiSeed = Math.random() * TAU;
          // Lock in an individual “orbit band” so the system stays distributed
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
      const b = new Ball(x, y, radius, color);
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

    // Ensure at least one of each palette color (if we have enough balls)
    const colorCount = Math.min(8, clampedCount);
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
      spawnOne(pickRandomColor());
    }

    for (let i = colorCount; i < clampedCount; i++) {
      spawnOne(pickRandomColor());
    }
  }

  function initializeKaleidoscope() {
    const g = getGlobals();
    const count = getMobileAdjustedCount(g.kaleidoscopeBallCount ?? 23);
    initializeKaleidoscopeWithCount(count, MODES.KALEIDOSCOPE);
  }

  function initializeKaleidoscope1() {
    const g = getGlobals();
    const count = getMobileAdjustedCount(g.kaleidoscope1BallCount ?? 18);
    initializeKaleidoscopeWithCount(count, MODES.KALEIDOSCOPE_1);
  }

  function initializeKaleidoscope2() {
    const g = getGlobals();
    const count = getMobileAdjustedCount(g.kaleidoscope2BallCount ?? 36);
    initializeKaleidoscopeWithCount(count, MODES.KALEIDOSCOPE_2);
  }

  function initializeKaleidoscope3() {
    const g = getGlobals();
    const count = getMobileAdjustedCount(g.kaleidoscope3BallCount ?? 54);
    initializeKaleidoscopeWithCount(count, MODES.KALEIDOSCOPE_3);
  }

  // Helper to check if we're in any kaleidoscope mode
  function isKaleidoscopeMode(mode) {
    return mode === MODES.KALEIDOSCOPE || 
           mode === MODES.KALEIDOSCOPE_1 || 
           mode === MODES.KALEIDOSCOPE_2 || 
           mode === MODES.KALEIDOSCOPE_3;
  }

  // Get complexity level for current mode (affects morph intensity)
  function getKaleidoscopeComplexity(g) {
    // This is the “intensity ladder” (I → II → III), tunable via per-variant params:
    // - density: ball counts (III defaults to 3× I)
    // - movement: per-variant speed, plus this complexity multiplier
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
    const speed = clamp$2(getKaleidoscopeParams(g).speed ?? 1.0, 0.2, 2.0);

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

    // Very subtle idle movement: gentle drift when activity is low (but not zero)
    // This keeps the kaleidoscope "alive" even when mouse isn't moving.
    const idleDriftStrength = 0.008 * complexity; // Very subtle

    // When completely idle (activity ≈ 0), apply subtle drift + damping
    if (activity < 0.01) {
      // Very gentle per-ball drift (uses seed for organic variation)
      const t = nowMs * 0.0003; // Slow time scale
      const seed = (ball._kaleiSeed ?? 0) + ball.age * 0.02;
      const driftAngle = seed + t;
      const driftX = Math.cos(driftAngle) * idleDriftStrength * 8;
      const driftY = Math.sin(driftAngle) * idleDriftStrength * 8;
      ball.vx += driftX * dt;
      ball.vy += driftY * dt;
      ball.vx *= 0.96; // Lighter damping when idle (allows subtle drift)
      ball.vy *= 0.96;
      return;
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

    const wedgesRaw = getKaleidoscopeParams(g).wedges ?? 12;
    const wedges = clamp$2(Math.round(wedgesRaw), 3, 24);
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
    const mDistN = clamp$2(mDist / Math.max(1, Math.min(w, h) * 0.5), 0, 1);

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
    const speed = clamp$2(getKaleidoscopeParams(g).speed ?? 1.0, 0.2, 2.0);
    const complexity = getKaleidoscopeComplexity(g);
    const panStrength = 0.65 * speed * complexity; // Increased from 0.35 for more complex movement
    const panXTarget = mdx * panStrength * (g.mouseInCanvas ? 1 : 0);
    const panYTarget = mdy * panStrength * (g.mouseInCanvas ? 1 : 0);
    const phaseTarget = mouseAngle * (0.7 * complexity) * (g.mouseInCanvas ? 1 : 0); // Increased from 0.4 for more rotation

    if (moved) {
      morph.lastMouseX = mx;
      morph.lastMouseY = my;
      morph.lastInCanvas = inCanvasNow;
      springTo(morph.phase, phaseTarget, dt, 4.5); // Slow eased rotation
      springTo(morph.panX, panXTarget, dt, 5.0);   // Slow eased pan X
      springTo(morph.panY, panYTarget, dt, 5.0);   // Slow eased pan Y
    } else {
      morph.phase.v = 0;
      morph.panX.v = 0;
      morph.panY.v = 0;
    }

    const phase = morph.phase.x;
    const panX = morph.panX.x;
    const panY = morph.panY.x;

    // "Breathing" depth: as you move the mouse outward/inward, the rings zoom.
    const speed01 = clamp$2((speed - 0.2) / 1.8, 0, 1);
    const zoomRange = 0.22 + 0.18 * speed01; // 0.22..0.40
    const zoom = 1 - zoomRange + (1 - mDistN) * (2 * zoomRange); // maps to [1-zoomRange, 1+zoomRange]

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
      local = clamp$2(local, seamEps, wedgeAngle - seamEps);

      // Replicate across wedges
      for (let wi = 0; wi < wedges; wi++) {
        const outA = (wi * wedgeAngle) + local;

        const x = cx + Math.cos(outA) * r;
        const y = cy + Math.sin(outA) * r;

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
  // ║                      ORBIT 3D: TIGHT & FAST SPIRAL                          ║
  // ║          Same physics as Orbit 2, configured for tight fast motion          ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeOrbit3D() {
    const globals = getGlobals();
    clearBalls();

    const baseCount = Math.max(0, (globals.orbit3dMoonCount ?? 80) | 0);
    const count = getMobileAdjustedCount(baseCount);
    if (count <= 0) return;
    const w = globals.canvas.width;
    const h = globals.canvas.height;

    // TIGHT: Spawn closer to center
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(w, h) * 0.15 + Math.random() * Math.min(w, h) * 0.1; // Tight spawn
      const x = w * 0.5 + Math.cos(angle) * radius;
      const y = h * 0.5 + Math.sin(angle) * radius;

      const ball = spawnBall(x, y, pickRandomColor());
      if (!ball) continue;

      // FAST: Initial tangential velocity (DPR-scaled)
      const DPR = globals.DPR || 1;
      const speed = (globals.orbit3dVelocityMult ?? 150) * (0.9 + Math.random() * 0.2) * DPR;
      ball.vx = -Math.sin(angle) * speed;
      ball.vy = Math.cos(angle) * speed;
      ball.orbitDepth = Math.random();
    }
  }

  function applyOrbit3DForces(ball, dt) {
    const g = getGlobals();

    // Mouse is attractor
    const cx = (g.mouseX === -1e9) ? g.canvas.width * 0.5 : g.mouseX;
    const cy = (g.mouseY === -1e9) ? g.canvas.height * 0.5 : g.mouseY;

    const dx = cx - ball.x;
    const dy = cy - ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy + 1);

    const radialX = dx / dist;
    const radialY = dy / dist;
    const tangentX = -dy / dist;
    const tangentY = dx / dist;

    // GUARDRAIL 1: Minimum distance repulsion
    // DPR-scaled: physics runs in canvas pixels
    const DPR = g.DPR || 1;
    const minRadius = 40 * DPR; // TIGHT: Smaller min radius
    if (dist < minRadius) {
      const repulsionStrength = (minRadius - dist) * 100;
      ball.vx -= radialX * repulsionStrength * dt;
      ball.vy -= radialY * repulsionStrength * dt;
    }

    // Gentle spiral forces
    const gravity = g.orbit3dGravity ?? 5000;
    
    // Strong tangential for spinning
    const tangentForce = gravity * 0.015;
    ball.vx += tangentX * tangentForce * dt;
    ball.vy += tangentY * tangentForce * dt;

    // Weak inward pull for slow spiral (softened)
    const softening = 100 * DPR;
    const radialForce = (gravity * 0.003) / (1 + dist / softening);
    ball.vx += radialX * radialForce * dt;
    ball.vy += radialY * radialForce * dt;

    // GUARDRAIL 2: Separation force
    const separationRadius = 60 * g.DPR; // TIGHT: Smaller separation
    let sepX = 0, sepY = 0, neighborCount = 0;
    for (let i = 0; i < g.balls.length; i++) {
      const other = g.balls[i];
      if (other === ball) continue;
      const dx2 = ball.x - other.x;
      const dy2 = ball.y - other.y;
      const d2 = dx2 * dx2 + dy2 * dy2;
      if (d2 < separationRadius * separationRadius && d2 > 0) {
        const d_other = Math.sqrt(d2);
        const strength = 1 - (d_other / separationRadius);
        sepX += (dx2 / d_other) * strength;
        sepY += (dy2 / d_other) * strength;
        neighborCount++;
      }
    }
    if (neighborCount > 0) {
      const separationForce = 8000;
      ball.vx += (sepX / neighborCount) * separationForce * dt;
      ball.vy += (sepY / neighborCount) * separationForce * dt;
    }

    // GUARDRAIL 3: Speed limiting (DPR-scaled)
    const maxSpeed = (g.orbit3dVelocityMult ?? 150) * 2 * DPR;
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed > maxSpeed) {
      ball.vx = (ball.vx / speed) * maxSpeed;
      ball.vy = (ball.vy / speed) * maxSpeed;
    }

    // Light damping
    const damp = 1 - (g.orbit3dDamping ?? 0.02);
    ball.vx *= damp;
    ball.vy *= damp;

    // Depth effect for size
    const angle = Math.atan2(dy, dx);
    const depthScale = g.orbit3dDepthScale ?? 0.8;
    ball.z = ball.orbitDepth + Math.sin(angle * 2) * 0.2;
    ball.z = Math.max(0, Math.min(1, ball.z));
    const rawR = Math.max(2, ball.rBase * (0.5 + ball.z * depthScale));
    ball.r = clampRadiusToGlobalBounds(g, rawR);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    ORBIT 3D 2: EXPANSIVE GENTLE SPIRAL                      ║
  // ║         Same physics as Orbit 1, configured for expansive motion            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeOrbit3D2() {
    const globals = getGlobals();
    clearBalls();

    const baseCount = Math.max(0, (globals.orbit3d2MoonCount ?? 100) | 0);
    const count = getMobileAdjustedCount(baseCount);
    if (count <= 0) return;
    const w = globals.canvas.width;
    const h = globals.canvas.height;

    // EXPANSIVE: Spawn far from center
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(w, h) * 0.35 + Math.random() * Math.min(w, h) * 0.15; // Expansive spawn
      const x = w * 0.5 + Math.cos(angle) * radius;
      const y = h * 0.5 + Math.sin(angle) * radius;

      const ball = spawnBall(x, y, pickRandomColor());
      if (!ball) continue;

      // SLOWER: Initial tangential velocity (DPR-scaled)
      const DPR = globals.DPR || 1;
      const speed = (globals.orbit3d2VelocityMult ?? 1.1) * 150 * DPR;
      ball.vx = -Math.sin(angle) * speed;
      ball.vy = Math.cos(angle) * speed;
      ball.orbitDepth = Math.random();
    }
  }

  function applyOrbit3D2Forces(ball, dt) {
    const g = getGlobals();

    // Mouse is attractor
    const cx = (g.mouseX === -1e9) ? g.canvas.width * 0.5 : g.mouseX;
    const cy = (g.mouseY === -1e9) ? g.canvas.height * 0.5 : g.mouseY;

    const dx = cx - ball.x;
    const dy = cy - ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy + 1);

    const radialX = dx / dist;
    const radialY = dy / dist;
    const tangentX = -dy / dist;
    const tangentY = dx / dist;

    // GUARDRAIL 1: Minimum distance repulsion
    // DPR-scaled: physics runs in canvas pixels
    const DPR = g.DPR || 1;
    const minRadius = 80 * DPR; // EXPANSIVE: Larger min radius
    if (dist < minRadius) {
      const repulsionStrength = (minRadius - dist) * 100;
      ball.vx -= radialX * repulsionStrength * dt;
      ball.vy -= radialY * repulsionStrength * dt;
    }

    // Gentle spiral forces
    const gravity = g.orbit3d2Gravity ?? 80000;
    
    // Strong tangential for spinning
    const tangentForce = gravity * 0.015;
    ball.vx += tangentX * tangentForce * dt;
    ball.vy += tangentY * tangentForce * dt;

    // Weak inward pull for slow spiral (softened)
    const softening = 100 * DPR;
    const radialForce = (gravity * 0.003) / (1 + dist / softening);
    ball.vx += radialX * radialForce * dt;
    ball.vy += radialY * radialForce * dt;

    // GUARDRAIL 2: Separation force
    const separationRadius = 100 * g.DPR; // EXPANSIVE: Larger separation
    let sepX = 0, sepY = 0, neighborCount = 0;
    for (let i = 0; i < g.balls.length; i++) {
      const other = g.balls[i];
      if (other === ball) continue;
      const dx2 = ball.x - other.x;
      const dy2 = ball.y - other.y;
      const d2 = dx2 * dx2 + dy2 * dy2;
      if (d2 < separationRadius * separationRadius && d2 > 0) {
        const d_other = Math.sqrt(d2);
        const strength = 1 - (d_other / separationRadius);
        sepX += (dx2 / d_other) * strength;
        sepY += (dy2 / d_other) * strength;
        neighborCount++;
      }
    }
    if (neighborCount > 0) {
      const separationForce = 8000;
      ball.vx += (sepX / neighborCount) * separationForce * dt;
      ball.vy += (sepY / neighborCount) * separationForce * dt;
    }

    // GUARDRAIL 3: Speed limiting (DPR-scaled)
    const maxSpeed = 300 * DPR; // EXPANSIVE: Fixed max speed
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed > maxSpeed) {
      ball.vx = (ball.vx / speed) * maxSpeed;
      ball.vy = (ball.vy / speed) * maxSpeed;
    }

    // Light damping
    const damp = 1 - (g.orbit3d2Damping ?? 0.02);
    ball.vx *= damp;
    ball.vy *= damp;

    // Depth effect for size
    const angle = Math.atan2(dy, dx);
    const depthScale = g.orbit3d2DepthScale ?? 0.6;
    ball.z = ball.orbitDepth + Math.sin(angle * 2) * 0.2;
    ball.z = Math.max(0, Math.min(1, ball.z));
    const rawR = Math.max(2, ball.rBase * (0.5 + ball.z * depthScale));
    ball.r = clampRadiusToGlobalBounds(g, rawR);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                               CRITTERS MODE                                   ║
  // ║           Ball-only “little creatures” (step locomotion + steering)           ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function clamp$1(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function wrapAngle(a) {
    // Wrap to [-PI, PI]
    if (a > Math.PI) a -= Math.PI * 2;
    else if (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function smoothstep01(t) {
    t = clamp$1(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function stepPulse01(phase01, sharpness) {
    // Triangle wave -> smoothstep -> power for “staccato steps”
    const tri = phase01 < 0.5 ? (phase01 * 2) : (2 - phase01 * 2); // 0..1..0
    const s = smoothstep01(tri);
    const p = clamp$1(sharpness, 0.5, 6.0);
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
  // ║                   Emergent connectivity (“synapses”)                          ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // Circle-only “connectivity” mode:
  // - No line rendering.
  // - Connection is expressed via gentle clustering (motion cohesion) + optional halo pulse.

  let _neuralCohesionT = 0;

  function initializeNeural() {
    const g = getGlobals();
    const canvas = g.canvas;
    if (!canvas) return;
    clearBalls();

    const baseCount = Math.max(8, Math.min(g.neuralBallCount ?? 80, 260));
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

      // Size system: make Neural respect per-mode sizing variation.
      const rr = randomRadiusForMode(g, MODES.NEURAL);
      ball.r = rr;
      ball.rBase = rr;
      ball.m = Math.max(1, rr * rr * 0.12);

      ball.vx = 0;
      ball.vy = 0;
      ball.driftAx = 0;
      ball.driftTime = 0;
      // Per-ball deterministic phase for “wander” (no per-step Math.random)
      ball._neuralPhase = Math.random() * Math.PI * 2;
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
      ball._neuralPhase = Math.random() * Math.PI * 2;
    }
  }

  function applyNeuralForces(ball, dt) {
    const g = getGlobals();
    const massScale = Math.max(0.25, ball.m / g.MASS_BASELINE_KG);

    const strength = Math.max(0, g.neuralWanderStrength ?? 420);
    const phase = (ball._neuralPhase ?? 0) + dt * 1.35;
    ball._neuralPhase = phase;

    // Smooth “wander” — two orthogonal sinusoids with different rates.
    const ax = Math.sin(phase * 1.7 + 0.3) * strength;
    const ay = Math.cos(phase * 1.1 + 1.2) * strength;
    ball.vx += (ax * dt) / massScale;
    ball.vy += (ay * dt) / massScale;

    // Connectivity (circle-only): gentle “cohesion” towards a moving centroid.
    // This creates transient clustering without drawing any links.
    _neuralCohesionT += dt;
    const balls = g.balls;
    const n = balls.length;
    if (n > 1) {
      // Recompute centroid at a low frequency to avoid extra work.
      // (Still O(n), but only a few times per second.)
      const shouldRecompute = (_neuralCohesionT > 0.18);
      if (shouldRecompute) _neuralCohesionT = 0;

      if (shouldRecompute || g._neuralCx === undefined) {
        let sx = 0, sy = 0;
        for (let i = 0; i < n; i++) {
          sx += balls[i].x;
          sy += balls[i].y;
        }
        g._neuralCx = sx / n;
        g._neuralCy = sy / n;
      }

      const cx = g._neuralCx;
      const cy = g._neuralCy;
      const cohesion = Math.max(0, Math.min(1, g.neuralCohesion ?? 0.18));
      const dx = cx - ball.x;
      const dy = cy - ball.y;
      ball.vx += (dx * cohesion * dt) / massScale;
      ball.vy += (dy * cohesion * dt) / massScale;
    }

    // Soft damping (mode-local) — stable across dt
    const damp60 = Math.max(0.0, Math.min(1.0, g.neuralDamping ?? 0.985));
    const damp = Math.pow(damp60, dt * 60);
    ball.vx *= damp;
    ball.vy *= damp;
  }

  function preRenderNeural(_ctx) {
    // Intentionally empty: NO LINES. (Hook retained for compatibility.)
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                              LATTICE MODE                                    ║
  // ║                   Crystallization into a hex grid                             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function toPxFromVwLike(canvas, vw) {
    const basis = Math.max(1, Math.min(canvas.width, canvas.height));
    return (vw * 0.01) * basis;
  }

  function initializeLattice() {
    const g = getGlobals();
    clearBalls();

    const canvas = g.canvas;
    const w = canvas.width;
    const h = canvas.height;
    
    // Compute hex grid layout
    const spacing = Math.max(8, toPxFromVwLike(canvas, g.latticeSpacingVw ?? 8.5));
    const rowHeight = spacing * 0.8660254037844386; // sin(60°)
    
    // Calculate grid dimensions needed to FILL viewport completely
    // Add extra rows/cols to ensure complete edge coverage
    const baseCols = Math.ceil(w / spacing) + 2;
    const baseRows = Math.ceil(h / rowHeight) + 2;

    // Mobile performance: reduce lattice density by scaling grid dimensions.
    // We apply sqrt(factor) per dimension so total objects scales ~factor.
    const mobileFactor = g.isMobile
      ? Math.max(0, Math.min(1, Number(g.mobileObjectReductionFactor ?? 0.7)))
      : 1;
    if (g.isMobile && mobileFactor <= 0) return;

    const dimFactor = Math.sqrt(mobileFactor);
    const cols = Math.max(0, Math.round(baseCols * dimFactor));
    const rows = Math.max(0, Math.round(baseRows * dimFactor));
    if (cols <= 0 || rows <= 0) return;
    
    // Alignment control: 'center' (default), 'top-left', 'top-center', 'top-right', etc.
    const alignment = g.latticeAlignment ?? 'center';
    
    // Calculate ACTUAL grid size (not including extra cells)
    const gridWidth = (cols - 1) * spacing;
    const gridHeight = (rows - 1) * rowHeight;
    
    // Calculate starting position based on alignment
    let startX, startY;
    
    if (alignment === 'center') {
      // Center the grid so it fills viewport symmetrically
      startX = (w - gridWidth) * 0.5;
      startY = (h - gridHeight) * 0.5;
    } else if (alignment === 'top-left') {
      // Align to top-left with slight negative offset for edge coverage
      startX = -spacing * 0.5;
      startY = -rowHeight * 0.5;
    } else if (alignment === 'top-center') {
      // Center horizontally, align to top
      startX = (w - gridWidth) * 0.5;
      startY = -rowHeight * 0.5;
    } else if (alignment === 'top-right') {
      // Align to top-right with edge coverage
      startX = w - gridWidth + spacing * 0.5;
      startY = -rowHeight * 0.5;
    } else {
      // Default to center
      startX = (w - gridWidth) * 0.5;
      startY = (h - gridHeight) * 0.5;
    }
    
    // Create ALL balls to fill viewport (no ball count limit)
    // Randomize color distribution for organic appearance
    const edgeMargin = spacing * 0.25;
    
    for (let row = 0; row < rows; row++) {
      const isOddRow = (row & 1) !== 0;
      const xOffset = isOddRow ? spacing * 0.5 : 0;
      const y = startY + row * rowHeight;
      
      for (let col = 0; col < cols; col++) {
        const x = startX + col * spacing + xOffset;
        
        // Only create balls within viewport bounds (with small edge tolerance for complete coverage)
        if (x >= -edgeMargin && x <= w + edgeMargin && y >= -edgeMargin && y <= h + edgeMargin) {
          const ball = spawnBall(x, y, pickRandomColor());
          
          // Store HOME position - this is where the ball always wants to return
          ball.latticeHomeX = x;
          ball.latticeHomeY = y;
          ball.latticeRow = row;
          ball.latticeCol = col;
          
          ball.vx = 0;
          ball.vy = 0;
          ball.driftAx = 0;
          ball.driftTime = 0;
        }
      }
    }
  }

  function applyLatticeForces(ball, dt) {
    const g = getGlobals();
    const canvas = g.canvas;
    if (!canvas) return;

    // ══════════════════════════════════════════════════════════════════════════════
    // PHASE 1: CURSOR REPELLER — Disrupts the crystalline structure
    // ══════════════════════════════════════════════════════════════════════════════
    const mouseX = g.mouseX;
    const mouseY = g.mouseY;
    const repellerEnabled = g.repellerEnabled !== false; // default true
    
    if (repellerEnabled && mouseX !== -1e9 && g.mouseInCanvas) {
      // Lattice disruption: DRAMATIC mesh-stretching effect
      // Large radius + high power + shallow falloff = visible elastic deformation
      const disruptRadius = (g.latticeDisruptRadius ?? 600) * g.DPR;
      const disruptPower = g.latticeDisruptPower ?? 25.0;
      
      const dx = ball.x - mouseX;
      const dy = ball.y - mouseY;
      const d2 = dx * dx + dy * dy;
      const r2 = disruptRadius * disruptRadius;
      
      if (d2 < r2) {
        const d = Math.max(Math.sqrt(d2), 1e-4);
        const nx = dx / d;
        const ny = dy / d;
        const q = Math.max(0, 1 - d / disruptRadius);
        
        // Shallow falloff (power 1.8) = more balls affected at once = visible mesh stretch
        // High base multiplier (80.0) = dramatic displacement
        const strength = disruptPower * 80.0 * Math.pow(q, 1.8);
        const massScale = Math.max(0.25, ball.m / g.MASS_BASELINE_KG);
        
        ball.vx += (nx * strength * dt) / massScale;
        ball.vy += (ny * strength * dt) / massScale;
      }
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // PHASE 2: HOME POSITION SPRING FORCES — Pull towards original mesh position
    // ══════════════════════════════════════════════════════════════════════════════
    // Each ball remembers its home position and always returns there
    if (ball.latticeHomeX === undefined || ball.latticeHomeY === undefined) {
      // Fallback: if home position not set, use current position
      ball.latticeHomeX = ball.x;
      ball.latticeHomeY = ball.y;
    }
    
    // ══════════════════════════════════════════════════════════════════════════════
    // PHASE 2.5: LIVING MESH ANIMATION — Subtle breathing/wave motion
    // ══════════════════════════════════════════════════════════════════════════════
    const time = performance.now() * 0.001; // seconds
    const meshWaveStrength = g.latticeMeshWaveStrength ?? 12.0; // px amplitude
    const meshWaveSpeed = g.latticeMeshWaveSpeed ?? 0.8; // Hz
    
    // Multi-directional wave for organic movement
    const waveX = Math.sin(time * meshWaveSpeed + ball.latticeHomeX * 0.004) * meshWaveStrength;
    const waveY = Math.cos(time * meshWaveSpeed * 0.7 + ball.latticeHomeY * 0.004) * meshWaveStrength;
    
    // Breathing effect (entire mesh expands/contracts slightly)
    const breathe = Math.sin(time * meshWaveSpeed * 0.5) * 0.015; // 1.5% scale
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;
    const breatheX = (ball.latticeHomeX - cx) * breathe;
    const breatheY = (ball.latticeHomeY - cy) * breathe;
    
    // Target position = home + wave animation + breathing
    const targetX = ball.latticeHomeX + waveX + breatheX;
    const targetY = ball.latticeHomeY + waveY + breatheY;

    const dx = targetX - ball.x;
    const dy = targetY - ball.y;

    const stiffness = Math.max(0, g.latticeStiffness ?? 2.2);
    const massScale = Math.max(0.25, ball.m / g.MASS_BASELINE_KG);
    ball.vx += (dx * stiffness * dt) / massScale;
    ball.vy += (dy * stiffness * dt) / massScale;

    // ══════════════════════════════════════════════════════════════════════════════
    // PHASE 3: DAMPING — Settle into crystal structure
    // ══════════════════════════════════════════════════════════════════════════════
    const damp60 = Math.max(0.0, Math.min(1.0, g.latticeDamping ?? 0.92));
    const damp = Math.pow(damp60, dt * 60);
    ball.vx *= damp;
    ball.vy *= damp;
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
    const spanX = Math.max(0.2, Math.min(3.0, g.parallaxLinearSpanX ?? 1.35));
    const spanY = Math.max(0.2, Math.min(3.0, g.parallaxLinearSpanY ?? 1.35));
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
  // ║                       PARALLAX (PERSPECTIVE) MODE                             ║
  // ║              3D grid with randomness (jittered cubic lattice)                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // NOTE: Preset applier is in control-registry.js to avoid circular dependency

  function initializeParallaxPerspective() {
    const g = getGlobals();
    const canvas = g.canvas;
    if (!canvas) return;

    clearBalls();

    const w = canvas.width;
    const h = canvas.height;

    // Grid dimensions
    const gridX = getMobileAdjustedCount(Math.max(0, Math.min(50, Math.round(g.parallaxPerspectiveGridX ?? 16))));
    const gridY = getMobileAdjustedCount(Math.max(0, Math.min(50, Math.round(g.parallaxPerspectiveGridY ?? 12))));
    const gridZ = getMobileAdjustedCount(Math.max(0, Math.min(25, Math.round(g.parallaxPerspectiveGridZ ?? 8))));
    if (gridX <= 0 || gridY <= 0 || gridZ <= 0) return;

    // Grid span (viewport fill in world space)
    const spanX = Math.max(0.2, Math.min(3.0, g.parallaxPerspectiveSpanX ?? 1.45));
    const spanY = Math.max(0.2, Math.min(3.0, g.parallaxPerspectiveSpanY ?? 1.45));
    const xMin = -0.5 * w * spanX;
    const yMin = -0.5 * h * spanY;
    const xStep = (w * spanX) / Math.max(1, gridX - 1);
    const yStep = (h * spanY) / Math.max(1, gridY - 1);

    // Z-depth range
    const zNear = Math.max(10, g.parallaxPerspectiveZNear ?? 40);
    const zFar = Math.max(zNear + 100, g.parallaxPerspectiveZFar ?? 1200);
    const zStep = (zFar - zNear) / Math.max(1, gridZ - 1);

    // Randomness factor (0 = perfect grid, 1 = full jitter)
    const randomness = Math.max(0, Math.min(1, g.parallaxPerspectiveRandomness ?? 0.6));

    // Camera
    const focalLength = Math.max(80, g.parallaxPerspectiveFocalLength ?? 420);

    const dotSizeMul = Math.max(0.1, Math.min(6.0, g.parallaxPerspectiveDotSizeMul ?? 1.8));
    const baseR = (g.R_MED || 20) * 0.30 * 2.0 * (g.DPR || 1) * dotSizeMul;
    const varFrac = getModeSizeVarianceFrac(g, MODES.PARALLAX_PERSPECTIVE);
    const centerX = w * 0.5;
    const centerY = h * 0.5;
    // Render back-to-front: start with far (iz=gridZ-1) so near dots draw last (on top)
    for (let iz = gridZ - 1; iz >= 0; iz--) {
      const zBase = zNear + iz * zStep;
      
      for (let iy = 0; iy < gridY; iy++) {
        for (let ix = 0; ix < gridX; ix++) {
          // Perfect grid position
          const x3dGrid = xMin + ix * xStep;
          const y3dGrid = yMin + iy * yStep;
          const z3dGrid = zBase;

          // Apply randomness jitter
          const jitterX = (Math.random() - 0.5) * xStep * randomness;
          const jitterY = (Math.random() - 0.5) * yStep * randomness;
          const jitterZ = (Math.random() - 0.5) * zStep * randomness * 0.5;

          const x3d = x3dGrid + jitterX;
          const y3d = y3dGrid + jitterY;
          const z3d = z3dGrid + jitterZ;

          // Perspective projection
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

  function applyParallaxPerspectiveForces(ball, dt) {
    if (!ball._parallax3D) return;

    const g = getGlobals();
    const canvas = g.canvas;
    if (!canvas) return;

    // Mouse offset
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;
    let mx = 0, my = 0;
    
    if (g.mouseInCanvas) {
      mx = Math.max(-1, Math.min(1, (g.mouseX - cx) / (canvas.width * 0.5)));
      my = Math.max(-1, Math.min(1, (g.mouseY - cy) / (canvas.height * 0.5)));
    }

    // Camera
    const focalLength = Math.max(100, g.parallaxPerspectiveFocalLength ?? 400);
    const parallaxStrength = Math.max(0, g.parallaxPerspectiveParallaxStrength ?? 150);

    // Parallax offset
    const { x, y, z } = ball._parallax3D;
    const offsetX = mx * parallaxStrength;
    const offsetY = my * parallaxStrength;

    // Project with parallax
    const scale = focalLength / (focalLength + z);
    const targetX = cx + (x + offsetX) * scale;
    const targetY = cy + (y + offsetY) * scale;

    // Update size
    const dotSizeMul = Math.max(0.1, Math.min(6.0, g.parallaxPerspectiveDotSizeMul ?? 1.8));
    const sizeMul = Number.isFinite(ball._parallaxSizeMul) ? ball._parallaxSizeMul : 1.0;
    const rawR = (g.R_MED || 20) * 0.30 * 2.0 * (g.DPR || 1) * dotSizeMul * sizeMul * scale;
    ball.r = clampRadiusToGlobalBounds(g, rawR);

    // No easing: snap directly to cursor-driven projection
    ball.x = targetX;
    ball.y = targetY;
    ball.vx = 0;
    ball.vy = 0;
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


  function getWarmupFramesForMode(mode, globals) {
    // Per-simulation warmup frames (render-frame units).
    // Default is 10 everywhere unless overridden via config/panel.
    switch (mode) {
      case MODES.PIT: return globals.pitWarmupFrames ?? 10;
      case MODES.PIT_THROWS: return globals.pitThrowsWarmupFrames ?? 10;
      case MODES.FLIES: return globals.fliesWarmupFrames ?? 10;
      case MODES.WEIGHTLESS: return globals.weightlessWarmupFrames ?? 10;
      case MODES.WATER: return globals.waterWarmupFrames ?? 10;
      case MODES.VORTEX: return globals.vortexWarmupFrames ?? 10;
      case MODES.PING_PONG: return globals.pingPongWarmupFrames ?? 10;
      case MODES.MAGNETIC: return globals.magneticWarmupFrames ?? 10;
      case MODES.BUBBLES: return globals.bubblesWarmupFrames ?? 10;
      case MODES.KALEIDOSCOPE: return globals.kaleidoscopeWarmupFrames ?? 10;
      case MODES.KALEIDOSCOPE_1: return globals.kaleidoscope1WarmupFrames ?? 10;
      case MODES.KALEIDOSCOPE_2: return globals.kaleidoscope2WarmupFrames ?? 10;
      case MODES.KALEIDOSCOPE_3: return globals.kaleidoscope3WarmupFrames ?? 10;
      case MODES.ORBIT_3D: return globals.orbit3dWarmupFrames ?? 10;
      case MODES.ORBIT_3D_2: return globals.orbit3d2WarmupFrames ?? 10;
      case MODES.CRITTERS: return globals.crittersWarmupFrames ?? 10;
      case MODES.NEURAL: return globals.neuralWarmupFrames ?? 10;
      case MODES.LATTICE: return globals.latticeWarmupFrames ?? 10;
      case MODES.PARALLAX_LINEAR: return globals.parallaxLinearWarmupFrames ?? 10;
      case MODES.PARALLAX_PERSPECTIVE: return globals.parallaxPerspectiveWarmupFrames ?? 10;
      default: return 10;
    }
  }

  function setMode(mode) {
    const globals = getGlobals();
    const prevMode = globals.currentMode;
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
      'pit-throws': 'Ball Pit (Throws)',
      flies: 'Flies to Light', 
      weightless: 'Zero Gravity', 
      water: 'Water Swimming',
      vortex: 'Vortex Sheets',
      'ping-pong': 'Ping Pong',
      magnetic: 'Magnetic',
      bubbles: 'Carbonated Bubbles',
      kaleidoscope: 'Kaleidoscope',
      'kaleidoscope-1': 'Kaleidoscope I',
      'kaleidoscope-2': 'Kaleidoscope II',
      'kaleidoscope-3': 'Kaleidoscope III',
      'orbit-3d': 'Orbit 3D',
      'orbit-3d-2': 'Orbit 3D (Tight Swarm)',
      critters: 'Critters',
      neural: 'Neural Network',
      lattice: 'Crystal Lattice',
      'parallax-linear': 'Parallax (Linear)',
      'parallax-perspective': 'Parallax (Perspective)'
    };
    announceToScreenReader(`Switched to ${modeNames[mode] || mode} mode`);
    
    // NOTE: UI button updates are handled by the caller (controls.js, keyboard.js)
    // to avoid circular dependencies
    
    // Update container class for mode-specific styling
    // PRESERVE dark-mode class when switching modes!
    if (globals.container) {
      const wasDark = globals.container.classList.contains('dark-mode');
      globals.container.className = '';
      if (mode === MODES.PIT || mode === MODES.PIT_THROWS) {
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
    } else if (mode === MODES.PIT_THROWS) {
      globals.gravityMultiplier = globals.gravityMultiplierPit;
      globals.G = globals.GE * globals.gravityMultiplier;
      globals.repellerEnabled = true;
      initializePitThrows();
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
    } else if (mode === MODES.KALEIDOSCOPE_1) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeKaleidoscope1();
    } else if (mode === MODES.KALEIDOSCOPE_2) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeKaleidoscope2();
    } else if (mode === MODES.KALEIDOSCOPE_3) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeKaleidoscope3();
    } else if (mode === MODES.ORBIT_3D) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeOrbit3D();
    } else if (mode === MODES.ORBIT_3D_2) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeOrbit3D2();
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
    } else if (mode === MODES.LATTICE) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = true;
      initializeLattice();
    } else if (mode === MODES.PARALLAX_LINEAR) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeParallaxLinear();
    } else if (mode === MODES.PARALLAX_PERSPECTIVE) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeParallaxPerspective();
    }
    
    console.log(`Mode ${mode} initialized with ${globals.balls.length} balls`);

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
    } else if (globals.currentMode === MODES.PIT || globals.currentMode === MODES.PIT_THROWS) {
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
    } else if (globals.currentMode === MODES.KALEIDOSCOPE || 
               globals.currentMode === MODES.KALEIDOSCOPE_1 ||
               globals.currentMode === MODES.KALEIDOSCOPE_2 ||
               globals.currentMode === MODES.KALEIDOSCOPE_3) {
      return applyKaleidoscopeForces;
    } else if (globals.currentMode === MODES.ORBIT_3D) {
      return applyOrbit3DForces;
    } else if (globals.currentMode === MODES.ORBIT_3D_2) {
      return applyOrbit3D2Forces;
    } else if (globals.currentMode === MODES.CRITTERS) {
      return applyCrittersForces;
    } else if (globals.currentMode === MODES.NEURAL) {
      return applyNeuralForces;
    } else if (globals.currentMode === MODES.LATTICE) {
      return applyLatticeForces;
    } else if (globals.currentMode === MODES.PARALLAX_LINEAR) {
      return applyParallaxLinearForces;
    } else if (globals.currentMode === MODES.PARALLAX_PERSPECTIVE) {
      return applyParallaxPerspectiveForces;
    }
    return null;
  }

  function getModeUpdater() {
    const globals = getGlobals();
    if (globals.currentMode === MODES.WATER) {
      return updateWaterRipples;
    } else if (globals.currentMode === MODES.PIT_THROWS) {
      return updatePitThrows;
    } else if (globals.currentMode === MODES.MAGNETIC) {
      return updateMagnetic;
    } else if (globals.currentMode === MODES.BUBBLES) {
      return updateBubbles;
    }
    return null;
  }

  function getModeRenderer() {
    const globals = getGlobals();
    if (globals.currentMode === MODES.NEURAL) {
      return {
        preRender: preRenderNeural
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
  // ║                          CUSTOM CURSOR RENDERER                              ║
  // ║     Border area: default cursor | Simulation: cursor scales down to dot      ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let cursorElement = null;
  let isInitialized$1 = false;
  let isInSimulation = false;
  let cachedContainerRect = null;
  let rectCacheTime = 0;
  const RECT_CACHE_MS = 100; // Cache rect for 100ms to avoid excessive layout reads
  let fadeInStarted = false;
  let fadeInAnimation = null;

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
    document.body.appendChild(cursorElement);
    
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
    
    // Reset transform if not in simulation
    if (!isInSimulation) {
      cursorElement.style.transform = 'translate(-50%, -50%) scale(1)';
      // Don't set opacity - let fade-in animation control it
    }
  }

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
  function updateCursorPosition(clientX, clientY) {
    if (!cursorElement) return;
    
    // Hide cursor when hovering over links (trail is already suppressed)
    const isOverLink = isHoveringOverLink();
    if (isOverLink) {
      cursorElement.style.display = 'none';
      return;
    }
    
    const wasInSimulation = isInSimulation;
    isInSimulation = isMouseInSimulation(clientX, clientY);
    
    cursorElement.style.left = `${clientX}px`;
    cursorElement.style.top = `${clientY}px`;
    document.body.style.cursor = 'none';
    
    if (isInSimulation) {
      cursorElement.style.display = 'block';
      
      if (!wasInSimulation) {
        // Entering simulation: animate from full size to dot
        cursorElement.style.transform = FULL_SCALE;
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
        cursorElement.style.transform = FULL_SCALE;
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
    // Page fade-in completes around: wallDelay (300ms) + wallDuration*0.3 (240ms) + elementDuration (200ms) = ~740ms
    // Start cursor fade-in after page fade-in completes, with additional delay for alignment
    const globals = getGlobals();
    const wallDelay = globals.entranceWallTransitionDelay || 300;
    const wallDuration = globals.entranceWallTransitionDuration || 800;
    const elementDuration = globals.entranceElementDuration || 200;
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

  function prefersReducedMotion$1() {
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
    if (prefersReducedMotion$1()) return;

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
    if (prefersReducedMotion$1()) return;
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


  const DT = CONSTANTS.PHYSICS_DT;
  let acc = 0;
  const CORNER_RADIUS = 42; // matches rounded container corners
  const CORNER_FORCE = 1800;
  const WARMUP_FRAME_DT = 1 / 60;

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

  function updatePhysicsInternal(dtSeconds, applyForcesFunc) {
    const globals = getGlobals();
    const balls = globals.balls;
    const canvas = globals.canvas;
    
    if (!canvas) return;

    if (balls.length === 0) return;

    // Kaleidoscope modes have their own lightweight physics path:
    // - Smooth (per-frame), not fixed-timestep accumulator
    // - Collisions on (prevents overlap)
    // - NO rubber wall deformation / impacts
    // - Simple bounds handling (no corner repellers, no wall wobble)
    if (globals.currentMode === MODES.KALEIDOSCOPE ||
        globals.currentMode === MODES.KALEIDOSCOPE_1 ||
        globals.currentMode === MODES.KALEIDOSCOPE_2 ||
        globals.currentMode === MODES.KALEIDOSCOPE_3) {
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
    wallState.clearPressureFrame();
    
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
      // - Disabled for Orbit 3D (clean swirl aesthetic)
      // - Reduced for Kaleidoscope modes (performance)
      // - Standard for Tilt (many light balls flow like water)
      if (globals.currentMode === MODES.KALEIDOSCOPE ||
          globals.currentMode === MODES.KALEIDOSCOPE_1 ||
          globals.currentMode === MODES.KALEIDOSCOPE_2 ||
          globals.currentMode === MODES.KALEIDOSCOPE_3) {
        resolveCollisions(6); // handled by kaleidoscope early-return, kept for safety
      } else if (globals.currentMode !== MODES.FLIES && 
                 globals.currentMode !== MODES.ORBIT_3D &&
                 globals.currentMode !== MODES.PARALLAX_LINEAR &&
                 globals.currentMode !== MODES.PARALLAX_PERSPECTIVE) {
        resolveCollisions(collisionIterations); // configurable solver iterations
      }

      // Reset per-step caps/counters (impacts + pressure-event budget)
      wallState.resetStepBudgets();
      
      // Wall collisions + corner repellers
      // Skip for Orbit modes (they orbit freely without wall constraints)
      // Skip for Parallax modes (they have internal wrap logic, no wall physics)
      // Skip for Lattice mode (infinite mesh extends beyond viewport, no wall physics needed)
      if (globals.currentMode !== MODES.ORBIT_3D && 
          globals.currentMode !== MODES.ORBIT_3D_2 &&
          globals.currentMode !== MODES.PARALLAX_LINEAR &&
          globals.currentMode !== MODES.PARALLAX_PERSPECTIVE &&
          globals.currentMode !== MODES.LATTICE) {
        const wallRestitution = (globals.currentMode === MODES.WEIGHTLESS) ? globals.weightlessBounce : globals.REST;
        const isPitLike = (globals.currentMode === MODES.PIT || globals.currentMode === MODES.PIT_THROWS);
        const lenWalls = balls.length;
        for (let i = 0; i < lenWalls; i++) {
          // Ball Pit has explicit rounded-corner arc clamping in Ball.walls().
          // Avoid an additional velocity-based corner repeller there, which can
          // create local compressions in dense corner stacks.
          if (!isPitLike) applyCornerRepellers(balls[i], canvas);
          balls[i].walls(canvas.width, canvas.height, DT, wallRestitution);
        }
      }

      // Ball Pit stabilization:
      // Wall/corner clamping can re-introduce overlaps in dense stacks (especially near the floor).
      // Run a small post-wall collision pass for Pit-like modes only.
      if (globals.currentMode === MODES.PIT || globals.currentMode === MODES.PIT_THROWS) {
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
          mode !== MODES.ORBIT_3D &&
          mode !== MODES.ORBIT_3D_2 &&
          mode !== MODES.PARALLAX_LINEAR &&
          mode !== MODES.PARALLAX_PERSPECTIVE &&
          mode !== MODES.KALEIDOSCOPE &&
          mode !== MODES.KALEIDOSCOPE_1 &&
          mode !== MODES.KALEIDOSCOPE_2 &&
          mode !== MODES.KALEIDOSCOPE_3 &&
          mode !== MODES.PIT &&
          mode !== MODES.PIT_THROWS;

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
    wallState.step(dtSeconds);

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

    // Hard clip the entire render to the rounded-rect canvas radius.
    // This prevents “corner bleed” on iOS/mobile (balls peeking past rounded corners),
    // especially in modes that use non-rounded bounds (e.g., Kaleidoscope).
    const clipPath = globals.canvasClipPath;
    if (clipPath) {
      ctx.save();
      try { ctx.clip(clipPath); } catch (e) {}
    }
    
    const modeRenderer = getModeRenderer();
    if (modeRenderer && modeRenderer.preRender) {
      modeRenderer.preRender(ctx);
    }
    
    // Draw balls (or mode-specific renderer)
    if (globals.currentMode === MODES.KALEIDOSCOPE ||
        globals.currentMode === MODES.KALEIDOSCOPE_1 ||
        globals.currentMode === MODES.KALEIDOSCOPE_2 ||
        globals.currentMode === MODES.KALEIDOSCOPE_3) {
      renderKaleidoscope(ctx);
    } else {
    for (let i = 0; i < balls.length; i++) {
      balls[i].draw(ctx);
      }
    }

    if (modeRenderer && modeRenderer.postRender) {
      modeRenderer.postRender(ctx);
    }
    
    // Restore clip BEFORE drawing walls (walls extend beyond canvas edges)
    if (clipPath) {
      ctx.restore();
    }
    
    // Mouse trail: draw after clip restore so it's always visible
    drawMouseTrail(ctx);
    
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


  // Theme states: 'auto', 'light', 'dark'
  let currentTheme = 'auto'; // Default to auto (system + night heuristic)
  let systemPreference = 'light';
  let isDarkModeInitialized = false;

  /**
   * Sync CSS variables from config values (called at init)
   * This ensures config-driven colors override CSS defaults
   */
  function syncCssVarsFromConfig() {
    const g = getGlobals();
    const root = document.documentElement;
    
    // Backgrounds
    if (g?.bgLight) {
      root.style.setProperty('--bg-light', g.bgLight);
      root.style.setProperty('--chrome-bg-light', g.bgLight);
    }
    if (g?.bgDark) {
      root.style.setProperty('--bg-dark', g.bgDark);
      root.style.setProperty('--chrome-bg-dark', g.bgDark);
    }
    // Frame colors: separate light and dark mode wall colors
    // IMPORTANT: Only use frameColorLight/frameColorDark - do NOT fallback to frameColor
    // as it would override the separate light/dark colors set by the control panel
    if (g?.frameColorLight) {
      root.style.setProperty('--frame-color-light', g.frameColorLight);
    }
    if (g?.frameColorDark) {
      root.style.setProperty('--frame-color-dark', g.frameColorDark);
    }
    // Wall colors automatically point to frameColor via CSS (--wall-color-light: var(--frame-color-light))
    // Update browser chrome with the appropriate color for current mode
    const chromeColor = g.isDarkMode ? g?.frameColorDark : g?.frameColorLight;
    if (chromeColor) {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = chromeColor;
      root.style.setProperty('--chrome-bg', chromeColor);
    }
    
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
    if (g?.edgeLabelColorLight) {
      root.style.setProperty('--edge-label-color-light', g.edgeLabelColorLight);
    }
    if (g?.edgeLabelColorDark) {
      root.style.setProperty('--edge-label-color-dark', g.edgeLabelColorDark);
    }
    if (Number.isFinite(g?.edgeLabelInsetAdjustPx)) {
      root.style.setProperty('--edge-label-inset-adjust', `${g.edgeLabelInsetAdjustPx}px`);
    }
    
    // Link colors
    if (g?.linkHoverColor) {
      root.style.setProperty('--link-hover-color', g.linkHoverColor);
    }
    
    // Logo colors
    if (g?.logoColorLight) {
      root.style.setProperty('--logo-color-light', g.logoColorLight);
    }
    if (g?.logoColorDark) {
      root.style.setProperty('--logo-color-dark', g.logoColorDark);
    }
    
    // Portfolio logo colors (separate from index)
    if (g?.portfolioLogoColorLight) {
      root.style.setProperty('--portfolio-logo-color-light', g.portfolioLogoColorLight);
    }
    if (g?.portfolioLogoColorDark) {
      root.style.setProperty('--portfolio-logo-color-dark', g.portfolioLogoColorDark);
    }
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
   * Uses wall colors (frame colors) for browser chrome to match the wall appearance
   */
  function updateThemeColor(isDark) {
    const g = getGlobals();
    // Use wall colors (frame colors) for browser chrome - matches the wall appearance
    const lightColor = g?.frameColorLight || readTokenVar('--frame-color-light', '#0a0a0a');
    const darkColor = g?.frameColorDark || readTokenVar('--frame-color-dark', '#0a0a0a');
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
    
    // 1) If the browser ignores theme-color (desktop Chrome tabs), adapt the wall to match the browser UI.
    // 2) Then update meta theme-color from the (possibly updated) CSS vars.
    applyChromeHarmony(isDark);
    updateThemeColor(isDark);
    
    // Sync chrome color for rubbery walls
    syncChromeColor();
    
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

    // Sync CSS variables from config FIRST (before theme application)
    syncCssVarsFromConfig();

    // Detect system preference (for auto mode later)
    systemPreference = detectSystemPreference();
    log(`🖥️ System prefers: ${systemPreference}`);
    
    // Restore saved preference if available; otherwise default to Auto.
    let initial = 'auto';
    try {
      const saved = localStorage.getItem('theme-preference');
      if (saved === 'auto' || saved === 'light' || saved === 'dark') initial = saved;
    } catch (e) {}
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
    'noiseSpeedBackMs',
    'noiseSpeedFrontMs',
    'noiseFlicker',
    'noiseFlickerSpeedMs',
    'noiseBlurPx',
    'noiseContrast',
    'noiseBrightness',
    'noiseSaturation',
    'noiseHue',
    'noiseSizeBase',
    'noiseSizeTop',
    'noiseBackOpacity',
    'noiseFrontOpacity',
    'noiseBackOpacityDark',
    'noiseFrontOpacityDark',
    'noiseTopOpacity',
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

  function clampInt$1(v, min, max, fallback) {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  function clamp01$1(v, fallback = 0) {
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
    const colorMix = clamp01$1(chroma, 0);
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

    root.style.setProperty('--abs-noise-speed-back', `${Math.max(0, Math.round(cfg.noiseSpeedBackMs))}ms`);
    root.style.setProperty('--abs-noise-speed-front', `${Math.max(0, Math.round(cfg.noiseSpeedFrontMs))}ms`);
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
    const baseMotionPx = clampNumber(clampNumber(cfg.noiseSizeTop, 20, 600, 150) * 0.55, 24, 120, 82);
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

    // Existing theme vars (kept stable, but driven from state for panel + config export).
    root.style.setProperty('--noise-size-base', `${Math.round(cfg.noiseSizeBase)}px`);
    root.style.setProperty('--noise-size-top', `${Math.round(cfg.noiseSizeTop)}px`);

    root.style.setProperty('--noise-back-opacity-light', String(cfg.noiseBackOpacity));
    root.style.setProperty('--noise-front-opacity-light', String(cfg.noiseFrontOpacity));
    root.style.setProperty('--noise-back-opacity-dark', String(cfg.noiseBackOpacityDark));
    root.style.setProperty('--noise-front-opacity-dark', String(cfg.noiseFrontOpacityDark));
    root.style.setProperty('--noise-top-opacity', String(cfg.noiseTopOpacity));
    root.style.setProperty('--detail-noise-opacity', String(cfg.detailNoiseOpacity ?? 1));
  }

  function sanitizeConfig(input = {}) {
    const cssNoiseSizeBase = readRootVarNumber('--noise-size-base', 100);
    const cssNoiseSizeTop = readRootVarNumber('--noise-size-top', 150);
    const cssBackOpacityLight = readRootVarNumber('--noise-back-opacity-light', 0.025);
    const cssFrontOpacityLight = readRootVarNumber('--noise-front-opacity-light', 0.055);
    const cssBackOpacityDark = readRootVarNumber('--noise-back-opacity-dark', 0.12);
    const cssFrontOpacityDark = readRootVarNumber('--noise-front-opacity-dark', 0.08);
    const cssTopOpacity = readRootVarNumber('--noise-top-opacity', 0.01);

    const out = {
      // Texture
      noiseSeed: clampInt$1(input.noiseSeed, 0, 999999, 1337),
      noiseTextureSize: clampInt$1(input.noiseTextureSize, 64, 512, 256),
      noiseDistribution: pickEnum(input.noiseDistribution, ['uniform', 'gaussian'], 'gaussian'),
      noiseMonochrome: input.noiseMonochrome !== undefined ? Boolean(input.noiseMonochrome) : true,
      noiseChroma: clamp01$1(input.noiseChroma, 0.35),

      // Motion
      noiseEnabled: input.noiseEnabled !== undefined ? Boolean(input.noiseEnabled) : true,
      noiseMotion: pickEnum(input.noiseMotion, ['jitter', 'drift', 'static'], 'jitter'),
      noiseMotionAmount: clampNumber(input.noiseMotionAmount, 0, 2.5, 1.0),
      noiseSpeedBackMs: clampInt$1(input.noiseSpeedBackMs, 0, 10000, 1800),
      noiseSpeedFrontMs: clampInt$1(input.noiseSpeedFrontMs, 0, 10000, 1100),
      noiseFlicker: clampNumber(input.noiseFlicker, 0, 1, 0.12),
      noiseFlickerSpeedMs: clampInt$1(input.noiseFlickerSpeedMs, 0, 5000, 220),

      // Look (baked into tile for minimal runtime cost; blur remains optional CSS filter)
      noiseBlurPx: clampNumber(input.noiseBlurPx, 0, 6, 0),
      noiseContrast: clampNumber(input.noiseContrast, 0.25, 5, 1.35),
      noiseBrightness: clampNumber(input.noiseBrightness, 0.25, 3, 1.0),
      noiseSaturation: clampNumber(input.noiseSaturation, 0, 3, 1.0),
      noiseHue: clampNumber(input.noiseHue, 0, 360, 0),

      // Existing layer controls (with CSS token fallbacks)
      noiseSizeBase: clampNumber(input.noiseSizeBase, 20, 400, cssNoiseSizeBase),
      noiseSizeTop: clampNumber(input.noiseSizeTop, 20, 600, cssNoiseSizeTop),
      noiseBackOpacity: clampNumber(input.noiseBackOpacity, 0, 0.3, cssBackOpacityLight),
      noiseFrontOpacity: clampNumber(input.noiseFrontOpacity, 0, 0.3, cssFrontOpacityLight),
      noiseBackOpacityDark: clampNumber(input.noiseBackOpacityDark, 0, 0.5, cssBackOpacityDark),
      noiseFrontOpacityDark: clampNumber(input.noiseFrontOpacityDark, 0, 0.5, cssFrontOpacityDark),
      noiseTopOpacity: clampNumber(input.noiseTopOpacity, 0, 0.25, cssTopOpacity),
      detailNoiseOpacity: clampNumber(input.detailNoiseOpacity, 0, 1, 1),
    };

    // If monochrome is on, chroma does nothing but keep a stable number.
    if (out.noiseMonochrome) out.noiseChroma = clamp01$1(out.noiseChroma, 0.35);

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
      } catch (e) {}
      if (activeObjectUrl) {
        try { URL.revokeObjectURL(activeObjectUrl); } catch (e) {}
      }
      activeObjectUrl = null;
      return;
    }

    if (!force && textureKey === lastTextureKey) return;
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
    if (!path) {
      console.warn('[config-sync] Invalid sync request:', { configType, path });
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
        // Only log if it's not a typical network failure.
        if (e?.name !== 'TypeError') console.warn('[config-sync] Sync error:', e?.message);
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
      if (e.name !== 'TypeError' || !e.message.includes('fetch')) {
        console.warn('[config-sync] Bulk save error:', e.message);
      }
      return false;
    }
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
  // PANEL SCOPES (MASTER vs HOME)
  // ═══════════════════════════════════════════════════════════════════════════════

  const MASTER_SECTION_KEYS = [
    // Artist-first order: start with the physical world, then look/texture, then interaction.
    'physics',            // global material world (mass, bounce, drag, perf)
    'wall',               // boundary feel + wobble
    'balls',              // ball material + spacing
    'colorDistribution',  // what's inside (palette mix)
    'colors',             // surface + text + frame
    'uiSpacing',          // content padding + hit areas + link/footer spacing
    'noise',              // grain/texture
    'cursor',             // interaction feel
    'trail',              // motion styling
    'links',              // link styling, padding, color, impact motion
    'scene',              // global scene motion
    'overlay',            // gate/overlays
    'entrance',           // dramatic page entrance animation
    'environment'         // browser/theme behavior
  ];

  // Category groupings for visual chunking in the panel
  const SECTION_CATEGORIES = {
    'physics': 'MATERIAL WORLD',
    'wall': 'MATERIAL WORLD',
    'balls': 'MATERIAL WORLD',

    'colorDistribution': 'LOOK & PALETTE',
    'colors': 'LOOK & PALETTE',
    'noise': 'LOOK & PALETTE',

    'cursor': 'INTERACTION',
    'trail': 'INTERACTION',
    'links': 'INTERACTION',

    'scene': 'MOTION',
    'entrance': 'MOTION',

    'overlay': 'DEPTH & LAYOUT',
    'layout': 'DEPTH & LAYOUT',
    'uiSpacing': 'DEPTH & LAYOUT',

    'sound': 'SOUND',
    'environment': 'ENVIRONMENT'
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRESET APPLIERS (avoid circular dependencies by keeping them here)
  // ═══════════════════════════════════════════════════════════════════════════════

  function applyParallaxLinearPreset(presetName, reinit = true) {
    const preset = PARALLAX_LINEAR_PRESETS[presetName];
    if (!preset) return;

    const g = getGlobals();
    for (const [key, val] of Object.entries(preset)) {
      if (key === 'label') continue;
      if (g[key] !== undefined) g[key] = val;
    }
    g.parallaxLinearPreset = presetName;

    if (reinit) {
      Promise.resolve().then(function () { return modeController; }).then(({ resetCurrentMode }) => resetCurrentMode());
    }

    try { syncSlidersToState(); } catch (e) {}
    console.log(`Applied parallax linear preset: ${preset.label}`);
  }

  function applyParallaxPerspectivePreset(presetName, reinit = true) {
    const preset = PARALLAX_PERSPECTIVE_PRESETS[presetName];
    if (!preset) return;

    const g = getGlobals();
    for (const [key, val] of Object.entries(preset)) {
      if (key === 'label') continue;
      if (g[key] !== undefined) g[key] = val;
    }
    g.parallaxPerspectivePreset = presetName;

    if (reinit) {
      Promise.resolve().then(function () { return modeController; }).then(({ resetCurrentMode }) => resetCurrentMode());
    }

    try { syncSlidersToState(); } catch (e) {}
    console.log(`Applied parallax perspective preset: ${preset.label}`);
  }

  function warmupFramesControl(stateKey) {
    return {
      id: stateKey,
      label: 'Warmup Frames',
      stateKey,
      type: 'range',
      min: 0, max: 240, step: 1,
      default: 10,
      format: v => String(Math.round(v)),
      parse: v => parseInt(v, 10),
      reinitMode: true,
      hint: 'Pre-runs physics before first render to avoid visible settling on mode start.'
    };
  }

  function safeFormat(control, value) {
    try {
      if (typeof control?.format === 'function') return control.format(value);
    } catch (e) {}
    return String(value ?? '');
  }

  function escapeAttr(value) {
    // Minimal attribute escaping for safe HTML string generation.
    // (We only use this for titles/tooltips coming from known strings.)
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

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
   *   type: 'range' | 'checkbox' | 'toggle' | 'select',
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
    // BROWSER / THEME ENVIRONMENT
    // ═══════════════════════════════════════════════════════════════════════════
    environment: {
      title: 'Browser',
      icon: '🧭',
      defaultOpen: false,
      controls: [
        {
          id: 'chromeHarmonyMode',
          label: 'Chrome Harmony',
          stateKey: 'chromeHarmonyMode',
          type: 'select',
          options: [
            { value: 'auto', label: 'Auto (adapt only when needed)' },
            { value: 'site', label: 'Site (benchmark)' },
            { value: 'browser', label: 'Browser (force adapt)' }
          ],
          default: 'site',
          format: v => String(v),
          parse: v => String(v),
          hint: 'If desktop browsers ignore theme-color, the wall adapts to match the browser UI palette.',
          onChange: (g) => {
            Promise.resolve().then(function () { return darkModeV2; }).then(({ getCurrentTheme, setTheme }) => {
              setTheme(getCurrentTheme());
            }).catch(() => {});
          }
        },
        {
          id: 'autoDarkModeEnabled',
          label: 'Auto Dark (Night)',
          stateKey: 'autoDarkModeEnabled',
          type: 'checkbox',
          default: true,
          format: v => (v ? 'On' : 'Off'),
          parse: v => !!v,
          hint: 'In Auto theme, prefer Dark during the night window (privacy-first: local clock only).',
          onChange: () => {
            Promise.resolve().then(function () { return darkModeV2; }).then(({ getCurrentTheme, setTheme }) => {
              if (getCurrentTheme() === 'auto') setTheme('auto');
            }).catch(() => {});
          }
        },
        {
          id: 'autoDarkNightStartHour',
          label: 'Night Starts',
          stateKey: 'autoDarkNightStartHour',
          type: 'range',
          min: 0, max: 23, step: 1,
          default: 18,
          format: v => `${Math.round(v)}:00`,
          parse: v => parseInt(v, 10),
          onChange: () => {
            Promise.resolve().then(function () { return darkModeV2; }).then(({ getCurrentTheme, setTheme }) => {
              if (getCurrentTheme() === 'auto') setTheme('auto');
            }).catch(() => {});
          }
        },
        {
          id: 'autoDarkNightEndHour',
          label: 'Night Ends',
          stateKey: 'autoDarkNightEndHour',
          type: 'range',
          min: 0, max: 23, step: 1,
          default: 6,
          format: v => `${Math.round(v)}:00`,
          parse: v => parseInt(v, 10),
          onChange: () => {
            Promise.resolve().then(function () { return darkModeV2; }).then(({ getCurrentTheme, setTheme }) => {
              if (getCurrentTheme() === 'auto') setTheme('auto');
            }).catch(() => {});
          }
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // PHYSICS (GLOBAL) — shared material world across physics-based simulations
    // ═══════════════════════════════════════════════════════════════════════════
    physics: {
      title: 'Material World',
      icon: '⚖️',
      defaultOpen: false,
      controls: [
        {
          id: 'ballMassKg',
          label: 'Ball Mass',
          stateKey: 'ballMassKg',
          type: 'range',
          min: 20, max: 400, step: 1,
          default: 91,
          format: v => `${Math.round(v)} kg`,
          parse: v => parseInt(v, 10),
          hint: 'Heavier = snooker feel (more inertia, less jitter).',
          onChange: (g, val) => {
            // Apply immediately to existing balls
            const m = Number(val);
            if (!Number.isFinite(m)) return;
            if (Array.isArray(g.balls)) {
              for (let i = 0; i < g.balls.length; i++) {
                const b = g.balls[i];
                if (b) b.m = m;
              }
            }
          }
        },
        {
          id: 'REST',
          label: 'Restitution',
          stateKey: 'REST',
          type: 'range',
          min: 0, max: 0.95, step: 0.01,
          default: 0.42,
          format: v => v.toFixed(2),
          parse: parseFloat,
          hint: 'Global bounciness for collisions (modes may override).'
        },
        {
          id: 'FRICTION',
          label: 'Friction',
          stateKey: 'FRICTION',
          type: 'range',
          min: 0, max: 0.06, step: 0.001,
          default: 0.018,
          format: v => v.toFixed(3),
          parse: parseFloat,
          hint: 'Global drag/energy loss (modes may override).'
        },

        // Performance + stability controls
        {
          id: 'physicsCollisionIterations',
          label: 'Collision Iterations',
          stateKey: 'physicsCollisionIterations',
          type: 'range',
          min: 3, max: 20, step: 1,
          default: 10,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          group: 'Performance',
          groupCollapsed: true,
          hint: 'How many times per frame we resolve collisions. Lower = faster, higher = tighter stacks.'
        },
        {
          id: 'physicsSkipSleepingCollisions',
          label: 'Skip Sleeping Pairs',
          stateKey: 'physicsSkipSleepingCollisions',
          type: 'toggle',
          default: true,
          group: 'Performance',
          hint: 'When enabled, collisions between two sleeping balls are skipped until something wakes them. Big CPU win with piles.'
        },
        {
          id: 'physicsSpatialGridOptimization',
          label: 'Grid Reuse',
          stateKey: 'physicsSpatialGridOptimization',
          type: 'toggle',
          default: true,
          group: 'Performance',
          hint: 'Reuses the spatial grid data structures to reduce allocations/GC. Keep on unless debugging.'
        },
        {
          id: 'physicsSleepThreshold',
          label: 'Sleep Threshold',
          stateKey: 'physicsSleepThreshold',
          type: 'range',
          min: 0, max: 30, step: 1,
          default: 12,
          format: v => `${Math.round(v)} px/s`,
          parse: v => parseInt(v, 10),
          group: 'Performance',
          hint: 'Velocity below which a ball is considered “at rest” (non‑Pit modes). 0 disables sleeping.'
        },
        {
          id: 'physicsSleepTime',
          label: 'Sleep Time',
          stateKey: 'physicsSleepTime',
          type: 'range',
          min: 0, max: 1.0, step: 0.05,
          default: 0.25,
          format: v => `${v.toFixed(2)}s`,
          parse: parseFloat,
          group: 'Performance',
          hint: 'How long a ball must stay under the Sleep Threshold before it sleeps. Higher = more stability + more performance.'
        },
        {
          id: 'physicsSkipSleepingSteps',
          label: 'Skip Sleeping Steps',
          stateKey: 'physicsSkipSleepingSteps',
          type: 'toggle',
          default: true,
          group: 'Performance',
          hint: 'When enabled, sleeping balls don’t run physics integration each tick. Improves performance; tiny motions may be delayed until wake.'
        }
      ]
    },

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
          id: 'mobileObjectReductionFactor',
          label: 'Mobile Density',
          stateKey: 'mobileObjectReductionFactor',
          type: 'range',
          min: 0, max: 1.0, step: 0.05,
          default: 0.7,
          format: v => `${Math.round(v * 100)}%`,
          parse: parseFloat,
          hint: 'Scales object counts on mobile (0% = none). Resets the current mode.',
          onChange: (g, _val) => {
            Promise.resolve().then(function () { return modeController; }).then(({ setMode }) => {
              setMode(g.currentMode);
            }).catch(() => {});
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
          min: 0, max: 0.5, step: 0.01,
          default: 0.08,
          format: v => Math.round(v * 100) + '%',
          parse: parseFloat,
          hint: 'Collision gap as % of ball radius (affects physics)'
        },
        {
          id: 'sizeVariationGlobalMul',
          label: 'Variation Scale',
          stateKey: 'sizeVariationGlobalMul',
          type: 'range',
          min: 0, max: 2.0, step: 0.05,
          default: 1.0,
          format: v => v.toFixed(2) + 'x',
          parse: parseFloat,
          hint: 'Global multiplier for per-mode size variation',
          onChange: (g, _val) => {
            Promise.resolve().then(function () { return state$1; }).then(({ updateBallSizes }) => {
              updateBallSizes();
            });
          }
        },
        {
          id: 'sizeVariationCap',
          label: 'Variation Cap',
          stateKey: 'sizeVariationCap',
          type: 'range',
          min: 0, max: 0.2, step: 0.01,
          default: 0.2,
          format: v => Math.round(v * 100) + '%',
          parse: parseFloat,
          hint: 'Max radius deviation from medium (20% = ±20%)',
          onChange: (g, _val) => {
            Promise.resolve().then(function () { return state$1; }).then(({ updateBallSizes }) => {
              updateBallSizes();
            });
          }
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CURSOR
    // ═══════════════════════════════════════════════════════════════════════════
    cursor: {
      title: 'Hand',
      icon: '🖐️',
      defaultOpen: false,
      controls: [
        {
          id: 'cursorInfluenceRadiusVw',
          label: 'Influence Radius',
          stateKey: 'cursorInfluenceRadiusVw',
          type: 'range',
          min: 0, max: 80, step: 0.5,
          default: 14,
          format: v => `${v.toFixed(1)}vw`,
          parse: parseFloat,
          hint: 'Universal cursor interaction zone (scales with viewport width).'
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // TRAIL - Mouse cursor and trail controls (consolidated)
    // ═══════════════════════════════════════════════════════════════════════════
    trail: {
      title: 'Mouse & Trail',
      icon: '🖐️',
      defaultOpen: false,
      controls: [
        {
          id: 'cursorSize',
          label: 'Cursor Size',
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
        },
        {
          id: 'mouseTrailEnabled',
          label: 'Trail Enabled',
          stateKey: 'mouseTrailEnabled',
          type: 'checkbox',
          default: true
        },
        {
          id: 'mouseTrailLength',
          label: 'Trail Length',
          stateKey: 'mouseTrailLength',
          type: 'range',
          min: 4, max: 96, step: 1,
          default: 18,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          hint: 'Max samples kept (higher = smoother, slightly more work)'
        },
        {
          id: 'mouseTrailSize',
          label: 'Trail Size',
          stateKey: 'mouseTrailSize',
          type: 'range',
          min: 0.5, max: 10, step: 0.1,
          default: 1.3,
          format: v => v.toFixed(1) + 'px',
          parse: parseFloat
        },
        {
          id: 'mouseTrailFadeMs',
          label: 'Trail Fade',
          stateKey: 'mouseTrailFadeMs',
          type: 'range',
          min: 40, max: 1200, step: 10,
          default: 220,
          format: v => `${Math.round(v)}ms`,
          parse: v => parseInt(v, 10)
        },
        {
          id: 'mouseTrailOpacity',
          label: 'Trail Opacity',
          stateKey: 'mouseTrailOpacity',
          type: 'range',
          min: 0, max: 1, step: 0.01,
          default: 0.35,
          format: v => v.toFixed(2),
          parse: parseFloat
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // UI SPACING - Consolidated spacing/padding for most text UI (no duplicates)
    // ═══════════════════════════════════════════════════════════════════════════
    uiSpacing: {
      title: 'UI Spacing',
      icon: '📏',
      defaultOpen: false,
      controls: [
        { type: 'divider', label: 'Content' },
         {
           id: 'contentPaddingRatio',
           label: 'Padding Additive',
           stateKey: 'contentPaddingRatio',
           type: 'range',
           min: -0.05, max: 0.10, step: 0.001,
           default: 0,
           format: v => `${(Number(v) * 100).toFixed(1)}%`,
           parse: parseFloat,
           hint: 'Additive padding as a fraction of viewport size (sqrt(w*h)). Back-compat: old px values are auto-converted.',
           onChange: (g, val) => {
             const valueToSync = val !== undefined ? val : (g.contentPaddingRatio !== undefined ? g.contentPaddingRatio : 0);
             // Sync to config file (dev mode only) - do this first to ensure it happens
             syncConfigToFile('default', 'contentPaddingRatio', valueToSync);
             
             Promise.resolve().then(function () { return state$1; }).then(({ applyLayoutFromVwToPx, applyLayoutCSSVars }) => {
               applyLayoutFromVwToPx();
               applyLayoutCSSVars();
               try {
                 const el = document.getElementById('contentPaddingRatioVal');
                 if (el) {
                   const frac = Number(valueToSync) || 0;
                   const viewportSize = (() => {
                     try {
                       const v = getComputedStyle(document.documentElement).getPropertyValue('--layout-viewport-size-px').trim();
                       const n = parseFloat(v);
                       return Number.isFinite(n) ? n : 0;
                     } catch (e) { return 0; }
                   })();
                   const addPx = Math.round(viewportSize * frac);
                   const total = Math.round(g.contentPadding || 0);
                   el.textContent = `${(frac >= 0 ? '+' : '')}${(frac * 100).toFixed(1)}% (${addPx >= 0 ? '+' : ''}${addPx}px) → ${total}px`;
                 }
               } catch (e) {}
               try { document.dispatchEvent(new CustomEvent('layout-updated')); } catch (e) {}
             }).catch(() => {});
             Promise.resolve().then(function () { return renderer; }).then(({ resize }) => { try { resize(); } catch (e) {} }).catch(() => {});
           }
         },
         {
           id: 'contentPaddingHorizontalRatio',
           label: 'Horizontal Ratio',
           stateKey: 'contentPaddingHorizontalRatio',
           type: 'range',
           min: 0.5, max: 2.5, step: 0.05,
           default: 1.0,
           format: v => `${Number(v).toFixed(2)}×`,
           parse: parseFloat,
           hint: 'Horizontal padding = base × ratio.',
           onChange: (g) => {
             Promise.resolve().then(function () { return state$1; }).then(({ applyLayoutFromVwToPx, applyLayoutCSSVars }) => {
               applyLayoutFromVwToPx();
               applyLayoutCSSVars();
               try {
                 const el = document.getElementById('contentPaddingHorizontalRatioVal');
                 if (el) {
                   const ratio = Number(g.contentPaddingHorizontalRatio || 1.0);
                   el.textContent = `${ratio.toFixed(2)}× → ${Math.round(g.contentPaddingX || g.contentPadding)}px`;
                 }
               } catch (e) {}
             }).catch(() => {});
           }
         },

        { type: 'divider', label: 'Hit Areas' },
        {
          id: 'uiHitAreaMul',
          label: 'Hit Area Mul',
          stateKey: 'uiHitAreaMul',
          type: 'range',
          min: 0.5, max: 2.5, step: 0.05,
          default: 1,
          format: v => `${Number(v).toFixed(2)}×`,
          parse: parseFloat,
          hint: 'Scales most UI button/link hit areas (drives --ui-hit-area-mul).',
          onChange: (_g, val) => {
            document.documentElement.style.setProperty('--ui-hit-area-mul', String(val));
          }
        },

        { type: 'divider', label: 'Icon Buttons' },
        {
          id: 'uiIconFramePx',
          label: 'Icon Frame Size',
          stateKey: 'uiIconFramePx',
          type: 'range',
          min: 0, max: 120, step: 1,
          default: 0,
          format: v => (Number(v) <= 0 ? 'Auto' : `${Math.round(v)}px`),
          parse: v => parseInt(v, 10),
          hint: 'Square icon button frame size (height/width). 0 = auto (derived from icon padding tokens).',
          onChange: (_g, val) => {
            const root = document.documentElement;
            if (Number(val) <= 0) root.style.removeProperty('--ui-icon-frame-size');
            else root.style.setProperty('--ui-icon-frame-size', `${Math.round(val)}px`);
          }
        },
        {
          id: 'uiIconGlyphPx',
          label: 'Icon Glyph Size',
          stateKey: 'uiIconGlyphPx',
          type: 'range',
          min: 0, max: 64, step: 1,
          default: 0,
          format: v => (Number(v) <= 0 ? 'Auto' : `${Math.round(v)}px`),
          parse: v => parseInt(v, 10),
          hint: 'Icon glyph size inside the square frame. 0 = auto (uses token defaults).',
          onChange: (_g, val) => {
            const root = document.documentElement;
            if (Number(val) <= 0) root.style.removeProperty('--ui-icon-glyph-size');
            else root.style.setProperty('--ui-icon-glyph-size', `${Math.round(val)}px`);
          }
        },
        {
          id: 'uiIconGroupMarginPx',
          label: 'Icon Group Margin',
          stateKey: 'uiIconGroupMarginPx',
          type: 'range',
          min: -60, max: 60, step: 1,
          default: 0,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10),
          hint: 'Margin applied to the social icon group. Use negative values to push icons outward.',
          onChange: (_g, val) => {
            const root = document.documentElement;
            if (Number(val) === 0) root.style.removeProperty('--ui-icon-group-margin');
            else root.style.setProperty('--ui-icon-group-margin', `${Math.round(val)}px`);
          }
        },
        {
          id: 'uiIconCornerRadiusMul',
          label: 'Corner Radius',
          stateKey: 'uiIconCornerRadiusMul',
          type: 'range',
          min: 0, max: 1, step: 0.01,
          default: 0.4,
          format: v => `${Math.round(Number(v) * 100)}% of wall`,
          parse: parseFloat,
          hint: 'Icon button corner radius as a fraction of wall radius (drives --ui-icon-corner-radius-mul).',
          onChange: (_g, val) => {
            document.documentElement.style.setProperty('--ui-icon-corner-radius-mul', String(val));
          }
        },

        {
          id: 'uiIconFramePx',
          label: 'Frame Size',
          stateKey: 'uiIconFramePx',
          type: 'range',
          min: 0, max: 140, step: 1,
          default: 0,
          format: v => (Math.round(Number(v)) <= 0 ? 'Auto' : `${Math.round(Number(v))}px`),
          parse: v => parseInt(v, 10),
          hint: 'Square icon button frame size (px). 0 = use token-derived default (--ui-icon-frame-size).',
          onChange: (_g, val) => {
            try {
              const root = document.documentElement;
              const n = Math.round(Number(val || 0));
              if (n > 0) root.style.setProperty('--ui-icon-frame-size', `${n}px`);
              else root.style.removeProperty('--ui-icon-frame-size');
            } catch (e) {}
          }
        },
        {
          id: 'uiIconGlyphPx',
          label: 'Glyph Size',
          stateKey: 'uiIconGlyphPx',
          type: 'range',
          min: 0, max: 80, step: 1,
          default: 0,
          format: v => (Math.round(Number(v)) <= 0 ? 'Auto' : `${Math.round(Number(v))}px`),
          parse: v => parseInt(v, 10),
          hint: 'Icon glyph size (px). 0 = use token-derived default (--ui-icon-glyph-size).',
          onChange: (_g, val) => {
            try {
              const root = document.documentElement;
              const n = Math.round(Number(val || 0));
              if (n > 0) root.style.setProperty('--ui-icon-glyph-size', `${n}px`);
              else root.style.removeProperty('--ui-icon-glyph-size');
            } catch (e) {}
          }
        },

        { type: 'divider', label: 'Links' },
        {
          id: 'linkTextPadding',
          label: 'Text Link Padding',
          stateKey: 'linkTextPadding',
          type: 'range',
          min: 4, max: 40, step: 1,
          default: 30,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10),
          hint: 'Padding for text links (footer links, CV links).',
          onChange: (_g, val) => {
            document.documentElement.style.setProperty('--link-text-padding', `${val}px`);
            document.documentElement.style.setProperty('--link-text-margin', `${-val}px`);
          }
        },
        {
          id: 'linkIconPadding',
          label: 'Icon Link Padding',
          stateKey: 'linkIconPadding',
          type: 'range',
          min: 4, max: 40, step: 1,
          default: 24,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10),
          hint: 'Legacy: used to derive auto icon button sizing when Icon Frame Size is set to Auto.',
          onChange: (_g, val) => {
            document.documentElement.style.setProperty('--link-icon-padding', `${val}px`);
            document.documentElement.style.setProperty('--link-icon-margin', `${-val}px`);
          }
        },

        { type: 'divider', label: 'Footer + Labels' },
        {
          id: 'footerNavBarTopVh',
          label: 'Nav Bar Position',
          stateKey: 'footerNavBarTopVh',
          type: 'range',
          min: 0, max: 100, step: 0.5,
          default: 50,
          format: v => `${Number(v).toFixed(1)}vh`,
          parse: v => parseFloat(v),
          hint: 'Vertical position of footer nav bar from top of viewport.',
          onChange: (_g, val) => {
            const root = document.documentElement;
            root.style.setProperty('--footer-nav-bar-top', `${val}vh`);
            root.style.setProperty('--footer-nav-bar-top-svh', `${val}svh`);
            root.style.setProperty('--footer-nav-bar-top-dvh', `${val}dvh`);
          }
        },
        {
          id: 'footerNavBarGapVw',
          label: 'Nav Link Gap',
          stateKey: 'footerNavBarGapVw',
          type: 'range',
          min: 0, max: 10, step: 0.1,
          default: 2.5,
          format: v => `${Number(v).toFixed(1)}vw`,
          parse: v => parseFloat(v),
          hint: 'Horizontal gap between nav bar links (vw → clamp).',
          onChange: (_g, val) => {
            const vw = Number(val);
            if (!Number.isFinite(vw)) return;
            const minPx = Math.round(vw * 9.6);
            const maxPx = Math.round(minPx * 1.67);
            document.documentElement.style.setProperty('--footer-nav-bar-gap', `clamp(${minPx}px, ${vw}vw, ${maxPx}px)`);
          }
        },
        {
          id: 'homeMainLinksBelowLogoPx',
          label: 'Links Offset',
          stateKey: 'homeMainLinksBelowLogoPx',
          type: 'range',
          min: -120, max: 240, step: 1,
          default: 40,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10),
          hint: 'Index: move the main links up/down below the logo.',
          onChange: (_g, val) => {
            document.documentElement.style.setProperty('--home-main-links-below-logo-px', String(val));
          }
        },
        {
          id: 'edgeLabelInsetAdjustPx',
          label: 'Edge Label Inset',
          stateKey: 'edgeLabelInsetAdjustPx',
          type: 'range',
          min: -120, max: 240, step: 1,
          default: 0,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10),
          hint: 'Adjusts edge label inset relative to wall. Higher = inward; lower = outward.',
          onChange: () => {
            Promise.resolve().then(function () { return state$1; }).then(mod => {
              mod.applyLayoutCSSVars();
            }).catch(() => {});
          }
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // LINKS - Link styling (color influence + impact motion)
    // ═══════════════════════════════════════════════════════════════════════════
    links: {
      title: 'Links',
      icon: '🔗',
      defaultOpen: false,
      controls: [
        {
          id: 'linkColorInfluence',
          label: 'Color Influence',
          stateKey: 'linkColorInfluence',
          type: 'range',
          min: 0, max: 1, step: 0.01,
          default: 1,
          format: v => v.toFixed(2),
          parse: parseFloat,
          hint: 'How much cursor color affects link colors (0 = none, 1 = full)',
          onChange: (g, val) => {
            document.documentElement.style.setProperty('--link-color-influence', String(val));
          }
        },
        {
          id: 'linkImpactScale',
          label: 'Impact Scale',
          stateKey: 'linkImpactScale',
          type: 'range',
          min: 0.7, max: 1.0, step: 0.01,
          default: 0.95,
          format: v => v.toFixed(2),
          parse: parseFloat,
          hint: 'Scale when link is pressed (lower = more dramatic press)',
          onChange: (g, val) => {
            document.documentElement.style.setProperty('--link-impact-scale', String(val));
          }
        },
        {
          id: 'linkImpactBlur',
          label: 'Impact Blur',
          stateKey: 'linkImpactBlur',
          type: 'range',
          min: 0, max: 20, step: 0.5,
          default: 10,
          format: v => `${v.toFixed(1)}px`,
          parse: parseFloat,
          hint: 'Blur amount when link is pressed (creates depth effect)',
          onChange: (g, val) => {
            document.documentElement.style.setProperty('--link-impact-blur', `${val}px`);
          }
        },
        {
          id: 'linkImpactDuration',
          label: 'Impact Duration',
          stateKey: 'linkImpactDuration',
          type: 'range',
          min: 50, max: 300, step: 10,
          default: 150,
          format: v => `${Math.round(v)}ms`,
          parse: v => parseInt(v, 10),
          hint: 'Duration of press animation (fast and subtle)',
          onChange: (g, val) => {
            document.documentElement.style.setProperty('--link-impact-duration', `${val}ms`);
          }
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SCENE - Mode change "click-in" micro-interaction tuning
    // ═══════════════════════════════════════════════════════════════════════════
    scene: {
      title: 'Scene Impact',
      icon: '🎬',
      defaultOpen: false,
      controls: [
        {
          id: 'sceneImpactEnabled',
          label: 'Enabled',
          stateKey: 'sceneImpactEnabled',
          type: 'checkbox',
          default: true,
          hint: 'If disabled, mode changes will not animate the scene.'
        },
        {
          id: 'sceneImpactMul',
          label: 'Click Depth',
          stateKey: 'sceneImpactMul',
          type: 'range',
          min: 0.0, max: 0.05, step: 0.001,
          default: 0.010,
          format: (v) => v.toFixed(3),
          parse: parseFloat,
          hint: 'How far the entire scene “presses in” on simulation change.',
          onChange: (_g, val) => {
            const el = document.getElementById('abs-scene');
            if (!el) return;
            const g = _g || {};
            const f = Number(g.sceneImpactMobileMulFactor);
            const factor = (Number.isFinite(f) && f > 0) ? f : 1.0;
            const isMobile = Boolean(g.isMobile || g.isMobileViewport);
            const eff = Number(val) * (isMobile ? factor : 1.0);
            el.style.setProperty('--abs-scene-impact-mul', String(eff));
          }
        },
        {
          id: 'sceneImpactLogoCompMul',
          label: 'Logo Comp',
          stateKey: 'sceneImpactLogoCompMul',
          type: 'range',
          min: 0.25, max: 6.0, step: 0.05,
          default: 3.6,
          format: (v) => v.toFixed(2) + 'x',
          parse: parseFloat,
          hint: 'How strongly the logo counter-scales against the scene press (higher = logo feels more “anchored”).',
          onChange: (_g, val) => {
            const el = document.getElementById('abs-scene');
            if (!el) return;
            const v = Number(val);
            const safe = (Number.isFinite(v) && v > 0) ? v : 1.0;
            el.style.setProperty('--abs-scene-impact-logo-comp-mul', String(safe));
          }
        },
        {
          id: 'sceneImpactMobileMulFactor',
          label: 'Mobile Depth ×',
          stateKey: 'sceneImpactMobileMulFactor',
          type: 'range',
          min: 0.25, max: 3.0, step: 0.05,
          default: 1.0,
          format: (v) => v.toFixed(2) + 'x',
          parse: parseFloat,
          hint: 'Multiplier applied to Click Depth on mobile-sized viewports.',
          onChange: (_g, val) => {
            const el = document.getElementById('abs-scene');
            if (!el) return;
            const g = _g || {};
            const base = Number(g.sceneImpactMul);
            const baseMul = Number.isFinite(base) ? base : 0;
            const f = Number(val);
            const factor = (Number.isFinite(f) && f > 0) ? f : 1.0;
            const isMobile = Boolean(g.isMobile || g.isMobileViewport);
            const eff = baseMul * (isMobile ? factor : 1.0);
            el.style.setProperty('--abs-scene-impact-mul', String(eff));
          }
        },
        {
          id: 'sceneImpactPressMs',
          label: 'Press',
          stateKey: 'sceneImpactPressMs',
          type: 'range',
          min: 20, max: 300, step: 5,
          default: 90,
          format: (v) => `${Math.round(v)}ms`,
          parse: (v) => parseInt(v, 10),
          hint: 'Press-in duration.'
        },
        {
          id: 'sceneImpactReleaseMs',
          label: 'Release',
          stateKey: 'sceneImpactReleaseMs',
          type: 'range',
          min: 40, max: 1200, step: 10,
          default: 310,
          format: (v) => `${Math.round(v)}ms`,
          parse: (v) => parseInt(v, 10),
          hint: 'Release duration (“bounce out” length).'
        },
        {
          id: 'sceneImpactAnticipation',
          label: 'Anticipation',
          stateKey: 'sceneImpactAnticipation',
          type: 'range',
          min: 0.0, max: 0.6, step: 0.01,
          default: 0.0,
          format: (v) => v.toFixed(2),
          parse: parseFloat,
          hint: 'Micro pre-pop before the click-in (0 = off).'
        },
        {
          id: 'sceneChangeSoundEnabled',
          label: 'Scene Sound',
          stateKey: 'sceneChangeSoundEnabled',
          type: 'checkbox',
          default: true,
          hint: 'Plays a soft “pebble-like” tick when switching simulations (only if sound is enabled).'
        },
        {
          id: 'sceneChangeSoundIntensity',
          label: 'Scene Sound Intensity',
          stateKey: 'sceneChangeSoundIntensity',
          type: 'range',
          min: 0.0, max: 1.0, step: 0.01,
          default: 0.35,
          format: (v) => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'sceneChangeSoundRadius',
          label: 'Scene Sound Pitch',
          stateKey: 'sceneChangeSoundRadius',
          type: 'range',
          min: 6, max: 60, step: 1,
          default: 18,
          format: (v) => `${Math.round(v)}`,
          parse: (v) => parseInt(v, 10),
          hint: 'Higher = lower pitch (maps like “ball size”).'
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // OVERLAY - Blur, Depth Effect
    // ═══════════════════════════════════════════════════════════════════════════
    overlay: {
      title: 'Depth & Blur',
      icon: '🌫️',
      defaultOpen: false,
      controls: [
        {
          id: 'gateOverlayEnabled',
          label: 'Enabled',
          stateKey: 'gateOverlayEnabled',
          type: 'checkbox',
          default: true
        },
        {
          id: 'gateOverlayOpacity',
          label: 'White Wash',
          stateKey: 'gateOverlayOpacity',
          type: 'range',
          min: 0, max: 0.1, step: 0.001,
          default: 0.01,
          format: v => v.toFixed(3),
          parse: parseFloat,
          onChange: (g, val) => {
            Promise.resolve().then(function () { return gateOverlay; }).then(({ updateOverlayOpacity }) => {
              updateOverlayOpacity(val);
            });
          }
        },
        {
          id: 'gateOverlayTransitionMs',
          label: 'Anim In Speed',
          stateKey: 'gateOverlayTransitionMs',
          type: 'range',
          min: 200, max: 1500, step: 50,
          default: 800,
          format: v => `${Math.round(v)}ms`,
          parse: v => parseInt(v, 10),
          hint: 'Duration for blur & depth zoom when opening',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return gateOverlay; }).then(({ updateOverlayTransition }) => {
              updateOverlayTransition(val);
            });
          }
        },
        {
          id: 'gateOverlayTransitionOutMs',
          label: 'Anim Out Speed',
          stateKey: 'gateOverlayTransitionOutMs',
          type: 'range',
          min: 200, max: 1200, step: 50,
          default: 600,
          format: v => `${Math.round(v)}ms`,
          parse: v => parseInt(v, 10),
          hint: 'Duration for blur & depth zoom when closing',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return gateOverlay; }).then(({ updateOverlayTransitionOut }) => {
              updateOverlayTransitionOut(val);
            });
          }
        },
        {
          id: 'gateOverlayContentDelayMs',
          label: 'Content Delay',
          stateKey: 'gateOverlayContentDelayMs',
          type: 'range',
          min: 0, max: 1000, step: 50,
          default: 200,
          format: v => `${Math.round(v)}ms`,
          parse: v => parseInt(v, 10),
          hint: 'Wait before showing dialog content',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return gateOverlay; }).then(({ updateGateContentDelay }) => {
              updateGateContentDelay(val);
            });
          }
        },
        {
          id: 'gateDepthScale',
          label: 'Depth Scale',
          stateKey: 'gateDepthScale',
          type: 'range',
          min: 0.9, max: 1.0, step: 0.001,
          default: 0.96,
          format: v => v.toFixed(3),
          parse: parseFloat,
          hint: 'Scene scale when gate opens (0.9-1.0)',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return gateOverlay; }).then(({ updateGateDepthScale }) => {
              updateGateDepthScale(val);
            });
          }
        },
        {
          id: 'gateDepthTranslateY',
          label: 'Depth Shift',
          stateKey: 'gateDepthTranslateY',
          type: 'range',
          min: 0, max: 30, step: 1,
          default: 8,
          format: v => `${Math.round(v)}px`,
          parse: parseInt,
          hint: 'Vertical shift when gate opens',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return gateOverlay; }).then(({ updateGateDepthTranslateY }) => {
              updateGateDepthTranslateY(val);
            });
          }
        },
        {
          id: 'logoOpacityInactive',
          label: 'Logo Opacity Closed',
          stateKey: 'logoOpacityInactive',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 1,
          format: v => v.toFixed(2),
          parse: parseFloat,
          hint: 'Logo opacity when gate is closed (1 = fully visible)',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return gateOverlay; }).then(({ updateLogoOpacityInactive }) => {
              updateLogoOpacityInactive(val);
            });
          }
        },
        {
          id: 'logoOpacityActive',
          label: 'Logo Opacity Open',
          stateKey: 'logoOpacityActive',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0.2,
          format: v => v.toFixed(2),
          parse: parseFloat,
          hint: 'Logo opacity when gate is active (0.2 = more faded)',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return gateOverlay; }).then(({ updateLogoOpacityActive }) => {
              updateLogoOpacityActive(val);
            });
          }
        },
        {
          id: 'logoBlurInactive',
          label: 'Logo Blur Closed',
          stateKey: 'logoBlurInactive',
          type: 'range',
          min: 0, max: 20, step: 0.5,
          default: 0,
          format: v => `${v.toFixed(1)}px`,
          parse: parseFloat,
          hint: 'Logo blur when gate is closed (0 = sharp)',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return gateOverlay; }).then(({ updateLogoBlurInactive }) => {
              updateLogoBlurInactive(val);
            });
          }
        },
        {
          id: 'logoBlurActive',
          label: 'Logo Blur Open',
          stateKey: 'logoBlurActive',
          type: 'range',
          min: 0, max: 30, step: 0.5,
          default: 12,
          format: v => `${v.toFixed(1)}px`,
          parse: parseFloat,
          hint: 'Logo blur when gate is active (12px = soft blur)',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return gateOverlay; }).then(({ updateLogoBlurActive }) => {
              updateLogoBlurActive(val);
            });
          }
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // COLORS - Full color system (backgrounds, text, links, logo)
    // ═══════════════════════════════════════════════════════════════════════════
    colors: {
      title: 'Color & Surface',
      icon: '🎨',
      defaultOpen: false,
      controls: [
        // ─── BACKGROUNDS ─────────────────────────────────────────────────────
        { type: 'divider', label: 'Backgrounds' },
        {
          id: 'bgLight',
          label: 'Light Mode',
          stateKey: 'bgLight',
          type: 'color',
          default: '#f5f5f5',
          hint: 'Background color for light mode',
          onChange: (g, val) => {
            const root = document.documentElement;
            root.style.setProperty('--bg-light', val);
            if (!g.isDarkMode) {
              root.style.setProperty('--chrome-bg', val);
              const meta = document.querySelector('meta[name="theme-color"]');
              if (meta) meta.content = val;
            }
          }
        },
        {
          id: 'bgDark',
          label: 'Dark Mode',
          stateKey: 'bgDark',
          type: 'color',
          default: '#0a0a0a',
          hint: 'Background color for dark mode',
          onChange: (g, val) => {
            const root = document.documentElement;
            root.style.setProperty('--bg-dark', val);
            if (g.isDarkMode) {
              root.style.setProperty('--chrome-bg', val);
              const meta = document.querySelector('meta[name="theme-color"]');
              if (meta) meta.content = val;
            }
          }
        },
        // ─── TEXT (LIGHT MODE) ───────────────────────────────────────────────
        { type: 'divider', label: 'Text · Light Mode' },
        {
          id: 'textColorLight',
          label: 'Primary',
          stateKey: 'textColorLight',
          type: 'color',
          default: '#161616',
          hint: 'Main text color in light mode',
          onChange: (g, val) => {
            const root = document.documentElement;
            root.style.setProperty('--text-color-light', val);
          }
        },
        {
          id: 'textColorLightMuted',
          label: 'Muted',
          stateKey: 'textColorLightMuted',
          type: 'color',
          default: '#2f2f2f',
          hint: 'Secondary/muted text in light mode',
          onChange: (g, val) => {
            const root = document.documentElement;
            root.style.setProperty('--text-color-light-muted', val);
          }
        },
        
        // ─── TEXT (DARK MODE) ────────────────────────────────────────────────
        { type: 'divider', label: 'Text · Dark Mode' },
        {
          id: 'textColorDark',
          label: 'Primary',
          stateKey: 'textColorDark',
          type: 'color',
          default: '#b3b3b3',
          hint: 'Main text color in dark mode',
          onChange: (g, val) => {
            const root = document.documentElement;
            root.style.setProperty('--text-color-dark', val);
          }
        },
        {
          id: 'textColorDarkMuted',
          label: 'Muted',
          stateKey: 'textColorDarkMuted',
          type: 'color',
          default: '#808080',
          hint: 'Secondary/muted text in dark mode',
          onChange: (g, val) => {
            const root = document.documentElement;
            root.style.setProperty('--text-color-dark-muted', val);
          }
        },

        // ─── EDGE LABELS (CHAPTER + COPYRIGHT) ─────────────────────────────────
        { type: 'divider', label: 'Edge Labels' },
        {
          id: 'edgeLabelColorLight',
          label: 'Light Mode',
          stateKey: 'edgeLabelColorLight',
          type: 'color',
          default: '#2f2f2f',
          hint: 'Color for the vertical edge labels in light mode',
          onChange: (_g, val) => {
            document.documentElement.style.setProperty('--edge-label-color-light', val);
          }
        },
        {
          id: 'edgeLabelColorDark',
          label: 'Dark Mode',
          stateKey: 'edgeLabelColorDark',
          type: 'color',
          default: '#b3b3b3',
          hint: 'Color for the vertical edge labels in dark mode',
          onChange: (_g, val) => {
            document.documentElement.style.setProperty('--edge-label-color-dark', val);
          }
        },
        
        
        // ─── LINKS ───────────────────────────────────────────────────────────
        { type: 'divider', label: 'Links' },
        {
          id: 'linkHoverColor',
          label: 'Hover Accent',
          stateKey: 'linkHoverColor',
          type: 'color',
          default: '#ff4013',
          hint: 'Link hover color (accent)',
          onChange: (g, val) => {
            const root = document.documentElement;
            root.style.setProperty('--link-hover-color', val);
          }
        },
        
        // ─── LOGO ────────────────────────────────────────────────────────────
        { type: 'divider', label: 'Logo' },
        {
          id: 'logoColorLight',
          label: 'Light Mode',
          stateKey: 'logoColorLight',
          type: 'color',
          default: '#161616',
          hint: 'Logo color in light mode',
          onChange: (_g, val) => {
            // Only set CSS variable - let CSS handle mode switching
            document.documentElement.style.setProperty('--logo-color-light', val);
          }
        },
        {
          id: 'logoColorDark',
          label: 'Dark Mode',
          stateKey: 'logoColorDark',
          type: 'color',
          default: '#d5d5d5',
          hint: 'Logo color in dark mode',
          onChange: (_g, val) => {
            // Only set CSS variable - let CSS handle mode switching
            document.documentElement.style.setProperty('--logo-color-dark', val);
          }
        },
        {
          id: 'topLogoWidthVw',
          label: 'Logo Size',
          stateKey: 'topLogoWidthVw',
          type: 'range',
          min: 15, max: 45, step: 0.25,
          default: 35,
          format: (v) => `${parseFloat(v).toFixed(2)}vw`,
          parse: parseFloat,
          hint: 'Top-center logo width (clamped by min/max tokens).',
          onChange: (_g, val) => {
            document.documentElement.style.setProperty('--top-logo-width-vw', String(val));
          }
        },
        { type: 'divider', label: 'Portfolio Logo' },
        {
          id: 'portfolioLogoColorLight',
          label: 'Light Mode',
          stateKey: 'portfolioLogoColorLight',
          type: 'color',
          default: '#161616',
          hint: 'Portfolio logo color in light mode (separate from index)',
          onChange: (_g, val) => {
            document.documentElement.style.setProperty('--portfolio-logo-color-light', val);
          }
        },
        {
          id: 'portfolioLogoColorDark',
          label: 'Dark Mode',
          stateKey: 'portfolioLogoColorDark',
          type: 'color',
          default: '#d5d5d5',
          hint: 'Portfolio logo color in dark mode (separate from index)',
          onChange: (_g, val) => {
            document.documentElement.style.setProperty('--portfolio-logo-color-dark', val);
          }
        }
      ]
    },


    // ═══════════════════════════════════════════════════════════════════════════
    // PORTFOLIO PAGE - Controls removed to protect main page regression
    // (Controls should be implemented within the portfolio page if needed)
    // ═══════════════════════════════════════════════════════════════════════════
    /*
    portfolio: {
      ...
    },
    */

    // ═══════════════════════════════════════════════════════════════════════════
    colorDistribution: {
      title: 'Palette Mix',
      icon: '🧩',
      defaultOpen: false,
      controls: [
        {
          id: 'colorDistribution',
          label: 'Disciplines',
          stateKey: 'colorDistribution',
          type: 'colorDistribution',
          // Labels are fixed; you assign which palette slot + weight each label gets.
          labels: [
            'AI Integration',
            'UI/UX Design',
            'Creative Strategy',
            'Frontend Development',
            'Brand Identity',
            '3D Design',
            'Art Direction'
          ],
          hint: 'Assign each discipline to a palette color, then set weights that sum to 100%. Used for all ball spawns across modes.'
        }
      ]
    },

    // Inner shadow removed

    // ═══════════════════════════════════════════════════════════════════════════
    // WALL - Unified Frame & Physics
    // ═══════════════════════════════════════════════════════════════════════════
    wall: {
      title: 'WALL',
      icon: '🫧',
      defaultOpen: false,
      controls: [
        {
          id: 'frameColorLight',
          label: 'Color · Light Mode',
          stateKey: 'frameColorLight',
          type: 'color',
          default: '#0a0a0a',
          hint: 'Wall color in light mode (also used for browser chrome)',
          onChange: (g, val) => {
            const root = document.documentElement;
            root.style.setProperty('--frame-color-light', val);
            // Wall colors automatically updated via CSS: --wall-color-light: var(--frame-color-light)
            // Update browser chrome if in light mode
            if (!g.isDarkMode) {
              const meta = document.querySelector('meta[name="theme-color"]');
              if (meta) meta.content = val;
              root.style.setProperty('--chrome-bg', val);
            }
            // Invalidate wall color cache so it picks up the new color immediately
            Promise.resolve().then(function () { return engine; }).then(mod => {
              mod.syncChromeColor();
            });
          }
        },
        {
          id: 'frameColorDark',
          label: 'Color · Dark Mode',
          stateKey: 'frameColorDark',
          type: 'color',
          default: '#0a0a0a',
          hint: 'Wall color in dark mode (also used for browser chrome)',
          onChange: (g, val) => {
            const root = document.documentElement;
            root.style.setProperty('--frame-color-dark', val);
            // Wall colors automatically updated via CSS: --wall-color-dark: var(--frame-color-dark)
            // Update browser chrome if in dark mode
            if (g.isDarkMode) {
              const meta = document.querySelector('meta[name="theme-color"]');
              if (meta) meta.content = val;
              root.style.setProperty('--chrome-bg', val);
            }
            // Invalidate wall color cache so it picks up the new color immediately
            Promise.resolve().then(function () { return engine; }).then(mod => {
              mod.syncChromeColor();
            });
          }
        },
        {
          id: 'wallPreset',
          label: 'Wall Preset',
          stateKey: 'wallPreset',
          type: 'select',
          // Preserve insertion order from WALL_PRESETS (curated order in constants.js)
          options: Object.entries(WALL_PRESETS).map(([key, preset]) => ({
            value: key,
            label: preset?.label ? preset.label : key
          })),
          default: 'pudding',
          format: v => String(v),
          onChange: (g, val) => {
            applyWallPreset(String(val), g);
            // UI sync only (no control side-effects like full page reloads).
            syncSlidersToState({ runOnChange: false });

            // Reload ONLY the simulation state (not the page, not the panel DOM).
            // Preset values are read live by the physics/render loops, so we mainly want to:
            // - clear existing wall deformation so the new material starts clean
            // - wake balls so changes are obvious immediately
            try { wallState?.reset?.(); } catch (e) {}
            try {
              const balls = Array.isArray(g?.balls) ? g.balls : [];
              for (let i = 0; i < balls.length; i++) balls[i]?.wake?.();
            } catch (e) {}

            // IMPORTANT UX: After interacting with a <select>, keyboard mode switching (ArrowLeft/ArrowRight)
            // is intentionally ignored because the key handler skips INPUT/TEXTAREA/SELECT targets.
            // Blur so mode switching resumes immediately after choosing a preset.
            try {
              const el = document.getElementById('wallPresetSlider');
              if (el && typeof el.blur === 'function') el.blur();
              else if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
            } catch (e) {}
          },
          hint: 'Curated wall “types” that set multiple wall sliders at once.'
        },
        {
          id: 'wallThicknessVw',
          label: 'Wall Thickness',
          stateKey: 'wallThicknessVw',
          type: 'range',
          min: 0, max: 8, step: 0.1,
          default: 1.3,
          format: v => `${v.toFixed(1)}vw`,
          parse: parseFloat,
          hint: 'Wall tube thickness (content padding is layout-only)',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return state$1; }).then(mod => {
              mod.applyLayoutFromVwToPx();
              mod.applyLayoutCSSVars();
              // Update overlay blur which depends on wall thickness
              Promise.resolve().then(function () { return gateOverlay; }).then(({ updateBlurFromWallThickness }) => {
                updateBlurFromWallThickness();
              });
            });
          }
        },
        {
          id: 'wallThicknessAreaMultiplier',
          label: 'Area Scaling',
          stateKey: 'wallThicknessAreaMultiplier',
          type: 'range',
          min: 0, max: 2, step: 0.01,
          default: 0.0,
          format: v => `${v.toFixed(2)}×`,
          parse: parseFloat,
          hint: 'Area-based scaling multiplier (0.0 = vw-only, 1.0 = full area scaling, >1.0 = exaggerated)',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return state$1; }).then(mod => {
              mod.applyLayoutFromVwToPx();
              mod.applyLayoutCSSVars();
              // Update overlay blur which depends on wall thickness
              Promise.resolve().then(function () { return gateOverlay; }).then(({ updateBlurFromWallThickness }) => {
                updateBlurFromWallThickness();
              });
            });
          }
        },
        {
          id: 'wallRadiusVw',
          label: 'Corner Radius',
          stateKey: 'wallRadiusVw',
          type: 'range',
          min: 0, max: 12, step: 0.1,
          default: 3.7,
          format: v => `${v.toFixed(1)}vw`,
          parse: parseFloat,
          onChange: (g, val) => {
            Promise.resolve().then(function () { return state$1; }).then(mod => {
              mod.applyLayoutFromVwToPx();
              mod.applyLayoutCSSVars();
            });
          }
        },
        {
          id: 'wallInset',
          label: 'Collision Inset',
          stateKey: 'wallInset',
          type: 'range',
          min: 0, max: 20, step: 1,
          default: 2,
          format: v => `${v}px`,
          parse: v => parseInt(v, 10),
          hint: 'Physics padding inside the visual wall'
        },
        {
          id: 'mobileWallThicknessXFactor',
          label: 'Mobile L/R Thickness',
          stateKey: 'mobileWallThicknessXFactor',
          type: 'range',
          min: 0.5, max: 3.0, step: 0.05,
          default: 1.4,
          format: v => `${v.toFixed(2)}×`,
          parse: parseFloat,
          hint: 'Wall thickness multiplier for LEFT/RIGHT sides on mobile',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return state$1; }).then(mod => {
              mod.applyLayoutFromVwToPx();
              mod.applyLayoutCSSVars();
            });
          }
        },
        {
          id: 'mobileEdgeLabelsVisible',
          label: 'Mobile Edge Labels',
          stateKey: 'mobileEdgeLabelsVisible',
          type: 'toggle',
          default: true,
          hint: 'Show side edge labels on mobile (chapter/copyright)',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return state$1; }).then(mod => {
              mod.applyLayoutCSSVars();
            });
          }
        },
        {
          id: 'mobileEdgeLabelSizeFactor',
          label: 'Mobile Label Size',
          stateKey: 'mobileEdgeLabelSizeFactor',
          type: 'range',
          min: 0.3, max: 2.0, step: 0.05,
          default: 0.85,
          format: v => `${v.toFixed(2)}×`,
          parse: parseFloat,
          hint: 'Font size multiplier for edge labels on mobile',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return state$1; }).then(mod => {
              mod.applyLayoutCSSVars();
            });
          }
        },
        {
          id: 'mobileEdgeLabelOpacity',
          label: 'Mobile Label Opacity',
          stateKey: 'mobileEdgeLabelOpacity',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0.5,
          format: v => `${(v * 100).toFixed(0)}%`,
          parse: parseFloat,
          hint: 'Opacity for edge labels on mobile',
          onChange: (g, val) => {
            Promise.resolve().then(function () { return state$1; }).then(mod => {
              mod.applyLayoutCSSVars();
            });
          }
        },
        
        // ═══════════════════════════════════════════════════════════════════
        // WALL PHYSICS & MATERIAL
        // 2-column grid layout for compact organization
        // ═══════════════════════════════════════════════════════════════════
        {
          id: 'wallWobbleMaxDeform',
          label: 'Deformation',
          stateKey: 'wallWobbleMaxDeform',
          type: 'range',
          min: 10, max: 150, step: 5,
          default: 60,
          format: v => `${v}px`,
          parse: v => parseInt(v, 10),
          group: 'Wall Material',
          groupLayout: 'grid-2col',
          hint: 'Max flex distance. Low = rigid, High = soft'
        },
        {
          id: 'wallWobbleStiffness',
          label: 'Stiffness',
          stateKey: 'wallWobbleStiffness',
          type: 'range',
          min: 50, max: 3000, step: 10,
          default: 120,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          group: 'Wall Material',
          hint: 'Spring strength. Low = soft, High = firm'
        },
        {
          id: 'restitution',
          label: 'Bounce',
          stateKey: 'restitution',
          type: 'range',
          min: 0.3, max: 0.95, step: 0.05,
          default: 0.70,
          format: v => `${Math.round(v * 100)}%`,
          parse: parseFloat,
          group: 'Wall Material',
          hint: 'Energy kept on bounce. 100% = elastic, 30% = soft'
        },
        {
          id: 'wallWobbleDamping',
          label: 'Damping',
          stateKey: 'wallWobbleDamping',
          type: 'range',
          min: 0, max: 80, step: 1,
          default: 35,
          format: v => String(v),
          parse: v => parseInt(v, 10),
          group: 'Wall Material',
          hint: 'Oscillation decay. High = viscous/slow'
        },
        {
          id: 'wallWobbleSigma',
          label: 'Impact Spread',
          stateKey: 'wallWobbleSigma',
          type: 'range',
          min: 0.5, max: 6.0, step: 0.1,
          default: 2.0,
          format: v => v.toFixed(1),
          parse: parseFloat,
          group: 'Wall Material',
          hint: 'Blob size. High = pudding, Low = rubber'
        },
        {
          id: 'wallWobbleSettlingSpeed',
          label: 'Settle Speed',
          stateKey: 'wallWobbleSettlingSpeed',
          type: 'range',
          min: 0, max: 100, step: 1,
          default: 75,
          format: v => `${v}%`,
          parse: v => parseInt(v, 10),
          group: 'Wall Material',
          hint: 'Snap-to-flat aggression when still'
        },
        {
          id: 'wallWobbleCornerClamp',
          label: 'Corner Stiffness',
          stateKey: 'wallWobbleCornerClamp',
          type: 'range',
          min: 0.0, max: 1.0, step: 0.01,
          default: 0.6,
          format: v => v.toFixed(2),
          parse: parseFloat,
          group: 'Wall Behavior',
          groupLayout: 'grid-2col',
          groupCollapsed: true,
          hint: '1.0 = locked corners, 0 = flexible corners'
        },
        {
          id: 'wallWobbleImpactThreshold',
          label: 'Impact Gate',
          stateKey: 'wallWobbleImpactThreshold',
          type: 'range',
          min: 20, max: 200, step: 1,
          default: 140,
          format: v => `${v} px/s`,
          parse: v => parseInt(v, 10),
          group: 'Wall Behavior',
          hint: 'Min impact speed to trigger deformation'
        },
        {
          id: 'wallWobbleMaxVel',
          label: 'Max Wall Speed',
          stateKey: 'wallWobbleMaxVel',
          type: 'range',
          min: 100, max: 2000, step: 10,
          default: 800,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          group: 'Performance Caps',
          groupLayout: 'grid-2col',
          groupCollapsed: true,
          hint: 'Velocity cap to prevent erratic spikes'
        },
        {
          id: 'wallWobbleMaxImpulse',
          label: 'Max Impulse',
          stateKey: 'wallWobbleMaxImpulse',
          type: 'range',
          min: 20, max: 600, step: 5,
          default: 220,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          group: 'Performance Caps',
          hint: 'Per-sample impact cap for smoother behavior'
        },
        {
          id: 'wallWobbleMaxEnergyPerStep',
          label: 'Max Energy/Tick',
          stateKey: 'wallWobbleMaxEnergyPerStep',
          type: 'range',
          min: 1000, max: 80000, step: 500,
          default: 20000,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          group: 'Performance Caps',
          hint: 'Safety budget to prevent runaway spikes'
        },

        // Wall Performance
        {
          id: 'wallPhysicsSamples',
          label: 'Physics Samples',
          stateKey: 'wallPhysicsSamples',
          type: 'range',
          min: 8, max: 96, step: 1,
          default: 48,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          group: 'Performance',
          groupCollapsed: true,
          hint: 'Visual-only. Lower = faster, higher = smoother blobs.'
        },
        {
          id: 'wallPhysicsSkipInactive',
          label: 'Skip When Still',
          stateKey: 'wallPhysicsSkipInactive',
          type: 'toggle',
          default: true,
          group: 'Performance',
          hint: 'Stops integrating the wall when it\'s already at rest.'
        },
        {
          id: 'wallRenderDecimation',
          label: 'Render Detail',
          stateKey: 'wallRenderDecimation',
          type: 'range',
          min: 1, max: 12, step: 1,
          default: 2,
          format: v => `${Math.round(v)}`,
          parse: v => parseInt(v, 10),
          group: 'Performance',
          hint: '1=ultra smooth, 2=default, 4=faster, 12=very fast/polygonal (rendering only).'
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // NOISE - Texture overlay
    // ═══════════════════════════════════════════════════════════════════════════
    noise: {
      title: 'Grain',
      icon: '🧂',
      defaultOpen: false,
      controls: [
        {
          id: 'noiseEnabled',
          label: 'Enabled',
          stateKey: 'noiseEnabled',
          type: 'checkbox',
          default: true,
          format: v => (v ? 'On' : 'Off'),
          parse: v => !!v,
          group: 'Render',
          hint: 'Procedural noise texture (no GIF).',
          onChange: (_g, val) => applyNoiseSystem({ noiseEnabled: val })
        },
        {
          id: 'noiseSeed',
          label: 'Seed',
          stateKey: 'noiseSeed',
          type: 'range',
          min: 0, max: 999999, step: 1,
          default: 1337,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          group: 'Texture',
          hint: 'Changes the generated grain pattern.',
          onChange: (_g, val) => applyNoiseSystem({ noiseSeed: val })
        },
        {
          id: 'noiseTextureSize',
          label: 'Tile Size',
          stateKey: 'noiseTextureSize',
          type: 'range',
          min: 64, max: 512, step: 32,
          default: 256,
          format: v => `${Math.round(v)} px`,
          parse: v => parseInt(v, 10),
          group: 'Texture',
          hint: 'Bigger tiles reduce repetition but cost more memory.',
          onChange: (_g, val) => applyNoiseSystem({ noiseTextureSize: val })
        },
        {
          id: 'noiseDistribution',
          label: 'Distribution',
          stateKey: 'noiseDistribution',
          type: 'select',
          options: [
            { value: 'gaussian', label: 'Gaussian (filmic)' },
            { value: 'uniform', label: 'Uniform (flat)' }
          ],
          default: 'gaussian',
          format: v => String(v),
          parse: v => String(v),
          group: 'Texture',
          onChange: (_g, val) => applyNoiseSystem({ noiseDistribution: val })
        },
        {
          id: 'noiseMonochrome',
          label: 'Monochrome',
          stateKey: 'noiseMonochrome',
          type: 'checkbox',
          default: true,
          format: v => (v ? 'On' : 'Off'),
          parse: v => !!v,
          group: 'Texture',
          hint: 'Off = subtle RGB grain.',
          onChange: (_g, val) => applyNoiseSystem({ noiseMonochrome: val })
        },
        {
          id: 'noiseChroma',
          label: 'Chroma',
          stateKey: 'noiseChroma',
          type: 'range',
          min: 0, max: 1, step: 0.01,
          default: 0.35,
          format: v => `${Math.round(v * 100)}%`,
          parse: parseFloat,
          group: 'Texture',
          hint: 'How different R/G/B channels are (ignored when Monochrome is on).',
          onChange: (_g, val) => applyNoiseSystem({ noiseChroma: val })
        },
        {
          id: 'noiseSizeBase',
          label: 'Back Scale',
          stateKey: 'noiseSizeBase',
          type: 'range',
          min: 20, max: 400, step: 5,
          default: 100,
          format: v => `${Math.round(v)} px`,
          parse: v => parseInt(v, 10),
          group: 'Layers',
          onChange: (_g, val) => applyNoiseSystem({ noiseSizeBase: val })
        },
        {
          id: 'noiseSizeTop',
          label: 'Front Scale',
          stateKey: 'noiseSizeTop',
          type: 'range',
          min: 20, max: 600, step: 5,
          default: 150,
          format: v => `${Math.round(v)} px`,
          parse: v => parseInt(v, 10),
          group: 'Layers',
          onChange: (_g, val) => applyNoiseSystem({ noiseSizeTop: val })
        },
        {
          id: 'noiseTopOpacity',
          label: 'Top Opacity',
          stateKey: 'noiseTopOpacity',
          type: 'range',
          min: 0, max: 0.25, step: 0.005,
          default: 0.01,
          format: v => v.toFixed(3),
          parse: parseFloat,
          group: 'Layers',
          hint: 'Extra subtle layer (used by .noise-3).',
          onChange: (_g, val) => applyNoiseSystem({ noiseTopOpacity: val })
        },
        {
          id: 'noiseBackOpacity',
          label: 'Back Opacity (Light)',
          stateKey: 'noiseBackOpacity',
          type: 'range',
          min: 0, max: 0.3, step: 0.005,
          default: 0.025,
          format: v => v.toFixed(3),
          parse: parseFloat,
          group: 'Layers',
          onChange: (_g, val) => applyNoiseSystem({ noiseBackOpacity: val })
        },
        {
          id: 'noiseFrontOpacity',
          label: 'Front Opacity (Light)',
          stateKey: 'noiseFrontOpacity',
          type: 'range',
          min: 0, max: 0.3, step: 0.005,
          default: 0.055,
          format: v => v.toFixed(3),
          parse: parseFloat,
          group: 'Layers',
          onChange: (_g, val) => applyNoiseSystem({ noiseFrontOpacity: val })
        },
        {
          id: 'noiseBackOpacityDark',
          label: 'Back Opacity (Dark)',
          stateKey: 'noiseBackOpacityDark',
          type: 'range',
          min: 0, max: 0.5, step: 0.005,
          default: 0.12,
          format: v => v.toFixed(3),
          parse: parseFloat,
          group: 'Layers',
          onChange: (_g, val) => applyNoiseSystem({ noiseBackOpacityDark: val })
        },
        {
          id: 'noiseFrontOpacityDark',
          label: 'Front Opacity (Dark)',
          stateKey: 'noiseFrontOpacityDark',
          type: 'range',
          min: 0, max: 0.5, step: 0.005,
          default: 0.08,
          format: v => v.toFixed(3),
          parse: parseFloat,
          group: 'Layers',
          onChange: (_g, val) => applyNoiseSystem({ noiseFrontOpacityDark: val })
        },
        {
          id: 'noiseMotion',
          label: 'Motion',
          stateKey: 'noiseMotion',
          type: 'select',
          options: [
            { value: 'jitter', label: 'Jitter (film grain)' },
            { value: 'drift', label: 'Drift (slow pan)' },
            { value: 'static', label: 'Static' }
          ],
          default: 'jitter',
          format: v => String(v),
          parse: v => String(v),
          group: 'Motion',
          onChange: (_g, val) => applyNoiseSystem({ noiseMotion: val })
        },
        {
          id: 'noiseMotionAmount',
          label: 'Motion Amount',
          stateKey: 'noiseMotionAmount',
          type: 'range',
          min: 0, max: 2.5, step: 0.01,
          default: 1.0,
          format: v => `${v.toFixed(2)}x`,
          parse: parseFloat,
          group: 'Motion',
          onChange: (_g, val) => applyNoiseSystem({ noiseMotionAmount: val })
        },
        {
          id: 'noiseSpeedBackMs',
          label: 'Back Speed',
          stateKey: 'noiseSpeedBackMs',
          type: 'range',
          min: 0, max: 10000, step: 50,
          default: 1800,
          format: v => `${Math.round(v)} ms`,
          parse: v => parseInt(v, 10),
          group: 'Motion',
          onChange: (_g, val) => applyNoiseSystem({ noiseSpeedBackMs: val })
        },
        {
          id: 'noiseSpeedFrontMs',
          label: 'Front Speed',
          stateKey: 'noiseSpeedFrontMs',
          type: 'range',
          min: 0, max: 10000, step: 50,
          default: 1100,
          format: v => `${Math.round(v)} ms`,
          parse: v => parseInt(v, 10),
          group: 'Motion',
          onChange: (_g, val) => applyNoiseSystem({ noiseSpeedFrontMs: val })
        },
        {
          id: 'noiseFlicker',
          label: 'Flicker',
          stateKey: 'noiseFlicker',
          type: 'range',
          min: 0, max: 1, step: 0.01,
          default: 0.12,
          format: v => `${Math.round(v * 100)}%`,
          parse: parseFloat,
          group: 'Motion',
          onChange: (_g, val) => applyNoiseSystem({ noiseFlicker: val })
        },
        {
          id: 'noiseFlickerSpeedMs',
          label: 'Flicker Speed',
          stateKey: 'noiseFlickerSpeedMs',
          type: 'range',
          min: 0, max: 5000, step: 20,
          default: 220,
          format: v => `${Math.round(v)} ms`,
          parse: v => parseInt(v, 10),
          group: 'Motion',
          onChange: (_g, val) => applyNoiseSystem({ noiseFlickerSpeedMs: val })
        },
        {
          id: 'noiseBlurPx',
          label: 'Blur',
          stateKey: 'noiseBlurPx',
          type: 'range',
          min: 0, max: 6, step: 0.05,
          default: 0,
          format: v => `${v.toFixed(2)} px`,
          parse: parseFloat,
          group: 'Look',
          onChange: (_g, val) => applyNoiseSystem({ noiseBlurPx: val })
        },
        {
          id: 'noiseContrast',
          label: 'Contrast',
          stateKey: 'noiseContrast',
          type: 'range',
          min: 0.25, max: 3, step: 0.05,
          default: 1.35,
          format: v => `${v.toFixed(2)}x`,
          parse: parseFloat,
          group: 'Look',
          onChange: (_g, val) => applyNoiseSystem({ noiseContrast: val })
        },
        {
          id: 'noiseBrightness',
          label: 'Brightness',
          stateKey: 'noiseBrightness',
          type: 'range',
          min: 0.25, max: 2.0, step: 0.01,
          default: 1.0,
          format: v => `${v.toFixed(2)}x`,
          parse: parseFloat,
          group: 'Look',
          onChange: (_g, val) => applyNoiseSystem({ noiseBrightness: val })
        },
        {
          id: 'noiseSaturation',
          label: 'Saturation',
          stateKey: 'noiseSaturation',
          type: 'range',
          min: 0, max: 3, step: 0.01,
          default: 1.0,
          format: v => `${v.toFixed(2)}x`,
          parse: parseFloat,
          group: 'Look',
          onChange: (_g, val) => applyNoiseSystem({ noiseSaturation: val })
        },
        {
          id: 'noiseHue',
          label: 'Hue Rotate',
          stateKey: 'noiseHue',
          type: 'range',
          min: 0, max: 360, step: 1,
          default: 0,
          format: v => `${Math.round(v)}°`,
          parse: v => parseInt(v, 10),
          group: 'Look',
          onChange: (_g, val) => applyNoiseSystem({ noiseHue: val })
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // MODE-SPECIFIC CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    critters: {
      title: 'Critters',
      icon: '🪲',
      mode: 'critters',
      defaultOpen: false,
      controls: [
        {
          id: 'critterCount',
          label: 'Count',
          stateKey: 'critterCount',
          type: 'range',
          min: 10, max: 260, step: 5,
          default: 90,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'critterSpeed',
          label: 'Speed',
          stateKey: 'critterSpeed',
          type: 'range',
          min: 0, max: 1800, step: 10,
          default: 680,
          format: v => `${Math.round(v)}`
          ,
          parse: parseFloat
        },
        {
          id: 'critterMaxSpeed',
          label: 'Max Speed',
          stateKey: 'critterMaxSpeed',
          type: 'range',
          min: 200, max: 4000, step: 25,
          default: 1400,
          format: v => `${Math.round(v)}`
          ,
          parse: parseFloat
        },
        {
          id: 'critterStepHz',
          label: 'Step Rate',
          stateKey: 'critterStepHz',
          type: 'range',
          min: 0, max: 16, step: 0.1,
          default: 5.0,
          format: v => v.toFixed(1) + ' Hz',
          parse: parseFloat
        },
        {
          id: 'critterStepSharpness',
          label: 'Step Sharpness',
          stateKey: 'critterStepSharpness',
          type: 'range',
          min: 0.5, max: 6.0, step: 0.1,
          default: 2.4,
          format: v => v.toFixed(1),
          parse: parseFloat
        },
        {
          id: 'critterTurnNoise',
          label: 'Wander',
          stateKey: 'critterTurnNoise',
          type: 'range',
          min: 0, max: 8, step: 0.1,
          default: 2.2,
          format: v => v.toFixed(1),
          parse: parseFloat
        },
        {
          id: 'critterTurnDamp',
          label: 'Turn Inertia',
          stateKey: 'critterTurnDamp',
          type: 'range',
          min: 0.5, max: 30, step: 0.5,
          default: 10.0,
          format: v => v.toFixed(1),
          parse: parseFloat
        },
        {
          id: 'critterTurnSeek',
          label: 'Steering',
          stateKey: 'critterTurnSeek',
          type: 'range',
          min: 0, max: 30, step: 0.5,
          default: 10.0,
          format: v => v.toFixed(1),
          parse: parseFloat
        },
        {
          id: 'critterAvoidRadius',
          label: 'Avoid Radius',
          stateKey: 'critterAvoidRadius',
          type: 'range',
          min: 0, max: 260, step: 5,
          default: 90,
          format: v => `${Math.round(v)}px`,
          parse: parseFloat
        },
        {
          id: 'critterAvoidForce',
          label: 'Avoid Force',
          stateKey: 'critterAvoidForce',
          type: 'range',
          min: 0, max: 25000, step: 250,
          default: 9500,
          format: v => String(Math.round(v)),
          parse: parseFloat
        },
        {
          id: 'critterEdgeAvoid',
          label: 'Edge Avoid',
          stateKey: 'critterEdgeAvoid',
          type: 'range',
          min: 0, max: 3, step: 0.05,
          default: 1.0,
          format: v => v.toFixed(2) + 'x',
          parse: parseFloat
        },
        {
          id: 'critterMousePull',
          label: 'Mouse Fear',
          stateKey: 'critterMousePull',
          type: 'range',
          min: 0, max: 4, step: 0.05,
          default: 1.0,
          format: v => v.toFixed(2) + 'x',
          parse: parseFloat,
          hint: 'Flee strength inside the mouse zone'
        },
        {
          id: 'critterMouseRadiusVw',
          label: 'Mouse Zone',
          stateKey: 'critterMouseRadiusVw',
          type: 'range',
          min: 0, max: 80, step: 1,
          default: 30,
          format: v => `${Math.round(v)}vw`,
          parse: parseFloat
        },
        {
          id: 'critterRestitution',
          label: 'Bounciness',
          stateKey: 'critterRestitution',
          type: 'range',
          min: 0, max: 0.6, step: 0.01,
          default: 0.18,
          format: v => v.toFixed(2),
          parse: parseFloat,
          hint: 'Mode-only override',
          onChange: (g, val) => {
            if (g.currentMode === 'critters') g.REST = val;
          }
        },
        {
          id: 'critterFriction',
          label: 'Friction',
          stateKey: 'critterFriction',
          type: 'range',
          min: 0, max: 0.06, step: 0.001,
          default: 0.018,
          format: v => v.toFixed(3),
          parse: parseFloat,
          hint: 'Mode-only override',
          onChange: (g, val) => {
            if (g.currentMode === 'critters') g.FRICTION = val;
          }
        },
        warmupFramesControl('crittersWarmupFrames')
      ]
    },

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
        // NOTE: Ball mass / restitution / friction are global now (see Physics section).
        // Pit remains responsible for gravity + interaction tuning.
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
        },
        {
          id: 'sleepVelocityThreshold',
          label: 'Sleep Speed',
          stateKey: 'sleepVelocityThreshold',
          type: 'range',
          min: 0, max: 40, step: 0.5,
          default: 12,
          format: v => `${Number(v).toFixed(1)} px/s`,
          parse: parseFloat,
          hint: 'Pit modes only. Higher = settles sooner.'
        },
        {
          id: 'sleepAngularThreshold',
          label: 'Sleep Spin',
          stateKey: 'sleepAngularThreshold',
          type: 'range',
          min: 0, max: 1.0, step: 0.01,
          default: 0.18,
          format: v => `${Number(v).toFixed(2)} rad/s`,
          parse: parseFloat,
          hint: 'Pit modes only. Higher = stops spinning sooner.'
        },
        {
          id: 'timeToSleep',
          label: 'Sleep Time',
          stateKey: 'timeToSleep',
          type: 'range',
          min: 0.05, max: 2.0, step: 0.05,
          default: 0.25,
          format: v => `${Number(v).toFixed(2)}s`,
          parse: parseFloat,
          hint: 'Pit modes only. Lower = sleeps faster.'
        },
        warmupFramesControl('pitWarmupFrames')
      ]
    },

    pitThrows: {
      title: 'Ball Pit (Throws)',
      icon: '🎯',
      mode: 'pit-throws',
      defaultOpen: false,
      controls: [
        {
          id: 'gravityPitThrows',
          label: 'Gravity',
          stateKey: 'gravityMultiplierPit',
          type: 'range',
          min: 0, max: 2, step: 0.05,
          default: 1.1,
          format: v => v.toFixed(2),
          parse: parseFloat,
          onChange: (g, val) => {
            if (g.currentMode === 'pit-throws') g.G = g.GE * val;
          }
        },
        {
          id: 'pitThrowsSpeed',
          label: 'Throw Speed',
          stateKey: 'pitThrowSpeed',
          type: 'range',
          min: 100, max: 2000, step: 25,
          default: 650,
          format: v => String(Math.round(v)),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'pitThrowsSpeedVar',
          label: 'Speed Variance',
          stateKey: 'pitThrowSpeedVar',
          type: 'range',
          min: 0, max: 0.6, step: 0.01,
          default: 0.18,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'sleepVelocityThresholdThrows',
          label: 'Sleep Speed',
          stateKey: 'sleepVelocityThreshold',
          type: 'range',
          min: 0, max: 40, step: 0.5,
          default: 12,
          format: v => `${Number(v).toFixed(1)} px/s`,
          parse: parseFloat,
          hint: 'Pit modes only. Higher = settles sooner.'
        },
        {
          id: 'sleepAngularThresholdThrows',
          label: 'Sleep Spin',
          stateKey: 'sleepAngularThreshold',
          type: 'range',
          min: 0, max: 1.0, step: 0.01,
          default: 0.18,
          format: v => `${Number(v).toFixed(2)} rad/s`,
          parse: parseFloat,
          hint: 'Pit modes only. Higher = stops spinning sooner.'
        },
        {
          id: 'timeToSleepThrows',
          label: 'Sleep Time',
          stateKey: 'timeToSleep',
          type: 'range',
          min: 0.05, max: 2.0, step: 0.05,
          default: 0.25,
          format: v => `${Number(v).toFixed(2)}s`,
          parse: parseFloat,
          hint: 'Pit modes only. Lower = sleeps faster.'
        },
        {
          id: 'pitThrowsInterval',
          label: 'Throw Interval',
          stateKey: 'pitThrowIntervalMs',
          type: 'range',
          min: 10, max: 500, step: 5,
          default: 70,
          format: v => `${Math.round(v)}ms`,
          parse: parseFloat
        },
        {
          id: 'pitThrowsColorPause',
          label: 'Color Pause',
          stateKey: 'pitThrowColorPauseMs',
          type: 'range',
          min: 0, max: 1200, step: 10,
          default: 180,
          format: v => `${Math.round(v)}ms`,
          parse: parseFloat
        },
        {
          id: 'pitThrowsPairChance',
          label: 'Pair Chance',
          stateKey: 'pitThrowPairChance',
          type: 'range',
          min: 0, max: 1, step: 0.01,
          default: 0.35,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'pitThrowsPairStagger',
          label: 'Pair Stagger',
          stateKey: 'pitThrowPairStaggerMs',
          type: 'range',
          min: 0, max: 120, step: 1,
          default: 18,
          format: v => `${Math.round(v)}ms`,
          parse: parseFloat
        },
        {
          id: 'pitThrowsBatchSize',
          label: 'Batch Size',
          stateKey: 'pitThrowBatchSize',
          type: 'range',
          min: 1, max: 60, step: 1,
          default: 18,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'pitThrowsTargetYFrac',
          label: 'Throw Aim (Y)',
          stateKey: 'pitThrowTargetYFrac',
          type: 'range',
          min: 0.12, max: 0.7, step: 0.01,
          default: 0.36,
          format: v => v.toFixed(2),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'pitThrowsAngleJitter',
          label: 'Angle Jitter',
          stateKey: 'pitThrowAngleJitter',
          type: 'range',
          min: 0, max: 0.6, step: 0.01,
          default: 0.16,
          format: v => v.toFixed(2),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'pitThrowsSpreadVar',
          label: 'Spread Variance',
          stateKey: 'pitThrowSpreadVar',
          type: 'range',
          min: 0, max: 0.8, step: 0.01,
          default: 0.25,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'pitThrowsSpeedJitter',
          label: 'Speed Jitter',
          stateKey: 'pitThrowSpeedJitter',
          type: 'range',
          min: 0, max: 0.8, step: 0.01,
          default: 0.22,
          format: v => v.toFixed(2),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'pitThrowsInletInset',
          label: 'Inlet Inset',
          stateKey: 'pitThrowInletInset',
          type: 'range',
          min: 0, max: 0.2, step: 0.005,
          default: 0.06,
          format: v => v.toFixed(3),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'pitThrowsSpawnSpread',
          label: 'Spawn Spread',
          stateKey: 'pitThrowSpawnSpread',
          type: 'range',
          min: 0, max: 0.12, step: 0.0025,
          default: 0.02,
          format: v => v.toFixed(4),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'pitThrowsAimJitter',
          label: 'Aim Jitter',
          stateKey: 'pitThrowAimJitter',
          type: 'range',
          min: 0, max: 0.2, step: 0.005,
          default: 0.04,
          format: v => v.toFixed(3),
          parse: parseFloat
        },
        {
          id: 'pitThrowsCrossBias',
          label: 'Cross Aim',
          stateKey: 'pitThrowCrossBias',
          type: 'range',
          min: 0, max: 0.3, step: 0.005,
          default: 0.12,
          format: v => v.toFixed(3),
          parse: parseFloat
        },
        warmupFramesControl('pitThrowsWarmupFrames')
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
        },
        warmupFramesControl('fliesWarmupFrames')
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
          stateKey: 'weightlessCount',
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
        },
        {
          id: 'weightlessRepelPower',
          label: 'Cursor Blast Power',
          stateKey: 'weightlessRepelPower',
          type: 'range',
          min: 0, max: 600000, step: 10000,
          default: 220000,
          format: v => Math.round(v).toString(),
          parse: parseFloat
        },
        {
          id: 'weightlessRepelSoft',
          label: 'Cursor Blast Falloff',
          stateKey: 'weightlessRepelSoft',
          type: 'range',
          min: 0.5, max: 6.0, step: 0.1,
          default: 2.2,
          format: v => v.toFixed(1),
          parse: parseFloat
        },
        warmupFramesControl('weightlessWarmupFrames')
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
          id: 'waterDrag',
          label: 'Water Resistance',
          stateKey: 'waterDrag',
          type: 'range',
          min: 0.001, max: 0.05, step: 0.001,
          default: 0.015,
          format: v => v.toFixed(3),
          parse: parseFloat
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
          label: 'Drift Strength',
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
        },
        warmupFramesControl('waterWarmupFrames')
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
          min: 50, max: 500, step: 10,
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
          min: 100, max: 3000, step: 50,
          default: 420,
          format: v => v.toFixed(0),
          parse: parseFloat
        },
        {
          id: 'vortexPull',
          label: 'Radial Pull',
          stateKey: 'vortexRadialPull',
          type: 'range',
          min: 0, max: 2000, step: 20,
          default: 180,
          format: v => v.toFixed(0),
          parse: parseFloat
        },
        {
          id: 'vortexSpeedMultiplier',
          label: 'Speed Multiplier',
          stateKey: 'vortexSpeedMultiplier',
          type: 'range',
          min: 0.1, max: 3.0, step: 0.1,
          default: 1.0,
          format: v => v.toFixed(1),
          parse: parseFloat
        },
        {
          id: 'vortexRadius',
          label: 'Vortex Radius',
          stateKey: 'vortexRadius',
          type: 'range',
          min: 0, max: 800, step: 20,
          default: 0,
          format: v => v === 0 ? 'Unlimited' : v.toFixed(0) + 'px',
          parse: parseFloat,
          tooltip: 'Maximum effective radius (0 = unlimited, uses distance falloff)'
        },
        {
          id: 'vortexFalloffCurve',
          label: 'Falloff Curve',
          stateKey: 'vortexFalloffCurve',
          type: 'range',
          min: 0.3, max: 3.0, step: 0.1,
          default: 1.0,
          format: v => v.toFixed(1),
          parse: parseFloat,
          tooltip: 'Falloff shape: 1.0 = linear, 2.0 = quadratic (sharper), 0.5 = gentle'
        },
        {
          id: 'vortexRotationDirection',
          label: 'Rotation Direction',
          stateKey: 'vortexRotationDirection',
          type: 'range',
          min: -1, max: 1, step: 2,
          default: 1,
          format: v => v === 1 ? 'Counterclockwise' : 'Clockwise',
          parse: parseFloat
        },
        {
          id: 'vortexCoreStrength',
          label: 'Core Strength',
          stateKey: 'vortexCoreStrength',
          type: 'range',
          min: 0.5, max: 3.0, step: 0.1,
          default: 1.0,
          format: v => v.toFixed(1) + 'x',
          parse: parseFloat,
          tooltip: 'Strength multiplier at vortex center'
        },
        {
          id: 'vortexAccelerationZone',
          label: 'Acceleration Zone',
          stateKey: 'vortexAccelerationZone',
          type: 'range',
          min: 0, max: 400, step: 20,
          default: 0,
          format: v => v === 0 ? 'Disabled' : v.toFixed(0) + 'px',
          parse: parseFloat,
          tooltip: 'Radius where extra acceleration occurs (0 = disabled)'
        },
        {
          id: 'vortexOutwardPush',
          label: 'Outward Push',
          stateKey: 'vortexOutwardPush',
          type: 'range',
          min: 0, max: 1000, step: 20,
          default: 0,
          format: v => v === 0 ? 'Disabled' : v.toFixed(0),
          parse: parseFloat,
          tooltip: 'Outward force at edges (only when radius is set)'
        },
        {
          id: 'vortexDrag',
          label: 'Drag',
          stateKey: 'vortexDrag',
          type: 'range',
          min: 0.001, max: 0.05, step: 0.001,
          default: 0.005,
          format: v => v.toFixed(3),
          parse: parseFloat
        },
        warmupFramesControl('vortexWarmupFrames')
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
          min: 200, max: 1600, step: 50,
          default: 800,
          format: v => v.toFixed(0),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'pingPongVerticalDamp',
          label: 'Vertical Damping',
          stateKey: 'pingPongVerticalDamp',
          type: 'range',
          min: 0.8, max: 0.999, step: 0.001,
          default: 0.995,
          format: v => v.toFixed(3),
          parse: parseFloat
        },
        warmupFramesControl('pingPongWarmupFrames')
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
        },
        {
          id: 'magneticDamping',
          label: 'Damping',
          stateKey: 'magneticDamping',
          type: 'range',
          min: 0.8, max: 0.999, step: 0.001,
          default: 0.98,
          format: v => v.toFixed(3),
          parse: parseFloat
        },
        warmupFramesControl('magneticWarmupFrames')
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
        warmupFramesControl('bubblesWarmupFrames')
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
          min: 15, max: 120, step: 1,
          default: 23,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'kaleiWedges',
          label: 'Wedges',
          stateKey: 'kaleidoscopeWedges',
          type: 'range',
          min: 4, max: 16, step: 1,
          default: 12,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10)
        },
        {
          id: 'kaleiMirror',
          label: 'Mirror',
          type: 'range',
          min: 0, max: 1, step: 1,
          default: 1,
          format: v => (v ? 'On' : 'Off'),
          parse: v => parseInt(v, 10)
        },
        {
          id: 'kaleiSpeed',
          label: 'Speed',
          stateKey: 'kaleidoscopeSpeed',
          type: 'range',
          min: 0.2, max: 2.0, step: 0.05,
          default: 1.0,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'kaleiDotSizeVh',
          label: 'Dot Size (vh)',
          stateKey: 'kaleidoscopeDotSizeVh',
          type: 'range',
          min: 0.2, max: 2.5, step: 0.05,
          default: 0.95,
          format: v => v.toFixed(2) + 'vh',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'kaleiDotAreaMul',
          label: 'Dot Area',
          stateKey: 'kaleidoscopeDotAreaMul',
          type: 'range',
          min: 0.3, max: 1.5, step: 0.05,
          default: 0.7,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'kaleiSpawnArea',
          label: 'Spawn Density',
          stateKey: 'kaleidoscopeSpawnAreaMul',
          type: 'range',
          min: 0.2, max: 2.0, step: 0.05,
          default: 1.0,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'kaleiSizeVar',
          label: 'Size Variance',
          stateKey: 'kaleidoscopeSizeVariance',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0.3,
          format: v => (v * 100).toFixed(0) + '%',
          parse: parseFloat,
          reinitMode: true
        },
        warmupFramesControl('kaleidoscopeWarmupFrames')
      ]
    },

    kaleidoscope1: {
      title: 'Kaleidoscope I (Variant)',
      icon: '🪞',
      mode: 'kaleidoscope-1',
      defaultOpen: false,
      controls: [
        {
          id: 'kalei1BallCount',
          label: 'Ball Count',
          stateKey: 'kaleidoscope1BallCount',
          type: 'range',
          min: 6, max: 180, step: 1,
          default: 18,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'kalei1Wedges',
          label: 'Wedges',
          stateKey: 'kaleidoscope1Wedges',
          type: 'range',
          min: 3, max: 24, step: 1,
          default: 8,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10)
        },
        {
          id: 'kalei1Speed',
          label: 'Speed',
          stateKey: 'kaleidoscope1Speed',
          type: 'range',
          min: 0.2, max: 2.0, step: 0.05,
          default: 0.8,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'kalei1DotSizeVh',
          label: 'Dot Size (vh)',
          stateKey: 'kaleidoscope1DotSizeVh',
          type: 'range',
          min: 0.2, max: 2.5, step: 0.05,
          default: 0.95,
          format: v => v.toFixed(2) + 'vh',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'kalei1DotAreaMul',
          label: 'Dot Area',
          stateKey: 'kaleidoscope1DotAreaMul',
          type: 'range',
          min: 0.3, max: 1.5, step: 0.05,
          default: 0.7,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'kalei1SpawnArea',
          label: 'Spawn Density',
          stateKey: 'kaleidoscope1SpawnAreaMul',
          type: 'range',
          min: 0.2, max: 2.0, step: 0.05,
          default: 1.0,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'kalei1SizeVar',
          label: 'Size Variance',
          stateKey: 'kaleidoscope1SizeVariance',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0.3,
          format: v => (v * 100).toFixed(0) + '%',
          parse: parseFloat,
          reinitMode: true
        },
        warmupFramesControl('kaleidoscope1WarmupFrames')
      ]
    },

    kaleidoscope2: {
      title: 'Kaleidoscope II (Variant)',
      icon: '🪞',
      mode: 'kaleidoscope-2',
      defaultOpen: false,
      controls: [
        {
          id: 'kalei2BallCount',
          label: 'Ball Count',
          stateKey: 'kaleidoscope2BallCount',
          type: 'range',
          min: 10, max: 260, step: 2,
          default: 36,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'kalei2Wedges',
          label: 'Wedges',
          stateKey: 'kaleidoscope2Wedges',
          type: 'range',
          min: 3, max: 24, step: 1,
          default: 8,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10)
        },
        {
          id: 'kalei2Speed',
          label: 'Speed',
          stateKey: 'kaleidoscope2Speed',
          type: 'range',
          min: 0.2, max: 2.0, step: 0.05,
          default: 1.15,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'kalei2DotSizeVh',
          label: 'Dot Size (vh)',
          stateKey: 'kaleidoscope2DotSizeVh',
          type: 'range',
          min: 0.2, max: 2.5, step: 0.05,
          default: 0.95,
          format: v => v.toFixed(2) + 'vh',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'kalei2DotAreaMul',
          label: 'Dot Area',
          stateKey: 'kaleidoscope2DotAreaMul',
          type: 'range',
          min: 0.3, max: 1.5, step: 0.05,
          default: 0.7,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'kalei2SpawnArea',
          label: 'Spawn Density',
          stateKey: 'kaleidoscope2SpawnAreaMul',
          type: 'range',
          min: 0.2, max: 2.0, step: 0.05,
          default: 1.0,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'kalei2SizeVar',
          label: 'Size Variance',
          stateKey: 'kaleidoscope2SizeVariance',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0.3,
          format: v => (v * 100).toFixed(0) + '%',
          parse: parseFloat,
          reinitMode: true
        },
        warmupFramesControl('kaleidoscope2WarmupFrames')
      ]
    },

    kaleidoscope3: {
      title: 'Kaleidoscope III (Variant)',
      icon: '🪞',
      mode: 'kaleidoscope-3',
      defaultOpen: false,
      controls: [
        {
          id: 'kalei3BallCount',
          label: 'Ball Count',
          stateKey: 'kaleidoscope3BallCount',
          type: 'range',
          min: 12, max: 300, step: 3,
          default: 54,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'kalei3Wedges',
          label: 'Wedges',
          stateKey: 'kaleidoscope3Wedges',
          type: 'range',
          min: 3, max: 24, step: 1,
          default: 8,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10)
        },
        {
          id: 'kalei3Speed',
          label: 'Speed',
          stateKey: 'kaleidoscope3Speed',
          type: 'range',
          min: 0.2, max: 2.0, step: 0.05,
          default: 1.55,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'kalei3DotSizeVh',
          label: 'Dot Size (vh)',
          stateKey: 'kaleidoscope3DotSizeVh',
          type: 'range',
          min: 0.2, max: 2.5, step: 0.05,
          default: 0.95,
          format: v => v.toFixed(2) + 'vh',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'kalei3DotAreaMul',
          label: 'Dot Area',
          stateKey: 'kaleidoscope3DotAreaMul',
          type: 'range',
          min: 0.3, max: 1.5, step: 0.05,
          default: 0.7,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'kalei3SpawnArea',
          label: 'Spawn Density',
          stateKey: 'kaleidoscope3SpawnAreaMul',
          type: 'range',
          min: 0.2, max: 2.0, step: 0.05,
          default: 1.0,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'kalei3SizeVar',
          label: 'Size Variance',
          stateKey: 'kaleidoscope3SizeVariance',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0.3,
          format: v => (v * 100).toFixed(0) + '%',
          parse: parseFloat,
          reinitMode: true
        },
        warmupFramesControl('kaleidoscope3WarmupFrames')
      ]
    },

    orbit3d: {
      title: 'Orbit 3D: Zero Gravity',
      icon: '🌪️',
      mode: 'orbit-3d',
      defaultOpen: false,
      controls: [
        {
          id: 'orbit3dMoonCount',
          label: 'Body Count',
          stateKey: 'orbit3dMoonCount',
          type: 'range',
          min: 10, max: 200, step: 10,
          default: 80,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'orbit3dGravity',
          label: 'Gravity Pull',
          stateKey: 'orbit3dGravity',
          type: 'range',
          min: 1000, max: 10000, step: 500,
          default: 5000,
          format: v => Math.round(v),
          parse: parseFloat
        },
        {
          id: 'orbit3dVelocityMult',
          label: 'Orbital Speed',
          stateKey: 'orbit3dVelocityMult',
          type: 'range',
          min: 50, max: 300, step: 10,
          default: 150,
          format: v => Math.round(v),
          parse: parseFloat
        },
        {
          id: 'orbit3dDepthScale',
          label: 'Depth Effect',
          stateKey: 'orbit3dDepthScale',
          type: 'range',
          min: 0, max: 1.5, step: 0.1,
          default: 0.8,
          format: v => v.toFixed(1),
          parse: parseFloat
        },
        {
          id: 'orbit3dDamping',
          label: 'Stability',
          stateKey: 'orbit3dDamping',
          type: 'range',
          min: 0.005, max: 0.05, step: 0.005,
          default: 0.02,
          format: v => v.toFixed(3),
          parse: parseFloat
        },
        {
          id: 'sizeVariationOrbit3d',
          label: 'Size Variation',
          stateKey: 'sizeVariationOrbit3d',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0,
          format: v => v.toFixed(2),
          parse: parseFloat,
          reinitMode: true
        },
        warmupFramesControl('orbit3dWarmupFrames')
      ]
    },
    orbit3d2: {
      title: 'Orbit 3D (Tight Swarm)',
      icon: '🌪️',
      mode: 'orbit-3d-2',
      defaultOpen: false,
      controls: [
        {
          id: 'orbit3d2MoonCount',
          label: 'Moon Count',
          stateKey: 'orbit3d2MoonCount',
          type: 'range',
          min: 20, max: 200, step: 10,
          default: 100,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'orbit3d2Gravity',
          label: 'Gravity (G×M)',
          stateKey: 'orbit3d2Gravity',
          type: 'range',
          min: 10000, max: 300000, step: 10000,
          default: 80000,
          format: v => `${Math.round(v / 1000)}k`,
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'orbit3d2VelocityMult',
          label: 'Initial Velocity',
          stateKey: 'orbit3d2VelocityMult',
          type: 'range',
          min: 0.5, max: 1.5, step: 0.05,
          default: 1.1,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'orbit3d2MinOrbit',
          label: 'Min Orbit (vw)',
          stateKey: 'orbit3d2MinOrbit',
          type: 'range',
          min: 2, max: 15, step: 1,
          default: 4,
          format: v => v + 'vw',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'orbit3d2MaxOrbit',
          label: 'Max Orbit (vw)',
          stateKey: 'orbit3d2MaxOrbit',
          type: 'range',
          min: 3, max: 25, step: 1,
          default: 12,
          format: v => v + 'vw',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'orbit3d2DepthScale',
          label: 'Depth Effect',
          stateKey: 'orbit3d2DepthScale',
          type: 'range',
          min: 0, max: 0.8, step: 0.05,
          default: 0.6,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'orbit3d2Damping',
          label: 'Damping',
          stateKey: 'orbit3d2Damping',
          type: 'range',
          min: 0, max: 0.2, step: 0.005,
          default: 0.01,
          format: v => v.toFixed(3),
          parse: parseFloat
        },
        {
          id: 'orbit3d2FollowSmoothing',
          label: 'Cursor Follow Speed',
          stateKey: 'orbit3d2FollowSmoothing',
          type: 'range',
          min: 1, max: 200, step: 1,
          default: 40,
          format: v => Math.round(v),
          parse: parseFloat
        },
        {
          id: 'orbit3d2Softening',
          label: 'Gravity Softening',
          stateKey: 'orbit3d2Softening',
          type: 'range',
          min: 1, max: 100, step: 1,
          default: 15,
          format: v => Math.round(v),
          parse: parseFloat
        },
        {
          id: 'sizeVariationOrbit3d2',
          label: 'Size Variation',
          stateKey: 'sizeVariationOrbit3d2',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0,
          format: v => v.toFixed(2),
          parse: parseFloat,
          reinitMode: true
        },
        warmupFramesControl('orbit3d2WarmupFrames')
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // LATTICE — Crystal structure from chaos
    // ═══════════════════════════════════════════════════════════════════════════
    lattice: {
      title: 'Crystal Lattice',
      icon: '💎',
      mode: 'lattice',
      defaultOpen: false,
      controls: [
        {
          id: 'sizeVariationLattice',
          label: 'Size Variation',
          stateKey: 'sizeVariationLattice',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0,
          format: v => v.toFixed(2),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'latticeSpacingVw',
          label: 'Spacing (vw)',
          stateKey: 'latticeSpacingVw',
          type: 'range',
          min: 1, max: 20, step: 0.25,
          default: 8.5,
          format: v => v.toFixed(2) + 'vw',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'latticeStiffness',
          label: 'Stiffness',
          stateKey: 'latticeStiffness',
          type: 'range',
          min: 0, max: 10, step: 0.1,
          default: 2.2,
          format: v => v.toFixed(1),
          parse: parseFloat
        },
        {
          id: 'latticeDamping',
          label: 'Damping',
          stateKey: 'latticeDamping',
          type: 'range',
          min: 0.5, max: 1.0, step: 0.01,
          default: 0.92,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        {
          id: 'latticeDisruptRadius',
          label: 'Mesh Stretch Radius',
          stateKey: 'latticeDisruptRadius',
          type: 'range',
          min: 50, max: 1000, step: 25,
          default: 600,
          format: v => String(Math.round(v)) + 'px',
          parse: parseFloat
        },
        {
          id: 'latticeDisruptPower',
          label: 'Mesh Stretch Power',
          stateKey: 'latticeDisruptPower',
          type: 'range',
          min: 0, max: 50, step: 1,
          default: 25.0,
          format: v => v.toFixed(1),
          parse: parseFloat
        },
        {
          id: 'latticeMeshWaveStrength',
          label: 'Wave Amplitude',
          stateKey: 'latticeMeshWaveStrength',
          type: 'range',
          min: 0, max: 50, step: 1,
          default: 12.0,
          format: v => String(Math.round(v)) + 'px',
          parse: parseFloat
        },
        {
          id: 'latticeMeshWaveSpeed',
          label: 'Wave Speed',
          stateKey: 'latticeMeshWaveSpeed',
          type: 'range',
          min: 0, max: 3.0, step: 0.1,
          default: 0.8,
          format: v => v.toFixed(1) + 'x',
          parse: parseFloat
        },
        {
          id: 'latticeAlignment',
          label: 'Grid Alignment',
          stateKey: 'latticeAlignment',
          type: 'select',
          options: [
            { value: 'center', label: 'Center (Fill)' },
            { value: 'top-left', label: 'Top-Left' },
            { value: 'top-center', label: 'Top-Center' },
            { value: 'top-right', label: 'Top-Right' }
          ],
          default: 'center',
          format: v => String(v),
          parse: v => String(v),
          reinitMode: true
        },
        warmupFramesControl('latticeWarmupFrames')
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // NEURAL — Connectivity expressed through motion only (no lines)
    // ═══════════════════════════════════════════════════════════════════════════
    neural: {
      title: 'Neural Network',
      icon: '🧠',
      mode: 'neural',
      defaultOpen: false,
      controls: [
        {
          id: 'neuralBallCount',
          label: 'Ball Count',
          stateKey: 'neuralBallCount',
          type: 'range',
          min: 8, max: 260, step: 1,
          default: 80,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'sizeVariationNeural',
          label: 'Size Variation',
          stateKey: 'sizeVariationNeural',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0,
          format: v => v.toFixed(2),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'neuralWanderStrength',
          label: 'Wander Strength',
          stateKey: 'neuralWanderStrength',
          type: 'range',
          min: 0, max: 2000, step: 10,
          default: 420,
          format: v => String(Math.round(v)),
          parse: parseFloat
        },
        {
          id: 'neuralDamping',
          label: 'Damping',
          stateKey: 'neuralDamping',
          type: 'range',
          min: 0.8, max: 1.0, step: 0.005,
          default: 0.985,
          format: v => v.toFixed(3),
          parse: parseFloat
        },
        {
          id: 'neuralCohesion',
          label: 'Cohesion',
          stateKey: 'neuralCohesion',
          type: 'range',
          min: 0, max: 1.0, step: 0.01,
          default: 0.18,
          format: v => v.toFixed(2),
          parse: parseFloat
        },
        warmupFramesControl('neuralWarmupFrames')
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // NOTE: “Warmup Frames” is appended per mode below to avoid visible settling
    // on mode switches (no pop-in / no flash). It is consumed by the physics engine
    // before the first render after init.
    // ═══════════════════════════════════════════════════════════════════════════

    parallaxLinear: {
      title: 'Parallax (Linear)',
      icon: '🫧',
      mode: 'parallax-linear',
      defaultOpen: false,
      controls: [
        {
          id: 'parallaxLinearPreset',
          label: 'Preset',
          stateKey: 'parallaxLinearPreset',
          type: 'select',
          options: Object.keys(PARALLAX_LINEAR_PRESETS).map(k => ({ value: k, label: PARALLAX_LINEAR_PRESETS[k].label })),
          default: 'default',
          format: v => PARALLAX_LINEAR_PRESETS[v]?.label || v,
          onChange: (value) => {
            applyParallaxLinearPreset(value, true);
          }
        },
        {
          id: 'parallaxLinearDotSizeMul',
          label: 'Dot Size',
          stateKey: 'parallaxLinearDotSizeMul',
          type: 'range',
          min: 0.2, max: 6.0, step: 0.1,
          default: 1.8,
          format: v => v.toFixed(1) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'sizeVariationParallaxLinear',
          label: 'Size Variation',
          stateKey: 'sizeVariationParallaxLinear',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0,
          format: v => v.toFixed(2),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'parallaxLinearGridX',
          label: 'Grid X (Cols)',
          stateKey: 'parallaxLinearGridX',
          type: 'range',
          min: 3, max: 40, step: 1,
          default: 14,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'parallaxLinearGridY',
          label: 'Grid Y (Rows)',
          stateKey: 'parallaxLinearGridY',
          type: 'range',
          min: 3, max: 40, step: 1,
          default: 10,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'parallaxLinearGridZ',
          label: 'Grid Z (Layers)',
          stateKey: 'parallaxLinearGridZ',
          type: 'range',
          min: 2, max: 20, step: 1,
          default: 7,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'parallaxLinearSpanX',
          label: 'Span X',
          stateKey: 'parallaxLinearSpanX',
          type: 'range',
          min: 0.2, max: 3.0, step: 0.05,
          default: 1.35,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true,
          hint: 'World-space width as a multiple of the viewport width. Use >1 to fill edge-to-edge.'
        },
        {
          id: 'parallaxLinearSpanY',
          label: 'Span Y',
          stateKey: 'parallaxLinearSpanY',
          type: 'range',
          min: 0.2, max: 3.0, step: 0.05,
          default: 1.35,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true,
          hint: 'World-space height as a multiple of the viewport height.'
        },
        {
          id: 'parallaxLinearZNear',
          label: 'Z Near',
          stateKey: 'parallaxLinearZNear',
          type: 'range',
          min: 10, max: 1200, step: 10,
          default: 50,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'parallaxLinearZFar',
          label: 'Z Far',
          stateKey: 'parallaxLinearZFar',
          type: 'range',
          min: 50, max: 3000, step: 25,
          default: 900,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'parallaxLinearFocalLength',
          label: 'Focal Length',
          stateKey: 'parallaxLinearFocalLength',
          type: 'range',
          min: 80, max: 2000, step: 10,
          default: 420,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10)
        },
        {
          id: 'parallaxLinearParallaxStrength',
          label: 'Parallax Strength',
          stateKey: 'parallaxLinearParallaxStrength',
          type: 'range',
          min: 0, max: 2000, step: 10,
          default: 260,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10)
        },
        warmupFramesControl('parallaxLinearWarmupFrames')
      ]
    },

    parallaxPerspective: {
      title: 'Parallax (Perspective)',
      icon: '🫧',
      mode: 'parallax-perspective',
      defaultOpen: false,
      controls: [
        {
          id: 'parallaxPerspectivePreset',
          label: 'Preset',
          stateKey: 'parallaxPerspectivePreset',
          type: 'select',
          options: Object.keys(PARALLAX_PERSPECTIVE_PRESETS).map(k => ({ value: k, label: PARALLAX_PERSPECTIVE_PRESETS[k].label })),
          default: 'default',
          format: v => PARALLAX_PERSPECTIVE_PRESETS[v]?.label || v,
          onChange: (value) => {
            applyParallaxPerspectivePreset(value, true);
          }
        },
        {
          id: 'parallaxPerspectiveRandomness',
          label: 'Randomness',
          stateKey: 'parallaxPerspectiveRandomness',
          type: 'range',
          min: 0, max: 1.0, step: 0.05,
          default: 0.6,
          format: v => v.toFixed(2),
          parse: parseFloat,
          reinitMode: true,
          hint: '0 = perfect grid. 1 = full jitter from grid vertices.'
        },
        {
          id: 'parallaxPerspectiveDotSizeMul',
          label: 'Dot Size',
          stateKey: 'parallaxPerspectiveDotSizeMul',
          type: 'range',
          min: 0.2, max: 6.0, step: 0.1,
          default: 1.8,
          format: v => v.toFixed(1) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'sizeVariationParallaxPerspective',
          label: 'Size Variation',
          stateKey: 'sizeVariationParallaxPerspective',
          type: 'range',
          min: 0, max: 1, step: 0.05,
          default: 0,
          format: v => v.toFixed(2),
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'parallaxPerspectiveGridX',
          label: 'Grid X (Cols)',
          stateKey: 'parallaxPerspectiveGridX',
          type: 'range',
          min: 3, max: 50, step: 1,
          default: 16,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'parallaxPerspectiveGridY',
          label: 'Grid Y (Rows)',
          stateKey: 'parallaxPerspectiveGridY',
          type: 'range',
          min: 3, max: 50, step: 1,
          default: 12,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'parallaxPerspectiveGridZ',
          label: 'Grid Z (Layers)',
          stateKey: 'parallaxPerspectiveGridZ',
          type: 'range',
          min: 2, max: 25, step: 1,
          default: 8,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'parallaxPerspectiveSpanX',
          label: 'Span X',
          stateKey: 'parallaxPerspectiveSpanX',
          type: 'range',
          min: 0.2, max: 3.0, step: 0.05,
          default: 1.45,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'parallaxPerspectiveSpanY',
          label: 'Span Y',
          stateKey: 'parallaxPerspectiveSpanY',
          type: 'range',
          min: 0.2, max: 3.0, step: 0.05,
          default: 1.45,
          format: v => v.toFixed(2) + '×',
          parse: parseFloat,
          reinitMode: true
        },
        {
          id: 'parallaxPerspectiveZNear',
          label: 'Z Near',
          stateKey: 'parallaxPerspectiveZNear',
          type: 'range',
          min: 10, max: 1200, step: 10,
          default: 40,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'parallaxPerspectiveZFar',
          label: 'Z Far',
          stateKey: 'parallaxPerspectiveZFar',
          type: 'range',
          min: 50, max: 4000, step: 50,
          default: 1200,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10),
          reinitMode: true
        },
        {
          id: 'parallaxPerspectiveFocalLength',
          label: 'Focal Length',
          stateKey: 'parallaxPerspectiveFocalLength',
          type: 'range',
          min: 80, max: 2000, step: 10,
          default: 420,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10)
        },
        {
          id: 'parallaxPerspectiveParallaxStrength',
          label: 'Parallax Strength',
          stateKey: 'parallaxPerspectiveParallaxStrength',
          type: 'range',
          min: 0, max: 2000, step: 10,
          default: 280,
          format: v => String(Math.round(v)),
          parse: v => parseInt(v, 10)
        },
        warmupFramesControl('parallaxPerspectiveWarmupFrames')
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ENTRANCE ANIMATION — Dramatic page entrance orchestration
    // ═══════════════════════════════════════════════════════════════════════════
    entrance: {
      title: 'Entrance',
      icon: '🎭',
      defaultOpen: false,
      controls: [
        {
          id: 'entranceEnabled',
          label: 'Enabled',
          stateKey: 'entranceEnabled',
          type: 'checkbox',
          default: true,
          format: v => (v ? 'On' : 'Off'),
          parse: v => !!v,
          hint: 'Enable dramatic entrance animation (browser default → wall-state)',
          onChange: () => {
            // Reload page to apply changes
            if (typeof window !== 'undefined') {
              setTimeout(() => window.location.reload(), 300);
            }
          }
        },
        {
          id: 'entranceWallTransitionDelay',
          label: 'Wall Transition Delay',
          stateKey: 'entranceWallTransitionDelay',
          type: 'range',
          min: 0, max: 2000, step: 50,
          default: 300,
          format: v => `${Math.round(v)}ms`,
          parse: v => parseInt(v, 10),
          hint: 'Delay before wall background transition starts'
        },
        {
          id: 'entranceWallTransitionDuration',
          label: 'Wall Growth Duration',
          stateKey: 'entranceWallTransitionDuration',
          type: 'range',
          min: 200, max: 2000, step: 50,
          default: 800,
          format: v => `${Math.round(v)}ms`,
          parse: v => parseInt(v, 10),
          hint: 'Duration of wall scaling down into viewport animation'
        },
        {
          id: 'entranceWallInitialScale',
          label: 'Initial Scale',
          stateKey: 'entranceWallInitialScale',
          type: 'range',
          min: 1.05, max: 1.5, step: 0.05,
          default: 1.1,
          format: v => v.toFixed(2),
          parse: v => parseFloat(v),
          hint: 'Starting scale (wall starts slightly larger, scales down to 1.0)'
        },
        {
          id: 'entranceWallEasing',
          label: 'Wall Growth Easing',
          stateKey: 'entranceWallEasing',
          type: 'select',
          options: [
            { value: 'cubic-bezier(0.16, 1, 0.3, 1)', label: 'Organic (default)' },
            { value: 'ease-out', label: 'Ease Out' },
            { value: 'ease-in-out', label: 'Ease In Out' },
            { value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', label: 'Bounce' },
            { value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', label: 'Overshoot' }
          ],
          default: 'cubic-bezier(0.16, 1, 0.3, 1)',
          format: v => String(v),
          parse: v => String(v),
          hint: 'Easing function for wall growth animation'
        },
        {
          id: 'entranceElementDuration',
          label: 'Element Duration',
          stateKey: 'entranceElementDuration',
          type: 'range',
          min: 100, max: 1000, step: 50,
          default: 200,
          format: v => `${Math.round(v)}ms`,
          parse: v => parseInt(v, 10),
          hint: 'Duration for individual element animations'
        },
        {
          id: 'entranceElementScaleStart',
          label: 'Element Scale Start',
          stateKey: 'entranceElementScaleStart',
          type: 'range',
          min: 0.5, max: 1.0, step: 0.01,
          default: 0.95,
          format: v => v.toFixed(2),
          parse: v => parseFloat(v),
          hint: 'Initial scale for elements (0-1)'
        },
        {
          id: 'entranceElementTranslateZStart',
          label: 'Element Z Start',
          stateKey: 'entranceElementTranslateZStart',
          type: 'range',
          min: -100, max: 0, step: 5,
          default: -20,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10),
          hint: 'Initial z-axis position (negative = back in 3D space)'
        },
        {
          id: 'entrancePerspectiveLandscape',
          label: 'Perspective (Landscape)',
          stateKey: 'entrancePerspectiveLandscape',
          type: 'range',
          min: 500, max: 3000, step: 50,
          default: 1200,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10),
          hint: '3D perspective for landscape aspect ratio',
          onChange: () => {
            Promise.resolve().then(function () { return entranceAnimation; }).then(({ applyPerspectiveCSS }) => {
              applyPerspectiveCSS();
            }).catch(() => {});
          }
        },
        {
          id: 'entrancePerspectiveSquare',
          label: 'Perspective (Square)',
          stateKey: 'entrancePerspectiveSquare',
          type: 'range',
          min: 500, max: 3000, step: 50,
          default: 1000,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10),
          hint: '3D perspective for square aspect ratio',
          onChange: () => {
            Promise.resolve().then(function () { return entranceAnimation; }).then(({ applyPerspectiveCSS }) => {
              applyPerspectiveCSS();
            }).catch(() => {});
          }
        },
        {
          id: 'entrancePerspectivePortrait',
          label: 'Perspective (Portrait)',
          stateKey: 'entrancePerspectivePortrait',
          type: 'range',
          min: 500, max: 3000, step: 50,
          default: 800,
          format: v => `${Math.round(v)}px`,
          parse: v => parseInt(v, 10),
          hint: '3D perspective for portrait aspect ratio',
          onChange: () => {
            Promise.resolve().then(function () { return entranceAnimation; }).then(({ applyPerspectiveCSS }) => {
              applyPerspectiveCSS();
            }).catch(() => {});
          }
        }
      ]
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // FLAT LIST OF ALL CONTROLS (for iteration)
  // ═══════════════════════════════════════════════════════════════════════════════

  function getAllControls() {
    const all = [];
    for (const section of Object.values(CONTROL_SECTIONS)) {
      for (const control of section.controls) {
        all.push({ ...control, section: section.title });
      }
    }
    return all;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HTML GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════

  function generateControlHTML(control) {
    // Divider type - section separator within a category
    if (control.type === 'divider') {
      return `<div class="control-divider"><span class="control-divider-label">${control.label || ''}</span></div>`;
    }
    
    if (!isControlVisible(control.id)) return '';
    
    const sliderId = control.id + 'Slider';
    const valId = control.id + 'Val';
    const pickerId = control.id + 'Picker';
    const hintTitleAttr = control.hint ? ` title="${escapeAttr(control.hint)}"` : '';

    // Color distribution (custom control)
    if (control.type === 'colorDistribution') {
      const labels = Array.isArray(control.labels) ? control.labels : [];
      const rowsHtml = labels.map((label, i) => {
        const safeLabel = String(label || '').trim();
        const swatchId = `colorDistSwatch${i}`;
        const selectId = `colorDistColor${i}`;
        const weightId = `colorDistWeight${i}`;
        const weightValId = `colorDistWeightVal${i}`;
        return `
        <div class="color-dist-row" data-color-dist-row="${i}">
          <div class="color-dist-row-label">${safeLabel}</div>
          <div class="color-dist-row-controls">
            <span class="color-dist-swatch" id="${swatchId}" aria-hidden="true"></span>
            <select id="${selectId}" class="control-select color-dist-select" aria-label="${safeLabel} color"></select>
            <input type="range" id="${weightId}" min="0" max="100" step="1" value="0" aria-label="${safeLabel} weight">
            <span class="color-dist-weight" id="${weightValId}">0%</span>
          </div>
        </div>`;
      }).join('');
      return `
      <div class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
          <span class="control-value" id="colorDistTotalVal">100%</span>
        </div>
        <div class="color-dist-grid" id="colorDistGrid">
          ${rowsHtml}
        </div>
        <div class="color-dist-actions">
          <button type="button" class="secondary" id="colorDistResetBtn" aria-label="Reset color distribution to defaults">Reset Defaults</button>
        </div>
      </div>
      ${control.hint ? `<p class="control-hint">${control.hint}</p>` : ''}`;
    }
    
    // Color picker type
    if (control.type === 'color') {
      return `
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label"${hintTitleAttr}>${control.label}</span>
          <span class="control-value" id="${valId}">${control.default}</span>
        </div>
        <input type="color" id="${pickerId}" value="${control.default}" aria-label="${control.label}" />
      </label>
      ${control.hint ? `<p class="control-hint">${control.hint}</p>` : ''}`;
    }

    // Select type
    if (control.type === 'select') {
      const opts = Array.isArray(control.options) ? control.options : [];
      const optionsHtml = opts.map((o) => {
        const v = String(o.value);
        const label = String(o.label ?? o.value);
        const selectedAttr = String(control.default) === v ? 'selected' : '';
        return `<option value="${v}" ${selectedAttr}>${label}</option>`;
      }).join('');
      const hintHtml = control.hint ? `<p class="control-hint">${control.hint}</p>` : '';
      return `
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label"${hintTitleAttr}>${control.label}</span>
          <span class="control-value" id="${valId}">${safeFormat(control, control.default)}</span>
        </div>
        <select id="${sliderId}" class="control-select" aria-label="${control.label}">
          ${optionsHtml}
        </select>
      </label>
      ${hintHtml}`;
    }

    // Boolean type (checkbox / toggle alias)
    if (control.type === 'checkbox' || control.type === 'toggle') {
      const checkedAttr = control.default ? 'checked' : '';
      return `
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label"${hintTitleAttr}>${control.label}</span>
          <span class="control-value" id="${valId}">${control.default ? 'On' : 'Off'}</span>
        </div>
        <input type="checkbox" id="${sliderId}" ${checkedAttr} aria-label="${control.label}">
      </label>
      ${control.hint ? `<p class="control-hint">${control.hint}</p>` : ''}`;
    }
    
    // Default: range slider
    const hintHtml = control.hint ? `<p class="control-hint">${control.hint}</p>` : '';
    
    return `
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label"${hintTitleAttr}>${control.label}</span>
          <span class="control-value" id="${valId}">${safeFormat(control, control.default)}</span>
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
        if (currentGroup !== null) html += '</div>'; // Close previous group content
        const groupLayout = control.groupLayout || '';
        html += `<div class="section-title" style="margin-top: 12px;">${control.group}</div><div class="group ${groupLayout}">`;
        currentGroup = control.group;
      } else if (!control.group && currentGroup !== null) {
        html += '</div>'; // Close group content
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

  function generateThemeSectionHTML({ open = true } = {}) {
    return `
    <details class="panel-section-accordion" ${open ? 'open' : ''}>
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
    </details>`;
  }

  function generateColorTemplateSectionHTML({ open = false } = {}) {
    return `
    <details class="panel-section-accordion" ${open ? 'open' : ''}>
      <summary class="panel-section-header">
        <span class="section-icon">🌈</span>
        <span class="section-label">Palette</span>
      </summary>
      <div class="panel-section-content">
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Color Template</span>
            <span class="control-value"></span>
          </div>
          <select id="colorSelect"></select>
        </label>
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Rotate on Reload</span>
            <span class="control-value"></span>
          </div>
          <input id="paletteRotateOnReload" type="checkbox" />
        </label>
      </div>
    </details>`;
  }

  function generateMasterSectionsHTML() {
    let html = '';
    let lastCategory = null;
    
    for (const key of MASTER_SECTION_KEYS) {
      if (!CONTROL_SECTIONS[key]) continue;
      
      const currentCategory = SECTION_CATEGORIES[key] || null;
      
      // Add category label and separator if category changed
      if (currentCategory && currentCategory !== lastCategory) {
        if (lastCategory !== null) {
          // Close previous category group with separator
          html += '</div>';
        }
        // Open new category group with label
        html += `
        <div class="panel-category-group">
          <div class="panel-category-label">${currentCategory}</div>`;
        lastCategory = currentCategory;
      } else if (!currentCategory && lastCategory !== null) {
        // Close category group if transitioning to uncategorized
        html += '</div>';
        lastCategory = null;
      }
      
      html += generateSectionHTML(key, CONTROL_SECTIONS[key]);
    }
    
    // Close final category group if open
    if (lastCategory !== null) {
      html += '</div>';
    }
    
    return html;
  }

  function generateHomeModeSectionHTML() {
    // Mode-specific options should appear directly under the mode selector.
    const modeControlsHtml = Object.entries(CONTROL_SECTIONS)
      .filter(([, section]) => section?.mode)
      .map(([key, section]) => generateSectionHTML(key, section))
      .join('');

    return `
    <details class="panel-section-accordion" open>
      <summary class="panel-section-header">
        <span class="section-icon">🎛️</span>
        <span class="section-label">Mode</span>
      </summary>
      <div class="panel-section-content">
        <div class="mode-switcher" role="group" aria-label="Simulation mode selector">
          ${(() => {
            const modeIcons = {
              'pit': '🎯',
              'bubbles': '🫧',
              'critters': '🪲',
              'flies': '🕊️',
              'pit-throws': '🎯',
              'water': '🌊',
              'vortex': '🌀',
              'magnetic': '🧲',
              'ping-pong': '🏓',
              'weightless': '🌌',
              'kaleidoscope': '🪞',
              'kaleidoscope-1': '🪞',
              'kaleidoscope-2': '🪞',
              'kaleidoscope-3': '🪞',
              'orbit-3d': '🌪️',
              'orbit-3d-2': '🌪️',
              'lattice': '💎',
              'neural': '🧠'
            };
            const modeLabels = {
              'pit': 'Pit',
              'bubbles': 'Bubbles',
              'critters': 'Critters',
              'flies': 'Flies',
              'pit-throws': 'Throws',
              'water': 'Water',
              'vortex': 'Vortex',
              'magnetic': 'Magnet',
              'ping-pong': 'Pong',
              'weightless': 'Zero-G',
              'kaleidoscope': 'Kalei',
              'kaleidoscope-1': 'Kalei I',
              'kaleidoscope-2': 'Kalei II',
              'kaleidoscope-3': 'Kalei III',
              'orbit-3d': 'Orbit',
              'orbit-3d-2': 'Swarm',
              'lattice': 'Lattice',
              'neural': 'Neural'
            };
            let buttons = '';
            NARRATIVE_MODE_SEQUENCE.forEach((mode) => {
              const modeKey = mode;
              const icon = modeIcons[modeKey] || '⚪';
              const label = modeLabels[modeKey] || modeKey;
              buttons += `<button class="mode-button" data-mode="${modeKey}" aria-label="${NARRATIVE_CHAPTER_TITLES[mode] || label} mode">${icon} ${label}</button>`;
            });
            return buttons;
          })()}
        </div>
        ${modeControlsHtml}
      </div>
    </details>`;
  }

  function generateHomePanelHTML() {
    // NOTE: Don't wrap in .panel-content here - panel-dock.js creates that wrapper
    let html = `
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only" id="announcer"></div>
    ${generateHomeModeSectionHTML()}
  `;

    for (const [key, section] of Object.entries(CONTROL_SECTIONS)) {
      if (section?.mode) continue;
      if (MASTER_SECTION_KEYS.includes(key)) continue;
      html += generateSectionHTML(key, section);
    }

    return html;
  }

  function generatePanelHTML() {
    // NOTE: Don't wrap in .panel-content here - panel-dock.js creates that wrapper

    // Rule: every simulation must have at least 4 configurable parameters.
    // We enforce this in dev as a warning to keep production resilient.
    try {
      for (const [, section] of Object.entries(CONTROL_SECTIONS)) {
        if (!section?.mode) continue;
        const n = Array.isArray(section.controls) ? section.controls.length : 0;
        if (n < 4) console.warn(`[panel] Mode \"${section.mode}\" has only ${n} controls; add at least 4 parameters.`);
      }
    } catch (e) {}

    // Backwards compatibility: preserve the original full-panel HTML for any legacy code paths.
    return `
    ${generateThemeSectionHTML({ open: true })}
    ${generateMasterSectionsHTML()}
    ${generateHomePanelHTML()}
    ${generateColorTemplateSectionHTML({ open: false })}
    <div class="panel-section panel-section--action">
      <button id="saveRuntimeConfigBtn" class="primary">💾 Save Config</button>
    </div>
    <div class="panel-footer">
      <kbd>R</kbd> reset · <kbd>/</kbd> panel · <kbd>9</kbd> kalei · Critters + Throws have no key (yet)
    </div>
  `;
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

        // Color distribution binding (custom)
        if (control.type === 'colorDistribution') {
          const labels = Array.isArray(control.labels) ? control.labels : [];
          const resetBtn = document.getElementById('colorDistResetBtn');

          function normalizeLabel(s) {
            return String(s || '').trim().toLowerCase();
          }

          function clampIntLocal(v, min, max, fallback = min) {
            const n = Number(v);
            if (!Number.isFinite(n)) return fallback;
            const i = Math.floor(n);
            return i < min ? min : i > max ? max : i;
          }

          function buildPaletteOptions(usedByIndex) {
            // Palette indices are stable (0..7), colors vary by template.
            const out = [];
            for (let idx = 0; idx < 8; idx++) {
              const labelSuffix = usedByIndex[idx] ? ` — ${usedByIndex[idx]}` : '';
              out.push({ value: String(idx), label: `Ball ${idx + 1}${labelSuffix}` });
            }
            return out;
          }

          function sanitizeDistribution(src) {
            const base = Array.isArray(g.colorDistribution) ? g.colorDistribution : [];
            const map = new Map();
            for (const row of base) {
              map.set(normalizeLabel(row?.label), row);
            }
            // Start from src if valid, otherwise base.
            const raw = Array.isArray(src) ? src : base;
            const out = [];
            const used = new Set();

            // Collect preferred indices in order.
            for (let i = 0; i < labels.length; i++) {
              const label = String(labels[i] || '').trim();
              const key = normalizeLabel(label);
              const incoming = raw.find(r => normalizeLabel(r?.label) === key) || map.get(key) || { };
              let idx = clampIntLocal(incoming?.colorIndex, 0, 7, clampIntLocal(map.get(key)?.colorIndex, 0, 7, 0));
              // Enforce uniqueness: if already used, pick the first free palette slot.
              if (used.has(idx)) {
                for (let j = 0; j < 8; j++) {
                  if (!used.has(j)) { idx = j; break; }
                }
              }
              used.add(idx);
              const w = clampIntLocal(incoming?.weight, 0, 100, clampIntLocal(map.get(key)?.weight, 0, 100, 0));
              out.push({ label, colorIndex: idx, weight: w });
            }
            return out;
          }

          function normalizeWeightsTo100(weights, preferredIdx = 0) {
            // Integer weights, clamp 0..100, then fix rounding drift to sum exactly 100.
            const w = weights.map(x => clampIntLocal(x, 0, 100, 0));
            let sum = 0;
            for (let i = 0; i < w.length; i++) sum += w[i];
            if (sum === 100) return w;
            if (sum === 0) {
              w[preferredIdx] = 100;
              return w;
            }
            // Scale to 100, then distribute remainder.
            const scaled = new Array(w.length).fill(0);
            let scaledSum = 0;
            for (let i = 0; i < w.length; i++) {
              const v = Math.round((w[i] / sum) * 100);
              scaled[i] = v;
              scaledSum += v;
            }
            let drift = 100 - scaledSum;
            // Fix drift by adding/subtracting 1s.
            while (drift !== 0) {
              if (drift > 0) {
                // Add to the largest (prefer the edited index if tie).
                let best = 0;
                for (let i = 1; i < scaled.length; i++) {
                  if (scaled[i] > scaled[best]) best = i;
                }
                scaled[best] += 1;
                drift -= 1;
              } else {
                // Subtract from the largest positive.
                let best = -1;
                for (let i = 0; i < scaled.length; i++) {
                  if (scaled[i] > 0 && (best === -1 || scaled[i] > scaled[best])) best = i;
                }
                if (best === -1) break;
                scaled[best] -= 1;
                drift += 1;
              }
            }
            return scaled.map(x => clampIntLocal(x, 0, 100, 0));
          }

          function rebalanceWeights(dist, changedRow, newWeight) {
            const weights = dist.map(r => clampIntLocal(r?.weight, 0, 100, 0));
            weights[changedRow] = clampIntLocal(newWeight, 0, 100, weights[changedRow]);
            const sum = weights.reduce((a, b) => a + b, 0);
            if (sum === 100) return weights;
            // Normalize to 100 while preserving relative proportions as much as possible.
            return normalizeWeightsTo100(weights, changedRow);
          }

          function getModeBallCountApprox() {
            // Best-effort: show an approximate per-mode ball count for “≈N balls” readouts.
            const mode = g.currentMode;
            const map = {
              pit: null,
              'pit-throws': null,
              flies: g.fliesBallCount,
              weightless: g.weightlessCount,
              water: g.waterBallCount,
              vortex: g.vortexBallCount,
              'ping-pong': g.pingPongBallCount,
              magnetic: g.magneticBallCount,
              bubbles: g.bubblesMaxCount,
              kaleidoscope: g.kaleidoscopeBallCount,
              'kaleidoscope-1': g.kaleidoscope1BallCount,
              'kaleidoscope-2': g.kaleidoscope2BallCount,
              'kaleidoscope-3': g.kaleidoscope3BallCount,
              critters: g.critterCount,
              neural: g.neuralBallCount,
              lattice: g.latticeBallCount,
              orbit3d: g.orbit3dMoonCount,
              orbit3d2: g.orbit3d2MoonCount
            };
            const v = map[mode];
            return Number.isFinite(Number(v)) ? Number(v) : null;
          }

          function applyDistributionSideEffects() {
            // 1) Update legend classes (label → palette slot)
            Promise.resolve().then(function () { return legendColors; })
              .then(({ applyExpertiseLegendColors }) => applyExpertiseLegendColors?.())
              .catch(() => {});
            // 2) Recolor existing balls for immediate feedback (event-driven; not hot path)
            Promise.resolve().then(function () { return colors; })
              .then(({ pickRandomColor }) => {
                if (typeof pickRandomColor !== 'function') return;
                const balls = g.balls || [];
                for (let i = 0; i < balls.length; i++) {
                  balls[i].color = pickRandomColor();
                }
              })
              .catch(() => {});
          }

          function syncColorDistributionUI() {
            // Ensure state is sane + unique.
            const sanitized = sanitizeDistribution(g.colorDistribution);
            // Ensure sum to 100.
            const weights = normalizeWeightsTo100(sanitized.map(r => r.weight), 0);
            for (let i = 0; i < sanitized.length; i++) sanitized[i].weight = weights[i];
            g.colorDistribution = sanitized;

            // Used colors map (for disabling dropdown options).
            const usedByIndex = {};
            for (let i = 0; i < sanitized.length; i++) {
              usedByIndex[sanitized[i].colorIndex] = sanitized[i].label;
            }

            const options = buildPaletteOptions(usedByIndex);
            const modeCount = getModeBallCountApprox();

            // Update each row UI.
            for (let i = 0; i < labels.length; i++) {
              const row = sanitized[i] || { colorIndex: 0, weight: 0};
              const swatch = document.getElementById(`colorDistSwatch${i}`);
              const select = document.getElementById(`colorDistColor${i}`);
              const weight = document.getElementById(`colorDistWeight${i}`);
              const weightVal = document.getElementById(`colorDistWeightVal${i}`);
              if (select) {
                // Rebuild options with disabled selections (except your own current selection).
                select.innerHTML = '';
                for (const o of options) {
                  const opt = document.createElement('option');
                  opt.value = o.value;
                  opt.textContent = o.label;
                  const idx = clampIntLocal(o.value, 0, 7, 0);
                  const takenBy = usedByIndex[idx];
                  const isMine = idx === row.colorIndex;
                  if (takenBy && !isMine) opt.disabled = true;
                  select.appendChild(opt);
                }
                select.value = String(row.colorIndex);
              }
              if (weight) {
                weight.value = String(clampIntLocal(row.weight, 0, 100, 0));
              }
              if (weightVal) {
                const pct = clampIntLocal(row.weight, 0, 100, 0);
                const approx = (modeCount != null) ? Math.round((pct / 100) * modeCount) : null;
                weightVal.textContent = approx != null ? `${pct}% (≈${approx})` : `${pct}%`;
              }
              if (swatch) {
                const idx = clampIntLocal(row.colorIndex, 0, 7, 0);
                // We use CSS vars to stay aligned with the current template + dark mode.
                swatch.style.backgroundColor = `var(--ball-${idx + 1})`;
              }
            }

            // Total
            const totalEl = document.getElementById('colorDistTotalVal');
            if (totalEl) {
              let total = 0;
              for (let i = 0; i < sanitized.length; i++) total += sanitized[i].weight;
              totalEl.textContent = `${total}%`;
            }
          }

          // Initial sync (panel just mounted)
          try { syncColorDistributionUI(); } catch (e) {}

          // Reset defaults
          if (resetBtn) {
            resetBtn.addEventListener('click', () => {
              const defaults = g?.config?.colorDistribution;
              g.colorDistribution = sanitizeDistribution(defaults);
              const weights = normalizeWeightsTo100(g.colorDistribution.map(r => r.weight), 0);
              for (let i = 0; i < g.colorDistribution.length; i++) g.colorDistribution[i].weight = weights[i];
              syncColorDistributionUI();
              applyDistributionSideEffects();
              autoSaveSettings();
            });
          }

          // Wire per-row events
          for (let i = 0; i < labels.length; i++) {
            const select = document.getElementById(`colorDistColor${i}`);
            const weight = document.getElementById(`colorDistWeight${i}`);

            if (select) {
              select.addEventListener('change', () => {
                const idx = clampIntLocal(select.value, 0, 7, 0);
                const dist = sanitizeDistribution(g.colorDistribution);
                dist[i].colorIndex = idx;
                g.colorDistribution = dist;
                syncColorDistributionUI();
                applyDistributionSideEffects();
                autoSaveSettings();
              });
            }

            if (weight) {
              weight.addEventListener('input', () => {
                const val = clampIntLocal(weight.value, 0, 100, 0);
                const dist = sanitizeDistribution(g.colorDistribution);
                const newWeights = rebalanceWeights(dist, i, val);
                for (let j = 0; j < dist.length; j++) dist[j].weight = newWeights[j];
                g.colorDistribution = dist;
                syncColorDistributionUI();
                applyDistributionSideEffects();
                autoSaveSettings();
              });
            }
          }

          continue;
        }
        
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
            
            // Sync to source config file (dev mode only)
            if (control.stateKey) {
              syncConfigToFile('default', control.stateKey, colorVal);
            }
            
            autoSaveSettings();
          });
          
          continue;
        }

        // Select binding
        if (control.type === 'select') {
          const selectId = control.id + 'Slider';
          const el = document.getElementById(selectId);
          if (!el) continue;
          
          el.addEventListener('change', () => {
            const rawVal = control.parse ? control.parse(el.value) : el.value;
            
            if (control.stateKey) {
              g[control.stateKey] = rawVal;
            }
            
            if (control.onChange) {
              control.onChange(g, rawVal);
            }
            
            if (valEl) {
              const displayVal = control.stateKey ? g[control.stateKey] : rawVal;
              valEl.textContent = control.format ? control.format(displayVal) : String(displayVal);
            }
            
            // Sync to source config file (dev mode only)
            if (control.stateKey) {
              syncConfigToFile('default', control.stateKey, rawVal);
            }
            
            autoSaveSettings();
          });
          
          continue;
        }

        // Boolean binding (checkbox / toggle alias)
        if (control.type === 'checkbox' || control.type === 'toggle') {
          const checkboxId = control.id + 'Slider';
          const el = document.getElementById(checkboxId);
          if (!el) continue;

          el.addEventListener('change', () => {
            const rawVal = !!el.checked;

            if (control.stateKey) {
              g[control.stateKey] = rawVal;
            }

            if (control.onChange) {
              control.onChange(g, rawVal);
            }

            if (valEl) {
              valEl.textContent = rawVal ? 'On' : 'Off';
            }

            // Re-init mode if needed
            // IMPORTANT: Do NOT import per-mode module files by name (e.g. `kaleidoscope-1.js` doesn't exist).
            // Always reset via the mode controller so variants that share a module re-init correctly.
            if (control.reinitMode && g.currentMode === section.mode) {
              Promise.resolve().then(function () { return modeController; })
                .then(({ resetCurrentMode }) => resetCurrentMode?.())
                .catch(() => {});
            }

            // Sync to source config file (dev mode only)
            if (control.stateKey) {
              syncConfigToFile('default', control.stateKey, rawVal);
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
          const hasParse = typeof control?.parse === 'function';
          const rawVal = hasParse ? control.parse(el.value) : Number.parseFloat(el.value);
          
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
          
          // Re-init mode if needed (see note above)
          if (control.reinitMode && g.currentMode === section.mode) {
            Promise.resolve().then(function () { return modeController; })
              .then(({ resetCurrentMode }) => resetCurrentMode?.())
              .catch(() => {});
          }
          
          // Sync to source config file (dev mode only)
          if (control.stateKey) {
            syncConfigToFile('default', control.stateKey, rawVal);
          }
          
          autoSaveSettings();
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SYNC SLIDERS TO STATE (after loading saved settings)
  // ═══════════════════════════════════════════════════════════════════════════════

  function syncSlidersToState(options = {}) {
    const g = getGlobals();
    const runOnChange = options.runOnChange !== false;
    
    for (const section of Object.values(CONTROL_SECTIONS)) {
      for (const control of section.controls) {
        // Custom: color distribution UI is synced in bindRegisteredControls (it needs to build options).
        if (control.type === 'colorDistribution') {
          // No-op here.
          continue;
        }
        
        // Color pickers use 'Picker' suffix, others use 'Slider'
        const elementId = control.type === 'color' ? (control.id + 'Picker') : (control.id + 'Slider');
        const valId = control.id + 'Val';
        const el = document.getElementById(elementId);
        const valEl = document.getElementById(valId);
        
        if (!el || !control.stateKey) continue;
        
        const stateVal = g[control.stateKey];
        if (stateVal !== undefined) {
          if (control.type === 'checkbox' || control.type === 'toggle') {
            el.checked = !!stateVal;
            if (valEl) valEl.textContent = stateVal ? 'On' : 'Off';
          } else if (control.type === 'color') {
            el.value = stateVal;
            if (valEl) valEl.textContent = stateVal;
          } else {
            el.value = stateVal;
            if (valEl) valEl.textContent = control.format ? control.format(stateVal) : String(stateVal);
          }
          
          // Call onChange handler to initialize CSS variables / apply side effects.
          // IMPORTANT: Avoid re-entrant loops for preset selectors that themselves call `syncSlidersToState()`.
          // (e.g. wallPreset → applyWallPreset → syncSlidersToState → wallPreset.onChange → ...)
          if (runOnChange && control.onChange && control.id !== 'wallPreset') {
            control.onChange(g, stateVal);
          }
        }
      }
    }
  }

  var controlRegistry = /*#__PURE__*/Object.freeze({
    __proto__: null,
    CONTROL_SECTIONS: CONTROL_SECTIONS,
    MASTER_SECTION_KEYS: MASTER_SECTION_KEYS,
    applyParallaxLinearPreset: applyParallaxLinearPreset,
    applyParallaxPerspectivePreset: applyParallaxPerspectivePreset,
    bindRegisteredControls: bindRegisteredControls,
    generateColorTemplateSectionHTML: generateColorTemplateSectionHTML,
    generateHomePanelHTML: generateHomePanelHTML,
    generateMasterSectionsHTML: generateMasterSectionsHTML,
    generatePanelHTML: generatePanelHTML,
    generateThemeSectionHTML: generateThemeSectionHTML,
    getAllControls: getAllControls,
    isControlVisible: isControlVisible,
    setApplyVisualCSSVars: setApplyVisualCSSVars,
    syncSlidersToState: syncSlidersToState
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            UI CONTROLS WIRING                                ║
  // ║              Thin orchestrator for panel controls                            ║
  // ║    All slider bindings are handled by control-registry.js                    ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  /**
   * Master controls (shared across pages)
   * - Registry handles all slider/picker bindings via bindRegisteredControls()
   * - This file handles only: theme buttons and color template select
   */
  function setupMasterControls() {
    // ═══════════════════════════════════════════════════════════════════════════
    // BIND ALL REGISTERED CONTROLS FROM REGISTRY (single source of truth)
    // ═══════════════════════════════════════════════════════════════════════════
    bindRegisteredControls();

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
   * Index-only controls (home page)
   * - Adds mode switching UI and related updates
   */
  function setupIndexControls() {
    setupMasterControls();

    // ═══════════════════════════════════════════════════════════════════════════
    // MODE BUTTONS — Critical for panel mode switching
    // ═══════════════════════════════════════════════════════════════════════════
    const modeButtons = document.querySelectorAll('.mode-button');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.getAttribute('data-mode');
        console.log('Mode button clicked:', mode);
        Promise.resolve().then(function () { return modeController; })
          .then(({ setMode }) => {
            setMode(mode);
            updateModeButtonsUI(mode);
          })
          .catch(() => {});
      });
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
        'critters': 'Critters',
        'pit': 'Ball Pit',
        'pit-throws': 'Ball Pit (Throws)',
        'flies': 'Flies to Light', 
        'weightless': 'Zero-G',
        'water': 'Water Swimming',
        'vortex': 'Vortex Sheets',
        'ping-pong': 'Ping Pong',
        'magnetic': 'Magnetic',
        'bubbles': 'Carbonated Bubbles',
        'kaleidoscope': 'Kaleidoscope',
        'kaleidoscope-1': 'Kaleidoscope I',
        'kaleidoscope-2': 'Kaleidoscope II',
        'kaleidoscope-3': 'Kaleidoscope III',
        'orbit-3d': 'Orbit 3D',
        'orbit-3d-2': 'Orbit 3D (Tight Swarm)',
        'lattice': 'Crystal Lattice',
        'neural': 'Neural Network'
      };
      announcer.textContent = `Switched to ${modeNames[activeMode] || activeMode} mode`;
    }

    // Update left-edge chapter label (creative-process narrative title)
    try {
      const el = document.getElementById('edge-chapter-text');
      if (el) {
        el.textContent = NARRATIVE_CHAPTER_TITLES?.[activeMode] || '—';
      }
    } catch (e) {}
  }

  var controls = /*#__PURE__*/Object.freeze({
    __proto__: null,
    setupIndexControls: setupIndexControls,
    setupMasterControls: setupMasterControls,
    updateModeButtonsUI: updateModeButtonsUI
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                         CONTROL PANEL HTML TEMPLATE                          ║
  // ║           Generated from centralized control-registry.js                     ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // For backwards compatibility, also export PANEL_HTML constant
  // Note: This won't update if visibility changes at runtime
  generatePanelHTML();

  // Page-specific (index/home) controls without master sections/footer.
  const HOME_PANEL_HTML = generateHomePanelHTML();

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                             BUILD / SAVE CONFIG                              ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function setupBuildControls() {
    const btn = document.getElementById('saveRuntimeConfigBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const g = getGlobals();
      // Build a "complete" config snapshot that round-trips all panel settings.
      // - Includes all registered controls (mode + global sections)
      // - Includes canonical key aliases for compatibility (ballScale/sizeScale, repelSoft/repelSoftness)
      // - Includes sound preset + full soundConfig overrides
      const config = {};

      // 1) All registered controls → copy from state by stateKey
      try {
        const controls = getAllControls();
        for (const c of controls) {
          if (!c || !c.stateKey) continue;
          const v = g[c.stateKey];
          if (v === undefined) continue;
          config[c.stateKey] = v;
        }
      } catch (e) {}

      // 2) Canonical + legacy aliases (keep these stable)
      config.gravityMultiplier = g.gravityMultiplierPit;
      config.restitution = g.REST;
      config.friction = g.FRICTION;
      config.ballMass = g.ballMassKg;
      config.ballScale = g.sizeScale;
      config.sizeScale = g.sizeScale;
      config.sizeVariation = g.sizeVariation;
      config.repelSoft = g.repelSoft;
      config.repelSoftness = g.repelSoft;

      // 3) Explicitly include layout controls (not in registry)
      // Layout is vw-native (derived to px at runtime). Export vw keys as canonical.
      config.layoutViewportWidthPx = g.layoutViewportWidthPx || 0;
      config.containerBorderVw = g.containerBorderVw;
      config.simulationPaddingVw = g.simulationPaddingVw;
      config.contentPaddingVw = g.contentPaddingVw;
      config.contentPaddingHorizontalRatio = g.contentPaddingHorizontalRatio;
      config.wallRadiusVw = g.wallRadiusVw;
      config.wallThicknessVw = g.wallThicknessVw;
      // Minimum clamp targets (px)
      config.layoutMinContentPaddingPx = Math.max(0, Math.round(g.layoutMinContentPaddingPx ?? 0));
      config.layoutMinWallRadiusPx = Math.max(0, Math.round(g.layoutMinWallRadiusPx ?? 0));
      // Physics-only inset remains px.
      config.wallInset = g.wallInset;

      // 4) Sound (full round-trip)
      try {
        config.soundPreset = getCurrentPreset();
        config.soundConfig = getSoundConfig();
      } catch (e) {}

      // 4b) Browser / theme environment
      config.chromeHarmonyMode = g.chromeHarmonyMode;
      config.autoDarkModeEnabled = g.autoDarkModeEnabled;
      config.autoDarkNightStartHour = g.autoDarkNightStartHour;
      config.autoDarkNightEndHour = g.autoDarkNightEndHour;

      // 5) Stable housekeeping defaults
      config.enableLOD = false;
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      // This is the file you can drop in as `source/config/default-config.json` and rebuild.
      a.download = 'default-config.json';
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
    // v2: avoid inheriting old "too low" positions
    position: 'panel_dock_position_v2',
    dockHidden: 'panel_dock_hidden',
    panelCollapsed: 'master_panel_collapsed',
    // v3: separate dev/prod panel sizes (they have different contexts)
    panelSize: isDev() ? 'panel_dock_size_dev_v3' : 'panel_dock_size_prod_v3'
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

  function loadDockHiddenState({ defaultHidden = true } = {}) {
    try {
      const v = localStorage.getItem(STORAGE_KEYS.dockHidden);
      if (v === null) return !!defaultHidden;
      return v === 'true';
    } catch (e) {
      return !!defaultHidden;
    }
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

  function getMasterPanelContent({
    pageLabel = 'Home',
    pageHTML = HOME_PANEL_HTML,
    includePageSaveButton = false,
    pageSaveButtonId = 'savePortfolioConfigBtn',
    footerHint = '<kbd>R</kbd> reset · <kbd>/</kbd> panel · <kbd>9</kbd> kalei · Critters + Throws have no key (yet)',
  } = {}) {
    const g = getGlobals();
    const viewportWidthPx = getLayoutViewportWidthPx();
    const viewportWidthLabel = g.layoutViewportWidthPx > 0
      ? `${Math.round(g.layoutViewportWidthPx)}px`
      : `Auto (${Math.round(viewportWidthPx)}px)`;
    const wallInsetVal = Math.max(0, Math.round(g.wallInset ?? 3));

    const layoutSectionHTML = `
    <details class="panel-section-accordion" id="layoutSection">
      <summary class="panel-section-header">
        <span class="section-icon">📐</span>
        <span class="section-label">Layout</span>
      </summary>
      <div class="panel-section-content">
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Viewport Width</span>
            <span class="control-value" id="viewportWidthValue">${viewportWidthLabel}</span>
          </div>
          <input type="range" id="layoutViewportWidth" min="0" max="2400" step="10" value="${Math.round(g.layoutViewportWidthPx || 0)}" />
          <div class="control-hint">0 = Auto (uses current window width)</div>
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
  `;

    const soundSectionHTML = `
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
  `;

    const pageSectionHTML = `
    <details class="panel-section-accordion" id="pageSection" open>
      <summary class="panel-section-header">
        <span class="section-icon">⚙️</span>
        <span class="section-label">${pageLabel}</span>
      </summary>
      <div class="panel-section-content">
        ${pageHTML}
      </div>
    </details>
  `;

    const actionsHTML = `
    <div class="panel-section panel-section--action">
      <button id="saveRuntimeConfigBtn" class="primary">💾 Save Config</button>
      ${includePageSaveButton ? `<button id="${pageSaveButtonId}" class="primary">💾 Save ${pageLabel} Config</button>` : ''}
    </div>
    <div class="panel-footer">${footerHint}</div>
  `;

    return `
    ${generateThemeSectionHTML({ open: true })}
    ${generateMasterSectionsHTML()}
    ${layoutSectionHTML}
    ${soundSectionHTML}
    ${generateColorTemplateSectionHTML({ open: false })}
    ${pageSectionHTML}
    ${actionsHTML}
  `;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // DOCK CREATION
  // ════════════════════════════════════════════════════════════════════════════════

  function createPanelDock(options = {}) {
    // DEV-only: dynamically inject panel.css if not already present
    // (Production builds don't include panel.css, so we inject it on-demand)
    if (!document.querySelector('link[href*="panel.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      // Detect base path (dev: css/panel.css, prod: would not reach here)
      link.href = 'css/panel.css';
      document.head.appendChild(link);
    }

    const page = options.page || 'home';
    const pageLabel = options.pageLabel || (page === 'portfolio' ? 'Portfolio' : 'Home');
    const pageHTML = options.pageHTML || HOME_PANEL_HTML;
    const includePageSaveButton = !!options.includePageSaveButton;
    const pageSaveButtonId = options.pageSaveButtonId || 'savePortfolioConfigBtn';
    const footerHint = options.footerHint || (page === 'portfolio'
      ? '<kbd>/</kbd> panel'
      : '<kbd>R</kbd> reset · <kbd>/</kbd> panel · <kbd>9</kbd> kalei · Critters + Throws have no key (yet)');
    const panelTitle = options.panelTitle || 'Settings';
    const modeLabel = options.modeLabel || (isDev() ? 'DEV MODE' : 'BUILD MODE');
    const bindShortcut = !!options.bindShortcut;
    const setupPageControls = typeof options.setupPageControls === 'function' ? options.setupPageControls : null;

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

    // Default visibility:
    // - Home: visible in dev, hidden in prod (unless user previously toggled it)
    // - Portfolio: hidden by default (panel is a dev tool, summoned with `/`)
    let defaultHidden = page === 'portfolio' ? true : !isDev();
    let isHidden = loadDockHiddenState({ defaultHidden });
    try {
      isHidden = false;
    } catch (e) {}

    dockElement.classList.toggle('hidden', !!isHidden);
    saveDockHiddenState(!!isHidden);
    
    // Create master panel
    masterPanelElement = createMasterPanel({
      page,
      panelTitle,
      modeLabel,
      pageLabel,
      pageHTML,
      includePageSaveButton,
      pageSaveButtonId,
      footerHint,
      setupPageControls,
    });
    dockElement.appendChild(masterPanelElement);

    // Append to body as first child for maximum z-index stacking
    document.body.insertBefore(dockElement, document.body.firstChild);
    
    // Setup interactions
    setupDragging();
    setupResizePersistence();

    // Setup keyboard toggle for non-index pages (index has its own keyboard system).
    if (bindShortcut) bindDockToggleShortcut();

    return dockElement;
  }

  let shortcutBound = false;
  function bindDockToggleShortcut() {
    if (shortcutBound) return;
    shortcutBound = true;
    window.addEventListener('keydown', (event) => {
      try {
        const tag = event.target?.tagName;
        const isFormField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
        const inDock = !!event.target?.closest?.('.panel-dock');
        if (isFormField && !inDock) return;
      } catch (e) {}
      const key = event.key?.toLowerCase?.() || '';
      if (key !== '/' && event.code !== 'Slash') return;
      event.preventDefault();
      toggleDock();
    });
  }

  function createMasterPanel({
    page,
    panelTitle,
    modeLabel,
    pageLabel,
    pageHTML,
    includePageSaveButton,
    pageSaveButtonId,
    footerHint,
    setupPageControls,
  } = {}) {
    const panel = document.createElement('div');
    panel.id = 'masterPanel';
    panel.className = loadPanelCollapsed() ? 'panel collapsed' : 'panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Settings');
    
    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
    <div class="mac-titlebar">
      <div class="mac-traffic" aria-hidden="true">
        <span class="mac-dot mac-dot--red"></span>
        <span class="mac-dot mac-dot--yellow"></span>
        <span class="mac-dot mac-dot--green"></span>
      </div>
      <div class="panel-title mac-title">${panelTitle}</div>
      <div class="mac-right">
        ${isDev() ? `<button id="saveConfigBtn" class="panel-save-btn" aria-label="Save config" title="Save config to file">Save</button>` : ''}
        <button class="collapse-btn mac-collapse" aria-label="Collapse panel" title="Collapse">▾</button>
      </div>
    </div>
  `;
    
    // Content
    const content = document.createElement('div');
    content.className = 'panel-content';
    content.innerHTML = getMasterPanelContent({
      pageLabel,
      pageHTML,
      includePageSaveButton,
      pageSaveButtonId,
      footerHint,
    });
    
    panel.appendChild(header);
    panel.appendChild(content);

    // Restore size (only if user has manually resized - i.e., significantly different from CSS defaults)
    const savedSize = loadPanelSize();
    if (savedSize) {
      // CSS defaults: width = 23rem (368px), height = 80vh
      // Only apply saved size if it's meaningfully different (user actually resized)
      const cssDefaultWidth = 368; // 23rem
      const cssDefaultHeight = window.innerHeight * 0.8; // 80vh
      const widthDiff = Math.abs(savedSize.width - cssDefaultWidth);
      const heightDiff = Math.abs(savedSize.height - cssDefaultHeight);
      
      // Only restore if difference is significant (> 5px) - means user manually resized
      if (widthDiff > 5 || heightDiff > 5) {
        panel.style.width = `${savedSize.width}px`;
        panel.style.height = `${savedSize.height}px`;
        panel.style.maxHeight = 'none';
      }
      // Otherwise, let CSS defaults apply
    }
    
    // Save config button (dev mode only)
    const saveBtn = header.querySelector('#saveConfigBtn');
    if (saveBtn && isDev()) {
      saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await saveAllConfigToFile();
      });
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
      // Shared (master) controls are safe on all pages.
      if (page === 'home') {
        setupIndexControls();
      } else {
        setupMasterControls();
      }

      setupBuildControls();
      setupSoundControls(panel);
      setupLayoutControls(panel);

      // Page-specific bindings (portfolio carousel, etc).
      try { setupPageControls?.(panel); } catch (e) {}
    }, 0);
    
    return panel;
  }

  /**
   * Save all current config values to default-config.json via sync server
   */
  async function saveAllConfigToFile() {
    if (!isDev()) return;
    
    const g = getGlobals();
    const saveBtn = document.getElementById('saveConfigBtn');
    const originalText = saveBtn?.textContent || 'Save';
    
    // Show saving state
    if (saveBtn) {
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;
    }
    
    try {
      // Build organized config snapshot matching original config file structure
      // This ensures a clean, readable config file when saved
      
      // STEP 1: Collect ALL controls first (ensures nothing is missed)
      const config = {};
      try {
        const controls = getAllControls();
        for (const c of controls) {
          if (!c || !c.stateKey) continue;
          const v = g[c.stateKey];
          if (v === undefined) continue;
          config[c.stateKey] = v;
        }
      } catch (e) {
        console.warn('[save-config] Error collecting controls:', e);
      }
      
      // STEP 2: Add/override in organized order for clean file structure
      // (This doesn't add new keys, just ensures they're written in logical order)
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 1) BROWSER / THEME ENVIRONMENT (top of file)
      // ═══════════════════════════════════════════════════════════════════════════
      config.chromeHarmonyMode = g.chromeHarmonyMode;
      config.autoDarkModeEnabled = g.autoDarkModeEnabled;
      config.autoDarkNightStartHour = g.autoDarkNightStartHour;
      config.autoDarkNightEndHour = g.autoDarkNightEndHour;
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 2) MATERIAL WORLD — Physics
      // ═══════════════════════════════════════════════════════════════════════════
      config.ballMassKg = g.ballMassKg;
      config.REST = g.REST;
      config.FRICTION = g.FRICTION;
      config.physicsCollisionIterations = g.physicsCollisionIterations;
      config.physicsSkipSleepingCollisions = g.physicsSkipSleepingCollisions;
      config.physicsSpatialGridOptimization = g.physicsSpatialGridOptimization;
      config.physicsSleepThreshold = g.physicsSleepThreshold;
      config.physicsSleepTime = g.physicsSleepTime;
      config.physicsSkipSleepingSteps = g.physicsSkipSleepingSteps;
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 3) MATERIAL WORLD — Ball Material
      // ═══════════════════════════════════════════════════════════════════════════
      config.sizeScale = g.sizeScale;
      config.responsiveScaleMobile = g.responsiveScaleMobile;
      config.mobileObjectReductionFactor = g.mobileObjectReductionFactor;
      config.ballSoftness = g.ballSoftness;
      config.ballSpacing = g.ballSpacing;
      config.sizeVariationGlobalMul = g.sizeVariationGlobalMul;
      config.sizeVariationCap = g.sizeVariationCap;
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 4) INTERACTION — Cursor, Trail, Links
      // ═══════════════════════════════════════════════════════════════════════════
      config.cursorInfluenceRadiusVw = g.cursorInfluenceRadiusVw;
      config.cursorSize = g.cursorSize;
      config.mouseTrailEnabled = g.mouseTrailEnabled;
      config.mouseTrailLength = g.mouseTrailLength;
      config.mouseTrailSize = g.mouseTrailSize;
      config.mouseTrailFadeMs = g.mouseTrailFadeMs;
      config.mouseTrailOpacity = g.mouseTrailOpacity;
      
      config.contentPaddingRatio = g.contentPaddingRatio;
      config.contentPaddingHorizontalRatio = g.contentPaddingHorizontalRatio;
      if (g.uiHitAreaMul !== undefined) config.uiHitAreaMul = g.uiHitAreaMul;
      if (g.uiIconCornerRadiusMul !== undefined) config.uiIconCornerRadiusMul = g.uiIconCornerRadiusMul;
      if (g.uiIconFramePx) config.uiIconFramePx = g.uiIconFramePx;
      if (g.uiIconGlyphPx) config.uiIconGlyphPx = g.uiIconGlyphPx;
      if (g.uiIconGroupMarginPx !== undefined) config.uiIconGroupMarginPx = g.uiIconGroupMarginPx;
      config.linkTextPadding = g.linkTextPadding;
      config.linkIconPadding = g.linkIconPadding;
      if (g.footerNavBarTopVh !== undefined) config.footerNavBarTopVh = g.footerNavBarTopVh;
      if (g.footerNavBarGapVw !== undefined) config.footerNavBarGapVw = g.footerNavBarGapVw;
      if (g.homeMainLinksBelowLogoPx !== undefined) config.homeMainLinksBelowLogoPx = g.homeMainLinksBelowLogoPx;
      if (g.edgeLabelInsetAdjustPx !== undefined) config.edgeLabelInsetAdjustPx = g.edgeLabelInsetAdjustPx;
      config.linkColorInfluence = g.linkColorInfluence;
      config.linkImpactScale = g.linkImpactScale;
      config.linkImpactBlur = g.linkImpactBlur;
      config.linkImpactDuration = g.linkImpactDuration;
      
      config.sceneImpactEnabled = g.sceneImpactEnabled;
      config.sceneImpactMul = g.sceneImpactMul;
      config.sceneImpactLogoCompMul = g.sceneImpactLogoCompMul;
      config.sceneImpactMobileMulFactor = g.sceneImpactMobileMulFactor;
      config.sceneImpactPressMs = g.sceneImpactPressMs;
      config.sceneImpactReleaseMs = g.sceneImpactReleaseMs;
      config.sceneImpactAnticipation = g.sceneImpactAnticipation;
      config.sceneChangeSoundEnabled = g.sceneChangeSoundEnabled;
      config.sceneChangeSoundIntensity = g.sceneChangeSoundIntensity;
      config.sceneChangeSoundRadius = g.sceneChangeSoundRadius;
      
      config.gateOverlayEnabled = g.gateOverlayEnabled;
      config.gateOverlayOpacity = g.gateOverlayOpacity;
      config.gateOverlayTransitionMs = g.gateOverlayTransitionMs;
      config.gateOverlayTransitionOutMs = g.gateOverlayTransitionOutMs;
      config.gateOverlayContentDelayMs = g.gateOverlayContentDelayMs;
      config.gateDepthScale = g.gateDepthScale;
      config.gateDepthTranslateY = g.gateDepthTranslateY;
      
      config.logoOpacityInactive = g.logoOpacityInactive;
      config.logoOpacityActive = g.logoOpacityActive;
      config.logoBlurInactive = g.logoBlurInactive;
      config.logoBlurActive = g.logoBlurActive;
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 5) LOOK & PALETTE — Colors
      // ═══════════════════════════════════════════════════════════════════════════
      config.bgLight = g.bgLight;
      config.bgDark = g.bgDark;
      config.textColorLight = g.textColorLight;
      config.textColorLightMuted = g.textColorLightMuted;
      config.textColorDark = g.textColorDark;
      config.textColorDarkMuted = g.textColorDarkMuted;
      config.edgeLabelColorLight = g.edgeLabelColorLight;
      config.edgeLabelColorDark = g.edgeLabelColorDark;
      config.linkHoverColor = g.linkHoverColor;
      config.logoColorLight = g.logoColorLight;
      config.logoColorDark = g.logoColorDark;
      config.topLogoWidthVw = g.topLogoWidthVw;
      config.portfolioLogoColorLight = g.portfolioLogoColorLight;
      config.portfolioLogoColorDark = g.portfolioLogoColorDark;
      
      config.colorDistribution = g.colorDistribution;
      config.frameColorLight = g.frameColorLight;
      config.frameColorDark = g.frameColorDark;
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 6) MATERIAL WORLD — Wall
      // ═══════════════════════════════════════════════════════════════════════════
      config.wallPreset = g.wallPreset;
      config.wallThicknessVw = g.wallThicknessVw;
      config.wallThicknessAreaMultiplier = g.wallThicknessAreaMultiplier;
      config.wallRadiusVw = g.wallRadiusVw;
      config.wallInset = g.wallInset;
      config.mobileWallThicknessXFactor = g.mobileWallThicknessXFactor;
      config.mobileEdgeLabelsVisible = g.mobileEdgeLabelsVisible;
      config.wallWobbleMaxDeform = g.wallWobbleMaxDeform;
      config.wallWobbleStiffness = g.wallWobbleStiffness;
      config.wallWobbleDamping = g.wallWobbleDamping;
      config.wallWobbleSigma = g.wallWobbleSigma;
      config.wallWobbleSettlingSpeed = g.wallWobbleSettlingSpeed;
      config.wallWobbleCornerClamp = g.wallWobbleCornerClamp;
      config.wallWobbleImpactThreshold = g.wallWobbleImpactThreshold;
      config.wallWobbleMaxVel = g.wallWobbleMaxVel;
      config.wallWobbleMaxImpulse = g.wallWobbleMaxImpulse;
      config.wallWobbleMaxEnergyPerStep = g.wallWobbleMaxEnergyPerStep;
      config.wallPhysicsSamples = g.wallPhysicsSamples;
      config.wallPhysicsSkipInactive = g.wallPhysicsSkipInactive;
      config.wallRenderDecimation = g.wallRenderDecimation;
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 7) LOOK & PALETTE — Noise/Grain
      // ═══════════════════════════════════════════════════════════════════════════
      config.noiseEnabled = g.noiseEnabled;
      config.noiseSeed = g.noiseSeed;
      config.noiseTextureSize = g.noiseTextureSize;
      config.noiseDistribution = g.noiseDistribution;
      config.noiseMonochrome = g.noiseMonochrome;
      config.noiseChroma = g.noiseChroma;
      config.noiseSizeBase = g.noiseSizeBase;
      config.noiseSizeTop = g.noiseSizeTop;
      config.noiseTopOpacity = g.noiseTopOpacity;
      config.noiseBackOpacity = g.noiseBackOpacity;
      config.noiseFrontOpacity = g.noiseFrontOpacity;
      config.noiseBackOpacityDark = g.noiseBackOpacityDark;
      config.noiseFrontOpacityDark = g.noiseFrontOpacityDark;
      config.noiseMotion = g.noiseMotion;
      config.noiseMotionAmount = g.noiseMotionAmount;
      config.noiseSpeedBackMs = g.noiseSpeedBackMs;
      config.noiseSpeedFrontMs = g.noiseSpeedFrontMs;
      config.noiseFlicker = g.noiseFlicker;
      config.noiseFlickerSpeedMs = g.noiseFlickerSpeedMs;
      config.noiseBlurPx = g.noiseBlurPx;
      config.noiseContrast = g.noiseContrast;
      config.noiseBrightness = g.noiseBrightness;
      config.noiseSaturation = g.noiseSaturation;
      config.noiseHue = g.noiseHue;
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 8) MODE-SPECIFIC CONTROLS — Already collected in STEP 1
      // ═══════════════════════════════════════════════════════════════════════════
      // All mode parameters (critters, flies, pit, weightless, water, vortex, etc.)
      // are already in config from getAllControls() in STEP 1 above
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 9) MOTION — Entrance Animation
      // ═══════════════════════════════════════════════════════════════════════════
      if (g.entranceEnabled !== undefined) config.entranceEnabled = g.entranceEnabled;
      if (g.entranceWallTransitionDelay !== undefined) config.entranceWallTransitionDelay = g.entranceWallTransitionDelay;
      if (g.entranceWallTransitionDuration !== undefined) config.entranceWallTransitionDuration = g.entranceWallTransitionDuration;
      if (g.entranceWallInitialScale !== undefined) config.entranceWallInitialScale = g.entranceWallInitialScale;
      if (g.entranceWallEasing !== undefined) config.entranceWallEasing = g.entranceWallEasing;
      if (g.entranceElementDuration !== undefined) config.entranceElementDuration = g.entranceElementDuration;
      if (g.entranceElementScaleStart !== undefined) config.entranceElementScaleStart = g.entranceElementScaleStart;
      if (g.entranceElementTranslateZStart !== undefined) config.entranceElementTranslateZStart = g.entranceElementTranslateZStart;
      if (g.entrancePerspectiveLandscape !== undefined) config.entrancePerspectiveLandscape = g.entrancePerspectiveLandscape;
      if (g.entrancePerspectiveSquare !== undefined) config.entrancePerspectiveSquare = g.entrancePerspectiveSquare;
      if (g.entrancePerspectivePortrait !== undefined) config.entrancePerspectivePortrait = g.entrancePerspectivePortrait;
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 10) LEGACY ALIASES (keep for compatibility)
      // ═══════════════════════════════════════════════════════════════════════════
      config.gravityMultiplier = g.gravityMultiplierPit;
      config.restitution = g.REST;
      config.friction = g.FRICTION;
      config.ballMass = g.ballMassKg;
      config.ballScale = g.sizeScale;
      config.sizeVariation = g.sizeVariation;
      config.repelSoft = g.repelSoft;
      config.repelSoftness = g.repelSoft;
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 11) LAYOUT (vw-based values + derived)
      // ═══════════════════════════════════════════════════════════════════════════
      config.layoutViewportWidthPx = g.layoutViewportWidthPx || 0;
      config.containerBorderVw = g.containerBorderVw;
      config.simulationPaddingVw = g.simulationPaddingVw;
      config.layoutMinWallRadiusPx = Math.max(0, Math.round(g.layoutMinWallRadiusPx ?? 0));
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 12) SOUND
      // ═══════════════════════════════════════════════════════════════════════════
      try {
        config.soundPreset = getCurrentPreset();
        config.soundConfig = getSoundConfig();
      } catch (e) {}
      
      // ═══════════════════════════════════════════════════════════════════════════
      // 13) HOUSEKEEPING
      // ═══════════════════════════════════════════════════════════════════════════
      config.enableLOD = false;
      
      // Save entire config object at once (bulk save - avoids race conditions)
      const success = await saveConfigBulk('default', config);
      
      if (saveBtn) {
        if (success) {
          saveBtn.textContent = 'Saved!';
          setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
          }, 1500);
        } else {
          saveBtn.textContent = 'Error';
          setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
          }, 2000);
          console.warn(`[save-config] Failed to save config`);
        }
      }
    } catch (e) {
      console.error('[save-config] Error saving config:', e);
      if (saveBtn) {
        saveBtn.textContent = 'Error';
        setTimeout(() => {
          saveBtn.textContent = originalText;
          saveBtn.disabled = false;
        }, 2000);
      }
    }
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
    
    // Make panel draggable from top border area (orange line)
    masterPanelElement.addEventListener('mousedown', (e) => {
      // Only start drag from top 12px area (where orange line is)
      const rect = masterPanelElement.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (y <= 12 && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('select')) {
        handleDragStart(e);
      }
    });
    masterPanelElement.addEventListener('touchstart', (e) => {
      const rect = masterPanelElement.getBoundingClientRect();
      const touch = e.touches[0];
      const y = touch.clientY - rect.top;
      if (y <= 12 && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('select')) {
        handleDragStart(e);
      }
    }, { passive: false });
    
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

  function resetPanelPositions() {
    if (!dockElement) return;
    dockElement.style.position = '';
    dockElement.style.left = '';
    dockElement.style.top = '';
    dockElement.style.right = '';
    try {
      localStorage.removeItem(STORAGE_KEYS.position);
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
    // Dev-only safety: if the dock hasn't been created yet (or got removed),
    // create it on-demand so `/` always works.
    if (!dockElement) {
      try {
        createPanelDock();
      } catch (e) {
        return;
      }
    }

    const isHidden = dockElement.classList.toggle('hidden');
    saveDockHiddenState(isHidden);

    // If we're showing, ensure it isn't off-screen due to a stale saved position.
    if (!isHidden) {
      try {
        ensureDockOnscreen();
      } catch (e) {}
    }
  }

  function ensureDockOnscreen() {
    if (!dockElement) return;

    // If the dock is in its default “right/top” position (no custom left/top),
    // don't interfere.
    const hasCustomLeft = !!dockElement.style.left;
    const hasCustomTop = !!dockElement.style.top;
    if (!hasCustomLeft && !hasCustomTop) return;

    const rect = dockElement.getBoundingClientRect();
    const vw = window.innerWidth || 0;
    const vh = window.innerHeight || 0;
    if (!vw || !vh) return;

    const edge = 10;

    // If rect is wildly out of view, reset to default docked position.
    const totallyOff =
      rect.right < edge ||
      rect.left > vw - edge ||
      rect.bottom < edge ||
      rect.top > vh - edge;
    if (totallyOff) {
      resetPanelPositions();
      return;
    }

    // Clamp to viewport.
    const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
    const nextLeft = clamp(rect.left, edge, Math.max(edge, vw - rect.width - edge));
    const nextTop = clamp(rect.top, edge, Math.max(edge, vh - rect.height - edge));

    dockElement.style.position = 'fixed';
    dockElement.style.left = `${Math.round(nextLeft)}px`;
    dockElement.style.top = `${Math.round(nextTop)}px`;
    dockElement.style.right = 'auto';

    savePanelPosition();
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
    const viewportWidthSlider = panel.querySelector('#layoutViewportWidth');
    const viewportWidthValue = panel.querySelector('#viewportWidthValue');
    const wallInsetSlider = panel.querySelector('#layoutWallInset');
    const wallInsetValue = panel.querySelector('#wallInsetValue');
    const g = getGlobals();

    const syncDerivedLayout = ({ triggerResize = false } = {}) => {
      applyLayoutFromVwToPx();
      applyLayoutCSSVars();
      if (viewportWidthValue) {
        const w = getLayoutViewportWidthPx();
        viewportWidthValue.textContent = g.layoutViewportWidthPx > 0 ? `${Math.round(g.layoutViewportWidthPx)}px` : `Auto (${Math.round(w)}px)`;
      }
      if (triggerResize) {
        try { resize(); } catch (e) {}
      }
      
      // Notify overlay system that layout changed (blur needs recalculation)
      document.dispatchEvent(new CustomEvent('layout-updated'));
    };
    
    // Virtual viewport width (debug): changes the vw→px conversion basis
    if (viewportWidthSlider && viewportWidthValue) {
      viewportWidthSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        g.layoutViewportWidthPx = Number.isFinite(val) ? Math.max(0, val) : 0;
        syncDerivedLayout({ triggerResize: true });
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

  var panelDock = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createPanelDock: createPanelDock,
    resetPanelPositions: resetPanelPositions,
    toggleDock: toggleDock
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                                KEYBOARD INPUT                                ║
  // ║              Panel dock toggle and mode switching (1-9)                      ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let isKeyboardWired = false;

  function navigateNarrative(delta) {
    const g = getGlobals();
    const mode = g?.currentMode || MODES.PIT_THROWS;
    const seq = NARRATIVE_MODE_SEQUENCE;
    if (!seq || !seq.length) return;
    const idx = seq.indexOf(mode);
    const base = (idx >= 0) ? idx : 0;
    const next = (base + delta + seq.length) % seq.length;
    const nextMode = seq[next];
    setMode(nextMode);
    updateModeButtonsUI(nextMode);
  }

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

      // Reset current simulation with R
      if (k === 'r') {
        e.preventDefault();
        resetCurrentMode();
        try {
          const g = getGlobals();
          updateModeButtonsUI(g.currentMode);
        } catch (e) {}
        return;
      }

      // Narrative navigation
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateNarrative(1);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateNarrative(-1);
        return;
      }
      // Direct simulation key mappings are intentionally disabled.
      // Switch simulations using:
      // - ArrowLeft / ArrowRight (narrative sequence)
      // - Panel mode buttons
    });
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                         GATE BLUR OVERLAY SYSTEM                            ║
  // ║  Centralized overlay controller for password gates with backdrop blur      ║
  // ║  Click on overlay dismisses active gate (dispatches 'gate-overlay-dismiss') ║
  // ║  Blur is automatically calculated as half of wall thickness                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let overlayElement = null;
  let isEnabled = true;
  let modalHostElement = null;
  const gateOriginalPlacement = new WeakMap();

  function ensureModalHost() {
      if (!overlayElement) return null;
      if (modalHostElement && modalHostElement.isConnected) return modalHostElement;

      let host = document.getElementById('gate-modal-host');
      if (!host) {
          host = document.createElement('div');
          host.id = 'gate-modal-host';
          host.className = 'gate-modal-host';
          overlayElement.appendChild(host);
      }
      modalHostElement = host;
      return modalHostElement;
  }

  function mountGateIntoOverlay(gateEl) {
      if (!overlayElement || !gateEl) return;
      const host = ensureModalHost();
      if (!host) return;

      if (!gateOriginalPlacement.has(gateEl)) {
          gateOriginalPlacement.set(gateEl, { parent: gateEl.parentNode, nextSibling: gateEl.nextSibling });
      }
      host.appendChild(gateEl);
  }

  function unmountGateFromOverlay(gateEl) {
      if (!gateEl) return;
      const rec = gateOriginalPlacement.get(gateEl);
      if (!rec || !rec.parent) return;
      try {
          if (rec.nextSibling && rec.nextSibling.parentNode === rec.parent) {
              rec.parent.insertBefore(gateEl, rec.nextSibling);
          } else {
              rec.parent.appendChild(gateEl);
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
   */
  function updateBlurFromWallThickness() {
      if (!overlayElement) return;
      const wallThickness = getWallThickness();
      const blurPx = wallThickness / 2;
      overlayElement.style.setProperty('--gate-overlay-blur', `${blurPx}px`);
  }

  /**
   * Initialize the gate overlay system with config values
   * @param {Object} config - Configuration object with overlay settings
   */
  function initGateOverlay(config) {
      overlayElement = document.getElementById('gate-overlay');
      
      if (!overlayElement) {
          console.warn('Gate Overlay: #gate-overlay element not found');
          return;
      }
      
      // Check if overlay is enabled
      isEnabled = config.gateOverlayEnabled !== false;
      
      if (!isEnabled) {
          console.log('Gate Overlay: Disabled by config');
          overlayElement.style.display = 'none';
          return;
      }
      
      // Ensure overlay is visible (not display: none) when enabled
      overlayElement.style.display = '';

      // Ensure modal host exists (overlay becomes the modal container)
      ensureModalHost();
      
      // Inject CSS custom properties from config
      const opacity = config.gateOverlayOpacity ?? readTokenNumber('--gate-overlay-opacity', 0.01);
      const transitionMs = config.gateOverlayTransitionMs ?? readTokenMs('--gate-overlay-transition-duration', 800);
      const transitionOutMs = config.gateOverlayTransitionOutMs ?? readTokenMs('--gate-overlay-transition-out-duration', 600);
      const contentDelayMs = config.gateOverlayContentDelayMs ?? readTokenMs('--gate-content-delay', 200);
      
      // Depth effect settings
      const depthScale = config.gateDepthScale ?? readTokenNumber('--gate-depth-scale', 0.96);
      const depthY = config.gateDepthTranslateY ?? readTokenPx('--gate-depth-translate-y', 8);
      
      // Logo opacity settings (fade when gate is active)
      const logoOpacityInactive = config.logoOpacityInactive ?? readTokenNumber('--logo-opacity-inactive', 1);
      const logoOpacityActive = config.logoOpacityActive ?? readTokenNumber('--logo-opacity-active-target', 0.2);
      
      // Logo blur settings (blur when gate is active)
      const logoBlurInactive = config.logoBlurInactive ?? readTokenPx('--logo-blur-inactive', 0);
      const logoBlurActive = config.logoBlurActive ?? readTokenPx('--logo-blur-active-target', 12);
      
      // Set depth variables on root so they are available to all scene elements
      const root = document.documentElement;
      root.style.setProperty('--gate-depth-scale', depthScale);
      root.style.setProperty('--gate-depth-translate-y', `${depthY}px`);
      root.style.setProperty('--gate-depth-duration', `${transitionMs}ms`);
      root.style.setProperty('--gate-depth-out-duration', `${transitionOutMs}ms`);
      root.style.setProperty('--gate-content-delay', `${contentDelayMs}ms`);
      
      // Set logo opacity variables
      root.style.setProperty('--logo-opacity-inactive', logoOpacityInactive);
      root.style.setProperty('--logo-opacity-active-target', logoOpacityActive); // Store target
      root.style.setProperty('--logo-opacity-active', logoOpacityInactive); // Start at inactive
      
      // Set logo blur variables
      root.style.setProperty('--logo-blur-inactive', `${logoBlurInactive}px`);
      root.style.setProperty('--logo-blur-active-target', `${logoBlurActive}px`); // Store target
      root.style.setProperty('--logo-blur-active', `${logoBlurInactive}px`); // Start at inactive
      
      // Blur is calculated as half of wall thickness (not from config)
      updateBlurFromWallThickness();
      
      overlayElement.style.setProperty('--gate-overlay-opacity', opacity);
      overlayElement.style.setProperty('--gate-overlay-transition-duration', `${transitionMs}ms`);
      overlayElement.style.setProperty('--gate-overlay-transition-out-duration', `${transitionOutMs}ms`);
      
      // Ensure initial state: not active, pointer-events: none
      overlayElement.classList.remove('active');
      overlayElement.setAttribute('aria-hidden', 'true');
      
      // Click on overlay dismisses active gate
      overlayElement.addEventListener('click', handleOverlayClick);
      
      // Listen for layout changes to update blur
      window.addEventListener('resize', updateBlurFromWallThickness);
      
      // Also listen for custom layout update events if they exist
      document.addEventListener('layout-updated', updateBlurFromWallThickness);
      
      const blurPx = getWallThickness() / 2;
      console.log(`Gate Overlay: Initialized (opacity: ${opacity}, blur: ${blurPx}px [auto from wall thickness], transition: ${transitionMs}ms, logo: opacity ${logoOpacityInactive}→${logoOpacityActive}, blur ${logoBlurInactive}px→${logoBlurActive}px)`);
  }

  /**
   * Handle click on overlay - dispatch dismiss event for gates to listen
   */
  function handleOverlayClick(e) {
      // Ignore clicks on interactive elements within gates (buttons, inputs, etc.)
      if (e.target.closest('button')) return;
      if (e.target.closest('input')) return;
      if (e.target.closest('a')) return;
      if (e.target.closest('select')) return;
      if (e.target.closest('textarea')) return;
      
      // Accept clicks on overlay OR gate containers (but not their interactive children)
      // This handles cases where gates are above overlay in z-index
      const isGateContainer = e.target.id === 'cv-gate' || 
                             e.target.id === 'portfolio-gate' || 
                             e.target.id === 'contact-gate' ||
                             e.target.classList.contains('gate-label') ||
                             e.target.classList.contains('gate-description');
      
      const isOverlaySurface = e.target === overlayElement || e.target?.id === 'gate-modal-host';
      if (isOverlaySurface || isGateContainer) {
          // Dispatch custom event with instant flag
          document.dispatchEvent(new CustomEvent('gate-overlay-dismiss', { detail: { instant: true } }));
      }
  }

  /**
   * Apply depth effect by setting CSS variables on root
   * All depth-affected elements include these variables in their transform chains
   * @param {boolean} active - Whether to apply the depth effect
   */
  function applyDepthEffect(active) {
      const root = document.documentElement;
      const scene = document.getElementById('abs-scene');
      
      if (active) {
          // Get depth values from existing CSS vars or use defaults
          const scale = getComputedStyle(root).getPropertyValue('--gate-depth-scale').trim() || '0.96';
          const ty = getComputedStyle(root).getPropertyValue('--gate-depth-translate-y').trim() || '8px';
          const logoOpacityActive = getComputedStyle(root).getPropertyValue('--logo-opacity-active-target').trim() 
                                   || root.style.getPropertyValue('--logo-opacity-active-target') 
                                   || '0.2';
          const logoBlurActive = getComputedStyle(root).getPropertyValue('--logo-blur-active-target').trim() 
                               || root.style.getPropertyValue('--logo-blur-active-target') 
                               || '12px';
          
          root.style.setProperty('--gate-depth-scale-active', scale);
          root.style.setProperty('--gate-depth-ty-active', ty);
          root.style.setProperty('--logo-opacity-active', logoOpacityActive);
          root.style.setProperty('--logo-blur-active', logoBlurActive);
          
          // Add class to scene wrapper for IN duration timing sync
          if (scene) scene.classList.add('gate-depth-active');
      } else {
          // Reset to identity (no effect)
          const logoOpacityInactive = getComputedStyle(root).getPropertyValue('--logo-opacity-inactive').trim() || '1';
          const logoBlurInactive = getComputedStyle(root).getPropertyValue('--logo-blur-inactive').trim() || '0px';
          
          root.style.setProperty('--gate-depth-scale-active', '1');
          root.style.setProperty('--gate-depth-ty-active', '0px');
          root.style.setProperty('--logo-opacity-active', logoOpacityInactive);
          root.style.setProperty('--logo-blur-active', logoBlurInactive);
          
          // Remove class from scene wrapper to use OUT duration timing
          if (scene) scene.classList.remove('gate-depth-active');
      }
  }

  /**
   * Show the overlay with smooth blur animation
   */
  function showOverlay() {
      if (!overlayElement || !isEnabled) return;
      
      // Ensure blur CSS variable is current
      updateBlurFromWallThickness();
      
      // Remove hidden state
      overlayElement.setAttribute('aria-hidden', 'false');
      
      // Add active class to trigger CSS transition
      overlayElement.classList.add('active');
      
      // Transform cursor to larger transparent circle
      const cursor = document.getElementById('custom-cursor');
      if (cursor) {
          // On mobile, don't force-show the custom cursor inside dialogs.
          // (It can appear as an odd floating circle while the keyboard opens.)
          let isMobileViewport = false;
          try {
              isMobileViewport = Boolean(window.matchMedia && window.matchMedia('(max-width: 600px)').matches);
          } catch (e) {}

          if (isMobileViewport) {
              cursor.classList.remove('gate-active');
              cursor.style.display = 'none';
          } else {
              cursor.classList.add('gate-active');
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
      if (!overlayElement || !isEnabled) return;
      
      // Remove active class to trigger CSS transition back to 0
      overlayElement.classList.remove('active');
      overlayElement.setAttribute('aria-hidden', 'true');
      
      // Restore normal cursor
      const cursor = document.getElementById('custom-cursor');
      if (cursor) cursor.classList.remove('gate-active');
      
      // Remove depth effect from scene
      applyDepthEffect(false);
  }

  /**
   * Check if overlay is currently active
   * @returns {boolean} True if overlay is visible
   */
  function isOverlayActive() {
      if (!overlayElement) return false;
      return overlayElement.classList.contains('active');
  }

  /**
   * Update overlay opacity value (for live control panel adjustment)
   */
  function updateOverlayOpacity(opacity) {
      if (!overlayElement) return;
      overlayElement.style.setProperty('--gate-overlay-opacity', opacity);
  }

  /**
   * Update overlay transition duration (for live control panel adjustment)
   */
  function updateOverlayTransition(transitionMs) {
      if (!overlayElement) return;
      overlayElement.style.setProperty('--gate-overlay-transition-duration', `${transitionMs}ms`);
      document.documentElement.style.setProperty('--gate-depth-duration', `${transitionMs}ms`);
  }

  /**
   * Update overlay transition-out duration (for live control panel adjustment)
   */
  function updateOverlayTransitionOut(transitionMs) {
      if (!overlayElement) return;
      overlayElement.style.setProperty('--gate-overlay-transition-out-duration', `${transitionMs}ms`);
      document.documentElement.style.setProperty('--gate-depth-out-duration', `${transitionMs}ms`);
  }

  /**
   * Update depth scale (for live control panel adjustment)
   */
  function updateGateDepthScale(scale) {
      document.documentElement.style.setProperty('--gate-depth-scale', scale);
  }

  /**
   * Update content delay (for live control panel adjustment)
   */
  function updateGateContentDelay(ms) {
      document.documentElement.style.setProperty('--gate-content-delay', `${ms}ms`);
  }


  /**
   * Update depth translate Y (for live control panel adjustment)
   */
  function updateGateDepthTranslateY(px) {
      document.documentElement.style.setProperty('--gate-depth-translate-y', `${px}px`);
  }

  /**
   * Update logo opacity when inactive (for live control panel adjustment)
   */
  function updateLogoOpacityInactive(opacity) {
      const root = document.documentElement;
      root.style.setProperty('--logo-opacity-inactive', opacity);
      // If gate is inactive, apply immediately
      if (!isOverlayActive()) {
          root.style.setProperty('--logo-opacity-active', opacity);
      }
  }

  /**
   * Update logo opacity when active (for live control panel adjustment)
   */
  function updateLogoOpacityActive(opacity) {
      const root = document.documentElement;
      // Store the target active opacity
      const storedOpacity = opacity;
      root.style.setProperty('--logo-opacity-active-target', storedOpacity);
      // If gate is active, apply immediately
      if (isOverlayActive()) {
          root.style.setProperty('--logo-opacity-active', storedOpacity);
      }
  }

  /**
   * Update logo blur when inactive (for live control panel adjustment)
   */
  function updateLogoBlurInactive(px) {
      const root = document.documentElement;
      root.style.setProperty('--logo-blur-inactive', `${px}px`);
      // If gate is inactive, apply immediately
      if (!isOverlayActive()) {
          root.style.setProperty('--logo-blur-active', `${px}px`);
      }
  }

  /**
   * Update logo blur when active (for live control panel adjustment)
   */
  function updateLogoBlurActive(px) {
      const root = document.documentElement;
      root.style.setProperty('--logo-blur-active-target', `${px}px`);
      // If gate is active, apply immediately
      if (isOverlayActive()) {
          root.style.setProperty('--logo-blur-active', `${px}px`);
      }
  }

  var gateOverlay = /*#__PURE__*/Object.freeze({
    __proto__: null,
    hideOverlay: hideOverlay,
    initGateOverlay: initGateOverlay,
    isOverlayActive: isOverlayActive,
    mountGateIntoOverlay: mountGateIntoOverlay,
    showOverlay: showOverlay,
    unmountGateFromOverlay: unmountGateFromOverlay,
    updateBlurFromWallThickness: updateBlurFromWallThickness,
    updateGateContentDelay: updateGateContentDelay,
    updateGateDepthScale: updateGateDepthScale,
    updateGateDepthTranslateY: updateGateDepthTranslateY,
    updateLogoBlurActive: updateLogoBlurActive,
    updateLogoBlurInactive: updateLogoBlurInactive,
    updateLogoOpacityActive: updateLogoOpacityActive,
    updateLogoOpacityInactive: updateLogoOpacityInactive,
    updateOverlayOpacity: updateOverlayOpacity,
    updateOverlayTransition: updateOverlayTransition,
    updateOverlayTransitionOut: updateOverlayTransitionOut
  });

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
  let enabled$1 = false;

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

  function prefersReducedMotion() {
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
    if (prefersReducedMotion()) return;

    enabled$1 = true;

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
    if (!enabled$1 || !el) return;

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
      if (!enabled$1 || !el) return;
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

  /**
   * Press-in only (used for pointer-down “real click” feel).
   * @param {number} strength 0..1
   * @param {{ armManual?: boolean }} opts
   */
  function sceneImpactPress(strength = 1, opts = {}) {
    if (!enabled$1 || !el) return;

    const g = getGlobals();
    if (g?.sceneImpactEnabled === false) return;

    const scheduleRelease = opts?.scheduleRelease !== false;
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

    // Smooth press-in: set duration then animate impact.
    // No hard reset - let in-flight transitions blend naturally.
    el.style.setProperty(CSS_VAR_IMPACT_DUR, `${Math.round(pressMs)}ms`);
    
    window.requestAnimationFrame(() => {
      if (!enabled$1 || !el) return;
      if (token !== impactToken) return;
      el.style.setProperty(CSS_VAR_IMPACT, String(s));
      el.style.setProperty(CSS_VAR_LOGO_SCALE, String(computeLogoScaleFromImpact(s, g)));
    });

    if (scheduleRelease) {
      releaseTimeoutId = window.setTimeout(() => {
        applySceneImpactRelease({ token, releaseMs });
      }, 0);

      cleanupTimeoutId = window.setTimeout(() => {
        cleanupTimeoutId = 0;
        if (!el) return;
        // Keep `.abs-scene--impact` to prevent transition swaps that can cause snapping.
        el.classList.remove('abs-scene--animating');
      }, Math.max(0, Math.round(releaseMs) + 80));
    }
  }

  /**
   * Release/bounce-out only (used for pointer-up “real click” feel).
   * @param {number} strength 0..1
   */
  function sceneImpactRelease(strength = 1) {
    if (!enabled$1 || !el) return;
    const g = getGlobals();
    if (g?.sceneImpactEnabled === false) return;
    const token = impactToken;
    const releaseMsBase = g?.sceneImpactReleaseMs ?? 220;
    // Timing skew (requested): return slower.
    const releaseMs = Math.max(1, Math.round((Number(releaseMsBase) || 0) * 1.2));
    // Release always returns smoothly to rest (no overshoot).
    return applySceneImpactRelease({ token, releaseMs });
  }

  function applySceneImpactRelease({ token, releaseMs }) {
    clearTimers();
    if (!enabled$1 || !el) return;
    if (token !== impactToken) return;

    el.style.setProperty(CSS_VAR_IMPACT_DUR, `${Math.round(releaseMs)}ms`);
    // Smooth return to rest (no bounce): animate impact back to 0.
    window.requestAnimationFrame(() => {
      if (!enabled$1 || !el) return;
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


  // Mouse velocity tracking for water ripples
  let lastMouseX = 0;
  let lastMouseY = 0;
  let lastMoveTime = 0;
  let mouseVelocity = 0;
  // Click/tap cycles through modes (value stored on globals; avoid caching so modes can override).
  let pressCycleActive = false;
  let pressCyclePointerId = null;
  // Touch drag detection: track start position and total movement to distinguish tap vs drag
  let pressCycleStartX = 0;
  let pressCycleStartY = 0;
  let pressCycleTotalMove = 0;
  const TAP_MOVE_THRESHOLD = 15; // px: movement below this is considered a tap, above is a drag
  let pressCycleDidPress = false;
  let mobilePulseTimeoutId = 0;

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
        mouseVelocity = Math.sqrt(dx * dx + dy * dy) / dt;
      }
      
      // Update custom cursor position only for mouse-like pointers
      if (isMouseLike) {
        updateCursorPosition(clientX, clientY);
      } else {
        // Ensure cursor is hidden for touch/pen inputs that aren't mouse-like
        hideCursor();
      }

      // Don't track simulation interactions if the user is over the panel UI.
      // EXCEPTION: Orbit modes should always follow the cursor, even when UI overlays intercept pointer events.
      const isOrbitMode = globals.currentMode === MODES.ORBIT_3D || globals.currentMode === MODES.ORBIT_3D_2;
      if (!isOrbitMode && isEventOnUI(target)) return;
      
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
        el.closest('textarea')
      );
    }

    function isMobileViewportNow() {
      // Prefer state flags (kept current by renderer.resize()).
      if (globals?.isMobile || globals?.isMobileViewport) return true;
      // Fallback for edge cases / devtools emulation.
      try {
        return Boolean(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
      } catch (e) {
        return false;
      }
    }

    function clearMobilePulseTimeout() {
      if (!mobilePulseTimeoutId) return;
      try { window.clearTimeout(mobilePulseTimeoutId); } catch (e) {}
      mobilePulseTimeoutId = 0;
    }

    function tryPressCycleStart(clientX, clientY, target, pointerId = null, pointerType = 'mouse') {
      if (pressCycleActive) return;
      if (isEventOnUI(target)) return;
      if (isTargetInteractive(target)) return;
      if (isOverlayActive()) return;
      if (!globals.clickCycleEnabled) return;

      const pos = getCanvasPosition(clientX, clientY);
      if (!pos.inBounds) return;

      pressCycleActive = true;
      pressCyclePointerId = pointerId;
      // Record start position for drag detection (touch only)
      pressCycleStartX = clientX;
      pressCycleStartY = clientY;
      pressCycleTotalMove = 0;
      pressCycleDidPress = false;

      // Desktop behavior: press-in immediately on down, hold until release.
      // Mobile behavior: do NOT press on down (scroll/drag should never push the scene).
      clearMobilePulseTimeout();
      if (!isMobileViewportNow()) {
        pressCycleDidPress = true;
        sceneImpactPress(1, { armManual: true, scheduleRelease: false });
      }
    }

    function tryPressCycleEnd(pointerId = null, pointerType = 'mouse') {
      if (!pressCycleActive) return;
      if (pressCyclePointerId !== null && pointerId !== null && pointerId !== pressCyclePointerId) return;
      const totalMove = pressCycleTotalMove;
      pressCycleActive = false;
      pressCyclePointerId = null;
      pressCycleTotalMove = 0;
      const didPress = pressCycleDidPress;
      pressCycleDidPress = false;
      
      // On touch devices: only cycle mode if it was a tap (minimal movement), not a drag
      const isTouch = pointerType === 'touch' || pointerType === 'pen';
      if (isTouch && totalMove > TAP_MOVE_THRESHOLD) {
        // It was a drag, not a tap - do not change modes.
        // If we were in a desktop press-hold path, ensure we release the scene.
        if (didPress) sceneImpactRelease(1);
        return;
      }

      // Mobile: click/tap triggers BOTH parts (press then return) in sequence.
      // Mode changes when the return begins.
      if (isMobileViewportNow()) {
        sceneImpactPress(1, { armManual: true, scheduleRelease: false });
        const pressMsBase = globals.sceneImpactPressMs ?? 75;
        const pressMs = Math.max(1, Math.round((Number(pressMsBase) || 0) * 0.8)); // must match scene-impact-react
        const holdMs = Math.round(Math.min(80, Math.max(0, (Number(pressMs) || 0) * 0.4)));
        clearMobilePulseTimeout();
        mobilePulseTimeoutId = window.setTimeout(() => {
          mobilePulseTimeoutId = 0;
          cycleMode();
          sceneImpactRelease(1);
        }, Math.max(0, Math.round(pressMs) + holdMs));
        return;
      }

      // Desktop: mode changes on release while the scene returns.
      cycleMode();
      sceneImpactRelease(1);
    }

    function tryPressCycleCancel(pointerId = null) {
      if (!pressCycleActive) return;
      if (pressCyclePointerId !== null && pointerId !== null && pointerId !== pressCyclePointerId) return;
      pressCycleActive = false;
      pressCyclePointerId = null;
      pressCycleTotalMove = 0;
      clearMobilePulseTimeout();
      if (pressCycleDidPress) sceneImpactRelease(1);
      pressCycleDidPress = false;
    }

    if (window.PointerEvent) {
      document.addEventListener('pointerdown', (e) => {
        tryPressCycleStart(e.clientX, e.clientY, e.target, e.pointerId, e.pointerType);
      }, { passive: true });

      document.addEventListener('pointermove', (e) => {
        // Track movement during active press cycle (for tap vs drag detection)
        if (pressCycleActive && pressCyclePointerId === e.pointerId) {
          const dx = e.clientX - pressCycleStartX;
          const dy = e.clientY - pressCycleStartY;
          pressCycleTotalMove = Math.max(pressCycleTotalMove, Math.hypot(dx, dy));
        }
      }, { passive: true });

      document.addEventListener('pointerup', (e) => {
        tryPressCycleEnd(e.pointerId, e.pointerType);
      }, { passive: true });

      document.addEventListener('pointercancel', (e) => {
        tryPressCycleCancel(e.pointerId);
      }, { passive: true });
    } else {
      // Fallbacks for older browsers without Pointer Events
      document.addEventListener('mousedown', (e) => {
        tryPressCycleStart(e.clientX, e.clientY, e.target, null, 'mouse');
      }, { passive: true });

      document.addEventListener('mouseup', () => {
        tryPressCycleEnd(null, 'mouse');
      }, { passive: true });
    }
    
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
     * Touch tap handler for mobile interactions
     * Water creates ripple on tap
     */
    document.addEventListener('touchstart', (e) => {
      // If Pointer Events are supported, touch is handled by pointerdown/up above.
      if (window.PointerEvent) return;
      // Ignore touches on panel
      if (isEventOnUI(e.target)) return;
      
      // Ignore touches when gates/overlay are active
      if (isOverlayActive()) return;
      
      // Explicitly hide cursor on touch start to prevent it getting stuck
      hideCursor();

      if (e.target.closest('a')) return;
      if (e.target.closest('button')) return;
      if (e.target.closest('input')) return;
      if (e.target.closest('select')) return;
      if (e.target.closest('textarea')) return;
      
      if (e.touches && e.touches[0]) {
        const touch = e.touches[0];
        const pos = getCanvasPosition(touch.clientX, touch.clientY);
        
        if (!pos.inBounds) return;

        if (globals.clickCycleEnabled) {
          pressCycleActive = true;
          pressCyclePointerId = null;
          // Record start position for drag detection
          pressCycleStartX = touch.clientX;
          pressCycleStartY = touch.clientY;
          pressCycleTotalMove = 0;
        }
      }
    }, { passive: true });

    // Track touch movement for tap vs drag detection (fallback for no PointerEvent)
    document.addEventListener('touchmove', (e) => {
      if (window.PointerEvent) return;
      if (pressCycleActive && e.touches && e.touches[0]) {
        const touch = e.touches[0];
        const dx = touch.clientX - pressCycleStartX;
        const dy = touch.clientY - pressCycleStartY;
        pressCycleTotalMove = Math.max(pressCycleTotalMove, Math.hypot(dx, dy));
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (window.PointerEvent) return;
      tryPressCycleEnd(null, 'touch');
    }, { passive: true });

    document.addEventListener('touchcancel', () => {
      if (window.PointerEvent) return;
      tryPressCycleCancel(null);
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
  // ║                      OVERSCROLL LOCK (iOS RUBBER-BAND FIX)                   ║
  // ║   Prevents page rubber-banding / scroll bounce while allowing internal       ║
  // ║   scrolling for UI containers (gates + panel).                               ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  /**
   * iOS Safari can still rubber-band even when body is overflow:hidden, especially
   * during touchmove gestures. This installs a capture-phase touchmove listener
   * (passive:false) that blocks scrolling unless the gesture originates inside a
   * whitelisted scroll container.
   *
   * IMPORTANT:
   * - We only preventDefault on touchmove, not touchstart, so taps/clicks still work.
   * - We allow scrolling only inside dedicated scroll containers (panel). Gates are NOT scrollable.
   */
  function setupOverscrollLock() {
    if (typeof document === 'undefined') return;

    const isAllowedScrollTarget = (target) => {
      if (!(target instanceof Element)) return false;

      // Allow scroll inside the panel content (dock + legacy panel)
      if (target.closest('.panel-dock .panel .panel-content')) return true;
      if (target.closest('#controlPanel')) return true;

      return false;
    };

    document.addEventListener('touchmove', (e) => {
      // If a scrollable UI wants the gesture, let it through.
      if (isAllowedScrollTarget(e.target)) return;

      // Otherwise: lock the page in place (no rubber-banding / bounce).
      // Note: must be passive:false for iOS.
      e.preventDefault();
    }, { passive: false, capture: true });
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
      '../public/js/contents-home.json',
      'config/text.json',
      'js/text.json',
      '../public/js/text.json',
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
      const contactGate = document.getElementById('contact-gate'); // Get contact gate to check/close if open
      const inputs = Array.from(document.querySelectorAll('.cv-digit'));
      const pageFlash = document.getElementById('page-flash');
      const gateLabel = document.getElementById('cv-gate-label');
      
      // Correct Code
      const CODE = '1111';
      
      if (!trigger || !logo || !gate || inputs.length === 0) {
          console.warn('CV Gate: Missing required elements');
          return;
      }
      
      const BACK_TEXT = getText('gates.common.backText', 'BACK');
      const BACK_ARIA = getText('gates.common.backAriaLabel', 'Back');
      const TITLE = getText('gates.cv.title', 'Bio/CV');
      const DESC = getText(
          'gates.cv.description',
          "Because spam bots don't deserve nice things—and neither do recruiters who don't read portfolios. This keeps my inbox slightly more civilized."
      );

      // Set label text if element exists
      if (gateLabel) {
          gateLabel.innerHTML = `
            <div class="gate-nav">
                <button type="button" class="gate-back abs-icon-btn" data-gate-back aria-label="${BACK_ARIA}">
                    <i class="ti ti-arrow-left" aria-hidden="true"></i>
                    <span>${BACK_TEXT}</span>
                </button>
            </div>
            <h2 class="gate-title">${TITLE}</h2>
            <p class="gate-description">${DESC}</p>
        `;
      }
      
      // Create page-flash element if it doesn't exist
      const flash = pageFlash || createPageFlash$1();

      // State
      let isOpen = false;

      // Helper to check if any gate is currently active
      const isAnyGateActive = () => {
          return (gate && gate.classList.contains('active')) ||
                 (portfolioGate && portfolioGate.classList.contains('active')) ||
                 (contactGate && contactGate.classList.contains('active'));
      };

      // --- Actions ---

      const openGate = (e) => {
          e?.preventDefault?.();
          
          // Check if any other gate is currently open
          const wasAnyGateActive = isAnyGateActive();
          
          // Close portfolio gate if it's open
          if (portfolioGate && portfolioGate.classList.contains('active')) {
              portfolioGate.classList.remove('active');
              portfolioGate.setAttribute('aria-hidden', 'true');
              setTimeout(() => {
                  portfolioGate.classList.add('hidden');
                  unmountGateFromOverlay(portfolioGate);
              }, 400);
          }

          // Close contact gate if it's open (keep gates mutually exclusive)
          if (contactGate && contactGate.classList.contains('active')) {
              contactGate.classList.remove('active');
              contactGate.setAttribute('aria-hidden', 'true');
              setTimeout(() => {
                  contactGate.classList.add('hidden');
                  unmountGateFromOverlay(contactGate);
              }, 400);
          }
          
          isOpen = true;
          
          // Show overlay only if no gate was previously active
          if (!wasAnyGateActive) {
              showOverlay();
          }
          
          // Animate Logo Out (Up)
          logo.classList.add('fade-out-up');

          // Modal: mount gate inside overlay flex container
          mountGateIntoOverlay(gate);

          // Animate Gate In (Up)
          gate.classList.remove('hidden');
          gate.setAttribute('aria-hidden', 'false');
          gate.classList.add('active');
          
          // Focus first input
          inputs[0].focus();
      };

      const closeGate = (instant = false) => {
          isOpen = false;
          
          // Clear inputs
          inputs.forEach(input => input.value = '');
          
          if (instant) {
              // Instant close: disable transition, remove active, then re-enable
              gate.style.transition = 'none';
              logo.style.transition = 'none';
              
          gate.classList.remove('active');
          gate.setAttribute('aria-hidden', 'true');
              gate.classList.add('hidden');
              unmountGateFromOverlay(gate);
              logo.classList.remove('fade-out-up');
              
              // Hide overlay immediately if no other gate is active
              if (!isAnyGateActive()) {
                  hideOverlay();
              }
              
              // Re-enable transitions after a frame
              requestAnimationFrame(() => {
                  gate.style.removeProperty('transition');
                  logo.style.removeProperty('transition');
              });
          } else {
              // Smooth close: use CSS transition
              gate.classList.remove('active');
              gate.setAttribute('aria-hidden', 'true');
          logo.classList.remove('fade-out-up');
          
          setTimeout(() => {
              if (!isOpen) {
                  gate.classList.add('hidden');
                  unmountGateFromOverlay(gate);
              }
              
                  // Hide overlay if no other gate is now active
                  if (!isAnyGateActive()) {
                      hideOverlay();
                  }
          }, 400); // Match transition time
          }
      };

      // Back button closes gate (matches new UI pattern)
      try {
          const backBtn = gateLabel?.querySelector?.('[data-gate-back]');
          if (backBtn) backBtn.addEventListener('click', closeGate);
      } catch (e) {}
      
      // Click on gate background (not on inputs) also closes instantly
      gate.addEventListener('click', (e) => {
          // Only close if clicking the gate container itself or non-interactive areas
          if (e.target === gate || e.target.classList.contains('gate-label') || 
              e.target.classList.contains('gate-description') || e.target.tagName === 'H2' ||
              e.target.tagName === 'P') {
              closeGate(true);
          }
      });

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

      // Auto-open check (e.g. navigated from portfolio page)
      try {
          if (sessionStorage.getItem('abs_open_cv_gate')) {
              sessionStorage.removeItem('abs_open_cv_gate');
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
      
      // Close when overlay is clicked (dismiss event from gate-overlay.js)
      document.addEventListener('gate-overlay-dismiss', (e) => {
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
      const gate = document.getElementById('portfolio-gate');
      // Brand logo is optional (some layouts remove it); gate should still function without it.
      const logo = document.getElementById('brand-logo');
      const cvGate = document.getElementById('cv-gate'); // Get CV gate to check/close if open
      const contactGate = document.getElementById('contact-gate'); // Get contact gate to check/close if open
      const inputs = Array.from(document.querySelectorAll('.portfolio-digit'));
      const pageFlash = document.getElementById('page-flash');
      const gateLabel = document.getElementById('portfolio-gate-label');
      
      // Correct Code
      const CODE = '1234';
      
      if (!trigger || !gate || inputs.length === 0) {
          console.warn('Portfolio Gate: Missing required elements');
          return;
      }
      
      const BACK_TEXT = getText('gates.common.backText', 'BACK');
      const BACK_ARIA = getText('gates.common.backAriaLabel', 'Back');
      const TITLE = getText('gates.portfolio.title', 'View Portfolio');
      const DESC = getText(
          'gates.portfolio.description',
          "Good work deserves good context. This small step ensures you're here with intention, not just browsing. Quality takes time—yours and mine."
      );

      // Set label text if element exists
      if (gateLabel) {
          gateLabel.innerHTML = `
            <div class="gate-nav">
                <button type="button" class="gate-back abs-icon-btn" data-gate-back aria-label="${BACK_ARIA}">
                    <i class="ti ti-arrow-left" aria-hidden="true"></i>
                    <span>${BACK_TEXT}</span>
                </button>
            </div>
            <h2 class="gate-title">${TITLE}</h2>
            <p class="gate-description">${DESC}</p>
        `;
      }
      
      // Create page-flash element if it doesn't exist
      const flash = pageFlash || createPageFlash();

      // State
      let isOpen = false;

      // Helper to check if any gate is currently active
      const isAnyGateActive = () => {
          return (gate && gate.classList.contains('active')) ||
                 (cvGate && cvGate.classList.contains('active')) ||
                 (contactGate && contactGate.classList.contains('active'));
      };

      // --- Actions ---

      const openGate = (e) => {
          if (e) e.preventDefault();
          
          // Check if any other gate is currently open
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
          const bundlePath = 'modules/portfolio/app.js'
              ;
          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.href = `${basePath}${bundlePath}`;
          document.head.appendChild(prefetchLink);
          
          const preloadImg = document.createElement('link');
          preloadImg.rel = 'preload';
          preloadImg.as = 'image';
          preloadImg.href = `${basePath}images/portfolio/pages/chapter-0-1.webp`;
          document.head.appendChild(preloadImg);
          
          // Close CV gate if it's open
          if (cvGate && cvGate.classList.contains('active')) {
              cvGate.classList.remove('active');
              cvGate.setAttribute('aria-hidden', 'true');
              setTimeout(() => {
                  cvGate.classList.add('hidden');
                  unmountGateFromOverlay(cvGate);
              }, 400);
          }

          // Close contact gate if it's open (keep gates mutually exclusive)
          if (contactGate && contactGate.classList.contains('active')) {
              contactGate.classList.remove('active');
              contactGate.setAttribute('aria-hidden', 'true');
              setTimeout(() => {
                  contactGate.classList.add('hidden');
                  unmountGateFromOverlay(contactGate);
              }, 400);
          }
          
          isOpen = true;
          
          // Show overlay only if no gate was previously active
          if (!wasAnyGateActive) {
              showOverlay();
          }
          
          // Animate Logo Out (Up)
          if (logo) logo.classList.add('fade-out-up');

          // Modal: mount gate inside overlay flex container
          mountGateIntoOverlay(gate);

          // Animate Gate In (Up)
          gate.classList.remove('hidden');
          gate.setAttribute('aria-hidden', 'false');
          gate.classList.add('active');
          
          // Focus first input
          inputs[0].focus();
      };

      const closeGate = (instant = false) => {
          isOpen = false;
          
          // Clear inputs
          inputs.forEach(input => input.value = '');
          
          if (instant) {
              // Instant close: disable transition, remove active, then re-enable
              gate.style.transition = 'none';
              if (logo) logo.style.transition = 'none';
              
          gate.classList.remove('active');
          gate.setAttribute('aria-hidden', 'true');
              gate.classList.add('hidden');
              unmountGateFromOverlay(gate);
              if (logo) logo.classList.remove('fade-out-up');
              
              // Hide overlay immediately if no other gate is active
              if (!isAnyGateActive()) {
                  hideOverlay();
              }
              
              // Re-enable transitions after a frame
              requestAnimationFrame(() => {
                  gate.style.removeProperty('transition');
                  if (logo) logo.style.removeProperty('transition');
              });
          } else {
              // Smooth close: use CSS transition
              gate.classList.remove('active');
              gate.setAttribute('aria-hidden', 'true');
          if (logo) logo.classList.remove('fade-out-up');
          
          setTimeout(() => {
              if (!isOpen) {
                  gate.classList.add('hidden');
                  unmountGateFromOverlay(gate);
              }
              
                  // Hide overlay if no other gate is now active
                  if (!isAnyGateActive()) {
                      hideOverlay();
                  }
          }, 400); // Match transition time
          }
      };

      // Back button closes gate (matches new UI pattern)
      try {
          const backBtn = gateLabel?.querySelector?.('[data-gate-back]');
          if (backBtn) backBtn.addEventListener('click', closeGate);
      } catch (e) {}
      
      // Click on gate background (not on inputs) also closes instantly
      gate.addEventListener('click', (e) => {
          // Only close if clicking the gate container itself or non-interactive areas
          if (e.target === gate || e.target.classList.contains('gate-label') || 
              e.target.classList.contains('gate-description') || e.target.tagName === 'H2' ||
              e.target.tagName === 'P') {
              closeGate(true);
          }
      });

      const checkCode = () => {
          const enteredCode = inputs.map(input => input.value).join('');
          
          if (enteredCode.length === 4) {
              if (enteredCode === CODE) {
                  // Success - Green flash, then redirect
                  triggerFlash(flash, 'success');
                  
                  // Set session token (soft gate)
                  sessionStorage.setItem('abs_portfolio_ok', Date.now());

                  setTimeout(() => {
                      // Update with actual portfolio URL when ready
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

      // Auto-open check (if redirected back from portfolio.html)
      if (sessionStorage.getItem('abs_open_portfolio_gate')) {
          sessionStorage.removeItem('abs_open_portfolio_gate');
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
      
      // Close when overlay is clicked (dismiss event from gate-overlay.js)
      document.addEventListener('gate-overlay-dismiss', (e) => {
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
  // ║                          CONTACT GATE CONTROLLER                             ║
  // ║                  Same transition as CV/Portfolio gates                        ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  //
  // Goals:
  // - Clicking "Contact" (and inline "Let's chat.") opens a gate overlay
  // - Gate uses the same logo ↔ gate swap transition as CV/Portfolio
  // - Email row copies the email to clipboard (no mailto)
  // - Gate includes a small BACK button (arrow + BACK) to close
  //
  // Privacy:
  // - No network calls
  // - No user text stored (clipboard copy is a single fixed string)


  const TRANSITION_MS = 400; // Must match gate transitions defined in main.css
  const COPY_FEEDBACK_MS = 1200;

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

  function initContactGate() {
    const CONTACT_EMAIL = getText('contact.email', 'alexander@beck.fyi');
    const BACK_TEXT = getText('gates.common.backText', 'BACK');
    const BACK_ARIA = getText('gates.common.backAriaLabel', 'Back');
    const TITLE = getText('gates.contact.title', 'Contact');
    const DESC = getText(
      'gates.contact.description',
      'For collaborations, product design work, AI prototyping, or anything that needs a crisp creative + technical brain.'
    );
    const COPY_ARIA = getText('contact.copy.buttonAriaLabel', 'Copy email address');
    const COPIED_TEXT = getText('contact.copy.statusCopied', 'Copied');
    const ERROR_TEXT = getText('contact.copy.statusError', 'Copy failed');

    const triggers = [
      document.getElementById('contact-email'),
      document.getElementById('contact-email-inline')
    ].filter(Boolean);

    const logo = document.getElementById('brand-logo');
    const gate = document.getElementById('contact-gate');
    const gateLabel = document.getElementById('contact-gate-label');
    const gateInputs = document.getElementById('contact-gate-inputs');

    const cvGate = document.getElementById('cv-gate');
    const portfolioGate = document.getElementById('portfolio-gate');

    if (!triggers.length || !logo || !gate || !gateLabel || !gateInputs) {
      console.warn('Contact Gate: Missing required elements');
      return;
    }

    // Match CV/Portfolio structure:
    // - gateLabel: back + title + description (fades in with slight delay)
    // - gateInputs: “field” row (arrives with the gate transition like the digit inputs)
    gateLabel.innerHTML = `
    <div class="gate-nav">
      <button type="button" class="gate-back abs-icon-btn" data-gate-back aria-label="${BACK_ARIA}">
        <i class="ti ti-arrow-left" aria-hidden="true"></i>
        <span>${BACK_TEXT}</span>
      </button>
    </div>
    <h2 class="gate-title">${TITLE}</h2>
    <p class="gate-description">
      ${DESC}
    </p>
  `;

    gateInputs.innerHTML = `
    <div class="contact-email-row" data-email-row>
      <button type="button" class="contact-email-value" data-copy-email aria-label="${COPY_ARIA}">
        <span class="contact-email-text">${CONTACT_EMAIL}</span>
      </button>
      <button type="button" class="contact-email-copy abs-icon-btn" data-copy-email-icon aria-label="${COPY_ARIA}">
        <i class="ti ti-copy" aria-hidden="true"></i>
      </button>
    </div>
    <div class="contact-copy-status" data-copy-status aria-live="polite"></div>
  `;

    const backBtn = gateLabel.querySelector('[data-gate-back]');
    const emailValueBtn = gateInputs.querySelector('[data-copy-email]');
    const emailCopyBtn = gateInputs.querySelector('[data-copy-email-icon]');
    const emailRow = gateInputs.querySelector('[data-email-row]');
    const statusEl = gateInputs.querySelector('[data-copy-status]');
    const iconI = gateInputs.querySelector('.contact-email-copy i');

    // State
    let isOpen = false;
    let copyTimer = null;

    // Helper to check if any gate is currently active
    const isAnyGateActive = () => {
      return (gate && gate.classList.contains('active')) ||
             (cvGate && cvGate.classList.contains('active')) ||
             (portfolioGate && portfolioGate.classList.contains('active'));
    };

    const setCopyUI = (state) => {
      if (!emailValueBtn || !emailCopyBtn || !statusEl) return;
      if (copyTimer) window.clearTimeout(copyTimer);

      if (state === 'copied') {
        emailRow?.classList?.add?.('is-copied');
        emailRow?.classList?.remove?.('is-error');
        statusEl.textContent = COPIED_TEXT;
        if (iconI) iconI.className = 'ti ti-check';
        copyTimer = window.setTimeout(() => setCopyUI('idle'), COPY_FEEDBACK_MS);
        return;
      }

      if (state === 'error') {
        emailRow?.classList?.add?.('is-error');
        emailRow?.classList?.remove?.('is-copied');
        statusEl.textContent = ERROR_TEXT;
        if (iconI) iconI.className = 'ti ti-alert-triangle';
        copyTimer = window.setTimeout(() => setCopyUI('idle'), COPY_FEEDBACK_MS);
        return;
      }

      // idle
      emailRow?.classList?.remove?.('is-copied', 'is-error');
      statusEl.textContent = '';
      if (iconI) iconI.className = 'ti ti-copy';
    };

    const openGate = (e) => {
      e?.preventDefault?.();

      // Check if any other gate is currently open
      const wasAnyGateActive = isAnyGateActive();

      // Close other gates if open (match existing behavior)
      if (cvGate && cvGate.classList.contains('active')) {
        cvGate.classList.remove('active');
        cvGate.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
          cvGate.classList.add('hidden');
          unmountGateFromOverlay(cvGate);
        }, TRANSITION_MS);
      }
      if (portfolioGate && portfolioGate.classList.contains('active')) {
        portfolioGate.classList.remove('active');
        portfolioGate.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
          portfolioGate.classList.add('hidden');
          unmountGateFromOverlay(portfolioGate);
        }, TRANSITION_MS);
      }

      isOpen = true;
      
      // Show overlay only if no gate was previously active
      if (!wasAnyGateActive) {
        showOverlay();
      }
      setCopyUI('idle');

      // Animate Logo Out (Up)
      logo.classList.add('fade-out-up');

      // Modal: mount gate inside overlay flex container
      mountGateIntoOverlay(gate);

      // Animate Gate In (Up)
      gate.classList.remove('hidden');
      gate.setAttribute('aria-hidden', 'false');
      gate.classList.add('active');

      // Focus email button for keyboard users
      emailValueBtn?.focus?.();
    };

    const closeGate = (instant = false) => {
      isOpen = false;
      setCopyUI('idle');

      if (instant) {
        // Instant close: disable transition, remove active, then re-enable
        gate.style.transition = 'none';
        logo.style.transition = 'none';

      gate.classList.remove('active');
      gate.setAttribute('aria-hidden', 'true');
        gate.classList.add('hidden');
        unmountGateFromOverlay(gate);
        logo.classList.remove('fade-out-up');
        
        // Hide overlay immediately if no other gate is active
        if (!isAnyGateActive()) {
          hideOverlay();
        }
        
        // Re-enable transitions after a frame
        requestAnimationFrame(() => {
          gate.style.removeProperty('transition');
          logo.style.removeProperty('transition');
        });
      } else {
        // Smooth close: use CSS transition
        gate.classList.remove('active');
        gate.setAttribute('aria-hidden', 'true');
      logo.classList.remove('fade-out-up');

      setTimeout(() => {
        if (!isOpen) {
          gate.classList.add('hidden');
          unmountGateFromOverlay(gate);
        }
        
          // Hide overlay if no other gate is now active
          if (!isAnyGateActive()) {
            hideOverlay();
          }
      }, TRANSITION_MS);
      }
    };

    // Triggers
    // Capture phase so we win against any legacy exported interactions on these links.
    triggers.forEach((t) => t.addEventListener('click', openGate, { capture: true }));
    backBtn?.addEventListener('click', closeGate);
    
    // Click on gate background (not on buttons) also closes instantly
    gate.addEventListener('click', (e) => {
      // Only close if clicking the gate container itself or non-interactive areas
      if (e.target === gate || e.target.classList.contains('gate-label') || 
          e.target.classList.contains('gate-description') || e.target.tagName === 'H2' ||
          e.target.tagName === 'P') {
        closeGate(true);
      }
    });

    // Copy interaction
    const onCopy = async (e) => {
      const ok = await copyToClipboard(CONTACT_EMAIL);
      setCopyUI(ok ? 'copied' : 'error');
    };
    emailValueBtn?.addEventListener('click', onCopy);
    emailCopyBtn?.addEventListener('click', onCopy);

    // Escape closes (consistent with other gates)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) closeGate();
    });
    
    // Close when overlay is clicked (dismiss event from gate-overlay.js)
    document.addEventListener('gate-overlay-dismiss', (e) => {
      if (isOpen) {
        const instant = e.detail?.instant || false;
        closeGate(instant);
      }
    });

    // Allow other pages (e.g. portfolio) to route via index and auto-open Contact gate.
    try {
      if (sessionStorage.getItem('abs_open_contact_gate')) {
        sessionStorage.removeItem('abs_open_contact_gate');
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
        if (s) updateButtonState(!!(s.isUnlocked && s.isEnabled));
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
        updateButtonState(true);
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
  // ║                        EXPERTISE LEGEND COLORS                               ║
  // ║     Assign discipline dots based on ball palette distribution + story        ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  /**
   * Legend colors are driven by `globals.colorDistribution`:
   * - Each label picks a palette index (0..7), rendered as `bg-ball-(index+1)`.
   * - The same source of truth is used by `pickRandomColor()` for ALL mode spawns.
   */

  function normalizeLabel(s) {
    return String(s || '').trim().toLowerCase();
  }

  function clampInt(v, min, max, fallback = min) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    const i = Math.floor(n);
    return i < min ? min : i > max ? max : i;
  }

  function resolveClassForLegendLabel(labelText) {
    const g = getGlobals();
    const target = normalizeLabel(labelText);
    const dist = Array.isArray(g.colorDistribution) ? g.colorDistribution : null;
    if (!dist) return null;
    for (let i = 0; i < dist.length; i++) {
      const row = dist[i];
      if (normalizeLabel(row?.label) !== target) continue;
      const idx = clampInt(row?.colorIndex, 0, 7, 0);
      return `bg-ball-${idx + 1}`;
    }
    return null;
  }

  function applyExpertiseLegendColors() {
    const legend = document.getElementById('expertise-legend');
    if (!legend) return;

    const items = Array.from(legend.querySelectorAll('.legend__item'));
    for (const item of items) {
      const labelEl = item.querySelector('span');
      const circle = item.querySelector('.circle');
      if (!labelEl || !circle) continue;

      const label = normalizeLabel(labelEl.textContent);
      const cls = resolveClassForLegendLabel(label);
      if (!cls) continue;

      // Remove any previous bg-ball-* classes so we can reassign cleanly.
      for (const c of Array.from(circle.classList)) {
        if (c.startsWith('bg-ball-') || c.startsWith('bg-story-')) circle.classList.remove(c);
      }
      circle.classList.add(cls);
    }
  }

  var legendColors = /*#__PURE__*/Object.freeze({
    __proto__: null,
    applyExpertiseLegendColors: applyExpertiseLegendColors
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                     LINK HOVER — CURSOR "HOP" EFFECT                        ║
  // ║  Two-mode hover subsystem (index overlay vs portfolio/dialog UI)             ║
  // ║  - Index overlay: subtle pill background + WCAG-safe illuminated text + dot  ║
  // ║  - UI overlay: cursor color becomes background only; label shifts slightly   ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  let isInitialized = false;
  let activeLink = null;
  let rafPending = false;

  const HOVER_CLASS = 'abs-link-hovering';
  const MODE_INDEX_CLASS = 'abs-hover-mode-index';
  const MODE_UI_CLASS = 'abs-hover-mode-ui';
  const DOT_SIZE_VAR = '--abs-cursor-hop-dot-size'; // legacy (kept for compatibility)
  const PULSE_CLASS = 'abs-cursor-pulse'; // legacy marker (kept)
  const DEFAULT_PULSE_MS = 520;
  const PULSE_RING_CLASS = 'abs-hover-pulse-ring';

  const TARGET_BASE_CLASS = 'abs-hover-target';
  const TARGET_INDEX_CLASS = 'abs-hover-target--index';
  const TARGET_UI_CLASS = 'abs-hover-target--ui';

  const INDEX_BG_VAR = '--abs-hover-index-bg';
  const INDEX_FG_VAR = '--abs-hover-index-fg';

  function parseNum(value) {
    const n = Number.parseFloat(String(value || '').trim());
    return Number.isFinite(n) ? n : 0;
  }

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function parseHexChannel(hex) {
    const n = Number.parseInt(hex, 16);
    return Number.isFinite(n) ? n : 0;
  }

  function parseCssColorToRgb(color) {
    const s = String(color || '').trim();
    if (!s) return null;

    // #rgb / #rrggbb
    if (s[0] === '#') {
      const h = s.slice(1).trim();
      if (h.length === 3) {
        const r = parseHexChannel(h[0] + h[0]);
        const g = parseHexChannel(h[1] + h[1]);
        const b = parseHexChannel(h[2] + h[2]);
        return { r, g, b };
      }
      if (h.length === 6) {
        const r = parseHexChannel(h.slice(0, 2));
        const g = parseHexChannel(h.slice(2, 4));
        const b = parseHexChannel(h.slice(4, 6));
        return { r, g, b };
      }
      return null;
    }

    // rgb()/rgba()
    const m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const parts = m[1].split(',').map((p) => parseNum(p));
      if (parts.length >= 3) {
        const r = Math.round(parts[0]);
        const g = Math.round(parts[1]);
        const b = Math.round(parts[2]);
        return { r, g, b };
      }
    }

    return null;
  }

  function srgbToLinear(c255) {
    const c = clamp01(c255 / 255);
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance({ r, g, b }) {
    const R = srgbToLinear(r);
    const G = srgbToLinear(g);
    const B = srgbToLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  function contrastRatio(a, b) {
    const L1 = relativeLuminance(a);
    const L2 = relativeLuminance(b);
    const hi = Math.max(L1, L2);
    const lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }

  function mixRgb(a, b, t) {
    const tt = clamp01(t);
    return {
      r: Math.round(a.r + (b.r - a.r) * tt),
      g: Math.round(a.g + (b.g - a.g) * tt),
      b: Math.round(a.b + (b.b - a.b) * tt),
    };
  }

  function rgbToCss({ r, g, b }) {
    return `rgb(${r} ${g} ${b})`;
  }

  function rgbaToCss({ r, g, b }, a) {
    const aa = clamp01(a);
    return `rgb(${r} ${g} ${b} / ${aa})`;
  }

  function getCursorRenderedSizePx() {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return 0;

    // Get the base cursor size (before any transforms)
    const cs = window.getComputedStyle(cursor);
    const base = Math.max(parseNum(cs.width), parseNum(cs.height));
    if (!(base > 0)) return 0;

    // Return the dot size (cursor dot is scaled to 0.25 in simulation mode)
    // This matches the DOT_SCALE factor from cursor.js: 'translate(-50%, -50%) scale(0.25)'
    const DOT_SCALE_FACTOR = 0.25;
    return base * DOT_SCALE_FACTOR;
  }

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

    // Portfolio carousel cards are `div[role="button"].slide` (drag surface).
    // We intentionally exclude them from cursor-hover so hover doesn’t add noise
    // while the user is browsing/dragging the wheel.
    try {
      if (el.classList?.contains?.('slide')) return null;
      if (el.closest?.('.slide')) return null;
    } catch (e) {}

    return el;
  }

  function clearLinkVars(link) {
    try {
      link?.style?.removeProperty?.(DOT_SIZE_VAR);
      link?.style?.removeProperty?.(INDEX_BG_VAR);
      link?.style?.removeProperty?.(INDEX_FG_VAR);
    } catch (e) {}
  }

  function applyLinkVars(link) {
    const sizePx = getCursorRenderedSizePx();
    if (!(sizePx > 0)) {
      clearLinkVars(link);
      return;
    }
    try {
      // Legacy dot variable (previous behavior). We keep it so older CSS doesn't break.
      link.style.setProperty(DOT_SIZE_VAR, `${sizePx}px`);
    } catch (e) {}
  }

  function isGateOverlayActive() {
    try {
      const overlay = document.getElementById('gate-overlay');
      if (!overlay) return false;
      return overlay.classList.contains('active') || overlay.getAttribute('aria-hidden') === 'false';
    } catch (e) {
      return false;
    }
  }

  function detectHoverMode(link) {
    try {
      if (document.body.classList.contains('portfolio-page')) return 'ui';
      if (document.body.classList.contains('detail-open')) return 'ui';
    } catch (e) {}

    if (isGateOverlayActive()) return 'ui';

    try {
      if (link?.closest?.('.project-detail')) return 'ui';
      if (link?.closest?.('#gate-overlay')) return 'ui';
      if (link?.closest?.('.gate-modal-host')) return 'ui';
      if (link?.closest?.('#cv-gate') || link?.closest?.('#portfolio-gate') || link?.closest?.('#contact-gate')) return 'ui';
    } catch (e) {}

    return 'index';
  }

  function getCursorColorRgb() {
    try {
      const cs = getComputedStyle(document.documentElement);
      const raw = cs.getPropertyValue('--cursor-color').trim();
      const parsed = parseCssColorToRgb(raw);
      if (parsed) return parsed;
    } catch (e) {}
    return null;
  }

  function getBaseBackgroundRgb() {
    // Prefer the actual inner surface element if present.
    const candidates = [
      document.querySelector('.wall-frame'),
      document.getElementById('bravia-balls'),
      document.getElementById('fade-content'),
      document.body,
      document.documentElement,
    ].filter(Boolean);

    for (const el of candidates) {
      try {
        const bg = getComputedStyle(el).backgroundColor;
        const parsed = parseCssColorToRgb(bg);
        if (!parsed) continue;
        // Skip transparent/near-transparent (we don't parse alpha; treat "rgb(...)" as opaque).
        if (parsed.r === 0 && parsed.g === 0 && parsed.b === 0 && bg.includes('rgba') && /,\s*0(\.0+)?\s*\)/.test(bg)) continue;
        return parsed;
      } catch (e) {}
    }

    return { r: 245, g: 245, b: 245 };
  }

  function pickAccessibleIlluminatedText(cursorRgb, bgEffectiveRgb, preferDirection = null) {
    // WCAG 2.2 AA target for normal text.
    const target = 4.5;

    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };

    // Two directions: brighten toward white and deepen toward black.
    const tryDirection = (toward) => {
      let best = null;
      for (let i = 0; i <= 20; i += 1) {
        const t = i / 20;
        const cand = mixRgb(cursorRgb, toward, t);
        const cr = contrastRatio(cand, bgEffectiveRgb);
        if (cr >= target) {
          best = { rgb: cand, t, cr };
          break;
        }
      }
      return best;
    };

    const towardWhite = tryDirection(white);
    const towardBlack = tryDirection(black);

    if (towardWhite && towardBlack) {
      // For light backgrounds we want an "activated" label that reads as a DARK, intense
      // version of the cursor color (not a faint pastel). Prefer the black direction.
      if (preferDirection === 'black') return towardBlack.rgb;
      if (preferDirection === 'white') return towardWhite.rgb;
      // Default: prefer smallest adjustment (keeps hue closer to cursor color).
      return towardWhite.t <= towardBlack.t ? towardWhite.rgb : towardBlack.rgb;
    }
    if (towardWhite) return towardWhite.rgb;
    if (towardBlack) return towardBlack.rgb;

    // Fallback: choose higher contrast between raw cursor and white/black.
    const rawCr = contrastRatio(cursorRgb, bgEffectiveRgb);
    const whiteCr = contrastRatio(white, bgEffectiveRgb);
    const blackCr = contrastRatio(black, bgEffectiveRgb);
    if (rawCr >= target) return cursorRgb;
    return whiteCr >= blackCr ? white : black;
  }

  function setBodyMode(mode) {
    try {
      document.body.classList.toggle(MODE_INDEX_CLASS, mode === 'index');
      document.body.classList.toggle(MODE_UI_CLASS, mode === 'ui');
    } catch (e) {}
  }

  function activate(link) {
    if (!link) return;

    // When moving between links, remove the variable from the old one.
    if (activeLink && activeLink !== link) clearLinkVars(activeLink);
    activeLink = link;
    const mode = detectHoverMode(activeLink);
    setBodyMode(mode);

    try {
      activeLink.classList.add(TARGET_BASE_CLASS);
      activeLink.classList.toggle(TARGET_INDEX_CLASS, mode === 'index');
      activeLink.classList.toggle(TARGET_UI_CLASS, mode === 'ui');
    } catch (e) {}

    applyLinkVars(activeLink);
    try {
      activeLink.getBoundingClientRect?.() || null;
    } catch (e) {
    }

    // Index mode: compute accessible illuminated text + subtle cursor-tint background.
    if (mode === 'index') {
      const cursorRgb = getCursorColorRgb();
      const baseBg = getBaseBackgroundRgb();
      if (cursorRgb) {
        const bgAlpha = 0.12;
        const bgEffective = mixRgb(baseBg, cursorRgb, bgAlpha);
        // Choose a direction that matches the UI intent:
        // - light background → darker "activated" label (intense)
        // - dark background  → lighter "activated" label
        const prefer = (relativeLuminance(bgEffective) > 0.45) ? 'black' : 'white';
        const fg = pickAccessibleIlluminatedText(cursorRgb, bgEffective, prefer);
        try {
          activeLink.style.setProperty(INDEX_BG_VAR, rgbaToCss(cursorRgb, bgAlpha));
          activeLink.style.setProperty(INDEX_FG_VAR, rgbToCss(fg));
        } catch (e) {}
      } else {
        clearLinkVars(activeLink);
      }
    } else {
      // UI mode: background-only; keep label adjustments in CSS (theme-aware).
      try {
        activeLink.style.removeProperty(INDEX_BG_VAR);
        activeLink.style.removeProperty(INDEX_FG_VAR);
      } catch (e) {}
    }

    try {
      document.body.classList.add(HOVER_CLASS);
    } catch (e) {}
  }

  function deactivate() {
    try {
      document.body.classList.remove(HOVER_CLASS);
    } catch (e) {}
    if (activeLink) {
      try {
        activeLink.classList.remove(TARGET_BASE_CLASS);
        activeLink.classList.remove(TARGET_INDEX_CLASS);
        activeLink.classList.remove(TARGET_UI_CLASS);
        activeLink.classList.remove(PULSE_CLASS);
        activeLink.querySelectorAll?.(`.${PULSE_RING_CLASS}`)?.forEach?.((n) => n.remove());
      } catch (e) {}
      clearLinkVars(activeLink);
    }
    activeLink = null;
    try {
      document.body.classList.remove(MODE_INDEX_CLASS);
      document.body.classList.remove(MODE_UI_CLASS);
    } catch (e) {}
  }

  function scheduleSync() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (!activeLink) return;
      applyLinkVars(activeLink);
    });
  }

  function onPointerOver(e) {
    const link = getNearestAction(e.target);
    if (!link) return;
    if (isEventOnPanelUI(link)) return;
    activate(link);
  }

  function onPointerOut(e) {
    const link = getNearestAction(e.target);
    if (!link || link !== activeLink) return;

    const to = e.relatedTarget;
    if (to && link.contains(to)) return; // still within the same link subtree

    deactivate();
  }

  function onPointerMove(e) {
    if (!activeLink) return;
    scheduleSync();
  }

  function emitPulseRing(link, mode) {
    if (!link) return;
    try {
      const ring = document.createElement('span');
      ring.className = PULSE_RING_CLASS;
      ring.setAttribute('aria-hidden', 'true');

      const cursor = getCursorColorRgb();
      const alpha = mode === 'index' ? 0.22 : 0.18;
      const color = cursor ? rgbaToCss(cursor, alpha) : `rgb(var(--abs-rgb-black) / ${alpha})`;

      ring.style.setProperty('--abs-pulse-color', color);
      ring.style.setProperty('--abs-pulse-ms', `${Math.max(0, DEFAULT_PULSE_MS)}ms`);
      ring.style.setProperty('--abs-pulse-size', `var(${DOT_SIZE_VAR}, 24px)`);
      ring.style.setProperty('--abs-pulse-mode', mode);

      link.appendChild(ring);
      const remove = () => {
        try { ring.remove(); } catch (e) {}
      };
      ring.addEventListener('animationend', remove, { once: true });
      window.setTimeout(remove, DEFAULT_PULSE_MS + 120);
    } catch (e) {}
  }

  function onPointerDown(e) {
    const link = getNearestAction(e.target);
    if (!link) return;
    if (isEventOnPanelUI(link)) return;

    // Only pulse on the currently active target (ensures the pulse originates from the hover state).
    if (activeLink && link !== activeLink) return;
    if (!activeLink) return;
    scheduleSync();

    // Pulse: create a transient ring element (avoids pseudo-element conflicts with dot-under-label).
    const mode = detectHoverMode(activeLink);
    emitPulseRing(activeLink, mode);
  }

  function initLinkCursorHop() {
    if (isInitialized) return;
    isInitialized = true;

    // Ensure a clean baseline in case of hot reload.
    deactivate();

    // Pointer events (preferred)
    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, true);

    // Mouse fallback (older browsers)
    if (!window.PointerEvent) {
      document.addEventListener('mouseover', onPointerOver, true);
      document.addEventListener('mouseout', onPointerOut, true);
      document.addEventListener('mousemove', onPointerMove, { passive: true });
      document.addEventListener('mousedown', onPointerDown, true);
    }

    window.addEventListener('blur', deactivate, { passive: true });
    window.addEventListener(
      'mouseout',
      (event) => {
        if (!event.relatedTarget && !event.toElement) deactivate();
      },
      { passive: true }
    );

    // Keep hover geometry correct if layout shifts while hovering.
    window.addEventListener('resize', () => {
      if (!activeLink) return;
      try {
        activeLink.getBoundingClientRect?.() || null;
      } catch (e) {
      }
      scheduleSync();
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (!activeLink) return;
      try {
        activeLink.getBoundingClientRect?.() || null;
      } catch (e) {
      }
      scheduleSync();
    }, { passive: true, capture: true });
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                         SCENE CHANGE SOUND (SFX)                             ║
  // ║      Soft “pebble-like” tick on simulation change (bb:modeChanged event)     ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let enabled = false;

  function initSceneChangeSFX() {
    if (typeof window === 'undefined') return;
    if (enabled) return;
    enabled = true;

    window.addEventListener('bb:modeChanged', (e) => {
      const g = getGlobals();
      if (g?.sceneChangeSoundEnabled === false) return;

      const detail = e?.detail || {};
      const didChange = detail.prevMode && detail.mode && detail.prevMode !== detail.mode;
      if (!didChange) return;

      // “Pebble-like” = small radius, moderate intensity, centered pan.
      const radius = Number(g?.sceneChangeSoundRadius ?? 18);
      const intensity = Number(g?.sceneChangeSoundIntensity ?? 0.35);
      playCollisionSound(radius, intensity, 0.5, null);
    }, { passive: true });
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
    setText(document.getElementById('edge-chapter-text'), getText('edge.chapterText', ''));
    const copyEl = document.querySelector('.edge-copyright__text');
    setText(copyEl, getText('edge.copyright', ''));
  }

  function applyLegend() {
    const nav = document.getElementById('expertise-legend');
    setAttr(nav, 'aria-label', getText('legend.ariaLabel', ''));

    const items = getText('legend.items', null);
    if (!Array.isArray(items) || !nav) return;

    const labelSpans = nav.querySelectorAll('.legend__item span');
    for (let i = 0; i < labelSpans.length && i < items.length; i++) {
      const label = items?.[i]?.label;
      if (label) labelSpans[i].textContent = label;
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
    const nav = document.getElementById('footer-links-container');
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

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      BOUNCY BALLS – MAIN ENTRY (COMPLETE)                    ║
  // ║                       Modular Architecture Bootstrap                         ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function pickStartupMode() {
    // Narrative opening: start with Ball Pit.
    return MODES.PIT;
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
    // Back-compat export: this project previously applied only frame padding here.
    // Layout is now vw-native in config/state, with px derived and stamped centrally.
    applyLayoutCSSVars();
  }

  /**
   * Apply visual CSS variables (noise opacity/size, walls) from config to :root
   */
  function applyVisualCSSVars(config) {
    const root = document.documentElement;
    
    // NOTE: Layout CSS vars (frame/padding/radius/thickness) are applied via
    // `applyLayoutCSSVars()` from state (vw-native → px derived).

    // Brand logo sizing (shared token; driven by runtime config + dev panel slider).
    if (config.topLogoWidthVw !== undefined) {
      root.style.setProperty('--top-logo-width-vw', String(config.topLogoWidthVw));
    }

    // Container inner shadow removed
    
    // Noise texture sizing
    if (config.noiseSizeBase !== undefined) {
      root.style.setProperty('--noise-size-base', `${config.noiseSizeBase}px`);
    }
    if (config.noiseSizeTop !== undefined) {
      root.style.setProperty('--noise-size-top', `${config.noiseSizeTop}px`);
    }
    
    // Noise opacity (light mode)
    if (config.noiseBackOpacity !== undefined) {
      // Keep both legacy + current variable names for compatibility.
      root.style.setProperty('--noise-back-opacity', String(config.noiseBackOpacity));
      root.style.setProperty('--noise-back-opacity-light', String(config.noiseBackOpacity));
    }
    if (config.noiseFrontOpacity !== undefined) {
      root.style.setProperty('--noise-front-opacity', String(config.noiseFrontOpacity));
      root.style.setProperty('--noise-front-opacity-light', String(config.noiseFrontOpacity));
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
   * Ensure .noise-2 and .noise-3 elements exist (for dev environments where the full exported HTML isn't present).
   * Creates them as siblings to .noise inside the #bravia-balls container.
   */
  function ensureNoiseElements() {
    // Check if we have a noise texture image to use
    const existingNoise = document.querySelector('.noise');
    if (!existingNoise) {
      // No noise system present (minimal dev markup) - skip
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
  // We avoid editing exported HTML directly by enhancing at runtime.
  function enhanceFooterLinksForMobile() {
    try {
      const cv = document.getElementById('cv-gate-trigger');
      if (cv && !cv.querySelector('.footer-link-nowrap')) {
        const expected = String(getText('footer.links.cv.text', '') || '').trim();
        const raw = (cv.textContent || '').trim().replace(/\s+/g, ' ');
        const txt = expected || raw;
        // Keep short compound labels together on mobile (e.g. "Bio/CV").
        if (txt && txt.includes('/') && raw === txt) {
          cv.innerHTML = `<span class="footer-link-nowrap">${txt}</span>`;
        }
      }
    } catch (e) {}
  }

  (async function init() {
    // Mark JS as enabled (for CSS fallback detection)
    document.documentElement.classList.add('js-enabled');

    // TEXT (SOURCE OF TRUTH):
    // Load and apply all copy BEFORE fade-in so there is no visible “pop-in”.
    try {
      await loadRuntimeText();
      applyRuntimeTextToDOM();
    } catch (e) {}

    // Console banner will be printed after colors are initialized (see below)
    
    // DEV-only: wire control registry to use CSS vars function (avoids circular dependency).
    // In production we ship no config panel, so the registry is not loaded.
    {
      try {
        const mod = await Promise.resolve().then(function () { return controlRegistry; });
        mod.setApplyVisualCSSVars?.(applyVisualCSSVars);
      } catch (e) {}
    }
    
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
      
      // Apply vw-native layout (frame/padding/radius) as derived px CSS vars.
      applyLayoutCSSVars();
      log('✓ Layout applied');
      
      // Apply visual CSS vars (noise, inner shadow) from config
      applyVisualCSSVars(config);
      log('✓ Visual effects configured');

      // Apply config-driven UI CSS vars that aren't part of layout/colors stamping.
      // (Production ships without the panel, so config must fully drive these.)
      try {
        const g = getGlobals();
        const root = document.documentElement;
        if (Number.isFinite(g?.topLogoWidthVw)) {
          root.style.setProperty('--top-logo-width-vw', String(g.topLogoWidthVw));
        }
        if (Number.isFinite(g?.homeMainLinksBelowLogoPx)) {
          root.style.setProperty('--home-main-links-below-logo-px', String(g.homeMainLinksBelowLogoPx));
        }
        if (Number.isFinite(g?.footerNavBarTopVh)) {
          root.style.setProperty('--footer-nav-bar-top', `${g.footerNavBarTopVh}vh`);
          root.style.setProperty('--footer-nav-bar-top-svh', `${g.footerNavBarTopVh}svh`);
          root.style.setProperty('--footer-nav-bar-top-dvh', `${g.footerNavBarTopVh}dvh`);
        }
        if (Number.isFinite(g?.footerNavBarGapVw)) {
          /* Convert vw to clamp() pattern: min scales with vw, max = min * 1.67 (matching --gap-xl ratio) */
          const minPx = Math.round(g.footerNavBarGapVw * 9.6); // ~24px at 2.5vw base
          const maxPx = Math.round(minPx * 1.67); // ~40px at 2.5vw base (maintains ratio)
          root.style.setProperty('--footer-nav-bar-gap', `clamp(${minPx}px, ${g.footerNavBarGapVw}vw, ${maxPx}px)`);
        }
        if (Number.isFinite(g?.uiHitAreaMul)) {
          root.style.setProperty('--ui-hit-area-mul', String(g.uiHitAreaMul));
        }
        if (Number.isFinite(g?.uiIconCornerRadiusMul)) {
          root.style.setProperty('--ui-icon-corner-radius-mul', String(g.uiIconCornerRadiusMul));
        }
        // Unified icon button geometry: frame size + glyph size (px)
        // 0 = use token-derived defaults (do not override CSS).
        if (Number.isFinite(g?.uiIconFramePx) && Math.round(g.uiIconFramePx) > 0) {
          root.style.setProperty('--ui-icon-frame-size', `${Math.round(g.uiIconFramePx)}px`);
        }
        if (Number.isFinite(g?.uiIconGlyphPx) && Math.round(g.uiIconGlyphPx) > 0) {
          root.style.setProperty('--ui-icon-glyph-size', `${Math.round(g.uiIconGlyphPx)}px`);
        }
        if (Number.isFinite(g?.linkTextPadding)) {
          root.style.setProperty('--link-text-padding', `${Math.round(g.linkTextPadding)}px`);
          root.style.setProperty('--link-text-margin', `${-Math.round(g.linkTextPadding)}px`);
        }
        if (Number.isFinite(g?.linkIconPadding)) {
          root.style.setProperty('--link-icon-padding', `${Math.round(g.linkIconPadding)}px`);
          root.style.setProperty('--link-icon-margin', `${-Math.round(g.linkIconPadding)}px`);
        }
        if (Number.isFinite(g?.linkColorInfluence)) {
          root.style.setProperty('--link-color-influence', String(g.linkColorInfluence));
        }
        if (Number.isFinite(g?.linkImpactScale)) {
          root.style.setProperty('--link-impact-scale', String(g.linkImpactScale));
        }
        if (Number.isFinite(g?.linkImpactBlur)) {
          root.style.setProperty('--link-impact-blur', `${g.linkImpactBlur}px`);
        }
        if (Number.isFinite(g?.linkImpactDuration)) {
          root.style.setProperty('--link-impact-duration', `${Math.round(g.linkImpactDuration)}ms`);
        }
      } catch (e) {}
      
      // Ensure noise-2 and noise-3 elements exist (for modular dev environments)
      ensureNoiseElements();

      // Procedural noise texture (no GIF): generates a small texture once and animates via CSS only.
      try {
        initNoiseSystem(getGlobals());
      } catch (e) {}
      
      // Setup canvas (attaches resize listener, but doesn't resize yet)
      setupRenderer();
      const canvas = getCanvas();
      const ctx = getContext();
      const container = document.getElementById('bravia-balls');
      
      if (!canvas || !ctx || !container) {
        throw new Error('Missing DOM elements');
      }

      // Ensure the brand logo renders ABOVE the rounded window background.
      // We now paint the window background on `#bravia-balls` (single rounded surface)
      // to avoid end-of-scale corner snapping. That means the logo must live inside
      // the same stacking context to remain visible while still sitting behind balls.
      try {
        const logo = document.getElementById('brand-logo');
        if (logo && logo.parentElement !== container) {
          container.prepend(logo);
        }
      } catch (e) {}

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

      // iOS Safari: prevent page rubber-banding while still allowing UI internal scrolling.
      setupOverscrollLock();
      log('✓ Overscroll lock configured');
      
      // Setup custom cursor (circular, matches ball size)
      setupCustomCursor();
      mark('bb:input');
      log('✓ Custom cursor initialized');

      // Link hover: hide cursor + trail; let hover dot “become” the cursor.
      initLinkCursorHop();

      // Scene micro-interaction: subtle "clicked-in" response on simulation changes
      initSceneImpactReact();
      
      // Load any saved settings
      loadSettings();

      // Palette chapters: rotate on each reload (cursor + ball colors only).
      rotatePaletteChapterOnReload();

      // Initialize sound engine once (no AudioContext yet; unlock requires user gesture)
      initSoundEngine();
      // Apply sound settings from runtime config (so panel + exports round-trip).
      try {
        applySoundConfigFromRuntimeConfig(config);
      } catch (e) {}
      log('✓ Sound engine primed (awaiting user unlock)');

      // Scene change SFX (soothing “pebble-like” tick on mode change)
      initSceneChangeSFX();
      
      // DEV-only: setup configuration panel UI.
      // Production builds must ship without the panel (config is hardcoded during build).
      {
        try {
          const panelDock$1 = await Promise.resolve().then(function () { return panelDock; });
          panelDock$1.createPanelDock?.();
          const colors$1 = await Promise.resolve().then(function () { return colors; });
          colors$1.populateColorSelect?.();
        } catch (e) {}
      }
      mark('bb:ui');
      log('✓ Panel dock created (Sound + Controls)' );

      // Initialize dark mode AFTER panel creation (theme buttons exist now)
      initializeDarkMode();
      mark('bb:theme');

      // Legend dots: assign discipline colors (palette-driven + story overrides)
      applyExpertiseLegendColors();
      
      setupKeyboardShortcuts();
      log('✓ Keyboard shortcuts registered');
      
      // Initialize gate blur overlay system
      initGateOverlay(config);
      log('✓ Gate overlay system initialized');
      
      // Initialize password gates (CV and Portfolio protection)
      initCVGate();
      log('✓ CV password gate initialized');
      
      initPortfolioGate();
      log('✓ Portfolio password gate initialized');

      initContactGate();
      log('✓ Contact gate initialized');

      // Compose the top UI (LEGACY FUNCTION REMOVED - NOW IN DOM)
      // setupTopElementsLayout();

      // Normalize social icons (line SVGs) across dev + build.
      // (Build uses the exported HTML; we patch at runtime for consistency.)
      upgradeSocialIcons();

      // Initialize time display (London time)
      initTimeDisplay();

      // Footer: mobile-friendly wrapping tweaks (keeps "Bio/CV" together)
      enhanceFooterLinksForMobile();
      
      // Create quick sound toggle button (bottom-right, next to time)
      createSoundToggle();
      log('✓ Sound toggle button created');
      log('✓ Theme toggle button created');
      
      // Layout controls integrated into master panel
      
      // Initialize starting mode (randomized on each reload)
      const startMode = pickStartupMode();
      // Cursor color: auto-pick a new contrasty ball color per simulation load.
      // Must run after theme/palette is initialized (initializeDarkMode → applyColorTemplate).
      maybeAutoPickCursorColor?.('startup');
      setMode(startMode);
      try {
        const ui = await Promise.resolve().then(function () { return controls; });
        ui.updateModeButtonsUI?.(startMode);
      } catch (e) {}
      mark('bb:mode');
      log('✓ Mode initialized');
      
      // Register force render callback for resize (prevents blank frames during drag-resize)
      setForceRenderCallback(render);
      
      // NOTE: Scroll FX is portfolio-only (see `source/modules/portfolio/`).

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
      
      // Console banner: print AFTER colors are initialized and group is closed so it's always visible
      // - DEV: show the same colored banner (but keep logs)
      // - PROD: show banner and silence non-error console output
      try {
        if (isDev()) {
          printConsoleBanner();
        } else {
          initConsolePolicy();
        }
      } catch (bannerError) {
        // Ensure banner always prints even if there's an error
        try {
          console.error('Banner print error:', bannerError);
          // Fallback: print simple banner
          console.log('%cCurious mind detected. Design meets engineering at 60fps.', 'color: #888; font-style: italic;');
        } catch (e) {
          // Console completely unavailable
        }
      }
      
      // ╔══════════════════════════════════════════════════════════════════════════════╗
      // ║                             PAGE FADE-IN                                    ║
      // ╚══════════════════════════════════════════════════════════════════════════════╝
      // Goal: fade ALL UI content (inside #fade-content) from 0 → 1 on reload.
      //
      // Why this is tricky in this project:
      // - Much of the UI is `position: fixed` (exported layout + our overrides).
      // - Fixed descendants can be composited outside a normal wrapper, so fading
      //   a parent via CSS can appear “broken”.
      // - We solve this with a fixed + transformed `#fade-content` (CSS) and we
      //   run the fade using Web Animations API (WAAPI) for maximum robustness.
      //
      // Failsafe:
      // If, for any reason, the animation gets canceled or never runs, we force
      // the content visible after a short timeout so the page never “sticks” hidden.

      // ╔══════════════════════════════════════════════════════════════════════════════╗
      // ║                    DRAMATIC ENTRANCE ANIMATION                               ║
      // ║        Browser default → wall-state with 3D perspective orchestration        ║
      // ╚══════════════════════════════════════════════════════════════════════════════╝
      
      try {
        const { orchestrateEntrance } = await Promise.resolve().then(function () { return entranceAnimation; });
        const g = getGlobals();
        
        // Skip entrance animation if disabled or reduced motion preferred
        if (!g.entranceEnabled || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
          // Fallback: simple fade-in
      try {
        await waitForFonts();
      } catch (e) {}

        const fadeContent = document.getElementById('fade-content');
          if (fadeContent) {
            fadeContent.style.opacity = '1';
            fadeContent.style.transform = 'translateZ(0)';
          }
          console.log('✓ Entrance animation skipped (disabled or reduced motion)');
        } else {
          // Orchestrate dramatic entrance
          await orchestrateEntrance({
            waitForFonts: async () => {
              try {
                await waitForFonts();
              } catch (e) {}
            }
          });
          console.log('✓ Dramatic entrance animation orchestrated');
        }
      } catch (e) {
        console.warn('⚠️ Entrance animation failed, falling back to simple fade:', e);
        // Fallback: simple fade-in
        try {
          await waitForFonts();
        } catch (e) {}
        
        const fadeContent = document.getElementById('fade-content');
          if (fadeContent) {
            fadeContent.style.opacity = '1';
            fadeContent.style.transform = 'translateZ(0)';
          }
      }
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      document.body.innerHTML = `<div style="padding: 20px; color: red; background: white;">
      <h2>Initialization Error</h2>
      <pre>${error.message}\n${error.stack}</pre>
    </div>`;
    }
  })();

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
   */
  function setInitialBrowserDefaultState() {
    const html = document.documentElement;
    const g = getGlobals();
    
    // Get original wall color from config or CSS
    const root = getComputedStyle(html);
    let originalWallColor = root.getPropertyValue('--wall-color').trim();
    if (!originalWallColor || originalWallColor === '#ffffff') {
      // Fallback to config or default
      originalWallColor = g.frameColor || '#0a0a0a';
    }
    
    // Store original color for transition
    html.dataset.originalWallColor = originalWallColor;
    
    // Set browser default background (white) - this happens before wall-state transition
    html.style.setProperty('--wall-color', '#ffffff', 'important');
    html.style.setProperty('background', '#ffffff', 'important');
    html.style.setProperty('background-color', '#ffffff', 'important');
    
    // Hide all custom-styled elements initially
    html.classList.add('entrance-pre-transition');
  }

  /**
   * Transitions from browser default to wall-state
   * Wall "grows" from beyond the viewport with synchronized scale and corner rounding
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
          const originalColor = html.dataset.originalWallColor || g.frameColor || '#0a0a0a';
          html.style.setProperty('--wall-color', originalColor);
          html.style.setProperty('background', originalColor);
          html.style.setProperty('background-color', originalColor);
          setTimeout(() => {
            html.classList.remove('entrance-transitioning');
            html.classList.add('entrance-complete');
            // Remove inline --wall-color override so CSS can control it based on theme
            html.style.removeProperty('--wall-color');
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
      // PHASE 2: REVEAL (remove browser default, show wall)
      // ═══════════════════════════════════════════════════════════════════════════════
      
      html.classList.remove('entrance-pre-transition');
      html.classList.add('entrance-transitioning');
      
      // Restore wall color immediately
      const originalColor = html.dataset.originalWallColor || g.frameColor || '#0a0a0a';
      html.style.setProperty('--wall-color', originalColor);
      html.style.setProperty('background', originalColor);
      html.style.setProperty('background-color', originalColor);
      
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
              // Remove inline --wall-color override so CSS can control it based on theme
              html.style.removeProperty('--wall-color');
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
          // Remove inline --wall-color override so CSS can control it based on theme
          html.style.removeProperty('--wall-color');
        }, duration + 50);
      }
    }, delay);
  }

  /**
   * Animates a single element with 3D entrance effect
   * @param {HTMLElement} element - Element to animate
   * @param {Object} options - Animation options
   */
  function animateElementEntrance(element, options = {}) {
    const g = getGlobals();
    
    if (!element || typeof element.animate !== 'function') {
      // Fallback: just show element
      element.style.opacity = '1';
      return null;
    }
    
    const delay = options.delay || 0;
    const duration = options.duration || (g.entranceElementDuration || 200);
    const scaleStart = options.scaleStart || (g.entranceElementScaleStart || 0.95);
    const scaleEnd = options.scaleEnd || 1;
    const translateZStart = options.translateZStart || (g.entranceElementTranslateZStart || -20);
    const translateZEnd = options.translateZEnd || 0;
    const easing = options.easing || (g.entranceElementEasing || 'ease-out');
    
    // Set initial state
    element.style.opacity = '0';
    element.style.transform = `translateZ(${translateZStart}px) scale(${scaleStart})`;
    element.style.willChange = 'opacity, transform';
    
    // Wait for delay
    setTimeout(() => {
      const anim = element.animate(
        [
          {
            opacity: 0,
            transform: `translateZ(${translateZStart}px) scale(${scaleStart})`
          },
          {
            opacity: 1,
            transform: `translateZ(${translateZEnd}px) scale(${scaleEnd})`
          }
        ],
        {
          duration,
          easing,
          fill: 'forwards'
        }
      );
      
      anim.addEventListener('finish', () => {
        element.style.opacity = '1';
        element.style.transform = `translateZ(${translateZEnd}px) scale(${scaleEnd})`;
        element.style.willChange = 'auto';
      });
      
      anim.addEventListener('cancel', () => {
        element.style.opacity = '1';
        element.style.transform = `translateZ(${translateZEnd}px) scale(${scaleEnd})`;
        element.style.willChange = 'auto';
      });
      
      return anim;
    }, delay);
  }

  /**
   * Orchestrates the complete entrance sequence
   * @param {Object} options - Configuration options
   */
  async function orchestrateEntrance(options = {}) {
    const g = getGlobals();
    
    // Apply aspect ratio detection
    applyAspectRatioClass();
    applyPerspectiveCSS();
    
    // Set initial browser default state
    setInitialBrowserDefaultState();
    
    // Wait for fonts to load
    if (options.waitForFonts) {
      await options.waitForFonts();
    }
    
    // Start wall-state transition
    transitionToWallState();
    
    // Animate UI content wrapper (smaller elements inside will fade with it)
    // Background elements (#bravia-balls, #abs-scene, #edge-chapter, #edge-copyright, #brand-logo)
    // are now visible immediately - no fade-in animation
    const fadeContent = document.getElementById('fade-content');
    if (fadeContent) {
      const wallDelay = g.entranceWallTransitionDelay || 300;
      const wallDuration = g.entranceWallTransitionDuration || 800;
      const elementDelay = wallDelay + (wallDuration * 0.3); // Start elements during wall transition
      
      animateElementEntrance(fadeContent, {
        delay: elementDelay,
        duration: g.entranceElementDuration || 200,
        scaleStart: g.entranceElementScaleStart || 0.95,
        translateZStart: g.entranceElementTranslateZStart || -20
      });
    }
    
    // Background elements (#edge-chapter, #edge-copyright, #brand-logo) are now
    // visible immediately - removed from fade-in animation
  }

  var entranceAnimation = /*#__PURE__*/Object.freeze({
    __proto__: null,
    animateElementEntrance: animateElementEntrance,
    applyAspectRatioClass: applyAspectRatioClass,
    applyPerspectiveCSS: applyPerspectiveCSS,
    detectAspectRatioCategory: detectAspectRatioCategory,
    orchestrateEntrance: orchestrateEntrance,
    setInitialBrowserDefaultState: setInitialBrowserDefaultState,
    transitionToWallState: transitionToWallState
  });

  exports.applyFramePaddingCSSVars = applyFramePaddingCSSVars;
  exports.applyVisualCSSVars = applyVisualCSSVars;

  return exports;

})({});
//# sourceMappingURL=bouncy-balls-embed.js.map
