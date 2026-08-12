import {
  applyAboutNarrativeCameraEasing,
  compileAboutNarrativeCameraEasing,
} from './aboutNarrativeCameraEasing.js';
import {
  slerpAboutNarrativeCameraQuaternionInto,
  writeAboutNarrativeCameraQuaternion,
  writeAboutNarrativeCameraTargetFromRotation,
} from './aboutNarrativeCameraRig.js';
import { getAboutNarrativeDisciplinePosition } from './aboutNarrativeDisciplinePositions.js';
import {
  createAboutNarrativePointFieldPreparationDescriptor,
} from './aboutNarrativePointFieldIdentity.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS,
} from './aboutNarrativePointFieldMotion.js';
import {
  compileAboutNarrativePointFieldRuntime,
  createAboutNarrativePointFieldFrameSample,
  sampleAboutNarrativePointFieldRuntimeInto,
} from './aboutNarrativePointFieldRuntime.js';
import {
  applyAboutNarrativePointFieldOverrides,
} from './aboutNarrativePointFieldSchema.js';
import {
  applyAboutNarrativeTrackEasing,
  isAboutNarrativeShortLandscape,
} from './aboutNarrativeMotionMath.js';
import {
  createAboutNarrativeProfileResolver,
  resolveAboutNarrativePointProfile,
} from './aboutNarrativeProfileResolver.js';
import { compileAboutNarrativeRenderSpans } from './aboutNarrativeRenderSpans.js';
import {
  sampleAboutNarrativeResponsiveWorldMaterialInto,
} from './aboutNarrativeResponsiveMaterial.js';
import {
  createAboutNarrativeTitleFieldSample,
  sampleAboutNarrativeTitleFieldInto,
} from './aboutNarrativeRuntimePlan.js';
import {
  ABOUT_NARRATIVE_EDITORIAL_ACTIVE_THRESHOLD,
  getAboutNarrativeEditorialFocusOpacity,
  getAboutNarrativeEditorialPhraseOpacity,
  getAboutNarrativeSharedRevealProgress,
} from './aboutNarrativeReveal.js';

const TIME_EPSILON = 0.000001;
const EMPTY_OPTIONS = Object.freeze({});
const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const smooth01 = (value) => {
  const progress = clamp01(value);
  return progress * progress * (3 - (2 * progress));
};

export { ABOUT_NARRATIVE_EDITORIAL_ACTIVE_THRESHOLD };

export function getAboutNarrativeComposerOpeningCueOpacity(scrollTop, viewportHeight) {
  const resolvedViewportHeight = Math.max(0, Number(viewportHeight) || 0);
  const fadeDistance = Math.min(72, Math.max(48, resolvedViewportHeight * 0.08));
  return 1 - smooth01((Number(scrollTop) || 0) / fadeDistance);
}

export function getAboutNarrativeComposerEditorialReveal(
  record,
  scrollWU,
  viewportHeight,
  viewportThreshold,
  reducedMotion,
) {
  const revealOffsetWU = Number(record.revealOffsetPx || 0) / Math.max(1, viewportHeight);
  const viewportY = Number(viewportThreshold)
    + revealOffsetWU
    - (Number(scrollWU) - Number(record.startScrollWU));
  const revealTravel = Math.max(0.001, Number(record.editorialMotion?.fadeDurationWU) || 0);
  const revealSoftnessWU = Math.max(
    0.001,
    Number(record.revealSoftnessPx || 0) / Math.max(1, viewportHeight),
  );
  const completionViewportY = Number(viewportThreshold) - revealTravel;
  return getAboutNarrativeSharedRevealProgress(
    viewportY,
    completionViewportY + revealSoftnessWU,
    revealSoftnessWU,
    reducedMotion,
  );
}

export function getAboutNarrativeComposerEditorialFocusOpacity(...args) {
  return getAboutNarrativeEditorialFocusOpacity(...args);
}

export function getAboutNarrativeComposerEditorialPhraseOpacity(...args) {
  return getAboutNarrativeEditorialPhraseOpacity(...args);
}

export function createAboutNarrativeComposerTitleSample() {
  return createAboutNarrativeTitleFieldSample();
}

export function sampleAboutNarrativeComposerTitleInto(field, storyWU, textMotion, reducedMotion, target) {
  return sampleAboutNarrativeTitleFieldInto(field, storyWU, textMotion, reducedMotion, target);
}

export function createAboutNarrativeComposerContextSample() {
  return { visible: false, titleOpacity: 0, ruleScale: 0, descriptionOpacity: 0, actionOpacity: 0, y: 16 };
}

