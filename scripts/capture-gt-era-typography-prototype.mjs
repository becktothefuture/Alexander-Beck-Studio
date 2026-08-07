import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output', 'design-explorations');
const PROTOTYPE_URL = 'http://localhost:8012/prototypes/gt-era-typography.html';

const TUNED_CONFIG = Object.freeze({
  name: 'alex',
  titleCase: 'uppercase',
  titleSizePx: 43.5,
  titleWidthPercent: 92.25,
  titleTrackingEm: 0.01,
  titleLeading: 0.85,
  titleTopPercent: 51.2,
  secondaryOpacity: 0.72,
  bodyCut: 'onest',
  interfaceCut: 'same',
  bodySizePercent: 104.5,
  bodyLeadingPercent: 104.5,
  bodyTrackingEm: -0.006,
  menuCut: 'same',
  menuWeight: '700',
  menuTrackingEm: 0.045,
  clockTrackingEm: 0.015,
  clockYOffsetPx: 10,
  londonWidthPx: 70.5,
  londonYOffsetPx: 0,
});

const captures = [
  {
    slug: 'iphone-17-pro-max-alex-tuned',
    viewport: { width: 440, height: 956 },
    deviceScaleFactor: 3,
    isMobile: true,
    config: { ...TUNED_CONFIG, previewViewport: 'mobile' },
  },
  {
    slug: 'desktop-1440x960-alex-tuned',
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    isMobile: false,
    config: { ...TUNED_CONFIG, previewViewport: 'desktop' },
  },
];

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const reports = [];

try {
  for (const capture of captures) {
    const context = await browser.newContext({
      viewport: capture.viewport,
      deviceScaleFactor: capture.deviceScaleFactor,
      isMobile: capture.isMobile,
      hasTouch: capture.isMobile,
      colorScheme: 'light',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    try {
      await page.goto(`${PROTOTYPE_URL}?capture=1&vp=${capture.config.previewViewport}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(() => document.body.dataset.prototypeReady === 'true', null, {
        timeout: 15000,
      });
      await page.waitForTimeout(5000);
      await page.evaluate(
        (config) => window.__GT_ERA_TYPOGRAPHY_PROTOTYPE__.applyConfig(config),
        capture.config,
      );
      await page.waitForTimeout(180);

      const filename = `gt-era-typography-${capture.slug}.png`;
      await page.screenshot({
        path: path.join(OUTPUT_DIR, filename),
        fullPage: false,
      });

      reports.push({
        file: path.join('output', 'design-explorations', filename),
        ...(await page.evaluate(() => window.__GT_ERA_TYPOGRAPHY_PROTOTYPE__.getReport())),
      });
    } finally {
      await context.close();
    }
  }

  console.log(JSON.stringify({ prototypeUrl: PROTOTYPE_URL, reports }, null, 2));
} finally {
  await browser.close();
}
