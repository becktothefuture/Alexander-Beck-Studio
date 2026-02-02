// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       STATE STORE (OPTIMIZED)                               ║
// ║               All global state - extracted from balls-source.html            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES, WALL_PRESETS } from './constants.js';
import { readTokenNumber, readTokenPx, readTokenVar } from '../utils/tokens.js';

// Helper: Convert hex color to "r, g, b" string for CSS rgba()
function hexToRgbString(hex) {
  if (!hex) return '255, 255, 255';
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const num = parseInt(hex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

// ════════════════════════════════════════════════════════════════════════════════
// PERFORMANCE: Dynamic DPR getter - allows runtime adaptation
// The renderer can reduce DPR on weak devices for better performance
// ════════════════════════════════════════════════════════════════════════════════
let _effectiveDPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

export function setEffectiveDPR(dpr) {
  _effectiveDPR = dpr;
}

export function getEffectiveDPR() {
  return _effectiveDPR;
}

const state = {
  config: {},
  // Default boot mode (overridden by main.js on init, but kept consistent here too).
  // Always use a Featured tier mode to ensure best first impression.
  currentMode: MODES.PIT,
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

  sizeVariationMagnetic: 0,
  sizeVariationBubbles: 0.2,
  sizeVariationKaleidoscope: 0,
  sizeVariationCritters: 0.2,
  sizeVariationNeural: 0.05,
  sizeVariationParallaxLinear: 0,
  sizeVariationParallaxFloat: 0,
  
  // Warmup (per simulation) — how many "startup frames" to pre-run before first render.
  // Default 10 for all modes (quick settle; avoids visible pop-in while testing).
  pitWarmupFrames: 10,
  fliesWarmupFrames: 10,
  weightlessWarmupFrames: 10,
  waterWarmupFrames: 10,
  vortexWarmupFrames: 10,

  magneticWarmupFrames: 10,
  bubblesWarmupFrames: 10,
  kaleidoscope3WarmupFrames: 10,
  crittersWarmupFrames: 10,
  neuralWarmupFrames: 10,
  parallaxLinearWarmupFrames: 10,
  parallaxFloatWarmupFrames: 10,
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
  cube3dFogStart: 0.5,
  cube3dFogMin: 0.1,
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
  // Responsive ball sizes - interpolates between min/max based on viewport width
  ballSizeMin: 22,            // Ball radius in px at smallest viewport
  ballSizeMax: 30,            // Ball radius in px at largest viewport
  ballSizeBreakpointMin: 320, // Viewport width (px) where min size applies
  ballSizeBreakpointMax: 1920, // Viewport width (px) where max size applies
  ballSizeCurve: 2.5,         // Easing curve (1=linear, >1=stays smaller longer, <1=grows faster)
  isMobile: false,            // Mobile *device* detected? (UA/touch heuristic)
  isMobileViewport: false,    // Mobile viewport detected? (width breakpoint)

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
  
  // Hive behavior parameters
  critterHiveStirInterval: 5.0,   // seconds between hive stir waves
  critterHiveStirStrength: 2.5,   // force multiplier for stir impulse
  critterHiveWaveSpeed: 0.4,      // how fast stir wave expands (canvas/sec)
  
  // Character trait ranges (personality variation)
  critterNervousnessMin: 0.4,     // min nervousness (0-1)
  critterNervousnessMax: 1.0,     // max nervousness (0-1)
  critterCuriosityBias: 0.5,      // avg curiosity level (0=stay put, 1=explore)
  
  // Journey points (goal-based wandering)
  hiveJourneyPointCount: 4,       // number of journey points (1-8)
  hiveJourneyPointMargin: 0.05,   // margin from edges (0-0.2)
  hiveGoalAttractionStrength: 0.25, // how strongly critters steer toward goals (0-1)
  hiveGoalSwitchMinS: 4,          // min seconds before switching goals (1-20)
  hiveGoalSwitchMaxS: 14,         // max seconds before switching goals (5-30)
  hiveGoalReachedRadius: 50,      // distance threshold to consider goal reached (10-200)
  hivePathAdherence: 0.5,         // probability to pick next sequential point vs random (0-1)
  
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
  wallThicknessMinPx: 6,    // minimum wall thickness clamp (px) for small viewports
  wallThicknessMaxPx: 25,   // maximum wall thickness clamp (px) for large viewports

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
  noiseOpacity: 0.20, // Overall opacity (0-1)
  noiseOpacityLight: 0.20, // Opacity for light mode
  noiseOpacityDark: 0.18, // Opacity for dark mode
  noiseBlendMode: 'overlay', // CSS mix-blend-mode for grain visibility
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
    { label: 'Product Systems', colorIndex: 0, weight: 30 },
    { label: 'Interaction Design', colorIndex: 4, weight: 18 },
    { label: 'Creative Tech', colorIndex: 3, weight: 15 },
    { label: 'AI Design', colorIndex: 2, weight: 12 },
    { label: 'Design Direction', colorIndex: 5, weight: 10 },
    { label: 'Art Direction', colorIndex: 6, weight: 10 },
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
  elasticCenterRingCount: 10,
  elasticCenterMassMultiplier: 2.0,
  elasticCenterSpacingMultiplier: 2.8, // multiplier for spacing between balls (higher = larger gaps)
  elasticCenterElasticStrength: 2000, // px/s² - force pulling dots back to center (lower = circle moves more)
  elasticCenterMouseRepelStrength: 12000, // px/s² - force pushing dots away from mouse
  elasticCenterMouseRadius: 200, // px - distance where mouse affects dots
  elasticCenterDamping: 0.94, // velocity damping for stability
  elasticCenterWarmupFrames: 10,
  

  
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
  // Page caption: clamp(min, 2vh, max) for bottom distance (universal: index, portfolio, cv).
  edgeCaptionDistanceMinPx: 8,
  edgeCaptionDistanceMaxPx: 48,
  // Simulation overlays: CSS ::before gradient (0–1) and canvas depth-wash.
  simulationOverlayIntensity: 1,
  // Depth wash: radial gradient overlay between balls and wall
  depthWashOpacity: 0.65,
  depthWashBlendModeLight: 'color-dodge',
  depthWashBlendModeDark: 'multiply',
  depthWashCenterY: 0.3, // Center position (0=top, 1=bottom)
  depthWashRadiusScale: 1.0, // Radius multiplier
  // Light mode gradient
  depthWashCenterColorLight: '#ffffff',
  depthWashEdgeColorLight: '#142b48',
  depthWashCenterAlphaLight: 0.3,
  depthWashEdgeAlphaLight: 0.4,
  // Dark mode gradient
  depthWashCenterColorDark: '#1a1e23',
  depthWashEdgeColorDark: '#05020f',
  depthWashCenterAlphaDark: 0,
  depthWashEdgeAlphaDark: 0.8,
  
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // WALL SHADOW - Recessed panel depth effect
  // Light from top-left: wall casts shadows onto recessed content
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Dark edges (top + left) - wall shadow falling onto content
  wallShadowEdgeTopOpacityLight: 0.08,    // Top edge darkness in light mode
  wallShadowEdgeTopOpacityDark: 0.25,     // Top edge darkness in dark mode
  wallShadowEdgeLeftOpacityLight: 0.06,   // Left edge darkness in light mode
  wallShadowEdgeLeftOpacityDark: 0.18,    // Left edge darkness in dark mode
  
  // Light edges (bottom + right) - catching light
  wallShadowEdgeBottomOpacityLight: 0.06, // Bottom highlight in light mode
  wallShadowEdgeBottomOpacityDark: 0.03,  // Bottom highlight in dark mode
  wallShadowEdgeRightOpacityLight: 0.04,  // Right highlight in light mode
  wallShadowEdgeRightOpacityDark: 0.02,   // Right highlight in dark mode
  
  // Ambient inset vignette (soft depth from wall)
  wallShadowAmbientBlur: 20,              // Vignette blur radius (px)
  wallShadowAmbientOpacityLight: 0.04,    // Vignette depth in light mode
  wallShadowAmbientOpacityDark: 0.12,     // Vignette depth in dark mode
  
  // Stroke (solid edge definition)
  wallShadowStrokeOpacityLight: 0.06,     // Solid edge stroke in light mode
  wallShadowStrokeOpacityDark: 0.04,      // Solid edge stroke in dark mode
  
  // Inner Shadow (soft, staggered 3-layer shadow for depth)
  // Creates the illusion of the wall casting shadow onto the recessed content
  wallInnerShadowEnabled: true,           // Master toggle
  wallInnerShadowOpacityLight: 0.08,      // Shadow opacity in light mode
  wallInnerShadowOpacityDark: 0.25,       // Shadow opacity in dark mode
  wallInnerShadowOffsetY: 2,              // Vertical offset (px) - positive = shadow from top
  wallInnerShadowBlur1: 3,                // Layer 1: tight, sharp shadow (px)
  wallInnerShadowBlur2: 8,                // Layer 2: medium diffuse (px)
  wallInnerShadowBlur3: 20,               // Layer 3: soft ambient (px)
  
  // Radial Gradient Stroke (inner wall edge lighting)
  // Two gradient strokes: bottom light (main) and top light (ambient)
  wallGradientStrokeEnabled: true,           // Master enable for gradient strokes
  wallGradientStrokeWidth: 0.33,             // Stroke width in CSS px (0.33 = 1 retina pixel)
  
  // Bottom Light - Primary light source from below
  wallGradientStrokeBottomEnabled: true,     // Enable bottom light gradient
  wallGradientStrokeBottomRadius: 1.0,       // Gradient radius (1.0 = canvas height)
  wallGradientStrokeBottomOpacity: 1.0,      // Light opacity at center (0-1)
  wallGradientStrokeBottomColor: '#ffffff',  // Light color
  
  // Top Light - Ambient light from above
  wallGradientStrokeTopEnabled: true,        // Enable top light gradient
  wallGradientStrokeTopRadius: 1.0,          // Gradient radius (1.0 = canvas height)
  wallGradientStrokeTopOpacity: 0.5,         // Light opacity at center (0-1)
  wallGradientStrokeTopColor: '#ffffff',     // Light color
  
  // Outer Wall Edge Lighting (double-wall effect)
  outerWallEdgeEnabled: true,               // Enable outer wall edge effects
  outerWallRadiusAdjust: 2,                 // Outer wall radius fine-tune (px)
  outerWallTopDarkOffset: 1,                // Top shadow Y offset (px)
  outerWallTopDarkBlur: 3,                  // Top shadow blur (px)
  outerWallTopDarkSpread: 0,                // Top shadow spread (px)
  outerWallTopDarkOpacityLight: 0.6,        // Top shadow opacity light mode (0-1)
  outerWallTopDarkOpacityDark: 0.4,         // Top shadow opacity dark mode (0-1)
  outerWallBottomLightOffset: 0.5,          // Bottom light Y offset (px)
  outerWallBottomLightBlur: 0,              // Bottom light blur (0 = crisp 1px line)
  outerWallBottomLightSpread: 0,            // Bottom light spread (px)
  outerWallBottomLightOpacityLight: 0.5,    // Bottom light opacity light mode (0-1)
  outerWallBottomLightOpacityDark: 0.3,     // Bottom light opacity dark mode (0-1)
  outerWallBottomLightStrokeWidth: 0.6,     // Bottom light stroke width (px)
  outerWallCastShadowOffset: 3,             // Cast shadow Y offset (px)
  outerWallCastShadowBlur: 12,              // Cast shadow blur (px)
  outerWallCastShadowSpread: 0,             // Cast shadow spread (px)
  outerWallCastShadowOpacityLight: 0.15,    // Cast shadow opacity light mode (0-1)
  outerWallCastShadowOpacityDark: 0.25,     // Cast shadow opacity dark mode (0-1)
  
  // Inner Wall Outward Shadow (cast onto wall surface)
  innerWallOutwardShadowOffset: 2,          // Shadow Y offset (px)
  innerWallOutwardShadowBlur: 8,            // Shadow blur (px)
  innerWallOutwardShadowSpread: 2,          // Shadow spread (px)
  innerWallOutwardShadowOpacityLight: 0.2,  // Light mode opacity (0-1)
  innerWallOutwardShadowOpacityDark: 0.35,  // Dark mode opacity (0-1)
  
  // Top Bevel (thick lip at top edge of walls)
  outerWallTopBevelWidth: 3,                // Outer wall bevel thickness (px)
  outerWallTopBevelOpacityLight: 0.25,      // Outer wall bevel opacity light mode (0-1)
  outerWallTopBevelOpacityDark: 0.35,       // Outer wall bevel opacity dark mode (0-1)
  innerWallTopBevelWidth: 2,                // Inner wall top light edge thickness (px)
  innerWallTopLightOpacityLight: 0.3,       // Inner wall top light opacity light mode (0-1)
  innerWallTopLightOpacityDark: 0.4,        // Inner wall top light opacity dark mode (0-1)
  innerWallTopLightStrokeWidth: 0.6,        // Inner wall top light stroke width (px)
  innerWallBottomBevelWidth: 2,             // Inner wall bottom shadow thickness (px)
  innerWallTopBevelOpacityLight: 0.18,      // Inner wall bottom shadow opacity light mode (0-1)
  innerWallTopBevelOpacityDark: 0.25,       // Inner wall bottom shadow opacity dark mode (0-1)
  
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
  
  // Grunge video overlay (see docs/grunge-video-overlay.md)
  grungeVideoEnabled: true,          // Enable/disable video overlay
  grungeVideoOpacity: 0.8,           // Video opacity (0-1)
  grungeVideoBlendModeLight: 'overlay',  // Blend mode for light mode video
  grungeVideoBlendModeDark: 'screen',    // Blend mode for dark mode video
  
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
  linkHoverNudge: 1,                 // Vertical translation applied during hover/focus/active (px)
  linkHoverIntensityLight: 0.2,      // Cursor tint strength for light-mode hover backgrounds (0-1)
  linkHoverIntensityDark: 0.24,      // Cursor tint strength for dark-mode hover backgrounds (0-1)
  linkHoverIntensityActive: 0.18,    // Cursor tint strength while active/pressed (0-1)
  hoverSnapEnabled: true,            // Hover targets: scale-only bounce on hover entry (no color delay)
  hoverSnapDuration: 450,            // Hover snap duration (ms)
  hoverSnapOvershoot: 1.08,          // Hover snap peak scale (>= 1.0)
  hoverSnapUndershoot: 0.98,         // Hover snap recoil scale (<= 1.0)
  
  // Hover Edge Lighting (radial gradient strokes on hover backgrounds)
  // Mirrors the wall gradient stroke system for visual cohesion
  hoverEdgeEnabled: true,                    // Master toggle for hover edge lighting
  hoverEdgeWidth: 1,                         // Stroke width in px
  hoverEdgeInset: 0,                         // Inset from element edge in px
  
  // Bottom Light - Primary upward light source (brighter)
  hoverEdgeBottomEnabled: true,              // Enable bottom light
  hoverEdgeBottomRadius: 1.2,                // Gradient radius (1.0 = element height)
  hoverEdgeBottomOpacity: 0.6,               // Light intensity at center (0-1)
  hoverEdgeBottomColorMix: 70,               // Cursor color mix percentage (0-100)
  
  // Top Light - Ambient downward light source (dimmer)
  hoverEdgeTopEnabled: true,                 // Enable top light
  hoverEdgeTopRadius: 1.0,                   // Gradient radius (1.0 = element height)
  hoverEdgeTopOpacity: 0.3,                  // Light intensity at center (0-1)
  hoverEdgeTopColorMix: 50,                  // Cursor color mix percentage (0-100)
  
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

function clampNumber(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampInt(v, min, max, fallback) {
  const n = clampNumber(v, min, max, fallback);
  return Math.round(n);
}

export function getLayoutViewportWidthPx() {
  // Virtual viewport width (debug) → allows tuning vw values without resizing window.
  // IMPORTANT: keep this O(1) and allocation-free.
  const forced = Number(state.layoutViewportWidthPx);
  if (Number.isFinite(forced) && forced > 0) return forced;
  return Math.max(1, window.innerWidth || 1);
}

export function getLayoutViewportHeightPx() {
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
export function getScreenAreaPx() {
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
export function getNormalizedScreenArea(referenceAreaPx = 640000) {
  const area = getScreenAreaPx();
  if (area <= 0 || referenceAreaPx <= 0) return 1.0;
  return area / referenceAreaPx;
}

export function pxToVw(px, viewportWidthPx) {
  const w = Math.max(1, viewportWidthPx || getLayoutViewportWidthPx());
  const p = Number(px);
  if (!Number.isFinite(p)) return 0;
  return (p / w) * 100;
}

export function vwToPx(vw, viewportWidthPx) {
  const w = Math.max(1, viewportWidthPx || getLayoutViewportWidthPx());
  const v = Number(vw);
  if (!Number.isFinite(v)) return 0;
  return (v / 100) * w;
}

export function applyLayoutFromVwToPx() {
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
  const unclampedWallThickness = areaScaledThicknessPx * thicknessMul;
  // Apply min/max clamps for wall thickness
  const minThickness = Number.isFinite(state.wallThicknessMinPx) ? state.wallThicknessMinPx : 0;
  const maxThickness = Number.isFinite(state.wallThicknessMaxPx) && state.wallThicknessMaxPx > 0 
    ? state.wallThicknessMaxPx : Infinity;
  state.wallThickness = Math.round(Math.max(minThickness, Math.min(maxThickness, unclampedWallThickness)));
  
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

  state.bubblesDeflectRadius = Math.round(baseCursorPx);
  
  // Particle Fountain mouse repulsion radius (separate vw-based value)
  const particleFountainMouseRepelRadiusVw = state.particleFountainMouseRepelRadiusVw ?? 5.0;
  const particleFountainMouseRepelRadiusPx = Math.max(0, vwToPx(particleFountainMouseRepelRadiusVw, w));
  state.particleFountainMouseRepelRadius = Math.round(particleFountainMouseRepelRadiusPx);
}

export function applyLayoutCSSVars() {
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

  // Page caption distance (universal: index, portfolio, cv).
  const capMin = Number.isFinite(state.edgeCaptionDistanceMinPx) ? state.edgeCaptionDistanceMinPx : 8;
  const capMax = Number.isFinite(state.edgeCaptionDistanceMaxPx) ? state.edgeCaptionDistanceMaxPx : 48;
  root.style.setProperty('--edge-caption-distance-min', `${Math.max(0, capMin)}px`);
  root.style.setProperty('--edge-caption-distance-max', `${Math.max(capMin, capMax)}px`);

  // Simulation overlay: CSS ::before gradient intensity (0–1).
  const simOverlay = Number.isFinite(state.simulationOverlayIntensity) ? Math.max(0, Math.min(1, state.simulationOverlayIntensity)) : 1;
  root.style.setProperty('--simulation-overlay-intensity', String(simOverlay));

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
  
  // Hover Edge Lighting CSS variables (mirrors wall gradient stroke system)
  root.style.setProperty('--hover-edge-enabled', state.hoverEdgeEnabled ? '1' : '0');
  root.style.setProperty('--hover-edge-width', `${state.hoverEdgeWidth ?? 1}px`);
  root.style.setProperty('--hover-edge-inset', `${state.hoverEdgeInset ?? 0}px`);
  
  // Bottom light (primary upward)
  root.style.setProperty('--hover-edge-bottom-enabled', state.hoverEdgeBottomEnabled ? '1' : '0');
  root.style.setProperty('--hover-edge-bottom-radius', String(state.hoverEdgeBottomRadius ?? 1.2));
  root.style.setProperty('--hover-edge-bottom-opacity', String(state.hoverEdgeBottomOpacity ?? 0.6));
  root.style.setProperty('--hover-edge-bottom-color-mix', `${state.hoverEdgeBottomColorMix ?? 70}%`);
  
  // Top light (ambient downward)
  root.style.setProperty('--hover-edge-top-enabled', state.hoverEdgeTopEnabled ? '1' : '0');
  root.style.setProperty('--hover-edge-top-radius', String(state.hoverEdgeTopRadius ?? 1.0));
  root.style.setProperty('--hover-edge-top-opacity', String(state.hoverEdgeTopOpacity ?? 0.3));
  root.style.setProperty('--hover-edge-top-color-mix', `${state.hoverEdgeTopColorMix ?? 50}%`);
  
  // Outer Wall Edge Lighting CSS variables (double-wall effect)
  const isDarkMode = document.body.classList.contains('dark-mode');
  root.style.setProperty('--outer-wall-radius-adjust', `${state.outerWallRadiusAdjust ?? 2}px`);
  root.style.setProperty('--outer-wall-top-dark-offset', `${state.outerWallTopDarkOffset ?? 1}px`);
  root.style.setProperty('--outer-wall-top-dark-blur', `${state.outerWallTopDarkBlur ?? 3}px`);
  root.style.setProperty('--outer-wall-top-dark-spread', `${state.outerWallTopDarkSpread ?? 0}px`);
  root.style.setProperty('--outer-wall-top-dark-opacity', String(isDarkMode 
    ? (state.outerWallTopDarkOpacityDark ?? 0.4) 
    : (state.outerWallTopDarkOpacityLight ?? 0.6)));
  root.style.setProperty('--outer-wall-bottom-light-offset', `${state.outerWallBottomLightOffset ?? 0.5}px`);
  root.style.setProperty('--outer-wall-bottom-light-blur', `${state.outerWallBottomLightBlur ?? 0}px`);
  root.style.setProperty('--outer-wall-bottom-light-spread', `${state.outerWallBottomLightSpread ?? 0}px`);
  root.style.setProperty('--outer-wall-bottom-light-opacity', String(isDarkMode
    ? (state.outerWallBottomLightOpacityDark ?? 0.3)
    : (state.outerWallBottomLightOpacityLight ?? 0.5)));
  root.style.setProperty('--outer-wall-cast-shadow-offset', `${state.outerWallCastShadowOffset ?? 3}px`);
  root.style.setProperty('--outer-wall-cast-shadow-blur', `${state.outerWallCastShadowBlur ?? 12}px`);
  root.style.setProperty('--outer-wall-cast-shadow-spread', `${state.outerWallCastShadowSpread ?? 0}px`);
  root.style.setProperty('--outer-wall-cast-shadow-opacity', String(isDarkMode
    ? (state.outerWallCastShadowOpacityDark ?? 0.25)
    : (state.outerWallCastShadowOpacityLight ?? 0.15)));
  
  // Inner Wall Outward Shadow CSS variables
  root.style.setProperty('--inner-wall-outward-shadow-offset', `${state.innerWallOutwardShadowOffset ?? 2}px`);
  root.style.setProperty('--inner-wall-outward-shadow-blur', `${state.innerWallOutwardShadowBlur ?? 8}px`);
  root.style.setProperty('--inner-wall-outward-shadow-spread', `${state.innerWallOutwardShadowSpread ?? 2}px`);
  root.style.setProperty('--inner-wall-outward-shadow-opacity', String(isDarkMode
    ? (state.innerWallOutwardShadowOpacityDark ?? 0.35)
    : (state.innerWallOutwardShadowOpacityLight ?? 0.2)));
  root.style.setProperty('--inner-wall-outward-shadow-opacity-dark', String(state.innerWallOutwardShadowOpacityDark ?? 0.35));
  
  // Inner Wall Inner Glow CSS variables
  root.style.setProperty('--inner-wall-inner-glow-blur', `${state.innerWallInnerGlowBlur ?? 25}px`);
  root.style.setProperty('--inner-wall-inner-glow-spread', `${state.innerWallInnerGlowSpread ?? 3}px`);
  root.style.setProperty('--inner-wall-inner-glow-offset-y', `${state.innerWallInnerGlowOffsetY ?? 12}px`);
  root.style.setProperty('--inner-wall-inner-glow-opacity', String(isDarkMode
    ? (state.innerWallInnerGlowOpacityDark ?? 0.08)
    : (state.innerWallInnerGlowOpacityLight ?? 0)));
  root.style.setProperty('--inner-wall-inner-glow-opacity-dark', String(state.innerWallInnerGlowOpacityDark ?? 0.08));
  if (state.innerWallInnerGlowColor) {
    const rgb = hexToRgbString(state.innerWallInnerGlowColor);
    root.style.setProperty('--inner-wall-inner-glow-rgb', rgb);
  }
  
  // Top Bevel CSS variables (thick lip at top edge)
  root.style.setProperty('--outer-wall-top-bevel-width', `${state.outerWallTopBevelWidth ?? 3}px`);
  root.style.setProperty('--outer-wall-top-bevel-opacity', String(isDarkMode
    ? (state.outerWallTopBevelOpacityDark ?? 0.35)
    : (state.outerWallTopBevelOpacityLight ?? 0.25)));
  root.style.setProperty('--inner-wall-top-bevel-width', `${state.innerWallTopBevelWidth ?? 2}px`);
  root.style.setProperty('--inner-wall-top-light-opacity', String(isDarkMode
    ? (state.innerWallTopLightOpacityDark ?? 0.4)
    : (state.innerWallTopLightOpacityLight ?? 0.3)));
  root.style.setProperty('--inner-wall-bottom-bevel-width', `${state.innerWallBottomBevelWidth ?? 2}px`);
  root.style.setProperty('--inner-wall-top-bevel-opacity', String(isDarkMode
    ? (state.innerWallTopBevelOpacityDark ?? 0.25)
    : (state.innerWallTopBevelOpacityLight ?? 0.18)));
  
  // Apply outer wall edge enabled state to DOM
  const container = document.getElementById('bravia-balls');
  if (container) {
    container.classList.toggle('outer-wall-edge-disabled', !state.outerWallEdgeEnabled);
  }
}

export function initState(config) {
  state.config = { ...config };
  // Virtual viewport width must be read early so px→vw migrations use the intended basis.
  if (config.layoutViewportWidthPx !== undefined) {
    state.layoutViewportWidthPx = clampNumber(config.layoutViewportWidthPx, 0, 4096, 0);
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
    state.sizeVariationGlobalMul = clampNumber(config.sizeVariationGlobalMul, 0, 2, state.sizeVariationGlobalMul);
  }
  if (config.sizeVariationCap !== undefined) {
    state.sizeVariationCap = clampNumber(config.sizeVariationCap, 0, 0.2, state.sizeVariationCap);
  }
  // Per-mode variation sliders (0..1)
  if (config.sizeVariationPit !== undefined) state.sizeVariationPit = clampNumber(config.sizeVariationPit, 0, 1, state.sizeVariationPit);
  if (config.sizeVariationFlies !== undefined) state.sizeVariationFlies = clampNumber(config.sizeVariationFlies, 0, 1, state.sizeVariationFlies);
  if (config.sizeVariationWeightless !== undefined) state.sizeVariationWeightless = clampNumber(config.sizeVariationWeightless, 0, 1, state.sizeVariationWeightless);
  if (config.sizeVariationWater !== undefined) state.sizeVariationWater = clampNumber(config.sizeVariationWater, 0, 1, state.sizeVariationWater);
  if (config.sizeVariationVortex !== undefined) state.sizeVariationVortex = clampNumber(config.sizeVariationVortex, 0, 1, state.sizeVariationVortex);

  if (config.sizeVariationMagnetic !== undefined) state.sizeVariationMagnetic = clampNumber(config.sizeVariationMagnetic, 0, 1, state.sizeVariationMagnetic);
  if (config.sizeVariationBubbles !== undefined) state.sizeVariationBubbles = clampNumber(config.sizeVariationBubbles, 0, 1, state.sizeVariationBubbles);
  if (config.sizeVariationKaleidoscope !== undefined) state.sizeVariationKaleidoscope = clampNumber(config.sizeVariationKaleidoscope, 0, 1, state.sizeVariationKaleidoscope);
  if (config.sizeVariationCritters !== undefined) state.sizeVariationCritters = clampNumber(config.sizeVariationCritters, 0, 1, state.sizeVariationCritters);
  if (config.sizeVariationNeural !== undefined) state.sizeVariationNeural = clampNumber(config.sizeVariationNeural, 0, 1, state.sizeVariationNeural);
  if (config.sizeVariationParallaxLinear !== undefined) state.sizeVariationParallaxLinear = clampNumber(config.sizeVariationParallaxLinear, 0, 1, state.sizeVariationParallaxLinear);
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
    const n = Math.max(0, Math.min(7, src.length));
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
      const colorIndex = clampInt(s.colorIndex, 0, 7, clampInt(b.colorIndex, 0, 7, 0));
      const weight = clampInt(s.weight, 0, 100, clampInt(b.weight, 0, 100, 0));
      out.push({ label, colorIndex, weight });
    }
    state.colorDistribution = out;
  }

  // Warmup frames (per simulation) — integer 0..240
  if (config.pitWarmupFrames !== undefined) state.pitWarmupFrames = clampInt(config.pitWarmupFrames, 0, 240, state.pitWarmupFrames);
  if (config.fliesWarmupFrames !== undefined) state.fliesWarmupFrames = clampInt(config.fliesWarmupFrames, 0, 240, state.fliesWarmupFrames);
  if (config.weightlessWarmupFrames !== undefined) state.weightlessWarmupFrames = clampInt(config.weightlessWarmupFrames, 0, 240, state.weightlessWarmupFrames);
  if (config.waterWarmupFrames !== undefined) state.waterWarmupFrames = clampInt(config.waterWarmupFrames, 0, 240, state.waterWarmupFrames);
  if (config.vortexWarmupFrames !== undefined) state.vortexWarmupFrames = clampInt(config.vortexWarmupFrames, 0, 240, state.vortexWarmupFrames);

  if (config.magneticWarmupFrames !== undefined) state.magneticWarmupFrames = clampInt(config.magneticWarmupFrames, 0, 240, state.magneticWarmupFrames);
  if (config.bubblesWarmupFrames !== undefined) state.bubblesWarmupFrames = clampInt(config.bubblesWarmupFrames, 0, 240, state.bubblesWarmupFrames);
  if (config.kaleidoscope3WarmupFrames !== undefined) state.kaleidoscope3WarmupFrames = clampInt(config.kaleidoscope3WarmupFrames, 0, 240, state.kaleidoscope3WarmupFrames);
  if (config.crittersWarmupFrames !== undefined) state.crittersWarmupFrames = clampInt(config.crittersWarmupFrames, 0, 240, state.crittersWarmupFrames);
  if (config.neuralWarmupFrames !== undefined) state.neuralWarmupFrames = clampInt(config.neuralWarmupFrames, 0, 240, state.neuralWarmupFrames);
  if (config.parallaxLinearWarmupFrames !== undefined) state.parallaxLinearWarmupFrames = clampInt(config.parallaxLinearWarmupFrames, 0, 240, state.parallaxLinearWarmupFrames);
  if (config.elasticCenterWarmupFrames !== undefined) state.elasticCenterWarmupFrames = clampInt(config.elasticCenterWarmupFrames, 0, 240, state.elasticCenterWarmupFrames);

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
    state.cursorInfluenceRadiusVw = clampNumber(config.cursorInfluenceRadiusVw, 0, 80, state.cursorInfluenceRadiusVw);
  } else if (config.repelRadius !== undefined) {
    state.cursorInfluenceRadiusVw = clampNumber(config.repelRadius / 10, 0, 80, state.cursorInfluenceRadiusVw);
  }
  // Responsive ball sizing
  if (config.ballSizeMin !== undefined) state.ballSizeMin = clampNumber(config.ballSizeMin, 1, 100, state.ballSizeMin);
  if (config.ballSizeMax !== undefined) state.ballSizeMax = clampNumber(config.ballSizeMax, 1, 100, state.ballSizeMax);
  if (config.ballSizeBreakpointMin !== undefined) state.ballSizeBreakpointMin = clampNumber(config.ballSizeBreakpointMin, 100, 2000, state.ballSizeBreakpointMin);
  if (config.ballSizeBreakpointMax !== undefined) state.ballSizeBreakpointMax = clampNumber(config.ballSizeBreakpointMax, 500, 4000, state.ballSizeBreakpointMax);
  if (config.ballSizeCurve !== undefined) state.ballSizeCurve = clampNumber(config.ballSizeCurve, 0.1, 5, state.ballSizeCurve);
  // Legacy fallback for old configs
  if (config.ballSizeDesktop !== undefined && config.ballSizeMin === undefined) state.ballSizeMax = config.ballSizeDesktop;
  if (config.ballSizeMobile !== undefined && config.ballSizeMin === undefined) state.ballSizeMin = config.ballSizeMobile;
  if (config.liteModeEnabled !== undefined) state.liteModeEnabled = Boolean(config.liteModeEnabled);
  if (config.liteModeObjectReductionFactor !== undefined) {
    state.liteModeObjectReductionFactor = clampNumber(
      config.liteModeObjectReductionFactor,
      0,
      1,
      state.liteModeObjectReductionFactor
    );
  }
  if (config.mobileObjectReductionFactor !== undefined) {
    state.mobileObjectReductionFactor = clampNumber(
      config.mobileObjectReductionFactor,
      0,
      1,
      state.mobileObjectReductionFactor
    );
  }
  if (config.mobileObjectReductionThreshold !== undefined) {
    state.mobileObjectReductionThreshold = clampInt(
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
    state.kaleidoscopeBallCount = clampNumber(config.kaleidoscopeBallCount, 10, 300, state.kaleidoscopeBallCount);
  }
  if (config.kaleidoscopeDotSizeVh !== undefined) {
    state.kaleidoscopeDotSizeVh = clampNumber(config.kaleidoscopeDotSizeVh, 0.1, 6.0, state.kaleidoscopeDotSizeVh);
  }
  if (config.kaleidoscopeDotAreaMul !== undefined) {
    state.kaleidoscopeDotAreaMul = clampNumber(config.kaleidoscopeDotAreaMul, 0.1, 2.0, state.kaleidoscopeDotAreaMul);
  }
  if (config.kaleidoscopeSpawnAreaMul !== undefined) {
    state.kaleidoscopeSpawnAreaMul = clampNumber(config.kaleidoscopeSpawnAreaMul, 0.2, 2.0, state.kaleidoscopeSpawnAreaMul);
  }
  if (config.kaleidoscopeSizeVariance !== undefined) {
    state.kaleidoscopeSizeVariance = clampNumber(config.kaleidoscopeSizeVariance, 0, 1, state.kaleidoscopeSizeVariance);
  }

  // Kaleidoscope III parameters (now the only kaleidoscope mode)
  if (config.kaleidoscope3BallCount !== undefined) state.kaleidoscope3BallCount = clampNumber(config.kaleidoscope3BallCount, 3, 300, state.kaleidoscope3BallCount);
  if (config.kaleidoscope3Wedges !== undefined) state.kaleidoscope3Wedges = clampNumber(config.kaleidoscope3Wedges, 3, 24, state.kaleidoscope3Wedges);
  if (config.kaleidoscope3Speed !== undefined) state.kaleidoscope3Speed = clampNumber(config.kaleidoscope3Speed, 0.2, 2.0, state.kaleidoscope3Speed);
  if (config.kaleidoscope3DotSizeVh !== undefined) state.kaleidoscope3DotSizeVh = clampNumber(config.kaleidoscope3DotSizeVh, 0.1, 6.0, state.kaleidoscope3DotSizeVh);
  if (config.kaleidoscope3DotAreaMul !== undefined) state.kaleidoscope3DotAreaMul = clampNumber(config.kaleidoscope3DotAreaMul, 0.1, 2.0, state.kaleidoscope3DotAreaMul);
  if (config.kaleidoscope3SpawnAreaMul !== undefined) state.kaleidoscope3SpawnAreaMul = clampNumber(config.kaleidoscope3SpawnAreaMul, 0.2, 2.0, state.kaleidoscope3SpawnAreaMul);
  if (config.kaleidoscope3SizeVariance !== undefined) state.kaleidoscope3SizeVariance = clampNumber(config.kaleidoscope3SizeVariance, 0, 1, state.kaleidoscope3SizeVariance);
  // New key: kaleidoscopeWedges (preferred). Back-compat: kaleidoscopeSegments.
  if (config.kaleidoscopeWedges !== undefined) {
    state.kaleidoscopeWedges = clampNumber(config.kaleidoscopeWedges, 3, 24, state.kaleidoscopeWedges);
  } else if (config.kaleidoscopeSegments !== undefined) {
    state.kaleidoscopeWedges = clampNumber(config.kaleidoscopeSegments, 3, 24, state.kaleidoscopeWedges);
  }
  if (config.kaleidoscopeMirror !== undefined) {
    state.kaleidoscopeMirror = clampNumber(config.kaleidoscopeMirror, 0, 1, state.kaleidoscopeMirror);
  }
  // New key: kaleidoscopeSpeed (preferred). Back-compat: kaleidoscopeSwirlStrength (mapped).
  if (config.kaleidoscopeSpeed !== undefined) {
    state.kaleidoscopeSpeed = clampNumber(config.kaleidoscopeSpeed, 0.2, 2.0, state.kaleidoscopeSpeed);
  } else if (config.kaleidoscopeSwirlStrength !== undefined) {
    // Historical values were in a much larger range (0..800-ish). Map 0..800 → 0.2..2.0.
    const legacy = clampNumber(config.kaleidoscopeSwirlStrength, 0, 800, 52);
    state.kaleidoscopeSpeed = clampNumber(0.2 + (legacy / 800) * 1.8, 0.2, 2.0, state.kaleidoscopeSpeed);
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
    state.layoutMinWallRadiusPx = clampNumber(config.layoutMinWallRadiusPx, 0, 400, state.layoutMinWallRadiusPx);
  } else {
    state.layoutMinWallRadiusPx = readTokenPx('--layout-min-wall-radius', state.layoutMinWallRadiusPx);
  }
  if (config.critterMouseRadiusVw !== undefined) state.critterMouseRadiusVw = config.critterMouseRadiusVw;
  if (config.critterRestitution !== undefined) state.critterRestitution = config.critterRestitution;
  if (config.critterFriction !== undefined) state.critterFriction = config.critterFriction;
  
  // Hive behavior
  if (config.critterHiveStirInterval !== undefined) state.critterHiveStirInterval = config.critterHiveStirInterval;
  if (config.critterHiveStirStrength !== undefined) state.critterHiveStirStrength = config.critterHiveStirStrength;
  if (config.critterHiveWaveSpeed !== undefined) state.critterHiveWaveSpeed = config.critterHiveWaveSpeed;
  
  // Character traits
  if (config.critterNervousnessMin !== undefined) state.critterNervousnessMin = config.critterNervousnessMin;
  if (config.critterNervousnessMax !== undefined) state.critterNervousnessMax = config.critterNervousnessMax;
  if (config.critterCuriosityBias !== undefined) state.critterCuriosityBias = config.critterCuriosityBias;

  // Neural (config overrides)
  if (config.neuralBallCount !== undefined) state.neuralBallCount = clampNumber(config.neuralBallCount, 8, 400, state.neuralBallCount);
  if (config.neuralLinkDistanceVw !== undefined) state.neuralLinkDistanceVw = clampNumber(config.neuralLinkDistanceVw, 1, 50, state.neuralLinkDistanceVw);
  if (config.neuralLineOpacity !== undefined) state.neuralLineOpacity = clampNumber(config.neuralLineOpacity, 0, 1, state.neuralLineOpacity);
  if (config.neuralConnectorDensity !== undefined) state.neuralConnectorDensity = clampNumber(config.neuralConnectorDensity, 0, 10, state.neuralConnectorDensity);
  if (config.neuralWanderStrength !== undefined) state.neuralWanderStrength = clampNumber(config.neuralWanderStrength, 0, 4000, state.neuralWanderStrength);
  if (config.neuralMouseStrength !== undefined) state.neuralMouseStrength = clampNumber(config.neuralMouseStrength, 0, 300000, state.neuralMouseStrength);
  if (config.neuralSeparationRadius !== undefined) state.neuralSeparationRadius = clampNumber(config.neuralSeparationRadius, 50, 300, state.neuralSeparationRadius);
  if (config.neuralSeparationStrength !== undefined) state.neuralSeparationStrength = clampNumber(config.neuralSeparationStrength, 0, 30000, state.neuralSeparationStrength);
  if (config.neuralMaxLinksPerBall !== undefined) state.neuralMaxLinksPerBall = clampNumber(config.neuralMaxLinksPerBall, 0, 16, state.neuralMaxLinksPerBall);
  if (config.neuralDamping !== undefined) state.neuralDamping = clampNumber(config.neuralDamping, 0.8, 1.0, state.neuralDamping);

  // Lattice (config overrides)

  // Parallax (config overrides)
  if (config.parallaxLinearDotCount !== undefined) state.parallaxLinearDotCount = clampNumber(config.parallaxLinearDotCount, 20, 220, state.parallaxLinearDotCount);
  if (config.parallaxLinearGridJitter !== undefined) state.parallaxLinearGridJitter = clampNumber(config.parallaxLinearGridJitter, 0, 1, state.parallaxLinearGridJitter);
  if (config.parallaxLinearFarSpeed !== undefined) state.parallaxLinearFarSpeed = clampNumber(config.parallaxLinearFarSpeed, 0, 1.5, state.parallaxLinearFarSpeed);
  if (config.parallaxLinearMidSpeed !== undefined) state.parallaxLinearMidSpeed = clampNumber(config.parallaxLinearMidSpeed, 0, 1.5, state.parallaxLinearMidSpeed);
  if (config.parallaxLinearNearSpeed !== undefined) state.parallaxLinearNearSpeed = clampNumber(config.parallaxLinearNearSpeed, 0, 1.5, state.parallaxLinearNearSpeed);
  if (config.parallaxLinearGridX !== undefined) state.parallaxLinearGridX = clampInt(config.parallaxLinearGridX, 3, 40, state.parallaxLinearGridX);
  if (config.parallaxLinearGridY !== undefined) state.parallaxLinearGridY = clampInt(config.parallaxLinearGridY, 3, 40, state.parallaxLinearGridY);
  if (config.parallaxLinearGridZ !== undefined) state.parallaxLinearGridZ = clampInt(config.parallaxLinearGridZ, 2, 20, state.parallaxLinearGridZ);
  if (config.parallaxLinearSpanX !== undefined) state.parallaxLinearSpanX = clampNumber(config.parallaxLinearSpanX, 0.2, 3.0, state.parallaxLinearSpanX);
  if (config.parallaxLinearSpanY !== undefined) state.parallaxLinearSpanY = clampNumber(config.parallaxLinearSpanY, 0.2, 3.0, state.parallaxLinearSpanY);
  if (config.parallaxLinearZNear !== undefined) state.parallaxLinearZNear = clampNumber(config.parallaxLinearZNear, 10, 1200, state.parallaxLinearZNear);
  if (config.parallaxLinearZFar !== undefined) state.parallaxLinearZFar = clampNumber(config.parallaxLinearZFar, 50, 3000, state.parallaxLinearZFar);
  if (config.parallaxLinearFocalLength !== undefined) state.parallaxLinearFocalLength = clampNumber(config.parallaxLinearFocalLength, 80, 2000, state.parallaxLinearFocalLength);
  if (config.parallaxLinearParallaxStrength !== undefined) state.parallaxLinearParallaxStrength = clampNumber(config.parallaxLinearParallaxStrength, 0, 2000, state.parallaxLinearParallaxStrength);
  if (config.parallaxLinearDotSizeMul !== undefined) state.parallaxLinearDotSizeMul = clampNumber(config.parallaxLinearDotSizeMul, 0.1, 6.0, state.parallaxLinearDotSizeMul);
  if (config.parallaxLinearFollowStrength !== undefined) state.parallaxLinearFollowStrength = clampNumber(config.parallaxLinearFollowStrength, 1, 80, state.parallaxLinearFollowStrength);
  if (config.parallaxLinearDamping !== undefined) state.parallaxLinearDamping = clampNumber(config.parallaxLinearDamping, 1, 80, state.parallaxLinearDamping);

  // Cursor explosion impact parameters
  if (config.cursorExplosionImpactMinFactor !== undefined) state.cursorExplosionImpactMinFactor = clampNumber(config.cursorExplosionImpactMinFactor, 0.1, 2.0, state.cursorExplosionImpactMinFactor);
  if (config.cursorExplosionImpactMaxFactor !== undefined) state.cursorExplosionImpactMaxFactor = clampNumber(config.cursorExplosionImpactMaxFactor, 1.0, 8.0, state.cursorExplosionImpactMaxFactor);
  if (config.cursorExplosionImpactSensitivity !== undefined) state.cursorExplosionImpactSensitivity = clampNumber(config.cursorExplosionImpactSensitivity, 100, 1000, state.cursorExplosionImpactSensitivity);
  if (config.cursorExplosionLifetimeImpactMin !== undefined) state.cursorExplosionLifetimeImpactMin = clampNumber(config.cursorExplosionLifetimeImpactMin, 0.3, 1.5, state.cursorExplosionLifetimeImpactMin);
  if (config.cursorExplosionLifetimeImpactMax !== undefined) state.cursorExplosionLifetimeImpactMax = clampNumber(config.cursorExplosionLifetimeImpactMax, 1.0, 3.0, state.cursorExplosionLifetimeImpactMax);
  if (config.cursorExplosionLifetimeImpactSensitivity !== undefined) state.cursorExplosionLifetimeImpactSensitivity = clampNumber(config.cursorExplosionLifetimeImpactSensitivity, 200, 1500, state.cursorExplosionLifetimeImpactSensitivity);
  
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
  if (config.sphere3dRadiusVw !== undefined) state.sphere3dRadiusVw = clampNumber(config.sphere3dRadiusVw, 5, 40, state.sphere3dRadiusVw);
  if (config.sphere3dDensity !== undefined) state.sphere3dDensity = clampInt(config.sphere3dDensity, 30, 600, state.sphere3dDensity);
  if (config.sphere3dFocalLength !== undefined) state.sphere3dFocalLength = clampInt(config.sphere3dFocalLength, 80, 2000, state.sphere3dFocalLength);
  if (config.sphere3dDotSizeMul !== undefined) state.sphere3dDotSizeMul = clampNumber(config.sphere3dDotSizeMul, 0.2, 4.0, state.sphere3dDotSizeMul);
  if (config.sphere3dIdleSpeed !== undefined) state.sphere3dIdleSpeed = clampNumber(config.sphere3dIdleSpeed, 0, 1, state.sphere3dIdleSpeed);
  if (config.sphere3dCursorInfluence !== undefined) state.sphere3dCursorInfluence = clampNumber(config.sphere3dCursorInfluence, 0, 4, state.sphere3dCursorInfluence);
  if (config.sphere3dTumbleSpeed !== undefined) state.sphere3dTumbleSpeed = clampNumber(config.sphere3dTumbleSpeed, 0, 10, state.sphere3dTumbleSpeed);
  if (config.sphere3dTumbleDamping !== undefined) state.sphere3dTumbleDamping = clampNumber(config.sphere3dTumbleDamping, 0.8, 0.99, state.sphere3dTumbleDamping);
  if (config.sphere3dWarmupFrames !== undefined) state.sphere3dWarmupFrames = clampInt(config.sphere3dWarmupFrames, 0, 240, state.sphere3dWarmupFrames);

  // 3D Cube (Mode 17)
  if (config.cube3dSizeVw !== undefined) state.cube3dSizeVw = clampNumber(config.cube3dSizeVw, 10, 50, state.cube3dSizeVw);
  if (config.cube3dEdgeDensity !== undefined) state.cube3dEdgeDensity = clampInt(config.cube3dEdgeDensity, 2, 30, state.cube3dEdgeDensity);
  if (config.cube3dFaceGrid !== undefined) state.cube3dFaceGrid = clampInt(config.cube3dFaceGrid, 0, 10, state.cube3dFaceGrid);
  if (config.cube3dIdleSpeed !== undefined) state.cube3dIdleSpeed = clampNumber(config.cube3dIdleSpeed, 0, 1, state.cube3dIdleSpeed);
  if (config.cube3dCursorInfluence !== undefined) state.cube3dCursorInfluence = clampNumber(config.cube3dCursorInfluence, 0, 4, state.cube3dCursorInfluence);
  if (config.cube3dTumbleSpeed !== undefined) state.cube3dTumbleSpeed = clampNumber(config.cube3dTumbleSpeed, 0, 10, state.cube3dTumbleSpeed);
  if (config.cube3dTumbleDamping !== undefined) state.cube3dTumbleDamping = clampNumber(config.cube3dTumbleDamping, 0.8, 0.99, state.cube3dTumbleDamping);
  if (config.cube3dFocalLength !== undefined) state.cube3dFocalLength = clampInt(config.cube3dFocalLength, 80, 2000, state.cube3dFocalLength);
  if (config.cube3dDotSizeMul !== undefined) state.cube3dDotSizeMul = clampNumber(config.cube3dDotSizeMul, 0.2, 4.0, state.cube3dDotSizeMul);
  if (config.cube3dFogStart !== undefined) state.cube3dFogStart = clampNumber(config.cube3dFogStart, 0, 1, state.cube3dFogStart);
  if (config.cube3dFogMin !== undefined) state.cube3dFogMin = clampNumber(config.cube3dFogMin, 0, 1, state.cube3dFogMin);
  if (config.cube3dWarmupFrames !== undefined) state.cube3dWarmupFrames = clampInt(config.cube3dWarmupFrames, 0, 240, state.cube3dWarmupFrames);

  // 3D Starfield (Mode 23)
  if (config.starfieldCount !== undefined) state.starfieldCount = clampInt(config.starfieldCount, 20, 500, state.starfieldCount);
  if (config.starfieldSpanX !== undefined) state.starfieldSpanX = clampNumber(config.starfieldSpanX, 0.4, 4.0, state.starfieldSpanX);
  if (config.starfieldSpanY !== undefined) state.starfieldSpanY = clampNumber(config.starfieldSpanY, 0.4, 4.0, state.starfieldSpanY);
  if (config.starfieldZNear !== undefined) state.starfieldZNear = clampInt(config.starfieldZNear, 20, 800, state.starfieldZNear);
  if (config.starfieldZFar !== undefined) state.starfieldZFar = clampInt(config.starfieldZFar, 400, 4000, state.starfieldZFar);
  if (config.starfieldFocalLength !== undefined) state.starfieldFocalLength = clampInt(config.starfieldFocalLength, 100, 2000, state.starfieldFocalLength);
  if (config.starfieldParallaxStrength !== undefined) state.starfieldParallaxStrength = clampInt(config.starfieldParallaxStrength, 0, 1200, state.starfieldParallaxStrength);
  if (config.starfieldSpeed !== undefined) state.starfieldSpeed = clampInt(config.starfieldSpeed, 10, 1600, state.starfieldSpeed);
  if (config.starfieldDotSizeMul !== undefined) state.starfieldDotSizeMul = clampNumber(config.starfieldDotSizeMul, 0.2, 4.0, state.starfieldDotSizeMul);
  if (config.starfieldIdleJitter !== undefined) state.starfieldIdleJitter = clampNumber(config.starfieldIdleJitter, 0, 20, state.starfieldIdleJitter);
  if (config.starfieldFadeDuration !== undefined) state.starfieldFadeDuration = clampNumber(config.starfieldFadeDuration, 0, 3, state.starfieldFadeDuration);
  if (config.starfield3dWarmupFrames !== undefined) state.starfield3dWarmupFrames = clampInt(config.starfield3dWarmupFrames, 0, 240, state.starfield3dWarmupFrames);
  

  // DVD Logo mode
  if (config.dvdLogoSpeed !== undefined) state.dvdLogoSpeed = clampInt(config.dvdLogoSpeed, 200, 800, state.dvdLogoSpeed);
  if (config.dvdLogoSize !== undefined) state.dvdLogoSize = clampNumber(config.dvdLogoSize, 0.5, 2.0, state.dvdLogoSize);
  if (config.dvdLogoBallCount !== undefined) state.dvdLogoBallCount = clampInt(config.dvdLogoBallCount, 30, 120, state.dvdLogoBallCount);
  if (config.dvdLogoBallSpacing !== undefined) state.dvdLogoBallSpacing = clampNumber(config.dvdLogoBallSpacing, 1.0, 2.0, state.dvdLogoBallSpacing);
  if (config.dvdLogoLetterSpacing !== undefined) state.dvdLogoLetterSpacing = clampNumber(config.dvdLogoLetterSpacing, 0.5, 2.0, state.dvdLogoLetterSpacing);
  if (config.dvdLogoMassMultiplier !== undefined) state.dvdLogoMassMultiplier = clampNumber(config.dvdLogoMassMultiplier, 1.0, 5.0, state.dvdLogoMassMultiplier);
  if (config.dvdLogoWarmupFrames !== undefined) state.dvdLogoWarmupFrames = clampInt(config.dvdLogoWarmupFrames, 0, 240, state.dvdLogoWarmupFrames);

  // Elastic Center mode
  if (config.elasticCenterRingCount !== undefined) state.elasticCenterRingCount = clampInt(config.elasticCenterRingCount, 2, 20, state.elasticCenterRingCount);
  if (config.elasticCenterMassMultiplier !== undefined) state.elasticCenterMassMultiplier = clampNumber(config.elasticCenterMassMultiplier, 0.5, 5.0, state.elasticCenterMassMultiplier);
  if (config.elasticCenterSpacingMultiplier !== undefined) state.elasticCenterSpacingMultiplier = clampNumber(config.elasticCenterSpacingMultiplier, 2.0, 4.0, state.elasticCenterSpacingMultiplier);
  if (config.elasticCenterElasticStrength !== undefined) state.elasticCenterElasticStrength = clampInt(config.elasticCenterElasticStrength, 0, 15000, state.elasticCenterElasticStrength);
  if (config.elasticCenterMouseRepelStrength !== undefined) state.elasticCenterMouseRepelStrength = clampInt(config.elasticCenterMouseRepelStrength, 3000, 25000, state.elasticCenterMouseRepelStrength);
  if (config.elasticCenterMouseRadius !== undefined) state.elasticCenterMouseRadius = clampInt(config.elasticCenterMouseRadius, 50, 400, state.elasticCenterMouseRadius);
  if (config.elasticCenterDamping !== undefined) state.elasticCenterDamping = clampNumber(config.elasticCenterDamping, 0.85, 0.99, state.elasticCenterDamping);
  if (config.elasticCenterWarmupFrames !== undefined) state.elasticCenterWarmupFrames = clampInt(config.elasticCenterWarmupFrames, 0, 240, state.elasticCenterWarmupFrames);



  // Particle Fountain mode (simplified, water-like)
  if (config.particleFountainEmissionRate !== undefined) state.particleFountainEmissionRate = clampInt(config.particleFountainEmissionRate, 5, 100, state.particleFountainEmissionRate);
  if (config.particleFountainInitialVelocity !== undefined) state.particleFountainInitialVelocity = clampInt(config.particleFountainInitialVelocity, 200, 10000, state.particleFountainInitialVelocity);
  if (config.particleFountainSpreadAngle !== undefined) state.particleFountainSpreadAngle = clampInt(config.particleFountainSpreadAngle, 10, 120, state.particleFountainSpreadAngle);
  if (config.particleFountainWaterDrag !== undefined) state.particleFountainWaterDrag = clampNumber(config.particleFountainWaterDrag, 0.01, 0.2, state.particleFountainWaterDrag);
  if (config.particleFountainGravityMultiplier !== undefined) state.particleFountainGravityMultiplier = clampNumber(config.particleFountainGravityMultiplier, 0, 2.0, state.particleFountainGravityMultiplier);
  if (config.particleFountainUpwardForce !== undefined) state.particleFountainUpwardForce = clampInt(config.particleFountainUpwardForce, 0, 800, state.particleFountainUpwardForce);
  if (config.particleFountainMaxParticles !== undefined) state.particleFountainMaxParticles = clampInt(config.particleFountainMaxParticles, 20, 300, state.particleFountainMaxParticles);
  if (config.particleFountainLifetime !== undefined) state.particleFountainLifetime = clampNumber(config.particleFountainLifetime, 1.0, 30.0, state.particleFountainLifetime);
  if (config.particleFountainMouseRepelStrength !== undefined) state.particleFountainMouseRepelStrength = clampInt(config.particleFountainMouseRepelStrength, 10000, 100000, state.particleFountainMouseRepelStrength);
  if (config.particleFountainMouseRepelRadiusVw !== undefined) state.particleFountainMouseRepelRadiusVw = clampNumber(config.particleFountainMouseRepelRadiusVw, 1.0, 20.0, state.particleFountainMouseRepelRadiusVw);
  if (config.particleFountainWarmupFrames !== undefined) state.particleFountainWarmupFrames = clampInt(config.particleFountainWarmupFrames, 0, 240, state.particleFountainWarmupFrames);

  // Clamp scene micro-reaction tuning (defensive; UI-only)
  if (config.sceneImpactEnabled !== undefined) {
    state.sceneImpactEnabled = Boolean(config.sceneImpactEnabled);
  }
  if (config.sceneImpactMul !== undefined) {
    state.sceneImpactMul = clampNumber(config.sceneImpactMul, 0, 0.05, state.sceneImpactMul);
  } else if (config.brandLogoImpactMul !== undefined) {
    // Back-compat: reuse old logo tuning if scene tuning is absent.
    state.sceneImpactMul = clampNumber(config.brandLogoImpactMul, 0, 0.05, state.sceneImpactMul);
  }
  if (config.sceneImpactMobileMulFactor !== undefined) {
    state.sceneImpactMobileMulFactor = clampNumber(config.sceneImpactMobileMulFactor, 0.25, 3.0, state.sceneImpactMobileMulFactor);
  }
  if (config.sceneImpactLogoCompMul !== undefined) {
    state.sceneImpactLogoCompMul = clampNumber(config.sceneImpactLogoCompMul, 0.25, 6.0, state.sceneImpactLogoCompMul);
  }
  if (config.sceneImpactOvershoot !== undefined) {
    state.sceneImpactOvershoot = clampNumber(config.sceneImpactOvershoot, 0, 0.8, state.sceneImpactOvershoot);
  } else if (config.brandLogoOvershoot !== undefined) {
    state.sceneImpactOvershoot = clampNumber(config.brandLogoOvershoot, 0, 0.8, state.sceneImpactOvershoot);
  }
  if (config.sceneImpactAnticipation !== undefined) {
    state.sceneImpactAnticipation = clampNumber(config.sceneImpactAnticipation, 0, 0.6, state.sceneImpactAnticipation);
  } else if (config.brandLogoAnticipation !== undefined) {
    state.sceneImpactAnticipation = clampNumber(config.brandLogoAnticipation, 0, 0.6, state.sceneImpactAnticipation);
  }
  if (config.sceneImpactPressMs !== undefined) {
    state.sceneImpactPressMs = clampNumber(config.sceneImpactPressMs, 20, 300, state.sceneImpactPressMs);
  } else if (config.brandLogoPressMs !== undefined) {
    state.sceneImpactPressMs = clampNumber(config.brandLogoPressMs, 20, 300, state.sceneImpactPressMs);
  }
  if (config.sceneImpactReleaseMs !== undefined) {
    state.sceneImpactReleaseMs = clampNumber(config.sceneImpactReleaseMs, 40, 1200, state.sceneImpactReleaseMs);
  } else if (config.brandLogoReleaseMs !== undefined) {
    state.sceneImpactReleaseMs = clampNumber(config.brandLogoReleaseMs, 40, 1200, state.sceneImpactReleaseMs);
  }

  // Scene change SFX
  if (config.sceneChangeSoundEnabled !== undefined) state.sceneChangeSoundEnabled = Boolean(config.sceneChangeSoundEnabled);
  if (config.sceneChangeSoundIntensity !== undefined) state.sceneChangeSoundIntensity = clampNumber(config.sceneChangeSoundIntensity, 0, 1, state.sceneChangeSoundIntensity);
  if (config.sceneChangeSoundRadius !== undefined) state.sceneChangeSoundRadius = clampNumber(config.sceneChangeSoundRadius, 6, 60, state.sceneChangeSoundRadius);
  
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
    state.edgeLabelInsetAdjustPx = clampNumber(config.edgeLabelInsetAdjustPx, -500, 500, state.edgeLabelInsetAdjustPx);
  }
  if (config.edgeCaptionDistanceMinPx !== undefined) {
    state.edgeCaptionDistanceMinPx = clampInt(config.edgeCaptionDistanceMinPx, 0, 200, state.edgeCaptionDistanceMinPx);
  }
  if (config.edgeCaptionDistanceMaxPx !== undefined) {
    state.edgeCaptionDistanceMaxPx = clampInt(config.edgeCaptionDistanceMaxPx, 0, 400, state.edgeCaptionDistanceMaxPx);
  }
  if (config.simulationOverlayIntensity !== undefined) {
    state.simulationOverlayIntensity = clampNumber(config.simulationOverlayIntensity, 0, 1, state.simulationOverlayIntensity);
  }
  // Depth wash configuration
  if (config.depthWashOpacity !== undefined) {
    state.depthWashOpacity = clampNumber(config.depthWashOpacity, 0, 1, state.depthWashOpacity);
  }
  const validCanvasBlendModes = ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'];
  if (config.depthWashBlendModeLight !== undefined) {
    const v = String(config.depthWashBlendModeLight);
    state.depthWashBlendModeLight = validCanvasBlendModes.includes(v) ? v : state.depthWashBlendModeLight;
  }
  if (config.depthWashBlendModeDark !== undefined) {
    const v = String(config.depthWashBlendModeDark);
    state.depthWashBlendModeDark = validCanvasBlendModes.includes(v) ? v : state.depthWashBlendModeDark;
  }
  if (config.depthWashCenterY !== undefined) state.depthWashCenterY = clampNumber(config.depthWashCenterY, 0, 1, state.depthWashCenterY);
  if (config.depthWashRadiusScale !== undefined) state.depthWashRadiusScale = clampNumber(config.depthWashRadiusScale, 0.2, 3, state.depthWashRadiusScale);
  if (config.depthWashCenterColorLight !== undefined) state.depthWashCenterColorLight = String(config.depthWashCenterColorLight);
  if (config.depthWashEdgeColorLight !== undefined) state.depthWashEdgeColorLight = String(config.depthWashEdgeColorLight);
  if (config.depthWashCenterAlphaLight !== undefined) state.depthWashCenterAlphaLight = clampNumber(config.depthWashCenterAlphaLight, 0, 1, state.depthWashCenterAlphaLight);
  if (config.depthWashEdgeAlphaLight !== undefined) state.depthWashEdgeAlphaLight = clampNumber(config.depthWashEdgeAlphaLight, 0, 1, state.depthWashEdgeAlphaLight);
  if (config.depthWashCenterColorDark !== undefined) state.depthWashCenterColorDark = String(config.depthWashCenterColorDark);
  if (config.depthWashEdgeColorDark !== undefined) state.depthWashEdgeColorDark = String(config.depthWashEdgeColorDark);
  if (config.depthWashCenterAlphaDark !== undefined) state.depthWashCenterAlphaDark = clampNumber(config.depthWashCenterAlphaDark, 0, 1, state.depthWashCenterAlphaDark);
  if (config.depthWashEdgeAlphaDark !== undefined) state.depthWashEdgeAlphaDark = clampNumber(config.depthWashEdgeAlphaDark, 0, 1, state.depthWashEdgeAlphaDark);

  // UI layout knobs (CSS var driven)
  if (config.topLogoWidthVw !== undefined) {
    state.topLogoWidthVw = clampNumber(config.topLogoWidthVw, 0, 120, state.topLogoWidthVw);
  }
  if (config.homeMainLinksBelowLogoPx !== undefined) {
    state.homeMainLinksBelowLogoPx = clampNumber(config.homeMainLinksBelowLogoPx, -500, 500, state.homeMainLinksBelowLogoPx);
  }
  if (config.footerNavBarTopVh !== undefined) {
    state.footerNavBarTopVh = clampNumber(config.footerNavBarTopVh, 0, 100, state.footerNavBarTopVh);
  }
  if (config.footerNavBarGapVw !== undefined) {
    state.footerNavBarGapVw = clampNumber(config.footerNavBarGapVw, 0, 30, state.footerNavBarGapVw);
  }

  // Link colors
  if (config.linkHoverColor !== undefined) state.linkHoverColor = config.linkHoverColor;
  else state.linkHoverColor = readTokenVar('--link-hover-color', state.linkHoverColor);

  // Link controls (hit areas + interaction)
  if (config.uiHitAreaMul !== undefined) {
    state.uiHitAreaMul = clampNumber(config.uiHitAreaMul, 0.5, 3.0, state.uiHitAreaMul);
  }
  if (config.uiIconCornerRadiusMul !== undefined) {
    state.uiIconCornerRadiusMul = clampNumber(config.uiIconCornerRadiusMul, 0.0, 1.0, state.uiIconCornerRadiusMul);
  }
  if (config.uiIconFramePx !== undefined) {
    state.uiIconFramePx = clampInt(config.uiIconFramePx, 0, 240, state.uiIconFramePx);
  } else {
    state.uiIconFramePx = clampInt(readTokenPx('--ui-icon-frame-size', state.uiIconFramePx), 0, 240, state.uiIconFramePx);
  }
  if (config.uiIconGlyphPx !== undefined) {
    state.uiIconGlyphPx = clampInt(config.uiIconGlyphPx, 0, 120, state.uiIconGlyphPx);
  } else {
    state.uiIconGlyphPx = clampInt(readTokenPx('--ui-icon-glyph-size', state.uiIconGlyphPx), 0, 120, state.uiIconGlyphPx);
  }
  if (config.uiIconGroupMarginPx !== undefined) {
    state.uiIconGroupMarginPx = clampInt(config.uiIconGroupMarginPx, -200, 200, state.uiIconGroupMarginPx);
  } else {
    state.uiIconGroupMarginPx = clampInt(readTokenPx('--ui-icon-group-margin', state.uiIconGroupMarginPx), -200, 200, state.uiIconGroupMarginPx);
  }

  // Layout: content padding clamp mode (area-based)
  if (config.linkTextPadding !== undefined) {
    state.linkTextPadding = clampNumber(config.linkTextPadding, 0, 200, state.linkTextPadding);
  }
  if (config.linkIconPadding !== undefined) {
    state.linkIconPadding = clampNumber(config.linkIconPadding, 0, 200, state.linkIconPadding);
  }
  if (config.linkColorInfluence !== undefined) {
    state.linkColorInfluence = clampNumber(config.linkColorInfluence, 0, 1, state.linkColorInfluence);
  }
  if (config.linkImpactScale !== undefined) {
    state.linkImpactScale = clampNumber(config.linkImpactScale, 0.5, 1.0, state.linkImpactScale);
  }
  if (config.linkImpactBlur !== undefined) {
    state.linkImpactBlur = clampNumber(config.linkImpactBlur, 0, 40, state.linkImpactBlur);
  }
  if (config.linkImpactDuration !== undefined) {
    state.linkImpactDuration = clampInt(config.linkImpactDuration, 0, 3000, state.linkImpactDuration);
  }
  if (config.linkHoverNudge !== undefined) {
    state.linkHoverNudge = clampNumber(config.linkHoverNudge, 0, 4, state.linkHoverNudge);
  }
  if (config.linkHoverIntensityLight !== undefined) {
    state.linkHoverIntensityLight = clampNumber(config.linkHoverIntensityLight, 0, 1, state.linkHoverIntensityLight);
  }
  if (config.linkHoverIntensityDark !== undefined) {
    state.linkHoverIntensityDark = clampNumber(config.linkHoverIntensityDark, 0, 1, state.linkHoverIntensityDark);
  }
  if (config.linkHoverIntensityActive !== undefined) {
    state.linkHoverIntensityActive = clampNumber(config.linkHoverIntensityActive, 0, 1, state.linkHoverIntensityActive);
  }

  // Hover target snap/bounce (scale-only; colors remain instant)
  if (config.hoverSnapEnabled !== undefined) {
    state.hoverSnapEnabled = Boolean(config.hoverSnapEnabled);
  }
  if (config.hoverSnapDuration !== undefined) {
    state.hoverSnapDuration = clampInt(config.hoverSnapDuration, 0, 2000, state.hoverSnapDuration);
  }
  if (config.hoverSnapOvershoot !== undefined) {
    state.hoverSnapOvershoot = clampNumber(config.hoverSnapOvershoot, 1.0, 1.35, state.hoverSnapOvershoot);
  }
  if (config.hoverSnapUndershoot !== undefined) {
    state.hoverSnapUndershoot = clampNumber(config.hoverSnapUndershoot, 0.7, 1.0, state.hoverSnapUndershoot);
  }
  
  // Logo colors derive from CSS (`--text-primary`) now; no config wiring needed.

  // Procedural noise (no GIF): texture + motion + look
  if (config.noiseEnabled !== undefined) state.noiseEnabled = Boolean(config.noiseEnabled);
  if (config.noiseSeed !== undefined) state.noiseSeed = clampInt(config.noiseSeed, 0, 999999, state.noiseSeed);
  if (config.noiseTextureSize !== undefined) state.noiseTextureSize = clampInt(config.noiseTextureSize, 64, 512, state.noiseTextureSize);
  if (config.noiseDistribution !== undefined) {
    const v = String(config.noiseDistribution);
    state.noiseDistribution = (v === 'uniform' || v === 'gaussian') ? v : state.noiseDistribution;
  }
  if (config.noiseMonochrome !== undefined) state.noiseMonochrome = Boolean(config.noiseMonochrome);
  if (config.noiseChroma !== undefined) state.noiseChroma = clampNumber(config.noiseChroma, 0, 1, state.noiseChroma);
  if (config.noiseMotion !== undefined) {
    const v = String(config.noiseMotion);
    state.noiseMotion = (v === 'jitter' || v === 'drift' || v === 'static') ? v : state.noiseMotion;
  }
  if (config.noiseMotionAmount !== undefined) state.noiseMotionAmount = clampNumber(config.noiseMotionAmount, 0, 2.5, state.noiseMotionAmount);
  if (config.noiseSpeedMs !== undefined) state.noiseSpeedMs = clampInt(config.noiseSpeedMs, 0, 10000, state.noiseSpeedMs);
  if (config.noiseSpeedVariance !== undefined) state.noiseSpeedVariance = clampNumber(config.noiseSpeedVariance, 0, 1, state.noiseSpeedVariance);
  if (config.noiseFlicker !== undefined) state.noiseFlicker = clampNumber(config.noiseFlicker, 0, 1, state.noiseFlicker);
  if (config.noiseFlickerSpeedMs !== undefined) state.noiseFlickerSpeedMs = clampInt(config.noiseFlickerSpeedMs, 0, 5000, state.noiseFlickerSpeedMs);
  if (config.noiseBlurPx !== undefined) state.noiseBlurPx = clampNumber(config.noiseBlurPx, 0, 6, state.noiseBlurPx);
  if (config.noiseContrast !== undefined) state.noiseContrast = clampNumber(config.noiseContrast, 0.25, 5, state.noiseContrast);
  if (config.noiseBrightness !== undefined) state.noiseBrightness = clampNumber(config.noiseBrightness, 0.25, 3, state.noiseBrightness);
  if (config.noiseSaturation !== undefined) state.noiseSaturation = clampNumber(config.noiseSaturation, 0, 3, state.noiseSaturation);
  if (config.noiseHue !== undefined) state.noiseHue = clampNumber(config.noiseHue, 0, 360, state.noiseHue);
  if (config.noiseSize !== undefined) state.noiseSize = clampNumber(config.noiseSize, 20, 600, state.noiseSize);
  if (config.noiseOpacity !== undefined) state.noiseOpacity = clampNumber(config.noiseOpacity, 0, 1, state.noiseOpacity);
  if (config.noiseOpacityLight !== undefined) state.noiseOpacityLight = clampNumber(config.noiseOpacityLight, 0, 1, state.noiseOpacityLight);
  if (config.noiseOpacityDark !== undefined) state.noiseOpacityDark = clampNumber(config.noiseOpacityDark, 0, 1, state.noiseOpacityDark);
  if (config.noiseBlendMode !== undefined) {
    const validModes = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'];
    const v = String(config.noiseBlendMode);
    state.noiseBlendMode = validModes.includes(v) ? v : state.noiseBlendMode;
  }
  if (config.noiseColorLight !== undefined) state.noiseColorLight = String(config.noiseColorLight);
  if (config.noiseColorDark !== undefined) state.noiseColorDark = String(config.noiseColorDark);
  if (config.detailNoiseOpacity !== undefined) state.detailNoiseOpacity = clampNumber(config.detailNoiseOpacity, 0, 1, state.detailNoiseOpacity);
  
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
  
  // Grunge video overlay settings
  if (config.grungeVideoEnabled !== undefined) state.grungeVideoEnabled = config.grungeVideoEnabled;
  if (config.grungeVideoOpacity !== undefined) state.grungeVideoOpacity = config.grungeVideoOpacity;
  if (config.grungeVideoBlendMode !== undefined) state.grungeVideoBlendMode = config.grungeVideoBlendMode;
  
  // Outer wall settings (edge lighting, shadows)
  if (config.outerWallEdgeEnabled !== undefined) state.outerWallEdgeEnabled = config.outerWallEdgeEnabled;
  if (config.outerWallEdgeWidth !== undefined) state.outerWallEdgeWidth = config.outerWallEdgeWidth;
  if (config.outerWallGradientRadius !== undefined) state.outerWallGradientRadius = config.outerWallGradientRadius;
  if (config.outerWallTopDarkOpacityLight !== undefined) state.outerWallTopDarkOpacityLight = config.outerWallTopDarkOpacityLight;
  if (config.outerWallTopDarkOpacityDark !== undefined) state.outerWallTopDarkOpacityDark = config.outerWallTopDarkOpacityDark;
  if (config.outerWallBottomLightOpacityLight !== undefined) state.outerWallBottomLightOpacityLight = config.outerWallBottomLightOpacityLight;
  if (config.outerWallBottomLightOpacityDark !== undefined) state.outerWallBottomLightOpacityDark = config.outerWallBottomLightOpacityDark;
  if (config.outerWallBottomLightStrokeWidth !== undefined) state.outerWallBottomLightStrokeWidth = config.outerWallBottomLightStrokeWidth;
  if (config.outerWallCastShadowOpacityLight !== undefined) state.outerWallCastShadowOpacityLight = config.outerWallCastShadowOpacityLight;
  if (config.outerWallCastShadowOpacityDark !== undefined) state.outerWallCastShadowOpacityDark = config.outerWallCastShadowOpacityDark;
  if (config.outerWallCastShadowBlur !== undefined) state.outerWallCastShadowBlur = config.outerWallCastShadowBlur;
  if (config.outerWallCastShadowOffset !== undefined) state.outerWallCastShadowOffset = config.outerWallCastShadowOffset;
  if (config.outerWallRadiusAdjust !== undefined) state.outerWallRadiusAdjust = config.outerWallRadiusAdjust;
  
  // Inner wall settings (edge lighting, shadows, glow)
  if (config.innerWallTopBevelWidth !== undefined) state.innerWallTopBevelWidth = config.innerWallTopBevelWidth;
  if (config.innerWallGradientRadius !== undefined) state.innerWallGradientRadius = config.innerWallGradientRadius;
  if (config.innerWallTopLightOpacityLight !== undefined) state.innerWallTopLightOpacityLight = config.innerWallTopLightOpacityLight;
  if (config.innerWallTopLightOpacityDark !== undefined) state.innerWallTopLightOpacityDark = config.innerWallTopLightOpacityDark;
  if (config.innerWallTopLightStrokeWidth !== undefined) state.innerWallTopLightStrokeWidth = config.innerWallTopLightStrokeWidth;
  if (config.innerWallTopBevelOpacityLight !== undefined) state.innerWallTopBevelOpacityLight = config.innerWallTopBevelOpacityLight;
  if (config.innerWallTopBevelOpacityDark !== undefined) state.innerWallTopBevelOpacityDark = config.innerWallTopBevelOpacityDark;
  if (config.innerWallOutwardShadowOpacityLight !== undefined) state.innerWallOutwardShadowOpacityLight = config.innerWallOutwardShadowOpacityLight;
  if (config.innerWallOutwardShadowOpacityDark !== undefined) state.innerWallOutwardShadowOpacityDark = config.innerWallOutwardShadowOpacityDark;
  if (config.innerWallOutwardShadowBlur !== undefined) state.innerWallOutwardShadowBlur = config.innerWallOutwardShadowBlur;
  if (config.innerWallOutwardShadowOffset !== undefined) state.innerWallOutwardShadowOffset = config.innerWallOutwardShadowOffset;
  if (config.innerWallOutwardShadowSpread !== undefined) state.innerWallOutwardShadowSpread = config.innerWallOutwardShadowSpread;
  // Inner glow (inset white glow)
  if (config.innerWallInnerGlowOpacityLight !== undefined) state.innerWallInnerGlowOpacityLight = config.innerWallInnerGlowOpacityLight;
  if (config.innerWallInnerGlowOpacityDark !== undefined) state.innerWallInnerGlowOpacityDark = config.innerWallInnerGlowOpacityDark;
  if (config.innerWallInnerGlowBlur !== undefined) state.innerWallInnerGlowBlur = config.innerWallInnerGlowBlur;
  if (config.innerWallInnerGlowSpread !== undefined) state.innerWallInnerGlowSpread = config.innerWallInnerGlowSpread;
  if (config.innerWallInnerGlowOffsetY !== undefined) state.innerWallInnerGlowOffsetY = config.innerWallInnerGlowOffsetY;
  if (config.innerWallInnerGlowColor !== undefined) state.innerWallInnerGlowColor = config.innerWallInnerGlowColor;
  
  // Ball sizes are recalculated in detectResponsiveScale (called above)
  // which applies both sizeScale and responsiveScale

  // ─────────────────────────────────────────────────────────────────────────────
  // Layout: vw-native inputs + backwards-compatible px migration
  // ─────────────────────────────────────────────────────────────────────────────
  const basisW = getLayoutViewportWidthPx();

  // Canonical vw keys (preferred)
  if (config.containerBorderVw !== undefined) state.containerBorderVw = clampNumber(config.containerBorderVw, 0, 20, state.containerBorderVw);
  if (config.simulationPaddingVw !== undefined) state.simulationPaddingVw = clampNumber(config.simulationPaddingVw, 0, 20, state.simulationPaddingVw);
  if (config.contentPaddingRatio !== undefined) {
    const v = Number(config.contentPaddingRatio);
    if (Number.isFinite(v)) {
      // Back-compat: treat large values as legacy px (allow negatives), otherwise clamp as fraction.
      state.contentPaddingRatio = (Math.abs(v) > 1)
        ? clampNumber(v, -500, 500, state.contentPaddingRatio)
        : clampNumber(v, -0.2, 0.2, state.contentPaddingRatio);
    }
  }
  if (config.contentPaddingHorizontalRatio !== undefined) state.contentPaddingHorizontalRatio = clampNumber(config.contentPaddingHorizontalRatio, 0.1, 3.0, state.contentPaddingHorizontalRatio);
  if (config.contentPaddingBottomRatio !== undefined) {
    state.contentPaddingBottomRatio = clampNumber(config.contentPaddingBottomRatio, 0.5, 2.5, 1.3);
    document.documentElement.style.setProperty('--abs-content-pad-mul-bottom', String(state.contentPaddingBottomRatio));
  }
  if (config.mobileWallThicknessXFactor !== undefined) state.mobileWallThicknessXFactor = clampNumber(config.mobileWallThicknessXFactor, 0.5, 3.0, state.mobileWallThicknessXFactor);
  if (config.desktopWallThicknessFactor !== undefined) state.desktopWallThicknessFactor = clampNumber(config.desktopWallThicknessFactor, 0.5, 3.0, state.desktopWallThicknessFactor);
  if (config.mobileEdgeLabelsVisible !== undefined) state.mobileEdgeLabelsVisible = !!config.mobileEdgeLabelsVisible;
  if (config.wallRadiusVw !== undefined) state.wallRadiusVw = clampNumber(config.wallRadiusVw, 0, 40, state.wallRadiusVw);
  if (config.wallThicknessVw !== undefined) state.wallThicknessVw = clampNumber(config.wallThicknessVw, 0, 20, state.wallThicknessVw);
  if (config.wallThicknessAreaMultiplier !== undefined) state.wallThicknessAreaMultiplier = clampNumber(config.wallThicknessAreaMultiplier, 0, 10, state.wallThicknessAreaMultiplier);
  if (config.wallThicknessMinPx !== undefined) state.wallThicknessMinPx = clampNumber(config.wallThicknessMinPx, 0, 200, state.wallThicknessMinPx);
  if (config.wallThicknessMaxPx !== undefined) state.wallThicknessMaxPx = clampNumber(config.wallThicknessMaxPx, 0, 200, state.wallThicknessMaxPx);

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

export function getState() {
  return state;
}

export function getGlobals() {
  return state;
}

/**
 * Mobile performance helper: apply `mobileObjectReductionFactor` to any
 * mode count/size that represents “number of objects”. On non-mobile,
 * returns the base count unchanged.
 */
export function getMobileAdjustedCount(baseCount) {
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

export function getConfig() {
  return state.config;
}

export function setCanvas(canvas, ctx, container) {
  state.canvas = canvas;
  state.ctx = ctx;
  state.container = container;
}

export function setMode(mode) {
  state.currentMode = mode;
}

export function getBalls() {
  return state.balls;
}

export function clearBalls() {
  state.balls.length = 0;
}

/**
 * Detect device type and apply responsive ball sizing
 * Ball size interpolates between ballSizeMin and ballSizeMax based on viewport width.
 */
export function detectResponsiveScale() {
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

  const didDeviceChange =
    state.isMobile !== nextMobileDevice ||
    state.isMobileViewport !== nextMobileViewport;

  if (didDeviceChange) {
    state.isMobile = nextMobileDevice;
    state.isMobileViewport = nextMobileViewport;
    
    // Mobile performance optimizations
    if (state.isMobile || state.isMobileViewport) {
      state.physicsCollisionIterations = 4;
      state.mouseTrailEnabled = false;
    }
  }

  // Store previous ball size to detect if update needed
  const prevSize = state.R_MED;
  
  // Update ball sizes based on viewport width (always runs to handle continuous sizing)
  updateBallSizes();
  
  // Update existing balls only if size actually changed
  const newSize = state.R_MED;
  if (Math.abs(newSize - prevSize) > 0.1) {
    try {
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
}

/**
 * Update ball sizes based on viewport width (responsive clamping)
 * Interpolates between ballSizeMin and ballSizeMax based on viewport width.
 * The curve parameter controls easing: 1=linear, >1=stays smaller longer, <1=grows faster.
 */
export function updateBallSizes() {
  const minSize = state.ballSizeMin || 22;
  const maxSize = state.ballSizeMax || 30;
  const bpMin = state.ballSizeBreakpointMin || 320;
  const bpMax = state.ballSizeBreakpointMax || 1920;
  const curve = state.ballSizeCurve || 1;
  
  // Get current viewport width
  const viewportWidth = getLayoutViewportWidthPx();
  
  // Calculate linear interpolation factor (0 at bpMin, 1 at bpMax)
  const tLinear = Math.max(0, Math.min(1, (viewportWidth - bpMin) / (bpMax - bpMin)));
  
  // Apply curve: t^curve makes it stay smaller longer when curve > 1
  const t = Math.pow(tLinear, curve);
  
  // Interpolation between min and max sizes
  const size = minSize + (maxSize - minSize) * t;
  
  state.R_MED = size;
  state.R_MIN = size;
  state.R_MAX = size;
}
