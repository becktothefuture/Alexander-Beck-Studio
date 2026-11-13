import { resolveBoardBallRadius } from './boardBallPresentation.js';
import { resolveBoardBallRoleColours } from './boardScene.js';

/** Keep pigments together along the road, including palettes with neutral lanes. */
export function boardGridRoleOrder(palette) {
  return resolveBoardBallRoleColours(palette).map((colour, role) => {
    const hex = colour.replace('#', '');
    const rgb = hex.length === 6 ? [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255) : [0, 0, 0];
    const maximum = Math.max(...rgb), minimum = Math.min(...rgb);
    const range = maximum - minimum;
    let hue = 0;
    if (range > .04) {
      const index = rgb.indexOf(maximum);
      hue = ((index === 0 ? (rgb[1] - rgb[2]) / range
        : index === 1 ? (rgb[2] - rgb[0]) / range + 2 : (rgb[0] - rgb[1]) / range + 4) + 6) % 6;
    }
    return { role, order: range <= .04 ? 7 + maximum : hue };
  }).sort((a, b) => a.order - b.order || a.role - b.role).map(item => item.role);
}

export function nearestBoardGridCell(position, roleIndex, entries, claimed) {
  let nearest = null, distance = Infinity;
  for (const entry of entries) {
    if (claimed.has(entry.id) || (entry.laneIndex !== undefined && entry.laneIndex !== roleIndex)) continue;
    const next = (entry.flatX - position.x) ** 2 + (entry.flatY - position.y) ** 2;
    if (next < distance) { nearest = entry; distance = next; }
  }
  return nearest;
}

/** The empty recess follows the live ball size, not the old Figma disc size.
 * Both Canvas and WebGL use this fine, slightly inset lip. */
export function boardSocketMetrics(entry, radiusScale = 1, out = {}) {
  const radius = resolveBoardBallRadius(entry.radius, radiusScale);
  out.outerRadius = radius * .92;
  out.holeRadius = radius * .82;
  out.holeOffsetY = radius * .025;
  return out;
}

export function boardGridCaptureDuration(capture, radius) {
  const distance = Math.hypot(capture.target.flatX - capture.startX,
    capture.target.flatY - capture.startY);
  return Math.min(1800, 650 + distance / Math.max(1, radius) * 16);
}

/** A soft acceleration and deceleration, with a small sideways drift that
 * vanishes at either endpoint. Derive it from saved start/target coordinates
 * so suspension and restoration reproduce the same path. */
export function sampleBoardGridCapture(capture, progress, radius, out) {
  const t = Math.max(0, Math.min(1, progress));
  const eased = t * t * (3 - 2 * t);
  const dx = capture.target.flatX - capture.startX;
  const dy = capture.target.flatY - capture.startY;
  const bow = Math.min(radius * 1.5, Math.hypot(dx, dy) * .08)
    * Math.sin(Math.PI * t) ** 2 * (dx < 0 ? -1 : 1);
  out.x = capture.startX + dx * eased + bow;
  out.y = capture.startY + dy * eased;
  return out;
}

/** The two 176-socket drawings describe one field. The first pose is the
 * authoritative 2D/Three.js seam; the second remains validation evidence for
 * the intended backward bend. */
export function createBoardGrid(svg, balls, palette) {
  const sockets = [...svg.querySelectorAll('[id^="geometry-socket-"]')];
  const flat = balls.filter(ball => ball.y >= 10050 && ball.y <= 11140);
  const bent = balls.filter(ball => ball.y > 11140 && ball.y < 12100);
  if (sockets.length !== 352 || flat.length !== 176 || bent.length !== 176) {
    throw new Error('The grid no longer matches the reviewed 176-socket Figma poses.');
  }
  const columns = [...new Set(flat.map(ball => ball.x))].sort((a, b) => a - b);
  const roleOrder = boardGridRoleOrder(palette);
  const entries = flat.map((ball, index) => {
    const next = bent[index];
    if (ball.rgb.join(',') !== next.rgb.join(',')) {
      throw new Error(`Grid ball ${index + 1} changed material between its two Figma poses.`);
    }
    const firstBox = sockets[index].getBBox();
    const nextBox = sockets[index + 176].getBBox();
    const flatSocket = [firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2];
    const bentSocket = [nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2];
    if (Math.hypot(ball.x - flatSocket[0], ball.y - flatSocket[1]) > 2
      || Math.hypot(next.x - bentSocket[0], next.y - bentSocket[1]) > 2) {
      throw new Error(`Grid ball ${index + 1} is no longer centred in its socket.`);
    }
    sockets[index].classList.add('about-board-socket--flat');
    sockets[index + 176].classList.add('about-board-socket--bent');
    return Object.freeze({
      id: ball.id, flatSocketId: sockets[index].id,
      bentSocketId: sockets[index + 176].id,
      flatX: ball.x, flatY: ball.y, bentX: next.x, bentY: next.y,
      radius: ball.radius, bentRadius: next.radius,
      flatSocketRadius: firstBox.width / 2, bentSocketRadius: nextBox.width / 2,
      rgb: ball.rgb,
      laneIndex: roleOrder[Math.min(5, Math.floor(columns.indexOf(ball.x) * 6 / columns.length))],
    });
  });
  return Object.freeze({
    entries: Object.freeze(entries),
    sourceIds: new Set([...flat, ...bent].map(ball => ball.id)),
  });
}

/** Resolve the scroll-owned Three.js phase without coupling it to frame time. */
export function gridHandoffProgress(scrollTop, stageTop, stageHeight, viewportHeight) {
  const travel = Math.max(1, stageHeight - viewportHeight);
  return Math.max(0, Math.min(1, (scrollTop - stageTop) / travel));
}
