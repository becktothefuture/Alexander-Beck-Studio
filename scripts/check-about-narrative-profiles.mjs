import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ABOUT_NARRATIVE_LAYOUT_PROFILE_IDS,
  ABOUT_NARRATIVE_MOTION_PROFILE_IDS,
  classifyAboutNarrativeLayoutProfile,
  createAboutNarrativeProfileResolver,
  remapAboutNarrativeScrollTop,
  resolveAboutNarrativeMotionProfile,
  resolveAboutNarrativePointProfile,
  validateAboutNarrativeProfileDurations,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeProfileResolver.js';

const PROFILES = Object.freeze({
  desktop: Object.freeze({ storyDurationWU: 21.8, scrollDurationWU: 21.8 }),
  tablet: Object.freeze({ storyDurationWU: 21.8, scrollDurationWU: 22.1 }),
  mobile: Object.freeze({ storyDurationWU: 21.8, scrollDurationWU: 22.65 }),
});

test('classifies the protected desktop, tablet, mobile, and short-landscape viewports', () => {
  assert.deepEqual(ABOUT_NARRATIVE_LAYOUT_PROFILE_IDS, ['desktop', 'tablet', 'mobile']);
  assert.equal(classifyAboutNarrativeLayoutProfile({ inlineSize: 1440, blockSize: 900 }), 'desktop');
  assert.equal(classifyAboutNarrativeLayoutProfile({ inlineSize: 834, blockSize: 1112 }), 'tablet');
  assert.equal(classifyAboutNarrativeLayoutProfile({ inlineSize: 1112, blockSize: 834 }), 'tablet');
  assert.equal(classifyAboutNarrativeLayoutProfile({ inlineSize: 390, blockSize: 844 }), 'mobile');
  assert.equal(classifyAboutNarrativeLayoutProfile({ inlineSize: 844, blockSize: 390 }), 'mobile');
  assert.equal(classifyAboutNarrativeLayoutProfile({ inlineSize: 1024, blockSize: 500 }), 'tablet');
  assert.equal(classifyAboutNarrativeLayoutProfile({ inlineSize: 1181, blockSize: 900 }), 'desktop');
  assert.equal(classifyAboutNarrativeLayoutProfile({ inlineSize: 0, blockSize: 0 }), 'desktop');
});

test('explicit preview layout wins and pointer capability cannot change timing profile', () => {
  const desktopPreview = createAboutNarrativeProfileResolver({
    profiles: PROFILES,
    inlineSize: 390,
    blockSize: 844,
    previewLayoutProfile: 'desktop',
  });
  assert.equal(desktopPreview.layoutProfile, 'desktop');
  assert.equal(
    classifyAboutNarrativeLayoutProfile({ inlineSize: 834, blockSize: 1112, pointerCoarse: true }),
    'tablet',
  );
  assert.throws(
    () => createAboutNarrativeProfileResolver({ profiles: PROFILES, previewLayoutProfile: 'watch' }),
    /preview layout profile must be one of/u,
  );
});

test('Reduced Motion overlays every layout and explicit preview motion wins', () => {
  assert.deepEqual(ABOUT_NARRATIVE_MOTION_PROFILE_IDS, ['full', 'reduced']);
  assert.equal(resolveAboutNarrativeMotionProfile({ prefersReducedMotion: true }), 'reduced');
  assert.equal(resolveAboutNarrativeMotionProfile({ prefersReducedMotion: true, previewReducedMotion: false }), 'full');
  assert.equal(resolveAboutNarrativeMotionProfile({ previewMotionProfile: 'reduced' }), 'reduced');
  assert.throws(
    () => resolveAboutNarrativeMotionProfile({ previewMotionProfile: 'slow' }),
    /preview motion profile must be one of/u,
  );

  for (const layoutProfile of ABOUT_NARRATIVE_LAYOUT_PROFILE_IDS) {
    const resolver = createAboutNarrativeProfileResolver({
      profiles: PROFILES,
      previewLayoutProfile: layoutProfile,
      prefersReducedMotion: true,
    });
    assert.equal(resolver.layoutProfile, layoutProfile);
    assert.equal(resolver.motionProfile, 'reduced');
  }
});

test('maps layout profiles to their explicit protected point-resource endpoints', () => {
  assert.equal(resolveAboutNarrativePointProfile('desktop'), 'desktop');
  assert.equal(resolveAboutNarrativePointProfile('tablet'), 'mobile');
  assert.equal(resolveAboutNarrativePointProfile('mobile'), 'mobile');
  assert.throws(
    () => resolveAboutNarrativePointProfile('reduced-motion'),
    /layout profile must be one of/u,
  );
  assert.throws(
    () => resolveAboutNarrativePointProfile('watch'),
    /layout profile must be one of/u,
  );
});

