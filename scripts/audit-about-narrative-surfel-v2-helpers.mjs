import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import { compileAboutNarrativeJourneyMap } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeJourneyMap.js';

export const ABOUT_SURFEL_OUTPUT_DIR = process.env.ABS_ABOUT_VISUAL_OUTPUT
  || 'output/playwright/about-narrative-hardening/runtime';
const expectedAssetMetadata = JSON.parse(await readFile(resolve(
  process.env.ABS_ABOUT_ASSET_DIR || 'react-app/app/public/models/about-v2-edited-world',
  'meta.json',
), 'utf8'));
const expectedCameraPageIds = expectedAssetMetadata.pages.map((page) => page.id);
export const ABOUT_SURFEL_PROFILES = Object.freeze({
  desktop: Object.freeze({
    viewport: Object.freeze({ width: 1440, height: 1000 }),
    residentSurfelCount: 90_000,
    maximumGpuBytes: 4_200_000,
  }),
  mobile: Object.freeze({
    viewport: Object.freeze({ width: 390, height: 844 }),
    residentSurfelCount: 30_000,
    maximumGpuBytes: 1_400_000,
  }),
});

export async function ensureAboutSurfelOutputDirectory() {
  await mkdir(ABOUT_SURFEL_OUTPUT_DIR, { recursive: true });
}

export async function launchAboutAuditBrowser(browserName = 'chromium') {
  const type = browserName === 'webkit' ? webkit : chromium;
  const channel = browserName === 'chromium' ? process.env.ABS_CHROMIUM_CHANNEL : null;
  const options = channel
    ? { headless: true, channel, args: ['--enable-precise-memory-info'] }
    : browserName === 'chromium'
    ? {
      headless: true,
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader-webgl',
        '--enable-unsafe-swiftshader',
        '--disable-gpu-sandbox',
        '--enable-precise-memory-info',
      ],
    }
    : { headless: true };
  return type.launch(options);
}

export function collectPageErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

export async function waitForAboutSurfelRuntime(page, profile, timeout = 120_000) {
  const expected = ABOUT_SURFEL_PROFILES[profile];
  assert(expected, `Unknown About surfel profile ${profile}.`);
  await page.waitForFunction(({ expectedProfile, expectedCount, expectedSourceHash }) => {
    const root = document.querySelector('.about-narrative-lab');
    const metrics = window.__aboutNarrativeRuntime?.getMetrics?.();
    return root?.dataset.pointAsset === 'blender-surfel-v2'
      && root?.dataset.worldStage === 'blender-surfel-scene'
      && metrics?.state === 'ready'
      && metrics.adapterId === 'blender-surfel-v2'
      && metrics.qualityTier === expectedProfile
      && metrics.pointProfile === expectedProfile
      && metrics.layoutProfile === expectedProfile
      && metrics.assetSourceHash === expectedSourceHash
      && metrics.journeyMapValid === true
      && metrics.journeyMapCertifiable === true
      && metrics.bundleIntegrityVerified === true
      && metrics.sceneContractStatus === 'compatible'
      && root.dataset.aboutSceneReady === 'true'
      && metrics.residentSurfelCount === expectedCount
      && metrics.drawCalls === 2
      && metrics.fixedAttributeIdentityStable === true;
  }, {
    expectedProfile: profile,
    expectedCount: expected.residentSurfelCount,
    expectedSourceHash: expectedAssetMetadata.source.sha256,
  }, { timeout });
}

