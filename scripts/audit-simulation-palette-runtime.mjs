#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

import { getLondonWeatherPalette } from '../react-app/app/src/palette/londonPalettes.js';
import { TIME_OF_DAY_PALETTE_PERIODS } from '../react-app/app/src/palette/timeOfDayPalette.js';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseUrl = String(process.env.ABS_SIMULATION_PALETTE_URL || 'http://localhost:8012').replace(/\/+$/, '');
const shouldStartDevServer = !process.env.ABS_SIMULATION_PALETTE_URL;
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const waitMs = Number(process.env.ABS_SIMULATION_PALETTE_WAIT_MS || 45000);

if (!['chromium', 'webkit'].includes(browserName)) {
  throw new Error(`Unsupported ABS_BROWSER=${browserName}; use chromium or webkit.`);
}

const surfaces = [
  { id: 'home', path: '/index.html?mode=pit&absAudit=palette' },
  { id: 'portfolio', path: '/portfolio.html' },
  { id: 'about', path: '/about.html' },
  { id: 'contact', path: '/contact.html' },
  { id: 'daily-repel-room', path: '/lab/repel-room.html?daily=1' },
  { id: 'daily-flock-of-birds', path: '/lab/flock-of-birds.html?daily=1' },
  { id: 'daily-rift-rings', path: '/lab/rift-rings.html?daily=1' },
];

function assert(condition, message, details = null) {
  if (condition) return;
  throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
}

