#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 30000);
const INVITE_CODE = process.env.ABS_PORTFOLIO_CODE || '739284';
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = BROWSER_NAME === 'webkit' ? webkit : chromium;
const __dirname = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(__dirname, '..', 'output', 'playwright', 'portfolio-gate-audit');

function origin() {
  return new URL(String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8013')).origin;
}

function url(pathname) {
  return new URL(pathname, origin()).toString();
}

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

async function waitForPortfolio(page) {
  await page.waitForFunction(() => {
    const root = document.documentElement;
    const overlay = document.getElementById('abs-boot-overlay');
    const overlayHidden = !overlay
      || getComputedStyle(overlay).visibility === 'hidden'
      || Number.parseFloat(getComputedStyle(overlay).opacity || '1') < 0.02;
    const deck = document.getElementById('portfolioProjectMount');
    return overlayHidden
      && (root.dataset.absTransitionPhase || 'idle') === 'idle'
      && deck?.dataset?.portfolioEntrancePhase === 'complete'
      && Boolean(deck.querySelector('.portfolio-project-card.is-active'));
  }, undefined, { timeout: WAIT_MS, polling: 50 });
}

async function waitForGate(page) {
  await page.waitForFunction(() => {
    const gate = document.querySelector('.portfolio-access-gate.is-open');
    return document.documentElement.dataset.absPortfolioAccessGatePhase === 'open'
      && Boolean(gate)
      && Number.parseFloat(getComputedStyle(gate).opacity || '0') > 0.5;
  }, undefined, { timeout: WAIT_MS, polling: 25 });
}

async function waitForGateClosed(page) {
  await page.waitForFunction(() => (
    !document.documentElement.classList.contains('portfolio-access-gate-open')
    && !document.documentElement.classList.contains('portfolio-access-gate-closing')
    && !document.querySelector('.portfolio-access-gate')
  ), undefined, { timeout: WAIT_MS, polling: 25 });
}

async function waitForDrawer(page, titlePattern = null) {
  await page.waitForFunction(() => document.body.classList.contains('portfolio-project-open'), undefined, {
    timeout: WAIT_MS,
    polling: 25,
  });
  if (titlePattern) {
    await page.getByRole('dialog', { name: titlePattern }).waitFor({ state: 'visible', timeout: WAIT_MS });
  }
}

async function closeDrawer(page) {
  await page.getByRole('button', { name: 'Back to portfolio projects' }).click();
  await page.waitForFunction(() => !document.body.classList.contains('portfolio-project-open'), undefined, {
    timeout: WAIT_MS,
    polling: 25,
  });
}

async function fillGateCode(page, code) {
  await page.waitForFunction((length) => (
    document.querySelectorAll(
      '.portfolio-access-gate.is-open input[aria-label^="Portfolio invite code digit"]'
    ).length === length
  ), code.length, { timeout: WAIT_MS, polling: 25 });
  const inputs = page.locator(
    '.portfolio-access-gate.is-open input[aria-label^="Portfolio invite code digit"]'
  );
  assert(await inputs.count() === code.length, 'Gate digit count does not match the invite code length');
  for (let index = 0; index < code.length; index += 1) {
    await inputs.nth(index).fill(code[index]);
  }
}

async function setActiveProject(page, index) {
  await page.evaluate((projectIndex) => {
    window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.setActiveProject?.(projectIndex, {
      immediate: true,
      focus: false,
      announce: false,
    });
  }, index);
  await page.waitForFunction((projectIndex) => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    return app?.activeProjectIndex === projectIndex
      || app?.activeIndex === projectIndex
      || document.querySelector('.portfolio-project-card.is-active')?.dataset?.projectIndex === String(projectIndex);
  }, index, { timeout: WAIT_MS, polling: 25 }).catch(async () => {
    await page.waitForTimeout(120);
  });
}

async function clearAccess(context, page) {
  await context.clearCookies();
  await page.evaluate(() => {
    document.cookie = 'abs_portfolio_ok=; Path=/; Max-Age=0; SameSite=Lax';
    sessionStorage.removeItem('abs_portfolio_ok');
    localStorage.removeItem('abs_portfolio_ok');
  });
}

