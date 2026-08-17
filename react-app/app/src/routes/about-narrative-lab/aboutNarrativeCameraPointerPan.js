const RESPONSE_99_PERCENT = 4.60517;

export const ABOUT_NARRATIVE_CAMERA_POINTER_PAN_DEFAULTS = Object.freeze({
  amountDegrees: 2.4,
  responseMs: 620,
});

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function finiteOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function damp(current, target, deltaSeconds, responseMs) {
  if (responseMs <= 0) return target;
  const alpha = 1 - Math.exp((-RESPONSE_99_PERCENT * deltaSeconds) / (responseMs / 1000));
  return current + ((target - current) * alpha);
}

export function createAboutNarrativeCameraPointerPanSample() {
  return {
    active: false,
    x: 0,
    y: 0,
    yawDegrees: 0,
    pitchDegrees: 0,
  };
}

/**
 * Allocation-free passive camera input. It only supplies a small local look
 * offset; the authored ride remains the sole owner of camera position and roll.
 */
export function createAboutNarrativeCameraPointerPanController({
  initialNowMs = 0,
} = {}) {
  let viewportLeft = 0;
  let viewportTop = 0;
  let viewportWidth = 1;
  let viewportHeight = 1;
  let amountDegrees = ABOUT_NARRATIVE_CAMERA_POINTER_PAN_DEFAULTS.amountDegrees;
  let responseMs = ABOUT_NARRATIVE_CAMERA_POINTER_PAN_DEFAULTS.responseMs;
  let pointerInside = false;
  let pointerType = '';
  let pointerButtons = 0;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let lastUpdateMs = finiteOr(initialNowMs, 0);

  const setViewport = (left, top, width, height) => {
    viewportLeft = finiteOr(left, 0);
    viewportTop = finiteOr(top, 0);
    viewportWidth = Math.max(1, finiteOr(width, 1));
    viewportHeight = Math.max(1, finiteOr(height, 1));
  };

  const configure = (camera = {}) => {
    amountDegrees = clamp(finiteOr(camera.pointerPanDegrees, 0), 0, 8);
    responseMs = clamp(
      finiteOr(camera.pointerPanResponseMs, ABOUT_NARRATIVE_CAMERA_POINTER_PAN_DEFAULTS.responseMs),
      80,
      2000,
    );
  };

  const setPointerNdc = (x, y, nextPointerType = 'mouse', buttons = 0) => {
    pointerType = String(nextPointerType || 'mouse');
    pointerButtons = Number(buttons) || 0;
    pointerInside = true;
    targetX = clamp(finiteOr(x, 0), -1, 1);
    targetY = clamp(finiteOr(y, 0), -1, 1);
  };

  const setPointerFromClient = (
    clientX,
    clientY,
    nextPointerType = 'mouse',
    buttons = 0,
  ) => {
    setPointerNdc(
      (((finiteOr(clientX, viewportLeft) - viewportLeft) / viewportWidth) * 2) - 1,
      1 - (((finiteOr(clientY, viewportTop) - viewportTop) / viewportHeight) * 2),
      nextPointerType,
      buttons,
    );
  };

  const setPointerOutside = (nextPointerType = pointerType) => {
    pointerType = String(nextPointerType || pointerType || 'mouse');
    pointerInside = false;
    pointerButtons = 0;
    targetX = 0;
    targetY = 0;
  };

  const clear = (target) => {
    pointerInside = false;
    pointerButtons = 0;
    targetX = 0;
    targetY = 0;
    currentX = 0;
    currentY = 0;
    if (target) {
      target.active = false;
      target.x = 0;
      target.y = 0;
      target.yawDegrees = 0;
      target.pitchDegrees = 0;
    }
    return target;
  };

  const sampleInto = (
    target,
    nowMs,
    reducedMotion = false,
    hidden = false,
    finePointer = true,
  ) => {
    const nextNowMs = finiteOr(nowMs, lastUpdateMs);
    const deltaSeconds = clamp((nextNowMs - lastUpdateMs) / 1000, 0, 0.1);
    lastUpdateMs = nextNowMs;
    if (reducedMotion || hidden || !finePointer) return clear(target);

    const mouseInside = pointerInside && pointerType === 'mouse';
    const eligible = mouseInside && pointerButtons === 0;
    // A press is an interaction, not camera input. Hold the current passive
    // look exactly so clicking cannot create a centre-and-return camera pulse.
    const held = mouseInside && pointerButtons > 0;
    if (!held) {
      currentX = damp(currentX, eligible ? targetX : 0, deltaSeconds, responseMs);
      currentY = damp(currentY, eligible ? targetY : 0, deltaSeconds, responseMs);
    }
    if (Math.abs(currentX) < 0.00001) currentX = 0;
    if (Math.abs(currentY) < 0.00001) currentY = 0;
    target.active = amountDegrees > 0 && (currentX !== 0 || currentY !== 0);
    target.x = currentX;
    target.y = currentY;
    target.yawDegrees = -currentX * amountDegrees;
    target.pitchDegrees = currentY * amountDegrees;
    return target;
  };

  const getSnapshot = () => Object.freeze({
    active: amountDegrees > 0 && (currentX !== 0 || currentY !== 0),
    pointerInside,
    pointerType,
    amountDegrees,
    responseMs,
    x: currentX,
    y: currentY,
    yawDegrees: -currentX * amountDegrees,
    pitchDegrees: currentY * amountDegrees,
  });

  return Object.freeze({
    setViewport,
    configure,
    setPointerNdc,
    setPointerFromClient,
    setPointerOutside,
    sampleInto,
    clear,
    getSnapshot,
  });
}
