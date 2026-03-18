import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import process from 'node:process';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const outputDir = resolve(repoRoot, 'output/playwright/screens-certification');
const previewHost = process.env.ABS_CERT_HOST || '127.0.0.1';
const configuredPreviewPort = Number(process.env.ABS_CERT_PORT || 0);
let previewPort = configuredPreviewPort || 8014;
let baseUrl = `http://${previewHost}:${previewPort}`;
const screenshotBrowser = 'chromium';
const acceptableBootStates = ['ready', 'content-ready', 'entered'];
const previewMarkers = ['Alexander Beck Studio', '/css/tokens.css'];

const matrix = [
  {
    page: 'home',
    path: '/',
    readySelectors: ['#app-frame', '#main-links button', '#expertise-legend .legend__item', '.decorative-script p'],
    minReadySelectors: 3,
    selectors: [
      { selector: '#app-frame', minArea: 200000, requiredText: [] },
      {
        selector: '#main-links button',
        minCount: 3,
        minArea: 400,
        requiredText: ['Bio/CV', 'Contact', 'Portfolio']
      },
      {
        selector: '#expertise-legend .legend__item',
        minCount: 5,
        minArea: 100,
        requiredTextAnyOf: [['Product Systems', 'Interaction Design', 'Creative Technology']]
      },
      {
        selector: '.decorative-script p',
        minArea: 12000,
        requiredTextAnyOf: [["Let's chat", "Let’s chat"]]
      }
    ]
  },
  {
    page: 'portfolio',
    path: '/portfolio.html',
    sessionStorage: {
      abs_portfolio_ok: 'certified'
    },
    readySelectors: ['#app-frame', '.portfolio-stage', '#portfolioMeta', '#track .slide'],
    minReadySelectors: 3,
    selectors: [
      { selector: '#app-frame', minArea: 200000, requiredText: [] },
      { selector: '.portfolio-stage', minArea: 60000, requiredText: [] },
      { selector: '#portfolioMeta', minArea: 2000, requiredText: [] },
      { selector: '#track .slide', minCount: 3, minArea: 15000, requiredText: [] }
    ]
  },
  {
    page: 'cv',
    path: '/cv.html',
    sessionStorage: {
      abs_cv_ok: 'certified'
    },
    readySelectors: ['#app-frame', '.cv-scroll-container', '.cv-photo__image', '.cv-right__inner'],
    minReadySelectors: 3,
    selectors: [
      { selector: '#app-frame', minArea: 200000, requiredText: [] },
      { selector: '.cv-scroll-container', minArea: 80000, requiredText: [] },
      { selector: '.cv-photo__image', minArea: 40000, requiredText: [] },
      { selector: '.cv-right__inner', minArea: 80000, requiredText: ['About', 'Experience'] }
    ]
  }
];

const viewports = [
  { label: 'mobile', width: 375, height: 812 },
  { label: 'desktop', width: 1440, height: 900 }
];

const themes = ['light', 'dark'];

function toFilename({ page, width, height, theme }) {
  return `${page}-${width}x${height}-${theme}.png`;
}

function summarizeReasons(result) {
  const reasons = [...(result.runtimeFailures || [])];

  if (!result.bootStateOk) reasons.push(`boot-state:${result.bootState}`);
  if (result.selectorFailures.length > 0) reasons.push(...result.selectorFailures);
  if (result.imageMetrics.isNearBlank) {
    reasons.push(
      `near-blank:top-share=${result.imageMetrics.topColorShare.toFixed(4)},unique=${result.imageMetrics.uniqueColors},stddev=${result.imageMetrics.stddev.toFixed(2)}`
    );
  }

  return reasons;
}

function run(command, args, options = {}) {
  return spawn(command, args, {
    cwd: repoRoot,
    stdio: options.stdio || 'pipe',
    env: { ...process.env, ...(options.env || {}) }
  });
}

function log(message) {
  console.log(`[certify] ${message}`);
}

async function findOpenPort() {
  if (configuredPreviewPort > 0) return configuredPreviewPort;

  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, previewHost, () => {
      const address = server.address();
      const freePort =
        typeof address === 'object' && address && typeof address.port === 'number'
          ? address.port
          : null;

      if (!freePort) {
        server.close(() => reject(new Error('Could not determine a free preview port')));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolvePort(freePort);
      });
    });
  });
}

async function waitForHttpReady(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) return;
      lastError = new Error(`unexpected status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }

  throw new Error(`Preview server did not become ready at ${url}: ${lastError?.message || 'unknown error'}`);
}

async function waitForExpectedPreviewServer(timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/`, { method: 'GET' });
      if (!response.ok) {
        lastError = new Error(`unexpected status ${response.status}`);
        await delay(250);
        continue;
      }

      const html = await response.text();
      const hasExpectedMarkers = previewMarkers.every((marker) => html.includes(marker));

      if (hasExpectedMarkers) {
        return;
      }

      lastError = new Error(`response from ${baseUrl}/ did not match expected app markers`);
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  throw new Error(`Expected preview server did not become ready at ${baseUrl}/: ${lastError?.message || 'unknown error'}`);
}

