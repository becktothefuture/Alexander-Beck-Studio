import {
  createSimulationMaterialSequence,
  DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
  resolveSimulationColorDistribution,
  resolveSimulationMaterialColorIndex,
  resolveSimulationPaletteColors,
} from '../../palette/simulationPaletteContract.js';
import { PRODUCT_RECEIVER_LIFT } from './boardPinball.js';
import { BOARD_DIRECTION_RAMPS } from './boardMachineParts.js';
import { BOARD_ARCHITECTURE_LINE_SCALE } from './boardArchitectureWeight.js';

const RESERVOIR_MIX_MIN_Y = 90;
const RESERVOIR_MIX_MAX_Y = 1100;
const BOARD_MIX_SALT = 'about-game-board-reservoir-v2';

/** Figma board coordinates are the common language for art, collisions and text. */
export const BOARD_WIDTH = 960;
export const BOARD_HEIGHT = 14140;
export const RESERVOIR_GATE_Y = 1124;
export const GRID_START_Y = 10030;
// The first complete socket field is the renderer seam. Everything below it
// in the Figma strip is a storyboard of the spatial continuation, rather than
// additional 2D architecture.
export const GRID_END_Y = 11140;
export const BOARD_2D_END_Y = GRID_END_Y;

// Only these paths have a physical rail. The rest of the exact Figma export
// remains artwork until its particular mechanism is modelled explicitly.
export const RAIL_PATH_IDS = Object.freeze([
  'reservoir-left-floor', 'reservoir-right-floor',
  ...BOARD_DIRECTION_RAMPS.map(ramp => ramp.id),
  'Vector_152', 'Vector_153',
  'Vector_156', 'Vector_157',
  'drum-transfer-left', 'drum-transfer-right',
]);

export const MECHANISM = Object.freeze({
  reservoirGate: {
    id: 'geometry-fixture-0001',
    pivot: [447, 1124],
    end: [499, 1100],
    width: 20 * BOARD_ARCHITECTURE_LINE_SCALE,
    pivotRadius: 14.4,
    // Fold back into the left funnel wall. A positive turn leaves the arm
    // across the outlet and creates a shelf that traps the released queue.
    openAngle: -2.2,
  },
  meterGate: { id: 'geometry-fixture-0004', pivot: [349, 5544 - PRODUCT_RECEIVER_LIFT] },
});

/** The six Figma source pigments identify semantic roles, not final colours.
 * Every role resolves through the shared Home palette snapshot so time-of-day
 * and editor distribution changes remain consistent across the site. */
export const BOARD_BALL_SOURCE_ROLES = Object.freeze([
  Object.freeze({ rgb: Object.freeze([223, 232, 224]), roleId: 'product-design' }),
  Object.freeze({ rgb: Object.freeze([0, 108, 91]), roleId: 'experience-design' }),
  Object.freeze({ rgb: Object.freeze([179, 190, 177]), roleId: 'art-direction' }),
  Object.freeze({ rgb: Object.freeze([253, 34, 10]), roleId: 'motion-3d' }),
  Object.freeze({ rgb: Object.freeze([251, 154, 0]), roleId: 'creative-engineering' }),
  Object.freeze({ rgb: Object.freeze([0, 0, 0]), roleId: 'parametric-systems' }),
]);

export function boardBallRoleIndex(rgb) {
  const red = Number(rgb?.[0]);
  const green = Number(rgb?.[1]);
  const blue = Number(rgb?.[2]);
  if (red === 223 && green === 232 && blue === 224) return 0;
  if (red === 0 && green === 108 && blue === 91) return 1;
  if (red === 179 && green === 190 && blue === 177) return 2;
  if (red === 253 && green === 34 && blue === 10) return 3;
  if (red === 251 && green === 154 && blue === 0) return 4;
  if (red === 0 && green === 0 && blue === 0) return 5;
  return 0;
}

function stableMixHash(value) {
  const text = `${BOARD_MIX_SALT}:${value}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function assignRoleMix(group, snapshot, offset, assignments) {
  const ordered = [...group].sort((left, right) => (
    stableMixHash(left.id) - stableMixHash(right.id)
    || String(left.id).localeCompare(String(right.id))
  ));
  const sequence = createSimulationMaterialSequence(ordered.length, { offset }, snapshot);
  const roleIndexById = new Map(BOARD_BALL_SOURCE_ROLES.map((role, index) => [role.roleId, index]));
  ordered.forEach((ball, index) => {
    assignments.set(ball.id, roleIndexById.get(sequence[index]?.roleId) ?? 0);
  });
}

/** Build a deterministic spatial remix while retaining the exact centrally
 * configured role allocation. The opening reservoir is allocated separately,
 * so its visible mix cannot drift when balls elsewhere on the board change. */
export function createBoardBallRoleAssignments(balls, snapshot = {}) {
  const reservoir = [];
  const remainder = [];
  for (const ball of balls) {
    const group = ball.reservoir || (ball.y > RESERVOIR_MIX_MIN_Y && ball.y < RESERVOIR_MIX_MAX_Y)
      ? reservoir : remainder;
    group.push(ball);
  }
  const assignments = new Map();
  assignRoleMix(reservoir, snapshot, 17, assignments);
  assignRoleMix(remainder, snapshot, 43, assignments);
  return assignments;
}

/** Expected input is the shared palette snapshot: { colors, distribution }.
 * A legacy colors array remains accepted while the route integration migrates. */
export function resolveBoardBallRoleColours(snapshot = {}) {
  const colors = resolveSimulationPaletteColors(snapshot.colors || snapshot);
  const distribution = resolveSimulationColorDistribution(
    snapshot.distribution || DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
    colors.length,
  );
  return Object.freeze(BOARD_BALL_SOURCE_ROLES.map(({ roleId }) => (
    colors[resolveSimulationMaterialColorIndex(roleId, { distribution })] || colors[0]
  )));
}

/** Allocation-free hot-path lookup after role colours are resolved once. */
export function ballColourFromRoleColours(ballOrRgb, roleColours, assignments = null) {
  const assignedRole = ballOrRgb && !Array.isArray(ballOrRgb)
    ? assignments?.get(ballOrRgb.id) : undefined;
  const rgb = Array.isArray(ballOrRgb) ? ballOrRgb : ballOrRgb?.rgb;
  return roleColours[assignedRole ?? boardBallRoleIndex(rgb)] || roleColours[0];
}

export function ballColour(rgb, paletteSnapshot) {
  return ballColourFromRoleColours(rgb, resolveBoardBallRoleColours(paletteSnapshot));
}

export function decodeBalls(rows) {
  if (!Array.isArray(rows) || rows.length !== 1869) {
    throw new Error('About board ball source does not match the reviewed Figma capture.');
  }
  return rows.map(([id, x, y, radius, rgb]) => ({
    id, x, y, radius, rgb,
  }));
}
