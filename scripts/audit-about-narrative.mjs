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

async function audit(viewport, label) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${baseUrl}/lab/about-narrative.html?edit=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('[data-narrative-section]').count(), 8);
  assert.equal(await page.locator('.about-editor').count(), 1);
  const root = page.locator('.about-narrative-lab');
  if (browserName === 'chromium') assert.equal(await root.getAttribute('data-point-world-state'), 'ready');

  const transport = page.locator('.about-editor-transport input[type="range"]');
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
  await page.locator('.about-editor-lane--text .about-editor-clip').nth(1).locator('.about-editor-cue').first().click();
  const textarea = page.locator('.about-editor-inspector textarea').first();
  if (await textarea.isVisible()) {
    const original = await textarea.inputValue();
    await textarea.fill('Temporary audit statement.');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    assert.equal(await textarea.inputValue(), original);
  }

  if (viewport.width >= 760) {
    const practice = page.locator('[data-narrative-section="practice-reveal"]');
    const practiceWU = await practice.evaluate((node) => {
      const scrollport = document.querySelector('.about-narrative-scrollport');
      return (node.offsetTop / scrollport.clientHeight) + 0.4;
    });
    await transport.fill(String(Math.round(practiceWU / 0.002) * 0.002));
    await page.locator('.about-editor-lane--world > button').nth(3).click();
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
    if (barBox && editorBox) assert.ok(editorBox.y + editorBox.height <= barBox.y + 1);
  }
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
