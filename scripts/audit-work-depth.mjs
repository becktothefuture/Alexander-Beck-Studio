#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

// A disposable browser verifies actual rendered footprints, not just the
// packing model. It never attaches to or closes the user's development tabs.
const browserName = process.env.ABS_BROWSER || 'chromium';
const baseUrl = process.env.ABS_WORK_URL || 'http://localhost:8012';
const output = resolve('output/playwright/work-depth',
  `${new Date().toISOString().replace(/[:.]/g, '-')}-${browserName}`);
await mkdir(output, { recursive: true });
const browser = await (browserName === 'webkit' ? webkit : chromium).launch();
const report = { browser: browserName, baseUrl, profiles: [], errors: [] };

async function ready(page) {
  const settled = () => {
    const root = document.querySelector('[data-work-experience]');
    const s = window.__ABS_WORK__?.getSnapshot();
    const viewport = root?.querySelector('[data-playground-viewport]')?.getBoundingClientRect();
    return Boolean(s?.ready && viewport && root.dataset.routeMaterialState === 'complete'
      && document.documentElement.dataset.absBootState === 'ready'
      && Math.abs(viewport.width - s.camera.viewportWidthPx) < 1
      && Math.abs(viewport.height - s.camera.viewportHeightPx) < 1
      && !s.camera.frameScheduled && !s.dotField.frameScheduled
      && root.getAnimations({ subtree: true }).every((animation) =>
        animation.effect?.getTiming().iterations === Infinity || animation.playState !== 'running'));
  };
  // Playwright polls a synchronous predicate. A Promise is truthy even when it
  // resolves false, so keep the paint barrier outside waitForFunction.
  await (await page.waitForFunction(settled)).dispose();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await (await page.waitForFunction(settled)).dispose();
}

async function setCamera(page, x, y) {
  await page.evaluate(({ x, y }) => window.__ABS_WORK__.setCamera(x, y), { x, y });
  await ready(page);
}

async function inspectSpacing(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-work-experience]');
    const viewport = root.querySelector('[data-playground-viewport]').getBoundingClientRect();
    const visible = (rect) => rect.width > 0 && rect.height > 0 && rect.right > viewport.left
      && rect.left < viewport.right && rect.bottom > viewport.top && rect.top < viewport.bottom;
    const cards = [...root.querySelectorAll('.playground-item')].flatMap((node) => {
      if (getComputedStyle(node).visibility === 'hidden') return [];
      const rect = node.querySelector('.playground-item__route-surface > button').getBoundingClientRect();
      return visible(rect) ? [{ id: node.dataset.playgroundItem || node.dataset.playgroundDecorativeItem,
        rect: rect.toJSON(), kind: node.dataset.workItemKind }] : [];
    });
    const title = root.querySelector('.playground-title-anchor').getBoundingClientRect();
    const obstacles = visible(title) ? [...cards, { id: 'title', rect: title.toJSON() }] : cards;
    let minimum = Infinity;
    let closest = null;
    for (let a = 0; a < obstacles.length; a += 1) {
      for (let b = a + 1; b < obstacles.length; b += 1) {
        const left = obstacles[a].rect;
        const right = obstacles[b].rect;
        const gap = Math.hypot(Math.max(left.left - right.right, right.left - left.right, 0),
          Math.max(left.top - right.bottom, right.top - left.bottom, 0));
        if (gap < minimum) {
          minimum = gap;
          closest = [obstacles[a], obstacles[b]];
        }
      }
    }
    return { minimum: Number.isFinite(minimum) ? minimum : null, closest,
      visible: cards.length, minimumTarget: Math.min(...cards.map((card) => Math.min(card.rect.width, card.rect.height))),
      semanticCount: root.querySelectorAll('[data-playground-item]').length,
      listItemCount: root.querySelectorAll('[role="listitem"]').length,
      expectedGap: window.__ABS_WORK__.getSnapshot().diagnostics.projectClearancePx };
  });
}

