import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPlaygroundCameraController,
  createPlaygroundDotFieldRenderer,
} from './index.js';

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(type, listeners.filter((candidate) => candidate !== listener));
  }

  dispatch(type, event = {}) {
    event.type = type;
    event.target ||= this;
    event.currentTarget = this;
    const listeners = this.listeners.get(type) || [];
    listeners.slice().forEach((listener) => listener(event));
  }

  listenerCount() {
    let count = 0;
    this.listeners.forEach((listeners) => { count += listeners.length; });
    return count;
  }
}

class FakeWindow extends FakeEventTarget {
  constructor() {
    super();
    this.devicePixelRatio = 2.5;
    this.nextFrameId = 1;
    this.frames = new Map();
  }

  requestAnimationFrame(callback) {
    const id = this.nextFrameId;
    this.nextFrameId += 1;
    this.frames.set(id, callback);
    return id;
  }

  cancelAnimationFrame(id) {
    this.frames.delete(id);
  }

  flushAnimationFrames(timestamp = 16.67) {
    const callbacks = [...this.frames.values()];
    this.frames.clear();
    callbacks.forEach((callback) => callback(timestamp));
  }
}

class FakePointerTarget extends FakeEventTarget {
  constructor() {
    super();
    this.capturedPointerId = -1;
  }

  setPointerCapture(pointerId) {
    this.capturedPointerId = pointerId;
  }

  hasPointerCapture(pointerId) {
    return this.capturedPointerId === pointerId;
  }

  releasePointerCapture(pointerId) {
    if (this.capturedPointerId === pointerId) this.capturedPointerId = -1;
  }
}

function pointerEvent(overrides = {}) {
  return {
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    clientX: 0,
    clientY: 0,
    timeStamp: 1,
    preventDefault() {},
    ...overrides,
  };
}

function flushMotion(windowObject, controller, maximumFrames = 120) {
  let timestamp = 16.67;
  for (let index = 0; index < maximumFrames && windowObject.frames.size; index += 1) {
    windowObject.flushAnimationFrames(timestamp);
    timestamp += 16.67;
    const snapshot = controller.getSnapshot();
    if (!snapshot.wheelActive && !snapshot.inertiaActive && !snapshot.frameScheduled) break;
  }
}

