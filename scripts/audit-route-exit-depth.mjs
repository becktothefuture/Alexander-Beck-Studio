#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const browserName = process.env.ABS_BROWSER || 'chromium';
const theme = process.env.ABS_TRANSITION_THEME || 'light';
const reducedMotion = process.env.ABS_TRANSITION_REDUCED_MOTION === '1';
const [width, height] = (process.env.ABS_TRANSITION_VIEWPORT || '1280x900').split('x').map(Number);
const baseUrl = process.env.ABS_DEV_URL || 'http://localhost:8013';
const tag = process.env.ABS_EXIT_OUTPUT_TAG || 'preview';
const output = resolve('output/playwright/route-exit-depth', `${tag}-${browserName}-${width}x${height}-${theme}-${reducedMotion ? 'reduced' : 'motion'}`);
const paths = { home: '/index.html', portfolio: '/portfolio.html', about: '/about.html', contact: '/contact.html' };
// Euler circuit covers each of the 12 directed primary-route pairs exactly once.
const circuit = ['portfolio', 'about', 'home', 'contact', 'portfolio', 'home', 'about', 'contact', 'about', 'portfolio', 'contact', 'home'];
const rounds = Number(process.env.ABS_EXIT_ROUNDS || 1);
const steps = Array.from({ length: rounds }, () => circuit).flat();
await mkdir(output, { recursive: true });
const browser = await ({ chromium, webkit })[browserName].launch();
const context = await browser.newContext({
  viewport: { width, height },
  reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  ...(process.env.ABS_EXIT_VIDEO === '1' ? { recordVideo: { dir: output, size: { width, height } } } : {}),
});
await context.addInitScript(({ theme }) => {
  if (window.top !== window) return;
  localStorage.setItem('theme-preference-v3', theme);
  window.__exitNativeRAF = window.requestAnimationFrame.bind(window);
}, { theme });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const traces = [];
const stress = [];
let failure;

async function waitForIdle(routeId) {
  await page.waitForFunction(expected => {
    const root = document.documentElement;
    const overlay = document.getElementById('abs-boot-overlay');
    const style = overlay && getComputedStyle(overlay);
    return root.dataset.shellRoute === expected
      && (root.dataset.absTransitionPhase || 'idle') === 'idle'
      && root.dataset.absBootState !== 'booting'
      && (!style || style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) < 0.02);
  }, routeId, { timeout: 60000 });
}

async function startTrace() {
  await page.evaluate(() => {
    const selectors = {
      window: '#simulations', bar: '[data-button-bar]',
      wall: '#shell-wall-slot', secondary: '[data-route-surface="secondary"]',
      controls: '[data-route-surface="controls"]', switcher: '.simulation-focus-switcher-slot',
      title: '#simulation-title-canvas',
    };
    const read = () => {
      const shield = document.querySelector('[data-route-transition-loader]');
      const result = { t: performance.now(), phase: document.documentElement.dataset.absTransitionPhase || 'idle', route: document.documentElement.dataset.shellRoute, spinnerCount: shield?.querySelectorAll('.abs-loader-spinner').length || 0, loaderBackground: shield ? getComputedStyle(shield).backgroundColor : 'rgba(0, 0, 0, 0)' };
      for (const [key, selector] of Object.entries(selectors)) {
        const el = document.querySelector(selector);
        if (!el) { result[key] = null; continue; }
        const style = getComputedStyle(el);
        const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
        result[key] = {
          rect: el.getBoundingClientRect().toJSON(), opacity: Number(style.opacity),
          scale: matrix.a, visible: style.visibility !== 'hidden',
          routeView: el.querySelector('[data-route-view]')?.getAttribute('data-route-view') || null,
        };
      }
      return result;
    };
    const recorder = { active: true, samples: [read()] };
    window.__exitTrace = recorder;
    const sample = () => {
      if (!recorder.active) return;
      recorder.samples.push(read());
      window.__exitNativeRAF(sample);
    };
    window.__exitNativeRAF(sample);
  });
}

