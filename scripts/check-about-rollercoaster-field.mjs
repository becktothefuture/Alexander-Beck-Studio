import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ROLLERCOASTER_FIELD, ROLLERCOASTER_SURFACE_LIMITS,
  preflightRollercoasterField, resolveRollercoasterPaletteRole, sampleRollercoasterField, validateRollercoasterGeometry,
} from '../react-app/app/src/routes/about-rollercoaster/rollercoasterField.js';
import { resolveRollercoasterSamplingSpacing } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterProjection.js';

function quad({ id = 'wall', x = 0, y = 0, z = 0, width = 2.3, height = 2.3, role = 6, group = 0 } = {}) {
  return { id, name: id, positions: [x, y, z, x + width, y, z, x + width, y + height, z, x, y + height, z],
    faces: [[0, 1, 2, 3]], paletteRole: role, motionGroup: group };
}
const world = (...objects) => ({ objects });
const sample = (object, settings) => sampleRollercoasterField(world(object), settings);
function rows(points) {
  const result = [];
  for (let offset = 0; offset < points.length; offset += 6) result.push(Array.from(points.subarray(offset, offset + 6)));
  return result;
}
const sortedRows = points => rows(points).map(row => row.map(value => Math.round(value * 1e5) / 1e5).join(',')).sort();
function subdividedQuad(divisions = 10) {
  const object = quad(); object.positions = []; object.faces = [];
  for (let row = 0; row <= divisions; row += 1) for (let column = 0; column <= divisions; column += 1) {
    object.positions.push(column * 2.3 / divisions, row * 2.3 / divisions, 0);
  }
  for (let row = 0; row < divisions; row += 1) for (let column = 0; column < divisions; column += 1) {
    const a = row * (divisions + 1) + column;
    object.faces.push([a, a + 1, a + divisions + 2, a + divisions + 1]);
  }
  return object;
}

test('browser spacing changes circle density and radius without mutating the source geometry', () => {
  const geometry = world(quad()), before = JSON.stringify(geometry);
  const dense = sampleRollercoasterField(geometry), sparse = sampleRollercoasterField(geometry, { spacing: 0.46 });
  assert.equal(JSON.stringify(geometry), before);
  assert.ok(dense.field.count > sparse.field.count * 3);
  assert.equal(dense.field.radius, ROLLERCOASTER_FIELD.spacing * ROLLERCOASTER_FIELD.radiusRatio);
  assert.equal(sparse.field.radius, 0.15);
  assert.equal(dense.field.owner, 'browser-code');
  assert.equal(dense.field.count * 6, dense.points.length);
  assert.equal(dense.field.surfaceCounts.faces, 1);
});

test('six single-role materials remain single-role and All colours uses exactly the same six slots', () => {
  for (let role = 0; role < 6; role += 1) assert.deepEqual([...new Set(rows(sample(quad({ role })).points).map(row => row[4]))], [role]);
  const mixed = sample(quad());
  assert.deepEqual([...new Set(rows(mixed.points).map(row => row[4]))].sort(), [0, 1, 2, 3, 4, 5]);
  for (let column = -12; column < 12; column += 1) for (let row = -5; row < 5; row += 1) {
    const role = resolveRollercoasterPaletteRole(6, column, row);
    assert.ok(Number.isInteger(role) && role >= 0 && role < 6);
  }
  assert.deepEqual(sample(quad()).points, mixed.points);
});

test('duplicate faces and duplicate vertex indices cannot increase density', () => {
  const plain = sample(quad());
  const duplicated = quad();
  duplicated.positions.push(...duplicated.positions);
  duplicated.faces.push([3, 2, 1, 0], [4, 5, 6, 7]);
  const generated = sample(duplicated);
  assert.deepEqual(generated.points, plain.points);
  assert.equal(generated.field.surfaceCounts.faces, 3);
  assert.equal(generated.field.surfaceCounts.uniqueFaces, 1);
});

test('triangulation and dense coplanar subdivisions retain the same surface lattice and colours', () => {
  const plain = sample(quad()), triangles = quad();
  triangles.faces = [[0, 1, 2], [0, 2, 3]];
  assert.deepEqual(sortedRows(sample(triangles).points), sortedRows(plain.points));
  const subdivided = sample(subdividedQuad(40));
  assert.equal(subdivided.field.count, plain.field.count);
  assert.deepEqual(sortedRows(subdivided.points), sortedRows(plain.points));
});

