import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatAboutRecoveryReadinessFailure,
  summarizeAboutContinuitySnapshot,
  unionAboutContinuityOccupancy,
} from './lib/about-recovery-audit-helpers.mjs';

const occupancy = (...indices) => Array.from({ length: 96 }, (_, index) => (
  indices.includes(index) ? 1 : 0
));

test('continuity occupancy is a union and active stage count reflects current activity', () => {
  const modelOccupancy12x8 = {
    'about.00': occupancy(0, 1),
    'about.01': occupancy(1, 2),
  };
  const union = unionAboutContinuityOccupancy(modelOccupancy12x8);
  assert.equal(union.reduce((sum, value) => sum + value, 0), 3);
  assert.equal(union[1], 1, 'An overlapping bin must count once.');

  const summary = summarizeAboutContinuitySnapshot({
    modelOccupancy12x8,
    activeStageIds: ['about.01'],
    activeModelIds: ['about.01'],
    visibleModelIds: ['about.00', 'about.01'],
    sampledVisibleSurfelCount: 30,
    residentSurfelCount: 90_000,
    renderedSurfelCount: 90_000,
    visibleStageSurfelCount: 20_000,
  }, { minimumFramedPoints: 24, minimumOccupiedBins: 3 });
  assert.equal(summary.occupiedBins, 3);
  assert.equal(summary.activeStageCount, 1);
  assert.deepEqual(summary.activeStageIds, ['about.01']);
  assert.equal(summary.failures.length, 0);
});

test('readiness failures retain renderer, model, and contract diagnostics', () => {
  const diagnostics = {
    renderer: { state: 'unavailable', error: 'fixture load failed' },
    model: { ids: ['about.00'], assetSourceHash: 'fixture' },
    contract: {
      status: 'incompatible',
      diagnostics: [{ code: 'scene-model-binding-invalid', path: 'meta.models.0' }],
    },
  };
  const message = formatAboutRecoveryReadinessFailure(diagnostics);
  assert.match(message, /"state":"unavailable"/u);
  assert.match(message, /"ids":\["about\.00"\]/u);
  assert.match(message, /"code":"scene-model-binding-invalid"/u);
  assert.match(message, /"path":"meta\.models\.0"/u);
});