function verifyTrace(trace) {
  const baseline = trace.samples[0];
  assert.ok(trace.samples.every(sample => sample.spinnerCount === 0 && sample.loaderBackground === 'rgba(0, 0, 0, 0)'), `${trace.label}: visible inter-view loader returned`);
  const out = trace.samples.filter(sample => sample.phase === 'route-out');
  const incoming = trace.samples.filter(sample => sample.phase === 'route-in');
  assert.ok(out.length >= 2, `${trace.label}: outgoing frames were not painted`);
  assert.ok(incoming.length >= 1, `${trace.label}: arrival was not painted`);
  assert.ok(out.every(sample => sample.route === trace.from), `${trace.label}: route identity changed before departure finished`);
  assert.ok(out.every(sample => sample.wall.routeView === baseline.wall.routeView), `${trace.label}: outgoing content was replaced early`);
  for (const key of ['window', 'bar']) {
    assert.ok(baseline[key], `${trace.label}: missing stable ${key}`);
    for (const sample of trace.samples) {
      for (const dimension of ['x', 'y', 'width', 'height']) {
        assert.ok(Math.abs(sample[key].rect[dimension] - baseline[key].rect[dimension]) < 0.1, `${trace.label}: ${key} ${dimension} moved`);
      }
    }
  }
  const visibleFade = out.filter(sample => sample.secondary.opacity > 0.05 && sample.secondary.opacity < 0.95);
  assert.ok(visibleFade.length >= (reducedMotion ? 1 : 2), `${trace.label}: missing intermediate fade frames`);
  if (!reducedMotion) {
    assert.ok(out.some(sample => sample.wall.scale < 0.997 && sample.wall.opacity > 0.1), `${trace.label}: no visible scene recession`);
    assert.ok(out.every(sample => sample.wall.scale >= 0.95), `${trace.label}: depth became a large zoom`);
    assert.ok(incoming.some(sample => sample.wall.scale < 0.999), `${trace.label}: incoming depth was not painted`);
  } else {
    assert.ok(out.every(sample => Math.abs(sample.wall.scale - 1) < 0.001), `${trace.label}: reduced motion still scales the scene`);
  }
  if (trace.from === 'home') {
    assert.ok(baseline.switcher, `${trace.label}: missing Home control`);
    for (const sample of out) {
      for (const dimension of ['x', 'y', 'width', 'height']) {
        assert.ok(Math.abs(sample.switcher.rect[dimension] - baseline.switcher.rect[dimension]) < 0.1, `${trace.label}: Home control ${dimension} jumped`);
      }
    }
    assert.ok(out.some(sample => sample.title.opacity > 0.05 && sample.title.opacity < 0.95), `${trace.label}: Home title disappeared without fading`);
  }
  return { label: trace.label, exitFrames: out.length, fadeFrames: visibleFade.length, minSceneScale: Math.min(...out.map(sample => sample.wall.scale)) };
}

