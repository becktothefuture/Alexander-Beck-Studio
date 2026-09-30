const DEFAULT_PASSES = 10;
const DEFAULT_TOLERANCE = 0.03;
const MIN_CELL_SIZE = 0.000001;
const DISTANCE_EPSILON = 1e-12;
const SUPPORT_NORMAL_Y = -0.2;

function growInt32(array, minimumLength) {
  if (array.length >= minimumLength) return array;
  let length = Math.max(16, array.length || 16);
  while (length < minimumLength) length *= 2;
  const grown = new Int32Array(length);
  grown.set(array);
  return grown;
}

function growUint8(array, minimumLength) {
  if (array.length >= minimumLength) return array;
  let length = Math.max(16, array.length || 16);
  while (length < minimumLength) length *= 2;
  const grown = new Uint8Array(length);
  grown.set(array);
  return grown;
}

/** Final volume constraint for the native rigid-body world.
 *
 * Rapier still owns gravity, CCD, friction and restitution. This bounded pass
 * separates exact visible circles where a deep granular stack has compressed
 * beyond its numerical tolerance. Bottom-to-top traversal propagates fixture
 * support, while unsupported pairs share corrections by inverse mass.
 * Sleeping neighbours remain contact candidates; an entirely sleeping pack
 * is untouched. The caller writes back only circles marked `changed`.
 */
