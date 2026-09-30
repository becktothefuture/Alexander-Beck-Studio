import assert from 'node:assert/strict';
import Matter from '../react-app/app/node_modules/matter-js/build/matter.js';
import {
  BOARD_WORLD_PHYSICS,
  installBoardWakeSafety,
  stepBoardWorld,
} from '../react-app/app/src/routes/about-game-board/boardDynamics.js';
import {
  boardMicroStepIterationBudget,
  boardDetectorCollisions,
  createBoardAdaptiveNeighbourSearch,
  createBoardFixtureBoundsSearch,
  updateBoardEngine,
} from '../react-app/app/src/routes/about-game-board/boardPhysicsPerformance.js';

const { Bodies, Body, Composite, Engine, Events } = Matter;
const STEP_MS = BOARD_WORLD_PHYSICS.fixedStepMs;
const BASE_DELTA_MS = 1000 / 60;

assert.deepEqual(boardDetectorCollisions(Matter.Detector.create({ bodies: [] })), [],
  'an empty route world must remain a valid detector input');

let randomState = 0x9e3779b9;
function random() {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 0x100000000;
}

// Fixture lookup indexes full bounds rather than centres, so a long rail is
// still returned at both ends and duplicate cell membership remains invisible.
const fixtureSearch = createBoardFixtureBoundsSearch(32);
const fixtures = [
  Bodies.rectangle(480, 20, 920, 12, { isStatic: true }),
  Bodies.rectangle(40, 900, 12, 1700, { isStatic: true }),
  Bodies.circle(720, 600, 28, { isStatic: true }),
];
fixtureSearch.rebuild(fixtures);
for (const bounds of [
  { minX: 25, minY: 12, maxX: 60, maxY: 28 },
  { minX: 880, minY: 12, maxX: 940, maxY: 28 },
  { minX: 25, minY: 1500, maxX: 55, maxY: 1550 },
  { minX: 680, minY: 560, maxX: 760, maxY: 640 },
]) {
  const expected = fixtures.filter(fixture => fixture.bounds.max.x >= bounds.minX
    && fixture.bounds.min.x <= bounds.maxX && fixture.bounds.max.y >= bounds.minY
    && fixture.bounds.min.y <= bounds.maxY);
  assert.deepEqual(new Set(fixtureSearch.query(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)),
    new Set(expected), 'indexed fixture bounds must match brute-force overlap');
}

// Small Matter circles are ten-sided polygons. A horizontal contact can be
// invisible to the stock polygon bounds even though the visible circles touch.
const circleA = Bodies.circle(0, 0, 6.6, { plugin: { boardId: 'exact-a' } });
const circleB = Bodies.circle(13.1, 0, 6.6, { plugin: { boardId: 'exact-b' } });
const stockDetector = Matter.Detector.create({ bodies: [circleA, circleB] });
const exactDetector = Matter.Detector.create({ bodies: [circleA, circleB] });
assert.equal(Matter.Detector.collisions(stockDetector).length, 0,
  'fixture proves the stock inscribed polygon contact gap');
const exactContacts = boardDetectorCollisions(exactDetector);
assert.equal(exactContacts.length, 1, 'visible circles must collide at their true radii');
assert.ok(Math.abs(exactContacts[0].depth - .1) < 1e-8);
assert.equal(exactContacts[0].supportCount, 1);
assert.ok(exactContacts[0].supports[0]._boardCircleSupport);

// Sleeping bodies never need contacts with other sleeping/static bodies, but
// they must remain visible to any awake neighbour regardless of X-sort order.
const sleepingFirst = Bodies.circle(0, 40, 5, { plugin: { boardId: 'sleeping-first' } });
const activeSecond = Bodies.circle(9, 40, 5, { plugin: { boardId: 'active-second' } });
const activeFirst = Bodies.circle(100, 40, 5, { plugin: { boardId: 'active-first' } });
const sleepingSecond = Bodies.circle(109, 40, 5, { plugin: { boardId: 'sleeping-second' } });
const sleepingPairA = Bodies.circle(200, 40, 5, { plugin: { boardId: 'sleeping-pair-a' } });
const sleepingPairB = Bodies.circle(209, 40, 5, { plugin: { boardId: 'sleeping-pair-b' } });
for (const body of [sleepingFirst, sleepingSecond, sleepingPairA, sleepingPairB]) {
  Matter.Sleeping.set(body, true);
}
const sleepFilteredContacts = boardDetectorCollisions(Matter.Detector.create({
  bodies: [sleepingFirst, activeSecond, activeFirst, sleepingSecond, sleepingPairA, sleepingPairB],
}));
assert.equal(sleepFilteredContacts.length, 2,
  'the active-only sleeping-body query must keep both active/sleeping sort orders');
assert.ok(sleepFilteredContacts.every(contact => (
  !contact.bodyA.isSleeping || !contact.bodyB.isSleeping
)), 'sleeping/sleeping pairs must not enter the narrow phase');