test('a deterministic triangle field stays inside its surface', () => {
  const object = quad(); object.positions = [0, 0, 2, 2, 0, 2, 0, 2, 2]; object.faces = [[0, 1, 2]];
  const result = sample(object);
  assert.ok(result.field.count > 10);
  for (const [x, y, z] of rows(result.points)) {
    assert.ok(x >= -1e-6 && y >= -1e-6 && x + y <= 2 + 1e-6);
    assert.equal(z, 2);
  }
  assert.deepEqual(sample(object).points, result.points);
});

test('shared seams weld across objects but independently animated groups retain their own surfaces', () => {
  const a = quad({ id: 'a', width: 0.92, height: 0.92 }), b = structuredClone(a);
  b.id = b.name = 'b';
  b.positions = [0, 0, 0, 0.92, 0, 0, 0.92, 0, 0.92, 0, 0, 0.92];
  const result = sampleRollercoasterField(world(a, b), { spacing: 0.23 });
  const positions = rows(result.points).map(row => row.slice(0, 3).join(','));
  assert.equal(new Set(positions).size, positions.length);
  assert.equal(result.field.count, 25 + 25 - 5);
  b.motionGroup = 1;
  assert.equal(sampleRollercoasterField(world(a, b), { spacing: 0.23 }).field.count, 50);
});

test('object order does not change stable IDs, ranges or the generated field', () => {
  const a = quad({ id: 'a' }), b = quad({ id: 'b', z: 3, role: 4 });
  const first = sampleRollercoasterField(world(a, b)), reversed = sampleRollercoasterField(world(b, a));
  assert.deepEqual(reversed.points, first.points);
  assert.deepEqual(reversed.field.objectRanges, first.field.objectRanges);
  assert.equal(first.field.objectRanges.at(-1).end, first.field.count);
});

test('far translated walls retain complete rows without Float32 welding holes', () => {
  for (const x of [0, 100, 1000]) {
    const { points } = sample(quad({ x, width: 23, height: 23 }), { spacing: 0.23 });
    const byY = new Map();
    for (const [px, py] of rows(points)) {
      const key = py.toFixed(5);
      if (!byY.has(key)) byY.set(key, []);
      byY.get(key).push(px);
    }
    assert.equal(byY.size, 101);
    const lengths = new Set();
    for (const row of byY.values()) {
      row.sort((a, b) => a - b); lengths.add(row.length);
      assert.ok(row[0] - x < 0.2301 && x + 23 - row.at(-1) < 0.2301);
      for (let index = 1; index < row.length; index += 1) assert.ok(Math.abs(row[index] - row[index - 1] - 0.23) < 0.0001);
    }
    assert.equal(lengths.size, 1);
    assert.ok([...lengths][0] >= 100);
  }
});

test('a rotated complete quad uses its actual edge directions and has no central hole', () => {
  const object = quad({ x: -2.3, y: -1.15, width: 4.6, height: 2.3 });
  const angle = 0.43, c = Math.cos(angle), s = Math.sin(angle);
  for (let index = 0; index < object.positions.length; index += 3) {
    const x = object.positions[index], y = object.positions[index + 1];
    object.positions[index] = x * c - y * s; object.positions[index + 1] = x * s + y * c;
  }
  const { points } = sample(object);
  const byRow = new Map();
  for (const [x, y] of rows(points)) {
    const u = x * c + y * s, v = -x * s + y * c;
    const key = String(Math.round(v * 1e4));
    if (!byRow.has(key)) byRow.set(key, []);
    byRow.get(key).push(u);
  }
  assert.equal(new Set([...byRow.values()].map(row => row.length)).size, 1);
  assert.ok(rows(points).some(([x, y]) => Math.hypot(x, y) < 0.01));
});

test('surface validation rejects invalid IDs, roles, indices, degeneracy and unsupported quads', () => {
  for (const mutate of [
    object => { object.id = ''; }, object => { object.name = ''; },
    object => { object.paletteRole = 7; }, object => { object.paletteRole = null; },
    object => { object.motionGroup = -1; }, object => { object.positions[0] = Infinity; },
    object => { object.faces = [[0, 1, 99]]; }, object => { object.faces = [[0, 0, 2]]; },
    object => { object.positions = Array(12).fill(0); },
    object => { object.positions[8] = 0.2; }, object => { object.faces = [[0, 2, 1, 3]]; },
  ]) {
    const object = quad(); mutate(object);
    assert.throws(() => validateRollercoasterGeometry(world(object)), /About surfaces/);
  }
  assert.throws(() => validateRollercoasterGeometry(world(quad(), quad())), /duplicate object/);
});

