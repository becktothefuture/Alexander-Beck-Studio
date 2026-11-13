import Matter from 'matter-js';

const { Body, Sleeping } = Matter;

/** The seal can close once the actual circles clear its volume and the pocket
 * between it and the valve. Live Matter proxies only update their centres. */
export function reservoirSealIsClear(balls, { min, max }, { pivot, end }) {
  const slope = (end[1] - pivot[1]) / (end[0] - pivot[0]);
  return !balls.some(({ position: { x, y }, circleRadius: radius }) => {
    const dx = Math.max(min.x - x, x - max.x, 0);
    const dy = Math.max(min.y - y, y - max.y, 0);
    if (dx * dx + dy * dy < radius * radius) return true;
    const closedArmY = pivot[1] + (x - pivot[0]) * slope;
    return dx < radius && y < min.y && y > closedArmY;
  });
}

/** A light, staggered clearing impulse breaks stable arches between bumpers.
 * Native contacts and gravity still own the position and outlet crossing. */
export function releaseStalledBoardBall(body, deltaMs, gatesOpen) {
  if (!gatesOpen || body.velocity.x ** 2 + body.velocity.y ** 2 > .0025) {
    if (body.plugin.boardStillMs) body.plugin.boardStillMs = 0;
    return false;
  }
  const stillMs = (body.plugin.boardStillMs || 0) + deltaMs;
  body.plugin.boardStillMs = stillMs;
  if (stillMs < 2000 + (body.id % 7) * 120) return false;
  body.plugin.boardStillMs = 0;
  const impulse = body.circleRadius * .06;
  Sleeping.set(body, false);
  Body.setVelocity(body, {
    x: body.velocity.x + (body.id % 2 ? -1 : 1) * impulse * .75,
    y: body.velocity.y - impulse,
  });
  return true;
}