function startPreviewServer() {
  const child = run(
    'npm',
    ['run', 'preview', '--prefix', 'react-app/app', '--', '--host', previewHost, '--port', String(previewPort), '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  let logs = '';
  child.stdout.on('data', (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk.toString();
  });

  return { child, getLogs: () => logs };
}

function stopPreviewServer(preview) {
  if (!preview?.child) return;
  if (preview.reused) return;
  if (preview.child.exitCode !== null) return;
  preview.child.kill('SIGTERM');
}

async function waitForPreviewServer(preview, timeoutMs = 15000) {
  const startedAt = Date.now();
  const expectedHost = `${previewHost}:${previewPort}`;

  while (Date.now() - startedAt < timeoutMs) {
    if (preview.child.exitCode !== null) {
      throw new Error(`Preview server exited before becoming ready.\n${preview.getLogs()}`);
    }

    if (preview.getLogs().includes(expectedHost)) {
      return;
    }

    await delay(100);
  }

  throw new Error(`Preview server did not report readiness for ${expectedHost}.\n${preview.getLogs()}`);
}

async function ensurePreviewServer() {
  try {
    await waitForExpectedPreviewServer(1200);
    return {
      child: null,
      reused: true,
      getLogs: () => 'reused existing preview server'
    };
  } catch {
    // No healthy preview server yet; fall through and start one.
  }

  const preview = startPreviewServer();

  try {
    await waitForPreviewServer(preview);
    await waitForExpectedPreviewServer();
    return {
      ...preview,
      reused: false
    };
  } catch (error) {
    const logs = preview.getLogs();

    if (logs.includes(`Port ${previewPort} is already in use`) || /Port \d+ is already in use/.test(logs)) {
      await waitForExpectedPreviewServer(5000);
      return {
        child: null,
        reused: true,
        getLogs: () => logs
      };
    }

    stopPreviewServer(preview);
    throw error;
  }
}

function analyzeScreenshot(filePath) {
  const { width, height, data } = PNG.sync.read(readFileSync(filePath));
  const totalPixels = width * height;
  const stride = Math.max(1, Math.floor(Math.sqrt(totalPixels / 60000)));
  const colorCounts = new Map();
  let samples = 0;
  let sum = 0;
  let sumSquares = 0;

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const index = (width * y + x) << 2;
      const alpha = data[index + 3] / 255;
      const red = Math.round(255 + (data[index] - 255) * alpha);
      const green = Math.round(255 + (data[index + 1] - 255) * alpha);
      const blue = Math.round(255 + (data[index + 2] - 255) * alpha);
      const quantized = ((red >> 4) << 8) | ((green >> 4) << 4) | (blue >> 4);
      const luminance = (red + green + blue) / 3;

      colorCounts.set(quantized, (colorCounts.get(quantized) || 0) + 1);
      sum += luminance;
      sumSquares += luminance * luminance;
      samples += 1;
    }
  }

  const mean = samples > 0 ? sum / samples : 0;
  const variance = samples > 0 ? Math.max(0, sumSquares / samples - mean * mean) : 0;
  const topColorShare = samples > 0 ? Math.max(...colorCounts.values()) / samples : 0;

  return {
    uniqueColors: colorCounts.size,
    topColorShare,
    stddev: Math.sqrt(variance),
    mean,
    samples,
    stride
  };
}

async function preparePage(page, entry, theme) {
  await page.addInitScript(({ themeName, sessionValues }) => {
    try {
      localStorage.setItem('theme-preference-v2', themeName);
      localStorage.removeItem('theme-preference');
    } catch {
      // Ignore unavailable storage during certification.
    }

    try {
      Object.entries(sessionValues || {}).forEach(([key, value]) => {
        sessionStorage.setItem(key, String(value));
      });
    } catch {
      // Ignore unavailable storage during certification.
    }
  }, {
    themeName: theme,
    sessionValues: entry.sessionStorage || {}
  });
}

