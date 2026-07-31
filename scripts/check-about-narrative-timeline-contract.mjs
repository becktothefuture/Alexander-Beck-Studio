import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js',
  import.meta.url,
), 'utf8');

test('live timeline hook consumes only the sectionless runtime contract', () => {
  [
    'compileAboutNarrativeRendererRuntimePlan',
    'createAboutNarrativeRendererFrameSample',
    'sampleAboutNarrativeRendererRuntimePlanInto',
    'sampleAboutNarrativeTitleFieldInto',
    'getAboutNarrativeRendererPreparationRequest',
    'data-text-field-id',
    'data-editorial-reveal',
    '--narrative-content-extent-wu',
  ].forEach((token) => assert.ok(source.includes(token), `missing ${token}`));
  [
    'compileAboutNarrativeDocument',
    'sampleAboutNarrativePlanInto',
    'sectionRefs',
    'activeSection',
    'localProgress',
    'pointer: coarse',
    'data-narrative-section',
  ].forEach((token) => assert.equal(source.includes(token), false, `forbidden ${token}`));
});

test('timeline return contract is global and runtime-plan based', () => {
  assert.match(
    source,
    /return \{ runtimePlan, storyWU, storyProgress, activeIndicatorStartIndex \};/,
  );
  assert.ok(source.includes('storyWUFromScrollWU'));
  assert.ok(source.includes('scrollWUFromStoryWU'));
  assert.ok(source.includes('remapAboutNarrativeScrollTop'));
});

test('DOM geometry is isolated to diagnostic content-pressure collection', () => {
  const geometryReads = [...source.matchAll(/getBoundingClientRect\(\)/g)];
  assert.equal(geometryReads.length, 1);
  const pressureStart = source.indexOf('const collectContentPressure');
  const pressureEnd = source.indexOf('const cacheSemanticNodes');
  assert.ok(pressureStart >= 0 && pressureEnd > pressureStart);
  assert.ok(geometryReads[0].index > pressureStart && geometryReads[0].index < pressureEnd);
});
