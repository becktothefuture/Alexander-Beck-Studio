import * as THREE from 'three';
import {
  resolveResponsiveVerticalFovFromHorizontalFov,
} from './aboutNarrativeCameraProjection.js';
import {
  createAboutNarrativeCameraPointerPanController,
  createAboutNarrativeCameraPointerPanSample,
} from './aboutNarrativeCameraPointerPan.js';
import {
  createAboutNarrativeCameraSteadycamController,
  createAboutNarrativeCameraSteadycamSample,
} from './aboutNarrativeCameraSteadycam.js';
import {
  createAboutNarrativeJourneySample,
  sampleAboutNarrativeJourneyMapInto,
} from './aboutNarrativeJourneyMap.js';
import {
  resolveAboutBlenderSceneContract,
  validateAboutBlenderSceneBundle,
} from './aboutBlenderSceneContract.js';
import { writeAboutSceneLook } from './aboutSceneLook.js';
import { resolveAboutSurfelPaletteColors } from './aboutSurfelPalette.js';
import { aboutSurfelIntersectsRect, aboutSurfelSweepIntersectsRect, decodeAboutSurfelNormal, resolveAboutSurfelRadiusPx } from './aboutSurfelProjection.js';
import {
  getSimulationPaletteSnapshot,
  subscribeSimulationPalette,
} from '../../palette/simulationPaletteController.js';

const DEFAULT_ASSET_ROOT = '/models/about-v2-edited-world';
const SURFEL_STRIDE_BYTES = 32;
const DEFAULT_HORIZONTAL_FOV = 85;
const DEFAULT_PORTRAIT_MAX_VERTICAL_FOV = 115;
const FULL_SURFEL_REVEAL_VISIBILITY = 0.2;
const CAMERA_FAR_WU = 560;
const DEFAULT_VISIBILITY_HANDOFF_WU = 0.18;
const EMPTY_DIAGNOSTICS = Object.freeze([]);
const EMPTY_MODEL_FRAMING = Object.freeze({});
const EMPTY_VISIBILITY_WINDOWS = Object.freeze([]);
const PALETTE_ROLE_COUNT = 6;
const POINTER_LOOK_DISTANCE_WU = 18;
const CONTINUITY_GRID_COLUMNS = 12;
const CONTINUITY_GRID_ROWS = 8;
const CONTINUITY_SAMPLES_PER_ACTIVE_MODEL = 2048;
const ADAPTER_ID = 'blender-surfel-v2';
const RUNTIME_DIAGNOSTICS_ENABLED = import.meta.env.DEV || __CERTIFY__;

function finiteNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

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
  attribute float iVisibilityStartWU;
  attribute float iVisibilityEndWU;
  attribute float iVisibilityEntranceHandoffWU;
  attribute float iVisibilityExitHandoffWU;

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
  uniform float uManifestationSpread;
  uniform vec4 uModelMaterials[7];
  uniform float uMotionTime;
  uniform float uMotionAmountWU;
  uniform float uMotionScaleWU;
  uniform float uMotionCoherence;
  uniform float uStoryWU;
  uniform float uReducedMotion;
  uniform vec2 uTerminalMotionGroups;
  uniform vec2 uTerminalTravelXWU;
  uniform float uTerminalPhase;
  uniform float uTerminalAmplitudeWU;
  uniform float uTerminalPeriod;
  uniform float uTerminalDelay;
  uniform float uTerminalPulseDuration;

  varying vec2 vCircle;
  varying float vPalette;

  float separatedSurfelRadius(
    float physicalRadiusPx,
    float surfaceFacing,
    float coverage,
    float minimumRadiusPx,
    float maximumRadiusPx
  ) {
    // Bound the billboard by its radius-derived projected spacing. At grazing
    // angles its source area is foreshortened; a fixed pixel floor otherwise
    // turns distant rows into solid colour bands. Keep every source point and
    // its round silhouette, but let physical spacing override that size floor.
    float projectedSpacingPx = physicalRadiusPx / 0.56;
    float facingArea = clamp(abs(surfaceFacing), 0.16, 1.0);
    // A grazing surface compresses one axis more than its projected area.
    // Correct only that local footprint; face-on dots retain their size.
    float facingAxis = clamp(abs(surfaceFacing), 0.30, 1.0);
    float grazingWeight = 0.5 * (1.0 - smoothstep(0.15, 0.55, abs(surfaceFacing)));
    float footprint = mix(sqrt(facingArea), facingAxis, grazingWeight);
    float spacingCapPx = 0.42 * projectedSpacingPx * footprint;
    float preferredRadiusPx = max(physicalRadiusPx * coverage, minimumRadiusPx);
    return min(maximumRadiusPx, min(preferredRadiusPx, spacingCapPx));
  }

  vec3 octDecodeNormal(vec2 encoded) {
    vec3 normal = vec3(encoded.xy, 1.0 - abs(encoded.x) - abs(encoded.y));
    if (normal.z < 0.0) {
      vec2 signs = step(vec2(0.0), normal.xy) * 2.0 - 1.0;
      normal.xy = (1.0 - abs(normal.yx)) * signs;
    }
    return normalize(normal);
  }

  void main() {
    float entranceHandoffWU = max(0.001, iVisibilityEntranceHandoffWU);
    float exitHandoffWU = max(0.001, iVisibilityExitHandoffWU);
    float stageEntrance = iVisibilityStartWU <= 0.0
      ? 1.0
      : smoothstep(
        iVisibilityStartWU,
        iVisibilityStartWU + entranceHandoffWU,
        uStoryWU
      );
    float stageExit = 1.0 - smoothstep(
      max(iVisibilityStartWU, iVisibilityEndWU - exitHandoffWU),
      iVisibilityEndWU,
      uStoryWU
    );
    float stageVisibility = min(stageEntrance, stageExit);
    if (uReducedMotion > 0.5) {
      stageVisibility = step(iVisibilityStartWU, uStoryWU)
        * (1.0 - step(iVisibilityEndWU, uStoryWU));
    }
    float presentationScale = min(
      min(clamp(uSceneVisibility, 0.0, 1.0), clamp(uEntranceScale, 0.0, 1.0)),
      clamp(uOpacity, 0.0, 1.0)
    );
    // Most resident points belong to stages outside the current story window.
    // Reject them before trigonometry and matrix work. This preserves stable
    // buffers and two draw calls while making passed scenery cheap to retain.
    if (stageVisibility <= 0.0 || presentationScale <= 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vCircle = vec2(2.0);
      vPalette = iPalette;
      return;
    }
    float groupPhase = iMotionGroup * 2.39996323 * uMotionCoherence;
    vec3 rigidMotion = vec3(
      sin((uMotionTime * 0.71) + groupPhase) * 0.6,
      cos((uMotionTime * 0.83) + (groupPhase * 1.31)) * 0.8,
      sin((uMotionTime * 0.47) + (groupPhase * 0.73)) * 0.4
    ) * uMotionAmountWU;
    float pointPhase = dot(
      iPosition,
      vec3(0.62, 0.94, 1.18) / max(0.001, uMotionScaleWU)
    )
      + (iRevealRank * 5.3)
      + (iLodRank * 9.7);
    float individualStrength = mix(0.12, 0.28, 1.0 - uMotionCoherence);
    vec3 individualMotion = vec3(
      sin((uMotionTime * 0.53) + pointPhase),
      cos((uMotionTime * 0.61) + (pointPhase * 0.79)),
      sin((uMotionTime * 0.43) + (pointPhase * 1.17))
    ) * (uMotionAmountWU * individualStrength);
    if (uTerminalMotionGroups.x >= 0.0
      && iMotionGroup >= uTerminalMotionGroups.x
      && iMotionGroup <= uTerminalMotionGroups.y) {
      // One local bend reaches neighbouring material after a spatial delay.
      // The smooth pulse has a clear rest between events; all points on the
      // shared surface respond to location rather than independent random IDs.
      float region = (iPosition.x - uTerminalTravelXWU.x)
        / max(0.001, uTerminalTravelXWU.y - uTerminalTravelXWU.x);
      float localTime = mod(uTerminalPhase - region * uTerminalDelay, uTerminalPeriod);
      float pulse = sin(3.14159265 * clamp(localTime / uTerminalPulseDuration, 0.0, 1.0));
      float response = pulse * pulse;
      rigidMotion = vec3(0.0, uTerminalAmplitudeWU * response, 0.0);
      individualMotion = vec3(0.0);
    }
    vec4 viewCenter = modelViewMatrix * vec4(iPosition + rigidMotion + individualMotion, 1.0);
    vec3 viewNormal = normalize(normalMatrix * octDecodeNormal(iNormalOct));
    float surfaceFacing = dot(viewNormal, normalize(-viewCenter.xyz));
    float cameraDepth = max(0.0001, -viewCenter.z);
    // Break the fog boundary into a shallow, stable volume in world space.
    // One bounded analytic sample avoids textures, mutable buffers and
    // per-frame allocation while keeping neighbouring surfaces coherent.
    float fogSpanWU = max(0.001, uFogEndWU - uFogStartWU);
    float fogVolumeField = sin(
      dot(iPosition, vec3(0.031, 0.047, 0.019)) + (iMotionGroup * 0.37)
    );
    float fogVolumeOffsetWU = fogVolumeField * min(3.5, fogSpanWU * 0.025);
    float fogAmount = smoothstep(
      uFogStartWU,
      max(uFogStartWU + 0.001, uFogEndWU),
      cameraDepth + fogVolumeOffsetWU
    );
    float fogVisibility = 1.0 - pow(fogAmount, max(0.05, uFogCurve));
    float revealVisibility = min(
      stageVisibility,
      min(
        fogVisibility,
        min(clamp(uSceneVisibility, 0.0, 1.0), clamp(uOpacity, 0.0, 1.0))
      )
    );
    vec2 materialScale = vec2(1.0);
    for (int model = 0; model < 7; model++) {
      vec4 material = uModelMaterials[model];
      if (iMotionGroup >= material.x && iMotionGroup <= material.y) {
        materialScale = material.zw;
      }
    }
    float manifestationSpread = clamp(uManifestationSpread * materialScale.x, 0.0, 0.8);
    float revealRank = min(
      iRevealRank * manifestationSpread,
      max(0.0, manifestationSpread - 0.001)
    );
    float revealProgress = smoothstep(
      revealRank,
      min(1.0, revealRank + 0.08),
      revealVisibility
    );
    if (uReducedMotion > 0.5) revealProgress = step(0.001, revealProgress);
    float referenceDepthWU = 8.0;
    float resolvedDepth = referenceDepthWU * pow(
      cameraDepth / referenceDepthWU,
      clamp(uPerspectiveResponse, 0.1, 2.0)
    );
    float physicalRadiusPx = iRadius * uProjectionScalePx / max(0.0001, resolvedDepth);
    float projectedSpacingPx = max(physicalRadiusPx, uMinPointSizePx) / 0.56;
    float featureRetention = mix(1.0, 1.12, clamp(iFeatureClass * 0.5, 0.0, 1.0));
    float detailFraction = clamp(
      (projectedSpacingPx * uDetailBias * materialScale.y * featureRetention) / 3.5,
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
    float radiusPx = separatedSurfelRadius(
      physicalRadiusPx,
      surfaceFacing,
      uCoverage,
      uMinPointSizePx,
      max(uMinPointSizePx, uMaxPointSizePx)
    );
    // Fog admits each circle with one local zero-to-full growth. The route
    // entrance can scale that first material arrival once; stage windows only
    // reject inactive sets and never collapse a settled structure.
    radiusPx *= revealProgress * clamp(uEntranceScale, 0.0, 1.0);

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
  const response = await fetch(url, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error(`Asset request failed (${response.status}): ${url}`);
  return response.json();
}

async function fetchBuffer(url, signal) {
  const response = await fetch(url, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error(`Asset request failed (${response.status}): ${url}`);
  return response.arrayBuffer();
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
  const modelCount = meta.models?.length || 0;
  const view = new DataView(buffer);
  const modelCounts = new Uint32Array(modelCount);
  for (let index = 0; index < count; index += 1) {
    const modelId = view.getUint16(sourceOrder[index] * SURFEL_STRIDE_BYTES + 20, true);
    if (modelId >= modelCount) throw new Error(`Surfel references unknown model ${modelId}.`);
    modelCounts[modelId] += 1;
  }
  const modelRanges = Array.from({ length: modelCount }, (_, modelId) => ({
    start: modelCounts.slice(0, modelId).reduce((sum, value) => sum + value, 0),
    count: modelCounts[modelId],
  }));
  const modelCursors = new Uint32Array(modelCount);
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
  const visibilityStartsWU = new Float32Array(count);
  const visibilityEndsWU = new Float32Array(count);
  const visibilityEntranceHandoffsWU = new Float32Array(count);
  const visibilityExitHandoffsWU = new Float32Array(count);
  const partOrdinals = new Map();
  const perModelCounts = Object.freeze(Object.fromEntries(
    (meta.models || []).map((model) => [
      String(model.id),
      modelProfileCount(model, qualityTier, Number(model?.surfelRange?.count) || sourceCount),
    ]),
  ));
  const decodeRadius = resolveRadiusQuantization(meta);
  for (let index = 0; index < count; index += 1) {
    const sourceIndex = sourceOrder[index];
    const offset = sourceIndex * SURFEL_STRIDE_BYTES;
    const modelId = view.getUint16(offset + 20, true);
    const destinationIndex = modelRanges[modelId].start + modelCursors[modelId];
    modelCursors[modelId] += 1;
    const positionOffset = destinationIndex * 3;
    positions[positionOffset] = view.getFloat32(offset, true);
    positions[positionOffset + 1] = view.getFloat32(offset + 4, true);
    positions[positionOffset + 2] = view.getFloat32(offset + 8, true);
    const normalOffset = destinationIndex * 2;
    normalOct[normalOffset] = view.getInt16(offset + 12, true);
    normalOct[normalOffset + 1] = view.getInt16(offset + 14, true);
    const partId = view.getUint16(offset + 22, true);
    const objectKey = meta?.models?.[modelId]?.objectKeys?.[partId];
    const partKey = `${modelId}:${partId}`;
    const partOrdinal = partOrdinals.get(partKey) || 0;
    const partCount = Number(profileObjectCounts[objectKey]) || 1;
    lodRanks[destinationIndex] = Math.min(1, (partOrdinal + 0.5) / Math.max(1, partCount));
    partOrdinals.set(partKey, partOrdinal + 1);
    // Recognition floors give every Blender object its own profile ratio.
    // Scale from the exact object/part ratio so a table, cable, or control does
    // not inherit a larger model sibling's coverage error.
    radii[destinationIndex] = decodeRadius(view.getUint16(offset + 16, true))
      * (radiusScaleByObject[partKey] || 1);
    revealRanks[destinationIndex] = view.getUint16(offset + 18, true);
    // The exported byte is the complete Blender-owned semantic assignment.
    // Quality, resize and scroll paths only select or transform these stable
    // records; they never recolour individual surfels.
    paletteRoles[destinationIndex] = view.getUint8(offset + 28);
    motionGroups[destinationIndex] = view.getUint8(offset + 29);
    featureClasses[destinationIndex] = view.getUint8(offset + 30);
    preserveFlags[destinationIndex] = view.getUint8(offset + 31) ? 1 : 0;
  }
  const modelPointIndices = modelRanges.map(({ start, count: modelPointCount }) => Uint32Array.from(
    { length: modelPointCount },
    (_, index) => start + index,
  ));
  return {
    count,
    sourceCount,
    radiusScaleByObject,
    positions,
    normalOct,
    radii,
    perModelCounts,
    modelRanges: Object.freeze(modelRanges.map((range) => Object.freeze(range))),
    modelPointIndices,
    paletteRoles,
    lodRanks,
    revealRanks,
    motionGroups,
    featureClasses,
    preserveFlags,
    visibilityStartsWU,
    visibilityEndsWU,
    visibilityEntranceHandoffsWU,
    visibilityExitHandoffsWU,
  };
}

function resolveEffectiveVisibilityWindows(windows) {
  return Object.freeze(windows.map((window, index) => {
    const previous = windows[index - 1];
    const next = windows[index + 1];
    const authoredHandoffWU = Math.max(
      0.001,
      finiteNumberOrNull(window.handoffWU) ?? DEFAULT_VISIBILITY_HANDOFF_WU,
    );
    const incomingOverlapWU = previous
      ? Math.max(0, Number(previous.endWU) - Number(window.startWU))
      : Number.POSITIVE_INFINITY;
    const outgoingOverlapWU = next
      ? Math.max(0, Number(window.endWU) - Number(next.startWU))
      : Number.POSITIVE_INFINITY;
    // Split each adjacent overlap into complementary halves. The arriving
    // stage settles before the departing stage recedes, so the combined
    // population never falls below one full stage and physical passages are
    // fully admitted before the camera reaches them.
    const entranceHandoffWU = Number.isFinite(incomingOverlapWU)
      ? Math.max(0.001, incomingOverlapWU * 0.5)
      : authoredHandoffWU;
    const exitHandoffWU = Number.isFinite(outgoingOverlapWU)
      ? Math.max(0.001, outgoingOverlapWU * 0.5)
      : authoredHandoffWU;
    return Object.freeze({
      ...window,
      handoffWU: Math.min(entranceHandoffWU, exitHandoffWU),
      entranceHandoffWU,
      exitHandoffWU,
      incomingOverlapWU,
      outgoingOverlapWU,
    });
  }));
}

function applyResolvedVisibilityWindows(decoded, windows, geometries) {
  const resolvedWindows = resolveEffectiveVisibilityWindows(windows);
  resolvedWindows.forEach((window) => {
    const range = decoded.modelRanges[window.modelId];
    const end = range.start + range.count;
    decoded.visibilityStartsWU.fill(window.startWU, range.start, end);
    decoded.visibilityEndsWU.fill(window.endWU, range.start, end);
    decoded.visibilityEntranceHandoffsWU.fill(window.entranceHandoffWU, range.start, end);
    decoded.visibilityExitHandoffsWU.fill(window.exitHandoffWU, range.start, end);
  });
  for (const attributeName of [
    'iVisibilityStartWU',
    'iVisibilityEndWU',
    'iVisibilityEntranceHandoffWU',
    'iVisibilityExitHandoffWU',
  ]) {
    geometries.forEach((geometry) => {
      const attribute = geometry?.getAttribute(attributeName);
      if (attribute) attribute.needsUpdate = true;
    });
  }
  return resolvedWindows;
}

function createSurfelGeometry(decoded, modelRange) {
  const { start, count } = modelRange;
  const view = (array, itemSize = 1) => array.subarray(
    start * itemSize,
    (start + count) * itemSize,
  );
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -1, -1, 0,
    1, -1, 0,
    1, 1, 0,
    -1, -1, 0,
    1, 1, 0,
    -1, 1, 0,
  ]), 3));
  geometry.setAttribute('iPosition', new THREE.InstancedBufferAttribute(view(decoded.positions, 3), 3));
  geometry.setAttribute('iNormalOct', new THREE.InstancedBufferAttribute(view(decoded.normalOct, 2), 2, true));
  geometry.setAttribute('iRadius', new THREE.InstancedBufferAttribute(view(decoded.radii), 1));
  geometry.setAttribute('iPalette', new THREE.InstancedBufferAttribute(view(decoded.paletteRoles), 1));
  geometry.setAttribute('iLodRank', new THREE.InstancedBufferAttribute(view(decoded.lodRanks), 1));
  geometry.setAttribute('iRevealRank', new THREE.InstancedBufferAttribute(view(decoded.revealRanks), 1, true));
  geometry.setAttribute('iMotionGroup', new THREE.InstancedBufferAttribute(view(decoded.motionGroups), 1));
  geometry.setAttribute('iFeatureClass', new THREE.InstancedBufferAttribute(view(decoded.featureClasses), 1));
  geometry.setAttribute('iPreserve', new THREE.InstancedBufferAttribute(view(decoded.preserveFlags), 1));
  geometry.setAttribute('iVisibilityStartWU', new THREE.InstancedBufferAttribute(view(decoded.visibilityStartsWU), 1));
  geometry.setAttribute('iVisibilityEndWU', new THREE.InstancedBufferAttribute(view(decoded.visibilityEndsWU), 1));
  geometry.setAttribute('iVisibilityEntranceHandoffWU', new THREE.InstancedBufferAttribute(view(decoded.visibilityEntranceHandoffsWU), 1));
  geometry.setAttribute('iVisibilityExitHandoffWU', new THREE.InstancedBufferAttribute(view(decoded.visibilityExitHandoffsWU), 1));
  geometry.instanceCount = 0;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Number.POSITIVE_INFINITY);
  return geometry;
}

function createUniforms(snapshot = getSimulationPaletteSnapshot()) {
  const paletteColors = resolveAboutSurfelPaletteColors(snapshot);
  return {
    uViewportPx: { value: new THREE.Vector2(1, 1) },
    uProjectionScalePx: { value: 1 },
    uMinPointSizePx: { value: 1.15 },
    uMaxPointSizePx: { value: 6 },
    uCoverage: { value: 0.7 },
    uBackfaceRetention: { value: 0 },
    uDetailBias: { value: 1 },
    uPerspectiveResponse: { value: 1 },
    uFogStartWU: { value: 14 },
    uFogEndWU: { value: 70 },
    uFogCurve: { value: 1 },
    uSceneVisibility: { value: 1 },
    uEntranceScale: { value: 1 },
    uOpacity: { value: 1 },
    uManifestationSpread: { value: 0.24 },
    uModelMaterials: { value: Array.from({ length: 7 }, () => new THREE.Vector4(-1, -1, 1, 1)) },
    uMotionTime: { value: 0 },
    uMotionAmountWU: { value: 0 },
    uMotionScaleWU: { value: 20 },
    uMotionCoherence: { value: 0.72 },
    uStoryWU: { value: 0 },
    uReducedMotion: { value: 0 },
    uTerminalMotionGroups: { value: new THREE.Vector2(-1, -1) },
    uTerminalTravelXWU: { value: new THREE.Vector2(-38, 38) },
    uTerminalPhase: { value: 0 },
    uTerminalAmplitudeWU: { value: 0 },
    uTerminalPeriod: { value: 8 },
    uTerminalDelay: { value: 2.6 },
    uTerminalPulseDuration: { value: 2 },
    uEdgeSoftness: { value: 1.35 },
    uPalette0: { value: new THREE.Color(paletteColors[0]) },
    uPalette1: { value: new THREE.Color(paletteColors[1]) },
    uPalette2: { value: new THREE.Color(paletteColors[2]) },
    uPalette3: { value: new THREE.Color(paletteColors[3]) },
    uPalette4: { value: new THREE.Color(paletteColors[4]) },
    uPalette5: { value: new THREE.Color(paletteColors[5]) },
  };
}

