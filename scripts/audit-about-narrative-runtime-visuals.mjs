import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import sharp from 'sharp';
import {
  compileAboutNarrativeRuntimePlan,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';
import {
  projectAboutNarrativePointFieldDocumentToVersion5,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = String(process.env.ABS_BROWSER || 'chromium').trim().toLowerCase();
assert.ok(
  browserName === 'chromium' || browserName === 'webkit',
  `Unsupported About Narrative visual-audit browser: ${browserName}`,
);
const outputDir = browserName === 'chromium'
  ? 'output/playwright/about-narrative-hardening/runtime'
  : `output/playwright/about-narrative-hardening/runtime-${browserName}`;
const browserType = browserName === 'webkit' ? webkit : chromium;
const browserLaunchOptions = browserName === 'chromium'
  ? {
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader-webgl',
      '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox',
    ],
  }
  : { headless: true };
const browser = await browserType.launch({
  ...browserLaunchOptions,
});

await mkdir(outputDir, { recursive: true });

const canonicalV6 = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const canonical = projectAboutNarrativePointFieldDocumentToVersion5(canonicalV6);
const bustWorld = canonical.tracks.worlds.objects.find((world) => world.id === 'world-emergent');
assert.ok(bustWorld, 'The visual audit requires the canonical emergent World.');
const bustStartWU = Number(bustWorld.transitionIn.startWU);
const bustEndWU = Number(bustWorld.transitionIn.endWU);
assert.ok(
  Number.isFinite(bustStartWU) && Number.isFinite(bustEndWU) && bustStartWU < bustEndWU,
  'The canonical emergent World requires an ordered finite transition window.',
);
const bustWU = (progress) => bustStartWU + ((bustEndWU - bustStartWU) * progress);
const finaleWU = Number(canonical.profiles.desktop.storyDurationWU) - 0.15;
assert.ok(
  Number.isFinite(finaleWU) && finaleWU >= bustEndWU,
  'The visual-audit finale must follow the emergent World transition.',
);

const checkpointSpecs = [
  { id: 'desktop-orb', storyWU: 0.35, stage: 'cluster-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, expectCenteredOpener: true },
  { id: 'desktop-complexity-threshold', storyWU: 1.35, stage: 'turbulent-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-complexity-through', storyWU: 1.75, stage: 'turbulent-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, minimumChromaticCoverageRatio: 0.002, maximumChromaticTitleCoverage: 0.04 },
  { id: 'desktop-turbulent', storyWU: 2.6, stage: 'turbulent-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-void', storyWU: 3.78, stage: 'turbulent-field-v1', visibility: 0, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-background-editorial', storyWU: 4.3, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, minimumVisibleEditorialLines: 1, maximumLabels: 0, maximumSpatialTitles: 0 },
  { id: 'desktop-client-logos', storyWU: 5.25, stage: 'calm-field-v1', reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, maximumLabels: 0, maximumSpatialTitles: 0 },
  { id: 'desktop-grid-flyover', storyWU: 6.2, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0 },
  { id: 'desktop-bridge-resolve', storyWU: 6.65, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0 },
  { id: 'desktop-bridge-move', storyWU: 7.55, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0 },
  { id: 'desktop-discipline-entry', storyWU: 8.25, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0 },
  { id: 'desktop-discipline-middle', storyWU: 8.72, stage: 'calm-field-v1', visibility: 0.99, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0, minimumChromaticCoverageRatio: 0.0001 },
  { id: 'desktop-discipline-exit', storyWU: 9.18, stage: 'calm-field-v1', visibility: 0.964, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0 },
  { id: 'desktop-editorial', storyWU: 9.8, stage: 'calm-field-v1', visibility: 0.916, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, maximumLabels: 0, maximumSpatialTitles: 0 },
  { id: 'desktop-editorial-complete', storyWU: 10.2, stage: 'calm-field-v1', visibility: 0.887, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, maximumLabels: 0, maximumSpatialTitles: 0 },
  { id: 'desktop-grid-return', storyWU: 11.7, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-gathering-close', storyWU: 12.5, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-gathering-wide', storyWU: 13.2, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-bust-base', storyWU: bustWU(0.05), stage: 'bust-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-bust-forming', storyWU: bustWU(0.25), stage: 'bust-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-bust-upper', storyWU: bustWU(0.4), stage: 'bust-v1', reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-bust-title', storyWU: bustWU(0.65), stage: 'bust-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, maximumChromaticTitleCoverage: 0.02 },
  { id: 'desktop-bust-resolved', storyWU: bustWU(0.85), stage: 'bust-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 }, minimumChromaticWidthRatio: 0.17, minimumChromaticHeightRatio: 0.25, minimumChromaticStudioEdgePx: 16 },
  { id: 'desktop-bust-hold', storyWU: bustEndWU, stage: 'bust-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'desktop-finale-bust', storyWU: finaleWU, stage: 'bust-v1', visibility: 1, reviewGroup: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'mobile-orb', storyWU: 0.35, stage: 'cluster-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, expectCenteredOpener: true },
  { id: 'mobile-complexity-through', storyWU: 1.75, stage: 'turbulent-field-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, minimumChromaticCoverageRatio: 0.004, maximumChromaticTitleCoverage: 0.04 },
  { id: 'mobile-complexity-inside', storyWU: 2.6, stage: 'turbulent-field-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-void', storyWU: 3.78, stage: 'turbulent-field-v1', visibility: 0, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-background-editorial', storyWU: 4.3, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, minimumVisibleEditorialLines: 1, maximumLabels: 0, maximumSpatialTitles: 0 },
  { id: 'mobile-client-logos', storyWU: 5.25, stage: 'calm-field-v1', visibility: 0.507, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, maximumLabels: 0, maximumSpatialTitles: 0 },
  { id: 'mobile-grid-floor', storyWU: 6.2, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0 },
  { id: 'mobile-bridge-move', storyWU: 7.55, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0 },
  { id: 'mobile-discipline-entry', storyWU: 8.25, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0 },
  { id: 'mobile-discipline-middle', storyWU: 8.72, stage: 'calm-field-v1', visibility: 0.99, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0, minimumChromaticCoverageRatio: 0.0001 },
  { id: 'mobile-discipline-exit', storyWU: 9.18, stage: 'calm-field-v1', visibility: 0.964, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0 },
  { id: 'mobile-editorial', storyWU: 9.8, stage: 'calm-field-v1', visibility: 0.916, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, maximumLabels: 0, maximumSpatialTitles: 0 },
  { id: 'mobile-editorial-complete', storyWU: 10.2, stage: 'calm-field-v1', visibility: 0.887, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, maximumLabels: 0, maximumSpatialTitles: 0 },
  { id: 'mobile-grid-return', storyWU: 11.7, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-gathering-wide', storyWU: 13.2, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-bust-base', storyWU: bustWU(0.05), stage: 'bust-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-bust-forming', storyWU: bustWU(0.25), stage: 'bust-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-bust-upper', storyWU: bustWU(0.4), stage: 'bust-v1', reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-bust-title', storyWU: bustWU(0.65), stage: 'bust-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, maximumChromaticTitleCoverage: 0.01 },
  { id: 'mobile-bust-resolved', storyWU: bustWU(0.85), stage: 'bust-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 }, minimumChromaticWidthRatio: 0.3, minimumChromaticHeightRatio: 0.2 },
  { id: 'mobile-bust-hold', storyWU: bustEndWU, stage: 'bust-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'mobile-finale-bust', storyWU: finaleWU, stage: 'bust-v1', visibility: 1, reviewGroup: 'mobile', viewport: { width: 390, height: 844 } },
  { id: 'compact-landscape-discipline', storyWU: 8.72, stage: 'calm-field-v1', visibility: 0.99, reviewGroup: 'compact-landscape', viewport: { width: 844, height: 390 }, minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0, minimumChromaticCoverageRatio: 0.0001 },
  { id: 'compact-landscape-bust-hold', storyWU: bustEndWU, stage: 'bust-v1', visibility: 1, reviewGroup: 'compact-landscape', viewport: { width: 844, height: 390 }, minimumChromaticWidthRatio: 0.08, minimumChromaticHeightRatio: 0.2 },
  { id: 'compact-landscape-finale', storyWU: finaleWU, stage: 'bust-v1', visibility: 1, reviewGroup: 'compact-landscape', viewport: { width: 844, height: 390 }, minimumChromaticWidthRatio: 0.08, minimumChromaticHeightRatio: 0.2 },
  { id: 'reduced-motion-orb', storyWU: 0.35, stage: 'cluster-v1', visibility: 1, reviewGroup: 'reduced-motion', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', expectCenteredOpener: true },
  { id: 'reduced-motion-background-editorial', storyWU: 4.3, stage: 'calm-field-v1', visibility: 0, reviewGroup: 'reduced-motion', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', minimumVisibleEditorialLines: 1, maximumLabels: 0, maximumSpatialTitles: 0 },
  { id: 'reduced-motion-client-logos', storyWU: 6.15, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'reduced-motion', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0 },
  { id: 'reduced-motion-bridge', storyWU: 7.55, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'reduced-motion', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0 },
  { id: 'reduced-motion-discipline', storyWU: 8.9, stage: 'calm-field-v1', visibility: 1, reviewGroup: 'reduced-motion', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', minimumLabels: 1, maximumLabels: 1, maximumSpatialTitles: 0, minimumChromaticCoverageRatio: 0.0001 },
  { id: 'reduced-motion-bust', storyWU: bustEndWU, stage: 'bust-v1', visibility: 1, reviewGroup: 'reduced-motion', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', minimumChromaticWidthRatio: 0.3 },
  { id: 'reduced-motion-finale', storyWU: finaleWU, stage: 'bust-v1', visibility: 1, reviewGroup: 'reduced-motion', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
];
const requestedCheckpointIds = new Set(
  String(process.env.ABS_ABOUT_RUNTIME_CHECKPOINTS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);
const activeCheckpointSpecs = requestedCheckpointIds.size
  ? checkpointSpecs.filter(({ id }) => requestedCheckpointIds.has(id))
  : checkpointSpecs;
assert.equal(
  activeCheckpointSpecs.length,
  requestedCheckpointIds.size || checkpointSpecs.length,
  'Every requested runtime visual checkpoint must exist.',
);
const planCache = new Map();
const checkpoints = activeCheckpointSpecs.map((checkpoint) => {
  const planKey = [
    checkpoint.viewport.width,
    checkpoint.viewport.height,
    checkpoint.reducedMotion || 'no-preference',
  ].join(':');
  let plan = planCache.get(planKey);
  if (!plan) {
    plan = compileAboutNarrativeRuntimePlan(canonical, {
      inlineSize: checkpoint.viewport.width,
      blockSize: checkpoint.viewport.height,
      prefersReducedMotion: checkpoint.reducedMotion === 'reduce',
    });
    assert.equal(plan.valid, true, `Could not compile visual-audit plan ${planKey}.`);
    planCache.set(planKey, plan);
  }
  return {
    ...checkpoint,
    storyDurationWU: plan.durationWU,
  };
});
const STORY_WU_TOLERANCE = 0.04;
const VISIBILITY_TOLERANCE = 0.02;
const CONTACT_SHEET_LAYOUTS = {
  desktop: { columns: 4, panelWidth: 360, imageHeight: 250, labelHeight: 32 },
  mobile: { columns: 5, panelWidth: 220, imageHeight: 476, labelHeight: 32 },
  'compact-landscape': { columns: 3, panelWidth: 422, imageHeight: 195, labelHeight: 32 },
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

async function measureChromaticCoverage(pathname, bounds, padding = 0) {
  if (!bounds) return null;
  const source = sharp(pathname).removeAlpha();
  const metadata = await source.metadata();
  const left = Math.max(0, Math.floor(bounds.left - padding));
  const top = Math.max(0, Math.floor(bounds.top - padding));
  const right = Math.min(metadata.width, Math.ceil(bounds.right + padding));
  const bottom = Math.min(metadata.height, Math.ceil(bounds.bottom + padding));
  if (right <= left || bottom <= top) return null;
  const { data, info } = await source
    .extract({ left, top, width: right - left, height: bottom - top })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let count = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    if (maximum > 90 && maximum - minimum >= 45) count += 1;
  }
  return {
    count,
    coverage: count / (info.width * info.height),
    bounds: { left, top, right, bottom },
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

  await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.about-narrative-lab', { timeout: 20_000 });
  await page.evaluate(({ storyWU, storyDurationWU }) => {
    const scrollport = document.querySelector('.about-narrative-scrollport');
    if (!scrollport) return;
    const progress = Math.min(1, Math.max(0, storyWU / storyDurationWU));
    const scrollTravel = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
    scrollport.scrollTo(0, scrollTravel * progress);
    scrollport.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, checkpoint);
  try {
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
  } catch (error) {
    const pendingState = await page.evaluate(() => {
      const root = document.querySelector('.about-narrative-lab');
      return {
        storyWU: root?.dataset.narrativeStoryWu || '',
        visibility: root?.dataset.worldVisibility || '',
        labels: root?.dataset.worldDisciplineLabels || '',
        prepare: root?.dataset.worldPrepare || '',
        stage: root?.dataset.worldStage || '',
        pointState: root?.dataset.pointWorldState || '',
        worldError: root?.dataset.worldError || '',
      };
    });
    throw new Error(
      `${checkpoint.id}: runtime checkpoint did not settle: ${JSON.stringify(pendingState)}`,
      { cause: error },
    );
  }
  await page.waitForTimeout(250);

  const state = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const canvas = document.querySelector('.about-narrative-world__canvas');
    const metrics = window.__aboutNarrativeRuntime.getMetrics();
    const rootRect = root?.getBoundingClientRect();
    const textCorridorRect = document.querySelector('[data-about-text-corridor]')
      ?.getBoundingClientRect();
    const openerRect = document.querySelector('.about-narrative-opening-copy [data-primary-copy]')
      ?.getBoundingClientRect();
    const visibleEditorialLines = [...document.querySelectorAll('[data-editorial-reveal]')]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return Number(getComputedStyle(node).opacity) > 0.05
          && rect.bottom > 0
          && rect.top < window.innerHeight;
      });
    const visibleEditorialRects = visibleEditorialLines.map((node) => node.getBoundingClientRect());
    const visibleDisciplines = [...document.querySelectorAll('.about-narrative-discipline-reveal li')]
      .filter((node) => Number(getComputedStyle(node).opacity) > 0.05);
    const visibleDisciplineRects = visibleDisciplines.map((node) => node.getBoundingClientRect());
    const disciplineTypeSizesMatch = visibleDisciplines.every((node) => {
      const title = node.querySelector('.about-narrative-discipline-reveal__label');
      const description = node.querySelector('.about-narrative-discipline-reveal__description');
      return title && description
        && getComputedStyle(title).fontSize === getComputedStyle(description).fontSize;
    });
    const visibleSpatialTitles = [...document.querySelectorAll('.about-narrative-spatial-fragment')]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return Number(getComputedStyle(node).opacity) > 0.05
          && rect.bottom > 0
          && rect.top < window.innerHeight;
      });
    const visibleSpatialTitleBounds = visibleSpatialTitles.map((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      };
    });
    const disciplineBounds = visibleDisciplineRects.length > 0 ? {
      left: Math.min(...visibleDisciplineRects.map((rect) => rect.left)),
      right: Math.max(...visibleDisciplineRects.map((rect) => rect.right)),
      top: Math.min(...visibleDisciplineRects.map((rect) => rect.top)),
      bottom: Math.max(...visibleDisciplineRects.map((rect) => rect.bottom)),
    } : null;
    const isInsideTextCorridor = (rect) => Boolean(textCorridorRect)
      && rect.left >= textCorridorRect.left - 1
      && rect.right <= textCorridorRect.right + 1;
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
      textCorridorRect: textCorridorRect ? {
        left: textCorridorRect.left,
        right: textCorridorRect.right,
        width: textCorridorRect.width,
      } : null,
      openerCenterOffsetRatio: rootRect && openerRect
        ? Math.abs((openerRect.left + (openerRect.width / 2)) - (rootRect.left + (rootRect.width / 2)))
          / rootRect.width
        : null,
      visibleEditorialLineCount: visibleEditorialLines.length,
      visibleSpatialTitleCount: visibleSpatialTitles.length,
      visibleSpatialTitleBounds,
      disciplineCenterOffsetRatio: rootRect && disciplineBounds
        ? Math.abs(((disciplineBounds.left + disciplineBounds.right) / 2)
          - (rootRect.left + (rootRect.width / 2))) / rootRect.width
        : null,
      disciplineWithinTextCorridor: textCorridorRect && disciplineBounds
        ? isInsideTextCorridor(disciplineBounds)
        : null,
      disciplineTypeSizesMatch,
      spatialTitlesWithinTextCorridor: textCorridorRect && visibleSpatialTitleBounds.length > 0
        ? visibleSpatialTitleBounds.every(isInsideTextCorridor)
        : null,
      editorialWithinTextCorridor: textCorridorRect && visibleEditorialRects.length > 0
        ? visibleEditorialRects.every(isInsideTextCorridor)
        : null,
    };
  });
  const screenshot = `${outputDir}/${checkpoint.id}.png`;
  await page.screenshot({ path: screenshot, fullPage: false });
  const chromaticBounds = await measureChromaticBounds(screenshot);
  state.chromaticBounds = chromaticBounds;
  state.spatialTitleChromaticCoverage = await measureChromaticCoverage(
    screenshot,
    state.visibleSpatialTitleBounds[0] || null,
    24,
  );
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
  if ((checkpoint.minimumLabels ?? 0) > 0) {
    assert.equal(state.anchorSampling, 'native-grid-cell');
    assert.equal(
      state.disciplineWithinTextCorridor,
      true,
      `${checkpoint.id}: the discipline reading line must remain inside the global text corridor.`,
    );
    assert.equal(
      state.disciplineTypeSizesMatch,
      true,
      `${checkpoint.id}: discipline names and descriptions must share the editorial font size.`,
    );
  }
  if (state.spatialTitlesWithinTextCorridor !== null) {
    assert.equal(
      state.spatialTitlesWithinTextCorridor,
      true,
      `${checkpoint.id}: visible spatial titles must remain inside the global text corridor.`,
    );
  }
  if (state.editorialWithinTextCorridor !== null) {
    assert.equal(
      state.editorialWithinTextCorridor,
      true,
      `${checkpoint.id}: visible editorial text must remain inside the global text corridor.`,
    );
  }
  if (checkpoint.minimumLabels !== undefined) {
    assert.ok(
      state.disciplineLabels >= checkpoint.minimumLabels,
      `${checkpoint.id}: expected at least ${checkpoint.minimumLabels} labels, received ${state.disciplineLabels}`,
    );
  }
  if (checkpoint.maximumLabels !== undefined) {
    assert.ok(
      state.disciplineLabels <= checkpoint.maximumLabels,
      `${checkpoint.id}: expected at most ${checkpoint.maximumLabels} labels, received ${state.disciplineLabels}`,
    );
  }
  if (checkpoint.minimumSpatialTitles !== undefined) {
    assert.ok(
      state.visibleSpatialTitleCount >= checkpoint.minimumSpatialTitles,
      `${checkpoint.id}: expected at least ${checkpoint.minimumSpatialTitles} spatial titles, received ${state.visibleSpatialTitleCount}`,
    );
  }
  if (checkpoint.maximumSpatialTitles !== undefined) {
    assert.ok(
      state.visibleSpatialTitleCount <= checkpoint.maximumSpatialTitles,
      `${checkpoint.id}: expected at most ${checkpoint.maximumSpatialTitles} spatial titles, received ${state.visibleSpatialTitleCount}`,
    );
  }
  if (checkpoint.expectCenteredOpener) {
    assert.ok(
      state.openerCenterOffsetRatio <= 0.01,
      `${checkpoint.id}: opener center offset ${(state.openerCenterOffsetRatio * 100).toFixed(2)}% exceeds 1%.`,
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
  if (checkpoint.minimumChromaticCoverageRatio !== undefined) {
    const coverageRatio = chromaticBounds.count / (checkpoint.viewport.width * checkpoint.viewport.height);
    assert.ok(
      coverageRatio >= checkpoint.minimumChromaticCoverageRatio,
      `${checkpoint.id}: chromatic coverage ${(coverageRatio * 100).toFixed(2)}% is too sparse.`,
    );
  }
  if (checkpoint.maximumChromaticTitleCoverage !== undefined) {
    assert.ok(
      state.spatialTitleChromaticCoverage,
      `${checkpoint.id}: expected a measurable spatial title.`,
    );
    assert.ok(
      state.spatialTitleChromaticCoverage.coverage <= checkpoint.maximumChromaticTitleCoverage,
      `${checkpoint.id}: chromatic material covers ${(state.spatialTitleChromaticCoverage.coverage * 100).toFixed(2)}% of the title clearance zone.`,
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
const activeReviewGroups = new Set(evidence.map((item) => item.reviewGroup));
for (const group of Object.keys(CONTACT_SHEET_LAYOUTS).filter((id) => activeReviewGroups.has(id))) {
  contactSheets[group] = await createContactSheet(
    group,
    evidence.filter((item) => item.reviewGroup === group),
  );
}

await writeFile(
  `${outputDir}/visual-checkpoints.json`,
  `${JSON.stringify({
    baseUrl,
    browserName,
    recordedAt: new Date().toISOString(),
    contactSheets,
    checkpoints: evidence,
  }, null, 2)}\n`,
);
await browser.close();
console.log(`PASS: ${checkpoints.length} runtime visual checkpoints and ${Object.keys(contactSheets).length} contact sheets are ready, stable, and diagnostic-free.`);
