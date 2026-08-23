import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const browserType = browserName === 'webkit' ? webkit : chromium;
const outputDir = 'output/playwright/about-narrative-sectionless';
const canonical = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const canonicalTextFieldIds = canonical.tracks.text.fields.map((field) => field.id).sort();
const viewports = Object.freeze([
  Object.freeze({ label: 'desktop', viewport: { width: 1440, height: 1000 }, profile: 'desktop' }),
  Object.freeze({ label: 'tablet-portrait', viewport: { width: 820, height: 1180 }, profile: 'tablet' }),
  Object.freeze({ label: 'tablet-landscape', viewport: { width: 1180, height: 820 }, profile: 'tablet' }),
  Object.freeze({ label: 'mobile-portrait', viewport: { width: 390, height: 844 }, profile: 'mobile' }),
  Object.freeze({ label: 'mobile-landscape', viewport: { width: 844, height: 390 }, profile: 'mobile' }),
]);

await mkdir(outputDir, { recursive: true });
const browser = await browserType.launch(browserName === 'chromium' ? {
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
  ],
} : { headless: true });

function observeErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const sourceUrl = message.location().url || '';
    if (sourceUrl.startsWith('https://fonts.gstatic.com/')) return;
    errors.push(sourceUrl ? `${message.text()} @ ${sourceUrl}` : message.text());
  });
  return errors;
}

