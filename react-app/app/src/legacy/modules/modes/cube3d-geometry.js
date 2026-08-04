const CUBE_VERTICES = Object.freeze([
  Object.freeze([-0.5, -0.5, -0.5]), Object.freeze([0.5, -0.5, -0.5]),
  Object.freeze([-0.5, 0.5, -0.5]), Object.freeze([0.5, 0.5, -0.5]),
  Object.freeze([-0.5, -0.5, 0.5]), Object.freeze([0.5, -0.5, 0.5]),
  Object.freeze([-0.5, 0.5, 0.5]), Object.freeze([0.5, 0.5, 0.5]),
]);

const CUBE_EDGES = Object.freeze([
  Object.freeze([0, 1]), Object.freeze([2, 3]),
  Object.freeze([4, 5]), Object.freeze([6, 7]),
  Object.freeze([0, 2]), Object.freeze([1, 3]),
  Object.freeze([4, 6]), Object.freeze([5, 7]),
  Object.freeze([0, 4]), Object.freeze([1, 5]),
  Object.freeze([2, 6]), Object.freeze([3, 7]),
]);

function lerp(from, to, amount) {
  return from + ((to - from) * amount);
}

export function updateCubeRotationMatrix(matrix, rotationX, rotationY, rotationZ) {
  const target = matrix || {};
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const cosZ = Math.cos(rotationZ);
  const sinZ = Math.sin(rotationZ);

  // Match the authored Y -> X -> Z rotation order without recalculating six
  // trigonometric functions for every point in the cloud.
  target.xx = (cosY * cosZ) + (sinY * sinX * sinZ);
  target.xy = -cosX * sinZ;
  target.xz = (-sinY * cosZ) + (cosY * sinX * sinZ);
  target.yx = (cosY * sinZ) - (sinY * sinX * cosZ);
  target.yy = cosX * cosZ;
  target.yz = (-sinY * sinZ) - (cosY * sinX * cosZ);
  target.zx = sinY * cosX;
  target.zy = sinX;
  target.zz = cosY * cosX;
  return target;
}

export function generateCubePoints(edgeDensity, faceGrid) {
  const density = Math.max(2, edgeDensity | 0);
  const faceSteps = Math.max(0, faceGrid | 0);
  const points = CUBE_VERTICES.map(([x, y, z]) => ({ x, y, z }));

  for (const [fromIndex, toIndex] of CUBE_EDGES) {
    const from = CUBE_VERTICES[fromIndex];
    const to = CUBE_VERTICES[toIndex];
    for (let index = 1; index < density; index += 1) {
      const amount = index / density;
      points.push({
        x: lerp(from[0], to[0], amount),
        y: lerp(from[1], to[1], amount),
        z: lerp(from[2], to[2], amount),
      });
    }
  }

  if (faceSteps === 0) return points;

  const step = 1 / (faceSteps + 1);
  const faces = [
    { axis: 'z', value: -0.5 }, { axis: 'z', value: 0.5 },
    { axis: 'x', value: -0.5 }, { axis: 'x', value: 0.5 },
    { axis: 'y', value: -0.5 }, { axis: 'y', value: 0.5 },
  ];

  for (const face of faces) {
    for (let row = 1; row <= faceSteps; row += 1) {
      for (let column = 1; column <= faceSteps; column += 1) {
        const first = -0.5 + (row * step);
        const second = -0.5 + (column * step);
        if (face.axis === 'z') points.push({ x: first, y: second, z: face.value });
        else if (face.axis === 'x') points.push({ x: face.value, y: first, z: second });
        else points.push({ x: first, y: face.value, z: second });
      }
    }
  }

  return points;
}
