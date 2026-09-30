import Matter from 'matter-js';
import { createBoardSpatialIndex } from './boardSpatialIndex.js';

const { Collision, Detector, Engine } = Matter;
const MATTER_BASE_DELTA_MS = 1000 / 60;
const detectorContexts = new WeakMap();
const detectorSpatialStates = new WeakMap();
const DETECTOR_CELL_SIZE = 32;

function boardBoundsMinX(body) {
  return body.plugin?.boardId && body.circleRadius
    ? body.position.x - body.circleRadius : body.bounds.min.x;
}

function boardBoundsMaxX(body) {
  return body.plugin?.boardId && body.circleRadius
    ? body.position.x + body.circleRadius : body.bounds.max.x;
}

function boardBoundsMinY(body) {
  return body.plugin?.boardId && body.circleRadius
    ? body.position.y - body.circleRadius : body.bounds.min.y;
}

function boardBoundsMaxY(body) {
  return body.plugin?.boardId && body.circleRadius
    ? body.position.y + body.circleRadius : body.bounds.max.y;
}

function compareBoardBoundsX(bodyA, bodyB) {
  return boardBoundsMinX(bodyA) - boardBoundsMinX(bodyB);
}

function detectorSpatialState(detector, requiredCapacity) {
  let state = detectorSpatialStates.get(detector);
  if (!state) {
    state = {
      cells: [],
      activeCells: [],
      used: [],
      usedActive: [],
      candidates: [],
      marks: new Uint32Array(Math.max(64, requiredCapacity)),
      generation: 0,
      originX: 0,
      originY: 0,
      columns: 0,
      rows: 0,
    };
    detectorSpatialStates.set(detector, state);
  } else if (state.marks.length < requiredCapacity) {
    let capacity = state.marks.length;
    while (capacity < requiredCapacity) capacity *= 2;
    state.marks = new Uint32Array(capacity);
    state.generation = 0;
  }
  return state;
}

function rebuildDetectorSpatialState(state, bodies) {
  for (const bucket of state.used) bucket.length = 0;
  for (const bucket of state.usedActive) bucket.length = 0;
  state.used.length = 0;
  state.usedActive.length = 0;
  let minimumCellX = Infinity;
  let minimumCellY = Infinity;
  let maximumCellX = -Infinity;
  let maximumCellY = -Infinity;
  for (const body of bodies) {
    minimumCellX = Math.min(minimumCellX,
      Math.floor(boardBoundsMinX(body) / DETECTOR_CELL_SIZE));
    minimumCellY = Math.min(minimumCellY,
      Math.floor(boardBoundsMinY(body) / DETECTOR_CELL_SIZE));
    maximumCellX = Math.max(maximumCellX,
      Math.floor(boardBoundsMaxX(body) / DETECTOR_CELL_SIZE));
    maximumCellY = Math.max(maximumCellY,
      Math.floor(boardBoundsMaxY(body) / DETECTOR_CELL_SIZE));
  }
  const currentMaximumX = state.originX + state.columns - 1;
  const currentMaximumY = state.originY + state.rows - 1;
  if (!state.columns || minimumCellX < state.originX || minimumCellY < state.originY
    || maximumCellX > currentMaximumX || maximumCellY > currentMaximumY) {
    // Keep a small empty rim around the active world. Draining balls may cross
    // a cell boundary, but that must not rebuild the cell-array allocation on
    // successive frames. The domain grows only when the world leaves this rim.
    const margin = 4;
    const nextMinimumX = state.columns
      ? Math.min(state.originX, minimumCellX - margin) : minimumCellX - margin;
    const nextMinimumY = state.rows
      ? Math.min(state.originY, minimumCellY - margin) : minimumCellY - margin;
    const nextMaximumX = state.columns
      ? Math.max(currentMaximumX, maximumCellX + margin) : maximumCellX + margin;
    const nextMaximumY = state.rows
      ? Math.max(currentMaximumY, maximumCellY + margin) : maximumCellY + margin;
    state.originX = nextMinimumX;
    state.originY = nextMinimumY;
    state.columns = nextMaximumX - nextMinimumX + 1;
    state.rows = nextMaximumY - nextMinimumY + 1;
    state.cells = new Array(state.columns * state.rows);
    state.activeCells = new Array(state.columns * state.rows);
  }
  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index];
    const minX = Math.floor(boardBoundsMinX(body) / DETECTOR_CELL_SIZE);
    const maxX = Math.floor(boardBoundsMaxX(body) / DETECTOR_CELL_SIZE);
    const minY = Math.floor(boardBoundsMinY(body) / DETECTOR_CELL_SIZE);
    const maxY = Math.floor(boardBoundsMaxY(body) / DETECTOR_CELL_SIZE);
    for (let cellY = minY; cellY <= maxY; cellY += 1) {
      for (let cellX = minX; cellX <= maxX; cellX += 1) {
        const cellIndex = (cellY - state.originY) * state.columns + cellX - state.originX;
        let bucket = state.cells[cellIndex];
        if (!bucket) {
          bucket = [];
          state.cells[cellIndex] = bucket;
        }
        if (!bucket.length) state.used.push(bucket);
        bucket.push(index);
        if (!body.isStatic && !body.isSleeping) {
          let activeBucket = state.activeCells[cellIndex];
          if (!activeBucket) {
            activeBucket = [];
            state.activeCells[cellIndex] = activeBucket;
          }
          if (!activeBucket.length) state.usedActive.push(activeBucket);
          activeBucket.push(index);
        }
      }
    }
  }
}

