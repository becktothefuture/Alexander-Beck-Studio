import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { LONDON_PALETTE_COLORS } from '../react-app/app/src/palette/londonPalettes.js';
import { resolveBoardBallRoleColours } from '../react-app/app/src/routes/about-game-board/boardScene.js';
import {
  createPortraitMap, decodePortraitMask, portraitPaletteRoles, portraitRoleAssignments,
} from '../react-app/app/src/routes/about-game-board/boardPortraitMap.js';
import {
  createPortraitCapture, samplePortraitArrival,
} from '../react-app/app/src/routes/about-game-board/boardPortraitCapture.js';
import { normalizeAboutPortrait } from '../react-app/app/src/lib/aboutPortrait.js';
import { portraitFieldGeometry, portraitViewportRect } from '../react-app/app/src/routes/about-game-board/boardPortraitGeometry.js';
import { createBoardLayout, remapBoardY } from '../react-app/app/src/routes/about-game-board/boardLayout.js';
import { createPortraitChute } from '../react-app/app/src/routes/about-game-board/boardPortraitChute.js';

const source = JSON.parse(readFileSync(new URL('../react-app/app/public/models/about-game-board/portrait-map.json', import.meta.url)));
const mask = decodePortraitMask(source);
const inventory = count => Array.from({ length: count }, (_, index) => ({ id: `pit-${index}` }));

test('editorial percentages match the shortened machine container at every width', () => {
  for (const width of [300, 370, 1412]) {
    const layout = createBoardLayout(width < 900,
      { boardWidth: width, viewportHeight: 844, quietHeights: {} });
    const scale = width / 960;
    const chute = createPortraitChute(layout.portraitChuteTop, 26);
    const containerHeight = layout.mapY(chute.outletY) * scale;
    for (const interval of layout.placement.intervals) {
      const fraction = layout.mapY(interval.textY) / layout.sceneHeight;
      assert.ok(Math.abs(fraction * containerHeight - layout.mapY(interval.textY) * scale) < 1e-8,
        'editorial text and visible architecture must use the same coordinate scale');
    }
  }
});

test('the portrait chute has mirrored sloping guides and a centred four-ball opening', () => {
  for (const radius of [6.65, 20.32, 26]) {
    const { left, right, outletY, guides } = createPortraitChute(12000, radius);
    assert.equal((left + right) / 2, 480);
    assert.ok(right - left >= radius * 8 - 1e-8);
    assert.deepEqual(guides[1], guides[0].map(([x, y]) => [960 - x, y]).reverse());
    const [entry, neck, exit] = guides[0];
    assert.ok(entry[0] < 0 && entry[1] < neck[1] && neck[1] < exit[1]);
    assert.deepEqual(exit, [left, outletY]);
  }
});

test('responsive silhouettes use every original ID once with an exact colour allocation', () => {
  for (const count of [120, 687, 1200, 2501, 4096]) {
    const balls = inventory(count), map = createPortraitMap(mask, balls);
    assert.equal(map.targets.length, count);
    assert.equal(map.pigments.size, count);
    assert.deepEqual(new Set(map.pigments.keys()), new Set(balls.map(ball => ball.id)));
    assert.equal(map.counts.reduce((sum, value) => sum + value), count);
    assert.equal(new Set(map.targets.map(target => `${target.row}:${target.column}`)).size, count);
    for (const target of map.targets) {
      assert.ok(mask.pixels[Math.floor(target.y * mask.height) * mask.width + Math.floor(target.x * mask.width)]);
    }
    assert.ok(map.rows.every((row, index) => !index || row[0].row < map.rows[index - 1][0].row));
  }
});

