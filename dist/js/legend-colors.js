/* Alexander Beck Studio | 2026-01-18 */
import { g as getGlobals } from './shared.js';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        EXPERTISE LEGEND COLORS                               ║
// ║     Assign discipline dots based on ball palette distribution + story        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


/**
 * Legend colors are driven by `globals.colorDistribution`:
 * - Each label picks a palette index (0..7), rendered as `bg-ball-(index+1)`.
 * - The same source of truth is used by `pickRandomColor()` for ALL mode spawns.
 */

function normalizeLabel(s) {
  return String(s || '').trim().toLowerCase();
}

function clampInt(v, min, max, fallback = min) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i < min ? min : i > max ? max : i;
}

function resolveClassForLegendLabel(labelText) {
  const g = getGlobals();
  const target = normalizeLabel(labelText);
  const dist = Array.isArray(g.colorDistribution) ? g.colorDistribution : null;
  if (!dist) return null;
  for (let i = 0; i < dist.length; i++) {
    const row = dist[i];
    if (normalizeLabel(row?.label) !== target) continue;
    const idx = clampInt(row?.colorIndex, 0, 7, 0);
    return `bg-ball-${idx + 1}`;
  }
  return null;
}

function applyExpertiseLegendColors() {
  const legend = document.getElementById('expertise-legend');
  if (!legend) return;

  const items = Array.from(legend.querySelectorAll('.legend__item'));
  for (const item of items) {
    const labelEl = item.querySelector('span');
    const circle = item.querySelector('.circle');
    if (!labelEl || !circle) continue;

    const label = normalizeLabel(labelEl.textContent);
    const cls = resolveClassForLegendLabel(label);
    if (!cls) continue;

    // Remove any previous bg-ball-* classes so we can reassign cleanly.
    for (const c of Array.from(circle.classList)) {
      if (c.startsWith('bg-ball-') || c.startsWith('bg-story-')) circle.classList.remove(c);
    }
    circle.classList.add(cls);
  }
}

export { applyExpertiseLegendColors };
//# sourceMappingURL=legend-colors.js.map
