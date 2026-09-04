import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  ABOUT_RECOVERY_PROFILES,
  checkpointStoryWU,
  driveAboutStoryWU,
  getAboutSurfelJourneyMap,
  getAboutSurfelState,
  launchAboutAuditBrowser,
  openAboutRecoveryPage,
  summarizeFailures,
  writeRecoveryReport,
} from './lib/about-recovery-audit-helpers.mjs';
import { resolveAboutNarrativeJourneyMap } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeJourneyMap.js';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const outputDir = resolve(process.env.ABS_ABOUT_RECOVERY_OCCUPANCY_OUTPUT
  || `output/playwright/about-recovery-viewport-occupancy/${browserName}`);
const bundleDir = process.env.ABS_ABOUT_RECOVERY_BUNDLE
  ? resolve(process.env.ABS_ABOUT_RECOVERY_BUNDLE)
  : null;
const requestedProfiles = String(process.env.ABS_ABOUT_RECOVERY_PROFILES || 'desktop,mobile')
  .split(',').map((value) => value.trim()).filter(Boolean);
const CENTRAL_GRID_COLUMN_START = 2;
const CENTRAL_GRID_COLUMN_END = 9;
const OCCUPIED_CELL_MINIMUM = 3;
const GATE_EDGE_MINIMUM = 4;
const METHOD_READING_ROW_MINIMUM = 8;
const METHOD_READING_BIN_MINIMUM = 12;
const CLIENT_VERTICAL_BAND_MINIMUM = 0.5;
const FINALE_LOWER_ROW_MINIMUM = 0.6;
const CENTRAL_VERTICAL_GRID_BANDS = Object.freeze([
  Object.freeze({ id: 'lower', rows: Object.freeze([0, 1, 2]) }),
  Object.freeze({ id: 'middle', rows: Object.freeze([3, 4]) }),
  Object.freeze({ id: 'upper', rows: Object.freeze([5, 6, 7]) }),
]);

const CHECKPOINTS = Object.freeze([
  { id: 'opening', fieldId: 'text-promise-main', fraction: 0.12, modelKey: 'about.00', kind: 'cinematic' },
  { id: 'disciplines', fieldId: 'text-disciplines-title', phase: 'focus', modelKey: 'about.03', kind: 'editorial' },
  { id: 'gates', anchorStart: 'gate-entry', anchorEnd: 'gate-exit', fraction: 0.5, modelKey: 'about.04', kind: 'cinematic' },
  { id: 'method', fieldId: 'text-life-character', phase: 'focus', modelKey: 'about.05', kind: 'editorial' },
  { id: 'shaping', fieldId: 'text-epilogue-shaping', phase: 'focus', modelKey: 'about.06', kind: 'cinematic' },
  { id: 'thinking', fieldId: 'text-epilogue-thinking', phase: 'focus', modelKey: 'about.06', kind: 'cinematic' },
  { id: 'final-hold', fieldId: 'text-epilogue-invitation', phase: 'end', modelKey: 'about.06', kind: 'cinematic' },
]);

function addVectors(target, source) {
  source.forEach((value, index) => { target[index] += Number(value) || 0; });
  return target;
}

function protectedCellMask(regions) {
  const mask = new Array(96).fill(false);
  for (let row = 0; row < 8; row += 1) {
    const minY = -1 + row / 4;
    const maxY = minY + 0.25;
    for (let column = 0; column < 12; column += 1) {
      const minX = -1 + column / 6;
      const maxX = minX + 1 / 6;
      mask[row * 12 + column] = regions.some((region) => {
        const bounds = region.protectedNdcBounds;
        return bounds && bounds.maxX > minX && bounds.minX < maxX
          && bounds.maxY > minY && bounds.minY < maxY;
      });
    }
  }
  return mask;
}

function check(code, pass, message, actual, expected) {
  return { code, pass: Boolean(pass), message, actual, expected };
}

