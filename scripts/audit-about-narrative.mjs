import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER || 'chromium';
const browserType = browserName === 'webkit' ? webkit : chromium;
const launchOptions = browserName === 'chromium' ? {
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'],
} : { headless: true };
const browser = await browserType.launch(launchOptions);
await mkdir('output/playwright/about-narrative', { recursive: true });

function formatWU(value) {
  return String(Number((Math.round(value / 0.002) * 0.002).toFixed(3)));
}

async function audit(viewport, label) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${baseUrl}/lab/about-narrative.html?edit=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  assert.equal(new URL(page.url()).searchParams.get('edit'), '1');
  assert.equal(await page.locator('[data-narrative-section]').count(), 8);
  assert.equal(await page.locator('.about-editor').count(), 1);
  assert.equal(await page.locator('#simulations .about-editor').count(), 0);
  assert.equal(await page.locator('body > .about-editor').count(), 1);
  assert.equal(await page.locator('.about-editor .ti').count(), 0);
  assert.equal(await page.locator('.about-editor-transport > button svg').count(), 5);
  const root = page.locator('.about-narrative-lab');
  if (browserName === 'chromium') assert.equal(await root.getAttribute('data-point-world-state'), 'ready');
  assert.match(
    await page.locator('.about-narrative-spatial-title').first().evaluate((node) => getComputedStyle(node).fontFamily),
    /Instrument Serif/,
  );
  const verticalTitles = page.locator('.about-narrative-vertical-title');
  assert.equal(await verticalTitles.count(), 2);
  assert.equal(await page.locator('[data-text-cue="promise-main"]').getAttribute('data-text-movement'), 'vertical');
  assert.equal(await page.locator('[data-text-cue="complexity-idea"]').getAttribute('data-text-movement'), 'vertical');
  assert.equal(await page.locator('[data-text-cue="complexity-conditions"]').getAttribute('data-text-movement'), 'spatial');
  const spatialStageAlignment = await page.locator('.about-narrative-spatial-stage').evaluateAll((nodes) => nodes.map((node) => ({
    alignItems: getComputedStyle(node).alignItems,
    justifyItems: getComputedStyle(node).justifyItems,
  })));
  assert.ok(spatialStageAlignment.every((item) => item.alignItems === 'center' && item.justifyItems === 'center'));
  const spatialTitleSizes = await page.locator('.about-narrative-spatial-title').evaluateAll((nodes) => [...new Set(nodes.map((node) => getComputedStyle(node).fontSize))]);
  assert.equal(spatialTitleSizes.length, 1);
  const editorialTypeSizes = await page.locator([
    '.about-narrative-editorial-title',
    '.about-narrative-editorial-copy',
    '.about-narrative-editorial-detail',
    '.about-narrative-editorial-list__label',
    '.about-narrative-editorial-list li',
    '.about-narrative-client-logos li',
    '.about-narrative-discipline-list li',
    '.about-narrative-discipline-list__number',
  ].join(',')).evaluateAll((nodes) => [...new Set(nodes.map((node) => getComputedStyle(node).fontSize))]);
  assert.equal(editorialTypeSizes.length, 1);
  const cameraClips = page.locator('.about-editor-lane--camera .about-editor-clip');
  for (let index = 0; index < await cameraClips.count(); index += 1) {
    assert.equal(await cameraClips.nth(index).locator('.about-editor-camera-anchor').count(), 2);
    assert.equal(await cameraClips.nth(index).locator('.about-editor-key.is-boundary').count(), 0);
  }
  assert.ok(await page.locator('.about-editor-camera-anchor').evaluateAll((nodes) => (
    nodes.every((node) => getComputedStyle(node).pointerEvents === 'none')
  )));
  assert.equal(
    await page.locator('.about-editor-timing-key.is-text').count(),
    await page.locator('.about-editor-cue').count(),
    'Text should expose one timeline marker per Cue',
  );
  assert.equal(await page.locator('.about-editor-cue.is-vertical').count(), 2);
  const hoverKey = page.locator('.about-editor-key').first();
  const keyBeforeHover = await hoverKey.evaluate((node) => ({
    transform: getComputedStyle(node).transform,
    rect: node.getBoundingClientRect().toJSON(),
  }));
  await hoverKey.hover();
  await page.waitForTimeout(220);
  const keyAfterHover = await hoverKey.evaluate((node) => ({
    transform: getComputedStyle(node).transform,
    cursor: getComputedStyle(node).cursor,
    rect: node.getBoundingClientRect().toJSON(),
  }));
  assert.equal(keyAfterHover.transform, keyBeforeHover.transform);
  assert.ok(Math.abs(keyAfterHover.rect.x - keyBeforeHover.rect.x) < 0.1);
  assert.ok(Math.abs(keyAfterHover.rect.y - keyBeforeHover.rect.y) < 0.1);
  assert.equal(keyAfterHover.cursor, 'pointer');
  assert.equal(await page.locator('#custom-cursor').evaluate((node) => getComputedStyle(node).display), 'none');

  const transport = page.locator('.about-editor-transport input[type="range"]');
  const openingTitleBefore = await verticalTitles.first().boundingBox();
  await transport.fill('0.12');
  await page.waitForTimeout(120);
  const openingTitleAfter = await verticalTitles.first().boundingBox();
  assert.ok(openingTitleBefore && openingTitleAfter && openingTitleAfter.y < openingTitleBefore.y - 40);
  for (const storyWU of [0, 1.5, 3.5, 6.5, 10.5, 15.5]) {
    await transport.fill(String(storyWU));
    await page.waitForTimeout(180);
    const sampled = await root.evaluate((node) => ({
      story: Number(getComputedStyle(node).getPropertyValue('--narrative-story-wu')),
      camera: Number(getComputedStyle(node).getPropertyValue('--narrative-camera-forward')),
    }));
    assert.ok(Math.abs(sampled.story - storyWU) < 0.03);
    assert.ok(Math.abs(sampled.camera - storyWU) < 0.03);
  }

  await page.locator('.about-editor-lane--section button').nth(1).click();
  const selectedCue = page.locator('.about-editor-lane--text .about-editor-clip').nth(1).locator('.about-editor-cue').first();
  await selectedCue.click({ position: { x: 3, y: 14 } });
  assert.equal(await selectedCue.getAttribute('aria-pressed'), 'true');
  assert.equal(await selectedCue.locator('xpath=..').locator('.about-editor-timing-key.is-text.is-selected').count(), 1);
  const textarea = page.locator('.about-editor-inspector textarea').first();
  if (await textarea.isVisible()) {
    const original = await textarea.inputValue();
    await textarea.fill('Temporary audit statement.');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    assert.equal(await textarea.inputValue(), original);
    await textarea.blur();
  }
  const beforeArrow = Number(await transport.inputValue());
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(80);
  assert.ok(Number(await transport.inputValue()) > beforeArrow);
  assert.ok(await page.locator('.about-editor-key.is-selected, .about-editor-timing-key.is-selected').count() >= 1);
  assert.equal(await page.locator('.about-editor-timing-note').count(), 0);

  if (viewport.width >= 760) {
    const practiceCameraClip = cameraClips.nth(3);
    const disciplinesCameraClip = cameraClips.nth(4);
    const movableCameraKey = practiceCameraClip.locator('.about-editor-key.is-draggable').first();
    const [destinationClipBox, cameraKeyBox] = await Promise.all([disciplinesCameraClip.boundingBox(), movableCameraKey.boundingBox()]);
    const cameraLabelBeforeDrag = await movableCameraKey.getAttribute('aria-label');
    const sourceKeyCountBefore = await practiceCameraClip.locator('.about-editor-key').count();
    const destinationKeyCountBefore = await disciplinesCameraClip.locator('.about-editor-key').count();
    assert.ok(destinationClipBox && cameraKeyBox);
    await page.mouse.move(cameraKeyBox.x + (cameraKeyBox.width / 2), cameraKeyBox.y + (cameraKeyBox.height / 2));
    await page.mouse.down();
    await page.mouse.move(destinationClipBox.x + (destinationClipBox.width * 0.3), cameraKeyBox.y + (cameraKeyBox.height / 2), { steps: 8 });
    assert.equal(await page.locator('.about-editor-camera-drag-ghost').count(), 1);
    await page.mouse.up();
    await page.waitForTimeout(100);
    assert.equal(await practiceCameraClip.locator('.about-editor-key').count(), sourceKeyCountBefore - 1);
    assert.equal(await disciplinesCameraClip.locator('.about-editor-key').count(), destinationKeyCountBefore + 1);
    const movedCameraKey = disciplinesCameraClip.locator('.about-editor-key.is-selected');
    assert.match(await movedCameraKey.getAttribute('aria-label'), /through Six connected disciplines/i);
    assert.notEqual(await movedCameraKey.getAttribute('aria-label'), cameraLabelBeforeDrag);
    assert.equal(await page.locator('.about-editor-camera-drag-ghost').count(), 0);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(100);
    assert.equal(await practiceCameraClip.locator('.about-editor-key').count(), sourceKeyCountBefore);
    assert.equal(await disciplinesCameraClip.locator('.about-editor-key').count(), destinationKeyCountBefore);
    assert.equal(await practiceCameraClip.locator('.about-editor-key').first().getAttribute('aria-label'), cameraLabelBeforeDrag);

    const complexityTextClip = page.locator('.about-editor-lane--text .about-editor-clip').nth(1);
    const movableTextKey = complexityTextClip.locator('.about-editor-timing-key.is-text.is-draggable').nth(1);
    const [textClipBox, textKeyBox] = await Promise.all([complexityTextClip.boundingBox(), movableTextKey.boundingBox()]);
    const textLabelBeforeDrag = await movableTextKey.getAttribute('aria-label');
    assert.ok(textClipBox && textKeyBox);
    await page.mouse.move(textKeyBox.x + (textKeyBox.width / 2), textKeyBox.y + (textKeyBox.height / 2));
    await page.mouse.down();
    await page.mouse.move(Math.min(textClipBox.x + textClipBox.width - 14, textKeyBox.x + 18), textKeyBox.y + (textKeyBox.height / 2), { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    assert.notEqual(await movableTextKey.getAttribute('aria-label'), textLabelBeforeDrag);
    assert.equal(await movableTextKey.getAttribute('aria-pressed'), 'true');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(100);
    assert.equal(await movableTextKey.getAttribute('aria-label'), textLabelBeforeDrag);

    const inspector = page.locator('.about-editor-inspector');
    const inspectorHeader = inspector.locator('header').first();
    const [inspectorBefore, headerBox] = await Promise.all([inspector.boundingBox(), inspectorHeader.boundingBox()]);
    assert.ok(inspectorBefore && headerBox);
    await page.mouse.move(headerBox.x + 36, headerBox.y + (headerBox.height / 2));
    await page.mouse.down();
    await page.mouse.move(headerBox.x - 140, headerBox.y + 46, { steps: 6 });
    await page.mouse.up();
    const inspectorAfter = await inspector.boundingBox();
    assert.equal(await inspector.getAttribute('data-floating'), 'true');
    assert.ok(inspectorAfter.x < inspectorBefore.x - 80);
    assert.ok(inspectorAfter.y >= 0);
    assert.ok(inspectorAfter.x >= 0);
    assert.ok(inspectorAfter.x + inspectorAfter.width <= viewport.width);
    const editorBottomBoundary = await page.locator('[data-button-bar]').boundingBox();
    const timelineBoundary = await page.locator('.about-editor-bottom').boundingBox();
    if (timelineBoundary) assert.ok(inspectorAfter.y + inspectorAfter.height <= timelineBoundary.y);
    else if (editorBottomBoundary) assert.ok(inspectorAfter.y + inspectorAfter.height <= editorBottomBoundary.y);
    await inspectorHeader.dblclick();
    assert.equal(await inspector.getAttribute('data-floating'), 'false');

    const complexityWorldClip = page.locator('.about-editor-lane--world .about-editor-clip').nth(1);
    await complexityWorldClip.locator('.about-editor-world-clip').click();
    const transitionDetails = page.locator('.about-editor-inspector details').filter({ hasText: 'Transition in' });
    const transitionEnd = transitionDetails.locator('.about-editor-property').filter({ hasText: /^End/ }).locator('input[type="number"]');
    await transitionEnd.fill('2.2');
    await page.waitForTimeout(120);
    const transitionKeys = complexityWorldClip.locator('.about-editor-timing-key.is-world');
    assert.equal(await transitionKeys.count(), 2);
    const [complexityClipBox, transitionEndBox] = await Promise.all([
      complexityWorldClip.boundingBox(),
      transitionKeys.nth(1).boundingBox(),
    ]);
    assert.ok(complexityClipBox && transitionEndBox);
    assert.ok(transitionEndBox.x > complexityClipBox.x + complexityClipBox.width);
    await transitionKeys.nth(1).click({ force: true });
    await page.keyboard.press('Delete');
    await page.waitForTimeout(120);
    assert.equal(await transitionKeys.count(), 0);
    assert.match(await transitionDetails.textContent(), /cuts in/i);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(120);
    assert.equal(await transitionKeys.count(), 2);

    const disciplineFocusWU = await page.locator('[data-world-group="4"]').evaluate((node) => {
      const scrollport = document.querySelector('.about-narrative-scrollport');
      const scrollRect = scrollport.getBoundingClientRect();
      const absoluteTop = node.getBoundingClientRect().top - scrollRect.top + scrollport.scrollTop;
      return (absoluteTop - (scrollport.clientHeight * 0.68)) / scrollport.clientHeight;
    });
    await transport.fill(formatWU(disciplineFocusWU));
    await page.waitForTimeout(140);
    assert.equal(await root.getAttribute('data-world-group-focus'), '4');
    const influenceWU = await page.locator('[data-world-influence="true"]').evaluate((node) => {
      const scrollport = document.querySelector('.about-narrative-scrollport');
      const scrollRect = scrollport.getBoundingClientRect();
      const absoluteTop = node.getBoundingClientRect().top - scrollRect.top + scrollport.scrollTop;
      return (absoluteTop - (scrollport.clientHeight * 0.68)) / scrollport.clientHeight;
    });
    await transport.fill(formatWU(influenceWU));
    await page.waitForTimeout(140);
    assert.ok(Number(await root.getAttribute('data-world-grid-influence')) > 0.2);

    const practice = page.locator('[data-narrative-section="practice-reveal"]');
    const practiceWU = await practice.evaluate((node) => {
      const scrollport = document.querySelector('.about-narrative-scrollport');
      return (node.offsetTop / scrollport.clientHeight) + 0.4;
    });
    await transport.fill(formatWU(practiceWU));
    await page.locator('.about-editor-lane--world .about-editor-world-clip').nth(3).click();
    await page.waitForTimeout(120);
    const before = await root.evaluate((node) => ({
      camera: getComputedStyle(node).getPropertyValue('--narrative-camera-forward'),
      text: document.querySelector('[data-text-cue="practice-main"]')?.textContent,
    }));
    await page.locator('.about-editor-shape-catalog button').filter({ hasText: 'Cluster' }).click();
    await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.worldTo === 'cluster-v1');
    const tried = await root.evaluate((node) => ({
      camera: getComputedStyle(node).getPropertyValue('--narrative-camera-forward'),
      text: document.querySelector('[data-text-cue="practice-main"]')?.textContent,
      world: node.dataset.worldTo,
    }));
    assert.equal(tried.world, 'cluster-v1');
    assert.equal(tried.camera, before.camera);
    assert.equal(tried.text, before.text);
    await page.locator('.about-editor-try button').filter({ hasText: 'Cancel' }).click();
    await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.worldTo === 'discipline-grid-v1');
  }

  const bottomBar = page.locator('[data-button-bar]');
  const editorBottom = page.locator('.about-editor-bottom');
  if (await bottomBar.count()) {
    const [barBox, editorBox] = await Promise.all([bottomBar.boundingBox(), editorBottom.boundingBox()]);
    if (barBox && editorBox) {
      assert.ok(Math.abs(editorBox.y + editorBox.height - viewport.height) <= 1);
      assert.ok(editorBox.y < barBox.y && editorBox.y + editorBox.height > barBox.y);
    }
  }
  const timelineToggle = page.locator('.about-editor-timeline-toggle');
  await timelineToggle.click();
  assert.equal(await timelineToggle.getAttribute('aria-expanded'), 'false');
  await timelineToggle.click();
  assert.equal(await timelineToggle.getAttribute('aria-expanded'), 'true');
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `output/playwright/about-narrative/${browserName}-${label}.png` });
  await page.close();
}

try {
  await audit({ width: 1440, height: 1000 }, 'desktop');
  await audit({ width: 390, height: 844 }, 'mobile');
  console.log(`PASS: About Narrative runtime and editor (${browserName})`);
} finally {
  await browser.close();
}
