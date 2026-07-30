import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
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
const canonical = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const titleHierarchyWU = canonical.tracks.text.fields.find(
  (field) => field.id === 'text-complexity-idea',
)?.focusWU;

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
  await page.waitForFunction(() => (
    document.querySelector('#about-coming-soon-title, .about-narrative-lab')
  ));

  const stagedHeading = page.locator('#about-coming-soon-title');
  if (await stagedHeading.count()) {
    await stagedHeading.waitFor({ state: 'visible' });
    assert.equal((await stagedHeading.textContent()).replace(/\s+/gu, ' ').trim(), 'Coming soon.');
    assert.equal(await page.locator('.about-narrative-lab, .about-track-editor').count(), 0);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${outputDir}/${browserName}-production-${label}.png` });
    await context.close();
    return;
  }

  await page.waitForSelector('.about-narrative-lab');
  await page.waitForFunction(() => document.querySelectorAll('[data-text-field-id]').length === 11);
  await page.waitForSelector('.about-narrative-lab[data-world-prepare="ready"]', { timeout: 30_000 });

  const initial = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const indicator = document.querySelector('.about-narrative-indicator');
    const canvas = document.querySelector('.about-narrative-world__canvas');
    const opener = document.querySelector('[data-text-field-id="text-promise-main"] .route-centered-page__title')
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
      openerCenterX: opener ? opener.left + (opener.width / 2) : 0,
    };
  });
  assert.equal(initial.editorCount, 0);
  assert.equal(initial.legacyContainerCount, 0);
  assert.equal(initial.semanticFieldCount, 11);
  assert.equal(initial.stubSemanticCount, 0);
  assert.equal(initial.canvasCount, 1);
  assert.ok(initial.canvasWidth > 0 && initial.canvasHeight > 0);
  assert.equal(initial.indicatorCount, 18);
  assert.equal(initial.indicatorHost, 'shell-persistent');
  assert.equal(initial.layoutProfile, expectedProfile);

  await page.locator('.about-narrative-scrollport').evaluate((node, storyDurationWU) => {
    node.scrollTop = (node.scrollHeight - node.clientHeight) * (10.55 / storyDurationWU);
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, canonical.profiles[expectedProfile].storyDurationWU);
  await page.waitForFunction(() => {
    const root = document.querySelector('.about-narrative-lab');
    const storyWU = Number(root?.dataset.narrativeStoryWu);
    const visibleLabels = [...document.querySelectorAll('.about-narrative-discipline-reveal li')]
      .filter((label) => Number(getComputedStyle(label).opacity) > 0.05)
      .length;
    return storyWU > 10.51
      && storyWU < 10.59
      && visibleLabels === 6;
  });
  const disciplineState = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const viewport = document.querySelector('.about-narrative-discipline-reveal').getBoundingClientRect();
    const labels = [...document.querySelectorAll('[data-discipline-group]')]
      .filter((label) => Number(getComputedStyle(label).opacity) > 0.05)
      .map((label) => label.getBoundingClientRect())
      .filter((rect) => rect.bottom > viewport.top && rect.top < viewport.bottom);
    const overlapPairs = [];
    labels.forEach((rect, index) => labels.slice(index + 1).forEach((other, offset) => {
      const separated = rect.right <= other.left + 1
        || other.right <= rect.left + 1
        || rect.bottom <= other.top + 1
        || other.bottom <= rect.top + 1;
      if (!separated) overlapPairs.push([index + 1, index + offset + 2]);
    }));
    return {
      activeWorld: root.dataset.activeNarrativeWorld,
      gridInfluence: root.dataset.worldGridInfluence,
      worldTo: root.dataset.worldTo,
      labelsWithinHorizontalViewport: labels.every((rect) => (
        rect.left >= viewport.left - 1
        && rect.right <= viewport.right + 1
      )),
      overlapPairs,
    };
  });
  assert.deepEqual(disciplineState, {
    activeWorld: 'world-grid',
    gridInfluence: '0.0000',
    worldTo: 'calm-field-v1',
    labelsWithinHorizontalViewport: true,
    overlapPairs: [],
  }, `${label} discipline labels should remain separate`);
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
    const titleRect = title.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const withinViewport = (rect) => rect.top >= viewport.top - 1
      && rect.bottom <= viewport.bottom + 1
      && rect.left >= viewport.left - 1
      && rect.right <= viewport.right + 1;
    return {
      active: [...indicator.querySelectorAll('[data-active="true"]')]
        .map((line) => Number(line.dataset.lineIndex)),
      valueText: indicator.getAttribute('aria-valuetext'),
      titleCenterX: titleRect.left + (titleRect.width / 2),
      landscapeTitleTargetX: viewport.left + (viewport.width * 0.75),
      titleOpacity: Number(getComputedStyle(title).opacity),
      actionsBelowTitle: actionsRect.top >= titleRect.bottom - 2,
      finaleWithinViewport: [titleRect, actionsRect].every(withinViewport),
      simulationVisibility: Number(document.querySelector('.about-narrative-lab')?.dataset.worldVisibility),
    };
  });
  assert.deepEqual(endState.active, [16, 17]);
  assert.equal(endState.valueText, '100% through the About narrative');
  const expectedTitleCenterX = label === 'mobile-landscape'
    ? endState.landscapeTitleTargetX
    : initial.openerCenterX;
  assert.ok(Math.abs(endState.titleCenterX - expectedTitleCenterX) <= 30);
  assert.ok(endState.titleOpacity > 0.99);
  assert.equal(endState.actionsBelowTitle, true);
  assert.equal(endState.finaleWithinViewport, true, `${label} finale must remain within the studio viewport.`);
  assert.equal(endState.simulationVisibility, 1, `${label} finale must retain the bust.`);
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
  await page.waitForFunction(() => document.querySelectorAll('[data-text-field-id]').length === 11);
  await page.waitForFunction(() => (
    document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete'
  ));

  const editor = page.locator('.about-track-editor');
  const shortcutInputProbe = page.getByRole('slider', { name: 'Story WU playhead' });
  await shortcutInputProbe.focus();
  await page.keyboard.press('Slash');
  assert.equal(await editor.isVisible(), true, 'Slash must not hide the editor while an input is focused.');
  assert.equal(await page.locator('#panelDock:not(.hidden)').isVisible(), false, 'Slash must not open the config panel while an editor input is focused.');
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Slash');
  assert.equal(await editor.isVisible(), false, 'Slash should hide the complete editor chrome.');
  assert.equal(await page.locator('#panelDock:not(.hidden)').isVisible(), false, 'Slash must replace the config-panel shortcut on the About editor.');
  assert.equal(
    await page.locator('.about-narrative-lab').getAttribute('data-editor-active'),
    null,
    'The hidden editor must release the full preview viewport.',
  );
  await page.keyboard.press('Slash');
  assert.equal(await editor.isVisible(), true, 'Slash should restore the editor chrome.');
  assert.equal(await page.locator('#panelDock:not(.hidden)').isVisible(), false, 'Restoring the About editor must not open the config panel.');
  assert.equal(
    await page.locator('.about-narrative-lab').getAttribute('data-editor-active'),
    'true',
    'The restored editor must reapply its preview geometry.',
  );

  const initial = await page.evaluate(() => ({
    editorVersion: document.querySelector('.about-track-editor')?.dataset.editorVersion,
    lanes: [...document.querySelectorAll('[data-track-lane]')].map((lane) => lane.dataset.trackLane),
    legacyContainerCount: document.querySelectorAll('[data-narrative-section], [data-section-id], .about-narrative-section').length,
    plusLabels: [...document.querySelectorAll('.about-track-editor-add')].map((button) => button.getAttribute('aria-label')),
    semanticFieldCount: document.querySelectorAll('[data-text-field-id]').length,
  }));
  assert.equal(initial.editorVersion, 'point-field-v6');
  assert.deepEqual(initial.lanes, ['camera', 'visibility', 'point-field', 'text', 'interaction']);
  assert.equal(initial.legacyContainerCount, 0);
  assert.deepEqual(initial.plusLabels, [
    'Add Camera object at playhead',
    'Add Visibility object at playhead',
    'Add Text object at playhead',
    'Add Motion object at playhead',
  ]);
  assert.equal(initial.semanticFieldCount, 11);

  assert.equal(
    await page.getByRole('button', { name: /^Resize World .+ end$/ }).count(),
    0,
    'v6 must not render legacy World duration handles.',
  );
  const pointFieldKeys = page.locator('[data-point-field-selection="point-field-key"]');
  const pointFieldSegments = page.locator('[data-point-field-selection="point-field-segment"]');
  assert.equal(await pointFieldKeys.count(), 8, 'Every authored v6 Point field key must be visible.');
  assert.equal(await pointFieldSegments.count(), 7, 'Every adjacent v6 Point field segment must be visible.');
  assert.equal(
    await page.locator('[aria-label="Point field state library"] > button').count(),
    4,
    'The reusable Point field state library must remain visible.',
  );
  const pointKeyTargets = await pointFieldKeys.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const hitArea = getComputedStyle(node, '::before');
    return {
      width: rect.width,
      height: rect.height,
      effectiveWidth: Number.parseFloat(hitArea.width),
      effectiveHeight: Number.parseFloat(hitArea.height),
    };
  }));
  assert.equal(
    pointKeyTargets.every(({ width, height, effectiveWidth, effectiveHeight }) => (
      width >= 24 && height >= 24 && effectiveWidth >= 24 && effectiveHeight >= 24
    )),
    true,
    'Point field keys must retain their authored geometry with effective 24px hit targets.',
  );
  const saveButton = page.locator('[data-director-panel="command-bar"] button.is-save');
  assert.equal(await saveButton.count(), 1, 'Director must expose one primary Save action.');
  assert.equal(await saveButton.getAttribute('aria-disabled'), 'true');
  await saveButton.focus();
  assert.equal(await saveButton.evaluate((node) => document.activeElement === node), true, 'Blocked Save must remain focusable.');
  assert.equal(await page.locator('#about-director-save-errors[role="status"]').isVisible(), true, 'Blocked Save needs a visible live reason.');
  await page.getByRole('button', { name: 'Add Text object at playhead' }).click();
  assert.equal(await page.locator('#about-director-add-text [role="menuitem"]').count(), 0, 'Add Text disclosure must use ordinary buttons.');
  await page.getByRole('button', { name: 'Add Text object at playhead' }).click();
  const textResizeHandles = page.getByRole('button', { name: /^Resize Text .+ (start|end)$/ });
  assert.equal(await textResizeHandles.count(), 4, 'Only editable non-Title Text clips need duration handles.');
  assert.equal(
    await page.locator('[data-track-object-type="text-field"][data-text-kind="title"]')
      .locator('xpath=..')
      .locator('[data-duration-edge]')
      .count(),
    0,
    'Titles must use shared timing and expose no individual duration handles.',
  );
  const motionResizeHandles = page.getByRole('button', { name: /^Resize Motion .+ (start|end)$/ });
  assert.equal(await motionResizeHandles.count(), 6, 'Every editable Motion clip needs start and end duration handles.');
  assert.equal(
    await page.getByRole('button', { name: /^Resize Motion Horizontal spin (start|end)$/ }).count(),
    0,
    'Protected finale Motion must not expose duration handles.',
  );
  const textReference = page.locator('[data-track-object-id="text-background-unit"]');

  const motionClip = page.locator('[data-track-object-id="motion-discipline-reveal"]');
  const motionRectBefore = await motionClip.boundingBox();
  const motionStartHandle = page.getByRole('button', { name: 'Resize Motion Discipline reveal start' });
  const motionHandleBox = await motionStartHandle.boundingBox();
  await page.mouse.move(
    motionHandleBox.x + (motionHandleBox.width / 2),
    motionHandleBox.y + (motionHandleBox.height / 2),
  );
  await page.mouse.down();
  await page.mouse.move(
    motionHandleBox.x + (motionHandleBox.width / 2) - 16,
    motionHandleBox.y + (motionHandleBox.height / 2),
    { steps: 4 },
  );
  await page.mouse.up();
  await page.waitForFunction(({ beforeX, beforeWidth }) => {
    const rect = document.querySelector('[data-track-object-id="motion-discipline-reveal"]')?.getBoundingClientRect();
    return rect && rect.x < beforeX - 8 && rect.width > beforeWidth + 8;
  }, { beforeX: motionRectBefore.x, beforeWidth: motionRectBefore.width });
  const motionRectAfter = await motionClip.boundingBox();
  assert.ok(
    Math.abs(
      (motionRectAfter.x + motionRectAfter.width) - (motionRectBefore.x + motionRectBefore.width),
    ) < 0.6,
    'Motion start resize must preserve its end.',
  );
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.waitForFunction((beforeWidth) => {
    const rect = document.querySelector('[data-track-object-id="motion-discipline-reveal"]')?.getBoundingClientRect();
    return rect && Math.abs(rect.width - beforeWidth) < 0.6;
  }, motionRectBefore.width);

  const textRectBefore = await textReference.boundingBox();
  const textEndHandle = textReference.locator('xpath=..').locator('[data-duration-edge="end"]');
  const textHandleBox = await textEndHandle.boundingBox();
  await page.mouse.move(
    textHandleBox.x + (textHandleBox.width / 2),
    textHandleBox.y + (textHandleBox.height / 2),
  );
  await page.mouse.down();
  await page.mouse.move(
    textHandleBox.x + (textHandleBox.width / 2) + 16,
    textHandleBox.y + (textHandleBox.height / 2),
    { steps: 4 },
  );
  await page.mouse.up();
  await page.waitForFunction((beforeWidth) => {
    const rect = document.querySelector('[data-track-object-id="text-background-unit"]')?.getBoundingClientRect();
    return rect && rect.width > beforeWidth + 8;
  }, textRectBefore.width);
  const textRectAfter = await textReference.boundingBox();
  assert.ok(Math.abs(textRectAfter.x - textRectBefore.x) < 0.6, 'Text end resize must preserve its start.');
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.waitForFunction((beforeWidth) => {
    const rect = document.querySelector('[data-track-object-id="text-background-unit"]')?.getBoundingClientRect();
    return rect && Math.abs(rect.width - beforeWidth) < 0.6;
  }, textRectBefore.width);

  const editorialConnection = await page.evaluate(() => {
    const first = document.querySelector('[data-track-object-id="text-background-unit"]');
    return {
      firstBefore: first?.classList.contains('is-connected-before'),
      firstAfter: first?.classList.contains('is-connected-after'),
    };
  });
  assert.deepEqual(editorialConnection, { firstBefore: false, firstAfter: false });

  const authoredStructure = await page.evaluate(() => ({
    aTitles: document.querySelectorAll('[data-track-object-id="text-promise-main"]').length,
    bTitles: document.querySelectorAll('[data-track-object-id^="text-complexity-"][data-track-object-type="text-field"]').length - 3,
    cEditorial: document.querySelectorAll('[data-track-object-id="text-background-unit"]').length,
    cLogos: document.querySelectorAll('[data-track-object-id="text-background-clients"]').length,
    dTitles: ['text-complexity-curiosity', 'text-complexity-listen']
      .filter((id) => document.querySelector(`[data-track-object-id="${id}"]`)).length,
    disciplines: document.querySelectorAll('[data-track-object-id="motion-discipline-reveal"][data-track-object-type="interaction"]').length,
    dEditorial: document.querySelectorAll('[data-track-object-id="text-disciplines-title"]').length,
    eTitles: document.querySelectorAll('[data-track-object-id^="text-life-"][data-track-object-type="text-field"]').length,
    finalTitles: document.querySelectorAll('[data-track-object-id="text-epilogue-invitation"]').length,
    continuousPassages: document.querySelectorAll('p.about-narrative-editorial-copy[data-text-field-id]').length,
  }));
  assert.deepEqual(authoredStructure, {
    aTitles: 1,
    bTitles: 1,
    cEditorial: 1,
    cLogos: 0,
    dTitles: 2,
    disciplines: 1,
    dEditorial: 1,
    eTitles: 3,
    finalTitles: 1,
    continuousPassages: 0,
  });

  const playhead = page.getByRole('slider', { name: 'Story WU playhead' });
  const setPlayhead = (value) => playhead.evaluate((node, nextValue) => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    valueSetter.call(node, String(nextValue));
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  const readTitleHierarchy = () => page.evaluate(() => {
    const title = document.querySelector(
      '[data-text-field-id="text-complexity-idea"] .about-narrative-spatial-title',
    );
    const editorial = document.querySelector(
      '[data-text-field-id="text-background-unit"] .about-narrative-editorial-copy',
    );
    const titleStyle = getComputedStyle(title);
    const editorialStyle = getComputedStyle(editorial);
    const transform = new DOMMatrixReadOnly(titleStyle.transform);
    const stage = title.closest('.about-narrative-spatial-stage');
    const perspective = Number.parseFloat(getComputedStyle(stage).perspective);
    const titleSize = Number.parseFloat(titleStyle.fontSize);
    return {
      editorialSize: Number.parseFloat(editorialStyle.fontSize),
      projectedTitleSize: titleSize * (perspective / (perspective - transform.m43)),
      titleSize,
    };
  });
  const selectPreviewOrientation = (value) => page.evaluate((nextValue) => {
    const select = document.querySelector('select[aria-label="Preview orientation"]');
    if (!select) throw new Error('Preview orientation select is missing.');
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    valueSetter.call(select, nextValue);
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  const editorialContract = await page.evaluate(async () => {
    const response = await fetch('/config/contents-about.json');
    const document = await response.json();
    return {
      revealThreshold: document.globals.editorialRevealThreshold,
      startWU: document.tracks.text.fields.find(
        (field) => field.id === 'text-background-unit',
      )?.startWU,
    };
  });
  const editorialStartWU = editorialContract.startWU;
  assert.equal(Number.isFinite(editorialStartWU), true);
  assert.equal(Number.isFinite(editorialContract.revealThreshold), true);

  await setPlayhead(titleHierarchyWU);
  await page.waitForFunction((expectedWU) => Math.abs(
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - expectedWU,
  ) < 0.01, titleHierarchyWU);
  const desktopTitleHierarchy = await readTitleHierarchy();
  assert.ok(
    desktopTitleHierarchy.projectedTitleSize >= desktopTitleHierarchy.editorialSize * 1.3,
    'A readable spatial title must remain clearly larger than editorial copy after perspective.',
  );

  await setPlayhead(editorialStartWU);
  await page.waitForFunction((expectedWU) => Math.abs(
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - expectedWU,
  ) < 0.01, editorialStartWU);
  const editorialTrigger = await page.evaluate(() => {
    const viewport = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
    const passage = document.querySelector('[data-text-field-id="text-background-unit"]');
    const firstLine = passage.matches('[data-editorial-line]')
      ? passage
      : passage.querySelector('[data-editorial-line]');
    const typographyNode = passage.querySelector('.about-narrative-editorial-copy') || passage;
    const stackNode = passage.querySelector('.about-narrative-editorial-stack') || passage;
    const passageStyle = getComputedStyle(typographyNode);
    const stackStyle = getComputedStyle(stackNode);
    return {
      firstLineTopRatio: (firstLine.getBoundingClientRect().top - viewport.top) / viewport.height,
      firstLineReveal: Number(firstLine.style.getPropertyValue('--editorial-reveal')),
      fontSize: Number.parseFloat(passageStyle.fontSize),
      rowGap: Number.parseFloat(stackStyle.rowGap),
      visualLineCount: passage.querySelectorAll(
        '.about-narrative-editorial-lines__output > [data-editorial-line]',
      ).length,
    };
  });
  assert.ok(Math.abs(
    editorialTrigger.firstLineTopRatio - editorialContract.revealThreshold,
  ) < 0.025);
  assert.ok(editorialTrigger.firstLineReveal < 0.08);
  assert.ok(editorialTrigger.fontSize >= 23);
  assert.ok(editorialTrigger.rowGap >= editorialTrigger.fontSize * 0.55);
  assert.ok(editorialTrigger.visualLineCount >= 3, 'Desktop editorial prose must expose visual lines, not paragraph blocks.');

  const editorialStaggerWU = editorialStartWU + 0.2;
  await setPlayhead(editorialStaggerWU);
  await page.waitForFunction((expectedWU) => Math.abs(
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - expectedWU,
  ) < 0.01, editorialStaggerWU);
  const staggeredLineReveals = await page.locator(
    '[data-text-field-id="text-background-unit"] .about-narrative-editorial-copy:first-child .about-narrative-editorial-lines__output > [data-editorial-line]',
  ).evaluateAll((nodes) => nodes.map((node) => Number(
    node.style.getPropertyValue('--editorial-reveal'),
  )));
  assert.ok(staggeredLineReveals.length >= 3);
  assert.ok(
    staggeredLineReveals.every((value, index) => index === 0 || value < staggeredLineReveals[index - 1]),
    'Editorial prose must reveal in visual-line order instead of one paragraph opacity.',
  );

  const editorialRevealWU = editorialStartWU + 0.5;
  await setPlayhead(editorialRevealWU);
  await page.waitForFunction((expectedWU) => Math.abs(
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - expectedWU,
  ) < 0.01, editorialRevealWU);
  const editorialReveals = await page.locator(
    '[data-text-field-id="text-background-unit"][data-editorial-line], [data-text-field-id="text-background-unit"] [data-editorial-line]',
  ).evaluateAll((nodes) => nodes.map((node) => Number(
    node.style.getPropertyValue('--editorial-reveal'),
  )));
  assert.ok(editorialReveals.length >= 1);
  assert.ok(Math.max(...editorialReveals) > 0.95);
  await page.screenshot({ path: `${outputDir}/${browserName}-editor-editorial-reveal.png` });

  const disciplineRevealSamples = [];
  for (const storyWU of [8.5, 9, 9.5, 10, 10.5, 11]) {
    await setPlayhead(storyWU);
    await page.waitForFunction((expectedWU) => Math.abs(
      Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - expectedWU,
    ) < 0.01, storyWU);
    disciplineRevealSamples.push(await page.locator('[data-discipline-group]').evaluateAll((nodes) => (
      nodes
        .filter((node) => Number(getComputedStyle(node).opacity) > 0.05)
        .map((node) => Number(node.dataset.disciplineGroup))
    )));
  }
  disciplineRevealSamples.slice(1).forEach((groups, index) => {
    const previousGroups = disciplineRevealSamples[index];
    assert.ok(
      previousGroups.every((group) => groups.includes(group)),
      'A revealed discipline must stay revealed as forward scroll advances.',
    );
  });
  assert.equal(disciplineRevealSamples.at(-1).length, 6);

  await setPlayhead(10.55);
  await page.waitForFunction(() => (
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) > 10.51
    && document.querySelector('.about-narrative-lab')?.dataset.worldTo === 'calm-field-v1'
    && Number(document.querySelector('.about-narrative-lab')?.dataset.worldDisciplineLabels || 0) === 6
  ));
  const disciplineDesktop = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const viewport = document.querySelector('[aria-label="About Alexander narrative"]').getBoundingClientRect();
    const labels = [...document.querySelectorAll('[data-discipline-group]')]
      .filter((label) => Number(getComputedStyle(label).opacity) > 0.05)
      .map((label) => label.getBoundingClientRect())
      .filter((rect) => rect.bottom > viewport.top && rect.top < viewport.bottom);
    return {
      activeWorld: root.dataset.activeNarrativeWorld,
      gridInfluence: root.dataset.worldGridInfluence,
      worldTo: root.dataset.worldTo,
      labelsWithinHorizontalViewport: labels.every((rect) => (
        rect.left >= viewport.left - 1
        && rect.right <= viewport.right + 1
      )),
    };
  });
  assert.deepEqual(disciplineDesktop, {
    activeWorld: 'world-grid',
    gridInfluence: '0.0000',
    worldTo: 'calm-field-v1',
    labelsWithinHorizontalViewport: true,
  });
  await page.screenshot({ path: `${outputDir}/${browserName}-editor-desktop.png` });

  await page.getByRole('button', { name: 'Document', exact: true }).click();
  await page.getByRole('button', { name: 'Create checkpoint' }).click();
  await page.waitForFunction(() => document.querySelector('.about-track-editor-status p')?.textContent === 'Checkpoint saved locally.');
  const checkpoint = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('abs:about-narrative:checkpoints:v1') || '[]');
    return { count: stored.length, id: stored[0]?.id, name: stored[0]?.name };
  });
  assert.equal(checkpoint.count, 1);
  assert.match(checkpoint.id, /^checkpoint-\d+$/);
  assert.match(checkpoint.name, /^Manual checkpoint · /);

  await page.getByRole('button', { name: 'Add Text object at playhead' }).click();
  const addTextPanel = page.getByLabel('Create Text field');
  assert.deepEqual(
    await addTextPanel.getByRole('button').allTextContents(),
    ['Title', 'Scroll block', 'Third type Stub · Draft'],
  );
  await addTextPanel.getByRole('button', { name: /Third type/ }).click();
  const draft = await page.evaluate(() => ({
    clipCount: document.querySelectorAll('[data-text-kind="stub"]').length,
    semanticFieldCount: document.querySelectorAll('[data-text-field-id]').length,
    status: document.querySelector('[data-text-kind="stub"] .about-track-editor-clip__badge')?.textContent,
  }));
  assert.equal(draft.clipCount, 1);
  assert.equal(draft.semanticFieldCount, 11);
  assert.equal(draft.status, 'Draft · Not published');
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await page.locator('[data-text-kind="stub"]').count(), 0);

  await page.locator('[data-track-object-type="camera-key"]').first().click();
  const cameraFolderLabels = await page.locator('[data-inspector-group^="camera-"] > summary span').allTextContents();
  assert.deepEqual(cameraFolderLabels, [
    'Camera rig',
    'Travel easing',
  ]);
  assert.equal(await page.getByText('Timing fixed · Pose editable', { exact: true }).count(), 1);
  const cameraFolders = page.locator('[data-inspector-group^="camera-"]');
  assert.equal(await cameraFolders.count(), 2);
  assert.equal(await page.locator('[data-inspector-group="camera-rig"]').evaluate((folder) => folder.open), true);
  assert.equal(await page.locator('[data-inspector-group="camera-easing"]').evaluate((folder) => folder.open), false);
  for (const axis of ['X', 'Y', 'Z']) {
    assert.equal(await page.getByRole('spinbutton', { name: `Camera Position ${axis} exact value` }).getAttribute('step'), '0.01');
    assert.equal(await page.getByRole('spinbutton', { name: `Camera Rotation ${axis} exact value` }).getAttribute('step'), '0.1');
  }
  assert.equal(await page.getByRole('spinbutton', { name: 'Camera Field of view exact value' }).getAttribute('step'), '1');
  assert.equal(await page.getByText(/Position and Rotation author the manual pose/i).count(), 1);
  const cameraAim = page.getByRole('checkbox', { name: 'Focus on 3D anchor' });
  assert.equal(await cameraAim.count(), 1);
  assert.equal(await page.getByRole('spinbutton', { name: 'Camera Anchor X exact value' }).count(), 1);
  assert.equal(await page.getByRole('slider', { name: 'Camera Rotation X slider' }).isEnabled(), true);
  await cameraAim.check();
  assert.equal(await page.getByRole('slider', { name: 'Camera Rotation X slider' }).isDisabled(), true);
  await cameraAim.uncheck();
  assert.equal(await page.getByRole('slider', { name: 'Camera Rotation X slider' }).isEnabled(), true);
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await cameraAim.isChecked(), true);
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await cameraAim.isChecked(), false);
  const openingPositionZ = page.getByRole('slider', { name: 'Camera Position Z slider' });
  assert.equal(await openingPositionZ.isEnabled(), true);
  assert.equal(await openingPositionZ.inputValue(), '5.9');
  await openingPositionZ.focus();
  await openingPositionZ.press('ArrowRight');
  await openingPositionZ.press('Tab');
  assert.equal(await openingPositionZ.inputValue(), '5.91');
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await openingPositionZ.inputValue(), '5.9');

  await page.getByRole('button', { name: 'Camera', exact: true }).click();
  const globalCameraSettings = page.locator('[data-track-settings="camera"]');
  await globalCameraSettings.waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Global camera' }).count(), 1);
  assert.deepEqual(await globalCameraSettings.locator('details > summary span').allTextContents(), [
    'Camera · Distance fog',
  ]);
  await globalCameraSettings.locator('details').evaluate((details) => {
    details.open = true;
  });
  const fogStart = globalCameraSettings.getByRole('slider', { name: 'Global camera Fog begins slider' });
  assert.equal(await fogStart.inputValue(), '10');
  await fogStart.focus();
  await fogStart.press('ArrowRight');
  await fogStart.press('Tab');
  assert.equal(await fogStart.inputValue(), '10.1');
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await fogStart.inputValue(), '10');

  await page.getByRole('button', { name: 'Visibility', exact: true }).click();
  const globalVisibilitySettings = page.locator('[data-track-settings="visibility"]');
  await globalVisibilitySettings.waitFor();
  assert.equal(await globalVisibilitySettings.getByRole('heading', { name: 'Simulation visibility' }).count(), 1);
  assert.equal(await globalVisibilitySettings.getByText(/independently of the Camera/i).count(), 1);
  await page.locator('[data-track-object-id="visibility-void-off"]').click();
  assert.equal(
    await page.getByRole('slider', { name: 'Simulation visibility slider' }).inputValue(),
    '0',
  );

  await page.locator('[data-point-field-id="segment-key-world-grid-departure-to-key-world-grid-arrival"]').click();
  const pointFieldInspector = page.getByRole('region', { name: 'Selected object inspector' });
  for (const label of ['Type', 'Easing', 'Correspondence']) {
    assert.equal(
      await pointFieldInspector.getByText(label, { exact: true }).count(),
      1,
      `${label} transition control is missing.`,
    );
  }
  assert.deepEqual(
    await pointFieldInspector.locator('details > summary span').allTextContents(),
    ['Stagger', 'Organic path', 'Plane motion', 'Split transition'],
  );
  await page.getByRole('button', { name: 'Point field', exact: true }).click();
  await page.locator('[aria-label="Point field state library"] > button').nth(2).click();
  assert.equal(await pointFieldInspector.locator('code').textContent(), 'world-grid');
  for (const label of ['Position X', 'Rotation Z', 'Scale', 'Point size']) {
    assert.equal(
      await pointFieldInspector.getByText(label, { exact: true }).count(),
      1,
      `${label} state control is missing.`,
    );
  }

  await page.getByRole('button', { name: 'Text', exact: true }).click();
  assert.equal(await page.getByRole('heading', { name: 'Global text animation' }).count(), 1);
  assert.equal(await page.locator('[data-track-settings="text"] details').count(), 5);
  await page.locator('[data-inspector-group="text-editorial"] > summary').click();
  const revealSlider = page.getByRole('slider', { name: 'Global text Reveal starts slider' });
  const initialRevealThreshold = Number(await revealSlider.inputValue());
  const steppedRevealThreshold = Number((initialRevealThreshold - 0.01).toFixed(2));
  await revealSlider.focus();
  await revealSlider.press('ArrowLeft');
  await revealSlider.press('Tab');
  await page.waitForFunction((expected) => (
    Math.abs(Number(
      document.querySelector('.about-narrative-lab')?.style
        .getPropertyValue('--about-editorial-reveal-threshold'),
    ) - expected) < 0.001
  ), steppedRevealThreshold);
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(Number(await revealSlider.inputValue()), initialRevealThreshold);

  const diagnosticsTrigger = page.getByRole('button', { name: /^Diagnostics/ });
  await diagnosticsTrigger.click();
  await page.getByRole('button', { name: 'Play timeline' }).focus();
  await page.keyboard.press('Escape');
  await assert.doesNotReject(() => page.locator('.about-director-diagnostics').waitFor({ state: 'hidden' }));
  await page.waitForFunction(() => (
    document.activeElement === document.querySelector(
      '.about-track-editor-actions button[aria-controls="about-director-diagnostics"]',
    )
  ));
  assert.equal(
    await diagnosticsTrigger.evaluate((node) => document.activeElement === node),
    true,
    'Escape must close Diagnostics and restore its trigger after focus leaves the drawer.',
  );

  await page.getByRole('button', { name: 'Tablet' }).click();
  await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.aboutLayoutProfile === 'tablet');
  await selectPreviewOrientation('portrait');
  const tabletPortraitRatio = await page.locator('.about-narrative-scrollport').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width / rect.height;
  });
  assert.ok(Math.abs(tabletPortraitRatio - (820 / 1180)) < 0.01);
  await selectPreviewOrientation('landscape');
  const tabletLandscapeRatio = await page.locator('.about-narrative-scrollport').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width / rect.height;
  });
  assert.ok(Math.abs(tabletLandscapeRatio - (1180 / 820)) < 0.01);
  await page.getByRole('button', { name: 'Mobile' }).click();
  await selectPreviewOrientation('portrait');
  await setPlayhead(titleHierarchyWU);
  await page.waitForFunction((expectedWU) => Math.abs(
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - expectedWU,
  ) < 0.01, titleHierarchyWU);
  const mobileTitleHierarchy = await readTitleHierarchy();
  assert.ok(
    mobileTitleHierarchy.projectedTitleSize >= mobileTitleHierarchy.editorialSize * 1.3,
    'Mobile spatial titles must remain clearly larger than editorial copy after perspective.',
  );
  await setPlayhead(5.3);
  await page.waitForFunction(() => Math.abs(
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - 5.3,
  ) < 0.01);
  const mobileEditorial = await page.evaluate(() => {
    const viewport = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
    const passage = document.querySelector('[data-text-field-id="text-background-unit"]');
    const bounds = passage.getBoundingClientRect();
    const typographyNode = passage.querySelector('.about-narrative-editorial-copy') || passage;
    const stackNode = passage.querySelector('.about-narrative-editorial-stack') || passage;
    const style = getComputedStyle(typographyNode);
    const stackStyle = getComputedStyle(stackNode);
    return {
      fontSize: Number.parseFloat(style.fontSize),
      rowGap: Number.parseFloat(stackStyle.rowGap),
      visualLineCount: passage.querySelectorAll(
        '.about-narrative-editorial-lines__output > [data-editorial-line]',
      ).length,
      withinInlineViewport: bounds.left >= viewport.left && bounds.right <= viewport.right,
    };
  });
  assert.ok(mobileEditorial.fontSize >= 19.5);
  assert.ok(mobileEditorial.rowGap >= mobileEditorial.fontSize * 0.55);
  assert.ok(
    mobileEditorial.visualLineCount > editorialTrigger.visualLineCount,
    'Editorial line markers must be rebuilt for the narrower mobile preview.',
  );
  assert.equal(mobileEditorial.withinInlineViewport, true);
  await page.screenshot({ path: `${outputDir}/${browserName}-editor-mobile-editorial.png` });

  await setPlayhead(10.55);
  const mobilePortraitRatio = await page.locator('.about-narrative-scrollport').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width / rect.height;
  });
  assert.ok(Math.abs(mobilePortraitRatio - (390 / 844)) < 0.01);
  await page.waitForFunction(() => {
    const root = document.querySelector('.about-narrative-lab');
    const visibleLabels = Number(root?.dataset.worldDisciplineLabels || 0);
    return Number(root?.dataset.narrativeStoryWu) > 10.51
      && visibleLabels === 6;
  });
  await page.waitForFunction(() => {
    const viewport = document.querySelector('.about-narrative-discipline-reveal')?.getBoundingClientRect();
    if (!viewport) return false;
    const intersectingLabels = [...document.querySelectorAll('[data-discipline-group]')]
      .filter((label) => Number(getComputedStyle(label).opacity) > 0.05)
      .filter((label) => {
        const rect = label.getBoundingClientRect();
        return rect.bottom > viewport.top && rect.top < viewport.bottom;
      });
    return intersectingLabels.length >= 1 && intersectingLabels.every((label) => {
      const rect = label.getBoundingClientRect();
      return rect.left >= viewport.left - 1
        && rect.right <= viewport.right + 1;
    });
  });
  const mobileDisciplineBounds = await page.evaluate(() => {
    const viewport = document.querySelector('.about-narrative-discipline-reveal').getBoundingClientRect();
    const intersectingLabels = [...document.querySelectorAll('[data-discipline-group]')]
      .filter((label) => Number(getComputedStyle(label).opacity) > 0.05)
      .filter((label) => {
        const rect = label.getBoundingClientRect();
        return rect.bottom > viewport.top && rect.top < viewport.bottom;
      });
    return intersectingLabels.length >= 1 && intersectingLabels.every((label) => {
      const rect = label.getBoundingClientRect();
      return rect.left >= viewport.left - 1
        && rect.right <= viewport.right + 1;
    });
  });
  assert.equal(mobileDisciplineBounds, true);
  await selectPreviewOrientation('landscape');
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
  const mobileDurationHandle = await page.locator('.about-track-editor-duration-resize').first().boundingBox();
  assert.ok(mobileDurationHandle.width >= 18, `Mobile duration handle was ${mobileDurationHandle.width}px wide.`);
  assert.ok(mobileDurationHandle.height >= 36, `Mobile duration handle was ${mobileDurationHandle.height}px tall.`);
  const inspector = page.getByRole('region', { name: 'Selected object inspector' });
  await assert.doesNotReject(() => inspector.waitFor({ state: 'hidden' }));
  const inspectorToggle = page
    .getByLabel('Phone authoring panel')
    .getByRole('button', { name: 'Inspector', exact: true });
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
