#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { cpus } from 'node:os';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { relative, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, devices, webkit } from 'playwright';
import {
  RUNTIME_PERFORMANCE_SCHEMA_VERSION,
  aggregateProfile,
  aggregateRafControlProfile,
  evaluateEnvironmentCalibration,
  evaluateMode,
  evaluateRafControlRepeat,
  evaluateRepeat,
  median,
  normalizeCadence,
  parsePerformanceContract,
  resolveCertificationSurface,
} from './lib/runtime-performance-contract.mjs';

const CONTRACT = parsePerformanceContract(process.env);
const SURFACE_SELECTION = resolveCertificationSurface(process.env);
const READY_TIMEOUT_MS = Math.max(3_000, Number(process.env.ABS_PERF_READY_TIMEOUT_MS || 15_000));
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const DEVICE_NAME = String(process.env.ABS_DEVICE || 'iPhone 13');
const ORIENTATION = String(process.env.ABS_ORIENTATION || 'portrait').toLowerCase();
const HEADLESS = process.env.ABS_HEADED !== '1';
const RUN_ID = `${new Date().toISOString().replace(/[:.]/g, '-')}-${BROWSER_NAME}-${randomUUID().slice(0, 8)}`;
const OUTPUT_PATH = resolve(process.env.ABS_PERF_OUTPUT || `output/playwright/runtime-performance/${RUN_ID}.json`);
const browserType = BROWSER_NAME === 'webkit' ? webkit : chromium;
let origin = SURFACE_SELECTION.baseUrl;
let ownedPreview = null;
let buildEvidence = null;

if (!['chromium', 'webkit'].includes(BROWSER_NAME)) {
  throw new Error(`Unsupported ABS_BROWSER=${BROWSER_NAME}; use chromium or webkit.`);
}
if (!devices[DEVICE_NAME]) throw new Error(`Unknown Playwright device profile: ${DEVICE_NAME}`);
if (!['portrait', 'landscape'].includes(ORIENTATION)) {
  throw new Error(`Unsupported ABS_ORIENTATION=${ORIENTATION}; use portrait or landscape.`);
}

const deviceProfile = { ...devices[DEVICE_NAME] };
if (ORIENTATION === 'landscape') {
  deviceProfile.viewport = { width: devices[DEVICE_NAME].viewport.height, height: devices[DEVICE_NAME].viewport.width };
  deviceProfile.screen = { width: devices[DEVICE_NAME].screen.height, height: devices[DEVICE_NAME].screen.width };
}

const catalogPath = resolve('react-app/app/src/data/simulationCatalog.json');
const catalogText = await readFile(catalogPath, 'utf8');
const catalog = JSON.parse(catalogText);
const requestedIds = String(process.env.ABS_PERF_MODES || '').split(',').map((id) => id.trim()).filter(Boolean);
const catalogEntries = catalog.simulations.filter((entry) => entry.launchPath || entry.dailyHref);
const entries = requestedIds.length
  ? requestedIds.map((id) => catalogEntries.find((entry) => entry.id === id)).filter(Boolean)
  : catalogEntries;
const missingRequestedIds = requestedIds.filter((id) => !entries.some((entry) => entry.id === id));
if (missingRequestedIds.length) throw new Error(`Unknown ABS_PERF_MODES simulation IDs: ${missingRequestedIds.join(', ')}`);

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
}

function round(value, digits = 2) {
  if (value === null || value === undefined || value === '') return null;
  return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(digits)) : null;
}

function gitEvidence() {
  try {
    const commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim();
    const dirtyPaths = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean).length;
    return { commit, dirty: dirtyPaths > 0, dirtyPathCount: dirtyPaths };
  } catch {
    return { commit: process.env.ABS_COMMIT || null, dirty: null, dirtyPathCount: null };
  }
}

async function listFiles(root) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  await visit(root);
  return files;
}

async function artifactIdentity(root) {
  const files = await listFiles(root);
  const hash = createHash('sha256');
  for (const path of files) {
    hash.update(relative(root, path));
    hash.update('\0');
    hash.update(await readFile(path));
    hash.update('\0');
  }
  const metadata = await stat(root);
  return {
    path: relative(resolve('.'), root),
    sha256: hash.digest('hex'),
    fileCount: files.length,
    modifiedAt: metadata.mtime.toISOString(),
  };
}

