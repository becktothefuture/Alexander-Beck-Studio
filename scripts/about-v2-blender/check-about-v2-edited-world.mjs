#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertCameraGatePassage,
  assertCameraRoundTunnelPassage,
  measureCameraGatePassage,
  measureCameraRoundTunnelPassage,
} from './camera-gate-metrics.mjs';
import { compileAboutNarrativeComposerPlan } from '../../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js';
import { resolveAboutNarrativeJourneyMap } from '../../react-app/app/src/routes/about-narrative-lab/aboutNarrativeJourneyMap.js';
import {
  loadAboutNarrativePointFieldPersistenceSource,
  preflightAboutNarrativePointFieldRuntimePlans,
} from '../../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const CANONICAL_ASSET_DIR = path.join(
  REPO_ROOT,
  'react-app/app/public/models/about-v2-edited-world',
);
const usage = `Usage: node scripts/about-v2-blender/check-about-v2-edited-world.mjs [options]

Options:
  --asset-dir <path>     Validate an explicit candidate asset directory.
  --validate-path-only   Resolve and report the selected directory without reading assets.
  --help                 Show this help.
`;

function parseCliArgs(argv) {
  let assetDir = CANONICAL_ASSET_DIR;
  let validatePathOnly = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--asset-dir') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--asset-dir requires a path.');
      assetDir = path.resolve(value);
      index += 1;
    } else if (argument.startsWith('--asset-dir=')) {
      const value = argument.slice('--asset-dir='.length);
      if (!value) throw new Error('--asset-dir requires a path.');
      assetDir = path.resolve(value);
    } else if (argument === '--validate-path-only') {
      validatePathOnly = true;
    } else if (argument === '--help') {
      return { assetDir: path.resolve(assetDir), help: true, validatePathOnly };
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return { assetDir: path.resolve(assetDir), help: false, validatePathOnly };
}

const CLI = parseCliArgs(process.argv.slice(2));
if (CLI.help) {
  process.stdout.write(usage);
  process.exit(0);
}
const ASSET_DIR = CLI.assetDir;
const META_PATH = path.join(ASSET_DIR, 'meta.json');
const EXPECTED_ATTRIBUTES = [
  ['position', 'float32x3', 0],
  ['normalOct', 'snorm16x2', 12],
  ['radius', 'unorm16', 16],
  ['seed', 'unorm16', 18],
  ['modelId', 'uint16', 20],
  ['partId', 'uint16', 22],
  ['stableId', 'uint32', 24],
  ['paletteRole', 'uint8', 28],
  ['motionGroup', 'uint8', 29],
  ['featureClass', 'uint8', 30],
  ['flags', 'uint8', 31],
];
const SUPPORTED_COMPONENT_POLICIES = new Set([
  'authored-instance-perimeter',
  'authored-instance-angular-coverage',
  'thin-feature-curvature',
  'rail-cell-instance-coverage',
  'continuous-outline-object-fallback',
  'semantic-material-projected-feature',
  'semantic-object-projected-feature',
  'semantic-material-projected-coverage',
  'explicit-detail-projected-feature',
]);
const CURRENT_EXPECTED_MODEL_KEYS = [
  'about.00', 'about.01', 'about.02', 'about.03', 'about.04', 'about.05', 'about.06',
];
const EXPECTED_PROFILE_COUNTS = {
  mobile: [2000, 2000, 2000, 10000, 3000, 5000, 6000],
  desktop: [5000, 5000, 6000, 30000, 8000, 16000, 20000],
  master: [7500, 7500, 9000, 45000, 12000, 24000, 30000],
};
const PROFILE_INDEX = { mobile: 0, desktop: 1, master: 2 };
const EXPECTED_GATE_OBJECT_KEYS = Array.from(
  { length: 16 },
  (_, index) => `abs.gate.${String(index).padStart(2, '0')}`,
);
const EXPECTED_GATE_AMBIENT_OBJECT_KEY = 'abs_b27_gate_ambient_triplet';
const EXPECTED_GATE_PROFILE_COUNTS = {
  mobile: [190, 192, 192, 190, 186, 182, 180, 180, 182, 187, 191, 194, 193, 190, 186, 182],
  desktop: [505, 512, 513, 507, 497, 487, 479, 479, 487, 498, 510, 517, 515, 508, 497, 486],
  master: [758, 768, 770, 761, 746, 730, 719, 719, 730, 747, 765, 775, 773, 762, 745, 729],
};
const EXPECTED_VISIBILITY_BINDINGS = new Map([
  ['about.00', ['opening', 0, 'inciting-question', 0.6]],
  ['about.01', ['inciting-question', -0.6, 'portal-entry', 0.6]],
  ['about.02', ['portal-entry', -0.6, 'portal-exit', 0.6]],
  ['about.03', ['portal-exit', -0.6, 'gate-entry', 0.75]],
  ['about.04', ['gate-entry', -0.75, 'gate-exit', 0.8]],
  ['about.05', ['gate-exit', -1.1, 'split-lattice-entry', -0.45]],
  ['about.06', ['split-lattice-entry', -1.65, 'terminal-hold', 1]],
]);
const REQUIRED_CAMERA_CUES = [
  'ABS_STAGE_00',
  'ABS_STAGE_01',
  'ABS_STAGE_02',
  'ABS_ROUND_PORTALS_EXIT',
  'ABS_ROUND_PORTALS_CLEAR',
  'ABS_STAGE_03',
  'ABS_STAGE_04',
  'ABS_GATE_PASSAGE_CLEAR',
  'ABS_STAGE_05',
  'ABS_SPLIT_LATTICE_ENTRY',
  'ABS_STAGE_06',
  'ABS_FINALE_DECEL',
  'ABS_CAMERA_LOCK',
  'ABS_TERMINAL_FRAME',
];
const SURFACE_ROLE_PATTERN = /(?:world|surface|ground|floor|terrain|landscape|finale)/i;
const SURFACE_GEOMETRY_PATTERN = /(?:floor|ground|horizon|terrain|landscape|surface|finale)/i;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function assetBytes(fileRecord) {
  assert.ok(fileRecord?.file, 'Asset metadata is missing a filename.');
  assert.equal(
    path.basename(fileRecord.file),
    fileRecord.file,
    `${fileRecord.file} must be portable and relative to the asset directory.`,
  );
  const bytes = fs.readFileSync(path.join(ASSET_DIR, fileRecord.file));
  assert.equal(bytes.byteLength, fileRecord.bytes, `${fileRecord.file} has a stale byte count.`);
  assert.equal(sha256(bytes), fileRecord.sha256, `${fileRecord.file} has a stale hash.`);
  return bytes;
}

function extent(object, axis) {
  return object.bounds.max[axis] - object.bounds.min[axis];
}

function isSemanticSurface(object) {
  return SURFACE_ROLE_PATTERN.test(object.role)
    && SURFACE_GEOMETRY_PATTERN.test(object.geometryKind || '');
}

function largestSemanticSurface(metadata, modelKey, description) {
  const candidates = metadata.source.objects.filter(
    (object) => object.modelKey === modelKey && isSemanticSurface(object),
  );
  assert.ok(candidates.length > 0, `${description} has no authored semantic surface.`);
  return candidates.reduce((largest, candidate) => (
    extent(candidate, 0) * extent(candidate, 2) > extent(largest, 0) * extent(largest, 2)
      ? candidate
      : largest
  ));
}

