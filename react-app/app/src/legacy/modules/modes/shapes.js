import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { MODES } from '../core/constants.js';
import { getColorByIndex } from '../visual/colors.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';
import { subscribeScenePointer } from '../input/pointer.js';
import { getSimulationCollisionInsetPx } from '../utils/frame-geometry.js';

const SHAPE_TYPES = [
  'right-triangle',
  'square',
  'circle',
  'plus',
  'hexagon',
];

const EXTRA_LARGE_SHAPE_TYPES = new Set(['square', 'circle', 'plus']);
const EXTRA_LARGE_SHAPE_SCALE = 2.05;
const DROP_INITIAL_HOLD_SECONDS = 0.75;
const DROP_SHAPE_DELAY_SECONDS = 0.62;
const DROP_X_RATIOS = [0.28, 0.62, 0.42, 0.76, 0.52];
const DRAG_SAMPLE_COUNT = 5;
const DRAG_SAMPLE_MAX_AGE_MS = 120;
const SHAPES_SUBSTEP_SECONDS = 1 / 120;
const SHAPES_MAX_SUBSTEPS = 4;
const SHAPES_MAX_HELD_ANGLE_CORRECTION = 0.07;
const SHAPES_MIN_RELEASE_SPEED = 30;
const SHAPES_MIN_RELEASE_SPIN = 0.08;

let unsubscribePointer = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampInt(value, min, max, fallback) {
  const next = Math.round(Number(value));
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function hash01(seed) {
  return (Math.sin(seed * 127.1 + 311.7) * 43758.5453123) % 1;
}

function positiveHash01(seed) {
  const next = hash01(seed);
  return next < 0 ? next + 1 : next;
}

function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  } catch (e) {
    return false;
  }
}

function isCompactViewport(g, canvas) {
  return Boolean(g.isMobile || g.isMobileViewport || canvas.width < canvas.height * 0.9);
}

function getDistributionColorInfo(g, shapeIndex) {
  const dist = Array.isArray(g.colorDistribution) ? g.colorDistribution : [];
  const row = dist[shapeIndex % Math.max(1, dist.length)];
  const rawIndex = Number(row?.colorIndex);
  const colorIndex = Number.isFinite(rawIndex) ? clampInt(rawIndex, 0, 7, shapeIndex % 8) : shapeIndex % 8;
  return {
    colorIndex,
    distributionIndex: dist.length ? shapeIndex % dist.length : shapeIndex % 6,
  };
}

function getShapeColor(g, shapeIndex, pointIndex, rowIndex, colIndex) {
  const paletteSlot = Math.floor(positiveHash01(shapeIndex * 101 + rowIndex * 37 + colIndex * 59 + pointIndex * 11) * 48);
  const palette = getDistributionColorInfo(g, paletteSlot);
  return {
    color: getColorByIndex(palette.colorIndex),
    distributionIndex: palette.distributionIndex,
  };
}

function getInteriorMargin(g, dotRadius) {
  const collisionInset = getSimulationCollisionInsetPx(g);
  return Math.max(collisionInset + dotRadius * 4, dotRadius * 7);
}

function getShapeCenters(g, canvas, dotRadius, count = SHAPE_TYPES.length) {
  const compact = isCompactViewport(g, canvas);
  const margin = getInteriorMargin(g, dotRadius);
  const minX = margin;
  const maxX = Math.max(minX, canvas.width - margin);
  const minY = margin;
  const maxY = Math.max(minY, canvas.height - margin);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  if (compact) {
    const columns = 2;
    const rows = Math.ceil(count / columns);
    return Array.from({ length: count }, (_, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      return {
        x: minX + spanX * (col === 0 ? 0.28 : 0.72),
        y: minY + spanY * (0.07 + (row / Math.max(1, rows)) * 0.46),
      };
    });
  }

  const columns = count > 8 ? 5 : 4;
  const rows = Math.ceil(count / columns);
  return Array.from({ length: count }, (_, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: minX + spanX * (0.12 + (col / Math.max(1, columns - 1)) * 0.76),
      y: minY + spanY * (0.065 + (row / Math.max(1, rows)) * 0.25),
    };
  });
}

function makeCenteredRows(counts, align = 'center') {
  return counts.map((count) => ({ count, align }));
}

function makeCircleRows(desiredCount) {
  const diameter = clampInt(Math.round(Math.sqrt((desiredCount * 4) / Math.PI)), 5, 12, 7);
  const mid = (diameter - 1) * 0.5;
  const rows = [];
  for (let r = 0; r < diameter; r += 1) {
    const y = r - mid;
    const half = Math.sqrt(Math.max(0, mid * mid - y * y));
    rows.push(Math.max(3, Math.round(half * 2) + 1));
  }
  return makeCenteredRows(rows);
}

function makePlusRows(desiredCount) {
  const span = clampInt(Math.round(Math.sqrt(desiredCount * 1.9)), 6, 13, 7);
  const arm = Math.max(2, Math.round(span / 3));
  const sideRows = Math.max(2, Math.floor((span - arm) / 2));
  const rows = [];

  for (let i = 0; i < sideRows; i += 1) rows.push(arm);
  for (let i = 0; i < arm; i += 1) rows.push(span);
  for (let i = 0; i < sideRows; i += 1) rows.push(arm);

  return makeCenteredRows(rows);
}

function makeHexagonRows(desiredCount, reduced = false) {
  const maxWidth = reduced ? 7 : 10;
  const fallbackWidth = reduced ? 7 : 6;
  const width = clampInt(Math.round(Math.sqrt(desiredCount * 1.5)), 5, maxWidth, fallbackWidth);
  const top = Math.max(3, width - 2);
  const middleRows = Math.max(1, Math.round(width * 0.42));
  const rows = [top, width - 1];
  for (let i = 0; i < middleRows; i += 1) rows.push(width);
  rows.push(width - 1, top);
  return makeCenteredRows(rows);
}

function getShapeScale(type) {
  if (EXTRA_LARGE_SHAPE_TYPES.has(type)) return EXTRA_LARGE_SHAPE_SCALE;
  return 1;
}

function getDropXRatio(index) {
  return DROP_X_RATIOS[index % DROP_X_RATIOS.length];
}

