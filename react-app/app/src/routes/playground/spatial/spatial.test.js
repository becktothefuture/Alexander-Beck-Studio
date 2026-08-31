import assert from 'node:assert/strict';
import test from 'node:test';
import { getProjectParallaxFactor, projectDepthCoordinate, resolveDepthSource } from './projectDepth.js';

import { DEFAULT_PLAYGROUND_CONFIG, normalizePlaygroundConfig } from '../config/playgroundConfig.js';

import {
  calculateContentWorld,
  calculateNeighbouringCopyCoverage,
  applyPlaygroundResponsiveProfile,
  createPlaygroundResponsiveProfile,
  cellRectsOverlap,
  findDirectionalPlaygroundItem,
  createPlaygroundSpatialDiagnostics,
  didPointerTravelExceedThreshold,
  forEachNeighbouringCopy,
  normalizeWheelDelta,
  placePlaygroundItems,
  positiveModulo,
  quantizeCells,
  resolveItemGridFootprint,
  writeRenderedCamera,
  writeResizePreservedCamera,
  writeScreenToWorld,
  writeWorldToScreen,
} from './index.js';

test('snippet depth changes travel, keeps media size, and becomes flat for reduced motion', () => {
  assert.equal(getProjectParallaxFactor({ kind: 'case-study' }, { snippetDepth: 0.2 }), 1);
  assert.equal(getProjectParallaxFactor({ kind: 'snippet' }, { snippetDepth: 0.12 }), 0.88);
  assert.equal(getProjectParallaxFactor({ kind: 'snippet' }, { snippetDepth: 0.2 }, true), 1);
  assert.equal(getProjectParallaxFactor({ kind: 'snippet' }, { snippetDepth: 3 }), 0.8);
  assert.equal(getProjectParallaxFactor({ kind: 'snippet' }, { snippetDepth: -1 }), 1);
  const width = 240;
  const before = projectDepthCoordinate(100, width, 0.88);
  const after = projectDepthCoordinate(300, width, 0.88);
  assert.ok(Math.abs(after - before - 176) < 1e-8);
  assert.ok(Math.abs((before + width) - before - width) < 1e-8);
});

test('exact tapped-repeat projection round trips at both depths, scales, and negative periods', () => {
  for (const worldScale of [0.84, 1]) {
    for (const parallax of [0.8, 0.88, 1]) {
      for (const period of [-5, 0, 5]) {
        const x = period * 3200 + 120;
        const y = -period * 2400 + 60;
        const width = 240;
        const height = 220;
        const buttonHeight = 199; // Caption footprint is deliberately conservative.
        const camera = { logicalX: x + 100, logicalY: y + 50, viewportCenterX: 700, viewportCenterY: 430 };
        const viewportRect = { left: 16, top: 16 };
        const rect = {
          left: viewportRect.left + camera.viewportCenterX
            + (projectDepthCoordinate(x, width, parallax) - camera.logicalX * parallax) * worldScale,
          top: viewportRect.top + camera.viewportCenterY
            + (projectDepthCoordinate(y, height, parallax) - camera.logicalY * parallax) * worldScale,
          width: width * worldScale, height: buttonHeight * worldScale,
        };
        const source = resolveDepthSource({ rect, viewportRect, camera, worldScale, parallax, width, height });
        assert.ok(Math.abs(source.x - x) < 1e-8 && Math.abs(source.y - y) < 1e-8);
        const centredX = (projectDepthCoordinate(x, width, parallax) - source.targetX * parallax) * worldScale + rect.width / 2;
        const centredY = (projectDepthCoordinate(y, height, parallax) - source.targetY * parallax) * worldScale + rect.height / 2;
        assert.ok(Math.abs(centredX) < 1e-8 && Math.abs(centredY) < 1e-8);
      }
    }
  }
});

