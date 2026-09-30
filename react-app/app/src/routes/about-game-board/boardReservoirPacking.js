/** Seed a real gravity drop above the funnel. The seed rows are never drawn:
 * the preparation owner advances the closed world until every ball is at rest.
 * No analytic support graph can leave a vertical shelf balanced in mid-air. */
export function createRestingReservoirPacking({ radius, top, seeds }) {
  const pitch = radius * 2.08;
  const columns = Math.max(1, Math.floor((940 - radius * 4) / pitch));
  const left = (940 - (columns - 1) * pitch) / 2;
  const balls = seeds.map((seed, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    // Tiny deterministic offsets let equal-sized spheres settle into grains,
    // rather than preserving a perfect square lattice through the first fall.
    const jitter = Math.sin(index * 12.9898) * radius * .035;
    return { ...seed, x: left + column * pitch + jitter,
      y: 815 - radius - row * pitch + Math.cos(index * 4.17) * radius * .035 };
  });
  return { balls, filled: true, settled: false,
    stats: { count: balls.length, surfaceY: balls.at(-1)?.y ?? top, top, method: 'gravity-drop' } };
}
