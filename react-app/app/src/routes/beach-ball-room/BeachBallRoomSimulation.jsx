import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { getLondonWeatherPaletteTheme } from '../../palette/londonPalettes.js';
import { getGlobals } from '../../legacy/modules/core/state.js';
import {
  getCurrentPalette,
  getPaletteTemplateOverrideFromUrl,
  getWeatherDrivenPaletteTemplate,
  resolveColorTemplateName,
} from '../../legacy/modules/visual/colors.js';
import { BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY } from './beachBallRoomRegistry.js';
import './beach-ball-room.css';

const TAU = Math.PI * 2;
const STORAGE_KEY = 'abs_beach_ball_room_controls_v3';
const FIXED_DT = 1 / 60;
const MAX_SUBSTEPS = 3;
const WALL_CONTACT_SLOP_RATIO = 0.004;
const WALL_SPIN_LOSS_SCALE = 0.38;
const FRONT_WALL_SPIN_LOSS_SCALE = 0.72;
const FRONT_WALL_MIN_REBOUND_RADIUS_SCALE = 0.34;
const IDLE_SETTLE_DELAY_SECONDS = 2.5;
const IDLE_SETTLE_FULL_SECONDS = 8;
const IDLE_SETTLE_LINEAR_DAMPING = 1.35;
const IDLE_SETTLE_ANGULAR_DAMPING = 0.95;
const IDLE_COLLISION_ABSORB_SPEED = 0.42;
const IDLE_REST_LINEAR_SPEED = 0.08;
const IDLE_REST_ANGULAR_SPEED = 0.08;
const IDLE_REST_HOLD_SECONDS = 0.8;
const MOTION_DEBUG_INTERVAL_FRAMES = 12;
const FALLBACK_APPROVED_COLOR_INDICES = Object.freeze([0, 1, 2, 3, 6, 5, 7]);
const FALLBACK_PALETTE_COLORS = Object.freeze(['#a7afb0', '#c6cecf', '#f5f8f6', '#00a5a0', '#031210', '#d7ff2f', '#2c96ff', '#ff7e4a']);

const DEFAULT_SETTINGS = Object.freeze({
  showRoomLines: true,
  roomLineOpacity: 0.22,
  roomLineThickness: 0.006,
  roomInset: 0.33,
  roomDepth: 3.7,
  foregroundLimit: 1.85,
  ballDiameterViewportRatio: 0.56,
  colourStripCount: 5,
  colourStripColumns: 4,
  whiteStripColumns: 4,
  stripPhase: 298,
  topCapAngleDeg: 27,
  bottomCapAngleDeg: 12,
  latitudeRows: 24,
  beadRadiusScale: 0.78,
  beadSurfaceOffset: 0.08,
  mobileDensityScale: 0.92,
  gravity: 8.8,
  restitution: 0.56,
  bounceBoost: 2.38,
  backWallBounceBoost: 1.56,
  bounceMinVelocity: 0.42,
  linearDamping: 0.24,
  angularDamping: 0.26,
  wallFriction: 0.58,
  collisionSpinBoost: 0.34,
  maxLinearSpeed: 9.5,
  maxAngularSpeed: 1.45,
  pointerInfluenceRadius: 1.95,
  tapPushStrength: 18.9,
  dragFlickStrength: 48,
  dragDepthPush: 2.25,
  pointerSpinStrength: 0.42,
});

const CONTROL_GROUPS = [
  {
    title: 'Room',
    controls: [
      { key: 'showRoomLines', label: 'Room lines', type: 'checkbox' },
      { key: 'ballDiameterViewportRatio', label: 'Ball size', min: 0.15, max: 0.9, step: 0.01 },
      { key: 'roomLineOpacity', label: 'Line opacity', min: 0, max: 1, step: 0.01 },
      { key: 'roomLineThickness', label: 'Line thickness', min: 0, max: 0.25, step: 0.005 },
      { key: 'roomInset', label: 'Room inset', min: 0, max: 0.75, step: 0.01 },
      { key: 'roomDepth', label: 'Room depth', min: 1, max: 12, step: 0.1 },
      { key: 'foregroundLimit', label: 'Foreground limit', min: 0.3, max: 3, step: 0.05 },
    ],
  },
  {
    title: 'Strips',
    controls: [
      { key: 'colourStripCount', label: 'Colour strips', min: 1, max: 24, step: 1, integer: true },
      { key: 'colourStripColumns', label: 'Colour columns', min: 1, max: 24, step: 1, integer: true },
      { key: 'whiteStripColumns', label: 'White columns', min: 1, max: 24, step: 1, integer: true },
      { key: 'stripPhase', label: 'Strip phase deg', min: 0, max: 360, step: 1, integer: true },
      { key: 'topCapAngleDeg', label: 'Top cap deg', min: 0, max: 90, step: 1, integer: true },
      { key: 'bottomCapAngleDeg', label: 'Bottom cap deg', min: 0, max: 90, step: 1, integer: true },
    ],
  },
  {
    title: 'Dots',
    controls: [
      { key: 'latitudeRows', label: 'Latitude rows', min: 1, max: 80, step: 1, integer: true },
      { key: 'beadRadiusScale', label: 'Bead size', min: 0, max: 6, step: 0.05 },
      { key: 'beadSurfaceOffset', label: 'Surface offset', min: 0, max: 2, step: 0.01 },
      { key: 'mobileDensityScale', label: 'Mobile density', min: 0, max: 4, step: 0.05 },
    ],
  },
  {
    title: 'Physics',
    controls: [
      { key: 'gravity', label: 'Gravity', min: 0, max: 40, step: 0.1 },
      { key: 'restitution', label: 'Restitution', min: 0, max: 2, step: 0.01 },
      { key: 'bounceBoost', label: 'Bounce boost', min: 1, max: 5, step: 0.01 },
      { key: 'backWallBounceBoost', label: 'Back wall bounce', min: 1, max: 5, step: 0.05 },
      { key: 'bounceMinVelocity', label: 'Min rebound', min: 0, max: 10, step: 0.1 },
      { key: 'linearDamping', label: 'Linear damping', min: 0, max: 5, step: 0.01 },
      { key: 'angularDamping', label: 'Angular damping', min: 0, max: 5, step: 0.01 },
      { key: 'wallFriction', label: 'Wall friction', min: 0, max: 1, step: 0.01 },
      { key: 'collisionSpinBoost', label: 'Wall spin', min: 0, max: 8, step: 0.05 },
      { key: 'maxLinearSpeed', label: 'Speed cap', min: 1, max: 60, step: 0.5 },
      { key: 'maxAngularSpeed', label: 'Spin cap', min: 1, max: 60, step: 0.5 },
    ],
  },
  {
    title: 'Mouse',
    controls: [
      { key: 'pointerInfluenceRadius', label: 'Influence radius', min: 1, max: 5, step: 0.05 },
      { key: 'tapPushStrength', label: 'Tap push', min: 0, max: 20, step: 0.1 },
      { key: 'dragFlickStrength', label: 'Drag flick', min: 0, max: 80, step: 0.5 },
      { key: 'dragDepthPush', label: 'Depth push', min: 0, max: 5, step: 0.05 },
      { key: 'pointerSpinStrength', label: 'Spin transfer', min: 0, max: 10, step: 0.05 },
    ],
  },
];

