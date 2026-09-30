import Matter from 'matter-js';
import { DEFAULT_BALL_DYNAMICS, normalizeBallDynamics } from '../../lib/ballDynamics.js';
import {
  boardMicroStepIterationBudget,
  createBoardAdaptiveNeighbourSearch,
  createBoardFixtureBoundsSearch,
  updateBoardEngine,
} from './boardPhysicsPerformance.js';
import { createBoardSpatialIndex } from './boardSpatialIndex.js';

const { Bodies, Body, Detector, Engine, Events, Query, Sleeping } = Matter;
const adaptiveNeighbourSearches = new WeakMap();
const fixtureBoundsSearches = new WeakMap();
const FIXTURE_WAKE_CONTACT_RINGS = 2;

function adaptiveNeighbourSearch(bodies) {
  let search = adaptiveNeighbourSearches.get(bodies);
  if (!search) {
    search = createBoardAdaptiveNeighbourSearch();
    adaptiveNeighbourSearches.set(bodies, search);
  }
  return search;
}

function fixtureBoundsSearch(fixtures) {
  let search = fixtureBoundsSearches.get(fixtures);
  if (!search) {
    search = createBoardFixtureBoundsSearch();
    fixtureBoundsSearches.set(fixtures, search);
  }
  return search;
}

/** Matter retains a static body's previous kinematic motion. A held valve
 * must also stop its contact velocity, not just its artwork. */
export function stopBoardKinematicBody(body) {
  body.positionPrev.x = body.position.x;
  body.positionPrev.y = body.position.y;
  body.anglePrev = body.angle;
  body.velocity.x = body.velocity.y = body.speed = 0;
  body.angularVelocity = body.angularSpeed = 0;
}

/** Matter normally wakes a resting ball after detecting contacts. That is too
 * late to include its static support in the same step: an incoming neighbour
 * can push it through the floor for one frame. Wake approaching contacts before
 * integration, so gravity also establishes their support pair in that step. */
