import { resolveBoardBallRadius } from './boardBallPresentation.js';

export const RESERVOIR_FILL_FRACTION = 0.5;

function funnelInset(y, radius) {
  const slopeInset = y > 865 ? (y - 865) * 1.79 : 0;
  return Math.max(radius + 12, slopeInset + radius * 2.1);
}

/** Pack one finite inventory from the outlet upwards at Home's screen size.
 * Half of the chamber's former capacity keeps the pile low and reduces the
 * cost of every downstream physics step. */
export function createBoardInventory(source, radiusScale, { reservoirTop = 0 } = {}) {
  const radius = resolveBoardBallRadius(13, radiusScale);
  const reservoir = [];
  const pitch = radius * 2.02;
  const top = reservoirTop + radius * 1.1;
  const rowStep = pitch * Math.sqrt(3) / 2;
  const forEachPosition = visit => {
    for (let y = 1080 - radius, row = 0; y >= top; y -= rowStep, row += 1) {
      const inset = funnelInset(y, radius);
      const phase = row % 2 ? pitch / 2 : 0;
      const start = Math.ceil((inset - phase) / pitch) * pitch + phase;
      for (let x = start; x <= 960 - inset; x += pitch) {
        if (visit(x, y) === false) return;
      }
    }
  };
  let fullCapacity = 0;
  forEachPosition(() => { fullCapacity += 1; });
  const targetCount = Math.ceil(fullCapacity * RESERVOIR_FILL_FRACTION);
  // The lattice is only a deterministic seed. Hidden normal-gravity packing
  // places these same identities on actual supports before the first frame.
  forEachPosition((x, y) => {
    const index = reservoir.length;
    reservoir.push({ id: `pit-${index}`, x,
      y, radius, rgb: source[index % source.length].rgb, reservoir: true });
    return reservoir.length < targetCount;
  });
  const surfaceY = reservoir.length ? Math.min(...reservoir.map(ball => ball.y)) : top;
  // This is one finite inventory. Every downstream ball must originate here;
  // the journey and grid may transfer an identity, but never manufacture one.
  return { balls: reservoir, reservoir, radius,
    surfaceY, cropY: surfaceY - radius * 6,
    maximumBodies: reservoir.length };
}
