import assert from 'node:assert/strict';
import Matter from '../react-app/app/node_modules/matter-js/build/matter.js';
import {
  BOARD_RIGID_BODY_METRE_SCALE,
  createBoardRigidBodyWorld,
  loadBoardRigidBodyBackend,
} from '../react-app/app/src/routes/about-game-board/boardRigidBodyWorld.js';

const { Bodies, Body, Composite, Engine, Events, Sleeping } = Matter;
await loadBoardRigidBodyBackend();

function createHarness(balls = [], fixtures = [], movingFixtures = []) {
  const engine = Engine.create({ enableSleeping: true });
  Composite.add(engine.world, [...fixtures, ...balls]);
  const adapter = createBoardRigidBodyWorld({ engine, balls, fixtures, movingFixtures });
  return { engine, balls, fixtures, adapter,
    dispose() { adapter.dispose(); Engine.clear(engine); } };
}

assert.ok(Math.abs(BOARD_RIGID_BODY_METRE_SCALE * 9.81 - 1000) < 1e-10,
  'Earth gravity must resolve to 1000 board units per second squared');

// Exact circles in the authored pack are tangent at 2r. Native ball contact
// skin must not inflate that distance and release latent compression when the
// pile wakes.
{
  const left = Bodies.circle(0, 0, 6, { frictionAir: 0, plugin: { boardId: 'tangent-left' } });
  const right = Bodies.circle(12, 0, 6, { frictionAir: 0, plugin: { boardId: 'tangent-right' } });
  const harness = createHarness([left, right]);
  for (let index = 0; index < 12; index += 1) harness.adapter.step(harness.adapter.fixedStepMs);
  assert.ok(Math.abs(Math.hypot(right.position.x - left.position.x,
    right.position.y - left.position.y) - 12) < .01,
  'native circle spacing must match the authored and rendered 2r spacing');
  harness.dispose();
}

// A validated cold-pack body enters Rapier asleep and remains bit-for-bit at
// its authored pose until a physical or explicit local wake reaches it.
{
  const ball = Bodies.circle(42, 73, 6, { plugin: { boardId: 'cold' } });
  Sleeping.set(ball, true);
  const start = { x: ball.position.x, y: ball.position.y, angle: ball.angle };
  const harness = createHarness([ball]);
  assert.deepEqual({ x: ball.position.x, y: ball.position.y, angle: ball.angle }, start);
  assert.equal(harness.adapter.getStats().sleeping, 1);
  harness.adapter.step(harness.adapter.fixedStepMs);
  assert.deepEqual({ x: ball.position.x, y: ball.position.y, angle: ball.angle }, start);
  assert.equal(ball.isSleeping, true);
  harness.dispose();
}

// Gravity is integrated at one fixed 60 Hz step and additions/removals follow
// the live arrays without recreating the world.
{
  const first = Bodies.circle(0, 0, 5, { plugin: { boardId: 'gravity-a' } });
  const balls = [first];
  const harness = createHarness(balls);
  harness.adapter.step(harness.adapter.fixedStepMs);
  assert.ok(first.position.y > 0 && first.velocity.y > 0,
    'an unsupported awake ball must accelerate downward');
  const second = Bodies.circle(30, 0, 5, { plugin: { boardId: 'gravity-b' } });
  balls.push(second);
  harness.adapter.step(harness.adapter.fixedStepMs);
  assert.equal(harness.adapter.getStats().dynamic, 2);
  balls.splice(balls.indexOf(first), 1);
  harness.adapter.step(harness.adapter.fixedStepMs);
  const stats = harness.adapter.getStats();
  assert.equal(stats.dynamic, 1);
  assert.equal(stats.additions, 2);
  assert.equal(stats.removals, 1);
  harness.dispose();
}

