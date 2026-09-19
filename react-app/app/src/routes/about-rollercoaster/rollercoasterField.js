// Blender owns surfaces. These constants own the generated circle population.
export const ROLLERCOASTER_FIELD = Object.freeze({
  spacing: 0.16263456, radiusRatio: 0.075 / 0.23, maxPoints: 600000, maxCandidates: 4000000,
});
export const ROLLERCOASTER_SURFACE_LIMITS = Object.freeze({
  objects: 256, vertices: 100000, faces: 50000, geometryBytes: 20 * 1024 * 1024, coordinate: 1000000,
});
const EPSILON = 1e-6;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const ensure = (condition, message) => { if (!condition) throw new Error(`About surfaces: ${message}`); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = vector => { const length = Math.hypot(...vector); return vector.map(value => value / length); };
const positionKey = position => position.map(value => Math.round(value / EPSILON)).join(',');
const vertexAt = (object, index) => object.positions.slice(index * 3, index * 3 + 3);
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function canonicalDirection(vector) {
  const direction = normalize(vector);
  let major = 0;
  for (let axis = 1; axis < 3; axis += 1) if (Math.abs(direction[axis]) > Math.abs(direction[major]) + 1e-10) major = axis;
  return direction[major] < 0 ? direction.map(value => -value) : direction;
}

function faceSurface(object, indices) {
  const vertices = indices.map(index => vertexAt(object, index));
  let strongest = [0, 0, 0];
  for (let index = 1; index < vertices.length - 1; index += 1) {
    const normal = cross(subtract(vertices[index], vertices[0]), subtract(vertices[index + 1], vertices[0]));
    if (dot(normal, normal) > dot(strongest, strongest)) strongest = normal;
  }
  ensure(Math.hypot(...strongest) > 1e-10, `degenerate face in ${object.id}.`);
  const normal = canonicalDirection(strongest), distance = dot(normal, vertices[0]);
  const tolerance = EPSILON * 10;
  let winding = 0;
  for (let index = 0; index < vertices.length; index += 1) {
    ensure(Math.abs(dot(normal, vertices[index]) - distance) <= tolerance, `nonplanar face in ${object.id}; triangulate it in the source.`);
    const edge = subtract(vertices[(index + 1) % vertices.length], vertices[index]);
    const nextEdge = subtract(vertices[(index + 2) % vertices.length], vertices[(index + 1) % vertices.length]);
    ensure(Math.hypot(...edge) > 1e-8, `zero-length face edge in ${object.id}.`);
    const turn = dot(cross(edge, nextEdge), normal);
    if (Math.abs(turn) > 1e-10) {
      if (!winding) winding = Math.sign(turn);
      ensure(Math.sign(turn) === winding, `concave or crossed face in ${object.id}; triangulate it in the source.`);
    }
  }
  return { vertices, normal, distance,
    planeKey: `${positionKey(normal)}:${Math.round(distance / EPSILON)}`,
    key: vertices.map(positionKey).sort().join('|') };
}

export function validateRollercoasterGeometry(geometry, meta) {
  ensure(Array.isArray(geometry?.objects) && geometry.objects.length > 0
    && geometry.objects.length <= ROLLERCOASTER_SURFACE_LIMITS.objects, 'invalid object count or surface allocation limit.');
  if (meta) ensure(geometry.objects.length === meta.geometry.objectCount, 'object count differs from metadata.');
  const ids = new Set(), names = new Set();
  let vertices = 0, faces = 0;
  // Check sizes before iterating vertices or allocating any face descriptors.
  for (const object of geometry.objects) {
    ensure(typeof object?.id === 'string' && object.id.trim() && !ids.has(object.id), 'invalid or duplicate object ID.');
    ensure(typeof object.name === 'string' && object.name.trim() && !names.has(object.name), 'invalid or duplicate object name.');
    ids.add(object.id); names.add(object.name);
    ensure(Array.isArray(object.positions) && object.positions.length >= 9 && object.positions.length % 3 === 0, `invalid positions in ${object.id}.`);
    ensure(Array.isArray(object.faces) && object.faces.length > 0, `missing faces in ${object.id}.`);
    vertices += object.positions.length / 3; faces += object.faces.length;
    ensure(vertices <= ROLLERCOASTER_SURFACE_LIMITS.vertices && faces <= ROLLERCOASTER_SURFACE_LIMITS.faces, 'surface allocation limit exceeded.');
    ensure(Number.isInteger(object.paletteRole) && object.paletteRole >= 0 && object.paletteRole <= 6, `invalid palette role in ${object.id}.`);
    ensure(Number.isInteger(object.motionGroup) && object.motionGroup >= 0
      && object.motionGroup < (meta?.motionGroups.length ?? 32), `invalid motion group in ${object.id}.`);
  }
  for (const object of geometry.objects) {
    ensure(object.positions.every(value => finite(value) && Math.abs(value) <= ROLLERCOASTER_SURFACE_LIMITS.coordinate), `non-finite or out-of-bounds positions in ${object.id}.`);
    for (const face of object.faces) {
      ensure(Array.isArray(face) && (face.length === 3 || face.length === 4)
        && face.every(index => Number.isInteger(index) && index >= 0 && index < object.positions.length / 3)
        && new Set(face).size === face.length, `invalid face indices in ${object.id}.`);
      faceSurface(object, face);
    }
  }
  if (meta?.finalGrid) {
    const wall = geometry.objects.find(object => object.id === meta.finalGrid.objectId);
    ensure(wall && wall.positions.length === 12 && wall.faces.length === 1 && wall.faces[0].length === 4,
      'the final grid must identify one complete four-corner wall.');
    ensure(wall.motionGroup === meta.finalGrid.motionGroup, 'final grid motion group differs from its wall.');
  }
  return geometry;
}

function hullOf(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const lower = [], upper = [];
  for (const point of sorted) {
    while (lower.length > 1 && turn(lower.at(-2), lower.at(-1), point) <= EPSILON) lower.pop();
    lower.push(point);
  }
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length > 1 && turn(upper.at(-2), upper.at(-1), point) <= EPSILON) upper.pop();
    upper.push(point);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function preparePlane(plane, spacing) {
  const n = plane.normal;
  let axis = 0;
  for (let index = 1; index < 3; index += 1) if (Math.abs(n[index]) < Math.abs(n[axis]) - 1e-10) axis = index;
  const basis = [0, 0, 0]; basis[axis] = 1;
  const baseU = normalize(basis.map((value, index) => value - n[index] * dot(basis, n)));
  const baseV = cross(n, baseU);
  const hull = hullOf([...plane.vertices.values()].map(point => [dot(point, baseU), dot(point, baseV)]));
  let longest = -1, chosen = baseU, chosenKey = '';
  for (let index = 0; index < hull.length; index += 1) {
    const a = hull[index], b = hull[(index + 1) % hull.length];
    const x = b[0] - a[0], y = b[1] - a[1], length = x * x + y * y;
    const direction = canonicalDirection(baseU.map((value, component) => value * x + baseV[component] * y));
    const key = positionKey(direction);
    if (length > longest + EPSILON || (Math.abs(length - longest) <= EPSILON && key < chosenKey)) {
      longest = length; chosen = direction; chosenKey = key;
    }
  }
  plane.u = chosen; plane.v = cross(n, chosen);
  plane.origin = n.map(value => value * plane.distance);
  let candidates = 0;
  for (const face of plane.faces) {
    face.projected = face.vertices.map(point => [dot(point, plane.u), dot(point, plane.v)]);
    const xs = face.projected.map(point => point[0]), ys = face.projected.map(point => point[1]);
    face.x0 = Math.ceil((Math.min(...xs) - EPSILON) / spacing);
    face.x1 = Math.floor((Math.max(...xs) + EPSILON) / spacing);
    face.y0 = Math.ceil((Math.min(...ys) - EPSILON) / spacing);
    face.y1 = Math.floor((Math.max(...ys) + EPSILON) / spacing);
    candidates += Math.max(0, face.x1 - face.x0 + 1) * Math.max(0, face.y1 - face.y0 + 1);
  }
  return candidates;
}

function containsPoint(polygon, x, y) {
  let winding = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index], b = polygon[(index + 1) % polygon.length];
    const turn = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
    if (Math.abs(turn) <= EPSILON) continue;
    if (!winding) winding = Math.sign(turn);
    if (winding !== Math.sign(turn)) return false;
  }
  return true;
}

