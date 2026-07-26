#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = resolve(__dirname, '..', 'output', 'playwright', 'route-transition-videos');
const BASE_URL = new URL(String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8013')).origin;
const VIEWPORT = Object.freeze({ width: 1280, height: 900 });
const WAIT_MS = 60000;
const RUN_STAMP = new Date().toISOString().replace(/[:.]/g, '-');

const NORMAL_SEQUENCE = Object.freeze([
  'portfolio',
  'home',
  'about',
  'home',
  'contact',
  'home',
]);

function runCommand(command, args, { capture = false } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    const stdout = [];
    const stderr = [];
    child.stdout?.on('data', (chunk) => stdout.push(chunk));
    child.stderr?.on('data', (chunk) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise(Buffer.concat(stdout).toString('utf8'));
        return;
      }
      reject(new Error(`${command} exited ${code}: ${Buffer.concat(stderr).toString('utf8')}`));
    });
  });
}

async function waitForIdle(page, routeId = null) {
  await page.waitForFunction((expectedRouteId) => {
    const root = document.documentElement;
    const overlay = document.getElementById('abs-boot-overlay');
    const overlayStyle = overlay ? getComputedStyle(overlay) : null;
    const overlayHidden = !overlayStyle
      || overlayStyle.display === 'none'
      || overlayStyle.visibility === 'hidden'
      || Number.parseFloat(overlayStyle.opacity || '1') < 0.02;
    const renderedRoute = document.querySelector('[data-shell-route-view]')?.dataset.shellRouteView || '';
    return (
      (root.dataset.absTransitionPhase || 'idle') === 'idle'
      && root.dataset.absBootState !== 'booting'
      && overlayHidden
      && (!expectedRouteId || renderedRoute === expectedRouteId)
    );
  }, routeId, { timeout: WAIT_MS, polling: 'raf' });
}

async function waitForPrimaryRoutesToPrewarm(page) {
  await page.waitForFunction(() => {
    const entries = window.__ABS_ROUTE_READINESS__?.entries || [];
    return ['home', 'portfolio', 'about', 'contact'].every((routeId) => (
      entries.some((entry) => (
        entry.routeId === routeId
        && entry.stages?.some((stage) => stage.stage === 'media' && stage.status === 'ready')
      ))
    ));
  }, null, { timeout: WAIT_MS, polling: 'raf' });
}

async function startFrameRecorder(page, label) {
  await page.evaluate((scenarioLabel) => {
    const samples = [];
    const scene = document.getElementById('abs-scene');
    const contentWindow = document.getElementById('simulations');
    const buttonBar = document.querySelector('[data-shell-button-bar]')
      || document.querySelector('[data-route-tabs]')?.closest('nav');
    const sceneRect = scene ? { ...scene.getBoundingClientRect().toJSON() } : null;
    const contentWindowRect = contentWindow
      ? { ...contentWindow.getBoundingClientRect().toJSON() }
      : null;
    const buttonBarRect = buttonBar ? { ...buttonBar.getBoundingClientRect().toJSON() } : null;
    const frame = (timestamp) => {
      const root = document.documentElement;
      const loader = document.querySelector('[data-route-transition-loader]');
      const spinner = loader?.querySelector('.abs-loader-spinner');
      const spinnerStage = loader?.querySelector('.route-transition-loader__stage');
      samples.push({
        t: timestamp,
        phase: root.dataset.absTransitionPhase || 'idle',
        renderedRoute: document.querySelector('[data-shell-route-view]')?.dataset.shellRouteView || '',
        committedRoute: document.querySelector('[data-route-tab][aria-current="page"]')?.dataset.routeTab || '',
        pendingRoute: document.querySelector('[data-route-tabs]')?.dataset.pendingRoute || '',
        loaderPresentation: loader?.dataset.routeTransitionLoaderPresentation || 'plate',
        loaderOpacity: loader ? Number.parseFloat(getComputedStyle(loader).opacity || '0') : 0,
        spinnerOpacity: spinner && spinnerStage
          ? (Number.parseFloat(getComputedStyle(spinner).opacity || '0')
            * Number.parseFloat(getComputedStyle(spinnerStage).opacity || '0'))
          : 0,
      });
      window.__ABS_ROUTE_VIDEO_RAF__ = window.__ABS_ROUTE_VIDEO_NATIVE_RAF__(frame);
    };
    window.__ABS_ROUTE_VIDEO_TRACE__ = {
      label: scenarioLabel,
      sceneRect,
      contentWindowRect,
      buttonBarRect,
      samples,
    };
    window.__ABS_ROUTE_VIDEO_RAF__ = window.__ABS_ROUTE_VIDEO_NATIVE_RAF__(frame);
  }, label);
}