function detectorCandidates(state, body, minimumIndex, activeOnly) {
  state.candidates.length = 0;
  state.generation += 1;
  if (state.generation === 0xffffffff) {
    state.marks.fill(0);
    state.generation = 1;
  }
  const generation = state.generation;
  const minX = Math.floor(boardBoundsMinX(body) / DETECTOR_CELL_SIZE);
  const maxX = Math.floor(boardBoundsMaxX(body) / DETECTOR_CELL_SIZE);
  const minY = Math.floor(boardBoundsMinY(body) / DETECTOR_CELL_SIZE);
  const maxY = Math.floor(boardBoundsMaxY(body) / DETECTOR_CELL_SIZE);
  for (let cellY = minY; cellY <= maxY; cellY += 1) {
    for (let cellX = minX; cellX <= maxX; cellX += 1) {
      const localX = cellX - state.originX;
      const localY = cellY - state.originY;
      if (localX < 0 || localX >= state.columns || localY < 0 || localY >= state.rows) continue;
      const cellIndex = localY * state.columns + localX;
      const bucket = activeOnly ? state.activeCells[cellIndex] : state.cells[cellIndex];
      if (!bucket) continue;
      for (const index of bucket) {
        if (index <= minimumIndex || state.marks[index] === generation) continue;
        state.marks[index] = generation;
        state.candidates.push(index);
      }
    }
  }
  // Matter's resolver is order-sensitive in a loaded pile. Retain the same
  // lexicographic pair order as its sorted X sweep, independent of bucket use.
  // Candidate sets are small; insertion sort avoids the comparatively large
  // callback/setup cost of Array.sort on every ball in every microstep.
  for (let index = 1; index < state.candidates.length; index += 1) {
    const value = state.candidates[index];
    let cursor = index - 1;
    while (cursor >= 0 && state.candidates[cursor] > value) {
      state.candidates[cursor + 1] = state.candidates[cursor];
      cursor -= 1;
    }
    state.candidates[cursor + 1] = value;
  }
  return state.candidates;
}

