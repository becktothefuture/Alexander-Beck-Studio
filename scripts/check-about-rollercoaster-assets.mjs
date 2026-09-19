import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { ROLLERCOASTER_SOURCE_FILE, validateRollercoasterBundle } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterContract.js';

import { ROLLERCOASTER_FIELD, sampleRollercoasterField } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterField.js';

const directory = resolve(process.env.ABS_ABOUT_ASSET_DIR || 'react-app/app/public/models/about-rollercoaster-world');
const meta = JSON.parse(await readFile(resolve(directory, 'meta.json'), 'utf8'));
const hash = data => createHash('sha256').update(data).digest('hex');
const bundle = await validateRollercoasterBundle({
  meta,
  cameraBytes: await readFile(resolve(directory, meta.camera.file)),
  geometryBytes: await readFile(resolve(directory, meta.geometry.file)),
  digestSha256: hash,
});
assert.equal(meta.source.file, ROLLERCOASTER_SOURCE_FILE);
assert.equal(meta.points, undefined);
assert.equal(meta.circleField, undefined);
assert.equal(meta.fog, undefined, 'Visibility belongs to the browser configuration.');
const { points, field } = sampleRollercoasterField(bundle.geometry);
assert.equal(field.spacing, ROLLERCOASTER_FIELD.spacing);
assert.equal(field.radiusRatio, ROLLERCOASTER_FIELD.radiusRatio);
assert.equal(field.count * 6, points.length);
for (const range of field.objectRanges) {
  assert(range.count > 0, `${range.id} must generate browser circles.`);
  const roles = new Set();
  for (let index = range.start; index < range.end; index += 1) {
    assert(Math.abs(points[index * 6 + 3] - field.radius) < 1e-6, 'All objects use the same code-owned radius.');
    roles.add(points[index * 6 + 4]);
  }
  if (range.paletteRole === 6) {
    assert.deepEqual([...roles].sort(), [0, 1, 2, 3, 4, 5], `${range.id} All colours must expose all six site roles.`);
  } else assert.deepEqual([...roles], [range.paletteRole], `${range.id} must preserve its one material role.`);
}
assert.equal(hash(await readFile(resolve(meta.source.file))), meta.source.sha256, 'Saved Blender source must match the loaded bundle.');
const samples = bundle.camera.samples;
let distance = 0;
let maxAngle = 0;
let finalAngle = 0;
const angles = [];
const positions = samples.map(sample => sample.slice(1, 4));
for (let index = 0; index < samples.length; index += 1) {
  const sample = samples[index];
  const before = positions[Math.max(0, index - 1)];
  const after = positions[Math.min(samples.length - 1, index + 1)];
  const tangent = after.map((value, axis) => value - before[axis]);
  const length = Math.hypot(...tangent);
  if (index) distance += Math.hypot(...positions[index].map((value, axis) => value - positions[index - 1][axis]));
  if (length < 1e-6) continue;
  const [, , , , x, y, z, w] = sample;
  const forward = [-2 * (x * z + w * y), -2 * (y * z - w * x), -(1 - 2 * (x * x + y * y))];
  const cosine = Math.max(-1, Math.min(1, forward.reduce((sum, value, axis) => sum + value * tangent[axis] / length, 0)));
  const angle = Math.acos(cosine) * 180 / Math.PI;
  const beat = meta.beats.find(entry => sample[0] >= entry.start && sample[0] < entry.end) || meta.beats.at(-1);
  const limit = sample[0] >= 0.9 ? 3 : ['prose', 'reading'].includes(beat.kind) ? 5 : 8;
  assert.ok(angle <= limit, `Camera faces ${angle.toFixed(3)} degrees from travel at ${sample[0]}; limit ${limit}.`);
  angles.push(angle);
  maxAngle = Math.max(maxAngle, angle);
  if (sample[0] >= 0.9) finalAngle = Math.max(finalAngle, angle);
}
const ending = meta.beats.at(-1);
const end = samples.at(-1);
for (const sample of samples.filter(entry => entry[0] >= ending.start + 1e-6)) {
  for (let axis = 1; axis < 8; axis += 1) assert.ok(Math.abs(sample[axis] - end[axis]) < 1e-5, 'The ending camera must hold its final pose.');
}
assert.ok(distance > 0, 'The route must travel through a real space.');
assert.ok(Number.isFinite(meta.totalDistanceWU) && Math.abs(meta.totalDistanceWU - distance) <= Math.max(0.1, distance * 0.001),
  'Declared route distance must agree with the actual camera path.');