function validateMetadata(metadata) {
  assert.equal(
    metadata.schema,
    'about-point-scene',
    'Expected the About point-scene v2 contract. Regenerate the Blender assets; v1 LOD files are obsolete.',
  );
  assert.equal(metadata.version, 2);
  assert.equal(metadata.layout.format, 'little-endian-packed');
  assert.equal(metadata.layout.strideBytes, 32);
  assert.deepEqual(
    metadata.layout.attributes.map(({ name, type, offset }) => [name, type, offset]),
    EXPECTED_ATTRIBUTES,
  );
  assert.deepEqual(metadata.quantization.radiusWU, {
    min: 0,
    max: 6.5535,
    step: 0.0001,
  });
  assert.deepEqual(metadata.palette.roles, [
    'atmosphere', 'stone', 'steel', 'glass', 'signal', 'organic',
  ]);
  assert.equal(metadata.source.samplingPolicy.fog, 'runtime-depth-only');
  assert.equal(metadata.source.samplingPolicy.profileSelection, 'nested-per-model-prefix');
  assert.deepEqual(
    new Set(Object.keys(metadata.source.samplingPolicy.componentPolicies || {})),
    SUPPORTED_COMPONENT_POLICIES,
    'Exporter component-policy support is incomplete or contains an unreviewed policy.',
  );
  assert.ok(!path.isAbsolute(metadata.source.file), 'Source metadata leaks an absolute workstation path.');
  assert.ok(Array.isArray(metadata.models) && metadata.models.length > 0);
  assert.ok(Array.isArray(metadata.pages) && metadata.pages.length > 0);
  assert.ok(Array.isArray(metadata.motionGroups) && metadata.motionGroups.length > 0);
  assert.ok(Array.isArray(metadata.source.objects) && metadata.source.objects.length > 0);
  assert.equal(metadata.source.objectCount, metadata.source.objects.length);
  assert.equal(metadata.files.surfels.file, 'surfels.bin');
  assert.equal('depthPositions' in metadata.files, false, 'Destructive triangle depth proxy returned.');
  assert.equal('depthIndices' in metadata.files, false, 'Destructive triangle depth proxy returned.');
  assert.equal(metadata.files.cameraTrack.file, 'camera-track.json');
}

function validateSource(metadata) {
  const sourcePath = path.resolve(REPO_ROOT, metadata.source.file);
  assert.ok(
    sourcePath.startsWith(`${REPO_ROOT}${path.sep}`),
    'Source file must resolve inside the repository.',
  );
  const sourceBytes = fs.readFileSync(sourcePath);
  assert.equal(
    sha256(sourceBytes),
    metadata.source.sha256,
    'Point assets are stale against the authored Blender scene.',
  );
  const objectKeys = new Set();
  for (const object of metadata.source.objects) {
    assert.ok(object.objectKey && object.modelKey && object.role && object.motionKey);
    assert.ok(!objectKeys.has(object.objectKey), `Duplicate semantic object key ${object.objectKey}.`);
    objectKeys.add(object.objectKey);
    assert.ok(object.triangles > 0 && object.surfaceArea > 0 && object.surfelCount > 0);
    assert.ok(object.samplingSurfaceArea > 0 && object.samplingSurfaceArea <= object.surfaceArea);
    assert.ok(object.spacingTarget > 0);
    assert.ok(object.componentPolicy, `${object.objectKey} has no semantic component policy.`);
    assert.ok(
      SUPPORTED_COMPONENT_POLICIES.has(object.componentPolicy),
      `${object.objectKey} uses unsupported component policy ${object.componentPolicy}.`,
    );
    assert.ok(Number.isInteger(object.connectedComponentCount) && object.connectedComponentCount > 0);
    assert.ok(Number.isInteger(object.protectedComponentCount) && object.protectedComponentCount > 0);
    assert.ok(Number.isInteger(object.componentAnchorCount) && object.componentAnchorCount > 0);
    assert.equal(
      object.componentAnchorCount,
      object.protectedComponentCount,
      `${object.objectKey} does not anchor every protected component.`,
    );
    assert.ok(!/(?:^|[_-])(track|rail|sleeper)(?:$|[_-])/i.test(object.name));
    assert.ok(!object.collections.includes('99_REMOVED_BOTTOM_TRACK_BACKUP'));
    assert.ok(
      object.bounds?.min?.length === 3
        && object.bounds?.max?.length === 3
        && object.bounds.min.every(Number.isFinite)
        && object.bounds.max.every(Number.isFinite),
      `${object.objectKey} has invalid world bounds.`,
    );
    assert.ok(
      [0, 1, 2].every((axis) => object.bounds.max[axis] > object.bounds.min[axis]),
      `${object.objectKey} has empty world bounds.`,
    );
  }
  assert.equal(
    metadata.source.objects.reduce((sum, object) => sum + object.triangles, 0),
    metadata.source.triangleCount,
  );
  const route = metadata.source.route;
  assert.ok(route, 'The source does not expose its evaluated camera route.');
  assert.equal(route.object, 'ABS_PARAMETRIC_RIDE_PATH');
  assert.ok(
    Number.isInteger(route.controlPointCount) && route.controlPointCount >= 4,
    'The camera route must be an evaluated curve with at least four control points.',
  );
  assert.ok(Number.isFinite(route.evaluatedLength) && route.evaluatedLength > 100,
    'The evaluated camera route is missing or too short for the seven-stage journey.');
  assert.match(route.shapeSha256, /^[a-f0-9]{64}$/);
  assert.equal(route.splineCount, 1, 'The camera journey must remain one continuous spline.');
  const stageIds = CURRENT_EXPECTED_MODEL_KEYS.map((_, index) => String(index).padStart(2, '0'));
  assert.deepEqual(Object.keys(route.stageRanges || {}), stageIds,
    'The camera route must expose seven ordered stage ranges.');
  let previousStart = -Infinity;
  let previousEnd = -Infinity;
  for (const stageId of stageIds) {
    const range = route.stageRanges[stageId];
    assert.ok(Array.isArray(range) && range.length === 2 && range.every(Number.isFinite),
      `Route stage ${stageId} has an invalid range.`);
    assert.ok(range[0] >= 0 && range[1] <= 1 && range[0] < range[1],
      `Route stage ${stageId} falls outside the normalized journey.`);
    assert.ok(range[0] >= previousStart && range[1] >= previousEnd,
      `Route stage ${stageId} is out of physical order.`);
    previousStart = range[0];
    previousEnd = range[1];
  }
  assert.equal(route.stageRanges[stageIds[0]][0], 0,
    'The first route stage must begin at the path origin.');
  assert.equal(route.stageRanges[stageIds.at(-1)][1], 1,
    'The final route stage must reach the path endpoint.');

  const orderedModelKeys = metadata.models.map((model) => model.key);
  const modelKeys = new Set(orderedModelKeys);
  const topology = metadata.source.topology;
  if (topology) {
    assert.equal(topology.modelCount, metadata.models.length);
    assert.equal(topology.objectCount, metadata.source.objects.length);
    assert.deepEqual(new Set(topology.modelKeys), modelKeys);
    assert.deepEqual(new Set(topology.objectKeys), objectKeys);
    assert.deepEqual(
      topology.models,
      metadata.models.map((model) => ({
        key: model.key,
        objectKeys: [...model.objectKeys],
      })),
    );
  }
  assert.deepEqual(
    orderedModelKeys,
    CURRENT_EXPECTED_MODEL_KEYS,
    'The exported model set does not match the seven-stage recovery world.',
  );
  for (const model of metadata.models) {
    assert.deepEqual(
      model.objectKeys,
      metadata.source.objects
        .filter((object) => object.modelKey === model.key)
        .map((object) => object.objectKey),
      `${model.key} object order diverges from the saved source topology.`,
    );
  }
  assert.ok(Array.isArray(metadata.source.semanticFallbacks),
    'The source metadata does not report semantic fallbacks.');
  assert.equal(metadata.source.semanticFallbacks.length, 0, 'Recovery objects require explicit semantics.');
  const byKey = Object.fromEntries(metadata.source.objects.map((object) => [object.objectKey, object]));

  const gateModel = metadata.models[4];
  assert.equal(gateModel.key, 'about.04');
  assert.deepEqual(
    gateModel.objectKeys.filter((objectKey) => EXPECTED_GATE_OBJECT_KEYS.includes(objectKey)),
    EXPECTED_GATE_OBJECT_KEYS,
    'The square-gate stage must contain exactly 16 ordered semantic gate objects.',
  );
  assert.deepEqual(
    gateModel.objectKeys.filter((objectKey) => !EXPECTED_GATE_OBJECT_KEYS.includes(objectKey)),
    [EXPECTED_GATE_AMBIENT_OBJECT_KEY],
    'The square-gate stage must contain only the bounded ambient continuity triplet besides its 16 gates.',
  );
  const gateObjects = EXPECTED_GATE_OBJECT_KEYS.map((objectKey) => byKey[objectKey]);
  gateObjects.forEach((object, index) => {
    assert.ok(object, `Square gate ${index + 1} is missing from the saved source.`);
    assert.equal(object.modelKey, 'about.04');
    assert.equal(object.role, 'path-tunnel');
    assert.equal(object.geometryKind, 'rounded-square-loop');
    assert.equal(object.connectedComponentCount, 1,
      `${object.objectKey} must remain one continuous gate.`);
    assert.equal(object.instanceCount, 1, `${object.objectKey} must represent one gate aperture.`);
  });
  const gateAmbient = byKey[EXPECTED_GATE_AMBIENT_OBJECT_KEY];
  assert.equal(gateAmbient.modelKey, 'about.04');
  assert.equal(gateAmbient.geometryKind, 'gate-peripheral-ambient-continuity');
  assert.equal(gateAmbient.connectedComponentCount, 3);
  assert.equal(gateAmbient.requiredAnchorCount, 3);
  assert.equal(gateAmbient.surfelCount, 3);

  const roundTunnelObjects = metadata.source.objects.filter((object) => (
    object.modelKey === 'about.02' && object.geometryKind === 'curved-round-tunnel-hoop'
  ));
  assert.ok(roundTunnelObjects.length >= 8,
    'The round-tunnel stage needs at least eight authored aperture objects.');
  assert.ok(roundTunnelObjects.every((object) => (
    object.connectedComponentCount === 1 && object.instanceCount === 1
  )), 'Each round-tunnel aperture must remain one continuous authored hoop.');

  const continuousFloor = largestSemanticSurface(metadata, 'about.03', 'The continuous middle journey');
  assert.equal(continuousFloor.connectedComponentCount, 1,
    'The middle journey floor must remain one continuous semantic surface.');
  assert.ok(extent(continuousFloor, 0) >= 128,
    'The continuous floor no longer overscans the camera corridor horizontally.');
  assert.ok(extent(continuousFloor, 2) >= Math.max(80, route.evaluatedLength * 0.2),
    'The continuous floor no longer spans a substantial section of the route.');

  const finaleSurface = largestSemanticSurface(metadata, 'about.06', 'The finale');
  assert.equal(finaleSurface.connectedComponentCount, 1,
    'The finale ground must remain one continuous semantic surface.');
  assert.ok(extent(finaleSurface, 0) >= 440,
    'The finale surface no longer provides desktop and mobile horizontal overscan.');
  assert.ok(extent(finaleSurface, 2) >= Math.max(120, route.evaluatedLength * 0.2),
    'The finale surface no longer provides a boundless depth field.');

  const orderedModels = metadata.models;
  for (const model of orderedModels) {
    assert.ok(Number.isFinite(model.visibilityStartWU), `${model.key} has no visibility start.`);
    assert.ok(Number.isFinite(model.visibilityEndWU), `${model.key} has no visibility end.`);
    assert.ok(model.visibilityEndWU > model.visibilityStartWU, `${model.key} has an empty visibility window.`);
    assert.ok(Number.isFinite(model.visibilityHandoffWU)
      && model.visibilityHandoffWU > 0 && model.visibilityHandoffWU <= 0.2,
    `${model.key} has an unsafe visibility handoff.`);
    assert.deepEqual([model.visibilityStartCue, model.visibilityStartOffsetWU,
      model.visibilityEndCue, model.visibilityEndOffsetWU],
    EXPECTED_VISIBILITY_BINDINGS.get(model.key),
    `${model.key} is not bound to its semantic story handoff.`);
  }
  const methodModel = metadata.models.find((model) => model.key === 'about.05');
  const finaleModel = metadata.models.find((model) => model.key === 'about.06');
  assert.ok(methodModel.visibilityEndWU > finaleModel.visibilityStartWU,
    'Method and finale require a soft authored handoff.');
  for (const [profileName, expectedCounts] of Object.entries(EXPECTED_PROFILE_COUNTS)) {
    assert.deepEqual(
      metadata.profiles[profileName].perModelCounts,
      Object.fromEntries(metadata.models.map((model, index) => [model.key, expectedCounts[index]])),
      `${profileName} model allocations changed.`,
    );
  }
  assert.ok(
    metadata.source.objects.every((object) => (
      Number.isFinite(object.surfelRadiusScale)
        && object.surfelRadiusScale >= 0.12
        && object.surfelRadiusScale <= 2.5
    )),
    'Every Blender object must author a bounded website circle-radius scale.',
  );
}

