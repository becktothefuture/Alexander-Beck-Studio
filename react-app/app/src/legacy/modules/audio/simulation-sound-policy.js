export const HOME_SIMULATION_SOUND_BEHAVIORS = Object.freeze({
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

export function getHomeSimulationSoundBehavior(mode) {
  return HOME_SIMULATION_SOUND_BEHAVIORS[String(mode || '')] || 'silent';
}

/**
 * Attention has no ball-to-ball collision solver, so a real wall impact is its
 * only physical sound event. Give that impact enough energy to clear the
 * crystalline collision voice threshold and debounce the swarm as one source.
 */
export function resolveWallImpactSound({
  mode,
  impact,
  fallbackId = null,
} = {}) {
  const safeImpact = Math.min(1, Math.max(0, Number(impact) || 0));
  if (mode === 'flies') {
    return {
      id: 'attention:wall-impact',
      intensity: Math.min(1, safeImpact * 1.15),
      minimumIntensity: 0.7,
      minIntervalMs: 140,
    };
  }
  return {
    id: fallbackId,
    intensity: safeImpact * 0.65,
    minimumIntensity: 0,
    minIntervalMs: 0,
  };
}