export function installBoardWakeSafety(engine, bodies, movingFixtures = []) {
  const active = [];
  const fixtureWake = new Set();
  const restingIndex = createBoardSpatialIndex(48);
  const neighbours = [];
  const adjacency = new Map();
  const adjacencyPool = [];
  const wakeQueue = [];
  const wakeDepth = [];
  let adjacencyCount = 0;
  const contactList = body => {
    let list = adjacency.get(body);
    if (list) return list;
    list = adjacencyPool[adjacencyCount];
    if (!list) {
      list = [];
      adjacencyPool.push(list);
    }
    list.length = 0;
    adjacencyCount += 1;
    adjacency.set(body, list);
    return list;
  };
  // Kinematic fixtures are static to Matter, so its sleeping detector does
  // not wake their contacts when a powered arm changes pose. Retain bounds
  // between steps so a moving or departing support wakes the affected balls.
  const fixtures = movingFixtures.map(body => ({ body,
    x: body.position.x, y: body.position.y, angle: body.angle,
    minX: body.bounds.min.x, minY: body.bounds.min.y,
    maxX: body.bounds.max.x, maxY: body.bounds.max.y }));
  const beforeUpdate = ({ delta }) => {
    fixtureWake.clear();
    for (const fixture of fixtures) {
      const body = fixture.body;
      if (fixture.x === body.position.x && fixture.y === body.position.y
        && fixture.angle === body.angle) continue;
      const minX = Math.min(fixture.minX, body.bounds.min.x);
      const minY = Math.min(fixture.minY, body.bounds.min.y);
      const maxX = Math.max(fixture.maxX, body.bounds.max.x);
      const maxY = Math.max(fixture.maxY, body.bounds.max.y);
      for (const ball of bodies) {
        if (ball.isSensor || ball.isStatic
          || !Detector.canCollide(ball.collisionFilter, body.collisionFilter)) continue;
        const radius = ball.circleRadius + .1;
        if (ball.position.x + radius >= minX && ball.position.x - radius <= maxX
          && ball.position.y + radius >= minY && ball.position.y - radius <= maxY) {
          if (ball.isSleeping) Sleeping.set(ball, false);
          fixtureWake.add(ball);
        }
      }
      fixture.x = body.position.x; fixture.y = body.position.y; fixture.angle = body.angle;
      fixture.minX = body.bounds.min.x; fixture.minY = body.bounds.min.y;
      fixture.maxX = body.bounds.max.x; fixture.maxY = body.bounds.max.y;
    }
    // A position-controlled valve can push with zero inferred speed. Wake its
    // touching ball island as well: sleeping neighbours otherwise behave as
    // immovable obstacles and pin the first ball inside the closing valve.
    if (fixtureWake.size > 0) {
      adjacency.clear();
      adjacencyCount = 0;
      for (const pair of engine.pairs.list) {
        const a = pair.bodyA.parent;
        const b = pair.bodyB.parent;
        if (!a.circleRadius || !b.circleRadius || a.isStatic || b.isStatic || pair.isSensor) continue;
        if (Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)
          > a.circleRadius + b.circleRadius + .25) continue;
        contactList(a).push(b);
        contactList(b).push(a);
      }
      wakeQueue.length = 0;
      wakeDepth.length = 0;
      for (const body of fixtureWake) {
        wakeQueue.push(body);
        wakeDepth.push(0);
      }
      for (let cursor = 0; cursor < wakeQueue.length; cursor += 1) {
        if (wakeDepth[cursor] >= FIXTURE_WAKE_CONTACT_RINGS) continue;
        for (const neighbour of adjacency.get(wakeQueue[cursor]) || []) {
          if (fixtureWake.has(neighbour)) continue;
          fixtureWake.add(neighbour);
          wakeQueue.push(neighbour);
          wakeDepth.push(wakeDepth[cursor] + 1);
          if (neighbour.isSleeping) Sleeping.set(neighbour, false);
        }
      }
    }
    active.length = 0;
    restingIndex.reset();
    let maximumRadius = 0;
    for (const body of bodies) {
      maximumRadius = Math.max(maximumRadius, body.circleRadius || 0);
      if (body.isSleeping && !body.isStatic && !body.isSensor) restingIndex.add(body);
      if (!body.isStatic && !body.isSensor && !body.isSleeping
        && Math.max(body.motion, body.speed * body.speed)
          > Sleeping._motionSleepThreshold) active.push(body);
    }
    // Snapshot the active set first. Newly woken balls must not propagate a
    // wake through a stationary pile during this scan.
    for (const moving of active) {
      const travelX = moving.velocity.x * delta / (1000 / 60);
      const travelY = moving.velocity.y * delta / (1000 / 60)
        + engine.gravity.y * engine.gravity.scale * delta * delta;
      const reach = moving.circleRadius + maximumRadius + .1;
      restingIndex.query(moving.position.x + Math.min(0, travelX) - reach,
        moving.position.y + Math.min(0, travelY) - reach,
        moving.position.x + Math.max(0, travelX) + reach,
        moving.position.y + Math.max(0, travelY) + reach, neighbours);
      for (const resting of neighbours) {
        if (!resting.isSleeping) continue;
        if (!Detector.canCollide(resting.collisionFilter, moving.collisionFilter)) continue;
        const dx = resting.position.x - moving.position.x;
        const dy = resting.position.y - moving.position.y;
        const length = travelX * travelX + travelY * travelY;
        const along = length ? Math.max(0, Math.min(1,
          (dx * travelX + dy * travelY) / length)) : 0;
        const nearestX = dx - along * travelX;
        const nearestY = dy - along * travelY;
        const radius = resting.circleRadius + moving.circleRadius + .1;
        if (nearestX * nearestX + nearestY * nearestY <= radius * radius) {
          Sleeping.set(resting, false);
        }
      }
    }
  };
  Events.on(engine, 'beforeUpdate', beforeUpdate);
  return () => Events.off(engine, 'beforeUpdate', beforeUpdate);
}

export const EARTH_GRAVITY_METRES_PER_SECOND_SQUARED = 9.81;
const MATTER_DEFAULT_GRAVITY_PRODUCT = 0.001;
const BASELINE_MATTER_DENSITY = 0.001;

