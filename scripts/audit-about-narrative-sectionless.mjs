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
  await page.waitForFunction(() => document.querySelectorAll('[data-text-field-id]').length === 14);

  const initial = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const indicator = document.querySelector('.about-narrative-indicator');
    const canvas = document.querySelector('.about-narrative-world__canvas');
    const opener = document.querySelector('[data-text-field-id="text-promise-main"] .about-narrative-spatial-title')
      ?.getBoundingClientRect();
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
      openerCenterY: opener ? opener.top + (opener.height / 2) : 0,
    };
  });
  assert.equal(initial.editorCount, 0);
  assert.equal(initial.legacyContainerCount, 0);
  assert.equal(initial.semanticFieldCount, 14);
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
    activeWorld: 'world-background',
    gridInfluence: '0.0000',
    worldFrom: 'turbulent-field-v1',
    worldTo: 'calm-field-v1',
    labelsWithinViewport: true,
  });
  await page.screenshot({ path: `${outputDir}/${browserName}-production-${label}-discipline.png` });

  await page.locator('.about-narrative-scrollport').evaluate((node) => {
    node.scrollTop = node.scrollHeight - node.clientHeight;
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector('.about-narrative-indicator')?.getAttribute('aria-valuenow') === '100');
  const endState = await page.evaluate(() => {
    const indicator = document.querySelector('.about-narrative-indicator');
    const viewport = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
    const title = document.querySelector('[data-text-field-id="text-epilogue-invitation"] .about-narrative-spatial-title');
    const actions = document.querySelector('.about-narrative-finale-cta');
    const interaction = document.querySelector('.about-narrative-bust-interaction');
    const titleRect = title.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const interactionRect = interaction.getBoundingClientRect();
    const withinViewport = (rect) => rect.top >= viewport.top - 1
      && rect.bottom <= viewport.bottom + 1
      && rect.left >= viewport.left - 1
      && rect.right <= viewport.right + 1;
    return {
      active: [...indicator.querySelectorAll('[data-active="true"]')]
        .map((line) => Number(line.dataset.lineIndex)),
      valueText: indicator.getAttribute('aria-valuetext'),
      titleCenterY: titleRect.top + (titleRect.height / 2),
      titleOpacity: Number(getComputedStyle(title).opacity),
      titleBelowBust: titleRect.top >= interactionRect.bottom - 1,
      actionsBelowTitle: actionsRect.top >= titleRect.bottom - 1,
      finaleWithinViewport: [titleRect, actionsRect, interactionRect].every(withinViewport),
    };
  });
  assert.deepEqual(endState.active, [16, 17]);
  assert.equal(endState.valueText, '100% through the About narrative');
  assert.ok(Math.abs(endState.titleCenterY - initial.openerCenterY) <= 6);
  assert.ok(endState.titleOpacity > 0.99);
  assert.equal(endState.titleBelowBust, true);
  assert.equal(endState.actionsBelowTitle, true);
  assert.equal(endState.finaleWithinViewport, true);
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
  await page.waitForFunction(() => document.querySelectorAll('[data-text-field-id]').length === 14);

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
  assert.equal(initial.semanticFieldCount, 14);

  const editorialConnection = await page.evaluate(() => {
    const first = document.querySelector('[data-track-object-id="text-background-editorial"]');
    const last = document.querySelector('[data-track-object-id="text-background-clients"]');
    const firstRect = first?.getBoundingClientRect();
    const lastRect = last?.getBoundingClientRect();
    return {
      firstBefore: first?.classList.contains('is-connected-before'),
      firstAfter: first?.classList.contains('is-connected-after'),
      lastBefore: last?.classList.contains('is-connected-before'),
      lastAfter: last?.classList.contains('is-connected-after'),
      firstGap: lastRect && firstRect ? lastRect.left - firstRect.right : Number.POSITIVE_INFINITY,
    };
  });
  assert.deepEqual(
    { ...editorialConnection, firstGap: undefined },
    {
      firstBefore: false,
      firstAfter: false,
      lastBefore: false,
      lastAfter: false,
      firstGap: undefined,
    },
  );
  assert.ok(editorialConnection.firstGap > 0, `Editorial and client-logo fields overlapped by ${editorialConnection.firstGap}px.`);

  const authoredStructure = await page.evaluate(() => ({
    aTitles: document.querySelectorAll('[data-track-object-id="text-promise-main"]').length,
    bTitles: document.querySelectorAll('[data-track-object-id^="text-complexity-"][data-track-object-type="text-field"]').length - 3,
    cEditorial: document.querySelectorAll('[data-track-object-id="text-background-editorial"]').length,
    cLogos: document.querySelectorAll('[data-track-object-id="text-background-clients"]').length,
    dTitles: ['text-complexity-curiosity', 'text-complexity-listen', 'text-complexity-focus']
      .filter((id) => document.querySelector(`[data-track-object-id="${id}"]`)).length,
    disciplines: document.querySelectorAll('[data-track-object-id="motion-discipline-reveal"][data-track-object-type="interaction"]').length,
    dEditorial: document.querySelectorAll('[data-track-object-id="text-disciplines-title"]').length,
    eTitles: document.querySelectorAll('[data-track-object-id^="text-life-"][data-track-object-type="text-field"]').length,
    eEditorial: document.querySelectorAll('[data-track-object-id="text-role-highlight"]').length,
    finalTitles: document.querySelectorAll('[data-track-object-id="text-epilogue-invitation"]').length,
    continuousPassages: document.querySelectorAll('p.about-narrative-editorial-copy[data-text-field-id]').length,
  }));
  assert.deepEqual(authoredStructure, {
    aTitles: 1,
    bTitles: 3,
    cEditorial: 1,
    cLogos: 1,
    dTitles: 3,
    disciplines: 1,
    dEditorial: 1,
    eTitles: 2,
    eEditorial: 1,
    finalTitles: 1,
    continuousPassages: 3,
  });

  const playhead = page.getByRole('slider', { name: 'Story WU playhead' });
  const setPlayhead = (value) => playhead.evaluate((node, nextValue) => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    valueSetter.call(node, String(nextValue));
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  const editorialStartWU = await page.evaluate(async () => {
    const response = await fetch('/config/contents-about.json');
    const document = await response.json();
    return document.tracks.text.fields.find(
      (field) => field.id === 'text-background-editorial',
    )?.startWU;
  });
  assert.equal(Number.isFinite(editorialStartWU), true);

  await setPlayhead(editorialStartWU);
  await page.waitForFunction((expectedWU) => Math.abs(
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - expectedWU,
  ) < 0.01, editorialStartWU);
  const editorialTrigger = await page.evaluate(() => {
    const viewport = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
    const passage = document.querySelector('[data-text-field-id="text-background-editorial"]');
    const firstLine = passage.querySelector('[data-editorial-line]');
    const passageStyle = getComputedStyle(passage);
    return {
      firstLineTopRatio: (firstLine.getBoundingClientRect().top - viewport.top) / viewport.height,
      firstLineReveal: Number(firstLine.style.getPropertyValue('--editorial-reveal')),
      fontSize: Number.parseFloat(passageStyle.fontSize),
      rowGap: Number.parseFloat(passageStyle.rowGap),
    };
  });
  assert.ok(Math.abs(editorialTrigger.firstLineTopRatio - 0.8) < 0.025);
  assert.ok(editorialTrigger.firstLineReveal < 0.08);
  assert.ok(editorialTrigger.fontSize >= 23);
  assert.ok(editorialTrigger.rowGap >= editorialTrigger.fontSize * 1.05);

  const editorialRevealWU = editorialStartWU + 0.12;
  await setPlayhead(editorialRevealWU);
  await page.waitForFunction((expectedWU) => Math.abs(
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - expectedWU,
  ) < 0.01, editorialRevealWU);
  const editorialReveals = await page.locator(
    '[data-text-field-id="text-background-editorial"] [data-editorial-line]',
  ).evaluateAll((nodes) => nodes.map((node) => Number(
    node.style.getPropertyValue('--editorial-reveal'),
  )));
  assert.ok(editorialReveals[0] > 0.95);
  assert.ok(editorialReveals.at(-1) < 0.1);
  assert.ok(editorialReveals.every((value, index) => (
    index === 0 || value <= editorialReveals[index - 1]
  )));
  await page.screenshot({ path: `${outputDir}/${browserName}-editor-editorial-reveal.png` });

  await setPlayhead(11.49);
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
    activeWorld: 'world-background',
    gridInfluence: '0.0000',
    worldFrom: 'turbulent-field-v1',
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
  assert.equal(draft.semanticFieldCount, 14);
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

  await page.locator('[data-track-object-type="camera-key"]').first().click();
  assert.equal(await page.getByText('Travel easing', { exact: true }).count(), 1);
  assert.equal(await page.getByText('Frame position', { exact: true }).count(), 1);
  assert.equal(await page.getByText('Aim target', { exact: true }).count(), 1);
  assert.equal(await page.getByText('Lens & horizon', { exact: true }).count(), 1);
  assert.equal(await page.getByText('Timing protected', { exact: true }).count(), 1);
  const openingDepth = page.getByRole('slider', { name: 'Camera depth offset slider' });
  assert.equal(await openingDepth.isEnabled(), true);
  assert.equal(await openingDepth.inputValue(), '-2.4');
  await openingDepth.focus();
  await openingDepth.press('ArrowRight');
  await openingDepth.press('Tab');
  assert.equal(await openingDepth.inputValue(), '-2.35');
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await openingDepth.inputValue(), '-2.4');

  await page.getByRole('button', { name: 'Camera', exact: true }).click();
  assert.equal(await page.getByRole('heading', { name: 'Global camera & depth fog' }).count(), 1);
  assert.equal(await page.locator('[data-track-settings="camera"] details').count(), 2);
  const fogStart = page.getByRole('slider', { name: 'Global camera Fog begins slider' });
  const fogEnd = page.getByRole('slider', { name: 'Global camera Fully faded slider' });
  assert.equal(await fogStart.inputValue(), '8');
  assert.equal(await fogEnd.inputValue(), '18');
  await fogStart.focus();
  await fogStart.press('ArrowRight');
  await fogStart.press('Tab');
  assert.equal(await fogStart.inputValue(), '8.1');
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await fogStart.inputValue(), '8');

  await page.locator('[data-track-object-id="world-complexity"]').click();
  for (const label of ['Position X', 'Rotation Z', 'Scale', 'Transition type', 'Transition easing', 'Correspondence']) {
    assert.equal(await page.getByText(label, { exact: true }).count(), 1, `${label} inspector control is missing.`);
  }

  await page.getByRole('button', { name: 'Text', exact: true }).click();
  assert.equal(await page.getByRole('heading', { name: 'Global text animation' }).count(), 1);
  assert.equal(await page.locator('[data-track-settings="text"] details').count(), 4);
  await page.locator('[data-inspector-group="text-editorial"] > summary').click();
  const revealSlider = page.getByRole('slider', { name: 'Global text Reveal viewport line slider' });
  await revealSlider.focus();
  await revealSlider.press('ArrowLeft');
  await revealSlider.press('Tab');
  await page.waitForFunction(() => (
    document.querySelector('.about-narrative-lab')?.style
      .getPropertyValue('--about-editorial-reveal-threshold') === '0.79'
  ));
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await revealSlider.inputValue(), '0.8');

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
  await setPlayhead(5.3);
  await page.waitForFunction(() => Math.abs(
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - 5.3,
  ) < 0.01);
  const mobileEditorial = await page.evaluate(() => {
    const viewport = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
    const passage = document.querySelector('[data-text-field-id="text-background-editorial"]');
    const bounds = passage.getBoundingClientRect();
    const style = getComputedStyle(passage);
    return {
      fontSize: Number.parseFloat(style.fontSize),
      rowGap: Number.parseFloat(style.rowGap),
      withinInlineViewport: bounds.left >= viewport.left && bounds.right <= viewport.right,
    };
  });
  assert.ok(mobileEditorial.fontSize >= 19.5);
  assert.ok(mobileEditorial.rowGap >= mobileEditorial.fontSize * 1.05);
  assert.equal(mobileEditorial.withinInlineViewport, true);
  await page.screenshot({ path: `${outputDir}/${browserName}-editor-mobile-editorial.png` });

  await setPlayhead(11.49);
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
