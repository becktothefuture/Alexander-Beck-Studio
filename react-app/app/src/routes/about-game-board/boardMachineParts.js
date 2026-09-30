// Full-width machine modules share these board coordinates in both viewports.
// Artwork, moving colliders and the editable Figma export use the same parts.
export const BOARD_ROTORS = Object.freeze([
  { id: 'geometry-propeller-0001', pivot: [285, 2635.68], direction: 1 },
  { id: 'geometry-propeller-0002', pivot: [655, 2751.485], direction: -1, flipped: true },
  { id: 'geometry-propeller-0003', pivot: [350, 2964.697], direction: 1 },
]);

export const BOARD_SEESAWS = Object.freeze([
  { id: 'geometry-impact-seesaw-1', pivot: [245, 7980], length: 220, angle: .14 },
  { id: 'geometry-impact-seesaw-2', pivot: [465, 8100], length: 220, angle: .18 },
  { id: 'geometry-impact-seesaw-3', pivot: [755, 8215], length: 210, angle: -.14 },
  { id: 'geometry-impact-seesaw-4', pivot: [490, 8320], length: 220, angle: -.16 },
  { id: 'geometry-impact-seesaw-5', pivot: [205, 8435], length: 210, angle: .12 },
  { id: 'geometry-impact-seesaw-6', pivot: [695, 8520], length: 220, angle: -.13 },
  { id: 'geometry-impact-seesaw-7', pivot: [390, 8635], length: 220, angle: .16 },
  { id: 'geometry-impact-seesaw-8', pivot: [780, 8750], length: 220, angle: -.12 },
]);

export const BOARD_PINBALL_BUMPERS = Object.freeze([
  [225, 3390], [735, 3390],
  [120, 3560], [480, 3560], [840, 3560],
  [285, 3730], [675, 3730],
  [150, 3900], [810, 3900],
]);

// Local module coordinates transcribed from the shared Figma masters (81:2).
// Upper circles retain their small overlapping lower face; the lower rows
// are single circles. These same visible nodes supply the physical fixtures.
export const BOARD_GARDEN = Object.freeze({
  radius: 22.43135,
  top: {
    columns: [115.5808, 206.0058, 297.7905, 388.8949, 480, 571.1049, 662.2097, 753.3149, 844.4194],
    rows: [70.3203, 180.845, 291.6665, 402.4881, 513.3096],
    faceOffset: 1.35945,
  },
  lower: { columns: Array.from({ length: 9 }, (_, i) => 116 + i * 91),
    rows: [40, 151, 262, 373], faceOffset: 0 },
  exitRamp: { x: 102, y: 550 },
});

// Source anchors stay stable for the authored SVG and moving mechanisms.
// Edited modules can grow beyond their original source interval: placement
// uses these heights and explicit module membership, never a leaf's Y range.
export const BOARD_MODULE_HEIGHTS = Object.freeze([
  370, 580.989233, 682, 599.017019, 670, 210, 1550, 900, 1190, 1141.4,
]);

export const BOARD_DIRECTION_RAMPS = Object.freeze(Array.from({ length: 6 }, (_, index) => {
  const left = index % 2 === 0;
  const y = 9372.04 + index * 220;
  return { id: `direction-ramp-${index + 1}`, start: [left ? -6 : 966, y],
    end: [left ? 544 : 416, y + 50] };
}));

// An impact changes angular velocity; a weak centring spring and damping
// let each smaller beam yield and settle independently. Values are radians/s.
export function stepBoardSeesaw(part, seconds) {
  const displacement = part.angle - part.baseAngle;
  part.angularVelocity += -displacement * 5 * seconds;
  part.angularVelocity *= Math.exp(-2.8 * seconds);
  const next = part.angle + part.angularVelocity * seconds;
  const limited = Math.max(part.baseAngle - .48, Math.min(part.baseAngle + .48, next));
  if (limited !== next) part.angularVelocity *= -.2;
  return limited;
}

export function strikeBoardSeesaw(part, ball) {
  const lever = Math.max(-1, Math.min(1, (ball.position.x - part.pivot[0]) / (part.length / 2)));
  const speed = Math.max(1, Math.abs(ball.velocity.y));
  part.angularVelocity = Math.max(-2.4, Math.min(2.4,
    part.angularVelocity + lever * Math.min(.75, speed * .055)));
}

/** Stable module boundaries also drive native, editable Figma components. */
export const BOARD_MACHINE_MODULES = Object.freeze([
  ['01 Funnel and scroll valve', 800, 1170, '#reservoir-left-floor, #reservoir-right-floor, #geometry-fixture-0001'],
  ['02 Bumper garden top', 1340, 1700, '[id^="geometry-bumper-00"]'],
  ['03 Bumper garden lower and ramp', 1760, 2220, '[id^="geometry-bumper-lower-"], #Vector_140'],
  ['04 Three rotors', 2490, 3180, '[id^="geometry-propeller-"]'],
  ['05 Nine pinball bumpers', 3310, 3780, '#geometry-pinball-playfield'],
  ['06 Assembly gate', 4970, 5180, '#Vector_152, #Vector_153, #geometry-fixture-0004'],
  ['07 Connected compartment drums', 6320, 7870, '#Vector_156, #Vector_157, #runtime-large-drum, #runtime-small-drum, #drum-transfer-left, #drum-transfer-right'],
  ['08 Impact chamber', 7910, 8810, '[id^="geometry-impact-seesaw-"]'],
  ['09 Alternating direction ramps', 9360, 9910, '[id^="direction-ramp-"]'],
  ['10 Socket grid', 10000, 11140, '.about-board-socket--flat'],
]);
