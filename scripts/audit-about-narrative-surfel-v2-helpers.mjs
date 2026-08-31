import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import { compileAboutNarrativeJourneyMap } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeJourneyMap.js';

export const ABOUT_SURFEL_OUTPUT_DIR = 'output/playwright/about-narrative-hardening/runtime';
const expectedAssetMetadata = JSON.parse(await readFile(resolve(
  process.env.ABS_ABOUT_ASSET_DIR || 'react-app/app/public/models/about-v2-edited-world',
  'meta.json',
), 'utf8'));
const expectedCameraPageIds = expectedAssetMetadata.pages.map((page) => page.id);
const expectedObjectInstances = Object.freeze({
  'gn.round.portals': 36,
  'gn.square.loop': 14,
});
export const ABOUT_SURFEL_PROFILES = Object.freeze({
  desktop: Object.freeze({
    viewport: Object.freeze({ width: 1440, height: 1000 }),
    residentSurfelCount: 90_000,
    maximumGpuBytes: 3_900_000,
  }),
  mobile: Object.freeze({
    viewport: Object.freeze({ width: 390, height: 844 }),
    residentSurfelCount: 30_000,
    maximumGpuBytes: 1_350_000,
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
  assert.equal(metrics.activeSurfelCount, expected.residentSurfelCount);
  assert.equal(metrics.pointCount, expected.residentSurfelCount);
  assert.equal(metrics.masterSurfelCount, 135_000);
  assert.equal(metrics.modelCount, 6);
  assert.equal(Object.keys(metrics.perModelCounts).length, 6);
  assert(Object.values(metrics.perModelCounts).every((count) => count > 0));
  assert.equal(metrics.drawCalls, 2);
  assert.equal(metrics.occlusionMode, 'depth-owned-whole-surfel-reveal');
  assert.equal(metrics.lodRadiusScaleMode, 'per-object');
  assert.equal(Object.keys(metrics.lodRadiusScaleByObject).length, 7);
  assert(Object.values(metrics.lodRadiusScaleByObject).every((scale) => Number.isFinite(scale) && scale >= 1));
  assert.equal(metrics.gpuBufferBuilds, 1);
  assert.equal(metrics.bufferRebuilds, 1);
  assert.equal(metrics.gpuBufferIdentityStable, true);
  assert.equal(metrics.fixedAttributeIdentityStable, true);
  assert.equal(metrics.gpuBufferCount, 13);
  assert.equal(metrics.gpuBufferBytes, metrics.gpuBytes);
  assert(metrics.gpuBufferBytes > 0 && metrics.gpuBufferBytes <= expected.maximumGpuBytes);
  assert.deepEqual(metrics.zones, expectedCameraPageIds);
  assert.equal(metrics.assetSourceHash, expectedAssetMetadata.source.sha256);
  for (const [objectKey, instanceCount] of Object.entries(expectedObjectInstances)) {
    const object = expectedAssetMetadata.source.objects.find((entry) => entry.objectKey === objectKey);
    assert.equal(object?.instanceCount, instanceCount, `${objectKey} lost its restored source instances.`);
    assert.equal(object?.connectedComponentCount, instanceCount, `${objectKey} lost an authored component.`);
  }
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
  assert.equal(metrics.stageVisibilityMode, 'authored-bounded-whole-surfel-handoff');
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
  terrain: Object.freeze({
    // Verified original-camera probes at p.40–.48 show 3 portrait rows and
    // 7–9 landscape rows. Four rows everywhere would reject the original world.
    framedVisibleCount: 1200,
    occupiedBinCount: 24, occupiedRowCount: 3, occupiedColumnCount: 8,
    leftOccupiedColumnCount: 2, rightOccupiedColumnCount: 2,
    leftOccupiedBinCount: 6, rightOccupiedBinCount: 6,
  }),
  'terrain-exit': Object.freeze({
    // The last client row rides the valley exit. Keep a broad, populated plane;
    // two rows alone must not admit the trailing 130-point fragments at p.57.
    framedVisibleCount: 1200,
    occupiedBinCount: 24, occupiedRowCount: 2, occupiedColumnCount: 8,
    leftOccupiedColumnCount: 2, rightOccupiedColumnCount: 2,
    leftOccupiedBinCount: 6, rightOccupiedBinCount: 6,
  }),
  'lattice-approach': Object.freeze({
    occupiedBinCount: 12, occupiedRowCount: 3, occupiedColumnCount: 4,
    leftOccupiedColumnCount: 1, rightOccupiedColumnCount: 1,
    leftOccupiedBinCount: 3, rightOccupiedBinCount: 3,
  }),
  finale: Object.freeze({
    occupiedBinCount: 24, occupiedRowCount: 6, occupiedColumnCount: 6,
    leftOccupiedColumnCount: 3, rightOccupiedColumnCount: 3,
    leftOccupiedBinCount: 9, rightOccupiedBinCount: 9,
  }),
});

export function assertAboutSurfelFootprint(framing, footprintId, label) {
  const required = ABOUT_SURFEL_FOOTPRINTS[footprintId];
  assert.ok(required, `Unknown footprint ${footprintId}.`);
  // Runtime diagnostics use a 12×12 NDC grid, with at least three revealed
  // points per occupied bin. Broad terrain and thick, tall banks must survive;
  // a few points or a single edge column cannot certify a recovered scene.
  const maxima = {
    occupiedBinCount: 144, occupiedRowCount: 12, occupiedColumnCount: 12,
    leftOccupiedColumnCount: 6, rightOccupiedColumnCount: 6,
    leftOccupiedBinCount: 72, rightOccupiedBinCount: 72,
  };
  for (const [key, maximum] of Object.entries(maxima)) {
    assert.ok(Number.isInteger(framing?.[key]) && framing[key] >= 0 && framing[key] <= maximum,
      `${label} is missing valid 12×12 occupancy diagnostics: ${key}=${framing?.[key]}.`);
  }
  assert.equal(framing.leftOccupiedColumnCount + framing.rightOccupiedColumnCount,
    framing.occupiedColumnCount, `${label} occupied column totals disagree.`);
  assert.equal(framing.leftOccupiedBinCount + framing.rightOccupiedBinCount,
    framing.occupiedBinCount, `${label} occupied bin totals disagree.`);
  for (const [key, minimum] of Object.entries(required)) {
    const value = framing?.[key];
    assert.ok(Number.isInteger(value) && value >= minimum,
      `${label} ${footprintId} footprint failed: ${key}=${value}; required >=${minimum}. `
        + `Diagnostics: ${JSON.stringify(framing)}`);
  }
}

export async function getAboutSurfelState(page, { fieldId = '', marginPx = 0 } = {}) {
  return page.evaluate(({ protectedFieldId, protectedMarginPx }) => {
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
      ].join(', '));
      for (const node of lineNodes) {
        const effectiveOpacity = opacity(node);
        if (effectiveOpacity <= 0.05) continue;
        for (const bounds of paintedRects(node)) {
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
    const diagnosticOptions = protectedNdcBounds ? { protectedNdcBounds } : undefined;
    const metrics = window.__aboutNarrativeRuntime.getMetrics(diagnosticOptions);
    const protectedCopyRegions = editorialField ? visibleCopyLines : title ? visibleLockupRegions : protectedNdcBounds ? [{
      text: title?.textContent.replace(/\s+/gu, ' ').trim() || '',
      protectedNdcBounds,
    }] : [];
    const copyRegionDiagnostics = protectedCopyRegions.map((region) => {
      const framing = editorialField || title
        ? window.__aboutNarrativeRuntime.getDiagnosticsSnapshot({
          protectedNdcBounds: region.protectedNdcBounds,
        }).modelFraming
        : metrics.modelFraming;
      const perModelCounts = Object.fromEntries(Object.entries(framing).map(([key, model]) => (
        [key, model.protectedCenterVisibleCount]
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
  }, { protectedFieldId: fieldId, protectedMarginPx: marginPx });
}

export async function driveAboutStoryWU(page, targetWU) {
  const resolvedTarget = Number.isFinite(targetWU) ? Math.max(0, targetWU) : null;
  await page.evaluate(async (target) => {
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const maximum = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
    const destination = target === null
      ? maximum
      : Math.min(maximum, target * scrollport.clientHeight);
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
