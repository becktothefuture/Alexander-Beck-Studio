import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';

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
const canonicalSemanticFieldCount = canonical.tracks.text.fields.length;
const canonicalTextFieldIds = canonical.tracks.text.fields
  .map((field) => field.id)
  .sort();
const titleHierarchyWU = canonical.tracks.text.fields.find(
  (field) => field.id === 'text-complexity-idea',
)?.focusWU;

await mkdir(outputDir, { recursive: true });

function observeErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const sourceUrl = message.location().url || '';
    if (sourceUrl.startsWith('https://fonts.gstatic.com/')) return;
    errors.push(sourceUrl ? `${message.text()} @ ${sourceUrl}` : message.text());
  });
  return errors;
}

async function auditProduction(viewport, label, expectedProfile) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = observeErrors(page);
  await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
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
  await page.waitForFunction(
    (expectedCount) => document.querySelectorAll('[data-text-field-id]').length === expectedCount,
    canonicalSemanticFieldCount,
  );
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
  assert.equal(initial.semanticFieldCount, canonicalSemanticFieldCount);
  assert.equal(initial.stubSemanticCount, 0);
  assert.equal(initial.canvasCount, 1);
  assert.ok(initial.canvasWidth > 0 && initial.canvasHeight > 0);
  assert.equal(initial.indicatorCount, 18);
  assert.equal(initial.indicatorHost, 'shell-persistent');
  assert.equal(initial.layoutProfile, expectedProfile);

  const disciplineSampleWU = await page.locator('[data-text-field-id="text-discipline-labels"]').evaluate((node) => {
    const wrapper = node.closest('.about-narrative-render-span');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const viewportHeight = Math.max(1, scrollport.clientHeight);
    return (wrapper.offsetTop / viewportHeight)
      + Math.min(0.55, (wrapper.offsetHeight / viewportHeight) * 0.35);
  });
  await page.locator('.about-narrative-scrollport').evaluate((node, storyWU) => {
    // Story WU is content-derived: one viewport height equals one WU. Sampling
    // the rendered discipline block keeps this proof valid as its copy changes.
    node.scrollTop = Math.min(
      node.scrollHeight - node.clientHeight,
      Math.max(0, storyWU * node.clientHeight),
    );
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, disciplineSampleWU);
  await page.waitForFunction((targetWU) => (
    Math.abs(Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - targetWU) < 0.05
  ), disciplineSampleWU);
  const disciplineState = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const viewport = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
    const field = document.querySelector('[data-text-field-id="text-discipline-labels"]');
    const items = [...field.querySelectorAll('.about-narrative-discipline-list li')];
    const labels = items
      .map((item) => item.getBoundingClientRect())
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
      backgroundColor: getComputedStyle(field).backgroundColor,
      descriptionCount: field.querySelectorAll('.about-narrative-discipline-list__description').length,
      descriptionsComplete: [...field.querySelectorAll('.about-narrative-discipline-list__description')]
        .every((node) => node.textContent.trim().length > 0),
      fieldOpacity: Number(getComputedStyle(field).opacity),
      itemCount: items.length,
      legacyRevealCount: document.querySelectorAll('.about-narrative-discipline-reveal').length,
      labelsWithinHorizontalViewport: labels.every((rect) => (
        rect.left >= viewport.left - 1
        && rect.right <= viewport.right + 1
      )),
      overlapPairs,
      titleCount: field.querySelectorAll('.about-narrative-discipline-list__label').length,
      visibleItemCount: labels.length,
      worldStage: root.dataset.worldStage,
      worldVisibility: Number(root.dataset.worldVisibility),
    };
  });
  assert.deepEqual(disciplineState, {
    backgroundColor: 'rgba(0, 0, 0, 0)',
    descriptionCount: 6,
    descriptionsComplete: true,
    fieldOpacity: 1,
    itemCount: 6,
    legacyRevealCount: 0,
    labelsWithinHorizontalViewport: true,
    overlapPairs: [],
    titleCount: 6,
    visibleItemCount: disciplineState.visibleItemCount,
    worldStage: 'calm-field-v1',
    worldVisibility: 1,
  }, `${label} discipline copy should remain solid and separate`);
  assert.ok(disciplineState.visibleItemCount > 0, `${label} discipline copy never enters the viewport.`);
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
    const description = document.querySelector('[data-text-field-id="text-epilogue-invitation"] .about-narrative-finale-description');
    const emailLink = description.querySelector('.about-narrative-finale-description__link');
    const titleRect = title.getBoundingClientRect();
    const descriptionRect = description.getBoundingClientRect();
    const withinViewport = (rect) => rect.top >= viewport.top - 1
      && rect.bottom <= viewport.bottom + 1
      && rect.left >= viewport.left - 1
      && rect.right <= viewport.right + 1;
    return {
      active: [...indicator.querySelectorAll('[data-active="true"]')]
        .map((line) => Number(line.dataset.lineIndex)),
      valueText: indicator.getAttribute('aria-valuetext'),
      finaleCenterRatio: (
        (titleRect.left + (titleRect.width / 2) - viewport.left)
        / Math.max(1, viewport.width)
      ),
      titleOpacity: Number(getComputedStyle(title).opacity),
      descriptionBelowTitle: descriptionRect.top >= titleRect.bottom - 2,
      inlineEmailHref: emailLink.getAttribute('href'),
      finaleWithinViewport: [titleRect, descriptionRect].every(withinViewport),
      simulationVisibility: Number(document.querySelector('.about-narrative-lab')?.dataset.worldVisibility),
    };
  });
  assert.deepEqual(endState.active, [16, 17]);
  assert.equal(endState.valueText, '100% through the About narrative');
  if (expectedProfile === 'desktop') {
    assert.ok(endState.finaleCenterRatio >= 0.58 && endState.finaleCenterRatio <= 0.9);
  } else {
    assert.ok(endState.finaleCenterRatio >= 0.35 && endState.finaleCenterRatio <= 0.65);
  }
  assert.ok(endState.titleOpacity > 0.99);
  assert.equal(endState.descriptionBelowTitle, true);
  assert.equal(endState.inlineEmailHref, 'mailto:alexander@beck.fyi');
  assert.equal(endState.finaleWithinViewport, true, `${label} finale must remain within the studio viewport.`);
  assert.equal(endState.simulationVisibility, 1, `${label} finale must retain the bust.`);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `${outputDir}/${browserName}-production-${label}.png` });
  await context.close();
}

