import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import test from 'node:test';

import {
  createAboutNarrativePointFieldMotionSample,
  resolveAboutNarrativePointFieldTransitionMotion,
  sampleAboutNarrativePointFieldMotionInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldMotion.js';
import {
  compileAboutNarrativePointFieldRuntime,
  sampleAboutNarrativePointFieldRuntime,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldRuntime.js';
import {
  serializeAboutNarrativePointFieldDocument,
  validateAboutNarrativePointFieldDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';

const canonicalV6 = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));

function firstMorph(document) {
  return document.tracks.pointField.segments.find((segment) => segment.transition.type === 'morph');
}

function transition(overrides = {}) {
  const base = {
    type: 'morph',
    easing: 'ease-in',
    ...resolveAboutNarrativePointFieldTransitionMotion({}),
  };
  return { ...base, ...overrides };
}

function sampleMotion(source, visualProgress, point = {}, options = {}) {
  return sampleAboutNarrativePointFieldMotionInto(
    source,
    visualProgress,
    point,
    createAboutNarrativePointFieldMotionSample(),
    options,
  );
}

test('absent motion controls compile to explicit neutral defaults without changing visual progress', () => {
  const source = structuredClone(canonicalV6);
  const segment = firstMorph(source);
  delete segment.transition.stagger;
  delete segment.transition.path;
  delete segment.transition.flatten;
  assert.deepEqual(validateAboutNarrativePointFieldDocument(source), []);

  const plan = compileAboutNarrativePointFieldRuntime(source);
  const compiled = plan.segments.find((item) => item.id === segment.id);
  assert.deepEqual(compiled.transition.stagger, {
    mode: 'uniform', amount: 0, axis: 'y', seed: 0,
  });
  assert.deepEqual(compiled.transition.path, {
    mode: 'direct', amount: 0, axis: 'y', frequency: 1, seed: 0,
  });
  assert.deepEqual(compiled.transition.flatten, {
    mode: 'none', amount: 0, axis: 'y', offset: 0,
  });
  const storyWU = compiled.startWU + (compiled.durationWU * 0.37);
  const baseline = sampleAboutNarrativePointFieldRuntime(
    compileAboutNarrativePointFieldRuntime(canonicalV6),
    storyWU,
  );
  const current = sampleAboutNarrativePointFieldRuntime(plan, storyWU);
  assert.equal(current.world.visualProgress, baseline.world.visualProgress);
  assert.equal(current.world.transitionProgress, baseline.world.transitionProgress);
});

test('motion controls validate bounded editor-safe axes, seeds, frequency, and plane offsets', () => {
  const edits = [
    ['axis', (item) => { item.stagger = { mode: 'axis', amount: 0.5, axis: 'q' }; }],
    ['seed', (item) => { item.path = { mode: 'noise', amount: 0.5, seed: -1 }; }],
    ['frequency', (item) => { item.path = { mode: 'curl', amount: 0.5, frequency: 9 }; }],
    ['plane-offset', (item) => {
      item.flatten = { mode: 'toward-plane', amount: 0.5, offset: 9 };
    }],
  ];
  edits.forEach(([code, edit]) => {
    const source = structuredClone(canonicalV6);
    edit(firstMorph(source).transition);
    assert.equal(validateAboutNarrativePointFieldDocument(source).some((item) => (
      item.code === `transition-motion-${code}`
    )), true, code);
  });
});

test('granular segment controls serialize and resolve through responsive ID overrides', () => {
  const source = structuredClone(canonicalV6);
  const segment = firstMorph(source);
  source.profiles.mobile.overrides.pointField.segments[segment.id] = {
    transition: {
      stagger: { mode: 'axis', amount: 0.35, axis: 'x', seed: 17 },
      path: { mode: 'noise', amount: 0.6, axis: 'z', frequency: 3.25, seed: 29 },
      flatten: { mode: 'toward-plane', amount: 0.8, axis: 'y', offset: -0.75 },
    },
  };
  const serialized = serializeAboutNarrativePointFieldDocument(source);
  const roundtrip = JSON.parse(serialized);
  assert.deepEqual(validateAboutNarrativePointFieldDocument(roundtrip), []);
  const plan = compileAboutNarrativePointFieldRuntime(roundtrip, { layoutProfile: 'mobile' });
  const compiled = plan.segments.find((item) => item.id === segment.id);
  assert.deepEqual(compiled.transition.stagger, {
    mode: 'axis', amount: 0.35, axis: 'x', seed: 17,
  });
  assert.deepEqual(compiled.transition.path, {
    mode: 'noise', amount: 0.6, axis: 'z', frequency: 3.25, seed: 29,
  });
  assert.deepEqual(compiled.transition.flatten, {
    mode: 'toward-plane', amount: 0.8, axis: 'y', offset: -0.75,
  });
});

test('point motion remaps authoritative visual progress without applying easing twice', () => {
  const source = transition();
  const sample = sampleMotion(source, 0.25, { seed: 0.4 });
  assert.equal(sample.progress, 0.25);
  assert.deepEqual(sample.pathOffset, [0, 0, 0]);
  assert.equal(sample.planeProgress, 0.25);
});

test('canonical Form changes use coherent spatial paths instead of direct interpolation or dissolves', () => {
  const morphs = canonicalV6.tracks.pointField.segments.filter((segment) => (
    segment.transition.type !== 'hold'
  ));
  assert(morphs.length >= 3);
  morphs.forEach((segment) => {
    assert.equal(segment.transition.type, 'morph', segment.id);
    assert.equal(segment.transition.path.mode, 'flow', segment.id);
    assert(Number(segment.transition.path.amount) > 0, segment.id);
    assert(Number(segment.transition.stagger.amount) <= 0.08, segment.id);
  });
});

test('stagger, organic paths, and plane motion are deterministic and preserve both endpoints', () => {
  const source = transition({
    stagger: { mode: 'random', amount: 0.45, axis: 'z', seed: 42 },
    path: { mode: 'curl', amount: 0.8, axis: 'y', frequency: 2.5, seed: 91 },
    flatten: { mode: 'toward-plane', amount: 0.7, axis: 'y', offset: -0.25 },
  });
  const point = { seed: 0.734, radialPhase: 0.8, axisPhase: 0.35 };
  const first = sampleMotion(source, 0.63, point);
  const second = sampleMotion(source, 0.63, point);
  assert.deepEqual(second, first);
  assert.ok(first.progress >= 0 && first.progress <= 1);
  assert.ok(first.pathOffset.some((value) => Math.abs(value) > 0.0001));
  assert.ok(first.pathOffset.every((value) => Math.abs(value) <= source.path.amount));
  assert.ok(first.planeProgress >= first.progress && first.planeProgress <= 1);
  assert.equal(first.planeAxis, 'y');
  assert.equal(first.planePosition, -0.25);
  assert.ok(first.planeOffset > 0);

  [0, 1].forEach((progress) => {
    const endpoint = sampleMotion(source, progress, point);
    assert.equal(endpoint.progress, progress);
    assert.deepEqual(endpoint.pathOffset, [0, 0, 0]);
    assert.equal(endpoint.planeProgress, progress);
    assert.equal(endpoint.planeOffset, 0);
  });
});

test('every path and plane mode is pure, reversible, and reduced motion settles cleanly', () => {
  ['flow', 'arc', 'curl', 'noise'].forEach((mode) => {
    const source = transition({
      path: { mode, amount: 1, axis: 'x', frequency: 3, seed: 7 },
    });
    const point = { seed: 0.2, radialPhase: 0.46, axisPhase: 0.3 };
    const forward = sampleMotion(source, 0.41, point);
    sampleMotion(source, 0.73, point);
    const reversed = sampleMotion(source, 0.41, point);
    assert.deepEqual(reversed, forward);
  });

  ['toward-plane', 'from-plane'].forEach((mode) => {
    let previous = 0;
    for (let index = 0; index <= 20; index += 1) {
      const sample = sampleMotion(transition({
        flatten: { mode, amount: 1, axis: 'z', offset: 0.5 },
      }), index / 20);
      assert.ok(sample.planeProgress >= previous - 0.0000001);
      previous = sample.planeProgress;
    }
  });

  const reduced = sampleMotion(transition({
    stagger: { mode: 'random', amount: 1, axis: 'x', seed: 3 },
    path: { mode: 'noise', amount: 1, axis: 'z', frequency: 8, seed: 5 },
    flatten: { mode: 'toward-plane', amount: 1, axis: 'x', offset: 4 },
  }), 0, { seed: 0.9 }, { reducedMotion: true });
  assert.equal(reduced.progress, 1);
  assert.deepEqual(reduced.pathOffset, [0, 0, 0]);
  assert.equal(reduced.planeProgress, 1);
  assert.equal(reduced.planeOffset, 0);
});

test('100k parametric samples reuse one target and stay inside the hot-path budget', () => {
  const source = transition({
    stagger: { mode: 'random', amount: 0.5, axis: 'y', seed: 11 },
    path: { mode: 'noise', amount: 0.8, axis: 'y', frequency: 4, seed: 17 },
    flatten: { mode: 'from-plane', amount: 0.6, axis: 'z', offset: 0.2 },
  });
  const point = { seed: 0, radialPhase: 0, axisPhase: 0 };
  const target = createAboutNarrativePointFieldMotionSample();
  const pathOffset = target.pathOffset;
  const startedAt = performance.now();
  for (let index = 0; index < 100_000; index += 1) {
    point.seed = (index % 997) / 996;
    point.radialPhase = (index % 101) / 100;
    point.axisPhase = (index % 89) / 88;
    assert.equal(sampleAboutNarrativePointFieldMotionInto(
      source,
      (index % 1001) / 1000,
      point,
      target,
    ), target);
  }
  const elapsedMs = performance.now() - startedAt;
  assert.equal(target.pathOffset, pathOffset);
  assert.ok(elapsedMs < 500, `100k point-motion samples took ${elapsedMs.toFixed(1)}ms.`);
  console.log(`100k point-motion samples: ${elapsedMs.toFixed(1)}ms`);
});
