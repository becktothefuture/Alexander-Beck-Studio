import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium, webkit } from 'playwright';

const baseUrl = (process.env.ABS_DEV_URL || 'http://localhost:8012').trim().replace(/\/+$/, '');
const browserName = (process.env.ABS_BROWSER || 'chromium').trim().toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const outputDir = path.resolve('output/playwright/about-responsive-sequence', browserName);
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function setStoryWU(page, storyWU) {
  await page.locator('.about-narrative-scrollport').evaluate((node, value) => {
    node.scrollTop = Math.min(
      node.scrollHeight - node.clientHeight,
      Math.max(0, Number(value) * node.clientHeight),
    );
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, storyWU);
  await page.waitForFunction((value) => {
    const sampled = Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu);
    return Number.isFinite(sampled) && Math.abs(sampled - value) <= 0.05;
  }, storyWU, { timeout: 30_000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function readContentLayout(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const content = document.querySelector('.about-narrative-content');
    const viewportHeight = Math.max(1, scrollport?.clientHeight || 1);
    const fields = [...document.querySelectorAll('[data-text-field-id]')].map((node) => {
      const wrapper = node.closest('.about-narrative-render-span');
      const wrapperStyle = getComputedStyle(wrapper);
      const nodeStyle = getComputedStyle(node);
      return {
        id: node.dataset.textFieldId,
        topWU: Number(((wrapper?.offsetTop || 0) / viewportHeight).toFixed(4)),
        durationWU: Number.parseFloat(wrapperStyle.getPropertyValue('--story-block-duration-wu')),
        gapWU: Number.parseFloat(wrapperStyle.getPropertyValue('--story-gap-after-wu')) || 0,
        backgroundColor: nodeStyle.backgroundColor,
        titleFont: node.querySelector('.about-narrative-spatial-title, .route-bookend-title')
          ? getComputedStyle(node.querySelector('.about-narrative-spatial-title, .route-bookend-title')).fontFamily
          : '',
      };
    });
    const disciplineItems = [...document.querySelectorAll('.about-narrative-discipline-list li')]
      .map((node) => ({
        title: node.querySelector('.about-narrative-discipline-list__label')?.textContent.trim() || '',
        description: node.querySelector('.about-narrative-discipline-list__description')?.textContent.trim() || '',
      }));
    return {
      mode: root?.dataset.aboutStoryLayout || '',
      instrumentSerifReady: document.fonts.check('16px "Instrument Serif"'),
      viewportHeight,
      maxStoryWU: Number((((scrollport?.scrollHeight || 0) - (scrollport?.clientHeight || 0)) / viewportHeight).toFixed(4)),
      contentHeight: content?.getBoundingClientRect().height || 0,
      scrollHeight: scrollport?.scrollHeight || 0,
      horizontalOverflow: Math.max(0, (scrollport?.scrollWidth || 0) - (scrollport?.clientWidth || 0)),
      fields,
      disciplineItems,
    };
  });
}

async function readRuntimeState(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    return {
      storyWU: Number(root?.dataset.narrativeStoryWu),
      visibility: Number(root?.dataset.worldVisibility),
      stage: root?.dataset.worldStage || '',
      preparation: root?.dataset.worldPrepare || '',
      resourceDiagnostics: window.__aboutNarrativeRuntime?.getMetrics?.().resourceDiagnosticCount,
    };
  });
}

await mkdir(outputDir, { recursive: true });
const browser = await browserType.launch({ headless: true });
const report = { browser: browserName, baseUrl, viewports: [] };

