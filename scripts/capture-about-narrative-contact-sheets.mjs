import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import sharp from 'sharp';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const phase = process.env.ABS_CONTACT_SHEET_PHASE || 'current';
const outputDir = `output/playwright/about-narrative-contact-sheets/${phase}`;
const experienceVersion = 'main';
const canonicalConfigName = 'contents-about.json';
const canonicalSource = await readFile(
  `react-app/app/public/config/${canonicalConfigName}`,
  'utf8',
);
const canonicalDocument = JSON.parse(canonicalSource);
const cameraTrack = JSON.parse(await readFile(
  'react-app/app/public/models/about-v2-edited-world/camera-track.json',
  'utf8',
));
const stageCues = (cameraTrack.journeyCues || [])
  .filter((cue) => /^ABS_STAGE_0[0-6]$/.test(cue.name))
  .sort((left, right) => left.progress - right.progress);
// The profile value is only a persisted diagnostic cache in content-flow mode.
// Replace it with the measured browser extent once the Story Stack has laid out.
let durationWU = Number(canonicalDocument.profiles.desktop.storyDurationWU);
const viewports = Object.freeze({
  largeDesktop: Object.freeze({ width: 1920, height: 1080 }),
  desktop: Object.freeze({ width: 1440, height: 1000 }),
  laptop: Object.freeze({ width: 1280, height: 720 }),
  tablet: Object.freeze({ width: 1024, height: 768 }),
  mobile: Object.freeze({ width: 390, height: 844 }),
  tinyMobile: Object.freeze({ width: 320, height: 740 }),
  shortPortrait: Object.freeze({ width: 390, height: 600 }),
  narrowMobile: Object.freeze({ width: 375, height: 667 }),
  shortWide: Object.freeze({ width: 844, height: 390 }),
});
const viewportId = process.env.ABS_CONTACT_SHEET_VIEWPORT || 'desktop';
const viewport = viewports[viewportId] || viewports.desktop;
const reducedMotion = process.env.ABS_CONTACT_SHEET_REDUCED === '1' ? 'reduce' : 'no-preference';
const pageSampleCount = Math.max(3, Number.parseInt(process.env.ABS_CONTACT_SHEET_PAGE_SAMPLES, 10) || 29);
const deviceScaleFactor = Math.max(1, Math.min(3, Number(process.env.ABS_CONTACT_SHEET_DPR) || 1));
const colorScheme = process.env.ABS_CONTACT_SHEET_THEME === 'dark' ? 'dark' : 'light';
// Each sequence answers one visual question. Keep `rhythm` aligned with every
// authored text handoff; the focused probes may sample the material more densely.
const sequences = {
  fields: [],
  reading: [],
  craft: [],
  page: [],
  overlay: [0],
  opening: [0, 0.12, 0.28, 0.42, 0.58, 0.7, 0.9, 1.15, 1.35],
  anchorProbe: [8.35, 8.75, 9.15, 9.47, 9.79, 10.11, 10.35, 10.85, 11.15],
  editorial: [3.3, 3.465, 3.59, 3.72, 4.2, 4.8, 5.25, 5.45, 6.715, 6.79, 6.865, 10.85, 10.975, 11.1, 12.85, 13.55, 14.05, 14.1, 14.175, 14.25],
  disciplines: [6.55, 7.35, 8.15, 8.35, 8.55, 8.75, 8.95, 9.15, 9.31, 9.47, 9.63, 9.79, 9.95, 10.11, 10.35, 10.6, 10.85, 11, 11.15, 11.3, 11.45, 11.6, 11.9, 12.2, 12.65],
  disciplineReview: [7.7, 7.85, 8, 8.15, 8.3, 8.35, 8.5, 8.65, 8.8, 8.95, 9.1, 9.15, 9.3, 9.45, 9.6, 9.75, 9.9, 10.05, 10.2, 10.35, 10.5, 10.65, 10.8, 10.95, 11.1, 11.15],
  late: [12.45, 12.85, 13.55, 14.05, 14.15, 14.25, 14.65, 15.05, 15.35, 15.75, 16.1, 16.35, 16.55, 16.85, 17.15, 17.45, 17.75, 18.1, 18.5, 19, 20.1, 20.65, durationWU],
  ending: [14, 14.15, 14.25, 14.5, 14.75, 14.95, 15.05, 15.3, 15.55, 15.75, 15.85, 16.1, 16.35, 16.55, 16.8, 17.05, 17.3, 17.45, 17.6, 17.75, 17.95, 18.2, 18.5, 18.8, 19.1, 19.4, 19.7, durationWU],
  storyboard: [0, 0.4, 0.8, 1.6, 2.79, 3.2, 3.465, 3.72, 4.2, 4.8, 5.45, 6.05, 6.715, 6.865, 7.35, 7.85, 8.15, 8.45, 8.65, 9.15, 9.65, 10.15, 10.85, 11.1, 11.4, 12.15, 13.55, 14.05, 14.15, 14.25, 15.05, 15.85, 16.35, 17.45, 17.75, 18.5, 19.25, 20.65, durationWU],
  rhythm: [0, 0.4, 0.8, 1.4, 1.8, 2.2, 2.55, 2.95, 3.35, 3.6, 5.2, 7.05, 7.15, 7.55, 7.95, 8.05, 8.4, 8.85, 8.95, 9.7, 10.4, 11.4, 11.5, 12.1, 12.4, 14, 14.4, 14.5, 14.85, 15.2, 15.3, 15.65, 16, 16.1, 16.45, 16.8, 17.2, 18.2, 19.2, 20.1, 20.65, 20.8, durationWU],
  // Four compact motion strips reveal the same material changing condition:
  // seed into interior, interior into passage, passage hold, then world fold.
  cinematicMotion: [
    0.45, 0.95, 1.55, 2.15,
    6.35, 6.75, 7.35, 8.05,
    10.4, 12.4, 14.4, 16.4,
    16.257, 17.35, 18.45, 19.6,
  ],
  // Dense sampling makes the long nebula-to-floor gather visually auditable.
  floorProbe: [8.4, 9.4, 10.4, 11.4, 12.4, 14.4, 16.1, 16.8, 17.2],
  orbitProbe: [17.2, 18.2, 19.2, 20.2, 21.2, 21.6, durationWU],
};
const requestedSequenceIds = new Set(
  String(process.env.ABS_CONTACT_SHEET_SEQUENCES || Object.keys(sequences).join(','))
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value in sequences),
);

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function setStoryWU(page, storyWU) {
  await page.locator('.about-narrative-scrollport').evaluate((node, { value, duration }) => {
    const scrollTravel = Math.max(0, node.scrollHeight - node.clientHeight);
    node.scrollTop = scrollTravel * Math.min(1, Math.max(0, value / duration));
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, { value: storyWU, duration: durationWU });
  await page.waitForFunction((value) => {
    const sampled = Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu);
    return Number.isFinite(sampled) && Math.abs(sampled - value) <= 0.035;
  }, storyWU, { timeout: 20_000 });
  await page.waitForTimeout(180);
}

