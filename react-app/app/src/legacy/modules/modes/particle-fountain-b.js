// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PARTICLE FOUNTAIN B MODE                             ║
// ║        Three park-fountain nozzles perform a repeating particle dance        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColorWithIndex } from '../visual/colors.js';
import { CONSTANTS, MODES } from '../core/constants.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';
import { getSimulationCollisionInsetPx } from '../utils/frame-geometry.js';
import { triggerPressure } from '../audio/simulation-audio-adapter.js';

const NOZZLE_COUNT = 3;
const CHOREOGRAPHY_DURATION = 12.8;
const PARTICLE_LIFETIME = 6.4;
const FADE_DURATION = 1.25;
const MAX_EMISSIONS_PER_NOZZLE_FRAME = 4;
const DEG_TO_RAD = Math.PI / 180;
const CENTER_SWAY_DEGREES = 2.5;
const OUTER_BOW_DEGREES = 10;
const GROUP_BOW_DEGREES = 12;
const WAVE_BOW_DEGREES = 4;
const SIDE_PEAK_HEIGHT_RATIO = 0.55;
const CENTER_PEAK_HEIGHT_RATIO = 0.75;
const REFERENCE_INITIAL_VELOCITY = 4700;
const MIN_INITIAL_VELOCITY = 200;
const MAX_INITIAL_VELOCITY = 10000;
const VELOCITY_SOLVER_ITERATIONS = 24;
const TRAJECTORY_SOLVER_STEPS = 720;
const FLUID_SCALE_MIN_WIDTH = 390;
const FLUID_SCALE_MAX_WIDTH = 1200;
const MOBILE_PRESSURE_COMPENSATION = 1.035;
const DESKTOP_PRESSURE_COMPENSATION = 1.04;
const OUTER_NOZZLE_PRESSURE_COMPENSATION = 1.035;

const emissionAccumulators = new Float32Array(NOZZLE_COUNT);
const emissionRates = new Float32Array(NOZZLE_COUNT);
const emissionAngles = new Float32Array(NOZZLE_COUNT);
const emissionEnergy = new Float32Array(NOZZLE_COUNT);
const nozzleWasActive = new Uint8Array(NOZZLE_COUNT);
const pressureCues = [
  { id: 'particle-fountain-b:left', intensity: 0.5, x: 0.18, radius: 14, minIntervalMs: 260 },
  { id: 'particle-fountain-b:center', intensity: 0.62, x: 0.5, radius: 16, minIntervalMs: 260 },
  { id: 'particle-fountain-b:right', intensity: 0.5, x: 0.82, radius: 14, minIntervalMs: 260 },
];

let choreographyTime = 0;
let reducedMotion = false;
let lastUpdateAtMs = 0;
let launchVelocityProfileKey = '';
const launchVelocities = new Float32Array(NOZZLE_COUNT);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function projectVerticalRise(initialVelocity, {
  dt,
  gravity,
  friction,
  massScale,
  waterDrag,
  upwardAcceleration,
  dpr,
}) {
  let velocityY = -initialVelocity;
  let offsetY = 0;
  let peakY = 0;

  for (let step = 0; step < TRAJECTORY_SOLVER_STEPS; step += 1) {
    velocityY += gravity * dt;
    const speedMultiplier = clamp(1 - Math.abs(velocityY) / (100 * dpr), 0, 1);
    const progressiveDrag = friction * (1 + speedMultiplier);
    velocityY *= Math.max(0, 1 - progressiveDrag / massScale);
    velocityY *= 1 - waterDrag;
    velocityY -= upwardAcceleration * dt;
    offsetY += velocityY * dt;
    peakY = Math.min(peakY, offsetY);
    if (velocityY >= 0) break;
  }

  return -peakY;
}