function buildShapeRows(type, desiredCount) {
  switch (type) {
    case 'right-triangle': {
      const side = clampInt(Math.round((Math.sqrt(8 * desiredCount + 1) - 1) / 2), 5, 7, 6);
      const rows = [];
      for (let count = 1; count <= side; count += 1) rows.push({ count, align: 'left' });
      return rows;
    }
    case 'square': {
      const side = clampInt(Math.round(Math.sqrt(desiredCount)), 5, 11, 7);
      return makeCenteredRows(Array.from({ length: side }, () => side));
    }
    case 'circle':
      return makeCircleRows(desiredCount);
    case 'plus':
      return makePlusRows(desiredCount);
    case 'hexagon':
      return makeHexagonRows(desiredCount, true);
    default:
      return makeCenteredRows([5, 5, 5, 5, 5]);
  }
}

function buildShapePoints(type, spacing, desiredCount) {
  const rows = buildShapeRows(type, desiredCount);
  const points = [];
  for (let row = 0; row < rows.length; row += 1) {
    const spec = rows[row];
    const y = row * spacing;
    if (Array.isArray(spec.cols)) {
      const width = Math.max(1, Number(spec.width) || 1);
      const mid = (width - 1) * 0.5;
      for (let i = 0; i < spec.cols.length; i += 1) {
        const col = spec.cols[i];
        points.push({
          lx: (col - mid) * spacing,
          ly: y,
          row,
          col,
        });
      }
      continue;
    }

    const startX = spec.align === 'left' ? 0 : -((spec.count - 1) * spacing) * 0.5;
    for (let col = 0; col < spec.count; col += 1) {
      points.push({
        lx: startX + col * spacing,
        ly: y,
        row,
        col,
      });
    }
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    minX = Math.min(minX, point.lx);
    maxX = Math.max(maxX, point.lx);
    minY = Math.min(minY, point.ly);
    maxY = Math.max(maxY, point.ly);
  }

  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  for (let i = 0; i < points.length; i += 1) {
    points[i].lx -= centerX;
    points[i].ly -= centerY;
  }

  return points;
}

function measureBody(points, dotRadius) {
  let radius = dotRadius;
  let extentX = dotRadius;
  let extentY = dotRadius;
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    radius = Math.max(radius, Math.hypot(point.lx, point.ly) + dotRadius);
    extentX = Math.max(extentX, Math.abs(point.lx) + dotRadius);
    extentY = Math.max(extentY, Math.abs(point.ly) + dotRadius);
  }
  return { radius, extentX, extentY };
}

function getBodyInvMass(body) {
  if (!body || body.isDragged || body.isPending) return 0;
  return body.invMass || 0;
}

function getBodyInvInertia(body) {
  if (!body || body.isPending) return 0;
  if (body.isDragged) return body.dragInvPivotInertia || 0;
  return body.invInertia || 0;
}

function getBodyContactArmX(body, rx) {
  return body?.isDragged ? rx - (body.dragGrabWorldX || 0) : rx;
}

function getBodyContactArmY(body, ry) {
  return body?.isDragged ? ry - (body.dragGrabWorldY || 0) : ry;
}

function applyBodyImpulse(body, rx, ry, ix, iy) {
  const invMass = getBodyInvMass(body);
  const invInertia = getBodyInvInertia(body);
  if (invMass <= 0 && invInertia <= 0) return;
  body.vx += ix * invMass;
  body.vy += iy * invMass;
  const armX = getBodyContactArmX(body, rx);
  const armY = getBodyContactArmY(body, ry);
  body.omega += (armX * iy - armY * ix) * invInertia;
  if (body.isDragged) {
    const maxAngular = Math.max(0.5, Number(body.dragMaxAngularSpeed) || 8);
    body.omega = clamp(body.omega, -maxAngular, maxAngular);
  }
}

function getContactVelocity(body, rx, ry) {
  if (body?.isDragged) {
    const armX = getBodyContactArmX(body, rx);
    const armY = getBodyContactArmY(body, ry);
    return {
      x: (body.dragAnchorVx || 0) - body.omega * armY,
      y: (body.dragAnchorVy || 0) + body.omega * armX,
    };
  }
  return {
    x: body.vx - body.omega * ry,
    y: body.vy + body.omega * rx,
  };
}

function syncHeldBodyPose(body) {
  if (!body?.isDragged) return;
  const cos = Math.cos(body.angle);
  const sin = Math.sin(body.angle);
  const grabWorldX = body.dragGrabLocalX * cos - body.dragGrabLocalY * sin;
  const grabWorldY = body.dragGrabLocalX * sin + body.dragGrabLocalY * cos;
  body.dragGrabWorldX = grabWorldX;
  body.dragGrabWorldY = grabWorldY;
  body.x = body.dragAnchorX - grabWorldX;
  body.y = body.dragAnchorY - grabWorldY;
  body.vx = body.dragAnchorVx + body.omega * grabWorldY;
  body.vy = body.dragAnchorVy - body.omega * grabWorldX;
}

function applyHeldAngularCorrection(body, rx, ry, nx, ny, penetration) {
  if (!body?.isDragged || penetration <= 0) return false;
  const armX = getBodyContactArmX(body, rx);
  const armY = getBodyContactArmY(body, ry);
  const leverage = armX * ny - armY * nx;
  const minLeverage = Math.max(0.5, body.dotRadius * 0.08);
  if (Math.abs(leverage) < minLeverage) return false;
  const softness = Math.max(1, body.dotRadius * body.dotRadius * 0.16);
  const correction = clamp(
    (penetration * leverage) / (leverage * leverage + softness),
    -SHAPES_MAX_HELD_ANGLE_CORRECTION,
    SHAPES_MAX_HELD_ANGLE_CORRECTION
  );
  if (Math.abs(correction) < 0.00001) return false;
  body.angle += correction;
  syncHeldBodyPose(body);
  return true;
}

function applyRubberSquash(body, amount, normalAngle) {
  if (!body) return;
  const next = clamp(amount, 0, 0.18);
  if (next > body.rubberSquash) {
    body.rubberSquash = next;
    body.rubberSquashAngle = normalAngle;
  }
}