// A 12-column grid cannot represent the central 60% exactly. Columns 2–9
// have centres inside x=-0.6…0.6, so they are the conservative centre-sampled
// approximation. Protected cells never create a requirement to paint behind copy.
export function centralUsableBandPopulation(occupancy, protectedMask) {
  assert.equal(occupancy.length, 96, 'Central occupancy requires a 12 by 8 grid.');
  assert.equal(protectedMask.length, 96, 'Central protection requires a 12 by 8 grid.');
  return CENTRAL_VERTICAL_GRID_BANDS.map(({ id, rows }) => {
    const cells = rows.flatMap((row) => Array.from(
      { length: CENTRAL_GRID_COLUMN_END - CENTRAL_GRID_COLUMN_START + 1 },
      (_, offset) => row * 12 + CENTRAL_GRID_COLUMN_START + offset,
    ));
    const usableCells = cells.filter((index) => !protectedMask[index]);
    const occupiedUsableCells = usableCells.filter((index) => occupancy[index] >= OCCUPIED_CELL_MINIMUM);
    return {
      id,
      rows,
      columnStart: CENTRAL_GRID_COLUMN_START,
      columnEnd: CENTRAL_GRID_COLUMN_END,
      usableCellCount: usableCells.length,
      occupiedUsableCellCount: occupiedUsableCells.length,
      applicable: usableCells.length > 0,
      pass: usableCells.length === 0 || occupiedUsableCells.length >= 1,
    };
  });
}

function protectedAwareBandPopulation(occupancy, protectedMask, bands, minimumFraction) {
  assert.equal(occupancy.length, 96, 'Protected-aware occupancy requires a 12 by 8 grid.');
  assert.equal(protectedMask.length, 96, 'Protected-aware occupancy requires a 12 by 8 mask.');
  return bands.map(({ id, rows }) => {
    const cells = rows.flatMap((row) => Array.from({ length: 12 }, (_, column) => row * 12 + column));
    const usableCells = cells.filter((index) => !protectedMask[index]);
    const occupiedUsableCells = usableCells.filter(
      (index) => occupancy[index] >= OCCUPIED_CELL_MINIMUM,
    );
    const occupiedFraction = usableCells.length ? occupiedUsableCells.length / usableCells.length : 1;
    return {
      id,
      rows,
      usableCellCount: usableCells.length,
      occupiedUsableCellCount: occupiedUsableCells.length,
      occupiedFraction,
      minimumFraction,
      applicable: usableCells.length > 0,
      pass: usableCells.length === 0 || occupiedFraction >= minimumFraction,
    };
  });
}

function recoveryGridEdgePopulation(occupancy) {
  assert.equal(occupancy.length, 96, 'Recovery edge occupancy requires a 12 by 8 grid.');
  const occupied = (index) => occupancy[index] >= OCCUPIED_CELL_MINIMUM;
  return {
    bottom: Array.from({ length: 12 }, (_, column) => column).filter(occupied).length,
    top: Array.from({ length: 12 }, (_, column) => 7 * 12 + column).filter(occupied).length,
    left: Array.from({ length: 8 }, (_, row) => row * 12).filter(occupied).length,
    right: Array.from({ length: 8 }, (_, row) => row * 12 + 11).filter(occupied).length,
  };
}

