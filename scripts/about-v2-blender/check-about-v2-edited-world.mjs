#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const BLEND_PATH = path.join(
  REPO_ROOT,
  'source-assets/about-v2-blender-current/about-v2-track-working.blend',
);
const ASSET_DIR = path.join(
  REPO_ROOT,
  'react-app/app/public/models/about-v2-edited-world',
);
const CONFIG_PATH = path.join(
  REPO_ROOT,
  'react-app/app/public/config/contents-about.json',
);
const SHAPES_PATH = path.join(
  REPO_ROOT,
  'react-app/app/src/routes/about-narrative-lab/aboutNarrativePointShapes.js',
);
const RENDERER_PATH = path.join(
  REPO_ROOT,
  'react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
);

const metadata = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, 'meta.json'), 'utf8'));
const blendHash = crypto.createHash('sha256').update(fs.readFileSync(BLEND_PATH)).digest('hex');
assert.equal(metadata.version, 1);
assert.equal(metadata.source.sha256, blendHash, 'Point assets are stale against the edited Blender scene.');
assert.equal(metadata.palette.owner, 'Home simulation palette snapshot');
assert.equal(metadata.palette.groups, 6);
assert.equal(metadata.layout.strideBytes, 32);
assert.equal(metadata.layout.oceanMarker, 'seed < 0');
assert.ok(metadata.source.objectCount > 0);
assert.ok(metadata.source.objects.every((object) => !object.name.startsWith('BUST_')));
const openingSignalRing = metadata.source.objects.find(
  (object) => object.name === 'HOOP_000_opening-signal-ring',
);
assert.ok(openingSignalRing, 'The enlarged opening signal ring is missing.');
assert.ok(openingSignalRing.surfaceArea >= 59, 'The opening signal ring radius regressed.');
assert.ok(
  metadata.source.objects.every((object) => object.name !== 'HOOP_002_centered-hoop'),
  'The removed second opening circle returned.',
);

for (const [quality, lod] of Object.entries(metadata.lods)) {
  const bytes = fs.readFileSync(path.join(ASSET_DIR, lod.file));
  assert.equal(bytes.byteLength, lod.count * metadata.layout.strideBytes);
  assert.equal(bytes.byteLength, lod.bytes);
  const values = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  const materialCounts = [0, 0, 0, 0, 0, 0];
  const oceanDepthBandCounts = [0, 0, 0];
  let oceanCount = 0;
  for (let index = 0; index < lod.count; index += 1) {
    const offset = index * 8;
    for (let component = 0; component < 8; component += 1) {
      assert.ok(Number.isFinite(values[offset + component]), `${quality} contains a non-finite value.`);
    }
    if (values[offset + 6] < 0) {
      oceanCount += 1;
      const oceanDepth = metadata.ocean.nearZ - values[offset + 2];
      if (oceanDepth < 28) oceanDepthBandCounts[0] += 1;
      else if (oceanDepth < 520) oceanDepthBandCounts[1] += 1;
      else oceanDepthBandCounts[2] += 1;
    }
    const group = Math.round(values[offset + 7]);
    assert.ok(group >= 0 && group < 6, `${quality} contains an invalid palette group.`);
    assert.ok(Math.abs(values[offset + 7] - group) < 1e-5);
    materialCounts[group] += 1;
  }
  assert.equal(oceanCount, lod.oceanCount);
  const nearPointsPerWU = oceanDepthBandCounts[0] / 28;
  const middlePointsPerWU = oceanDepthBandCounts[1] / 492;
  assert(
    middlePointsPerWU > nearPointsPerWU * 1.3,
    `${quality} ocean must become denser beyond the camera-facing rows.`,
  );
  assert.equal(lod.environmentCount + lod.oceanCount, lod.count);
  assert.deepEqual(materialCounts, lod.materialCounts);
  assert.ok(Math.max(...materialCounts) - Math.min(...materialCounts) <= 2);
}