async function inspectMovement(page) {
  return page.evaluate(() => {
    const state = window.__ABS_WORK__.getSnapshot();
    return { camera: state.camera, cards: state.placements.map((item) => {
      const node = document.querySelector(`[data-playground-item="${item.id}"]`);
      const rect = node.getBoundingClientRect();
      return { id: item.id, parallax: item.parallax, x: rect.x, y: rect.y,
        width: rect.width, height: rect.height, transform: node.style.transform };
    }) };
  });
}

try {
  for (const profile of [
    { name: 'desktop', width: 1440, height: 900, colorScheme: 'dark' },
    { name: 'reference', width: 1634, height: 1282, colorScheme: 'dark' },
    { name: 'mobile', width: 390, height: 844, colorScheme: 'light', isMobile: true },
    { name: 'small-reduced', width: 320, height: 568, colorScheme: 'dark', isMobile: true, reducedMotion: 'reduce' },
    { name: 'ultrawide', width: 3440, height: 1440, colorScheme: 'light' },
  ]) {
    if (process.env.ABS_DEPTH_PROFILE && process.env.ABS_DEPTH_PROFILE !== profile.name) continue;
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height },
      colorScheme: profile.colorScheme, reducedMotion: profile.reducedMotion || 'no-preference',
      isMobile: Boolean(profile.isMobile), hasTouch: Boolean(profile.isMobile), deviceScaleFactor: profile.isMobile ? 2 : 1 });
    const page = await context.newPage();
    page.on('pageerror', (error) => report.errors.push(error.message));
    page.setDefaultTimeout(30_000);
    await page.goto(`${baseUrl}/portfolio.html`, { waitUntil: 'domcontentloaded' });
    await ready(page);
    // Read and return the ready owner's snapshot atomically. A resize can
    // replace the diagnostic owner between two separate browser commands.
    const initialHandle = await page.waitForFunction(() => {
      const state = window.__ABS_WORK__?.getSnapshot();
      return state?.ready ? state : false;
    });
    const initial = await initialHandle.jsonValue();
    await initialHandle.dispose();
    assert.equal(await page.getByRole('list', { name: 'Work projects' }).getByRole('listitem').count(), 36,
      'Presentation planes must retain one accessible list with 36 logical items.');
    const nativeScroll = await page.evaluate(() => {
      const viewport = document.querySelector('[data-playground-viewport]');
      viewport.scrollLeft = 120;
      viewport.scrollTop = 120;
      return [viewport.scrollLeft, viewport.scrollTop];
    });
    assert.deepEqual(nativeScroll, [0, 0], 'The camera must be the only canvas scroll owner.');
    const result = { name: profile.name, viewport: [profile.width, profile.height],
      world: [initial.camera.worldWidthPx, initial.camera.worldHeightPx], positions: 0,
      minimumGap: Infinity, maximumVisibleCards: 0, movement: [], opened: [] };
    report.profiles.push(result);
    await page.screenshot({ path: resolve(output, `${profile.name}-intro.png`) });
    const spacing = initial.dotField.gridSpacingPx;
    const positions = initial.placements.map((item) => [
      (item.xCell + item.footprintWidthCells / 2) * spacing,
      (item.yCell + item.footprintHeightCells / 2) * spacing,
    ]);
    for (const multiple of [-2.001, -1, -0.001, 0.001, 0.999, 1.001, 3.999]) {
      positions.push([initial.camera.worldWidthPx * multiple, initial.camera.worldHeightPx * multiple]);
    }
    positions.push([-550, -350]);
    for (const [x, y] of positions) {
      await setCamera(page, x, y);
      const sample = await inspectSpacing(page);
      assert.equal(sample.semanticCount, 36);
      assert.equal(sample.listItemCount, 36);
      assert(sample.minimumTarget >= 43.5, `${profile.name} tap target ${sample.minimumTarget}`);
      assert(sample.minimum === null || sample.minimum >= sample.expectedGap - 2,
        `${profile.name} camera=${x},${y} spacing ${JSON.stringify(sample)}`);
      if (sample.minimum !== null) result.minimumGap = Math.min(result.minimumGap, sample.minimum);
      result.maximumVisibleCards = Math.max(result.maximumVisibleCards, sample.visible);
      result.positions += 1;
    }
    await page.screenshot({ path: resolve(output, `${profile.name}-field.png`) });

    const before = await inspectMovement(page);
    await setCamera(page, before.camera.logicalX + 90, before.camera.logicalY + 60);
    const after = await inspectMovement(page);
    for (const item of before.cards) {
      const next = after.cards.find((candidate) => candidate.id === item.id);
      // A semantic owner changes its local matrix only when it crosses a repeat.
      if (item.transform !== next.transform) continue;
      const dx = next.x - item.x;
      const dy = next.y - item.y;
      assert(Math.abs(dx + 90 * item.parallax * before.camera.worldScale) < 0.05, `${item.id} incorrect depth travel`);
      assert(Math.abs(dy + 60 * item.parallax * before.camera.worldScale) < 0.05, `${item.id} incorrect depth travel`);
      assert(Math.abs(next.width - item.width) < 0.05 && Math.abs(next.height - item.height) < 0.05,
        'Depth must not stretch or resize the media or caption');
      result.movement.push({ id: item.id, parallax: item.parallax, dx, dy });
    }
    assert(result.movement.some((item) => item.id.startsWith('case-study-')));
    assert(result.movement.some((item) => !item.id.startsWith('case-study-')));
    assert(result.movement.every((item) => item.parallax === (profile.reducedMotion === 'reduce'
      || item.id.startsWith('case-study-') ? 1 : 0.88)));

    // Images, video, and a code demo open from an off-centre negative repeat.
    for (const item of initial.placements.filter((entry) => !entry.id.startsWith('case-study-')).filter((_, index) => [0, 8, 14].includes(index))) {
      await setCamera(page, (item.xCell + item.widthCells / 2) * spacing
        - 3 * initial.camera.worldWidthPx - 70 / (item.parallax * initial.camera.worldScale),
      (item.yCell + item.footprintHeightCells / 2) * spacing + 2 * initial.camera.worldHeightPx);
      const button = page.locator(`[data-playground-item="${item.id}"] button`);
      const source = await button.boundingBox();
      await (profile.isMobile ? button.tap() : button.click());
      await page.locator('[data-work-snippet-stage][data-phase="open"]').waitFor();
      await page.waitForFunction(() => !window.__ABS_WORK__.getSnapshot().camera.frameScheduled);
      const centred = await button.boundingBox();
      const viewport = await page.locator('[data-playground-viewport]').boundingBox();
      const centreDetail = { source, centred, viewport, camera: await page.evaluate(() => window.__ABS_WORK__.getSnapshot().camera) };
      assert(Math.abs(centred.x + centred.width / 2 - viewport.x - viewport.width / 2) < 1,
        `${item.id} must centre the actual tapped tile horizontally: ${JSON.stringify(centreDetail)}`);
      assert(Math.abs(centred.y + centred.height / 2 - viewport.y - viewport.height / 2) < 1,
        `${item.id} must centre the actual tapped tile vertically: ${JSON.stringify(centreDetail)}`);
      await page.locator('.work-snippet-stage__close').click();
      await page.locator('[data-work-snippet-stage]').waitFor({ state: 'detached' });
      await ready(page);
      assert.equal(await page.evaluate(() => document.activeElement?.closest('[data-playground-item]')?.dataset.playgroundItem), item.id);
      result.opened.push({ id: item.id, travelPx: Math.hypot(centred.x - source.x, centred.y - source.y) });
    }
    await context.close();
    console.log(`${profile.name}: ${result.positions} positions, min gap ${result.minimumGap.toFixed(1)}px, ${result.opened.length} open/close cycles`);
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(output);
}
