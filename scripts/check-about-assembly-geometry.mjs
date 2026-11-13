import assert from 'node:assert/strict';
import test from 'node:test';
import Matter from '../react-app/app/node_modules/matter-js/build/matter.js';
import {
  BOARD_ASSEMBLY_CHANNEL_WIDTH,
  BOARD_ASSEMBLY_HEIGHT,
  createBoardAssemblyGeometry,
} from '../react-app/app/src/routes/about-game-board/boardAssemblyGeometry.js';
import {
  createBoardRigidBodyWorld,
  loadBoardRigidBodyBackend,
} from '../react-app/app/src/routes/about-game-board/boardRigidBodyWorld.js';
import { createBoardDrumPhysics } from '../react-app/app/src/routes/about-game-board/boardDrums.js';
import { matterBallMaterial } from '../react-app/app/src/routes/about-game-board/boardDynamics.js';

const REFERENCE_RADII = [6.66, 20.32, 25.06];
const RADII = [...REFERENCE_RADII, 51.2]; // Largest authored ball in a 300px board.
const EPSILON = 1e-6;

const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

function cross(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function crosses(a, b, c, d) {
  return cross(a, b, c) * cross(a, b, d) < -EPSILON
    && cross(c, d, a) * cross(c, d, b) < -EPSILON;
}

function exposedSegments(rail) {
  return rail.points.slice(1).map((end, i) => [rail.points[i], end]);
}

test('the filled outline uses the same two continuous rails and no mouth collider', () => {
  for (const radius of RADII) {
    const assembly = createBoardAssemblyGeometry(radius);
    const [left, right] = assembly.rails;
    assert.equal(assembly.height, BOARD_ASSEMBLY_HEIGHT);
    assert.deepEqual([left.side, right.side], ['left', 'right']);
    assert.deepEqual(assembly.inlet, [[0, assembly.casing.top], [960, assembly.casing.top]]);
    assert.deepEqual(assembly.outlet, [[0, assembly.casing.bottom], [960, assembly.casing.bottom]]);
    const outline = [...left.points, ...right.points.toReversed()];
    const paintedPoints = [...assembly.channelPath.matchAll(/[ML]([^ ]+) ([^ ]+)/g)]
      .map(([, x, y]) => [Number(x), Number(y)]);
    assert.deepEqual(paintedPoints, outline);
    assert.match(assembly.channelPath, / Z$/);
    for (const rail of assembly.rails) {
      for (const [x, y] of rail.points) {
        assert.ok(x >= 0 && x <= 960 && y >= 0 && y <= assembly.height);
      }
      for (const [start, end] of exposedSegments(rail)) assert.ok(distance(start, end) > EPSILON);
    }
    for (let i = 0; i < outline.length; i += 1) {
      for (let j = i + 2; j < outline.length; j += 1) {
        if (i === 0 && j === outline.length - 1) continue;
        assert.ok(!crosses(outline[i], outline[(i + 1) % outline.length],
          outline[j], outline[(j + 1) % outline.length]), `radius ${radius}, outline edges ${i} and ${j}`);
      }
    }
  }
});

test('wheel ports meet the shared rails and retain two-ball clearance', () => {
  for (const radius of RADII) {
    const assembly = createBoardAssemblyGeometry(radius);
    assert.equal(assembly.clearWidth, Math.max(BOARD_ASSEMBLY_CHANNEL_WIDTH, 4 * radius + 12));
    assert.deepEqual(assembly.wheels.map(wheel => wheel.compartmentCount), [6, 4]);
    if (radius <= REFERENCE_RADII.at(-1)) {
      assert.ok(Math.abs(assembly.wheels[1].casingRadius - 166) < 1);
    }
    for (const wheel of assembly.wheels) {
      for (const ports of [wheel.inlet, wheel.outlet]) {
        assert.ok(distance(...ports) + EPSILON >= assembly.clearWidth);
        ports.forEach((port, index) => {
          assert.ok(assembly.rails[index].points.includes(port));
          assert.ok(Math.abs(distance(port, wheel.casingCentre) - wheel.casingRadius) < EPSILON);
        });
      }
      const tip = wheel.carrierOuterRadius + distance(wheel.centre, wheel.casingCentre);
      assert.ok(tip < wheel.casingRadius, 'a rotating paddle stays inside the casing');
    }
  }
});

test('the open gate parks vertically and keeps room for two moving balls', () => {
  for (const radius of RADII) {
    const { rails, gate } = createBoardAssemblyGeometry(radius);
    const closedAngle = Math.atan2(gate.end[1] - gate.pivot[1], gate.end[0] - gate.pivot[0]);
    assert.ok(Math.abs(closedAngle + gate.openAngle - Math.PI / 2) < EPSILON);
    const rightWall = rails[1].points[1][0];
    assert.ok(gate.end[0] >= rightWall, 'the closed arm spans the throat');
    assert.ok(rightWall - gate.pivot[0] - Math.max(gate.width / 2, gate.pivotRadius) >= 4 * radius);
  }
});

test('the small drum releases the last desktop ball across paddle phases', async () => {
  await loadBoardRigidBodyBackend();
  const radius = 6.65609065;
  const geometry = createBoardAssemblyGeometry(radius);
  const wheel = geometry.wheels[1];
  const paddlePeriod = 2 * Math.PI / (wheel.compartmentCount * Math.abs(wheel.speed));
  for (let phase = 0; phase < 12; phase += 1) {
    const drums = createBoardDrumPhysics({ geometry });
    const fixtures = [...drums.fixedBodies, ...drums.carrierBodies];
    // Start at the position and velocity from a full-board run that had
    // settled all but one ball. Vary the paddle pose when it enters the drum.
    const ball = Matter.Bodies.circle(wheel.centre[0] + 158.1, wheel.centre[1] + 7.78,
      radius, { ...matterBallMaterial(), restitution: 0 });
    Matter.Body.setVelocity(ball, { x: .661, y: -2.15 });
    const engine = Matter.Engine.create({ enableSleeping: true });
    Matter.Composite.add(engine.world, [ball, ...fixtures]);
    const start = phase * paddlePeriod / 12;
    drums.update(start);
    const adapter = createBoardRigidBodyWorld({ engine, balls: [ball], fixtures,
      movingFixtures: drums.carrierBodies });
    try {
      for (let step = 1; step <= 720 && ball.position.y < geometry.height; step += 1) {
        drums.update(start + step * adapter.fixedStepMs);
        adapter.step(adapter.fixedStepMs, 1, null, true);
      }
      assert.ok(ball.position.y >= geometry.height, `the last ball must drain at paddle phase ${phase}`);
      assert.ok(ball.position.x > 240 && ball.position.x < 720, 'the ball exits through the channel');
    } finally {
      adapter.dispose();
    }
  }
});

function solidRail([start, end], side) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  const thickness = 6;
  const offset = (side === 'left' ? -1 : 1) * thickness / 2;
  return Matter.Bodies.rectangle((start[0] + end[0]) / 2 + dy / length * offset,
    (start[1] + end[1]) / 2 - dx / length * offset, length + .2, thickness, {
      isStatic: true, angle: Math.atan2(dy, dx), friction: 0, frictionStatic: 0, restitution: 0,
    });
}