function buildProductionArtifact() {
  const startedAt = Date.now();
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: resolve('.'),
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`Production build failed with exit code ${result.status}.`);
  return {
    command: 'npm run build',
    reused: false,
    durationMs: Date.now() - startedAt,
  };
}

async function openPort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function startProductionPreview() {
  const port = await openPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const args = ['run', 'preview', '--prefix', 'react-app/app', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
  const child = spawn('npm', args, {
    cwd: resolve('.'),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverOutput = '';
  child.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
  child.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`${baseUrl}/index.html`, { cache: 'no-store' });
      if (response.ok) {
        return {
          baseUrl,
          command: ['npm', ...args].join(' '),
          port,
          async stop() {
            if (child.exitCode === null) child.kill('SIGTERM');
            await Promise.race([
              new Promise((resolveExit) => child.once('close', resolveExit)),
              delay(5_000),
            ]);
          },
        };
      }
    } catch {
      // The bounded preview is still starting.
    }
    await delay(200);
  }
  if (child.exitCode === null) child.kill('SIGTERM');
  throw new Error(`Production preview did not become ready at ${baseUrl}. ${serverOutput.trim()}`);
}

async function prepareCertificationSurface() {
  if (!SURFACE_SELECTION.owned) {
    return {
      ...SURFACE_SELECTION,
      buildIdentity: { kind: 'external', verifiable: false, reason: 'External URL override does not expose a local artifact identity.' },
    };
  }
  const build = SURFACE_SELECTION.buildRequired
    ? buildProductionArtifact()
    : { command: null, reused: true, durationMs: 0 };
  const artifact = await artifactIdentity(resolve('react-app/app/dist'));
  buildEvidence = { ...build, artifact };
  ownedPreview = await startProductionPreview();
  origin = ownedPreview.baseUrl;
  return {
    type: SURFACE_SELECTION.type,
    baseUrl: origin,
    owned: true,
    previewCommand: ownedPreview.command,
    buildIdentity: buildEvidence,
  };
}

function entryUrl(entry) {
  const path = entry.surface === 'home-mode'
    ? '/index.html'
    : (entry.stage === 'daily-rotation' ? (entry.dailyHref || entry.launchPath) : entry.launchPath);
  const url = new URL(path, `${origin}/`);
  if (entry.surface === 'home-mode') url.searchParams.set('mode', entry.id);
  else if (entry.stage === 'daily-rotation') url.searchParams.set('daily', '1');
  url.searchParams.set('absAudit', '1');
  return url.toString();
}

async function waitForOwnedRuntime(page, entry) {
  if (entry.surface === 'home-mode') {
    await page.waitForFunction(
      (id) => window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().mode === id
        && Number(document.querySelector('#c')?.__absAuditFrameCount) > 0,
      entry.id,
      { timeout: READY_TIMEOUT_MS },
    );
    return;
  }
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('canvas')).filter((canvas) => (
      canvas.width > 1
      && canvas.height > 1
      && canvas.getBoundingClientRect().width > 0
      && canvas.getBoundingClientRect().height > 0
      && Number(canvas.__absAuditFrameCount) > 0
    )).length === 1,
    undefined,
    { timeout: READY_TIMEOUT_MS },
  );
}

