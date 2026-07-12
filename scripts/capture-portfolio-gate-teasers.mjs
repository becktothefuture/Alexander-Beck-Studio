#!/usr/bin/env node

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const repoRoot = resolve(import.meta.dirname, '..');
const outputDir = resolve(repoRoot, 'react-app/app/public/images/portfolio/gate-preview');
const host = process.env.ABS_GATE_CAPTURE_HOST || '127.0.0.1';
const port = Number(process.env.ABS_GATE_CAPTURE_PORT || 8014);
const baseUrl = `http://${host}:${port}`;
const BAKED_BLUR_PX = 12;
const BLUR_OVERSCAN_SCALE = 1.08;

const captures = [
  { label: 'mobile', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'desktop', width: 1440, height: 900 },
];
const themes = ['light', 'dark'];

function startPreview() {
  return spawn(
    'npm',
    ['run', 'preview', '--prefix', 'react-app/app', '--', '--host', host, '--port', String(port), '--strictPort'],
    {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    },
  );
}

async function waitForPreview(child) {
  let lastError = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Preview exited before capture (code ${child.exitCode})`);
    }
    try {
      const response = await fetch(`${baseUrl}/portfolio.html`);
      if (response.ok) return;
      lastError = new Error(`Preview returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw lastError || new Error('Preview did not become ready');
}

async function captureTeaser(browser, capture, theme) {
  const context = await browser.newContext({
    viewport: { width: capture.width, height: capture.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.addInitScript((themePreference) => {
    localStorage.setItem('theme-preference-v2', themePreference);
    localStorage.removeItem('theme-preference');
    sessionStorage.setItem('abs_portfolio_ok', 'gate-teaser-capture');
  }, theme);
  await page.goto(`${baseUrl}/portfolio.html`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.waitForSelector('.portfolio-slider-layer', { state: 'visible', timeout: 30_000 });
  await page.waitForSelector('.portfolio-deck-card.is-active', { state: 'visible', timeout: 30_000 });
  await page.waitForFunction(() => {
    const root = document.documentElement;
    const mount = document.getElementById('portfolioProjectMount');
    const activeCard = mount?.querySelector('.portfolio-deck-card.is-active');
    const phase = root.dataset.absTransitionPhase || 'idle';
    return phase === 'idle' && Boolean(activeCard?.getBoundingClientRect().width);
  }, { timeout: 30_000 });
  await page.waitForFunction((expectedTheme) => (
    document.documentElement.getAttribute('data-abs-theme') === expectedTheme
    && document.body?.getAttribute('data-abs-theme') === expectedTheme
  ), theme, { timeout: 30_000 });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-play-state: paused !important;
        transition-duration: 0s !important;
      }
      .ui-bottom,
      #edge-caption,
      .inner-wall-gradient-edge,
      .frame-vignette,
      .simulation-contrast-veil,
      .scene-effects {
        visibility: hidden !important;
      }
      #simulations::before { content: none !important; }
      #custom-cursor { display: none !important; }
      #shell-wall-slot,
      #shell-hero-slot {
        filter: blur(${BAKED_BLUR_PX}px) !important;
        transform: scale(${BLUR_OVERSCAN_SCALE}) !important;
        transform-origin: 50% 50% !important;
      }
    `,
  });
  await page.evaluate(() => {
    document.querySelector('.ui-bottom')?.remove();
    document.getElementById('edge-caption')?.remove();
    document.querySelector('.inner-wall-gradient-edge')?.remove();
    document.querySelector('.frame-vignette')?.remove();
    document.querySelector('.simulation-contrast-veil')?.remove();
  });
  await page.waitForTimeout(250);

  const outputPath = resolve(outputDir, `portfolio-gate-${capture.label}-${theme}.jpg`);
  const clip = await page.locator('#simulations').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const border = Number.parseFloat(getComputedStyle(element).borderTopWidth) || 0;
    return {
      x: rect.left + border,
      y: rect.top + border,
      width: Math.max(1, rect.width - (border * 2)),
      height: Math.max(1, rect.height - (border * 2)),
    };
  });
  await page.screenshot({
    path: outputPath,
    type: 'jpeg',
    quality: 86,
    clip,
  });
  await context.close();
  console.log(`[portfolio-gate] ${capture.label}/${theme}: ${outputPath}`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const preview = startPreview();
  let stderr = '';
  preview.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  let browser = null;
  try {
    await waitForPreview(preview);
    browser = await chromium.launch();
    for (const theme of themes) {
      for (const capture of captures) {
        await captureTeaser(browser, capture, theme);
      }
    }
  } catch (error) {
    if (stderr.trim()) console.error(stderr.trim());
    throw error;
  } finally {
    await browser?.close();
    preview.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