// Non-circle architecture continues through Matter's normal SAT path.
const rail = Bodies.rectangle(0, 11, 100, 10, { isStatic: true });
const architectureBall = Bodies.circle(0, 4.5, 5);
const stockArchitecture = Matter.Detector.collisions(Matter.Detector.create({
  bodies: [rail, architectureBall],
}));
const boardArchitecture = boardDetectorCollisions(Matter.Detector.create({
  bodies: [rail, architectureBall],
}));
assert.equal(boardArchitecture.length, stockArchitecture.length);
assert.ok(Math.abs(boardArchitecture[0].depth - stockArchitecture[0].depth) < 1e-10);
assert.equal(boardArchitecture[0].supportCount, stockArchitecture[0].supportCount);

const detectorFunction = Matter.Detector.collisions;
const detectorEngine = Engine.create();
Composite.add(detectorEngine.world, [Bodies.circle(0, 0, 8), Bodies.circle(12, 0, 8)]);
updateBoardEngine(detectorEngine, STEP_MS);
assert.equal(Matter.Detector.collisions, detectorFunction,
  'route detector installation must be restored after the synchronous update');

function brutePotentialContact(body, bodies, bounds, stepMs) {
  for (const other of bodies) {
    if (other === body || other.isSensor) continue;
    const otherX = (other.velocity?.x || 0) * stepMs / BASE_DELTA_MS;
    const otherY = (other.velocity?.y || 0) * stepMs / BASE_DELTA_MS;
    if (other.bounds.max.x + Math.max(0, otherX) >= bounds.minX
      && other.bounds.min.x + Math.min(0, otherX) <= bounds.maxX
      && other.bounds.max.y + Math.max(0, otherY) >= bounds.minY
      && other.bounds.min.y + Math.min(0, otherY) <= bounds.maxY) return true;
  }
  return false;
}

// The indexed broad phase must remain equivalent to the former all-pairs
// swept-bounds check, including neighbours entering from every direction.
const searchBodies = Array.from({ length: 900 }, (_, index) => {
  const body = Bodies.circle(random() * 960, random() * 1800, 4 + random() * 7, {
    isSensor: index % 127 === 0,
  });
  Body.setVelocity(body, { x: (random() - .5) * 48, y: (random() - .5) * 48 });
  return body;
});
const search = createBoardAdaptiveNeighbourSearch();
search.rebuild(searchBodies, STEP_MS);
for (let index = 0; index < searchBodies.length; index += 17) {
  const body = searchBodies[index];
  const travelX = body.velocity.x * STEP_MS / BASE_DELTA_MS;
  const travelY = body.velocity.y * STEP_MS / BASE_DELTA_MS;
  const padding = body.circleRadius + 2;
  const bounds = {
    minX: body.position.x + Math.min(0, travelX) - padding,
    maxX: body.position.x + Math.max(0, travelX) + padding,
    minY: body.position.y + Math.min(0, travelY) - padding,
    maxY: body.position.y + Math.max(0, travelY) + padding,
  };
  assert.equal(
    search.hasPotentialContact(body, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY),
    brutePotentialContact(body, searchBodies, bounds, STEP_MS),
    `indexed swept contact must match brute force for body ${index}`,
  );
}

const baseIterations = {
  positionIterations: 16,
  velocityIterations: 8,
  constraintIterations: 4,
};
assert.deepEqual(boardMicroStepIterationBudget(baseIterations, 1), baseIterations,
  'a normal fixed step must retain the configured solver quality');
for (const steps of [2, 3, 6, 12, 52]) {
  const budget = boardMicroStepIterationBudget(baseIterations, steps);
  assert.ok(budget.positionIterations * steps >= baseIterations.positionIterations);
  assert.ok(budget.velocityIterations * steps >= baseIterations.velocityIterations);
  assert.ok(budget.constraintIterations * steps >= baseIterations.constraintIterations);
  assert.ok(budget.positionIterations >= 2);
  assert.ok(budget.velocityIterations >= 1);
  assert.ok(budget.constraintIterations >= 1);
}
assert.equal(boardMicroStepIterationBudget(baseIterations, 36).positionIterations, 4,
  'loaded and steady architecture contacts keep additional position convergence');

// A fast ball still receives all twelve collision samples and cannot cross a
// thin wall. The engine configuration must be restored after the bounded step.
const engine = Engine.create({ enableSleeping: true, ...baseIterations });
const fastBall = Bodies.circle(0, 0, 5, { restitution: 0 });
const thinWall = Bodies.rectangle(40, 0, 4, 100, { isStatic: true });
Body.setVelocity(fastBall, { x: 120, y: 0 });
Composite.add(engine.world, [fastBall, thinWall]);
const seenIterations = [];
Events.on(engine, 'beforeUpdate', () => seenIterations.push([
  engine.positionIterations,
  engine.velocityIterations,
  engine.constraintIterations,
]));
const used = stepBoardWorld(engine, [fastBall], STEP_MS, [thinWall]);
assert.equal(used, BOARD_WORLD_PHYSICS.maxAdaptiveMicroSteps);
assert.equal(seenIterations.length, BOARD_WORLD_PHYSICS.maxAdaptiveMicroSteps,
  'iteration budgeting must not remove collision samples');