// Matter remains the material control surface. Mass, damping, friction and
// restitution edits are copied without resetting the body's pose or sleep.
{
  const ball = Bodies.circle(0, 0, 5, { plugin: { boardId: 'material' } });
  const harness = createHarness([ball]);
  const nextMass = ball.mass * 2.5;
  Body.setMass(ball, nextMass);
  ball.friction = .31;
  ball.restitution = .42;
  ball.frictionAir = .015;
  harness.adapter.step(harness.adapter.fixedStepMs);
  const stats = harness.adapter.getStats();
  assert.ok(Math.abs(stats.dynamicMass - nextMass) < 1e-5,
    'Rapier must use the edited Matter mass');
  assert.ok(stats.materialSyncs >= 1);
  harness.dispose();
}

// Sensor and mask-zero bodies remain visible proxies but never obstruct a
// physical ball. The equivalent solid fixture proves the path is meaningful.
for (const mode of ['sensor', 'mask-zero', 'solid']) {
  const ball = Bodies.circle(0, 0, 5, { frictionAir: 0, plugin: { boardId: `probe-${mode}` } });
  Body.setVelocity(ball, { x: 12, y: 0 });
  const barrier = Bodies.rectangle(20, 0, 4, 40, {
    isStatic: true,
    isSensor: mode === 'sensor',
    label: `barrier-${mode}`,
    collisionFilter: mode === 'mask-zero' ? { category: 1, mask: 0, group: 0 } : undefined,
  });
  const harness = createHarness([ball], [barrier]);
  for (let index = 0; index < 4; index += 1) harness.adapter.step(harness.adapter.fixedStepMs);
  if (mode === 'solid') assert.ok(ball.position.x < 20, 'solid architecture must block the ball');
  else assert.ok(ball.position.x > 30, `${mode} architecture must not resolve a contact`);
  harness.dispose();
}

// An explicit local wake reaches a sleeping neighbour through an ordinary
// contact. No global wake or velocity reset is required.
{
  const moving = Bodies.circle(0, 0, 5, { frictionAir: 0, plugin: { boardId: 'wake-moving' } });
  const resting = Bodies.circle(10, 0, 5, { frictionAir: 0, plugin: { boardId: 'wake-resting' } });
  Sleeping.set(moving, true);
  Sleeping.set(resting, true);
  const harness = createHarness([moving, resting]);
  Sleeping.set(moving, false);
  Body.setVelocity(moving, { x: 3, y: 0 });
  harness.adapter.step(harness.adapter.fixedStepMs);
  assert.equal(resting.isSleeping, false, 'a contacted sleeping neighbour must wake naturally');
  harness.dispose();
}

// Scroll-owned valves sweep through explicit poses without inferred motor
// velocity, while still resolving every sampled collider position.
{
  const ball = Bodies.circle(19, 0, 5, { frictionAir: 0, plugin: { boardId: 'valve-ball' } });
  const neighbour = Bodies.circle(29, 0, 5, {
    frictionAir: 0, plugin: { boardId: 'valve-neighbour' },
  });
  const valve = Bodies.rectangle(0, 0, 8, 40, {
    isStatic: true, label: 'meter-gate', restitution: 0,
  });
  // Leave enough physical width for both balls; the safeguard must satisfy a
  // real static constraint, not invent a solution for a sealed cavity.
  const wall = Bodies.rectangle(43, 0, 2, 100, { isStatic: true, label: 'valve-test-wall' });
  const harness = createHarness([ball, neighbour], [valve, wall], [valve]);
  harness.adapter.step(harness.adapter.fixedStepMs, 4, fraction => {
    Body.setPosition(valve, { x: 14 * fraction, y: 0 }, false);
  });
  assert.ok(ball.position.x > 19,
    'a swept zero-velocity valve must displace a ball instead of clipping through it');
  const valveContacts = harness.adapter.getContactSnapshot();
  assert.ok(valveContacts.every(contact => contact.depth < .1),
    'a swept valve chain must finish clear of both the valve and static architecture');
  assert.ok(Math.hypot(neighbour.position.x - ball.position.x,
    neighbour.position.y - ball.position.y) >= 9.99,
    'valve displacement must propagate through a loaded ball chain without a new overlap');
  assert.equal(harness.adapter.getStats().kinematic, 0,
    'a scroll valve must return to a passive fixed body after its sweep');
  harness.dispose();
}

