#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium, webkit } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'contrast-veil');
const baseUrl = String(process.env.ABS_CONTRAST_VEIL_URL || process.env.ABS_DEV_URL || 'http://127.0.0.1:8013')
  .replace(/\/+$/, '');
const shouldStartDevServer = !process.env.ABS_CONTRAST_VEIL_URL && !process.env.ABS_DEV_URL;
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const WAIT_MS = Number(process.env.ABS_CONTRAST_VEIL_WAIT_MS || 60000);

const allScenarios = [
  { label: 'home-desktop', path: '/index.html', viewport: { width: 1440, height: 900 }, route: 'home' },
  { label: 'home-mobile', path: '/index.html', viewport: { width: 375, height: 812 }, route: 'home' },
  { label: 'portfolio-locked', path: '/portfolio.html?gate=portfolio', viewport: { width: 1440, height: 900 }, route: 'portfolio-locked' },
  { label: 'portfolio-unlocked', path: '/portfolio.html', viewport: { width: 1440, height: 900 }, route: 'portfolio', unlocked: true },
  { label: 'about-desktop', path: '/about.html', viewport: { width: 1440, height: 900 }, route: 'about' },
  { label: 'contact-mobile', path: '/contact.html', viewport: { width: 375, height: 812 }, route: 'contact' },
];
const scenarioFilter = String(process.env.ABS_CONTRAST_VEIL_SCENARIO || '').trim();
const scenarios = scenarioFilter
  ? allScenarios.filter(({ label }) => label === scenarioFilter)
  : allScenarios;

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

