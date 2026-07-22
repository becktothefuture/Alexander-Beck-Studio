import {
  ABOUT_NARRATIVE_DISCIPLINE_ANCHORS,
  getAboutNarrativeShapeDefinition,
} from './aboutNarrativeDefinitions.js';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TWO_PI = Math.PI * 2;
const ORBITAL_CORE_END = 0.30;
const ORBITAL_BODY_ENDS = Object.freeze([0.50, 0.68, 0.84, 1.01]);
const ORBITAL_BODY_ORBIT_SCALES = Object.freeze([0.45, 0.68, 0.85, 1]);
const ORBITAL_BODY_RADIUS_SCALES = Object.freeze([0.98, 0.80, 0.68, 0.56]);
const ORBITAL_BODY_PHASES = Object.freeze([0.166, 3.364, 0.414, 4.849]);
const ORBITAL_BODY_INCLINATIONS = Object.freeze([0.22, -0.38, 0.52, -0.28]);

export function createAboutNarrativeSeeds(count, seed = 0x1e35a7bd) {
  let state = Number(seed) >>> 0;
  const values = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    values[index] = (state >>> 0) / 4294967296;
  }
  return values;
}

function getFieldDimensions(count) {
  const columns = Math.max(24, Math.floor(Math.sqrt(count * 1.36)));
  return { columns, rows: Math.ceil(count / columns) };
}

function createPresence(count, seeds, density = 1) {
  const presence = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    presence[index] = seeds[index] <= density ? 1 : 0;
  }
  return presence;
}

function collapseInactivePositions(positions, presence) {
  const active = [];
  for (let index = 0; index < presence.length; index += 1) {
    if (presence[index] > 0.001) active.push(index);
  }
  if (!active.length || active.length === presence.length) return positions;
  for (let index = 0; index < presence.length; index += 1) {
    if (presence[index] > 0.001) continue;
    const anchor = active[index % active.length];
    const from = anchor * 3;
    const to = index * 3;
    positions[to] = positions[from];
    positions[to + 1] = positions[from + 1];
    positions[to + 2] = positions[from + 2];
  }
  return positions;
}

function createCluster(count, seeds, parameters) {
  const positions = new Float32Array(count * 3);
  const radiusScale = Number(parameters.radius ?? 2.7);
  for (let index = 0; index < count; index += 1) {
    const seed = seeds[index];
    const radius = radiusScale * Math.cbrt((seed * 0.83 + ((index % 97) / 97)) % 1);
    const y = 1 - (2 * ((index + 0.5) / count));
    const ringRadius = Math.sqrt(Math.max(0, 1 - (y * y)));
    const angle = index * GOLDEN_ANGLE;
    const offset = index * 3;
    positions[offset] = Math.cos(angle) * ringRadius * radius;
    positions[offset + 1] = y * radius;
    positions[offset + 2] = Math.sin(angle) * ringRadius * radius;
  }
  return { positions };
}

function hash01(value) {
  const hashed = Math.sin((value * 12.9898) + 78.233) * 43758.5453123;
  return hashed - Math.floor(hashed);
}

function writeSpherePoint(positions, offset, index, radius, centerX = 0, centerY = 0, centerZ = 0) {
  const vertical = (hash01((index + 1) * 11.71) * 2) - 1;
  const ring = Math.sqrt(Math.max(0, 1 - (vertical * vertical)));
  const angle = hash01((index + 1) * 5.93) * TWO_PI;
  const distance = radius * Math.cbrt(hash01((index + 1) * 23.47));
  positions[offset] = centerX + (Math.cos(angle) * ring * distance);
  positions[offset + 1] = centerY + (vertical * distance);
  positions[offset + 2] = centerZ + (Math.sin(angle) * ring * distance);
}

function writeOrbitalPlanePoint(target, radius, angle, inclination) {
  const x = Math.cos(angle) * radius;
  const y = 0;
  const z = Math.sin(angle) * radius;
  const sine = Math.sin(inclination);
  const cosine = Math.cos(inclination);
  target.x = x;
  target.y = (cosine * y) - (sine * z);
  target.z = (sine * y) + (cosine * z);
  return target;
}

function getOrbitalGroupingSeed(seed) {
  const value = (Number(seed) * 7.31) + 0.17;
  return value - Math.floor(value);
}

function getOrbitalBodyIndex(seed) {
  for (let index = 0; index < ORBITAL_BODY_ENDS.length; index += 1) {
    if (seed < ORBITAL_BODY_ENDS[index]) return index;
  }
  return -1;
}