function createShapeBodies(g, count, dotRadius) {
  const canvas = g.canvas;
  const centers = getShapeCenters(g, canvas, dotRadius * EXTRA_LARGE_SHAPE_SCALE, SHAPE_TYPES.length);
  const spacingMul = clamp(Number(g.shapesDotSpacingMul ?? 2.34), 1.95, 2.8);
  const basePerShape = Math.max(8, Math.floor(count / SHAPE_TYPES.length));
  const remainder = count - basePerShape * SHAPE_TYPES.length;
  const dpr = g.DPR || 1;
  const reduced = prefersReducedMotion();
  const bodies = [];
  const targets = [];

  for (let i = 0; i < SHAPE_TYPES.length; i += 1) {
    const type = SHAPE_TYPES[i];
    const shapeScale = getShapeScale(type);
    const baseDesiredCount = basePerShape + (i < remainder ? 1 : 0);
    const desiredCount = Math.round(baseDesiredCount * shapeScale * shapeScale);
    const bodyDotRadius = dotRadius;
    const spacing = dotRadius * spacingMul;
    const points = buildShapePoints(type, spacing, desiredCount);
    const measured = measureBody(points, bodyDotRadius);
    const center = centers[i];
    const mass = Math.max(1, points.length * shapeScale * shapeScale * 1.2);
    const dropDelay = reduced ? 0 : DROP_INITIAL_HOLD_SECONDS + i * DROP_SHAPE_DELAY_SECONDS;
    const spawnMargin = Math.max(getInteriorMargin(g, bodyDotRadius), measured.extentX + bodyDotRadius * 2);
    const spawnSpan = Math.max(1, canvas.width - spawnMargin * 2);
    const spawnX = spawnMargin + spawnSpan * getDropXRatio(i);
    const spawnY = -measured.extentY - bodyDotRadius * (2 + i * 0.18);
    const outwardVx = reduced ? 0 : clamp((center.x - spawnX) * 1.45, -520 * dpr, 520 * dpr);
    const dropSpinDirection = spawnX <= center.x ? 1 : -1;
    const body = {
      index: i,
      type,
      points,
      dotRadius: bodyDotRadius,
      shapeScale,
      mass,
      invMass: 1 / mass,
      invInertia: 1 / Math.max(1, mass * measured.radius * measured.radius * 0.72),
      radius: measured.radius,
      extentX: measured.extentX,
      extentY: measured.extentY,
      x: spawnX,
      y: spawnY,
      spawnX,
      spawnY,
      targetX: center.x,
      dropSpinDirection,
      dropDelay,
      isPending: dropDelay > 0,
      hasDropped: dropDelay <= 0,
      vx: dropDelay > 0 ? 0 : outwardVx,
      vy: dropDelay > 0 ? 0 : (reduced ? 20 : 80) * dpr,
      angle: (positiveHash01(i * 59 + 3) - 0.5) * 0.28,
      omega: dropDelay > 0 || reduced ? 0 : dropSpinDirection * (0.22 + positiveHash01(i * 97 + 13) * 0.26),
      isDragged: false,
      enteringFromTop: true,
      rubberSquash: 0,
      rubberSquashAngle: 0,
      collisionCooldown: 0,
      reducedMotionRelease: false,
      lastReleaseTargetVx: 0,
      lastReleaseTargetVy: 0,
      lastReleaseTargetOmega: 0,
      peakDragOmega: 0,
    };
    bodies.push(body);

    for (let j = 0; j < points.length; j += 1) {
      targets.push({
        body,
        shapeIndex: i,
        type,
        lx: points[j].lx,
        ly: points[j].ly,
        row: points[j].row,
        col: points[j].col,
      });
    }
  }

  return { bodies, targets };
}

function collideBodyWithWalls(body, g) {
  const canvas = g.canvas;
  const margin = getSimulationCollisionInsetPx(g);
  const rest = clamp(Number(g.shapesWallRestitution ?? 0.48), 0.05, 0.95);
  const friction = 1.28;
  const minX = margin;
  const maxX = canvas.width - margin;
  const minY = margin;
  const maxY = canvas.height - margin;
  const cos = Math.cos(body.angle);
  const sin = Math.sin(body.angle);
  const invMass = getBodyInvMass(body);
  const invInertia = getBodyInvInertia(body);
  const topEdge = body.y - body.extentY;
  if (body.enteringFromTop === true && topEdge >= minY) {
    body.enteringFromTop = false;
  }
  const allowTopEntry = body.enteringFromTop === true && body.vy >= -10 && topEdge < minY;

  for (let i = 0; i < body.points.length; i += 1) {
    const point = body.points[i];
    const rx = point.lx * cos - point.ly * sin;
    const ry = point.lx * sin + point.ly * cos;
    const wx = body.x + rx;
    const wy = body.y + ry;
    const r = body.dotRadius;

    if (wx - r < minX) {
      const corrected = resolveBodyWallContact(body, rx, ry, 1, 0, minX - (wx - r), rest, friction, invMass, invInertia);
      if (corrected && body.isDragged) return;
    }
    if (wx + r > maxX) {
      const corrected = resolveBodyWallContact(body, rx, ry, -1, 0, (wx + r) - maxX, rest, friction, invMass, invInertia);
      if (corrected && body.isDragged) return;
    }
    if (wy - r < minY && !allowTopEntry) {
      const corrected = resolveBodyWallContact(body, rx, ry, 0, 1, minY - (wy - r), rest, friction, invMass, invInertia);
      if (corrected && body.isDragged) return;
    }
    if (wy + r > maxY) {
      const corrected = resolveBodyWallContact(body, rx, ry, 0, -1, (wy + r) - maxY, rest, friction, invMass, invInertia);
      if (corrected && body.isDragged) return;
    }
  }
}

function resolveBodyWallContact(body, rx, ry, nx, ny, penetration, rest, friction, invMass, invInertia) {
  if (penetration <= 0) return false;

  if (invMass > 0) {
    body.x += nx * penetration * 0.94;
    body.y += ny * penetration * 0.94;
  }

  const velocity = getContactVelocity(body, rx, ry);
  const normalVelocity = velocity.x * nx + velocity.y * ny;
  const armX = getBodyContactArmX(body, rx);
  const armY = getBodyContactArmY(body, ry);
  const rxn = armX * ny - armY * nx;
  const normalDenom = invMass + rxn * rxn * invInertia;
  if (normalVelocity < 0 && normalDenom > 0) {
    const j = (-(1 + rest) * normalVelocity) / normalDenom;
    applyBodyImpulse(body, rx, ry, nx * j, ny * j);
    applyRubberSquash(body, Math.min(0.18, Math.abs(normalVelocity) / 1200), Math.atan2(-ny, -nx));
  }

  const tx = -ny;
  const ty = nx;
  const tangentVelocity = velocity.x * tx + velocity.y * ty;
  const rxt = armX * ty - armY * tx;
  const tangentDenom = invMass + rxt * rxt * invInertia;
  if (tangentDenom > 0) {
    const jt = -tangentVelocity / tangentDenom;
    const maxFriction = Math.max(0, Math.abs(normalVelocity) * friction * Math.max(1, body.mass * 0.015));
    const clamped = clamp(jt, -maxFriction, maxFriction);
    applyBodyImpulse(body, rx, ry, tx * clamped, ty * clamped);
  }

  if (!body.isDragged && ny < -0.5 && Math.abs(body.vy) < 14) {
    body.vy = 0;
    body.vx *= 0.94;
    body.omega *= 0.86;
  }

  return applyHeldAngularCorrection(body, rx, ry, nx, ny, penetration);
}

