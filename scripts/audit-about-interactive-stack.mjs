import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const browserName = process.env.ABS_BROWSER || 'chromium';
const browserType = browserName === 'webkit' ? webkit : chromium;
const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const canonical = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const stackField = canonical.tracks.text.fields.find((field) => field.id === 'text-disciplines-title');
const storyDurationWU = canonical.profiles.desktop.storyDurationWU;
const stackStoryWU = Math.min(stackField.endWU - 0.15, stackField.startWU + 1.1);
const browser = await browserType.launch(browserName === 'chromium' ? {
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'],
} : { headless: true });

async function setStoryWU(page, storyWU) {
  await page.locator('.about-narrative-scrollport').evaluate((node, { value, duration }) => {
    node.scrollTop = (node.scrollHeight - node.clientHeight) * (value / duration);
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, { value: storyWU, duration: storyDurationWU });
  await page.waitForFunction((value) => {
    const current = Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu);
    return Math.abs(current - value) < 0.08;
  }, storyWU);
}

async function readTopId(page) {
  return page.locator('[data-stack-depth="0"]').getAttribute('data-stack-item-id');
}

async function dragStage(page, stage, { dx, dy, steps = 2, holdMs = 0 }) {
  const box = await stage.boundingBox();
  const x = box.x + box.width * 0.5;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps });
  if (holdMs) await page.waitForTimeout(holdMs);
  await page.mouse.up();
}