test('responsive Work profile preserves desktop intent and compacts continuously toward phone', () => {
  const desktop = createPlaygroundResponsiveProfile(1440);
  const tablet = createPlaygroundResponsiveProfile(768);
  const phone = createPlaygroundResponsiveProfile(390);
  const authored = { projectSpacing: 1.5, dotRadiusPx: 2.25 };
  const phoneConfig = applyPlaygroundResponsiveProfile(authored, phone);

  assert.equal(desktop.worldScale, 1);
  assert.equal(desktop.projectSpacingScale, 1);
  assert.ok(tablet.worldScale < 1 && tablet.worldScale > phone.worldScale);
  assert.ok(tablet.projectSpacingScale < 1 && tablet.projectSpacingScale > phone.projectSpacingScale);
  assert.equal(phone.worldScale, 0.84);
  assert.equal(tablet.titleScale, 1);
  assert.equal(phone.titleScale, 1);
  assert.ok(Math.abs(phoneConfig.projectSpacing - 1) < 0.000001);
  assert.equal(phoneConfig.itemGapCells, 1);
  assert.equal(phoneConfig.dotRadiusPx, 1.96875);
  assert.equal(phone.minimumItemTargetPx, 44 / 0.84);
  assert.ok(phone.captionTitleMinimumPx * phone.worldScale >= 12);
  assert.ok(phone.captionDescriptionMinimumPx * phone.worldScale >= 12);
});

test('image diagonal follows usable viewport width and height between authored clamps', () => {
  const config = { ...DEFAULT_PLAYGROUND_CONFIG };
  const resolve = (width, height) => applyPlaygroundResponsiveProfile(config,
    createPlaygroundResponsiveProfile(width, height));
  assert.equal(resolve(370, 779).itemDiagonalPx, config.itemDiagonalMinPx);
  assert.equal(resolve(1412, 838).itemDiagonalPx, config.itemDiagonalMaxPx);
  const middle = resolve(960, 1120);
  assert.equal(middle.itemDiagonalPx, Math.hypot(960, 1120) * config.itemDiagonalViewportRatio);
  assert(middle.itemDiagonalPx > resolve(960, 700).itemDiagonalPx,
    'Height-only resize must change a diagonal-owned size in the fluid interval.');
  assert.equal(resolve(960, 1120).itemDiagonalPx, resolve(1120, 960).itemDiagonalPx);
  assert(Number.isFinite(resolve(NaN, Infinity).itemViewportScale));
  const hostile = normalizePlaygroundConfig({ itemDiagonalMinPx: 900, itemDiagonalMaxPx: -1,
    itemDiagonalViewportRatio: Infinity });
  assert(hostile.itemDiagonalMinPx <= hostile.itemDiagonalMaxPx);
  assert.equal(hostile.itemDiagonalViewportRatio, DEFAULT_PLAYGROUND_CONFIG.itemDiagonalViewportRatio);
});

test('diagonal scaling preserves hierarchy, intrinsic ratios, and independence from the layout grid', () => {
  const primary = { id: 'diagonal-case', kind: 'case-study', preferredGridSpan: { columns: 15, rows: 19 },
    intrinsicDimensions: { width: 4, height: 5 } };
  const snippet = { id: 'diagonal-snippet', kind: 'snippet', preferredGridSpan: { columns: 8, rows: 5 },
    intrinsicDimensions: { width: 16, height: 9 } };
  for (const [width, height] of [[370, 779], [960, 1120], [1412, 838], [3440, 1440]]) {
    const profile = createPlaygroundResponsiveProfile(width, height);
    let previousDiagonal;
    for (const gridSpacingPx of [24, 48, 72]) {
      const config = applyPlaygroundResponsiveProfile({ ...DEFAULT_PLAYGROUND_CONFIG,
        gridSpacingPx, sizeVariation: 0 }, profile);
      const large = resolveItemGridFootprint(primary, config);
      const small = resolveItemGridFootprint(snippet, config);
      const diagonal = Math.hypot(large.mediaWidthCells, large.mediaHeightCells) * gridSpacingPx * profile.worldScale;
      assert(Math.abs(diagonal - config.itemDiagonalPx) < 0.001);
      if (previousDiagonal) assert(Math.abs(diagonal - previousDiagonal) < 0.001);
      previousDiagonal = diagonal;
      assert(Math.abs(large.mediaWidthCells / large.mediaHeightCells - 0.8) < 0.00001);
      assert(Math.abs(small.mediaWidthCells / small.mediaHeightCells - 16 / 9) < 0.00001);
      assert(large.mediaWidthCells * large.mediaHeightCells > small.mediaWidthCells * small.mediaHeightCells * 2);
    }
  }
});