test('all schemes conserve pigments, keep neutral roles, and order face tones by brightness', () => {
  const map = createPortraitMap(mask, inventory(687));
  const brightness = hex => hex.slice(1).match(/../g).map(value => {
    const c = parseInt(value, 16) / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  }).reduce((sum, c, index) => sum + c * [.2126, .7152, .0722][index], 0);
  for (const colours of Object.values(LONDON_PALETTE_COLORS)) {
    const palette = { colors: colours }, roles = portraitPaletteRoles(palette);
    assert.equal(roles[0], 0); assert.equal(roles[2], 2);
    assert.equal(new Set(roles).size, 6);
    const assigned = portraitRoleAssignments(map, roles);
    for (let pigment = 0; pigment < 6; pigment += 1) {
      assert.equal([...assigned.values()].filter(role => role === roles[pigment]).length, map.counts[pigment]);
    }
    const actual = resolveBoardBallRoleColours(palette);
    const tones = [4, 1, 3, 5].map(pigment => brightness(actual[roles[pigment]]));
    assert.ok(tones.every((tone, index) => !index || tone >= tones[index - 1]));
  }
});

test('outlet arrivals cannot duplicate an ID and all targets complete within a bounded workload', () => {
  for (const count of [687, 2501]) {
    const map = createPortraitMap(mask, inventory(count));
    const capture = createPortraitCapture(map, {});
    let index = 0;
    for (const id of map.pigments.keys()) {
      assert.equal(capture.accept(id, index++ % 960, 10000, 3, 12), true);
      assert.equal(capture.accept(id, 0, 0, 0, 0), false);
    }
    const maximumFrames = Math.ceil(count / 384) * (Math.ceil(2600 / (1000 / 60)) + 2);
    for (let frame = 0; frame < maximumFrames && !capture.inspect().complete; frame += 1) capture.advance(1000 / 60);
    const state = capture.inspect();
    assert.equal(state.settled, count); assert.equal(state.complete, true);
    assert.ok(state.maximumActive <= 384);
    assert.equal(new Set(capture.snapshot().map(record => record.targetIndex)).size, count);
    const before = capture.snapshot();
    capture.setSettings({ aboutPortraitSpacing: .12, aboutPortraitSpeed: 1.3 });
    capture.advance(1000 / 60);
    assert.deepEqual(capture.snapshot(), before, 'appearance changes must not move or replace completed balls');
  }
});

test('time cannot fill an empty field; a real outlet body retains its identity and colour', () => {
  const map = createPortraitMap(mask, inventory(687)), capture = createPortraitCapture(map, {});
  for (let frame = 0; frame < 1800; frame += 1) capture.advance(1000 / 60);
  assert.equal(capture.inspect().captured, 0);
  assert.equal(capture.settled.length, 0); assert.equal(capture.activeCount, 0);
  const pigment = map.rows[0][0].pigment;
  const id = [...map.pigments].find(([, value]) => value === pigment)[0];
  const body = { plugin: { boardId: id, boardColour: '#ffcf00' },
    position: { x: 340, y: 20000 }, velocity: { x: 2, y: 8 }, circleRadius: 20 };
  assert.equal(capture.acceptBody(body, 20001), false, 'a ball still above the outlet cannot enter');
  assert.equal(capture.acceptBody(body, 19999), true);
  assert.equal(capture.acceptBody(body, 19999), false);
  capture.advance(16);
  const record = capture.snapshot().find(record => record.id === id);
  assert.equal(record.source, 'outlet'); assert.equal(record.sourceColour, body.plugin.boardColour);
  assert.equal(record.sourceX, body.position.x); assert.equal(record.sourceY, body.position.y);
  assert.equal(record.sourceRadius, body.circleRadius);
  assert.equal(capture.inspect().captured, 1);
  assert.equal(capture.activeCount, 1);
});

