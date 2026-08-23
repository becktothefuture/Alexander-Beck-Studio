#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const ASSET_DIR = path.join(
  REPO_ROOT,
  'react-app/app/public/models/about-v2-edited-world',
);
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
}

function validateSurfels(metadata, bytes) {
  const stride = metadata.layout.strideBytes;
  const count = metadata.files.surfels.count;
  assert.equal(bytes.byteLength, count * stride);
  assert.equal(metadata.profiles.master.surfelCount, count);
  assert.equal(metadata.profiles.mobile.surfelCount, 20000);
  assert.equal(metadata.profiles.desktop.surfelCount, 60000);
  assert.equal(metadata.profiles.master.surfelCount, 90000);
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
  const weightedSurfaceArea = metadata.source.objects.reduce(
    (sum, object) => sum + (object.surfaceArea * object.sceneDensityWeight),
    0,
  );
  const masterDensity = metadata.profiles.master.surfelCount / weightedSurfaceArea;
  metadata.source.objects.forEach((object) => {
    const density = metadata.profiles.master.perObjectCounts[object.objectKey]
      / (object.surfaceArea * object.sceneDensityWeight);
    assert.ok(
      Math.abs(density - masterDensity) <= 0.12,
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
    assert.ok(page.profileCounts.desktop <= 60000, `${page.id} exceeds the desktop GPU page budget.`);
    assert.ok(page.profileCounts.mobile <= 20000, `${page.id} exceeds the mobile GPU page budget.`);
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
  assert.equal(cameraTrack.orientation.neutralHorizon, 'Z_UP');
  cameraTrack.samples.forEach((sample) => {
    assert.equal(sample.length, 7);
    assert.ok(sample.every(Number.isFinite));
  });
  const finalSample = cameraTrack.samples.at(-1);
  assert.ok(
    Math.hypot(finalSample[4], finalSample[5]) < 0.0001,
    'The final Blender camera must return to a level horizon.',
  );
}

function main() {
  const metadata = readJson(META_PATH);
  validateMetadata(metadata);
  validateSource(metadata);
  const surfelBytes = assetBytes(metadata.files.surfels);
  const cameraBytes = assetBytes(metadata.files.cameraTrack);
  validateSurfels(metadata, surfelBytes);
  validatePages(metadata);
  validateCamera(metadata, cameraBytes);
  process.stdout.write(`${JSON.stringify({
    status: 'ok',
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
