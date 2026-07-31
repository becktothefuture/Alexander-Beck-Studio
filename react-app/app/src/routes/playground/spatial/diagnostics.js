function countMediaTypes(items) {
  const counts = { image: 0, video: 0, code: 0, unknown: 0 };
  for (let index = 0; index < items.length; index += 1) {
    const type = String(items[index]?.type || 'unknown');
    if (type === 'image' || type === 'video' || type === 'code') counts[type] += 1;
    else counts.unknown += 1;
  }
  return counts;
}

/** Produces read-only route diagnostics. The result is not persistence input. */
export function createPlaygroundSpatialDiagnostics({
  items = [],
  placements = [],
  world,
  coverage,
  placementDiagnostics = null,
} = {}) {
  const placementPassIndex = Number(placementDiagnostics?.maximumPassIndex);
  const worldCellCount = Math.max(0, Number(world?.columns) || 0)
    * Math.max(0, Number(world?.rows) || 0);
  let occupiedCellArea = 0;
  let largestFootprintArea = 0;
  let maximumPlacementAttempts = 0;
  for (let index = 0; index < placements.length; index += 1) {
    const placement = placements[index];
    const width = Math.max(0, Number(placement?.footprintWidthCells) || 0);
    const height = Math.max(0, Number(placement?.footprintHeightCells) || 0);
    const area = width * height;
    occupiedCellArea += area;
    largestFootprintArea = Math.max(largestFootprintArea, area);
    maximumPlacementAttempts = Math.max(
      maximumPlacementAttempts,
      Math.max(0, Number(placement?.attempts) || 0),
    );
  }
  const copyCount = Math.max(0, Number(coverage?.copyCount) || 0);
  const mediaCounts = countMediaTypes(Array.isArray(items) ? items : []);
  return Object.freeze({
    itemCount: Array.isArray(items) ? items.length : 0,
    placedItemCount: Array.isArray(placements) ? placements.length : 0,
    unplacedItemCount: Math.max(
      0,
      (Array.isArray(items) ? items.length : 0) - (Array.isArray(placements) ? placements.length : 0),
    ),
    mediaCounts: Object.freeze(mediaCounts),
    worldColumns: Math.max(0, Number(world?.columns) || 0),
    worldRows: Math.max(0, Number(world?.rows) || 0),
    worldWidthPx: Math.max(0, Number(world?.widthPx) || 0),
    worldHeightPx: Math.max(0, Number(world?.heightPx) || 0),
    worldCellCount,
    occupiedCellArea,
    occupancy: worldCellCount > 0 ? occupiedCellArea / worldCellCount : 0,
    largestFootprintArea,
    largestItemWidthPx: Math.max(0, Number(world?.largestItemWidthPx) || 0),
    largestItemHeightPx: Math.max(0, Number(world?.largestItemHeightPx) || 0),
    copyColumns: Math.max(0, Number(coverage?.columnCount) || 0),
    copyRows: Math.max(0, Number(coverage?.rowCount) || 0),
    copyCount,
    presentationInstanceCount: copyCount * (Array.isArray(placements) ? placements.length : 0),
    totalPlacementAttempts: Math.max(
      0,
      Number(placementDiagnostics?.totalAttempts) || 0,
    ),
    maximumPlacementAttempts,
    maximumPlacementPassIndex: Math.max(
      -1,
      Number.isFinite(placementPassIndex) ? placementPassIndex : -1,
    ),
  });
}
