import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import Matter from '../react-app/app/node_modules/matter-js/build/matter.js';
import * as THREE from '../react-app/app/node_modules/three/build/three.module.js';
import { createRollercoasterSurfaceBatches } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterSurfaceBatches.js';
import { sampleRollercoasterMotion } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterMotion.js';
import { createRollercoasterCameraPose, sampleRollercoasterCamera } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterContract.js';
import { createBoardGrid, gridHandoffProgress, boardSocketMetrics, boardGridCaptureDuration,
  nearestBoardGridCell, sampleBoardGridCapture } from '../react-app/app/src/routes/about-game-board/boardGrid.js';
import {
  BOARD_HANDOFF_PHASES,
  boardHandoffPhaseState,
} from '../react-app/app/src/routes/about-game-board/boardGridHandoffScene.js';
import {
  BOARD_AUTHORED_ENDING_SOURCE_START,
  boardAuthoredEndingProgress,
} from '../react-app/app/src/routes/about-game-board/boardAuthoredEnding.js';
import { createBoardInventory } from '../react-app/app/src/routes/about-game-board/boardInventory.js';
import { createBoardReservoirPreparation, createBoardSupportSafety } from '../react-app/app/src/routes/about-game-board/boardRestingState.js';
import { createBoardArtwork } from '../react-app/app/src/routes/about-game-board/boardArtwork.js';
import { resolveHomeSimulationBodyRadius } from '../react-app/app/src/lib/homeSimulationSizing.js';
import { resolveRollercoasterProjection } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterProjection.js';
import { createBoardLayout } from '../react-app/app/src/routes/about-game-board/boardLayout.js';
import { BOARD_PORTRAIT_CHUTE_HEIGHT } from '../react-app/app/src/routes/about-game-board/boardPortraitChute.js';
import { createQuietIntervals } from '../react-app/app/src/routes/about-game-board/boardQuietIntervals.js';
import { createBoardRigidBodyWorld, loadBoardRigidBodyBackend } from '../react-app/app/src/routes/about-game-board/boardRigidBodyWorld.js';
import { BOARD_DIRECTION_RAMPS, BOARD_GARDEN, BOARD_PINBALL_BUMPERS, BOARD_SEESAWS, stepBoardSeesaw, strikeBoardSeesaw } from '../react-app/app/src/routes/about-game-board/boardMachineParts.js';
import { boardMechanismProgress, boardValveSweepSteps } from '../react-app/app/src/routes/about-game-board/boardScrollMotion.js';
import {
  BOARD_ARCHITECTURE_PALETTE_DEFAULTS,
  boardArchitectureCssVariables,
  boardArchitecturePaletteFromRuntimeConfig,
} from '../react-app/app/src/routes/about-game-board/boardArchitecturePalette.js';
import {
  boardBallPresentationFromRuntimeConfig,
  resolveBoardBallRadius,
  resolveBoardBallRadiusScale,
  resolveBoardSpatialBallRadiusLimit,
} from '../react-app/app/src/routes/about-game-board/boardBallPresentation.js';
import {
  boardTextDrawProgressAtViewportRatio,
  boardTextPresentationFromRuntimeConfig,
} from '../react-app/app/src/routes/about-game-board/boardTextPresentation.js';
import { reboundLevelForFixture, REBOUND_LEVELS } from '../react-app/app/src/routes/about-game-board/boardMaterials.js';
import {
  boardMechanismBallMaterial,
  shouldKeepBoardPhysicsActive,
} from '../react-app/app/src/routes/about-game-board/boardPhysics.js';
import { createBoardDrumPhysics } from '../react-app/app/src/routes/about-game-board/boardDrums.js';
import { createBoardAssemblyGeometry } from '../react-app/app/src/routes/about-game-board/boardAssemblyGeometry.js';
import { resolveFieldBumperRadius, reservoirFloorPolygons, reservoirGateForBallRadius } from '../react-app/app/src/routes/about-game-board/boardHandoffs.js';
import { reservoirSealIsClear } from '../react-app/app/src/routes/about-game-board/boardFlow.js';
import {
  BOARD_BAND_JOURNEY,
  boardBandCentre,
  boardBandCrossSection,
  boardBandGateFrame,
  boardBandRibbonPose,
  selectBoardTunnelGeometry,
  sampleBoardDroneMotion,
  smoothBandProgress,
} from '../react-app/app/src/routes/about-game-board/boardBandJourney.js';
import { OPENING_COPY } from '../react-app/app/src/routes/about-game-board/boardCopy.js';
import {
  applyBoardWorldGravity,
  ballColliderRadius,
  BOARD_WORLD_PHYSICS,
  stopBoardKinematicBody,
  circleCapsulePenetration,
  matterBallMaterial,
  sourceBallsBlockedByGate,
  sourceBallsBlockedByBodies,
  adaptiveBallMicroSteps,
  installBoardWakeSafety,
  stepBoardWorld,
} from '../react-app/app/src/routes/about-game-board/boardDynamics.js';
import {
  BOARD_BALL_SOURCE_ROLES,
  ballColour,
  boardBallRoleIndex,
  createBoardBallRoleAssignments,
  decodeBalls,
  GRID_START_Y,
  MECHANISM,
  resolveBoardBallRoleColours,
} from '../react-app/app/src/routes/about-game-board/boardScene.js';
import {
  createSimulationMaterialSequence,
  DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
} from '../react-app/app/src/palette/simulationPaletteContract.js';
import { ballDynamicsFromRuntimeConfig } from '../react-app/app/src/lib/ballDynamics.js';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'docs/plans/about-game-board-20260921/figma-geometry/refined-20260923');
const ballSource = resolve(root, 'docs/plans/about-game-board-20260921/figma-geometry/refined-20260922');
const runtime = resolve(root, 'react-app/app/public/models/about-game-board');
const routeSource = resolve(root, 'react-app/app/src/routes/about-game-board');
const [sourceSvg, runtimeSvg, sourceSnapshot, runtimeRows, routeCss, rendererSource,
  physicsSource, controlRegistrySource, designSystem, experienceSource,
  textSafetySource, drumsSource, handoffSource, layoutSource, authoredEndingSource] = await Promise.all([
  readFile(resolve(source, 'geometry.svg'), 'utf8'),
  readFile(resolve(runtime, 'geometry.svg'), 'utf8'),
  readFile(resolve(ballSource, 'scene-snapshot.json'), 'utf8').then(JSON.parse),
  readFile(resolve(runtime, 'balls.json'), 'utf8').then(JSON.parse),
  readFile(resolve(routeSource, 'about-game-board.css'), 'utf8'),
  readFile(resolve(routeSource, 'boardRenderer.js'), 'utf8'),
  readFile(resolve(routeSource, 'boardPhysics.js'), 'utf8'),
  readFile(resolve(root, 'react-app/app/src/legacy/modules/ui/control-registry.js'), 'utf8'),
  readFile(resolve(root, 'react-app/app/public/config/design-system.json'), 'utf8').then(JSON.parse),
  readFile(resolve(routeSource, 'AboutGameBoardExperience.jsx'), 'utf8'),
  readFile(resolve(routeSource, 'boardTextSafety.js'), 'utf8'),
  readFile(resolve(routeSource, 'boardDrums.js'), 'utf8'),
  readFile(resolve(routeSource, 'boardGridHandoffScene.js'), 'utf8'),
  readFile(resolve(routeSource, 'boardLayout.js'), 'utf8'),
  readFile(resolve(routeSource, 'boardAuthoredEnding.js'), 'utf8'),
]);

test('artwork writes only visible changed poses in board coordinates', () => {
  const writes = [];
  const artwork = createBoardArtwork({ querySelector: () => ({
    setAttribute: (name, value) => writes.push([name, value]),
    removeAttribute: name => writes.push([name, null]),
  }) });
  artwork.setVisibleRange(0, 1000);
  artwork.rotate('propeller', 1, [150, 180], 400, 2970);
  assert.equal(writes.length, 0, 'a local SVG pivot cannot make a distant mechanism visible');
  artwork.setVisibleRange(2600, 3300);
  artwork.rotate('propeller', 2, [150, 180], 400, 2970);
  artwork.rotate('propeller', 2, [150, 180], 400, 2970);
  assert.equal(writes.length, 1, 'a repeated pose must not invalidate the SVG');
  artwork.setVisibleRange(0, 1000);
  artwork.rotate('propeller', 3, [150, 180], 400, 2970);
  assert.equal(writes.length, 1);
  artwork.setVisibleRange(2600, 3300);
  artwork.rotate('propeller', 4, [150, 180], 400, 2970);
  assert.equal(writes.length, 2);
  assert.equal(writes[1][1], `rotate(${4 * 180 / Math.PI} 150 180)`,
    're-entry applies the current physical pose with its original local pivot');
});

test('an arriving ball wakes resting support contacts before detection', () => {
  const { Bodies, Body, Composite, Engine, Query, Sleeping } = Matter;
  const floor = Bodies.rectangle(0, 10, 200, 20, { isStatic: true });
  const resting = Bodies.circle(0, -10, 10, { slop: .01 });
  const falling = Bodies.circle(0, -31, 10, { slop: .01, frictionAir: 0 });
  Sleeping.set(resting, true);
  Body.setVelocity(falling, { x: 0, y: 30 });
  const engine = Engine.create({ enableSleeping: true, positionIterations: 12 });
  Composite.add(engine.world, [floor, resting, falling]);
  const dispose = installBoardWakeSafety(engine, [resting, falling]);
  Engine.update(engine, 1000 / 120);
  assert.ok(engine.pairs.list.some(pair => pair.isActive
    && [pair.bodyA, pair.bodyB].includes(floor)
    && [pair.bodyA, pair.bodyB].includes(resting)), 'the floor must join the first contact solve');
  assert.ok((Query.collides(resting, [floor])[0]?.depth ?? 0) < .5,
    'the first frame must not push the newly woken ball through its support');
  dispose();
  Composite.clear(engine.world, false);
  Engine.clear(engine);
});

