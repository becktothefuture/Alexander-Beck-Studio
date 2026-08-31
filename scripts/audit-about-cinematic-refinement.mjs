import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  collectPageErrors, driveAboutStoryWU, launchAboutAuditBrowser,
} from './audit-about-narrative-surfel-v2-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER || 'chromium';
const outputDir = process.env.ABS_CINEMATIC_OUTPUT_DIR
  || 'output/playwright/about-cinematic-refinement-20260831/arrival';
const profiles = [
  { id: 'desktop-light', viewport: { width: 1440, height: 1000 }, colorScheme: 'light' },
  { id: 'desktop-dark', viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' },
  { id: 'mobile-light', viewport: { width: 390, height: 844 }, colorScheme: 'light', hasTouch: true },
  { id: 'mobile-dark', viewport: { width: 390, height: 844 }, colorScheme: 'dark', hasTouch: true },
  { id: 'narrow-mobile', viewport: { width: 320, height: 740 }, colorScheme: 'light', hasTouch: true },
  { id: 'short-portrait', viewport: { width: 390, height: 600 }, colorScheme: 'light', hasTouch: true },
  { id: 'reduced-motion', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
].filter((profile) => !process.env.ABS_CINEMATIC_PROFILES
  || process.env.ABS_CINEMATIC_PROFILES.split(',').includes(profile.id));

await mkdir(outputDir, { recursive: true });
const browser = await launchAboutAuditBrowser(browserName);
const results = [];
const readState = (page) => page.evaluate(() => {
  const field = document.querySelector('[data-text-field-id="text-epilogue-invitation"]');
  const actions = field.querySelector('.about-narrative-finale-actions');
  const scrollport = document.querySelector('.about-narrative-scrollport');
  const button = document.querySelector('[data-about-motion-control]');
  const metrics = window.__aboutNarrativeRuntime.getMetrics();
  return {
    arrival: field.dataset.arrivalState, elapsedMs: Number(field.dataset.arrivalElapsedMs),
    actionsVisible: field.dataset.actionsVisible === 'true', inert: actions.inert,
    focusReturned: document.activeElement === scrollport,
    scrollTop: scrollport.scrollTop, scrollMaximum: scrollport.scrollHeight - scrollport.clientHeight,
    camera: metrics.cameraPosition, cameraLocked: metrics.cameraLocked,
    ambientTime: metrics.ambientTime, motionTime: metrics.motionTime,
    motionAmountWU: metrics.controls.motionAmountWU,
    pauseLabel: button.getAttribute('aria-label'), pauseDisabled: button.disabled,
    pauseBounds: button.getBoundingClientRect().toJSON(),
    viewport: { width: innerWidth, height: innerHeight },
    actionsBounds: actions.getBoundingClientRect().toJSON(),
    lockupBounds: field.querySelector('.about-narrative-finale-content').getBoundingClientRect().toJSON(),
  };
});

try {
  for (const { id, ...options } of profiles) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const errors = collectPageErrors(page);
    console.log(`Checking ${browserName} ${id}: partial arrival, reverse focus, pause.`);
    await page.goto(`${baseUrl}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const metrics = window.__aboutNarrativeRuntime?.getMetrics();
      return metrics?.state === 'ready' && metrics.bundleIntegrityVerified
        && document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete';
    }, null, { timeout: 60_000 });
    const invitation = await page.locator('[data-render-span-id]').evaluateAll((nodes) => {
      const node = nodes.find((item) => item.querySelector('[data-text-field-id="text-epilogue-invitation"]'));
      return { start: Number(node.dataset.storyStartWu), end: Number(node.dataset.storyEndWu) };
    });
    assert.ok(invitation.end > invitation.start);
    const arrivals = [];
    for (const fraction of [0.1, 0.25, 0.5]) {
      await driveAboutStoryWU(page, invitation.start - 0.1);
      assert.equal((await readState(page)).inert, true);
      await driveAboutStoryWU(page, invitation.start + (invitation.end - invitation.start) * fraction);
      const stop = await readState(page);
      await page.waitForFunction(() => document.querySelector(
        '[data-text-field-id="text-epilogue-invitation"]',
      )?.dataset.arrivalState === 'complete', null, { timeout: 1200 });
      const completed = await readState(page);
      assert.equal(completed.actionsVisible, true);
      assert.equal(completed.inert, false);
      assert.equal(completed.elapsedMs, 900);
      assert.ok(Math.abs(completed.scrollTop - stop.scrollTop) < 1, 'Arrival required more scroll.');
      assert.equal(completed.cameraLocked, false, 'Partial scroll must not lock the camera early.');
      assert.deepEqual(completed.camera, stop.camera);
      arrivals.push({ fraction, stop, completed });
    }
    const action = page.locator('.about-narrative-finale-actions button').first();
    await action.focus();
    await driveAboutStoryWU(page, invitation.start - 0.1);
    const reversed = await readState(page);
    assert.equal(reversed.inert, true);
    assert.equal(reversed.focusReturned, true, 'Reverse left focus on a hidden action.');
    await driveAboutStoryWU(page, Number.POSITIVE_INFINITY);
    const end = await readState(page);
    assert.equal(end.arrival, 'complete');
    assert.equal(end.actionsVisible, true);
    assert.equal(end.cameraLocked, true, 'The camera stops at the native page end.');
    assert.ok(end.pauseBounds.width >= 44 && end.pauseBounds.height >= 44);
    assert.ok(end.pauseBounds.left >= 0 && end.pauseBounds.right <= options.viewport.width);
    assert.ok(end.actionsBounds.left >= 0 && end.actionsBounds.right <= options.viewport.width);
    assert.ok(end.actionsBounds.bottom <= options.viewport.height);
    assert.ok(end.lockupBounds.top >= 0 && end.lockupBounds.bottom <= options.viewport.height,
      'The complete contact group leaves the viewport.');
    let paused = null;
    let resumed = null;
    if (options.reducedMotion === 'reduce') {
      assert.equal(end.pauseDisabled, true);
      assert.equal(end.motionAmountWU, 0);
    } else {
      await page.locator('[data-about-motion-control]').click();
      paused = await readState(page);
      await page.waitForTimeout(450);
      const held = await readState(page);
      assert.equal(held.ambientTime, paused.ambientTime);
      assert.equal(held.motionTime, paused.motionTime);
      assert.deepEqual(held.camera, paused.camera);
      await page.locator('[data-about-motion-control]').click();
      await page.waitForTimeout(250);
      resumed = await readState(page);
      assert.ok(resumed.ambientTime > held.ambientTime);
      assert.deepEqual(resumed.camera, held.camera);
    }
    await page.screenshot({ path: `${outputDir}/${browserName}-${id}-contact.png`, caret: 'hide' });
    assert.deepEqual(errors, []);
    results.push({ id, options, arrivals, reversed, end, paused, resumed, errors });
    await context.close();
    await writeFile(`${outputDir}/${browserName}.json`, `${JSON.stringify(results, null, 2)}\n`);
  }
} finally {
  await browser.close();
}
console.log(`Passed ${results.length} ${browserName} profiles.`);