test('a late colour cannot hold arrived balls, and each colour builds from the bottom up', () => {
  const map = createPortraitMap(mask, inventory(687));
  const capture = createPortraitCapture(map, {}, true);
  const heldPigment = map.rows[0][0].pigment;
  for (const [id, pigment] of map.pigments) if (pigment !== heldPigment) capture.accept(id, 480, 9990);
  capture.advance(16);
  assert.equal(capture.inspect().settled, map.count - map.counts[heldPigment]);
  assert.ok(capture.snapshot().filter(record => record.state === 'settled')
    .every(record => record.pigment !== heldPigment));
  for (let pigment = 0; pigment < 6; pigment += 1) {
    const ordered = capture.settled.map(index => capture.records[index])
      .filter(record => record.pigment === pigment);
    assert.ok(ordered.every((record, index) => !index || record.target.row <= ordered[index - 1].target.row));
  }
  for (const [id, pigment] of map.pigments) if (pigment === heldPigment) capture.accept(id, 480, 9990);
  capture.advance(16);
  assert.equal(capture.inspect().settled, map.count);
  assert.equal(capture.inspect().active, 0);
});

test('arrival starts with a continuous incoming tangent and stops at its target', () => {
  const record = { startX: .1, startY: -.3, tangentX: .2, tangentY: .8, target: { x: .7, y: .6 } };
  const out = {};
  assert.deepEqual(samplePortraitArrival(record, 0, out), { x: .1, y: -.3 });
  const epsilon = 1e-5;
  const first = { ...samplePortraitArrival(record, epsilon, out) };
  assert.ok(Math.abs((first.x - .1) / epsilon - .2) < .0001);
  assert.ok(Math.abs((first.y + .3) / epsilon - .8) < .0001);
  const last = { ...samplePortraitArrival(record, 1 - epsilon, out) };
  assert.ok(Math.hypot(last.x - .7, last.y - .6) / epsilon < .0001);
  assert.deepEqual(samplePortraitArrival(record, 1, out), { x: .7, y: .6 });
});

test('portrait settings round-trip through canonical runtime and stay in supported bounds', () => {
  const canonical = JSON.parse(readFileSync(new URL('../react-app/app/public/config/design-system.json', import.meta.url)));
  const config = normalizeAboutPortrait(canonical.runtime);
  for (const [key, value] of Object.entries(config)) assert.equal(canonical.runtime[key], value);
  assert.deepEqual(normalizeAboutPortrait({ aboutPortraitSize: 2, aboutPortraitSpeed: 0, aboutPortraitSpacing: NaN }),
    { aboutPortraitSpacing: .08, aboutPortraitSpeed: .5 });
});

test('the mural expands around unchanged ball diameters with a nonoverlapping close-packed lattice', () => {
  for (const [count, width, radius] of [[2501, 1420, 9.8], [687, 370, 7.8]]) {
    const map = createPortraitMap(mask, inventory(count));
    const byCell = new Map(map.targets.map(target => [`${target.row}:${target.column}`, target]));
    for (const spacing of [.02, .08, .24]) {
      const field = portraitFieldGeometry(map, width, radius, spacing);
      assert.equal(field.radius, radius);
      assert.ok(Math.abs(field.size * map.pitch - radius * 2 * (1 + spacing)) < 1e-8);
      assert.ok(field.outlet >= radius * 2);
      assert.ok(field.headroom >= 164 && field.headroom <= 304);
      assert.equal(field.ledge.top + field.ledge.thickness, field.height);
      let topEdge = Infinity;
      let bottomEdge = -Infinity;
      for (const a of map.targets) {
        const x = field.left + a.x * field.size, y = field.top + a.y * field.portraitHeight;
        assert.ok(x - radius >= 16 && x + radius <= field.width - 16);
        topEdge = Math.min(topEdge, y - radius);
        bottomEdge = Math.max(bottomEdge, y + radius);
        for (const [row, column] of [[a.row, a.column + 1], [a.row + 1, a.column - 1],
          [a.row + 1, a.column], [a.row + 1, a.column + 1]]) {
          const b = byCell.get(`${row}:${column}`);
          if (!b) continue;
          const distance = Math.hypot((a.x - b.x) * field.size, (a.y - b.y) * field.portraitHeight);
          assert.ok(distance >= radius * 2 - 1e-8, 'balls must keep their full diameter without overlap');
        }
      }
      assert.ok(Math.abs(bottomEdge - field.ledge.top) < 1e-8, 'the lowest balls sit flush on the ledge');
      assert.ok(topEdge >= field.outlet + field.headroom - 1e-8);
    }
  }
});

