import Matter from 'matter-js';
import { reboundMaterial } from './boardMaterials.js';
import {
  BOARD_AUTHORED_MAX_MOVING_BALL_RADIUS,
} from './boardBallPresentation.js';
import { BOARD_ARCHITECTURE_LINE_SCALE } from './boardArchitectureWeight.js';

const { Bodies, Body } = Matter;
const SVG_NS = 'http://www.w3.org/2000/svg';
const FULL_TURN = Math.PI * 2;

/** Default authored diameter; runtime apertures follow the shared Home size. */
export const DRUM_BALL_DIAMETER = BOARD_AUTHORED_MAX_MOVING_BALL_RADIUS * 2;

function drum(id, sourceId, centre, casingRadius, speed, legacyVanes) {
  return Object.freeze({
    id,
    sourceId,
    centre: Object.freeze(centre),
    casingRadius,
    casingWidth: 18 * BOARD_ARCHITECTURE_LINE_SCALE,
    compartmentCount: 6,
    vaneWidth: 16 * BOARD_ARCHITECTURE_LINE_SCALE,
    throatLength: 48,
    speed,
    legacyVanes: Object.freeze(legacyVanes),
  });
}

/** Two compartment wheels carry loose batches between radial paddles.
 * The large wheel turns clockwise; the smaller wheel reverses direction so
 * each handoff continues down the board rather than throwing balls sideways. */
const DRUM_FAMILIES = [
  drum('large-drum', 'Vector_158', [691, 6885], 249, 0.00084,
    Array.from({ length: 10 }, (_, index) => `Vector_${173 + index}`)),
  drum('small-drum', 'Vector_160', [266, 7568], 230, -0.00092,
    Array.from({ length: 10 }, (_, index) => `Vector_${183 + index}`)),
];

/** Keep room for several Home-sized balls in each compartment and a two-ball
 * transfer stream. Only the paddle tips approach the casing; the old solid
 * ring and its one-ball notches are gone. No balls are attached to the wheel. */
export function createBoardDrumSpecs(ballRadius = 13) {
  const transferOpening = Math.max(72, ballRadius * 4 + 12);
  return Object.freeze(DRUM_FAMILIES.map(base => {
    const carrierOuterRadius = base.casingRadius - base.casingWidth / 2
      - Math.max(1.5, ballRadius * .18);
    return Object.freeze({ ...base, carrierOuterRadius,
      carrierInnerRadius: base.casingRadius * .3 * BOARD_ARCHITECTURE_LINE_SCALE,
      inletOpening: base.id === 'small-drum' ? transferOpening
        : Math.max(108, ballRadius * 6 + 16),
      throatOpening: transferOpening,
      ballRadius,
    });
  }));
}
export const BOARD_DRUMS = createBoardDrumSpecs();

