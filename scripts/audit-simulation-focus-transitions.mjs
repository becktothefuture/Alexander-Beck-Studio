#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'simulation-focus-transition-stress');

const DEFAULT_URL = 'http://127.0.0.1:8013';
const WAIT_MS = Number(process.env.ABS_SIMULATION_FOCUS_STRESS_WAIT_MS || 40000);
const FRAME_COUNT = Number(process.env.ABS_SIMULATION_FOCUS_STRESS_FRAMES || 18);
const FRAME_INTERVAL_MS = Number(process.env.ABS_SIMULATION_FOCUS_STRESS_INTERVAL_MS || 90);
const MAX_MEAN_DELTA = Number(process.env.ABS_SIMULATION_FOCUS_STRESS_MAX_MEAN_DELTA || 95);

const FLOWS = [
  { name: 'home-to-home', from: 'Ball Pit', to: 'Flies to Light', finalPath: /\/index\.html/, finalLabel: 'Flies to Light' },
  { name: 'home-to-lab', from: 'Flies to Light', to: 'Repel Room', finalPath: /\/lab\/wall-repel\.html/, finalLabel: 'Repel Room' },
  { name: 'lab-to-lab', from: 'Repel Room', to: 'Pressure Mosaic', finalPath: /\/lab\/pressure-mosaic\.html/, finalLabel: 'Pressure Mosaic' },
  { name: 'lab-to-home', from: 'Pressure Mosaic', to: 'Water Swimming', finalPath: /\/index\.html/, finalLabel: 'Water Swimming' },
  { name: 'home-to-heavy-lab', from: 'Water Swimming', to: 'Beach Ball Room', finalPath: /\/lab\/beach-ball-room\.html/, finalLabel: 'Beach Ball Room' },
  { name: 'heavy-lab-to-home', from: 'Beach Ball Room', to: 'Ball Pit', finalPath: /\/index\.html/, finalLabel: 'Ball Pit' },
];

function resolveOrigin() {
  const raw = String(process.env.ABS_DEV_URL || DEFAULT_URL).trim() || DEFAULT_URL;
  const url = new URL(raw);
  return url.origin;
}