function boardCircleCollision(inputA, inputB, pairs) {
  let bodyA = inputA;
  let bodyB = inputB;
  if (bodyA.id > bodyB.id) {
    const swap = bodyA;
    bodyA = bodyB;
    bodyB = swap;
  }
  const deltaX = bodyB.position.x - bodyA.position.x;
  const deltaY = bodyB.position.y - bodyA.position.y;
  const radius = bodyA.circleRadius + bodyB.circleRadius;
  const distanceSquared = deltaX * deltaX + deltaY * deltaY;
  if (distanceSquared >= radius * radius) return null;

  const pair = pairs?.table?.[Matter.Pair.id(bodyA, bodyB)];
  const collision = pair?.collision || Collision.create(bodyA, bodyB);
  const distance = Math.sqrt(distanceSquared);
  let normalX = -1;
  let normalY = 0;
  if (distance > 1e-10) {
    // Matter's normal points from bodyB towards bodyA.
    normalX = -deltaX / distance;
    normalY = -deltaY / distance;
  } else if (collision.normal.x || collision.normal.y) {
    normalX = collision.normal.x;
    normalY = collision.normal.y;
  }
  const depth = radius - distance;
  collision.collided = true;
  collision.bodyA = bodyA;
  collision.bodyB = bodyB;
  collision.parentA = bodyA.parent;
  collision.parentB = bodyB.parent;
  collision.normal.x = normalX;
  collision.normal.y = normalY;
  collision.tangent.x = -normalY;
  collision.tangent.y = normalX;
  collision.penetration.x = normalX * depth;
  collision.penetration.y = normalY * depth;
  collision.depth = depth;

  // Keep one stable support object per pair so Matter can warm-start its
  // cached impulse. The midpoint lies on the shared centre line, preventing a
  // circle-to-circle normal impulse from inventing angular torque.
  let support = collision.supports[0];
  if (!support?._boardCircleSupport) {
    support = { x: 0, y: 0, body: bodyB, index: 0, _boardCircleSupport: true };
    collision.supports[0] = support;
  }
  support.x = (bodyA.position.x - normalX * bodyA.circleRadius
    + bodyB.position.x + normalX * bodyB.circleRadius) / 2;
  support.y = (bodyA.position.y - normalY * bodyA.circleRadius
    + bodyB.position.y + normalY * bodyB.circleRadius) / 2;
  support.body = bodyB;
  collision.supports[1] = null;
  collision.supportCount = 1;
  return collision;
}

/**
 * Reusable broad phase for adaptive ball substeps.
 *
 * The former fallback compared every fast ball with every other ball. A full
 * desktop reservoir turns that into millions of bounds checks before Matter
 * even starts a solver step. This index retains the exact swept-AABB test, but
 * limits it to centres that can reach the queried sweep during this step.
 */
export function createBoardAdaptiveNeighbourSearch(cellSize = 48) {
  const index = createBoardSpatialIndex(cellSize);
  const candidates = [];
  let maximumRadius = 0;
  let maximumPositiveX = 0;
  let maximumNegativeX = 0;
  let maximumPositiveY = 0;
  let maximumNegativeY = 0;
  let deltaScale = 0;

  return {
    rebuild(bodies, stepMs) {
      index.reset();
      maximumRadius = 0;
      maximumPositiveX = 0;
      maximumNegativeX = 0;
      maximumPositiveY = 0;
      maximumNegativeY = 0;
      deltaScale = stepMs / MATTER_BASE_DELTA_MS;
      for (const body of bodies) {
        if (!body?.circleRadius || body.isSensor) continue;
        index.add(body);
        maximumRadius = Math.max(maximumRadius, body.circleRadius);
        const travelX = (body.velocity?.x || 0) * deltaScale;
        const travelY = (body.velocity?.y || 0) * deltaScale;
        maximumPositiveX = Math.max(maximumPositiveX, travelX);
        maximumNegativeX = Math.max(maximumNegativeX, -travelX);
        maximumPositiveY = Math.max(maximumPositiveY, travelY);
        maximumNegativeY = Math.max(maximumNegativeY, -travelY);
      }
    },

    hasPotentialContact(body, minX, minY, maxX, maxY) {
      // A centre can start outside the queried sweep and still enter it during
      // this step. Expand each side by the largest radius and directional
      // travel in the current population before applying the exact old test.
      index.query(
        minX - maximumRadius - maximumPositiveX,
        minY - maximumRadius - maximumPositiveY,
        maxX + maximumRadius + maximumNegativeX,
        maxY + maximumRadius + maximumNegativeY,
        candidates,
      );
      for (const other of candidates) {
        if (other === body || other.isSensor) continue;
        const bounds = other.bounds;
        const otherX = (other.velocity?.x || 0) * deltaScale;
        const otherY = (other.velocity?.y || 0) * deltaScale;
        if (bounds.max.x + Math.max(0, otherX) >= minX
          && bounds.min.x + Math.min(0, otherX) <= maxX
          && bounds.max.y + Math.max(0, otherY) >= minY
          && bounds.min.y + Math.min(0, otherY) <= maxY) return true;
      }
      return false;
    },
  };
}

