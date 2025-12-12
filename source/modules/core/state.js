// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      STATE STORE (COMPLETE)                                  ║
// ║               All global state - extracted from balls-source.html            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS, MODES } from './constants.js';

const state = {
  config: {},
  currentMode: MODES.FLIES,
  balls: [],
  canvas: null,
  ctx: null,
  container: null,
  mouseX: CONSTANTS.OFFSCREEN_MOUSE,
  mouseY: CONSTANTS.OFFSCREEN_MOUSE,
  mouseInCanvas: false,
  
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
  
  // Device
  DPR: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
  
  // Size
  sizeScale: 1.2,
  sizeVariation: 0,
  responsiveScale: 1.0,
  R_MIN_BASE: 6,
  R_MAX_BASE: 24,
  R_MIN: 6 * 1.2 * 0.75,
  R_MAX: 24 * 1.2 * 1.25,
  
  // Ball properties
  ballSoftness: 20,
  
  // Corner (matches CSS border-radius for collision bounds)
  // Container border radius (12vh converted to px at runtime)
  // 12vh ≈ 100px on typical viewport, falls back to reasonable default
  containerRadiusVh: 12,
  containerRadiusPx: 100, // Calculated from vh on init/resize
  
  // Inner border (soft visual transition)
  
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
  bubblesMaxCount: 150,
  bubblesDeflectRadius: 80,
  
  
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
  
  // Pulse Grid mode
  gridColumns: 40,
  gridBallCount: 120,
  pulseInterval: 0.8,
  
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
  
  // Simulation padding (padding inside #bravia-balls container around canvas, in pixels)
  simulationPadding: 0,
  
  // Container border (padding around #bravia-balls container, reveals body background, in pixels)
  containerBorder: 0,
  
  // Helper: get max squash amount
  getSquashMax() {
    if (this.ballSoftness === 0) return 0;
    return CONSTANTS.SQUASH_MAX_BASE * (this.ballSoftness / 40.0);
  },
  
  // Helper: get canvas corner radius (container radius - simulation padding)
  getCanvasCornerRadius() {
    return Math.max(0, this.containerRadiusPx - this.simulationPadding);
  }
};

export function initState(config) {
  state.config = { ...config };
  if (config.ballMass) state.ballMassKg = config.ballMass;
  if (config.gravityMultiplier) state.gravityMultiplier = config.gravityMultiplier;
  if (config.restitution) state.REST = config.restitution;
  if (config.friction) state.FRICTION = config.friction;
  if (config.ballScale) state.sizeScale = config.ballScale;
  
  // Simulation padding (padding inside container around canvas)
  if (config.simulationPadding !== undefined) state.simulationPadding = config.simulationPadding;
  
  // Container border (padding around container, reveals body background)
  if (config.containerBorder !== undefined) state.containerBorder = config.containerBorder;
  
  // Recalculate R_MIN and R_MAX
  const baseSize = (state.R_MIN_BASE + state.R_MAX_BASE) / 2;
  state.R_MIN = baseSize * state.sizeScale * 0.75;
  state.R_MAX = baseSize * state.sizeScale * 1.25;
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