test('camera controller coalesces input, guards drag clicks, respects reduced motion, and cleans up', () => {
  const target = new FakePointerTarget();
  const windowObject = new FakeWindow();
  const documentObject = new FakeEventTarget();
  documentObject.visibilityState = 'visible';
  const reducedMotionQuery = new FakeEventTarget();
  reducedMotionQuery.matches = false;
  const updates = [];
  let dragChanges = 0;
  let suppressedClicks = 0;
  const controller = createPlaygroundCameraController({
    target,
    worldWidthPx: 100,
    worldHeightPx: 80,
    viewportWidthPx: 800,
    viewportHeightPx: 600,
    wheelSensitivity: 1,
    onUpdate: (state) => updates.push({ x: state.logicalX, y: state.logicalY }),
    onDragStateChange: () => { dragChanges += 1; },
    onClickSuppressed: () => { suppressedClicks += 1; },
    windowObject,
    documentObject,
    reducedMotionQuery,
  });
  assert.equal(updates.length, 1);

  let wheelPrevented = false;
  target.dispatch('wheel', {
    deltaX: 10,
    deltaY: 20,
    deltaMode: 0,
    ctrlKey: false,
    metaKey: false,
    preventDefault() { wheelPrevented = true; },
  });
  assert.equal(wheelPrevented, true);
  assert.equal(windowObject.frames.size, 1);
  windowObject.flushAnimationFrames();
  assert.ok(controller.getSnapshot().logicalX > 0 && controller.getSnapshot().logicalX < 10);
  assert.equal(controller.getSnapshot().wheelActive, true);
  flushMotion(windowObject, controller);
  assert.equal(controller.getSnapshot().logicalX, 10);
  assert.equal(controller.getSnapshot().logicalY, 20);

  controller.configure({ wheelSensitivity: 2, dragMomentum: 0 });
  windowObject.flushAnimationFrames();
  target.dispatch('wheel', {
    deltaX: 5,
    deltaY: 10,
    deltaMode: 0,
    ctrlKey: false,
    metaKey: false,
    preventDefault() {},
  });
  flushMotion(windowObject, controller);
  assert.equal(controller.getSnapshot().logicalX, 20);
  assert.equal(controller.getSnapshot().logicalY, 40);

  let zoomWheelPrevented = false;
  target.dispatch('wheel', {
    deltaX: 100,
    deltaY: 100,
    deltaMode: 0,
    ctrlKey: true,
    metaKey: false,
    preventDefault() { zoomWheelPrevented = true; },
  });
  assert.equal(zoomWheelPrevented, false);

  target.dispatch('pointerdown', pointerEvent({ clientX: 100, clientY: 100, timeStamp: 10 }));
  target.dispatch('pointermove', pointerEvent({ clientX: 103, clientY: 100, timeStamp: 15 }));
  assert.equal(dragChanges, 0);
  target.dispatch('pointermove', pointerEvent({ clientX: 112, clientY: 100, timeStamp: 25 }));
  assert.equal(dragChanges, 1);
  windowObject.flushAnimationFrames(30);
  target.dispatch('pointerup', pointerEvent({ clientX: 112, clientY: 100, timeStamp: 31 }));
  assert.equal(dragChanges, 2);
  windowObject.flushAnimationFrames(32);
  assert.equal(controller.getSnapshot().inertiaActive, false);
  let clickPrevented = false;
  target.dispatch('click', {
    timeStamp: 32,
    preventDefault() { clickPrevented = true; },
    stopPropagation() {},
    stopImmediatePropagation() {},
  });
  assert.equal(clickPrevented, true);
  assert.equal(suppressedClicks, 1);

  reducedMotionQuery.matches = true;
  reducedMotionQuery.dispatch('change', { matches: true });
  windowObject.flushAnimationFrames(40);
  assert.equal(controller.getSnapshot().reducedMotion, true);
  assert.equal(controller.getSnapshot().inertiaActive, false);

  target.dispatch('keydown', {
    key: 'Home',
    target,
    defaultPrevented: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault() {},
  });
  windowObject.flushAnimationFrames(50);
  assert.equal(controller.getSnapshot().logicalX, 0);
  assert.equal(controller.getSnapshot().logicalY, 0);

  controller.destroy();
  assert.equal(target.listenerCount(), 0);
  assert.equal(windowObject.listenerCount(), 0);
  assert.equal(documentObject.listenerCount(), 0);
  assert.equal(reducedMotionQuery.listenerCount(), 0);
  assert.equal(windowObject.frames.size, 0);
});

test('camera controller follows display frames and coalesces explicit render requests', () => {
  const target = new FakePointerTarget();
  const windowObject = new FakeWindow();
  const documentObject = new FakeEventTarget();
  documentObject.visibilityState = 'visible';
  const updates = [];
  const controller = createPlaygroundCameraController({
    target,
    worldWidthPx: 1000,
    worldHeightPx: 800,
    viewportWidthPx: 800,
    viewportHeightPx: 600,
    dragMomentum: 0,
    onUpdate: (state) => updates.push(state.logicalX),
    windowObject,
    documentObject,
  });

  target.dispatch('pointerdown', pointerEvent({ clientX: 100, clientY: 100, timeStamp: 1 }));
  target.dispatch('pointermove', pointerEvent({ clientX: 120, clientY: 100, timeStamp: 7 }));
  windowObject.flushAnimationFrames(100);
  assert.equal(updates.length, 2);

  target.dispatch('pointermove', pointerEvent({ clientX: 140, clientY: 100, timeStamp: 14 }));
  windowObject.flushAnimationFrames(107);
  assert.equal(updates.length, 3);
  assert.equal(windowObject.frames.size, 0);

  target.dispatch('pointermove', pointerEvent({ clientX: 160, clientY: 100, timeStamp: 21 }));
  windowObject.flushAnimationFrames(114);
  assert.equal(updates.length, 4);
  assert.equal(controller.getSnapshot().logicalX, -60);

  assert.equal(controller.requestUpdate(), true);
  assert.equal(controller.requestUpdate(), true);
  assert.equal(windowObject.frames.size, 1);
  windowObject.flushAnimationFrames(121);
  assert.equal(updates.length, 5);

  target.dispatch('pointercancel', pointerEvent({ clientX: 160, clientY: 100, timeStamp: 22 }));
  controller.destroy();
});

