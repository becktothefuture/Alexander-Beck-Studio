#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium, webkit } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'contact-ripple');
const baseUrl = String(process.env.ABS_CONTACT_RIPPLE_URL || 'http://localhost:8012').replace(/\/+$/, '');
const shouldStartDevServer = !process.env.ABS_CONTACT_RIPPLE_URL;
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const boundaryOnly = process.env.ABS_CONTACT_RIPPLE_BOUNDARY_ONLY === '1';
const viewports = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 375, height: 812 },
];

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

async function waitForHttpReady(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      const body = await response.text();
      if (response.ok && body.includes('Alexander Beck Studio')) return;
      lastError = new Error(`unexpected response ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw new Error(`Contact ripple server not ready at ${url}: ${lastError?.message || 'unknown error'}`);
}

function startDevServer() {
  const child = spawn('npm', ['run', 'dev:react'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk.toString(); });
  child.stderr.on('data', (chunk) => { logs += chunk.toString(); });
  return {
    getLogs: () => logs,
    stop: async () => {
      if (child.exitCode !== null) return;
      child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveStop) => child.once('exit', resolveStop)),
        delay(2000),
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
    },
  };
}

async function ensureDevServer() {
  try {
    await waitForHttpReady(`${baseUrl}/contact.html`, 2000);
    return null;
  } catch (error) {
    if (!shouldStartDevServer) throw error;
  }

  const server = startDevServer();
  try {
    await waitForHttpReady(`${baseUrl}/contact.html`);
    return server;
  } catch (error) {
    await server.stop();
    throw new Error(`${error.message}\n${server.getLogs()}`.trim());
  }
}

async function waitForIdle(page) {
  await page.waitForFunction(() => {
    const phase = document.documentElement.dataset.absTransitionPhase || 'idle';
    const bootState = document.documentElement.dataset.absBootState || 'ready';
    return phase === 'idle' && bootState !== 'booting';
  }, null, { timeout: 30000 });
}

async function waitForRipple(page, expectedState = null) {
  await page.waitForSelector('[data-contact-ripple-stage] [data-contact-ripple-canvas]', {
    state: 'attached',
    timeout: 20000,
  });
  await page.waitForFunction((state) => {
    const stage = document.querySelector('[data-contact-ripple-stage]');
    const canvas = document.querySelector('[data-contact-ripple-canvas]');
    if (!stage || !canvas || canvas.width < 64 || canvas.height < 64) return false;
    if (Number(canvas.dataset.contactRippleDpr || 0) <= 0) return false;
    if (Number(stage.dataset.contactRippleBodyCount || 0) <= 0) return false;
    const currentState = stage.dataset.contactRippleState || '';
    return state ? currentState === state : !['loading', 'created', 'destroyed'].includes(currentState);
  }, expectedState, { timeout: 20000 });
}

async function readRippleState(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('[data-contact-ripple-stage]');
    const canvas = document.querySelector('[data-contact-ripple-canvas]');
    const content = document.querySelector('.contact-route__inner');
    const button = document.querySelector('[data-copy-email]');
    const rectOf = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const stageStyle = stage ? getComputedStyle(stage) : null;
    const canvasStyle = canvas ? getComputedStyle(canvas) : null;
    const contentStyle = content ? getComputedStyle(content) : null;
    const audioEvents = window.__ABS_SIMULATION_AUDIO__?.events || [];
    const motifEvents = audioEvents.filter((event) => event?.type === 'contact-ripple-motif');
    let motifEvent = null;
    for (let eventIndex = audioEvents.length - 1; eventIndex >= 0; eventIndex -= 1) {
      if (audioEvents[eventIndex]?.type === 'contact-ripple-motif') {
        motifEvent = audioEvents[eventIndex];
        break;
      }
    }
    return {
      path: location.pathname,
      stageState: stage?.dataset.contactRippleState || '',
      burstCount: Number(stage?.dataset.contactRippleBurstCount || 0),
      activeBurstCount: Number(stage?.dataset.contactRippleActiveBurstCount || 0),
      maxActiveBursts: Number(stage?.dataset.contactRippleMaxActiveBursts || 0),
      burstMode: stage?.dataset.contactRippleBurstMode || '',
      burstColor: stage?.dataset.contactRippleBurstColor || '',
      paletteId: stage?.dataset.contactRipplePaletteId || '',
      palette: (stage?.dataset.contactRipplePalette || '').split(',').filter(Boolean),
      burstOrigin: stage?.dataset.contactRippleBurstOrigin || '',
      lastBurstOrigin: stage?.dataset.contactRippleLastBurstOrigin || '',
      bodyCount: Number(stage?.dataset.contactRippleBodyCount || 0),
      ringCount: Number(stage?.dataset.contactRippleRingCount || 0),
      paletteGeneration: Number(stage?.dataset.simulationPaletteGeneration || 0),
      bodyRadius: Number(stage?.dataset.contactRippleBodyRadius || 0),
      innerAlpha: Number(stage?.dataset.contactRippleInnerAlpha || 0),
      outerAlpha: Number(stage?.dataset.contactRippleOuterAlpha || 0),
      idleInnerAlpha: Number(stage?.dataset.contactRippleIdleInnerAlpha || 0),
      idleOuterAlpha: Number(stage?.dataset.contactRippleIdleOuterAlpha || 0),
      burstPeakAlpha: Number(stage?.dataset.contactRippleBurstPeakAlpha || 0),
      coreFadeRadius: Number(stage?.dataset.contactRippleCoreFadeRadius || 0),
      burstRelease: stage?.dataset.contactRippleBurstRelease || '',
      ballFinish: stage?.dataset.contactRippleBallFinish || '',
      bodyMaterialEnabled: window.__ABS_SIMULATION_BODY_MATERIAL__?.getConfig?.().enabled === true,
      pointerMode: stage?.dataset.contactRipplePointerMode || '',
      ringDirections: stage?.dataset.contactRippleRingDirections || '',
      pointerMaxDegrees: Number(stage?.dataset.contactRipplePointerMaxDegrees || 0),
      configControlCount: Number(stage?.dataset.contactRippleConfigControls || 0),
      innerRingsRemoved: Number(stage?.dataset.contactRippleInnerRingsRemoved || 0),
      config: window.__ABS_CONTACT_RIPPLE_CONFIG__ || null,
      paletteSize: Number(stage?.dataset.contactRipplePaletteSize || 0),
      surface: stage?.dataset.contactRippleSurface || '',
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      canvasClientWidth: canvas?.clientWidth || 0,
      canvasClientHeight: canvas?.clientHeight || 0,
      canvasDpr: Number(canvas?.dataset.contactRippleDpr || 0),
      stageRect: rectOf(stage),
      canvasRect: rectOf(canvas),
      contentRect: rectOf(content),
      buttonRect: rectOf(button),
      typographyEffectPresent: Boolean(
        content?.dataset.contactTypographyImpact
        || document.querySelector('.is-typography-emphasized, .is-typography-scattering'),
      ),
      stageZ: Number(stageStyle?.zIndex || 0),
      contentZ: Number(contentStyle?.zIndex || 0),
      canvasPointerEvents: canvasStyle?.pointerEvents || '',
      diagnostics: window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__
        ? { ...window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__ }
        : null,
      soundMotifCount: Number(window.__ABS_SIMULATION_AUDIO__?.byType?.['contact-ripple-motif'] || 0),
      soundMotifCharacter: motifEvent?.character || '',
      soundMotifLayerCount: Number(motifEvent?.layerCount || 0),
      soundMotifNoteCount: Number(motifEvent?.noteCount || 0),
      soundMotifVariation: motifEvent?.variation || '',
      soundMotifVariationIndex: Number(motifEvent?.variationIndex ?? -1),
      soundMotifVariationCount: Number(motifEvent?.variationCount || 0),
      soundMotifVariationHistory: motifEvents.slice(-8).map((event) => Number(event.variationIndex ?? -1)),
      soundMotifRingOffsetsMs: Array.isArray(motifEvent?.ringOffsetsMs)
        ? motifEvent.ringOffsetsMs.map((offset) => Number(offset || 0))
        : [],
      soundMotifTailReleaseMs: Number(motifEvent?.tailReleaseMs || 0),
      soundMotifDurationMs: Number(motifEvent?.durationMs || 0),
      soundEnabled: document.querySelector('.button-bar__sound-toggle')?.dataset.enabled || 'false',
    };
  });
}

function assertLayout(state, viewport) {
  assert(state.canvasWidth >= Math.floor(state.canvasClientWidth * state.canvasDpr) - 2, 'Canvas backing width is undersized', state);
  assert(state.canvasHeight >= Math.floor(state.canvasClientHeight * state.canvasDpr) - 2, 'Canvas backing height is undersized', state);
  assert(state.canvasDpr > 0 && state.canvasDpr <= 1.5, 'Canvas DPR cap failed', state);
  assert(state.paletteSize >= 6, 'Contact ripple did not load the site palette', state);
  assert(state.bodyCount >= 40, 'Contact ripple fixed body field is unexpectedly sparse', state);
  assert(state.bodyCount <= 560, 'Contact ripple fixed body field is too dense for the Contact treatment', state);
  assert(state.ringCount > 0, 'Contact ripple did not expose its stable ring count', state);
  assert(
    state.config?.burstDurationMs >= 500 && state.config?.burstDurationMs <= 4000,
    'Contact ripple canonical config did not load',
    state,
  );
  assert(
    state.bodyRadius >= state.config.minBodyRadius && state.bodyRadius <= state.config.maxBodyRadius,
    'Contact ripple body radius does not match the active Contact configuration',
    state,
  );
  assert(state.configControlCount >= 17, 'Contact ripple parameter surface is incomplete', state);
  assert(
    state.innerRingsRemoved === state.config.innerRingSkipCount,
    'Contact ripple did not remove the configured number of inner rings',
    state,
  );
  assert(
    Math.abs(state.innerAlpha - state.config.innerRingAlpha) <= 0.005,
    'Inner Contact opacity does not match the active Contact configuration',
    state,
  );
  assert(
    Math.abs(state.outerAlpha - state.config.outerRingAlpha) <= 0.005,
    'Outer Contact opacity does not match the active Contact configuration',
    state,
  );
  assert(
    Math.abs(state.idleInnerAlpha - state.innerAlpha) <= 0.005,
    'Contact idle inner opacity is not fully aligned with the configured opacity',
    state,
  );
  assert(
    Math.abs(state.idleOuterAlpha - state.outerAlpha) <= 0.005,
    'Contact idle outer opacity is not fully aligned with the configured opacity',
    state,
  );
  assert(state.idleInnerAlpha >= 0.995 && state.idleOuterAlpha >= 0.995, 'Contact default field is not fully opaque', state);
  assert(Math.abs(state.burstPeakAlpha - 1) <= 0.005, 'Contact pulse peak opacity is not full strength', state);
  assert(state.coreFadeRadius > state.bodyRadius * 10, 'Contact core fade is unexpectedly narrow', state);
  assert(state.burstRelease === 'smoothstep-tail', 'Contact burst is missing its eased release phase', state);
  assert(state.burstMode === 'additive-wavefronts', 'Contact ripple does not use additive wavefront launches', state);
  assert(state.paletteId, 'Contact ripple did not expose the shared time-of-day palette', state);
  assert(
    state.palette.map((color) => color.toLowerCase()).includes(state.burstColor.toLowerCase()),
    'Contact ripple burst color is outside the shared time-of-day palette',
    state,
  );
  assert(state.burstOrigin === 'center', 'Contact ripple burst is not configured to originate from the Contact field center', state);
  assert(
    state.ballFinish === (state.bodyMaterialEnabled ? 'cached-sphere-sticker' : 'flat-fill'),
    'Contact balls do not match the enabled shared sphere-material state',
    state,
  );
  assert(state.pointerMode === 'autonomous-drift', 'Contact pointer influence is still active', state);
  assert(state.ringDirections === 'alternating', 'Contact rings do not counter-rotate', state);
  assert(state.pointerMaxDegrees === 0, 'Contact pointer rotation range is still enabled', state);
  assert(state.canvasPointerEvents === 'none', 'Decorative canvas captured pointer events', state);
  assert(state.stageZ < state.contentZ, 'Contact content is not above the ripple stage', state);
  assert(state.stageRect?.width > viewport.width * 0.75, 'Ripple stage does not fill the studio window', state);
  assert(state.stageRect?.height > viewport.height * 0.65, 'Ripple stage height is too small', state);
  assert(state.buttonRect && state.contentRect, 'Contact content geometry is missing', state);
  assert(state.typographyEffectPresent === false, 'Contact typography effect is still present', state);
  assert(state.diagnostics?.activeInstances === 1, 'Unexpected active Contact ripple instance count', state);
  assert(state.diagnostics?.paletteGeneration === state.paletteGeneration, 'Contact diagnostics report a mixed palette generation', state);
  assert(state.diagnostics?.colors?.length === 8, 'Contact diagnostics do not expose all eight palette colours', state);
  assert(state.diagnostics?.distribution?.length === 6, 'Contact diagnostics do not expose all six material roles', state);
}

async function runPaletteBoundaryScenario(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: 'Europe/London',
  });
  const page = await context.newPage();
  try {
    await page.clock.install({ time: new Date(2026, 6, 18, 8, 59, 30, 0) });
    await page.goto(`${baseUrl}/contact.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    await waitForRipple(page, 'idle');
    await page.clock.fastForward(4000);
    await waitForRipple(page, 'idle');
    await page.clock.setSystemTime(new Date(2026, 6, 18, 8, 59, 59, 800));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('abs:contact-ripple-burst')));
    await waitForRipple(page, 'burst');
    const before = await readRippleState(page);
    await page.clock.fastForward(400);
    try {
      await page.waitForFunction((generation) => (
        Number(document.querySelector('[data-contact-ripple-stage]')?.dataset.simulationPaletteGeneration || 0)
          > generation
      ), before.paletteGeneration, { timeout: 5000, polling: 'raf' });
    } catch (error) {
      const clockState = await page.evaluate(() => ({
        now: Date.now(),
        local: new Date().toString(),
        snapshot: window.__ABS_SIMULATION_PALETTE__ || null,
        rootGeneration: document.documentElement.dataset.absSimulationPaletteGeneration || '',
      }));
      throw new Error(`Contact palette boundary did not advance\n${JSON.stringify(clockState, null, 2)}`, {
        cause: error,
      });
    }
    const after = await readRippleState(page);
    assert(after.paletteGeneration === before.paletteGeneration + 1, 'Contact did not commit exactly one boundary generation', { before, after });
    assert(after.paletteId !== before.paletteId, 'Contact palette ID did not change at the boundary', { before, after });
    assert(after.diagnostics?.rendererInstanceId === before.diagnostics?.rendererInstanceId, 'Contact renderer was recreated at the boundary', { before, after });
    assert(after.diagnostics?.bodyBuildCount === before.diagnostics?.bodyBuildCount, 'Contact ring bodies were rebuilt at the boundary', { before, after });
    assert(after.ringCount === before.ringCount && after.bodyCount === before.bodyCount, 'Contact ring geometry changed at the boundary', { before, after });
    assert(after.activeBurstCount === before.activeBurstCount, 'Contact lost an in-flight burst at the boundary', { before, after });
    assert(after.diagnostics?.spriteBuildCount === before.diagnostics?.spriteBuildCount + 1, 'Contact did not replace its palette sprites exactly once', { before, after });
    return { before, after };
  } finally {
    await context.close();
  }
}

