import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getViewportCoverMode,
  MAX_MOBILE_LANDSCAPE_HEIGHT,
  MAX_MOBILE_LANDSCAPE_WIDTH,
  MAX_SUPPORTED_VIEWPORT_RATIO,
  MIN_SUPPORTED_LANDSCAPE_VIEWPORT_HEIGHT,
} from './viewportGuard.js';

test('keeps ordinary desktop, laptop, tablet, ultrawide, and phone portrait viewports available', () => {
  assert.equal(getViewportCoverMode(1440, 1000), null);
  assert.equal(getViewportCoverMode(1280, 720), null);
  assert.equal(getViewportCoverMode(1024, 768), null);
  assert.equal(getViewportCoverMode(3440, 1440), null);
  assert.equal(getViewportCoverMode(390, 844), null);
  assert.equal(getViewportCoverMode(375, 667), null);
});

test('covers viewports beyond the supported ratio in either direction', () => {
  assert.equal(getViewportCoverMode(1280, 439), 'wide');
  assert.equal(getViewportCoverMode(320, 1000), 'tall');
});

test('covers mobile landscape and short landscape viewports', () => {
  assert.equal(getViewportCoverMode(844, 390), 'mobile-landscape');
  assert.equal(getViewportCoverMode(667, 375), 'mobile-landscape');
  assert.equal(getViewportCoverMode(1280, 500), 'short');
  assert.equal(getViewportCoverMode(1024, 600), 'short');
});

test('keeps the exact ratio boundary available', () => {
  assert.equal(
    getViewportCoverMode(
      MAX_SUPPORTED_VIEWPORT_RATIO * MIN_SUPPORTED_LANDSCAPE_VIEWPORT_HEIGHT,
      MIN_SUPPORTED_LANDSCAPE_VIEWPORT_HEIGHT,
    ),
    null,
  );
  assert.equal(getViewportCoverMode(400, MAX_SUPPORTED_VIEWPORT_RATIO * 400), null);
});

test('keeps the short-height and mobile-landscape boundaries deterministic', () => {
  assert.equal(getViewportCoverMode(1280, MIN_SUPPORTED_LANDSCAPE_VIEWPORT_HEIGHT), null);
  assert.equal(
    getViewportCoverMode(MAX_MOBILE_LANDSCAPE_WIDTH, MAX_MOBILE_LANDSCAPE_HEIGHT),
    'mobile-landscape',
  );
  assert.equal(
    getViewportCoverMode(MAX_MOBILE_LANDSCAPE_WIDTH + 1, MAX_MOBILE_LANDSCAPE_HEIGHT),
    'short',
  );
});

test('fails open for invalid viewport measurements', () => {
  assert.equal(getViewportCoverMode(0, 800), null);
  assert.equal(getViewportCoverMode(800, 0), null);
  assert.equal(getViewportCoverMode(Number.NaN, 800), null);
});
