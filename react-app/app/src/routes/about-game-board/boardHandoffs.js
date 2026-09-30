import { BOARD_DIRECTION_RAMPS } from './boardMachineParts.js';
import { boundsOnBoard } from './boardGeometry.js';
import { BOARD_ARCHITECTURE_LINE_SCALE } from './boardArchitectureWeight.js';
import { drumPortEdges } from './boardDrums.js';
import { createDrumTransferCanal } from './boardTransferCanal.js';
import { installBoardPinball, PRODUCT_RECEIVER_LIFT } from './boardPinball.js';

/** Leave one Home-sized ball plus running clearance between field bumpers. */
export function resolveFieldBumperRadius(radius, spacing, ballRadius) {
  return Math.max(1, Math.min(radius, (spacing - ballRadius * 2.2) / 2));
}

export function reservoirGateForBallRadius(ballRadius = 13) {
  // The edited Figma master restores the original, deliberately slow outlet.
  // Keep its 62-unit neck at both authored widths. Below the 370px mobile
  // reference only, preserve one physical ball's passage around the hinge.
  const halfGap = Math.max(31, (ballRadius * 2.08 + 14.4 + 10 / 3) / 2);
  const left = 478 - halfGap;
  const right = 478 + halfGap;
  const closedAngle = Math.atan2(-24, right - 10 - left);
  return { id: 'geometry-fixture-0001', pivot: [left, 1124], end: [right - 10, 1100],
    // Swing down into the outlet. Swinging up through the pile creates a
    // closing wedge that can trap a ball against the opposite floor corner.
    width: 20 * BOARD_ARCHITECTURE_LINE_SCALE, pivotRadius: 14.4,
    openAngle: Math.PI / 2 - closedAngle };
}

export function installBoardHandoffArt(svg, {
  ballRadius = 13, reservoirBallRadius = ballRadius, drums = [],
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
  const right = reservoirGate.end[0] + 10;
  replace('reservoir-left-floor', `M0 825C0 850.333 17 872.333 51 891L${left} 1102V1140`);
  replace('reservoir-right-floor', `M960 825C960 850.333 943 872.333 909 891L${right} 1102V1140`);
  replace('Vector', `M${left} 1124L${right - 10} 1100`);
  moveHub('geometry-fixture-0001', 'Vector', left - 447);
  const meterHalf = Math.max(33, ballRadius * 1.6 + 19);
  const meterLeft = 382 - meterHalf;
  const meterRight = 382 + meterHalf;
  const lift = PRODUCT_RECEIVER_LIFT;
  replace('Vector_152', `M0 ${5408 - lift}L${meterLeft} ${5529 - lift}V${5554 - lift}`);
  replace('Vector_153', `M960 ${5388 - lift}L${meterRight} ${5529 - lift}V${5554 - lift}`);
  replace('Vector_170', `M${meterLeft} ${5544 - lift}L${meterRight - 5} ${5530 - lift}`);
  moveHub('geometry-fixture-0004', 'Vector_170', meterLeft - 349, -lift);
  // Keep the large receiver joined to the measured drum inlet at every size.
  const large = drums[0];
  if (large) {
    const [inletLeft, inletRight] = drumPortEdges(large).inlet;
    replace('Vector_156', `M-41 6333L${inletLeft[0] - 25} ${inletLeft[1] - 92}`
      + `Q${inletLeft[0]} ${inletLeft[1] - 84} ${inletLeft[0]} ${inletLeft[1] - 55}`
      + `V${inletLeft[1]}`);
    replace('Vector_157', `M960 6455L${inletRight[0] + 25} ${inletRight[1] - 92}`
      + `Q${inletRight[0]} ${inletRight[1] - 84} ${inletRight[0]} ${inletRight[1] - 55}`
      + `V${inletRight[1]}`);
  }
  const ramp = svg.querySelector('#Vector_159');
  if (ramp) {
    hidden.push([ramp, ramp.getAttribute('display')]);
    ramp.setAttribute('display', 'none');
  }
  const transferCanal = drums.length === 2 ? createDrumTransferCanal(...drums) : null;
  if (geometry && transferCanal) {
    transferCanal.paths.forEach((d, index) => {
      const path = make('path', { id: `drum-transfer-${index ? 'right' : 'left'}`,
        d, fill: 'none', stroke: 'var(--about-architecture-wall)',
        'stroke-width': transferCanal.width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      geometry.append(path); added.push(path);
    });
  }
  for (const spec of BOARD_DIRECTION_RAMPS) {
    const ramp = make('path', { id: spec.id,
      d: `M${spec.start.join(' ')}L${spec.end.join(' ')}`, fill: 'none',
      stroke: 'var(--about-architecture-wall)',
      'stroke-width': 25 * BOARD_ARCHITECTURE_LINE_SCALE, 'stroke-linecap': 'round' });
    geometry.append(ramp); added.push(ramp);
  }
  return {
    // Both valves retain their closed pose and hang vertically when open.
    reservoirGate,
    reservoirRight: right,
    meterGate: { pivot: [meterLeft, 5544 - lift], end: [meterRight - 5, 5530 - lift] },
    pinball,
    transferCanal,
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
