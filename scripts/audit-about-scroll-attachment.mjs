import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

// Deliberately occupy page JavaScript while native scrolling continues. A
// screencast observes compositor frames without requesting a main-thread paint.
const origin = process.env.ABS_URL || 'http://localhost:8012';
const output = process.env.ABS_OUTPUT || 'output/playwright/about-performance-20260925/attachment';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const reports = [];
try {
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const cdp = await page.context().newCDPSession(page);
    const report = { width, height, errors: [] };
    page.on('pageerror', error => report.errors.push(error.message));
    let casting = false;
    try {
      await page.goto(`${origin}/about.html`);
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady);
      await page.waitForTimeout(1000);
      // Resolve the first input's hit test before occupying JavaScript; first
      // wheel delivery is main-thread-dependent in this headless browser.
      await page.mouse.move(width * .6, height * .6);
      await page.mouse.wheel(0, 2);
      await page.waitForFunction(() => document.querySelector('.about-board-scrollport').scrollTop > 0);
      const geometry = await page.evaluate(() => {
        const canvas = document.querySelector('.about-board-balls');
        const world = document.querySelector('.about-board-world');
        const port = document.querySelector('.about-board-scrollport');
        const rect = port.getBoundingClientRect();
        return { insideWorld: canvas.parentElement === world, top: rect.top, left: rect.left,
          width: rect.width, height: rect.height, scrollTop: port.scrollTop,
          canvasWidth: canvas.width, canvasHeight: canvas.height };
      });
      assert.equal(geometry.insideWorld, true, 'balls must belong to the native scroll world');
      assert.ok(geometry.canvasHeight <= geometry.height * 3 + 2, 'buffer must remain bounded');
      const beforeBytes = Buffer.from((await cdp.send('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: false,
      })).data, 'base64');
      await writeFile(`${output}/${width}-before.png`, beforeBytes);
      const delta = Math.round(geometry.height * .07);
      const compositorFrames = [];
      cdp.on('Page.screencastFrame', frame => {
        compositorFrames.push(frame);
        void cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {});
      });
      await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
      casting = true;
      await new Promise(resolve => setTimeout(resolve, 100));
      // A real long task matches the reported failure more closely than a
      // debugger pause (which prevents screenshots in some headless builds).
      const stall = page.evaluate(() => {
        const start = performance.timeOrigin + performance.now();
        const end = performance.now() + 240;
        while (performance.now() < end) { /* Intentional test-only long task. */ }
        return { start, end: performance.timeOrigin + performance.now() };
      });
      await new Promise(resolve => setTimeout(resolve, 35));
      const wheelAcknowledged = cdp.send('Input.synthesizeScrollGesture', {
        x: geometry.left + geometry.width * .6, y: geometry.top + geometry.height * .6,
        yDistance: -delta, speed: 1500, gestureSourceType: 'mouse', preventFling: true });
      const interval = await stall;
      await wheelAcknowledged;
      await new Promise(resolve => setTimeout(resolve, 150));
      await cdp.send('Page.stopScreencast');
      casting = false;
      report.stall = interval;
      report.compositorFrames = compositorFrames.map(frame => ({ timestamp: frame.metadata.timestamp }));
      const duringStall = compositorFrames.filter(frame => frame.metadata.timestamp * 1000 > interval.start + 60
        && frame.metadata.timestamp * 1000 < interval.end);
      assert.ok(duringStall.length, 'the browser must supply a compositor frame during the main-thread stall');
      const pausedBytes = Buffer.from(duringStall.at(-1).data, 'base64');
      await writeFile(`${output}/${width}-javascript-paused.png`, pausedBytes);
      await page.waitForTimeout(200);
      const actualDelta = await page.locator('.about-board-scrollport')
        .evaluate(port => port.scrollTop) - geometry.scrollTop;
      assert.ok(Math.abs(actualDelta - delta) <= 1, 'native wheel must move the expected distance');
      const before = PNG.sync.read(beforeBytes);
      const afterBytes = Buffer.from((await cdp.send('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: false,
      })).data, 'base64');
      await writeFile(`${output}/${width}-after-scroll.png`, afterBytes);
      const after = PNG.sync.read(afterBytes);
      // Compare a dense, resting section of the same ball pack after applying
      // only the known scroll translation. A viewport-fixed bitmap fails this.
      const scale = before.width / width;
      const shift = Math.round(actualDelta * scale);
      // The eventual DOM offset is not evidence of an earlier compositor
      // frame's movement. Measure a static text landmark independently first.
      function landmarkShift(frame) {
        let best = { shift: 0, error: Infinity };
        for (let candidate = 0; candidate <= shift + 2; candidate++) {
          let sum = 0; let count = 0;
          for (let y = Math.round((geometry.top + geometry.height * .13) * scale);
            y < (geometry.top + geometry.height * .28) * scale; y += 2) {
            for (let x = Math.round((geometry.left + geometry.width * .2) * scale);
              x < (geometry.left + geometry.width * .7) * scale; x += 2) {
              const a = (y * frame.width + x) * 4;
              const b = ((y + candidate) * before.width + x) * 4;
              sum += Math.abs(frame.data[a] - before.data[b]); count++;
            }
          }
          if (sum / count < best.error) best = { shift: candidate, error: sum / count };
        }
        return best;
      }
      report.duringStallLandmark = landmarkShift(PNG.sync.read(pausedBytes));
      report.stallObservation = report.duringStallLandmark.shift > 0
        ? 'native-movement-observed' : 'inconclusive-input-delayed-until-JavaScript-returned';
      report.afterScrollLandmark = landmarkShift(after);
      assert.ok(Math.abs(report.afterScrollLandmark.shift - shift) <= 1,
        'the independent text landmark must move with native scroll');
      const bounds = { x0: Math.round((geometry.left + geometry.width * .2) * scale),
        x1: Math.round((geometry.left + geometry.width * .8) * scale),
        y0: Math.round((geometry.top + geometry.height * .76) * scale),
        y1: Math.round((geometry.top + geometry.height * .89) * scale) };
      let error = 0;
      let unchangedError = 0;
      let samples = 0;
      for (let y = bounds.y0; y < bounds.y1; y++) {
        for (let x = bounds.x0; x < bounds.x1; x++) {
          const target = (y * after.width + x) * 4;
          const source = ((y + shift) * before.width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            error += Math.abs(after.data[target + channel] - before.data[source + channel]);
            unchangedError += Math.abs(after.data[target + channel] - before.data[target + channel]);
            samples++;
          }
        }
      }
      report.meanTranslatedPixelError = error / samples;
      report.meanFixedPixelError = unchangedError / samples;
      report.deltaPx = actualDelta;
      report.geometry = geometry;
      assert.ok(report.meanTranslatedPixelError < 3,
        `the pack must share the landmark scroll translation (pixel error ${report.meanTranslatedPixelError})`);
      assert.ok(report.meanFixedPixelError > report.meanTranslatedPixelError * 3 + 2,
        'evidence must distinguish scrolling from an unchanged bitmap');
      assert.deepEqual(report.errors, []);
      report.passed = true;
      console.log(`PASS ${width}: text/ball scroll translation matches; pixel error ${report.meanTranslatedPixelError.toFixed(3)}; stall: ${report.stallObservation}`);
    } catch (error) {
      report.passed = false; report.failure = error.message; process.exitCode = 1;
      console.error(`FAIL ${width}: ${error.message}`);
    } finally {
      if (casting) await cdp.send('Page.stopScreencast').catch(() => {});
      reports.push(report);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
}
