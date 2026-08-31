import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { collectPageErrors, launchAboutAuditBrowser } from './audit-about-narrative-surfel-v2-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER || 'chromium';
const outputDir = resolve(process.env.ABS_SCROLL_COUPLING_OUTPUT
  || `output/playwright/about-scroll-viewport-20260831/${browserName}`);
const track = JSON.parse(await readFile('react-app/app/public/models/about-v2-edited-world/camera-track.json', 'utf8'));
const profiles = [
  { id: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'mobile', viewport: { width: 390, height: 844 }, hasTouch: true },
  { id: 'narrow', viewport: { width: 320, height: 740 }, hasTouch: true },
  { id: 'short', viewport: { width: 390, height: 600 }, hasTouch: true },
  { id: 'reduced', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
].filter((profile) => !process.env.ABS_SCROLL_COUPLING_PROFILES
  || process.env.ABS_SCROLL_COUPLING_PROFILES.split(',').includes(profile.id));

// Independent reference: walk the exported XYZ polyline, rather than trusting
// the runtime's new distance metric or its section-progress implementation.
const distances = [0];
for (let index = 1; index < track.samples.length; index += 1) {
  distances.push(distances[index - 1] + Math.hypot(...track.samples[index].slice(0, 3)
    .map((value, axis) => value - track.samples[index - 1][axis])));
}
const lock = track.journeyCues.find((cue) => cue.name === 'ABS_CAMERA_LOCK').progress;
const lockCursor = lock * (track.samples.length - 1);
const lockIndex = Math.floor(lockCursor);
const pathLength = distances[lockIndex]
  + (distances[lockIndex + 1] - distances[lockIndex]) * (lockCursor - lockIndex);
function positionAtDistance(distance) {
  if (distance <= 0) return track.samples[0].slice(0, 3);
  let index = 1;
  while (index < distances.length - 1 && distances[index] < distance) index += 1;
  const length = distances[index] - distances[index - 1];
  const mix = length > 0 ? (distance - distances[index - 1]) / length : 0;
  return track.samples[index - 1].slice(0, 3)
    .map((value, axis) => value + (track.samples[index][axis] - value) * mix);
}

await mkdir(outputDir, { recursive: true });
const browser = await launchAboutAuditBrowser(browserName);
const report = { browser: browserName, baseUrl, pathLengthWU: pathLength, profiles: [] };
try {
  for (const { id, ...options } of profiles) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const errors = collectPageErrors(page);
    await page.goto(`${baseUrl}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__aboutNarrativeRuntime?.getMetrics()?.state === 'ready'
      && document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete',
    null, { timeout: 60_000 });
    const samples = await page.evaluate(async () => {
      const port = document.querySelector('.about-narrative-scrollport');
      const frame = () => new Promise(requestAnimationFrame);
      const capture = () => {
        const m = window.__aboutNarrativeRuntime.getMetrics();
        return { scrollTop: port.scrollTop, maximum: port.scrollHeight - port.clientHeight,
          storyWU: m.storyWU, position: m.cameraPosition, steadycam: m.steadycam.responseMs,
          pan: m.pointerPan, cameraLocked: m.cameraLocked, gpuBufferBuilds: m.gpuBufferBuilds };
      };
      const result = [];
      for (const direction of [1, -1]) {
        for (let index = 0; index <= 80; index += 1) {
          const fraction = direction === 1 ? index / 80 : 1 - index / 80;
          port.scrollTop = fraction * (port.scrollHeight - port.clientHeight);
          await frame(); await frame();
          result.push({ direction, ...capture() });
        }
      }
      return result;
    });
    let maximumPositionErrorWU = 0;
    if (options.reducedMotion !== 'reduce') {
      for (const sample of samples) {
        const expected = positionAtDistance(sample.scrollTop / sample.maximum * pathLength);
        const error = Math.hypot(...expected.map((value, axis) => value - sample.position[axis]));
        maximumPositionErrorWU = Math.max(maximumPositionErrorWU, error);
        assert.ok(error < 0.0001, `${id}: camera lag/retiming of ${error} WU at ${sample.scrollTop}px.`);
        assert.equal(sample.steadycam, 0);
        assert.equal(sample.gpuBufferBuilds, 1);
      }
    } else {
      const poses = new Set(samples.filter((sample) => sample.direction === 1)
        .map((sample) => sample.position.join(',')));
      assert.ok(poses.size <= 18, 'Reduced motion still uses continuous flight.');
    }
    const wheelSamples = [];
    if (options.reducedMotion !== 'reduce') {
      await page.evaluate(() => {
        const port = document.querySelector('.about-narrative-scrollport');
        port.scrollTop = (port.scrollHeight - port.clientHeight) * 0.45;
      });
      await page.mouse.move(options.viewport.width / 2, options.viewport.height / 2);
      for (const delta of [42, 140, 280, 420, -70, -210]) {
        const beforeTop = await page.locator('.about-narrative-scrollport').evaluate((port) => port.scrollTop);
        await page.mouse.wheel(0, delta);
        await page.waitForTimeout(160);
        const sample = await page.evaluate(() => {
          const port = document.querySelector('.about-narrative-scrollport');
          return { scrollTop: port.scrollTop, maximum: port.scrollHeight - port.clientHeight,
            position: window.__aboutNarrativeRuntime.getMetrics().cameraPosition };
        });
        assert.ok((sample.scrollTop - beforeTop) * Math.sign(delta) > Math.abs(delta) * 0.5,
          `${id}: native wheel input did not move the page in the requested direction.`);
        const expected = positionAtDistance(sample.scrollTop / sample.maximum * pathLength);
        const error = Math.hypot(...expected.map((value, axis) => value - sample.position[axis]));
        assert.ok(error < 0.0001, `${id}: native wheel movement diverged by ${error} WU.`);
        wheelSamples.push({ delta, ...sample, errorWU: error });
      }
    }
    // A stopped native scroll must not cause another camera settle or mouse drift.
    const stopped = await page.evaluate(async () => {
      const port = document.querySelector('.about-narrative-scrollport');
      port.scrollTop = (port.scrollHeight - port.clientHeight) * 0.57;
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      return window.__aboutNarrativeRuntime.getMetrics().cameraPosition;
    });
    await page.mouse.move(options.viewport.width - 30, options.viewport.height - 30);
    await page.waitForTimeout(600);
    assert.deepEqual(await page.evaluate(() => window.__aboutNarrativeRuntime.getMetrics().cameraPosition), stopped,
      `${id}: camera continues after scrolling stops.`);

    const reading = [];
    for (const fieldId of ['text-background-unit', 'text-discipline-labels', 'text-life-character']) {
      for (const fraction of [0.8, 0.5, 0.2]) {
        await page.evaluate(({ fieldId, fraction }) => {
          const port = document.querySelector('.about-narrative-scrollport');
          const field = document.querySelector(`[data-text-field-id="${fieldId}"]`);
          const line = field.querySelector('[data-editorial-visual-line], [data-editorial-reveal]') || field;
          const rect = line.getBoundingClientRect();
          port.scrollTop += (rect.top + rect.bottom) / 2 - port.getBoundingClientRect().top
            - port.clientHeight * fraction;
        }, { fieldId, fraction });
        await page.waitForTimeout(120);
        const bounds = await page.locator(`[data-text-field-id="${fieldId}"]`).evaluate((field) => {
          const port = document.querySelector('.about-narrative-scrollport');
          const line = field.querySelector('[data-editorial-visual-line], [data-editorial-reveal]') || field;
          const style = getComputedStyle(field);
          const rect = line.getBoundingClientRect();
          const fieldRect = field.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, viewport: port.getBoundingClientRect().toJSON(),
            localTop: rect.top - fieldRect.top, localBottom: rect.bottom - fieldRect.top,
            clipStart: parseFloat(style.getPropertyValue('--reading-stage-start')),
            clipEnd: parseFloat(style.getPropertyValue('--reading-stage-end')),
            feather: parseFloat(style.getPropertyValue('--reading-stage-feather')),
            opacity: getComputedStyle(line.closest('[data-editorial-reveal]') || line).opacity };
        });
        const screenshot = `${id}-${fieldId}-${fraction}.png`;
        await page.screenshot({ path: resolve(outputDir, screenshot) });
        assert.ok(bounds.localTop > bounds.clipStart + bounds.feather - 1,
          `${id}/${fieldId}: the line is clipped at the top.`);
        assert.ok(bounds.localBottom < bounds.clipEnd - bounds.feather + 1,
          `${id}/${fieldId}: the line is hidden in the lower viewport.`);
        assert.equal(bounds.opacity, '1');
        reading.push({ fieldId, fraction, bounds, screenshot });
      }
    }
    const titles = [];
    for (const fieldId of ['text-complexity-curiosity', 'text-life-momentum', 'text-epilogue-thinking']) {
      await page.evaluate((fieldId) => {
        const port = document.querySelector('.about-narrative-scrollport');
        const spans = document.querySelectorAll('[data-render-span-id]');
        const field = document.querySelector(`[data-text-field-id="${fieldId}"]`);
        const storyWU = Number(field.closest('[data-render-span-id]').dataset.storyFocusWu);
        const duration = Number(spans[spans.length - 1].dataset.storyEndWu);
        port.scrollTop = storyWU / duration * (port.scrollHeight - port.clientHeight);
      }, fieldId);
      await page.waitForTimeout(250);
      const state = await page.locator(`[data-text-field-id="${fieldId}"]`).evaluate((field) => {
        const port = document.querySelector('.about-narrative-scrollport');
        const rect = field.getBoundingClientRect();
        return { center: (rect.top + rect.bottom) / 2 - port.getBoundingClientRect().top,
          expected: parseFloat(field.dataset.titleViewportY) / 100 * port.clientHeight };
      });
      assert.ok(Math.abs(state.center - state.expected) < 1,
        `${id}/${fieldId}: an extra offset still pushes the title away from its authored anchor.`);
      const screenshot = `${id}-${fieldId}-center.png`;
      await page.screenshot({ path: resolve(outputDir, screenshot) });
      titles.push({ fieldId, ...state, screenshot });
    }
    const lifecycle = [];
    if (id === 'desktop') {
      const readLifecycle = () => page.evaluate(() => {
        const port = document.querySelector('.about-narrative-scrollport');
        const root = document.querySelector('.about-narrative-lab');
        const metrics = window.__aboutNarrativeRuntime.getMetrics();
        return { scrollTop: port.scrollTop, maximum: port.scrollHeight - port.clientHeight,
          storyWU: metrics.storyWU, position: metrics.cameraPosition,
          motionProfile: root.dataset.aboutMotionProfile, motionAmountWU: metrics.controls.motionAmountWU,
          gpuBufferBuilds: metrics.gpuBufferBuilds };
      });
      const assertCoupled = (sample, label) => {
        const expected = positionAtDistance(sample.scrollTop / sample.maximum * pathLength);
        const error = Math.hypot(...expected.map((value, axis) => value - sample.position[axis]));
        assert.ok(error < 0.0001, `${label}: camera diverged from native scroll by ${error} WU.`);
        assert.equal(sample.gpuBufferBuilds, 1, `${label}: rebuilt camera-independent geometry.`);
      };
      await page.evaluate(() => {
        const port = document.querySelector('.about-narrative-scrollport');
        port.scrollTop = (port.scrollHeight - port.clientHeight) * 0.43;
      });
      await page.waitForTimeout(150);
      let previous = await readLifecycle();
      for (const viewport of [{ width: 390, height: 844 }, { width: 390, height: 600 }, options.viewport]) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(700);
        const current = await readLifecycle();
        assert.ok(Math.abs(current.storyWU - previous.storyWU) < 0.05,
          `Resize lost the reading position: ${previous.storyWU} to ${current.storyWU} WU.`);
        assertCoupled(current, 'Resize');
        lifecycle.push({ type: 'resize', viewport, before: previous, after: current });
        previous = current;
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.aboutMotionProfile === 'reduced');
      await page.waitForTimeout(150);
      const reduced = await readLifecycle();
      assert.equal(reduced.motionAmountWU, 0, 'Live reduced motion left ambient movement enabled.');
      assert.ok(Math.abs(reduced.storyWU - previous.storyWU) < 0.05);
      const reducedPoses = await page.evaluate(async () => {
        const port = document.querySelector('.about-narrative-scrollport');
        const poses = [];
        for (let index = 0; index <= 80; index += 1) {
          port.scrollTop = index / 80 * (port.scrollHeight - port.clientHeight);
          await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
          poses.push(window.__aboutNarrativeRuntime.getMetrics().cameraPosition.join(','));
        }
        return poses;
      });
      assert.ok(new Set(reducedPoses).size <= 18, 'Live reduced motion still flies between cues.');
      await page.evaluate(() => {
        const port = document.querySelector('.about-narrative-scrollport');
        port.scrollTop = (port.scrollHeight - port.clientHeight) * 0.43;
      });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.aboutMotionProfile !== 'reduced');
      await page.waitForTimeout(150);
      const resumed = await readLifecycle();
      assertCoupled(resumed, 'Live motion preference change');
      lifecycle.push({ type: 'motion-preference', reduced, uniqueReducedPoses: new Set(reducedPoses).size, resumed });
    }
    assert.deepEqual(errors, []);
    report.profiles.push({ id, options, maximumPositionErrorWU, samples, wheelSamples, reading, titles, lifecycle, errors });
    await writeFile(resolve(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`${browserName}/${id}: ${samples.length} forward/reverse samples, max error ${maximumPositionErrorWU} WU; full-viewport reading passed.`);
    await context.close();
  }
  if (process.env.ABS_SCROLL_COUPLING_EDITOR === '1') {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = collectPageErrors(page);
    // Development-only instrumentation in this browser context. No source,
    // canonical content, or saved editor state is changed by the probe.
    for (const [module, name, wrapper] of [
      ['aboutNarrativeParameterStore', 'createAboutNarrativeParameterStore',
        'window.__auditAboutStore = original(...args); return window.__auditAboutStore;'],
      ['aboutNarrativeComposer', 'compileAboutNarrativeComposerPlan',
        'window.__auditAboutCompilations = (window.__auditAboutCompilations || 0) + 1; return original(...args);'],
    ]) {
      await page.route(`**/${module}.js*`, async (route) => {
        const response = await route.fetch();
        const source = await response.text();
        await route.fulfill({ response,
          body: `${source}\n{ const original = ${name}; ${name} = (...args) => { ${wrapper} }; }\n` });
      });
    }
    await page.goto(`${baseUrl}/about.html?preview=about&edit=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__auditAboutStore
      && window.__aboutNarrativeRuntime?.getMetrics()?.state === 'ready'
      && document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete');
    await page.evaluate(() => {
      const port = document.querySelector('.about-narrative-scrollport');
      port.scrollTop = (port.scrollHeight - port.clientHeight) * 0.43;
    });
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => window.__aboutNarrativeRuntime.getMetrics().storyWU);
    await page.evaluate(() => window.__auditAboutStore.commit('Audit rejected draft', (draft) => {
      draft.globals.pointMaterial.surfelCoverage = 1.4;
    }));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    const failed = await page.evaluate(() => ({
      valid: window.__auditAboutStore.getSnapshot().draftState.valid,
      storyWU: window.__aboutNarrativeRuntime.getMetrics().storyWU,
      compilations: window.__auditAboutCompilations,
    }));
    assert.equal(failed.valid, false, 'The probe did not create an invalid draft.');
    assert.ok(Math.abs(failed.storyWU - before) < 0.05, 'A rejected draft lost the reading position.');
    await page.waitForTimeout(600);
    const settledCompilations = await page.evaluate(() => window.__auditAboutCompilations);
    assert.equal(settledCompilations, failed.compilations, 'Rejected resize recompiles on every frame.');
    await page.evaluate(() => window.__auditAboutStore.commit('Audit draft recovery', (draft) => {
      draft.globals.pointMaterial.surfelCoverage = 0.7;
    }));
    await page.waitForTimeout(600);
    const recovered = await page.evaluate(() => {
      const port = document.querySelector('.about-narrative-scrollport');
      const m = window.__aboutNarrativeRuntime.getMetrics();
      return { valid: window.__auditAboutStore.getSnapshot().draftState.valid,
        scrollTop: port.scrollTop, maximum: port.scrollHeight - port.clientHeight,
        storyWU: m.storyWU, position: m.cameraPosition };
    });
    assert.equal(recovered.valid, true);
    const expected = positionAtDistance(recovered.scrollTop / recovered.maximum * pathLength);
    assert.ok(Math.hypot(...expected.map((value, axis) => value - recovered.position[axis])) < 0.0001);
    assert.deepEqual(errors, []);
    report.editorRecovery = { before, failed, settledCompilations, recovered, errors };
    await writeFile(resolve(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`${browserName}: rejected draft, resize, idle compilation and recovery passed.`);
    await context.close();
  }
} finally {
  await browser.close();
}