async function readState(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const activeCard = document.querySelector('.portfolio-project-card.is-active');
    const gate = document.querySelector('.portfolio-access-gate');
    const gateRect = gate?.getBoundingClientRect() || null;
    const windowRect = document.getElementById('simulations')?.getBoundingClientRect() || null;
    const firstInput = document.querySelector('[aria-label="Portfolio invite code digit 1 of 6"]');
    const legacyBlur = document.getElementById('modal-blur-layer');
    const legacyContent = document.getElementById('modal-content-layer');
    const style = (element) => element ? {
      opacity: Number.parseFloat(getComputedStyle(element).opacity || '0'),
      visibility: getComputedStyle(element).visibility,
      pointerEvents: getComputedStyle(element).pointerEvents,
      filter: getComputedStyle(element).filter,
      transform: getComputedStyle(element).transform,
      backdropFilter: getComputedStyle(element).backdropFilter
        || getComputedStyle(element).webkitBackdropFilter
        || '',
    } : null;
    return {
      path: location.pathname,
      search: location.search,
      historyLength: history.length,
      transitionPhase: root.dataset.absTransitionPhase || 'idle',
      entrancePhase: document.getElementById('portfolioProjectMount')?.dataset?.portfolioEntrancePhase || '',
      entranceReason: document.getElementById('portfolioProjectMount')?.dataset?.portfolioEntranceReason || '',
      deck: Boolean(document.getElementById('portfolioProjectMount')),
      deckCardCount: document.querySelectorAll('.portfolio-project-card').length,
      activeProjectId: activeCard?.dataset?.projectId || '',
      activeProjectAccess: activeCard?.dataset?.projectAccess || '',
      routeGate: Boolean(document.querySelector('[data-route-content="portfolio-gate"]')),
      ghostScene: Boolean(document.querySelector('[data-portfolio-gate-scene]')),
      gateCount: document.querySelectorAll('.portfolio-access-gate').length,
      gatePhase: root.dataset.absPortfolioAccessGatePhase || 'hidden',
      gateVisible: Boolean(gate && getComputedStyle(gate).visibility !== 'hidden' && Number.parseFloat(getComputedStyle(gate).opacity || '0') > 0.5),
      gateStyle: style(gate),
      gateInsideWindow: Boolean(
        gateRect
        && windowRect
        && gateRect.left >= windowRect.left - 1
        && gateRect.top >= windowRect.top - 1
        && gateRect.right <= windowRect.right + 1
        && gateRect.bottom <= windowRect.bottom + 1
      ),
      legacyBlur: style(legacyBlur),
      legacyContent: style(legacyContent),
      firstInputFocused: document.activeElement === firstInput,
      pendingProjectId: app?.pendingProjectIntent?.projectId || '',
      drawerOpen: Boolean(app?.isProjectOpen || document.body.classList.contains('portfolio-project-open')),
      selectedProjectIndex: Number.isInteger(app?.selectedProjectIndex) ? app.selectedProjectIndex : -1,
      cookie: document.cookie,
      sessionAccess: sessionStorage.getItem('abs_portfolio_ok'),
      rootTheme: root.dataset.absTheme || '',
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      focusedLabel: document.activeElement?.getAttribute?.('aria-label') || '',
    };
  });
}