/** Reusable bounds index for rails and mechanisms. Long page walls are added
 * to every cell they cross, so querying a small ball sweep never scans the
 * complete architecture collection and never misses an off-centre fixture. */
export function createBoardFixtureBoundsSearch(cellSize = 96) {
  const size = Math.max(1, cellSize);
  const buckets = new Map();
  const used = [];
  const candidates = [];
  const seen = new Set();
  const key = (x, y) => (y + 32768) * 65536 + x + 32768;

  return {
    rebuild(fixtures) {
      for (const bucket of used) bucket.length = 0;
      used.length = 0;
      for (const fixture of fixtures) {
        if (!fixture?.bounds) continue;
        const minX = Math.floor(fixture.bounds.min.x / size);
        const maxX = Math.floor(fixture.bounds.max.x / size);
        const minY = Math.floor(fixture.bounds.min.y / size);
        const maxY = Math.floor(fixture.bounds.max.y / size);
        for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
          const id = key(x, y);
          let bucket = buckets.get(id);
          if (!bucket) { bucket = []; buckets.set(id, bucket); }
          if (!bucket.length) used.push(bucket);
          bucket.push(fixture);
        }
      }
    },

    query(minX, minY, maxX, maxY) {
      candidates.length = 0;
      seen.clear();
      for (let y = Math.floor(minY / size); y <= Math.floor(maxY / size); y += 1) {
        for (let x = Math.floor(minX / size); x <= Math.floor(maxX / size); x += 1) {
          const bucket = buckets.get(key(x, y));
          if (!bucket) continue;
          for (const fixture of bucket) {
            if (seen.has(fixture)) continue;
            seen.add(fixture);
            if (fixture.bounds.max.x >= minX && fixture.bounds.min.x <= maxX
              && fixture.bounds.max.y >= minY && fixture.bounds.min.y <= maxY) {
              candidates.push(fixture);
            }
          }
        }
      }
      return candidates;
    },
  };
}

/**
 * Matter represents circles as inscribed many-sided polygons. The reservoir
 * is packed at true circle tangency, so the stock detector leaves a small gap
 * at many orientations and the released pile first collapses through those
 * gaps. Use the authored radii for circle pairs, while retaining Matter's
 * normal SAT records and solver for every architecture contact.
 */