async function auditDirectorV7Editor(page) {
  const editor = page.locator('.about-track-editor');
  const playhead = page.getByRole('slider', { name: 'Timeline playhead' });
  await page.waitForFunction(() => {
    const slider = document.querySelector('input[aria-label="Timeline playhead"]');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    if (!slider || !scrollport) return false;
    const measuredDuration = (scrollport.scrollHeight - scrollport.clientHeight)
      / Math.max(1, scrollport.clientHeight);
    return Math.abs(Number(slider.max) - measuredDuration) < 0.05;
  });

  const initial = await page.evaluate(() => {
    const slider = document.querySelector('input[aria-label="Timeline playhead"]');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    return {
      editorVersion: document.querySelector('.about-track-editor')?.dataset.editorVersion,
      lanes: [...document.querySelectorAll('[data-track-lane]')]
        .map((lane) => lane.dataset.trackLane),
      legacyContainerCount: document.querySelectorAll(
        '[data-narrative-section], [data-section-id], .about-narrative-section',
      ).length,
      semanticFieldCount: document.querySelectorAll('[data-text-field-id]').length,
      measuredDuration: (scrollport.scrollHeight - scrollport.clientHeight)
        / Math.max(1, scrollport.clientHeight),
      timelineDuration: Number(slider.max),
    };
  });
  assert.equal(initial.editorVersion, 'composer-v7');
  assert.deepEqual(initial.lanes, ['camera', 'point-field']);
  assert.equal(initial.legacyContainerCount, 0);
  assert.equal(initial.semanticFieldCount, canonicalSemanticFieldCount);
  assert.ok(Math.abs(initial.timelineDuration - initial.measuredDuration) < 0.05);
  assert.equal(await page.getByRole('button', { name: /Story Stack/ }).count(), 1);
  assert.deepEqual(
    (await page.getByRole('tablist', { name: 'Timeline track' })
      .getByRole('tab').allTextContents()).map((value) => value.replace(/\s+/g, ' ').trim()),
    ['DirectionCamera journey', 'DirectionWorld sequence'],
  );

  await page.getByRole('tab', { name: /World sequence/ }).click();
  const worldStages = page.getByRole('list', { name: 'World stages' });
  assert.equal(await worldStages.getByRole('listitem').count(), 4);
  await worldStages.getByRole('listitem').nth(1).click();
  const inspector = page.getByRole('region', { name: 'Selected object inspector' });
  await inspector.waitFor({ state: 'visible' });
  assert.equal(await inspector.getByRole('heading', { name: 'Reading nebula' }).count(), 1);
  assert.equal(await inspector.getByRole('combobox', { name: 'Movement' }).inputValue(), 'flow');
  assert.equal(await inspector.getByRole('combobox', { name: 'Curve' }).inputValue(), 'smoothstep');
  assert.equal(await inspector.getByRole('slider', { name: 'Form transition flow amount' }).inputValue(), '0.22');
  assert.equal(await inspector.getByRole('slider', { name: 'Form transition stagger amount' }).inputValue(), '0.08');
  assert.equal(await inspector.getByText(/opacity never does/i).count(), 1);

  const setPlayhead = async (value) => {
    await playhead.evaluate((node, nextValue) => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      valueSetter.call(node, String(nextValue));
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await page.waitForFunction((expectedWU) => Math.abs(
      Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu)
        - Number(expectedWU),
    ) < 0.011, value);
  };
  const getFieldFocusWU = (fieldId) => page.locator(`[data-text-field-id="${fieldId}"]`)
    .evaluate((node) => Number(
      node.closest('.about-narrative-render-span')?.style
        .getPropertyValue('--render-span-focus-wu'),
    ));

  const titleFocusWU = await getFieldFocusWU('text-complexity-conditions');
  await setPlayhead(titleFocusWU);
  const titleContract = await page.locator(
    '[data-text-field-id="text-complexity-conditions"] .about-narrative-spatial-title',
  ).evaluate((node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return {
      opacity: Number(style.opacity),
      filter: style.filter,
      shadow: style.textShadow,
      fontFamily: style.fontFamily,
      inViewport: rect.bottom > 0 && rect.top < window.innerHeight,
      worldVisibility: Number(
        document.querySelector('.about-narrative-lab')?.dataset.worldVisibility,
      ),
    };
  });
  assert.equal(titleContract.opacity, 1);
  assert.equal(titleContract.filter, 'none');
  assert.equal(titleContract.shadow, 'none');
  assert.match(titleContract.fontFamily, /Instrument Serif/i);
  assert.equal(titleContract.inViewport, true);
  assert.equal(titleContract.worldVisibility, 1);

  const editorialFocusWU = await getFieldFocusWU('text-background-unit');
  await setPlayhead(editorialFocusWU);
  const editorialContract = await page.locator(
    '[data-text-field-id="text-background-unit"] [data-editorial-reveal]',
  ).evaluateAll((nodes) => nodes.map((node) => ({
    opacity: Number(getComputedStyle(node).opacity),
    filter: getComputedStyle(node).filter,
    authoredReveal: node.style.getPropertyValue('--editorial-reveal'),
  })));
  assert.ok(editorialContract.length > 0);
  assert.equal(editorialContract.every((item) => item.opacity === 1), true);
  assert.equal(editorialContract.every((item) => item.filter === 'none'), true);
  assert.equal(editorialContract.every((item) => item.authoredReveal === ''), true);

  await page.mouse.move(420, 360);
  await page.waitForTimeout(180);
  const pointerPressure = await page.evaluate(() => (
    window.__aboutNarrativeRuntime?.getPointerPressureSnapshot?.()
  ));
  assert.equal(pointerPressure?.active, true);
  assert.ok(pointerPressure?.strength > 0.2);
  assert.ok(pointerPressure?.effectiveRadiusPx > 0);
  assert.ok(pointerPressure?.effectiveForcePx > 0);

  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  assert.deepEqual(
    await page.locator('[data-track-lane]').evaluateAll(
      (nodes) => nodes.map((node) => node.dataset.trackLane),
    ),
    ['text', 'camera', 'camera-orientation', 'camera-lens', 'point-field'],
  );
  assert.equal(await page.getByRole('tab', { name: /Forms \+ effects/ }).count(), 1);
  assert.equal(await editor.getAttribute('data-editor-version'), 'composer-v7');
}