async function waitForHttpReady(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`unexpected response ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw new Error(`Contrast veil server not ready at ${url}: ${lastError?.message || 'unknown error'}`);
}

function startPreviewServer() {
  const child = spawn('npm', ['run', 'preview'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk.toString(); });
  child.stderr.on('data', (chunk) => { logs += chunk.toString(); });
  return {
    getLogs: () => logs,
    stop: async () => {
      if (child.exitCode !== null) return;
      child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveStop) => child.once('exit', resolveStop)),
        delay(2000),
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
    },
  };
}

async function ensureDevServer() {
  try {
    await waitForHttpReady(`${baseUrl}/index.html`, 2000);
    return null;
  } catch (error) {
    if (!shouldStartDevServer) throw error;
  }

  const server = startPreviewServer();
  try {
    await waitForHttpReady(`${baseUrl}/index.html`);
    return server;
  } catch (error) {
    await server.stop();
    throw new Error(`${error.message}\n${server.getLogs()}`.trim());
  }
}

async function waitForShell(page) {
  await page.waitForSelector('#simulations', { state: 'attached', timeout: WAIT_MS });
  await page.waitForSelector('.simulation-contrast-veil', { state: 'attached', timeout: WAIT_MS });
  await page.waitForFunction(() => {
    const root = document.documentElement;
    const phase = root.dataset.absTransitionPhase || 'idle';
    const bootState = root.dataset.absBootState || 'ready';
    const veil = document.querySelector('.simulation-contrast-veil');
    return phase === 'idle'
      && bootState !== 'booting'
      && veil
      && getComputedStyle(veil, '::before').content !== 'none'
      && getComputedStyle(veil, '::after').content !== 'none';
  }, null, { timeout: WAIT_MS });
}

async function readShellState(page, route) {
  return page.evaluate((routeId) => {
    const scene = document.getElementById('simulations');
    const veil = document.querySelector('.simulation-contrast-veil');
    const ui = document.querySelector('.fade-content.ui-layer');
    const before = veil ? getComputedStyle(veil, '::before') : null;
    const after = veil ? getComputedStyle(veil, '::after') : null;
    const rectOf = (element) => {
      const rect = element?.getBoundingClientRect();
      return rect ? {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      } : null;
    };
    const inUi = (selector) => Boolean(document.querySelector(selector)?.closest('.fade-content.ui-layer'));
    const inScene = (selector) => Boolean(document.querySelector(selector)?.closest('#simulations'));
    const inWindowOverlay = (selector) => Boolean(document.querySelector(selector)?.closest('#window-overlay-content-layer'));

    const ownership = {
      socialIcons: inUi('#social-links'),
      londonTime: inUi('#time-display'),
    };

    if (routeId === 'home') {
      ownership.legend = inUi('#expertise-legend');
      ownership.description = inUi('.decorative-script');
      ownership.homeTitleSceneException = inScene('#hero-title');
    } else if (routeId === 'portfolio') {
      ownership.routeTitle = inUi('#hero-title');
      ownership.cardContent = inScene('.portfolio-project-card');
    } else if (routeId === 'portfolio-locked') {
      ownership.gateUi = inWindowOverlay('[data-route-content="portfolio-gate"]');
      ownership.gateScene = inScene('.portfolio-gate-scene');
    } else if (routeId === 'about') {
      ownership.routeTitle = inUi('#about-route-title');
    } else if (routeId === 'contact') {
      ownership.routeTitle = inUi('#contact-route-title');
      ownership.routeDescription = inUi('#contact-route-description');
      ownership.routeAction = inUi('[data-copy-email]');
      ownership.rippleScene = inScene('[data-contact-ripple-stage]');
    }

    return {
      routeId,
      sceneRect: rectOf(scene),
      veilRect: rectOf(veil),
      sceneZ: Number.parseInt(getComputedStyle(scene).zIndex, 10),
      veilZ: Number.parseInt(getComputedStyle(veil).zIndex, 10),
      uiZ: Number.parseInt(getComputedStyle(ui).zIndex, 10),
      veilPointerEvents: getComputedStyle(veil).pointerEvents,
      veilOpacity: Number.parseFloat(getComputedStyle(veil).opacity),
      veilBeforeContent: before?.content || '',
      veilBeforeBackground: before?.backgroundImage || '',
      veilAfterContent: after?.content || '',
      veilAfterBackground: after?.backgroundImage || '',
      ownership,
    };
  }, route);
}

function assertShellState(state) {
  assert(state.sceneZ === 100, 'Scene layer must remain at z-index 100', state);
  assert(state.veilZ === 180, 'Shared veil must remain at z-index 180', state);
  assert(state.uiZ >= 200, 'UI layer must remain at z-index 200 or above', state);
  assert(state.sceneZ < state.veilZ && state.veilZ < state.uiZ, 'Shell stack is not scene → veil → UI', state);
  assert(state.veilPointerEvents === 'none', 'Shared veil captured pointer events', state);
  assert(state.veilOpacity > 0.99, 'Shared veil is not fully present', state);
  assert(state.veilBeforeContent !== 'none' && state.veilAfterContent !== 'none', 'Shared veil pseudo-elements are disabled', state);
  assert(state.veilBeforeBackground !== 'none', 'Shared veil edge field is missing', state);
  assert(state.veilAfterBackground !== 'none', 'Shared veil dither field is missing', state);
  assert(state.sceneRect && state.veilRect, 'Shared scene or veil geometry is missing', state);
  const geometryTolerance = state.routeId === 'portfolio-locked' ? 5 : 1;
  for (const edge of ['left', 'top', 'right', 'bottom', 'width', 'height']) {
    assert(
      Math.abs(state.sceneRect[edge] - state.veilRect[edge]) <= geometryTolerance,
      `Shared veil ${edge} does not match the studio window`,
      state,
    );
  }
  for (const [name, owned] of Object.entries(state.ownership)) {
    assert(owned, `${name} is in the wrong side of the veil`, state);
  }
}

async function assertProjectDrawerStack(page) {
  await page.waitForSelector('.portfolio-project-label', { state: 'attached', timeout: WAIT_MS });
  await page.waitForFunction(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    return Boolean(app?.projectDrawerView && app?.projects?.length > 0 && !app.isProjectOpen);
  }, null, { timeout: WAIT_MS });
  await page.evaluate(() => {
    document.dispatchEvent(new CustomEvent('abs:portfolio:open-project', { detail: { index: 0 } }));
  });
  try {
    await page.waitForFunction(() => {
      const drawer = document.getElementById('portfolioProjectView');
      return drawer?.classList.contains('is-visible') && drawer?.classList.contains('is-open');
    }, null, { timeout: WAIT_MS });
  } catch (error) {
    throw new Error(`Project drawer did not become visible/open: ${error.message}`);
  }
  try {
    await page.waitForFunction(() => (
      window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.projectOpenPhase === 'open'
    ), null, { timeout: WAIT_MS });
  } catch (error) {
    throw new Error(`Project handoff did not settle open: ${error.message}`);
  }

  const openState = await page.evaluate(() => {
    const root = document.getElementById('portfolioProjectView');
    const drawer = root?.querySelector('.portfolio-project-view__drawer');
    const scroll = root?.querySelector('.portfolio-project-view__scroll');
    const veil = root?.querySelector('.portfolio-project-view__veil');
    const heroCopy = root?.querySelector('.portfolio-project-view__hero-copy');
    const title = root?.querySelector('.portfolio-project-view__title');
    const back = root?.querySelector('.portfolio-project-view__back--top');
    const titleRect = title?.getBoundingClientRect();
    if (veil) veil.style.pointerEvents = 'auto';
    const paintOrder = titleRect && veil
      ? document.elementsFromPoint(
          titleRect.left + Math.min(titleRect.width * 0.5, 20),
          titleRect.top + Math.min(titleRect.height * 0.5, 20),
        )
      : [];
    if (veil) veil.style.removeProperty('pointer-events');
    return {
      veilOpacity: Number.parseFloat(getComputedStyle(veil).opacity),
      veilZ: Number.parseInt(getComputedStyle(veil).zIndex, 10),
      veilBeforeContent: getComputedStyle(veil, '::before').content,
      scrollZ: getComputedStyle(scroll).zIndex,
      drawerContainerType: getComputedStyle(drawer).containerType,
      heroCopyZ: Number.parseInt(getComputedStyle(heroCopy).zIndex, 10),
      backZ: Number.parseInt(getComputedStyle(back).zIndex, 10),
      title: title?.textContent?.trim() || '',
      titlePaintIndex: paintOrder.indexOf(title),
      veilPaintIndex: paintOrder.indexOf(veil),
    };
  });

  assert(openState.veilOpacity > 0.99, 'Project veil is not present while the drawer is open', openState);
  assert(openState.veilZ === 2, 'Project veil must remain at local z-index 2', openState);
  assert(openState.veilBeforeContent !== 'none', 'Project veil primitive is disabled', openState);
  assert(openState.scrollZ === 'auto', 'Project scroll surface creates a competing stacking context', openState);
  assert(openState.drawerContainerType === 'size', 'Project container query ownership did not move to the drawer', openState);
  assert(openState.heroCopyZ > openState.veilZ, 'Project title is not above the local veil', openState);
  assert(openState.backZ > openState.veilZ, 'Project Back control is not above the local veil', openState);
  assert(Boolean(openState.title), 'Project title is missing', openState);
  assert(
    openState.titlePaintIndex >= 0 && openState.veilPaintIndex >= 0 && openState.titlePaintIndex < openState.veilPaintIndex,
    'Project title does not paint above the local veil',
    openState,
  );

  await page.evaluate(() => {
    const root = document.getElementById('portfolioProjectView');
    if (!root) return;
    delete root.dataset.absAuditClosingVeilOpacity;
    const observer = new MutationObserver(() => {
      const isClosing = root.classList.contains('is-closing')
        || root.classList.contains('is-shared-handoff-closing');
      if (!isClosing) return;
      requestAnimationFrame(() => {
        const veil = root.querySelector('.portfolio-project-view__veil');
        root.dataset.absAuditClosingVeilOpacity = String(Number.parseFloat(getComputedStyle(veil).opacity));
        observer.disconnect();
      });
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  });
  await page.locator('.portfolio-project-view__back--top').click();
  try {
    await page.waitForFunction(() => !document.body.classList.contains('portfolio-project-open'), null, { timeout: WAIT_MS });
  } catch (error) {
    throw new Error(`Project drawer did not close: ${error.message}`);
  }
  const closingOpacity = await page.locator('#portfolioProjectView').evaluate((root) => (
    Number.parseFloat(root.dataset.absAuditClosingVeilOpacity || '0')
  ));
  assert(closingOpacity > 0.99, 'Project veil disappeared during closing', { closingOpacity });
}

async function runScenario(browser, scenario) {
  const context = await browser.newContext({ viewport: scenario.viewport });
  if (scenario.route === 'portfolio-locked') {
    await context.addInitScript(() => {
      sessionStorage.removeItem('abs_portfolio_ok');
      localStorage.removeItem('abs_portfolio_ok');
    });
    await context.clearCookies();
  } else if (scenario.unlocked) {
    await context.addInitScript(() => {
      document.cookie = 'abs_portfolio_ok=1; Path=/; SameSite=Lax; Max-Age=31536000';
      sessionStorage.setItem('abs_portfolio_ok', String(Date.now()));
    });
  }
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));

  try {
    await page.goto(`${baseUrl}${scenario.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForShell(page);
    if (scenario.route === 'home') {
      await page.waitForSelector('#hero-title', { state: 'attached', timeout: WAIT_MS });
    } else if (scenario.route === 'portfolio-locked') {
      await page.waitForSelector('[data-route-content="portfolio-gate"]', { state: 'attached', timeout: WAIT_MS });
      await page.waitForSelector('[data-portfolio-gate-scene]', { state: 'attached', timeout: WAIT_MS });
    } else if (scenario.route === 'about') {
      await page.waitForSelector('#about-route-title', { state: 'attached', timeout: WAIT_MS });
    } else if (scenario.route === 'contact') {
      await page.waitForSelector('[data-contact-ripple-stage]', { state: 'attached', timeout: WAIT_MS });
      await page.waitForSelector('#contact-route-title', { state: 'attached', timeout: WAIT_MS });
    }
    if (scenario.route === 'portfolio') {
      await page.waitForSelector('.portfolio-project-label', { state: 'attached', timeout: WAIT_MS });
    }
    const state = await readShellState(page, scenario.route);
    assertShellState(state);
    if (scenario.route === 'portfolio') await assertProjectDrawerStack(page);
    assert(pageErrors.length === 0, `Page errors occurred in ${scenario.label}`, pageErrors);
    await page.screenshot({
      path: resolve(outputRoot, `${scenario.label}-${browserName}.png`),
      fullPage: false,
    });
    return state;
  } catch (error) {
    throw new Error(`${scenario.label}: ${error.message}`);
  } finally {
    await context.close();
  }
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const server = await ensureDevServer();
  const browser = await browserType.launch();
  const results = [];
  try {
    for (const scenario of scenarios) {
      console.log(`Checking ${scenario.label}...`);
      results.push({ label: scenario.label, state: await runScenario(browser, scenario) });
    }
  } finally {
    await browser.close();
    await server?.stop();
  }
  console.log(`PASS contrast veil audit (${browserName}): ${results.map(({ label }) => label).join(', ')}`);
}

main().catch((error) => {
  console.error(`FAIL contrast veil audit (${browserName}): ${error.message}`);
  process.exit(1);
});
