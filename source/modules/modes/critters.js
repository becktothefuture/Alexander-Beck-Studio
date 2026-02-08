// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                 HIVE MODE                                     ║
// ║           Ball-only "little creatures" (step locomotion + steering)           ║
// ║     With realistic behaviors: foraging, directional memory, pheromones        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { getColorByIndex } from '../visual/colors.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';
import { MODES } from '../core/constants.js';

// ════════════════════════════════════════════════════════════════════════════════
// SWARM COLOR DISTRIBUTION
// Waypoints: ALL bright accent colors from current palette (indices 3, 5, 6, 7)
// Critters: All colors from palette (indices 0-7) - no strict separation
// ════════════════════════════════════════════════════════════════════════════════
const WAYPOINT_COLOR_INDICES = [3, 5, 6, 7];  // All 4 bright accents from palette
const CRITTER_COLOR_INDICES = [0, 1, 2, 3, 4, 5, 6, 7];  // All colors from palette

// ════════════════════════════════════════════════════════════════════════════════
// SPATIAL HASH GRID (for O(1) neighbor lookups instead of O(n²))
// ════════════════════════════════════════════════════════════════════════════════
const SPATIAL_GRID_SIZE = 8; // 8×8 = 64 cells
const SPATIAL_CELLS = SPATIAL_GRID_SIZE * SPATIAL_GRID_SIZE;
let spatialGrid = []; // Array of arrays (buckets)
let spatialCellWidth = 0;
let spatialCellHeight = 0;
let neighborCacheFrameId = 0;

function resetSpatialGrid() {
  spatialGrid = [];
  for (let i = 0; i < SPATIAL_CELLS; i++) {
    spatialGrid[i] = [];
  }
}

function buildSpatialGrid(balls, canvasW, canvasH) {
  // Clear all buckets
  for (let i = 0; i < SPATIAL_CELLS; i++) {
    spatialGrid[i].length = 0;
  }
  
  spatialCellWidth = canvasW / SPATIAL_GRID_SIZE;
  spatialCellHeight = canvasH / SPATIAL_GRID_SIZE;
  
  // Bucket each ball
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const cellX = Math.min(SPATIAL_GRID_SIZE - 1, Math.max(0, (b.x / canvasW * SPATIAL_GRID_SIZE) | 0));
    const cellY = Math.min(SPATIAL_GRID_SIZE - 1, Math.max(0, (b.y / canvasH * SPATIAL_GRID_SIZE) | 0));
    const idx = cellY * SPATIAL_GRID_SIZE + cellX;
    spatialGrid[idx].push(b);
  }
}

function collectNearbyCritters(ball, canvasW, canvasH, out) {
  const cellX = Math.min(SPATIAL_GRID_SIZE - 1, Math.max(0, (ball.x / canvasW * SPATIAL_GRID_SIZE) | 0));
  const cellY = Math.min(SPATIAL_GRID_SIZE - 1, Math.max(0, (ball.y / canvasH * SPATIAL_GRID_SIZE) | 0));
  out.length = 0;
  
  // Check 3×3 neighborhood (same cell + 8 adjacent)
  for (let dy = -1; dy <= 1; dy++) {
    const ny = cellY + dy;
    if (ny < 0 || ny >= SPATIAL_GRID_SIZE) continue;
    
    for (let dx = -1; dx <= 1; dx++) {
      const nx = cellX + dx;
      if (nx < 0 || nx >= SPATIAL_GRID_SIZE) continue;
      
      const idx = ny * SPATIAL_GRID_SIZE + nx;
      const bucket = spatialGrid[idx];
      for (let i = 0; i < bucket.length; i++) {
        if (bucket[i] !== ball) {
          out.push(bucket[i]);
        }
      }
    }
  }
  return out;
}

function getNearbyCritters(ball, canvasW, canvasH) {
  const globals = getGlobals();
  if (globals.featureCrittersNeighborCacheEnabled === false) {
    return collectNearbyCritters(ball, canvasW, canvasH, []);
  }

  if (ball._critterNeighborCacheFrame === neighborCacheFrameId && Array.isArray(ball._critterNeighborCache)) {
    return ball._critterNeighborCache;
  }

  const cache = Array.isArray(ball._critterNeighborCache) ? ball._critterNeighborCache : [];
  ball._critterNeighborCache = collectNearbyCritters(ball, canvasW, canvasH, cache);
  ball._critterNeighborCacheFrame = neighborCacheFrameId;
  return ball._critterNeighborCache;
}

// ════════════════════════════════════════════════════════════════════════════════
// HIVE STATE (global coordination for collective behavior)
// ════════════════════════════════════════════════════════════════════════════════
let hiveActivityLevel = 0.5;      // 0-1: how active the swarm is overall
let hivePulseTimer = 0;           // Timer for periodic activity waves
let hiveAlertLevel = 0;           // 0-1: collective threat awareness
let hiveStirX = 0.5;              // Normalized position of current "stir" center
let hiveStirY = 0.5;
let hiveStirRadius = 0;           // Expanding wave radius
let hiveStirActive = false;

// ════════════════════════════════════════════════════════════════════════════════
// JOURNEY POINTS: Points of interest scattered across the viewport
// Critters are drawn to these instead of random goals
// ════════════════════════════════════════════════════════════════════════════════
let journeyPoints = []; // Array of {x, y} normalized coords (0-1)

