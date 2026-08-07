import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER || 'chromium';
const productionIndicatorOnly = process.env.ABS_ABOUT_PRODUCTION_INDICATOR_ONLY === '1';
const editorOnly = process.env.ABS_ABOUT_EDITOR_ONLY === '1';
const ACCEPTED_RUNTIME_CORRESPONDENCE = new Set([
  'spatial-nearest-v1',
  'constrained-index-v1',
  'spatial-nearest-v2',
  'constrained-index-v2',
  'radial-emergence-v1',
]);
const browserType = browserName === 'webkit' ? webkit : chromium;
const launchOptions = browserName === 'chromium' ? {
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'],
} : { headless: true };
const browser = await browserType.launch(launchOptions);
await mkdir('output/playwright/about-narrative', { recursive: true });

function formatWU(value) {
  return String(Number((Math.round(value / 0.002) * 0.002).toFixed(3)));
}

async function installIndicatorTimeline(page) {
  await page.addInitScript(() => {
    window.__startAboutIndicatorTimeline = () => {
      const startedAt = performance.now();
      const timeline = [];
      let previousState = '';
      let continuouslyVisibleSince = null;

      window.__aboutIndicatorTimeline = timeline;
      window.__aboutIndicatorTimelineDone = false;

      const sample = () => {
        const node = document.querySelector('.about-narrative-indicator');
        let effectiveOpacity = 0;
        let host = 'missing';
        let state = 'missing';

        if (node) {
          effectiveOpacity = 1;
          host = node.parentElement?.dataset.aboutIndicatorHost || 'unknown';
          let current = node;
          while (current instanceof Element) {
            const style = getComputedStyle(current);
            if (style.display === 'none' || style.visibility === 'hidden') {
              effectiveOpacity = 0;
              break;
            }
            effectiveOpacity *= Number(style.opacity || 1);
            current = current.parentElement;
          }
          const rect = node.getBoundingClientRect();
          state = rect.width > 0 && rect.height > 0 && effectiveOpacity >= 0.95 ? 'visible' : 'hidden';
        }

        const stateKey = `${state}:${host}`;
        if (stateKey !== previousState) {
          timeline.push({
            effectiveOpacity: Number(effectiveOpacity.toFixed(3)),
            host,
            state,
            timeMs: Math.round(performance.now() - startedAt),
          });
          previousState = stateKey;
        }

        const now = performance.now();
        if (state === 'visible') {
          continuouslyVisibleSince ??= now;
        } else {
          continuouslyVisibleSince = null;
        }
        const stableWindowComplete = continuouslyVisibleSince !== null
          && now - continuouslyVisibleSince >= 900;
        if (!stableWindowComplete && now - startedAt < 6500) {
          requestAnimationFrame(sample);
        } else {
          window.__aboutIndicatorTimelineDone = true;
        }
      };

      requestAnimationFrame(sample);
    };

    window.__startAboutIndicatorTimeline();
  });
}

async function restartIndicatorTimeline(page) {
  await page.evaluate(() => window.__startAboutIndicatorTimeline());
}

async function assertStableIndicatorTimeline(page, label) {
  await page.waitForFunction(() => window.__aboutIndicatorTimelineDone === true);
  const timeline = await page.evaluate(() => window.__aboutIndicatorTimeline);
  const firstVisibleIndex = timeline.findIndex((entry) => entry.state === 'visible');
  assert.notEqual(firstVisibleIndex, -1, `${label}: indicator never became visible: ${JSON.stringify(timeline)}`);
  assert.deepEqual(
    timeline.slice(firstVisibleIndex + 1).filter((entry) => entry.state !== 'visible'),
    [],
    `${label}: indicator disappeared after first becoming visible: ${JSON.stringify(timeline)}`,
  );
  assert.equal(timeline[firstVisibleIndex].host, 'shell-persistent');
  return timeline;
}

