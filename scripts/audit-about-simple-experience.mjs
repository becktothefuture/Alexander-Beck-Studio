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
const EXPECTED_OPENING = 'Hi, I’m Alex.';
const EXPECTED_WORLDVIEW = 'The problems that interest me rarely belong to one discipline.';
const EXPECTED_FINALE = 'Let’s begin.';

function percentile(values, quantile) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * quantile));
  return sorted[index];
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

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
          drawCount: Number(root?.dataset.aboutDrawCount || 0),
          flatDrawCount: Number(root?.dataset.aboutFlatDrawCount || 0),
          gateCount: Number(root?.dataset.aboutVisibleGateCount || 0),
          lastRenderMs: Number(root?.dataset.aboutLastRenderMs || 0),
          materialBakesInFrame: Number(root?.dataset.aboutMaterialBakesInFrame || 0),
          materialDrawCount: Number(root?.dataset.aboutMaterialDrawCount || 0),
          materialSamples,
          passedGateCount: Number(root?.dataset.aboutPassedGateCount || 0),
          pointFinish: root?.dataset.aboutPointFinish || '',
          pointFamilies: root?.dataset.aboutPointFamilies || '',
          pointMaterialTheme: root?.dataset.aboutPointMaterialTheme || '',
          pointSpriteCount: Number(root?.dataset.aboutPointSpriteCount || 0),
          progress: Number(root?.dataset.aboutProgress || -1),
          requestedProgress: progress,
          signature: String(signature >>> 0),
        });
      }));
    });
  }, requestedProgress);
}