function stageAtJourneyProgress(progress) {
  return [...stageCues].reverse().find((cue) => progress >= cue.progress)?.name
    || stageCues[0]?.name
    || 'ABS_STAGE_UNKNOWN';
}

async function readFrameState(page, requestedWU) {
  const state = await page.evaluate(({ value }) => {
    const root = document.querySelector('.about-narrative-lab');
    const disciplineLabels = [...document.querySelectorAll('.about-narrative-discipline-reveal li')]
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const opacity = Number(style.opacity);
        const anchorX = Number.parseFloat(style.getPropertyValue('--discipline-x'));
        const anchorY = Number.parseFloat(style.getPropertyValue('--discipline-y'));
        return {
        label: node.querySelector('.about-narrative-discipline-reveal__label')?.textContent.trim() || '',
        side: node.dataset.labelSide || 'right',
        opacity,
        inViewport: rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight,
        bounds: {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
        },
        description: node.querySelector('.about-narrative-discipline-reveal__description')?.textContent.trim() || '',
        descriptionLines: (() => {
          const description = node.querySelector('.about-narrative-discipline-reveal__description');
          if (!description) return 0;
          const style = getComputedStyle(description);
          return Math.max(1, Math.round(description.getBoundingClientRect().height / Number.parseFloat(style.lineHeight)));
        })(),
        anchorX: Number.isFinite(anchorX) ? Math.round(anchorX) : null,
        anchorY: Number.isFinite(anchorY) ? Math.round(anchorY) : null,
        anchorGap: Number.isFinite(anchorX) ? Math.round(rect.left - anchorX) : null,
        withinEditorialZone: rect.left >= window.innerWidth * 0.15
          && rect.right <= window.innerWidth * 0.85,
        };
      });
    const visibleLabels = disciplineLabels.filter((label) => label.opacity > 0.05 && label.inViewport);
    const visibleTitles = [...document.querySelectorAll('.about-narrative-spatial-fragment')]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return Number(getComputedStyle(node).opacity) > 0.05
          && rect.bottom > 0
          && rect.top < window.innerHeight;
      })
      .map((node) => node.textContent.trim());
    const visibleLogos = [...document.querySelectorAll('.about-narrative-client-logos li')]
      .filter((node) => Number(getComputedStyle(node.closest('[data-editorial-reveal]') || node).opacity) > 0.05)
      .length;
    const visibleEditorial = [...document.querySelectorAll('[data-editorial-reveal]')]
      .filter((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return Number(style.opacity) > 0.05 && rect.bottom > 0 && rect.top < window.innerHeight;
      })
      .map((node) => ({
        id: node.closest('[data-text-field-id]')?.dataset.textFieldId || '',
        opacity: Number(getComputedStyle(node).opacity),
        blur: getComputedStyle(node).filter,
      }));
    const finale = document.querySelector('.about-narrative-finale-content');
    const finaleRect = finale?.getBoundingClientRect();
    return {
      requestedWU: value,
      browserViewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      theme: document.documentElement.dataset.absTheme || '',
      runtime: (() => {
        const metrics = window.__aboutNarrativeRuntime?.getMetrics?.();
        if (!metrics) return null;
        return {
          cameraPosition: metrics.cameraPosition,
          journeyProgress: metrics.journeyProgress,
          cameraLocked: metrics.cameraLocked,
          paletteId: metrics.paletteId,
          pixelRatio: metrics.pixelRatio,
          viewportWidth: metrics.viewportWidth,
          viewportHeight: metrics.viewportHeight,
          cameraRollDegrees: metrics.cameraRollDegrees,
          cameraFovDegrees: metrics.cameraFovDegrees,
          perModelCounts: metrics.perModelCounts,
          residentSurfelCount: metrics.residentSurfelCount,
          modelFraming: metrics.modelFraming,
          controls: metrics.controls,
        };
      })(),
      storyWU: Number(root?.dataset.narrativeStoryWu),
      worldFrom: root?.dataset.worldFrom || '',
      worldTo: root?.dataset.worldTo || '',
      visibility: Number(root?.dataset.worldVisibility ?? root?.dataset.routeMaterialProgress ?? 1),
      gridBackground: Number(root?.dataset.worldGridBackground || 0),
      bustYaw: Number(root?.dataset.worldBustShaderYaw || 0),
      finaleBounds: finaleRect ? {
        top: Math.round(finaleRect.top),
        bottom: Math.round(finaleRect.bottom),
        height: Math.round(finaleRect.height),
        viewportBottomClearance: Math.round(window.innerHeight - finaleRect.bottom),
      } : null,
      visibleLogos,
      visibleEditorial,
      disciplineLabels,
      visibleLabels,
      visibleTitles,
    };
  }, { value: requestedWU });
  state.stage = stageAtJourneyProgress(state.runtime?.journeyProgress ?? 0);
  return state;
}