test('gravity clears balls placed at rest on either receiver floor', async () => {
  await loadBoardRigidBodyBackend();
  for (const radius of REFERENCE_RADII) {
    const { rails, receiverObstacle } = createBoardAssemblyGeometry(radius);
    const floors = rails.map(rail => exposedSegments(rail).find(([start, end]) =>
      start[1] > 610 && end[1] > start[1] && Math.abs(end[0] - start[0]) > 100));
    assert.ok(floors.every(Boolean), 'both receiver shelves slope into the drain');
    const fixtures = rails.flatMap(rail => exposedSegments(rail).map(segment => solidRail(segment, rail.side)));
    fixtures.push(Matter.Bodies.circle(...receiverObstacle.centre, receiverObstacle.radius, {
      isStatic: true, friction: 0, restitution: 0,
    }));
    const balls = floors.map(([start, end], i) => Matter.Bodies.circle(
      (start[0] + end[0]) / 2, (start[1] + end[1]) / 2 - radius - .5, radius, {
        friction: 0, restitution: 0, plugin: { boardId: `receiver-${i}` },
      }));
    const engine = Matter.Engine.create({ enableSleeping: true });
    Matter.Composite.add(engine.world, [...fixtures, ...balls]);
    const physics = createBoardRigidBodyWorld({ engine, balls, fixtures, movingFixtures: [] });
    try {
      for (let step = 0; step < 720 && !balls.every(ball => ball.position.y > 700); step += 1) {
        physics.step(physics.fixedStepMs);
      }
      assert.ok(balls.every(ball => ball.position.y > 700), `radius ${radius}: each ball clears the receiver`);
    } finally {
      physics.dispose();
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
    }
  }
});
