import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const outputDir = 'output/playwright/about-narrative-hardening/runtime';
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
  ],
});

await mkdir(outputDir, { recursive: true });

const checkpoints = [
  { id: 'desktop-orb', storyWU: 0.45, stage: 'cluster-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, expectCenteredOpener: true },
  { id: 'desktop-complexity-threshold', storyWU: 1.35, stage: 'turbulent-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-turbulent', storyWU: 3.2, stage: 'turbulent-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-void', storyWU: 5.3, stage: 'turbulent-field-v1', visibility: 0, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-grid-rise', storyWU: 7.15, stage: 'calm-field-v1', reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-grid-flyover', storyWU: 8.7, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-discipline', storyWU: 10.2, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, expectExactAnchor: true, minimumLabels: 6, expectCenteredDiscipline: true },
  { id: 'desktop-editorial-primary', storyWU: 11.72, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, minimumVisibleEditorialLines: 1 },
  { id: 'desktop-editorial-empty', storyWU: 12.5, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, expectEditorialBlank: true },
  { id: 'desktop-grid-return', storyWU: 15.55, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-ripple-close', storyWU: 16.1, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-ripple-wide', storyWU: 17.2, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-orbital-form', storyWU: 18.1, stage: 'orbital-system-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, minimumChromaticStudioEdgePx: 16 },
  { id: 'desktop-orbital-settled', storyWU: 18.7, stage: 'orbital-system-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-orbital-live', storyWU: 19.4, stage: 'orbital-system-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-bust-form', storyWU: 20.4, stage: 'bust-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, minimumChromaticHeightRatio: 0.18 },
  { id: 'desktop-bust', storyWU: 21.1, stage: 'bust-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'mobile-orb', storyWU: 0.45, stage: 'cluster-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, expectCenteredOpener: true },
  { id: 'mobile-complexity-inside', storyWU: 2.6, stage: 'turbulent-field-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-void', storyWU: 5.3, stage: 'turbulent-field-v1', visibility: 0, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-grid-floor', storyWU: 7.8, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-discipline', storyWU: 10.2, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, expectExactAnchor: true, minimumLabels: 6, expectCenteredDiscipline: true },
  { id: 'mobile-editorial-primary', storyWU: 11.72, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, minimumVisibleEditorialLines: 1 },
  { id: 'mobile-editorial-empty', storyWU: 12.5, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, expectEditorialBlank: true },
  { id: 'mobile-grid-return', storyWU: 15.55, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-ripple-wide', storyWU: 17.2, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-orbital-settled', storyWU: 18.7, stage: 'orbital-system-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, minimumChromaticWidthRatio: 0.3 },
  { id: 'mobile-orbital-live', storyWU: 19.4, stage: 'orbital-system-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-bust', storyWU: 21.1, stage: 'bust-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'reduced-motion-orb', storyWU: 0.45, stage: 'cluster-v1', visibility: 1, reviewGroup: 'reduced-motion', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', expectCenteredOpener: true },
  { id: 'reduced-motion-discipline', storyWU: 10.2, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'reduced-motion', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', expectExactAnchor: true, minimumLabels: 6, expectCenteredDiscipline: true },
  { id: 'reduced-motion-editorial-primary', storyWU: 11.72, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'reduced-motion', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', minimumVisibleEditorialLines: 1 },
  { id: 'reduced-motion-editorial-empty', storyWU: 12.5, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'reduced-motion', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' },
  { id: 'reduced-motion-mobile-orbital', storyWU: 19.4, stage: 'orbital-system-v1', visibility: 1, reviewGroup: 'reduced-motion', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
  { id: 'reduced-motion-mobile-bust', storyWU: 21.1, stage: 'bust-v1', visibility: 1, reviewGroup: 'reduced-motion', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
];

const STORY_WU_TOLERANCE = 0.04;
const VISIBILITY_TOLERANCE = 0.02;
const CONTACT_SHEET_LAYOUTS = {
  desktop: { columns: 4, panelWidth: 360, imageHeight: 250, labelHeight: 32 },
  mobile: { columns: 5, panelWidth: 220, imageHeight: 476, labelHeight: 32 },
  'reduced-motion': { columns: 4, panelWidth: 360, imageHeight: 422, labelHeight: 32 },
};

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function measureChromaticBounds(pathname) {
  const { data, info } = await sharp(pathname)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  const columnCounts = new Uint32Array(info.width);
  const rowCounts = new Uint32Array(info.height);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = ((y * info.width) + x) * info.channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const maximum = Math.max(red, green, blue);
      const minimum = Math.min(red, green, blue);
      if (maximum < 90 || maximum - minimum < 45) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      count += 1;
      columnCounts[x] += 1;
      rowCounts[y] += 1;
    }
  }
  const tailPixelCount = count * 0.005;
  const findTrimmedStart = (counts) => {
    let cumulative = 0;
    for (let index = 0; index < counts.length; index += 1) {
      cumulative += counts[index];
      if (cumulative > tailPixelCount) return index;
    }
    return 0;
  };
  const findTrimmedEnd = (counts) => {
    let cumulative = 0;
    for (let index = counts.length - 1; index >= 0; index -= 1) {
      cumulative += counts[index];
      if (cumulative > tailPixelCount) return index;
    }
    return counts.length - 1;
  };
  const width = maxX >= minX ? (maxX - minX) + 1 : 0;
  const height = maxY >= minY ? (maxY - minY) + 1 : 0;
  const trimmedLeft = count > 0 ? findTrimmedStart(columnCounts) : 0;
  const trimmedRight = count > 0 ? findTrimmedEnd(columnCounts) : 0;
  const trimmedTop = count > 0 ? findTrimmedStart(rowCounts) : 0;
  const trimmedBottom = count > 0 ? findTrimmedEnd(rowCounts) : 0;
  return {
    count,
    x: width ? minX : 0,
    y: height ? minY : 0,
    width,
    height,
    widthRatio: width / info.width,
    heightRatio: height / info.height,
    trimmed: {
      x: trimmedLeft,
      y: trimmedTop,
      width: count > 0 ? (trimmedRight - trimmedLeft) + 1 : 0,
      height: count > 0 ? (trimmedBottom - trimmedTop) + 1 : 0,
    },
  };
}

async function createContactSheet(group, groupEvidence) {
  const layout = CONTACT_SHEET_LAYOUTS[group];
  assert.ok(layout, `Missing contact-sheet layout for ${group}.`);
  assert.ok(groupEvidence.length > 0, `No checkpoints were captured for ${group}.`);

  const gutter = 12;
  const columns = Math.min(layout.columns, groupEvidence.length);
  const rows = Math.ceil(groupEvidence.length / columns);
  const panelHeight = layout.imageHeight + layout.labelHeight;
  const width = (columns * layout.panelWidth) + ((columns + 1) * gutter);
  const height = (rows * panelHeight) + ((rows + 1) * gutter);
  const panels = await Promise.all(groupEvidence.map(async (item) => {
    const screenshot = await sharp(item.screenshot)
      .resize({
        width: layout.panelWidth,
        height: layout.imageHeight,
        fit: 'contain',
        background: '#111111',
      })
      .png()
      .toBuffer();
    const label = Buffer.from(`
      <svg width="${layout.panelWidth}" height="${layout.labelHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f1e9"/>
        <text x="10" y="21" fill="#111111" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700">
          ${escapeXml(item.id)} · WU ${item.storyWU.toFixed(2)}
        </text>
      </svg>
    `);
    return sharp({
      create: {
        width: layout.panelWidth,
        height: panelHeight,
        channels: 4,
        background: '#111111',
      },
    })
      .composite([
        { input: screenshot, left: 0, top: 0 },
        { input: label, left: 0, top: layout.imageHeight },
      ])
      .png()
      .toBuffer();
  }));
  const contactSheetPath = `${outputDir}/contact-sheet-${group}.png`;
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#050505',
    },
  })
    .composite(panels.map((input, index) => ({
      input,
      left: gutter + ((index % columns) * (layout.panelWidth + gutter)),
      top: gutter + (Math.floor(index / columns) * (panelHeight + gutter)),
    })))
    .png()
    .toFile(contactSheetPath);
  return contactSheetPath;
}

const evidence = [];
for (const checkpoint of checkpoints) {
  const context = await browser.newContext({
    viewport: checkpoint.viewport,
    reducedMotion: checkpoint.reducedMotion || 'no-preference',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(`${baseUrl}/lab/about-narrative.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-narrative-lab', { timeout: 20_000 });
  await page.evaluate(({ storyWU }) => {
    const scrollport = document.querySelector('.about-narrative-scrollport');
    if (!scrollport) return;
    const progress = Math.min(1, Math.max(0, storyWU / 21.8));
    const scrollTravel = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
    scrollport.scrollTo(0, scrollTravel * progress);
    scrollport.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, checkpoint);
  await page.waitForFunction(({
    storyWU,
    stage,
    expectedVisibility,
    minimumLabels,
  }) => {
    const root = document.querySelector('.about-narrative-lab');
    const sampledStoryWU = Number(root?.dataset.narrativeStoryWu);
    const sampledVisibility = Number(root?.dataset.worldVisibility);
    const storyReady = Number.isFinite(sampledStoryWU)
      && Math.abs(sampledStoryWU - storyWU) <= 0.04;
    const visibilityReady = expectedVisibility == null
      || (Number.isFinite(sampledVisibility)
        && Math.abs(sampledVisibility - expectedVisibility) <= 0.02);
    const labelsReady = Number(root?.dataset.worldDisciplineLabels || 0) >= minimumLabels;
    return storyReady
      && visibilityReady
      && labelsReady
      && root?.dataset.worldPrepare === 'ready'
      && root.dataset.worldStage === stage
      && window.__aboutNarrativeRuntime?.getMetrics?.().fixedAttributeIdentityStable === true;
  }, {
    storyWU: checkpoint.storyWU,
    stage: checkpoint.stage,
    expectedVisibility: checkpoint.visibility ?? null,
    minimumLabels: checkpoint.minimumLabels ?? 0,
  }, { timeout: 30_000 });
  await page.waitForTimeout(250);

  const state = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const canvas = document.querySelector('.about-narrative-world__canvas');
    const metrics = window.__aboutNarrativeRuntime.getMetrics();
    const rootRect = root?.getBoundingClientRect();
    const openerRect = document.querySelector('.about-narrative-opening-copy [data-primary-copy]')
      ?.getBoundingClientRect();
    const visibleEditorialLines = [...document.querySelectorAll('[data-editorial-line]')]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return Number(getComputedStyle(node).opacity) > 0.05
          && rect.bottom > 0
          && rect.top < window.innerHeight;
      });
    const visibleDisciplineRects = [...document.querySelectorAll('.about-narrative-discipline-reveal li')]
      .filter((node) => Number(getComputedStyle(node).opacity) > 0.05)
      .map((node) => node.getBoundingClientRect());
    const disciplineBounds = visibleDisciplineRects.length > 0 ? {
      left: Math.min(...visibleDisciplineRects.map((rect) => rect.left)),
      right: Math.max(...visibleDisciplineRects.map((rect) => rect.right)),
      top: Math.min(...visibleDisciplineRects.map((rect) => rect.top)),
      bottom: Math.max(...visibleDisciplineRects.map((rect) => rect.bottom)),
    } : null;
    return {
      storyWU: Number(root?.dataset.narrativeStoryWu),
      visibility: Number(root?.dataset.worldVisibility),
      activeWorld: root?.dataset.activeNarrativeWorld || '',
      worldFrom: root?.dataset.worldFrom || '',
      worldTo: root?.dataset.worldTo || '',
      stage: root?.dataset.worldStage || '',
      prepare: root?.dataset.worldPrepare || '',
      anchorSampling: root?.dataset.worldAnchorSampling || '',
      disciplineLabels: Number(root?.dataset.worldDisciplineLabels || 0),
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      drawCalls: metrics.drawCalls,
      fixedAttributeIdentityStable: metrics.fixedAttributeIdentityStable,
      resourceDiagnosticCount: metrics.resourceDiagnosticCount,
      canvasRect: rootRect ? {
        left: rootRect.left,
        top: rootRect.top,
        right: rootRect.right,
        bottom: rootRect.bottom,
      } : null,
      openerCenterOffsetRatio: rootRect && openerRect
        ? Math.abs((openerRect.left + (openerRect.width / 2)) - (rootRect.left + (rootRect.width / 2)))
          / rootRect.width
        : null,
      visibleEditorialLineCount: visibleEditorialLines.length,
      disciplineCenterOffsetRatio: rootRect && disciplineBounds
        ? Math.abs(((disciplineBounds.left + disciplineBounds.right) / 2)
          - (rootRect.left + (rootRect.width / 2))) / rootRect.width
        : null,
    };
  });
  const screenshot = `${outputDir}/${checkpoint.id}.png`;
  await page.screenshot({ path: screenshot, fullPage: false });
  const chromaticBounds = await measureChromaticBounds(screenshot);
  state.chromaticBounds = chromaticBounds;
  const trimmedChromaticBounds = chromaticBounds.trimmed;
  state.chromaticStudioEdgeClearance = state.canvasRect && chromaticBounds.count > 0
    ? Math.min(
      trimmedChromaticBounds.x - state.canvasRect.left,
      state.canvasRect.right - (trimmedChromaticBounds.x + trimmedChromaticBounds.width),
      trimmedChromaticBounds.y - state.canvasRect.top,
      state.canvasRect.bottom - (trimmedChromaticBounds.y + trimmedChromaticBounds.height),
    )
    : null;

  assert.ok(
    Math.abs(state.storyWU - checkpoint.storyWU) <= STORY_WU_TOLERANCE,
    `${checkpoint.id}: rendered WU ${state.storyWU} instead of ${checkpoint.storyWU}`,
  );
  assert.equal(state.stage, checkpoint.stage);
  assert.equal(state.prepare, 'ready');
  assert.ok(state.canvasWidth > 0 && state.canvasHeight > 0);
  assert.ok(Number.isFinite(state.visibility));
  assert.ok(state.visibility >= 0 && state.visibility <= 1);
  if (checkpoint.visibility !== undefined) {
    assert.ok(
      Math.abs(state.visibility - checkpoint.visibility) <= VISIBILITY_TOLERANCE,
      `${checkpoint.id}: expected visibility ${checkpoint.visibility}, received ${state.visibility}`,
    );
  }
  assert.equal(state.drawCalls, state.visibility > 0.001 ? 1 : 0);
  assert.equal(state.fixedAttributeIdentityStable, true);
  assert.equal(state.resourceDiagnosticCount, 0);
  if (checkpoint.expectExactAnchor) assert.equal(state.anchorSampling, 'exact');
  if (checkpoint.minimumLabels !== undefined) {
    assert.ok(
      state.disciplineLabels >= checkpoint.minimumLabels,
      `${checkpoint.id}: expected at least ${checkpoint.minimumLabels} labels, received ${state.disciplineLabels}`,
    );
  }
  if (checkpoint.expectCenteredOpener) {
    assert.ok(
      state.openerCenterOffsetRatio <= 0.01,
      `${checkpoint.id}: opener center offset ${(state.openerCenterOffsetRatio * 100).toFixed(2)}% exceeds 1%.`,
    );
  }
  if (checkpoint.expectCenteredDiscipline) {
    assert.ok(
      state.disciplineCenterOffsetRatio <= 0.2,
      `${checkpoint.id}: discipline center offset ${(state.disciplineCenterOffsetRatio * 100).toFixed(2)}% exceeds 20%.`,
    );
  }
  if (checkpoint.minimumVisibleEditorialLines !== undefined) {
    assert.ok(
      state.visibleEditorialLineCount >= checkpoint.minimumVisibleEditorialLines,
      `${checkpoint.id}: expected visible editorial copy.`,
    );
  }
  if (checkpoint.expectEditorialBlank) {
    assert.equal(
      state.visibleEditorialLineCount,
      0,
      `${checkpoint.id}: editorial copy is clipped through the blank handoff.`,
    );
  }
  if (checkpoint.minimumChromaticWidthRatio !== undefined) {
    assert.ok(
      chromaticBounds.widthRatio >= checkpoint.minimumChromaticWidthRatio,
      `${checkpoint.id}: chromatic field width ${(chromaticBounds.widthRatio * 100).toFixed(2)}% is too small.`,
    );
  }
  if (checkpoint.minimumChromaticHeightRatio !== undefined) {
    assert.ok(
      chromaticBounds.heightRatio >= checkpoint.minimumChromaticHeightRatio,
      `${checkpoint.id}: chromatic field height ${(chromaticBounds.heightRatio * 100).toFixed(2)}% is too small.`,
    );
  }
  if (checkpoint.minimumChromaticStudioEdgePx !== undefined) {
    assert.ok(
      state.chromaticStudioEdgeClearance >= checkpoint.minimumChromaticStudioEdgePx,
      `${checkpoint.id}: chromatic field is only ${state.chromaticStudioEdgeClearance.toFixed(2)}px from the studio-window edge.`,
    );
  }
  assert.deepEqual(consoleErrors, []);

  evidence.push({ ...checkpoint, state, consoleErrors, screenshot });
  await context.close();
}

const contactSheets = {};
for (const group of Object.keys(CONTACT_SHEET_LAYOUTS)) {
  contactSheets[group] = await createContactSheet(
    group,
    evidence.filter((item) => item.reviewGroup === group),
  );
}

await writeFile(
  `${outputDir}/visual-checkpoints.json`,
  `${JSON.stringify({
    baseUrl,
    recordedAt: new Date().toISOString(),
    contactSheets,
    checkpoints: evidence,
  }, null, 2)}\n`,
);
await browser.close();
console.log(`PASS: ${checkpoints.length} runtime visual checkpoints and ${Object.keys(contactSheets).length} contact sheets are ready, stable, and diagnostic-free.`);
