#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCameraGatePassage, measureCameraGatePassage } from './camera-gate-metrics.mjs';

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
const CURRENT_EXPECTED_OBJECTS = new Map([
  ['gn.signal.aperture', ['about.00', 'path-tunnel', 'signal-aperture', 'ABOUT_STAGE_00_SEED']],
  ['gn.signal.field', ['about.00', 'narrative-field', 'quiet-particle-field', 'ABOUT_STAGE_00_SEED']],
  ['gn.nebula.field', ['about.01', 'narrative-field', 'eroded-nebula', 'ABOUT_STAGE_01_NEBULA']],
  ['gn.round.portals', ['about.02', 'path-tunnel', 'round-portals', 'ABOUT_STAGE_02_ROUND_PORTALS']],
  ['gn.ribbon.canyon', ['about.03', 'narrative-surface', 'continuous-mountain-terrain', 'ABOUT_STAGE_03_RIBBON_CANYON']],
  ['gn.square.loop', ['about.04', 'path-tunnel', 'square-gates', 'ABOUT_STAGE_04_SQUARE_LOOP']],
  ['gn.responsive.lattice', ['about.05', 'narrative-lattice', 'split-lattice-finale', 'ABOUT_STAGE_05_RESPONSIVE_LATTICE']],
]);
const CURRENT_EXPECTED_MODEL_KEYS = new Set(
  [...CURRENT_EXPECTED_OBJECTS.values()].map(([modelKey]) => modelKey),
);
const EXPECTED_VISIBILITY_BINDINGS = new Map([
  ['about.00', ['opening', 0, 'inciting-question', 0.18]],
  ['about.01', ['inciting-question', -0.18, 'portal-entry', 0.18]],
  ['about.02', ['portal-entry', -0.18, 'portal-exit', 0.18]],
  ['about.03', ['portal-exit', -0.18, 'gate-entry', 0.18]],
  ['about.04', ['gate-entry', -0.55, 'gate-exit', 0.18]],
  ['about.05', ['gate-exit', -0.18, 'terminal-hold', 1]],
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function fittedProgress(metadata, progress) {
  const fit = metadata.source.readingSpaceFit;
  if (!fit) return progress;
  assert.equal(fit.schema, 'about-reading-space-fit/v1');
  const { oldArcKnots, arcKnots, oldLengthWU, lengthWU } = fit;
  assert.equal(oldArcKnots.length, 17);
  assert.equal(arcKnots.length, 17);
  for (const knots of [oldArcKnots, arcKnots]) {
    assert.equal(knots[0], 0);
    assert.ok(knots.every((value, index) => Number.isFinite(value) && (!index || value > knots[index - 1])));
  }
  const distance = progress * oldLengthWU;
  const index = Math.min(15, oldArcKnots.findIndex((value, i) => i < 16 && distance < oldArcKnots[i + 1]));
  const from = index < 0 ? 15 : index;
  const mix = (distance - oldArcKnots[from]) / (oldArcKnots[from + 1] - oldArcKnots[from]);
  return (arcKnots[from] + mix * (arcKnots[from + 1] - arcKnots[from])) / lengthWU;
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
  }
  assert.equal(
    metadata.source.objects.reduce((sum, object) => sum + object.triangles, 0),
    metadata.source.triangleCount,
  );
  const route = metadata.source.route;
  if (route) {
    assert.equal(route.object, 'ABS_PARAMETRIC_RIDE_PATH');
    assert.ok(Number.isInteger(route.controlPointCount) && route.controlPointCount > 1);
    assert.ok(Number.isFinite(route.evaluatedLength) && route.evaluatedLength > 0);
    assert.match(route.shapeSha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(route.splineCount) && route.splineCount > 0);
    if (route.stageRanges != null) {
      assert.equal(typeof route.stageRanges, 'object');
      Object.values(route.stageRanges).forEach((range) => {
        assert.ok(Array.isArray(range) && range.length === 2);
        assert.ok(range.every(Number.isFinite));
        assert.ok(range[0] >= 0 && range[1] <= 1 && range[0] <= range[1]);
      });
    }
  }
  const modelKeys = new Set(metadata.models.map((model) => model.key));
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
    modelKeys,
    CURRENT_EXPECTED_MODEL_KEYS,
    'The exported model set does not match the six-stage lens-free narrative world.',
  );
  assert.deepEqual(objectKeys, new Set(CURRENT_EXPECTED_OBJECTS.keys()), 'The active Blender export contains stale or missing narrative objects.');
  for (const [objectKey, [modelKey, role, geometryKind, collection]] of CURRENT_EXPECTED_OBJECTS) {
    const object = metadata.source.objects.find((item) => item.objectKey === objectKey);
    assert.equal(object.modelKey, modelKey);
    assert.equal(object.role, role);
    assert.equal(object.geometryKind, objectKey === 'gn.responsive.lattice' && metadata.terminalResponse
      ? 'expansive-connected-landscape' : geometryKind);
    assert.ok(object.collections.includes(collection));
  }
  const byKey = Object.fromEntries(metadata.source.objects.map((object) => [object.objectKey, object]));
  assert.equal(byKey['gn.signal.aperture'].instanceCount, 1);
  assert.ok(byKey['gn.signal.field'].connectedComponentCount >= 150, 'The quiet field is too sparse.');
  assert.ok(byKey['gn.nebula.field'].connectedComponentCount >= 400, 'The nebula is too sparse.');
  assert.equal(byKey['gn.round.portals'].connectedComponentCount, 36);
  assert.equal(byKey['gn.round.portals'].instanceCount, 36);
  assert.equal(byKey['gn.ribbon.canyon'].connectedComponentCount, 1);
  assert.equal(byKey['gn.ribbon.canyon'].samplingDensityAttribute, 'abs_density_weight');
  assert.ok(
    byKey['gn.ribbon.canyon'].samplingSurfaceArea < byKey['gn.ribbon.canyon'].surfaceArea * 0.9,
    'The terrain no longer has a meaningful density fade at both ends.',
  );
  const extent = (object, axis) => object.bounds.max[axis] - object.bounds.min[axis];
  const forwardGap = (previous, next) => previous.bounds.min[2] - next.bounds.max[2];
  assert.ok(extent(byKey['gn.ribbon.canyon'], 0) >= 200, 'The terrain is no longer a wide landscape.');
  assert.ok(extent(byKey['gn.ribbon.canyon'], 1) >= 25, 'The terrain has lost its mountain relief.');
  const shoulderLift = Number(metadata.source.readingSpaceFit?.terrainShoulderLiftWU) || 0;
  assert.ok(byKey['gn.ribbon.canyon'].bounds.max[1] <= 48 + shoulderLift,
    'The terrain exceeds its authored shoulder elevation.');
  if (metadata.source.readingSpaceFit) assert.ok(byKey['gn.ribbon.canyon'].bounds.min[1] <= -250,
    'The fitted terrain lost its deep continuous reading valley.');
  const minimumTerrainDepth = route ? route.evaluatedLength * 0.25 : 300;
  assert.ok(
    extent(byKey['gn.ribbon.canyon'], 2) >= minimumTerrainDepth,
    'The terrain journey no longer occupies a substantial share of the authored route.',
  );
  for (const [previousKey, nextKey, minimumGap] of [
    ['gn.round.portals', 'gn.ribbon.canyon', 30],
    ['gn.ribbon.canyon', 'gn.square.loop', 10],
    ['gn.square.loop', 'gn.responsive.lattice', 6],
  ]) {
    const next = nextKey === 'gn.responsive.lattice' && metadata.terminalResponse
      ? { bounds: metadata.terminalResponse.bankBounds } : byKey[nextKey];
    const gap = forwardGap(byKey[previousKey], next);
    // The fitted valley surrounds the approach to the gates. Overlapping
    // longitudinal bounds alone cannot establish a collision. Validate its
    // exported point geometry against the gate volume below instead.
    if (previousKey === 'gn.ribbon.canyon' && metadata.source.readingSpaceFit?.terrainEndOnPath) continue;
    assert.ok(
      gap >= minimumGap,
      `${previousKey} and ${nextKey} overlap or have no deliberate handoff gap (${gap.toFixed(1)} WU).`,
    );
  }
  assert.equal(byKey['gn.square.loop'].connectedComponentCount, 14);
  assert.ok(
    byKey['gn.responsive.lattice'].connectedComponentCount >= (metadata.terminalResponse ? 100 : 1000),
    'The responsive lattice lost its substantial authored strand population.',
  );
  assert.ok(extent(byKey['gn.responsive.lattice'], 1) >= 80,
    'The restored lattice must retain full-height banks, not shallow edge fragments.');
  assert.ok(extent(byKey['gn.responsive.lattice'], 0) >= 160,
    'The restored lattice has lost its authored width.');
  const latticeModel = metadata.models.find((model) => model.key === 'about.05');
  if (metadata.terminalResponse) {
    const response = metadata.terminalResponse;
    assert.equal(response.schema, 'about-terminal-response/v1');
    assert.equal(response.modelKey, 'about.05');
    assert.equal(byKey['gn.responsive.lattice'].connectedComponentCount, response.bankComponents + 1,
      'The terminal export must retain every finite bank component plus one connected surface.');
    assert.ok(response.landscapeBounds.max[1] < byKey['gn.square.loop'].bounds.min[1] - 6,
      'The deep approach must pass physically below the square gates, including deformation.');
    assert.ok(response.bankBounds.max[2] < byKey['gn.square.loop'].bounds.min[2] - 6);
  }
  assert.equal(latticeModel.motionSubgroups, 24);
  assert.equal(
    byKey['gn.responsive.lattice'].profilePrefixOrder,
    'component-stratified-after-protected-anchors',
    'The final banks must retain spatial coverage in every detail tier.',
  );
  assert.ok(metadata.motionGroups.length >= 30, 'The packed asset lost coherent strand motion groups.');
  assert.equal(objectKeys.has('gn.lens.chamber'), false, 'The retired finale lens returned.');
  assert.equal(modelKeys.has('about.06'), false, 'The retired finale model returned.');
  assert.deepEqual(route?.stageRanges?.['04'], [0.64, 0.8].map(value => fittedProgress(metadata, value)));
  assert.deepEqual(route?.stageRanges?.['05'], [0.86, 1].map(value => fittedProgress(metadata, value)));
  const orderedModels = [...metadata.models].sort(
    (left, right) => left.visibilityStartWU - right.visibilityStartWU,
  );
  for (const model of orderedModels) {
    assert.ok(Number.isFinite(model.visibilityStartWU), `${model.key} has no visibility start.`);
    assert.ok(Number.isFinite(model.visibilityEndWU), `${model.key} has no visibility end.`);
    assert.ok(model.visibilityEndWU > model.visibilityStartWU, `${model.key} has an empty visibility window.`);
    assert.ok(
      Number.isFinite(model.visibilityHandoffWU)
        && model.visibilityHandoffWU > 0
        && model.visibilityHandoffWU <= 0.2,
      `${model.key} has an unsafe visibility handoff.`,
    );
    assert.deepEqual(
      [
        model.visibilityStartCue,
        model.visibilityStartOffsetWU,
        model.visibilityEndCue,
        model.visibilityEndOffsetWU,
      ],
      model.key === 'about.01' && metadata.source.readingSpaceFit?.terrainEndOnPath
        ? ['inciting-question', -0.28, 'portal-entry', 0.18]
        : EXPECTED_VISIBILITY_BINDINGS.get(model.key),
      `${model.key} is not bound to its semantic story handoff.`,
    );
  }
  for (let index = 1; index < orderedModels.length; index += 1) {
    const previous = orderedModels[index - 1];
    const current = orderedModels[index];
    const overlapWU = previous.visibilityEndWU - current.visibilityStartWU;
    // The first square opening must finish appearing before camera entry.
    // This advances its bank by 0.37 WU without lengthening the handoff fade.
    const approachLeadWU = current.key === 'about.04' ? 0.37 : 0;
    assert.ok(
      overlapWU > 0 && overlapWU <= 0.360001 + approachLeadWU,
      `${previous.key} and ${current.key} must meet in a bounded handoff, without forced blank intervals (${overlapWU.toFixed(3)} WU).`,
    );
  }
  assert.ok(
    latticeModel.visibilityEndCue === 'terminal-hold'
      && latticeModel.visibilityEndOffsetWU >= 0.2,
    'The final banks must remain present through the stationary terminal hold.',
  );
  for (const modelKey of ['about.02', 'about.04']) {
    const model = metadata.models.find((candidate) => candidate.key === modelKey);
    assert.ok(
      model.visibilityEndWU - model.visibilityStartWU >= 1,
      `${modelKey} has insufficient screen time for an actual camera passage.`,
    );
  }
  for (const profileName of ['mobile', 'desktop']) {
    assert.ok(
      metadata.profiles[profileName].perObjectCounts['gn.responsive.lattice']
        >= byKey['gn.responsive.lattice'].componentAnchorCount * 3,
      `${profileName} reduces the final banks to isolated strand anchors.`,
    );
    for (const objectKey of ['gn.ribbon.canyon', 'gn.responsive.lattice']) {
      assert.ok(metadata.profiles[profileName].perObjectCounts[objectKey]
        >= metadata.profiles[profileName].surfelCount * 0.25,
      `${profileName} starves ${objectKey} of useful scene material.`);
    }
  }
  assert.ok(
    metadata.source.objects.every((object) => (
      Number.isFinite(object.surfelRadiusScale)
        && object.surfelRadiusScale >= 0.25
        && object.surfelRadiusScale <= 2.5
    )),
    'Every Blender object must author a bounded website circle-radius scale.',
  );
}

