import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  createAboutNarrativeSeeds,
  generateAboutNarrativeShape,
} from './aboutNarrativePointShapes.js';
import {
  ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS,
  resolveAboutNarrativeSwarmMotion,
} from './aboutNarrativeDefinitions.js';
import { createAboutNarrativeBufferLru } from './aboutNarrativeBufferLru.js';
import { createAboutNarrativeBustController } from './aboutNarrativeBustController.js';
import { createAboutNarrativePreparationController } from './aboutNarrativePreparationController.js';
import {
  ABOUT_NARRATIVE_CACHE_LIMITS,
  ABOUT_NARRATIVE_POINT_PROFILES,
} from './aboutNarrativeRuntimeConstants.js';
import { createAboutNarrativeRuntimeDiagnostics } from './aboutNarrativeRuntimeDiagnostics.js';
import {
  ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
} from './aboutNarrativeWorkerProtocol.js';
import { validateAboutNarrativeWorkerPublication } from './aboutNarrativeWorkerPublicationValidator.js';
import {
  ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT,
  inspectAboutNarrativeAnchorSampling,
  sampleAboutNarrativeAnchorPosition,
} from './aboutNarrativeModifierSampling.js';
import { getGlobals } from '../../legacy/modules/core/state.js';
import { createAboutNarrativeRuntimeResources } from 'virtual:about-narrative-resource-tools';
import { createAboutNarrativeRuntimeObserver } from 'virtual:about-narrative-runtime-observer';

const MATERIAL_SLOT_COUNT = 6;
const RUNTIME_DIAGNOSTICS_ENABLED = import.meta.env.DEV || __CERTIFY__;
const DISCIPLINE_LABEL_SELECTORS = Object.freeze([
  '[data-discipline-group="1"]',
  '[data-discipline-group="2"]',
  '[data-discipline-group="3"]',
  '[data-discipline-group="4"]',
  '[data-discipline-group="5"]',
  '[data-discipline-group="6"]',
]);
const FALLBACK_MATERIAL_DISTRIBUTION = Object.freeze([
  Object.freeze({ colorIndex: 0, weight: 31 }),
  Object.freeze({ colorIndex: 3, weight: 13 }),
  Object.freeze({ colorIndex: 2, weight: 16 }),
  Object.freeze({ colorIndex: 6, weight: 20 }),
  Object.freeze({ colorIndex: 7, weight: 10 }),
  Object.freeze({ colorIndex: 5, weight: 10 }),
]);

const VERTEX_SHADER = `
  attribute vec3 targetPosition;
  attribute float pointSeed;
  attribute float fromPresence;
  attribute float toPresence;
  attribute float fromPointSize;
  attribute float toPointSize;
  attribute float fromGroup;
  attribute float toGroup;
  uniform mat4 fromTransform;
  uniform mat4 toTransform;
  uniform float morphProgress;
  uniform float storyTime;
  uniform float ambientTime;
  uniform float pointSize;
  uniform float pixelRatio;
  uniform float fromDriftAmplitude;
  uniform float toDriftAmplitude;
  uniform float fromDriftSpeed;
  uniform float toDriftSpeed;
  uniform float fromDriftIrregularity;
  uniform float toDriftIrregularity;
  uniform float fromDriftIndividuality;
  uniform float toDriftIndividuality;
  uniform float fromDriftAxisSpread;
  uniform float toDriftAxisSpread;
  uniform float fromDriftStoryMix;
  uniform float toDriftStoryMix;
  uniform float fromWaveWeight;
  uniform float toWaveWeight;
  uniform float fromWaveAmplitude;
  uniform float toWaveAmplitude;
  uniform float fromWaveSpeed;
  uniform float toWaveSpeed;
  uniform vec2 fromWaveFrequency;
  uniform vec2 toWaveFrequency;
  uniform float fromGroupStrength;
  uniform float toGroupStrength;
  uniform float disciplineFocus;
  uniform float gridInfluence;
  uniform vec3 disciplineRevealA;
  uniform vec3 disciplineRevealB;
  uniform float disciplineRevealActive;
  uniform float disciplineBackgroundWeight;
  uniform float disciplineBackgroundOpacity;
  uniform float disciplineReconnectOpacity;
  uniform float disciplinePointScale;
  uniform float fromLivingColour;
  uniform float toLivingColour;
  uniform float fromBust;
  uniform float toBust;
  uniform float bustYaw;
  uniform vec3 materialColor1;
  uniform vec3 materialColor2;
  uniform vec3 materialColor3;
  uniform vec3 materialColor4;
  uniform vec3 materialColor5;
  uniform vec3 materialColor6;
  uniform vec3 disciplineColor1;
  uniform vec3 disciplineColor2;
  uniform vec3 disciplineColor3;
  uniform vec3 disciplineColor4;
  uniform vec3 disciplineColor5;
  uniform vec3 disciplineColor6;
  uniform float materialThreshold1;
  uniform float materialThreshold2;
  uniform float materialThreshold3;
  uniform float materialThreshold4;
  uniform float materialThreshold5;
  varying float pointAlpha;
  varying vec3 pointTint;

  vec3 rotateY(vec3 value, float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return vec3(
      (cosine * value.x) + (sine * value.z),
      value.y,
      (-sine * value.x) + (cosine * value.z)
    );
  }

  vec3 groupColor(float index) {
    if (index < 1.5) return disciplineColor1;
    if (index < 2.5) return disciplineColor2;
    if (index < 3.5) return disciplineColor3;
    if (index < 4.5) return disciplineColor4;
    if (index < 5.5) return disciplineColor5;
    return disciplineColor6;
  }

  float disciplineRevealForGroup(float index) {
    if (index < 1.5) return disciplineRevealA.x;
    if (index < 2.5) return disciplineRevealA.y;
    if (index < 3.5) return disciplineRevealA.z;
    if (index < 4.5) return disciplineRevealB.x;
    if (index < 5.5) return disciplineRevealB.y;
    return disciplineRevealB.z;
  }

  vec3 materialColor(float seed) {
    if (seed < materialThreshold1) return materialColor1;
    if (seed < materialThreshold2) return materialColor2;
    if (seed < materialThreshold3) return materialColor3;
    if (seed < materialThreshold4) return materialColor4;
    if (seed < materialThreshold5) return materialColor5;
    return materialColor6;
  }

  void main() {
    float morph = smoothstep(0.0, 1.0, morphProgress);
    vec3 fromPoint = mix(position, rotateY(position, bustYaw), fromBust);
    vec3 toPoint = mix(targetPosition, rotateY(targetPosition, bustYaw), toBust);
    vec3 fromWorld = (fromTransform * vec4(fromPoint, 1.0)).xyz;
    vec3 toWorld = (toTransform * vec4(toPoint, 1.0)).xyz;
    vec3 worldPoint = mix(fromWorld, toWorld, morph);

    float driftAmplitude = mix(fromDriftAmplitude, toDriftAmplitude, morph);
    float driftSpeed = mix(fromDriftSpeed, toDriftSpeed, morph);
    float driftIrregularity = mix(fromDriftIrregularity, toDriftIrregularity, morph);
    float driftIndividuality = mix(fromDriftIndividuality, toDriftIndividuality, morph);
    float driftAxisSpread = mix(fromDriftAxisSpread, toDriftAxisSpread, morph);
    float driftStoryMix = mix(fromDriftStoryMix, toDriftStoryMix, morph);
    float driftClock = mix(ambientTime, storyTime, driftStoryMix);
    float phase = pointSeed * 127.31;
    float speedVariance = mix(
      1.0,
      0.58 + (fract((pointSeed * 43.17) + 0.19) * 0.88),
      driftIndividuality
    );
    float driftTime = driftClock * driftSpeed * speedVariance;
    vec3 smoothDrift = vec3(
      sin((driftTime * 1.07) + (phase * 1.31)),
      sin((driftTime * 0.83) + (phase * 1.73)),
      cos((driftTime * 0.97) + (phase * 2.11))
    );
    vec3 erraticDrift = vec3(
      sin((driftTime * 2.43) + (phase * 0.37)),
      cos((driftTime * 2.07) + (phase * 0.61)),
      sin((driftTime * 2.81) + (phase * 0.83))
    );
    vec3 driftVector = mix(smoothDrift, erraticDrift, driftIrregularity * 0.58);
    driftVector.xz *= driftAxisSpread;
    worldPoint += driftVector * driftAmplitude;

    float waveWeight = mix(fromWaveWeight, toWaveWeight, morph);
    float waveAmplitude = mix(fromWaveAmplitude, toWaveAmplitude, morph);
    float waveSpeed = mix(fromWaveSpeed, toWaveSpeed, morph);
    vec2 waveFrequency = mix(fromWaveFrequency, toWaveFrequency, morph);
    worldPoint.y += waveWeight * waveAmplitude * sin(
      (worldPoint.x * waveFrequency.x)
      + (worldPoint.z * waveFrequency.y)
      + (ambientTime * waveSpeed)
    );

    float group = mix(fromGroup, toGroup, morph);
    float groupStrength = mix(fromGroupStrength, toGroupStrength, morph);
    float groupExists = step(0.5, group) * step(0.001, groupStrength);
    float focusActive = step(0.5, disciplineFocus);
    float focusMatch = 1.0 - step(0.45, abs(group - disciplineFocus));
    float legacyGroupWeight = groupExists * mix(1.0, mix(0.28, 1.0, focusMatch), focusActive);
    float revealedGroupWeight = groupExists * disciplineRevealForGroup(group);
    float groupWeight = mix(legacyGroupWeight, revealedGroupWeight, disciplineRevealActive);
    worldPoint.z += gridInfluence * step(0.001, groupStrength) * 0.22 * sin(
      (worldPoint.x * 0.82) + (worldPoint.y * 0.54) - (ambientTime * 0.45)
    );
    float colourWeight = mix(fromLivingColour, toLivingColour, morph);
    float livingBand = 0.5 + (0.5 * sin(
      (worldPoint.x * 0.72) + (worldPoint.z * 0.38) + (ambientTime * 0.18)
    ));
    float materialSeed = fract((pointSeed * 43.713) + 0.271);
    vec3 baseColor = materialColor(materialSeed);
    vec3 livingColor = materialColor(fract((materialSeed * 3.17) + 0.37));
    pointTint = mix(
      baseColor,
      livingColor,
      colourWeight * smoothstep(0.72, 0.98, livingBand) * 0.48
    );
    pointTint = mix(pointTint, groupColor(group), groupWeight);

    vec4 viewPoint = modelViewMatrix * vec4(worldPoint, 1.0);
    gl_Position = projectionMatrix * viewPoint;
    float presence = mix(fromPresence, toPresence, morph);
    float reconnect = clamp(gridInfluence, 0.0, 1.0);
    float backgroundVisibility = mix(
      1.0,
      mix(disciplineBackgroundOpacity, disciplineReconnectOpacity, reconnect),
      disciplineBackgroundWeight
    );
    float revealVisibility = mix(backgroundVisibility, 1.0, revealedGroupWeight);
    presence *= mix(1.0, revealVisibility, disciplineRevealActive);
    float sizeWeight = mix(fromPointSize, toPointSize, morph);
    float groupScale = mix(groupStrength, max(0.0, disciplinePointScale - 1.0), disciplineRevealActive);
    float emphasis = 1.0 + (groupWeight * groupScale) + (waveWeight * 0.18);
    gl_PointSize = pointSize * sizeWeight * emphasis * pixelRatio
      * clamp(5.0 / max(1.0, -viewPoint.z), 0.56, 3.2);
    pointAlpha = presence;
  }
`;

