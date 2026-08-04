#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  assessScreenRequirement,
  evaluateScreenReadiness,
} from './lib/screen-certification-contract.mjs';

const hiddenWithLayout = assessScreenRequirement(
  { selector: '.title', minArea: 100, requiredText: ['Complete title'] },
  {
    stats: [{ area: 10_000, visible: false, text: 'Complete title' }],
  },
);
assert.deepEqual(hiddenWithLayout.failures, [
  '.title:not-visible',
  '.title:area<100',
  '.title:missing-text:Complete title',
]);

const visibleRequirement = assessScreenRequirement(
  { selector: '.title', minArea: 100, requiredText: ['Complete title'] },
  {
    stats: [{ area: 10_000, visible: true, text: 'Complete title' }],
  },
);
assert.deepEqual(visibleRequirement.failures, []);

const stableBase = {
  bootState: 'ready',
  transitionPhase: 'idle',
  overlayHidden: true,
  visibleSelectors: 3,
  unsettledGlyphCount: 0,
  introPhase: 'complete',
  materialStates: ['complete'],
};
assert.equal(evaluateScreenReadiness(stableBase, { minimumVisibleSelectors: 3 }).ready, true);
assert.equal(evaluateScreenReadiness({
  ...stableBase,
  unsettledGlyphCount: 4,
}, { minimumVisibleSelectors: 3 }).ready, false);
assert.equal(evaluateScreenReadiness({
  ...stableBase,
  materialStates: ['entering'],
}, { minimumVisibleSelectors: 3 }).ready, false);
assert.equal(evaluateScreenReadiness({
  ...stableBase,
  bootState: 'revealing',
}, { minimumVisibleSelectors: 3 }).ready, false);

console.log('PASS: screen certification rejects hidden layout boxes and unsettled route entrances.');
