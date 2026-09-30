import { boundsOnBoard } from './boardGeometry.js';
import { BOARD_GARDEN, BOARD_MACHINE_MODULES, BOARD_MODULE_HEIGHTS } from './boardMachineParts.js';
import { resolveFieldBumperRadius } from './boardHandoffs.js';

// A join follows each complete machine module. Reading heights are measured
// in CSS pixels; mechanical dimensions stay in the shared 960-unit grid.
const JOINS = Object.freeze([
  { clearance: 80 },
  { id: 'garden-ideas', desktopLines: 2, mobileLines: 2 },
  { id: 'disciplines', desktopLines: 19.25, mobileLines: 37.2 },
  { clearance: 0 },
  { id: 'practice', desktopLines: 12, mobileLines: 19 },
  { clearance: 90 },
  { id: 'making', desktopLines: 2, mobileLines: 2 },
  { id: 'working-together', desktopLines: 16, mobileLines: 30 },
  { id: 'final-statement', desktopLines: 5, mobileLines: 8 },
]);

export function createQuietIntervals(boardWidth, heights = {}) {
  const scale = boardWidth / 960;
  const mobile = boardWidth <= 760;
  const fontSize = mobile ? 20 : Math.min(28, Math.max(23, boardWidth * .02));
  const padding = mobile ? 72 : 100;
  const modules = [];
  const seams = [];
  let top = BOARD_MACHINE_MODULES[0][1];
  BOARD_MACHINE_MODULES.forEach(([name, sourceTop, sourceEnd, selector], index) => {
    const height = BOARD_MODULE_HEIGHTS[index];
    modules.push({ name, sourceTop, sourceEnd, selector, top, height, offset: top - sourceTop });
    top += height;
    const join = JOINS[index];
    if (!join) return;
    const contentHeight = heights[join.id]
      ?? (mobile ? join.mobileLines : join.desktopLines) * fontSize * 1.5;
    const joinHeight = join.id ? (padding * 2 + contentHeight) / scale : join.clearance;
    seams.push({ ...join, after: sourceEnd, before: BOARD_MACHINE_MODULES[index + 1][1],
      top, height: joinHeight, textY: join.id ? top + padding / scale : undefined });
    top += joinHeight;
  });
  // Existing mechanism anchors live in the original drawing. Never stretch
  // them when a neighbouring module or its reading section becomes taller.
  const placeY = y => {
    let shift = 0;
    for (const module of modules) {
      if (y < module.sourceTop) break;
      shift = module.offset;
    }
    return y + shift;
  };
  const intervals = seams.filter(seam => seam.id);
  return { modules, intervals, seams, placeY, placePoint: ([x, y]) => [x, placeY(y)],
    textY: id => intervals.find(interval => interval.id === id)?.textY };
}

/** Install once, before physical bodies are read. No per-frame remapping. */
export function installQuietIntervalGeometry(svg, placement, ballRadius = 13) {
  const removed = [];
  const wrappers = [];
  const additions = [];
  const geometry = svg.querySelector('#Geometry');
  const make = (tag, attributes) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  };
  // Both viewports use all nine columns, including the centre impact column.
  for (const node of svg.querySelectorAll('[id^="geometry-bumper-"]')) {
    const marker = document.createComment(`restore ${node.id}`);
    node.replaceWith(marker);
    removed.push({ node, marker });
  }
  for (const [key, sourceTop] of [['top', 1340], ['lower', 1760]]) {
    const garden = BOARD_GARDEN[key];
    const spacing = Math.min(...garden.columns.slice(1).map((x, i) => x - garden.columns[i]));
    const radius = resolveFieldBumperRadius(BOARD_GARDEN.radius, spacing, ballRadius);
    garden.rows.forEach((y, row) => garden.columns.forEach((cx, column) => {
      const index = row * garden.columns.length + column + 1;
      const id = key === 'top' ? `geometry-bumper-${String(index).padStart(4, '0')}`
        : `geometry-bumper-lower-${index}`;
      const group = make('g', { id });
      for (const offset of garden.faceOffset ? [garden.faceOffset, 0] : [0]) {
        group.append(make('circle', { cx, cy: sourceTop + y + offset,
          r: radius, fill: 'var(--about-architecture-wall)' }));
      }
      geometry.append(group);
      additions.push(group);
    }));
  }
  const wedge = svg.querySelector('#Vector_140');
  const wedgeTransform = wedge?.getAttribute('transform');
  if (wedge) {
    const box = boundsOnBoard(wedge);
    const inverse = geometry.getCTM().inverse().multiply(wedge.parentElement.getCTM()).inverse();
    const dx = BOARD_GARDEN.exitRamp.x - box.x;
    const dy = 1760 + BOARD_GARDEN.exitRamp.y - box.y;
    wedge.setAttribute('transform', `translate(${inverse.a * dx + inverse.c * dy} `
      + `${inverse.b * dx + inverse.d * dy}) ${wedgeTransform || ''}`);
  }
  function translate(node, shift, moduleName) {
    const wrapper = make('g', {});
    const inverse = geometry.getCTM().inverse().multiply(node.parentElement.getCTM()).inverse();
    wrapper.setAttribute('transform', `translate(${inverse.c * shift} ${inverse.d * shift})`);
    wrapper.dataset.quietOffset = String(shift);
    if (moduleName) wrapper.dataset.boardModule = moduleName;
    node.replaceWith(wrapper);
    wrapper.append(node);
    wrappers.push(wrapper);
  }
  // Explicit membership matters: extended gardens and ramps now exceed the
  // old source intervals. Looking up each leaf's Y would place them twice.
  for (const module of placement.modules) {
    for (const node of svg.querySelectorAll(module.selector)) {
      if (!node.closest('[data-board-module]')) translate(node, module.offset, module.name);
    }
  }
  function visit(node) {
    if (!(node instanceof SVGGraphicsElement) || node.closest('[data-board-module]')) return;
    if (node.children.length) { [...node.children].forEach(visit); return; }
    const { y } = boundsOnBoard(node);
    const shift = placement.placeY(y) - y;
    if (shift) translate(node, shift);
  }
  [...geometry.children].forEach(visit);
  return () => {
    for (const wrapper of wrappers.reverse()) wrapper.replaceWith(...wrapper.childNodes);
    for (const node of additions) node.remove();
    if (wedge) {
      if (wedgeTransform === null) wedge.removeAttribute('transform');
      else wedge.setAttribute('transform', wedgeTransform);
    }
    for (const { node, marker } of removed) marker.replaceWith(node);
  };
}