test('rejects missing, zero, negative, and non-finite profile durations', () => {
  const missing = validateAboutNarrativeProfileDurations({ desktop: PROFILES.desktop });
  assert.deepEqual(missing.map((item) => item.path), ['profiles.tablet', 'profiles.mobile']);

  for (const invalid of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const profiles = {
      ...PROFILES,
      mobile: { ...PROFILES.mobile, scrollDurationWU: invalid },
    };
    const diagnostics = validateAboutNarrativeProfileDurations(profiles);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].path, 'profiles.mobile.scrollDurationWU');
    assert.throws(() => createAboutNarrativeProfileResolver({ profiles }), RangeError);
  }
});

test('maps endpoints and midpoints, clamps scalars, and exposes exact content extent', () => {
  const resolver = createAboutNarrativeProfileResolver({
    profiles: PROFILES,
    previewLayoutProfile: 'mobile',
  });
  assert.equal(resolver.storyWUFromScrollWU(0), 0);
  assert.equal(resolver.storyWUFromScrollWU(resolver.scrollDurationWU), resolver.storyDurationWU);
  assert.equal(resolver.scrollWUFromStoryWU(resolver.storyDurationWU), resolver.scrollDurationWU);
  assert.equal(
    resolver.storyWUFromScrollWU(resolver.scrollDurationWU / 2),
    resolver.storyDurationWU / 2,
  );
  assert.equal(resolver.storyWUFromScrollWU(-4), 0);
  assert.equal(resolver.storyWUFromScrollWU(Number.POSITIVE_INFINITY), resolver.storyDurationWU);
  assert.equal(resolver.scrollWUFromStoryWU(Number.POSITIVE_INFINITY), resolver.scrollDurationWU);
  assert.equal(resolver.contentExtentWU, resolver.scrollDurationWU + 1);
});

test('mapping and inverse remain monotonic and round-trip over deterministic samples', () => {
  let state = 0x12345678;
  const random = () => {
    state = ((1664525 * state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  for (const layoutProfile of ABOUT_NARRATIVE_LAYOUT_PROFILE_IDS) {
    const resolver = createAboutNarrativeProfileResolver({
      profiles: PROFILES,
      previewLayoutProfile: layoutProfile,
    });
    let previousStoryWU = -1;
    for (let index = 0; index <= 1000; index += 1) {
      const scrollWU = (index / 1000) * resolver.scrollDurationWU;
      const storyWU = resolver.storyWUFromScrollWU(scrollWU);
      assert.ok(storyWU >= previousStoryWU);
      assert.ok(Math.abs(resolver.scrollWUFromStoryWU(storyWU) - scrollWU) < 1e-10);
      previousStoryWU = storyWU;
    }
    for (let index = 0; index < 1000; index += 1) {
      const storyWU = random() * resolver.storyDurationWU;
      const roundTrip = resolver.storyWUFromScrollWU(resolver.scrollWUFromStoryWU(storyWU));
      assert.ok(Math.abs(roundTrip - storyWU) < 1e-10);
    }
  }
});

test('remaps physical scroll while preserving Story WU across profile and viewport changes', () => {
  const previousResolver = createAboutNarrativeProfileResolver({
    profiles: PROFILES,
    previewLayoutProfile: 'desktop',
  });
  const nextResolver = createAboutNarrativeProfileResolver({
    profiles: PROFILES,
    previewLayoutProfile: 'mobile',
  });
  const storyWU = 13.4;
  const previousViewportHeight = 900;
  const nextViewportHeight = 390;
  const previousScrollTop = previousResolver.scrollWUFromStoryWU(storyWU) * previousViewportHeight;
  const remapped = remapAboutNarrativeScrollTop({
    scrollTop: previousScrollTop,
    previousViewportHeight,
    nextViewportHeight,
    previousResolver,
    nextResolver,
  });
  assert.ok(Math.abs(remapped.storyWU - storyWU) < 1e-10);
  assert.ok(Math.abs(
    nextResolver.storyWUFromScrollWU(remapped.scrollTop / nextViewportHeight) - storyWU,
  ) < 1e-10);
  assert.throws(() => remapAboutNarrativeScrollTop({
    scrollTop: 0,
    previousViewportHeight: 0,
    nextViewportHeight,
    previousResolver,
    nextResolver,
  }), /viewport heights must be finite and greater than zero/u);
});
