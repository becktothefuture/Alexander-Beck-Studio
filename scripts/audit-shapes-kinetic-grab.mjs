#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'shapes-kinetic-grab');
const baseUrl = String(process.env.ABS_SHAPES_URL || process.env.ABS_DEV_URL || 'http://localhost:8012').replace(/\/+$/, '');
const waitMs = Number(process.env.ABS_SHAPES_WAIT_MS || 30000);

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function shapesUrl() {
  const url = new URL(/\.html$/i.test(baseUrl) ? baseUrl : `${baseUrl}/index.html`);
  url.searchParams.set('mode', 'shapes');
  url.searchParams.set('absAudit', '1');
  return url.toString();
}

async function gotoShapes(page) {
  await page.goto(shapesUrl(), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#c', { state: 'attached', timeout: waitMs });
  await page.waitForFunction(() => {
    const audit = window.__ABS_HOME_AUDIT__;
    const globals = audit?.getGlobals?.();
    return audit?.getRuntimeSnapshot?.().mode === 'shapes'
      && globals?.shapesState?.bodies?.some((body) => body.type === 'square')
      && window.__pointerReady === true;
  }, null, { timeout: waitMs });
  await page.waitForFunction(() => document.documentElement.dataset.absBootState === 'ready', null, { timeout: waitMs });
  await page.waitForTimeout(900);
}

async function configureFixture(page, grabKind = 'corner') {
  return page.evaluate((kind) => {
    const globals = window.__ABS_HOME_AUDIT__.getGlobals();
    const state = globals.shapesState;
    const canvas = globals.canvas;
    const square = state.bodies.find((body) => body.type === 'square');
    if (!square) throw new Error('Shapes square fixture is unavailable');

    globals.shapesGravityScale = 0;
    globals.shapesDamping = 0.999;
    globals.shapesBodyCollisionEnabled = 0;
    globals.shapesGrabAngularDampingPerSec = 1.2;
    globals.shapesReleaseLinearGain = 1;
    globals.shapesReleaseAngularGain = 1;
    globals.shapesMaxSpeed = 1250;
    globals.shapesMaxAngularSpeed = 8;
    globals.shapesReducedMotionScale = 0.35;
    state.time = 0;
    state.drag = null;
    state.sweep = null;

    for (const body of state.bodies) {
      body.isPending = true;
      body.dropDelay = 1e9;
      body.isDragged = false;
      body.vx = 0;
      body.vy = 0;
      body.omega = 0;
      body.angle = 0;
      body.enteringFromTop = false;
      body.reducedMotionRelease = false;
    }

    square.isPending = false;
    square.hasDropped = true;
    square.x = Math.max(square.radius + 24, Math.min(canvas.width * 0.30, canvas.width - square.radius - 24));
    square.y = Math.max(square.radius + 24, Math.min(canvas.height * 0.45, canvas.height - square.radius - 24));

    let corner = square.points[0];
    let center = square.points[0];
    for (const point of square.points) {
      if (Math.hypot(point.lx, point.ly) > Math.hypot(corner.lx, corner.ly)) corner = point;
      if (Math.hypot(point.lx, point.ly) < Math.hypot(center.lx, center.ly)) center = point;
    }
    if (Math.hypot(center.lx, center.ly) > square.radius * 0.2) {
      throw new Error('Square fixture no longer contains a usable centre dot');
    }
    const grab = kind === 'center' ? center : corner;
    const rect = canvas.getBoundingClientRect();
    const toClient = (x, y) => ({
      x: rect.left + x * rect.width / canvas.width,
      y: rect.top + y * rect.height / canvas.height,
    });
    return {
      start: toClient(square.x + grab.lx, square.y + grab.ly),
      canvasScaleX: rect.width / canvas.width,
      canvasScaleY: rect.height / canvas.height,
      dpr: globals.DPR || 1,
      radius: square.radius,
      dotRadius: square.dotRadius,
      grabDistance: Math.hypot(grab.lx, grab.ly),
    };
  }, grabKind);
}

async function readSquareState(page) {
  return page.evaluate(() => {
    const globals = window.__ABS_HOME_AUDIT__.getGlobals();
    const state = globals.shapesState;
    const body = state.bodies.find((candidate) => candidate.type === 'square');
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);
    const worldGrabX = body.dragGrabLocalX * cos - body.dragGrabLocalY * sin;
    const worldGrabY = body.dragGrabLocalX * sin + body.dragGrabLocalY * cos;
    const anchorError = body.isDragged
      ? Math.hypot(body.x + worldGrabX - body.dragAnchorX, body.y + worldGrabY - body.dragAnchorY)
      : null;
    const filteredAnchorVx = state.drag?.body === body ? state.drag.filteredAnchorVx : 0;
    const filteredAnchorVy = state.drag?.body === body ? state.drag.filteredAnchorVy : 0;
    const releaseTargetVx = filteredAnchorVx + body.omega * worldGrabY;
    const releaseTargetVy = filteredAnchorVy - body.omega * worldGrabX;
    return {
      x: body.x,
      y: body.y,
      vx: body.vx,
      vy: body.vy,
      speed: Math.hypot(body.vx, body.vy),
      angle: body.angle,
      omega: body.omega,
      isDragged: body.isDragged,
      anchorError,
      dragActive: state.drag?.body === body,
      filteredAnchorSpeed: Math.hypot(filteredAnchorVx, filteredAnchorVy),
      releaseTargetSpeed: Math.hypot(releaseTargetVx, releaseTargetVy),
      releaseTargetOmega: body.omega,
      lastReleaseTargetSpeed: Math.hypot(body.lastReleaseTargetVx || 0, body.lastReleaseTargetVy || 0),
      lastReleaseTargetOmega: body.lastReleaseTargetOmega || 0,
      peakDragOmega: body.peakDragOmega || 0,
      pointerType: globals.pointerType,
      finite: [body.x, body.y, body.vx, body.vy, body.angle, body.omega].every(Number.isFinite),
    };
  });
}

