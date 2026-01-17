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
    label: 'Variant A · Spatial Room',
    pointSource: generateEnvironmentPoints,
    config: {
      pointCount: 1400,
      modelScale: 1.15,
      focalLength: 980,
      idleSpeed: 0.03,
      tumbleSpeed: 2.2,
      tumbleDamping: 0.95
    }
  },
  {
    id: 'splat-variant-b',
    label: 'Variant B · Face Bust',
    pointSource: generateBustPoints,
    config: {
      pointCount: 1100,
      modelScale: 1.0,
      focalLength: 900,
      idleSpeed: 0.02,
      tumbleSpeed: 2.0,
      tumbleDamping: 0.95
    }
  },
  {
    id: 'splat-variant-c',
    label: 'Variant C · Animal Scan',
    pointSource: generateAnimalPoints,
    config: {
      pointCount: 1200,
      modelScale: 1.05,
      focalLength: 940,
      idleSpeed: 0.02,
      tumbleSpeed: 1.9,
      tumbleDamping: 0.94
    }
  }
];

const TAU = Math.PI * 2;
const BASE_RADIUS_SCALE = 0.22;

function updateVariantLabel(variant) {
  const label = document.getElementById('splat-variant-label');
  if (!label) return;
  label.textContent = variant?.label || '';
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

function projectPoint(point, state, g) {
  const scaled = {
    x: point.x * state.modelScalePx,
    y: point.y * state.modelScalePx,
    z: point.z * state.modelScalePx
  };
  const rotated = rotateXYZ(scaled, state.rotX, state.rotY, state.rotZ);
  const focal = Math.max(120, state.focalLength);
  const zShift = rotated.z + state.depth;
  const scale = focal / (focal + zShift);

  return {
    x: state.centerX + rotated.x * scale,
    y: state.centerY + rotated.y * scale,
    scale
  };
}

function generateEnvironmentPoints(count, seed = 7) {
  const rand = seededRandom(seed);
  const points = [];
  const walls = [
    { axis: 'x', value: -1 },
    { axis: 'x', value: 1 },
    { axis: 'y', value: -0.7 },
    { axis: 'y', value: 0.7 },
    { axis: 'z', value: -1 },
    { axis: 'z', value: 1 }
  ];

  for (let i = 0; i < count; i++) {
    const wall = walls[i % walls.length];
    const u = rand() * 2 - 1;
    const v = rand() * 2 - 1;
    const point = { x: 0, y: 0, z: 0 };

    if (wall.axis === 'x') {
      point.x = wall.value;
      point.y = u * 0.8;
      point.z = v * 0.8;
    } else if (wall.axis === 'y') {
      point.y = wall.value;
      point.x = u * 0.9;
      point.z = v * 0.9;
    } else {
      point.z = wall.value;
      point.x = u * 0.9;
      point.y = v * 0.7;
    }

    const pillarOffset = (i % 4) - 1.5;
    if (i % 9 === 0) {
      point.x = pillarOffset * 0.35;
      point.z = (rand() * 0.4) - 0.2;
      point.y = (rand() * 1.4) - 0.7;
    }

    points.push(point);
  }

  return points;
}

function generateBustPoints(count, seed = 11) {
  const rand = seededRandom(seed);
  const points = [];

  for (let i = 0; i < count; i++) {
    const r1 = rand();
    const r2 = rand();
    const r3 = rand();

    const theta = r1 * TAU;
    const phi = Math.acos(2 * r2 - 1);

    const headRadius = 0.55;
    const head = {
      x: headRadius * Math.sin(phi) * Math.cos(theta),
      y: headRadius * Math.cos(phi) + 0.35,
      z: headRadius * Math.sin(phi) * Math.sin(theta)
    };

    const neck = {
      x: (rand() * 0.3 - 0.15),
      y: -0.2 - rand() * 0.45,
      z: (rand() * 0.3 - 0.15)
    };

    const shoulders = {
      x: (rand() * 1.1 - 0.55),
      y: -0.7 - rand() * 0.2,
      z: (rand() * 0.6 - 0.3)
    };

    if (r3 < 0.6) {
      points.push(head);
    } else if (r3 < 0.85) {
      points.push(neck);
    } else {
      points.push(shoulders);
    }
  }

  return points;
}

function generateAnimalPoints(count, seed = 23) {
  const rand = seededRandom(seed);
  const points = [];

  for (let i = 0; i < count; i++) {
    const choice = rand();
    if (choice < 0.6) {
      points.push({
        x: (rand() * 1.2 - 0.6),
        y: (rand() * 0.5 - 0.1),
        z: (rand() * 0.5 - 0.25)
      });
    } else if (choice < 0.8) {
      points.push({
        x: 0.7 + (rand() * 0.25),
        y: 0.1 + (rand() * 0.2),
        z: (rand() * 0.25 - 0.125)
      });
    } else {
      points.push({
        x: (rand() * 1.0 - 0.5),
        y: -0.7 - rand() * 0.4,
        z: (rand() * 0.4 - 0.2)
      });
    }
  }

  return points;
}

function buildPointCloud(variant) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();

  const points = variant.pointSource(variant.config.pointCount);
  const baseRadius = clampRadiusToGlobalBounds(g, (g.R_MED || 18) * BASE_RADIUS_SCALE * (g.DPR || 1));
  const modelScaleFactor = variant.config.modelScale;
  const modelScalePx = Math.min(canvas.width, canvas.height) * 0.32 * modelScaleFactor;
  g.splatTestState = {
    centerX: canvas.width * 0.5,
    centerY: canvas.height * 0.52,
    depth: Math.max(0.6, modelScaleFactor) * 220,
    modelScaleFactor,
    modelScalePx,
    baseRadius,
    lastCanvasWidth: canvas.width,
    lastCanvasHeight: canvas.height,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    tumbleX: 0,
    tumbleY: 0,
    prevMouseX: null,
    prevMouseY: null,
    focalLength: variant.config.focalLength,
    idleSpeed: variant.config.idleSpeed,
    tumbleSpeed: variant.config.tumbleSpeed,
    tumbleDamping: variant.config.tumbleDamping,
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
    ball.isSleeping = false;
  }

  g.currentMode = MODES.SPHERE_3D;
}

