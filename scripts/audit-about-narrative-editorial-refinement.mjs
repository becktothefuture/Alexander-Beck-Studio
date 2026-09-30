import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { captureAboutDistantOverlapReview, driveAboutStoryWU as positionAboutStoryWU,
  getAboutSurfelState, launchAboutAuditBrowser } from './audit-about-narrative-surfel-v2-helpers.mjs';
import { assertAboutFinaleInitialVisibility } from './audit-about-unified-journey.mjs';

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
assert.ok(['chromium', 'webkit'].includes(browserName), `Unknown browser: ${browserName}`);
assert.ok(viewports.length, `No matching ABS_ABOUT_VIEWPORT: ${viewportFilter}`);
const intermediateFieldIds = ['text-complexity-curiosity', 'text-complexity-listen',
  'text-disciplines-title', 'text-life-momentum'];
const projections = new WeakMap();
async function driveAboutStoryWU(page, target) {
  // The shared fixture writes once and rejects a competing Lenis owner. Do not
  // pin repeated frames: that can hide an actual delayed scroll reset.
  await positionAboutStoryWU(page, target);
  const projection = await page.evaluate(() => window.__aboutNarrativeRuntime.getMotionSnapshot().cameraProjection);
  assert.equal(projection.length, 16, 'The active camera must expose its projection matrix.');
  assert.ok(projection.every(Number.isFinite));
  const firstProjection = projections.get(page);
  if (firstProjection) assert.ok(projection.every((value, index) => Math.abs(value - firstProjection[index]) < 0.000001),
    'The authored lens or sensor offset changed during travel in one viewport.');
  else projections.set(page, projection);
}

async function readTitleState(page, fieldId) {
  return page.locator(`[data-text-field-id="${fieldId}"]`).evaluate(node => {
    const title = node.querySelector('h1, .about-narrative-spatial-title');
    const rect = title.getBoundingClientRect();
    const studio = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
    return {
      centreError: (rect.top + rect.bottom - studio.top - studio.bottom) / 2,
      horizontalCentreError: (rect.left + rect.right - studio.left - studio.right) / 2,
      opacity: Number(getComputedStyle(node).getPropertyValue('--fragment-opacity')),
      width: rect.width, studioWidth: studio.width,
      colorDraw: title.hasAttribute('data-about-title-draw'),
      routeEntrance: title.dataset.routeEnter || null,
      transparentGlyphs: [...title.querySelectorAll('[data-route-enter-glyph]')]
        .filter(glyph => ['transparent', 'rgba(0, 0, 0, 0)'].includes(getComputedStyle(glyph).color)).length,
    };
  });
}