function validateTerrainGateClearance(metadata, surfelBytes) {
  if (!metadata.source.readingSpaceFit?.terrainEndOnPath) return;
  const terrain = metadata.models.find((model) => model.key === 'about.03');
  const gates = metadata.source.objects.find((object) => object.objectKey === 'gn.square.loop');
  assert.ok(terrain && gates, 'Fitted terrain requires the complete gate model.');
  let minimumClearance = Infinity;
  for (let index = terrain.surfelRange.offset; index < terrain.surfelRange.offset + terrain.surfelRange.count; index += 1) {
    let squaredDistance = 0;
    for (let axis = 0; axis < 3; axis += 1) {
      const coordinate = surfelBytes.readFloatLE(index * 32 + axis * 4);
      const distance = Math.max(gates.bounds.min[axis] - coordinate, 0, coordinate - gates.bounds.max[axis]);
      squaredDistance += distance * distance;
    }
    minimumClearance = Math.min(minimumClearance, Math.sqrt(squaredDistance));
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
        assert.ok(
          (componentAnchorPrefixes[profileName].get(`${model.id}:${partId}`) || 0)
            >= object.componentAnchorCount,
          `${profileName} prefix omits a protected component anchor from ${object.objectKey}.`,
        );
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
      assert.ok(
        profile.perObjectCounts[object.objectKey] >= object.requiredAnchorCount,
        `${profileName} omits a required recognition anchor from ${object.objectKey}.`,
      );
      assert.ok(
        profile.perObjectCounts[object.objectKey] >= object.componentAnchorCount,
        `${profileName} cannot retain protected components for ${object.objectKey}.`,
      );
    });
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

