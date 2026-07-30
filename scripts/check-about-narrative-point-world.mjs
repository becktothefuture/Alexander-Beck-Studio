import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createAboutNarrativeEmergentFormShape,
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

test('emergent-form-v1 is deterministic, centered, and uses the fixed point pool', async () => {
  const pointCount = 1200;
  const seeds = createAboutNarrativeSeeds(pointCount, CANONICAL_POINT_SEED);
  const parameters = {
    radius: 2.6,
    coreRadius: 0.38,
    height: 5.3,
    twist: 1.4,
    thickness: 0.28,
    density: 0.58,
  };
  const first = createAboutNarrativeEmergentFormShape(pointCount, seeds, parameters);
  const second = createAboutNarrativeEmergentFormShape(pointCount, seeds, parameters);
  assert.deepEqual(first.positions, second.positions);
  assert.equal(first.positions.length, pointCount * 3);
  first.positions.forEach((value) => assert.ok(Number.isFinite(value)));

  const output = await generateAboutNarrativeShape({
    shapeId: 'emergent-form-v1',
    pointCount,
    seeds,
    quality: 'desktop',
    parameters,
  });
  assert.equal(validateAboutNarrativeShapeOutput(output, pointCount), output);
  assert.equal(output.presence.length, pointCount);
  assert.ok(output.presence.some((value) => value === 0));
  assert.ok(output.bounds.max[1] - output.bounds.min[1] > 4.5);
  assert.ok(output.bounds.max[0] > 1.8 && output.bounds.min[0] < -1.8);
  assert.ok(output.bounds.max[2] > 1.8 && output.bounds.min[2] < -1.8);
});

