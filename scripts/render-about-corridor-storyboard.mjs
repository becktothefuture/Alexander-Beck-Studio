import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const OUTPUT_DIR = process.env.ABS_CORRIDOR_STORYBOARD_DIR
  || 'output/playwright/about-corridor-storyboard-v1';
const DESKTOP_FRAME = Object.freeze({ width: 640, height: 400 });
const MOBILE_FRAME = Object.freeze({ width: 320, height: 520 });
const BACKGROUND = Object.freeze([244, 242, 235, 255]);
const PANEL_GAP = 12;
const LABEL_HEIGHT = 64;
const POINT_PALETTE = Object.freeze([
  Object.freeze([20, 20, 20]),
  Object.freeze([41, 91, 118]),
  Object.freeze([190, 67, 42]),
  Object.freeze([224, 154, 36]),
  Object.freeze([76, 94, 84]),
]);

const storyboard = Object.freeze([
  Object.freeze({ id: '01-threshold', label: 'Threshold', textId: 'text-promise-main', cameraZ: 14 }),
  Object.freeze({ id: '02-material-yard', label: 'Material yard', textId: 'text-complexity-idea', cameraZ: 5 }),
  Object.freeze({ id: '03-crossing-house', label: 'Crossing house', textId: 'text-complexity-conditions', cameraZ: -7 }),
  Object.freeze({ id: '04-long-archive', label: 'Long archive', textId: 'text-background-unit', cameraZ: -15 }),
  Object.freeze({ id: '05-sunken-court', label: 'Sunken court', textId: 'text-complexity-curiosity', cameraZ: -32 }),
  Object.freeze({ id: '06-interchange', label: 'Interchange', textId: 'text-complexity-listen', cameraZ: -47 }),
  Object.freeze({ id: '07-six-bay-workshop', label: 'Six-bay workshop', textId: 'text-discipline-labels', cameraZ: -57 }),
  Object.freeze({ id: '08-assembly-hall', label: 'Assembly hall', textId: 'text-disciplines-title', cameraZ: -72 }),
  Object.freeze({ id: '09-single-bridge', label: 'Single bridge', textId: 'text-life-momentum', cameraZ: -84 }),
  Object.freeze({ id: '10-connected-bridges', label: 'Connected bridges', textId: 'text-life-form', cameraZ: -98 }),
  Object.freeze({ id: '11-unfinished-city', label: 'Unfinished city', textId: 'text-life-character', cameraZ: -108 }),
  Object.freeze({ id: '12-living-forum', label: 'Living forum', textId: 'text-epilogue-invitation', cameraZ: -126, life: 1 }),
]);

const points = [];
const solidBoxes = [];
const solidBeams = [];

function hash01(value) {
  const sine = Math.sin(value * 12.9898) * 43758.5453;
  return sine - Math.floor(sine);
}

function pointColour(group, x, z) {
  const patch = Math.floor(hash01((group * 19.17) + (x * 0.081) + (z * 0.047)) * 7);
  return POINT_PALETTE[(group + patch) % POINT_PALETTE.length];
}

function addPoint(x, y, z, group = 0, anchor = 1) {
  points.push({ x, y, z, group, anchor });
}

