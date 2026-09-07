import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import {
  collectPageErrors, driveAboutStoryWU, getAboutSurfelJourneyMap,
  launchAboutAuditBrowser, waitForAboutSurfelRuntime,
} from './audit-about-narrative-surfel-v2-helpers.mjs';
import {
  createAboutNarrativeJourneySample, resolveAboutNarrativeJourneyMap,
  sampleAboutNarrativeJourneyMapInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeJourneyMap.js';
import {
  measureCameraGatePassage, measureCameraRoundTunnelPassage,
} from './about-v2-blender/camera-gate-metrics.mjs';

// Keep GPU rendering enabled. The separate title audit deliberately suspends
// it; this audit records the actual scene and the DOM together, serially.
const browserName = process.env.ABS_BROWSER || 'chromium';
assert.ok(['chromium', 'webkit'].includes(browserName));
const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const assetDirectory = resolve(process.env.ABS_ABOUT_ASSET_DIR
  || 'react-app/app/public/models/about-v2-edited-world');
const metadata = JSON.parse(await readFile(resolve(assetDirectory, 'meta.json'), 'utf8'));
const cameraTrack = JSON.parse(await readFile(resolve(assetDirectory, 'camera-track.json'), 'utf8'));
const output = resolve('output/playwright/about-unified-journey', browserName);
const requestedCases = process.env.ABS_ABOUT_JOURNEY_CASES?.split(',');
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 }, runtimeProfile: 'desktop' },
  { name: 'mobile', viewport: { width: 390, height: 844 }, runtimeProfile: 'mobile' },
  { name: 'short', viewport: { width: 800, height: 500 }, runtimeProfile: 'mobile' },
];
const cases = profiles.flatMap(profile => ['light', 'dark'].flatMap(theme => (
  [false, ...(profile.name !== 'short' ? [true] : [])].map(reducedMotion => ({
    ...profile, theme, reducedMotion,
    id: `${profile.name}-${theme}-${reducedMotion ? 'reduced' : 'motion'}`,
  }))
))).filter(entry => !requestedCases || requestedCases.includes(entry.id));
assert.ok(cases.length, 'No matching ABS_ABOUT_JOURNEY_CASES.');
const squareGates = measureCameraGatePassage(cameraTrack).gates;
const roundGates = measureCameraRoundTunnelPassage(cameraTrack).apertures;
const bustGroup = metadata.motionGroups.find(group => group.motion?.behavior === 'bounded-rotation');
assert.ok(bustGroup, 'The canonical bundle must contain bounded bust motion.');
assert.deepEqual(bustGroup.motion.axis, [0, 1, 0], 'The bust must rotate about world up.');
assert.equal(bustGroup.motion.periodSeconds, 32);
assert.ok(!metadata.source.objects.some(object => object.objectKey.startsWith('director.form-body.')));