function validateCamera(metadata, bytes) {
  const cameraTrack = JSON.parse(bytes.toString('utf8'));
  assert.equal(cameraTrack.schema, 'about-camera-track');
  assert.equal(cameraTrack.version, 5);
  assert.equal(cameraTrack.sampleCount, metadata.cameraTrack.sampleCount);
  assert.equal(cameraTrack.samples.length, cameraTrack.sampleCount);
  assert.equal(cameraTrack.projection.fovAxis, 'horizontal');
  assert.equal(cameraTrack.projection.horizontalFov, 65);
  assert.equal(cameraTrack.orientation.neutralHorizon, 'Z_UP');
  const steadycam = cameraTrack.orientation.steadycam;
  assert.equal(steadycam.mode, 'rail-position-world-up-look-ahead-aim');
  assert.equal(steadycam.positionFollower, 'ABS_CAMERA_PATH_FOLLOWER');
  assert.equal(steadycam.lookAheadFollower, 'ABS_CAMERA_LOOKAHEAD_FOLLOWER');
  assert.equal(steadycam.target, 'ABS_CAMERA_LOOKAHEAD_TARGET');
  assert.ok(
    Number.isFinite(steadycam.lookAheadMetres)
      && steadycam.lookAheadMetres >= 5
      && steadycam.lookAheadMetres <= 80,
    `Steadycam look-ahead is outside its safe tuning range (${steadycam.lookAheadMetres}).`,
  );
  assert.ok(
    Number.isFinite(steadycam.targetExtensionMetres)
      && steadycam.targetExtensionMetres >= 0
      && steadycam.targetExtensionMetres <= 25,
    `Steadycam target extension is outside its safe tuning range (${steadycam.targetExtensionMetres}).`,
  );
  assert.equal(cameraTrack.rollControl.keyframes.length, 9);
  assert.deepEqual(
    cameraTrack.rollControl.keyframes.slice(-5).map((keyframe) => keyframe.degrees),
    [0, -6, 8, -4, 0],
  );
  const squareRollProgress = cameraTrack.rollControl.keyframes
    .slice(-5)
    .map((keyframe) => keyframe.progress);
  [0.64, 0.68, 0.72, 0.76, 0.80].forEach((expected, index) => {
    assert.ok(
      Math.abs(squareRollProgress[index] - fittedProgress(metadata, expected)) < 0.0005,
      'The square-gate camera bank no longer aligns with its authored story chapter.',
    );
  });
  assert.deepEqual(
    cameraTrack.rollControl.keyframes.slice(0, 4).map((keyframe) => keyframe.degrees),
    [0, -8, 8, 0],
  );
  cameraTrack.samples.forEach((sample) => {
    assert.equal(sample.length, 7);
    assert.ok(sample.every(Number.isFinite));
  });
  const cameraSampleAt = (progress) => cameraTrack.samples[
    Math.round(progress * (cameraTrack.samples.length - 1))
  ];
  const openingSamples = cameraTrack.samples.slice(0, Math.round(cameraTrack.samples.length * 0.17));
  assert.ok(
    openingSamples.every((sample) => Math.abs(sample[0]) < 0.05),
    'The camera no longer flies straight through the opening star field.',
  );
  const roundTunnelLeadIn = cameraTrack.samples.slice(
    Math.round(cameraTrack.samples.length * 0.17),
    Math.round(cameraTrack.samples.length * 0.18),
  );
  assert.ok(
    roundTunnelLeadIn.every((sample) => Math.abs(sample[0]) < 0.35),
    'The camera no longer eases gently from the straight field into the round tunnel.',
  );
  const roundSamples = cameraTrack.samples.slice(
    Math.round(cameraTrack.samples.length * 0.18),
    Math.round(cameraTrack.samples.length * 0.3),
  );
  assert.ok(
    Math.min(...roundSamples.map((sample) => sample[0])) < -8
      && Math.max(...roundSamples.map((sample) => sample[0])) > 4,
    'The round tunnel lost its gentle left-right rollercoaster curve.',
  );
  const rotateVector = (sample, vector) => {
    const quaternion = sample.slice(3);
    const [qx, qy, qz, qw] = quaternion;
    const [vx, vy, vz] = vector;
    const tx = 2 * ((qy * vz) - (qz * vy));
    const ty = 2 * ((qz * vx) - (qx * vz));
    const tz = 2 * ((qx * vy) - (qy * vx));
    return [
      vx + (qw * tx) + ((qy * tz) - (qz * ty)),
      vy + (qw * ty) + ((qz * tx) - (qx * tz)),
      vz + (qw * tz) + ((qx * ty) - (qy * tx)),
    ];
  };
  const angularChangeDegrees = (first, second) => {
    const firstLength = Math.max(0.000001, Math.hypot(...first));
    const secondLength = Math.max(0.000001, Math.hypot(...second));
    const cosine = first.reduce(
      (sum, value, index) => sum + ((value / firstLength) * (second[index] / secondLength)),
      0,
    );
    return Math.acos(Math.min(1, Math.max(-1, cosine))) * 180 / Math.PI;
  };
  const forwardAngularChanges = cameraTrack.samples.slice(1).map((sample, index) => (
    angularChangeDegrees(
      rotateVector(cameraTrack.samples[index], [0, 0, -1]),
      rotateVector(sample, [0, 0, -1]),
    )
  ));
  const orderedForwardAngularChanges = [...forwardAngularChanges].sort((left, right) => left - right);
  const forwardAngularP95 = orderedForwardAngularChanges[
    Math.floor((orderedForwardAngularChanges.length - 1) * 0.95)
  ];
  assert.ok(
    forwardAngularP95 < 1.1,
    `The camera viewing direction is too reactive at p95 (${forwardAngularP95.toFixed(3)} degrees/frame).`,
  );
  assert.ok(
    Math.max(...forwardAngularChanges) < 1.6,
    `The camera still contains a sharp viewing-direction spike (${Math.max(...forwardAngularChanges).toFixed(3)} degrees/frame).`,
  );
  const latticeApproachForward = rotateVector(cameraSampleAt(0.84), [0, 0, -1]);
  assert.ok(
    Math.abs(latticeApproachForward[0]) < 0.15
      && Math.abs(latticeApproachForward[1]) < 0.2
      && latticeApproachForward[2] < -0.97,
    'The descending camera must aim through the final corridor, not into a lattice edge.',
  );
  const gateAim = cameraTrack.orientation.gateAim;
  assert.equal(gateAim?.mode, 'same-rail-continuous-right-axis');
  assert.equal(gateAim.path, 'ABS_PARAMETRIC_RIDE_PATH');
  assert.equal(gateAim.target, 'ABS_CAMERA_GATE_AIM');
  assert.equal(gateAim.rightReference, 'world-X');
  assert.ok(gateAim.leadGateSpacings >= 0.1 && gateAim.leadGateSpacings <= 0.5);
  assert.equal(cameraTrack.gatePassage?.source, 'GN_SQUARE_LOOP');
  assertCameraGatePassage(measureCameraGatePassage(cameraTrack));
  const loopPositions = [0.64, 0.68, 0.72, 0.76, 0.80].map(cameraSampleAt);
  const loopHeights = loopPositions.map((sample) => sample[1]);
  const loopDepths = loopPositions.map((sample) => sample[2]);
  assert.ok(Math.max(...loopHeights) - Math.min(...loopHeights) > 40, 'The square tunnel is no longer an aerial loop.');
  assert.ok(Math.max(...loopDepths) - Math.min(...loopDepths) > 35, 'The square tunnel lost its forward-return rollercoaster bend.');
  const finalSample = cameraTrack.samples.at(-1);
  if (metadata.terminalResponse) {
    const bounds = metadata.terminalResponse.landscapeBounds;
    assert.ok(bounds.min[0] < finalSample[0] - 300 && bounds.max[0] > finalSample[0] + 300);
    assert.ok(bounds.max[2] > finalSample[2] + 10 && bounds.min[2] < finalSample[2] - 500,
      'The terminal surface must continue behind the camera and beyond the far atmosphere.');
  }
  assert.ok(
    Math.hypot(finalSample[4], finalSample[5]) < 0.0001,
    'The final Blender camera must return to a level horizon.',
  );
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
  assert.ok(travelledDistance >= 1200, `The authored ride is too short (${travelledDistance.toFixed(1)} WU).`);
  const steadyRailDistances = sampleDistances.slice(0, Math.round(sampleDistances.length * 0.8));
  if (metadata.source.readingSpaceFit) {
    // Export frames are source editing time. Runtime resamples cumulative
    // physical distance; the fitted straight approaches need more distance in
    // the same source frame span. Reject teleports/holds without demanding an
    // obsolete uniform frame-time schedule.
    assert.ok(steadyRailDistances.every(distance => distance > 0 && distance < 3),
      'The fitted source rail contains a hold or a positional discontinuity.');
    assert.ok(Math.abs(travelledDistance - metadata.source.readingSpaceFit.lengthWU) < 0.1);
  } else {
    assert.ok(Math.max(...steadyRailDistances) - Math.min(...steadyRailDistances) < 0.01,
      'The camera rail no longer advances smoothly before the authored finale segment.');
  }
  const cueNames = new Set(cameraTrack.journeyCues.map((cue) => cue.name));
  for (const cue of [
    'ABS_STAGE_00',
    'ABS_STAGE_01',
    'ABS_STAGE_02',
    'ABS_STAGE_03',
    'ABS_STAGE_04',
    'ABS_STAGE_05',
    'ABS_SPLIT_LATTICE_ENTRY',
    'ABS_FINALE_DECEL',
    'ABS_CAMERA_LOCK',
    'ABS_TERMINAL_FRAME',
  ]) {
    assert.ok(cueNames.has(cue), `The camera track omits ${cue}.`);
  }
  for (const retiredCue of ['ABS_STAGE_06', 'ABS_STAGE_06_LENS_CENTRE']) {
    assert.equal(cueNames.has(retiredCue), false, `The retired lens cue ${retiredCue} returned.`);
  }
  const cameraLock = cameraTrack.journeyCues.find((cue) => cue.name === 'ABS_CAMERA_LOCK');
  const terminal = cameraTrack.journeyCues.find((cue) => cue.name === 'ABS_TERMINAL_FRAME');
  assert.ok(cameraLock.progress >= 0.9 && cameraLock.progress <= 0.92);
  assert.equal(terminal.progress, 1);
  const lockIndex = Math.round(cameraLock.progress * (cameraTrack.samples.length - 1));
  const lockSample = cameraTrack.samples[lockIndex];
  const stationaryTail = cameraTrack.samples.slice(lockIndex);
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
}

function validateFinalBankPrefixes(metadata, surfelBytes, cameraBytes) {
  const track = JSON.parse(cameraBytes.toString('utf8'));
  const pose = track.samples.at(-1);
  const [qx, qy, qz, qw] = [-pose[3], -pose[4], -pose[5], pose[6]];
  const model = metadata.models.find((candidate) => candidate.key === 'about.05');
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
        `${profile} starves the ${side === 0 ? 'left' : 'right'} final bank in its nested point prefix `
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
  validateCamera(metadata, cameraBytes);
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
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`[about-point-scene] ${error.message}\n`);
  process.exitCode = 1;
}
