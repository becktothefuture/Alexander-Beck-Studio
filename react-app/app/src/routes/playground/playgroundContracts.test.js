import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  DEFAULT_PLAYGROUND_CONFIG,
  PLAYGROUND_CONFIG_BOUNDS,
  normalizePlaygroundConfig,
} from './config/playgroundConfig.js';
import {
  createPlaygroundActiveMediaOwnership,
  selectBoundedActiveWorldMediaIds,
} from './media/activeMediaOwnership.js';
import {
  PlaygroundContentValidationError,
  validatePlaygroundContent,
  validatePlaygroundContentForRuntime,
} from './media/playgroundContent.js';
import {
  PLAYGROUND_WORK_HISTORY_KEY,
  buildPlaygroundWorkUrl,
  clearPlaygroundWorkSelection,
  parsePlaygroundWorkSelection,
  updatePlaygroundWorkSelection,
} from './media/playgroundWorkUrl.js';
import {
  applyPlaygroundResponsiveProfile,
  calculateContentWorld,
  calculateNeighbouringCopyCoverage,
  createPlaygroundResponsiveProfile,
  forEachNeighbouringCopy,
  placePlaygroundItems,
} from './spatial/index.js';

const CONTENT_URL = new URL('../../../public/config/contents-portfolio.json', import.meta.url);
const PLACEMENT_OPTIONS = Object.freeze({
  ...DEFAULT_PLAYGROUND_CONFIG,
  includeTypeRow: false,
  titleSafePaddingCells: 3,
  titleSafeAreaCells: Object.freeze({ left: -10, top: -4, right: 10, bottom: 4 }),
});

async function readContent() {
  const source = JSON.parse(await readFile(CONTENT_URL, 'utf8'));
  return {
    version: source.version,
    title: source.title,
    description: source.description,
    items: source.snippets,
  };
}

function toPlacementItem(item) {
  return {
    ...item,
    preferredWidthCells: item.preferredGridSpan.columns,
    preferredHeightCells: item.preferredGridSpan.rows,
  };
}

function makeAddedItem(source, placementOrder, span = null) {
  const preferredGridSpan = span || { ...source.preferredGridSpan };
  return {
    ...source,
    id: `temporary-project-${placementOrder}`,
    placementOrder,
    label: `Temporary project ${placementOrder}`,
    preferredGridSpan,
    intrinsicDimensions: { ...source.intrinsicDimensions },
  };
}

function buildWorld(items, options = PLACEMENT_OPTIONS) {
  const placed = placePlaygroundItems(items.map(toPlacementItem), options);
  const world = calculateContentWorld(placed.placements, {
    ...options,
    titleSafeAreaCells: placed.titleSafeArea,
  });
  return { placed, world };
}

function getToroidalProjectClearances(placements, world) {
  const rectDistance = (left, right) => Math.hypot(
    Math.max(left.left - right.right, right.left - left.right, 0),
    Math.max(left.top - right.bottom, right.top - left.bottom, 0),
  );

  return placements.map((placement, placementIndex) => {
    let minimumClearance = Infinity;
    placements.forEach((candidate, candidateIndex) => {
      if (placementIndex === candidateIndex) return;
      for (let column = -1; column <= 1; column += 1) {
        for (let row = -1; row <= 1; row += 1) {
          minimumClearance = Math.min(minimumClearance, rectDistance(placement.bounds, {
            left: candidate.bounds.left + (column * world.columns),
            top: candidate.bounds.top + (row * world.rows),
            right: candidate.bounds.right + (column * world.columns),
            bottom: candidate.bounds.bottom + (row * world.rows),
          }));
        }
      }
    });
    return minimumClearance;
  });
}

test('canonical content validates the exact catalogue and accepts project 31 without code changes', async () => {
  const source = await readContent();
  const content = validatePlaygroundContent(source);
  const typeCounts = content.items.reduce((counts, item) => {
    counts[item.type] += 1;
    return counts;
  }, { image: 0, video: 0, code: 0 });

  assert.equal(content.items.length, 30);
  assert.deepEqual(typeCounts, { image: 18, video: 6, code: 6 });

  const withProject31 = validatePlaygroundContent({
    ...source,
    items: [...source.items, makeAddedItem(source.items[0], 31)],
  });
  assert.equal(withProject31.items.length, 31);
  assert.equal(withProject31.items.at(-1).id, 'temporary-project-31');
});