test('camera controller centres with cancellable native-frame motion', async () => {
  const target = new FakePointerTarget();
  const windowObject = new FakeWindow();
  const documentObject = new FakeEventTarget();
  documentObject.visibilityState = 'visible';
  const controller = createPlaygroundCameraController({
    target,
    worldWidthPx: 1000,
    worldHeightPx: 800,
    viewportWidthPx: 800,
    viewportHeightPx: 600,
    windowObject,
    documentObject,
  });

  const completedMotion = controller.animateTo(240, -120, {
    durationMs: 100,
    easing: (progress) => progress,
  });
  windowObject.flushAnimationFrames(0);
  windowObject.flushAnimationFrames(50);
  assert.deepEqual(
    { x: controller.getSnapshot().logicalX, y: controller.getSnapshot().logicalY },
    { x: 120, y: -60 },
  );
  windowObject.flushAnimationFrames(100);
  assert.equal(await completedMotion, true);
  assert.equal(controller.getSnapshot().cameraAnimationActive, false);

  const interruptedMotion = controller.animateTo(480, 120, { durationMs: 400 });
  windowObject.flushAnimationFrames(120);
  target.dispatch('pointerdown', pointerEvent({ clientX: 20, clientY: 20, timeStamp: 125 }));
  assert.equal(await interruptedMotion, false);
  assert.equal(controller.getSnapshot().cameraAnimationActive, false);

  controller.destroy();
});

test('camera and dot field share one frame and one canvas draw while dragging', () => {
  const target = new FakePointerTarget();
  const windowObject = new FakeWindow();
  const documentObject = new FakeEventTarget();
  documentObject.visibilityState = 'visible';
  const context = {
    globalAlpha: 1,
    fillStyle: '',
    beginPath() {},
    moveTo() {},
    arc() {},
    fill() {},
    clearRect() {},
    setTransform() {},
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    getBoundingClientRect: () => ({ width: 320, height: 240 }),
  };
  let controller = null;
  const renderer = createPlaygroundDotFieldRenderer(canvas, {
    windowObject,
    documentObject,
    viewportCenterX: 160,
    viewportCenterY: 120,
    requestRenderFrame: () => controller?.requestUpdate() || false,
  });
  controller = createPlaygroundCameraController({
    target,
    worldWidthPx: 1000,
    worldHeightPx: 800,
    viewportWidthPx: 320,
    viewportHeightPx: 240,
    viewportCenterX: 160,
    viewportCenterY: 120,
    dragMomentum: 0,
    onUpdate: (state) => renderer.setCamera(
      state.renderedX,
      state.renderedY,
      state.viewportCenterX,
      state.viewportCenterY,
      true,
    ),
    windowObject,
    documentObject,
  });

  renderer.start();
  assert.equal(windowObject.frames.size, 1);
  windowObject.flushAnimationFrames(16.67);
  const initialDrawCount = renderer.getSnapshot().drawCount;

  target.dispatch('pointerdown', pointerEvent({ clientX: 100, clientY: 100, timeStamp: 20 }));
  target.dispatch('pointermove', pointerEvent({ clientX: 120, clientY: 100, timeStamp: 27 }));
  assert.equal(windowObject.frames.size, 1, 'camera invalidation should use one frame');
  windowObject.flushAnimationFrames(23.61);
  assert.equal(renderer.getSnapshot().drawCount, initialDrawCount + 1);
  assert.equal(controller.getSnapshot().logicalX, -20);

  target.dispatch('pointercancel', pointerEvent({ clientX: 120, clientY: 100, timeStamp: 28 }));
  controller.destroy();
  renderer.destroy();
  assert.equal(windowObject.frames.size, 0);
});

test('an inert Work background can finish its camera transaction without accepting input', async () => {
  const target = new FakePointerTarget();
  const windowObject = new FakeWindow();
  const documentObject = new FakeEventTarget();
  documentObject.visibilityState = 'visible';
  const camera = createPlaygroundCameraController({
    target, windowObject, documentObject,
    worldWidthPx: 1000, worldHeightPx: 800,
    viewportWidthPx: 800, viewportHeightPx: 600,
  });
  const settled = camera.animateTo(2240, -1720, { durationMs: 100 });
  windowObject.flushAnimationFrames(0);
  camera.setEnabled(false, { preserveAnimation: true });
  target.dispatch('pointerdown', pointerEvent({ clientX: 80, clientY: 80 }));
  windowObject.flushAnimationFrames(50);
  assert.equal(camera.getSnapshot().enabled, false);
  assert.equal(camera.getSnapshot().cameraAnimationActive, true);
  windowObject.flushAnimationFrames(100);
  assert.equal(await settled, true);
  assert.equal(camera.getSnapshot().logicalX, 2240);
  assert.equal(camera.getSnapshot().logicalY, -1720);
  assert.equal(windowObject.frames.size, 0);
  camera.destroy();
});

