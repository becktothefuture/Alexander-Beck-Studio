import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const outputRoot = resolve('output/playwright/about-simple-experience');
const profiles = [
  { id: 'desktop', width: 1440, height: 1000, hasTouch: false },
  { id: 'mobile', width: 390, height: 844, hasTouch: true },
];
const captureProgress = [0, 0.18, 0.32, 0.46, 0.62, 0.78, 0.9, 1];
const sampleProgress = Array.from({ length: 51 }, (_, index) => index / 50);
const expectedActs = ['arrival', 'passage', 'landscape-proof', 'open-horizon'];

function attachReadinessProbe(page) {
  return page.addInitScript(() => {
    window.__aboutReadyPaint = null;
    window.addEventListener('abs:about-scene-ready', () => {
      const canvas = document.querySelector('[data-about-simple] canvas');
      const context = canvas?.getContext('2d', { willReadFrequently: true });
      let materialSamples = 0;
      if (canvas && context && canvas.width && canvas.height) {
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const columns = 48;
        const rows = 36;
        for (let row = 0; row < rows; row += 1) {
          const y = Math.min(canvas.height - 1, Math.floor((row + 0.5) * canvas.height / rows));
          for (let column = 0; column < columns; column += 1) {
            const x = Math.min(canvas.width - 1, Math.floor((column + 0.5) * canvas.width / columns));
            if (pixels[((y * canvas.width + x) * 4) + 3] > 12) materialSamples += 1;
          }
        }
      }
      window.__aboutReadyPaint = { materialSamples };
    }, { once: true });
  });
}