/** The board uses one constant downward Earth-gravity baseline. Matter works in
 * screen units, so scale normalises 9.81 to its documented world baseline. */
export const BOARD_WORLD_PHYSICS = Object.freeze({
  gravity: Object.freeze({
    x: 0,
    y: EARTH_GRAVITY_METRES_PER_SECOND_SQUARED,
    scale: MATTER_DEFAULT_GRAVITY_PRODUCT / EARTH_GRAVITY_METRES_PER_SECOND_SQUARED,
  }),
  fixedStepMs: 1000 / 120,
  maxCatchUpSteps: 6,
  // Loaded valves need a little more positional convergence than loose balls.
  positionIterations: 16,
  velocityIterations: 8,
  constraintIterations: 4,
  /* Discrete solvers can miss a thin fixture when a fast ball crosses it in
   * one update. Extra steps are used only when predicted travel needs them. */
  maxBallTravelRadiusFraction: 0.45,
  maxAdaptiveMicroSteps: 12,
});

/** The drawn radius and collision radius are deliberately identical. */
export function ballColliderRadius(sourceRadius) {
  const radius = Number(sourceRadius);
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new TypeError('A board ball needs a positive finite radius.');
  }
  return radius;
}

/** Convert designer-facing kilograms into Matter density. Equal-sized balls
 * therefore change mass linearly without changing their collision geometry. */
export function matterBallMaterial(input = DEFAULT_BALL_DYNAMICS) {
  const dynamics = normalizeBallDynamics(input);
  return {
    dynamics,
    density: BASELINE_MATTER_DENSITY * dynamics.massKg / DEFAULT_BALL_DYNAMICS.massKg,
    restitution: dynamics.restitution,
    friction: dynamics.friction,
    frictionStatic: Math.min(1, Math.max(0.01, dynamics.friction * 2)),
    frictionAir: 0.0006,
    sleepThreshold: 60,
    slop: 0.01,
  };
}

export function applyMatterBallMaterial(body, input) {
  const material = matterBallMaterial(input);
  Body.setDensity(body, material.density);
  body.restitution = material.restitution;
  body.friction = material.friction;
  body.frictionStatic = material.frictionStatic;
  body.frictionAir = material.frictionAir;
  body.sleepThreshold = material.sleepThreshold;
  body.slop = material.slop;
  return material;
}

/** Reassert the world contract before every step so route controls or stale
 * runtime state cannot introduce local gravity changes. */
export function applyBoardWorldGravity(engine) {
  const { gravity } = BOARD_WORLD_PHYSICS;
  engine.gravity.x = gravity.x;
  engine.gravity.y = gravity.y;
  engine.gravity.scale = gravity.scale;
  engine.timing.timeScale = 1;
}

export function circleCapsulePenetration(circle, start, end, halfWidth) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared > 0
    ? Math.min(1, Math.max(0,
      ((circle.x - start[0]) * dx + (circle.y - start[1]) * dy) / lengthSquared))
    : 0;
  const closestX = start[0] + dx * projection;
  const closestY = start[1] + dy * projection;
  return circle.radius + halfWidth - Math.hypot(circle.x - closestX, circle.y - closestY);
}

export function ballGatePenetration(ball, gate) {
  const circle = { x: ball.x, y: ball.y, radius: ballColliderRadius(ball.radius) };
  const armDepth = circleCapsulePenetration(circle, gate.pivot, gate.end, gate.width / 2);
  const pivotDepth = circle.radius + gate.pivotRadius
    - Math.hypot(circle.x - gate.pivot[0], circle.y - gate.pivot[1]);
  return Math.max(armDepth, pivotDepth);
}

export function sourceBallsBlockedByGate(balls, gate, tolerance = 0.1) {
  return new Set(balls
    .filter(ball => ballGatePenetration(ball, gate) > tolerance)
    .map(ball => ball.id));
}

/** Find authored illustration balls that occupy any real architecture body.
 * These balls stay out of the Canvas layer until a physical body owns them. */
