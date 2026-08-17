import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER || 'chromium';
const browserType = browserName === 'webkit' ? webkit : chromium;
const outputDir = 'output/playwright/about-narrative-infinite-finale';
const canonical = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const orbit = canonical.tracks.camera.orbit;
const orbitCycleWU = (Number(orbit.endWU) - Number(orbit.startWU))
  * (360 / Math.abs(Number(orbit.arcDegrees)));

await mkdir(outputDir, { recursive: true });

function browserOptions() {
  if (browserName !== 'chromium') return { headless: true };
  return {
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader-webgl',
      '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox',
    ],
  };
}

function observeErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

function readFinaleState() {
  const root = document.querySelector('.about-narrative-lab');
  const scrollport = document.querySelector('.about-narrative-scrollport');
  return {
    activeWorld: root?.dataset.activeNarrativeWorld || '',
    motionProfile: root?.dataset.aboutMotionProfile || '',
    finaleActive: root?.dataset.finaleOrbitActive === 'true',
    finaleOrbitWU: Number(root?.dataset.finaleOrbitWu || 0),
    maximumScrollTop: Math.max(0, scrollport.scrollHeight - scrollport.clientHeight),
    scrollTop: scrollport.scrollTop,
    storyWU: Number(root?.dataset.narrativeStoryWu || 0),
    visibility: Number(root?.dataset.worldVisibility || 0),
    worldFrom: root?.dataset.worldFrom || '',
    worldStage: root?.dataset.worldStage || '',
    worldTo: root?.dataset.worldTo || '',
  };
}

async function prepareFinale(page) {
  // Move through each material chapter so the asynchronous point-field worker
  // prepares the same sequence a visitor sees, rather than cold-jumping from
  // the opening cluster to the protected bust.
  for (let step = 1; step <= 110; step += 1) {
    await page.locator('.about-narrative-scrollport').evaluate((node, ratio) => {
      node.scrollTop = (node.scrollHeight - node.clientHeight) * ratio;
      node.dispatchEvent(new Event('scroll', { bubbles: true }));
    }, step / 110);
    await page.waitForTimeout(35);
  }
  const measuredDurationWU = await page.locator('.about-narrative-scrollport').evaluate((node) => (
    (node.scrollHeight - node.clientHeight) / Math.max(1, node.clientHeight)
  ));
  await page.waitForFunction((expectedDurationWU) => {
    const root = document.querySelector('.about-narrative-lab');
    return Number(root?.dataset.narrativeStoryWu) >= expectedDurationWU - 0.001
      && root?.dataset.worldPrepare === 'ready'
      && root?.dataset.worldStage === 'bust-v1';
  }, measuredDurationWU, { timeout: 30_000 });
  return measuredDurationWU;
}

async function openFinale(browser, contextOptions = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ...contextOptions,
  });
  const page = await context.newPage();
  const errors = observeErrors(page);
  await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-narrative-lab[data-world-prepare="ready"]', {
    timeout: 30_000,
  });
  // Page length is measured from the live Story Stack. The persisted profile
  // duration is only a migration cache and must not drive end-scroll proof.
  const durationWU = await prepareFinale(page);
  return { context, durationWU, errors, page };
}

const browser = await browserType.launch(browserOptions());