async function openAboutPage(context) {
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  await attachReadinessProbe(page);
  await page.goto(`${baseUrl}/about.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-about-simple][data-about-scene-ready="true"]').waitFor({ timeout: 30_000 });
  const scrollport = page.locator('[data-about-simple-scrollport]');
  await scrollport.waitFor();
  const readyPaint = await page.evaluate(() => window.__aboutReadyPaint);
  assert.ok(
    readyPaint?.materialSamples >= 1,
    `scene readiness fired before a painted canvas frame (${readyPaint?.materialSamples || 0} samples)`,
  );
  return { errors, page, scrollport };
}

async function sampleAt(scrollport, requestedProgress) {
  return scrollport.evaluate((node, progress) => {
    const travel = Math.max(0, node.scrollHeight - node.clientHeight);
    node.scrollTop = travel * progress;
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
    return new Promise((resolveSample) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const root = node.closest('[data-about-simple]');
        const canvas = root?.querySelector('canvas');
        const context = canvas?.getContext('2d', { willReadFrequently: true });
        let materialSamples = 0;
        let signature = 2166136261;
        const columns = 96;
        const rows = 72;
        if (canvas && context && canvas.width && canvas.height) {
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          for (let row = 0; row < rows; row += 1) {
            const y = Math.min(canvas.height - 1, Math.floor((row + 0.5) * canvas.height / rows));
            for (let column = 0; column < columns; column += 1) {
              const x = Math.min(canvas.width - 1, Math.floor((column + 0.5) * canvas.width / columns));
              const index = (y * canvas.width + x) * 4;
              const alpha = pixels[index + 3];
              if (alpha > 12) materialSamples += 1;
              signature ^= pixels[index];
              signature = Math.imul(signature, 16777619);
              signature ^= pixels[index + 1];
              signature = Math.imul(signature, 16777619);
              signature ^= pixels[index + 2];
              signature = Math.imul(signature, 16777619);
              signature ^= alpha;
              signature = Math.imul(signature, 16777619);
            }
          }
        }
        resolveSample({
          activeAct: root?.dataset.aboutActiveAct || '',
          gateCount: Number(root?.dataset.aboutVisibleGateCount || 0),
          materialSamples,
          passedGateCount: Number(root?.dataset.aboutPassedGateCount || 0),
          pointFamilies: root?.dataset.aboutPointFamilies || '',
          progress: Number(root?.dataset.aboutProgress || -1),
          requestedProgress: progress,
          signature: String(signature >>> 0),
        });
      }));
    });
  }, requestedProgress);
}

async function assertKeyboardAndScrollContract(page, scrollport, profile) {
  const contract = await scrollport.evaluate((node) => {
    const styles = getComputedStyle(node);
    return {
      overflowY: styles.overflowY,
      scrollBehavior: styles.scrollBehavior,
      touchAction: styles.touchAction,
    };
  });
  assert.ok(['auto', 'scroll'].includes(contract.overflowY), `${profile.id} scrollport is not native`);
  assert.equal(contract.scrollBehavior, 'auto', `${profile.id} adds scroll interpolation`);
  if (profile.hasTouch) {
    assert.ok(contract.touchAction.includes('pan-y'), 'mobile scrollport does not allow native vertical touch');
  }

  await scrollport.focus();
  await page.keyboard.press('Home');
  await page.waitForTimeout(80);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(180);
  const keyboardState = await scrollport.evaluate((node) => ({
    progress: Number(node.dataset.aboutProgress || 0),
    scrollTop: node.scrollTop,
  }));
  assert.ok(
    keyboardState.scrollTop > 0 && keyboardState.progress > 0,
    `${profile.id} keyboard scrolling did not advance the narrative`,
  );
}

async function createContactSheet(context, profile, framePaths) {
  const sheetPage = await context.newPage();
  const cards = await Promise.all(framePaths.map(async ({ path, progress }) => ({
    data: (await readFile(path)).toString('base64'),
    label: `${Math.round(progress * 100)}%`,
  })));
  await sheetPage.setViewportSize({
    width: profile.width >= 1000 ? 1600 : 820,
    height: profile.width >= 1000 ? 1200 : 1800,
  });
  await sheetPage.setContent(`<!doctype html><style>
    *{box-sizing:border-box}body{margin:0;padding:24px;background:#151515;color:#fff;font:14px system-ui}
    h1{margin:0 0 18px;font-size:22px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    figure{margin:0;background:#222;border:1px solid #333;border-radius:10px;overflow:hidden}img{display:block;width:100%;height:auto}figcaption{padding:8px 10px;color:#bbb}
  </style><h1>About simplification — ${profile.id}</h1><div class="grid">${cards.map((card) => `<figure><img src="data:image/png;base64,${card.data}"><figcaption>${card.label}</figcaption></figure>`).join('')}</div>`);
  const contactSheetPath = resolve(outputRoot, `contact-sheet-${profile.id}.png`);
  await sheetPage.screenshot({ path: contactSheetPath, fullPage: true });
  await sheetPage.close();
  return contactSheetPath;
}

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { baseUrl, profiles: {}, compatibility: {} };

try {
  for (const profile of profiles) {
    const context = await browser.newContext({
      colorScheme: 'dark',
      deviceScaleFactor: 1,
      hasTouch: profile.hasTouch,
      viewport: { width: profile.width, height: profile.height },
    });
    const { errors, page, scrollport } = await openAboutPage(context);
    const samples = [];
    for (const progress of sampleProgress) {
      const sample = await sampleAt(scrollport, progress);
      assert.ok(
        Math.abs(sample.progress - progress) <= 0.012,
        `${profile.id} progress ${progress.toFixed(2)} did not map directly; rendered ${sample.progress}`,
      );
      assert.ok(
        sample.materialSamples >= 16,
        `${profile.id} progress ${progress.toFixed(2)} has insufficient visible point material`,
      );
      samples.push(sample);
    }
    const passedGateCounts = samples.map((sample) => sample.passedGateCount);
    assert.equal(
      passedGateCounts.some((count, index) => index > 0 && count < passedGateCounts[index - 1]),
      false,
      `${profile.id} passed-gate count is not ordered`,
    );
    assert.equal(Math.max(...passedGateCounts), 16, `${profile.id} did not cross all sixteen gates`);
    assert.deepEqual(
      [...new Set(samples.map((sample) => sample.activeAct))],
      expectedActs,
      `${profile.id} did not present the four acts in order`,
    );
    assert.equal(
      samples.some((sample) => !sample.pointFamilies.includes('field')),
      false,
      `${profile.id} loses its permanent background field`,
    );
    const proofSamples = samples.filter((sample) => (
      sample.activeAct === 'landscape-proof' || sample.activeAct === 'open-horizon'
    ));
    assert.ok(proofSamples.length > 0, `${profile.id} did not reach the proof and horizon acts`);
    assert.equal(
      proofSamples.some((sample) => sample.gateCount > 0 || !sample.pointFamilies.includes('landscape')),
      false,
      `${profile.id} allows active gates or a missing landscape behind editorial proof`,
    );

    const logoMetrics = await page.locator('.about-simple__client').evaluateAll((nodes) => nodes.map((node) => {
      const image = node.querySelector('img');
      const bounds = image?.getBoundingClientRect();
      return {
        id: node.dataset.clientLogo || image?.alt || '',
        height: bounds?.height || 0,
        width: bounds?.width || 0,
      };
    }));
    assert.equal(logoMetrics.length, 15, `${profile.id} does not render all fifteen client marks`);
    const yoti = logoMetrics.find((metric) => /yoti/i.test(metric.id));
    const widestOther = Math.max(...logoMetrics.filter((metric) => metric !== yoti).map((metric) => metric.width));
    assert.ok(yoti && yoti.width < widestOther, `${profile.id} Yoti mark still dominates the client grid`);

    const framePaths = [];
    for (const progress of captureProgress) {
      await sampleAt(scrollport, progress);
      const path = resolve(outputRoot, `${profile.id}-${String(Math.round(progress * 100)).padStart(3, '0')}.png`);
      await page.screenshot({ path });
      framePaths.push({ path, progress });
    }
    const contactSheetPath = await createContactSheet(context, profile, framePaths);
    await assertKeyboardAndScrollContract(page, scrollport, profile);
    assert.deepEqual(errors, [], `${profile.id} emitted browser errors:\n${errors.join('\n')}`);
    report.profiles[profile.id] = { contactSheetPath, logoMetrics, samples };
    await context.close();
  }

  for (const profile of profiles) {
    const lightContext = await browser.newContext({
      colorScheme: 'light',
      deviceScaleFactor: 1,
      hasTouch: profile.hasTouch,
      viewport: { width: profile.width, height: profile.height },
    });
    const light = await openAboutPage(lightContext);
    const lightSamples = [];
    for (const progress of [0, 0.5, 1]) lightSamples.push(await sampleAt(light.scrollport, progress));
    assert.equal(lightSamples.some((sample) => sample.materialSamples < 16), false, `${profile.id} light theme loses material`);
    assert.deepEqual(light.errors, [], `${profile.id} light theme emitted browser errors`);
    report.compatibility[`${profile.id}-light`] = lightSamples;
    await lightContext.close();

    const reducedContext = await browser.newContext({
      colorScheme: 'dark',
      deviceScaleFactor: 1,
      hasTouch: profile.hasTouch,
      reducedMotion: 'reduce',
      viewport: { width: profile.width, height: profile.height },
    });
    const reduced = await openAboutPage(reducedContext);
    const reducedSamples = [];
    for (const progress of [0, 0.5, 1]) reducedSamples.push(await sampleAt(reduced.scrollport, progress));
    assert.equal(new Set(reducedSamples.map((sample) => sample.signature)).size, 1, `${profile.id} reduced-motion canvas still travels`);
    assert.equal(reducedSamples.some((sample) => sample.materialSamples < 16), false, `${profile.id} reduced-motion frame is empty`);
    assert.deepEqual(reduced.errors, [], `${profile.id} reduced motion emitted browser errors`);
    report.compatibility[`${profile.id}-reduced`] = reducedSamples;
    await reducedContext.close();
  }
} finally {
  await browser.close();
}

await writeFile(resolve(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`PASS: simplified About is populated, directly coupled, accessible, and coherent across desktop and mobile (${outputRoot})`);
