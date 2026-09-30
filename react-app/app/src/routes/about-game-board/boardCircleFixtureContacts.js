import { createBoardSpatialIndex } from './boardSpatialIndex.js';

/** Exact circle-to-convex separation using the same posed vertices as the
 * artwork collider. The returned normal points from the fixture to the ball. */
export function circleFixtureSeparation(circle, part, result) {
  if (part.circleRadius > 0) {
    const dx = circle.x - part.position.x;
    const dy = circle.y - part.position.y;
    const distance = Math.hypot(dx, dy);
    result.nx = distance > 1e-9 ? dx / distance : 0;
    result.ny = distance > 1e-9 ? dy / distance : -1;
    result.distance = distance - circle.radius - part.circleRadius;
    return result;
  }
  const vertices = part.vertices;
  let positive = false, negative = false;
  let nearestSquared = Infinity, nearestX = 0, nearestY = 0;
  let edgeX = 0, edgeY = 1;
  for (let index = 0; index < vertices.length; index += 1) {
    const a = vertices[index], b = vertices[(index + 1) % vertices.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const cross = dx * (circle.y - a.y) - dy * (circle.x - a.x);
    positive ||= cross > 1e-9;
    negative ||= cross < -1e-9;
    const lengthSquared = dx * dx + dy * dy;
    const along = lengthSquared > 1e-12
      ? Math.max(0, Math.min(1, ((circle.x - a.x) * dx + (circle.y - a.y) * dy) / lengthSquared)) : 0;
    const x = a.x + along * dx, y = a.y + along * dy;
    const squared = (circle.x - x) ** 2 + (circle.y - y) ** 2;
    if (squared < nearestSquared) {
      nearestSquared = squared; nearestX = x; nearestY = y;
      edgeX = dx; edgeY = dy;
    }
  }
  const inside = !(positive && negative);
  const distance = Math.sqrt(nearestSquared);
  if (distance > 1e-9) {
    const direction = inside ? -1 : 1;
    result.nx = direction * (circle.x - nearestX) / distance;
    result.ny = direction * (circle.y - nearestY) / distance;
  } else {
    const length = Math.hypot(edgeX, edgeY) || 1;
    result.nx = edgeY / length; result.ny = -edgeX / length;
    if (result.nx * (nearestX - part.position.x) + result.ny * (nearestY - part.position.y) < 0) {
      result.nx *= -1; result.ny *= -1;
    }
  }
  result.distance = (inside ? -distance : distance) - circle.radius;
  return result;
}

/** Reused broad phase and contact records keep the full reservoir's boundary
 * constraints independent of the native solver's shorter predictive margin. */
export function createBoardCircleFixtureContacts() {
  let index = null, cellSize = 0;
  const indexedCircles = [], candidates = [], pool = [], constraints = [];
  const contact = { nx: 0, ny: 0, distance: 0 };
  return {
    update(circles, fixtures) {
      let maximumRadius = 0;
      let minimumX = Infinity, minimumY = Infinity, maximumX = -Infinity, maximumY = -Infinity;
      for (const circle of circles) {
        maximumRadius = Math.max(maximumRadius, circle.radius);
        minimumX = Math.min(minimumX, circle.x); minimumY = Math.min(minimumY, circle.y);
        maximumX = Math.max(maximumX, circle.x); maximumY = Math.max(maximumY, circle.y);
      }
      const nextCellSize = Math.max(1, maximumRadius * 2);
      if (cellSize !== nextCellSize) {
        cellSize = nextCellSize;
        index = createBoardSpatialIndex(cellSize);
      }
      index.reset();
      for (let circleIndex = 0; circleIndex < circles.length; circleIndex += 1) {
        const circle = circles[circleIndex];
        const entry = indexedCircles[circleIndex]
          || (indexedCircles[circleIndex] = { position: { x: 0, y: 0 }, circleIndex });
        entry.position.x = circle.x; entry.position.y = circle.y;
        index.add(entry);
      }
      constraints.length = 0;
      const reach = maximumRadius * 2;
      const centreReach = reach + maximumRadius;
      for (const fixture of fixtures) {
        const parts = fixture.parts;
        for (let partIndex = parts.length > 1 ? 1 : 0; partIndex < parts.length; partIndex += 1) {
          const part = parts[partIndex];
          const bounds = part.bounds;
          // Most of the long board is empty while the reservoir drains. Do
          // not visit empty spatial cells along those distant mechanisms.
          const minX = Math.max(minimumX, bounds.min.x - centreReach);
          const minY = Math.max(minimumY, bounds.min.y - centreReach);
          const maxX = Math.min(maximumX, bounds.max.x + centreReach);
          const maxY = Math.min(maximumY, bounds.max.y + centreReach);
          if (minX > maxX || minY > maxY) continue;
          index.query(minX, minY, maxX, maxY, candidates);
          for (const entry of candidates) {
            const circle = circles[entry.circleIndex];
            if (!((circle.collisionFilter?.mask ?? 0xffff) & (fixture.collisionFilter?.category ?? 1))
              || !((fixture.collisionFilter?.mask ?? 0xffff) & (circle.collisionFilter?.category ?? 1))) continue;
            circleFixtureSeparation(circle, part, contact);
            if (contact.distance > reach) continue;
            const constraint = pool[constraints.length]
              || (pool[constraints.length] = { circleIndex: 0, nx: 0, ny: 0, offset: 0 });
            constraint.circleIndex = entry.circleIndex;
            constraint.nx = contact.nx; constraint.ny = contact.ny;
            constraint.offset = contact.nx * circle.x + contact.ny * circle.y - contact.distance;
            constraints.push(constraint);
          }
        }
      }
      return constraints;
    },
  };
}
