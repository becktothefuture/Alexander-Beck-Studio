#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoRoot = resolve(import.meta.dirname, '..');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');
const outputRoot = resolve(repoRoot, 'output/playwright/mobile-simulation-recapture');
const baseUrl = String(process.env.ABS_DEV_URL || 'http://localhost:8013').trim();
const waitMs = Number(process.env.ABS_SIMULATION_CAPTURE_WAIT_MS || 30000);
const settleMs = Number(process.env.ABS_SIMULATION_CAPTURE_SETTLE_MS || 3000);
const viewport = { width: 393, height: 659 };
const themes = ['light', 'dark'];
const canvasSelector = [
  '#c',
  '#repel-room-canvas',
  '#wall-repel-canvas',
  '#flock-of-birds-canvas',
  '#rift-rings-canvas',
  '.concept-simulation-canvas',
].join(',');

function resolveUrl(pathname = '/index.html') {
  const url = new URL(pathname, baseUrl);
  url.searchParams.set('audit', 'home-runtime');
  return url.toString();
}

function safeName(value) {
  return String(value || 'simulation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function waitForSettledSimulation(page, entry, timeoutMs = waitMs) {
  try {
    await page.waitForFunction(
      ({ expectedId, selector }) => {
      const root = document.documentElement;
      const switcher = document.querySelector('.simulation-focus-switcher');
      const homeSnapshot = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.() || null;
      const activeId = document.querySelector('.daily-simulation-layer')?.dataset.simulationId
        || homeSnapshot?.mode
        || switcher?.dataset.simulationId
        || '';
      const visibleCanvas = Array.from(document.querySelectorAll(selector)).some((canvas) => {
        const rect = canvas.getBoundingClientRect();
        const styles = getComputedStyle(canvas);
        return rect.width > 10
          && rect.height > 10
          && styles.display !== 'none'
          && styles.visibility !== 'hidden'
          && Number(styles.opacity) > 0.02;
      });
      const blur = document.getElementById('window-overlay-blur-layer');
      const blurStyles = blur ? getComputedStyle(blur) : null;
      const snapshot = document.querySelector('.simulation-transaction-snapshot');
      const snapshotStyles = snapshot ? getComputedStyle(snapshot) : null;
      const snapshotVisible = Boolean(snapshotStyles
        && snapshotStyles.display !== 'none'
        && snapshotStyles.visibility !== 'hidden'
        && Number(snapshotStyles.opacity) > 0.02);

      return switcher?.dataset.simulationId === expectedId
        && activeId === expectedId
        && visibleCanvas
        && root.dataset.absBootState !== 'booting'
        && !document.getElementById('abs-boot-overlay')
        && (root.dataset.absTransitionPhase || 'idle') === 'idle'
        && (root.dataset.absSimulationFocusTransition || 'idle') === 'idle'
        && (!blurStyles || (
          blurStyles.visibility === 'hidden'
          && Number(blurStyles.opacity) <= 0.001
        ))
        && !snapshotVisible;
      },
      { expectedId: entry.id, selector: canvasSelector },
      { timeout: timeoutMs, polling: 50 },
    );
  } catch (error) {
    const diagnostics = await page.evaluate((selector) => {
      const root = document.documentElement;
      const homeSnapshot = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.() || null;
      const blur = document.getElementById('window-overlay-blur-layer');
      const blurStyles = blur ? getComputedStyle(blur) : null;
      const snapshot = document.querySelector('.simulation-transaction-snapshot');
      const snapshotStyles = snapshot ? getComputedStyle(snapshot) : null;
      return {
        href: location.href,
        bootState: root.dataset.absBootState || '',
        bootOverlay: Boolean(document.getElementById('abs-boot-overlay')),
        transitionPhase: root.dataset.absTransitionPhase || 'idle',
        simulationTransitionPhase: root.dataset.absSimulationFocusTransition || 'idle',
        switcherId: document.querySelector('.simulation-focus-switcher')?.dataset.simulationId || '',
        layerId: document.querySelector('.daily-simulation-layer')?.dataset.simulationId || '',
        homeMode: homeSnapshot?.mode || '',
        blur: blurStyles ? { visibility: blurStyles.visibility, opacity: blurStyles.opacity } : null,
        snapshot: snapshotStyles ? { visibility: snapshotStyles.visibility, opacity: snapshotStyles.opacity } : null,
        canvases: Array.from(document.querySelectorAll(selector)).map((canvas) => {
          const rect = canvas.getBoundingClientRect();
          const styles = getComputedStyle(canvas);
          return {
            id: canvas.id,
            className: String(canvas.className || ''),
            rect: { width: rect.width, height: rect.height },
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
          };
        }),
      };
    }, canvasSelector);
    throw new Error(`${entry.id} did not settle: ${JSON.stringify(diagnostics)}`, { cause: error });
  }
}

async function chooseSimulation(page, entry) {
  const currentId = await page.locator('.simulation-focus-switcher').getAttribute('data-simulation-id');
  if (currentId === entry.id) {
    await waitForSettledSimulation(page, entry, Math.min(waitMs, 8000));
    return { method: 'current', chooserError: '' };
  }

  try {
    await page.locator('.simulation-focus-switcher').click({ timeout: waitMs });
    await page.waitForSelector('.simulation-focus-modal.active', { timeout: waitMs });
    await page
      .locator('.simulation-focus-modal.active .simulation-focus-row')
      .filter({ hasText: entry.name })
      .first()
      .click({ timeout: waitMs });
    await waitForSettledSimulation(page, entry, Math.min(waitMs, 8000));
    return { method: 'chooser', chooserError: '' };
  } catch (error) {
    const directPath = entry.dailyHref || entry.launchPath || '/index.html';
    await page.goto(resolveUrl(directPath), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.simulation-focus-switcher', { timeout: waitMs });
    await waitForSettledSimulation(page, entry);
    return { method: 'direct-fallback', chooserError: error?.message || String(error) };
  }
}

async function readCaptureState(page, entry, theme) {
  return page.evaluate(({ expectedId, expectedTheme, selector }) => {
    const root = document.documentElement;
    const homeAudit = window.__ABS_HOME_AUDIT__;
    const homeSnapshot = homeAudit?.getRuntimeSnapshot?.() || null;
    const globals = homeAudit?.getGlobals?.() || null;
    const visibleCanvases = Array.from(document.querySelectorAll(selector))
      .map((canvas) => {
        const rect = canvas.getBoundingClientRect();
        const styles = getComputedStyle(canvas);
        return { canvas, rect, styles, area: rect.width * rect.height };
      })
      .filter(({ rect, styles }) => (
        rect.width > 10
        && rect.height > 10
        && styles.display !== 'none'
        && styles.visibility !== 'hidden'
        && Number(styles.opacity) > 0.02
      ))
      .sort((left, right) => right.area - left.area);
    const dailyLayer = document.querySelector('.daily-simulation-layer');
    const dailyCanvas = dailyLayer
      ? visibleCanvases.find(({ canvas }) => dailyLayer.contains(canvas))?.canvas
      : null;
    const homeCanvas = visibleCanvases.find(({ canvas }) => canvas.id === 'c')?.canvas || null;
    const activeCanvas = dailyCanvas || homeCanvas || visibleCanvases[0]?.canvas || null;
    const snapshot = document.querySelector('.simulation-transaction-snapshot');
    const snapshotStyles = snapshot ? getComputedStyle(snapshot) : null;
    const switcher = document.querySelector('.simulation-focus-switcher');
    const switcherStyles = switcher ? getComputedStyle(switcher) : null;
    const title = document.getElementById('hero-title');
    const titleStyles = title ? getComputedStyle(title) : null;
    const titleCanvasVisible = homeSnapshot?.canvasTitleVisible === true
      && Number(homeSnapshot?.canvasTitleMaxOpacity || 0) > 0.35;
    const titleDomVisible = Boolean(titleStyles
      && titleStyles.display !== 'none'
      && titleStyles.visibility !== 'hidden'
      && Number(titleStyles.opacity) > 0.02);
    const renderedTheme = root.getAttribute('data-abs-theme')
      || (root.classList.contains('dark-mode') ? 'dark' : 'light');
    const homeSimulationReady = root.dataset.absHomeSimulationReady === 'true';
    const homeCanvasTitleReady = root.dataset.absHomeCanvasTitleReady === 'true';
    const bodyScale = Number(activeCanvas?.dataset.mobileSimulationBodyScale
      || document.querySelector('[data-mobile-simulation-body-scale]')?.dataset.mobileSimulationBodyScale
      || globals?.mobileSimulationBodyScale
      || 0);
    const bodyCount = Number(activeCanvas?.dataset.simulationBodyCount || homeSnapshot?.ballCount || 0);
    const bodyRadius = Number(activeCanvas?.dataset.simulationBodyRadius || globals?.R_MED || 0);

    return {
      id: expectedId,
      theme: expectedTheme,
      renderedTheme,
      url: window.location.href,
      bootState: root.dataset.absBootState || '',
      transitionPhase: root.dataset.absTransitionPhase || 'idle',
      simulationTransitionPhase: root.dataset.absSimulationFocusTransition || 'idle',
      activeId: switcher?.dataset.simulationId || '',
      bodyScale,
      bodyCount,
      bodyRadius,
      seedCount: Number(activeCanvas?.dataset.simulationSeedCount || 0),
      growthDuration: Number(activeCanvas?.dataset.simulationGrowthDuration || 0),
      starfieldSpanMultiplier: Number(activeCanvas?.dataset.starfieldSpanMultiplier || 0),
      titleVisible: titleCanvasVisible || titleDomVisible || homeCanvasTitleReady,
      titleCanvasVisible,
      titleDomVisible,
      homeSimulationReady,
      homeCanvasTitleReady,
      switcherVisible: Boolean(switcherStyles
        && switcherStyles.display !== 'none'
        && switcherStyles.visibility !== 'hidden'
        && Number(switcherStyles.opacity) > 0.02),
      transactionSnapshot: snapshotStyles ? {
        opacity: Number(snapshotStyles.opacity),
        state: snapshot?.dataset.state || '',
        insideScene: Boolean(document.getElementById('abs-scene')?.contains(snapshot)),
      } : null,
      canvas: activeCanvas ? {
        id: activeCanvas.id || '',
        className: String(activeCanvas.className || ''),
        width: activeCanvas.width,
        height: activeCanvas.height,
        rect: (() => {
          const rect = activeCanvas.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        })(),
      } : null,
    };
  }, { expectedId: entry.id, expectedTheme: theme, selector: canvasSelector });
}

function getCaptureFindings(state) {
  const findings = [];
  if (!state.titleVisible) findings.push('title-hidden');
  if (!state.switcherVisible) findings.push('switcher-hidden');
  return findings;
}

function assertCaptureState(state, expectedBodyScale = 0.8) {
  const errors = [];
  if (state.renderedTheme !== state.theme) errors.push(`theme=${state.renderedTheme}`);
  if (state.bootState === 'booting') errors.push('booting');
  if (state.activeId !== state.id) errors.push(`active=${state.activeId}`);
  if (state.transitionPhase !== 'idle' || state.simulationTransitionPhase !== 'idle') errors.push('transition-busy');
  if (!state.canvas) errors.push('canvas-missing');
  if (Math.abs(state.bodyScale - expectedBodyScale) > 0.001) errors.push(`body-scale=${state.bodyScale}`);
  if (Number(state.transactionSnapshot?.opacity || 0) > 0.02) errors.push('transaction-snapshot-visible');
  if (state.transactionSnapshot && !state.transactionSnapshot.insideScene) errors.push('transaction-snapshot-outside-scene');
  if (errors.length) throw new Error(`${state.theme}/${state.id}: ${errors.join(', ')}`);
}

async function createContactSheet(browser, theme, captures) {
  const context = await browser.newContext({ viewport: { width: 920, height: 1600 } });
  const page = await context.newPage();
  const cards = await Promise.all(captures.map(async (capture) => {
    const data = await readFile(capture.image);
    return `
      <figure>
        <img src="data:image/png;base64,${data.toString('base64')}" alt="${escapeHtml(capture.name)}">
        <figcaption>${escapeHtml(capture.name)} · ${capture.state.bodyCount || '—'} bodies · ${capture.state.bodyRadius?.toFixed?.(2) || '—'}px</figcaption>
      </figure>`;
  }));
  await page.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box}html,body{margin:0;background:#111;color:#fff;font:13px/1.35 Arial,sans-serif}
    main{padding:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    figure{margin:0;min-width:0}img{display:block;width:100%;height:auto;border-radius:8px}
    figcaption{padding-top:6px;color:#ddd}
  </style></head><body><main>${cards.join('')}</main></body></html>`);
  await page.screenshot({ path: resolve(outputRoot, `contact-sheet-${theme}.png`), fullPage: true });
  await context.close();
}

async function captureTheme(browser, entries, theme) {
  const context = await browser.newContext({
    viewport,
    screen: viewport,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: theme,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
  });
  await context.addInitScript(({ selectedTheme }) => {
    localStorage.setItem('theme-preference-v3', selectedTheme);
    sessionStorage.removeItem('abs_simulation_focus_choice_v1');
    sessionStorage.removeItem('abs_simulation_reload_choice_v1');
  }, { selectedTheme: theme });
  const page = await context.newPage();
  await page.goto(resolveUrl('/index.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.simulation-focus-switcher', { timeout: waitMs });

  const captures = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    process.stdout.write(`Capturing ${theme} ${entry.id}... `);
    const selection = await chooseSimulation(page, entry);
    await page.waitForTimeout(settleMs);
    await waitForSettledSimulation(page, entry);
    const state = await readCaptureState(page, entry, theme);
    assertCaptureState(state);
    const filename = `${theme}-${String(index + 1).padStart(2, '0')}-${safeName(entry.id)}.png`;
    const image = resolve(outputRoot, filename);
    await page.screenshot({ path: image, fullPage: false });
    captures.push({ id: entry.id, name: entry.name, image, filename, selection, findings: getCaptureFindings(state), state });
    process.stdout.write('done\n');
  }

  await context.close();
  return captures;
}

async function auditDesktopIsolation(browser, entries) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    screen: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
  });
  await context.addInitScript(() => {
    localStorage.setItem('theme-preference-v3', 'light');
    sessionStorage.removeItem('abs_simulation_focus_choice_v1');
    sessionStorage.removeItem('abs_simulation_reload_choice_v1');
  });
  const page = await context.newPage();
  await page.goto(resolveUrl('/index.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.simulation-focus-switcher', { timeout: waitMs });
  const states = [];
  for (const entry of entries) {
    await chooseSimulation(page, entry);
    const state = await readCaptureState(page, entry, 'light');
    assertCaptureState(state, 1);
    states.push(state);
  }
  await context.close();
  return states;
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const entries = catalog.simulations.filter((entry) => entry.stage === 'daily-rotation');
  if (entries.length !== 18) throw new Error(`Expected 18 Daily Simulations, found ${entries.length}`);

  const browser = await chromium.launch({
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const captures = [];
  let desktopAudit = [];
  try {
    for (const theme of themes) {
      const themeCaptures = await captureTheme(browser, entries, theme);
      captures.push(...themeCaptures);
      await createContactSheet(browser, theme, themeCaptures);
    }
    desktopAudit = await auditDesktopIsolation(browser, entries);
  } finally {
    await browser.close();
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    viewport,
    deviceScaleFactor: 3,
    settleMs,
    count: captures.length,
    captures: captures.map(({ image: _image, ...capture }) => capture),
    desktopAudit,
  };
  await writeFile(resolve(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: true, outputRoot, count: captures.length }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