export function assertAboutSurfelMetrics(metrics, profile) {
  const expected = ABOUT_SURFEL_PROFILES[profile];
  assert(expected, `Unknown About surfel profile ${profile}.`);
  assert.equal(metrics.state, 'ready');
  assert.equal(metrics.adapterId, 'blender-surfel-v2');
  assert.equal(metrics.assetSchema, 'about-point-scene');
  assert.equal(metrics.assetVersion, 2);
  assert.equal(metrics.fallbackAsset, false);
  assert.equal(metrics.journeyMapValid, true);
  assert.equal(metrics.journeyMapCertifiable, true);
  assert.equal(metrics.bundleIntegrityVerified, true);
  assert.equal(metrics.sceneContractStatus, 'compatible');
  assert.deepEqual(metrics.sceneContractDiagnostics, []);
  assert.equal(metrics.qualityTier, profile);
  assert.equal(metrics.pointProfile, profile);
  assert.equal(metrics.layoutProfile, profile);
  assert.equal(metrics.residentSurfelCount, expected.residentSurfelCount);
  assert(metrics.activeSurfelCount > 0
    && metrics.activeSurfelCount <= metrics.residentSurfelCount,
  'The active story models must remain a non-empty subset of the resident profile.');
  assert.equal(metrics.pointCount, metrics.activeSurfelCount);
  assert.equal(metrics.masterSurfelCount, 135_000);
  assert.equal(metrics.modelCount, 7);
  assert.equal(Object.keys(metrics.perModelCounts).length, 7);
  assert(Object.values(metrics.perModelCounts).every((count) => count > 0));
  assert(metrics.drawCalls >= 2 && metrics.drawCalls <= 4 && metrics.drawCalls % 2 === 0,
    'Each active story model must use one depth-core and one soft-surface draw pass.');
  assert.equal(metrics.occlusionMode, 'depth-owned-whole-surfel-reveal');
  assert.equal(metrics.lodRadiusScaleMode, 'per-object');
  assert.equal(
    Object.keys(metrics.lodRadiusScaleByObject).length,
    expectedAssetMetadata.source.objects.length,
  );
  assert(Object.values(metrics.lodRadiusScaleByObject).every((scale) => Number.isFinite(scale) && scale >= 1));
  assert.equal(metrics.gpuBufferBuilds, 1);
  assert.equal(metrics.bufferRebuilds, 1);
  assert.equal(metrics.gpuBufferIdentityStable, true);
  assert.equal(metrics.fixedAttributeIdentityStable, true);
  assert.equal(metrics.gpuBufferCount, metrics.modelCount * 14,
    'Every model must retain one stable copy of the fourteen surfel attributes.');
  assert.equal(metrics.gpuBufferBytes, metrics.gpuBytes);
  assert(metrics.gpuBufferBytes > 0 && metrics.gpuBufferBytes <= expected.maximumGpuBytes);
  assert.deepEqual(metrics.zones, expectedCameraPageIds);
  assert.equal(metrics.assetSourceHash, expectedAssetMetadata.source.sha256);
  const portalHost = expectedAssetMetadata.source.objects
    .find((entry) => entry.objectKey === 'director.round-tunnel');
  assert.equal(portalHost?.modelKey, 'about.02');
  assert.equal(portalHost?.instanceCount, 28, 'The parametric round tunnel is incomplete.');
  assert.equal(portalHost?.connectedComponentCount, 28,
    'The single round-tunnel host must retain one connected component per generated ring.');
  const gateHost = expectedAssetMetadata.source.objects
    .find((entry) => entry.objectKey === 'director.square-gate-tunnel');
  assert.equal(gateHost?.modelKey, 'about.04');
  assert.equal(gateHost?.instanceCount, 16, 'The parametric square-gate tunnel is incomplete.');
  assert.equal(gateHost?.connectedComponentCount, 16,
    'The single square-gate host must retain one connected component per generated gate.');
  const finaleSurface = expectedAssetMetadata.source.objects
    .find((entry) => entry.objectKey === 'director.finale-surface');
  assert.equal(finaleSurface?.modelKey, 'about.06');
  assert.equal(finaleSurface?.connectedComponentCount, 1,
    'The boundless finale surface must stay physically connected.');
  assert(
    metrics.activeZones.every((zone) => metrics.zones.includes(zone)),
    'The runtime reported an unknown active GPU page.',
  );
  assert(metrics.cameraPosition.every(Number.isFinite));
  assert(Number.isFinite(metrics.cameraRollDegrees));
  assert(Number.isFinite(metrics.frameTimeMs) && metrics.frameTimeMs >= 0);
  assert.equal(metrics.contextAvailable, true);
  assert.equal(metrics.visible, true);
  assert.equal(metrics.controls.detailBias, 1);
  assert.equal(metrics.controls.opacity, 1);
  assert(metrics.controls.fogEndWU > metrics.controls.fogStartWU);
  assert.equal(metrics.error, '');
  assert.equal(metrics.stageVisibilityMode, metrics.reducedMotion
    ? 'authored-settled-cuts' : 'authored-bounded-whole-surfel-handoff');
  assert.equal(Object.keys(metrics.resolvedVisibilityWindows).length, metrics.modelCount);
  for (const [key, window] of Object.entries(metrics.resolvedVisibilityWindows)) {
    assert.ok(Number.isFinite(window.startWU) && Number.isFinite(window.endWU)
      && window.endWU > window.startWU && window.handoffWU > 0,
    `${key} has an invalid resolved visibility window: ${JSON.stringify(window)}`);
  }
}

