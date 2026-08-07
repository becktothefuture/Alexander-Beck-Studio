import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output', 'design-explorations');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'gt-era-text-open-font-metrics.json');
const PROTOTYPE_URL = 'http://localhost:8012/prototypes/gt-era-typography.html?capture=1';

const METRIC_WEIGHTS = Object.freeze({
  xHeight: 0.28,
  capHeight: 0.12,
  bodySampleWidth: 0.26,
  alphabetWidth: 0.18,
  digitWidth: 0.08,
  menuWidth: 0.08,
});

function round(value, places = 4) {
  return Number(value.toFixed(places));
}

function percentageDifference(value, reference) {
  return Math.abs(value - reference) / reference * 100;
}

function similarityScore(metrics, reference) {
  const differences = {
    xHeight: percentageDifference(metrics.xHeightEm, reference.xHeightEm),
    capHeight: percentageDifference(metrics.capHeightEm, reference.capHeightEm),
    bodySampleWidth: percentageDifference(metrics.bodySampleWidthEm, reference.bodySampleWidthEm),
    alphabetWidth: percentageDifference(metrics.alphabetWidthEm, reference.alphabetWidthEm),
    digitWidth: percentageDifference(metrics.digitWidthEm, reference.digitWidthEm),
    menuWidth: percentageDifference(metrics.menuWidthEm, reference.menuWidthEm),
  };

  const weightedDifference = Object.entries(METRIC_WEIGHTS).reduce(
    (total, [metric, weight]) => total + differences[metric] * weight,
    0,
  );
  const linePenalty = Math.abs(metrics.descriptionLineCount - reference.descriptionLineCount) * 2;

  return {
    differences: Object.fromEntries(
      Object.entries(differences).map(([metric, value]) => [metric, round(value, 2)]),
    ),
    score: round(weightedDifference + linePenalty, 2),
  };
}

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
const page = await context.newPage();

try {
  await page.goto(PROTOTYPE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.prototypeReady === 'true', null, {
    timeout: 30000,
  });

  const catalogue = await page.evaluate(
    () => window.__GT_ERA_TYPOGRAPHY_PROTOTYPE__.getFontCatalogue(),
  );
  const results = [];

  for (const font of catalogue) {
    await page.evaluate(async (bodyCut) => {
      await window.__GT_ERA_TYPOGRAPHY_PROTOTYPE__.applyConfig({
        bodyCut,
        menuCut: 'same',
        menuWeight: '600',
        bodySizePercent: 102.25,
        bodyLeadingPercent: 104.5,
        bodyTrackingEm: -0.012,
      });
    }, font.value);

    const metrics = await page.evaluate(async () => {
      const frame = document.querySelector('#prototype-site');
      const frameDocument = frame.contentDocument;
      const frameWindow = frame.contentWindow;
      const bodyElement = frameDocument.querySelector('.decorative-script p');
      const menuElement = frameDocument.querySelector('.button-bar__label');
      const bodyStyle = frameWindow.getComputedStyle(bodyElement);
      const menuStyle = frameWindow.getComputedStyle(menuElement);
      const bodyFamily = bodyStyle.fontFamily;
      const menuFamily = menuStyle.fontFamily;
      const bodyFaces = await frameDocument.fonts.load(`400 100px ${bodyFamily}`);
      const menuFaces = await frameDocument.fonts.load(`600 100px ${menuFamily}`);
      const menuWeightFaceCounts = Object.fromEntries(await Promise.all(
        ['400', '500', '600', '700'].map(async (weight) => [
          weight,
          (await frameDocument.fonts.load(`${weight} 100px ${menuFamily}`)).length,
        ]),
      ));
      await frameDocument.fonts.ready;

      const canvas = frameDocument.createElement('canvas');
      const context2d = canvas.getContext('2d');
      context2d.fontKerning = 'normal';

      context2d.font = `400 100px ${bodyFamily}`;
      const x = context2d.measureText('x');
      const cap = context2d.measureText('H');
      const bodySample = context2d.measureText(
        'Innovation happens when different creative disciplines collide.',
      );
      const alphabet = context2d.measureText('abcdefghijklmnopqrstuvwxyz');
      const digits = context2d.measureText('0123456789');

      context2d.font = `600 100px ${menuFamily}`;
      const menu = context2d.measureText('HOME WORK ABOUT LAB CONTACT');

      const descriptionRect = bodyElement.getBoundingClientRect();
      const descriptionLineHeight = Number.parseFloat(bodyStyle.lineHeight);

      return {
        resolvedBodyFamily: bodyFamily,
        resolvedMenuFamily: menuFamily,
        loadedBodyFaceCount: bodyFaces.length,
        loadedMenuFaceCount: menuFaces.length,
        menuWeightFaceCounts,
        xHeightEm: x.actualBoundingBoxAscent / 100,
        capHeightEm: cap.actualBoundingBoxAscent / 100,
        bodySampleWidthEm: bodySample.width / 100,
        alphabetWidthEm: alphabet.width / 100,
        digitWidthEm: digits.width / 100,
        menuWidthEm: menu.width / 100,
        descriptionWidthPx: descriptionRect.width,
        descriptionHeightPx: descriptionRect.height,
        descriptionLineHeightPx: descriptionLineHeight,
        descriptionLineCount: Math.round(descriptionRect.height / descriptionLineHeight),
      };
    });

    results.push({
      ...font,
      metrics: Object.fromEntries(
        Object.entries(metrics).map(([key, value]) => [
          key,
          typeof value === 'number' ? round(value) : value,
        ]),
      ),
    });
  }

  const reference = results.find((result) => result.value === 'textRegular');
  if (!reference) throw new Error('GT Era Text Regular reference metrics are missing.');

  const candidates = results
    .filter((result) => result.openSource)
    .map((result) => ({
      ...result,
      comparison: similarityScore(result.metrics, reference.metrics),
    }))
    .sort((a, b) => a.comparison.score - b.comparison.score);

  const report = {
    generatedAt: new Date().toISOString(),
    viewport: { width: 440, height: 956 },
    browser: 'Chromium via Playwright',
    renderSettings: {
      bodyWeight: 400,
      menuWeight: 600,
      bodySizePercent: 102.25,
      bodyLeadingPercent: 104.5,
      bodyTrackingEm: -0.012,
    },
    scoring: {
      lowerIsCloser: true,
      weights: METRIC_WEIGHTS,
      descriptionLinePenaltyPerLine: 2,
    },
    reference,
    candidates,
  };

  await writeFile(OUTPUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    output: path.relative(PROJECT_ROOT, OUTPUT_FILE),
    reference: reference.metrics,
    ranking: candidates.map((candidate) => ({
      family: candidate.label,
      score: candidate.comparison.score,
      descriptionLines: candidate.metrics.descriptionLineCount,
      menuWeightFaceCounts: candidate.metrics.menuWeightFaceCounts,
    })),
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