export function sourceBallsBlockedByBodies(balls, bodies, tolerance = 0.1) {
  if (!Array.isArray(balls) || !Array.isArray(bodies) || !bodies.length) return new Set();
  const blocked = new Set();
  for (const ball of balls) {
    const probe = Bodies.circle(ball.x, ball.y, ballColliderRadius(ball.radius), {
      isSensor: true,
    });
    if (Query.collides(probe, bodies)
      .some(collision => (collision.depth || 0) > tolerance)) blocked.add(ball.id);
  }
  return blocked;
}

/** Convert a 120 Hz world step into smaller solver steps when a fast ball
 * would otherwise travel too far relative to its own collision radius. This
 * preserves its velocity instead of applying an artificial speed cap. */
export function adaptiveBallMicroSteps(bodies, stepMs = BOARD_WORLD_PHYSICS.fixedStepMs,
  fixtures = null, diagnostics = null) {
  const baseDeltaMs = 1000 / 60;
  let required = 1;
  let neighbourSearch = null;
  let indexedFixtures = null;
  if (diagnostics) {
    diagnostics.required = 1;
    diagnostics.fastContacts = 0;
    diagnostics.triggerId = null;
    diagnostics.triggerX = 0;
    diagnostics.triggerY = 0;
    diagnostics.triggerSpeed = 0;
    diagnostics.triggerReason = null;
  }
  for (const body of bodies) {
    if (!body?.circleRadius || body.isSleeping) continue;
    const speed = Number.isFinite(body.speed)
      ? body.speed
      : Math.hypot(body.velocity?.x || 0, body.velocity?.y || 0);
    const predictedTravel = speed * stepMs / baseDeltaMs;
    const safeTravel = body.circleRadius * BOARD_WORLD_PHYSICS.maxBallTravelRadiusFraction;
    // Speed in empty space cannot tunnel through anything. Only a swept box
    // approaching a real fixture needs the expensive extra world steps.
    if (fixtures && predictedTravel > safeTravel) {
      const travelX = body.velocity.x * stepMs / baseDeltaMs;
      const travelY = body.velocity.y * stepMs / baseDeltaMs + .5;
      const padding = body.circleRadius + 2;
      const minX = body.position.x + Math.min(0, travelX) - padding;
      const maxX = body.position.x + Math.max(0, travelX) + padding;
      const minY = body.position.y + Math.min(0, travelY) - padding;
      const maxY = body.position.y + Math.max(0, travelY) + padding;
      let nearContact = false;
      let contactReason = null;
      if (!indexedFixtures) {
        indexedFixtures = fixtureBoundsSearch(fixtures);
        indexedFixtures.rebuild(fixtures);
      }
      for (const fixture of indexedFixtures.query(minX, minY, maxX, maxY)) {
        const parts = fixture.parts;
        if (parts?.length > 1) {
          for (let part = 1; part < parts.length; part += 1) {
            const bounds = parts[part].bounds;
            if (bounds.max.x >= minX && bounds.min.x <= maxX
              && bounds.max.y >= minY && bounds.min.y <= maxY) {
              nearContact = true;
              contactReason = 'fixture';
              break;
            }
          }
        } else {
          nearContact = true;
          contactReason = 'fixture';
        }
        if (nearContact) break;
      }
      // A moving neighbour also needs continuous contact protection even in
      // an otherwise empty stretch between mechanisms.
      if (!nearContact) {
        if (!neighbourSearch) {
          neighbourSearch = adaptiveNeighbourSearch(bodies);
          neighbourSearch.rebuild(bodies, stepMs);
        }
        nearContact = neighbourSearch.hasPotentialContact(body, minX, minY, maxX, maxY);
        if (nearContact) contactReason = 'ball';
      }
      if (!nearContact) continue;
      if (diagnostics) diagnostics.fastContacts += 1;
      const bodyRequired = Math.ceil(predictedTravel / Math.max(0.01, safeTravel));
      if (diagnostics && bodyRequired > required) {
        diagnostics.required = Math.min(BOARD_WORLD_PHYSICS.maxAdaptiveMicroSteps, bodyRequired);
        diagnostics.triggerId = body.plugin?.boardId || body.id;
        diagnostics.triggerX = Number(body.position.x.toFixed(2));
        diagnostics.triggerY = Number(body.position.y.toFixed(2));
        diagnostics.triggerSpeed = Number(speed.toFixed(3));
        diagnostics.triggerReason = contactReason;
      }
    }
    required = Math.max(required, Math.ceil(predictedTravel / Math.max(0.01, safeTravel)));
    // Once the solver cap is required, more full-world neighbour searches
    // cannot alter the answer. Dense reservoirs must not pay that cost again
    // for every fast ball in the same step.
    if (required >= BOARD_WORLD_PHYSICS.maxAdaptiveMicroSteps) {
      return BOARD_WORLD_PHYSICS.maxAdaptiveMicroSteps;
    }
  }
  return Math.min(BOARD_WORLD_PHYSICS.maxAdaptiveMicroSteps, required);
}

