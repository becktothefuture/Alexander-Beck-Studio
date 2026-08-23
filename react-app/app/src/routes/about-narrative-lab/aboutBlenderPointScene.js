import * as THREE from 'three';
import {
  resolveResponsiveVerticalFovFromHorizontalFov,
} from './aboutNarrativeCameraProjection.js';
import { writeAboutSceneLook } from './aboutSceneLook.js';
import { createAboutSurfelPaletteRoles } from './aboutSurfelPalette.js';
import {
  getSimulationPaletteSnapshot,
  subscribeSimulationPalette,
} from '../../palette/simulationPaletteController.js';

const ASSET_ROOT = '/models/about-v2-edited-world';
const META_URL = `${ASSET_ROOT}/meta.json`;
const CAMERA_TRACK_URL = `${ASSET_ROOT}/camera-track.json`;
const SURFEL_STRIDE_BYTES = 32;
const CAMERA_SAMPLE_STRIDE = 7;
const DEFAULT_HORIZONTAL_FOV = 85;
const DEFAULT_PORTRAIT_MAX_VERTICAL_FOV = 115;
const FULL_SURFEL_REVEAL_VISIBILITY = 0.2;
const CAMERA_FAR_WU = 560;
const PALETTE_ROLE_COUNT = 6;
const ADAPTER_ID = 'blender-surfel-v2';
const RUNTIME_DIAGNOSTICS_ENABLED = import.meta.env.DEV || __CERTIFY__;

const SURFEL_VERTEX_SHADER = `
  precision highp float;
  attribute vec3 iPosition;
  attribute vec2 iNormalOct;
  attribute float iRadius;
  attribute float iPalette;
  attribute float iLodRank;
  attribute float iRevealRank;
  attribute float iMotionGroup;
  attribute float iFeatureClass;
  attribute float iPreserve;

  uniform vec2 uViewportPx;
  uniform float uProjectionScalePx;
  uniform float uMinPointSizePx;
  uniform float uMaxPointSizePx;
  uniform float uCoverage;
  uniform float uBackfaceRetention;
  uniform float uDetailBias;
  uniform float uPerspectiveResponse;
  uniform float uFogStartWU;
  uniform float uFogEndWU;
  uniform float uFogCurve;
  uniform float uSceneVisibility;
  uniform float uEntranceScale;
  uniform float uOpacity;
  uniform float uMotionTime;
  uniform float uMotionAmountWU;
  uniform float uMotionCoherence;

  varying vec2 vCircle;
  varying float vPalette;

  vec3 octDecodeNormal(vec2 encoded) {
    vec3 normal = vec3(encoded.xy, 1.0 - abs(encoded.x) - abs(encoded.y));
    if (normal.z < 0.0) {
      vec2 signs = step(vec2(0.0), normal.xy) * 2.0 - 1.0;
      normal.xy = (1.0 - abs(normal.yx)) * signs;
    }
    return normalize(normal);
  }

  void main() {
    float groupPhase = iMotionGroup * 2.39996323 * uMotionCoherence;
    vec3 rigidMotion = vec3(
      sin((uMotionTime * 0.71) + groupPhase) * 0.6,
      cos((uMotionTime * 0.83) + (groupPhase * 1.31)) * 0.8,
      sin((uMotionTime * 0.47) + (groupPhase * 0.73)) * 0.4
    ) * uMotionAmountWU;
    vec4 viewCenter = modelViewMatrix * vec4(iPosition + rigidMotion, 1.0);
    vec3 viewNormal = normalize(normalMatrix * octDecodeNormal(iNormalOct));
    float surfaceFacing = dot(viewNormal, normalize(-viewCenter.xyz));
    float cameraDepth = max(0.0001, -viewCenter.z);
    float fogAmount = smoothstep(
      uFogStartWU,
      max(uFogStartWU + 0.001, uFogEndWU),
      cameraDepth
    );
    float fogVisibility = 1.0 - pow(fogAmount, max(0.05, uFogCurve));
    float revealVisibility = min(
      min(fogVisibility, clamp(uSceneVisibility, 0.0, 1.0)),
      min(clamp(uEntranceScale, 0.0, 1.0), clamp(uOpacity, 0.0, 1.0))
    );
    float revealRank = min(iRevealRank * 0.12, 0.119);
    float revealProgress = smoothstep(
      revealRank,
      min(1.0, revealRank + 0.08),
      revealVisibility
    );
    float referenceDepthWU = 8.0;
    float resolvedDepth = referenceDepthWU * pow(
      cameraDepth / referenceDepthWU,
      clamp(uPerspectiveResponse, 0.1, 2.0)
    );
    float physicalRadiusPx = iRadius * uProjectionScalePx / max(0.0001, resolvedDepth);
    float projectedSpacingPx = max(physicalRadiusPx, uMinPointSizePx) / 0.56;
    float featureRetention = mix(1.0, 1.12, clamp(iFeatureClass * 0.5, 0.0, 1.0));
    float detailFraction = clamp(
      (projectedSpacingPx * uDetailBias * featureRetention) / 3.5,
      0.12,
      1.0
    );
    if ((iPreserve < 0.5 && iLodRank > detailFraction)
      || surfaceFacing < -clamp(uBackfaceRetention, 0.0, 1.0)
      || revealProgress <= 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vCircle = vec2(2.0);
      vPalette = iPalette;
      return;
    }
    float radiusPx = clamp(
      physicalRadiusPx * uCoverage,
      uMinPointSizePx,
      max(uMinPointSizePx, uMaxPointSizePx)
    );
    // Fog selects complete surfels by their deterministic reveal rank. A short
    // scale ramp keeps the arrival alive without shrinking coloured bodies into
    // pale sub-pixel coverage against the light page background.
    radiusPx *= mix(0.64, 1.0, revealProgress);

    vec2 ndcOffset = position.xy * radiusPx * 2.0 / max(vec2(1.0), uViewportPx);
    vec4 clip = projectionMatrix * viewCenter;
    clip.xy += ndcOffset * clip.w;
    gl_Position = clip;

    vCircle = position.xy;
    vPalette = iPalette;
  }
`;