// Read the measured story rail, then use the production semantic map. A named
// passage may grow without moving this audit back onto an obsolete fixed WU.
export async function getAboutSurfelJourneyMap(page) {
  const layout = await page.evaluate(() => {
    const fields = Array.from(document.querySelectorAll('[data-render-span-id]')).map((node) => ({
      id: node.querySelector('[data-text-field-id]')?.dataset.textFieldId,
      startWU: Number(node.dataset.storyStartWu),
      focusWU: Number(node.dataset.storyFocusWu),
      endWU: Number(node.dataset.storyEndWu),
    })).filter((field) => field.id);
    return { fields, durationWU: Math.max(0, ...fields.map((field) => field.endWU)) };
  });
  const map = compileAboutNarrativeJourneyMap(layout);
  assert.equal(map.valid, true, `Measured About journey is invalid: ${JSON.stringify(map.diagnostics)}`);
  return map;
}

export const ABOUT_SURFEL_FOOTPRINTS = Object.freeze({
  passage: Object.freeze({ occupiedBinCount: 6, occupiedRowCount: 3, occupiedColumnCount: 3 }),
  // Reduced motion holds the authored entrance rather than flying through it.
  'passage-cut': Object.freeze({ occupiedBinCount: 6, occupiedRowCount: 2, occupiedColumnCount: 3 }),
  'reading-banks': Object.freeze({
    // The text owns the central reading column. Require two populated columns
    // on EACH side, at least two thirds of the height, and real physical depth.
    // Raw population cannot substitute for spread or clear painted copy.
    renderedVisibleCount: 300,
    occupiedBinCount: 24, occupiedRowCount: 8, occupiedColumnCount: 4,
    leftOccupiedColumnCount: 2, rightOccupiedColumnCount: 2,
    leftOccupiedBinCount: 12, rightOccupiedBinCount: 12,
    framedLeftDepthSpanWU: 20, framedRightDepthSpanWU: 20,
    readingLeftOccupiedRowCount: 8, readingRightOccupiedRowCount: 8,
    readingLeftOccupiedBinCount: 12, readingRightOccupiedBinCount: 12,
    readingLeftSecondaryColumnRows: 4, readingRightSecondaryColumnRows: 4,
    readingLeftPopulatedDepthWU: 10, readingRightPopulatedDepthWU: 10,
  }),
  'bank-arrival': Object.freeze({
    // The first method title still looks out from the gate exit. The next
    // checkpoint must establish the thicker reading banks on both sides.
    renderedVisibleCount: 100,
    occupiedBinCount: 16, occupiedRowCount: 10, occupiedColumnCount: 2,
    leftOccupiedColumnCount: 1, rightOccupiedColumnCount: 1,
    leftOccupiedBinCount: 4, rightOccupiedBinCount: 4,
    framedDepthSpanWU: 20,
  }),
  'lattice-approach': Object.freeze({
    renderedVisibleCount: 300,
    occupiedBinCount: 24, occupiedRowCount: 7, occupiedColumnCount: 4,
    leftOccupiedColumnCount: 2, rightOccupiedColumnCount: 2,
    leftOccupiedBinCount: 12, rightOccupiedBinCount: 12,
    framedLeftDepthSpanWU: 20, framedRightDepthSpanWU: 20,
    readingLeftOccupiedRowCount: 7, readingRightOccupiedRowCount: 7,
    readingLeftOccupiedBinCount: 12, readingRightOccupiedBinCount: 12,
    readingLeftSecondaryColumnRows: 4, readingRightSecondaryColumnRows: 4,
    readingLeftPopulatedDepthWU: 10, readingRightPopulatedDepthWU: 10,
  }),
  'ground-approach': Object.freeze({
    // The ground first enters as a distant full-width horizon beneath titles.
    renderedVisibleCount: 600,
    occupiedBinCount: 12, occupiedRowCount: 1, occupiedColumnCount: 12,
    leftOccupiedColumnCount: 6, rightOccupiedColumnCount: 6,
    leftOccupiedBinCount: 6, rightOccupiedBinCount: 6,
    fullWidthRowCount: 1, groundFullWidthRowCount: 1, framedDepthSpanWU: 20,
  }),
  'terminal-ground': Object.freeze({
    // At rest require a deep, continuous foreground, including both outer 2%
    // strips. A wide but shallow horizon or two disconnected banks must fail.
    renderedVisibleCount: 2000,
    occupiedBinCount: 48, occupiedRowCount: 4, occupiedColumnCount: 12,
    leftOccupiedColumnCount: 6, rightOccupiedColumnCount: 6,
    leftOccupiedBinCount: 24, rightOccupiedBinCount: 24,
    fullWidthRowCount: 2,
    leftEdgeOccupiedRowCount: 2, rightEdgeOccupiedRowCount: 2,
    framedLeftDepthSpanWU: 200, framedRightDepthSpanWU: 200,
    groundFullWidthRowCount: 2, groundOuterEdgeFullWidthRowCount: 2,
    groundLeftPopulatedDepthWU: 90, groundRightPopulatedDepthWU: 90,
  }),
});

