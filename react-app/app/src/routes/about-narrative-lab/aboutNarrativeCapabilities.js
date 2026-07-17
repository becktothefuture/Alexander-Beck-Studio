import {
  ABOUT_NARRATIVE_ADAPTER_DEFINITIONS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
  ABOUT_NARRATIVE_TRANSITION_TYPES,
} from './aboutNarrativeDefinitions.js';
import {
  ABOUT_NARRATIVE_CORRESPONDENCE_STRATEGIES,
  getAboutNarrativeCorrespondenceStrategy,
} from './aboutNarrativeCorrespondenceRegistry.js';

const MORPH_TYPES = new Set(['morph', 'dissolve-morph']);
const DEFAULT_RENDERER_PROFILE = Object.freeze({
  maximumConcurrentGroups: 1,
  maximumDrawCalls: 1,
  maximumGpuBytes: Number.POSITIVE_INFINITY,
  pointPoolContract: 'fixed-point-pool-v1',
});

function issue(code, message, path = '') {
  return Object.freeze({ code, message, path });
}
function resolveIds(input) {
  return {
    sourceAdapterId: input.sourceAdapterId || input.sourceAdapter?.id || '',
    targetAdapterId: input.targetAdapterId || input.targetAdapter?.id || '',
    sourceShapeId: input.sourceShapeId || input.sourceShape?.id || '',
    targetShapeId: input.targetShapeId || input.targetShape?.id || '',
    transitionType: input.transitionType || input.transition?.type || 'cut',
    correspondenceId: input.correspondenceId || input.transition?.correspondence || 'index-v1',
    interactionType: input.interactionType || input.interaction?.type || 'none',
  };
}

function transitionResources(type, rendererProfile) {
  if (type === 'crossfade') {
    return Object.freeze({
      concurrentGroups: 2,
      drawCalls: 2,
      maximumGpuBytes: Number(rendererProfile.estimatedCrossfadeGpuBytes || 0),
      preparation: 'both-groups-before-activation',
      disposal: 'outgoing-group-after-overlap',
    });
  }
  return Object.freeze({
    concurrentGroups: 1,
    drawCalls: 1,
    maximumGpuBytes: Number(rendererProfile.estimatedPointFieldGpuBytes || 0),
    preparation: MORPH_TYPES.has(type) ? 'correspondence-before-activation' : 'target-before-boundary',
    disposal: 'replace-after-boundary',
  });
}