async function sampleReadiness(page, entry) {
  return page.evaluate((input) => {
    const selectorSummary = input.readySelectors.map((selector) => {
      const elements = Array.from(document.querySelectorAll(selector));
      const visibleStats = elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const visible =
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            Number(style.opacity || '1') > 0.05;

          return {
            visible,
            area: Math.max(0, rect.width) * Math.max(0, rect.height)
          };
        })
        .filter((item) => item.visible);

      return {
        selector,
        totalCount: elements.length,
        visibleCount: visibleStats.length,
        maxArea: visibleStats.reduce((max, item) => Math.max(max, item.area), 0)
      };
    });

    return {
      bootState: document.documentElement.dataset.absBootState || '',
      readyState: document.readyState,
      visibleSelectors: selectorSummary.filter((item) => item.visibleCount > 0).length,
      selectorSummary
    };
  }, { readySelectors: entry.readySelectors || [] });
}

function formatReadinessFailure(sample) {
  if (!sample) return 'no-readiness-sample';
  const selectorText = sample.selectorSummary
    .map((item) => `${item.selector}:${item.visibleCount}/${item.totalCount}`)
    .join(',');
  return `boot=${sample.bootState || 'unset'},dom=${sample.readyState},visible=${sample.visibleSelectors},selectors=${selectorText}`;
}

async function waitForEntryReadiness(page, entry, timeoutMs = 22000) {
  const startedAt = Date.now();
  let lastSample = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastSample = await sampleReadiness(page, entry);

    if (acceptableBootStates.includes(lastSample.bootState)) {
      return {
        ready: true,
        source: `boot-state:${lastSample.bootState}`,
        lastSample
      };
    }

    if (lastSample.visibleSelectors >= (entry.minReadySelectors || 1)) {
      return {
        ready: true,
        source: `selectors:${lastSample.visibleSelectors}`,
        lastSample
      };
    }

    await delay(250);
  }

  return {
    ready: false,
    source: 'timeout',
    lastSample
  };
}

