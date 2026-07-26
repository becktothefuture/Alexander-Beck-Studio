#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const BASE_URL = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8013').replace(/\/+$/, '');
const TIMEOUT_MS = Math.max(10000, Number(process.env.ABS_ROUTE_SPINNER_AUDIT_TIMEOUT_MS || 60000));
const OUTPUT_DIR = resolve('output/playwright/route-loader-spinner');
const REQUESTED_PROFILE = String(process.env.ABS_ROUTE_SPINNER_AUDIT_PROFILE || '').trim();
const ALL_PROFILES = [
  ...[1, 2, 3].map((deviceScaleFactor) => ({
    label: `desktop-dpr-${deviceScaleFactor}`,
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor,
    isMobile: false,
  })),
  ...[1, 2, 3].map((deviceScaleFactor) => ({
    label: `mobile-dpr-${deviceScaleFactor}`,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
  })),
];
const PROFILES = REQUESTED_PROFILE
  ? ALL_PROFILES.filter((profile) => profile.label === REQUESTED_PROFILE)
  : ALL_PROFILES;

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function inspectCirclePixels(buffer, label) {
  const png = PNG.sync.read(buffer);
  assert(png.width === png.height, `${label}: captured dot is not square`, {
    width: png.width,
    height: png.height,
  });
  const alphaAt = (x, y) => png.data[((png.width * y + x) * 4) + 3];
  const corners = [
    alphaAt(0, 0),
    alphaAt(png.width - 1, 0),
    alphaAt(0, png.height - 1),
    alphaAt(png.width - 1, png.height - 1),
  ];
  const centre = alphaAt(Math.floor(png.width / 2), Math.floor(png.height / 2));
  assert(corners.every((alpha) => alpha <= 24), `${label}: dot corners are not transparent`, { corners });
  assert(centre >= 24, `${label}: dot centre is unexpectedly transparent`, { centre });
  return { width: png.width, height: png.height, corners, centre };
}

async function waitForInitialShell(page) {
  await page.waitForFunction(() => {
    const root = document.documentElement;
    const overlay = document.getElementById('abs-boot-overlay');
    const overlayHidden = !overlay
      || getComputedStyle(overlay).visibility === 'hidden'
      || Number.parseFloat(getComputedStyle(overlay).opacity || '1') < 0.02;
    return (
      (root.dataset.absTransitionPhase || 'idle') === 'idle'
      && root.dataset.shellRoute === 'home'
      && overlayHidden
      && document.querySelector('[data-route-tab="portfolio"]')
    );
  }, null, { timeout: TIMEOUT_MS, polling: 'raf' });
}