async function auditFullMotion() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  const previewRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.url().includes('/images/about/interactive-stack/')) previewRequests.push(request.url());
  });
  await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-narrative-lab');
  await page.waitForTimeout(250);
  assert.equal(previewRequests.length, 0, 'Stack media must not load before the one-viewport prefetch margin.');

  await setStoryWU(page, stackStoryWU);
  const stage = page.locator('.about-interactive-stack__stage');
  await stage.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelectorAll('.about-interactive-stack__card img').length > 0);
  const initial = await page.evaluate(() => {
    const stageNode = document.querySelector('.about-interactive-stack__stage');
    const rect = stageNode.getBoundingClientRect();
    const planeRect = stageNode.querySelector('.about-interactive-stack__plane').getBoundingClientRect();
    const cardRect = stageNode.querySelector('[data-stack-depth="0"]').getBoundingClientRect();
    const activeMedia = stageNode.querySelector('[data-stack-depth="0"] img');
    return {
      cardCount: stageNode.querySelectorAll('.about-interactive-stack__card').length,
      imageCount: stageNode.querySelectorAll('img').length,
      ratio: rect.width / rect.height,
      cardWidthRatio: cardRect.width / planeRect.width,
      stageUserSelect: getComputedStyle(stageNode).userSelect || getComputedStyle(stageNode).webkitUserSelect,
      mediaUserSelect: activeMedia
        ? getComputedStyle(activeMedia).userSelect || getComputedStyle(activeMedia).webkitUserSelect
        : '',
      status: document.querySelector('[id$="-status"]')?.textContent.trim(),
    };
  });
  assert.equal(initial.cardCount, 7);
  assert.ok(initial.imageCount <= 7);
  assert.ok(Math.abs(initial.ratio - (4 / 3)) < 0.01);
  assert.ok(Math.abs(initial.cardWidthRatio - 0.775) < 0.002, 'Authored cards must render 1.25× larger.');
  assert.equal(initial.stageUserSelect, 'none');
  assert.equal(initial.mediaUserSelect, 'none');
  assert.match(initial.status, /^Project impression \d+ of 20:/);
  assert.ok(previewRequests.length <= 7);

  const first = await readTopId(page);
  await stage.focus();
  await stage.press('ArrowRight');
  await page.waitForTimeout(520);
  const second = await readTopId(page);
  assert.notEqual(second, first);
  assert.equal(await stage.evaluate((node) => node === document.activeElement), true);
  await stage.press('ArrowLeft');
  await page.waitForTimeout(520);
  assert.equal(await readTopId(page), first);

  await dragStage(page, stage, { dx: -56, dy: 0, steps: 3 });
  await page.waitForTimeout(32);
  assert.notEqual(await readTopId(page), first, 'A committed horizontal drag must advance once.');

  const beforeFastFlick = await readTopId(page);
  await dragStage(page, stage, { dx: 52, dy: 38, steps: 1 });
  await page.waitForTimeout(16);
  assert.notEqual(await readTopId(page), beforeFastFlick, 'A same-frame fast flick must not strand the pending pointer phase.');
  assert.equal(await stage.getAttribute('data-stack-phase'), 'idle');

  const beforeFadeThrow = await readTopId(page);
  const box = await stage.boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5 - 58, { steps: 4 });
  await page.waitForTimeout(32);
  const dragVisual = await page.evaluate(() => {
    const card = document.querySelector('[data-stack-depth="0"]');
    const media = card.querySelector('img, video, .about-interactive-stack__placeholder');
    const blurMatch = getComputedStyle(media).filter.match(/blur\(([\d.]+)px\)/);
    return {
      opacity: Number(getComputedStyle(card).opacity),
      blurPx: blurMatch ? Number(blurMatch[1]) : 0,
    };
  });
  assert.ok(
    dragVisual.opacity <= 0.05,
    `A short drag must fade before stage clipping; received opacity ${dragVisual.opacity}.`,
  );
  assert.ok(
    dragVisual.blurPx >= 12,
    `A short drag must blur before stage clipping; received ${dragVisual.blurPx}px.`,
  );
  await page.mouse.up();
  await page.waitForTimeout(32);
  assert.notEqual(await readTopId(page), beforeFadeThrow, 'A short upward drag must dismiss the top image.');
  assert.equal(await stage.getAttribute('data-stack-phase'), 'idle');

  const beforeSettle = await readTopId(page);
  await dragStage(page, stage, { dx: 7, dy: 5, steps: 2, holdMs: 120 });
  await page.waitForTimeout(240);
  assert.equal(await readTopId(page), beforeSettle, 'A clearly sub-threshold drag must settle without reordering.');
  assert.equal(await stage.getAttribute('data-stack-phase'), 'idle');

  const loopStart = await readTopId(page);
  const directions = [
    { dx: 56, dy: 0 },
    { dx: -56, dy: 0 },
    { dx: 0, dy: 56 },
    { dx: 0, dy: -56 },
    { dx: 48, dy: 48 },
    { dx: -48, dy: -48 },
    { dx: 48, dy: -48 },
    { dx: -48, dy: 48 },
  ];
  for (let index = 0; index < 60; index += 1) {
    const beforeThrow = await readTopId(page);
    await dragStage(page, stage, { ...directions[index % directions.length], steps: index % 3 === 0 ? 1 : 2 });
    await page.waitForTimeout(16);
    assert.notEqual(await readTopId(page), beforeThrow, `Directional flick ${index + 1} must advance the stack.`);
    assert.equal(await stage.getAttribute('data-stack-phase'), 'idle', `Directional flick ${index + 1} must return to idle.`);
    if ((index + 1) % 20 === 0) {
      assert.equal(await readTopId(page), loopStart, `Full loop ${(index + 1) / 20} must return to its first image.`);
    }
  }

  const beforeInterruptedDrag = await readTopId(page);
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 3 });
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.mouse.move(Math.max(0, box.x - 12), Math.max(0, box.y - 12));
  await page.mouse.up();
  await page.waitForTimeout(320);
  assert.equal(await readTopId(page), beforeInterruptedDrag, 'An interrupted drag must not reorder the stack.');
  assert.equal(await stage.getAttribute('data-stack-phase'), 'idle', 'An interrupted drag must release the stack.');
  assert.equal(
    await stage.evaluate((node) => node.style.getPropertyValue('--stack-drag-progress')),
    '0',
    'An interrupted drag must clear its fade and blur progress.',
  );

  const beforeVertical = await readTopId(page);
  await dragStage(page, stage, { dx: 0, dy: 56, steps: 4 });
  await page.waitForTimeout(32);
  assert.notEqual(await readTopId(page), beforeVertical, 'A downward drag must dismiss the top image.');
  assert.equal(await stage.getAttribute('data-stack-phase'), 'idle');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => (
    document.querySelector('.about-narrative-lab')?.dataset.aboutMotionProfile === 'reduced'
  ));
  for (let index = 0; index < 20; index += 1) {
    await stage.click();
  }
  await page.waitForTimeout(250);
  assert.ok(new Set(previewRequests).size <= 20, 'Cycling the full deck must request each preview at most once.');
  const soak = await stage.evaluate(async (node) => {
    for (let chunk = 0; chunk < 20; chunk += 1) {
      for (let index = 0; index < 50; index += 1) node.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return {
      cardCount: node.querySelectorAll('.about-interactive-stack__card').length,
      phase: node.dataset.stackPhase,
    };
  });
  assert.deepEqual(soak, { cardCount: 7, phase: 'idle' });
  await page.goto(`${baseUrl}/lab/title-entrance.html`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('.about-interactive-stack').count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
}

async function auditReducedMotionAndProfiles() {
  const viewports = [
    { width: 900, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.about-narrative-lab');
    await setStoryWU(page, stackStoryWU);
    const stage = page.locator('.about-interactive-stack__stage');
    await stage.waitFor({ state: 'visible' });
    const before = await readTopId(page);
    await stage.focus();
    await stage.press('ArrowRight');
    const after = await readTopId(page);
    assert.notEqual(after, before);
    assert.equal(await stage.getAttribute('data-stack-phase'), 'idle');
    const state = await page.evaluate(() => {
      const root = document.querySelector('.about-narrative-lab');
      const stageNode = document.querySelector('.about-interactive-stack__stage');
      const rect = stageNode.getBoundingClientRect();
      const stack = document.querySelector('.about-interactive-stack')
        .closest('.about-narrative-editorial-stack');
      return {
        motion: root.dataset.aboutMotionProfile,
        ratio: rect.width / rect.height,
        columns: getComputedStyle(stack).gridTemplateColumns.split(' ').length,
      };
    });
    assert.equal(state.motion, 'reduced');
    assert.ok(Math.abs(state.ratio - (4 / 3)) < 0.01);
    if (viewport.width === 844) assert.equal(state.columns, 2);
    await context.close();
  }
}

async function auditEditorControls() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/about.html?edit=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-track-editor');
  await page.getByRole('tab', { name: 'Text', exact: true }).click();
  await page.locator('[data-track-object-id="text-disciplines-title"]').click();
  const folder = page.locator('[data-inspector-group="interactive-stack"]');
  await folder.waitFor({ state: 'visible' });
  assert.equal(await folder.locator('[data-parameter-id]').count(), 7);
  assert.equal(await folder.getByRole('button', { name: 'Reseed order' }).count(), 1);

  const stage = page.locator('.about-interactive-stack__stage');
  const cardSize = folder.getByRole('slider', { name: 'Interactive stack Card size slider' });
  await cardSize.focus();
  await cardSize.press('ArrowRight');
  await cardSize.blur();
  await page.waitForFunction(() => (
    document.querySelector('.about-interactive-stack__stage')
      ?.style.getPropertyValue('--stack-card-width-pct') === '78'
  ));
  assert.equal(await page.getByRole('button', { name: 'Undo' }).isEnabled(), true);
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.waitForFunction(() => (
    document.querySelector('.about-interactive-stack__stage')
      ?.style.getPropertyValue('--stack-card-width-pct') === '77.5'
  ));
  assert.equal(await stage.count(), 1);
  await context.close();
}

try {
  await auditFullMotion();
  await auditReducedMotionAndProfiles();
  if (process.env.ABS_STACK_SKIP_EDITOR !== '1') await auditEditorControls();
  console.log(`PASS: Interactive stack ${browserName} interaction, loading, accessibility, reduced-motion, and responsive audit`);
} finally {
  await browser.close();
}