test('bounded artwork preserves screen coordinates and restores authored transforms', () => {
  const rootAttributes = new Map([['viewBox', '0 0 960 14140'], ['style', 'width:100%']]);
  const childAttributes = new Map([['transform', 'translate(0 2790)']]);
  const attributes = map => ({
    getAttribute: name => map.get(name) ?? null,
    setAttribute: (name, value) => map.set(name, value),
    removeAttribute: name => map.delete(name),
  });
  const svg = { ...attributes(rootAttributes), style: {},
    querySelector: () => attributes(childAttributes) };
  const artwork = createBoardArtwork(svg);
  artwork.setVisibleRange(2600, 3300, .5);
  const visibleViewBox = rootAttributes.get('viewBox');
  artwork.setVisibleRange(NaN, Infinity, 0);
  assert.equal(rootAttributes.get('viewBox'), visibleViewBox,
    'a temporarily hidden route must retain its last valid SVG viewport');
  artwork.rotate('propeller', 1, [150, 180], 400, 2970);
  assert.equal(rootAttributes.get('viewBox'), '0 2600 960 700');
  assert.equal(svg.style.height, '350px');
  assert.equal(Number.parseFloat(svg.style.top) + (2970 - 2600) * .5, 2970 * .5);
  artwork.dispose();
  assert.equal(rootAttributes.get('viewBox'), '0 0 960 14140');
  assert.equal(rootAttributes.get('style'), 'width:100%');
  assert.equal(childAttributes.get('transform'), 'translate(0 2790)');
});

test('a moving fixture wakes its resting ball before it can clip through the support', () => {
  const { Bodies, Body, Composite, Engine, Query, Sleeping } = Matter;
  for (const rotation of [false, true]) {
    const floor = Bodies.rectangle(0, 10, 200, 20, { isStatic: true });
    const ball = Bodies.circle(60, -10, 10, { slop: .01 });
    const engine = Engine.create({ enableSleeping: true, positionIterations: 12 });
    Composite.add(engine.world, [floor, ball]);
    Sleeping.set(ball, true);
    const dispose = installBoardWakeSafety(engine, [ball], [floor]);
    Engine.update(engine, 1000 / 120);
    assert.equal(ball.isSleeping, true, 'unchanged fixtures must leave a supported pile at rest');
    if (rotation) Body.setAngle(floor, -.05, true);
    else Body.setPosition(floor, { x: 0, y: 6 }, true);
    Engine.update(engine, 1000 / 120);
    assert.equal(ball.isSleeping, false, 'a real support movement must wake its contact');
    assert.ok((Query.collides(ball, [floor])[0]?.depth ?? 0) < .5,
      'the moving fixture must participate in the first contact solve');
    dispose();
    Composite.clear(engine.world, false);
    Engine.clear(engine);
  }
});

test('a scroll-positioned support wakes its touching pile without a motor kick', () => {
  const { Bodies, Body, Composite, Engine } = Matter;
  const engine = Engine.create({ enableSleeping: true, positionIterations: 12 });
  const floor = Bodies.rectangle(0, 10, 200, 20, { isStatic: true });
  const balls = [0, 1, 2].map(index => Bodies.circle(0, -10 - index * 20, 10));
  Composite.add(engine.world, [floor, ...balls]);
  for (let step = 0; step < 400; step += 1) Engine.update(engine, 1000 / 120);
  assert.ok(balls.every(ball => ball.isSleeping));
  const dispose = installBoardWakeSafety(engine, balls, [floor]);
  Body.setPosition(floor, { x: 0, y: 9 });
  stopBoardKinematicBody(floor);
  Engine.update(engine, 1000 / 120);
  assert.ok(balls.every(ball => !ball.isSleeping),
    'sleeping neighbours must yield to a moving valve even without contact velocity');
  dispose();
  Engine.clear(engine);
});