async function readCollisionState(page) {
  return page.evaluate(() => {
    const globals = window.__ABS_HOME_AUDIT__.getGlobals();
    const state = globals.shapesState;
    const square = state.bodies.find((body) => body.type === 'square');
    const circle = state.bodies.find((body) => body.type === 'circle');
    let maxOverlap = 0;
    const cosSquare = Math.cos(square.angle);
    const sinSquare = Math.sin(square.angle);
    const cosCircle = Math.cos(circle.angle);
    const sinCircle = Math.sin(circle.angle);
    for (const a of square.points) {
      const ax = square.x + a.lx * cosSquare - a.ly * sinSquare;
      const ay = square.y + a.lx * sinSquare + a.ly * cosSquare;
      for (const b of circle.points) {
        const bx = circle.x + b.lx * cosCircle - b.ly * sinCircle;
        const by = circle.y + b.lx * sinCircle + b.ly * cosCircle;
        maxOverlap = Math.max(maxOverlap, square.dotRadius + circle.dotRadius - Math.hypot(bx - ax, by - ay));
      }
    }
    return {
      square: {
        angle: square.angle,
        omega: square.omega,
        isDragged: square.isDragged,
      },
      circle: {
        vx: circle.vx,
        vy: circle.vy,
        speed: Math.hypot(circle.vx, circle.vy),
        omega: circle.omega,
      },
      maxOverlap: Math.max(0, maxOverlap),
      finite: [square.angle, square.omega, circle.vx, circle.vy, circle.omega, maxOverlap].every(Number.isFinite),
    };
  });
}

function makeHorizontalPath(fixture, distanceCss = 220, steps = 12) {
  const distanceClient = distanceCss;
  return Array.from({ length: steps }, (_, index) => ({
    x: fixture.start.x + distanceClient * ((index + 1) / steps),
    y: fixture.start.y,
  }));
}

function makeVerticalPath(fixture, distanceCss = 220, steps = 12) {
  return Array.from({ length: steps }, (_, index) => ({
    x: fixture.start.x,
    y: fixture.start.y + distanceCss * ((index + 1) / steps),
  }));
}

