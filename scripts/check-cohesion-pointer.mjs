import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCohesionPointer, resetCohesionPointer, updateCohesionPointer,
  finishCohesionPointerStep, resolveCohesionPushSpeed,
} from '../react-app/app/src/legacy/modules/modes/cohesion-pointer.js';

const sample = (extra = {}) => ({ x: 100, y: 100, inBounds: true, pointerType: 'mouse',
  pointerId: 1, time: 100, sequence: 1, active: false, ...extra });

test('hover pushes without a button; first entry and re-entry have no stale velocity or sweep', () => {
  const p = createCohesionPointer();
  updateCohesionPointer(p, 'move', sample());
  assert.equal(p.active, true);
  assert.equal(p.vx, 0);
  assert.equal(p.fromX, p.x);
  updateCohesionPointer(p, 'move', sample({ x: 200, time: 120 }));
  assert.ok(p.vx > 0);
  assert.equal(p.fromX, 100);
  finishCohesionPointerStep(p, 1 / 60);
  assert.equal(p.fromX, p.x);
  updateCohesionPointer(p, 'cancel', sample({ inBounds: false }));
  assert.equal(p.active, false);
  updateCohesionPointer(p, 'move', sample({ x: 900, sequence: 2, time: 150 }));
  assert.equal(p.vx, 0);
  assert.equal(p.fromX, 900);
});

test('touch requires a down and never transfers ownership to another finger or compatibility mouse', () => {
  const p = createCohesionPointer();
  const touch = sample({ pointerType: 'touch', pointerId: 4, active: true });
  updateCohesionPointer(p, 'move', touch);
  assert.equal(p.active, false);
  updateCohesionPointer(p, 'down', touch);
  updateCohesionPointer(p, 'down', { ...touch, pointerId: 5, x: 600 });
  updateCohesionPointer(p, 'move', { ...touch, pointerType: 'mouse', x: 600 });
  updateCohesionPointer(p, 'cancel', { ...touch, pointerId: 5, inBounds: false });
  assert.equal(p.active, true);
  assert.equal(p.pointerId, 4);
  assert.equal(p.x, 100);
  updateCohesionPointer(p, 'move', { ...touch, x: 160, time: 120 });
  assert.ok(p.vx > 0);
  updateCohesionPointer(p, 'up', { ...touch, active: false });
  assert.equal(p.active, false);
  assert.equal(p.vx, 0);
  updateCohesionPointer(p, 'move', { ...touch, x: 300, active: false });
  assert.equal(p.active, false);
  updateCohesionPointer(p, 'down', { ...touch, pointerId: 5, x: 600 });
  assert.equal(p.fromX, 600);
  assert.equal(p.vx, 0);
});

test('cancel, loss of contact, and geometry reset clear touch without a release impulse', () => {
  for (const stop of ['cancel', 'inactive', 'outside', 'resize']) {
    const p = createCohesionPointer();
    const touch = sample({ pointerType: 'touch', active: true });
    updateCohesionPointer(p, 'down', touch);
    updateCohesionPointer(p, 'move', { ...touch, x: 200, time: 120 });
    if (stop === 'resize') resetCohesionPointer(p);
    else updateCohesionPointer(p, stop === 'cancel' ? 'cancel' : 'move', {
      ...touch, active: stop !== 'inactive', inBounds: stop !== 'outside',
    });
    assert.equal(p.active, false, stop);
    assert.equal(p.vx, 0, stop);
  }
});

test('stationary velocity decays, fast swipes stay bounded, and forces cannot attract', () => {
  const p = createCohesionPointer();
  p.vx = 1000;
  for (let frame = 0; frame < 60; frame++) finishCohesionPointerStep(p, 1 / 60);
  assert.ok(p.vx < 0.001);
  for (const dt of [1 / 120, 1 / 60, 1 / 30]) {
    assert.equal(resolveCohesionPushSpeed(0, 1000, 2.1, 1.25, dt), 0);
    assert.equal(resolveCohesionPushSpeed(1, 1000, 0, 1.25, dt), 0);
    const away = resolveCohesionPushSpeed(1, -1000, 2.1, 1.25, dt);
    const still = resolveCohesionPushSpeed(1, 0, 2.1, 1.25, dt);
    assert.equal(away, still);
    assert.ok(away > 0);
    assert.ok(resolveCohesionPushSpeed(1, 1e9, 3, 3, dt) <= 1500 * dt);
    assert.equal(still / dt, 420 * 2.1);
  }
});

test('aspect-ratio changes preserve the body shape and scale links with bead size', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL(
    '../react-app/app/src/legacy/modules/modes/flubber-blob.js', import.meta.url,
  ), 'utf8');
  const resizeSource = source.slice(source.indexOf('function resizeBlobIfNeeded()'), source.indexOf('function handlePointer('));
  const balls = [
    { x: 90, y: 190, vx: 10, vy: 20 },
    { x: 110, y: 210, vx: 10, vy: 20 },
  ];
  const g = { canvas: { width: 800, height: 400 }, R_MED: 20, balls };
  const blob = { count: 2, bodyCount: 1, ballRadius: 10, spawnRadius: 40, lastW: 400, lastH: 800, linkCount: 1 };
  const pointer = createCohesionPointer();
  updateCohesionPointer(pointer, 'move', sample());
  const spawnX = [-10, 10], spawnY = [-10, 10], rest = [20], baseRest = [20];
  const runResize = new Function('getGlobals', 'blob', 'cohesionPointer', 'resetCohesionPointer',
    'getBodyStats', 'bodyStarts', 'bodyCounts', 'spawnX', 'spawnY', 'gelLinkRest', 'gelLinkBaseRest',
    `${resizeSource}\nresizeBlobIfNeeded();`);
  runResize(() => g, blob, pointer, resetCohesionPointer, () => ({ x: 100, y: 200 }),
    [0], [2], spawnX, spawnY, rest, baseRest);
  assert.deepEqual(balls.map(({ x, y }) => [x, y]), [[180, 80], [220, 120]]);
  assert.deepEqual(spawnX, [-20, 20]);
  assert.deepEqual(spawnY, [-20, 20]);
  assert.deepEqual(rest, [40]);
  assert.deepEqual(baseRest, [40]);
  assert.equal(blob.ballRadius, 20);
  assert.equal(blob.spawnRadius, 80);
  assert.equal(pointer.active, false);
});
