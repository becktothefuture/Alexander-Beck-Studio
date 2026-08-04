export const ACCEPTABLE_SCREEN_BOOT_STATES = Object.freeze([
  'ready',
  'content-ready',
  'entered',
]);

const ACTIVE_MATERIAL_STATES = new Set([
  'prepared',
  'preparing',
  'entering',
  'exiting',
]);

export function evaluateScreenReadiness(sample, { minimumVisibleSelectors = 1 } = {}) {
  const failures = [];

  if (!ACCEPTABLE_SCREEN_BOOT_STATES.includes(sample?.bootState || '')) {
    failures.push(`boot-state:${sample?.bootState || 'unset'}`);
  }
  if ((sample?.transitionPhase || 'idle') !== 'idle') {
    failures.push(`transition-phase:${sample.transitionPhase}`);
  }
  if (sample?.overlayHidden !== true) {
    failures.push('boot-overlay-visible');
  }
  if (Number(sample?.visibleSelectors || 0) < minimumVisibleSelectors) {
    failures.push(`visible-selectors:${Number(sample?.visibleSelectors || 0)}<${minimumVisibleSelectors}`);
  }
  if (Number(sample?.unsettledGlyphCount || 0) > 0) {
    failures.push(`unsettled-glyphs:${sample.unsettledGlyphCount}`);
  }
  if (sample?.introPhase && sample.introPhase !== 'complete') {
    failures.push(`intro-phase:${sample.introPhase}`);
  }

  const activeMaterialStates = (sample?.materialStates || [])
    .filter((state) => ACTIVE_MATERIAL_STATES.has(String(state || '').toLowerCase()));
  if (activeMaterialStates.length > 0) {
    failures.push(`material-states:${activeMaterialStates.join(',')}`);
  }

  return {
    ready: failures.length === 0,
    failures,
  };
}

export function assessScreenRequirement(requirement, selectorResult) {
  const failures = [];
  const visibleStats = selectorResult.stats.filter((item) => item.visible);

  if (requirement.minCount && visibleStats.length < requirement.minCount) {
    failures.push(`${requirement.selector}:expected-visible-count>=${requirement.minCount},got=${visibleStats.length}`);
  }

  if (!requirement.minCount && visibleStats.length === 0) {
    failures.push(`${requirement.selector}:not-visible`);
  }

  if (requirement.minArea) {
    const maxArea = visibleStats.reduce((max, item) => Math.max(max, item.area), 0);
    if (maxArea < requirement.minArea) {
      failures.push(`${requirement.selector}:area<${requirement.minArea}`);
    }
  }

  const combinedText = visibleStats
    .map((item) => item.text)
    .join(' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();

  requirement.requiredText?.forEach((expected) => {
    const normalizedExpected = String(expected).replace(/\s+/gu, ' ').trim().toLowerCase();
    if (!combinedText.includes(normalizedExpected)) {
      failures.push(`${requirement.selector}:missing-text:${expected}`);
    }
  });

  requirement.requiredTextAnyOf?.forEach((options) => {
    const matched = options.some((expected) => {
      const normalizedExpected = String(expected).replace(/\s+/gu, ' ').trim().toLowerCase();
      return combinedText.includes(normalizedExpected);
    });
    if (!matched) {
      failures.push(`${requirement.selector}:missing-any-of:${options.join('|')}`);
    }
  });

  return {
    selector: requirement.selector,
    failures,
    visibleCount: visibleStats.length,
  };
}