function depthFixture(options = {}, width = 1440, height = 900) {
  const windowObject = new FakeWindow();
  const documentObject = new FakeEventTarget();
  documentObject.visibilityState = 'visible';
  let points = [];
  const context = {
    globalAlpha: 1, fillStyle: '',
    beginPath() {}, moveTo() {}, fill() {}, setTransform() {},
    arc(x, y, radius) { points.push({ x, y, radius, alpha: this.globalAlpha, color: this.fillStyle }); },
    clearRect() { points = []; },
  };
  const canvas = {
    width: 0, height: 0,
    getContext: () => context,
    getBoundingClientRect: () => ({ width, height }),
  };
  const renderer = createPlaygroundDotFieldRenderer(canvas, {
    windowObject, documentObject, fieldMode: 'depth',
    maximumVisibleDots: 1800, dotRadiusPx: 2, dotOpacity: 1,
    colors: ['#fa5440', '#5c85ea', '#b4d672'], ...options,
  });
  renderer.start();
  windowObject.flushAnimationFrames();
  return { renderer, windowObject, getPoints: () => points.slice() };
}

test('depth opacity keeps the nearest layer solid and fades the layers behind without changing points', () => {
  const { renderer, windowObject, getPoints } = depthFixture();
  const opaque = getPoints();
  assert.deepEqual([...new Set(opaque.map((point) => point.alpha))], [0.34, 0.52, 1]);
  renderer.configure({ dotOpacity: 0.8 });
  windowObject.flushAnimationFrames();
  assert.deepEqual(getPoints(), opaque.map((point) => ({ ...point, alpha: point.alpha * 0.8 })));
  assert.equal(windowObject.frames.size, 0, 'opacity changes must settle without an idle animation loop');
  renderer.configure({ dotOpacity: 1 });
  windowObject.flushAnimationFrames();
  assert.deepEqual(getPoints(), opaque);
  renderer.destroy();
});

test('depth cells do not pop or change sampling phase when the camera crosses grid and world seams', () => {
  const fixture = depthFixture({ maximumVisibleDots: 512, dotDensity: 0.8 });
  const { renderer, windowObject, getPoints } = fixture;
  const layers = [
    { alpha: 0.34, radius: 0.42, parallax: 0.16 },
    { alpha: 0.52, radius: 0.64, parallax: 0.34 },
    { alpha: 1, radius: 0.92, parallax: 0.58 },
  ];
  assert.ok(renderer.getSnapshot().samplingStride > 1, 'exercise the bounded sampling path');
  for (const origin of [-4096.5, -0.5, 122.1, 4095.5, 12287.5]) {
    renderer.setCamera(origin, origin, 720, 450);
    windowObject.flushAnimationFrames();
    const before = getPoints();
    const stride = renderer.getSnapshot().samplingStride;
    renderer.setCamera(origin + 2, origin + 1, 720, 450);
    windowObject.flushAnimationFrames();
    const after = getPoints();
    assert.equal(renderer.getSnapshot().samplingStride, stride);
    for (const point of before.filter((p) => p.x > 16 && p.x < 1424 && p.y > 16 && p.y < 884)) {
      const layer = layers.find((value) => value.alpha === point.alpha);
      const depth = layer.parallax * point.radius / (2 * layer.radius);
      assert.ok(after.some((next) => next.color === point.color
        && Math.abs(next.radius - point.radius) < 1e-8
        && Math.abs(next.x - (point.x - 2 * depth)) < 1e-7
        && Math.abs(next.y - (point.y - depth)) < 1e-7), 'every interior point must move continuously');
    }
    assert.ok(after.length <= 512);
    assert.equal(windowObject.frames.size, 0);
  }
  renderer.destroy();
});