async function exerciseAutonomousDrift(page, initial) {
  const stage = initial.stageRect;
  assert(stage, 'Contact autonomous drift audit is missing stage geometry', initial);
  const initialDrift = Number(initial.diagnostics?.driftRotation || 0);
  await page.waitForFunction((previousDrift) => (
    Math.abs(Number(window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__?.driftRotation || 0) - previousDrift) > 0.002
  ), initialDrift);
  const drifted = await readRippleState(page);
  assert(drifted.diagnostics.pointerActive === false, 'Contact drift unexpectedly activated pointer state', drifted);
  assert(Number(drifted.diagnostics.pointerRotation || 0) === 0, 'Contact autonomous drift retained pointer rotation', drifted);
  assert(Number(drifted.diagnostics.pointerTarget || 0) === 0, 'Contact autonomous drift retained pointer target', drifted);
  assert(Number(drifted.diagnostics.pointerSpeedBoost || 0) === 0, 'Contact autonomous drift retained pointer speed boost', drifted);

  const y = stage.top + (stage.height * 0.52);
  await page.mouse.move(stage.left + (stage.width * 0.78), y, { steps: 8 });
  await page.mouse.move(stage.left + (stage.width * 0.22), y, { steps: 8 });
  await page.waitForTimeout(80);
  const afterMouse = await readRippleState(page);
  assert(afterMouse.diagnostics.pointerActive === false, 'Mouse movement activated Contact pointer influence', afterMouse);
  assert(Number(afterMouse.diagnostics.pointerRotation || 0) === 0, 'Mouse movement changed Contact pointer rotation', afterMouse);
  assert(Number(afterMouse.diagnostics.pointerTarget || 0) === 0, 'Mouse movement changed Contact pointer target', afterMouse);
  assert(Number(afterMouse.diagnostics.pointerSpeedBoost || 0) === 0, 'Mouse movement changed Contact pointer speed boost', afterMouse);
  await page.mouse.move(2, 2);
  return { drifted, afterMouse };
}

