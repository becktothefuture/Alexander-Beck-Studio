import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8016';
const experienceVersion = 'main';
const expectedWorldStage = 'long-assembly-corridor-v1';
const outputDir = 'output/playwright/about-narrative-hardening/runtime';
const source = await readFile(
  'react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
  'utf8',
);
const revealSource = source.slice(
  source.indexOf('const updateDisciplineReveal ='),
  source.indexOf('const render ='),
);
const renderSource = source.slice(
  source.indexOf('const render ='),
  source.indexOf('const handlePointerDown ='),
);

assert.doesNotMatch(revealSource, /\.forEach\s*\(/, 'Discipline hot sampling must use indexed loops.');
assert.doesNotMatch(revealSource, /querySelector/, 'Discipline labels must be cached before hot sampling.');
assert.doesNotMatch(revealSource, /aria-hidden/, 'Discipline semantics must remain exposed while visual reveal changes.');
assert.doesNotMatch(renderSource, /bustController\.sample\s*\(\s*\{/, 'Bust sampling must use stable caller input.');
assert.doesNotMatch(renderSource, /setModifierUniforms\s*\(\s*['"]/, 'Modifier uniforms must not build dynamic property names.');
assert.doesNotMatch(renderSource, /new\s+(?:Array|Float\w*Array|THREE\.)/, 'PointWorld render must not construct owned hot-frame objects.');
assert.doesNotMatch(renderSource, /frame\.(?:section|sectionIndex|localProgress)\b/, 'PointWorld must consume sectionless frame signals.');
assert.match(renderSource, /frame\.interactions\?\.activeInteraction/, 'PointWorld must consume the active Interaction clip.');
assert.match(renderSource, /frame\.interactions\.interactionActivated/, 'PointWorld must consume absolute Interaction activation.');
assert.match(
  source,
  /resolveAboutNarrativePointProfile\(layoutProfile\)/,
  'Point resources must be selected from the measured layout profile.',
);

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
    '--enable-precise-memory-info',
  ],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.emulateMedia({ reducedMotion: 'reduce' });
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(error.message));

try {
  await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (
    typeof window.__aboutNarrativeRuntime?.resetHotFrameMetrics === 'function'
    && document.querySelector('.about-narrative-lab')?.dataset.worldPrepare === 'ready'
  ), null, { timeout: 60_000 });

  await page.waitForFunction((worldStage) => (
    document.querySelector('.about-narrative-lab')?.dataset.worldStage === worldStage
    && window.__aboutNarrativeRuntime?.getMetrics?.().fixedAttributeIdentityStable === true
  ), expectedWorldStage, { timeout: 60_000 });

  await page.waitForTimeout(500);
  await page.evaluate(() => window.__aboutNarrativeRuntime.resetHotFrameMetrics());
  await page.waitForFunction(() => (
    window.__aboutNarrativeRuntime.getMetrics().hotFrameCount >= 600
  ), null, { timeout: 60_000, polling: 100 });

  const metrics = await page.evaluate(() => window.__aboutNarrativeRuntime.getMetrics());
  assert.ok(metrics.hotFrameCount >= 600);
  assert.equal(metrics.hotFrameOwnedAllocations, 0);
  assert.equal(metrics.hotFrameDomQueries, 0);
  assert.equal(metrics.hotFrameDomWrites, 0);
  assert.equal(metrics.fixedAttributeIdentityStable, true);
  assert.equal(metrics.drawCalls, 1);
  assert.deepEqual(consoleErrors, []);

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    `${outputDir}/hot-frame-600-${experienceVersion}.json`,
    `${JSON.stringify({
      baseUrl,
      experienceVersion,
      recordedAt: new Date().toISOString(),
      storyWU: 0,
      liveAmbient: false,
      reducedMotion: true,
      metrics,
      consoleErrors,
    }, null, 2)}\n`,
  );
  console.log(`PASS: ${metrics.hotFrameCount} fixed PointWorld frames made no owned allocations, DOM queries, or DOM writes.`);
} finally {
  await browser.close();
}
