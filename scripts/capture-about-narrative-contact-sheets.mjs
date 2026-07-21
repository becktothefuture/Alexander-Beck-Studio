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
  desktop: Object.freeze({ width: 1440, height: 1000 }),
  tablet: Object.freeze({ width: 1024, height: 768 }),
  mobile: Object.freeze({ width: 390, height: 844 }),
  landscape: Object.freeze({ width: 844, height: 390 }),
});
const viewportId = process.env.ABS_CONTACT_SHEET_VIEWPORT || 'desktop';
const viewport = viewports[viewportId] || viewports.desktop;
const reducedMotion = process.env.ABS_CONTACT_SHEET_REDUCED === '1' ? 'reduce' : 'no-preference';
const sequences = {
  editorial: [3.3, 3.48, 3.53, 3.62, 3.72, 4.2, 4.8, 5.25, 5.45, 5.65],
  disciplines: [7.35, 8, 8.5, 8.75, 8.95, 9.11, 9.27, 9.43, 9.59, 9.75, 9.95, 10.1, 10.25, 10.35, 10.5, 10.72, 11.1, 11.55],
  disciplineReview: [6.55, 6.95, 7.35, 7.7, 8.05, 8.4, 8.65, 8.75, 8.85, 8.95, 9.05, 9.15, 9.25, 9.35, 9.45, 9.55, 9.65, 9.75, 9.85, 9.95, 10.05, 10.15, 10.25, 10.35, 10.45, 10.5, 10.72, 10.95, 11.2, 11.55, 11.8, 12.05, 12.3, 12.45],
  late: [10.45, 10.9, 11.6, 12, 12.6, 13.2, 13.65, 13.8, 14.05, 14.25, 14.45, 14.55, 14.75, 14.95, 15.15, 15.35, 15.55, 15.75, 15.95, 16.15, 16.35, 16.55, 16.75, 16.95, durationWU],
  ending: [14.25, 14.45, 14.55, 14.65, 14.75, 14.85, 14.95, 15.05, 15.15, 15.3, 15.45, 15.6, 15.75, 15.9, 16.05, 16.15, 16.3, 16.45, 16.55, 16.75, 16.95, durationWU],
  storyboard: [0, 0.4, 0.8, 1.6, 2.79, 3.2, 3.48, 3.72, 4.2, 4.8, 5.45, 6.05, 6.95, 7.75, 8.75, 8.95, 9.43, 9.95, 10.35, 10.72, 11.55, 12, 12.6, 13.2, 13.8, 14.3, 14.45, 14.75, 15.15, 15.6, 16.15, 16.65, durationWU],
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
    const visibleLabels = [...document.querySelectorAll('.about-narrative-discipline-reveal li')]
      .filter((node) => Number(getComputedStyle(node).opacity) > 0.05)
      .map((node) => ({
        label: node.textContent.trim(),
        side: node.dataset.labelSide || 'right',
        opacity: Number(getComputedStyle(node).opacity),
      }));
    const visibleTitles = [...document.querySelectorAll('.about-narrative-spatial-fragment')]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return Number(getComputedStyle(node).opacity) > 0.05
          && rect.bottom > 0
          && rect.top < window.innerHeight;
      })
      .map((node) => node.textContent.trim());
    const visibleLogos = [...document.querySelectorAll('.about-narrative-client-logos li')]
      .filter((node) => Number(getComputedStyle(node.closest('[data-editorial-line]') || node).opacity) > 0.05)
      .length;
    const visibleEditorial = [...document.querySelectorAll('[data-editorial-line]')]
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
  const panels = await Promise.all(evidence.map(async (item) => {
    const image = await sharp(item.screenshot)
      .resize({ width: panelWidth, height: imageHeight, fit: 'contain', background: '#111111' })
      .png()
      .toBuffer();
    const state = item.state;
    const worldLine = `${state.worldFrom || '—'} → ${state.worldTo || '—'} · ${state.stage || '—'}`;
    const contentLine = state.visibleLabels.length > 0
      ? `${state.visibleLabels.length} labels: ${state.visibleLabels.map((label) => label.label).join(', ')}`
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
    return sharp({
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
      .toBuffer();
  }));
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
await page.goto(`${baseUrl}/lab/about-narrative.html`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.about-narrative-lab[data-world-prepare="ready"]', { timeout: 30_000 });

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
  report.contactSheets[id] = await createContactSheet(id, evidence);
}

await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(`PASS: About narrative contact sheets written to ${outputDir}.`);