try {
  await page.goto(`${baseUrl}/index.html?mode=pit&absAudit=1`, { waitUntil: 'domcontentloaded' });
  await waitForIdle('home');
  await page.locator('.simulation-focus-switcher-slot').waitFor({ state: 'visible' });
  // Direct-load child entrance runs after the boot overlay releases.
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.simulation-focus-switcher-slot')).opacity) > 0.99);
  let from = 'home';
  for (const [index, to] of steps.entries()) {
    const label = `${String(index + 1).padStart(2, '0')}-${from}-to-${to}`;
    if (process.env.ABS_EXIT_SCREENSHOTS !== '0') await page.screenshot({ path: resolve(output, `${label}-before.png`) });
    await startTrace();
    await page.locator(`[data-button-bar] a[href="${paths[to]}"]`).click();
    await waitForIdle(to);
    const samples = await page.evaluate(() => { window.__exitTrace.active = false; return window.__exitTrace.samples; });
    const trace = { label, from, to, samples };
    traces.push(trace);
    console.log(JSON.stringify(verifyTrace(trace)));
    if (process.env.ABS_EXIT_SCREENSHOTS !== '0') await page.screenshot({ path: resolve(output, `${label}-after.png`) });
    from = to;
  }
  if (process.env.ABS_EXIT_STRESS !== '0') {
    // Keyboard route selection must hand focus to destination content.
    await page.locator('[data-button-bar] a[href="/contact.html"]').focus();
    await page.keyboard.press('Enter');
    await waitForIdle('contact');
    const focus = await page.evaluate(() => ({ id: document.activeElement?.id, inContent: Boolean(document.activeElement?.closest('#simulations')) }));
    assert.ok(focus.inContent, `Keyboard focus did not enter destination content: ${JSON.stringify(focus)}`);
    await page.goBack();
    await waitForIdle('home');
    await page.goForward();
    await waitForIdle('contact');
    stress.push('keyboard-focus', 'back', 'forward');

    const phase = value => page.waitForFunction(expected => document.documentElement.dataset.absTransitionPhase === expected, value);
    await page.locator('[data-button-bar] a[href="/index.html"]').click();
    await phase('route-out');
    await page.evaluate(() => {
      for (const [index, route] of ['home', 'portfolio', 'portfolio', 'contact', 'about'].entries()) {
        setTimeout(() => document.querySelector(`[data-route-tab="${route}"]`).click(), index * 20);
      }
    });
    await waitForIdle('about');
    stress.push('repeated-selection-during-exit');

    // Every visible arrival must get a fresh departure when the next tab is
    // clicked. Check all route owners, including a repeat Home/Contact ping-pong.
    for (const [arriving, next] of [
      ['home', 'contact'], ['portfolio', 'about'], ['contact', 'home'],
      ['about', 'portfolio'], ['home', 'contact'], ['home', 'contact'],
    ]) {
      await page.locator(`[data-button-bar] a[href="${paths[arriving]}"]`).click();
      await phase('route-in');
      await startTrace();
      await page.locator(`[data-button-bar] a[href="${paths[next]}"]`).click();
      await waitForIdle(next);
      const samples = await page.evaluate(() => { window.__exitTrace.active = false; return window.__exitTrace.samples; });
      const departure = samples.filter(sample => sample.phase === 'route-out');
      assert.ok(departure.length >= 2, `${arriving} arrival retarget skipped its visible exit`);
      assert.ok(departure.every(sample => sample.route === arriving), `${arriving} arrival was replaced before its exit`);
      assert.ok(departure.some(sample => sample.wall.opacity > 0 && sample.wall.opacity < 0.95), `${arriving} arrival did not fade`);
      stress.push({ kind: 'retarget-during-arrival', arriving, next, exitFrames: departure.length });
      traces.push({ label: `interrupted-${arriving}-to-${next}`, from: arriving, to: next, samples });
    }
    await startTrace();
    await page.locator('[data-button-bar] a[href="/contact.html"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.absTransitionPhase || 'idle'), 'idle');
    await page.evaluate(() => new Promise(resolve => window.__exitNativeRAF(() => window.__exitNativeRAF(resolve))));
    assert.ok(await page.evaluate(() => { window.__exitTrace.active = false; return window.__exitTrace.samples.every(sample => sample.phase === 'idle'); }), 'The selected tab restarted a transition');
    stress.push('selected-tab-no-op');

    await page.evaluate(() => window.__ABS_SPA_NAVIGATE__('/about.html', {
      activation: 'pointer',
      preloadRouteModule: () => new Promise(resolve => setTimeout(resolve, 700)),
    }));
    await phase('route-loading');
    await page.locator('[data-button-bar] a[href="/portfolio.html"]').click();
    await waitForIdle('portfolio');
    stress.push('retarget-during-loading');
  }
  const settled = await page.evaluate(() => ({
    loader: document.querySelector('[data-route-transition-loader]')?.dataset.routeTransitionLoaderState,
    surfaces: [...document.querySelectorAll('.shell-transition-surface')].map(el => ({ opacity: getComputedStyle(el).opacity, inert: el.inert })),
  }));
  assert.equal(settled.loader, 'idle');
  assert.ok(settled.surfaces.every(surface => surface.opacity === '1' && !surface.inert), 'Retarget left a hidden or inert route surface');
  assert.deepEqual(errors, [], 'Runtime errors during transitions');
  await page.screenshot({ path: resolve(output, 'final.png') });
} catch (error) {
  failure = error;
  await page.screenshot({ path: resolve(output, 'failure.png') });
} finally {
  await writeFile(resolve(output, 'trace.json'), JSON.stringify({ browserName, theme, reducedMotion, viewport: { width, height }, baseUrl, errors, failure: failure?.message, stress, traces }, null, 2));
  const video = page.video();
  await context.close();
  await video?.saveAs(resolve(output, 'transitions.webm'));
  await browser.close();
}
if (failure) throw failure;
console.log(JSON.stringify({ output, results: traces.filter(trace => !trace.label.startsWith('interrupted-')).map(verifyTrace) }, null, 2));