export function drumRadialClearance(spec) {
  return spec.casingRadius - spec.casingWidth / 2 - spec.carrierOuterRadius;
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function point(cx, cy, radius, angle) {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}

/** Shared capsule centre lines. Rendering and both physics backends consume
 * these endpoints, including the rounded tip's full radius. */
export function drumVaneSegments(spec) {
  const [cx, cy] = spec.centre;
  const halfWidth = spec.vaneWidth / 2;
  return Array.from({ length: spec.compartmentCount }, (_, index) => {
    const angle = -Math.PI / 2 + index * FULL_TURN / spec.compartmentCount;
    return { start: point(cx, cy, spec.carrierInnerRadius - halfWidth, angle),
      end: point(cx, cy, spec.carrierOuterRadius - halfWidth, angle) };
  });
}

function sampledArc(cx, cy, radius, start, end, steps = 40) {
  const commands = [];
  for (let index = 0; index <= steps; index += 1) {
    const angle = start + (end - start) * index / steps;
    const [x, y] = point(cx, cy, radius, angle);
    commands.push(`${index ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return commands.join(' ');
}

function casingArcs(spec) {
  // Add one stroke width to the centreline gap so the rounded caps still
  // leave the requested clear opening. Art and colliders share these arcs.
  const inletGap = Math.asin((spec.inletOpening + spec.casingWidth)
    / (2 * spec.casingRadius));
  const outletGap = Math.asin((spec.throatOpening + spec.casingWidth)
    / (2 * spec.casingRadius));
  return [[-Math.PI / 2 + inletGap, Math.PI / 2 - outletGap],
    [Math.PI / 2 + outletGap, Math.PI * 1.5 - inletGap]];
}

function casingPath(spec) {
  const [cx, cy] = spec.centre;
  return casingArcs(spec).map(([start, end]) =>
    sampledArc(cx, cy, spec.casingRadius, start, end)).join(' ');
}

export function drumPortEdges(spec) {
  const [cx, cy] = spec.centre;
  const inletHalf = (spec.inletOpening + spec.casingWidth) / 2;
  const outletHalf = (spec.throatOpening + spec.casingWidth) / 2;
  const inletY = cy - Math.sqrt(spec.casingRadius ** 2 - inletHalf ** 2);
  const outletY = cy + Math.sqrt(spec.casingRadius ** 2 - outletHalf ** 2);
  return { inlet: [[cx - inletHalf, inletY], [cx + inletHalf, inletY]],
    outlet: [[cx - outletHalf, outletY], [cx + outletHalf, outletY]] };
}

function guideLines(spec) {
  const [cx, cy] = spec.centre;
  const centreHalfGap = (spec.throatOpening + spec.casingWidth) / 2;
  const outerHalfGap = centreHalfGap + 8;
  const radius = spec.casingRadius;
  const length = spec.throatLength;
  const outletY = cy + Math.sqrt(radius * radius - centreHalfGap * centreHalfGap);
  // The receiver meets the large inlet directly; one shared canal joins its
  // outlet to the small inlet. Separate throat stubs created the old kinks.
  if (spec.id === 'large-drum') return [];
  return [
    [[cx - centreHalfGap, outletY], [cx - outerHalfGap, cy + radius + length]],
    [[cx + centreHalfGap, outletY], [cx + outerHalfGap, cy + radius + length]],
  ];
}

function createDrumArt(spec) {
  const [cx, cy] = spec.centre;
  const root = svgElement('g', {
    id: `runtime-${spec.id}`,
    class: 'about-board-drum',
    'data-board-text-keepout': 'true',
  });
  const casing = svgElement('path', {
    d: casingPath(spec),
    class: 'about-board-drum__casing',
    fill: 'none',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': spec.casingWidth,
  });
  root.append(casing);
  for (const [start, end] of guideLines(spec)) {
    root.append(svgElement('line', {
      x1: start[0], y1: start[1], x2: end[0], y2: end[1],
      class: 'about-board-drum__casing',
      'stroke-linecap': 'round',
      'stroke-width': spec.casingWidth,
    }));
  }
  const carrier = svgElement('g', {
    id: `runtime-${spec.id}-carrier`,
    class: 'about-board-drum__carrier',
  });
  for (const [index, { start, end }] of drumVaneSegments(spec).entries()) {
    carrier.append(svgElement('path', {
      id: `runtime-${spec.id}-compartment-${index + 1}`,
      d: `M${start.join(' ')}L${end.join(' ')}`,
      fill: 'none', stroke: 'var(--about-architecture-action)',
      'stroke-width': spec.vaneWidth, 'stroke-linecap': 'round',
    }));
  }
  // The solid centre masks the roots of the white compartment paddles.
  carrier.append(svgElement('circle', { cx, cy, r: spec.carrierInnerRadius }));
  root.append(carrier);
  root.append(svgElement('circle', {
    cx, cy, r: 8, class: 'about-board-drum__hub',
  }));
  return { root, carrier };
}

/** Replace the generated annular artwork only at runtime. The reviewed Figma
 * SVG remains byte-for-byte unchanged and can still be resynchronised. */
export function installBoardDrumArt(svg, { ballRadius = 13 } = {}) {
  const specs = createBoardDrumSpecs(ballRadius);
  const geometry = svg.querySelector('#Geometry');
  if (!geometry) return { dispose: () => {} };
  const hidden = [];
  const carriers = new Map();
  for (const spec of specs) {
    for (const id of [spec.sourceId, ...spec.legacyVanes]) {
      const element = svg.querySelector(`#${id}`);
      if (!element) continue;
      hidden.push([element, element.getAttribute('display')]);
      element.setAttribute('display', 'none');
    }
    const art = createDrumArt(spec);
    geometry.append(art.root);
    carriers.set(spec.id, art.carrier);
  }
  return {
    specs,
    dispose() {
      for (const carrier of carriers.values()) carrier.closest('.about-board-drum')?.remove();
      for (const [element, display] of hidden) {
        if (display === null) element.removeAttribute('display');
        else element.setAttribute('display', display);
      }
    },
  };
}

function segmentBody(start, end, width, label) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  return Bodies.rectangle((start[0] + end[0]) / 2, (start[1] + end[1]) / 2,
    Math.hypot(dx, dy) + 2, width, {
      isStatic: true,
      angle: Math.atan2(dy, dx),
      ...reboundMaterial('zero'),
      label,
    });
}

function casingBodies(spec) {
  const [cx, cy] = spec.centre;
  const bodies = [];
  const count = 40;
  for (const [start, end] of casingArcs(spec)) {
    for (let index = 0; index < count; index += 1) {
      bodies.push(segmentBody(point(cx, cy, spec.casingRadius, start + (end - start) * index / count),
        point(cx, cy, spec.casingRadius, start + (end - start) * (index + 1) / count),
        spec.casingWidth, `${spec.id}-casing`));
    }
    for (const angle of [start, end]) {
      const [x, y] = point(cx, cy, spec.casingRadius, angle);
      bodies.push(Bodies.circle(x, y, spec.casingWidth / 2, {
        isStatic: true, ...reboundMaterial('zero'), label: `${spec.id}-casing`,
      }));
    }
  }
  for (const [start, end] of guideLines(spec)) {
    bodies.push(segmentBody(start, end, spec.casingWidth, `${spec.id}-throat`));
  }
  return bodies;
}

function carrierBody(spec) {
  const label = `${spec.id}-carrier`;
  const parts = [Bodies.circle(...spec.centre, spec.carrierInnerRadius, {
    isStatic: true, ...reboundMaterial('zero'), label,
  }, 48)];
  for (const { start, end } of drumVaneSegments(spec)) {
    parts.push(segmentBody(start, end, spec.vaneWidth, label));
    parts.push(Bodies.circle(...end, spec.vaneWidth / 2, {
      isStatic: true, ...reboundMaterial('zero'), label,
    }));
  }
  const body = Body.create({ parts, isStatic: true,
    ...reboundMaterial('zero'), label: `${spec.id}-carrier` });
  Body.setPosition(body, { x: spec.centre[0], y: spec.centre[1] });
  return body;
}

export function createBoardDrumPhysics(art) {
  const specs = art?.specs || BOARD_DRUMS;
  const fixedBodies = [];
  const carriers = [];
  for (const spec of specs) {
    fixedBodies.push(...casingBodies(spec));
    carriers.push({ spec, body: carrierBody(spec), angle: 0 });
  }
  return {
    fixedBodies,
    carrierBodies: carriers.map(carrier => carrier.body),
    fixtureCount: fixedBodies.length + carriers.length,
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
