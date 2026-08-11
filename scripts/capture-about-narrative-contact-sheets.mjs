import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const phase = process.env.ABS_CONTACT_SHEET_PHASE || 'current';
const outputDir = `output/playwright/about-narrative-contact-sheets/${phase}`;
const canonicalSource = await readFile('react-app/app/public/config/contents-about.json', 'utf8');
const canonicalDocument = JSON.parse(canonicalSource);
const durationWU = Number(canonicalDocument.profiles.desktop.storyDurationWU);
const viewports = Object.freeze({
  largeDesktop: Object.freeze({ width: 1920, height: 1080 }),
  desktop: Object.freeze({ width: 1440, height: 1000 }),
  laptop: Object.freeze({ width: 1280, height: 720 }),
  tablet: Object.freeze({ width: 1024, height: 768 }),
  mobile: Object.freeze({ width: 390, height: 844 }),
  narrowMobile: Object.freeze({ width: 375, height: 667 }),
});
const viewportId = process.env.ABS_CONTACT_SHEET_VIEWPORT || 'desktop';
const viewport = viewports[viewportId] || viewports.desktop;
const reducedMotion = process.env.ABS_CONTACT_SHEET_REDUCED === '1' ? 'reduce' : 'no-preference';
const sequences = {
  opening: [0, 0.12, 0.28, 0.42, 0.58, 0.7, 0.9, 1.15, 1.35],
  anchorProbe: [8.35, 8.75, 9.15, 9.47, 9.79, 10.11, 10.35, 10.85, 11.15],
  editorial: [3.3, 3.48, 3.53, 3.72, 4.2, 4.8, 5.25, 5.45, 12.85, 13, 13.2, 13.35, 13.55],
  disciplines: [6.55, 7.35, 8.15, 8.35, 8.55, 8.75, 8.95, 9.15, 9.31, 9.47, 9.63, 9.79, 9.95, 10.11, 10.35, 10.6, 10.85, 11, 11.15, 11.3, 11.45, 11.6, 11.9, 12.2, 12.65],
  disciplineReview: [7.1, 7.35, 7.7, 8.05, 8.2, 8.35, 8.5, 8.65, 8.8, 8.95, 9.15, 9.31, 9.47, 9.63, 9.79, 9.95, 10.11, 10.23, 10.35, 10.5, 10.65, 10.8, 10.95, 11.05, 11.15, 11.3, 11.45, 11.6, 11.9, 12.2, 12.45, 12.65],
  late: [12.45, 12.85, 13, 13.2, 13.35, 13.55, 14.05, 14.65, 15.35, 15.7, 16.1, 16.22, 16.57, 16.97, 17.08, 17.38, 17.68, 17.75, 18.1, 18.5, 19.25, 20, 20.4, 20.75, 21.1, 21.5, durationWU],
  ending: [13, 13.2, 13.35, 13.55, 14.05, 14.65, 15.35, 15.7, 16.1, 16.22, 16.57, 16.97, 17.08, 17.38, 17.68, 17.75, 17.95, 18.2, 18.5, 18.85, 19.25, 19.6, 20, 20.35, 20.75, 21.05, 21.35, 21.65, durationWU],
  storyboard: [0, 0.4, 0.8, 1.6, 2.79, 3.2, 3.48, 3.72, 4.2, 4.8, 5.45, 6.05, 6.95, 7.35, 7.85, 8.15, 8.45, 8.65, 9.15, 9.65, 10.15, 10.65, 11, 11.15, 11.4, 11.65, 12.15, 12.85, 13, 13.2, 13.35, 13.55, 15.7, 16.57, 16.9, 17.38, 17.75, 18.5, 19.25, 20, 20.75, 21.35, durationWU],
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

async function readFrameState(page, requestedWU) {
  return page.evaluate((value) => {
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
      storyWU: Number(root?.dataset.narrativeStoryWu),
      stage: root?.dataset.worldStage || '',
      worldFrom: root?.dataset.worldFrom || '',
      worldTo: root?.dataset.worldTo || '',
      visibility: Number(root?.dataset.worldVisibility),
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
  }, requestedWU);
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
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
  ],
});
const context = await browser.newContext({ viewport, reducedMotion });
const page = await context.newPage();
await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.about-narrative-lab[data-world-prepare="ready"]', { timeout: 30_000 });
await page.waitForFunction(
  () => document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete',
  undefined,
  { timeout: 30_000 },
);

const report = { baseUrl, phase, viewportId, viewport, reducedMotion, durationWU, configFingerprint, recordedAt: new Date().toISOString(), contactSheets: {}, sequences: {} };
for (const [id, storyValues] of Object.entries(sequences)) {
  if (!requestedSequenceIds.has(id)) continue;
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
