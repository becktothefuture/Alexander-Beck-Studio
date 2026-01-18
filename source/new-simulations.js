import { initState, setCanvas, getGlobals, applyLayoutCSSVars } from './modules/core/state.js';
import { setupRenderer, getCanvas, getContext, resize } from './modules/rendering/renderer.js';
import { setupPointer } from './modules/input/pointer.js';
import { loadRuntimeConfig } from './modules/utils/runtime-config.js';
import { applyColorTemplate } from './modules/visual/colors.js';
import { MODES } from './modules/core/constants.js';
import { clearBalls } from './modules/core/state.js';
import { spawnBall } from './modules/physics/spawn.js';
import { clampRadiusToGlobalBounds } from './modules/utils/ball-sizing.js';
import { render } from './modules/physics/engine.js';
import { createSplatConfigPanel, showPanel, togglePanel, updatePanelVariant } from './splat-config-panel.js';

const BASE_CONFIG_OVERRIDES = {
  sizeVariationGlobalMul: 0,
  sizeVariationPit: 0,
  sizeVariationFlies: 0,
  sizeVariationWeightless: 0,
  sizeVariationWater: 0,
  sizeVariationVortex: 0,
  sizeVariationPingPong: 0,
  sizeVariationMagnetic: 0,
  sizeVariationBubbles: 0,
  sizeVariationKaleidoscope: 0,
  sizeVariationCritters: 0,
  sizeVariationNeural: 0,
  sizeVariationParallaxLinear: 0,
  sphere3dDotSizeMul: 1.2
};

const VARIANTS = [
  {
    id: 'splat-variant-a',
    label: 'Variant A · Perfect Cube',
    pointSource: generateCubeMeshPoints,
    config: {
      pointCount: 400,
      modelScale: 1.1,
      focalLength: 850,
      idleSpeed: 0.025,
      tumbleSpeed: 4.2, // Increased for more movement
      tumbleDamping: 0.987, // Higher = more inertia (slower to stop)
      cubeSize: 0.8
    }
  },
  {
    id: 'splat-variant-b',
    label: 'Variant B · Rubber Ducky',
    pointSource: generateDuckyPoints,
    config: {
      pointCount: 2400,
      modelScale: 2.2,
      focalLength: 920,
      idleSpeed: 0.02,
      tumbleSpeed: 5.5,
      tumbleDamping: 0.975,
      floatAmplitude: 22,
      floatSpeed: 0.8,
      levitationHeight:0.05
    }
  },
  {
    id: 'splat-variant-c',
    label: 'Variant C · Alpine Valley',
    pointSource: generateValleyScenePoints,
    config: {
      pointCount: 1500,
      modelScale: 1.0,
      focalLength: 1250,
      idleSpeed: 0,
      tumbleSpeed: 0,
      tumbleDamping: 1.0,
      cameraPanSpeed: 0.25,
      riverFlowSpeed: 0.4,
      baseRadiusScale: 0.12
    }
  }
];

const TAU = Math.PI * 2;
const BASE_RADIUS_SCALE = 0.22;
let currentVariantState = null;

function updateVariantLabel(variant) {
  const label = document.getElementById('splat-variant-label');
  if (!label) return;
  label.textContent = `NEW SIMULATIONS · ${variant?.label || ''}`;
}

function seededRandom(seed) {
  let t = seed;
  return () => {
    t = (t * 9301 + 49297) % 233280;
    return t / 233280;
  };
}

function rotateXYZ(point, rotX, rotY, rotZ) {
  let { x, y, z } = point;

  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;

  const cosZ = Math.cos(rotZ);
  const sinZ = Math.sin(rotZ);
  const x3 = x1 * cosZ - y2 * sinZ;
  const y3 = x1 * sinZ + y2 * cosZ;

  return { x: x3, y: y3, z: z2 };
}

