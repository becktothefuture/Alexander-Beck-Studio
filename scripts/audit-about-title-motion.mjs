import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const browserName = process.env.ABS_BROWSER || 'chromium';
const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const expectedMetadata = JSON.parse(await readFile(resolve(
  process.env.ABS_ABOUT_ASSET_DIR || 'react-app/app/public/models/about-v2-edited-world', 'meta.json',
), 'utf8'));
const output = resolve('output/playwright/about-title-motion', browserName);
await mkdir(output, { recursive: true });
const browser = await (browserName === 'webkit' ? webkit : chromium).launch({ headless: true, ...(browserName === 'chromium' ? { args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] } : {}) });
const report = [];
try {
  for (const [profile, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    // CSS geometry remains at the real viewport size; lower raster density
    // keeps the software WebGL renderer from dominating this geometry audit.
    const page = await browser.newPage({ viewport, deviceScaleFactor: 0.5 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseUrl}/about.html?preview=about&edit=0`);
    await page.waitForFunction((expectedSourceHash) => {
      const root = document.querySelector('.about-narrative-lab');
      const metrics = window.__aboutNarrativeRuntime?.getMetrics?.();
      if (metrics?.assetSourceHash && metrics.assetSourceHash !== expectedSourceHash) {
        throw new Error(`About source mismatch: active ${metrics.assetSourceHash}; expected ${expectedSourceHash}.`);
      }
      if (root?.dataset.pointWorldState === 'error') throw new Error(root.dataset.worldError || 'About scene failed readiness.');
      return root?.dataset.pointWorldState === 'ready' && metrics?.assetSourceHash === expectedSourceHash;
    }, expectedMetadata.source.sha256);
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    console.log(`READY ${browserName} ${profile}`);
    await page.waitForTimeout(600);
    // This audit verifies DOM title projection and scroll timing. The complete
    // journey audit covers the scene; suspend its GPU draws to avoid starving
    // title RAF samples on software-rendered CI hosts.
    await page.evaluate(() => window.__aboutNarrativeRuntime.setVisible(false));
    const evidence = await page.evaluate(async () => {
      const root = document.querySelector('.about-narrative-lab');
      const scrollport = document.querySelector('.about-narrative-scrollport');
      const titles = [...document.querySelectorAll('.about-narrative-spatial-title:not(.route-centered-page__title)')];
      const fields = titles.map(title => title.parentElement);
      const projection = titles.map(title => {
        const field = title.parentElement;
        const saved = field.getAttribute('style');
        const cases = [-280, 0, 180].map(z => {
          field.style.setProperty('--fragment-z', `${z}px`);
          const rects = [1, 0.999, 0.5, 0.01].map(opacity => {
            field.style.opacity = String(opacity);
            const { x, y, width, height } = title.getBoundingClientRect();
            return { x, y, width, height };
          });
          return { z, rects };
        });
        if (saved === null) field.removeAttribute('style');
        else field.setAttribute('style', saved);
        return { id: field.dataset.textFieldId, prepared: title.querySelectorAll('[data-route-enter-glyph]').length > 0, cases };
      });
      const frames = [];
      const perspective = Number.parseFloat(getComputedStyle(titles[0].closest('.about-narrative-spatial-stage')).perspective);
      const maxScroll = scrollport.scrollHeight - scrollport.clientHeight;
      const storyEnd = Math.max(...[...document.querySelectorAll('[data-render-span-id]')].map(span => Number(span.dataset.storyEndWu)));
      // Target each short title's fade window explicitly; whole-page strides
      // can skip it between two frames.
      const targets = fields.flatMap(field => {
        const span = field.closest('[data-render-span-id]');
        const start = Number(span.dataset.storyStartWu);
        const end = Number(span.dataset.storyEndWu);
        return [0.04, 0.18, 0.38, 0.6, 0.8, 0.83, 0.86, 0.89, 0.92, 0.95, 0.98]
          .map(progress => (start + (end - start) * progress) / storyEnd * maxScroll);
      });
      const timing = fields.map(field => {
        const span = field.closest('[data-render-span-id]');
        const startWU = Number(span.dataset.storyStartWu);
        const endWU = Number(span.dataset.storyEndWu);
        return { id: field.dataset.textFieldId, startWU, endWU,
          travelPx: (endWU - startWU) / storyEnd * maxScroll };
      });
      const nextFrame = () => new Promise((resolveFrame, rejectFrame) => {
        const timeout = setTimeout(() => rejectFrame(new Error('No animation frame for 5 seconds')), 5000);
        requestAnimationFrame(time => { clearTimeout(timeout); resolveFrame(time); });
      });
      for (const direction of [1, -1]) {
        for (const target of direction === 1 ? targets : targets.toReversed()) {
          scrollport.scrollTop = target;
          await nextFrame();
          await nextFrame();
          const time = performance.now();
          fields.forEach((field, index) => {
            const style = getComputedStyle(field);
            const opacity = Number(style.opacity);
            if (opacity <= 0.01) return;
            const z = Number.parseFloat(style.getPropertyValue('--fragment-z')) || 0;
            const title = titles[index];
            const rect = title.getBoundingClientRect();
            const unprojectedWidth = Number.parseFloat(getComputedStyle(title).width);
            frames.push({
              direction, time, id: field.dataset.textFieldId,
              storyWU: Number(root.dataset.narrativeStoryWu), scrollTop: scrollport.scrollTop,
              opacity, z, width: rect.width, height: rect.height,
              projectionError: Math.abs(rect.width - unprojectedWidth * perspective / (perspective - z)),
              layoutHeight: title.offsetHeight,
            });
          });
        }
      }
      const stopped = frames.at(-1);
      await nextFrame();
      await nextFrame();
      const stoppedField = fields.find(field => field.dataset.textFieldId === stopped?.id);
      const stoppedDepth = stoppedField
        ? Number.parseFloat(getComputedStyle(stoppedField).getPropertyValue('--fragment-z')) || 0
        : null;
      return { projection, frames, timing, stoppedDepth, viewportHeight: scrollport.clientHeight, maxScroll };
    });
    await writeFile(`${output}/${profile}-frames.json`, `${JSON.stringify(evidence, null, 2)}\n`);
    if (profile === 'desktop') {
      assert.ok(evidence.maxScroll / evidence.viewportHeight <= 13.13 * 1.15,
        `Default desktop story exceeds the approved 15% growth limit: ${evidence.maxScroll / evidence.viewportHeight} screens.`);
    }
    const referenceTravel = evidence.timing[0].travelPx;
    for (const title of evidence.timing) {
      assert.ok(Math.abs(title.travelPx - referenceTravel) < 0.02,
        `${title.id}: title travel ${title.travelPx}px differs from the reference ${referenceTravel}px`);
    }
    assert.ok(Math.abs(evidence.stoppedDepth - evidence.frames.at(-1).z) < 0.03,
      `${profile}: title depth continues moving after scroll stops.`);
    for (const title of evidence.projection) {
      assert.ok(title.prepared, `${title.id}: lettering was not prepared before scrolling`);
      for (const sample of title.cases) {
        sample.rects.forEach(rect => {
          for (const key of ['x', 'y', 'width', 'height']) {
            assert.ok(Math.abs(rect[key] - sample.rects[0][key]) < 0.05, `${title.id}: opacity changes projected ${key} at depth ${sample.z}`);
          }
        });
      }
      const samples = evidence.frames.filter(frame => frame.id === title.id);
      assert.ok(samples.some(frame => frame.direction === 1) && samples.some(frame => frame.direction === -1), `${title.id}: missing forward/reverse samples`);
      assert.ok(samples.some(frame => frame.opacity < 0.99), `${title.id}: missing fade samples`);
      assert.equal(new Set(samples.map(frame => frame.layoutHeight)).size, 1, `${title.id}: line layout changes during travel`);
      const timing = evidence.timing.find(item => item.id === title.id);
      const referenceTiming = evidence.timing[0];
      const referenceFrames = evidence.frames.filter(frame => frame.id === referenceTiming.id);
      const rates = [];
      for (const direction of [1, -1]) {
        const ordered = samples.filter(frame => frame.direction === direction).sort((left, right) => left.storyWU - right.storyWU);
        for (let index = 1; index < ordered.length; index += 1) {
          const from = ordered[index - 1];
          const to = ordered[index];
          if (to.storyWU - from.storyWU < 0.02) continue;
          rates.push((to.z - from.z) / (to.storyWU - from.storyWU));
        }
      }
      const referenceStart = referenceFrames.reduce((left, right) => left.storyWU < right.storyWU ? left : right);
      const referenceEnd = referenceFrames.reduce((left, right) => left.storyWU > right.storyWU ? left : right);
      const referenceRate = (referenceEnd.z - referenceStart.z) / (referenceEnd.storyWU - referenceStart.storyWU);
      assert.ok(rates.length >= 2, `${title.id}: insufficient samples for scroll velocity.`);
      assert.ok(rates.every(rate => Math.abs(rate / referenceRate - 1) < 0.035),
        `${title.id}: forward/reverse depth speed differs from first statement (${referenceRate}): ${rates}`);
      assert.ok(timing.travelPx > 0, `${title.id}: empty motion window.`);
    }
    assert.ok(evidence.frames.length > 40, 'Insufficient rendered title frames');
    const maximumProjectionError = Math.max(...evidence.frames.map(frame => frame.projectionError));
    assert.ok(maximumProjectionError < 0.1, `${profile}: depth projection jumps by ${maximumProjectionError}px`);
    assert.deepEqual(errors, []);
    report.push({ profile, maximumProjectionError, ...evidence });
    console.log(`PASS ${browserName} ${profile}: ${evidence.frames.length} title frames, maximum projection error ${maximumProjectionError.toFixed(4)}px`);
    await page.close();
  }
} finally {
  await writeFile(`${output}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
