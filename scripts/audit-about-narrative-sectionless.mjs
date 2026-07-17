import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER || 'chromium';
const productionOnly = process.env.ABS_ABOUT_PRODUCTION_INDICATOR_ONLY === '1';
const editorOnly = process.env.ABS_ABOUT_EDITOR_ONLY === '1';
const browserType = browserName === 'webkit' ? webkit : chromium;
const browser = await browserType.launch(browserName === 'chromium' ? {
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
  ],
} : { headless: true });
const outputDir = 'output/playwright/about-narrative-sectionless';

await mkdir(outputDir, { recursive: true });

function observeErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function auditProduction(viewport, label, expectedProfile) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = observeErrors(page);
  await page.goto(`${baseUrl}/about.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-narrative-lab');
  await page.waitForFunction(() => document.querySelectorAll('[data-text-field-id]').length === 26);

  const initial = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const indicator = document.querySelector('.about-narrative-indicator');
    const canvas = document.querySelector('.about-narrative-world__canvas');
    return {
      canvasCount: document.querySelectorAll('.about-narrative-world__canvas').length,
      canvasHeight: canvas?.height || 0,
      canvasWidth: canvas?.width || 0,
      editorCount: document.querySelectorAll('.about-track-editor').length,
      indicatorCount: document.querySelectorAll('.about-narrative-indicator__line').length,
      indicatorHost: indicator?.parentElement?.dataset.aboutIndicatorHost || '',
      layoutProfile: root?.dataset.aboutLayoutProfile || '',
      legacyContainerCount: document.querySelectorAll('[data-narrative-section], [data-section-id], .about-narrative-section').length,
      semanticFieldCount: document.querySelectorAll('[data-text-field-id]').length,
      stubSemanticCount: document.querySelectorAll('[data-text-field-kind="stub"]').length,
    };
  });
  assert.equal(initial.editorCount, 0);
  assert.equal(initial.legacyContainerCount, 0);
  assert.equal(initial.semanticFieldCount, 26);
  assert.equal(initial.stubSemanticCount, 0);
  assert.equal(initial.canvasCount, 1);
  assert.ok(initial.canvasWidth > 0 && initial.canvasHeight > 0);
  assert.equal(initial.indicatorCount, 18);
  assert.equal(initial.indicatorHost, 'shell-persistent');
  assert.equal(initial.layoutProfile, expectedProfile);

  await page.locator('.about-narrative-scrollport').evaluate((node) => {
    node.scrollTop = (node.scrollHeight - node.clientHeight) * (11.49 / 21.8);
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const root = document.querySelector('.about-narrative-lab');
    const storyWU = Number(root?.dataset.narrativeStoryWu);
    return storyWU > 11.45
      && storyWU < 11.55
      && root?.dataset.worldDisciplineLabels === '6';
  });
  const disciplineState = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const viewport = document.querySelector('.about-narrative-discipline-reveal').getBoundingClientRect();
    const labels = [...document.querySelectorAll('[data-discipline-group]')].map((label) => label.getBoundingClientRect());
    return {
      activeWorld: root.dataset.activeNarrativeWorld,
      gridInfluence: root.dataset.worldGridInfluence,
      worldFrom: root.dataset.worldFrom,
      worldTo: root.dataset.worldTo,
      labelsWithinViewport: labels.every((rect) => (
        rect.left >= viewport.left - 1
        && rect.right <= viewport.right + 1
        && rect.top >= viewport.top - 1
        && rect.bottom <= viewport.bottom + 1
      )),
    };
  });
  assert.deepEqual(disciplineState, {
    activeWorld: 'world-discipline-isolation',
    gridInfluence: '0.0000',
    worldFrom: 'calm-field-v1',
    worldTo: 'calm-field-v1',
    labelsWithinViewport: true,
  });
  await page.screenshot({ path: `${outputDir}/${browserName}-production-${label}-discipline.png` });

  await page.locator('.about-narrative-scrollport').evaluate((node) => {
    node.scrollTop = node.scrollHeight - node.clientHeight;
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector('.about-narrative-indicator')?.getAttribute('aria-valuenow') === '100');
  const endState = await page.locator('.about-narrative-indicator').evaluate((node) => ({
    active: [...node.querySelectorAll('[data-active="true"]')].map((line) => Number(line.dataset.lineIndex)),
    valueText: node.getAttribute('aria-valuetext'),
  }));
  assert.deepEqual(endState.active, [16, 17]);
  assert.equal(endState.valueText, '100% through the About narrative');
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `${outputDir}/${browserName}-production-${label}.png` });
  await context.close();
}

async function auditEditor() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = observeErrors(page);
  await page.goto(`${baseUrl}/lab/about-narrative.html?edit=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-track-editor');
  await page.waitForFunction(() => document.querySelectorAll('[data-text-field-id]').length === 26);

  const initial = await page.evaluate(() => ({
    editorVersion: document.querySelector('.about-track-editor')?.dataset.editorVersion,
    lanes: [...document.querySelectorAll('[data-track-lane]')].map((lane) => lane.dataset.trackLane),
    legacyContainerCount: document.querySelectorAll('[data-narrative-section], [data-section-id], .about-narrative-section').length,
    plusLabels: [...document.querySelectorAll('.about-track-editor-add')].map((button) => button.getAttribute('aria-label')),
    semanticFieldCount: document.querySelectorAll('[data-text-field-id]').length,
  }));
  assert.equal(initial.editorVersion, 'sectionless-v3');
  assert.deepEqual(initial.lanes, ['camera', 'world', 'text', 'interaction']);
  assert.equal(initial.legacyContainerCount, 0);
  assert.equal(initial.plusLabels.length, 4);
  assert.equal(initial.semanticFieldCount, 26);

  const editorialConnection = await page.evaluate(() => {
    const first = document.querySelector('[data-track-object-id="text-background-title"]');
    const middle = document.querySelector('[data-track-object-id="text-background-fragmented"]');
    const last = document.querySelector('[data-track-object-id="text-background-clients"]');
    const firstRect = first?.getBoundingClientRect();
    const middleRect = middle?.getBoundingClientRect();
    return {
      firstBefore: first?.classList.contains('is-connected-before'),
      firstAfter: first?.classList.contains('is-connected-after'),
      middleBefore: middle?.classList.contains('is-connected-before'),
      middleAfter: middle?.classList.contains('is-connected-after'),
      lastBefore: last?.classList.contains('is-connected-before'),
      lastAfter: last?.classList.contains('is-connected-after'),
      firstGap: middleRect && firstRect ? middleRect.left - firstRect.right : Number.POSITIVE_INFINITY,
    };
  });
  assert.deepEqual(
    { ...editorialConnection, firstGap: undefined },
    {
      firstBefore: false,
      firstAfter: true,
      middleBefore: true,
      middleAfter: true,
      lastBefore: true,
      lastAfter: false,
      firstGap: undefined,
    },
  );
  assert.ok(Math.abs(editorialConnection.firstGap) < 0.1, `Connected editorial gap was ${editorialConnection.firstGap}px.`);

  const disciplineEditorialConnection = await page.evaluate(() => {
    const ids = [
      'text-disciplines-title',
      'text-disciplines-practice',
      'text-disciplines-ai',
      'text-disciplines-synthesis',
    ];
    const clips = ids.map((id) => document.querySelector(`[data-track-object-id="${id}"]`));
    return clips.map((clip, index) => ({
      before: clip?.classList.contains('is-connected-before'),
      after: clip?.classList.contains('is-connected-after'),
      gap: index === 0 ? 0 : clip.getBoundingClientRect().left - clips[index - 1].getBoundingClientRect().right,
    }));
  });
  assert.deepEqual(
    disciplineEditorialConnection.map(({ before, after }) => ({ before, after })),
    [
      { before: false, after: true },
      { before: true, after: true },
      { before: true, after: true },
      { before: true, after: false },
    ],
  );
  disciplineEditorialConnection.slice(1).forEach(({ gap }) => {
    assert.ok(Math.abs(gap) < 0.1, `Connected discipline editorial gap was ${gap}px.`);
  });

  const playhead = page.getByRole('slider', { name: 'Story WU playhead' });
  await playhead.evaluate((node) => { node.value = '0'; });
  const playheadBox = await playhead.boundingBox();
  await playhead.click({
    position: {
      x: playheadBox.width * (11.49 / 21.8),
      y: playheadBox.height / 2,
    },
  });
  await page.waitForFunction(() => (
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) > 11.45
    && document.querySelector('.about-narrative-lab')?.dataset.worldDisciplineLabels === '6'
  ));
  const disciplineDesktop = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const viewport = document.querySelector('[aria-label="About Alexander narrative"]').getBoundingClientRect();
    const labels = [...document.querySelectorAll('[data-discipline-group]')].map((label) => label.getBoundingClientRect());
    return {
      activeWorld: root.dataset.activeNarrativeWorld,
      gridInfluence: root.dataset.worldGridInfluence,
      worldFrom: root.dataset.worldFrom,
      worldTo: root.dataset.worldTo,
      labelsWithinViewport: labels.every((rect) => (
        rect.left >= viewport.left - 1
        && rect.right <= viewport.right + 1
        && rect.top >= viewport.top - 1
        && rect.bottom <= viewport.bottom + 1
      )),
    };
  });
  assert.deepEqual(disciplineDesktop, {
    activeWorld: 'world-discipline-isolation',
    gridInfluence: '0.0000',
    worldFrom: 'calm-field-v1',
    worldTo: 'calm-field-v1',
    labelsWithinViewport: true,
  });
  await page.screenshot({ path: `${outputDir}/${browserName}-editor-desktop.png` });

  await page.getByRole('button', { name: 'Checkpoint' }).click();
  await page.waitForFunction(() => document.querySelector('.about-track-editor-status p')?.textContent === 'Checkpoint saved locally.');
  const checkpoint = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('abs:about-narrative:checkpoints:v1') || '[]');
    return { count: stored.length, id: stored[0]?.id, name: stored[0]?.name };
  });
  assert.equal(checkpoint.count, 1);
  assert.match(checkpoint.id, /^checkpoint-\d+$/);
  assert.match(checkpoint.name, /^Manual checkpoint · /);

  await page.getByRole('button', { name: 'Add Text object at playhead' }).click();
  assert.deepEqual(
    await page.getByRole('menuitem').allTextContents(),
    ['Title', 'Scroll block', 'Third type Stub · Draft'],
  );
  await page.getByRole('menuitem', { name: /Third type/ }).click();
  const draft = await page.evaluate(() => ({
    clipCount: document.querySelectorAll('[data-text-kind="stub"]').length,
    semanticFieldCount: document.querySelectorAll('[data-text-field-id]').length,
    status: document.querySelector('[data-text-kind="stub"] .about-track-editor-clip__badge')?.textContent,
  }));
  assert.equal(draft.clipCount, 1);
  assert.equal(draft.semanticFieldCount, 26);
  assert.equal(draft.status, 'Draft · Not published');
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await page.locator('[data-text-kind="stub"]').count(), 0);

  await page.locator('[data-track-object-id="text-background-clients"]').dblclick();
  await page.waitForFunction(() => document.activeElement?.dataset.editorFocusId === 'text-copy');
  assert.equal(await page.locator('[data-editor-focus-id="text-copy"]').inputValue(), JSON.stringify([
    'Yoti',
    'S&P Global',
    'Bentley',
    'SunExpress',
    'McCann',
    'American Heart Association',
  ], null, 2));
  await page.getByLabel('Block kind').selectOption('prose');
  const convertedCopy = page.getByRole('textbox', { name: 'Copy', exact: true });
  assert.equal(await convertedCopy.isEnabled(), true);
  assert.match(await convertedCopy.inputValue(), /Yoti/);
  await page.getByRole('button', { name: 'Undo' }).click();

  await page.locator('[data-track-object-id="camera-promise-1"]').click();
  assert.equal(await page.getByText('Easing', { exact: true }).count(), 1);
  await page.locator('[data-track-object-id="world-complexity"]').click();
  for (const label of ['Position X', 'Rotation Z', 'Scale', 'Transition type', 'Transition easing', 'Correspondence']) {
    assert.equal(await page.getByText(label, { exact: true }).count(), 1, `${label} inspector control is missing.`);
  }

  await page.getByRole('button', { name: 'Tablet' }).click();
  await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.aboutLayoutProfile === 'tablet');
  await page.getByLabel('Preview orientation').selectOption('portrait');
  const tabletPortraitRatio = await page.locator('.about-narrative-scrollport').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width / rect.height;
  });
  assert.ok(Math.abs(tabletPortraitRatio - (820 / 1180)) < 0.01);
  await page.getByLabel('Preview orientation').selectOption('landscape');
  const tabletLandscapeRatio = await page.locator('.about-narrative-scrollport').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width / rect.height;
  });
  assert.ok(Math.abs(tabletLandscapeRatio - (1180 / 820)) < 0.01);
  await page.getByRole('button', { name: 'Mobile' }).click();
  await page.getByLabel('Preview orientation').selectOption('portrait');
  await playhead.evaluate((node) => { node.value = '0'; });
  const mobilePlayheadBox = await playhead.boundingBox();
  await playhead.click({
    position: {
      x: mobilePlayheadBox.width * (11.49 / 21.8),
      y: mobilePlayheadBox.height / 2,
    },
  });
  const mobilePortraitRatio = await page.locator('.about-narrative-scrollport').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width / rect.height;
  });
  assert.ok(Math.abs(mobilePortraitRatio - (390 / 844)) < 0.01);
  await page.waitForFunction(() => {
    const root = document.querySelector('.about-narrative-lab');
    return Number(root?.dataset.narrativeStoryWu) > 11.45
      && root?.dataset.worldDisciplineLabels === '6';
  });
  const mobileDisciplineBounds = await page.evaluate(() => {
    const viewport = document.querySelector('.about-narrative-discipline-reveal').getBoundingClientRect();
    return [...document.querySelectorAll('[data-discipline-group]')].every((label) => {
      const rect = label.getBoundingClientRect();
      return rect.left >= viewport.left - 1
        && rect.right <= viewport.right + 1
        && rect.top >= viewport.top - 1
        && rect.bottom <= viewport.bottom + 1;
    });
  });
  assert.equal(mobileDisciplineBounds, true);
  await page.getByLabel('Preview orientation').selectOption('landscape');
  const mobileLandscapeRatio = await page.locator('.about-narrative-scrollport').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width / rect.height;
  });
  assert.ok(Math.abs(mobileLandscapeRatio - (844 / 390)) < 0.01);
  await page.getByLabel('Preview orientation').selectOption('portrait');
  await page.getByRole('checkbox', { name: 'Reduced Motion' }).check();
  await page.waitForFunction(() => {
    const root = document.querySelector('.about-narrative-lab');
    return root?.dataset.aboutLayoutProfile === 'mobile'
      && root.dataset.aboutMotionProfile === 'reduced';
  });
  assert.equal(await page.locator('.about-narrative-world__canvas').count(), 1);

  await page.setViewportSize({ width: 390, height: 844 });
  const inspector = page.getByRole('region', { name: 'Selected object inspector' });
  await assert.doesNotReject(() => inspector.waitFor({ state: 'hidden' }));
  const inspectorToggle = page.getByRole('button', { name: 'Inspector' });
  const touchHeight = await inspectorToggle.evaluate((node) => node.getBoundingClientRect().height);
  assert.ok(touchHeight >= 44, `Mobile Inspector target was ${touchHeight}px tall.`);
  await inspectorToggle.click();
  await inspector.waitFor({ state: 'visible' });
  assert.equal(await page.locator('.about-track-editor-status').isVisible(), false);
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await inspector.waitFor({ state: 'hidden' });

  assert.deepEqual(errors, []);
  await page.screenshot({ path: `${outputDir}/${browserName}-editor-mobile.png` });
  await context.close();
}

try {
  if (!editorOnly) {
    await auditProduction({ width: 1440, height: 1000 }, 'desktop', 'desktop');
    await auditProduction({ width: 820, height: 1180 }, 'tablet-portrait', 'tablet');
    await auditProduction({ width: 1180, height: 820 }, 'tablet-landscape', 'tablet');
    await auditProduction({ width: 390, height: 844 }, 'mobile-portrait', 'mobile');
    await auditProduction({ width: 844, height: 390 }, 'mobile-landscape', 'mobile');
  }
  if (!productionOnly) await auditEditor();
  console.log(`PASS: sectionless About Narrative ${browserName} ${productionOnly ? 'production' : editorOnly ? 'editor' : 'production and editor'} audit.`);
} finally {
  await browser.close();
}
