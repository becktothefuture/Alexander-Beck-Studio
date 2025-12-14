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

  // Worms (Simulation 11) — overhead-view organisms
  // Defaults intentionally match `source/config/default-config.json` (dev+build parity).
  wormPopulation: 28,
  wormSingleChance: 0.42,       // fraction of organisms that are single-segment
  wormDotSpeedMul: 2.5,         // speed multiplier for single-segment organisms
  wormBaseSpeed: 900,           // px/s baseline
  wormDamping: 0.885,           // Verlet damping (0..1)
  wormStepHz: 1.7,              // gait cadence
  wormTurnNoise: 4.6,           // random walk strength
  wormTurnDamp: 5.0,            // turning inertia damping
  wormTurnSeek: 16.0,           // steer strength toward a desired heading

  // Mouse interaction (macro control + derived values)
  // NOTE: `wormMouseFear` is kept for backward compatibility and is treated as an alias for `wormMousePull`.
  wormMousePull: 1.0,           // 0..N scalar; attraction strength inside mouse zone
  wormMouseFear: 1.0,           // legacy alias
  wormMouseRadiusVw: 30,        // radius of attraction zone (vw)
  wormEdgeAvoid: 1.0,           // 0..N scalar; scales edge repulsion (1.0 = current)
  wormFleeRadius: 700,          // px (pre-DPR)
  wormFleeForce: 3.85,          // heading bias away from pointer
  wormPanicBoost: 2.5,          // speed boost near pointer

  // Social interaction
  wormSenseRadius: 450,         // px (pre-DPR)
  wormAvoidForce: 2.5,          // head-to-head avoidance
  wormAvoidSwirl: 0.35,         // tangential dodge to prevent deadlocks
  wormCrowdBoost: 1.3,          // speed boost when near other heads

  // Squash & stretch (render-time shape language)
  wormSquashDecay: 0.86,        // decay per frame step (0..1)
  wormStretchGain: 0.0011,      // speed->stretch mapping
  wormStretchMax: 0.38,         // max stretch amount
  wormContactSquashX: 0.22,     // how much contact squashes X
  wormContactSquashY: 0.35,     // how much contact squashes Y
  wormTurnSquashGain: 0.28,     // extra squash from sharp turns (0..)
  
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
  
  // Crystal mode params (Simulation 12)
  crystalBallCount: 50,
  crystalGrowthRate: 0.5,
  bondFormationRadius: 25,
  bondStiffness: 0.4,
  catalystRadius: 120,
  catalystStrength: 2.5,
  maxBondsPerBall: 4,
  bondVisualOpacity: 0.6,
  
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

export function initState(config) {
  state.config = { ...config };
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
  if (config.sizeVariation !== undefined) state.sizeVariation = config.sizeVariation;
  if (config.maxBalls !== undefined) state.maxBalls = config.maxBalls;
  if (config.repelRadius !== undefined) state.repelRadius = config.repelRadius;
  if (config.repelPower !== undefined) state.repelPower = config.repelPower;
  // Repel softness: accept both `repelSoft` and `repelSoftness`
  if (config.repelSoft !== undefined) state.repelSoft = config.repelSoft;
  if (config.repelSoftness !== undefined) state.repelSoft = config.repelSoftness;
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

  // Worms (Simulation 11) config overrides
  if (config.wormPopulation !== undefined) state.wormPopulation = config.wormPopulation;
  if (config.wormSingleChance !== undefined) state.wormSingleChance = config.wormSingleChance;
  if (config.wormDotSpeedMul !== undefined) state.wormDotSpeedMul = config.wormDotSpeedMul;
  if (config.wormBaseSpeed !== undefined) state.wormBaseSpeed = config.wormBaseSpeed;
  if (config.wormDamping !== undefined) state.wormDamping = config.wormDamping;
  if (config.wormStepHz !== undefined) state.wormStepHz = config.wormStepHz;
  if (config.wormTurnNoise !== undefined) state.wormTurnNoise = config.wormTurnNoise;
  if (config.wormTurnDamp !== undefined) state.wormTurnDamp = config.wormTurnDamp;
  if (config.wormTurnSeek !== undefined) state.wormTurnSeek = config.wormTurnSeek;
  if (config.wormMousePull !== undefined) state.wormMousePull = config.wormMousePull;
  if (config.wormMouseFear !== undefined) state.wormMouseFear = config.wormMouseFear;
  if (config.wormMouseRadiusVw !== undefined) state.wormMouseRadiusVw = config.wormMouseRadiusVw;
  if (config.wormEdgeAvoid !== undefined) state.wormEdgeAvoid = config.wormEdgeAvoid;
  if (config.wormFleeRadius !== undefined) state.wormFleeRadius = config.wormFleeRadius;
  if (config.wormFleeForce !== undefined) state.wormFleeForce = config.wormFleeForce;
  if (config.wormPanicBoost !== undefined) state.wormPanicBoost = config.wormPanicBoost;
  if (config.wormSenseRadius !== undefined) state.wormSenseRadius = config.wormSenseRadius;
  if (config.wormAvoidForce !== undefined) state.wormAvoidForce = config.wormAvoidForce;
  if (config.wormAvoidSwirl !== undefined) state.wormAvoidSwirl = config.wormAvoidSwirl;
  if (config.wormCrowdBoost !== undefined) state.wormCrowdBoost = config.wormCrowdBoost;
  if (config.wormSquashDecay !== undefined) state.wormSquashDecay = config.wormSquashDecay;
  if (config.wormStretchGain !== undefined) state.wormStretchGain = config.wormStretchGain;
  if (config.wormStretchMax !== undefined) state.wormStretchMax = config.wormStretchMax;
  if (config.wormContactSquashX !== undefined) state.wormContactSquashX = config.wormContactSquashX;
  if (config.wormContactSquashY !== undefined) state.wormContactSquashY = config.wormContactSquashY;
  if (config.wormTurnSquashGain !== undefined) state.wormTurnSquashGain = config.wormTurnSquashGain;

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

export function getState() {
  return state;
}

export function getGlobals() {
  return state;
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
export function updateBallSizes() {
  const baseSize = (state.R_MIN_BASE + state.R_MAX_BASE) / 2;
  const totalScale = state.sizeScale * state.responsiveScale;
  state.R_MIN = baseSize * totalScale * 0.75;
  state.R_MAX = baseSize * totalScale * 1.25;
}
