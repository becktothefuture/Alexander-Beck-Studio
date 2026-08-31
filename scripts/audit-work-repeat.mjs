#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

// Owned, disposable browser. No saved settings, publishing, or user-tab access.
const browserName = process.env.ABS_BROWSER || 'chromium';
const baseUrl = process.env.ABS_WORK_URL || 'http://localhost:8012';
const steps = Math.max(6, Math.min(24, Number(process.env.ABS_REPEAT_STEPS || 12)));
const output = resolve('output/playwright/work-repeat',
  `${new Date().toISOString().replace(/[:.]/g, '-')}-${browserName}`);
await mkdir(output, { recursive: true });
const browser = await (browserName === 'webkit' ? webkit : chromium).launch();
const report = { browser: browserName, steps, baseUrl, profiles: [], errors: [],
  methodology: 'Rendered image rectangle area and 32px button/title coverage samples. '
    + 'Camera centres span a full period, including the half-period boundaries and corners. '
    + 'A title-dominated viewport is exempt only from the minimum image-area threshold. '
    + 'This is sampled coverage, not a continuous mathematical density proof.' };

async function ready(page) {
  await (await page.waitForFunction(() => {
    const root = document.querySelector('[data-work-experience]');
    const state = window.__ABS_WORK__?.getSnapshot();
    const rect = root?.querySelector('[data-playground-viewport]')?.getBoundingClientRect();
    return state?.ready && root?.dataset.routeMaterialState === 'complete'
      && document.documentElement.dataset.absBootState === 'ready'
      && Math.abs(rect.width - state.camera.viewportWidthPx) < 1
      && Math.abs(rect.height - state.camera.viewportHeightPx) < 1
      && !state.camera.frameScheduled && !state.dotField.frameScheduled;
  })).dispose();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function position(page, x, y) {
  await page.evaluate(({ x, y }) => window.__ABS_WORK__.setCamera(x, y), { x, y });
  await ready(page);
}

async function inspect(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-work-experience]');
    const viewport = root.querySelector('[data-playground-viewport]').getBoundingClientRect();
    const area = viewport.width * viewport.height;
    const clippedArea = (r) => Math.max(0, Math.min(r.right, viewport.right) - Math.max(r.left, viewport.left))
      * Math.max(0, Math.min(r.bottom, viewport.bottom) - Math.max(r.top, viewport.top));
    const cards = [...root.querySelectorAll('.playground-item')].flatMap((node) => {
      if (getComputedStyle(node).visibility === 'hidden') return [];
      const button = node.querySelector('.playground-item__route-surface > button').getBoundingClientRect();
      if (clippedArea(button) === 0) return [];
      const media = node.querySelector('.portfolio-project-card__media, .playground-media').getBoundingClientRect();
      return [{ button, media, imageArea: clippedArea(media) }];
    });
    const title = root.querySelector('.playground-title-anchor').getBoundingClientRect();
    const titleCoverage = clippedArea(title) / area;
    const rectangles = cards.map((card) => card.button);
    if (titleCoverage > 0) rectangles.push(title);
    let covered = 0; let points = 0; let emptyRadius = 0; let maximumDistance = 0;
    for (let x = viewport.left + 16; x < viewport.right; x += 32) {
      for (let y = viewport.top + 16; y < viewport.bottom; y += 32) {
        let distance = Infinity;
        for (const rect of rectangles) distance = Math.min(distance,
          Math.hypot(Math.max(rect.left - x, x - rect.right, 0), Math.max(rect.top - y, y - rect.bottom, 0)));
        points += 1;
        if (distance === 0) covered += 1;
        maximumDistance = Math.max(maximumDistance, distance);
        emptyRadius = Math.max(emptyRadius,
          Math.min(distance, x - viewport.left, viewport.right - x, y - viewport.top, viewport.bottom - y));
      }
    }
    let minimumGap = Infinity;
    for (let a = 0; a < rectangles.length; a += 1) for (let b = a + 1; b < rectangles.length; b += 1) {
      minimumGap = Math.min(minimumGap, Math.hypot(
        Math.max(rectangles[a].left - rectangles[b].right, rectangles[b].left - rectangles[a].right, 0),
        Math.max(rectangles[a].top - rectangles[b].bottom, rectangles[b].top - rectangles[a].bottom, 0)));
    }
    const state = window.__ABS_WORK__.getSnapshot();
    return { projects: cards.length, meaningfulProjects: cards.filter((card) => card.imageArea >= area * 0.01).length,
      imageCoverage: cards.reduce((sum, card) => sum + card.imageArea, 0) / area,
      titleCoverage, occupancy: covered / points, emptyDiameterPx: emptyRadius * 2, maximumDistance,
      minimumGap: Number.isFinite(minimumGap) ? minimumGap : null,
      expectedGap: state.diagnostics.projectClearancePx,
      semanticCount: root.querySelectorAll('[data-playground-item]').length,
      minimumTarget: Math.min(...cards.map((card) => Math.min(card.button.width, card.button.height))) };
  });
}

