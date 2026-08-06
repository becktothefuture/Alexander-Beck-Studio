#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseUrl = String(process.env.ABS_SIMULATION_PALETTE_URL || 'http://localhost:8012').replace(/\/+$/, '');
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const shouldStartServer = !process.env.ABS_SIMULATION_PALETTE_URL;
const allSurfaces = [
  { id: 'home', path: '/index.html?mode=pit&absAudit=palette', homeMode: 'pit' },
  { id: 'home-elastic-center', path: '/index.html?mode=elastic-center&absAudit=palette', homeMode: 'elastic-center' },
  { id: 'home-starfield-3d', path: '/index.html?mode=starfield-3d&absAudit=palette', homeMode: 'starfield-3d' },
  { id: 'home-critters', path: '/index.html?mode=critters&absAudit=palette', homeMode: 'critters' },
  { id: 'home-pressure-crucible', path: '/index.html?mode=pressure-crucible&absAudit=palette', homeMode: 'pressure-crucible' },
  { id: 'portfolio', path: '/portfolio.html', drawer: true },
  { id: 'about-discipline', path: '/about.html', storyWU: 8.72, stage: 'calm-field-v1' },
  { id: 'about-bust', path: '/about.html', storyWU: 14.85, stage: 'bust-v1' },
  { id: 'contact', path: '/contact.html' },
  { id: 'daily-repel-room', path: '/lab/repel-room.html?daily=1' },
  { id: 'daily-flock-of-birds', path: '/lab/flock-of-birds.html?daily=1' },
];
const surfaceFilter = String(process.env.ABS_SIMULATION_PALETTE_SURFACE || '').trim();
const surfaces = surfaceFilter
  ? allSurfaces.filter((surface) => surface.id === surfaceFilter)
  : allSurfaces;

function assert(condition, message, details) {
  if (!condition) throw new Error(`${message}\n${JSON.stringify(details, null, 2)}`);
}

async function waitForHttp(url, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if ((await fetch(url)).ok) return; } catch { /* retry */ }
    await delay(200);
  }
  throw new Error(`Palette boundary server unavailable at ${url}`);
}