// Geometry sampling is not world-time integration. A 64-pose scroll jump must
// advance gravity and the Matter-compatible clock by the same single 60 Hz
// step as an ordinary frame.
{
  const ordinaryBall = Bodies.circle(0, 0, 5, {
    frictionAir: 0, plugin: { boardId: 'ordinary-gravity' },
  });
  const sampledBall = Bodies.circle(0, 0, 5, {
    frictionAir: 0, plugin: { boardId: 'sampled-gravity' },
  });
  const ordinaryValve = Bodies.rectangle(1000, 0, 4, 20, {
    isStatic: true, label: 'reservoir-gate',
  });
  const sampledValve = Bodies.rectangle(1000, 0, 4, 20, {
    isStatic: true, label: 'reservoir-gate',
  });
  const ordinary = createHarness([ordinaryBall], [ordinaryValve], [ordinaryValve]);
  const sampled = createHarness([sampledBall], [sampledValve], [sampledValve]);
  ordinary.adapter.step(ordinary.adapter.fixedStepMs);
  let samples = 0;
  const returnedSamples = sampled.adapter.step(sampled.adapter.fixedStepMs, 64, fraction => {
    samples += 1;
    Body.setPosition(sampledValve, { x: 1000 + fraction * 100, y: 0 }, false);
  });
  assert.equal(samples, 64);
  assert.equal(returnedSamples, 64);
  assert.ok(Math.abs(sampledBall.position.y - ordinaryBall.position.y) < 1e-6);
  assert.ok(Math.abs(sampledBall.velocity.y - ordinaryBall.velocity.y) < 1e-6);
  assert.ok(Math.abs(sampled.engine.timing.timestamp - ordinary.engine.timing.timestamp) < 1e-6,
    'pose samples must not multiply elapsed world time or gravity');
  ordinary.dispose();
  sampled.dispose();
}

// A feasible loaded chain may extend beyond the valve's immediate neighbours.
// Final constraint repair must reach its static boundary without leaving a
// hidden ball/ball overlap outside the first two contact rings.
{
  const balls = Array.from({ length: 5 }, (_, index) => Bodies.circle(19 + index * 10, 0, 5, {
    frictionAir: 0, restitution: 0, plugin: { boardId: `loaded-${index}` },
  }));
  const valve = Bodies.rectangle(0, 0, 8, 40, {
    isStatic: true, label: 'meter-gate', restitution: 0,
  });
  const wall = Bodies.rectangle(73, 0, 2, 100, {
    isStatic: true, label: 'loaded-chain-wall', restitution: 0,
  });
  const harness = createHarness(balls, [valve, wall], [valve]);
  harness.adapter.step(harness.adapter.fixedStepMs, 64, fraction => {
    Body.setPosition(valve, { x: 14 * fraction, y: 0 }, false);
  });
  for (let index = 1; index < balls.length; index += 1) {
    assert.ok(Math.hypot(balls[index].position.x - balls[index - 1].position.x,
      balls[index].position.y - balls[index - 1].position.y) >= 9.99,
    'swept displacement must reach every ball in a feasible loaded chain');
  }
  assert.ok(harness.adapter.getContactSnapshot().every(contact => contact.depth < .1));
  harness.dispose();
}

// A fast valve can end past a ball that was touched only by an intermediate
// pose. Current-shape queries must still detect and displace that new contact.
{
  const ball = Bodies.circle(12, 0, 5, {
    frictionAir: 0, plugin: { boardId: 'intermediate-contact' },
  });
  const valve = Bodies.rectangle(0, 0, 4, 24, {
    isStatic: true, label: 'meter-gate', restitution: 0,
  });
  const harness = createHarness([ball], [valve], [valve]);
  harness.adapter.step(harness.adapter.fixedStepMs, 64, fraction => {
    Body.setPosition(valve, { x: 30 * fraction, y: 0 }, false);
  });
  assert.ok(ball.position.x > 12,
    'an intermediate sampled valve pose must not pass through a newly contacted ball');
  assert.ok(harness.adapter.getContactSnapshot().every(contact => contact.depth < .1));
  harness.dispose();
}