export function assertAboutSurfelFootprint(framing, footprintId, label) {
  const required = ABOUT_SURFEL_FOOTPRINTS[footprintId];
  assert.ok(required, `Unknown footprint ${footprintId}.`);
  // Runtime diagnostics use a 12×12 NDC grid and shader-admitted points only.
  // Three visible circles are needed per bin. These are regression gates;
  // rendered frames and continuous motion still require visual inspection.
  const maxima = {
    occupiedBinCount: 144, occupiedRowCount: 12, occupiedColumnCount: 12,
    leftOccupiedColumnCount: 6, rightOccupiedColumnCount: 6,
    leftOccupiedBinCount: 72, rightOccupiedBinCount: 72,
    fullWidthRowCount: 12, leftEdgeOccupiedRowCount: 12, rightEdgeOccupiedRowCount: 12,
    readingLeftOccupiedRowCount: 12, readingRightOccupiedRowCount: 12,
    readingLeftOccupiedBinCount: 72, readingRightOccupiedBinCount: 72,
    readingLeftSecondaryColumnRows: 12, readingRightSecondaryColumnRows: 12,
    groundFullWidthRowCount: 12, groundOuterEdgeFullWidthRowCount: 12,
  };
  for (const [key, maximum] of Object.entries(maxima)) {
    assert.ok(Number.isInteger(framing?.[key]) && framing[key] >= 0 && framing[key] <= maximum,
      `${label} is missing valid 12×12 occupancy diagnostics: ${key}=${framing?.[key]}.`);
  }
  assert.equal(framing.leftOccupiedColumnCount + framing.rightOccupiedColumnCount,
    framing.occupiedColumnCount, `${label} occupied column totals disagree.`);
  assert.equal(framing.leftOccupiedBinCount + framing.rightOccupiedBinCount,
    framing.occupiedBinCount, `${label} occupied bin totals disagree.`);
  assert.ok(framing.groundOuterEdgeFullWidthRowCount <= framing.groundFullWidthRowCount
    && framing.groundFullWidthRowCount <= framing.fullWidthRowCount,
  `${label} ground row subsets disagree.`);
  for (const [key, minimum] of Object.entries(required)) {
    const value = framing?.[key];
    assert.ok(Number.isFinite(value) && value >= minimum,
      `${label} ${footprintId} footprint failed: ${key}=${value}; required >=${minimum}. `
        + `Diagnostics: ${JSON.stringify(framing)}`);
  }
}

