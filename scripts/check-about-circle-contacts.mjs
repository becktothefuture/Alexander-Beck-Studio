import assert from 'node:assert/strict';
import { createBoardCircleContactGuard } from '../react-app/app/src/routes/about-game-board/boardCircleContacts.js';

function circle(x, y, radius = 5, inverseMass = 1, active = true) {
  return { x, y, radius, inverseMass, vx: 0, vy: 0, active, changed: false };
}

function kineticEnergy(circles) {
  return circles.reduce((total, item) => {
    if (item.inverseMass <= 0) return total;
    return total + (item.vx * item.vx + item.vy * item.vy) / (2 * item.inverseMass);
  }, 0);
}

function maximumOverlap(circles) {
  let deepest = 0;
  for (let first = 0; first < circles.length; first += 1) {
    for (let second = first + 1; second < circles.length; second += 1) {
      const a = circles[first];
      const b = circles[second];
      deepest = Math.max(deepest, a.radius + b.radius
        - Math.hypot(b.x - a.x, b.y - a.y));
    }
  }
  return deepest;
}

// Positional correction follows inverse mass, so a lighter ball moves farther
// while the pair reaches the exact visible-circle separation.
{
  const guard = createBoardCircleContactGuard({ passes: 2, tolerance: 0 });
  const heavy = circle(0, 0, 5, 0.25);
  const light = circle(8, 0, 5, 1);
  const diagnostics = guard.solve([heavy, light]);
  assert.ok(Math.abs(heavy.x + 0.4) < 1e-9);
  assert.ok(Math.abs(light.x - 9.6) < 1e-9);
  assert.ok(Math.abs(light.x - heavy.x - 10) < 1e-9);
  assert.equal(diagnostics.changedCircles, 2);
}

// A dense released pile converges without testing every possible pair. The
// fixture half-space keeps its bottom row above the authored floor.
{
  const columns = 28;
  const rows = 18;
  const circles = [];
  const fixtureConstraints = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = circles.length;
      circles.push(circle(column * 2 + (row % 2), -row * 1.65, 1));
      if (row === 0) fixtureConstraints.push({ circleIndex: index, nx: 0, ny: -1, offset: 0 });
    }
  }
  const guard = createBoardCircleContactGuard({ passes: 12, tolerance: 0.002 });
  const before = maximumOverlap(circles);
  const diagnostics = guard.solve(circles, fixtureConstraints);
  const after = maximumOverlap(circles);
  assert.ok(after <= 0.0021, `dense-pile overlap ${after} must reach guard tolerance`);
  assert.ok(after < before * 0.05, `dense-pile overlap ${after} must reduce from ${before}`);
  assert.ok(diagnostics.pairsTested < circles.length * circles.length * 0.2,
    'the spatial index must stay well below an all-pairs scan');
  assert.ok(circles.every(item => item.y <= 0.0020001));
}

// Sleeping neighbours remain candidates. An active correction wakes only the
// contacted chain instead of stopping at the first sleeping circle.
{
  const circles = [circle(0, 0), circle(8, 0), circle(18, 0, 5, 1, false)];
  const diagnostics = createBoardCircleContactGuard({ passes: 12, tolerance: 0.03 })
    .solve(circles);
  assert.ok(maximumOverlap(circles) <= 0.030001);
  assert.equal(circles[2].changed, true);
  assert.equal(diagnostics.changedCircles, 3);
}

// Candidate buffers grow through several capacities without discarding pairs
// collected before the resize.
{
  const circles = [];
  for (let pair = 0; pair < 40; pair += 1) {
    circles.push(circle(pair * 10, 0, 1), circle(pair * 10 + 1.9, 0, 1));
  }
  createBoardCircleContactGuard({ passes: 2, tolerance: 0.002 }).solve(circles);
  for (let index = 0; index < circles.length; index += 2) {
    assert.ok(Math.hypot(circles[index + 1].x - circles[index].x,
      circles[index + 1].y - circles[index].y) >= 1.9979);
  }
}

// Production-scale coverage: the dense numeric grid must keep 5,000 circles
// well below an all-pairs scan while retaining a near-tangent grounded stack.
{
  const columns = 100;
  const rows = 50;
  const circles = [];
  const fixtureConstraints = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = circles.length;
      circles.push(circle(column * 2 + (row % 2), -row * 1.72, 1));
      circles[index].vy = 1;
      if (row === 0) fixtureConstraints.push({
        circleIndex: index, nx: 0, ny: -1, offset: 0,
      });
    }
  }
  const started = performance.now();
  const diagnostics = createBoardCircleContactGuard({ passes: 8, tolerance: 0.002 })
    .solve(circles, fixtureConstraints);
  const elapsed = performance.now() - started;
  assert.ok(diagnostics.remainingPenetration <= 0.0025);
  assert.ok(diagnostics.pairsTested < circles.length * circles.length * 0.02);
  assert.ok(elapsed < 150, `5,000-circle guard took ${elapsed.toFixed(1)}ms`);
}

// Zero-restitution velocity correction removes only approaching normal speed.
// It must not create kinetic energy or disturb tangential velocity.
{
  const guard = createBoardCircleContactGuard({ passes: 2, tolerance: 0 });
  const first = circle(0, 0);
  const second = circle(9, 0);
  first.vx = 3;
  first.vy = 2;
  second.vx = -1;
  second.vy = -4;
  const before = kineticEnergy([first, second]);
  guard.solve([first, second]);
  const after = kineticEnergy([first, second]);
  assert.ok(after <= before + 1e-9);
  assert.ok(Math.abs(first.vy - 2) < 1e-9 && Math.abs(second.vy + 4) < 1e-9);
  assert.ok(second.vx - first.vx >= -1e-9);
}