assert.ok(Number.isFinite(meta.referenceSeconds) && meta.referenceSeconds > 0, 'The source provides a finite reference playback duration.');
assert.ok(meta.beats.every(beat => Number.isFinite(beat.scrollScreens) && beat.scrollScreens > 0));
assert.ok(meta.motionGroups.some(group => group.kind === 'wave'), 'The final wall must have source-authored waves.');
assert.ok(meta.motionGroups.some(group => group.kind === 'rotate'), 'The environment must include source-authored rotating assemblies.');
const tunnels = ['tunnel-a', 'tunnel-b'].map(id => {
  const region = meta.regions?.find(entry => entry.id === id);
  assert.ok(region && region.clearWidth > 0 && region.events.length >= 4, `${id} needs four physical events and a declared clear width.`);
  let length = 0;
  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index][0] > region.start && samples[index][0] <= region.end) {
      length += Math.hypot(...positions[index].map((value, axis) => value - positions[index - 1][axis]));
    }
  }
  assert.ok(length / region.clearWidth >= 10, `${id} must span at least ten local clear widths.`);
  return { id, length, clearWidths: length / region.clearWidth, events: region.events };
});
const grid = meta.finalGrid;
assert.ok(grid?.objectId, 'The final wall must identify a complete mesh.');
assert.equal(grid.rows, undefined);
assert.equal(grid.columns, undefined);
assert.equal(grid.pointRanges, undefined);
const wall = bundle.geometry.objects.find(object => object.id === grid.objectId);
assert.ok(wall, 'The final wall mesh must exist.');
assert.equal(wall.positions.length, 12, 'The editable final wall has exactly four corners.');
assert.equal(wall.faces.length, 1);
assert.equal(wall.faces[0].length, 4);
assert.equal(new Set(wall.faces[0]).size, 4);
assert.equal(wall.paletteRole, 6, 'The final wall uses the All colours material marker.');
assert.equal(wall.motionGroup, grid.motionGroup);
const range = field.objectRanges.find(entry => entry.id === grid.objectId);
assert.ok(range && range.count > 0);
const gridCount = range.count;
const wave = meta.motionGroups[grid.motionGroup];
assert.equal(wave.kind, 'wave');
let finalGridRestPlaneError = 0;
const wallSamples = [];
for (let index = range.start; index < range.end; index += 1) {
  const offset = index * 6;
  const relative = grid.origin.map((value, axis) => points[offset + axis] - value);
  const projection = axis => axis.reduce((sum, component, i) => sum + component * relative[i], 0);
  finalGridRestPlaneError = Math.max(finalGridRestPlaneError, Math.abs(projection(grid.normal)));
  const u = projection(grid.uAxis), v = projection(grid.vAxis);
  wallSamples.push({ u, v });
}
assert.ok(finalGridRestPlaneError < 0.001,
  'The complete wall has one rest plane, without a recessed opening or support bay.');