test('content validation isolates duplicate IDs, unsafe assets, and invalid code source fields', async () => {
  const source = await readContent();
  const invalid = structuredClone(source);
  invalid.items[1].id = invalid.items[0].id;
  invalid.items[1].poster = '../outside-playground.png';
  const invalidCodeItem = invalid.items.find((item) => item.type === 'code');
  invalidCodeItem.source = '/assets/playground/not-allowed.js';
  invalidCodeItem.demoId = 'unregistered-demo';

  assert.throws(
    () => validatePlaygroundContent(invalid),
    (error) => {
      assert.ok(error instanceof PlaygroundContentValidationError);
      assert.ok(error.issues.some((issue) => issue.includes('duplicates')));
      assert.ok(error.issues.some((issue) => issue.includes('safe root-relative URL')));
      assert.ok(error.issues.some((issue) => issue.includes('source must be omitted')));
      assert.ok(error.issues.some((issue) => issue.includes('registered local code demo')));
      return true;
    },
  );
});

test('runtime content validation omits one invalid item without hiding the valid collection', async () => {
  const source = await readContent();
  const invalid = structuredClone(source);
  invalid.items[7].poster = '../outside-playground.png';

  const content = validatePlaygroundContentForRuntime(invalid);
  assert.equal(content.items.length, 29);
  assert.equal(content.items.some((item) => item.id === source.items[7].id), false);
  assert.ok(content.validationIssues.some((issue) => issue.includes('items[7].poster')));
  assert.throws(() => validatePlaygroundContent(invalid), PlaygroundContentValidationError);
});

test('world growth is append-stable, content-sized, repeatable, and has no catalogue limit', async () => {
  const source = await readContent();
  const baseItems = source.items;
  const project31 = makeAddedItem(source.items[0], 31);
  const base = buildWorld(baseItems);
  const appended = buildWorld([...baseItems, project31]);

  assert.ok(base.world.widthPx > 2000);
  assert.ok(base.world.heightPx > 1400);
  assert.ok(base.world.columns >= 80);
  assert.ok(base.world.rows >= 56);
  assert.deepEqual(appended.placed.placements.slice(0, baseItems.length), base.placed.placements);
  assert.deepEqual(buildWorld([...baseItems, project31]), appended);

  const expandedItems = [...baseItems];
  for (let placementOrder = 31; placementOrder <= 90; placementOrder += 1) {
    expandedItems.push(makeAddedItem(
      source.items[placementOrder % source.items.length],
      placementOrder,
      { columns: 8 + (placementOrder % 4), rows: 6 + (placementOrder % 3) },
    ));
  }
  const expanded = buildWorld(expandedItems);
  assert.ok(expanded.world.columns > base.world.columns);
  assert.ok(expanded.world.rows > base.world.rows);
  assert.ok(expanded.world.occupiedCellArea > base.world.occupiedCellArea);
  assert.deepEqual(expanded.placed.placements.slice(0, baseItems.length), base.placed.placements);
  assert.deepEqual(expanded.placed.titleSafeArea, base.placed.titleSafeArea);

  const seamCoverage = calculateNeighbouringCopyCoverage({
    viewportWidthPx: 1440,
    viewportHeightPx: 1000,
    worldWidthPx: expanded.world.widthPx,
    worldHeightPx: expanded.world.heightPx,
    cameraX: (expanded.world.widthPx / 2) - 1,
    cameraY: (expanded.world.heightPx / 2) - 1,
    largestItemWidthPx: expanded.world.largestItemWidthPx,
    largestItemHeightPx: expanded.world.largestItemHeightPx,
  });
  const offsets = [];
  forEachNeighbouringCopy(seamCoverage, (x, y) => offsets.push([x, y]));
  assert.equal(offsets.length, seamCoverage.copyCount);
  assert.ok(seamCoverage.columnCount >= 2);
  assert.ok(seamCoverage.rowCount >= 2);
  assert.ok(offsets.some(([x]) => Math.abs(x) === expanded.world.widthPx));
  assert.ok(offsets.some(([, y]) => Math.abs(y) === expanded.world.heightPx));
});