function resolveBodyCollisions(bodies) {
  const rest = 0.18;
  for (let i = 0; i < bodies.length; i += 1) {
    const a = bodies[i];
    if (a.isPending) continue;
    for (let j = i + 1; j < bodies.length; j += 1) {
      const b = bodies[j];
      if (b.isPending) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minDistance = a.radius + b.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 0.0001 || d2 >= minDistance * minDistance) continue;
      resolveBodyDotContacts(a, b, rest);
    }
  }
}

function resolveBodyDotContacts(a, b, rest) {
  const cosA = Math.cos(a.angle);
  const sinA = Math.sin(a.angle);
  const cosB = Math.cos(b.angle);
  const sinB = Math.sin(b.angle);
  const invMassA = getBodyInvMass(a);
  const invMassB = getBodyInvMass(b);
  const invInertiaA = getBodyInvInertia(a);
  const invInertiaB = getBodyInvInertia(b);
  const invMassSum = invMassA + invMassB;
  const minDistance = a.dotRadius + b.dotRadius;
  const minDistanceSq = minDistance * minDistance;
  const friction = 0.95;

  for (let i = 0; i < a.points.length; i += 1) {
    const pa = a.points[i];
    const rax = pa.lx * cosA - pa.ly * sinA;
    const ray = pa.lx * sinA + pa.ly * cosA;
    const wax = a.x + rax;
    const way = a.y + ray;

    for (let j = 0; j < b.points.length; j += 1) {
      const pb = b.points[j];
      const rbx = pb.lx * cosB - pb.ly * sinB;
      const rby = pb.lx * sinB + pb.ly * cosB;
      const wbx = b.x + rbx;
      const wby = b.y + rby;
      const dx = wbx - wax;
      const dy = wby - way;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 0.0001 || d2 >= minDistanceSq) continue;

      const distance = Math.sqrt(d2);
      const nx = dx / distance;
      const ny = dy / distance;
      const penetration = minDistance - distance;
      if (invMassSum > 0) {
        const correction = (penetration * 0.9) / invMassSum;
        a.x -= nx * correction * invMassA;
        a.y -= ny * correction * invMassA;
        b.x += nx * correction * invMassB;
        b.y += ny * correction * invMassB;
      }

      const va = getContactVelocity(a, rax, ray);
      const vb = getContactVelocity(b, rbx, rby);
      const rvx = vb.x - va.x;
      const rvy = vb.y - va.y;
      const normalVelocity = rvx * nx + rvy * ny;
      const armAx = getBodyContactArmX(a, rax);
      const armAy = getBodyContactArmY(a, ray);
      const armBx = getBodyContactArmX(b, rbx);
      const armBy = getBodyContactArmY(b, rby);
      const crossA = armAx * ny - armAy * nx;
      const crossB = armBx * ny - armBy * nx;
      const normalDenom = invMassA + invMassB + crossA * crossA * invInertiaA + crossB * crossB * invInertiaB;
      let normalImpulse = 0;
      if (normalVelocity < 0 && normalDenom > 0) {
        const impulse = (-(1 + rest) * normalVelocity) / normalDenom;
        normalImpulse = impulse;
        const ix = nx * impulse;
        const iy = ny * impulse;
        applyBodyImpulse(a, rax, ray, -ix, -iy);
        applyBodyImpulse(b, rbx, rby, ix, iy);
        const squash = Math.min(0.16, Math.abs(normalVelocity) / 1400);
        applyRubberSquash(a, squash, Math.atan2(-ny, -nx));
        applyRubberSquash(b, squash, Math.atan2(ny, nx));
      }

      const tx = -ny;
      const ty = nx;
      const tangentVelocity = rvx * tx + rvy * ty;
      const crossTa = armAx * ty - armAy * tx;
      const crossTb = armBx * ty - armBy * tx;
      const tangentDenom = invMassA + invMassB + crossTa * crossTa * invInertiaA + crossTb * crossTb * invInertiaB;
      if (tangentDenom > 0) {
        const maxFriction = Math.max(friction, Math.abs(normalImpulse) * friction);
        const tangentImpulse = clamp(-tangentVelocity / tangentDenom, -maxFriction, maxFriction);
        const ix = tx * tangentImpulse;
        const iy = ty * tangentImpulse;
        applyBodyImpulse(a, rax, ray, -ix, -iy);
        applyBodyImpulse(b, rbx, rby, ix, iy);
      }

      let correctedHeldBody = false;
      if (a.isDragged) {
        correctedHeldBody = applyHeldAngularCorrection(a, rax, ray, -nx, -ny, penetration) || correctedHeldBody;
      }
      if (b.isDragged) {
        correctedHeldBody = applyHeldAngularCorrection(b, rbx, rby, nx, ny, penetration) || correctedHeldBody;
      }
      if (correctedHeldBody) return;
    }
  }
}

function pointerMatches(interaction, detail) {
  if (!interaction || !detail) return false;
  if (interaction.pointerId === null || detail.pointerId === null) return true;
  return interaction.pointerId === detail.pointerId;
}