const SURFEL_FRAGMENT_SHADER = `
  precision highp float;
  uniform vec3 uPalette0;
  uniform vec3 uPalette1;
  uniform vec3 uPalette2;
  uniform vec3 uPalette3;
  uniform vec3 uPalette4;
  uniform vec3 uPalette5;
  uniform float uDepthCorePass;
  uniform float uEdgeSoftness;

  varying vec2 vCircle;
  varying float vPalette;

  vec3 paletteColor(float role) {
    if (role < 0.5) return uPalette0;
    if (role < 1.5) return uPalette1;
    if (role < 2.5) return uPalette2;
    if (role < 3.5) return uPalette3;
    if (role < 4.5) return uPalette4;
    return uPalette5;
  }

  void main() {
    float circleRadius = length(vCircle);
    if (circleRadius > 1.0) discard;
    float edgeWidth = max(fwidth(circleRadius) * uEdgeSoftness, 0.018);
    float edge = 1.0 - smoothstep(1.0 - edgeWidth, 1.0, circleRadius);

    // About circles use the same flat material as Home. Geometry and depth
    // still describe the Blender scene; lighting never mutates palette colour.
    vec3 shaded = paletteColor(vPalette);
    if (uDepthCorePass > 0.5) {
      // Every admitted surfel owns an opaque, true-palette interior. Fog never
      // dilutes its colour into the page background.
      if (circleRadius > 0.96) discard;
      gl_FragColor = vec4(shaded, 1.0);
    } else {
      if (circleRadius <= 0.96) discard;
      float alpha = edge;
      if (alpha <= 0.025) discard;
      // Multisample alpha-to-coverage converts this alpha into sample coverage.
      // Covered samples own depth without alpha blending, so circles stay clean
      // and overlapping motion cannot reorder translucent bodies.
      gl_FragColor = vec4(shaded, alpha);
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function smoothstep(start, end, value) {
  const progress = clamp((value - start) / Math.max(0.000001, end - start), 0, 1);
  return progress * progress * (3 - (2 * progress));
}

function fileName(fileSpec, fallback) {
  if (typeof fileSpec === 'string' && fileSpec.trim()) return fileSpec;
  return fileSpec?.file || fileSpec?.path || fallback;
}

function fileCount(fileSpec, fallback = 0) {
  const count = Number(fileSpec?.count ?? fileSpec?.elementCount ?? fallback);
  return Number.isInteger(count) && count >= 0 ? count : fallback;
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Asset request failed (${response.status}): ${url}`);
  return response.json();
}

