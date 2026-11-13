import Matter from 'matter-js';
import { createBoardAssemblyGeometry } from './boardAssemblyGeometry.js';
import { reboundMaterial, TRANSFER_CANAL_MATERIAL } from './boardMaterials.js';

const { Bodies, Body } = Matter;
const SVG_NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const LEGACY_IDS = [
  'geometry-fixture-0004', 'Vector_152', 'Vector_153', 'Vector_156', 'Vector_157',
  'Vector_158', 'Vector_159', 'Vector_160',
  ...Array.from({ length: 20 }, (_, index) => `Vector_${173 + index}`),
];

function element(name, attributes) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function wheelSegments(spec) {
  const [cx, cy] = spec.centre;
  const inner = spec.carrierInnerRadius - spec.vaneWidth / 2;
  const outer = spec.carrierOuterRadius - spec.vaneWidth / 2;
  return Array.from({ length: spec.compartmentCount }, (_, index) => {
    const angle = -Math.PI / 2 + index * TAU / spec.compartmentCount;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return {
      start: [cx + cos * inner, cy + sin * inner],
      end: [cx + cos * outer, cy + sin * outer],
    };
  });
}

function wheelArt(spec) {
  const [cx, cy] = spec.centre;
  const carrier = element('g', { id: `runtime-${spec.id}-carrier` });
  for (const [index, { start, end }] of wheelSegments(spec).entries()) {
    carrier.append(element('path', {
      id: `runtime-${spec.id}-compartment-${index + 1}`,
      d: `M${start.join(' ')}L${end.join(' ')}`,
      fill: 'none', stroke: 'var(--about-architecture-action)',
      'stroke-width': spec.vaneWidth, 'stroke-linecap': 'round',
    }));
  }
  const root = element('g', { id: `runtime-${spec.id}`, class: 'about-board-drum' });
  root.append(carrier,
    element('circle', { cx, cy, r: spec.carrierInnerRadius, fill: 'var(--about-architecture-action)' }),
    element('circle', { cx, cy, r: spec.pinRadius, fill: 'var(--about-architecture-static)' }));
  return root;
}

export function installBoardDrumArt(svg, { ballRadius, top }) {
  const geometry = createBoardAssemblyGeometry(ballRadius);
  const source = svg.querySelector('#Geometry');
  const root = element('g', {
    id: 'runtime-assembly', transform: `translate(0 ${top})`,
    'data-board-text-keepout': 'true', 'data-board-module': 'assembly', 'data-quiet-offset': top,
  });
  const { casing, gate, receiverObstacle } = geometry;
  const [cx, cy] = gate.pivot;
  const [obstacleX, obstacleY] = receiverObstacle.centre;
  root.append(
    element('rect', {
      x: 0, y: casing.top, width: 960, height: casing.bottom - casing.top,
      fill: 'var(--about-architecture-static)',
    }),
    element('path', { d: geometry.channelPath, fill: 'var(--studio-window-bg)' }),
    element('circle', {
      cx: obstacleX, cy: obstacleY, r: receiverObstacle.radius, fill: 'var(--about-architecture-static)',
    }),
    element('path', {
      id: gate.id, d: `M${gate.pivot.join(' ')}L${gate.end.join(' ')}`,
      fill: 'none', stroke: 'var(--about-architecture-action)', 'stroke-width': gate.width,
      'stroke-linecap': 'round',
    }),
    element('circle', { cx, cy, r: gate.pivotRadius, fill: 'var(--about-architecture-action)' }),
    element('circle', { cx, cy, r: gate.pinRadius, fill: 'var(--about-architecture-static)' }),
    ...geometry.wheels.map(wheelArt),
  );
  const removed = [];
  for (const id of LEGACY_IDS) {
    const node = svg.querySelector(`#${id}`);
    if (!node) continue;
    const marker = document.createComment(`restore ${id}`);
    node.replaceWith(marker);
    removed.push([node, marker]);
  }
  source.append(root);
  return {
    geometry, top,
    dispose() {
      root.remove();
      for (const [node, marker] of removed) marker.replaceWith(node);
    },
  };
}

function carrierBody(spec) {
  const label = `${spec.id}-carrier`;
  const material = { isStatic: true, ...reboundMaterial('zero'), label };
  const parts = [Bodies.circle(...spec.centre, spec.carrierInnerRadius, material, 48)];
  for (const { start, end } of wheelSegments(spec)) {
    const dx = end[0] - start[0], dy = end[1] - start[1];
    parts.push(Bodies.rectangle((start[0] + end[0]) / 2, (start[1] + end[1]) / 2,
      Math.hypot(dx, dy) + 2, spec.vaneWidth, { ...material, angle: Math.atan2(dy, dx) }),
    Bodies.circle(...end, spec.vaneWidth / 2, material));
  }
  const body = Body.create({ ...material, parts });
  Body.setPosition(body, { x: spec.centre[0], y: spec.centre[1] });
  return body;
}

function railBodies({ side, points }, top) {
  const outward = side === 'left' ? -1 : 1;
  const width = 20;
  // Each wall extends into the casing. The inner face follows the same
  // segment as the SVG channel, including where a bend meets a wheel port.
  return points.slice(1).map(([x, y], index) => {
    const [startX, startY] = points[index];
    const dx = x - startX, dy = y - startY;
    const length = Math.hypot(dx, dy);
    const offset = outward * width / (2 * length);
    return Bodies.rectangle((x + startX) / 2 + dy * offset,
      top + (y + startY) / 2 - dx * offset, length + .02, width, {
        isStatic: true, ...TRANSFER_CANAL_MATERIAL,
        angle: Math.atan2(dy, dx), label: `rail:drum-transfer-${side}`,
      });
  });
}

export function createBoardDrumPhysics({ geometry, top = 0 }) {
  const toWorld = ([x, y]) => [x, y + top];
  const specs = geometry.wheels.map(spec => ({ ...spec, centre: toWorld(spec.centre) }));
  const gate = { ...geometry.gate, pivot: toWorld(geometry.gate.pivot), end: toWorld(geometry.gate.end) };
  const obstacle = geometry.receiverObstacle;
  const staticMaterial = { isStatic: true, ...TRANSFER_CANAL_MATERIAL };
  const fixedBodies = [
    ...geometry.rails.flatMap(rail => railBodies(rail, top)),
    Bodies.circle(...toWorld(obstacle.centre), obstacle.radius,
      { ...staticMaterial, label: 'rail:drum-transfer-receiver' }),
    Bodies.circle(...gate.pivot, gate.pivotRadius,
      { ...staticMaterial, label: 'rail:drum-transfer-pivot' }),
  ];
  const carriers = specs.map(spec => ({ spec, body: carrierBody(spec), angle: 0 }));
  return {
    specs, gate, fixedBodies, carrierBodies: carriers.map(carrier => carrier.body),
    update(timestamp) {
      for (const carrier of carriers) {
        carrier.angle = timestamp * carrier.spec.speed;
        Body.setAngle(carrier.body, carrier.angle, true);
      }
    },
    render(artwork) {
      for (const { spec, angle } of carriers) {
        artwork.rotate(`runtime-${spec.id}-carrier`, angle, spec.centre, spec.casingRadius);
      }
    },
  };
}
