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

  // Mouse trail (canvas-rendered)
  mouseTrailEnabled: true,
  mouseTrailLength: 18,     // number of samples to keep
  mouseTrailSize: 1.3,      // CSS px (scaled by DPR at draw time)
  mouseTrailFadeMs: 220,    // lifetime of a sample
  mouseTrailOpacity: 0.35,  // 0..1
  
  // Ball properties
  ballSoftness: 20,
  ballSpacing: 2.5,     // Extra collision padding between balls (px, 0 = no extra spacing)

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
  wallRadiusVw: 0,          // corner radius (vw) (also drives physics corner collision)
  wallThicknessVw: 0,       // wall tube thickness (vw)
  
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
  wallThickness: 12,        // Unified: wall tubes + body border (px)
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

function clampNumber(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
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

  // If wallThicknessVw is not set, default it to containerBorderVw (keeps “frame”
  // control behavior consistent with the current panel’s linked thickness).
  const thicknessVw = (Number.isFinite(state.wallThicknessVw) && state.wallThicknessVw > 0)
    ? state.wallThicknessVw
    : state.containerBorderVw;
  const thicknessPx = vwToPx(thicknessVw, w);

  state.containerBorder = Math.round(borderPx);
  state.simulationPadding = Math.round(simPadPx);
  state.contentPadding = Math.round(contentPadPx);
  state.wallRadius = Math.round(radiusPx);
  state.cornerRadius = state.wallRadius;
  state.wallThickness = Math.round(thicknessPx);
}

export function applyLayoutCSSVars() {
  // Single place that stamps layout CSS vars from the derived px fields.
  // Keeps CSS + physics aligned, and allows vw-based tuning without touching
  // performance-sensitive paths.
  const root = document.documentElement;
  root.style.setProperty('--container-border', `${state.containerBorder}px`);
  root.style.setProperty('--simulation-padding', `${state.simulationPadding}px`);
  root.style.setProperty('--content-padding', `${state.contentPadding}px`);
  root.style.setProperty('--wall-radius', `${state.wallRadius}px`);
  root.style.setProperty('--wall-thickness', `${state.wallThickness}px`);
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
  if (config.critterMouseRadiusVw !== undefined) state.critterMouseRadiusVw = config.critterMouseRadiusVw;
  if (config.critterRestitution !== undefined) state.critterRestitution = config.critterRestitution;
  if (config.critterFriction !== undefined) state.critterFriction = config.critterFriction;

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Layout: vw-native inputs + backwards-compatible px migration
  // ─────────────────────────────────────────────────────────────────────────────
  const basisW = getLayoutViewportWidthPx();

  // Canonical vw keys (preferred)
  if (config.containerBorderVw !== undefined) state.containerBorderVw = clampNumber(config.containerBorderVw, 0, 20, state.containerBorderVw);
  if (config.simulationPaddingVw !== undefined) state.simulationPaddingVw = clampNumber(config.simulationPaddingVw, 0, 20, state.simulationPaddingVw);
  if (config.contentPaddingVw !== undefined) state.contentPaddingVw = clampNumber(config.contentPaddingVw, 0, 40, state.contentPaddingVw);
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