const FRAGMENT_SHADER = `
  uniform float fieldOpacity;
  varying float pointAlpha;
  varying vec3 pointTint;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float radius = length(center);
    if (radius > 0.5 || pointAlpha <= 0.001) discard;
    float edge = 1.0 - smoothstep(0.44, 0.5, radius);
    gl_FragColor = vec4(pointTint, fieldOpacity * pointAlpha * edge);
  }
`;

function modifier(world, id) {
  return world?.modifiers?.find((item) => item.id === id && item.enabled !== false)?.parameters || null;
}

function readColorToken(styles, token, fallback) {
  return styles.getPropertyValue(token).trim() || fallback;
}

function getMaterialDistribution() {
  const configured = getGlobals()?.colorDistribution;
  const valid = Array.isArray(configured)
    ? configured.filter((row) => Number(row?.weight) > 0).slice(0, MATERIAL_SLOT_COUNT)
    : [];
  if (valid.length !== MATERIAL_SLOT_COUNT) return FALLBACK_MATERIAL_DISTRIBUTION;
  return valid;
}

function syncMaterialPalette(uniforms, styles) {
  const distribution = getMaterialDistribution();
  const weights = distribution.map((row) => Number(row.weight));
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cumulative = 0;
  distribution.forEach((row, index) => {
    const colorIndex = Math.max(0, Math.min(7, Math.floor(Number(row.colorIndex) || 0)));
    const fallback = FALLBACK_MATERIAL_DISTRIBUTION[index];
    const fallbackIndex = Math.max(0, Math.min(7, Number(fallback.colorIndex) || 0));
    const color = readColorToken(
      styles,
      `--ball-${colorIndex + 1}`,
      readColorToken(styles, `--ball-${fallbackIndex + 1}`, '#ffffff'),
    );
    uniforms[`materialColor${index + 1}`].value.setStyle(color);
    cumulative += weights[index] / total;
    if (index < MATERIAL_SLOT_COUNT - 1) {
      uniforms[`materialThreshold${index + 1}`].value = cumulative;
    }
  });
  const disciplineFallbacks = ['#b5b7b6', '#00695c', '#ffffff', '#0d5cb6', '#ffa000', '#d7ff2f'];
  ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS.forEach((token, index) => {
    uniforms[`disciplineColor${index + 1}`].value.setStyle(
      readColorToken(styles, token, disciplineFallbacks[index]),
    );
  });
}

function createEmptyAttribute(count, value = 0) {
  return new Float32Array(count).fill(value);
}

function shapeCacheKey(world, quality) {
  return JSON.stringify([
    world?.shapeId,
    world?.seed,
    quality,
    world?.shapeParameters || {},
  ]);
}

function writeWorldTransform(target, world, globals, compact, scratch, storyOffset = null) {
  if (!world) return target.identity();
  const transform = world.transform || {};
  const position = transform.position || [0, 0, 0];
  const rotation = transform.rotation || [0, 0, 0];
  const baseScale = Number(transform.scale ?? 1);
  const scale = compact && Number.isFinite(transform.mobileScale)
    ? Number(transform.mobileScale)
    : baseScale;
  const entryCameraZ = globals.camera.startZ - (world.startWU * globals.camera.cadence);
  scratch.position.set(
    position[0],
    position[1] + (compact ? Number(transform.mobileYOffset || 0) : 0),
    entryCameraZ - Number(world.entryDistanceWU || 0) + position[2],
  );
  if (storyOffset) scratch.position.add(storyOffset);
  scratch.euler.set(
    rotation[0],
    rotation[1],
    rotation[2],
    'YXZ',
  );
  scratch.quaternion.setFromEuler(scratch.euler);
  scratch.scale.set(scale, scale, scale);
  return target.compose(scratch.position, scratch.quaternion, scratch.scale);
}

function createTransformScratch() {
  return {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    euler: new THREE.Euler(0, 0, 0, 'YXZ'),
  };
}

function smoothRange(value, from, to) {
  if (to <= from) return value >= to ? 1 : 0;
  const progress = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return progress * progress * (3 - (2 * progress));
}

function captureDisciplinePositions(output, target, indices = null) {
  target.fill(Number.NaN);
  indices?.fill(-1);
  const groups = output.attributes?.disciplineGroup;
  if (!groups) return;
  for (let index = 0; index < groups.length; index += 1) {
    const group = Math.round(groups[index]);
    if (group < 1 || group > 6) continue;
    const sourceOffset = index * 3;
    const targetOffset = (group - 1) * 3;
    target[targetOffset] = output.positions[sourceOffset];
    target[targetOffset + 1] = output.positions[sourceOffset + 1];
    target[targetOffset + 2] = output.positions[sourceOffset + 2];
    if (indices) indices[group - 1] = index;
  }
}