export function stepBoardWorld(engine, ballBodies, stepMs = BOARD_WORLD_PHYSICS.fixedStepMs,
  fixtures = null, minimumMicroSteps = 1, beforeMicroStep = null) {
  if (!engine.plugin.boardAdaptiveStats) engine.plugin.boardAdaptiveStats = {};
  const adaptiveMicroSteps = adaptiveBallMicroSteps(ballBodies, stepMs, fixtures,
    engine.plugin.boardAdaptiveStats);
  const microSteps = Math.max(minimumMicroSteps, adaptiveMicroSteps);
  const microStepMs = stepMs / microSteps;
  const baseIterations = {
    positionIterations: engine.positionIterations,
    velocityIterations: engine.velocityIterations,
    constraintIterations: engine.constraintIterations,
  };
  // Four position passes keep loaded valve and steady architecture contacts
  // below the visible clipping tolerance at every sampled pose.
  const iterationBudget = boardMicroStepIterationBudget(baseIterations, microSteps, 4);
  const previousDelta = engine.timing.lastDelta;
  if (previousDelta > 0 && Math.abs(previousDelta - microStepMs) > 1e-7) {
    // Matter caches impulses in step-sized units. Reusing a coarse step's
    // contact impulse in a tiny sweep step can launch an otherwise resting
    // pile. Rebuild contact impulses at the new step size. Actual body velocity
    // is preserved; only the solver's cached estimate is discarded.
    for (const pair of engine.pairs.list) for (const contact of pair.contacts) {
      contact.normalImpulse = 0;
      contact.tangentImpulse = 0;
    }
  }
  if (microSteps > 1 && fixtures) {
    // Powered fixtures have already moved once for the full fixed step. Their
    // contact velocity must represent one microstep's share; repeating the full
    // displacement in a tiny step multiplies the impulse on touching balls.
    for (const body of fixtures) {
      if (!body.isStatic) continue;
      body.positionPrev.x = body.position.x - (body.position.x - body.positionPrev.x) / microSteps;
      body.positionPrev.y = body.position.y - (body.position.y - body.positionPrev.y) / microSteps;
      body.anglePrev = body.angle - (body.angle - body.anglePrev) / microSteps;
      Body.updateVelocities(body);
    }
  }
  engine.positionIterations = iterationBudget.positionIterations;
  engine.velocityIterations = iterationBudget.velocityIterations;
  engine.constraintIterations = iterationBudget.constraintIterations;
  try {
    for (let index = 0; index < microSteps; index += 1) {
      beforeMicroStep?.((index + 1) / microSteps);
      applyBoardWorldGravity(engine);
      updateBoardEngine(engine, microStepMs);
    }
  } finally {
    engine.positionIterations = baseIterations.positionIterations;
    engine.velocityIterations = baseIterations.velocityIterations;
    engine.constraintIterations = baseIterations.constraintIterations;
  }
  return microSteps;
}

/** Preserve a 60 Hz-authored response when the solver runs at 120 Hz. */
export function fixedStepResponse(responseAt60Hz) {
  const cadence = BOARD_WORLD_PHYSICS.fixedStepMs / (1000 / 60);
  return 1 - ((1 - responseAt60Hz) ** cadence);
}

export function fixedStepDecay(decayAt60Hz) {
  const cadence = BOARD_WORLD_PHYSICS.fixedStepMs / (1000 / 60);
  return decayAt60Hz ** cadence;
}