function findBodyAtPoint(g, x, y) {
  const bodies = g.shapesState?.bodies || [];
  for (let i = bodies.length - 1; i >= 0; i -= 1) {
    const body = bodies[i];
    if (body.isPending) continue;
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);
    const hitRadius = body.dotRadius * 1.32;
    const hitRadiusSq = hitRadius * hitRadius;
    for (let j = 0; j < body.points.length; j += 1) {
      const point = body.points[j];
      const rx = point.lx * cos - point.ly * sin;
      const ry = point.lx * sin + point.ly * cos;
      const dx = body.x + rx - x;
      const dy = body.y + ry - y;
      if (dx * dx + dy * dy <= hitRadiusSq) {
        const pointerX = x - body.x;
        const pointerY = y - body.y;
        return {
          body,
          localX: pointerX * cos + pointerY * sin,
          localY: -pointerX * sin + pointerY * cos,
        };
      }
    }
  }
  return null;
}

function updateDragVelocityEstimate(drag, maxSpeed, referenceTime = null) {
  if (!drag || drag.sampleCount < 2) {
    if (drag) {
      drag.filteredAnchorVx = 0;
      drag.filteredAnchorVy = 0;
    }
    return;
  }

  const newestIndex = (drag.sampleNext - 1 + DRAG_SAMPLE_COUNT) % DRAG_SAMPLE_COUNT;
  const newestTime = drag.sampleTime[newestIndex];
  const cutoffTime = Number.isFinite(referenceTime) ? referenceTime : newestTime;
  if (cutoffTime - newestTime > DRAG_SAMPLE_MAX_AGE_MS) {
    drag.filteredAnchorVx = 0;
    drag.filteredAnchorVy = 0;
    return;
  }
  const oldestIndex = (drag.sampleNext - drag.sampleCount + DRAG_SAMPLE_COUNT) % DRAG_SAMPLE_COUNT;
  let sumVx = 0;
  let sumVy = 0;
  let sumWeight = 0;

  for (let i = 1; i < drag.sampleCount; i += 1) {
    const aIndex = (oldestIndex + i - 1) % DRAG_SAMPLE_COUNT;
    const bIndex = (oldestIndex + i) % DRAG_SAMPLE_COUNT;
    const aTime = drag.sampleTime[aIndex];
    const bTime = drag.sampleTime[bIndex];
    if (cutoffTime - bTime > DRAG_SAMPLE_MAX_AGE_MS) continue;
    const dt = (bTime - aTime) / 1000;
    if (dt <= 0) continue;
    const weight = i;
    sumVx += ((drag.sampleX[bIndex] - drag.sampleX[aIndex]) / dt) * weight;
    sumVy += ((drag.sampleY[bIndex] - drag.sampleY[aIndex]) / dt) * weight;
    sumWeight += weight;
  }

  let vx = sumWeight > 0 ? sumVx / sumWeight : 0;
  let vy = sumWeight > 0 ? sumVy / sumWeight : 0;
  const speed = Math.hypot(vx, vy);
  if (speed > maxSpeed && speed > 0) {
    const scale = maxSpeed / speed;
    vx *= scale;
    vy *= scale;
  }
  drag.filteredAnchorVx = vx;
  drag.filteredAnchorVy = vy;
}

function pushDragSample(g, drag, x, y, time) {
  if (!drag) return;
  const index = drag.sampleNext;
  drag.sampleX[index] = x;
  drag.sampleY[index] = y;
  drag.sampleTime[index] = time;
  drag.sampleNext = (index + 1) % DRAG_SAMPLE_COUNT;
  drag.sampleCount = Math.min(DRAG_SAMPLE_COUNT, drag.sampleCount + 1);
  const maxSpeed = Math.max(80, Number(g.shapesMaxSpeed ?? 1250)) * (g.DPR || 1);
  updateDragVelocityEstimate(drag, maxSpeed);
}

function beginShapeDrag(g, detail, hit) {
  const state = g.shapesState;
  const body = hit?.body;
  if (!state || !body) return;
  body.isDragged = true;
  body.reducedMotionRelease = false;
  body.lastReleaseTargetVx = 0;
  body.lastReleaseTargetVy = 0;
  body.lastReleaseTargetOmega = 0;
  body.peakDragOmega = Math.abs(body.omega);
  const cos = Math.cos(body.angle);
  const sin = Math.sin(body.angle);
  const grabWorldX = hit.localX * cos - hit.localY * sin;
  const grabWorldY = hit.localX * sin + hit.localY * cos;
  const centerInertia = body.invInertia > 0 ? 1 / body.invInertia : body.mass * body.radius * body.radius;
  const pivotDistanceSq = hit.localX * hit.localX + hit.localY * hit.localY;
  const pivotInertia = Math.max(1, centerInertia + body.mass * pivotDistanceSq);
  const anchorVx = body.vx - body.omega * grabWorldY;
  const anchorVy = body.vy + body.omega * grabWorldX;
  const now = detail.time || performance.now();
  const drag = {
    body,
    pointerId: detail.pointerId ?? null,
    grabLocalX: hit.localX,
    grabLocalY: hit.localY,
    targetX: detail.x,
    targetY: detail.y,
    physicsAnchorX: detail.x,
    physicsAnchorY: detail.y,
    solvedAnchorVx: anchorVx,
    solvedAnchorVy: anchorVy,
    filteredAnchorVx: 0,
    filteredAnchorVy: 0,
    lastX: detail.x,
    lastY: detail.y,
    lastTime: now,
    pivotInertia,
    invPivotInertia: 1 / pivotInertia,
    sampleX: new Float64Array(DRAG_SAMPLE_COUNT),
    sampleY: new Float64Array(DRAG_SAMPLE_COUNT),
    sampleTime: new Float64Array(DRAG_SAMPLE_COUNT),
    sampleNext: 0,
    sampleCount: 0,
  };
  state.drag = drag;
  body.dragGrabLocalX = hit.localX;
  body.dragGrabLocalY = hit.localY;
  body.dragGrabWorldX = grabWorldX;
  body.dragGrabWorldY = grabWorldY;
  body.dragAnchorX = detail.x;
  body.dragAnchorY = detail.y;
  body.dragAnchorVx = anchorVx;
  body.dragAnchorVy = anchorVy;
  body.dragInvPivotInertia = drag.invPivotInertia;
  body.dragMaxAngularSpeed = Math.max(0.5, Number(g.shapesMaxAngularSpeed ?? 8));
  pushDragSample(g, drag, detail.x, detail.y, now);
  state.sweep = null;
}