function syncPalette(uniforms, snapshot = getSimulationPaletteSnapshot()) {
  const colors = resolveAboutSurfelPaletteColors(snapshot);
  for (let index = 0; index < PALETTE_ROLE_COUNT; index += 1) {
    uniforms[`uPalette${index}`].value.setStyle(colors[index]);
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
    + decoded.preserveFlags.byteLength
    + decoded.visibilityStartsWU.byteLength
    + decoded.visibilityEndsWU.byteLength
    + decoded.visibilityEntranceHandoffsWU.byteLength
    + decoded.visibilityExitHandoffsWU.byteLength;
}

function stableAttributeIdentities(geometries) {
  return Object.freeze(geometries.map((geometry) => Object.freeze(Object.fromEntries(
    Object.entries(geometry.attributes).map(([name, attribute]) => [name, attribute]),
  ))));
}

function attributesStillStable(geometries, identities) {
  return geometries.length === identities.length && geometries.every((geometry, index) => (
    Object.entries(identities[index]).every(
      ([name, attribute]) => geometry.getAttribute(name) === attribute,
    )
  ));
}

function modelStageVisibility(model, storyWU, reducedMotion = false) {
  const startWU = finiteNumberOrNull(model?.startWU ?? model?.visibilityStartWU);
  const endWU = finiteNumberOrNull(model?.endWU ?? model?.visibilityEndWU);
  const entranceHandoffWU = Math.max(
    0.001,
    finiteNumberOrNull(model?.entranceHandoffWU ?? model?.visibilityHandoffWU)
      ?? DEFAULT_VISIBILITY_HANDOFF_WU,
  );
  const exitHandoffWU = Math.max(
    0.001,
    finiteNumberOrNull(model?.exitHandoffWU ?? model?.visibilityHandoffWU)
      ?? DEFAULT_VISIBILITY_HANDOFF_WU,
  );
  if (startWU === null || endWU === null || endWU <= startWU) return 0;
  if (reducedMotion) return storyWU >= startWU && storyWU < endWU ? 1 : 0;
  const entrance = startWU <= 0 ? 1 : smoothstep(
    startWU,
    startWU + entranceHandoffWU,
    storyWU,
  );
  const exit = 1 - smoothstep(
    Math.max(startWU, endWU - exitHandoffWU),
    endWU,
    storyWU,
  );
  return Math.min(entrance, exit);
}

function modelFramingSnapshot(
  meta,
  camera,
  controls,
  decoded,
  storyWU,
  protectedNdcBounds = null,
  resolvedVisibilityWindows = null,
  reducedMotion = false,
  terminalMotion = null,
  renderState = null,
) {
  if (!meta || !camera || !decoded) return Object.freeze({});
  camera.updateMatrixWorld(true);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(camera.matrixWorldInverse);
  const diagnosticModels = meta.models || [];
  return Object.freeze(Object.fromEntries(diagnosticModels.map((model) => {
    const pointIndices = decoded.modelPointIndices[model.id] || [];
    const manifestationSpread = controls.manifestationSpread * (model.material?.manifestationSpreadScale ?? 1);
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let minimumFogVisibility = 1;
    let visibleCount = 0;
    let framedVisibleCount = 0;
    let framedLeftCount = 0;
    let framedRightCount = 0;
    let protectedCenterVisibleCount = 0;
    let protectedEnvelopeVisibleCount = 0;
    let protectedRenderedVisibleCount = 0;
    const terminalSweptProtectedRegionVisibleCounts = (renderState?.protectedNdcRegions || []).map(() => 0);
    let renderedVisibleCount = 0;
    let nearestFramedDepthWU = Infinity;
    let farthestFramedDepthWU = -Infinity;
    const protectedRegionVisibleCounts = (renderState?.protectedNdcRegions || []).map(() => 0);
    // A conservative silhouette bound: include every fog-admitted source
    // point, even one rejected by LOD, at the maximum possible shader radius.
    // This can over-report intrusion; it cannot certify a hidden point edge.
    const radiusNdcX = renderState ? 2 * controls.maxPointSizePx / renderState.widthPx : 0;
    const radiusNdcY = renderState ? 2 * controls.maxPointSizePx / renderState.heightPx : 0;
    // Explicit diagnostics only, never render/RAF. Three projected points are
    // needed to occupy a bin; this measures spread, not rendered visual quality.
    const occupancy = new Uint16Array(12 * 12);
    const recoveryOccupancy = new Uint16Array(12 * 8);
    const recoveryHorizontalBandCounts = new Uint32Array(3);
    const recoveryCentralVerticalBandCounts = new Uint32Array(3);
    const recoveryDepthPopulationCounts = new Uint32Array(3);
    const recoveryRenderedDepths = [];
    const leftEdgeRows = new Uint16Array(12);
    const rightEdgeRows = new Uint16Array(12);
    const depthBySide = [[Infinity, -Infinity], [Infinity, -Infinity]];
    const readingOccupancy = new Uint16Array(144);
    const groundOccupancy = new Uint16Array(144);
    const groundEdgeRows = [new Uint16Array(12), new Uint16Array(12)];
    const readingDepths = [[], []];
    const groundDepths = [[], []];
    const visibilityWindow = resolvedVisibilityWindows?.[model.id];
    const stageVisibility = modelStageVisibility(visibilityWindow ? {
      visibilityStartWU: visibilityWindow.startWU,
      visibilityEndWU: visibilityWindow.endWU,
      visibilityHandoffWU: visibilityWindow.handoffWU,
      entranceHandoffWU: visibilityWindow.entranceHandoffWU,
      exitHandoffWU: visibilityWindow.exitHandoffWU,
    } : model, storyWU, reducedMotion);
    const protectedBounds = protectedNdcBounds || {
      minX: camera.aspect < 0.7 ? -0.72 : -0.46,
      maxX: camera.aspect < 0.7 ? 0.72 : 0.46,
      minY: -0.22,
      maxY: 0.22,
    };
    pointIndices.forEach((pointIndex) => {
      const positionOffset = pointIndex * 3;
      const point = new THREE.Vector3(
        decoded.positions[positionOffset],
        decoded.positions[positionOffset + 1],
        decoded.positions[positionOffset + 2],
      );
      const fogSpanWU = Math.max(0.001, controls.fogEndWU - controls.fogStartWU);
      const fogVolumeField = Math.sin(
        point.x * 0.031 + point.y * 0.047 + point.z * 0.019
          + decoded.motionGroups[pointIndex] * 0.37,
      );
      const fogVolumeOffsetWU = fogVolumeField * Math.min(3.5, fogSpanWU * 0.025);
      if (terminalMotion && model.key === terminalMotion.modelKey) {
        const { phase, amplitude, periodSeconds, responseDelaySeconds, pulseDurationSeconds, travelXWU } = terminalMotion;
        if (renderState?.terminalSweep && stageVisibility > 0 && renderState.protectedNdcRegions.length) {
          const startWorld = point.clone();
          const endWorld = point.clone();
          endWorld.y += amplitude;
          const startDepth = -startWorld.clone().applyMatrix4(camera.matrixWorldInverse).z;
          const endDepth = -endWorld.clone().applyMatrix4(camera.matrixWorldInverse).z;
          if (Math.max(startDepth, endDepth) >= camera.near
            && Math.min(startDepth, endDepth) < Math.min(camera.far, controls.fogEndWU)) {
            // A near-plane crossing cannot safely certify projected clearance.
            // Otherwise perspective maps this entire physical line to a line.
            const start = startWorld.clone().project(camera);
            const end = endWorld.clone().project(camera);
            const normalOffset = pointIndex * 2;
            const sweepNormal = new THREE.Vector3(...decodeAboutSurfelNormal(
              decoded.normalOct[normalOffset], decoded.normalOct[normalOffset + 1],
            )).applyMatrix3(normalMatrix).normalize();
            const radiusAt = (position) => {
              const view = position.clone().applyMatrix4(camera.matrixWorldInverse);
              return resolveAboutSurfelRadiusPx({
                radiusWU: decoded.radii[pointIndex], cameraDepthWU: -view.z,
                projectionScalePx: renderState.projectionScalePx,
                surfaceFacing: sweepNormal.dot(view.multiplyScalar(-1).normalize()),
                lodRank: decoded.lodRanks[pointIndex], featureClass: decoded.featureClasses[pointIndex],
                preserve: decoded.preserveFlags[pointIndex] >= 0.5, revealProgress: 1,
                detailBiasScale: model.material?.detailBiasScale ?? 1,
              }, controls);
            };
            const middle = startWorld.clone();
            middle.y += amplitude * 0.5;
            const radiusPx = Math.max(radiusAt(startWorld), radiusAt(middle), radiusAt(endWorld));
            const crossesNearPlane = Math.min(startDepth, endDepth) <= camera.near;
            const startNdc = [start.x, start.y], endNdc = [end.x, end.y];
            // Most terminal points are below the lockup. Reject them against
            // its union before checking every measured title/action line.
            if (crossesNearPlane || aboutSurfelSweepIntersectsRect(startNdc, endNdc, radiusPx,
              renderState.widthPx, renderState.heightPx, protectedNdcBounds)) {
              renderState.protectedNdcRegions.forEach((bounds, index) => {
                if (crossesNearPlane || aboutSurfelSweepIntersectsRect(startNdc, endNdc, radiusPx,
                  renderState.widthPx, renderState.heightPx, bounds)) {
                  terminalSweptProtectedRegionVisibleCounts[index] += 1;
                }
              });
            }
          }
        }
        const region = (point.x - travelXWU[0]) / (travelXWU[1] - travelXWU[0]);
        const time = ((phase - region * responseDelaySeconds) % periodSeconds + periodSeconds) % periodSeconds;
        const pulse = Math.sin(Math.PI * Math.min(1, time / pulseDurationSeconds));
        point.y += amplitude * pulse * pulse;
      } else if (renderState && controls.motionAmountWU > 0) {
        const time = renderState.motionTime;
        const groupPhase = decoded.motionGroups[pointIndex] * 2.39996323 * controls.motionCoherence;
        const pointPhase = (point.x * 0.62 + point.y * 0.94 + point.z * 1.18) / controls.motionScaleWU
          + decoded.revealRanks[pointIndex] / 65535 * 5.3 + decoded.lodRanks[pointIndex] * 9.7;
        const individual = 0.12 + 0.16 * (1 - controls.motionCoherence);
        point.x += controls.motionAmountWU * (Math.sin(time * 0.71 + groupPhase) * 0.6
          + Math.sin(time * 0.53 + pointPhase) * individual);
        point.y += controls.motionAmountWU * (Math.cos(time * 0.83 + groupPhase * 1.31) * 0.8
          + Math.cos(time * 0.61 + pointPhase * 0.79) * individual);
        point.z += controls.motionAmountWU * (Math.sin(time * 0.47 + groupPhase * 0.73) * 0.4
          + Math.sin(time * 0.43 + pointPhase * 1.17) * individual);
      }
      const viewPoint = point.clone().applyMatrix4(camera.matrixWorldInverse);
      const rawCameraDepth = -viewPoint.z;
      const inFront = rawCameraDepth > 0.0001;
      const cameraDepth = Math.max(0.0001, rawCameraDepth);
      const fogAmount = smoothstep(
        controls.fogStartWU,
        controls.fogEndWU,
        cameraDepth + fogVolumeOffsetWU,
      );
      const fogVisibility = 1 - Math.pow(fogAmount, Math.max(0.05, controls.fogCurve));
      minimumFogVisibility = Math.min(minimumFogVisibility, fogVisibility);
      const normalizedRevealRank = decoded.revealRanks[pointIndex] / 65535;
      const fogRevealRank = Math.min(
        normalizedRevealRank * manifestationSpread,
        Math.max(0, manifestationSpread - 0.001),
      );
      const revealed = inFront
        && fogVisibility > fogRevealRank
        && stageVisibility > 0;
      const projected = point.project(camera);
      minX = Math.min(minX, projected.x);
      maxX = Math.max(maxX, projected.x);
      minY = Math.min(minY, projected.y);
      maxY = Math.max(maxY, projected.y);
      const framed = inFront && projected.x >= -1 && projected.x <= 1
        && projected.y >= -1 && projected.y <= 1;
      if (revealed) visibleCount += 1;
      if (revealed && framed) {
        framedVisibleCount += 1;
        if (projected.x < 0) framedLeftCount += 1;
        else framedRightCount += 1;
      }
      if (revealed && framed
        && projected.x >= protectedBounds.minX
        && projected.x <= protectedBounds.maxX
        && projected.y >= protectedBounds.minY
        && projected.y <= protectedBounds.maxY) {
        protectedCenterVisibleCount += 1;
      }
      if (revealed
        && projected.x + radiusNdcX >= protectedBounds.minX
        && projected.x - radiusNdcX <= protectedBounds.maxX
        && projected.y + radiusNdcY >= protectedBounds.minY
        && projected.y - radiusNdcY <= protectedBounds.maxY) protectedEnvelopeVisibleCount += 1;
      if (renderState && rawCameraDepth >= camera.near && rawCameraDepth <= camera.far) {
        const revealVisibility = Math.min(stageVisibility, fogVisibility, renderState.revealVisibility);
        let revealProgress = smoothstep(
          fogRevealRank,
          Math.min(1, fogRevealRank + 0.08),
          revealVisibility,
        );
        if (reducedMotion) revealProgress = revealProgress >= 0.001 ? 1 : 0;
        revealProgress *= renderState.presentationScale;
        const normalOffset = pointIndex * 2;
        const normal = new THREE.Vector3(...decodeAboutSurfelNormal(
          decoded.normalOct[normalOffset], decoded.normalOct[normalOffset + 1],
        )).applyMatrix3(normalMatrix).normalize();
        const surfaceFacing = normal.dot(viewPoint.multiplyScalar(-1).normalize());
        const renderedRadiusPx = resolveAboutSurfelRadiusPx({
          radiusWU: decoded.radii[pointIndex], cameraDepthWU: rawCameraDepth,
          projectionScalePx: renderState.projectionScalePx, surfaceFacing,
          lodRank: decoded.lodRanks[pointIndex], featureClass: decoded.featureClasses[pointIndex],
          preserve: decoded.preserveFlags[pointIndex] >= 0.5, revealProgress,
          detailBiasScale: model.material?.detailBiasScale ?? 1,
        }, controls);
        if (renderedRadiusPx > 0 && framed) {
          renderedVisibleCount += 1;
          nearestFramedDepthWU = Math.min(nearestFramedDepthWU, rawCameraDepth);
          farthestFramedDepthWU = Math.max(farthestFramedDepthWU, rawCameraDepth);
          const column = Math.min(11, Math.floor((projected.x + 1) * 6));
          const row = Math.min(11, Math.floor((projected.y + 1) * 6));
          const bin = row * 12 + column;
          if (occupancy[bin] < 65535) occupancy[bin] += 1;
          const recoveryRow = Math.min(7, Math.floor((projected.y + 1) * 4));
          const recoveryBin = recoveryRow * 12 + column;
          if (recoveryOccupancy[recoveryBin] < 65535) recoveryOccupancy[recoveryBin] += 1;
          const recoveryHorizontalBand = projected.x < -0.6 ? 0 : projected.x > 0.6 ? 2 : 1;
          recoveryHorizontalBandCounts[recoveryHorizontalBand] += 1;
          if (recoveryHorizontalBand === 1) {
            recoveryCentralVerticalBandCounts[Math.min(2, Math.floor((projected.y + 1) * 1.5))] += 1;
          }
          const recoveryFogSpanWU = Math.max(0.001, controls.fogEndWU - controls.fogStartWU);
          const recoveryNearCutWU = controls.fogStartWU + recoveryFogSpanWU * 0.2;
          const recoveryMiddleCutWU = controls.fogStartWU + recoveryFogSpanWU * 0.55;
          const recoveryDepthBand = rawCameraDepth < recoveryNearCutWU
            ? 0 : rawCameraDepth < recoveryMiddleCutWU ? 1 : 2;
          recoveryDepthPopulationCounts[recoveryDepthBand] += 1;
          recoveryRenderedDepths.push(rawCameraDepth);
          const side = projected.x < 0 ? 0 : 1;
          if (projected.x < protectedBounds.minX || projected.x > protectedBounds.maxX) {
            readingOccupancy[bin] += 1;
            readingDepths[side].push(rawCameraDepth);
          }
          const belowLockup = projected.y < protectedBounds.minY;
          if (belowLockup) {
            groundOccupancy[bin] += 1;
            groundDepths[side].push(rawCameraDepth);
          }
          // Edge coverage measures the painted disk, not only its centre.
          const leftEdge = aboutSurfelIntersectsRect(projected.x, projected.y, renderedRadiusPx,
            renderState.widthPx, renderState.heightPx,
            { minX: -1, maxX: -0.96, minY: -1, maxY: 1 });
          const rightEdge = aboutSurfelIntersectsRect(projected.x, projected.y, renderedRadiusPx,
            renderState.widthPx, renderState.heightPx,
            { minX: 0.96, maxX: 1, minY: -1, maxY: 1 });
          if (leftEdge) leftEdgeRows[row] += 1;
          if (rightEdge) rightEdgeRows[row] += 1;
          if (belowLockup && leftEdge) groundEdgeRows[0][row] += 1;
          if (belowLockup && rightEdge) groundEdgeRows[1][row] += 1;
          const sideDepth = depthBySide[projected.x < 0 ? 0 : 1];
          sideDepth[0] = Math.min(sideDepth[0], rawCameraDepth);
          sideDepth[1] = Math.max(sideDepth[1], rawCameraDepth);
        }
        if (aboutSurfelIntersectsRect(projected.x, projected.y, renderedRadiusPx,
          renderState.widthPx, renderState.heightPx, protectedBounds)) protectedRenderedVisibleCount += 1;
        if (renderedRadiusPx > 0) {
          renderState.protectedNdcRegions.forEach((bounds, index) => {
            if (aboutSurfelIntersectsRect(projected.x, projected.y, renderedRadiusPx,
              renderState.widthPx, renderState.heightPx, bounds)) protectedRegionVisibleCounts[index] += 1;
          });
        }
      }
    });
    let occupiedBinCount = 0;
    let leftOccupiedBinCount = 0;
    let rightOccupiedBinCount = 0;
    let rowMask = 0;
    let columnMask = 0;
    for (let bin = 0; bin < occupancy.length; bin += 1) {
      if (occupancy[bin] < 3) continue;
      const column = bin % 12;
      occupiedBinCount += 1;
      if (column < 6) leftOccupiedBinCount += 1;
      else rightOccupiedBinCount += 1;
      rowMask |= 1 << Math.floor(bin / 12);
      columnMask |= 1 << column;
    }
    let occupiedRowCount = 0;
    let occupiedColumnCount = 0;
    let leftOccupiedColumnCount = 0;
    let rightOccupiedColumnCount = 0;
    let fullWidthRowCount = 0;
    for (let index = 0; index < 12; index += 1) {
      if (occupancy.subarray(index * 12, index * 12 + 12).every((count) => count >= 3)) fullWidthRowCount += 1;
      if (rowMask & (1 << index)) occupiedRowCount += 1;
      if (!(columnMask & (1 << index))) continue;
      occupiedColumnCount += 1;
      if (index < 6) leftOccupiedColumnCount += 1;
      else rightOccupiedColumnCount += 1;
    }
    const pointCount = pointIndices.length;
    const readingSides = [0, 1].map((side) => {
      const columns = new Uint8Array(6);
      let rows = 0, bins = 0;
      for (let row = 0; row < 12; row += 1) {
        let occupied = false;
        for (let column = 0; column < 6; column += 1) {
          if (readingOccupancy[row * 12 + side * 6 + column] < 3) continue;
          occupied = true; bins += 1; columns[column] += 1;
        }
        if (occupied) rows += 1;
      }
      return { rows, bins, secondaryColumnRows: [...columns].sort((a, b) => b - a)[1] };
    });
    let groundFullWidthRowCount = 0, groundOuterEdgeFullWidthRowCount = 0;
    for (let row = 0; row < 12; row += 1) {
      if (!groundOccupancy.subarray(row * 12, row * 12 + 12).every((count) => count >= 3)) continue;
      groundFullWidthRowCount += 1;
      if (groundEdgeRows[0][row] && groundEdgeRows[1][row]) groundOuterEdgeFullWidthRowCount += 1;
    }
    const populatedDepthSpan = (depths) => {
      if (depths.length < 3) return 0;
      depths.sort((a, b) => a - b);
      return depths[Math.floor((depths.length - 1) * 0.9)] - depths[Math.floor((depths.length - 1) * 0.1)];
    };
    recoveryRenderedDepths.sort((a, b) => a - b);
    const recoveryDepthLowWU = recoveryRenderedDepths.length
      ? recoveryRenderedDepths[Math.floor((recoveryRenderedDepths.length - 1) * 0.05)]
      : 0;
    const recoveryDepthHighWU = recoveryRenderedDepths.length
      ? recoveryRenderedDepths[Math.floor((recoveryRenderedDepths.length - 1) * 0.95)]
      : 0;
    const recoveryAdaptiveDepthSpanWU = Math.max(0, recoveryDepthHighWU - recoveryDepthLowWU);
    const recoveryAdaptiveDepthCutsWU = [
      recoveryDepthLowWU + recoveryAdaptiveDepthSpanWU / 3,
      recoveryDepthLowWU + recoveryAdaptiveDepthSpanWU * 2 / 3,
    ];
    const recoveryAdaptiveDepthPopulationCounts = [0, 0, 0];
    recoveryRenderedDepths.forEach((depthWU) => {
      const band = depthWU < recoveryAdaptiveDepthCutsWU[0]
        ? 0 : depthWU < recoveryAdaptiveDepthCutsWU[1] ? 1 : 2;
      recoveryAdaptiveDepthPopulationCounts[band] += 1;
    });
    return [model.key, Object.freeze({
      fullyFramed: minX >= -1 && maxX <= 1 && minY >= -1 && maxY <= 1,
      ndcBounds: Object.freeze({ minX, maxX, minY, maxY }),
      minimumFogVisibility,
      fullyRevealedByFog: minimumFogVisibility >= FULL_SURFEL_REVEAL_VISIBILITY,
      stageVisibility,
      visibilityWindow,
      pointCount,
      visibleCount,
      framedVisibleCount,
      framedLeftCount,
      framedRightCount,
      protectedCenterVisibleCount,
      protectedEnvelopeVisibleCount,
      protectedRenderedVisibleCount,
      terminalSweptProtectedRegionVisibleCounts,
      renderedVisibleCount,
      framedDepthSpanWU: renderedVisibleCount ? farthestFramedDepthWU - nearestFramedDepthWU : 0,
      framedLeftDepthSpanWU: Number.isFinite(depthBySide[0][0]) ? depthBySide[0][1] - depthBySide[0][0] : 0,
      framedRightDepthSpanWU: Number.isFinite(depthBySide[1][0]) ? depthBySide[1][1] - depthBySide[1][0] : 0,
      fullWidthRowCount,
      readingLeftOccupiedRowCount: readingSides[0].rows,
      readingRightOccupiedRowCount: readingSides[1].rows,
      readingLeftOccupiedBinCount: readingSides[0].bins,
      readingRightOccupiedBinCount: readingSides[1].bins,
      readingLeftSecondaryColumnRows: readingSides[0].secondaryColumnRows,
      readingRightSecondaryColumnRows: readingSides[1].secondaryColumnRows,
      readingLeftPopulatedDepthWU: populatedDepthSpan(readingDepths[0]),
      readingRightPopulatedDepthWU: populatedDepthSpan(readingDepths[1]),
      groundFullWidthRowCount,
      groundOuterEdgeFullWidthRowCount,
      groundLeftPopulatedDepthWU: populatedDepthSpan(groundDepths[0]),
      groundRightPopulatedDepthWU: populatedDepthSpan(groundDepths[1]),
      // A 2% edge strip has 24% of a normal grid cell's area. One painted
      // circle is the area-equivalent threshold to three in an 8.33% cell.
      leftEdgeOccupiedRowCount: leftEdgeRows.filter((count) => count >= 1).length,
      rightEdgeOccupiedRowCount: rightEdgeRows.filter((count) => count >= 1).length,
      protectedRegionVisibleCounts,
      occupiedBinCount,
      recoveryOccupancy12x8: Object.freeze(Array.from(recoveryOccupancy)),
      recoveryHorizontalBandCounts: Object.freeze(Array.from(recoveryHorizontalBandCounts)),
      recoveryCentralVerticalBandCounts: Object.freeze(Array.from(recoveryCentralVerticalBandCounts)),
      recoveryDepthPopulationCounts: Object.freeze(Array.from(recoveryDepthPopulationCounts)),
      recoveryDepthCutsWU: Object.freeze([
        controls.fogStartWU + (controls.fogEndWU - controls.fogStartWU) * 0.2,
        controls.fogStartWU + (controls.fogEndWU - controls.fogStartWU) * 0.55,
      ]),
      recoveryAdaptiveDepthPopulationCounts: Object.freeze(recoveryAdaptiveDepthPopulationCounts),
      recoveryAdaptiveDepthCutsWU: Object.freeze(recoveryAdaptiveDepthCutsWU),
      recoveryAdaptiveDepthSpanWU,
      occupiedRowCount,
      occupiedColumnCount,
      leftOccupiedColumnCount,
      rightOccupiedColumnCount,
      leftOccupiedBinCount,
      rightOccupiedBinCount,
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
  assetRoot = DEFAULT_ASSET_ROOT,
} = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('Blender point scenes need a canvas.');
  if (!(root instanceof HTMLElement)) throw new TypeError('Blender point scenes need a route root.');

  const resolvedAssetRoot = String(assetRoot || DEFAULT_ASSET_ROOT).replace(/\/+$/u, '');
  const resolveAssetUrl = (name) => (
    `${resolvedAssetRoot}/${String(name || '').replace(/^\/+/, '')}`
  );

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
  const cameraAuthoredPosition = new THREE.Vector3();
  const cameraAuthoredQuaternion = new THREE.Quaternion();
  const cameraTargetQuaternion = new THREE.Quaternion();
  const cameraBasePosition = new THREE.Vector3();
  const cameraForward = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const cameraUp = new THREE.Vector3();
  const cameraLookTarget = new THREE.Vector3();
  const cameraLookMatrix = new THREE.Matrix4();
  const continuityNormalMatrix = new THREE.Matrix3();
  const continuityPoint = new THREE.Vector3();
  const continuityViewPoint = new THREE.Vector3();
  const continuityProjectedPoint = new THREE.Vector3();
  const continuityNormal = new THREE.Vector3();
  const pointerPanController = createAboutNarrativeCameraPointerPanController({
    initialNowMs: performance.now(),
  });
  const pointerPanSample = createAboutNarrativeCameraPointerPanSample();
  const steadycamController = createAboutNarrativeCameraSteadycamController({
    initialNowMs: performance.now(),
  });
  const steadycamSample = createAboutNarrativeCameraSteadycamSample();
  const steadycamAuthoredPosition = [0, 0, 0];
  const steadycamAuthoredQuaternion = [0, 0, 0, 1];
  const journeySample = createAboutNarrativeJourneySample();
  const finePointerQuery = window.matchMedia('(pointer: fine)');
  const uniforms = createUniforms();
  const listeners = new Set();
  const abortController = new AbortController();
  let activeAbortController = abortController;
  let state = 'loading';
  let errorMessage = '';
  let meta = null;
  let cameraTrack = null;
  let bundleIntegrityVerified = false;
  let sceneContractStatus = 'pending';
  let sceneContractDiagnostics = EMPTY_DIAGNOSTICS;
  let resolvedJourneyMap = null;
  let resolvedStoryJourneyMap = null;
  let resolvedJourneyCameraTrack = null;
  let resolvedJourneyMeta = null;
  let resolvedModelVisibilityWindows = EMPTY_VISIBILITY_WINDOWS;
  let readyAnnounced = false;
  let editorialFallbackAnnounced = false;
  let surfelGeometries = [];
  let surfelCoreMaterial = null;
  let surfelSoftMaterial = null;
  let modelRenderBatches = [];
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
  let stageRadiusCoupledToVisibility = false;
  let cameraRollDegrees = 0;
  let lastCameraProgress = null;
  let lastCameraLocked = null;
  let motionTime = 0;
  let terminalStudy = null;
  let bufferBuilds = 0;
  let authoredCameraFog = Object.freeze({ startWU: 14, endWU: 150, curve: 1.2 });
  const controls = writeAboutSceneLook({}, null, entranceScale);
  let paletteId = '';
  let paletteGeneration = 0;
  let paletteUniformUpdates = 0;

  const notify = () => listeners.forEach((listener) => listener());
  const setState = (nextState, nextError = '') => {
    if (state === nextState && errorMessage === nextError
      && root.dataset.pointWorldState === nextState) return;
    state = nextState;
    errorMessage = nextError;
    root.dataset.pointWorldState = nextState;
    if (nextError) root.dataset.worldError = nextError;
    else delete root.dataset.worldError;
    notify();
  };

  const setSceneContract = (status, diagnostics = EMPTY_DIAGNOSTICS) => {
    sceneContractStatus = status;
    sceneContractDiagnostics = diagnostics;
    root.dataset.sceneContractStatus = status;
    root.dataset.aboutJourneyCertifiable = status === 'compatible' ? 'true' : 'false';
  };

  const resetPresentation = ({ clear = false } = {}) => {
    readyAnnounced = false;
    activeCount = 0;
    drawCalls = 0;
    delete root.dataset.pointAsset;
    delete root.dataset.worldStage;
    delete root.dataset.aboutSceneReady;
    if (clear && contextAvailable && !disposed) renderer.clear();
  };

  const rejectScene = (diagnostics, message) => {
    if (disposed) return;
    const firstRejection = sceneContractStatus !== 'incompatible' || state !== 'unavailable';
    setSceneContract('incompatible', diagnostics);
    resolvedJourneyMap = null;
    resolvedModelVisibilityWindows = EMPTY_VISIBILITY_WINDOWS;
    sampleAboutNarrativeJourneyMapInto(null, latestFrame?.storyWU, journeySample);
    root.dataset.aboutCameraLocked = 'false';
    if (firstRejection) resetPresentation({ clear: true });
    setState('unavailable', message);
    // A diagnostic subscriber may have started an explicit retry synchronously.
    if (disposed || state !== 'unavailable' || sceneContractStatus !== 'incompatible') return;
    if (!editorialFallbackAnnounced) {
      editorialFallbackAnnounced = true;
      root.dataset.aboutSceneReady = 'true';
      // Release editorial boot readiness only. The world-runtime-ready event
      // would schedule another preparation attempt and mislabel this failure.
      window.dispatchEvent(new CustomEvent('abs:about-scene-ready'));
    }
  };

  const markReady = () => {
    if (readyAnnounced || disposed || !contextAvailable || !bundleIntegrityVerified
      || sceneContractStatus !== 'compatible') return;
    readyAnnounced = true;
    editorialFallbackAnnounced = false;
    root.dataset.pointAsset = 'blender-surfel-v2';
    root.dataset.aboutSceneReady = 'true';
    root.dataset.worldStage = 'blender-surfel-scene';
    setState('ready');
    if (disposed || state !== 'ready') return;
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
    pointerPanController.setViewport(rect.left, rect.top, rect.width, rect.height);
  };

  const disposeDecodedScene = () => {
    modelRenderBatches.forEach(({ core, soft }) => sceneGroup.remove(core, soft));
    surfelGeometries.forEach((geometry) => geometry.dispose());
    surfelCoreMaterial?.dispose();
    surfelSoftMaterial?.dispose();
    modelRenderBatches = [];
    surfelGeometries = [];
    surfelCoreMaterial = null;
    surfelSoftMaterial = null;
    attributeIdentities = null;
    decoded = null;
    meta = null;
    authoredCameraFog = Object.freeze({ startWU: 14, endWU: 150, curve: 1.2 });
    cameraTrack = null;
    resolvedJourneyMap = null;
    resolvedStoryJourneyMap = null;
    resolvedJourneyCameraTrack = null;
    resolvedJourneyMeta = null;
    resolvedModelVisibilityWindows = EMPTY_VISIBILITY_WINDOWS;
    lastCameraProgress = null;
    lastCameraLocked = null;
    activeCount = 0;
    drawCalls = 0;
  };

  const installDecodedScene = ({ nextMeta, nextCameraTrack, nextDecoded }) => {
    if (disposed) return;
    meta = nextMeta;
    const sourceFog = meta.source.authoring?.cameraFog;
    authoredCameraFog = sourceFog ? Object.freeze({
      startWU: Number(sourceFog.startWU),
      endWU: Number(sourceFog.endWU),
      curve: Number(sourceFog.curve),
    }) : authoredCameraFog;
    for (const material of uniforms.uModelMaterials.value) material.set(-1, -1, 1, 1);
    for (const [index, model] of meta.models.entries()) {
      if (!model.material) continue;
      const groups = meta.motionGroups.filter((entry) => entry.key === model.motionKey
        || entry.key.startsWith(`${model.motionKey}.`)).map((entry) => entry.id);
      uniforms.uModelMaterials.value[index].set(Math.min(...groups), Math.max(...groups),
        model.material.manifestationSpreadScale, model.material.detailBiasScale);
    }
    terminalStudy = meta.terminalResponse || (RUNTIME_DIAGNOSTICS_ENABLED
      && meta.terminalStudy?.schema === 'about-terminal-study/v1'
      ? meta.terminalStudy : null);
    uniforms.uTerminalMotionGroups.value.set(-1, -1);
    if (terminalStudy) {
      const model = meta.models.find((entry) => entry.key === terminalStudy.modelKey);
      const groups = meta.motionGroups.filter((entry) => entry.key === model?.motionKey
        || entry.key.startsWith(`${model?.motionKey}.`)).map((entry) => entry.id);
      if (groups.length) {
        uniforms.uTerminalMotionGroups.value.set(Math.min(...groups), Math.max(...groups));
        uniforms.uTerminalTravelXWU.value.fromArray(terminalStudy.travelXWU);
        uniforms.uTerminalPeriod.value = terminalStudy.periodSeconds;
        uniforms.uTerminalDelay.value = terminalStudy.responseDelaySeconds ?? 2.6;
        uniforms.uTerminalPulseDuration.value = terminalStudy.pulseDurationSeconds ?? 2;
      }
    }
    cameraTrack = nextCameraTrack;
    resolvedJourneyMap = null;
    resolvedStoryJourneyMap = null;
    resolvedJourneyCameraTrack = null;
    resolvedJourneyMeta = null;
    decoded = nextDecoded;
    surfelGeometries = decoded.modelRanges.map((range) => createSurfelGeometry(decoded, range));
    resolvedModelVisibilityWindows = EMPTY_VISIBILITY_WINDOWS;
    surfelCoreMaterial = createSurfelMaterial(uniforms, { depthCore: true });
    surfelSoftMaterial = createSurfelMaterial(uniforms);
    surfelCoreMaterial.depthFunc = THREE.LessEqualDepth;
    surfelSoftMaterial.depthFunc = THREE.LessEqualDepth;
    modelRenderBatches = surfelGeometries.map((geometry, modelId) => {
      const core = new THREE.Mesh(geometry, surfelCoreMaterial);
      const soft = new THREE.Mesh(geometry, surfelSoftMaterial);
      core.frustumCulled = false;
      soft.frustumCulled = false;
      core.renderOrder = modelId * 2;
      soft.renderOrder = modelId * 2 + 1;
      core.visible = false;
      soft.visible = false;
      sceneGroup.add(core, soft);
      return Object.freeze({ modelId, geometry, core, soft, count: decoded.modelRanges[modelId].count });
    });
    attributeIdentities = stableAttributeIdentities(surfelGeometries);
    bufferBuilds += 1;
    resize();
    // Loading remains pending until an actual frame supplies a compatible map.
    if (latestFrame) render(latestFrame);
  };

  const load = (controller = activeAbortController, explicitRetry = false) => {
    if (disposed || decoded || (state === 'unavailable' && !explicitRetry)) {
      return loadPromise || Promise.resolve();
    }
    if (loadPromise) return loadPromise;
    const ownsLoad = () => !disposed && !controller.signal.aborted
      && activeAbortController === controller;
    bundleIntegrityVerified = false;
    root.dataset.bundleIntegrityVerified = 'false';
    editorialFallbackAnnounced = false;
    setSceneContract('pending');
    resetPresentation();
    // Register the promise before notifying subscribers. A preparation callback
    // cannot start a second load during a synchronous loading-state notification.
    const attempt = Promise.resolve().then(async () => {
      if (!ownsLoad()) return;
      const nextMeta = await fetchJson(resolveAssetUrl('meta.json'), controller.signal);
      if (!ownsLoad()) return;
      const [cameraTrackBytes, surfelBuffer] = await Promise.all([
        fetchBuffer(resolveAssetUrl(fileName(nextMeta?.files?.cameraTrack, 'camera-track.json')), controller.signal),
        fetchBuffer(resolveAssetUrl(fileName(nextMeta?.files?.surfels, 'surfels.bin')), controller.signal),
      ]);
      if (!ownsLoad()) return;
      const bundle = await validateAboutBlenderSceneBundle({
        meta: nextMeta,
        cameraTrackBytes,
        surfelBytes: surfelBuffer,
      });
      // Web Crypto is not abortable. A disposed or superseded load must not
      // install its verified-but-stale bytes after hashing completes.
      if (!ownsLoad()) return;
      if (bundle.status !== 'compatible') {
        rejectScene(bundle.diagnostics, bundle.diagnostics.map((item) => item.message).join(' '));
        return;
      }
      bundleIntegrityVerified = true;
      root.dataset.bundleIntegrityVerified = 'true';
      const nextDecoded = decodeV2Surfels(nextMeta, surfelBuffer, qualityTier);
      installDecodedScene({ nextMeta, nextCameraTrack: bundle.cameraTrack, nextDecoded });
    }).catch((error) => {
      if (!ownsLoad() || error?.name === 'AbortError') return;
      const message = loadErrorMessage(error);
      rejectScene(Object.freeze([Object.freeze({
        code: 'scene-load-failed', path: 'bundle', message,
      })]), message);
      console.warn('[About narrative] Blender surfel scene unavailable; editorial content remains visible.', error);
    }).finally(() => {
      if (loadPromise === attempt) loadPromise = null;
    });
    loadPromise = attempt;
    setState('loading');
    return attempt;
  };

  const applyFrame = (frame) => {
    if (
      (frame?.journeyMap ?? null) !== resolvedStoryJourneyMap
      || cameraTrack !== resolvedJourneyCameraTrack
      || meta !== resolvedJourneyMeta
    ) {
      resolvedStoryJourneyMap = frame?.journeyMap ?? null;
      resolvedJourneyCameraTrack = cameraTrack;
      resolvedJourneyMeta = meta;
      const contract = resolveAboutBlenderSceneContract({
        meta,
        cameraTrack,
        storyMap: resolvedStoryJourneyMap,
      });
      if (contract.status === 'incompatible') {
        rejectScene(contract.diagnostics, contract.diagnostics.map((item) => item.message).join(' '));
        return false;
      }
      if (contract.status === 'pending') {
        setSceneContract('pending', contract.diagnostics);
        resolvedJourneyMap = null;
        resolvedModelVisibilityWindows = EMPTY_VISIBILITY_WINDOWS;
        sampleAboutNarrativeJourneyMapInto(null, frame?.storyWU, journeySample);
        resetPresentation({ clear: readyAnnounced });
        setState('loading');
        return false;
      }
      resolvedJourneyMap = contract.journeyMap;
      resolvedModelVisibilityWindows = applyResolvedVisibilityWindows(
        decoded,
        contract.visibilityWindows,
        surfelGeometries,
      );
      setSceneContract('compatible', contract.diagnostics);
    }
    // Persist the gate on unchanged frames and all alternate render callers.
    if (!bundleIntegrityVerified || sceneContractStatus !== 'compatible') return false;
    sampleAboutNarrativeJourneyMapInto(
      resolvedJourneyMap,
      frame?.storyWU,
      journeySample,
      frame?.reducedMotion,
    );
    const progress = journeySample.valid
      ? journeySample.progress
      : (frame?.durationWU > 0 ? frame.storyWU / frame.durationWU : 0);
    const cameraLocked = journeySample.valid && journeySample.locked;
    writeAboutSceneLook(controls, frame, entranceScale, journeySample);
    controls.fogStartWU = authoredCameraFog.startWU;
    controls.fogEndWU = authoredCameraFog.endWU;
    controls.fogCurve = authoredCameraFog.curve;
    if (cameraTrack) {
      sampleCameraTrack(
        cameraTrack,
        progress,
        cameraAuthoredPosition,
        cameraAuthoredQuaternion,
        cameraTargetQuaternion,
      );
      steadycamAuthoredPosition[0] = cameraAuthoredPosition.x;
      steadycamAuthoredPosition[1] = cameraAuthoredPosition.y;
      steadycamAuthoredPosition[2] = cameraAuthoredPosition.z;
      steadycamAuthoredQuaternion[0] = cameraAuthoredQuaternion.x;
      steadycamAuthoredQuaternion[1] = cameraAuthoredQuaternion.y;
      steadycamAuthoredQuaternion[2] = cameraAuthoredQuaternion.z;
      steadycamAuthoredQuaternion[3] = cameraAuthoredQuaternion.w;
      steadycamController.configure(frame?.globals?.camera);
      const snapSteadycam = Boolean(
        frame?.reducedMotion
        || cameraLocked
        || document.hidden
        || lastCameraProgress == null
        || Math.abs(progress - lastCameraProgress) > 0.08
      );
      steadycamController.sampleInto(
        steadycamSample,
        steadycamAuthoredPosition,
        steadycamAuthoredQuaternion,
        performance.now(),
        snapSteadycam,
      );
      lastCameraProgress = progress;
      camera.position.set(
        steadycamSample.position[0],
        steadycamSample.position[1],
        steadycamSample.position[2],
      );
      camera.quaternion.set(
        steadycamSample.quaternion[0],
        steadycamSample.quaternion[1],
        steadycamSample.quaternion[2],
        steadycamSample.quaternion[3],
      ).normalize();
      cameraRollDegrees = sampleAuthoredRollDegrees(cameraTrack, progress);
      cameraBasePosition.copy(camera.position);
      cameraForward.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
      cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
      cameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
      pointerPanController.configure(frame?.globals?.camera);
      pointerPanController.sampleInto(
        pointerPanSample,
        performance.now(),
        Boolean(frame?.reducedMotion || cameraLocked),
        document.hidden,
        finePointerQuery.matches,
      );
      const lateralWU = Math.tan(THREE.MathUtils.degToRad(-pointerPanSample.yawDegrees))
        * POINTER_LOOK_DISTANCE_WU;
      const verticalWU = Math.tan(THREE.MathUtils.degToRad(pointerPanSample.pitchDegrees))
        * POINTER_LOOK_DISTANCE_WU * 0.35;
      camera.position
        .addScaledVector(cameraRight, lateralWU)
        .addScaledVector(cameraUp, verticalWU);
      cameraLookTarget.copy(cameraBasePosition)
        .addScaledVector(cameraForward, POINTER_LOOK_DISTANCE_WU);
      cameraLookMatrix.lookAt(camera.position, cameraLookTarget, cameraUp);
      camera.quaternion.setFromRotationMatrix(cameraLookMatrix);
    }
    if (lastCameraLocked !== cameraLocked) {
      lastCameraLocked = cameraLocked;
      root.dataset.aboutCameraLocked = cameraLocked ? 'true' : 'false';
    }
    // Every temporal shader frequency is an integer multiple of 0.01. This
    // shared period bounds GPU phase without changing any point's pose at wrap.
    const motionPeriod = Math.PI * 200;
    motionTime = ((Number(frame?.ambientTime ?? frame?.storyTime ?? 0) * controls.motionSpeed)
      % motionPeriod + motionPeriod) % motionPeriod;
    activeCount = 0;
    stageRadiusCoupledToVisibility = false;
    for (let modelId = 0; modelId < modelRenderBatches.length; modelId += 1) {
      const batch = modelRenderBatches[modelId];
      const window = resolvedModelVisibilityWindows[modelId] || meta.models[modelId];
      const stageVisibility = modelStageVisibility(
        window,
        journeySample.sceneStoryWU,
        Boolean(frame?.reducedMotion),
      );
      const active = stageVisibility > 0;
      // The current shader feeds fractional stage visibility into the local
      // reveal radius. Report coupling only while that path is active; settled
      // and binary reduced-motion frames are not radius-coupled.
      if (!frame?.reducedMotion && stageVisibility > 0 && stageVisibility < 1) {
        stageRadiusCoupledToVisibility = true;
      }
      batch.geometry.instanceCount = active ? batch.count : 0;
      batch.core.visible = active;
      batch.soft.visible = active;
      if (active) activeCount += batch.count;
    }
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
    uniforms.uManifestationSpread.value = controls.manifestationSpread;
    uniforms.uMotionTime.value = motionTime;
    uniforms.uMotionAmountWU.value = controls.motionAmountWU;
    uniforms.uMotionScaleWU.value = controls.motionScaleWU;
    uniforms.uMotionCoherence.value = controls.motionCoherence;
    uniforms.uStoryWU.value = journeySample.sceneStoryWU;
    uniforms.uReducedMotion.value = frame?.reducedMotion ? 1 : 0;
    if (terminalStudy) {
      const period = Math.max(1, Number(terminalStudy.periodSeconds) || 8);
      uniforms.uTerminalPhase.value = (Number(frame?.ambientTime) || 0) % period;
      uniforms.uTerminalAmplitudeWU.value = Math.min(4, Number(terminalStudy.amplitudeWU) || 0)
        * Math.min(1, controls.motionAmountWU / 0.15);
    }
    uniforms.uEdgeSoftness.value = controls.edgeSoftness;
    return true;
  };

  const render = (frame = latestFrame) => {
    if (frame) latestFrame = frame;
    if (disposed || !visible || !contextAvailable || !decoded || !latestFrame) return false;
    const startedAt = performance.now();
    if (!applyFrame(latestFrame)) return false;
    renderer.render(scene, camera);
    frameTimeMs = Math.max(0, performance.now() - startedAt);
    drawCalls = renderer.info.render.calls;
    if (!readyAnnounced) markReady();
    return true;
  };

  // Keep motion certification allocation-light. The full diagnostics snapshot
  // projects every point and is intentionally reserved for one-shot framing
  // checks; continuous Playwright sampling reads only this authored state.
  const getMotionSnapshot = () => Object.freeze({
    storyWU: Number(latestFrame?.storyWU) || 0,
    cameraDistanceWU: journeySample.cameraDistanceWU,
    cameraPosition: Object.freeze(camera.position.toArray()),
    cameraQuaternion: Object.freeze(camera.quaternion.toArray()),
    cameraLocked: Boolean(journeySample.locked),
    entranceScale,
    stageVisibilityByModel: Object.freeze(Object.fromEntries((meta?.models || []).map((model) => {
      const visibilityWindow = resolvedModelVisibilityWindows?.[model.id];
      return [model.key, modelStageVisibility(visibilityWindow ? {
        visibilityStartWU: visibilityWindow.startWU,
        visibilityEndWU: visibilityWindow.endWU,
        visibilityHandoffWU: visibilityWindow.handoffWU,
        entranceHandoffWU: visibilityWindow.entranceHandoffWU,
        exitHandoffWU: visibilityWindow.exitHandoffWU,
      } : model, uniforms.uStoryWU.value, Boolean(latestFrame?.reducedMotion))];
    }))),
    stageRadiusCoupledToVisibility,
  });

  const getContinuitySnapshot = () => {
    const occupancy = new Uint8Array(CONTINUITY_GRID_COLUMNS * CONTINUITY_GRID_ROWS);
    const modelOccupancy = {};
    const stageVisibilityByModel = {};
    const activeModelIds = [];
    const visibleModelIds = [];
    let sampledSurfelCount = 0;
    let sampledVisibleSurfelCount = 0;
    let visibleStageSurfelCount = 0;
    const canSample = sceneContractStatus === 'compatible' && state === 'ready'
      && Boolean(meta && decoded && latestFrame);

    if (canSample) {
      camera.updateMatrixWorld(true);
      continuityNormalMatrix.getNormalMatrix(camera.matrixWorldInverse);
      const reducedMotion = Boolean(latestFrame?.reducedMotion);
      const presentationScale = Math.min(
        controls.sceneVisibility,
        controls.entranceScale,
        controls.opacity,
      );
      for (const model of meta.models || []) {
        const visibilityWindow = resolvedModelVisibilityWindows?.[model.id];
        const stageVisibility = modelStageVisibility(visibilityWindow ? {
          visibilityStartWU: visibilityWindow.startWU,
          visibilityEndWU: visibilityWindow.endWU,
          visibilityHandoffWU: visibilityWindow.handoffWU,
          entranceHandoffWU: visibilityWindow.entranceHandoffWU,
          exitHandoffWU: visibilityWindow.exitHandoffWU,
        } : model, uniforms.uStoryWU.value, reducedMotion);
        stageVisibilityByModel[model.key] = stageVisibility;
        const windowStartWU = Number(visibilityWindow?.startWU ?? model.visibilityStartWU);
        const windowEndWU = Number(visibilityWindow?.endWU ?? model.visibilityEndWU);
        if (Number.isFinite(windowStartWU) && Number.isFinite(windowEndWU)
          && uniforms.uStoryWU.value >= windowStartWU
          && uniforms.uStoryWU.value < windowEndWU) activeModelIds.push(model.key);
        if (!(stageVisibility > 0)) continue;
        visibleStageSurfelCount += Number(decoded.perModelCounts?.[model.id]) || 0;
        const pointIndices = decoded.modelPointIndices[model.id] || [];
        const sampleCount = Math.min(CONTINUITY_SAMPLES_PER_ACTIVE_MODEL, pointIndices.length);
        const currentModelOccupancy = new Uint8Array(occupancy.length);
        let currentModelVisibleCount = 0;
        for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
          const pointIndex = pointIndices[Math.min(
            pointIndices.length - 1,
            Math.floor(sampleIndex * pointIndices.length / sampleCount),
          )];
          const positionOffset = pointIndex * 3;
          continuityPoint.set(
            decoded.positions[positionOffset],
            decoded.positions[positionOffset + 1],
            decoded.positions[positionOffset + 2],
          );
          const sourceX = continuityPoint.x;
          const sourceY = continuityPoint.y;
          const sourceZ = continuityPoint.z;
          if (terminalStudy && model.key === terminalStudy.modelKey) {
            const travelXWU = terminalStudy.travelXWU;
            const region = (continuityPoint.x - travelXWU[0])
              / Math.max(0.001, travelXWU[1] - travelXWU[0]);
            const period = Math.max(1, uniforms.uTerminalPeriod.value);
            const time = ((uniforms.uTerminalPhase.value - region * uniforms.uTerminalDelay.value)
              % period + period) % period;
            const pulse = Math.sin(Math.PI * Math.min(1, time / uniforms.uTerminalPulseDuration.value));
            continuityPoint.y += uniforms.uTerminalAmplitudeWU.value * pulse * pulse;
          } else if (controls.motionAmountWU > 0) {
            const groupPhase = decoded.motionGroups[pointIndex] * 2.39996323
              * controls.motionCoherence;
            const pointPhase = (sourceX * 0.62 + sourceY * 0.94 + sourceZ * 1.18)
              / controls.motionScaleWU + decoded.revealRanks[pointIndex] / 65535 * 5.3
              + decoded.lodRanks[pointIndex] * 9.7;
            const individual = 0.12 + 0.16 * (1 - controls.motionCoherence);
            continuityPoint.x += controls.motionAmountWU
              * (Math.sin(motionTime * 0.71 + groupPhase) * 0.6
                + Math.sin(motionTime * 0.53 + pointPhase) * individual);
            continuityPoint.y += controls.motionAmountWU
              * (Math.cos(motionTime * 0.83 + groupPhase * 1.31) * 0.8
                + Math.cos(motionTime * 0.61 + pointPhase * 0.79) * individual);
            continuityPoint.z += controls.motionAmountWU
              * (Math.sin(motionTime * 0.47 + groupPhase * 0.73) * 0.4
                + Math.sin(motionTime * 0.43 + pointPhase * 1.17) * individual);
          }
          continuityViewPoint.copy(continuityPoint).applyMatrix4(camera.matrixWorldInverse);
          const cameraDepthWU = -continuityViewPoint.z;
          if (cameraDepthWU < camera.near || cameraDepthWU > camera.far) continue;
          const fogSpanWU = Math.max(0.001, controls.fogEndWU - controls.fogStartWU);
          const fogVolumeField = Math.sin(sourceX * 0.031 + sourceY * 0.047 + sourceZ * 0.019
            + decoded.motionGroups[pointIndex] * 0.37);
          const fogAmount = smoothstep(
            controls.fogStartWU,
            controls.fogEndWU,
            cameraDepthWU + fogVolumeField * Math.min(3.5, fogSpanWU * 0.025),
          );
          const fogVisibility = 1 - Math.pow(fogAmount, Math.max(0.05, controls.fogCurve));
          const manifestationSpread = controls.manifestationSpread
            * (model.material?.manifestationSpreadScale ?? 1);
          const fogRevealRank = Math.min(
            decoded.revealRanks[pointIndex] / 65535 * manifestationSpread,
            Math.max(0, manifestationSpread - 0.001),
          );
          const revealVisibility = Math.min(
            stageVisibility,
            fogVisibility,
            controls.sceneVisibility,
            controls.opacity,
          );
          let revealProgress = smoothstep(
            fogRevealRank,
            Math.min(1, fogRevealRank + 0.08),
            revealVisibility,
          );
          if (reducedMotion) revealProgress = revealProgress >= 0.001 ? 1 : 0;
          revealProgress *= presentationScale;
          const normalOffset = pointIndex * 2;
          let normalX = Math.max(decoded.normalOct[normalOffset] / 32767, -1);
          let normalY = Math.max(decoded.normalOct[normalOffset + 1] / 32767, -1);
          const normalZ = 1 - Math.abs(normalX) - Math.abs(normalY);
          if (normalZ < 0) {
            const oldX = normalX;
            normalX = (1 - Math.abs(normalY)) * (normalX >= 0 ? 1 : -1);
            normalY = (1 - Math.abs(oldX)) * (normalY >= 0 ? 1 : -1);
          }
          continuityNormal.set(normalX, normalY, normalZ).normalize()
            .applyMatrix3(continuityNormalMatrix).normalize();
          const surfaceFacing = continuityNormal.dot(
            continuityViewPoint.multiplyScalar(-1).normalize(),
          );
          const renderedRadiusPx = resolveAboutSurfelRadiusPx({
            radiusWU: decoded.radii[pointIndex],
            cameraDepthWU,
            projectionScalePx: uniforms.uProjectionScalePx.value,
            surfaceFacing,
            lodRank: decoded.lodRanks[pointIndex],
            featureClass: decoded.featureClasses[pointIndex],
            preserve: decoded.preserveFlags[pointIndex] >= 0.5,
            revealProgress,
            detailBiasScale: model.material?.detailBiasScale ?? 1,
          }, controls);
          if (!(renderedRadiusPx > 0)) continue;
          continuityProjectedPoint.copy(continuityPoint).project(camera);
          if (continuityProjectedPoint.x < -1 || continuityProjectedPoint.x > 1
            || continuityProjectedPoint.y < -1 || continuityProjectedPoint.y > 1) continue;
          const column = Math.min(CONTINUITY_GRID_COLUMNS - 1, Math.floor(
            (continuityProjectedPoint.x + 1) * CONTINUITY_GRID_COLUMNS / 2,
          ));
          const row = Math.min(CONTINUITY_GRID_ROWS - 1, Math.floor(
            (continuityProjectedPoint.y + 1) * CONTINUITY_GRID_ROWS / 2,
          ));
          const bin = row * CONTINUITY_GRID_COLUMNS + column;
          occupancy[bin] = 1;
          currentModelOccupancy[bin] = 1;
          currentModelVisibleCount += 1;
        }
        sampledSurfelCount += sampleCount;
        sampledVisibleSurfelCount += currentModelVisibleCount;
        modelOccupancy[model.key] = Object.freeze(Array.from(currentModelOccupancy));
        if (currentModelVisibleCount > 0) visibleModelIds.push(model.key);
      }
    }

    const anchors = resolvedJourneyMap?.anchors || [];
    let fromCue = anchors[0] || null;
    let toCue = anchors.at(-1) || null;
    for (let index = 1; index < anchors.length; index += 1) {
      if (journeySample.progress <= anchors[index].journeyProgress) {
        fromCue = anchors[index - 1];
        toCue = anchors[index];
        break;
      }
    }
    const cueSpan = Math.max(0.000001,
      Number(toCue?.journeyProgress) - Number(fromCue?.journeyProgress));
    const cueProgress = fromCue && toCue ? Object.freeze({
      fromId: fromCue.id,
      fromCueName: fromCue.cueName,
      toId: toCue.id,
      toCueName: toCue.cueName,
      progress: clamp((journeySample.progress - fromCue.journeyProgress) / cueSpan, 0, 1),
    }) : null;
    return Object.freeze({
      state,
      adapterId: ADAPTER_ID,
      error: errorMessage,
      assetSourceHash: meta?.source?.sha256 || '',
      bundleIntegrityVerified,
      sceneContractStatus,
      sceneContractDiagnostics,
      modelIds: Object.freeze((meta?.models || []).map((model) => model.key)),
      residentSurfelCount: decoded?.count || 0,
      renderedSurfelCount: activeCount,
      visibleStageSurfelCount,
      sampledSurfelCount,
      sampledVisibleSurfelCount,
      occupancy12x8: Object.freeze(Array.from(occupancy)),
      occupiedBinCount: occupancy.reduce((sum, occupied) => sum + occupied, 0),
      modelOccupancy12x8: Object.freeze(modelOccupancy),
      activeStageIds: Object.freeze([...activeModelIds]),
      visibleStageIds: Object.freeze([...visibleModelIds]),
      activeModelIds: Object.freeze(activeModelIds),
      visibleModelIds: Object.freeze(visibleModelIds),
      stageVisibilityByModel: Object.freeze(stageVisibilityByModel),
      journeyProgress: journeySample.progress,
      cameraDistanceWU: journeySample.cameraDistanceWU,
      cueProgress,
      storyWU: Number(latestFrame?.storyWU) || 0,
    });
  };

  const getDiagnosticsSnapshot = ({ protectedNdcBounds = null, protectedNdcRegions = [], terminalSweep = false } = {}) => Object.freeze({
    state,
    adapterId: ADAPTER_ID,
    assetVersion: Number(meta?.version || 0),
    assetSchema: meta?.schema || '',
    assetSourceHash: meta?.source?.sha256 || '',
    bundleIntegrityVerified,
    sceneContractStatus,
    sceneContractDiagnostics,
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
      surfelGeometries.length && attributeIdentities
      && attributesStillStable(surfelGeometries, attributeIdentities)
    ),
    cameraRollDegrees,
    journeyProgress: journeySample.progress,
    cameraDistanceWU: journeySample.cameraDistanceWU,
    cameraPathLengthWU: resolvedJourneyMap?.pathLengthWU || 0,
    cameraDistancePerStoryWU: resolvedJourneyMap?.durationWU > 0
      ? resolvedJourneyMap.pathLengthWU / resolvedJourneyMap.durationWU : 0,
    journeyMapValid: journeySample.valid,
    journeyMapCertifiable: journeySample.certifiable,
    cameraLocked: journeySample.locked,
    atInvitation: journeySample.atInvitation,
    storyWU: Number(latestFrame?.storyWU) || 0,
    sceneStoryWU: uniforms.uStoryWU.value,
    ambientTime: Number(latestFrame?.ambientTime) || 0,
    motionTime,
    terminalResponse: terminalStudy ? {
      schema: terminalStudy.schema,
      periodSeconds: terminalStudy.periodSeconds,
      phase: uniforms.uTerminalPhase.value,
      amplitudeWU: uniforms.uTerminalAmplitudeWU.value,
      responseDelaySeconds: uniforms.uTerminalDelay.value,
      pulseDurationSeconds: uniforms.uTerminalPulseDuration.value,
    } : null,
    terminalStudy: terminalStudy?.schema === 'about-terminal-study/v1' ? {
      schema: terminalStudy.schema,
      periodSeconds: terminalStudy.periodSeconds,
      phase: uniforms.uTerminalPhase.value,
      amplitudeWU: uniforms.uTerminalAmplitudeWU.value,
    } : null,
    cameraPosition: Object.freeze(camera.position.toArray()),
    cameraQuaternion: Object.freeze(camera.quaternion.toArray()),
    steadycam: steadycamController.getSnapshot(steadycamSample),
    pointerPan: Object.freeze({ ...pointerPanSample }),
    stageVisibilityMode: latestFrame?.reducedMotion
      ? 'authored-settled-cuts' : 'authored-bounded-whole-surfel-handoff',
    stageRadiusCoupledToVisibility,
    reducedMotion: Boolean(latestFrame?.reducedMotion),
    resolvedVisibilityWindows: Object.freeze(resolvedModelVisibilityWindows),
    modelFraming: sceneContractStatus === 'compatible' && state === 'ready' ? modelFramingSnapshot(
      meta,
      camera,
      controls,
      decoded,
      uniforms.uStoryWU.value,
      protectedNdcBounds,
      resolvedModelVisibilityWindows,
      Boolean(latestFrame?.reducedMotion),
      terminalStudy ? {
        ...terminalStudy,
        phase: uniforms.uTerminalPhase.value,
        amplitude: uniforms.uTerminalAmplitudeWU.value,
        responseDelaySeconds: uniforms.uTerminalDelay.value,
        pulseDurationSeconds: uniforms.uTerminalPulseDuration.value,
      } : null,
      {
        motionTime, widthPx: width * pixelRatio, heightPx: height * pixelRatio,
        projectionScalePx: uniforms.uProjectionScalePx.value,
        revealVisibility: Math.min(uniforms.uSceneVisibility.value, uniforms.uOpacity.value),
        presentationScale: uniforms.uEntranceScale.value,
        protectedNdcRegions,
        terminalSweep,
      },
    ) : EMPTY_MODEL_FRAMING,
    pixelRatio,
    viewportWidth: width,
    viewportHeight: height,
    paletteId,
    paletteGeneration,
    paletteUniformUpdates,
    contextAvailable,
    visible,
    controls: Object.freeze({ ...controls }),
    error: errorMessage,
  });

  const getMetrics = (options) => Object.freeze({
    ...getDiagnosticsSnapshot(options),
    pointCount: activeCount,
    frameTimeMs,
    fixedAttributeIdentityStable: Boolean(
      surfelGeometries.length && attributeIdentities
      && attributesStillStable(surfelGeometries, attributeIdentities)
    ),
    bufferRebuilds: bufferBuilds,
    gpuBufferCount: surfelGeometries.reduce(
      (sum, geometry) => sum + Object.keys(geometry.attributes).length,
      0,
    ),
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
    loadPromise = null;
    disposeDecodedScene();
    return load(activeAbortController, true);
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
    if (sceneContractStatus === 'incompatible') return;
    resetPresentation();
    setState('context-lost');
  };
  const handleContextRestored = () => {
    if (disposed) return;
    contextAvailable = true;
    surfelGeometries.forEach((geometry) => {
      Object.values(geometry.attributes).forEach((attribute) => {
        attribute.needsUpdate = true;
      });
    });
    if (sceneContractStatus !== 'incompatible') setState('loading');
    resize();
    if (latestFrame) render(latestFrame);
  };
  const handlePointerMove = (event) => {
    pointerPanController.setPointerFromClient(
      event.clientX,
      event.clientY,
      event.pointerType,
      event.buttons,
    );
  };
  const handlePointerLeave = (event) => {
    pointerPanController.setPointerOutside(event.pointerType);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);
  resizeObserver.observe(canvas);
  canvas.addEventListener('webglcontextlost', handleContextLost);
  canvas.addEventListener('webglcontextrestored', handleContextRestored);
  root.addEventListener('pointermove', handlePointerMove, { passive: true });
  root.addEventListener('pointerleave', handlePointerLeave, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  const unsubscribePalette = subscribeSimulationPalette((snapshot) => {
    paletteId = snapshot.paletteId;
    paletteGeneration = Number(snapshot.generation) || 0;
    paletteUniformUpdates += 1;
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
      root.removeEventListener('pointermove', handlePointerMove);
      root.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('resize', resize);
      unsubscribePalette();
      listeners.clear();
      disposeDecodedScene();
      renderer.dispose();
      if (RUNTIME_DIAGNOSTICS_ENABLED && window.__aboutNarrativeRuntime === api) {
        delete window.__aboutNarrativeRuntime;
      }
      delete root.dataset.pointWorldState;
      delete root.dataset.pointAsset;
      delete root.dataset.worldStage;
      delete root.dataset.worldError;
      delete root.dataset.aboutCameraLocked;
      delete root.dataset.aboutJourneyCertifiable;
      delete root.dataset.bundleIntegrityVerified;
      delete root.dataset.sceneContractStatus;
      delete root.dataset.aboutSceneReady;
    },
    getDiagnosticsSnapshot,
    getContinuitySnapshot,
    getMotionSnapshot,
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