export function resolveParticleFountainBLaunchVelocity(targetRise, physics) {
  const dpr = Math.max(1, Number(physics.dpr) || 1);
  let low = MIN_INITIAL_VELOCITY * dpr;
  let high = MAX_INITIAL_VELOCITY * dpr;
  const target = Math.max(0, Number(targetRise) || 0);
  const trajectoryPhysics = { ...physics, dpr };

  for (let iteration = 0; iteration < VELOCITY_SOLVER_ITERATIONS; iteration += 1) {
    const velocity = (low + high) * 0.5;
    if (projectVerticalRise(velocity, trajectoryPhysics) < target) low = velocity;
    else high = velocity;
  }

  return high;
}

function resolveLaunchVelocityProfile(g, canvas) {
  const dpr = g.DPR || 1;
  const inset = getSimulationCollisionInsetPx(g);
  const representativeRadius = g.R_MED || 8.9 * dpr;
  const sourceY = canvas.height - inset - representativeRadius - dpr;
  const isMobileClass = g.isMobile || g.isMobileViewport;
  const dt = isMobileClass ? CONSTANTS.PHYSICS_DT_MOBILE : CONSTANTS.PHYSICS_DT;
  const gravity = Math.max(0.01, Math.abs(g.G || (g.GE * (g.gravityMultiplier || 1))))
    * Math.max(0, Number(g.gravityScale) || 1);
  const friction = clamp(g.FRICTION ?? 0.018, 0, 0.25);
  const massScale = Math.max(0.25, (g.ballMassKg || 240) / (g.MASS_BASELINE_KG || 240));
  const waterDrag = clamp(g.particleFountainWaterDrag ?? 0.02, 0.01, 1);
  const upwardAcceleration = Math.max(0, g.particleFountainUpwardForce || 0) * 0.6 * dpr;
  const cssWidth = canvas.width / dpr;
  const fluidScaleProgress = clamp(
    (cssWidth - FLUID_SCALE_MIN_WIDTH) / (FLUID_SCALE_MAX_WIDTH - FLUID_SCALE_MIN_WIDTH),
    0,
    1,
  );
  const responsivePressureCompensation = MOBILE_PRESSURE_COMPENSATION
    + fluidScaleProgress
      * (DESKTOP_PRESSURE_COMPENSATION - MOBILE_PRESSURE_COMPENSATION);
  const pressureScale = clamp(
    (g.particleFountainInitialVelocity || REFERENCE_INITIAL_VELOCITY)
      / REFERENCE_INITIAL_VELOCITY,
    MIN_INITIAL_VELOCITY / REFERENCE_INITIAL_VELOCITY,
    MAX_INITIAL_VELOCITY / REFERENCE_INITIAL_VELOCITY,
  );
  const key = [
    canvas.width,
    canvas.height,
    dpr,
    inset,
    representativeRadius,
    dt,
    gravity,
    friction,
    massScale,
    waterDrag,
    upwardAcceleration,
    responsivePressureCompensation,
    pressureScale,
  ].join(':');
  if (key === launchVelocityProfileKey) return launchVelocities;

  const physics = {
    dt,
    gravity,
    friction,
    massScale,
    waterDrag,
    upwardAcceleration,
    dpr,
  };
  for (let nozzleIndex = 0; nozzleIndex < NOZZLE_COUNT; nozzleIndex += 1) {
    const peakHeightRatio = nozzleIndex === 1
      ? CENTER_PEAK_HEIGHT_RATIO
      : SIDE_PEAK_HEIGHT_RATIO;
    const targetPeakY = canvas.height * (1 - peakHeightRatio) + representativeRadius;
    const targetRise = Math.max(0, sourceY - targetPeakY);
    const nozzlePressureCompensation = nozzleIndex === 1
      ? 1
      : OUTER_NOZZLE_PRESSURE_COMPENSATION;
    launchVelocities[nozzleIndex] = clamp(
      resolveParticleFountainBLaunchVelocity(targetRise, physics)
        * responsivePressureCompensation
        * nozzlePressureCompensation
        * pressureScale,
      MIN_INITIAL_VELOCITY * dpr,
      MAX_INITIAL_VELOCITY * dpr,
    );
  }
  launchVelocityProfileKey = key;
  return launchVelocities;
}

function resetNozzleState() {
  for (let i = 0; i < NOZZLE_COUNT; i += 1) {
    emissionRates[i] = 0;
    emissionAngles[i] = 0;
    emissionEnergy[i] = 1;
  }
}

