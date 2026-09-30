import Matter from 'matter-js';
import { BOARD_ROTORS, BOARD_SEESAWS, stepBoardSeesaw, strikeBoardSeesaw } from './boardMachineParts.js';
import { createBoardArtwork } from './boardArtwork.js';
import { BOARD_ARCHITECTURE_LINE_SCALE } from './boardArchitectureWeight.js';
import { boundsOnBoard, pointOnBoard, railBodies } from './boardGeometry.js';
import { normalizeBoardBallRadiusScale, resolveBoardBallRadius } from './boardBallPresentation.js';
import {
  ballColourFromRoleColours,
  createBoardBallRoleAssignments,
  MECHANISM as AUTHORED_MECHANISM,
  RAIL_PATH_IDS,
  resolveBoardBallRoleColours,
} from './boardScene.js';
import { reboundLevelForFixture, reboundMaterial } from './boardMaterials.js';
import { createBoardDrumPhysics } from './boardDrums.js';
import { boardValveSweepSteps } from './boardScrollMotion.js';
import { boardGridCaptureDuration, sampleBoardGridCapture } from './boardGrid.js';
import { createBoardReservoirPreparation, createBoardSupportSafety } from './boardRestingState.js';
import { createRestingReservoirPacking } from './boardReservoirPacking.js';
import { createBoardRigidBodyWorld } from './boardRigidBodyWorld.js';
import {
  applyBoardWorldGravity,
  applyMatterBallMaterial,
  ballColliderRadius,
  BOARD_WORLD_PHYSICS,
  matterBallMaterial,
  sourceBallsBlockedByBodies,
  stopBoardKinematicBody,
} from './boardDynamics.js';

const { Bodies, Body, Composite, Engine, Events, Query, Sleeping, Vertices } = Matter;

const GRID_CAPTURE_Y = 9988;
const BOARD_PHYSICS_CHECKPOINT_VERSION = 2;
const BODY_STATE_STRIDE = 6;
const BODY_FLAG_SLEEPING = 1;
const BODY_FLAG_STATIC = 2;
const BODY_FLAG_SENSOR = 4;
const BODY_FLAG_MASK_ZERO = 8;

export function shouldKeepBoardPhysicsActive(
  elapsedMs,
  pendingCount,
  captureCount,
  hasAwakeBody,
  hasMechanismMotion,
) {
  if (captureCount > 0 || hasAwakeBody || hasMechanismMotion) return true;
  return pendingCount > 0;
}

/** Drums absorb rebound but keep normal rolling friction and air damping. The
 * sealed transfer canal intentionally removes all four contact fields. */
export function boardMechanismBallMaterial(base, mode = 'normal') {
  if (mode === 'canal') {
    return { restitution: 0, friction: 0, frictionStatic: 0, frictionAir: 0 };
  }
  return {
    restitution: mode === 'drum' ? 0 : base.restitution,
    friction: base.friction,
    frictionStatic: base.frictionStatic,
    frictionAir: base.frictionAir,
  };
}

function solidArchitecturePolygon(points, label, level = 'default') {
  const vertices = points.map(([x, y]) => ({ x, y }));
  const centre = Vertices.centre(vertices);
  return Bodies.fromVertices(centre.x, centre.y, vertices, {
    isStatic: true,
    ...reboundMaterial(level),
    label,
  });
}

function arm(pivot, end, width, label, fixtureId = label, start = pivot) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  const baseAngle = Math.atan2(dy, dx);
  // Include the SVG stroke's round caps in the collider. The former plain
  // rectangle stopped at each path endpoint and left visible corners with no
  // physical surface.
  const body = Bodies.rectangle(start[0] + dx / 2, start[1] + dy / 2,
    length + width, width, {
      isStatic: true, ...reboundMaterial(reboundLevelForFixture(fixtureId)), label,
      chamfer: { radius: width / 2, quality: 8 },
    });
  Body.setAngle(body, baseAngle);
  return { body, pivot, length, baseAngle, angle: baseAngle, target: baseAngle, label,
    offset: [start[0] + dx / 2 - pivot[0], start[1] + dy / 2 - pivot[1]] };
}

function rotateArm(part, angle, transferVelocity = true) {
  if (Math.abs(part.angle - angle) < 0.0001) {
    stopBoardKinematicBody(part.body);
    return;
  }
  part.angle = angle;
  const rotation = angle - part.baseAngle;
  Body.setPosition(part.body, {
    x: part.pivot[0] + Math.cos(rotation) * part.offset[0] - Math.sin(rotation) * part.offset[1],
    y: part.pivot[1] + Math.sin(rotation) * part.offset[0] + Math.cos(rotation) * part.offset[1],
  }, transferVelocity);
  Body.setAngle(part.body, angle, transferVelocity);
  if (!transferVelocity) stopBoardKinematicBody(part.body);
}

function makeVane(path, centre, label) {
  const start = pointOnBoard(path, path.getPointAtLength(0));
  const end = pointOnBoard(path, path.getPointAtLength(path.getTotalLength()));
  const x = (start.x + end.x) / 2;
  const y = (start.y + end.y) / 2;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const body = Bodies.rectangle(x, y, Math.hypot(end.x - start.x, end.y - start.y),
    Number(path.getAttribute('stroke-width')) || 14,
    { isStatic: true, ...reboundMaterial(reboundLevelForFixture(path.id)), label });
  Body.setAngle(body, angle);
  return { body, id: path.id, centre, offsetX: x - centre[0], offsetY: y - centre[1], angle };
}

function turnVane(vane, rotation) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  Body.setPosition(vane.body, {
    x: vane.centre[0] + vane.offsetX * cos - vane.offsetY * sin,
    y: vane.centre[1] + vane.offsetX * sin + vane.offsetY * cos,
  }, true);
  Body.setAngle(vane.body, vane.angle + rotation, true);
}

/** One route-owned world. The scroll position opens the gate, while fixed
 * clock steps keep physics independent of scroll speed and frame cadence. */
