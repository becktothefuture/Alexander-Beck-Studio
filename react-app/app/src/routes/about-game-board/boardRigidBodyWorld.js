import Matter from 'matter-js';
import { createBoardCircleContactGuard } from './boardCircleContacts.js';
import { createBoardCircleFixtureContacts } from './boardCircleFixtureContacts.js';

const { Body, Events, Sleeping } = Matter;

export const BOARD_RIGID_BODY_METRE_SCALE = 1000 / 9.81;
const MATTER_BASE_DELTA_MS = 1000 / 60;
const FIXED_STEP_MS = 1000 / 60;
const MINIMUM_NATIVE_STEPS = 1;
// The authored cold pack is tangent at exactly 2r. A positive skin on both
// circles enlarges that rest shape and stores artificial compression across
// every row, so true circles use no extra ball/ball margin. Architecture keeps
// its small margin independently below.
const BALL_CONTACT_SKIN_METRES = 0;
const FIXTURE_CONTACT_SKIN_METRES = 0.006;
const POSE_EPSILON = 1e-7;
const CONTACT_DISTANCE_METRES = BALL_CONTACT_SKIN_METRES + FIXTURE_CONTACT_SKIN_METRES + 0.001;
const INTERACTION_FIXTURE = /^(?:seesaw|.*-leaf|(?:large|small)-drum|rail:drum-transfer-)/;
const ZERO_VELOCITY_FIXTURES = new Set(['reservoir-gate', 'meter-gate']);

let backendPromise = import.meta.hot?.data?.boardRigidBodyBackendPromise || null;
let backend = import.meta.hot?.data?.boardRigidBodyBackend || null;

if (import.meta.hot) {
  import.meta.hot.dispose(data => {
    data.boardRigidBodyBackendPromise = backendPromise;
    data.boardRigidBodyBackend = backend;
  });
}

/** Load Rapier once before the synchronous board factory is created. */
export async function loadBoardRigidBodyBackend() {
  if (!backendPromise) {
    backendPromise = import('@dimforge/rapier2d-compat').then(async module => {
      const loaded = module.default || module;
      await loaded.init();
      backend = loaded;
      return loaded;
    });
  }
  // A development reload can inherit a still-pending promise whose callback
  // belongs to the old module. Bind its result in this module too, otherwise
  // a saved edit can leave the new world factory without its loaded backend.
  backend = await backendPromise;
  return backend;
}

function boardToMetres(value) {
  return value / BOARD_RIGID_BODY_METRE_SCALE;
}

function metresToBoard(value) {
  return value * BOARD_RIGID_BODY_METRE_SCALE;
}

function matterVelocityToMetres(value) {
  return boardToMetres(value) * (1000 / MATTER_BASE_DELTA_MS);
}

function rapierVelocityToMatter(value) {
  return metresToBoard(value) * (MATTER_BASE_DELTA_MS / 1000);
}

function closeEnough(a, b) {
  return Math.abs(a - b) <= POSE_EPSILON;
}

function snapshotProxy(body) {
  return {
    x: body.position.x,
    y: body.position.y,
    angle: body.angle,
    velocityX: body.velocity.x,
    velocityY: body.velocity.y,
    angularVelocity: body.angularVelocity,
    sleeping: Boolean(body.isSleeping),
    fixed: Boolean(body.isStatic),
    sensor: Boolean(body.isSensor),
    category: body.collisionFilter?.category ?? 1,
    mask: body.collisionFilter?.mask ?? 0xffffffff,
    mass: Number.isFinite(body.mass) ? body.mass : 0,
    friction: Number(body.friction) || 0,
    restitution: Number(body.restitution) || 0,
    frictionAir: Math.max(0, Number(body.frictionAir) || 0),
  };
}

function updateProxySnapshot(snapshot, body) {
  snapshot.x = body.position.x;
  snapshot.y = body.position.y;
  snapshot.angle = body.angle;
  snapshot.velocityX = body.velocity.x;
  snapshot.velocityY = body.velocity.y;
  snapshot.angularVelocity = body.angularVelocity;
  snapshot.sleeping = Boolean(body.isSleeping);
  snapshot.fixed = Boolean(body.isStatic);
  snapshot.sensor = Boolean(body.isSensor);
  snapshot.category = body.collisionFilter?.category ?? 1;
  snapshot.mask = body.collisionFilter?.mask ?? 0xffffffff;
  snapshot.mass = Number.isFinite(body.mass) ? body.mass : 0;
  snapshot.friction = Number(body.friction) || 0;
  snapshot.restitution = Number(body.restitution) || 0;
  snapshot.frictionAir = Math.max(0, Number(body.frictionAir) || 0);
  return snapshot;
}

function poseChanged(body, snapshot) {
  return !snapshot || !closeEnough(body.position.x, snapshot.x)
    || !closeEnough(body.position.y, snapshot.y)
    || !closeEnough(body.angle, snapshot.angle);
}

function velocityChanged(body, snapshot) {
  return !snapshot || !closeEnough(body.velocity.x, snapshot.velocityX)
    || !closeEnough(body.velocity.y, snapshot.velocityY)
    || !closeEnough(body.angularVelocity, snapshot.angularVelocity);
}

function bodyTypeFor(body, isMovingFixture, RAPIER) {
  if (isMovingFixture && !ZERO_VELOCITY_FIXTURES.has(body.label)) {
    return RAPIER.RigidBodyType.KinematicPositionBased;
  }
  return body.isStatic ? RAPIER.RigidBodyType.Fixed : RAPIER.RigidBodyType.Dynamic;
}

function collisionGroups(body) {
  const category = (body.collisionFilter?.category ?? 1) & 0xffff;
  const mask = (body.collisionFilter?.mask ?? 0xffff) & 0xffff;
  if (!category || !mask) return 0;
  return ((category << 16) | mask) >>> 0;
}

function inverseLocalPoint(body, vertex) {
  const cosine = Math.cos(-body.angle);
  const sine = Math.sin(-body.angle);
  const dx = vertex.x - body.position.x;
  const dy = vertex.y - body.position.y;
  return [boardToMetres(dx * cosine - dy * sine), boardToMetres(dx * sine + dy * cosine)];
}