function createTurbulentField(count, seeds, parameters) {
  const positions = new Float32Array(count * 3);
  const width = Number(parameters.width ?? 10);
  const height = Number(parameters.height ?? 7);
  const depth = Number(parameters.depth ?? 9);
  const chunkCount = Math.max(3, Math.round(Number(parameters.chunkCount ?? 7)));
  const chunkSize = Number(parameters.chunkSize ?? 1.55);
  const scatter = Number(parameters.scatter ?? 0.14);
  const turbulence = Number(parameters.turbulence ?? 0.52);
  const chunks = Array.from({ length: chunkCount }, (_, chunkIndex) => ({
    x: (hash01((chunkIndex + 1) * 17.13) - 0.5) * width * 0.76,
    y: (hash01((chunkIndex + 1) * 31.71) - 0.5) * height * 0.72,
    z: (hash01((chunkIndex + 1) * 47.37) - 0.5) * depth * 0.82,
    radius: chunkSize * (0.62 + (hash01((chunkIndex + 1) * 61.19) * 0.72)),
    weight: 0.34 + (hash01((chunkIndex + 1) * 79.43) * 1.66),
  }));
  const totalWeight = chunks.reduce((sum, chunk) => sum + chunk.weight, 0);
  const centroid = chunks.reduce((center, chunk) => ({
    x: center.x + (chunk.x * chunk.weight),
    y: center.y + (chunk.y * chunk.weight),
    z: center.z + (chunk.z * chunk.weight),
  }), { x: 0, y: 0, z: 0 });
  chunks.forEach((chunk) => {
    chunk.x -= centroid.x / totalWeight;
    chunk.y -= centroid.y / totalWeight;
    chunk.z -= centroid.z / totalWeight;
  });

  for (let index = 0; index < count; index += 1) {
    const selector = hash01((index + 1) * 3.17) * totalWeight;
    let accumulated = 0;
    let chunk = chunks[0];
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
      accumulated += chunks[chunkIndex].weight;
      if (selector <= accumulated) {
        chunk = chunks[chunkIndex];
        break;
      }
    }

    const theta = hash01((index + 1) * 5.93) * Math.PI * 2;
    const vertical = (hash01((index + 1) * 11.71) * 2) - 1;
    const ring = Math.sqrt(Math.max(0, 1 - (vertical * vertical)));
    const radius = chunk.radius * Math.pow(hash01((index + 1) * 23.47), 1.42);
    let x = chunk.x + (Math.cos(theta) * ring * radius);
    let y = chunk.y + (vertical * radius * 0.82);
    let z = chunk.z + (Math.sin(theta) * ring * radius);

    if (hash01((index + 1) * 97.17) < scatter) {
      x = (hash01((index + 1) * 37.11) - 0.5) * width;
      y = (hash01((index + 1) * 41.73) - 0.5) * height;
      z = (hash01((index + 1) * 53.29) - 0.5) * depth;
    }

    const warpSeed = hash01((index + 1) * 67.91) * Math.PI * 2;
    x += Math.sin((z * 0.73) + (y * 0.41) + warpSeed) * turbulence;
    y += Math.sin((x * 0.54) - (z * 0.37) + (warpSeed * 1.31)) * turbulence * 0.58;
    z += Math.cos((x * 0.62) + (y * 0.47) - (warpSeed * 0.73)) * turbulence;

    const offset = index * 3;
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
  }
  return { positions };
}

function createCalmField(count, seeds, parameters) {
  const positions = new Float32Array(count * 3);
  const { columns, rows } = getFieldDimensions(count);
  const width = Number(parameters.width ?? 13);
  const depth = Number(parameters.depth ?? 17);
  const height = Number(parameters.height ?? -1.72);
  const jitter = Number(parameters.jitter ?? 0.035);
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = ((column / Math.max(1, columns - 1)) - 0.5) * width;
    const z = ((row / Math.max(1, rows - 1)) - 0.5) * depth;
    const offset = index * 3;
    // This is the authored floor grid. With zero jitter its intersections stay
    // exact; shader drift supplies the quiet, individual movement.
    positions[offset] = x + ((seeds[index] - 0.5) * jitter);
    positions[offset + 1] = height;
    positions[offset + 2] = z + ((((seeds[index] * 13) % 1) - 0.5) * jitter);
  }
  return { positions, attributes: { disciplineGroup: createDisciplineGroups(count) } };
}

function createDisciplineGroups(count) {
  const groups = new Float32Array(count);
  const { columns, rows } = getFieldDimensions(count);
  ABOUT_NARRATIVE_DISCIPLINE_ANCHORS.forEach(({ group, x, y }) => {
    const column = Math.round(x * (columns - 1));
    const row = Math.round(y * (rows - 1));
    groups[Math.min(count - 1, (row * columns) + column)] = group;
  });
  return groups;
}