// Compound architecture can support the same ball on more than one convex
// part. Preserve each native contact normal instead of discarding every part
// after the first parent-body pair.
{
  const wall = Bodies.rectangle(20, -50, 20, 120, { isStatic: true });
  const floor = Bodies.rectangle(0, 10, 200, 20, { isStatic: true });
  Body.setAngle(floor, .1);
  const compound = Body.create({ parts: [wall, floor], isStatic: true, label: 'compound-support' });
  const ball = Bodies.circle(0, -10, 10, { plugin: { boardId: 'compound-ball' } });
  const harness = createHarness([ball], [compound]);
  for (let index = 0; index < 400; index += 1) {
    harness.adapter.step(harness.adapter.fixedStepMs);
  }
  const contacts = harness.adapter.refreshContacts();
  assert.ok(contacts.length >= 2);
  assert.ok(contacts.some(pair => pair.collision.boardNativeNormalOnA.y < -.9),
    'the floor part normal must remain available beside the wall part');
  assert.equal(new Set(contacts.map(pair => pair.id)).size, contacts.length,
    'compound part contacts need stable distinct pair identities');
  harness.dispose();
}

// Powered kinematics interpolate their full-tick target over explicit micro
// poses. Compound fixtures retain one convex collider per valid Matter part.
{
  const ball = Bodies.circle(19, 0, 5, { frictionAir: 0, plugin: { boardId: 'powered-ball' } });
  const left = Bodies.rectangle(-4, -6, 8, 12, { isStatic: true });
  const right = Bodies.rectangle(4, 6, 8, 12, { isStatic: true });
  const fixture = Body.create({ parts: [left, right], isStatic: true, label: 'seesaw' });
  Body.setPosition(fixture, { x: 0, y: 0 });
  const harness = createHarness([ball], [fixture], [fixture]);
  const baseColliders = harness.adapter.getStats().colliders;
  Body.setPosition(fixture, { x: 14, y: 0 }, false);
  harness.adapter.step(harness.adapter.fixedStepMs, 4);
  assert.ok(ball.position.x > 19, 'a powered kinematic must transfer motion to a ball');
  assert.ok(baseColliders >= 3, 'compound Matter parts must become separate convex colliders');
  harness.dispose();
}

// A fully resting opening may animate its remote automatic fixtures without
// stepping gravity or visiting the sleeping reservoir contact graph.
{
  const ball = Bodies.circle(0, 0, 5, { plugin: { boardId: 'idle-ball' } });
  Sleeping.set(ball, true);
  const rotor = Bodies.rectangle(1000, 1000, 40, 8, {
    isStatic: true, label: 'large-drum-carrier',
  });
  const harness = createHarness([ball], [rotor], [rotor]);
  const before = { x: ball.position.x, y: ball.position.y, sleeping: ball.isSleeping };
  Body.setAngle(rotor, .75, true);
  assert.equal(harness.adapter.syncMovingFixtures(), 1);
  assert.deepEqual({ x: ball.position.x, y: ball.position.y, sleeping: ball.isSleeping }, before);
  assert.equal(harness.adapter.getStats().steps, 0,
    'idle fixture synchronisation must not advance world time');
  harness.dispose();
}