const maxError = (first, second) => Math.max(...first.map((value, index) => Math.abs(value - second[index])));
function assertSameCamera(first, second, label, tolerance = 0.00001) {
  assert.ok(maxError(first.cameraPosition, second.cameraPosition) < tolerance, `${label}: camera translation drift.`);
  assert.ok(maxError(first.cameraQuaternion, second.cameraQuaternion) < tolerance, `${label}: camera rotation drift.`);
}
const snapshot = page => page.evaluate(() => window.__aboutNarrativeRuntime.getMotionSnapshot());
const metrics = page => page.evaluate(() => window.__aboutNarrativeRuntime.getMetrics());
function assertBuffers(state) {
  assert.equal(state.assetSourceHash, metadata.source.sha256, 'Active Blender source changed during audit.');
  assert.equal(state.bundleIntegrityVerified, true);
  assert.equal(state.state, 'ready');
  assert.equal(state.gpuBufferBuilds, 1);
  assert.equal(state.gpuBufferIdentityStable, true);
  assert.equal(state.fixedAttributeIdentityStable, true);
  assert.equal(state.visible, true);
}
function storyAtDistance(map, distance) {
  const sample = createAboutNarrativeJourneySample();
  let lower = 0, upper = map.durationWU;
  for (let step = 0; step < 50; step += 1) {
    const middle = (lower + upper) / 2;
    sampleAboutNarrativeJourneyMapInto(map, middle, sample);
    if (sample.cameraDistanceWU < distance) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
}

async function moveContinuously(page, targetWU, durationMs, maximumStep) {
  return page.evaluate(async ({ target, duration, stepLimit }) => {
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const maximum = scrollport.scrollHeight - scrollport.clientHeight;
    const end = Math.max(...[...document.querySelectorAll('[data-render-span-id]')]
      .map(node => Number(node.dataset.storyEndWu)));
    const from = scrollport.scrollTop;
    const to = Math.min(maximum, target / end * maximum);
    const samples = [];
    let progress = 0, previous = performance.now(), count = 0;
    await new Promise(complete => {
      const frame = time => {
        progress = Math.min(1, progress + Math.min(stepLimit, Math.max(0, time - previous) / duration));
        previous = time;
        scrollport.scrollTop = from + (to - from) * progress;
        scrollport.dispatchEvent(new Event('scroll', { bubbles: false }));
        const state = window.__aboutNarrativeRuntime.getMotionSnapshot();
        if (count++ % 4 === 0 || progress === 1) samples.push({
          storyWU: state.storyWU, cameraDistanceWU: state.cameraDistanceWU,
          cameraPosition: state.cameraPosition, cameraQuaternion: state.cameraQuaternion,
        });
        if (progress < 1) requestAnimationFrame(frame);
        else complete();
      };
      requestAnimationFrame(frame);
    });
    return samples;
  }, { target: targetWU, duration: durationMs, stepLimit: maximumStep });
}

async function assertFinaleAccess(page) {
  await page.waitForFunction(() => {
    const actions = document.querySelector('.about-narrative-finale-actions');
    return actions && !actions.inert && actions.getAttribute('aria-hidden') !== 'true';
  });
  const result = await page.evaluate(() => {
    const scene = document.querySelector('[data-about-finale-scene-zone]').getBoundingClientRect();
    const copy = document.querySelector('[data-about-finale-copy]').getBoundingClientRect();
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const clip = scrollport.getBoundingClientRect();
    const actions = [...document.querySelectorAll('.about-narrative-finale-actions button, .about-narrative-finale-actions a')];
    return {
      sceneBottom: scene.bottom, copyTop: copy.top, clip: { left: clip.left, right: clip.right, top: clip.top, bottom: clip.bottom },
      horizontalOverflow: scrollport.scrollWidth - scrollport.clientWidth,
      actions: actions.map(node => {
        const bounds = node.getBoundingClientRect();
        return { label: node.getAttribute('aria-label') || node.textContent.trim(),
          left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
          width: bounds.width, height: bounds.height,
          hidden: Boolean(node.closest('[inert], [aria-hidden="true"]')) };
      }),
    };
  });
  assert.ok(result.sceneBottom <= result.copyTop + 1, 'Final scene slot overlaps final copy.');
  assert.ok(result.horizontalOverflow <= 1, 'Finale creates horizontal overflow.');
  assert.ok(result.actions.length >= 2, 'Final contact actions are missing.');
  for (const [index, action] of result.actions.entries()) {
    assert.equal(action.hidden, false, `Final action ${action.label} is inaccessible.`);
    assert.ok(action.width > 20 && action.height > 20, 'Final action has no usable target.');
    assert.ok(action.left >= result.clip.left - 1 && action.right <= result.clip.right + 1,
      `Final action ${action.label} is horizontally cropped.`);
    assert.ok(action.top >= result.clip.top - 1 && action.bottom <= result.clip.bottom + 1,
      `Final action ${action.label} is vertically cropped.`);
    const control = page.locator('.about-narrative-finale-actions button, .about-narrative-finale-actions a').nth(index);
    await control.focus();
    assert.equal(await control.evaluate(node => document.activeElement === node), true);
  }
  // Traverse with the keyboard without following external links or sending mail.
  await page.locator('.about-narrative-finale-actions button, .about-narrative-finale-actions a').first().focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('.about-narrative-finale-actions'))), true);
  return result;
}