async function createContactSheet(id, evidence) {
  const columns = 4;
  const panelWidth = viewport.height > viewport.width ? 240 : 350;
  const imageHeight = Math.round(panelWidth * (viewport.height / viewport.width));
  const labelHeight = 58;
  const gutter = 12;
  const rows = Math.ceil(evidence.length / columns);
  const sheetWidth = (columns * panelWidth) + ((columns + 1) * gutter);
  const sheetHeight = (rows * (imageHeight + labelHeight)) + ((rows + 1) * gutter);
  const panels = [];
  for (const item of evidence) {
    const image = await sharp(item.screenshot)
      .resize({ width: panelWidth, height: imageHeight, fit: 'contain', background: '#111111' })
      .png()
      .toBuffer();
    const state = item.state;
    const worldLine = `${state.worldFrom || '—'} → ${state.worldTo || '—'} · ${state.stage || '—'}`;
    const descriptionLines = state.visibleLabels.map((label) => label.descriptionLines).filter(Boolean);
    const anchorGaps = state.visibleLabels.map((label) => label.anchorGap).filter(Number.isFinite);
    const editorialCount = state.visibleLabels.filter((label) => label.withinEditorialZone).length;
    const contentLine = state.visibleLabels.length > 0
      ? `${state.visibleLabels.length} disciplines · zone ${editorialCount}/${state.visibleLabels.length}${anchorGaps.length ? ` · right +${Math.min(...anchorGaps)}–${Math.max(...anchorGaps)}px` : ''}${descriptionLines.length ? ` · ${Math.min(...descriptionLines)}–${Math.max(...descriptionLines)} lines` : ''}`
      : state.visibleTitles[0]
        || (state.visibleEditorial.length ? `${state.visibleEditorial.map((item) => item.id).filter(Boolean).join(', ')} · ${state.visibleLogos} logos` : 'No foreground copy');
    const evidenceLine = state.finaleBounds
      ? `${contentLine} · CTA ${state.finaleBounds.top}–${state.finaleBounds.bottom}px`
      : contentLine;
    const label = Buffer.from(`
      <svg width="${panelWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f1e9"/>
        <text x="10" y="17" fill="#111" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700">WU ${state.storyWU.toFixed(3)} · visibility ${state.visibility.toFixed(2)}</text>
        <text x="10" y="34" fill="#333" font-family="Arial, Helvetica, sans-serif" font-size="10">${escapeXml(worldLine)}</text>
        <text x="10" y="49" fill="#555" font-family="Arial, Helvetica, sans-serif" font-size="9">${escapeXml(evidenceLine.slice(0, 82))}</text>
      </svg>
    `);
    panels.push(await sharp({
      create: {
        width: panelWidth,
        height: imageHeight + labelHeight,
        channels: 4,
        background: '#111111',
      },
    })
      .composite([
        { input: image, left: 0, top: 0 },
        { input: label, left: 0, top: imageHeight },
      ])
      .png()
      .toBuffer());
  }
  const sheetPath = `${outputDir}/${id}-contact-sheet.png`;
  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: '#050505',
    },
  })
    .composite(panels.map((input, index) => ({
      input,
      left: gutter + ((index % columns) * (panelWidth + gutter)),
      top: gutter + (Math.floor(index / columns) * (imageHeight + labelHeight + gutter)),
    })))
    .png()
    .toFile(sheetPath);
  return sheetPath;
}