async function mouseGesture(page, grabKind = 'corner', screenshotBase = null, measureSettled = false) {
  const fixture = await configureFixture(page, grabKind);
  const path = makeHorizontalPath(fixture);
  if (screenshotBase) await page.screenshot({ path: resolve(outputRoot, `${screenshotBase}-before.png`), fullPage: true });
  await page.mouse.move(fixture.start.x, fixture.start.y);
  await page.mouse.down();
  await page.waitForTimeout(20);
  for (const point of path) {
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(8);
  const held = await readSquareState(page);
  await page.mouse.up();
  await page.waitForTimeout(18);
  const released = await readSquareState(page);
  if (screenshotBase) await page.screenshot({ path: resolve(outputRoot, `${screenshotBase}-after.png`), fullPage: true });
  let settled = null;
  if (measureSettled) {
    await page.waitForTimeout(482);
    settled = await readSquareState(page);
  }
  return { fixture, held, released, settled, peakOmega: held.peakDragOmega };
}

async function touchGesture(page, cdp) {
  const fixture = await configureFixture(page, 'corner');
  const path = makeVerticalPath(fixture);
  await page.screenshot({ path: resolve(outputRoot, 'chromium-touch-before.png'), fullPage: true });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: fixture.start.x, y: fixture.start.y, id: 17 }],
  });
  await page.waitForTimeout(20);
  for (const point of path.slice(0, -1)) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: point.x, y: point.y, id: 17 }],
    });
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(8);
  const held = await readSquareState(page);
  const finalPoint = path[path.length - 1];
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: finalPoint.x, y: finalPoint.y, id: 17 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(18);
  const released = await readSquareState(page);
  await page.screenshot({ path: resolve(outputRoot, 'chromium-touch-after.png'), fullPage: true });
  return { fixture, held, released, peakOmega: held.peakDragOmega };
}

function assertGesture(result, expectedPointerType, label) {
  const { fixture, held, released } = result;
  assert(held.isDragged && held.dragActive, `${label}: body was not held during the gesture`, held);
  assert(held.anchorError <= 1.5 * fixture.dpr, `${label}: grabbed dot did not remain pinned`, held);
  assert(result.peakOmega >= 0.35, `${label}: corner manipulation did not create the required spin`, result);
  assert(!released.isDragged && !released.dragActive, `${label}: body remained held after release`, released);
  if (released.lastReleaseTargetSpeed >= 30 * fixture.dpr) {
    assert(released.speed > 0, `${label}: release erased valid translational momentum`, released);
    assert(
      released.speed >= released.lastReleaseTargetSpeed * 0.7,
      `${label}: release retained less than 70% of reconstructed centre speed`,
      { held, released },
    );
  }
  if (Math.abs(released.lastReleaseTargetOmega) >= 0.08) {
    assert(Math.abs(released.omega) > 0, `${label}: release erased valid angular momentum`, released);
    assert(
      Math.abs(released.omega) >= Math.abs(released.lastReleaseTargetOmega) * 0.7,
      `${label}: release retained less than 70% of solved angular speed`,
      { held, released },
    );
  }
  assert(released.pointerType === expectedPointerType, `${label}: unexpected pointer type`, released);
  assert(released.finite, `${label}: solver produced non-finite state`, released);
  assert(released.speed <= 1250 * fixture.dpr + 2, `${label}: linear speed cap failed`, released);
  assert(Math.abs(released.omega) <= 8.01, `${label}: angular speed cap failed`, released);
}

async function auditCollision(page) {
  const fixture = await configureFixture(page, 'corner');
  await page.mouse.move(fixture.start.x, fixture.start.y);
  await page.mouse.down();
  await page.waitForTimeout(40);
  const before = await readSquareState(page);
  await page.evaluate(() => {
    const audit = window.__ABS_HOME_AUDIT__;
    audit.stopMainLoop();
    const globals = window.__ABS_HOME_AUDIT__.getGlobals();
    const state = globals.shapesState;
    const square = state.bodies.find((body) => body.type === 'square');
    const circle = state.bodies.find((body) => body.type === 'circle');
    const squarePoint = square.points.reduce((best, point) => (
      point.lx + point.ly > best.lx + best.ly ? point : best
    ), square.points[0]);
    const circlePoint = circle.points.reduce((best, point) => (
      point.lx < best.lx ? point : best
    ), circle.points[0]);
    const separation = square.dotRadius * 0.5;
    circle.isPending = false;
    circle.hasDropped = true;
    circle.enteringFromTop = false;
    circle.angle = 0;
    circle.omega = 0;
    circle.x = square.x + squarePoint.lx - circlePoint.lx + separation;
    circle.y = square.y + squarePoint.ly - circlePoint.ly;
    circle.vx = -600 * (globals.DPR || 1);
    circle.vy = 0;
    globals.shapesBodyCollisionEnabled = 1;
    for (let step = 0; step < 18; step += 1) audit.stepCurrentMode(1 / 120);
  });
  const after = await readSquareState(page);
  const contact = await readCollisionState(page);
  await page.screenshot({ path: resolve(outputRoot, 'chromium-held-collision.png'), fullPage: true });
  await page.evaluate(() => {
    const audit = window.__ABS_HOME_AUDIT__;
    for (let step = 0; step < 42; step += 1) audit.stepCurrentMode(1 / 120);
  });
  const settled = await readCollisionState(page);
  await page.mouse.up();
  assert(after.anchorError <= 1.5 * fixture.dpr, 'Held collision detached the grabbed dot', { before, after });
  assert(
    Math.abs(after.omega - before.omega) >= 0.15,
    'Off-centre collision did not rotate the held body',
    { before, after, contact },
  );
  assert(
    Math.abs(contact.circle.vx + 600 * fixture.dpr) >= 30 * fixture.dpr || Math.abs(contact.circle.omega) >= 0.05,
    'Held collision did not transfer momentum to the unheld body',
    contact,
  );
  assert(settled.maxOverlap <= fixture.dotRadius * 0.25, 'Held collision left excessive residual overlap after 500ms', settled);
  assert(contact.finite && settled.finite, 'Held collision produced non-finite state', { contact, settled });
  return { before, after, contact, settled };
}