function analyseCheckpoint(spec, state) {
  const framingEntries = Object.entries(state.metrics.modelFraming)
    .filter(([, framing]) => Array.isArray(framing.recoveryOccupancy12x8));
  const occupancy = new Array(96).fill(0);
  const horizontalBands = [0, 0, 0];
  const centralVerticalBands = [0, 0, 0];
  const fogDepthPopulations = [0, 0, 0];
  for (const [, framing] of framingEntries) {
    addVectors(occupancy, framing.recoveryOccupancy12x8);
    addVectors(horizontalBands, framing.recoveryHorizontalBandCounts);
    addVectors(centralVerticalBands, framing.recoveryCentralVerticalBandCounts);
    addVectors(fogDepthPopulations, framing.recoveryDepthPopulationCounts);
  }
  const protectedMask = protectedCellMask(state.copyProtection.regions || []);
  const centralUsableBands = centralUsableBandPopulation(occupancy, protectedMask);
  const unprotectedCells = protectedMask.filter((value) => !value).length;
  const occupiedUnprotectedCells = occupancy.filter(
    (count, index) => count >= OCCUPIED_CELL_MINIMUM && !protectedMask[index],
  ).length;
  const occupiedFraction = unprotectedCells ? occupiedUnprotectedCells / unprotectedCells : 0;
  const totalFramed = horizontalBands.reduce((sum, value) => sum + value, 0);
  const sideCount = horizontalBands[0] + horizontalBands[2];
  const sideFraction = totalFramed ? sideCount / totalFramed : 1;
  const protectedIntersections = Object.values(state.metrics.modelFraming)
    .reduce((sum, framing) => sum + (framing.protectedRegionVisibleCounts || [])
      .reduce((modelSum, value) => modelSum + value, 0), 0);
  const expectedOccupancy = spec.kind === 'editorial' ? 0.35 : 0.45;
  const expectedModel = state.metrics.modelFraming[spec.modelKey];
  const expectedModelOccupancy = Array.isArray(expectedModel?.recoveryOccupancy12x8)
    ? expectedModel.recoveryOccupancy12x8 : new Array(96).fill(0);
  const depthPopulations = expectedModel?.recoveryAdaptiveDepthPopulationCounts || [0, 0, 0];
  const depthMinimum = Math.max(3, Math.floor(Number(expectedModel?.renderedVisibleCount || 0) * 0.01));
  const minimumDepthSpanWU = ['opening', 'gates'].includes(spec.id) ? 12 : 24;
  const protectedIntersectionRatio = protectedIntersections / Math.max(1, totalFramed);
  const protectedIntersectionMaximum = spec.id === 'opening' ? 0.2 : 0.08;
  const expectedModelMinimum = spec.id === 'final-hold'
    ? Math.ceil(Number(expectedModel?.pointCount || 0) * 0.1)
    : 24;
  const checks = [
    check('occupancy_fraction', occupiedFraction >= expectedOccupancy,
      `${spec.id} must occupy enough of the usable 12 by 8 viewport grid.`, occupiedFraction, expectedOccupancy),
    check('side_dominance', sideFraction <= 0.65,
      `${spec.id} must not collapse into the outer side bands.`, sideFraction, 0.65),
    check('central_vertical_population', centralUsableBands.every((band) => band.pass),
      `${spec.id} must occupy at least one usable cell in each applicable lower, middle and upper central band; `
        + 'protected-only bands are inapplicable. Central 60% is approximated by centre-sampled columns 2 through 9.',
      centralUsableBands.map((band) => ({
        id: band.id,
        applicable: band.applicable,
        usableCellCount: band.usableCellCount,
        occupiedUsableCellCount: band.occupiedUsableCellCount,
      })),
      centralUsableBands.map((band) => ({
        id: band.id,
        appliesWhen: 'usableCellCount > 0',
        minimumOccupiedUsableCells: band.applicable ? 1 : 0,
      }))),
    check('depth_populations', depthPopulations.every((count) => count >= depthMinimum),
      `${spec.id} must contain near, middle and far populations across its own visible depth range.`,
      depthPopulations, [depthMinimum, depthMinimum, depthMinimum]),
    check('depth_span', Number(expectedModel?.recoveryAdaptiveDepthSpanWU || 0) >= minimumDepthSpanWU,
      `${spec.id} must preserve a meaningful projected depth span.`,
      expectedModel?.recoveryAdaptiveDepthSpanWU || 0, minimumDepthSpanWU),
    check('protected_copy_density', protectedIntersectionRatio <= protectedIntersectionMaximum,
      `${spec.id} must keep the measured editorial regions materially clearer than the surrounding world.`,
      protectedIntersectionRatio, protectedIntersectionMaximum),
    check('expected_model_framed', Number(expectedModel?.renderedVisibleCount) >= expectedModelMinimum,
      `${spec.id} must frame its expected scene model.`, expectedModel?.renderedVisibleCount || 0,
      expectedModelMinimum),
  ];
  let clientVerticalBands = null;
  let gateEdgePopulation = null;
  let methodReadingBanks = null;
  let finaleLowerRows = null;
  if (spec.id === 'disciplines') {
    clientVerticalBands = protectedAwareBandPopulation(
      expectedModelOccupancy,
      protectedMask,
      CENTRAL_VERTICAL_GRID_BANDS,
      CLIENT_VERTICAL_BAND_MINIMUM,
    );
    checks.push(check('client_vertical_continuity', clientVerticalBands.every((band) => band.pass),
      'The client terrain and fog must continue through every usable vertical viewport band without painting behind logos.',
      clientVerticalBands.map(({ id, usableCellCount, occupiedUsableCellCount, occupiedFraction }) => ({
        id, usableCellCount, occupiedUsableCellCount, occupiedFraction,
      })),
      clientVerticalBands.map(({ id, applicable }) => ({
        id, appliesWhen: applicable, minimumOccupiedFraction: applicable ? CLIENT_VERTICAL_BAND_MINIMUM : 0,
      }))));
  }
  if (spec.id === 'gates') {
    gateEdgePopulation = recoveryGridEdgePopulation(expectedModelOccupancy);
    checks.push(check('gate_crop_edges', Object.values(gateEdgePopulation)
      .every((count) => count >= GATE_EDGE_MINIMUM),
      'The square-gate model must reach all four viewport crop edges rather than read as a bounded island.',
      gateEdgePopulation,
      {
        bottom: GATE_EDGE_MINIMUM,
        top: GATE_EDGE_MINIMUM,
        left: GATE_EDGE_MINIMUM,
        right: GATE_EDGE_MINIMUM,
      }));
  }
  if (spec.id === 'method') {
    methodReadingBanks = {
      left: {
        occupiedRows: Number(expectedModel?.readingLeftOccupiedRowCount || 0),
        occupiedBins: Number(expectedModel?.readingLeftOccupiedBinCount || 0),
      },
      right: {
        occupiedRows: Number(expectedModel?.readingRightOccupiedRowCount || 0),
        occupiedBins: Number(expectedModel?.readingRightOccupiedBinCount || 0),
      },
    };
    checks.push(check('method_reading_banks', Object.values(methodReadingBanks).every(
      (side) => side.occupiedRows >= METHOD_READING_ROW_MINIMUM
        && side.occupiedBins >= METHOD_READING_BIN_MINIMUM,
    ),
      'The method field must form broad reading banks on both sides across the viewport height.',
      methodReadingBanks,
      {
        left: { occupiedRows: METHOD_READING_ROW_MINIMUM, occupiedBins: METHOD_READING_BIN_MINIMUM },
        right: { occupiedRows: METHOD_READING_ROW_MINIMUM, occupiedBins: METHOD_READING_BIN_MINIMUM },
      }));
  }
  if (['shaping', 'thinking', 'final-hold'].includes(spec.id)) {
    checks.push(check('passed_gates_absent', Number(state.metrics.modelFraming['about.04']?.framedVisibleCount || 0) === 0,
      `${spec.id} must not show square gates after their passage.`,
      state.metrics.modelFraming['about.04']?.framedVisibleCount || 0, 0));
  }
  if (spec.id === 'final-hold') {
    finaleLowerRows = protectedAwareBandPopulation(
      expectedModelOccupancy,
      protectedMask,
      Object.freeze(Array.from({ length: 6 }, (_, row) => Object.freeze({
        id: `row-${row}`,
        rows: Object.freeze([row]),
      }))),
      FINALE_LOWER_ROW_MINIMUM,
    );
    checks.push(check('finale_lower_two_thirds', finaleLowerRows.every((row) => row.pass),
      'The final surface and canopy must paint every usable row across the lower two thirds of the viewport.',
      finaleLowerRows.map(({ id, usableCellCount, occupiedUsableCellCount, occupiedFraction }) => ({
        id, usableCellCount, occupiedUsableCellCount, occupiedFraction,
      })),
      finaleLowerRows.map(({ id, applicable }) => ({
        id, appliesWhen: applicable, minimumOccupiedFraction: applicable ? FINALE_LOWER_ROW_MINIMUM : 0,
      }))));
    checks.push(check('finale_outer_edges', Number(expectedModel?.groundOuterEdgeFullWidthRowCount || 0) >= 2,
      'The final surface must reach both outer two-percent strips without visible bounds.',
      expectedModel?.groundOuterEdgeFullWidthRowCount || 0, 2));
  }
  return {
    occupancy12x8: occupancy,
    occupiedUnprotectedCells,
    unprotectedCells,
    occupiedFraction,
    protectedCellCount: protectedMask.filter(Boolean).length,
    horizontalBands: { left: horizontalBands[0], centre: horizontalBands[1], right: horizontalBands[2] },
    sideFraction,
    centralVerticalBands: { lower: centralVerticalBands[0], middle: centralVerticalBands[1], upper: centralVerticalBands[2] },
    centralUsableGrid: {
      columnStart: CENTRAL_GRID_COLUMN_START,
      columnEnd: CENTRAL_GRID_COLUMN_END,
      approximation: 'cell centres inside the central x=-0.6 to x=0.6 band',
      bands: centralUsableBands,
    },
    depthPopulations: { near: depthPopulations[0], middle: depthPopulations[1], far: depthPopulations[2] },
    depthCutsWU: expectedModel?.recoveryAdaptiveDepthCutsWU || null,
    depthSpanWU: expectedModel?.recoveryAdaptiveDepthSpanWU || 0,
    fogDepthPopulations: { near: fogDepthPopulations[0], middle: fogDepthPopulations[1], far: fogDepthPopulations[2] },
    protectedIntersections,
    protectedIntersectionRatio,
    compositionHardening: {
      clientVerticalBands,
      gateEdgePopulation,
      methodReadingBanks,
      finaleLowerRows,
    },
    checks,
    failures: summarizeFailures(checks),
  };
}