// Group with a tolerance far below the code spacing so Float32 transport
// cannot split one row at a rounding bucket boundary.
const rows = [];
wallSamples.sort((a, b) => a.v - b.v);
for (const sample of wallSamples) {
  if (!rows.length || sample.v - rows.at(-1).v > field.spacing * 0.05) rows.push({ v: sample.v, columns: [] });
  rows.at(-1).columns.push(sample.u);
}
const columns = rows[0].columns.length;
assert.ok(rows.length > 1 && columns > 1);
for (const [index, entry] of rows.entries()) {
  const row = entry.columns.sort((a, b) => a - b);
  assert.equal(row.length, columns, 'No final-wall row may contain a hole.');
  assert.ok(row.at(-1) - row[0] >= grid.width - field.spacing * 2,
    'Each row spans the complete wall width.');
  for (let column = 1; column < row.length; column += 1) {
    assert.ok(row[column] - row[column - 1] > 0.001
      && row[column] - row[column - 1] <= field.spacing * 1.02 + 0.002,
    'Generated wall columns remain a complete regular grid.');
  }
  if (index) assert.ok(entry.v - rows[index - 1].v <= field.spacing * 1.02 + 0.002,
    'Generated wall rows have no gaps.');
}
assert.equal(gridCount, rows.length * columns);
assert.ok(rows.at(-1).v - rows[0].v >= grid.height - field.spacing * 2);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const corners = wall.faces[0].map(index => wall.positions.slice(index * 3, index * 3 + 3));
const actualCenter = corners[0].map((_, axis) => corners.reduce((sum, point) => sum + point[axis], 0) / 4);
assert.ok(Math.hypot(...subtract(actualCenter, grid.origin)) < 0.001, 'Final wall metadata must use its actual rest center.');
const [, , , , qx, qy, qz, qw] = end;
const endForward = [-2 * (qx * qz + qw * qy), -2 * (qy * qz - qw * qx), -(1 - 2 * (qx * qx + qy * qy))];
const endRight = [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy + qw * qz), 2 * (qx * qz - qw * qy)];
const endUp = [2 * (qx * qy - qw * qz), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz + qw * qx)];
const wallOffset = subtract(actualCenter, end.slice(1, 4));
const actualStoppingDistance = dot(wallOffset, endForward);
assert.ok(Math.abs(dot(grid.normal, endForward)) > 1 - 1e-5, 'The wall must face the actual endpoint camera.');
assert.ok(Math.abs(actualStoppingDistance - grid.stoppingDistance) < 0.001,
  'Declared stopping distance must agree with the actual endpoint and wall.');
assert.ok(Math.abs(dot(wave.axis, grid.normal)) > 1 - 1e-5, 'The wall wave must move along its rest-plane normal.');
assert.ok(Math.abs(dot(subtract(wave.origin, actualCenter), grid.normal)) < 0.001,
  'The wall wave origin must lie on its exported rest plane.');
assert.ok(grid.stoppingDistance > wave.amplitude + field.radius, 'The final wave must remain in front of the camera.');
const orientations = [[1440, 1000], [390, 844]];
for (const [width, height] of orientations) {
  const aspect = width / height;
  const verticalFov = Math.min(meta.camera.portraitVerticalFov * Math.PI / 180,
    2 * Math.atan(Math.tan(meta.camera.horizontalFov * Math.PI / 360) / aspect));
  const projectedHeight = 2 * (grid.stoppingDistance + wave.amplitude) * Math.tan(verticalFov / 2);
  for (const horizontal of [-1, 1]) {
    for (const vertical of [-1, 1]) {
      const cornerFromCenter = wallOffset.map((value, axis) => -value + endForward[axis] * grid.stoppingDistance
        + endRight[axis] * horizontal * projectedHeight * aspect * 1.25 / 2
        + endUp[axis] * vertical * projectedHeight * 1.25 / 2);
      assert.ok(Math.abs(dot(cornerFromCenter, grid.uAxis)) <= grid.width / 2
        && Math.abs(dot(cornerFromCenter, grid.vAxis)) <= grid.height / 2,
      `The actual final wall must exceed the ${width}x${height} endpoint frustum by 25%, including wave bounds.`);
    }
  }
}
const report = {
  source: meta.source, objectCount: bundle.geometry.objects.length, generatedPointCount: field.count,
  field: { spacing: field.spacing, radius: field.radius }, cameraSamples: samples.length,
  distance, maxForwardAngleDegrees: maxAngle,
  finalForwardAngleDegrees: finalAngle,
  medianForwardAngleDegrees: angles.sort((a, b) => a - b)[Math.floor(angles.length / 2)],
  endingPoseHeld: true, bundleHashesMatch: true,
  tunnels, fullFinalGrid: gridCount, finalGridRestPlaneError, finalGridCoverage: orientations,
  actualStoppingDistance, finalWallOffsetWU: { right: dot(wallOffset, endRight), up: dot(wallOffset, endUp) },
};
console.log(JSON.stringify(report, null, 2));
