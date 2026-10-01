import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getStudioWindowInsets, getStudioWindowLight } from '../react-app/app/src/lib/studio-window.js';

const layout = (width, height, overrides = {}) => getStudioWindowInsets({
  width, height, frameInset: 14, menuReserve: 86.5, ...overrides,
});

test('ordinary screens retain authored gutters', () => {
  for (const width of [390, 1440, 1920]) {
    const frameInset = width < 480 ? 10 : 14;
    assert.deepEqual(layout(width, 900, { frameInset }), { x: frameInset, y: frameInset });
  }
});

test('large windows stay bounded while the menu keeps its reserve', () => {
  for (const [width, height] of [[2560, 1080], [3440, 1440], [3840, 2160]]) {
    const { x, y } = layout(width, height);
    assert.equal(width - 2 * x, 1920);
    assert.ok(height - 2 * y - 86.5 + 14 <= 1080);
    assert.ok(y >= height * 0.08);
  }
});

test('wide-screen spacing is continuous at each end of its range', () => {
  for (const width of [1920, 2560]) {
    assert.ok(Math.abs(layout(width + 0.01, 1440).y - layout(width - 0.01, 1440).y) < 0.01);
  }
});

test('custom menu reserve and limits leave the requested window height', () => {
  const { x, y } = layout(3840, 2160, { maxWidth: 1600, maxHeight: 900, menuReserve: 120 });
  assert.equal(3840 - 2 * x, 1600);
  assert.equal(2160 - 2 * y - 120 + 14, 900);
});

test('source dimensions broaden falloff within its bounds', () => {
  const small = getStudioWindowLight(370, 740, '#e9e9e9');
  const large = getStudioWindowLight(1920, 1080, '#e9e9e9');
  assert.ok(large.scale > small.scale);
  assert.equal(getStudioWindowLight(1, 1, '#fff').scale, 0.8);
  assert.equal(getStudioWindowLight(10000, 10000, '#fff').scale, 1.5);
});

test('emission follows interpolated source colour and retains an ambient floor', () => {
  const emission = colour => getStudioWindowLight(1920, 1080, colour).emission;
  assert.ok(emission('#e9e9e9') > emission('rgb(128, 128, 128)'));
  assert.ok(emission('rgb(128, 128, 128)') > emission('#161616'));
  assert.equal(emission('#000'), 0.12);
  assert.ok(Math.abs(emission('not-a-colour') - 1) < 1e-12);
});