async function ensureServer() {
  try { await waitForHttp(`${baseUrl}/index.html`, 2000); return null; } catch (error) {
    if (!shouldStartServer) throw error;
  }
  const child = spawn('npm', ['run', 'dev:react'], { cwd: repoRoot, stdio: 'ignore', env: { ...process.env } });
  await waitForHttp(`${baseUrl}/index.html`);
  return async () => {
    if (child.exitCode !== null) return;
    child.kill('SIGTERM');
    await Promise.race([new Promise((resolveExit) => child.once('exit', resolveExit)), delay(2000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  };
}

async function waitReady(page, surface) {
  await page.waitForFunction(({ id, homeMode }) => {
    const root = document.documentElement;
    const snapshot = window.__ABS_SIMULATION_PALETTE__;
    const atmosphere = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.();
    if (!snapshot || root.dataset.absBootState !== 'ready' || (root.dataset.absTransitionPhase || 'idle') !== 'idle') return false;
    if (atmosphere?.activeSourceCount !== 1 || atmosphere.paletteGeneration !== snapshot.generation) return false;
    if (homeMode) {
      const canvas = document.getElementById('c');
      const globals = window.__ABS_HOME_AUDIT__?.getGlobals?.();
      if (canvas?.dataset.simulationPaletteGeneration !== String(snapshot.generation)
        || globals?.currentMode !== homeMode) return false;
      if (homeMode === 'starfield-3d') {
        return Number(canvas.dataset.simulationBodyCount || 0) > 0
          && canvas.dataset.starfieldPaletteGeneration === String(snapshot.generation);
      }
      return globals.balls?.length > 0;
    }
    if (id === 'portfolio') return window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.getDeckDebugSnapshot?.()?.particleField?.paletteGeneration === snapshot.generation;
    if (id.startsWith('about-')) return document.querySelector('.about-narrative-lab')?.dataset.pointWorldState === 'ready'
      && Boolean(window.__aboutNarrativeRuntime);
    if (id === 'contact') return document.querySelector('[data-contact-ripple-stage]')?.dataset.simulationPaletteGeneration === String(snapshot.generation);
    return document.querySelector('.daily-focus-runtime canvas')?.dataset.simulationPaletteGeneration === String(snapshot.generation);
  }, surface, { timeout: 45000, polling: 'raf' });
}

async function prepareState(page, surface) {
  if (surface.drawer) {
    await page.locator('.portfolio-project-card.is-active').click();
    await page.waitForFunction(() => document.body.classList.contains('portfolio-project-open')
      && document.getElementById('portfolioProjectView')?.classList.contains('is-open'));
  }
  if (surface.storyWU) {
    await page.locator('.about-narrative-scrollport').evaluate((node, storyWU) => {
      node.scrollTop = (node.scrollHeight - node.clientHeight) * (storyWU / 16.35);
      node.dispatchEvent(new Event('scroll', { bubbles: true }));
    }, surface.storyWU);
    try {
      await page.waitForFunction(({ id, stage }) => {
        const root = document.querySelector('.about-narrative-lab');
        const narrativeStateReady = id === 'about-discipline'
          ? Number(root?.dataset.worldDisciplineLabels || 0) > 0
          : true;
        return root?.dataset.worldStage === stage
          && root.dataset.worldPrepare === 'ready'
          && narrativeStateReady;
      }, surface, { timeout: 30000, polling: 'raf' });
    } catch (error) {
      const state = await page.evaluate(() => ({
        root: { ...document.querySelector('.about-narrative-lab')?.dataset },
        scroll: (() => { const node = document.querySelector('.about-narrative-scrollport'); return node ? { top: node.scrollTop, height: node.scrollHeight, client: node.clientHeight } : null; })(),
        diagnostics: window.__aboutNarrativeRuntime?.getDiagnosticsSnapshot?.(),
      }));
      throw new Error(`About boundary state did not settle\n${JSON.stringify(state, null, 2)}`, { cause: error });
    }
  }
}

async function installMarker(page, surface) {
  await page.evaluate(({ id: surfaceId, homeMode }) => {
    const marker = { surfaceId, homeMode };
    if (homeMode) {
      const audit = window.__ABS_HOME_AUDIT__;
      const globals = audit.getGlobals();
      Object.assign(marker, {
        runtime: audit,
        canvas: document.getElementById('c'),
        items: globals.balls.slice(),
        roles: globals.balls.map((b) => b.distributionIndex),
        radii: globals.balls.map((b) => b.rBase ?? b._tensionLoom?.baseRadius ?? b.r),
        mode: globals.currentMode,
        bodyCount: Number(document.getElementById('c')?.dataset.simulationBodyCount || 0),
      });
    } else if (surfaceId === 'portfolio') {
      const app = window.__ABS_PORTFOLIO_AUDIT__.getApp();
      Object.assign(marker, { runtime: app, field: app.particleField, items: app.particleField.particles.slice(), roles: app.particleField.particles.map((p) => p.roleId) });
    } else if (surfaceId.startsWith('about-')) {
      const root = document.querySelector('.about-narrative-lab');
      const runtime = window.__aboutNarrativeRuntime;
      const d = runtime.getDiagnosticsSnapshot();
      Object.assign(marker, { runtime, canvas: document.querySelector('.about-narrative-world__canvas'), runtimeId: d.runtimeInstanceId, geometryId: d.geometryInstanceId, bufferRebuilds: root.dataset.worldBufferRebuilds || '', storyWU: Number(root.dataset.narrativeStoryWu), stage: root.dataset.worldStage, pairId: d.installedPairId });
    } else if (surfaceId === 'contact') {
      const d = window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__;
      Object.assign(marker, { stage: document.querySelector('[data-contact-ripple-stage]'), rendererId: d.rendererInstanceId, buildCount: d.bodyBuildCount, ringCount: d.ringCount, bodyCount: d.bodyCount });
    } else {
      const canvas = document.querySelector('.daily-focus-runtime canvas');
      Object.assign(marker, { canvas, buildCount: Number(canvas.dataset.simulationStateBuildCount || 0), bodyCount: Number(canvas.dataset.simulationBodyCount || 0) });
    }
    window.__ABS_PALETTE_BOUNDARY_MARKER__ = marker;
  }, surface);
}

async function readState(page, surface) {
  return page.evaluate(({ id: surfaceId, homeMode }) => {
    const marker = window.__ABS_PALETTE_BOUNDARY_MARKER__;
    const snapshot = window.__ABS_SIMULATION_PALETTE__;
    let identity = false; let roles = true; let geometry = true; let routeState = true; let palette = true; let detail = null;
    if (homeMode) {
      const audit = window.__ABS_HOME_AUDIT__; const g = audit.getGlobals();
      const canvas = document.getElementById('c');
      routeState = g.currentMode === marker.mode;
      if (homeMode === 'starfield-3d') {
        const renderedColors = String(canvas?.dataset.starfieldPaletteColors || '').split(',').filter(Boolean);
        identity = marker.runtime === audit && marker.canvas === canvas;
        geometry = marker.bodyCount === Number(canvas?.dataset.simulationBodyCount || 0);
        palette = canvas?.dataset.starfieldPaletteGeneration === String(snapshot.generation)
          && renderedColors.length > 0
          && renderedColors.every((color) => snapshot.colors.includes(color));
        detail = { renderedColors, dataset: { ...canvas?.dataset } };
      } else {
        identity = marker.runtime === audit && g.balls.length === marker.items.length && g.balls.every((b, i) => b === marker.items[i]);
        roles = g.balls.every((b, i) => b.distributionIndex === marker.roles[i]);
        geometry = g.balls.every((b, i) => (b.rBase ?? b._tensionLoom?.baseRadius ?? b.r) === marker.radii[i]);
        palette = g.balls.every((ball) => {
          const row = snapshot.distribution[ball.distributionIndex];
          const expected = snapshot.colors[row?.colorIndex] || snapshot.colors[0];
          const baseColor = ball._tensionLoom?.baseColor;
          return snapshot.colors.includes(ball.color) && (!baseColor || baseColor === expected);
        });
        detail = { colors: [...new Set(g.balls.map((ball) => ball.color))] };
      }
    } else if (surfaceId === 'portfolio') {
      const app = window.__ABS_PORTFOLIO_AUDIT__.getApp(); const field = app.particleField;
      identity = marker.runtime === app && marker.field === field && field.particles.length === marker.items.length && field.particles.every((p, i) => p === marker.items[i]);
      roles = field.particles.every((p, i) => p.roleId === marker.roles[i]); routeState = document.body.classList.contains('portfolio-project-open') && document.getElementById('portfolioProjectView')?.classList.contains('is-open'); detail = field.getSnapshot();
    } else if (surfaceId.startsWith('about-')) {
      const root = document.querySelector('.about-narrative-lab'); const runtime = window.__aboutNarrativeRuntime; const d = runtime.getDiagnosticsSnapshot();
      identity = marker.runtime === runtime && marker.canvas === document.querySelector('.about-narrative-world__canvas') && marker.runtimeId === d.runtimeInstanceId && marker.geometryId === d.geometryInstanceId;
      geometry = marker.bufferRebuilds === (root.dataset.worldBufferRebuilds || '') && marker.pairId === d.installedPairId;
      routeState = marker.stage === root.dataset.worldStage && Math.abs(marker.storyWU - Number(root.dataset.narrativeStoryWu)) < 0.05;
      detail = { runtimeInstanceId: d.runtimeInstanceId, geometryInstanceId: d.geometryInstanceId, installedPairId: d.installedPairId, bufferRebuilds: root.dataset.worldBufferRebuilds || '', storyWU: Number(root.dataset.narrativeStoryWu), stage: root.dataset.worldStage, paletteGeneration: d.paletteGeneration };
    } else if (surfaceId === 'contact') {
      const d = window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__;
      identity = marker.stage === document.querySelector('[data-contact-ripple-stage]') && marker.rendererId === d.rendererInstanceId;
      geometry = marker.buildCount === d.bodyBuildCount && marker.ringCount === d.ringCount && marker.bodyCount === d.bodyCount; detail = d;
    } else {
      const canvas = document.querySelector('.daily-focus-runtime canvas'); identity = marker.canvas === canvas;
      geometry = marker.buildCount > 0 && marker.buildCount === Number(canvas.dataset.simulationStateBuildCount || 0) && marker.bodyCount === Number(canvas.dataset.simulationBodyCount || 0); detail = { ...canvas.dataset };
    }
    return { snapshot, atmosphere: window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.(), css: Array.from({ length: 8 }, (_, i) => getComputedStyle(document.documentElement).getPropertyValue(`--ball-${i + 1}`).trim()), rootGeneration: Number(document.documentElement.dataset.absSimulationPaletteGeneration || 0), identity, roles, geometry, routeState, palette, detail };
  }, surface);
}

async function runBoundary(browser, surface) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/London' });
  await context.addInitScript(() => { globalThis.__ABS_ROUTE_PERF_AUDIT__ = true; document.cookie = 'abs_portfolio_ok=1; Path=/; SameSite=Lax; Max-Age=31536000'; sessionStorage.setItem('abs_portfolio_ok', 'palette-boundary-audit'); });
  const page = await context.newPage();
  try {
    await page.clock.install({ time: new Date(2026, 6, 18, 8, 59, 30) });
    await page.goto(`${baseUrl}${surface.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitReady(page, surface); await page.clock.fastForward(4000); await prepareState(page, surface); await waitReady(page, surface);
    await page.clock.setSystemTime(new Date(2026, 6, 18, 8, 59, 59, 800));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    if (surface.storyWU) await prepareState(page, surface);
    if (surface.storyWU) {
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    }
    await installMarker(page, surface);
    const before = await readState(page, surface); await page.clock.fastForward(400);
    await page.waitForFunction((generation) => Number(document.documentElement.dataset.absSimulationPaletteGeneration || 0) > generation, before.snapshot.generation, { timeout: 5000, polling: 'raf' });
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    const after = await readState(page, surface); const evidence = { surface: surface.id, before, after };
    assert(after.snapshot.generation === before.snapshot.generation + 1, 'Boundary did not commit exactly one generation', evidence);
    assert(after.snapshot.paletteId !== before.snapshot.paletteId, 'Boundary did not change palette', evidence);
    assert(after.rootGeneration === after.snapshot.generation && after.atmosphere?.paletteGeneration === after.snapshot.generation, 'Root or atmosphere generation is stale', evidence);
    assert(JSON.stringify(after.css) === JSON.stringify(after.snapshot.colors), 'CSS has a mixed generation', evidence);
    assert(after.identity && after.roles && after.geometry && after.routeState, `Boundary stability failed: identity=${after.identity} roles=${after.roles} geometry=${after.geometry} routeState=${after.routeState}`, evidence);
    assert(after.palette, 'Boundary left a private mode colour cache on the previous generation', evidence);
  } finally { await context.close(); }
}

async function main() {
  assert(['chromium', 'webkit'].includes(browserName), `Unsupported browser ${browserName}`, {});
  const stopServer = await ensureServer();
  const browser = await browserType.launch(browserName === 'chromium' ? { args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] } : {});
  try {
    for (const surface of surfaces) {
      console.log(`[palette-boundary] browser=${browserName} surface=${surface.id}`);
      await runBoundary(browser, surface);
      await delay(250);
    }
  } finally { await browser.close(); await stopServer?.(); }
  console.log(`PASS: ${surfaces.length} live palette-boundary states passed in ${browserName}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
