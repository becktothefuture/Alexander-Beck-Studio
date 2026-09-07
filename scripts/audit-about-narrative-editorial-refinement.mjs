import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import { driveAboutStoryWU as holdAboutStoryWU } from './audit-about-narrative-surfel-v2-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER || 'chromium';
const outputDir = resolve(process.env.ABS_ABOUT_EDITORIAL_OUTPUT || 'output/playwright/about-narrative-editorial-refinement', browserName);
const viewportFilter = process.env.ABS_ABOUT_VIEWPORT;
const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['tablet', { width: 1024, height: 768 }],
  ['mobile', { width: 390, height: 844 }],
  ['narrow-mobile', { width: 375, height: 667 }],
  ['short-landscape', { width: 844, height: 390 }],
].filter(([id]) => !viewportFilter || id === viewportFilter);
async function driveAboutStoryWU(page, target) {
  await page.evaluate(value => {
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const duration = Math.max(...Array.from(document.querySelectorAll('[data-render-span-id]'), node => Number(node.dataset.storyEndWu)));
    scrollport.scrollTop = Math.min(1, Math.max(0, value / duration)) * (scrollport.scrollHeight - scrollport.clientHeight);
    scrollport.dispatchEvent(new Event('scroll'));
  }, target);
  try {
    await page.waitForFunction(value => Math.abs(Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - value) < 0.035,
      target, { timeout: 3000 });
  } catch {
    // A pending Lenis destination can need several held frames to synchronise.
    await holdAboutStoryWU(page, target);
  }
}

