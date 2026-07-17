import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { getGlobals } from '../../legacy/modules/core/state.js';
import {
  getCurrentPalette,
  getPaletteTemplateOverrideFromUrl,
  getTimeOfDayPaletteTemplate,
  resolveColorTemplateName,
} from '../../legacy/modules/visual/colors.js';
import {
  createIndexedSimulationVisualTransition,
  registerSimulationVisualTransition,
} from '../../lib/simulationVisualTransition.js';
import {
  triggerImpact,
  triggerRelease,
} from '../../legacy/modules/audio/simulation-audio-adapter.js';
import { useRenderedThemeIsDark } from '../../hooks/useRenderedTheme.js';
import { resolveMobileSimulationBodyScale } from '../../lib/mobileSimulationSizing.js';
import {
  BEACH_BALL_ROOM_DEFAULT_SETTINGS,
  clampBeachBallRoomInteger,
  clampBeachBallRoomNumber,
  getBeachBallRoomChangedSettingKeys,
  sanitizeBeachBallRoomSettings,
} from './beachBallRoomSettings.js';
import { BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY } from './beachBallRoomRegistry.js';
import './beach-ball-room-runtime.css';

const TAU = Math.PI * 2;
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

function positiveModulo(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
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

function resolvePalette(isDarkMode) {
  const globals = getGlobals();
  const templateId = resolveColorTemplateName(
    getPaletteTemplateOverrideFromUrl()
      || globals.currentTemplate
      || getTimeOfDayPaletteTemplate(),
  );
  const colors = getCurrentPalette(templateId, isDarkMode)
    .map((hex) => normalizeHexColor(hex, null))
    .filter(Boolean);
  const distribution = Array.isArray(globals.colorDistribution) ? globals.colorDistribution : [];
  const approvedIndices = distribution.length
    ? distribution
      .map((row) => clampBeachBallRoomInteger(row?.colorIndex, 0, 7))
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
  return {
    id: templateId,
    approvedIndices,
    approvedColors: resolvedApprovedColors,
    blackAllowed,
    stripColors: stripeColors.length ? stripeColors : resolvedApprovedColors,
    white,
    roomLine: normalizeHexColor(colors[4], '#07111b'),
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
  let beadInstanceRanges = [];
  let visualBeadCount = 0;

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

  let settings = sanitizeBeachBallRoomSettings(initialSettings);
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
  let unregisterVisualTransition = null;
  let roomBounds = {
    frontZ: 1.2,
    backZ: -3,
    zMin: -3,
    zMax: 1.2,
  };
  const visualTransition = createIndexedSimulationVisualTransition({
    sourceId: BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY.id,
    getCount: () => visualBeadCount,
    setScaleAt: (index, scale) => applyBeadVisualScaleAt(index, scale),
    requestRender: () => renderer.render(scene, camera),
    getSeed: () => beadRebuildCount + 0x5bead,
  });
  unregisterVisualTransition = registerSimulationVisualTransition(
    BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY.id,
    visualTransition,
  );
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
    beadInstanceRanges = [];
    visualBeadCount = 0;
    container.dataset.renderedBeadColors = '';
  }

  function applyBeadVisualScaleAt(index, scale) {
    if (index < 0 || index >= visualBeadCount) return;
    for (let rangeIndex = 0; rangeIndex < beadInstanceRanges.length; rangeIndex += 1) {
      const range = beadInstanceRanges[rangeIndex];
      if (index < range.start || index >= range.start + range.count) continue;
      const localIndex = index - range.start;
      const matrixOffset = localIndex * 16;
      tempPosition.set(
        range.baseMatrices[matrixOffset + 12],
        range.baseMatrices[matrixOffset + 13],
        range.baseMatrices[matrixOffset + 14],
      );
      tempQuaternion.identity();
      tempScale.setScalar(beadRadius * Math.max(0, scale));
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      range.mesh.setMatrixAt(localIndex, tempMatrix);
      range.mesh.instanceMatrix.needsUpdate = true;
      return;
    }
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
    return clampBeachBallRoomNumber(value, low, high);
  }

  function writeRoomHalfExtentsAtZ(z, target) {
    const insetScale = 1 - clampBeachBallRoomNumber(settings.roomInset, 0, 0.75);
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
    const inset = clampBeachBallRoomNumber(settings.roomInset, 0, 0.75);
    const foregroundLimit = clampBeachBallRoomNumber(settings.foregroundLimit, 0.3, 3);
    const requestedFrontZ = ballRadius * foregroundLimit;
    const frontZ = Math.min(requestedFrontZ, camera.position.z - ballRadius * 0.65);
    const backZ = -ballRadius * clampBeachBallRoomNumber(settings.roomDepth, 1, 12);
    writeRoomHalfExtentsAtZ(frontZ, roomFrontExtents);
    writeRoomHalfExtentsAtZ(backZ, roomBackExtents);

    roomBounds = {
      frontZ,
      backZ,
      zMin: backZ,
      zMax: frontZ,
    };

    container.dataset.ballDiameterViewportRatio = String(clampBeachBallRoomNumber(settings.ballDiameterViewportRatio, 0.15, 0.9));
    container.dataset.foregroundLimit = String(foregroundLimit);
    container.dataset.backWallBounceBoost = String(clampBeachBallRoomNumber(settings.backWallBounceBoost, 1, 5));
    container.dataset.roomAspect = String(metrics.aspect);
    container.dataset.roomInset = String(inset);
    container.dataset.roomFrontZ = String(frontZ);
    container.dataset.roomBackZ = String(backZ);
    container.dataset.roomFrontSize = `${roomFrontExtents.halfX * 2},${roomFrontExtents.halfY * 2}`;
    container.dataset.roomBackSize = `${roomBackExtents.halfX * 2},${roomBackExtents.halfY * 2}`;
    container.dataset.frontWallBounce = 'enabled';

    const thickness = clampBeachBallRoomNumber(settings.roomLineThickness, 0, 0.25);
    lineMaterial.opacity = settings.showRoomLines ? clampBeachBallRoomNumber(settings.roomLineOpacity, 0, 1) : 0;
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
    const influenceRadius = clampBeachBallRoomNumber(settings.pointerInfluenceRadius, 1, 5);
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
    const ballDiameterRatio = clampBeachBallRoomNumber(settings.ballDiameterViewportRatio, 0.15, 0.9);
    const targetDiameter = Math.min(metrics.visibleWidth, metrics.visibleHeight) * ballDiameterRatio;
    const globals = getGlobals();
    const mobileBodyScale = resolveMobileSimulationBodyScale(
      globals.mobileSimulationBodyScale,
      {
        width: metrics.width,
        height: metrics.height,
        isMobileDevice: globals.isMobile ? true : undefined,
      },
    );
    ballRadius = Math.max(0.25, targetDiameter * 0.5 * mobileBodyScale);
    container.dataset.mobileSimulationBodyScale = mobileBodyScale.toFixed(2);
    container.dataset.simulationBodyRadius = ballRadius.toFixed(3);
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
    const mobileScale = isMobile ? clampBeachBallRoomNumber(settings.mobileDensityScale, 0, 4) : 1;
    const latitudeRows = clampBeachBallRoomInteger(settings.latitudeRows * mobileScale, 1, 80);
    const stripCount = clampBeachBallRoomInteger(settings.colourStripCount, 1, 24);
    const colorColumns = clampBeachBallRoomInteger(settings.colourStripColumns, 1, 24);
    const whiteColumns = clampBeachBallRoomInteger(settings.whiteStripColumns, 1, 24);
    const columnsPerStrip = colorColumns + whiteColumns;
    const longitudeColumns = stripCount * columnsPerStrip;
    const rowSpacing = (Math.PI * ballRadius) / (latitudeRows + 1);
    const colSpacing = (TAU * ballRadius) / longitudeColumns;
    beadRadius = Math.min(rowSpacing, colSpacing) * 0.28 * clampBeachBallRoomNumber(settings.beadRadiusScale, 0, 6);

    const stripPhaseRad = THREE.MathUtils.degToRad(clampBeachBallRoomNumber(settings.stripPhase, 0, 360));
    const topCap = THREE.MathUtils.degToRad(clampBeachBallRoomNumber(settings.topCapAngleDeg, 0, 90));
    const bottomCap = THREE.MathUtils.degToRad(clampBeachBallRoomNumber(settings.bottomCapAngleDeg, 0, 90));
    const colorRatio = colorColumns / columnsPerStrip;
    const centerRadius = ballRadius + beadRadius * (0.35 + clampBeachBallRoomNumber(settings.beadSurfaceOffset, 0, 2));
    const colorCounts = new Map(palette.approvedColors.map((color) => [color, 0]));
    const meshesByColor = new Map();
    const writeIndices = new Map();
    let beadCount = 0;
    let beadOffset = 0;

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
      mesh.userData.visualStart = beadOffset;
      mesh.userData.baseMatrices = new Float32Array(count * 16);
      beadInstanceRanges.push({
        start: beadOffset,
        count,
        mesh,
        baseMatrices: mesh.userData.baseMatrices,
      });
      beadOffset += count;
      meshesByColor.set(color, mesh);
      writeIndices.set(color, 0);
      beadMeshes.push(mesh);
      ballGroup.add(mesh);
    }
    visualBeadCount = beadOffset;

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
        const visualIndex = (mesh.userData.visualStart || 0) + instanceIndex;
        const visualScale = visualTransition.getScaleAt(visualIndex);

        tempPosition.set(x, y, z);
        tempQuaternion.identity();
        tempScale.setScalar(beadRadius * visualScale);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        mesh.setMatrixAt(instanceIndex, tempMatrix);
        tempMatrix.toArray(mesh.userData.baseMatrices, instanceIndex * 16);
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
    const maxLinearSpeed = clampBeachBallRoomNumber(settings.maxLinearSpeed, 1, 60);
    const linearSpeed = velocity.length();
    if (linearSpeed > maxLinearSpeed) {
      velocity.multiplyScalar(maxLinearSpeed / linearSpeed);
    }

    const maxAngularSpeed = clampBeachBallRoomNumber(settings.maxAngularSpeed, 1, 60);
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
      const restitution = clampBeachBallRoomNumber(settings.restitution, 0, 2);
      const bounceBoost = clampBeachBallRoomNumber(settings.bounceBoost, 1, 5);
      const backWallBoost = axis === 'z' && normal === normalSign
        ? clampBeachBallRoomNumber(settings.backWallBounceBoost, 1, 5)
        : 1;
      const minRebound = clampBeachBallRoomNumber(settings.bounceMinVelocity, 0, 10);
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
      triggerImpact({
        id: `beach-ball-room:${axis}-wall`,
        radius: 34,
        intensity: Math.min(1, Math.max(0.58, Math.abs(component) / 3.6)),
        x: 0.5,
        minIntervalMs: axis === 'z' ? 160 : 120,
      });

      const friction = clampBeachBallRoomNumber(settings.wallFriction, 0, 1);
      const spinBoost = clampBeachBallRoomNumber(settings.collisionSpinBoost, 0, 8);
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
    idleSettleFactor = clampBeachBallRoomNumber(
      (idleSeconds - IDLE_SETTLE_DELAY_SECONDS) / Math.max(0.1, IDLE_SETTLE_FULL_SECONDS - IDLE_SETTLE_DELAY_SECONDS),
      0,
      1,
    );
    absorbedIdleContact = false;
    velocity.y -= clampBeachBallRoomNumber(settings.gravity, 0, 40) * dt;
    velocity.multiplyScalar(Math.exp(-clampBeachBallRoomNumber(settings.linearDamping, 0, 5) * dt));
    angularVelocity.multiplyScalar(Math.exp(-clampBeachBallRoomNumber(settings.angularDamping, 0, 5) * dt));
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
    if (globalThis.__ABS_ROUTE_PERF_AUDIT__ === true) {
      renderer.domElement.__absAuditFrameCount = (Number(renderer.domElement.__absAuditFrameCount) || 0) + 1;
    }
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
    const tapStrength = clampBeachBallRoomNumber(settings.tapPushStrength, 0, 20);
    const spinStrength = clampBeachBallRoomNumber(settings.pointerSpinStrength, 0, 10);
    velocity.addScaledVector(ray.direction, tapStrength * impulseScale);
    tempAngularAxis.copy(pointerState.normal).cross(ray.direction);
    angularVelocity.add(tempAngularAxis.multiplyScalar(spinStrength * impulseScale));
    capMotion();
    triggerImpact({
      id: 'beach-ball-room:tap',
      radius: 32,
      intensity: 0.72,
      x: 0.5,
      minIntervalMs: 120,
    });
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
    const speedScale = clampBeachBallRoomNumber(16 / dt, 0.45, 2.4);
    const impulseScale = latestReducedMotion ? 0.5 : 1;
    const dragStrength = clampBeachBallRoomNumber(settings.dragFlickStrength, 0, 80);
    const depthPush = clampBeachBallRoomNumber(settings.dragDepthPush, 0, 5);
    const spinStrength = clampBeachBallRoomNumber(settings.pointerSpinStrength, 0, 10);
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
    triggerRelease({
      id: 'beach-ball-room:release',
      intensity: Math.min(1, Math.max(0.62, velocity.length() / 5)),
      x: 0.5,
      radius: 34,
      minIntervalMs: 160,
    });
  }

  function updateSettings(nextSettings, nextReducedMotion, options = {}) {
    settings = sanitizeBeachBallRoomSettings(nextSettings);
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
      unregisterVisualTransition?.();
      unregisterVisualTransition = null;
      visualTransition.destroy?.();
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

export function BeachBallRoomRuntime({
  settings = BEACH_BALL_ROOM_DEFAULT_SETTINGS,
  className = 'beach-ball-room-simulation--daily-focus daily-focus-runtime',
  onLoadStateChange = null,
}) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const isDark = useRenderedThemeIsDark();
  const palette = useMemo(() => resolvePalette(isDark), [isDark]);
  const initialSettingsRef = useRef(settings);
  const previousSettingsRef = useRef(settings);
  const previousReducedMotionRef = useRef(reducedMotion);
  const onLoadStateChangeRef = useRef(onLoadStateChange);

  useEffect(() => {
    onLoadStateChangeRef.current = onLoadStateChange;
  }, [onLoadStateChange]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    let engine;
    containerRef.current.dataset.beachBallRoomLoadState = 'initializing';
    onLoadStateChangeRef.current?.('initializing');
    try {
      engine = createEngine(containerRef.current, initialSettingsRef.current, palette, reducedMotion);
      containerRef.current.dataset.beachBallRoomLoadState = 'ready';
      onLoadStateChangeRef.current?.('ready');
    } catch (error) {
      const message = error?.message || 'WebGL is unavailable.';
      containerRef.current.dataset.beachBallRoomLoadState = 'error';
      onLoadStateChangeRef.current?.('error', message);
      return undefined;
    }
    engineRef.current = engine;
    return () => {
      engineRef.current = null;
      engine.dispose();
    };
  }, [palette, reducedMotion]);

  useEffect(() => {
    const changedKeys = getBeachBallRoomChangedSettingKeys(previousSettingsRef.current, settings);
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
      className={`beach-ball-room-simulation ${className}`.trim()}
      ref={containerRef}
      data-simulation-id={BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY.id}
      data-enabled-in-rotation={String(BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY.enabledInRotation)}
      aria-label="Beach ball room simulation"
    />
  );
}
