#!/usr/bin/env node
import { chromium, firefox, webkit } from 'playwright';

const DEFAULT_URL = 'http://127.0.0.1:8013';
const WAIT_MS = Number(process.env.ABS_MODAL_UNIFIED_WAIT_MS || 30000);
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const LINK_GEOMETRY_TOLERANCE_PX = 1;

const BROWSERS = {
  chromium,
  firefox,
  webkit,
};

function resolveOrigin() {
  const raw = String(process.env.ABS_DEV_URL || DEFAULT_URL).trim() || DEFAULT_URL;
  const url = new URL(raw);
  return url.origin;
}

function resolveUrl(pathname = '/index.html') {
  const url = new URL(pathname, resolveOrigin());
  url.searchParams.set('audit', 'home-runtime');
  return url.toString();
}

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function parseRgb(value) {
  const match = /rgba?\(([^)]+)\)/i.exec(String(value || ''));
  if (!match) return null;
  const [r, g, b] = match[1]
    .split(',')
    .slice(0, 3)
    .map((part) => Number.parseFloat(part.trim()));
  if (![r, g, b].every(Number.isFinite)) return null;
  return { r, g, b };
}

function relativeLuminance(rgb) {
  if (!rgb) return null;
  const values = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * values[0]) + (0.7152 * values[1]) + (0.0722 * values[2]);
}

