// A mouse can hover; touch and pen must own a live contact. No grab or release throw.
export function createCohesionPointer() {
  return { active: false, pointerId: null, pointerType: 'mouse', sequence: null,
    x: 0, y: 0, fromX: 0, fromY: 0, vx: 0, vy: 0, time: 0 };
}

export function resetCohesionPointer(pointer) {
  pointer.active = false;
  pointer.pointerId = null;
  pointer.sequence = null;
  pointer.vx = 0;
  pointer.vy = 0;
  pointer.time = 0;
  pointer.fromX = pointer.x;
  pointer.fromY = pointer.y;
}

export function updateCohesionPointer(pointer, type, detail) {
  if (!detail || detail.isPrimary === false) return;
  const pointerType = detail.pointerType || 'mouse';
  const samePointer = pointer.pointerId === (detail.pointerId ?? null);
  if (pointer.active && pointer.pointerType !== 'mouse'
    && (!samePointer || pointerType !== pointer.pointerType)) return;
  if (type === 'cancel' || !detail.inBounds) {
    resetCohesionPointer(pointer);
    return;
  }
  if (type === 'up') {
    if (!samePointer) return;
    resetCohesionPointer(pointer);
    // Mouse release keeps contact at the current location, without a release impulse.
    if (pointerType !== 'mouse') return;
  } else if (type !== 'move' && type !== 'down') return;
  if (pointerType !== 'mouse' && type !== 'down') {
    if (!pointer.active || !samePointer) return;
    if (detail.active === false) {
      resetCohesionPointer(pointer);
      return;
    }
  }
  if (!Number.isFinite(detail.x) || !Number.isFinite(detail.y)) return;

  const time = Number.isFinite(detail.time) ? detail.time : performance.now();
  const seed = !pointer.active || !samePointer || type === 'down'
    || pointer.sequence !== (detail.sequence ?? null) || detail.justEnteredCanvas === true;
  if (seed) {
    pointer.fromX = detail.x;
    pointer.fromY = detail.y;
    pointer.vx = 0;
    pointer.vy = 0;
  } else {
    const dt = Math.max(0.008, (time - pointer.time) / 1000);
    pointer.vx += ((detail.x - pointer.x) / dt - pointer.vx) * 0.52;
    pointer.vy += ((detail.y - pointer.y) / dt - pointer.vy) * 0.52;
  }
  pointer.active = true;
  pointer.pointerId = detail.pointerId ?? null;
  pointer.pointerType = pointerType;
  pointer.sequence = detail.sequence ?? null;
  pointer.x = detail.x;
  pointer.y = detail.y;
  pointer.time = time;
}

export function finishCohesionPointerStep(pointer, dt) {
  pointer.fromX = pointer.x;
  pointer.fromY = pointer.y;
  const decay = Math.exp(-18 * dt);
  pointer.vx *= decay;
  pointer.vy *= decay;
}

// Positive, time-scaled normal impulse: moving away cannot pull a body along.
export function resolveCohesionPushSpeed(depth, closingSpeed, strength, motionTransfer, dt, dpr = 1) {
  const contact = Math.max(0, Math.min(1, depth));
  if (contact === 0 || strength <= 0 || dt <= 0) return 0;
  const push = 420 * dpr * strength * dt
    + Math.max(0, Math.min(1200 * dpr, closingSpeed))
      * (1 - Math.exp(-12 * strength * dt)) * motionTransfer;
  return Math.min(1500 * dpr * dt, push * contact);
}