await mkdir(outputDir, { recursive: true });
const configFingerprint = createHash('sha256').update(canonicalSource).digest('hex');
const browserName = process.env.ABS_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const browserType = browserName === 'webkit' ? webkit : chromium;
const browserChannel = browserName === 'chromium' ? process.env.ABS_CHROMIUM_CHANNEL : undefined;
const browser = await browserType.launch({
  headless: true,
  ...(browserChannel ? { channel: browserChannel } : {}),
  args: browserName === 'chromium' && !browserChannel ? [
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
  ] : [],
});
const context = await browser.newContext({ viewport, reducedMotion, deviceScaleFactor, colorScheme });
const page = await context.newPage();
await page.goto(
  `${baseUrl}/about.html?preview=about&edit=0`,
  { waitUntil: 'domcontentloaded' },
);
await page.waitForSelector(
  '.about-narrative-lab[data-about-scene-ready="true"][data-point-world-state="ready"]',
  { timeout: 30_000 },
);
await page.waitForFunction(
  () => document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete',
  undefined,
  { timeout: 30_000 },
);

durationWU = await page.locator('.about-narrative-scrollport').evaluate((node) => (
  (node.scrollHeight - node.clientHeight) / Math.max(1, node.clientHeight)
));
// Focused sequences retain their authored probes, but their terminal frame
// must follow the measured content-flow extent rather than the stale profile
// estimate captured while this module was initialising.
for (const sequenceId of ['late', 'ending', 'storyboard', 'rhythm', 'orbitProbe']) {
  sequences[sequenceId] = [...sequences[sequenceId], durationWU];
}
// `page` is the canonical whole-story sheet: evenly sampling the measured
// extent keeps it complete when copy is added, removed, or rewrapped.
sequences.page = Array.from({ length: pageSampleCount }, (_, index) => (
  durationWU * (index / (pageSampleCount - 1))
));