async function captureProfile(browser, profile, index) {
  console.log(`Auditing ${profile.label}...`);
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__ABS_AUDIT_ROUTE_READINESS_DELAY_MS__ = 1000;
  });
  await page.goto(`${BASE_URL}/index.html?absAudit=1`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await waitForInitialShell(page);
  await page.waitForTimeout(250);
  await page.locator('[data-route-tab="portfolio"]').click();
  await page.waitForFunction(() => (
    document.documentElement.dataset.absTransitionPhase === 'route-loading'
    && document.documentElement.dataset.absRouteLoaderPresentation === 'spinner'
    && Number.parseFloat(getComputedStyle(document.querySelector('.route-transition-loader__stage')).opacity) >= 0.9
  ), null, { timeout: TIMEOUT_MS, polling: 'raf' });

  const beforeTheme = await page.evaluate(() => {
    const root = document.documentElement;
    const loader = document.querySelector('.route-transition-loader');
    const studio = document.getElementById('simulations');
    const dot = document.querySelector('.route-transition-loader .abs-loader-spinner__dot');
    const dotStyles = [...document.querySelectorAll('.route-transition-loader .abs-loader-spinner__dot')]
      .map((node) => {
        const styles = getComputedStyle(node);
        return {
          width: styles.width,
          height: styles.height,
          borderRadius: styles.borderRadius,
          clipPath: styles.clipPath,
          opacity: styles.opacity,
        };
      });
    return {
      theme: root.dataset.absTheme,
      plate: getComputedStyle(loader).backgroundColor,
      studio: getComputedStyle(studio).backgroundColor,
      ink: getComputedStyle(dot).backgroundColor,
      text: getComputedStyle(root).getPropertyValue('--text-primary').trim(),
      dotStyles,
    };
  });
  assert(beforeTheme.plate === beforeTheme.studio, `${profile.label}: plate does not match studio theme`, beforeTheme);
  beforeTheme.dotStyles.forEach((dot, dotIndex) => {
    assert(dot.width === dot.height, `${profile.label}: dot ${dotIndex + 1} has unequal authored dimensions`, dot);
    assert(dot.borderRadius === '50%', `${profile.label}: dot ${dotIndex + 1} lost its circular radius`, dot);
    assert(dot.clipPath.includes('circle(50%'), `${profile.label}: dot ${dotIndex + 1} lost circular clipping`, dot);
  });

  let afterTheme = null;
  if (index === 0) {
    await page.locator('.button-bar__theme-toggle').evaluate((button) => button.click());
    await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
    afterTheme = await page.evaluate(() => {
      const root = document.documentElement;
      const loader = document.querySelector('.route-transition-loader');
      const studio = document.getElementById('simulations');
      const dot = document.querySelector('.route-transition-loader .abs-loader-spinner__dot');
      return {
        theme: root.dataset.absTheme,
        plate: getComputedStyle(loader).backgroundColor,
        studio: getComputedStyle(studio).backgroundColor,
        ink: getComputedStyle(dot).backgroundColor,
      };
    });
    assert(afterTheme.theme !== beforeTheme.theme, `${profile.label}: the Button Bar theme control did not update the live theme`, {
      beforeTheme,
      afterTheme,
      phase: await page.evaluate(() => document.documentElement.dataset.absTransitionPhase),
    });
    assert(afterTheme.plate === afterTheme.studio, `${profile.label}: plate did not follow a live theme change`, afterTheme);
    assert(afterTheme.plate !== beforeTheme.plate, `${profile.label}: plate colour did not change with the theme`, {
      beforeTheme,
      afterTheme,
    });
    assert(afterTheme.ink !== beforeTheme.ink, `${profile.label}: spinner ink did not change with the theme`, {
      beforeTheme,
      afterTheme,
    });
  }

  const pixelFixture = beforeTheme.dotStyles.map((dot, dotIndex) => (
    `<span class="pixel-dot" style="left:${20 + (dotIndex * 20)}px;width:${dot.width};height:${dot.height};`
      + `border-radius:${dot.borderRadius};clip-path:${dot.clipPath};opacity:${dot.opacity};`
      + `background:${beforeTheme.ink}"></span>`
  )).join('');
  await page.setContent(
    `<style>html,body{margin:0;background:transparent!important}.pixel-dot{position:fixed;top:20px;display:block;overflow:hidden}</style>${pixelFixture}`,
  );

  const pixelChecks = [];
  const dots = page.locator('.pixel-dot');
  assert(await dots.count() === 8, `${profile.label}: fixture does not contain eight dots`);
  for (let dotIndex = 0; dotIndex < 8; dotIndex += 1) {
    const path = resolve(OUTPUT_DIR, `${profile.label}-dot-${dotIndex + 1}.png`);
    const clip = await dots.nth(dotIndex).boundingBox();
    assert(clip && clip.width > 0 && clip.height > 0, `${profile.label}: dot ${dotIndex + 1} has no capture bounds`);
    const buffer = await page.screenshot({ path, omitBackground: true, clip });
    pixelChecks.push({ path, ...inspectCirclePixels(buffer, `${profile.label} dot ${dotIndex + 1}`) });
  }

  await context.close();
  return { profile, beforeTheme, afterTheme, pixelChecks };
}

await mkdir(OUTPUT_DIR, { recursive: true });
assert(PROFILES.length > 0, `Unknown ABS_ROUTE_SPINNER_AUDIT_PROFILE "${REQUESTED_PROFILE}"`);
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (let index = 0; index < PROFILES.length; index += 1) {
    results.push(await captureProfile(browser, PROFILES[index], index));
  }
} finally {
  await browser.close();
}

const reportPath = resolve(OUTPUT_DIR, 'route-loader-spinner-report.json');
await writeFile(reportPath, `${JSON.stringify({ baseUrl: BASE_URL, results }, null, 2)}\n`);
console.log(JSON.stringify({ profiles: results.length, reportPath }, null, 2));
console.log('PASS: route loader dots are circular at DPR 1/2/3 and loader colours follow the live studio theme');