async function editRange(page, id) {
  const control = page.locator(`#${id}`);
  const folder = control.locator('xpath=ancestor::details');
  if (!await folder.getAttribute('open').then(value => value !== null)) await folder.locator('summary').click();
  await control.scrollIntoViewIfNeeded();
  const before = Number(await control.inputValue());
  await control.focus();
  await control.press(before < Number(await control.getAttribute('max')) ? 'ArrowRight' : 'ArrowLeft');
  const after = Number(await control.inputValue());
  assert.notEqual(after, before, `Range ${id} did not respond to keyboard input.`);
  await page.waitForTimeout(250);
  return { before, after };
}

async function auditControls(page, profile) {
  const before = await metrics(page);
  await page.locator('.about-narrative-scrollport').click({ position: { x: 8, y: 8 } });
  await page.keyboard.press('/');
  await page.locator('[data-about-scene-parameters]').waitFor({ state: 'visible' });
  const population = await editRange(page, 'about-scene-globals-pointMaterial-pointDensity');
  const changed = await metrics(page);
  assert.equal(changed.controls.pointDensity, population.after);
  assertBuffers(changed);
  const distance = await editRange(page, 'about-scene-globals-camera-distanceFogEndWU');
  const overridden = await metrics(page);
  assert.equal(overridden.controls.fogEndWU, distance.after);
  assert.equal(await page.locator('[data-about-effective-fog]').getAttribute('data-about-effective-fog'), 'website');
  await page.getByRole('button', { name: 'Reset to Blender', exact: true }).click();
  await page.waitForTimeout(250);
  const reset = await metrics(page);
  assert.equal(await page.locator('[data-about-effective-fog]').getAttribute('data-about-effective-fog'), 'blender');
  assert.equal(reset.controls.fogEndWU, cameraTrack.projection.fog.endWU);
  assertBuffers(reset);
  await page.keyboard.press('Escape');
  // These edits intentionally remain unsaved. Prove reload uses canonical data;
  // durable save/reload/reset itself is exercised by the focused registry tests.
  await page.reload();
  await waitForAboutSurfelRuntime(page, profile);
  const reloaded = await metrics(page);
  assert.equal(reloaded.controls.pointDensity, before.controls.pointDensity);
  assert.equal(reloaded.controls.fogEndWU, before.controls.fogEndWU);
  return { population, distance, resetToBlender: true, unsavedReloadRestored: true };
}

async function contactSheet(frames, directory) {
  const width = 320, height = 240, columns = 4;
  const tiles = await Promise.all(frames.map(async (frame, index) => ({
    input: await sharp(frame.path).resize(width, height - 24, { fit: 'contain', background: '#161616' })
      .extend({ bottom: 24, background: '#161616' }).composite([{ input: Buffer.from(
        `<svg width="${width}" height="${height}"><text x="8" y="${height - 7}" fill="white" font-size="12" font-family="sans-serif">${frame.label}</text></svg>`,
      ) }]).png().toBuffer(), left: index % columns * width, top: Math.floor(index / columns) * height,
  })));
  await sharp({ create: { width: width * columns, height: height * Math.ceil(frames.length / columns),
    channels: 3, background: '#161616' } }).composite(tiles).png().toFile(resolve(directory, 'contact-sheet.png'));
}

