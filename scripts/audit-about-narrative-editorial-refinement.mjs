import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER || 'chromium';
const browserType = browserName === 'webkit' ? webkit : chromium;
const outputDir = resolve('output/playwright/about-narrative-editorial-refinement');
const storyDurationWU = 22.795;
const aboutUrl = `${baseUrl}/about.html?edit=0`;

await mkdir(outputDir, { recursive: true });
const browser = await browserType.launch({ headless: true });

async function openAbout(viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(aboutUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-narrative-lab[data-world-prepare="ready"]', {
    timeout: 30_000,
  });
  return { context, errors, page };
}

async function setStoryWU(page, storyWU) {
  await page.locator('.about-narrative-scrollport').evaluate((node, input) => {
    const availableScroll = Math.max(0, node.scrollHeight - node.clientHeight);
    node.scrollTop = availableScroll * (input.storyWU / input.durationWU);
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, { durationWU: storyDurationWU, storyWU });
  try {
    await page.waitForFunction((target) => {
      const current = Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu);
      return Math.abs(current - target) < 0.04;
    }, storyWU, { timeout: 10_000 });
  } catch (error) {
    const state = await page.evaluate(() => {
      const root = document.querySelector('.about-narrative-lab');
      const scrollport = document.querySelector('.about-narrative-scrollport');
      return {
        clientHeight: scrollport?.clientHeight,
        scrollHeight: scrollport?.scrollHeight,
        scrollTop: scrollport?.scrollTop,
        storyWU: root?.dataset.narrativeStoryWu,
      };
    });
    throw new Error(`${error.message}; state=${JSON.stringify(state)}`);
  }
}

