import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const outputDir = 'output/playwright/about-narrative-hardening/runtime';
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
  ],
});

await mkdir(outputDir, { recursive: true });

const checkpoints = [
  { id: 'desktop-turbulent', storyWU: 3.2, sectionId: 'complexity', localProgress: 0.77, stage: 'turbulent-field-v1', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-discipline', storyWU: 8.4, sectionId: 'practice-reveal', localProgress: 0.95, stage: 'calm-field-v1', viewport: { width: 1440, height: 1000 } },
  { id: 'mobile-discipline', storyWU: 8.4, sectionId: 'practice-reveal', localProgress: 0.95, stage: 'calm-field-v1', viewport: { width: 390, height: 844 } },
  { id: 'desktop-bust', storyWU: 18.3, sectionId: 'epilogue', localProgress: 0.87, stage: 'bust-v1', viewport: { width: 1440, height: 1000 } },
  { id: 'reduced-motion-discipline', storyWU: 8.4, sectionId: 'practice-reveal', localProgress: 0.95, stage: 'calm-field-v1', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' },
];

const evidence = [];
for (const checkpoint of checkpoints) {
  const context = await browser.newContext({
    viewport: checkpoint.viewport,
    reducedMotion: checkpoint.reducedMotion || 'no-preference',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(`${baseUrl}/lab/about-narrative.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(`[data-narrative-section="${checkpoint.sectionId}"]`, { timeout: 20_000 });
  await page.evaluate(({ sectionId, localProgress }) => {
    const section = document.querySelector(`[data-narrative-section="${sectionId}"]`);
    const scrollport = document.querySelector('.about-narrative-scrollport');
    if (!section || !scrollport) return;
    const scrollTravel = Math.max(0, section.offsetHeight - scrollport.clientHeight);
    scrollport.scrollTo(0, section.offsetTop + (scrollTravel * localProgress));
    scrollport.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, checkpoint);
  await page.waitForFunction(({ stage }) => {
    const root = document.querySelector('.about-narrative-lab');
    return root?.dataset.worldPrepare === 'ready'
      && root.dataset.worldStage === stage
      && window.__aboutNarrativeRuntime?.getMetrics?.().fixedAttributeIdentityStable === true;
  }, { stage: checkpoint.stage }, { timeout: 30_000 });
  await page.waitForTimeout(250);

  const state = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const canvas = document.querySelector('.about-narrative-world__canvas');
    const metrics = window.__aboutNarrativeRuntime.getMetrics();
    return {
      stage: root?.dataset.worldStage || '',
      prepare: root?.dataset.worldPrepare || '',
      anchorSampling: root?.dataset.worldAnchorSampling || '',
      disciplineLabels: Number(root?.dataset.worldDisciplineLabels || 0),
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      drawCalls: metrics.drawCalls,
      fixedAttributeIdentityStable: metrics.fixedAttributeIdentityStable,
      resourceDiagnosticCount: metrics.resourceDiagnosticCount,
    };
  });
  const screenshot = `${outputDir}/${checkpoint.id}.png`;
  await page.screenshot({ path: screenshot, fullPage: false });

  assert.equal(state.stage, checkpoint.stage);
  assert.equal(state.prepare, 'ready');
  assert.ok(state.canvasWidth > 0 && state.canvasHeight > 0);
  assert.equal(state.drawCalls, 1);
  assert.equal(state.fixedAttributeIdentityStable, true);
  assert.equal(state.resourceDiagnosticCount, 0);
  if (checkpoint.sectionId === 'practice-reveal') assert.equal(state.anchorSampling, 'exact');
  assert.deepEqual(consoleErrors, []);

  evidence.push({ ...checkpoint, state, consoleErrors, screenshot });
  await context.close();
}

await writeFile(
  `${outputDir}/visual-checkpoints.json`,
  `${JSON.stringify({ baseUrl, recordedAt: new Date().toISOString(), checkpoints: evidence }, null, 2)}\n`,
);
await browser.close();
console.log(`PASS: ${checkpoints.length} runtime visual checkpoints are ready, stable, and diagnostic-free.`);
