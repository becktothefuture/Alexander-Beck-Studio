import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
  ABOUT_NARRATIVE_TRANSITION_TYPES,
} from './aboutNarrativeDefinitions.js';
import {
  applyAboutNarrativeTrackEasing,
  applyAboutNarrativeWorldTransitionEasing,
  isAboutNarrativeShortLandscape,
  resolveAboutNarrativeMotionTimeMix,
} from './aboutNarrativeMotionMath.js';
import { sampleAboutNarrativeAnchorPosition } from './aboutNarrativeModifierSampling.js';
import {
  createAboutNarrativeSeeds,
  generateAboutNarrativeShape,
} from './aboutNarrativePointShapes.js';

const identity = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

function samplingInput(overrides = {}) {
  return {
    fromPosition: [0, 0, 0],
    toPosition: [4, 0, 0],
    fromTransform: identity,
    toTransform: identity,
    fromWorldScratch: { x: 0, y: 0, z: 0 },
    toWorldScratch: { x: 0, y: 0, z: 0 },
    fromDrift: {},
    toDrift: {},
    fromWave: {},
    toWave: {},
    gridRipple: {},
    bustAssembly: {},
    ...overrides,
  };
}

test('World transition easing preserves the schema v5 composed visual curve once', () => {
  for (const name of ['linear', 'smoothstep', 'ease-in', 'ease-out', 'ease-in-out']) {
    for (const progress of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const firstStage = applyAboutNarrativeTrackEasing(name, progress);
      const expected = firstStage * firstStage * (3 - (2 * firstStage));
      assert.equal(applyAboutNarrativeWorldTransitionEasing(name, progress), expected);
    }
  }
});

test('anchor sampling consumes authoritative visual progress without easing it again', () => {
  const target = { x: 0, y: 0, z: 0 };
  sampleAboutNarrativeAnchorPosition(samplingInput({
    morphProgress: 0.25,
    morphProgressIsVisual: true,
  }), target);
  assert.equal(target.x, 1);
});

test('wave clock mix makes ambient, story, and mixed modes distinct', () => {
  assert.equal(resolveAboutNarrativeMotionTimeMix('ambient'), 0);
  assert.equal(resolveAboutNarrativeMotionTimeMix('story'), 1);
  assert.equal(resolveAboutNarrativeMotionTimeMix('mixed'), 0.5);

  const sample = (storyMix) => {
    const target = { x: 0, y: 0, z: 0 };
    sampleAboutNarrativeAnchorPosition(samplingInput({
      fromPosition: [0, 0, 0],
      toPosition: [0, 0, 0],
      morphProgress: 1,
      ambientTime: 0,
      storyTime: Math.PI / 2,
      fromWave: { weight: 1, amplitude: 1, speed: 1, frequencyX: 1, frequencyZ: 1, storyMix },
      toWave: { weight: 1, amplitude: 1, speed: 1, frequencyX: 1, frequencyZ: 1, storyMix },
    }), target);
    return target.y;
  };
  assert.equal(sample(0), 0);
  assert.ok(Math.abs(sample(0.5) - Math.SQRT1_2) < 1e-12);
  assert.equal(sample(1), 1);
});

test('responsive orientation is derived from current dimensions', () => {
  assert.equal(isAboutNarrativeShortLandscape({ layoutProfile: 'mobile', width: 844, height: 390 }), true);
  assert.equal(isAboutNarrativeShortLandscape({ layoutProfile: 'mobile', width: 390, height: 844 }), false);
  assert.equal(isAboutNarrativeShortLandscape({ layoutProfile: 'desktop', width: 844, height: 390 }), false);
  assert.equal(isAboutNarrativeShortLandscape({ layoutProfile: 'mobile', width: 1024, height: 601 }), false);
});

test('schema v5 stays compatible while generator math bounds dead scatter input', async () => {
  assert.equal(ABOUT_NARRATIVE_TRANSITION_TYPES.includes('crossfade'), true);
  const scatter = ABOUT_NARRATIVE_SHAPE_DEFINITIONS['turbulent-field-v1']
    .parameters.find((control) => control.id === 'scatter');
  assert.equal(scatter.max, 1.5);

  const pointCount = 128;
  const seeds = createAboutNarrativeSeeds(pointCount, 42);
  const input = {
    shapeId: 'turbulent-field-v1',
    pointCount,
    seeds,
    quality: 'desktop',
  };
  const atMaximum = await generateAboutNarrativeShape({
    ...input,
    parameters: { density: 1, scatter: 1 },
  });
  const aboveMaximum = await generateAboutNarrativeShape({
    ...input,
    parameters: { density: 1, scatter: 5 },
  });
  assert.deepEqual(aboveMaximum.positions, atMaximum.positions);
});
