import { BOARD_ARCHITECTURE_LINE_SCALE } from './boardArchitectureWeight.js';
import { BOARD_PINBALL_BUMPERS, BOARD_ROTORS, BOARD_SEESAWS } from './boardMachineParts.js';

export const PRODUCT_RECEIVER_LIFT = 400;

/** Replace complete authored mechanisms, including their collision IDs.
 * No hidden flippers or leaves remain after their artwork is removed. */
export function installBoardPinball(svg) {
  const geometry = svg.querySelector('#Geometry');
  const removed = [];
  const added = [];
  const make = (tag, attributes) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  };
  for (const id of ['geometry-pinball-playfield', 'geometry-propeller-0001',
    'geometry-fixture-0002', 'geometry-fixture-0003', 'geometry-impact-seesaw',
    'Vector_164', 'Vector_165', 'Vector_166', 'Vector_167', 'Vector_168', 'Vector_169',
    'Vector_154', 'Vector_155', 'Vector_193', 'Vector_194']) {
    const node = svg.querySelector(`#${id}`);
    if (!node) continue;
    const marker = document.createComment(`restore ${id}`);
    node.replaceWith(marker);
    removed.push({ node, marker });
  }
  const field = make('g', { id: 'geometry-pinball-playfield' });
  for (const [index, [cx, cy]] of BOARD_PINBALL_BUMPERS.entries()) {
    const group = make('g', { id: `geometry-pinball-bumper-${String(index + 1).padStart(4, '0')}` });
    group.append(make('circle', { cx, cy, r: 42, fill: 'var(--about-architecture-wall)' }));
    field.append(group);
  }
  geometry.append(field); added.push(field);
  for (const [index, spec] of BOARD_ROTORS.entries()) {
    const [cx, cy] = spec.pivot;
    const group = make('g', { id: spec.id });
    const vertical = spec.flipped ? -1 : 1;
    for (const [blade, [ex, ey]] of [[cx, cy - 96 * vertical], [cx + 83.14, cy + 48 * vertical],
      [cx - 83.14, cy + 48 * vertical]].entries()) {
      group.append(make('path', { id: `propeller-${index + 1}-blade-${blade + 1}`,
        d: `M${cx} ${cy}L${ex} ${ey}`, fill: 'none',
        stroke: 'var(--about-architecture-action)',
        'stroke-width': 30 * BOARD_ARCHITECTURE_LINE_SCALE, 'stroke-linecap': 'round' }));
    }
    group.append(make('circle', { cx, cy, r: 23, fill: 'var(--about-architecture-action)' }));
    group.append(make('circle', { cx, cy, r: 6, fill: 'var(--about-architecture-wall)' }));
    geometry.append(group); added.push(group);
  }
  for (const spec of BOARD_SEESAWS) {
    const [cx, cy] = spec.pivot;
    const dx = Math.cos(spec.angle) * spec.length / 2;
    const dy = Math.sin(spec.angle) * spec.length / 2;
    const group = make('g', { id: spec.id });
    group.append(make('path', { d: `M${cx - dx} ${cy - dy}L${cx + dx} ${cy + dy}`,
      fill: 'none', stroke: 'var(--about-architecture-action)',
      'stroke-width': 24 * BOARD_ARCHITECTURE_LINE_SCALE, 'stroke-linecap': 'round' }));
    group.append(make('circle', { cx, cy, r: 10, fill: 'var(--about-architecture-wall)' }));
    geometry.append(group); added.push(group);
  }
  return {
    dispose() {
      for (const node of added) node.remove();
      for (const { node, marker } of removed) marker.replaceWith(node);
    },
  };
}
