import { drumPortEdges } from './boardDrums.js';

/** A gravity-fed, constant-width passage. Both walls and their collision
 * bodies come from these same samples; no invisible steering force is used. */
export function createDrumTransferCanal(large, small) {
  const outlet = drumPortEdges(large).outlet;
  const inlet = drumPortEdges(small).inlet;
  const start = [large.centre[0], outlet[0][1]];
  const end = [small.centre[0], inlet[0][1]];
  const drop = end[1] - start[1];
  const halfWidth = (large.throatOpening + large.casingWidth) / 2;
  // Broad vertical shoulders keep the widened inner wall from folding over
  // itself at either bend. The centre line still descends at every sample.
  const control1 = [start[0], start[1] + drop * .9];
  const control2 = [end[0], end[1] - drop * .9];
  const left = [], right = [], centre = [];
  for (let index = 0; index <= 80; index += 1) {
    const t = index / 80, u = 1 - t;
    const x = u ** 3 * start[0] + 3 * u * u * t * control1[0]
      + 3 * u * t * t * control2[0] + t ** 3 * end[0];
    const y = u ** 3 * start[1] + 3 * u * u * t * control1[1]
      + 3 * u * t * t * control2[1] + t ** 3 * end[1];
    const dx = 3 * u * u * (control1[0] - start[0])
      + 6 * u * t * (control2[0] - control1[0]) + 3 * t * t * (end[0] - control2[0]);
    const dy = 3 * u * u * (control1[1] - start[1])
      + 6 * u * t * (control2[1] - control1[1]) + 3 * t * t * (end[1] - control2[1]);
    const length = Math.hypot(dx, dy);
    const nx = dy / length, ny = -dx / length;
    centre.push([x, y]);
    left.push([x - nx * halfWidth, y - ny * halfWidth]);
    right.push([x + nx * halfWidth, y + ny * halfWidth]);
  }
  const path = points => points.map(([x, y], index) =>
    `${index ? 'L' : 'M'} ${x.toFixed(3)} ${y.toFixed(3)}`).join(' ');
  return Object.freeze({ centre, left, right, width: large.casingWidth,
    clearWidth: large.throatOpening, paths: [path(left), path(right)],
    bounds: { minX: end[0] - halfWidth, maxX: start[0] + halfWidth,
      minY: start[1], maxY: end[1] } });
}
