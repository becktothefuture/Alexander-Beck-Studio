import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

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
    residentSurfelCount: expectedAssetMetadata.profiles.desktop.surfelCount,
    maximumGpuBytes: 11_100_000,
  }),
  mobile: Object.freeze({
    viewport: Object.freeze({ width: 390, height: 844 }),
    residentSurfelCount: expectedAssetMetadata.profiles.mobile.surfelCount,
    maximumGpuBytes: 3_700_000,
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
        `--use-angle=${process.env.ABS_ABOUT_GPU || 'swiftshader-webgl'}`,
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

export function assertAboutDeliveredMetadata(actual, expected) {
  const transportContract = value => {
    // Candidate metadata is JSON-encoded when the preview envelope is added.
    // JSON turns authored -0 coordinates into 0; compare the same transport
    // representation while retaining every non-preview source contract field.
    const normalized = JSON.parse(JSON.stringify(value));
    delete normalized.preview;
    return normalized;
  };
  assert.deepEqual(transportContract(actual), transportContract(expected),
    'The browser received a different asset metadata contract.');
}

export async function waitForAboutSurfelRuntime(page, profile, timeout = 120_000, layoutProfile = profile) {
  const expected = ABOUT_SURFEL_PROFILES[profile];
  assert(expected, `Unknown About surfel profile ${profile}.`);
  await page.waitForFunction(({ expectedProfile, expectedLayoutProfile, expectedCount, expectedSourceHash }) => {
    const root = document.querySelector('.about-narrative-lab');
    const metrics = window.__aboutNarrativeRuntime?.getMetrics?.();
    if (metrics?.assetSourceHash && metrics.assetSourceHash !== expectedSourceHash) {
      throw new Error(`About source mismatch: active ${metrics.assetSourceHash}; expected ${expectedSourceHash}. Check Blender preview selection before auditing.`);
    }
    if (metrics?.state === 'error' || root?.dataset.aboutSceneReady === 'error') {
      throw new Error(`About scene failed readiness: ${metrics?.error || 'unknown scene error'}`);
    }
    return root?.dataset.pointAsset === 'blender-surfel-v2'
      && root?.dataset.worldStage === 'blender-surfel-scene'
      && metrics?.state === 'ready'
      && metrics.adapterId === 'blender-surfel-v2'
      && metrics.qualityTier === expectedProfile
      && metrics.pointProfile === expectedProfile
      && metrics.layoutProfile === expectedLayoutProfile
      && metrics.assetSourceHash === expectedSourceHash
      && metrics.journeyMapValid === true
      && metrics.bundleIntegrityVerified === true
      && metrics.sceneContractStatus === 'compatible'
      && root.dataset.aboutSceneReady === 'true'
      && metrics.residentSurfelCount === expectedCount
      && metrics.drawCalls === 2
      && metrics.fixedAttributeIdentityStable === true;
  }, {
    expectedProfile: profile,
    expectedLayoutProfile: layoutProfile,
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
  assert.equal(metrics.masterSurfelCount, expectedAssetMetadata.profiles.master.surfelCount);
  assert.equal(metrics.modelCount, expectedAssetMetadata.models.length);
  assert.equal(Object.keys(metrics.perModelCounts).length, expectedAssetMetadata.models.length);
  assert(Object.values(metrics.perModelCounts).every((count) => count > 0));
  assert(metrics.drawCalls >= 2 && metrics.drawCalls <= metrics.modelCount * 2
    && metrics.drawCalls % 2 === 0,
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
  const london = expectedAssetMetadata.models.find((entry) => entry.key === 'about.06');
  assert.equal(london?.renderingProfile, 'scan');
  assert.equal(expectedAssetMetadata.source.geography.constructedGeometry, false);
  assert.equal(expectedAssetMetadata.source.geography.geometry, 'unreconstructed-survey-points');
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

// Inspect the actual compiled rail. Reconstructing equal sections from DOM
// spans loses measured reading entry and can certify the wrong camera poses.
export async function getAboutSurfelJourneyMap(page) {
  const map = await page.evaluate(() => (
    window.__aboutNarrativeRuntime?.getMetrics?.()?.storyJourneyMap || null
  ));
  assert.ok(map, 'About runtime did not expose its compiled story journey map.');
  assert.equal(map.valid, true, `Measured About journey is invalid: ${JSON.stringify(map.diagnostics)}`);
  return map;
}

export const ABOUT_SURFEL_FOOTPRINTS = Object.freeze({
  'opening-reading': Object.freeze({
    renderedVisibleCount: 150,
    occupiedBinCount: 24, occupiedRowCount: 8, occupiedColumnCount: 6,
    leftOccupiedColumnCount: 2, rightOccupiedColumnCount: 2,
    leftOccupiedBinCount: 8, rightOccupiedBinCount: 8,
    framedLeftDepthSpanWU: 50, framedRightDepthSpanWU: 50,
  }),
  'opening-reading-mobile': Object.freeze({
    renderedVisibleCount: 60,
    occupiedBinCount: 10, occupiedRowCount: 6, occupiedColumnCount: 6,
    leftOccupiedColumnCount: 2, rightOccupiedColumnCount: 2,
    leftOccupiedBinCount: 3, rightOccupiedBinCount: 3,
    framedLeftDepthSpanWU: 40, framedRightDepthSpanWU: 40,
  }),
  passage: Object.freeze({ occupiedBinCount: 6, occupiedRowCount: 3, occupiedColumnCount: 3 }),
  'passage-mobile': Object.freeze({ occupiedBinCount: 4, occupiedRowCount: 3, occupiedColumnCount: 3 }),
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
  'terrain-reading': Object.freeze({
    // The terrain begins as a broad foreground field, then drops to a quiet
    // horizon while the denser disciplines and client lists cross it.
    renderedVisibleCount: 80,
    occupiedBinCount: 4, occupiedRowCount: 1, occupiedColumnCount: 4,
    framedDepthSpanWU: 20,
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
  'finale-product': Object.freeze({
    renderedVisibleCount: 2000,
    occupiedBinCount: 18, occupiedRowCount: 4, occupiedColumnCount: 6,
    leftOccupiedColumnCount: 3, rightOccupiedColumnCount: 2,
    framedDepthSpanWU: 40,
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
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const rectangles = [];
      // A range over the whole button also returns its invisible Copied/Failed
      // labels and wrapper boxes. Measure only painted text, then account for
      // the bounded, scrollable copy area used by enlarged type.
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        if (!text.textContent.trim() || opacity(text.parentElement) <= 0.05) continue;
        range.selectNodeContents(text);
        for (const bounds of range.getClientRects()) {
          let painted = bounds.width > 0 && bounds.height > 0 ? rect(bounds) : null;
          for (let ancestor = text.parentElement; painted && ancestor && ancestor !== root; ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor);
            if (/(hidden|clip|auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`)) {
              painted = intersection(painted, ancestor.getBoundingClientRect());
            }
          }
          if (painted) rectangles.push(painted);
        }
      }
      return rectangles;
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
        // Protect every painted paragraph through its restrained entrance.
        if (effectiveOpacity < 0.5) continue;
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
            protectedNdcBounds: toNdc(clipped, protectedMarginPx),
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
      const perModelDiagnostics = Object.fromEntries(Object.entries(metrics.modelFraming).map(([key, model]) => {
        const allDepthVisibleCount = model.protectedRegionVisibleCounts[index];
        const nearVisibleCount = model.protectedRegionNearVisibleCounts?.[index];
        const maximumRadiusPx = model.protectedRegionMaximumRadiusPx?.[index];
        const minimumDepthWU = model.protectedRegionMinimumDepthWU?.[index];
        const nearCriteria = model.protectedNearCriteria || null;
        const nearDiagnosticsAvailable = Number.isInteger(nearVisibleCount) && nearVisibleCount >= 0
          && nearVisibleCount <= allDepthVisibleCount && Number.isFinite(maximumRadiusPx) && maximumRadiusPx >= 0
          && (allDepthVisibleCount > 0 ? Number.isFinite(minimumDepthWU) : minimumDepthWU === null)
          && Number.isFinite(nearCriteria?.unfoggedDepthWU) && nearCriteria?.minimumBallRadiusPx === 2;
        return [key, { allDepthVisibleCount,
          nearVisibleCount: nearDiagnosticsAvailable ? nearVisibleCount : null,
          distantVisibleCount: nearDiagnosticsAvailable ? allDepthVisibleCount - nearVisibleCount : null,
          maximumRadiusPx: Number.isFinite(maximumRadiusPx) ? maximumRadiusPx : null,
          minimumDepthWU: Number.isFinite(minimumDepthWU) ? minimumDepthWU : null,
          nearCriteria, nearDiagnosticsAvailable }];
      }));
      const perModelCounts = Object.fromEntries(Object.entries(perModelDiagnostics)
        .map(([key, model]) => [key, model.allDepthVisibleCount]));
      const nearDiagnosticsAvailable = Object.values(perModelDiagnostics).every(model => model.nearDiagnosticsAvailable);
      const protectedVisibleCount = Object.values(perModelCounts).reduce((sum, count) => sum + count, 0);
      const protectedNearVisibleCount = nearDiagnosticsAvailable
        ? Object.values(perModelDiagnostics).reduce((sum, model) => sum + model.nearVisibleCount, 0) : null;
      const depths = Object.values(perModelDiagnostics).map(model => model.minimumDepthWU).filter(Number.isFinite);
      return {
        ...region,
        perModelCounts, perModelDiagnostics, nearDiagnosticsAvailable, protectedVisibleCount,
        protectedNearVisibleCount,
        protectedDistantVisibleCount: nearDiagnosticsAvailable ? protectedVisibleCount - protectedNearVisibleCount : null,
        maximumRadiusPx: nearDiagnosticsAvailable
          ? Math.max(0, ...Object.values(perModelDiagnostics).map(model => model.maximumRadiusPx)) : null,
        minimumDepthWU: depths.length ? Math.min(...depths) : null,
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
    const utilityRail = document.querySelector('.shell-utility-rail')?.getBoundingClientRect();
    const utilityRailOverlapCount = utilityRail ? visibleCopyLines.filter(line => intersection(line.bounds, {
      left: utilityRail.left - 8, right: utilityRail.right,
      top: utilityRail.top - 8, bottom: utilityRail.bottom + 8,
    })).length : 0;
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
        utilityRailOverlapCount,
        readableLineCount: visibleCopyLines.filter((line) => line.readableFraction >= 0.95
          && line.opacity >= 0.5).length,
        regions: copyRegionDiagnostics,
        maximumProtectedVisibleCount: Math.max(0, ...copyRegionDiagnostics.map((line) => line.protectedVisibleCount)),
        nearDiagnosticsAvailable: copyRegionDiagnostics.every(line => line.nearDiagnosticsAvailable),
        maximumProtectedNearVisibleCount: copyRegionDiagnostics.every(line => line.nearDiagnosticsAvailable)
          ? Math.max(0, ...copyRegionDiagnostics.map(line => line.protectedNearVisibleCount)) : null,
        maximumProtectedDistantVisibleCount: copyRegionDiagnostics.every(line => line.nearDiagnosticsAvailable)
          ? Math.max(0, ...copyRegionDiagnostics.map(line => line.protectedDistantVisibleCount)) : null,
        protectedNearCriteria: Object.fromEntries(Object.entries(metrics.modelFraming)
          .map(([key, model]) => [key, model.protectedNearCriteria || null])),
        pixelRatio: metrics.pixelRatio,
        radiusUnit: 'CSS pixels from the active renderer; no fixed cap or diameter is assumed',
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
  await page.evaluate((target) => {
    const scrollport = document.querySelector('.about-narrative-scrollport');
    if (scrollport.classList.contains('lenis')) throw new Error(
      'Native positioning fixture cannot directly drive an active Lenis owner. Use real wheel input or the authored zero-smoothing About source.',
    );
    const maximum = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
    const duration = Math.max(...Array.from(document.querySelectorAll('[data-render-span-id]'),
      (node) => Number(node.dataset.storyEndWu) || 0));
    // Match the production native-range map. storyWU * viewportHeight loses
    // fractional CSS pixels and can stop WebKit one pixel before the endpoint.
    const destination = target === null || target >= duration - 0.00001
      ? maximum
      : Math.min(maximum, target / duration * maximum);
    // Write once to the native owner. Repeated writes can hide a competing
    // smoothing destination and cannot prove an untouched stopped position.
    scrollport.scrollTop = destination;
    scrollport.dispatchEvent(new Event('scroll', { bubbles: false }));
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

export async function captureAboutDistantOverlapReview(page, {
  state, screenshotPath, id, fieldId, runtimeSourceFingerprint = null,
}) {
  assert.equal(state.copyProtection.nearDiagnosticsAvailable, true, 'Missing near-material diagnostics cannot certify prose.');
  const regions = state.copyProtection.regions.map((region, index) => ({ index, ...region }))
    .filter(region => region.protectedDistantVisibleCount > 0);
  if (!regions.length) return null;
  assert.equal(state.metrics.visible, true, 'Distant-overlap review requires the active GPU scene.');
  const bytes = await page.screenshot({ path: screenshotPath, animations: 'allow' });
  return {
    id, fieldId, storyWU: state.storyWU, scrollTop: state.scrollTop,
    sourceHash: state.metrics.assetSourceHash, runtimeSourceFingerprint,
    pointProfile: state.metrics.pointProfile, layoutProfile: state.metrics.layoutProfile,
    pixelRatio: state.metrics.pixelRatio, paletteId: state.metrics.paletteId,
    paletteGeneration: state.metrics.paletteGeneration,
    screenshot: screenshotPath, screenshotSha256: createHash('sha256').update(bytes).digest('hex'),
    regions, protectedNearCriteria: state.copyProtection.protectedNearCriteria,
    status: 'pending-visual-review', visualJudgement: 'pending', accepted: false,
    scope: 'Every sampled distant-overlap region requires direct review of this active-scene screenshot. Radius is CSS pixels and depth is world units; per-model extrema cover all admitted overlaps. When the near count is zero, those extrema describe distant material. Counts precede depth/DOM occlusion and do not establish visual acceptance.',
  };
}

export function percentile(values, fraction) {
  assert(values.length > 0, 'Cannot calculate a percentile from no values.');
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}