function generateJourneyPoints() {
  const globals = getGlobals();
  const count = globals.hiveJourneyPointCount || 4;
  const margin = globals.hiveJourneyPointMargin || 0.05;
  
  journeyPoints = [];
  const safeRange = 1 - 2 * margin;
  
  // For counts 1-4, use quadrant-based placement for good distribution
  // For counts 5-8, add additional points with random placement
  const quadrants = [
    { xMin: 0, xMax: 0.5, yMin: 0, yMax: 0.5 },     // top-left
    { xMin: 0.5, xMax: 1, yMin: 0, yMax: 0.5 },     // top-right
    { xMin: 0, xMax: 0.5, yMin: 0.5, yMax: 1 },     // bottom-left
    { xMin: 0.5, xMax: 1, yMin: 0.5, yMax: 1 }      // bottom-right
  ];
  
  for (let i = 0; i < count; i++) {
    let x, y;
    if (i < 4) {
      // Use quadrant placement for first 4 points
      const q = quadrants[i];
      x = margin + Math.max(0, q.xMin * safeRange) + Math.random() * (q.xMax - q.xMin) * safeRange;
      y = margin + Math.max(0, q.yMin * safeRange) + Math.random() * (q.yMax - q.yMin) * safeRange;
    } else {
      // Random placement for additional points
      x = margin + Math.random() * safeRange;
      y = margin + Math.random() * safeRange;
    }
    journeyPoints.push({ x, y });
  }
}

function getNextJourneyPoint(currentIndex) {
  if (journeyPoints.length === 0) generateJourneyPoints();
  const globals = getGlobals();
  const adherence = globals.hivePathAdherence ?? 0.75;
  
  if (Math.random() < adherence && journeyPoints.length > 1) {
    // Pick next sequential point
    const nextIndex = (currentIndex + 1) % journeyPoints.length;
    return { point: journeyPoints[nextIndex], index: nextIndex };
  } else {
    // Pick random point (different from current if possible)
    let idx = Math.floor(Math.random() * journeyPoints.length);
    if (journeyPoints.length > 1 && idx === currentIndex) {
      idx = (idx + 1) % journeyPoints.length;
    }
    return { point: journeyPoints[idx], index: idx };
  }
}

function resetHiveState() {
  hiveActivityLevel = 0.5;
  hivePulseTimer = 2 + Math.random() * 3;
  hiveAlertLevel = 0;
  hiveStirActive = false;
  hiveStirRadius = 0;
  generateJourneyPoints(); // Regenerate on each mode init
}

// ════════════════════════════════════════════════════════════════════════════════
// PHEROMONE GRID (32×32 = 1024 cells, ~4KB)
// ════════════════════════════════════════════════════════════════════════════════
const GRID_SIZE = 32;
const GRID_CELLS = GRID_SIZE * GRID_SIZE;
let pheromoneGrid = new Float32Array(GRID_CELLS);
let gridCanvasWidth = 0;
let gridCanvasHeight = 0;

function resetPheromoneGrid() {
  pheromoneGrid.fill(0);
}

function getCellIndex(x, y, canvasW, canvasH) {
  const cellX = Math.min(GRID_SIZE - 1, Math.max(0, (x / canvasW * GRID_SIZE) | 0));
  const cellY = Math.min(GRID_SIZE - 1, Math.max(0, (y / canvasH * GRID_SIZE) | 0));
  return cellY * GRID_SIZE + cellX;
}

function depositPheromone(x, y, canvasW, canvasH, amount) {
  const idx = getCellIndex(x, y, canvasW, canvasH);
  pheromoneGrid[idx] = Math.min(1, pheromoneGrid[idx] + amount);
}

function decayPheromoneGrid(dt) {
  const decayRate = 0.997;
  const factor = Math.pow(decayRate, dt * 60);
  for (let i = 0; i < GRID_CELLS; i++) {
    pheromoneGrid[i] *= factor;
  }
}

function samplePheromoneGradient(x, y, canvasW, canvasH) {
  const cellX = Math.min(GRID_SIZE - 1, Math.max(0, (x / canvasW * GRID_SIZE) | 0));
  const cellY = Math.min(GRID_SIZE - 1, Math.max(0, (y / canvasH * GRID_SIZE) | 0));
  
  let gradX = 0;
  let gradY = 0;
  const current = pheromoneGrid[cellY * GRID_SIZE + cellX];
  
  if (cellX > 0) {
    gradX -= pheromoneGrid[cellY * GRID_SIZE + (cellX - 1)] - current;
  }
  if (cellX < GRID_SIZE - 1) {
    gradX += pheromoneGrid[cellY * GRID_SIZE + (cellX + 1)] - current;
  }
  if (cellY > 0) {
    gradY -= pheromoneGrid[(cellY - 1) * GRID_SIZE + cellX] - current;
  }
  if (cellY < GRID_SIZE - 1) {
    gradY += pheromoneGrid[(cellY + 1) * GRID_SIZE + cellX] - current;
  }
  
  return { dx: gradX, dy: gradY };
}

// ════════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