export async function getAboutSurfelState(page, { fieldId = '', marginPx = 0, terminalSweep = false } = {}) {
  return page.evaluate(({ protectedFieldId, protectedMarginPx, checkTerminalSweep }) => {
    const root = document.querySelector('.about-narrative-lab');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const canvas = document.querySelector('.about-narrative-world__canvas');
    const field = protectedFieldId
      ? document.querySelector(`[data-text-field-id="${protectedFieldId}"]`)
      : null;
    const canvasRect = canvas?.getBoundingClientRect();
    const rect = (bounds) => bounds ? {
      left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
    } : null;
    const intersection = (left, right) => {
      if (!left || !right) return null;
      const result = {
        left: Math.max(left.left, right.left), right: Math.min(left.right, right.right),
        top: Math.max(left.top, right.top), bottom: Math.min(left.bottom, right.bottom),
      };
      return result.right > result.left && result.bottom > result.top ? result : null;
    };
    const union = (bounds) => bounds.length ? {
      left: Math.min(...bounds.map((entry) => entry.left)),
      right: Math.max(...bounds.map((entry) => entry.right)),
      top: Math.min(...bounds.map((entry) => entry.top)),
      bottom: Math.max(...bounds.map((entry) => entry.bottom)),
    } : null;
    const opacity = (node) => {
      let value = 1;
      for (let ancestor = node; ancestor instanceof HTMLElement; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (style.visibility === 'hidden' || style.display === 'none') return 0;
        value *= Number.parseFloat(style.opacity);
      }
      return value;
    };
    const paintedRects = (node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return Array.from(range.getClientRects()).filter((bounds) => bounds.width > 0 && bounds.height > 0)
        .map(rect);
    };
    const toNdc = (bounds, margin = 0) => bounds && canvasRect ? {
      minX: (((bounds.left - margin) - canvasRect.left) / canvasRect.width) * 2 - 1,
      maxX: (((bounds.right + margin) - canvasRect.left) / canvasRect.width) * 2 - 1,
      minY: 1 - (((bounds.bottom + margin) - canvasRect.top) / canvasRect.height) * 2,
      maxY: 1 - (((bounds.top - margin) - canvasRect.top) / canvasRect.height) * 2,
    } : null;
    const editorialField = field?.closest('.about-narrative-render-span--editorial') ? field : null;
    let editorialClip = null;
    let editorialReadingBounds = null;
    const visibleCopyLines = [];
    if (editorialField) {
      const bounds = editorialField.getBoundingClientRect();
      const style = getComputedStyle(editorialField);
      const clippingActive = style.clipPath !== 'none';
      const property = (name) => Number.parseFloat(style.getPropertyValue(name));
      const clipTop = clippingActive ? property('--reading-stage-clip-top') : 0;
      const clipBottom = clippingActive ? property('--reading-stage-clip-bottom') : 0;
      const feather = clippingActive ? property('--reading-stage-feather') : 0;
      const stageStart = clippingActive ? property('--reading-stage-start') : 0;
      const stageEnd = clippingActive ? property('--reading-stage-end') : bounds.height;
      editorialClip = intersection({
        left: bounds.left, right: bounds.right,
        top: bounds.top + clipTop, bottom: bounds.bottom - clipBottom,
      }, canvasRect);
      editorialReadingBounds = intersection(editorialClip, {
        left: bounds.left, right: bounds.right,
        top: bounds.top + stageStart + feather,
        bottom: bounds.top + stageEnd - feather,
      });
      // Check the painted visual lines (including wrapped discipline labels),
      // not invisible measurement spans or the full-height semantic document.
      const lineNodes = editorialField.querySelectorAll([
        '[data-editorial-visual-line]',
        '.about-narrative-discipline-list__label',
        '.about-narrative-discipline-list__description',
        '.about-narrative-editorial-pull-sentence',
        '.about-narrative-career-sequence__label',
        '.about-narrative-career-sequence__year',
        '.about-narrative-career-sequence__employer',
        '.about-narrative-career-sequence__role',
        '.about-narrative-career-sequence__independent-label',
        '.about-narrative-career-sequence__independent-text',
        '.about-narrative-client-logos img',
        '.about-narrative-client-logos li > span',
      ].join(', '));
      for (const node of lineNodes) {
        const effectiveOpacity = opacity(node);
        if (effectiveOpacity <= 0.05) continue;
        for (const bounds of node.matches('img')
          ? [rect(node.getBoundingClientRect())] : paintedRects(node)) {
          const clipped = intersection(bounds, editorialClip);
          if (!clipped) continue;
          const readable = intersection(bounds, editorialReadingBounds);
          visibleCopyLines.push({
            text: node.textContent.replace(/\s+/gu, ' ').trim(),
            bounds: clipped,
            opacity: effectiveOpacity,
            readableFraction: readable
              ? (readable.bottom - readable.top) / (bounds.bottom - bounds.top) : 0,
            protectedNdcBounds: toNdc(clipped),
          });
        }
      }
    }
    const lockup = field?.querySelector(
      '.about-narrative-opening-copy, .about-narrative-finale-content',
    );
    const title = field?.querySelector('.about-narrative-spatial-title, .route-bookend-title');
    const titleOpacity = title ? opacity(title) : 0;
    // The layout containers deliberately span more than their visible content.
    // Protect painted copy and action contents, never empty wrapper space or
    // the padded corners behind a button's own material. Projected point counts
    // cannot see DOM occlusion; input-target sizing is checked separately.
    let copyRect = null;
    let lockupContentVisible = false;
    const visibleLockupRegions = [];
    if (title && titleOpacity > 0.05) {
      const range = document.createRange();
      range.selectNodeContents(title);
      const rangeRect = range.getBoundingClientRect();
      if (rangeRect.width > 0 && rangeRect.height > 0) copyRect = rangeRect;
      for (const bounds of paintedRects(title)) {
        visibleLockupRegions.push({
          text: title.textContent.replace(/\s+/gu, ' ').trim(),
          protectedNdcBounds: toNdc(bounds, protectedMarginPx),
        });
      }
    }
    if (lockup) {
      for (const element of lockup.querySelectorAll('.route-title-lockup__rule, .route-intro-description, button, a')) {
        if (opacity(element) <= 0.05) continue;
        let bounds = element.getBoundingClientRect();
        if (element.classList.contains('route-intro-description')) {
          const range = document.createRange();
          range.selectNodeContents(element);
          bounds = range.getBoundingClientRect();
        }
        if (bounds.width <= 0 || bounds.height <= 0) continue;
        lockupContentVisible = true;
        const paintedBounds = element.matches('.route-intro-description, button, a')
          ? paintedRects(element) : [bounds];
        for (const painted of paintedBounds) {
          visibleLockupRegions.push({
            text: element.textContent.replace(/\s+/gu, ' ').trim(),
            protectedNdcBounds: toNdc(painted, protectedMarginPx),
          });
        }
        copyRect = copyRect ? {
          left: Math.min(copyRect.left, bounds.left),
          right: Math.max(copyRect.right, bounds.right),
          top: Math.min(copyRect.top, bounds.top),
          bottom: Math.max(copyRect.bottom, bounds.bottom),
        } : bounds;
      }
    }
    copyRect = editorialField ? union(visibleCopyLines.map((line) => line.bounds))
      : copyRect || (title ? null : field?.getBoundingClientRect()) || null;
    const protectedNdcBounds = toNdc(copyRect, editorialField ? 0 : protectedMarginPx);
    const protectedCopyRegions = editorialField ? visibleCopyLines : title ? visibleLockupRegions : protectedNdcBounds ? [{
      text: title?.textContent.replace(/\s+/gu, ' ').trim() || '',
      protectedNdcBounds,
    }] : [];
    // Project the scene once per frame, then test each painted line/word against
    // those same disks. Re-projecting 90,000 points for every word stalls QA.
    const metrics = window.__aboutNarrativeRuntime.getMetrics({
      protectedNdcBounds,
      protectedNdcRegions: protectedCopyRegions.map((region) => region.protectedNdcBounds),
      terminalSweep: checkTerminalSweep,
    });
    const copyRegionDiagnostics = protectedCopyRegions.map((region, index) => {
      const perModelCounts = Object.fromEntries(Object.entries(metrics.modelFraming).map(([key, model]) => (
        [key, model.protectedRegionVisibleCounts[index]]
      )));
      return {
        ...region,
        perModelCounts,
        protectedVisibleCount: Object.values(perModelCounts).reduce((sum, count) => sum + count, 0),
      };
    });
    const visibleTitles = Array.from(root.querySelectorAll('.about-narrative-render-span--title'))
      .flatMap((span) => {
        const node = span.querySelector('.about-narrative-spatial-title, .route-bookend-title');
        if (!node || opacity(node) <= 0.05) return [];
        const bounds = intersection(union(paintedRects(node)), canvasRect);
        return bounds ? [{ fieldId: span.querySelector('[data-text-field-id]').dataset.textFieldId, bounds }] : [];
      });
    const adjacentTitleOverlaps = [];
    visibleTitles.forEach((left, index) => {
      for (const right of visibleTitles.slice(index + 1)) {
        const overlap = intersection(left.bounds, right.bounds);
        if (overlap && (overlap.right - overlap.left) * (overlap.bottom - overlap.top) > 1) {
          adjacentTitleOverlaps.push({ fieldIds: [left.fieldId, right.fieldId], bounds: overlap });
        }
      }
    });
    // Dedicated traversal gaps must also be clear of the preceding editorial
    // block, not merely the next field named by the checkpoint.
    const visibleEditorialFields = Array.from(root.querySelectorAll(
      '.about-narrative-render-span--editorial > [data-text-field-id]',
    )).flatMap((node) => {
      const bounds = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const clippingActive = style.clipPath !== 'none';
      const clip = intersection({
        left: bounds.left, right: bounds.right,
        top: bounds.top + (clippingActive
          ? Number.parseFloat(style.getPropertyValue('--reading-stage-clip-top')) : 0),
        bottom: bounds.bottom - (clippingActive
          ? Number.parseFloat(style.getPropertyValue('--reading-stage-clip-bottom')) : 0),
      }, canvasRect);
      if (!clip) return [];
      const lines = Array.from(node.querySelectorAll([
        '[data-editorial-visual-line]', '[data-editorial-reveal="discipline"]',
        '[data-editorial-atomic-row]',
      ].join(', '))).flatMap((line) => (opacity(line) > 0.05
        ? paintedRects(line).map((bounds) => intersection(bounds, clip)).filter(Boolean) : []));
      return lines.length ? [{
        fieldId: node.dataset.textFieldId, visibleRegionCount: lines.length, bounds: union(lines),
      }] : [];
    });
    return {
      metrics,
      diagnostics: metrics,
      protectedNdcBounds,
      copyProtection: {
        mode: editorialField ? 'visible-editorial-lines' : 'title-or-finale-lockup',
        titleMeasured: Boolean(title),
        titleOpacity,
        lockupVisible: titleOpacity > 0.05 || lockupContentVisible,
        editorialClip: rect(editorialClip),
        editorialReadingBounds: rect(editorialReadingBounds),
        visibleLineCount: visibleCopyLines.length,
        readableLineCount: visibleCopyLines.filter((line) => line.readableFraction >= 0.95
          && line.opacity >= 0.5).length,
        regions: copyRegionDiagnostics,
        maximumProtectedVisibleCount: Math.max(0, ...copyRegionDiagnostics.map((line) => line.protectedVisibleCount)),
      },
      visibleTitles,
      visibleEditorialFields,
      adjacentTitleOverlaps,
      dataset: { ...root.dataset },
      storyWU: Number(root.dataset.narrativeStoryWu || 0),
      scrollTop: scrollport.scrollTop,
      scrollMaximum: Math.max(0, scrollport.scrollHeight - scrollport.clientHeight),
      semanticTextLength: root.textContent.replace(/\s+/gu, ' ').trim().length,
    };
  }, { protectedFieldId: fieldId, protectedMarginPx: marginPx, checkTerminalSweep: terminalSweep });
}

