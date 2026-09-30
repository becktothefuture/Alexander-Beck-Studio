import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Figma is the editable authority. This script creates small, deterministic
// runtime assets from the reviewed export without changing its geometry.
const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'docs/plans/about-game-board-20260921/figma-geometry/refined-20260923');
const ballSource = resolve(root, 'docs/plans/about-game-board-20260921/figma-geometry/refined-20260922');
const target = resolve(root, 'react-app/app/public/models/about-game-board');
const [svg, snapshotText, manifestText] = await Promise.all([
  readFile(resolve(source, 'geometry.svg'), 'utf8'),
  readFile(resolve(ballSource, 'scene-snapshot.json'), 'utf8'),
  readFile(resolve(source, 'capture-manifest.json'), 'utf8'),
]);
const snapshot = JSON.parse(snapshotText);
const manifest = JSON.parse(manifestText);
const sha256 = text => createHash('sha256').update(text).digest('hex');
const geometryLeafCount = (svg.match(/<path\b/g) || []).length;
if (snapshot.width !== 960 || snapshot.height !== 14140
  || geometryLeafCount !== manifest.geometry_leaf_count || snapshot.balls.length !== 1869
  || !svg.includes('viewBox="0 0 960 14140"')
  || !svg.includes('id="geometry-propeller-0001"')
  || !svg.includes('id="geometry-pinball-playfield"')
  || sha256(svg) !== manifest.files['geometry.svg']
  || manifest.ball_count !== snapshot.balls.length) {
  throw new Error('The Figma capture changed. Review its geometry and counts before syncing.');
}
const balls = snapshot.balls.map(([id, , x, y, radius, rgb]) => [id, x, y, radius, rgb]);
await mkdir(target, { recursive: true });
await Promise.all([
  writeFile(resolve(target, 'geometry.svg'), svg),
  writeFile(resolve(target, 'balls.json'), `${JSON.stringify(balls)}\n`),
]);
console.log(`Synced ${geometryLeafCount} geometry leaves and ${balls.length} ball placements.`);
