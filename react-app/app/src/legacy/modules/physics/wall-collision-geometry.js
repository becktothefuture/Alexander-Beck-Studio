const SQUIRCLE_SEGMENT_COUNT = 48;
const CONTACT_EPSILON_PX = 0.01;
const SQUIRCLE_X = new Float64Array(SQUIRCLE_SEGMENT_COUNT + 1);
const SQUIRCLE_Y = new Float64Array(SQUIRCLE_SEGMENT_COUNT + 1);

for (let index = 0; index <= SQUIRCLE_SEGMENT_COUNT; index += 1) {
  const angle = (index / SQUIRCLE_SEGMENT_COUNT) * Math.PI * 0.5;
  // CSS `corner-shape: squircle` is `superellipse(2)`, whose quarter-corner
  // contour has exponent 4: x^4 + y^4 = 1.
  SQUIRCLE_X[index] = Math.sqrt(Math.max(0, Math.cos(angle)));
  SQUIRCLE_Y[index] = Math.sqrt(Math.max(0, Math.sin(angle)));
}

function resolveRoundCorner(target, rdx, rdy, radius) {
  const outsideX = Math.max(rdx, 0);
  const outsideY = Math.max(rdy, 0);
  const outsideDistance = Math.hypot(outsideX, outsideY);
  const insideRect = Math.min(Math.max(rdx, rdy), 0);
  target.signedDistance = outsideDistance + insideRect - radius;

  if (rdx > 0 && rdy > 0 && outsideDistance > 1e-6) {
    target.normalX = rdx / outsideDistance;
    target.normalY = rdy / outsideDistance;
  } else if (rdx > rdy) {
    target.normalX = 1;
    target.normalY = 0;
  } else {
    target.normalX = 0;
    target.normalY = 1;
  }
}

function resolveSquircleCorner(target, rdx, rdy, radius) {
  // Outside the quarter-corner square the nearest boundary remains one of the
  // straight wall segments. This also preserves exact normals at the joins.
  if (rdx <= 0 || rdy <= 0) {
    target.signedDistance = Math.max(rdx, rdy) - radius;
    if (rdx > rdy) {
      target.normalX = 1;
      target.normalY = 0;
    } else {
      target.normalX = 0;
      target.normalY = 1;
    }
    return;
  }

  let closestDistanceSquared = Infinity;
  let closestX = radius;
  let closestY = 0;

  // The normalized curve is immutable and shared. Only corner contacts take
  // this bounded path; straight walls never enter the loop.
  for (let index = 0; index < SQUIRCLE_SEGMENT_COUNT; index += 1) {
    const startX = SQUIRCLE_X[index] * radius;
    const startY = SQUIRCLE_Y[index] * radius;
    const segmentX = (SQUIRCLE_X[index + 1] * radius) - startX;
    const segmentY = (SQUIRCLE_Y[index + 1] * radius) - startY;
    const segmentLengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
    const projection = segmentLengthSquared > 1e-12
      ? Math.max(0, Math.min(1, (
        ((rdx - startX) * segmentX) + ((rdy - startY) * segmentY)
      ) / segmentLengthSquared))
      : 0;
    const pointX = startX + (segmentX * projection);
    const pointY = startY + (segmentY * projection);
    const deltaX = rdx - pointX;
    const deltaY = rdy - pointY;
    const distanceSquared = (deltaX * deltaX) + (deltaY * deltaY);
    if (distanceSquared >= closestDistanceSquared) continue;
    closestDistanceSquared = distanceSquared;
    closestX = pointX;
    closestY = pointY;
  }

  const normalizedX = rdx / Math.max(radius, 1e-6);
  const normalizedY = rdy / Math.max(radius, 1e-6);
  const xSquared = normalizedX * normalizedX;
  const ySquared = normalizedY * normalizedY;
  const isOutside = ((xSquared * xSquared) + (ySquared * ySquared)) > 1;
  const distance = Math.sqrt(Math.max(0, closestDistanceSquared));
  target.signedDistance = isOutside ? distance : -distance;

  // The gradient of x^4 + y^4 provides the exact outward normal of the CSS
  // squircle at the nearest sampled point.
  const gradientX = closestX * closestX * closestX;
  const gradientY = closestY * closestY * closestY;
  const gradientLength = Math.hypot(gradientX, gradientY);
  if (gradientLength > 1e-9) {
    target.normalX = gradientX / gradientLength;
    target.normalY = gradientY / gradientLength;
  } else {
    target.normalX = Math.SQRT1_2;
    target.normalY = Math.SQRT1_2;
  }
}

/**
 * Resolve a circular body's violation of a round/squircle rectangular interior.
 * The caller owns `target`; this function allocates nothing during simulation.
 */
export function resolveInteriorWallViolation(
  target,
  localX,
  localY,
  halfWidth,
  halfHeight,
  cornerRadius,
  margin,
  useSquircle,
) {
  const hx = Math.max(0.5, Number(halfWidth) || 0.5);
  const hy = Math.max(0.5, Number(halfHeight) || 0.5);
  const radius = Math.max(0, Math.min(Number(cornerRadius) || 0, hx, hy));
  const ax = Math.abs(Number(localX) || 0);
  const ay = Math.abs(Number(localY) || 0);
  const rdx = ax - (hx - radius);
  const rdy = ay - (hy - radius);

  if (useSquircle && radius > 0) resolveSquircleCorner(target, rdx, rdy, radius);
  else resolveRoundCorner(target, rdx, rdy, radius);

  target.normalX *= localX < 0 ? -1 : 1;
  target.normalY *= localY < 0 ? -1 : 1;
  target.penetration = target.signedDistance + Math.max(0, Number(margin) || 0);
  return target.penetration > CONTACT_EPSILON_PX;
}