async function stopFrameRecorder(page) {
  return page.evaluate(() => {
    window.__ABS_ROUTE_VIDEO_NATIVE_CANCEL_RAF__(window.__ABS_ROUTE_VIDEO_RAF__);
    const trace = window.__ABS_ROUTE_VIDEO_TRACE__ || { samples: [] };
    delete window.__ABS_ROUTE_VIDEO_RAF__;
    delete window.__ABS_ROUTE_VIDEO_TRACE__;
    return trace;
  });
}

async function activateRoute(page, routeId) {
  await page.locator(`[data-route-tab="${routeId}"]`).click({ timeout: WAIT_MS });
  await waitForIdle(page, routeId);
}

async function runNormalScenario(page) {
  for (const routeId of NORMAL_SEQUENCE) {
    await activateRoute(page, routeId);
    await page.waitForTimeout(420);
  }
}

async function navigateDirectly(page, href) {
  await page.evaluate((nextHref) => {
    window.__ABS_SPA_NAVIGATE__?.(nextHref, {
      source: 'button-bar',
      activation: 'pointer',
      preemptTransition: true,
    });
  }, href);
}

async function runStressScenario(page) {
  await navigateDirectly(page, '/portfolio.html');
  await page.waitForFunction(() => (
    document.documentElement.dataset.absTransitionPhase === 'route-out'
  ), null, { timeout: WAIT_MS, polling: 'raf' });
  await navigateDirectly(page, '/contact.html');
  await page.waitForTimeout(45);
  await navigateDirectly(page, '/about.html');
  await waitForIdle(page, 'about');
  await page.waitForTimeout(700);
}

function summarizeTrace(trace) {
  const samples = trace.samples || [];
  const transitionSamples = samples.filter((sample) => sample.phase !== 'idle');
  let maxFrameIntervalMs = 0;
  let longestPlateRunMs = 0;
  let plateRunStart = null;

  for (let index = 1; index < samples.length; index += 1) {
    maxFrameIntervalMs = Math.max(maxFrameIntervalMs, samples[index].t - samples[index - 1].t);
  }
  transitionSamples.forEach((sample) => {
    const plateOnly = sample.loaderOpacity >= 0.98 && sample.spinnerOpacity <= 0.01;
    if (plateOnly) {
      plateRunStart ??= sample.t;
      longestPlateRunMs = Math.max(longestPlateRunMs, sample.t - plateRunStart);
    } else {
      plateRunStart = null;
    }
  });

  return {
    frameCount: samples.length,
    transitionFrameCount: transitionSamples.length,
    spinnerFrameCount: transitionSamples.filter((sample) => sample.spinnerOpacity > 0.01).length,
    longestOpaquePlateOnlyRunMs: longestPlateRunMs,
    maxFrameIntervalMs,
    phases: samples
      .map((sample) => sample.phase)
      .filter((phase, index, phases) => index === 0 || phase !== phases[index - 1]),
    finalRoute: samples.at(-1)?.renderedRoute || '',
  };
}

function readVideoMetadata(videoPath) {
  return runCommand('/opt/homebrew/bin/ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=avg_frame_rate,width,height:format=duration',
    '-of', 'json',
    videoPath,
  ], { capture: true }).then((output) => JSON.parse(output));
}