function supportsTransition({
  transitionType,
  sourceAdapter,
  targetAdapter,
  sourceShape,
  targetShape,
  strategy,
  interactionType,
  rendererProfile,
  reducedMotion,
}) {
  const reasons = [];
  const warnings = [];
  const resources = transitionResources(transitionType, rendererProfile);

  if (!ABOUT_NARRATIVE_TRANSITION_TYPES.includes(transitionType)) {
    reasons.push(issue('unknown-transition', `Unknown transition “${transitionType}”.`, 'transition.type'));
  }
  if (!sourceAdapter) reasons.push(issue('unknown-source-adapter', 'The source World adapter is not registered.', 'source.adapterId'));
  if (!targetAdapter) reasons.push(issue('unknown-target-adapter', 'The target World adapter is not registered.', 'target.adapterId'));
  if (!sourceShape) reasons.push(issue('unknown-source-shape', 'The source Shape is not registered.', 'source.shapeId'));
  if (!targetShape) reasons.push(issue('unknown-target-shape', 'The target Shape is not registered.', 'target.shapeId'));
  if (sourceAdapter && sourceShape && sourceShape.adapterId !== sourceAdapter.id) {
    reasons.push(issue('source-shape-adapter', 'The source Shape does not belong to its adapter.', 'source.shapeId'));
  }
  if (targetAdapter && targetShape && targetShape.adapterId !== targetAdapter.id) {
    reasons.push(issue('target-shape-adapter', 'The target Shape does not belong to its adapter.', 'target.shapeId'));
  }

  if (MORPH_TYPES.has(transitionType)) {
    if (!strategy) reasons.push(issue('unknown-correspondence', 'The correspondence strategy is not registered.', 'transition.correspondence'));
    if (!sourceAdapter?.capabilities?.morph || !targetAdapter?.capabilities?.morph) {
      reasons.push(issue('morph-unsupported', 'Both World adapters must support fixed-pool morphing.', 'transition.type'));
    }
    if (sourceAdapter?.id !== targetAdapter?.id) {
      reasons.push(issue('morph-adapter-mismatch', 'Morphing requires the same compatible adapter on both sides.', 'transition.type'));
    }
    if (rendererProfile.pointPoolContract !== 'fixed-point-pool-v1') {
      reasons.push(issue('point-pool-contract', 'This renderer profile does not provide the fixed point pool required for morphing.', 'rendererProfile'));
    }
  }

  if (transitionType === 'crossfade') {
    const concurrent = sourceAdapter?.capabilities?.crossfade === true
      && targetAdapter?.capabilities?.crossfade === true;
    if (!concurrent) reasons.push(issue('crossfade-unsupported', 'Both adapters must support concurrent groups in the shared renderer.', 'transition.type'));
    if (rendererProfile.maximumConcurrentGroups < resources.concurrentGroups
      || rendererProfile.maximumDrawCalls < resources.drawCalls
      || rendererProfile.maximumGpuBytes < resources.maximumGpuBytes) {
      reasons.push(issue('crossfade-budget', 'The active renderer profile cannot budget two concurrent World groups.', 'rendererProfile'));
    }
  }

  if (interactionType !== 'none' && !targetAdapter?.capabilities?.interaction) {
    reasons.push(issue('interaction-unsupported', 'The target adapter does not support the selected interaction.', 'interaction.type'));
  }
  if (reducedMotion && targetAdapter && !targetAdapter.capabilities?.reducedMotion) {
    reasons.push(issue('reduced-motion-unsupported', 'The target adapter has no protected reduced-motion playback.', 'target.adapterId'));
  }
  if (reducedMotion && !['cut', 'hold'].includes(transitionType)) {
    warnings.push(issue('reduced-motion-settled', 'Reduced motion previews the settled target instead of continuous transition travel.', 'transition.type'));
  }

  return { reasons, warnings, resources };
}

export function resolveAboutNarrativeCapabilities(input = {}) {
  const ids = resolveIds(input);
  const rendererProfile = { ...DEFAULT_RENDERER_PROFILE, ...(input.rendererProfile || {}) };
  const sourceAdapter = ABOUT_NARRATIVE_ADAPTER_DEFINITIONS[ids.sourceAdapterId] || null;
  const targetAdapter = ABOUT_NARRATIVE_ADAPTER_DEFINITIONS[ids.targetAdapterId] || null;
  const sourceShape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[ids.sourceShapeId] || null;
  const targetShape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[ids.targetShapeId] || null;
  const strategy = getAboutNarrativeCorrespondenceStrategy(ids.correspondenceId);
  const result = supportsTransition({
    ...ids,
    sourceAdapter,
    targetAdapter,
    sourceShape,
    targetShape,
    strategy,
    interactionType: ids.interactionType,
    rendererProfile,
    reducedMotion: Boolean(input.reducedMotion),
  });
  const alternatives = ABOUT_NARRATIVE_TRANSITION_TYPES.filter((transitionType) => (
    transitionType !== ids.transitionType
    && supportsTransition({
      ...ids,
      transitionType,
      sourceAdapter,
      targetAdapter,
      sourceShape,
      targetShape,
      strategy,
      interactionType: ids.interactionType,
      rendererProfile,
      reducedMotion: Boolean(input.reducedMotion),
    }).reasons.length === 0
  ));
  return Object.freeze({
    supported: result.reasons.length === 0,
    reasons: Object.freeze(result.reasons),
    warnings: Object.freeze(result.warnings),
    requiredResources: result.resources,
    alternatives: Object.freeze(alternatives),
    metadata: Object.freeze({
      sourceAdapter,
      targetAdapter,
      sourceShape,
      targetShape,
      correspondence: strategy,
      registeredCorrespondenceStrategies: ABOUT_NARRATIVE_CORRESPONDENCE_STRATEGIES,
    }),
  });
}
