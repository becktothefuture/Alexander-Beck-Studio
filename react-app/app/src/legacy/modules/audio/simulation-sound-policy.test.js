import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOME_SIMULATION_SOUND_BEHAVIORS,
  getHomeSimulationSoundBehavior,
  resolveWallImpactSound,
} from './simulation-sound-policy.js';

test('the thirteen Daily simulations have an explicit sound behavior', () => {
  assert.deepEqual(HOME_SIMULATION_SOUND_BEHAVIORS, {
    pit: 'collision',
    flies: 'wall-impact',
    '3d-cube': 'silent',
    water: 'collision',
    'repel-room': 'pressure',
    '3d-sphere': 'rotation-crystal',
    'flock-of-birds': 'silent',
    'flubber-blob': 'soft-body-impact',
    'kaleidoscope-3': 'silent',
    magnetic: 'collision',
    'starfield-3d': 'silent',
    'kaleidoscope-rift': 'silent',
    'particle-fountain-b': 'phrase-cue',
  });
  assert.equal(getHomeSimulationSoundBehavior('unknown-mode'), 'silent');
});

test('Attention wall impacts clear the collision voice threshold without changing other modes', () => {
  const attention = resolveWallImpactSound({
    mode: 'flies',
    impact: 0.7,
    fallbackId: 'ball-4',
  });
  assert.equal(attention.id, 'attention:wall-impact');
  assert.ok(attention.intensity > 0.7);
  assert.equal(attention.minimumIntensity, 0.7);
  assert.equal(attention.minIntervalMs, 140);

  const flow = resolveWallImpactSound({
    mode: 'water',
    impact: 0.7,
    fallbackId: 'ball-4',
  });
  assert.equal(flow.id, 'ball-4');
  assert.equal(flow.intensity, 0.7 * 0.65);
  assert.equal(flow.minimumIntensity, 0);
  assert.equal(flow.minIntervalMs, 0);
});
