import Matter from 'matter-js';
import { reboundLevelForFixture, reboundMaterial, TRANSFER_CANAL_MATERIAL } from './boardMaterials.js';

const { Bodies } = Matter;

/** Resolve a Figma layer's local coordinates into the stable 960-unit board.
 * This excludes the responsive transform applied to the Geometry root. */
function elementToBoardMatrix(element) {
  const geometry = element.ownerSVGElement?.querySelector('#Geometry');
  const elementMatrix = element.getCTM();
  const geometryMatrix = geometry?.getCTM();
  if (!elementMatrix || !geometryMatrix) return null;
  return geometryMatrix.inverse().multiply(elementMatrix);
}

export function pointOnBoard(element, point) {
  const matrix = elementToBoardMatrix(element);
  if (!matrix) return point;
  return {
    x: point.x * matrix.a + point.y * matrix.c + matrix.e,
    y: point.x * matrix.b + point.y * matrix.d + matrix.f,
  };
}

export function boundsOnBoard(element) {
  const box = element.getBBox();
  const corners = [
    pointOnBoard(element, { x: box.x, y: box.y }),
    pointOnBoard(element, { x: box.x + box.width, y: box.y }),
    pointOnBoard(element, { x: box.x, y: box.y + box.height }),
    pointOnBoard(element, { x: box.x + box.width, y: box.y + box.height }),
  ];
  const xs = corners.map(point => point.x);
  const ys = corners.map(point => point.y);
  return {
    x: Math.min(...xs), y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

export function railBodies(path) {
  const length = path.getTotalLength();
  const count = Math.max(1, Math.ceil(length / 32));
  const thickness = Number(path.getAttribute('stroke-width')) || 18;
  const material = path.id.startsWith('drum-transfer-')
    ? TRANSFER_CANAL_MATERIAL : reboundMaterial(reboundLevelForFixture(path.id));
  const result = [];
  const first = pointOnBoard(path, path.getPointAtLength(0));
  let start = first;
  for (let index = 1; index <= count; index += 1) {
    const end = pointOnBoard(path, path.getPointAtLength((length * index) / count));
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0.1) {
      result.push(Bodies.rectangle((start.x + end.x) / 2, (start.y + end.y) / 2,
        distance + 2, thickness, {
          isStatic: true, angle: Math.atan2(dy, dx), ...material,
          label: `rail:${path.id}`,
        }));
    }
    start = end;
  }
  // Match the SVG's rounded caps. These small circles remove the sub-pixel
  // corner where a ball could catch on the end of a rectangular approximation.
  result.push(Bodies.circle(first.x, first.y, thickness / 2, {
    isStatic: true, ...material, label: `rail:${path.id}`,
  }));
  result.push(Bodies.circle(start.x, start.y, thickness / 2, {
    isStatic: true, ...material, label: `rail:${path.id}`,
  }));
  return result;
}
