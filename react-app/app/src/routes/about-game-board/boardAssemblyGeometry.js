// The shared gate-and-drum master, Figma 250:47679. Values read from its
// 1412px native nodes are converted to the board's 960-unit coordinates.
const WIDTH = 960;
const FIGMA_SCALE = WIDTH / 1412;
const units = value => value * FIGMA_SCALE;
const point = (x, y) => [units(x), units(y)];
const TAU = Math.PI * 2;
const ARC_STEP = Math.PI / 30;

export const BOARD_ASSEMBLY_HEIGHT = units(3382);
export const BOARD_ASSEMBLY_CHANNEL_WIDTH = units(150);

const RECEIVER = {
  left: point(343.533, 641.085),
  right: point(1076.944, 641.085),
  radius: units(265.379),
};

const WHEELS = [
  {
    id: 'large-drum', centre: point(1016.3457, 1737.045), casingCentre: point(1004.5796, 1737.045),
    casingRadius: units(366.2231), compartmentCount: 6, speed: .00084,
    hubRadius: units(36.624), paddleReach: units(351.267 + 7),
  },
  {
    id: 'small-drum', centre: point(401.325, 2707.796), casingCentre: point(401.325, 2707.796),
    // The inlet and outlet are both on the right. This rotation carries
    // balls down the casing towards the outlet, with gravity.
    casingRadius: units(243.5923), compartmentCount: 4, speed: .00092,
    hubRadius: units(33.829), paddleReach: units(227.695 + 7),
  },
];

const add = (a, b, scale = 1) => [a[0] + b[0] * scale, a[1] + b[1] * scale];
const subtract = (a, b) => add(a, b, -1);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const rightNormal = ([x, y]) => [y, -x];

function direction(a, b) {
  const [x, y] = subtract(b, a);
  const length = Math.hypot(x, y);
  return [x / length, y / length];
}

function arcPoints(centre, radius, start, turn) {
  const count = Math.max(1, Math.ceil(Math.abs(turn) / ARC_STEP));
  return Array.from({ length: count + 1 }, (_, i) => {
    const angle = start + turn * i / count;
    return add(centre, [Math.cos(angle), Math.sin(angle)], radius);
  });
}

function circleSide(centre, radius, start, end, side) {
  const startAngle = Math.atan2(start[1] - centre[1], start[0] - centre[0]);
  const endAngle = Math.atan2(end[1] - centre[1], end[0] - centre[0]);
  const turn = side * ((side * (endAngle - startAngle) + TAU) % TAU);
  const points = arcPoints(centre, radius, startAngle, turn);
  points[0] = start;
  points[points.length - 1] = end;
  return points;
}

function circleIntersection(inside, outside, wheel) {
  const tangent = direction(inside, outside);
  const offset = subtract(inside, wheel.casingCentre);
  const along = dot(offset, tangent);
  const radialDistance = wheel.casingRadius ** 2 - cross(offset, tangent) ** 2;
  return add(inside, tangent, Math.sqrt(radialDistance) - along);
}

// Offset the diagonal and vertical runs at their true normal width. Round the
// outside of each turn while keeping the inside edge on both offset lines.
function canalSide(centreline, halfWidth, side, fromWheel, toWheel) {
  const tangents = centreline.slice(1).map((p, i) => direction(centreline[i], p));
  const normals = tangents.map(rightNormal);
  const offset = side * halfWidth;
  const points = [add(centreline[0], normals[0], offset)];
  for (let i = 1; i < centreline.length - 1; i += 1) {
    const before = normals[i - 1];
    const after = normals[i];
    const turn = cross(before, after);
    const alignment = dot(before, after);
    if (side * turn > 0) {
      const start = Math.atan2(side * before[1], side * before[0]);
      points.push(...arcPoints(centreline[i], halfWidth, start, Math.atan2(turn, alignment)));
    } else {
      points.push(add(centreline[i], add(before, after), offset / (1 + alignment)));
    }
  }
  points.push(add(centreline.at(-1), normals.at(-1), offset));
  if (fromWheel) points[0] = circleIntersection(points[0], points[1], fromWheel);
  if (toWheel) {
    points[points.length - 1] = circleIntersection(points.at(-1), points.at(-2), toWheel);
  }
  return points;
}

function receiverSide(inlet, outlet, side) {
  const cap = side < 0 ? RECEIVER.left : RECEIVER.right;
  // The drawn capsule had level shelves on either side of the outlet. Match
  // each rounded cap to a shallow grade that gives settled balls a downhill path.
  const grade = .075;
  const gradeAngle = Math.atan(grade);
  const curve = arcPoints(cap, RECEIVER.radius, -Math.PI / 2, side * (Math.PI - gradeAngle));
  const floorStart = curve.at(-1);
  const floorEnd = [outlet[0], floorStart[1] + Math.abs(outlet[0] - floorStart[0]) * grade];
  return [inlet, ...curve, floorEnd, outlet];
}

function wheelSpec(authored, ballRadius, clearWidth) {
  const casingWidth = 6;
  const vaneWidth = units(14);
  const pivotOffset = Math.hypot(...subtract(authored.centre, authored.casingCentre));
  const casingRadius = Math.max(authored.casingRadius, clearWidth * .95);
  const carrierOuterRadius = Math.min(authored.paddleReach + casingRadius - authored.casingRadius,
    casingRadius - pivotOffset - Math.max(1.5, ballRadius * .18));
  return {
    id: authored.id, centre: [...authored.centre], casingCentre: [...authored.casingCentre],
    compartmentCount: authored.compartmentCount,
    // Each pocket carries fewer of the larger board-space balls. Index the
    // wider channel's carriers faster to maintain its discharge rate.
    speed: authored.speed * (clearWidth > BOARD_ASSEMBLY_CHANNEL_WIDTH ? 1.55 : 1),
    casingRadius, casingWidth, vaneWidth, carrierOuterRadius,
    carrierInnerRadius: authored.hubRadius, pinRadius: units(11.7667),
    inletOpening: clearWidth, throatOpening: clearWidth, throatLength: 48, ballRadius,
  };
}