async function createContext(browser, {
  viewport = { width: 1280, height: 900 },
  theme = 'light',
  reducedMotion = 'no-preference',
  mobile = false,
} = {}) {
  const context = await browser.newContext({
    viewport,
    colorScheme: theme,
    reducedMotion,
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  await context.addInitScript((themePreference) => {
    localStorage.setItem('theme-preference-v3', themePreference);
    localStorage.removeItem('theme-preference');
    sessionStorage.removeItem('abs_portfolio_ok');
    localStorage.removeItem('abs_portfolio_ok');
  }, theme);
  return context;
}

async function auditPublicBypass(browser) {
  const context = await createContext(browser);
  const page = await context.newPage();
  try {
    await page.goto(url('/portfolio.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForPortfolio(page);
    await page.evaluate(() => {
      const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
      if (app?.projects?.[0]) app.projects[0].access = 'public';
    });
    await page.locator('.portfolio-project-card.is-active').click();
    await waitForDrawer(page, /S&P Global/i);
    const state = await readState(page);
    assert(!state.gateVisible && state.drawerOpen, 'A public project did not bypass the access gate', state);
    await closeDrawer(page);
    return state;
  } finally {
    await context.close();
  }
}

async function auditProtectedFlow(browser) {
  const context = await createContext(browser);
  const page = await context.newPage();
  const prefix = `${BROWSER_NAME}-desktop-light`;
  try {
    await page.goto(url('/portfolio.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForPortfolio(page);
    const preview = await readState(page);
    assert(preview.deck && preview.deckCardCount > 0, 'Unauthorised Portfolio did not render the live deck', preview);
    assert(!preview.routeGate && !preview.ghostScene && preview.gateCount === 0, 'Portfolio still gated at route entry', preview);
    assert(preview.search === '', 'Portfolio preview URL was not clean', preview);
    await page.screenshot({ path: resolve(outputRoot, `${prefix}-01-preview.png`) });

    await page.locator('.portfolio-project-card.is-active').evaluate((card) => {
      card.click();
      card.click();
      card.click();
    });
    await waitForGate(page);
    const opened = await readState(page);
    assert(opened.gateCount === 1 && opened.gateVisible, 'Rapid activation created no gate or multiple gates', opened);
    assert(opened.pendingProjectId === opened.activeProjectId, 'Gate did not retain the selected project intent', opened);
    assert(!opened.drawerOpen && opened.selectedProjectIndex < 0, 'Drawer began before authorisation', opened);
    assert(opened.firstInputFocused, 'Gate did not focus the first invite-code input', opened);
    assert(opened.gateInsideWindow, 'Gate escaped the studio-window bounds behind the Button Bar', opened);
    assert(opened.legacyBlur?.visibility === 'hidden' && opened.legacyContent?.visibility === 'hidden', 'Legacy modal layers painted above the in-window gate', opened);
    await page.screenshot({ path: resolve(outputRoot, `${prefix}-02-gate.png`) });

    const closeButton = page.getByRole('button', { name: 'Close portfolio access prompt' });
    const inputs = page.getByRole('textbox', { name: /Portfolio invite code digit/ });
    await closeButton.focus();
    await page.keyboard.press('Shift+Tab');
    assert(await inputs.nth(INVITE_CODE.length - 1).evaluate((input) => document.activeElement === input), 'Shift+Tab escaped the gate focus trap');
    await page.keyboard.press('Tab');
    assert(await closeButton.evaluate((button) => document.activeElement === button), 'Tab escaped the gate focus trap');
    await inputs.first().focus();

    await fillGateCode(page, '1'.repeat(INVITE_CODE.length));
    await page.getByText('That code did not match. Try again.').waitFor({ state: 'visible', timeout: WAIT_MS });
    assert(!(await readState(page)).drawerOpen, 'Invalid code opened the project drawer');
    await page.waitForFunction(() => {
      const fields = Array.from(document.querySelectorAll('[aria-label^="Portfolio invite code digit"]'));
      return fields.every((field) => field.value === '') && document.activeElement === fields[0];
    }, undefined, { timeout: WAIT_MS, polling: 25 });

    await page.evaluate(() => {
      window.__ABS_GATE_AUDIT_TIMELINE__ = [];
      const record = () => {
        const root = document.documentElement;
        window.__ABS_GATE_AUDIT_TIMELINE__.push({
          at: performance.now(),
          gateOpen: root.classList.contains('portfolio-access-gate-open') || root.classList.contains('portfolio-access-gate-closing'),
          drawerOpen: document.body.classList.contains('portfolio-project-open'),
        });
      };
      const observer = new MutationObserver(record);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-abs-portfolio-access-gate-phase'] });
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      window.__ABS_GATE_AUDIT_OBSERVER__ = observer;
      record();
    });
    const historyLength = await page.evaluate(() => history.length);
    await fillGateCode(page, INVITE_CODE);
    await waitForGateClosed(page);
    await waitForDrawer(page, /S&P Global/i);
    const accepted = await readState(page);
    const timeline = await page.evaluate(() => {
      window.__ABS_GATE_AUDIT_OBSERVER__?.disconnect();
      return window.__ABS_GATE_AUDIT_TIMELINE__ || [];
    });
    const gateClosedAt = timeline.find((entry) => !entry.gateOpen)?.at;
    const drawerOpenedAt = timeline.find((entry) => entry.drawerOpen)?.at;
    assert(Number.isFinite(gateClosedAt) && Number.isFinite(drawerOpenedAt) && drawerOpenedAt >= gateClosedAt, 'Drawer opened before the gate fully closed', timeline);
    assert(accepted.selectedProjectIndex === 0, 'Successful access opened the wrong project', accepted);
    assert(accepted.cookie.includes('abs_portfolio_ok=') && accepted.sessionAccess, 'Portfolio-wide access was not persisted', accepted);
    assert(accepted.historyLength === historyLength && accepted.path === '/portfolio.html' && accepted.search === '', 'Successful access changed route history or URL', accepted);
    await page.screenshot({ path: resolve(outputRoot, `${prefix}-03-authorised-drawer.png`) });

    await closeDrawer(page);
    await setActiveProject(page, 1);
    await page.locator('.portfolio-project-card.is-active').click();
    await waitForDrawer(page, /SunExpress/i);
    const secondProject = await readState(page);
    assert(!secondProject.gateVisible && secondProject.selectedProjectIndex === 1, 'Second protected project did not use the Portfolio-wide grant', secondProject);
    await closeDrawer(page);

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForPortfolio(page);
    await setActiveProject(page, 2);
    await page.locator('.portfolio-project-card.is-active').click();
    await waitForDrawer(page, /Yoti/i);
    assert(!(await readState(page)).gateVisible, 'Reload did not preserve Portfolio access');
    await closeDrawer(page);

    await clearAccess(context, page);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForPortfolio(page);
    await page.locator('.portfolio-project-card.is-active').click();
    await waitForGate(page);
    assert((await readState(page)).gateVisible, 'Clearing storage did not restore protected-project gating');
    await closeButton.click();
    await waitForGateClosed(page);
    return { preview, opened, accepted, secondProject, timeline };
  } finally {
    await context.close();
  }
}

async function auditKeyboardCancelAndInterruption(browser) {
  const context = await createContext(browser, {
    viewport: { width: 390, height: 844 },
    theme: 'dark',
    mobile: true,
  });
  const page = await context.newPage();
  try {
    await page.goto(url('/portfolio.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForPortfolio(page);
    const activeCard = page.locator('.portfolio-project-card.is-active');
    await activeCard.focus();
    await page.keyboard.press('Enter');
    await waitForGate(page);
    await page.screenshot({ path: resolve(outputRoot, `${BROWSER_NAME}-mobile-dark-gate.png`) });
    await page.keyboard.press('Escape');
    await waitForGateClosed(page);
    await page.waitForFunction(() => document.activeElement?.classList?.contains('is-active'), undefined, {
      timeout: WAIT_MS,
      polling: 25,
    });
    let state = await readState(page);
    assert(!state.drawerOpen && state.focusedLabel.startsWith('Open project 1:'), 'Escape did not restore the originating project focus', state);

    await page.keyboard.press('Space');
    await waitForGate(page);
    await page.getByRole('button', { name: 'Close portfolio access prompt' }).click();
    await waitForGateClosed(page);
    await page.waitForFunction(() => document.activeElement?.classList?.contains('is-active'), undefined, {
      timeout: WAIT_MS,
      polling: 25,
    });
    state = await readState(page);
    assert(!state.drawerOpen && state.focusedLabel.startsWith('Open project 1:'), 'Close control did not restore project focus after Space activation', state);

    await page.keyboard.press('Enter');
    await waitForGate(page);
    const navigated = await page.evaluate(() => window.__ABS_SPA_NAVIGATE__?.('/about.html', { reason: 'portfolio-gate-audit' }) || false);
    if (!navigated) await page.goto(url('/about.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForURL(/\/about\.html/);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('abs:portfolio:access-granted', { detail: { gateId: 'portfolio' } }));
    });
    await page.waitForTimeout(400);
    state = await readState(page);
    assert(!state.drawerOpen && state.gateCount === 0 && state.gatePhase === 'hidden', 'Route interruption left a gate or opened a stale project', state);
    return state;
  } finally {
    await context.close();
  }
}

async function auditReducedMotion(browser) {
  const context = await createContext(browser, { theme: 'dark', reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    await page.goto(url('/portfolio.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForPortfolio(page);
    await page.locator('.portfolio-project-card.is-active').click();
    await waitForGate(page);
    const open = await readState(page);
    assert(open.reducedMotion && open.gateStyle?.transform === 'none' && open.gateStyle?.filter === 'none', 'Reduced-motion gate retained transform or blur motion', open);
    await fillGateCode(page, INVITE_CODE);
    await waitForGateClosed(page);
    await waitForDrawer(page, /S&P Global/i);
    const accepted = await readState(page);
    assert(accepted.drawerOpen && !accepted.gateVisible, 'Reduced-motion access did not continue into the drawer', accepted);
    await page.screenshot({ path: resolve(outputRoot, `${BROWSER_NAME}-reduced-motion-drawer.png`) });
    return { open, accepted };
  } finally {
    await context.close();
  }
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const browser = await browserType.launch({ headless: true });
  try {
    const report = {
      browser: BROWSER_NAME,
      origin: origin(),
      publicBypass: await auditPublicBypass(browser),
      protectedFlow: await auditProtectedFlow(browser),
      keyboardCancelAndInterruption: await auditKeyboardCancelAndInterruption(browser),
      reducedMotion: await auditReducedMotion(browser),
    };
    const reportPath = resolve(outputRoot, `${BROWSER_NAME}-report.json`);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Portfolio project-gate audit passed (${BROWSER_NAME}).`);
    console.log(`Report: ${reportPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