async function beginCancellationFixture(page) {
  await gotoShapes(page);
  const fixture = await configureFixture(page, 'corner');
  await page.mouse.move(fixture.start.x, fixture.start.y);
  await page.mouse.down();
  await page.waitForTimeout(30);
  const before = await readSquareState(page);
  assert(before.isDragged, 'Cancellation fixture did not start a drag', before);
  return before;
}

async function assertCancelled(page, label, before) {
  await page.waitForTimeout(40);
  const after = await readSquareState(page);
  await page.mouse.up().catch(() => {});
  assert(!after.isDragged && !after.dragActive, `${label} did not cancel the Shapes drag`, { before, after });
  return { before, after };
}

async function auditCancellationMatrix(page) {
  const results = {};

  let before = await beginCancellationFixture(page);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  results.blur = await assertCancelled(page, 'Window blur', before);

  before = await beginCancellationFixture(page);
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseleave')));
  results.mouseleave = await assertCancelled(page, 'Document mouseleave', before);

  before = await beginCancellationFixture(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });
  results.visibility = await assertCancelled(page, 'Document visibility loss', before);

  before = await beginCancellationFixture(page);
  await page.evaluate(() => {
    const fixture = document.createElement('button');
    fixture.id = 'panelDock';
    fixture.type = 'button';
    fixture.style.cssText = 'position:fixed;left:20px;top:20px;width:48px;height:48px;z-index:99999';
    document.body.appendChild(fixture);
  });
  const dockBox = await page.locator('#panelDock').boundingBox();
  assert(dockBox, 'Panel fixture was unavailable for UI cancellation test');
  await page.mouse.move(dockBox.x + dockBox.width / 2, dockBox.y + dockBox.height / 2);
  results.panel = await assertCancelled(page, 'Panel entry', before);

  before = await beginCancellationFixture(page);
  await page.evaluate(() => {
    const globals = window.__ABS_HOME_AUDIT__.getGlobals();
    document.body.dispatchEvent(new PointerEvent('pointercancel', {
      bubbles: true,
      pointerId: globals.pointerInputId ?? 1,
      pointerType: globals.pointerType || 'mouse',
      isPrimary: true,
    }));
  });
  results.pointercancel = await assertCancelled(page, 'Pointer cancel', before);

  before = await beginCancellationFixture(page);
  await page.evaluate(() => document.querySelector('.simulation-focus-switcher')?.click());
  await page.waitForSelector('.simulation-focus-row:not([aria-current="true"])', { state: 'visible', timeout: waitMs });
  await page.evaluate(() => document.querySelector('.simulation-focus-row:not([aria-current="true"])')?.click());
  await page.waitForFunction(() => window.__ABS_HOME_AUDIT__.getGlobals().currentMode !== 'shapes', null, { timeout: waitMs });
  results.modeChange = await assertCancelled(page, 'Mode change', before);

  before = await beginCancellationFixture(page);
  await page.evaluate(() => document.querySelector('[data-route-tab][href*="portfolio"]')?.click());
  await page.waitForURL(/portfolio\.html/, { timeout: waitMs });
  results.teardown = await assertCancelled(page, 'Runtime teardown', before);

  return results;
}