function validateTerrainGateClearance(metadata, surfelBytes) {
  if (!metadata.source.readingSpaceFit?.terrainEndOnPath) return;
  const terrain = metadata.models.find((model) => model.key === 'about.03');
  const gates = EXPECTED_GATE_OBJECT_KEYS.map((objectKey) => (
    metadata.source.objects.find((object) => object.objectKey === objectKey)
  ));
  assert.ok(terrain && gates.every(Boolean), 'Fitted terrain requires all 16 semantic gates.');
  let minimumClearance = Infinity;
  for (let index = terrain.surfelRange.offset; index < terrain.surfelRange.offset + terrain.surfelRange.count; index += 1) {
    for (const gate of gates) {
      let squaredDistance = 0;
      for (let axis = 0; axis < 3; axis += 1) {
        const coordinate = surfelBytes.readFloatLE(index * 32 + axis * 4);
        const distance = Math.max(
          gate.bounds.min[axis] - coordinate,
          0,
          coordinate - gate.bounds.max[axis],
        );
        squaredDistance += distance * distance;
      }
      minimumClearance = Math.min(minimumClearance, Math.sqrt(squaredDistance));
    }
  }
  assert.ok(minimumClearance >= 10,
    `The fitted valley encroaches on the gate volume (${minimumClearance.toFixed(2)} WU clearance).`);
}

