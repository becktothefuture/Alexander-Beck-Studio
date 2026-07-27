import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePairKerningEm } from '../react-app/app/src/lib/motion/glyph-kerning.js';

test('converts a native pair adjustment into a scalable em offset', () => {
  const widths = new Map([
    ['W', 65.42],
    ['o', 41.00],
    ['Wo', 100.19],
  ]);
  const offset = resolvePairKerningEm({
    measureText: (text) => ({ width: widths.get(text) }),
    previousGlyph: 'W',
    currentGlyph: 'o',
    fontSizePx: 100,
  });

  assert.ok(Math.abs(offset - (-0.0623)) < 1e-9);
});

test('preserves positive pair adjustments and numeric measurement callbacks', () => {
  const widths = new Map([
    ['T', 50],
    ['h', 44],
    ['Th', 95.5],
  ]);
  const offset = resolvePairKerningEm({
    measureText: (text) => widths.get(text),
    previousGlyph: 'T',
    currentGlyph: 'h',
    fontSizePx: 50,
  });

  assert.equal(offset, 0.03);
});

test('falls back to zero when measurement is unavailable or invalid', () => {
  assert.equal(resolvePairKerningEm({}), 0);
  assert.equal(resolvePairKerningEm({
    measureText: () => ({ width: Number.NaN }),
    previousGlyph: 'W',
    currentGlyph: 'o',
    fontSizePx: 100,
  }), 0);
  assert.equal(resolvePairKerningEm({
    measureText: () => { throw new Error('measurement failed'); },
    previousGlyph: 'W',
    currentGlyph: 'o',
    fontSizePx: 100,
  }), 0);
});