try {
  const desktop = await openAbout({ width: 1440, height: 1000 });
  const { page } = desktop;
  const initial = await page.evaluate(() => {
    const pullSentence = document.querySelector('.about-narrative-editorial-pull-sentence');
    const pullStyle = getComputedStyle(pullSentence);
    const prose = document.querySelector('.about-narrative-editorial-copy');
    const proseStyle = getComputedStyle(prose);
    const emphasis = Array.from(document.querySelectorAll('[data-editorial-emphasis]'));
    const logoField = document.querySelector('.about-narrative-client-field');
    return {
      emphasisCount: emphasis.length,
      emphasisOpacity: emphasis.map((node) => Number(getComputedStyle(node).opacity)),
      lineRevealCount: document.querySelectorAll('[data-editorial-reveal="line"]').length,
      logoCount: document.querySelectorAll('.about-narrative-client-logos > li').length,
      logoReady: logoField?.dataset.clientFieldReady,
      pullBorderBottom: pullStyle.borderBottomWidth,
      pullBorderTop: pullStyle.borderTopWidth,
      pullFontFamily: pullStyle.fontFamily,
      pullFontSize: Number.parseFloat(pullStyle.fontSize),
      pullFontStyle: pullStyle.fontStyle,
      pullLineHeight: Number.parseFloat(pullStyle.lineHeight),
      pullListItemCount: pullSentence?.querySelectorAll('li').length,
      pullTag: pullSentence?.tagName,
      proseFontSize: Number.parseFloat(proseStyle.fontSize),
      ruleCount: document.querySelectorAll('.about-narrative-opening-copy .route-title-lockup__rule, .about-narrative-finale-content .route-title-lockup__rule').length,
      wordRevealCount: document.querySelectorAll('[data-editorial-reveal="word"]').length,
    };
  });
  assert.equal(initial.pullTag, 'P');
  assert.equal(initial.pullListItemCount, 0);
  assert.equal(initial.pullBorderTop, '0px');
  assert.equal(initial.pullBorderBottom, '0px');
  assert.match(initial.pullFontFamily, /Instrument Serif/);
  assert.equal(initial.pullFontStyle, 'italic');
  assert.ok(initial.pullFontSize >= initial.proseFontSize * 2.35);
  assert.ok(initial.pullLineHeight <= initial.pullFontSize * 1.05);
  assert.equal(initial.emphasisCount, 15);
  initial.emphasisOpacity.forEach((opacity) => assert.equal(opacity, 0));
  assert.ok(initial.lineRevealCount > 0);
  assert.equal(initial.wordRevealCount, 0);
  assert.equal(initial.ruleCount, 2);
  assert.equal(initial.logoCount, 14);

  await page.waitForFunction(() => (
    document.querySelector('.about-narrative-client-field')?.dataset.clientFieldReady === 'true'
  ));
  await page.locator('.about-narrative-editorial-pull-sentence').first().evaluate((node) => {
    node.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(180);
  await page.screenshot({
    path: `${outputDir}/${browserName}-desktop-pull-sentence.png`,
  });

  await page.locator('.about-narrative-client-field').evaluate((node) => {
    node.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(180);
  const logoState = await page.evaluate(() => {
    const yoti = getComputedStyle(document.querySelector('[data-client-logo="yoti"]'));
    const standard = getComputedStyle(document.querySelector('[data-client-logo="sp-global"]'));
    return {
      standardScale: Number(standard.getPropertyValue('--client-logo-display-scale')),
      yotiScale: Number(yoti.getPropertyValue('--client-logo-display-scale')),
    };
  });
  assert.equal(logoState.standardScale, 0.94);
  assert.equal(logoState.yotiScale, 1.1);
  await page.screenshot({ path: `${outputDir}/${browserName}-desktop-logo-breath.png` });

  await page.goto(aboutUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-narrative-lab[data-world-prepare="ready"]', {
    timeout: 30_000,
  });
  await page.waitForTimeout(500);
  await setStoryWU(page, 20.43);
  assert.equal(await page.locator('[data-text-field-id="text-epilogue-invitation"] .about-narrative-finale-content').evaluate((node) => (
    getComputedStyle(node).visibility
  )), 'hidden');
  await page.screenshot({ path: `${outputDir}/${browserName}-desktop-bust-resolved.png` });

  await setStoryWU(page, 21.7);
  assert.equal(await page.locator('[data-text-field-id="text-epilogue-invitation"] .about-narrative-finale-content').evaluate((node) => (
    getComputedStyle(node).visibility
  )), 'visible');
  await setStoryWU(page, 22.4);
  await page.screenshot({ path: `${outputDir}/${browserName}-desktop-finale.png` });
  assert.deepEqual(desktop.errors, []);
  await desktop.context.close();

  const mobile = await openAbout({ width: 390, height: 844 });
  await mobile.page.waitForTimeout(1_500);
  const mobileLogoState = await mobile.page.evaluate(() => ({
    layoutProfile: document.querySelector('.about-narrative-lab')?.dataset.aboutLayoutProfile,
    openingOpacity: Number(getComputedStyle(
      document.querySelector('.about-narrative-opening-copy'),
    ).opacity),
    standardScale: Number(getComputedStyle(
      document.querySelector('[data-client-logo="sp-global"]'),
    ).getPropertyValue('--client-logo-display-scale')),
    storyWU: Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu),
    titleOpacity: Number(getComputedStyle(
      document.querySelector('#about-route-title'),
    ).opacity),
    yotiScale: Number(getComputedStyle(
      document.querySelector('[data-client-logo="yoti"]'),
    ).getPropertyValue('--client-logo-display-scale')),
  }));
  assert.equal(mobileLogoState.layoutProfile, 'mobile');
  assert.ok(mobileLogoState.openingOpacity > 0.9);
  assert.equal(mobileLogoState.standardScale, 0.92);
  assert.ok(mobileLogoState.storyWU < 0.04);
  assert.ok(mobileLogoState.titleOpacity > 0.9);
  assert.equal(mobileLogoState.yotiScale, 1.08);
  await mobile.page.screenshot({ path: `${outputDir}/${browserName}-mobile-opening.png` });
  assert.deepEqual(mobile.errors, []);
  await mobile.context.close();

  console.log(`About editorial refinement browser proof passed: ${outputDir}`);
} finally {
  await browser.close();
}
