import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  checkpointStoryWU,
  driveAboutStoryWU,
  launchAboutAuditBrowser,
  openAboutRecoveryPage,
  summarizeFailures,
  writeRecoveryReport,
} from './lib/about-recovery-audit-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const outputDir = resolve(process.env.ABS_ABOUT_RECOVERY_LOGO_OUTPUT
  || `output/playwright/about-recovery-logo-bounds/${browserName}`);
const requestedWidths = String(process.env.ABS_ABOUT_LOGO_WIDTHS || '320,375,390,430,1440')
  .split(',').map(Number).filter((value) => Number.isFinite(value) && value >= 320);

function check(code, pass, message, actual, expected) {
  return { code, pass: Boolean(pass), message, actual, expected };
}

async function centreClientGrid(page) {
  const focusWU = await checkpointStoryWU(page, { fieldId: 'text-disciplines-title', phase: 'focus' });
  assert(Number.isFinite(focusWU), 'The disciplines field has no focus timing.');
  await driveAboutStoryWU(page, focusWU);
  await page.waitForFunction(() => (
    document.querySelector('.about-narrative-client-field')?.dataset.clientFieldReady === 'true'
      && Array.from(document.querySelectorAll('.about-narrative-client-logos img'))
        .every((image) => image.complete && image.naturalWidth > 0)
  ));
}

async function centreClientLogo(page, logoId) {
  const clientWU = await page.evaluate((requestedLogoId) => {
    const root = document.querySelector('.about-narrative-lab');
    const field = document.querySelector('[data-text-field-id="text-disciplines-title"]');
    const target = field?.querySelector(`[data-client-logo="${requestedLogoId}"]`);
    const canvas = document.querySelector('.about-narrative-world__canvas');
    if (!root || !field || !target || !canvas) return null;
    const style = getComputedStyle(field);
    const fieldBounds = field.getBoundingClientRect();
    const targetBounds = target.getBoundingClientRect();
    const stageStart = Number.parseFloat(style.getPropertyValue('--reading-stage-start'));
    const stageEnd = Number.parseFloat(style.getPropertyValue('--reading-stage-end'));
    const readingCenter = fieldBounds.top + (stageStart + stageEnd) / 2;
    return Number(root.dataset.narrativeStoryWu)
      + ((targetBounds.top + targetBounds.bottom) / 2 - readingCenter) / canvas.getBoundingClientRect().height;
  }, logoId);
  assert(Number.isFinite(clientWU), 'The rendered client grid position could not be measured.');
  await driveAboutStoryWU(page, clientWU);
  await page.waitForTimeout(80);
}

async function measureLogoArtwork(page, logoId) {
  return page.evaluate(async (requestedLogoId) => {
    const rect = (bounds) => ({
      left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom,
      width: bounds.width, height: bounds.height,
    });
    const measurements = [];
    for (const item of document.querySelectorAll(
      `.about-narrative-client-logos [data-client-logo="${requestedLogoId}"]`,
    )) {
      const image = item.querySelector('img');
      if (!(image instanceof HTMLImageElement)) continue;
      const maximumScanWidth = Math.min(800, Math.max(1, image.naturalWidth));
      const maximumScanHeight = Math.max(1, Math.round(maximumScanWidth * image.naturalHeight / image.naturalWidth));
      const canvas = document.createElement('canvas');
      canvas.width = maximumScanWidth;
      canvas.height = maximumScanHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width;
      let top = canvas.height;
      let right = 0;
      let bottom = 0;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (pixels[(y * canvas.width + x) * 4 + 3] <= 32) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x + 1);
          bottom = Math.max(bottom, y + 1);
        }
      }
      const imageRect = image.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const naturalAspect = image.naturalWidth / image.naturalHeight;
      const fittedWidth = Math.min(imageRect.width, imageRect.height * naturalAspect);
      const fittedHeight = fittedWidth / naturalAspect;
      const fittedLeft = imageRect.left + (imageRect.width - fittedWidth) / 2;
      const fittedTop = imageRect.top + (imageRect.height - fittedHeight) / 2;
      const artwork = right > left && bottom > top ? {
        left: fittedLeft + left / canvas.width * fittedWidth,
        right: fittedLeft + right / canvas.width * fittedWidth,
        top: fittedTop + top / canvas.height * fittedHeight,
        bottom: fittedTop + bottom / canvas.height * fittedHeight,
      } : null;
      if (artwork) {
        artwork.width = artwork.right - artwork.left;
        artwork.height = artwork.bottom - artwork.top;
      }
      const visible = artwork ? {
        left: Math.max(artwork.left, itemRect.left, 0),
        right: Math.min(artwork.right, itemRect.right, innerWidth),
        top: Math.max(artwork.top, itemRect.top, 0),
        bottom: Math.min(artwork.bottom, itemRect.bottom, innerHeight),
      } : null;
      if (visible) {
        visible.width = Math.max(0, visible.right - visible.left);
        visible.height = Math.max(0, visible.bottom - visible.top);
      }
      const style = getComputedStyle(image);
      measurements.push({
        id: item.dataset.clientLogo,
        source: image.currentSrc,
        naturalSize: { width: image.naturalWidth, height: image.naturalHeight },
        sourceAlphaBounds: right > left ? { left, top, right, bottom, scanWidth: canvas.width, scanHeight: canvas.height } : null,
        imageBounds: rect(imageRect),
        cellBounds: rect(itemRect),
        artworkBounds: artwork,
        visibleArtworkBounds: visible,
        opacity: Number(style.opacity),
        clipped: !visible || !artwork || Math.abs(visible.width - artwork.width) > 0.5
          || Math.abs(visible.height - artwork.height) > 0.5,
      });
    }
    return measurements;
  }, logoId);
}