function createPointFieldAdapter({
  canvas,
  root,
  interaction,
  disciplineOverlayRef,
  runtimeRef,
}) {
  const compact = window.matchMedia('(max-width: 600px), (pointer: coarse)').matches;
  const quality = compact ? 'mobile' : 'desktop';
  const pointProfile = ABOUT_NARRATIVE_POINT_PROFILES[quality];
  const pointCount = pointProfile.pointCount;
  const diagnostics = createAboutNarrativeRuntimeDiagnostics({
    initial: { state: 'idle', generation: 0, attemptCount: 0 },
  });
  const rendererAttributes = {
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
  };
  const runtimeResources = createAboutNarrativeRuntimeResources({ canvas, rendererAttributes });
  const {
    context: instrumentedContext,
    resourceLedger,
    webglTracker,
  } = runtimeResources;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    ...rendererAttributes,
    ...(instrumentedContext ? { context: instrumentedContext } : {}),
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 80);
  const geometry = new THREE.BufferGeometry();
  const seeds = createAboutNarrativeSeeds(pointCount, 0x1e35a7bd);
  const emptyPositions = new Float32Array(pointCount * 3);
  const emptyPresence = createEmptyAttribute(pointCount, 1);
  const emptySize = createEmptyAttribute(pointCount, 1);
  const emptyGroup = createEmptyAttribute(pointCount);
  const uniforms = {
    fromTransform: { value: new THREE.Matrix4() },
    toTransform: { value: new THREE.Matrix4() },
    morphProgress: { value: 0 },
    storyTime: { value: 0 },
    ambientTime: { value: 0 },
    pointSize: { value: 5.4 },
    pixelRatio: { value: 1 },
    fromDriftAmplitude: { value: 0 },
    toDriftAmplitude: { value: 0 },
    fromDriftSpeed: { value: 0 },
    toDriftSpeed: { value: 0 },
    fromDriftIrregularity: { value: 0 },
    toDriftIrregularity: { value: 0 },
    fromDriftIndividuality: { value: 0 },
    toDriftIndividuality: { value: 0 },
    fromDriftAxisSpread: { value: 0 },
    toDriftAxisSpread: { value: 0 },
    fromDriftStoryMix: { value: 0 },
    toDriftStoryMix: { value: 0 },
    fromWaveWeight: { value: 0 },
    toWaveWeight: { value: 0 },
    fromWaveAmplitude: { value: 0 },
    toWaveAmplitude: { value: 0 },
    fromWaveSpeed: { value: 0 },
    toWaveSpeed: { value: 0 },
    fromWaveFrequency: { value: new THREE.Vector2(1, 1) },
    toWaveFrequency: { value: new THREE.Vector2(1, 1) },
    fromGroupStrength: { value: 0 },
    toGroupStrength: { value: 0 },
    disciplineFocus: { value: 0 },
    gridInfluence: { value: 0 },
    disciplineRevealA: { value: new THREE.Vector3() },
    disciplineRevealB: { value: new THREE.Vector3() },
    disciplineRevealActive: { value: 0 },
    disciplineBackgroundWeight: { value: 0 },
    disciplineBackgroundOpacity: { value: 0.06 },
    disciplineReconnectOpacity: { value: 0.24 },
    disciplinePointScale: { value: 3.6 },
    fromLivingColour: { value: 0 },
    toLivingColour: { value: 0 },
    fromBust: { value: 0 },
    toBust: { value: 0 },
    bustYaw: { value: 0 },
    materialColor1: { value: new THREE.Color('#b5b7b6') },
    materialColor2: { value: new THREE.Color('#00695c') },
    materialColor3: { value: new THREE.Color('#ffffff') },
    materialColor4: { value: new THREE.Color('#0d5cb6') },
    materialColor5: { value: new THREE.Color('#ffa000') },
    materialColor6: { value: new THREE.Color('#d7ff2f') },
    disciplineColor1: { value: new THREE.Color('#b5b7b6') },
    disciplineColor2: { value: new THREE.Color('#00695c') },
    disciplineColor3: { value: new THREE.Color('#ffffff') },
    disciplineColor4: { value: new THREE.Color('#0d5cb6') },
    disciplineColor5: { value: new THREE.Color('#ffa000') },
    disciplineColor6: { value: new THREE.Color('#d7ff2f') },
    materialThreshold1: { value: 0.31 },
    materialThreshold2: { value: 0.44 },
    materialThreshold3: { value: 0.60 },
    materialThreshold4: { value: 0.80 },
    materialThreshold5: { value: 0.90 },
    fieldOpacity: { value: 0.96 },
  };
  const modifierUniformTargets = Object.freeze({
    from: Object.freeze({
      driftAmplitude: uniforms.fromDriftAmplitude,
      driftSpeed: uniforms.fromDriftSpeed,
      driftIrregularity: uniforms.fromDriftIrregularity,
      driftIndividuality: uniforms.fromDriftIndividuality,
      driftAxisSpread: uniforms.fromDriftAxisSpread,
      driftStoryMix: uniforms.fromDriftStoryMix,
      waveWeight: uniforms.fromWaveWeight,
      waveAmplitude: uniforms.fromWaveAmplitude,
      waveSpeed: uniforms.fromWaveSpeed,
      waveFrequency: uniforms.fromWaveFrequency,
      groupStrength: uniforms.fromGroupStrength,
      livingColour: uniforms.fromLivingColour,
    }),
    to: Object.freeze({
      driftAmplitude: uniforms.toDriftAmplitude,
      driftSpeed: uniforms.toDriftSpeed,
      driftIrregularity: uniforms.toDriftIrregularity,
      driftIndividuality: uniforms.toDriftIndividuality,
      driftAxisSpread: uniforms.toDriftAxisSpread,
      driftStoryMix: uniforms.toDriftStoryMix,
      waveWeight: uniforms.toWaveWeight,
      waveAmplitude: uniforms.toWaveAmplitude,
      waveSpeed: uniforms.toWaveSpeed,
      waveFrequency: uniforms.toWaveFrequency,
      groupStrength: uniforms.toGroupStrength,
      livingColour: uniforms.toLivingColour,
    }),
  });
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: true,
    blending: THREE.NormalBlending,
  });
  const fixedAttributes = Object.freeze({
    position: new THREE.BufferAttribute(emptyPositions, 3).setUsage(THREE.DynamicDrawUsage),
    targetPosition: new THREE.BufferAttribute(emptyPositions.slice(), 3).setUsage(THREE.DynamicDrawUsage),
    pointSeed: new THREE.BufferAttribute(seeds, 1),
    fromPresence: new THREE.BufferAttribute(emptyPresence, 1).setUsage(THREE.DynamicDrawUsage),
    toPresence: new THREE.BufferAttribute(emptyPresence.slice(), 1).setUsage(THREE.DynamicDrawUsage),
    fromPointSize: new THREE.BufferAttribute(emptySize, 1).setUsage(THREE.DynamicDrawUsage),
    toPointSize: new THREE.BufferAttribute(emptySize.slice(), 1).setUsage(THREE.DynamicDrawUsage),
    fromGroup: new THREE.BufferAttribute(emptyGroup.slice(), 1).setUsage(THREE.DynamicDrawUsage),
    toGroup: new THREE.BufferAttribute(emptyGroup.slice(), 1).setUsage(THREE.DynamicDrawUsage),
  });
  Object.entries(fixedAttributes).forEach(([name, attribute]) => geometry.setAttribute(name, attribute));
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  resourceLedger?.retain('fixed-attributes', fixedAttributes);
  if (resourceLedger) diagnostics.recordLifecycle('resource-ledger-ready');
  const recordCacheEvent = () => {};
  const shapeCache = createAboutNarrativeBufferLru({
    name: 'about-shapes',
    ...ABOUT_NARRATIVE_CACHE_LIMITS.shape,
    onEvent: recordCacheEvent,
  });
  const sequenceCache = createAboutNarrativeBufferLru({
    name: 'about-sequences',
    ...ABOUT_NARRATIVE_CACHE_LIMITS.sequence,
    onEvent: recordCacheEvent,
  });
  const runtimeObserver = createAboutNarrativeRuntimeObserver({
    root,
    diagnostics,
    renderer,
    scene,
    camera,
    geometry,
    fixedAttributes,
    pointCount,
    shapeCache,
    sequenceCache,
    resourceLedger,
    webglTracker,
  });
  let installedPair = null;
  let readySequence = null;
  let activePreparation = null;
  let lastPreparationRequest = null;
  let bootstrapController = null;
  let bootstrapRequestId = 0;
  let correspondenceWorker = null;
  let sequenceState = 'idle';
  let disposed = false;
  let contextAvailable = true;
  let width = 1;
  let height = 1;
  let viewportOffsetX = 0;
  let viewportOffsetY = 0;
  let latestFrame = null;
  const bustController = createAboutNarrativeBustController();
  const bustSampleInput = {
    active: false,
    transitionProgress: 0,
    deltaSeconds: 0,
    speed: 0,
    resumeDelay: 0,
    liveAmbient: false,
    deterministicScrub: true,
    reducedMotion: false,
    hidden: false,
  };
  let bustYaw = 0;
  let lastBustAmbientTime = 0;
  let dragging = false;
  let dragStart = null;
  const director = { active: false, yaw: 0, pitch: 0, distance: 0 };
  const modifierSlotsCache = new WeakMap();
  const directorTarget = new THREE.Vector3();
  const directorOffset = new THREE.Vector3();
  const directorEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const fromTransformScratch = createTransformScratch();
  const toTransformScratch = createTransformScratch();
  const correspondenceFromTransform = new THREE.Matrix4();
  const correspondenceToTransform = new THREE.Matrix4();
  const correspondenceFromScratch = createTransformScratch();
  const correspondenceToScratch = createTransformScratch();
  const disciplinePointScratch = new THREE.Vector3();
  const fromStoryOffset = new THREE.Vector3();
  const toStoryOffset = new THREE.Vector3();
  const cameraUpScratch = new THREE.Vector3();
  const disciplineWeights = new Float32Array(6);
  const fromDisciplinePositions = new Float32Array(18).fill(Number.NaN);
  const toDisciplinePositions = new Float32Array(18).fill(Number.NaN);
  const fromDisciplineIndices = new Int32Array(6).fill(-1);
  const toDisciplineIndices = new Int32Array(6).fill(-1);
  const anchorSampleTarget = { x: 0, y: 0, z: 0 };
  const anchorFromWorldScratch = { x: 0, y: 0, z: 0 };
  const anchorToWorldScratch = { x: 0, y: 0, z: 0 };
  const anchorFromPosition = { x: 0, y: 0, z: 0 };
  const anchorToPosition = { x: 0, y: 0, z: 0 };
  const anchorSampleInput = {
    fromPosition: anchorFromPosition,
    toPosition: anchorToPosition,
    fromTransform: null,
    toTransform: null,
    fromWorldScratch: anchorFromWorldScratch,
    toWorldScratch: anchorToWorldScratch,
    fromDrift: {},
    toDrift: {},
    fromWave: {},
    toWave: {},
  };
  const anchorCapability = { capability: ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT, unsupportedCount: 0, unsupported: [] };
  const anchorCapabilityTarget = { capability: ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT, unsupportedCount: 0, unsupported: [] };
  let anchorSamplingExact = true;
  let lastAnchorFromWorld = null;
  let lastAnchorToWorld = null;
  const disciplineLabels = new Array(6).fill(null);
  const disciplineLabelReveal = new Float64Array(6).fill(Number.NaN);
  const disciplineLabelX = new Float64Array(6).fill(Number.NaN);
  const disciplineLabelY = new Float64Array(6).fill(Number.NaN);
  const disciplineLabelPositionUnit = new Uint8Array(6);
  let cachedDisciplineOverlay = null;
  let cachedDisciplineChildCount = -1;
  let lastDisciplineAriaHidden = '';
  let lastDisciplineVisibleCount = Number.NaN;
  let lastDisciplineLabelCount = Number.NaN;
  let lastGridBackground = Number.NaN;
  let lastDisciplineRise = Number.NaN;
  let lastBustShaderYaw = Number.NaN;
  let lastGroupFocus = Number.NaN;
  let lastGridInfluence = Number.NaN;
  let lastInteractionEnabled = null;
  let lastWorldStage = '';
  let lastCameraCadence = '';
  let lastCameraForward = Number.NaN;
  let lastCameraRoll = Number.NaN;
  let lastCameraFov = Number.NaN;
  let lastBustStyleYaw = Number.NaN;
  const getModifierSlots = (world, globals) => {
    if (!world) return null;
    const cached = modifierSlotsCache.get(world);
    if (cached) return cached;
    const swarm = modifier(world, 'swarm-life-v1');
    runtimeObserver.hotFrameOwnedAllocation();
    const slots = {
      swarm: swarm ? resolveAboutNarrativeSwarmMotion(swarm, globals.swarmTurbulence) : null,
      drift: modifier(world, 'ambient-drift-v1'),
      wave: modifier(world, 'living-wave-v1'),
      group: modifier(world, 'group-emphasis-v1'),
      colour: modifier(world, 'living-colour-v1'),
      bust: modifier(world, 'bust-yaw-v1'),
    };
    modifierSlotsCache.set(world, slots);
    return slots;
  };

  const syncDisciplineLabels = (overlay) => {
    const childCount = overlay?.childElementCount ?? -1;
    if (overlay === cachedDisciplineOverlay && childCount === cachedDisciplineChildCount) return;
    cachedDisciplineOverlay = overlay || null;
    cachedDisciplineChildCount = childCount;
    lastDisciplineAriaHidden = '';
    runtimeObserver.hotFrameOwnedAllocation();
    for (let index = 0; index < disciplineLabels.length; index += 1) {
      disciplineLabels[index] = overlay?.querySelector(DISCIPLINE_LABEL_SELECTORS[index]) || null;
      if (overlay) runtimeObserver.hotFrameDomQuery();
      disciplineLabelReveal[index] = Number.NaN;
      disciplineLabelX[index] = Number.NaN;
      disciplineLabelY[index] = Number.NaN;
      disciplineLabelPositionUnit[index] = 0;
    }
  };

  const writeDisciplineRevealStyles = (index, value) => {
    if (disciplineLabelReveal[index] === value) return;
    const label = disciplineLabels[index];
    disciplineLabelReveal[index] = value;
    if (!label) return;
    label.style.setProperty('--discipline-reveal', value.toFixed(4));
    label.style.setProperty('--discipline-blur', `${((1 - value) * 4.5).toFixed(2)}px`);
    label.style.setProperty('--discipline-shift', `${((1 - value) * 8).toFixed(2)}px`);
    runtimeObserver.hotFrameDomWrite(3);
  };

  const writeDisciplinePosition = (index, x, y, unit) => {
    if (
      disciplineLabelPositionUnit[index] === unit
      && disciplineLabelX[index] === x
      && disciplineLabelY[index] === y
    ) return;
    const label = disciplineLabels[index];
    disciplineLabelPositionUnit[index] = unit;
    disciplineLabelX[index] = x;
    disciplineLabelY[index] = y;
    if (!label) return;
    if (unit === 1) {
      label.style.setProperty('--discipline-x', `${x}px`);
      label.style.setProperty('--discipline-y', `${y}px`);
    } else {
      label.style.setProperty('--discipline-x', `${x}%`);
      label.style.setProperty('--discipline-y', `${y}%`);
    }
    runtimeObserver.hotFrameDomWrite(2);
  };

  const updateTheme = () => {
    const styles = getComputedStyle(root);
    syncMaterialPalette(uniforms, styles);
  };

  const resize = () => {
    const rootRect = root.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    width = Math.max(1, canvasRect.width);
    height = Math.max(1, canvasRect.height);
    viewportOffsetX = canvasRect.left - rootRect.left;
    viewportOffsetY = canvasRect.top - rootRect.top;
    const ratio = Math.min(window.devicePixelRatio || 1, pointProfile.maximumPixelRatio);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    uniforms.pixelRatio.value = ratio;
  };

  const getShape = async (world, signal) => {
    const key = shapeCacheKey(world, quality);
    const cached = shapeCache.get(key);
    if (cached) return cached;
    const worldSeeds = createAboutNarrativeSeeds(pointCount, world.seed);
    const promise = generateAboutNarrativeShape({
      shapeId: world.shapeId,
      pointCount,
      seeds: worldSeeds,
      quality,
      parameters: world.shapeParameters,
      signal,
    });
    return shapeCache.trackPromise(key, promise, {
      owner: 'shape-cache',
      pinOwner: 'bootstrap-pending',
      dispose: (value) => resourceLedger?.release('shape-cache', value),
    }).then((output) => {
      resourceLedger?.retain('shape-cache', output);
      return output;
    });
  };

  const assertInstallOutput = (output, label) => {
    const expectedPositionLength = pointCount * 3;
    const group = output?.attributes?.disciplineGroup;
    if (!(output?.positions instanceof Float32Array) || output.positions.length !== expectedPositionLength
      || !(output?.presence instanceof Float32Array) || output.presence.length !== pointCount
      || !(output?.size instanceof Float32Array) || output.size.length !== pointCount
      || (group && (!(group instanceof Float32Array) || group.length !== pointCount))) {
      throw new Error(`${label} has invalid fixed point buffers.`);
    }
    const arrays = [output.positions, output.presence, output.size, ...(group ? [group] : [])];
    arrays.forEach((array) => {
      for (let index = 0; index < array.length; index += 1) {
        if (!Number.isFinite(array[index])) throw new Error(`${label} contains a non-finite point value.`);
      }
    });
  };

  const installPreparedPair = (pair) => {
    if (disposed || !pair || installedPair?.key === pair.key) return;
    const installStartedAt = performance.now();
    if (!pair.validated) {
      assertInstallOutput(pair.fromOutput, 'Source Shape');
      assertInstallOutput(pair.toOutput, 'Target Shape');
    }
    const fromGroup = pair.fromOutput.attributes.disciplineGroup || emptyGroup;
    const toGroup = pair.toOutput.attributes.disciplineGroup || emptyGroup;
    fixedAttributes.position.array.set(pair.fromOutput.positions);
    fixedAttributes.targetPosition.array.set(pair.toOutput.positions);
    fixedAttributes.fromPresence.array.set(pair.fromOutput.presence);
    fixedAttributes.toPresence.array.set(pair.toOutput.presence);
    fixedAttributes.fromPointSize.array.set(pair.fromOutput.size);
    fixedAttributes.toPointSize.array.set(pair.toOutput.size);
    fixedAttributes.fromGroup.array.set(fromGroup);
    fixedAttributes.toGroup.array.set(toGroup);
    Object.entries(fixedAttributes).forEach(([name, attribute]) => {
      if (name !== 'pointSeed') attribute.needsUpdate = true;
    });
    captureDisciplinePositions(pair.fromOutput, fromDisciplinePositions, fromDisciplineIndices);
    captureDisciplinePositions(pair.toOutput, toDisciplinePositions, toDisciplineIndices);
    resourceLedger?.releaseOwner('installed-pair');
    resourceLedger?.retain('installed-pair', [pair.fromOutput, pair.toOutput]);
    installedPair = { ...pair, progress: 0 };
    root.dataset.pointAsset = pair.toOutput.fallbackReason ? 'procedural-fallback' : pair.toWorld.shapeId;
    if (sequenceState !== 'loading') root.dataset.worldPrepare = 'ready';
    root.dataset.worldFrom = pair.fromWorld.shapeId;
    root.dataset.worldTo = pair.toWorld.shapeId;
    root.dataset.worldCorrespondence = pair.installedStrategy;
    root.dataset.worldCorrespondenceRequested = pair.requestedStrategy;
    root.dataset.worldCorrespondenceImprovement = Number(pair.metrics.improvement || 0).toFixed(4);
    root.dataset.worldCorrespondenceP95 = Number(pair.metrics.p95Distance || 0).toFixed(4);
    root.dataset.worldCorrespondenceMax = Number(pair.metrics.maxDistance || 0).toFixed(4);
    root.dataset.worldCorrespondenceFallback = pair.fallbackReason || '';
    root.dataset.worldCorrespondencePair = pair.key;
    runtimeObserver.pairInstalled(performance.now() - installStartedAt);
    diagnostics.recordLifecycle('pair-installed', {
      installedPairId: installedPair.key,
      installedWorldId: installedPair.toWorld.sectionId,
      requestedStrategy: installedPair.requestedStrategy,
      installedStrategy: installedPair.installedStrategy,
      fallbackReason: installedPair.fallbackReason,
    });
  };

  const createPreparedSequence = (key, sequence, outputs, workerPairs, timings, startedAt) => {
    const pairs = new Map();
    workerPairs.forEach((workerPair, index) => {
      const toOutput = outputs[index].output;
      const fromOutput = outputs[Math.max(0, index - 1)].output;
      const fromWorld = sequence[Math.max(0, index - 1)];
      const toWorld = sequence[index];
      pairs.set(toWorld.sectionId, {
        key: `${key}:${toWorld.sectionId}`,
        fromWorld,
        toWorld,
        fromOutput,
        toOutput,
        requestedStrategy: workerPair.requestedStrategy,
        installedStrategy: workerPair.installedStrategy,
        fallbackReason: workerPair.fallbackReason,
        metrics: workerPair.metrics,
        validated: true,
      });
    });
    return {
      key,
      pairs,
      worldIds: sequence.map((world) => world.sectionId),
      preparationDurationMs: performance.now() - startedAt,
      mainThreadApplicationMs: 0,
      generationDurationMs: Number(timings?.generationMs || 0),
      correspondenceDurationMs: Number(timings?.correspondenceMs || 0),
    };
  };

  const prepareWithWorker = ({ sequenceKey, input, generation, signal }) => new Promise((resolve, reject) => {
    const { entries } = input;
    let worker;
    try {
      worker = new Worker(
        new URL('./aboutNarrativeCorrespondence.worker.js', import.meta.url),
        { type: 'module', name: 'about-narrative-correspondence' },
      );
    } catch (error) {
      error.category = 'workerConstruction';
      reject(error);
      return;
    }
    runtimeObserver.workerStarted();
    correspondenceWorker = worker;
    let released = false;
    const publicationController = new AbortController();
    const timeout = window.setTimeout(() => {
      runtimeObserver.workerTimedOut();
      const error = new Error('The correspondence Worker timed out.');
      error.category = 'workerTimeout';
      release();
      reject(error);
    }, 15_000);
    const release = ({ abortPublication = true } = {}) => {
      if (released) return;
      released = true;
      if (abortPublication) publicationController.abort();
      window.clearTimeout(timeout);
      if (correspondenceWorker === worker) correspondenceWorker = null;
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      runtimeObserver.workerTerminated();
      signal.removeEventListener('abort', handleAbort);
    };
    const handleAbort = () => {
      release();
      reject(new DOMException('Preparation was aborted.', 'AbortError'));
    };
    signal.addEventListener('abort', handleAbort, { once: true });
    worker.onmessage = async (event) => {
      const messageStartedAt = performance.now();
      let maximumPublicationTaskMs = 0;
      let ownsPendingPublication = false;
      const releasePendingPublication = () => {
        if (!ownsPendingPublication) return;
        ownsPendingPublication = false;
        resourceLedger?.releaseOwner('pending-publication');
      };
      try {
        if (resourceLedger) {
          resourceLedger.retain('pending-publication', event.data);
          ownsPendingPublication = true;
        }
        const publication = await validateAboutNarrativeWorkerPublication(event.data, {
          generation, sequenceKey, pointCount, entries,
        }, {
          signal: publicationController.signal,
          onChunk: (chunk) => {
            maximumPublicationTaskMs = Math.max(
              maximumPublicationTaskMs,
              chunk.chunk === 1 ? performance.now() - messageStartedAt : chunk.durationMs,
            );
          },
        });
        if (disposed || signal.aborted || correspondenceWorker !== worker
          || activePreparation?.sequenceKey !== sequenceKey) {
          throw new DOMException('Preparation was superseded during validation.', 'AbortError');
        }
        const { response } = publication;
        if (response.status === 'failure') {
          const error = new Error(response.error.message);
          error.category = response.error.category;
          error.code = response.error.code;
          throw error;
        }
        release({ abortPublication: false });
        const publicationValidationTotalMs = performance.now() - messageStartedAt;
        const messageDurationMs = Math.max(maximumPublicationTaskMs, publication.chunks ? 0 : publicationValidationTotalMs);
        runtimeObserver.workerMessage({
          messageDurationMs,
          publicationValidationTotalMs,
          publicationValidationDurationMs: publication.durationMs,
          publicationValuesScanned: publication.valuesScanned,
          publicationValidationChunks: publication.chunks,
        });
        resolve(Object.freeze({ response, releasePendingPublication }));
      } catch (error) {
        releasePendingPublication();
        release();
        reject(error);
      }
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || 'The correspondence Worker crashed.');
      error.category = 'workerCrash';
      release();
      reject(error);
    };
    worker.onmessageerror = () => {
      const error = new Error('The correspondence Worker returned an unreadable message.');
      error.category = 'workerProtocol';
      release();
      reject(error);
    };
    try {
      worker.postMessage({
        protocolVersion: ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
        generation,
        sequenceKey,
        pointCount,
        quality,
        entries,
      });
    } catch (error) {
      error.category = 'transfer';
      release();
      reject(error);
    }
  });

  const preparationController = createAboutNarrativePreparationController({
    diagnostics,
    retainReadyCandidate: false,
    startPreparation: prepareWithWorker,
    validateCandidate: (candidate) => candidate,
    publishReady: (candidate, identity) => {
      try {
        const request = activePreparation;
        if (!request || request.sequenceKey !== identity.sequenceKey) throw new Error('Preparation intent became stale.');
        const response = candidate.response;
        const prepared = createPreparedSequence(
          request.sequenceKey,
          request.sequence,
          response.outputs,
          response.pairs,
          response.timings,
          request.startedAt,
        );
        if (readySequence?.key && readySequence.key !== request.sequenceKey) {
          sequenceCache.unpin(readySequence.key, 'ready-sequence');
        }
        resourceLedger?.retain('sequence-cache', prepared);
        sequenceCache.set(request.sequenceKey, prepared, {
          owner: 'sequence-cache',
          pins: ['ready-sequence'],
          active: true,
          dispose: (value) => resourceLedger?.release('sequence-cache', value),
        });
        readySequence = prepared;
        sequenceState = 'ready';
        root.dataset.worldPrepare = 'ready';
        root.dataset.worldShapeGenerationMs = prepared.generationDurationMs.toFixed(2);
        root.dataset.worldCorrespondenceWorkerMs = prepared.correspondenceDurationMs.toFixed(2);
        root.dataset.worldCorrespondencePrepareMs = prepared.preparationDurationMs.toFixed(2);
        root.dataset.worldCorrespondenceApplyMs = '0.00';
        delete root.dataset.worldError;
        diagnostics.recordMetrics({
          preparationDurationMs: prepared.preparationDurationMs,
          workerDurationMs: prepared.correspondenceDurationMs,
        });
      } finally {
        candidate.releasePendingPublication();
      }
    },
    classifyFailure: (error) => ({ category: error?.category || (error?.name === 'AbortError' ? 'aborted' : 'validation') }),
  });
  let warnedFailureRecordId = 0;
  const unsubscribePreparation = preparationController.subscribe(() => {
    const snapshot = preparationController.getSnapshot();
    sequenceState = snapshot.state === 'preparing' ? 'loading' : snapshot.state;
    root.dataset.worldPrepare = sequenceState;
    if (snapshot.lastFailure) {
      root.dataset.worldError = snapshot.lastFailure.message;
      const failureRecord = [...snapshot.records].reverse().find((record) => record.type === 'preparation-failed');
      if (failureRecord && failureRecord.id !== warnedFailureRecordId) {
        warnedFailureRecordId = failureRecord.id;
        console.warn('[About narrative] Sequence preparation failed; retaining the last valid field.', snapshot.lastFailure);
      }
    }
  });

  const bootstrapTarget = (sequenceKey, targetWorld) => {
    if (installedPair || !targetWorld) return;
    bootstrapRequestId += 1;
    const requestId = bootstrapRequestId;
    bootstrapController?.abort();
    bootstrapController = new AbortController();
    const startedAt = performance.now();
    const targetPromise = getShape(targetWorld, bootstrapController.signal);
    root.dataset.worldBootstrapGenerationMs = (performance.now() - startedAt).toFixed(2);
    targetPromise.then((output) => {
      if (disposed || installedPair || requestId !== bootstrapRequestId
        || activePreparation?.sequenceKey !== sequenceKey) return;
      installPreparedPair({
        key: `${sequenceKey}:${targetWorld.sectionId}:bootstrap`,
        fromWorld: targetWorld,
        toWorld: targetWorld,
        fromOutput: output,
        toOutput: output,
        requestedStrategy: 'index-v1',
        installedStrategy: 'index-v1',
        fallbackReason: output.fallbackReason || '',
        metrics: { improvement: 0, p95Distance: 0, maxDistance: 0, weightedRmsDistance: 0 },
        validated: true,
      });
      root.dataset.worldBootstrapReadyMs = (performance.now() - startedAt).toFixed(2);
    }).catch((error) => {
      if (error?.name !== 'AbortError') root.dataset.worldError = error?.message || String(error);
    });
  };

  const preparePlan = ({ sequenceKey, descriptor, targetWorldId = '' } = {}) => {
    lastPreparationRequest = { sequenceKey, descriptor, targetWorldId };
    const sequence = descriptor?.runtimeWorlds || descriptor?.worlds;
    const globals = descriptor?.globals || { camera: descriptor?.camera };
    if (!sequenceKey || !Array.isArray(sequence) || !sequence.length || !globals?.camera) return false;
    if (readySequence?.key === sequenceKey) return true;
    const cached = sequenceCache.get(sequenceKey);
    if (cached) {
      if (readySequence?.key && readySequence.key !== sequenceKey) {
        sequenceCache.unpin(readySequence.key, 'ready-sequence');
      }
      readySequence = cached;
      sequenceCache.pin(sequenceKey, 'ready-sequence');
      sequenceCache.activate(sequenceKey);
      sequenceState = 'ready';
      root.dataset.worldPrepare = 'ready';
      return true;
    }
    if (activePreparation?.sequenceKey === sequenceKey && sequenceState === 'loading') {
      const nextTarget = sequence.find((world) => world.sectionId === targetWorldId) || sequence[0];
      bootstrapTarget(sequenceKey, nextTarget);
      return true;
    }
    const entries = sequence.map((world, index) => ({
      id: world.sectionId,
      mode: index === 0
        ? 'index-v1'
        : world.transitionIn?.correspondence || world.correspondence || 'index-v1',
      matrix: writeWorldTransform(
        index === 0 ? correspondenceFromTransform : correspondenceToTransform,
        world,
        globals,
        compact,
        index === 0 ? correspondenceFromScratch : correspondenceToScratch,
      ).elements.slice(),
      shapeId: world.shapeId,
      seed: world.seed,
      parameters: world.shapeParameters || {},
    }));
    const previousPreparation = activePreparation;
    const nextPreparation = {
      sequenceKey,
      inputFingerprint: descriptor.inputFingerprint || sequenceKey,
      sequence,
      entries,
      startedAt: performance.now(),
    };
    activePreparation = nextPreparation;
    const request = preparationController.requestPreparation({
      sequenceKey,
      // Preparation ownership follows the immutable sequence. The current
      // target World is only a bootstrap hint and must not reset a failed
      // sequence's retry latch as the playhead moves.
      pairId: `sequence:${sequenceKey}`,
      inputFingerprint: descriptor.inputFingerprint || sequenceKey,
      input: nextPreparation,
    }, { trigger: 'compiled-plan' });
    if (!request.accepted) {
      activePreparation = previousPreparation;
      sequenceState = request.reason === 'failed-latched' ? 'failed' : 'idle';
      root.dataset.worldPrepare = sequenceState;
      return false;
    }
    sequenceState = 'loading';
    root.dataset.worldPrepare = 'loading';
    const targetWorld = sequence.find((world) => world.sectionId === targetWorldId) || sequence[0];
    bootstrapTarget(sequenceKey, targetWorld);
    return true;
  };

  const setModifierUniforms = (target, world, globals) => {
    const slots = getModifierSlots(world, globals);
    const sharedSwarm = slots?.swarm;
    const drift = sharedSwarm || slots?.drift;
    const wave = slots?.wave;
    const group = slots?.group;
    const colour = slots?.colour;
    target.driftAmplitude.value = Number(drift?.amplitude || 0);
    target.driftSpeed.value = Number(drift?.speed || 0);
    target.driftIrregularity.value = Number(sharedSwarm?.irregularity || 0);
    target.driftIndividuality.value = Number(sharedSwarm?.individuality || 0);
    target.driftAxisSpread.value = Number(sharedSwarm?.axisSpread || 0);
    target.driftStoryMix.value = sharedSwarm
      ? sharedSwarm.storyMix
      : drift?.timeMode === 'story' ? 1 : drift?.timeMode === 'mixed' ? 0.08 : 0;
    target.waveWeight.value = wave ? Number(wave.strength ?? 1) : 0;
    target.waveAmplitude.value = Number(wave?.amplitude || 0);
    target.waveSpeed.value = Number(wave?.speed || 0);
    target.waveFrequency.value.set(
      Number(wave?.frequencyX || 1),
      Number(wave?.frequencyZ || 1),
    );
    target.groupStrength.value = Number(group?.strength || 0);
    target.livingColour.value = Number(colour?.strength || 0);
  };

  const resolveDisciplineStoryOffset = (frame, world, target) => {
    target.set(0, 0, 0);
    if (frame.reducedMotion || world?.shapeId !== 'discipline-grid-v1') return 0;
    const storyTravel = Math.max(0, frame.storyWU - Number(world.startWU || 0))
      * Number(frame.camera.cadence || 1);
    const riseStart = Math.max(0.04, Number(world.travelWU || 0.8) * 0.2);
    const extraRise = (compact ? 0.72 : 1.1)
      * smoothRange(storyTravel, riseStart, riseStart + (compact ? 0.9 : 1.15));
    const rise = storyTravel + extraRise;
    cameraUpScratch.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    target.copy(cameraUpScratch).multiplyScalar(rise);
    return rise;
  };

  const updateDisciplineReveal = (frame, fromWorld, toWorld) => {
    const revealState = frame.disciplineReveal;
    const reveal = revealState?.config;
    const overlay = disciplineOverlayRef?.current;
    syncDisciplineLabels(overlay);
    const gridWorld = toWorld.shapeId === 'discipline-grid-v1'
      ? toWorld
      : fromWorld.shapeId === 'discipline-grid-v1' ? fromWorld : null;
    const gridDisciplinePositions = gridWorld === toWorld
      ? toDisciplinePositions
      : fromDisciplinePositions;
    const gridDisciplineIndices = gridWorld === toWorld
      ? toDisciplineIndices
      : fromDisciplineIndices;
    const local = Number(revealState?.localProgress ?? -1);
    const revealAvailable = Boolean(reveal && gridWorld && local >= 0);
    const reducedActive = frame.reducedMotion && frame.sectionIndex === revealState?.sectionIndex;
    disciplineWeights.fill(0);

    let backgroundWeight = 0;
    let visibleLabels = 0;
    if (revealAvailable) {
      backgroundWeight = reducedActive
        ? 1
        : smoothRange(local, reveal.start, reveal.start + reveal.backgroundFade);
      const lastRevealEnd = reveal.start
        + (Math.max(0, reveal.items.length - 1) * reveal.stagger)
        + reveal.labelDuration;
      const exitStart = Math.min(reveal.end, lastRevealEnd + reveal.hold);
      const exitProgress = reducedActive ? 0 : smoothRange(local, exitStart, reveal.end);
      for (let orderIndex = 0; orderIndex < reveal.items.length; orderIndex += 1) {
        const item = reveal.items[orderIndex];
        const itemStart = reveal.start + (orderIndex * reveal.stagger);
        const itemReveal = reducedActive
          ? 1
          : smoothRange(local, itemStart, itemStart + reveal.labelDuration);
        disciplineWeights[item.group - 1] = itemReveal;
        const labelReveal = local <= reveal.end ? itemReveal * (1 - exitProgress) : 0;
        writeDisciplineRevealStyles(item.group - 1, labelReveal);
        if (labelReveal > 0.05) visibleLabels += 1;
      }
    }

    uniforms.disciplineRevealA.value.set(
      disciplineWeights[0],
      disciplineWeights[1],
      disciplineWeights[2],
    );
    uniforms.disciplineRevealB.value.set(
      disciplineWeights[3],
      disciplineWeights[4],
      disciplineWeights[5],
    );
    uniforms.disciplineRevealActive.value = revealAvailable ? 1 : 0;
    uniforms.disciplineBackgroundWeight.value = backgroundWeight;
    uniforms.disciplineBackgroundOpacity.value = Number(reveal?.backgroundOpacity ?? 0.06);
    uniforms.disciplineReconnectOpacity.value = Number(reveal?.reconnectOpacity ?? 0.24);
    uniforms.disciplinePointScale.value = Number(reveal?.pointScale ?? 3.6);

    if (overlay) {
      const nextAriaHidden = visibleLabels > 0 ? 'false' : 'true';
      if (nextAriaHidden !== lastDisciplineAriaHidden) {
        overlay.setAttribute('aria-hidden', nextAriaHidden);
        lastDisciplineAriaHidden = nextAriaHidden;
        runtimeObserver.hotFrameDomWrite();
      }
      if (revealAvailable && anchorSamplingExact) {
        camera.updateMatrixWorld(true);
        anchorSampleInput.fromTransform = uniforms.fromTransform.value;
        anchorSampleInput.toTransform = uniforms.toTransform.value;
        anchorSampleInput.morphProgress = uniforms.morphProgress.value;
        anchorSampleInput.bustYaw = uniforms.bustYaw.value;
        anchorSampleInput.fromBust = uniforms.fromBust.value;
        anchorSampleInput.toBust = uniforms.toBust.value;
        anchorSampleInput.storyTime = uniforms.storyTime.value;
        anchorSampleInput.ambientTime = uniforms.ambientTime.value;
        anchorSampleInput.gridInfluence = uniforms.gridInfluence.value;
        anchorSampleInput.fromGroupStrength = uniforms.fromGroupStrength.value;
        anchorSampleInput.toGroupStrength = uniforms.toGroupStrength.value;
        anchorSampleInput.fromDrift.amplitude = uniforms.fromDriftAmplitude.value;
        anchorSampleInput.fromDrift.speed = uniforms.fromDriftSpeed.value;
        anchorSampleInput.fromDrift.irregularity = uniforms.fromDriftIrregularity.value;
        anchorSampleInput.fromDrift.individuality = uniforms.fromDriftIndividuality.value;
        anchorSampleInput.fromDrift.axisSpread = uniforms.fromDriftAxisSpread.value;
        anchorSampleInput.fromDrift.storyMix = uniforms.fromDriftStoryMix.value;
        anchorSampleInput.toDrift.amplitude = uniforms.toDriftAmplitude.value;
        anchorSampleInput.toDrift.speed = uniforms.toDriftSpeed.value;
        anchorSampleInput.toDrift.irregularity = uniforms.toDriftIrregularity.value;
        anchorSampleInput.toDrift.individuality = uniforms.toDriftIndividuality.value;
        anchorSampleInput.toDrift.axisSpread = uniforms.toDriftAxisSpread.value;
        anchorSampleInput.toDrift.storyMix = uniforms.toDriftStoryMix.value;
        anchorSampleInput.fromWave.weight = uniforms.fromWaveWeight.value;
        anchorSampleInput.fromWave.amplitude = uniforms.fromWaveAmplitude.value;
        anchorSampleInput.fromWave.speed = uniforms.fromWaveSpeed.value;
        anchorSampleInput.fromWave.frequencyX = uniforms.fromWaveFrequency.value.x;
        anchorSampleInput.fromWave.frequencyZ = uniforms.fromWaveFrequency.value.y;
        anchorSampleInput.toWave.weight = uniforms.toWaveWeight.value;
        anchorSampleInput.toWave.amplitude = uniforms.toWaveAmplitude.value;
        anchorSampleInput.toWave.speed = uniforms.toWaveSpeed.value;
        anchorSampleInput.toWave.frequencyX = uniforms.toWaveFrequency.value.x;
        anchorSampleInput.toWave.frequencyZ = uniforms.toWaveFrequency.value.y;
        for (let group = 1; group <= 6; group += 1) {
          const label = disciplineLabels[group - 1];
          if (!label) continue;
          const offset = (group - 1) * 3;
          if (!Number.isFinite(gridDisciplinePositions[offset])) continue;
          const pointIndex = gridDisciplineIndices[group - 1];
          if (pointIndex < 0) continue;
          const pointOffset = pointIndex * 3;
          anchorFromPosition.x = fixedAttributes.position.array[pointOffset];
          anchorFromPosition.y = fixedAttributes.position.array[pointOffset + 1];
          anchorFromPosition.z = fixedAttributes.position.array[pointOffset + 2];
          anchorToPosition.x = fixedAttributes.targetPosition.array[pointOffset];
          anchorToPosition.y = fixedAttributes.targetPosition.array[pointOffset + 1];
          anchorToPosition.z = fixedAttributes.targetPosition.array[pointOffset + 2];
          anchorSampleInput.pointSeed = fixedAttributes.pointSeed.array[pointIndex];
          sampleAboutNarrativeAnchorPosition(anchorSampleInput, anchorSampleTarget);
          disciplinePointScratch.set(
            anchorSampleTarget.x,
            anchorSampleTarget.y,
            anchorSampleTarget.z,
          ).project(camera);
          writeDisciplinePosition(
            group - 1,
            viewportOffsetX + (((disciplinePointScratch.x * 0.5) + 0.5) * width),
            viewportOffsetY + (((-disciplinePointScratch.y * 0.5) + 0.5) * height),
            1,
          );
        }
      } else if (revealAvailable) {
        for (let group = 1; group <= 6; group += 1) {
          writeDisciplinePosition(
            group - 1,
            group % 2 === 0 ? 62 : 26,
            14 + (group * 11),
            2,
          );
        }
      }
    }
    let visibleDisciplineCount = 0;
    for (let index = 0; index < disciplineWeights.length; index += 1) {
      if (disciplineWeights[index] > 0.95) visibleDisciplineCount += 1;
    }
    if (visibleDisciplineCount !== lastDisciplineVisibleCount) {
      root.dataset.worldDisciplineVisible = String(visibleDisciplineCount);
      lastDisciplineVisibleCount = visibleDisciplineCount;
      runtimeObserver.hotFrameDomWrite();
    }
    if (visibleLabels !== lastDisciplineLabelCount) {
      root.dataset.worldDisciplineLabels = String(visibleLabels);
      lastDisciplineLabelCount = visibleLabels;
      runtimeObserver.hotFrameDomWrite();
    }
    if (backgroundWeight !== lastGridBackground) {
      root.dataset.worldGridBackground = backgroundWeight.toFixed(4);
      lastGridBackground = backgroundWeight;
      runtimeObserver.hotFrameDomWrite();
    }
  };

  const render = (frame) => {
    latestFrame = frame;
    if (!frame || !contextAvailable || document.hidden) return;
    const requestedFromWorld = frame.world.from || frame.world.to;
    const requestedToWorld = frame.world.to || requestedFromWorld;
    if (!requestedFromWorld || !requestedToWorld) return;
    const requestedSequenceKey = frame.world.sequenceKey;
    const preparedPair = readySequence?.key === requestedSequenceKey
      ? readySequence.pairs.get(requestedToWorld.sectionId)
      : null;
    if (preparedPair
      && preparedPair.fromWorld.sectionId === requestedFromWorld.sectionId
      && preparedPair.toWorld.sectionId === requestedToWorld.sectionId) {
      preparedPair.fromWorld = requestedFromWorld;
      preparedPair.toWorld = requestedToWorld;
      installPreparedPair(preparedPair);
    }
    if (!installedPair) return;
    runtimeObserver.hotFrameStarted();
    const pairMatchesRequest = installedPair.fromWorld.sectionId === requestedFromWorld.sectionId
      && installedPair.toWorld.sectionId === requestedToWorld.sectionId;
    if (pairMatchesRequest) {
      installedPair.fromWorld = requestedFromWorld;
      installedPair.toWorld = requestedToWorld;
    }
    const fromWorld = installedPair.fromWorld;
    const toWorld = installedPair.toWorld;
    if (fromWorld !== lastAnchorFromWorld || toWorld !== lastAnchorToWorld) {
      inspectAboutNarrativeAnchorSampling(fromWorld.modifiers, anchorCapability);
      inspectAboutNarrativeAnchorSampling(toWorld.modifiers, anchorCapabilityTarget);
      anchorSamplingExact = anchorCapability.capability === ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT
        && anchorCapabilityTarget.capability === ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT;
      lastAnchorFromWorld = fromWorld;
      lastAnchorToWorld = toWorld;
      root.dataset.worldAnchorSampling = anchorSamplingExact ? 'exact' : 'editorial-fallback';
      if (!anchorSamplingExact) {
        diagnostics.recordLifecycle('anchor-sampling-unsupported', {
          unsupportedModifierCount: anchorCapability.unsupportedCount + anchorCapabilityTarget.unsupportedCount,
        });
      }
    }
    const transitionProgress = pairMatchesRequest
      ? frame.world.transitionProgress
      : installedPair.progress;
    if (pairMatchesRequest) installedPair.progress = transitionProgress;
    const bust = getModifierSlots(toWorld, frame.globals)?.bust;
    const formingBust = toWorld.shapeId === 'bust-v1' && transitionProgress < 0.9999;
    const bustDeltaSeconds = frame.ambientTime > 0 && lastBustAmbientTime > 0
      ? Math.min(0.5, Math.max(0, frame.ambientTime - lastBustAmbientTime))
      : 0;
    lastBustAmbientTime = frame.ambientTime;
    bustSampleInput.active = toWorld.shapeId === 'bust-v1';
    bustSampleInput.transitionProgress = transitionProgress;
    bustSampleInput.deltaSeconds = bustDeltaSeconds;
    bustSampleInput.speed = Number(bust?.speed || 0);
    bustSampleInput.resumeDelay = Number(bust?.resumeDelay || 0);
    bustSampleInput.liveAmbient = frame.ambientTime > 0;
    bustSampleInput.deterministicScrub = frame.ambientTime === 0;
    bustSampleInput.reducedMotion = frame.reducedMotion;
    bustSampleInput.hidden = document.hidden;
    const bustState = bustController.sample(bustSampleInput);
    bustYaw = bustState.yaw;
    if (toWorld.shapeId !== 'bust-v1' && dragStart) {
      if (interaction.hasPointerCapture(dragStart.pointerId)) {
        interaction.releasePointerCapture(dragStart.pointerId);
      }
      dragStart = null;
      dragging = false;
    }

    camera.position.fromArray(frame.camera.position);
    camera.up.set(Math.sin(frame.camera.roll), Math.cos(frame.camera.roll), 0);
    camera.lookAt(...frame.camera.target);
    if (director.active) {
      directorTarget.fromArray(frame.camera.target);
      directorOffset.copy(camera.position).sub(directorTarget);
      directorEuler.set(director.pitch, director.yaw, 0);
      directorOffset.applyEuler(directorEuler);
      directorOffset.setLength(Math.max(0.2, directorOffset.length() + director.distance));
      camera.position.copy(directorTarget).add(directorOffset);
      camera.up.set(0, 1, 0);
      camera.lookAt(directorTarget);
    }
    if (camera.fov !== frame.camera.fov) {
      camera.fov = frame.camera.fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld(true);
    const fromDisciplineRise = resolveDisciplineStoryOffset(frame, fromWorld, fromStoryOffset);
    const toDisciplineRise = resolveDisciplineStoryOffset(frame, toWorld, toStoryOffset);
    writeWorldTransform(
      uniforms.fromTransform.value,
      fromWorld,
      frame.globals,
      compact,
      fromTransformScratch,
      fromStoryOffset,
    );
    writeWorldTransform(
      uniforms.toTransform.value,
      toWorld,
      frame.globals,
      compact,
      toTransformScratch,
      toStoryOffset,
    );
    const disciplineRise = Math.max(fromDisciplineRise, toDisciplineRise);
    if (disciplineRise !== lastDisciplineRise) {
      root.dataset.worldDisciplineRise = disciplineRise.toFixed(4);
      lastDisciplineRise = disciplineRise;
      runtimeObserver.hotFrameDomWrite();
    }
    uniforms.morphProgress.value = transitionProgress;
    uniforms.storyTime.value = frame.storyTime;
    uniforms.ambientTime.value = frame.ambientTime;
    uniforms.pointSize.value = frame.globals.pointMaterial.pointSize;
    uniforms.fieldOpacity.value = frame.globals.pointMaterial.opacity;
    setModifierUniforms(modifierUniformTargets.from, fromWorld, frame.globals);
    setModifierUniforms(modifierUniformTargets.to, toWorld, frame.globals);
    if (frame.reducedMotion) {
      uniforms.fromDriftAmplitude.value = 0;
      uniforms.toDriftAmplitude.value = 0;
      uniforms.fromWaveSpeed.value = 0;
      uniforms.toWaveSpeed.value = 0;
    }
    uniforms.fromBust.value = fromWorld.shapeId === 'bust-v1' ? 1 : 0;
    uniforms.toBust.value = toWorld.shapeId === 'bust-v1' ? 1 : 0;
    uniforms.bustYaw.value = bustYaw;
    if (bustYaw !== lastBustShaderYaw) {
      root.dataset.worldBustShaderYaw = bustYaw.toFixed(5);
      lastBustShaderYaw = bustYaw;
      runtimeObserver.hotFrameDomWrite();
    }
    uniforms.disciplineFocus.value = Number(frame.editorialSignals?.disciplineFocus || 0);
    uniforms.gridInfluence.value = frame.reducedMotion
      ? 0
      : Number(frame.editorialSignals?.gridInfluence || 0);
    if (uniforms.disciplineFocus.value !== lastGroupFocus) {
      root.dataset.worldGroupFocus = String(uniforms.disciplineFocus.value);
      lastGroupFocus = uniforms.disciplineFocus.value;
      runtimeObserver.hotFrameDomWrite();
    }
    if (uniforms.gridInfluence.value !== lastGridInfluence) {
      root.dataset.worldGridInfluence = uniforms.gridInfluence.value.toFixed(4);
      lastGridInfluence = uniforms.gridInfluence.value;
      runtimeObserver.hotFrameDomWrite();
    }
    updateDisciplineReveal(frame, fromWorld, toWorld);

    const interactionEnabled = pairMatchesRequest
      && bustController.interactive
      && !formingBust
      && frame.section.interaction?.type === 'horizontal-spin'
      && frame.localProgress >= Number(frame.section.interaction.activationStart || 0);
    if (interactionEnabled !== lastInteractionEnabled) {
      interaction.dataset.active = interactionEnabled ? 'true' : 'false';
      interaction.tabIndex = interactionEnabled ? 0 : -1;
      lastInteractionEnabled = interactionEnabled;
      runtimeObserver.hotFrameDomWrite(2);
    }
    if (toWorld.shapeId !== lastWorldStage) {
      root.dataset.worldStage = toWorld.shapeId;
      lastWorldStage = toWorld.shapeId;
      runtimeObserver.hotFrameDomWrite();
    }
    const cameraCadence = frame.globals.camera.cadenceLocked
      ? 'locked-world-units-v1'
      : 'editable-world-units-v1';
    if (cameraCadence !== lastCameraCadence) {
      root.dataset.cameraCadence = cameraCadence;
      lastCameraCadence = cameraCadence;
      runtimeObserver.hotFrameDomWrite();
    }
    const cameraForward = frame.globals.camera.startZ - frame.camera.position[2];
    if (cameraForward !== lastCameraForward) {
      root.style.setProperty('--narrative-camera-forward', cameraForward.toFixed(4));
      lastCameraForward = cameraForward;
      runtimeObserver.hotFrameDomWrite();
    }
    if (frame.camera.roll !== lastCameraRoll) {
      root.style.setProperty('--narrative-camera-roll', frame.camera.roll.toFixed(4));
      lastCameraRoll = frame.camera.roll;
      runtimeObserver.hotFrameDomWrite();
    }
    if (frame.camera.fov !== lastCameraFov) {
      root.style.setProperty('--narrative-camera-fov', frame.camera.fov.toFixed(2));
      lastCameraFov = frame.camera.fov;
      runtimeObserver.hotFrameDomWrite();
    }
    if (bustYaw !== lastBustStyleYaw) {
      root.style.setProperty('--narrative-bust-yaw', bustYaw.toFixed(4));
      lastBustStyleYaw = bustYaw;
      runtimeObserver.hotFrameDomWrite();
    }
    runtimeObserver.render();
  };

  const handlePointerDown = (event) => {
    if (interaction.dataset.active !== 'true') return;
    dragStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, yaw: bustYaw };
    dragging = false;
  };
  const handlePointerMove = (event) => {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    if (!dragging && Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY)) {
      const bust = getModifierSlots(latestFrame?.world?.to, latestFrame?.globals)?.bust;
      dragging = bustController.beginDrag({
        pointerId: event.pointerId,
        x: dragStart.x,
        width,
        sensitivity: Number(bust?.dragSensitivity || 1),
      });
      if (dragging) interaction.setPointerCapture(event.pointerId);
    }
    if (!dragging) return;
    event.preventDefault();
    bustController.dragTo({ pointerId: event.pointerId, x: event.clientX });
    bustYaw = bustController.yaw;
  };
  const handlePointerEnd = (event) => {
    if (dragging && interaction.hasPointerCapture(event.pointerId)) interaction.releasePointerCapture(event.pointerId);
    bustController.endDrag({ pointerId: event.pointerId });
    bustYaw = bustController.yaw;
    dragStart = null;
    dragging = false;
  };
  const handleKeyDown = (event) => {
    if (interaction.dataset.active !== 'true') return;
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    bustController.rotateByKeyboard(event.key === 'ArrowLeft' ? 'left' : 'right');
    bustYaw = bustController.yaw;
  };
  const handleContextLost = (event) => {
    event.preventDefault();
    contextAvailable = false;
    preparationController.setVisible(false);
    bootstrapController?.abort();
    bootstrapRequestId += 1;
    bustController.cancelInteraction();
    root.dataset.pointWorldState = 'context-lost';
    diagnostics.recordLifecycle('context-lost', { contextAvailable: false });
  };
  const handleContextRestored = () => {
    contextAvailable = true;
    root.dataset.pointWorldState = 'ready';
    resize();
    updateTheme();
    Object.entries(fixedAttributes).forEach(([name, attribute]) => {
      if (name !== 'pointSeed') attribute.needsUpdate = true;
    });
    preparationController.setVisible(true);
    if (lastPreparationRequest) preparePlan(lastPreparationRequest);
    diagnostics.recordLifecycle('context-restored', { contextAvailable: true, lastFailure: null });
  };

  const resizeObserver = new ResizeObserver(resize);
  const themeObserver = new MutationObserver(updateTheme);
  resizeObserver.observe(root);
  resizeObserver.observe(canvas);
  themeObserver.observe(root, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  interaction.addEventListener('pointerdown', handlePointerDown);
  interaction.addEventListener('pointermove', handlePointerMove, { passive: false });
  interaction.addEventListener('pointerup', handlePointerEnd);
  interaction.addEventListener('pointercancel', handlePointerEnd);
  interaction.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('webglcontextlost', handleContextLost);
  canvas.addEventListener('webglcontextrestored', handleContextRestored);
  window.addEventListener('bb:paletteChanged', updateTheme);
  window.addEventListener('abs:theme-changed', updateTheme);
  resize();
  updateTheme();
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  root.dataset.pointWorldState = 'ready';
  let cachedRuntimeDiagnosticsSnapshot = null;
  let cachedRuntimeLifecycle = null;
  const getRuntimeDiagnosticsSnapshot = () => {
    const lifecycle = diagnostics.getSnapshot();
    // `subscribeDiagnostics` is lifecycle-only. A snapshot therefore remains
    // identical until that store emits, even while pull-only performance
    // counters continue changing.
    if (cachedRuntimeDiagnosticsSnapshot && cachedRuntimeLifecycle === lifecycle) {
      return cachedRuntimeDiagnosticsSnapshot;
    }
    const shapeCacheSnapshot = shapeCache.getSnapshot();
    const sequenceCacheSnapshot = sequenceCache.getSnapshot();
    const resourceSnapshot = resourceLedger?.getSnapshot('diagnostics');
    const webglSnapshot = webglTracker?.getSnapshot();
    const pairs = readySequence
      ? [...readySequence.pairs.values()].map((pair) => Object.freeze({
        pairId: `${pair.fromWorld.sectionId}->${pair.toWorld.sectionId}`,
        inputFingerprint: activePreparation?.inputFingerprint || '',
        state: 'ready',
        source: 'worker',
        requestedStrategy: pair.requestedStrategy,
        installedStrategy: pair.installedStrategy,
        fallbackReason: pair.fallbackReason,
      }))
      : [];
    cachedRuntimeLifecycle = lifecycle;
    cachedRuntimeDiagnosticsSnapshot = Object.freeze({
      ...lifecycle,
      activeSequenceKey: readySequence?.key || '',
      pendingSequenceKey: lifecycle.state === 'preparing' ? lifecycle.sequenceKey || '' : '',
      failedSequenceKey: lifecycle.state === 'failed' ? lifecycle.sequenceKey || '' : '',
      installedPairId: installedPair?.key || '',
      installedWorldId: installedPair?.toWorld?.sectionId || '',
      ...runtimeObserver.getLifecycleFields(),
      shapeCache: shapeCacheSnapshot,
      sequenceCache: sequenceCacheSnapshot,
      resources: resourceSnapshot || null,
      webgl: webglSnapshot || null,
      pairs: Object.freeze(pairs),
    });
    return cachedRuntimeDiagnosticsSnapshot;
  };
  const runtimeApi = {
    preparePlan,
    retryPreparation: preparationController.retryPreparation,
    setVisible: preparationController.setVisible,
    getDiagnosticsSnapshot: getRuntimeDiagnosticsSnapshot,
    subscribeDiagnostics: diagnostics.subscribe,
    resetPerformanceMetrics: runtimeObserver.reset,
    resetHotFrameMetrics: runtimeObserver.resetHotFrameMetrics,
    render,
    getMetrics: () => runtimeObserver.getMetrics({
      sequenceState,
      installedPair,
      readySequence,
      latestFrame,
    }),
    frameSelectedWorld: () => null,
    setDirectorView: (active) => { director.active = Boolean(active); },
    nudgeDirector: ({ yaw = 0, pitch = 0, distance = 0 }) => {
      director.yaw += yaw;
      director.pitch = Math.max(-1.2, Math.min(1.2, director.pitch + pitch));
      director.distance += distance;
    },
    resetDirector: () => { director.yaw = 0; director.pitch = 0; director.distance = 0; },
  };
  runtimeRef.current = runtimeApi;
  if (RUNTIME_DIAGNOSTICS_ENABLED) window.__aboutNarrativeRuntime = runtimeApi;
  const runtimeReadyTimer = window.setTimeout(() => {
    if (!disposed) root.dispatchEvent(new CustomEvent('about:world-runtime-ready'));
  }, 0);

  return () => {
    disposed = true;
    window.clearTimeout(runtimeReadyTimer);
    unsubscribePreparation();
    preparationController.dispose();
    correspondenceWorker?.terminate();
    correspondenceWorker = null;
    bootstrapController?.abort();
    bootstrapRequestId += 1;
    bustController.cancelInteraction();
    shapeCache.dispose();
    sequenceCache.dispose();
    diagnostics.dispose({ emit: false });
    runtimeRef.current = null;
    if (RUNTIME_DIAGNOSTICS_ENABLED && window.__aboutNarrativeRuntime === runtimeApi) {
      delete window.__aboutNarrativeRuntime;
    }
    resizeObserver.disconnect();
    themeObserver.disconnect();
    interaction.removeEventListener('pointerdown', handlePointerDown);
    interaction.removeEventListener('pointermove', handlePointerMove);
    interaction.removeEventListener('pointerup', handlePointerEnd);
    interaction.removeEventListener('pointercancel', handlePointerEnd);
    interaction.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('webglcontextlost', handleContextLost);
    canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    window.removeEventListener('bb:paletteChanged', updateTheme);
    window.removeEventListener('abs:theme-changed', updateTheme);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    webglTracker?.dispose();
    if (resourceLedger) {
      resourceLedger.releaseOwner('installed-pair');
      resourceLedger.releaseOwner('fixed-attributes');
      resourceLedger.dispose();
    }
    delete root.dataset.worldStage;
    delete root.dataset.cameraCadence;
    delete root.dataset.pointAsset;
    delete root.dataset.pointWorldState;
    delete root.dataset.worldPrepare;
    delete root.dataset.worldError;
    delete root.dataset.worldCorrespondence;
    delete root.dataset.worldCorrespondenceRequested;
    delete root.dataset.worldCorrespondenceImprovement;
    delete root.dataset.worldCorrespondenceP95;
    delete root.dataset.worldCorrespondenceMax;
    delete root.dataset.worldCorrespondenceFallback;
    delete root.dataset.worldCorrespondencePair;
    delete root.dataset.worldBootstrapGenerationMs;
    delete root.dataset.worldShapeGenerationMs;
    delete root.dataset.worldCorrespondenceWorkerMs;
    delete root.dataset.worldCorrespondencePrepareMs;
    delete root.dataset.worldCorrespondenceApplyMs;
    delete root.dataset.worldBufferRebuilds;
    delete root.dataset.worldBustShaderYaw;
    delete root.dataset.worldDisciplineVisible;
    delete root.dataset.worldDisciplineLabels;
    delete root.dataset.worldGridBackground;
    delete root.dataset.worldDisciplineRise;
    root.style.removeProperty('--narrative-camera-forward');
    root.style.removeProperty('--narrative-camera-roll');
    root.style.removeProperty('--narrative-camera-fov');
    root.style.removeProperty('--narrative-bust-yaw');
  };
}

export function AboutNarrativePointWorld3D({ rootRef, interactionRef, disciplineOverlayRef, runtimeRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const interaction = interactionRef.current;
    if (!canvas || !root || !interaction) return undefined;
    try {
      return createPointFieldAdapter({
        canvas,
        root,
        interaction,
        disciplineOverlayRef,
        runtimeRef,
      });
    } catch (error) {
      root.dataset.pointWorldState = 'unavailable';
      console.warn('[About narrative] Point world unavailable; continuing with editorial content.', error);
      return () => { delete root.dataset.pointWorldState; };
    }
  }, [disciplineOverlayRef, interactionRef, rootRef, runtimeRef]);

  return <canvas ref={canvasRef} className="about-narrative-world__canvas" aria-hidden="true" />;
}
