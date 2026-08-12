import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium, webkit } from 'playwright';
import {
  ABOUT_NARRATIVE_DISCIPLINE_VIEWFINDER,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDisciplineViewfinder.js';

const baseUrl = (process.env.ABS_DEV_URL || 'http://localhost:8012').trim().replace(/\/+$/, '');
const browserName = (process.env.ABS_BROWSER || 'chromium').trim().toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const outputDir = path.resolve('output/playwright/about-responsive-sequence', browserName);
const canonical = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const storyDurationWU = Number(canonical.profiles.desktop.storyDurationWU);
const scanStepWU = 0.05;
const maxInactiveRunWU = 0.15;
const maxResponsiveEditorialExitRunWU = 0.7;
const minDisciplineTravelPx = 100;
const disciplineReveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
const disciplineRestoreStartWU = Number(disciplineReveal.endWU)
  - Number(disciplineReveal.parameters.restoreDurationWU);
const disciplineLabels = disciplineReveal.parameters.items.map((item) => item.label);

const viewportDefinitions = [
  ['large-desktop', { width: 1920, height: 1080 }],
  ['desktop', { width: 1440, height: 1000 }],
  ['laptop', { width: 1280, height: 720 }],
  ['tablet', { width: 1024, height: 768 }],
  ['mobile', { width: 390, height: 844 }],
  ['narrow-mobile', { width: 375, height: 667 }],
];
const requestedViewport = (process.env.ABS_ABOUT_VIEWPORT || 'all').trim();
const viewports = requestedViewport === 'all'
  ? viewportDefinitions
  : viewportDefinitions.filter(([viewportId]) => viewportId === requestedViewport);

const criticalRanges = [
  [3.2, 7],
  [8.2, 11.6],
  [13.3, 17.1],
];

const evidenceWU = [
  8.35, 8.65, 8.95, 9.15, 9.47, 9.79, 10.11, 10.35, 10.85, 11, 11.15, 11.3,
  12.85, 13.55, 14.05, 14.1, 14.175, 14.25, 16.2, 16.9,
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function cleanWU(value) {
  return Number(value.toFixed(4));
}

function buildScanValues() {
  const values = [];
  for (const [startWU, endWU] of criticalRanges) {
    for (let storyWU = startWU; storyWU <= endWU + 0.0001; storyWU += scanStepWU) {
      values.push(cleanWU(storyWU));
    }
  }
  return [...new Set(values)].sort((left, right) => left - right);
}

async function setStoryWU(page, storyWU) {
  await page.locator('.about-narrative-scrollport').evaluate((node, { value, duration }) => {
    const travel = Math.max(0, node.scrollHeight - node.clientHeight);
    node.scrollTop = travel * Math.min(1, Math.max(0, value / duration));
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, { value: storyWU, duration: storyDurationWU });
  await page.waitForFunction((value) => {
    const sampled = Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu);
    return Number.isFinite(sampled) && Math.abs(sampled - value) <= 0.035;
  }, storyWU, { timeout: 30_000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function readActivity(page, storyWU) {
  return page.evaluate((requestedWU) => {
    const root = document.querySelector('.about-narrative-lab');
    const studio = document.querySelector('.about-narrative-scrollport')?.getBoundingClientRect();
    const foregroundSelectors = [
      '[data-editorial-reveal]',
      '.about-narrative-spatial-fragment',
      '.about-narrative-discipline-reveal li',
      '.about-interactive-stack',
    ];
    const foreground = studio
      ? [...document.querySelectorAll(foregroundSelectors.join(','))].filter((node) => {
        const rect = node.getBoundingClientRect();
        const opacity = Number(getComputedStyle(node).opacity);
        return opacity > 0.05
          && rect.right > studio.left
          && rect.left < studio.right
          && rect.bottom > studio.top
          && rect.top < studio.bottom;
      })
      : [];
    const worldVisibility = Number(root?.dataset.worldVisibility || 0);
    const disciplinePositions = [...document.querySelectorAll('.about-narrative-discipline-reveal li')]
      .flatMap((node) => {
        const rect = node.getBoundingClientRect();
        const opacity = Number(getComputedStyle(node).opacity);
        if (opacity <= 0.05
          || !studio
          || rect.bottom <= studio.top
          || rect.top >= studio.bottom) return [];
        return [{
          label: node.querySelector('.about-narrative-discipline-reveal__label')?.textContent.trim() || '',
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
        }];
      });
    const disciplineViewfinder = [...document.querySelectorAll('.about-narrative-discipline-reveal li')]
      .map((node) => {
        const style = getComputedStyle(node);
        return {
          label: node.querySelector('.about-narrative-discipline-reveal__label')?.textContent.trim() || '',
          opacity: Number(style.opacity),
          projectedY: Number.parseFloat(style.getPropertyValue('--discipline-y')),
        };
      });
    return {
      requestedWU,
      storyWU: Number(root?.dataset.narrativeStoryWu || 0),
      active: foreground.length > 0 || worldVisibility > 0.05,
      foregroundCount: foreground.length,
      worldVisibility,
      worldStage: root?.dataset.worldStage || '',
      disciplinePositions,
      disciplineViewfinder,
      visibleTextFields: [...new Set(foreground.map((node) => (
        node.closest('[data-text-field-id]')?.dataset.textFieldId || ''
      )).filter(Boolean))],
    };
  }, storyWU);
}

function groupInactiveRuns(samples) {
  const runs = [];
  let current = [];
  samples.forEach((sample) => {
    if (sample.active) {
      if (current.length) runs.push(current);
      current = [];
      return;
    }
    if (current.length && sample.storyWU - current.at(-1).storyWU > scanStepWU * 1.5) {
      runs.push(current);
      current = [];
    }
    current.push(sample);
  });
  if (current.length) runs.push(current);
  return runs.map((run) => ({
    startWU: cleanWU(run[0].storyWU),
    endWU: cleanWU(run.at(-1).storyWU),
    durationWU: cleanWU((run.at(-1).storyWU - run[0].storyWU) + scanStepWU),
  }));
}

await mkdir(outputDir, { recursive: true });
const browser = await browserType.launch({ headless: true });
const report = {
  browser: browserName,
  baseUrl,
  scanStepWU,
  maxInactiveRunWU,
  maxResponsiveEditorialExitRunWU,
  viewports: [],
};

try {
  for (const [viewportId, viewport] of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('.about-narrative-lab[data-world-prepare="ready"]', { timeout: 30_000 });
    const samples = [];
    for (const storyWU of buildScanValues()) {
      await setStoryWU(page, storyWU);
      samples.push(await readActivity(page, storyWU));
    }
    const inactiveRuns = groupInactiveRuns(samples);
    const unexpectedInactiveRuns = inactiveRuns.filter((run) => !(
      run.startWU >= 13.3
      && run.endWU <= 14.1 + scanStepWU + 0.0001
      && run.durationWU <= maxResponsiveEditorialExitRunWU + 0.0001
    ));
    const longestInactiveRunWU = Math.max(0, ...unexpectedInactiveRuns.map((run) => run.durationWU));
    assert(
      longestInactiveRunWU <= maxInactiveRunWU + 0.0001,
      `${viewportId}: inactive runs ${JSON.stringify(unexpectedInactiveRuns)} exceed ${maxInactiveRunWU.toFixed(2)} WU`,
    );
    const productPositions = samples.flatMap((sample) => (
      sample.disciplinePositions
        .filter((position) => position.label === 'Product Design')
        .map((position) => position.top)
    ));
    const disciplineTravelPx = productPositions.length > 1
      ? Math.max(...productPositions) - Math.min(...productPositions)
      : 0;
    assert(
      disciplineTravelPx >= minDisciplineTravelPx,
      `${viewportId}: Discipline camera travel moved Product Design by only ${disciplineTravelPx}px`,
    );
    const revealSamples = samples.filter((sample) => (
      sample.storyWU <= disciplineRestoreStartWU + scanStepWU + 0.0001
    ));
    disciplineLabels.forEach((label) => {
      const labelSamples = revealSamples
        .map((sample) => sample.disciplineViewfinder.find((item) => item.label === label))
        .filter(Boolean);
      const maxOpacity = Math.max(0, ...labelSamples.map((item) => item.opacity));
      assert(maxOpacity >= 0.95, `${viewportId}: ${label} never becomes fully readable before restore.`);
      labelSamples.filter((item) => item.opacity > 0.05).forEach((item) => {
        assert(
          item.projectedY <= (viewport.height * ABOUT_NARRATIVE_DISCIPLINE_VIEWFINDER.entryStartRatio) + 12,
          `${viewportId}: ${label} appeared below the authored viewfinder entry band at ${item.projectedY}px.`,
        );
      });
    });

    const screenshots = [];
    for (const storyWU of evidenceWU) {
      await setStoryWU(page, storyWU);
      const screenshot = path.join(outputDir, `${viewportId}-wu-${storyWU.toFixed(2).replace('.', '-')}.png`);
      await page.screenshot({ path: screenshot, animations: 'disabled', timeout: 60_000 });
      screenshots.push({ storyWU, screenshot });
    }
    report.viewports.push({
      viewportId,
      viewport,
      longestInactiveRunWU,
      inactiveRuns,
      unexpectedInactiveRuns,
      disciplineTravelPx,
      samples,
      screenshots,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const reportName = requestedViewport === 'all' ? 'report.json' : `report-${requestedViewport}.json`;
await writeFile(path.join(outputDir, reportName), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Responsive About Sequence audit passed in ${browserName}: ${viewports.length} viewports, longest inactive run ${Math.max(...report.viewports.map((entry) => entry.longestInactiveRunWU)).toFixed(2)} WU.`);