test('canonical Work snippets keep collision clearance across world seams', async () => {
  const source = await readContent();
  const runtimeOptions = {
    ...applyPlaygroundResponsiveProfile(
      DEFAULT_PLAYGROUND_CONFIG,
      createPlaygroundResponsiveProfile(1440),
    ),
    includeTypeRow: false,
    titleSafePaddingCells: 0,
    titleSafeAreaCells: { left: -14, top: -4, right: 14, bottom: 4 },
  };
  const result = buildWorld(source.items, runtimeOptions);
  const clearances = getToroidalProjectClearances(result.placed.placements, result.world);
  const minimum = Math.min(...clearances);
  assert.equal(result.placed.diagnostics.maximumPassIndex, 0);
  assert.ok(minimum >= 3);
});

test('larger item spans expand their footprint and a seed change regenerates deterministically', async () => {
  const source = await readContent();
  const base = buildWorld(source.items);
  const largerItems = source.items.map((item, index) => (
    index === source.items.length - 1
      ? { ...item, preferredGridSpan: { columns: 32, rows: 32 } }
      : item
  ));
  const larger = buildWorld(largerItems);
  assert.ok(larger.world.largestItemWidthPx > base.world.largestItemWidthPx);
  assert.ok(larger.world.largestItemHeightPx > base.world.largestItemHeightPx);
  assert.ok(larger.world.occupiedCellArea > base.world.occupiedCellArea);

  const changedSeedOptions = { ...PLACEMENT_OPTIONS, layoutSeed: PLACEMENT_OPTIONS.layoutSeed + 1 };
  const changedA = buildWorld(source.items, changedSeedOptions);
  const changedB = buildWorld(source.items, changedSeedOptions);
  assert.deepEqual(changedA, changedB);
  assert.notDeepEqual(changedA.placed.placements, base.placed.placements);
});

test('work URL selection is validated, shareable, Back-aware, and safely clearable', async () => {
  const content = validatePlaygroundContent(await readContent());
  const ids = content.items.map((item) => item.id);
  const selectedId = ids[0];
  const locationLike = { href: 'https://beck.fyi/portfolio.html?theme=dark', search: '?theme=dark' };
  const calls = [];
  const historyLike = {
    state: {},
    pushState(state, unused, url) {
      calls.push({ method: 'push', state, unused, url });
      this.state = state;
    },
    replaceState(state, unused, url) {
      calls.push({ method: 'replace', state, unused, url });
      this.state = state;
    },
    back() { calls.push({ method: 'back' }); },
  };

  assert.equal(buildPlaygroundWorkUrl(selectedId, { locationLike, itemsOrIds: ids }), `/portfolio.html?theme=dark&work=${selectedId}`);
  assert.equal(updatePlaygroundWorkSelection(selectedId, { historyLike, locationLike, itemsOrIds: ids }), true);
  assert.equal(calls[0].state[PLAYGROUND_WORK_HISTORY_KEY], selectedId);
  assert.equal(parsePlaygroundWorkSelection(`?work=${selectedId}`, ids), selectedId);
  assert.equal(parsePlaygroundWorkSelection('?work=unknown-project', ids), null);
  assert.equal(updatePlaygroundWorkSelection('unknown-project', { historyLike, locationLike, itemsOrIds: ids }), false);

  const selectedLocation = {
    href: `https://beck.fyi/portfolio.html?work=${selectedId}`,
    search: `?work=${selectedId}`,
  };
  assert.equal(clearPlaygroundWorkSelection({ historyLike, locationLike: selectedLocation }), 'back');
  assert.equal(calls.at(-1).method, 'back');

  historyLike.state = {};
  assert.equal(clearPlaygroundWorkSelection({ historyLike, locationLike: selectedLocation }), 'replace');
  assert.equal(calls.at(-1).url, '/portfolio.html');
});

