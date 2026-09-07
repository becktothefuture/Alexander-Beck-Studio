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
import { resolveAboutBlenderSceneContract } from '../../react-app/app/src/routes/about-narrative-lab/aboutBlenderSceneContract.js';
import { ABOUT_BLENDER_STAGE_IDS } from '../../react-app/app/src/routes/about-narrative-lab/aboutBlenderStages.js';
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
  --source-blend <path>  Validate that candidate against an explicit Blender source.
  --validate-path-only   Resolve and report the selected directory without reading assets.
  --help                 Show this help.
`;

function parseCliArgs(argv) {
  let assetDir = CANONICAL_ASSET_DIR;
  let sourceBlend = null;
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
    } else if (argument === '--source-blend') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--source-blend requires a path.');
      sourceBlend = path.resolve(value);
      index += 1;
    } else if (argument.startsWith('--source-blend=')) {
      const value = argument.slice('--source-blend='.length);
      if (!value) throw new Error('--source-blend requires a path.');
      sourceBlend = path.resolve(value);
    } else if (argument === '--validate-path-only') {
      validatePathOnly = true;
    } else if (argument === '--help') {
      return { assetDir: path.resolve(assetDir), help: true, sourceBlend, validatePathOnly };
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return { assetDir: path.resolve(assetDir), help: false, sourceBlend, validatePathOnly };
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
const CURRENT_EXPECTED_MODEL_KEYS = ABOUT_BLENDER_STAGE_IDS.filter((key) => key !== 'about.01');
const EXPECTED_PROFILE_COUNTS = {
  mobile: [2000, 2000, 10000, 3000, 6000, 7000],
  desktop: [5000, 6000, 30000, 8000, 18500, 22500],
  master: [7500, 9000, 45000, 12000, 27750, 33750],
};
const PROFILE_INDEX = { mobile: 0, desktop: 1, master: 2 };

function expectedModelPaletteRoles(metadata, modelKey) {
  if (modelKey === 'about.05') return new Set([0, 1, 3, 4, 5]);
  const objects = metadata.source.objects.filter((object) => object.modelKey === modelKey);
  if (modelKey === 'about.06' && objects.some((object) => object.paletteMode === 'single')) {
    assert.ok(objects.every((object) => object.paletteMode === 'single' && object.paletteRole === 'stone'),
      'The coherent bust palette must use the live Home Stone role.');
    return new Set([1]);
  }
  return new Set([0, 1, 2, 3, 4, 5]);
}
const EXPECTED_GATE_OBJECT_KEY = 'director.square-gate-tunnel';
const EXPECTED_ROUND_TUNNEL_OBJECT_KEY = 'director.round-tunnel';
const EXPECTED_VISIBILITY_BINDINGS = new Map([
  ['about.00', ['opening', 0, 'portal-entry', 0.3]],
  ['about.02', ['portal-entry', -0.9, 'personal-origin', 0.3]],
  ['about.03', ['personal-origin', -0.3, 'gate-entry', 0.3]],
  ['about.04', ['gate-entry', -0.3, 'split-lattice-entry', 0.3]],
  ['about.05', ['method', -0.3, 'terminal-hold', 0.9]],
  ['about.06', ['method', -0.3, 'terminal-hold', 0.3]],
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
  'ABS_INVITATION',
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
  assert.equal(metadata.palette.owner, 'website runtime code via Blender semantic roles');
  assert.equal(metadata.palette.runtimeResolution, 'design-system Home palette');
  assert.deepEqual(metadata.palette.assignment, {
    owner: 'Blender object properties and semantic materials',
    modeProperty: 'abs_palette_mode',
    roleProperty: 'abs_palette_role',
    seedProperty: 'abs_palette_seed',
    defaultMode: 'mixed',
    modes: ['mixed', 'single', 'authored-faces'],
    exportedValue: 'stable semantic role identifier',
  });
  assert.equal(
    metadata.palette.blenderPreview.source,
    'react-app/app/src/palette/simulationPaletteController.js',
  );
  assert.ok(metadata.palette.blenderPreview.paletteId);
  assert.ok(metadata.palette.blenderPreview.periodId);
  assert.equal(
    metadata.palette.blenderPreview.authority,
    'preview-only; website runtime remains the production colour owner',
  );
  assert.equal(metadata.source.samplingPolicy.fog, 'blender-camera-depth-exported-directly');
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
  assert.ok(metadata.motionGroups.length <= 32, 'The runtime shader supports at most 32 motion groups.');
  assert.ok(Array.isArray(metadata.source.objects) && metadata.source.objects.length > 0);
  assert.equal(metadata.source.objectCount, metadata.source.objects.length);
  assert.equal(metadata.files.surfels.file, 'surfels.bin');
  assert.equal('depthPositions' in metadata.files, false, 'Destructive triangle depth proxy returned.');
  assert.equal('depthIndices' in metadata.files, false, 'Destructive triangle depth proxy returned.');
  assert.equal(metadata.files.cameraTrack.file, 'camera-track.json');
}

function validateSource(metadata) {
  const sourcePath = CLI.sourceBlend || path.resolve(REPO_ROOT, metadata.source.file);
  if (!CLI.sourceBlend) {
    assert.ok(
      sourcePath.startsWith(`${REPO_ROOT}${path.sep}`),
      'Source file must resolve inside the repository.',
    );
  }
  const sourceBytes = fs.readFileSync(sourcePath);
  assert.equal(
    sha256(sourceBytes),
    metadata.source.sha256,
    'Point assets are stale against the authored Blender scene.',
  );
  const objectKeys = new Set();
  const paletteRolesByModel = new Map();
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
    assert.ok(['mixed', 'single', 'authored-faces'].includes(object.paletteMode),
      `${object.objectKey} has no supported palette mode.`);
    assert.ok(Number.isInteger(object.paletteSeed) && object.paletteSeed >= 0,
      `${object.objectKey} has no stable palette seed.`);
    assert.ok(Array.isArray(object.paletteRoles) && object.paletteRoles.length > 0,
      `${object.objectKey} exports no semantic palette roles.`);
    if (object.paletteMode === 'single') {
      assert.ok(metadata.palette.roles.includes(object.paletteRole),
        `${object.objectKey} has an invalid single-role override.`);
      assert.deepEqual(object.paletteRoles, [metadata.palette.roles.indexOf(object.paletteRole)]);
    } else {
      assert.equal(object.paletteRole, null,
        `${object.objectKey} keeps a role override outside single mode.`);
    }
    const modelRoles = paletteRolesByModel.get(object.modelKey) || new Set();
    object.paletteRoles.forEach((role) => modelRoles.add(role));
    paletteRolesByModel.set(object.modelKey, modelRoles);
  }
  CURRENT_EXPECTED_MODEL_KEYS.forEach((modelKey) => {
    const expectedRoles = expectedModelPaletteRoles(metadata, modelKey);
    assert.deepEqual(
      paletteRolesByModel.get(modelKey),
      expectedRoles,
      `${modelKey} does not contain its authored ecosystem mixture.`,
    );
  });
  const authoring = metadata.source.authoring;
  assert.equal(authoring?.geometryOwner, 'about.controls');
  assert.ok([
    'editable-bezier-path,scene-layout,fov,visibility-distance,camera-fog',
    'editable-bezier-path,camera-roll,stage-distance,geometry,density,point-scale,fov,visibility-distance,camera-fog',
  ].includes(authoring?.blenderAuthority), 'The Blender authoring authority is not recognised.');
  assert.equal(
    authoring?.runtimeAuthority,
    'design-system-home-ball-palette,rendering-quality',
  );
  assert.equal(authoring?.cameraFog?.source, 'about.controls');
  assert.equal(
    authoring?.cameraFog?.startWU,
    authoring?.controlValues?.['About Controls / 02 Fog Start']
      ?? authoring?.controlValues?.camera_draw_start_wu,
    'Exported fog start must follow the Blender control.',
  );
  assert.equal(
    authoring?.cameraFog?.endWU,
    authoring?.controlValues?.['About Controls / 03 Fog End']
      ?? authoring?.controlValues?.camera_draw_end_wu,
    'Exported fog end must follow the Blender control.',
  );
  assert.equal(
    authoring?.cameraFog?.curve,
    authoring?.controlValues?.['About Controls / 04 Fog Curve']
      ?? authoring?.controlValues?.camera_fog_curve,
    'Exported fog curve must follow the Blender control.',
  );
  assert.ok(Array.isArray(authoring.controls), 'The Blender source exposes no authoring controls.');
  if (authoring.controlValues) {
    assert.deepEqual(Object.keys(authoring.controlValues).sort(), authoring.controls,
      'The read-only development preview does not mirror every Blender control.');
    assert.ok(Object.values(authoring.controlValues).every(Number.isFinite),
      'The read-only development preview contains a non-finite Blender control.');
  }
  const simplifiedControls = [
    'About Controls / 01 Camera FOV',
    'About Controls / 02 Fog Start',
    'About Controls / 03 Fog End',
    'About Controls / 04 Fog Curve',
    'About Controls / 05 Opening Start (%)',
    'About Controls / 06 Opening End (%)',
    'About Controls / 07 Body Count',
    'About Controls / 08 Bodies Start (%)',
    'About Controls / 09 Bodies End (%)',
    'About Controls / 10 Body Size',
    'About Controls / 11 Body Spread',
    'About Controls / 12 Body Rotation',
    'About Controls / 13 Copies Per Shape',
    'About Controls / 14 Random Seed',
    'About Controls / 15 Minimum Gap',
    'About Controls / 16 Start (%)',
    'About Controls / 17 End (%)',
    'About Controls / 18 Ring Count',
    'About Controls / 19 Opening Radius',
    'About Controls / 20 Ring Thickness',
    'About Controls / 21 Ring Depth',
    'About Controls / 22 Landscape Start (%)',
    'About Controls / 23 Landscape End (%)',
    'About Controls / 24 Mountain Height',
    'About Controls / 25 Mountain Detail',
    'About Controls / 26 Start (%)',
    'About Controls / 27 End (%)',
    'About Controls / 28 Gate Count',
    'About Controls / 29 Opening Size',
    'About Controls / 30 Frame Thickness',
    'About Controls / 31 Gate Depth',
    'About Controls / 32 Twist',
    'About Controls / 33 Bust Scale',
    'About Controls / 34 Orbit Amount',
    'About Controls / 35 Orbit Radius',
    'About Controls / 36 Platform Turn',
    'About Controls / 37 Gate Growth',
  ];
  const usesSimplifiedControls = authoring.controls.includes('About Controls / 01 Camera FOV');
  if (usesSimplifiedControls) {
    assert.equal(authoring.controls.length, simplifiedControls.length,
      'The Blender source must expose only the master About Controls surface.');
    for (const required of simplifiedControls) {
      assert.ok(authoring.controls.includes(required), `Missing Blender control ${required}.`);
    }
    for (const [startKey, endKey, label] of [
      ['About Controls / 05 Opening Start (%)', 'About Controls / 06 Opening End (%)', 'Opening Field'],
      ['About Controls / 22 Landscape Start (%)', 'About Controls / 23 Landscape End (%)', 'Landscape'],
    ]) {
      assert.ok(authoring.controlValues[startKey] < authoring.controlValues[endKey],
        `${label} Start must remain before End.`);
    }
    assert.ok(authoring.controls.every((name) => name.startsWith('About Controls / ')),
      'A public Blender control still lives outside About Controls.');
    assert.ok(authoring.controls.every((name) => !name.includes('_')),
      'Technical property names must not leak into the authoring surface.');
  } else {
    assert.ok(authoring.controls.length >= 53,
      'The legacy Blender source does not expose its complete geometry controls.');
    for (const required of [
      'camera_horizontal_fov_degrees',
      'camera_draw_start_wu',
      'camera_draw_end_wu',
      'camera_fog_curve',
      'scene_visibility_fade_wu',
      'method_retire_before_finale_wu',
      'finale_lead_in_wu',
      'opening_width_scale',
      'forms_start_progress',
      'forms_body_count',
      'forms_rotation_turns',
      'round_tunnel_ring_count',
      'round_tunnel_aperture_radius_wu',
      'round_tunnel_rim_wu',
      'round_tunnel_half_depth_wu',
      'round_tunnel_end_progress',
      'terrain_progress',
      'square_gate_count',
      'square_gate_half_width_wu',
      'square_gate_half_height_wu',
      'square_gate_rim_wu',
      'square_gate_half_depth_wu',
      'square_gate_start_progress',
      'horizon_banks_progress',
      'finale_progress',
    ]) {
      assert.ok(authoring.controls.includes(required), `Missing Blender control ${required}.`);
    }
  }
  assert.ok(authoring.controls.every((name) => !/(?:colou?r|palette)/i.test(name)),
    'Colour controls must remain code-owned.');
  assert.deepEqual(metadata.visibility, {
    owner: 'Blender scene controls',
    source: 'about.controls',
    resolution: 'semantic camera cues plus Blender-authored distance offsets',
  });
  assert.deepEqual(authoring.helperObjects, [
    'About Controls',
    'Bust Focus',
    'Finale Approach Start',
    'Finale Camera Rig',
    'Finale Position',
    'Landscape Position',
    'Opening Position',
    'Tunnel Camera Aim',
    'Tunnel Camera Path',
    'Tunnel Camera Roll',
  ], 'The Blender source has accumulated unneeded helper empties.');
  const openingObjects = metadata.source.objects.filter((object) => object.modelKey === 'about.00');
  assert.equal(openingObjects.length, 1,
    'The opening must remain one readable Blender field, not a stack of export layers.');
  const openingField = openingObjects[0];
  assert.equal(openingField.objectKey, 'director.opening-field');
  assert.equal(openingField.name, 'Opening Field');
  assert.equal(openingField.geometryKind, 'opening-field');
  assert.equal(openingField.minimumProfile, 'mobile');
  assert.equal(openingField.samplingPattern, 'surface-blue-noise');
  assert.equal(openingField.samplingDensityAttribute, 'abs_sampling_density');
  assert.ok(openingField.connectedComponentCount >= 600
    && openingField.connectedComponentCount <= 1600,
    'Opening Field must remain one bounded volumetric particle field, not retained legacy layers.');
  assert.ok(metadata.source.objects.every((object) => object.modelKey !== 'about.01'),
    'The excluded finale bodies must not consume the active point budget.');
  assert.ok(metadata.source.objects.every((object) => !object.name.startsWith('ABS_B27_SHAPE_')),
    'The former 42-object shape scatter must not survive the parametric body rebuild.');
  assert.ok(metadata.source.objects.some((object) => object.geometryKind === 'finale-platform'));
  assert.ok(metadata.source.objects.some((object) => object.geometryKind === 'licensed-reconstructed-bust-mesh'));
  assert.equal(
    metadata.source.objects.reduce((sum, object) => sum + object.triangles, 0),
    metadata.source.triangleCount,
  );
  const route = metadata.source.route;
  assert.ok(route, 'The source does not expose its evaluated camera route.');
  assert.equal(route.object, 'about.camera-path');
  assert.equal(route.displayName, 'Camera Path');
  assert.ok(
    Number.isInteger(route.controlPointCount) && route.controlPointCount >= 4,
    'The camera route must be an evaluated curve with at least four control points.',
  );
  assert.ok(Number.isFinite(route.evaluatedLength) && route.evaluatedLength > 100,
    'The evaluated camera route is missing or too short for the seven-stage journey.');
  assert.ok(route.evaluatedLength >= 1900,
    'The camera route must remain at least twice the previous 975 WU journey.');
  assert.match(route.shapeSha256, /^[a-f0-9]{64}$/);
  assert.equal(route.splineCount, 1, 'The camera journey must remain one continuous spline.');
  const stageIds = ABOUT_BLENDER_STAGE_IDS;
  assert.deepEqual(Object.keys(route.stageRanges || {}), stageIds,
    'The camera route must expose seven ordered stage ranges.');
  let previousStart = -Infinity;
  let previousEnd = -Infinity;
  const physicalStageLengths = [];
  for (const [stageIndex, stageId] of stageIds.entries()) {
    const range = route.stageRanges[stageId];
    assert.ok(Array.isArray(range) && range.length === 2 && range.every(Number.isFinite),
      `Route stage ${stageId} has an invalid range.`);
    assert.ok(range[0] >= 0 && range[1] <= 1 && range[0] < range[1],
      `Route stage ${stageId} falls outside the normalized journey.`);
    assert.ok(range[0] >= previousStart && range[1] >= previousEnd,
      `Route stage ${stageId} is out of physical order.`);
    if (stageIndex > 0) {
      assert.ok(Math.abs(range[0] - previousEnd) <= 0.000001,
        `Route stage ${stageId} does not begin at the previous physical boundary.`);
    }
    physicalStageLengths.push(range[1] - range[0]);
    previousStart = range[0];
    previousEnd = range[1];
  }
  assert.equal(route.stageRanges[stageIds[0]][0], 0,
    'The first route stage must begin at the path origin.');
  assert.equal(route.stageRanges[stageIds.at(-1)][1], 1,
    'The final route stage must reach the path endpoint.');
  assert.ok(physicalStageLengths.every((length) => length > 0),
    'Every semantic section needs positive camera-path distance.');

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
    'The active model inventory must exclude the retained finale bodies.',
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

  const gateModel = metadata.models.find((model) => model.key === 'about.04');
  assert.equal(gateModel.key, 'about.04');
  assert.deepEqual(gateModel.objectKeys, [EXPECTED_GATE_OBJECT_KEY],
    'The square-gate stage must contain one parametric gate family and no ambient veil.');
  const gateObject = byKey[EXPECTED_GATE_OBJECT_KEY];
  assert.ok(gateObject, 'The parametric square-gate family is missing from the saved source.');
  assert.equal(gateObject.modelKey, 'about.04');
  assert.equal(gateObject.role, 'path-tunnel');
  assert.equal(gateObject.geometryKind, 'parametric-square-gate-tunnel');
  assert.ok(gateObject.instanceCount >= 4 && gateObject.instanceCount <= 96,
    'The square-gate family must generate 4–96 gates from one Blender object.');
  assert.equal(gateObject.connectedComponentCount, gateObject.instanceCount,
    'Every generated square gate must remain one discrete aperture component.');
  assert.deepEqual(gateObject.paletteRoles, [0, 1, 2, 3, 4, 5],
    'The generated square gates must retain the coded six-role palette cycle.');
  assert.equal(authoring.controlValues['About Controls / 37 Gate Growth'], 3.2,
    'The authored square-gate growth control changed.');

  const roundTunnelObject = byKey[EXPECTED_ROUND_TUNNEL_OBJECT_KEY];
  assert.deepEqual(metadata.models.find((model) => model.key === 'about.02').objectKeys, [EXPECTED_ROUND_TUNNEL_OBJECT_KEY],
    'The round-tunnel stage must contain one parametric hoop family.');
  assert.ok(roundTunnelObject, 'The parametric round-tunnel family is missing from the saved source.');
  assert.equal(roundTunnelObject.geometryKind, 'parametric-round-tunnel');
  assert.ok(roundTunnelObject.instanceCount >= 4 && roundTunnelObject.instanceCount <= 120,
    'The round-tunnel family must generate 4–120 hoops from one Blender object.');
  assert.equal(roundTunnelObject.connectedComponentCount, roundTunnelObject.instanceCount,
    'Every generated round hoop must remain one discrete aperture component.');
  assert.deepEqual(roundTunnelObject.paletteRoles, [0, 1, 2, 3, 4, 5],
    'The generated round tunnel must retain the coded six-role palette cycle.');

  const continuousFloor = largestSemanticSurface(metadata, 'about.03', 'The continuous middle journey');
  assert.equal(continuousFloor.connectedComponentCount, 1,
    'The middle journey floor must remain one continuous semantic surface.');
  assert.ok(extent(continuousFloor, 0) >= 128,
    'The continuous floor no longer overscans the camera corridor horizontally.');
  assert.ok(extent(continuousFloor, 2) >= 180,
    'The continuous floor no longer spans a substantial section of the route.');
  const roundToLandscapeGap = roundTunnelObject.bounds.min[2] - continuousFloor.bounds.max[2];
  const landscapeToGatesGap = continuousFloor.bounds.min[2] - gateObject.bounds.max[2];
  assert.ok(roundToLandscapeGap >= 12,
    `The round tunnel overlaps or crowds the landscape (${roundToLandscapeGap.toFixed(3)} WU).`);
  assert.ok(landscapeToGatesGap >= 12,
    `The landscape overlaps or crowds the square gates (${landscapeToGatesGap.toFixed(3)} WU).`);

  const finalePlatform = byKey['director.finale-platform'];
  const finaleBust = byKey['director.finale-surface'];
  assert.equal(finalePlatform?.geometryKind, 'finale-platform',
    'The finale approach platform is missing.');
  assert.ok(extent(finalePlatform, 0) >= 150 && extent(finalePlatform, 2) >= 150,
    'The finale approach platform is too small for the camera reveal.');
  assert.equal(finaleBust?.geometryKind, 'licensed-reconstructed-bust-mesh',
    'The finale bust is missing.');
  assert.equal(finaleBust.connectedComponentCount, 1,
    'The finale bust must be a connected surface, not independent sample triangles.');
  assert.ok(finaleBust.triangles >= 50000,
    'The finale bust needs enough source detail for dense surface sampling.');
  assert.ok(extent(finaleBust, 0) >= 80 && extent(finaleBust, 1) >= 100,
    'The finale bust has lost its readable authored scale.');
  assert.ok(Math.abs(finaleBust.bounds.min[1] - finalePlatform.bounds.max[1]) < 0.001,
    'The bust must meet the top of the platform without a gap or penetration.');

  const profilesByModel = {
    'about.00': 'atmosphere', 'about.02': 'solid', 'about.03': 'atmosphere',
    'about.04': 'solid', 'about.05': 'solid', 'about.06': 'bust',
  };
  for (const model of metadata.models) {
    assert.equal(model.renderingProfile, profilesByModel[model.key]);
    for (const object of metadata.source.objects.filter((entry) => entry.modelKey === model.key)) {
      assert.equal(object.renderingProfile, model.renderingProfile);
    }
  }
  const orderedModels = metadata.models;
  for (const model of orderedModels) {
    assert.ok(Number.isFinite(model.visibilityStartWU), `${model.key} has no visibility start.`);
    assert.ok(Number.isFinite(model.visibilityEndWU), `${model.key} has no visibility end.`);
    assert.ok(model.visibilityEndWU > model.visibilityStartWU, `${model.key} has an empty visibility window.`);
    assert.ok(Number.isFinite(model.visibilityHandoffWU)
      && model.visibilityHandoffWU > 0 && model.visibilityHandoffWU <= 0.35,
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

function validateAuthoredMotion(metadata) {
  const motionObjects = metadata.source.objects.filter((object) => object.motion);
  const rotations = motionObjects.filter(
    (object) => ['continuous-rotation', 'bounded-rotation'].includes(object.motion.behavior),
  );
  const terrainWaves = motionObjects.filter(
    (object) => object.motion.behavior === 'terrain-wave',
  );
  const solidRotations = rotations.filter((object) => object.modelKey === 'about.01');
  const bustRotations = rotations.filter((object) => object.modelKey === 'about.06');
  assert.equal(solidRotations.length, 0,
    'Excluded bodies must not retain active runtime motion groups.');
  assert.equal(terrainWaves.length, 1,
    'The landscape must retain one coherent terrain deformation contract.');
  assert.equal(terrainWaves[0].modelKey, 'about.03');
  assert.equal(bustRotations.length, 1,
    'The finale bust must retain its bounded rotation contract.');
  const bustMotion = bustRotations[0].motion;
  assert.equal(bustMotion.behavior, 'bounded-rotation');
  assert.ok(Math.abs(bustMotion.amplitudeRadians - 8 * Math.PI / 180) < 1e-7);
  assert.equal(bustMotion.periodSeconds, 32);
  assert.deepEqual(bustMotion.axis, [0, 1, 0]);
  assert.ok(Math.abs(bustMotion.radiansPerSecond * bustMotion.periodSeconds - 2 * Math.PI) < 1e-6);
  for (const object of motionObjects) {
    const { axis, radiansPerSecond, timeSource } = object.motion;
    assert.equal(timeSource, 'ambient-seconds', `${object.objectKey} motion can stop with scroll.`);
    assert.ok(Array.isArray(axis) && axis.length === 3
      && axis.every(Number.isFinite), `${object.objectKey} has an invalid motion axis.`);
    assert.ok(Math.abs(Math.hypot(...axis) - 1) <= 1e-5,
      `${object.objectKey} motion axis is not normalised.`);
    assert.ok(Number.isFinite(radiansPerSecond)
      && radiansPerSecond >= 0.005 && radiansPerSecond <= 1,
    `${object.objectKey} has an invalid motion speed.`);
  }
  const terrain = terrainWaves[0].motion;
  assert.ok(terrain.amplitudeWU >= 0.1 && terrain.amplitudeWU <= 12);
  assert.ok(terrain.wavelengthWU >= 12 && terrain.wavelengthWU <= 400);
  assert.ok(terrain.secondaryScale >= 0 && terrain.secondaryScale <= 1);
  const authoredGroups = metadata.motionGroups.filter((group) => group.motion);
  assert.equal(authoredGroups.length, motionObjects.length,
    'Every animated Blender object must have its own compact runtime motion group.');
  for (const object of motionObjects) {
    const group = authoredGroups.find((entry) => entry.key === object.motionKey);
    assert.ok(group, `${object.objectKey} has no runtime motion group.`);
    assert.equal(group.motion.behavior, object.motion.behavior);
    assert.deepEqual(group.motion.axis, object.motion.axis);
    assert.equal(group.motion.radiansPerSecond, object.motion.radiansPerSecond);
    if (['continuous-rotation', 'bounded-rotation'].includes(object.motion.behavior)) {
      assert.deepEqual(group.motion.pivotWU, object.worldOrigin,
        `${object.objectKey} rotation does not use its Blender origin.`);
    }
  }
}

function validateTerrainGateClearance(metadata, surfelBytes) {
  if (!metadata.source.readingSpaceFit?.terrainEndOnPath) return;
  const terrain = metadata.models.find((model) => model.key === 'about.03');
  const gates = [metadata.source.objects.find(
    (object) => object.objectKey === EXPECTED_GATE_OBJECT_KEY,
  )];
  assert.ok(terrain && gates.every(Boolean), 'Fitted terrain requires the parametric gate family.');
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
    const expectedRoles = expectedModelPaletteRoles(metadata, model.key);
    assert.deepEqual(
      modelPaletteRoles[model.id],
      expectedRoles,
      `${model.key} must retain its authored semantic roles in the point buffer.`,
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
  const gateObject = metadata.source.objects.find(
    (object) => object.objectKey === EXPECTED_GATE_OBJECT_KEY,
  );
  assert.ok(gateObject, 'The parametric gate family is missing from surfel allocation metadata.');
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
  for (const profileName of ['mobile', 'desktop', 'master']) {
    const gateCount = metadata.profiles[profileName].perObjectCounts[EXPECTED_GATE_OBJECT_KEY];
    assert.equal(gateCount, metadata.profiles[profileName].perModelCounts['about.04'],
      `${profileName} must allocate the full gate-stage budget to its one parametric family.`);
    assert.ok(gateCount >= gateObject.instanceCount * 96,
      `${profileName} must preserve every generated gate, including the final gates.`);
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
      'Saved active-model budget contract changed.',
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
    const contract = resolveAboutBlenderSceneContract({ meta: metadata, cameraTrack, storyMap: plan.journeyMap });
    assert.equal(contract.status, 'compatible',
      `${profile} runtime rejects the exported scene: ${JSON.stringify(contract.diagnostics)}`);
    const map = resolveAboutNarrativeJourneyMap(plan.journeyMap, cameraTrack);
    assert.equal(map.valid, true, JSON.stringify(map.diagnostics));
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
    const windows = Object.fromEntries(resolvedWindows.map((window) => {
      const { model, startWU, endWU } = window;
      const previous = resolvedWindows
        .filter((candidate) => candidate.startWU < startWU)
        .sort((left, right) => right.startWU - left.startWU)[0];
      const next = resolvedWindows
        .filter((candidate) => candidate.startWU > startWU)
        .sort((left, right) => left.startWU - right.startWU)[0];
      const entranceHandoffWU = previous
        ? Math.min(model.visibilityHandoffWU,
          Math.max(0.001, (previous.endWU - startWU) * 0.5))
        : model.visibilityHandoffWU;
      const exitHandoffWU = next
        ? Math.min(model.visibilityHandoffWU,
          Math.max(0.001, (endWU - next.startWU) * 0.5))
        : model.visibilityHandoffWU;
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
    assert.equal(windows['about.01'], undefined,
      `${profile} admits the excluded body model.`);
    assert.equal(windows['about.04'].shapingFocusVisibility, 0,
      `${profile} still shows passed square gates at shaping focus.`);
    assert.equal(windows['about.05'].shapingFocusVisibility, 1,
      `${profile} has not retained the finale platform beneath the bust.`);
    assert.equal(windows['about.06'].shapingFocusVisibility, 1,
      `${profile} has not restored the bust for the earlier finale reveal.`);
    assert.equal(windows['about.06'].thinkingFocusVisibility, 1,
      `${profile} has not retained the bust through the closing titles.`);
    assert.equal(windows['about.06'].finalHoldVisibility, 1,
      `${profile} has not retained the finale through the terminal hold.`);
    for (const retiredKey of ['about.00', 'about.02', 'about.03', 'about.04']) {
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
    assert.equal(windows['about.06'].effectiveShapingFocusVisibility, 1,
      `${profile} has not established the restored bust by the first closing title.`);
    assert.equal(windows['about.06'].effectiveThinkingFocusVisibility, 1,
      `${profile} has not retained the restored bust before the invitation.`);
    assert.equal(windows['about.06'].effectiveFinalHoldVisibility, 1,
      `${profile} has not retained the finale through the effective terminal hold.`);
    const lateHandoffOverlapWU = windows['about.05'].endWU - windows['about.06'].startWU;
    const requiredLateHandoffOverlapWU = (
      windows['about.05'].handoffWU + windows['about.06'].handoffWU
    );
    assert.ok(lateHandoffOverlapWU >= requiredLateHandoffOverlapWU,
      `${profile} platform/bust handoff has no fully established overlap `
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
  assert.equal(
    cameraTrack.projection.horizontalFov,
    metadata.source.authoring.controlValues?.['About Controls / 01 Camera FOV']
      ?? metadata.source.authoring.controlValues?.camera_horizontal_fov_degrees,
    'The exported camera FOV must follow the Blender control.',
  );
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
  const finaleDecelFrame = cameraTrack.journeyCues
    .find((cue) => cue.name === 'ABS_FINALE_DECEL')?.frame;
  const droneAngularVelocity = Number.isFinite(finaleDecelFrame)
    ? angularVelocity.slice(0, finaleDecelFrame - cameraTrack.frameStart)
    : angularVelocity;
  const angularVelocityP95 = percentile(droneAngularVelocity, 0.95);
  assert.ok(
    angularVelocityP95 < 1.1,
    `Camera angular velocity before the deliberate finale orbit is too reactive at p95 (${angularVelocityP95.toFixed(3)} degrees/frame).`,
  );
  assert.ok(
    Math.max(...angularVelocity) < 1.65,
    `Camera angular velocity spikes to ${Math.max(...angularVelocity).toFixed(3)} degrees/frame.`,
  );
  assert.ok(Math.max(...angularAcceleration.map(Math.abs)) < 0.25,
    `Camera angular acceleration spikes to ${Math.max(...angularAcceleration.map(Math.abs)).toFixed(3)} degrees/frame².`);
  assert.ok(Math.max(...angularJerk.map(Math.abs)) < 0.15,
    `Camera angular jerk spikes to ${Math.max(...angularJerk.map(Math.abs)).toFixed(3)} degrees/frame³.`);

  assert.equal(cameraTrack.gatePassage?.source, 'director.square-gate-tunnel');
  assert.equal(cameraTrack.gatePassage?.displayName, 'Square Gates');
  assert.deepEqual(cameraTrack.gatePassage.traversal, {
    forward: true,
    reverse: true,
    mode: 'same-centreline-reversible',
  });
  const gateMeasurement = measureCameraGatePassage(cameraTrack);
  const gateObject = metadata.source.objects.find(
    (object) => object.objectKey === EXPECTED_GATE_OBJECT_KEY,
  );
  assertCameraGatePassage(gateMeasurement, gateObject.instanceCount);
  const methodCue = cameraTrack.journeyCues.find((cue) => cue.name === 'ABS_METHOD_RELEASE');
  const methodGate = gateMeasurement.gates.reduce((nearest, gate) => (
    Math.abs(gate.crossing.progress - methodCue.progress)
      < Math.abs(nearest.crossing.progress - methodCue.progress) ? gate : nearest
  ));
  assert.ok(methodGate.id >= 17,
    'The method passage must begin after the square tunnel has opened through its doubled gates.');
  assert.ok(methodGate.aperture.scale >= 2,
    'The square tunnel must be at least twice its initial size at method entry.');

  assert.deepEqual(cameraTrack.roundTunnelPassage?.traversal, {
    forward: true,
    reverse: true,
    mode: 'same-centreline-reversible',
  }, 'The round tunnel must expose the same reversible passage semantics as the square gates.');
  const roundTunnelMeasurement = measureCameraRoundTunnelPassage(cameraTrack);
  assert.equal(cameraTrack.roundTunnelPassage?.source, 'director.round-tunnel');
  assert.equal(cameraTrack.roundTunnelPassage?.displayName, 'Round Tunnel');
  const roundTunnelObject = metadata.source.objects.find(
    (object) => object.objectKey === EXPECTED_ROUND_TUNNEL_OBJECT_KEY,
  );
  assert.equal(roundTunnelMeasurement.apertures.length, roundTunnelObject.instanceCount,
    'The round-tunnel passage record must cover every generated aperture.');
  assertCameraRoundTunnelPassage(roundTunnelMeasurement, roundTunnelObject.instanceCount);

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
  assert.ok(distanceCv <= 0.5 && maximumCadenceError <= 1.05,
    `Camera distance cadence is unbounded (CV ${distanceCv.toFixed(4)}, max error ${(maximumCadenceError * 100).toFixed(2)}%).`);
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
  const stageCues = ABOUT_BLENDER_STAGE_IDS.map((_, index) => (
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
    `The square-gate discard cue occurs before all ${gateMeasurement.gates.length} gates are crossed.`);

  const lockSample = cameraTrack.samples[holdStartIndex];
  const stationaryTail = cameraTrack.samples.slice(holdStartIndex);
  const maximumTailPositionDrift = Math.max(...stationaryTail.map((sample) => Math.hypot(
    sample[0] - lockSample[0],
    sample[1] - lockSample[1],
    sample[2] - lockSample[2],
  )));
  const maximumTailQuaternionDrift = Math.max(...stationaryTail.map(
    (sample) => quaternionAngleDegrees(lockSample, sample),
  ));
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
  const finaleBust = metadata.source.objects.find(
    (object) => object.geometryKind === 'licensed-reconstructed-bust-mesh',
  );
  assert.ok(finaleBust, 'The finale camera has no bust target.');
  const bustCentre = finaleBust.bounds.min.map(
    (minimum, index) => (minimum + finaleBust.bounds.max[index]) * 0.5,
  );
  const bustOffset = bustCentre.map((value, index) => value - lockSample[index]);
  const rightOffset = bustOffset.reduce(
    (sum, value, index) => sum + value * finalRight[index], 0,
  );
  const upOffset = bustOffset.reduce(
    (sum, value, index) => sum + value * finalUp[index], 0,
  );
  const forwardOffset = bustOffset.reduce(
    (sum, value, index) => sum + value * finalForward[index], 0,
  );
  const authoredOrbitRadius = metadata.source.authoring.controlValues?.[
    'About Controls / 35 Orbit Radius'
  ];
  assert.ok(forwardOffset > 0,
    'The held finale camera no longer points towards the bust.');
  assert.ok(Math.abs(rightOffset) <= 3,
    'The held finale camera no longer centres the bust horizontally.');
  assert.ok(Math.abs(upOffset) <= 80,
    'The held finale camera no longer frames the bust vertically.');
  if (Number.isFinite(authoredOrbitRadius)) {
    assert.ok(Math.abs(forwardOffset - authoredOrbitRadius) <= Math.max(12, authoredOrbitRadius * 0.1),
      'The held finale camera no longer respects the authored orbit radius.');
  }

  const continuousFloor = largestSemanticSurface(metadata, 'about.03', 'The continuous middle journey');
  const floorSamples = cameraTrack.samples.slice(0, holdStartIndex + 1).filter((sample) => (
    sample[2] >= continuousFloor.bounds.min[2] && sample[2] <= continuousFloor.bounds.max[2]
  ));
  assert.ok(floorSamples.length > 0, 'The camera never travels over the continuous floor.');
  assert.ok(floorSamples.every((sample) => (
    sample[0] >= continuousFloor.bounds.min[0] + 32
      && sample[0] <= continuousFloor.bounds.max[0] - 32
      && continuousFloor.bounds.min[1] <= sample[1] - 0.5
  )), 'The continuous floor loses its camera overscan or rises wholly above the camera path.');
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
  validateAuthoredMotion(metadata);
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