async function fetchBuffer(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Asset request failed (${response.status}): ${url}`);
  return response.arrayBuffer();
}

function assetUrl(name) {
  return `${ASSET_ROOT}/${String(name || '').replace(/^\/+/, '')}`;
}

function validateCameraTrack(value) {
  const sampleCount = Number(value?.sampleCount);
  const projection = value?.projection;
  if (!Number.isInteger(sampleCount) || sampleCount < 2
    || !Array.isArray(value?.samples) || value.samples.length !== sampleCount
    || value.samples.some((sample) => (
      !Array.isArray(sample) || sample.length !== CAMERA_SAMPLE_STRIDE
      || sample.some((component) => !Number.isFinite(component))
    ))
    || projection?.type !== 'perspective'
    || projection?.fovAxis !== 'horizontal') {
    throw new Error('The exported Blender camera track is invalid.');
  }
  return value;
}

function sampleCameraTrack(track, progress, position, quaternion, targetQuaternion) {
  const cursor = clamp(progress, 0, 1) * (track.sampleCount - 1);
  const fromIndex = Math.floor(cursor);
  const toIndex = Math.min(track.sampleCount - 1, fromIndex + 1);
  const interpolation = cursor - fromIndex;
  const from = track.samples[fromIndex];
  const to = track.samples[toIndex];
  position.set(
    THREE.MathUtils.lerp(from[0], to[0], interpolation),
    THREE.MathUtils.lerp(from[1], to[1], interpolation),
    THREE.MathUtils.lerp(from[2], to[2], interpolation),
  );
  quaternion.set(from[3], from[4], from[5], from[6]);
  targetQuaternion.set(to[3], to[4], to[5], to[6]);
  if (quaternion.dot(targetQuaternion) < 0) {
    targetQuaternion.set(
      -targetQuaternion.x,
      -targetQuaternion.y,
      -targetQuaternion.z,
      -targetQuaternion.w,
    );
  }
  quaternion.slerp(targetQuaternion, interpolation).normalize();
}

function sampleAuthoredRollDegrees(track, progress) {
  const keys = track?.rollControl?.keyframes || [];
  if (!keys.length) return 0;
  const clampedProgress = clamp(progress, 0, 1);
  let from = keys[0];
  let to = keys[keys.length - 1];
  for (let index = 1; index < keys.length; index += 1) {
    if (clampedProgress <= Number(keys[index].progress)) {
      from = keys[index - 1];
      to = keys[index];
      break;
    }
  }
  if (clampedProgress <= Number(keys[0].progress)) return Number(keys[0].degrees) || 0;
  if (clampedProgress >= Number(keys.at(-1).progress)) return Number(keys.at(-1).degrees) || 0;
  const interpolation = smoothstep(
    Number(from.progress),
    Number(to.progress),
    clampedProgress,
  );
  return THREE.MathUtils.lerp(Number(from.degrees) || 0, Number(to.degrees) || 0, interpolation);
}

function readRange(value, fallbackStart = 0, fallbackCount = 0) {
  if (Array.isArray(value)) {
    return { start: Number(value[0]) || 0, count: Number(value[1]) || 0 };
  }
  return {
    start: Number(value?.start ?? value?.offset ?? value?.surfelStart ?? fallbackStart) || 0,
    count: Number(value?.count ?? value?.length ?? value?.surfelCount ?? fallbackCount) || 0,
  };
}

function modelProfileCount(model, qualityTier, maximumCount) {
  const profileCounts = model?.profileCounts || model?.profiles || {};
  const value = profileCounts?.[qualityTier];
  const count = Number(value?.surfelCount ?? value?.count ?? value);
  if (Number.isInteger(count) && count >= 0) return Math.min(maximumCount, count);
  return maximumCount;
}

function createProgressiveSourceOrder(meta, qualityTier, totalCount) {
  const models = Array.isArray(meta?.models) ? meta.models : [];
  const streams = models.map((model) => {
    const range = readRange(model.surfelRange, model.surfelStart, model.surfelCount);
    const safeStart = clamp(Math.floor(range.start), 0, totalCount);
    const safeCount = clamp(Math.floor(range.count), 0, totalCount - safeStart);
    return {
      start: safeStart,
      count: modelProfileCount(model, qualityTier, safeCount),
      cursor: 0,
    };
  }).filter((stream) => stream.count > 0);
  if (!streams.length) {
    const profileCount = Number(meta?.profiles?.[qualityTier]?.surfelCount);
    const count = Number.isInteger(profileCount) ? Math.min(totalCount, profileCount) : totalCount;
    return Uint32Array.from({ length: count }, (_, index) => index);
  }
  const outputCount = streams.reduce((sum, stream) => sum + stream.count, 0);
  const order = new Uint32Array(outputCount);
  for (let outputIndex = 0; outputIndex < outputCount; outputIndex += 1) {
    let selected = null;
    let selectedProgress = Number.POSITIVE_INFINITY;
    for (let streamIndex = 0; streamIndex < streams.length; streamIndex += 1) {
      const stream = streams[streamIndex];
      if (stream.cursor >= stream.count) continue;
      const progress = stream.cursor / stream.count;
      if (progress < selectedProgress) {
        selected = stream;
        selectedProgress = progress;
      }
    }
    order[outputIndex] = selected.start + selected.cursor;
    selected.cursor += 1;
  }
  return order;
}

function resolveRadiusQuantization(meta) {
  const radius = meta?.quantization?.radiusWU
    || meta?.layout?.quantization?.radiusWU
    || meta?.layout?.quantization?.radius
    || meta?.quantization?.radius
    || {};
  const minimum = Number(radius.min ?? radius.minimum ?? 0);
  const maximum = Number(radius.max ?? radius.maximum);
  const scale = Number(radius.scale);
  const step = Number(radius.step);
  if (Number.isFinite(step) && step > 0) return (encoded) => encoded * step;
  if (Number.isFinite(maximum) && maximum > minimum) {
    return (encoded) => minimum + ((encoded / 65535) * (maximum - minimum));
  }
  if (Number.isFinite(scale) && scale > 0) return (encoded) => encoded * scale;
  return (encoded) => Math.max(0.012, (encoded / 65535) * 0.36);
}

function decodeV2Surfels(meta, buffer, qualityTier) {
  if (buffer.byteLength % SURFEL_STRIDE_BYTES !== 0) {
    throw new Error('The surfel binary has an invalid 32-byte stride.');
  }
  const sourceCount = buffer.byteLength / SURFEL_STRIDE_BYTES;
  const declaredCount = fileCount(meta?.files?.surfels, sourceCount);
  if (declaredCount !== sourceCount) throw new Error('The surfel count does not match meta.json.');
  const sourceOrder = createProgressiveSourceOrder(meta, qualityTier, sourceCount);
  const count = sourceOrder.length;
  const sourceObjects = new Map((meta?.source?.objects || []).map((object) => [object.objectKey, object]));
  const profileObjectCounts = meta?.profiles?.[qualityTier]?.perObjectCounts || {};
  const radiusScaleByObject = Object.freeze(Object.fromEntries(
    (meta.models || []).flatMap((model) => (model.objectKeys || []).map((objectKey, partId) => {
      const sourceObject = sourceObjects.get(objectKey);
      const masterCount = Number(sourceObject?.surfelCount) || 1;
      const profileCount = Number(profileObjectCounts[objectKey]) || masterCount;
      return [`${model.id}:${partId}`, Math.sqrt(masterCount / Math.max(1, profileCount))];
    })),
  ));
  const positions = new Float32Array(count * 3);
  const normalOct = new Int16Array(count * 2);
  const radii = new Float32Array(count);
  const paletteRoles = new Uint8Array(count);
  const lodRanks = new Float32Array(count);
  const revealRanks = new Uint16Array(count);
  const motionGroups = new Uint8Array(count);
  const featureClasses = new Uint8Array(count);
  const preserveFlags = new Uint8Array(count);
  const partOrdinals = new Map();
  const partPaletteRoles = new Map();
  const perModelCounts = Object.freeze(Object.fromEntries(
    (meta.models || []).map((model) => [
      String(model.id),
      modelProfileCount(model, qualityTier, Number(model?.surfelRange?.count) || sourceCount),
    ]),
  ));
  const modelPointIndices = Array.from({ length: meta.models?.length || 0 }, () => []);
  const view = new DataView(buffer);
  const decodeRadius = resolveRadiusQuantization(meta);
  for (let index = 0; index < count; index += 1) {
    const sourceIndex = sourceOrder[index];
    const offset = sourceIndex * SURFEL_STRIDE_BYTES;
    const positionOffset = index * 3;
    positions[positionOffset] = view.getFloat32(offset, true);
    positions[positionOffset + 1] = view.getFloat32(offset + 4, true);
    positions[positionOffset + 2] = view.getFloat32(offset + 8, true);
    const normalOffset = index * 2;
    normalOct[normalOffset] = view.getInt16(offset + 12, true);
    normalOct[normalOffset + 1] = view.getInt16(offset + 14, true);
    const modelId = view.getUint16(offset + 20, true);
    modelPointIndices[modelId]?.push(index);
    const partId = view.getUint16(offset + 22, true);
    const objectKey = meta?.models?.[modelId]?.objectKeys?.[partId];
    const partKey = `${modelId}:${partId}`;
    const partOrdinal = partOrdinals.get(partKey) || 0;
    const partCount = Number(profileObjectCounts[objectKey]) || 1;
    lodRanks[index] = Math.min(1, (partOrdinal + 0.5) / Math.max(1, partCount));
    partOrdinals.set(partKey, partOrdinal + 1);
    // Recognition floors give every Blender object its own profile ratio.
    // Scale from the exact object/part ratio so a table, cable, or control does
    // not inherit a larger model sibling's coverage error.
    radii[index] = decodeRadius(view.getUint16(offset + 16, true))
      * (radiusScaleByObject[partKey] || 1);
    revealRanks[index] = view.getUint16(offset + 18, true);
    const semanticRole = view.getUint8(offset + 28);
    const materialPaletteKey = `${partKey}:${semanticRole}`;
    let objectPaletteRoles = partPaletteRoles.get(materialPaletteKey);
    if (!objectPaletteRoles) {
      objectPaletteRoles = createAboutSurfelPaletteRoles(partCount, {
        modelId,
        partId,
        semanticRole,
        snapshot: getSimulationPaletteSnapshot(),
      });
      partPaletteRoles.set(materialPaletteKey, objectPaletteRoles);
    }
    paletteRoles[index] = objectPaletteRoles[partOrdinal % objectPaletteRoles.length];
    motionGroups[index] = view.getUint8(offset + 29);
    featureClasses[index] = view.getUint8(offset + 30);
    preserveFlags[index] = view.getUint8(offset + 31) ? 1 : 0;
  }
  return {
    count,
    sourceCount,
    radiusScaleByObject,
    positions,
    normalOct,
    radii,
    perModelCounts,
    modelPointIndices: modelPointIndices.map((indices) => Uint32Array.from(indices)),
    paletteRoles,
    lodRanks,
    revealRanks,
    motionGroups,
    featureClasses,
    preserveFlags,
  };
}

function createSurfelGeometry(decoded) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -1, -1, 0,
    1, -1, 0,
    1, 1, 0,
    -1, -1, 0,
    1, 1, 0,
    -1, 1, 0,
  ]), 3));
  geometry.setAttribute('iPosition', new THREE.InstancedBufferAttribute(decoded.positions, 3));
  geometry.setAttribute('iNormalOct', new THREE.InstancedBufferAttribute(decoded.normalOct, 2, true));
  geometry.setAttribute('iRadius', new THREE.InstancedBufferAttribute(decoded.radii, 1));
  geometry.setAttribute('iPalette', new THREE.InstancedBufferAttribute(decoded.paletteRoles, 1));
  geometry.setAttribute('iLodRank', new THREE.InstancedBufferAttribute(decoded.lodRanks, 1));
  geometry.setAttribute('iRevealRank', new THREE.InstancedBufferAttribute(decoded.revealRanks, 1, true));
  geometry.setAttribute('iMotionGroup', new THREE.InstancedBufferAttribute(decoded.motionGroups, 1));
  geometry.setAttribute('iFeatureClass', new THREE.InstancedBufferAttribute(decoded.featureClasses, 1));
  geometry.setAttribute('iPreserve', new THREE.InstancedBufferAttribute(decoded.preserveFlags, 1));
  geometry.instanceCount = decoded.count;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Number.POSITIVE_INFINITY);
  return geometry;
}

function createUniforms() {
  return {
    uViewportPx: { value: new THREE.Vector2(1, 1) },
    uProjectionScalePx: { value: 1 },
    uMinPointSizePx: { value: 1.15 },
    uMaxPointSizePx: { value: 6 },
    uCoverage: { value: 0.7 },
    uBackfaceRetention: { value: 0 },
    uDetailBias: { value: 1 },
    uPerspectiveResponse: { value: 1 },
    uFogStartWU: { value: 7 },
    uFogEndWU: { value: 18 },
    uFogCurve: { value: 1 },
    uSceneVisibility: { value: 1 },
    uEntranceScale: { value: 1 },
    uOpacity: { value: 1 },
    uMotionTime: { value: 0 },
    uMotionAmountWU: { value: 0 },
    uMotionCoherence: { value: 0.72 },
    uEdgeSoftness: { value: 1.35 },
    uPalette0: { value: new THREE.Color('#7e7e7e') },
    uPalette1: { value: new THREE.Color('#ffd019') },
    uPalette2: { value: new THREE.Color('#1772a8') },
    uPalette3: { value: new THREE.Color('#ffffff') },
    uPalette4: { value: new THREE.Color('#ed2017') },
    uPalette5: { value: new THREE.Color('#6740a4') },
  };
}

function syncPalette(uniforms, snapshot = getSimulationPaletteSnapshot()) {
  const colors = snapshot?.colors || [];
  const distribution = snapshot?.distribution || [];
  for (let index = 0; index < PALETTE_ROLE_COUNT; index += 1) {
    const colorIndex = Number(distribution[index]?.colorIndex ?? index);
    const color = colors[colorIndex] || colors[index] || '#7e7e7e';
    uniforms[`uPalette${index}`].value.setStyle(color);
  }
}

function createSurfelMaterial(uniforms, { depthCore = false } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uDepthCorePass: { value: depthCore ? 1 : 0 },
    },
    vertexShader: SURFEL_VERTEX_SHADER,
    fragmentShader: SURFEL_FRAGMENT_SHADER,
    transparent: false,
    alphaToCoverage: true,
    depthTest: true,
    depthWrite: true,
    blending: THREE.NoBlending,
    side: THREE.FrontSide,
  });
}

function arrayBytes(decoded) {
  return decoded.positions.byteLength
    + decoded.normalOct.byteLength
    + decoded.radii.byteLength
    + decoded.paletteRoles.byteLength
    + decoded.lodRanks.byteLength
    + decoded.revealRanks.byteLength
    + decoded.motionGroups.byteLength
    + decoded.featureClasses.byteLength
    + decoded.preserveFlags.byteLength;
}

function stableAttributeIdentities(geometry) {
  return Object.freeze(Object.fromEntries(
    Object.entries(geometry.attributes).map(([name, attribute]) => [name, attribute]),
  ));
}

function attributesStillStable(geometry, identities) {
  return Object.entries(identities).every(([name, attribute]) => geometry.getAttribute(name) === attribute);
}

function modelFramingSnapshot(meta, camera, controls, decoded) {
  if (!meta || !camera || !decoded) return Object.freeze({});
  camera.updateMatrixWorld(true);
  const floatingModels = (meta.models || []).filter((model) => model.role === 'floating-model');
  return Object.freeze(Object.fromEntries(floatingModels.map((model) => {
    const pointIndices = decoded.modelPointIndices[model.id] || [];
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let minimumFogVisibility = 1;
    let visibleCount = 0;
    let framedVisibleCount = 0;
    pointIndices.forEach((pointIndex) => {
      const positionOffset = pointIndex * 3;
      const point = new THREE.Vector3(
        decoded.positions[positionOffset],
        decoded.positions[positionOffset + 1],
        decoded.positions[positionOffset + 2],
      );
      const rawCameraDepth = -point.clone().applyMatrix4(camera.matrixWorldInverse).z;
      const inFront = rawCameraDepth > 0.0001;
      const cameraDepth = Math.max(0.0001, rawCameraDepth);
      const fogAmount = smoothstep(controls.fogStartWU, controls.fogEndWU, cameraDepth);
      const fogVisibility = 1 - Math.pow(fogAmount, Math.max(0.05, controls.fogCurve));
      minimumFogVisibility = Math.min(minimumFogVisibility, fogVisibility);
      const revealRank = Math.min((decoded.revealRanks[pointIndex] / 65535) * 0.12, 0.119);
      const revealed = inFront && fogVisibility > revealRank;
      const projected = point.project(camera);
      minX = Math.min(minX, projected.x);
      maxX = Math.max(maxX, projected.x);
      minY = Math.min(minY, projected.y);
      maxY = Math.max(maxY, projected.y);
      const framed = inFront && projected.x >= -1 && projected.x <= 1
        && projected.y >= -1 && projected.y <= 1;
      if (revealed) visibleCount += 1;
      if (revealed && framed) framedVisibleCount += 1;
    });
    const pointCount = pointIndices.length;
    return [model.key, Object.freeze({
      fullyFramed: minX >= -1 && maxX <= 1 && minY >= -1 && maxY <= 1,
      ndcBounds: Object.freeze({ minX, maxX, minY, maxY }),
      minimumFogVisibility,
      fullyRevealedByFog: minimumFogVisibility >= FULL_SURFEL_REVEAL_VISIBILITY,
      pointCount,
      visibleCount,
      framedVisibleCount,
      visibleFraction: pointCount ? visibleCount / pointCount : 0,
      framedVisibleFraction: pointCount ? framedVisibleCount / pointCount : 0,
    })];
  })));
}

function loadErrorMessage(error) {
  if (error?.name === 'AbortError') return '';
  return error instanceof Error ? error.message : String(error || 'Unknown asset error');
}

export function createBlenderPointScene({
  canvas,
  root,
  pointProfile = 'desktop',
  layoutProfile = 'desktop',
} = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('Blender point scenes need a canvas.');
  if (!(root instanceof HTMLElement)) throw new TypeError('Blender point scenes need a route root.');

  const qualityTier = pointProfile || (layoutProfile === 'mobile' ? 'mobile' : 'desktop');
  const maximumPixelRatio = qualityTier === 'mobile' ? 1.25 : 1.5;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const sceneGroup = new THREE.Group();
  scene.add(sceneGroup);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.05, CAMERA_FAR_WU);
  const cameraTargetQuaternion = new THREE.Quaternion();
  const uniforms = createUniforms();
  const listeners = new Set();
  const abortController = new AbortController();
  let activeAbortController = abortController;
  let state = 'loading';
  let errorMessage = '';
  let meta = null;
  let cameraTrack = null;
  let surfelGeometry = null;
  let surfelCoreMaterial = null;
  let surfelSoftMaterial = null;
  let surfelCore = null;
  let surfelSoft = null;
  let attributeIdentities = null;
  let decoded = null;
  let loadPromise = null;
  let disposed = false;
  let visible = !document.hidden;
  let contextAvailable = true;
  let latestFrame = null;
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let entranceScale = root.dataset.aboutEntranceState === 'complete' ? 1 : 0;
  let activeCount = 0;
  let frameTimeMs = 0;
  let drawCalls = 0;
  let cameraRollDegrees = 0;
  let bufferBuilds = 0;
  const controls = writeAboutSceneLook({}, null, entranceScale);
  let paletteId = '';

  const notify = () => listeners.forEach((listener) => listener());
  const setState = (nextState, nextError = '') => {
    state = nextState;
    errorMessage = nextError;
    root.dataset.pointWorldState = nextState;
    if (nextError) root.dataset.worldError = nextError;
    else delete root.dataset.worldError;
    notify();
  };

  const markReady = () => {
    root.dataset.pointAsset = 'blender-surfel-v2';
    root.dataset.aboutSceneReady = 'true';
    root.dataset.worldStage = 'blender-surfel-scene';
    root.dispatchEvent(new CustomEvent('about:world-runtime-ready'));
    window.dispatchEvent(new CustomEvent('abs:about-scene-ready'));
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    pixelRatio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const projection = cameraTrack?.projection;
    camera.fov = resolveResponsiveVerticalFovFromHorizontalFov(
      Number(projection?.horizontalFov || DEFAULT_HORIZONTAL_FOV),
      camera.aspect,
      Number(projection?.portraitMaxVerticalFov || DEFAULT_PORTRAIT_MAX_VERTICAL_FOV),
    );
    camera.updateProjectionMatrix();
    uniforms.uViewportPx.value.set(width * pixelRatio, height * pixelRatio);
    uniforms.uProjectionScalePx.value = (height * pixelRatio)
      / Math.max(0.0001, 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
  };

  const installDecodedScene = ({ nextMeta, nextCameraTrack, nextDecoded }) => {
    if (disposed) return;
    meta = nextMeta;
    cameraTrack = nextCameraTrack;
    decoded = nextDecoded;
    surfelGeometry = createSurfelGeometry(decoded);
    surfelCoreMaterial = createSurfelMaterial(uniforms, { depthCore: true });
    surfelSoftMaterial = createSurfelMaterial(uniforms);
    surfelCoreMaterial.depthFunc = THREE.LessEqualDepth;
    surfelSoftMaterial.depthFunc = THREE.LessEqualDepth;
    surfelCore = new THREE.Mesh(surfelGeometry, surfelCoreMaterial);
    surfelSoft = new THREE.Mesh(surfelGeometry, surfelSoftMaterial);
    surfelCore.frustumCulled = false;
    surfelSoft.frustumCulled = false;
    surfelCore.renderOrder = 0;
    surfelSoft.renderOrder = 1;
    sceneGroup.add(surfelCore, surfelSoft);
    attributeIdentities = stableAttributeIdentities(surfelGeometry);
    bufferBuilds += 1;
    resize();
    setState('ready');
    markReady();
    if (latestFrame) render(latestFrame);
  };

  const load = (controller = activeAbortController) => {
    if (decoded || disposed) return loadPromise || Promise.resolve();
    if (loadPromise) return loadPromise;
    setState('loading');
    loadPromise = Promise.all([
      fetchJson(META_URL, controller.signal),
      fetchJson(CAMERA_TRACK_URL, controller.signal),
    ]).then(async ([nextMeta, cameraValue]) => {
      const nextCameraTrack = validateCameraTrack(cameraValue);
      if (nextMeta?.schema !== 'about-point-scene' || Number(nextMeta?.version) !== 2) {
        throw new Error('The Blender surfel asset is not the required v2 contract.');
      }
      const surfelBuffer = await fetchBuffer(
        assetUrl(fileName(nextMeta.files?.surfels, 'surfels.bin')),
        controller.signal,
      );
      const nextDecoded = decodeV2Surfels(nextMeta, surfelBuffer, qualityTier);
      installDecodedScene({ nextMeta, nextCameraTrack, nextDecoded });
    }).catch((error) => {
      if (disposed || error?.name === 'AbortError') return;
      const message = loadErrorMessage(error);
      setState('unavailable', message);
      root.dataset.aboutSceneReady = 'true';
      window.dispatchEvent(new CustomEvent('abs:about-scene-ready'));
      console.warn('[About narrative] Blender surfel scene unavailable; editorial content remains visible.', error);
    }).finally(() => {
      loadPromise = null;
    });
    return loadPromise;
  };

  const applyFrame = (frame) => {
    writeAboutSceneLook(controls, frame, entranceScale);
    const progress = frame?.durationWU > 0 ? frame.storyWU / frame.durationWU : 0;
    if (cameraTrack) {
      sampleCameraTrack(
        cameraTrack,
        progress,
        camera.position,
        camera.quaternion,
        cameraTargetQuaternion,
      );
      cameraRollDegrees = sampleAuthoredRollDegrees(cameraTrack, progress);
    }
    const motionTime = Number(frame?.ambientTime ?? frame?.storyTime ?? 0) * controls.motionSpeed;
    const count = decoded?.count || 0;
    activeCount = count;
    if (surfelGeometry) surfelGeometry.instanceCount = activeCount;
    uniforms.uMinPointSizePx.value = controls.minPointSizePx;
    uniforms.uMaxPointSizePx.value = controls.maxPointSizePx;
    uniforms.uCoverage.value = controls.surfelCoverage;
    uniforms.uBackfaceRetention.value = controls.backfaceRetention;
    uniforms.uDetailBias.value = controls.detailBias;
    uniforms.uPerspectiveResponse.value = controls.perspectiveResponse;
    uniforms.uFogStartWU.value = controls.fogStartWU;
    uniforms.uFogEndWU.value = Math.max(controls.fogStartWU + 0.001, controls.fogEndWU);
    uniforms.uFogCurve.value = controls.fogCurve;
    uniforms.uSceneVisibility.value = controls.sceneVisibility;
    uniforms.uEntranceScale.value = controls.entranceScale;
    uniforms.uOpacity.value = controls.opacity;
    uniforms.uMotionTime.value = motionTime;
    uniforms.uMotionAmountWU.value = controls.motionAmountWU;
    uniforms.uMotionCoherence.value = controls.motionCoherence;
    uniforms.uEdgeSoftness.value = controls.edgeSoftness;
  };

  const render = (frame = latestFrame) => {
    if (frame) latestFrame = frame;
    if (disposed || !visible || !contextAvailable || !decoded || !latestFrame) return false;
    applyFrame(latestFrame);
    const startedAt = performance.now();
    renderer.render(scene, camera);
    frameTimeMs = Math.max(0, performance.now() - startedAt);
    drawCalls = renderer.info.render.calls;
    return true;
  };

  const getDiagnosticsSnapshot = () => Object.freeze({
    state,
    adapterId: ADAPTER_ID,
    assetVersion: Number(meta?.version || 0),
    assetSchema: meta?.schema || '',
    assetSourceHash: meta?.source?.sha256 || '',
    fallbackAsset: false,
    qualityTier,
    pointProfile: qualityTier,
    layoutProfile,
    activeSurfelCount: activeCount,
    residentSurfelCount: decoded?.count || 0,
    masterSurfelCount: decoded?.sourceCount || 0,
    lodRadiusScaleMode: 'per-object',
    lodRadiusScaleByObject: decoded?.radiusScaleByObject || Object.freeze({}),
    perModelCounts: decoded?.perModelCounts || Object.freeze({}),
    modelCount: Array.isArray(meta?.models) ? meta.models.length : 0,
    zones: Object.freeze((meta?.zones || meta?.pages || []).map((zone) => zone.id || zone.name || '')),
    activeZones: Object.freeze((meta?.zones || meta?.pages || [])
      .filter((zone) => {
        const storyWU = Number(latestFrame?.storyWU) || 0;
        const startWU = Number(zone.preloadStartWU ?? zone.activeStartWU ?? 0);
        const endWU = Number(zone.releaseEndWU ?? zone.activeEndWU ?? Number.POSITIVE_INFINITY);
        return storyWU >= startWU && storyWU <= endWU;
      })
      .map((zone) => zone.id || zone.name || '')),
    drawCalls,
    occlusionMode: 'depth-owned-whole-surfel-reveal',
    gpuBytes: decoded ? arrayBytes(decoded) : 0,
    gpuBufferBuilds: bufferBuilds,
    gpuBufferIdentityStable: Boolean(
      surfelGeometry && attributeIdentities
      && attributesStillStable(surfelGeometry, attributeIdentities)
    ),
    cameraRollDegrees,
    cameraPosition: Object.freeze(camera.position.toArray()),
    modelFraming: modelFramingSnapshot(meta, camera, controls, decoded),
    pixelRatio,
    viewportWidth: width,
    viewportHeight: height,
    paletteId,
    contextAvailable,
    visible,
    controls: Object.freeze({ ...controls }),
    error: errorMessage,
  });

  const getMetrics = () => Object.freeze({
    ...getDiagnosticsSnapshot(),
    pointCount: activeCount,
    frameTimeMs,
    fixedAttributeIdentityStable: Boolean(
      surfelGeometry && attributeIdentities
      && attributesStillStable(surfelGeometry, attributeIdentities)
    ),
    bufferRebuilds: bufferBuilds,
    gpuBufferCount: surfelGeometry ? Object.keys(surfelGeometry.attributes).length : 0,
    gpuBufferBytes: decoded ? arrayBytes(decoded) : 0,
    correspondenceSequenceState: state === 'ready' || state === 'fallback-ready' ? 'ready' : state,
  });

  const preparePlan = (request) => {
    void request;
    return load();
  };

  const retryPreparation = () => {
    if (state !== 'unavailable' || disposed) return loadPromise;
    activeAbortController.abort();
    activeAbortController = new AbortController();
    return load(activeAbortController);
  };

  const setVisible = (nextVisible) => {
    visible = Boolean(nextVisible);
    if (visible && latestFrame) render(latestFrame);
  };

  const setEntranceScale = (scale) => {
    entranceScale = clamp(scale, 0, 1);
    uniforms.uEntranceScale.value = entranceScale;
    if (latestFrame && visible) render(latestFrame);
  };

  const handleContextLost = (event) => {
    event.preventDefault();
    contextAvailable = false;
    setState('context-lost');
  };
  const handleContextRestored = () => {
    contextAvailable = true;
    Object.values(surfelGeometry?.attributes || {}).forEach((attribute) => {
      attribute.needsUpdate = true;
    });
    setState('ready');
    resize();
    if (latestFrame) render(latestFrame);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);
  resizeObserver.observe(canvas);
  canvas.addEventListener('webglcontextlost', handleContextLost);
  canvas.addEventListener('webglcontextrestored', handleContextRestored);
  window.addEventListener('resize', resize, { passive: true });
  const unsubscribePalette = subscribeSimulationPalette((snapshot) => {
    paletteId = snapshot.paletteId;
    syncPalette(uniforms, snapshot);
    if (latestFrame && visible) render(latestFrame);
  });
  resize();
  void load();

  const api = Object.freeze({
    adapterId: ADAPTER_ID,
    destroy() {
      if (disposed) return;
      disposed = true;
      activeAbortController.abort();
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      window.removeEventListener('resize', resize);
      unsubscribePalette();
      listeners.clear();
      if (surfelCore) sceneGroup.remove(surfelCore);
      if (surfelSoft) sceneGroup.remove(surfelSoft);
      surfelGeometry?.dispose();
      surfelCoreMaterial?.dispose();
      surfelSoftMaterial?.dispose();
      renderer.dispose();
      if (RUNTIME_DIAGNOSTICS_ENABLED && window.__aboutNarrativeRuntime === api) {
        delete window.__aboutNarrativeRuntime;
      }
      delete root.dataset.pointWorldState;
      delete root.dataset.pointAsset;
      delete root.dataset.worldStage;
      delete root.dataset.worldError;
    },
    getDiagnosticsSnapshot,
    getMetrics,
    getPointerPressureSnapshot: () => Object.freeze({ active: false, strength: 0 }),
    preparePlan,
    render,
    resetHotFrameMetrics() {},
    resetPerformanceMetrics() { frameTimeMs = 0; },
    retryPreparation,
    setEntranceScale,
    setVisible,
    subscribeDiagnostics(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
  if (RUNTIME_DIAGNOSTICS_ENABLED) window.__aboutNarrativeRuntime = api;
  return api;
}
