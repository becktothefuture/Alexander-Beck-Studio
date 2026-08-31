import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { launchAboutAuditBrowser, collectPageErrors } from './audit-about-narrative-surfel-v2-helpers.mjs';
import { assertCameraGatePassage, measureCameraGatePassage, measureGateView } from './about-v2-blender/camera-gate-metrics.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER || 'chromium';
const bundleDir = resolve(process.env.ABS_GATE_BUNDLE || 'react-app/app/public/models/about-v2-edited-world');
const outputDir = resolve(process.env.ABS_GATE_OUTPUT || `output/playwright/about-gate-camera-20260831/${browserName}`);
const track = JSON.parse(await readFile(resolve(bundleDir, 'camera-track.json'), 'utf8'));
const metadata = JSON.parse(await readFile(resolve(bundleDir, 'meta.json'), 'utf8'));
const quaternionDifferenceDegrees = (first, second) => {
  const cosine = Math.abs(first.reduce((sum, value, index) => sum + value * second[index], 0))
    / (Math.hypot(...first) * Math.hypot(...second));
  return 2 * Math.acos(Math.min(1, Math.max(0, cosine))) * 180 / Math.PI;
};
const measurement = measureCameraGatePassage(track);
assertCameraGatePassage(measurement);
const profiles = [
  { id: 'desktop', viewport: { width: 1440, height: 1000 }, colorScheme: 'light' },
  { id: 'desktop-dark', viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' },
  { id: 'wide', viewport: { width: 1920, height: 1080 }, colorScheme: 'light' },
  { id: 'mobile', viewport: { width: 390, height: 844 }, hasTouch: true, colorScheme: 'light' },
  { id: 'mobile-dark', viewport: { width: 390, height: 844 }, hasTouch: true, colorScheme: 'dark' },
  { id: 'narrow', viewport: { width: 320, height: 740 }, hasTouch: true },
  { id: 'short', viewport: { width: 390, height: 600 }, hasTouch: true },
  { id: 'reduced', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
].filter((profile) => !process.env.ABS_GATE_PROFILES || process.env.ABS_GATE_PROFILES.split(',').includes(profile.id));

await mkdir(outputDir, { recursive: true });
const report = {
  browser: browserName, baseUrl, sourceSha256: metadata.source.sha256,
  geometrySha256: metadata.files.surfels.sha256, gateCount: measurement.gates.length,
  minimumPhysicalClearanceWU: Math.min(...measurement.gates.flatMap((gate) => gate.intersections.flat().map((crossing) => crossing.clearanceWU))),
  maximumAngularDegreesPerWU: measurement.maximumAngularDegreesPerWU,
  profiles: [],
};
const browser = await launchAboutAuditBrowser(browserName);
try {
  for (const { id, ...options } of profiles) {
    const context = await browser.newContext({ ...options, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = collectPageErrors(page);
    if (process.env.ABS_GATE_BUNDLE) {
      await page.route('**/models/about-v2-edited-world/*', async (route) => {
        const file = basename(new URL(route.request().url()).pathname);
        await route.fulfill({ body: await readFile(resolve(bundleDir, file)),
          contentType: file.endsWith('.json') ? 'application/json' : 'application/octet-stream' });
      });
    }
    await page.goto(`${baseUrl}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction((hash) => {
      const metrics = window.__aboutNarrativeRuntime?.getMetrics();
      return metrics?.state === 'ready' && metrics.assetSourceHash === hash
        && metrics.bundleIntegrityVerified && metrics.sceneContractStatus === 'compatible'
        && document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete';
    }, metadata.source.sha256, { timeout: 60_000 });

    const targets = measurement.gates.flatMap((gate) => [16, 8, 4, 1].map((leadWU) => ({
      gateId: gate.id, leadWU, distanceWU: gate.crossing.distanceWU - leadWU,
    })));
    const samples = [];
    const forwardSamples = new Map();
    for (const direction of [1, -1]) {
      for (const target of direction === 1 ? targets : [...targets].reverse()) {
        const sample = await page.evaluate(async (fraction) => {
          const port = document.querySelector('.about-narrative-scrollport');
          port.scrollTop = fraction * (port.scrollHeight - port.clientHeight);
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
          const metrics = window.__aboutNarrativeRuntime.getMetrics();
          return {
            scrollTop: port.scrollTop, maximumScrollTop: port.scrollHeight - port.clientHeight,
            position: metrics.cameraPosition, quaternion: metrics.cameraQuaternion,
            steadycamMs: metrics.steadycam.responseMs, pan: metrics.pointerPan,
            storyWU: metrics.storyWU, cameraDistanceWU: metrics.cameraDistanceWU,
            stageVisibility: metrics.modelFraming['about.04'].stageVisibility,
            gatePointsInView: metrics.modelFraming['about.04'].framedVisibleCount,
            viewport: [metrics.viewportWidth, metrics.viewportHeight],
            gpuBufferBuilds: metrics.gpuBufferBuilds,
          };
        }, target.distanceWU / measurement.pathLengthWU);
        assert.equal(sample.steadycamMs, 0, 'Gate repair must not restore camera settling.');
        assert.equal(sample.gpuBufferBuilds, 1, 'Scrolling must not rebuild the point buffers.');
        const gate = measurement.gates[target.gateId - 1];
        const pose = { position: sample.position, quaternion: sample.quaternion };
        const view = measureGateView(gate.aperture, pose, sample.viewport[0] / sample.viewport[1], 65);
        const expected = measurement.sampleAtDistance(sample.scrollTop / sample.maximumScrollTop * measurement.pathLengthWU);
        const positionErrorWU = Math.hypot(...sample.position.map((value, axis) => value - expected.position[axis]));
        const quaternionErrorDegrees = quaternionDifferenceDegrees(sample.quaternion, expected.quaternion);
        if (options.reducedMotion !== 'reduce') {
          assert.ok(positionErrorWU < 0.0001, `${id}: camera no longer follows native scroll directly.`);
          assert.ok(quaternionErrorDegrees < 0.001, `${id}: rendered camera orientation diverges from the authored rail.`);
          assert.ok(sample.stageVisibility > 0.999, `${id}: gate ${gate.id} is still appearing on approach.`);
          assert.ok(view.depthWU > 0 && view.centreNDC.every((value) => Math.abs(value) < 0.95),
            `${id}: gate ${gate.id} opening leaves the view ${target.leadWU} WU before crossing.`);
          if (target.leadWU <= 8) assert.ok(view.aimClearanceWU > 0.75,
            `${id}: camera looks outside gate ${gate.id} on its close approach.`);
          assert.ok(sample.gatePointsInView > 0, `${id}: the gate bank is absent from the rendered view.`);
        }
        const key = `${gate.id}:${target.leadWU}`;
        if (direction === 1) forwardSamples.set(key, sample);
        else {
          const forward = forwardSamples.get(key);
          assert.equal(sample.scrollTop, forward.scrollTop, `${id}: reverse sample did not return to the same scroll position.`);
          assert.ok(Math.hypot(...sample.position.map((value, axis) => value - forward.position[axis])) < 0.0001,
            `${id}: reverse travel changes the camera position.`);
          assert.ok(quaternionDifferenceDegrees(sample.quaternion, forward.quaternion) < 0.001,
            `${id}: reverse travel changes the camera orientation.`);
        }
        samples.push({ direction, ...target, ...sample, ...view, positionErrorWU, quaternionErrorDegrees });
        if (direction === 1 && target.leadWU === 16
          && (['desktop', 'mobile'].includes(id) || [1, 9, 11, 14].includes(gate.id))) {
          await page.screenshot({ path: resolve(outputDir, `${id}-gate-${String(gate.id).padStart(2, '0')}.png`) });
        }
      }
    }
    // Verify that a pause on the tight bend stops both translation and rotation.
    const stopFraction = measurement.gates[10].crossing.distanceWU / measurement.pathLengthWU;
    const stop = await page.evaluate(async (fraction) => {
      const port = document.querySelector('.about-narrative-scrollport');
      port.scrollTop = fraction * (port.scrollHeight - port.clientHeight);
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      const m = window.__aboutNarrativeRuntime.getMetrics();
      return { position: m.cameraPosition, quaternion: m.cameraQuaternion };
    }, stopFraction);
    await page.mouse.move(options.viewport.width - 30, options.viewport.height - 70);
    await page.waitForTimeout(350);
    const held = await page.evaluate(() => {
      const m = window.__aboutNarrativeRuntime.getMetrics();
      return { position: m.cameraPosition, quaternion: m.cameraQuaternion };
    });
    assert.deepEqual(held, stop, `${id}: the camera moves or turns after scrolling stops.`);
    if (options.reducedMotion === 'reduce') {
      const distinctPoses = new Set(samples.map((sample) => sample.position.join(',')));
      assert.ok(distinctPoses.size < 10, 'Reduced motion must not continuously fly through the loop.');
    }
    assert.deepEqual(errors, [], `${id}: browser errors.`);
    report.profiles.push({ id, samples, stoppedCameraStable: true, errors });
    await context.close();
    await writeFile(resolve(outputDir, 'gate-passage.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ id, samples: samples.length, stoppedCameraStable: true, errors }));
  }
} finally {
  await browser.close();
  await writeFile(resolve(outputDir, 'gate-passage.json'), `${JSON.stringify(report, null, 2)}\n`);
}
