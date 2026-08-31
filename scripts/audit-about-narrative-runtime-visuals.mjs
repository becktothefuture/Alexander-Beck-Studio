import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import sharp from 'sharp';
import {
  ABOUT_SURFEL_OUTPUT_DIR,
  ABOUT_SURFEL_PROFILES,
  ABOUT_SURFEL_FOOTPRINTS,
  assertAboutSurfelFootprint,
  assertAboutSurfelMetrics,
  collectPageErrors,
  driveAboutStoryWU,
  ensureAboutSurfelOutputDirectory,
  getAboutSurfelState,
  getAboutSurfelJourneyMap,
  launchAboutAuditBrowser,
  waitForAboutSurfelRuntime,
} from './audit-about-narrative-surfel-v2-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const browserArtifactPrefix = browserName === 'chromium' ? '' : `${browserName}-`;
const requestedCheckpointIds = new Set(
  String(process.env.ABS_ABOUT_VISUAL_CHECKPOINTS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const requestedGroups = new Set(
  String(process.env.ABS_ABOUT_VISUAL_GROUPS || 'desktop,mobile,reduced-motion')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const requestedScreenshotCheckpointIds = process.env.ABS_ABOUT_VISUAL_SCREENSHOT_CHECKPOINTS == null
  ? null
  : new Set(
    String(process.env.ABS_ABOUT_VISUAL_SCREENSHOT_CHECKPOINTS)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
const maximumProtectedCenterSurfels = Math.max(
  0,
  Number(process.env.ABS_ABOUT_PROTECTED_CENTER_MAX) || 0,
);
assert.equal(maximumProtectedCenterSurfels, 0,
  'A positive protected-copy allowance is diagnostic only and cannot pass the visual audit.');
const requestedMinimumFramedSurfels = process.env.ABS_ABOUT_FRAMED_MIN == null
  ? null
  : Math.max(0, Number(process.env.ABS_ABOUT_FRAMED_MIN) || 0);
const capturePointWorldPixels = process.env.ABS_ABOUT_POINT_WORLD_CAPTURE !== '0';
const candidateAssetDirectory = process.env.ABS_ABOUT_ASSET_DIR
  ? resolve(process.env.ABS_ABOUT_ASSET_DIR)
  : null;
const checkpointSpecs = Object.freeze([
  Object.freeze({ id: 'opening-start', fieldId: 'text-promise-main', phase: 'start', expectedModelKey: 'about.00', expectsProtectedCenter: true, expectsFramedModel: true }),
  // The opening-start checkpoint establishes the aperture. By title focus the
  // camera is passing through it, so the expanding form may leave a wide frame.
  Object.freeze({ id: 'opening', fieldId: 'text-promise-main', phase: 'focus', expectedModelKey: 'about.00', expectsProtectedCenter: true }),
  Object.freeze({ id: 'opening-clear', fieldId: 'text-complexity-idea', anchorId: 'inciting-question', expectedModelKey: 'about.01', allowedModelKeys: ['about.00', 'about.01'] }),
  Object.freeze({ id: 'inciting-question', fieldId: 'text-complexity-idea', phase: 'focus', expectedModelKey: 'about.01', expectsProtectedCenter: true, expectsFramedModel: true }),
  Object.freeze({ id: 'question-resolve', fieldId: 'text-complexity-conditions', phase: 'focus', expectedModelKey: 'about.01', expectsProtectedCenter: true }),
  // Keep stable report IDs, but locate passages and handoffs from the measured
  // semantic anchors. Empty frames are not a success condition for any chapter.
  Object.freeze({ id: 'nebula-portals-gap', fieldId: 'text-background-unit', anchorId: 'portal-entry', expectedModelKey: 'about.02', allowedModelKeys: ['about.01', 'about.02'], expectsPassage: true }),
  Object.freeze({ id: 'portal-entry', fieldId: 'text-background-unit', anchorId: 'portal-entry', untilAnchorId: 'portal-exit', passageFraction: 0.1, expectedModelKey: 'about.02', expectsFramedModel: true, footprint: 'passage', expectsPassage: true }),
  Object.freeze({ id: 'portal-threshold', fieldId: 'text-background-unit', anchorId: 'portal-entry', untilAnchorId: 'portal-exit', passageFraction: 0.5, expectedModelKey: 'about.02', expectsFramedModel: true, footprint: 'passage', expectsPassage: true }),
  Object.freeze({ id: 'portal-release', fieldId: 'text-background-unit', anchorId: 'portal-exit', expectedModelKey: 'about.02', allowedModelKeys: ['about.02', 'about.03'], expectsPassage: true }),
  Object.freeze({ id: 'personal-origin', fieldId: 'text-background-unit', phase: 'focus', expectedModelKey: 'about.03', expectsProtectedCenter: true, expectsReading: true, expectsFramedModel: true, footprint: 'terrain' }),
  Object.freeze({ id: 'personal-origin-late', fieldId: 'text-background-unit', fieldFraction: 0.7, expectedModelKey: 'about.03', expectsProtectedCenter: true, expectsReading: true, expectsFramedModel: true, footprint: 'terrain' }),
  Object.freeze({ id: 'portals-canyon-cut', fieldId: 'text-complexity-curiosity', anchorId: 'earned-thesis', expectedModelKey: 'about.03', expectsFramedModel: true, footprint: 'terrain' }),
  Object.freeze({ id: 'earned-thesis', fieldId: 'text-complexity-curiosity', phase: 'focus', expectedModelKey: 'about.03', expectsProtectedCenter: true, expectsFramedModel: true, footprint: 'terrain' }),
  Object.freeze({ id: 'category-thesis', fieldId: 'text-complexity-listen', phase: 'focus', expectedModelKey: 'about.03', expectsProtectedCenter: true, expectsFramedModel: true, footprint: 'terrain' }),
  Object.freeze({ id: 'discipline-labels', fieldId: 'text-discipline-labels', phase: 'focus', expectedModelKey: 'about.03', expectsProtectedCenter: true, expectsReading: true, expectsFramedModel: true, footprint: 'terrain' }),
  Object.freeze({ id: 'discipline-labels-mid', fieldId: 'text-discipline-labels', fieldFraction: 0.5, expectedModelKey: 'about.03', expectsProtectedCenter: true, expectsReading: true, expectsFramedModel: true, footprint: 'terrain' }),
  Object.freeze({ id: 'discipline-labels-late', fieldId: 'text-discipline-labels', fieldFraction: 0.8, expectedModelKey: 'about.03', expectsProtectedCenter: true, expectsReading: true, expectsFramedModel: true, footprint: 'terrain' }),
  Object.freeze({ id: 'disciplines', fieldId: 'text-disciplines-title', phase: 'focus', expectedModelKey: 'about.03', expectsProtectedCenter: true, expectsReading: true, expectsFramedModel: true, footprint: 'terrain' }),
  Object.freeze({ id: 'disciplines-mid', fieldId: 'text-disciplines-title', fieldFraction: 0.5, expectedModelKey: 'about.03', expectsProtectedCenter: true, expectsReading: true, expectsFramedModel: true, footprint: 'terrain' }),
  Object.freeze({ id: 'clients', fieldId: 'text-disciplines-title', contentSelector: '[data-client-logo]:last-child', expectedModelKey: 'about.03', expectsEditorial: true, expectsFramedModel: true, footprint: 'terrain-exit' }),
  Object.freeze({ id: 'canyon-gate-cut', fieldId: 'text-life-momentum', anchorId: 'gate-entry', expectedModelKey: 'about.04', allowedModelKeys: ['about.03', 'about.04'] }),
  Object.freeze({ id: 'gate-entry', fieldId: 'text-life-momentum', anchorId: 'gate-entry', untilAnchorId: 'gate-exit', passageFraction: 0.1, expectedModelKey: 'about.04', expectsFramedModel: true, footprint: 'passage', expectsPassage: true }),
  Object.freeze({ id: 'gate-threshold', fieldId: 'text-life-momentum', anchorId: 'gate-entry', untilAnchorId: 'gate-exit', passageFraction: 0.5, expectedModelKey: 'about.04', expectsFramedModel: true, footprint: 'passage', expectsPassage: true }),
  Object.freeze({ id: 'gate-release', fieldId: 'text-life-momentum', anchorId: 'gate-exit', expectedModelKey: 'about.04', allowedModelKeys: ['about.04', 'about.05'], expectsPassage: true }),
  Object.freeze({ id: 'gate-lattice-handoff', fieldId: 'text-life-momentum', anchorId: 'gate-exit', insideOffsetWU: 0.18, expectedModelKey: 'about.05', allowedModelKeys: ['about.04', 'about.05'] }),
  Object.freeze({ id: 'visible-early', fieldId: 'text-life-momentum', phase: 'focus', expectedModelKey: 'about.05', expectsProtectedCenter: true, expectsFramedModel: true, footprint: 'lattice-approach' }),
  Object.freeze({ id: 'visible-form', fieldId: 'text-life-form', phase: 'focus', expectedModelKey: 'about.05', expectsProtectedCenter: true, expectsFramedModel: true, footprint: 'lattice-approach' }),
  Object.freeze({ id: 'lattice-threshold', fieldId: 'text-life-form', anchorId: 'lattice-approach', untilAnchorId: 'split-lattice-entry', passageFraction: 0.5, expectedModelKey: 'about.05', expectsProtectedCenter: true, expectsFramedModel: true, footprint: 'lattice-approach' }),
  Object.freeze({ id: 'method', fieldId: 'text-life-character', phase: 'focus', expectedModelKey: 'about.05', expectsProtectedCenter: true, expectsReading: true, expectsFramedModel: true, footprint: 'lattice-approach' }),
  Object.freeze({ id: 'method-mid', fieldId: 'text-life-character', fieldFraction: 0.5, expectedModelKey: 'about.05', expectsProtectedCenter: true, expectsReading: true, expectsFramedModel: true, footprint: 'lattice-approach' }),
  Object.freeze({ id: 'method-late', fieldId: 'text-life-character', fieldFraction: 0.75, expectedModelKey: 'about.05', expectsProtectedCenter: true, expectsReading: true, expectsFramedModel: true, footprint: 'lattice-approach' }),
  // Check the first title's entry, not just its focus. A slow renderer can
  // finish the DOM title reveal while an overlong lattice window stays active.
  Object.freeze({ id: 'lattice-title-entry', fieldId: 'text-epilogue-shaping', phase: 'start', expectedModelKey: 'about.05', expectsProtectedCenter: true, expectsFramedModel: true, footprint: 'finale' }),
  Object.freeze({ id: 'shaping', fieldId: 'text-epilogue-shaping', phase: 'focus', expectedModelKey: 'about.05', expectsProtectedCenter: true, expectsFramedModel: true, footprint: 'finale' }),
  Object.freeze({ id: 'thinking', fieldId: 'text-epilogue-thinking', phase: 'focus', expectedModelKey: 'about.05', expectsProtectedCenter: true, expectsFramedModel: true, footprint: 'finale' }),
  Object.freeze({ id: 'lattice-clear', fieldId: 'text-epilogue-invitation', anchorId: 'camera-lock', expectedModelKey: 'about.05', expectsFramedModel: true, footprint: 'finale', expectsLocked: true }),
  Object.freeze({ id: 'invitation', fieldId: 'text-epilogue-invitation', phase: 'start', insideOffsetWU: 0.001, expectedModelKey: 'about.05', expectsProtectedCenter: true, expectsFramedModel: true, footprint: 'finale', expectsLocked: true }),
  Object.freeze({ id: 'invitation-focus', fieldId: 'text-epilogue-invitation', phase: 'focus', expectedModelKey: 'about.05', expectsProtectedCenter: true, expectsFramedModel: true, footprint: 'finale', expectsLocked: true }),
  Object.freeze({ id: 'terminal-hold', fieldId: 'text-epilogue-invitation', phase: 'end', expectedModelKey: 'about.05', expectsProtectedCenter: true, expectsFramedModel: true, footprint: 'finale', expectsFinale: true, expectsLocked: true }),
]);

function absoluteWrappedRoll(degrees) {
  return Math.abs((((Number(degrees) + 180) % 360) + 360) % 360 - 180);
}

function assertVectorStable(before, after, label, epsilon = 0.000001) {
  assert.equal(before.length, after.length, `${label} vector size changed.`);
  before.forEach((value, index) => {
    assert.ok(
      Math.abs(Number(value) - Number(after[index])) <= epsilon,
      `${label}[${index}] moved from ${value} to ${after[index]}.`,
    );
  });
}

async function compareScreenshots(beforePath, afterPath) {
  const [before, after] = await Promise.all([
    sharp(beforePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(afterPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  assert.deepEqual(before.info, after.info);
  let changedChannels = 0;
  let totalDifference = 0;
  for (let index = 0; index < before.data.length; index += 1) {
    const difference = Math.abs(before.data[index] - after.data[index]);
    if (difference > 2) changedChannels += 1;
    totalDifference += difference;
  }
  return {
    changedChannelRatio: changedChannels / before.data.length,
    meanChannelDifference: totalDifference / before.data.length,
  };
}

async function readFinalePresentation(page) {
  return page.evaluate(() => {
    const node = document.querySelector('[data-text-field-id="text-epilogue-invitation"]');
    if (!(node instanceof HTMLElement)) throw new Error('About finale field is unavailable.');
    const style = getComputedStyle(node);
    const title = node.querySelector('.about-narrative-spatial-title');
    const numberProperty = (name) => Number.parseFloat(style.getPropertyValue(name)) || 0;
    return {
      titlePhase: numberProperty('--spatial-context-opacity'),
      rulePhase: numberProperty('--route-title-rule-scale'),
      descriptionPhase: numberProperty('--spatial-description-opacity'),
      actionPhase: numberProperty('--spatial-action-opacity'),
      renderedTitleOpacity: Number.parseFloat(getComputedStyle(title).opacity) || 0,
    };
  });
}

async function capturePointWorldScreenshot(page, path) {
  await page.evaluate(() => {
    const canvas = document.querySelector('.about-narrative-world__canvas');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('About point-world canvas is unavailable.');
    const style = document.createElement('style');
    style.id = 'about-audit-point-world-isolation';
    style.textContent = '[data-about-audit-world-hidden="true"] { visibility: hidden !important; }';
    document.head.append(style);
    document.querySelectorAll('body *').forEach((node) => {
      if (node === canvas || node.contains(canvas)) return;
      node.setAttribute('data-about-audit-world-hidden', 'true');
    });
  });
  try {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
    const canvasBounds = await page.evaluate(() => {
      const canvas = document.querySelector('.about-narrative-world__canvas');
      if (!(canvas instanceof HTMLCanvasElement)) return null;
      const bounds = canvas.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    });
    assert.ok(canvasBounds?.width > 0 && canvasBounds?.height > 0, 'About point-world canvas has no visible bounds.');
    await page.screenshot({ path, clip: canvasBounds });
  } finally {
    await page.evaluate(() => {
      document.querySelectorAll('[data-about-audit-world-hidden]').forEach((node) => {
        node.removeAttribute('data-about-audit-world-hidden');
      });
      document.getElementById('about-audit-point-world-isolation')?.remove();
    });
  }
}

async function setRuntimeRendering(page, visible) {
  await page.evaluate((nextVisible) => {
    window.__aboutNarrativeRuntime?.setVisible?.(nextVisible);
  }, visible);
  if (visible) {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
  }
}

async function getCheckpointStoryWU(page, checkpoint) {
  if (Number.isFinite(checkpoint.storyWU)) return checkpoint.storyWU;
  if (checkpoint.contentSelector) {
    return page.evaluate(({ fieldId, contentSelector }) => {
      const root = document.querySelector('.about-narrative-lab');
      const field = root.querySelector(`[data-text-field-id="${fieldId}"]`);
      const node = field?.querySelector(contentSelector);
      const canvas = root.querySelector('.about-narrative-world__canvas');
      if (!node || !canvas) throw new Error(`Missing editorial target ${fieldId}:${contentSelector}.`);
      const style = getComputedStyle(field);
      const fieldBounds = field.getBoundingClientRect();
      const bounds = node.getBoundingClientRect();
      const stageStart = Number.parseFloat(style.getPropertyValue('--reading-stage-start'));
      const stageEnd = Number.parseFloat(style.getPropertyValue('--reading-stage-end'));
      if (!Number.isFinite(stageStart) || !Number.isFinite(stageEnd)) {
        throw new Error(`Unmeasured reading stage for ${fieldId}.`);
      }
      const readingCenter = fieldBounds.top + (stageStart + stageEnd) / 2;
      return Number(root.dataset.narrativeStoryWu)
        + ((bounds.top + bounds.bottom) / 2 - readingCenter) / canvas.getBoundingClientRect().height;
    }, { fieldId: checkpoint.fieldId, contentSelector: checkpoint.contentSelector });
  }
  if (checkpoint.anchorId) {
    const map = await getAboutSurfelJourneyMap(page);
    const from = map.anchors.find((entry) => entry.id === checkpoint.anchorId);
    assert.ok(Number.isFinite(from?.storyWU), `Missing journey anchor ${checkpoint.anchorId}.`);
    if (!checkpoint.untilAnchorId) return from.storyWU + Number(checkpoint.insideOffsetWU || 0);
    const to = map.anchors.find((entry) => entry.id === checkpoint.untilAnchorId);
    assert.ok(Number.isFinite(to?.storyWU) && to.storyWU > from.storyWU,
      `Invalid passage ${checkpoint.anchorId} → ${checkpoint.untilAnchorId}.`);
    return from.storyWU + (to.storyWU - from.storyWU) * checkpoint.passageFraction;
  }
  const phaseStoryWU = await page.evaluate(({ fieldId, phase, fieldFraction }) => {
    const node = document.querySelector(`[data-render-span-id="render-span-${fieldId}"]`);
    if (!(node instanceof HTMLElement)) throw new Error(`About render span ${fieldId} is unavailable.`);
    if (Number.isFinite(fieldFraction)) {
      const start = Number(node.dataset.storyStartWu);
      return start + (Number(node.dataset.storyEndWu) - start) * fieldFraction;
    }
    return Number(node.dataset[`story${phase[0].toUpperCase()}${phase.slice(1)}Wu`]);
  }, { fieldId: checkpoint.fieldId, phase: checkpoint.phase, fieldFraction: checkpoint.fieldFraction });
  assert.ok(Number.isFinite(phaseStoryWU), `Invalid measured timing for ${checkpoint.id}.`);
  return phaseStoryWU + Number(checkpoint.insideOffsetWU || 0);
}

await ensureAboutSurfelOutputDirectory();
const results = [];

async function captureGroupInBrowser(browser, { profile, reducedMotion = false }) {
  const group = reducedMotion ? 'reduced-motion' : profile;
  const contextCheckpointLimit = Math.max(
    1,
    Number(process.env.ABS_ABOUT_VISUAL_CONTEXT_CHECKPOINTS) || 8,
  );
  const allConsoleErrors = [];
  let context = null;
  let page = null;
  let consoleErrors = [];

  const openAuditPage = async () => {
    context = await browser.newContext({ viewport: ABOUT_SURFEL_PROFILES[profile].viewport });
    page = await context.newPage();
    page.setDefaultTimeout(60_000);
    if (candidateAssetDirectory) {
      await page.route('**/models/about-v2-edited-world/**', async (route) => {
        const file = basename(new URL(route.request().url()).pathname);
        const contentType = file.endsWith('.json') ? 'application/json' : 'application/octet-stream';
        await route.fulfill({
          body: await readFile(resolve(candidateAssetDirectory, file)),
          contentType,
          status: 200,
        });
      });
    }
    if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
    consoleErrors = collectPageErrors(page);
    await page.goto(`${baseUrl}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
    await waitForAboutSurfelRuntime(page, profile);
    await page.waitForFunction(() => (
      Number(document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceScale) >= 0.999
    ), null, { timeout: 60_000 });
  };
  const closeAuditPage = async () => {
    allConsoleErrors.push(...consoleErrors);
    await context?.close();
    context = null;
    page = null;
    consoleErrors = [];
  };

  const groupSpecs = reducedMotion
    ? checkpointSpecs.filter((entry) => [
      'opening',
      'portal-threshold',
      'personal-origin',
      'discipline-labels',
      'disciplines',
      'clients',
      'gate-threshold',
      'method',
      'method-mid',
      'gate-lattice-handoff',
      'lattice-threshold',
      'lattice-title-entry',
      'shaping',
      'thinking',
      'lattice-clear',
      'invitation',
      'invitation-focus',
      'terminal-hold',
    ].includes(entry.id))
    : checkpointSpecs;
  const specs = requestedCheckpointIds.size > 0
    ? groupSpecs.filter((entry) => requestedCheckpointIds.has(entry.id))
    : groupSpecs;
  assert.ok(specs.length > 0, `${group} has no selected visual checkpoints.`);
  const screenshotPaths = [];
  const groupResults = [];
  await openAuditPage();
  for (const [checkpointIndex, checkpoint] of specs.entries()) {
    if (checkpointIndex > 0 && checkpointIndex % contextCheckpointLimit === 0) {
      await closeAuditPage();
      await openAuditPage();
    }
    const requestedStoryWU = await getCheckpointStoryWU(page, checkpoint);
    await driveAboutStoryWU(page, requestedStoryWU);
    const state = await getAboutSurfelState(page, {
      fieldId: checkpoint.fieldId,
      // Protect the readable lockup, not a large empty rectangle around it.
      // The former 32px desktop moat rejected intact original scenery even
      // when every glyph was clear. Editorial checks use actual clipped lines.
      marginPx: 8,
    });
    assertAboutSurfelMetrics(state.metrics, profile);
    assert.equal(state.dataset.worldStage, 'blender-surfel-scene');
    assert.equal(state.dataset.pointAsset, 'blender-surfel-v2');
    assert.equal(state.dataset.aboutSceneReady, 'true');
    assert.equal(state.dataset.aboutJourneyCertifiable, 'true');
    assert.equal(state.dataset.bundleIntegrityVerified, 'true');
    assert.equal(state.dataset.sceneContractStatus, 'compatible');
    assert(state.semanticTextLength > 500);
    assert.deepEqual(state.adjacentTitleOverlaps, [],
      `${group}-${checkpoint.id} overlaps visible title DOM: ${JSON.stringify(state.adjacentTitleOverlaps)}`);
    if (checkpoint.expectsLocked) assert.equal(state.metrics.cameraLocked, true);
    const modelVisibility = Object.fromEntries(Object.entries(state.metrics.modelFraming).map(
      ([key, value]) => [key, Number(value.stageVisibility) || 0],
    ));
    const activeModelKeys = Object.entries(modelVisibility)
      .filter(([, visibility]) => visibility > 0.01)
      .map(([key]) => key);
    if (checkpoint.expectedModelKey) {
      assert.ok(
        modelVisibility[checkpoint.expectedModelKey] >= 0.99,
        `${group}-${checkpoint.id} did not fully establish ${checkpoint.expectedModelKey} `
          + `(story ${state.metrics.storyWU.toFixed(4)}, visibility `
          + `${modelVisibility[checkpoint.expectedModelKey].toFixed(4)}).`,
      );
      const allowed = checkpoint.allowedModelKeys || [checkpoint.expectedModelKey];
      assert.ok(activeModelKeys.every((key) => allowed.includes(key)),
        `${group}-${checkpoint.id} leaked an unrelated chapter: ${activeModelKeys.join(', ')}; `
          + `allowed ${allowed.join(', ')}.`);
    }
    if (checkpoint.expectsPassage) {
      assert.deepEqual(state.visibleEditorialFields, [],
        `${group}-${checkpoint.id} traverses behind editorial copy: ${JSON.stringify(state.visibleEditorialFields)}`);
      assert.deepEqual(state.visibleTitles, [],
        `${group}-${checkpoint.id} places a title inside the dedicated camera passage.`);
    }
    if (checkpoint.expectsReading) {
      assert.equal(state.copyProtection.mode, 'visible-editorial-lines');
      assert.ok(state.copyProtection.editorialClip && state.copyProtection.readableLineCount > 0,
        `${group}-${checkpoint.id} has no fully readable line inside the editorial window: `
          + JSON.stringify(state.copyProtection));
    }
    if (checkpoint.expectsEditorial) {
      assert.ok(state.visibleEditorialFields.some((field) => field.fieldId === checkpoint.fieldId),
        `${group}-${checkpoint.id} has no visible editorial content in its measured reading window.`);
    }
    if (checkpoint.expectsProtectedCenter) {
      if (['shaping', 'thinking', 'terminal-hold'].includes(checkpoint.id)) {
        assert.ok(
          state.protectedNdcBounds
            && state.protectedNdcBounds.minX >= -1
            && state.protectedNdcBounds.maxX <= 1
            && state.protectedNdcBounds.minY >= -1
            && state.protectedNdcBounds.maxY <= 1,
          `${group}-${checkpoint.id} moved protected copy outside the visible window.`,
        );
      }
      // At an exact entry cue the title is intentionally still transparent.
      // Keep testing the full scene here; only painted copy needs clearance.
      // Focus and terminal checks must always contain visible, measured copy.
      const unrevealedEntry = ['lattice-title-entry', 'invitation'].includes(checkpoint.id)
        && state.copyProtection.titleMeasured
        && !state.copyProtection.lockupVisible;
      assert.ok(state.copyProtection.regions.length > 0 || unrevealedEntry,
        `${group}-${checkpoint.id} has no measured protected copy.`);
      if (state.copyProtection.maximumProtectedVisibleCount > maximumProtectedCenterSurfels) {
        const failurePath = `${ABOUT_SURFEL_OUTPUT_DIR}/${browserArtifactPrefix}${group}-${checkpoint.id}-copy-failure.png`;
        await page.screenshot({ path: failurePath });
        await writeFile(failurePath.replace(/\.png$/u, '.json'), `${JSON.stringify(state, null, 2)}\n`);
        console.error(`Protected-copy failure frame: ${failurePath}; ${JSON.stringify(state.copyProtection)}`);
      }
      assert.ok(
        state.copyProtection.maximumProtectedVisibleCount <= maximumProtectedCenterSurfels,
        `${group}-${checkpoint.id} placed surfels inside a visible copy line or protected title/action lockup.`,
      );
    }
    if (checkpoint.expectsFramedModel) {
      const framing = state.metrics.modelFraming[checkpoint.expectedModelKey];
      const minimumFramedSurfels = Math.max(requestedMinimumFramedSurfels || 0,
        profile === 'mobile' ? 10 : 24);
      assert.ok(
        framing?.framedVisibleCount >= minimumFramedSurfels,
        `${group}-${checkpoint.id} left ${checkpoint.expectedModelKey} outside the camera frame `
          + `(${framing?.framedVisibleCount || 0} framed surfels; expected at least `
          + `${minimumFramedSurfels}).`,
      );
    }
    if (checkpoint.footprint) {
      const framing = state.metrics.modelFraming[checkpoint.expectedModelKey];
      try {
        assertAboutSurfelFootprint(framing, checkpoint.footprint, `${group}-${checkpoint.id}`);
      } catch (error) {
        const failurePath = `${ABOUT_SURFEL_OUTPUT_DIR}/${browserArtifactPrefix}${group}-${checkpoint.id}-footprint-failure`;
        await page.screenshot({ path: `${failurePath}.png` });
        await writeFile(`${failurePath}.json`, `${JSON.stringify(state, null, 2)}\n`);
        throw error;
      }
    }
    if (checkpoint.expectsFinale) {
      assert(absoluteWrappedRoll(state.metrics.cameraRollDegrees) < 0.05, `${group} finale camera is not level.`);
      assert.equal(state.metrics.controls.fogStartWU, 220);
      assert.equal(state.metrics.controls.fogEndWU, 560);
      assert(Math.abs(state.metrics.cameraPosition[0]) < 0.01);
      assert(state.metrics.cameraPosition[1] > 7 && state.metrics.cameraPosition[1] < 9.5);
      assert(state.metrics.cameraPosition[2] < -1_000);
    }
    if (reducedMotion) assert.equal(state.metrics.controls.motionAmountWU, 0);

    const finalePresentation = checkpoint.fieldId === 'text-epilogue-invitation'
      ? await readFinalePresentation(page)
      : null;
    if (reducedMotion && checkpoint.id === 'lattice-clear') {
      assert.ok(
        Object.values(finalePresentation).every((value) => value <= 0.01),
        `${group}-${checkpoint.id} revealed before the invitation: ${JSON.stringify(finalePresentation)}`,
      );
    } else if (reducedMotion && checkpoint.fieldId === 'text-epilogue-invitation') {
      assert.ok(
        Object.values(finalePresentation).every((value) => value >= 0.99),
        `${group}-${checkpoint.id} did not reveal atomically: ${JSON.stringify(finalePresentation)}`,
      );
    } else if (checkpoint.id === 'invitation') {
      assert.ok(finalePresentation.titlePhase <= 0.01);
      assert.ok(finalePresentation.renderedTitleOpacity <= 0.01);
    } else if (checkpoint.id === 'invitation-focus') {
      assert.ok(finalePresentation.titlePhase >= 0.99);
      assert.ok(finalePresentation.renderedTitleOpacity >= 0.99);
    } else if (checkpoint.id === 'terminal-hold') {
      assert.ok(Object.values(finalePresentation).every((value) => value >= 0.99));
    }

    // Positive-footprint results always keep a rendered frame for qualitative
    // review. Occupancy can reject empty/thin scenery, not prove composition.
    const captureScreenshot = Boolean(checkpoint.footprint)
      || requestedScreenshotCheckpointIds === null
      || requestedScreenshotCheckpointIds.has(checkpoint.id);
    const path = captureScreenshot
      ? `${ABOUT_SURFEL_OUTPUT_DIR}/${browserArtifactPrefix}${group}-${checkpoint.id}.png`
      : null;
    const worldScreenshot = capturePointWorldPixels
      && captureScreenshot
      && checkpoint.fieldId === 'text-epilogue-invitation'
      ? `${ABOUT_SURFEL_OUTPUT_DIR}/${browserArtifactPrefix}${group}-${checkpoint.id}-point-world.png`
      : null;
    if (captureScreenshot) {
      await setRuntimeRendering(page, false);
      try {
        await page.screenshot({ path, fullPage: false });
        const image = await sharp(path).stats();
        assert(image.channels.some((channel) => channel.stdev > 8), `${group}-${checkpoint.id} capture is visually empty.`);
        screenshotPaths.push({ id: checkpoint.id, path });
        if (worldScreenshot) {
          await capturePointWorldScreenshot(page, worldScreenshot);
        }
      } finally {
        await setRuntimeRendering(page, true);
      }
    }
    const checkpointResult = {
      id: `${group}-${checkpoint.id}`,
      group,
      profile,
      reducedMotion,
      fieldId: checkpoint.fieldId,
      phase: checkpoint.phase,
      anchorId: checkpoint.anchorId || null,
      untilAnchorId: checkpoint.untilAnchorId || null,
      passageFraction: checkpoint.passageFraction ?? null,
      fieldFraction: checkpoint.fieldFraction ?? null,
      contentSelector: checkpoint.contentSelector || null,
      expectedModelKey: checkpoint.expectedModelKey,
      allowedModelKeys: checkpoint.allowedModelKeys || [checkpoint.expectedModelKey],
      footprint: checkpoint.footprint || null,
      requestedStoryWU: Number.isFinite(requestedStoryWU) ? requestedStoryWU : 'end',
      renderedStoryWU: state.storyWU,
      screenshot: path,
      worldScreenshot,
      finalePresentation,
      protectedNdcBounds: state.protectedNdcBounds,
      copyProtection: state.copyProtection,
      visibleTitles: state.visibleTitles,
      visibleEditorialFields: state.visibleEditorialFields,
      adjacentTitleOverlaps: state.adjacentTitleOverlaps,
      metrics: state.metrics,
      dataset: state.dataset,
    };
    results.push(checkpointResult);
    groupResults.push(checkpointResult);
  }
  const invitationResults = groupResults.filter((entry) => (
    entry.fieldId === 'text-epilogue-invitation'
  ));
  for (let index = 1; index < invitationResults.length; index += 1) {
    const previous = invitationResults[index - 1];
    const current = invitationResults[index];
    assertVectorStable(previous.metrics.cameraPosition, current.metrics.cameraPosition, `${group} finale camera`);
    assertVectorStable(previous.metrics.steadycam.position, current.metrics.steadycam.position, `${group} finale steadycam`);
    if (previous.worldScreenshot && current.worldScreenshot) {
      current.pointWorldPixelDeltaFromPrevious = await compareScreenshots(
        previous.worldScreenshot,
        current.worldScreenshot,
      );
      assert.ok(
        current.pointWorldPixelDeltaFromPrevious.changedChannelRatio <= 0.001,
        `${group} isolated point world changed by ${(current.pointWorldPixelDeltaFromPrevious.changedChannelRatio * 100).toFixed(3)}%.`,
      );
      assert.ok(current.pointWorldPixelDeltaFromPrevious.meanChannelDifference <= 0.1);
    }
  }
  await closeAuditPage();
  assert.deepEqual(allConsoleErrors, []);
  return { group, screenshotPaths };
}

async function captureGroup(options) {
  const browser = await launchAboutAuditBrowser(browserName);
  try {
    return await captureGroupInBrowser(browser, options);
  } finally {
    await browser.close();
  }
}

async function createContactSheet(group, screenshots) {
  const mobileLike = group !== 'desktop';
  const width = mobileLike ? 220 : 360;
  const height = mobileLike ? 475 : 250;
  const labelHeight = 34;
  const columns = mobileLike ? 5 : 4;
  const tileHeight = height + labelHeight;
  const rows = Math.ceil(screenshots.length / columns);
  const tiles = [];
  for (const [index, screenshot] of screenshots.entries()) {
    const left = (index % columns) * width;
    const top = Math.floor(index / columns) * tileHeight;
    const image = await sharp(screenshot.path)
      .resize({ width, height, fit: 'contain', background: '#eceae5' })
      .png()
      .toBuffer();
    tiles.push({ input: image, left, top: top + labelHeight });
    const label = Buffer.from(
      `<svg width="${width}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">`
      + '<rect width="100%" height="100%" fill="#111"/>'
      + `<text x="12" y="23" fill="#fff" font-family="Arial, sans-serif" font-size="14">${group} · ${screenshot.id}</text>`
      + '</svg>',
    );
    tiles.push({ input: label, left, top });
  }
  const output = `${ABOUT_SURFEL_OUTPUT_DIR}/contact-sheet-${browserArtifactPrefix}${group}.png`;
  await sharp({
    create: {
      width: width * Math.min(columns, screenshots.length),
      height: tileHeight * rows,
      channels: 4,
      background: '#eceae5',
    },
  }).composite(tiles).png().toFile(output);
  return output;
}

const groupRequests = [
  { id: 'desktop', options: { profile: 'desktop' } },
  { id: 'mobile', options: { profile: 'mobile' } },
  { id: 'reduced-motion', options: { profile: 'mobile', reducedMotion: true } },
].filter((entry) => requestedGroups.has(entry.id));
assert.ok(groupRequests.length > 0, 'Select at least one visual audit group.');
const groups = [];
for (const groupRequest of groupRequests) {
  groups.push(await captureGroup(groupRequest.options));
}
const contactSheets = {};
for (const group of groups) {
  contactSheets[group.group] = group.screenshotPaths.length > 0
    ? await createContactSheet(group.group, group.screenshotPaths)
    : null;
}
const capturedGroups = groupRequests.map((entry) => entry.id);
const hasCompleteGroupMatrix = ['desktop', 'mobile', 'reduced-motion'].every((group) => (
  capturedGroups.includes(group)
)) && requestedCheckpointIds.size === 0;
const checkpointSelectionSuffix = requestedCheckpointIds.size > 0
  ? `-selected-${[...requestedCheckpointIds].sort().join('_')}`
  : '';
const report = `${JSON.stringify({
  baseUrl,
  browserName,
  candidateAssetDirectory,
  capturePointWorldPixels,
  screenshotCheckpointIds: requestedScreenshotCheckpointIds === null
    ? 'all'
    : [...requestedScreenshotCheckpointIds],
  adapterId: 'blender-surfel-v2',
  acceptance: {
    mode: 'positive-chapter-and-visible-copy-checkpoints',
    occupancyGrid: { columns: 12, rows: 12, minimumPointsPerOccupiedBin: 3 },
    footprintMinimums: ABOUT_SURFEL_FOOTPRINTS,
    protectedCopyPolicy: 'zero projected surfel centers in visible lines; title and finale margins retained',
    screenshotPolicy: 'positive-footprint checkpoints always captured',
    continuousScrollEvidenceRequired: true,
    humanCompositionReviewRequired: true,
    limitation: 'Projected centers and occupied bins do not prove silhouette, depth, glyph clearance, or continuous traversal quality.',
  },
  groups: capturedGroups,
  checkpoints: results,
  contactSheets,
  recordedAt: new Date().toISOString(),
}, null, 2)}\n`;
const reportPaths = [
  `${ABOUT_SURFEL_OUTPUT_DIR}/visual-checkpoints-${browserArtifactPrefix}${capturedGroups.join('-')}${checkpointSelectionSuffix}.json`,
];
if (hasCompleteGroupMatrix) {
  reportPaths.push(
    `${ABOUT_SURFEL_OUTPUT_DIR}/visual-checkpoints${browserName === 'chromium' ? '' : `-${browserName}`}.json`,
  );
}
await Promise.all(reportPaths.map((path) => writeFile(path, report)));
console.log(
  `PASS: ${results.length} automated chapter/copy checkpoints in ${browserName} across ${capturedGroups.join(', ')}. `
    + 'Review the rendered frames and continuous scroll before visual approval.',
);
