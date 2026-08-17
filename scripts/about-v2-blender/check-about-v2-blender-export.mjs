#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const OUTPUT_DIR = path.resolve(
  process.argv[2] || path.join(REPO_ROOT, 'source-assets/about-v2-blender'),
);
const SOURCE_PATH = path.join(OUTPUT_DIR, 'about-v2-scene-source.json');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'about-v2-blender-manifest.json');
const BLEND_PATH = path.join(OUTPUT_DIR, 'about-v2-track-working.blend');
const GLB_PATH = path.join(OUTPUT_DIR, 'about-v2-track-reference.glb');
const FORBIDDEN_BOTTOM_ROLES = new Set([
  'continuous-deck',
  'continuous-rail',
  'track-ties',
  'signal-conduit',
  'ground-support',
]);

function finiteVector(values, size, label) {
  assert.equal(values.length, size, `${label} must contain ${size} values.`);
  assert.ok(values.every(Number.isFinite), `${label} must contain only finite values.`);
}

function distance(a, b) {
  return Math.hypot(...a.map((value, index) => value - b[index]));
}

function fileHeader(filePath, byteCount) {
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const bytes = Buffer.alloc(byteCount);
    fs.readSync(descriptor, bytes, 0, byteCount, 0);
    return bytes;
  } finally {
    fs.closeSync(descriptor);
  }
}

const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const configPath = path.join(REPO_ROOT, source.source.config);
const configHash = crypto
  .createHash('sha256')
  .update(fs.readFileSync(configPath))
  .digest('hex');
const editedWorldBlendPath = path.join(REPO_ROOT, source.source.editedWorldBlend);
const editedWorldBlendHash = crypto
  .createHash('sha256')
  .update(fs.readFileSync(editedWorldBlendPath))
  .digest('hex');

assert.equal(source.version, 2);
assert.equal(source.source.configSha256, configHash, 'Export source is stale against About V2 config.');
assert.equal(
  source.source.editedWorldBlendSha256,
  editedWorldBlendHash,
  'Export source is stale against the authored Blender geometry.',
);
assert.equal(source.timeline.durationSeconds, 120);
assert.equal(source.timeline.fps, 30);
assert.equal(source.timeline.frameStart, 1);
assert.equal(source.timeline.frameEnd, 3600);
assert.ok(source.timeline.storyDurationWU > 0);
assert.equal(source.camera.name, 'ABS_CAMERA');
assert.equal(source.camera.pathName, 'ABS_CAMERA_PATH');
assert.equal(source.camera.samples.length, source.camera.sampleCount);
assert.ok(source.camera.samples.length >= 240, 'Camera path must be sampled densely enough for Blender.');

let travelled = 0;
for (let index = 0; index < source.camera.samples.length; index += 1) {
  const sample = source.camera.samples[index];
  finiteVector(sample.position, 3, `camera sample ${index} position`);
  finiteVector(sample.quaternion, 4, `camera sample ${index} quaternion`);
  finiteVector(sample.lookAtTarget, 3, `camera sample ${index} target`);
  const quaternionLength = Math.hypot(...sample.quaternion);
  assert.ok(Math.abs(quaternionLength - 1) < 1e-5, `camera sample ${index} quaternion is not normalized.`);
  assert.equal(sample.fovDegrees, 85, `camera sample ${index} must keep the fixed 85 degree FOV.`);
  if (index > 0) travelled += distance(source.camera.samples[index - 1].position, sample.position);
}
assert.ok(travelled > 300, `Camera travel is unexpectedly short: ${travelled.toFixed(2)} m.`);

assert.ok(source.world.primitives.length > 0);
for (const primitive of source.world.primitives) {
  assert.notEqual(primitive.beat, 'rail', 'Removed rail beat returned to the Blender source.');
  assert.ok(
    !FORBIDDEN_BOTTOM_ROLES.has(primitive.role),
    `Removed bottom-track role returned: ${primitive.role}`,
  );
}
assert.ok(source.world.ocean, 'The editable terminal ocean is missing.');
assert.equal(source.world.ocean.gridColumns, 97);
assert.equal(source.world.ocean.gridRows, 129);
assert.equal(source.world.ocean.gridColumns * source.world.ocean.gridRows, 12513);
assert.ok(source.world.ocean.nearZ > source.world.ocean.farZ);
assert.ok(source.world.ocean.nearHalfWidth < source.world.ocean.farHalfWidth);
assert.equal(source.world.ocean.baseY, source.world.shapeParameters.oceanHeight);
assert.equal(source.world.ocean.animation.amplitude, source.world.shapeParameters.oceanAmplitude);
assert.equal(source.world.ocean.animation.speed, source.world.shapeParameters.oceanSpeed);
assert.equal(source.world.ocean.animation.chop, source.world.shapeParameters.oceanChop);
assert.equal(source.world.ocean.animation.fogDistanceScale, source.world.shapeParameters.oceanFogDistanceScale);

assert.equal(manifest.primitiveCount, source.world.primitives.length);
assert.equal(manifest.cameraSamples, source.camera.samples.length);
assert.deepEqual(manifest.frameRange, [1, 3600]);
assert.equal(manifest.durationSeconds, 120);
assert.deepEqual(manifest.forbiddenBottomTrackObjects, []);
assert.equal(manifest.version, 2);
assert.equal(manifest.ocean.object, 'ABS_OCEAN_SURFACE');
assert.equal(manifest.ocean.vertices, 12513);
assert.equal(manifest.ocean.faces, 12288);
assert.equal(manifest.ocean.modifierCount, 4);
assert.equal(manifest.ocean.paletteSlots, 6);
assert.equal(path.resolve(manifest.baseBlend), editedWorldBlendPath);
assert.ok(manifest.preservedAuthoredMeshObjects > 0, 'The authored Blender geometry was not preserved.');
assert.ok(manifest.meshObjectCount > 0);
assert.ok(manifest.vertices > 0);
assert.ok(manifest.polygons > 0);

assert.ok(fs.statSync(BLEND_PATH).size > 1_000_000, 'Blend file is unexpectedly small.');
assert.ok(fs.statSync(GLB_PATH).size > 1_000_000, 'GLB file is unexpectedly small.');
assert.equal(fileHeader(BLEND_PATH, 7).toString('ascii'), 'BLENDER');
assert.equal(fileHeader(GLB_PATH, 4).toString('ascii'), 'glTF');

process.stdout.write(`${JSON.stringify({
  status: 'ok',
  primitives: source.world.primitives.length,
  cameraSamples: source.camera.samples.length,
  travelledMetres: Number(travelled.toFixed(3)),
  durationSeconds: source.timeline.durationSeconds,
  frameRange: manifest.frameRange,
  oceanVertices: source.world.ocean.gridColumns * source.world.ocean.gridRows,
  preservedAuthoredMeshObjects: manifest.preservedAuthoredMeshObjects,
  bottomTrackObjects: manifest.forbiddenBottomTrackObjects.length,
}, null, 2)}\n`);
