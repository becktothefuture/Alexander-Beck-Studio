export const ABOUT_NARRATIVE_LAYOUT_PROFILE_IDS = Object.freeze([
  'desktop',
  'tablet',
  'mobile',
]);

export const ABOUT_NARRATIVE_MOTION_PROFILE_IDS = Object.freeze([
  'full',
  'reduced',
]);

export const ABOUT_NARRATIVE_PROFILE_BREAKPOINTS = Object.freeze({
  mobileMaxInlineSize: 600,
  mobileLandscapeMaxInlineSize: 900,
  mobileLandscapeMaxBlockSize: 600,
  tabletMaxInlineSize: 1180,
});

const LAYOUT_PROFILE_SET = new Set(ABOUT_NARRATIVE_LAYOUT_PROFILE_IDS);
const MOTION_PROFILE_SET = new Set(ABOUT_NARRATIVE_MOTION_PROFILE_IDS);

const ABOUT_NARRATIVE_POINT_PROFILE_BY_LAYOUT = Object.freeze({
  desktop: 'desktop',
  tablet: 'mobile',
  mobile: 'mobile',
});

function positiveDimension(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function clampScalar(value, maximum) {
  const number = Number(value);
  if (number === Number.POSITIVE_INFINITY) return maximum;
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(maximum, number);
}

function requireProfileId(value, allowed, label) {
  if (!allowed.has(value)) {
    throw new RangeError(`${label} must be one of: ${[...allowed].join(', ')}.`);
  }
  return value;
}

export function classifyAboutNarrativeLayoutProfile({
  inlineSize,
  blockSize,
} = {}) {
  const width = positiveDimension(inlineSize);
  const height = positiveDimension(blockSize);
  if (width == null) return 'desktop';

  const mobilePortrait = width <= ABOUT_NARRATIVE_PROFILE_BREAKPOINTS.mobileMaxInlineSize;
  const mobileLandscape = height != null
    && height <= ABOUT_NARRATIVE_PROFILE_BREAKPOINTS.mobileLandscapeMaxBlockSize
    && width <= ABOUT_NARRATIVE_PROFILE_BREAKPOINTS.mobileLandscapeMaxInlineSize;
  if (mobilePortrait || mobileLandscape) return 'mobile';
  if (width <= ABOUT_NARRATIVE_PROFILE_BREAKPOINTS.tabletMaxInlineSize) return 'tablet';
  return 'desktop';
}

export function resolveAboutNarrativeMotionProfile({
  prefersReducedMotion = false,
  previewMotionProfile,
  previewReducedMotion,
} = {}) {
  if (previewMotionProfile != null) {
    return requireProfileId(
      previewMotionProfile,
      MOTION_PROFILE_SET,
      'About Narrative preview motion profile',
    );
  }
  if (previewReducedMotion != null) return previewReducedMotion ? 'reduced' : 'full';
  return prefersReducedMotion ? 'reduced' : 'full';
}

export function resolveAboutNarrativePointProfile(layoutProfile) {
  requireProfileId(
    layoutProfile,
    LAYOUT_PROFILE_SET,
    'About Narrative layout profile',
  );
  return ABOUT_NARRATIVE_POINT_PROFILE_BY_LAYOUT[layoutProfile];
}

export function validateAboutNarrativeProfileDurations(profiles) {
  const diagnostics = [];
  ABOUT_NARRATIVE_LAYOUT_PROFILE_IDS.forEach((profileId) => {
    const profile = profiles?.[profileId];
    if (!profile || typeof profile !== 'object') {
      diagnostics.push({
        level: 'error',
        code: 'profile-missing',
        profile: profileId,
        path: `profiles.${profileId}`,
        message: `Missing ${profileId} About Narrative profile.`,
      });
      return;
    }
    ['storyDurationWU', 'scrollDurationWU'].forEach((field) => {
      const value = Number(profile[field]);
      if (!Number.isFinite(value) || value <= 0) {
        diagnostics.push({
          level: 'error',
          code: 'profile-duration',
          profile: profileId,
          path: `profiles.${profileId}.${field}`,
          message: `${profileId} ${field} must be finite and greater than zero.`,
        });
      }
    });
  });
  return diagnostics;
}

export function createAboutNarrativeProfileResolver({
  profiles,
  inlineSize,
  blockSize,
  previewLayoutProfile,
  prefersReducedMotion = false,
  previewMotionProfile,
  previewReducedMotion,
} = {}) {
  const diagnostics = validateAboutNarrativeProfileDurations(profiles);
  if (diagnostics.length) {
    throw new RangeError(diagnostics.map((item) => `${item.path}: ${item.message}`).join('\n'));
  }

  const layoutProfile = previewLayoutProfile == null
    ? classifyAboutNarrativeLayoutProfile({ inlineSize, blockSize })
    : requireProfileId(
      previewLayoutProfile,
      LAYOUT_PROFILE_SET,
      'About Narrative preview layout profile',
    );
  const motionProfile = resolveAboutNarrativeMotionProfile({
    prefersReducedMotion,
    previewMotionProfile,
    previewReducedMotion,
  });
  const profile = profiles[layoutProfile];
  const storyDurationWU = Number(profile.storyDurationWU);
  const scrollDurationWU = Number(profile.scrollDurationWU);
  const storyPerScrollWU = storyDurationWU / scrollDurationWU;
  const scrollPerStoryWU = scrollDurationWU / storyDurationWU;

  const storyWUFromScrollWU = (scrollWU) => (
    clampScalar(scrollWU, scrollDurationWU) * storyPerScrollWU
  );
  const scrollWUFromStoryWU = (storyWU) => (
    clampScalar(storyWU, storyDurationWU) * scrollPerStoryWU
  );

  return Object.freeze({
    layoutProfile,
    motionProfile,
    storyDurationWU,
    scrollDurationWU,
    contentExtentWU: scrollDurationWU + 1,
    storyPerScrollWU,
    scrollPerStoryWU,
    storyWUFromScrollWU,
    scrollWUFromStoryWU,
  });
}

export function remapAboutNarrativeScrollTop({
  scrollTop,
  previousViewportHeight,
  nextViewportHeight,
  previousResolver,
  nextResolver,
}) {
  const previousHeight = positiveDimension(previousViewportHeight);
  const nextHeight = positiveDimension(nextViewportHeight);
  if (previousHeight == null || nextHeight == null) {
    throw new RangeError('About Narrative viewport heights must be finite and greater than zero.');
  }
  if (
    typeof previousResolver?.storyWUFromScrollWU !== 'function'
    || typeof nextResolver?.scrollWUFromStoryWU !== 'function'
  ) {
    throw new TypeError('About Narrative scroll remapping requires previous and next profile resolvers.');
  }

  const previousScrollWU = Math.max(0, Number(scrollTop) || 0) / previousHeight;
  const storyWU = previousResolver.storyWUFromScrollWU(previousScrollWU);
  const nextScrollWU = nextResolver.scrollWUFromStoryWU(storyWU);
  return {
    storyWU,
    scrollWU: nextScrollWU,
    scrollTop: nextScrollWU * nextHeight,
  };
}