function updateShapeDrag(g, detail) {
  const state = g.shapesState;
  const drag = state?.drag;
  if (!drag || !pointerMatches(drag, detail)) return;
  const now = detail.time || performance.now();
  const moved = Math.hypot(detail.x - drag.lastX, detail.y - drag.lastY);

  drag.targetX = detail.x;
  drag.targetY = detail.y;
  if (moved >= 0.25) pushDragSample(g, drag, detail.x, detail.y, now);
  drag.lastX = detail.x;
  drag.lastY = detail.y;
  drag.lastTime = now;
}

function applyAnchoredDrag(g, drag, dt, anchorX, anchorY, anchorVx, anchorVy) {
  const body = drag?.body;
  if (!body) return;
  const step = Math.max(0.0001, dt);
  const cos = Math.cos(body.angle);
  const sin = Math.sin(body.angle);
  const grabWorldX = drag.grabLocalX * cos - drag.grabLocalY * sin;
  const grabWorldY = drag.grabLocalX * sin + drag.grabLocalY * cos;
  const deltaAnchorVx = anchorVx - drag.solvedAnchorVx;
  const deltaAnchorVy = anchorVy - drag.solvedAnchorVy;
  const gravity = (g.GE || 1960) * clamp(Number(g.shapesGravityScale ?? 0.92), 0, 1.4);
  const pointerDeltaOmega = body.mass
    * (grabWorldX * deltaAnchorVy - grabWorldY * deltaAnchorVx)
    * drag.invPivotInertia;
  const gravityTorque = -grabWorldX * body.mass * gravity;
  const heldDamping = clamp(Number(g.shapesGrabAngularDampingPerSec ?? 1.2), 0, 8);
  const maxAngular = Math.max(0.5, Number(g.shapesMaxAngularSpeed ?? 8));

  body.omega += pointerDeltaOmega;
  body.omega += gravityTorque * drag.invPivotInertia * step;
  body.omega *= Math.exp(-heldDamping * step);
  body.omega = clamp(body.omega, -maxAngular, maxAngular);
  const maxLinear = Math.max(80, Number(g.shapesMaxSpeed ?? 1250)) * (g.DPR || 1);
  const grabDistanceSq = grabWorldX * grabWorldX + grabWorldY * grabWorldY;
  if (grabDistanceSq > 0.0001) {
    const quadraticB = 2 * (anchorVx * grabWorldY - anchorVy * grabWorldX);
    const quadraticC = anchorVx * anchorVx + anchorVy * anchorVy - maxLinear * maxLinear;
    const discriminant = Math.max(0, quadraticB * quadraticB - 4 * grabDistanceSq * quadraticC);
    const root = Math.sqrt(discriminant);
    const minOmega = (-quadraticB - root) / (2 * grabDistanceSq);
    const maxOmegaForLinearSpeed = (-quadraticB + root) / (2 * grabDistanceSq);
    body.omega = clamp(body.omega, minOmega, maxOmegaForLinearSpeed);
  }
  body.peakDragOmega = Math.max(body.peakDragOmega || 0, Math.abs(body.omega));
  body.angle += body.omega * step;

  drag.solvedAnchorVx = anchorVx;
  drag.solvedAnchorVy = anchorVy;
  body.dragAnchorX = anchorX;
  body.dragAnchorY = anchorY;
  body.dragAnchorVx = anchorVx;
  body.dragAnchorVy = anchorVy;
  body.dragMaxAngularSpeed = maxAngular;
  syncHeldBodyPose(body);
}

function clampBodyLinearSpeed(body, maxSpeed) {
  const speed = Math.hypot(body.vx, body.vy);
  if (speed <= maxSpeed || speed <= 0) return;
  const scale = maxSpeed / speed;
  body.vx *= scale;
  body.vy *= scale;
}

function endShapeDrag(g, cancelled, detail = null) {
  const state = g.shapesState;
  const drag = state?.drag;
  if (!drag) return;
  const body = drag.body;
  if (!cancelled && detail && pointerMatches(drag, detail)) {
    updateShapeDrag(g, detail);
  }

  const dpr = g.DPR || 1;
  const reduced = prefersReducedMotion();
  const reducedScale = reduced
    ? clamp(Number(g.shapesReducedMotionScale ?? 0.35), 0.1, 1)
    : 1;
  const maxLinear = Math.max(80, Number(g.shapesMaxSpeed ?? 1250)) * dpr * reducedScale;
  const maxAngular = Math.max(0.5, Number(g.shapesMaxAngularSpeed ?? 8)) * reducedScale;

  if (cancelled) {
    body.lastReleaseTargetVx = 0;
    body.lastReleaseTargetVy = 0;
    body.lastReleaseTargetOmega = 0;
    body.vx *= 0.25;
    body.vy *= 0.25;
    body.omega *= 0.25;
  } else {
    const releaseTime = Number.isFinite(detail?.time) ? detail.time : performance.now();
    updateDragVelocityEstimate(drag, Math.max(80, Number(g.shapesMaxSpeed ?? 1250)) * dpr, releaseTime);
    const solvedOmega = body.omega;
    const linearGain = clamp(Number(g.shapesReleaseLinearGain ?? 1), 0, 1.5) * reducedScale;
    const angularGain = clamp(Number(g.shapesReleaseAngularGain ?? 1), 0, 1.5) * reducedScale;
    body.lastReleaseTargetVx = drag.filteredAnchorVx + solvedOmega * body.dragGrabWorldY;
    body.lastReleaseTargetVy = drag.filteredAnchorVy - solvedOmega * body.dragGrabWorldX;
    body.lastReleaseTargetOmega = solvedOmega;
    body.vx = body.lastReleaseTargetVx * linearGain;
    body.vy = body.lastReleaseTargetVy * linearGain;
    body.omega = solvedOmega * angularGain;
  }

  clampBodyLinearSpeed(body, maxLinear);
  body.omega = clamp(body.omega, -maxAngular, maxAngular);
  if (Math.hypot(body.vx, body.vy) < SHAPES_MIN_RELEASE_SPEED * dpr) {
    body.vx = 0;
    body.vy = 0;
  }
  if (Math.abs(body.omega) < SHAPES_MIN_RELEASE_SPIN) body.omega = 0;
  body.reducedMotionRelease = reduced && !cancelled;
  body.isDragged = false;
  body.dragGrabLocalX = 0;
  body.dragGrabLocalY = 0;
  body.dragGrabWorldX = 0;
  body.dragGrabWorldY = 0;
  body.dragAnchorVx = 0;
  body.dragAnchorVy = 0;
  body.dragInvPivotInertia = 0;
  state.drag = null;
}