try {
  for (const [viewportId, viewport] of viewports) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    const externalFontErrors = [];
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const sourceUrl = message.location().url || '';
      const diagnostic = sourceUrl ? `${message.text()} [${sourceUrl}]` : message.text();
      // Google Fonts occasionally returns a stale CDN URL in WebKit. Keep the
      // remote outage visible in the report without letting it mask an app error.
      if (sourceUrl.startsWith('https://fonts.gstatic.com/')) {
        externalFontErrors.push(diagnostic);
        return;
      }
      consoleErrors.push(diagnostic);
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('.about-narrative-lab[data-world-prepare="ready"]', { timeout: 30_000 });
    await page.waitForFunction(
      () => document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete',
      undefined,
      { timeout: 30_000 },
    );

    const layout = await readContentLayout(page);
    assert(layout.mode === 'content-flow', `${viewportId}: Story Stack did not enter content-flow mode.`);
    assert(layout.instrumentSerifReady, `${viewportId}: the self-hosted title face is unavailable.`);
    assert(layout.fields.length === 12, `${viewportId}: expected 12 ordered story blocks.`);
    assert(layout.maxStoryWU > 12 && layout.maxStoryWU < 40, `${viewportId}: measured page length is implausible (${layout.maxStoryWU}).`);
    assert(Math.abs(layout.contentHeight - layout.scrollHeight) <= 1, `${viewportId}: content and scroll extent diverged.`);
    assert(layout.horizontalOverflow <= 1, `${viewportId}: story scrollport overflows horizontally by ${layout.horizontalOverflow}px.`);
    layout.fields.forEach((field, index) => {
      if (index > 0) assert(field.topWU > layout.fields[index - 1].topWU, `${viewportId}: ${field.id} is out of reading order.`);
      assert(Number.isFinite(field.durationWU) && field.durationWU > 0, `${viewportId}: ${field.id} has no measured duration.`);
      assert(field.gapWU <= 0.58, `${viewportId}: ${field.id} recreates an oversized ${field.gapWU} WU gap.`);
      assert(
        field.backgroundColor === 'rgba(0, 0, 0, 0)',
        `${viewportId}: ${field.id} introduces a text background surface (${field.backgroundColor}).`,
      );
      if (field.titleFont) assert(field.titleFont.includes('Instrument Serif'), `${viewportId}: ${field.id} lost Instrument Serif.`);
    });
    assert(
      layout.fields.at(-2).gapWU <= 0.58,
      `${viewportId}: the final transition gap is too long (${layout.fields.at(-2).gapWU} WU).`,
    );
    assert(layout.disciplineItems.length === 6, `${viewportId}: expected six disciplines.`);
    layout.disciplineItems.forEach((item) => {
      assert(item.title && item.description, `${viewportId}: a discipline is missing its title or description.`);
    });

    // Sample the complete measured page. Visibility is a material invariant;
    // intentional quiet text gaps must never turn the point world off.
    const samples = [];
    const sampleCount = 33;
    for (let index = 0; index < sampleCount; index += 1) {
      const storyWU = Number((layout.maxStoryWU * (index / (sampleCount - 1))).toFixed(4));
      await setStoryWU(page, storyWU);
      const state = await readRuntimeState(page);
      assert(state.preparation === 'ready', `${viewportId}: renderer was not ready at ${storyWU} WU.`);
      assert(state.visibility >= 0.999, `${viewportId}: point visibility fell to ${state.visibility} at ${storyWU} WU.`);
      assert(state.resourceDiagnostics === 0, `${viewportId}: renderer resource diagnostics appeared.`);
      samples.push(state);
    }
    const stages = samples.map((sample) => sample.stage).filter((stage, index, all) => stage && stage !== all[index - 1]);
    ['cluster-v1', 'turbulent-field-v1', 'calm-field-v1', 'bust-v1'].forEach((stage) => {
      assert(stages.includes(stage), `${viewportId}: responsive sequence never reached ${stage}.`);
    });
    assert(stages[0] === 'cluster-v1' && stages.at(-1) === 'bust-v1', `${viewportId}: world sequence endpoints are wrong (${stages.join(' → ')}).`);

    const screenshots = [];
    for (const [id, storyWU] of [
      ['opening', 0],
      ['middle', layout.maxStoryWU * 0.55],
      ['finale', layout.maxStoryWU],
    ]) {
      await setStoryWU(page, Number(storyWU.toFixed(4)));
      const screenshot = path.join(outputDir, `${viewportId}-${id}.png`);
      await page.screenshot({ path: screenshot, animations: 'disabled', timeout: 60_000 });
      screenshots.push({ id, storyWU, screenshot });
    }
    const finaleBounds = await page.locator('.about-narrative-finale-content').evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const studio = document.querySelector('.about-narrative-scrollport')?.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        studioLeft: studio?.left,
        studioTop: studio?.top,
        studioRight: studio?.right,
        studioBottom: studio?.bottom,
      };
    });
    assert(
      finaleBounds.left >= finaleBounds.studioLeft
        && finaleBounds.right <= finaleBounds.studioRight
        && finaleBounds.top >= finaleBounds.studioTop
        && finaleBounds.bottom <= finaleBounds.studioBottom,
      `${viewportId}: finale type leaves the studio viewport.`,
    );
    assert(consoleErrors.length === 0, `${viewportId}: console errors: ${consoleErrors.join(' | ')}`);

    report.viewports.push({
      viewportId,
      viewport,
      layout,
      stages,
      samples,
      finaleBounds,
      screenshots,
      externalFontErrors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const reportName = requestedViewport === 'all' ? 'report.json' : `report-${requestedViewport}.json`;
await writeFile(path.join(outputDir, reportName), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Responsive About Sequence audit passed in ${browserName}: ${viewports.length} content-derived viewports.`);