function getMaterialSlot(seed, thresholds) {
  const materialSeed = ((seed * 43.713) + 0.271) % 1;
  for (let index = 0; index < thresholds.length; index += 1) {
    if (materialSeed < thresholds[index]) return index;
  }
  return thresholds.length;
}

export function createAboutNarrativeColourMatchedDisciplineGroups({
  output,
  pointSeeds,
  materialThresholds,
  anchors = null,
}) {
  const sourceGroups = output?.attributes?.disciplineGroup;
  const pointCount = output?.presence?.length || 0;
  if (!sourceGroups && !Array.isArray(anchors)) return null;
  if (!(pointSeeds instanceof Float32Array) || pointSeeds.length !== pointCount) {
    throw new Error('Discipline colour matching needs one point seed per rendered point.');
  }
  if (!Array.isArray(materialThresholds) || materialThresholds.length !== 5) {
    throw new Error('Discipline colour matching needs the five material thresholds.');
  }

  const groups = new Float32Array(pointCount);
  const used = new Uint8Array(pointCount);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  if (Array.isArray(anchors)) {
    for (let index = 0; index < pointCount; index += 1) {
      if (output.presence[index] <= 0.001) continue;
      const offset = index * 3;
      minX = Math.min(minX, output.positions[offset]);
      maxX = Math.max(maxX, output.positions[offset]);
      minZ = Math.min(minZ, output.positions[offset + 2]);
      maxZ = Math.max(maxZ, output.positions[offset + 2]);
    }
  }
  for (let group = 1; group <= 6; group += 1) {
    let anchorIndex = -1;
    const authoredAnchor = anchors?.find((item) => Number(item?.group) === group);
    let targetX = Number.NaN;
    let targetZ = Number.NaN;
    if (authoredAnchor && Number.isFinite(minX) && Number.isFinite(minZ)) {
      targetX = minX + ((maxX - minX) * Number(authoredAnchor.x));
      targetZ = minZ + ((maxZ - minZ) * Number(authoredAnchor.y));
    } else if (sourceGroups) {
      for (let index = 0; index < pointCount; index += 1) {
        if (Math.round(sourceGroups[index]) === group) {
          anchorIndex = index;
          break;
        }
      }
    }
    if (anchorIndex < 0 && !Number.isFinite(targetX)) continue;

    const anchorOffset = Math.max(0, anchorIndex) * 3;
    let bestIndex = -1;
    let bestDistance = Infinity;
    for (let index = 0; index < pointCount; index += 1) {
      if (used[index] || output.presence[index] <= 0.001) continue;
      if (getMaterialSlot(pointSeeds[index], materialThresholds) !== group - 1) continue;
      const offset = index * 3;
      const dx = output.positions[offset] - (Number.isFinite(targetX) ? targetX : output.positions[anchorOffset]);
      const dy = Number.isFinite(targetX) ? 0 : output.positions[offset + 1] - output.positions[anchorOffset + 1];
      const dz = output.positions[offset + 2] - (Number.isFinite(targetZ) ? targetZ : output.positions[anchorOffset + 2]);
      const distance = (dx * dx) + (dy * dy) + (dz * dz);
      if (distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    }

    if (bestIndex < 0) bestIndex = anchorIndex;
    if (bestIndex < 0) continue;
    groups[bestIndex] = group;
    used[bestIndex] = 1;
  }
  return groups;
}

function createDisciplineGrid(count, seeds, parameters) {
  const positions = new Float32Array(count * 3);
  const { columns, rows } = getFieldDimensions(count);
  const width = Number(parameters.width ?? 12.5);
  const height = Number(parameters.height ?? 7.5);
  const depthJitter = Number(parameters.depthJitter ?? 0.04);
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const offset = index * 3;
    positions[offset] = ((column / Math.max(1, columns - 1)) - 0.5) * width;
    positions[offset + 1] = (0.5 - (row / Math.max(1, rows - 1))) * height;
    positions[offset + 2] = (seeds[index] - 0.5) * depthJitter;
  }
  return { positions, attributes: { disciplineGroup: createDisciplineGroups(count) } };
}