function validateSurfels(metadata, bytes) {
  const stride = metadata.layout.strideBytes;
  const count = metadata.files.surfels.count;
  assert.equal(bytes.byteLength, count * stride);
  assert.equal(metadata.profiles.master.surfelCount, count);
  assert.equal(metadata.profiles.mobile.surfelCount, 30000);
  assert.equal(metadata.profiles.desktop.surfelCount, 90000);
  assert.equal(metadata.profiles.master.surfelCount, 135000);
  assert.ok(
    metadata.profiles.mobile.surfelCount
      <= metadata.profiles.desktop.surfelCount
      && metadata.profiles.desktop.surfelCount <= count,
  );
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const stableIds = new Set();
  let minimumSeed = 65535;
  let maximumSeed = 0;
  const modelCounts = new Array(metadata.models.length).fill(0);
  const modelPaletteRoles = Array.from({ length: metadata.models.length }, () => new Set());
  const semanticAnchorParts = new Map();
  const componentAnchorParts = new Map();
  const componentAnchorPrefixes = {
    mobile: new Map(),
    desktop: new Map(),
  };
  let previousOffset = 0;
  for (const [modelIndex, model] of metadata.models.entries()) {
    assert.equal(model.id, modelIndex, 'Model IDs and ranges must be ordered.');
    assert.equal(model.surfelRange.offset, previousOffset, `${model.key} is not contiguous.`);
    assert.equal(model.surfelRange.byteOffset, previousOffset * stride);
    assert.ok(model.surfelRange.count > 0);
    assert.ok(model.profileCounts.mobile > 0);
    assert.ok(model.profileCounts.mobile <= model.profileCounts.desktop);
    assert.ok(model.profileCounts.desktop <= model.profileCounts.master);
    assert.equal(model.profileCounts.master, model.surfelRange.count);
    previousOffset += model.surfelRange.count;
  }
  assert.equal(previousOffset, count);
  for (let index = 0; index < count; index += 1) {
    const offset = index * stride;
    for (const axisOffset of [0, 4, 8]) {
      assert.ok(Number.isFinite(view.getFloat32(offset + axisOffset, true)));
    }
    const radius = view.getUint16(offset + 16, true);
    const seed = view.getUint16(offset + 18, true);
    const modelId = view.getUint16(offset + 20, true);
    const partId = view.getUint16(offset + 22, true);
    const stableId = view.getUint32(offset + 24, true);
    const paletteRole = view.getUint8(offset + 28);
    const motionGroup = view.getUint8(offset + 29);
    const featureClass = view.getUint8(offset + 30);
    const flags = view.getUint8(offset + 31);
    assert.ok(radius > 0, `Surfel ${index} has a zero radius.`);
    minimumSeed = Math.min(minimumSeed, seed);
    maximumSeed = Math.max(maximumSeed, seed);
    assert.ok(modelId < metadata.models.length, `Surfel ${index} has an invalid model.`);
    assert.ok(partId < metadata.models[modelId].objectKeys.length, `Surfel ${index} has an invalid part.`);
    assert.ok(paletteRole < metadata.palette.roles.length, `Surfel ${index} has an invalid palette role.`);
    modelPaletteRoles[modelId].add(paletteRole);
    assert.ok(motionGroup < metadata.motionGroups.length, `Surfel ${index} has an invalid motion group.`);
    assert.ok(featureClass <= 3, `Surfel ${index} has an invalid feature class.`);
    assert.ok(!stableIds.has(stableId), `Stable surfel ID ${stableId} is duplicated.`);
    stableIds.add(stableId);
    if ((flags & 2) !== 0) {
      const key = `${modelId}:${partId}`;
      semanticAnchorParts.set(key, (semanticAnchorParts.get(key) || 0) + 1);
    }
    if ((flags & 4) !== 0) {
      const key = `${modelId}:${partId}`;
      componentAnchorParts.set(key, (componentAnchorParts.get(key) || 0) + 1);
      const relativeIndex = index - metadata.models[modelId].surfelRange.offset;
      for (const profileName of ['mobile', 'desktop']) {
        if (relativeIndex < metadata.models[modelId].profileCounts[profileName]) {
          const prefixCounts = componentAnchorPrefixes[profileName];
          prefixCounts.set(key, (prefixCounts.get(key) || 0) + 1);
        }
      }
    }
    modelCounts[modelId] += 1;
  }
  assert.ok(minimumSeed < 1024, `Surfel reveal seeds do not reach the low tail (${minimumSeed}).`);
  assert.ok(maximumSeed > 64511, `Surfel reveal seeds do not reach the high tail (${maximumSeed}).`);
  metadata.models.forEach((model) => {
    assert.equal(modelCounts[model.id], model.surfelRange.count);
    assert.equal(
      modelPaletteRoles[model.id].size,
      metadata.palette.roles.length,
      `${model.key} does not carry all six shared palette roles.`,
    );
    model.objectKeys.forEach((objectKey, partId) => {
      const object = metadata.source.objects.find((item) => item.objectKey === objectKey);
      assert.ok(
        semanticAnchorParts.get(`${model.id}:${partId}`) >= object.semanticAnchorCount,
        `${model.key} part ${partId} has no relocated semantic material anchor.`,
      );
      assert.ok(
        (componentAnchorParts.get(`${model.id}:${partId}`) || 0) >= object.componentAnchorCount,
        `${model.key} part ${partId} has no protected component anchors.`,
      );
      for (const profileName of ['mobile', 'desktop']) {
        const prefixAnchors = componentAnchorPrefixes[profileName]
          .get(`${model.id}:${partId}`) || 0;
        if (PROFILE_INDEX[profileName] < PROFILE_INDEX[object.minimumProfile]) {
          assert.equal(prefixAnchors, 0,
            `${profileName} prefix includes ineligible ${object.objectKey} anchors.`);
        } else {
          assert.ok(prefixAnchors >= object.componentAnchorCount,
            `${profileName} prefix omits a protected component anchor from ${object.objectKey}.`);
        }
      }
    });
  });
  for (const profileName of ['mobile', 'desktop', 'master']) {
    const profile = metadata.profiles[profileName];
    assert.equal(
      metadata.source.samplingPolicy.profileMinimum,
      'semantic-and-meaningful-component-anchor-union',
    );
    assert.equal(profile.selection, 'nested-per-model-prefix');
    assert.equal(
      Object.values(profile.perModelCounts).reduce((sum, value) => sum + value, 0),
      profile.surfelCount,
    );
    assert.equal(
      Object.values(profile.perObjectCounts).reduce((sum, value) => sum + value, 0),
      profile.surfelCount,
    );
    metadata.models.forEach((model) => {
      assert.equal(profile.perModelCounts[model.key], model.profileCounts[profileName]);
    });
    metadata.source.objects.forEach((object) => {
      const objectCount = profile.perObjectCounts[object.objectKey];
      if (PROFILE_INDEX[profileName] < PROFILE_INDEX[object.minimumProfile]) {
        assert.equal(objectCount, 0,
          `${profileName} includes ${object.objectKey} before its ${object.minimumProfile} tier.`);
      } else {
        assert.ok(objectCount >= object.requiredAnchorCount,
          `${profileName} omits a required recognition anchor from ${object.objectKey}.`);
        assert.ok(objectCount >= object.componentAnchorCount,
          `${profileName} cannot retain protected components for ${object.objectKey}.`);
      }
    });
  }
  for (const object of metadata.source.objects) {
    const mobileCount = metadata.profiles.mobile.perObjectCounts[object.objectKey];
    const desktopCount = metadata.profiles.desktop.perObjectCounts[object.objectKey];
    const masterCount = metadata.profiles.master.perObjectCounts[object.objectKey];
    assert.ok(mobileCount <= desktopCount && desktopCount <= masterCount,
      `${object.objectKey} profile counts are not nested.`);
    if (object.minimumProfile === 'desktop') {
      assert.equal(mobileCount, 0, `${object.objectKey} leaked into mobile.`);
      assert.ok(desktopCount > 0, `${object.objectKey} is missing from desktop.`);
    }
  }
  for (const [profileName, expectedCounts] of Object.entries(EXPECTED_GATE_PROFILE_COUNTS)) {
    assert.deepEqual(
      Array.from({ length: 16 }, (_, index) => metadata.profiles[profileName].perObjectCounts[
        `abs.gate.${String(index).padStart(2, '0')}`
      ]),
      expectedCounts,
      `${profileName} gate allocation changed, including the final two gates.`,
    );
  }
  if (metadata.source.samplingPolicy.allocation === 'saved-source-profile-budgets') {
    const allocation = metadata.source.surfelAllocation;
    assert.equal(allocation?.schema, 'about-surfel-allocation/v1');
    assert.match(allocation.basisSourceSha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(new Set(Object.keys(allocation.objects)),
      new Set(metadata.source.objects.map(object => object.objectKey)));
    for (const object of metadata.source.objects) {
      const authored = allocation.objects[object.objectKey];
      assert.ok(Number.isFinite(authored.weight) && authored.weight > 0);
      assert.equal(authored.master, object.surfelCount,
        `${object.objectKey} diverges from its saved-source population.`);
    }
    for (const profileName of ['mobile', 'desktop', 'master']) {
      assert.equal(allocation.profiles[profileName].count, metadata.profiles[profileName].surfelCount);
      assert.deepEqual(allocation.profiles[profileName].models, metadata.profiles[profileName].perModelCounts,
        `${profileName} diverges from its saved-source model populations.`);
    }
    return;
  }
  if (metadata.source.samplingPolicy.allocation === 'saved-source-model-profile-budgets') {
    const contract = metadata.source.surfelBudgetContract;
    assert.deepEqual(
      contract,
      Object.fromEntries(Object.entries(EXPECTED_PROFILE_COUNTS).map(([profile, counts]) => [
        profile,
        Object.fromEntries(metadata.models.map((model, index) => [model.key, counts[index]])),
      ])),
      'Saved seven-model budget contract changed.',
    );
    for (const model of metadata.models) {
      const objects = metadata.source.objects.filter((object) => object.modelKey === model.key);
      const weights = objects.map((object) => object.surfaceArea
        * object.sceneDensityWeight * object.densityFactor * object.featurePriority);
      const expected = objects.map((object) => object.requiredAnchorCount);
      for (let remaining = model.profileCounts.master
        - expected.reduce((sum, count) => sum + count, 0); remaining > 0; remaining -= 1) {
        let selected = 0;
        for (let index = 1; index < objects.length; index += 1) {
          const selectedRatio = (expected[selected] + 0.5) / weights[selected];
          const candidateRatio = (expected[index] + 0.5) / weights[index];
          if (candidateRatio < selectedRatio) selected = index;
        }
        expected[selected] += 1;
      }
      objects.forEach((object, index) => {
        const objectCount = metadata.profiles.master.perObjectCounts[object.objectKey];
        assert.ok(Math.abs(objectCount - expected[index]) <= 1,
          `${object.objectKey} diverges from its anchor-aware within-model density allocation.`);
      });
    }
    return;
  }
  const weightedSurfaceArea = metadata.source.objects.reduce(
    (sum, object) => sum + (
      object.surfaceArea
      * object.sceneDensityWeight
      * object.densityFactor
      * object.featurePriority
    ),
    0,
  );
  const masterDensity = metadata.profiles.master.surfelCount / weightedSurfaceArea;
  metadata.source.objects.forEach((object) => {
    const weightedArea = object.surfaceArea
      * object.sceneDensityWeight
      * object.densityFactor
      * object.featurePriority;
    const objectCount = metadata.profiles.master.perObjectCounts[object.objectKey];
    const density = objectCount / weightedArea;
    const anchorConstrained = objectCount === object.requiredAnchorCount
      && object.requiredAnchorCount > weightedArea * masterDensity;
    assert.ok(
      anchorConstrained || Math.abs(density - masterDensity) <= 0.12,
      `${object.objectKey} diverges from its role-weighted world-space density rule.`,
    );
  });
}

function validatePages(metadata) {
  let previousPage = null;
  for (const page of metadata.pages) {
    assert.ok(page.ranges.length > 0, `${page.id} is empty.`);
    const rangeModelIds = page.ranges.map((range) => range.modelId);
    assert.deepEqual(rangeModelIds, page.modelIds);
    for (let index = 1; index < page.ranges.length; index += 1) {
      assert.ok(
        page.ranges[index - 1].offset < page.ranges[index].offset,
        `${page.id} ranges are not in stable file order.`,
      );
    }
    for (const range of page.ranges) {
      const model = metadata.models[range.modelId];
      assert.equal(range.offset, model.surfelRange.offset);
      assert.equal(range.count, model.surfelRange.count);
      assert.equal(range.byteOffset, model.surfelRange.byteOffset);
      assert.deepEqual(range.profileCounts, model.profileCounts);
    }
    for (const profileName of ['mobile', 'desktop', 'master']) {
      assert.equal(
        page.ranges.reduce(
          (sum, range) => sum + range.profileCounts[profileName],
          0,
        ),
        page.profileCounts[profileName],
      );
    }
    assert.ok(page.profileCounts.desktop <= 90000, `${page.id} exceeds the desktop GPU page budget.`);
    assert.ok(page.profileCounts.mobile <= 30000, `${page.id} exceeds the mobile GPU page budget.`);
    if (previousPage) {
      assert.ok(
        page.sharedModelIdsWithPrevious.length > 0,
        `${page.id} has no stable fog-safe handoff samples.`,
      );
      for (const modelId of page.sharedModelIdsWithPrevious) {
        const previous = previousPage.ranges.find((range) => range.modelId === modelId);
        const current = page.ranges.find((range) => range.modelId === modelId);
        assert.deepEqual(current, previous, `${page.id} changes a handoff sample range.`);
      }
      assert.ok(page.handoffOverlapWU >= 0.25, `${page.id} has no fog-safe page overlap.`);
      assert.ok(previousPage.releaseEndWU >= page.preloadStartWU);
    }
    previousPage = page;
  }
}

function validateSemanticVisibility(metadata, cameraTrack) {
  const document = readJson(path.join(
    REPO_ROOT, 'react-app/app/public/config/contents-about.json',
  ));
  const loaded = loadAboutNarrativePointFieldPersistenceSource(document, {
    preflight: preflightAboutNarrativePointFieldRuntimePlans,
  });
  assert.equal(loaded.valid, true, loaded.message);
  const smoothstep = (start, end, value) => {
    if (value <= start) return 0;
    if (value >= end) return 1;
    const amount = (value - start) / (end - start);
    return amount * amount * (3 - 2 * amount);
  };
  const results = [];
  const gateMeasurement = measureCameraGatePassage(cameraTrack);
  for (const [profile, inlineSize, blockSize] of [
    ['desktop', 1440, 1000], ['mobile', 390, 844],
  ]) {
    const plan = compileAboutNarrativeComposerPlan(loaded.document, { inlineSize, blockSize });
    assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics));
    const map = resolveAboutNarrativeJourneyMap(plan.journeyMap, cameraTrack);
    assert.equal(map.valid, true, JSON.stringify(map.diagnostics));
    assert.equal(map.certifiable, true, JSON.stringify(map.diagnostics));
    const anchors = new Map(map.anchors.map((anchor) => [anchor.id, anchor.cameraStoryWU]));
    const shapingFocusWU = plan.textFields.find(
      (field) => field.id === 'text-epilogue-shaping',
    ).focusWU;
    const methodFocusWU = anchors.get('method');
    const thinkingFocusWU = plan.textFields.find(
      (field) => field.id === 'text-epilogue-thinking',
    ).focusWU;
    const finaleStartWU = anchors.get('finale-deceleration');
    const finalHoldWU = anchors.get('terminal-hold');
    const firstGatePassageWU = map.durationWU
      * gateMeasurement.gates[0].crossing.distanceWU / map.pathLengthWU;
    const resolvedWindows = metadata.models.map((model) => ({
      model,
      startWU: anchors.get(model.visibilityStartCue) + model.visibilityStartOffsetWU,
      endWU: anchors.get(model.visibilityEndCue) + model.visibilityEndOffsetWU,
    }));
    const windows = Object.fromEntries(resolvedWindows.map((window, index) => {
      const { model, startWU, endWU } = window;
      const previous = resolvedWindows[index - 1];
      const next = resolvedWindows[index + 1];
      const entranceHandoffWU = previous
        ? Math.max(0.001, (previous.endWU - startWU) * 0.5) : model.visibilityHandoffWU;
      const exitHandoffWU = next
        ? Math.max(0.001, (endWU - next.startWU) * 0.5) : model.visibilityHandoffWU;
      const visibilityAt = (storyWU) => {
        const entrance = startWU <= 0 ? 1 : smoothstep(
          startWU, startWU + model.visibilityHandoffWU, storyWU,
        );
        const exit = 1 - smoothstep(
          Math.max(startWU, endWU - model.visibilityHandoffWU), endWU, storyWU,
        );
        return Math.min(entrance, exit);
      };
      const effectiveVisibilityAt = (storyWU) => {
        const entrance = startWU <= 0 ? 1 : smoothstep(
          startWU, startWU + entranceHandoffWU, storyWU,
        );
        const exit = 1 - smoothstep(
          Math.max(startWU, endWU - exitHandoffWU), endWU, storyWU,
        );
        return Math.min(entrance, exit);
      };
      return [model.key, {
        startWU,
        endWU,
        handoffWU: model.visibilityHandoffWU,
        entranceHandoffWU,
        exitHandoffWU,
        firstGatePassageVisibility: effectiveVisibilityAt(firstGatePassageWU),
        methodFocusVisibility: effectiveVisibilityAt(methodFocusWU),
        finaleStartVisibility: visibilityAt(finaleStartWU),
        effectiveFinaleStartVisibility: effectiveVisibilityAt(finaleStartWU),
        shapingFocusVisibility: visibilityAt(shapingFocusWU),
        effectiveShapingFocusVisibility: effectiveVisibilityAt(shapingFocusWU),
        thinkingFocusVisibility: visibilityAt(thinkingFocusWU),
        effectiveThinkingFocusVisibility: effectiveVisibilityAt(thinkingFocusWU),
        finalHoldVisibility: visibilityAt(finalHoldWU),
        effectiveFinalHoldVisibility: effectiveVisibilityAt(finalHoldWU),
      }];
    }));
    assert.ok(windows['about.04'].firstGatePassageVisibility >= 0.95,
      `${profile} has not fully admitted the gates before the first physical passage.`);
    assert.ok(windows['about.05'].methodFocusVisibility > 0,
      `${profile} has no Method population at its semantic cue.`);
    assert.equal(windows['about.04'].shapingFocusVisibility, 0,
      `${profile} still shows passed square gates at shaping focus.`);
    assert.equal(windows['about.05'].shapingFocusVisibility, 0,
      `${profile} still shows Method geometry after the finale handoff is established.`);
    assert.equal(windows['about.06'].shapingFocusVisibility, 1,
      `${profile} has not fully established the finale by shaping focus.`);
    assert.equal(windows['about.06'].thinkingFocusVisibility, 1,
      `${profile} has not retained the finale through thinking focus.`);
    assert.equal(windows['about.06'].finalHoldVisibility, 1,
      `${profile} has not retained the finale through the terminal hold.`);
    for (const retiredKey of CURRENT_EXPECTED_MODEL_KEYS.slice(0, -1)) {
      assert.equal(windows[retiredKey].finaleStartVisibility, 0,
        `${profile} still shows prior-stage ${retiredKey} at the finale.`);
      assert.equal(windows[retiredKey].effectiveFinaleStartVisibility, 0,
        `${profile} still shows prior-stage ${retiredKey} at the finale with the runtime ramp.`);
      assert.equal(windows[retiredKey].thinkingFocusVisibility, 0,
        `${profile} still shows ${retiredKey} at thinking focus.`);
      assert.equal(windows[retiredKey].finalHoldVisibility, 0,
        `${profile} still shows ${retiredKey} at the terminal hold.`);
      assert.equal(windows[retiredKey].effectiveShapingFocusVisibility, 0,
        `${profile} still shows ${retiredKey} at Shaping with the runtime ramp.`);
      assert.equal(windows[retiredKey].effectiveThinkingFocusVisibility, 0,
        `${profile} still shows ${retiredKey} at Thinking with the runtime ramp.`);
      assert.equal(windows[retiredKey].effectiveFinalHoldVisibility, 0,
        `${profile} still shows ${retiredKey} at the terminal hold with the runtime ramp.`);
    }
    assert.ok(windows['about.06'].effectiveShapingFocusVisibility > 0,
      `${profile} has no finale population at Shaping with the runtime ramp.`);
    assert.equal(windows['about.06'].effectiveThinkingFocusVisibility, 1,
      `${profile} has not fully established the finale by Thinking with the runtime ramp.`);
    assert.equal(windows['about.06'].effectiveFinalHoldVisibility, 1,
      `${profile} has not retained the finale through the effective terminal hold.`);
    const lateHandoffOverlapWU = windows['about.05'].endWU - windows['about.06'].startWU;
    const requiredLateHandoffOverlapWU = (
      windows['about.05'].handoffWU + windows['about.06'].handoffWU
    );
    assert.ok(lateHandoffOverlapWU >= requiredLateHandoffOverlapWU,
      `${profile} method/finale handoff has no fully established overlap `
      + `(${lateHandoffOverlapWU.toFixed(6)} < ${requiredLateHandoffOverlapWU.toFixed(6)} WU).`);
    results.push({
      profile, firstGatePassageWU, methodFocusWU, finaleStartWU,
      shapingFocusWU, thinkingFocusWU, finalHoldWU, windows,
    });
  }
  return results;
}

