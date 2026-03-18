import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const outputDir = resolve(repoRoot, 'output/playwright/screens-certification');
const previewPort = Number(process.env.ABS_CERT_PORT || 8014);
const previewHost = process.env.ABS_CERT_HOST || '127.0.0.1';
const baseUrl = `http://${previewHost}:${previewPort}`;
const screenshotBrowser = 'chromium';
const acceptableBootStates = ['ready', 'content-ready', 'entered'];

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
        requiredText: ['Bio/CV', 'Contact'],
        requiredTextAnyOf: [['Work', 'Portfolio']]
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

function startPreviewServer() {
  const child = run(
    'npm',
    ['run', 'preview', '--prefix', 'react-app/app', '--', '--host', previewHost, '--port', String(previewPort)],
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

function analyzeScreenshotWithPython(filePath) {
  const script = `
from pathlib import Path
from PIL import Image, ImageStat
import json
import sys

path = Path(sys.argv[1])
img = Image.open(path).convert('RGB')
stat = ImageStat.Stat(img)
colors = img.getcolors(maxcolors=1_000_000) or []
colors.sort(reverse=True)
total = img.size[0] * img.size[1]
top_share = colors[0][0] / total if colors else 0.0
stddev = sum(stat.stddev) / len(stat.stddev)
mean = sum(stat.mean) / len(stat.mean)
result = {
  "uniqueColors": len(colors),
  "topColorShare": top_share,
  "stddev": stddev,
  "mean": mean,
}
print(json.dumps(result))
`;

  const child = run('python3', ['-c', script, filePath]);
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`python image analysis failed (${code}): ${stderr.trim()}`));
        return;
      }
      resolve(JSON.parse(stdout));
    });
  });
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

async function waitForEntryReadiness(page, entry, timeoutMs = 16000) {
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
  await delay(readiness.ready ? 800 : 250);
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

  const imageMetrics = await analyzeScreenshotWithPython(screenshotPath);
  imageMetrics.isNearBlank =
    imageMetrics.topColorShare >= 0.985 ||
    (imageMetrics.uniqueColors <= 8 && imageMetrics.stddev <= 1.5);

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

  await context.close();
  return result;
}

async function main() {
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  const preview = startPreviewServer();

  try {
    await waitForHttpReady(`${baseUrl}/`);
  } catch (error) {
    preview.child.kill('SIGTERM');
    throw new Error(`${error.message}\n${preview.getLogs()}`);
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const entry of matrix) {
      for (const viewport of viewports) {
        for (const theme of themes) {
          results.push(await certifyEntry(browser, entry, viewport, theme));
        }
      }
    }
  } finally {
    await browser.close();
    preview.child.kill('SIGTERM');
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
