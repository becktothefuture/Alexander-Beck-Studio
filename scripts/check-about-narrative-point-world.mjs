import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createAboutNarrativeOrbitalSystemShape,
  createAboutNarrativeSeeds,
  generateAboutNarrativeShape,
  validateAboutNarrativeShapeOutput,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointShapes.js';

const CANONICAL_POINT_SEED = 506832829;
const ORBITAL_PARAMETERS = Object.freeze({
  orbitRadius: 5.8,
  coreRadius: 1.05,
  bodyRadius: 0.72,
});

const createOrbitalGroupingSeeds = (seeds) => Float32Array.from(seeds, (seed) => {
  const value = (Number(seed) * 7.31) + 0.17;
  return value - Math.floor(value);
});

function centroidForSeedRange(positions, seeds, minimum, maximum) {
  const centroid = [0, 0, 0];
  let count = 0;
  for (let index = 0; index < seeds.length; index += 1) {
    if (seeds[index] < minimum || seeds[index] >= maximum) continue;
    const offset = index * 3;
    centroid[0] += positions[offset];
    centroid[1] += positions[offset + 1];
    centroid[2] += positions[offset + 2];
    count += 1;
  }
  assert.ok(count > 0);
  centroid[0] /= count;
  centroid[1] /= count;
  centroid[2] /= count;
  return centroid;
}

function distanceFromOrigin(point) {
  return Math.hypot(point[0], point[1], point[2]);
}

test('orbital-system-v1 is deterministic and resolves into distinct 3D bodies', () => {
  const pointCount = 5000;
  const seeds = createAboutNarrativeSeeds(pointCount, CANONICAL_POINT_SEED);
  const groupingSeeds = createOrbitalGroupingSeeds(seeds);
  const first = createAboutNarrativeOrbitalSystemShape(pointCount, seeds, ORBITAL_PARAMETERS);
  const second = createAboutNarrativeOrbitalSystemShape(pointCount, seeds, ORBITAL_PARAMETERS);
  assert.ok(first.positions instanceof Float32Array);
  assert.equal(first.positions.length, pointCount * 3);
  assert.deepEqual(first.positions, second.positions);
  first.positions.forEach((value) => assert.ok(Number.isFinite(value)));

  const core = centroidForSeedRange(first.positions, groupingSeeds, 0, 0.30);
  const bodies = [
    centroidForSeedRange(first.positions, groupingSeeds, 0.30, 0.50),
    centroidForSeedRange(first.positions, groupingSeeds, 0.50, 0.68),
    centroidForSeedRange(first.positions, groupingSeeds, 0.68, 0.84),
    centroidForSeedRange(first.positions, groupingSeeds, 0.84, 1.01),
  ];
  assert.ok(distanceFromOrigin(core) < 0.08, 'The dense core should remain centered.');
  const bodyDistances = bodies.map(distanceFromOrigin);
  assert.ok(bodyDistances[0] > 2.45 && bodyDistances[0] < 2.8);
  assert.ok(bodyDistances[1] > 3.75 && bodyDistances[1] < 4.15);
  assert.ok(bodyDistances[2] > 4.75 && bodyDistances[2] < 5.1);
  assert.ok(bodyDistances[3] > 5.6 && bodyDistances[3] < 6);
  assert.ok(Math.max(...bodies.map((body) => Math.abs(body[1]))) > 1.25);
});

test('orbital-system-v1 participates in the fixed point-pool Shape registry', async () => {
  const pointCount = 192;
  const output = await generateAboutNarrativeShape({
    shapeId: 'orbital-system-v1',
    pointCount,
    seeds: createAboutNarrativeSeeds(pointCount, CANONICAL_POINT_SEED),
    quality: 'desktop',
    parameters: { ...ORBITAL_PARAMETERS, density: 0.8 },
  });
  assert.equal(validateAboutNarrativeShapeOutput(output, pointCount), output);
  assert.equal(output.positions.length, pointCount * 3);
  assert.equal(output.presence.length, pointCount);
  assert.equal(output.size.length, pointCount);
  assert.ok(output.presence.some((value) => value === 0));
  const groupingSeeds = createOrbitalGroupingSeeds(createAboutNarrativeSeeds(
    pointCount,
    CANONICAL_POINT_SEED,
  ));
  const populatedGroups = new Set();
  output.presence.forEach((presence, index) => {
    if (presence <= 0) return;
    const seed = groupingSeeds[index];
    populatedGroups.add(seed < 0.30 ? 0 : seed < 0.50 ? 1 : seed < 0.68 ? 2 : seed < 0.84 ? 3 : 4);
  });
  assert.equal(populatedGroups.size, 5, 'Sparse density must preserve the core and all four bodies.');
});

test('point renderer keeps visibility, fog, sizing, ripple, and orbital motion on one contract', () => {
  const source = readFileSync(new URL(
    '../react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
    import.meta.url,
  ), 'utf8');
  assert.match(source, /presence \*= clamp\(simulationVisibility, 0\.0, 1\.0\)/);
  assert.match(source, /points\.visible = simulationVisibility > 0\.001/);
  assert.match(source, /uniform float sceneEntranceScale/);
  assert.match(source, /pointAlpha = presence \* entranceScale/);
  assert.match(source, /ROUTE_ENTRANCE_START_EVENT/);
  assert.match(source, /aboutSceneReady = 'true'/);
  assert.match(source, /easeSimulationVisualProgress\([\s\S]*cubic-bezier\(0\.22, 0, 0\.16, 1\)/);
  assert.match(source, /pointAlpha <= 0\.001 \|\| fieldOpacity <= 0\.001/);
  assert.match(source, /globalCamera\?\.distanceFogStartWU \?\? 8/);
  assert.match(source, /globalCamera\?\.distanceFogEndWU \?\? 18/);
  assert.doesNotMatch(source, /frame\.camera\.distanceFog/);
  assert.doesNotMatch(source, /disciplineFieldFog|DisciplineBackgroundScale/);
  assert.match(source, /gl_PointSize = max\(0\.01, clamp\(cssPointSize, 3\.0, 10\.0\) \* entranceScale\) \* pixelRatio/);
  assert.match(source, /vec3 fromPoint = applyOrbitalLife[\s\S]*vec3 fromWorld = \(fromTransform/);
  assert.match(source, /float orbitalSeed = fract\(\(seed \* 7\.31\) \+ 0\.17\)/);
  assert.doesNotMatch(source, /ringBand|ringThickness|debris ring/i);
  assert.match(source, /uniforms\.fromOrbitalWeight\.value = 0[\s\S]*uniforms\.toOrbitalWeight\.value = 0/);
  assert.match(source, /const targetTransformElements = uniforms\.toTransform\.value\.elements/);
  assert.match(source, /targetTransformElements\[12\],[\s\S]*targetTransformElements\[14\]/);
  assert.doesNotMatch(source, /rippleParameters\?\.center[XYZ]/);
  assert.match(source, /attributeFilter: \['class', 'data-theme'\]/);
});
