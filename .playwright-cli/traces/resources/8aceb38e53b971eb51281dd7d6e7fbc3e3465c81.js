import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useEffect = __vite__cjsImport1_react["useEffect"]; const useRef = __vite__cjsImport1_react["useRef"];
import * as THREE from "/node_modules/.vite/deps/three.js?v=6e8fde4d";
import {
  createAboutNarrativeSeeds,
  generateAboutNarrativeShape
} from "/src/routes/about-narrative-lab/aboutNarrativePointShapes.js";
import { resolveAboutNarrativeSwarmMotion } from "/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js";
import { applyAboutNarrativePermutation } from "/src/routes/about-narrative-lab/aboutNarrativeCorrespondence.js?t=1784283498481";
import { getGlobals } from "/src/legacy/modules/core/state.js";
const DESKTOP_POINT_COUNT = 12e3;
const MOBILE_POINT_COUNT = 5e3;
const MATERIAL_SLOT_COUNT = 6;
const SEQUENCE_CACHE_LIMIT = 3;
const CORRESPONDENCE_VERSION = "spatial-nearest-v1.0.0";
const FALLBACK_MATERIAL_DISTRIBUTION = Object.freeze(
  [
    Object.freeze({ colorIndex: 0, weight: 31 }),
    Object.freeze({ colorIndex: 3, weight: 13 }),
    Object.freeze({ colorIndex: 2, weight: 16 }),
    Object.freeze({ colorIndex: 6, weight: 20 }),
    Object.freeze({ colorIndex: 7, weight: 10 }),
    Object.freeze({ colorIndex: 5, weight: 10 })
  ]
);
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
      disciplineBackgroundOpacity,
      disciplineBackgroundWeight * (1.0 - reconnect)
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
  const valid = Array.isArray(configured) ? configured.filter((row) => Number(row?.weight) > 0).slice(0, MATERIAL_SLOT_COUNT) : [];
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
      readColorToken(styles, `--ball-${fallbackIndex + 1}`, "#ffffff")
    );
    uniforms[`materialColor${index + 1}`].value.setStyle(color);
    cumulative += weights[index] / total;
    if (index < MATERIAL_SLOT_COUNT - 1) {
      uniforms[`materialThreshold${index + 1}`].value = cumulative;
    }
  });
  const disciplineTokens = ["--ball-1", "--ball-4", "--ball-3", "--ball-7", "--ball-8", "--ball-6"];
  const disciplineFallbacks = ["#b5b7b6", "#00695c", "#ffffff", "#0d5cb6", "#ffa000", "#d7ff2f"];
  disciplineTokens.forEach((token, index) => {
    uniforms[`disciplineColor${index + 1}`].value.setStyle(
      readColorToken(styles, token, disciplineFallbacks[index])
    );
  });
}
function createEmptyAttribute(count, value = 0) {
  return new Float32Array(count).fill(value);
}
function shapeCacheKey(world, quality) {
  return JSON.stringify(
    [
      world?.shapeId,
      world?.seed,
      quality,
      world?.shapeParameters || {}
    ]
  );
}
function createSequenceCacheKey(sequence, globals, quality, compact) {
  return JSON.stringify(
    [
      CORRESPONDENCE_VERSION,
      quality,
      compact,
      globals.camera.startZ,
      globals.camera.cadence,
      sequence.map(
        (world) => [
          world.sectionId,
          shapeCacheKey(world, quality),
          world.transitionIn?.correspondence || "index-v1",
          world.startWU,
          world.entryDistanceWU,
          world.transform?.position,
          world.transform?.rotation,
          world.transform?.scale,
          world.transform?.mobileScale,
          world.transform?.mobileYOffset
        ]
      )
    ]
  );
}
function touchBoundedCache(cache, key, value) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > SEQUENCE_CACHE_LIMIT) cache.delete(cache.keys().next().value);
}
function writeWorldTransform(target, world, globals, compact, scratch, storyOffset = null) {
  if (!world) return target.identity();
  const transform = world.transform || {};
  const position = transform.position || [0, 0, 0];
  const rotation = transform.rotation || [0, 0, 0];
  const baseScale = Number(transform.scale ?? 1);
  const scale = compact && Number.isFinite(transform.mobileScale) ? Number(transform.mobileScale) : baseScale;
  const entryCameraZ = globals.camera.startZ - world.startWU * globals.camera.cadence;
  scratch.position.set(
    position[0],
    position[1] + (compact ? Number(transform.mobileYOffset || 0) : 0),
    entryCameraZ - Number(world.entryDistanceWU || 0) + position[2]
  );
  if (storyOffset) scratch.position.add(storyOffset);
  scratch.euler.set(
    rotation[0],
    rotation[1],
    rotation[2],
    "YXZ"
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
    euler: new THREE.Euler(0, 0, 0, "YXZ")
  };
}
function smoothRange(value, from, to) {
  if (to <= from) return value >= to ? 1 : 0;
  const progress = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return progress * progress * (3 - 2 * progress);
}
function captureDisciplinePositions(output, target) {
  target.fill(Number.NaN);
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
  }
}
function createPointFieldAdapter({ canvas, root, interaction, disciplineOverlayRef, runtimeRef }) {
  const compact = window.matchMedia("(max-width: 600px), (pointer: coarse)").matches;
  const quality = compact ? "mobile" : "desktop";
  const pointCount = compact ? MOBILE_POINT_COUNT : DESKTOP_POINT_COUNT;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance"
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 80);
  const geometry = new THREE.BufferGeometry();
  const seeds = createAboutNarrativeSeeds(pointCount, 506832829);
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
    disciplinePointScale: { value: 3.6 },
    fromLivingColour: { value: 0 },
    toLivingColour: { value: 0 },
    fromBust: { value: 0 },
    toBust: { value: 0 },
    bustYaw: { value: 0 },
    materialColor1: { value: new THREE.Color("#b5b7b6") },
    materialColor2: { value: new THREE.Color("#00695c") },
    materialColor3: { value: new THREE.Color("#ffffff") },
    materialColor4: { value: new THREE.Color("#0d5cb6") },
    materialColor5: { value: new THREE.Color("#ffa000") },
    materialColor6: { value: new THREE.Color("#d7ff2f") },
    disciplineColor1: { value: new THREE.Color("#b5b7b6") },
    disciplineColor2: { value: new THREE.Color("#00695c") },
    disciplineColor3: { value: new THREE.Color("#ffffff") },
    disciplineColor4: { value: new THREE.Color("#0d5cb6") },
    disciplineColor5: { value: new THREE.Color("#ffa000") },
    disciplineColor6: { value: new THREE.Color("#d7ff2f") },
    materialThreshold1: { value: 0.31 },
    materialThreshold2: { value: 0.44 },
    materialThreshold3: { value: 0.6 },
    materialThreshold4: { value: 0.8 },
    materialThreshold5: { value: 0.9 },
    fieldOpacity: { value: 0.96 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: true,
    blending: THREE.NormalBlending
  });
  geometry.setAttribute("position", new THREE.BufferAttribute(emptyPositions, 3));
  geometry.setAttribute("targetPosition", new THREE.BufferAttribute(emptyPositions.slice(), 3));
  geometry.setAttribute("pointSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("fromPresence", new THREE.BufferAttribute(emptyPresence, 1));
  geometry.setAttribute("toPresence", new THREE.BufferAttribute(emptyPresence.slice(), 1));
  geometry.setAttribute("fromPointSize", new THREE.BufferAttribute(emptySize, 1));
  geometry.setAttribute("toPointSize", new THREE.BufferAttribute(emptySize.slice(), 1));
  geometry.setAttribute("fromGroup", new THREE.BufferAttribute(emptyGroup, 1));
  geometry.setAttribute("toGroup", new THREE.BufferAttribute(emptyGroup.slice(), 1));
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  const shapeCache = /* @__PURE__ */ new Map();
  const sequenceCache = /* @__PURE__ */ new Map();
  let installedPair = null;
  let readySequence = null;
  let pendingSequenceKey = "";
  let generationController = null;
  let correspondenceWorker = null;
  let preparationGeneration = 0;
  let sequenceState = "idle";
  let sequencePreparationDurationMs = 0;
  let disposed = false;
  let contextAvailable = true;
  let width = 1;
  let height = 1;
  let viewportOffsetX = 0;
  let viewportOffsetY = 0;
  let latestFrame = null;
  let bustYaw = 0;
  let bustFormationHoldYaw = 0;
  let lastBustProgress = 0;
  let dragging = false;
  let dragStart = null;
  let resumeAt = 0;
  let bufferRebuilds = 0;
  let frameStartedAt = performance.now();
  let lastFrameTime = 0;
  let bustFormationActive = false;
  const director = { active: false, yaw: 0, pitch: 0, distance: 0 };
  const directorTarget = new THREE.Vector3();
  const directorOffset = new THREE.Vector3();
  const directorEuler = new THREE.Euler(0, 0, 0, "YXZ");
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
    const ratio = Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    uniforms.pixelRatio.value = ratio;
  };
  const getShape = async (world, signal) => {
    const key = shapeCacheKey(world, quality);
    if (shapeCache.has(key)) return shapeCache.get(key);
    const worldSeeds = createAboutNarrativeSeeds(pointCount, world.seed);
    const promise = generateAboutNarrativeShape({
      shapeId: world.shapeId,
      pointCount,
      seeds: worldSeeds,
      quality,
      parameters: world.shapeParameters,
      signal
    }).catch((error) => {
      shapeCache.delete(key);
      throw error;
    });
    shapeCache.set(key, promise);
    return promise;
  };
  const installPreparedPair = (pair) => {
    if (disposed || !pair || installedPair?.key === pair.key) return;
    const attributes = {
      position: new THREE.BufferAttribute(pair.fromOutput.positions, 3),
      targetPosition: new THREE.BufferAttribute(pair.toOutput.positions, 3),
      fromPresence: new THREE.BufferAttribute(pair.fromOutput.presence, 1),
      toPresence: new THREE.BufferAttribute(pair.toOutput.presence, 1),
      fromPointSize: new THREE.BufferAttribute(pair.fromOutput.size, 1),
      toPointSize: new THREE.BufferAttribute(pair.toOutput.size, 1),
      fromGroup: new THREE.BufferAttribute(pair.fromOutput.attributes.disciplineGroup || emptyGroup, 1),
      toGroup: new THREE.BufferAttribute(pair.toOutput.attributes.disciplineGroup || emptyGroup, 1)
    };
    Object.entries(attributes).forEach(([name, attribute]) => geometry.setAttribute(name, attribute));
    captureDisciplinePositions(pair.fromOutput, fromDisciplinePositions);
    captureDisciplinePositions(pair.toOutput, toDisciplinePositions);
    installedPair = { ...pair, progress: 0 };
    bufferRebuilds += 1;
    root.dataset.worldBufferRebuilds = String(bufferRebuilds);
    root.dataset.pointAsset = pair.toOutput.fallbackReason ? "procedural-fallback" : pair.toWorld.shapeId;
    if (sequenceState !== "loading") root.dataset.worldPrepare = "ready";
    root.dataset.worldFrom = pair.fromWorld.shapeId;
    root.dataset.worldTo = pair.toWorld.shapeId;
    root.dataset.worldCorrespondence = pair.installedStrategy;
    root.dataset.worldCorrespondenceRequested = pair.requestedStrategy;
    root.dataset.worldCorrespondenceImprovement = Number(pair.metrics.improvement || 0).toFixed(4);
    root.dataset.worldCorrespondenceP95 = Number(pair.metrics.p95Distance || 0).toFixed(4);
    root.dataset.worldCorrespondenceMax = Number(pair.metrics.maxDistance || 0).toFixed(4);
    root.dataset.worldCorrespondenceFallback = pair.fallbackReason || "";
    root.dataset.worldCorrespondencePair = pair.key;
  };
  const createPreparedSequence = (key, sequence, outputs, workerPairs, startedAt) => {
    const pairs = /* @__PURE__ */ new Map();
    let orderedSource = outputs[0];
    let mainThreadApplicationMs = 0;
    workerPairs.forEach((workerPair, index) => {
      const toOutput = index === 0 ? outputs[0] : (() => {
        const applyStartedAt = performance.now();
        const mapped = applyAboutNarrativePermutation(outputs[index], workerPair.permutation);
        mainThreadApplicationMs += performance.now() - applyStartedAt;
        return mapped;
      })();
      const fromWorld = sequence[Math.max(0, index - 1)];
      const toWorld = sequence[index];
      pairs.set(toWorld.sectionId, {
        key: `${key}:${toWorld.sectionId}`,
        fromWorld,
        toWorld,
        fromOutput: orderedSource,
        toOutput,
        requestedStrategy: workerPair.requestedStrategy,
        installedStrategy: workerPair.installedStrategy,
        fallbackReason: workerPair.fallbackReason,
        metrics: workerPair.metrics
      });
      orderedSource = toOutput;
    });
    return {
      key,
      pairs,
      worldIds: sequence.map((world) => world.sectionId),
      preparationDurationMs: performance.now() - startedAt,
      mainThreadApplicationMs
    };
  };
  const failPreparation = (generation, error) => {
    if (disposed || generation !== preparationGeneration) return;
    pendingSequenceKey = "";
    sequenceState = "failed";
    correspondenceWorker?.terminate();
    correspondenceWorker = null;
    root.dataset.worldPrepare = "failed";
    root.dataset.worldError = error?.message || String(error);
    console.warn("[About narrative] Sequence preparation failed; retaining the last valid field.", error);
  };
  const prepareSequence = (sequence, globals) => {
    if (!sequence?.length) return "";
    const nextKey = createSequenceCacheKey(sequence, globals, quality, compact);
    if (pendingSequenceKey && pendingSequenceKey !== nextKey && (readySequence?.key === nextKey || sequenceCache.has(nextKey))) {
      preparationGeneration += 1;
      generationController?.abort();
      correspondenceWorker?.terminate();
      correspondenceWorker = null;
      pendingSequenceKey = "";
    }
    if (readySequence?.key === nextKey || pendingSequenceKey === nextKey) return nextKey;
    if (sequenceCache.has(nextKey)) {
      readySequence = sequenceCache.get(nextKey);
      touchBoundedCache(sequenceCache, nextKey, readySequence);
      sequenceState = "ready";
      root.dataset.worldPrepare = "ready";
      delete root.dataset.worldError;
      return nextKey;
    }
    const generation = ++preparationGeneration;
    const startedAt = performance.now();
    pendingSequenceKey = nextKey;
    sequenceState = "loading";
    generationController?.abort();
    correspondenceWorker?.terminate();
    correspondenceWorker = null;
    generationController = new AbortController();
    root.dataset.worldPrepare = "loading";
    const firstShapeStartedAt = performance.now();
    const firstShape = getShape(sequence[0], generationController.signal);
    root.dataset.worldBootstrapGenerationMs = (performance.now() - firstShapeStartedAt).toFixed(2);
    if (!installedPair) {
      firstShape.then((output) => {
        if (disposed || generation !== preparationGeneration || installedPair) return;
        installPreparedPair({
          key: `${nextKey}:${sequence[0].sectionId}:bootstrap`,
          fromWorld: sequence[0],
          toWorld: sequence[0],
          fromOutput: output,
          toOutput: output,
          requestedStrategy: "index-v1",
          installedStrategy: "index-v1",
          fallbackReason: "",
          metrics: {
            improvement: 0,
            p95Distance: 0,
            maxDistance: 0,
            weightedRmsDistance: 0,
            preparationDurationMs: 0
          }
        });
      }).catch(() => {
      });
    }
    firstShape.then(() => {
      if (disposed || generation !== preparationGeneration) return;
      const entries = sequence.map((world, index) => {
        const matrix = writeWorldTransform(
          index === 0 ? correspondenceFromTransform : correspondenceToTransform,
          world,
          globals,
          compact,
          index === 0 ? correspondenceFromScratch : correspondenceToScratch
        ).elements.slice();
        return {
          id: world.sectionId,
          mode: index === 0 ? "index-v1" : world.transitionIn?.correspondence || "index-v1",
          matrix,
          shapeId: world.shapeId,
          seed: world.seed,
          parameters: world.shapeParameters
        };
      });
      correspondenceWorker = new Worker(
        new URL(/* @vite-ignore */ "/src/routes/about-narrative-lab/aboutNarrativeCorrespondence.worker.js?worker_file&type=module", import.meta.url),
        { type: "module", name: "about-narrative-correspondence" }
      );
      correspondenceWorker.onmessage = (event) => {
        if (disposed || event.data?.generation !== preparationGeneration || generation !== preparationGeneration) return;
        if (event.data.error) {
          failPreparation(generation, new Error(event.data.error));
          return;
        }
        try {
          const prepared = createPreparedSequence(nextKey, sequence, event.data.outputs, event.data.pairs, startedAt);
          prepared.generationDurationMs = Number(event.data.generationDurationMs || 0);
          prepared.correspondenceDurationMs = Number(event.data.correspondenceDurationMs || 0);
          readySequence = prepared;
          sequencePreparationDurationMs = prepared.preparationDurationMs;
          touchBoundedCache(sequenceCache, nextKey, prepared);
          pendingSequenceKey = "";
          sequenceState = "ready";
          correspondenceWorker?.terminate();
          correspondenceWorker = null;
          root.dataset.worldPrepare = "ready";
          root.dataset.worldShapeGenerationMs = prepared.generationDurationMs.toFixed(2);
          root.dataset.worldCorrespondenceWorkerMs = prepared.correspondenceDurationMs.toFixed(2);
          root.dataset.worldCorrespondencePrepareMs = prepared.preparationDurationMs.toFixed(2);
          root.dataset.worldCorrespondenceApplyMs = prepared.mainThreadApplicationMs.toFixed(2);
          delete root.dataset.worldError;
        } catch (error) {
          failPreparation(generation, error);
        }
      };
      correspondenceWorker.onerror = (event) => failPreparation(generation, new Error(event.message));
      correspondenceWorker.postMessage({ generation, entries, pointCount, quality });
    }).catch((error) => {
      if (error?.name === "AbortError") {
        if (!disposed && generation === preparationGeneration) {
          pendingSequenceKey = "";
          sequenceState = "idle";
        }
        return;
      }
      if (disposed || generation !== preparationGeneration) return;
      failPreparation(generation, error);
    });
    return nextKey;
  };
  const setModifierUniforms = (prefix, world, globals) => {
    const swarm = modifier(world, "swarm-life-v1");
    const sharedSwarm = swarm ? resolveAboutNarrativeSwarmMotion(swarm, globals.swarmTurbulence) : null;
    const drift = sharedSwarm || modifier(world, "ambient-drift-v1");
    const wave = modifier(world, "living-wave-v1");
    const group = modifier(world, "group-emphasis-v1");
    const colour = modifier(world, "living-colour-v1");
    uniforms[`${prefix}DriftAmplitude`].value = Number(drift?.amplitude || 0);
    uniforms[`${prefix}DriftSpeed`].value = Number(drift?.speed || 0);
    uniforms[`${prefix}DriftIrregularity`].value = Number(sharedSwarm?.irregularity || 0);
    uniforms[`${prefix}DriftIndividuality`].value = Number(sharedSwarm?.individuality || 0);
    uniforms[`${prefix}DriftAxisSpread`].value = Number(sharedSwarm?.axisSpread || 0);
    uniforms[`${prefix}DriftStoryMix`].value = sharedSwarm ? sharedSwarm.storyMix : drift?.timeMode === "story" ? 1 : drift?.timeMode === "mixed" ? 0.08 : 0;
    uniforms[`${prefix}WaveWeight`].value = wave ? Number(wave.strength ?? 1) : 0;
    uniforms[`${prefix}WaveAmplitude`].value = Number(wave?.amplitude || 0);
    uniforms[`${prefix}WaveSpeed`].value = Number(wave?.speed || 0);
    uniforms[`${prefix}WaveFrequency`].value.set(
      Number(wave?.frequencyX || 1),
      Number(wave?.frequencyZ || 1)
    );
    uniforms[`${prefix}GroupStrength`].value = Number(group?.strength || 0);
    uniforms[`${prefix}LivingColour`].value = Number(colour?.strength || 0);
  };
  const resolveDisciplineStoryOffset = (frame, world, target) => {
    target.set(0, 0, 0);
    if (frame.reducedMotion || world?.shapeId !== "discipline-grid-v1") return 0;
    const storyTravel = Math.max(0, frame.storyWU - Number(world.startWU || 0)) * Number(frame.camera.cadence || 1);
    const riseStart = Math.max(0.04, Number(world.travelWU || 0.8) * 0.2);
    const extraRise = (compact ? 0.72 : 1.1) * smoothRange(storyTravel, riseStart, riseStart + (compact ? 0.9 : 1.15));
    const rise = storyTravel + extraRise;
    cameraUpScratch.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    target.copy(cameraUpScratch).multiplyScalar(rise);
    return rise;
  };
  const updateDisciplineReveal = (frame, fromWorld, toWorld) => {
    const revealState = frame.disciplineReveal;
    const reveal = revealState?.config;
    const overlay = disciplineOverlayRef?.current;
    const gridWorld = toWorld.shapeId === "discipline-grid-v1" ? toWorld : fromWorld.shapeId === "discipline-grid-v1" ? fromWorld : null;
    const gridTransform = gridWorld === toWorld ? uniforms.toTransform.value : uniforms.fromTransform.value;
    const gridDisciplinePositions = gridWorld === toWorld ? toDisciplinePositions : fromDisciplinePositions;
    const local = Number(revealState?.localProgress ?? -1);
    const revealAvailable = Boolean(reveal && gridWorld && local >= 0);
    const reducedActive = frame.reducedMotion && frame.sectionIndex === revealState?.sectionIndex;
    disciplineWeights.fill(0);
    let backgroundWeight = 0;
    let visibleLabels = 0;
    if (revealAvailable) {
      backgroundWeight = reducedActive ? 1 : smoothRange(local, reveal.start, reveal.start + reveal.backgroundFade);
      const lastRevealEnd = reveal.start + Math.max(0, reveal.items.length - 1) * reveal.stagger + reveal.labelDuration;
      const exitStart = Math.min(reveal.end, lastRevealEnd + reveal.hold);
      const exitProgress = reducedActive ? 0 : smoothRange(local, exitStart, reveal.end);
      reveal.items.forEach((item, orderIndex) => {
        const itemStart = reveal.start + orderIndex * reveal.stagger;
        const itemReveal = reducedActive ? 1 : smoothRange(local, itemStart, itemStart + reveal.labelDuration);
        disciplineWeights[item.group - 1] = itemReveal;
        const labelReveal = local <= reveal.end ? itemReveal * (1 - exitProgress) : 0;
        const label = overlay?.querySelector(`[data-discipline-group="${item.group}"]`);
        if (label) {
          label.style.setProperty("--discipline-reveal", labelReveal.toFixed(4));
          label.style.setProperty("--discipline-blur", `${((1 - labelReveal) * 7).toFixed(2)}px`);
          label.style.setProperty("--discipline-shift", `${((1 - labelReveal) * 12).toFixed(2)}px`);
        }
        if (labelReveal > 0.05) visibleLabels += 1;
      });
    }
    uniforms.disciplineRevealA.value.set(
      disciplineWeights[0],
      disciplineWeights[1],
      disciplineWeights[2]
    );
    uniforms.disciplineRevealB.value.set(
      disciplineWeights[3],
      disciplineWeights[4],
      disciplineWeights[5]
    );
    uniforms.disciplineRevealActive.value = revealAvailable ? 1 : 0;
    uniforms.disciplineBackgroundWeight.value = backgroundWeight;
    uniforms.disciplineBackgroundOpacity.value = Number(reveal?.backgroundOpacity ?? 0.06);
    uniforms.disciplinePointScale.value = Number(reveal?.pointScale ?? 3.6);
    if (overlay) {
      overlay.setAttribute("aria-hidden", visibleLabels > 0 ? "false" : "true");
      if (revealAvailable) {
        camera.updateMatrixWorld(true);
        for (let group = 1; group <= 6; group += 1) {
          const label = overlay.querySelector(`[data-discipline-group="${group}"]`);
          if (!label) continue;
          const offset = (group - 1) * 3;
          if (!Number.isFinite(gridDisciplinePositions[offset])) continue;
          disciplinePointScratch.set(
            gridDisciplinePositions[offset],
            gridDisciplinePositions[offset + 1],
            gridDisciplinePositions[offset + 2]
          ).applyMatrix4(gridTransform).project(camera);
          label.style.setProperty("--discipline-x", `${viewportOffsetX + (disciplinePointScratch.x * 0.5 + 0.5) * width}px`);
          label.style.setProperty("--discipline-y", `${viewportOffsetY + (-disciplinePointScratch.y * 0.5 + 0.5) * height}px`);
        }
      }
    }
    root.dataset.worldDisciplineVisible = String(disciplineWeights.reduce((count, value) => count + (value > 0.95 ? 1 : 0), 0));
    root.dataset.worldDisciplineLabels = String(visibleLabels);
    root.dataset.worldGridBackground = backgroundWeight.toFixed(4);
  };
  const render = (frame) => {
    latestFrame = frame;
    if (!frame || !contextAvailable || document.hidden) return;
    const requestedFromWorld = frame.world.from || frame.world.to;
    const requestedToWorld = frame.world.to || requestedFromWorld;
    if (!requestedFromWorld || !requestedToWorld) return;
    const requestedSequenceKey = prepareSequence(frame.world.sequence, frame.globals);
    const preparedPair = readySequence?.key === requestedSequenceKey ? readySequence.pairs.get(requestedToWorld.sectionId) : null;
    if (preparedPair && preparedPair.fromWorld.sectionId === requestedFromWorld.sectionId && preparedPair.toWorld.sectionId === requestedToWorld.sectionId) {
      installPreparedPair(preparedPair);
    }
    if (!installedPair) return;
    const pairMatchesRequest = installedPair.fromWorld.sectionId === requestedFromWorld.sectionId && installedPair.toWorld.sectionId === requestedToWorld.sectionId;
    const fromWorld = installedPair.fromWorld;
    const toWorld = installedPair.toWorld;
    const transitionProgress = pairMatchesRequest ? frame.world.transitionProgress : installedPair.progress;
    if (pairMatchesRequest) installedPair.progress = transitionProgress;
    const bust = modifier(toWorld, "bust-yaw-v1");
    const now = performance.now() / 1e3;
    const formingBust = toWorld.shapeId === "bust-v1" && transitionProgress < 0.9999;
    if (formingBust) {
      if (!bustFormationActive) {
        bustFormationHoldYaw = lastBustProgress >= 0.9999 ? bustYaw : 0;
      }
      bustYaw = bustFormationHoldYaw;
      bustFormationActive = true;
    } else if (bustFormationActive) {
      bustYaw = bustFormationHoldYaw;
      bustFormationActive = false;
      resumeAt = now + Number(bust?.resumeDelay || 0);
    } else if (!dragging && bust && !frame.reducedMotion && now >= resumeAt) {
      bustYaw += frame.deltaSeconds * Number(bust.speed || 0);
    }
    if (toWorld.shapeId === "bust-v1") {
      lastBustProgress = transitionProgress;
    } else {
      bustFormationActive = false;
      bustFormationHoldYaw = 0;
      lastBustProgress = 0;
      bustYaw = 0;
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
      fromStoryOffset
    );
    writeWorldTransform(
      uniforms.toTransform.value,
      toWorld,
      frame.globals,
      compact,
      toTransformScratch,
      toStoryOffset
    );
    root.dataset.worldDisciplineRise = Math.max(fromDisciplineRise, toDisciplineRise).toFixed(4);
    uniforms.morphProgress.value = transitionProgress;
    uniforms.storyTime.value = frame.storyTime;
    uniforms.ambientTime.value = frame.ambientTime;
    uniforms.pointSize.value = frame.globals.pointMaterial.pointSize;
    uniforms.fieldOpacity.value = frame.globals.pointMaterial.opacity;
    setModifierUniforms("from", fromWorld, frame.globals);
    setModifierUniforms("to", toWorld, frame.globals);
    if (frame.reducedMotion) {
      uniforms.fromDriftAmplitude.value = 0;
      uniforms.toDriftAmplitude.value = 0;
      uniforms.fromWaveSpeed.value = 0;
      uniforms.toWaveSpeed.value = 0;
    }
    uniforms.fromBust.value = fromWorld.shapeId === "bust-v1" ? 1 : 0;
    uniforms.toBust.value = toWorld.shapeId === "bust-v1" ? 1 : 0;
    uniforms.bustYaw.value = bustYaw;
    root.dataset.worldBustShaderYaw = bustYaw.toFixed(5);
    uniforms.disciplineFocus.value = Number(frame.editorialSignals?.disciplineFocus || 0);
    uniforms.gridInfluence.value = frame.reducedMotion ? 0 : Number(frame.editorialSignals?.gridInfluence || 0);
    root.dataset.worldGroupFocus = String(uniforms.disciplineFocus.value);
    root.dataset.worldGridInfluence = uniforms.gridInfluence.value.toFixed(4);
    updateDisciplineReveal(frame, fromWorld, toWorld);
    const interactionEnabled = pairMatchesRequest && !formingBust && frame.section.interaction?.type === "horizontal-spin" && frame.localProgress >= Number(frame.section.interaction.activationStart || 0);
    interaction.dataset.active = interactionEnabled ? "true" : "false";
    interaction.tabIndex = interactionEnabled ? 0 : -1;
    root.dataset.worldStage = toWorld.shapeId;
    root.dataset.cameraCadence = frame.globals.camera.cadenceLocked ? "locked-world-units-v1" : "editable-world-units-v1";
    root.style.setProperty("--narrative-camera-forward", (frame.globals.camera.startZ - frame.camera.position[2]).toFixed(4));
    root.style.setProperty("--narrative-camera-roll", frame.camera.roll.toFixed(4));
    root.style.setProperty("--narrative-camera-fov", frame.camera.fov.toFixed(2));
    root.style.setProperty("--narrative-bust-yaw", bustYaw.toFixed(4));
    frameStartedAt = performance.now();
    renderer.render(scene, camera);
    lastFrameTime = performance.now() - frameStartedAt;
  };
  const handlePointerDown = (event) => {
    if (interaction.dataset.active !== "true") return;
    dragStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, yaw: bustYaw };
    dragging = false;
  };
  const handlePointerMove = (event) => {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    if (!dragging && Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY)) {
      dragging = true;
      interaction.setPointerCapture(event.pointerId);
    }
    if (!dragging) return;
    event.preventDefault();
    const bust = modifier(latestFrame?.world?.to, "bust-yaw-v1");
    bustYaw = dragStart.yaw + deltaX / Math.max(320, width) * Math.PI * 2 * Number(bust?.dragSensitivity || 1);
  };
  const handlePointerEnd = (event) => {
    if (dragging && interaction.hasPointerCapture(event.pointerId)) interaction.releasePointerCapture(event.pointerId);
    const bust = modifier(latestFrame?.world?.to, "bust-yaw-v1");
    resumeAt = performance.now() / 1e3 + Number(bust?.resumeDelay || 0);
    dragStart = null;
    dragging = false;
  };
  const handleKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    bustYaw += event.key === "ArrowLeft" ? -0.16 : 0.16;
  };
  const handleContextLost = (event) => {
    event.preventDefault();
    contextAvailable = false;
    root.dataset.pointWorldState = "context-lost";
  };
  const handleContextRestored = () => {
    contextAvailable = true;
    root.dataset.pointWorldState = "ready";
    resize();
    updateTheme();
  };
  const resizeObserver = new ResizeObserver(resize);
  const themeObserver = new MutationObserver(updateTheme);
  resizeObserver.observe(root);
  resizeObserver.observe(canvas);
  themeObserver.observe(root, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  interaction.addEventListener("pointerdown", handlePointerDown);
  interaction.addEventListener("pointermove", handlePointerMove, { passive: false });
  interaction.addEventListener("pointerup", handlePointerEnd);
  interaction.addEventListener("pointercancel", handlePointerEnd);
  interaction.addEventListener("keydown", handleKeyDown);
  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);
  window.addEventListener("bb:paletteChanged", updateTheme);
  window.addEventListener("abs:theme-changed", updateTheme);
  resize();
  updateTheme();
  root.dataset.pointWorldState = "ready";
  runtimeRef.current = {
    render,
    getMetrics: () => ({
      adapterId: "point-field-v1",
      pointCount,
      drawCalls: renderer.info.render.calls,
      frameTimeMs: lastFrameTime,
      bufferRebuilds,
      cacheEntries: shapeCache.size,
      sequenceCacheEntries: sequenceCache.size,
      correspondenceSequenceState: sequenceState,
      correspondencePairId: installedPair?.key || "",
      correspondenceToWorldId: installedPair?.toWorld?.sectionId || "",
      correspondenceRequestedStrategy: installedPair?.requestedStrategy || "",
      correspondenceInstalledStrategy: installedPair?.installedStrategy || "",
      correspondenceFallback: installedPair?.fallbackReason || "",
      correspondenceImprovement: Number(installedPair?.metrics?.improvement || 0),
      correspondenceWeightedRms: Number(installedPair?.metrics?.weightedRmsDistance || 0),
      correspondenceP95: Number(installedPair?.metrics?.p95Distance || 0),
      correspondenceMax: Number(installedPair?.metrics?.maxDistance || 0),
      correspondenceLongPathRatio25: Number(installedPair?.metrics?.longPathRatio25 || 0),
      correspondenceLongPathRatio50: Number(installedPair?.metrics?.longPathRatio50 || 0),
      correspondencePreparationDurationMs: sequencePreparationDurationMs,
      correspondenceMainThreadApplicationMs: Number(readySequence?.mainThreadApplicationMs || 0),
      shapeGenerationDurationMs: Number(readySequence?.generationDurationMs || 0),
      correspondenceWorkerDurationMs: Number(readySequence?.correspondenceDurationMs || 0),
      preparedWorldIds: readySequence?.worldIds || [],
      activeModifiers: latestFrame?.world?.to?.modifiers?.filter((item) => item.enabled).length || 0
    }),
    frameSelectedWorld: () => null,
    setDirectorView: (active) => {
      director.active = Boolean(active);
    },
    nudgeDirector: ({ yaw = 0, pitch = 0, distance = 0 }) => {
      director.yaw += yaw;
      director.pitch = Math.max(-1.2, Math.min(1.2, director.pitch + pitch));
      director.distance += distance;
    },
    resetDirector: () => {
      director.yaw = 0;
      director.pitch = 0;
      director.distance = 0;
    }
  };
  return () => {
    disposed = true;
    generationController?.abort();
    correspondenceWorker?.terminate();
    runtimeRef.current = null;
    resizeObserver.disconnect();
    themeObserver.disconnect();
    interaction.removeEventListener("pointerdown", handlePointerDown);
    interaction.removeEventListener("pointermove", handlePointerMove);
    interaction.removeEventListener("pointerup", handlePointerEnd);
    interaction.removeEventListener("pointercancel", handlePointerEnd);
    interaction.removeEventListener("keydown", handleKeyDown);
    canvas.removeEventListener("webglcontextlost", handleContextLost);
    canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    window.removeEventListener("bb:paletteChanged", updateTheme);
    window.removeEventListener("abs:theme-changed", updateTheme);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
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
    root.style.removeProperty("--narrative-camera-forward");
    root.style.removeProperty("--narrative-camera-roll");
    root.style.removeProperty("--narrative-camera-fov");
    root.style.removeProperty("--narrative-bust-yaw");
  };
}
export function AboutNarrativePointWorld3D({ rootRef, interactionRef, disciplineOverlayRef, runtimeRef }) {
  _s();
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const interaction = interactionRef.current;
    if (!canvas || !root || !interaction) return void 0;
    try {
      return createPointFieldAdapter({ canvas, root, interaction, disciplineOverlayRef, runtimeRef });
    } catch (error) {
      root.dataset.pointWorldState = "unavailable";
      console.warn("[About narrative] Point world unavailable; continuing with editorial content.", error);
      return () => {
        delete root.dataset.pointWorldState;
      };
    }
  }, [disciplineOverlayRef, interactionRef, rootRef, runtimeRef]);
  return /* @__PURE__ */ jsxDEV("canvas", { ref: canvasRef, className: "about-narrative-world__canvas", "aria-hidden": "true" }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx",
    lineNumber: 1189,
    columnNumber: 10
  }, this);
}
_s(AboutNarrativePointWorld3D, "UJgi7ynoup7eqypjnwyX/s32POg=");
_c = AboutNarrativePointWorld3D;
var _c;
$RefreshReg$(_c, "AboutNarrativePointWorld3D");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBb3FDUzs7QUFwcUNULFNBQVNBLFdBQVdDLGNBQWM7QUFDbEMsWUFBWUMsV0FBVztBQUN2QjtBQUFBLEVBQ0VDO0FBQUFBLEVBQ0FDO0FBQUFBLE9BQ0s7QUFDUCxTQUFTQyx3Q0FBd0M7QUFDakQsU0FBU0Msc0NBQXNDO0FBQy9DLFNBQVNDLGtCQUFrQjtBQUUzQixNQUFNQyxzQkFBc0I7QUFDNUIsTUFBTUMscUJBQXFCO0FBQzNCLE1BQU1DLHNCQUFzQjtBQUM1QixNQUFNQyx1QkFBdUI7QUFDN0IsTUFBTUMseUJBQXlCO0FBQy9CLE1BQU1DLGlDQUFpQ0MsT0FBT0M7QUFBQUEsRUFBTztBQUFBLElBQ25ERCxPQUFPQyxPQUFPLEVBQUVDLFlBQVksR0FBR0MsUUFBUSxHQUFHLENBQUM7QUFBQSxJQUMzQ0gsT0FBT0MsT0FBTyxFQUFFQyxZQUFZLEdBQUdDLFFBQVEsR0FBRyxDQUFDO0FBQUEsSUFDM0NILE9BQU9DLE9BQU8sRUFBRUMsWUFBWSxHQUFHQyxRQUFRLEdBQUcsQ0FBQztBQUFBLElBQzNDSCxPQUFPQyxPQUFPLEVBQUVDLFlBQVksR0FBR0MsUUFBUSxHQUFHLENBQUM7QUFBQSxJQUMzQ0gsT0FBT0MsT0FBTyxFQUFFQyxZQUFZLEdBQUdDLFFBQVEsR0FBRyxDQUFDO0FBQUEsSUFDM0NILE9BQU9DLE9BQU8sRUFBRUMsWUFBWSxHQUFHQyxRQUFRLEdBQUcsQ0FBQztBQUFBLEVBQUM7QUFDN0M7QUFFRCxNQUFNQyxnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBdU10QixNQUFNQyxrQkFBa0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFjeEIsU0FBU0MsU0FBU0MsT0FBT0MsSUFBSTtBQUMzQixTQUFPRCxPQUFPRSxXQUFXQyxLQUFLLENBQUNDLFNBQVNB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QTtBQUFBLFNBQW9GO0FBQzdGO0FBQUNELEdBbEJlSCw0QkFBMEI7QUFBQSxLQUExQkE7QUFBMEIsSUFBQU07QUFBQSxhQUFBQSxJQUFBIiwibmFtZXMiOlsidXNlRWZmZWN0IiwidXNlUmVmIiwiVEhSRUUiLCJjcmVhdGVBYm91dE5hcnJhdGl2ZVNlZWRzIiwiZ2VuZXJhdGVBYm91dE5hcnJhdGl2ZVNoYXBlIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlU3dhcm1Nb3Rpb24iLCJhcHBseUFib3V0TmFycmF0aXZlUGVybXV0YXRpb24iLCJnZXRHbG9iYWxzIiwiREVTS1RPUF9QT0lOVF9DT1VOVCIsIk1PQklMRV9QT0lOVF9DT1VOVCIsIk1BVEVSSUFMX1NMT1RfQ09VTlQiLCJTRVFVRU5DRV9DQUNIRV9MSU1JVCIsIkNPUlJFU1BPTkRFTkNFX1ZFUlNJT04iLCJGQUxMQkFDS19NQVRFUklBTF9ESVNUUklCVVRJT04iLCJPYmplY3QiLCJmcmVlemUiLCJjb2xvckluZGV4Iiwid2VpZ2h0IiwiVkVSVEVYX1NIQURFUiIsIkZSQUdNRU5UX1NIQURFUiIsIm1vZGlmaWVyIiwid29ybGQiLCJpZCIsIm1vZGlmaWVycyIsImZpbmQiLCJpdGVtIiwiZW5hYmxlZCIsInBhcmFtZXRlcnMiLCJyZWFkQ29sb3JUb2tlbiIsInN0eWxlcyIsInRva2VuIiwiZmFsbGJhY2siLCJnZXRQcm9wZXJ0eVZhbHVlIiwidHJpbSIsImdldE1hdGVyaWFsRGlzdHJpYnV0aW9uIiwiY29uZmlndXJlZCIsImNvbG9yRGlzdHJpYnV0aW9uIiwidmFsaWQiLCJBcnJheSIsImlzQXJyYXkiLCJmaWx0ZXIiLCJyb3ciLCJOdW1iZXIiLCJzbGljZSIsImxlbmd0aCIsInN5bmNNYXRlcmlhbFBhbGV0dGUiLCJ1bmlmb3JtcyIsImRpc3RyaWJ1dGlvbiIsIndlaWdodHMiLCJtYXAiLCJ0b3RhbCIsInJlZHVjZSIsInN1bSIsImN1bXVsYXRpdmUiLCJmb3JFYWNoIiwiaW5kZXgiLCJNYXRoIiwibWF4IiwibWluIiwiZmxvb3IiLCJmYWxsYmFja0luZGV4IiwiY29sb3IiLCJ2YWx1ZSIsInNldFN0eWxlIiwiZGlzY2lwbGluZVRva2VucyIsImRpc2NpcGxpbmVGYWxsYmFja3MiLCJjcmVhdGVFbXB0eUF0dHJpYnV0ZSIsImNvdW50IiwiRmxvYXQzMkFycmF5IiwiZmlsbCIsInNoYXBlQ2FjaGVLZXkiLCJxdWFsaXR5IiwiSlNPTiIsInN0cmluZ2lmeSIsInNoYXBlSWQiLCJzZWVkIiwic2hhcGVQYXJhbWV0ZXJzIiwiY3JlYXRlU2VxdWVuY2VDYWNoZUtleSIsInNlcXVlbmNlIiwiZ2xvYmFscyIsImNvbXBhY3QiLCJjYW1lcmEiLCJzdGFydFoiLCJjYWRlbmNlIiwic2VjdGlvbklkIiwidHJhbnNpdGlvbkluIiwiY29ycmVzcG9uZGVuY2UiLCJzdGFydFdVIiwiZW50cnlEaXN0YW5jZVdVIiwidHJhbnNmb3JtIiwicG9zaXRpb24iLCJyb3RhdGlvbiIsInNjYWxlIiwibW9iaWxlU2NhbGUiLCJtb2JpbGVZT2Zmc2V0IiwidG91Y2hCb3VuZGVkQ2FjaGUiLCJjYWNoZSIsImtleSIsImRlbGV0ZSIsInNldCIsInNpemUiLCJrZXlzIiwibmV4dCIsIndyaXRlV29ybGRUcmFuc2Zvcm0iLCJ0YXJnZXQiLCJzY3JhdGNoIiwic3RvcnlPZmZzZXQiLCJpZGVudGl0eSIsImJhc2VTY2FsZSIsImlzRmluaXRlIiwiZW50cnlDYW1lcmFaIiwiYWRkIiwiZXVsZXIiLCJxdWF0ZXJuaW9uIiwic2V0RnJvbUV1bGVyIiwiY29tcG9zZSIsImNyZWF0ZVRyYW5zZm9ybVNjcmF0Y2giLCJWZWN0b3IzIiwiUXVhdGVybmlvbiIsIkV1bGVyIiwic21vb3RoUmFuZ2UiLCJmcm9tIiwidG8iLCJwcm9ncmVzcyIsImNhcHR1cmVEaXNjaXBsaW5lUG9zaXRpb25zIiwib3V0cHV0IiwiTmFOIiwiZ3JvdXBzIiwiYXR0cmlidXRlcyIsImRpc2NpcGxpbmVHcm91cCIsImdyb3VwIiwicm91bmQiLCJzb3VyY2VPZmZzZXQiLCJ0YXJnZXRPZmZzZXQiLCJwb3NpdGlvbnMiLCJjcmVhdGVQb2ludEZpZWxkQWRhcHRlciIsImNhbnZhcyIsInJvb3QiLCJpbnRlcmFjdGlvbiIsImRpc2NpcGxpbmVPdmVybGF5UmVmIiwicnVudGltZVJlZiIsIndpbmRvdyIsIm1hdGNoTWVkaWEiLCJtYXRjaGVzIiwicG9pbnRDb3VudCIsInJlbmRlcmVyIiwiV2ViR0xSZW5kZXJlciIsImFscGhhIiwiYW50aWFsaWFzIiwicG93ZXJQcmVmZXJlbmNlIiwic2NlbmUiLCJTY2VuZSIsIlBlcnNwZWN0aXZlQ2FtZXJhIiwiZ2VvbWV0cnkiLCJCdWZmZXJHZW9tZXRyeSIsInNlZWRzIiwiZW1wdHlQb3NpdGlvbnMiLCJlbXB0eVByZXNlbmNlIiwiZW1wdHlTaXplIiwiZW1wdHlHcm91cCIsImZyb21UcmFuc2Zvcm0iLCJNYXRyaXg0IiwidG9UcmFuc2Zvcm0iLCJtb3JwaFByb2dyZXNzIiwic3RvcnlUaW1lIiwiYW1iaWVudFRpbWUiLCJwb2ludFNpemUiLCJwaXhlbFJhdGlvIiwiZnJvbURyaWZ0QW1wbGl0dWRlIiwidG9EcmlmdEFtcGxpdHVkZSIsImZyb21EcmlmdFNwZWVkIiwidG9EcmlmdFNwZWVkIiwiZnJvbURyaWZ0SXJyZWd1bGFyaXR5IiwidG9EcmlmdElycmVndWxhcml0eSIsImZyb21EcmlmdEluZGl2aWR1YWxpdHkiLCJ0b0RyaWZ0SW5kaXZpZHVhbGl0eSIsImZyb21EcmlmdEF4aXNTcHJlYWQiLCJ0b0RyaWZ0QXhpc1NwcmVhZCIsImZyb21EcmlmdFN0b3J5TWl4IiwidG9EcmlmdFN0b3J5TWl4IiwiZnJvbVdhdmVXZWlnaHQiLCJ0b1dhdmVXZWlnaHQiLCJmcm9tV2F2ZUFtcGxpdHVkZSIsInRvV2F2ZUFtcGxpdHVkZSIsImZyb21XYXZlU3BlZWQiLCJ0b1dhdmVTcGVlZCIsImZyb21XYXZlRnJlcXVlbmN5IiwiVmVjdG9yMiIsInRvV2F2ZUZyZXF1ZW5jeSIsImZyb21Hcm91cFN0cmVuZ3RoIiwidG9Hcm91cFN0cmVuZ3RoIiwiZGlzY2lwbGluZUZvY3VzIiwiZ3JpZEluZmx1ZW5jZSIsImRpc2NpcGxpbmVSZXZlYWxBIiwiZGlzY2lwbGluZVJldmVhbEIiLCJkaXNjaXBsaW5lUmV2ZWFsQWN0aXZlIiwiZGlzY2lwbGluZUJhY2tncm91bmRXZWlnaHQiLCJkaXNjaXBsaW5lQmFja2dyb3VuZE9wYWNpdHkiLCJkaXNjaXBsaW5lUG9pbnRTY2FsZSIsImZyb21MaXZpbmdDb2xvdXIiLCJ0b0xpdmluZ0NvbG91ciIsImZyb21CdXN0IiwidG9CdXN0IiwiYnVzdFlhdyIsIm1hdGVyaWFsQ29sb3IxIiwiQ29sb3IiLCJtYXRlcmlhbENvbG9yMiIsIm1hdGVyaWFsQ29sb3IzIiwibWF0ZXJpYWxDb2xvcjQiLCJtYXRlcmlhbENvbG9yNSIsIm1hdGVyaWFsQ29sb3I2IiwiZGlzY2lwbGluZUNvbG9yMSIsImRpc2NpcGxpbmVDb2xvcjIiLCJkaXNjaXBsaW5lQ29sb3IzIiwiZGlzY2lwbGluZUNvbG9yNCIsImRpc2NpcGxpbmVDb2xvcjUiLCJkaXNjaXBsaW5lQ29sb3I2IiwibWF0ZXJpYWxUaHJlc2hvbGQxIiwibWF0ZXJpYWxUaHJlc2hvbGQyIiwibWF0ZXJpYWxUaHJlc2hvbGQzIiwibWF0ZXJpYWxUaHJlc2hvbGQ0IiwibWF0ZXJpYWxUaHJlc2hvbGQ1IiwiZmllbGRPcGFjaXR5IiwibWF0ZXJpYWwiLCJTaGFkZXJNYXRlcmlhbCIsInZlcnRleFNoYWRlciIsImZyYWdtZW50U2hhZGVyIiwidHJhbnNwYXJlbnQiLCJkZXB0aFdyaXRlIiwiYmxlbmRpbmciLCJOb3JtYWxCbGVuZGluZyIsInNldEF0dHJpYnV0ZSIsIkJ1ZmZlckF0dHJpYnV0ZSIsInBvaW50cyIsIlBvaW50cyIsImZydXN0dW1DdWxsZWQiLCJzaGFwZUNhY2hlIiwiTWFwIiwic2VxdWVuY2VDYWNoZSIsImluc3RhbGxlZFBhaXIiLCJyZWFkeVNlcXVlbmNlIiwicGVuZGluZ1NlcXVlbmNlS2V5IiwiZ2VuZXJhdGlvbkNvbnRyb2xsZXIiLCJjb3JyZXNwb25kZW5jZVdvcmtlciIsInByZXBhcmF0aW9uR2VuZXJhdGlvbiIsInNlcXVlbmNlU3RhdGUiLCJzZXF1ZW5jZVByZXBhcmF0aW9uRHVyYXRpb25NcyIsImRpc3Bvc2VkIiwiY29udGV4dEF2YWlsYWJsZSIsIndpZHRoIiwiaGVpZ2h0Iiwidmlld3BvcnRPZmZzZXRYIiwidmlld3BvcnRPZmZzZXRZIiwibGF0ZXN0RnJhbWUiLCJidXN0Rm9ybWF0aW9uSG9sZFlhdyIsImxhc3RCdXN0UHJvZ3Jlc3MiLCJkcmFnZ2luZyIsImRyYWdTdGFydCIsInJlc3VtZUF0IiwiYnVmZmVyUmVidWlsZHMiLCJmcmFtZVN0YXJ0ZWRBdCIsInBlcmZvcm1hbmNlIiwibm93IiwibGFzdEZyYW1lVGltZSIsImJ1c3RGb3JtYXRpb25BY3RpdmUiLCJkaXJlY3RvciIsImFjdGl2ZSIsInlhdyIsInBpdGNoIiwiZGlzdGFuY2UiLCJkaXJlY3RvclRhcmdldCIsImRpcmVjdG9yT2Zmc2V0IiwiZGlyZWN0b3JFdWxlciIsImZyb21UcmFuc2Zvcm1TY3JhdGNoIiwidG9UcmFuc2Zvcm1TY3JhdGNoIiwiY29ycmVzcG9uZGVuY2VGcm9tVHJhbnNmb3JtIiwiY29ycmVzcG9uZGVuY2VUb1RyYW5zZm9ybSIsImNvcnJlc3BvbmRlbmNlRnJvbVNjcmF0Y2giLCJjb3JyZXNwb25kZW5jZVRvU2NyYXRjaCIsImRpc2NpcGxpbmVQb2ludFNjcmF0Y2giLCJmcm9tU3RvcnlPZmZzZXQiLCJ0b1N0b3J5T2Zmc2V0IiwiY2FtZXJhVXBTY3JhdGNoIiwiZGlzY2lwbGluZVdlaWdodHMiLCJmcm9tRGlzY2lwbGluZVBvc2l0aW9ucyIsInRvRGlzY2lwbGluZVBvc2l0aW9ucyIsInVwZGF0ZVRoZW1lIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsInJlc2l6ZSIsInJvb3RSZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwiY2FudmFzUmVjdCIsImxlZnQiLCJ0b3AiLCJyYXRpbyIsImRldmljZVBpeGVsUmF0aW8iLCJzZXRQaXhlbFJhdGlvIiwic2V0U2l6ZSIsImFzcGVjdCIsInVwZGF0ZVByb2plY3Rpb25NYXRyaXgiLCJnZXRTaGFwZSIsInNpZ25hbCIsImhhcyIsImdldCIsIndvcmxkU2VlZHMiLCJwcm9taXNlIiwiY2F0Y2giLCJlcnJvciIsImluc3RhbGxQcmVwYXJlZFBhaXIiLCJwYWlyIiwiZnJvbU91dHB1dCIsInRhcmdldFBvc2l0aW9uIiwidG9PdXRwdXQiLCJmcm9tUHJlc2VuY2UiLCJwcmVzZW5jZSIsInRvUHJlc2VuY2UiLCJmcm9tUG9pbnRTaXplIiwidG9Qb2ludFNpemUiLCJmcm9tR3JvdXAiLCJ0b0dyb3VwIiwiZW50cmllcyIsIm5hbWUiLCJhdHRyaWJ1dGUiLCJkYXRhc2V0Iiwid29ybGRCdWZmZXJSZWJ1aWxkcyIsIlN0cmluZyIsInBvaW50QXNzZXQiLCJmYWxsYmFja1JlYXNvbiIsInRvV29ybGQiLCJ3b3JsZFByZXBhcmUiLCJ3b3JsZEZyb20iLCJmcm9tV29ybGQiLCJ3b3JsZFRvIiwid29ybGRDb3JyZXNwb25kZW5jZSIsImluc3RhbGxlZFN0cmF0ZWd5Iiwid29ybGRDb3JyZXNwb25kZW5jZVJlcXVlc3RlZCIsInJlcXVlc3RlZFN0cmF0ZWd5Iiwid29ybGRDb3JyZXNwb25kZW5jZUltcHJvdmVtZW50IiwibWV0cmljcyIsImltcHJvdmVtZW50IiwidG9GaXhlZCIsIndvcmxkQ29ycmVzcG9uZGVuY2VQOTUiLCJwOTVEaXN0YW5jZSIsIndvcmxkQ29ycmVzcG9uZGVuY2VNYXgiLCJtYXhEaXN0YW5jZSIsIndvcmxkQ29ycmVzcG9uZGVuY2VGYWxsYmFjayIsIndvcmxkQ29ycmVzcG9uZGVuY2VQYWlyIiwiY3JlYXRlUHJlcGFyZWRTZXF1ZW5jZSIsIm91dHB1dHMiLCJ3b3JrZXJQYWlycyIsInN0YXJ0ZWRBdCIsInBhaXJzIiwib3JkZXJlZFNvdXJjZSIsIm1haW5UaHJlYWRBcHBsaWNhdGlvbk1zIiwid29ya2VyUGFpciIsImFwcGx5U3RhcnRlZEF0IiwibWFwcGVkIiwicGVybXV0YXRpb24iLCJ3b3JsZElkcyIsInByZXBhcmF0aW9uRHVyYXRpb25NcyIsImZhaWxQcmVwYXJhdGlvbiIsImdlbmVyYXRpb24iLCJ0ZXJtaW5hdGUiLCJ3b3JsZEVycm9yIiwibWVzc2FnZSIsImNvbnNvbGUiLCJ3YXJuIiwicHJlcGFyZVNlcXVlbmNlIiwibmV4dEtleSIsImFib3J0IiwiQWJvcnRDb250cm9sbGVyIiwiZmlyc3RTaGFwZVN0YXJ0ZWRBdCIsImZpcnN0U2hhcGUiLCJ3b3JsZEJvb3RzdHJhcEdlbmVyYXRpb25NcyIsInRoZW4iLCJ3ZWlnaHRlZFJtc0Rpc3RhbmNlIiwibWF0cml4IiwiZWxlbWVudHMiLCJtb2RlIiwiV29ya2VyIiwiVVJMIiwiaW1wb3J0IiwidXJsIiwidHlwZSIsIm9ubWVzc2FnZSIsImV2ZW50IiwiZGF0YSIsIkVycm9yIiwicHJlcGFyZWQiLCJnZW5lcmF0aW9uRHVyYXRpb25NcyIsImNvcnJlc3BvbmRlbmNlRHVyYXRpb25NcyIsIndvcmxkU2hhcGVHZW5lcmF0aW9uTXMiLCJ3b3JsZENvcnJlc3BvbmRlbmNlV29ya2VyTXMiLCJ3b3JsZENvcnJlc3BvbmRlbmNlUHJlcGFyZU1zIiwid29ybGRDb3JyZXNwb25kZW5jZUFwcGx5TXMiLCJvbmVycm9yIiwicG9zdE1lc3NhZ2UiLCJzZXRNb2RpZmllclVuaWZvcm1zIiwicHJlZml4Iiwic3dhcm0iLCJzaGFyZWRTd2FybSIsInN3YXJtVHVyYnVsZW5jZSIsImRyaWZ0Iiwid2F2ZSIsImNvbG91ciIsImFtcGxpdHVkZSIsInNwZWVkIiwiaXJyZWd1bGFyaXR5IiwiaW5kaXZpZHVhbGl0eSIsImF4aXNTcHJlYWQiLCJzdG9yeU1peCIsInRpbWVNb2RlIiwic3RyZW5ndGgiLCJmcmVxdWVuY3lYIiwiZnJlcXVlbmN5WiIsInJlc29sdmVEaXNjaXBsaW5lU3RvcnlPZmZzZXQiLCJmcmFtZSIsInJlZHVjZWRNb3Rpb24iLCJzdG9yeVRyYXZlbCIsInN0b3J5V1UiLCJyaXNlU3RhcnQiLCJ0cmF2ZWxXVSIsImV4dHJhUmlzZSIsInJpc2UiLCJhcHBseVF1YXRlcm5pb24iLCJub3JtYWxpemUiLCJjb3B5IiwibXVsdGlwbHlTY2FsYXIiLCJ1cGRhdGVEaXNjaXBsaW5lUmV2ZWFsIiwicmV2ZWFsU3RhdGUiLCJkaXNjaXBsaW5lUmV2ZWFsIiwicmV2ZWFsIiwiY29uZmlnIiwib3ZlcmxheSIsImN1cnJlbnQiLCJncmlkV29ybGQiLCJncmlkVHJhbnNmb3JtIiwiZ3JpZERpc2NpcGxpbmVQb3NpdGlvbnMiLCJsb2NhbCIsImxvY2FsUHJvZ3Jlc3MiLCJyZXZlYWxBdmFpbGFibGUiLCJCb29sZWFuIiwicmVkdWNlZEFjdGl2ZSIsInNlY3Rpb25JbmRleCIsImJhY2tncm91bmRXZWlnaHQiLCJ2aXNpYmxlTGFiZWxzIiwic3RhcnQiLCJiYWNrZ3JvdW5kRmFkZSIsImxhc3RSZXZlYWxFbmQiLCJpdGVtcyIsInN0YWdnZXIiLCJsYWJlbER1cmF0aW9uIiwiZXhpdFN0YXJ0IiwiZW5kIiwiaG9sZCIsImV4aXRQcm9ncmVzcyIsIm9yZGVySW5kZXgiLCJpdGVtU3RhcnQiLCJpdGVtUmV2ZWFsIiwibGFiZWxSZXZlYWwiLCJsYWJlbCIsInF1ZXJ5U2VsZWN0b3IiLCJzdHlsZSIsInNldFByb3BlcnR5IiwiYmFja2dyb3VuZE9wYWNpdHkiLCJwb2ludFNjYWxlIiwidXBkYXRlTWF0cml4V29ybGQiLCJvZmZzZXQiLCJhcHBseU1hdHJpeDQiLCJwcm9qZWN0IiwieCIsInkiLCJ3b3JsZERpc2NpcGxpbmVWaXNpYmxlIiwid29ybGREaXNjaXBsaW5lTGFiZWxzIiwid29ybGRHcmlkQmFja2dyb3VuZCIsInJlbmRlciIsImRvY3VtZW50IiwiaGlkZGVuIiwicmVxdWVzdGVkRnJvbVdvcmxkIiwicmVxdWVzdGVkVG9Xb3JsZCIsInJlcXVlc3RlZFNlcXVlbmNlS2V5IiwicHJlcGFyZWRQYWlyIiwicGFpck1hdGNoZXNSZXF1ZXN0IiwidHJhbnNpdGlvblByb2dyZXNzIiwiYnVzdCIsImZvcm1pbmdCdXN0IiwicmVzdW1lRGVsYXkiLCJkZWx0YVNlY29uZHMiLCJmcm9tQXJyYXkiLCJ1cCIsInNpbiIsInJvbGwiLCJjb3MiLCJsb29rQXQiLCJzdWIiLCJhcHBseUV1bGVyIiwic2V0TGVuZ3RoIiwiZm92IiwiZnJvbURpc2NpcGxpbmVSaXNlIiwidG9EaXNjaXBsaW5lUmlzZSIsIndvcmxkRGlzY2lwbGluZVJpc2UiLCJwb2ludE1hdGVyaWFsIiwib3BhY2l0eSIsIndvcmxkQnVzdFNoYWRlcllhdyIsImVkaXRvcmlhbFNpZ25hbHMiLCJ3b3JsZEdyb3VwRm9jdXMiLCJ3b3JsZEdyaWRJbmZsdWVuY2UiLCJpbnRlcmFjdGlvbkVuYWJsZWQiLCJzZWN0aW9uIiwiYWN0aXZhdGlvblN0YXJ0IiwidGFiSW5kZXgiLCJ3b3JsZFN0YWdlIiwiY2FtZXJhQ2FkZW5jZSIsImNhZGVuY2VMb2NrZWQiLCJoYW5kbGVQb2ludGVyRG93biIsInBvaW50ZXJJZCIsImNsaWVudFgiLCJjbGllbnRZIiwiaGFuZGxlUG9pbnRlck1vdmUiLCJkZWx0YVgiLCJkZWx0YVkiLCJhYnMiLCJzZXRQb2ludGVyQ2FwdHVyZSIsInByZXZlbnREZWZhdWx0IiwiUEkiLCJkcmFnU2Vuc2l0aXZpdHkiLCJoYW5kbGVQb2ludGVyRW5kIiwiaGFzUG9pbnRlckNhcHR1cmUiLCJyZWxlYXNlUG9pbnRlckNhcHR1cmUiLCJoYW5kbGVLZXlEb3duIiwiaW5jbHVkZXMiLCJoYW5kbGVDb250ZXh0TG9zdCIsInBvaW50V29ybGRTdGF0ZSIsImhhbmRsZUNvbnRleHRSZXN0b3JlZCIsInJlc2l6ZU9ic2VydmVyIiwiUmVzaXplT2JzZXJ2ZXIiLCJ0aGVtZU9ic2VydmVyIiwiTXV0YXRpb25PYnNlcnZlciIsIm9ic2VydmUiLCJhdHRyaWJ1dGVGaWx0ZXIiLCJhZGRFdmVudExpc3RlbmVyIiwicGFzc2l2ZSIsImdldE1ldHJpY3MiLCJhZGFwdGVySWQiLCJkcmF3Q2FsbHMiLCJpbmZvIiwiY2FsbHMiLCJmcmFtZVRpbWVNcyIsImNhY2hlRW50cmllcyIsInNlcXVlbmNlQ2FjaGVFbnRyaWVzIiwiY29ycmVzcG9uZGVuY2VTZXF1ZW5jZVN0YXRlIiwiY29ycmVzcG9uZGVuY2VQYWlySWQiLCJjb3JyZXNwb25kZW5jZVRvV29ybGRJZCIsImNvcnJlc3BvbmRlbmNlUmVxdWVzdGVkU3RyYXRlZ3kiLCJjb3JyZXNwb25kZW5jZUluc3RhbGxlZFN0cmF0ZWd5IiwiY29ycmVzcG9uZGVuY2VGYWxsYmFjayIsImNvcnJlc3BvbmRlbmNlSW1wcm92ZW1lbnQiLCJjb3JyZXNwb25kZW5jZVdlaWdodGVkUm1zIiwiY29ycmVzcG9uZGVuY2VQOTUiLCJjb3JyZXNwb25kZW5jZU1heCIsImNvcnJlc3BvbmRlbmNlTG9uZ1BhdGhSYXRpbzI1IiwibG9uZ1BhdGhSYXRpbzI1IiwiY29ycmVzcG9uZGVuY2VMb25nUGF0aFJhdGlvNTAiLCJsb25nUGF0aFJhdGlvNTAiLCJjb3JyZXNwb25kZW5jZVByZXBhcmF0aW9uRHVyYXRpb25NcyIsImNvcnJlc3BvbmRlbmNlTWFpblRocmVhZEFwcGxpY2F0aW9uTXMiLCJzaGFwZUdlbmVyYXRpb25EdXJhdGlvbk1zIiwiY29ycmVzcG9uZGVuY2VXb3JrZXJEdXJhdGlvbk1zIiwicHJlcGFyZWRXb3JsZElkcyIsImFjdGl2ZU1vZGlmaWVycyIsImZyYW1lU2VsZWN0ZWRXb3JsZCIsInNldERpcmVjdG9yVmlldyIsIm51ZGdlRGlyZWN0b3IiLCJyZXNldERpcmVjdG9yIiwiZGlzY29ubmVjdCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJkaXNwb3NlIiwicmVtb3ZlUHJvcGVydHkiLCJBYm91dE5hcnJhdGl2ZVBvaW50V29ybGQzRCIsInJvb3RSZWYiLCJpbnRlcmFjdGlvblJlZiIsIl9zIiwiY2FudmFzUmVmIiwidW5kZWZpbmVkIiwiX2MiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQWJvdXROYXJyYXRpdmVQb2ludFdvcmxkM0QuanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZUVmZmVjdCwgdXNlUmVmIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0ICogYXMgVEhSRUUgZnJvbSAndGhyZWUnO1xuaW1wb3J0IHtcbiAgY3JlYXRlQWJvdXROYXJyYXRpdmVTZWVkcyxcbiAgZ2VuZXJhdGVBYm91dE5hcnJhdGl2ZVNoYXBlLFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlUG9pbnRTaGFwZXMuanMnO1xuaW1wb3J0IHsgcmVzb2x2ZUFib3V0TmFycmF0aXZlU3dhcm1Nb3Rpb24gfSBmcm9tICcuL2Fib3V0TmFycmF0aXZlRGVmaW5pdGlvbnMuanMnO1xuaW1wb3J0IHsgYXBwbHlBYm91dE5hcnJhdGl2ZVBlcm11dGF0aW9uIH0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZUNvcnJlc3BvbmRlbmNlLmpzJztcbmltcG9ydCB7IGdldEdsb2JhbHMgfSBmcm9tICcuLi8uLi9sZWdhY3kvbW9kdWxlcy9jb3JlL3N0YXRlLmpzJztcblxuY29uc3QgREVTS1RPUF9QT0lOVF9DT1VOVCA9IDEyMDAwO1xuY29uc3QgTU9CSUxFX1BPSU5UX0NPVU5UID0gNTAwMDtcbmNvbnN0IE1BVEVSSUFMX1NMT1RfQ09VTlQgPSA2O1xuY29uc3QgU0VRVUVOQ0VfQ0FDSEVfTElNSVQgPSAzO1xuY29uc3QgQ09SUkVTUE9OREVOQ0VfVkVSU0lPTiA9ICdzcGF0aWFsLW5lYXJlc3QtdjEuMC4wJztcbmNvbnN0IEZBTExCQUNLX01BVEVSSUFMX0RJU1RSSUJVVElPTiA9IE9iamVjdC5mcmVlemUoW1xuICBPYmplY3QuZnJlZXplKHsgY29sb3JJbmRleDogMCwgd2VpZ2h0OiAzMSB9KSxcbiAgT2JqZWN0LmZyZWV6ZSh7IGNvbG9ySW5kZXg6IDMsIHdlaWdodDogMTMgfSksXG4gIE9iamVjdC5mcmVlemUoeyBjb2xvckluZGV4OiAyLCB3ZWlnaHQ6IDE2IH0pLFxuICBPYmplY3QuZnJlZXplKHsgY29sb3JJbmRleDogNiwgd2VpZ2h0OiAyMCB9KSxcbiAgT2JqZWN0LmZyZWV6ZSh7IGNvbG9ySW5kZXg6IDcsIHdlaWdodDogMTAgfSksXG4gIE9iamVjdC5mcmVlemUoeyBjb2xvckluZGV4OiA1LCB3ZWlnaHQ6IDEwIH0pLFxuXSk7XG5cbmNvbnN0IFZFUlRFWF9TSEFERVIgPSBgXG4gIGF0dHJpYnV0ZSB2ZWMzIHRhcmdldFBvc2l0aW9uO1xuICBhdHRyaWJ1dGUgZmxvYXQgcG9pbnRTZWVkO1xuICBhdHRyaWJ1dGUgZmxvYXQgZnJvbVByZXNlbmNlO1xuICBhdHRyaWJ1dGUgZmxvYXQgdG9QcmVzZW5jZTtcbiAgYXR0cmlidXRlIGZsb2F0IGZyb21Qb2ludFNpemU7XG4gIGF0dHJpYnV0ZSBmbG9hdCB0b1BvaW50U2l6ZTtcbiAgYXR0cmlidXRlIGZsb2F0IGZyb21Hcm91cDtcbiAgYXR0cmlidXRlIGZsb2F0IHRvR3JvdXA7XG4gIHVuaWZvcm0gbWF0NCBmcm9tVHJhbnNmb3JtO1xuICB1bmlmb3JtIG1hdDQgdG9UcmFuc2Zvcm07XG4gIHVuaWZvcm0gZmxvYXQgbW9ycGhQcm9ncmVzcztcbiAgdW5pZm9ybSBmbG9hdCBzdG9yeVRpbWU7XG4gIHVuaWZvcm0gZmxvYXQgYW1iaWVudFRpbWU7XG4gIHVuaWZvcm0gZmxvYXQgcG9pbnRTaXplO1xuICB1bmlmb3JtIGZsb2F0IHBpeGVsUmF0aW87XG4gIHVuaWZvcm0gZmxvYXQgZnJvbURyaWZ0QW1wbGl0dWRlO1xuICB1bmlmb3JtIGZsb2F0IHRvRHJpZnRBbXBsaXR1ZGU7XG4gIHVuaWZvcm0gZmxvYXQgZnJvbURyaWZ0U3BlZWQ7XG4gIHVuaWZvcm0gZmxvYXQgdG9EcmlmdFNwZWVkO1xuICB1bmlmb3JtIGZsb2F0IGZyb21EcmlmdElycmVndWxhcml0eTtcbiAgdW5pZm9ybSBmbG9hdCB0b0RyaWZ0SXJyZWd1bGFyaXR5O1xuICB1bmlmb3JtIGZsb2F0IGZyb21EcmlmdEluZGl2aWR1YWxpdHk7XG4gIHVuaWZvcm0gZmxvYXQgdG9EcmlmdEluZGl2aWR1YWxpdHk7XG4gIHVuaWZvcm0gZmxvYXQgZnJvbURyaWZ0QXhpc1NwcmVhZDtcbiAgdW5pZm9ybSBmbG9hdCB0b0RyaWZ0QXhpc1NwcmVhZDtcbiAgdW5pZm9ybSBmbG9hdCBmcm9tRHJpZnRTdG9yeU1peDtcbiAgdW5pZm9ybSBmbG9hdCB0b0RyaWZ0U3RvcnlNaXg7XG4gIHVuaWZvcm0gZmxvYXQgZnJvbVdhdmVXZWlnaHQ7XG4gIHVuaWZvcm0gZmxvYXQgdG9XYXZlV2VpZ2h0O1xuICB1bmlmb3JtIGZsb2F0IGZyb21XYXZlQW1wbGl0dWRlO1xuICB1bmlmb3JtIGZsb2F0IHRvV2F2ZUFtcGxpdHVkZTtcbiAgdW5pZm9ybSBmbG9hdCBmcm9tV2F2ZVNwZWVkO1xuICB1bmlmb3JtIGZsb2F0IHRvV2F2ZVNwZWVkO1xuICB1bmlmb3JtIHZlYzIgZnJvbVdhdmVGcmVxdWVuY3k7XG4gIHVuaWZvcm0gdmVjMiB0b1dhdmVGcmVxdWVuY3k7XG4gIHVuaWZvcm0gZmxvYXQgZnJvbUdyb3VwU3RyZW5ndGg7XG4gIHVuaWZvcm0gZmxvYXQgdG9Hcm91cFN0cmVuZ3RoO1xuICB1bmlmb3JtIGZsb2F0IGRpc2NpcGxpbmVGb2N1cztcbiAgdW5pZm9ybSBmbG9hdCBncmlkSW5mbHVlbmNlO1xuICB1bmlmb3JtIHZlYzMgZGlzY2lwbGluZVJldmVhbEE7XG4gIHVuaWZvcm0gdmVjMyBkaXNjaXBsaW5lUmV2ZWFsQjtcbiAgdW5pZm9ybSBmbG9hdCBkaXNjaXBsaW5lUmV2ZWFsQWN0aXZlO1xuICB1bmlmb3JtIGZsb2F0IGRpc2NpcGxpbmVCYWNrZ3JvdW5kV2VpZ2h0O1xuICB1bmlmb3JtIGZsb2F0IGRpc2NpcGxpbmVCYWNrZ3JvdW5kT3BhY2l0eTtcbiAgdW5pZm9ybSBmbG9hdCBkaXNjaXBsaW5lUG9pbnRTY2FsZTtcbiAgdW5pZm9ybSBmbG9hdCBmcm9tTGl2aW5nQ29sb3VyO1xuICB1bmlmb3JtIGZsb2F0IHRvTGl2aW5nQ29sb3VyO1xuICB1bmlmb3JtIGZsb2F0IGZyb21CdXN0O1xuICB1bmlmb3JtIGZsb2F0IHRvQnVzdDtcbiAgdW5pZm9ybSBmbG9hdCBidXN0WWF3O1xuICB1bmlmb3JtIHZlYzMgbWF0ZXJpYWxDb2xvcjE7XG4gIHVuaWZvcm0gdmVjMyBtYXRlcmlhbENvbG9yMjtcbiAgdW5pZm9ybSB2ZWMzIG1hdGVyaWFsQ29sb3IzO1xuICB1bmlmb3JtIHZlYzMgbWF0ZXJpYWxDb2xvcjQ7XG4gIHVuaWZvcm0gdmVjMyBtYXRlcmlhbENvbG9yNTtcbiAgdW5pZm9ybSB2ZWMzIG1hdGVyaWFsQ29sb3I2O1xuICB1bmlmb3JtIHZlYzMgZGlzY2lwbGluZUNvbG9yMTtcbiAgdW5pZm9ybSB2ZWMzIGRpc2NpcGxpbmVDb2xvcjI7XG4gIHVuaWZvcm0gdmVjMyBkaXNjaXBsaW5lQ29sb3IzO1xuICB1bmlmb3JtIHZlYzMgZGlzY2lwbGluZUNvbG9yNDtcbiAgdW5pZm9ybSB2ZWMzIGRpc2NpcGxpbmVDb2xvcjU7XG4gIHVuaWZvcm0gdmVjMyBkaXNjaXBsaW5lQ29sb3I2O1xuICB1bmlmb3JtIGZsb2F0IG1hdGVyaWFsVGhyZXNob2xkMTtcbiAgdW5pZm9ybSBmbG9hdCBtYXRlcmlhbFRocmVzaG9sZDI7XG4gIHVuaWZvcm0gZmxvYXQgbWF0ZXJpYWxUaHJlc2hvbGQzO1xuICB1bmlmb3JtIGZsb2F0IG1hdGVyaWFsVGhyZXNob2xkNDtcbiAgdW5pZm9ybSBmbG9hdCBtYXRlcmlhbFRocmVzaG9sZDU7XG4gIHZhcnlpbmcgZmxvYXQgcG9pbnRBbHBoYTtcbiAgdmFyeWluZyB2ZWMzIHBvaW50VGludDtcblxuICB2ZWMzIHJvdGF0ZVkodmVjMyB2YWx1ZSwgZmxvYXQgYW5nbGUpIHtcbiAgICBmbG9hdCBzaW5lID0gc2luKGFuZ2xlKTtcbiAgICBmbG9hdCBjb3NpbmUgPSBjb3MoYW5nbGUpO1xuICAgIHJldHVybiB2ZWMzKFxuICAgICAgKGNvc2luZSAqIHZhbHVlLngpICsgKHNpbmUgKiB2YWx1ZS56KSxcbiAgICAgIHZhbHVlLnksXG4gICAgICAoLXNpbmUgKiB2YWx1ZS54KSArIChjb3NpbmUgKiB2YWx1ZS56KVxuICAgICk7XG4gIH1cblxuICB2ZWMzIGdyb3VwQ29sb3IoZmxvYXQgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPCAxLjUpIHJldHVybiBkaXNjaXBsaW5lQ29sb3IxO1xuICAgIGlmIChpbmRleCA8IDIuNSkgcmV0dXJuIGRpc2NpcGxpbmVDb2xvcjI7XG4gICAgaWYgKGluZGV4IDwgMy41KSByZXR1cm4gZGlzY2lwbGluZUNvbG9yMztcbiAgICBpZiAoaW5kZXggPCA0LjUpIHJldHVybiBkaXNjaXBsaW5lQ29sb3I0O1xuICAgIGlmIChpbmRleCA8IDUuNSkgcmV0dXJuIGRpc2NpcGxpbmVDb2xvcjU7XG4gICAgcmV0dXJuIGRpc2NpcGxpbmVDb2xvcjY7XG4gIH1cblxuICBmbG9hdCBkaXNjaXBsaW5lUmV2ZWFsRm9yR3JvdXAoZmxvYXQgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPCAxLjUpIHJldHVybiBkaXNjaXBsaW5lUmV2ZWFsQS54O1xuICAgIGlmIChpbmRleCA8IDIuNSkgcmV0dXJuIGRpc2NpcGxpbmVSZXZlYWxBLnk7XG4gICAgaWYgKGluZGV4IDwgMy41KSByZXR1cm4gZGlzY2lwbGluZVJldmVhbEEuejtcbiAgICBpZiAoaW5kZXggPCA0LjUpIHJldHVybiBkaXNjaXBsaW5lUmV2ZWFsQi54O1xuICAgIGlmIChpbmRleCA8IDUuNSkgcmV0dXJuIGRpc2NpcGxpbmVSZXZlYWxCLnk7XG4gICAgcmV0dXJuIGRpc2NpcGxpbmVSZXZlYWxCLno7XG4gIH1cblxuICB2ZWMzIG1hdGVyaWFsQ29sb3IoZmxvYXQgc2VlZCkge1xuICAgIGlmIChzZWVkIDwgbWF0ZXJpYWxUaHJlc2hvbGQxKSByZXR1cm4gbWF0ZXJpYWxDb2xvcjE7XG4gICAgaWYgKHNlZWQgPCBtYXRlcmlhbFRocmVzaG9sZDIpIHJldHVybiBtYXRlcmlhbENvbG9yMjtcbiAgICBpZiAoc2VlZCA8IG1hdGVyaWFsVGhyZXNob2xkMykgcmV0dXJuIG1hdGVyaWFsQ29sb3IzO1xuICAgIGlmIChzZWVkIDwgbWF0ZXJpYWxUaHJlc2hvbGQ0KSByZXR1cm4gbWF0ZXJpYWxDb2xvcjQ7XG4gICAgaWYgKHNlZWQgPCBtYXRlcmlhbFRocmVzaG9sZDUpIHJldHVybiBtYXRlcmlhbENvbG9yNTtcbiAgICByZXR1cm4gbWF0ZXJpYWxDb2xvcjY7XG4gIH1cblxuICB2b2lkIG1haW4oKSB7XG4gICAgZmxvYXQgbW9ycGggPSBzbW9vdGhzdGVwKDAuMCwgMS4wLCBtb3JwaFByb2dyZXNzKTtcbiAgICB2ZWMzIGZyb21Qb2ludCA9IG1peChwb3NpdGlvbiwgcm90YXRlWShwb3NpdGlvbiwgYnVzdFlhdyksIGZyb21CdXN0KTtcbiAgICB2ZWMzIHRvUG9pbnQgPSBtaXgodGFyZ2V0UG9zaXRpb24sIHJvdGF0ZVkodGFyZ2V0UG9zaXRpb24sIGJ1c3RZYXcpLCB0b0J1c3QpO1xuICAgIHZlYzMgZnJvbVdvcmxkID0gKGZyb21UcmFuc2Zvcm0gKiB2ZWM0KGZyb21Qb2ludCwgMS4wKSkueHl6O1xuICAgIHZlYzMgdG9Xb3JsZCA9ICh0b1RyYW5zZm9ybSAqIHZlYzQodG9Qb2ludCwgMS4wKSkueHl6O1xuICAgIHZlYzMgd29ybGRQb2ludCA9IG1peChmcm9tV29ybGQsIHRvV29ybGQsIG1vcnBoKTtcblxuICAgIGZsb2F0IGRyaWZ0QW1wbGl0dWRlID0gbWl4KGZyb21EcmlmdEFtcGxpdHVkZSwgdG9EcmlmdEFtcGxpdHVkZSwgbW9ycGgpO1xuICAgIGZsb2F0IGRyaWZ0U3BlZWQgPSBtaXgoZnJvbURyaWZ0U3BlZWQsIHRvRHJpZnRTcGVlZCwgbW9ycGgpO1xuICAgIGZsb2F0IGRyaWZ0SXJyZWd1bGFyaXR5ID0gbWl4KGZyb21EcmlmdElycmVndWxhcml0eSwgdG9EcmlmdElycmVndWxhcml0eSwgbW9ycGgpO1xuICAgIGZsb2F0IGRyaWZ0SW5kaXZpZHVhbGl0eSA9IG1peChmcm9tRHJpZnRJbmRpdmlkdWFsaXR5LCB0b0RyaWZ0SW5kaXZpZHVhbGl0eSwgbW9ycGgpO1xuICAgIGZsb2F0IGRyaWZ0QXhpc1NwcmVhZCA9IG1peChmcm9tRHJpZnRBeGlzU3ByZWFkLCB0b0RyaWZ0QXhpc1NwcmVhZCwgbW9ycGgpO1xuICAgIGZsb2F0IGRyaWZ0U3RvcnlNaXggPSBtaXgoZnJvbURyaWZ0U3RvcnlNaXgsIHRvRHJpZnRTdG9yeU1peCwgbW9ycGgpO1xuICAgIGZsb2F0IGRyaWZ0Q2xvY2sgPSBtaXgoYW1iaWVudFRpbWUsIHN0b3J5VGltZSwgZHJpZnRTdG9yeU1peCk7XG4gICAgZmxvYXQgcGhhc2UgPSBwb2ludFNlZWQgKiAxMjcuMzE7XG4gICAgZmxvYXQgc3BlZWRWYXJpYW5jZSA9IG1peChcbiAgICAgIDEuMCxcbiAgICAgIDAuNTggKyAoZnJhY3QoKHBvaW50U2VlZCAqIDQzLjE3KSArIDAuMTkpICogMC44OCksXG4gICAgICBkcmlmdEluZGl2aWR1YWxpdHlcbiAgICApO1xuICAgIGZsb2F0IGRyaWZ0VGltZSA9IGRyaWZ0Q2xvY2sgKiBkcmlmdFNwZWVkICogc3BlZWRWYXJpYW5jZTtcbiAgICB2ZWMzIHNtb290aERyaWZ0ID0gdmVjMyhcbiAgICAgIHNpbigoZHJpZnRUaW1lICogMS4wNykgKyAocGhhc2UgKiAxLjMxKSksXG4gICAgICBzaW4oKGRyaWZ0VGltZSAqIDAuODMpICsgKHBoYXNlICogMS43MykpLFxuICAgICAgY29zKChkcmlmdFRpbWUgKiAwLjk3KSArIChwaGFzZSAqIDIuMTEpKVxuICAgICk7XG4gICAgdmVjMyBlcnJhdGljRHJpZnQgPSB2ZWMzKFxuICAgICAgc2luKChkcmlmdFRpbWUgKiAyLjQzKSArIChwaGFzZSAqIDAuMzcpKSxcbiAgICAgIGNvcygoZHJpZnRUaW1lICogMi4wNykgKyAocGhhc2UgKiAwLjYxKSksXG4gICAgICBzaW4oKGRyaWZ0VGltZSAqIDIuODEpICsgKHBoYXNlICogMC44MykpXG4gICAgKTtcbiAgICB2ZWMzIGRyaWZ0VmVjdG9yID0gbWl4KHNtb290aERyaWZ0LCBlcnJhdGljRHJpZnQsIGRyaWZ0SXJyZWd1bGFyaXR5ICogMC41OCk7XG4gICAgZHJpZnRWZWN0b3IueHogKj0gZHJpZnRBeGlzU3ByZWFkO1xuICAgIHdvcmxkUG9pbnQgKz0gZHJpZnRWZWN0b3IgKiBkcmlmdEFtcGxpdHVkZTtcblxuICAgIGZsb2F0IHdhdmVXZWlnaHQgPSBtaXgoZnJvbVdhdmVXZWlnaHQsIHRvV2F2ZVdlaWdodCwgbW9ycGgpO1xuICAgIGZsb2F0IHdhdmVBbXBsaXR1ZGUgPSBtaXgoZnJvbVdhdmVBbXBsaXR1ZGUsIHRvV2F2ZUFtcGxpdHVkZSwgbW9ycGgpO1xuICAgIGZsb2F0IHdhdmVTcGVlZCA9IG1peChmcm9tV2F2ZVNwZWVkLCB0b1dhdmVTcGVlZCwgbW9ycGgpO1xuICAgIHZlYzIgd2F2ZUZyZXF1ZW5jeSA9IG1peChmcm9tV2F2ZUZyZXF1ZW5jeSwgdG9XYXZlRnJlcXVlbmN5LCBtb3JwaCk7XG4gICAgd29ybGRQb2ludC55ICs9IHdhdmVXZWlnaHQgKiB3YXZlQW1wbGl0dWRlICogc2luKFxuICAgICAgKHdvcmxkUG9pbnQueCAqIHdhdmVGcmVxdWVuY3kueClcbiAgICAgICsgKHdvcmxkUG9pbnQueiAqIHdhdmVGcmVxdWVuY3kueSlcbiAgICAgICsgKGFtYmllbnRUaW1lICogd2F2ZVNwZWVkKVxuICAgICk7XG5cbiAgICBmbG9hdCBncm91cCA9IG1peChmcm9tR3JvdXAsIHRvR3JvdXAsIG1vcnBoKTtcbiAgICBmbG9hdCBncm91cFN0cmVuZ3RoID0gbWl4KGZyb21Hcm91cFN0cmVuZ3RoLCB0b0dyb3VwU3RyZW5ndGgsIG1vcnBoKTtcbiAgICBmbG9hdCBncm91cEV4aXN0cyA9IHN0ZXAoMC41LCBncm91cCkgKiBzdGVwKDAuMDAxLCBncm91cFN0cmVuZ3RoKTtcbiAgICBmbG9hdCBmb2N1c0FjdGl2ZSA9IHN0ZXAoMC41LCBkaXNjaXBsaW5lRm9jdXMpO1xuICAgIGZsb2F0IGZvY3VzTWF0Y2ggPSAxLjAgLSBzdGVwKDAuNDUsIGFicyhncm91cCAtIGRpc2NpcGxpbmVGb2N1cykpO1xuICAgIGZsb2F0IGxlZ2FjeUdyb3VwV2VpZ2h0ID0gZ3JvdXBFeGlzdHMgKiBtaXgoMS4wLCBtaXgoMC4yOCwgMS4wLCBmb2N1c01hdGNoKSwgZm9jdXNBY3RpdmUpO1xuICAgIGZsb2F0IHJldmVhbGVkR3JvdXBXZWlnaHQgPSBncm91cEV4aXN0cyAqIGRpc2NpcGxpbmVSZXZlYWxGb3JHcm91cChncm91cCk7XG4gICAgZmxvYXQgZ3JvdXBXZWlnaHQgPSBtaXgobGVnYWN5R3JvdXBXZWlnaHQsIHJldmVhbGVkR3JvdXBXZWlnaHQsIGRpc2NpcGxpbmVSZXZlYWxBY3RpdmUpO1xuICAgIHdvcmxkUG9pbnQueiArPSBncmlkSW5mbHVlbmNlICogc3RlcCgwLjAwMSwgZ3JvdXBTdHJlbmd0aCkgKiAwLjIyICogc2luKFxuICAgICAgKHdvcmxkUG9pbnQueCAqIDAuODIpICsgKHdvcmxkUG9pbnQueSAqIDAuNTQpIC0gKGFtYmllbnRUaW1lICogMC40NSlcbiAgICApO1xuICAgIGZsb2F0IGNvbG91cldlaWdodCA9IG1peChmcm9tTGl2aW5nQ29sb3VyLCB0b0xpdmluZ0NvbG91ciwgbW9ycGgpO1xuICAgIGZsb2F0IGxpdmluZ0JhbmQgPSAwLjUgKyAoMC41ICogc2luKFxuICAgICAgKHdvcmxkUG9pbnQueCAqIDAuNzIpICsgKHdvcmxkUG9pbnQueiAqIDAuMzgpICsgKGFtYmllbnRUaW1lICogMC4xOClcbiAgICApKTtcbiAgICBmbG9hdCBtYXRlcmlhbFNlZWQgPSBmcmFjdCgocG9pbnRTZWVkICogNDMuNzEzKSArIDAuMjcxKTtcbiAgICB2ZWMzIGJhc2VDb2xvciA9IG1hdGVyaWFsQ29sb3IobWF0ZXJpYWxTZWVkKTtcbiAgICB2ZWMzIGxpdmluZ0NvbG9yID0gbWF0ZXJpYWxDb2xvcihmcmFjdCgobWF0ZXJpYWxTZWVkICogMy4xNykgKyAwLjM3KSk7XG4gICAgcG9pbnRUaW50ID0gbWl4KFxuICAgICAgYmFzZUNvbG9yLFxuICAgICAgbGl2aW5nQ29sb3IsXG4gICAgICBjb2xvdXJXZWlnaHQgKiBzbW9vdGhzdGVwKDAuNzIsIDAuOTgsIGxpdmluZ0JhbmQpICogMC40OFxuICAgICk7XG4gICAgcG9pbnRUaW50ID0gbWl4KHBvaW50VGludCwgZ3JvdXBDb2xvcihncm91cCksIGdyb3VwV2VpZ2h0KTtcblxuICAgIHZlYzQgdmlld1BvaW50ID0gbW9kZWxWaWV3TWF0cml4ICogdmVjNCh3b3JsZFBvaW50LCAxLjApO1xuICAgIGdsX1Bvc2l0aW9uID0gcHJvamVjdGlvbk1hdHJpeCAqIHZpZXdQb2ludDtcbiAgICBmbG9hdCBwcmVzZW5jZSA9IG1peChmcm9tUHJlc2VuY2UsIHRvUHJlc2VuY2UsIG1vcnBoKTtcbiAgICBmbG9hdCByZWNvbm5lY3QgPSBjbGFtcChncmlkSW5mbHVlbmNlLCAwLjAsIDEuMCk7XG4gICAgZmxvYXQgYmFja2dyb3VuZFZpc2liaWxpdHkgPSBtaXgoXG4gICAgICAxLjAsXG4gICAgICBkaXNjaXBsaW5lQmFja2dyb3VuZE9wYWNpdHksXG4gICAgICBkaXNjaXBsaW5lQmFja2dyb3VuZFdlaWdodCAqICgxLjAgLSByZWNvbm5lY3QpXG4gICAgKTtcbiAgICBmbG9hdCByZXZlYWxWaXNpYmlsaXR5ID0gbWl4KGJhY2tncm91bmRWaXNpYmlsaXR5LCAxLjAsIHJldmVhbGVkR3JvdXBXZWlnaHQpO1xuICAgIHByZXNlbmNlICo9IG1peCgxLjAsIHJldmVhbFZpc2liaWxpdHksIGRpc2NpcGxpbmVSZXZlYWxBY3RpdmUpO1xuICAgIGZsb2F0IHNpemVXZWlnaHQgPSBtaXgoZnJvbVBvaW50U2l6ZSwgdG9Qb2ludFNpemUsIG1vcnBoKTtcbiAgICBmbG9hdCBncm91cFNjYWxlID0gbWl4KGdyb3VwU3RyZW5ndGgsIG1heCgwLjAsIGRpc2NpcGxpbmVQb2ludFNjYWxlIC0gMS4wKSwgZGlzY2lwbGluZVJldmVhbEFjdGl2ZSk7XG4gICAgZmxvYXQgZW1waGFzaXMgPSAxLjAgKyAoZ3JvdXBXZWlnaHQgKiBncm91cFNjYWxlKSArICh3YXZlV2VpZ2h0ICogMC4xOCk7XG4gICAgZ2xfUG9pbnRTaXplID0gcG9pbnRTaXplICogc2l6ZVdlaWdodCAqIGVtcGhhc2lzICogcGl4ZWxSYXRpb1xuICAgICAgKiBjbGFtcCg1LjAgLyBtYXgoMS4wLCAtdmlld1BvaW50LnopLCAwLjU2LCAzLjIpO1xuICAgIHBvaW50QWxwaGEgPSBwcmVzZW5jZTtcbiAgfVxuYDtcblxuY29uc3QgRlJBR01FTlRfU0hBREVSID0gYFxuICB1bmlmb3JtIGZsb2F0IGZpZWxkT3BhY2l0eTtcbiAgdmFyeWluZyBmbG9hdCBwb2ludEFscGhhO1xuICB2YXJ5aW5nIHZlYzMgcG9pbnRUaW50O1xuXG4gIHZvaWQgbWFpbigpIHtcbiAgICB2ZWMyIGNlbnRlciA9IGdsX1BvaW50Q29vcmQgLSB2ZWMyKDAuNSk7XG4gICAgZmxvYXQgcmFkaXVzID0gbGVuZ3RoKGNlbnRlcik7XG4gICAgaWYgKHJhZGl1cyA+IDAuNSB8fCBwb2ludEFscGhhIDw9IDAuMDAxKSBkaXNjYXJkO1xuICAgIGZsb2F0IGVkZ2UgPSAxLjAgLSBzbW9vdGhzdGVwKDAuNDQsIDAuNSwgcmFkaXVzKTtcbiAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KHBvaW50VGludCwgZmllbGRPcGFjaXR5ICogcG9pbnRBbHBoYSAqIGVkZ2UpO1xuICB9XG5gO1xuXG5mdW5jdGlvbiBtb2RpZmllcih3b3JsZCwgaWQpIHtcbiAgcmV0dXJuIHdvcmxkPy5tb2RpZmllcnM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IGlkICYmIGl0ZW0uZW5hYmxlZCAhPT0gZmFsc2UpPy5wYXJhbWV0ZXJzIHx8IG51bGw7XG59XG5cbmZ1bmN0aW9uIHJlYWRDb2xvclRva2VuKHN0eWxlcywgdG9rZW4sIGZhbGxiYWNrKSB7XG4gIHJldHVybiBzdHlsZXMuZ2V0UHJvcGVydHlWYWx1ZSh0b2tlbikudHJpbSgpIHx8IGZhbGxiYWNrO1xufVxuXG5mdW5jdGlvbiBnZXRNYXRlcmlhbERpc3RyaWJ1dGlvbigpIHtcbiAgY29uc3QgY29uZmlndXJlZCA9IGdldEdsb2JhbHMoKT8uY29sb3JEaXN0cmlidXRpb247XG4gIGNvbnN0IHZhbGlkID0gQXJyYXkuaXNBcnJheShjb25maWd1cmVkKVxuICAgID8gY29uZmlndXJlZC5maWx0ZXIoKHJvdykgPT4gTnVtYmVyKHJvdz8ud2VpZ2h0KSA+IDApLnNsaWNlKDAsIE1BVEVSSUFMX1NMT1RfQ09VTlQpXG4gICAgOiBbXTtcbiAgaWYgKHZhbGlkLmxlbmd0aCAhPT0gTUFURVJJQUxfU0xPVF9DT1VOVCkgcmV0dXJuIEZBTExCQUNLX01BVEVSSUFMX0RJU1RSSUJVVElPTjtcbiAgcmV0dXJuIHZhbGlkO1xufVxuXG5mdW5jdGlvbiBzeW5jTWF0ZXJpYWxQYWxldHRlKHVuaWZvcm1zLCBzdHlsZXMpIHtcbiAgY29uc3QgZGlzdHJpYnV0aW9uID0gZ2V0TWF0ZXJpYWxEaXN0cmlidXRpb24oKTtcbiAgY29uc3Qgd2VpZ2h0cyA9IGRpc3RyaWJ1dGlvbi5tYXAoKHJvdykgPT4gTnVtYmVyKHJvdy53ZWlnaHQpKTtcbiAgY29uc3QgdG90YWwgPSB3ZWlnaHRzLnJlZHVjZSgoc3VtLCB3ZWlnaHQpID0+IHN1bSArIHdlaWdodCwgMCkgfHwgMTtcbiAgbGV0IGN1bXVsYXRpdmUgPSAwO1xuICBkaXN0cmlidXRpb24uZm9yRWFjaCgocm93LCBpbmRleCkgPT4ge1xuICAgIGNvbnN0IGNvbG9ySW5kZXggPSBNYXRoLm1heCgwLCBNYXRoLm1pbig3LCBNYXRoLmZsb29yKE51bWJlcihyb3cuY29sb3JJbmRleCkgfHwgMCkpKTtcbiAgICBjb25zdCBmYWxsYmFjayA9IEZBTExCQUNLX01BVEVSSUFMX0RJU1RSSUJVVElPTltpbmRleF07XG4gICAgY29uc3QgZmFsbGJhY2tJbmRleCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDcsIE51bWJlcihmYWxsYmFjay5jb2xvckluZGV4KSB8fCAwKSk7XG4gICAgY29uc3QgY29sb3IgPSByZWFkQ29sb3JUb2tlbihcbiAgICAgIHN0eWxlcyxcbiAgICAgIGAtLWJhbGwtJHtjb2xvckluZGV4ICsgMX1gLFxuICAgICAgcmVhZENvbG9yVG9rZW4oc3R5bGVzLCBgLS1iYWxsLSR7ZmFsbGJhY2tJbmRleCArIDF9YCwgJyNmZmZmZmYnKSxcbiAgICApO1xuICAgIHVuaWZvcm1zW2BtYXRlcmlhbENvbG9yJHtpbmRleCArIDF9YF0udmFsdWUuc2V0U3R5bGUoY29sb3IpO1xuICAgIGN1bXVsYXRpdmUgKz0gd2VpZ2h0c1tpbmRleF0gLyB0b3RhbDtcbiAgICBpZiAoaW5kZXggPCBNQVRFUklBTF9TTE9UX0NPVU5UIC0gMSkge1xuICAgICAgdW5pZm9ybXNbYG1hdGVyaWFsVGhyZXNob2xkJHtpbmRleCArIDF9YF0udmFsdWUgPSBjdW11bGF0aXZlO1xuICAgIH1cbiAgfSk7XG4gIGNvbnN0IGRpc2NpcGxpbmVUb2tlbnMgPSBbJy0tYmFsbC0xJywgJy0tYmFsbC00JywgJy0tYmFsbC0zJywgJy0tYmFsbC03JywgJy0tYmFsbC04JywgJy0tYmFsbC02J107XG4gIGNvbnN0IGRpc2NpcGxpbmVGYWxsYmFja3MgPSBbJyNiNWI3YjYnLCAnIzAwNjk1YycsICcjZmZmZmZmJywgJyMwZDVjYjYnLCAnI2ZmYTAwMCcsICcjZDdmZjJmJ107XG4gIGRpc2NpcGxpbmVUb2tlbnMuZm9yRWFjaCgodG9rZW4sIGluZGV4KSA9PiB7XG4gICAgdW5pZm9ybXNbYGRpc2NpcGxpbmVDb2xvciR7aW5kZXggKyAxfWBdLnZhbHVlLnNldFN0eWxlKFxuICAgICAgcmVhZENvbG9yVG9rZW4oc3R5bGVzLCB0b2tlbiwgZGlzY2lwbGluZUZhbGxiYWNrc1tpbmRleF0pLFxuICAgICk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFbXB0eUF0dHJpYnV0ZShjb3VudCwgdmFsdWUgPSAwKSB7XG4gIHJldHVybiBuZXcgRmxvYXQzMkFycmF5KGNvdW50KS5maWxsKHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gc2hhcGVDYWNoZUtleSh3b3JsZCwgcXVhbGl0eSkge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoW1xuICAgIHdvcmxkPy5zaGFwZUlkLFxuICAgIHdvcmxkPy5zZWVkLFxuICAgIHF1YWxpdHksXG4gICAgd29ybGQ/LnNoYXBlUGFyYW1ldGVycyB8fCB7fSxcbiAgXSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVNlcXVlbmNlQ2FjaGVLZXkoc2VxdWVuY2UsIGdsb2JhbHMsIHF1YWxpdHksIGNvbXBhY3QpIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KFtcbiAgICBDT1JSRVNQT05ERU5DRV9WRVJTSU9OLFxuICAgIHF1YWxpdHksXG4gICAgY29tcGFjdCxcbiAgICBnbG9iYWxzLmNhbWVyYS5zdGFydFosXG4gICAgZ2xvYmFscy5jYW1lcmEuY2FkZW5jZSxcbiAgICBzZXF1ZW5jZS5tYXAoKHdvcmxkKSA9PiBbXG4gICAgICB3b3JsZC5zZWN0aW9uSWQsXG4gICAgICBzaGFwZUNhY2hlS2V5KHdvcmxkLCBxdWFsaXR5KSxcbiAgICAgIHdvcmxkLnRyYW5zaXRpb25Jbj8uY29ycmVzcG9uZGVuY2UgfHwgJ2luZGV4LXYxJyxcbiAgICAgIHdvcmxkLnN0YXJ0V1UsXG4gICAgICB3b3JsZC5lbnRyeURpc3RhbmNlV1UsXG4gICAgICB3b3JsZC50cmFuc2Zvcm0/LnBvc2l0aW9uLFxuICAgICAgd29ybGQudHJhbnNmb3JtPy5yb3RhdGlvbixcbiAgICAgIHdvcmxkLnRyYW5zZm9ybT8uc2NhbGUsXG4gICAgICB3b3JsZC50cmFuc2Zvcm0/Lm1vYmlsZVNjYWxlLFxuICAgICAgd29ybGQudHJhbnNmb3JtPy5tb2JpbGVZT2Zmc2V0LFxuICAgIF0pLFxuICBdKTtcbn1cblxuZnVuY3Rpb24gdG91Y2hCb3VuZGVkQ2FjaGUoY2FjaGUsIGtleSwgdmFsdWUpIHtcbiAgY2FjaGUuZGVsZXRlKGtleSk7XG4gIGNhY2hlLnNldChrZXksIHZhbHVlKTtcbiAgd2hpbGUgKGNhY2hlLnNpemUgPiBTRVFVRU5DRV9DQUNIRV9MSU1JVCkgY2FjaGUuZGVsZXRlKGNhY2hlLmtleXMoKS5uZXh0KCkudmFsdWUpO1xufVxuXG5mdW5jdGlvbiB3cml0ZVdvcmxkVHJhbnNmb3JtKHRhcmdldCwgd29ybGQsIGdsb2JhbHMsIGNvbXBhY3QsIHNjcmF0Y2gsIHN0b3J5T2Zmc2V0ID0gbnVsbCkge1xuICBpZiAoIXdvcmxkKSByZXR1cm4gdGFyZ2V0LmlkZW50aXR5KCk7XG4gIGNvbnN0IHRyYW5zZm9ybSA9IHdvcmxkLnRyYW5zZm9ybSB8fCB7fTtcbiAgY29uc3QgcG9zaXRpb24gPSB0cmFuc2Zvcm0ucG9zaXRpb24gfHwgWzAsIDAsIDBdO1xuICBjb25zdCByb3RhdGlvbiA9IHRyYW5zZm9ybS5yb3RhdGlvbiB8fCBbMCwgMCwgMF07XG4gIGNvbnN0IGJhc2VTY2FsZSA9IE51bWJlcih0cmFuc2Zvcm0uc2NhbGUgPz8gMSk7XG4gIGNvbnN0IHNjYWxlID0gY29tcGFjdCAmJiBOdW1iZXIuaXNGaW5pdGUodHJhbnNmb3JtLm1vYmlsZVNjYWxlKVxuICAgID8gTnVtYmVyKHRyYW5zZm9ybS5tb2JpbGVTY2FsZSlcbiAgICA6IGJhc2VTY2FsZTtcbiAgY29uc3QgZW50cnlDYW1lcmFaID0gZ2xvYmFscy5jYW1lcmEuc3RhcnRaIC0gKHdvcmxkLnN0YXJ0V1UgKiBnbG9iYWxzLmNhbWVyYS5jYWRlbmNlKTtcbiAgc2NyYXRjaC5wb3NpdGlvbi5zZXQoXG4gICAgcG9zaXRpb25bMF0sXG4gICAgcG9zaXRpb25bMV0gKyAoY29tcGFjdCA/IE51bWJlcih0cmFuc2Zvcm0ubW9iaWxlWU9mZnNldCB8fCAwKSA6IDApLFxuICAgIGVudHJ5Q2FtZXJhWiAtIE51bWJlcih3b3JsZC5lbnRyeURpc3RhbmNlV1UgfHwgMCkgKyBwb3NpdGlvblsyXSxcbiAgKTtcbiAgaWYgKHN0b3J5T2Zmc2V0KSBzY3JhdGNoLnBvc2l0aW9uLmFkZChzdG9yeU9mZnNldCk7XG4gIHNjcmF0Y2guZXVsZXIuc2V0KFxuICAgIHJvdGF0aW9uWzBdLFxuICAgIHJvdGF0aW9uWzFdLFxuICAgIHJvdGF0aW9uWzJdLFxuICAgICdZWFonLFxuICApO1xuICBzY3JhdGNoLnF1YXRlcm5pb24uc2V0RnJvbUV1bGVyKHNjcmF0Y2guZXVsZXIpO1xuICBzY3JhdGNoLnNjYWxlLnNldChzY2FsZSwgc2NhbGUsIHNjYWxlKTtcbiAgcmV0dXJuIHRhcmdldC5jb21wb3NlKHNjcmF0Y2gucG9zaXRpb24sIHNjcmF0Y2gucXVhdGVybmlvbiwgc2NyYXRjaC5zY2FsZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRyYW5zZm9ybVNjcmF0Y2goKSB7XG4gIHJldHVybiB7XG4gICAgcG9zaXRpb246IG5ldyBUSFJFRS5WZWN0b3IzKCksXG4gICAgcXVhdGVybmlvbjogbmV3IFRIUkVFLlF1YXRlcm5pb24oKSxcbiAgICBzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoKSxcbiAgICBldWxlcjogbmV3IFRIUkVFLkV1bGVyKDAsIDAsIDAsICdZWFonKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gc21vb3RoUmFuZ2UodmFsdWUsIGZyb20sIHRvKSB7XG4gIGlmICh0byA8PSBmcm9tKSByZXR1cm4gdmFsdWUgPj0gdG8gPyAxIDogMDtcbiAgY29uc3QgcHJvZ3Jlc3MgPSBNYXRoLm1pbigxLCBNYXRoLm1heCgwLCAodmFsdWUgLSBmcm9tKSAvICh0byAtIGZyb20pKSk7XG4gIHJldHVybiBwcm9ncmVzcyAqIHByb2dyZXNzICogKDMgLSAoMiAqIHByb2dyZXNzKSk7XG59XG5cbmZ1bmN0aW9uIGNhcHR1cmVEaXNjaXBsaW5lUG9zaXRpb25zKG91dHB1dCwgdGFyZ2V0KSB7XG4gIHRhcmdldC5maWxsKE51bWJlci5OYU4pO1xuICBjb25zdCBncm91cHMgPSBvdXRwdXQuYXR0cmlidXRlcz8uZGlzY2lwbGluZUdyb3VwO1xuICBpZiAoIWdyb3VwcykgcmV0dXJuO1xuICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgZ3JvdXBzLmxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIGNvbnN0IGdyb3VwID0gTWF0aC5yb3VuZChncm91cHNbaW5kZXhdKTtcbiAgICBpZiAoZ3JvdXAgPCAxIHx8IGdyb3VwID4gNikgY29udGludWU7XG4gICAgY29uc3Qgc291cmNlT2Zmc2V0ID0gaW5kZXggKiAzO1xuICAgIGNvbnN0IHRhcmdldE9mZnNldCA9IChncm91cCAtIDEpICogMztcbiAgICB0YXJnZXRbdGFyZ2V0T2Zmc2V0XSA9IG91dHB1dC5wb3NpdGlvbnNbc291cmNlT2Zmc2V0XTtcbiAgICB0YXJnZXRbdGFyZ2V0T2Zmc2V0ICsgMV0gPSBvdXRwdXQucG9zaXRpb25zW3NvdXJjZU9mZnNldCArIDFdO1xuICAgIHRhcmdldFt0YXJnZXRPZmZzZXQgKyAyXSA9IG91dHB1dC5wb3NpdGlvbnNbc291cmNlT2Zmc2V0ICsgMl07XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlUG9pbnRGaWVsZEFkYXB0ZXIoeyBjYW52YXMsIHJvb3QsIGludGVyYWN0aW9uLCBkaXNjaXBsaW5lT3ZlcmxheVJlZiwgcnVudGltZVJlZiB9KSB7XG4gIGNvbnN0IGNvbXBhY3QgPSB3aW5kb3cubWF0Y2hNZWRpYSgnKG1heC13aWR0aDogNjAwcHgpLCAocG9pbnRlcjogY29hcnNlKScpLm1hdGNoZXM7XG4gIGNvbnN0IHF1YWxpdHkgPSBjb21wYWN0ID8gJ21vYmlsZScgOiAnZGVza3RvcCc7XG4gIGNvbnN0IHBvaW50Q291bnQgPSBjb21wYWN0ID8gTU9CSUxFX1BPSU5UX0NPVU5UIDogREVTS1RPUF9QT0lOVF9DT1VOVDtcbiAgY29uc3QgcmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7XG4gICAgY2FudmFzLFxuICAgIGFscGhhOiB0cnVlLFxuICAgIGFudGlhbGlhczogZmFsc2UsXG4gICAgcG93ZXJQcmVmZXJlbmNlOiAnaGlnaC1wZXJmb3JtYW5jZScsXG4gIH0pO1xuICBjb25zdCBzY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuICBjb25zdCBjYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoNDgsIDEsIDAuMDgsIDgwKTtcbiAgY29uc3QgZ2VvbWV0cnkgPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcbiAgY29uc3Qgc2VlZHMgPSBjcmVhdGVBYm91dE5hcnJhdGl2ZVNlZWRzKHBvaW50Q291bnQsIDB4MWUzNWE3YmQpO1xuICBjb25zdCBlbXB0eVBvc2l0aW9ucyA9IG5ldyBGbG9hdDMyQXJyYXkocG9pbnRDb3VudCAqIDMpO1xuICBjb25zdCBlbXB0eVByZXNlbmNlID0gY3JlYXRlRW1wdHlBdHRyaWJ1dGUocG9pbnRDb3VudCwgMSk7XG4gIGNvbnN0IGVtcHR5U2l6ZSA9IGNyZWF0ZUVtcHR5QXR0cmlidXRlKHBvaW50Q291bnQsIDEpO1xuICBjb25zdCBlbXB0eUdyb3VwID0gY3JlYXRlRW1wdHlBdHRyaWJ1dGUocG9pbnRDb3VudCk7XG4gIGNvbnN0IHVuaWZvcm1zID0ge1xuICAgIGZyb21UcmFuc2Zvcm06IHsgdmFsdWU6IG5ldyBUSFJFRS5NYXRyaXg0KCkgfSxcbiAgICB0b1RyYW5zZm9ybTogeyB2YWx1ZTogbmV3IFRIUkVFLk1hdHJpeDQoKSB9LFxuICAgIG1vcnBoUHJvZ3Jlc3M6IHsgdmFsdWU6IDAgfSxcbiAgICBzdG9yeVRpbWU6IHsgdmFsdWU6IDAgfSxcbiAgICBhbWJpZW50VGltZTogeyB2YWx1ZTogMCB9LFxuICAgIHBvaW50U2l6ZTogeyB2YWx1ZTogNS40IH0sXG4gICAgcGl4ZWxSYXRpbzogeyB2YWx1ZTogMSB9LFxuICAgIGZyb21EcmlmdEFtcGxpdHVkZTogeyB2YWx1ZTogMCB9LFxuICAgIHRvRHJpZnRBbXBsaXR1ZGU6IHsgdmFsdWU6IDAgfSxcbiAgICBmcm9tRHJpZnRTcGVlZDogeyB2YWx1ZTogMCB9LFxuICAgIHRvRHJpZnRTcGVlZDogeyB2YWx1ZTogMCB9LFxuICAgIGZyb21EcmlmdElycmVndWxhcml0eTogeyB2YWx1ZTogMCB9LFxuICAgIHRvRHJpZnRJcnJlZ3VsYXJpdHk6IHsgdmFsdWU6IDAgfSxcbiAgICBmcm9tRHJpZnRJbmRpdmlkdWFsaXR5OiB7IHZhbHVlOiAwIH0sXG4gICAgdG9EcmlmdEluZGl2aWR1YWxpdHk6IHsgdmFsdWU6IDAgfSxcbiAgICBmcm9tRHJpZnRBeGlzU3ByZWFkOiB7IHZhbHVlOiAwIH0sXG4gICAgdG9EcmlmdEF4aXNTcHJlYWQ6IHsgdmFsdWU6IDAgfSxcbiAgICBmcm9tRHJpZnRTdG9yeU1peDogeyB2YWx1ZTogMCB9LFxuICAgIHRvRHJpZnRTdG9yeU1peDogeyB2YWx1ZTogMCB9LFxuICAgIGZyb21XYXZlV2VpZ2h0OiB7IHZhbHVlOiAwIH0sXG4gICAgdG9XYXZlV2VpZ2h0OiB7IHZhbHVlOiAwIH0sXG4gICAgZnJvbVdhdmVBbXBsaXR1ZGU6IHsgdmFsdWU6IDAgfSxcbiAgICB0b1dhdmVBbXBsaXR1ZGU6IHsgdmFsdWU6IDAgfSxcbiAgICBmcm9tV2F2ZVNwZWVkOiB7IHZhbHVlOiAwIH0sXG4gICAgdG9XYXZlU3BlZWQ6IHsgdmFsdWU6IDAgfSxcbiAgICBmcm9tV2F2ZUZyZXF1ZW5jeTogeyB2YWx1ZTogbmV3IFRIUkVFLlZlY3RvcjIoMSwgMSkgfSxcbiAgICB0b1dhdmVGcmVxdWVuY3k6IHsgdmFsdWU6IG5ldyBUSFJFRS5WZWN0b3IyKDEsIDEpIH0sXG4gICAgZnJvbUdyb3VwU3RyZW5ndGg6IHsgdmFsdWU6IDAgfSxcbiAgICB0b0dyb3VwU3RyZW5ndGg6IHsgdmFsdWU6IDAgfSxcbiAgICBkaXNjaXBsaW5lRm9jdXM6IHsgdmFsdWU6IDAgfSxcbiAgICBncmlkSW5mbHVlbmNlOiB7IHZhbHVlOiAwIH0sXG4gICAgZGlzY2lwbGluZVJldmVhbEE6IHsgdmFsdWU6IG5ldyBUSFJFRS5WZWN0b3IzKCkgfSxcbiAgICBkaXNjaXBsaW5lUmV2ZWFsQjogeyB2YWx1ZTogbmV3IFRIUkVFLlZlY3RvcjMoKSB9LFxuICAgIGRpc2NpcGxpbmVSZXZlYWxBY3RpdmU6IHsgdmFsdWU6IDAgfSxcbiAgICBkaXNjaXBsaW5lQmFja2dyb3VuZFdlaWdodDogeyB2YWx1ZTogMCB9LFxuICAgIGRpc2NpcGxpbmVCYWNrZ3JvdW5kT3BhY2l0eTogeyB2YWx1ZTogMC4wNiB9LFxuICAgIGRpc2NpcGxpbmVQb2ludFNjYWxlOiB7IHZhbHVlOiAzLjYgfSxcbiAgICBmcm9tTGl2aW5nQ29sb3VyOiB7IHZhbHVlOiAwIH0sXG4gICAgdG9MaXZpbmdDb2xvdXI6IHsgdmFsdWU6IDAgfSxcbiAgICBmcm9tQnVzdDogeyB2YWx1ZTogMCB9LFxuICAgIHRvQnVzdDogeyB2YWx1ZTogMCB9LFxuICAgIGJ1c3RZYXc6IHsgdmFsdWU6IDAgfSxcbiAgICBtYXRlcmlhbENvbG9yMTogeyB2YWx1ZTogbmV3IFRIUkVFLkNvbG9yKCcjYjViN2I2JykgfSxcbiAgICBtYXRlcmlhbENvbG9yMjogeyB2YWx1ZTogbmV3IFRIUkVFLkNvbG9yKCcjMDA2OTVjJykgfSxcbiAgICBtYXRlcmlhbENvbG9yMzogeyB2YWx1ZTogbmV3IFRIUkVFLkNvbG9yKCcjZmZmZmZmJykgfSxcbiAgICBtYXRlcmlhbENvbG9yNDogeyB2YWx1ZTogbmV3IFRIUkVFLkNvbG9yKCcjMGQ1Y2I2JykgfSxcbiAgICBtYXRlcmlhbENvbG9yNTogeyB2YWx1ZTogbmV3IFRIUkVFLkNvbG9yKCcjZmZhMDAwJykgfSxcbiAgICBtYXRlcmlhbENvbG9yNjogeyB2YWx1ZTogbmV3IFRIUkVFLkNvbG9yKCcjZDdmZjJmJykgfSxcbiAgICBkaXNjaXBsaW5lQ29sb3IxOiB7IHZhbHVlOiBuZXcgVEhSRUUuQ29sb3IoJyNiNWI3YjYnKSB9LFxuICAgIGRpc2NpcGxpbmVDb2xvcjI6IHsgdmFsdWU6IG5ldyBUSFJFRS5Db2xvcignIzAwNjk1YycpIH0sXG4gICAgZGlzY2lwbGluZUNvbG9yMzogeyB2YWx1ZTogbmV3IFRIUkVFLkNvbG9yKCcjZmZmZmZmJykgfSxcbiAgICBkaXNjaXBsaW5lQ29sb3I0OiB7IHZhbHVlOiBuZXcgVEhSRUUuQ29sb3IoJyMwZDVjYjYnKSB9LFxuICAgIGRpc2NpcGxpbmVDb2xvcjU6IHsgdmFsdWU6IG5ldyBUSFJFRS5Db2xvcignI2ZmYTAwMCcpIH0sXG4gICAgZGlzY2lwbGluZUNvbG9yNjogeyB2YWx1ZTogbmV3IFRIUkVFLkNvbG9yKCcjZDdmZjJmJykgfSxcbiAgICBtYXRlcmlhbFRocmVzaG9sZDE6IHsgdmFsdWU6IDAuMzEgfSxcbiAgICBtYXRlcmlhbFRocmVzaG9sZDI6IHsgdmFsdWU6IDAuNDQgfSxcbiAgICBtYXRlcmlhbFRocmVzaG9sZDM6IHsgdmFsdWU6IDAuNjAgfSxcbiAgICBtYXRlcmlhbFRocmVzaG9sZDQ6IHsgdmFsdWU6IDAuODAgfSxcbiAgICBtYXRlcmlhbFRocmVzaG9sZDU6IHsgdmFsdWU6IDAuOTAgfSxcbiAgICBmaWVsZE9wYWNpdHk6IHsgdmFsdWU6IDAuOTYgfSxcbiAgfTtcbiAgY29uc3QgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuU2hhZGVyTWF0ZXJpYWwoe1xuICAgIHVuaWZvcm1zLFxuICAgIHZlcnRleFNoYWRlcjogVkVSVEVYX1NIQURFUixcbiAgICBmcmFnbWVudFNoYWRlcjogRlJBR01FTlRfU0hBREVSLFxuICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgIGRlcHRoV3JpdGU6IHRydWUsXG4gICAgYmxlbmRpbmc6IFRIUkVFLk5vcm1hbEJsZW5kaW5nLFxuICB9KTtcbiAgZ2VvbWV0cnkuc2V0QXR0cmlidXRlKCdwb3NpdGlvbicsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoZW1wdHlQb3NpdGlvbnMsIDMpKTtcbiAgZ2VvbWV0cnkuc2V0QXR0cmlidXRlKCd0YXJnZXRQb3NpdGlvbicsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoZW1wdHlQb3NpdGlvbnMuc2xpY2UoKSwgMykpO1xuICBnZW9tZXRyeS5zZXRBdHRyaWJ1dGUoJ3BvaW50U2VlZCcsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoc2VlZHMsIDEpKTtcbiAgZ2VvbWV0cnkuc2V0QXR0cmlidXRlKCdmcm9tUHJlc2VuY2UnLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKGVtcHR5UHJlc2VuY2UsIDEpKTtcbiAgZ2VvbWV0cnkuc2V0QXR0cmlidXRlKCd0b1ByZXNlbmNlJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShlbXB0eVByZXNlbmNlLnNsaWNlKCksIDEpKTtcbiAgZ2VvbWV0cnkuc2V0QXR0cmlidXRlKCdmcm9tUG9pbnRTaXplJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShlbXB0eVNpemUsIDEpKTtcbiAgZ2VvbWV0cnkuc2V0QXR0cmlidXRlKCd0b1BvaW50U2l6ZScsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoZW1wdHlTaXplLnNsaWNlKCksIDEpKTtcbiAgZ2VvbWV0cnkuc2V0QXR0cmlidXRlKCdmcm9tR3JvdXAnLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKGVtcHR5R3JvdXAsIDEpKTtcbiAgZ2VvbWV0cnkuc2V0QXR0cmlidXRlKCd0b0dyb3VwJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShlbXB0eUdyb3VwLnNsaWNlKCksIDEpKTtcbiAgY29uc3QgcG9pbnRzID0gbmV3IFRIUkVFLlBvaW50cyhnZW9tZXRyeSwgbWF0ZXJpYWwpO1xuICBwb2ludHMuZnJ1c3R1bUN1bGxlZCA9IGZhbHNlO1xuICBzY2VuZS5hZGQocG9pbnRzKTtcblxuICBjb25zdCBzaGFwZUNhY2hlID0gbmV3IE1hcCgpO1xuICBjb25zdCBzZXF1ZW5jZUNhY2hlID0gbmV3IE1hcCgpO1xuICBsZXQgaW5zdGFsbGVkUGFpciA9IG51bGw7XG4gIGxldCByZWFkeVNlcXVlbmNlID0gbnVsbDtcbiAgbGV0IHBlbmRpbmdTZXF1ZW5jZUtleSA9ICcnO1xuICBsZXQgZ2VuZXJhdGlvbkNvbnRyb2xsZXIgPSBudWxsO1xuICBsZXQgY29ycmVzcG9uZGVuY2VXb3JrZXIgPSBudWxsO1xuICBsZXQgcHJlcGFyYXRpb25HZW5lcmF0aW9uID0gMDtcbiAgbGV0IHNlcXVlbmNlU3RhdGUgPSAnaWRsZSc7XG4gIGxldCBzZXF1ZW5jZVByZXBhcmF0aW9uRHVyYXRpb25NcyA9IDA7XG4gIGxldCBkaXNwb3NlZCA9IGZhbHNlO1xuICBsZXQgY29udGV4dEF2YWlsYWJsZSA9IHRydWU7XG4gIGxldCB3aWR0aCA9IDE7XG4gIGxldCBoZWlnaHQgPSAxO1xuICBsZXQgdmlld3BvcnRPZmZzZXRYID0gMDtcbiAgbGV0IHZpZXdwb3J0T2Zmc2V0WSA9IDA7XG4gIGxldCBsYXRlc3RGcmFtZSA9IG51bGw7XG4gIGxldCBidXN0WWF3ID0gMDtcbiAgbGV0IGJ1c3RGb3JtYXRpb25Ib2xkWWF3ID0gMDtcbiAgbGV0IGxhc3RCdXN0UHJvZ3Jlc3MgPSAwO1xuICBsZXQgZHJhZ2dpbmcgPSBmYWxzZTtcbiAgbGV0IGRyYWdTdGFydCA9IG51bGw7XG4gIGxldCByZXN1bWVBdCA9IDA7XG4gIGxldCBidWZmZXJSZWJ1aWxkcyA9IDA7XG4gIGxldCBmcmFtZVN0YXJ0ZWRBdCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICBsZXQgbGFzdEZyYW1lVGltZSA9IDA7XG4gIGxldCBidXN0Rm9ybWF0aW9uQWN0aXZlID0gZmFsc2U7XG4gIGNvbnN0IGRpcmVjdG9yID0geyBhY3RpdmU6IGZhbHNlLCB5YXc6IDAsIHBpdGNoOiAwLCBkaXN0YW5jZTogMCB9O1xuICBjb25zdCBkaXJlY3RvclRhcmdldCA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gIGNvbnN0IGRpcmVjdG9yT2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgY29uc3QgZGlyZWN0b3JFdWxlciA9IG5ldyBUSFJFRS5FdWxlcigwLCAwLCAwLCAnWVhaJyk7XG4gIGNvbnN0IGZyb21UcmFuc2Zvcm1TY3JhdGNoID0gY3JlYXRlVHJhbnNmb3JtU2NyYXRjaCgpO1xuICBjb25zdCB0b1RyYW5zZm9ybVNjcmF0Y2ggPSBjcmVhdGVUcmFuc2Zvcm1TY3JhdGNoKCk7XG4gIGNvbnN0IGNvcnJlc3BvbmRlbmNlRnJvbVRyYW5zZm9ybSA9IG5ldyBUSFJFRS5NYXRyaXg0KCk7XG4gIGNvbnN0IGNvcnJlc3BvbmRlbmNlVG9UcmFuc2Zvcm0gPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xuICBjb25zdCBjb3JyZXNwb25kZW5jZUZyb21TY3JhdGNoID0gY3JlYXRlVHJhbnNmb3JtU2NyYXRjaCgpO1xuICBjb25zdCBjb3JyZXNwb25kZW5jZVRvU2NyYXRjaCA9IGNyZWF0ZVRyYW5zZm9ybVNjcmF0Y2goKTtcbiAgY29uc3QgZGlzY2lwbGluZVBvaW50U2NyYXRjaCA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gIGNvbnN0IGZyb21TdG9yeU9mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gIGNvbnN0IHRvU3RvcnlPZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICBjb25zdCBjYW1lcmFVcFNjcmF0Y2ggPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICBjb25zdCBkaXNjaXBsaW5lV2VpZ2h0cyA9IG5ldyBGbG9hdDMyQXJyYXkoNik7XG4gIGNvbnN0IGZyb21EaXNjaXBsaW5lUG9zaXRpb25zID0gbmV3IEZsb2F0MzJBcnJheSgxOCkuZmlsbChOdW1iZXIuTmFOKTtcbiAgY29uc3QgdG9EaXNjaXBsaW5lUG9zaXRpb25zID0gbmV3IEZsb2F0MzJBcnJheSgxOCkuZmlsbChOdW1iZXIuTmFOKTtcblxuICBjb25zdCB1cGRhdGVUaGVtZSA9ICgpID0+IHtcbiAgICBjb25zdCBzdHlsZXMgPSBnZXRDb21wdXRlZFN0eWxlKHJvb3QpO1xuICAgIHN5bmNNYXRlcmlhbFBhbGV0dGUodW5pZm9ybXMsIHN0eWxlcyk7XG4gIH07XG5cbiAgY29uc3QgcmVzaXplID0gKCkgPT4ge1xuICAgIGNvbnN0IHJvb3RSZWN0ID0gcm9vdC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCBjYW52YXNSZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHdpZHRoID0gTWF0aC5tYXgoMSwgY2FudmFzUmVjdC53aWR0aCk7XG4gICAgaGVpZ2h0ID0gTWF0aC5tYXgoMSwgY2FudmFzUmVjdC5oZWlnaHQpO1xuICAgIHZpZXdwb3J0T2Zmc2V0WCA9IGNhbnZhc1JlY3QubGVmdCAtIHJvb3RSZWN0LmxlZnQ7XG4gICAgdmlld3BvcnRPZmZzZXRZID0gY2FudmFzUmVjdC50b3AgLSByb290UmVjdC50b3A7XG4gICAgY29uc3QgcmF0aW8gPSBNYXRoLm1pbih3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxLCBjb21wYWN0ID8gMS4yNSA6IDEuNSk7XG4gICAgcmVuZGVyZXIuc2V0UGl4ZWxSYXRpbyhyYXRpbyk7XG4gICAgcmVuZGVyZXIuc2V0U2l6ZSh3aWR0aCwgaGVpZ2h0LCBmYWxzZSk7XG4gICAgY2FtZXJhLmFzcGVjdCA9IHdpZHRoIC8gaGVpZ2h0O1xuICAgIGNhbWVyYS51cGRhdGVQcm9qZWN0aW9uTWF0cml4KCk7XG4gICAgdW5pZm9ybXMucGl4ZWxSYXRpby52YWx1ZSA9IHJhdGlvO1xuICB9O1xuXG4gIGNvbnN0IGdldFNoYXBlID0gYXN5bmMgKHdvcmxkLCBzaWduYWwpID0+IHtcbiAgICBjb25zdCBrZXkgPSBzaGFwZUNhY2hlS2V5KHdvcmxkLCBxdWFsaXR5KTtcbiAgICBpZiAoc2hhcGVDYWNoZS5oYXMoa2V5KSkgcmV0dXJuIHNoYXBlQ2FjaGUuZ2V0KGtleSk7XG4gICAgY29uc3Qgd29ybGRTZWVkcyA9IGNyZWF0ZUFib3V0TmFycmF0aXZlU2VlZHMocG9pbnRDb3VudCwgd29ybGQuc2VlZCk7XG4gICAgY29uc3QgcHJvbWlzZSA9IGdlbmVyYXRlQWJvdXROYXJyYXRpdmVTaGFwZSh7XG4gICAgICBzaGFwZUlkOiB3b3JsZC5zaGFwZUlkLFxuICAgICAgcG9pbnRDb3VudCxcbiAgICAgIHNlZWRzOiB3b3JsZFNlZWRzLFxuICAgICAgcXVhbGl0eSxcbiAgICAgIHBhcmFtZXRlcnM6IHdvcmxkLnNoYXBlUGFyYW1ldGVycyxcbiAgICAgIHNpZ25hbCxcbiAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgIHNoYXBlQ2FjaGUuZGVsZXRlKGtleSk7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9KTtcbiAgICBzaGFwZUNhY2hlLnNldChrZXksIHByb21pc2UpO1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9O1xuXG4gIGNvbnN0IGluc3RhbGxQcmVwYXJlZFBhaXIgPSAocGFpcikgPT4ge1xuICAgIGlmIChkaXNwb3NlZCB8fCAhcGFpciB8fCBpbnN0YWxsZWRQYWlyPy5rZXkgPT09IHBhaXIua2V5KSByZXR1cm47XG4gICAgY29uc3QgYXR0cmlidXRlcyA9IHtcbiAgICAgIHBvc2l0aW9uOiBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHBhaXIuZnJvbU91dHB1dC5wb3NpdGlvbnMsIDMpLFxuICAgICAgdGFyZ2V0UG9zaXRpb246IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUocGFpci50b091dHB1dC5wb3NpdGlvbnMsIDMpLFxuICAgICAgZnJvbVByZXNlbmNlOiBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHBhaXIuZnJvbU91dHB1dC5wcmVzZW5jZSwgMSksXG4gICAgICB0b1ByZXNlbmNlOiBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHBhaXIudG9PdXRwdXQucHJlc2VuY2UsIDEpLFxuICAgICAgZnJvbVBvaW50U2l6ZTogbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShwYWlyLmZyb21PdXRwdXQuc2l6ZSwgMSksXG4gICAgICB0b1BvaW50U2l6ZTogbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShwYWlyLnRvT3V0cHV0LnNpemUsIDEpLFxuICAgICAgZnJvbUdyb3VwOiBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHBhaXIuZnJvbU91dHB1dC5hdHRyaWJ1dGVzLmRpc2NpcGxpbmVHcm91cCB8fCBlbXB0eUdyb3VwLCAxKSxcbiAgICAgIHRvR3JvdXA6IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUocGFpci50b091dHB1dC5hdHRyaWJ1dGVzLmRpc2NpcGxpbmVHcm91cCB8fCBlbXB0eUdyb3VwLCAxKSxcbiAgICB9O1xuICAgIE9iamVjdC5lbnRyaWVzKGF0dHJpYnV0ZXMpLmZvckVhY2goKFtuYW1lLCBhdHRyaWJ1dGVdKSA9PiBnZW9tZXRyeS5zZXRBdHRyaWJ1dGUobmFtZSwgYXR0cmlidXRlKSk7XG4gICAgY2FwdHVyZURpc2NpcGxpbmVQb3NpdGlvbnMocGFpci5mcm9tT3V0cHV0LCBmcm9tRGlzY2lwbGluZVBvc2l0aW9ucyk7XG4gICAgY2FwdHVyZURpc2NpcGxpbmVQb3NpdGlvbnMocGFpci50b091dHB1dCwgdG9EaXNjaXBsaW5lUG9zaXRpb25zKTtcbiAgICBpbnN0YWxsZWRQYWlyID0geyAuLi5wYWlyLCBwcm9ncmVzczogMCB9O1xuICAgIGJ1ZmZlclJlYnVpbGRzICs9IDE7XG4gICAgcm9vdC5kYXRhc2V0LndvcmxkQnVmZmVyUmVidWlsZHMgPSBTdHJpbmcoYnVmZmVyUmVidWlsZHMpO1xuICAgIHJvb3QuZGF0YXNldC5wb2ludEFzc2V0ID0gcGFpci50b091dHB1dC5mYWxsYmFja1JlYXNvbiA/ICdwcm9jZWR1cmFsLWZhbGxiYWNrJyA6IHBhaXIudG9Xb3JsZC5zaGFwZUlkO1xuICAgIGlmIChzZXF1ZW5jZVN0YXRlICE9PSAnbG9hZGluZycpIHJvb3QuZGF0YXNldC53b3JsZFByZXBhcmUgPSAncmVhZHknO1xuICAgIHJvb3QuZGF0YXNldC53b3JsZEZyb20gPSBwYWlyLmZyb21Xb3JsZC5zaGFwZUlkO1xuICAgIHJvb3QuZGF0YXNldC53b3JsZFRvID0gcGFpci50b1dvcmxkLnNoYXBlSWQ7XG4gICAgcm9vdC5kYXRhc2V0LndvcmxkQ29ycmVzcG9uZGVuY2UgPSBwYWlyLmluc3RhbGxlZFN0cmF0ZWd5O1xuICAgIHJvb3QuZGF0YXNldC53b3JsZENvcnJlc3BvbmRlbmNlUmVxdWVzdGVkID0gcGFpci5yZXF1ZXN0ZWRTdHJhdGVneTtcbiAgICByb290LmRhdGFzZXQud29ybGRDb3JyZXNwb25kZW5jZUltcHJvdmVtZW50ID0gTnVtYmVyKHBhaXIubWV0cmljcy5pbXByb3ZlbWVudCB8fCAwKS50b0ZpeGVkKDQpO1xuICAgIHJvb3QuZGF0YXNldC53b3JsZENvcnJlc3BvbmRlbmNlUDk1ID0gTnVtYmVyKHBhaXIubWV0cmljcy5wOTVEaXN0YW5jZSB8fCAwKS50b0ZpeGVkKDQpO1xuICAgIHJvb3QuZGF0YXNldC53b3JsZENvcnJlc3BvbmRlbmNlTWF4ID0gTnVtYmVyKHBhaXIubWV0cmljcy5tYXhEaXN0YW5jZSB8fCAwKS50b0ZpeGVkKDQpO1xuICAgIHJvb3QuZGF0YXNldC53b3JsZENvcnJlc3BvbmRlbmNlRmFsbGJhY2sgPSBwYWlyLmZhbGxiYWNrUmVhc29uIHx8ICcnO1xuICAgIHJvb3QuZGF0YXNldC53b3JsZENvcnJlc3BvbmRlbmNlUGFpciA9IHBhaXIua2V5O1xuICB9O1xuXG4gIGNvbnN0IGNyZWF0ZVByZXBhcmVkU2VxdWVuY2UgPSAoa2V5LCBzZXF1ZW5jZSwgb3V0cHV0cywgd29ya2VyUGFpcnMsIHN0YXJ0ZWRBdCkgPT4ge1xuICAgIGNvbnN0IHBhaXJzID0gbmV3IE1hcCgpO1xuICAgIGxldCBvcmRlcmVkU291cmNlID0gb3V0cHV0c1swXTtcbiAgICBsZXQgbWFpblRocmVhZEFwcGxpY2F0aW9uTXMgPSAwO1xuICAgIHdvcmtlclBhaXJzLmZvckVhY2goKHdvcmtlclBhaXIsIGluZGV4KSA9PiB7XG4gICAgICBjb25zdCB0b091dHB1dCA9IGluZGV4ID09PSAwXG4gICAgICAgID8gb3V0cHV0c1swXVxuICAgICAgICA6ICgoKSA9PiB7XG4gICAgICAgICAgY29uc3QgYXBwbHlTdGFydGVkQXQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgICBjb25zdCBtYXBwZWQgPSBhcHBseUFib3V0TmFycmF0aXZlUGVybXV0YXRpb24ob3V0cHV0c1tpbmRleF0sIHdvcmtlclBhaXIucGVybXV0YXRpb24pO1xuICAgICAgICAgIG1haW5UaHJlYWRBcHBsaWNhdGlvbk1zICs9IHBlcmZvcm1hbmNlLm5vdygpIC0gYXBwbHlTdGFydGVkQXQ7XG4gICAgICAgICAgcmV0dXJuIG1hcHBlZDtcbiAgICAgICAgfSkoKTtcbiAgICAgIGNvbnN0IGZyb21Xb3JsZCA9IHNlcXVlbmNlW01hdGgubWF4KDAsIGluZGV4IC0gMSldO1xuICAgICAgY29uc3QgdG9Xb3JsZCA9IHNlcXVlbmNlW2luZGV4XTtcbiAgICAgIHBhaXJzLnNldCh0b1dvcmxkLnNlY3Rpb25JZCwge1xuICAgICAgICBrZXk6IGAke2tleX06JHt0b1dvcmxkLnNlY3Rpb25JZH1gLFxuICAgICAgICBmcm9tV29ybGQsXG4gICAgICAgIHRvV29ybGQsXG4gICAgICAgIGZyb21PdXRwdXQ6IG9yZGVyZWRTb3VyY2UsXG4gICAgICAgIHRvT3V0cHV0LFxuICAgICAgICByZXF1ZXN0ZWRTdHJhdGVneTogd29ya2VyUGFpci5yZXF1ZXN0ZWRTdHJhdGVneSxcbiAgICAgICAgaW5zdGFsbGVkU3RyYXRlZ3k6IHdvcmtlclBhaXIuaW5zdGFsbGVkU3RyYXRlZ3ksXG4gICAgICAgIGZhbGxiYWNrUmVhc29uOiB3b3JrZXJQYWlyLmZhbGxiYWNrUmVhc29uLFxuICAgICAgICBtZXRyaWNzOiB3b3JrZXJQYWlyLm1ldHJpY3MsXG4gICAgICB9KTtcbiAgICAgIG9yZGVyZWRTb3VyY2UgPSB0b091dHB1dDtcbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAga2V5LFxuICAgICAgcGFpcnMsXG4gICAgICB3b3JsZElkczogc2VxdWVuY2UubWFwKCh3b3JsZCkgPT4gd29ybGQuc2VjdGlvbklkKSxcbiAgICAgIHByZXBhcmF0aW9uRHVyYXRpb25NczogcGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydGVkQXQsXG4gICAgICBtYWluVGhyZWFkQXBwbGljYXRpb25NcyxcbiAgICB9O1xuICB9O1xuXG4gIGNvbnN0IGZhaWxQcmVwYXJhdGlvbiA9IChnZW5lcmF0aW9uLCBlcnJvcikgPT4ge1xuICAgIGlmIChkaXNwb3NlZCB8fCBnZW5lcmF0aW9uICE9PSBwcmVwYXJhdGlvbkdlbmVyYXRpb24pIHJldHVybjtcbiAgICBwZW5kaW5nU2VxdWVuY2VLZXkgPSAnJztcbiAgICBzZXF1ZW5jZVN0YXRlID0gJ2ZhaWxlZCc7XG4gICAgY29ycmVzcG9uZGVuY2VXb3JrZXI/LnRlcm1pbmF0ZSgpO1xuICAgIGNvcnJlc3BvbmRlbmNlV29ya2VyID0gbnVsbDtcbiAgICByb290LmRhdGFzZXQud29ybGRQcmVwYXJlID0gJ2ZhaWxlZCc7XG4gICAgcm9vdC5kYXRhc2V0LndvcmxkRXJyb3IgPSBlcnJvcj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpO1xuICAgIGNvbnNvbGUud2FybignW0Fib3V0IG5hcnJhdGl2ZV0gU2VxdWVuY2UgcHJlcGFyYXRpb24gZmFpbGVkOyByZXRhaW5pbmcgdGhlIGxhc3QgdmFsaWQgZmllbGQuJywgZXJyb3IpO1xuICB9O1xuXG4gIGNvbnN0IHByZXBhcmVTZXF1ZW5jZSA9IChzZXF1ZW5jZSwgZ2xvYmFscykgPT4ge1xuICAgIGlmICghc2VxdWVuY2U/Lmxlbmd0aCkgcmV0dXJuICcnO1xuICAgIGNvbnN0IG5leHRLZXkgPSBjcmVhdGVTZXF1ZW5jZUNhY2hlS2V5KHNlcXVlbmNlLCBnbG9iYWxzLCBxdWFsaXR5LCBjb21wYWN0KTtcbiAgICBpZiAocGVuZGluZ1NlcXVlbmNlS2V5ICYmIHBlbmRpbmdTZXF1ZW5jZUtleSAhPT0gbmV4dEtleVxuICAgICAgJiYgKHJlYWR5U2VxdWVuY2U/LmtleSA9PT0gbmV4dEtleSB8fCBzZXF1ZW5jZUNhY2hlLmhhcyhuZXh0S2V5KSkpIHtcbiAgICAgIHByZXBhcmF0aW9uR2VuZXJhdGlvbiArPSAxO1xuICAgICAgZ2VuZXJhdGlvbkNvbnRyb2xsZXI/LmFib3J0KCk7XG4gICAgICBjb3JyZXNwb25kZW5jZVdvcmtlcj8udGVybWluYXRlKCk7XG4gICAgICBjb3JyZXNwb25kZW5jZVdvcmtlciA9IG51bGw7XG4gICAgICBwZW5kaW5nU2VxdWVuY2VLZXkgPSAnJztcbiAgICB9XG4gICAgaWYgKHJlYWR5U2VxdWVuY2U/LmtleSA9PT0gbmV4dEtleSB8fCBwZW5kaW5nU2VxdWVuY2VLZXkgPT09IG5leHRLZXkpIHJldHVybiBuZXh0S2V5O1xuICAgIGlmIChzZXF1ZW5jZUNhY2hlLmhhcyhuZXh0S2V5KSkge1xuICAgICAgcmVhZHlTZXF1ZW5jZSA9IHNlcXVlbmNlQ2FjaGUuZ2V0KG5leHRLZXkpO1xuICAgICAgdG91Y2hCb3VuZGVkQ2FjaGUoc2VxdWVuY2VDYWNoZSwgbmV4dEtleSwgcmVhZHlTZXF1ZW5jZSk7XG4gICAgICBzZXF1ZW5jZVN0YXRlID0gJ3JlYWR5JztcbiAgICAgIHJvb3QuZGF0YXNldC53b3JsZFByZXBhcmUgPSAncmVhZHknO1xuICAgICAgZGVsZXRlIHJvb3QuZGF0YXNldC53b3JsZEVycm9yO1xuICAgICAgcmV0dXJuIG5leHRLZXk7XG4gICAgfVxuXG4gICAgY29uc3QgZ2VuZXJhdGlvbiA9ICsrcHJlcGFyYXRpb25HZW5lcmF0aW9uO1xuICAgIGNvbnN0IHN0YXJ0ZWRBdCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIHBlbmRpbmdTZXF1ZW5jZUtleSA9IG5leHRLZXk7XG4gICAgc2VxdWVuY2VTdGF0ZSA9ICdsb2FkaW5nJztcbiAgICBnZW5lcmF0aW9uQ29udHJvbGxlcj8uYWJvcnQoKTtcbiAgICBjb3JyZXNwb25kZW5jZVdvcmtlcj8udGVybWluYXRlKCk7XG4gICAgY29ycmVzcG9uZGVuY2VXb3JrZXIgPSBudWxsO1xuICAgIGdlbmVyYXRpb25Db250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIHJvb3QuZGF0YXNldC53b3JsZFByZXBhcmUgPSAnbG9hZGluZyc7XG4gICAgY29uc3QgZmlyc3RTaGFwZVN0YXJ0ZWRBdCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIGNvbnN0IGZpcnN0U2hhcGUgPSBnZXRTaGFwZShzZXF1ZW5jZVswXSwgZ2VuZXJhdGlvbkNvbnRyb2xsZXIuc2lnbmFsKTtcbiAgICByb290LmRhdGFzZXQud29ybGRCb290c3RyYXBHZW5lcmF0aW9uTXMgPSAocGVyZm9ybWFuY2Uubm93KCkgLSBmaXJzdFNoYXBlU3RhcnRlZEF0KS50b0ZpeGVkKDIpO1xuXG4gICAgaWYgKCFpbnN0YWxsZWRQYWlyKSB7XG4gICAgICBmaXJzdFNoYXBlLnRoZW4oKG91dHB1dCkgPT4ge1xuICAgICAgICBpZiAoZGlzcG9zZWQgfHwgZ2VuZXJhdGlvbiAhPT0gcHJlcGFyYXRpb25HZW5lcmF0aW9uIHx8IGluc3RhbGxlZFBhaXIpIHJldHVybjtcbiAgICAgICAgaW5zdGFsbFByZXBhcmVkUGFpcih7XG4gICAgICAgICAga2V5OiBgJHtuZXh0S2V5fToke3NlcXVlbmNlWzBdLnNlY3Rpb25JZH06Ym9vdHN0cmFwYCxcbiAgICAgICAgICBmcm9tV29ybGQ6IHNlcXVlbmNlWzBdLFxuICAgICAgICAgIHRvV29ybGQ6IHNlcXVlbmNlWzBdLFxuICAgICAgICAgIGZyb21PdXRwdXQ6IG91dHB1dCxcbiAgICAgICAgICB0b091dHB1dDogb3V0cHV0LFxuICAgICAgICAgIHJlcXVlc3RlZFN0cmF0ZWd5OiAnaW5kZXgtdjEnLFxuICAgICAgICAgIGluc3RhbGxlZFN0cmF0ZWd5OiAnaW5kZXgtdjEnLFxuICAgICAgICAgIGZhbGxiYWNrUmVhc29uOiAnJyxcbiAgICAgICAgICBtZXRyaWNzOiB7XG4gICAgICAgICAgICBpbXByb3ZlbWVudDogMCxcbiAgICAgICAgICAgIHA5NURpc3RhbmNlOiAwLFxuICAgICAgICAgICAgbWF4RGlzdGFuY2U6IDAsXG4gICAgICAgICAgICB3ZWlnaHRlZFJtc0Rpc3RhbmNlOiAwLFxuICAgICAgICAgICAgcHJlcGFyYXRpb25EdXJhdGlvbk1zOiAwLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfSkuY2F0Y2goKCkgPT4ge30pO1xuICAgIH1cblxuICAgIGZpcnN0U2hhcGUudGhlbigoKSA9PiB7XG4gICAgICBpZiAoZGlzcG9zZWQgfHwgZ2VuZXJhdGlvbiAhPT0gcHJlcGFyYXRpb25HZW5lcmF0aW9uKSByZXR1cm47XG4gICAgICBjb25zdCBlbnRyaWVzID0gc2VxdWVuY2UubWFwKCh3b3JsZCwgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgbWF0cml4ID0gd3JpdGVXb3JsZFRyYW5zZm9ybShcbiAgICAgICAgICBpbmRleCA9PT0gMCA/IGNvcnJlc3BvbmRlbmNlRnJvbVRyYW5zZm9ybSA6IGNvcnJlc3BvbmRlbmNlVG9UcmFuc2Zvcm0sXG4gICAgICAgICAgd29ybGQsXG4gICAgICAgICAgZ2xvYmFscyxcbiAgICAgICAgICBjb21wYWN0LFxuICAgICAgICAgIGluZGV4ID09PSAwID8gY29ycmVzcG9uZGVuY2VGcm9tU2NyYXRjaCA6IGNvcnJlc3BvbmRlbmNlVG9TY3JhdGNoLFxuICAgICAgICApLmVsZW1lbnRzLnNsaWNlKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWQ6IHdvcmxkLnNlY3Rpb25JZCxcbiAgICAgICAgICBtb2RlOiBpbmRleCA9PT0gMCA/ICdpbmRleC12MScgOiB3b3JsZC50cmFuc2l0aW9uSW4/LmNvcnJlc3BvbmRlbmNlIHx8ICdpbmRleC12MScsXG4gICAgICAgICAgbWF0cml4LFxuICAgICAgICAgIHNoYXBlSWQ6IHdvcmxkLnNoYXBlSWQsXG4gICAgICAgICAgc2VlZDogd29ybGQuc2VlZCxcbiAgICAgICAgICBwYXJhbWV0ZXJzOiB3b3JsZC5zaGFwZVBhcmFtZXRlcnMsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGNvcnJlc3BvbmRlbmNlV29ya2VyID0gbmV3IFdvcmtlcihcbiAgICAgICAgbmV3IFVSTCgnLi9hYm91dE5hcnJhdGl2ZUNvcnJlc3BvbmRlbmNlLndvcmtlci5qcycsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICAgIHsgdHlwZTogJ21vZHVsZScsIG5hbWU6ICdhYm91dC1uYXJyYXRpdmUtY29ycmVzcG9uZGVuY2UnIH0sXG4gICAgICApO1xuICAgICAgY29ycmVzcG9uZGVuY2VXb3JrZXIub25tZXNzYWdlID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGlmIChkaXNwb3NlZCB8fCBldmVudC5kYXRhPy5nZW5lcmF0aW9uICE9PSBwcmVwYXJhdGlvbkdlbmVyYXRpb24gfHwgZ2VuZXJhdGlvbiAhPT0gcHJlcGFyYXRpb25HZW5lcmF0aW9uKSByZXR1cm47XG4gICAgICAgIGlmIChldmVudC5kYXRhLmVycm9yKSB7XG4gICAgICAgICAgZmFpbFByZXBhcmF0aW9uKGdlbmVyYXRpb24sIG5ldyBFcnJvcihldmVudC5kYXRhLmVycm9yKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcHJlcGFyZWQgPSBjcmVhdGVQcmVwYXJlZFNlcXVlbmNlKG5leHRLZXksIHNlcXVlbmNlLCBldmVudC5kYXRhLm91dHB1dHMsIGV2ZW50LmRhdGEucGFpcnMsIHN0YXJ0ZWRBdCk7XG4gICAgICAgICAgcHJlcGFyZWQuZ2VuZXJhdGlvbkR1cmF0aW9uTXMgPSBOdW1iZXIoZXZlbnQuZGF0YS5nZW5lcmF0aW9uRHVyYXRpb25NcyB8fCAwKTtcbiAgICAgICAgICBwcmVwYXJlZC5jb3JyZXNwb25kZW5jZUR1cmF0aW9uTXMgPSBOdW1iZXIoZXZlbnQuZGF0YS5jb3JyZXNwb25kZW5jZUR1cmF0aW9uTXMgfHwgMCk7XG4gICAgICAgICAgcmVhZHlTZXF1ZW5jZSA9IHByZXBhcmVkO1xuICAgICAgICAgIHNlcXVlbmNlUHJlcGFyYXRpb25EdXJhdGlvbk1zID0gcHJlcGFyZWQucHJlcGFyYXRpb25EdXJhdGlvbk1zO1xuICAgICAgICAgIHRvdWNoQm91bmRlZENhY2hlKHNlcXVlbmNlQ2FjaGUsIG5leHRLZXksIHByZXBhcmVkKTtcbiAgICAgICAgICBwZW5kaW5nU2VxdWVuY2VLZXkgPSAnJztcbiAgICAgICAgICBzZXF1ZW5jZVN0YXRlID0gJ3JlYWR5JztcbiAgICAgICAgICBjb3JyZXNwb25kZW5jZVdvcmtlcj8udGVybWluYXRlKCk7XG4gICAgICAgICAgY29ycmVzcG9uZGVuY2VXb3JrZXIgPSBudWxsO1xuICAgICAgICAgIHJvb3QuZGF0YXNldC53b3JsZFByZXBhcmUgPSAncmVhZHknO1xuICAgICAgICAgIHJvb3QuZGF0YXNldC53b3JsZFNoYXBlR2VuZXJhdGlvbk1zID0gcHJlcGFyZWQuZ2VuZXJhdGlvbkR1cmF0aW9uTXMudG9GaXhlZCgyKTtcbiAgICAgICAgICByb290LmRhdGFzZXQud29ybGRDb3JyZXNwb25kZW5jZVdvcmtlck1zID0gcHJlcGFyZWQuY29ycmVzcG9uZGVuY2VEdXJhdGlvbk1zLnRvRml4ZWQoMik7XG4gICAgICAgICAgcm9vdC5kYXRhc2V0LndvcmxkQ29ycmVzcG9uZGVuY2VQcmVwYXJlTXMgPSBwcmVwYXJlZC5wcmVwYXJhdGlvbkR1cmF0aW9uTXMudG9GaXhlZCgyKTtcbiAgICAgICAgICByb290LmRhdGFzZXQud29ybGRDb3JyZXNwb25kZW5jZUFwcGx5TXMgPSBwcmVwYXJlZC5tYWluVGhyZWFkQXBwbGljYXRpb25Ncy50b0ZpeGVkKDIpO1xuICAgICAgICAgIGRlbGV0ZSByb290LmRhdGFzZXQud29ybGRFcnJvcjtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBmYWlsUHJlcGFyYXRpb24oZ2VuZXJhdGlvbiwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgY29ycmVzcG9uZGVuY2VXb3JrZXIub25lcnJvciA9IChldmVudCkgPT4gZmFpbFByZXBhcmF0aW9uKGdlbmVyYXRpb24sIG5ldyBFcnJvcihldmVudC5tZXNzYWdlKSk7XG4gICAgICBjb3JyZXNwb25kZW5jZVdvcmtlci5wb3N0TWVzc2FnZSh7IGdlbmVyYXRpb24sIGVudHJpZXMsIHBvaW50Q291bnQsIHF1YWxpdHkgfSk7XG4gICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICBpZiAoZXJyb3I/Lm5hbWUgPT09ICdBYm9ydEVycm9yJykge1xuICAgICAgICBpZiAoIWRpc3Bvc2VkICYmIGdlbmVyYXRpb24gPT09IHByZXBhcmF0aW9uR2VuZXJhdGlvbikge1xuICAgICAgICAgIHBlbmRpbmdTZXF1ZW5jZUtleSA9ICcnO1xuICAgICAgICAgIHNlcXVlbmNlU3RhdGUgPSAnaWRsZSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGRpc3Bvc2VkIHx8IGdlbmVyYXRpb24gIT09IHByZXBhcmF0aW9uR2VuZXJhdGlvbikgcmV0dXJuO1xuICAgICAgZmFpbFByZXBhcmF0aW9uKGdlbmVyYXRpb24sIGVycm9yKTtcbiAgICB9KTtcbiAgICByZXR1cm4gbmV4dEtleTtcbiAgfTtcblxuICBjb25zdCBzZXRNb2RpZmllclVuaWZvcm1zID0gKHByZWZpeCwgd29ybGQsIGdsb2JhbHMpID0+IHtcbiAgICBjb25zdCBzd2FybSA9IG1vZGlmaWVyKHdvcmxkLCAnc3dhcm0tbGlmZS12MScpO1xuICAgIGNvbnN0IHNoYXJlZFN3YXJtID0gc3dhcm1cbiAgICAgID8gcmVzb2x2ZUFib3V0TmFycmF0aXZlU3dhcm1Nb3Rpb24oc3dhcm0sIGdsb2JhbHMuc3dhcm1UdXJidWxlbmNlKVxuICAgICAgOiBudWxsO1xuICAgIGNvbnN0IGRyaWZ0ID0gc2hhcmVkU3dhcm0gfHwgbW9kaWZpZXIod29ybGQsICdhbWJpZW50LWRyaWZ0LXYxJyk7XG4gICAgY29uc3Qgd2F2ZSA9IG1vZGlmaWVyKHdvcmxkLCAnbGl2aW5nLXdhdmUtdjEnKTtcbiAgICBjb25zdCBncm91cCA9IG1vZGlmaWVyKHdvcmxkLCAnZ3JvdXAtZW1waGFzaXMtdjEnKTtcbiAgICBjb25zdCBjb2xvdXIgPSBtb2RpZmllcih3b3JsZCwgJ2xpdmluZy1jb2xvdXItdjEnKTtcbiAgICB1bmlmb3Jtc1tgJHtwcmVmaXh9RHJpZnRBbXBsaXR1ZGVgXS52YWx1ZSA9IE51bWJlcihkcmlmdD8uYW1wbGl0dWRlIHx8IDApO1xuICAgIHVuaWZvcm1zW2Ake3ByZWZpeH1EcmlmdFNwZWVkYF0udmFsdWUgPSBOdW1iZXIoZHJpZnQ/LnNwZWVkIHx8IDApO1xuICAgIHVuaWZvcm1zW2Ake3ByZWZpeH1EcmlmdElycmVndWxhcml0eWBdLnZhbHVlID0gTnVtYmVyKHNoYXJlZFN3YXJtPy5pcnJlZ3VsYXJpdHkgfHwgMCk7XG4gICAgdW5pZm9ybXNbYCR7cHJlZml4fURyaWZ0SW5kaXZpZHVhbGl0eWBdLnZhbHVlID0gTnVtYmVyKHNoYXJlZFN3YXJtPy5pbmRpdmlkdWFsaXR5IHx8IDApO1xuICAgIHVuaWZvcm1zW2Ake3ByZWZpeH1EcmlmdEF4aXNTcHJlYWRgXS52YWx1ZSA9IE51bWJlcihzaGFyZWRTd2FybT8uYXhpc1NwcmVhZCB8fCAwKTtcbiAgICB1bmlmb3Jtc1tgJHtwcmVmaXh9RHJpZnRTdG9yeU1peGBdLnZhbHVlID0gc2hhcmVkU3dhcm1cbiAgICAgID8gc2hhcmVkU3dhcm0uc3RvcnlNaXhcbiAgICAgIDogZHJpZnQ/LnRpbWVNb2RlID09PSAnc3RvcnknID8gMSA6IGRyaWZ0Py50aW1lTW9kZSA9PT0gJ21peGVkJyA/IDAuMDggOiAwO1xuICAgIHVuaWZvcm1zW2Ake3ByZWZpeH1XYXZlV2VpZ2h0YF0udmFsdWUgPSB3YXZlID8gTnVtYmVyKHdhdmUuc3RyZW5ndGggPz8gMSkgOiAwO1xuICAgIHVuaWZvcm1zW2Ake3ByZWZpeH1XYXZlQW1wbGl0dWRlYF0udmFsdWUgPSBOdW1iZXIod2F2ZT8uYW1wbGl0dWRlIHx8IDApO1xuICAgIHVuaWZvcm1zW2Ake3ByZWZpeH1XYXZlU3BlZWRgXS52YWx1ZSA9IE51bWJlcih3YXZlPy5zcGVlZCB8fCAwKTtcbiAgICB1bmlmb3Jtc1tgJHtwcmVmaXh9V2F2ZUZyZXF1ZW5jeWBdLnZhbHVlLnNldChcbiAgICAgIE51bWJlcih3YXZlPy5mcmVxdWVuY3lYIHx8IDEpLFxuICAgICAgTnVtYmVyKHdhdmU/LmZyZXF1ZW5jeVogfHwgMSksXG4gICAgKTtcbiAgICB1bmlmb3Jtc1tgJHtwcmVmaXh9R3JvdXBTdHJlbmd0aGBdLnZhbHVlID0gTnVtYmVyKGdyb3VwPy5zdHJlbmd0aCB8fCAwKTtcbiAgICB1bmlmb3Jtc1tgJHtwcmVmaXh9TGl2aW5nQ29sb3VyYF0udmFsdWUgPSBOdW1iZXIoY29sb3VyPy5zdHJlbmd0aCB8fCAwKTtcbiAgfTtcblxuICBjb25zdCByZXNvbHZlRGlzY2lwbGluZVN0b3J5T2Zmc2V0ID0gKGZyYW1lLCB3b3JsZCwgdGFyZ2V0KSA9PiB7XG4gICAgdGFyZ2V0LnNldCgwLCAwLCAwKTtcbiAgICBpZiAoZnJhbWUucmVkdWNlZE1vdGlvbiB8fCB3b3JsZD8uc2hhcGVJZCAhPT0gJ2Rpc2NpcGxpbmUtZ3JpZC12MScpIHJldHVybiAwO1xuICAgIGNvbnN0IHN0b3J5VHJhdmVsID0gTWF0aC5tYXgoMCwgZnJhbWUuc3RvcnlXVSAtIE51bWJlcih3b3JsZC5zdGFydFdVIHx8IDApKVxuICAgICAgKiBOdW1iZXIoZnJhbWUuY2FtZXJhLmNhZGVuY2UgfHwgMSk7XG4gICAgY29uc3QgcmlzZVN0YXJ0ID0gTWF0aC5tYXgoMC4wNCwgTnVtYmVyKHdvcmxkLnRyYXZlbFdVIHx8IDAuOCkgKiAwLjIpO1xuICAgIGNvbnN0IGV4dHJhUmlzZSA9IChjb21wYWN0ID8gMC43MiA6IDEuMSlcbiAgICAgICogc21vb3RoUmFuZ2Uoc3RvcnlUcmF2ZWwsIHJpc2VTdGFydCwgcmlzZVN0YXJ0ICsgKGNvbXBhY3QgPyAwLjkgOiAxLjE1KSk7XG4gICAgY29uc3QgcmlzZSA9IHN0b3J5VHJhdmVsICsgZXh0cmFSaXNlO1xuICAgIGNhbWVyYVVwU2NyYXRjaC5zZXQoMCwgMSwgMCkuYXBwbHlRdWF0ZXJuaW9uKGNhbWVyYS5xdWF0ZXJuaW9uKS5ub3JtYWxpemUoKTtcbiAgICB0YXJnZXQuY29weShjYW1lcmFVcFNjcmF0Y2gpLm11bHRpcGx5U2NhbGFyKHJpc2UpO1xuICAgIHJldHVybiByaXNlO1xuICB9O1xuXG4gIGNvbnN0IHVwZGF0ZURpc2NpcGxpbmVSZXZlYWwgPSAoZnJhbWUsIGZyb21Xb3JsZCwgdG9Xb3JsZCkgPT4ge1xuICAgIGNvbnN0IHJldmVhbFN0YXRlID0gZnJhbWUuZGlzY2lwbGluZVJldmVhbDtcbiAgICBjb25zdCByZXZlYWwgPSByZXZlYWxTdGF0ZT8uY29uZmlnO1xuICAgIGNvbnN0IG92ZXJsYXkgPSBkaXNjaXBsaW5lT3ZlcmxheVJlZj8uY3VycmVudDtcbiAgICBjb25zdCBncmlkV29ybGQgPSB0b1dvcmxkLnNoYXBlSWQgPT09ICdkaXNjaXBsaW5lLWdyaWQtdjEnXG4gICAgICA/IHRvV29ybGRcbiAgICAgIDogZnJvbVdvcmxkLnNoYXBlSWQgPT09ICdkaXNjaXBsaW5lLWdyaWQtdjEnID8gZnJvbVdvcmxkIDogbnVsbDtcbiAgICBjb25zdCBncmlkVHJhbnNmb3JtID0gZ3JpZFdvcmxkID09PSB0b1dvcmxkXG4gICAgICA/IHVuaWZvcm1zLnRvVHJhbnNmb3JtLnZhbHVlXG4gICAgICA6IHVuaWZvcm1zLmZyb21UcmFuc2Zvcm0udmFsdWU7XG4gICAgY29uc3QgZ3JpZERpc2NpcGxpbmVQb3NpdGlvbnMgPSBncmlkV29ybGQgPT09IHRvV29ybGRcbiAgICAgID8gdG9EaXNjaXBsaW5lUG9zaXRpb25zXG4gICAgICA6IGZyb21EaXNjaXBsaW5lUG9zaXRpb25zO1xuICAgIGNvbnN0IGxvY2FsID0gTnVtYmVyKHJldmVhbFN0YXRlPy5sb2NhbFByb2dyZXNzID8/IC0xKTtcbiAgICBjb25zdCByZXZlYWxBdmFpbGFibGUgPSBCb29sZWFuKHJldmVhbCAmJiBncmlkV29ybGQgJiYgbG9jYWwgPj0gMCk7XG4gICAgY29uc3QgcmVkdWNlZEFjdGl2ZSA9IGZyYW1lLnJlZHVjZWRNb3Rpb24gJiYgZnJhbWUuc2VjdGlvbkluZGV4ID09PSByZXZlYWxTdGF0ZT8uc2VjdGlvbkluZGV4O1xuICAgIGRpc2NpcGxpbmVXZWlnaHRzLmZpbGwoMCk7XG5cbiAgICBsZXQgYmFja2dyb3VuZFdlaWdodCA9IDA7XG4gICAgbGV0IHZpc2libGVMYWJlbHMgPSAwO1xuICAgIGlmIChyZXZlYWxBdmFpbGFibGUpIHtcbiAgICAgIGJhY2tncm91bmRXZWlnaHQgPSByZWR1Y2VkQWN0aXZlXG4gICAgICAgID8gMVxuICAgICAgICA6IHNtb290aFJhbmdlKGxvY2FsLCByZXZlYWwuc3RhcnQsIHJldmVhbC5zdGFydCArIHJldmVhbC5iYWNrZ3JvdW5kRmFkZSk7XG4gICAgICBjb25zdCBsYXN0UmV2ZWFsRW5kID0gcmV2ZWFsLnN0YXJ0XG4gICAgICAgICsgKE1hdGgubWF4KDAsIHJldmVhbC5pdGVtcy5sZW5ndGggLSAxKSAqIHJldmVhbC5zdGFnZ2VyKVxuICAgICAgICArIHJldmVhbC5sYWJlbER1cmF0aW9uO1xuICAgICAgY29uc3QgZXhpdFN0YXJ0ID0gTWF0aC5taW4ocmV2ZWFsLmVuZCwgbGFzdFJldmVhbEVuZCArIHJldmVhbC5ob2xkKTtcbiAgICAgIGNvbnN0IGV4aXRQcm9ncmVzcyA9IHJlZHVjZWRBY3RpdmUgPyAwIDogc21vb3RoUmFuZ2UobG9jYWwsIGV4aXRTdGFydCwgcmV2ZWFsLmVuZCk7XG4gICAgICByZXZlYWwuaXRlbXMuZm9yRWFjaCgoaXRlbSwgb3JkZXJJbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBpdGVtU3RhcnQgPSByZXZlYWwuc3RhcnQgKyAob3JkZXJJbmRleCAqIHJldmVhbC5zdGFnZ2VyKTtcbiAgICAgICAgY29uc3QgaXRlbVJldmVhbCA9IHJlZHVjZWRBY3RpdmVcbiAgICAgICAgICA/IDFcbiAgICAgICAgICA6IHNtb290aFJhbmdlKGxvY2FsLCBpdGVtU3RhcnQsIGl0ZW1TdGFydCArIHJldmVhbC5sYWJlbER1cmF0aW9uKTtcbiAgICAgICAgZGlzY2lwbGluZVdlaWdodHNbaXRlbS5ncm91cCAtIDFdID0gaXRlbVJldmVhbDtcbiAgICAgICAgY29uc3QgbGFiZWxSZXZlYWwgPSBsb2NhbCA8PSByZXZlYWwuZW5kID8gaXRlbVJldmVhbCAqICgxIC0gZXhpdFByb2dyZXNzKSA6IDA7XG4gICAgICAgIGNvbnN0IGxhYmVsID0gb3ZlcmxheT8ucXVlcnlTZWxlY3RvcihgW2RhdGEtZGlzY2lwbGluZS1ncm91cD1cIiR7aXRlbS5ncm91cH1cIl1gKTtcbiAgICAgICAgaWYgKGxhYmVsKSB7XG4gICAgICAgICAgbGFiZWwuc3R5bGUuc2V0UHJvcGVydHkoJy0tZGlzY2lwbGluZS1yZXZlYWwnLCBsYWJlbFJldmVhbC50b0ZpeGVkKDQpKTtcbiAgICAgICAgICBsYWJlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1kaXNjaXBsaW5lLWJsdXInLCBgJHsoKDEgLSBsYWJlbFJldmVhbCkgKiA3KS50b0ZpeGVkKDIpfXB4YCk7XG4gICAgICAgICAgbGFiZWwuc3R5bGUuc2V0UHJvcGVydHkoJy0tZGlzY2lwbGluZS1zaGlmdCcsIGAkeygoMSAtIGxhYmVsUmV2ZWFsKSAqIDEyKS50b0ZpeGVkKDIpfXB4YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxhYmVsUmV2ZWFsID4gMC4wNSkgdmlzaWJsZUxhYmVscyArPSAxO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdW5pZm9ybXMuZGlzY2lwbGluZVJldmVhbEEudmFsdWUuc2V0KFxuICAgICAgZGlzY2lwbGluZVdlaWdodHNbMF0sXG4gICAgICBkaXNjaXBsaW5lV2VpZ2h0c1sxXSxcbiAgICAgIGRpc2NpcGxpbmVXZWlnaHRzWzJdLFxuICAgICk7XG4gICAgdW5pZm9ybXMuZGlzY2lwbGluZVJldmVhbEIudmFsdWUuc2V0KFxuICAgICAgZGlzY2lwbGluZVdlaWdodHNbM10sXG4gICAgICBkaXNjaXBsaW5lV2VpZ2h0c1s0XSxcbiAgICAgIGRpc2NpcGxpbmVXZWlnaHRzWzVdLFxuICAgICk7XG4gICAgdW5pZm9ybXMuZGlzY2lwbGluZVJldmVhbEFjdGl2ZS52YWx1ZSA9IHJldmVhbEF2YWlsYWJsZSA/IDEgOiAwO1xuICAgIHVuaWZvcm1zLmRpc2NpcGxpbmVCYWNrZ3JvdW5kV2VpZ2h0LnZhbHVlID0gYmFja2dyb3VuZFdlaWdodDtcbiAgICB1bmlmb3Jtcy5kaXNjaXBsaW5lQmFja2dyb3VuZE9wYWNpdHkudmFsdWUgPSBOdW1iZXIocmV2ZWFsPy5iYWNrZ3JvdW5kT3BhY2l0eSA/PyAwLjA2KTtcbiAgICB1bmlmb3Jtcy5kaXNjaXBsaW5lUG9pbnRTY2FsZS52YWx1ZSA9IE51bWJlcihyZXZlYWw/LnBvaW50U2NhbGUgPz8gMy42KTtcblxuICAgIGlmIChvdmVybGF5KSB7XG4gICAgICBvdmVybGF5LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCB2aXNpYmxlTGFiZWxzID4gMCA/ICdmYWxzZScgOiAndHJ1ZScpO1xuICAgICAgaWYgKHJldmVhbEF2YWlsYWJsZSkge1xuICAgICAgICBjYW1lcmEudXBkYXRlTWF0cml4V29ybGQodHJ1ZSk7XG4gICAgICAgIGZvciAobGV0IGdyb3VwID0gMTsgZ3JvdXAgPD0gNjsgZ3JvdXAgKz0gMSkge1xuICAgICAgICAgIGNvbnN0IGxhYmVsID0gb3ZlcmxheS5xdWVyeVNlbGVjdG9yKGBbZGF0YS1kaXNjaXBsaW5lLWdyb3VwPVwiJHtncm91cH1cIl1gKTtcbiAgICAgICAgICBpZiAoIWxhYmVsKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBvZmZzZXQgPSAoZ3JvdXAgLSAxKSAqIDM7XG4gICAgICAgICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUoZ3JpZERpc2NpcGxpbmVQb3NpdGlvbnNbb2Zmc2V0XSkpIGNvbnRpbnVlO1xuICAgICAgICAgIGRpc2NpcGxpbmVQb2ludFNjcmF0Y2guc2V0KFxuICAgICAgICAgICAgZ3JpZERpc2NpcGxpbmVQb3NpdGlvbnNbb2Zmc2V0XSxcbiAgICAgICAgICAgIGdyaWREaXNjaXBsaW5lUG9zaXRpb25zW29mZnNldCArIDFdLFxuICAgICAgICAgICAgZ3JpZERpc2NpcGxpbmVQb3NpdGlvbnNbb2Zmc2V0ICsgMl0sXG4gICAgICAgICAgKS5hcHBseU1hdHJpeDQoZ3JpZFRyYW5zZm9ybSkucHJvamVjdChjYW1lcmEpO1xuICAgICAgICAgIGxhYmVsLnN0eWxlLnNldFByb3BlcnR5KCctLWRpc2NpcGxpbmUteCcsIGAke3ZpZXdwb3J0T2Zmc2V0WCArICgoKGRpc2NpcGxpbmVQb2ludFNjcmF0Y2gueCAqIDAuNSkgKyAwLjUpICogd2lkdGgpfXB4YCk7XG4gICAgICAgICAgbGFiZWwuc3R5bGUuc2V0UHJvcGVydHkoJy0tZGlzY2lwbGluZS15JywgYCR7dmlld3BvcnRPZmZzZXRZICsgKCgoLWRpc2NpcGxpbmVQb2ludFNjcmF0Y2gueSAqIDAuNSkgKyAwLjUpICogaGVpZ2h0KX1weGApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJvb3QuZGF0YXNldC53b3JsZERpc2NpcGxpbmVWaXNpYmxlID0gU3RyaW5nKGRpc2NpcGxpbmVXZWlnaHRzLnJlZHVjZSgoY291bnQsIHZhbHVlKSA9PiBjb3VudCArICh2YWx1ZSA+IDAuOTUgPyAxIDogMCksIDApKTtcbiAgICByb290LmRhdGFzZXQud29ybGREaXNjaXBsaW5lTGFiZWxzID0gU3RyaW5nKHZpc2libGVMYWJlbHMpO1xuICAgIHJvb3QuZGF0YXNldC53b3JsZEdyaWRCYWNrZ3JvdW5kID0gYmFja2dyb3VuZFdlaWdodC50b0ZpeGVkKDQpO1xuICB9O1xuXG4gIGNvbnN0IHJlbmRlciA9IChmcmFtZSkgPT4ge1xuICAgIGxhdGVzdEZyYW1lID0gZnJhbWU7XG4gICAgaWYgKCFmcmFtZSB8fCAhY29udGV4dEF2YWlsYWJsZSB8fCBkb2N1bWVudC5oaWRkZW4pIHJldHVybjtcbiAgICBjb25zdCByZXF1ZXN0ZWRGcm9tV29ybGQgPSBmcmFtZS53b3JsZC5mcm9tIHx8IGZyYW1lLndvcmxkLnRvO1xuICAgIGNvbnN0IHJlcXVlc3RlZFRvV29ybGQgPSBmcmFtZS53b3JsZC50byB8fCByZXF1ZXN0ZWRGcm9tV29ybGQ7XG4gICAgaWYgKCFyZXF1ZXN0ZWRGcm9tV29ybGQgfHwgIXJlcXVlc3RlZFRvV29ybGQpIHJldHVybjtcbiAgICBjb25zdCByZXF1ZXN0ZWRTZXF1ZW5jZUtleSA9IHByZXBhcmVTZXF1ZW5jZShmcmFtZS53b3JsZC5zZXF1ZW5jZSwgZnJhbWUuZ2xvYmFscyk7XG4gICAgY29uc3QgcHJlcGFyZWRQYWlyID0gcmVhZHlTZXF1ZW5jZT8ua2V5ID09PSByZXF1ZXN0ZWRTZXF1ZW5jZUtleVxuICAgICAgPyByZWFkeVNlcXVlbmNlLnBhaXJzLmdldChyZXF1ZXN0ZWRUb1dvcmxkLnNlY3Rpb25JZClcbiAgICAgIDogbnVsbDtcbiAgICBpZiAocHJlcGFyZWRQYWlyXG4gICAgICAmJiBwcmVwYXJlZFBhaXIuZnJvbVdvcmxkLnNlY3Rpb25JZCA9PT0gcmVxdWVzdGVkRnJvbVdvcmxkLnNlY3Rpb25JZFxuICAgICAgJiYgcHJlcGFyZWRQYWlyLnRvV29ybGQuc2VjdGlvbklkID09PSByZXF1ZXN0ZWRUb1dvcmxkLnNlY3Rpb25JZCkge1xuICAgICAgaW5zdGFsbFByZXBhcmVkUGFpcihwcmVwYXJlZFBhaXIpO1xuICAgIH1cbiAgICBpZiAoIWluc3RhbGxlZFBhaXIpIHJldHVybjtcbiAgICBjb25zdCBwYWlyTWF0Y2hlc1JlcXVlc3QgPSBpbnN0YWxsZWRQYWlyLmZyb21Xb3JsZC5zZWN0aW9uSWQgPT09IHJlcXVlc3RlZEZyb21Xb3JsZC5zZWN0aW9uSWRcbiAgICAgICYmIGluc3RhbGxlZFBhaXIudG9Xb3JsZC5zZWN0aW9uSWQgPT09IHJlcXVlc3RlZFRvV29ybGQuc2VjdGlvbklkO1xuICAgIGNvbnN0IGZyb21Xb3JsZCA9IGluc3RhbGxlZFBhaXIuZnJvbVdvcmxkO1xuICAgIGNvbnN0IHRvV29ybGQgPSBpbnN0YWxsZWRQYWlyLnRvV29ybGQ7XG4gICAgY29uc3QgdHJhbnNpdGlvblByb2dyZXNzID0gcGFpck1hdGNoZXNSZXF1ZXN0XG4gICAgICA/IGZyYW1lLndvcmxkLnRyYW5zaXRpb25Qcm9ncmVzc1xuICAgICAgOiBpbnN0YWxsZWRQYWlyLnByb2dyZXNzO1xuICAgIGlmIChwYWlyTWF0Y2hlc1JlcXVlc3QpIGluc3RhbGxlZFBhaXIucHJvZ3Jlc3MgPSB0cmFuc2l0aW9uUHJvZ3Jlc3M7XG4gICAgY29uc3QgYnVzdCA9IG1vZGlmaWVyKHRvV29ybGQsICdidXN0LXlhdy12MScpO1xuICAgIGNvbnN0IG5vdyA9IHBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMDtcbiAgICBjb25zdCBmb3JtaW5nQnVzdCA9IHRvV29ybGQuc2hhcGVJZCA9PT0gJ2J1c3QtdjEnICYmIHRyYW5zaXRpb25Qcm9ncmVzcyA8IDAuOTk5OTtcbiAgICBpZiAoZm9ybWluZ0J1c3QpIHtcbiAgICAgIGlmICghYnVzdEZvcm1hdGlvbkFjdGl2ZSkge1xuICAgICAgICBidXN0Rm9ybWF0aW9uSG9sZFlhdyA9IGxhc3RCdXN0UHJvZ3Jlc3MgPj0gMC45OTk5ID8gYnVzdFlhdyA6IDA7XG4gICAgICB9XG4gICAgICBidXN0WWF3ID0gYnVzdEZvcm1hdGlvbkhvbGRZYXc7XG4gICAgICBidXN0Rm9ybWF0aW9uQWN0aXZlID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKGJ1c3RGb3JtYXRpb25BY3RpdmUpIHtcbiAgICAgIGJ1c3RZYXcgPSBidXN0Rm9ybWF0aW9uSG9sZFlhdztcbiAgICAgIGJ1c3RGb3JtYXRpb25BY3RpdmUgPSBmYWxzZTtcbiAgICAgIHJlc3VtZUF0ID0gbm93ICsgTnVtYmVyKGJ1c3Q/LnJlc3VtZURlbGF5IHx8IDApO1xuICAgIH0gZWxzZSBpZiAoIWRyYWdnaW5nICYmIGJ1c3QgJiYgIWZyYW1lLnJlZHVjZWRNb3Rpb24gJiYgbm93ID49IHJlc3VtZUF0KSB7XG4gICAgICBidXN0WWF3ICs9IGZyYW1lLmRlbHRhU2Vjb25kcyAqIE51bWJlcihidXN0LnNwZWVkIHx8IDApO1xuICAgIH1cbiAgICBpZiAodG9Xb3JsZC5zaGFwZUlkID09PSAnYnVzdC12MScpIHtcbiAgICAgIGxhc3RCdXN0UHJvZ3Jlc3MgPSB0cmFuc2l0aW9uUHJvZ3Jlc3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1c3RGb3JtYXRpb25BY3RpdmUgPSBmYWxzZTtcbiAgICAgIGJ1c3RGb3JtYXRpb25Ib2xkWWF3ID0gMDtcbiAgICAgIGxhc3RCdXN0UHJvZ3Jlc3MgPSAwO1xuICAgICAgYnVzdFlhdyA9IDA7XG4gICAgfVxuXG4gICAgY2FtZXJhLnBvc2l0aW9uLmZyb21BcnJheShmcmFtZS5jYW1lcmEucG9zaXRpb24pO1xuICAgIGNhbWVyYS51cC5zZXQoTWF0aC5zaW4oZnJhbWUuY2FtZXJhLnJvbGwpLCBNYXRoLmNvcyhmcmFtZS5jYW1lcmEucm9sbCksIDApO1xuICAgIGNhbWVyYS5sb29rQXQoLi4uZnJhbWUuY2FtZXJhLnRhcmdldCk7XG4gICAgaWYgKGRpcmVjdG9yLmFjdGl2ZSkge1xuICAgICAgZGlyZWN0b3JUYXJnZXQuZnJvbUFycmF5KGZyYW1lLmNhbWVyYS50YXJnZXQpO1xuICAgICAgZGlyZWN0b3JPZmZzZXQuY29weShjYW1lcmEucG9zaXRpb24pLnN1YihkaXJlY3RvclRhcmdldCk7XG4gICAgICBkaXJlY3RvckV1bGVyLnNldChkaXJlY3Rvci5waXRjaCwgZGlyZWN0b3IueWF3LCAwKTtcbiAgICAgIGRpcmVjdG9yT2Zmc2V0LmFwcGx5RXVsZXIoZGlyZWN0b3JFdWxlcik7XG4gICAgICBkaXJlY3Rvck9mZnNldC5zZXRMZW5ndGgoTWF0aC5tYXgoMC4yLCBkaXJlY3Rvck9mZnNldC5sZW5ndGgoKSArIGRpcmVjdG9yLmRpc3RhbmNlKSk7XG4gICAgICBjYW1lcmEucG9zaXRpb24uY29weShkaXJlY3RvclRhcmdldCkuYWRkKGRpcmVjdG9yT2Zmc2V0KTtcbiAgICAgIGNhbWVyYS51cC5zZXQoMCwgMSwgMCk7XG4gICAgICBjYW1lcmEubG9va0F0KGRpcmVjdG9yVGFyZ2V0KTtcbiAgICB9XG4gICAgaWYgKGNhbWVyYS5mb3YgIT09IGZyYW1lLmNhbWVyYS5mb3YpIHtcbiAgICAgIGNhbWVyYS5mb3YgPSBmcmFtZS5jYW1lcmEuZm92O1xuICAgICAgY2FtZXJhLnVwZGF0ZVByb2plY3Rpb25NYXRyaXgoKTtcbiAgICB9XG4gICAgY2FtZXJhLnVwZGF0ZU1hdHJpeFdvcmxkKHRydWUpO1xuICAgIGNvbnN0IGZyb21EaXNjaXBsaW5lUmlzZSA9IHJlc29sdmVEaXNjaXBsaW5lU3RvcnlPZmZzZXQoZnJhbWUsIGZyb21Xb3JsZCwgZnJvbVN0b3J5T2Zmc2V0KTtcbiAgICBjb25zdCB0b0Rpc2NpcGxpbmVSaXNlID0gcmVzb2x2ZURpc2NpcGxpbmVTdG9yeU9mZnNldChmcmFtZSwgdG9Xb3JsZCwgdG9TdG9yeU9mZnNldCk7XG4gICAgd3JpdGVXb3JsZFRyYW5zZm9ybShcbiAgICAgIHVuaWZvcm1zLmZyb21UcmFuc2Zvcm0udmFsdWUsXG4gICAgICBmcm9tV29ybGQsXG4gICAgICBmcmFtZS5nbG9iYWxzLFxuICAgICAgY29tcGFjdCxcbiAgICAgIGZyb21UcmFuc2Zvcm1TY3JhdGNoLFxuICAgICAgZnJvbVN0b3J5T2Zmc2V0LFxuICAgICk7XG4gICAgd3JpdGVXb3JsZFRyYW5zZm9ybShcbiAgICAgIHVuaWZvcm1zLnRvVHJhbnNmb3JtLnZhbHVlLFxuICAgICAgdG9Xb3JsZCxcbiAgICAgIGZyYW1lLmdsb2JhbHMsXG4gICAgICBjb21wYWN0LFxuICAgICAgdG9UcmFuc2Zvcm1TY3JhdGNoLFxuICAgICAgdG9TdG9yeU9mZnNldCxcbiAgICApO1xuICAgIHJvb3QuZGF0YXNldC53b3JsZERpc2NpcGxpbmVSaXNlID0gTWF0aC5tYXgoZnJvbURpc2NpcGxpbmVSaXNlLCB0b0Rpc2NpcGxpbmVSaXNlKS50b0ZpeGVkKDQpO1xuICAgIHVuaWZvcm1zLm1vcnBoUHJvZ3Jlc3MudmFsdWUgPSB0cmFuc2l0aW9uUHJvZ3Jlc3M7XG4gICAgdW5pZm9ybXMuc3RvcnlUaW1lLnZhbHVlID0gZnJhbWUuc3RvcnlUaW1lO1xuICAgIHVuaWZvcm1zLmFtYmllbnRUaW1lLnZhbHVlID0gZnJhbWUuYW1iaWVudFRpbWU7XG4gICAgdW5pZm9ybXMucG9pbnRTaXplLnZhbHVlID0gZnJhbWUuZ2xvYmFscy5wb2ludE1hdGVyaWFsLnBvaW50U2l6ZTtcbiAgICB1bmlmb3Jtcy5maWVsZE9wYWNpdHkudmFsdWUgPSBmcmFtZS5nbG9iYWxzLnBvaW50TWF0ZXJpYWwub3BhY2l0eTtcbiAgICBzZXRNb2RpZmllclVuaWZvcm1zKCdmcm9tJywgZnJvbVdvcmxkLCBmcmFtZS5nbG9iYWxzKTtcbiAgICBzZXRNb2RpZmllclVuaWZvcm1zKCd0bycsIHRvV29ybGQsIGZyYW1lLmdsb2JhbHMpO1xuICAgIGlmIChmcmFtZS5yZWR1Y2VkTW90aW9uKSB7XG4gICAgICB1bmlmb3Jtcy5mcm9tRHJpZnRBbXBsaXR1ZGUudmFsdWUgPSAwO1xuICAgICAgdW5pZm9ybXMudG9EcmlmdEFtcGxpdHVkZS52YWx1ZSA9IDA7XG4gICAgICB1bmlmb3Jtcy5mcm9tV2F2ZVNwZWVkLnZhbHVlID0gMDtcbiAgICAgIHVuaWZvcm1zLnRvV2F2ZVNwZWVkLnZhbHVlID0gMDtcbiAgICB9XG4gICAgdW5pZm9ybXMuZnJvbUJ1c3QudmFsdWUgPSBmcm9tV29ybGQuc2hhcGVJZCA9PT0gJ2J1c3QtdjEnID8gMSA6IDA7XG4gICAgdW5pZm9ybXMudG9CdXN0LnZhbHVlID0gdG9Xb3JsZC5zaGFwZUlkID09PSAnYnVzdC12MScgPyAxIDogMDtcbiAgICB1bmlmb3Jtcy5idXN0WWF3LnZhbHVlID0gYnVzdFlhdztcbiAgICByb290LmRhdGFzZXQud29ybGRCdXN0U2hhZGVyWWF3ID0gYnVzdFlhdy50b0ZpeGVkKDUpO1xuICAgIHVuaWZvcm1zLmRpc2NpcGxpbmVGb2N1cy52YWx1ZSA9IE51bWJlcihmcmFtZS5lZGl0b3JpYWxTaWduYWxzPy5kaXNjaXBsaW5lRm9jdXMgfHwgMCk7XG4gICAgdW5pZm9ybXMuZ3JpZEluZmx1ZW5jZS52YWx1ZSA9IGZyYW1lLnJlZHVjZWRNb3Rpb25cbiAgICAgID8gMFxuICAgICAgOiBOdW1iZXIoZnJhbWUuZWRpdG9yaWFsU2lnbmFscz8uZ3JpZEluZmx1ZW5jZSB8fCAwKTtcbiAgICByb290LmRhdGFzZXQud29ybGRHcm91cEZvY3VzID0gU3RyaW5nKHVuaWZvcm1zLmRpc2NpcGxpbmVGb2N1cy52YWx1ZSk7XG4gICAgcm9vdC5kYXRhc2V0LndvcmxkR3JpZEluZmx1ZW5jZSA9IHVuaWZvcm1zLmdyaWRJbmZsdWVuY2UudmFsdWUudG9GaXhlZCg0KTtcbiAgICB1cGRhdGVEaXNjaXBsaW5lUmV2ZWFsKGZyYW1lLCBmcm9tV29ybGQsIHRvV29ybGQpO1xuXG4gICAgY29uc3QgaW50ZXJhY3Rpb25FbmFibGVkID0gcGFpck1hdGNoZXNSZXF1ZXN0XG4gICAgICAmJiAhZm9ybWluZ0J1c3RcbiAgICAgICYmIGZyYW1lLnNlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgPT09ICdob3Jpem9udGFsLXNwaW4nXG4gICAgICAmJiBmcmFtZS5sb2NhbFByb2dyZXNzID49IE51bWJlcihmcmFtZS5zZWN0aW9uLmludGVyYWN0aW9uLmFjdGl2YXRpb25TdGFydCB8fCAwKTtcbiAgICBpbnRlcmFjdGlvbi5kYXRhc2V0LmFjdGl2ZSA9IGludGVyYWN0aW9uRW5hYmxlZCA/ICd0cnVlJyA6ICdmYWxzZSc7XG4gICAgaW50ZXJhY3Rpb24udGFiSW5kZXggPSBpbnRlcmFjdGlvbkVuYWJsZWQgPyAwIDogLTE7XG4gICAgcm9vdC5kYXRhc2V0LndvcmxkU3RhZ2UgPSB0b1dvcmxkLnNoYXBlSWQ7XG4gICAgcm9vdC5kYXRhc2V0LmNhbWVyYUNhZGVuY2UgPSBmcmFtZS5nbG9iYWxzLmNhbWVyYS5jYWRlbmNlTG9ja2VkID8gJ2xvY2tlZC13b3JsZC11bml0cy12MScgOiAnZWRpdGFibGUtd29ybGQtdW5pdHMtdjEnO1xuICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbmFycmF0aXZlLWNhbWVyYS1mb3J3YXJkJywgKGZyYW1lLmdsb2JhbHMuY2FtZXJhLnN0YXJ0WiAtIGZyYW1lLmNhbWVyYS5wb3NpdGlvblsyXSkudG9GaXhlZCg0KSk7XG4gICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1uYXJyYXRpdmUtY2FtZXJhLXJvbGwnLCBmcmFtZS5jYW1lcmEucm9sbC50b0ZpeGVkKDQpKTtcbiAgICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLW5hcnJhdGl2ZS1jYW1lcmEtZm92JywgZnJhbWUuY2FtZXJhLmZvdi50b0ZpeGVkKDIpKTtcbiAgICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLW5hcnJhdGl2ZS1idXN0LXlhdycsIGJ1c3RZYXcudG9GaXhlZCg0KSk7XG4gICAgZnJhbWVTdGFydGVkQXQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICByZW5kZXJlci5yZW5kZXIoc2NlbmUsIGNhbWVyYSk7XG4gICAgbGFzdEZyYW1lVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpIC0gZnJhbWVTdGFydGVkQXQ7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlUG9pbnRlckRvd24gPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoaW50ZXJhY3Rpb24uZGF0YXNldC5hY3RpdmUgIT09ICd0cnVlJykgcmV0dXJuO1xuICAgIGRyYWdTdGFydCA9IHsgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsIHg6IGV2ZW50LmNsaWVudFgsIHk6IGV2ZW50LmNsaWVudFksIHlhdzogYnVzdFlhdyB9O1xuICAgIGRyYWdnaW5nID0gZmFsc2U7XG4gIH07XG4gIGNvbnN0IGhhbmRsZVBvaW50ZXJNb3ZlID0gKGV2ZW50KSA9PiB7XG4gICAgaWYgKCFkcmFnU3RhcnQgfHwgZHJhZ1N0YXJ0LnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgY29uc3QgZGVsdGFYID0gZXZlbnQuY2xpZW50WCAtIGRyYWdTdGFydC54O1xuICAgIGNvbnN0IGRlbHRhWSA9IGV2ZW50LmNsaWVudFkgLSBkcmFnU3RhcnQueTtcbiAgICBpZiAoIWRyYWdnaW5nICYmIE1hdGguYWJzKGRlbHRhWCkgPiA2ICYmIE1hdGguYWJzKGRlbHRhWCkgPiBNYXRoLmFicyhkZWx0YVkpKSB7XG4gICAgICBkcmFnZ2luZyA9IHRydWU7XG4gICAgICBpbnRlcmFjdGlvbi5zZXRQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIH1cbiAgICBpZiAoIWRyYWdnaW5nKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBjb25zdCBidXN0ID0gbW9kaWZpZXIobGF0ZXN0RnJhbWU/LndvcmxkPy50bywgJ2J1c3QteWF3LXYxJyk7XG4gICAgYnVzdFlhdyA9IGRyYWdTdGFydC55YXcgKyAoKGRlbHRhWCAvIE1hdGgubWF4KDMyMCwgd2lkdGgpKSAqIE1hdGguUEkgKiAyICogTnVtYmVyKGJ1c3Q/LmRyYWdTZW5zaXRpdml0eSB8fCAxKSk7XG4gIH07XG4gIGNvbnN0IGhhbmRsZVBvaW50ZXJFbmQgPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoZHJhZ2dpbmcgJiYgaW50ZXJhY3Rpb24uaGFzUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKSkgaW50ZXJhY3Rpb24ucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgY29uc3QgYnVzdCA9IG1vZGlmaWVyKGxhdGVzdEZyYW1lPy53b3JsZD8udG8sICdidXN0LXlhdy12MScpO1xuICAgIHJlc3VtZUF0ID0gKHBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkgKyBOdW1iZXIoYnVzdD8ucmVzdW1lRGVsYXkgfHwgMCk7XG4gICAgZHJhZ1N0YXJ0ID0gbnVsbDtcbiAgICBkcmFnZ2luZyA9IGZhbHNlO1xuICB9O1xuICBjb25zdCBoYW5kbGVLZXlEb3duID0gKGV2ZW50KSA9PiB7XG4gICAgaWYgKCFbJ0Fycm93TGVmdCcsICdBcnJvd1JpZ2h0J10uaW5jbHVkZXMoZXZlbnQua2V5KSkgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgYnVzdFlhdyArPSBldmVudC5rZXkgPT09ICdBcnJvd0xlZnQnID8gLTAuMTYgOiAwLjE2O1xuICB9O1xuICBjb25zdCBoYW5kbGVDb250ZXh0TG9zdCA9IChldmVudCkgPT4ge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgY29udGV4dEF2YWlsYWJsZSA9IGZhbHNlO1xuICAgIHJvb3QuZGF0YXNldC5wb2ludFdvcmxkU3RhdGUgPSAnY29udGV4dC1sb3N0JztcbiAgfTtcbiAgY29uc3QgaGFuZGxlQ29udGV4dFJlc3RvcmVkID0gKCkgPT4ge1xuICAgIGNvbnRleHRBdmFpbGFibGUgPSB0cnVlO1xuICAgIHJvb3QuZGF0YXNldC5wb2ludFdvcmxkU3RhdGUgPSAncmVhZHknO1xuICAgIHJlc2l6ZSgpO1xuICAgIHVwZGF0ZVRoZW1lKCk7XG4gIH07XG5cbiAgY29uc3QgcmVzaXplT2JzZXJ2ZXIgPSBuZXcgUmVzaXplT2JzZXJ2ZXIocmVzaXplKTtcbiAgY29uc3QgdGhlbWVPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKHVwZGF0ZVRoZW1lKTtcbiAgcmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZShyb290KTtcbiAgcmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZShjYW52YXMpO1xuICB0aGVtZU9ic2VydmVyLm9ic2VydmUocm9vdCwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBhdHRyaWJ1dGVGaWx0ZXI6IFsnY2xhc3MnLCAnc3R5bGUnLCAnZGF0YS10aGVtZSddIH0pO1xuICBpbnRlcmFjdGlvbi5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsIGhhbmRsZVBvaW50ZXJEb3duKTtcbiAgaW50ZXJhY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCBoYW5kbGVQb2ludGVyTW92ZSwgeyBwYXNzaXZlOiBmYWxzZSB9KTtcbiAgaW50ZXJhY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJywgaGFuZGxlUG9pbnRlckVuZCk7XG4gIGludGVyYWN0aW9uLmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJjYW5jZWwnLCBoYW5kbGVQb2ludGVyRW5kKTtcbiAgaW50ZXJhY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZUtleURvd24pO1xuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignd2ViZ2xjb250ZXh0bG9zdCcsIGhhbmRsZUNvbnRleHRMb3N0KTtcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3dlYmdsY29udGV4dHJlc3RvcmVkJywgaGFuZGxlQ29udGV4dFJlc3RvcmVkKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JiOnBhbGV0dGVDaGFuZ2VkJywgdXBkYXRlVGhlbWUpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYWJzOnRoZW1lLWNoYW5nZWQnLCB1cGRhdGVUaGVtZSk7XG4gIHJlc2l6ZSgpO1xuICB1cGRhdGVUaGVtZSgpO1xuICByb290LmRhdGFzZXQucG9pbnRXb3JsZFN0YXRlID0gJ3JlYWR5JztcbiAgcnVudGltZVJlZi5jdXJyZW50ID0ge1xuICAgIHJlbmRlcixcbiAgICBnZXRNZXRyaWNzOiAoKSA9PiAoe1xuICAgICAgYWRhcHRlcklkOiAncG9pbnQtZmllbGQtdjEnLFxuICAgICAgcG9pbnRDb3VudCxcbiAgICAgIGRyYXdDYWxsczogcmVuZGVyZXIuaW5mby5yZW5kZXIuY2FsbHMsXG4gICAgICBmcmFtZVRpbWVNczogbGFzdEZyYW1lVGltZSxcbiAgICAgIGJ1ZmZlclJlYnVpbGRzLFxuICAgICAgY2FjaGVFbnRyaWVzOiBzaGFwZUNhY2hlLnNpemUsXG4gICAgICBzZXF1ZW5jZUNhY2hlRW50cmllczogc2VxdWVuY2VDYWNoZS5zaXplLFxuICAgICAgY29ycmVzcG9uZGVuY2VTZXF1ZW5jZVN0YXRlOiBzZXF1ZW5jZVN0YXRlLFxuICAgICAgY29ycmVzcG9uZGVuY2VQYWlySWQ6IGluc3RhbGxlZFBhaXI/LmtleSB8fCAnJyxcbiAgICAgIGNvcnJlc3BvbmRlbmNlVG9Xb3JsZElkOiBpbnN0YWxsZWRQYWlyPy50b1dvcmxkPy5zZWN0aW9uSWQgfHwgJycsXG4gICAgICBjb3JyZXNwb25kZW5jZVJlcXVlc3RlZFN0cmF0ZWd5OiBpbnN0YWxsZWRQYWlyPy5yZXF1ZXN0ZWRTdHJhdGVneSB8fCAnJyxcbiAgICAgIGNvcnJlc3BvbmRlbmNlSW5zdGFsbGVkU3RyYXRlZ3k6IGluc3RhbGxlZFBhaXI/Lmluc3RhbGxlZFN0cmF0ZWd5IHx8ICcnLFxuICAgICAgY29ycmVzcG9uZGVuY2VGYWxsYmFjazogaW5zdGFsbGVkUGFpcj8uZmFsbGJhY2tSZWFzb24gfHwgJycsXG4gICAgICBjb3JyZXNwb25kZW5jZUltcHJvdmVtZW50OiBOdW1iZXIoaW5zdGFsbGVkUGFpcj8ubWV0cmljcz8uaW1wcm92ZW1lbnQgfHwgMCksXG4gICAgICBjb3JyZXNwb25kZW5jZVdlaWdodGVkUm1zOiBOdW1iZXIoaW5zdGFsbGVkUGFpcj8ubWV0cmljcz8ud2VpZ2h0ZWRSbXNEaXN0YW5jZSB8fCAwKSxcbiAgICAgIGNvcnJlc3BvbmRlbmNlUDk1OiBOdW1iZXIoaW5zdGFsbGVkUGFpcj8ubWV0cmljcz8ucDk1RGlzdGFuY2UgfHwgMCksXG4gICAgICBjb3JyZXNwb25kZW5jZU1heDogTnVtYmVyKGluc3RhbGxlZFBhaXI/Lm1ldHJpY3M/Lm1heERpc3RhbmNlIHx8IDApLFxuICAgICAgY29ycmVzcG9uZGVuY2VMb25nUGF0aFJhdGlvMjU6IE51bWJlcihpbnN0YWxsZWRQYWlyPy5tZXRyaWNzPy5sb25nUGF0aFJhdGlvMjUgfHwgMCksXG4gICAgICBjb3JyZXNwb25kZW5jZUxvbmdQYXRoUmF0aW81MDogTnVtYmVyKGluc3RhbGxlZFBhaXI/Lm1ldHJpY3M/LmxvbmdQYXRoUmF0aW81MCB8fCAwKSxcbiAgICAgIGNvcnJlc3BvbmRlbmNlUHJlcGFyYXRpb25EdXJhdGlvbk1zOiBzZXF1ZW5jZVByZXBhcmF0aW9uRHVyYXRpb25NcyxcbiAgICAgIGNvcnJlc3BvbmRlbmNlTWFpblRocmVhZEFwcGxpY2F0aW9uTXM6IE51bWJlcihyZWFkeVNlcXVlbmNlPy5tYWluVGhyZWFkQXBwbGljYXRpb25NcyB8fCAwKSxcbiAgICAgIHNoYXBlR2VuZXJhdGlvbkR1cmF0aW9uTXM6IE51bWJlcihyZWFkeVNlcXVlbmNlPy5nZW5lcmF0aW9uRHVyYXRpb25NcyB8fCAwKSxcbiAgICAgIGNvcnJlc3BvbmRlbmNlV29ya2VyRHVyYXRpb25NczogTnVtYmVyKHJlYWR5U2VxdWVuY2U/LmNvcnJlc3BvbmRlbmNlRHVyYXRpb25NcyB8fCAwKSxcbiAgICAgIHByZXBhcmVkV29ybGRJZHM6IHJlYWR5U2VxdWVuY2U/LndvcmxkSWRzIHx8IFtdLFxuICAgICAgYWN0aXZlTW9kaWZpZXJzOiBsYXRlc3RGcmFtZT8ud29ybGQ/LnRvPy5tb2RpZmllcnM/LmZpbHRlcigoaXRlbSkgPT4gaXRlbS5lbmFibGVkKS5sZW5ndGggfHwgMCxcbiAgICB9KSxcbiAgICBmcmFtZVNlbGVjdGVkV29ybGQ6ICgpID0+IG51bGwsXG4gICAgc2V0RGlyZWN0b3JWaWV3OiAoYWN0aXZlKSA9PiB7IGRpcmVjdG9yLmFjdGl2ZSA9IEJvb2xlYW4oYWN0aXZlKTsgfSxcbiAgICBudWRnZURpcmVjdG9yOiAoeyB5YXcgPSAwLCBwaXRjaCA9IDAsIGRpc3RhbmNlID0gMCB9KSA9PiB7XG4gICAgICBkaXJlY3Rvci55YXcgKz0geWF3O1xuICAgICAgZGlyZWN0b3IucGl0Y2ggPSBNYXRoLm1heCgtMS4yLCBNYXRoLm1pbigxLjIsIGRpcmVjdG9yLnBpdGNoICsgcGl0Y2gpKTtcbiAgICAgIGRpcmVjdG9yLmRpc3RhbmNlICs9IGRpc3RhbmNlO1xuICAgIH0sXG4gICAgcmVzZXREaXJlY3RvcjogKCkgPT4geyBkaXJlY3Rvci55YXcgPSAwOyBkaXJlY3Rvci5waXRjaCA9IDA7IGRpcmVjdG9yLmRpc3RhbmNlID0gMDsgfSxcbiAgfTtcblxuICByZXR1cm4gKCkgPT4ge1xuICAgIGRpc3Bvc2VkID0gdHJ1ZTtcbiAgICBnZW5lcmF0aW9uQ29udHJvbGxlcj8uYWJvcnQoKTtcbiAgICBjb3JyZXNwb25kZW5jZVdvcmtlcj8udGVybWluYXRlKCk7XG4gICAgcnVudGltZVJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICByZXNpemVPYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgdGhlbWVPYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgaW50ZXJhY3Rpb24ucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCBoYW5kbGVQb2ludGVyRG93bik7XG4gICAgaW50ZXJhY3Rpb24ucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCBoYW5kbGVQb2ludGVyTW92ZSk7XG4gICAgaW50ZXJhY3Rpb24ucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJywgaGFuZGxlUG9pbnRlckVuZCk7XG4gICAgaW50ZXJhY3Rpb24ucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcmNhbmNlbCcsIGhhbmRsZVBvaW50ZXJFbmQpO1xuICAgIGludGVyYWN0aW9uLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGVLZXlEb3duKTtcbiAgICBjYW52YXMucmVtb3ZlRXZlbnRMaXN0ZW5lcignd2ViZ2xjb250ZXh0bG9zdCcsIGhhbmRsZUNvbnRleHRMb3N0KTtcbiAgICBjYW52YXMucmVtb3ZlRXZlbnRMaXN0ZW5lcignd2ViZ2xjb250ZXh0cmVzdG9yZWQnLCBoYW5kbGVDb250ZXh0UmVzdG9yZWQpO1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdiYjpwYWxldHRlQ2hhbmdlZCcsIHVwZGF0ZVRoZW1lKTtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWJzOnRoZW1lLWNoYW5nZWQnLCB1cGRhdGVUaGVtZSk7XG4gICAgZ2VvbWV0cnkuZGlzcG9zZSgpO1xuICAgIG1hdGVyaWFsLmRpc3Bvc2UoKTtcbiAgICByZW5kZXJlci5kaXNwb3NlKCk7XG4gICAgZGVsZXRlIHJvb3QuZGF0YXNldC53b3JsZFN0YWdlO1xuICAgIGRlbGV0ZSByb290LmRhdGFzZXQuY2FtZXJhQ2FkZW5jZTtcbiAgICBkZWxldGUgcm9vdC5kYXRhc2V0LnBvaW50QXNzZXQ7XG4gICAgZGVsZXRlIHJvb3QuZGF0YXNldC5wb2ludFdvcmxkU3RhdGU7XG4gICAgZGVsZXRlIHJvb3QuZGF0YXNldC53b3JsZFByZXBhcmU7XG4gICAgZGVsZXRlIHJvb3QuZGF0YXNldC53b3JsZEVycm9yO1xuICAgIGRlbGV0ZSByb290LmRhdGFzZXQud29ybGRDb3JyZXNwb25kZW5jZTtcbiAgICBkZWxldGUgcm9vdC5kYXRhc2V0LndvcmxkQ29ycmVzcG9uZGVuY2VSZXF1ZXN0ZWQ7XG4gICAgZGVsZXRlIHJvb3QuZGF0YXNldC53b3JsZENvcnJlc3BvbmRlbmNlSW1wcm92ZW1lbnQ7XG4gICAgZGVsZXRlIHJvb3QuZGF0YXNldC53b3JsZENvcnJlc3BvbmRlbmNlUDk1O1xuICAgIGRlbGV0ZSByb290LmRhdGFzZXQud29ybGRDb3JyZXNwb25kZW5jZU1heDtcbiAgICBkZWxldGUgcm9vdC5kYXRhc2V0LndvcmxkQ29ycmVzcG9uZGVuY2VGYWxsYmFjaztcbiAgICBkZWxldGUgcm9vdC5kYXRhc2V0LndvcmxkQ29ycmVzcG9uZGVuY2VQYWlyO1xuICAgIGRlbGV0ZSByb290LmRhdGFzZXQud29ybGRCb290c3RyYXBHZW5lcmF0aW9uTXM7XG4gICAgZGVsZXRlIHJvb3QuZGF0YXNldC53b3JsZFNoYXBlR2VuZXJhdGlvbk1zO1xuICAgIGRlbGV0ZSByb290LmRhdGFzZXQud29ybGRDb3JyZXNwb25kZW5jZVdvcmtlck1zO1xuICAgIGRlbGV0ZSByb290LmRhdGFzZXQud29ybGRDb3JyZXNwb25kZW5jZVByZXBhcmVNcztcbiAgICBkZWxldGUgcm9vdC5kYXRhc2V0LndvcmxkQ29ycmVzcG9uZGVuY2VBcHBseU1zO1xuICAgIGRlbGV0ZSByb290LmRhdGFzZXQud29ybGRCdWZmZXJSZWJ1aWxkcztcbiAgICBkZWxldGUgcm9vdC5kYXRhc2V0LndvcmxkQnVzdFNoYWRlcllhdztcbiAgICBkZWxldGUgcm9vdC5kYXRhc2V0LndvcmxkRGlzY2lwbGluZVZpc2libGU7XG4gICAgZGVsZXRlIHJvb3QuZGF0YXNldC53b3JsZERpc2NpcGxpbmVMYWJlbHM7XG4gICAgZGVsZXRlIHJvb3QuZGF0YXNldC53b3JsZEdyaWRCYWNrZ3JvdW5kO1xuICAgIGRlbGV0ZSByb290LmRhdGFzZXQud29ybGREaXNjaXBsaW5lUmlzZTtcbiAgICByb290LnN0eWxlLnJlbW92ZVByb3BlcnR5KCctLW5hcnJhdGl2ZS1jYW1lcmEtZm9yd2FyZCcpO1xuICAgIHJvb3Quc3R5bGUucmVtb3ZlUHJvcGVydHkoJy0tbmFycmF0aXZlLWNhbWVyYS1yb2xsJyk7XG4gICAgcm9vdC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgnLS1uYXJyYXRpdmUtY2FtZXJhLWZvdicpO1xuICAgIHJvb3Quc3R5bGUucmVtb3ZlUHJvcGVydHkoJy0tbmFycmF0aXZlLWJ1c3QteWF3Jyk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBBYm91dE5hcnJhdGl2ZVBvaW50V29ybGQzRCh7IHJvb3RSZWYsIGludGVyYWN0aW9uUmVmLCBkaXNjaXBsaW5lT3ZlcmxheVJlZiwgcnVudGltZVJlZiB9KSB7XG4gIGNvbnN0IGNhbnZhc1JlZiA9IHVzZVJlZihudWxsKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGNhbnZhcyA9IGNhbnZhc1JlZi5jdXJyZW50O1xuICAgIGNvbnN0IHJvb3QgPSByb290UmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgaW50ZXJhY3Rpb24gPSBpbnRlcmFjdGlvblJlZi5jdXJyZW50O1xuICAgIGlmICghY2FudmFzIHx8ICFyb290IHx8ICFpbnRlcmFjdGlvbikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGNyZWF0ZVBvaW50RmllbGRBZGFwdGVyKHsgY2FudmFzLCByb290LCBpbnRlcmFjdGlvbiwgZGlzY2lwbGluZU92ZXJsYXlSZWYsIHJ1bnRpbWVSZWYgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJvb3QuZGF0YXNldC5wb2ludFdvcmxkU3RhdGUgPSAndW5hdmFpbGFibGUnO1xuICAgICAgY29uc29sZS53YXJuKCdbQWJvdXQgbmFycmF0aXZlXSBQb2ludCB3b3JsZCB1bmF2YWlsYWJsZTsgY29udGludWluZyB3aXRoIGVkaXRvcmlhbCBjb250ZW50LicsIGVycm9yKTtcbiAgICAgIHJldHVybiAoKSA9PiB7IGRlbGV0ZSByb290LmRhdGFzZXQucG9pbnRXb3JsZFN0YXRlOyB9O1xuICAgIH1cbiAgfSwgW2Rpc2NpcGxpbmVPdmVybGF5UmVmLCBpbnRlcmFjdGlvblJlZiwgcm9vdFJlZiwgcnVudGltZVJlZl0pO1xuXG4gIHJldHVybiA8Y2FudmFzIHJlZj17Y2FudmFzUmVmfSBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtd29ybGRfX2NhbnZhc1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+O1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL3JvdXRlcy9hYm91dC1uYXJyYXRpdmUtbGFiL0Fib3V0TmFycmF0aXZlUG9pbnRXb3JsZDNELmpzeCJ9