export function boardDetectorCollisions(detector) {
  const pairs = detector.pairs;
  const bodies = detector.bodies;
  const collisions = detector.collisions;
  let collisionIndex = 0;

  if (!bodies.length) {
    collisions.length = 0;
    return collisions;
  }

  bodies.sort(compareBoardBoundsX);
  const spatial = detectorSpatialState(detector, bodies.length);
  rebuildDetectorSpatialState(spatial, bodies);
  for (let indexA = 0; indexA < bodies.length; indexA += 1) {
    const bodyA = bodies[indexA];
    const boundsA = bodyA.bounds;
    const boundXMax = bodyA.plugin?.boardId && bodyA.circleRadius
      ? bodyA.position.x + bodyA.circleRadius : boundsA.max.x;
    const boundYMax = bodyA.plugin?.boardId && bodyA.circleRadius
      ? bodyA.position.y + bodyA.circleRadius : boundsA.max.y;
    const boundYMin = bodyA.plugin?.boardId && bodyA.circleRadius
      ? bodyA.position.y - bodyA.circleRadius : boundsA.min.y;
    const bodyAStatic = bodyA.isStatic || bodyA.isSleeping;
    const partsALength = bodyA.parts.length;
    const candidates = detectorCandidates(spatial, bodyA, indexA, bodyAStatic);
    for (const indexB of candidates) {
      const bodyB = bodies[indexB];
      const boundsB = bodyB.bounds;
      const boundBMinX = boardBoundsMinX(bodyB);
      const boundBMaxY = bodyB.plugin?.boardId && bodyB.circleRadius
        ? bodyB.position.y + bodyB.circleRadius : boundsB.max.y;
      const boundBMinY = bodyB.plugin?.boardId && bodyB.circleRadius
        ? bodyB.position.y - bodyB.circleRadius : boundsB.min.y;
      if (boundBMinX > boundXMax) continue;
      if (boundYMax < boundBMinY || boundYMin > boundBMaxY) continue;
      if (bodyAStatic && (bodyB.isStatic || bodyB.isSleeping)) continue;
      if (!Detector.canCollide(bodyA.collisionFilter, bodyB.collisionFilter)) continue;

      const partsBLength = bodyB.parts.length;
      if (partsALength === 1 && partsBLength === 1) {
        const collision = bodyA.plugin?.boardId && bodyB.plugin?.boardId
          && bodyA.circleRadius && bodyB.circleRadius
          ? boardCircleCollision(bodyA, bodyB, pairs)
          : Collision.collides(bodyA, bodyB, pairs);
        if (collision) collisions[collisionIndex++] = collision;
        continue;
      }

      const partsAStart = partsALength > 1 ? 1 : 0;
      const partsBStart = partsBLength > 1 ? 1 : 0;
      for (let partAIndex = partsAStart; partAIndex < partsALength; partAIndex += 1) {
        const partA = bodyA.parts[partAIndex];
        const partABounds = partA.bounds;
        for (let partBIndex = partsBStart; partBIndex < partsBLength; partBIndex += 1) {
          const partB = bodyB.parts[partBIndex];
          const partBBounds = partB.bounds;
          if (partABounds.min.x > partBBounds.max.x || partABounds.max.x < partBBounds.min.x
            || partABounds.max.y < partBBounds.min.y
            || partABounds.min.y > partBBounds.max.y) continue;
          const collision = Collision.collides(partA, partB, pairs);
          if (collision) collisions[collisionIndex++] = collision;
        }
      }
    }
  }
  collisions.length = collisionIndex;
  return collisions;
}

/** Install the conservative circle prefilter for this engine update only.
 * A nested update from another Matter world still receives its own detector. */
export function updateBoardEngine(engine, deltaMs) {
  let context = detectorContexts.get(engine);
  if (!context) {
    context = { fallback: null, wrapper: null };
    context.wrapper = detector => (detector === engine.detector
      ? boardDetectorCollisions(detector)
      : context.fallback(detector));
    detectorContexts.set(engine, context);
  }
  const previous = Detector.collisions;
  context.fallback = previous;
  Detector.collisions = context.wrapper;
  try {
    Engine.update(engine, deltaMs);
  } finally {
    Detector.collisions = previous;
    context.fallback = null;
  }
}

/**
 * Share the configured solver work across collision substeps.
 *
 * Substeps already repeat contact convergence. Keeping 16/8/4 iterations on
 * every one of twelve substeps multiplied the loaded reservoir's solver work
 * by twelve. The floors ensure every sampled contact receives a position,
 * velocity and constraint pass, while the total passes never fall below the
 * engine's configured single-step budget.
 */
export function boardMicroStepIterationBudget(base, microSteps, positionFloor = 4) {
  const steps = Math.max(1, Math.floor(Number(microSteps) || 1));
  const distribute = (value, floor) => Math.max(floor,
    Math.ceil(Math.max(0, Number(value) || 0) / steps));
  return {
    positionIterations: distribute(base.positionIterations, Math.max(2, positionFloor)),
    velocityIterations: distribute(base.velocityIterations, 1),
    constraintIterations: distribute(base.constraintIterations, 1),
  };
}