const report = [];
const obstructions = [];
const readingSamples = [];
const distantOverlapReviews = [];
let auditCompleted = false;
await mkdir(outputDir, { recursive: true });
const browser = await launchAboutAuditBrowser(browserName);
try {
  for (const [id, viewport] of viewports) {
    for (const theme of ['light', 'dark']) {
      const reducedMotion = id === 'mobile' && theme === 'dark' ? 'reduce' : 'no-preference';
      const context = await browser.newContext({ viewport, colorScheme: theme, reducedMotion });
      await context.addInitScript(value => localStorage.setItem('theme-preference-v3', value), theme);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
      // Only rendered DOM and the exposed runtime are read here. No browser
      // import of /src is needed, so ABS_BASE_URL can target a static preview.
      await page.waitForFunction(() => {
        const root = document.querySelector('.about-narrative-lab');
        return root?.dataset.pointWorldState === 'ready'
          && root.dataset.aboutEntranceState === 'complete'
          && (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
          && typeof window.__aboutNarrativeRuntime?.getMotionSnapshot === 'function';
      }, undefined, { timeout: 120000 });
      console.log(`READY ${id} ${theme}`);
      await page.waitForFunction(() => document.fonts.status === 'loaded', undefined, { timeout: 15000 });
      await page.waitForFunction(() => !document.querySelector('.about-narrative-opening-copy')
        .getAnimations({ subtree: true }).some(animation => animation.playState === 'running'));
      await driveAboutStoryWU(page, 0);
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
        const opening = document.querySelector('.about-narrative-opening-copy').getBoundingClientRect();
        const studio = scroll.getBoundingClientRect();
        return {
          fields, sizes,
          validation: root.dataset.aboutLayoutValidation,
          diagnostics: root.dataset.aboutLayoutDiagnostics || null,
          measuredDurationWU: Number(root.dataset.aboutMeasuredDurationWu),
          opening: {
            centreErrorX: (opening.left + opening.right - studio.left - studio.right) / 2,
            centreErrorY: (opening.top + opening.bottom - studio.top - studio.bottom) / 2,
            top: opening.top, bottom: opening.bottom,
            studioTop: studio.top, studioBottom: studio.bottom,
          },
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
      assert.equal(layout.validation, 'valid', `${id}: ${layout.diagnostics}`);
      assert.ok(Math.abs(layout.measuredDurationWU - layout.fields.at(-1).end) < 0.000001,
        `${id}: measured reflow must replace the previous runtime plan`);
      assert.ok(Math.abs(layout.maxScroll - expectedScroll) < 0.01, `${id}: measured scroll mapping drift`);
      assert.ok(layout.maxScroll >= 10, `${id}: missing reading/travel space`);
      if (id === 'desktop') assert.ok(layout.maxScroll >= 12 && layout.maxScroll <= 14,
        `${id}: desktop journey must stay within12–14 viewport lengths: ${layout.maxScroll}`);
      assert.equal(layout.standardTitleMeasure, '12ch');
      assert.deepEqual(layout.eyebrows, ['My background', 'How I work']);
      assert.ok(layout.paragraphGap >= (viewport.width <= 900 ? 32 : 40), `${id}: paragraph spacing too dense`);
      assert.ok(layout.listSeparation >= 24, `${id}: missing extra break before listings`);
      assert.ok(layout.overflow <= 1, `${id}: horizontal overflow`);
      assert.ok(Math.abs(layout.opening.centreErrorX) <= 1
        && Math.abs(layout.opening.centreErrorY) <= 1, `${id}: opening lockup is not centred`);
      assert.ok(layout.opening.top >= layout.opening.studioTop - 1
        && layout.opening.bottom <= layout.opening.studioBottom + 1, `${id}: opening lockup is clipped`);
      layout.fields.forEach(field => assert.ok(Math.abs(field.physicalStart - field.resolvedStart) < 0.004, `${id}: ${field.id} physical drift`));
      assert.ok(layout.titlePositions.every(value => value === '50'));
      assert.equal(layout.wordCount, 0);
      assert.ok(layout.atomicCount >= 20);
      const proseRange = viewport.width <= 900 ? [17, 18] : [20, 22];
      assert.ok(layout.sizes[0] >= proseRange[0] - 0.01
        && layout.sizes[0] <= proseRange[1] + 0.01, `${id}: prose size ${layout.sizes[0]}`);
      const mainSizes = layout.sizes.slice(1).filter((_, index) => !layout.intermediateTitles[index]);
      const intermediateSizes = layout.sizes.slice(1).filter((_, index) => layout.intermediateTitles[index]);
      assert.equal(mainSizes.length, 2, `${id}: both bookends must be present`);
      assert.equal(intermediateSizes.length, 4, `${id}: all four intermediate titles must be present`);
      if (id === 'short-landscape') {
        assert.ok(mainSizes[0] >= 56 && mainSizes[0] <= 64,
          `${id}: the complete opening must use the approved short-screen type role`);
        assert.ok(intermediateSizes.every(size => size >= 40 && size <= 48),
          `${id}: held intermediate titles must keep the approved short-screen type role`);
        assert.ok(mainSizes.at(-1) >= 24 && mainSizes.at(-1) <= 48,
          `${id}: the compact invitation must leave room for its actions`);
      } else {
        const expectedFinaleRatio = viewport.width >= 901 ? 0.84 : 1;
        assert.ok(Math.abs(mainSizes[1] / mainSizes[0] - expectedFinaleRatio) < 0.001,
          `${id}: the invitation must use its approved responsive type ratio (${expectedFinaleRatio})`);
      }
      assert.equal(new Set(intermediateSizes).size, 1, `${id}: one inbetween title size`);
      assert.ok(intermediateSizes.every(size => size < mainSizes[0]), `${id}: title hierarchy`);
      if (id === 'desktop') {
        assert.ok(mainSizes[0] >= 96 && mainSizes[0] <= 112, `${id}: opening type target`);
        assert.ok(intermediateSizes.every(size => size >= 72 && size <= 88), `${id}: intermediate type target`);
      } else if (id === 'mobile') {
        assert.ok(mainSizes[0] >= 56 && mainSizes[0] <= 64, `${id}: opening type target`);
        assert.ok(intermediateSizes.every(size => size >= 40 && size <= 48), `${id}: intermediate type target`);
      }
      console.log(`LAYOUT ${id}: ${layout.maxScroll.toFixed(2)} viewports`);
      const duration = layout.fields.at(-1).end;
      const selectedCopyLength = await page.locator('.about-narrative-editorial-copy').first().evaluate(node => {
        const selection = getSelection();
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges(); selection.addRange(range);
        const length = selection.toString().length;
        selection.removeAllRanges();
        return length;
      });
      assert.ok(selectedCopyLength > 50, `${id}: narrative prose must be selectable`);
      const readingClearance = [];
      for (const field of layout.fields.filter(field => !field.title)) {
        for (const fraction of [0.2, 0.5, 0.8]) {
          await driveAboutStoryWU(page, field.start + (field.end - field.start) * fraction);
          const state = await getAboutSurfelState(page, { fieldId: field.id, marginPx: 8 });
          const protection = state.copyProtection;
          const sample = { id, theme, fieldId: field.id, fraction, protection };
          readingSamples.push(sample);
          assert.equal(protection.nearDiagnosticsAvailable, true,
            `${id}: ${field.id} lacks valid active-renderer near-material diagnostics`);
          assert.ok(Object.values(protection.protectedNearCriteria).length > 0
            && Object.values(protection.protectedNearCriteria).every(criteria =>
              Number.isFinite(criteria?.unfoggedDepthWU) && criteria.minimumBallRadiusPx === 2),
          `${id}: the renderer has no valid near-material criteria`);
          assert.equal(protection.utilityRailOverlapCount, 0,
            `${id}: ${field.id} prose is covered by the utility rail`);
          readingClearance.push({ fieldId: field.id, fraction, protection });
          const screenshotPath = `${outputDir}/${id}-${theme}-${field.id}-${fraction}.png`;
          const distantReview = await captureAboutDistantOverlapReview(page, { state,
            id: `${id}-${theme}-${field.id}-${fraction}`, fieldId: field.id, screenshotPath });
          if (distantReview) distantOverlapReviews.push(distantReview);
          else await page.screenshot({ path: screenshotPath, animations: 'allow' });
          if (protection.maximumProtectedNearVisibleCount > 0) {
            await writeFile(`${outputDir}/${id}-${theme}-reading-obstruction.json`, JSON.stringify(sample, null, 2));
            obstructions.push({ ...sample, nearPoints: protection.maximumProtectedNearVisibleCount,
              allDepthPoints: protection.maximumProtectedVisibleCount });
          }
        }
        assert.ok(readingClearance.some(sample => sample.fieldId === field.id && sample.protection.regions.length > 0),
          `${id}: ${field.id} never reached a painted reading checkpoint`);
      }
      const titleHandoffs = [];
      for (let index = 1; index < layout.fields.length; index += 1) {
        const previous = layout.fields[index - 1];
        const incoming = layout.fields[index];
        if (!previous.title || incoming.title) continue;
        for (const fraction of [0.82, 0.97, 0.999]) {
          await driveAboutStoryWU(page, previous.start + (previous.end - previous.start) * fraction);
          const bounds = await page.evaluate(({ previousId, incomingId }) => {
            const titleField = document.querySelector(`[data-text-field-id="${previousId}"]`);
            const title = titleField.querySelector('.about-narrative-opening-copy')
              || titleField.querySelector('h1,h2');
            const held = title.getBoundingClientRect();
            const prose = document.querySelector(`[data-text-field-id="${incomingId}"]`).getBoundingClientRect();
            const studio = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
            return { gapPx: prose.top - held.bottom, studioHeight: studio.height,
              titleCentreError: (held.top + held.bottom - studio.top - studio.bottom) / 2,
              proseVisible: prose.top < studio.bottom };
          }, { previousId: previous.id, incomingId: incoming.id });
          assert.ok(bounds.gapPx >= bounds.studioHeight * 0.06 - 1,
            `${id}: ${previous.id} complete held title/group intersects incoming prose at ${fraction}`);
          assert.ok(Math.abs(bounds.titleCentreError) <= 1,
            `${id}: ${previous.id} moved to accommodate prose`);
          titleHandoffs.push({ previousId: previous.id, incomingId: incoming.id, fraction, ...bounds });
        }
      }
      const titleStates = [];
      for (const field of layout.fields.filter(field => field.title)) {
        console.log(`TITLE ${field.id}`);
        await driveAboutStoryWU(page, field.start + (field.end - field.start) * 0.5);
        await page.waitForTimeout(650);
        const state = await readTitleState(page, field.id);
        assert.ok(state.opacity > 0.99, `${id}: ${field.id} never focused`);
        assert.ok(state.width <= state.studioWidth);
        assert.equal(state.transparentGlyphs, 0, `${id}: ${field.id} left glyphs transparent`);
        if (['text-complexity-curiosity', 'text-life-momentum', 'text-epilogue-invitation'].includes(field.id)) {
          await page.screenshot({ path: `${outputDir}/${id}-${theme}-${field.id}.png` });
        }
        const lifecycle = [];
        if (field.id === 'text-promise-main') {
          assert.equal(state.routeEntrance, 'identity', `${id}: the opener must share route entrance ownership`);
          assert.equal(state.colorDraw, false, `${id}: the opener has two independent entrance owners`);
        }
        if (!['text-promise-main', 'text-epilogue-invitation'].includes(field.id)) {
          assert.equal(state.colorDraw, true, `${id}: ${field.id} lost the shared colour draw`);
          for (const fraction of [0.02, 0.2, 0.5, 0.8, 0.9, 0.97, 1.02, 0.97, 0.5, 0.2]) {
            await driveAboutStoryWU(page, field.start + (field.end - field.start) * fraction);
            const sample = await readTitleState(page, field.id);
            lifecycle.push({ fraction, ...sample });
            if (fraction < 1) {
              assert.ok(Math.abs(sample.centreError) <= 1 && Math.abs(sample.horizontalCentreError) <= 1,
                `${id}: ${field.id} moved from its viewport anchor at ${fraction}: ${JSON.stringify(sample)}`);
            } else assert.equal(sample.opacity, 0, `${id}: ${field.id} remains visible after its exit`);
          }
          assert.equal(lifecycle[0].opacity, 1, `${id}: ${field.id} never entered fully`);
          assert.equal(lifecycle[3].opacity, 1, `${id}: ${field.id} does not share the stable hold`);
          if (reducedMotion === 'reduce') {
            assert.equal(lifecycle[5].opacity, 1, `${id}: reduced-motion title faded`);
          } else {
            assert.ok(lifecycle[3].opacity > lifecycle[4].opacity
              && lifecycle[4].opacity > lifecycle[5].opacity, `${id}: title does not disappear in place`);
          }
          for (const [forwardIndex, reverseIndex] of [[5, 7], [2, 8], [1, 9]]) {
            assert.ok(Math.abs(lifecycle[forwardIndex].opacity - lifecycle[reverseIndex].opacity) <= 0.01,
              `${id}: ${field.id} opacity does not reverse at ${lifecycle[forwardIndex].fraction}`);
          }
        }
        titleStates.push({ id: field.id, ...state, lifecycle });
      }
      const intermediateStates = titleStates.filter(state => intermediateFieldIds.includes(state.id));
      assert.deepEqual(intermediateStates.map(state => state.id), intermediateFieldIds);
      for (const state of intermediateStates.slice(1)) {
        state.lifecycle.forEach((sample, index) => assert.ok(
          Math.abs(sample.opacity - intermediateStates[0].lifecycle[index].opacity) <= 0.01,
          `${id}: ${state.id} uses a different enter/hold/exit lifecycle`,
        ));
      }
      const reveals = [];
      for (const kind of ['paragraph', 'heading', 'career-row', 'logo', 'discipline']) {
        const node = page.locator(`[data-editorial-reveal="${kind}"]`).first();
        const samples = [];
        for (const y of kind === 'paragraph' ? [0.9, 0.64, 0.60, 0.5, 0.24, 0.20, 0.1, 0.24, 0.5, 0.64] : [0.9, 0.5, 0.1, 0.5]) {
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
          assert.ok(samples.every(value => value >= 0.88 && value <= 1), `${id}: ${kind} became dim while readable`);
          assert.equal(samples[3], 1, `${id}: settled reading content must remain fully opaque`);
        }
        reveals.push({ kind, samples });
        if (kind === 'paragraph') {
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
      await page.waitForFunction(() => {
        const actions = document.querySelector('.about-narrative-finale-actions');
        return actions && !actions.inert && actions.getAttribute('aria-hidden') !== 'true';
      });
      const finalCamera = await page.evaluate(() => window.__aboutNarrativeRuntime.getMotionSnapshot());
      assert.equal(finalCamera.cameraLocked, true, `${id}: the camera must stop at the invitation`);
      const finale = await page.locator('.about-narrative-finale-actions').evaluate(node => {
        const rect = node.getBoundingClientRect();
        const studio = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
        const bar = document.querySelector('[data-button-bar]')?.getBoundingClientRect();
        const copy = node.closest('[data-about-finale-copy]');
        const clip = copy.getBoundingClientRect();
        const scene = document.querySelector('[data-about-finale-scene-zone]').getBoundingClientRect();
        return { inert: node.inert, bottom: rect.bottom, limit: Math.min(studio.bottom, bar?.top ?? studio.bottom),
          top: rect.top, studioTop: studio.top, studioLeft: studio.left, studioRight: studio.right,
          copyTop: clip.top, copyBottom: clip.bottom, copyOverflow: copy.scrollHeight - copy.clientHeight,
          copyHorizontalOverflow: copy.scrollWidth - copy.clientWidth, sceneTop: scene.top,
          initialActions: [...node.querySelectorAll('button, a')].map(action => {
            const bounds = action.getBoundingClientRect();
            return { label: action.getAttribute('aria-label') || action.textContent.trim(),
              top: bounds.top, bottom: bounds.bottom };
          }) };
      });
      assert.equal(finale.inert, false);
      assert.ok(finale.copyTop >= finale.studioTop - 1 && finale.copyBottom <= finale.limit + 1,
        `${id}: the finale reading viewport is clipped: ${JSON.stringify(finale)}`);
      assert.ok(finale.copyBottom <= finale.sceneTop + 1, `${id}: the invitation left its reserved sky region`);
      assert.ok(finale.copyHorizontalOverflow <= 1, `${id}: the finale creates horizontal overflow`);
      assertAboutFinaleInitialVisibility({ ...finale, actions: finale.initialActions });
      const copy = page.locator('[data-about-finale-copy]');
      await copy.focus();
      finale.keyboardReading = await copy.evaluate(node => ({
        focused: node === document.activeElement, role: node.getAttribute('role'),
        label: document.getElementById(node.getAttribute('aria-labelledby'))?.textContent.trim(),
      }));
      assert.equal(finale.keyboardReading.focused, true, `${id}: final copy must accept keyboard focus`);
      assert.equal(finale.keyboardReading.role, 'region');
      assert.ok(finale.keyboardReading.label, `${id}: the reading region has no accessible name`);
      if (finale.copyOverflow > 10) {
        await copy.evaluate(node => { node.scrollTop = 0; });
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(250);
        finale.keyboardReading.forward = await copy.evaluate(node => node.scrollTop);
        assert.ok(finale.keyboardReading.forward > 2, `${id}: PageDown cannot reach the invitation copy`);
        await page.keyboard.press('Home');
        await page.waitForTimeout(250);
        finale.keyboardReading.reverse = await copy.evaluate(node => node.scrollTop);
        assert.ok(finale.keyboardReading.reverse < finale.keyboardReading.forward - 2,
          `${id}: Home cannot return to the invitation heading`);
      }
      const actions = page.locator('.about-narrative-finale-actions button, .about-narrative-finale-actions a');
      assert.ok(await actions.count() >= 2, `${id}: contact actions are missing`);
      finale.actions = [];
      for (const action of await actions.all()) {
        await action.focus();
        const target = await action.evaluate(node => {
          const bounds = node.getBoundingClientRect();
          const clip = node.closest('[data-about-finale-copy]').getBoundingClientRect();
          return { label: node.getAttribute('aria-label') || node.textContent.trim(),
            focused: node === document.activeElement,
            hidden: Boolean(node.closest('[inert], [aria-hidden="true"]')),
            left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
            width: bounds.width, height: bounds.height, clipTop: clip.top, clipBottom: clip.bottom,
            hit: document.elementFromPoint((bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2)?.closest('button,a') === node };
        });
        assert.equal(target.focused, true, `${id}: ${target.label} cannot receive focus`);
        assert.equal(target.hidden, false, `${id}: ${target.label} is inaccessible`);
        assert.ok(target.width > 20 && target.height > 20, `${id}: ${target.label} has no usable target`);
        assert.ok(target.left >= finale.studioLeft - 1 && target.right <= finale.studioRight + 1
          && target.top >= Math.max(finale.studioTop, target.clipTop) - 1
          && target.bottom <= Math.min(finale.limit, target.clipBottom) + 1,
        `${id}: focused ${target.label} is clipped`);
        assert.equal(target.hit, true, `${id}: ${target.label} is covered by another surface`);
        finale.actions.push(target);
      }
      const focusedCamera = await page.evaluate(() => window.__aboutNarrativeRuntime.getMotionSnapshot());
      assert.equal(focusedCamera.cameraLocked, true);
      for (const key of ['cameraPosition', 'cameraQuaternion', 'cameraProjection']) {
        assert.ok(focusedCamera[key].every((value, index) => Math.abs(value - finalCamera[key][index]) < 0.000001),
          `${id}: reading or focusing the final copy moved the locked camera (${key})`);
      }
      // Capture the resting endpoint after the title's bounded colour-draw entrance.
      await page.waitForTimeout(650);
      const finalTitle = await page.locator('[data-text-field-id="text-epilogue-invitation"]').evaluate(node => ({
        opacity: Number(getComputedStyle(node).getPropertyValue('--fragment-opacity')),
        transparentGlyphs: [...node.querySelectorAll('[data-route-enter-glyph]')]
          .filter(glyph => getComputedStyle(glyph).color === 'rgba(0, 0, 0, 0)').length,
      }));
      assert.ok(finalTitle.opacity > 0.99, `${id}: focused CTA hides final title`);
      assert.equal(finalTitle.transparentGlyphs, 0, `${id}: focused CTA leaves final title staged`);
      const finalMaterial = await getAboutSurfelState(page, { fieldId: 'text-epilogue-invitation', marginPx: 8 });
      assert.ok(finalMaterial.copyProtection.regions.length > 0, `${id}: the final copy was never measured`);
      assert.equal(finalMaterial.copyProtection.maximumProtectedVisibleCount, 0,
        `${id}: geometry at any depth intersects painted finale text, contact text, or scan credit`);
      finale.materialProtection = finalMaterial.copyProtection;
      await page.screenshot({ path: `${outputDir}/${id}-${theme}-finale.png` });
      const target = duration * 0.4;
      await driveAboutStoryWU(page, target);
      await page.setViewportSize({ width: viewport.width + 24, height: viewport.height + 16 });
      await page.waitForTimeout(400);
      const restored = await page.locator('.about-narrative-lab').getAttribute('data-narrative-story-wu');
      assert.ok(Math.abs(Number(restored) - target) < 0.05, `${id}: resize changed Story position`);
      await page.waitForFunction(() => {
        const root = document.querySelector('.about-narrative-lab');
        const end = Number(document.querySelector('[data-text-field-id="text-epilogue-invitation"]')
          .closest('[data-render-span-id]').dataset.storyEndWu);
        return root.dataset.aboutLayoutValidation === 'valid'
          && Math.abs(Number(root.dataset.aboutMeasuredDurationWu) - end) < 0.000001
          && window.__aboutNarrativeRuntime.getMetrics().state === 'ready';
      });
      const metrics = await page.evaluate(() => window.__aboutNarrativeRuntime.getMetrics());
      assert.equal(metrics.gpuBufferBuilds, 1);
      assert.equal(metrics.gpuBufferIdentityStable, true);
      assert.deepEqual(errors, []);
      report.push({ id, theme, reducedMotion, ...layout, fixedCameraProjection: projections.get(page),
        readingClearance, titleHandoffs, titleStates, reveals, finale });
      console.log(`CHECKED ${browserName} ${id} ${theme}: ${layout.maxScroll.toFixed(2)} viewports`);
      await context.close();
    }
  }
  auditCompleted = true;
} finally {
  await writeFile(`${outputDir}/report${viewportFilter ? `-${viewportFilter}` : ''}.json`, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(`${outputDir}/reading-obstructions${viewportFilter ? `-${viewportFilter}` : ''}.json`, JSON.stringify(obstructions, null, 2));
  await writeFile(`${outputDir}/reading-samples${viewportFilter ? `-${viewportFilter}` : ''}.json`, JSON.stringify(readingSamples, null, 2));
  await writeFile(`${outputDir}/distant-overlap-reviews${viewportFilter ? `-${viewportFilter}` : ''}.json`, JSON.stringify(distantOverlapReviews, null, 2));
  await writeFile(`${outputDir}/status${viewportFilter ? `-${viewportFilter}` : ''}.json`, JSON.stringify({
    status: !auditCompleted || obstructions.length ? 'failed'
      : distantOverlapReviews.length ? 'requires-distant-overlap-review' : 'passed-numerical',
    automaticCriteria: 'Zero near-material intersections at sampled prose checkpoints; zero utility overlaps; finale/contact/scan credit retain all-depth zero.',
    nearMeaning: 'Actual renderer diagnostics: depth within the unfogged range OR rendered radius at least 2 CSS pixels. Missing diagnostics fail.',
    pendingVisualReviews: distantOverlapReviews.length,
    visualAcceptance: 'pending-root-review',
    scope: 'Sampled editorial layout and geometry regression checks. All-depth counts are retained. Every sampled distant overlap needs direct review of its active PNG and hash. Full source-bound census and scene acceptance belong to the gates/Thames audit.',
  }, null, 2));
  await browser.close();
}
assert.deepEqual(obstructions, [], 'Near material entered the measured reading clearings. See reading-obstructions.json.');
if (distantOverlapReviews.length) {
  process.exitCode = 2;
  console.warn(`REQUIRES REVIEW ${browserName}: ${distantOverlapReviews.length} distant-overlap screenshots remain pending.`);
} else console.log(`PASS numerical checks ${browserName}: editorial layout, selection and sampled geometry. Scene visual acceptance remains separate.`);