function beginShapeSweep(g, detail) {
  const state = g.shapesState;
  if (!state) return;
  state.drag = null;
  state.sweep = {
    pointerId: detail.pointerId ?? null,
    lastX: detail.x,
    lastY: detail.y,
    lastTime: detail.time || performance.now(),
  };
}

function distanceToSegmentSquared(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq <= 0.0001) {
    const dx = px - ax;
    const dy = py - ay;
    return { distanceSq: dx * dx + dy * dy, x: ax, y: ay };
  }
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1);
  const x = ax + abx * t;
  const y = ay + aby * t;
  const dx = px - x;
  const dy = py - y;
  return { distanceSq: dx * dx + dy * dy, x, y };
}

function applyShapeSweep(g, detail) {
  const state = g.shapesState;
  const sweep = state?.sweep;
  if (!sweep || !pointerMatches(sweep, detail)) return;
  const moved = Math.hypot(detail.x - sweep.lastX, detail.y - sweep.lastY);
  if (moved < 0.5) return;

  const now = detail.time || performance.now();
  const dt = clamp((now - sweep.lastTime) / 1000, 0.008, 0.08);
  const pointerVx = (detail.x - sweep.lastX) / dt;
  const pointerVy = (detail.y - sweep.lastY) / dt;
  const dpr = g.DPR || 1;
  const baseRadius = Math.max(72 * dpr, Number(g.shapesPointerRadius ?? 220) * dpr * 0.42);
  const baseStrength = Math.max(120, Number(g.shapesPointerStrength ?? 21000) * 0.012) * dpr;
  const bodies = state.bodies || [];

  for (let i = 0; i < bodies.length; i += 1) {
    const body = bodies[i];
    if (body.isDragged || body.isPending) continue;
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);
    const influence = baseRadius + body.dotRadius;
    const influenceSq = influence * influence;
    let bestDistanceSq = Infinity;
    let bestDotX = body.x;
    let bestDotY = body.y;
    let bestClosestX = detail.x;
    let bestClosestY = detail.y;
    let bestRx = 0;
    let bestRy = 0;

    for (let j = 0; j < body.points.length; j += 1) {
      const point = body.points[j];
      const rx = point.lx * cos - point.ly * sin;
      const ry = point.lx * sin + point.ly * cos;
      const dotX = body.x + rx;
      const dotY = body.y + ry;
      const hit = distanceToSegmentSquared(dotX, dotY, sweep.lastX, sweep.lastY, detail.x, detail.y);
      if (hit.distanceSq < bestDistanceSq) {
        bestDistanceSq = hit.distanceSq;
        bestDotX = dotX;
        bestDotY = dotY;
        bestClosestX = hit.x;
        bestClosestY = hit.y;
        bestRx = rx;
        bestRy = ry;
      }
    }

    if (bestDistanceSq >= influenceSq) continue;
    const distance = Math.sqrt(Math.max(0.0001, bestDistanceSq));
    let nx = (bestDotX - bestClosestX) / distance;
    let ny = (bestDotY - bestClosestY) / distance;
    if (!Number.isFinite(nx) || !Number.isFinite(ny) || distance < 0.5) {
      const invMove = 1 / Math.max(1, moved);
      nx = -(detail.x - sweep.lastX) * invMove;
      ny = -(detail.y - sweep.lastY) * invMove;
    }
    const q = 1 - distance / influence;
    const weight = q * q * (3 - 2 * q);
    const pushX = nx * baseStrength * weight + pointerVx * 0.18 * weight;
    const pushY = ny * baseStrength * weight + pointerVy * 0.18 * weight;
    body.vx += pushX;
    body.vy += pushY;
    body.omega += clamp((bestRx * pushY - bestRy * pushX) / Math.max(1, body.radius * body.radius), -0.9, 0.9);
  }

  sweep.lastX = detail.x;
  sweep.lastY = detail.y;
  sweep.lastTime = now;
}

function handlePointer(type, detail) {
  const g = getGlobals();
  const state = g.shapesState;
  if (g.currentMode !== MODES.SHAPES || !state || !detail) return;

  if (type === 'down') {
    if (!detail.inBounds) return;
    const hit = findBodyAtPoint(g, detail.x, detail.y);
    if (hit) {
      beginShapeDrag(g, detail, hit);
    } else {
      beginShapeSweep(g, detail);
    }
    return;
  }

  if (type === 'move') {
    if (state.drag) {
      updateShapeDrag(g, detail);
      return;
    }
    if (state.sweep && detail.active) applyShapeSweep(g, detail);
    return;
  }

  if (type === 'up' || type === 'cancel') {
    if (state.drag && pointerMatches(state.drag, detail)) endShapeDrag(g, type === 'cancel', detail);
    if (state.sweep && pointerMatches(state.sweep, detail)) state.sweep = null;
  }
}

function ensurePointerSubscription() {
  if (unsubscribePointer) return;
  unsubscribePointer = subscribeScenePointer(handlePointer);
}

export function cleanupShapes() {
  const g = getGlobals();
  const state = g.shapesState;
  if (!state) return;
  if (state.drag) endShapeDrag(g, true);
  state.sweep = null;
  const bodies = state.bodies || [];
  for (let i = 0; i < bodies.length; i += 1) {
    bodies[i].isDragged = false;
  }
}

function releaseBodyFromSequence(body, g) {
  if (!body || !body.isPending) return;
  const dpr = g.DPR || 1;
  body.isPending = false;
  body.hasDropped = true;
  body.enteringFromTop = true;
  body.x = body.spawnX;
  body.y = body.spawnY;
  body.vx = clamp((body.targetX - body.spawnX) * 1.45, -520 * dpr, 520 * dpr);
  body.vy = 80 * dpr;
  body.omega = body.dropSpinDirection * (0.22 + positiveHash01(body.index * 97 + 13) * 0.26);
  body.rubberSquash = 0;
}