function resolveUrl(pathname = '/index.html?mode=pit') {
  return new URL(pathname, resolveOrigin()).toString();
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

function safeName(value) {
  return String(value || 'frame')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
}

async function waitForIdle(page) {
  await page.waitForFunction(
    () => {
      const blur = document.getElementById('modal-blur-layer');
      const content = document.getElementById('modal-content-layer');
      return (
        (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
        && !blur?.classList.contains('active')
        && !content?.classList.contains('active')
      );
    },
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function waitForSwitcherLabel(page, label) {
  await page.waitForFunction(
    (expected) => document.querySelector('.simulation-focus-switcher')?.textContent?.includes(expected),
    label,
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function waitForRows(page) {
  await page.waitForSelector('.simulation-focus-modal.active', { timeout: WAIT_MS });
  const count = await page.locator('.simulation-focus-modal.active .simulation-focus-row').count();
  if (count !== 15) throw new Error(`Expected 15 chooser rows, got ${count}`);
}

async function openChooser(page) {
  await page.locator('.simulation-focus-switcher').click({ timeout: WAIT_MS });
  await waitForRows(page);
}

async function closeChooserWithClick(page) {
  await page.locator('.simulation-focus-pill--close').click({ timeout: WAIT_MS });
  await page.waitForSelector('.simulation-focus-modal.active', { state: 'hidden', timeout: WAIT_MS });
  await waitForIdle(page);
}

async function getState(page, elapsedMs) {
  return page.evaluate((elapsed) => {
    const rectFor = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        opacity: Number.parseFloat(styles.opacity || '1'),
        visibility: styles.visibility,
        display: styles.display,
      };
    };

    const visible = (selector) => {
      const rect = rectFor(selector);
      return Boolean(
        rect
        && rect.display !== 'none'
        && rect.visibility !== 'hidden'
        && rect.opacity > 0.02
        && rect.width > 0
        && rect.height > 0
      );
    };

    const activeCanvas = Array.from(document.querySelectorAll('#c, #wall-repel-canvas, #pressure-mosaic-canvas, #mineral-growth-canvas, #flock-of-birds-canvas, .beach-ball-room-canvas, .napoleon-point-cloud__canvas--front'))
      .find((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return rect.width >= 64 && rect.height >= 64;
      });

    return {
      elapsed,
      href: window.location.href,
      path: window.location.pathname,
      phase: document.documentElement.dataset.absTransitionPhase || 'idle',
      htmlClass: document.documentElement.className,
      modalActive: visible('.simulation-focus-modal.active'),
      modalClosing: visible('.simulation-focus-modal.closing'),
      switcherText: document.querySelector('.simulation-focus-switcher')?.textContent?.trim() || '',
      simulationRect: rectFor('#simulations'),
      sceneRect: rectFor('#abs-scene'),
      switcherRect: rectFor('.simulation-focus-switcher'),
      modalRect: rectFor('.simulation-focus-modal'),
      titleRect: rectFor('#hero-title'),
      canvas: activeCanvas ? {
        id: activeCanvas.id || activeCanvas.className || 'canvas',
        width: activeCanvas.width,
        height: activeCanvas.height,
        rect: (() => {
          const rect = activeCanvas.getBoundingClientRect();
          return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height };
        })(),
      } : null,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
    };
  }, elapsedMs);
}

async function captureFrame(page, flowName, index, startedAt) {
  const elapsed = Date.now() - startedAt;
  const filename = `${safeName(flowName)}-${String(index).padStart(2, '0')}.png`;
  const path = resolve(outputRoot, filename);
  await page.screenshot({ path, fullPage: false });
  return {
    index,
    image: path,
    relativeImage: filename,
    state: await getState(page, elapsed),
  };
}

function analyzeImage(path) {
  const png = PNG.sync.read(Buffer.from(readFileSyncCache.get(path)));
  const pixelCount = png.width * png.height;
  let sum = 0;
  let sumSquares = 0;

  for (let i = 0; i < png.data.length; i += 4) {
    const luminance = (0.2126 * png.data[i]) + (0.7152 * png.data[i + 1]) + (0.0722 * png.data[i + 2]);
    sum += luminance;
    sumSquares += luminance * luminance;
  }

  const mean = sum / pixelCount;
  const variance = Math.max(0, (sumSquares / pixelCount) - (mean * mean));
  return {
    width: png.width,
    height: png.height,
    mean,
    stdev: Math.sqrt(variance),
    png,
  };
}

function meanDelta(previous, next) {
  if (!previous || !next) return 0;
  if (previous.width !== next.width || previous.height !== next.height) return 255;
  let total = 0;
  const length = previous.png.data.length;
  for (let i = 0; i < length; i += 4) {
    total += Math.abs(previous.png.data[i] - next.png.data[i]);
    total += Math.abs(previous.png.data[i + 1] - next.png.data[i + 1]);
    total += Math.abs(previous.png.data[i + 2] - next.png.data[i + 2]);
  }
  return total / ((length / 4) * 3);
}

function rectWithinViewport(rect, viewport, slack = 3) {
  if (!rect || !viewport) return false;
  return (
    rect.left >= -slack
    && rect.top >= -slack
    && rect.right <= viewport.width + slack
    && rect.bottom <= viewport.height + slack
  );
}

function checkFrame(frame, imageStats) {
  const issues = [];
  const { state } = frame;

  if (imageStats.stdev < 2 || imageStats.mean < 2 || imageStats.mean > 253) {
    issues.push('blank-or-flat-frame');
  }

  if ((state.viewport.scrollWidth - state.viewport.width) > 2) {
    issues.push(`horizontal-overflow:${state.viewport.scrollWidth - state.viewport.width}`);
  }

  if (!rectWithinViewport(state.simulationRect, state.viewport, 4)) {
    issues.push('simulation-frame-clipped');
  }

  if (state.modalActive && !rectWithinViewport(state.modalRect, state.viewport, 4)) {
    issues.push('modal-clipped');
  }

  if (state.switcherRect && state.switcherRect.width > state.viewport.width - 24) {
    issues.push('switcher-overwide');
  }

  return issues;
}

async function collectFrames(page, flowName, action) {
  const startedAt = Date.now();
  const frames = [];
  const sampler = (async () => {
    for (let index = 0; index < FRAME_COUNT; index += 1) {
      frames.push(await captureFrame(page, flowName, index, startedAt));
      await sleep(FRAME_INTERVAL_MS);
    }
  })();

  await sleep(20);
  await action();
  await sampler;
  return frames;
}

async function chooseSimulationWithFrames(page, flow) {
  await openChooser(page);
  const rows = page.locator('.simulation-focus-modal.active .simulation-focus-row');
  const target = rows.filter({ hasText: flow.to }).first();
  const frames = await collectFrames(page, flow.name, () => target.click({ timeout: WAIT_MS }));

  await page.waitForURL(flow.finalPath, { timeout: WAIT_MS });
  await waitForSwitcherLabel(page, flow.finalLabel);
  await waitForIdle(page);
  return frames;
}

function buildReportHtml(report) {
  const sections = report.flows.map((flow) => `
    <section>
      <h2>${flow.name}</h2>
      <p>max frame delta: ${flow.maxMeanDelta.toFixed(2)} · issues: ${flow.issues.length ? flow.issues.join(', ') : 'none'}</p>
      <div class="frames">
        ${flow.frames.map((frame) => `
          <figure>
            <img src="${frame.relativeImage}" alt="${flow.name} frame ${frame.index}">
            <figcaption>${frame.index} · ${frame.state.phase} · ${frame.state.path}</figcaption>
          </figure>
        `).join('')}
      </div>
    </section>
  `).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Simulation Focus Transition Stress</title>
  <style>
    body { margin: 24px; font: 14px/1.4 system-ui, sans-serif; background: #111; color: #eee; }
    .frames { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    figure { margin: 0; }
    img { width: 100%; border: 1px solid #444; border-radius: 6px; }
    figcaption { margin-top: 4px; color: #aaa; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Simulation Focus Transition Stress</h1>
  ${sections}
</body>
</html>
`;
}

const readFileSyncCache = new Map();

async function analyzeFrames(frames) {
  for (const frame of frames) {
    readFileSyncCache.set(frame.image, await readFile(frame.image));
  }

  const analyzed = frames.map((frame) => ({ frame, stats: analyzeImage(frame.image) }));
  const deltas = analyzed.map((entry, index) => (
    index === 0 ? 0 : meanDelta(analyzed[index - 1].stats, entry.stats)
  ));
  const issues = [];

  analyzed.forEach(({ frame, stats }, index) => {
    checkFrame(frame, stats).forEach((issue) => {
      issues.push(`frame-${index}:${issue}`);
    });
  });

  const maxMeanDelta = Math.max(0, ...deltas);
  if (maxMeanDelta > MAX_MEAN_DELTA) {
    issues.push(`mean-delta-too-high:${maxMeanDelta.toFixed(2)}`);
  }

  return {
    frames,
    maxMeanDelta,
    deltas,
    issues,
  };
}

async function main() {
  await mkdir(outputRoot, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });

  try {
    await page.goto(resolveUrl('/index.html?mode=pit'), { waitUntil: 'networkidle', timeout: 60000 });
    await waitForSwitcherLabel(page, 'Ball Pit');

    await openChooser(page);
    await closeChooserWithClick(page);
    await openChooser(page);
    await page.keyboard.press('Escape');
    await page.waitForSelector('.simulation-focus-modal.active', { state: 'hidden', timeout: WAIT_MS });
    await waitForIdle(page);

    const flowReports = [];
    for (const flow of FLOWS) {
      await waitForSwitcherLabel(page, flow.from);
      const frames = await chooseSimulationWithFrames(page, flow);
      const analyzed = await analyzeFrames(frames);
      flowReports.push({
        ...analyzed,
        name: flow.name,
        from: flow.from,
        to: flow.to,
      });
    }

    const report = {
      ok: flowReports.every((flow) => flow.issues.length === 0),
      outputRoot,
      frameCount: FRAME_COUNT,
      frameIntervalMs: FRAME_INTERVAL_MS,
      maxAllowedMeanDelta: MAX_MEAN_DELTA,
      flows: flowReports,
    };

    await writeFile(resolve(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeFile(resolve(outputRoot, 'report.html'), buildReportHtml(report), 'utf8');

    if (!report.ok) {
      console.error(JSON.stringify({
        ok: false,
        outputRoot,
        failures: flowReports
          .filter((flow) => flow.issues.length)
          .map((flow) => ({ name: flow.name, issues: flow.issues, maxMeanDelta: flow.maxMeanDelta })),
      }, null, 2));
      process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify({
      ok: true,
      outputRoot,
      flows: flowReports.map((flow) => ({
        name: flow.name,
        from: flow.from,
        to: flow.to,
        maxMeanDelta: Number(flow.maxMeanDelta.toFixed(2)),
      })),
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
