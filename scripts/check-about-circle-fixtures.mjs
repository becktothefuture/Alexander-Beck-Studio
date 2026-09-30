import assert from 'node:assert/strict';
import Matter from '../react-app/app/node_modules/matter-js/build/matter.js';
import {
  circleFixtureSeparation,
  createBoardCircleFixtureContacts,
} from '../react-app/app/src/routes/about-game-board/boardCircleFixtureContacts.js';

const { Bodies } = Matter;
const result = { nx: 0, ny: 0, distance: 0 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7,
  `${actual} must equal ${expected}`);
const square = Bodies.rectangle(0, 0, 10, 10, { isStatic: true });
circleFixtureSeparation({ x: 10, y: 10, radius: 5 }, square, result);
close(result.distance, Math.sqrt(50) - 5);
close(result.nx, Math.SQRT1_2);
close(result.ny, Math.SQRT1_2);
circleFixtureSeparation({ x: 0, y: -3, radius: 3 }, square, result);
close(result.distance, -5);
close(result.ny, -1);

const diagonal = Bodies.rectangle(80, 40, 80, 12, { isStatic: true, angle: Math.PI / 4 });
circleFixtureSeparation({ x: 80 + 12 * Math.SQRT1_2,
  y: 40 - 12 * Math.SQRT1_2, radius: 4 }, diagonal, result);
close(result.distance, 2);
close(result.nx, Math.SQRT1_2);
close(result.ny, -Math.SQRT1_2);

const bumper = Bodies.circle(10, 20, 8, { isStatic: true });
circleFixtureSeparation({ x: 10, y: 36, radius: 5 }, bumper, result);
close(result.distance, 3);
close(result.ny, 1);

// A separated boundary must already be represented before neighbour
// correction can move a ball into it. Native contact pairs alone omit it.
const floor = Bodies.rectangle(0, 10, 100, 20, { isStatic: true });
const circle = { x: 0, y: -7, radius: 5 };
const contacts = createBoardCircleFixtureContacts();
const constraints = contacts.update([circle], [floor]);
assert.equal(constraints.length, 1);
close(constraints[0].ny, -1);
close(constraints[0].offset, 5);
assert.ok(constraints[0].nx * 0 + constraints[0].ny * -3 < constraints[0].offset);
assert.equal(contacts.update([{ x: 0, y: -12.5, radius: 5 }], [floor]).length, 1,
  'predictive reach measures the surface gap, not the distance to the centre');
assert.equal(contacts.update([{ x: 200, y: -7, radius: 5 }], [floor]).length, 0);
console.log('Exact circle / fixture normals, corner clearance and predictive boundaries passed.');