export function createBoardPhysics(svg, balls, palette, {
  drumArt = null,
  ballDynamics = undefined,
  grid = null,
  radiusScale = 1,
  inventory = null,
  handoffArt = null,
  originY = 0,
  placement = null,
} = {}) {
  const placeY = placement?.placeY || (y => y);
  const placePoint = placement?.placePoint || (point => point);
  const MECHANISM = Object.fromEntries(Object.entries(AUTHORED_MECHANISM).map(([key, spec]) => [key, {
    ...spec, pivot: placePoint(spec.pivot),
    ...(spec.end ? { end: placePoint(spec.end) } : {}),
    ...(spec.artPivot ? { artPivot: placePoint(spec.artPivot) } : {}),
  }]));
  const placedDrumArt = drumArt && { ...drumArt, specs: drumArt.specs.map(spec => ({
    ...spec, centre: placePoint(spec.centre),
  })) };
  const gridCaptureY = placeY(10000) - (10000 - GRID_CAPTURE_Y);
  const resolvedRadiusScale = normalizeBoardBallRadiusScale(radiusScale);
  const artwork = createBoardArtwork(svg, originY);
  const physicsBalls = inventory?.balls || balls.map(ball => ({
    ...ball, radius: resolveBoardBallRadius(ball.radius, resolvedRadiusScale),
  }));
  const ballById = new Map(physicsBalls.map(ball => [ball.id, ball]));
  const engine = Engine.create({
    enableSleeping: true,
    positionIterations: BOARD_WORLD_PHYSICS.positionIterations,
    velocityIterations: BOARD_WORLD_PHYSICS.velocityIterations,
    constraintIterations: BOARD_WORLD_PHYSICS.constraintIterations,
  });
  applyBoardWorldGravity(engine);
  const staticBodies = [];
  for (const id of RAIL_PATH_IDS) {
    const path = svg.querySelector(`#${id}`);
    if (path) staticBodies.push(...railBodies(path));
  }
  for (const sling of handoffArt?.pinball?.slingPolygons || []) {
    staticBodies.push(solidArchitecturePolygon(sling.vertices.map(placePoint), `rail:${sling.id}`, 'high'));
  }
  // These two convex under-floors turn the visible reservoir strokes into a
  // watertight funnel. They sit entirely below the artwork, preserve the
  // central outlet, and remove the possibility of a fast compact ball
  // tunnelling through a segmented curve approximation.
  const gateSpec = handoffArt?.reservoirGate || MECHANISM.reservoirGate;
  const floorLeft = gateSpec.pivot[0];
  const floorRight = handoffArt?.reservoirRight ?? 509;
  staticBodies.push(
    solidArchitecturePolygon([[0, 891], [51, 891], [floorLeft, 1102], [floorLeft, 1140], [0, 1140]],
      'reservoir-left-underfloor'),
    solidArchitecturePolygon([[floorRight, 1102], [909, 891], [960, 891], [960, 1140], [floorRight, 1140]],
      'reservoir-right-underfloor'),
  );
  svg.querySelectorAll('[id^="geometry-bumper-"], [id^="geometry-pinball-bumper-"]')
    .forEach((group) => {
    const box = boundsOnBoard(group);
    const material = reboundMaterial(reboundLevelForFixture(group.id));
    staticBodies.push(Bodies.circle(box.x + box.width / 2, box.y + box.height / 2,
      Math.min(box.width, box.height) / 2
        + (Number(group.querySelector('[stroke-width]')?.getAttribute('stroke-width')) || 0) / 2, {
        isStatic: true, ...material, label: `bumper:${group.id}`,
      }));
  });
  for (const id of ['pinball-post-left', 'pinball-post-right']) {
    const post = svg.querySelector(`#${id}`);
    if (!post) continue;
    const box = boundsOnBoard(post);
    staticBodies.push(Bodies.circle(box.x + box.width / 2, box.y + box.height / 2,
      Math.min(box.width, box.height) / 2, {
        isStatic: true, ...reboundMaterial(reboundLevelForFixture(id)), label: `post:${id}`,
      }));
  }
  const wedge = svg.querySelector('#Vector_140');
  if (wedge) {
    const points = Array.from({ length: 24 }, (_, i) => {
      const p = pointOnBoard(wedge, wedge.getPointAtLength(wedge.getTotalLength() * i / 24));
      return [p.x, p.y];
    });
    staticBodies.push(solidArchitecturePolygon(points, 'transfer-wedge'));
  }
  const drums = createBoardDrumPhysics(placedDrumArt);
  staticBodies.push(...drums.fixedBodies);
  // Invisible page limits close the wide open receivers without drawing walls.
  staticBodies.push(
    Bodies.rectangle(-25, (placeY(10000) + originY) / 2, 50, placeY(10000) - originY, { isStatic: true, label: 'page-bound' }),
    Bodies.rectangle(968, (placeY(10000) + originY) / 2, 50, placeY(10000) - originY, { isStatic: true, label: 'page-bound' }),
  );
  const gate = arm(gateSpec.pivot, gateSpec.end, gateSpec.width, 'reservoir-gate');
  const gatePivot = Bodies.circle(gateSpec.pivot[0], gateSpec.pivot[1], gateSpec.pivotRadius, {
    isStatic: true,
    ...reboundMaterial(reboundLevelForFixture(gateSpec.id)),
    label: 'reservoir-gate-pivot',
  });
  // The drawn arm and two rounded floor caps meet exactly. At the compact ball
  // scale, solver tolerance can turn that mathematical join into a traversable
  // sub-pixel seam. This collider supplements the fully closed arm only;
  // partial openings are governed by the actual rotating valve geometry.
  const reservoirSeal = Bodies.rectangle(478, 1124, floorRight - floorLeft + 16, 20, {
    isStatic: true,
    ...reboundMaterial('zero'),
    label: 'reservoir-closed-seal',
  });
  staticBodies.push(reservoirSeal);
  const meterSpec = handoffArt?.meterGate ? {
    pivot: placePoint(handoffArt.meterGate.pivot), end: placePoint(handoffArt.meterGate.end),
  } : {
    pivot: MECHANISM.meterGate.pivot, end: [410, MECHANISM.meterGate.pivot[1] - 14],
  };
  const meter = arm(meterSpec.pivot, meterSpec.end, 21 * BOARD_ARCHITECTURE_LINE_SCALE,
    'meter-gate');
  const seesaws = BOARD_SEESAWS.map(spec => {
    const pivot = placePoint(spec.pivot);
    const dx = Math.cos(spec.angle) * spec.length / 2;
    const dy = Math.sin(spec.angle) * spec.length / 2;
    return { ...arm(pivot, [pivot[0] + dx, pivot[1] + dy],
      24 * BOARD_ARCHITECTURE_LINE_SCALE, `seesaw:${spec.id}`, spec.id,
      [pivot[0] - dx, pivot[1] - dy]), id: spec.id, angularVelocity: 0 };
  });
  const seesawByBody = new Map(seesaws.map(part => [part.body, part]));
  const rotors = BOARD_ROTORS.map(spec => ({ ...spec, pivot: placePoint(spec.pivot) }));
  const propellerVanes = [];
  for (const [index, spec] of rotors.entries()) {
    for (let blade = 1; blade <= 3; blade += 1) {
      const path = svg.querySelector(`#propeller-${index + 1}-blade-${blade}`);
      if (path) propellerVanes.push({ ...makeVane(path, spec.pivot, 'propeller-vane'),
        direction: spec.direction });
    }
  }
  const movingFixtures = [gate.body,
    meter.body, ...seesaws.map(part => part.body),
    ...drums.carrierBodies, ...propellerVanes.map(vane => vane.body)];
  const architectureBodies = [...staticBodies, gatePivot, ...movingFixtures];
  Composite.add(engine.world, architectureBodies);
  const packing = inventory && createRestingReservoirPacking({
    radius: inventory.radius, top: originY, fixtures: architectureBodies, seeds: inventory.reservoir,
  });
  const restingPacking = packing?.settled ? packing.balls : null;
  const preparedSeeds = packing?.filled ? packing.balls : null;
  if (preparedSeeds) {
    physicsBalls.splice(0, physicsBalls.length, ...preparedSeeds);
    inventory.maximumBodies = physicsBalls.length;
    inventory.surfaceY = Math.min(...preparedSeeds.map(ball => ball.y));
    ballById.clear();
    for (const ball of physicsBalls) ballById.set(ball.id, ball);
  }
  const architectureBlockedSourceIds = sourceBallsBlockedByBodies(physicsBalls, architectureBodies);

  // The authored seam starts with one occupied receptacle. Back that visual
  // state with a real reservoir identity instead of a synthetic grid ID. Pick
  // a top-row ball so removing it cannot invalidate another ball's support.
  const prefilledInventoryIds = new Set();
  const prefilledCells = [...(grid?.occupied?.entries() || [])];
  const prefillCandidates = physicsBalls.filter(ball => ball.reservoir
      && !architectureBlockedSourceIds.has(ball.id))
    .sort((first, second) => first.y - second.y || first.x - second.x);
  for (let index = 0; index < prefilledCells.length; index += 1) {
    const [cellId, entry] = prefilledCells[index];
    const existing = ballById.get(entry.sourceId);
    const source = existing || prefillCandidates.find(ball => !prefilledInventoryIds.has(ball.id));
    if (!source) break;
    prefilledInventoryIds.add(source.id);
    grid.occupied.set(cellId, { ...entry, sourceId: source.id });
  }

  const moving = [];
  // Invalid authored positions never become invisible
  // colliders or a separate layer of frozen illustration balls.
  const pending = physicsBalls.filter(ball => !architectureBlockedSourceIds.has(ball.id)
    && !prefilledInventoryIds.has(ball.id));
  // Every loose visible ball now belongs to live physics. Figma is layout evidence,
  // never a second layer of motionless balls behind the live population.
  // Automatic mechanisms are SVG; a resting pile needs no new ball bitmap.
  // Advance this revision whenever physics, capture or colour can change it.
  let renderRevision = 0;
  const bodyView = Object.freeze({ bodies: moving, get revision() { return renderRevision; } });
  const preparingView = Object.freeze({ bodies: [], revision: -1 });
  let gateProgress = 0;
  let meterProgress = 0;
  let reservoirSealed = true;
  let elapsedMs = 0;
  let mechanismElapsedMs = 0;
  let accumulated = 0;
  let paletteSnapshot = palette;
  let roleColours = resolveBoardBallRoleColours(paletteSnapshot);
  let roleAssignments = createBoardBallRoleAssignments(physicsBalls, paletteSnapshot);
  for (const entry of grid?.occupied?.values() || []) {
    const source = ballById.get(entry.sourceId);
    if (!source) continue;
    entry.roleIndex = roleAssignments.get(source.id) ?? 0;
    entry.colour = ballColourFromRoleColours(source, roleColours, roleAssignments);
  }
  let propellerAngle = 0;
  let activeBallMaterial = matterBallMaterial(ballDynamics);
  let rigidBodyWorld = null;
  let suspendedCheckpoint = null;
  let lastRigidBodyStats = null;
  let lastSuspendMs = 0;
  let lastResumeMs = 0;
  let checkpointBytes = 0;
  let completedNativeSteps = 0;
  let disposed = false;
  let maximumPenetration = 0;
  let maximumFixturePenetration = 0;
  let maximumFixtureContact = null;
  let maximumMicroStepsUsed = 1;
  const gridCaptures = new Map();
  // A claimed socket remains claimed after its incoming rigid body is retired.
  // This preserves the one-ball-per-receptacle contract even though the
  // prepared visual grid is already complete for fast-scroll continuity.
  const claimedGridCells = new Set(grid?.occupied?.keys() || []);
  const capturedInventoryIds = new Set(prefilledInventoryIds);
  const retiredInventoryIds = new Set(architectureBlockedSourceIds);
  const inventoryIndexById = new Map(physicsBalls.map((ball, index) => [ball.id, index]));
  const gridIndexById = new Map((grid?.entries || []).map((entry, index) => [entry.id, index]));
  const inventoryFingerprint = `${physicsBalls.length}:${physicsBalls[0]?.id || ''}`
    + `:${physicsBalls.at(-1)?.id || ''}:${inventory?.radius || resolvedRadiusScale}`;
  let absorbedByGrid = capturedInventoryIds.size;
  const drumSpecs = placedDrumArt?.specs || [];
  const authoredCanal = handoffArt?.transferCanal?.bounds;
  const transferCanal = authoredCanal && { ...authoredCanal,
    minY: placeY(authoredCanal.minY), maxY: placeY(authoredCanal.maxY) };
  const mechanismMaterialMinY = Math.min(
    transferCanal?.minY ?? Infinity,
    ...drumSpecs.map(drum => drum.centre[1] - drum.casingRadius - drum.throatLength
      - (inventory?.radius || 13)),
  );
  const valveSweep = { gateStart: 0, gateTarget: 0, meterStart: 0, meterTarget: 0 };
  function applyValveSweep(fraction) {
    // A scroll jump is a position command, not an instantaneous motor kick.
    // Solve each swept pose without launching balls at scroll-derived speed.
    // Automatic rotors retain their normal velocity.
    rotateArm(gate, valveSweep.gateStart + (valveSweep.gateTarget - valveSweep.gateStart) * fraction, false);
    rotateArm(meter, valveSweep.meterStart + (valveSweep.meterTarget - valveSweep.meterStart) * fraction, false);
  }

  function updateAutomaticFixtures(deltaMs) {
    mechanismElapsedMs += Math.max(0, Number(deltaMs) || 0);
    drums.update(mechanismElapsedMs);
    propellerAngle = mechanismElapsedMs * 0.0011;
    for (const vane of propellerVanes) turnVane(vane, propellerAngle * vane.direction);
  }

  function renderMechanisms() {
    artwork.rotate(gateSpec.id, gate.angle - gate.baseAngle, gateSpec.pivot);
    artwork.rotate(MECHANISM.meterGate.id, meter.angle - meter.baseAngle, meter.pivot);
    for (const part of seesaws) artwork.rotate(part.id, part.angle - part.baseAngle, part.pivot);
    for (const spec of rotors) artwork.rotate(spec.id, propellerAngle * spec.direction, spec.pivot);
    drums.render(artwork);
  }

  function applyMechanismMaterial(body, mode) {
    if (body.plugin.boardMechanismMaterial === mode) return;
    body.plugin.boardMechanismMaterial = mode;
    const material = boardMechanismBallMaterial(activeBallMaterial, mode);
    body.restitution = material.restitution;
    body.friction = material.friction;
    body.frictionStatic = material.frictionStatic;
    body.frictionAir = material.frictionAir;
  }

  function updateMechanismContactState(body) {
    if (body.position.y < mechanismMaterialMinY - body.circleRadius) {
      applyMechanismMaterial(body, 'normal');
      return;
    }
    const inCanal = transferCanal
      && body.position.y >= transferCanal.minY - body.circleRadius
      && body.position.y <= transferCanal.maxY + body.circleRadius
      && body.position.x >= transferCanal.minX - body.circleRadius
      && body.position.x <= transferCanal.maxX + body.circleRadius;
    let inDrum = false;
    for (const drum of drumSpecs) {
      const dx = body.position.x - drum.centre[0];
      const dy = body.position.y - drum.centre[1];
      const reach = drum.casingRadius + drum.throatLength + body.circleRadius;
      if (dx * dx + dy * dy < reach * reach) {
        inDrum = true;
        if (body.isSleeping
          && Math.abs(dy) < drum.casingRadius + body.circleRadius
          && Math.abs(dx) < drum.casingRadius + body.circleRadius) Sleeping.set(body, false);
        break;
      }
    }
    applyMechanismMaterial(body, inCanal ? 'canal' : inDrum ? 'drum' : 'normal');
  }

  function onCollision(event) {
    for (const pair of event.pairs) {
      // Matter combines materials with Math.max(restitution). A rigid drum
      // therefore needs an explicit contact override to absorb ball rebound.
      if (/^(large|small)-drum/.test(pair.bodyA.label)
        || /^(large|small)-drum/.test(pair.bodyB.label)) pair.restitution = 0;
      if (pair.bodyA.label.startsWith('rail:drum-transfer-')
        || pair.bodyB.label.startsWith('rail:drum-transfer-')) {
        pair.restitution = 0;
        pair.friction = 0;
        pair.frictionStatic = 0;
      }
      const part = seesawByBody.get(pair.bodyA) || seesawByBody.get(pair.bodyB);
      if (part) {
        const ball = part.body === pair.bodyA ? pair.bodyB : pair.bodyA;
        if (ball.circleRadius) strikeBoardSeesaw(part, ball);
      }
    }
  }
  function onCollisionActive(event) {
    for (const pair of event.pairs) {
      if (!pair.bodyA.circleRadius && !pair.bodyB.circleRadius) continue;
      const depth = pair.collision?.depth || 0;
      maximumPenetration = Math.max(maximumPenetration, depth);
      if (!pair.bodyA.circleRadius || !pair.bodyB.circleRadius) {
        if (depth > maximumFixturePenetration) {
          maximumFixturePenetration = depth;
          const ball = pair.bodyA.circleRadius ? pair.bodyA : pair.bodyB;
          const fixture = ball === pair.bodyA ? pair.bodyB : pair.bodyA;
          maximumFixtureContact = {
            ball: ball.label,
            fixture: fixture.label,
            x: Math.round(ball.position.x),
            y: Math.round(ball.position.y),
            timestampMs: Math.round(engine.timing.timestamp),
          };
        }
      }
    }
  }
  Events.on(engine, 'collisionStart', onCollision);
  Events.on(engine, 'collisionStart', onCollisionActive);
  Events.on(engine, 'collisionActive', onCollisionActive);

  function setScrollProgress(reservoir, meterValue) {
    gateProgress = Math.max(0, Math.min(1, Number(reservoir) || 0));
    meterProgress = Math.max(0, Math.min(1, Number(meterValue) || 0));
  }

  function unsealReservoir() {
    if (!reservoirSealed) return;
    Composite.remove(engine.world, reservoirSeal);
    architectureBodies.splice(architectureBodies.indexOf(reservoirSeal), 1);
    staticBodies.splice(staticBodies.indexOf(reservoirSeal), 1);
    reservoirSealed = false;
    for (const body of moving) {
      if (body.isSleeping && body.position.y > gate.pivot[1] - body.circleRadius * 5) Sleeping.set(body, false);
    }
  }

  function resealReservoir() {
    if (reservoirSealed || gateProgress > 0) return;
    // Never insert a collider through a ball during reverse scrubbing. The
    // physical arm closes first; the tolerance seal returns once it is clear.
    if (Query.collides(reservoirSeal, moving).some(contact => contact.depth > .1)) return;
    Composite.add(engine.world, reservoirSeal);
    architectureBodies.push(reservoirSeal);
    staticBodies.push(reservoirSeal);
    reservoirSealed = true;
  }

  function spawn(nextBall = null) {
    const ball = nextBall || pending.shift();
    if (!ball) return;
    const body = Bodies.circle(ball.x, ball.y,
      ballColliderRadius(ball.radius), {
      density: activeBallMaterial.density,
      restitution: activeBallMaterial.restitution,
      friction: activeBallMaterial.friction,
      frictionStatic: activeBallMaterial.frictionStatic,
      frictionAir: activeBallMaterial.frictionAir,
      sleepThreshold: activeBallMaterial.sleepThreshold,
      slop: activeBallMaterial.slop,
      label: `ball:${ball.id}`,
      plugin: {
        boardId: ball.id,
        boardColour: ballColourFromRoleColours(ball, roleColours, roleAssignments),
        boardRadiusScale: resolvedRadiusScale,
        boardMechanismMaterial: 'normal',
      },
    });
    if (Query.collides(body, moving).some(collision => collision.depth > .1)) return;
    ballById.set(ball.id, ball);
    moving.push(body);
    Composite.add(engine.world, body);
    // Only the validated initial reservoir pack starts asleep.
    if (restingPacking && !nextBall && ball.reservoir) Sleeping.set(body, true);
  }

  function retireBody(index, captured = false) {
    const body = moving[index];
    Composite.remove(engine.world, body);
    moving.splice(index, 1);
    const id = body.plugin.boardId;
    if (captured) capturedInventoryIds.add(id);
    else retiredInventoryIds.add(id);
  }

  function nearestAvailableGridCell(body) {
    if (!grid?.entries?.length) return null;
    let nearest = null;
    let nearestDistance = Infinity;
    for (const entry of grid.entries) {
      if (claimedGridCells.has(entry.id)) continue;
      const dx = entry.flatX - body.position.x;
      const dy = entry.flatY - body.position.y;
      const distance = dx * dx + dy * dy;
      if (distance < nearestDistance) {
        nearest = entry;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  function beginGridCapture(body) {
    const target = nearestAvailableGridCell(body);
    if (!target) return false;
    claimedGridCells.add(target.id);
    gridCaptures.set(body.plugin.boardId, {
      target,
      elapsed: 0,
      startX: body.position.x,
      startY: body.position.y,
    });
    grid.capturing?.add(target.id);
    // The socket owns the ball from this moment. Removing its collision mask
    // prevents the absorption animation from pushing or jittering nearby balls.
    body.collisionFilter.mask = 0;
    body.isSensor = true;
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
    Body.setStatic(body, true);
    body.plugin.boardRenderScale = 1;
    return true;
  }

  const capturePoint = { x: 0, y: 0 };
  function advanceGridCapture(body, stepMs) {
    const capture = gridCaptures.get(body.plugin.boardId);
    if (!capture) return false;
    const duration = boardGridCaptureDuration(capture, body.circleRadius);
    capture.elapsed = Math.min(duration, capture.elapsed + stepMs);
    const progress = capture.elapsed / duration;
    Body.setPosition(body, sampleBoardGridCapture(capture, progress, body.circleRadius, capturePoint), false);
    // The arriving body keeps its Home-sized silhouette. At the end the
    // socket owns that same ball, rather than shrinking it into a duplicate.
    body.plugin.boardRenderScale = 1;
    if (progress < 1) return false;
    grid.occupied?.set(capture.target.id, {
      colour: body.plugin.boardColour,
      sourceId: body.plugin.boardId,
      roleIndex: roleAssignments.get(body.plugin.boardId) ?? 0,
    });
    grid.capturing?.delete(capture.target.id);
    gridCaptures.delete(body.plugin.boardId);
    capturedInventoryIds.add(body.plugin.boardId);
    absorbedByGrid += 1;
    return true;
  }

  function canUseClosedRestingPath() {
    if (!inventory || !reservoirSealed || gateProgress > 0 || meterProgress > 0
      || pending.length || gridCaptures.size) return false;
    for (const body of moving) {
      if (!body.isSleeping || body.position.y > gate.pivot[1] + body.circleRadius * 2) return false;
    }
    return true;
  }

  function update(deltaMs) {
    if (disposed || suspendedCheckpoint) return;
    if (!preparation.ready) {
      if (!preparation.advance()) return;
      moving.sort((a, b) => b.position.y - a.position.y);
      if (inventory) inventory.surfaceY = Math.min(...moving.map(body => body.position.y));
      for (const body of moving) applyMatterBallMaterial(body, activeBallMaterial.dynamics);
    }
    if (canUseClosedRestingPath()) {
      accumulated = 0;
      updateAutomaticFixtures(deltaMs);
      rigidBodyWorld.syncMovingFixtures();
      renderMechanisms();
      return;
    }
    const stepMs = rigidBodyWorld.fixedStepMs;
    // Native CCD handles fast bodies inside a fixed 60 Hz solve. Bound catch-up
    // so a delayed paint cannot start a self-sustaining backlog of physics work.
    const maxSteps = Math.min(2, BOARD_WORLD_PHYSICS.maxCatchUpSteps);
    accumulated = Math.min(accumulated + deltaMs, stepMs * maxSteps);
    let steps = 0;
    const updateStarted = performance.now();
    // Floating-point subtraction must not omit an otherwise complete step.
    while (accumulated + 1e-7 >= stepMs && steps < maxSteps) {
      elapsedMs += stepMs;
      // The scroll owns the exact final pose. Sweep the short movement through
      // collision substeps within this frame rather than easing after a scroll.
      const gateStart = gate.angle;
      const meterStart = meter.angle;
      const gateTarget = gate.baseAngle + gateProgress * gateSpec.openAngle;
      const meterTarget = meter.baseAngle + meterProgress * (Math.PI / 2 - meter.baseAngle);
      if (gateProgress > 0) unsealReservoir();
      for (const part of seesaws) rotateArm(part, stepBoardSeesaw(part, stepMs / 1000));
      updateAutomaticFixtures(stepMs);
      for (const body of moving) updateMechanismContactState(body);
      const valveTravel = Math.max(Math.abs(gateTarget - gateStart) * gate.length,
        Math.abs(meterTarget - meterStart) * meter.length);
      const valveSteps = boardValveSweepSteps(valveTravel,
        inventory?.radius ?? resolveBoardBallRadius(13, resolvedRadiusScale));
      valveSweep.gateStart = gateStart; valveSweep.gateTarget = gateTarget;
      valveSweep.meterStart = meterStart; valveSweep.meterTarget = meterTarget;
      maximumMicroStepsUsed = Math.max(maximumMicroStepsUsed,
        rigidBodyWorld.step(stepMs, valveSteps, valveTravel > .0001 ? applyValveSweep : null));
      renderRevision += 1;
      resealReservoir();
      for (let index = moving.length - 1; index >= 0; index -= 1) {
        const body = moving[index];
        if (gridCaptures.has(body.plugin.boardId)) {
          if (!advanceGridCapture(body, stepMs)) continue;
          retireBody(index, true);
          continue;
        }
        if (body.position.y < gridCaptureY) continue;
        if (beginGridCapture(body)) continue;
        // A missing handoff record must fail closed rather than leaving a live
        // body below the 2D scene where it can overlap the Three.js field.
        retireBody(index);
      }
      accumulated = Math.max(0, accumulated - stepMs);
      steps += 1;
      // A full desktop reservoir can consume the frame budget in one solve.
      // Give rendering and scroll input their turn instead of doubling that
      // delay with catch-up work. Fast frames retain the two-step allowance.
      if (performance.now() - updateStarted >= stepMs * .5) break;
    }
    renderMechanisms();
  }

  function indicesFor(ids) {
    const values = [];
    for (const id of ids) {
      const index = inventoryIndexById.get(id);
      if (Number.isInteger(index)) values.push(index);
    }
    return Uint32Array.from(values);
  }

  /** Capture the complete finite-inventory ledger plus live physical state.
   * The route retains Matter proxies for immediate rendering; numeric arrays
   * make the checkpoint compact and keep identity restoration deterministic. */
  function createCheckpoint() {
    const bodyIndices = new Uint32Array(moving.length);
    const bodyState = new Float32Array(moving.length * BODY_STATE_STRIDE);
    const bodyFlags = new Uint8Array(moving.length);
    const bodyMasks = new Uint32Array(moving.length);
    const renderScales = new Float32Array(moving.length);
    for (let index = 0; index < moving.length; index += 1) {
      const body = moving[index];
      const sourceIndex = inventoryIndexById.get(body.plugin.boardId);
      bodyIndices[index] = Number.isInteger(sourceIndex) ? sourceIndex : 0xffffffff;
      const offset = index * BODY_STATE_STRIDE;
      bodyState[offset] = body.position.x;
      bodyState[offset + 1] = body.position.y;
      bodyState[offset + 2] = body.angle;
      bodyState[offset + 3] = body.velocity.x;
      bodyState[offset + 4] = body.velocity.y;
      bodyState[offset + 5] = body.angularVelocity;
      bodyFlags[index] = (body.isSleeping ? BODY_FLAG_SLEEPING : 0)
        | (body.isStatic ? BODY_FLAG_STATIC : 0)
        | (body.isSensor ? BODY_FLAG_SENSOR : 0)
        | ((body.collisionFilter?.mask ?? 0xffffffff) === 0 ? BODY_FLAG_MASK_ZERO : 0);
      bodyMasks[index] = body.collisionFilter?.mask ?? 0xffffffff;
      renderScales[index] = Number(body.plugin.boardRenderScale ?? 1);
    }
    const captures = [...gridCaptures.entries()];
    const captureIndices = new Uint32Array(captures.length * 2);
    const captureState = new Float32Array(captures.length * 3);
    for (let index = 0; index < captures.length; index += 1) {
      const [id, capture] = captures[index];
      captureIndices[index * 2] = inventoryIndexById.get(id) ?? 0xffffffff;
      captureIndices[index * 2 + 1] = gridIndexById.get(capture.target.id) ?? 0xffffffff;
      captureState[index * 3] = capture.elapsed;
      captureState[index * 3 + 1] = capture.startX;
      captureState[index * 3 + 2] = capture.startY;
    }
    const occupied = [...(grid?.occupied?.entries() || [])];
    const occupiedState = new Uint32Array(occupied.length * 3);
    for (let index = 0; index < occupied.length; index += 1) {
      const [cellId, entry] = occupied[index];
      occupiedState[index * 3] = gridIndexById.get(cellId) ?? 0xffffffff;
      occupiedState[index * 3 + 1] = inventoryIndexById.get(entry.sourceId) ?? 0xffffffff;
      occupiedState[index * 3 + 2] = entry.roleIndex ?? 0;
    }
    const claimedCells = Uint16Array.from([...claimedGridCells]
      .map(id => gridIndexById.get(id)).filter(Number.isInteger));
    const checkpoint = {
      version: BOARD_PHYSICS_CHECKPOINT_VERSION,
      inventoryFingerprint,
      elapsedMs,
      mechanismElapsedMs,
      bodyIndices,
      bodyState,
      bodyFlags,
      bodyMasks,
      renderScales,
      captureIndices,
      captureState,
      occupiedState,
      claimedCells,
      capturedIndices: indicesFor(capturedInventoryIds),
      retiredIndices: indicesFor(retiredInventoryIds),
      mechanism: {
        gateAngle: gate.angle,
        meterAngle: meter.angle,
        seesaws: seesaws.map(part => ({ angle: part.angle, angularVelocity: part.angularVelocity })),
        reservoirSealed,
        absorbedByGrid,
      },
    };
    checkpointBytes = bodyIndices.byteLength + bodyState.byteLength + bodyFlags.byteLength
      + bodyMasks.byteLength + renderScales.byteLength + captureIndices.byteLength
      + captureState.byteLength + occupiedState.byteLength + claimedCells.byteLength
      + checkpoint.capturedIndices.byteLength + checkpoint.retiredIndices.byteLength;
    return checkpoint;
  }

  function assertCheckpoint(checkpoint) {
    if (!checkpoint || checkpoint.version !== BOARD_PHYSICS_CHECKPOINT_VERSION
      || checkpoint.inventoryFingerprint !== inventoryFingerprint) {
      throw new Error('About board physics checkpoint does not match this finite inventory.');
    }
  }

  function suspend() {
    if (disposed) return { checkpoint: null, durationMs: 0, suspended: false };
    if (suspendedCheckpoint) {
      return { checkpoint: suspendedCheckpoint, durationMs: 0, suspended: true };
    }
    if (!preparation.ready) return { checkpoint: null, durationMs: 0, suspended: false };
    const started = performance.now();
    suspendedCheckpoint = createCheckpoint();
    lastRigidBodyStats = rigidBodyWorld.getStats();
    completedNativeSteps += lastRigidBodyStats.steps;
    rigidBodyWorld.dispose();
    rigidBodyWorld = null;
    accumulated = 0;
    lastSuspendMs = performance.now() - started;
    return { checkpoint: suspendedCheckpoint, durationMs: lastSuspendMs, suspended: true };
  }

  function resume() {
    if (disposed) return { durationMs: 0, resumed: false };
    if (!suspendedCheckpoint && rigidBodyWorld) return { durationMs: 0, resumed: false };
    assertCheckpoint(suspendedCheckpoint);
    const started = performance.now();
    // Retained render-facing Matter proxies hold the exact current checkpoint.
    // Rebuilding from them avoids round-tripping a sleeping pack through typed
    // storage and deliberately does not offer arbitrary historical rewind.
    rigidBodyWorld = createBoardRigidBodyWorld({
      engine, balls: moving, fixtures: architectureBodies, movingFixtures,
    });
    suspendedCheckpoint = null;
    lastResumeMs = performance.now() - started;
    return { durationMs: lastResumeMs, resumed: true };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    artwork.dispose();
    rigidBodyWorld?.dispose();
    rigidBodyWorld = null;
    Events.off(engine, 'collisionStart', onCollision);
    Events.off(engine, 'collisionStart', onCollisionActive);
    Events.off(engine, 'collisionActive', onCollisionActive);
    Composite.clear(engine.world, false);
    Engine.clear(engine);
  }

  function setBallMaterial(next) {
    activeBallMaterial = matterBallMaterial(next);
    for (const body of moving) {
      applyMatterBallMaterial(body, activeBallMaterial.dynamics);
      body.plugin.boardMechanismMaterial = null;
      updateMechanismContactState(body);
    }
    return activeBallMaterial.dynamics;
  }

  // Packing is only a hidden simulation seed. Every finite reservoir identity
  // enters the initial world once, except the real identity already assigned
  // to the prefilled seam socket.
  const initialCount = pending.length;
  for (let index = 0; index < initialCount; index += 1) spawn();
  if (restingPacking) {
    const bodyById = new Map(moving.map(body => [body.plugin.boardId, body]));
    for (const seed of restingPacking) {
      const body = bodyById.get(seed.id);
      if (!body) continue;
      body.plugin.boardInitialRest = { x: seed.x, y: seed.y,
        supports: seed.supports.map(support => {
          const lower = support.fixture || bodyById.get(`pit-${support.ball}`);
          return lower && { body: lower, x: lower.position.x, y: lower.position.y, angle: lower.angle };
        }) };
    }
  }
  const supportSafety = createBoardSupportSafety(engine, moving, architectureBodies);
  // The unshown drop uses a dissipative granular material. It removes bounce
  // while the pile forms, then restores the shared Home material before reveal.
  if (!restingPacking) for (const body of moving) {
    body.restitution = 0;
    body.friction = .2;
    body.frictionStatic = .3;
    body.frictionAir = .18;
  }
  // Reject an unsupported initial sleep state before transferring the pack to
  // the native solver. This is the only point where cold-start rest is applied.
  supportSafety.update(100);
  rigidBodyWorld = createBoardRigidBodyWorld({
    engine, balls: moving, fixtures: architectureBodies, movingFixtures,
  });
  const initialNativeContacts = rigidBodyWorld.getContactSnapshot()
    .filter(contact => contact.depth > .25)
    .sort((a, b) => b.depth - a.depth).slice(0, 5);
  const inspectSupport = () => {
    rigidBodyWorld.refreshContacts();
    return supportSafety.inspect();
  };
  const preparation = createBoardReservoirPreparation(engine, moving, architectureBodies,
    { inspect: inspectSupport, settleSupported: supportSafety.settleSupported, update: () => {} }, rigidBodyWorld);

  function hasCommandedMechanismMotion() {
    const automaticMotion = drumSpecs.length > 0 || propellerVanes.length > 0;
    const gateTarget = gate.baseAngle + gateProgress * gateSpec.openAngle;
    return automaticMotion || Math.abs(gateTarget - gate.angle) > 0.002
      || seesaws.some(part => Math.abs(part.angularVelocity) > .002
        || Math.abs(part.angle - part.baseAngle) > .002);
  }

  function getInventorySnapshot() {
    const capturing = new Set(gridCaptures.keys());
    return {
      total: physicsBalls.length,
      initialIds: physicsBalls.map(ball => ball.id),
      liveIds: moving.filter(body => !capturing.has(body.plugin.boardId))
        .map(body => body.plugin.boardId),
      capturingIds: [...capturing],
      capturedIds: [...capturedInventoryIds],
      retiredIds: [...retiredInventoryIds],
    };
  }

  return {
    update, dispose, setScrollProgress, createCheckpoint, suspend, resume,
    isSuspended: () => Boolean(suspendedCheckpoint),
    isReady: () => preparation.ready,
    setVisibleRange: artwork.setVisibleRange,
    setPalette: next => {
      renderRevision += 1;
      paletteSnapshot = next;
      roleColours = resolveBoardBallRoleColours(paletteSnapshot);
      roleAssignments = createBoardBallRoleAssignments(physicsBalls, paletteSnapshot);
      for (const entry of grid?.occupied?.values() || []) {
        if (Number.isInteger(entry.roleIndex)) entry.colour = roleColours[entry.roleIndex];
      }
      for (const body of moving) {
        const source = ballById.get(body.plugin.boardId);
        if (source) {
          if (source.paletteId) roleAssignments.set(source.id, roleAssignments.get(source.paletteId));
          body.plugin.boardColour = ballColourFromRoleColours(source, roleColours, roleAssignments);
        }
      }
    },
    setBallMaterial,
    getBallMaterial: () => ({ ...activeBallMaterial.dynamics }),
    getInventorySnapshot,
    getBodies: () => preparation.ready ? bodyView : preparingView,
    getSupportSnapshot: () => rigidBodyWorld ? inspectSupport() : supportSafety.inspect(),
    // Inspect final true-circle poses, not the inscribed Matter display proxy
    // or the solver's pre-correction contact depths.
    getContactSnapshot: () => (rigidBodyWorld?.getContactSnapshot() || [])
      .filter(contact => contact.depth > .25)
      .sort((a, b) => b.depth - a.depth).slice(0, 12),
    hasActivity: () => {
      if (suspendedCheckpoint || disposed) return false;
      let hasAwakeBody = false;
      for (const body of moving) {
        if (body.isSleeping) continue;
        hasAwakeBody = true;
        break;
      }
      return shouldKeepBoardPhysicsActive(engine.timing.timestamp, pending.length,
        gridCaptures.size, hasAwakeBody, hasCommandedMechanismMotion(), moving.length);
    },
    getStats: () => {
      let sleeping = 0;
      let furthestY = 0;
      let outsidePage = 0;
      const stages = [0, 0, 0, 0, 0, 0, 0, 0];
      for (const body of moving) {
        if (body.isSleeping) sleeping += 1;
        furthestY = Math.max(furthestY, body.position.y);
        if (body.position.x < -5 || body.position.x > 965) outsidePage += 1;
        const y = body.position.y;
        stages[y < placeY(1124) ? 0 : y < placeY(2700) ? 1 : y < placeY(4400) ? 2 : y < placeY(5600) ? 3
          : y < placeY(6600) ? 4 : y < placeY(7900) ? 5 : y < placeY(9000) ? 6 : 7] += 1;
      }
      const currentRigidStats = rigidBodyWorld?.getStats() || null;
      return { moving: moving.length, pending: pending.length, sleeping,
        outsidePage, furthestY: Math.round(furthestY), stages,
        gridCapturing: gridCaptures.size,
        gridAbsorbed: absorbedByGrid,
        ballRadiusScale: resolvedRadiusScale,
        ballRadius: inventory?.radius ?? resolveBoardBallRadius(13, resolvedRadiusScale),
        // Retained for existing diagnostics; the finite inventory has no feed.
        fed: 0,
        elapsedMs: Math.round(elapsedMs),
        rigidBody: currentRigidStats || (lastRigidBodyStats
          ? { ...lastRigidBodyStats, bodies: 0, dynamic: 0, fixed: 0, kinematic: 0,
            colliders: 0, sleeping: 0, suspended: true }
          : null),
        suspended: Boolean(suspendedCheckpoint),
        nativeWorldCount: rigidBodyWorld ? 1 : 0,
        nativeRecordCount: currentRigidStats?.bodies || 0,
        nativeLifetimeSteps: completedNativeSteps + (currentRigidStats?.steps || 0),
        retainedProxyCount: moving.length + architectureBodies.length,
        lastSuspendMs: Number(lastSuspendMs.toFixed(3)),
        lastResumeMs: Number(lastResumeMs.toFixed(3)),
        checkpointBytes,
        contactPairs: engine.pairs.list.length,
        reservoirReady: preparation.ready,
        reservoirSettled: preparation.settled,
        reservoirPreparationSteps: preparation.steps,
        seesaws: seesaws.map(part => ({ id: part.id, angle: part.angle, angularVelocity: part.angularVelocity })),
        reservoirColdPacked: Boolean(restingPacking),
        initialNativeContacts,
        reservoirPacking: packing?.stats,
        gravity: { ...BOARD_WORLD_PHYSICS.gravity },
        ballMaterial: { ...activeBallMaterial.dynamics },
        maximumPenetration: Number(maximumPenetration.toFixed(3)),
        architectureBlockedSourceBalls: architectureBlockedSourceIds.size,
        reservoirSealed,
        gateProgress, meterProgress,
        gateAngle: Number((gate.angle - gate.baseAngle).toFixed(3)),
        meterAngle: Number((meter.angle - meter.baseAngle).toFixed(3)),
        maximumFixturePenetration: Number(maximumFixturePenetration.toFixed(3)),
        maximumFixtureContact,
        maximumMicroStepsUsed,
        inventory: {
          total: physicsBalls.length,
          live: moving.length - gridCaptures.size,
          capturing: gridCaptures.size,
          captured: capturedInventoryIds.size,
          retired: retiredInventoryIds.size,
          conserved: physicsBalls.length === moving.length
            + capturedInventoryIds.size + retiredInventoryIds.size,
        },
        motionSamples: moving.slice(0, 12).map(body => ({
          id: body.plugin.boardId,
          radius: body.circleRadius,
          x: Number(body.position.x.toFixed(2)),
          y: Number(body.position.y.toFixed(2)),
          vx: Number(body.velocity.x.toFixed(3)),
          vy: Number(body.velocity.y.toFixed(3)),
          sleeping: body.isSleeping,
        })),
        sleepingSamples: moving.filter(body => body.isSleeping).slice(0, 10)
          .map(body => [Math.round(body.position.x), Math.round(body.position.y)]),
        belowGateSamples: moving.filter(body => body.position.y > 1124).slice(0, 12)
          .map(body => [Math.round(body.position.x), Math.round(body.position.y)]),
        fixtureBodies: staticBodies.length + seesaws.length + 3
          + drums.carrierBodies.length + propellerVanes.length,
        drums: drums.carrierBodies.length };
    },
  };
}