test('point renderer keeps visibility, fog, sizing, perpetual ripples, progressive bust formation, and orbital motion on one contract', () => {
  const source = readFileSync(new URL(
    '../react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
    import.meta.url,
  ), 'utf8');
  const styles = readFileSync(new URL(
    '../react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css',
    import.meta.url,
  ), 'utf8');
  const modifierSampling = readFileSync(new URL(
    '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeModifierSampling.js',
    import.meta.url,
  ), 'utf8');
  assert.match(source, /presence \*= clamp\(simulationVisibility, 0\.0, 1\.0\)/);
  assert.match(source, /points\.visible = simulationVisibility > 0\.001/);
  assert.match(source, /uniform float sceneEntranceScale/);
  assert.match(source, /pointAlpha = presence \* entranceScale/);
  assert.match(source, /float enteringPoint = \(1\.0 - step\(0\.5, fromPresence\)\) \* step\(0\.5, toPresence\)/);
  assert.match(source, /gl_Position\.z \+= enteringPoint/);
  assert.match(source, /gl_PointSize \*= mix\(1\.0, max\(0\.01, entryProgress\), enteringPoint\)/);
  assert.match(source, /ROUTE_ENTRANCE_START_EVENT/);
  assert.match(source, /entranceAlreadyComplete = root\.dataset\.aboutEntranceState === 'complete'/);
  assert.match(source, /root\.dataset\.aboutEntranceRequested === 'true'/);
  assert.match(source, /root\.dataset\.aboutEntranceRequested = 'true'/);
  assert.match(source, /aboutSceneReady = 'true'/);
  assert.match(source, /easeSimulationVisualProgress\([\s\S]*cubic-bezier\(0\.22, 0, 0\.16, 1\)/);
  assert.match(source, /pointAlpha <= 0\.001 \|\| fieldOpacity <= 0\.001/);
  assert.match(source, /globalCamera\?\.distanceFogStartWU \?\? 8/);
  assert.match(source, /globalCamera\?\.distanceFogEndWU \?\? 18/);
  assert.doesNotMatch(source, /frame\.camera\.distanceFog/);
  assert.doesNotMatch(source, /disciplineFieldFog|DisciplineBackgroundScale/);
  assert.match(source, /gl_PointSize = max\(0\.01, clamp\(cssPointSize, 5\.25, 18\.0\) \* entranceScale\) \* pixelRatio/);
  assert.match(source, /worldPointSizeScale = mix\(fromPointSizeScale, toPointSizeScale, morph\)/);
  assert.match(
    source,
    /float authoritativeMorph = clamp\(morphProgress, 0\.0, 1\.0\);\s+float globalMorph = resolveParametricProgress\(authoritativeMorph\)/,
  );
  assert.doesNotMatch(source, /globalMorph = smoothstep\([^\n]*morphProgress/);
  assert.match(source, /float waveClock = mix\(ambientTime, storyTime/);
  assert.match(source, /target\.waveStoryMix\.value = resolveAboutNarrativeMotionTimeMix\(wave\?\.timeMode\)/);
  assert.match(source, /let shortLandscape = isAboutNarrativeShortLandscape/);
  assert.match(source, /const responsiveLayoutProfile = compact \? 'mobile' : layoutProfile/);
  assert.match(source, /layoutProfile: responsiveLayoutProfile/);
  assert.match(source, /mobile-short-landscape/);
  assert.match(source, /const responsiveSequenceKey = getResponsiveSequenceKey\(sequenceKey\)/);
  assert.match(source, /const requestedSequenceKey = getResponsiveSequenceKey\(frame\.world\.sequenceKey\)/);
  assert.match(source, /wasShortLandscape !== shortLandscape && lastPreparationRequest/);
  assert.match(source, /inputFingerprint: pairDescriptor\.inputFingerprint/);
  assert.match(source, /inputFingerprint: pair\.inputFingerprint/);
  assert.match(source, /frame\.storyWU >= reveal\.effectStartWU/);
  assert.match(source, /const revealAvailable = effectAvailable[\s\S]*frame\.storyWU >= revealState\.startWU/);
  assert.match(source, /frame\.storyWU < revealState\.endWU/);
  assert.match(source, /attributeFilter: \['data-editor-preview-layout', 'data-editor-preview-orientation'\]/);
  assert.match(source, /window\.addEventListener\('resize', resize, \{ passive: true \}\)/);
  assert.match(source, /window\.removeEventListener\('resize', resize\)/);
  assert.doesNotMatch(source, /targetHasAmbientPositionMotion/);
  assert.match(source, /vec3 fromPoint = applyOrbitalLife[\s\S]*vec3 fromWorld = \(fromTransform/);
  assert.match(source, /float orbitalSeed = fract\(\(seed \* 7\.31\) \+ 0\.17\)/);
  assert.doesNotMatch(source, /ringBand|ringThickness|debris ring/i);
  assert.match(source, /uniforms\.fromOrbitalWeight\.value = 0[\s\S]*uniforms\.toOrbitalWeight\.value = 0/);
  assert.match(source, /const targetTransformElements = uniforms\.toTransform\.value\.elements/);
  assert.match(source, /targetTransformElements\[12\],[\s\S]*targetTransformElements\[14\]/);
  assert.doesNotMatch(source, /rippleParameters\?\.center[XYZ]/);
  assert.match(source, /float bustHeight = clamp\(\(targetPosition\.y \+ 0\.86\) \/ 1\.72/);
  assert.match(source, /float bustBuildProgress = smoothstep\(/);
  assert.match(source, /uniform float bustAssemblyWeight/);
  assert.match(source, /uniform float bustSurfaceRiseWeight/);
  assert.match(source, /uniform float bustBuildBaseStart/);
  assert.match(source, /uniform float bustBuildHeadStart/);
  assert.match(source, /uniform float bustPlatformScale/);
  assert.match(source, /uniform float bustPlatformSettle/);
  assert.match(source, /bustSampleInput\.speed = Math\.max\(0, Number\(bust\?\.speed \|\| 0\)\)/);
  assert.match(source, /fromPoint = mix\(fromPoint, rotateY\(fromPoint, bustYaw\), fromBust\)/);
  assert.match(source, /toPoint = mix\(toPoint, rotateY\(toPoint, bustYaw\), toBust\)/);
  assert.doesNotMatch(source, /cameraOrbitAngle|writeAboutNarrativeCameraOrbitPosition/);
  const tintStart = source.indexOf('float materialSeed =');
  const tintEnd = source.indexOf('vec4 viewPoint =', tintStart);
  assert.ok(tintStart >= 0 && tintEnd > tintStart);
  assert.doesNotMatch(source.slice(tintStart, tintEnd), /\b(?:fromBust|toBust)\b/);
  assert.match(source, /vec2 gatheredPlatform = gridRippleCenter[\s\S]*?toWorld\.xz/);
  assert.match(source, /vec3 submergedBust = toWorld/);
  assert.match(source, /float surfaceTransit = max\(0\.0, surfaceDeparture - surfaceArrival\)/);
  assert.match(source, /presence \*= mix\(1\.0, clamp\(bustSurfaceCarry/);
  assert.match(
    source,
    /else \{[\s\S]*uniforms\.fromDisciplineIsolation\.value = 0;[\s\S]*uniforms\.toDisciplineIsolation\.value = 0;/,
  );
  assert.match(source, /uniform float bustFragmentSpread/);
  assert.match(source, /bustFragmentProgress[\s\S]*bustAssemblyWeight/);
  assert.match(source, /float rippleClock = mix\([\s\S]*?ambientTime/);
  assert.match(source, /float radialRipple = sin\(/);
  assert.match(source, /float harmonicRipple = sin\(/);
  assert.match(source, /float undertowRipple = cos\(/);
  assert.match(source, /float centerPulse = cos\(/);
  assert.match(source, /float surfaceRippleMix = 1\.0 - \(/);
  assert.match(source, /toBust \* smoothstep\(0\.08, 0\.92, globalMorph\)/);
  assert.match(
    modifierSampling,
    /toBust \* smoothstep01\(\(globalMorph - 0\.08\) \/ 0\.84\)/,
  );
  assert.match(source, /worldPoint\.y \+= gatheringWeight \* perpetualRipple/);
  assert.match(source, /worldPoint\.xz \+= rippleDirection[\s\S]*?radialRipple/);
  assert.match(source, /gridRippleEmphasis/);
  assert.match(source, /attributeFilter: \['class', 'data-theme'\]/);
  assert.doesNotMatch(source, /--narrative-camera-fov/);
  assert.match(
    styles,
    /data-about-motion-profile='reduced'[\s\S]*discipline-reveal li[\s\S]*opacity: var\(--discipline-reveal\)/,
  );
});

test('PointWorld recomputes responsive preparation identity across orientation changes in one live adapter', () => {
  const source = readFileSync(new URL(
    '../react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
    import.meta.url,
  ), 'utf8');
  assert.match(source, /let shortLandscape = isAboutNarrativeShortLandscape/);
  assert.match(source, /const getResponsiveSequenceKey = \(sequenceKey\) => \{[\s\S]*shortLandscape \? 'mobile-short-landscape' : 'mobile-default'/);
  assert.match(source, /const wasShortLandscape = shortLandscape;[\s\S]*shortLandscape = isAboutNarrativeShortLandscape[\s\S]*wasShortLandscape !== shortLandscape[\s\S]*preparePlan\(lastPreparationRequest\)/);
  assert.match(source, /const responsiveSequenceKey = getResponsiveSequenceKey\(sequenceKey\)[\s\S]*sequenceCache\.get\(responsiveSequenceKey\)/);
});

test('runtime visual certification derives moving World boundaries from the canonical plan', () => {
  const source = readFileSync(new URL(
    './audit-about-narrative-runtime-visuals.mjs',
    import.meta.url,
  ), 'utf8');
  assert.match(source, /bustWorld\.transitionIn\.startWU/);
  assert.match(source, /bustWorld\.transitionIn\.endWU/);
  assert.match(source, /compileAboutNarrativeRuntimePlan\(canonical/);
  assert.doesNotMatch(source, /sampleAboutNarrativeRuntimePlan\(plan, checkpoint\.storyWU/);
  assert.match(source, /stage: 'bust-v1'/);
  assert.match(source, /visibility: 1/);
  assert.match(source, /storyWU \/ storyDurationWU/);
  assert.doesNotMatch(source, /storyWU \/ 16\.35/);
});
