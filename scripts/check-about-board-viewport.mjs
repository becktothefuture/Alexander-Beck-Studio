import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createBoardArtwork } from '../react-app/app/src/routes/about-game-board/boardArtwork.js';
import {
  createBoardViewportWindow,
} from '../react-app/app/src/routes/about-game-board/boardViewportWindow.js';

const routeRoot = new URL('../react-app/app/src/routes/about-game-board/', import.meta.url);

test('the viewport strip remains bounded and rebases before its buffer edge', () => {
  const window = createBoardViewportWindow();
  const base = { worldTop: 500, worldWidth: 960, worldHeight: 12000, viewportHeight: 1000 };
  const opening = window.update({ ...base, scrollTop: 500 });
  assert.equal(opening.stripOriginCssPx, 0);
  assert.equal(opening.stripHeightCssPx, 3000);
  assert.equal(opening.stripEndCssPx, 3000);
  const revision = opening.revision;

  const inside = window.update({ ...base, scrollTop: 1200 });
  assert.equal(inside.stripOriginCssPx, 0);
  assert.equal(inside.revision, revision, 'ordinary native scroll must reuse the painted strip');

  const edge = window.update({ ...base, scrollTop: 2200 });
  assert.equal(edge.stripOriginCssPx, 700);
  assert.ok(edge.revision > revision, 'approaching the buffer edge must rebase its overscan');
  assert.ok(edge.stripHeightCssPx <= base.viewportHeight * 3);

  // A board-space point keeps the same screen coordinate after rebase because
  // the bitmap is positioned inside the same native scrolling world.
  const boardPointCss = 1900;
  const canvasScreenPoint = base.worldTop + edge.stripOriginCssPx - 2200
    + (boardPointCss - edge.stripOriginCssPx);
  assert.equal(canvasScreenPoint, base.worldTop + boardPointCss - 2200);

  const jump = window.update({ ...base, scrollTop: 9000 });
  assert.equal(jump.stripOriginCssPx, 7500);
  assert.equal(jump.sampledScroll, 9000);
  const bottom = window.update({ ...base, scrollTop: 12000 });
  assert.equal(bottom.stripOriginCssPx, 9000, 'the final strip must clamp to the world end');
  assert.equal(bottom.stripEndCssPx, base.worldHeight);
});
test('viewport resize changes the strip geometry without exceeding three screens', () => {
  const window = createBoardViewportWindow();
  window.update({
    scrollTop: 1400,
    worldTop: 400,
    worldWidth: 960,
    worldHeight: 12000,
    viewportHeight: 1000,
  });
  const resized = window.update({
    scrollTop: 1400,
    worldTop: 400,
    worldWidth: 720,
    worldHeight: 9000,
    viewportHeight: 800,
    force: true,
  });
  assert.equal(resized.stripHeightCssPx, 2400);
  assert.ok(resized.rebased);

  const previous = window.inspect();
  const invalid = window.update({
    scrollTop: Number.NaN,
    worldTop: 0,
    worldWidth: 0,
    worldHeight: 0,
    viewportHeight: 0,
  });
  assert.equal(invalid.stripOriginCssPx, previous.stripOriginCssPx,
    'a detached route must retain its last measurable strip');
});

test('SVG artwork reuses the same overscanned strip without duplicate writes', () => {
  const attributes = new Map([['viewBox', '0 0 960 14140']]);
  const writes = [];
  const svg = {
    style: {},
    getAttribute: name => attributes.get(name) ?? null,
    setAttribute: (name, value) => {
      attributes.set(name, value);
      writes.push([name, value]);
    },
    removeAttribute: name => attributes.delete(name),
    querySelector: () => null,
  };
  const reservoirTop = -200;
  const artwork = createBoardArtwork(svg, reservoirTop);
  artwork.setVisibleRange(1200, 4200, 0.75);
  const firstWrites = writes.length;
  artwork.setVisibleRange(1200, 4200, 0.75);
  assert.equal(writes.length, firstWrites, 'an unchanged strip must not invalidate SVG raster work');
  assert.deepEqual(artwork.inspect(), {
    top: 1200,
    bottom: 4200,
    stripOriginCssPx: (1200 - reservoirTop) * 0.75,
    stripHeightCssPx: 2250,
    viewportUpdates: 1,
  });
});

test('renderer source keeps measurement and backing-store work bounded', async () => {
  const [renderer, css] = await Promise.all([
    readFile(new URL('boardRenderer.js', routeRoot), 'utf8'),
    readFile(new URL('about-game-board.css', routeRoot), 'utf8'),
  ]);
  assert.doesNotMatch(renderer, /getBoundingClientRect\(/,
    'draw must consume route-cached metrics instead of measuring every frame');
  assert.doesNotMatch(renderer, /desynchronized\s*:/,
    'the board bitmap must use synchronized presentation');
  assert.match(renderer, /createBoardViewportWindow\(\)/);
  assert.match(renderer, /backingBytes: canvas\.width \* canvas\.height \* 4/);
  assert.match(css, /\.about-board-art \{[^}]*z-index: 1;/);
  assert.match(css, /#simulations \.about-board-balls \{[^}]*z-index: 0;/);
  assert.match(css, /\.about-board-text \{[^}]*z-index: 2;/);
  assert.doesNotMatch(css, /data-handoff-ready='false'[^}]*height:/,
    'loading diagnostics must not change the spatial-stage scroll height');
});