const storyFields = await page.locator('[data-render-span-id]').evaluateAll((nodes) => nodes.map((node) => ({
  id: node.querySelector('[data-text-field-id]')?.dataset.textFieldId,
  startWU: Number(node.dataset.storyStartWu),
  focusWU: Number(node.dataset.storyFocusWu),
  endWU: Number(node.dataset.storyEndWu),
})).filter((field) => field.id));
sequences.fields = storyFields.flatMap((field) => [field.startWU, field.focusWU, field.endWU]);
sequences.craft = [0, ...storyFields.filter((field) => [
  'text-background-unit', 'text-discipline-labels', 'text-disciplines-title',
  'text-life-momentum', 'text-life-character', 'text-epilogue-invitation',
].includes(field.id)).map((field) => field.focusWU), durationWU];
const readingStops = await page.evaluate(() => {
  const scrollport = document.querySelector('.about-narrative-scrollport');
  const port = scrollport.getBoundingClientRect();
  const height = scrollport.clientHeight;
  return Array.from(document.querySelectorAll([
    '.about-narrative-render-span--editorial .about-narrative-editorial-copy',
    '[data-editorial-reveal="career-row"]',
    '[data-editorial-reveal="career-independent-work"]',
    '[data-editorial-reveal="discipline"]',
    '.about-narrative-client-logos > li',
  ].join(','))).map((node, index) => {
    const bounds = node.getBoundingClientRect();
    const fieldId = node.closest('[data-text-field-id]')?.dataset.textFieldId;
    const clearHeightPx = height - 36;
    return {
      index, fieldId, text: node.innerText.trim().replace(/\s+/g, ' '),
      storyWU: (scrollport.scrollTop + bounds.top - port.top + bounds.height / 2
        - 0.5 * height) / height,
      heightPx: bounds.height, clearHeightPx, fullyFits: bounds.height <= clearHeightPx,
      kind: node.dataset.editorialReveal || node.className,
    };
  });
});
sequences.reading = readingStops.map((stop) => stop.storyWU);
const report = { baseUrl, phase, experienceVersion, canonicalConfigName, browserName, browserChannel, viewportId, viewport, deviceScaleFactor, colorScheme, reducedMotion, durationWU, storyFields, readingStops, configFingerprint, recordedAt: new Date().toISOString(), contactSheets: {}, sequences: {} };
for (const [id, requestedStoryValues] of Object.entries(sequences)) {
  if (!requestedSequenceIds.has(id)) continue;
  const storyValues = [...new Set(requestedStoryValues.map((value) => (
    Math.min(durationWU, Math.max(0, Number(value) || 0))
  )))];
  const evidence = [];
  for (const storyWU of storyValues) {
    await setStoryWU(page, storyWU);
    const state = await readFrameState(page, storyWU);
    const screenshot = `${outputDir}/${id}-wu-${storyWU.toFixed(3).replace('.', '-')}.png`;
    await page.screenshot({ path: screenshot, fullPage: false });
    evidence.push({ screenshot, state });
  }
  report.sequences[id] = evidence;
}

await context.close();
await browser.close();
for (const [id, evidence] of Object.entries(report.sequences)) {
  report.contactSheets[id] = await createContactSheet(id, evidence);
}
await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(`PASS: About narrative contact sheets written to ${outputDir}.`);