function projectPoint(point, state, g, cubeIndex = null) {
  const scaled = {
    x: point.x * state.modelScalePx,
    y: point.y * state.modelScalePx,
    z: point.z * state.modelScalePx
  };
  
  // Dual cube: apply separate rotation states
  let rotX = state.rotX;
  let rotY = state.rotY;
  let rotZ = state.rotZ;
  let offsetX = 0;
  let offsetY = 0;
  let offsetZ = 0;
  
  if (cubeIndex !== null && cubeIndex === -1 && state.hasDualCubes) {
    // Outer cube: use its own rotation state (already opposite)
    rotX = state.rotXOuter || 0;
    rotY = state.rotYOuter || 0;
    rotZ = state.rotZOuter || 0;
    
    // Cirque du Soleil: slow orbital offset between cubes
    const orbitRadius = state.modelScalePx * (currentVariantState?.config?.orbitRadius || 0.08);
    const orbitTime = state.orbitTime || 0;
    offsetX = Math.sin(orbitTime) * orbitRadius;
    offsetY = Math.cos(orbitTime * 0.7) * orbitRadius * 0.6;
    offsetZ = Math.sin(orbitTime * 0.9) * orbitRadius * 0.3;
    
    scaled.x += offsetX;
    scaled.y += offsetY;
    scaled.z += offsetZ;
  }
  
  const rotated = rotateXYZ(scaled, rotX, rotY, rotZ);
  
  // Apply levitation offset AFTER rotation (so duck tumbles around its own center)
  const levitationOffset = (state.isDucky && state.levitationHeight) ? state.levitationHeight * state.modelScalePx : 0;
  rotated.y += levitationOffset;
  
  const focal = Math.max(120, state.focalLength);
  const zShift = rotated.z + state.depth;
  const scale = focal / (focal + zShift);

  return {
    x: state.centerX + rotated.x * scale,
    y: state.centerY + rotated.y * scale,
    scale
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUBE GENERATOR - Perfect cube with non-overlapping vertices
// ═══════════════════════════════════════════════════════════════════════════════

function generateCubeMeshPoints(count, config = {}) {
  const innerSize = config.cubeSize || 0.8;
  const outerSize = innerSize * 1.6; // Outer cube is larger
  const points = [];
  const edgeSpacing = 0.015;
  
  // Split points between inner and outer cube
  const innerCount = Math.floor(count * 0.5);
  const outerCount = count - innerCount;
  
  // Helper to generate cube points
  const generateCube = (size, numPoints, offset = { x: 0, y: 0, z: 0 }) => {
    const half = size * 0.5;
    const cubePoints = [];
    const pointsPerEdge = Math.max(4, Math.floor(numPoints / 12));
    
    const lerpExcludingEnds = (a, b, t) => {
      const margin = edgeSpacing / size;
      const tAdjusted = margin + t * (1 - margin * 2);
      return {
        x: a.x + (b.x - a.x) * tAdjusted + offset.x,
        y: a.y + (b.y - a.y) * tAdjusted + offset.y,
        z: a.z + (b.z - a.z) * tAdjusted + offset.z
      };
    };

    const vertices = [
      { x: -half, y: -half, z: -half },
      { x: half, y: -half, z: -half },
      { x: -half, y: half, z: -half },
      { x: half, y: half, z: -half },
      { x: -half, y: -half, z: half },
      { x: half, y: -half, z: half },
      { x: -half, y: half, z: half },
      { x: half, y: half, z: half }
    ];

    const edges = [
      [0, 1], [2, 3], [4, 5], [6, 7],
      [0, 2], [1, 3], [4, 6], [5, 7],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    for (const [vA, vB] of edges) {
      const start = vertices[vA];
      const end = vertices[vB];
      for (let i = 0; i < pointsPerEdge; i++) {
        const t = i / (pointsPerEdge - 1);
        cubePoints.push(lerpExcludingEnds(start, end, t));
      }
    }

    return cubePoints;
  };

  // Inner cube (centered)
  const innerPoints = generateCube(innerSize, innerCount);
  points.push(...innerPoints);

  // Outer cube (centered, larger)
  const outerPoints = generateCube(outerSize, outerCount);
  points.push(...outerPoints);

  // Tag points for dual cube rotation (inner=1, outer=-1 for opposite spin)
  points.forEach((pt, idx) => {
    pt._cubeIndex = idx < innerPoints.length ? 1 : -1;
  });

  return points;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUBBER DUCKY GENERATOR - Whimsical duck shape
// ═══════════════════════════════════════════════════════════════════════════════

function generateDuckyPoints(count, config = {}) {
  const seed = config.seed || 42;
  const rand = seededRandom(seed);
  const points = [];

  // Body (main sphere/ellipsoid) - RIGHT SIDE UP, CENTERED
  const bodyDensity = config.bodyDensity || 0.45;
  const bodyCount = Math.floor(count * bodyDensity);
  for (let i = 0; i < bodyCount; i++) {
    const theta = rand() * TAU;
    const phi = Math.acos(2 * rand() - 1);
    const r = 0.35 + rand() * 0.12;
    
    points.push({
      x: r * Math.sin(phi) * Math.cos(theta) * 1.15, // Wider
      y: -(r * Math.cos(phi) * 0.85 - 0.08), // Flipped Y: positive = up
      z: r * Math.sin(phi) * Math.sin(theta) * 0.88
    });
  }

  // Head (smaller sphere, positioned forward) - RIGHT SIDE UP
  const headDensity = config.headDensity || 0.25;
  const headCount = Math.floor(count * headDensity);
  const headRadius = 0.24;
  const headOffsetX = 0.35;
  const headOffsetY = -0.18; // Flipped: negative Y = up (head above body)
  
  for (let i = 0; i < headCount; i++) {
    const theta = rand() * TAU;
    const phi = Math.acos(2 * rand() - 1);
    
    points.push({
      x: headRadius * Math.sin(phi) * Math.cos(theta) + headOffsetX,
      y: headRadius * Math.cos(phi) + headOffsetY, // Head at top
      z: headRadius * Math.sin(phi) * Math.sin(theta) * 0.95
    });
  }

  // Bill (elongated forward) - RIGHT SIDE UP
  const billCount = Math.floor(count * 0.12);
  for (let i = 0; i < billCount; i++) {
    points.push({
      x: 0.50 + rand() * 0.14, // Forward, more defined
      y: -0.14 + (rand() * 0.10 - 0.05), // Flipped: negative Y = up
      z: (rand() * 0.18 - 0.09)
    });
  }

  // Tail (small bump at back) - RIGHT SIDE UP
  const tailCount = Math.floor(count * 0.06);
  for (let i = 0; i < tailCount; i++) {
    const theta = rand() * TAU;
    const r = rand() * 0.10;
    points.push({
      x: -0.40 + r * Math.cos(theta),
      y: 0.04 + r * Math.sin(theta) * 0.6, // Flipped: positive Y = down (tail at bottom)
      z: (rand() * 0.22 - 0.11)
    });
  }

  // Wings (two side bumps) - RIGHT SIDE UP
  const wingCount = Math.floor(count * 0.12);
  const wingOffsetZ = 0.30;
  for (let i = 0; i < wingCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const theta = rand() * TAU * 0.6;
    const phi = rand() * Math.PI * 0.5;
    const r = 0.14 + rand() * 0.08;
    
    points.push({
      x: (rand() * 0.35 - 0.1) * side,
      y: 0.03 + r * Math.cos(phi), // Flipped: positive Y = down (wings at body level)
      z: side * wingOffsetZ + r * Math.sin(phi) * Math.sin(theta)
    });
  }
  
  // Tag ducky for floating animation
  points.forEach(pt => {
    pt._isDucky = true;
  });

  return points;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALPINE VALLEY SCENE - Ground-level view with configurable uniform mesh
// ═══════════════════════════════════════════════════════════════════════════════

function generateValleyScenePoints(count, config = {}) {
  const points = [];
  
  // Config-driven density multiplier
  const density = Math.max(0.5, Math.min(2.0, (config.pointCount || 1500) / 1500));
  const scale = config.modelScale || 2.0;
  
  // Scene bounds
  const farZ = -1.6;
  const nearZ = 0.8;
  const width = 1.4 * scale;
  
  const addPoint = (x, y, z, type = 'terrain') => {
    points.push({ x, y, z, _valleyType: type });
  };

  // River S-curve
  const getRiverPath = (t) => Math.sin(t * Math.PI * 1.6) * 0.35;

  // ─────────────────────────────────────────────────────────────────────────────
  // SKY - Uniform grid
  // ─────────────────────────────────────────────────────────────────────────────
  const skyR = Math.round(5 * density);
  const skyC = Math.round(20 * density);
  for (let r = 0; r < skyR; r++) {
    for (let c = 0; c < skyC; c++) {
      addPoint(
        (c / (skyC - 1) - 0.5) * width * 1.1,
        -0.2 - (r / (skyR - 1)) * 0.35,
        farZ - 0.15
      , 'sky');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MOUNTAIN - Uniform triangular rows
  // ─────────────────────────────────────────────────────────────────────────────
  const mtR = Math.round(12 * density);
  for (let r = 0; r < mtR; r++) {
    const t = r / (mtR - 1);
    const rowW = 0.8 * (1 - t * 0.88);
    const cols = Math.max(1, Math.round(18 * density * (1 - t * 0.85)));
    for (let c = 0; c < cols; c++) {
      addPoint(
        (cols > 1 ? c / (cols - 1) - 0.5 : 0) * rowW,
        -t * 0.5,
        farZ
      , 'mountain');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GROUND - Uniform perspective grid
  // ─────────────────────────────────────────────────────────────────────────────
  const gndR = Math.round(14 * density);
  const gndC = Math.round(22 * density);
  for (let r = 0; r < gndR; r++) {
    const t = r / (gndR - 1);
    const z = farZ + 0.25 + t * (nearZ - farZ - 0.4);
    const rowW = (0.6 + t * 1.0) * width / 2;
    for (let c = 0; c < gndC; c++) {
      addPoint(
        (c / (gndC - 1) - 0.5) * rowW * 2,
        0.02 + t * 0.26,
        z
      , 'ground');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RIVER - Uniform grid following curve
  // ─────────────────────────────────────────────────────────────────────────────
  const rivC = Math.round(40 * density);
  const rivR = Math.round(5 * density);
  const rivW = 0.1;
  for (let c = 0; c < rivC; c++) {
    const t = c / (rivC - 1);
    const cx = (t - 0.5) * width * 0.85;
    const cz = 0.12 + getRiverPath(t);
    for (let r = 0; r < rivR; r++) {
      addPoint(cx, 0.28, cz + (r / (rivR - 1) - 0.5) * rivW, 'river');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FLOW BALLS - Evenly spaced along river
  // ─────────────────────────────────────────────────────────────────────────────
  const flowN = Math.round(12 * density);
  for (let i = 0; i < flowN; i++) {
    const phase = i / flowN;
    points.push({
      x: (phase - 0.5) * width * 0.85,
      y: 0.27,
      z: 0.12 + getRiverPath(phase),
      _valleyType: 'flowBall',
      _flowPhase: phase,
      _width: width
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TREES - Uniform vertical columns
  // ─────────────────────────────────────────────────────────────────────────────
  const treeN = Math.round(5 * density);
  const treePts = Math.round(10 * density);
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < treeN; i++) {
      const t = i / (treeN - 1);
      const z = farZ + 0.35 + t * 0.9;
      const x = side * (0.5 + t * 0.3);
      const baseY = 0.02 + t * 0.16;
      for (let p = 0; p < treePts; p++) {
        addPoint(x, baseY - (p / (treePts - 1)) * 0.22, z, 'tree');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FOREGROUND - Uniform grid
  // ─────────────────────────────────────────────────────────────────────────────
  const fgR = Math.round(5 * density);
  const fgC = Math.round(20 * density);
  for (let r = 0; r < fgR; r++) {
    for (let c = 0; c < fgC; c++) {
      addPoint(
        (c / (fgC - 1) - 0.5) * width * 1.2,
        0.36 + (r / (fgR - 1)) * 0.16,
        nearZ - (r / (fgR - 1)) * 0.2
      , 'grass');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUN - Uniform concentric rings
  // ─────────────────────────────────────────────────────────────────────────────
  const sunX = -0.6, sunY = -0.38;
  addPoint(sunX, sunY, farZ - 0.1, 'sun');
  for (let ring = 1; ring <= 3; ring++) {
    const pts = ring * 6;
    const rad = ring * 0.03;
    for (let p = 0; p < pts; p++) {
      const a = (p / pts) * TAU;
      addPoint(sunX + rad * Math.cos(a), sunY + rad * Math.sin(a), farZ - 0.1, 'sun');
    }
  }

  return points;
}

function buildPointCloud(variant) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();

  // Store current variant for config updates
  currentVariantState = variant;

  const points = variant.pointSource(variant.config.pointCount, variant.config);
  const radiusScale = variant.config.baseRadiusScale || BASE_RADIUS_SCALE;
  const baseRadius = clampRadiusToGlobalBounds(g, (g.R_MED || 18) * radiusScale * (g.DPR || 1));
  const modelScaleFactor = variant.config.modelScale;
  // For room scenes, use larger scale to fill viewport
  const baseScale = variant.config.cameraPanSpeed ? 0.45 : 0.32;
  const modelScalePx = Math.min(canvas.width, canvas.height) * baseScale * modelScaleFactor;
  // Check if this is dual cube (has cubeIndex property)
  const hasDualCubes = points.some(p => p._cubeIndex !== undefined);
  
  // Check if this is ducky (needs floating animation)
  const isDucky = points.some(p => p._isDucky);
  
  g.splatTestState = {
    centerX: canvas.width * 0.5,
    centerY: canvas.height * (0.5 + (variant.config.centerOffsetY || 0)), // Centered vertically with offset
    // For room scenes, bring camera closer (reduced depth)
    depth: variant.config.cameraPanSpeed ? Math.max(0.6, modelScaleFactor) * 120 : Math.max(0.6, modelScaleFactor) * 220,
    modelScaleFactor,
    modelScalePx,
    baseRadius,
    lastCanvasWidth: canvas.width,
    lastCanvasHeight: canvas.height,
    // Dual cube: separate rotation states
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    rotXOuter: 0,
    rotYOuter: 0,
    rotZOuter: 0,
    tumbleX: 0,
    tumbleY: 0,
    tumbleXOuter: 0, // Outer cube tumble (opposite)
    tumbleYOuter: 0,
    prevMouseX: null,
    prevMouseY: null,
    focalLength: variant.config.focalLength,
    idleSpeed: variant.config.idleSpeed,
    tumbleSpeed: variant.config.tumbleSpeed || 0,
    tumbleDamping: variant.config.tumbleDamping || 1.0,
    tumbleDampingOuter: variant.config.tumbleDamping ? variant.config.tumbleDamping * 0.992 : 0.987 * 0.992, // Heavier but high inertia (very close to inner for harmony)
    cameraPanSpeed: variant.config.cameraPanSpeed || 0,
    cameraPanX: 0,
    cameraPanY: 0,
    orbitTime: 0, // For Cirque du Soleil motion
    hasDualCubes, // Flag to enable dual cube logic
    floatTime: 0, // For ducky floating animation
    floatAmplitude: variant.config.floatAmplitude || 18, // Vertical float distance in pixels
    floatSpeed: variant.config.floatSpeed || 0.8, // Oscillation frequency
    levitationHeight: variant.config.levitationHeight || -0.15, // Base vertical offset (negative = up)
    isDucky, // Flag for ducky floating
    points
  };

  for (let i = 0; i < points.length; i++) {
    const ball = spawnBall(0, 0);
    if (!ball) continue;
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    ball.r = baseRadius;
    ball._splatPoint = points[i];
    ball._splatBaseR = baseRadius;
    // Store cube index for dual cube rotation (1 = inner, -1 = outer)
    if (points[i]._cubeIndex !== undefined) {
      ball._cubeIndex = points[i]._cubeIndex;
    }
    ball.isSleeping = false;
  }

  g.currentMode = MODES.SPHERE_3D;
}

function updateSplatScale(state, g, canvas) {
  const baseScale = state.cameraPanSpeed ? 0.45 : 0.32;
  const nextModelScalePx = Math.min(canvas.width, canvas.height) * baseScale * state.modelScaleFactor;
  const radiusScale = currentVariantState?.config?.baseRadiusScale || BASE_RADIUS_SCALE;
  const nextBaseRadius = clampRadiusToGlobalBounds(g, (g.R_MED || 18) * radiusScale * (g.DPR || 1));
  const scaleChanged = Math.abs(nextModelScalePx - state.modelScalePx) > 0.001;
  const radiusChanged = Math.abs(nextBaseRadius - state.baseRadius) > 0.001;
  if (!scaleChanged && !radiusChanged) return;

  state.modelScalePx = nextModelScalePx;
  state.baseRadius = nextBaseRadius;

  const balls = g.balls;
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    if (!ball || !ball._splatPoint) continue;
    ball._splatBaseR = nextBaseRadius;
  }
}

function projectPointWithPan(point, state, g) {
  // For environment scenes: pan camera instead of rotating model
  const scaled = {
    x: point.x * state.modelScalePx,
    y: point.y * state.modelScalePx,
    z: point.z * state.modelScalePx
  };
  
  // Apply camera pan offset (inverse of mouse movement - as if moving head)
  const panX = state.cameraPanX || 0;
  const panY = state.cameraPanY || 0;
  
  const translated = {
    x: scaled.x - panX,
    y: scaled.y - panY,
    z: scaled.z
  };
  
  const focal = Math.max(120, state.focalLength);
  const zShift = translated.z + state.depth;
  const scale = focal / (focal + zShift);

  return {
    x: state.centerX + translated.x * scale,
    y: state.centerY + translated.y * scale,
    scale
  };
}

function updateSplatState(dt) {
  const g = getGlobals();
  const state = g.splatTestState;
  const canvas = g.canvas;
  if (!state || !canvas) return;

  if (canvas.width !== state.lastCanvasWidth || canvas.height !== state.lastCanvasHeight) {
    state.lastCanvasWidth = canvas.width;
    state.lastCanvasHeight = canvas.height;
    updateSplatScale(state, g, canvas);
  }

  state.centerX = canvas.width * 0.5;
  state.centerY = canvas.height * 0.52;

  // Check if this is an environment scene (has cameraPanSpeed config)
  const isEnvironment = state.cameraPanSpeed !== undefined && state.cameraPanSpeed > 0;

  if (isEnvironment) {
    // Environment mode: pan camera based on mouse position (like moving head)
    if (g.mouseInCanvas) {
      const panRange = state.cameraPanSpeed * 200; // Maximum pan distance
      const normalizedX = (g.mouseX - state.centerX) / (canvas.width * 0.5);
      const normalizedY = (g.mouseY - state.centerY) / (canvas.height * 0.5);
      
      state.cameraPanX = normalizedX * panRange;
      state.cameraPanY = normalizedY * panRange;
    } else {
      // Smoothly return to center when mouse leaves
      state.cameraPanX = (state.cameraPanX || 0) * 0.95;
      state.cameraPanY = (state.cameraPanY || 0) * 0.95;
    }

    // Minimal rotation for environment (just subtle idle)
    state.rotY += state.idleSpeed * dt * 0.1;
    state.rotX = 0;
    state.rotZ = 0;
  } else {
    // Object mode: rotate based on mouse dragging
    if (g.mouseInCanvas) {
      const prevX = state.prevMouseX ?? g.mouseX;
      const prevY = state.prevMouseY ?? g.mouseY;
      const dx = g.mouseX - prevX;
      const dy = g.mouseY - prevY;

      state.prevMouseX = g.mouseX;
      state.prevMouseY = g.mouseY;

      const spinGain = state.tumbleSpeed * 0.0028; // Increased for more movement
      
      if (state.hasDualCubes) {
        // Dual cube: inverted directions (both inverted from original)
        state.tumbleY += -dx * spinGain; // Inverted
        state.tumbleX += dy * spinGain; // Inverted
        // Outer cube: opposite of inner (normal direction)
        state.tumbleYOuter += dx * spinGain * 0.85; // Normal direction
        state.tumbleXOuter += -dy * spinGain * 0.85; // Normal direction
      } else {
        state.tumbleY += dx * spinGain;
        state.tumbleX += -dy * spinGain;
      }
    } else {
      state.prevMouseX = null;
      state.prevMouseY = null;
    }

    if (state.hasDualCubes) {
      // Inner cube: high inertia (slow to stop, smooth motion)
      state.tumbleX *= state.tumbleDamping;
      state.tumbleY *= state.tumbleDamping;
      state.rotY += (state.idleSpeed + state.tumbleY) * dt;
      state.rotX += (state.idleSpeed * 0.7 + state.tumbleX) * dt;
      state.rotZ += state.idleSpeed * 0.2 * dt;
      
      // Outer cube: high inertia, slightly heavier for visual harmony
      const outerDamping = state.tumbleDampingOuter || (state.tumbleDamping * 0.992);
      state.tumbleXOuter *= outerDamping;
      state.tumbleYOuter *= outerDamping;
      state.rotYOuter += (state.idleSpeed + state.tumbleYOuter) * dt;
      state.rotXOuter += (state.idleSpeed * 0.7 + state.tumbleXOuter) * dt;
      state.rotZOuter += state.idleSpeed * 0.2 * dt;
    } else {
      // Single object: normal behavior
      state.tumbleX *= state.tumbleDamping;
      state.tumbleY *= state.tumbleDamping;
      state.rotY += (state.idleSpeed + state.tumbleY) * dt;
      state.rotX += (state.idleSpeed * 0.7 + state.tumbleX) * dt;
      state.rotZ += state.idleSpeed * 0.2 * dt;
    }
  }

  // Update orbit time for dual cube motion (Cirque du Soleil)
  if (state.orbitTime !== undefined) {
    const orbitSpeed = currentVariantState?.config?.orbitSpeed || 0.5;
    state.orbitTime += dt * orbitSpeed;
  }
  
  // Update float time for ducky (gentle vertical oscillation)
  if (state.isDucky && state.floatTime !== undefined) {
    state.floatTime += dt * state.floatSpeed;
  }

  // Update river flow time for alpine valley scene
  if (state.riverFlowTime === undefined && currentVariantState?.config?.riverFlowSpeed) {
    state.riverFlowTime = 0;
  }
  if (state.riverFlowTime !== undefined) {
    const flowSpeed = currentVariantState?.config?.riverFlowSpeed || 0.4;
    state.riverFlowTime += dt * flowSpeed;
  }

  const balls = g.balls;
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const point = ball._splatPoint;
    if (!point) continue;

    const cubeIndex = ball._cubeIndex !== undefined ? ball._cubeIndex : null;
    
    // Handle flowing river balls in alpine valley scene
    if (point._valleyType === 'flowBall' && state.riverFlowTime !== undefined) {
      const flowSpeed = currentVariantState?.config?.riverFlowSpeed || 0.4;
      const flowProgress = (state.riverFlowTime * flowSpeed * 0.08 + point._flowPhase) % 1.0;
      const width = point._width || 2.8;
      
      // X position: flows left to right
      const riverX = (flowProgress - 0.5) * width * 0.85;
      
      // Z follows S-curve (matching mesh river)
      const riverZ = 0.12 + Math.sin(flowProgress * Math.PI * 1.6) * 0.35;
      
      const flowPoint = { x: riverX, y: 0.27, z: riverZ };
      
      const projected = projectPointWithPan(flowPoint, state, g);
      ball.x = projected.x;
      ball.y = projected.y;
      ball.r = clampRadiusToGlobalBounds(g, ball._splatBaseR * projected.scale * 1.5);
      ball.vx = 0;
      ball.vy = 0;
      ball.omega = 0;
      ball.isSleeping = false;
      continue;
    }
    
    let projected = isEnvironment 
      ? projectPointWithPan(point, state, g)
      : projectPoint(point, state, g, cubeIndex);
    
    // Apply floating animation for ducky (gentle vertical oscillation)
    if (state.isDucky && point._isDucky) {
      const floatOffset = Math.sin(state.floatTime) * state.floatAmplitude;
      projected = {
        ...projected,
        y: projected.y + floatOffset
      };
    }
      
    ball.x = projected.x;
    ball.y = projected.y;
    ball.r = clampRadiusToGlobalBounds(g, ball._splatBaseR * projected.scale);
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    ball.isSleeping = false;
  }
}

function handleConfigUpdate(variant, newConfig) {
  // Update variant config
  variant.config = { ...variant.config, ...newConfig };
  
  // For state-only updates (no point cloud rebuild needed), just update state
  const g = getGlobals();
  const state = g.splatTestState;
  if (state) {
    // Update runtime state for parameters that don't require rebuild
    if (newConfig.floatAmplitude !== undefined) state.floatAmplitude = newConfig.floatAmplitude;
    if (newConfig.floatSpeed !== undefined) state.floatSpeed = newConfig.floatSpeed;
    if (newConfig.levitationHeight !== undefined) state.levitationHeight = newConfig.levitationHeight;
    if (newConfig.orbitRadius !== undefined) { /* applied in projectPoint */ }
    if (newConfig.orbitSpeed !== undefined) { /* applied in update loop */ }
    if (newConfig.centerOffsetY !== undefined) state.centerY = g.canvas.height * (0.5 + newConfig.centerOffsetY);
    if (newConfig.focalLength !== undefined) state.focalLength = newConfig.focalLength;
    if (newConfig.idleSpeed !== undefined) state.idleSpeed = newConfig.idleSpeed;
    if (newConfig.tumbleSpeed !== undefined) state.tumbleSpeed = newConfig.tumbleSpeed;
    if (newConfig.tumbleDamping !== undefined) {
      state.tumbleDamping = newConfig.tumbleDamping;
      state.tumbleDampingOuter = newConfig.tumbleDamping * 0.992;
    }
    if (newConfig.cameraPanSpeed !== undefined) state.cameraPanSpeed = newConfig.cameraPanSpeed;
    if (newConfig.baseRadiusScale !== undefined) {
      state.baseRadius = clampRadiusToGlobalBounds(g, (g.R_MED || 18) * newConfig.baseRadiusScale * (g.DPR || 1));
      // Update all balls' base radius
      g.balls.forEach(ball => {
        if (ball._splatBaseR !== undefined) {
          ball._splatBaseR = state.baseRadius;
        }
      });
    }
  }
  
  // Rebuild point cloud with new config (handles point count, model scale, etc.)
  buildPointCloud(variant);
  
  // Update panel to reflect current state
  updatePanelVariant(variant, variant.config);
}

function setupVariantCycle(variants) {
  const canvas = getCanvas();
  if (!canvas || variants.length === 0) return;

  let index = 0;
  const currentVariant = variants[index];
  buildPointCloud(currentVariant);
  updateVariantLabel(currentVariant);

  // Initialize config panel
  createSplatConfigPanel(currentVariant, currentVariant.config, handleConfigUpdate);

  const cycle = () => {
    index = (index + 1) % variants.length;
    const variant = variants[index];
    buildPointCloud(variant);
    updateVariantLabel(variant);
    updatePanelVariant(variant, variant.config);
  };

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    const inBounds = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    if (!inBounds) return;
    cycle();
  });

  // Keyboard shortcut to toggle panel (/)
  // Only bind once
  if (!window._splatPanelKeyBound) {
    window._splatPanelKeyBound = true;
    document.addEventListener('keydown', (e) => {
      // Only trigger if not typing in an input/textarea
      const isInputFocused = document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      );
      
      if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !isInputFocused) {
        e.preventDefault();
        togglePanel();
      }
    });
  }
}

function startSplatLoop() {
  let last = performance.now();

  const frame = (now) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    updateSplatState(dt);
    render();
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

async function initSplatTest() {
  const config = await loadRuntimeConfig();
  initState({
    ...config,
    ...BASE_CONFIG_OVERRIDES
  });

  applyLayoutCSSVars();

  setupRenderer();
  const canvas = getCanvas();
  const ctx = getContext();
  const container = document.getElementById('bravia-balls');

  if (!canvas || !ctx || !container) {
    console.error('Splat test: missing canvas/container');
    return;
  }

  setCanvas(canvas, ctx, container);
  resize();

  const globals = getGlobals();
  globals.clickCycleEnabled = false;
  globals.mouseInCanvas = false;

  setupPointer();
  applyColorTemplate('industrialTeal');

  setupVariantCycle(VARIANTS);
  startSplatLoop();
}

initSplatTest();