function configureChoreography(phase) {
  resetNozzleState();

  // Phrase 1: a centred solo rises and gently bows from side to side.
  if (phase < 1.6) {
    const local = phase / 1.6;
    const envelope = Math.sin(local * Math.PI);
    emissionRates[1] = envelope * 48;
    emissionAngles[1] = Math.sin(local * Math.PI * 2) * CENTER_SWAY_DEGREES * DEG_TO_RAD;
    emissionEnergy[1] = 0.86 + envelope * 0.14;
    return;
  }

  // Phrase 2: the outside nozzles answer one another in short inward arcs.
  if (phase < 3.8) {
    const local = phase - 1.6;
    const beatTime = 0.44;
    const beat = Math.floor(local / beatTime);
    const beatProgress = (local % beatTime) / beatTime;
    const pulse = 1 - beatProgress;
    const nozzleIndex = beat % 2 === 0 ? 0 : 2;
    emissionRates[nozzleIndex] = 12 + pulse * 38;
    emissionAngles[nozzleIndex] = (
      nozzleIndex === 0 ? OUTER_BOW_DEGREES : -OUTER_BOW_DEGREES
    ) * DEG_TO_RAD;
    emissionEnergy[nozzleIndex] = 0.78 + pulse * 0.14;
    return;
  }

  // Phrase 3: all three form a balanced crossing arch.
  if (phase < 6.2) {
    const local = (phase - 3.8) / 2.4;
    const envelope = 0.58 + Math.sin(local * Math.PI) * 0.42;
    emissionRates[0] = 18 * envelope;
    emissionRates[1] = 26 * envelope;
    emissionRates[2] = 18 * envelope;
    emissionAngles[0] = GROUP_BOW_DEGREES * DEG_TO_RAD;
    emissionAngles[1] = (
      Math.sin(local * Math.PI * 2) * CENTER_SWAY_DEGREES * DEG_TO_RAD
    );
    emissionAngles[2] = -GROUP_BOW_DEGREES * DEG_TO_RAD;
    emissionEnergy[0] = 0.84;
    emissionEnergy[1] = 0.96;
    emissionEnergy[2] = 0.84;
    return;
  }

  // Phrase 4 is an intentional pause: existing arcs complete and the wall clears.
  if (phase < 7.3) return;

  // Phrase 5: a five-beat wave travels left, centre, right, centre, left.
  if (phase < 9.8) {
    const local = phase - 7.3;
    const beatTime = 0.5;
    const beat = Math.min(4, Math.floor(local / beatTime));
    const nozzleIndex = beat <= 2 ? beat : 4 - beat;
    const beatProgress = (local % beatTime) / beatTime;
    emissionRates[nozzleIndex] = 18 + (1 - beatProgress) * 30;
    emissionAngles[nozzleIndex] = (nozzleIndex - 1) * WAVE_BOW_DEGREES * DEG_TO_RAD;
    emissionEnergy[nozzleIndex] = 0.82 + (1 - beatProgress) * 0.12;
    return;
  }

  // Phrase 6: three compact unison pulses close the dance.
  if (phase < 11.4) {
    const local = (phase - 9.8) / 1.6;
    const pulse = Math.max(0, Math.sin(local * Math.PI * 6));
    emissionRates[0] = 26 * pulse;
    emissionRates[1] = 34 * pulse;
    emissionRates[2] = 26 * pulse;
    emissionAngles[0] = OUTER_BOW_DEGREES * DEG_TO_RAD;
    emissionAngles[2] = -OUTER_BOW_DEGREES * DEG_TO_RAD;
    emissionEnergy[0] = 0.88;
    emissionEnergy[1] = 1;
    emissionEnergy[2] = 0.88;
  }

  // The remaining 1.4 seconds are a second rest before the loop begins again.
}

