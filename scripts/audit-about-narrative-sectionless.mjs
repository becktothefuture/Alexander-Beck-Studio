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
  await page.waitForFunction(() => document.querySelectorAll('[data-text-field-id]').length === 13);

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
  assert.equal(initial.semanticFieldCount, 13);
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
      worldFrom: root.dataset.worldFrom,
      worldTo: root.dataset.worldTo,
      labelsWithinViewport: labels.every((rect) => (
        rect.left >= viewport.left - 1
        && rect.right <= viewport.right + 1
        && rect.top >= viewport.top - 1
        && rect.bottom <= viewport.bottom + 1
      )),
      overlapPairs,
    };
  });
  assert.deepEqual(disciplineState, {
    activeWorld: 'world-background',
    gridInfluence: '0.0000',
    worldFrom: 'turbulent-field-v1',
    worldTo: 'calm-field-v1',
    labelsWithinViewport: true,
    overlapPairs: [],
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
      actionsBelowTitle: actionsRect.top >= titleRect.bottom - 2,
      finaleWithinViewport: [titleRect, actionsRect, interactionRect].every(withinViewport),
    };
  });
  assert.deepEqual(endState.active, [16, 17]);
  assert.equal(endState.valueText, '100% through the About narrative');
  assert.ok(Math.abs(endState.titleCenterY - initial.openerCenterY) <= 6);
  assert.ok(endState.titleOpacity > 0.99);
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
  await page.waitForFunction(() => document.querySelectorAll('[data-text-field-id]').length === 13);

  const initial = await page.evaluate(() => ({
    editorVersion: document.querySelector('.about-track-editor')?.dataset.editorVersion,
    lanes: [...document.querySelectorAll('[data-track-lane]')].map((lane) => lane.dataset.trackLane),
    legacyContainerCount: document.querySelectorAll('[data-narrative-section], [data-section-id], .about-narrative-section').length,
    plusLabels: [...document.querySelectorAll('.about-track-editor-add')].map((button) => button.getAttribute('aria-label')),
    semanticFieldCount: document.querySelectorAll('[data-text-field-id]').length,
  }));
  assert.equal(initial.editorVersion, 'sectionless-v4');
  assert.deepEqual(initial.lanes, ['camera', 'world', 'text', 'interaction']);
  assert.equal(initial.legacyContainerCount, 0);
  assert.equal(initial.plusLabels.length, 4);
  assert.equal(initial.semanticFieldCount, 13);

  const worldResizeHandles = page.getByRole('button', { name: /^Resize World .+ end$/ });
  assert.equal(await worldResizeHandles.count(), 4, 'Every non-final World needs one duration handle.');
  const textResizeHandles = page.getByRole('button', { name: /^Resize Text .+ (start|end)$/ });
  assert.equal(await textResizeHandles.count(), 26, 'Every editable Text clip needs start and end duration handles.');
  const motionResizeHandles = page.getByRole('button', { name: /^Resize Motion .+ (start|end)$/ });
  assert.equal(await motionResizeHandles.count(), 4, 'Every editable Motion clip needs start and end duration handles.');
  assert.equal(
    await page.getByRole('button', { name: /^Resize Motion Horizontal spin (start|end)$/ }).count(),
    0,
    'Protected finale Motion must not expose duration handles.',
  );
  const visibleHandle = await worldResizeHandles.first().evaluate((node) => {
    const hitTarget = node.getBoundingClientRect();
    const grip = node.querySelector('span')?.getBoundingClientRect();
    return {
      hitWidth: hitTarget.width,
      hitHeight: hitTarget.height,
      gripWidth: grip?.width || 0,
      gripHeight: grip?.height || 0,
    };
  });
  assert.ok(visibleHandle.hitWidth >= 18 && visibleHandle.hitHeight >= 30);
  assert.ok(visibleHandle.gripWidth >= 10 && visibleHandle.gripHeight >= 24);
  const worldB = page.locator('[data-track-object-id="world-complexity"]');
  const worldC = page.locator('[data-track-object-id="world-background"]');
  const worldE = page.locator('[data-track-object-id="world-bringing-life"]');
  const textReference = page.locator('[data-track-object-id="text-background-editorial"]');
  const worldRectsBefore = await Promise.all([worldB, worldC, worldE, textReference].map((locator) => locator.boundingBox()));
  assert.ok(Math.abs(worldRectsBefore[0].x + worldRectsBefore[0].width - worldRectsBefore[1].x) < 0.6);
  const worldBHandle = page.getByRole('button', { name: 'Resize World B end' });
  const handleBox = await worldBHandle.boundingBox();
  await page.mouse.move(handleBox.x + (handleBox.width / 2), handleBox.y + (handleBox.height / 2));
  await page.mouse.down();
  await page.mouse.move(handleBox.x - 33, handleBox.y + (handleBox.height / 2), { steps: 4 });
  await page.mouse.up();
  await page.waitForFunction((beforeX) => {
    const rect = document.querySelector('[data-track-object-id="world-background"]')?.getBoundingClientRect();
    return rect && rect.left < beforeX - 20;
  }, worldRectsBefore[1].x);
  const worldRectsAfter = await Promise.all([worldB, worldC, worldE, textReference].map((locator) => locator.boundingBox()));
  const worldCShift = worldRectsAfter[1].x - worldRectsBefore[1].x;
  const worldEShift = worldRectsAfter[2].x - worldRectsBefore[2].x;
  assert.ok(Math.abs(worldRectsAfter[0].x + worldRectsAfter[0].width - worldRectsAfter[1].x) < 0.6, 'Resized World clips must remain edge-to-edge.');
  assert.ok(Math.abs(worldCShift - worldEShift) < 0.6, 'Every later World must ripple by the same amount.');
  assert.ok(Math.abs(worldRectsAfter[3].x - worldRectsBefore[3].x) < 0.6, 'Independent Text timing must not move during a World resize.');
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.waitForFunction((beforeX) => {
    const rect = document.querySelector('[data-track-object-id="world-background"]')?.getBoundingClientRect();
    return rect && Math.abs(rect.left - beforeX) < 0.6;
  }, worldRectsBefore[1].x);

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
    motionHandleBox.x + (motionHandleBox.width / 2) + 16,
    motionHandleBox.y + (motionHandleBox.height / 2),
    { steps: 4 },
  );
  await page.mouse.up();
  await page.waitForFunction(({ beforeX, beforeWidth }) => {
    const rect = document.querySelector('[data-track-object-id="motion-discipline-reveal"]')?.getBoundingClientRect();
    return rect && rect.x > beforeX + 8 && rect.width < beforeWidth - 8;
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
    const rect = document.querySelector('[data-track-object-id="text-background-editorial"]')?.getBoundingClientRect();
    return rect && rect.width > beforeWidth + 8;
  }, textRectBefore.width);
  const textRectAfter = await textReference.boundingBox();
  assert.ok(Math.abs(textRectAfter.x - textRectBefore.x) < 0.6, 'Text end resize must preserve its start.');
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.waitForFunction((beforeWidth) => {
    const rect = document.querySelector('[data-track-object-id="text-background-editorial"]')?.getBoundingClientRect();
    return rect && Math.abs(rect.width - beforeWidth) < 0.6;
  }, textRectBefore.width);

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
  assert.ok(
    editorialConnection.firstGap < 0 && editorialConnection.firstGap > -80,
    `Editorial and client-logo fields should keep a bounded handoff overlap, received ${editorialConnection.firstGap}px.`,
  );

  const authoredStructure = await page.evaluate(() => ({
    aTitles: document.querySelectorAll('[data-track-object-id="text-promise-main"]').length,
    bTitles: document.querySelectorAll('[data-track-object-id^="text-complexity-"][data-track-object-type="text-field"]').length - 3,
    cEditorial: document.querySelectorAll('[data-track-object-id="text-background-editorial"]').length,
    cLogos: document.querySelectorAll('[data-track-object-id="text-background-clients"]').length,
    dTitles: ['text-complexity-curiosity', 'text-complexity-listen']
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
    bTitles: 1,
    cEditorial: 1,
    cLogos: 1,
    dTitles: 2,
    disciplines: 1,
    dEditorial: 1,
    eTitles: 3,
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
  const selectPreviewOrientation = (value) => page.evaluate((nextValue) => {
    const select = document.querySelector('select[aria-label="Preview orientation"]');
    if (!select) throw new Error('Preview orientation select is missing.');
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    valueSetter.call(select, nextValue);
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
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
  assert.equal(draft.semanticFieldCount, 13);
  assert.equal(draft.status, 'Draft · Not published');
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await page.locator('[data-text-kind="stub"]').count(), 0);

  const clientsClip = page.locator('[data-track-object-id="text-background-clients"]');
  const clientsClipBox = await clientsClip.boundingBox();
  await clientsClip.dblclick({
    position: { x: clientsClipBox.width * 0.7, y: clientsClipBox.height / 2 },
  });
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
  const cameraFolderLabels = await page.locator('[data-inspector-group^="camera-"] > summary span').allTextContents();
  assert.deepEqual(cameraFolderLabels, [
    'Camera rig',
    'Distance fog',
    'Travel easing',
  ]);
  assert.equal(await page.getByText('Timing protected', { exact: true }).count(), 1);
  const cameraFolders = page.locator('[data-inspector-group^="camera-"]');
  assert.equal(await cameraFolders.count(), 3);
  assert.equal(await page.locator('[data-inspector-group="camera-rig"]').evaluate((folder) => folder.open), true);
  assert.equal(await page.locator('[data-inspector-group="camera-easing"]').evaluate((folder) => folder.open), false);
  for (const axis of ['X', 'Y', 'Z']) {
    assert.equal(await page.getByRole('spinbutton', { name: `Camera Position ${axis} exact value` }).getAttribute('step'), '0.01');
    assert.equal(await page.getByRole('spinbutton', { name: `Camera Rotation ${axis} exact value` }).getAttribute('step'), '0.1');
  }
  assert.equal(await page.getByRole('spinbutton', { name: 'Camera Field of view exact value' }).getAttribute('step'), '1');
  assert.equal(await page.getByText(/first-person camera/i).count(), 1);
  assert.equal(await page.getByText(/Depth offset|Frame origin|Target coordinates|Aim target|Roll \/ horizon/).count(), 0);
  const openingPositionZ = page.getByRole('slider', { name: 'Camera Position Z slider' });
  assert.equal(await openingPositionZ.isEnabled(), true);
  assert.equal(await openingPositionZ.inputValue(), '5.6');
  await openingPositionZ.focus();
  await openingPositionZ.press('ArrowRight');
  await openingPositionZ.press('Tab');
  assert.equal(await openingPositionZ.inputValue(), '5.61');
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await openingPositionZ.inputValue(), '5.6');

  await page.getByRole('button', { name: 'Camera', exact: true }).click();
  const globalCameraSettings = page.locator('[data-track-settings="camera"]');
  await globalCameraSettings.waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Global camera' }).count(), 1);
  assert.deepEqual(await globalCameraSettings.locator('details > summary span').allTextContents(), [
    'Camera · Default lens',
  ]);
  await globalCameraSettings.locator('details > summary').click();
  const fieldOfView = globalCameraSettings.getByRole('slider', { name: 'Global camera Default field of view slider' });
  assert.equal(await fieldOfView.inputValue(), '48');
  await fieldOfView.focus();
  await fieldOfView.press('ArrowRight');
  await fieldOfView.press('Tab');
  assert.equal(await fieldOfView.inputValue(), '49');
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await fieldOfView.inputValue(), '48');

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
  await page.waitForFunction(() => {
    const viewport = document.querySelector('.about-narrative-discipline-reveal')?.getBoundingClientRect();
    if (!viewport) return false;
    return [...document.querySelectorAll('[data-discipline-group]')].every((label) => {
      const rect = label.getBoundingClientRect();
      return rect.left >= viewport.left - 1
        && rect.right <= viewport.right + 1
        && rect.top >= viewport.top - 1
        && rect.bottom <= viewport.bottom + 1;
    });
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