test('active media ownership selects one nearest visible instance per logical item', () => {
  const ownership = createPlaygroundActiveMediaOwnership();
  const changes = [];
  const first = ownership.register({
    itemId: 'video-one',
    instanceId: 'copy-a',
    distance: 90,
    eligible: true,
    visible: true,
    onOwnershipChange: (active) => changes.push(['copy-a', active]),
  });
  const second = ownership.register({
    itemId: 'video-one',
    instanceId: 'copy-b',
    distance: 40,
    eligible: true,
    visible: true,
    onOwnershipChange: (active) => changes.push(['copy-b', active]),
  });
  const iframe = ownership.register({
    itemId: 'code-one',
    instanceId: 'copy-c',
    distance: 20,
    eligible: true,
    visible: true,
  });

  assert.equal(first.isOwner(), false);
  assert.equal(second.isOwner(), true);
  assert.equal(iframe.isOwner(), true);
  assert.equal(ownership.getOwnerInstanceId('video-one'), 'copy-b');
  second.update({ visible: false });
  assert.equal(first.isOwner(), true);
  assert.equal(second.isOwner(), false);
  assert.ok(changes.some(([id, active]) => id === 'copy-a' && active));
  first.release();
  second.release();
  iframe.release();
  ownership.clear();
});

test('visible world media activates at most one video and one code runtime', () => {
  const items = [
    { id: 'image-one', type: 'image' },
    { id: 'video-one', type: 'video' },
    { id: 'code-one', type: 'code' },
    { id: 'video-two', type: 'video' },
    { id: 'code-two', type: 'code' },
  ];
  const active = selectBoundedActiveWorldMediaIds(
    items,
    new Set(['image-one', 'video-one', 'code-one', 'video-two', 'code-two']),
  );
  assert.deepEqual([...active], ['video-one', 'code-one']);
  assert.deepEqual(
    [...selectBoundedActiveWorldMediaIds(items, new Set(['video-two', 'code-two']))],
    ['video-two', 'code-two'],
  );
});

test('configuration normalization clamps every control and retains canonical defaults', () => {
  assert.deepEqual(normalizePlaygroundConfig(), DEFAULT_PLAYGROUND_CONFIG);
  const normalized = normalizePlaygroundConfig({
    layoutPreset: 'unknown',
    layoutSeed: Number.POSITIVE_INFINITY,
    gridSpacingPx: -1,
    minimumWorldColumns: 999,
    minimumWorldRows: -99,
    worldPaddingCells: 999,
    projectSpacing: 9,
    itemGapCells: 0,
    itemScale: 8,
    sizeVariation: -1,
    labelGapPx: 900,
    dotRadiusPx: 20,
    dotOpacity: -1,
    wheelSensitivity: 10,
    dragMomentum: 1,
  });

  assert.equal(normalized.layoutPreset, DEFAULT_PLAYGROUND_CONFIG.layoutPreset);
  for (const [key, bounds] of Object.entries(PLAYGROUND_CONFIG_BOUNDS)) {
    assert.ok(normalized[key] >= bounds.min, `${key} is below its minimum`);
    assert.ok(normalized[key] <= bounds.max, `${key} is above its maximum`);
  }
  assert.equal(normalized.layoutSeed, DEFAULT_PLAYGROUND_CONFIG.layoutSeed);
  assert.equal(normalized.gridSpacingPx, PLAYGROUND_CONFIG_BOUNDS.gridSpacingPx.min);
  assert.equal(normalized.minimumWorldColumns, PLAYGROUND_CONFIG_BOUNDS.minimumWorldColumns.max);
  assert.equal(normalized.dragMomentum, PLAYGROUND_CONFIG_BOUNDS.dragMomentum.max);
});

test('route material entrance reuses one measured card layout snapshot per transaction', async () => {
  const source = await readFile(new URL('./PlaygroundExperience.jsx', import.meta.url), 'utf8');
  assert.match(source, /let materialLayoutSnapshot = null/);
  assert.match(source, /materialLayoutSnapshot\.items\.length === items\.length/);
  assert.match(source, /const delayRatios = new WeakMap\(\)/);
  assert.match(source, /delayRatios\.set\([\s\S]*Math\.hypot\(dx, dy\)/);
  const delayReaderStart = source.indexOf('getDelayRatio:');
  const delayReaderEnd = source.indexOf('requestRender:', delayReaderStart);
  assert.ok(delayReaderStart >= 0 && delayReaderEnd > delayReaderStart);
  assert.doesNotMatch(source.slice(delayReaderStart, delayReaderEnd), /getBoundingClientRect/);
});