async function readTextContract(page, scrollport) {
  await sampleAt(scrollport, 0);
  const opening = await page.evaluate(() => {
    const title = document.querySelector('.about-simple__lockup h1');
    const description = document.querySelector('.about-simple__lockup .route-intro-description');
    const rule = document.querySelector('.about-simple__lockup .route-title-lockup__rule');
    const styles = title ? getComputedStyle(title) : null;
    return {
      descriptionClass: description?.className || '',
      fontFamily: styles?.fontFamily || '',
      fontSize: Number.parseFloat(styles?.fontSize || '0'),
      lineHeight: Number.parseFloat(styles?.lineHeight || '0'),
      rulePresent: Boolean(rule),
      ruleUsesEntryHook: rule?.hasAttribute('data-about-route-entry-rule') || false,
      text: title?.textContent || '',
      usesBookendClass: title?.classList.contains('route-bookend-title') || false,
      usesIdentityEntrance: title?.dataset.routeEnter === 'identity',
      usesBookendEntrance: title?.dataset.routeEnterVariant === 'bookend-title',
    };
  });

  await sampleAt(scrollport, 0.62);
  const proof = await page.evaluate(() => {
    const title = document.querySelector('.about-simple__landscape-copy h2');
    const body = document.querySelector('.about-simple__body-copy');
    const titleStyles = title ? getComputedStyle(title) : null;
    const bodyStyles = body ? getComputedStyle(body) : null;
    const bodyBounds = body?.getBoundingClientRect();
    return {
      bodyFontSize: Number.parseFloat(bodyStyles?.fontSize || '0'),
      bodyWidth: bodyBounds?.width || 0,
      fontFamily: titleStyles?.fontFamily || '',
      fontSize: Number.parseFloat(titleStyles?.fontSize || '0'),
      lineHeight: Number.parseFloat(titleStyles?.lineHeight || '0'),
      text: title?.textContent || '',
    };
  });

  await sampleAt(scrollport, 1);
  const finale = await page.evaluate(() => {
    const title = document.querySelector('.about-simple__finale h2');
    const description = document.querySelector('.about-simple__finale > p');
    const rule = document.querySelector('.about-simple__finale .route-title-lockup__rule');
    const styles = title ? getComputedStyle(title) : null;
    return {
      descriptionClass: description?.className || '',
      fontFamily: styles?.fontFamily || '',
      fontSize: Number.parseFloat(styles?.fontSize || '0'),
      lineHeight: Number.parseFloat(styles?.lineHeight || '0'),
      rulePresent: Boolean(rule),
      text: title?.textContent || '',
      usesBookendClass: title?.classList.contains('route-bookend-title') || false,
    };
  });

  return { finale, opening, proof };
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

async function createContactSheet(context, profile, framePaths, variant = 'dark') {
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
  </style><h1>About simplification — ${profile.id} — ${variant}</h1><div class="grid">${cards.map((card) => `<figure><img src="data:image/png;base64,${card.data}"><figcaption>${card.label}</figcaption></figure>`).join('')}</div>`);
  const variantSuffix = variant === 'dark' ? '' : `-${variant}`;
  const contactSheetPath = resolve(outputRoot, `contact-sheet-${profile.id}${variantSuffix}.png`);
  await sheetPage.screenshot({ path: contactSheetPath, fullPage: true });
  await sheetPage.close();
  return contactSheetPath;
}

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { baseUrl, profiles: {}, compatibility: {}, visuals: {} };

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
      assert.equal(sample.pointFinish, 'cached-sphere-sticker', `${profile.id} does not use the Home sphere finish`);
      assert.equal(sample.pointSpriteCount, 6, `${profile.id} does not retain the six cached About palette sprites`);
      assert.ok(sample.drawCount > 0, `${profile.id} progress ${progress.toFixed(2)} drew no point bodies`);
      assert.equal(sample.materialDrawCount, sample.drawCount, `${profile.id} mixes non-material point bodies into the frame`);
      assert.equal(sample.flatDrawCount, 0, `${profile.id} used flat point fallbacks while the Home material was available`);
      assert.equal(sample.materialBakesInFrame, 0, `${profile.id} baked sphere material during a render frame`);
      samples.push(sample);
    }
    const renderTimes = samples.map((sample) => sample.lastRenderMs);
    const performance = {
      maxRenderMs: Math.max(...renderTimes),
      p95RenderMs: percentile(renderTimes, 0.95),
    };
    assert.ok(performance.p95RenderMs <= 16.7, `${profile.id} point renderer misses the 60 FPS frame budget at p95`);
    assert.ok(performance.maxRenderMs <= 33.4, `${profile.id} point renderer exceeds two frame budgets`);
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

    const textContract = await readTextContract(page, scrollport);
    assert.equal(normalizeText(textContract.opening.text), EXPECTED_OPENING, `${profile.id} opener copy changed`);
    assert.equal(normalizeText(textContract.proof.text), EXPECTED_WORLDVIEW, `${profile.id} worldview copy changed`);
    assert.equal(normalizeText(textContract.finale.text), EXPECTED_FINALE, `${profile.id} finale copy changed`);
    assert.equal(textContract.opening.usesBookendClass, true, `${profile.id} opener lost the shared bookend scale`);
    assert.equal(textContract.finale.usesBookendClass, true, `${profile.id} finale lost the shared bookend scale`);
    assert.equal(textContract.opening.usesIdentityEntrance, true, `${profile.id} opener lost its title entrance`);
    assert.equal(textContract.opening.usesBookendEntrance, true, `${profile.id} opener lost its bookend entrance variant`);
    assert.equal(textContract.opening.rulePresent && textContract.finale.rulePresent, true, `${profile.id} bookend rule is missing`);
    assert.equal(textContract.opening.ruleUsesEntryHook, true, `${profile.id} opener rule lost its entrance hook`);
    assert.ok(
      Math.abs(textContract.opening.fontSize - textContract.finale.fontSize) <= 0.1,
      `${profile.id} opener and finale no longer share the same text size`,
    );
    assert.ok(
      textContract.opening.fontSize >= (profile.id === 'desktop' ? 120 : 60),
      `${profile.id} bookend title size regressed`,
    );
    assert.ok(
      textContract.proof.fontSize >= (profile.id === 'desktop' ? 88 : 42),
      `${profile.id} viewport proof title size regressed`,
    );
    assert.ok(
      textContract.proof.bodyWidth >= (profile.id === 'desktop' ? 600 : 320),
      `${profile.id} body copy measure regressed`,
    );

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
    report.profiles[profile.id] = {
      contactSheetPath,
      logoMetrics,
      performance,
      samples,
      textContract,
    };
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
    await light.page.waitForTimeout(1_200);
    const lightSamples = [];
    for (const progress of [0, 0.5, 1]) lightSamples.push(await sampleAt(light.scrollport, progress));
    assert.equal(lightSamples.some((sample) => sample.materialSamples < 16), false, `${profile.id} light theme loses material`);
    assert.equal(lightSamples.some((sample) => sample.pointFinish !== 'cached-sphere-sticker'), false, `${profile.id} light theme loses the Home sphere finish`);
    assert.equal(lightSamples.some((sample) => sample.pointMaterialTheme !== 'light'), false, `${profile.id} light theme uses dark sphere lighting`);
    assert.deepEqual(light.errors, [], `${profile.id} light theme emitted browser errors`);
    report.compatibility[`${profile.id}-light`] = lightSamples;
    const lightFramePaths = [];
    for (const progress of [0, 0.62, 1]) {
      await sampleAt(light.scrollport, progress);
      const path = resolve(
        outputRoot,
        `${profile.id}-light-${String(Math.round(progress * 100)).padStart(3, '0')}.png`,
      );
      await light.page.screenshot({ path });
      lightFramePaths.push({ path, progress });
    }
    report.visuals[`${profile.id}-light`] = await createContactSheet(
      lightContext,
      profile,
      lightFramePaths,
      'light',
    );
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
    assert.equal(reducedSamples.some((sample) => sample.pointFinish !== 'cached-sphere-sticker'), false, `${profile.id} reduced motion loses the Home sphere finish`);
    assert.deepEqual(reduced.errors, [], `${profile.id} reduced motion emitted browser errors`);
    report.compatibility[`${profile.id}-reduced`] = reducedSamples;
    await reducedContext.close();
  }
} finally {
  await browser.close();
}

await writeFile(resolve(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`PASS: simplified About is populated, directly coupled, accessible, and coherent across desktop and mobile (${outputRoot})`);