// Freeing and rebuilding the native world from retained Matter proxies must
// preserve physical identity and continue from the same pose and velocity.
{
  const makeBall = id => Bodies.circle(0, 0, 5, {
    frictionAir: .002, plugin: { boardId: id },
  });
  const referenceBall = makeBall('rebuild-reference');
  const resumedBall = makeBall('rebuild-resumed');
  const reference = createHarness([referenceBall]);
  let resumed = createHarness([resumedBall]);
  for (let index = 0; index < 5; index += 1) {
    reference.adapter.step(reference.adapter.fixedStepMs);
    resumed.adapter.step(resumed.adapter.fixedStepMs);
  }
  for (let cycle = 0; cycle < 3; cycle += 1) {
    resumed.adapter.dispose();
    resumed.adapter = createBoardRigidBodyWorld({
      engine: resumed.engine,
      balls: resumed.balls,
      fixtures: resumed.fixtures,
      movingFixtures: [],
    });
    reference.adapter.step(reference.adapter.fixedStepMs);
    resumed.adapter.step(resumed.adapter.fixedStepMs);
    assert.ok(Math.abs(resumedBall.position.x - referenceBall.position.x) < 1e-5);
    assert.ok(Math.abs(resumedBall.position.y - referenceBall.position.y) < 1e-4);
    assert.ok(Math.abs(resumedBall.velocity.x - referenceBall.velocity.x) < 1e-5);
    assert.ok(Math.abs(resumedBall.velocity.y - referenceBall.velocity.y) < 1e-4,
      'rebuilding the native world must not reset or inject velocity');
  }
  reference.dispose();
  resumed.dispose();
}

// A supported sleeping contact chain remains asleep across a native rebuild;
// reconstruction must not turn a valid checkpoint into a release impulse.
{
  const floor = Bodies.rectangle(0, 10, 100, 10, { isStatic: true, label: 'rebuild-floor' });
  const lower = Bodies.circle(0, 0, 5, { plugin: { boardId: 'rebuild-lower' } });
  const upper = Bodies.circle(0, -10, 5, { plugin: { boardId: 'rebuild-upper' } });
  Sleeping.set(lower, true);
  Sleeping.set(upper, true);
  const harness = createHarness([lower, upper], [floor]);
  const start = [lower.position.y, upper.position.y];
  harness.adapter.dispose();
  harness.adapter = createBoardRigidBodyWorld({
    engine: harness.engine,
    balls: harness.balls,
    fixtures: harness.fixtures,
    movingFixtures: [],
  });
  harness.adapter.step(harness.adapter.fixedStepMs);
  assert.deepEqual([lower.position.y, upper.position.y], start);
  assert.equal(lower.isSleeping, true);
  assert.equal(upper.isSleeping, true);
  harness.dispose();
}

// On-demand contact refresh bridges the Rapier graph only when support QA asks
// for it, and architecture interactions retain the existing Matter events.
{
  const ball = Bodies.circle(0, 89, 6, { plugin: { boardId: 'contact' } });
  const seesaw = Bodies.rectangle(0, 100, 100, 10, {
    isStatic: true, label: 'seesaw', restitution: 0,
  });
  const harness = createHarness([ball], [seesaw], [seesaw]);
  let starts = 0;
  Events.on(harness.engine, 'collisionStart', event => { starts += event.pairs.length; });
  for (let index = 0; index < 20; index += 1) harness.adapter.step(harness.adapter.fixedStepMs);
  const contacts = harness.adapter.refreshContacts();
  assert.ok(contacts.some(pair => pair.bodyA === ball || pair.bodyB === ball));
  assert.ok(starts >= 1, 'tracked architecture contacts must retain collisionStart events');
  assert.equal(harness.engine.pairs.list, contacts);
  harness.dispose();
}

// Support contacts use the true Rapier circle rather than Matter's inscribed
// render polygon. The normal stays in Matter's B-to-A convention while the
// exact first-shape normal remains available to support diagnostics.
{
  const ball = Bodies.circle(0, -10, 10, { plugin: { boardId: 'support-normal' } });
  Body.setAngle(ball, .15);
  const floor = Bodies.rectangle(0, 10, 200, 20, { isStatic: true, label: 'floor' });
  const harness = createHarness([ball], [floor]);
  for (let index = 0; index < 400; index += 1) {
    harness.adapter.step(harness.adapter.fixedStepMs);
  }
  const [pair] = harness.adapter.refreshContacts();
  assert.equal(pair.collision.boardNativeContact, true);
  assert.ok(pair.collision.normal.y > .99,
    'Matter-compatible floor contact normal must point from the ball toward the floor');
  assert.ok(pair.collision.boardNativeNormalOnA.y < -.99,
    'the exact floor normal must point from the floor toward the ball');
  assert.equal(ball.isSleeping, true);
  harness.dispose();
}