function polygonArea(points) {
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    twiceArea += points[index][0] * next[1] - next[0] * points[index][1];
  }
  return Math.abs(twiceArea) / 2;
}

function fallbackPartDescriptor(points, RAPIER) {
  let first = points[0] || [0, 0];
  let second = first;
  let maximumDistanceSquared = 0;
  for (let firstIndex = 0; firstIndex < points.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < points.length; secondIndex += 1) {
      const dx = points[secondIndex][0] - points[firstIndex][0];
      const dy = points[secondIndex][1] - points[firstIndex][1];
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > maximumDistanceSquared) {
        maximumDistanceSquared = distanceSquared;
        first = points[firstIndex];
        second = points[secondIndex];
      }
    }
  }
  const angle = Math.atan2(second[1] - first[1], second[0] - first[0]);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  let minAlong = Infinity;
  let maxAlong = -Infinity;
  let minAcross = Infinity;
  let maxAcross = -Infinity;
  for (const [x, y] of points.length ? points : [[0, 0]]) {
    const along = x * cosine + y * sine;
    const across = -x * sine + y * cosine;
    minAlong = Math.min(minAlong, along); maxAlong = Math.max(maxAlong, along);
    minAcross = Math.min(minAcross, across); maxAcross = Math.max(maxAcross, across);
  }
  const centreAlong = (minAlong + maxAlong) / 2;
  const centreAcross = (minAcross + maxAcross) / 2;
  const centreX = centreAlong * cosine - centreAcross * sine;
  const centreY = centreAlong * sine + centreAcross * cosine;
  // Degenerate sampled SVG segments still need a physical surface. A narrow
  // oriented cuboid retains their measured long axis and thickness without
  // filling the much larger axis-aligned box around a diagonal drum segment.
  return RAPIER.ColliderDesc.cuboid(
    Math.max(0.0005, (maxAlong - minAlong) / 2),
    Math.max(0.0005, (maxAcross - minAcross) / 2),
  ).setTranslation(centreX, centreY).setRotation(angle);
}

function descriptorHasRawShape(descriptor) {
  if (!descriptor?.shape?.intoRaw) return false;
  let rawShape = null;
  try {
    // Rapier's convexHull factory can return a descriptor whose underlying
    // shape is empty for almost-collinear input. createCollider then reports
    // an opaque WASM type error. Validate the actual raw shape up front so the
    // architecture can fall back to its measured local bounds instead.
    rawShape = descriptor.shape.intoRaw();
    return Boolean(rawShape);
  } catch {
    return false;
  } finally {
    rawShape?.free?.();
  }
}

function shapeDescriptors(body, RAPIER) {
  if (body.circleRadius && body.parts.length === 1) {
    return [RAPIER.ColliderDesc.ball(boardToMetres(body.circleRadius))];
  }
  const parts = body.parts.length > 1 ? body.parts.slice(1) : body.parts;
  const descriptors = [];
  for (const part of parts) {
    const localPoints = [];
    for (let index = 0; index < part.vertices.length; index += 1) {
      const local = inverseLocalPoint(body, part.vertices[index]);
      if (!localPoints.some(point => closeEnough(point[0], local[0])
        && closeEnough(point[1], local[1]))) localPoints.push(local);
    }
    if (localPoints.length < 3 || polygonArea(localPoints) <= 1e-10) {
      descriptors.push(fallbackPartDescriptor(localPoints, RAPIER));
      continue;
    }
    const points = new Float32Array(localPoints.flat());
    const descriptor = RAPIER.ColliderDesc.convexHull(points);
    descriptors.push(descriptorHasRawShape(descriptor)
      ? descriptor : fallbackPartDescriptor(localPoints, RAPIER));
  }
  if (descriptors.length) return descriptors;
  return [fallbackPartDescriptor([], RAPIER)];
}

function applyColliderMaterial(collider, body, colliderCount, RAPIER) {
  collider.setSensor(Boolean(body.isSensor));
  collider.setCollisionGroups(collisionGroups(body));
  collider.setFriction(Math.max(0, Number(body.friction) || 0));
  collider.setRestitution(Math.max(0, Number(body.restitution) || 0));
  collider.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min);
  collider.setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max);
  if (!body.isStatic && Number.isFinite(body.mass) && body.mass > 0) {
    collider.setMass(body.mass / Math.max(1, colliderCount));
  }
}

function materialChanged(body, snapshot) {
  return !snapshot || snapshot.sensor !== Boolean(body.isSensor)
    || snapshot.category !== (body.collisionFilter?.category ?? 1)
    || snapshot.mask !== (body.collisionFilter?.mask ?? 0xffffffff)
    || !closeEnough(snapshot.mass, Number.isFinite(body.mass) ? body.mass : 0)
    || !closeEnough(snapshot.friction, Number(body.friction) || 0)
    || !closeEnough(snapshot.restitution, Number(body.restitution) || 0)
    || !closeEnough(snapshot.frictionAir, Math.max(0, Number(body.frictionAir) || 0));
}

function angularDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function pairKey(bodyA, bodyB) {
  return bodyA.id < bodyB.id ? `${bodyA.id}:${bodyB.id}` : `${bodyB.id}:${bodyA.id}`;
}

/**
 * Route-scoped Rapier world. Matter bodies remain the editable geometry and
 * render-facing proxies; only Rapier integrates and resolves contacts.
 */
