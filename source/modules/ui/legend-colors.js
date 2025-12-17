// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        EXPERTISE LEGEND COLORS                               ║
// ║     Assign discipline dots based on ball palette distribution + story        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * We align to the ball palette distribution:
 * - --ball-1 (index 0) is the dominant neutral in all templates (weight 0.50)
 * - --ball-2 (index 1) is the secondary neutral (weight 0.25)
 * - --ball-3 (index 2) is typically white / very light (weight 0.12) → avoid for dots
 * - --ball-4..--ball-8 are accents + black (weights 0.06..0.01)
 *
 * Story constraint:
 * - Creative Strategy uses a darker grey (not an accent).
 */
const CLASS_BY_DISCIPLINE = new Map([
  ['ai integration', 'bg-ball-4'],
  ['ui/ux design', 'bg-ball-2'],
  ['creative strategy', 'bg-story-grey'],
  ['frontend development', 'bg-ball-5'],
  ['brand identity', 'bg-ball-8'],
  ['3d design', 'bg-ball-7'],
  ['art direction', 'bg-ball-6'],
]);

function normalizeLabel(s) {
  return String(s || '').trim().toLowerCase();
}

export function applyExpertiseLegendColors() {
  const legend = document.getElementById('expertise-legend');
  if (!legend) return;

  const items = Array.from(legend.querySelectorAll('.legend__item'));
  for (const item of items) {
    const labelEl = item.querySelector('span');
    const circle = item.querySelector('.circle');
    if (!labelEl || !circle) continue;

    const label = normalizeLabel(labelEl.textContent);
    const cls = CLASS_BY_DISCIPLINE.get(label);
    if (!cls) continue;

    // Remove any previous bg-ball-* classes so we can reassign cleanly.
    for (const c of Array.from(circle.classList)) {
      if (c.startsWith('bg-ball-') || c.startsWith('bg-story-')) circle.classList.remove(c);
    }
    circle.classList.add(cls);
  }
}