// A grounded support controls positional ordering, not collision mass. A lower
// ball moving into the ball above must share its normal momentum instead of
// copying its speed into the supported ball and doubling kinetic energy.
{
  const lower = circle(0, 0);
  const upper = circle(0, -9);
  lower.vy = -10;
  const beforeMomentum = lower.vy + upper.vy;
  const beforeEnergy = kineticEnergy([lower, upper]);
  createBoardCircleContactGuard({ passes: 2, tolerance: 0 }).solve(
    [lower, upper],
    [{ circleIndex: 0, nx: 0, ny: -1, offset: 0 }],
  );
  assert.ok(Math.abs(lower.vy + upper.vy - beforeMomentum) < 1e-9,
    'a support contact must conserve the two-ball normal momentum');
  assert.ok(kineticEnergy([lower, upper]) <= beforeEnergy + 1e-9,
    'a support contact must not add kinetic energy');
  assert.ok(Math.abs(lower.vy + 5) < 1e-9 && Math.abs(upper.vy + 5) < 1e-9,
    'equal masses with zero restitution must leave at their shared normal speed');
}

// A sleeping tangent pack remains bit-for-bit unchanged. The caller can pass
// all circles and let `active` exclude validated sleepers without a side path.
{
  const circles = [circle(0, 0, 5, 1, false), circle(10, 0, 5, 1, false)];
  const before = JSON.stringify(circles);
  const diagnostics = createBoardCircleContactGuard().solve(circles);
  assert.equal(JSON.stringify(circles), before);
  assert.equal(diagnostics.activeCircles, 0);
  assert.equal(diagnostics.changedCircles, 0);
}

// A fixture constraint corrects its circle to the allowed half-space and
// removes only the velocity aimed back into the fixture.
{
  const item = circle(2, -3);
  item.vx = 4;
  item.vy = -6;
  const guard = createBoardCircleContactGuard({ passes: 2, tolerance: 0.01 });
  const diagnostics = guard.solve([item], [
    { circleIndex: 0, nx: 0, ny: 1, offset: 0 },
  ]);
  assert.ok(item.y >= -0.0100001);
  assert.equal(item.vx, 4);
  assert.equal(item.vy, 0);
  assert.equal(diagnostics.fixtureCorrections, 1);
  assert.equal(item.changed, true);
}

// Pair separation and a nearby static boundary converge together; satisfying
// the final circle pair must not silently put its neighbour through the wall.
{
  const first = circle(0, 0);
  const second = circle(8, 0);
  const guard = createBoardCircleContactGuard({ passes: 12, tolerance: 0.01 });
  const diagnostics = guard.solve([first, second], [
    { circleIndex: 1, nx: -1, ny: 0, offset: -9.97 },
  ]);
  assert.ok(maximumOverlap([first, second]) <= 0.010001);
  assert.ok(-second.x >= -9.980001);
  assert.ok(diagnostics.remainingPenetration <= 0.010001);
}

// Repeated stable passes may share the grid. A new solve must still rebuild
// when the caller moves, replaces or resizes a circle at the same array index.
{
  const guard = createBoardCircleContactGuard({ passes: 12, tolerance: 0.01 });
  const circles = [circle(-12, -20), circle(12, -20)];
  const stable = guard.solve(circles);
  assert.ok(stable.gridReuses > 0, 'unchanged contact order should reuse its grid');
  circles[1] = circle(-4, -20);
  guard.solve(circles);
  assert.ok(maximumOverlap(circles) <= 0.010001,
    'same-length replacement across negative grid cells must be detected');
  circles[0].radius = 7;
  circles[0].x = circles[1].x + 5;
  circles[0].y = circles[1].y + 1;
  guard.solve(circles);
  assert.ok(maximumOverlap(circles) <= 0.010001,
    'radius and gravity-order changes must not reuse a stale neighbour list');
  guard.reset();
  assert.ok(guard.solve(circles).gridBuilds >= 1);
}

// A correction can cross a cell boundary during one solve. Later passes
// must rebuild their candidate grid before continuing contact correction.
{
  const circles = [circle(0.1, 4, 1), circle(1.6, 4, 1)];
  const diagnostics = createBoardCircleContactGuard({ passes: 12, tolerance: 0.01 })
    .solve(circles);
  assert.ok(circles[0].x < 0, 'the contact must cross into the negative cell');
  assert.ok(diagnostics.gridBuilds >= 2, 'within-solve cell movement must invalidate the grid');
  assert.ok(maximumOverlap(circles) <= 0.010001);
}

// These three circles remain in one large cell, but a contact pushes the
// second circle below its initially equal-height neighbour. Reusing the old
// linked order would change the bottom-to-top traversal of later passes.
{
  const circles = [circle(30, 30), circle(39, 30), circle(39, 21)];
  const diagnostics = createBoardCircleContactGuard({ passes: 12, tolerance: 0.01, cellSize: 100 })
    .solve(circles);
  assert.ok(circles[1].y > circles[0].y);
  assert.ok(circles.every(item => Math.floor(item.x / 100) === 0 && Math.floor(item.y / 100) === 0));
  assert.ok(diagnostics.gridBuilds >= 2, 'gravity-order changes alone must invalidate the grid');
  assert.ok(maximumOverlap(circles) <= 0.010001);
}

console.log('About exact circle contact guard checks passed.');
