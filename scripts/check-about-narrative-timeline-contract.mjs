import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  resolveSmoothScrollLerp,
  shouldUseNativeSmoothScroll,
} from '../react-app/app/src/lib/smooth-scroll.js';

const source = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js',
  import.meta.url,
), 'utf8');
const smoothScrollSource = await readFile(new URL(
  '../react-app/app/src/lib/smooth-scroll.js',
  import.meta.url,
), 'utf8');

test('live timeline hook consumes only the sectionless runtime contract', () => {
  [
    'compileAboutNarrativeComposerPlan',
    'createAboutNarrativeComposerFrameSample',
    'sampleAboutNarrativeComposerPlanInto',
    'sampleAboutNarrativeComposerTitleInto',
    'getAboutNarrativeComposerPreparationRequest',
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

test('timeline exposes the global plan without sending animation frames through React state', () => {
  assert.match(
    source,
    /return \{ runtimePlan, layoutReady \};/,
  );
  assert.doesNotMatch(source, /setStoryWU|setStoryProgress|--narrative-story-wu/);
  assert.ok(source.includes('onStoryProgress?.('));
  assert.ok(source.includes('getCurrentStoryWU'));
  assert.ok(source.includes('setScrollFromStoryWU'));
  assert.ok(source.includes('const preservedStoryWU = getCurrentStoryWU()'));
});

test('About uses one painted scroll position for semantic and camera rendering', () => {
  assert.match(source, /lenis\?\.raf\(time\);[\s\S]{0,320}?const paintedScrollTop = scrollport\.scrollTop;/);
  assert.match(source, /readTransport\(deltaSeconds, paintedScrollTop\)/);
  assert.match(source, /getCurrentStoryWU\(paintedScrollTop\)/);
  assert.match(source, /getAboutNarrativeOpeningScrollCueOpacity\([\s\S]{0,100}?paintedScrollTop/);
  assert.doesNotMatch(source, /camera(?:Position)?(?:Lerp|Spring)|lerpCamera/);
});

test('About opts into touch-safe mobile transport while preserving native touch momentum', () => {
  assert.match(source, /allowCoarsePointer: true/);
  assert.match(source, /syncTouch: false/);
  assert.match(smoothScrollSource, /allowCoarsePointer = false/);
  assert.match(smoothScrollSource, /!allowCoarsePointer/);
  assert.match(smoothScrollSource, /SMOOTH_SCROLL_REDUCED_MOTION_QUERY/);
});

test('smooth-scroll policy keeps reduced motion native and requires an explicit coarse-pointer opt-in', () => {
  const win = { matchMedia: () => ({ matches: true }) };
  assert.equal(shouldUseNativeSmoothScroll({
    reducedMotionQuery: { matches: true },
    nativeScrollQuery: { matches: false },
    allowCoarsePointer: true,
    win,
  }), true);
  assert.equal(shouldUseNativeSmoothScroll({
    reducedMotionQuery: { matches: false },
    nativeScrollQuery: { matches: true },
    win,
  }), true);
  assert.equal(shouldUseNativeSmoothScroll({
    reducedMotionQuery: { matches: false },
    nativeScrollQuery: { matches: true },
    allowCoarsePointer: true,
    win,
  }), false);
  assert.equal(shouldUseNativeSmoothScroll({
    allowCoarsePointer: true,
    win: { matchMedia: (query) => ({ matches: query.includes('reduced-motion') }) },
  }), true);
  assert.equal(resolveSmoothScrollLerp(0.64), 0.1048);
});

test('programmatic and editor jumps synchronize the painted position immediately', () => {
  assert.match(source, /lenis\.scrollTo\(nextScrollTop, \{ immediate: true, force: true \}\)/);
  assert.match(source, /else scrollport\.scrollTop = nextScrollTop/);
});

test('DOM geometry is isolated to the cached content-measurement pass', () => {
  const geometryReads = [...source.matchAll(/getBoundingClientRect\(\)/g)];
  assert.equal(geometryReads.length, 3);
  const pressureStart = source.indexOf('const collectContentPressure');
  const pressureEnd = source.indexOf('const cacheSemanticNodes');
  assert.ok(pressureStart >= 0 && pressureEnd > pressureStart);
  geometryReads.forEach((read) => {
    assert.ok(read.index > pressureStart && read.index < pressureEnd);
  });
  assert.ok(source.includes('getAboutNarrativeReadingOrderRevealMetrics'));
  assert.ok(source.includes('editorialRevealMetrics'));
});