async function auditProduction({ viewport, label, profile }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = observeErrors(page);
  await page.goto(`${baseUrl}/about.html?preview=about`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(({ expectedProfile, fieldCount }) => {
    const root = document.querySelector('.about-narrative-lab');
    return root?.dataset.aboutSceneReady === 'true'
      && root.dataset.pointAsset === 'blender-surfel-v2'
      && root.dataset.worldStage === 'blender-surfel-scene'
      && root.dataset.aboutLayoutProfile === expectedProfile
      && document.querySelectorAll('[data-text-field-id]').length === fieldCount;
  }, { expectedProfile: profile, fieldCount: canonicalTextFieldIds.length }, { timeout: 120_000 });

  const initial = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const indicator = document.querySelector('.about-narrative-indicator');
    const canvas = document.querySelector('.about-narrative-world__canvas');
    return {
      canvasHeight: canvas.height,
      canvasWidth: canvas.width,
      fieldIds: [...document.querySelectorAll('[data-text-field-id]')]
        .map((node) => node.dataset.textFieldId)
        .sort(),
      indicatorCount: indicator.querySelectorAll('.about-narrative-indicator__line').length,
      indicatorLabel: indicator.getAttribute('aria-label'),
      indicatorRole: indicator.getAttribute('role'),
      layoutProfile: root.dataset.aboutLayoutProfile,
      pointAsset: root.dataset.pointAsset,
      scrollLabel: scrollport.getAttribute('aria-label'),
      scrollTabIndex: scrollport.tabIndex,
      semanticTextLength: root.textContent.replace(/\s+/gu, ' ').trim().length,
      stage: root.dataset.worldStage,
    };
  });
  assert.deepEqual(initial.fieldIds, canonicalTextFieldIds);
  assert.equal(initial.layoutProfile, profile);
  assert.equal(initial.pointAsset, 'blender-surfel-v2');
  assert.equal(initial.stage, 'blender-surfel-scene');
  assert(initial.canvasWidth > 0 && initial.canvasHeight > 0);
  assert.equal(initial.indicatorCount, 18);
  assert.equal(initial.indicatorRole, 'progressbar');
  assert.equal(initial.indicatorLabel, 'About page scroll progress');
  assert.equal(initial.scrollLabel, 'About Alexander narrative');
  assert.equal(initial.scrollTabIndex, 0);
  assert(initial.semanticTextLength > 500);

  const disciplineSampleWU = await page.locator('[data-text-field-id="text-discipline-labels"]').evaluate((node) => {
    const wrapper = node.closest('.about-narrative-render-span');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    return (wrapper.offsetTop / Math.max(1, scrollport.clientHeight)) + 0.25;
  });
  await page.locator('.about-narrative-scrollport').evaluate((node, storyWU) => {
    node.scrollTop = Math.min(
      node.scrollHeight - node.clientHeight,
      Math.max(0, storyWU * node.clientHeight),
    );
    node.dispatchEvent(new Event('scroll', { bubbles: false }));
  }, disciplineSampleWU);
  await page.waitForFunction((targetWU) => (
    Math.abs(Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - targetWU) < 0.05
  ), disciplineSampleWU);
  const discipline = await page.evaluate(() => {
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const viewport = scrollport.getBoundingClientRect();
    const field = document.querySelector('[data-text-field-id="text-discipline-labels"]');
    const items = [...field.querySelectorAll('.about-narrative-discipline-list li')];
    const visible = items.map((item) => item.getBoundingClientRect()).filter((rect) => (
      rect.bottom > viewport.top && rect.top < viewport.bottom
    ));
    const overlapPairs = [];
    visible.forEach((rect, index) => visible.slice(index + 1).forEach((other, offset) => {
      const separated = rect.right <= other.left + 1
        || other.right <= rect.left + 1
        || rect.bottom <= other.top + 1
        || other.bottom <= rect.top + 1;
      if (!separated) overlapPairs.push([index, index + offset + 1]);
    }));
    return {
      descriptions: [...field.querySelectorAll('.about-narrative-discipline-list__description')]
        .map((node) => node.textContent.trim()),
      itemCount: items.length,
      labelsWithinViewport: visible.every((rect) => rect.left >= viewport.left - 1 && rect.right <= viewport.right + 1),
      overlapPairs,
      visibleItemCount: visible.length,
    };
  });
  assert.equal(discipline.itemCount, 6);
  assert.equal(discipline.descriptions.length, 6);
  assert(discipline.descriptions.every(Boolean));
  assert(discipline.visibleItemCount > 0);
  assert.equal(discipline.labelsWithinViewport, true);
  assert.deepEqual(discipline.overlapPairs, []);

  await page.locator('.about-narrative-scrollport').evaluate((node) => {
    node.scrollTop = node.scrollHeight - node.clientHeight;
    node.dispatchEvent(new Event('scroll', { bubbles: false }));
  });
  await page.waitForFunction(() => (
    document.querySelector('.about-narrative-indicator')?.getAttribute('aria-valuenow') === '100'
  ));
  const finale = await page.evaluate(() => {
    const viewport = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
    const title = document.querySelector('[data-text-field-id="text-epilogue-invitation"] .about-narrative-spatial-title');
    const description = document.querySelector('[data-text-field-id="text-epilogue-invitation"] .about-narrative-finale-description');
    const emailAction = document.querySelector(
      '[data-text-field-id="text-epilogue-invitation"] [data-copy-email]',
    );
    const titleRect = title.getBoundingClientRect();
    const descriptionRect = description.getBoundingClientRect();
    const inside = (rect) => rect.top >= viewport.top - 1
      && rect.bottom <= viewport.bottom + 1
      && rect.left >= viewport.left - 1
      && rect.right <= viewport.right + 1;
    return {
      descriptionBelowTitle: descriptionRect.top >= titleRect.bottom - 2,
      emailActionLabel: emailAction?.getAttribute('aria-label') || '',
      emailActionType: emailAction?.getAttribute('type') || '',
      emailAddress: emailAction?.querySelector('.contact-email-text')?.textContent.trim() || '',
      indicatorText: document.querySelector('.about-narrative-indicator').getAttribute('aria-valuetext'),
      titleOpacity: Number(getComputedStyle(title).opacity),
      withinViewport: inside(titleRect) && inside(descriptionRect),
    };
  });
  assert.equal(finale.descriptionBelowTitle, true);
  assert.equal(finale.emailActionLabel, 'Copy email address');
  assert.equal(finale.emailActionType, 'button');
  assert.equal(finale.emailAddress, 'alexander@beck.fyi');
  assert.equal(finale.indicatorText, '100% through the About narrative');
  assert(finale.titleOpacity > 0.99);
  assert.equal(finale.withinViewport, true, `${label} finale leaves the studio viewport.`);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `${outputDir}/${browserName}-production-${label}.png` });
  await context.close();
}

try {
  for (const viewport of viewports) await auditProduction(viewport);
  console.log(`PASS: v2 About production preview passed ${browserName} desktop, tablet, and mobile route/editorial/accessibility checks.`);
} finally {
  await browser.close();
}
