import {
  ABOUT_NARRATIVE_CORRESPONDENCE_VERSION,
  ABOUT_NARRATIVE_POINT_PROFILES,
  ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
} from './aboutNarrativeRuntimeConstants.js';
import {
  getAboutNarrativeWorldPairId,
  requireAboutNarrativeWorldId,
  resolveAboutNarrativeWorldAnchorRailZ,
  resolveAboutNarrativeWorldAnchorWU,
} from './aboutNarrativeWorldIdentity.js';
import { resolveAboutNarrativePointProfile } from './aboutNarrativeProfileResolver.js';

function canonicalNumber(value) {
  if (!Number.isFinite(value)) throw new TypeError('About narrative sequence identity requires finite numbers.');
  return Object.is(value, -0) ? '0' : String(value);
}

export function serializeAboutNarrativeSequenceIdentity(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number') return canonicalNumber(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    return `[${value.map(serializeAboutNarrativeSequenceIdentity).join(',')}]`;
  }
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${serializeAboutNarrativeSequenceIdentity(value[key])}`
    )).join(',')}}`;
  }
  throw new TypeError(`Unsupported About narrative sequence identity value: ${typeof value}.`);
}

function cloneIdentityValue(value) {
  if (Array.isArray(value)) return value.map(cloneIdentityValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneIdentityValue(item)]));
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

// Layout hydration can vary by a few sub-pixel fractions while fonts settle.
// Preparation identity is spatial, so retain meaningful 0.001 WU changes but
// collapse measurement noise that would otherwise supersede the same Worker.
function canonicalStoryWU(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new TypeError('About narrative sequence identity requires finite World timing.');
  }
  return Math.round(number * 1_000) / 1_000;
}

function createWorldPreparationInput(world, globals) {
  const transform = world.transform || {};
  const worldId = requireAboutNarrativeWorldId(world);
  const startWU = canonicalStoryWU(world.startWU);
  const anchorWU = canonicalStoryWU(resolveAboutNarrativeWorldAnchorWU(world));
  const anchorRailZ = canonicalStoryWU(resolveAboutNarrativeWorldAnchorRailZ(world, globals));
  return {
    id: worldId,
    shapeId: world.shapeId,
    seed: world.seed,
    shapeParameters: cloneIdentityValue(world.shapeParameters || {}),
    startWU,
    anchorWU,
    anchorRailZ,
    entryDistanceWU: world.entryDistanceWU,
    transform: {
      position: [...(transform.position || [0, 0, 0])],
      rotation: [...(transform.rotation || [0, 0, 0])],
      scale: Number(transform.scale ?? 1),
      mobileScale: Number(transform.mobileScale ?? transform.scale ?? 1),
      mobileYOffset: Number(transform.mobileYOffset || 0),
    },
    correspondence: world.transitionIn?.correspondence || 'index-v1',
  };
}

function createPair(fromWorld, toWorld, profile) {
  const requestedStrategy = fromWorld === toWorld ? 'index-v1' : toWorld.correspondence;
  const identity = {
    protocolVersion: ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
    correspondenceVersion: ABOUT_NARRATIVE_CORRESPONDENCE_VERSION,
    profile,
    fromWorld,
    toWorld,
    requestedStrategy,
  };
  return {
    id: getAboutNarrativeWorldPairId(fromWorld, toWorld),
    fromWorldId: fromWorld.id,
    toWorldId: toWorld.id,
    requestedStrategy,
    inputFingerprint: serializeAboutNarrativeSequenceIdentity(identity),
  };
}

export function createAboutNarrativeWorldPreparationDescriptor({
  worldSequence,
  globals,
  profile = 'desktop',
}) {
  const pointProfile = ABOUT_NARRATIVE_POINT_PROFILES[
    resolveAboutNarrativePointProfile(profile)
  ];
  const camera = {
    startZ: Number(globals.camera.startZ),
    cadence: Number(globals.camera.cadence),
  };
  const worlds = worldSequence.map((world) => createWorldPreparationInput(world, globals));
  if (new Set(worlds.map((world) => world.id)).size !== worlds.length) {
    throw new TypeError('About narrative preparation requires unique stable World ids.');
  }
  const pairs = worlds.map((toWorld, index) => createPair(
    worlds[Math.max(0, index - 1)],
    toWorld,
    pointProfile.id,
  ));
  const identity = {
    protocolVersion: ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
    correspondenceVersion: ABOUT_NARRATIVE_CORRESPONDENCE_VERSION,
    profile: pointProfile.id,
    pointCount: pointProfile.pointCount,
    worlds,
  };
  const worldSequenceKey = `about-narrative-sequence:${serializeAboutNarrativeSequenceIdentity(identity)}`;
  const descriptor = {
    protocolVersion: ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
    correspondenceVersion: ABOUT_NARRATIVE_CORRESPONDENCE_VERSION,
    profile: pointProfile.id,
    quality: pointProfile.id,
    pointCount: pointProfile.pointCount,
    camera,
    worlds,
    runtimeWorlds: worldSequence,
    pairs,
    inputFingerprint: worldSequenceKey,
  };
  return Object.freeze({
    worldSequenceKey,
    descriptor: deepFreeze(descriptor),
  });
}
