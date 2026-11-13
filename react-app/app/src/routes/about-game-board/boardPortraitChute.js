import { BOARD_WIDTH } from './boardScene.js';

export const BOARD_PORTRAIT_CHUTE_HEIGHT = 372;

export function createPortraitChute(top, radius) {
  const centre = BOARD_WIDTH / 2;
  const halfOpening = Math.max(42, radius * 4);
  const outletY = top + BOARD_PORTRAIT_CHUTE_HEIGHT;
  const left = centre - halfOpening;
  const right = centre + halfOpening;
  const shoulder = [[-8, top], [left, outletY - 48], [left, outletY], [-8, top + 26]];
  // A fast ball can cross the outlet and travel sideways in the same solver
  // step. Continue the throat past the paint seam until the portrait takes it.
  const handoffEnd = outletY + Math.max(96, radius * 4);
  const throat = [[left - 12, outletY - 18], [left, outletY - 18], [left, handoffEnd], [left - 12, handoffEnd]];
  const guides = [shoulder, throat].flatMap(side => [
    side, side.map(([x, y]) => [BOARD_WIDTH - x, y]).reverse(),
  ]);
  return { left, right, outletY, guides };
}

export function installPortraitChute(svg, chute) {
  const namespace = 'http://www.w3.org/2000/svg';
  const group = svg.ownerDocument.createElementNS(namespace, 'g');
  group.id = 'portrait-chute';
  group.setAttribute('fill', 'var(--about-architecture-static)');
  for (const guide of chute.guides) {
    const polygon = svg.ownerDocument.createElementNS(namespace, 'polygon');
    polygon.setAttribute('points', guide.map(point => point.join(',')).join(' '));
    group.append(polygon);
  }
  svg.querySelector('#Geometry').append(group);
  return () => group.remove();
}