async function measurePage(page, entry, durationMs) {
  return page.evaluate(async ({ durationMs: requestedDurationMs, surface }) => {
    const candidates = surface === 'home-mode'
      ? [document.querySelector('#c')].filter(Boolean)
      : Array.from(document.querySelectorAll('canvas')).filter((canvas) => (
        canvas.width > 1
        && canvas.height > 1
        && canvas.getBoundingClientRect().width > 0
        && canvas.getBoundingClientRect().height > 0
        && Number.isFinite(Number(canvas.__absAuditFrameCount))
      ));
    const auditCanvas = candidates.length === 1 ? candidates[0] : null;
    const runtimeHook = surface === 'home-mode' ? '__ABS_HOME_AUDIT__.getRuntimeSnapshot' : 'canvas.__absAuditFrameCount';
    const ownership = {
      matched: Boolean(auditCanvas) && (surface !== 'home-mode' || typeof window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot === 'function'),
      candidateCount: candidates.length,
      canvas: auditCanvas ? {
        id: auditCanvas.id || null,
        className: typeof auditCanvas.className === 'string' ? auditCanvas.className : null,
      } : null,
      selectionRule: surface === 'home-mode'
        ? 'canvas#c plus __ABS_HOME_AUDIT__.getRuntimeSnapshot'
        : 'the unique visible, sized canvas with __absAuditFrameCount',
      runtimeHook,
    };
    const intervals = [];
    const renderedIntervals = [];
    const startRenderedFrameCount = Number(auditCanvas?.__absAuditFrameCount) || 0;
    let previousObservedRenderedFrameCount = startRenderedFrameCount;
    let previousRenderedAt = 0;
    let previous = 0;
    const start = performance.now();
    const endedAt = await new Promise((resolveSample) => {
      const tick = (now) => {
        if (previous > 0) intervals.push(now - previous);
        previous = now;
        const observedRenderedFrameCount = Number(auditCanvas?.__absAuditFrameCount) || 0;
        if (observedRenderedFrameCount > previousObservedRenderedFrameCount) {
          if (previousRenderedAt > 0) renderedIntervals.push(now - previousRenderedAt);
          previousRenderedAt = now;
          previousObservedRenderedFrameCount = observedRenderedFrameCount;
        }
        if (now - start >= requestedDurationMs) resolveSample(now);
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const actualDurationMs = endedAt - start;
    const runtime = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.() || null;
    const renderedFrameCount = auditCanvas
      ? Math.max(0, (Number(auditCanvas.__absAuditFrameCount) || 0) - startRenderedFrameCount)
      : null;
    const canvases = Array.from(document.querySelectorAll('canvas')).map((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return {
        id: canvas.id || null,
        className: typeof canvas.className === 'string' ? canvas.className : null,
        cssWidth: Math.round(rect.width),
        cssHeight: Math.round(rect.height),
        width: canvas.width,
        height: canvas.height,
        backingDpr: rect.width > 0 ? canvas.width / rect.width : null,
        auditFrameCount: Number(canvas.__absAuditFrameCount) || null,
      };
    });
    return {
      actualDurationMs,
      intervals,
      renderedIntervals,
      runtime,
      renderedFrameCount,
      renderedFps: renderedFrameCount === null ? null : renderedFrameCount * 1000 / actualDurationMs,
      ownership,
      visualCount: Number(window.__ABS_SIMULATION_VISUAL_TRANSITION__?.count) || null,
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        viewport: { width: innerWidth, height: innerHeight },
        screen: { width: screen.width, height: screen.height },
        browserDpr: devicePixelRatio,
        visibilityState: document.visibilityState,
      },
      canvases,
    };
  }, { durationMs, surface: entry.surface });
}

async function measureStaticRaf(page, durationMs) {
  return page.evaluate(async (requestedDurationMs) => {
    const intervals = [];
    let previous = 0;
    const start = performance.now();
    const endedAt = await new Promise((resolveSample) => {
      const tick = (now) => {
        if (previous > 0) intervals.push(now - previous);
        previous = now;
        if (now - start >= requestedDurationMs) resolveSample(now);
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return { intervals, actualDurationMs: endedAt - start };
  }, durationMs);
}

function summarizeRafControl(sample, consoleErrors, pageErrors) {
  const intervals = sample.intervals.filter(Number.isFinite);
  const elapsed = intervals.reduce((sum, value) => sum + value, 0);
  const medianIntervalMs = median(intervals);
  return {
    actualDurationMs: round(sample.actualDurationMs),
    frameCount: intervals.length,
    rafFps: round(intervals.length * 1000 / Math.max(1, elapsed)),
    observedRefreshHz: medianIntervalMs > 0 ? round(1000 / medianIntervalMs) : null,
    p50Ms: round(percentile(intervals, 0.5)),
    p95Ms: round(percentile(intervals, 0.95)),
    p99Ms: round(percentile(intervals, 0.99)),
    longestGapMs: round(Math.max(...intervals, 0)),
    consoleErrors,
    pageErrors,
  };
}

function summarizeSample(sample, consoleErrors, pageErrors) {
  const intervals = sample.intervals.filter(Number.isFinite);
  const renderedIntervals = sample.renderedIntervals.filter(Number.isFinite);
  const elapsed = intervals.reduce((sum, value) => sum + value, 0);
  const rafFps = intervals.length * 1000 / Math.max(1, elapsed);
  const observedRefreshHz = median(intervals) > 0 ? 1000 / median(intervals) : null;
  const requiresContinuousFrames = true;
  const renderInvocationFps = round(sample.renderedFps);
  const runtimeFps = round(sample.runtime?.adaptiveFps);
  const targetFps = round(sample.runtime?.targetFps);
  const rawMeasuredFps = renderInvocationFps ?? runtimeFps ?? round(rafFps);
  const normalizedCadence = Object.fromEntries(Object.entries(normalizeCadence({
    measuredFps: rawMeasuredFps,
    targetFps,
    observedRefreshHz,
  })).map(([key, value]) => [key, round(value)]));
  return {
    actualDurationMs: round(sample.actualDurationMs),
    frameCount: intervals.length,
    measuredFps: rawMeasuredFps,
    ...normalizedCadence,
    rafFps: round(rafFps),
    renderInvocationFps,
    renderedFps: renderInvocationFps,
    renderedFpsSemantic: 'legacy alias of raw renderInvocationFps; not presented-frame FPS',
    runtimeFps,
    observedRefreshHz: round(observedRefreshHz),
    refreshCalibration: {
      method: 'inverse median requestAnimationFrame interval during this repeat',
      medianIntervalMs: round(median(intervals)),
    },
    p50Ms: round(percentile(intervals, 0.5)),
    p95Ms: round(percentile(intervals, 0.95)),
    p99Ms: round(percentile(intervals, 0.99)),
    longestGapMs: round(Math.max(...intervals, 0)),
    renderInvocationP95Ms: round(percentile(renderedIntervals, 0.95)),
    renderInvocationP99Ms: round(percentile(renderedIntervals, 0.99)),
    renderedP95Ms: round(percentile(renderedIntervals, 0.95)),
    renderedP99Ms: round(percentile(renderedIntervals, 0.99)),
    renderInvocationCount: sample.renderedFrameCount,
    renderedFrameCount: sample.renderedFrameCount,
    renderedFrameCountSemantic: 'legacy alias of renderInvocationCount; not a presented-frame count',
    targetFps,
    throttleLevel: sample.runtime?.throttleLevel ?? null,
    objectOrPointCount: Number(sample.runtime?.ballCount) || sample.visualCount || null,
    renderedDpr: round(sample.runtime?.dpr ?? sample.canvases.find((canvas) => canvas.width > 1)?.backingDpr),
    ownership: sample.ownership,
    environment: sample.environment,
    canvases: sample.canvases,
    consoleErrors,
    pageErrors,
    requiresContinuousFrames,
  };
}

const certificationSurface = await prepareCertificationSurface();
let browser = null;
const results = [];
let browserEvidence = null;
let environmentCalibration = null;

try {
  browser = await browserType.launch({ headless: HEADLESS });
  browserEvidence = { name: BROWSER_NAME, version: browser.version(), headless: HEADLESS };
  const controlProfiles = {};
  for (const profileName of CONTRACT.profiles) {
    const repeats = [];
    for (let repeatIndex = 0; repeatIndex < CONTRACT.repeatCount; repeatIndex += 1) {
      const context = await browser.newContext({
        ...deviceProfile,
        reducedMotion: 'no-preference',
        colorScheme: process.env.ABS_COLOR_SCHEME === 'dark' ? 'dark' : 'light',
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', (error) => pageErrors.push(error.message));
      process.stdout.write(`Calibrating static rAF ${profileName} ${repeatIndex + 1}/${CONTRACT.repeatCount}... `);
      try {
        await page.goto('about:blank');
        await page.waitForTimeout(CONTRACT.profileDefinitions[profileName].preSampleDelayMs);
        const repeat = summarizeRafControl(await measureStaticRaf(page, CONTRACT.sampleMs), consoleErrors, pageErrors);
        Object.assign(repeat, evaluateRafControlRepeat(repeat, CONTRACT));
        repeats.push(repeat);
        console.log(`${repeat.rafFps} rAF FPS, ${repeat.observedRefreshHz}Hz observed, ${repeat.passed ? 'PASS' : 'INVALID'}`);
      } catch (error) {
        const repeat = {
          actualDurationMs: 0,
          rafFps: null,
          observedRefreshHz: null,
          p95Ms: null,
          p99Ms: null,
          longestGapMs: null,
          consoleErrors,
          pageErrors,
          error: error?.stack || String(error),
        };
        Object.assign(repeat, evaluateRafControlRepeat(repeat, CONTRACT));
        repeats.push(repeat);
        console.log(`INVALID: ${error?.message || error}`);
      } finally {
        await context.close();
      }
    }
    controlProfiles[profileName] = {
      definition: CONTRACT.profileDefinitions[profileName],
      repeats,
      ...aggregateRafControlProfile(repeats, CONTRACT),
    };
  }
  environmentCalibration = {
    surface: 'about:blank static requestAnimationFrame control',
    profiles: controlProfiles,
    ...evaluateEnvironmentCalibration(controlProfiles, CONTRACT),
  };
  for (const entry of entries) {
    const result = {
      id: entry.id,
      name: entry.name,
      surface: entry.surface,
      url: entryUrl(entry),
      measurementKind: 'continuous-renderer',
      ownershipContract: entry.surface === 'home-mode'
        ? { canvas: 'canvas#c', runtime: '__ABS_HOME_AUDIT__.getRuntimeSnapshot' }
        : { canvas: 'unique visible sized canvas with __absAuditFrameCount', runtime: 'canvas.__absAuditFrameCount' },
      profiles: {},
    };

    if (!environmentCalibration.valid) {
      Object.assign(result, evaluateMode(result.profiles, CONTRACT, environmentCalibration));
      results.push(result);
      continue;
    }

    for (const profileName of CONTRACT.profiles) {
      const repeats = [];
      for (let repeatIndex = 0; repeatIndex < CONTRACT.repeatCount; repeatIndex += 1) {
        const context = await browser.newContext({
          ...deviceProfile,
          reducedMotion: 'no-preference',
          colorScheme: process.env.ABS_COLOR_SCHEME === 'dark' ? 'dark' : 'light',
        });
        const page = await context.newPage();
        const consoleErrors = [];
        const pageErrors = [];
        page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
        page.on('pageerror', (error) => pageErrors.push(error.message));
        await page.addInitScript(() => {
          window.__ABS_ROUTE_PERF_AUDIT__ = true;
          sessionStorage.setItem('abs_portfolio_ok', 'runtime-performance-audit');
        });
        process.stdout.write(`Sampling ${entry.id} ${profileName} ${repeatIndex + 1}/${CONTRACT.repeatCount}... `);
        try {
          await page.goto(result.url, { waitUntil: 'networkidle', timeout: 60_000 });
          await waitForOwnedRuntime(page, entry);
          await page.waitForTimeout(CONTRACT.profileDefinitions[profileName].preSampleDelayMs);
          const rawSample = await measurePage(page, entry, CONTRACT.sampleMs);
          const repeat = summarizeSample(rawSample, consoleErrors, pageErrors);
          Object.assign(repeat, evaluateRepeat(repeat, CONTRACT, { requiresContinuousFrames: repeat.requiresContinuousFrames }));
          repeats.push(repeat);
          console.log(`raw ${repeat.rawMeasuredFps ?? 'n/a'}, capped ${repeat.cappedMeasuredFps ?? 'n/a'} FPS, ${repeat.observedRefreshHz ?? 'n/a'}Hz observed, ${repeat.passed ? 'PASS' : 'FAIL'}`);
        } catch (error) {
          const repeat = {
            actualDurationMs: 0,
            measuredFps: null,
            rawMeasuredFps: null,
            cappedMeasuredFps: null,
            cadenceCeilingFps: null,
            rafFps: null,
            renderInvocationFps: null,
            renderedFps: null,
            runtimeFps: null,
            observedRefreshHz: null,
            p95Ms: null,
            p99Ms: null,
            ownership: { matched: false, candidateCount: 0 },
            consoleErrors,
            pageErrors,
            error: error?.stack || String(error),
          };
          Object.assign(repeat, evaluateRepeat(repeat, CONTRACT, { requiresContinuousFrames: true }));
          repeats.push(repeat);
          console.log(`ERROR: ${error?.message || error}`);
        } finally {
          await context.close();
        }
      }
      result.profiles[profileName] = { definition: CONTRACT.profileDefinitions[profileName], repeats, ...aggregateProfile(repeats, CONTRACT) };
    }
    Object.assign(result, evaluateMode(result.profiles, CONTRACT, environmentCalibration));
    results.push(result);
  }
} finally {
  await browser?.close();
  await ownedPreview?.stop();
}

if (certificationSurface.owned) {
  const artifactAfterRun = await artifactIdentity(resolve('react-app/app/dist'));
  const artifactBeforeRun = certificationSurface.buildIdentity.artifact;
  certificationSurface.buildIntegrity = {
    beforeSha256: artifactBeforeRun.sha256,
    afterSha256: artifactAfterRun.sha256,
    matched: artifactBeforeRun.sha256 === artifactAfterRun.sha256,
  };
  if (!certificationSurface.buildIntegrity.matched) {
    environmentCalibration = {
      ...environmentCalibration,
      valid: false,
      classification: 'environment-invalid',
      failures: [
        ...(environmentCalibration?.failures || []),
        {
          predicate: 'stable-build-artifact',
          actual: certificationSurface.buildIntegrity,
          expected: 'identical artifact hash before and after sampling',
          reason: 'The production artifact changed during the run, so its performance evidence is invalid.',
        },
      ],
    };
    for (const result of results) Object.assign(result, evaluateMode(result.profiles, CONTRACT, environmentCalibration));
  }
}

const failures = results.filter((result) => !result.passed);
const generatedAt = new Date().toISOString();
const output = {
  schemaVersion: RUNTIME_PERFORMANCE_SCHEMA_VERSION,
  runId: RUN_ID,
  generatedAt,
  repository: gitEvidence(),
  certificationSurface,
  origin,
  browser: browserEvidence,
  host: {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    logicalCpuCount: cpus().length,
    cpuModel: cpus()[0]?.model || null,
  },
  emulation: { deviceProfile: DEVICE_NAME, orientation: ORIENTATION, colorScheme: process.env.ABS_COLOR_SCHEME === 'dark' ? 'dark' : 'light' },
  contract: CONTRACT,
  environmentCalibration,
  catalogSha256: createHash('sha256').update(catalogText).digest('hex'),
  caveat: 'Desktop-hosted browser emulation does not reproduce physical iPhone GPU, thermal, memory, or power constraints.',
  evidencePath: OUTPUT_PATH,
  summary: {
    simulationsExpected: entries.length,
    simulationsMeasured: results.length,
    environmentValid: environmentCalibration?.valid === true,
    environmentFailures: environmentCalibration?.failures || [],
    performanceGateFailures: failures.filter((result) => result.classification === 'mode-failure').map((result) => ({
      id: result.id,
      failures: result.failures,
      profileFailures: Object.fromEntries(Object.entries(result.profiles).map(([name, profile]) => [name, {
        aggregate: profile.failures,
        repeats: profile.repeats.map((repeat, index) => ({
          repeat: index + 1,
          failures: repeat.failures,
          error: repeat.error || null,
        })).filter((repeat) => repeat.failures.length > 0 || repeat.error),
      }])),
    })),
    certificationFailures: failures.map((result) => ({ id: result.id, classification: result.classification, failures: result.failures })),
    overRenderFollowUps: results.filter((result) => result.overRenderFollowUp).map((result) => ({ id: result.id, ...result.overRenderFollowUp })),
    passed: failures.length === 0,
  },
  results,
};

await mkdir(resolve(OUTPUT_PATH, '..'), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.summary, null, 2));
console.log(`Wrote run-specific evidence: ${OUTPUT_PATH}`);
if (failures.length > 0) process.exitCode = 1;