function addBoxSurface({ cx, cy, cz, sx, sy, sz, count, group = 0, anchor = 1 }) {
  solidBoxes.push({ cx, cy, cz, sx, sy, sz, group, anchor });
  const faces = [
    { axis: 'x', sign: -1, a: sy, b: sz },
    { axis: 'x', sign: 1, a: sy, b: sz },
    { axis: 'y', sign: -1, a: sx, b: sz },
    { axis: 'y', sign: 1, a: sx, b: sz },
    { axis: 'z', sign: -1, a: sx, b: sy },
    { axis: 'z', sign: 1, a: sx, b: sy },
  ];
  const areas = faces.map((face) => face.a * face.b);
  const areaTotal = areas.reduce((sum, value) => sum + value, 0);
  let remaining = count;
  faces.forEach((face, faceIndex) => {
    const isLast = faceIndex === faces.length - 1;
    const faceCount = isLast
      ? remaining
      : Math.max(1, Math.round(count * (areas[faceIndex] / areaTotal)));
    remaining -= faceCount;
    const columns = Math.max(1, Math.round(Math.sqrt(faceCount * (face.a / Math.max(0.001, face.b)))));
    const rows = Math.max(1, Math.ceil(faceCount / columns));
    for (let index = 0; index < faceCount; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const u = ((column + 0.5) / columns) - 0.5;
      const v = ((row + 0.5) / rows) - 0.5;
      let x = cx;
      let y = cy;
      let z = cz;
      if (face.axis === 'x') {
        x += face.sign * sx * 0.5;
        y += u * sy;
        z += v * sz;
      } else if (face.axis === 'y') {
        x += u * sx;
        y += face.sign * sy * 0.5;
        z += v * sz;
      } else {
        x += u * sx;
        y += v * sy;
        z += face.sign * sz * 0.5;
      }
      addPoint(x, y, z, group, anchor);
    }
  });
}
function addOrientedBeam({ from, to, thickness = 0.65, count, group = 0, anchor = 1 }) {
  solidBeams.push({ from, to, thickness, group, anchor });
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dy, dz) || 1;
  const direction = [dx / length, dy / length, dz / length];
  const helper = Math.abs(direction[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const side = [
    (direction[1] * helper[2]) - (direction[2] * helper[1]),
    (direction[2] * helper[0]) - (direction[0] * helper[2]),
    (direction[0] * helper[1]) - (direction[1] * helper[0]),
  ];
  const sideLength = Math.hypot(...side) || 1;
  side[0] /= sideLength;
  side[1] /= sideLength;
  side[2] /= sideLength;
  const up = [
    (side[1] * direction[2]) - (side[2] * direction[1]),
    (side[2] * direction[0]) - (side[0] * direction[2]),
    (side[0] * direction[1]) - (side[1] * direction[0]),
  ];
  for (let index = 0; index < count; index += 1) {
    const along = hash01((index + 1) * 17.311 + group * 3.7);
    const angle = hash01((index + 1) * 29.719 + group * 5.9) * Math.PI * 2;
    const radius = thickness * (0.35 + (hash01((index + 1) * 47.117) * 0.15));
    const x = from[0] + (dx * along) + (side[0] * Math.cos(angle) * radius) + (up[0] * Math.sin(angle) * radius);
    const y = from[1] + (dy * along) + (side[1] * Math.cos(angle) * radius) + (up[1] * Math.sin(angle) * radius);
    const z = from[2] + (dz * along) + (side[2] * Math.cos(angle) * radius) + (up[2] * Math.sin(angle) * radius);
    addPoint(x, y, z, group, anchor);
  }
}

function addPortal(z, { width = 13, height = 9, depth = 2.2, group = 0, count = 620 } = {}) {
  const pierCount = Math.floor(count * 0.34);
  addBoxSurface({ cx: -width / 2, cy: 0.5, cz: z, sx: 2.1, sy: height, sz: depth, count: pierCount, group });
  addBoxSurface({ cx: width / 2, cy: 0.5, cz: z, sx: 2.1, sy: height, sz: depth, count: pierCount, group });
  addBoxSurface({ cx: 0, cy: 0.5 + (height / 2), cz: z, sx: width + 2.1, sy: 1.7, sz: depth, count: count - (pierCount * 2), group });
}

function addStairs({ z, side = 0, width = 13, depth = 8, rise = 2.4, steps = 5, group = 0, count = 320 }) {
  for (let step = 0; step < steps; step += 1) {
    const ratio = (step + 1) / steps;
    addBoxSurface({
      cx: side,
      cy: -3 + (ratio * rise * 0.5),
      cz: z - (ratio * depth * 0.5),
      sx: width,
      sy: Math.max(0.24, ratio * rise),
      sz: depth / steps,
      count: Math.floor(count / steps),
      group,
    });
  }
}

function addSteppedTower({ x, z, height, width, levels = 4, group = 0, count = 520 }) {
  for (let level = 0; level < levels; level += 1) {
    const ratio = 1 - (level / (levels * 1.35));
    const levelHeight = height / levels;
    addBoxSurface({
      cx: x,
      cy: -3 + (levelHeight * (level + 0.5)),
      cz: z,
      sx: width * ratio,
      sy: levelHeight,
      sz: width * (0.82 + (ratio * 0.18)),
      count: Math.floor(count / levels),
      group,
      anchor: level === 0 ? 1 : 0.72,
    });
  }
}

function addForkSupport({
  x,
  z,
  height = 3.4,
  spread = 1.8,
  group = 2,
  count = 260,
  levels = 1,
  incomplete = false,
}) {
  const baseY = -2.75;
  const junctionY = baseY + (height * 0.58);
  const tipY = baseY + height;
  addOrientedBeam({
    from: [x, baseY, z],
    to: [x, junctionY, z - 0.35],
    thickness: Math.max(0.34, spread * 0.25),
    count: Math.floor(count * 0.44),
    group,
    anchor: 0.72,
  });
  addOrientedBeam({
    from: [x, junctionY, z - 0.35],
    to: [x - spread, tipY, z - 1],
    thickness: Math.max(0.2, spread * 0.14),
    count: Math.floor(count * 0.28),
    group,
    anchor: 0.62,
  });
  if (!incomplete) {
    addOrientedBeam({
      from: [x, junctionY, z - 0.35],
      to: [x + spread, tipY * 0.98, z - 1.2],
      thickness: Math.max(0.2, spread * 0.14),
      count: Math.floor(count * 0.28),
      group: (group + 1) % 5,
      anchor: 0.62,
    });
  }
  if (levels < 2) return;
  addOrientedBeam({
    from: [x - spread, tipY, z - 1],
    to: [x - (spread * 1.62), tipY + (height * 0.36), z - 2],
    thickness: Math.max(0.15, spread * 0.09),
    count: Math.floor(count * 0.18),
    group,
    anchor: 0.5,
  });
  addOrientedBeam({
    from: [x + spread, tipY * 0.98, z - 1.2],
    to: [x + (spread * 1.52), tipY + (height * 0.32), z - 2.2],
    thickness: Math.max(0.15, spread * 0.09),
    count: Math.floor(count * 0.18),
    group: (group + 1) % 5,
    anchor: 0.5,
  });
}

function buildWorld() {
  // A continuous floor, two load-bearing edge beams, and one broad centre
  // service datum make the environment mappable in every panel. These are
  // physical members, not a screen-space clearance mask.
  addBoxSurface({ cx: 0, cy: -3.35, cz: -74, sx: 16.5, sy: 0.35, sz: 176, count: 2_200, group: 0 });
  addBoxSurface({ cx: -8.1, cy: -2.95, cz: -74, sx: 1.4, sy: 0.7, sz: 176, count: 1_050, group: 0 });
  addBoxSurface({ cx: 8.1, cy: -2.95, cz: -74, sx: 1.4, sy: 0.7, sz: 176, count: 1_050, group: 0 });
  addBoxSurface({ cx: 0, cy: -3.05, cz: -74, sx: 0.9, sy: 0.18, sz: 176, count: 720, group: 4 });

  // 1. Threshold.
  addStairs({ z: 8, width: 15, depth: 6, rise: 1.2, steps: 4, group: 1, count: 300 });
  addPortal(2.5, { width: 13.5, height: 9.5, depth: 2.8, group: 1, count: 760 });
  addBoxSurface({ cx: -9.9, cy: -0.5, cz: 0, sx: 3.8, sy: 5.8, sz: 7, count: 420, group: 1 });
  addBoxSurface({ cx: 9.9, cy: -0.5, cz: 0, sx: 3.8, sy: 5.8, sz: 7, count: 420, group: 1 });

  // 2. Material yard: complex parts remain grounded and sorted on plinths.
  for (let index = 0; index < 6; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const lane = Math.floor(index / 2);
    const z = -4 - (lane * 3.1) - ((index % 3) * 0.4);
    addBoxSurface({ cx: side * (7.3 + ((index % 3) * 1.15)), cy: -2.15, cz: z, sx: 4.8, sy: 1.8, sz: 3.1, count: 240, group: 2 });
    addBoxSurface({ cx: side * (7.1 + ((index % 3) * 1.15)), cy: -0.35, cz: z + 0.25, sx: 3.2, sy: 1.9, sz: 2.5, count: 190, group: 2 });
  }
  addBoxSurface({ cx: -8.4, cy: 2.4, cz: -12.7, sx: 7.4, sy: 1.15, sz: 2.1, count: 320, group: 2 });
  addBoxSurface({ cx: 8.4, cy: 1.25, cz: -13.2, sx: 7.4, sy: 1.15, sz: 2.1, count: 320, group: 2 });
  addForkSupport({ x: -7.4, z: -10.5, height: 2.7, spread: 1.2, group: 2, count: 180, incomplete: true });

  // 3. Crossing house.
  addPortal(-18, { width: 15.5, height: 10.5, depth: 3.4, group: 3, count: 650 });
  addBoxSurface({ cx: 0, cy: 3.7, cz: -18, sx: 28, sy: 1.35, sz: 4.6, count: 620, group: 3 });
  addBoxSurface({ cx: -11.2, cy: -0.8, cz: -18, sx: 3.6, sy: 7.4, sz: 8.5, count: 390, group: 3 });
  addBoxSurface({ cx: 11.2, cy: -0.8, cz: -18, sx: 3.6, sy: 7.4, sz: 8.5, count: 390, group: 3 });
  addStairs({ z: -17, side: -10.6, width: 4.2, depth: 7, rise: 4.5, steps: 6, group: 3, count: 300 });
  addStairs({ z: -19, side: 10.6, width: 4.2, depth: 7, rise: 4.5, steps: 6, group: 3, count: 300 });

  // 4. Long archive: repeated heavy bays and occasional occupied ledges.
  for (let bay = 0; bay < 6; bay += 1) {
    const z = -24 - (bay * 4.4);
    const irregular = (bay % 3) * 0.55;
    addBoxSurface({ cx: -9.8 - irregular, cy: 0.2, cz: z, sx: 1.65, sy: 7.1, sz: 1.5, count: 180, group: 4 });
    addBoxSurface({ cx: 9.8 + (irregular * 0.45), cy: 0.2, cz: z, sx: 1.65, sy: 7.1, sz: 1.5, count: 180, group: 4 });
    if (bay !== 3) {
      addBoxSurface({ cx: 0, cy: 3.7 + ((bay % 2) * 0.5), cz: z, sx: 20.8, sy: 0.85, sz: 1.4, count: 160, group: 4 });
    }
    addBoxSurface({ cx: -13, cy: -0.7 + ((bay % 2) * 1.1), cz: z - 1.2, sx: 4.2, sy: 0.8, sz: 3, count: 100, group: 4 });
    addBoxSurface({ cx: 13, cy: -0.2 - ((bay % 2) * 0.8), cz: z + 1.1, sx: 4.2, sy: 0.8, sz: 3, count: 100, group: 4 });
  }
  addForkSupport({ x: 8.7, z: -34, height: 3.5, spread: 1.65, group: 3, count: 245 });

  // 5. Sunken court.
  addBoxSurface({ cx: 0, cy: -4.15, cz: -51.5, sx: 16, sy: 0.45, sz: 11, count: 520, group: 0 });
  addStairs({ z: -48.5, side: -8.7, width: 7.4, depth: 9, rise: 3.2, steps: 6, group: 0, count: 360 });
  addStairs({ z: -48.5, side: 8.7, width: 7.4, depth: 9, rise: 3.2, steps: 6, group: 0, count: 360 });
  addBoxSurface({ cx: -13.8, cy: -1.2, cz: -52, sx: 5, sy: 4.2, sz: 10, count: 300, group: 0 });
  addBoxSurface({ cx: 13.8, cy: -1.2, cz: -52, sx: 5, sy: 4.2, sz: 10, count: 300, group: 0 });

  // 6. Interchange: one unmistakable orthogonal bridge. The service spine
  // branches into the cross-route without a floating diagonal overlay.
  addBoxSurface({ cx: 0, cy: 3.4, cz: -58, sx: 29, sy: 1.25, sz: 4.2, count: 520, group: 1 });
  addBoxSurface({ cx: -9.7, cy: -0.1, cz: -58, sx: 2.2, sy: 7.5, sz: 3.2, count: 230, group: 1 });
  addBoxSurface({ cx: 9.7, cy: -0.1, cz: -58, sx: 2.2, sy: 7.5, sz: 3.2, count: 230, group: 1 });
  addBoxSurface({ cx: -14.2, cy: -1.85, cz: -58, sx: 12.5, sy: 0.7, sz: 4.1, count: 280, group: 1 });
  addBoxSurface({ cx: 14.2, cy: -1.85, cz: -58, sx: 12.5, sy: 0.7, sz: 4.1, count: 280, group: 1 });
  addBoxSurface({ cx: 0, cy: 6.05, cz: -68, sx: 2.2, sy: 1.2, sz: 32, count: 520, group: 4 });

  // 7. Six connected workshop bays.
  for (let bay = 0; bay < 6; bay += 1) {
    const side = bay % 2 === 0 ? -1 : 1;
    const z = -65 - (bay * 2.75);
    const x = side * (10.7 + ((bay % 3) * 0.55));
    addBoxSurface({ cx: x, cy: 0.1, cz: z, sx: 2.4, sy: 7.8, sz: 2.2, count: 260, group: 2 + (bay % 3) });
    addBoxSurface({ cx: x - (side * 3.1), cy: 3.45, cz: z, sx: 6.2, sy: 1.15, sz: 2.2, count: 210, group: 2 + (bay % 3) });
    addBoxSurface({ cx: side * 12.8, cy: -2.15, cz: z, sx: 5.2, sy: 1.6, sz: 3.8, count: 210, group: 2 + (bay % 3) });
    addBoxSurface({ cx: 0, cy: -3, cz: z, sx: 21.5, sy: 0.2, sz: 0.85, count: 95, group: 4 });
  }
  addBoxSurface({ cx: -15, cy: 5.1, cz: -73, sx: 1.1, sy: 1.1, sz: 18, count: 240, group: 4 });
  addBoxSurface({ cx: 15, cy: 5.1, cz: -73, sx: 1.1, sy: 1.1, sz: 18, count: 240, group: 4 });
  // Dormant fork supports introduce the construction grammar that will later
  // become the living canopy. They are separate permanent structures, not a
  // morphing preview of the finale.
  addForkSupport({ x: -9.2, z: -70, height: 5, spread: 1.9, group: 2, count: 330 });
  addForkSupport({ x: 9.4, z: -78, height: 5.3, spread: 2.1, group: 3, count: 350 });

  // 8. Assembly hall: the same grammar becomes a reliable large system.
  for (let bay = 0; bay < 5; bay += 1) {
    const z = -83 - (bay * 3.5);
    addBoxSurface({ cx: -10.7, cy: 0.8, cz: z, sx: 2, sy: 9.2, sz: 1.7, count: 190, group: 0 });
    addBoxSurface({ cx: 10.7, cy: 0.8, cz: z, sx: 2, sy: 9.2, sz: 1.7, count: 190, group: 0 });
    addBoxSurface({ cx: 0, cy: 5.1, cz: z, sx: 22.3, sy: 1, sz: 1.6, count: 170, group: 0 });
    if (bay % 2 === 0) {
      addBoxSurface({ cx: 0, cy: 1.55, cz: z, sx: 17.5, sy: 0.65, sz: 1.05, count: 150, group: 3 });
    }
  }
  addForkSupport({ x: -7.5, z: -92.5, height: 5.8, spread: 2.25, group: 2, count: 420, levels: 2 });
  addForkSupport({ x: 7.1, z: -99, height: 6.1, spread: 2.35, group: 3, count: 440, levels: 2 });

  // 9. One grounded bridge leaves the hall.
  addBoxSurface({ cx: 0, cy: -2.15, cz: -102, sx: 13.2, sy: 1.45, sz: 14, count: 720, group: 1 });
  addBoxSurface({ cx: -6.5, cy: -4.8, cz: -105, sx: 1.8, sy: 5.2, sz: 2, count: 190, group: 1 });
  addBoxSurface({ cx: 6.5, cy: -4.8, cz: -105, sx: 1.8, sy: 5.2, sz: 2, count: 190, group: 1 });

  // 10. Side decks physically join the central route at different levels.
  addBoxSurface({ cx: -7.5, cy: 1.4, cz: -111, sx: 19, sy: 1, sz: 3.5, count: 330, group: 2 });
  addBoxSurface({ cx: 8.5, cy: 4.6, cz: -115, sx: 21, sy: 1, sz: 3.5, count: 350, group: 3 });
  addBoxSurface({ cx: -10.8, cy: -0.8, cz: -111, sx: 2, sy: 5.5, sz: 2.2, count: 180, group: 2 });
  addBoxSurface({ cx: 11.6, cy: 1.1, cz: -115, sx: 2, sy: 7, sz: 2.2, count: 180, group: 3 });

  // 11. An unfinished axial city continues into fog.
  addSteppedTower({ x: -12, z: -122, height: 12, width: 6.8, levels: 4, group: 0, count: 620 });
  addSteppedTower({ x: 13.4, z: -125, height: 16, width: 7.8, levels: 5, group: 4, count: 720 });
  addSteppedTower({ x: -16.5, z: -132, height: 18, width: 8.8, levels: 5, group: 2, count: 760 });
  addSteppedTower({ x: 17.8, z: -136, height: 14, width: 7.2, levels: 4, group: 3, count: 620 });
  addPortal(-128, { width: 15, height: 11.5, depth: 2.6, group: 0, count: 620 });

  // 12. A rectangular living forum. The branching span reuses the foundations,
  // piers, bridge decks, and workshop service spine instead of forming a ring.
  addStairs({ z: -140, width: 17, depth: 7, rise: 1.2, steps: 5, group: 1, count: 320 });
  addBoxSurface({ cx: -14.8, cy: 0.2, cz: -147, sx: 6.4, sy: 9.5, sz: 17, count: 720, group: 1, anchor: 0.8 });
  addBoxSurface({ cx: 14.8, cy: 0.2, cz: -147, sx: 6.4, sy: 9.5, sz: 17, count: 720, group: 1, anchor: 0.8 });

  // Two rooted, tapered construction-trees reuse the corridor's columns and
  // beams but stop short of the ceiling. Their asymmetrical branches leave a
  // generous central opening and make the final release read as living growth
  // rather than another roof brace.
  addOrientedBeam({ from: [-5, -2.8, -140], to: [-4.8, 2, -143], thickness: 1.3, count: 300, group: 2, anchor: 0.18 });
  addOrientedBeam({ from: [-4.8, 2, -143], to: [-2.4, 4.5, -146], thickness: 0.85, count: 210, group: 2, anchor: 0.14 });
  addOrientedBeam({ from: [-4.8, 2, -143], to: [-8, 4.1, -145], thickness: 0.9, count: 220, group: 2, anchor: 0.14 });
  addOrientedBeam({ from: [-2.4, 4.5, -146], to: [0.8, 6.7, -149], thickness: 0.42, count: 130, group: 2, anchor: 0.08 });
  addOrientedBeam({ from: [-2.4, 4.5, -146], to: [-3.5, 6.5, -150], thickness: 0.36, count: 110, group: 4, anchor: 0.08 });
  addOrientedBeam({ from: [-8, 4.1, -145], to: [-9.8, 6.1, -148], thickness: 0.46, count: 140, group: 2, anchor: 0.08 });
  addOrientedBeam({ from: [-8, 4.1, -145], to: [-6.9, 7.1, -150], thickness: 0.38, count: 120, group: 4, anchor: 0.08 });
  addOrientedBeam({ from: [4.6, -2.8, -141], to: [4.9, 2.3, -144], thickness: 1.25, count: 300, group: 3, anchor: 0.18 });
  addOrientedBeam({ from: [4.9, 2.3, -144], to: [2.5, 4.8, -147], thickness: 0.82, count: 205, group: 3, anchor: 0.14 });
  addOrientedBeam({ from: [4.9, 2.3, -144], to: [8.2, 4.5, -146], thickness: 0.92, count: 225, group: 3, anchor: 0.14 });
  addOrientedBeam({ from: [2.5, 4.8, -147], to: [-0.7, 6.5, -150], thickness: 0.4, count: 125, group: 3, anchor: 0.08 });
  addOrientedBeam({ from: [2.5, 4.8, -147], to: [3.9, 7.2, -151], thickness: 0.34, count: 105, group: 4, anchor: 0.08 });
  addOrientedBeam({ from: [8.2, 4.5, -146], to: [9.7, 6.9, -149], thickness: 0.44, count: 135, group: 3, anchor: 0.08 });
  addOrientedBeam({ from: [8.2, 4.5, -146], to: [7.1, 7.7, -151], thickness: 0.36, count: 115, group: 4, anchor: 0.08 });
  addPortal(-160, { width: 13.2, height: 10.2, depth: 2.4, group: 0, count: 560 });
}

function blendPixel(buffer, width, height, x, y, colour, alpha) {
  if (x < 0 || y < 0 || x >= width || y >= height || alpha <= 0) return;
  const offset = ((Math.floor(y) * width) + Math.floor(x)) * 4;
  const inverse = 1 - alpha;
  buffer[offset] = Math.round((colour[0] * alpha) + (buffer[offset] * inverse));
  buffer[offset + 1] = Math.round((colour[1] * alpha) + (buffer[offset + 1] * inverse));
  buffer[offset + 2] = Math.round((colour[2] * alpha) + (buffer[offset + 2] * inverse));
}

function drawDisc(buffer, width, height, cx, cy, radius, colour, alpha) {
  const extent = Math.ceil(radius + 1);
  for (let y = Math.floor(cy - extent); y <= Math.ceil(cy + extent); y += 1) {
    for (let x = Math.floor(cx - extent); x <= Math.ceil(cx + extent); x += 1) {
      const distance = Math.hypot((x + 0.5) - cx, (y + 0.5) - cy);
      const coverage = Math.max(0, Math.min(1, (radius + 0.75) - distance));
      blendPixel(buffer, width, height, x, y, colour, alpha * coverage);
    }
  }
}

function stratifiedSample(source, count) {
  if (source.length <= count) return source;
  const output = [];
  const stride = source.length / count;
  for (let index = 0; index < count; index += 1) {
    output.push(source[Math.min(source.length - 1, Math.floor((index + 0.5) * stride))]);
  }
  return output;
}

async function renderFrame(frame, viewport, sourcePoints, { monochrome = false } = {}) {
  const { width, height } = viewport;
  const buffer = Buffer.alloc(width * height * 4);
  for (let offset = 0; offset < buffer.length; offset += 4) {
    buffer[offset] = BACKGROUND[0];
    buffer[offset + 1] = BACKGROUND[1];
    buffer[offset + 2] = BACKGROUND[2];
    buffer[offset + 3] = BACKGROUND[3];
  }
  const isMobile = viewport.width < viewport.height;
  const fov = isMobile ? 50 : 46;
  const focal = (height * 0.5) / Math.tan((fov * Math.PI / 180) * 0.5);
  const cameraY = isMobile ? 0.2 : 0.15;
  const fogStart = isMobile ? 10 : 12;
  const fogEnd = isMobile ? 38 : 40;
  const horizontalScale = isMobile ? 0.6 : 1;
  const visible = [];
  for (let index = 0; index < sourcePoints.length; index += 1) {
    const point = sourcePoints[index];
    const depth = frame.cameraZ - point.z;
    if (depth <= 3.5 || depth >= fogEnd + 5) continue;
    const lifeWave = frame.life
      ? Math.sin((point.z * 0.23) + (point.x * 0.11)) * 0.18 * (1 - point.anchor)
      : 0;
    const scale = focal / depth;
    const screenX = (width * 0.5) + (point.x * scale * horizontalScale);
    const screenY = (height * (isMobile ? 0.47 : 0.49)) - ((point.y + lifeWave - cameraY) * scale);
    if (screenX < -8 || screenX > width + 8 || screenY < -8 || screenY > height + 8) continue;
    const fog = Math.max(0, Math.min(1, (fogEnd - depth) / Math.max(1, fogEnd - fogStart)));
    const nearFade = Math.max(0, Math.min(1, (depth - 3.5) / 5.5));
    const maximumRadius = isMobile ? 2.65 : 2.45;
    const radius = Math.max(isMobile ? 0.82 : 0.7, Math.min(maximumRadius, 0.74 + (scale * 0.17)));
    visible.push({ point, depth, screenX, screenY, fog, nearFade, radius });
  }
  visible.sort((left, right) => right.depth - left.depth);
  for (const item of visible) {
    const palette = pointColour(item.point.group, item.point.x, item.point.z);
    const colour = monochrome
      ? [30 + (item.point.group * 5), 30 + (item.point.group * 5), 30 + (item.point.group * 5)]
      : palette;
    const alpha = (0.32 + (item.fog * 0.68)) * item.nearFade;
    drawDisc(buffer, width, height, item.screenX, item.screenY, item.radius, colour, alpha);
  }
  return sharp(buffer, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function projectClayPoint(point, frame, viewport) {
  const isMobile = viewport.width < viewport.height;
  const fov = isMobile ? 50 : 46;
  const focal = (viewport.height * 0.5) / Math.tan((fov * Math.PI / 180) * 0.5);
  const cameraY = isMobile ? 0.2 : 0.15;
  const horizontalScale = isMobile ? 0.6 : 1;
  const depth = frame.cameraZ - point[2];
  if (depth <= 2.8) return null;
  return {
    x: (viewport.width * 0.5) + ((point[0] * focal / depth) * horizontalScale),
    y: (viewport.height * (isMobile ? 0.47 : 0.49)) - (((point[1] - cameraY) * focal) / depth),
    depth,
  };
}

function clayTone(depth, fogEnd, faceIndex, group) {
  const fog = Math.max(0, Math.min(1, depth / fogEnd));
  const faceOffset = [18, 2, 30, 24, 8, 0][faceIndex] || 0;
  const materialOffset = (group % 3) * 7;
  return Math.round(Math.min(236, 70 + faceOffset + materialOffset + (fog * 145)));
}

async function renderClayFrame(frame, viewport) {
  const fogEnd = viewport.width < viewport.height ? 38 : 40;
  const faceIndices = [
    [0, 2, 6, 4],
    [1, 5, 7, 3],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 1, 3, 2],
    [4, 6, 7, 5],
  ];
  const faces = [];
  for (const box of solidBoxes) {
    if (box.sz > 80) continue;
    const x0 = box.cx - (box.sx * 0.5);
    const x1 = box.cx + (box.sx * 0.5);
    const y0 = box.cy - (box.sy * 0.5);
    const y1 = box.cy + (box.sy * 0.5);
    const z0 = box.cz - (box.sz * 0.5);
    const z1 = box.cz + (box.sz * 0.5);
    const corners = [
      [x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1],
    ].map((corner) => projectClayPoint(corner, frame, viewport));
    if (corners.some((corner) => !corner)) continue;
    faceIndices.forEach((indices, faceIndex) => {
      const vertices = indices.map((index) => corners[index]);
      const depth = vertices.reduce((sum, vertex) => sum + vertex.depth, 0) / vertices.length;
      if (depth > fogEnd + 5) return;
      faces.push({ vertices, depth, faceIndex, group: box.group });
    });
  }
  faces.sort((left, right) => right.depth - left.depth);

  const floorNearLeft = projectClayPoint([-8.6, -3.5, frame.cameraZ - 3], frame, viewport);
  const floorNearRight = projectClayPoint([8.6, -3.5, frame.cameraZ - 3], frame, viewport);
  const floorFarLeft = projectClayPoint([-8.6, -3.5, frame.cameraZ - fogEnd], frame, viewport);
  const floorFarRight = projectClayPoint([8.6, -3.5, frame.cameraZ - fogEnd], frame, viewport);
  const polygons = faces.map((face) => {
    const tone = clayTone(face.depth, fogEnd, face.faceIndex, face.group);
    const stroke = Math.max(45, tone - 24);
    const vertices = face.vertices.map((vertex) => `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`).join(' ');
    return `<polygon points="${vertices}" fill="rgb(${tone},${tone},${tone})" stroke="rgb(${stroke},${stroke},${stroke})" stroke-width="0.75"/>`;
  });
  const beams = solidBeams
    .map((beam) => {
      const lifeOffset = frame.life
        ? Math.sin((beam.to[0] * 0.19) + (beam.to[2] * 0.11)) * 0.72
        : 0;
      const restingFrom = projectClayPoint(beam.from, frame, viewport);
      const restingTo = projectClayPoint(beam.to, frame, viewport);
      const from = projectClayPoint([beam.from[0], beam.from[1] + (lifeOffset * 0.35), beam.from[2]], frame, viewport);
      const to = projectClayPoint([beam.to[0], beam.to[1] + lifeOffset, beam.to[2]], frame, viewport);
      if (!from || !to || Math.min(from.depth, to.depth) > fogEnd + 5) return '';
      const depth = (from.depth + to.depth) * 0.5;
      const tone = clayTone(depth, fogEnd, 1, beam.group);
      const width = Math.max(2, Math.min(18, (viewport.height * beam.thickness) / Math.max(4, depth)));
      const echo = frame.life && restingFrom && restingTo
        ? `<line x1="${restingFrom.x.toFixed(2)}" y1="${restingFrom.y.toFixed(2)}" x2="${restingTo.x.toFixed(2)}" y2="${restingTo.y.toFixed(2)}" stroke="rgb(${tone},${tone},${tone})" stroke-opacity="0.22" stroke-width="${width.toFixed(2)}" stroke-linecap="round"/>`
        : '';
      return `${echo}<line x1="${from.x.toFixed(2)}" y1="${from.y.toFixed(2)}" x2="${to.x.toFixed(2)}" y2="${to.y.toFixed(2)}" stroke="rgb(${tone},${tone},${tone})" stroke-width="${width.toFixed(2)}" stroke-linecap="round"/>`;
    })
    .join('');
  const floor = floorNearLeft && floorNearRight && floorFarLeft && floorFarRight
    ? `<polygon points="${floorNearLeft.x},${floorNearLeft.y} ${floorNearRight.x},${floorNearRight.y} ${floorFarRight.x},${floorFarRight.y} ${floorFarLeft.x},${floorFarLeft.y}" fill="#dedcd5"/>`
    : '';
  const centreNear = projectClayPoint([0, -3.27, frame.cameraZ - 3.1], frame, viewport);
  const centreFar = projectClayPoint([0, -3.27, frame.cameraZ - fogEnd], frame, viewport);
  const centreLine = centreNear && centreFar
    ? `<line x1="${centreNear.x}" y1="${centreNear.y}" x2="${centreFar.x}" y2="${centreFar.y}" stroke="#6f6d68" stroke-width="4"/>`
    : '';
  const svg = Buffer.from(`<svg width="${viewport.width}" height="${viewport.height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f4f2eb"/>
    ${floor}
    ${centreLine}
    ${polygons.join('')}
    ${beams}
  </svg>`);
  return sharp(svg).png().toBuffer();
}

async function makeSheet(frames, viewport, { annotated = false, columns, fileName }) {
  const panelHeight = viewport.height + (annotated ? LABEL_HEIGHT : 0);
  const rows = Math.ceil(frames.length / columns);
  const sheetWidth = (columns * viewport.width) + ((columns + 1) * PANEL_GAP);
  const sheetHeight = (rows * panelHeight) + ((rows + 1) * PANEL_GAP);
  const composites = [];
  frames.forEach((frame, index) => {
    const left = PANEL_GAP + ((index % columns) * (viewport.width + PANEL_GAP));
    const top = PANEL_GAP + (Math.floor(index / columns) * (panelHeight + PANEL_GAP));
    composites.push({ input: frame.image, left, top });
    if (annotated) {
      const label = Buffer.from(`
        <svg width="${viewport.width}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f4f2eb"/>
          <text x="12" y="22" fill="#111" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700">${String(index + 1).padStart(2, '0')} · ${frame.label}</text>
          <text x="12" y="42" fill="#444" font-family="Arial, Helvetica, sans-serif" font-size="11">${frame.textId}</text>
          <text x="12" y="57" fill="#777" font-family="Arial, Helvetica, sans-serif" font-size="10">camera Z ${frame.cameraZ.toFixed(1)}</text>
        </svg>
      `);
      composites.push({ input: label, left, top: top + viewport.height });
    }
  });
  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: '#080808',
    },
  }).composite(composites).png().toFile(`${OUTPUT_DIR}/${fileName}`);
}