async function auditProductionIndicator(viewport, label) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await installIndicatorTimeline(page);
  await page.goto(`${baseUrl}/about.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-narrative-lab', { timeout: 30_000 });
  // Re-start after the route has mounted so the direct-load baseline is not
  // dominated by the transient pre-React document.
  await restartIndicatorTimeline(page);
  await assertStableIndicatorTimeline(page, `production ${label} direct load`);

  const indicator = page.locator('.about-narrative-indicator');
  const lines = indicator.locator('.about-narrative-indicator__line');
  assert.equal(await indicator.count(), 1);
  assert.equal(await lines.count(), 18);
  assert.deepEqual(
    await lines.evaluateAll((nodes) => nodes.filter((node) => node.dataset.active === 'true').map((node) => Number(node.dataset.lineIndex))),
    [0, 1],
  );

  const geometry = await indicator.evaluate((node) => {
    const root = document.querySelector('.about-narrative-lab');
    const line = node.querySelector('.about-narrative-indicator__line');
    const restingLine = node.querySelector('.about-narrative-indicator__line:not(.is-active)');
    const activeLine = node.querySelector('.about-narrative-indicator__line.is-active');
    const indicatorRect = node.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const lineStyle = getComputedStyle(line);
    return {
      activeColor: getComputedStyle(activeLine).backgroundColor,
      activeOpacity: Number(getComputedStyle(activeLine).opacity),
      expectedThickness: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--abs-indicator-line-thickness')),
      height: Number.parseFloat(lineStyle.height),
      host: node.parentElement?.dataset.aboutIndicatorHost,
      inPersistentHost: Boolean(node.closest('#shell-persistent-route-ui-host')),
      inSimulationLayer: Boolean(node.closest('.route-simulation-layer')),
      inUiLayer: Boolean(node.closest('.ui-layer')),
      layer: node.dataset.aboutIndicatorLayer,
      lineTagNames: [...node.children].map((child) => child.tagName),
      leftInset: indicatorRect.left - rootRect.left,
      physicalPixelOffset: Math.abs(
        (indicatorRect.top * window.devicePixelRatio) - Math.round(indicatorRect.top * window.devicePixelRatio),
      ),
      restingColor: getComputedStyle(restingLine).backgroundColor,
      restingOpacity: Number(getComputedStyle(restingLine).opacity),
      transitionDuration: lineStyle.transitionDuration,
      transitionProperty: lineStyle.transitionProperty,
      verticalCenterDelta: Math.abs(
        (indicatorRect.top + (indicatorRect.height / 2)) - (rootRect.top + (rootRect.height / 2)),
      ),
      width: Number.parseFloat(lineStyle.width),
    };
  });
  assert.ok(geometry.leftInset >= 9 && geometry.leftInset <= 15);
  assert.ok(geometry.verticalCenterDelta <= 1);
  assert.ok(Math.abs(geometry.height - geometry.expectedThickness) <= 0.05);
  assert.ok(geometry.width >= geometry.height * 2);
  assert.equal(geometry.host, 'shell-persistent');
  assert.equal(geometry.inPersistentHost, true);
  assert.equal(geometry.inSimulationLayer, false);
  assert.equal(geometry.inUiLayer, false);
  assert.equal(geometry.layer, 'ui');
  assert.ok(geometry.lineTagNames.every((tagName) => tagName === 'DIV'));
  assert.ok(geometry.physicalPixelOffset <= 0.25);
  assert.equal(geometry.activeColor, 'rgb(0, 0, 0)');
  assert.equal(geometry.restingColor, 'rgb(0, 0, 0)');
  assert.equal(geometry.activeOpacity, 1);
  assert.ok(Math.abs(geometry.restingOpacity - 0.22) <= 0.01);
  assert.equal(geometry.transitionDuration, '0.14s');
  assert.equal(geometry.transitionProperty, 'opacity');

  await page.locator('.about-narrative-scrollport').evaluate((node) => {
    node.scrollTop = node.scrollHeight - node.clientHeight;
    node.dispatchEvent(new Event('scroll'));
  });
  await page.waitForFunction(() => (
    document.querySelector('.about-narrative-indicator__line[data-line-index="16"]')?.dataset.active === 'true'
    && document.querySelector('.about-narrative-indicator__line[data-line-index="17"]')?.dataset.active === 'true'
    && document.querySelector('.about-narrative-indicator')?.getAttribute('aria-valuenow') === '100'
  ));
  assert.equal(await indicator.getAttribute('aria-valuenow'), '100');
  assert.equal(
    await indicator.getAttribute('aria-valuetext'),
    '100% through the About narrative',
  );

  await page.evaluate(() => {
    document.documentElement.classList.add('dark-mode');
    document.documentElement.dataset.absTheme = 'dark';
    document.body.classList.add('dark-mode');
    document.body.dataset.absTheme = 'dark';
  });
  assert.equal(
    await indicator.locator('.about-narrative-indicator__line.is-active').first().evaluate((node) => getComputedStyle(node).backgroundColor),
    'rgb(255, 255, 255)',
  );
  await page.screenshot({ path: `output/playwright/about-narrative/${browserName}-production-${label}-dark.png` });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-narrative-lab', { timeout: 30_000 });
  await restartIndicatorTimeline(page);
  await assertStableIndicatorTimeline(page, `production ${label} reload`);
  await indicator.waitFor({ state: 'visible' });
  const reloadVisibility = await indicator.evaluate((node) => {
    let effectiveOpacity = 1;
    let current = node;
    while (current instanceof Element) {
      const style = getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return { effectiveOpacity: 0, inPersistentHost: false, inSimulationLayer: false, inUiLayer: false, visible: false };
      }
      effectiveOpacity *= Number(style.opacity || 1);
      current = current.parentElement;
    }
    const rect = node.getBoundingClientRect();
    return {
      effectiveOpacity,
      inPersistentHost: Boolean(node.closest('#shell-persistent-route-ui-host')),
      inSimulationLayer: Boolean(node.closest('.route-simulation-layer')),
      inUiLayer: Boolean(node.closest('.ui-layer')),
      visible: rect.width > 0 && rect.height > 0,
    };
  });
  assert.equal(reloadVisibility.inPersistentHost, true);
  assert.equal(reloadVisibility.inSimulationLayer, false);
  assert.equal(reloadVisibility.inUiLayer, false);
  assert.equal(reloadVisibility.visible, true);
  assert.ok(reloadVisibility.effectiveOpacity >= 0.95);

  assert.deepEqual(errors, []);
  await page.screenshot({ path: `output/playwright/about-narrative/${browserName}-production-${label}.png` });
  await page.close();
}

async function auditSpaIndicator(viewport, label) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await installIndicatorTimeline(page);
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-button-bar] a[href*="about.html"]').click();
  await page.waitForURL(/about\.html/);
  await page.waitForSelector('.about-narrative-lab', { timeout: 30_000 });
  await restartIndicatorTimeline(page);
  await assertStableIndicatorTimeline(page, `production ${label} SPA navigation`);
  assert.equal(await page.locator('#shell-persistent-route-ui-host .about-narrative-indicator').count(), 1);
  assert.equal(await page.locator('.about-narrative-indicator').isVisible(), true);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `output/playwright/about-narrative/${browserName}-production-${label}-spa.png` });
  await page.close();
}

async function audit(viewport, label) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await installIndicatorTimeline(page);
  await page.goto(`${baseUrl}/about.html?edit=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-narrative-lab', { timeout: 30_000 });
  await restartIndicatorTimeline(page);
  await assertStableIndicatorTimeline(page, `editor ${label} direct load`);
  assert.equal(new URL(page.url()).searchParams.get('edit'), '1');
  assert.equal(await page.locator('[data-narrative-section]').count(), 8);
  assert.equal(await page.locator('.about-editor').count(), 1);
  assert.equal(await page.locator('#simulations .about-editor').count(), 0);
  assert.equal(await page.locator('body > .about-editor').count(), 1);
  assert.equal(await page.locator('.about-editor .ti').count(), 0);
  assert.equal(await page.locator('.about-editor-transport > button svg').count(), 5);
  assert.equal(await page.locator('#shell-persistent-route-ui-host .about-narrative-indicator').count(), 1);
  assert.equal(await page.locator('.about-narrative-indicator').isVisible(), true);
  const root = page.locator('.about-narrative-lab');
  const getSectionStoryWU = async (sectionId, localProgress) => page
    .locator(`[data-narrative-section="${sectionId}"]`)
    .evaluate((node, progress) => {
      const scrollport = document.querySelector('.about-narrative-scrollport');
      const extent = node.offsetHeight / scrollport.clientHeight;
      const travel = Math.max(0.001, extent - 1);
      return (node.offsetTop / scrollport.clientHeight) + (travel * progress);
    }, localProgress);
  assert.equal(await root.getAttribute('data-point-world-state'), 'ready');
  await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.worldPrepare === 'ready');
  assert.match(
    await page.locator('.about-narrative-spatial-title').first().evaluate((node) => getComputedStyle(node).fontFamily),
    /Instrument Serif/,
  );
  const verticalTitles = page.locator('.about-narrative-vertical-title');
  assert.equal(await verticalTitles.count(), 0);
  assert.equal(await page.locator('[data-text-cue="promise-main"]').getAttribute('data-text-movement'), 'spatial');
  assert.equal(await page.locator('[data-text-cue="complexity-idea"]').getAttribute('data-text-movement'), 'spatial');
  assert.equal(await page.locator('[data-text-cue="complexity-conditions"]').getAttribute('data-text-movement'), 'spatial');
  const initialOpener = await page.locator('[data-text-cue="promise-main"]').evaluate((node) => ({
    opacity: Number(getComputedStyle(node).getPropertyValue('--fragment-opacity')),
    blur: Number.parseFloat(getComputedStyle(node).getPropertyValue('--fragment-blur')),
    y: Number.parseFloat(getComputedStyle(node).getPropertyValue('--fragment-y')),
  }));
  assert.equal(initialOpener.opacity, 1);
  assert.equal(initialOpener.blur, 0);
  assert.equal(initialOpener.y, 36);
  const openingScrollCue = page.locator('.about-narrative-opening-scroll-cue');
  assert.equal(await openingScrollCue.count(), 1);
  assert.equal(await openingScrollCue.locator('.about-narrative-opening-scroll-cue__label').textContent(), 'Scroll');
  assert.equal(await openingScrollCue.locator('.about-narrative-opening-scroll-cue__line').count(), 1);
  assert.equal(await openingScrollCue.locator('[class*="ti-arrow"]').count(), 0);
  const openingCueGeometry = await page.locator('[data-text-field-id="text-promise-main"] .route-centered-page__title').evaluate((title) => {
    const field = title.closest('[data-text-field-id]');
    const cue = field.querySelector('.about-narrative-opening-scroll-cue');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const titleRect = title.getBoundingClientRect();
    const cueRect = cue.getBoundingClientRect();
    const scrollportRect = scrollport.getBoundingClientRect();
    return {
      bottomGap: scrollportRect.bottom - cueRect.bottom,
      centreDelta: Math.abs((titleRect.left + (titleRect.width / 2)) - (cueRect.left + (cueRect.width / 2))),
      cueTop: cueRect.top,
      titleBottom: titleRect.bottom,
    };
  });
  assert.ok(openingCueGeometry.centreDelta <= 1);
  assert.ok(openingCueGeometry.cueTop > openingCueGeometry.titleBottom);
  assert.ok(openingCueGeometry.bottomGap >= 16 && openingCueGeometry.bottomGap <= 56);
  assert.equal(await root.getAttribute('data-opening-scroll-cue'), 'visible');
  assert.equal(await page.locator('#about-narrative-promise [data-text-cue="complexity-idea"]').count(), 0);
  assert.equal(await page.locator('#about-narrative-complexity [data-text-cue="complexity-idea"]').count(), 1);
  assert.equal(await page.locator('[data-text-cue="practice-main"]').count(), 0);
  assert.equal(await page.locator('.about-narrative-discipline-list').count(), 0);
  assert.equal(await page.locator('.about-narrative-discipline-reveal').count(), 1);
  assert.equal(await page.locator('.about-narrative-discipline-reveal li').count(), 6);
  const spatialStageAlignment = await page.locator('.about-narrative-spatial-stage').evaluateAll((nodes) => nodes.map((node) => ({
    alignItems: getComputedStyle(node).alignItems,
    justifyItems: getComputedStyle(node).justifyItems,
  })));
  assert.ok(spatialStageAlignment.every((item) => item.alignItems === 'center' && item.justifyItems === 'center'));
  const spatialTitleSizes = await page.locator('.about-narrative-spatial-title').evaluateAll((nodes) => [...new Set(nodes.map((node) => getComputedStyle(node).fontSize))]);
  assert.equal(spatialTitleSizes.length, 1);
  const editorialTypeSelector = [
    '.about-narrative-editorial-title',
    '.about-narrative-editorial-copy',
    '.about-narrative-editorial-detail',
    '.about-narrative-editorial-list__label',
    '.about-narrative-editorial-list li',
    '.about-narrative-client-logos li',
    '.about-narrative-discipline-list li',
    '.about-narrative-discipline-list__number',
  ].join(',');
  const editorialType = page.locator(editorialTypeSelector);
  const editorialTypeSizes = await editorialType.evaluateAll((nodes) => [...new Set(nodes.map((node) => getComputedStyle(node).fontSize))]);
  assert.equal(editorialTypeSizes.length, 1);
  if (viewport.width >= 760) assert.equal(editorialTypeSizes[0], '24px');
  assert.deepEqual(await editorialType.evaluateAll((nodes) => [...new Set(nodes.map((node) => getComputedStyle(node).fontWeight))]), ['300']);
  const editorialEmphasis = page.locator('.about-narrative-editorial-emphasis');
  assert.ok(await editorialEmphasis.count() >= 12);
  assert.ok(await editorialEmphasis.evaluateAll((nodes) => nodes.every((node) => (
    Number(getComputedStyle(node).fontWeight) >= 600
      && getComputedStyle(node).color !== getComputedStyle(node.parentElement).color
      && ['blue', 'green', 'orange'].includes(node.dataset.emphasisTone)
  ))));
  assert.equal(
    await page.locator('[data-narrative-section="disciplines"] .about-narrative-editorial-emphasis').count(),
    1,
    'The discipline editorial passage should carry one intentional highlight only',
  );
  const cameraClips = page.locator('.about-editor-lane--camera .about-editor-clip');
  for (let index = 0; index < await cameraClips.count(); index += 1) {
    const cameraClip = cameraClips.nth(index);
    const cameraKeys = cameraClip.locator('.about-editor-key');
    assert.equal(await cameraClip.locator('.about-editor-camera-anchor').count(), 0);
    assert.equal(await cameraClip.locator('.about-editor-key.is-boundary').count(), 2);
    assert.equal(await cameraClip.locator('.about-editor-camera-rail span').count(), (await cameraKeys.count()) - 1);
  }
  assert.ok(await page.locator('.about-editor-camera-rail').evaluateAll((nodes) => (
    nodes.every((node) => getComputedStyle(node).pointerEvents === 'none')
  )));
  assert.equal(
    await cameraClips.nth(2).locator('.about-editor-camera-rail .is-authored-motion').count(),
    2,
    'The calm-field to top-down camera move should read as two authored motion spans',
  );
  if (viewport.width >= 760) {
    await page.locator('.about-editor-brand').click();
    const sequenceInspector = page.locator('.about-editor-inspector');
    assert.match(await sequenceInspector.textContent(), /Shared turbulence/i);
    assert.match(await sequenceInspector.textContent(), /One ambient motion profile drives both the cluster and turbulent field/i);
    assert.match(await sequenceInspector.textContent(), /Movement range/i);
    assert.match(await sequenceInspector.textContent(), /Erratic motion/i);
    assert.match(await sequenceInspector.textContent(), /Individuality/i);
    assert.match(await sequenceInspector.textContent(), /3D spread/i);

    await page.locator('[data-global-track="text"]').click();
    const textInspectorCopy = await sequenceInspector.textContent();
    assert.match(textInspectorCopy, /Text track/i);
    assert.match(textInspectorCopy, /Spatial titles/i);
    assert.match(textInspectorCopy, /Clear window/i);
    assert.match(textInspectorCopy, /Perspective/i);
    assert.match(textInspectorCopy, /Depth moves; blur softens/i);
    assert.doesNotMatch(textInspectorCopy, /Entry scale|Exit scale/i);
    assert.equal(await sequenceInspector.locator('[data-global-control="clearWindow"] input[type="range"]').count(), 2);

    const spatialCueWidthsBefore = await page.locator('.about-editor-cue.is-spatial').evaluateAll((nodes) => (
      nodes.map((node) => node.getBoundingClientRect().width)
    ));
    const durationSlider = sequenceInspector.locator('.about-editor-property').filter({ hasText: 'Travel duration' }).locator('input[type="range"]');
    await durationSlider.fill('1.2');
    await page.waitForTimeout(80);
    const spatialCueWidthsAfter = await page.locator('.about-editor-cue.is-spatial').evaluateAll((nodes) => (
      nodes.map((node) => node.getBoundingClientRect().width)
    ));
    assert.ok(spatialCueWidthsAfter.some((width, index) => Math.abs(width - spatialCueWidthsBefore[index]) > 1));
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');

    await page.locator('[data-global-track="camera"]').click();
    assert.match(await sequenceInspector.textContent(), /Camera track[\s\S]*Forward cadence[\s\S]*Field of view/i);
    await page.locator('[data-global-track="section"]').click();
    assert.match(await sequenceInspector.textContent(), /Sections track[\s\S]*Scroll smoothing[\s\S]*Reading width/i);
    await page.locator('[data-global-track="world"]').click();
    assert.match(await sequenceInspector.textContent(), /World track[\s\S]*Point material[\s\S]*Shared turbulence/i);
  }
  const worldClips = page.locator('.about-editor-lane--world .about-editor-clip');
  assert.match(await worldClips.nth(1).textContent(), /turbulent-field/i);
  assert.match(await worldClips.nth(2).textContent(), /calm-field/i);
  assert.equal(await page.locator('.about-editor-timing-key.is-text').count(), 0, 'Text blocks should not contain separate timing controls');
  assert.equal(
    await page.locator('.about-editor-cue.is-draggable').count(),
    await page.locator('.about-editor-cue').count(),
    'Each Text Cue block should be its own timing control',
  );
  assert.equal(await page.locator('.about-editor-cue.is-vertical').count(), 0);
  assert.equal(await page.locator('.about-editor-discipline-reveal').count(), 1);
  assert.equal(await page.locator('.about-editor-discipline-reveal .about-editor-timing-key').count(), 0);
  const textLaneTones = await page.evaluate(() => {
    const parseLightness = (value) => {
      const components = value.match(/[\d.]+/g)?.map(Number) || [];
      const rgb = value.startsWith('color(')
        ? components.slice(0, 3)
        : components.slice(0, 3).map((component) => component / 255);
      return (rgb[0] * 0.2126) + (rgb[1] * 0.7152) + (rgb[2] * 0.0722);
    };
    const spatial = getComputedStyle(document.querySelector('.about-editor-cue.is-spatial')).backgroundColor;
    const vertical = getComputedStyle(document.querySelector('.about-editor-editorial-clip')).backgroundColor;
    return { spatial, vertical, spatialLightness: parseLightness(spatial), verticalLightness: parseLightness(vertical) };
  });
  assert.notEqual(textLaneTones.spatial, textLaneTones.vertical);
  assert.ok(textLaneTones.spatialLightness < textLaneTones.verticalLightness, 'Spatial Cue blocks should be darker than vertical Text blocks');
  const cameraHolds = page.locator('.about-editor-camera-hold');
  assert.equal(await cameraHolds.count(), 7, 'Each non-final Section should name the settled camera hold after its scroll travel');
  assert.ok((await cameraHolds.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width))).every((width) => width > 4));
  const practiceCameraBoundary = page.locator('.about-editor-lane--camera .about-editor-clip').nth(3).locator('.about-editor-key.is-boundary').last();
  await practiceCameraBoundary.click();
  const cameraInspector = page.locator('.about-editor-inspector');
  assert.match(await cameraInspector.textContent(), /Camera key[\s\S]*100% through The practice comes into view[\s\S]*protected boundary/i);
  assert.equal(
    await cameraInspector.locator('.about-editor-property').filter({ hasText: /^Position/ }).locator('input').evaluateAll((nodes) => nodes.every((node) => node.disabled)),
    true,
  );
  const protectedBoundaryButton = cameraInspector.locator('button.about-editor-danger');
  assert.equal(await protectedBoundaryButton.textContent(), 'Protected boundary key');
  assert.equal(await protectedBoundaryButton.isDisabled(), true);
  assert.equal(
    (await cameraInspector.locator('.about-editor-property > span').allTextContents()).filter((label) => /^Aim (X|Y|depth)$/.test(label)).length,
    3,
    'The Camera inspector should expose one Aim vector, not duplicate controls',
  );
  const hoverKey = page.locator('.about-editor-key.is-draggable').first();
  const keyBeforeHover = await hoverKey.evaluate((node) => ({
    transform: getComputedStyle(node).transform,
    rect: node.getBoundingClientRect().toJSON(),
  }));
  await hoverKey.hover();
  await page.waitForTimeout(220);
  const keyAfterHover = await hoverKey.evaluate((node) => ({
    transform: getComputedStyle(node).transform,
    cursor: getComputedStyle(node).cursor,
    rect: node.getBoundingClientRect().toJSON(),
  }));
  assert.equal(keyAfterHover.transform, keyBeforeHover.transform);
  assert.ok(Math.abs(keyAfterHover.rect.x - keyBeforeHover.rect.x) < 0.1);
  assert.ok(Math.abs(keyAfterHover.rect.y - keyBeforeHover.rect.y) < 0.1);
  assert.equal(keyAfterHover.cursor, 'pointer');
  assert.equal(await page.locator('#custom-cursor').evaluate((node) => getComputedStyle(node).display), 'none');

  const transport = page.locator('.about-editor-transport input[type="range"]');
  const openingTitle = page.locator('[data-text-cue="promise-main"]');
  const secondOpeningTitle = page.locator('[data-text-cue="complexity-idea"]');
  await transport.fill('0.04');
  await page.waitForTimeout(120);
  assert.equal(await root.getAttribute('data-opening-scroll-cue'), 'hidden');
  const openingTitleBefore = await openingTitle.evaluate((node) => Number.parseFloat(getComputedStyle(node).getPropertyValue('--fragment-y')));
  await transport.fill('0.2');
  await page.waitForTimeout(120);
  const openingTitleAfter = await openingTitle.evaluate((node) => Number.parseFloat(getComputedStyle(node).getPropertyValue('--fragment-y')));
  assert.ok(openingTitleAfter > openingTitleBefore + 40);
  // The visual sampler and its pink timeline clip must describe the same
  // interval. This deliberately checks just before and during the second
  // opener title rather than relying on a screenshot of the initial state.
  await transport.fill(formatWU(await getSectionStoryWU('complexity', 0)));
  await page.waitForTimeout(120);
  const secondTitleBeforeEntrance = await secondOpeningTitle.evaluate((node) => Number.parseFloat(
    getComputedStyle(node).getPropertyValue('--fragment-opacity'),
  ));
  assert.ok(secondTitleBeforeEntrance < 0.01, 'The second title must stay hidden before its timeline clip begins.');
  await transport.fill(formatWU(await getSectionStoryWU('complexity', 0.16)));
  await page.waitForTimeout(120);
  const secondTitleAtFocus = await secondOpeningTitle.evaluate((node) => Number.parseFloat(
    getComputedStyle(node).getPropertyValue('--fragment-opacity'),
  ));
  assert.ok(secondTitleAtFocus > 0.99, 'The second title must be clear at its timeline focus point.');
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
  const complexityTransitionWU = await getSectionStoryWU('complexity', 0.18);
  await transport.fill(formatWU(complexityTransitionWU));
    await page.waitForFunction(() => {
      const state = document.querySelector('.about-narrative-lab')?.dataset;
      return state?.worldTo === 'turbulent-field-v1'
        && state?.worldCorrespondenceRequested === 'spatial-nearest-v1';
    });
    const correspondenceBefore = await root.evaluate((node) => ({
      pair: node.dataset.worldCorrespondencePair,
      rebuilds: Number(node.dataset.worldBufferRebuilds),
      installed: node.dataset.worldCorrespondence,
      improvement: Number(node.dataset.worldCorrespondenceImprovement),
      p95: Number(node.dataset.worldCorrespondenceP95),
      max: Number(node.dataset.worldCorrespondenceMax),
      bootstrapMs: Number(node.dataset.worldBootstrapGenerationMs),
      generationMs: Number(node.dataset.worldShapeGenerationMs),
      workerMs: Number(node.dataset.worldCorrespondenceWorkerMs),
      prepareMs: Number(node.dataset.worldCorrespondencePrepareMs),
      applyMs: Number(node.dataset.worldCorrespondenceApplyMs),
    }));
    assert.ok(ACCEPTED_RUNTIME_CORRESPONDENCE.has(correspondenceBefore.installed));
    assert.ok(correspondenceBefore.improvement > 0);
    assert.ok(Number.isFinite(correspondenceBefore.p95));
    assert.ok(Number.isFinite(correspondenceBefore.max));
    assert.ok(correspondenceBefore.bootstrapMs >= 0);
    assert.ok(correspondenceBefore.generationMs > 0);
    assert.ok(correspondenceBefore.workerMs > 0);
    assert.ok(correspondenceBefore.prepareMs > 0);
    assert.ok(correspondenceBefore.applyMs >= 0);
    if (browserName === 'chromium') {
      // Bootstrap generation may begin synchronously before its Promise yields;
      // the frame-critical contract is the prepared-pair application below.
      assert.ok(correspondenceBefore.applyMs < (1000 / 60));
    }
    await transport.fill(formatWU(await getSectionStoryWU('complexity', 0.22)));
    await page.waitForTimeout(180);
    const correspondenceAfter = await root.evaluate((node) => ({
      pair: node.dataset.worldCorrespondencePair,
      rebuilds: Number(node.dataset.worldBufferRebuilds),
    }));
    assert.deepEqual(correspondenceAfter, {
      pair: correspondenceBefore.pair,
      rebuilds: correspondenceBefore.rebuilds,
    });
    const transitionSamples = [
      ['turbulent-field-v1', await getSectionStoryWU('complexity', 0.18)],
      ['calm-field-v1', await getSectionStoryWU('background', 0.1)],
      ['living-field-v1', await getSectionStoryWU('bringing-life', 0.22)],
      ['bust-v1', await getSectionStoryWU('epilogue', 0.28)],
    ];
    for (const [shapeId, storyWU] of transitionSamples) {
      await transport.fill(formatWU(storyWU));
      await page.waitForFunction((expectedShape) => {
        const state = document.querySelector('.about-narrative-lab')?.dataset;
        return state?.worldTo === expectedShape && state?.worldCorrespondenceRequested === 'spatial-nearest-v1';
      }, shapeId);
      const state = await root.evaluate((node) => ({
        installed: node.dataset.worldCorrespondence,
        improvement: Number(node.dataset.worldCorrespondenceImprovement),
        fallback: node.dataset.worldCorrespondenceFallback,
        bustYaw: Number(getComputedStyle(node).getPropertyValue('--narrative-bust-yaw')),
      }));
      assert.ok(ACCEPTED_RUNTIME_CORRESPONDENCE.has(state.installed));
      if (state.installed === 'spatial-nearest-v1' || state.installed === 'spatial-nearest-v2') {
        assert.ok(state.improvement > 0);
        assert.equal(state.fallback, '');
      } else {
        assert.ok(state.fallback.length > 0);
      }
      if (shapeId === 'bust-v1') assert.ok(Math.abs(state.bustYaw) < 0.0001);
    }
    if (viewport.width >= 760) {
      const bustMidpointWU = transitionSamples.at(-1)[1];
      const maxWU = Number(await transport.getAttribute('max'));
      await transport.fill(formatWU(Math.max(bustMidpointWU + 0.5, maxWU - 0.05)));
      await page.waitForTimeout(1900);
      const resolvedYaw = await root.evaluate((node) => Number(getComputedStyle(node).getPropertyValue('--narrative-bust-yaw')));
      assert.ok(Math.abs(resolvedYaw) > 0.005);
      await transport.fill(formatWU(bustMidpointWU));
      await page.waitForTimeout(120);
      const reverseFormationYaw = await root.evaluate((node) => ({
        css: Number(getComputedStyle(node).getPropertyValue('--narrative-bust-yaw')),
        shader: Number(node.dataset.worldBustShaderYaw),
      }));
      assert.ok(Math.abs(reverseFormationYaw.css - resolvedYaw) < 0.003);
      assert.ok(Math.abs(reverseFormationYaw.shader - resolvedYaw) < 0.003);
    }

  await page.locator('.about-editor-lane--section button').nth(1).click();
  const selectedCue = page.locator('.about-editor-lane--text .about-editor-clip').nth(1).locator('.about-editor-cue').first();
  await selectedCue.click();
  assert.equal(await selectedCue.getAttribute('aria-pressed'), 'true');
  assert.equal(await selectedCue.locator('xpath=..').locator('.about-editor-timing-key.is-text').count(), 0);
  const textarea = page.locator('.about-editor-inspector textarea').first();
  if (await textarea.isVisible()) {
    const original = await textarea.inputValue();
    await textarea.fill('Temporary audit statement.');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    assert.equal(await textarea.inputValue(), original);
    await textarea.blur();
  }
  const beforeArrow = Number(await transport.inputValue());
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(80);
  assert.ok(Number(await transport.inputValue()) > beforeArrow);
  assert.ok(await page.locator('.about-editor-key.is-selected, .about-editor-timing-key.is-selected, .about-editor-cue.is-selected, .about-editor-discipline-reveal.is-selected').count() >= 1);
  assert.equal(await page.locator('.about-editor-timing-note').count(), 0);

  if (viewport.width >= 760) {
    const backgroundCameraClip = cameraClips.nth(2);
    const practiceCameraClip = cameraClips.nth(3);
    const movableCameraKey = backgroundCameraClip.locator('.about-editor-key.is-draggable').first();
    const [destinationClipBox, cameraKeyBox] = await Promise.all([practiceCameraClip.boundingBox(), movableCameraKey.boundingBox()]);
    const cameraLabelBeforeDrag = await movableCameraKey.getAttribute('aria-label');
    const sourceKeyCountBefore = await backgroundCameraClip.locator('.about-editor-key').count();
    const destinationKeyCountBefore = await practiceCameraClip.locator('.about-editor-key').count();
    assert.ok(destinationClipBox && cameraKeyBox);
    await page.mouse.move(cameraKeyBox.x + (cameraKeyBox.width / 2), cameraKeyBox.y + (cameraKeyBox.height / 2));
    await page.mouse.down();
    await page.mouse.move(destinationClipBox.x + (destinationClipBox.width * 0.3), cameraKeyBox.y + (cameraKeyBox.height / 2), { steps: 8 });
    assert.equal(await page.locator('.about-editor-camera-drag-ghost').count(), 1);
    await page.mouse.up();
    await page.waitForTimeout(100);
    assert.equal(await backgroundCameraClip.locator('.about-editor-key').count(), sourceKeyCountBefore - 1);
    assert.equal(await practiceCameraClip.locator('.about-editor-key').count(), destinationKeyCountBefore + 1);
    const movedCameraKey = practiceCameraClip.locator('.about-editor-key.is-selected');
    assert.match(await movedCameraKey.getAttribute('aria-label'), /through The practice comes into view/i);
    assert.notEqual(await movedCameraKey.getAttribute('aria-label'), cameraLabelBeforeDrag);
    assert.equal(await page.locator('.about-editor-camera-drag-ghost').count(), 0);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(100);
    assert.equal(await backgroundCameraClip.locator('.about-editor-key').count(), sourceKeyCountBefore);
    assert.equal(await practiceCameraClip.locator('.about-editor-key').count(), destinationKeyCountBefore);
    assert.equal(await backgroundCameraClip.locator('.about-editor-key.is-draggable').first().getAttribute('aria-label'), cameraLabelBeforeDrag);

    const movableWorldTransition = page.locator('.about-editor-timing-key.is-world').first();
    const worldTransitionStyleBefore = await movableWorldTransition.getAttribute('style');
    const worldTransitionBox = await movableWorldTransition.boundingBox();
    assert.ok(worldTransitionBox);
    await page.mouse.move(worldTransitionBox.x + (worldTransitionBox.width / 2), worldTransitionBox.y + (worldTransitionBox.height / 2));
    await page.mouse.down();
    await page.mouse.move(worldTransitionBox.x + (worldTransitionBox.width / 2) + 14, worldTransitionBox.y + (worldTransitionBox.height / 2), { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    assert.notEqual(await page.locator('.about-editor-timing-key.is-world.is-selected').getAttribute('style'), worldTransitionStyleBefore);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(100);
    assert.equal(await movableWorldTransition.getAttribute('style'), worldTransitionStyleBefore);

    const complexityTextClip = page.locator('.about-editor-lane--text .about-editor-clip').nth(1);
    const movableTextCue = complexityTextClip.locator('.about-editor-cue.is-draggable').first();
    const textLabelBeforeDrag = await movableTextCue.getAttribute('aria-label');
    const dragIntroCueTo = async (at) => {
      const [textClipBox, textCueBox] = await Promise.all([complexityTextClip.boundingBox(), movableTextCue.boundingBox()]);
      assert.ok(textClipBox && textCueBox);
      await page.mouse.move(textCueBox.x + (textCueBox.width / 2), textCueBox.y + (textCueBox.height / 2));
      await page.mouse.down();
      const currentAt = Number((await movableTextCue.getAttribute('aria-label')).match(/at (\d+)%/i)?.[1] || 0) / 100;
      await page.mouse.move(
        textCueBox.x + (textCueBox.width / 2) + (textClipBox.width * (at - currentAt)),
        textCueBox.y + (textCueBox.height / 2),
        { steps: 8 },
      );
      await page.mouse.up();
      await page.waitForTimeout(120);
    };
    await dragIntroCueTo(0.12);
    assert.match(await movableTextCue.getAttribute('aria-label'), /at 12%/i);
    assert.ok((await movableTextCue.boundingBox()).width >= 5);
    await page.waitForTimeout(1050);
    await dragIntroCueTo(0.92);
    assert.match(await movableTextCue.getAttribute('aria-label'), /at 9[12]%/i);
    assert.ok((await movableTextCue.boundingBox()).width >= 5);
    await page.waitForTimeout(100);
    assert.notEqual(await movableTextCue.getAttribute('aria-label'), textLabelBeforeDrag);
    assert.equal(await movableTextCue.getAttribute('aria-pressed'), 'true');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(100);
    assert.match(await movableTextCue.getAttribute('aria-label'), /at 12%/i);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(100);
    assert.equal(await movableTextCue.getAttribute('aria-label'), textLabelBeforeDrag);

    const introGroupCue = page.locator('[data-cue-id="complexity-idea"]');
    const complexityGroupCue = page.locator('[data-cue-id="complexity-curiosity"]');
    await introGroupCue.click();
    await complexityGroupCue.click({ modifiers: ['Shift'] });
    assert.equal(await page.locator('.about-editor-cue.is-selected').count(), 2);
    assert.match(await page.locator('.about-editor-selection-count').textContent(), /2 titles selected/i);
    const groupLabelsBefore = await Promise.all([
      introGroupCue.getAttribute('aria-label'),
      complexityGroupCue.getAttribute('aria-label'),
    ]);
    const complexityGroupBox = await complexityGroupCue.boundingBox();
    assert.ok(complexityGroupBox);
    await page.mouse.move(complexityGroupBox.x + (complexityGroupBox.width / 2), complexityGroupBox.y + (complexityGroupBox.height / 2));
    await page.mouse.down();
    await page.mouse.move(complexityGroupBox.x + (complexityGroupBox.width / 2) + 22, complexityGroupBox.y + (complexityGroupBox.height / 2), { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    const groupLabelsAfter = await Promise.all([
      introGroupCue.getAttribute('aria-label'),
      complexityGroupCue.getAttribute('aria-label'),
    ]);
    assert.notDeepEqual(groupLabelsAfter, groupLabelsBefore);
    const groupWidthsAfter = await Promise.all([
      introGroupCue.boundingBox().then((box) => box.width),
      complexityGroupCue.boundingBox().then((box) => box.width),
    ]);
    groupWidthsAfter.forEach((width) => assert.ok(width >= 5));
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(120);
    assert.deepEqual(await Promise.all([
      introGroupCue.getAttribute('aria-label'),
      complexityGroupCue.getAttribute('aria-label'),
    ]), groupLabelsBefore);

    const multiCueTextClip = page.locator('.about-editor-lane--text .about-editor-clip').filter({ has: page.locator('[data-section-id="practice-reveal"]') });
    const multiCueTextBox = await multiCueTextClip.boundingBox();
    assert.ok(multiCueTextBox);
    await page.locator('.about-editor-lane--section button').nth(3).click();
    const multiCueButtons = multiCueTextClip.locator('.about-editor-cue');
    await multiCueButtons.first().click();
    for (let index = 1; index < await multiCueButtons.count(); index += 1) {
      await multiCueButtons.nth(index).click({ modifiers: ['Shift'] });
    }
    assert.ok(await multiCueTextClip.locator('.about-editor-cue.is-selected').count() >= 3);

    const sectionClip = page.locator('.about-editor-lane--section .about-editor-section-clip').nth(1);
    const sectionHandle = sectionClip.locator('.about-editor-section-resize');
    await sectionClip.locator('button').first().click();
    const sectionTiming = page.locator('.about-editor-inspector details').filter({ hasText: 'Section timing' });
    const sectionTravel = sectionTiming.locator('.about-editor-property').filter({ hasText: /^Scroll travel/ }).locator('output');
    const extentBefore = Number.parseFloat(await sectionTravel.textContent());
    const maxStoryWU = Number(await transport.getAttribute('max'));
    const sectionStartRatio = await sectionClip.evaluate((node) => (
      [...node.parentElement.children]
        .slice(0, [...node.parentElement.children].indexOf(node))
        .reduce((sum, sibling) => sum + (Number.parseFloat(sibling.style.width) || 0), 0) / 100
    ));
    const sectionStartWU = sectionStartRatio * maxStoryWU;
    await transport.fill(formatWU(sectionStartWU + (extentBefore * 0.42)));
    const handleBox = await sectionHandle.boundingBox();
    assert.ok(handleBox);
    await page.mouse.move(handleBox.x + (handleBox.width / 2), handleBox.y + (handleBox.height / 2));
    await page.mouse.down();
    await page.mouse.move(handleBox.x + (handleBox.width / 2) + 48, handleBox.y + (handleBox.height / 2), { steps: 8 });
    assert.equal(await sectionClip.locator('output').count(), 1);
    await page.mouse.up();
    await page.waitForTimeout(150);
    const extentAfter = Number.parseFloat(await sectionTravel.textContent());
    assert.notEqual(extentAfter, extentBefore);
    const localAfterResize = (Number(await transport.inputValue()) - sectionStartWU) / extentAfter;
    assert.ok(Math.abs(localAfterResize - 0.42) < 0.02);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(120);
    assert.equal(Number.parseFloat(await sectionTravel.textContent()), extentBefore);

    const timelineCanvas = page.locator('.about-editor-timeline-canvas');
    const timelineWidthBefore = await timelineCanvas.evaluate((node) => node.scrollWidth);
    await page.locator('.about-editor-contextbar button').filter({ hasText: 'Fit Section' }).click();
    await page.waitForTimeout(120);
    assert.ok(await timelineCanvas.evaluate((node) => node.scrollWidth) > timelineWidthBefore);
    await page.locator('.about-editor-contextbar button').filter({ hasText: 'Fit sequence' }).click();
    await page.waitForTimeout(120);
    assert.ok(Math.abs((await timelineCanvas.evaluate((node) => node.scrollWidth)) - timelineWidthBefore) <= 1);

    const rhythmCueA = page.locator('[data-section-id="practice-reveal"][data-cue-id]').nth(0);
    const rhythmCueB = page.locator('[data-section-id="practice-reveal"][data-cue-id]').nth(1);
    const rhythmCueC = page.locator('[data-section-id="practice-reveal"][data-cue-id]').nth(2);
    await rhythmCueA.click();
    await rhythmCueB.click({ modifiers: ['Shift'] });
    await rhythmCueC.click({ modifiers: ['Shift'] });
    const rhythmPanel = page.locator('.about-editor-rhythm');
    assert.match(await rhythmPanel.textContent(), /3 titles selected|Distribute evenly/i);
    const rhythmLabelsBefore = await Promise.all([rhythmCueA, rhythmCueB, rhythmCueC].map((cue) => cue.getAttribute('aria-label')));
    await rhythmPanel.getByRole('button', { name: 'Distribute evenly' }).click();
    assert.equal(await rhythmPanel.locator('.about-editor-rhythm-preview i').count(), 3);
    await rhythmPanel.getByRole('button', { name: 'Cancel' }).click();
    assert.deepEqual(await Promise.all([rhythmCueA, rhythmCueB, rhythmCueC].map((cue) => cue.getAttribute('aria-label'))), rhythmLabelsBefore);
    await rhythmPanel.getByRole('button', { name: 'Distribute evenly' }).click();
    await rhythmPanel.getByRole('button', { name: 'Apply' }).click();
    await page.waitForTimeout(120);
    const rhythmLabelsAfterApply = await Promise.all([rhythmCueA, rhythmCueB, rhythmCueC].map((cue) => cue.getAttribute('aria-label')));
    assert.equal(rhythmLabelsAfterApply.length, 3);
    if (JSON.stringify(rhythmLabelsAfterApply) !== JSON.stringify(rhythmLabelsBefore)) {
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
      await page.waitForTimeout(120);
      assert.deepEqual(await Promise.all([rhythmCueA, rhythmCueB, rhythmCueC].map((cue) => cue.getAttribute('aria-label'))), rhythmLabelsBefore);
    }

    const exactGap = rhythmPanel.locator('.about-editor-property').filter({ hasText: 'Exact gap' }).locator('input');
    await exactGap.fill('8');
    await rhythmPanel.getByRole('button', { name: 'Preview exact gap' }).click();
    assert.match(await rhythmPanel.locator('.about-editor-rhythm-message').textContent(), /limit|boundar|require/i);
    assert.equal(await rhythmPanel.getByRole('button', { name: 'Apply' }).count(), 0);
    await rhythmPanel.getByRole('button', { name: 'Copy' }).click();
    const destinationCue = page.locator('[data-cue-id="life-form"]');
    await destinationCue.click();
    await page.waitForFunction(() => document.querySelector('[data-cue-id="life-form"]')?.getAttribute('aria-pressed') === 'true');
    const destinationClip = page
      .locator('.about-editor-lane--text .about-editor-clip')
      .filter({ has: destinationCue });
    const destinationCount = await destinationClip.locator('.about-editor-cue').count();
    const destinationRhythmPanel = page.locator('.about-editor-rhythm');
    if (!await destinationRhythmPanel.evaluate((node) => node.open)) {
      await destinationRhythmPanel.locator('summary').click();
    }
    const pasteButton = destinationRhythmPanel.locator('button').filter({ hasText: 'Paste at playhead' });
    await pasteButton.waitFor({ state: 'attached' });
    await pasteButton.click({ force: true });
    await page.waitForTimeout(120);
    assert.equal(await destinationClip.locator('.about-editor-cue').count(), destinationCount + 3);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(120);
    assert.equal(await destinationClip.locator('.about-editor-cue').count(), destinationCount);

    const sectionCountBeforeDuplicate = await page.locator('.about-editor-lane--section .about-editor-section-clip').count();
    await page.locator('.about-editor-lane--section .about-editor-section-clip').nth(1).locator('button').first().click();
    await page.locator('.about-editor-inspector .about-editor-inline-actions').getByRole('button', { name: 'Duplicate' }).click();
    await page.waitForTimeout(120);
    assert.equal(await page.locator('.about-editor-lane--section .about-editor-section-clip').count(), sectionCountBeforeDuplicate + 1);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(120);
    assert.equal(await page.locator('.about-editor-lane--section .about-editor-section-clip').count(), sectionCountBeforeDuplicate);

    await destinationCue.click();
    const audition = page.locator('.about-editor-audition');
    await audition.locator('summary').click();
    await audition.getByRole('button', { name: 'Loop this selection' }).click();
    await page.waitForTimeout(120);
    assert.equal(await page.locator('.about-editor-transport button[aria-label="Pause"]').count(), 1);
    await page.locator('.about-narrative-scrollport').hover();
    await page.mouse.wheel(0, 80);
    await page.waitForTimeout(120);
    assert.equal(await page.locator('.about-editor-transport button[aria-label="Play"]').count(), 1);

    const revealClip = page.locator('.about-editor-discipline-reveal');
    const revealTextClip = page
      .locator('.about-editor-lane--text .about-editor-clip')
      .filter({ has: revealClip });
    await revealClip.click();
    assert.equal(await revealClip.getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('.about-editor-inspector').textContent(), /One clip controls the complete six-point sequence/i);
    assert.match(await page.locator('.about-editor-inspector').textContent(), /Grid fade duration/i);
    assert.match(await page.locator('.about-editor-inspector').textContent(), /Reveal order and labels/i);
    const [revealTextClipBox, revealClipBox] = await Promise.all([revealTextClip.boundingBox(), revealClip.boundingBox()]);
    const lastPracticeCueBox = await revealTextClip.locator('.about-editor-cue').last().boundingBox();
    const revealLabelBeforeDrag = await revealClip.getAttribute('aria-label');
    assert.ok(revealTextClipBox && revealClipBox && lastPracticeCueBox);
    assert.ok(lastPracticeCueBox.x + lastPracticeCueBox.width <= revealClipBox.x, 'Practice titles should resolve before the Discipline reveal begins');
    await page.mouse.move(revealClipBox.x + (revealClipBox.width / 2), revealClipBox.y + (revealClipBox.height / 2));
    await page.mouse.down();
    await page.mouse.move(Math.max(revealTextClipBox.x + 8, revealClipBox.x + (revealClipBox.width / 2) - 12), revealClipBox.y + (revealClipBox.height / 2), { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    assert.notEqual(await revealClip.getAttribute('aria-label'), revealLabelBeforeDrag);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(100);
    assert.equal(await revealClip.getAttribute('aria-label'), revealLabelBeforeDrag);

    await worldClips.nth(1).locator('.about-editor-world-clip').click();
    const inspector = page.locator('.about-editor-inspector');
    assert.match(await inspector.textContent(), /Turbulent field/i);
    assert.match(await inspector.textContent(), /Cloud chunks/i);
    assert.match(await inspector.textContent(), /Swarm life/i);
    assert.match(await inspector.textContent(), /Local strength/i);
    assert.match(await inspector.textContent(), /Maps Cluster → Turbulent field/i);
    const correspondenceSelect = inspector.locator('select[aria-label="Correspondence"]');
    assert.equal(await correspondenceSelect.inputValue(), 'spatial-nearest-v1');
    assert.deepEqual(await correspondenceSelect.locator('option').allTextContents(), [
      'Index order',
      'Stable seed',
      'Local travel (legacy)',
      'Local travel',
      'Group aware (legacy)',
    ]);
    await correspondenceSelect.selectOption('stable-seed');
    assert.equal(await correspondenceSelect.inputValue(), 'stable-seed');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(120);
    assert.equal(await correspondenceSelect.inputValue(), 'spatial-nearest-v1');
    const inspectorHeader = inspector.locator('header').first();
    const [inspectorBefore, headerBox] = await Promise.all([inspector.boundingBox(), inspectorHeader.boundingBox()]);
    assert.ok(inspectorBefore && headerBox);
    await page.mouse.move(headerBox.x + 36, headerBox.y + (headerBox.height / 2));
    await page.mouse.down();
    await page.mouse.move(headerBox.x - 140, headerBox.y + 46, { steps: 6 });
    await page.mouse.up();
    const inspectorAfter = await inspector.boundingBox();
    assert.equal(await inspector.getAttribute('data-floating'), 'true');
    assert.ok(inspectorAfter.x < inspectorBefore.x - 80);
    assert.ok(inspectorAfter.y >= 0);
    assert.ok(inspectorAfter.x >= 0);
    assert.ok(inspectorAfter.x + inspectorAfter.width <= viewport.width);
    const editorBottomBoundary = await page.locator('[data-button-bar]').boundingBox();
    const timelineBoundary = await page.locator('.about-editor-bottom').boundingBox();
    if (timelineBoundary) assert.ok(inspectorAfter.y + inspectorAfter.height <= timelineBoundary.y);
    else if (editorBottomBoundary) assert.ok(inspectorAfter.y + inspectorAfter.height <= editorBottomBoundary.y);
    await inspectorHeader.dblclick();
    assert.equal(await inspector.getAttribute('data-floating'), 'false');

    const extendedWorldClip = page.locator('.about-editor-lane--world .about-editor-clip').nth(5);
    await extendedWorldClip.locator('.about-editor-world-clip').click();
    const transitionDetails = page.locator('.about-editor-inspector details').filter({ hasText: 'Transition in' });
    const transitionEnd = transitionDetails.locator('.about-editor-property').filter({ hasText: /^End/ }).locator('input[type="number"]');
    await transitionEnd.fill('1.8');
    await page.waitForTimeout(120);
    const transitionKeys = extendedWorldClip.locator('.about-editor-timing-key.is-world');
    assert.equal(await transitionKeys.count(), 2);
    const [extendedClipBox, transitionEndBox] = await Promise.all([
      extendedWorldClip.boundingBox(),
      transitionKeys.nth(1).boundingBox(),
    ]);
    assert.ok(extendedClipBox && transitionEndBox);
    assert.ok(transitionEndBox.x > extendedClipBox.x + extendedClipBox.width);
    await transitionKeys.nth(1).click({ force: true });
    await page.locator('.about-editor-delete-key').click();
    await page.waitForTimeout(120);
    assert.equal(await transitionKeys.count(), 0);
    assert.match(await transitionDetails.textContent(), /cuts in/i);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(120);
    assert.equal(await transitionKeys.count(), 2);

    const practice = page.locator('[data-narrative-section="practice-reveal"]');
    const revealWU = await getSectionStoryWU('practice-reveal', 1.3);
    await transport.fill(formatWU(revealWU));
    await page.waitForTimeout(180);
    assert.equal(await root.getAttribute('data-world-discipline-visible'), '6');
    assert.equal(await root.getAttribute('data-world-discipline-labels'), '6');
    assert.ok(Number(await root.getAttribute('data-world-grid-background')) > 0.95);
    const revealGeometry = await page.locator('.about-narrative-discipline-reveal li').evaluateAll((nodes) => {
      const centres = nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return rect.top + (rect.height / 2);
      }).sort((a, b) => a - b);
      return {
        centres,
        rects: nodes.map((node) => node.getBoundingClientRect().toJSON()),
        rootRect: document.querySelector('.about-narrative-lab').getBoundingClientRect().toJSON(),
        viewportWidth: document.documentElement.clientWidth,
        palette: nodes.map((node) => getComputedStyle(node).getPropertyValue('--discipline-color').trim()),
        expectedPalette: ['--ball-1', '--ball-4', '--ball-3', '--ball-7', '--ball-8', '--ball-6']
          .map((token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim()),
        opacities: nodes.map((node) => Number(getComputedStyle(node).opacity)),
      };
    });
    assert.ok(revealGeometry.opacities.every((opacity) => opacity > 0.8));
    assert.deepEqual(revealGeometry.palette, revealGeometry.expectedPalette);
    revealGeometry.rects.forEach((rect) => {
      assert.ok(rect.left >= -1, `${label}: discipline label should not escape the viewport left edge`);
      assert.ok(rect.right <= revealGeometry.viewportWidth + 1, `${label}: discipline label should not escape the viewport right edge`);
    });
    assert.ok(revealGeometry.centres.at(-1) - revealGeometry.centres[0] > 220);
    revealGeometry.centres.slice(1).forEach((value, index) => assert.ok(value - revealGeometry.centres[index] > 24));
    await page.screenshot({ path: `output/playwright/about-narrative/${browserName}-${label}-discipline-reveal.png` });

    const disciplinesSection = page.locator('[data-narrative-section="disciplines"]');
    await transport.fill(formatWU(await getSectionStoryWU('disciplines', 0.15)));
    await page.waitForFunction(() => (
      Number(document.querySelector('.about-narrative-lab')?.dataset.worldDisciplineLabels) > 0
    ));
    assert.equal(await root.getAttribute('data-world-discipline-visible'), '6');
    assert.equal(await root.getAttribute('data-world-discipline-labels'), '6');
    assert.ok(Number(await root.getAttribute('data-world-discipline-rise')) > 0);
    await transport.fill(formatWU(await getSectionStoryWU('disciplines', 0.95)));
    await page.waitForFunction(() => (
      document.querySelector('.about-narrative-lab')?.dataset.worldDisciplineLabels === '0'
    ));
    assert.equal(await root.getAttribute('data-world-discipline-visible'), '6');
    assert.equal(await root.getAttribute('data-world-discipline-labels'), '0');
    const editorialSafeArea = await page.evaluate(() => {
      const indicator = document.querySelector('.about-narrative-indicator').getBoundingClientRect();
      const editorial = document.querySelector('[data-narrative-section="disciplines"] .about-narrative-editorial-inner').getBoundingClientRect();
      return editorial.left - indicator.right;
    });
    assert.ok(editorialSafeArea >= 12, `${label}: editorial copy should clear the progress rail`);
    const influenceWU = await page.locator('[data-world-influence="true"]').evaluate((node) => {
      const scrollport = document.querySelector('.about-narrative-scrollport');
      const scrollRect = scrollport.getBoundingClientRect();
      const absoluteTop = node.getBoundingClientRect().top - scrollRect.top + scrollport.scrollTop;
      return (absoluteTop - (scrollport.clientHeight * 0.68)) / scrollport.clientHeight;
    });
    await transport.fill(formatWU(influenceWU));
    await page.waitForTimeout(140);
    assert.ok(Number(await root.getAttribute('data-world-grid-influence')) > 0.2);

    const practiceWU = await practice.evaluate((node) => {
      const scrollport = document.querySelector('.about-narrative-scrollport');
      const extent = node.offsetHeight / scrollport.clientHeight;
      return (node.offsetTop / scrollport.clientHeight) + (Math.max(0.001, extent - 1) * 0.45);
    });
    await transport.fill(formatWU(practiceWU));
    await page.locator('.about-editor-lane--world .about-editor-world-clip').nth(2).click();
    await page.waitForTimeout(120);
    const before = await root.evaluate((node) => ({
      camera: getComputedStyle(node).getPropertyValue('--narrative-camera-forward'),
      text: document.querySelector('[data-discipline-reveal]')?.textContent,
    }));
    await page.locator('.about-editor-shape-catalog button').filter({ hasText: 'Cluster' }).click();
    await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.worldTo === 'cluster-v1');
    const tried = await root.evaluate((node) => ({
      camera: getComputedStyle(node).getPropertyValue('--narrative-camera-forward'),
      text: document.querySelector('[data-discipline-reveal]')?.textContent,
      world: node.dataset.worldTo,
    }));
    assert.equal(tried.world, 'cluster-v1');
    assert.equal(tried.camera, before.camera);
    assert.equal(tried.text, before.text);
    await page.locator('.about-editor-try button').filter({ hasText: 'Cancel' }).click();
    await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.worldTo === 'calm-field-v1');
  }

  const bottomBar = page.locator('[data-button-bar]');
  const editorBottom = page.locator('.about-editor-bottom');
  if (await bottomBar.count()) {
    const [barBox, editorBox] = await Promise.all([bottomBar.boundingBox(), editorBottom.boundingBox()]);
    if (barBox && editorBox) {
      assert.ok(Math.abs(editorBox.y + editorBox.height - viewport.height) <= 1);
      assert.ok(editorBox.y < barBox.y && editorBox.y + editorBox.height > barBox.y);
    }
  }
  const timelineToggle = page.locator('.about-editor-timeline-toggle');
  await timelineToggle.click();
  assert.equal(await timelineToggle.getAttribute('aria-expanded'), 'false');
  await timelineToggle.click();
  assert.equal(await timelineToggle.getAttribute('aria-expanded'), 'true');
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `output/playwright/about-narrative/${browserName}-${label}.png` });
  await page.close();
}