async function auditGravityTorque(page) {
  await gotoShapes(page);
  const fixture = await configureFixture(page, 'corner');
  await page.evaluate(() => {
    window.__ABS_HOME_AUDIT__.getGlobals().shapesGravityScale = 0.92;
  });
  await page.mouse.move(fixture.start.x, fixture.start.y);
  await page.mouse.down();
  await page.evaluate(() => {
    const audit = window.__ABS_HOME_AUDIT__;
    audit.stopMainLoop();
    for (let step = 0; step < 30; step += 1) audit.stepCurrentMode(1 / 120);
  });
  const result = await readSquareState(page);
  await page.mouse.up();
  assert(result.anchorError <= 1.5 * fixture.dpr, 'Gravity torque detached the held anchor', result);
  assert(Math.abs(result.omega) >= 0.1, 'Gravity did not rotate a stationary off-centre grab', result);
  return result;
}

async function auditLongPauseRelease(page) {
  await gotoShapes(page);
  const fixture = await configureFixture(page, 'corner');
  const path = makeHorizontalPath(fixture, 100, 4);
  await page.mouse.move(fixture.start.x, fixture.start.y);
  await page.mouse.down();
  for (const point of path) {
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(15);
  }
  await page.waitForTimeout(180);
  const held = await readSquareState(page);
  await page.mouse.up();
  await page.waitForTimeout(18);
  const released = await readSquareState(page);
  const rotationalSpeed = Math.abs(released.omega) * fixture.grabDistance;
  assert(
    released.speed <= rotationalSpeed + 35 * fixture.dpr,
    'Long stationary hold reused stale pointer velocity on release',
    { fixture, held, released, rotationalSpeed },
  );
  return { held, released, rotationalSpeed };
}

async function auditCadence(page, frameDt) {
  await gotoShapes(page);
  const fixture = await configureFixture(page, 'corner');
  await page.mouse.move(fixture.start.x, fixture.start.y);
  await page.mouse.down();
  await page.waitForTimeout(30);
  const result = await page.evaluate(({ dt, distanceCss, scaleX, duration }) => {
    const audit = window.__ABS_HOME_AUDIT__;
    const globals = audit.getGlobals();
    const drag = globals.shapesState.drag;
    audit.stopMainLoop();
    const startX = drag.physicsAnchorX;
    const startY = drag.physicsAnchorY;
    const distanceBacking = distanceCss / scaleX;
    let elapsed = 0;
    while (elapsed < duration - 1e-9) {
      const step = Math.min(dt, duration - elapsed);
      elapsed += step;
      drag.targetX = startX + distanceBacking * (elapsed / duration);
      drag.targetY = startY;
      audit.stepCurrentMode(step);
    }
    const body = drag.body;
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);
    const grabX = body.dragGrabLocalX * cos - body.dragGrabLocalY * sin;
    const grabY = body.dragGrabLocalX * sin + body.dragGrabLocalY * cos;
    return {
      angle: body.angle,
      omega: body.omega,
      speed: Math.hypot(body.vx, body.vy),
      anchorError: Math.hypot(body.x + grabX - body.dragAnchorX, body.y + grabY - body.dragAnchorY),
      finite: [body.x, body.y, body.vx, body.vy, body.angle, body.omega].every(Number.isFinite),
    };
  }, { dt: frameDt, distanceCss: 220, scaleX: fixture.canvasScaleX, duration: 0.24 });
  assert(result.anchorError <= 1.5 * fixture.dpr, `${Math.round(1 / frameDt)}Hz cadence detached the anchor`, result);
  assert(Math.abs(result.omega) >= 0.35, `${Math.round(1 / frameDt)}Hz cadence lost angular response`, result);
  assert(result.finite, `${Math.round(1 / frameDt)}Hz cadence produced non-finite state`, result);
  assert(result.speed <= 1250 * fixture.dpr + 2, `${Math.round(1 / frameDt)}Hz cadence exceeded linear cap`, result);
  return result;
}

async function auditRuntimeConfig(page) {
  await gotoShapes(page);
  const values = await page.evaluate(() => {
    const globals = window.__ABS_HOME_AUDIT__.getGlobals();
    return {
      shapesGrabAngularDampingPerSec: globals.shapesGrabAngularDampingPerSec,
      shapesReleaseLinearGain: globals.shapesReleaseLinearGain,
      shapesReleaseAngularGain: globals.shapesReleaseAngularGain,
      shapesMaxSpeed: globals.shapesMaxSpeed,
      shapesMaxAngularSpeed: globals.shapesMaxAngularSpeed,
      shapesReducedMotionScale: globals.shapesReducedMotionScale,
    };
  });
  const expected = {
    shapesGrabAngularDampingPerSec: 1.2,
    shapesReleaseLinearGain: 1,
    shapesReleaseAngularGain: 1,
    shapesMaxSpeed: 1250,
    shapesMaxAngularSpeed: 8,
    shapesReducedMotionScale: 0.35,
  };
  assert(JSON.stringify(values) === JSON.stringify(expected), 'Production runtime config does not match authored Shapes values', { values, expected });
  return values;
}