function createLivingField(count, seeds, parameters) {
  const positions = new Float32Array(count * 3);
  const { columns, rows } = getFieldDimensions(count);
  const width = Number(parameters.width ?? 13.5);
  const depth = Number(parameters.depth ?? 18);
  const baseY = Number(parameters.baseY ?? -1.58);
  const terrainX = Number(parameters.terrainX ?? 0.14);
  const terrainZ = Number(parameters.terrainZ ?? 0.12);
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = ((column / Math.max(1, columns - 1)) - 0.5) * width;
    const z = ((row / Math.max(1, rows - 1)) - 0.5) * depth;
    const offset = index * 3;
    positions[offset] = x + ((seeds[index] - 0.5) * 0.055);
    positions[offset + 1] = baseY + (Math.sin(x * 0.54) * terrainX) + (Math.cos(z * 0.36) * terrainZ);
    positions[offset + 2] = z;
  }
  return { positions };
}

export function createAboutNarrativeEmergentFormShape(count, seeds, parameters = {}) {
  const positions = new Float32Array(count * 3);
  const strandCount = Math.min(6, Math.max(1, count));
  const radius = Number(parameters.radius ?? 2.7);
  const coreRadius = Number(parameters.coreRadius ?? 0.38);
  const height = Number(parameters.height ?? 5.4);
  const twist = Number(parameters.twist ?? 1.35);
  const thickness = Number(parameters.thickness ?? 0.3);

  for (let index = 0; index < count; index += 1) {
    const strand = index % strandCount;
    const strandIndex = Math.floor(index / strandCount);
    const pointsInStrand = Math.ceil((count - strand) / strandCount);
    const progress = strandIndex / Math.max(1, pointsInStrand - 1);
    const phase = (strand / strandCount) * TWO_PI;
    const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * progress)), 0.68);
    const weaveAngle = phase
      + (progress * TWO_PI * twist)
      + (Math.sin((progress * TWO_PI * 2) + phase) * 0.09);
    const formRadius = coreRadius + ((radius - coreRadius) * envelope);
    const pointSeed = Number(seeds[index] ?? 0.5);
    const tubeAngle = (((pointSeed * 31.713) + (strand * 0.173)) % 1) * TWO_PI;
    const tubeRadius = thickness * Math.sqrt(((pointSeed * 17.371) + 0.219) % 1);
    const radialOffset = Math.cos(tubeAngle) * tubeRadius;
    const verticalOffset = Math.sin(tubeAngle) * tubeRadius;
    const offset = index * 3;

    positions[offset] = (formRadius + radialOffset) * Math.cos(weaveAngle)
      + (Math.sin((progress * TWO_PI * 3) - phase) * radius * 0.045);
    positions[offset + 1] = ((progress - 0.5) * height)
      + (Math.sin((progress * TWO_PI) + (phase * 0.5)) * height * 0.045)
      + verticalOffset;
    positions[offset + 2] = (formRadius + radialOffset) * Math.sin(weaveAngle)
      + (Math.cos((progress * TWO_PI * 2) + phase) * radius * 0.055);
  }

  return { positions };
}

export function createAboutNarrativeOrbitalSystemShape(count, seeds, parameters = {}) {
  const positions = new Float32Array(count * 3);
  const orbitRadius = Number(parameters.orbitRadius ?? 5.8);
  const coreRadius = Number(parameters.coreRadius ?? 1.05);
  const bodyRadius = Number(parameters.bodyRadius ?? 0.72);
  const center = { x: 0, y: 0, z: 0 };

  for (let index = 0; index < count; index += 1) {
    // Shape membership is decorrelated from the raw seed because the raw seed
    // also controls density. Every density level must retain the core and all
    // four bodies instead of progressively deleting the outer system.
    const seed = getOrbitalGroupingSeed(seeds[index]);
    const offset = index * 3;
    if (seed < ORBITAL_CORE_END) {
      writeSpherePoint(positions, offset, index, coreRadius);
      continue;
    }

    const bodyIndex = getOrbitalBodyIndex(seed);
    writeOrbitalPlanePoint(
      center,
      orbitRadius * ORBITAL_BODY_ORBIT_SCALES[bodyIndex],
      ORBITAL_BODY_PHASES[bodyIndex],
      ORBITAL_BODY_INCLINATIONS[bodyIndex],
    );
    writeSpherePoint(
      positions,
      offset,
      index,
      bodyRadius * ORBITAL_BODY_RADIUS_SCALES[bodyIndex],
      center.x,
      center.y,
      center.z,
    );
  }
  return { positions };
}

function createBustFallback(count, seeds) {
  const output = createCluster(count, seeds, { radius: 2.7 });
  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    output.positions[offset] *= 0.72;
    output.positions[offset + 1] = (output.positions[offset + 1] * 1.1) - 0.2;
    output.positions[offset + 2] *= 0.64;
  }
  return output;
}