function createItems(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `piece-${index + 1}`,
    placementOrder: index,
    type: index % 3 === 0 ? 'image' : index % 3 === 1 ? 'video' : 'code',
    preferredWidthCells: 4 + (index % 4),
    preferredHeightCells: 3 + (index % 3),
    intrinsicWidth: 640,
    intrinsicHeight: 480,
    label: `Playground piece ${index + 1}`,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  }));
}

const PLACEMENT_OPTIONS = {
  layoutPreset: 'balanced',
  layoutSeed: 0xabecc1,
  gridSpacingPx: 48,
  itemGapCells: 3,
  projectSpacing: 1.5,
  itemScale: 1.5,
  sizeVariation: 0.28,
  labelGapPx: 8,
  titleSafePaddingCells: 2,
  titleSafeAreaCells: { left: -9, top: -4, right: 9, bottom: 4 },
};

test('positive modulo wraps only rendered camera coordinates', () => {
  assert.equal(positiveModulo(-1, 100), 99);
  assert.equal(positiveModulo(201, 100), 1);
  assert.equal(positiveModulo(-200, 100), 0);
  const rendered = { x: 0, y: 0 };
  writeRenderedCamera(-1, 201, 100, 80, rendered);
  assert.deepEqual(rendered, { x: 99, y: 41 });
});

test('spatial project navigation selects the nearest directional toroidal neighbour', () => {
  const placements = [
    { id: 'centre', placementOrder: 1, xCell: 0, yCell: 0, footprintWidthCells: 2, footprintHeightCells: 2 },
    { id: 'right-near', placementOrder: 2, xCell: 6, yCell: 1, footprintWidthCells: 2, footprintHeightCells: 2 },
    { id: 'right-off-axis', placementOrder: 3, xCell: 4, yCell: 8, footprintWidthCells: 2, footprintHeightCells: 2 },
    { id: 'left-seam', placementOrder: 4, xCell: 18, yCell: 0, footprintWidthCells: 2, footprintHeightCells: 2 },
    { id: 'up', placementOrder: 5, xCell: 0, yCell: -7, footprintWidthCells: 2, footprintHeightCells: 2 },
  ];
  const world = { columns: 20, rows: 20 };

  assert.equal(
    findDirectionalPlaygroundItem(placements, 'centre', 'right', world)?.id,
    'right-near',
  );
  assert.equal(
    findDirectionalPlaygroundItem(placements, 'centre', 'left', world)?.id,
    'left-seam',
  );
  assert.equal(
    findDirectionalPlaygroundItem(placements, 'centre', 'up', world)?.id,
    'up',
  );
  assert.equal(findDirectionalPlaygroundItem(placements, 'centre', 'invalid', world), null);
});

test('keyboard navigation uses the visible depth projection and its reduced-motion counterpart', () => {
  const item = (id, centre, parallax) => ({ id, placementOrder: centre + 1, xCell: centre - 1,
    yCell: -1, footprintWidthCells: 2, footprintHeightCells: 2, parallax });
  const placements = [item('current', 0, 1), item('case', 10, 1), item('snippet', 11, 0.8)];
  const world = { columns: 100, rows: 100, cameraXCells: 0, cameraYCells: 0 };
  assert.equal(findDirectionalPlaygroundItem(placements, 'current', 'right', world).id, 'snippet');
  assert.equal(findDirectionalPlaygroundItem(placements, 'current', 'right', { ...world, reducedMotion: true }).id, 'case');
});