export async function driveAboutStoryWU(page, targetWU) {
  const resolvedTarget = Number.isFinite(targetWU) ? Math.max(0, targetWU) : null;
  await page.evaluate(async (target) => {
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const maximum = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
    const duration = Math.max(...Array.from(document.querySelectorAll('[data-render-span-id]'),
      (node) => Number(node.dataset.storyEndWu) || 0));
    // Match the production native-range map. storyWU * viewportHeight loses
    // fractional CSS pixels and can stop WebKit one pixel before the endpoint.
    const destination = target === null || target >= duration - 0.00001
      ? maximum
      : Math.min(maximum, target / duration * maximum);
    // Hold the native destination across several frames so Lenis synchronises
    // its internal target instead of restoring the previous audit checkpoint.
    await new Promise((resolve) => {
      let framesRemaining = 8;
      const holdDestination = () => {
        scrollport.scrollTop = destination;
        scrollport.dispatchEvent(new Event('scroll', { bubbles: false }));
        framesRemaining -= 1;
        if (framesRemaining <= 0) resolve();
        else requestAnimationFrame(holdDestination);
      };
      holdDestination();
    });
  }, resolvedTarget);
  await page.waitForFunction((target) => {
    const root = document.querySelector('.about-narrative-lab');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const storyWU = Number(root?.dataset.narrativeStoryWu);
    if (!Number.isFinite(storyWU)) return false;
    if (target === null) {
      const maximum = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
      return maximum - scrollport.scrollTop <= 1;
    }
    return Math.abs(storyWU - target) <= 0.035;
  }, resolvedTarget, { timeout: 30_000 });
  await page.waitForTimeout(120);
}

export function percentile(values, fraction) {
  assert(values.length > 0, 'Cannot calculate a percentile from no values.');
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}
