export const ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA = Object.freeze({
  id: 'about-correspondence-metrics-v2',
  version: 2,
  visibilityThreshold: 0.001,
  distanceUnits: 'world-unit',
  normalizedDistanceUnits: 'shared-bounds-diagonal',
  percentileInterpolation: 'nearest-rank',
  baselineMode: 'constrained-index-v1',
  tailGuard: Object.freeze({
    maximumRegressionWhenP95Improves: 0.02,
    p95RegressionWhenMaximumImproves: 0.08,
  }),
});

export const ABOUT_NARRATIVE_CORRESPONDENCE_STRATEGIES = Object.freeze([
  Object.freeze({
    id: 'index-v1',
    version: '1.0.0',
    label: 'Index order',
    description: 'Preserves generator index order without spatial reassignment.',
    capabilities: Object.freeze({ locality: false, semanticGroups: false, visibilityPriority: false }),
    parameters: Object.freeze([]),
  }),
  Object.freeze({
    id: 'stable-seed',
    version: '1.0.0',
    label: 'Stable seed',
    description: 'Preserves the established stable generator order.',
    capabilities: Object.freeze({ locality: false, semanticGroups: false, visibilityPriority: false }),
    parameters: Object.freeze([]),
  }),
  Object.freeze({
    id: 'spatial-nearest-v1',
    version: '1.0.0',
    label: 'Local travel (legacy)',
    description: 'The compatibility spatial matcher used by existing documents.',
    capabilities: Object.freeze({ locality: true, semanticGroups: true, visibilityPriority: true }),
    parameters: Object.freeze([]),
  }),
  Object.freeze({
    id: 'spatial-nearest-v2',
    version: '2.0.0',
    label: 'Local travel',
    description: 'A deterministic visibility-first matcher with exact semantic groups and joint anchors.',
    capabilities: Object.freeze({ locality: true, semanticGroups: true, visibilityPriority: true, jointAnchors: true }),
    parameters: Object.freeze([]),
  }),
  Object.freeze({
    id: 'radial-emergence-v1',
    version: '1.0.0',
    label: 'Radial emergence',
    description: 'Feeds the earliest-rising target bands from the source points nearest the destination origin.',
    capabilities: Object.freeze({ locality: true, semanticGroups: false, visibilityPriority: true, radialOrder: true }),
    parameters: Object.freeze([]),
  }),
  Object.freeze({
    id: 'group-aware',
    version: '1.0.0',
    label: 'Group aware (legacy)',
    description: 'Preserves the established semantic group swap behavior.',
    capabilities: Object.freeze({ locality: false, semanticGroups: true, visibilityPriority: false }),
    parameters: Object.freeze([]),
  }),
]);

const STRATEGY_BY_ID = new Map(ABOUT_NARRATIVE_CORRESPONDENCE_STRATEGIES.map((strategy) => [strategy.id, strategy]));

export const ABOUT_NARRATIVE_CORRESPONDENCE_MODES = Object.freeze(
  ABOUT_NARRATIVE_CORRESPONDENCE_STRATEGIES.map((strategy) => strategy.id),
);

export function getAboutNarrativeCorrespondenceStrategy(id) {
  return STRATEGY_BY_ID.get(id) || null;
}
export function getAboutNarrativeCorrespondenceStrategyVersion(id) {
  return getAboutNarrativeCorrespondenceStrategy(id)?.version || null;
}

export function isAboutNarrativeCorrespondenceStrategy(id) {
  return STRATEGY_BY_ID.has(id);
}