test('camera projection round trips and resize preserves an anchored world point', () => {
  const screen = { x: 0, y: 0 };
  const world = { x: 0, y: 0 };
  writeWorldToScreen(320, -120, 80, -40, 600, 400, screen);
  writeScreenToWorld(screen.x, screen.y, 80, -40, 600, 400, world);
  assert.deepEqual(world, { x: 320, y: -120 });

  const resized = { x: 0, y: 0 };
  writeResizePreservedCamera({
    cameraX: 80,
    cameraY: -40,
    previousCenterX: 600,
    previousCenterY: 400,
    nextCenterX: 430,
    nextCenterY: 310,
  }, resized);
  assert.deepEqual(resized, { x: 80, y: -40 });
});

test('pointer and wheel helpers keep click and scroll policy explicit', () => {
  assert.equal(didPointerTravelExceedThreshold(0, 0, 5, 0, 6), false);
  assert.equal(didPointerTravelExceedThreshold(0, 0, 6, 0, 6), true);
  assert.equal(normalizeWheelDelta(2, 1, 900), 32);
  assert.equal(normalizeWheelDelta(1, 2, 900), 900);
});

test('item footprint includes the complete unclamped caption and label gap without a type row', () => {
  const base = {
    id: 'label-test',
    type: 'video',
    preferredWidthCells: 3,
    preferredHeightCells: 2,
    label: 'A rendered title',
  };
  const titleOnly = resolveItemGridFootprint(base, {
    layoutSeed: 7,
    gridSpacingPx: 48,
    sizeVariation: 0,
    includeTypeRow: false,
    labelGapPx: 8,
  });
  const complete = resolveItemGridFootprint({
    ...base,
    description: 'This description is deliberately long enough to occupy more than two rendered lines and prove that the complete caption contributes to the collision footprint.',
  }, {
    layoutSeed: 7,
    gridSpacingPx: 48,
    sizeVariation: 0,
    includeTypeRow: false,
    labelGapPx: 8,
  });
  assert.equal(complete.labelTypeLineCount, 0);
  assert.ok(complete.labelDescriptionLineCount > 2);
  assert.equal(complete.labelGapCells, 1);
  assert.ok(complete.labelHeightCells > titleOnly.labelHeightCells);
  assert.equal(
    complete.footprintHeightCells,
    complete.mediaHeightCells + complete.labelGapCells + complete.labelHeightCells,
  );
  const contentShape = resolveItemGridFootprint({
    id: 'content-shape',
    type: 'image',
    label: 'Content shape',
    preferredGridSpan: { columns: 9, rows: 6 },
  }, {
    layoutSeed: 7,
    gridSpacingPx: 48,
    sizeVariation: 0,
  });
  assert.equal(contentShape.mediaWidthCells, 9);
  assert.equal(contentShape.mediaHeightCells, 6);
});

test('placement is deterministic and collision-free; non-periodic presets remain append-stable', () => {
  const initialItems = createItems(20);
  for (const layoutPreset of ['salon', 'balanced', 'loose', 'clustered']) {
    const options = { ...PLACEMENT_OPTIONS, layoutPreset };
    const first = placePlaygroundItems(initialItems, options);
    const repeated = placePlaygroundItems(initialItems, options);
    const appended = placePlaygroundItems(createItems(21), options);
    const world = calculateContentWorld(first.placements, {
      ...options,
      titleSafeAreaCells: first.titleSafeArea,
    });
    assert.deepEqual(repeated, first);
    if (layoutPreset !== 'salon') assert.deepEqual(appended.placements.slice(0, 20), first.placements);
    else assert.deepEqual(placePlaygroundItems(createItems(21), options), appended);
    for (let index = 0; index < first.placements.length; index += 1) {
      const placement = first.placements[index];
      const alignmentDivisor = layoutPreset === 'salon' ? 4 : 1;
      assert.equal(Number.isInteger(placement.xCell * alignmentDivisor), true);
      assert.equal(Number.isInteger(placement.yCell * alignmentDivisor), true);
      assert.equal(cellRectsOverlap(placement.bounds, first.titleSafeArea, 2), false);
      for (let previous = 0; previous < index; previous += 1) {
        assert.equal(
          cellRectsOverlap(placement.bounds, first.placements[previous].bounds, 2),
          false,
        );
      }
      for (let otherIndex = 0; otherIndex < first.placements.length; otherIndex += 1) {
        for (let column = -1; column <= 1; column += 1) {
          for (let row = -1; row <= 1; row += 1) {
            if (column === 0 && row === 0) continue;
            const other = first.placements[otherIndex];
            const repeatedBounds = {
              left: other.bounds.left + (column * world.columns),
              top: other.bounds.top + (row * world.rows),
              right: other.bounds.right + (column * world.columns),
              bottom: other.bounds.bottom + (row * world.rows),
            };
            assert.equal(
              cellRectsOverlap(placement.bounds, repeatedBounds, options.itemGapCells),
              false,
              `${layoutPreset} placement ${placement.id} overlaps ${other.id} across a world seam`,
            );
          }
        }
      }
    }
  }
});

