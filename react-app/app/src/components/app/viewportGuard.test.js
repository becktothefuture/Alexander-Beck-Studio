import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getExtremeViewportMode,
  MAX_SUPPORTED_VIEWPORT_RATIO,
} from './viewportGuard.js';

test('keeps ordinary desktop, ultrawide, phone portrait, and phone landscape viewports available', () => {
  assert.equal(getExtremeViewportMode(1440, 1000), null);
  assert.equal(getExtremeViewportMode(3440, 1440), null);
  assert.equal(getExtremeViewportMode(390, 844), null);
  assert.equal(getExtremeViewportMode(844, 390), null);
});

test('covers viewports beyond the supported ratio in either direction', () => {
  assert.equal(getExtremeViewportMode(1280, 439), 'wide');
  assert.equal(getExtremeViewportMode(320, 1000), 'tall');
});

test('keeps the exact ratio boundary available', () => {
  assert.equal(getExtremeViewportMode(MAX_SUPPORTED_VIEWPORT_RATIO * 400, 400), null);
  assert.equal(getExtremeViewportMode(400, MAX_SUPPORTED_VIEWPORT_RATIO * 400), null);
});

test('fails open for invalid viewport measurements', () => {
  assert.equal(getExtremeViewportMode(0, 800), null);
  assert.equal(getExtremeViewportMode(800, 0), null);
  assert.equal(getExtremeViewportMode(Number.NaN, 800), null);
});