const ROOM_SETTING_KEYS = new Set([
  'showRoomLines',
  'roomLineOpacity',
  'roomLineThickness',
  'roomInset',
  'roomDepth',
  'foregroundLimit',
]);

const BEAD_REBUILD_SETTING_KEYS = new Set([
  'ballDiameterViewportRatio',
  'colourStripCount',
  'colourStripColumns',
  'whiteStripColumns',
  'stripPhase',
  'topCapAngleDeg',
  'bottomCapAngleDeg',
  'latitudeRows',
  'beadRadiusScale',
  'beadSurfaceOffset',
  'mobileDensityScale',
]);

function getChangedSettingKeys(previousSettings, nextSettings) {
  if (!previousSettings) return Object.keys(DEFAULT_SETTINGS);
  return Object.keys(DEFAULT_SETTINGS).filter((key) => previousSettings[key] !== nextSettings[key]);
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function clampInt(value, min, max) {
  return Math.round(clamp(value, min, max));
}

function positiveModulo(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}

function sanitizeSettings(input) {
  const next = { ...DEFAULT_SETTINGS };
  if (!input || typeof input !== 'object') return next;

  for (const group of CONTROL_GROUPS) {
    for (const control of group.controls) {
      if (!Object.prototype.hasOwnProperty.call(input, control.key)) continue;
      let value = input[control.key];
      if (control.key === 'gravity' && Number(value) < 0) {
        value = Math.abs(Number(value));
      } else if (control.key === 'stripPhase' && Number(value) < 0) {
        value = ((THREE.MathUtils.radToDeg(Number(value)) % 360) + 360) % 360;
      }

      if (control.type === 'checkbox') {
        next[control.key] = Boolean(value);
      } else if (control.integer) {
        next[control.key] = clampInt(value, control.min, control.max);
      } else {
        next[control.key] = clamp(value, control.min, control.max);
      }
    }
  }

  return next;
}

function readInitialSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function shouldShowControls() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('controls') === '1';
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(media.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  return reducedMotion;
}

function normalizeHexColor(hex, fallback) {
  const raw = String(hex || '').trim().replace(/^#/, '');
  const full = raw.length === 3
    ? raw.split('').map((char) => char + char).join('')
    : raw;
  return /^[\da-f]{6}$/i.test(full) ? `#${full.toLowerCase()}` : fallback;
}

function hexToRgb01(hex) {
  const normalized = normalizeHexColor(hex, null);
  if (!normalized) return null;
  const value = Number.parseInt(normalized.slice(1), 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

function rgbToHsv({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta > 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function classifyPaletteColor(hex) {
  const rgb = hexToRgb01(hex);
  if (!rgb) return 'other';
  const hsv = rgbToHsv(rgb);

  if (hsv.v < 0.08) return 'black';
  if (hsv.s < 0.16) return 'grey';
  if (hsv.h >= 35 && hsv.h <= 85) return 'yellow';
  if (hsv.h <= 24 || hsv.h >= 335) return 'red';
  if (hsv.h >= 185 && hsv.h <= 260) return 'blue';
  if (hsv.h >= 95 && hsv.h <= 184) return 'green';
  return 'other';
}

function uniqueColors(colors) {
  const seen = new Set();
  const out = [];
  for (const color of colors) {
    const normalized = normalizeHexColor(color, null);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function buildStripColorSequence(approvedColors, white, allowBlack) {
  const candidates = uniqueColors(
    approvedColors.filter((color) => normalizeHexColor(color, null) !== white),
  );
  const sequence = [];
  const used = new Set();
  const addColor = (color) => {
    const normalized = normalizeHexColor(color, null);
    if (!normalized || used.has(normalized)) return;
    sequence.push(normalized);
    used.add(normalized);
  };
  const firstByRole = (role) => candidates.find((color) => classifyPaletteColor(color) === role);

  addColor(firstByRole('grey'));
  addColor(firstByRole('yellow'));
  addColor(firstByRole('red'));
  addColor(firstByRole('blue'));
  addColor(firstByRole('green'));

  for (const color of candidates) {
    const role = classifyPaletteColor(color);
    if (role === 'grey' || (role === 'black' && !allowBlack)) continue;
    addColor(color);
  }

  return sequence.length ? sequence : candidates;
}

function resolvePalette() {
  const globals = getGlobals();
  const templateId = resolveColorTemplateName(
    getPaletteTemplateOverrideFromUrl()
      || globals.currentTemplate
      || getWeatherDrivenPaletteTemplate(),
  );
  const colors = getCurrentPalette(templateId)
    .map((hex) => normalizeHexColor(hex, null))
    .filter(Boolean);
  const distribution = Array.isArray(globals.colorDistribution) ? globals.colorDistribution : [];
  const approvedIndices = distribution.length
    ? distribution
      .map((row) => clampInt(row?.colorIndex, 0, 7))
      .filter((index, position, list) => list.indexOf(index) === position)
    : [...FALLBACK_APPROVED_COLOR_INDICES];
  const approvedColors = uniqueColors(
    approvedIndices.map((index) => colors[index] || FALLBACK_PALETTE_COLORS[index] || null),
  );
  const resolvedApprovedColors = approvedColors.length
    ? approvedColors
    : uniqueColors(FALLBACK_APPROVED_COLOR_INDICES.map((index) => FALLBACK_PALETTE_COLORS[index]));
  const white = normalizeHexColor(colors[2], null) || resolvedApprovedColors[0];
  const blackAllowed = approvedIndices.includes(4);
  const stripeColors = buildStripColorSequence(resolvedApprovedColors, white, blackAllowed);
  const theme = getLondonWeatherPaletteTheme(templateId) || {};

  return {
    id: templateId,
    approvedIndices,
    approvedColors: resolvedApprovedColors,
    blackAllowed,
    stripColors: stripeColors.length ? stripeColors : resolvedApprovedColors,
    white,
    roomLine: normalizeHexColor(theme.frameColorLight || theme.siteFrameLight || colors[4], '#07111b'),
  };
}

function resolveBeadColor({ theta, phi, topCap, bottomCap, stripPhaseRad, stripCount, colorRatio, palette }) {
  if (theta <= topCap || theta >= Math.PI - bottomCap) return palette.white;

  const stripPosition = positiveModulo(((phi + stripPhaseRad) / TAU) * stripCount, stripCount);
  const stripIndex = Math.floor(stripPosition);
  const stripLocal = stripPosition - stripIndex;

  return stripLocal < colorRatio
    ? palette.stripColors[stripIndex % palette.stripColors.length]
    : palette.white;
}

function formatControlValue(value) {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (Number.isInteger(value)) return String(value);
  return Number(value).toFixed(2);
}

function createLineMesh(start, end, thickness, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  mesh.scale.set(thickness, thickness, length);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
  return mesh;
}

function createEngine(container, initialSettings, palette, reducedMotion) {
  container.dataset.paletteId = palette.id;
  container.dataset.approvedColorIndices = palette.approvedIndices.join(',');
  container.dataset.approvedColors = palette.approvedColors.join(',');
  container.dataset.blackAllowed = String(palette.blackAllowed);
  container.dataset.stripColors = palette.stripColors.join(',');
  container.dataset.whiteColor = palette.white;
  container.dataset.roomLineColor = palette.roomLine;
  container.dataset.backgroundColor = 'shared-shell';

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.shadowMap.enabled = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'beach-ball-room-canvas';
  renderer.domElement.setAttribute('aria-label', 'Beach ball room staging simulation');
  renderer.domElement.setAttribute('role', 'img');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(79, 1, 0.05, 100);
  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);

  const ballGroup = new THREE.Group();
  ballGroup.name = 'BallGroup';
  scene.add(ballGroup);

  const roomGroup = new THREE.Group();
  roomGroup.name = 'BeachBallRoomLines';
  scene.add(roomGroup);

  const depthMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    colorWrite: false,
    depthWrite: true,
    depthTest: true,
  });
  const depthSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), depthMaterial);
  depthSphere.renderOrder = 0;
  ballGroup.add(depthSphere);

  const colliderMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    colorWrite: false,
    depthWrite: false,
    depthTest: false,
  });
  const pointerCollider = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), colliderMaterial);
  pointerCollider.name = 'BeachBallPointerCollider';
  scene.add(pointerCollider);

  const beadGeometry = new THREE.SphereGeometry(1, 8, 6);
  let beadMeshes = [];

  const lineMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.roomLine),
    transparent: true,
    opacity: initialSettings.roomLineOpacity,
    depthWrite: false,
  });

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const tempMatrix = new THREE.Matrix4();
  const tempPosition = new THREE.Vector3();
  const tempQuaternion = new THREE.Quaternion();
  const tempScale = new THREE.Vector3();
  const tempCollisionNormal = new THREE.Vector3();
  const tempTangentVelocity = new THREE.Vector3();
  const tempAngularAxis = new THREE.Vector3();
  const tempRight = new THREE.Vector3();
  const tempUp = new THREE.Vector3();
  const tempImpulse = new THREE.Vector3();
  const tempRoomExtents = { halfX: 2, halfY: 1.5 };
  const roomFrontExtents = { halfX: 2, halfY: 1.5 };
  const roomBackExtents = { halfX: 2, halfY: 1.5 };
  const cameraFovScale = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);

  let settings = sanitizeSettings(initialSettings);
  let frameId = 0;
  let rebuildTimer = 0;
  let resizeTimer = 0;
  let resizeObserver = null;
  let lastTime = performance.now();
  let accumulator = 0;
  let isHidden = document.hidden;
  let latestReducedMotion = reducedMotion;
  let ballRadius = 1;
  let beadRadius = 0.05;
  let viewportAspect = 1;
  let frontWallBounceCount = 0;
  let backWallBounceCount = 0;
  let beadRebuildCount = 0;
  let resizeCount = 0;
  let lastInteractionTime = performance.now();
  let idleSettleFactor = 0;
  let idleRestHoldTime = 0;
  let absorbedIdleContact = false;
  let isAtRest = false;
  let motionDebugFrame = 0;
  let roomBounds = {
    frontZ: 1.2,
    backZ: -3,
    zMin: -3,
    zMax: 1.2,
  };
  const position = new THREE.Vector3(0, 0, 0);
  const velocity = new THREE.Vector3(0.65, latestReducedMotion ? 0.05 : 0.9, latestReducedMotion ? 0.6 : 2.35);
  const angularVelocity = new THREE.Vector3(
    latestReducedMotion ? 0.08 : 0.4,
    latestReducedMotion ? 0.12 : 0.85,
    latestReducedMotion ? 0.04 : 0.25,
  );
  container.dataset.frontWallBounceCount = '0';
  container.dataset.backWallBounceCount = '0';
  container.dataset.lastWallHit = '';
  container.dataset.beadRebuildCount = '0';
  container.dataset.beadCount = '0';
  container.dataset.lastRebuildMs = '0';
  container.dataset.resizeCount = '0';
  container.dataset.renderedDpr = String(renderer.getPixelRatio());
  container.dataset.idleState = 'active';
  container.dataset.resting = 'false';
  container.dataset.idleSettle = '0';
  container.dataset.ballSpeed = String(velocity.length());
  container.dataset.ballAngularSpeed = String(angularVelocity.length());
  container.dataset.linearSpeed = String(velocity.length());
  container.dataset.angularSpeed = String(angularVelocity.length());
  const pointerState = {
    active: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    normal: new THREE.Vector3(0, 0, 1),
  };

  function disposeRoomLineGeometry() {
    roomGroup.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
    });
  }

  function disposeBeads() {
    for (const mesh of beadMeshes) {
      ballGroup.remove(mesh);
      mesh.material?.dispose?.();
    }
    beadMeshes = [];
    container.dataset.renderedBeadColors = '';
  }

  function wakeMotion(now = performance.now()) {
    lastInteractionTime = now;
    idleSettleFactor = 0;
    idleRestHoldTime = 0;
    absorbedIdleContact = false;
    isAtRest = false;
    container.dataset.idleState = 'active';
    container.dataset.resting = 'false';
    container.dataset.idleSettle = '0';
  }

  function writeMotionDebug(force = false) {
    motionDebugFrame += 1;
    if (!force && motionDebugFrame % MOTION_DEBUG_INTERVAL_FRAMES !== 0) return;
    container.dataset.idleState = isAtRest
      ? 'resting'
      : (idleSettleFactor > 0 ? 'settling' : 'active');
    container.dataset.resting = String(isAtRest);
    container.dataset.idleSettle = idleSettleFactor.toFixed(3);
    const linearSpeed = velocity.length().toFixed(4);
    const angularSpeed = angularVelocity.length().toFixed(4);
    container.dataset.linearSpeed = linearSpeed;
    container.dataset.angularSpeed = angularSpeed;
    container.dataset.ballSpeed = linearSpeed;
    container.dataset.ballAngularSpeed = angularSpeed;
  }

  function getViewportMetrics() {
    const rect = container.getBoundingClientRect();
    const renderedWidth = rect.width || container.clientWidth;
    const renderedHeight = rect.height || container.clientHeight;
    const width = Math.max(1, Math.round(renderedWidth));
    const height = Math.max(1, Math.round(renderedHeight));
    const aspect = Math.max(1, renderedWidth) / Math.max(1, renderedHeight);
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const visibleHeight = 2 * Math.tan(fovRad * 0.5) * camera.position.z;
    const visibleWidth = visibleHeight * aspect;
    return { width, height, aspect, visibleWidth, visibleHeight };
  }

  function clampToOrderedRange(value, low, high) {
    if (low > high) return (low + high) * 0.5;
    return clamp(value, low, high);
  }

  function writeRoomHalfExtentsAtZ(z, target) {
    const insetScale = 1 - clamp(settings.roomInset, 0, 0.75);
    const distance = Math.max(0.1, camera.position.z - z);
    const baseHalfY = cameraFovScale * distance * insetScale;
    const minHalf = ballRadius * 1.18;
    const minHalfYForAspect = minHalf / Math.max(0.1, viewportAspect);
    const halfY = Math.max(baseHalfY, minHalf, minHalfYForAspect);
    target.halfY = halfY;
    target.halfX = halfY * viewportAspect;
    return target;
  }

  function updateRoomGeometry() {
    disposeRoomLineGeometry();
    roomGroup.clear();
    const metrics = getViewportMetrics();
    viewportAspect = metrics.aspect;
    const inset = clamp(settings.roomInset, 0, 0.75);
    const foregroundLimit = clamp(settings.foregroundLimit, 0.3, 3);
    const requestedFrontZ = ballRadius * foregroundLimit;
    const frontZ = Math.min(requestedFrontZ, camera.position.z - ballRadius * 0.65);
    const backZ = -ballRadius * clamp(settings.roomDepth, 1, 12);
    writeRoomHalfExtentsAtZ(frontZ, roomFrontExtents);
    writeRoomHalfExtentsAtZ(backZ, roomBackExtents);

    roomBounds = {
      frontZ,
      backZ,
      zMin: backZ,
      zMax: frontZ,
    };

    container.dataset.ballDiameterViewportRatio = String(clamp(settings.ballDiameterViewportRatio, 0.15, 0.9));
    container.dataset.foregroundLimit = String(foregroundLimit);
    container.dataset.backWallBounceBoost = String(clamp(settings.backWallBounceBoost, 1, 5));
    container.dataset.roomAspect = String(metrics.aspect);
    container.dataset.roomInset = String(inset);
    container.dataset.roomFrontZ = String(frontZ);
    container.dataset.roomBackZ = String(backZ);
    container.dataset.roomFrontSize = `${roomFrontExtents.halfX * 2},${roomFrontExtents.halfY * 2}`;
    container.dataset.roomBackSize = `${roomBackExtents.halfX * 2},${roomBackExtents.halfY * 2}`;
    container.dataset.frontWallBounce = 'enabled';

    const thickness = clamp(settings.roomLineThickness, 0, 0.25);
    lineMaterial.opacity = settings.showRoomLines ? clamp(settings.roomLineOpacity, 0, 1) : 0;
    roomGroup.visible = Boolean(settings.showRoomLines);

    const front = [
      new THREE.Vector3(-roomFrontExtents.halfX, -roomFrontExtents.halfY, frontZ),
      new THREE.Vector3(roomFrontExtents.halfX, -roomFrontExtents.halfY, frontZ),
      new THREE.Vector3(roomFrontExtents.halfX, roomFrontExtents.halfY, frontZ),
      new THREE.Vector3(-roomFrontExtents.halfX, roomFrontExtents.halfY, frontZ),
    ];
    const back = [
      new THREE.Vector3(-roomBackExtents.halfX, -roomBackExtents.halfY, backZ),
      new THREE.Vector3(roomBackExtents.halfX, -roomBackExtents.halfY, backZ),
      new THREE.Vector3(roomBackExtents.halfX, roomBackExtents.halfY, backZ),
      new THREE.Vector3(-roomBackExtents.halfX, roomBackExtents.halfY, backZ),
    ];
    const edges = [
      [back[0], back[1]], [back[1], back[2]], [back[2], back[3]], [back[3], back[0]],
      [front[0], back[0]], [front[1], back[1]], [front[2], back[2]], [front[3], back[3]],
    ];

    for (const [start, end] of edges) {
      roomGroup.add(createLineMesh(start, end, thickness, lineMaterial));
    }
  }

  function updatePointerColliderScale() {
    const influenceRadius = clamp(settings.pointerInfluenceRadius, 1, 5);
    pointerCollider.scale.setScalar(ballRadius * influenceRadius);
  }

  function updateResponsiveSizing() {
    wakeMotion();
    const metrics = getViewportMetrics();
    viewportAspect = metrics.aspect;
    camera.aspect = metrics.aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(metrics.width, metrics.height, false);
    container.dataset.renderedDpr = String(renderer.getPixelRatio());
    const ballDiameterRatio = clamp(settings.ballDiameterViewportRatio, 0.15, 0.9);
    const targetDiameter = Math.min(metrics.visibleWidth, metrics.visibleHeight) * ballDiameterRatio;
    ballRadius = Math.max(0.25, targetDiameter * 0.5);
    depthSphere.scale.setScalar(ballRadius);
    updatePointerColliderScale();
    updateRoomGeometry();
    constrainPosition();
  }

  function getPointerRay(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(pointerNdc, camera);
    return raycaster.ray;
  }

  function buildBeads() {
    const rebuildStart = performance.now();
    disposeBeads();

    const metrics = getViewportMetrics();
    const isMobile = metrics.width <= 720 || metrics.width < metrics.height;
    const mobileScale = isMobile ? clamp(settings.mobileDensityScale, 0, 4) : 1;
    const latitudeRows = clampInt(settings.latitudeRows * mobileScale, 1, 80);
    const stripCount = clampInt(settings.colourStripCount, 1, 24);
    const colorColumns = clampInt(settings.colourStripColumns, 1, 24);
    const whiteColumns = clampInt(settings.whiteStripColumns, 1, 24);
    const columnsPerStrip = colorColumns + whiteColumns;
    const longitudeColumns = stripCount * columnsPerStrip;
    const rowSpacing = (Math.PI * ballRadius) / (latitudeRows + 1);
    const colSpacing = (TAU * ballRadius) / longitudeColumns;
    beadRadius = Math.min(rowSpacing, colSpacing) * 0.28 * clamp(settings.beadRadiusScale, 0, 6);

    const stripPhaseRad = THREE.MathUtils.degToRad(clamp(settings.stripPhase, 0, 360));
    const topCap = THREE.MathUtils.degToRad(clamp(settings.topCapAngleDeg, 0, 90));
    const bottomCap = THREE.MathUtils.degToRad(clamp(settings.bottomCapAngleDeg, 0, 90));
    const colorRatio = colorColumns / columnsPerStrip;
    const centerRadius = ballRadius + beadRadius * (0.35 + clamp(settings.beadSurfaceOffset, 0, 2));
    const colorCounts = new Map(palette.approvedColors.map((color) => [color, 0]));
    const meshesByColor = new Map();
    const writeIndices = new Map();
    let beadCount = 0;

    for (let row = 1; row <= latitudeRows; row += 1) {
      const theta = (row / (latitudeRows + 1)) * Math.PI;

      for (let column = 0; column < longitudeColumns; column += 1) {
        const phi = (column / longitudeColumns) * TAU;
        const color = resolveBeadColor({
          theta,
          phi,
          topCap,
          bottomCap,
          stripPhaseRad,
          stripCount,
          colorRatio,
          palette,
        });
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        beadCount += 1;
      }
    }

    for (const [color, count] of colorCounts) {
      if (count <= 0) continue;
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        depthTest: true,
        depthWrite: true,
      });
      const mesh = new THREE.InstancedMesh(beadGeometry, material, count);
      mesh.name = `BeachBallRoomBeads:${color}`;
      mesh.renderOrder = 1;
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      mesh.userData.color = color;
      meshesByColor.set(color, mesh);
      writeIndices.set(color, 0);
      beadMeshes.push(mesh);
      ballGroup.add(mesh);
    }

    container.dataset.renderedBeadColors = beadMeshes.map((mesh) => mesh.userData.color).join(',');

    for (let row = 1; row <= latitudeRows; row += 1) {
      const theta = (row / (latitudeRows + 1)) * Math.PI;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let column = 0; column < longitudeColumns; column += 1) {
        const phi = (column / longitudeColumns) * TAU;
        const x = centerRadius * sinTheta * Math.cos(phi);
        const y = centerRadius * cosTheta;
        const z = centerRadius * sinTheta * Math.sin(phi);
        const color = resolveBeadColor({
          theta,
          phi,
          topCap,
          bottomCap,
          stripPhaseRad,
          stripCount,
          colorRatio,
          palette,
        });
        const mesh = meshesByColor.get(color);
        if (!mesh) continue;
        const instanceIndex = writeIndices.get(color) || 0;

        tempPosition.set(x, y, z);
        tempQuaternion.identity();
        tempScale.setScalar(beadRadius);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        mesh.setMatrixAt(instanceIndex, tempMatrix);
        writeIndices.set(color, instanceIndex + 1);
      }
    }

    for (const mesh of beadMeshes) {
      mesh.instanceMatrix.needsUpdate = true;
    }
    beadRebuildCount += 1;
    container.dataset.beadRebuildCount = String(beadRebuildCount);
    container.dataset.beadCount = String(beadCount);
    container.dataset.lastRebuildMs = (performance.now() - rebuildStart).toFixed(2);
  }

  function constrainPosition() {
    position.z = clampToOrderedRange(position.z, roomBounds.zMin + ballRadius, roomBounds.zMax - ballRadius);
    writeRoomHalfExtentsAtZ(position.z, tempRoomExtents);
    position.x = clampToOrderedRange(position.x, -tempRoomExtents.halfX + ballRadius, tempRoomExtents.halfX - ballRadius);
    position.y = clampToOrderedRange(position.y, -tempRoomExtents.halfY + ballRadius, tempRoomExtents.halfY - ballRadius);
  }

  function capMotion() {
    const maxLinearSpeed = clamp(settings.maxLinearSpeed, 1, 60);
    const linearSpeed = velocity.length();
    if (linearSpeed > maxLinearSpeed) {
      velocity.multiplyScalar(maxLinearSpeed / linearSpeed);
    }

    const maxAngularSpeed = clamp(settings.maxAngularSpeed, 1, 60);
    const angularSpeed = angularVelocity.length();
    if (angularSpeed > maxAngularSpeed) {
      angularVelocity.multiplyScalar(maxAngularSpeed / angularSpeed);
    }
  }

  function applyWallCollision(axis, min, max, normalSign) {
    const radius = ballRadius;
    const low = min + radius;
    const high = max - radius;
    if (low > high) {
      position[axis] = (min + max) * 0.5;
      return;
    }

    const value = position[axis];
    let normal = 0;
    const component = velocity[axis];
    const contactSlop = axis === 'z' ? Math.max(0.002, radius * WALL_CONTACT_SLOP_RATIO) : 0;

    if (value < low || (axis === 'z' && value <= low + contactSlop && component < 0)) {
      position[axis] = low;
      normal = normalSign;
    } else if (value > high || (axis === 'z' && value >= high - contactSlop && component >= 0)) {
      position[axis] = high;
      normal = -normalSign;
    }

    if (normal === 0) return;

    const isFrontWall = axis === 'z' && normal === -normalSign;
    if (component * normal < 0 || (isFrontWall && Math.abs(component) < 0.001)) {
      const restitution = clamp(settings.restitution, 0, 2);
      const bounceBoost = clamp(settings.bounceBoost, 1, 5);
      const backWallBoost = axis === 'z' && normal === normalSign
        ? clamp(settings.backWallBounceBoost, 1, 5)
        : 1;
      const minRebound = clamp(settings.bounceMinVelocity, 0, 10);
      const effectiveMinRebound = isFrontWall
        ? Math.max(minRebound, radius * FRONT_WALL_MIN_REBOUND_RADIUS_SCALE)
        : minRebound;
      const bouncedComponent = -component * restitution * bounceBoost * backWallBoost;
      const shouldAbsorbIdleContact = !isFrontWall
        && idleSettleFactor > 0.65
        && Math.abs(component) < IDLE_COLLISION_ABSORB_SPEED;
      velocity[axis] = shouldAbsorbIdleContact
        ? 0
        : (Math.abs(bouncedComponent) < effectiveMinRebound
        ? normal * effectiveMinRebound
          : bouncedComponent);
      absorbedIdleContact = absorbedIdleContact || shouldAbsorbIdleContact;
      if (axis === 'z') {
        if (isFrontWall) {
          frontWallBounceCount += 1;
          container.dataset.frontWallBounceCount = String(frontWallBounceCount);
          container.dataset.lastWallHit = 'front';
        } else {
          backWallBounceCount += 1;
          container.dataset.backWallBounceCount = String(backWallBounceCount);
          container.dataset.lastWallHit = 'back';
        }
      }

      const friction = clamp(settings.wallFriction, 0, 1);
      const spinBoost = clamp(settings.collisionSpinBoost, 0, 8);
      const tangentScale = Math.max(0, 1 - friction);
      if (axis !== 'x') velocity.x *= tangentScale;
      if (axis !== 'y') velocity.y *= tangentScale;
      if (axis !== 'z') velocity.z *= tangentScale;

      tempCollisionNormal.set(
        axis === 'x' ? normal : 0,
        axis === 'y' ? normal : 0,
        axis === 'z' ? normal : 0,
      );
      tempTangentVelocity
        .copy(velocity)
        .addScaledVector(tempCollisionNormal, -velocity.dot(tempCollisionNormal));
      angularVelocity.add(
        tempCollisionNormal
          .cross(tempTangentVelocity)
          .multiplyScalar((friction * spinBoost) / Math.max(0.1, radius)),
      );
      const spinLossScale = isFrontWall ? FRONT_WALL_SPIN_LOSS_SCALE : WALL_SPIN_LOSS_SCALE;
      angularVelocity.multiplyScalar(Math.max(0, 1 - friction * spinLossScale));
    }
  }

  function stepPhysics(dt) {
    if (isAtRest) {
      ballGroup.position.copy(position);
      pointerCollider.position.copy(position);
      return;
    }

    const idleSeconds = Math.max(0, (performance.now() - lastInteractionTime) / 1000);
    idleSettleFactor = clamp(
      (idleSeconds - IDLE_SETTLE_DELAY_SECONDS) / Math.max(0.1, IDLE_SETTLE_FULL_SECONDS - IDLE_SETTLE_DELAY_SECONDS),
      0,
      1,
    );
    absorbedIdleContact = false;
    velocity.y -= clamp(settings.gravity, 0, 40) * dt;
    velocity.multiplyScalar(Math.exp(-clamp(settings.linearDamping, 0, 5) * dt));
    angularVelocity.multiplyScalar(Math.exp(-clamp(settings.angularDamping, 0, 5) * dt));
    if (idleSettleFactor > 0) {
      velocity.multiplyScalar(Math.exp(-IDLE_SETTLE_LINEAR_DAMPING * idleSettleFactor * dt));
      angularVelocity.multiplyScalar(Math.exp(-IDLE_SETTLE_ANGULAR_DAMPING * idleSettleFactor * dt));
    }
    position.addScaledVector(velocity, dt);

    applyWallCollision('z', roomBounds.zMin, roomBounds.zMax, 1);
    writeRoomHalfExtentsAtZ(position.z, tempRoomExtents);
    applyWallCollision('x', -tempRoomExtents.halfX, tempRoomExtents.halfX, 1);
    applyWallCollision('y', -tempRoomExtents.halfY, tempRoomExtents.halfY, 1);
    capMotion();

    if (
      idleSettleFactor >= 1
      && absorbedIdleContact
      && velocity.length() < IDLE_REST_LINEAR_SPEED
      && angularVelocity.length() < IDLE_REST_ANGULAR_SPEED
    ) {
      idleRestHoldTime += dt;
      if (idleRestHoldTime >= IDLE_REST_HOLD_SECONDS) {
        velocity.set(0, 0, 0);
        angularVelocity.set(0, 0, 0);
        isAtRest = true;
        writeMotionDebug(true);
      }
    } else {
      idleRestHoldTime = 0;
    }

    const angularSpeed = angularVelocity.length();
    if (angularSpeed > 0.0001) {
      tempAngularAxis.copy(angularVelocity).normalize();
      tempQuaternion.setFromAxisAngle(tempAngularAxis, angularSpeed * dt);
      ballGroup.quaternion.premultiply(tempQuaternion).normalize();
    }

    ballGroup.position.copy(position);
    pointerCollider.position.copy(position);
  }

  function renderFrame(now) {
    frameId = window.requestAnimationFrame(renderFrame);
    if (isHidden) {
      lastTime = now;
      return;
    }

    const delta = Math.min((now - lastTime) / 1000, FIXED_DT * MAX_SUBSTEPS);
    lastTime = now;
    accumulator += delta;

    let substeps = 0;
    while (accumulator >= FIXED_DT && substeps < MAX_SUBSTEPS) {
      stepPhysics(FIXED_DT);
      accumulator -= FIXED_DT;
      substeps += 1;
    }
    if (substeps === MAX_SUBSTEPS) accumulator = 0;
    writeMotionDebug();

    renderer.render(scene, camera);
  }

  function onResize() {
    resizeCount += 1;
    container.dataset.resizeCount = String(resizeCount);
    updateResponsiveSizing();
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      updateResponsiveSizing();
      buildBeads();
      renderer.render(scene, camera);
    }, 120);
  }

  function onVisibilityChange() {
    isHidden = document.hidden;
    lastTime = performance.now();
    accumulator = 0;
  }

  function onPointerDown(event) {
    if (pointerState.active) return;
    const ray = getPointerRay(event);
    const hits = raycaster.intersectObject(pointerCollider, false);
    if (!hits.length) return;

    event.preventDefault();
    wakeMotion();
    renderer.domElement.setPointerCapture?.(event.pointerId);
    pointerState.active = true;
    pointerState.pointerId = event.pointerId;
    pointerState.lastX = event.clientX;
    pointerState.lastY = event.clientY;
    pointerState.lastTime = performance.now();
    pointerState.normal.copy(hits[0].point).sub(position).normalize();

    const impulseScale = latestReducedMotion ? 0.45 : 1;
    const tapStrength = clamp(settings.tapPushStrength, 0, 20);
    const spinStrength = clamp(settings.pointerSpinStrength, 0, 10);
    velocity.addScaledVector(ray.direction, tapStrength * impulseScale);
    tempAngularAxis.copy(pointerState.normal).cross(ray.direction);
    angularVelocity.add(tempAngularAxis.multiplyScalar(spinStrength * impulseScale));
    capMotion();
  }

  function onPointerMove(event) {
    if (!pointerState.active || event.pointerId !== pointerState.pointerId) return;

    event.preventDefault();
    const now = performance.now();
    wakeMotion(now);
    const ray = getPointerRay(event);
    const dt = Math.max(6, now - pointerState.lastTime);
    const rect = renderer.domElement.getBoundingClientRect();
    const dx = (event.clientX - pointerState.lastX) / Math.max(1, Math.min(rect.width, rect.height));
    const dy = (event.clientY - pointerState.lastY) / Math.max(1, Math.min(rect.width, rect.height));
    const speedScale = clamp(16 / dt, 0.45, 2.4);
    const impulseScale = latestReducedMotion ? 0.5 : 1;
    const dragStrength = clamp(settings.dragFlickStrength, 0, 80);
    const depthPush = clamp(settings.dragDepthPush, 0, 5);
    const spinStrength = clamp(settings.pointerSpinStrength, 0, 10);
    tempRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    tempUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    tempImpulse
      .copy(tempRight)
      .multiplyScalar(dx * dragStrength * speedScale * impulseScale)
      .add(tempUp.multiplyScalar(-dy * dragStrength * speedScale * impulseScale));

    velocity.add(tempImpulse);
    velocity.addScaledVector(ray.direction, depthPush * impulseScale);
    tempAngularAxis.copy(pointerState.normal).cross(tempImpulse);
    angularVelocity.add(tempAngularAxis.multiplyScalar(spinStrength / Math.max(0.1, ballRadius)));
    capMotion();

    pointerState.lastX = event.clientX;
    pointerState.lastY = event.clientY;
    pointerState.lastTime = now;
  }

  function onPointerUp(event) {
    if (!pointerState.active || event.pointerId !== pointerState.pointerId) return;
    pointerState.active = false;
    pointerState.pointerId = null;
    renderer.domElement.releasePointerCapture?.(event.pointerId);
  }

  function updateSettings(nextSettings, nextReducedMotion, options = {}) {
    settings = sanitizeSettings(nextSettings);
    latestReducedMotion = Boolean(nextReducedMotion);
    if (options.wake !== false) wakeMotion();
    updatePointerColliderScale();
    if (options.roomChanged !== false) updateRoomGeometry();
  }

  function scheduleRebuild() {
    window.clearTimeout(rebuildTimer);
    rebuildTimer = window.setTimeout(() => {
      updateResponsiveSizing();
      buildBeads();
      renderer.render(scene, camera);
    }, 140);
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('resize', onResize);
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  updateResponsiveSizing();
  buildBeads();
  ballGroup.position.copy(position);
  pointerCollider.position.copy(position);
  frameId = window.requestAnimationFrame(renderFrame);

  return {
    updateSettings,
    scheduleRebuild,
    dispose() {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(rebuildTimer);
      window.clearTimeout(resizeTimer);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      disposeRoomLineGeometry();
      disposeBeads();
      beadGeometry.dispose();
      depthSphere.geometry.dispose();
      depthMaterial.dispose();
      pointerCollider.geometry.dispose();
      colliderMaterial.dispose();
      lineMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function BeachBallRoomControls({ settings, onChange, onReset }) {
  const [copiedConfig, setCopiedConfig] = useState('');

  const updateControl = (control, rawValue) => {
    const value = control.type === 'checkbox'
      ? Boolean(rawValue)
      : (control.integer
        ? clampInt(rawValue, control.min, control.max)
        : clamp(rawValue, control.min, control.max));
    onChange({ ...settings, [control.key]: value });
  };

  const copyConfig = async () => {
    const payload = JSON.stringify({
      simulation: BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY.id,
      enabledInRotation: BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY.enabledInRotation,
      visualSettings: settings,
    }, null, 2);
    setCopiedConfig(payload);
    try {
      await navigator.clipboard?.writeText(payload);
    } catch {
      // Textarea fallback remains visible.
    }
  };

  return (
    <aside className="beach-ball-room-controls" aria-label="Beach ball room design controls">
      <div className="beach-ball-room-controls__header">
        <div>
          <p className="beach-ball-room-controls__eyebrow">Lab controls</p>
          <h2>Beach Ball Room</h2>
        </div>
        <button type="button" onClick={onReset}>Reset</button>
      </div>

      {CONTROL_GROUPS.map((group) => (
        <details key={group.title} open className="beach-ball-room-controls__group">
          <summary>{group.title}</summary>
          <div className="beach-ball-room-controls__rows">
            {group.controls.map((control) => {
              const value = settings[control.key];
              if (control.type === 'checkbox') {
                return (
                  <label key={control.key} className="beach-ball-room-controls__row beach-ball-room-controls__row--toggle">
                    <span>{control.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => updateControl(control, event.target.checked)}
                    />
                  </label>
                );
              }

              return (
                <label key={control.key} className="beach-ball-room-controls__row">
                  <span>{control.label}</span>
                  <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={value}
                    onChange={(event) => updateControl(control, event.target.value)}
                  />
                  <output>{formatControlValue(value)}</output>
                </label>
              );
            })}
          </div>
        </details>
      ))}

      <button type="button" className="beach-ball-room-controls__copy" onClick={copyConfig}>
        Copy config
      </button>
      {copiedConfig ? (
        <textarea
          className="beach-ball-room-controls__output"
          value={copiedConfig}
          readOnly
          aria-label="Copied beach ball room config"
        />
      ) : null}
    </aside>
  );
}

export function BeachBallRoomSimulation() {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const showControls = useMemo(() => shouldShowControls(), []);
  const reducedMotion = usePrefersReducedMotion();
  const palette = useMemo(() => resolvePalette(), []);
  const [settings, setSettings] = useState(readInitialSettings);
  const [engineError, setEngineError] = useState('');
  const initialSettingsRef = useRef(settings);
  const previousSettingsRef = useRef(settings);
  const previousReducedMotionRef = useRef(reducedMotion);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Local persistence is a staging convenience only.
    }
  }, [settings]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    let engine;
    try {
      engine = createEngine(containerRef.current, initialSettingsRef.current, palette, reducedMotion);
    } catch (error) {
      const message = error?.message || 'WebGL is unavailable.';
      const errorFrame = window.requestAnimationFrame(() => setEngineError(message));
      return () => window.cancelAnimationFrame(errorFrame);
    }
    engineRef.current = engine;
    return () => {
      engineRef.current = null;
      engine.dispose();
    };
  }, [palette, reducedMotion]);

  useEffect(() => {
    const changedKeys = getChangedSettingKeys(previousSettingsRef.current, settings);
    const reducedMotionChanged = previousReducedMotionRef.current !== reducedMotion;
    const roomChanged = changedKeys.some((key) => ROOM_SETTING_KEYS.has(key));
    const beadRebuildNeeded = changedKeys.some((key) => BEAD_REBUILD_SETTING_KEYS.has(key));
    const shouldWake = changedKeys.length > 0 || reducedMotionChanged;

    engineRef.current?.updateSettings(settings, reducedMotion, {
      roomChanged,
      wake: shouldWake,
    });
    if (beadRebuildNeeded) {
      engineRef.current?.scheduleRebuild();
    }

    previousSettingsRef.current = settings;
    previousReducedMotionRef.current = reducedMotion;
  }, [settings, reducedMotion]);

  return (
    <div
      className="beach-ball-room-simulation"
      ref={containerRef}
      data-simulation-id={BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY.id}
      data-enabled-in-rotation={String(BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY.enabledInRotation)}
    >
      {engineError ? (
        <p className="beach-ball-room-fallback" role="alert">
          WebGL is unavailable in this browser context.
        </p>
      ) : null}
      {showControls ? (
        <BeachBallRoomControls
          settings={settings}
          onChange={setSettings}
          onReset={() => setSettings({ ...DEFAULT_SETTINGS })}
        />
      ) : null}
    </div>
  );
}