test('authored anchors place hierarchy deterministically and fall back when blocked', () => {
  const anchoredItems = [{
    ...createItems(1)[0],
    preferredAnchorCells: { x: 16, y: -12 },
  }, {
    ...createItems(2)[1],
    preferredAnchorCells: { x: 16, y: -12 },
  }];
  const options = {
    ...PLACEMENT_OPTIONS,
    layoutPreset: 'balanced',
    itemScale: 1,
    sizeVariation: 0,
    projectSpacing: 1,
  };
  const first = placePlaygroundItems(anchoredItems, options);
  const repeated = placePlaygroundItems(anchoredItems, options);

  assert.deepEqual(first, repeated);
  assert.deepEqual(
    { x: first.placements[0].xCell, y: first.placements[0].yCell },
    { x: 16, y: -12 },
  );
  assert.notDeepEqual(
    { x: first.placements[1].xCell, y: first.placements[1].yCell },
    { x: 16, y: -12 },
  );
  assert.equal(
    cellRectsOverlap(first.placements[0].bounds, first.placements[1].bounds, options.itemGapCells),
    false,
  );
});

test('a fixed packing period survives straddling footprints and rejects mixed-period output', () => {
  const placements = [{ xCell: 35, yCell: 23, footprintWidthCells: 10, footprintHeightCells: 12,
    repeatColumns: 80, repeatRows: 56 }];
  const options = { gridSpacingPx: 24, worldPaddingCells: 64, itemGapCells: 10 };
  const world = calculateContentWorld(placements, options);
  assert.equal(world.columns, 80);
  assert.equal(world.rows, 56);
  assert.equal(world.largestItemWidthPx, 240);
  assert.throws(() => calculateContentWorld([...placements,
    { ...placements[0], repeatColumns: 88 }], options), /same repeat period/);
  assert.throws(() => calculateContentWorld([{ ...placements[0], repeatColumns: 81 }], options), /quantized/);
  assert.throws(() => calculateContentWorld([{ ...placements[0], repeatRows: 0 }], options), /positive/);
});

test('salon bounds layout work, wraps distant anchors, and protects self copies', () => {
  const items = createItems(12).map((item, index) => ({
    ...item,
    ...(index === 0 ? { preferredAnchorCells: { x: -1011, y: 991 },
      preferredWidthCells: 32, preferredHeightCells: 28 } : {}),
  }));
  const options = { ...PLACEMENT_OPTIONS, layoutPreset: 'salon', maxCandidatesPerPass: 128 };
  const { placements, diagnostics } = placePlaygroundItems(items, options);
  assert.ok(diagnostics.totalAttempts <= items.length * diagnostics.boundedCandidatesPerItem);
  assert.ok(diagnostics.coverageSampleCount <= 24 * 24);
  for (const placement of placements) {
    const { bounds, repeatColumns, repeatRows } = placement;
    assert.ok(Math.abs((bounds.left + bounds.right) / 2) <= repeatColumns / 2 + 0.125);
    assert.ok(Math.abs((bounds.top + bounds.bottom) / 2) <= repeatRows / 2 + 0.125);
    assert.ok(repeatColumns >= placement.footprintWidthCells + options.itemGapCells);
    assert.ok(repeatRows >= placement.footprintHeightCells + options.itemGapCells);
  }
});