export function createBoardRigidBodyWorld({ engine, balls, fixtures, movingFixtures }) {
  if (!backend) throw new Error('Call loadBoardRigidBodyBackend() before creating board physics.');
  const RAPIER = backend;
  const world = new RAPIER.World({ x: 0, y: 9.81 });
  world.timestep = FIXED_STEP_MS / 1000;
  world.numSolverIterations = 1;
  world.maxCcdSubsteps = 1;
  world.integrationParameters.contact_natural_frequency = 60;
  world.integrationParameters.normalizedAllowedLinearError = 0.0001;
  world.integrationParameters.normalizedPredictionDistance = 0.002;

  const records = new Map();
  const colliderRecords = new Map();
  const movingSet = new Set(movingFixtures);
  const movingRecords = [];
  const knownBalls = [];
  const knownFixtures = [];
  let membershipReady = false;
  let membershipRebuilds = 0;
  const desired = new Set();
  const interactionPrevious = new Map();
  const interactionCurrent = new Map();
  const interactionStarts = [];
  const interactionActive = [];
  const contactScratch = new Set();
  const liveBallSet = new Set();
  const projectionQueue = [];
  const projectionDepths = [];
  const projectionQueued = new Set();
  const projectionPairScratch = new Set();
  const projectionCandidates = [];
  const sweepImpacted = new Set();
  const circleGuard = createBoardCircleContactGuard({ passes: 12, tolerance: 0.01 });
  const circleFixtureContacts = createBoardCircleFixtureContacts();
  const guardedCircles = [];
  const guardedFixtures = [];
  let circleGuardStats = null;
  const shapeContactScratch = new RAPIER.ShapeContact(
    0,
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },
  );
  let disposed = false;
  let stepCount = 0;
  let materialSyncs = 0;
  let externalPoseSyncs = 0;
  let externalWakeSyncs = 0;
  let additions = 0;
  let removals = 0;
  let lastStepMs = 0;
  let meanStepMs = 0;
  let maximumStepMs = 0;
  let lastContactCount = 0;
  let lastProjectionPasses = 0;
  let maximumProjectionPasses = 0;
  let lastProjectionQueueSize = 0;

  function createRecord(proxy) {
    const isMovingFixture = movingSet.has(proxy);
    const type = bodyTypeFor(proxy, isMovingFixture, RAPIER);
    const dynamic = type === RAPIER.RigidBodyType.Dynamic;
    let descriptor = dynamic ? RAPIER.RigidBodyDesc.dynamic()
      : type === RAPIER.RigidBodyType.KinematicPositionBased
        ? RAPIER.RigidBodyDesc.kinematicPositionBased() : RAPIER.RigidBodyDesc.fixed();
    descriptor = descriptor
      .setTranslation(boardToMetres(proxy.position.x), boardToMetres(proxy.position.y))
      .setRotation(proxy.angle)
      .setCanSleep(dynamic)
      .setSleeping(dynamic && Boolean(proxy.isSleeping))
      .setEnabled((proxy.collisionFilter?.mask ?? 0xffffffff) !== 0 || !proxy.isSensor)
      .setCcdEnabled(dynamic)
      .setLinearDamping(Math.max(0, (Number(proxy.frictionAir) || 0) * 60));
    if (dynamic) {
      descriptor.setLinvel(matterVelocityToMetres(proxy.velocity.x),
        matterVelocityToMetres(proxy.velocity.y));
      descriptor.setAngvel((Number(proxy.angularVelocity) || 0) * 60);
    }
    const rigid = world.createRigidBody(descriptor);
    const descriptors = shapeDescriptors(proxy, RAPIER);
    const colliders = descriptors.map((colliderDescriptor, descriptorIndex) => {
      colliderDescriptor
        .setSensor(Boolean(proxy.isSensor))
        .setCollisionGroups(collisionGroups(proxy))
        .setFriction(Math.max(0, Number(proxy.friction) || 0))
        .setRestitution(Math.max(0, Number(proxy.restitution) || 0))
        .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
        .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max);
      if (dynamic && Number.isFinite(proxy.mass) && proxy.mass > 0) {
        colliderDescriptor.setMass(proxy.mass / descriptors.length);
      }
      let collider;
      try {
        collider = world.createCollider(colliderDescriptor, rigid);
      } catch (error) {
        const identity = proxy.plugin?.boardId || proxy.label || `matter-${proxy.id}`;
        throw new Error(
          `Rapier collider creation failed for ${identity} part ${descriptorIndex + 1}/${descriptors.length}: ${error.message}`,
          { cause: error },
        );
      }
      collider.setContactSkin(dynamic
        ? BALL_CONTACT_SKIN_METRES : FIXTURE_CONTACT_SKIN_METRES);
      return collider;
    });
    const record = {
      proxy,
      rigid,
      type,
      colliders,
      moving: isMovingFixture,
      snapshot: snapshotProxy(proxy),
      translation: { x: boardToMetres(proxy.position.x), y: boardToMetres(proxy.position.y) },
      exportPosition: { x: proxy.position.x, y: proxy.position.y },
      kinematicStart: { x: proxy.position.x, y: proxy.position.y, angle: proxy.angle },
      kinematicTarget: { x: proxy.position.x, y: proxy.position.y, angle: proxy.angle },
      kinematicCommand: { x: proxy.position.x, y: proxy.position.y, angle: proxy.angle },
      movedThisMicroStep: false,
      movedDuringStep: false,
      circle: { x: 0, y: 0, radius: proxy.circleRadius || 0,
        inverseMass: 0, vx: 0, vy: 0, active: false, changed: false, record: null },
    };
    records.set(proxy, record);
    if (record.moving) movingRecords.push(record);
    for (const collider of colliders) colliderRecords.set(collider.handle, record);
    additions += 1;
    return record;
  }

  function removeRecord(record) {
    for (const collider of record.colliders) colliderRecords.delete(collider.handle);
    world.removeRigidBody(record.rigid);
    records.delete(record.proxy);
    if (record.moving) movingRecords.splice(movingRecords.indexOf(record), 1);
    removals += 1;
  }

  function sameMembers(current, previous) {
    if (current.length !== previous.length) return false;
    for (let index = 0; index < current.length; index += 1) {
      if (current[index] !== previous[index]) return false;
    }
    return true;
  }

  function syncMembership() {
    // Capture/retirement can replace a body without changing the count. Compare
    // references, then reuse membership sets while the actual roster is stable.
    if (membershipReady && sameMembers(balls, knownBalls)
      && sameMembers(fixtures, knownFixtures)) return;
    desired.clear();
    for (const proxy of fixtures) desired.add(proxy);
    liveBallSet.clear();
    for (const proxy of balls) {
      desired.add(proxy);
      liveBallSet.add(proxy);
    }
    for (const proxy of desired) if (!records.has(proxy)) createRecord(proxy);
    for (const record of records.values()) if (!desired.has(record.proxy)) removeRecord(record);
    knownBalls.length = balls.length;
    knownFixtures.length = fixtures.length;
    for (let index = 0; index < balls.length; index += 1) knownBalls[index] = balls[index];
    for (let index = 0; index < fixtures.length; index += 1) knownFixtures[index] = fixtures[index];
    membershipReady = true;
    membershipRebuilds += 1;
  }

  function wakeTouchingNeighbours(record) {
    for (const collider of record.colliders) {
      world.contactPairsWith(collider, otherCollider => {
        const otherRecord = colliderRecords.get(otherCollider.handle);
        if (!otherRecord?.rigid.isDynamic() || !otherRecord.rigid.isSleeping()) return;
        const contact = rapierContact(collider, otherCollider);
        if (contact && contact.distance <= CONTACT_DISTANCE_METRES) otherRecord.rigid.wakeUp();
      });
    }
  }

  function syncDynamicProxy(record) {
    if (record.preparationPinned) return;
    const { proxy, rigid } = record;
    const snapshot = record.snapshot;
    const targetType = bodyTypeFor(proxy, false, RAPIER);
    if (record.type !== targetType) {
      rigid.setBodyType(targetType, !proxy.isSleeping);
      record.type = targetType;
    }
    if (poseChanged(proxy, snapshot)) {
      record.translation.x = boardToMetres(proxy.position.x);
      record.translation.y = boardToMetres(proxy.position.y);
      rigid.setTranslation(record.translation, !proxy.isSleeping);
      rigid.setRotation(proxy.angle, !proxy.isSleeping);
      externalPoseSyncs += 1;
    }
    if (velocityChanged(proxy, snapshot)) {
      rigid.setLinvel({ x: matterVelocityToMetres(proxy.velocity.x),
        y: matterVelocityToMetres(proxy.velocity.y) }, !proxy.isSleeping);
      rigid.setAngvel((Number(proxy.angularVelocity) || 0) * 60, !proxy.isSleeping);
    }
    if (snapshot && snapshot.sleeping !== Boolean(proxy.isSleeping)) {
      if (proxy.isSleeping) rigid.sleep();
      else {
        rigid.wakeUp();
        wakeTouchingNeighbours(record);
      }
      externalWakeSyncs += 1;
    }
    if (materialChanged(proxy, snapshot)) {
      rigid.setEnabled((proxy.collisionFilter?.mask ?? 0xffffffff) !== 0 || !proxy.isSensor);
      rigid.setLinearDamping(Math.max(0, (Number(proxy.frictionAir) || 0) * 60));
      for (const collider of record.colliders) {
        applyColliderMaterial(collider, proxy, record.colliders.length, RAPIER);
      }
      materialSyncs += 1;
    }
  }

  function setKinematicPose(record, x, y, angle, zeroContactVelocity) {
    const command = record.kinematicCommand;
    const changed = !closeEnough(command.x, x) || !closeEnough(command.y, y)
      || !closeEnough(command.angle, angle);
    if (zeroContactVelocity && !changed) return false;
    const translation = record.translation;
    translation.x = boardToMetres(x);
    translation.y = boardToMetres(y);
    if (zeroContactVelocity) {
      // Scroll is an authored pose command, not a powered motor. Keep the
      // valve fixed while sampling its sweep so Rapier never derives a large
      // contact velocity from a scroll jump.
      if (!record.rigid.isFixed()) record.rigid.setBodyType(RAPIER.RigidBodyType.Fixed, true);
      record.rigid.setTranslation(translation, true);
      record.rigid.setRotation(angle, true);
    } else {
      record.rigid.setNextKinematicTranslation(translation);
      record.rigid.setNextKinematicRotation(angle);
    }
    command.x = x;
    command.y = y;
    command.angle = angle;
    return changed;
  }

  function moveDynamicBy(record, deltaX, deltaY) {
    const current = record.rigid.translation();
    record.translation.x = current.x + deltaX;
    record.translation.y = current.y + deltaY;
    record.rigid.setTranslation(record.translation, true);
  }

  function resolveZeroVelocitySweepContacts(
    valveRecord,
    maximumPasses = 16,
    maximumContactRings = 2,
    includeSweepSeeds = false,
  ) {
    projectionQueue.length = 0;
    projectionDepths.length = 0;
    projectionQueued.clear();
    projectionQueued.add(valveRecord);
    projectionQueue.push(valveRecord);
    projectionDepths.push(0);
    if (includeSweepSeeds) {
      for (const record of sweepImpacted) {
        if (projectionQueued.has(record)) continue;
        projectionQueued.add(record);
        projectionQueue.push(record);
        projectionDepths.push(0);
      }
    }
    lastProjectionPasses = 0;
    // Resolve the small neighbourhood swept by the valve. Bound propagation
    // to 64 bodies; the exact-circle pass then handles the full pile once.
    // An unbounded island walk here makes reverse scrolling pause for seconds.
    for (let pass = 0; pass < maximumPasses; pass += 1) {
      let deepestPenetration = 0;
      let moved = false;
      projectionPairScratch.clear();
      for (let index = 0; index < projectionQueue.length; index += 1) {
        const sourceRecord = projectionQueue[index];
        const sourceDepth = projectionDepths[index];
        for (const collider of sourceRecord.colliders) {
          // Query the collider at its current pose. The narrow-phase contact
          // graph still describes the previous native step and can miss a
          // ball that entered this sampled valve pose.
          projectionCandidates.length = 0;
          world.intersectionsWithShape(
            collider.translation(), collider.rotation(), collider.shape,
            otherCollider => {
              projectionCandidates.push(otherCollider);
              return true;
            },
          );
          world.contactPairsWith(collider, otherCollider => {
            projectionCandidates.push(otherCollider);
          });
          // Rapier's shape query holds a read borrow on the world. Apply
          // corrections after the query callback returns so body writes are
          // accepted by the WASM solver.
          for (const otherCollider of projectionCandidates) {
            // A captured/retired ball may have left the native world since
            // the preceding contact graph was built. Rapier resolves that
            // stale handle to null until the next native step.
            if (!otherCollider) continue;
            const otherRecord = colliderRecords.get(otherCollider.handle);
            if (!otherRecord || otherRecord === sourceRecord) continue;
            if (sourceRecord.proxy.isSensor || otherRecord.proxy.isSensor) continue;
            const contactKey = collider.handle < otherCollider.handle
              ? `${collider.handle}:${otherCollider.handle}`
              : `${otherCollider.handle}:${collider.handle}`;
            if (projectionPairScratch.has(contactKey)) continue;
            projectionPairScratch.add(contactKey);
            const contact = rapierContact(collider, otherCollider);
            if (!contact) continue;
            const sourceDynamic = sourceRecord.rigid.isDynamic();
            const otherDynamic = otherRecord.rigid.isDynamic();
            if (!sourceDynamic && !otherDynamic) continue;
            if (sourceRecord === valveRecord && otherDynamic && contact.distance < -0.00001) {
              sweepImpacted.add(otherRecord);
            }
            if (projectionQueue.length < 64 && sourceDynamic && sourceDepth < maximumContactRings
              && !projectionQueued.has(sourceRecord)) {
              projectionQueued.add(sourceRecord);
              projectionQueue.push(sourceRecord);
              projectionDepths.push(sourceDepth + 1);
            }
            if (projectionQueue.length < 64 && otherDynamic && sourceDepth < maximumContactRings
              && !projectionQueued.has(otherRecord)) {
              projectionQueued.add(otherRecord);
              projectionQueue.push(otherRecord);
              projectionDepths.push(sourceDepth + 1);
            }
            if (contact.distance >= -0.00001) continue;
            const depth = -contact.distance * 1.2 + 0.00001;
            deepestPenetration = Math.max(deepestPenetration, depth);
            if (sourceDynamic && otherDynamic) {
              const sourceInverseMass = 1 / Math.max(1e-9, sourceRecord.rigid.mass());
              const otherInverseMass = 1 / Math.max(1e-9, otherRecord.rigid.mass());
              const inverseMassTotal = sourceInverseMass + otherInverseMass;
              const sourceShare = sourceInverseMass / inverseMassTotal;
              const otherShare = otherInverseMass / inverseMassTotal;
              moveDynamicBy(sourceRecord,
                -contact.normalX * depth * sourceShare,
                -contact.normalY * depth * sourceShare);
              moveDynamicBy(otherRecord,
                contact.normalX * depth * otherShare,
                contact.normalY * depth * otherShare);
            } else if (sourceDynamic) {
              moveDynamicBy(sourceRecord,
                -contact.normalX * depth, -contact.normalY * depth);
            } else if (otherDynamic) {
              moveDynamicBy(otherRecord,
                contact.normalX * depth, contact.normalY * depth);
            }
            moved ||= sourceDynamic || otherDynamic;
          }
        }
      }
      if (moved) world.propagateModifiedBodyPositionsToColliders();
      lastProjectionPasses = pass + 1;
      if (deepestPenetration <= 0.000001) break;
    }
    lastProjectionQueueSize = projectionQueue.length;
    maximumProjectionPasses = Math.max(maximumProjectionPasses, lastProjectionPasses);
  }

  function exportDynamic(record) {
    const { proxy, rigid } = record;
    if (record.type !== RAPIER.RigidBodyType.Dynamic) {
      updateProxySnapshot(record.snapshot, proxy);
      return;
    }
    // Do not round-trip an already validated sleeping body through Rapier's
    // f32 position storage. This keeps the authored cold-pack pose bit-for-bit
    // stable until a local contact or explicit edit wakes that body.
    if (rigid.isSleeping() && record.snapshot.sleeping) return;
    const translation = rigid.translation();
    const linear = rigid.linvel();
    const angle = rigid.rotation();
    const velocityX = rapierVelocityToMatter(linear.x);
    const velocityY = rapierVelocityToMatter(linear.y);
    const angularVelocity = rigid.angvel() / 60;
    record.exportPosition.x = metresToBoard(translation.x);
    record.exportPosition.y = metresToBoard(translation.y);
    Body.setPosition(proxy, record.exportPosition, false);
    Body.setAngle(proxy, angle, false);
    proxy.positionPrev.x = proxy.position.x - velocityX;
    proxy.positionPrev.y = proxy.position.y - velocityY;
    proxy.anglePrev = proxy.angle - angularVelocity;
    proxy.velocity.x = velocityX;
    proxy.velocity.y = velocityY;
    proxy.speed = Math.hypot(velocityX, velocityY);
    proxy.angularVelocity = angularVelocity;
    proxy.angularSpeed = Math.abs(angularVelocity);
    proxy.isSleeping = rigid.isSleeping();
    proxy.sleepCounter = proxy.isSleeping ? proxy.sleepThreshold : 0;
    proxy.motion = proxy.isSleeping ? 0 : proxy.speed * proxy.speed
      + proxy.angularSpeed * proxy.angularSpeed;
    updateProxySnapshot(record.snapshot, proxy);
  }

  function guardCircleContacts() {
    const guardStart = performance.now();
    guardedCircles.length = 0;
    let hasAwakeBall = false;
    for (const proxy of balls) {
      const record = records.get(proxy);
      if (!record || record.type !== RAPIER.RigidBodyType.Dynamic
        || proxy.isSensor || !collisionGroups(proxy)) continue;
      const circle = record.circle;
      const position = record.rigid.translation();
      const velocity = record.rigid.linvel();
      circle.x = metresToBoard(position.x);
      circle.y = metresToBoard(position.y);
      circle.vx = metresToBoard(velocity.x);
      circle.vy = metresToBoard(velocity.y);
      circle.inverseMass = 1 / Math.max(1e-9, proxy.mass);
      circle.active = !record.rigid.isSleeping();
      circle.collisionFilter = proxy.collisionFilter;
      circle.record = record;
      circle.index = guardedCircles.length;
      guardedCircles.push(circle);
      hasAwakeBall ||= circle.active;
    }
    if (!hasAwakeBall) return;

    // Rapier handles impulses and continuous motion. A light position solve
    // then enforces hard circle volume under the weight of the full reservoir.
    // Fixture contacts participate in the same solve, so separating neighbours
    // cannot move a boundary ball through the funnel or a moving mechanism.
    guardedFixtures.length = 0;
    for (const record of records.values()) {
      if (record.type === RAPIER.RigidBodyType.Dynamic || record.proxy.isSensor
        || !collisionGroups(record.proxy)) continue;
      guardedFixtures.push(record.proxy);
    }
    const fixtureConstraints = circleFixtureContacts.update(guardedCircles, guardedFixtures);
    const constraintsReady = performance.now();
    circleGuardStats = circleGuard.solve(guardedCircles, fixtureConstraints);
    const circlesSolved = performance.now();
    for (const circle of guardedCircles) {
      if (!circle.changed) continue;
      const record = circle.record;
      record.translation.x = boardToMetres(circle.x);
      record.translation.y = boardToMetres(circle.y);
      // Repeatedly waking an already active body resets its rest timer. Only a
      // sleeping neighbour displaced by this solve needs an explicit wake.
      const wake = record.rigid.isSleeping();
      record.rigid.setTranslation(record.translation, wake);
      record.rigid.setLinvel({ x: boardToMetres(circle.vx), y: boardToMetres(circle.vy) }, false);
    }
    world.propagateModifiedBodyPositionsToColliders();
    circleGuardStats.constraints = fixtureConstraints.length;
    circleGuardStats.constraintMs = constraintsReady - guardStart;
    circleGuardStats.solveMs = circlesSolved - constraintsReady;
    circleGuardStats.writeMs = performance.now() - circlesSolved;
  }

  function rapierContact(colliderA, colliderB) {
    const exact = colliderA.contactCollider(
      colliderB,
      CONTACT_DISTANCE_METRES,
      shapeContactScratch,
    );
    if (!exact || exact.distance > CONTACT_DISTANCE_METRES) return null;
    return {
      distance: exact.distance,
      normalX: exact.normal1.x,
      normalY: exact.normal1.y,
      pointX: (exact.point1.x + exact.point2.x) / 2,
      pointY: (exact.point1.y + exact.point2.y) / 2,
    };
  }

  function matterPair(recordA, recordB, contact, id = pairKey(recordA.proxy, recordB.proxy)) {
    const proxyA = recordA.proxy;
    const proxyB = recordB.proxy;
    const depth = Math.max(0, -contact.distance) * BOARD_RIGID_BODY_METRE_SCALE;
    const collision = {
      collided: true,
      bodyA: proxyA,
      bodyB: proxyB,
      parentA: proxyA.parent || proxyA,
      parentB: proxyB.parent || proxyB,
      depth,
      // Matter collision normals point from B toward A. Rapier's exact
      // normal1 points out of A toward B, so invert it at this boundary.
      normal: { x: -contact.normalX, y: -contact.normalY },
      tangent: { x: contact.normalY, y: -contact.normalX },
      penetration: { x: -contact.normalX * depth, y: -contact.normalY * depth },
      supports: [],
      supportCount: 0,
      boardNativeContact: true,
      boardNativeNormalOnA: { x: contact.normalX, y: contact.normalY },
      boardNativePoint: {
        x: metresToBoard(contact.pointX),
        y: metresToBoard(contact.pointY),
      },
    };
    return {
      id,
      bodyA: proxyA,
      bodyB: proxyB,
      collision,
      isActive: true,
      isSensor: Boolean(proxyA.isSensor || proxyB.isSensor),
      restitution: Math.max(proxyA.restitution || 0, proxyB.restitution || 0),
      friction: Math.min(proxyA.friction || 0, proxyB.friction || 0),
      frictionStatic: Math.max(proxyA.frictionStatic || 0, proxyB.frictionStatic || 0),
      separation: depth,
    };
  }

  function forEachContactRecord(visitor, onlyInteractionFixtures = false) {
    contactScratch.clear();
    for (const record of records.values()) {
      if (onlyInteractionFixtures && !INTERACTION_FIXTURE.test(record.proxy.label || '')) continue;
      for (const collider of record.colliders) {
        world.contactPairsWith(collider, other => {
          if (!onlyInteractionFixtures && other.handle <= collider.handle) return;
          const otherRecord = colliderRecords.get(other.handle);
          if (!otherRecord || otherRecord === record) return;
          if (onlyInteractionFixtures && !liveBallSet.has(otherRecord.proxy)) return;
          const parentKey = pairKey(record.proxy, otherRecord.proxy);
          const colliderKey = collider.handle < other.handle
            ? `${parentKey}#${collider.handle}:${other.handle}`
            : `${parentKey}#${other.handle}:${collider.handle}`;
          if (contactScratch.has(colliderKey)) return;
          const contact = rapierContact(collider, other);
          if (!contact) return;
          contactScratch.add(colliderKey);
          visitor(colliderKey, record, otherRecord, contact);
        });
      }
    }
  }

  function emitInteractionEvents() {
    interactionCurrent.clear();
    forEachContactRecord((key, fixtureRecord, ballRecord, contact) => {
      interactionCurrent.set(key, matterPair(fixtureRecord, ballRecord, contact, key));
    }, true);
    interactionStarts.length = 0;
    interactionActive.length = 0;
    for (const [key, pair] of interactionCurrent) {
      if (interactionPrevious.has(key)) interactionActive.push(pair);
      else interactionStarts.push(pair);
    }
    if (interactionStarts.length) Events.trigger(engine, 'collisionStart', {
      pairs: interactionStarts,
      timestamp: engine.timing.timestamp,
      delta: world.timestep * 1000,
    });
    if (interactionActive.length) Events.trigger(engine, 'collisionActive', {
      pairs: interactionActive,
      timestamp: engine.timing.timestamp,
      delta: world.timestep * 1000,
    });
    interactionPrevious.clear();
    for (const [key, pair] of interactionCurrent) interactionPrevious.set(key, pair);
  }

  function refreshContacts() {
    syncMembership();
    const list = engine.pairs.list;
    list.length = 0;
    const table = engine.pairs.table;
    for (const key of Object.keys(table)) delete table[key];
    forEachContactRecord((key, recordA, recordB, contact) => {
      const pair = matterPair(recordA, recordB, contact, key);
      list.push(pair);
      table[key] = pair;
    });
    lastContactCount = list.length;
    return list;
  }

  function getContactSnapshot() {
    syncMembership();
    const contactsByPair = new Map();
    forEachContactRecord((_key, recordA, recordB, contact) => {
      const aIsBall = liveBallSet.has(recordA.proxy);
      const bIsBall = liveBallSet.has(recordB.proxy);
      if (aIsBall === bIsBall) return;
      const ball = aIsBall ? recordA.proxy : recordB.proxy;
      const fixture = aIsBall ? recordB.proxy : recordA.proxy;
      const snapshot = {
        ball: ball.plugin?.boardId || ball.id,
        fixture: fixture.label || fixture.plugin?.boardId || fixture.id,
        depth: Math.max(0, -contact.distance) * BOARD_RIGID_BODY_METRE_SCALE,
        x: metresToBoard(contact.pointX),
        y: metresToBoard(contact.pointY),
      };
      const key = pairKey(ball, fixture);
      const previous = contactsByPair.get(key);
      if (!previous || snapshot.depth > previous.depth) contactsByPair.set(key, snapshot);
    });
    return [...contactsByPair.values()];
  }

  function step(stepMs = FIXED_STEP_MS, minimumSteps = 1, beforeMicroStep = null, preparing = false) {
    if (disposed) return 0;
    const startTime = performance.now();
    syncMembership();
    sweepImpacted.clear();
    for (const record of records.values()) if (!record.moving) syncDynamicProxy(record);
    const motionSteps = Math.max(1, Math.floor(Number(minimumSteps) || 1));
    const nativeSteps = beforeMicroStep ? MINIMUM_NATIVE_STEPS
      : Math.max(MINIMUM_NATIVE_STEPS, motionSteps);
    const resolvedStepMs = Math.max(0.001, Number(stepMs) || FIXED_STEP_MS);
    const nativeStepMs = resolvedStepMs / nativeSteps;
    for (const record of movingRecords) {
      record.movedDuringStep = false;
      const translation = record.rigid.translation();
      record.kinematicStart.x = metresToBoard(translation.x);
      record.kinematicStart.y = metresToBoard(translation.y);
      record.kinematicStart.angle = record.rigid.rotation();
      record.kinematicTarget.x = record.proxy.position.x;
      record.kinematicTarget.y = record.proxy.position.y;
      record.kinematicTarget.angle = record.proxy.angle;
      if (ZERO_VELOCITY_FIXTURES.has(record.proxy.label)) record.rigid.setAdditionalSolverIterations(0);
    }
    // Sample every authored scroll pose without advancing world time. These
    // fixed-pose queries preserve the full swept volume while avoiding a
    // global 5k-body solve for each of as many as 64 geometry samples.
    for (let index = 0; index < motionSteps; index += 1) {
      const fraction = Math.min(1, (index + 1) / motionSteps);
      beforeMicroStep?.(fraction);
      for (const record of movingRecords) {
        if (!ZERO_VELOCITY_FIXTURES.has(record.proxy.label)) continue;
        record.movedThisMicroStep = setKinematicPose(
          record,
          record.proxy.position.x,
          record.proxy.position.y,
          record.proxy.angle, true);
        if (record.movedThisMicroStep) {
          record.movedDuringStep = true;
          // Put this sampled fixed pose into the collider set, then carry
          // its displacement through the local contact island before the
          // solver sees it. This prevents both tunnelling and a synthetic
          // motor impulse from a scroll-owned valve.
          world.propagateModifiedBodyPositionsToColliders();
          resolveZeroVelocitySweepContacts(record, 1, 0);
        }
      }
    }
    for (const record of movingRecords) {
      if (record.movedDuringStep && ZERO_VELOCITY_FIXTURES.has(record.proxy.label)) {
        resolveZeroVelocitySweepContacts(record, 32, 6, true);
      }
    }
    // Remove displacement compression before it can turn into native solver
    // velocity. Scroll commands move the valve, not the scene's world clock.
    if (sweepImpacted.size) guardCircleContacts();
    // Advance the real scene by the requested elapsed time exactly once.
    // Powered fixtures still interpolate across native solver steps if that
    // baseline is increased later; scroll-owned valves remain fixed.
    for (let index = 0; index < nativeSteps; index += 1) {
      const fraction = (index + 1) / nativeSteps;
      for (const record of movingRecords) {
        if (ZERO_VELOCITY_FIXTURES.has(record.proxy.label)) continue;
        const start = record.kinematicStart;
        const target = record.kinematicTarget;
          setKinematicPose(record,
            start.x + (target.x - start.x) * fraction,
            start.y + (target.y - start.y) * fraction,
            start.angle + angularDelta(start.angle, target.angle) * fraction,
            false);
      }
      world.timestep = nativeStepMs / 1000;
      // Material stiffness is time-based. Keep its physical frequency stable
      // when a scroll sweep uses more pose samples; increasing it with the
      // sample count stores artificial energy in the packed reservoir.
      world.integrationParameters.contact_natural_frequency = 60;
      world.step();
      engine.timing.timestamp += nativeStepMs;
      engine.timing.lastDelta = nativeStepMs;
    }
    for (const record of movingRecords) {
      if (record.movedDuringStep && ZERO_VELOCITY_FIXTURES.has(record.proxy.label)) {
        resolveZeroVelocitySweepContacts(record, 32, 6, true);
      }
    }
    for (const record of movingRecords) {
      if (ZERO_VELOCITY_FIXTURES.has(record.proxy.label)) {
        record.rigid.setAdditionalSolverIterations(0);
      }
    }
    for (const record of sweepImpacted) record.rigid.setAdditionalSolverIterations(0);
    // During the unshown gravity drop, native circle contacts do the settling.
    // Repeated positional projection would wake the entire dense contact
    // island before it can sleep. Visible motion keeps per-step protection.
    if (!preparing) guardCircleContacts();
    for (const record of records.values()) if (!record.moving) exportDynamic(record);
    emitInteractionEvents();
    stepCount += 1;
    lastStepMs = performance.now() - startTime;
    meanStepMs += (lastStepMs - meanStepMs) / stepCount;
    maximumStepMs = Math.max(maximumStepMs, lastStepMs);
    engine.timing.lastElapsed = lastStepMs;
    return motionSteps;
  }

  /** Keep authored automatic fixtures aligned while the closed reservoir is
   * completely asleep. This updates only the handful of moving colliders and
   * does not integrate gravity or traverse the ball contact graph. */
  function syncMovingFixtures() {
    if (disposed) return 0;
    let changedCount = 0;
    for (const record of movingRecords) {
      const { proxy, rigid, kinematicCommand: command } = record;
      const changed = !closeEnough(command.x, proxy.position.x)
        || !closeEnough(command.y, proxy.position.y)
        || !closeEnough(command.angle, proxy.angle);
      if (!changed) continue;
      record.translation.x = boardToMetres(proxy.position.x);
      record.translation.y = boardToMetres(proxy.position.y);
      if (ZERO_VELOCITY_FIXTURES.has(proxy.label)) {
        if (!rigid.isFixed()) rigid.setBodyType(RAPIER.RigidBodyType.Fixed, false);
      } else if (!rigid.isKinematic()) {
        rigid.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, false);
      }
      rigid.setTranslation(record.translation, false);
      rigid.setRotation(proxy.angle, false);
      if (rigid.isKinematic()) {
        rigid.setNextKinematicTranslation(record.translation);
        rigid.setNextKinematicRotation(proxy.angle);
      }
      command.x = proxy.position.x;
      command.y = proxy.position.y;
      command.angle = proxy.angle;
      changedCount += 1;
    }
    return changedCount;
  }

  function getStats() {
    let sleeping = 0;
    let dynamic = 0;
    let fixed = 0;
    let kinematic = 0;
    let colliders = 0;
    let dynamicMass = 0;
    for (const record of records.values()) {
      colliders += record.colliders.length;
      if (record.rigid.isDynamic()) {
        dynamic += 1;
        dynamicMass += record.rigid.mass();
        if (record.rigid.isSleeping()) sleeping += 1;
      } else if (record.rigid.isKinematic()) kinematic += 1;
      else fixed += 1;
    }
    return {
      backend: 'rapier2d',
      fixedStepMs: FIXED_STEP_MS,
      metreScale: BOARD_RIGID_BODY_METRE_SCALE,
      bodies: records.size,
      dynamic,
      fixed,
      kinematic,
      colliders,
      dynamicMass: Number(dynamicMass.toFixed(6)),
      sleeping,
      steps: stepCount,
      lastStepMs: Number(lastStepMs.toFixed(3)),
      meanStepMs: Number(meanStepMs.toFixed(3)),
      maximumStepMs: Number(maximumStepMs.toFixed(3)),
      materialSyncs,
      externalPoseSyncs,
      externalWakeSyncs,
      additions,
      removals,
      membershipRebuilds,
      movingFixtures: movingRecords.length,
      contacts: lastContactCount,
      lastProjectionPasses,
      maximumProjectionPasses,
      lastProjectionQueueSize,
      circleGuard: circleGuardStats ? { ...circleGuardStats } : null,
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    records.clear();
    movingRecords.length = 0;
    knownBalls.length = 0;
    knownFixtures.length = 0;
    colliderRecords.clear();
    interactionPrevious.clear();
    interactionCurrent.clear();
    world.free();
  }

  function pinPreparedBody(body) {
    const record = records.get(body);
    if (!record || record.preparationPinned) return;
    record.preparationPinned = true;
    record.rigid.setBodyType(RAPIER.RigidBodyType.Fixed, false);
    record.type = RAPIER.RigidBodyType.Fixed;
    Sleeping.set(body, true);
    updateProxySnapshot(record.snapshot, body);
  }

  function releasePreparedBodies() {
    for (const record of records.values()) {
      if (!record.preparationPinned) continue;
      record.preparationPinned = false;
      record.proxy.plugin.boardPreparedRest = false;
      record.rigid.setBodyType(RAPIER.RigidBodyType.Dynamic, false);
      record.type = RAPIER.RigidBodyType.Dynamic;
      record.rigid.setLinvel({ x: 0, y: 0 }, false);
      record.rigid.setAngvel(0, false);
      record.rigid.sleep();
      Sleeping.set(record.proxy, true);
      updateProxySnapshot(record.snapshot, record.proxy);
    }
  }

  /** Called only after the preparation owner verifies that every ball has a
   * real support chain and negligible motion. Put the native and display
   * bodies to sleep together so the resting pile does not keep micro-jiggling. */
  function restSupportedBodies() {
    if (disposed) return;
    for (const record of records.values()) {
      if (!record.rigid.isDynamic()) continue;
      Sleeping.set(record.proxy, true);
      record.rigid.sleep();
      updateProxySnapshot(record.snapshot, record.proxy);
    }
  }

  try {
    syncMembership();
    // Build Rapier's broad/narrow-phase graph before the first public step so
    // a valve command can query newly intersected bodies immediately. This
    // tiny construction-only step keeps Earth gravity and produces no f32
    // seed movement. Reapply only caller-validated initial sleep afterwards.
    world.timestep = 1e-7;
    world.step();
    if (balls.some(ball => ball.isSleeping)) {
      for (const record of records.values()) {
        if (record.proxy.isSleeping && record.rigid.isDynamic()) record.rigid.sleep();
      }
    }
    world.timestep = FIXED_STEP_MS / (1000 * MINIMUM_NATIVE_STEPS);
  } catch (error) {
    records.clear();
    colliderRecords.clear();
    world.free();
    throw error;
  }
  return {
    fixedStepMs: FIXED_STEP_MS,
    step,
    restSupportedBodies, pinPreparedBody, releasePreparedBodies,
    syncMovingFixtures,
    refreshContacts,
    getContactSnapshot,
    getStats,
    dispose,
  };
}