// The authored drums contain extremely narrow sampled triangles. Rapier can
// return a convex descriptor for these while its raw hull is empty; adapter
// creation must preserve their oriented span without throwing or filling an
// axis-aligned box around the diagonal.
{
  const pointsInMetres = [
    [-.863804519, -1.139040112],
    [-1.004660606, -1.015512586],
    [-2.091592550, -.096737504],
  ];
  const vertices = pointsInMetres.map(([x, y]) => ({
    x: x * BOARD_RIGID_BODY_METRE_SCALE,
    y: y * BOARD_RIGID_BODY_METRE_SCALE,
  }));
  const narrowFixture = Bodies.fromVertices(691, 6885, [vertices], {
    isStatic: true,
    label: 'narrow-drum-segment',
  });
  const harness = createHarness([], [narrowFixture]);
  assert.equal(harness.adapter.getStats().colliders, 1);
  harness.dispose();
}

// A stable roster needs no repeated Set/Map rebuild. Equal-length replacement
// still retires the old native body, and removed mechanisms cannot keep moving.
{
  const first = Bodies.circle(0, -100, 5, { plugin: { boardId: 'roster-first' } });
  const gate = Bodies.rectangle(0, 20, 50, 8, { isStatic: true, label: 'reservoir-gate' });
  const harness = createHarness([first], [gate], [gate]);
  const initial = harness.adapter.getStats();
  harness.adapter.step();
  harness.adapter.step();
  assert.equal(harness.adapter.getStats().membershipRebuilds, initial.membershipRebuilds);
  const replacement = Bodies.circle(40, -100, 5, { plugin: { boardId: 'roster-next' } });
  harness.balls[0] = replacement;
  const retiredY = first.position.y;
  harness.adapter.step();
  const replaced = harness.adapter.getStats();
  assert.equal(replaced.additions, initial.additions + 1);
  assert.equal(replaced.removals, initial.removals + 1);
  assert.equal(replaced.dynamic, 1);
  assert.equal(first.position.y, retiredY, 'a retired proxy must stop receiving native updates');
  assert.ok(replacement.position.y > -100, 'a replacement must enter real gravity immediately');
  harness.fixtures.length = 0;
  harness.adapter.step();
  Body.setAngle(gate, .5);
  assert.equal(harness.adapter.syncMovingFixtures(), 0,
    'the cached mechanism list must remove a retired fixture');
  assert.equal(harness.adapter.getStats().movingFixtures, 0);
  harness.dispose();
}

// Rapier may retain a removed collider handle in its contact graph until the
// next native step, returning null during an intervening scroll-valve query.
// Exercise that native boundary without depending on broad-phase ordering.
{
  const backend = await loadBoardRigidBodyBackend();
  const contactPairsWith = backend.World.prototype.contactPairsWith;
  const ball = Bodies.circle(0, -15, 5, { plugin: { boardId: 'live-after-retirement' } });
  const gate = Bodies.rectangle(0, 0, 50, 8, { isStatic: true, label: 'reservoir-gate' });
  const harness = createHarness([ball], [gate], [gate]);
  let staleContacts = 0;
  try {
    backend.World.prototype.contactPairsWith = function (collider, callback) {
      staleContacts += 1;
      callback(null);
      return contactPairsWith.call(this, collider, callback);
    };
    harness.adapter.step(harness.adapter.fixedStepMs, 4,
      fraction => Body.setAngle(gate, fraction * .3, false));
    assert.ok(staleContacts > 0, 'the valve must query the stale contact graph');
    assert.ok(Number.isFinite(ball.position.y));
    assert.equal(harness.adapter.getStats().dynamic, 1,
      'ignoring a retired contact must preserve the remaining physical ball');
  } finally {
    backend.World.prototype.contactPairsWith = contactPairsWith;
    harness.dispose();
  }
}

console.log('About rigid-body adapter checks passed.');