test('allocation limits reject source sizes and candidate work before generating huge point buffers', () => {
  const oversized = quad(); oversized.faces = new Array(ROLLERCOASTER_SURFACE_LIMITS.faces + 1);
  assert.throws(() => sample(oversized), /surface allocation limit/);
  assert.throws(() => sample(quad({ width: 100000, height: 100000 })), /candidate allocation\/complexity limit/);
  assert.throws(() => sample(quad(), { maxCandidates: 10 }), /candidate allocation\/complexity limit/);
  assert.throws(() => sample(quad(), { maxPoints: 10 }), /generated point allocation upper bound/);
  assert.throws(() => sample(quad(), { maxPoints: ROLLERCOASTER_FIELD.maxPoints + 1 }), /cannot exceed/);
  assert.throws(() => sample(quad(), { spacing: 0 }), /spacing/);
  assert.throws(() => sample(quad(), { radiusRatio: 0.6 }), /radius ratio/);
});

test('publisher preflight shares candidate/output bounds and never returns generated circles', () => {
  const geometry = world(quad());
  const cost = preflightRollercoasterField(geometry), generated = sampleRollercoasterField(geometry);
  assert.equal(cost.estimatedCandidates, generated.field.estimatedCandidates);
  assert.ok(cost.pointUpperBound >= generated.field.count);
  assert.equal(Object.hasOwn(cost, 'points'), false);
  assert.throws(() => preflightRollercoasterField(world(quad({ width: 300, height: 300 }))), /point allocation upper bound/);
  assert.throws(() => preflightRollercoasterField(world(quad({ width: 100000, height: 100000 }))), /candidate allocation/);
});

test('a sub-spacing object gets one surface sample rather than one sample for every tiny face', () => {
  const object = quad({ x: 0.1, y: 0.1, width: 0.01, height: 0.01, role: 3 });
  const result = sample(object);
  assert.equal(result.field.count, 1);
  assert.equal(result.points[4], 3);
  assert.ok(result.points[0] >= 0.1 && result.points[0] <= 0.11);
});

test('one responsive pitch reduces every surface equally, including the multicolour ending', () => {
  const geometry = world(
    quad({ id: 'gallery', width: 4.6, height: 4.6, role: 1 }),
    quad({ id: 'gate', width: 4.6, height: 4.6, role: 4, group: 1 }),
    quad({ id: 'ending', width: 4.6, height: 4.6, role: 6, group: 2 }),
  );
  const before = JSON.stringify(geometry);
  const desktopSpacing = resolveRollercoasterSamplingSpacing(0.0777, { currentSpacing: ROLLERCOASTER_FIELD.spacing });
  const desktop = sampleRollercoasterField(geometry, { spacing: desktopSpacing });
  const spacing = resolveRollercoasterSamplingSpacing(0.168, { currentSpacing: desktop.field.spacing });
  const mobile = sampleRollercoasterField(geometry, { spacing });
  assert.equal(JSON.stringify(geometry), before);
  assert.ok(mobile.field.count < desktop.field.count / 3);
  assert.equal(new Set(mobile.field.objectRanges.map(range => range.count)).size, 1,
    'Equal-area gallery, gate and ending surfaces retain equal density.');
  assert.deepEqual(mobile.field.objectRanges.map(range => range.id), desktop.field.objectRanges.map(range => range.id));
  assert.deepEqual(sampleRollercoasterField(world(...geometry.objects.toReversed()), { spacing }).points, mobile.points);
  const ending = mobile.field.objectRanges.find(range => range.id === 'ending');
  assert.deepEqual([...new Set(rows(mobile.points.slice(ending.start * 6, ending.end * 6)).map(row => row[4]))].sort(), [0, 1, 2, 3, 4, 5]);
  assert.ok(mobile.field.pointUpperBound <= ROLLERCOASTER_FIELD.maxPoints);
  assert.throws(() => sampleRollercoasterField(geometry, { spacing, maxPoints: 10 }), /point allocation upper bound/);
  assert.deepEqual(sampleRollercoasterField(geometry, { spacing: desktopSpacing }).points, desktop.points,
    'Returning to desktop recreates the original field deterministically.');
});