try {
  const fullMotion = await openFinale(browser);
  const { context, durationWU, errors, page } = fullMotion;
  const initial = await page.evaluate(readFinaleState);
  assert.ok(Math.abs(initial.storyWU - durationWU) <= 0.001);
  assert.equal(initial.activeWorld, 'world-emergent');
  assert.equal(initial.worldFrom, 'calm-field-v1');
  assert.equal(initial.worldStage, 'bust-v1');
  assert.equal(initial.worldTo, 'bust-v1');
  assert.equal(initial.visibility, 1);
  assert.ok(Math.abs(initial.scrollTop - initial.maximumScrollTop) <= 1);
  await page.screenshot({
    path: `${outputDir}/${browserName}-finale-before-continued-scroll.png`,
  });

  // Start before the boundary, then keep one stream of wheel input moving
  // through it. The overflow must reach the orbit immediately; waiting for
  // Lenis to settle would recreate the release-and-scroll-again bug.
  await page.locator('.about-narrative-scrollport').evaluate((node) => {
    node.scrollTop = (node.scrollHeight - node.clientHeight) * 0.9;
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await page.waitForTimeout(250);
  const beforeContinuousGesture = await page.evaluate(readFinaleState);
  assert.ok(beforeContinuousGesture.storyWU < durationWU - 0.1);
  await page.mouse.move(720, 470);
  for (let index = 0; index < 30; index += 1) {
    await page.mouse.wheel(0, 100);
  }
  const duringContinuousGesture = await page.evaluate(readFinaleState);
  assert.notEqual(duringContinuousGesture.finaleOrbitWU, 0);
  assert.equal(duringContinuousGesture.finaleActive, true);
  await page.waitForFunction((expectedDurationWU) => (
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu)
      >= expectedDurationWU - 0.001
  ), durationWU);
  const afterContinuousGesture = await page.evaluate(readFinaleState);
  assert.ok(Math.abs(afterContinuousGesture.storyWU - durationWU) <= 0.001);
  assert.notEqual(afterContinuousGesture.finaleOrbitWU, 0);

  // Exercise a trusted browser wheel event before the larger phase-soak below.
  const beforeWheel = await page.evaluate(readFinaleState);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(250);
  const afterWheel = await page.evaluate(readFinaleState);
  assert.ok(Math.abs(afterWheel.storyWU - durationWU) <= 0.001);
  assert.equal(afterWheel.scrollTop, afterWheel.maximumScrollTop);
  assert.equal(afterWheel.finaleActive, true);
  assert.notEqual(afterWheel.finaleOrbitWU, beforeWheel.finaleOrbitWU);

  // Thousands of extra inputs prove the control is not capped. Only the
  // equivalent angular phase is retained, keeping long sessions numerically
  // stable while the visible orbit remains continuous.
  await page.locator('.about-narrative-scrollport').evaluate((node) => {
    for (let index = 0; index < 10_000; index += 1) {
      node.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaMode: WheelEvent.DOM_DELTA_PIXEL,
        deltaY: 7.25,
      }));
    }
  });
  await page.waitForTimeout(250);
  const afterSoak = await page.evaluate(readFinaleState);
  assert.ok(Math.abs(afterSoak.storyWU - durationWU) <= 0.001);
  assert.equal(afterSoak.scrollTop, afterSoak.maximumScrollTop);
  assert.ok(Number.isFinite(afterSoak.finaleOrbitWU));
  assert.ok(Math.abs(afterSoak.finaleOrbitWU) <= (orbitCycleWU / 2) + 0.000001);
  await page.screenshot({
    path: `${outputDir}/${browserName}-finale-after-continued-scroll.png`,
  });

  // The endpoint is not a scroll trap: one upward gesture resumes ordinary
  // page navigation instead of requiring every added revolution to unwind.
  await page.mouse.wheel(0, -900);
  await page.waitForFunction((expectedDurationWU) => (
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu)
      < expectedDurationWU - 0.1
  ), durationWU);
  const afterReverse = await page.evaluate(readFinaleState);
  assert.ok(afterReverse.storyWU < durationWU - 0.1);

  // Keyboard visitors get the same continued orbit when the scrollport owns
  // focus, using normal page-navigation keys and their familiar distances.
  await page.mouse.wheel(0, 1_200);
  await page.waitForFunction((expectedDurationWU) => (
    Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu)
      >= expectedDurationWU - 0.001
  ), durationWU);
  await page.locator('.about-narrative-scrollport').focus();
  const beforeKeyboard = await page.evaluate(readFinaleState);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  const afterKeyboard = await page.evaluate(readFinaleState);
  assert.notEqual(afterKeyboard.finaleOrbitWU, beforeKeyboard.finaleOrbitWU);
  assert.equal(afterKeyboard.scrollTop, afterKeyboard.maximumScrollTop);
  assert.deepEqual(errors, []);
  await context.close();

  const touchMotion = await openFinale(browser, {
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const beforeTouch = await touchMotion.page.evaluate(readFinaleState);
  const touchDispatch = await touchMotion.page.locator('.about-narrative-scrollport').evaluate((node) => {
    const dispatchTouch = (type, clientY) => {
      let event;
      try {
        const touches = type === 'touchend' ? [] : [new Touch({
          clientX: 195,
          clientY,
          identifier: 1,
          target: node,
        })];
        event = new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          changedTouches: touches,
          targetTouches: touches,
          touches,
        });
      } catch {
        // WebKit exposes Touch but does not allow direct construction. A plain
        // cancelable event with the same read-only surface exercises the
        // native listener contract without depending on Chromium's constructor.
        event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'touches', {
          value: type === 'touchend' ? [] : [{ clientY }],
        });
      }
      return node.dispatchEvent(event);
    };
    dispatchTouch('touchstart', 620);
    const moveAccepted = dispatchTouch('touchmove', 320);
    dispatchTouch('touchend', 320);
    return {
      movePrevented: !moveAccepted,
      orbitWU: Number(document.querySelector('.about-narrative-lab')?.dataset.finaleOrbitWu || 0),
    };
  });
  await touchMotion.page.waitForTimeout(100);
  const afterTouch = await touchMotion.page.evaluate(readFinaleState);
  assert.equal(
    touchDispatch.movePrevented,
    true,
    `the end-swipe should be consumed by the orbit: ${JSON.stringify({ beforeTouch, touchDispatch })}`,
  );
  assert.notEqual(
    touchDispatch.orbitWU,
    beforeTouch.finaleOrbitWU,
    'the end-swipe should advance the orbit before the next frame',
  );
  assert.equal(afterTouch.finaleOrbitWU, touchDispatch.orbitWU);
  assert.ok(Math.abs(afterTouch.storyWU - touchMotion.durationWU) <= 0.001);
  assert.deepEqual(touchMotion.errors, []);
  await touchMotion.context.close();

  const reducedMotion = await openFinale(browser, { reducedMotion: 'reduce' });
  const beforeReducedWheel = await reducedMotion.page.evaluate(readFinaleState);
  await reducedMotion.page.mouse.wheel(0, 600);
  await reducedMotion.page.waitForTimeout(150);
  const afterReducedWheel = await reducedMotion.page.evaluate(readFinaleState);
  assert.equal(beforeReducedWheel.finaleOrbitWU, 0);
  assert.equal(afterReducedWheel.finaleOrbitWU, 0);
  assert.equal(afterReducedWheel.finaleActive, false);
  assert.deepEqual(reducedMotion.errors, []);
  await reducedMotion.context.close();

  console.log(`About infinite finale browser proof passed: ${outputDir}`);
} finally {
  await browser.close();
}