function syncDotsToBodies(g) {
  const targets = g.shapesState?.targets || [];
  const balls = g.balls || [];
  const max = Math.min(targets.length, balls.length);

  for (let i = 0; i < max; i += 1) {
    const ball = balls[i];
    const target = targets[i];
    const body = target.body;
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);
    const rx = target.lx * cos - target.ly * sin;
    const ry = target.lx * sin + target.ly * cos;

    ball.x = body.x + rx;
    ball.y = body.y + ry;
    ball.vx = body.vx - body.omega * ry;
    ball.vy = body.vy + body.omega * rx;
    ball.omega = body.omega;
    ball.theta = body.angle;
    ball.squashAmount = body.rubberSquash || 0;
    ball.squashNormalAngle = body.rubberSquashAngle || 0;
    ball.squash = 1 - ball.squashAmount;
    ball.alpha = body.isPending ? 0 : 1;
    ball.isSleeping = false;
  }
}

export function initializeShapes() {
  const g = getGlobals();
  clearBalls();
  ensurePointerSubscription();

  const canvas = g.canvas;
  if (!canvas) return;

  const dotSizeMul = clamp(Number(g.shapesDotSizeMul ?? 1), 0.5, 1.2);
  const dotRadius = randomRadiusForMode(g, MODES.PIT) * dotSizeMul;
  const baseCount = clampInt(g.shapesBallCount ?? 168, 72, 320, 168);
  const count = getMobileAdjustedCount(baseCount);
  const { bodies, targets } = createShapeBodies(g, count, dotRadius);

  g.shapesState = {
    time: 0,
    reducedMotion: prefersReducedMotion(),
    dotRadius,
    bodies,
    targets,
    drag: null,
    sweep: null,
  };

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    const picked = getShapeColor(g, target.shapeIndex, i, target.row, target.col);
    const ball = new Ball(0, 0, target.body.dotRadius, picked.color);
    ball.distributionIndex = picked.distributionIndex;
    ball.alpha = 1;
    ball._shapes = target;
    ball._noSquash = false;
    ball._preserveColor = true;
    ball.isSleeping = false;
    g.balls.push(ball);
  }

  syncDotsToBodies(g);
}

export function stepShapes(dt) {
  const g = getGlobals();
  const state = g.shapesState;
  if (g.currentMode !== MODES.SHAPES || !state || !g.canvas) return;

  const bodies = state.bodies || [];
  const dpr = g.DPR || 1;
  const reduced = prefersReducedMotion();
  const frameDt = clamp(Number(dt) || 0, 0, 0.033);
  if (frameDt <= 0) {
    syncDotsToBodies(g);
    return;
  }
  const gravity = (g.GE || 1960) * clamp(Number(g.shapesGravityScale ?? 0.92), 0, 1.4);
  const damping = clamp(Number(g.shapesDamping ?? 0.985), 0.86, 0.999);
  const maxSpeed = Math.max(80, Number(g.shapesMaxSpeed ?? 1250)) * dpr;
  const maxAngular = Math.max(0.5, Number(g.shapesMaxAngularSpeed ?? 8));
  const reducedScale = clamp(Number(g.shapesReducedMotionScale ?? 0.35), 0.1, 1);
  const substeps = Math.min(
    SHAPES_MAX_SUBSTEPS,
    Math.max(1, Math.ceil(frameDt / SHAPES_SUBSTEP_SECONDS))
  );
  const subDt = frameDt / substeps;
  const collisionPasses = substeps === 1 ? 6 : Math.max(2, Math.ceil(6 / substeps));
  const drag = state.drag;
  const dragStartX = drag?.physicsAnchorX ?? 0;
  const dragStartY = drag?.physicsAnchorY ?? 0;
  const dragEndX = drag?.targetX ?? dragStartX;
  const dragEndY = drag?.targetY ?? dragStartY;
  let dragFrameVx = drag ? (dragEndX - dragStartX) / frameDt : 0;
  let dragFrameVy = drag ? (dragEndY - dragStartY) / frameDt : 0;
  const dragFrameSpeed = Math.hypot(dragFrameVx, dragFrameVy);
  if (dragFrameSpeed > maxSpeed && dragFrameSpeed > 0) {
    const scale = maxSpeed / dragFrameSpeed;
    dragFrameVx *= scale;
    dragFrameVy *= scale;
  }

  state.time += frameDt;
  state.reducedMotion = reduced;

  for (let substep = 0; substep < substeps; substep += 1) {
    const dragRatio = (substep + 1) / substeps;
    const dragAnchorX = dragStartX + (dragEndX - dragStartX) * dragRatio;
    const dragAnchorY = dragStartY + (dragEndY - dragStartY) * dragRatio;

    for (let i = 0; i < bodies.length; i += 1) {
      const body = bodies[i];
      body.rubberSquash *= Math.pow(0.68, subDt * 60);

      if (body.isPending) {
        if (state.time >= body.dropDelay) {
          releaseBodyFromSequence(body, g);
        } else {
          body.x = body.spawnX;
          body.y = body.spawnY;
          body.vx = 0;
          body.vy = 0;
          body.omega = 0;
          continue;
        }
      }

      if (body.isDragged && drag?.body === body) {
        applyAnchoredDrag(g, drag, subDt, dragAnchorX, dragAnchorY, dragFrameVx, dragFrameVy);
        collideBodyWithWalls(body, g);
        continue;
      }

      const settleRate = body.reducedMotionRelease && reduced ? 1 / reducedScale : 1;
      const dampingFactor = Math.pow(damping, subDt * 60 * settleRate);
      const angularDamping = Math.pow(0.982, subDt * 60 * settleRate);
      body.vy += gravity * subDt;
      body.vx *= dampingFactor;
      body.vy *= dampingFactor;
      body.omega *= angularDamping;
      body.omega = clamp(body.omega, -maxAngular, maxAngular);
      clampBodyLinearSpeed(body, maxSpeed);
      body.x += body.vx * subDt;
      body.y += body.vy * subDt;
      body.angle += body.omega * subDt;
      collideBodyWithWalls(body, g);
    }

    if (Number(g.shapesBodyCollisionEnabled ?? 1) !== 0) {
      for (let pass = 0; pass < collisionPasses; pass += 1) {
        resolveBodyCollisions(bodies);
        for (let i = 0; i < bodies.length; i += 1) {
          collideBodyWithWalls(bodies[i], g);
        }
      }
    }

    if (drag?.body?.isDragged) syncHeldBodyPose(drag.body);
  }

  if (drag && state.drag === drag) {
    drag.physicsAnchorX = dragEndX;
    drag.physicsAnchorY = dragEndY;
  }

  syncDotsToBodies(g);
}

export function applyShapesForces() {}