export function createBoardCircleContactGuard({
  passes = DEFAULT_PASSES,
  tolerance = DEFAULT_TOLERANCE,
  cellSize = 0,
} = {}) {
  const maximumPasses = Math.max(1, Math.floor(Number(passes) || DEFAULT_PASSES));
  const allowedPenetration = Math.max(0, Number(tolerance) || 0);
  const correctionTolerance = allowedPenetration * 0.5;
  const configuredCellSize = Math.max(0, Number(cellSize) || 0);
  const diagnostics = {
    passes: 0,
    circles: 0,
    activeCircles: 0,
    changedCircles: 0,
    pairsTested: 0,
    pairsCorrected: 0,
    fixtureCorrections: 0,
    maxPenetration: 0,
    remainingPenetration: 0,
    maxCorrection: 0,
    cellSize: 0,
    groundedCircles: 0,
    supportLevels: 0,
    graphRefreshes: 0,
    gridBuilds: 0,
    gridReuses: 0,
  };
  let cellHeads = new Int32Array(0);
  let nextCircle = new Int32Array(0);
  let circleCellX = new Int32Array(0);
  let circleCellY = new Int32Array(0);
  let gridValid = false;
  let grounded = new Uint8Array(0);
  let occupiedRowFlags = new Uint8Array(0);
  let occupiedRows = new Int32Array(0);
  let occupiedRowCount = 0;
  let gridMinX = 0;
  let gridMinY = 0;
  let gridColumns = 0;
  let gridRows = 0;

  function markChanged(circle) {
    if (circle.changed) return;
    circle.changed = true;
    diagnostics.changedCircles += 1;
  }

  function buildGrid(circles, resolvedCellSize) {
    if (gridValid) {
      let unchanged = true;
      for (let index = 0; index < circles.length; index += 1) {
        const circle = circles[index];
        if (circle.radius <= 0) continue;
        const next = nextCircle[index];
        // Reuse only while cell membership AND bottom-to-top ordering match
        // a fresh build. Tiny corrections often leave both unchanged. Crossing
        // either boundary requires a rebuild before the next contact pass.
        if (Math.floor(circle.x / resolvedCellSize) !== circleCellX[index]
          || Math.floor(circle.y / resolvedCellSize) !== circleCellY[index]
          || (next >= 0 && (circle.y < circles[next].y
            || (circle.y === circles[next].y && index > next)))) {
          unchanged = false;
          break;
        }
      }
      if (unchanged) {
        diagnostics.gridReuses += 1;
        return;
      }
    }
    diagnostics.gridBuilds += 1;
    circleCellX = growInt32(circleCellX, circles.length);
    circleCellY = growInt32(circleCellY, circles.length);
    let minimumX = Infinity;
    let minimumY = Infinity;
    let maximumX = -Infinity;
    let maximumY = -Infinity;
    for (let index = 0; index < circles.length; index += 1) {
      const circle = circles[index];
      if (circle.radius <= 0) continue;
      const x = Math.floor(circle.x / resolvedCellSize);
      const y = Math.floor(circle.y / resolvedCellSize);
      circleCellX[index] = x;
      circleCellY[index] = y;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
    if (!Number.isFinite(minimumX)) {
      gridColumns = 0;
      gridRows = 0;
      occupiedRowCount = 0;
      return;
    }
    gridMinX = minimumX;
    gridMinY = minimumY;
    gridColumns = maximumX - minimumX + 1;
    gridRows = maximumY - minimumY + 1;
    const cellCount = gridColumns * gridRows;
    cellHeads = growInt32(cellHeads, cellCount);
    nextCircle = growInt32(nextCircle, circles.length);
    occupiedRowFlags = growUint8(occupiedRowFlags, gridRows);
    occupiedRows = growInt32(occupiedRows, gridRows);
    cellHeads.fill(-1, 0, cellCount);
    occupiedRowFlags.fill(0, 0, gridRows);
    occupiedRowCount = 0;
    for (let index = 0; index < circles.length; index += 1) {
      const circle = circles[index];
      if (circle.radius <= 0) continue;
      const x = circleCellX[index] - gridMinX;
      const y = circleCellY[index] - gridMinY;
      const cellIndex = y * gridColumns + x;
      occupiedRowFlags[y] = 1;
      let previous = -1;
      let current = cellHeads[cellIndex];
      // Buckets normally contain only two or three circles. Keep that short
      // list bottom-to-top so support propagates without a global sort.
      while (current >= 0 && (circles[current].y > circle.y
        || (circles[current].y === circle.y && current < index))) {
        previous = current;
        current = nextCircle[current];
      }
      nextCircle[index] = current;
      if (previous < 0) cellHeads[cellIndex] = index;
      else nextCircle[previous] = index;
    }
    // The board has a compact reservoir plus a long, mostly empty journey.
    // Retain gravity order while avoiding a full column scan for empty rows.
    for (let y = gridRows - 1; y >= 0; y -= 1) {
      if (occupiedRowFlags[y]) occupiedRows[occupiedRowCount++] = y;
    }
    gridValid = true;
  }

  function seedFixtures(circles, fixtureConstraints, correctPositions) {
    let corrected = false;
    for (let index = 0; index < fixtureConstraints.length; index += 1) {
      const constraint = fixtureConstraints[index];
      const circleIndex = constraint.circleIndex;
      const circle = circles[circleIndex];
      if (!circle || circle.radius <= 0) continue;
      const distance = constraint.nx * circle.x + constraint.ny * circle.y
        - constraint.offset;
      if (constraint.ny <= SUPPORT_NORMAL_Y && distance <= allowedPenetration + 0.1) {
        grounded[circleIndex] = 1;
      }
      const penetration = -distance;
      if (!correctPositions || penetration <= correctionTolerance || circle.inverseMass <= 0
        || (circle.active === false && !circle.changed)) continue;
      const correction = penetration - correctionTolerance;
      circle.x += constraint.nx * correction;
      circle.y += constraint.ny * correction;
      const normalVelocity = circle.vx * constraint.nx + circle.vy * constraint.ny;
      if (normalVelocity < 0) {
        circle.vx -= constraint.nx * normalVelocity;
        circle.vy -= constraint.ny * normalVelocity;
      }
      markChanged(circle);
      corrected = true;
      diagnostics.fixtureCorrections += 1;
      diagnostics.maxPenetration = Math.max(diagnostics.maxPenetration, penetration);
      diagnostics.maxCorrection = Math.max(diagnostics.maxCorrection, correction);
    }
    return corrected;
  }

  function solvePair(circles, firstIndex, secondIndex, measureOnly) {
    const first = circles[firstIndex];
    const second = circles[secondIndex];
    const dy = second.y - first.y;
    const verticalStep = Math.min(first.radius, second.radius) * 0.1;
    if (dy > 0 || (dy === 0 && secondIndex < firstIndex)) return 0;
    const firstIsLower = dy < -verticalStep;
    diagnostics.pairsTested += 1;
    const dx = second.x - first.x;
    const distanceSquared = dx * dx + dy * dy;
    const minimumDistance = first.radius + second.radius;
    const supportPair = firstIsLower && grounded[firstIndex];
    const supportDistance = minimumDistance + allowedPenetration + 0.1;
    if (supportPair && distanceSquared <= supportDistance * supportDistance) {
      grounded[secondIndex] = 1;
    }
    if (distanceSquared >= minimumDistance * minimumDistance) return 0;
    const distance = Math.sqrt(distanceSquared);
    const penetration = minimumDistance - distance;
    if (measureOnly || penetration <= correctionTolerance) return penetration;
    if (first.active === false && second.active === false
      && !first.changed && !second.changed) return penetration;
    correctPair(first, second, firstIndex, secondIndex, dx, dy, distance, penetration, supportPair);
    return penetration;
  }

  // Keep the frequent proximity test small. Only overlapping active pairs
  // enter the mass/velocity solve, with exactly the same correction order.
  function correctPair(
    first, second, firstIndex, secondIndex, dx, dy, distance, penetration, supportPair,
  ) {
    const firstInverseMass = Math.max(0, first.inverseMass);
    const secondInverseMass = Math.max(0, second.inverseMass);
    const totalInverseMass = firstInverseMass + secondInverseMass;
    if (totalInverseMass <= 0) return;
    const normalX = distance > DISTANCE_EPSILON ? dx / distance
      : ((firstIndex + secondIndex) % 2 ? 1 : -1);
    const normalY = distance > DISTANCE_EPSILON ? dy / distance : 0;
    let firstShare = firstInverseMass / totalInverseMass;
    let secondShare = secondInverseMass / totalInverseMass;
    if (supportPair) {
      firstShare = 0;
      secondShare = 1;
    }
    const correction = Math.min(penetration - correctionTolerance,
      Math.min(first.radius, second.radius) * 0.25);
    first.x -= normalX * correction * firstShare;
    first.y -= normalY * correction * firstShare;
    second.x += normalX * correction * secondShare;
    second.y += normalY * correction * secondShare;

    const relativeNormalVelocity = (second.vx - first.vx) * normalX
      + (second.vy - first.vy) * normalY;
    let changedFirst = firstShare > 0;
    let changedSecond = secondShare > 0;
    if (relativeNormalVelocity < 0) {
      // A quiet support may absorb compression. If it moves into its upper
      // neighbour, use both physical masses: copying that speed adds energy.
      const supportApproach = first.vx * normalX + first.vy * normalY;
      const velocityFirstInverseMass = supportPair && supportApproach <= 0
        ? 0 : firstInverseMass;
      const velocitySecondInverseMass = secondInverseMass;
      const velocityInverseMass = velocityFirstInverseMass + velocitySecondInverseMass;
      if (velocityInverseMass > 0) {
        const impulse = -relativeNormalVelocity / velocityInverseMass;
        first.vx -= normalX * impulse * velocityFirstInverseMass;
        first.vy -= normalY * impulse * velocityFirstInverseMass;
        second.vx += normalX * impulse * velocitySecondInverseMass;
        second.vy += normalY * impulse * velocitySecondInverseMass;
        changedFirst ||= velocityFirstInverseMass > 0;
        changedSecond ||= velocitySecondInverseMass > 0;
      }
    }
    if (changedFirst) markChanged(first);
    if (changedSecond) markChanged(second);
    diagnostics.pairsCorrected += 1;
    diagnostics.maxPenetration = Math.max(diagnostics.maxPenetration, penetration);
    diagnostics.maxCorrection = Math.max(diagnostics.maxCorrection,
      correction * Math.max(firstShare, secondShare));
    return;
  }

  function visitPairs(circles, neighbourSpan, measureOnly = false) {
    let maximum = 0;
    for (let occupiedIndex = 0; occupiedIndex < occupiedRowCount; occupiedIndex += 1) {
      const cellY = occupiedRows[occupiedIndex];
      for (let cellX = 0; cellX < gridColumns; cellX += 1) {
        let firstIndex = cellHeads[cellY * gridColumns + cellX];
        while (firstIndex >= 0) {
          const startX = Math.max(0, cellX - neighbourSpan);
          const endX = Math.min(gridColumns - 1, cellX + neighbourSpan);
          const startY = Math.max(0, cellY - neighbourSpan);
          // Gravity order means this circle only owns contacts in its cell
          // row or above it. Lower rows will own the reverse pair later.
          for (let y = cellY; y >= startY; y -= 1) {
            for (let x = startX; x <= endX; x += 1) {
              let secondIndex = cellHeads[y * gridColumns + x];
              while (secondIndex >= 0) {
                if (secondIndex !== firstIndex) {
                  maximum = Math.max(maximum,
                    solvePair(circles, firstIndex, secondIndex, measureOnly));
                }
                secondIndex = nextCircle[secondIndex];
              }
            }
          }
          firstIndex = nextCircle[firstIndex];
        }
      }
    }
    return maximum;
  }

  function solve(circles, fixtureConstraints = []) {
    diagnostics.passes = 0;
    diagnostics.circles = circles.length;
    diagnostics.activeCircles = 0;
    diagnostics.changedCircles = 0;
    diagnostics.pairsTested = 0;
    diagnostics.pairsCorrected = 0;
    diagnostics.fixtureCorrections = 0;
    diagnostics.maxPenetration = 0;
    diagnostics.remainingPenetration = 0;
    diagnostics.maxCorrection = 0;
    diagnostics.groundedCircles = 0;
    diagnostics.supportLevels = 0;
    diagnostics.graphRefreshes = 0;
    diagnostics.gridBuilds = 0;
    diagnostics.gridReuses = 0;
    // Membership, radii and native motion can change between physical steps.
    // Reuse is limited to the correction passes of this one solve.
    gridValid = false;
    grounded = growUint8(grounded, circles.length);
    grounded.fill(0, 0, circles.length);
    let maximumDiameter = 0;
    for (let index = 0; index < circles.length; index += 1) {
      const circle = circles[index];
      circle.changed = false;
      if (circle.radius > 0) maximumDiameter = Math.max(maximumDiameter, circle.radius * 2);
      if (circle.active !== false && circle.radius > 0) diagnostics.activeCircles += 1;
    }
    const resolvedCellSize = Math.max(MIN_CELL_SIZE,
      configuredCellSize || maximumDiameter || 1);
    const neighbourSpan = Math.max(1, Math.ceil(maximumDiameter / resolvedCellSize));
    diagnostics.cellSize = resolvedCellSize;
    if (!diagnostics.activeCircles) return diagnostics;

    for (let pass = 0; pass < maximumPasses; pass += 1) {
      const fixtureChanged = seedFixtures(circles, fixtureConstraints, true);
      buildGrid(circles, resolvedCellSize);
      diagnostics.graphRefreshes += 1;
      const correctedBefore = diagnostics.pairsCorrected;
      visitPairs(circles, neighbourSpan, false);
      diagnostics.passes = pass + 1;
      if (!fixtureChanged && diagnostics.pairsCorrected === correctedBefore) break;
    }
    seedFixtures(circles, fixtureConstraints, true);
    buildGrid(circles, resolvedCellSize);
    visitPairs(circles, neighbourSpan, false);
    visitPairs(circles, neighbourSpan, false);
    seedFixtures(circles, fixtureConstraints, true);
    buildGrid(circles, resolvedCellSize);
    let maximum = visitPairs(circles, neighbourSpan, true);
    for (let index = 0; index < fixtureConstraints.length; index += 1) {
      const constraint = fixtureConstraints[index];
      const circle = circles[constraint.circleIndex];
      if (!circle) continue;
      maximum = Math.max(maximum, constraint.offset
        - constraint.nx * circle.x - constraint.ny * circle.y);
    }
    let groundedCount = 0;
    for (let index = 0; index < circles.length; index += 1) groundedCount += grounded[index];
    diagnostics.groundedCircles = groundedCount;
    diagnostics.supportLevels = groundedCount ? 1 : 0;
    diagnostics.remainingPenetration = Math.max(0, maximum);
    return diagnostics;
  }

  function reset() {
    gridValid = false;
    if (cellHeads.length) cellHeads.fill(-1);
    if (grounded.length) grounded.fill(0);
    occupiedRowCount = 0;
  }

  return { solve, reset };
}