function updateSplatScale(state, g, canvas) {
  const nextModelScalePx = Math.min(canvas.width, canvas.height) * 0.32 * state.modelScaleFactor;
  const nextBaseRadius = clampRadiusToGlobalBounds(g, (g.R_MED || 18) * BASE_RADIUS_SCALE * (g.DPR || 1));
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

  if (g.mouseInCanvas) {
    const prevX = state.prevMouseX ?? g.mouseX;
    const prevY = state.prevMouseY ?? g.mouseY;
    const dx = g.mouseX - prevX;
    const dy = g.mouseY - prevY;

    state.prevMouseX = g.mouseX;
    state.prevMouseY = g.mouseY;

    const spinGain = state.tumbleSpeed * 0.0016;
    state.tumbleY += dx * spinGain;
    state.tumbleX += -dy * spinGain;
  } else {
    state.prevMouseX = null;
    state.prevMouseY = null;
  }

  state.tumbleX *= state.tumbleDamping;
  state.tumbleY *= state.tumbleDamping;

  state.rotY += (state.idleSpeed + state.tumbleY) * dt;
  state.rotX += (state.idleSpeed * 0.7 + state.tumbleX) * dt;
  state.rotZ += state.idleSpeed * 0.2 * dt;

  const balls = g.balls;
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const point = ball._splatPoint;
    if (!point) continue;

    const projected = projectPoint(point, state, g);
    ball.x = projected.x;
    ball.y = projected.y;
    ball.r = clampRadiusToGlobalBounds(g, ball._splatBaseR * projected.scale);
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    ball.isSleeping = false;
  }
}

function setupVariantCycle(variants) {
  const canvas = getCanvas();
  if (!canvas || variants.length === 0) return;

  let index = 0;
  buildPointCloud(variants[index]);
  updateVariantLabel(variants[index]);

  const cycle = () => {
    index = (index + 1) % variants.length;
    buildPointCloud(variants[index]);
    updateVariantLabel(variants[index]);
  };

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    const inBounds = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    if (!inBounds) return;
    cycle();
  });
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