export function sampleAboutNarrativeComposerContextInto(field, storyWU, reducedMotion, target) {
  const postTitleProgress = storyWU >= Number(field.focusWU)
    ? clamp01((storyWU - Number(field.focusWU)) / Math.max(0.000001, Number(field.endWU) - Number(field.focusWU)))
    : 0;
  target.visible = storyWU >= Number(field.startWU);
  target.titleOpacity = target.visible
    ? clamp01((storyWU - Number(field.startWU)) / Math.max(0.000001, Number(field.focusWU) - Number(field.startWU)))
    : 0;
  target.ruleScale = reducedMotion ? Number(target.visible) : smooth01(postTitleProgress / 0.24);
  target.descriptionOpacity = reducedMotion ? Number(target.visible) : smooth01((postTitleProgress - 0.24) / 0.46);
  target.actionOpacity = reducedMotion ? Number(target.visible) : smooth01((postTitleProgress - 0.7) / 0.3);
  target.y = (1 - target.descriptionOpacity) * 16;
  return target;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function findById(items, id, key = 'id') {
  for (let index = 0; index < items.length; index += 1) {
    if (items[index]?.[key] === id) return items[index];
  }
  return null;
}

function mergeLane(keys, overrides = {}) {
  return keys.map((key) => ({ ...clone(key), ...clone(overrides[key.id] || {}) }))
    .sort((left, right) => Number(left.atWU) - Number(right.atWU) || left.id.localeCompare(right.id));
}

function compileCamera(document, layoutProfile) {
  const camera = document.tracks.camera;
  const overrides = document.profiles[layoutProfile]?.overrides?.camera || {};
  return deepFreeze({
    moveKeys: mergeLane(camera.moveKeys, overrides).map((key) => ({
      ...key,
      easingCurve: compileAboutNarrativeCameraEasing(
        key.velocityMode === 'constant' ? 'linear' : key.easing,
      ),
    })),
    lookKeys: mergeLane(camera.lookKeys, overrides).map((key) => ({
      ...key,
      easingCurve: compileAboutNarrativeCameraEasing(key.easing),
      quaternion: writeAboutNarrativeCameraQuaternion([0, 0, 0, 1], key.rotation),
    })),
    lensKeys: mergeLane(camera.lensKeys, overrides).map((key) => ({
      ...key,
      easingCurve: compileAboutNarrativeCameraEasing(key.easing),
    })),
  });
}

function findKeyIndex(keys, storyWU) {
  let low = 0;
  let high = keys.length - 1;
  let result = 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (Number(keys[middle].atWU) <= storyWU) {
      result = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  return result;
}

function lanePair(keys, storyWU) {
  const fromIndex = findKeyIndex(keys, storyWU);
  return [keys[fromIndex], keys[Math.min(keys.length - 1, fromIndex + 1)]];
}

function laneProgress(from, to, storyWU, reducedMotion) {
  if (reducedMotion || from === to) return 0;
  const raw = (storyWU - Number(from.atWU))
    / Math.max(TIME_EPSILON, Number(to.atWU) - Number(from.atWU));
  return applyAboutNarrativeCameraEasing(from.easingCurve, clamp01(raw));
}

function sampleCameraInto(camera, storyWU, reducedMotion, target) {
  const [moveFrom, moveTo] = lanePair(camera.moveKeys, storyWU);
  const moveProgress = laneProgress(moveFrom, moveTo, storyWU, reducedMotion);
  for (let axis = 0; axis < 3; axis += 1) {
    target.position[axis] = Number(moveFrom.position[axis])
      + ((Number(moveTo.position[axis]) - Number(moveFrom.position[axis])) * moveProgress);
  }

  const [lookFrom, lookTo] = lanePair(camera.lookKeys, storyWU);
  const lookProgress = laneProgress(lookFrom, lookTo, storyWU, reducedMotion);
  slerpAboutNarrativeCameraQuaternionInto(
    target.quaternion,
    lookFrom.quaternion,
    lookTo.quaternion,
    lookProgress,
  );
  writeAboutNarrativeCameraTargetFromRotation(
    target.lookAtTarget,
    target.position,
    [
      Number(lookFrom.rotation[0]) + ((Number(lookTo.rotation[0]) - Number(lookFrom.rotation[0])) * lookProgress),
      Number(lookFrom.rotation[1]) + ((Number(lookTo.rotation[1]) - Number(lookFrom.rotation[1])) * lookProgress),
      Number(lookFrom.rotation[2]) + ((Number(lookTo.rotation[2]) - Number(lookFrom.rotation[2])) * lookProgress),
    ],
    1,
  );
  target.lookAtRoll = 0;
  target.aimWeight = 0;
  target.targeted = false;

  const [lensFrom, lensTo] = lanePair(camera.lensKeys, storyWU);
  const lensProgress = laneProgress(lensFrom, lensTo, storyWU, reducedMotion);
  target.fov = Number(lensFrom.fov)
    + ((Number(lensTo.fov) - Number(lensFrom.fov)) * lensProgress);
  return target;
}

function createProfileResolver(model, options) {
  return createAboutNarrativeProfileResolver({
    profiles: model.profiles,
    inlineSize: options.inlineSize,
    blockSize: options.blockSize,
    previewLayoutProfile: options.layoutProfile ?? options.previewLayoutProfile,
    prefersReducedMotion: options.prefersReducedMotion,
    previewMotionProfile: options.motionProfile ?? options.previewMotionProfile,
    previewReducedMotion: options.previewReducedMotion,
  });
}

function resolveLane(model, resolver, lane) {
  const overrides = model.profiles[resolver.layoutProfile]?.overrides?.[lane] || {};
  return mergeLane(model.tracks[lane].keys, overrides);
}

function resolveTextFields(model, resolver) {
  const overrides = model.profiles[resolver.layoutProfile]?.overrides?.text || {};
  return model.tracks.text.fields
    .map((field) => ({ ...clone(field), ...clone(overrides[field.id] || {}) }))
    .sort((left, right) => (
      Number(left.startWU) - Number(right.startWU)
      || Number(left.focusWU) - Number(right.focusWU)
      || left.id.localeCompare(right.id)
    ));
}

function rendererTransitionType(type) {
  return type === 'step-end' ? 'cut' : type || 'hold';
}

function createRendererWorlds(pointPlan) {
  const stateById = new Map(pointPlan.rendererStates.map((state) => [state.stateId, state]));
  const seenStateIds = new Set();
  const orderedStates = [];
  pointPlan.keys.forEach((key) => {
    const state = key.rendererState || stateById.get(key.stateId);
    if (!state || seenStateIds.has(state.stateId)) return;
    seenStateIds.add(state.stateId);
    orderedStates.push(state);
  });
  return orderedStates.map((state, index) => {
    const incoming = pointPlan.segments.find((segment) => (
      segment.toStateId === state.stateId
      && segment.fromStateId !== segment.toStateId
    ));
    return deepFreeze({
      ...state,
      startWU: incoming?.startWU ?? pointPlan.keys[0]?.atWU ?? 0,
      transitionIn: {
        startWU: incoming?.startWU ?? 0,
        endWU: incoming?.endWU ?? 0,
        type: index === 0 ? 'cut' : rendererTransitionType(incoming?.transition.type),
        easing: incoming?.transition.easing || 'linear',
        correspondence: incoming?.transition.correspondence || 'index-v1',
      },
    });
  });
}

function preparationVariant(layoutProfile, options) {
  if (layoutProfile === 'desktop') return 'standard';
  return isAboutNarrativeShortLandscape({
    layoutProfile,
    width: options.inlineSize,
    height: options.blockSize,
  }) ? 'mobile-short-landscape' : 'mobile-default';
}

function createRendererPreparation(pointPlan, pointField, pointProfile, options) {
  const variant = preparationVariant(pointPlan.layoutProfile, options);
  const identity = createAboutNarrativePointFieldPreparationDescriptor({
    pointField,
    pointProfile,
    preparationVariant: variant,
    globals: pointPlan.globals,
  });
  const worlds = createRendererWorlds(pointPlan);
  const geometryByStateId = new Map(identity.stateReferences.map((reference) => [
    reference.stateId,
    reference.geometryFingerprint,
  ]));
  const correspondenceByOccurrenceId = new Map(identity.correspondences.map((record) => [
    record.occurrenceId,
    record,
  ]));
  const pairs = worlds.map((world, index) => {
    const fromWorld = worlds[Math.max(0, index - 1)];
    const incoming = pointPlan.segments.find((segment) => (
      segment.toStateId === world.stateId
      && segment.fromStateId !== segment.toStateId
    ));
    const correspondence = correspondenceByOccurrenceId.get(incoming?.occurrenceId);
    return deepFreeze({
      fromWorldId: fromWorld.id,
      toWorldId: world.id,
      inputFingerprint: correspondence?.inputFingerprint
        || geometryByStateId.get(world.stateId)
        || identity.preparationFingerprint,
      occurrenceId: incoming?.occurrenceId || pointPlan.keys[0]?.occurrenceId || world.id,
    });
  });
  return deepFreeze({
    sequenceKey: identity.preparationFingerprint,
    worlds,
    descriptor: {
      inputFingerprint: identity.preparationFingerprint,
      preparationFingerprint: identity.preparationFingerprint,
      profile: pointProfile,
      preparationVariant: variant,
      globals: pointPlan.globals,
      worldRail: pointPlan.globals.worldRail,
      worlds,
      runtimeWorlds: worlds,
      pairs,
      pointFieldPreparation: identity,
    },
  });
}

function createInteractionAdapters(pointPlan) {
  return pointPlan.interactions
    .filter((clip) => clip.type !== 'state-effect')
    .map((clip) => deepFreeze({ ...clip, targetWorldId: clip.targetStateId }));
}

function rotateVectorByQuaternion(vector, quaternion) {
  const [x, y, z] = vector;
  const [qx, qy, qz, qw] = quaternion;
  const ix = (qw * x) + (qy * z) - (qz * y);
  const iy = (qw * y) + (qz * x) - (qx * z);
  const iz = (qw * z) + (qx * y) - (qy * x);
  const iw = (-qx * x) - (qy * y) - (qz * z);
  return [
    (ix * qw) + (iw * -qx) + (iy * -qz) - (iz * -qy),
    (iy * qw) + (iw * -qy) + (iz * -qx) - (ix * -qz),
    (iz * qw) + (iw * -qz) + (ix * -qy) - (iy * -qx),
  ];
}

function quaternionFromYXZ(rotation) {
  const x = Number(rotation?.[0] || 0) * 0.5;
  const y = Number(rotation?.[1] || 0) * 0.5;
  const z = Number(rotation?.[2] || 0) * 0.5;
  const c1 = Math.cos(x);
  const c2 = Math.cos(y);
  const c3 = Math.cos(z);
  const s1 = Math.sin(x);
  const s2 = Math.sin(y);
  const s3 = Math.sin(z);
  return [
    (s1 * c2 * c3) + (c1 * s2 * s3),
    (c1 * s2 * c3) - (s1 * c2 * s3),
    (c1 * c2 * s3) - (s1 * s2 * c3),
    (c1 * c2 * c3) + (s1 * s2 * s3),
  ];
}

function disciplineWorldPosition(item, profile, world, globals, pointProfile, options) {
  const [normalizedX, normalizedZ] = getAboutNarrativeDisciplinePosition(item, profile);
  const shape = world.shapeParameters || {};
  const transform = world.transform || {};
  const compact = pointProfile === 'mobile';
  const shortLandscape = isAboutNarrativeShortLandscape({
    layoutProfile: profile,
    width: options.inlineSize,
    height: options.blockSize,
  });
  const responsive = sampleAboutNarrativeResponsiveWorldMaterialInto(
    world,
    options.inlineSize,
    compact,
    shortLandscape,
    { scale: 1, xScale: 1, yOffset: 0, presenceRatio: 1 },
  );
  const scale = shortLandscape && Number.isFinite(transform.mobileLandscapeScale)
    ? Number(transform.mobileLandscapeScale)
    : responsive.scale;
  const xScale = shortLandscape && Number.isFinite(transform.mobileLandscapeXScale)
    ? Number(transform.mobileLandscapeXScale)
    : responsive.xScale;
  const local = [
    (normalizedX - 0.5) * Number(shape.width ?? 13) * xScale,
    Number(shape.height ?? -1.72) * scale,
    (normalizedZ - 0.5) * Number(shape.depth ?? 17) * scale,
  ];
  const rotated = rotateVectorByQuaternion(local, quaternionFromYXZ(transform.rotation));
  const position = transform.position || [0, 0, 0];
  const anchorRailZ = Number.isFinite(world.anchorRailZ)
    ? Number(world.anchorRailZ)
    : Number(globals.worldRail.originZ) - (Number(world.railAnchorWU) * Number(globals.worldRail.unitsPerWU));
  return [
    rotated[0] + Number(position[0] || 0)
      + (shortLandscape ? Number(transform.mobileLandscapeXOffset || 0) : 0),
    rotated[1] + Number(position[1] || 0) + (compact ? responsive.yOffset : 0)
      + (shortLandscape ? Number(transform.mobileLandscapeYOffset || 0) : 0),
    rotated[2] + anchorRailZ - Number(world.entryDistanceWU || 0) + Number(position[2] || 0)
      + (compact ? Number(transform.mobileZOffset || 0) : 0)
      + (shortLandscape ? Number(transform.mobileLandscapeZOffset || 0) : 0),
  ];
}

function viewfinderRatio(worldPosition, cameraSample) {
  const delta = [
    worldPosition[0] - cameraSample.position[0],
    worldPosition[1] - cameraSample.position[1],
    worldPosition[2] - cameraSample.position[2],
  ];
  const [qx, qy, qz, qw] = cameraSample.quaternion;
  const local = rotateVectorByQuaternion(delta, [-qx, -qy, -qz, qw]);
  const depth = -local[2];
  if (depth <= TIME_EPSILON) return Number.POSITIVE_INFINITY;
  const tangent = Math.tan((Number(cameraSample.fov) * Math.PI / 180) * 0.5);
  return 0.5 - ((local[1] / Math.max(TIME_EPSILON, depth * tangent)) * 0.5);
}

function findViewfinderCrossing(camera, worldPosition, startWU, endWU, ratio) {
  const sample = {
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
    lookAtTarget: [0, 0, -1],
    lookAtRoll: 0,
    aimWeight: 0,
    targeted: false,
    fov: 48,
  };
  const at = (storyWU) => viewfinderRatio(
    worldPosition,
    sampleCameraInto(camera, storyWU, false, sample),
  );
  if (at(startWU) <= ratio) return { atWU: startWU, entered: true };
  if (at(endWU) > ratio) return { atWU: endWU, entered: false };
  let low = startWU;
  let high = endWU;
  for (let iteration = 0; iteration < 32; iteration += 1) {
    const middle = (low + high) * 0.5;
    if (at(middle) <= ratio) high = middle;
    else low = middle;
  }
  return { atWU: high, entered: true };
}

function compileDisciplineReveal(interactions, camera, pointPlan, pointProfile, options) {
  const clip = interactions.find((item) => item.type === 'discipline-reveal');
  if (!clip) return { config: null, crossings: [], diagnostics: [] };
  const parameters = clip.parameters;
  const startWU = Number(clip.activationWU);
  const endWU = Number(clip.endWU);
  const restoreDurationWU = Math.max(0, Number(parameters.restoreDurationWU));
  const restoreStartWU = Math.max(startWU, endWU - restoreDurationWU);
  const entryStartRatio = Number(parameters.entryStartRatio ?? 0.88);
  const entryCompleteRatio = Number(parameters.entryCompleteRatio ?? 0.78);
  const world = pointPlan.rendererStates.find((state) => state.stateId === clip.targetStateId);
  const diagnostics = [];
  const crossings = [...parameters.items]
    .sort((left, right) => Number(left.group) - Number(right.group))
    .map((item) => {
      const worldPosition = disciplineWorldPosition(
        item,
        pointPlan.layoutProfile,
        world,
        pointPlan.globals,
        pointProfile,
        options,
      );
      const entry = findViewfinderCrossing(
        camera,
        worldPosition,
        startWU,
        restoreStartWU,
        entryStartRatio,
      );
      const complete = findViewfinderCrossing(
        camera,
        worldPosition,
        entry.atWU,
        restoreStartWU,
        entryCompleteRatio,
      );
      if (!entry.entered || !complete.entered) {
        diagnostics.push({
          level: 'error',
          code: 'discipline-viewfinder-crossing',
          path: `tracks.interactions.clips.${clip.id}.parameters.items.${item.group}`,
          message: `${item.label} does not cross the configured viewfinder band before restore.`,
        });
      }
      return deepFreeze({
        group: Number(item.group),
        label: item.label,
        startWU: entry.atWU,
        completeWU: Math.max(entry.atWU, complete.atWU),
        atWU: entry.atWU,
        worldPosition,
      });
    });
  const sequenceStartWU = crossings.length
    ? Math.min(...crossings.map((crossing) => crossing.startWU))
    : startWU;
  const sequenceEndWU = crossings.length
    ? Math.max(...crossings.map((crossing) => crossing.completeWU))
    : restoreStartWU;
  return {
    diagnostics,
    crossings,
    config: deepFreeze({
      id: clip.id,
      startWU,
      focusWU: startWU + ((endWU - startWU) * 0.5),
      endWU,
      effectStartWU: Number(clip.startWU),
      effectEndWU: endWU,
      sequenceStartWU,
      sequenceEndWU,
      restoreStartWU,
      backgroundFadeWU: Math.max(0, sequenceStartWU - Number(clip.startWU)),
      backgroundFadeEndWU: sequenceStartWU,
      entryStartRatio,
      entryCompleteRatio,
      backgroundOpacity: Number(parameters.backgroundOpacity),
      reconnectOpacity: 1,
      pointScale: Number(parameters.pointScale),
      restoreDurationWU,
      items: parameters.items,
      crossings,
      sourceType: 'motion',
      source: clip,
      motion: clip,
    }),
  };
}

function invalidComposerPlan(pointPlan, diagnostics = []) {
  return deepFreeze({
    ...pointPlan,
    valid: false,
    diagnostics: [...(pointPlan?.diagnostics || []), ...diagnostics],
    directorVersion: 4,
    camera: { moveKeys: [], lookKeys: [], lensKeys: [] },
    visibilityKeys: [],
    worlds: [],
    textFields: [],
    interactionClips: [],
    effects: [],
    renderSpans: [],
    disciplineReveal: null,
    disciplineCrossings: [],
  });
}

export function compileAboutNarrativeComposerPlan(input, options = EMPTY_OPTIONS) {
  let resolver;
  try {
    resolver = createProfileResolver(input, options);
  } catch (error) {
    return invalidComposerPlan(null, [{
      level: 'error',
      code: 'composer-profile',
      path: 'profiles',
      message: error.message,
    }]);
  }
  const pointPlan = compileAboutNarrativePointFieldRuntime(input, {
    ...options,
    layoutProfile: resolver.layoutProfile,
    motionProfile: resolver.motionProfile,
  });
  if (!pointPlan.valid) return invalidComposerPlan(pointPlan);
  const model = pointPlan.model;
  const pointProfile = resolveAboutNarrativePointProfile(resolver.layoutProfile);
  const camera = compileCamera(model, resolver.layoutProfile);
  const visibilityKeys = resolveLane(model, resolver, 'visibility');
  const textFields = resolveTextFields(model, resolver);
  const pointField = applyAboutNarrativePointFieldOverrides(
    model.tracks.pointField,
    model.profiles[resolver.layoutProfile].overrides.pointField,
  );
  let preparation;
  try {
    preparation = createRendererPreparation(pointPlan, pointField, pointProfile, options);
  } catch (error) {
    return invalidComposerPlan(pointPlan, [{
      level: 'error',
      code: 'composer-preparation',
      path: 'tracks.pointField',
      message: error.message,
    }]);
  }
  const interactionClips = createInteractionAdapters(pointPlan);
  const effects = pointPlan.interactions.filter((clip) => clip.type === 'state-effect');
  const reveal = compileDisciplineReveal(
    interactionClips,
    camera,
    pointPlan,
    pointProfile,
    options,
  );
  const renderSpanPlan = compileAboutNarrativeRenderSpans({
    textFields,
    worlds: preparation.worlds,
  }, {
    profileId: resolver.layoutProfile,
    resolver,
    contentPressure: options.contentPressure,
  });
  const diagnostics = [
    ...pointPlan.diagnostics,
    ...reveal.diagnostics,
    ...renderSpanPlan.diagnostics,
  ];
  if (!renderSpanPlan.valid || diagnostics.some((item) => item.level === 'error')) {
    return invalidComposerPlan(pointPlan, diagnostics);
  }
  return deepFreeze({
    valid: true,
    diagnostics,
    directorVersion: 4,
    sourceSchemaVersion: Number(input.schemaVersion),
    model,
    resolver,
    profileId: resolver.layoutProfile,
    layoutProfile: resolver.layoutProfile,
    pointProfile,
    motionProfile: resolver.motionProfile,
    reducedMotion: resolver.motionProfile === 'reduced',
    durationWU: resolver.storyDurationWU,
    maxStoryWU: resolver.storyDurationWU,
    globals: model.globals,
    pointFieldPlan: pointPlan,
    pointField,
    camera,
    visibilityKeys,
    worlds: preparation.worlds,
    textFields,
    interactionClips,
    effects,
    renderSpans: renderSpanPlan.spans,
    worldSequenceKey: preparation.sequenceKey,
    worldPreparationDescriptor: preparation.descriptor,
    disciplineReveal: reveal.config,
    disciplineCrossings: reveal.crossings,
  });
}

function createMotionEnvelopeSamples() {
  return {
    stagger: { ...ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS.stagger },
    path: { ...ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS.path },
    flatten: { ...ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS.flatten },
  };
}

export function createAboutNarrativeComposerFrameSample() {
  const motion = createMotionEnvelopeSamples();
  const disciplineReveal = {
    id: '',
    config: null,
    storyWU: 0,
    startWU: 0,
    endWU: 0,
    backgroundFadeWU: 0,
    restoreDurationWU: 0,
    sequenceStartWU: 0,
    sequenceEndWU: 0,
    active: false,
    backgroundProgress: 0,
    restoreProgress: 0,
    weights: new Float32Array(6),
  };
  const frame = {
    globals: null,
    sourceSchemaVersion: 7,
    storyWU: 0,
    storyTime: 0,
    ambientTime: 0,
    deltaSeconds: 0,
    durationWU: 0,
    layoutProfile: 'desktop',
    pointProfile: 'desktop',
    reducedMotion: false,
    camera: {
      position: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      lookAtTarget: [0, 0, -1],
      lookAtRoll: 0,
      aimWeight: 0,
      targeted: false,
      fov: 48,
    },
    simulation: { visibility: 1 },
    world: {
      from: null,
      to: null,
      sequence: null,
      sequenceKey: '',
      preparationDescriptor: null,
      transitionProgress: 1,
      parametricMotion: true,
      segmentId: '',
      fromOccurrenceId: '',
      toOccurrenceId: '',
      rawProgress: 1,
      easedProgress: 1,
      visualProgress: 1,
      transition: {
        startWU: 0,
        endWU: 0,
        type: 'hold',
        easing: 'linear',
        correspondence: null,
        ...motion,
      },
    },
    text: { activeFieldIds: [] },
    interactions: {
      activeClipIds: [],
      activatedClipIds: [],
      activeInteraction: null,
      interactionActivated: false,
      effectWeight: 0,
      effectProgress: 0,
    },
    composerEffects: {
      active: [],
      progress: [],
      weight: [],
      elapsedWU: [],
    },
    disciplineReveal: null,
    editorialSignals: { disciplineFocus: 0, gridInfluence: 0 },
  };
  Object.defineProperties(frame, {
    _aboutNarrativeComposerFrame: { value: true },
    _pointFieldFrame: { value: createAboutNarrativePointFieldFrameSample() },
    _disciplineReveal: { value: disciplineReveal },
  });
  return frame;
}

function isActiveAt(clip, storyWU, durationWU) {
  if (storyWU < Number(clip.startWU)) return false;
  if (storyWU < Number(clip.endWU)) return true;
  return Math.abs(storyWU - durationWU) <= TIME_EPSILON
    && Math.abs(Number(clip.endWU) - durationWU) <= TIME_EPSILON;
}

function sampleVisibility(keys, storyWU, reducedMotion) {
  if (!keys.length) return 1;
  const fromIndex = findKeyIndex(keys, storyWU);
  const from = keys[fromIndex];
  const to = keys[Math.min(keys.length - 1, fromIndex + 1)];
  if (reducedMotion || from === to || storyWU <= Number(keys[0].atWU)) {
    return Number(storyWU <= Number(keys[0].atWU) ? keys[0].visibility : from.visibility);
  }
  const progress = applyAboutNarrativeTrackEasing(
    from.easing,
    (storyWU - Number(from.atWU)) / Math.max(TIME_EPSILON, Number(to.atWU) - Number(from.atWU)),
  );
  return Number(from.visibility)
    + ((Number(to.visibility) - Number(from.visibility)) * progress);
}

function copyIds(target, source) {
  target.length = 0;
  for (let index = 0; index < source.length; index += 1) target.push(source[index]);
}

function collectActiveText(target, textFields, storyWU, durationWU) {
  target.length = 0;
  for (let index = 0; index < textFields.length; index += 1) {
    const field = textFields[index];
    if (isActiveAt(field, storyWU, durationWU)) target.push(field.id);
  }
}

function smoothRange(value, start, end) {
  return smooth01((value - start) / Math.max(TIME_EPSILON, end - start));
}

function effectWeight(clip, storyWU, reducedMotion) {
  if (!clip || reducedMotion) return 0;
  const startWU = Number(clip.startWU);
  const activationWU = Number(clip.activationWU);
  const endWU = Number(clip.endWU);
  const releaseWU = Math.max(0, Number(clip.parameters?.releaseWU) || 0);
  const attack = activationWU <= startWU ? 1 : smoothRange(storyWU, startWU, activationWU);
  const releaseStartWU = Math.max(activationWU, endWU - releaseWU);
  const release = releaseWU <= TIME_EPSILON
    ? 1
    : 1 - smoothRange(storyWU, releaseStartWU, endWU);
  return clamp01(attack * release);
}

function writeMotionEnvelope(target, source) {
  target.mode = source.mode;
  target.amount = source.amount;
  if (Object.hasOwn(target, 'axis')) target.axis = source.axis;
  if (Object.hasOwn(target, 'seed')) target.seed = source.seed;
  if (Object.hasOwn(target, 'frequency')) target.frequency = source.frequency;
  if (Object.hasOwn(target, 'offset')) target.offset = source.offset;
}

function sampleDisciplineReveal(frame, config) {
  const target = frame._disciplineReveal;
  if (!config) {
    frame.disciplineReveal = null;
    return;
  }
  frame.disciplineReveal = target;
  target.id = config.id;
  target.config = config;
  target.storyWU = frame.storyWU;
  target.startWU = config.startWU;
  target.endWU = config.endWU;
  target.backgroundFadeWU = config.backgroundFadeWU;
  target.restoreDurationWU = config.restoreDurationWU;
  target.sequenceStartWU = config.sequenceStartWU;
  target.sequenceEndWU = config.sequenceEndWU;
  target.active = frame.storyWU >= config.effectStartWU && frame.storyWU < config.effectEndWU;
  target.backgroundProgress = !target.active
    ? 0
    : frame.reducedMotion
      ? 1
      : smoothRange(frame.storyWU, config.effectStartWU, config.backgroundFadeEndWU);
  target.restoreProgress = frame.reducedMotion
    ? Number(frame.storyWU >= config.effectEndWU)
    : smoothRange(frame.storyWU, config.restoreStartWU, config.effectEndWU);
  target.weights.fill(0);
  if (!target.active) return;
  for (let index = 0; index < config.crossings.length && index < target.weights.length; index += 1) {
    const crossing = config.crossings[index];
    target.weights[index] = frame.reducedMotion
      ? Number(frame.storyWU >= crossing.completeWU)
      : smoothRange(frame.storyWU, crossing.startWU, crossing.completeWU);
  }
}

function sampleInteractions(plan, pointFrame, frame) {
  copyIds(frame.interactions.activeClipIds, pointFrame.interactions.activeClipIds);
  copyIds(frame.interactions.activatedClipIds, pointFrame.interactions.activatedClipIds);
  frame.interactions.activeInteraction = null;
  frame.interactions.interactionActivated = false;
  frame.interactions.effectWeight = 0;
  frame.interactions.effectProgress = 0;
  const fromStateId = pointFrame.world.from?.stateId;
  const toStateId = pointFrame.world.to?.stateId;
  for (let index = 0; index < plan.interactionClips.length; index += 1) {
    const clip = plan.interactionClips[index];
    if (!isActiveAt(clip, frame.storyWU, frame.durationWU)) continue;
    if (clip.targetStateId !== fromStateId && clip.targetStateId !== toStateId) continue;
    frame.interactions.activeInteraction = clip;
    frame.interactions.interactionActivated = frame.storyWU >= Number(clip.activationWU);
    frame.interactions.effectWeight = effectWeight(clip, frame.storyWU, frame.reducedMotion);
    frame.interactions.effectProgress = frame.reducedMotion
      ? Number(frame.interactions.interactionActivated)
      : clamp01((frame.storyWU - Number(clip.activationWU))
        / Math.max(TIME_EPSILON, Number(clip.endWU) - Number(clip.activationWU)));
    break;
  }
}

function sampleComposerEffects(plan, frame) {
  const target = frame.composerEffects;
  target.active.length = 0;
  target.progress.length = 0;
  target.weight.length = 0;
  target.elapsedWU.length = 0;
  for (let index = 0; index < plan.effects.length; index += 1) {
    const clip = plan.effects[index];
    if (!isActiveAt(clip, frame.storyWU, frame.durationWU)) continue;
    const elapsedWU = Math.max(0, frame.storyWU - Number(clip.activationWU));
    target.active.push(clip);
    target.progress.push(frame.reducedMotion
      ? Number(frame.storyWU >= Number(clip.activationWU))
      : clamp01(elapsedWU / Math.max(TIME_EPSILON, Number(clip.endWU) - Number(clip.activationWU))));
    target.weight.push(effectWeight(clip, frame.storyWU, frame.reducedMotion));
    target.elapsedWU.push(frame.reducedMotion ? 0 : elapsedWU);
  }
}

export function sampleAboutNarrativeComposerPlanInto(
  plan,
  storyWU,
  target,
  options = EMPTY_OPTIONS,
) {
  if (!plan?.valid) return null;
  if (!target?._aboutNarrativeComposerFrame || !target?._pointFieldFrame) {
    throw new TypeError('sampleAboutNarrativeComposerPlanInto requires a Composer frame sample.');
  }
  const clampedStoryWU = Math.max(0, Math.min(plan.durationWU, Number(storyWU) || 0));
  const pointFrame = sampleAboutNarrativePointFieldRuntimeInto(
    plan.pointFieldPlan,
    clampedStoryWU,
    target._pointFieldFrame,
    options,
  );
  if (!pointFrame) return null;
  target.sourceSchemaVersion = plan.sourceSchemaVersion;
  target.globals = plan.globals;
  target.storyWU = clampedStoryWU;
  target.storyTime = clampedStoryWU;
  target.ambientTime = plan.reducedMotion ? 0 : clampedStoryWU;
  target.deltaSeconds = Math.max(0, Number(options.deltaSeconds) || 0);
  target.durationWU = plan.durationWU;
  target.layoutProfile = plan.layoutProfile;
  target.pointProfile = plan.pointProfile;
  target.reducedMotion = plan.reducedMotion;
  sampleCameraInto(plan.camera, clampedStoryWU, plan.reducedMotion, target.camera);
  target.simulation.visibility = sampleVisibility(
    plan.visibilityKeys,
    clampedStoryWU,
    plan.reducedMotion,
  );

  const segment = findById(plan.pointFieldPlan.segments, pointFrame.world.segmentId);
  const sampledFromWorld = findById(plan.worlds, pointFrame.world.from?.stateId, 'stateId');
  const toWorld = findById(plan.worlds, pointFrame.world.to?.stateId, 'stateId') || sampledFromWorld;
  const settledPair = segment?.transition.type === 'hold'
    && pointFrame.world.from?.stateId === pointFrame.world.to?.stateId
    ? plan.worldPreparationDescriptor.pairs.find((pair) => pair.toWorldId === toWorld?.id)
    : null;
  const fromWorld = findById(plan.worlds, settledPair?.fromWorldId) || sampledFromWorld;
  target.world.from = fromWorld;
  target.world.to = toWorld;
  target.world.sequence = plan.worlds;
  target.world.sequenceKey = plan.worldSequenceKey;
  target.world.preparationDescriptor = plan.worldPreparationDescriptor;
  target.world.segmentId = pointFrame.world.segmentId;
  target.world.fromOccurrenceId = pointFrame.world.fromOccurrenceId;
  target.world.toOccurrenceId = pointFrame.world.toOccurrenceId;
  target.world.rawProgress = pointFrame.world.rawProgress;
  target.world.easedProgress = pointFrame.world.easedProgress;
  target.world.visualProgress = pointFrame.world.visualProgress;
  target.world.transitionProgress = pointFrame.world.visualProgress;
  target.world.transition.startWU = segment?.startWU ?? clampedStoryWU;
  target.world.transition.endWU = segment?.endWU ?? clampedStoryWU;
  target.world.transition.type = rendererTransitionType(pointFrame.world.transition.type);
  target.world.transition.easing = pointFrame.world.transition.easing;
  target.world.transition.correspondence = pointFrame.world.transition.correspondence;
  writeMotionEnvelope(target.world.transition.stagger, pointFrame.world.transition.stagger);
  writeMotionEnvelope(target.world.transition.path, pointFrame.world.transition.path);
  writeMotionEnvelope(target.world.transition.flatten, pointFrame.world.transition.flatten);

  collectActiveText(target.text.activeFieldIds, plan.textFields, clampedStoryWU, plan.durationWU);
  sampleInteractions(plan, pointFrame, target);
  sampleComposerEffects(plan, target);
  sampleDisciplineReveal(target, plan.disciplineReveal);
  target.editorialSignals.disciplineFocus = 0;
  target.editorialSignals.gridInfluence = 0;
  return target;
}

export function getAboutNarrativeComposerPreparationRequest(plan, storyWU) {
  if (!plan?.valid || !plan.worlds.length || !plan.worldPreparationDescriptor) return null;
  const clampedStoryWU = Math.max(0, Math.min(plan.durationWU, Number(storyWU) || 0));
  const keyIndex = findKeyIndex(plan.pointFieldPlan.keys, clampedStoryWU);
  const key = plan.pointFieldPlan.keys[keyIndex];
  const targetStateId = clampedStoryWU >= plan.durationWU
    ? key?.stateId
    : plan.pointFieldPlan.segments[keyIndex]?.toStateId || key?.stateId;
  return key ? {
    sequenceKey: plan.worldSequenceKey,
    descriptor: plan.worldPreparationDescriptor,
    targetWorldId: targetStateId,
    targetOccurrenceId: key.occurrenceId,
  } : null;
}

export function getAboutNarrativeComposerCameraSample(plan, storyWU, target = null) {
  const sample = target || {
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
    lookAtTarget: [0, 0, -1],
    lookAtRoll: 0,
    aimWeight: 0,
    targeted: false,
    fov: 48,
  };
  return sampleCameraInto(plan.camera, Number(storyWU), plan.reducedMotion, sample);
}