async function runChromiumDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await gotoShapes(page);
    const corner = await mouseGesture(page, 'corner', 'chromium-mouse', true);
    assertGesture(corner, 'mouse', 'Chromium mouse');
    await gotoShapes(page);
    const center = await mouseGesture(page, 'center');
    assert(
      corner.peakOmega >= center.peakOmega + 0.25,
      'Corner grab did not create more angular response than the centre grab',
      { corner: corner.held, center: center.held },
    );
    await gotoShapes(page);
    const collision = await auditCollision(page);
    const gravity = await auditGravityTorque(page);
    const longPauseRelease = await auditLongPauseRelease(page);
    const cancellation = await auditCancellationMatrix(page);
    const cadence60 = await auditCadence(page, 1 / 60);
    const cadence30 = await auditCadence(page, 1 / 30);
    const runtimeConfig = await auditRuntimeConfig(page);
    return {
      corner,
      center,
      collision,
      gravity,
      longPauseRelease,
      cancellation,
      cadence60,
      cadence30,
      runtimeConfig,
    };
  } finally {
    await context.close();
  }
}

async function runChromiumTouch(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  try {
    await gotoShapes(page);
    const result = await touchGesture(page, cdp);
    assert(
      result.released.lastReleaseTargetSpeed >= 30 * result.fixture.dpr,
      'Chromium touch fixture did not release with valid translational momentum',
      result,
    );
    assertGesture(result, 'touch', 'Chromium touch');
    return result;
  } finally {
    await cdp.detach().catch(() => {});
    await context.close();
  }
}

async function runReducedMotion(browser, standard) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  try {
    await gotoShapes(page);
    const result = await mouseGesture(page, 'corner', 'chromium-reduced-motion', true);
    assert(result.held.anchorError <= 1.5 * result.fixture.dpr, 'Reduced motion weakened the hard pin', result.held);
    assert(result.released.speed > 0, 'Reduced motion removed release interaction entirely', result.released);
    assert(
      result.released.speed <= result.released.lastReleaseTargetSpeed * 0.55,
      'Reduced-motion linear release was not sufficiently limited',
      { reduced: result.released },
    );
    assert(
      Math.abs(result.released.omega) <= Math.abs(result.released.lastReleaseTargetOmega) * 0.55,
      'Reduced-motion angular release was not sufficiently limited',
      { reduced: result.released },
    );
    assert(result.settled && standard.settled, 'Reduced-motion settling snapshots were not captured');
    assert(
      result.settled.speed / Math.max(1, result.released.speed)
        <= standard.settled.speed / Math.max(1, standard.released.speed),
      'Reduced motion did not settle linear motion faster within 500ms',
      { standard: standard.settled, reduced: result.settled },
    );
    assert(
      Math.abs(result.settled.omega) / Math.max(0.001, Math.abs(result.released.omega))
        <= Math.abs(standard.settled.omega) / Math.max(0.001, Math.abs(standard.released.omega)),
      'Reduced motion did not settle angular motion faster within 500ms',
      { standard: standard.settled, reduced: result.settled },
    );
    return result;
  } finally {
    await context.close();
  }
}

async function runWebkit() {
  const browser = await webkit.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await gotoShapes(page);
    const result = await mouseGesture(page, 'corner', 'webkit-mouse');
    assertGesture(result, 'mouse', 'WebKit mouse');
    return result;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const browser = await chromium.launch();
  let chromiumDesktop;
  let chromiumTouch;
  let reducedMotion;
  try {
    chromiumDesktop = await runChromiumDesktop(browser);
    chromiumTouch = await runChromiumTouch(browser);
    reducedMotion = await runReducedMotion(browser, chromiumDesktop.corner);
  } finally {
    await browser.close();
  }
  const webkitMouse = await runWebkit();
  const report = {
    ok: true,
    url: shapesUrl(),
    chromiumDesktop,
    chromiumTouch,
    reducedMotion,
    webkitMouse,
  };
  await writeFile(resolve(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