async function resolveStoryWU(page, journeyMap, spec) {
  if (spec.anchorStart) {
    const start = journeyMap.anchors.find((anchor) => anchor.id === spec.anchorStart)?.cameraStoryWU;
    const end = journeyMap.anchors.find((anchor) => anchor.id === spec.anchorEnd)?.cameraStoryWU;
    assert(Number.isFinite(start) && Number.isFinite(end), `Missing journey anchors for ${spec.id}.`);
    return start + (end - start) * spec.fraction;
  }
  const storyWU = await checkpointStoryWU(page, spec);
  assert(Number.isFinite(storyWU), `Missing field timing for ${spec.id}.`);
  return storyWU;
}

function runCentralUsableBandFixture() {
  const occupancy = new Array(96).fill(0);
  const protectedMask = new Array(96).fill(false);
  for (const row of [0, 1, 2]) {
    for (let column = CENTRAL_GRID_COLUMN_START; column <= CENTRAL_GRID_COLUMN_END; column += 1) {
      protectedMask[row * 12 + column] = true;
    }
  }
  occupancy[3 * 12 + 5] = 3;
  occupancy[6 * 12 + 6] = 3;
  const protectedLower = centralUsableBandPopulation(occupancy, protectedMask);
  assert.deepEqual(protectedLower.map(({ applicable, pass }) => ({ applicable, pass })), [
    { applicable: false, pass: true },
    { applicable: true, pass: true },
    { applicable: true, pass: true },
  ]);

  occupancy[6 * 12 + 6] = 0;
  const genuineGap = centralUsableBandPopulation(occupancy, protectedMask);
  assert.equal(genuineGap.find((band) => band.id === 'upper').pass, false);
  assert.equal(genuineGap.find((band) => band.id === 'middle').pass, true);

  const sideOnly = new Array(96).fill(0);
  for (let row = 0; row < 8; row += 1) {
    sideOnly[row * 12] = 20;
    sideOnly[row * 12 + 11] = 20;
  }
  const openingGap = centralUsableBandPopulation(sideOnly, new Array(96).fill(false));
  assert.equal(openingGap.every((band) => !band.pass), true);

  const cropFilled = new Array(96).fill(0);
  for (const column of [0, 1, 10, 11]) {
    cropFilled[column] = OCCUPIED_CELL_MINIMUM;
    cropFilled[7 * 12 + column] = OCCUPIED_CELL_MINIMUM;
  }
  for (const row of [0, 1, 6, 7]) {
    cropFilled[row * 12] = OCCUPIED_CELL_MINIMUM;
    cropFilled[row * 12 + 11] = OCCUPIED_CELL_MINIMUM;
  }
  const cropEdges = recoveryGridEdgePopulation(cropFilled);
  assert.deepEqual(cropEdges, { bottom: 4, top: 4, left: 4, right: 4 });
  cropFilled[0] = 0;
  assert.equal(recoveryGridEdgePopulation(cropFilled).bottom, 3);

  const protectedAwareOccupancy = new Array(96).fill(OCCUPIED_CELL_MINIMUM);
  const protectedAwareMask = new Array(96).fill(false);
  protectedAwareMask[0] = true;
  protectedAwareOccupancy[1] = 0;
  const protectedAwareBands = protectedAwareBandPopulation(
    protectedAwareOccupancy,
    protectedAwareMask,
    [{ id: 'bottom-row', rows: [0] }],
    CLIENT_VERTICAL_BAND_MINIMUM,
  );
  assert.equal(protectedAwareBands[0].usableCellCount, 11);
  assert.equal(protectedAwareBands[0].occupiedUsableCellCount, 10);
  assert.equal(protectedAwareBands[0].pass, true);

  console.log(JSON.stringify({
    protectedLower, genuineGap, openingGap, cropEdges, protectedAwareBands,
  }, null, 2));
}

