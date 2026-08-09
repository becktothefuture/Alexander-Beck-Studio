const PRESS_LAYER = Object.freeze({
  delayMs: 0,
  gain: 0.099,
  filterHz: 2200,
  playbackRate: 1,
});

export const INTERACTION_SOUND_RECIPES = Object.freeze({
  press: Object.freeze({
    durationMs: 42,
    layers: Object.freeze([PRESS_LAYER]),
  }),
  'project-open': Object.freeze({
    durationMs: 88,
    layers: Object.freeze([
      PRESS_LAYER,
      Object.freeze({
        delayMs: 35,
        gain: 0.038,
        filterHz: 1850,
        playbackRate: 0.92,
      }),
    ]),
  }),
  close: Object.freeze({
    durationMs: 48,
    layers: Object.freeze([
      Object.freeze({
        delayMs: 0,
        gain: 0.07,
        filterHz: 1500,
        playbackRate: 0.88,
      }),
    ]),
  }),
  step: Object.freeze({
    durationMs: 42,
    layers: Object.freeze([
      Object.freeze({
        delayMs: 0,
        gain: 0.08,
        filterHz: 1600,
        playbackRate: 1,
      }),
    ]),
  }),
});

const DELEGATED_KINDS = new Set(['press', 'close', 'step']);

function resolveTargetElement(target) {
  if (target?.closest) return target;
  return target?.parentElement || null;
}

export function getInteractionSoundDescriptor(target) {
  const element = resolveTargetElement(target)?.closest?.('[data-sound-action]');
  if (!element) return null;

  const kind = String(element.dataset?.soundAction || '').trim();
  if (!DELEGATED_KINDS.has(kind)) return null;
  if (element.disabled || element.getAttribute?.('aria-disabled') === 'true') return null;

  return {
    kind,
    source: String(element.dataset?.soundSource || 'unclassified-action'),
    element,
  };
}

export function createInteractionSoundDelegate({ root, play }) {
  if (!root?.addEventListener || typeof play !== 'function') return () => {};

  const handleClick = (event) => {
    const descriptor = getInteractionSoundDescriptor(event.target);
    if (!descriptor) return;
    play(descriptor.kind, { source: descriptor.source });
  };

  root.addEventListener('click', handleClick);
  return () => root.removeEventListener('click', handleClick);
}