test('a larger appended project may recompose salon even without growing its period', () => {
  const items = createItems(3).map((item) => ({ ...item, preferredWidthCells: 3, preferredHeightCells: 3 }));
  const options = { ...PLACEMENT_OPTIONS, layoutPreset: 'salon', sizeVariation: 0,
    itemScale: 1, projectSpacing: 1 };
  const before = placePlaygroundItems(items, options);
  const appended = [...items, { ...createItems(4)[3], preferredWidthCells: 8, preferredHeightCells: 8 }];
  const after = placePlaygroundItems(appended, options);
  assert.equal(after.diagnostics.repeatColumns, before.diagnostics.repeatColumns);
  assert.equal(after.diagnostics.repeatRows, before.diagnostics.repeatRows);
  assert.notDeepEqual(after.placements.slice(0, 3).map(({ xCell, yCell }) => [xCell, yCell]),
    before.placements.map(({ xCell, yCell }) => [xCell, yCell]));
  assert.deepEqual(placePlaygroundItems(appended, options), after);
});

test('invalid placement input fails with a bounded diagnostic', () => {
  const invalidItems = Array.from({ length: 20 }, (_, index) => ({
    id: '',
    placementOrder: -index - 1,
    preferredWidthCells: 0,
    preferredHeightCells: 0,
  }));
  assert.throws(
    () => placePlaygroundItems(invalidItems, { layoutPreset: 'unsupported' }),
    (error) => {
      assert.equal(error.code, 'INVALID_PLACEMENT_INPUT');
      assert.ok(error.issues.length <= 12);
      assert.ok(error.omittedIssueCount > 0);
      return true;
    },
  );
});

test('content world is centred, quantized, minimum-sized, and grows without a fixed maximum', () => {
  const placed = placePlaygroundItems(createItems(20), PLACEMENT_OPTIONS);
  const baseWorld = calculateContentWorld(placed.placements, {
    ...PLACEMENT_OPTIONS,
    minimumWorldColumns: 80,
    minimumWorldRows: 56,
    worldPaddingCells: 8,
    titleSafeAreaCells: placed.titleSafeArea,
  });
  assert.ok(baseWorld.columns >= 80);
  assert.ok(baseWorld.rows >= 56);
  assert.ok(baseWorld.widthPx > 2000);
  assert.ok(baseWorld.heightPx > 1400);
  assert.equal(baseWorld.columns % 8, 0);
  assert.equal(baseWorld.rows % 8, 0);
  assert.ok(baseWorld.occupancy > 0 && baseWorld.occupancy < 1);
  assert.equal(quantizeCells(81, 8), 88);

  const configuredCompactWorld = calculateContentWorld([], {
    gridSpacingPx: 48,
    minimumWorldColumns: 56,
    minimumWorldRows: 40,
    worldPaddingCells: 0,
    itemGapCells: 0,
  });
  assert.equal(configuredCompactWorld.columns, 56);
  assert.equal(configuredCompactWorld.rows, 40);

  const farPlacement = {
    bounds: { left: 500, top: -4, right: 512, bottom: 8 },
    footprintWidthCells: 12,
    footprintHeightCells: 12,
  };
  const grownWorld = calculateContentWorld([...placed.placements, farPlacement], {
    ...PLACEMENT_OPTIONS,
    worldPaddingCells: 8,
    titleSafeAreaCells: placed.titleSafeArea,
  });
  assert.ok(grownWorld.columns > baseWorld.columns);
  assert.equal(grownWorld.maximumXCell, grownWorld.columns / 2);
  assert.equal(grownWorld.minimumXCell, -grownWorld.columns / 2);
});

