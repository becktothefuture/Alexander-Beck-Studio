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

console.log('PASS: Scaffold defaults, bounds, responsive sizing, and motion scale share one contract.');