await mkdir(outputDir, { recursive: true });
const browser = await launchAboutAuditBrowser(browserName);
const report = { schema: 'about-recovery-logo-bounds/v1', browser: browserName, baseUrl, viewports: [], failures: [] };
try {
  for (const width of requestedWidths) {
    const profile = width >= 720 ? 'desktop' : 'mobile';
    const height = width >= 720 ? 1000 : width === 320 ? 740 : 844;
    const { context, errors, page } = await openAboutRecoveryPage({
      browser, profile, baseUrl, viewport: { width, height },
    });
    // This audit measures DOM and source-alpha geometry only. Stop the already
    // certified WebGL scene after boot so 75 logo scroll samples do not spend
    // minutes rasterising an unchanged 90k-point world in SwiftShader.
    await page.evaluate(() => window.__aboutNarrativeRuntime?.setVisible?.(false));
    await centreClientGrid(page);
    const logoIds = await page.locator('.about-narrative-client-logos [data-client-logo]')
      .evaluateAll((items) => items.map((item) => item.dataset.clientLogo));
    const logos = [];
    for (const logoId of logoIds) {
      await centreClientLogo(page, logoId);
      const measurement = (await measureLogoArtwork(page, logoId))[0];
      if (measurement) logos.push(measurement);
    }
    const minimumHeight = profile === 'desktop' ? 18 : 12;
    const minimumWidth = profile === 'desktop' ? 28 : 18;
    const minimumWideWordmarkHeight = profile === 'desktop' ? 12 : 7.5;
    const checks = [
      check('logo_count', logos.length === 15, 'Every authored client logo must render.', logos.length, 15),
      ...logos.flatMap((logo) => [
        check(`visible_${logo.id}`, Boolean(logo.visibleArtworkBounds && !logo.clipped && logo.opacity >= 0.9),
          `${logo.id} artwork must be visible and unclipped.`,
          { visible: Boolean(logo.visibleArtworkBounds), clipped: logo.clipped, opacity: logo.opacity },
          { visible: true, clipped: false, minimumOpacity: 0.9 }),
        check(`recognisable_extent_${logo.id}`,
          Number(logo.visibleArtworkBounds?.height || 0) >= minimumHeight
            || (
              Number(logo.visibleArtworkBounds?.width || 0) >= minimumWidth * 4
              && Number(logo.visibleArtworkBounds?.height || 0) >= minimumWideWordmarkHeight
            ),
          `${logo.id} visible artwork is too small to recognise.`, {
            width: logo.visibleArtworkBounds?.width || 0,
            height: logo.visibleArtworkBounds?.height || 0,
          }, {
            minimumHeight,
            orWideWordmark: {
              minimumWidth: minimumWidth * 4,
              minimumHeight: minimumWideWordmarkHeight,
            },
          }),
        check(`minimum_width_${logo.id}`, Number(logo.visibleArtworkBounds?.width || 0) >= minimumWidth,
          `${logo.id} visible artwork is too narrow to recognise.`, logo.visibleArtworkBounds?.width || 0, minimumWidth),
        check(`maximum_cell_coverage_${logo.id}`,
          Number(logo.visibleArtworkBounds?.width || 0) <= logo.cellBounds.width * 0.94
            && Number(logo.visibleArtworkBounds?.height || 0) <= logo.cellBounds.height * 0.9,
          `${logo.id} artwork must retain optical breathing room in its cell.`,
          { width: logo.visibleArtworkBounds?.width || 0, height: logo.visibleArtworkBounds?.height || 0 },
          { maximumWidth: logo.cellBounds.width * 0.94, maximumHeight: logo.cellBounds.height * 0.9 }),
      ]),
    ];
    const failures = summarizeFailures(checks);
    const screenshot = resolve(outputDir, `${width}x${height}-client-grid.png`);
    await page.screenshot({ path: screenshot });
    report.viewports.push({ width, height, profile, screenshot, logos, checks, failures, errors });
    report.failures.push(...failures.map((failure) => ({ viewport: `${width}x${height}`, ...failure })));
    if (errors.length) report.failures.push({ viewport: `${width}x${height}`, code: 'page_errors', actual: errors, expected: [] });
    await context.close();
  }
} catch (error) {
  report.failures.push({ viewport: 'infrastructure', code: 'audit_error', message: error.message });
} finally {
  await browser.close();
}
report.status = report.failures.length ? 'fail' : 'pass';
report.recordedAt = new Date().toISOString();
const reportPath = await writeRecoveryReport(outputDir, 'report.json', report);
for (const failure of report.failures) console.error(`FAIL ${failure.viewport}/${failure.code}: ${failure.message || JSON.stringify(failure.actual)}`);
console.log(`${report.status.toUpperCase()}: About rendered logo bounds report: ${reportPath}`);
if (report.failures.length) process.exitCode = 1;