async function navigateAndWait(page, entry) {
  await page.goto(`${baseUrl}${entry.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForSelector('#app-frame', { state: 'attached', timeout: 8000 }).catch(() => {});

  const readiness = await waitForEntryReadiness(page, entry);
  await delay(readiness.ready ? 1500 : 250);
  return readiness;
}

async function collectSelectorStats(page, requirement) {
  return page.evaluate((input) => {
    const elements = Array.from(document.querySelectorAll(input.selector));
    const stats = elements.map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const text = (element.textContent || '').replace(/\\s+/g, ' ').trim();
      return {
        area: Math.max(0, rect.width) * Math.max(0, rect.height),
        visible:
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          Number(style.opacity || '1') > 0,
        text
      };
    });

    return {
      selector: input.selector,
      count: stats.length,
      stats
    };
  }, requirement);
}

function assessRequirement(requirement, selectorResult) {
  const failures = [];
  const presentStats = selectorResult.stats.filter((item) => item.visible || item.area > 0);

  if (requirement.minCount && presentStats.length < requirement.minCount) {
    failures.push(`${requirement.selector}:expected-visible-count>=${requirement.minCount},got=${presentStats.length}`);
  }

  if (!requirement.minCount && presentStats.length === 0) {
    failures.push(`${requirement.selector}:not-visible`);
  }

  if (requirement.minArea) {
    const maxArea = presentStats.reduce((max, item) => Math.max(max, item.area), 0);
    if (maxArea < requirement.minArea) {
      failures.push(`${requirement.selector}:area<${requirement.minArea}`);
    }
  }

  if (requirement.requiredText?.length) {
    const combinedText = presentStats.map((item) => item.text).join(' ').toLowerCase();
    requirement.requiredText.forEach((expected) => {
      if (!combinedText.includes(String(expected).toLowerCase())) {
        failures.push(`${requirement.selector}:missing-text:${expected}`);
      }
    });
  }

  if (requirement.requiredTextAnyOf?.length) {
    const combinedText = presentStats.map((item) => item.text).join(' ').toLowerCase();
    requirement.requiredTextAnyOf.forEach((options) => {
      const matched = options.some((expected) => combinedText.includes(String(expected).toLowerCase()));
      if (!matched) {
        failures.push(`${requirement.selector}:missing-any-of:${options.join('|')}`);
      }
    });
  }

  return {
    selector: requirement.selector,
    failures,
    visibleCount: presentStats.length
  };
}

async function certifyEntry(browser, entry, viewport, theme) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: theme === 'dark' ? 'dark' : 'light',
    reducedMotion: 'no-preference',
    deviceScaleFactor: 1
  });

  try {
    const page = await context.newPage();
    await preparePage(page, entry, theme);
    log(`checking ${entry.page} ${viewport.width}x${viewport.height} ${theme}`);

    const runtimeFailures = [];
    let readiness = {
      ready: false,
      source: 'not-started',
      lastSample: null
    };

    try {
      readiness = await navigateAndWait(page, entry);
    } catch (error) {
      runtimeFailures.push(`navigation:${String(error.message || error).split('\n')[0]}`);
    }

    const bootState = await page.evaluate(() => document.documentElement.dataset.absBootState || '').catch(() => '');
    const selectorResults = [];
    const selectorFailures = [];

    for (const requirement of entry.selectors) {
      try {
        const selectorResult = await collectSelectorStats(page, requirement);
        const assessed = assessRequirement(requirement, selectorResult);
        selectorResults.push({ ...selectorResult, assessment: assessed });
        selectorFailures.push(...assessed.failures);
      } catch (error) {
        const failure = `${requirement.selector}:evaluation-error`;
        selectorResults.push({
          selector: requirement.selector,
          count: 0,
          stats: [],
          assessment: {
            selector: requirement.selector,
            failures: [failure],
            visibleCount: 0
          }
        });
        selectorFailures.push(failure);
        runtimeFailures.push(`${requirement.selector}:evaluation:${String(error.message || error).split('\n')[0]}`);
      }
    }

    if (!readiness.ready) {
      runtimeFailures.push(`readiness-timeout:${formatReadinessFailure(readiness.lastSample)}`);
    }

    mkdirSync(outputDir, { recursive: true });
    const screenshotName = toFilename({
      page: entry.page,
      width: viewport.width,
      height: viewport.height,
      theme
    });
    const screenshotPath = join(outputDir, screenshotName);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const imageMetrics = analyzeScreenshot(screenshotPath);
    imageMetrics.isNearBlank =
      imageMetrics.topColorShare >= 0.965 ||
      (imageMetrics.uniqueColors <= 12 && imageMetrics.stddev <= 2.5);

    const result = {
      page: entry.page,
      path: entry.path,
      theme,
      viewport,
      screenshot: screenshotPath,
      bootState,
      bootStateOk: acceptableBootStates.includes(bootState),
      readiness,
      runtimeFailures,
      selectorResults,
      selectorFailures,
      imageMetrics
    };

    result.passed = summarizeReasons(result).length === 0;
    result.failures = summarizeReasons(result);
    return result;
  } finally {
    await context.close().catch(() => {});
  }
}

function shouldRetryResult(result) {
  if (result.passed) return false;
  return result.runtimeFailures.some((failure) =>
    failure.startsWith('navigation:') ||
    failure.startsWith('readiness-timeout:') ||
    failure.includes(':evaluation:')
  ) || result.imageMetrics?.isNearBlank;
}

async function certifyEntryWithRetry(entry, viewport, theme, maxAttempts = 3) {
  let lastResult = null;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const browser = await chromium.launch({ headless: true });

    try {
      const result = await certifyEntry(browser, entry, viewport, theme);
      lastResult = result;

      if (!shouldRetryResult(result) || attempt === maxAttempts) {
        return result;
      }

      log(
        `retrying ${entry.page} ${viewport.width}x${viewport.height} ${theme} after transient failure (${result.failures.join(' | ')})`
      );
      await delay(500);
      await waitForHttpReady(`${baseUrl}/`, 5000).catch(() => {});
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) throw error;
      log(
        `retrying ${entry.page} ${viewport.width}x${viewport.height} ${theme} after browser error (${String(error.message || error).split('\n')[0]})`
      );
      await delay(500);
      await waitForHttpReady(`${baseUrl}/`, 5000).catch(() => {});
    } finally {
      await browser.close().catch(() => {});
    }
  }

  if (lastResult) return lastResult;
  throw lastError || new Error('certification failed without a result');
}

async function main() {
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  previewPort = await findOpenPort();
  baseUrl = `http://${previewHost}:${previewPort}`;

  let preview = null;

  try {
    preview = await ensurePreviewServer();
  } catch (error) {
    stopPreviewServer(preview);
    throw new Error(`${error.message}\n${preview?.getLogs?.() || ''}`.trim());
  }

  const results = [];

  try {
    for (const entry of matrix) {
      for (const viewport of viewports) {
        for (const theme of themes) {
          results.push(await certifyEntryWithRetry(entry, viewport, theme));
        }
      }
    }
  } finally {
    stopPreviewServer(preview);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    screenshotBrowser,
    summary: {
      total: results.length,
      passed: results.filter((item) => item.passed).length,
      failed: results.filter((item) => !item.passed).length
    },
    screenshotMatrix: results
  };

  const reportPath = join(outputDir, 'report.json');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const failed = results.filter((item) => !item.passed);
  if (failed.length > 0) {
    console.error('Screen certification failed.');
    failed.forEach((item) => {
      console.error(
        `- ${item.page} ${item.viewport.width}x${item.viewport.height} ${item.theme}: ${item.failures.join('; ')}`
      );
    });
    process.exitCode = 1;
    return;
  }

  console.log(`Screen certification passed: ${report.summary.passed}/${report.summary.total} states.`);
  console.log(`Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