function getNozzleX(canvasWidth, inset, radius, nozzleIndex, configuredSpread = 0.32) {
  const left = inset + radius;
  const center = canvasWidth * 0.5;
  const right = canvasWidth - inset - radius;
  const spread = clamp(Number(configuredSpread) || 0.32, 0.2, 0.4);
  if (nozzleIndex === 0) return clamp(center - canvasWidth * spread, left, center);
  if (nozzleIndex === 2) return clamp(center + canvasWidth * spread, center, right);
  return center;
}

function createParticle(nozzleIndex) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return null;

  const dpr = g.DPR || 1;
  const radius = randomRadiusForMode(g, MODES.PARTICLE_FOUNTAIN);
  const inset = getSimulationCollisionInsetPx(g);
  const sourceX = getNozzleX(
    canvas.width,
    inset,
    radius,
    nozzleIndex,
    g.particleFountainBNozzleSpread,
  );
  const sourceY = canvas.height - inset - radius - dpr;
  const { color, distributionIndex } = pickRandomColorWithIndex();
  const ball = new Ball(sourceX, sourceY, radius, color);

  ball.distributionIndex = distributionIndex;
  ball.isParticleFountainB = true;
  ball.fountainNozzleIndex = nozzleIndex;
  ball.alpha = 1;
  ball.age = 0;
  ball.fading = false;
  ball.fadeProgress = 0;
  ball.originalRadius = radius;

  const velocityVariation = 0.94 + Math.random() * 0.12;
  const velocity = resolveLaunchVelocityProfile(g, canvas)[nozzleIndex]
    * clamp(emissionEnergy[nozzleIndex], 0.6, 1.1)
    * velocityVariation;
  const configuredSpread = clamp(g.particleFountainSpreadAngle ?? 20, 4, 120);
  const jetSpread = Math.min(5, configuredSpread * 0.25) * DEG_TO_RAD;
  const angle = emissionAngles[nozzleIndex] + (Math.random() - 0.5) * jetSpread;

  ball.vx = velocity * Math.sin(angle);
  ball.vy = -velocity * Math.cos(angle);
  g.balls.push(ball);
  return ball;
}

function removeRetiredParticles(g, bottomThreshold) {
  const dpr = g.DPR || 1;
  const velocityThreshold = 20 * dpr;
  for (let i = g.balls.length - 1; i >= 0; i -= 1) {
    const ball = g.balls[i];
    if (!ball.isParticleFountainB) continue;
    const landed = ball.y + ball.r >= bottomThreshold - 0.5 * dpr
      && ball.vy >= -velocityThreshold;
    if ((ball.fading && ball.alpha <= 0) || landed) {
      g.balls.splice(i, 1);
    }
  }
}

export function initializeParticleFountainB() {
  const g = getGlobals();
  g.balls.length = 0;
  choreographyTime = 0;
  launchVelocityProfileKey = '';
  lastUpdateAtMs = globalThis.performance?.now?.() || 0;
  reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

  for (let i = 0; i < NOZZLE_COUNT; i += 1) {
    emissionAccumulators[i] = 0;
    nozzleWasActive[i] = 0;
  }

  configureChoreography(0.8);
  const initialCount = Math.min(
    reducedMotion ? 3 : 6,
    getMobileAdjustedCount(g.particleFountainMaxParticles || 180),
  );
  for (let i = 0; i < initialCount; i += 1) createParticle(1);
  configureChoreography(0);
}