test('runtime geometry is the exact reviewed Figma export', () => {
  assert.equal(runtimeSvg, sourceSvg);
  assert.equal((runtimeSvg.match(/id="geometry-bumper-/g) || []).length, 68);
  assert.equal((runtimeSvg.match(/id="geometry-pinball-bumper-/g) || []).length, 3);
  assert.equal((runtimeSvg.match(/id="geometry-socket-/g) || []).length, 352);
  assert.equal((runtimeSvg.match(/<path\b/g) || []).length, 564);
  assert.match(runtimeSvg, /id="geometry-propeller-0001"/);
  assert.match(runtimeSvg, /id="geometry-pinball-playfield"/);
});

test('field bumpers leave a running gap for the actual responsive ball', () => {
  for (const radius of [6.656, 12.632, 20.323, 25.062]) {
    const bumper = resolveFieldBumperRadius(33, 100, radius);
    assert.ok(100 - bumper * 2 >= radius * 2.2 - 1e-8);
    assert.ok(bumper <= 33, 'the field never grows beyond the reviewed silhouette');
  }
  assert.equal(resolveFieldBumperRadius(33, 100, 6.656), 33);
});

test('architecture uses one fixed grey and moving white in both themes', () => {
  const sourcePaints = [...new Set(
    [...runtimeSvg.matchAll(/\b(?:fill|stroke)="(#[A-F0-9]{6})"/g)]
      .map(match => match[1]),
  )].sort();
  assert.deepEqual(sourcePaints, [
    '#B4C0AC', '#B7C1B0', '#BFC5BA', '#CBD0C6', '#CBD1C6',
    '#CDD1C9', '#D0D4CC', '#D2D5CF', '#D5D8D1', '#FAFBF8',
  ]);

  for (const [, attribute, colour] of runtimeSvg.matchAll(/\b(fill|stroke)="(#[A-F0-9]{6})"/g)) {
    assert.ok(routeCss.includes(`[${attribute}='${colour}']`),
      `${attribute} ${colour} must map to an architecture material role`);
  }

  assert.match(routeCss, /--about-architecture-static-light: #d3d3d3;/);
  assert.match(routeCss, /--about-architecture-static-dark: #424242;/);
  assert.match(routeCss, /--about-architecture-moving: #ffffff;/);
  assert.match(routeCss, /--about-architecture-fixture: var\(--about-architecture-static\);/);
  assert.match(routeCss, /--about-architecture-wall: var\(--about-architecture-static\);/);
  assert.match(routeCss, /--about-architecture-action: var\(--about-architecture-moving\);/);
  assert.match(routeCss,
    /--about-architecture-static: var\(--about-architecture-static-dark\);/);
  assert.match(drumsSource, /stroke: 'var\(--about-architecture-action\)'/,
    'rotating drum paddles must be white moving parts');
  assert.match(rendererSource,
    /getPropertyValue\('--about-architecture-fixture'\)/,
    'Canvas sockets must consume the same architecture fixture role');
  assert.doesNotMatch(rendererSource,
    /theme === 'dark' \? '#4a5350' : '#d0d4cc'/,
    'Canvas sockets must not retain a separate theme colour pair');
  assert.match(routeCss,
    /\.about-board-art \{ position: absolute; inset: 0; overflow: hidden; \}/,
    'SVG art must share one cropped board box across browser engines');
  assert.match(routeCss, /\.about-board-art svg \{ height: auto; \}/,
    'the complete Figma strip must keep its 960-unit scale inside the cropped box');
});

test('architecture palette resolves from canonical runtime values with safe fallbacks', () => {
  assert.equal(Object.isFrozen(BOARD_ARCHITECTURE_PALETTE_DEFAULTS), true);
  assert.equal(Object.isFrozen(BOARD_ARCHITECTURE_PALETTE_DEFAULTS.light), true);
  assert.equal(Object.isFrozen(BOARD_ARCHITECTURE_PALETTE_DEFAULTS.dark), true);

  const canonicalPalette = boardArchitecturePaletteFromRuntimeConfig(designSystem.runtime);
  assert.deepEqual(canonicalPalette, BOARD_ARCHITECTURE_PALETTE_DEFAULTS);
  assert.deepEqual(boardArchitectureCssVariables(canonicalPalette), {
    '--about-architecture-static-light': '#d3d3d3',
    '--about-architecture-static-dark': '#424242',
    '--about-architecture-moving': '#ffffff',
  });

  const normalizedPalette = boardArchitecturePaletteFromRuntimeConfig({
    aboutArchitectureStaticLight: ' #ABC ',
    aboutArchitectureStaticDark: 'invalid',
    aboutArchitectureMoving: '#12345678',
  });
  assert.equal(normalizedPalette.light.static, '#aabbcc');
  assert.equal(normalizedPalette.dark.static, BOARD_ARCHITECTURE_PALETTE_DEFAULTS.dark.static);
  assert.equal(normalizedPalette.light.moving, '#ffffff');
  assert.equal(normalizedPalette.dark.moving, '#ffffff');
});

test('fixture rebound has mild, high and non-elastic material levels', () => {
  assert.ok(REBOUND_LEVELS.default.restitution < REBOUND_LEVELS.high.restitution);
  assert.equal(REBOUND_LEVELS.zero.restitution, 0);
  assert.equal(reboundLevelForFixture('pinball-sling-left'), 'high');
  assert.equal(reboundLevelForFixture('geometry-pinball-bumper-0001'), 'high');
  assert.equal(reboundLevelForFixture('large-drum-carrier'), 'zero');
  assert.equal(reboundLevelForFixture('small-drum-casing'), 'zero');
  assert.equal(reboundLevelForFixture('reservoir-left-floor'), 'default');
});

test('phone flight caps nearby balls at Home size and enlarges the retained gate framing', () => {
  const presentation = boardBallPresentationFromRuntimeConfig(designSystem.runtime);
  for (const width of [300, 370, 410]) {
    const viewport = { cssWidth: width, cssHeight: 746, isMobileDevice: true };
    assert.equal(resolveBoardSpatialBallRadiusLimit(presentation, viewport),
      resolveHomeSimulationBodyRadius(presentation.homeSimulationBodyRadiusPx, presentation, viewport));
  }
  assert.equal(resolveBoardSpatialBallRadiusLimit(presentation,
    { cssWidth: 1412, cssHeight: 916, isMobileDevice: false }), 0,
  'desktop perspective keeps its existing ball size');

  const source = { horizontalFov: 70, portraitVerticalFov: 95 };
  const lens = { portraitVerticalFov: designSystem.runtime.aboutCameraPortraitFov };
  const previous = resolveRollercoasterProjection(source, 370, 746);
  const phone = resolveRollercoasterProjection(source, 370, 746, lens);
  assert.ok(phone.focalLengthPx / previous.focalLengthPx > 1.4,
    'the same gate and camera position must appear at least 40% larger on phones');
  assert.deepEqual(resolveRollercoasterProjection(source, 1412, 916, lens),
    resolveRollercoasterProjection(source, 1412, 916),
    'the phone lens cap must not change the desktop framing');
});

test('board balls share responsive size controls and semantic palette roles', () => {
  const presentation = boardBallPresentationFromRuntimeConfig(designSystem.runtime);
  for (const [boardWidth, isMobileDevice] of [[300, true], [370, true], [740, true], [1412, false]]) {
    const viewport = { boardWidth, cssWidth: boardWidth, isMobileDevice };
    const scale = resolveBoardBallRadiusScale(presentation, viewport);
    const expected = resolveHomeSimulationBodyRadius(presentation.homeSimulationBodyRadiusPx,
      presentation, viewport);
    for (const authoredRadius of [7, 10, 13]) {
      assert.ok(Math.abs(resolveBoardBallRadius(authoredRadius, scale) * boardWidth / 960
        - expected) < 1e-8, 'each visible ball must have Home radius in CSS pixels');
    }
  }

  const colors = Object.freeze(Array.from({ length: 8 }, (_, index) => (
    `#${String(index + 1).padStart(6, '0')}`
  )));
  const snapshot = {
    colors,
    distribution: BOARD_BALL_SOURCE_ROLES.map((role, index) => ({
      roleId: role.roleId,
      label: role.roleId,
      colorIndex: 7 - index,
      weight: 1,
    })),
  };
  const roleColours = resolveBoardBallRoleColours(snapshot);
  assert.deepEqual(roleColours, [
    '#000008', '#000007', '#000006', '#000005', '#000004', '#000003',
  ]);
  BOARD_BALL_SOURCE_ROLES.forEach((role, index) => {
    assert.equal(ballColour(role.rgb, snapshot), roleColours[index]);
  });

  assert.match(rendererSource, /subscribeSimulationBodyMaterial/);
  assert.doesNotMatch(rendererSource, /for \(const ball of getBalls\(\)\)/,
    'authored illustration rows must never be drawn as loose balls');
  assert.match(rendererSource, /resolveBoardBallRadius\(radius, radiusScale\)/);
  assert.match(physicsSource,
    /ballColliderRadius\(ball\.radius\)/);
  assert.match(handoffSource, /resolveBoardBallRadius\(entry\.radius, resolvedRadiusScale\)/);
  assert.match(experienceSource, /renderer\.dispose\(\)/);
});

test('the opening reservoir remixes colours without changing the central role ratio', () => {
  const balls = decodeBalls(runtimeRows);
  const reservoir = balls.filter(ball => ball.y > 90 && ball.y < 1100);
  const snapshot = { distribution: DEFAULT_SIMULATION_COLOR_DISTRIBUTION };
  const first = createBoardBallRoleAssignments(balls, snapshot);
  const second = createBoardBallRoleAssignments(balls, snapshot);
  const actual = new Array(BOARD_BALL_SOURCE_ROLES.length).fill(0);
  const authored = new Array(BOARD_BALL_SOURCE_ROLES.length).fill(0);
  let changed = 0;
  for (const ball of reservoir) {
    const role = first.get(ball.id);
    actual[role] += 1;
    authored[boardBallRoleIndex(ball.rgb)] += 1;
    if (role !== boardBallRoleIndex(ball.rgb)) changed += 1;
    assert.equal(second.get(ball.id), role, 'the remix must be stable across renders');
  }
  const expected = new Array(BOARD_BALL_SOURCE_ROLES.length).fill(0);
  const roleIndex = new Map(BOARD_BALL_SOURCE_ROLES.map((role, index) => [role.roleId, index]));
  for (const role of createSimulationMaterialSequence(reservoir.length, {}, snapshot)) {
    expected[roleIndex.get(role.roleId)] += 1;
  }
  assert.deepEqual(actual, expected, 'the reservoir must keep the central weighted allocation');
  assert.notDeepEqual(actual, authored, 'the opening must no longer inherit the Figma pigment mix');
  assert.ok(changed > reservoir.length / 2, 'the new opening needs a visibly different spatial mix');
});

test('the opening inventory cold-packs the visible chamber deterministically without overlaps', () => {
  const source = decodeBalls(runtimeRows);
  const viewports = [[300, 740], [370, 844], [740, 900], [1412, 1000], [816, 390]];
  for (const [width, height] of viewports) {
    const scale = resolveBoardBallRadiusScale(designSystem.runtime, {
      boardWidth: width, isMobileDevice: width < 800,
    });
    const layout = createBoardLayout(width < 640, { boardWidth: width, viewportHeight: height });
    const inventory = createBoardInventory(source, scale, { reservoirTop: layout.reservoirTop });
    const repeated = createBoardInventory(source, scale, { reservoirTop: layout.reservoirTop });
    assert.deepEqual(repeated, inventory, 'cold packing must not depend on time or random state');
    assert.ok(inventory.reservoir.length > 100, 'the opening must hold a substantial resting pile');
    assert.equal(inventory.maximumBodies, inventory.balls.length,
      'the runtime budget must equal the finite reservoir inventory');
    assert.equal(inventory.balls, inventory.reservoir,
      'every physical identity must begin in the reservoir');
    assert.ok(inventory.maximumBodies < 6500,
      'even the densest supported viewport must retain a finite preparation budget');
    assert.ok(inventory.balls.every(ball => ball.reservoir && ball.id.startsWith('pit-')),
      'journey and grid states must transfer reservoir identities instead of spawning balls');
    assert.equal(new Set(inventory.reservoir.map(ball => ball.id)).size,
      inventory.reservoir.length, 'every packed body needs a stable identity');

    // Check all neighbouring lattice cells without turning the largest desktop
    // chamber into a quadratic test. Any overlap must share one of these cells.
    const cells = new Map();
    const cellSize = inventory.radius * 2;
    for (const ball of inventory.reservoir) {
      const cx = Math.floor(ball.x / cellSize);
      const cy = Math.floor(ball.y / cellSize);
      for (let x = cx - 1; x <= cx + 1; x += 1) for (let y = cy - 1; y <= cy + 1; y += 1) {
        for (const other of cells.get(`${x}:${y}`) || []) {
          assert.ok(Math.hypot(ball.x - other.x, ball.y - other.y)
            >= ball.radius + other.radius - 1e-8,
          'packing must not start with interpenetrating balls');
        }
      }
      const key = `${cx}:${cy}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(ball);
    }
    assert.ok(inventory.surfaceY >= layout.reservoirTop,
      'the cold seed must stay inside the responsive chamber');
    assert.equal(inventory.surfaceY, Math.min(...inventory.reservoir.map(ball => ball.y)));
    assert.equal('feedY' in inventory, false, 'finite inventory has no replenishment feed');
    assert.equal('feedBounds' in inventory, false, 'finite inventory has no spawn aperture');
    const chamberHeight = 1080 - inventory.radius
      - (layout.reservoirTop + inventory.radius * 1.1);
    const normalisedDensity = inventory.reservoir.length * inventory.radius ** 2 / chamberHeight;
    assert.ok(normalisedDensity > 105 && normalisedDensity < 130,
      `the finite inventory must use half the former chamber capacity, received ${normalisedDensity}`);
  }
  assert.match(physicsSource, /for \(let index = 0; index < initialCount; index \+= 1\) spawn\(\)/);
  assert.match(physicsSource, /if \(gateProgress > 0\) unsealReservoir\(\)/);
  assert.match(physicsSource, /Sleeping\.set\(body, false\)/,
    'removing a supporting seal must wake its sleeping inventory');
});

test('hidden preparation reaches supported rest and removed supports release the whole pile', () => {
  const { Bodies, Composite, Engine } = Matter;
  const engine = Engine.create({ enableSleeping: true,
    positionIterations: BOARD_WORLD_PHYSICS.positionIterations,
    velocityIterations: BOARD_WORLD_PHYSICS.velocityIterations });
  const fixtures = [Bodies.rectangle(0, 150, 240, 20, { isStatic: true })];
  const balls = Array.from({ length: 3 }, (_, index) =>
    Bodies.circle(0, 20 + index * 35, 12, matterBallMaterial()));
  Composite.add(engine.world, [...fixtures, ...balls]);
  const support = createBoardSupportSafety(engine, balls, fixtures);
  const preparation = createBoardReservoirPreparation(engine, balls, fixtures, support);
  assert.equal(preparation.ready, false, 'unsupported initial positions are not a ready scene');
  for (let index = 0; index < 30 && !preparation.ready; index += 1) preparation.advance(100);
  assert.equal(preparation.ready, true, 'normal gravity must settle the reservoir');
  assert.equal(preparation.settled, true, 'a timeout is not a successful settled start');
  assert.equal(support.inspect().supported, balls.length);
  assert.ok(balls.every(ball => ball.isSleeping));
  const resting = balls.map(ball => ({ ...ball.position }));
  for (let step = 0; step < 120; step += 1) {
    stepBoardWorld(engine, balls);
    support.update(BOARD_WORLD_PHYSICS.fixedStepMs);
  }
  assert.deepEqual(balls.map(ball => ball.position), resting,
    'a supported closed pile must not jiggle or receive artificial motion');

  Composite.remove(engine.world, fixtures.pop());
  support.update(100);
  assert.ok(balls.every(ball => !ball.isSleeping),
    'an isolated touching cluster cannot pretend to support itself');
  for (let step = 0; step < 60; step += 1) stepBoardWorld(engine, balls);
  assert.ok(balls.every((ball, index) => ball.position.y > resting[index].y + 50),
    'removing the support must release every particle under unchanged world gravity');
  assert.equal(engine.gravity.y, 9.81);
  Engine.clear(engine);
});

test('a missing cold-pack support cannot certify an initial resting ball', () => {
  const { Bodies, Composite, Engine, Sleeping } = Matter;
  const engine = Engine.create({ enableSleeping: true });
  const ball = Bodies.circle(0, 40, 12, matterBallMaterial());
  ball.plugin.boardInitialRest = { x: ball.position.x, y: ball.position.y,
    supports: [null] };
  Composite.add(engine.world, ball);
  Sleeping.set(ball, true);
  const support = createBoardSupportSafety(engine, [ball], []);
  assert.deepEqual(support.inspect(), { unsupportedSleeping: 1, supported: 0, recovered: 0 });
  assert.deepEqual(support.inspect(true), { unsupportedSleeping: 1, supported: 0, recovered: 1 });
  assert.equal(ball.isSleeping, false,
    'a missing referenced support must wake the seed instead of freezing it in empty space');
  Engine.clear(engine);
});

test('the reservoir seal waits for the live circle to leave the valve pocket', () => {
  const radius = 6.65609065;
  const gate = reservoirGateForBallRadius(radius);
  const bounds = {
    min: { x: gate.pivot[0] - 8, y: gate.pivot[1] - 10 },
    max: { x: 960 - gate.pivot[0] + 8, y: gate.pivot[1] + 10 },
  };
  const ball = Matter.Bodies.circle(506.94, 1090, radius);
  assert.equal(reservoirSealIsClear([ball], bounds, gate), true, 'upstream ball');
  // Rapier exports the centre without moving the Matter display vertices.
  ball.position.y = 1102.11;
  assert.equal(reservoirSealIsClear([ball], bounds, gate), false, 'ball between arm and seal');
  ball.position.y = 1121;
  assert.equal(reservoirSealIsClear([ball], bounds, gate), false, 'ball crossing the seal');
  ball.position.y = 1141;
  assert.equal(reservoirSealIsClear([ball], bounds, gate), true, 'ball clear downstream');
});

test('the reservoir valve leaves four ball diameters clear and opens away from the pile', () => {
  for (const radius of [6.5, 13, 20.32, 25.1]) {
    const gate = reservoirGateForBallRadius(radius);
    const [leftFloor, rightFloor] = reservoirFloorPolygons(gate);
    const opening = rightFloor[1][0] - leftFloor[1][0] - gate.pivotRadius - 10 / 3;
    assert.ok(opening >= radius * 8 - 1e-8,
      'the hinge and right rail must leave enough passage to avoid a single-ball arch');
    const dx = gate.end[0] - gate.pivot[0];
    const dy = gate.end[1] - gate.pivot[1];
    const foldedEnd = [gate.pivot[0] + Math.cos(gate.openAngle) * dx - Math.sin(gate.openAngle) * dy,
      gate.pivot[1] + Math.sin(gate.openAngle) * dx + Math.cos(gate.openAngle) * dy];
    assert.ok(gate.openAngle > 0 && Math.abs(foldedEnd[0] - gate.pivot[0]) < 1e-6,
      'opening must swing down into a vertical hanging pose, away from the pile');
    const [[shoulderX, shoulderY], [neckX, neckY]] = leftFloor;
    const slope = (neckY - shoulderY) / (neckX - shoulderX);
    const normalLength = Math.hypot(slope, 1);
    for (const [x, y] of [gate.pivot, foldedEnd]) {
      const depthBelowFloor = (y - (shoulderY + (x - shoulderX) * slope)) / normalLength;
      assert.ok(depthBelowFloor > gate.width / 2,
        'the entire folded arm must clear the ball-facing side of the floor');
    }
  }
});

test('sleep protection wakes an isolated airborne ball without disturbing a supported one', () => {
  const { Bodies, Composite, Engine, Sleeping } = Matter;
  const engine = Engine.create({ enableSleeping: true });
  const floor = Bodies.rectangle(0, 100, 100, 10, { isStatic: true });
  const resting = Bodies.circle(0, 85, 10, matterBallMaterial());
  const airborne = Bodies.circle(200, 0, 10, matterBallMaterial());
  const balls = [resting, airborne];
  Composite.add(engine.world, [floor, ...balls]);
  stepBoardWorld(engine, balls);
  for (const ball of balls) Sleeping.set(ball, true);
  const support = createBoardSupportSafety(engine, balls, [floor]);
  support.update(100);
  assert.equal(resting.isSleeping, true);
  assert.equal(airborne.isSleeping, false);
  stepBoardWorld(engine, balls);
  assert.ok(airborne.velocity.y > 0);
  Engine.clear(engine);
});

test('wall and ceiling contacts cannot hold sleeping particles against gravity', () => {
  const { Bodies, Composite, Engine, Sleeping } = Matter;
  for (const [fixture, point] of [
    [Bodies.rectangle(0, 0, 20, 500, { isStatic: true, friction: 0 }), [19.9, 0]],
    [Bodies.rectangle(0, 0, 500, 20, { isStatic: true }), [0, 19.9]],
  ]) {
    const engine = Engine.create({ enableSleeping: true });
    const ball = Bodies.circle(...point, 10, matterBallMaterial());
    Composite.add(engine.world, [fixture, ball]);
    stepBoardWorld(engine, [ball]);
    Sleeping.set(ball, true);
    const support = createBoardSupportSafety(engine, [ball], [fixture]);
    support.update(100);
    assert.equal(ball.isSleeping, false, 'sideways or downward contact is not support');
    assert.equal(support.inspect().supported, 0);
    Engine.clear(engine);
  }
});

test('preparation allows bouncy materials but cannot wait forever on missing support', () => {
  const { Bodies, Composite, Engine } = Matter;
  for (const hasFloor of [true, false]) {
    const engine = Engine.create({ enableSleeping: true });
    const fixtures = hasFloor ? [Bodies.rectangle(0, 150, 240, 20, { isStatic: true })] : [];
    const balls = [Bodies.circle(0, 30, 12, matterBallMaterial({ restitution: 1 }))];
    Composite.add(engine.world, [...fixtures, ...balls]);
    const support = createBoardSupportSafety(engine, balls, fixtures);
    const preparation = createBoardReservoirPreparation(engine, balls, fixtures, support);
    for (let index = 0; index < 40 && !preparation.ready; index += 1) preparation.advance(100);
    assert.equal(preparation.ready, true, 'preparation must have a bounded completion path');
    assert.equal(preparation.settled, hasFloor, 'missing architecture must report failed settling');
    if (!hasFloor) assert.ok(!balls[0].isSleeping && balls[0].position.y > 150,
      'failure must keep real gravity and motion, not paint or freeze the original seed');
    Engine.clear(engine);
  }
});

test('balls share visible collision geometry, tunable material and fixed world gravity', () => {
  const balls = decodeBalls(runtimeRows);
  const gateBall = balls.find(ball => ball.id === '4:8591');
  const gate = MECHANISM.reservoirGate;
  assert.ok(gate.openAngle < 0, 'the valve must fold into the left wall, away from its outlet');
  assert.ok(gateBall, 'reviewed gate-overlap ball must remain identifiable');
  assert.equal(ballColliderRadius(gateBall.radius), gateBall.radius,
    'the drawn and physical radii must be identical');
  assert.ok(circleCapsulePenetration({
    x: gateBall.x, y: gateBall.y, radius: gateBall.radius,
  }, gate.pivot, gate.end, gate.width / 2) > 0,
  'the source still contains the reviewed overlap that the runtime must mask before release');
  assert.deepEqual([...sourceBallsBlockedByGate(balls, gate)], ['4:8591']);

  const dynamics = ballDynamicsFromRuntimeConfig(designSystem.runtime);
  const material = matterBallMaterial(dynamics);
  assert.deepEqual(dynamics, { massKg: 240, restitution: 0.18, friction: 0.018 });
  assert.equal(material.density, 0.001);
  assert.equal(matterBallMaterial({ ...dynamics, massKg: 400 }).density,
    0.001 * 400 / 240);

  const engine = { gravity: { x: 4, y: -2, scale: 8 }, timing: { timeScale: 0.2 } };
  applyBoardWorldGravity(engine);
  assert.deepEqual(engine.gravity, BOARD_WORLD_PHYSICS.gravity);
  assert.equal(engine.timing.timeScale, 1);
  assert.equal(engine.gravity.y * engine.gravity.scale, 0.001);
  assert.ok(BOARD_WORLD_PHYSICS.fixedStepMs < 1000 / 60);
  assert.equal(adaptiveBallMicroSteps([{
    circleRadius: 10,
    isSleeping: false,
    speed: 20,
  }]), 3, 'fast balls must receive adaptive collision substeps');
  assert.equal(adaptiveBallMicroSteps([{
    circleRadius: 10,
    isSleeping: true,
    speed: 200,
  }]), 1, 'sleeping balls must not spend additional solver work');

  const fixture = Matter.Bodies.rectangle(100, 100, 50, 20, { isStatic: true });
  assert.deepEqual([...sourceBallsBlockedByBodies([
    { id: 'clear', x: 20, y: 20, radius: 10 },
    { id: 'blocked', x: 100, y: 100, radius: 10 },
  ], [fixture])], ['blocked'], 'all architecture colliders must reject authored overlaps');

  assert.doesNotMatch(physicsSource, /ball\.radius \* 0\.82/,
    'no route may shrink collision circles beneath their visible spheres');
  assert.doesNotMatch(physicsSource, /Composite\.remove\(engine\.world, gate\.body\)/,
    'the valve collider must remain present while its artwork is visible');
  assert.match(physicsSource, /!architectureBlockedSourceIds\.has\(ball\.id\)/,
    'a physical ball must never spawn from an authored architecture overlap');
  assert.match(controlRegistrySource, /publishBallDynamicsChange/,
    'the existing Material World controls must live-apply to the board');
});

test('motion survives the former one-minute cutoff', () => {
  for (const elapsed of [0, 60000, 180000]) {
    assert.equal(shouldKeepBoardPhysicsActive(elapsed, 1, 0, false, false, 0), true);
    assert.equal(shouldKeepBoardPhysicsActive(elapsed, 0, 0, true, false, 1), true);
    assert.equal(shouldKeepBoardPhysicsActive(elapsed, 0, 0, false, true, 1), true);
    assert.equal(shouldKeepBoardPhysicsActive(elapsed, 0, 1, false, false, 1), true);
    assert.equal(shouldKeepBoardPhysicsActive(elapsed, 0, 0, false, false, 0), false);
  }
  assert.doesNotMatch(physicsSource, /MAX_ACTIVE_SIMULATION_MS/);
});

test('mechanism material zones preserve drum rolling and canal damping', () => {
  const base = { restitution: .35, friction: .08, frictionStatic: .14, frictionAir: .006 };
  assert.deepEqual(boardMechanismBallMaterial(base, 'normal'), base);
  assert.deepEqual(boardMechanismBallMaterial(base, 'drum'), {
    ...base, restitution: 0,
  }, 'drums absorb bounce without removing rolling friction or air damping');
  assert.deepEqual(boardMechanismBallMaterial(base, 'canal'), {
    restitution: 0, friction: 0, frictionStatic: 0, frictionAir: 0,
  }, 'the sealed transfer canal remains the intentionally frictionless zone');
});

test('finite inventory and native suspension preserve one physical ledger', () => {
  assert.doesNotMatch(physicsSource, /feedReservoir|`feed-\$\{/,
    'the board must not manufacture replacement balls after release');
  assert.doesNotMatch(physicsSource, /journeySeeds|journeyReleased/,
    'journey preview balls must come from the reservoir inventory');
  assert.match(physicsSource, /function createCheckpoint\(\)/);
  assert.match(physicsSource, /function suspend\(\)/);
  assert.match(physicsSource, /function resume\(\)/);
  assert.match(physicsSource, /rigidBodyWorld\.dispose\(\)/,
    'suspension must free the native solver rather than retain a hidden world');
  assert.match(physicsSource, /getInventorySnapshot/,
    'runtime diagnostics must expose exact identity conservation');
  assert.match(physicsSource, /gridCaptures\.set\(body\.plugin\.boardId/,
    'capture bookkeeping must use the same finite-inventory identity as the ledger');
  assert.doesNotMatch(physicsSource, /gridCaptures\.(?:set|get|has|delete)\(body\.id/,
    'Matter implementation IDs must not leak into the physical inventory ledger');
  assert.match(physicsSource, /nativeLifetimeSteps/,
    'native work must remain measurable across repeated suspend and resume cycles');
});

test('editorial copy shares one reading size and fails safely on architecture overlap', () => {
  assert.equal(typeof OPENING_COPY, 'string', 'the introduction must read as one opening paragraph');
  assert.match(OPENING_COPY, /^Hi, I’m Alex\./);
  assert.doesNotMatch(experienceSource, /slotId="follow-ideas"|slotId="disciplines-title"/,
    'the old disconnected fragments must not return');
  assert.match(routeCss, /--about-board-type-main:/);
  assert.doesNotMatch(routeCss, /--about-board-type-small/);
  assert.match(routeCss, /--about-board-copy-measure: 32ch/);
  assert.match(experienceSource,
    /about-board-intro__copy route-title-lockup[\s\S]*?route-centered-page__title route-bookend-title[\s\S]*?data-route-enter-variant="bookend-title"[\s\S]*?route-title-lockup__rule[\s\S]*?data-route-enter-variant="bookend-description"/,
    'the opening uses the shared title, separator and description sequence');
  assert.match(experienceSource, /about-board-ending__invitation[\s\S]*?<h2 className="route-centered-page__title route-bookend-title"/,
    'the invitation must use the shared serif bookend role');
  assert.match(routeCss, /width: min\(var\(--about-board-copy-measure\), 76%\)/,
    'all reading passages must use the same central measure');
  assert.match(routeCss, /--about-board-type-main: 1\.25rem/,
    'the approved phone reading size is twenty pixels at normal text scale');
  assert.match(experienceSource, /findTextArchitectureOverlaps\(scope\)/);
  assert.match(experienceSource, /if \(overlaps\.length\) enableReaderMode\(\)/,
    'unsafe responsive copy must use the normal-flow reader fallback after any resize');
  assert.match(experienceSource, /pendingReaderAnchorRef/,
    'reader fallback must preserve the current scroll position');
  assert.match(textSafetySource, /isPointInFill/);
  assert.match(textSafetySource, /isPointInStroke/);
  assert.match(textSafetySource, /data-board-text-keepout/,
    'complex mechanisms must expose semantic exclusion regions');
  assert.doesNotMatch(drumsSource, /data-board-text-pocket/,
    'discipline text must stay outside the rotary drums');
});

test('the revised pinball and direction ramps leave a full ball corridor and all eight beams respond to impact', () => {
  const diameter = resolveBoardBallRadius(13, resolveBoardBallRadiusScale({}, {
    cssWidth: 320, cssHeight: 740, boardWidth: 300,
  })) * 2;
  assert.equal(BOARD_PINBALL_BUMPERS.length, 10);
  assert.ok(BOARD_PINBALL_BUMPERS.some(([x, y]) => Math.abs(x - 480) < 1 && y > 3780),
    'the lower centre bumper must remain in the revised pinball pattern');
  assert.equal(BOARD_DIRECTION_RAMPS.length, 6);
  for (let i = 0; i < BOARD_DIRECTION_RAMPS.length - 1; i += 1) {
    const { vertices } = BOARD_DIRECTION_RAMPS[i];
    const { vertices: following } = BOARD_DIRECTION_RAMPS[i + 1];
    assert.notEqual(Math.sign(vertices[0][0] - 480), Math.sign(following[0][0] - 480));
    const gap = Math.min(...following.map(([, y]) => y)) - Math.max(...vertices.map(([, y]) => y));
    assert.ok(gap > diameter + 8, 'the solid ramp faces must not pinch phone balls');
  }
  assert.equal(BOARD_SEESAWS.length, 8);
  for (const spec of BOARD_SEESAWS) {
    const part = { ...spec, baseAngle: spec.angle, angularVelocity: 0 };
    strikeBoardSeesaw(part, { position: { x: part.pivot[0] + part.length / 2 }, velocity: { y: 12 } });
    for (let i = 0; i < 15; i += 1) part.angle = stepBoardSeesaw(part, 1 / 60);
    assert.ok(part.angle - part.baseAngle > .05, 'an off-centre impact must visibly tip the beam');
    for (let i = 0; i < 600; i += 1) part.angle = stepBoardSeesaw(part, 1 / 60);
    assert.ok(Math.abs(part.angle - part.baseAngle) < .001, 'the beam must settle after the impact');
  }
});

test('the authored wheel carriers fit their chambers at both reference sizes', () => {
  for (const radius of [6.66, 20.32, 25.06]) {
    const geometry = createBoardAssemblyGeometry(radius);
    const drums = createBoardDrumPhysics({ geometry });
    assert.deepEqual(drums.specs.map(wheel => wheel.compartmentCount), [6, 4]);
    for (const [index, wheel] of drums.specs.entries()) {
      const eccentricity = Math.hypot(wheel.centre[0] - wheel.casingCentre[0],
        wheel.centre[1] - wheel.casingCentre[1]);
      assert.ok(wheel.carrierOuterRadius + eccentricity < wheel.casingRadius);
      assert.ok(wheel.carrierOuterRadius - wheel.carrierInnerRadius > radius * 5);
      assert.ok(drums.carrierBodies[index].parts.length <= 14,
        'wheel motion must use a bounded number of convex parts');
    }
  }
});

test('runtime ball data preserves all reviewed Figma IDs and placements', () => {
  const balls = decodeBalls(runtimeRows);
  assert.equal(balls.length, sourceSnapshot.balls.length);
  for (let index = 0; index < balls.length; index += 1) {
    const [id, , x, y, radius, rgb] = sourceSnapshot.balls[index];
    assert.deepEqual(balls[index], { id, x, y, radius, rgb });
  }
});

test('the flat grid owns one complete 2D-to-Three handoff record', () => {
  const balls = decodeBalls(runtimeRows);
  const flat = balls.filter(ball => ball.y >= 10050 && ball.y <= 11140);
  const bent = balls.filter(ball => ball.y > 11140 && ball.y < 12100);
  const socketFor = (ball, index) => ({
    id: `geometry-socket-${String(index + 1).padStart(4, '0')}`,
    classList: { add: () => {} },
    getBBox: () => ({ x: ball.x - 18, y: ball.y - 18, width: 36, height: 36 }),
  });
  const sockets = [...flat, ...bent].map(socketFor);
  const grid = createBoardGrid({ querySelectorAll: () => sockets }, balls);
  assert.equal(grid.entries.length, 176);
  assert.equal(new Set(grid.entries.map(cell => cell.id)).size, 176);
  assert.equal(grid.sourceIds.size, 352);
  assert.equal(gridHandoffProgress(1000, 1000, 3000, 600), 0);
  assert.equal(gridHandoffProgress(2200, 1000, 3000, 600), 0.5);
  assert.equal(gridHandoffProgress(3400, 1000, 3000, 600), 1);
  for (const cell of grid.entries) {
    assert.equal(cell.rgb.join(','), bent.find(ball => ball.x === cell.bentX && ball.y === cell.bentY)?.rgb.join(','));
  }
});

test('one deterministic band carries the flat field into the authored tunnel', () => {
  assert.equal(BOARD_HANDOFF_PHASES.authoredStart, BOARD_BAND_JOURNEY.authoredStart);
  assert.equal(BOARD_AUTHORED_ENDING_SOURCE_START, BOARD_BAND_JOURNEY.sourceStart);
  assert.equal(smoothBandProgress(-1, 0, 1), 0);
  assert.equal(smoothBandProgress(2, 0, 1), 1);
  assert.equal(smoothBandProgress(.5, 0, 1), .5);

  const halfWidth = 4.8;
  for (const u of [-1, -.5, 0, .5, 1]) {
    const flat = boardBandCrossSection(u, 0, halfWidth);
    assert.ok(Math.abs(flat[0] - u * halfWidth) < 1e-12);
    assert.equal(flat[1], BOARD_BAND_JOURNEY.halfTunnelWidth,
      'the source field must begin as one flat plane');
  }
  const seamStart = boardBandCrossSection(-1, 1, halfWidth);
  const seamEnd = boardBandCrossSection(1, 1, halfWidth);
  assert.ok(Math.hypot(seamStart[0] - seamEnd[0], seamStart[1] - seamEnd[1]) < 1e-12,
    'the folded strip must close at one tunnel floor seam');
  const crown = boardBandCrossSection(0, 1, halfWidth);
  assert.ok(Math.abs(crown[0]) < 1e-12 && crown[1] === BOARD_BAND_JOURNEY.halfTunnelWidth,
    'the middle of the source grid must remain the tunnel ceiling');
  const folded = [-1, -.75, -.5, -.25, 0, .25, .5, .75, 1]
    .map(u => boardBandCrossSection(u, 1, halfWidth));
  assert.ok(new Set(folded.map(point => point.join(','))).size > 4,
    'the closed cross-section must retain walls, floor and ceiling');

  const distances = [0, 32, 88, 110, 140, 180, BOARD_BAND_JOURNEY.length];
  const centres = distances.map(distance => boardBandCentre(distance));
  centres.forEach((centre, index) => {
    assert.equal(centre[2], -distances[index]);
    if (index) assert.ok(centre[2] < centres[index - 1][2],
      'the unified camera path must never reverse its forward travel');
  });
  assert.deepEqual(boardBandCentre(32), [0, 18, -32]);
  assert.ok(centres.some(([x, y]) => Math.abs(x) > .05 && y > 0),
    'the band must develop its authored S-curve before meeting the tunnel');
  assert.ok(centres[1][1] > centres[4][1] && centres[4][1] > centres[5][1],
    'the band must descend the tower wall into the tunnel');
  const end = boardBandCentre(BOARD_BAND_JOURNEY.length);
  assert.ok(Math.abs(end[0]) < 1e-12 && Math.abs(end[1]) < 1e-12,
    'the S-curve must meet the authored rail without a lateral offset');

  const selected = selectBoardTunnelGeometry({ objects: [
    { id: 'a-old-tunnel' }, { id: 'b-climb-gate-1' }, { id: 'b-tunnel-wall' },
    { id: 'approach-platform' }, { id: 'final-wall' },
  ] });
  assert.deepEqual(selected.objects.map(object => object.id), [
    'b-climb-gate-1', 'b-tunnel-wall', 'final-wall',
  ], 'the same scene must continue into the authored tunnel and final station');
});

test('pigment lanes never capture another colour or reuse an occupied cell', () => {
  const cells = [{ id: 'red-near', flatX: 0, flatY: 0, laneIndex: 0 },
    { id: 'blue-near', flatX: 2, flatY: 0, laneIndex: 1 },
    { id: 'blue-far', flatX: 20, flatY: 0, laneIndex: 1 }];
  assert.equal(nearestBoardGridCell({ x: 0, y: 0 }, 1, cells, new Set()).id, 'blue-near');
  assert.equal(nearestBoardGridCell({ x: 0, y: 0 }, 1, cells, new Set(['blue-near'])).id, 'blue-far');
  assert.equal(nearestBoardGridCell({ x: 0, y: 0 }, 1, cells, new Set(['blue-near', 'blue-far'])), null);
});

test('the career timeline fills the former purpose pause and grows before the grid', () => {
  const normal = createQuietIntervals(960);
  const road = createQuietIntervals(960, { 'career-timeline': 600 });
  const expanded = createQuietIntervals(960, { 'career-timeline': 800 });
  assert.ok(normal.intervals.some(interval => interval.id === 'career-timeline'));
  assert.ok(!road.intervals.some(interval => interval.id === 'final-statement'));
  const timeline = road.intervals.find(interval => interval.id === 'career-timeline');
  const experience = road.intervals.find(interval => interval.id === 'working-together');
  assert.equal(timeline.after, 9910, 'the complete ramp module separates clients from job history');
  assert.ok(timeline.top > experience.top + experience.height);
  assert.equal(timeline.height, 800, 'measured copy retains 100px of padding on each side');
  assert.equal(expanded.modules.at(-1).top - road.modules.at(-1).top, 200);
  assert.equal(expanded.modules.at(-2).top, road.modules.at(-2).top,
    'description growth must not move the preceding ramps');
  assert.equal(expanded.modules.at(-1).height, road.modules.at(-1).height,
    'the flat-to-spatial handoff keeps its physical dimensions');
});

test('the ribbon has continuous tangents and visits both sides and below the flight', () => {
  const step = .0001;
  for (const u of [-.75, -.5, -.25, 0, .25, .5, .75]) {
    const a = boardBandCrossSection(u - step, 1, 5);
    const b = boardBandCrossSection(u, 1, 5);
    const c = boardBandCrossSection(u + step, 1, 5);
    const acceleration = Math.hypot(c[0] - 2 * b[0] + a[0], c[1] - 2 * b[1] + a[1]) / step;
    assert.ok(acceleration < .01, 'a gate fold must have no corner impulse');
  }
  const poses = Array.from({ length: 118 }, (_, index) => boardBandRibbonPose(88 + index));
  assert.ok(poses.some(pose => Math.sin(pose.orbit) > .99));
  assert.ok(poses.some(pose => Math.cos(pose.orbit) < -.99));
  assert.ok(poses.some(pose => Math.sin(pose.orbit) < -.99));
  assert.deepEqual(boardBandRibbonPose(32), { orbit: 0, clearance: 2.55, widthScale: 1, camber: 0 });
  assert.ok(poses.every(pose => pose.clearance <= 2.9),
    'the bending road must remain close to the camera');
});

test('the ribbon preserves the original gates and enters with their camera orientation', async () => {
  const geometry = JSON.parse(await readFile(resolve('react-app/app/public/models/about-rollercoaster-world/geometry.json'), 'utf8'));
  const selected = selectBoardTunnelGeometry(geometry);
  const gates = geometry.objects.filter(object => object.id.startsWith('b-'));
  assert.equal(gates.length, 12);
  gates.forEach(gate => {
    const retained = selected.objects.find(object => object.id === gate.id);
    assert.equal(retained, gate, 'authored gate vertices, faces, depth and motion must stay untouched');
    assert.equal(retained.positions.length, 48);
  });
  const entrance = gates.find(object => object.id === 'b-climb-gate-1');
  const frame = boardBandGateFrame(entrance);
  const track = JSON.parse(await readFile(resolve('react-app/app/public/models/about-rollercoaster-world/camera.json'), 'utf8'));
  const station = createRollercoasterCameraPose();
  sampleRollercoasterCamera(track, BOARD_BAND_JOURNEY.sourceStart, station);
  const orientation = new THREE.Quaternion().fromArray(station.quaternion);
  assert.ok(frame.right.dot(new THREE.Vector3(1, 0, 0).applyQuaternion(orientation)) > .95,
    'the gate join must not turn the lanes across the opening');
  assert.ok(frame.up.dot(new THREE.Vector3(0, 1, 0).applyQuaternion(orientation)) > .95,
    'the gate ceiling must stay on the same side as the arriving ribbon');
  assert.ok(Math.abs(frame.halfWidth - 2.55) < .001);
  assert.ok(Math.abs(frame.halfHeight - 2.55) < .001);
});

test('the active finale is a 2D portrait fed by the finite machine inventory', () => {
  assert.match(experienceSource, /createPortraitMap\(source\.portraitMask, inventory\.balls\)/);
  assert.match(experienceSource, /portrait: capture, getRoleAssignments/);
  assert.doesNotMatch(experienceSource, /transferToPortrait|Every piece, in place/);
  assert.match(physicsSource, /portrait\?\.acceptBody\(body, gridCaptureY\)/);
  assert.match(experienceSource, /portraitRenderer\.draw\(\)/);
  assert.doesNotMatch(experienceSource, /createBoardAuthoredEndingScene|createBoardGridHandoffScene|threeCanvasRef/);
});

test('drone flight stays close, retraces its arcs and eases to a stationary final pose', async () => {
  const reuse = {};
  for (let step = 0; step <= 200; step += 1) {
    const progress = step / 200;
    const motion = sampleBoardDroneMotion(progress, false, reuse);
    assert.equal(motion, reuse, 'flight sampling must reuse its bounded scratch state');
    assert.ok(Math.hypot(motion.sway, motion.lift) < .35,
      'camera drift must keep the ribbon within its close flight envelope');
    assert.ok(Math.abs(motion.bank) < .05 && Math.abs(motion.pitch) < .013 && Math.abs(motion.yaw) < .01);
    assert.ok(motion.lookAhead >= 4.4 && motion.lookAhead <= 5.6);
    for (const still of [sampleBoardDroneMotion(progress, true),
      sampleBoardDroneMotion(progress <= BOARD_BAND_JOURNEY.flatEnd ? progress : 1)]) {
      assert.ok(['sway', 'lift', 'bank', 'pitch', 'yaw'].every(key => Math.abs(still[key]) === 0),
        'flat reading, reduced motion and the final station must have no added drift');
    }
  }
  const forward = sampleBoardDroneMotion(.52);
  sampleBoardDroneMotion(.8);
  assert.deepEqual(sampleBoardDroneMotion(.52), forward);
  assert.ok(Math.hypot(forward.sway, forward.lift) > .05, 'the middle of the flight must develop an organic arc');

  const track = JSON.parse(await readFile(resolve('react-app/app/public/models/about-rollercoaster-world/camera.json'), 'utf8'));
  const meta = JSON.parse(await readFile(resolve('react-app/app/public/models/about-rollercoaster-world/meta.json'), 'utf8'));
  const arrival = meta.beats.find(beat => beat.kind === 'ending').start;
  const poseAt = progress => sampleRollercoasterCamera(track,
    boardAuthoredEndingProgress(progress, BOARD_AUTHORED_ENDING_SOURCE_START, arrival));
  const end = poseAt(1);
  assert.deepEqual(end.position, sampleRollercoasterCamera(track, 1).position);
  const epsilon = .00001;
  let previousSpeed = Infinity;
  for (const progress of [.93, .95, .97, .99, .999]) {
    const before = poseAt(progress - epsilon), after = poseAt(progress + epsilon);
    const speed = Math.hypot(...after.position.map((value, axis) => value - before.position[axis])) / (2 * epsilon);
    assert.ok(speed > 0 && speed < previousSpeed, 'the actual camera must keep advancing while smoothly slowing');
    previousSpeed = speed;
  }
  const nearEnd = poseAt(1 - .0001);
  assert.ok(Math.hypot(...end.position.map((value, axis) => value - nearEnd.position[axis])) / .0001 < .001,
    'final camera speed must tend to zero, including the source track ending hold');
  const settled = sampleBoardDroneMotion(1 - .0001);
  assert.ok(['sway', 'lift', 'bank', 'pitch', 'yaw'].every(key => Math.abs(settled[key]) / .0001 < .0001),
    'added drift and banking must ease out without an angular or lateral stop');
});

test('the Three handoff retains a Canvas path when WebGL is unavailable', () => {
  assert.match(handoffSource, /createCanvasHandoffScene\(canvas, entries, palette/,
    'a route-owned fallback must preserve the handoff when WebGL is denied');
  assert.match(handoffSource, /renderer: 'canvas2d-fallback'/,
    'diagnostics must identify the fallback renderer');
  assert.match(handoffSource, /if \(!context\) return createCanvasHandoffScene/,
    'missing WebGL must select the fallback rather than collapse the stage');
});

test('arriving balls are absorbed once and cannot disturb the settled grid', () => {
  assert.match(physicsSource, /const GRID_CAPTURE_Y = 9988/);
  assert.match(physicsSource, /claimedGridCells\.add\(target\.id\)/,
    'each receptacle must accept at most one incoming rigid body');
  assert.doesNotMatch(physicsSource, /claimedGridCells\.delete/,
    'a filled receptacle must stay claimed');
  assert.match(physicsSource, /body\.collisionFilter\.mask = 0/,
    'captured balls must leave the collision world before the suction animation');
  assert.match(physicsSource, /body\.isSensor = true/);
  assert.match(physicsSource, /Body\.setStatic\(body, true\)/);
  assert.match(physicsSource, /body\.plugin\.boardRenderScale/);
  assert.match(physicsSource, /Composite\.remove\(engine\.world, body\)/,
    'absorbed bodies must be retired instead of accumulating below the seam');
  assert.match(rendererSource, /body\.plugin\?\.boardRenderScale/,
    'the suction scale must be rendered without changing physical radius');
});

test('socket lips stay smaller than Home balls, independent of old authored socket size', () => {
  for (const scale of [.3, 1, 2]) {
    const cell = { radius: 13, flatSocketRadius: 90 };
    const socket = boardSocketMetrics(cell, scale);
    const ball = resolveBoardBallRadius(cell.radius, scale);
    assert.ok(socket.outerRadius < ball);
    assert.ok(socket.outerRadius - socket.holeRadius < ball * .11);
    assert.ok(socket.holeOffsetY + socket.holeRadius < socket.outerRadius);
  }
});

test('grid suction has continuous endpoints and gives distant cells more travel time', () => {
  const capture = { startX: 100, startY: 100, target: { flatX: 200, flatY: 300 } };
  const out = {};
  assert.deepEqual(sampleBoardGridCapture(capture, 0, 10, out), { x: 100, y: 100 });
  assert.deepEqual(sampleBoardGridCapture(capture, 1, 10, out), { x: 200, y: 300 });
  const nearStart = { ...sampleBoardGridCapture(capture, .001, 10, out) };
  const nearEnd = sampleBoardGridCapture(capture, .999, 10, out);
  assert.ok(Math.hypot(nearStart.x - 100, nearStart.y - 100) < .002);
  assert.ok(Math.hypot(nearEnd.x - 200, nearEnd.y - 300) < .002);
  const distant = { ...capture, target: { flatX: 200, flatY: 1100 } };
  assert.ok(boardGridCaptureDuration(distant, 10) > boardGridCaptureDuration(capture, 10));
  assert.ok(boardGridCaptureDuration(distant, 10) <= 1800);
  assert.equal(sampleBoardGridCapture(capture, .5, 10, out), out, 'reuse the position scratch object');
});

test('responsive geometry keeps visual and physical coordinates identical', () => {
  for (const compact of [false, true]) {
    const layout = createBoardLayout(compact);
    assert.equal(layout.sceneHeight, GRID_START_Y + BOARD_PORTRAIT_CHUTE_HEIGHT);
    for (const y of [0, 80, 625, 1124, 1412, 4397, 10070, 14140]) {
      assert.equal(layout.mapY(y), y);
      assert.equal(layout.inverseY(y), y);
    }
  }
});

test('the straight reservoir is one viewport tall without stretching the funnel or balls', () => {
  for (const [boardWidth, viewportHeight] of [[300, 740], [370, 844], [1412, 1000], [816, 390]]) {
    const layout = createBoardLayout(boardWidth < 640, { boardWidth, viewportHeight });
    assert.ok(Math.abs(layout.mapY(825) * boardWidth / 960 - viewportHeight) < 1e-8);
    assert.ok(Math.abs(layout.mapY(1124) - layout.mapY(825) - 299) < 1e-8,
      'funnel height must not stretch');
    for (const y of [825, 1124, 4400, 11140]) {
      assert.ok(Math.abs(layout.inverseY(layout.mapY(y)) - y) < 1e-8);
    }
  }
});

test('scroll-owned valves retrace the same pose in both directions and hold without time', () => {
  const down = [220, 310, 400, 490, 580].map(scroll => boardMechanismProgress(1000, scroll, 1000));
  const up = [580, 490, 400, 310, 220].map(scroll => boardMechanismProgress(1000, scroll, 1000));
  down.forEach((value, index) => assert.ok(Math.abs(value - index / 4) < 1e-8));
  assert.deepEqual(up, down.toReversed());
  assert.ok(Math.abs(boardMechanismProgress(1000, 400, 1000) - .5) < 1e-8);
  assert.equal(boardMechanismProgress(1000, 5000, 0), 0);
  assert.ok(boardValveSweepSteps(120, 10) > 1, 'fast scrubs must sweep through contact solves');
  assert.equal(boardValveSweepSteps(1e9, 10), 64, 'collision work must remain bounded');
});

test('a held kinematic support has no conveyor motion at its resting contact', () => {
  const { Bodies, Body, Composite, Engine } = Matter;
  const engine = Engine.create({ positionIterations: 12 });
  const floor = Bodies.rectangle(0, 10, 240, 20, { isStatic: true, friction: 1 });
  const ball = Bodies.circle(0, -10, 10, { friction: 1, restitution: 0 });
  Composite.add(engine.world, [floor, ball]);
  Body.setPosition(floor, { x: 4, y: 10 }, true);
  assert.ok(floor.velocity.x > 0, 'the move must produce real contact velocity');
  for (let step = 0; step < 120; step += 1) {
    stopBoardKinematicBody(floor);
    Engine.update(engine, 1000 / 120);
  }
  assert.ok(Math.abs(ball.position.x) < .01, 'a stopped valve must not drag its resting ball');
  Body.setAngle(floor, .1, true);
  stopBoardKinematicBody(floor);
  assert.equal(floor.anglePrev, floor.angle);
  assert.equal(floor.angularVelocity, 0);
  Engine.clear(engine);
});

test('extra collision steps do not amplify a powered motor contact', () => {
  const { Bodies, Body, Composite, Engine } = Matter;
  for (const motion of ['translation', 'rotation']) {
    const speeds = [1, 64].map(microSteps => {
      const engine = Engine.create({ positionIterations: 12, velocityIterations: 8 });
      const motor = Bodies.rectangle(0, 100, 200, 20, { isStatic: true, restitution: 0 });
      const ball = Bodies.circle(40, 80, 10, { restitution: 0, frictionAir: 0 });
      Composite.add(engine.world, [motor, ball]);
      if (motion === 'translation') Body.setPosition(motor, { x: 0, y: 99 }, true);
      else Body.setAngle(motor, -.01, true);
      stepBoardWorld(engine, [ball], 1000 / 120, [motor], microSteps);
      const speed = ball.speed;
      Engine.clear(engine);
      return speed;
    });
    assert.ok(speeds[0] > .1, `${motion} must still transfer a real motor impulse`);
    assert.ok(Math.abs(speeds[1] - speeds[0]) < .25,
      `${motion} impulse must not grow with the microstep count: ${speeds}`);
  }
});

test('switching timestep during pile release cannot turn cached pressure into a launch', () => {
  const { Bodies, Body, Composite, Engine } = Matter;
  const engine = Engine.create({ positionIterations: 12, velocityIterations: 8 });
  const floor = Bodies.rectangle(0, 200, 230, 20, { isStatic: true });
  const fixtures = [floor,
    Bodies.rectangle(-110, 0, 20, 400, { isStatic: true }),
    Bodies.rectangle(110, 0, 20, 400, { isStatic: true })];
  const balls = [];
  for (let row = 0; row < 12; row += 1) for (let col = 0; col < 18; col += 1) {
    balls.push(Bodies.circle(-90 + col * 10.1 + (row % 2) * 2, 184 - row * 9, 5,
      { restitution: .1, friction: .08, frictionAir: .01 }));
  }
  Composite.add(engine.world, [...fixtures, ...balls]);
  const dt = 1000 / 120;
  for (let step = 0; step < 600; step += 1) stepBoardWorld(engine, balls, dt, fixtures);
  const initialTop = Math.min(...balls.map(ball => ball.position.y));
  Body.setPosition(floor, { x: 500, y: 200 });
  // No motor velocity: only remove support, enter tiny collision steps and
  // return to the normal cadence. All particles should fall under gravity.
  for (let step = 0; step < 124; step += 1) {
    stepBoardWorld(engine, balls, step < 64 ? dt / 64 : dt, fixtures);
    assert.ok(balls.every(ball => ball.speed < 12 && ball.position.y > initialTop - 5),
      'cached contact forces must not eject a resting pile when the timestep changes');
  }
  Engine.clear(engine);
});

test('quiet intervals keep static text and retain the independent progress indicator', () => {
  const presentation = boardTextPresentationFromRuntimeConfig(designSystem.runtime);
  assert.deepEqual(presentation, {
    faintOpacity: 0.1,
    focusOpacity: 1,
    drawViewport: 0.3,
  });
  assert.equal(boardTextDrawProgressAtViewportRatio(1.1, presentation), 0);
  assert.ok(Math.abs(boardTextDrawProgressAtViewportRatio(0.85, presentation) - 0.5) < 1e-12);
  assert.equal(boardTextDrawProgressAtViewportRatio(0.7, presentation), 1);
  assert.equal(boardTextDrawProgressAtViewportRatio(-0.1, presentation), 1);
  assert.match(experienceSource, /querySelectorAll\('\[data-about-scroll-text\]'\)/,
    'every marked text group must share the same scroll sampler');
  assert.doesNotMatch(experienceSource, /createBoardTextDrawLayers/,
    'reading text must not allocate or animate reveal masks');
  assert.doesNotMatch(routeCss, /text-faint-opacity/,
    'narrative text must remain fully readable in both themes');
  assert.match(routeCss, /transform: scaleY\(var\(--about-board-progress\)\)/,
    'the progress channel must fill downwards from the top');
  assert.doesNotMatch(experienceSource, /about-board-scroll-indicator__ball/,
    'the progress bar must not include a separate handle');
  assert.match(routeCss, /prefers-reduced-motion: reduce/,
    'the progress treatment must retain a static reduced-motion state');
});

test('the opening permits readable reflow with a single progress indicator', () => {
  assert.doesNotMatch(routeCss, /--about-board-intro-height/);
  assert.match(routeCss, /\.about-board-intro[\s\S]*?min-height: 60cqh/);
  assert.match(experienceSource, /settledOpening\.surfaceY - inventory\.radius - layout\.reservoirTop/,
    'the prepared pile must meet the bottom of the intro');
  assert.doesNotMatch(experienceSource, /inventory\.surfaceY - layout\.reservoirTop/,
    'settling balls must not shift the intro or editorial layout');
  assert.doesNotMatch(experienceSource, /about-board-entry-cue|about-board-scroll-arrow|Follow me/);
  assert.doesNotMatch(experienceSource, /const physics = reducedMotion \? null/);
});

test('quiet intervals translate complete mechanisms without scaling collisions or the 3D seam', () => {
  for (const boardWidth of [300, 370, 820, 1412]) {
    const placement = createQuietIntervals(boardWidth, { disciplines: 800, 'working-together': 700 });
    const { placeY, placePoint, intervals } = placement;
    assert.equal(placeY(1124), 1124, 'the reservoir and outlet must remain unchanged');
    for (const [top, bottom] of [[1377, 1667], [1767, 2200], [2535, 3160], [3330, 3765],
      [4988, 5170], [6333, 7846], [7920, 8779], [9365, 9890], [10030, 11140]]) {
      assert.ok(Math.abs(placeY(bottom) - placeY(top) - (bottom - top)) < 1e-8,
        `mechanism ${top}–${bottom} must move rigidly at width ${boardWidth}`);
    }
    for (const interval of intervals) {
      assert.ok(interval.textY > interval.top);
      assert.ok(interval.textY < interval.top + interval.height);
    }
    assert.deepEqual(placePoint([715, 2940]), [715, placeY(2940)]);
    const layout = createBoardLayout(boardWidth < 900,
      { boardWidth, viewportHeight: 844, quietHeights: {} });
    assert.equal(layout.sceneHeight, layout.placeY(GRID_START_Y) - layout.reservoirTop + BOARD_PORTRAIT_CHUTE_HEIGHT);
    assert.ok(Math.abs(layout.mapY(layout.placeY(11140))
      - layout.mapY(layout.placeY(10030)) - 1110) < 1e-8,
    'only placement may change; the 2D/3D field keeps its exact height');
  }
});

test('the uninterrupted machine keeps compact joins when editorial content grows', () => {
  for (const boardWidth of [300, 370, 820, 1412]) {
    const heights = { disciplines: 700, 'working-together': 600, 'career-timeline': 80 };
    const before = createQuietIntervals(boardWidth, heights);
    const after = createQuietIntervals(boardWidth, { ...heights, disciplines: 850 });
    const added = 150 * 960 / boardWidth;
    assert.equal(after.placeY(1667), before.placeY(1667), 'the preceding garden stays in place');
    for (const y of [2528, 3308, 3330, 4459, 4988, 6180, 6333, 7846, 7937, 8779, 11140]) {
      assert.ok(Math.abs(after.placeY(y) - before.placeY(y) - added) < 1e-8,
        'copy growth must move every subsequent mechanism and the handoff together');
    }
    for (const [index, clearance] of [[0, 157.8889], [3, 114.3203]]) {
      for (const layout of [before, after]) {
        const current = layout.modules[index], next = layout.modules[index + 1];
        assert.ok(Math.abs(next.top - current.top - current.height - clearance) < 1e-8,
          'measured text must preserve the authored mechanical joins');
      }
    }
    for (const interval of before.intervals) {
      const previous = before.modules.find(module => module.sourceEnd === interval.after);
      const next = before.modules.find(module => module.sourceTop === interval.before);
      assert.ok(Math.abs(previous.top + previous.height - interval.top) < 1e-8);
      assert.ok(Math.abs(interval.top + interval.height - next.top) < 1e-8);
    }
    assert.deepEqual(before.intervals.map(interval => interval.id),
      ['garden-ideas', 'disciplines', 'practice', 'making', 'working-together', 'career-timeline']);
  }
});


test('the integrated assembly releases a loaded batch through both wheels', async () => {
  await loadBoardRigidBodyBackend();
  for (const radius of [6.66, 20.32, 25.06]) {
    const geometry = createBoardAssemblyGeometry(radius > 10 ? 25.06 : radius);
    const drums = createBoardDrumPhysics({ geometry });
    const fixtures = [...drums.fixedBodies, ...drums.carrierBodies,
      Matter.Bodies.rectangle(-25, 900, 50, 3000, { isStatic: true }),
      Matter.Bodies.rectangle(985, 900, 50, 3000, { isStatic: true })];
    const balls = Array.from({ length: 96 }, (_, index) => Matter.Bodies.circle(
      480 + (index % 8 - 3.5) * radius * 2.12 + (Math.floor(index / 8) % 2) * radius * .12,
      -180 - Math.floor(index / 8) * radius * 2.12, radius,
      { ...matterBallMaterial(), friction: 0, frictionStatic: 0, restitution: 0,
        plugin: { boardId: 'assembly-batch-' + index } }));
    const engine = Matter.Engine.create({ enableSleeping: true });
    Matter.Composite.add(engine.world, [...fixtures, ...balls]);
    const adapter = createBoardRigidBodyWorld({ engine, balls, fixtures,
      movingFixtures: drums.carrierBodies });
    const settledIds = new Set();
    const peakLoads = drums.specs.map(() => 0);
    try {
      for (let step = 0; step < 5400 && balls.length; step += 1) {
        const time = (step + 1) * adapter.fixedStepMs;
        drums.update(time);
        adapter.step(adapter.fixedStepMs);
        if (step % 12 === 0) for (const [index, wheel] of drums.specs.entries()) {
          const inWheel = balls.filter(ball => Math.hypot(ball.position.x - wheel.casingCentre[0],
            ball.position.y - wheel.casingCentre[1]) < wheel.casingRadius - radius);
          peakLoads[index] = Math.max(peakLoads[index], inWheel.length);
        }
        for (let index = balls.length - 1; index >= 0; index -= 1) {
          const ball = balls[index];
          if (ball.position.y <= geometry.height) continue;
          assert.ok(ball.position.x > 240 && ball.position.x < 720, 'the batch exits through the channel');
          settledIds.add(ball.plugin.boardId);
          Matter.Composite.remove(engine.world, ball);
          balls.splice(index, 1);
        }
      }
      assert.equal(settledIds.size, 96, 'all identities drain at radius ' + radius
        + ': ' + JSON.stringify(balls.map(ball => [ball.plugin.boardId, ball.position, ball.velocity])));
      assert.ok(peakLoads.every(count => count >= 2), 'both wheels carry a loose batch');
    } finally {
      adapter.dispose();
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
    }
  }
});

test('opposing fast balls collide even between architecture fixtures', () => {
  const engine = Matter.Engine.create({ positionIterations: 12, velocityIterations: 8 });
  const a = Matter.Bodies.circle(0, 0, 10);
  const b = Matter.Bodies.circle(100, 0, 10);
  Matter.Body.setVelocity(a, { x: 120, y: 0 });
  Matter.Body.setVelocity(b, { x: -120, y: 0 });
  Matter.Composite.add(engine.world, [a, b]);
  assert.ok(stepBoardWorld(engine, [a, b], BOARD_WORLD_PHYSICS.fixedStepMs, []) > 1);
  assert.ok(a.position.x < b.position.x, 'balls cannot pass through each other');
  assert.ok(a.velocity.x < 0 && b.velocity.x > 0);
  Matter.Engine.clear(engine);
});

test('surface batches preserve every point and contain complete authored rotation', () => {
  const points = new Float32Array(1500 * 6);
  for (let index = 0; index < 1500; index += 1) {
    points.set([10 + index % 30, Math.floor(index / 30), -20, .1, index % 6, 0], index * 6);
  }
  const group = { kind: 'rotate', axis: [0, 1, 0], pivot: [0, 0, -20],
    continuous: true, amplitude: 1, phase: 0, period: 4 };
  const batches = createRollercoasterSurfaceBatches(points,
    { objectRanges: [{ id: 'test', start: 0, end: 1500, motionGroup: 0 }] }, [group], null,
    values => { const geometry = new THREE.BufferGeometry(); geometry.userData.points = values; return geometry; });
  batches.setPadding(.5);
  assert.equal(batches.count, 2, 'each GPU batch has a bounded population');
  assert.equal(batches.root.children.reduce((sum, mesh) => sum + mesh.geometry.userData.points.length / 6, 0), 1500);
  for (const mesh of batches.root.children) {
    assert.equal(mesh.frustumCulled, true);
    const values = mesh.geometry.userData.points;
    for (let index = 0; index < values.length; index += 6) for (const time of [0, 1, 2, 3]) {
      const position = sampleRollercoasterMotion(values.subarray(index, index + 3), group, time);
      assert.ok(mesh.geometry.boundingSphere.containsPoint(new THREE.Vector3(...position)));
    }
  }
  batches.dispose();
  assert.equal(batches.root.children.length, 0);
});

test('both nine-column gardens retain phone-sized collision clearance', () => {
  for (const width of [300, 340, 370, 1412]) {
    const radius = resolveBoardBallRadius(13, resolveBoardBallRadiusScale({},
      { boardWidth: width, isMobileDevice: width < 760 }));
    for (const garden of [BOARD_GARDEN.top, BOARD_GARDEN.lower]) {
      assert.equal(garden.columns.length, 9);
      const spacing = Math.min(...garden.columns.slice(1).map((x, i) => x - garden.columns[i]));
      const fixture = resolveFieldBumperRadius(BOARD_GARDEN.radius, spacing, radius);
      assert.ok(spacing - fixture * 2 >= radius * 2.2 - 1e-8);
      if (width >= 370) assert.equal(fixture, BOARD_GARDEN.radius);
    }
  }
  assert.equal(BOARD_GARDEN.top.rows.length, 5);
  assert.equal(BOARD_GARDEN.lower.rows.length, 4);
});
