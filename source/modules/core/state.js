// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       STATE STORE (OPTIMIZED)                               ║
// ║               All global state - extracted from balls-source.html            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES } from './constants.js';

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
  contentPaddingVw: 0,      // padding for content blocks inside frame (vw)
  contentPaddingHorizontalRatio: 1.0, // horizontal padding = base × ratio (>1 = wider sides)
  mobileWallThicknessFactor: 1.0,     // wall thickness multiplier on mobile (1.0 = same as desktop)
  mobileEdgeLabelsVisible: true,     // whether to show edge labels on mobile (default: visible)
  wallRadiusVw: 0,          // corner radius (vw) (also drives physics corner collision)
  wallThicknessVw: 0,       // wall tube thickness (vw)

  // Noise texture opacity (visual overlay)
  noiseBackOpacity: 0.025,        // back layer opacity (light mode)
  noiseFrontOpacity: 0.055,       // front layer opacity (light mode)
  noiseBackOpacityDark: 0.12,     // back layer opacity (dark mode)
  noiseFrontOpacityDark: 0.08,    // front layer opacity (dark mode)

  // Minimum clamp targets (px)
  // These define the “clamp down towards” values on small viewports, where vw-derived
  // padding/radius can become too tight. Kept here so:
  // - The clamp logic uses the same source of truth
  // - The control panel can display the effective minimums
  layoutMinContentPaddingPx: 16,
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
  pingPongCursorRadius: 100,
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
  sceneImpactMul: 0.004,        // scale depth per unit impact (0.4%, kept subtle to avoid snap)
  // Mobile-only multiplier applied on top of sceneImpactMul.
  // Allows “more depth” on small screens without re-tuning desktop.
  sceneImpactMobileMulFactor: 1.0,
  sceneImpactOvershoot: 0.22,   // release overshoot amount (unitless)
  sceneImpactAnticipation: 0.0, // micro pre-pop opposite direction; 0 disables
  sceneImpactPressMs: 75,       // ms (press-in duration)
  sceneImpactReleaseMs: 220,    // ms (bounce-out duration)

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
  containerBorder: 20,   // Outer: insets container from viewport (reveals body bg as frame)
  simulationPadding: 0,  // Inner: padding inside container around canvas

  // Text wrapper padding (in pixels) for UI text blocks (legend, top-right statement)
  contentPadding: 40,    // Space between frame edge and content elements (base)
  contentPaddingX: 40,   // Horizontal padding (derived: base × horizontalRatio)
  contentPaddingY: 40,   // Vertical padding (always = base)

  // Container inner shadow removed
  
  // Unified Color System (backgrounds, frame, walls)
  bgLight: '#f5f5f5',       // Light mode background color
  bgDark: '#0a0a0a',        // Dark mode background color
  frameColor: '#0a0a0a',    // Frame color (browser chrome + walls + border)
  
  // Text Colors
  textColorLight: '#161616',          // Primary text (light mode)
  textColorLightMuted: '#2f2f2f',     // Secondary/muted text (light mode)
  textColorDark: 'rgba(255,255,255,0.7)',  // Primary text (dark mode)
  textColorDarkMuted: 'rgba(255,255,255,0.5)', // Secondary/muted text (dark mode)
  // Edge labels (vertical chapter/copyright) — independently tunable from body text
  edgeLabelColorLight: '#2f2f2f',
  edgeLabelColorDark: '#b3b3b3',
  edgeLabelInsetAdjustPx: 0,
  
  // Link Colors
  linkHoverColor: '#ff4013',          // Link hover accent (shared)
  
  // Logo Colors
  logoColorLight: '#161616',          // Logo color (light mode)
  logoColorDark: '#d5d5d5',           // Logo color (dark mode)
  wallThickness: 12,        // Unified: wall tubes + body border (px)
  wallRadius: 42,           // Corner radius - shared by all rounded elements (px)
  wallInset: 3,             // Physics-only inset from edges (px at DPR 1)

  // Rubber wall wobble tuning (visual-only deformation, no collision changes)
  // High-level controls (0-100)
  wallPreset: 'rubber',             // Preset name: rubber, trampoline, jelly, stiff
  wallSoftness: 50,                 // Legacy support / manual tweak
  wallBounciness: 50,               // Legacy support / manual tweak
  
  // Low-level parameters (derived from above or set manually)
  wallWobbleMaxDeform: 45,          // Max inward deformation (px at DPR 1)
  wallWobbleStiffness: 2200,        // Spring stiffness (higher = snappier)
  wallWobbleDamping: 35,            // Spring damping (higher = less oscillation)
  wallWobbleSigma: 2.0,             // Impact spread (gaussian sigma in segment units)
  wallWobbleCornerClamp: 0.60,      // Corner stickiness (0 = free, 1 = fully pinned)
  
  // Settling parameters (Advanced)
  wallWobbleImpactThreshold: 140,   // Min velocity (px/s) to trigger wobble
  wallWobbleSettlingSpeed: 75,      // Controls snap-to-zero aggression (0-100)
  
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

  const borderPx = vwToPx(state.containerBorderVw, w);
  const simPadPx = vwToPx(state.simulationPaddingVw, w);
  const contentPadPx = vwToPx(state.contentPaddingVw, w);
  const radiusPx = vwToPx(state.wallRadiusVw, w);

  const minContentPaddingPx = Math.max(0, Math.round(state.layoutMinContentPaddingPx || 0));
  const minWallRadiusPx = Math.max(0, Math.round(state.layoutMinWallRadiusPx || 0));

  // If wallThicknessVw is not set, default it to containerBorderVw (keeps “frame”
  // control behavior consistent with the current panel’s linked thickness).
  const thicknessVw = (Number.isFinite(state.wallThicknessVw) && state.wallThicknessVw > 0)
    ? state.wallThicknessVw
    : state.containerBorderVw;
  const thicknessPx = vwToPx(thicknessVw, w);

  const isMobileLayout = state.isMobile || state.isMobileViewport;
  
  // Apply mobile wall thickness factor to both containerBorder and wallThickness
  // (they both control the visual frame appearance)
  const mobileWallFactor = isMobileLayout
    ? Math.max(0.5, state.mobileWallThicknessFactor || 1.0)
    : 1.0;
  
  state.containerBorder = Math.round(borderPx * mobileWallFactor);
  state.simulationPadding = Math.round(simPadPx);
  state.contentPadding = Math.max(minContentPaddingPx, Math.round(contentPadPx));
  
  // Derive directional padding: horizontal = base × ratio, vertical = base
  const horizRatio = Math.max(0.1, state.contentPaddingHorizontalRatio || 1.0);
  state.contentPaddingY = state.contentPadding;
  state.contentPaddingX = Math.round(state.contentPadding * horizRatio);
  
  state.wallRadius = Math.max(minWallRadiusPx, Math.round(radiusPx));
  state.cornerRadius = state.wallRadius;
  
  state.wallThickness = Math.round(thicknessPx * mobileWallFactor);

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

