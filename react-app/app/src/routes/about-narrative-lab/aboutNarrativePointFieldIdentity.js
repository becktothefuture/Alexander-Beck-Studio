import {
  ABOUT_NARRATIVE_CORRESPONDENCE_VERSION,
  ABOUT_NARRATIVE_POINT_PROFILES,
  ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
} from './aboutNarrativeRuntimeConstants.js';
import { resolveAboutNarrativePointProfile } from './aboutNarrativeProfileResolver.js';
import { serializeAboutNarrativeSequenceIdentity } from './aboutNarrativeSequenceIdentity.js';

export const ABOUT_NARRATIVE_POINT_FIELD_PREPARATION_VARIANTS = Object.freeze([
  'standard',
  'mobile-default',
  'mobile-short-landscape',
]);

const PREPARATION_VARIANT_SET = new Set(ABOUT_NARRATIVE_POINT_FIELD_PREPARATION_VARIANTS);
const IDENTITY_PRECISION = 1_000_000;
const TIME_EPSILON = 0.000001;
const CORRESPONDENCE_TRANSITION_TYPES = new Set(['morph', 'dissolve-morph']);

function canonicalIdentityValue(value, label) {
  if (typeof value === 'number') return canonicalNumber(value, label);
  if (Array.isArray(value)) {
    return value.map((item, index) => canonicalIdentityValue(item, `${label}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      canonicalIdentityValue(item, `${label}.${key}`),
    ]));
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function canonicalNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new TypeError(`About narrative point-field identity requires finite ${label}.`);
  }
  const rounded = Math.round(number * IDENTITY_PRECISION) / IDENTITY_PRECISION;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function canonicalVector(value, fallback, label) {
  const vector = Array.isArray(value) ? value : fallback;
  if (vector.length !== 3) {
    throw new TypeError(`About narrative point-field identity requires a three-value ${label}.`);
  }
  return vector.map((item, index) => canonicalNumber(item, `${label}[${index}]`));
}

function resolvePointProfile(profile) {
  const requestedId = typeof profile === 'object' && profile ? profile.id : profile;
  const pointProfileId = ABOUT_NARRATIVE_POINT_PROFILES[requestedId]
    ? requestedId
    : resolveAboutNarrativePointProfile(requestedId || 'desktop');
  const definition = ABOUT_NARRATIVE_POINT_PROFILES[pointProfileId];
  return {
    id: definition.id,
    pointCount: definition.pointCount,
  };
}

function requirePreparationVariant(variant) {
  if (!PREPARATION_VARIANT_SET.has(variant)) {
    throw new RangeError(
      `About narrative point-field preparation variant must be one of: ${[
        ...PREPARATION_VARIANT_SET,
      ].join(', ')}.`,
    );
  }
  return variant;
}

function requireStableId(value, label) {
  if (typeof value !== 'string' || !value) {
    throw new TypeError(`About narrative point-field identity requires a stable ${label}.`);
  }
  return value;
}

// Point-field sources are validated, local authoring inputs. This bounded,
// non-cryptographic hash is paired with canonical geometry text below so a
// collision can never silently deduplicate distinct trusted inputs.
function hashIdentityString(value) {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193) >>> 0;
    right = Math.imul(right ^ code, 0x85ebca6b) >>> 0;
    right = ((right << 13) | (right >>> 19)) >>> 0;
  }
  return `${left.toString(16).padStart(8, '0')}${right.toString(16).padStart(8, '0')}`;
}

export function fingerprintAboutNarrativePointFieldIdentity(
  namespace,
  identity,
  { hashIdentity = hashIdentityString } = {},
) {
  requireStableId(namespace, 'identity namespace');
  const hash = hashIdentity(serializeAboutNarrativeSequenceIdentity(identity));
  if (typeof hash !== 'string' || !hash) {
    throw new TypeError('About narrative point-field identity hash must be a non-empty string.');
  }
  return `${namespace}:${hash}`;
}

export function segmentRequiresCorrespondence(segment) {
  const transitionType = segment?.transition?.type || segment?.type;
  const fromStateId = segment?.fromStateId ?? segment?.fromKey?.stateId;
  const toStateId = segment?.toStateId ?? segment?.toKey?.stateId;
  const durationWU = Number.isFinite(segment?.durationWU)
    ? Number(segment.durationWU)
    : Number(segment?.endWU) - Number(segment?.startWU);
  return CORRESPONDENCE_TRANSITION_TYPES.has(transitionType)
    && fromStateId !== toStateId
    && Number.isFinite(durationWU)
    && durationWU > TIME_EPSILON;
}

function resolveStateAnchorRailZ(state, globals, worldRail) {
  if (Number.isFinite(state.anchorRailZ)) {
    return canonicalNumber(state.anchorRailZ, 'state anchor rail Z');
  }
  const rail = worldRail || globals?.worldRail || {};
  const originZ = canonicalNumber(
    rail.originZ ?? globals?.camera?.startZ ?? 0,
    'World rail origin',
  );
  const unitsPerWU = canonicalNumber(
    rail.unitsPerWU ?? globals?.camera?.cadence ?? 0,
    'World rail units per WU',
  );
  return canonicalNumber(
    originZ - (canonicalNumber(state.railAnchorWU, 'state rail anchor') * unitsPerWU),
    'state anchor rail Z',
  );
}

export function resolveAboutNarrativePointFieldPreparationTransform(
  transform = {},
  variant = 'standard',
) {
  const resolvedVariant = requirePreparationVariant(variant);
  const position = canonicalVector(transform.position, [0, 0, 0], 'position');
  const rotation = canonicalVector(transform.rotation, [0, 0, 0], 'rotation');
  const baseScale = canonicalNumber(transform.scale ?? 1, 'scale');
  const compact = resolvedVariant !== 'standard';
  const shortLandscape = resolvedVariant === 'mobile-short-landscape';
  const responsiveScale = shortLandscape && Number.isFinite(transform.mobileLandscapeScale)
    ? Number(transform.mobileLandscapeScale)
    : transform.mobileScale;
  const scale = compact && Number.isFinite(responsiveScale)
    ? Number(responsiveScale)
    : baseScale;
  const responsiveXScale = shortLandscape
    && Number.isFinite(transform.mobileLandscapeXScale)
    ? Number(transform.mobileLandscapeXScale)
    : transform.mobileXScale;
  const xScale = compact && Number.isFinite(responsiveXScale)
    ? Number(responsiveXScale)
    : scale;
  return deepFreeze({
    position: [
      canonicalNumber(
        position[0] + (shortLandscape ? Number(transform.mobileLandscapeXOffset || 0) : 0),
        'resolved position x',
      ),
      canonicalNumber(
        position[1]
          + (compact ? Number(transform.mobileYOffset || 0) : 0)
          + (shortLandscape ? Number(transform.mobileLandscapeYOffset || 0) : 0),
        'resolved position y',
      ),
      canonicalNumber(
        position[2]
          + (compact ? Number(transform.mobileZOffset || 0) : 0)
          + (shortLandscape ? Number(transform.mobileLandscapeZOffset || 0) : 0),
        'resolved position z',
      ),
    ],
    rotation,
    scale: canonicalNumber(scale, 'resolved scale'),
    xScale: canonicalNumber(xScale, 'resolved x scale'),
  });
}

export function createAboutNarrativePointFieldStateGeometryIdentity({
  state,
  pointProfile = 'desktop',
  preparationVariant = 'standard',
  globals,
  worldRail,
}) {
  if (!state || typeof state !== 'object') {
    throw new TypeError('About narrative point-field geometry identity requires a state.');
  }
  const profile = resolvePointProfile(pointProfile);
  return deepFreeze({
    adapterId: requireStableId(state.adapterId, 'state adapter ID'),
    shapeId: requireStableId(state.shapeId, 'state shape ID'),
    seed: canonicalNumber(state.seed, 'state seed'),
    shapeParameters: canonicalIdentityValue(state.shapeParameters || {}, 'shape parameter'),
    railAnchorWU: canonicalNumber(state.railAnchorWU, 'state rail anchor'),
    anchorRailZ: resolveStateAnchorRailZ(state, globals, worldRail),
    entryDistanceWU: canonicalNumber(state.entryDistanceWU, 'state entry distance'),
    transform: resolveAboutNarrativePointFieldPreparationTransform(
      state.transform,
      preparationVariant,
    ),
    pointProfile: profile,
  });
}

export function createAboutNarrativePointFieldStateGeometryFingerprint(options) {
  return fingerprintAboutNarrativePointFieldIdentity(
    'about-point-state-v1',
    createAboutNarrativePointFieldStateGeometryIdentity(options),
  );
}

export function createAboutNarrativePointFieldSegmentCorrespondenceIdentity({
  occurrenceId,
  sourceGeometryFingerprint,
  targetGeometryFingerprint,
  strategy = 'index-v1',
  sourceChainFingerprint,
}) {
  return deepFreeze({
    protocolVersion: ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
    correspondenceVersion: ABOUT_NARRATIVE_CORRESPONDENCE_VERSION,
    occurrenceId: requireStableId(occurrenceId, 'segment occurrence ID'),
    sourceGeometryFingerprint: requireStableId(
      sourceGeometryFingerprint,
      'source geometry fingerprint',
    ),
    targetGeometryFingerprint: requireStableId(
      targetGeometryFingerprint,
      'target geometry fingerprint',
    ),
    strategy: requireStableId(strategy, 'correspondence strategy'),
    sourceChainFingerprint: requireStableId(
      sourceChainFingerprint,
      'cumulative source-chain fingerprint',
    ),
  });
}

function createSegmentCorrespondenceRecord(options, hashIdentity) {
  const identity = createAboutNarrativePointFieldSegmentCorrespondenceIdentity(options);
  const inputFingerprint = fingerprintAboutNarrativePointFieldIdentity(
    'about-point-correspondence-v1',
    identity,
    { hashIdentity },
  );
  const outputFingerprint = fingerprintAboutNarrativePointFieldIdentity(
    'about-point-output-v1',
    {
      occurrenceId: identity.occurrenceId,
      correspondenceFingerprint: inputFingerprint,
      targetGeometryFingerprint: identity.targetGeometryFingerprint,
    },
    { hashIdentity },
  );
  return deepFreeze({
    ...identity,
    inputFingerprint,
    outputFingerprint,
  });
}

function sortedPointFieldKeys(pointField) {
  return [...(pointField?.keys || [])]
    .map((key, index) => ({ key, index }))
    .sort((left, right) => (
      Number(left.key.atWU) - Number(right.key.atWU)
      || left.index - right.index
    ))
    .map(({ key }) => key);
}

function orderedPointFieldSegments(pointField, keys) {
  const segmentByPair = new Map((pointField?.segments || []).map((segment) => [
    `${segment.fromKeyId}->${segment.toKeyId}`,
    segment,
  ]));
  return keys.slice(0, -1).map((key, index) => {
    const nextKey = keys[index + 1];
    const segment = segmentByPair.get(`${key.id}->${nextKey.id}`);
    if (!segment) {
      throw new TypeError(`Missing point-field segment ${key.id}->${nextKey.id}.`);
    }
    return segment;
  });
}

export function createAboutNarrativePointFieldTimelineIdentity({
  pointField,
  interactions = [],
}) {
  const keys = sortedPointFieldKeys(pointField);
  const segments = orderedPointFieldSegments(pointField, keys);
  const interactionClips = Array.isArray(interactions)
    ? interactions
    : interactions?.clips || [];
  return deepFreeze({
    keys: keys.map((key) => ({
      id: requireStableId(key.id, 'key ID'),
      atWU: canonicalNumber(key.atWU, 'key timing'),
      stateId: requireStableId(key.stateId, 'key state ID'),
    })),
    segments: segments.map((segment) => ({
      id: requireStableId(segment.id, 'segment ID'),
      fromKeyId: requireStableId(segment.fromKeyId, 'segment source key ID'),
      toKeyId: requireStableId(segment.toKeyId, 'segment target key ID'),
      type: segment.transition?.type || 'morph',
      easing: segment.transition?.easing || 'linear',
      progress: segment.transition?.progress,
      stagger: canonicalIdentityValue(segment.transition?.stagger || {}, 'transition stagger'),
      path: canonicalIdentityValue(segment.transition?.path || {}, 'transition path'),
      flatten: canonicalIdentityValue(segment.transition?.flatten || {}, 'transition flatten'),
    })),
    interactions: [...interactionClips]
      .sort((left, right) => String(left.id).localeCompare(String(right.id)))
      .map((interaction) => ({
        id: requireStableId(interaction.id, 'interaction ID'),
        type: interaction.type,
        targetStateId: interaction.targetStateId,
        startWU: canonicalNumber(interaction.startWU, 'interaction start'),
        activationWU: canonicalNumber(interaction.activationWU, 'interaction activation'),
        endWU: canonicalNumber(interaction.endWU, 'interaction end'),
        parameters: canonicalIdentityValue(
          interaction.parameters || {},
          'interaction parameter',
        ),
      })),
  });
}

export function createAboutNarrativePointFieldTimelineFingerprint(options) {
  return fingerprintAboutNarrativePointFieldIdentity(
    'about-point-timeline-v1',
    createAboutNarrativePointFieldTimelineIdentity(options),
  );
}

export function createAboutNarrativePointFieldPreparationDescriptor({
  pointField,
  pointProfile = 'desktop',
  preparationVariant = 'standard',
  globals,
  worldRail,
  hashIdentity = hashIdentityString,
}) {
  if (!pointField || typeof pointField !== 'object') {
    throw new TypeError('About narrative point-field preparation requires a pointField track.');
  }
  const profile = resolvePointProfile(pointProfile);
  const variant = requirePreparationVariant(preparationVariant);
  const stateById = new Map();
  const geometryByFingerprint = new Map();
  const stateReferences = [...(pointField.stateDefinitions || [])]
    .sort((left, right) => String(left.id).localeCompare(String(right.id)))
    .map((state) => {
      const stateId = requireStableId(state.id, 'state ID');
      if (stateById.has(stateId)) {
        throw new TypeError(`Duplicate point-field state ID ${stateId}.`);
      }
      const identity = createAboutNarrativePointFieldStateGeometryIdentity({
        state,
        pointProfile: profile.id,
        preparationVariant: variant,
        globals,
        worldRail,
      });
      const canonicalIdentity = serializeAboutNarrativeSequenceIdentity(identity);
      const geometryFingerprint = fingerprintAboutNarrativePointFieldIdentity(
        'about-point-state-v1',
        identity,
        { hashIdentity },
      );
      stateById.set(stateId, { state, geometryFingerprint });
      const existing = geometryByFingerprint.get(geometryFingerprint);
      if (existing) {
        if (existing.canonicalIdentity !== canonicalIdentity) {
          const error = new Error(
            `Point-field geometry fingerprint collision between states “${existing.stateIds[0]}” and “${stateId}” (${geometryFingerprint}).`,
          );
          error.name = 'AboutNarrativePointFieldIdentityCollisionError';
          error.code = 'point-field-geometry-fingerprint-collision';
          throw error;
        }
        existing.stateIds.push(stateId);
      } else {
        geometryByFingerprint.set(geometryFingerprint, {
          geometryFingerprint,
          canonicalIdentity,
          stateIds: [stateId],
          identity,
        });
      }
      return { stateId, geometryFingerprint };
    });

  const keys = sortedPointFieldKeys(pointField);
  if (!keys.length) throw new TypeError('Point-field preparation requires at least one key.');
  const segments = orderedPointFieldSegments(pointField, keys);
  const firstState = stateById.get(keys[0].stateId);
  if (!firstState) throw new TypeError(`Unknown point-field state ${keys[0].stateId}.`);
  let sourceChainFingerprint = firstState.geometryFingerprint;
  const correspondences = [];
  segments.forEach((segment, index) => {
    const fromKey = keys[index];
    const toKey = keys[index + 1];
    const source = stateById.get(fromKey.stateId);
    const target = stateById.get(toKey.stateId);
    if (!source || !target) {
      throw new TypeError(`Segment ${segment.id} references an unknown point-field state.`);
    }
    const correspondenceRequired = segmentRequiresCorrespondence({
      transition: segment.transition,
      fromStateId: fromKey.stateId,
      toStateId: toKey.stateId,
      startWU: fromKey.atWU,
      endWU: toKey.atWU,
    });
    if (!correspondenceRequired) {
      sourceChainFingerprint = target.geometryFingerprint;
      return;
    }
    const record = createSegmentCorrespondenceRecord({
      occurrenceId: segment.id,
      sourceGeometryFingerprint: source.geometryFingerprint,
      targetGeometryFingerprint: target.geometryFingerprint,
      strategy: segment.transition?.correspondence || 'index-v1',
      sourceChainFingerprint,
    }, hashIdentity);
    correspondences.push(record);
    sourceChainFingerprint = record.outputFingerprint;
  });

  const geometries = [...geometryByFingerprint.values()].map((geometry) => ({
    ...geometry,
    stateIds: [...geometry.stateIds],
  }));
  const preparationFingerprint = fingerprintAboutNarrativePointFieldIdentity(
    'about-point-preparation-v1',
    {
      profile,
      geometryFingerprints: geometries
        .map((geometry) => geometry.geometryFingerprint)
        .sort(),
      correspondenceFingerprints: correspondences.map((record) => record.inputFingerprint),
    },
    { hashIdentity },
  );
  return deepFreeze({
    protocolVersion: ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
    correspondenceVersion: ABOUT_NARRATIVE_CORRESPONDENCE_VERSION,
    profile,
    preparationVariant: variant,
    geometries,
    stateReferences,
    correspondences,
    finalPointFingerprint: sourceChainFingerprint,
    preparationFingerprint,
  });
}