test('project spacing expands placement radius and the content-sized modulo world', () => {
  const compactPlacement = placePlaygroundItems(createItems(20), {
    ...PLACEMENT_OPTIONS,
    projectSpacing: 1,
  });
  const spaciousPlacement = placePlaygroundItems(createItems(20), {
    ...PLACEMENT_OPTIONS,
    projectSpacing: 2,
  });
  const compactWorld = calculateContentWorld(compactPlacement.placements, {
    ...PLACEMENT_OPTIONS,
    minimumWorldColumns: 80,
    minimumWorldRows: 56,
    worldPaddingCells: 4,
    titleSafeAreaCells: compactPlacement.titleSafeArea,
  });
  const spaciousWorld = calculateContentWorld(spaciousPlacement.placements, {
    ...PLACEMENT_OPTIONS,
    minimumWorldColumns: 80,
    minimumWorldRows: 56,
    worldPaddingCells: 4,
    titleSafeAreaCells: spaciousPlacement.titleSafeArea,
  });
  const totalRadius = (placements) => placements.reduce((sum, placement) => (
    sum + Math.hypot(
      placement.xCell + (placement.footprintWidthCells / 2),
      placement.yCell + (placement.footprintHeightCells / 2),
    )
  ), 0);
  assert.ok(totalRadius(spaciousPlacement.placements) > totalRadius(compactPlacement.placements));
  assert.ok(
    spaciousWorld.columns * spaciousWorld.rows > compactWorld.columns * compactWorld.rows,
    `Expected the repeat area to grow from ${compactWorld.columns}x${compactWorld.rows}, `
      + `received ${spaciousWorld.columns}x${spaciousWorld.rows}.`,
  );
});

test('copy coverage grows only when viewport and item buffer require neighbours', () => {
  const compact = calculateNeighbouringCopyCoverage({
    viewportWidthPx: 1440,
    viewportHeightPx: 900,
    worldWidthPx: 3840,
    worldHeightPx: 2688,
    cameraX: -3840,
    cameraY: 0,
    largestItemWidthPx: 480,
    largestItemHeightPx: 360,
  });
  assert.equal(compact.renderedCameraX, 0);
  assert.equal(compact.copyCount, 1);

  const seam = calculateNeighbouringCopyCoverage({
    viewportWidthPx: 1440,
    viewportHeightPx: 900,
    worldWidthPx: 3840,
    worldHeightPx: 2688,
    cameraX: 1920,
    cameraY: 0,
    largestItemWidthPx: 480,
    largestItemHeightPx: 360,
  });
  assert.equal(seam.columnCount, 2);

  const wide = calculateNeighbouringCopyCoverage({
    viewportWidthPx: 9000,
    viewportHeightPx: 5000,
    worldWidthPx: 3840,
    worldHeightPx: 2688,
    cameraX: 0,
    cameraY: 0,
    largestItemWidthPx: 480,
    largestItemHeightPx: 360,
  });
  assert.ok(wide.copyCount > compact.copyCount);
  let visited = 0;
  assert.equal(forEachNeighbouringCopy(wide, () => { visited += 1; }), wide.copyCount);
  assert.equal(visited, wide.copyCount);
});

test('diagnostics are deterministic', () => {
  const items = createItems(20);
  const result = placePlaygroundItems(items, PLACEMENT_OPTIONS);
  const world = calculateContentWorld(result.placements, PLACEMENT_OPTIONS);
  const coverage = calculateNeighbouringCopyCoverage({
    viewportWidthPx: 1440,
    viewportHeightPx: 900,
    worldWidthPx: world.widthPx,
    worldHeightPx: world.heightPx,
    largestItemWidthPx: world.largestItemWidthPx,
    largestItemHeightPx: world.largestItemHeightPx,
  });
  const diagnostics = createPlaygroundSpatialDiagnostics({
    items,
    placements: result.placements,
    world,
    coverage,
    placementDiagnostics: result.diagnostics,
  });
  assert.equal(diagnostics.itemCount, 20);
  assert.equal(diagnostics.placedItemCount, 20);
  assert.equal(diagnostics.mediaCounts.image + diagnostics.mediaCounts.video + diagnostics.mediaCounts.code, 20);
  assert.equal(diagnostics.copyCount, coverage.copyCount);
  assert.ok(diagnostics.occupancy > 0 && diagnostics.occupancy < 1);
});