async function decodeVideoFrames(videoPath, crop, frameRate, traceSamples, traceOffsetSeconds) {
  const outputWidth = 320;
  const outputHeight = Math.max(2, Math.round((crop.height / crop.width) * outputWidth));
  const frameBytes = outputWidth * outputHeight;
  const filter = [
    `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
    `scale=${outputWidth}:${outputHeight}:flags=area`,
    'format=gray',
  ].join(',');
  const child = spawn('/opt/homebrew/bin/ffmpeg', [
    '-v', 'error', '-i', videoPath, '-vf', filter, '-f', 'rawvideo', 'pipe:1',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let pending = Buffer.alloc(0);
  let frameCount = 0;
  let transitionFrameCount = 0;
  let nearUniformFrameCount = 0;
  let nearUniformTransitionFrameCount = 0;
  let currentUniformRun = 0;
  let currentUniformRunStart = null;
  let longestUniformRun = 0;
  const nearUniformRuns = [];
  const stderr = [];
  child.stderr.on('data', (chunk) => stderr.push(chunk));

  for await (const chunk of child.stdout) {
    pending = Buffer.concat([pending, chunk]);
    while (pending.length >= frameBytes) {
      const frame = pending.subarray(0, frameBytes);
      pending = pending.subarray(frameBytes);
      let sum = 0;
      let sumSquares = 0;
      for (let index = 0; index < frame.length; index += 1) {
        const value = frame[index];
        sum += value;
        sumSquares += value * value;
      }
      const mean = sum / frame.length;
      const standardDeviation = Math.sqrt(Math.max(0, (sumSquares / frame.length) - (mean * mean)));
      const nearUniform = standardDeviation < 5;
      const traceTime = ((frameCount / frameRate) - traceOffsetSeconds) * 1000;
      const sample = traceSamples.findLast((candidate) => (
        candidate.t - (traceSamples[0]?.t || 0)
      ) <= traceTime);
      const isTransitionFrame = Boolean(sample && sample.phase !== 'idle');
      const nearUniformTransition = nearUniform && isTransitionFrame;
      if (nearUniformTransition) {
        if (!currentUniformRun) {
          currentUniformRunStart = {
            frameIndex: frameCount,
            renderedRoute: sample?.renderedRoute || '',
            pendingRoute: sample?.pendingRoute || '',
            phase: sample?.phase || '',
          };
        }
        currentUniformRun += 1;
      } else if (currentUniformRun && currentUniformRunStart) {
        nearUniformRuns.push({
          ...currentUniformRunStart,
          endFrameIndex: frameCount - 1,
          frameCount: currentUniformRun,
          durationMs: (currentUniformRun / frameRate) * 1000,
        });
        currentUniformRun = 0;
        currentUniformRunStart = null;
      }
      if (nearUniform) nearUniformFrameCount += 1;
      if (isTransitionFrame) transitionFrameCount += 1;
      if (nearUniformTransition) nearUniformTransitionFrameCount += 1;
      longestUniformRun = Math.max(longestUniformRun, currentUniformRun);
      frameCount += 1;
    }
  }
  const exitCode = await new Promise((resolvePromise, reject) => {
    child.on('error', reject);
    child.on('close', resolvePromise);
  });
  if (exitCode !== 0) {
    throw new Error(`ffmpeg frame decode failed: ${Buffer.concat(stderr).toString('utf8')}`);
  }
  if (currentUniformRun && currentUniformRunStart) {
    nearUniformRuns.push({
      ...currentUniformRunStart,
      endFrameIndex: frameCount - 1,
      frameCount: currentUniformRun,
      durationMs: (currentUniformRun / frameRate) * 1000,
    });
  }
  return {
    decodedFrameCount: frameCount,
    transitionFrameCount,
    nearUniformFrameCount,
    nearUniformTransitionFrameCount,
    longestNearUniformRunFrames: longestUniformRun,
    longestNearUniformRunMs: (longestUniformRun / frameRate) * 1000,
    nearUniformRuns,
    analysisCrop: crop,
    analysisResolution: { width: outputWidth, height: outputHeight },
  };
}

async function createContactSheet(videoPath, outputPath, durationSeconds) {
  const sampleRate = Math.max(0.1, 16 / Math.max(0.1, durationSeconds));
  await runCommand('/opt/homebrew/bin/ffmpeg', [
    '-y', '-v', 'error', '-i', videoPath,
    '-vf', `fps=${sampleRate},scale=320:-2:flags=lanczos,tile=4x4:padding=4:margin=4`,
    '-frames:v', '1', outputPath,
  ]);
}

async function recordScenario(browser, name, runScenario) {
  const scenarioRoot = resolve(OUTPUT_ROOT, `${RUN_STAMP}-${name}`);
  const rawVideoRoot = resolve(scenarioRoot, 'raw');
  await mkdir(rawVideoRoot, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: rawVideoRoot, size: VIEWPORT },
  });
  const page = await context.newPage();
  const video = page.video();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));
  await page.addInitScript(() => {
    window.__ABS_ROUTE_VIDEO_NATIVE_RAF__ = window.requestAnimationFrame.bind(window);
    window.__ABS_ROUTE_VIDEO_NATIVE_CANCEL_RAF__ = window.cancelAnimationFrame.bind(window);
  });
  const recordingStartedAt = Date.now();
  await page.goto(`${BASE_URL}/index.html?mode=pit&absAudit=1`, {
    waitUntil: 'domcontentloaded',
    timeout: WAIT_MS,
  });
  await waitForIdle(page, 'home');
  await page.waitForTimeout(900);
  await waitForPrimaryRoutesToPrewarm(page);

  const traceStartedAt = Date.now();
  await startFrameRecorder(page, name);
  await runScenario(page);
  const trace = await stopFrameRecorder(page);
  const traceEndedAt = Date.now();
  const rawVideoPath = resolve(scenarioRoot, `${name}-raw.webm`);
  await context.close();
  await video.saveAs(rawVideoPath);

  const trimStartSeconds = Math.max(0, ((traceStartedAt - recordingStartedAt) / 1000) - 0.2);
  const trimDurationSeconds = ((traceEndedAt - traceStartedAt) / 1000) + 0.4;
  const videoPath = resolve(scenarioRoot, `${name}.mp4`);
  await runCommand('/opt/homebrew/bin/ffmpeg', [
    '-y', '-v', 'error', '-ss', String(trimStartSeconds), '-i', rawVideoPath,
    '-t', String(trimDurationSeconds), '-an', '-c:v', 'libx264', '-crf', '18',
    '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', videoPath,
  ]);

  const metadata = await readVideoMetadata(videoPath);
  const stream = metadata.streams?.[0] || {};
  const [rateNumerator = 25, rateDenominator = 1] = String(stream.avg_frame_rate || '25/1')
    .split('/')
    .map(Number);
  const frameRate = rateDenominator ? rateNumerator / rateDenominator : 25;
  const sceneRect = trace.contentWindowRect || trace.sceneRect || {
    x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height,
  };
  const crop = {
    x: Math.max(0, Math.round(sceneRect.x + (sceneRect.width * 0.02))),
    y: Math.max(0, Math.round(sceneRect.y + (sceneRect.height * 0.02))),
    width: Math.max(2, Math.round(sceneRect.width * 0.96)),
    height: Math.max(2, Math.round(sceneRect.height * 0.96)),
  };
  crop.width = Math.min(crop.width, VIEWPORT.width - crop.x);
  crop.height = Math.min(crop.height, VIEWPORT.height - crop.y);
  const decodedFrames = await decodeVideoFrames(videoPath, crop, frameRate, trace.samples, 0.2);
  const contactSheetPath = resolve(scenarioRoot, `${name}-contact-sheet.jpg`);
  const durationSeconds = Number(metadata.format?.duration || 0);
  await createContactSheet(videoPath, contactSheetPath, durationSeconds);
  const report = {
    scenario: name,
    videoPath,
    rawVideoPath,
    contactSheetPath,
    video: {
      durationSeconds,
      frameRate,
      width: stream.width,
      height: stream.height,
    },
    trace: summarizeTrace(trace),
    decodedFrames,
    pageErrors,
    samples: trace.samples,
  };
  const reportPath = resolve(scenarioRoot, `${name}-frame-report.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { ...report, reportPath };
}

async function main() {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const browser = await chromium.launch();
  try {
    const normal = await recordScenario(browser, 'normal', runNormalScenario);
    const stress = await recordScenario(browser, 'stress', runStressScenario);
    const summary = {
      generatedAt: new Date().toISOString(),
      normal,
      stress,
    };
    const summaryPath = resolve(OUTPUT_ROOT, `${RUN_STAMP}-summary.json`);
    await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify({
      summaryPath,
      normal: {
        videoPath: normal.videoPath,
        reportPath: normal.reportPath,
        trace: normal.trace,
        decodedFrames: normal.decodedFrames,
      },
      stress: {
        videoPath: stress.videoPath,
        reportPath: stress.reportPath,
        trace: stress.trace,
        decodedFrames: stress.decodedFrames,
      },
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
