import { BOARD_ASSEMBLY_HEIGHT } from './boardAssemblyGeometry.js';

// Full-width machine modules share these board coordinates in both viewports.
// Artwork, moving colliders and the editable Figma export use the same parts.
export const FIGMA_TO_BOARD = 960 / 1412;

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

// Centres from the current pinball master (250:47652) at its native width.
export const BOARD_PINBALL_BUMPERS = Object.freeze([
  [419.1871, 123.8307], [992.8121, 123.8307],
  [176.4996, 357.0946], [705.9996, 357.0946], [1235.4996, 357.0946],
  [419.1871, 562.1393], [992.8121, 562.1393], [705.9996, 714.4273],
  [220.6246, 812.1808], [1191.3746, 812.1808],
].map(([x, y]) => [x * FIGMA_TO_BOARD, 3310 + y * FIGMA_TO_BOARD]));

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
  exitRamp: { x: 137.624 * FIGMA_TO_BOARD, y: 692.3083 * FIGMA_TO_BOARD },
});

// Source anchors stay stable for the authored SVG and moving mechanisms.
// Edited modules can grow beyond their original source interval: placement
// uses these heights and explicit module membership, never a leaf's Y range.
// The rendered Figma outline (280:81563) rounds the otherwise triangular tip.
// Sample its single curve once so the filled artwork and collider use the
// same outline in both reflected orientations.
const RAMP_TIP_CURVE = [[654.213, 91.2704], [673.342, 89.0788],
  [673.016, 61.1833], [653.841, 59.4401]];
const RAMP_OUTLINE = [[0, 0], [0, 166.222], ...Array.from({ length: 13 }, (_, index) => {
  const t = index / 12;
  const u = 1 - t;
  const weights = [u ** 3, 3 * u ** 2 * t, 3 * u * t ** 2, t ** 3];
  return [0, 1].map(axis => RAMP_TIP_CURVE.reduce((sum, point, i) => sum + point[axis] * weights[i], 0));
})];

export const BOARD_DIRECTION_RAMPS = Object.freeze(Array.from({ length: 6 }, (_, index) => {
  const left = index % 2 === 0;
  const outerX = left ? (index ? -6 : 0) : 966;
  const y = 9360 + (36.1035 + index * 314.3154) * FIGMA_TO_BOARD;
  const direction = left ? 1 : -1;
  return { id: `direction-ramp-${index + 1}`, vertices: RAMP_OUTLINE.map(
    ([x, localY]) => [outerX + x * direction * FIGMA_TO_BOARD, y + localY * FIGMA_TO_BOARD],
  ) };
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
  { id: 'reservoir', sourceTop: 800, sourceEnd: 1170, height: 340,
    selector: '#reservoir-fill, #reservoir-left-floor, #reservoir-right-floor, #geometry-fixture-0001' },
  { id: 'garden-upper', sourceTop: 1340, sourceEnd: 1700, height: 580.989233,
    selector: '[id^="geometry-bumper-00"]' },
  { id: 'garden-lower', sourceTop: 1760, sourceEnd: 2220, height: 941.6906 * FIGMA_TO_BOARD,
    selector: '[id^="geometry-bumper-lower-"], #Vector_140, #garden-ramp-right' },
  { id: 'rotors', sourceTop: 2490, sourceEnd: 3180, height: 599.017019,
    selector: '[id^="geometry-propeller-"]' },
  { id: 'pinball', sourceTop: 3310, sourceEnd: 3780, height: 960 * FIGMA_TO_BOARD,
    selector: '#geometry-pinball-playfield' },
  { id: 'assembly', sourceTop: 4970, sourceEnd: 7870, height: BOARD_ASSEMBLY_HEIGHT,
    selector: '#runtime-assembly' },
  { id: 'impact', sourceTop: 7910, sourceEnd: 8810, height: 900,
    selector: '[id^="geometry-impact-seesaw-"]' },
  { id: 'direction-ramps', sourceTop: 9360, sourceEnd: 9910, height: 1806 * FIGMA_TO_BOARD,
    selector: '[id^="direction-ramp-"]' },
  { id: 'socket-grid', sourceTop: 10000, sourceEnd: 11140, height: 1141.4,
    selector: '.about-board-socket--flat' },
]);