function validateCamera(metadata, bytes) {
  const cameraTrack = JSON.parse(bytes.toString('utf8'));
  assert.equal(cameraTrack.schema, 'about-camera-track');
  assert.equal(cameraTrack.version, 5);
  assert.equal(cameraTrack.source, metadata.cameraTrack.source);
  assert.equal(cameraTrack.sampleCount, metadata.cameraTrack.sampleCount);
  assert.equal(cameraTrack.samples.length, cameraTrack.sampleCount);
  assert.equal(cameraTrack.frameStart, metadata.cameraTrack.frameStart);
  assert.equal(cameraTrack.frameEnd, metadata.cameraTrack.frameEnd);
  assert.ok(Number.isFinite(cameraTrack.fps) && cameraTrack.fps > 0,
    'The camera track has an invalid frame rate.');
  assert.deepEqual(cameraTrack.projection, metadata.cameraTrack.projection,
    'Camera projection metadata diverges from camera-track.json.');
  assert.deepEqual(cameraTrack.orientation, metadata.cameraTrack.orientation,
    'Camera orientation metadata diverges from camera-track.json.');
  assert.deepEqual(cameraTrack.rollControl || null, metadata.cameraTrack.rollControl || null,
    'Camera roll metadata diverges from camera-track.json.');
  assert.ok(cameraTrack.samples.length >= 120,
    'The camera track is too short to certify a continuous seven-stage journey.');
  assert.equal(cameraTrack.projection.fovAxis, 'horizontal');
  assert.equal(cameraTrack.projection.horizontalFov, 85);
  assert.equal(cameraTrack.orientation.path, metadata.source.route.object,
    'Camera orientation and source route refer to different paths.');
  assert.ok(typeof cameraTrack.orientation.pathTwistMode === 'string'
    && cameraTrack.orientation.pathTwistMode.length > 0,
  'The evaluated camera path has no stable twist mode.');
  assert.equal(cameraTrack.orientation.neutralHorizon, 'Z_UP');
  cameraTrack.samples.forEach((sample) => {
    assert.equal(sample.length, 7);
    assert.ok(sample.every(Number.isFinite));
    const quaternionLength = Math.hypot(...sample.slice(3));
    assert.ok(Math.abs(quaternionLength - 1) <= 0.001,
      `Camera quaternion is not normalized (${quaternionLength.toFixed(6)}).`);
  });

  const quaternionAngleDegrees = (first, second) => {
    const firstQuaternion = first.slice(3);
    const secondQuaternion = second.slice(3);
    const divisor = Math.hypot(...firstQuaternion) * Math.hypot(...secondQuaternion);
    const cosine = Math.abs(firstQuaternion.reduce(
      (sum, value, index) => sum + value * secondQuaternion[index], 0,
    ) / divisor);
    return 2 * Math.acos(Math.min(1, Math.max(-1, cosine))) * 180 / Math.PI;
  };
  const angularVelocity = cameraTrack.samples.slice(1).map((sample, index) => (
    quaternionAngleDegrees(cameraTrack.samples[index], sample)
  ));
  const angularAcceleration = angularVelocity.slice(1).map(
    (value, index) => value - angularVelocity[index],
  );
  const angularJerk = angularAcceleration.slice(1).map(
    (value, index) => value - angularAcceleration[index],
  );
  const percentile = (values, fraction) => {
    const ordered = [...values].sort((left, right) => left - right);
    return ordered[Math.floor((ordered.length - 1) * fraction)];
  };
  const angularVelocityP95 = percentile(angularVelocity, 0.95);
  assert.ok(
    angularVelocityP95 < 1.1,
    `Camera angular velocity is too reactive at p95 (${angularVelocityP95.toFixed(3)} degrees/frame).`,
  );
  assert.ok(
    Math.max(...angularVelocity) < 1.6,
    `Camera angular velocity spikes to ${Math.max(...angularVelocity).toFixed(3)} degrees/frame.`,
  );
  assert.ok(Math.max(...angularAcceleration.map(Math.abs)) < 0.25,
    `Camera angular acceleration spikes to ${Math.max(...angularAcceleration.map(Math.abs)).toFixed(3)} degrees/frame².`);
  assert.ok(Math.max(...angularJerk.map(Math.abs)) < 0.15,
    `Camera angular jerk spikes to ${Math.max(...angularJerk.map(Math.abs)).toFixed(3)} degrees/frame³.`);

  assert.equal(cameraTrack.gatePassage?.source, 'ABS_GATE_00..15');
  assert.deepEqual(cameraTrack.gatePassage.traversal, {
    forward: true,
    reverse: true,
    mode: 'same-centreline-reversible',
  });
  const gateMeasurement = measureCameraGatePassage(cameraTrack);
  assertCameraGatePassage(gateMeasurement, EXPECTED_GATE_OBJECT_KEYS.length);

  assert.deepEqual(cameraTrack.roundTunnelPassage?.traversal, {
    forward: true,
    reverse: true,
    mode: 'same-centreline-reversible',
  }, 'The round tunnel must expose the same reversible passage semantics as the square gates.');
  const roundTunnelMeasurement = measureCameraRoundTunnelPassage(cameraTrack);
  const roundTunnelObjects = metadata.source.objects.filter((object) => (
    object.modelKey === 'about.02' && object.geometryKind === 'curved-round-tunnel-hoop'
  ));
  assert.equal(roundTunnelMeasurement.apertures.length, roundTunnelObjects.length,
    'The round-tunnel passage record must cover every authored aperture object.');
  assertCameraRoundTunnelPassage(roundTunnelMeasurement, roundTunnelObjects.length);

  let travelledDistance = 0;
  const sampleDistances = [];
  for (let index = 1; index < cameraTrack.samples.length; index += 1) {
    const previous = cameraTrack.samples[index - 1];
    const current = cameraTrack.samples[index];
    const sampleDistance = Math.hypot(
      current[0] - previous[0],
      current[1] - previous[1],
      current[2] - previous[2],
    );
    travelledDistance += sampleDistance;
    sampleDistances.push(sampleDistance);
  }
  const movementToleranceWU = 0.00001;
  const lastMovingInterval = sampleDistances.findLastIndex(
    (distance) => distance > movementToleranceWU,
  );
  assert.ok(lastMovingInterval >= 0, 'The camera track contains no physical travel.');
  assert.ok(lastMovingInterval < sampleDistances.length - 1,
    'The camera track has no stationary terminal hold.');
  const movingDistances = sampleDistances.slice(0, lastMovingInterval + 1);
  const terminalDistances = sampleDistances.slice(lastMovingInterval + 1);
  assert.ok(movingDistances.every((distance) => distance > movementToleranceWU),
    'The moving camera path contains a pause before the terminal hold.');
  assert.ok(terminalDistances.every((distance) => distance <= movementToleranceWU),
    'The stationary terminal hold contains camera movement.');
  assert.ok(terminalDistances.length >= Math.max(5, Math.floor(cameraTrack.samples.length * 0.05)),
    'The stationary terminal hold is too short to establish the finale.');
  const movingDistance = movingDistances.reduce((sum, distance) => sum + distance, 0);
  const meanDistance = movingDistance / movingDistances.length;
  const distanceVariance = movingDistances.reduce(
    (sum, distance) => sum + (distance - meanDistance) ** 2,
    0,
  ) / movingDistances.length;
  const distanceCv = Math.sqrt(distanceVariance) / meanDistance;
  const maximumCadenceError = Math.max(...movingDistances.map(
    (distance) => Math.abs(distance - meanDistance) / meanDistance,
  ));
  assert.ok(distanceCv <= 0.02 && maximumCadenceError <= 0.05,
    `Camera distance cadence is nonconstant (CV ${distanceCv.toFixed(4)}, max error ${(maximumCadenceError * 100).toFixed(2)}%).`);
  const routeLengthTolerance = Math.max(0.01, metadata.source.route.evaluatedLength * 0.00005);
  assert.ok(Math.abs(metadata.source.route.evaluatedLength - movingDistance) <= routeLengthTolerance,
    `Evaluated route length (${metadata.source.route.evaluatedLength.toFixed(6)} WU) does not match moving camera travel (${movingDistance.toFixed(6)} WU).`);
  assert.ok(Math.abs(travelledDistance - movingDistance) <= movementToleranceWU,
    'Camera travel continues after the terminal hold begins.');

  const startPosition = cameraTrack.samples[0].slice(0, 3);
  const heldPosition = cameraTrack.samples[lastMovingInterval + 1].slice(0, 3);
  const chord = heldPosition.map((value, index) => value - startPosition[index]);
  const chordLength = Math.hypot(...chord);
  assert.ok(movingDistance >= chordLength * 1.001,
    'The evaluated camera route is effectively straight rather than nontrivially curved.');
  const chordLengthSquared = chord.reduce((sum, value) => sum + value * value, 0);
  const maximumChordDeviation = Math.max(...cameraTrack.samples
    .slice(0, lastMovingInterval + 2)
    .map((sample) => {
      const offset = sample.slice(0, 3).map((value, index) => value - startPosition[index]);
      const amount = Math.min(1, Math.max(0, offset.reduce(
        (sum, value, index) => sum + value * chord[index], 0,
      ) / chordLengthSquared));
      return Math.hypot(...offset.map((value, index) => value - chord[index] * amount));
    }));
  assert.ok(maximumChordDeviation >= Math.max(1, chordLength * 0.002),
    `The evaluated route has no meaningful curvature (${maximumChordDeviation.toFixed(3)} WU deviation).`);

  assert.ok(Array.isArray(cameraTrack.journeyCues) && cameraTrack.journeyCues.length > 0,
    'The camera track has no semantic journey cues.');
  const cueByName = new Map();
  let previousCueFrame = -Infinity;
  for (const cue of cameraTrack.journeyCues) {
    assert.ok(typeof cue.name === 'string' && cue.name.length > 0 && !cueByName.has(cue.name),
      `Camera cue ${cue.name || '<unnamed>'} is missing or duplicated.`);
    assert.ok(Number.isInteger(cue.frame)
      && cue.frame >= cameraTrack.frameStart && cue.frame <= cameraTrack.frameEnd,
    `Camera cue ${cue.name} falls outside the exported frame range.`);
    assert.ok(Number.isFinite(cue.progress) && cue.progress >= 0 && cue.progress <= 1,
      `Camera cue ${cue.name} has invalid normalized progress.`);
    const expectedProgress = (cue.frame - cameraTrack.frameStart)
      / (cameraTrack.frameEnd - cameraTrack.frameStart);
    assert.ok(Math.abs(cue.progress - expectedProgress) <= 0.000001,
      `Camera cue ${cue.name} disagrees with its authored frame.`);
    assert.ok(cue.frame >= previousCueFrame, `Camera cue ${cue.name} is out of frame order.`);
    previousCueFrame = cue.frame;
    cueByName.set(cue.name, cue);
  }
  for (const cueName of REQUIRED_CAMERA_CUES) {
    assert.ok(cueByName.has(cueName), `The camera track omits ${cueName}.`);
  }
  assert.equal(cueByName.has('ABS_STAGE_06_LENS_CENTRE'), false, 'The retired lens cue returned.');
  const stageCues = CURRENT_EXPECTED_MODEL_KEYS.map((_, index) => (
    cueByName.get(`ABS_STAGE_0${index}`)
  ));
  assert.ok(stageCues.every((cue, index) => !index || cue.progress > stageCues[index - 1].progress),
    'The seven camera stage cues are not in strict journey order.');

  const holdStartIndex = lastMovingInterval + 1;
  const holdStartProgress = holdStartIndex / (cameraTrack.samples.length - 1);
  const cueTolerance = 1 / (cameraTrack.samples.length - 1) + 0.000001;
  const cameraLock = cueByName.get('ABS_CAMERA_LOCK');
  const terminal = cueByName.get('ABS_TERMINAL_FRAME');
  assert.ok(Math.abs(cameraLock.progress - holdStartProgress) <= cueTolerance,
    `ABS_CAMERA_LOCK (${cameraLock.progress.toFixed(6)}) does not begin the terminal hold (${holdStartProgress.toFixed(6)}).`);
  assert.ok(terminal.progress >= holdStartProgress - cueTolerance,
    'ABS_TERMINAL_FRAME occurs before the stationary terminal hold.');
  assert.ok(cueByName.get('ABS_FINALE_DECEL').progress < cameraLock.progress
    && cameraLock.progress <= terminal.progress,
  'Finale deceleration, camera lock, and terminal hold cues are out of order.');

  const firstRoundCrossing = roundTunnelMeasurement.apertures[0].crossing.progress;
  const lastRoundCrossing = roundTunnelMeasurement.apertures.at(-1).crossing.progress;
  assert.ok(cueByName.get('ABS_STAGE_02').progress <= firstRoundCrossing,
    'The round tunnel begins before its semantic stage cue.');
  assert.ok(cueByName.get('ABS_ROUND_PORTALS_EXIT').progress >= lastRoundCrossing,
    'The round-tunnel exit cue occurs before the final authored aperture is crossed.');
  assert.ok(cueByName.get('ABS_ROUND_PORTALS_CLEAR').progress
    >= cueByName.get('ABS_ROUND_PORTALS_EXIT').progress,
  'The round-tunnel clear cue occurs before its exit cue.');
  const firstGateCrossing = gateMeasurement.gates[0].crossing.progress;
  const lastGateCrossing = gateMeasurement.gates.at(-1).crossing.progress;
  assert.ok(cueByName.get('ABS_STAGE_04').progress <= firstGateCrossing,
    'The square gates begin before their semantic stage cue.');
  assert.ok(cueByName.get('ABS_GATE_PASSAGE_CLEAR').progress >= lastGateCrossing,
    'The square-gate discard cue occurs before all 16 gates are crossed.');

  const lockSample = cameraTrack.samples[holdStartIndex];
  const stationaryTail = cameraTrack.samples.slice(holdStartIndex);
  const maximumTailPositionDrift = Math.max(...stationaryTail.map((sample) => Math.hypot(
    sample[0] - lockSample[0],
    sample[1] - lockSample[1],
    sample[2] - lockSample[2],
  )));
  const maximumTailQuaternionDrift = Math.max(...stationaryTail.map((sample) => {
    const dot = Math.abs(sample.slice(3).reduce(
      (sum, value, index) => sum + (value * lockSample[index + 3]),
      0,
    ));
    return 2 * Math.acos(Math.min(1, Math.max(-1, dot))) * 180 / Math.PI;
  }));
  assert.ok(
    maximumTailPositionDrift <= 0.0001,
    `The terminal camera drifts by ${maximumTailPositionDrift.toFixed(6)} WU after lock.`,
  );
  assert.ok(
    maximumTailQuaternionDrift <= 0.001,
    `The terminal camera rotates by ${maximumTailQuaternionDrift.toFixed(6)} degrees after lock.`,
  );

  const rotateVector = (sample, vector) => {
    const [qx, qy, qz, qw] = sample.slice(3);
    const [vx, vy, vz] = vector;
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    return [
      vx + qw * tx + qy * tz - qz * ty,
      vy + qw * ty + qz * tx - qx * tz,
      vz + qw * tz + qx * ty - qy * tx,
    ];
  };
  const finalRight = rotateVector(lockSample, [1, 0, 0]);
  const finalUp = rotateVector(lockSample, [0, 1, 0]);
  const finalForward = rotateVector(lockSample, [0, 0, -1]);
  const finaleSurface = largestSemanticSurface(metadata, 'about.06', 'The finale');
  const finaleCorners = [];
  for (const x of [finaleSurface.bounds.min[0], finaleSurface.bounds.max[0]]) {
    for (const y of [finaleSurface.bounds.min[1], finaleSurface.bounds.max[1]]) {
      for (const z of [finaleSurface.bounds.min[2], finaleSurface.bounds.max[2]]) {
        const offset = [x - lockSample[0], y - lockSample[1], z - lockSample[2]];
        finaleCorners.push({
          right: offset.reduce((sum, value, index) => sum + value * finalRight[index], 0),
          up: offset.reduce((sum, value, index) => sum + value * finalUp[index], 0),
          forward: offset.reduce((sum, value, index) => sum + value * finalForward[index], 0),
        });
      }
    }
  }
  const rightExtents = finaleCorners.map((corner) => corner.right);
  const upExtents = finaleCorners.map((corner) => corner.up);
  const forwardExtents = finaleCorners.map((corner) => corner.forward);
  assert.ok(Math.min(...rightExtents) <= -220 && Math.max(...rightExtents) >= 220,
    'The finale surface does not overscan both sides of the held camera.');
  assert.ok(Math.max(...upExtents) <= -0.5,
    'The finale surface rises through the held camera instead of remaining a ground field.');
  assert.ok(Math.min(...forwardExtents) <= -20 && Math.max(...forwardExtents) >= 60,
    'The finale surface does not overscan the held camera in depth.');

  const continuousFloor = largestSemanticSurface(metadata, 'about.03', 'The continuous middle journey');
  const floorSamples = cameraTrack.samples.slice(0, holdStartIndex + 1).filter((sample) => (
    sample[2] >= continuousFloor.bounds.min[2] && sample[2] <= continuousFloor.bounds.max[2]
  ));
  assert.ok(floorSamples.length > 0, 'The camera never travels over the continuous floor.');
  assert.ok(floorSamples.every((sample) => (
    sample[0] >= continuousFloor.bounds.min[0] + 32
      && sample[0] <= continuousFloor.bounds.max[0] - 32
      && continuousFloor.bounds.max[1] <= sample[1] - 0.5
  )), 'The continuous floor loses its camera overscan or crosses the camera path.');
  return cameraTrack;
}