async function waitForAppReady(page) {
  await page.waitForSelector('.simulation-focus-switcher', { timeout: WAIT_MS });
  await page.waitForFunction(
    () => {
      const root = document.documentElement;
      const bootOverlay = document.getElementById('abs-boot-overlay');
      const dock = document.querySelector('.shell-route-dock');
      const styles = dock ? getComputedStyle(dock) : null;
      return (
        !bootOverlay
        && root.dataset.absBootState !== 'booting'
        && (root.dataset.absTransitionPhase || 'idle') === 'idle'
        && dock
        && styles
        && Number.parseFloat(styles.opacity || '0') > 0.5
      );
    },
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function waitForIdle(page) {
  await page.waitForFunction(
    () => {
      const blur = document.getElementById('modal-blur-layer');
      const content = document.getElementById('modal-content-layer');
      return (
        (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
        && (document.documentElement.dataset.absSimulationFocusTransition || 'idle') === 'idle'
        && !blur?.classList.contains('active')
        && !content?.classList.contains('active')
      );
    },
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function openThemedPage(browser, theme) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    colorScheme: theme,
  });
  await page.addInitScript((nextTheme) => {
    window.localStorage.setItem('theme-preference-v2', nextTheme);
  }, theme);
  await page.goto(resolveUrl(), { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
  await page.evaluate((nextTheme) => {
    const isDark = nextTheme === 'dark';
    window.localStorage.setItem('theme-preference-v2', nextTheme);
    document.documentElement.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('dark-mode', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, theme);
  await page.waitForTimeout(80);
  return page;
}

async function openChooser(page) {
  await page.locator('.simulation-focus-switcher').click({ timeout: WAIT_MS });
  await page.waitForSelector('.simulation-focus-modal.active', { timeout: WAIT_MS });
  await page.waitForFunction(
    () => (
      document.documentElement.dataset.absTransitionPhase === 'modal-open'
      && document.getElementById('modal-blur-layer')?.classList.contains('active')
      && document.getElementById('modal-content-layer')?.classList.contains('active')
    ),
    { timeout: WAIT_MS, polling: 25 },
  );
}

async function getChooserTextSamples(page) {
  return page.evaluate(() => {
    document.querySelector('.simulation-focus-modal')?.focus({ preventScroll: true });
    const sample = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const styles = getComputedStyle(element);
      return {
        selector,
        text: element.textContent.trim(),
        color: styles.color,
        opacity: Number.parseFloat(styles.opacity || '1'),
      };
    };

    const inactiveRow = Array.from(document.querySelectorAll('.simulation-focus-row'))
      .find((row) => row.getAttribute('aria-current') !== 'true')
      || document.querySelector('.simulation-focus-row');

    const inactiveSelector = inactiveRow
      ? `.simulation-focus-row:nth-child(${Array.from(inactiveRow.parentElement.children).indexOf(inactiveRow) + 1})`
      : '.simulation-focus-row';

    return {
      title: sample('.simulation-focus-modal__title'),
      inactiveRow: sample(inactiveSelector),
      activeMeta: sample('.simulation-focus-row[aria-current="true"] .simulation-focus-row__meta'),
      textPrimary: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
      htmlDark: document.documentElement.classList.contains('dark-mode'),
      bodyDark: document.body.classList.contains('dark-mode'),
    };
  });
}

function assertChooserContrast(samples, theme) {
  const entries = [samples.title, samples.inactiveRow].filter(Boolean);
  if (samples.activeMeta) entries.push(samples.activeMeta);
  assert(entries.length >= 2, `Missing chooser text samples for ${theme}`, samples);

  const luminanceEntries = entries.map((entry) => ({
    ...entry,
    luminance: relativeLuminance(parseRgb(entry.color)),
  }));
  luminanceEntries.forEach((entry) => {
    assert(Number.isFinite(entry.luminance), `Could not parse chooser text color for ${theme}`, entry);
  });

  if (theme === 'light') {
    luminanceEntries.forEach((entry) => {
      assert(
        entry.luminance < 0.48,
        `Light-mode chooser text is too light: ${entry.selector}`,
        { samples, entry },
      );
    });
    return;
  }

  luminanceEntries.forEach((entry) => {
    assert(
      entry.luminance > 0.55,
      `Dark-mode chooser text is too dark: ${entry.selector}`,
      { samples, entry },
    );
  });
}

async function getShellTabState(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.shell-transition-surface--footer .shell-route-tab')).map((element) => {
    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);
    return {
      id: element.id,
      text: element.textContent.trim(),
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      opacity: Number.parseFloat(styles.opacity || '1'),
      visibility: styles.visibility,
      display: styles.display,
      transform: styles.transform,
    };
  }));
}

function assertShellTabsStable(before, after, label) {
  assert(before.length === after.length && before.length > 0, `Missing shell route tabs during ${label}`, { before, after });
  const failures = [];
  before.forEach((previous, index) => {
    const next = after[index];
    ['left', 'top', 'width', 'height'].forEach((key) => {
      const delta = Math.abs(previous[key] - next[key]);
      if (delta > LINK_GEOMETRY_TOLERANCE_PX) {
        failures.push({
          id: previous.id,
          key,
          before: previous[key],
          after: next[key],
          delta,
          beforeTransform: previous.transform,
          afterTransform: next.transform,
        });
      }
    });
  });
  assert(failures.length === 0, `Shell route tabs shifted during ${label}`, failures);
}

async function assertModalOpenState(page, label) {
  const state = await page.evaluate(() => ({
    phase: document.documentElement.dataset.absTransitionPhase || 'idle',
    blurActive: document.getElementById('modal-blur-layer')?.classList.contains('active') || false,
    contentActive: document.getElementById('modal-content-layer')?.classList.contains('active') || false,
    bootOverlayPresent: Boolean(document.getElementById('abs-boot-overlay')),
    bootState: document.documentElement.dataset.absBootState || '',
  }));
  assert(state.phase === 'modal-open', `${label} did not set modal-open phase`, state);
  assert(state.blurActive && state.contentActive, `${label} did not activate both modal layers`, state);
  assert(!state.bootOverlayPresent && state.bootState !== 'booting', `${label} exposed boot overlay/state`, state);
}

async function closeWithEscape(page, modalSelector) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    (selector) => {
      const modal = document.querySelector(selector);
      if (!modal) return true;
      const styles = getComputedStyle(modal);
      return (
        modal.classList.contains('hidden')
        || styles.display === 'none'
        || styles.visibility === 'hidden'
      );
    },
    modalSelector,
    { timeout: WAIT_MS, polling: 50 },
  );
  await waitForIdle(page);
  await page.waitForTimeout(80);
}

async function verifyChooserOpenClose(page, theme) {
  const beforeLinks = await getShellTabState(page);
  await openChooser(page);
  await assertModalOpenState(page, `${theme} chooser open`);
  const samples = await getChooserTextSamples(page);
  assertChooserContrast(samples, theme);
  await page.waitForTimeout(140);
  const duringLinks = await getShellTabState(page);
  assertShellTabsStable(beforeLinks, duringLinks, `${theme} chooser open`);
  await closeWithEscape(page, '.simulation-focus-modal');
  const afterLinks = await getShellTabState(page);
  assertShellTabsStable(beforeLinks, afterLinks, `${theme} chooser close`);
}