async function forceClipboardFailure(page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('audit clipboard failure')) },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: () => false,
    });
  });
}

async function runStandardScenario(browser, viewport, theme) {
  const contextOptions = {
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'no-preference',
  };
  if (browserName === 'chromium') {
    contextOptions.permissions = ['clipboard-read', 'clipboard-write'];
  }
  const context = await browser.newContext(contextOptions);
  await context.addInitScript((initialTheme) => {
    localStorage.setItem('theme-preference-v3', initialTheme);
    localStorage.removeItem('theme-preference');
  }, theme);
  if (browserName === 'webkit') {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.resolve() },
      });
    });
  }
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));

  try {
    await page.goto(`${baseUrl}/contact.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    await waitForRipple(page, 'idle');
    const initial = await readRippleState(page);
    assertLayout(initial, viewport);
    const autonomousDrift = await exerciseAutonomousDrift(page, initial);

    const button = page.locator('[data-copy-email]');
    await button.click();
    await page.waitForFunction((previousCount) => (
      Number(document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRippleBurstCount || 0) > previousCount
    ), initial.burstCount);
    await page.waitForFunction(() => document.querySelector('[data-copy-status]')?.textContent.trim() === 'Copied');
    await page.waitForFunction((previousCount) => (
      Number(window.__ABS_SIMULATION_AUDIO__?.byType?.['contact-ripple-motif'] || 0) > previousCount
    ), initial.soundMotifCount, { timeout: 5000 });

    const immediateStart = (await readRippleState(page)).burstCount;
    await page.evaluate(() => document.querySelector('[data-copy-email]')?.click());
    await page.waitForFunction((previousCount) => (
      Number(document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRippleBurstCount || 0) > previousCount
    ), immediateStart);
    const successBurst = await readRippleState(page);
    assert(successBurst.stageState === 'burst', 'Email activation did not immediately enter burst state', successBurst);
    const [originX, originY] = successBurst.lastBurstOrigin.split(',').map(Number);
    const canvasCenterX = successBurst.canvasRect.width * 0.5;
    const canvasCenterY = successBurst.canvasRect.height * 0.5;
    assert(
      Number.isFinite(originX) && Number.isFinite(originY)
        && Math.abs(originX - canvasCenterX) <= 2
        && Math.abs(originY - canvasCenterY) <= 2,
      'Email activation did not originate the color wave from the Contact field center',
      successBurst,
    );
    assert(successBurst.bodyCount === initial.bodyCount, 'Burst changed the number of rendered balls', { initial, successBurst });
    assert(Math.abs(successBurst.bodyRadius - initial.bodyRadius) <= 0.08, 'Burst changed the rendered ball size', { initial, successBurst });
    assert(successBurst.soundEnabled === 'true', 'First Contact activation did not unlock the requested sound motif', successBurst);
    assert(successBurst.soundMotifCharacter === 'bright-lift-ripple', 'Contact motif character is stale', successBurst);
    assert(successBurst.soundMotifLayerCount >= 4, 'Contact motif is missing its bright lifted ripple layers', successBurst);
    assert(successBurst.soundMotifNoteCount >= 8, 'Contact motif bright lifted event stack is unexpectedly sparse', successBurst);
    assert(successBurst.soundMotifVariationCount === 4, 'Contact motif variation cycle is incomplete', successBurst);
    assert(successBurst.soundMotifVariationIndex >= 0, 'Contact motif variation metadata is missing', successBurst);
    assert(successBurst.soundMotifRingOffsetsMs.length === 5, 'Contact motif is missing ring-synced offsets', successBurst);
    assert(
      successBurst.soundMotifRingOffsetsMs[0] < successBurst.soundMotifRingOffsetsMs[1]
        && successBurst.soundMotifRingOffsetsMs[1] < successBurst.soundMotifRingOffsetsMs[2]
        && successBurst.soundMotifRingOffsetsMs[2] < successBurst.soundMotifRingOffsetsMs[3]
        && successBurst.soundMotifRingOffsetsMs[3] < successBurst.soundMotifRingOffsetsMs[4],
      'Contact motif ring offsets do not travel outward in time',
      successBurst,
    );
    assert(successBurst.typographyEffectPresent === false, 'Copy activated a typography effect', successBurst);
    assert(successBurst.soundMotifTailReleaseMs >= 560, 'Contact motif release tail is too short', successBurst);
    assert(successBurst.soundMotifDurationMs >= 2200, 'Contact motif still ends too abruptly', successBurst);
    assert(successBurst.soundMotifDurationMs <= 2500, 'Contact motif tail is longer than intended', successBurst);

    const rapidStart = successBurst.burstCount;
    for (let clickIndex = 1; clickIndex <= 3; clickIndex += 1) {
      await page.evaluate(() => document.querySelector('[data-copy-email]')?.click());
      await page.waitForFunction((expectedCount) => (
        Number(document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRippleBurstCount || 0) >= expectedCount
      ), rapidStart + clickIndex);
    }
    const rapidBurst = await readRippleState(page);
    assert(rapidBurst.stageState === 'burst', 'Rapid activation did not restart the active burst', rapidBurst);
    assert(rapidBurst.activeBurstCount >= 2, 'Rapid activation replaced the active ripple instead of layering wavefronts', rapidBurst);
    assert(rapidBurst.maxActiveBursts >= 2, 'Contact ripple did not record overlapping wavefronts', rapidBurst);
    assert(
      rapidBurst.diagnostics?.maxConcurrentBursts >= 2,
      'Contact ripple diagnostics did not capture concurrent wavefronts',
      rapidBurst,
    );
    assert(rapidBurst.bodyCount === initial.bodyCount, 'Rapid activation changed the fixed body count', { initial, rapidBurst });
    assert(
      new Set(rapidBurst.soundMotifVariationHistory).size === 4,
      'Rapid activation did not advance through the full ripple-sound variation cycle',
      rapidBurst,
    );
    assert(rapidBurst.typographyEffectPresent === false, 'Rapid activation triggered a typography effect', rapidBurst);

    await forceClipboardFailure(page);
    const failureStart = rapidBurst.burstCount;
    await page.evaluate(() => document.querySelector('[data-copy-email]')?.click());
    await page.waitForFunction((previousCount) => (
      Number(document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRippleBurstCount || 0) > previousCount
    ), failureStart);
    await page.waitForFunction(() => document.querySelector('[data-copy-status]')?.textContent.trim() === 'Copy failed');
    const failureBurst = await readRippleState(page);
    assert(failureBurst.stageState === 'burst', 'Clipboard failure suppressed the ripple burst', failureBurst);
    assert(failureBurst.bodyCount === initial.bodyCount, 'Clipboard failure changed the fixed body count', { initial, failureBurst });
    assert(failureBurst.typographyEffectPresent === false, 'Clipboard failure triggered a typography effect', failureBurst);

    const originalSurface = failureBurst.surface;
    await page.evaluate(() => {
      document.querySelector('[aria-label*="dark mode"], [aria-label*="light mode"]')?.click();
    });
    await page.waitForFunction((surface) => {
      const nextSurface = document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRippleSurface || '';
      return Boolean(nextSurface && nextSurface !== surface);
    }, originalSurface);
    const toggled = await readRippleState(page);
    assert(toggled.diagnostics?.activeInstances === 1, 'Theme change remounted duplicate ripple instances', toggled);
    assert(toggled.bodyCount === initial.bodyCount, 'Theme change changed the fixed body geometry', { initial, toggled });

    await page.screenshot({
      path: resolve(outputRoot, `${viewport.label}-${theme}-${browserName}-burst.png`),
      fullPage: false,
    });
    await waitForRipple(page, 'idle');
    const settled = await readRippleState(page);
    assert(settled.activeBurstCount === 0, 'Settled Contact ripple still has active wavefronts', settled);
    assert(settled.bodyCount === initial.bodyCount, 'Burst settlement changed the fixed body count', { initial, settled });
    assert(Math.abs(settled.bodyRadius - initial.bodyRadius) <= 0.08, 'Burst settlement changed the rendered ball size', { initial, settled });
    assert(settled.typographyEffectPresent === false, 'Typography effect appeared after settlement', settled);

    await page.locator('[data-route-tab="about"]').click();
    await page.waitForURL(/about\.html/, { timeout: 30000 });
    await waitForIdle(page);
    await page.waitForFunction(() => (
      !document.querySelector('[data-contact-ripple-canvas]')
      && window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__?.activeInstances === 0
    ));
    await page.locator('[data-route-tab="contact"]').click();
    await page.waitForURL(/contact\.html/, { timeout: 30000 });
    await waitForIdle(page);
    await waitForRipple(page, 'idle');
    const remounted = await readRippleState(page);
    assert(remounted.diagnostics?.activeInstances === 1, 'Contact ripple did not remount cleanly', remounted);
    assert(remounted.diagnostics?.destroyedInstances >= 1, 'Contact ripple teardown was not recorded', remounted);
    assert(pageErrors.length === 0, 'Page errors occurred during the standard ripple scenario', pageErrors);

    return { initial, autonomousDrift, successBurst, rapidBurst, failureBurst, toggled, settled, remounted };
  } finally {
    await context.close();
  }
}

async function runReducedMotionScenario(browser) {
  const contextOptions = {
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce',
  };
  if (browserName === 'chromium') {
    contextOptions.permissions = ['clipboard-read', 'clipboard-write'];
  }
  const context = await browser.newContext(contextOptions);
  if (browserName === 'webkit') {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.resolve() },
      });
    });
  }
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/contact.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    await waitForRipple(page, 'reduced-idle');
    const initial = await readRippleState(page);
    assert(initial.pointerMode === 'disabled-reduced-motion', 'Reduced motion did not disable pointer rotation', initial);
    assert(Number(initial.diagnostics?.pointerRotation || 0) === 0, 'Reduced motion retained pointer rotation', initial);
    await page.locator('[data-copy-email]').click();
    await waitForRipple(page, 'reduced-burst');
    const burst = await readRippleState(page);
    assert(burst.burstCount === initial.burstCount + 1, 'Reduced-motion burst count did not increment', { initial, burst });
    assert(burst.typographyEffectPresent === false, 'Reduced motion retained a typography effect', burst);
    await page.waitForFunction(() => (
      document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRippleState === 'reduced-idle'
    ), null, { timeout: 3000 });
    return { initial, burst, settled: await readRippleState(page) };
  } finally {
    await context.close();
  }
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const server = await ensureDevServer();
  const browser = await browserType.launch();
  const results = [];
  try {
    if (!boundaryOnly) {
      for (const viewport of viewports) {
        for (const theme of ['light', 'dark']) {
          results.push({
            viewport: viewport.label,
            theme,
            scenario: await runStandardScenario(browser, viewport, theme),
          });
        }
      }
      results.push({ reducedMotion: await runReducedMotionScenario(browser) });
    }
    results.push({ paletteBoundary: await runPaletteBoundaryScenario(browser) });
  } finally {
    await browser.close();
    await server?.stop();
  }

  await writeFile(
    resolve(outputRoot, `contact-ripple-${browserName}.json`),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  console.log(boundaryOnly
    ? `PASS: Contact ripple live palette-boundary audit passed in ${browserName}.`
    : `PASS: Contact ripple audit passed in ${browserName} across desktop/mobile, light/dark, failure, rapid-click, reduced-motion, SPA lifecycle, and live palette-boundary states.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