function summary(samples) {
  return { count: samples.length,
    meanOccupancy: samples.reduce((sum, value) => sum + value.occupancy, 0) / samples.length,
    meanImageCoverage: samples.reduce((sum, value) => sum + value.imageCoverage, 0) / samples.length,
    minimumImageCoverage: Math.min(...samples.map((value) => value.imageCoverage)),
    minimumMeaningfulProjects: Math.min(...samples.map((value) => value.meaningfulProjects)),
    largestEmptyDiameterPx: Math.max(...samples.map((value) => value.emptyDiameterPx)),
    maximumDistancePx: Math.max(...samples.map((value) => value.maximumDistance)) };
}

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    for (const colorScheme of ['dark', 'light']) {
      const name = `${viewport.width < 500 ? 'mobile' : 'desktop'}-${colorScheme}`;
      if (process.env.ABS_REPEAT_PROFILE && process.env.ABS_REPEAT_PROFILE !== name) continue;
      const context = await browser.newContext({ viewport, colorScheme,
        isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
      const page = await context.newPage();
      page.on('pageerror', (error) => report.errors.push(error.message));
      await page.goto(`${baseUrl}/portfolio.html`, { waitUntil: 'domcontentloaded' });
      await ready(page);
      const initial = await page.evaluate(() => window.__ABS_WORK__.getSnapshot());
      const profile = { name, viewport, world: [initial.camera.worldWidthPx, initial.camera.worldHeightPx],
        maximumEmptyDiameterPx: initial.diagnostics.itemDiagonalPx * 0.85,
        maximumDistancePx: initial.diagnostics.itemDiagonalPx * 0.8, samples: [] };
      report.profiles.push(profile);
      await page.screenshot({ path: resolve(output, `${name}-intro.png`) });
      for (let column = 0; column < steps; column += 1) for (let row = 0; row < steps; row += 1) {
        const x = (column / steps - 0.5) * profile.world[0];
        const y = (row / steps - 0.5) * profile.world[1];
        await position(page, x, y);
        const sample = { x, y, seam: column === 0 || row === 0, ...await inspect(page) };
        profile.samples.push(sample);
        assert.equal(sample.semanticCount, initial.placements.length);
        assert.ok(sample.minimumTarget >= 43.5, `${name}: undersized tap target`);
        assert.ok(sample.minimumGap === null || sample.minimumGap >= sample.expectedGap - 2,
          `${name}: clearance ${sample.minimumGap} < ${sample.expectedGap} at ${x},${y}`);
      }
      profile.seams = summary(profile.samples.filter((sample) => sample.seam));
      profile.interior = summary(profile.samples.filter((sample) => !sample.seam));
      for (const region of ['seam', 'interior']) {
        const worst = profile.samples.filter((sample) => sample.seam === (region === 'seam'))
          .sort((a, b) => a.imageCoverage - b.imageCoverage)[0];
        await position(page, worst.x, worst.y);
        await page.screenshot({ path: resolve(output, `${name}-sparsest-${region}.png`) });
      }
      // Both signs and both sides of several wraps; depth projects retain the
      // same selection geometry and the renderer never needs a new layout.
      profile.repeats = [];
      for (const multiple of [-3.501, -3.499, -1.501, -1.499, 1.499, 1.501, 3.499, 3.501]) {
        await position(page, profile.world[0] * multiple, profile.world[1] * multiple);
        profile.repeats.push(await inspect(page));
        assert.deepEqual((await page.evaluate(() => window.__ABS_WORK__.getSnapshot())).placements,
          initial.placements, 'Panning must not regenerate placement.');
      }
      console.log(JSON.stringify({ name, world: profile.world, seams: profile.seams, interior: profile.interior }));
      assert.ok(profile.seams.meanImageCoverage >= profile.interior.meanImageCoverage * 0.8,
        `${name}: seam image coverage is below 80% of the interior.`);
      for (const sample of [...profile.samples, ...profile.repeats]) {
        assert.ok(sample.imageCoverage >= 0.025 && sample.meaningfulProjects >= 1 || sample.titleCoverage >= 0.15,
          `${name}: sparse view ${JSON.stringify(sample)}`);
        assert.ok(sample.emptyDiameterPx <= profile.maximumEmptyDiameterPx,
          `${name}: empty patch ${sample.emptyDiameterPx}px exceeds 85% of the reference image diagonal.`);
        assert.ok(sample.maximumDistance <= profile.maximumDistancePx,
          `${name}: content is ${sample.maximumDistance}px away, exceeding 80% of the reference image diagonal.`);
      }
      await context.close();
    }
  }
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Repeat evidence: ${output}`);
}