function clamp(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

function wrapAngle(a) {
  if (a > Math.PI) a -= Math.PI * 2;
  else if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function smoothstep01(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

function stepPulse01(phase01, sharpness) {
  const tri = phase01 < 0.5 ? (phase01 * 2) : (2 - phase01 * 2);
  const s = smoothstep01(tri);
  const p = clamp(sharpness, 0.5, 6.0);
  return Math.pow(s, p);
}

// Snap angle to nearest 45° increment with some randomness
function snapToAngularGrid(angle, snapStrength) {
  const SNAP_ANGLES = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4, Math.PI, -Math.PI * 3 / 4, -Math.PI / 2, -Math.PI / 4];
  let nearest = angle;
  let minDist = Infinity;
  for (let i = 0; i < SNAP_ANGLES.length; i++) {
    const d = Math.abs(wrapAngle(angle - SNAP_ANGLES[i]));
    if (d < minDist) {
      minDist = d;
      nearest = SNAP_ANGLES[i];
    }
  }
  // Blend toward snap angle
  return angle + wrapAngle(nearest - angle) * snapStrength;
}

// ════════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════════

export function initializeCritters() {
  const globals = getGlobals();
  clearBalls();

  const w = globals.canvas.width;
  const h = globals.canvas.height;
  
  gridCanvasWidth = w;
  gridCanvasHeight = h;
  resetPheromoneGrid();
  resetHiveState();
  resetSpatialGrid();

  const rMin = globals.R_MIN || 8;
  const rMax = globals.R_MAX || 24;
  const rRange = Math.max(1, rMax - rMin);

  const baseCount = Math.max(10, Math.min(260, globals.critterCount | 0));
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;

  for (let i = 0; i < count; i++) {
    const x = (Math.random() * w) | 0;
    const y = (Math.random() * h) | 0;
    // Critters use greys only (waypoints hold the color)
    const colorIndex = CRITTER_COLOR_INDICES[Math.floor(Math.random() * CRITTER_COLOR_INDICES.length)];
    const color = getColorByIndex(colorIndex);
    const ball = spawnBall(x, y, color);

    const rr = randomRadiusForMode(globals, MODES.CRITTERS);
    ball.r = rr;
    ball.rBase = rr;
    ball.m = Math.max(1, rr * rr * 0.12);

    // Give initial random velocity so no critter starts frozen
    const initAngle = Math.random() * Math.PI * 2;
    const initSpeed = 20 + Math.random() * 30;
    ball.vx = Math.cos(initAngle) * initSpeed;
    ball.vy = Math.sin(initAngle) * initSpeed;
    
    // Disable wall deformation for critters (they're too light/fast)
    ball._skipWallEffects = true;

    // Core movement state
    ball._critterHeading = initAngle;
    ball._critterPhase = Math.random();
    ball._critterLastPhase = ball._critterPhase;
    ball._critterPause = 0;
    ball._critterPanic = 0;
    
    // Personality traits (set once at spawn, use config ranges)
    const nervMin = globals.critterNervousnessMin ?? 0.4;
    const nervMax = globals.critterNervousnessMax ?? 1.0;
    ball._critterNervousness = nervMin + Math.random() * (nervMax - nervMin);
    ball._critterPatience = Math.random();
    ball._critterFleeAngle = (Math.random() - 0.5) * 1.2;
    ball._critterDriftRate = 0.1 + Math.random() * 0.4;
    
    // Size-based speed multiplier (smaller = faster, range 1.0-1.5)
    const sizeNorm = clamp((rr - rMin) / rRange, 0, 1);
    ball._critterSizeSpeedMul = 1 + 0.5 * (1 - sizeNorm);
    
    // Directional memory
    ball._critterPreferredHeading = Math.random() * Math.PI * 2;
    
    // Behavioral timers
    ball._critterBurstTimer = 0;
    ball._critterStutterTimer = 0;
    ball._critterInvestigateTimer = 0;
    ball._critterActivityTimer = Math.random() * 2.0; // Wake up idle critters
    ball._critterRecoveryTimer = 0; // Cautious re-emergence after panic
    
    // ═══════════════════════════════════════════════════════════════════════════
    // LIFE SYSTEM: Goals, energy, curiosity
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Goal point - pick a journey point as initial destination
    const initJourneyIndex = Math.floor(Math.random() * (globals.hiveJourneyPointCount || 4));
    const initGoal = getNextJourneyPoint(initJourneyIndex);
    ball._critterGoalX = initGoal.point.x;
    ball._critterGoalY = initGoal.point.y;
    ball._critterJourneyIndex = initGoal.index;
    ball._critterGoalTimer = 3 + Math.random() * 8; // Time until new goal
    
    // Energy system (0-1): high = active, low = sluggish/resting
    ball._critterEnergy = 0.5 + Math.random() * 0.5;
    ball._critterEnergyRate = 0.02 + Math.random() * 0.03; // Depletion rate
    
    // Curiosity trait (0-1): high = explores new areas, low = stays familiar
    const curiosityBias = globals.critterCuriosityBias ?? 0.5;
    ball._critterCuriosity = Math.max(0, Math.min(1, curiosityBias + (Math.random() - 0.5) * 0.6));
    
    // Body animation state
    ball._critterBreathPhase = Math.random() * Math.PI * 2;
    ball._critterAlertPulse = 0; // Spikes when detecting threat
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// PER-FRAME GRID UPDATE (call once per frame, not per critter)
// ════════════════════════════════════════════════════════════════════════════════

export function updateCrittersGrid(dt) {
  const g = getGlobals();
  if (!g.canvas) return;
  
  const w = g.canvas.width;
  const h = g.canvas.height;
  const balls = g.balls;
  
  if (w !== gridCanvasWidth || h !== gridCanvasHeight) {
    gridCanvasWidth = w;
    gridCanvasHeight = h;
    resetPheromoneGrid();
    resetHiveState();
    resetSpatialGrid();
  }
  
  decayPheromoneGrid(dt);
  
  // Build spatial hash grid for O(1) neighbor lookups
  buildSpatialGrid(balls, w, h);
  neighborCacheFrameId++;
  
  // ════════════════════════════════════════════════════════════════════════════
  // HIVE MIND: Collective behavior coordination
  // ════════════════════════════════════════════════════════════════════════════
  
  // Measure collective activity (how many critters are moving)
  let movingCount = 0;
  let totalPanic = 0;
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const v2 = b.vx * b.vx + b.vy * b.vy;
    if (v2 > 200) movingCount++;
    totalPanic += b._critterPanic || 0;
  }
  
  const movingRatio = balls.length > 0 ? movingCount / balls.length : 0;
  hiveActivityLevel = hiveActivityLevel * 0.95 + movingRatio * 0.05;
  hiveAlertLevel = balls.length > 0 ? totalPanic / balls.length : 0;
  
  // Periodic activity pulse - stirs the hive when too still
  const stirInterval = g.critterHiveStirInterval ?? 5.0;
  const waveSpeed = g.critterHiveWaveSpeed ?? 0.4;
  
  hivePulseTimer -= dt;
  if (hivePulseTimer <= 0 || hiveActivityLevel < 0.3) {
    // Trigger a "stir" wave from random position
    hiveStirX = 0.1 + Math.random() * 0.8;
    hiveStirY = 0.1 + Math.random() * 0.8;
    hiveStirRadius = 0;
    hiveStirActive = true;
    hivePulseTimer = stirInterval * (0.6 + Math.random() * 0.8);
  }
  
  // Expand stir wave
  if (hiveStirActive) {
    hiveStirRadius += dt * waveSpeed;
    if (hiveStirRadius > 1.5) {
      hiveStirActive = false;
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// PER-CRITTER FORCES
// ════════════════════════════════════════════════════════════════════════════════

export function applyCrittersForces(ball, dt) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const DPR = g.DPR || 1;
  const baseSpeed = Math.max(0, g.critterSpeed || 0);
  const vMax = Math.max(50, g.critterMaxSpeed || 0) * DPR;
  const baseStepHz = Math.max(0, g.critterStepHz || 0);
  const sharp = g.critterStepSharpness ?? 2.4;
  const turnNoise = Math.max(0, g.critterTurnNoise || 0);
  const turnSeek = Math.max(0, g.critterTurnSeek || 0);
  const avoidR = Math.max(0, (g.critterAvoidRadius || 0) * DPR);
  const avoidF = Math.max(0, g.critterAvoidForce || 0);
  const edgeAvoid = Math.max(0, g.critterEdgeAvoid || 0);
  const mousePull = Math.max(0, g.critterMousePull || 0);
  const mouseRadiusVw = Math.max(0, g.critterMouseRadiusVw || 0);

  const canvasW = canvas.width;
  const canvasH = canvas.height;

  // Size-based speed scaling (critters move at 70% base, panic brings to 100%)
  const sizeSpeedMul = ball._critterSizeSpeedMul || 1;
  const speed = baseSpeed * sizeSpeedMul * 0.7; // 70% base speed
  const stepHz = baseStepHz * sizeSpeedMul;

  // Load state
  let heading = ball._critterHeading || 0;
  let phase = ball._critterPhase || 0;
  let lastPhase = ball._critterLastPhase ?? phase;
  let pause = ball._critterPause || 0;
  let panicLevel = ball._critterPanic || 0;
  let preferredHeading = ball._critterPreferredHeading || heading;
  let burstTimer = ball._critterBurstTimer || 0;
  let stutterTimer = ball._critterStutterTimer || 0;
  let investigateTimer = ball._critterInvestigateTimer || 0;
  let activityTimer = ball._critterActivityTimer || 0;
  let recoveryTimer = ball._critterRecoveryTimer || 0;
  
  // Life system state
  let goalX = ball._critterGoalX ?? 0.5;
  let goalY = ball._critterGoalY ?? 0.5;
  let goalTimer = ball._critterGoalTimer || 5;
  let journeyIndex = ball._critterJourneyIndex ?? 0;
  let energy = ball._critterEnergy ?? 0.7;
  const energyRate = ball._critterEnergyRate || 0.025;
  const curiosity = ball._critterCuriosity || 0.5;
  let breathPhase = ball._critterBreathPhase || 0;
  let alertPulse = ball._critterAlertPulse || 0;
  
  const nervousness = ball._critterNervousness || 0.5;
  const patience = ball._critterPatience || 0.5;
  const fleeAngle = ball._critterFleeAngle || 0;
  const driftRate = ball._critterDriftRate || 0.2;

  let steerX = 0;
  let steerY = 0;
  let instantThreat = 0;
  let fleeFromX = 0;
  let fleeFromY = 0;
  let avoidanceAx = 0;
  let avoidanceAy = 0;
  let avoidanceCount = 0;

  // ──────────────────────────────────────────────────────────────────────────────
  // GROUND FRICTION (makes critters feel grounded)
  // ──────────────────────────────────────────────────────────────────────────────
  const groundFriction = 0.88;
  ball.vx *= Math.pow(groundFriction, dt * 60);
  ball.vy *= Math.pow(groundFriction, dt * 60);

  // ──────────────────────────────────────────────────────────────────────────────
  // MOUSE THREAT DETECTION + PERIPHERAL AWARENESS
  // ──────────────────────────────────────────────────────────────────────────────
  if (mousePull > 0 && g.mouseX !== -1e9) {
    const vw = (window.innerWidth || canvasW) / 100;
    const fearRadius = Math.max(1, mouseRadiusVw * vw) * DPR;
    const cautionRadius = fearRadius * 1.5; // Outer caution zone
    const dx = ball.x - g.mouseX;
    const dy = ball.y - g.mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy) + 1e-6;

    if (dist < cautionRadius) {
      fleeFromX = dx / dist;
      fleeFromY = dy / dist;
      
      if (dist < fearRadius) {
        // Full panic zone
        const proximity = 1 - (dist / fearRadius);
        instantThreat = proximity * proximity * nervousness;
        
        // Gentle panic rise
        panicLevel = Math.min(1, panicLevel + instantThreat * 3.0 * dt);
        
        // Subtle steering away from mouse (no direct velocity impulse)
        steerX += fleeFromX * instantThreat * 1.5;
        steerY += fleeFromY * instantThreat * 1.5;
        
      } else {
        // Peripheral caution zone - subtle avoidance before full panic
        const cautionProximity = 1 - ((dist - fearRadius) / (cautionRadius - fearRadius));
        const cautionThreat = cautionProximity * 0.3 * nervousness;
        
        // Gentle steering away
        steerX += fleeFromX * cautionThreat * 2.0;
        steerY += fleeFromY * cautionThreat * 2.0;
        
        // Slight panic buildup
        panicLevel = Math.min(1, panicLevel + cautionThreat * 2.0 * dt);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PANIC CONTAGION: Use spatial grid for O(1) neighbor lookup
  // ──────────────────────────────────────────────────────────────────────────────
  if (avoidR > 0) {
    const nearby = getNearbyCritters(ball, canvasW, canvasH);
    const avoidR2 = avoidR * avoidR;
    const contagionRadius = avoidR * 1.5;
    const contagionR2 = contagionRadius * contagionRadius;
    let nearbyPanic = 0;
    let nearbyCount = 0;
    
    for (let i = 0; i < nearby.length; i++) {
      const o = nearby[i];
      const dx = ball.x - o.x;
      const dy = ball.y - o.y;
      const d2 = dx * dx + dy * dy;

      if (avoidF > 0 && d2 > 0 && d2 < avoidR2) {
        const invD = 1 / Math.sqrt(d2);
        const distance = 1 / invD;
        const q = 1 - (distance / avoidR);
        avoidanceAx += dx * invD * q * q;
        avoidanceAy += dy * invD * q * q;
        avoidanceCount++;
      }

      if (d2 > 0 && d2 < contagionR2) {
        const theirPanic = o._critterPanic || 0;
        if (theirPanic > 0.2) {
          const invD = 1 / Math.sqrt(d2);
          const proximity = 1 - (1 / invD) / contagionRadius;
          nearbyPanic += theirPanic * proximity;
          nearbyCount++;
        }
      }
    }
    
    if (nearbyCount > 0) {
      const contagionBoost = (nearbyPanic / nearbyCount) * nervousness * 0.5;
      panicLevel = Math.min(1, panicLevel + contagionBoost * dt);
    }
  }

  // Panic decay when safe + CAUTIOUS RE-EMERGENCE
  if (instantThreat < 0.01) {
    // Faster panic decay to resume normal behavior quickly
    panicLevel = Math.max(0, panicLevel - dt * 2.0);
    
    // Short recovery period when panic drops below threshold
    if (panicLevel < 0.15 && panicLevel > 0.01 && recoveryTimer <= 0) {
      recoveryTimer = 0.3 + Math.random() * 0.5; // 0.3-0.8s recovery (much shorter)
    }
    
    // No additional action needed when calm
  }
  
  // Recovery timer: cautious creeping after danger passes
  if (recoveryTimer > 0) {
    recoveryTimer = Math.max(0, recoveryTimer - dt);
  }
  
  // Decrement timers
  if (burstTimer > 0) burstTimer = Math.max(0, burstTimer - dt);
  if (stutterTimer > 0) stutterTimer = Math.max(0, stutterTimer - dt);
  if (investigateTimer > 0) investigateTimer = Math.max(0, investigateTimer - dt);
  
  // ACTIVITY TIMER: Gently wake up idle critters (no velocity impulse)
  activityTimer -= dt;
  if (activityTimer <= 0) {
    activityTimer = 1.0 + Math.random() * 1.5;
    const v2 = ball.vx * ball.vx + ball.vy * ball.vy;
    if (v2 < 200) {
      // Just end pause and boost energy - natural movement will resume
      if (pause > 0.2) pause = 0.2;
      energy = Math.min(1, energy + 0.2);
    }
  }
  
  // ──────────────────────────────────────────────────────────────────────────────
  // HIVE INFLUENCE: Subtle stir wave - just wakes up idle critters, no push
  // ──────────────────────────────────────────────────────────────────────────────
  if (hiveStirActive) {
    const critterNormX = ball.x / canvasW;
    const critterNormY = ball.y / canvasH;
    const distToStir = Math.sqrt(
      (critterNormX - hiveStirX) * (critterNormX - hiveStirX) +
      (critterNormY - hiveStirY) * (critterNormY - hiveStirY)
    );
    
    // Wave band: affects critters near the expanding edge
    const waveBandWidth = 0.12;
    const distFromWaveEdge = Math.abs(distToStir - hiveStirRadius);
    
    if (distFromWaveEdge < waveBandWidth) {
      const waveStrength = 1 - (distFromWaveEdge / waveBandWidth);
      
      // NO directional push - just wake up the critter
      // End pause and boost energy so they resume natural movement
      if (pause > 0.1) pause = 0.1;
      energy = Math.min(1, energy + 0.15 * waveStrength);
    }
  }
  
  // Hive alert influence: when hive is on alert, reduce pause chance
  const hiveAlertInfluence = hiveAlertLevel * 0.5;

  const panic01 = clamp(panicLevel, 0, 1);
  const isRecovering = recoveryTimer > 0;

  // ──────────────────────────────────────────────────────────────────────────────
  // LIFE SYSTEM: Energy, goals, curiosity
  // ──────────────────────────────────────────────────────────────────────────────
  
  // Energy depletion (moving costs energy, panic drains slightly faster)
  const energyCost = (pause > 0 ? 0.003 : energyRate * 0.5) * (1 + panic01 * 0.5) * dt;
  energy = Math.max(0.3, energy - energyCost); // Never drop below 30%
  
  // Energy recovery - always recovering slowly, faster when calm
  const baseRecovery = 0.02 * dt; // Always some recovery
  const calmRecovery = (panic01 < 0.2) ? 0.05 * dt : 0;
  energy = Math.min(1, energy + baseRecovery + calmRecovery);
  
  // Low energy = slightly slower movement (but never too slow)
  const energyMul = 0.8 + 0.2 * energy; // Range 0.8-1.0 instead of 0.6-1.0
  
  // Goal timer - pick new destination periodically from journey points
  const goalSwitchMin = g.hiveGoalSwitchMinS ?? 4;
  const goalSwitchMax = g.hiveGoalSwitchMaxS ?? 14;
  const goalReachedRadius = (g.hiveGoalReachedRadius ?? 50) * DPR;
  const goalAttractionStrength = g.hiveGoalAttractionStrength ?? 0.5;
  
  goalTimer -= dt;
  if (goalTimer <= 0 || panic01 > 0.5) {
    // Pick a journey point as the new goal using path adherence
    const next = getNextJourneyPoint(journeyIndex);
    goalX = next.point.x;
    goalY = next.point.y;
    journeyIndex = next.index;
    const switchRange = Math.max(0, goalSwitchMax - goalSwitchMin);
    goalTimer = goalSwitchMin + Math.random() * switchRange + (1 - energy) * 5; // Tired = longer between goals
  }
  
  // Steer toward goal (subtle influence when calm)
  if (panic01 < 0.15 && pause <= 0) {
    const goalWorldX = goalX * canvasW;
    const goalWorldY = goalY * canvasH;
    const toGoalX = goalWorldX - ball.x;
    const toGoalY = goalWorldY - ball.y;
    const goalDist = Math.sqrt(toGoalX * toGoalX + toGoalY * toGoalY) + 1e-6;
    
    // Reached goal? Pick new one sooner
    if (goalDist < goalReachedRadius) {
      goalTimer = Math.min(goalTimer, 1 + Math.random() * 2);
    }
    
    // Subtle goal-seeking (stronger for high-energy critters)
    const goalStrength = goalAttractionStrength * energy * (1 - panic01 * 6);
    steerX += (toGoalX / goalDist) * goalStrength;
    steerY += (toGoalY / goalDist) * goalStrength;
  }
  
  // Curiosity: attracted to low-pheromone (unexplored) areas
  if (curiosity > 0.4 && panic01 < 0.2) {
    const gradient = samplePheromoneGradient(ball.x, ball.y, canvasW, canvasH);
    // Invert gradient - go AWAY from high pheromone (toward unexplored)
    const exploreWeight = curiosity * 0.2 * (1 - panic01 * 5);
    steerX -= gradient.dx * exploreWeight;
    steerY -= gradient.dy * exploreWeight;
  }
  
  // Alert pulse - spikes on threat detection, decays
  if (instantThreat > alertPulse) {
    alertPulse = instantThreat;
  } else {
    alertPulse = Math.max(0, alertPulse - dt * 3);
  }
  
  // Breathing phase (continuous slow oscillation)
  breathPhase += dt * (1.5 + panic01 * 2); // Faster breathing when panicked
  if (breathPhase > Math.PI * 2) breathPhase -= Math.PI * 2;

  // ──────────────────────────────────────────────────────────────────────────────
  // STUTTER-FLEE: Brief micro-pauses during escape
  // ──────────────────────────────────────────────────────────────────────────────
  if (panic01 > 0.4 && stutterTimer <= 0 && Math.random() < 0.08 * dt * 60) {
    stutterTimer = 0.03 + Math.random() * 0.04; // 30-70ms micro-pause
  }
  
  const isStuttering = stutterTimer > 0;

  // ──────────────────────────────────────────────────────────────────────────────
  // FORAGING: STOP-AND-GO PAUSES + INVESTIGATION
  // ──────────────────────────────────────────────────────────────────────────────
  if (pause > 0) {
    pause = Math.max(0, pause - dt);
    
    // INVESTIGATION: Small heading oscillation when paused
    if (investigateTimer > 0) {
      const oscillation = Math.sin(investigateTimer * 15) * 0.15;
      heading = wrapAngle(heading + oscillation * dt);
    }
    
    // TWITCH: Tiny random jitter when idle (antenna/leg movements)
    if (Math.random() < 0.3 * dt * 60) {
      ball.vx += (Math.random() - 0.5) * 1.0;
      ball.vy += (Math.random() - 0.5) * 1.0;
    }
    
    if (pause <= 0) {
      burstTimer = 0.12; // Post-pause speed burst
      investigateTimer = 0;
    }
  } else if (panic01 < 0.1 && !isRecovering && hiveAlertInfluence < 0.3) {
    // Pause chance based on patience personality 
    // (disabled during recovery or when hive is on alert)
    const pauseChance = (0.08 + 0.12 * patience) * (1 - hiveAlertInfluence) * dt;
    if (Math.random() < pauseChance) {
      const minPause = 0.15 + patience * 0.1;
      const maxPause = 0.3 + patience * 0.5; // Shorter pauses overall
      pause = minPause + Math.random() * (maxPause - minPause);
      investigateTimer = pause;
    }
  }
  
  // RECOVERY FREEZE: Brief freeze when threat first disappears
  if (isRecovering && recoveryTimer > (1.0 + Math.random() * 0.5) && pause <= 0) {
    // Freeze briefly at start of recovery ("is it safe?")
    if (Math.random() < 0.3 * dt * 60) {
      pause = 0.1 + Math.random() * 0.15;
    }
  }

  // Cancel pause during panic
  if (panic01 > 0.2) {
    pause = 0;
    investigateTimer = 0;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // DIRECTIONAL MEMORY: PREFERRED HEADING DRIFT
  // ──────────────────────────────────────────────────────────────────────────────
  if (panic01 < 0.15) {
    const driftNoise = (Math.random() * 2 - 1) * driftRate * dt;
    preferredHeading = wrapAngle(preferredHeading + driftNoise);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // EDGE BEHAVIOR: Avoid when panicked, HUG when calm
  // ──────────────────────────────────────────────────────────────────────────────
  const zone = Math.max(24 * DPR, Math.min(canvasW, canvasH) * 0.08);
  const x = ball.x;
  const y = ball.y;
  
  if (panic01 > 0.1 && edgeAvoid > 0) {
    // Panicked: avoid edges
    if (x < zone) steerX += (1 - x / zone) * edgeAvoid;
    else if (x > canvasW - zone) steerX -= (1 - (canvasW - x) / zone) * edgeAvoid;
    if (y < zone) steerY += (1 - y / zone) * edgeAvoid;
    else if (y > canvasH - zone) steerY -= (1 - (canvasH - y) / zone) * edgeAvoid;
  } else if (panic01 < 0.1) {
    // Calm: subtle edge hugging (bugs feel safer at edges)
    const edgeHugStrength = 0.3;
    const edgeHugZone = zone * 2;
    if (x < edgeHugZone) steerX -= (1 - x / edgeHugZone) * edgeHugStrength;
    else if (x > canvasW - edgeHugZone) steerX += (1 - (canvasW - x) / edgeHugZone) * edgeHugStrength;
    if (y < edgeHugZone) steerY -= (1 - y / edgeHugZone) * edgeHugStrength;
    else if (y > canvasH - edgeHugZone) steerY += (1 - (canvasH - y) / edgeHugZone) * edgeHugStrength;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PANIC FLEE STEERING
  // ──────────────────────────────────────────────────────────────────────────────
  if (panic01 > 0.03 && (fleeFromX !== 0 || fleeFromY !== 0)) {
    const scatter = fleeAngle * panic01;
    const cosS = Math.cos(scatter);
    const sinS = Math.sin(scatter);
    const scatterX = fleeFromX * cosS - fleeFromY * sinS;
    const scatterY = fleeFromX * sinS + fleeFromY * cosS;
    
    const fearStrength = mousePull * (0.6 + panic01);
    steerX += scatterX * fearStrength;
    steerY += scatterY * fearStrength;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PHEROMONE TRAIL FOLLOWING (subtle, disabled during panic)
  // ──────────────────────────────────────────────────────────────────────────────
  if (panic01 < 0.2) {
    const gradient = samplePheromoneGradient(ball.x, ball.y, canvasW, canvasH);
    const pheromoneWeight = 0.3 * (1 - panic01 * 5);
    steerX += gradient.dx * pheromoneWeight;
    steerY += gradient.dy * pheromoneWeight;
  }
  
  // Deposit pheromone
  depositPheromone(ball.x, ball.y, canvasW, canvasH, 0.025 * dt * 60);

  // ──────────────────────────────────────────────────────────────────────────────
  // DIRECTIONAL BIAS: STEER TOWARD PREFERRED HEADING (when calm)
  // ──────────────────────────────────────────────────────────────────────────────
  if (panic01 < 0.1 && pause <= 0) {
    const prefX = Math.cos(preferredHeading);
    const prefY = Math.sin(preferredHeading);
    steerX += prefX * 0.4;
    steerY += prefY * 0.4;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // LOCAL AVOIDANCE: Use spatial grid for O(1) neighbor lookup
  // ──────────────────────────────────────────────────────────────────────────────
  if (avoidR > 0 && avoidF > 0 && avoidanceCount > 0) {
    const invN = 1 / avoidanceCount;
    const meanAx = avoidanceAx * invN;
    const meanAy = avoidanceAy * invN;
    steerX += meanAx * 1.2;
    steerY += meanAy * 1.2;
    ball.vx += meanAx * (avoidF * 0.5) * dt;
    ball.vy += meanAy * (avoidF * 0.5) * dt;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // TURN DYNAMICS + SHARP TURN BIAS
  // ──────────────────────────────────────────────────────────────────────────────
  const noise = (Math.random() * 2 - 1) * turnNoise * dt;
  
  const steerLen2 = steerX * steerX + steerY * steerY;
  if (steerLen2 > 1e-6) {
    const desired = Math.atan2(steerY, steerX);
    let delta = wrapAngle(desired - heading);
    
    // SHARP TURN BIAS: Snap toward 45°/90° angles when changing direction significantly
    if (Math.abs(delta) > 0.3 && panic01 < 0.5) {
      const snappedHeading = snapToAngularGrid(desired, 0.4);
      delta = wrapAngle(snappedHeading - heading);
    }
    
    heading = wrapAngle(heading + delta * turnSeek * dt + noise);
  } else {
    heading = wrapAngle(heading + noise);
  }
  
  // Damping
  heading = wrapAngle(heading);

  // ──────────────────────────────────────────────────────────────────────────────
  // STRIDE PHASE
  // ──────────────────────────────────────────────────────────────────────────────
  const panicStepBoost = 1 + panic01 * 0.5; // Modest step frequency increase
  if (stepHz > 0) {
    lastPhase = phase;
    phase += stepHz * panicStepBoost * dt;
    phase -= (phase | 0);
  }

  const isPaused = pause > 0 || isStuttering;
  const pulse = isPaused ? 0 : stepPulse01(phase, sharp);
  
  // Speed boost: panic (max 1.43x to go from 70% to 100%) + post-pause burst
  // Recovery: slow creeping at 50% speed while checking if safe
  // Energy: low energy = slower movement
  const burstMul = burstTimer > 0 ? 1.15 : 1.0;
  const panicSpeedMul = 1 + panic01 * 0.43; // 70% * 1.43 = 100%
  const recoveryMul = isRecovering ? 0.5 : 1.0; // Cautious creeping
  const effectiveSpeedMul = panicSpeedMul * burstMul * recoveryMul * energyMul;

  // ──────────────────────────────────────────────────────────────────────────────
  // ANTICIPATION SQUASH
  // ──────────────────────────────────────────────────────────────────────────────
  if (!isPaused && phase > 0.82) {
    const anticip = (phase - 0.82) / 0.18;
    const amt = 0.08 * anticip;
    if (amt > ball.squashAmount) {
      ball.squashAmount = amt;
      ball.squashNormalAngle = -Math.PI / 2;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // HOP IMPULSE
  // ──────────────────────────────────────────────────────────────────────────────
  const wrapped = (stepHz > 0) && (phase < lastPhase);
  if (!isPaused && wrapped) {
    const massScale = Math.max(0.25, ball.m / (g.MASS_BASELINE_KG || 129));
    const hopBase = speed * (0.5 + 0.5 * pulse) * effectiveSpeedMul;
    const hop = hopBase * (0.85 + 0.3 * Math.random());
    const cx = Math.cos(heading);
    const cy = Math.sin(heading);
    ball.vx += (cx * hop) / massScale;
    ball.vy += (cy * hop) / massScale;

    ball.squashAmount = Math.max(ball.squashAmount, 0.18 + 0.1 * panic01);
    ball.squashNormalAngle = Math.PI / 2;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // GRAZING THRUST
  // ──────────────────────────────────────────────────────────────────────────────
  if (!isPaused) {
    const thrust = speed * (0.1 + 0.2 * pulse) * effectiveSpeedMul;
    ball.vx += Math.cos(heading) * thrust * dt;
    ball.vy += Math.sin(heading) * thrust * dt;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MAX SPEED CLAMP
  // ──────────────────────────────────────────────────────────────────────────────
  const effectiveMax = vMax * sizeSpeedMul;
  const vx = ball.vx;
  const vy = ball.vy;
  const v2 = vx * vx + vy * vy;
  const max2 = effectiveMax * effectiveMax;
  if (v2 > max2) {
    const s = effectiveMax / (Math.sqrt(v2) + 1e-6);
    ball.vx = vx * s;
    ball.vy = vy * s;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // BODY ANIMATION: Breathing, alertness, movement bob
  // ──────────────────────────────────────────────────────────────────────────────
  const rBase = ball.rBase || ball.r;
  
  // Breathing: subtle scale oscillation (more visible when idle)
  const breathAmp = isPaused ? 0.03 : 0.015;
  const breathScale = 1 + Math.sin(breathPhase) * breathAmp;
  
  // Alert pulse: quick scale spike when detecting threat
  const alertScale = 1 + alertPulse * 0.08;
  
  // Movement bob: slight vertical squash synced to step phase
  const moveBob = isPaused ? 0 : Math.sin(phase * Math.PI * 2) * 0.02;
  
  // Energy visual: tired critters slightly smaller
  const energyScale = 0.95 + 0.05 * energy;
  
  // Combine all scale factors
  const finalScale = breathScale * alertScale * energyScale;
  ball.r = rBase * finalScale;
  
  // Movement squash: compress slightly in direction of travel
  if (!isPaused && v2 > 100) {
    const moveSquash = Math.min(0.06, Math.sqrt(v2) * 0.0001);
    ball.squashAmount = Math.max(ball.squashAmount, moveSquash + moveBob);
    ball.squashNormalAngle = heading + Math.PI / 2;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // STORE STATE
  // ──────────────────────────────────────────────────────────────────────────────
  ball._critterHeading = heading;
  ball._critterPhase = phase;
  ball._critterLastPhase = lastPhase;
  ball._critterPause = pause;
  ball._critterPanic = panicLevel;
  ball._critterPreferredHeading = preferredHeading;
  ball._critterBurstTimer = burstTimer;
  ball._critterStutterTimer = stutterTimer;
  ball._critterInvestigateTimer = investigateTimer;
  ball._critterActivityTimer = activityTimer;
  ball._critterRecoveryTimer = recoveryTimer;
  
  // Life system state
  ball._critterGoalX = goalX;
  ball._critterGoalY = goalY;
  ball._critterGoalTimer = goalTimer;
  ball._critterJourneyIndex = journeyIndex;
  ball._critterEnergy = energy;
  ball._critterBreathPhase = breathPhase;
  ball._critterAlertPulse = alertPulse;

  ball.theta = heading;
}

// ════════════════════════════════════════════════════════════════════════════════
// WAYPOINT RENDERING
// Static colored balls at journey point locations
// ════════════════════════════════════════════════════════════════════════════════

// Cache waypoint colors (regenerate when journey points or palette changes)
let waypointColors = [];
let lastJourneyPointCount = 0;
let lastPaletteTemplate = null;

function ensureWaypointColors() {
  const globals = getGlobals();
  const pointCount = globals.hiveJourneyPointCount || 4;
  const currentTemplate = globals.currentTemplate || 'industrialTeal';
  
  // Regenerate colors if point count or palette changed
  const needsRegeneration = 
    waypointColors.length !== pointCount || 
    lastJourneyPointCount !== pointCount ||
    lastPaletteTemplate !== currentTemplate;
    
  if (needsRegeneration) {
    // Waypoints use the dominant/accent colors from the palette
    waypointColors = [];
    for (let i = 0; i < pointCount; i++) {
      const colorIndex = WAYPOINT_COLOR_INDICES[i % WAYPOINT_COLOR_INDICES.length];
      waypointColors.push(getColorByIndex(colorIndex));
    }
    lastJourneyPointCount = pointCount;
    lastPaletteTemplate = currentTemplate;
  }
}

export function renderCrittersWaypoints(ctx) {
  const globals = getGlobals();
  
  // Check if waypoints should be visible (default: true)
  if (globals.hiveWaypointVisible === false) return;
  if (journeyPoints.length === 0) return;
  
  const canvas = globals.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  
  // Get waypoint settings
  const sizeMul = globals.hiveWaypointSizeMul ?? 1.5;
  const opacity = globals.hiveWaypointOpacity ?? 1.0;
  const baseRadius = (globals.R_MIN + globals.R_MAX) / 2 || 12;
  const waypointRadius = baseRadius * sizeMul;
  
  // Ensure we have colors for waypoints
  ensureWaypointColors();
  
  ctx.save();
  ctx.globalAlpha = opacity;
  
  for (let i = 0; i < journeyPoints.length; i++) {
    const point = journeyPoints[i];
    const x = point.x * w;
    const y = point.y * h;
    const color = waypointColors[i] || '#ffffff';
    
    // Draw waypoint ball
    ctx.beginPath();
    ctx.arc(x, y, waypointRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  
  ctx.restore();
}

// Export for external access (e.g., mode-controller renderer hook)
export function getJourneyPoints() {
  return journeyPoints;
}
