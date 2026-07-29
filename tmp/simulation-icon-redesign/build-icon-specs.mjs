import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('tmp/simulation-icon-redesign');
const specDir = resolve(root, 'specs');

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  vectorEffect: 'non-scaling-stroke',
};

const dot = {
  fill: 'currentColor',
  stroke: 'none',
};

const fill = {
  fill: 'currentColor',
  stroke: 'none',
};

const icons = {
  pit: [
    path('M12 16h24v16c0 4-3 7-7 7H19c-4 0-7-3-7-7z'),
    path('M18 16h12'),
    circle(18, 32, 3),
    circle(24, 28, 3.2),
    circle(31, 31, 3.6),
    circle(22, 36, 2.3),
    circle(28, 36, 2.1),
  ],
  flies: [
    circleStroke(34, 17, 4.6),
    circle(34, 17, 2.2),
    path('M34 8v3M25 17h3M40 17h3M29 23l-2 2'),
    circle(20, 29, 2.2),
    circle(15, 34, 1.9),
    circle(25, 25, 1.8),
    circle(18, 20, 1.6),
  ],
  '3d-cube': [
    path('M14 18l10-6 10 6v12l-10 6-10-6z'),
    path('M14 18l10 6 10-6M24 24v12'),
    circle(14, 18, 1.8),
    circle(24, 12, 1.8),
    circle(34, 18, 1.8),
    circle(24, 36, 1.8),
  ],
  water: [
    path('M9 19c4 0 4-3 8-3s4 3 8 3 4-3 8-3 4 3 8 3'),
    path('M9 28c5 0 5-3 10-3s5 3 10 3 5-3 10-3'),
    circle(16, 35, 1.9),
    circle(24, 36, 2.2),
    circle(32, 34.5, 1.9),
  ],
  'wall-repel': [
    path('M12 11v26'),
    path('M26 16c-5 1-8 4-8 8s3 7 8 8'),
    circle(35, 24, 5.2),
    circle(18, 18, 1.8),
    circle(18, 30, 1.8),
  ],
  '3d-sphere': [
    circleStroke(24, 24, 13),
    ellipse(24, 24, 5.6, 13),
    path('M12 24h24'),
    path('M16 17c5 2 11 2 16 0M16 31c5-2 11-2 16 0'),
  ],
  'napoleon-point-cloud': [
    path('M21 13c6 1 10 5 10 10 0 2-2 3-4 3 2 3 1 6-2 8M21 35c-4 0-8 1-11 3'),
    circle(22, 12, 2.2),
    circle(28, 15, 1.9),
    circle(32, 21, 2.1),
    circle(29, 26, 1.8),
    circle(25, 31, 2.1),
    circle(21, 36, 2.3),
    circle(14, 37, 1.9),
    circle(17, 28, 2),
    circle(17, 20, 1.9),
    circle(23, 21, 1.8),
    circle(29, 36, 1.7),
  ],
  'pressure-mosaic': [
    circle(16, 18, 3.2),
    circle(25, 16, 3.4),
    circle(34, 21, 3),
    circle(13, 28, 2.8),
    circle(23, 33, 3.5),
    circle(34, 33, 3),
    circle(39, 28, 2.1),
  ],
  'flock-of-birds': [
    circle(36, 24, 2.3),
    circle(29, 19, 2.1),
    circle(29, 29, 2.1),
    circle(21, 16, 1.9),
    circle(21, 32, 1.9),
    circle(14, 21, 1.8),
    circle(14, 27, 1.8),
  ],
  'flubber-blob': [
    path('M12 27c0-7 4-11 10-11 3-4 8-3 10 1 4 1 6 4 5 9-1 7-7 10-14 10-6 0-11-3-11-9z'),
  ],
  'weave-field': [
    path('M10 18c5-4 11-1 17 1 4 1 8 1 11-1'),
    path('M10 30c5-4 11-1 17 1 4 1 8 1 11-1'),
    path('M17 10c-4 6 0 12 1 18 1 4 0 7-1 10'),
    path('M31 10c-4 6 0 12 1 18 1 4 0 7-1 10'),
  ],
  'elastic-center': [
    path('M13 13h22v22H13z'),
    path('M24 24V13M24 24h11M24 24v11M24 24H13'),
    path('M24 24l8-8M24 24l-8 8'),
    circle(24, 24, 4.6),
    circle(24, 13, 1.7),
    circle(35, 24, 1.7),
    circle(24, 35, 1.7),
    circle(13, 24, 1.7),
  ],
  'kaleidoscope-3': [
    path('M24 10l7 14-7 14-7-14z'),
    path('M10 24l14-7 14 7-14 7z'),
    circle(24, 24, 2.8),
    circle(24, 10, 1.8),
    circle(38, 24, 1.8),
    circle(24, 38, 1.8),
    circle(10, 24, 1.8),
  ],
  'beach-ball-room': [
    rect(11, 13, 26, 22, 2),
    circleStroke(24, 24, 8.5),
    path('M23 15.5c4 3 5 11 2 17M16 25c5 3 11 3 16 0M18.5 19c4 2 7 2 11 0'),
  ],
};

await mkdir(specDir, { recursive: true });

for (const [id, elements] of Object.entries(icons)) {
  const spec = {
    canvas: { width: 48, height: 48, viewBox: '0 0 48 48', units: 'px' },
    metadata: { title: id, desc: 'Simulation focus modal icon draft.' },
    elements,
  };
  await writeFile(resolve(specDir, `${id}.json`), `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
}

function path(d) {
  return { type: 'path', d, style: stroke };
}

function filledPath(d) {
  return { type: 'path', d, style: fill };
}

function circle(cx, cy, r) {
  return { type: 'circle', cx, cy, r, style: dot };
}

function circleStroke(cx, cy, r) {
  return { type: 'circle', cx, cy, r, style: stroke };
}

function ellipse(cx, cy, rx, ry) {
  return { type: 'ellipse', cx, cy, rx, ry, style: stroke };
}

function rect(x, y, width, height, rx) {
  return { type: 'rect', x, y, width, height, rx, ry: rx, style: stroke };
}