function validateFinalBankPrefixes(metadata, surfelBytes, cameraBytes) {
  const track = JSON.parse(cameraBytes.toString('utf8'));
  const pose = track.samples.at(-1);
  const [qx, qy, qz, qw] = [-pose[3], -pose[4], -pose[5], pose[6]];
  const model = metadata.models.find((candidate) => candidate.key === 'about.06');
  const tanHalfFov = Math.tan(metadata.cameraTrack.projection.horizontalFov * Math.PI / 360);
  const countBanks = (count, aspect) => {
    const banks = [0, 0];
    for (let ordinal = 0; ordinal < count; ordinal += 1) {
      const offset = (model.surfelRange.offset + ordinal) * metadata.layout.strideBytes;
      const x = surfelBytes.readFloatLE(offset) - pose[0];
      const y = surfelBytes.readFloatLE(offset + 4) - pose[1];
      const z = surfelBytes.readFloatLE(offset + 8) - pose[2];
      const tx = 2 * (qy * z - qz * y);
      const ty = 2 * (qz * x - qx * z);
      const tz = 2 * (qx * y - qy * x);
      const cameraX = x + qw * tx + qy * tz - qz * ty;
      const cameraY = y + qw * ty + qz * tx - qx * tz;
      const depth = -(z + qw * tz + qx * ty - qy * tx);
      if (depth > 0 && Math.abs(cameraX) <= depth * tanHalfFov
        && Math.abs(cameraY) <= depth * tanHalfFov / aspect) {
        banks[cameraX < 0 ? 0 : 1] += 1;
      }
    }
    return banks;
  };
  for (const [profile, aspect] of [['mobile', 390 / 844], ['desktop', 1440 / 1000]]) {
    const count = model.profileCounts[profile];
    const masterBanks = countBanks(model.profileCounts.master, aspect);
    const banks = countBanks(count, aspect);
    const fraction = count / model.profileCounts.master;
    banks.forEach((visible, side) => {
      const minimum = Math.max(profile === 'mobile' ? 25 : 60, masterBanks[side] * fraction * 0.6);
      assert.ok(
        visible >= minimum,
        `${profile} starves the ${side === 0 ? 'left' : 'right'} finale half in its nested point prefix `
          + `(${visible} visible; expected at least ${Math.ceil(minimum)}).`,
      );
    });
  }
}