async function waitForHttpReady(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`unexpected response ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw new Error(`Palette runtime server not ready at ${url}: ${lastError?.message || 'unknown error'}`);
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
    await waitForHttpReady(`${baseUrl}/index.html`, 2000);
    return null;
  } catch (error) {
    if (!shouldStartDevServer) throw error;
  }
  const server = startDevServer();
  try {
    await waitForHttpReady(`${baseUrl}/index.html`);
    return server;
  } catch (error) {
    await server.stop();
    throw new Error(`${error.message}\n${server.getLogs()}`.trim());
  }
}

async function waitForSurface(page, surfaceId) {
  await page.waitForFunction((id) => {
    const root = document.documentElement;
    const snapshot = window.__ABS_SIMULATION_PALETTE__;
    if (!snapshot || root.dataset.absBootState !== 'ready') return false;
    if ((root.dataset.absTransitionPhase || 'idle') !== 'idle') return false;
    const atmosphere = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.();
    if (
      !atmosphere
      || atmosphere.activeSourceCount !== 1
      || atmosphere.paletteGeneration !== snapshot.generation
    ) return false;
    if (id === 'home') {
      return document.getElementById('c')?.dataset.simulationPaletteGeneration === String(snapshot.generation);
    }
    if (id === 'portfolio') {
      const deck = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.getDeckDebugSnapshot?.();
      return document.body.dataset.portfolioLoadState === 'loaded'
        && deck?.isSettled === true
        && deck.particleField?.paletteGeneration === snapshot.generation;
    }
    if (id === 'about') {
      const world = document.querySelector('.about-narrative-lab');
      return world?.dataset.pointWorldState === 'ready'
        && world.dataset.simulationPaletteGeneration === String(snapshot.generation);
    }
    if (id === 'contact') {
      const stage = document.querySelector('[data-contact-ripple-stage]');
      return stage?.dataset.simulationPaletteGeneration === String(snapshot.generation)
        && Number(stage.dataset.contactRippleBodyCount || 0) > 0;
    }
    const canvas = document.querySelector('.daily-focus-runtime canvas');
    return Boolean(
      canvas
      && canvas.dataset.simulationPaletteGeneration === String(snapshot.generation)
      && !location.pathname.startsWith('/lab/'),
    );
  }, surfaceId, { timeout: waitMs, polling: 'raf' });
}

async function inspectSurface(page, surfaceId) {
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
  await waitForSurface(page, surfaceId);
  return page.evaluate(async (id) => {
    const root = document.documentElement;
    const snapshot = window.__ABS_SIMULATION_PALETTE__;
    const cssColors = Array.from({ length: 8 }, (_, index) => (
      root.style.getPropertyValue(`--ball-${index + 1}`).trim()
    ));
    const atmosphere = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.() || null;
    let consumer = null;
    if (id === 'home') {
      const globals = (await import('/src/legacy/modules/core/state.js')).getGlobals();
      consumer = {
        generation: Number(globals.simulationPaletteGeneration || 0),
        paletteId: globals.currentTemplate,
        colors: globals.currentColors?.slice?.() || [],
        distribution: globals.colorDistribution?.map?.((row) => ({ ...row })) || [],
      };
    } else if (id === 'portfolio') {
      consumer = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()
        ?.getDeckDebugSnapshot?.()?.particleField || null;
    } else if (id === 'about') {
      consumer = {
        generation: Number(document.querySelector('.about-narrative-lab')?.dataset.simulationPaletteGeneration || 0),
        paletteId: document.querySelector('.about-narrative-lab')?.dataset.simulationPaletteId || '',
        runtime: window.__aboutNarrativeRuntime?.getDiagnosticsSnapshot?.() || null,
      };
    } else if (id === 'contact') {
      consumer = {
        generation: Number(document.querySelector('[data-contact-ripple-stage]')?.dataset.simulationPaletteGeneration || 0),
        paletteId: document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRipplePaletteId || '',
        diagnostics: window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__
          ? { ...window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__ }
          : null,
      };
    } else {
      const canvas = document.querySelector('.daily-focus-runtime canvas');
      consumer = {
        generation: Number(canvas?.dataset.simulationPaletteGeneration || 0),
        paletteId: root.dataset.absSimulationPaletteId || '',
      };
    }
    const descriptor = Object.getOwnPropertyDescriptor(window, '__ABS_SIMULATION_PALETTE__');
    return {
      pathname: location.pathname,
      snapshot,
      frozen: Object.isFrozen(snapshot)
        && Object.isFrozen(snapshot?.colors)
        && Object.isFrozen(snapshot?.distribution),
      diagnosticGetterOnly: typeof descriptor?.get === 'function' && descriptor?.set === undefined,
      cssColors,
      rootGeneration: Number(root.dataset.absSimulationPaletteGeneration || 0),
      atmosphere,
      consumer,
    };
  }, surfaceId);
}

function assertSurfaceState(state, surface, period, expectedColors) {
  const context = { surface: surface.id, period: period.id, state };
  assert(state.snapshot?.paletteId === period.paletteId, 'Scheduled palette ID mismatch', context);
  assert(state.snapshot?.periodId === period.id, 'Scheduled period ID mismatch', context);
  assert(state.snapshot?.colors?.length === 8, 'Snapshot does not contain eight colours', context);
  assert(state.snapshot?.distribution?.length === 6, 'Snapshot does not contain six roles', context);
  assert(state.frozen, 'Snapshot is not deeply frozen', context);
  assert(state.diagnosticGetterOnly, 'Production diagnostic is writable', context);
  assert(JSON.stringify(state.snapshot.colors) === JSON.stringify(expectedColors), 'Snapshot colours diverge from the catalogue', context);
  assert(JSON.stringify(state.cssColors) === JSON.stringify(expectedColors), 'CSS variables contain a mixed palette', context);
  assert(state.rootGeneration === state.snapshot.generation, 'Root generation diverges from the snapshot', context);
  const consumerGeneration = state.consumer?.generation ?? state.consumer?.paletteGeneration;
  assert(consumerGeneration === state.snapshot.generation, 'Renderer generation diverges from the snapshot', context);
  assert(state.consumer?.paletteId === period.paletteId, 'Renderer palette ID diverges from the snapshot', context);
  if (state.atmosphere) {
    assert(state.atmosphere.paletteGeneration === state.snapshot.generation, 'Atmosphere generation diverges from the snapshot', context);
    assert(state.atmosphere.paletteId === period.paletteId, 'Atmosphere palette ID diverges from the snapshot', context);
  }
  if (surface.id.startsWith('daily-')) {
    assert(!state.pathname.startsWith('/lab/'), 'Daily direct load did not settle on canonical Home', context);
  }
  if (surface.id === 'portfolio') {
    assert(state.consumer.colorDistribution?.length === 6, 'Work diagnostics omit material roles', context);
    assert(Object.keys(state.consumer.roleCounts || {}).length === 6, 'Work diagnostics omit role counts', context);
  }
  if (surface.id === 'about' && state.consumer.runtime) {
    assert(state.consumer.runtime.paletteGeneration === state.snapshot.generation, 'About runtime diagnostics are stale', context);
    assert(state.consumer.runtime.materialRoles?.length === 6, 'About diagnostics omit material roles', context);
    const expectedMaterialColors = state.snapshot.distribution.map((row) => state.snapshot.colors[row.colorIndex]);
    assert(JSON.stringify(state.consumer.runtime.materialSrgbColors) === JSON.stringify(expectedMaterialColors), 'About sRGB uniforms diverge from the shared material roles', context);
  }
  if (surface.id === 'contact') {
    assert(state.consumer.diagnostics?.paletteGeneration === state.snapshot.generation, 'Contact diagnostics are stale', context);
    assert(state.consumer.diagnostics?.distribution?.length === 6, 'Contact diagnostics omit material roles', context);
  }
}

async function main() {
  const server = await ensureDevServer();
  const browser = await browserType.launch(browserName === 'chromium' ? {
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader-webgl',
      '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox',
    ],
  } : {});
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: 'Europe/London',
  });
  await context.addInitScript(() => {
    document.cookie = 'abs_portfolio_ok=1; Path=/; SameSite=Lax; Max-Age=31536000';
    sessionStorage.setItem('abs_portfolio_ok', 'simulation-palette-runtime-audit');
  });
  const page = await context.newPage();
  const results = [];
  try {
    await page.clock.install({ time: new Date(2026, 6, 18, 0, 30, 0, 0) });
    for (const period of TIME_OF_DAY_PALETTE_PERIODS) {
      await page.clock.setSystemTime(new Date(2026, 6, 18, period.startHour, 30, 0, 0));
      const expectedColors = getLondonWeatherPalette(period.paletteId)?.light;
      assert(expectedColors?.length === 8, `Missing catalogue palette ${period.paletteId}`);
      for (const surface of surfaces) {
        console.log(`[palette-runtime] browser=${browserName} period=${period.id} surface=${surface.id}`);
        await page.goto(`${baseUrl}${surface.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        try {
          await waitForSurface(page, surface.id);
        } catch (error) {
          const diagnostics = await page.evaluate(() => ({
            pathname: location.pathname,
            boot: document.documentElement.dataset.absBootState || '',
            transition: document.documentElement.dataset.absTransitionPhase || '',
            palette: window.__ABS_SIMULATION_PALETTE__ || null,
            atmosphere: window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.() || null,
            portfolio: window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.getDeckDebugSnapshot?.() || null,
            about: document.querySelector('.about-narrative-lab')?.dataset || null,
            contact: document.querySelector('[data-contact-ripple-stage]')?.dataset || null,
            dailyCanvas: document.querySelector('.daily-focus-runtime canvas')?.dataset || null,
          }));
          throw new Error(`Palette runtime did not become ready for ${period.id}/${surface.id}\n${JSON.stringify(diagnostics, null, 2)}`, {
            cause: error,
          });
        }
        const state = await inspectSurface(page, surface.id);
        assertSurfaceState(state, surface, period, expectedColors);
        results.push({
          periodId: period.id,
          paletteId: period.paletteId,
          surfaceId: surface.id,
          generation: state.snapshot.generation,
        });
      }
    }
  } finally {
    await context.close();
    await browser.close();
    await server?.stop();
  }
  console.log(`PASS: ${results.length} direct palette states passed in ${browserName} (8 periods × ${surfaces.length} production surfaces).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