function gateSpec(halfWidth, ballRadius) {
  const width = units(14);
  const pivotRadius = units(21.930);
  const inset = Math.max(units(.625), pivotRadius - (2 * halfWidth - 4 * ballRadius) / 2);
  const pivot = [WIDTH / 2 - halfWidth - inset, units(250.139)];
  const end = [WIDTH / 2 + halfWidth + width / 2, units(229.547)];
  return {
    id: 'runtime-assembly-gate', pivot, end, width, pivotRadius, pinRadius: units(6.1775),
    openAngle: Math.PI / 2 - Math.atan2(end[1] - pivot[1], end[0] - pivot[0]),
  };
}

function outletCanal(small, halfWidth) {
  const elbow = point(709.565, 3016.1);
  const tangent = direction([0, 0], [1, .4083]);
  const normal = rightNormal(tangent);
  const authoredOffset = dot(subtract(elbow, small.casingCentre), normal);
  // The original strip nearly grazes the small wheel on one side. Move its
  // approach inward enough for both exposed rails to meet the wheel wall.
  const offset = Math.max(authoredOffset, -small.casingRadius + halfWidth + 10);
  elbow[1] += (offset - authoredOffset) / normal[1];
  const start = add(small.casingCentre, normal, offset);
  return [start, elbow, [elbow[0], units(3130.928) + halfWidth * (224.938 / 706)]];
}

function geometrySide(side, halfWidth, gateHalfWidth, large, small, canals) {
  const feed = canalSide(canals.feed, halfWidth, side, null, large);
  const transfer = canalSide(canals.transfer, halfWidth, side, large, small);
  const exit = canalSide(canals.exit, halfWidth, side, small, null);
  const outerX = side < 0 ? 0 : WIDTH;
  const gateX = WIDTH / 2 + side * gateHalfWidth;
  const receiverTop = [gateX, RECEIVER.left[1] - RECEIVER.radius];
  return {
    id: `assembly-channel-${side < 0 ? 'left' : 'right'}`,
    side: side < 0 ? 'left' : 'right',
    wheelPorts: [[feed.at(-1), transfer[0]], [transfer.at(-1), exit[0]]],
    points: [
      [outerX, units(20.689)], [gateX, units(228.076)],
      ...receiverSide(receiverTop, feed[0], side), ...feed.slice(1),
      ...circleSide(large.casingCentre, large.casingRadius, feed.at(-1), transfer[0], side).slice(1),
      ...transfer.slice(1),
      ...circleSide(small.casingCentre, small.casingRadius, transfer.at(-1), exit[0], side).slice(1),
      ...exit.slice(1), [outerX, units(3355.867)],
    ],
  };
}

function channelPath(rails) {
  const [left, right] = rails.map(rail => rail.points);
  const outline = [...left, ...right.toReversed()];
  return outline.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + ' Z';
}

/** One local coordinate model for the painted void and its exposed contacts.
 * The top and bottom edges close the SVG fill only. They are not colliders. */
export function createBoardAssemblyGeometry(ballRadius = 13) {
  if (!Number.isFinite(ballRadius) || ballRadius <= 0) {
    throw new RangeError('Assembly ball radius must be positive and finite.');
  }
  const clearWidth = Math.max(BOARD_ASSEMBLY_CHANNEL_WIDTH, 4 * ballRadius + 12);
  const halfWidth = clearWidth / 2;
  // The reservoir feeds a dense pile into the meter. Give its throat more
  // room at large radii while the downhill channels keep their design width.
  const gateHalfWidth = Math.max(clearWidth, 5 * ballRadius + 12) / 2;
  const wheels = WHEELS.map(wheel => wheelSpec(wheel, ballRadius, clearWidth));
  const [large, small] = wheels;
  const canals = {
    feed: [point(706, 940), point(706, 1112), point(1008.818, 1229),
      [units(1008.818), large.casingCentre[1]]],
    transfer: [large.centre, point(1016.346, 2476),
      [small.centre[0], units(2727)]],
    exit: outletCanal(small, halfWidth),
  };
  const sides = [-1, 1].map(side => geometrySide(side, halfWidth, gateHalfWidth, large, small, canals));
  const rails = sides.map(({ id, side, points }) => ({ id, side, points }));
  const placedWheels = wheels.map((wheel, index) => ({
    ...wheel,
    inlet: sides.map(side => side.wheelPorts[index][0]),
    outlet: sides.map(side => side.wheelPorts[index][1]),
  }));
  return {
    height: BOARD_ASSEMBLY_HEIGHT,
    casing: { top: units(20.689), bottom: units(3355.867) },
    clearWidth,
    rails,
    channelPath: channelPath(rails),
    gate: gateSpec(gateHalfWidth, ballRadius),
    receiverObstacle: { centre: point(706, 641.086), radius: units(61.775) },
    wheels: placedWheels,
    inlet: rails.map(rail => rail.points[0]),
    outlet: rails.map(rail => rail.points.at(-1)),
  };
}