export function applyParticleFountainBForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.PARTICLE_FOUNTAIN_B || !ball.isParticleFountainB) return;

  if (!ball.fading) {
    ball.age += dt;
    if (ball.age >= PARTICLE_LIFETIME) {
      ball.fading = true;
      ball.fadeProgress = 0;
    }
  }

  if (ball.fading) {
    ball.fadeProgress += dt;
    const progress = Math.min(1, ball.fadeProgress / FADE_DURATION);
    const easeInCirc = 1 - Math.sqrt(1 - progress * progress);
    ball.alpha = Math.max(0, 1 - easeInCirc);
    return;
  }

  if (g.mouseInCanvas) {
    const dpr = g.DPR || 1;
    const radius = (g.particleFountainMouseRepelRadius ?? 0) * dpr;
    const dx = ball.x - g.mouseX;
    const dy = ball.y - g.mouseY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared > 0.01 && distanceSquared < radius * radius) {
      const distance = Math.sqrt(distanceSquared);
      const falloff = 1 - distance / radius;
      const force = (g.particleFountainMouseRepelStrength ?? 15000) * dpr * falloff * dt;
      ball.vx += (dx / distance) * force;
      ball.vy += (dy / distance) * force;
    }
  }

  const drag = clamp(g.particleFountainWaterDrag ?? 0.02, 0.01, 1);
  ball.vx *= 1 - drag;
  ball.vy *= 1 - drag;
  ball.omega *= 1 - drag * 0.5;

  const upwardForce = Math.max(0, g.particleFountainUpwardForce || 0) * 0.6;
  if (upwardForce > 0) ball.vy -= upwardForce * (g.DPR || 1) * dt;
}

export function updateParticleFountainB(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.PARTICLE_FOUNTAIN_B || !g.canvas) return;

  const now = globalThis.performance?.now?.() || 0;
  const wallElapsed = lastUpdateAtMs > 0 && now > lastUpdateAtMs
    ? (now - lastUpdateAtMs) / 1000
    : 0;
  lastUpdateAtMs = now;
  const choreographyDt = Math.max(Math.max(0, dt), wallElapsed);
  const motionScale = reducedMotion ? 0.42 : 1;
  choreographyTime = (
    choreographyTime
      + choreographyDt
        * clamp(g.particleFountainBTempo ?? 0.82, 0.5, 1.2)
        * (reducedMotion ? 0.65 : 1)
  ) % CHOREOGRAPHY_DURATION;
  configureChoreography(choreographyTime);

  const bottomThreshold = g.canvas.height - getSimulationCollisionInsetPx(g);
  removeRetiredParticles(g, bottomThreshold);

  const configuredMax = Math.min(210, g.particleFountainMaxParticles || 180);
  const maxParticles = Math.max(1, getMobileAdjustedCount(configuredMax));
  const rateScale = clamp((g.particleFountainEmissionRate || 29) / 29, 0.3, 2.5);
  let activeCount = g.balls.length;

  for (let nozzleIndex = 0; nozzleIndex < NOZZLE_COUNT; nozzleIndex += 1) {
    const rate = emissionRates[nozzleIndex] * rateScale * motionScale;
    if (rate <= 0.01) {
      emissionAccumulators[nozzleIndex] = 0;
      nozzleWasActive[nozzleIndex] = 0;
      continue;
    }

    if (!nozzleWasActive[nozzleIndex]) {
      const cue = pressureCues[nozzleIndex];
      cue.x = clamp(getNozzleX(
        g.canvas.width,
        getSimulationCollisionInsetPx(g),
        g.R_MED || 8.9,
        nozzleIndex,
        g.particleFountainBNozzleSpread,
      ) / Math.max(1, g.canvas.width), 0, 1);
      triggerPressure(cue);
      nozzleWasActive[nozzleIndex] = 1;
    }

    emissionAccumulators[nozzleIndex] += rate * dt;
    let emitted = 0;
    while (
      emissionAccumulators[nozzleIndex] >= 1
      && activeCount < maxParticles
      && emitted < MAX_EMISSIONS_PER_NOZZLE_FRAME
    ) {
      createParticle(nozzleIndex);
      emissionAccumulators[nozzleIndex] -= 1;
      activeCount += 1;
      emitted += 1;
    }

    if (activeCount >= maxParticles) emissionAccumulators[nozzleIndex] = 0;
  }
}

export function getParticleFountainBDiagnostics() {
  return {
    choreographyTime,
    emissionRates: Array.from(emissionRates),
    emissionAngles: Array.from(emissionAngles),
    launchVelocities: Array.from(launchVelocities),
    peakHeightRatios: [
      SIDE_PEAK_HEIGHT_RATIO,
      CENTER_PEAK_HEIGHT_RATIO,
      SIDE_PEAK_HEIGHT_RATIO,
    ],
    reducedMotion,
  };
}