async function auditReducedMotionCorrespondence() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${baseUrl}/about.html?edit=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.worldPrepare === 'ready');
  const transport = page.locator('.about-editor-transport input[type="range"]');
  const maxWU = Number(await transport.getAttribute('max'));
  await transport.fill(formatWU(Math.max(0, maxWU - 0.4)));
  await page.waitForFunction(() => {
    const state = document.querySelector('.about-narrative-lab')?.dataset;
    return state?.worldTo === 'bust-v1' && [
      'spatial-nearest-v1',
      'constrained-index-v1',
      'spatial-nearest-v2',
      'constrained-index-v2',
      'radial-emergence-v1',
    ].includes(state?.worldCorrespondence);
  });
  const root = page.locator('.about-narrative-lab');
  assert.equal(await root.getAttribute('data-world-correspondence-fallback'), '');
  assert.ok(Math.abs(await root.evaluate((node) => Number(getComputedStyle(node).getPropertyValue('--narrative-bust-yaw')))) < 0.0001);
  assert.deepEqual(errors, []);
  await page.close();
}

try {
  if (!editorOnly) {
    await auditProductionIndicator({ width: 1440, height: 1000 }, 'desktop');
    await auditProductionIndicator({ width: 390, height: 844 }, 'mobile');
    await auditSpaIndicator({ width: 1440, height: 1000 }, 'desktop');
    await auditSpaIndicator({ width: 390, height: 844 }, 'mobile');
  }
  if (!productionIndicatorOnly) {
    await audit({ width: 1440, height: 1000 }, 'desktop');
    await audit({ width: 390, height: 844 }, 'mobile');
    await auditReducedMotionCorrespondence();
  }
  console.log(`PASS: About Narrative ${productionIndicatorOnly ? 'production indicator' : 'runtime and editor'} (${browserName})`);
} finally {
  await browser.close();
}