test('outlet entry retains the actual lateral pose, radius and incoming tangent', () => {
  const map = createPortraitMap(mask, inventory(687)), capture = createPortraitCapture(map, {});
  const field = portraitFieldGeometry(map, 370, 7.8, .08);
  const entry = { ...field, boardScale: 370 / 960, outletTop: -180 };
  capture.setEntryGeometry(entry);
  const body = { plugin: { boardId: 'pit-0', boardColour: '#ffcf00' },
    position: { x: 340, y: 12000 }, velocity: { x: -2, y: 8 }, circleRadius: 20.2 };
  assert.equal(capture.acceptBody(body, 11998), true);
  capture.advance(16);
  const record = capture.records.find(record => record.id === 'pit-0');
  assert.ok(Math.abs(field.left + record.x * field.size - (field.machineLeft + body.position.x * entry.boardScale)) < 1e-8);
  assert.ok(Math.abs(field.top + record.y * field.portraitHeight - (entry.outletTop + 2 * entry.boardScale)) < 1e-8);
  assert.ok(Math.abs(record.tangentX * field.size / record.duration - body.velocity.x * entry.boardScale / (1000 / 60)) < 1e-8);
  for (let frame = 0; frame < 180; frame += 1) capture.advance(16);
  assert.equal(record.state, 'settled');
  assert.equal(record.sourceRadius, body.circleRadius);
});

test('large murals use a bounded reusable viewport without scaling or losing positions', () => {
  const map = createPortraitMap(mask, inventory(4096));
  const field = portraitFieldGeometry(map, 370, 7.8, .08);
  const first = portraitViewportRect(field, 370, 746, 0, 0);
  assert.ok(first.width <= Math.ceil(370 * 1.25));
  assert.ok(first.height <= Math.ceil(746 * 1.25));
  assert.equal(portraitViewportRect(field, 370, 746, 10, 10, first), first);
  const last = portraitViewportRect(field, 370, 746, field.height - 746, field.width - 370, first);
  assert.notEqual(last, first);
  assert.ok(last.left + last.width <= field.width);
  assert.ok(last.top + last.height <= field.height);
  const target = map.targets[0];
  assert.equal(field.left + target.x * field.size - last.left + last.left, field.left + target.x * field.size);
  assert.equal(field.radius, 7.8);
});

test('a portrait shorter than its viewport reuses its settled bitmap', () => {
  const field = portraitFieldGeometry(createPortraitMap(mask, inventory(687)), 370, 7.8, .08);
  assert.ok(field.height < 746);
  const first = portraitViewportRect(field, 370, 746, 0, 0);
  assert.equal(first.height, field.height);
  for (const scroll of [0, 10, 200]) {
    assert.equal(portraitViewportRect(field, 370, 746, scroll, 0, first), first,
      'showing the closing text must not rebuild the settled cache every frame');
  }
});

test('reading reflow preserves a travelling ball within its original machine module or gap', () => {
  const before = createBoardLayout(true, { boardWidth: 370, viewportHeight: 746,
    quietHeights: { practice: 180, disciplines: 1100 } });
  const after = createBoardLayout(true, { boardWidth: 370, viewportHeight: 746,
    quietHeights: { practice: 360, disciplines: 1800 } });
  for (let index = 0; index < before.placement.modules.length; index += 1) {
    const a = before.placement.modules[index], b = after.placement.modules[index];
    assert.ok(Math.abs(remapBoardY(a.top + a.height * .4, before, after) - (b.top + b.height * .4)) < 1e-8);
    const nextA = before.placement.modules[index + 1], nextB = after.placement.modules[index + 1];
    if (nextA) {
      const y = (a.top + a.height + nextA.top) / 2;
      assert.ok(Math.abs(remapBoardY(y, before, after) - (b.top + b.height + nextB.top) / 2) < 1e-8);
      assert.ok(Math.abs(remapBoardY(remapBoardY(y, before, after), after, before) - y) < 1e-8);
    }
  }
});
