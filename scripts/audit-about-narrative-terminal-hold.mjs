import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import {
  collectPageErrors,
  driveAboutStoryWU,
  getAboutSurfelState,
  launchAboutAuditBrowser,
  waitForAboutSurfelRuntime,
} from './audit-about-narrative-surfel-v2-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const requireCertifiableCues = process.env.ABS_ALLOW_LEGACY_ABOUT_CUES !== '1';
const capturePixels = process.env.ABS_ABOUT_TERMINAL_CAPTURE !== '0';
const outputDir = process.env.ABS_ABOUT_TERMINAL_OUTPUT_DIR || 'output/playwright/about-narrative-terminal-hold';
const recordVideo = process.env.ABS_ABOUT_TERMINAL_VIDEO === '1';
const allProfiles = Object.freeze([
  Object.freeze({ id: 'desktop', viewport: { width: 1440, height: 1000 } }),
  Object.freeze({ id: 'mobile-touch', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }),
  Object.freeze({ id: 'reduced-motion', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }),
]);
const requestedProfiles = new Set(
  String(process.env.ABS_ABOUT_TERMINAL_PROFILES || allProfiles.map((profile) => profile.id).join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const profiles = allProfiles.filter((profile) => requestedProfiles.has(profile.id));
assert.ok(profiles.length > 0, 'Select at least one valid terminal-hold profile.');

const closeTo = (left, right, epsilon = 0.000001) => (
  Math.abs(Number(left) - Number(right)) <= epsilon
);

function assertVectorStable(before, after, label) {
  assert.equal(before.length, after.length, `${label} vector size changed.`);
  before.forEach((value, index) => {
    assert.ok(closeTo(value, after[index]), `${label}[${index}] moved from ${value} to ${after[index]}.`);
  });
}

function assertTerminalWorld(metrics, profileId) {
  assert.equal(metrics.bundleIntegrityVerified, true);
  assert.equal(metrics.sceneContractStatus, 'compatible');
  assert.equal(metrics.journeyMapCertifiable, true);
  for (const [key, model] of Object.entries(metrics.modelFraming)) {
    if (key === 'about.05') {
      assert.ok(model.stageVisibility > 0.99 && model.framedVisibleCount >= 400,
        `${profileId} lost the full lattice destination.`);
      assert.ok(model.leftOccupiedColumnCount >= 2 && model.rightOccupiedColumnCount >= 2
        && model.occupiedRowCount >= 5,
      `${profileId} reduced the final banks to thin edge fragments.`);
    } else {
      assert.equal(model.stageVisibility, 0, `${profileId} retained competing ${key} geometry.`);
    }
  }
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

async function readTerminalState(page) {
  const runtime = await getAboutSurfelState(page, { fieldId: 'text-epilogue-invitation', marginPx: 8 });
  const interfaceState = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const finale = document.querySelector('[data-text-field-id="text-epilogue-invitation"]');
    const actions = finale?.querySelector('.about-narrative-finale-actions');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    return {
      cameraLocked: root?.dataset.aboutCameraLocked === 'true',
      journeyCertifiable: root?.dataset.aboutJourneyCertifiable === 'true',
      actionsVisible: finale?.dataset.actionsVisible === 'true',
      actionsHidden: actions?.getAttribute('aria-hidden'),
      actionsInert: Boolean(actions?.inert),
      copyBounds: Array.from(finale?.querySelectorAll(
        '.about-narrative-spatial-title, .about-narrative-finale-description, .about-narrative-finale-actions',
      ) || []).map((node) => {
        const bounds = node.getBoundingClientRect();
        return [bounds.x, bounds.y, bounds.width, bounds.height];
      }),
      scrollTop: scrollport?.scrollTop || 0,
      scrollMaximum: Math.max(0, (scrollport?.scrollHeight || 0) - (scrollport?.clientHeight || 0)),
    };
  });
  return { ...runtime, interfaceState };
}

async function exerciseTerminalInputs(page, { touch = false } = {}) {
  await page.locator('.about-narrative-scrollport').focus();
  if (!touch) {
    for (let index = 0; index < 12; index += 1) await page.mouse.wheel(0, 180);
  }
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('PageDown');
  await page.keyboard.press('End');
  await page.locator('.about-narrative-scrollport').evaluate((node, shouldTouch) => {
    for (let index = 0; index < 120; index += 1) {
      node.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: 16,
      }));
    }
    if (!shouldTouch) return;
    const dispatchTouch = (type, clientY) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'touches', {
        value: type === 'touchend' ? [] : [{ clientY }],
      });
      node.dispatchEvent(event);
    };
    dispatchTouch('touchstart', 620);
    dispatchTouch('touchmove', 280);
    dispatchTouch('touchend', 280);
  }, touch);
  await page.waitForTimeout(300);
}

