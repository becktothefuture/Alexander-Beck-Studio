import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// Exercise Chrome's real page-zoom setting in a disposable profile. Resizing a
// viewport or setting a CDP pinch scale does not prove desktop text reflow.
const out = resolve(process.env.ABS_ZOOM_OUTPUT || 'output/playwright/about-desktop-zoom');
await mkdir(out, { recursive: true });
const context = await chromium.launchPersistentContext(resolve(out, 'browser-profile'), {
  channel: 'chrome', headless: true, viewport: null, args: ['--window-size=1440,1000'],
});
const errors = [];
let settings;
try {
  settings = context.pages()[0];
  await settings.goto('chrome://settings/appearance', { waitUntil: 'domcontentloaded' });
  const zoomControl = settings.locator('#zoomLevel');
  await zoomControl.selectOption('1');
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${process.env.ABS_BASE_URL || 'http://localhost:8012'}/about.html?preview=about&edit=0`);
  await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.aboutSceneReady === 'true');
  const read = () => page.evaluate(() => ({
    width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
    cover: Boolean(document.querySelector('.viewport-cover')),
    rootInert: document.getElementById('root').inert,
    rootHidden: document.getElementById('root').getAttribute('aria-hidden') === 'true',
  }));
  const baseline = await read();
  await zoomControl.selectOption('2');
  await page.bringToFront();
  await page.waitForFunction(dpr => devicePixelRatio === dpr * 2, baseline.dpr);
  await page.waitForTimeout(800);
  const zoom = await read();
  assert.equal(zoom.width, Math.round(baseline.width / 2));
  assert.equal(zoom.dpr / baseline.dpr, 2);
  assert.equal(zoom.cover || zoom.rootInert || zoom.rootHidden, false);
  const port = page.locator('.about-narrative-scrollport');
  const before = await port.evaluate(node => node.scrollTop);
  await page.mouse.move(zoom.width / 2, zoom.height / 2);
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(350);
  const afterWheel = await port.evaluate(node => node.scrollTop);
  assert.ok(afterWheel - before >= 100, 'Real page zoom blocked native wheel input.');
  await port.focus();
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(450);
  const afterKeyboard = await port.evaluate(node => node.scrollTop);
  assert.ok(afterKeyboard > afterWheel + 100, 'Real page zoom blocked keyboard scrolling.');
  await page.keyboard.press('End');
  await page.waitForTimeout(1500);
  const endpoint = await port.evaluate(node => ({ top: node.scrollTop, end: node.scrollHeight - node.clientHeight }));
  assert.ok(Math.abs(endpoint.top - endpoint.end) < 1, 'Keyboard End cannot reach the complete invitation.');
  const actions = page.locator('[data-text-field-id="text-epilogue-invitation"] button, [data-text-field-id="text-epilogue-invitation"] a');
  const bounds = await actions.evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).visibility !== 'hidden').map(node => {
    const r = node.getBoundingClientRect();
    return { text: node.textContent.trim(), left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  }));
  assert.ok(bounds.length >= 2, 'Zoomed invitation lost its contact actions.');
  for (const bound of bounds) assert.ok(bound.left >= 0 && bound.right <= zoom.width
    && bound.top >= 0 && bound.bottom <= zoom.height, `${bound.text} left the zoomed viewport.`);
  // Playwright's viewport clip uses CSS pixels and crops a native zoomed window.
  const cdp = await context.newCDPSession(page);
  const capture = await cdp.send('Page.captureScreenshot', { fromSurface: true, captureBeyondViewport: false });
  await writeFile(resolve(out, 'native-200-invitation.png'), Buffer.from(capture.data, 'base64'));
  await cdp.detach();
  await zoomControl.selectOption('1');
  await page.waitForFunction(dpr => devicePixelRatio === dpr, baseline.dpr);
  const restored = await read();
  assert.equal(restored.rootInert || restored.cover, false);
  assert.deepEqual(errors, []);
  const report = { baseline, zoom, before, afterWheel, afterKeyboard, endpoint, actions: bounds, restored, errors };
  await writeFile(resolve(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
} finally {
  await settings?.locator('#zoomLevel').selectOption('1').catch(() => {});
  await context.close();
}
