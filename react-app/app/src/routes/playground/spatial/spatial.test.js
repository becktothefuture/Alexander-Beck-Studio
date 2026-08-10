import assert from 'node:assert/strict';
import test from 'node:test';

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

test('responsive Lab profile preserves desktop intent and compacts continuously toward phone', () => {
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

test('placement is deterministic, collision-free, and append-stable for every preset', () => {
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
    assert.deepEqual(appended.placements.slice(0, 20), first.placements);
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
