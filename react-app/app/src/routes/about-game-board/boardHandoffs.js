import { BOARD_DIRECTION_RAMPS, FIGMA_TO_BOARD } from './boardMachineParts.js';
import { boundsOnBoard } from './boardGeometry.js';
import { BOARD_ARCHITECTURE_LINE_SCALE } from './boardArchitectureWeight.js';
import { installBoardPinball } from './boardPinball.js';

/** Leave one Home-sized ball plus running clearance between field bumpers. */
export function resolveFieldBumperRadius(radius, spacing, ballRadius) {
  return Math.max(1, Math.min(radius, (spacing - ballRadius * 2.2) / 2));
}

export function reservoirGateForBallRadius(ballRadius = 13) {
  // A one-ball neck lets the larger phone bodies form an arch. Four diameters
  // of clear passage keep the original inventory flowing without shrinking it.
  // The same dimensions own the visible floors, valve and native colliders.
  const halfGap = Math.max(31, (ballRadius * 8 + 14.4 + 10 / 3) / 2);
  const left = 480 - halfGap;
  const right = 480 + halfGap;
  const closedAngle = Math.atan2(-24, right - 10 - left);
  return { id: 'geometry-fixture-0001', pivot: [left, 1124], end: [right - 10, 1100],
    // Swing down into the outlet. Swinging up through the pile creates a
    // closing wedge that can trap a ball against the opposite floor corner.
    width: 20 * BOARD_ARCHITECTURE_LINE_SCALE, pivotRadius: 14.4,
    openAngle: Math.PI / 2 - closedAngle };
}

/** Native funnel master 280:80449, aligned to the existing hinge height. */
export function reservoirFloorPolygons(gate) {
  const shoulderY = 825 + 103.6899 * FIGMA_TO_BOARD;
  const neckY = shoulderY + 310.3458 * FIGMA_TO_BOARD;
  const bottom = 1140;
  const left = gate.pivot[0];
  const right = gate.end[0] + 10;
  return [
    [[0, shoulderY], [left, neckY], [left, bottom], [0, bottom]],
    [[960, shoulderY], [right, neckY], [right, bottom], [960, bottom]],
  ];
}

export function installBoardHandoffArt(svg, {
  ballRadius = 13, reservoirBallRadius = ballRadius,
} = {}) {
  const restored = [];
  const translated = [];
  const added = [];
  const hidden = [];
  const geometry = svg.querySelector('#Geometry');
  const pinball = installBoardPinball(svg);
  const make = (tag, attributes) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  };
  const bumpers = [...svg.querySelectorAll('[id^="geometry-bumper-"]')].map(element => {
    const bounds = boundsOnBoard(element);
    return { element, x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2,
      radius: Math.min(bounds.width, bounds.height) / 2 };
  });
  for (const bumper of bumpers) {
    let spacing = Infinity;
    for (const other of bumpers) if (other !== bumper) {
      spacing = Math.min(spacing, Math.hypot(bumper.x - other.x, bumper.y - other.y));
    }
    const radius = resolveFieldBumperRadius(bumper.radius, spacing, ballRadius);
    if (!bumper.radius || radius >= bumper.radius) continue;
    const box = bumper.element.getBBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const original = bumper.element.getAttribute('transform');
    translated.push([bumper.element, original]);
    bumper.element.setAttribute('transform', `${original || ''} translate(${cx} ${cy})`
      + ` scale(${radius / bumper.radius}) translate(${-cx} ${-cy})`);
  }
  const moveHub = (groupId, armId, deltaX, deltaY = 0) => {
    for (const element of svg.querySelectorAll(`#${groupId} path`)) {
      if (element.id === armId) continue;
      translated.push([element, element.getAttribute('transform')]);
      element.setAttribute('transform', `translate(${deltaX} ${deltaY})`);
    }
  };
  const replace = (id, d) => {
    const element = svg.querySelector(`#${id}`);
    if (!element) return;
    restored.push([element, element.getAttribute('d')]);
    element.setAttribute('d', d);
  };
  const reservoirGate = reservoirGateForBallRadius(reservoirBallRadius);
  const left = reservoirGate.pivot[0];
  const [leftFloor, rightFloor] = reservoirFloorPolygons(reservoirGate);
  const top = svg.viewBox.baseVal.y;
  const funnel = [[0, top], [960, top], ...rightFloor.slice(0, 3), ...leftFloor.slice(0, 3).reverse()];
  const fill = make('polygon', { id: 'reservoir-fill', points: funnel.map(point => point.join(',')).join(' '),
    fill: 'var(--about-architecture-static)' });
  geometry.prepend(fill); added.push(fill);
  replace('Vector', `M${reservoirGate.pivot.join(' ')}L${reservoirGate.end.join(' ')}`);
  moveHub('geometry-fixture-0001', 'Vector', left - 447);
  for (const id of ['reservoir-left-floor', 'reservoir-right-floor']) {
    const node = svg.querySelector(`#${id}`);
    if (!node) continue;
    hidden.push([node, node.getAttribute('display')]);
    node.setAttribute('display', 'none');
  }
  for (const spec of BOARD_DIRECTION_RAMPS) {
    const ramp = make('polygon', { id: spec.id, points: spec.vertices.map(point => point.join(',')).join(' '),
      fill: 'var(--about-architecture-wall)' });
    geometry.append(ramp); added.push(ramp);
  }
  return {
    reservoirGate,
    pinball,
    dispose() {
      pinball.dispose();
      for (const node of added) node.remove();
      for (const [element, display] of hidden) {
        if (display === null) element.removeAttribute('display');
        else element.setAttribute('display', display);
      }
      for (const [element, d] of restored) {
        if (d === null) element.removeAttribute('d');
        else element.setAttribute('d', d);
      }
      for (const [element, transform] of translated) {
        if (transform === null) element.removeAttribute('transform');
        else element.setAttribute('transform', transform);
      }
    },
  };
}