assert.ok(seenIterations.every(([position, velocity, constraint]) => (
  position >= 2 && velocity >= 1 && constraint >= 1
)));
assert.ok(fastBall.position.x + fastBall.circleRadius < thinWall.bounds.max.x,
  'the high-speed ball must remain on the entry side of the thin wall');
assert.deepEqual({
  positionIterations: engine.positionIterations,
  velocityIterations: engine.velocityIterations,
  constraintIterations: engine.constraintIterations,
}, baseIterations, 'temporary iteration budgets must never leak into the world');
assert.equal(engine.gravity.y * engine.gravity.scale,
  BOARD_WORLD_PHYSICS.gravity.y * BOARD_WORLD_PHYSICS.gravity.scale,
  'performance work must preserve the Earth-gravity contract');

// A true-circle hex pack should begin as a supported condition rather than
// collapsing through the stock polygon gaps and triggering global substeps.
const packedEngine = Engine.create({ enableSleeping: true, ...baseIterations });
const packedRadius = 6.6;
const packedColumns = 20;
const packedRows = 12;
const chamberWidth = packedColumns * packedRadius * 2 + 30;
const packedFixtures = [
  Bodies.rectangle(0, 300, chamberWidth, 20, { isStatic: true }),
  Bodies.rectangle(-chamberWidth / 2 + 5, 150, 10, 300, { isStatic: true }),
  Bodies.rectangle(chamberWidth / 2 - 5, 150, 10, 300, { isStatic: true }),
];
const packedBalls = [];
const packedLeft = -((packedColumns - 1) * packedRadius * 2 + packedRadius) / 2;
for (let row = 0; row < packedRows; row += 1) for (let column = 0; column < packedColumns;
  column += 1) {
  packedBalls.push(Bodies.circle(
    packedLeft + column * packedRadius * 2 + (row % 2) * packedRadius,
    290 - packedRadius - row * Math.sqrt(3) * packedRadius,
    packedRadius,
    { restitution: 0, friction: .08, frictionAir: .0006,
      plugin: { boardId: `packed-${row}-${column}` } },
  ));
}
Composite.add(packedEngine.world, [...packedFixtures, ...packedBalls]);
const packedStart = packedBalls.map(ball => ball.position.y);
let packedMaximumMicroSteps = 1;
for (let step = 0; step < 90; step += 1) {
  packedMaximumMicroSteps = Math.max(packedMaximumMicroSteps,
    stepBoardWorld(packedEngine, packedBalls, STEP_MS, packedFixtures));
}
assert.equal(packedMaximumMicroSteps, 1,
  'a supported cold pack must not manufacture a global high-speed substep storm');
assert.ok(Math.max(...packedBalls.map((ball, index) => ball.position.y - packedStart[index])) < 5,
  'true-circle support must prevent bulk polygon-gap collapse');
assert.ok(Math.max(...packedBalls.map(ball => ball.speed)) < .02,
  'the closed pack must remain materially at rest under Earth gravity');

// Moving a local support must wake enough contact depth for loaded balls to
// yield, without converting a whole still-supported reservoir into one island.
const wakeEngine = Engine.create({ enableSleeping: true, ...baseIterations });
const wakeGate = Bodies.rectangle(-10, 0, 8, 8, { isStatic: true });
const wakeBalls = Array.from({ length: 6 }, (_, index) => Bodies.circle(index * 9.9, 0, 5, {
  plugin: { boardId: `wake-${index}` },
}));
Composite.add(wakeEngine.world, [wakeGate, ...wakeBalls]);
stepBoardWorld(wakeEngine, wakeBalls, STEP_MS, [wakeGate]);
for (const ball of wakeBalls) Matter.Sleeping.set(ball, true);
const disposeWake = installBoardWakeSafety(wakeEngine, wakeBalls, [wakeGate]);
Body.setPosition(wakeGate, { x: -8, y: 0 });
let wakeState = null;
const recordWakeState = () => { wakeState = wakeBalls.map(ball => ball.isSleeping); };
Events.on(wakeEngine, 'beforeUpdate', recordWakeState);
updateBoardEngine(wakeEngine, STEP_MS);
Events.off(wakeEngine, 'beforeUpdate', recordWakeState);
disposeWake();
assert.deepEqual(wakeState.slice(0, 3), [false, false, false],
  'the fixture contact and two loaded neighbour rings must yield immediately');
assert.ok(wakeState.slice(3).every(Boolean),
  'distant supported rows must remain asleep until the physical wake front reaches them');

console.log('About board physics performance checks passed.');