await mkdir(OUTPUT_DIR, { recursive: true });
buildWorld();
const desktopPoints = stratifiedSample(points, 12_000);
const mobilePoints = stratifiedSample(points, 5_000);

const desktopFrames = [];
const mobileFrames = [];
const clayDesktopFrames = [];
const clayMobileFrames = [];
for (const frame of storyboard) {
  desktopFrames.push({
    ...frame,
    image: await renderFrame(frame, DESKTOP_FRAME, desktopPoints, { monochrome: true }),
  });
  mobileFrames.push({
    ...frame,
    image: await renderFrame(frame, MOBILE_FRAME, mobilePoints, { monochrome: true }),
  });
  clayDesktopFrames.push({
    ...frame,
    image: await renderClayFrame(frame, DESKTOP_FRAME),
  });
  clayMobileFrames.push({
    ...frame,
    image: await renderClayFrame(frame, MOBILE_FRAME),
  });
}

await makeSheet(desktopFrames, DESKTOP_FRAME, {
  annotated: false,
  columns: 3,
  fileName: 'silent-desktop.png',
});
await makeSheet(clayDesktopFrames, DESKTOP_FRAME, {
  annotated: false,
  columns: 3,
  fileName: 'clay-silent-desktop.png',
});
await makeSheet(clayMobileFrames, MOBILE_FRAME, {
  annotated: false,
  columns: 4,
  fileName: 'clay-silent-mobile.png',
});
await makeSheet(clayDesktopFrames, DESKTOP_FRAME, {
  annotated: true,
  columns: 3,
  fileName: 'clay-annotated-desktop.png',
});
await makeSheet(mobileFrames, MOBILE_FRAME, {
  annotated: false,
  columns: 4,
  fileName: 'silent-mobile.png',
});
await makeSheet(desktopFrames, DESKTOP_FRAME, {
  annotated: true,
  columns: 3,
  fileName: 'annotated-desktop.png',
});

await writeFile(`${OUTPUT_DIR}/storyboard.json`, `${JSON.stringify({
  title: 'The Long Assembly',
  generatedAt: new Date().toISOString(),
  sourcePointCount: points.length,
  desktopPointCount: desktopPoints.length,
  mobilePointCount: mobilePoints.length,
  frames: storyboard,
}, null, 2)}\n`);

console.log(`PASS: ${desktopPoints.length} desktop and ${mobilePoints.length} mobile permanent corridor points rendered to ${OUTPUT_DIR}.`);