async function verifyContactRouteNavigation(page) {
  await page.click('.shell-route-tab[data-route-tab="contact"]', { timeout: WAIT_MS });
  await page.waitForURL(/contact/i, { timeout: WAIT_MS });
  await page.waitForSelector('#contact-route-main', { timeout: WAIT_MS });
  await waitForIdle(page);
  const state = await page.evaluate(() => ({
    phase: document.documentElement.dataset.absTransitionPhase || 'idle',
    activeRoute: document.querySelector('.shell-route-tab[aria-current="page"]')?.dataset.routeTab || '',
    contactModalActive: document.getElementById('contact-modal')?.classList.contains('active') || false,
    bootOverlayPresent: Boolean(document.getElementById('abs-boot-overlay')),
  }));
  assert(state.phase === 'idle', 'Contact route did not settle idle', state);
  assert(state.activeRoute === 'contact', 'Contact route did not activate shell tab', state);
  assert(!state.contactModalActive, 'Contact route unexpectedly opened legacy modal', state);
  assert(!state.bootOverlayPresent, 'Contact route exposed boot overlay', state);
  await page.goto(resolveUrl(), { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
}

async function verifyChooserRapidReopen(page) {
  await openChooser(page);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.simulation-focus-modal.closing', { timeout: WAIT_MS });
  await page.waitForTimeout(120);

  await page.evaluate(() => {
    document.querySelector('.simulation-focus-switcher')?.click();
  });
  await page.waitForSelector('.simulation-focus-modal.active', { timeout: WAIT_MS });
  await assertModalOpenState(page, 'chooser rapid reopen');
  await page.waitForFunction(
    () => {
      const modal = document.querySelector('.simulation-focus-modal');
      return Boolean(
        modal
        && modal.classList.contains('active')
        && !modal.classList.contains('closing')
        && modal.getAttribute('aria-hidden') === 'false'
      );
    },
    { timeout: WAIT_MS, polling: 50 },
  );

  await closeWithEscape(page, '.simulation-focus-modal');
}

async function verifyChooserSwitchNoBoot(page) {
  await openChooser(page);
  const chosen = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.simulation-focus-row'));
    const target = rows.find((row) => (
      row.getAttribute('aria-current') !== 'true'
      && /Ball Field|Light Swarm|Cube Frame|Water Flow/.test(row.textContent || '')
    )) || rows.find((row) => row.getAttribute('aria-current') !== 'true');
    target?.click();
    return target?.textContent?.trim() || null;
  });
  assert(Boolean(chosen), 'Could not choose a non-active simulation row');
  await waitForIdle(page);
  const state = await page.evaluate(() => ({
    bootOverlayPresent: Boolean(document.getElementById('abs-boot-overlay')),
    bootState: document.documentElement.dataset.absBootState || '',
    phase: document.documentElement.dataset.absTransitionPhase || 'idle',
    simulationFocusPhase: document.documentElement.dataset.absSimulationFocusTransition || 'idle',
    blurActive: document.getElementById('modal-blur-layer')?.classList.contains('active') || false,
    contentActive: document.getElementById('modal-content-layer')?.classList.contains('active') || false,
  }));
  assert(!state.bootOverlayPresent && state.bootState !== 'booting', 'Chooser switch exposed boot overlay/state', { ...state, chosen });
  assert(state.phase === 'idle' && state.simulationFocusPhase === 'idle', 'Chooser switch did not settle idle', { ...state, chosen });
  assert(!state.blurActive && !state.contentActive, 'Chooser switch left modal overlay active', { ...state, chosen });
}

async function main() {
  const browserType = BROWSERS[BROWSER_NAME];
  assert(browserType, `Unsupported ABS_BROWSER: ${BROWSER_NAME}`);
  const browser = await browserType.launch();
  try {
    const lightPage = await openThemedPage(browser, 'light');
    await verifyChooserOpenClose(lightPage, 'light');
    await verifyContactRouteNavigation(lightPage);
    await verifyChooserRapidReopen(lightPage);
    await verifyChooserSwitchNoBoot(lightPage);
    await lightPage.close();

    const darkPage = await openThemedPage(browser, 'dark');
    await verifyChooserOpenClose(darkPage, 'dark');
    await darkPage.close();
  } finally {
    await browser.close();
  }
  console.log(`PASS modal unified behavior audit (${BROWSER_NAME})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
