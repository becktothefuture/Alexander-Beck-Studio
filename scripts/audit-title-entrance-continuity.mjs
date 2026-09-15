import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { advanceSimulationSwitcherTo } from './lib/simulation-switcher.mjs';

const browserName = process.env.ABS_BROWSER || 'chromium';
const output = resolve('output/playwright/title-entrance-continuity', process.env.ABS_TITLE_TAG || browserName);
const browser = await ({ chromium, webkit }[browserName]).launch();
const page = await browser.newPage({ viewport: { width: 1373, height: 1000 }, colorScheme: 'light' });
await mkdir(output, { recursive: true });
await page.addInitScript(() => {
  if (window !== window.top) return;
  window.__ABS_ROUTE_PERF_AUDIT__ = true;
  const raf = window.requestAnimationFrame.bind(window);
  const clear = CanvasRenderingContext2D.prototype.clearRect;
  const fill = CanvasRenderingContext2D.prototype.fillText;
  let current = null;
  const reset = () => {
    current = null;
    window.__TITLE_FINISH_AUDIT__ = { paints: [], samples: [], seenPlaying: false, settledAt: 0 };
  };
  window.__resetTitleFinishAudit = reset;
  reset();
  CanvasRenderingContext2D.prototype.clearRect = function (...args) {
    if (this.canvas.id === 'simulation-title-canvas') {
      const out = window.__TITLE_FINISH_AUDIT__;
      if (current && current.remaining < 75 && !current.png && out.paints.length < 500) {
        current.png = this.canvas.toDataURL();
      }
      const states = [...document.querySelectorAll('#hero-title [data-route-enter-glyph]')]
        .map((glyph) => glyph.__absRouteEntranceState);
      current = {
        t: performance.now(),
        active: states.filter((state) => state?.phase === 'playing' && !state.settled).length,
        remaining: Math.max(0, ...states.map((state) => state?.phase === 'playing' && !state.settled
          ? state.startedAt + state.delayMs + state.durationMs - performance.now() : 0)),
        body: document.body.className,
        ends: states.map((state) => state?.startedAt + state?.delayMs + state?.durationMs),
        calls: [],
      };
      if (out.paints.length < 500) out.paints.push(current);
    }
    return clear.apply(this, args);
  };
  CanvasRenderingContext2D.prototype.fillText = function (...args) {
    if (this.canvas.id === 'simulation-title-canvas' && current) {
      current.calls.push({ text: args[0], x: args[1], y: args[2], font: this.font, color: this.fillStyle, alpha: this.globalAlpha });
    }
    return fill.apply(this, args);
  };
  const rect = (element) => {
    const r = element.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height];
  };
  const sample = () => {
    const out = window.__TITLE_FINISH_AUDIT__;
    const glyphs = [...document.querySelectorAll('[data-route-enter-variant="bookend-title"] [data-route-enter-glyph]')];
    const states = glyphs.map((glyph) => glyph.__absRouteEntranceState);
    const active = states.filter((state) => state?.phase === 'playing' && !state.settled).length;
    if (active) out.seenPlaying = true;
    if (out.seenPlaying && !active && !out.settledAt) out.settledAt = performance.now();
    if (out.seenPlaying && (!out.settledAt || performance.now() - out.settledAt < 1000)) {
      out.samples.push({ t: performance.now(), active, rects: glyphs.map(rect),
        delays: states.map((state) => state?.delayMs),
        phase: document.documentElement.dataset.absTransitionPhase });
    }
    raf(sample);
  };
  raf(sample);
});