function normalizeBust(source, count) {
  const sourceCount = source.length / 8;
  if (!Number.isInteger(sourceCount) || sourceCount <= 0) throw new Error('Bust point data has an invalid stride.');
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const sourceIndex = (index % sourceCount) * 8;
    const targetIndex = index * 3;
    positions[targetIndex] = source[sourceIndex];
    positions[targetIndex + 1] = source[sourceIndex + 1];
    positions[targetIndex + 2] = source[sourceIndex + 2];
  }
  return { positions };
}

async function loadBust(count, quality, signal) {
  const qualityId = quality === 'mobile' ? 'low' : 'medium';
  const metaResponse = await fetch('/models/napoleon-bust/meta.json', { signal });
  if (!metaResponse.ok) throw new Error(`Bust metadata failed: ${metaResponse.status}`);
  const metadata = await metaResponse.json();
  const lod = metadata?.lods?.[qualityId];
  if (!lod?.file) throw new Error(`Bust metadata has no ${qualityId} LOD.`);
  const response = await fetch(`/models/napoleon-bust/${lod.file}`, { signal });
  if (!response.ok) throw new Error(`Bust points failed: ${response.status}`);
  return normalizeBust(new Float32Array(await response.arrayBuffer()), count);
}

function calculateBounds(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < positions.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[index + axis];
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }
  return { min, max };
}

export function validateAboutNarrativeShapeOutput(output, pointCount) {
  if (!(output?.positions instanceof Float32Array) || output.positions.length !== pointCount * 3) {
    throw new Error('Shape positions must match the canonical point count.');
  }
  if (!(output.presence instanceof Float32Array) || output.presence.length !== pointCount) {
    throw new Error('Shape presence must match the canonical point count.');
  }
  if (!(output.size instanceof Float32Array) || output.size.length !== pointCount) {
    throw new Error('Shape size must match the canonical point count.');
  }
  for (let index = 0; index < output.positions.length; index += 1) {
    if (!Number.isFinite(output.positions[index])) throw new Error('Shape positions contain a non-finite coordinate.');
  }
  for (let index = 0; index < output.presence.length; index += 1) {
    if (!Number.isFinite(output.presence[index]) || output.presence[index] < 0 || output.presence[index] > 1) {
      throw new Error('Shape presence values must stay between 0 and 1.');
    }
  }
  for (let index = 0; index < output.size.length; index += 1) {
    if (!Number.isFinite(output.size[index]) || output.size[index] < 0) {
      throw new Error('Shape size values must be finite and non-negative.');
    }
  }
  Object.entries(output.attributes || {}).forEach(([name, attribute]) => {
    if (!(attribute instanceof Float32Array) || attribute.length !== pointCount) {
      throw new Error(`Shape attribute ${name} does not match the point count.`);
    }
  });
  return output;
}

const GENERATORS = Object.freeze({
  'cluster-v1': createCluster,
  'turbulent-field-v1': createTurbulentField,
  'calm-field-v1': createCalmField,
  'discipline-grid-v1': createDisciplineGrid,
  'living-field-v1': createLivingField,
  'emergent-form-v1': createAboutNarrativeEmergentFormShape,
  'orbital-system-v1': createAboutNarrativeOrbitalSystemShape,
});

export async function generateAboutNarrativeShape({
  shapeId,
  pointCount,
  seeds,
  quality,
  parameters,
  signal,
}) {
  const definition = getAboutNarrativeShapeDefinition(shapeId);
  if (!definition) throw new Error(`Unknown About narrative Shape: ${shapeId}`);
  let output;
  if (shapeId === 'bust-v1') {
    try {
      output = await loadBust(pointCount, quality, signal);
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      output = createBustFallback(pointCount, seeds);
      output.fallbackReason = error?.message || 'Bust asset unavailable.';
    }
  } else {
    output = GENERATORS[shapeId](pointCount, seeds, parameters || {});
  }
  output.presence = createPresence(pointCount, seeds, Number(parameters?.density ?? 1));
  if (output.attributes?.disciplineGroup) {
    for (let index = 0; index < output.attributes.disciplineGroup.length; index += 1) {
      if (output.attributes.disciplineGroup[index] > 0) output.presence[index] = 1;
    }
  }
  collapseInactivePositions(output.positions, output.presence);
  output.size = output.size || new Float32Array(pointCount).fill(1);
  output.attributes = output.attributes || {};
  output.bounds = calculateBounds(output.positions);
  return validateAboutNarrativeShapeOutput(output, pointCount);
}