if (process.env.ABS_ABOUT_OCCUPANCY_FIXTURE === '1') {
  runCentralUsableBandFixture();
} else {
  await mkdir(outputDir, { recursive: true });
  const browser = await launchAboutAuditBrowser(browserName);
  const report = {
  schema: 'about-recovery-viewport-occupancy/v1', browser: browserName, baseUrl, bundleDir,
  theme: process.env.ABS_ABOUT_RECOVERY_THEME || 'dark',
  profiles: [], failures: [],
  };
  try {
  for (const profile of requestedProfiles) {
    const {
      bundleMetadata, context, errors, page,
    } = await openAboutRecoveryPage({ browser, profile, baseUrl, bundleDir });
    report.sourceSha256 ||= bundleMetadata?.source?.sha256 || null;
    const storyMap = await getAboutSurfelJourneyMap(page);
    const cameraTrack = await page.evaluate(async () => (
      fetch('/models/about-v2-edited-world/camera-track.json').then((response) => response.json())
    ));
    const journeyMap = resolveAboutNarrativeJourneyMap(storyMap, cameraTrack);
    assert.equal(journeyMap.valid, true, `About camera journey is invalid: ${JSON.stringify(journeyMap.diagnostics)}`);
    const checkpointResults = [];
    for (const spec of CHECKPOINTS) {
      const storyWU = await resolveStoryWU(page, journeyMap, spec);
      await driveAboutStoryWU(page, storyWU);
      const state = await getAboutSurfelState(page, { fieldId: spec.fieldId || '', marginPx: 8 });
      report.sourceSha256 ||= state.metrics.assetSourceHash || null;
      const analysis = analyseCheckpoint(spec, state);
      const screenshot = resolve(outputDir, `${profile}-${spec.id}.png`);
      await page.screenshot({ path: screenshot });
      const result = { id: spec.id, profile, storyWU: state.storyWU, screenshot, ...analysis };
      checkpointResults.push(result);
      report.failures.push(...analysis.failures.map((failure) => ({ profile, checkpoint: spec.id, ...failure })));
    }
    if (errors.length) report.failures.push({ profile, checkpoint: 'runtime', code: 'page_errors', actual: errors, expected: [] });
    report.profiles.push({ profile, viewport: ABOUT_RECOVERY_PROFILES[profile].viewport, checkpoints: checkpointResults, errors });
    await context.close();
  }
  } catch (error) {
    report.failures.push({ profile: 'infrastructure', checkpoint: 'runtime', code: 'audit_error', message: error.message });
  } finally {
    await browser.close();
  }
  report.status = report.failures.length ? 'fail' : 'pass';
  report.recordedAt = new Date().toISOString();
  const reportPath = await writeRecoveryReport(outputDir, 'report.json', report);
  for (const failure of report.failures) console.error(`FAIL ${failure.profile}/${failure.checkpoint}/${failure.code}: ${failure.message || JSON.stringify(failure.actual)}`);
  console.log(`${report.status.toUpperCase()}: About viewport occupancy report: ${reportPath}`);
  if (report.failures.length) process.exitCode = 1;
}
