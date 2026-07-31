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

test('camera controller bounds high-refresh drag work while retaining the latest pointer position', () => {
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
  assert.equal(updates.length, 2);
  assert.equal(windowObject.frames.size, 1);

  target.dispatch('pointermove', pointerEvent({ clientX: 160, clientY: 100, timeStamp: 21 }));
  windowObject.flushAnimationFrames(114);
  assert.equal(updates.length, 3);
  assert.equal(controller.getSnapshot().logicalX, -60);

  target.dispatch('pointercancel', pointerEvent({ clientX: 160, clientY: 100, timeStamp: 22 }));
  controller.destroy();
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
    palette: {
      paletteId: 'test',
      generation: 1,
      colors: ['#ffffff', '#ff0000'],
      distribution: [
        { colorIndex: 0, weight: 3 },
        { colorIndex: 1, weight: 1 },
      ],
    },
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

test('dot renderer wakes palette colours around the pointer and lets them persist', () => {
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
    fill() { fills.push({ color: this.fillStyle, alpha: this.globalAlpha }); },
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
    colorWakeRadiusPx: 56,
    colorWakePersistenceMs: 1000,
    colorWakeFadeMs: 2000,
    colorWakeOpacity: 0.72,
    colorWakeDensity: 1,
    colorWakeEdgeSoftness: 0.5,
    colorWakeDotScale: 1.25,
    palette: {
      paletteId: 'wake-test',
      generation: 1,
      colors: ['#ff0000', '#00ff00'],
      distribution: [
        { colorIndex: 0, weight: 1 },
        { colorIndex: 1, weight: 1 },
      ],
    },
  });

  renderer.start();
  windowObject.flushAnimationFrames(16.67);
  assert.equal(renderer.getSnapshot().activeColoredDotCount, 0);
  assert.deepEqual(fills.at(-1), { color: '#8a8a8a', alpha: 0.28 });

  renderer.setPointer(160, 120, true);
  windowObject.flushAnimationFrames(33.34);
  const hovered = renderer.getSnapshot();
  assert.ok(hovered.activeColoredDotCount > 0);
  assert.equal(hovered.hoveredColoredDotCount, hovered.activeColoredDotCount);
  assert.equal(hovered.risingColoredDotCount, 0);
  assert.equal(hovered.colorWakePersistenceMs, 1000);
  assert.equal(hovered.colorWakeFadeMs, 2000);
  assert.equal(hovered.colorWakeOpacity, 0.72);
  assert.equal(hovered.colorWakeDensity, 1);
  assert.equal(hovered.colorWakeEdgeSoftness, 0.5);
  assert.equal(hovered.colorWakeDotScale, 1.25);
  assert.ok(hovered.minimumInfluenceRadiusScale < hovered.maximumInfluenceRadiusScale);
  assert.ok(hovered.minimumInfluenceStrength < hovered.maximumInfluenceStrength);
  assert.ok(hovered.maximumInfluenceStrength > 0.9);
  assert.ok(hovered.minimumInfluenceStrength < 0.5);
  const immediateColorAlpha = Math.max(0, ...fills
    .filter(({ color }) => color === '#ff0000' || color === '#00ff00')
    .map(({ alpha }) => alpha));
  assert.equal(immediateColorAlpha, hovered.colorWakeOpacity);
  assert.equal(windowObject.frames.size, 0, 'an immediate stationary hover should let the renderer sleep');

  renderer.setPointer(0, 0, false);
  fills.length = 0;
  windowObject.flushAnimationFrames(66.68);
  const released = renderer.getSnapshot();
  assert.equal(released.pointerActive, false);
  assert.ok(released.fadingColoredDotCount > 0);
  assert.equal(windowObject.frames.size, 1);

  fills.length = 0;
  windowObject.flushAnimationFrames(1066.68);
  const heldColorAlpha = Math.max(0, ...fills
    .filter(({ color }) => color === '#ff0000' || color === '#00ff00')
    .map(({ alpha }) => alpha));
  assert.equal(heldColorAlpha, immediateColorAlpha);

  fills.length = 0;
  windowObject.flushAnimationFrames(2066.68);
  const fadingColorAlpha = Math.max(0, ...fills
    .filter(({ color }) => color === '#ff0000' || color === '#00ff00')
    .map(({ alpha }) => alpha));
  assert.ok(fadingColorAlpha > 0 && fadingColorAlpha < heldColorAlpha);

  windowObject.flushAnimationFrames(3066.68);
  assert.equal(renderer.getSnapshot().activeColoredDotCount, 0);
  assert.equal(windowObject.frames.size, 0);
  renderer.destroy();
});