function main() {
  if (CLI.validatePathOnly) {
    process.stdout.write(`${JSON.stringify({
      status: 'ok',
      assetDir: ASSET_DIR,
      canonicalAssetDir: path.resolve(CANONICAL_ASSET_DIR),
      canonical: ASSET_DIR === path.resolve(CANONICAL_ASSET_DIR),
    }, null, 2)}\n`);
    return;
  }
  const metadata = readJson(META_PATH);
  validateMetadata(metadata);
  validateSource(metadata);
  const surfelBytes = assetBytes(metadata.files.surfels);
  const cameraBytes = assetBytes(metadata.files.cameraTrack);
  validateSurfels(metadata, surfelBytes);
  validateTerrainGateClearance(metadata, surfelBytes);
  validatePages(metadata);
  const cameraTrack = validateCamera(metadata, cameraBytes);
  const semanticVisibility = validateSemanticVisibility(metadata, cameraTrack);
  validateFinalBankPrefixes(metadata, surfelBytes, cameraBytes);
  process.stdout.write(`${JSON.stringify({
    status: 'ok',
    assetDir: ASSET_DIR,
    schema: metadata.schema,
    version: metadata.version,
    sourceSha256: metadata.source.sha256,
    objects: metadata.source.objectCount,
    models: metadata.models.length,
    pages: metadata.pages.map((page) => ({
      id: page.id,
      mobile: page.profileCounts.mobile,
      desktop: page.profileCounts.desktop,
      sharedWithPrevious: page.sharedModelIdsWithPrevious.length,
    })),
    surfels: metadata.files.surfels.count,
    cameraSamples: metadata.cameraTrack.sampleCount,
    semanticFallbacks: metadata.source.semanticFallbacks.length,
    semanticVisibility,
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`[about-point-scene] ${error.message}\n`);
  process.exitCode = 1;
}