await mkdir(outputDir, { recursive: true });
const browser = await launchAboutAuditBrowser(browserName);
const evidence = [];

try {
  for (const profile of profiles) {
    console.log(`Checking ${browserName} ${profile.id} terminal hold.`);
    const context = await browser.newContext({
      viewport: profile.viewport,
      hasTouch: profile.hasTouch,
      isMobile: profile.isMobile,
      reducedMotion: profile.reducedMotion,
      ...(recordVideo ? { recordVideo: { dir: outputDir, size: profile.viewport } } : {}),
    });
    const page = await context.newPage();
    const video = page.video();
    const errors = collectPageErrors(page);
    await page.goto(`${baseUrl}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
    await waitForAboutSurfelRuntime(page, profile.id === 'mobile-touch' ? 'mobile' : 'desktop');
    await page.waitForFunction(() => (
      document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete'
    )).catch(async (error) => {
      console.error('Unsettled route entrance:', profile.id, await page.evaluate(() => ({
        root: { ...document.querySelector('.about-narrative-lab')?.dataset },
        controls: window.__aboutNarrativeRuntime?.getMetrics()?.controls,
        visibility: document.visibilityState,
      })));
      throw error;
    });
    await driveAboutStoryWU(page, Number.POSITIVE_INFINITY);
    await page.waitForFunction(() => (
      document.querySelector('.about-narrative-lab')?.dataset.aboutCameraLocked === 'true'
      && document.querySelector('[data-text-field-id="text-epilogue-invitation"]')?.dataset.actionsVisible === 'true'
    ));

    const before = await readTerminalState(page);
    assert.equal(before.interfaceState.cameraLocked, true);
    assert.equal(before.interfaceState.actionsVisible, true);
    assert.equal(before.interfaceState.actionsHidden, 'false');
    assert.equal(before.interfaceState.actionsInert, false);
    assert.ok(closeTo(before.interfaceState.scrollTop, before.interfaceState.scrollMaximum, 1));
    const reduced = profile.reducedMotion === 'reduce';
    if (reduced) assert.equal(before.metrics.controls.motionAmountWU, 0);
    else assert.ok(before.metrics.controls.motionAmountWU > 0, 'The camera lock froze the final material.');
    assert.ok(before.interfaceState.copyBounds.length >= 3, 'The final lockup must be measurable.');
    assertTerminalWorld(before.metrics, profile.id);
    if (requireCertifiableCues) assert.equal(before.interfaceState.journeyCertifiable, true);

    const beforePath = `${outputDir}/${browserName}-${profile.id}-before.png`;
    const afterPath = `${outputDir}/${browserName}-${profile.id}-after.png`;
    if (capturePixels) {
      await page.screenshot({
        path: beforePath,
        animations: 'disabled',
        caret: 'hide',
        timeout: 60_000,
      });
    }
    const idleSamples = [];
    let previousIdle = before;
    let previousIdlePath = beforePath;
    // No scroll, pointer, or keyboard input: material must keep moving on its
    // own while the camera, copy, geometry population, and buffers stay fixed.
    for (let index = 0; index < 3; index += 1) {
      await page.waitForTimeout(1400);
      const idle = await readTerminalState(page);
      assertVectorStable(before.metrics.cameraPosition, idle.metrics.cameraPosition, 'idle camera');
      assert.ok(closeTo(before.metrics.journeyProgress, idle.metrics.journeyProgress));
      assert.deepEqual(idle.interfaceState.copyBounds, before.interfaceState.copyBounds);
      assert.equal(idle.metrics.residentSurfelCount, before.metrics.residentSurfelCount);
      assert.equal(idle.metrics.gpuBufferBuilds, before.metrics.gpuBufferBuilds);
      assert.equal(idle.metrics.drawCalls, 2);
      assertTerminalWorld(idle.metrics, profile.id);
      assert.equal(idle.copyProtection.maximumProtectedVisibleCount, 0, 'The final material entered the protected copy.');
      if (reduced) {
        assert.equal(idle.metrics.controls.motionAmountWU, 0);
        assert.equal(idle.metrics.motionTime, previousIdle.metrics.motionTime);
      } else {
        assert.ok(idle.metrics.motionTime > previousIdle.metrics.motionTime,
          'Final material time must advance without scroll input.');
        assert.equal(idle.metrics.controls.motionAmountWU, before.metrics.controls.motionAmountWU);
      }
      const path = `${outputDir}/${browserName}-${profile.id}-idle-${index + 1}.png`;
      let pixels = null;
      if (capturePixels) {
        await page.screenshot({ path, animations: 'disabled', caret: 'hide', timeout: 60_000 });
        pixels = await compareScreenshots(previousIdlePath, path);
        assert.ok(reduced ? pixels.changedChannelRatio <= 0.001 : pixels.changedChannelRatio > 0.001,
          `${profile.id}: idle material ${reduced ? 'moved despite Reduced Motion' : 'did not visibly move'} (${pixels.changedChannelRatio}).`);
      }
      idleSamples.push({ motionTime: idle.metrics.motionTime, pixels, screenshot: capturePixels ? path : null });
      previousIdle = idle;
      previousIdlePath = path;
    }
    await exerciseTerminalInputs(page, { touch: profile.hasTouch });
    const after = await readTerminalState(page);
    if (capturePixels) {
      await page.screenshot({
        path: afterPath,
        animations: 'disabled',
        caret: 'hide',
        timeout: 60_000,
      });
    }

    assert.ok(closeTo(before.storyWU, after.storyWU));
    assert.ok(closeTo(before.metrics.journeyProgress, after.metrics.journeyProgress));
    assert.ok(closeTo(before.metrics.cameraRollDegrees, after.metrics.cameraRollDegrees));
    assertVectorStable(before.metrics.cameraPosition, after.metrics.cameraPosition, 'cameraPosition');
    assertVectorStable(before.metrics.steadycam.position, after.metrics.steadycam.position, 'steadycam.position');
    assert.equal(after.metrics.controls.motionAmountWU, before.metrics.controls.motionAmountWU);
    assert.deepEqual(after.interfaceState.copyBounds, before.interfaceState.copyBounds);
    assertTerminalWorld(after.metrics, profile.id);
    assert.ok(closeTo(after.interfaceState.scrollTop, after.interfaceState.scrollMaximum, 1));

    const pixelStability = capturePixels
      ? await compareScreenshots(beforePath, afterPath)
      : null;
    if (pixelStability && reduced) {
      assert.ok(
        pixelStability.changedChannelRatio <= 0.001,
        `${profile.id} terminal pixels changed by ${(pixelStability.changedChannelRatio * 100).toFixed(3)}%.`,
      );
      assert.ok(pixelStability.meanChannelDifference <= 0.1);
    }

    if (profile.hasTouch) {
      await page.locator('.about-narrative-scrollport').evaluate((node) => {
        node.scrollTop = Math.max(0, node.scrollTop - node.clientHeight);
        node.dispatchEvent(new Event('scroll', { bubbles: true }));
      });
    } else {
      await page.mouse.move(profile.viewport.width / 2, profile.viewport.height / 2);
      await page.mouse.wheel(0, -900);
    }
    await page.waitForFunction((terminalStoryWU) => (
      Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu)
        < terminalStoryWU - 0.1
    ), after.storyWU);
    assert.deepEqual(errors, []);
    evidence.push({
      browserName,
      profile: profile.id,
      before,
      after,
      pixelStability,
      idleSamples,
      screenshots: capturePixels ? { before: beforePath, after: afterPath } : null,
    });
    await context.close();
    if (video) evidence.at(-1).video = await video.path();
  }

  await writeFile(
    `${outputDir}/${browserName}-report.json`,
    `${JSON.stringify({ baseUrl, browserChannel: process.env.ABS_CHROMIUM_CHANNEL || null, requireCertifiableCues, capturePixels, evidence }, null, 2)}\n`,
  );
  console.log(`PASS: ${browserName} ${profiles.map((profile) => profile.id).join(', ')}: fixed final camera/copy and preference-correct idle material motion.`);
} finally {
  await browser.close();
}
