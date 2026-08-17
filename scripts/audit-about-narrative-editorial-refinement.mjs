import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER || 'chromium';
const browserType = browserName === 'webkit' ? webkit : chromium;
const outputDir = resolve('output/playwright/about-narrative-editorial-refinement');
const aboutUrl = `${baseUrl}/about.html?edit=0`;

await mkdir(outputDir, { recursive: true });
const browser = await browserType.launch({ headless: true });

async function openAbout(viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const sourceUrl = message.location().url || '';
    // Google Fonts can rotate cached asset URLs independently of the app.
    // Keep application errors fatal while allowing the declared font fallback.
    if (sourceUrl.startsWith('https://fonts.gstatic.com/')) return;
    errors.push(sourceUrl ? `${message.text()} @ ${sourceUrl}` : message.text());
  });
  await page.goto(aboutUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-narrative-lab[data-world-prepare="ready"]', {
    timeout: 30_000,
  });
  await page.waitForFunction(() => (
    Number(getComputedStyle(document.querySelector('.about-narrative-opening-scroll-cue')).opacity) > 0.99
  ));
  return { context, errors, page };
}

async function setStoryWU(page, storyWU) {
  await page.locator('.about-narrative-scrollport').evaluate((node, value) => {
    node.scrollTop = Math.min(
      node.scrollHeight - node.clientHeight,
      Math.max(0, Number(value) * node.clientHeight),
    );
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, storyWU);
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

async function readFinaleTiming(page) {
  return page.locator('[data-text-field-id="text-epilogue-invitation"]').evaluate((node) => {
    const wrapper = node.closest('.about-narrative-render-span');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const viewportHeight = Math.max(1, scrollport.clientHeight);
    return {
      startWU: wrapper.offsetTop / viewportHeight,
      durationWU: Number.parseFloat(
        getComputedStyle(wrapper).getPropertyValue('--story-block-duration-wu'),
      ),
      pageEndWU: (scrollport.scrollHeight - scrollport.clientHeight) / viewportHeight,
    };
  });
}

try {
  const desktop = await openAbout({ width: 1440, height: 1000 });
  const { page } = desktop;
  const initial = await page.evaluate(() => {
    const openingCue = document.querySelector('.about-narrative-opening-scroll-cue');
    const openingCueRect = openingCue?.getBoundingClientRect();
    const scrollportRect = document.querySelector('.about-narrative-scrollport')?.getBoundingClientRect();
    const pullSentence = document.querySelector('.about-narrative-editorial-pull-sentence');
    const pullStyle = getComputedStyle(pullSentence);
    const prose = document.querySelector('.about-narrative-editorial-copy');
    const proseStyle = getComputedStyle(prose);
    const emphasis = Array.from(document.querySelectorAll('[data-editorial-emphasis]'));
    const lineReveals = Array.from(document.querySelectorAll('[data-editorial-reveal="line"]'));
    const spatialTitles = Array.from(document.querySelectorAll('.about-narrative-spatial-title'));
    const logoField = document.querySelector('.about-narrative-client-field');
    return {
      emphasisCount: emphasis.length,
      emphasisOpacity: emphasis.map((node) => Number(getComputedStyle(node).opacity)),
      lineRevealCount: lineReveals.length,
      lineRevealOpacity: lineReveals.map((node) => Number(getComputedStyle(node).opacity)),
      logoCount: document.querySelectorAll('.about-narrative-client-logos > li').length,
      logoReady: logoField?.dataset.clientFieldReady,
      openingCueArrowCount: openingCue?.querySelectorAll('[class*="ti-arrow"]').length,
      openingCueLabel: openingCue?.textContent?.replace(/\s+/gu, ' ').trim(),
      openingCueLineCount: openingCue?.querySelectorAll('.about-narrative-opening-scroll-cue__line').length,
      openingCueOpacity: Number(getComputedStyle(openingCue).opacity),
      openingCueState: document.querySelector('.about-narrative-lab')?.dataset.openingScrollCue,
      openingTitleOpacity: Number(getComputedStyle(document.querySelector('#about-route-title')).opacity),
      openingCueBottomGap: scrollportRect && openingCueRect
        ? scrollportRect.bottom - openingCueRect.bottom
        : 0,
      pullBorderBottom: pullStyle.borderBottomWidth,
      pullBorderTop: pullStyle.borderTopWidth,
      pullFontFamily: pullStyle.fontFamily,
      pullFontSize: Number.parseFloat(pullStyle.fontSize),
      pullFontStyle: pullStyle.fontStyle,
      pullTextAlign: pullStyle.textAlign,
      pullLineHeight: Number.parseFloat(pullStyle.lineHeight),
      pullListItemCount: pullSentence?.querySelectorAll('li').length,
      pullTag: pullSentence?.tagName,
      proseFontSize: Number.parseFloat(proseStyle.fontSize),
      ruleCount: document.querySelectorAll('.about-narrative-opening-copy .route-title-lockup__rule, .about-narrative-finale-content .route-title-lockup__rule').length,
      spatialTitleFilters: spatialTitles.map((node) => getComputedStyle(node).filter),
      spatialTitleShadows: spatialTitles.map((node) => getComputedStyle(node).textShadow),
      wordRevealCount: document.querySelectorAll('[data-editorial-reveal="word"]').length,
    };
  });
  assert.equal(initial.pullTag, 'P');
  assert.equal(initial.pullListItemCount, 0);
  assert.equal(initial.pullBorderTop, '0px');
  assert.equal(initial.pullBorderBottom, '0px');
  assert.match(initial.pullFontFamily, /Instrument Serif/);
  assert.equal(initial.pullFontStyle, 'normal');
  assert.equal(initial.pullTextAlign, 'center');
  assert.ok(initial.pullFontSize >= initial.proseFontSize * 2.35);
  assert.ok(initial.pullLineHeight <= initial.pullFontSize * 1.05);
  assert.equal(initial.emphasisCount, 0);
  initial.emphasisOpacity.forEach((opacity) => assert.equal(opacity, 0));
  assert.ok(initial.lineRevealCount > 0);
  initial.lineRevealOpacity.forEach((opacity) => assert.equal(opacity, 1));
  initial.spatialTitleFilters.forEach((filter) => assert.equal(filter, 'none'));
  initial.spatialTitleShadows.forEach((shadow) => assert.equal(shadow, 'none'));
  assert.equal(initial.wordRevealCount, 0);
  assert.equal(initial.ruleCount, 2);
  assert.equal(initial.logoCount, 14);
  assert.equal(initial.openingCueArrowCount, 0);
  assert.equal(initial.openingCueLabel, 'Scroll');
  assert.equal(initial.openingCueLineCount, 1);
  assert.ok(initial.openingCueOpacity > 0.99);
  assert.equal(initial.openingCueState, 'visible');
  assert.ok(initial.openingTitleOpacity > 0.99);
  assert.ok(initial.openingCueBottomGap >= 24 && initial.openingCueBottomGap <= 56);

  await page.locator('.about-narrative-scrollport').evaluate((node) => {
    node.scrollTop = 80;
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await page.waitForFunction(() => (
    Number(getComputedStyle(document.querySelector('.about-narrative-opening-scroll-cue')).opacity) < 0.01
  ));
  assert.equal(
    await page.locator('.about-narrative-lab').getAttribute('data-opening-scroll-cue'),
    'hidden',
  );

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
  const finaleTiming = await readFinaleTiming(page);
  await setStoryWU(page, finaleTiming.startWU + (finaleTiming.durationWU * 0.05));
  // The finale arrives through depth and position. Its type must never fade or
  // blur while the bust resolves behind it.
  assert.ok(await page.locator('[data-text-field-id="text-epilogue-invitation"] .about-narrative-spatial-title').evaluate((node) => (
    Number(getComputedStyle(node).opacity) >= 0.95
  )));
  await page.screenshot({ path: `${outputDir}/${browserName}-desktop-bust-resolved.png` });

  await setStoryWU(page, finaleTiming.startWU + (finaleTiming.durationWU * 0.5));
  assert.ok(await page.locator('[data-text-field-id="text-epilogue-invitation"] .about-narrative-spatial-title').evaluate((node) => (
    Number(getComputedStyle(node).opacity) >= 0.95
  )));
  await setStoryWU(page, finaleTiming.pageEndWU);
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
    openingCueBottom: document.querySelector('.about-narrative-opening-scroll-cue')?.getBoundingClientRect().bottom,
    openingCueOpacity: Number(getComputedStyle(
      document.querySelector('.about-narrative-opening-scroll-cue'),
    ).opacity),
    scrollportBottom: document.querySelector('.about-narrative-scrollport')
      ?.getBoundingClientRect().bottom,
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
  assert.ok(mobileLogoState.openingCueOpacity > 0.9);
  assert.ok(mobileLogoState.scrollportBottom - mobileLogoState.openingCueBottom >= 24);
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