export function resolveRollercoasterPaletteRole(role, column, row) {
  ensure(Number.isInteger(role) && role >= 0 && role <= 6, 'invalid palette role.');
  return role === 6 ? ((column + row * 2) % 6 + 6) % 6 : role;
}

function prepareRollercoasterField(geometry, settings = {}) {
  validateRollercoasterGeometry(geometry);
  const options = { ...ROLLERCOASTER_FIELD, ...settings };
  const { spacing, radiusRatio, maxPoints, maxCandidates } = options;
  ensure(finite(spacing) && spacing >= 1e-6 && finite(radiusRatio) && radiusRatio > 0 && radiusRatio <= 0.5, 'invalid code-owned spacing or radius ratio.');
  ensure(Number.isSafeInteger(maxPoints) && maxPoints > 0 && maxPoints <= ROLLERCOASTER_FIELD.maxPoints
    && Number.isSafeInteger(maxCandidates) && maxCandidates > 0 && maxCandidates <= ROLLERCOASTER_FIELD.maxCandidates,
  'sampling allocation limits must be positive and cannot exceed the code limits.');
  const radius = spacing * radiusRatio;
  const objects = [...geometry.objects].sort((a, b) => compareText(a.id, b.id));
  const prepared = [], surfaceCounts = { objects: objects.length, vertices: 0, faces: 0, uniqueFaces: 0 };
  let estimatedCandidates = 0, pointUpperBound = 0;
  for (const object of objects) {
    const planes = new Map(), seen = new Set();
    surfaceCounts.vertices += object.positions.length / 3; surfaceCounts.faces += object.faces.length;
    const faces = object.faces.map(face => faceSurface(object, face)).sort((a, b) => compareText(a.key, b.key));
    for (const face of faces) {
      if (seen.has(face.key)) continue;
      seen.add(face.key); surfaceCounts.uniqueFaces += 1;
      let plane = planes.get(face.planeKey);
      if (!plane) { plane = { ...face, faces: [], vertices: new Map() }; planes.set(face.planeKey, plane); }
      plane.faces.push(face);
      for (const point of face.vertices) plane.vertices.set(positionKey(point), point);
    }
    const ordered = [...planes.values()].sort((a, b) => compareText(a.planeKey, b.planeKey));
    let objectCandidates = 0;
    for (const plane of ordered) {
      const candidates = preparePlane(plane, spacing);
      objectCandidates += candidates; estimatedCandidates += candidates;
      ensure(Number.isSafeInteger(estimatedCandidates) && estimatedCandidates <= maxCandidates,
        'candidate allocation/complexity limit exceeded; increase code spacing or simplify surfaces.');
    }
    pointUpperBound += Math.max(1, objectCandidates);
    ensure(pointUpperBound <= maxPoints, 'generated point allocation upper bound exceeded; increase code spacing or simplify surfaces.');
    prepared.push({ object, planes: ordered });
  }
  return { prepared, options, radius, surfaceCounts, estimatedCandidates, pointUpperBound };
}