test('depth controls preserve point identity, form a precise grid at zero randomness, and honor reduced motion', () => {
  const { renderer, windowObject, getPoints } = depthFixture({ dotDensity: 0.2, dotRandomness: 0 });
  const sparse = getPoints();
  assert.ok(sparse.length > 0);
  renderer.configure({ dotDensity: 1 });
  windowObject.flushAnimationFrames();
  const dense = getPoints();
  assert.ok(dense.length > sparse.length);
  assert.ok(sparse.every((point) => dense.some((next) => JSON.stringify(next) === JSON.stringify(point))));
  const spacingByAlpha = new Map([[0.34, 72 * 1.7], [0.52, 72 * 1.15], [1, 72 * 0.82]]);
  for (const point of dense) {
    const spacing = spacingByAlpha.get(point.alpha);
    const x = (point.x - 720) / spacing;
    const y = (point.y - 450) / spacing;
    assert.ok(Math.abs(x - Math.round(x)) < 1e-8);
    assert.ok(Math.abs(y - Math.round(y)) < 1e-8);
  }
  renderer.configure({ dotRandomness: 1 });
  windowObject.flushAnimationFrames();
  assert.notDeepEqual(getPoints(), dense);
  renderer.configure({ reducedMotion: true });
  windowObject.flushAnimationFrames();
  const staticField = getPoints();
  renderer.setCamera(7000, -6000, 720, 450);
  windowObject.flushAnimationFrames();
  assert.deepEqual(getPoints(), staticField);
  renderer.configure({ dotDensity: 0 });
  windowObject.flushAnimationFrames();
  assert.equal(getPoints().length, 0);
  assert.equal(renderer.getSnapshot().drawnDotCount, 0);
  renderer.destroy();
});

test('the full-density depth field remains bounded on an ultrawide high-DPR viewport', () => {
  const { renderer, windowObject, getPoints } = depthFixture({ dotDensity: 1 }, 3440.5, 1600.5);
  assert.ok(getPoints().length > 0 && getPoints().length <= 1800);
  assert.equal(renderer.getSnapshot().dpr, 2);
  assert.equal(windowObject.frames.size, 0);
  renderer.destroy();
});

test('dot renderer clamps DPR, draws only on changes, pauses, and cleans up', () => {
  const windowObject = new FakeWindow();
  const documentObject = new FakeEventTarget();
  documentObject.visibilityState = 'visible';
  let arcCount = 0;
  let clearCount = 0;
  const arcPoints = [];
  let transform = [];
  const context = {
    globalAlpha: 1,
    fillStyle: '',
    beginPath() {},
    moveTo() {},
    arc(x, y, radius, startAngle, endAngle) {
      arcCount += 1;
      arcPoints.push({ x, y, radius, startAngle, endAngle });
    },
    fill() {},
    clearRect() { clearCount += 1; },
    setTransform(...values) { transform = values; },
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    getBoundingClientRect: () => ({ width: 192, height: 96.25 }),
  };
  const renderer = createPlaygroundDotFieldRenderer(canvas, {
    windowObject,
    documentObject,
    maximumDpr: 2,
    gridSpacingPx: 48,
    worldColumns: 80,
    worldRows: 56,
    viewportCenterX: 96,
    viewportCenterY: 48,
  });
  renderer.start();
  assert.equal(windowObject.frames.size, 1);
  windowObject.flushAnimationFrames();
  const firstSnapshot = renderer.getSnapshot();
  assert.equal(firstSnapshot.dpr, 2);
  assert.equal(canvas.width, 384);
  assert.equal(canvas.height, 193);
  assert.deepEqual(transform, [2, 0, 0, 193 / 96.25, 0, 0]);
  assert.equal(firstSnapshot.backingScaleX, canvas.width / firstSnapshot.width);
  assert.equal(firstSnapshot.backingScaleY, canvas.height / firstSnapshot.height);
  assert.ok(arcCount > 0);
  assert.equal(arcPoints.every(({ radius, startAngle, endAngle }) => (
    radius > 0 && startAngle === 0 && endAngle === Math.PI * 2
  )), true);
  assert.equal(arcPoints.some(({ x, y }) => x === 96 && y === 48), true);
  assert.equal(arcCount, firstSnapshot.visibleDotCount);
  assert.equal(firstSnapshot.drawCount, 1);

  renderer.setCamera(24, 12, 96, 48);
  assert.equal(windowObject.frames.size, 1);
  windowObject.flushAnimationFrames();
  assert.equal(renderer.getSnapshot().drawCount, 2);
  assert.equal(windowObject.frames.size, 0);

  renderer.setCamera(36, 18, 96, 48, true);
  const immediateSnapshot = renderer.getSnapshot();
  assert.equal(windowObject.frames.size, 0);
  assert.equal(immediateSnapshot.drawCount, 3);
  assert.equal(immediateSnapshot.lastDrawnCameraX, immediateSnapshot.cameraX);
  assert.equal(immediateSnapshot.lastDrawnCameraY, immediateSnapshot.cameraY);

  renderer.setPaused(true);
  renderer.setCamera(48, 24, 96, 48);
  assert.equal(windowObject.frames.size, 0);
  renderer.setPaused(false);
  assert.equal(windowObject.frames.size, 1);
  renderer.destroy();
  assert.equal(windowObject.frames.size, 0);
  assert.equal(windowObject.listenerCount(), 0);
  assert.equal(documentObject.listenerCount(), 0);
  assert.ok(clearCount >= 2);
});