async function auditEditor() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = observeErrors(page);
  await page.goto(`${baseUrl}/about.html?edit=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-track-editor');
  await page.waitForFunction(
    (expectedCount) => document.querySelectorAll('[data-text-field-id]').length === expectedCount,
    canonicalSemanticFieldCount,
  );
  await page.waitForFunction(() => (
    document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete'
  ));

  const scrollport = page.locator('.about-narrative-scrollport');
  assert.equal(
    await scrollport.getAttribute('data-cursor-default-surface'),
    'true',
    'The focusable About scrollport must keep the resting cursor.',
  );
  const restingCursorPoint = await page.evaluate(() => {
    const node = document.querySelector('.about-narrative-scrollport');
    const rect = node.getBoundingClientRect();
    const ratios = [0.25, 0.5, 0.75];
    for (const yRatio of ratios) {
      for (const xRatio of ratios) {
        const x = rect.left + (rect.width * xRatio);
        const y = rect.top + (rect.height * yRatio);
        const target = document.elementFromPoint(x, y);
        if (node.contains(target) && !target.closest('.about-track-editor')) return { x, y };
      }
    }
    return null;
  });
  assert.ok(restingCursorPoint, 'The About preview must expose a non-editor pointer target.');
  await page.mouse.move(restingCursorPoint.x, restingCursorPoint.y);
  await page.waitForTimeout(120);
  assert.equal(
    await page.locator('#custom-cursor').evaluate((node) => node.classList.contains('abs-cursor-interactive')),
    false,
    'Non-clickable About content must not shrink the cursor.',
  );

  const editor = page.locator('.about-track-editor');
  const shortcutInputProbe = page.getByRole('slider', { name: 'Timeline playhead' });
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
  // The current route tab is intentionally inert cursor-wise. Probe a route
  // that can actually navigate so this asserts the shared true-action policy.
  await page.getByRole('link', { name: 'Contact', exact: true }).hover();
  await page.waitForTimeout(120);
  assert.equal(
    await page.locator('#custom-cursor').evaluate((node) => node.classList.contains('abs-cursor-interactive')),
    true,
    'Clickable About controls must still shrink the cursor.',
  );
  await page.keyboard.press('Slash');
  assert.equal(await editor.isVisible(), true, 'Slash should restore the editor chrome.');
  assert.equal(await page.locator('#panelDock:not(.hidden)').isVisible(), false, 'Restoring the About editor must not open the config panel.');
  assert.equal(
    await page.locator('.about-narrative-lab').getAttribute('data-editor-active'),
    'true',
    'The restored editor must reapply its preview geometry.',
  );

  if (Number(canonical.schemaVersion) >= 7) {
    await auditDirectorV7Editor(page);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${outputDir}/${browserName}-editor-desktop.png` });
    await context.close();
    return;
  }

  const selectTrack = async (name) => {
    await page.getByRole('tab', { name, exact: true }).click();
  };
  const runMoreAction = async (name) => {
    const more = page.getByRole('button', { name: 'More', exact: true });
    if (await more.getAttribute('aria-expanded') !== 'true') await more.click();
    const menu = page.getByRole('dialog', { name: 'Director actions' });
    await menu.getByRole('button', { name, exact: true }).click();
    if (await menu.isVisible()) {
      await menu.getByRole('button', { name: 'Close Director menu' }).click();
    }
  };

  const initial = await page.evaluate(() => ({
    editorVersion: document.querySelector('.about-track-editor')?.dataset.editorVersion,
    lanes: [...document.querySelectorAll('[data-track-lane]')].map((lane) => lane.dataset.trackLane),
    legacyContainerCount: document.querySelectorAll('[data-narrative-section], [data-section-id], .about-narrative-section').length,
    plusLabels: [...document.querySelectorAll('.about-track-editor-add')].map((button) => button.getAttribute('aria-label')),
    semanticFieldCount: document.querySelectorAll('[data-text-field-id]').length,
  }));
  assert.equal(initial.editorVersion, 'point-field-v6');
  assert.deepEqual(initial.lanes, ['point-field']);
  assert.equal(initial.legacyContainerCount, 0);
  assert.deepEqual(initial.plusLabels, []);
  assert.equal(initial.semanticFieldCount, canonicalSemanticFieldCount);
  assert.deepEqual(
    await page.getByRole('tablist', { name: 'Timeline track' }).getByRole('tab').allTextContents(),
    ['Camera', 'Visibility', 'Forms', 'Text', 'Motion'],
  );
  for (const [name, lane, addLabel] of [
    ['Camera', 'camera', 'Add Camera object at playhead'],
    ['Visibility', 'visibility', 'Add Visibility object at playhead'],
    ['Forms', 'point-field', null],
    ['Text', 'text', 'Add Text object at playhead'],
    ['Motion', 'interaction', 'Add Motion object at playhead'],
  ]) {
    await selectTrack(name);
    assert.deepEqual(
      await page.locator('[data-track-lane]').evaluateAll((nodes) => nodes.map((node) => node.dataset.trackLane)),
      [lane],
      `${name} must be the only mounted timeline lane after it is selected.`,
    );
    assert.equal(
      await page.getByRole('button', { name: addLabel || 'Unused add control' }).count(),
      addLabel ? 1 : 0,
    );
  }
  await selectTrack('Forms');

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
  const cleanSaveStatus = page.locator('#about-director-save-errors[role="status"]');
  assert.equal(await cleanSaveStatus.count(), 1, 'The saved state must keep an accessible explanation.');
  assert.match(
    await cleanSaveStatus.getAttribute('class'),
    /about-director-visually-hidden/u,
    'The routine saved state must not add visible chrome.',
  );
  await selectTrack('Text');
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
  await selectTrack('Motion');
  const motionResizeHandles = page.getByRole('button', { name: /^Resize Motion .+ (start|end)$/ });
  assert.equal(await motionResizeHandles.count(), 6, 'Every editable Motion clip needs start and end duration handles.');
  assert.equal(
    await page.getByRole('button', { name: /^Resize Motion Horizontal spin (start|end)$/ }).count(),
    0,
    'Protected finale Motion must not expose duration handles.',
  );
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
  await runMoreAction('Undo');
  await page.waitForFunction((beforeWidth) => {
    const rect = document.querySelector('[data-track-object-id="motion-discipline-reveal"]')?.getBoundingClientRect();
    return rect && Math.abs(rect.width - beforeWidth) < 0.6;
  }, motionRectBefore.width);

  await selectTrack('Text');
  const textReference = page.locator('[data-track-object-id="text-background-unit"]');
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
  await runMoreAction('Undo');
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
    textFieldIds: Array.from(document.querySelectorAll('[data-track-object-type="text-field"]'))
      .map((node) => node.getAttribute('data-track-object-id'))
      .filter(Boolean)
      .sort(),
    legacyClientTracks: document.querySelectorAll('[data-track-object-id="text-background-clients"]').length,
    continuousPassages: document.querySelectorAll('p.about-narrative-editorial-copy[data-text-field-id]').length,
  }));
  await selectTrack('Motion');
  const disciplineCount = await page.locator(
    '[data-track-object-id="motion-discipline-reveal"][data-track-object-type="interaction"]',
  ).count();
  await selectTrack('Text');
  assert.deepEqual(authoredStructure, {
    textFieldIds: canonicalTextFieldIds,
    legacyClientTracks: 0,
    continuousPassages: 0,
  });
  assert.equal(disciplineCount, 1);

  const playhead = page.getByRole('slider', { name: 'Timeline playhead' });
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
    const firstLine = passage.matches('[data-editorial-reveal]')
      ? passage
      : passage.querySelector('[data-editorial-reveal]');
    const typographyNode = passage.querySelector('.about-narrative-editorial-copy') || passage;
    const stackNode = passage.querySelector('.about-narrative-editorial-stack') || passage;
    const clientField = passage.querySelector('.about-narrative-client-field');
    const precedingEditorial = clientField?.previousElementSibling;
    const firstLogo = passage.querySelector('[data-editorial-reveal="logo"]');
    const passageStyle = getComputedStyle(typographyNode);
    const stackStyle = getComputedStyle(stackNode);
    return {
      firstLineTopRatio: (firstLine.getBoundingClientRect().top - viewport.top) / viewport.height,
      firstLineReveal: Number(firstLine.style.getPropertyValue('--editorial-reveal')),
      firstWordOpacity: Number(getComputedStyle(firstLine).opacity),
      firstLogoOpacity: Number(getComputedStyle(firstLogo).opacity),
      fontSize: Number.parseFloat(passageStyle.fontSize),
      rowGap: Number.parseFloat(stackStyle.rowGap),
      editorialToLogoGap: clientField && precedingEditorial
        ? clientField.getBoundingClientRect().top - precedingEditorial.getBoundingClientRect().bottom
        : 0,
      visualLineCount: passage.querySelectorAll(
        '.about-narrative-editorial-lines__output > [data-editorial-visual-line]',
      ).length,
    };
  });
  assert.ok(Math.abs(
    editorialTrigger.firstLineTopRatio - editorialContract.revealThreshold,
  ) < 0.025);
  assert.ok(editorialTrigger.firstLineReveal < 0.08);
  assert.ok(Math.abs(editorialTrigger.firstWordOpacity - 0.2) < 0.01);
  assert.ok(Math.abs(editorialTrigger.firstLogoOpacity - 0.2) < 0.01);
  assert.ok(editorialTrigger.fontSize >= 23);
  assert.ok(editorialTrigger.rowGap >= editorialTrigger.fontSize * 0.55);
  assert.ok(Math.abs(editorialTrigger.editorialToLogoGap - (editorialTrigger.rowGap * 2)) < 1);
  assert.ok(editorialTrigger.visualLineCount >= 3, 'Desktop editorial prose must expose visual lines, not paragraph blocks.');

  const staggerProbeStepWU = Math.max(
    0.01,
    canonical.globals.editorialMotion.fadeDurationWU / 10,
  );
  const staggerProbeEndWU = editorialStartWU
    + (canonical.globals.editorialMotion.fadeDurationWU * 2);
  let editorialStaggerWU = editorialStartWU;
  let staggeredLineReveals = [];
  for (
    let probeWU = editorialStartWU + staggerProbeStepWU;
    probeWU <= staggerProbeEndWU + 0.0001;
    probeWU += staggerProbeStepWU
  ) {
    await setPlayhead(probeWU);
    await page.waitForFunction((expectedWU) => Math.abs(
      Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - expectedWU,
    ) < 0.01, probeWU);
    await page.evaluate(() => new Promise((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
    }));
    const sample = await page.locator(
      '[data-text-field-id="text-background-unit"] .about-narrative-editorial-copy:first-child [data-editorial-visual-line]',
    ).evaluateAll((lines) => lines.map((line) => (
      [...line.querySelectorAll('[data-editorial-reveal="word"]')].map((node) => Number(
        node.style.getPropertyValue('--editorial-reveal'),
      ))
    )));
    staggeredLineReveals = sample;
    editorialStaggerWU = probeWU;
    if (sample.some((line) => Math.max(...line) - Math.min(...line) > 0.1)) break;
  }
  assert.ok(staggeredLineReveals.length >= 3);
  assert.ok(
    staggeredLineReveals.every((line) => line.every((value, index) => (
      index === 0 || value <= line[index - 1]
    ))),
    'Editorial prose must reveal in word order instead of one paragraph opacity.',
  );
  assert.ok(
    staggeredLineReveals.some((line) => Math.max(...line) - Math.min(...line) > 0.1),
    `At least one visible line must show a meaningful word-by-word opacity progression by ${editorialStaggerWU.toFixed(3)} WU.`,
  );
  await page.screenshot({ path: `${outputDir}/${browserName}-editor-word-reveal-midpoint.png` });

  const editorialRevealWU = editorialStartWU + 0.5;
  await setPlayhead(editorialRevealWU);
  await page.waitForFunction((expectedWU) => Math.abs(
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - expectedWU,
  ) < 0.01, editorialRevealWU);
  const editorialReveals = await page.locator(
    '[data-text-field-id="text-background-unit"][data-editorial-reveal], [data-text-field-id="text-background-unit"] [data-editorial-reveal]',
  ).evaluateAll((nodes) => nodes.map((node) => Number(
    node.style.getPropertyValue('--editorial-reveal'),
  )));
  assert.ok(editorialReveals.length >= 1);
  assert.ok(Math.max(...editorialReveals) > 0.95);
  await page.screenshot({ path: `${outputDir}/${browserName}-editor-editorial-reveal.png` });

  const disciplineClip = canonical.tracks.interactions.clips.find(
    (clip) => clip.type === 'discipline-reveal',
  );
  assert.ok(disciplineClip, 'The canonical discipline reveal clip is missing.');
  const disciplineSequenceStartWU = Number(disciplineClip.startWU)
    + Number(disciplineClip.parameters.settleDurationWU);
  const disciplineBeatDurationWU = Number(disciplineClip.parameters.beatDurationWU);
  const disciplineItemsPerBeat = Math.max(1, Number(disciplineClip.parameters.itemsPerBeat) || 1);
  const disciplineRevealSamples = [];
  const disciplineSampleWUs = Array.from(
    { length: Math.ceil(disciplineClip.parameters.items.length / disciplineItemsPerBeat) },
    (_, beatIndex) => ({
      groups: disciplineClip.parameters.items
        .slice(0, (beatIndex + 1) * disciplineItemsPerBeat)
        .map((item) => Number(item.group)),
      storyWU: disciplineSequenceStartWU + ((beatIndex + 0.5) * disciplineBeatDurationWU),
    }),
  );
  for (const { storyWU } of disciplineSampleWUs) {
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
  disciplineRevealSamples.forEach((groups, index) => {
    assert.deepEqual(
      groups,
      disciplineSampleWUs[index].groups,
      'Each authored discipline beat must cumulatively expose its matching rows.',
    );
  });

  const disciplineDesktopWU = disciplineSampleWUs.at(-1).storyWU;
  await setPlayhead(disciplineDesktopWU);
  await page.waitForFunction(({ expectedWU, expectedLabelCount }) => (
    Math.abs(Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - expectedWU) < 0.01
    && document.querySelector('.about-narrative-lab')?.dataset.worldTo === 'calm-field-v1'
    && Number(document.querySelector('.about-narrative-lab')?.dataset.worldDisciplineLabels || 0) === expectedLabelCount
  ), {
    expectedWU: disciplineDesktopWU,
    expectedLabelCount: disciplineClip.parameters.items.length,
  });
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

  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('dialog', { name: 'Director actions' })
    .getByRole('button', { name: 'Create checkpoint' })
    .click();
  await page.getByRole('button', { name: 'Close Director menu' }).click();
  const checkpoint = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('abs:about-narrative:checkpoints:v1') || '[]');
    return { count: stored.length, id: stored[0]?.id, name: stored[0]?.name };
  });
  assert.equal(checkpoint.count, 1);
  assert.match(checkpoint.id, /^checkpoint-\d+$/);
  assert.match(checkpoint.name, /^Manual checkpoint · /);

  await selectTrack('Text');
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
  assert.equal(draft.semanticFieldCount, canonicalSemanticFieldCount);
  assert.equal(draft.status, 'Draft · Not published');
  await runMoreAction('Undo');
  assert.equal(await page.locator('[data-text-kind="stub"]').count(), 0);

  await selectTrack('Camera');
  const cameraKey = page.locator('[data-track-object-id="move-grid-birds-eye-2"]');
  await cameraKey.click();
  await page.waitForFunction(() => (
    document.querySelector('.about-director-playhead-readout strong')?.textContent === '5.37'
  ));
  const cameraKeyAlignment = await cameraKey.evaluate((key) => {
    const point = key.querySelector('.about-track-editor-clip__point');
    const playhead = document.querySelector('.about-track-editor-playhead');
    const pointRect = point?.getBoundingClientRect();
    const playheadRect = playhead?.getBoundingClientRect();
    return pointRect && playheadRect
      ? Math.abs(
        (pointRect.left + (pointRect.width / 2))
        - (playheadRect.left + (playheadRect.width / 2)),
      )
      : Number.POSITIVE_INFINITY;
  });
  assert.ok(cameraKeyAlignment <= 0.5, `Camera key centre missed the playhead by ${cameraKeyAlignment}px.`);
  const cameraFolderLabels = await page.locator('[data-inspector-group^="camera-"] > summary span').allTextContents();
  assert.deepEqual(cameraFolderLabels, [
    'Essentials',
    'Advanced coordinates',
    'Travel easing',
  ]);
  assert.equal(await page.getByText('Timing fixed · Pose editable', { exact: true }).count(), 0);
  assert.equal(await page.getByRole('spinbutton', { name: 'Time' }).isEnabled(), true);
  const cameraFolders = page.locator('[data-inspector-group^="camera-"]');
  assert.equal(await cameraFolders.count(), 3);
  assert.equal(await page.locator('[data-inspector-group="camera-essentials"]').evaluate((folder) => folder.open), true);
  assert.equal(await page.locator('[data-inspector-group="camera-advanced"]').evaluate((folder) => folder.open), false);
  assert.equal(await page.locator('[data-inspector-group="camera-easing"]').evaluate((folder) => folder.open), false);
  for (const axis of ['X', 'Y', 'Z']) {
    assert.equal(await page.getByRole('spinbutton', { name: `Camera Position ${axis} exact value` }).getAttribute('step'), '0.01');
    assert.equal(await page.getByRole('spinbutton', { name: `Camera Rotation ${axis} exact value` }).getAttribute('step'), '0.1');
  }
  assert.equal(await page.getByRole('spinbutton', { name: 'Camera Field of view exact value' }).getAttribute('step'), '1');
  const cameraAim = page.getByRole('checkbox', { name: 'Focus on 3D anchor' });
  assert.equal(await cameraAim.count(), 1);
  assert.equal(await page.getByRole('slider', { name: 'Camera Rotation X slider' }).isEnabled(), true);
  await cameraAim.check();
  assert.equal(await page.getByRole('slider', { name: 'Camera orbit angle slider' }).isEnabled(), true);
  assert.equal(await page.getByRole('slider', { name: 'Camera orbit distance slider' }).isEnabled(), true);
  assert.equal(await page.getByRole('slider', { name: 'Camera Rotation X slider' }).count(), 0);
  await cameraAim.uncheck();
  assert.equal(await page.getByRole('slider', { name: 'Camera Rotation X slider' }).isEnabled(), true);
  await runMoreAction('Undo');
  assert.equal(await cameraAim.isChecked(), true);
  await runMoreAction('Undo');
  assert.equal(await cameraAim.isChecked(), false);
  const openingPositionZ = page.getByRole('slider', { name: 'Camera Position Z slider' });
  assert.equal(await openingPositionZ.isEnabled(), true);
  assert.equal(await openingPositionZ.inputValue(), '5.9');
  await openingPositionZ.focus();
  await openingPositionZ.press('ArrowRight');
  await openingPositionZ.press('Tab');
  assert.equal(await openingPositionZ.inputValue(), '5.91');
  await runMoreAction('Undo');
  assert.equal(await openingPositionZ.inputValue(), '5.9');

  await selectTrack('Camera');
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
  await runMoreAction('Undo');
  assert.equal(await fogStart.inputValue(), '10');

  await selectTrack('Visibility');
  const globalVisibilitySettings = page.locator('[data-track-settings="visibility"]');
  await globalVisibilitySettings.waitFor();
  assert.equal(await globalVisibilitySettings.getByRole('heading', { name: 'Simulation visibility' }).count(), 1);
  assert.equal(await globalVisibilitySettings.getByText(/independently of the Camera/i).count(), 1);
  await page.locator('[data-track-object-id="visibility-void-off"]').click();
  assert.equal(
    await page.getByRole('slider', { name: 'Simulation visibility slider' }).inputValue(),
    '0',
  );

  await selectTrack('Forms');
  const shortPointFieldSegment = page.locator(
    '[data-point-field-id="segment-key-world-grid-departure-to-key-world-grid-arrival"]',
  );
  await shortPointFieldSegment.focus();
  await shortPointFieldSegment.press('Enter');
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
    ['Split transition'],
  );
  await selectTrack('Forms');
  await page.locator('[aria-label="Point field state library"] > button').nth(2).click();
  assert.equal(await pointFieldInspector.locator('code').textContent(), 'world-grid');
  for (const label of ['Position X', 'Rotation Z', 'Scale', 'Point size']) {
    assert.equal(
      await pointFieldInspector.getByText(label, { exact: true }).count(),
      1,
      `${label} state control is missing.`,
    );
  }

  await selectTrack('Text');
  assert.equal(await page.getByRole('heading', { name: 'Global text', exact: true }).count(), 1);
  assert.equal(
    await page.locator('[data-track-settings="text"] details').count(),
    ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS.length,
  );
  await page.locator('[data-inspector-group="text-editorial"] > summary').click();
  const revealSlider = page.getByRole('slider', { name: 'Global text Reveal starts slider' });
  const initialRevealThreshold = Number(await revealSlider.inputValue());
  const steppedRevealThreshold = Number((initialRevealThreshold + 0.01).toFixed(2));
  await revealSlider.focus();
  await revealSlider.press('ArrowRight');
  await revealSlider.press('Tab');
  await page.waitForFunction((expected) => (
    Math.abs(Number(
      document.querySelector('.about-narrative-lab')?.style
        .getPropertyValue('--about-editorial-reveal-threshold'),
    ) - expected) < 0.001
  ), steppedRevealThreshold);
  await runMoreAction('Undo');
  assert.equal(Number(await revealSlider.inputValue()), initialRevealThreshold);

  const diagnosticsTrigger = page.getByRole('button', { name: /^Diagnostics/ });
  if (await diagnosticsTrigger.count()) {
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
  } else {
    assert.equal(await page.locator('.about-director-diagnostics').count(), 0);
  }

  await page.locator('details.about-track-editor-preview > summary').click();
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
  await page.waitForFunction(() => {
    const root = document.querySelector('.about-narrative-lab');
    return root?.dataset.aboutLayoutProfile === 'mobile'
      && root.dataset.worldPrepare === 'ready';
  }, null, { timeout: 120_000 });
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
        '.about-narrative-editorial-lines__output > [data-editorial-visual-line]',
      ).length,
      withinInlineViewport: bounds.left >= viewport.left && bounds.right <= viewport.right,
    };
  });
  assert.ok(mobileEditorial.fontSize >= 17);
  assert.ok(mobileEditorial.rowGap >= mobileEditorial.fontSize * 0.55);
  assert.ok(
    mobileEditorial.visualLineCount > editorialTrigger.visualLineCount,
    'Editorial line markers must be rebuilt for the narrower mobile preview.',
  );
  assert.equal(mobileEditorial.withinInlineViewport, true);
  await page.screenshot({ path: `${outputDir}/${browserName}-editor-mobile-editorial.png` });

  const mobilePortraitRatio = await page.locator('.about-narrative-scrollport').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width / rect.height;
  });
  assert.ok(Math.abs(mobilePortraitRatio - (390 / 844)) < 0.01);
  const mobileDisciplineSamples = [];
  for (const { storyWU } of disciplineSampleWUs) {
    await setPlayhead(storyWU);
    await page.waitForFunction((expectedWU) => {
      const root = document.querySelector('.about-narrative-lab');
      return Math.abs(Number(root?.dataset.narrativeStoryWu) - expectedWU) < 0.01
        && root?.dataset.worldPrepare === 'ready';
    }, storyWU, { timeout: 120_000 });
    await page.evaluate(() => new Promise((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
    }));
    const sample = await page.evaluate(() => {
      const root = document.querySelector('.about-narrative-lab');
      const overlay = document.querySelector('.about-narrative-discipline-reveal');
      const viewport = overlay?.getBoundingClientRect();
      const visibleLabels = [...document.querySelectorAll('[data-discipline-group]')]
        .filter((label) => Number(getComputedStyle(label).opacity) > 0.05)
        .map((label) => ({
          group: Number(label.dataset.disciplineGroup),
          rect: label.getBoundingClientRect(),
        }))
        .filter(({ rect }) => viewport && rect.bottom > viewport.top && rect.top < viewport.bottom);
      return {
        activeDiscipline: overlay?.dataset.activeDiscipline || '',
        metricCount: Number(root?.dataset.worldDisciplineLabels || 0),
        visibleGroups: visibleLabels.map(({ group }) => group),
        withinInlineViewport: Boolean(viewport && visibleLabels.length >= 1 && visibleLabels.every(({ rect }) => (
          rect.left >= viewport.left - 1 && rect.right <= viewport.right + 1
        ))),
      };
    });
    mobileDisciplineSamples.push({ storyWU, ...sample });
    if (sample.visibleGroups.length > 0) break;
  }
  const mobileDisciplineSample = mobileDisciplineSamples.find((sample) => (
    sample.visibleGroups.length > 0
  ));
  assert.ok(mobileDisciplineSample, `Mobile discipline reveal never became visible: ${JSON.stringify(mobileDisciplineSamples)}`);
  assert.equal(mobileDisciplineSample.withinInlineViewport, true);
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

  await page.locator('details.about-track-editor-preview > summary').click();
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
    await auditProduction({ width: 375, height: 667 }, 'mobile-portrait-narrow', 'mobile');
  }
  if (!productionOnly) await auditEditor();
  console.log(`PASS: sectionless About Narrative ${browserName} ${productionOnly ? 'production' : editorOnly ? 'editor' : 'production and editor'} audit.`);
} finally {
  await browser.close();
}