async function collect(name) {
  await page.waitForFunction(() => {
    const out = window.__TITLE_FINISH_AUDIT__;
    return out.settledAt > 0 && performance.now() - out.settledAt > 1100;
  }, null, { timeout: 30000 });
  const data = await page.evaluate(() => window.__TITLE_FINISH_AUDIT__);
  const lastActive = data.paints.findLastIndex((paint) => paint.active > 0);
  const finalPaints = data.paints.slice(Math.max(0, lastActive - 3));
  assert(lastActive >= 0, `${name}: no animated Canvas title was captured`);
  const settledPaints = data.paints.slice(lastActive + 1).filter((paint) => paint.calls.length);
  assert(settledPaints.length > 0, `${name}: no paint after glyph settlement`);
  const final = settledPaints.at(-1);
  const activeEndpoint = data.paints[lastActive];
  const firstSettled = settledPaints[0];
  const endpointPixelEqual = activeEndpoint.remaining === 0 && activeEndpoint.png && firstSettled.png
    ? activeEndpoint.png === firstSettled.png : null;
  assert.notEqual(endpointPixelEqual, false, `${name}: final active and first settled pixels differ`);
  const glyphCount = data.paints[lastActive].ends.length;
  assert.equal(final.calls.length, glyphCount, `${name}: settlement changed glyph shaping`);
  let maxFinishedGlyphDelta = 0;
  for (const paint of data.paints) {
    if (!paint.active || paint.calls.length !== glyphCount) continue;
    paint.calls.forEach((call, index) => {
      if (paint.t < paint.ends[index] + 1) return;
      const endpoint = final.calls[index];
      assert.equal(call.text, endpoint.text, `${name}: text order changed`);
      assert.equal(call.alpha, endpoint.alpha, `${name}: finished glyph opacity flashed at settlement`);
      maxFinishedGlyphDelta = Math.max(maxFinishedGlyphDelta,
        Math.abs(call.x - endpoint.x), Math.abs(call.y - endpoint.y));
    });
  }
  assert(maxFinishedGlyphDelta < 0.02,
    `${name}: finished letters moved ${maxFinishedGlyphDelta.toFixed(4)}px at settlement`);
  data.verification = { glyphCount, maxFinishedGlyphDelta, endpointPixelEqual, postSettlementPaints: settledPaints.length };
  let imageIndex = 0;
  for (const paint of finalPaints) {
    if (!paint.png) continue;
    await writeFile(resolve(output, `${name}-${imageIndex++}-${paint.active ? 'active' : 'settled'}.png`),
      Buffer.from(paint.png.split(',')[1], 'base64'));
  }
  data.paints.forEach((paint) => { delete paint.png; });
  await writeFile(resolve(output, `${name}.json`), JSON.stringify(data));
  await page.screenshot({ path: resolve(output, `${name}-page.png`) });
  console.log(JSON.stringify({ name, ...data.verification, paints: data.paints.length, samples: data.samples.length }));
  return data.samples.find((sample) => sample.delays.length === glyphCount)?.delays;
}

try {
  const baseUrl = process.env.ABS_DEV_URL || 'http://localhost:8012';
  if (process.env.ABS_TITLE_ATMOSPHERE_ONLY === '1') {
    await page.goto(`${baseUrl}/lab/atmosphere-hybrid-glow.html?mode=pit&absAudit=1`);
    await collect('atmosphere-load');
  } else if (process.env.ABS_TITLE_RESPONSIVE_ONLY === '1') {
    await page.goto(`${baseUrl}/index.html?mode=pit&absAudit=1`);
    const initial = await collect('home-load');
    await page.reload();
    const reloaded = await collect('home-reload');
    const order = (delays) => delays.map((delay, index) => ({ delay, index }))
      .sort((a, b) => a.delay - b.delay).map((item) => item.index);
    assert.notDeepEqual(order(initial), order(reloaded), 'Reload repeated its activation order');
    await page.locator('[data-button-bar] a[href*="contact.html"]').click();
    await page.waitForFunction(() => document.documentElement.dataset.shellRoute === 'contact'
      && document.documentElement.dataset.absTransitionPhase === 'idle');
    await page.evaluate(() => window.__resetTitleFinishAudit());
    await page.locator('[data-button-bar] a[href*="index.html"]').click();
    await page.waitForFunction(() => [...document.querySelectorAll('#hero-title [data-route-enter-glyph]')]
      .some((glyph) => glyph.__absRouteEntranceState?.phase === 'playing'));
    const beforeResize = await page.evaluate(() => [...document.querySelectorAll('#hero-title [data-route-enter-glyph]')]
      .map((glyph) => glyph.__absRouteEntranceState.delayMs));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.__resetTitleFinishAudit());
    const afterResize = await collect('home-mobile-resize');
    assert.deepEqual(beforeResize, afterResize, 'Resize shuffled an active entrance again');
  } else {
    await page.goto(`${baseUrl}/index.html?mode=pit&absAudit=1`);
    await collect('home-load');
    await page.locator('[data-button-bar] a[href*="contact.html"]').click();
    await page.waitForFunction(() => document.documentElement.dataset.shellRoute === 'contact'
      && document.documentElement.dataset.absTransitionPhase === 'idle');
    await page.evaluate(() => window.__resetTitleFinishAudit());
    await page.locator('[data-button-bar] a[href*="index.html"]').click();
    await collect('home-revisit');
    const catalog = JSON.parse(await readFile('react-app/app/src/data/simulationCatalog.json', 'utf8'));
    await advanceSimulationSwitcherTo(page, catalog.simulations.filter((entry) => entry.stage === 'daily-rotation'), 'repel-room', 30000);
    await page.locator('[data-button-bar] a[href*="contact.html"]').click();
    await page.waitForFunction(() => document.documentElement.dataset.shellRoute === 'contact'
      && document.documentElement.dataset.absTransitionPhase === 'idle');
    await page.evaluate(() => window.__resetTitleFinishAudit());
    await page.locator('[data-button-bar] a[href*="index.html"]').click();
    await collect('daily-home-revisit');
  }
} finally {
  await browser.close();
}