/** The publisher can reject excessive work without creating any circle buffers. */
export function preflightRollercoasterField(geometry, settings = {}) {
  const { options, radius, surfaceCounts, estimatedCandidates, pointUpperBound } = prepareRollercoasterField(geometry, settings);
  return { ...options, radius, surfaceCounts, estimatedCandidates, pointUpperBound };
}

/** Deterministic one-time surface sampling. No candidate point array is built. */
export function sampleRollercoasterField(geometry, settings = {}) {
  const { prepared, options, radius, surfaceCounts, estimatedCandidates, pointUpperBound } = prepareRollercoasterField(geometry, settings);
  const { spacing, radiusRatio, maxPoints, maxCandidates } = options;
  // All sizes are checked before allocating the packed output or spatial index.
  const capacity = pointUpperBound;
  const output = new Float32Array(capacity * 6), weldPositions = new Float64Array(capacity * 3);
  const links = new Int32Array(capacity), cells = new Map();
  const minimumDistanceSquared = (spacing * (1 - 1e-5)) ** 2;
  let count = 0, candidateCount = 0;
  const cellKey = (group, x, y, z) => `${group}:${x},${y},${z}`;
  function addPoint(x, y, z, role, group) {
    const cx = Math.floor(x / spacing), cy = Math.floor(y / spacing), cz = Math.floor(z / spacing);
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
      let point = cells.get(cellKey(group, cx + dx, cy + dy, cz + dz));
      while (point !== undefined && point !== -1) {
        const offset = point * 3;
        if ((x - weldPositions[offset]) ** 2 + (y - weldPositions[offset + 1]) ** 2 + (z - weldPositions[offset + 2]) ** 2 < minimumDistanceSquared) return false;
        point = links[point];
      }
    }
    ensure(count < maxPoints, 'generated point allocation limit exceeded; increase code spacing.');
    const offset = count * 6;
    output[offset] = x; output[offset + 1] = y; output[offset + 2] = z;
    output[offset + 3] = radius; output[offset + 4] = role; output[offset + 5] = group;
    weldPositions[count * 3] = x; weldPositions[count * 3 + 1] = y; weldPositions[count * 3 + 2] = z;
    const key = cellKey(group, cx, cy, cz);
    links[count] = cells.get(key) ?? -1; cells.set(key, count); count += 1;
    return true;
  }
  const objectRanges = [];
  for (const { object, planes } of prepared) {
    const start = count;
    let hadLatticePoint = false;
    for (const plane of planes) {
      const visited = new Set();
      for (const face of plane.faces) for (let row = face.y0; row <= face.y1; row += 1) for (let column = face.x0; column <= face.x1; column += 1) {
        candidateCount += 1;
        const x = column * spacing, y = row * spacing;
        if (!containsPoint(face.projected, x, y)) continue;
        hadLatticePoint = true;
        const key = `${column},${row}`;
        if (visited.has(key)) continue;
        visited.add(key);
        addPoint(plane.origin[0] + plane.u[0] * x + plane.v[0] * y,
          plane.origin[1] + plane.u[1] * x + plane.v[1] * y,
          plane.origin[2] + plane.u[2] * x + plane.v[2] * y,
          resolveRollercoasterPaletteRole(object.paletteRole, column, row), object.motionGroup);
      }
    }
    if (!hadLatticePoint) {
      const vertices = planes[0].faces[0].vertices;
      const center = [0, 0, 0];
      for (const vertex of vertices) for (let axis = 0; axis < 3; axis += 1) center[axis] += vertex[axis] / vertices.length;
      addPoint(...center, resolveRollercoasterPaletteRole(object.paletteRole, 0, 0), object.motionGroup);
    }
    objectRanges.push({ id: object.id, name: object.name, start, end: count, count: count - start,
      paletteRole: object.paletteRole, motionGroup: object.motionGroup,
      faceCount: object.faces.length, vertexCount: object.positions.length / 3 });
  }
  ensure(count > 0, 'surfaces did not produce a circle field.');
  return { points: output.slice(0, count * 6), field: { spacing, radiusRatio, radius, count,
    maxPoints, maxCandidates, candidateCount, estimatedCandidates, pointUpperBound, objectRanges, surfaceCounts,
    owner: 'browser-code', sampler: 'plane-grid-weld/v1' } };
}
