#!/usr/bin/env node
import { mkdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import {
  getSimulationCaptureOptions,
  readSimulationCatalog,
} from './lib/simulation-admin-store.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const outputRoot = resolve(repoRoot, 'react-app/app/public/previews/simulations');

const DEFAULT_BASE_URL = process.env.ABS_DEV_URL || 'http://127.0.0.1:8012';
const DEFAULT_VIEWPORT = { width: 900, height: 506 };
const OUTPUT_SIZE = { width: 420, height: 236 };
const DEFAULT_FRAMES = 4;
const DEFAULT_DELAY_MS = 2200;
const DEFAULT_FRAME_INTERVAL_MS = 320;
const CAPTURE_HIDE_CSS = `
  .fade-content,
  #shell-hero-slot,
  #quote-viewport-host,
  #portfolio-sheet-host,
  .frame-vignette,
  #dev-perf-hud,
  .parameterizer-panel,
  .beach-ball-room-controls,
  .abs-control-panel,
  .napoleon-point-cloud__credit,
  .napoleon-point-cloud__status,
  .spatial-scan-point-cloud__credit,
  .spatial-scan-point-cloud__status {
    display: none !important;
  }
`;

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    ids: [],
    includeHidden: false,
    frames: DEFAULT_FRAMES,
    delayMs: DEFAULT_DELAY_MS,
    frameIntervalMs: DEFAULT_FRAME_INTERVAL_MS,
    gif: true,
    viewport: { ...DEFAULT_VIEWPORT },
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice('--base-url='.length);
      return;
    }
    if (arg.startsWith('--ids=')) {
      options.ids.push(...arg.slice('--ids='.length).split(',').map((id) => id.trim()).filter(Boolean));
      return;
    }
    if (arg === '--include-hidden') {
      options.includeHidden = true;
      return;
    }
    if (arg === '--no-gif') {
      options.gif = false;
      return;
    }
    if (arg.startsWith('--frames=')) {
      options.frames = Math.max(1, Number.parseInt(arg.slice('--frames='.length), 10) || DEFAULT_FRAMES);
      return;
    }
    if (arg.startsWith('--delay=')) {
      options.delayMs = Math.max(0, Number.parseInt(arg.slice('--delay='.length), 10) || DEFAULT_DELAY_MS);
      return;
    }
    if (arg.startsWith('--interval=')) {
      options.frameIntervalMs = Math.max(100, Number.parseInt(arg.slice('--interval='.length), 10) || DEFAULT_FRAME_INTERVAL_MS);
      return;
    }
    if (arg.startsWith('--viewport=')) {
      const [width, height] = arg.slice('--viewport='.length).split('x').map((part) => Number.parseInt(part, 10));
      if (Number.isFinite(width) && Number.isFinite(height)) {
        options.viewport = { width, height };
      }
      return;
    }
    if (!arg.startsWith('-')) {
      options.ids.push(arg);
    }
  });

  return options;
}

function resolveUrl(baseUrl, path) {
  return new URL(path || '/', baseUrl).toString();
}

function hasFfmpeg() {
  const result = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  return result.status === 0;
}

function createGif(framePattern, outputPath) {
  const palettePath = outputPath.replace(/\.gif$/i, '-palette.png');
  const palette = spawnSync('ffmpeg', [
    '-y',
    '-framerate', '4',
    '-i', framePattern,
    '-vf', `fps=4,scale=${OUTPUT_SIZE.width}:${OUTPUT_SIZE.height}:flags=lanczos,palettegen`,
    palettePath,
  ], { stdio: 'ignore' });

  if (palette.status !== 0) return false;

  const gif = spawnSync('ffmpeg', [
    '-y',
    '-framerate', '4',
    '-i', framePattern,
    '-i', palettePath,
    '-filter_complex', `[0:v]fps=4,scale=${OUTPUT_SIZE.width}:${OUTPUT_SIZE.height}:flags=lanczos[x];[x][1:v]paletteuse`,
    outputPath,
  ], { stdio: 'ignore' });

  return gif.status === 0;
}

function scalePoster(inputPath, outputPath) {
  const result = spawnSync('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-vf', `scale=${OUTPUT_SIZE.width}:${OUTPUT_SIZE.height}:flags=lanczos`,
    outputPath,
  ], { stdio: 'ignore' });
  return result.status === 0;
}

async function captureEntry(page, entry, options, canCreateGif) {
  const targetDir = resolve(outputRoot, entry.id);
  await mkdir(targetDir, { recursive: true });

  const captureOptions = getSimulationCaptureOptions(entry, { delayMs: options.delayMs });
  const url = resolveUrl(options.baseUrl, captureOptions.capturePath);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.addStyleTag({ content: CAPTURE_HIDE_CSS });
  if (captureOptions.readySelector) {
    await page.waitForSelector(captureOptions.readySelector, { timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(captureOptions.delayMs);

  const posterPath = resolve(targetDir, 'poster.png');
  if (canCreateGif) {
    const posterSourcePath = resolve(targetDir, 'poster-source.png');
    await page.screenshot({ path: posterSourcePath });
    const scaled = scalePoster(posterSourcePath, posterPath);
    await unlink(posterSourcePath).catch(() => {});
    if (!scaled) {
      await page.screenshot({ path: posterPath });
    }
  } else {
    await page.screenshot({ path: posterPath });
  }

  const gifPath = resolve(targetDir, 'preview.gif');
  let gifCreated = false;
  const framePaths = [];

  if (options.gif && canCreateGif) {
    const framePattern = resolve(targetDir, 'frame-%02d.png');
    for (let frame = 0; frame < options.frames; frame += 1) {
      const framePath = resolve(targetDir, `frame-${String(frame).padStart(2, '0')}.png`);
      await page.waitForTimeout(frame === 0 ? 0 : options.frameIntervalMs);
      await page.screenshot({ path: framePath });
      framePaths.push(framePath);
    }

    gifCreated = createGif(framePattern, gifPath);
    const palettePath = gifPath.replace(/\.gif$/i, '-palette.png');
    await Promise.all([
      ...framePaths.map((framePath) => unlink(framePath).catch(() => {})),
      unlink(palettePath).catch(() => {}),
    ]);
  }

  return {
    id: entry.id,
    url,
    posterPath,
    gifPath: gifCreated && existsSync(gifPath) ? gifPath : null,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const catalog = await readSimulationCatalog();
  const ids = new Set(options.ids);
  const simulations = (catalog.simulations || []).filter((entry) => {
    if (ids.size) return ids.has(entry.id);
    if (!options.includeHidden && entry.stage === 'hidden') return false;
    return Boolean(entry.launchPath);
  });

  if (!simulations.length) {
    console.error('No matching simulations to capture.');
    process.exit(1);
  }

  const canCreateGif = options.gif && hasFfmpeg();
  const browser = await chromium.launch({
    args: [
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });
  const page = await browser.newPage({
    viewport: options.viewport,
    deviceScaleFactor: 1,
  });

  const results = [];
  for (const entry of simulations) {
    console.log(`Capturing ${entry.id}...`);
    results.push(await captureEntry(page, entry, options, canCreateGif));
  }

  await browser.close();

  console.log(JSON.stringify({
    ok: true,
    gif: canCreateGif,
    count: results.length,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