const report = [];
await mkdir(outputDir, { recursive: true });
const browser = await (browserName === 'webkit' ? webkit : chromium).launch({ headless: true, ...(browserName === 'chromium' && process.env.ABS_CHROMIUM_CHANNEL ? { channel: process.env.ABS_CHROMIUM_CHANNEL } : {}) });
try {
  for (const [id, viewport] of viewports) {
    for (const theme of ['light', 'dark']) {
      const reducedMotion = id === 'mobile' && theme === 'dark' ? 'reduce' : 'no-preference';
      const context = await browser.newContext({ viewport, colorScheme: theme, reducedMotion });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.pointWorldState === 'ready');
      console.log(`READY ${id} ${theme}`);
      await page.waitForFunction(() => document.fonts.status === 'loaded', undefined, { timeout: 15000 });
      await page.waitForTimeout(600);
      const layout = await page.evaluate(() => {
        const root = document.querySelector('.about-narrative-lab');
        const scroll = document.querySelector('.about-narrative-scrollport');
        const fields = [...document.querySelectorAll('[data-render-span-id]')].map(node => ({
          id: node.querySelector('[data-text-field-id]').dataset.textFieldId,
          start: Number(node.dataset.storyStartWu), end: Number(node.dataset.storyEndWu),
          title: Boolean(node.querySelector('h1, .about-narrative-spatial-title')),
          physicalStart: node.offsetTop / scroll.clientHeight,
          resolvedStart: Number.parseFloat(getComputedStyle(node).getPropertyValue('--render-span-start-wu')),
        }));
        const prose = document.querySelector('.about-narrative-editorial-copy');
        const titles = [...document.querySelectorAll('.about-narrative-spatial-title, #about-route-title')];
        const sizes = [prose, ...titles].map(node => Number.parseFloat(getComputedStyle(node).fontSize));
        root.style.setProperty('--about-prose-scale', 1);
        root.style.setProperty('--about-title-scale', 1);
        root.style.setProperty('--about-intermediate-title-multiplier', 1);
        const baselineSizes = [prose, ...titles].map(node => Number.parseFloat(getComputedStyle(node).fontSize));
        root.style.removeProperty('--about-prose-scale');
        root.style.removeProperty('--about-title-scale');
        root.style.removeProperty('--about-intermediate-title-multiplier');
        return {
          fields, sizes, baselineSizes,
          eyebrows: [...document.querySelectorAll('.about-narrative-editorial-eyebrow')].map(node => node.textContent),
          paragraphGap: Number.parseFloat(getComputedStyle(document.querySelector('.about-narrative-editorial-stack')).rowGap),
          listSeparation: Number.parseFloat(getComputedStyle(document.querySelector('.about-narrative-career-sequence')).marginBlockStart),
          standardTitleMeasure: getComputedStyle(root).getPropertyValue('--about-title-standard-max-width').trim(),
          intermediateTitles: titles.map(node => !node.classList.contains('route-centered-page__title')),
          maxScroll: (scroll.scrollHeight - scroll.clientHeight) / scroll.clientHeight,
          overflow: scroll.scrollWidth - scroll.clientWidth,
          titlePositions: [...document.querySelectorAll('[data-title-viewport-y]')].map(node => node.dataset.titleViewportY),
          wordCount: document.querySelectorAll('[data-editorial-reveal="word"]').length,
          atomicCount: document.querySelectorAll('[data-editorial-atomic-row="true"]').length,
        };
      });
      // Preserve the authored mapping while content measurement makes room for
      // paragraph spacing and labels. Extra space must be measured content.
      const expectedScroll = layout.fields.at(-1).end * 8.8 / 35;
      assert.ok(Math.abs(layout.maxScroll - expectedScroll) < 0.01, `${id}: measured scroll mapping drift`);
      const methodTitle = layout.fields.find(field => field.id === 'text-life-momentum');
      const methodProse = layout.fields.find(field => field.id === 'text-life-character');
      const methodGapScreens = (methodProse.start - methodTitle.end) * layout.maxScroll / layout.fields.at(-1).end;
      assert.ok(methodGapScreens >= 0.59, `${id}: working-method title gap ${methodGapScreens}`);
      assert.ok(layout.maxScroll >= 8.79 && layout.maxScroll <= 14, `${id}: ${layout.maxScroll} physical viewports`);
      assert.equal(layout.standardTitleMeasure, '12ch');
      assert.deepEqual(layout.eyebrows, ['My background', 'How I work']);
      assert.ok(layout.paragraphGap >= (viewport.width <= 900 ? 32 : 40), `${id}: paragraph spacing too dense`);
      assert.ok(layout.listSeparation >= 24, `${id}: missing extra break before listings`);
      assert.ok(layout.overflow <= 1, `${id}: horizontal overflow`);
      layout.fields.forEach(field => assert.ok(Math.abs(field.physicalStart - field.resolvedStart) < 0.004, `${id}: ${field.id} physical drift`));
      assert.ok(layout.titlePositions.every(value => value === '50'));
      assert.equal(layout.wordCount, 0);
      assert.ok(layout.atomicCount >= 20);
      assert.ok(Math.abs(layout.sizes[0] / layout.baselineSizes[0] - (['mobile', 'narrow-mobile'].includes(id) ? 1.16 : 1.18)) < 0.001, `${id}: prose scale`);
      const mainSizes = layout.sizes.slice(1).filter((_, index) => !layout.intermediateTitles[index]);
      const intermediateSizes = layout.sizes.slice(1).filter((_, index) => layout.intermediateTitles[index]);
      assert.equal(new Set(mainSizes).size, 1, `${id}: opening/ending title parity`);
      assert.equal(new Set(intermediateSizes).size, 1, `${id}: one inbetween title size`);
      assert.ok(intermediateSizes.every(size => size < mainSizes[0]), `${id}: title hierarchy`);
      console.log(`LAYOUT ${id}: ${layout.maxScroll.toFixed(2)} viewports`);
      const duration = layout.fields.at(-1).end;
      const titleStates = [];
      for (const field of layout.fields.filter(field => field.title)) {
        console.log(`TITLE ${field.id}`);
        const next = layout.fields[layout.fields.indexOf(field) + 1];
        await driveAboutStoryWU(page, field.start + (field.end - field.start) * (next && !next.title ? 0.05 : 0.5));
        await page.waitForTimeout(650);
        const state = await page.locator(`[data-text-field-id="${field.id}"]`).evaluate(node => {
          const title = node.querySelector('h1, .about-narrative-spatial-title');
          const rect = title.getBoundingClientRect();
          const studio = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
          return {
            centreError: (rect.top + rect.bottom - studio.top - studio.bottom) / 2,
            opacity: Number(getComputedStyle(node).getPropertyValue('--fragment-opacity')),
            width: rect.width, studioWidth: studio.width,
            transparentGlyphs: [...title.querySelectorAll('[data-route-enter-glyph]')]
              .filter(glyph => ['transparent', 'rgba(0, 0, 0, 0)'].includes(getComputedStyle(glyph).color)).length,
          };
        });
        assert.ok(Math.abs(state.centreError) <= 45, `${id}: ${field.id} centre error ${state.centreError}px`);
        assert.ok(state.opacity > 0.99, `${id}: ${field.id} never focused`);
        assert.ok(state.width <= state.studioWidth);
        assert.equal(state.transparentGlyphs, 0, `${id}: ${field.id} left glyphs transparent`);
        titleStates.push({ id: field.id, ...state });
        if (['text-complexity-idea', 'text-life-momentum', 'text-epilogue-thinking'].includes(field.id)) {
          await page.screenshot({ path: `${outputDir}/${id}-${theme}-${field.id}.png` });
        }
      }
      const reveals = [];
      for (const kind of ['line', 'heading', 'career-row', 'logo', 'discipline']) {
        const node = page.locator(`[data-editorial-reveal="${kind}"]`).first();
        const samples = [];
        for (const y of kind === 'line' ? [0.9, 0.64, 0.60, 0.5, 0.24, 0.20, 0.1, 0.24, 0.5, 0.64] : [0.9, 0.5, 0.1, 0.5]) {
          const story = await node.evaluate((element, viewportY) => {
            const scroll = document.querySelector('.about-narrative-scrollport');
            const top = element.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop;
            const end = Number(document.querySelector('[data-text-field-id="text-epilogue-invitation"]').closest('[data-render-span-id]').dataset.storyEndWu);
            return (top - viewportY * scroll.clientHeight) / (scroll.scrollHeight - scroll.clientHeight) * end;
          }, y);
          await driveAboutStoryWU(page, story);
          samples.push(await node.evaluate(element => Number(getComputedStyle(element).opacity)));
        }
        if (reducedMotion === 'reduce') samples.forEach(value => assert.equal(value, 1));
        else {
          assert.deepEqual(samples, kind === 'line' ? [0.2, 0.2, 1, 1, 1, 0.2, 0.2, 1, 1, 0.2] : [0.2, 1, 0.2, 1], `${id}: ${kind} must snap at both reading-band edges and reverse exactly`);
        }
        reveals.push({ kind, samples });
        if (kind === 'line') {
          const target = layout.fields.find(field => field.id === 'text-background-unit');
          await driveAboutStoryWU(page, target.start + (target.end - target.start) * 0.2);
          await page.screenshot({ path: `${outputDir}/${id}-${theme}-reading.png` });
        }
      }
      for (const label of await page.locator('.about-narrative-editorial-eyebrow').all()) {
        const labelPosition = await label.evaluate(element => {
          const scroll = document.querySelector('.about-narrative-scrollport');
          const top = element.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop;
          const end = Math.max(...[...document.querySelectorAll('[data-render-span-id]')].map(span => Number(span.dataset.storyEndWu)));
          return { id: element.id, story: (top - 0.35 * scroll.clientHeight) / (scroll.scrollHeight - scroll.clientHeight) * end };
        });
        await driveAboutStoryWU(page, labelPosition.story);
        assert.equal(await label.evaluate(element => Number(getComputedStyle(element).opacity)), 1);
        await page.screenshot({ path: `${outputDir}/${id}-${theme}-${labelPosition.id}.png` });
      }
      await driveAboutStoryWU(page, duration);
      const finale = await page.locator('.about-narrative-finale-actions').evaluate(node => {
        const rect = node.getBoundingClientRect();
        const studio = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
        const bar = document.querySelector('[data-button-bar]')?.getBoundingClientRect();
        return { inert: node.inert, bottom: rect.bottom, limit: Math.min(studio.bottom, bar?.top ?? studio.bottom), top: rect.top, studioTop: studio.top };
      });
      assert.equal(finale.inert, false);
      assert.ok(finale.top >= finale.studioTop && finale.bottom <= finale.limit + 1, `${id}: CTA clearance ${JSON.stringify(finale)}`);
      const action = page.locator('.about-narrative-finale-actions button').first();
      await action.focus();
      assert.equal(await action.evaluate(node => node === document.activeElement), true);
      // Capture the resting endpoint after the title's bounded colour-draw entrance.
      await page.waitForTimeout(650);
      const finalTitle = await page.locator('[data-text-field-id="text-epilogue-invitation"]').evaluate(node => ({
        opacity: Number(getComputedStyle(node).getPropertyValue('--fragment-opacity')),
        transparentGlyphs: [...node.querySelectorAll('[data-route-enter-glyph]')]
          .filter(glyph => getComputedStyle(glyph).color === 'rgba(0, 0, 0, 0)').length,
      }));
      assert.ok(finalTitle.opacity > 0.99, `${id}: focused CTA hides final title`);
      assert.equal(finalTitle.transparentGlyphs, 0, `${id}: focused CTA leaves final title staged`);
      await page.screenshot({ path: `${outputDir}/${id}-${theme}-finale.png` });
      const target = duration * 0.4;
      await driveAboutStoryWU(page, target);
      await page.setViewportSize({ width: viewport.width + 24, height: viewport.height + 16 });
      await page.waitForTimeout(400);
      const restored = await page.locator('.about-narrative-lab').getAttribute('data-narrative-story-wu');
      assert.ok(Math.abs(Number(restored) - target) < 0.05, `${id}: resize changed Story position`);
      await page.waitForFunction(() => !window.__aboutNarrativeRuntime || window.__aboutNarrativeRuntime.getMetrics().state === 'ready');
      const metrics = await page.evaluate(() => window.__aboutNarrativeRuntime?.getMetrics());
      if (metrics) {
        assert.equal(metrics.gpuBufferBuilds, 1);
        assert.equal(metrics.gpuBufferIdentityStable, true);
      }
      assert.deepEqual(errors, []);
      report.push({ id, theme, reducedMotion, ...layout, titleStates, reveals, finale });
      console.log(`PASS ${browserName} ${id} ${theme}: ${layout.maxScroll.toFixed(2)} viewports`);
      await context.close();
    }
  }
} finally {
  await writeFile(`${outputDir}/report${viewportFilter ? `-${viewportFilter}` : ''}.json`, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
