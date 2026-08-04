import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CUBE_3D_DEFAULTS,
  normalizeCube3DConfig,
  resolveCube3DMotionScale,
  resolveCube3DSizePx,
} from '../react-app/app/src/legacy/modules/modes/cube3d-config.js';
import {
  generateCubePoints,
  updateCubeRotationMatrix,
} from '../react-app/app/src/legacy/modules/modes/cube3d-geometry.js';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const designSystem = JSON.parse(readFileSync(
  resolve(repoRoot, 'react-app/app/public/config/design-system.json'),
  'utf8',
));

Object.entries(CUBE_3D_DEFAULTS).forEach(([key, value]) => {
  assert.equal(
    designSystem.runtime?.[key],
    value,
    `${key} must match the canonical design-system value.`,
  );
});

assert.deepEqual(normalizeCube3DConfig({}), CUBE_3D_DEFAULTS);
assert.equal(normalizeCube3DConfig({ cube3dSizeVw: 999 }).cube3dSizeVw, 50);
assert.equal(normalizeCube3DConfig({ cube3dEdgeDensity: 2.4 }).cube3dEdgeDensity, 2);
assert.equal(normalizeCube3DConfig({ cube3dFogMin: -2 }).cube3dFogMin, 0);
assert.equal(resolveCube3DSizePx(1440, 44.5), 640.8);
assert.equal(resolveCube3DSizePx(390, 44.5), 173.55);
assert.equal(resolveCube3DMotionScale(false, 0), 1);
assert.equal(resolveCube3DMotionScale(true, 0.18), 0.18);

for (const [edgeDensity, faceGrid] of [[2, 0], [9, 0], [9, 1], [9, 3]]) {
  const points = generateCubePoints(edgeDensity, faceGrid);
  const expectedCount = 8 + (12 * (edgeDensity - 1)) + (6 * faceGrid * faceGrid);
  const uniquePoints = new Set(points.map(({ x, y, z }) => `${x}:${y}:${z}`));
  assert.equal(points.length, expectedCount);
  assert.equal(uniquePoints.size, points.length, 'Scaffold geometry must not stack duplicate dots.');
}

function rotateReference({ x, y, z }, rotationX, rotationY, rotationZ) {
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;
  const cosZ = Math.cos(rotationZ);
  const sinZ = Math.sin(rotationZ);
  return {
    x: x1 * cosZ - y2 * sinZ,
    y: x1 * sinZ + y2 * cosZ,
    z: z2,
  };
}

const matrix = {};
for (const rotations of [[0, 0, 0], [0.2, -0.7, 1.1], [-1.4, 0.3, -0.25]]) {
  updateCubeRotationMatrix(matrix, ...rotations);
  for (const point of generateCubePoints(3, 1)) {
    const expected = rotateReference(point, ...rotations);
    const actual = {
      x: (point.x * matrix.xx) + (point.y * matrix.xy) + (point.z * matrix.xz),
      y: (point.x * matrix.yx) + (point.y * matrix.yy) + (point.z * matrix.yz),
      z: (point.x * matrix.zx) + (point.y * matrix.zy) + (point.z * matrix.zz),
    };
    assert.ok(Math.abs(actual.x - expected.x) < 1e-12);
    assert.ok(Math.abs(actual.y - expected.y) < 1e-12);
    assert.ok(Math.abs(actual.z - expected.z) < 1e-12);
  }
}

console.log('PASS: Scaffold configuration, unique unit geometry, and cached rotation share one contract.');
