const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// Restores the September 7 About depth track. Keep X/Y at the viewport centre;
// Home's shared entrance owns the separate per-letter colour and movement.
export function rollercoasterTitleDepth(localProgress, options, elapsedMs, reducedMotion, motion = {}) {
  if (reducedMotion) return 0;
  const progress = clamp(localProgress * options.count - options.index);
  const entry = Number(motion.entryDepth ?? 100);
  const exit = Number(motion.exitDepth ?? 70);
  const arrival = smooth(elapsedMs / 900);
  if (options.ending) return -entry * (1 - Math.max(arrival, smooth(progress / 0.5)));
  if (options.opening) return -entry * (1 - arrival) + exit * 0.4 * smooth(progress);
  return -entry + (entry + exit) * progress;
}

/** One active title visit. Reflow does not replay it; a new visit or new copy
 * does. Cancellation always settles glyphs before releasing their old layer. */
export function createRollercoasterTitleAnimator(createSequence) {
  let visit = null;
  function clear() {
    const previous = visit;
    visit = null;
    previous?.sequence.cancel();
    if (previous) previous.node.dataset.titleReveal = 'settled';
  }
  function update(record, reducedMotion, now) {
    const node = record?.node.querySelector('[data-title-draw]') || null;
    if (!node) { clear(); return 0; }
    if (visit?.node !== node || visit.reducedMotion !== reducedMotion) {
      clear();
      const sequence = createSequence({
        scopes: node, profile: 'route', timingMode: 'repeat', reducedMotion,
        trigger: 'about-title', targetSelector: '[data-title-draw]',
        targetDefaults: { trigger: 'about-title', groupName: 'identity', order: 0, variant: 'bookend-title' },
        bookendDelayMs: 0,
      });
      const current = { node, sequence, reducedMotion, started: now, deadline: now + sequence.totalMs + 160 };
      visit = current;
      node.dataset.titleReveal = reducedMotion ? 'settled' : 'playing';
      sequence.stage();
      void sequence.play().then(() => {
        if (visit === current) node.dataset.titleReveal = 'settled';
      }).catch(() => {
        sequence.cancel();
        if (visit === current) node.dataset.titleReveal = 'settled';
      });
    }
    // Route handoffs can retire a queued entrance frame. Keep the semantic
    // heading visible even when its animation completion callback is lost.
    if (now >= visit.deadline && node.dataset.titleReveal === 'playing') {
      visit.sequence.cancel();
      node.dataset.titleReveal = 'settled';
    }
    return Math.max(0, now - visit.started);
  }
  return { update, dispose: clear };
}