export function applyLayoutCSSVars() {
  // Single place that stamps layout CSS vars from the derived px fields.
  // Keeps CSS + physics aligned, and allows vw-based tuning without touching
  // performance-sensitive paths.
  const root = document.documentElement;
  
  // Calculate mobile factor for CSS vars
  const isMobileLayout = state.isMobile || state.isMobileViewport;
  const mobileWallFactor = isMobileLayout
    ? Math.max(0.5, state.mobileWallThicknessFactor || 1.0)
    : 1.0;
  
  // Set all layout CSS vars (px values override CSS calcs)
  root.style.setProperty('--container-border', `${state.containerBorder}px`);
  root.style.setProperty('--simulation-padding', `${state.simulationPadding}px`);
  root.style.setProperty('--content-padding', `${state.contentPadding}px`);
  root.style.setProperty('--content-padding-x', `${state.contentPaddingX}px`);
  root.style.setProperty('--content-padding-y', `${state.contentPaddingY}px`);
  root.style.setProperty('--wall-radius', `${state.wallRadius}px`);
  root.style.setProperty('--wall-thickness', `${state.wallThickness}px`);
  
  // Also update vw-based vars for CSS calc fallbacks (with mobile factor applied)
  const baseContainerVw = state.containerBorderVw || 1.3;
  root.style.setProperty('--container-border-vw', `${baseContainerVw * mobileWallFactor}`);
  
  const baseThicknessVw = (Number.isFinite(state.wallThicknessVw) && state.wallThicknessVw > 0)
    ? state.wallThicknessVw
    : state.containerBorderVw;
  root.style.setProperty('--wall-thickness-vw', `${baseThicknessVw * mobileWallFactor}`);
  
  // Mobile edge label visibility (CSS only applies this var on mobile via @media)
  const displayValue = (isMobileLayout && state.mobileEdgeLabelsVisible) ? 'flex' : 'none';
  root.style.setProperty('--edge-label-mobile-display', displayValue);
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
  // Per-mode variation sliders (0..1)
  if (config.sizeVariationPit !== undefined) state.sizeVariationPit = clampNumber(config.sizeVariationPit, 0, 1, state.sizeVariationPit);
  if (config.sizeVariationPitThrows !== undefined) state.sizeVariationPitThrows = clampNumber(config.sizeVariationPitThrows, 0, 1, state.sizeVariationPitThrows);
  if (config.sizeVariationFlies !== undefined) state.sizeVariationFlies = clampNumber(config.sizeVariationFlies, 0, 1, state.sizeVariationFlies);
  if (config.sizeVariationWeightless !== undefined) state.sizeVariationWeightless = clampNumber(config.sizeVariationWeightless, 0, 1, state.sizeVariationWeightless);
  if (config.sizeVariationWater !== undefined) state.sizeVariationWater = clampNumber(config.sizeVariationWater, 0, 1, state.sizeVariationWater);
  if (config.sizeVariationVortex !== undefined) state.sizeVariationVortex = clampNumber(config.sizeVariationVortex, 0, 1, state.sizeVariationVortex);
  if (config.sizeVariationPingPong !== undefined) state.sizeVariationPingPong = clampNumber(config.sizeVariationPingPong, 0, 1, state.sizeVariationPingPong);
  if (config.sizeVariationMagnetic !== undefined) state.sizeVariationMagnetic = clampNumber(config.sizeVariationMagnetic, 0, 1, state.sizeVariationMagnetic);
  if (config.sizeVariationBubbles !== undefined) state.sizeVariationBubbles = clampNumber(config.sizeVariationBubbles, 0, 1, state.sizeVariationBubbles);
  if (config.sizeVariationKaleidoscope !== undefined) state.sizeVariationKaleidoscope = clampNumber(config.sizeVariationKaleidoscope, 0, 1, state.sizeVariationKaleidoscope);
  if (config.sizeVariationOrbit3d !== undefined) state.sizeVariationOrbit3d = clampNumber(config.sizeVariationOrbit3d, 0, 1, state.sizeVariationOrbit3d);
  if (config.sizeVariationCritters !== undefined) state.sizeVariationCritters = clampNumber(config.sizeVariationCritters, 0, 1, state.sizeVariationCritters);
  if (config.sizeVariationNeural !== undefined) state.sizeVariationNeural = clampNumber(config.sizeVariationNeural, 0, 1, state.sizeVariationNeural);
  if (config.sizeVariationLattice !== undefined) state.sizeVariationLattice = clampNumber(config.sizeVariationLattice, 0, 1, state.sizeVariationLattice);
  if (config.sizeVariationParallaxLinear !== undefined) state.sizeVariationParallaxLinear = clampNumber(config.sizeVariationParallaxLinear, 0, 1, state.sizeVariationParallaxLinear);
  if (config.sizeVariationParallaxPerspective !== undefined) state.sizeVariationParallaxPerspective = clampNumber(config.sizeVariationParallaxPerspective, 0, 1, state.sizeVariationParallaxPerspective);
  // Legacy key (kept): does not affect per-mode sliders, but we store it.
  if (config.sizeVariation !== undefined) state.sizeVariation = config.sizeVariation;

  // Warmup frames (per simulation) — integer 0..240
  if (config.pitWarmupFrames !== undefined) state.pitWarmupFrames = clampInt(config.pitWarmupFrames, 0, 240, state.pitWarmupFrames);
  if (config.pitThrowsWarmupFrames !== undefined) state.pitThrowsWarmupFrames = clampInt(config.pitThrowsWarmupFrames, 0, 240, state.pitThrowsWarmupFrames);
  if (config.fliesWarmupFrames !== undefined) state.fliesWarmupFrames = clampInt(config.fliesWarmupFrames, 0, 240, state.fliesWarmupFrames);
  if (config.weightlessWarmupFrames !== undefined) state.weightlessWarmupFrames = clampInt(config.weightlessWarmupFrames, 0, 240, state.weightlessWarmupFrames);
  if (config.waterWarmupFrames !== undefined) state.waterWarmupFrames = clampInt(config.waterWarmupFrames, 0, 240, state.waterWarmupFrames);
  if (config.vortexWarmupFrames !== undefined) state.vortexWarmupFrames = clampInt(config.vortexWarmupFrames, 0, 240, state.vortexWarmupFrames);
  if (config.pingPongWarmupFrames !== undefined) state.pingPongWarmupFrames = clampInt(config.pingPongWarmupFrames, 0, 240, state.pingPongWarmupFrames);
  if (config.magneticWarmupFrames !== undefined) state.magneticWarmupFrames = clampInt(config.magneticWarmupFrames, 0, 240, state.magneticWarmupFrames);
  if (config.bubblesWarmupFrames !== undefined) state.bubblesWarmupFrames = clampInt(config.bubblesWarmupFrames, 0, 240, state.bubblesWarmupFrames);
  if (config.kaleidoscopeWarmupFrames !== undefined) state.kaleidoscopeWarmupFrames = clampInt(config.kaleidoscopeWarmupFrames, 0, 240, state.kaleidoscopeWarmupFrames);
  if (config.kaleidoscope1WarmupFrames !== undefined) state.kaleidoscope1WarmupFrames = clampInt(config.kaleidoscope1WarmupFrames, 0, 240, state.kaleidoscope1WarmupFrames);
  if (config.kaleidoscope2WarmupFrames !== undefined) state.kaleidoscope2WarmupFrames = clampInt(config.kaleidoscope2WarmupFrames, 0, 240, state.kaleidoscope2WarmupFrames);
  if (config.kaleidoscope3WarmupFrames !== undefined) state.kaleidoscope3WarmupFrames = clampInt(config.kaleidoscope3WarmupFrames, 0, 240, state.kaleidoscope3WarmupFrames);
  if (config.orbit3dWarmupFrames !== undefined) state.orbit3dWarmupFrames = clampInt(config.orbit3dWarmupFrames, 0, 240, state.orbit3dWarmupFrames);
  if (config.orbit3d2WarmupFrames !== undefined) state.orbit3d2WarmupFrames = clampInt(config.orbit3d2WarmupFrames, 0, 240, state.orbit3d2WarmupFrames);
  if (config.crittersWarmupFrames !== undefined) state.crittersWarmupFrames = clampInt(config.crittersWarmupFrames, 0, 240, state.crittersWarmupFrames);
  if (config.neuralWarmupFrames !== undefined) state.neuralWarmupFrames = clampInt(config.neuralWarmupFrames, 0, 240, state.neuralWarmupFrames);
  if (config.latticeWarmupFrames !== undefined) state.latticeWarmupFrames = clampInt(config.latticeWarmupFrames, 0, 240, state.latticeWarmupFrames);
  if (config.parallaxLinearWarmupFrames !== undefined) state.parallaxLinearWarmupFrames = clampInt(config.parallaxLinearWarmupFrames, 0, 240, state.parallaxLinearWarmupFrames);
  if (config.parallaxPerspectiveWarmupFrames !== undefined) state.parallaxPerspectiveWarmupFrames = clampInt(config.parallaxPerspectiveWarmupFrames, 0, 240, state.parallaxPerspectiveWarmupFrames);

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
    state.cursorInfluenceRadiusVw = clampNumber(config.cursorInfluenceRadiusVw, 0, 80, state.cursorInfluenceRadiusVw);
  } else if (config.repelRadius !== undefined) {
    state.cursorInfluenceRadiusVw = clampNumber(config.repelRadius / 10, 0, 80, state.cursorInfluenceRadiusVw);
  }
  if (config.responsiveScaleMobile !== undefined) state.responsiveScaleMobile = config.responsiveScaleMobile;
  if (config.mobileObjectReductionFactor !== undefined) {
    state.mobileObjectReductionFactor = clampNumber(
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

  // Kaleidoscope I/II/III overrides (variants)
  if (config.kaleidoscope1BallCount !== undefined) state.kaleidoscope1BallCount = clampNumber(config.kaleidoscope1BallCount, 3, 300, state.kaleidoscope1BallCount);
  if (config.kaleidoscope1Wedges !== undefined) state.kaleidoscope1Wedges = clampNumber(config.kaleidoscope1Wedges, 3, 24, state.kaleidoscope1Wedges);
  if (config.kaleidoscope1Speed !== undefined) state.kaleidoscope1Speed = clampNumber(config.kaleidoscope1Speed, 0.2, 2.0, state.kaleidoscope1Speed);
  if (config.kaleidoscope1DotSizeVh !== undefined) state.kaleidoscope1DotSizeVh = clampNumber(config.kaleidoscope1DotSizeVh, 0.1, 6.0, state.kaleidoscope1DotSizeVh);
  if (config.kaleidoscope1DotAreaMul !== undefined) state.kaleidoscope1DotAreaMul = clampNumber(config.kaleidoscope1DotAreaMul, 0.1, 2.0, state.kaleidoscope1DotAreaMul);
  if (config.kaleidoscope1SpawnAreaMul !== undefined) state.kaleidoscope1SpawnAreaMul = clampNumber(config.kaleidoscope1SpawnAreaMul, 0.2, 2.0, state.kaleidoscope1SpawnAreaMul);
  if (config.kaleidoscope1SizeVariance !== undefined) state.kaleidoscope1SizeVariance = clampNumber(config.kaleidoscope1SizeVariance, 0, 1, state.kaleidoscope1SizeVariance);

  if (config.kaleidoscope2BallCount !== undefined) state.kaleidoscope2BallCount = clampNumber(config.kaleidoscope2BallCount, 3, 300, state.kaleidoscope2BallCount);
  if (config.kaleidoscope2Wedges !== undefined) state.kaleidoscope2Wedges = clampNumber(config.kaleidoscope2Wedges, 3, 24, state.kaleidoscope2Wedges);
  if (config.kaleidoscope2Speed !== undefined) state.kaleidoscope2Speed = clampNumber(config.kaleidoscope2Speed, 0.2, 2.0, state.kaleidoscope2Speed);
  if (config.kaleidoscope2DotSizeVh !== undefined) state.kaleidoscope2DotSizeVh = clampNumber(config.kaleidoscope2DotSizeVh, 0.1, 6.0, state.kaleidoscope2DotSizeVh);
  if (config.kaleidoscope2DotAreaMul !== undefined) state.kaleidoscope2DotAreaMul = clampNumber(config.kaleidoscope2DotAreaMul, 0.1, 2.0, state.kaleidoscope2DotAreaMul);
  if (config.kaleidoscope2SpawnAreaMul !== undefined) state.kaleidoscope2SpawnAreaMul = clampNumber(config.kaleidoscope2SpawnAreaMul, 0.2, 2.0, state.kaleidoscope2SpawnAreaMul);
  if (config.kaleidoscope2SizeVariance !== undefined) state.kaleidoscope2SizeVariance = clampNumber(config.kaleidoscope2SizeVariance, 0, 1, state.kaleidoscope2SizeVariance);

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
  if (config.layoutMinContentPaddingPx !== undefined) {
    state.layoutMinContentPaddingPx = clampNumber(config.layoutMinContentPaddingPx, 0, 200, state.layoutMinContentPaddingPx);
  }
  if (config.layoutMinWallRadiusPx !== undefined) {
    state.layoutMinWallRadiusPx = clampNumber(config.layoutMinWallRadiusPx, 0, 400, state.layoutMinWallRadiusPx);
  }
  if (config.critterMouseRadiusVw !== undefined) state.critterMouseRadiusVw = config.critterMouseRadiusVw;
  if (config.critterRestitution !== undefined) state.critterRestitution = config.critterRestitution;
  if (config.critterFriction !== undefined) state.critterFriction = config.critterFriction;

  // Neural (config overrides)
  if (config.neuralBallCount !== undefined) state.neuralBallCount = clampNumber(config.neuralBallCount, 8, 260, state.neuralBallCount);
  if (config.neuralLinkDistanceVw !== undefined) state.neuralLinkDistanceVw = clampNumber(config.neuralLinkDistanceVw, 1, 50, state.neuralLinkDistanceVw);
  if (config.neuralLineOpacity !== undefined) state.neuralLineOpacity = clampNumber(config.neuralLineOpacity, 0, 1, state.neuralLineOpacity);
  if (config.neuralWanderStrength !== undefined) state.neuralWanderStrength = clampNumber(config.neuralWanderStrength, 0, 4000, state.neuralWanderStrength);
  if (config.neuralMaxLinksPerBall !== undefined) state.neuralMaxLinksPerBall = clampNumber(config.neuralMaxLinksPerBall, 0, 16, state.neuralMaxLinksPerBall);
  if (config.neuralDamping !== undefined) state.neuralDamping = clampNumber(config.neuralDamping, 0.8, 1.0, state.neuralDamping);

  // Lattice (config overrides)
  if (config.latticeBallCount !== undefined) state.latticeBallCount = clampNumber(config.latticeBallCount, 8, 260, state.latticeBallCount);
  if (config.latticeSpacingVw !== undefined) state.latticeSpacingVw = clampNumber(config.latticeSpacingVw, 1, 40, state.latticeSpacingVw);
  if (config.latticeStiffness !== undefined) state.latticeStiffness = clampNumber(config.latticeStiffness, 0, 20, state.latticeStiffness);
  if (config.latticeDamping !== undefined) state.latticeDamping = clampNumber(config.latticeDamping, 0.5, 1.0, state.latticeDamping);
  if (config.latticeDisruptRadius !== undefined) state.latticeDisruptRadius = clampNumber(config.latticeDisruptRadius, 50, 800, state.latticeDisruptRadius);
  if (config.latticeDisruptPower !== undefined) state.latticeDisruptPower = clampNumber(config.latticeDisruptPower, 0, 20, state.latticeDisruptPower);
  if (config.latticeMeshWaveStrength !== undefined) state.latticeMeshWaveStrength = clampNumber(config.latticeMeshWaveStrength, 0, 50, state.latticeMeshWaveStrength);
  if (config.latticeMeshWaveSpeed !== undefined) state.latticeMeshWaveSpeed = clampNumber(config.latticeMeshWaveSpeed, 0, 3.0, state.latticeMeshWaveSpeed);
  if (config.latticeAlignment !== undefined) state.latticeAlignment = String(config.latticeAlignment);

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
  if (config.parallaxPerspectiveDotCount !== undefined) state.parallaxPerspectiveDotCount = clampNumber(config.parallaxPerspectiveDotCount, 40, 420, state.parallaxPerspectiveDotCount);
  if (config.parallaxPerspectiveDepthMul !== undefined) state.parallaxPerspectiveDepthMul = clampNumber(config.parallaxPerspectiveDepthMul, 0.5, 3.0, state.parallaxPerspectiveDepthMul);
  if (config.parallaxPerspectiveFocalLength !== undefined) state.parallaxPerspectiveFocalLength = clampNumber(config.parallaxPerspectiveFocalLength, 80, 1000, state.parallaxPerspectiveFocalLength);
  if (config.parallaxPerspectiveFollowStrength !== undefined) state.parallaxPerspectiveFollowStrength = clampNumber(config.parallaxPerspectiveFollowStrength, 1, 40, state.parallaxPerspectiveFollowStrength);
  if (config.parallaxPerspectiveDamping !== undefined) state.parallaxPerspectiveDamping = clampNumber(config.parallaxPerspectiveDamping, 1, 40, state.parallaxPerspectiveDamping);
  if (config.parallaxPerspectiveZ1 !== undefined) state.parallaxPerspectiveZ1 = clampNumber(config.parallaxPerspectiveZ1, 200, 2000, state.parallaxPerspectiveZ1);
  if (config.parallaxPerspectiveZ2 !== undefined) state.parallaxPerspectiveZ2 = clampNumber(config.parallaxPerspectiveZ2, 150, 1500, state.parallaxPerspectiveZ2);
  if (config.parallaxPerspectiveZ3 !== undefined) state.parallaxPerspectiveZ3 = clampNumber(config.parallaxPerspectiveZ3, 100, 1000, state.parallaxPerspectiveZ3);
  if (config.parallaxPerspectiveZ4 !== undefined) state.parallaxPerspectiveZ4 = clampNumber(config.parallaxPerspectiveZ4, 40, 600, state.parallaxPerspectiveZ4);
  if (config.parallaxPerspectiveZ5 !== undefined) state.parallaxPerspectiveZ5 = clampNumber(config.parallaxPerspectiveZ5, 10, 300, state.parallaxPerspectiveZ5);
  if (config.parallaxPerspectiveGridX !== undefined) state.parallaxPerspectiveGridX = clampInt(config.parallaxPerspectiveGridX, 3, 50, state.parallaxPerspectiveGridX);
  if (config.parallaxPerspectiveGridY !== undefined) state.parallaxPerspectiveGridY = clampInt(config.parallaxPerspectiveGridY, 3, 50, state.parallaxPerspectiveGridY);
  if (config.parallaxPerspectiveGridZ !== undefined) state.parallaxPerspectiveGridZ = clampInt(config.parallaxPerspectiveGridZ, 2, 25, state.parallaxPerspectiveGridZ);
  if (config.parallaxPerspectiveSpanX !== undefined) state.parallaxPerspectiveSpanX = clampNumber(config.parallaxPerspectiveSpanX, 0.2, 3.0, state.parallaxPerspectiveSpanX);
  if (config.parallaxPerspectiveSpanY !== undefined) state.parallaxPerspectiveSpanY = clampNumber(config.parallaxPerspectiveSpanY, 0.2, 3.0, state.parallaxPerspectiveSpanY);
  if (config.parallaxPerspectiveZNear !== undefined) state.parallaxPerspectiveZNear = clampNumber(config.parallaxPerspectiveZNear, 10, 1200, state.parallaxPerspectiveZNear);
  if (config.parallaxPerspectiveZFar !== undefined) state.parallaxPerspectiveZFar = clampNumber(config.parallaxPerspectiveZFar, 50, 4000, state.parallaxPerspectiveZFar);
  if (config.parallaxPerspectiveParallaxStrength !== undefined) state.parallaxPerspectiveParallaxStrength = clampNumber(config.parallaxPerspectiveParallaxStrength, 0, 2000, state.parallaxPerspectiveParallaxStrength);
  if (config.parallaxPerspectiveRandomness !== undefined) state.parallaxPerspectiveRandomness = clampNumber(config.parallaxPerspectiveRandomness, 0, 1, state.parallaxPerspectiveRandomness);
  if (config.parallaxPerspectiveDotSizeMul !== undefined) state.parallaxPerspectiveDotSizeMul = clampNumber(config.parallaxPerspectiveDotSizeMul, 0.1, 6.0, state.parallaxPerspectiveDotSizeMul);

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
    state.sceneImpactMul = clampNumber(config.sceneImpactMul, 0, 0.05, state.sceneImpactMul);
  } else if (config.brandLogoImpactMul !== undefined) {
    // Back-compat: reuse old logo tuning if scene tuning is absent.
    state.sceneImpactMul = clampNumber(config.brandLogoImpactMul, 0, 0.05, state.sceneImpactMul);
  }
  if (config.sceneImpactMobileMulFactor !== undefined) {
    state.sceneImpactMobileMulFactor = clampNumber(config.sceneImpactMobileMulFactor, 0.25, 3.0, state.sceneImpactMobileMulFactor);
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
  if (config.bgDark !== undefined) state.bgDark = config.bgDark;
  if (config.frameColor !== undefined) state.frameColor = config.frameColor;
  
  // Text colors
  if (config.textColorLight !== undefined) state.textColorLight = config.textColorLight;
  if (config.textColorLightMuted !== undefined) state.textColorLightMuted = config.textColorLightMuted;
  if (config.textColorDark !== undefined) state.textColorDark = config.textColorDark;
  if (config.textColorDarkMuted !== undefined) state.textColorDarkMuted = config.textColorDarkMuted;
  if (config.edgeLabelColorLight !== undefined) state.edgeLabelColorLight = config.edgeLabelColorLight;
  if (config.edgeLabelColorDark !== undefined) state.edgeLabelColorDark = config.edgeLabelColorDark;
  if (config.edgeLabelInsetAdjustPx !== undefined) {
    state.edgeLabelInsetAdjustPx = clampNumber(config.edgeLabelInsetAdjustPx, -500, 500, state.edgeLabelInsetAdjustPx);
  }
  
  // Link colors
  if (config.linkHoverColor !== undefined) state.linkHoverColor = config.linkHoverColor;
  
  // Logo colors
  if (config.logoColorLight !== undefined) state.logoColorLight = config.logoColorLight;
  if (config.logoColorDark !== undefined) state.logoColorDark = config.logoColorDark;
  
  // Noise texture opacity (visual overlay)
  if (config.noiseBackOpacity !== undefined) state.noiseBackOpacity = clampNumber(config.noiseBackOpacity, 0, 0.3, state.noiseBackOpacity);
  if (config.noiseFrontOpacity !== undefined) state.noiseFrontOpacity = clampNumber(config.noiseFrontOpacity, 0, 0.3, state.noiseFrontOpacity);
  if (config.noiseBackOpacityDark !== undefined) state.noiseBackOpacityDark = clampNumber(config.noiseBackOpacityDark, 0, 0.5, state.noiseBackOpacityDark);
  if (config.noiseFrontOpacityDark !== undefined) state.noiseFrontOpacityDark = clampNumber(config.noiseFrontOpacityDark, 0, 0.5, state.noiseFrontOpacityDark);
  
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
  if (config.wallSoftness !== undefined) state.wallSoftness = config.wallSoftness;
  if (config.wallBounciness !== undefined) state.wallBounciness = config.wallBounciness;
  
  if (config.wallWobbleMaxDeform !== undefined) state.wallWobbleMaxDeform = config.wallWobbleMaxDeform;
  if (config.wallWobbleStiffness !== undefined) state.wallWobbleStiffness = config.wallWobbleStiffness;
  if (config.wallWobbleDamping !== undefined) state.wallWobbleDamping = config.wallWobbleDamping;
  if (config.wallWobbleSigma !== undefined) state.wallWobbleSigma = config.wallWobbleSigma;
  if (config.wallWobbleCornerClamp !== undefined) state.wallWobbleCornerClamp = config.wallWobbleCornerClamp;
  
  if (config.wallWobbleImpactThreshold !== undefined) state.wallWobbleImpactThreshold = config.wallWobbleImpactThreshold;
  if (config.wallWobbleSettlingSpeed !== undefined) state.wallWobbleSettlingSpeed = config.wallWobbleSettlingSpeed;
  
  // Gate overlay settings
  if (config.gateOverlayEnabled !== undefined) state.gateOverlayEnabled = config.gateOverlayEnabled;
  if (config.gateOverlayOpacity !== undefined) state.gateOverlayOpacity = config.gateOverlayOpacity;
  if (config.gateOverlayBlurPx !== undefined) state.gateOverlayBlurPx = config.gateOverlayBlurPx;
  if (config.gateOverlayTransitionMs !== undefined) state.gateOverlayTransitionMs = config.gateOverlayTransitionMs;
  if (config.gateOverlayTransitionOutMs !== undefined) state.gateOverlayTransitionOutMs = config.gateOverlayTransitionOutMs;
  
  // Orbit 3D mode (simplified energetic physics)
  if (config.orbit3dMoonCount !== undefined) state.orbit3dMoonCount = clampNumber(config.orbit3dMoonCount, 1, 1000, state.orbit3dMoonCount);
  if (config.orbit3dGravity !== undefined) state.orbit3dGravity = clampNumber(config.orbit3dGravity, 1000, 500000, state.orbit3dGravity);
  if (config.orbit3dMoonMass !== undefined) state.orbit3dMoonMass = clampNumber(config.orbit3dMoonMass, 0.1, 100, state.orbit3dMoonMass);
  if (config.orbit3dVelocityMult !== undefined) state.orbit3dVelocityMult = clampNumber(config.orbit3dVelocityMult, 10, 1000, state.orbit3dVelocityMult);
  if (config.orbit3dTargetOrbit !== undefined) state.orbit3dTargetOrbit = clampNumber(config.orbit3dTargetOrbit, 1, 100, state.orbit3dTargetOrbit);
  if (config.orbit3dMinOrbit !== undefined) state.orbit3dMinOrbit = clampNumber(config.orbit3dMinOrbit, 1, 100, state.orbit3dMinOrbit);
  if (config.orbit3dMaxOrbit !== undefined) state.orbit3dMaxOrbit = clampNumber(config.orbit3dMaxOrbit, 1, 200, state.orbit3dMaxOrbit);
  if (config.orbit3dDepthScale !== undefined) state.orbit3dDepthScale = clampNumber(config.orbit3dDepthScale, 0, 1.5, state.orbit3dDepthScale);
  if (config.orbit3dDamping !== undefined) state.orbit3dDamping = clampNumber(config.orbit3dDamping, 0.01, 0.2, state.orbit3dDamping);

  // Orbit 3D Mode 2 (tight swarm)
  if (config.orbit3d2MoonCount !== undefined) state.orbit3d2MoonCount = clampNumber(config.orbit3d2MoonCount, 1, 300, state.orbit3d2MoonCount);
  if (config.orbit3d2Gravity !== undefined) state.orbit3d2Gravity = clampNumber(config.orbit3d2Gravity, 1000, 500000, state.orbit3d2Gravity);
  if (config.orbit3d2VelocityMult !== undefined) state.orbit3d2VelocityMult = clampNumber(config.orbit3d2VelocityMult, 0.1, 2.0, state.orbit3d2VelocityMult);
  if (config.orbit3d2MinOrbit !== undefined) state.orbit3d2MinOrbit = clampNumber(config.orbit3d2MinOrbit, 1, 50, state.orbit3d2MinOrbit);
  if (config.orbit3d2MaxOrbit !== undefined) state.orbit3d2MaxOrbit = clampNumber(config.orbit3d2MaxOrbit, 1, 50, state.orbit3d2MaxOrbit);
  if (config.orbit3d2DepthScale !== undefined) state.orbit3d2DepthScale = clampNumber(config.orbit3d2DepthScale, 0, 0.95, state.orbit3d2DepthScale);
  if (config.orbit3d2Damping !== undefined) state.orbit3d2Damping = clampNumber(config.orbit3d2Damping, 0, 1, state.orbit3d2Damping);
  if (config.orbit3d2FollowSmoothing !== undefined) state.orbit3d2FollowSmoothing = clampNumber(config.orbit3d2FollowSmoothing, 1, 200, state.orbit3d2FollowSmoothing);
  if (config.orbit3d2Softening !== undefined) state.orbit3d2Softening = clampNumber(config.orbit3d2Softening, 1, 100, state.orbit3d2Softening);

  // Ball sizes are recalculated in detectResponsiveScale (called above)
  // which applies both sizeScale and responsiveScale

  // ─────────────────────────────────────────────────────────────────────────────
  // Layout: vw-native inputs + backwards-compatible px migration
  // ─────────────────────────────────────────────────────────────────────────────
  const basisW = getLayoutViewportWidthPx();

  // Canonical vw keys (preferred)
  if (config.containerBorderVw !== undefined) state.containerBorderVw = clampNumber(config.containerBorderVw, 0, 20, state.containerBorderVw);
  if (config.simulationPaddingVw !== undefined) state.simulationPaddingVw = clampNumber(config.simulationPaddingVw, 0, 20, state.simulationPaddingVw);
  if (config.contentPaddingVw !== undefined) state.contentPaddingVw = clampNumber(config.contentPaddingVw, 0, 40, state.contentPaddingVw);
  if (config.contentPaddingHorizontalRatio !== undefined) state.contentPaddingHorizontalRatio = clampNumber(config.contentPaddingHorizontalRatio, 0.1, 3.0, state.contentPaddingHorizontalRatio);
  if (config.mobileWallThicknessFactor !== undefined) state.mobileWallThicknessFactor = clampNumber(config.mobileWallThicknessFactor, 0.5, 3.0, state.mobileWallThicknessFactor);
  if (config.mobileEdgeLabelsVisible !== undefined) state.mobileEdgeLabelsVisible = !!config.mobileEdgeLabelsVisible;
  if (config.wallRadiusVw !== undefined) state.wallRadiusVw = clampNumber(config.wallRadiusVw, 0, 40, state.wallRadiusVw);
  if (config.wallThicknessVw !== undefined) state.wallThicknessVw = clampNumber(config.wallThicknessVw, 0, 20, state.wallThicknessVw);

  // If vw values are missing, migrate from px so the current look is preserved at
  // the current (or virtual) viewport width.
  if (!(Number.isFinite(state.containerBorderVw) && state.containerBorderVw > 0)) {
    state.containerBorderVw = pxToVw(state.containerBorder, basisW);
  }
  if (!(Number.isFinite(state.simulationPaddingVw) && state.simulationPaddingVw >= 0)) {
    state.simulationPaddingVw = pxToVw(state.simulationPadding, basisW);
  }
  if (!(Number.isFinite(state.contentPaddingVw) && state.contentPaddingVw > 0)) {
    state.contentPaddingVw = pxToVw(state.contentPadding, basisW);
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
  if (!globals.isMobile) return Math.max(0, n);
  const factor = Math.max(0, Math.min(1, Number(globals.mobileObjectReductionFactor ?? 0.7)));
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
 * Detect device type and apply responsive ball scaling
 * iPad and iPhone get smaller balls for better visual balance
 */
export function detectResponsiveScale() {
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
export function updateBallSizes() {
  const baseSize = (state.R_MIN_BASE + state.R_MAX_BASE) / 2;
  const totalScale = state.sizeScale * state.responsiveScale;
  const medium = baseSize * totalScale;
  state.R_MED = Math.max(1, medium);
  // R_MIN/R_MAX are the absolute cap for “max variation” (per-mode=1, globalMul=1).
  // Individual modes scale within this cap using their own 0..1 slider.
  const cap = clampNumber(state.sizeVariationCap, 0, 0.5, 0.12);
  const mul = clampNumber(state.sizeVariationGlobalMul, 0, 2, 1.0);
  const v = clampNumber(cap * mul, 0, 0.5, cap);
  state.R_MIN = Math.max(1, state.R_MED * (1 - v));
  state.R_MAX = Math.max(state.R_MIN, state.R_MED * (1 + v));
}