await mkdir(output, { recursive: true });
const report = { browser: browserName, sourceHash: metadata.source.sha256, requestedCases: cases.map(entry => entry.id), cases: [] };
const browser = await launchAboutAuditBrowser(browserName);
try {
  for (const entry of cases) {
    const directory = resolve(output, entry.id);
    await mkdir(directory, { recursive: true });
    const context = await browser.newContext({ viewport: entry.viewport, deviceScaleFactor: 1,
      colorScheme: entry.theme, reducedMotion: entry.reducedMotion ? 'reduce' : 'no-preference',
      recordVideo: { dir: directory, size: entry.viewport } });
    await context.addInitScript(theme => localStorage.setItem('theme-preference-v3', theme), entry.theme);
    const page = await context.newPage();
    const video = page.video();
    const errors = collectPageErrors(page), frames = [];
    const result = { id: entry.id, status: 'running', viewport: entry.viewport,
      reducedMotion: entry.reducedMotion, captures: [], passes: [], terminal: [] };
    report.cases.push(result);
    const capture = async label => {
      const path = resolve(directory, `${String(frames.length).padStart(3, '0')}-${label}.png`);
      await page.screenshot({ path, animations: 'allow' });
      frames.push({ label, path });
      result.captures.push({ label, ...await snapshot(page) });
    };
    try {
      await page.goto(`${baseUrl}/about.html?preview=about&edit=0`);
      await waitForAboutSurfelRuntime(page, entry.runtimeProfile);
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      console.log(`READY ${browserName} ${entry.id}`);
      const initial = await metrics(page);
      assertBuffers(initial);
      assert.equal(initial.reducedMotion, entry.reducedMotion);
      assert.equal(await page.locator('html').getAttribute('data-abs-theme'), entry.theme);
      assert.equal(await page.locator('.about-narrative-finale-actions').evaluate(node => node.inert), true);
      const map = resolveAboutNarrativeJourneyMap(await getAboutSurfelJourneyMap(page), cameraTrack);
      assert.equal(map.valid, true);
      result.durationWU = map.durationWU;
      const gates = [
        ...roundGates.map(gate => ({ id: `round-${String(gate.id).padStart(2, '0')}`, distanceWU: gate.crossing.distanceWU })),
        ...squareGates.map(gate => ({ id: `square-${String(gate.id).padStart(2, '0')}`, distanceWU: gate.crossing.distanceWU })),
      ].map(gate => ({ ...gate, storyWU: storyAtDistance(map, gate.distanceWU),
        approachWU: storyAtDistance(map, gate.distanceWU - 6) }));
      const stops = [...gates.flatMap(gate => [
        { id: `${gate.id}-approach`, storyWU: gate.approachWU, capture: true },
        { id: gate.id, storyWU: gate.storyWU },
      ]), ...map.anchors.map(anchor => ({ id: `cue-${anchor.cueId || anchor.id}`, storyWU: anchor.storyWU }))]
        .filter(stop => stop.storyWU > 0 && stop.storyWU < map.durationWU)
        .sort((a, b) => a.storyWU - b.storyWU);
      const positions = [{ id: 'opening', storyWU: 0 }, ...stops, { id: 'finale', storyWU: map.durationWU, capture: true }];
      await capture('opening');
      for (const [name, targets, totalMs] of [
        ['slow-forward', positions.slice(1), 36_000],
        ['fast-reverse', positions.slice(0, -1).toReversed(), 10_000],
        ['fast-forward', positions.slice(1), 10_000],
      ]) {
        const pass = { name, samples: [], gates: [] };
        for (const target of targets) {
          const previous = await snapshot(page);
          const milliseconds = Math.max(name === 'slow-forward' ? 90 : 30,
            Math.abs(target.storyWU - previous.storyWU) / map.durationWU * totalMs);
          const samples = await moveContinuously(page, target.storyWU, milliseconds, name === 'slow-forward' ? 0.15 : 0.5);
          pass.samples.push(...samples);
          if (/^(round|square)-\d+$/u.test(target.id)) {
            await driveAboutStoryWU(page, target.storyWU);
            pass.gates.push({ id: target.id, ...await snapshot(page) });
          }
          if (name === 'slow-forward' && target.capture) await capture(target.id);
        }
        assert.equal(pass.gates.length, gates.length, `${name} missed a tunnel aperture.`);
        for (let index = 1; index < pass.samples.length; index += 1) {
          const delta = pass.samples[index].cameraDistanceWU - pass.samples[index - 1].cameraDistanceWU;
          assert.ok(name === 'fast-reverse' ? delta <= 0.00001 : delta >= -0.00001,
            `${name}: camera reversed against scroll.`);
        }
        result.passes.push(pass);
        console.log(`PASS ${browserName} ${entry.id} ${name}: ${pass.gates.length} apertures`);
      }
      const reference = result.passes[0].gates;
      for (const pass of result.passes.slice(1)) for (const pose of pass.gates) {
        assertSameCamera(reference.find(sample => sample.id === pose.id), pose, `${pass.name} ${pose.id}`);
      }
      await driveAboutStoryWU(page, map.durationWU * 0.5);
      const stopped = await snapshot(page);
      await page.waitForTimeout(750);
      const later = await snapshot(page);
      assertSameCamera(stopped, later, 'Stationary scroll');
      assert.equal(Number.isFinite(later.ambientTime), true, 'Motion snapshot must expose the actual ambient clock.');
      const pause = page.locator('[data-about-motion-control]');
      if (entry.reducedMotion) {
        assert.equal(await pause.isDisabled(), true);
        assert.equal(later.ambientTime, stopped.ambientTime);
      } else {
        assert.ok(later.ambientTime > stopped.ambientTime, 'Ambient motion stopped with scroll.');
        await pause.click();
        const paused = await snapshot(page);
        await page.waitForTimeout(600);
        const pausedLater = await snapshot(page);
        assert.equal(pausedLater.ambientTime, paused.ambientTime, 'Pause did not stop the ambient clock.');
        assertSameCamera(paused, pausedLater, 'Paused scene');
        await pause.click();
      }
      await driveAboutStoryWU(page, null);
      await page.waitForTimeout(1000);
      result.finaleAccess = await assertFinaleAccess(page);
      const terminalStart = await snapshot(page);
      const wallStart = Date.now();
      do {
        const state = await snapshot(page);
        assertSameCamera(terminalStart, state, 'Terminal hold');
        assert.equal(state.cameraLocked, true);
        const turn = state.authoredMotionGroups?.find(group => group.id === bustGroup.id);
        assert.ok(turn && Number.isFinite(turn.angleOrPhase), 'Motion snapshot must expose the actual bust uniform.');
        assert.ok(Math.abs(turn.angleOrPhase) <= bustGroup.motion.amplitudeRadians + 0.00001, 'Bust exceeded its bounded turn.');
        if (entry.reducedMotion) assert.equal(turn.angleOrPhase, 0);
        result.terminal.push({ ambientTime: state.ambientTime, angle: turn.angleOrPhase, pivotWU: turn.pivotWU });
        assert.deepEqual(turn.pivotWU, result.terminal[0].pivotWU, 'Bust contact pivot drifted.');
        if (entry.reducedMotion || state.ambientTime - terminalStart.ambientTime >= 32) break;
        assert.ok(Date.now() - wallStart < 180_000, 'A full ambient cycle did not complete within 180 seconds.');
        await page.waitForTimeout(500);
      } while (true);
      if (!entry.reducedMotion) {
        assert.ok(Math.max(...result.terminal.map(sample => sample.angle)) > bustGroup.motion.amplitudeRadians * 0.95);
        assert.ok(Math.min(...result.terminal.map(sample => sample.angle)) < -bustGroup.motion.amplitudeRadians * 0.95);
      }
      await capture('finale-after-cycle');
      assertBuffers(await metrics(page));
      // A 200% CSS zoom is recorded explicitly; this is not native browser zoom.
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; window.dispatchEvent(new Event('resize')); });
      await page.waitForTimeout(400);
      await driveAboutStoryWU(page, null);
      result.cssZoom200 = await assertFinaleAccess(page);
      await capture('finale-css-zoom-200');
      await page.evaluate(() => { document.documentElement.style.zoom = ''; window.dispatchEvent(new Event('resize')); });
      await page.waitForTimeout(300);
      result.controls = await auditControls(page, entry.runtimeProfile);
      await page.locator('[data-route-tab="home"]').click();
      await page.waitForSelector('.about-narrative-lab', { state: 'detached' });
      await page.locator('[data-route-tab="about"]').click();
      await waitForAboutSurfelRuntime(page, entry.runtimeProfile);
      assertBuffers(await metrics(page));
      result.routeReturn = true;
      assert.deepEqual(errors, [], 'Browser console/page errors occurred.');
      result.status = 'passed';
      console.log(`DONE ${browserName} ${entry.id}`);
    } catch (error) {
      result.status = 'failed'; result.error = error.stack || String(error);
      await capture('failure').catch(() => {});
      throw error;
    } finally {
      result.errors = errors;
      await writeFile(resolve(directory, 'metrics.json'), JSON.stringify(result, null, 2));
      if (frames.length) await contactSheet(frames, directory);
      await context.close();
      if (video) await video.saveAs(resolve(directory, 'journey.webm'));
      await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
    }
  }
} finally {
  await browser.close();
}