const document = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const rendererSource = fs.readFileSync(RENDERER_PATH, 'utf8');
const editedWorld = document.tracks.pointField.stateDefinitions.find(
  (world) => world.shapeId === 'long-assembly-corridor-v1',
);
assert.ok(editedWorld, 'About V2 edited world state is missing.');
const finalCameraKey = document.tracks.camera.moveKeys.reduce((latest, key) => (
  Number(key.atWU) > Number(latest.atWU) ? key : latest
));
assert.deepEqual(metadata.ocean.cameraEnd, finalCameraKey.position);
assert.equal(metadata.ocean.nearOffset, 2.5);
assert.equal(metadata.ocean.baseY, -6.2);
assert.ok(metadata.ocean.farZ <= metadata.ocean.nearZ - 1700);
assert.equal(metadata.ocean.nearHalfWidth, 50);
assert.equal(metadata.ocean.farHalfWidth, 4400);
const oceanPhysicalDepth = metadata.ocean.nearZ - metadata.ocean.farZ;
assert.ok(
  metadata.ocean.farHalfWidth / oceanPhysicalDepth >= 2.4,
  'The ocean width must remain beyond a 21:9 camera frustum at full depth.',
);
const rendererCameraFarMatch = rendererSource.match(/POINT_WORLD_CAMERA_FAR_WU = ([\d.]+)/);
assert.ok(rendererCameraFarMatch, 'The point-world camera far plane is missing.');
const rendererCameraFarWU = Number(rendererCameraFarMatch[1]);
assert.ok(
  rendererCameraFarWU >= oceanPhysicalDepth + 400,
  'The point-world camera far plane must remain safely beyond the animated ocean.',
);
assert.ok(
  oceanPhysicalDepth >= (
    Number(document.globals.camera.distanceFogEndWU)
      * Number(editedWorld.shapeParameters.oceanFogDistanceScale)
  ) + 800,
  'The ocean must continue far behind its fog extinction distance.',
);
assert.ok(Math.abs(
  metadata.ocean.nearZ - (finalCameraKey.position[2] - metadata.ocean.nearOffset),
) < 0.000001);
assert.deepEqual(metadata.finaleAlignment.collections, ['06_LIVING']);
assert.equal(metadata.finaleAlignment.cameraTrackY, finalCameraKey.position[1]);
assert.ok(Math.abs(
  metadata.finaleAlignment.sourceCenterY
    + metadata.finaleAlignment.offsetY
    - metadata.finaleAlignment.cameraTrackY,
) < 0.000001);
assert.ok(Number.isFinite(metadata.finaleAlignment.offsetY));
assert.ok(metadata.finaleAlignment.sourceMinY < metadata.finaleAlignment.sourceMaxY);
for (const parameter of [
  'oceanHeight',
  'oceanAmplitude',
  'oceanSpeed',
  'oceanChop',
  'oceanPointScale',
  'oceanFogDistanceScale',
  'structureManifestationAmount',
  'structureAmbientAmount',
  'structureAmbientSpeed',
  'cameraLookAheadWU',
]) {
  assert.ok(Number.isFinite(editedWorld.shapeParameters[parameter]), `${parameter} is missing.`);
}
assert.equal('bustScale' in editedWorld.shapeParameters, false);
assert.equal('bustYOffset' in editedWorld.shapeParameters, false);

const shapesSource = fs.readFileSync(SHAPES_PATH, 'utf8');
assert.match(shapesSource, /\/models\/about-v2-edited-world/);
assert.match(shapesSource, /loadEditedAboutWorld\(pointCount, quality, signal\)/);
assert.match(rendererSource, /uniform float oceanTime;/);
assert.match(rendererSource, /performance\.now\(\) \* 0\.001/);
assert.match(rendererSource, /float structureMotionMask = longAssemblyWeight \* \(1\.0 - oceanWeight\)/);
assert.match(rendererSource, /structureManifestationAmount/);
assert.match(rendererSource, /uniform float oceanRevealProgress;/);
assert.match(rendererSource, /float oceanSpatialReveal = 1\.0 - smoothstep\(/);
assert.match(rendererSource, /presence \*= mix\(1\.0, oceanSpatialReveal, oceanWeight\);/);
assert.match(rendererSource, /distanceFogEndWU \* oceanFogDistanceScale/);
assert.match(rendererSource, /worldPoint\.z \+= oceanStoryOffsetZ \* oceanWeight/);
assert.match(rendererSource, /ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU - oceanStoryEndWU/);
assert.match(rendererSource, /getSimulationPaletteSnapshot\(\)/);

process.stdout.write(`${JSON.stringify({
  status: 'ok',
  blendSha256: blendHash,
  objects: metadata.source.objectCount,
  triangles: metadata.source.triangleCount,
  lods: Object.fromEntries(Object.entries(metadata.lods).map(([quality, lod]) => [quality, {
    points: lod.count,
    environment: lod.environmentCount,
    ocean: lod.oceanCount,
    materialCounts: lod.materialCounts,
  }])),
  ocean: metadata.ocean,
}, null, 2)}\n`);