test('dot renderer exposes only the neutral grid material', () => {
  const windowObject = new FakeWindow();
  const documentObject = new FakeEventTarget();
  documentObject.visibilityState = 'visible';
  const fills = [];
  const context = {
    globalAlpha: 1,
    fillStyle: '',
    beginPath() {},
    moveTo() {},
    arc() {},
    fill() {
      fills.push({ color: this.fillStyle, alpha: this.globalAlpha });
    },
    clearRect() {},
    setTransform() {},
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    getBoundingClientRect: () => ({ width: 320, height: 240 }),
  };
  const renderer = createPlaygroundDotFieldRenderer(canvas, {
    windowObject,
    documentObject,
    gridSpacingPx: 28,
    worldColumns: 80,
    worldRows: 56,
    viewportCenterX: 160,
    viewportCenterY: 120,
    dotOpacity: 0.28,
  });

  renderer.start();
  windowObject.flushAnimationFrames(16.67);
  assert.deepEqual(fills.at(-1), { color: '#8a8a8a', alpha: 0.28 });
  assert.equal(renderer.setPointer, undefined);
  assert.equal(renderer.setPalette, undefined);
  assert.deepEqual(
    Object.keys(renderer.getSnapshot()).filter((key) => /colorWake|palette|pointer|ColoredDot/.test(key)),
    [],
  );
  assert.equal(windowObject.frames.size, 0);
  renderer.destroy();
});

test('Work depth field is deterministic, bounded, redraw-on-change, and parallax-scaled', () => {
  const windowObject = new FakeWindow();
  const documentObject = new FakeEventTarget();
  documentObject.visibilityState = 'visible';
  const fills = [];
  let activePoints = [];
  const context = {
    globalAlpha: 1,
    fillStyle: '',
    beginPath() { activePoints = []; },
    moveTo() {},
    arc(x, y, radius) { activePoints.push({ x, y, radius }); },
    fill() {
      fills.push({
        alpha: this.globalAlpha,
        color: this.fillStyle,
        points: activePoints,
      });
    },
    clearRect() {},
    setTransform() {},
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    getBoundingClientRect: () => ({ width: 320, height: 240 }),
  };
  const renderer = createPlaygroundDotFieldRenderer(canvas, {
    windowObject,
    documentObject,
    fieldMode: 'depth',
    gridSpacingPx: 48,
    dotRandomness: 0,
    maximumVisibleDots: 512,
    viewportCenterX: 160,
    viewportCenterY: 120,
  });

  renderer.start();
  windowObject.flushAnimationFrames(16.67);
  const firstSnapshot = renderer.getSnapshot();
  const firstFarPoint = fills[0].points[0];
  assert.equal(firstSnapshot.fieldMode, 'depth');
  assert.equal(firstSnapshot.depthLayerCount, 3);
  assert.equal(fills.length, 3);
  assert.equal(
    firstSnapshot.drawnDotCount,
    fills.reduce((total, fill) => total + fill.points.length, 0),
  );
  assert.ok(firstSnapshot.drawnDotCount <= firstSnapshot.visibleDotCount);
  assert.ok(fills[0].alpha < fills[1].alpha && fills[1].alpha < fills[2].alpha);
  assert.ok(
    fills[0].points[0].radius < fills[1].points[0].radius
      && fills[1].points[0].radius < fills[2].points[0].radius,
  );
  assert.equal(windowObject.frames.size, 0, 'stable depth field should sleep');

  fills.length = 0;
  renderer.setCamera(4, 0, 160, 120);
  assert.equal(windowObject.frames.size, 1);
  windowObject.flushAnimationFrames(33.34);
  const secondFarPoint = fills[0].points[0];
  assert.ok(Math.abs((secondFarPoint.x - firstFarPoint.x) + 0.64) < 0.001);
  assert.equal(windowObject.frames.size, 0, 'camera redraw should settle in one frame');

  renderer.destroy();
});
