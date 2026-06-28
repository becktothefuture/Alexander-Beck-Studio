import { readFileSync } from 'node:fs';
import { chromium, devices, webkit } from 'playwright';

const baseUrl = (process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').trim().replace(/\/+$/, '');
const timeoutMs = Number(process.env.ABS_BOOT_AUDIT_TIMEOUT_MS || 60000);
const minimumVisibleMs = 750;
const browserName = (process.env.ABS_BROWSER || 'chromium').trim().toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const requestedProfile = (process.env.ABS_BOOT_AUDIT_PROFILE || 'all').trim().toLowerCase();
const deprecatedBootChromeHex = '#3c3c3c';
const deprecatedBootChromeRgb = 'rgb(60, 60, 60)';
const tabletDevice = devices['iPad (gen 7)'];
const mobileDevice = devices['iPhone 13'];

const auditProfiles = [
  {
    label: 'desktop',
    contextOptions: {
      viewport: { width: 1440, height: 900 },
    },
  },
  {
    label: 'tablet',
    contextOptions: {
      ...tabletDevice,
    },
  },
  {
    label: 'mobile',
    contextOptions: {
      ...mobileDevice,
    },
    allowHiddenEdge: true,
    allowHiddenQuote: true,
  },
];

const routes = [
  { label: 'home', path: '/index.html', readySelector: '#app-frame' },
  { label: 'portfolio', path: '/portfolio.html', readySelector: '.portfolio-deck-card.is-active' },
  { label: 'cv', path: '/cv.html', readySelector: '#cv-scroll-container' },
  { label: 'styleguide', path: '/styleguide.html', readySelector: '.styleguide-main' },
  { label: 'palette-lab', path: '/palette-lab.html', readySelector: '.palette-lab-main' },
];

const htmlEntryFiles = [
  'react-app/app/index.html',
  'react-app/app/portfolio.html',
  'react-app/app/cv.html',
  'react-app/app/styleguide.html',
  'react-app/app/palette-lab.html',
];
const designConfigFile = 'react-app/app/public/config/design-system.json';

function buildRouteUrl(path) {
  const url = new URL(path, `${baseUrl}/`);
  url.searchParams.set('absBootHold', '1');
  return url.toString();
}

function buildPlainRouteUrl(path) {
  return new URL(path, `${baseUrl}/`).toString();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resolveAuditProfiles() {
  if (requestedProfile === 'all') return auditProfiles;
  const profile = auditProfiles.find((candidate) => candidate.label === requestedProfile);
  assert(
    profile,
    `unknown ABS_BOOT_AUDIT_PROFILE="${requestedProfile}" (expected all, desktop, tablet, or mobile)`
  );
  return [profile];
}

function buildContextOptions(profile, overrides = {}) {
  return {
    ...profile.contextOptions,
    ...overrides,
  };
}

function labelForProfile(label, profile) {
  return `${label}-${profile.label}`;
}

function assertNoDeprecatedBootChrome(value, label) {
  const normalised = String(value || '').trim().toLowerCase();
  assert(
    normalised !== deprecatedBootChromeHex && normalised !== deprecatedBootChromeRgb,
    `${label}: boot chrome started from deprecated ${deprecatedBootChromeHex} value`
  );
}

function assertSourceHasNoDeprecatedBootChrome(source, label) {
  const normalised = String(source || '').toLowerCase();
  assert(
    !normalised.includes(deprecatedBootChromeHex) && !normalised.includes(deprecatedBootChromeRgb),
    `${label}: source includes deprecated boot chrome ${deprecatedBootChromeHex}`
  );
}

function assertCriticalBootSource() {
  const designConfig = JSON.parse(readFileSync(designConfigFile, 'utf8'));
  const canonicalDarkChrome = designConfig?.shell?.theme?.siteFrameDark;
  assert(canonicalDarkChrome, `${designConfigFile}: missing shell.theme.siteFrameDark`);

  for (const file of htmlEntryFiles) {
    const source = readFileSync(file, 'utf8');
    assert(
      source.includes(`style="background:${canonicalDarkChrome};background-color:${canonicalDarkChrome}"`),
      `${file}: missing inline html background fallback`
    );
    assertSourceHasNoDeprecatedBootChrome(source, file);
    assert(
      source.includes('html[data-abs-boot-state="booting"]::before'),
      `${file}: missing critical first-paint boot cover`
    );
    assert(
      source.includes('html[data-abs-boot-state="booting"]::after'),
      `${file}: missing critical first-paint spinner`
    );
    assert(source.includes('absCriticalBootOrbit'), `${file}: missing critical spinner orbit keyframes`);
    assert(source.includes('absCriticalBootColorShift'), `${file}: missing critical spinner color-shift keyframes`);
    assert(source.includes('absBootDotColorShift'), `${file}: missing body spinner color-shift keyframes`);
    assert(source.includes('--abs-dot-color-delay'), `${file}: missing body spinner color phase delays`);
    assert(source.includes('--abs-boot-orbit-ms: 1480ms'), `${file}: boot orbit cadence drifted`);
    assert(source.includes('--abs-boot-color-cycle-ms: 2220ms'), `${file}: boot colour cycle cadence drifted`);
    assert(source.includes('--abs-dot-color-delay: -370ms'), `${file}: missing refined colour phase step`);
    assert(
      source.includes('html:not([data-abs-boot-state="booting"])::after'),
      `${file}: missing explicit critical spinner off-state`
    );
    assert(
      source.includes('#abs-boot-overlay.is-exiting #abs-boot-spinner'),
      `${file}: missing spinner hide rule during boot overlay exit`
    );
    assert(
      source.includes('#abs-boot-overlay.is-exiting .abs-boot-dot::before'),
      `${file}: missing dot animation stop rule during boot overlay exit`
    );
    assert(
      source.includes(`frameColorDark: '${canonicalDarkChrome}'`),
      `${file}: inline frame dark fallback does not match canonical ${canonicalDarkChrome}`
    );
    assert(
      source.includes(`safariFrameDark: '${canonicalDarkChrome}'`),
      `${file}: inline Safari frame dark fallback does not match canonical ${canonicalDarkChrome}`
    );
    assert(
      source.includes(`lockedHeaderDark: '${canonicalDarkChrome}'`),
      `${file}: inline locked-header dark fallback does not match canonical ${canonicalDarkChrome}`
    );
  }
}

async function readBootSnapshot(page) {
  return page.evaluate(() => {
    const root = document.getElementById('root');
    const overlay = document.getElementById('abs-boot-overlay');
    const spinner = document.getElementById('abs-boot-spinner');
    const documentStyle = getComputedStyle(document.documentElement);
    const rootStyle = root ? getComputedStyle(root) : null;
    const overlayStyle = overlay ? getComputedStyle(overlay) : null;
    const criticalSurfaceStyle = getComputedStyle(document.documentElement, '::before');
    const criticalSpinnerStyle = getComputedStyle(document.documentElement, '::after');
    return {
      bootState: document.documentElement.dataset.absBootState || '',
      bootDetail: document.documentElement.dataset.absBootDetail || '',
      browserChrome: documentStyle.getPropertyValue('--abs-browser-chrome').trim(),
      documentBackground: documentStyle.backgroundColor,
      criticalSurfaceBackground: criticalSurfaceStyle?.backgroundColor || '',
      overlayBackground: overlayStyle?.backgroundColor || '',
      overlayPresent: Boolean(overlay),
      overlayVisible: Boolean(overlay && overlayStyle && overlayStyle.display !== 'none' && Number(overlayStyle.opacity) > 0.8),
      overlayExiting: Boolean(overlay?.classList.contains('is-exiting')),
      overlaySpinnerVisible: Boolean(spinner && getComputedStyle(spinner).visibility !== 'hidden' && Number(getComputedStyle(spinner).opacity) > 0.02),
      criticalSpinnerAnimation: criticalSpinnerStyle?.animationName || '',
      rootHidden: Boolean(root?.inert || root?.getAttribute('aria-hidden') === 'true' || rootStyle?.visibility === 'hidden'),
      rootVisible: Boolean(root && !root.inert && root.getAttribute('aria-hidden') !== 'true' && rootStyle?.visibility !== 'hidden'),
      spinnerDotCount: spinner?.querySelectorAll('.abs-boot-dot').length || 0,
      releaseReady: typeof window.__ABS_RELEASE_BOOT_OVERLAY__ === 'function',
    };
  });
}

async function readSpinnerSnapshot(page) {
  return page.evaluate(() => {
    const spinner = document.getElementById('abs-boot-spinner');
    const firstDot = spinner?.querySelector('.abs-boot-dot');
    const spinnerStyle = spinner ? getComputedStyle(spinner) : null;
    const dotStyle = firstDot ? getComputedStyle(firstDot, '::before') : null;
    return {
      dotCount: spinner?.querySelectorAll('.abs-boot-dot').length || 0,
      spinnerAnimation: spinnerStyle?.animationName || '',
      dotAnimation: dotStyle?.animationName || '',
      firstDotColor: dotStyle?.backgroundColor || '',
    };
  });
}

async function readBootElapsedMs(page) {
  return page.evaluate(() => {
    const startedAt = Number(window.__ABS_BOOT_STARTED_AT__ || 0);
    if (!Number.isFinite(startedAt) || startedAt <= 0) return 0;
    const now = startedAt > 100000000000 ? Date.now() : performance.now();
    return Math.max(0, now - startedAt);
  });
}

async function assertMinimumVisibleElapsed(page, label) {
  const elapsed = await readBootElapsedMs(page);
  assert(
    elapsed >= minimumVisibleMs,
    `${label}: expected boot overlay to last at least ${minimumVisibleMs}ms, got ${Math.round(elapsed)}ms`
  );
}

function assertSpinnerReady(snapshot, label, { reducedMotion = false } = {}) {
  assert(snapshot.dotCount === 6, `${label}: expected six boot spinner dots, got ${snapshot.dotCount}`);
  assert(snapshot.firstDotColor && snapshot.firstDotColor !== 'rgba(0, 0, 0, 0)', `${label}: first spinner dot did not resolve a color`);
  if (reducedMotion) {
    assert(snapshot.spinnerAnimation === 'none', `${label}: spinner should not orbit under reduced motion`);
    assert(snapshot.dotAnimation === 'none', `${label}: spinner dots should not pulse under reduced motion`);
  } else {
    assert(snapshot.spinnerAnimation.includes('absBootOrbit'), `${label}: spinner orbit animation was not active`);
    assert(snapshot.dotAnimation.includes('absBootDotPulse'), `${label}: spinner dot pulse animation was not active`);
    assert(snapshot.dotAnimation.includes('absBootDotColorShift'), `${label}: spinner dot color-shift animation was not active`);
  }
}

function assertBootSpinnerGone(snapshot, label) {
  assert(!snapshot.overlayPresent, `${label}: boot overlay was still present after release`);
  assert(!snapshot.overlaySpinnerVisible, `${label}: body boot spinner was still visible after release`);
  assert(
    snapshot.criticalSpinnerAnimation === 'none',
    `${label}: critical boot spinner was still animating after release (${snapshot.criticalSpinnerAnimation})`
  );
}

function assertBootSurfaceColourStable(snapshot, label) {
  assertNoDeprecatedBootChrome(snapshot.browserChrome, `${label}: --abs-browser-chrome`);
  assertNoDeprecatedBootChrome(snapshot.documentBackground, `${label}: document background`);

  if (snapshot.criticalSurfaceBackground && snapshot.criticalSurfaceBackground !== 'rgba(0, 0, 0, 0)') {
    assertNoDeprecatedBootChrome(snapshot.criticalSurfaceBackground, `${label}: critical boot surface`);
  }

  if (snapshot.overlayBackground && snapshot.overlayBackground !== 'rgba(0, 0, 0, 0)') {
    assertNoDeprecatedBootChrome(snapshot.overlayBackground, `${label}: boot overlay surface`);
  }
}

async function assertBootSpinnerHiddenDuringExit(page, label) {
  await page.waitForFunction(() => {
    const overlay = document.getElementById('abs-boot-overlay');
    return !overlay || overlay.classList.contains('is-exiting');
  }, null, { timeout: timeoutMs });

  const snapshot = await readBootSnapshot(page);
  if (snapshot.overlayPresent) {
    assert(snapshot.overlayExiting, `${label}: boot overlay was present but not exiting after release`);
    assert(!snapshot.overlaySpinnerVisible, `${label}: body boot spinner was visible during overlay exit`);
  }
  assert(
    snapshot.criticalSpinnerAnimation === 'none',
    `${label}: critical boot spinner was still active during overlay exit (${snapshot.criticalSpinnerAnimation})`
  );
}

async function readHomeRevealSnapshot(page) {
  return page.evaluate(() => {
    const read = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return {
        selector,
        opacity: Number(style.opacity),
        visibility: style.visibility,
        display: style.display,
        width: rect.width,
        height: rect.height,
      };
    };

    return {
      pending: document.documentElement.classList.contains('abs-home-post-boot-pending'),
      entering: document.documentElement.classList.contains('abs-home-post-boot-enter'),
      complete: document.documentElement.classList.contains('abs-home-post-boot-complete'),
      targets: {
        heroName: read('#hero-title .hero-title__name'),
        heroRole: read('#hero-title .hero-title__role'),
        nav: read('#main-links .footer_link'),
        legend: read('#expertise-legend .legend__item'),
        script: read('.ui-top-right .decorative-script'),
        sound: read('.ui-top-right .sound-toggle'),
        social: read('#social-links .footer_icon-link'),
        meta: read('#site-year.abs-meta-btn'),
        edge: read('#edge-caption'),
        quote: read('#quote-display'),
      },
    };
  });
}

async function readHomeRevealTimingSnapshot(page) {
  return page.evaluate(() => {
    const parseDelayMs = (value) => {
      const first = String(value || '0s').split(',')[0].trim();
      if (first.endsWith('ms')) return Number.parseFloat(first) || 0;
      if (first.endsWith('s')) return (Number.parseFloat(first) || 0) * 1000;
      return Number.parseFloat(first) || 0;
    };
    const readDelay = (node) => {
      if (!node) return null;
      return parseDelayMs(getComputedStyle(node).transitionDelay);
    };
    const readDelayList = (selector) => Array.from(document.querySelectorAll(selector))
      .map((node) => readDelay(node))
      .filter((value) => Number.isFinite(value));

    return {
      identity: readDelayList('#hero-title .hero-title__name, #hero-title .hero-title__role'),
      legend: readDelayList('#expertise-legend .legend__item'),
      context: readDelayList('#app-frame .ui-top-right .decorative-script, #app-frame .ui-top-right .sound-toggle'),
      action: readDelayList('#main-links .footer_link'),
      footer: readDelayList('#social-links .footer_icon-link, #site-year.abs-meta-btn, #edge-caption, #quote-display'),
    };
  });
}

function assertHomeTargetHidden(target, label) {
  assert(target, `home: missing post-boot reveal target ${label}`);
  assert(target.opacity <= 0.02, `home: expected ${label} to be hidden during reveal staging, got opacity ${target.opacity}`);
  assert(target.width > 0 && target.height > 0, `home: expected ${label} to have settled geometry while hidden`);
}

function assertHomeTargetVisible(target, label, minimumOpacity = 0.99) {
  assert(target, `home: missing settled post-boot reveal target ${label}`);
  assert(target.display !== 'none' && target.visibility !== 'hidden', `home: expected ${label} to be visible after reveal`);
  assert(target.opacity >= minimumOpacity, `home: expected ${label} opacity >= ${minimumOpacity}, got ${target.opacity}`);
  assert(target.width > 0 && target.height > 0, `home: expected ${label} to have usable settled geometry`);
}

function targetIsIntentionallyNonRenderable(target) {
  return !target || target.display === 'none' || target.width <= 0 || target.height <= 0;
}

function assertHomeRevealHeld(snapshot, { allowHiddenEdge = false, allowHiddenQuote = false } = {}) {
  assert(snapshot.pending, 'home: expected post-boot reveal pending state while overlay is held');
  assert(!snapshot.entering, 'home: post-boot reveal started before overlay release');
  assert(!snapshot.complete, 'home: post-boot reveal completed before overlay release');

  for (const [label, target] of Object.entries(snapshot.targets)) {
    if (label === 'edge' && allowHiddenEdge && targetIsIntentionallyNonRenderable(target)) continue;
    if (label === 'quote' && allowHiddenQuote && targetIsIntentionallyNonRenderable(target)) continue;
    if (label === 'quote' && !target) continue;
    assertHomeTargetHidden(target, label);
  }
}

function assertHomeRevealStarted(snapshot) {
  assert(!snapshot.pending, 'home: post-boot reveal was still pending after overlay release');
  assert(snapshot.entering, 'home: post-boot reveal did not enter after overlay release');
  assert(!snapshot.complete, 'home: post-boot reveal completed too early');
}

function assertHomeRevealOrder(snapshot, label) {
  assert(snapshot.identity.length >= 2, `${label}: expected transition delays for hero identity`);
  assert(
    snapshot.identity[1] > snapshot.identity[0],
    `${label}: expected hero role to start after hero name`
  );

  assert(snapshot.legend.length >= 6, `${label}: expected transition delays for six legend labels`);
  for (let i = 1; i < 6; i += 1) {
    assert(
      snapshot.legend[i] > snapshot.legend[i - 1],
      `${label}: expected legend label ${i + 1} to start after label ${i}`
    );
  }

  assert(snapshot.context.length > 0, `${label}: expected top-right context transition delays`);
  assert(snapshot.action.length > 0, `${label}: expected action nav transition delays`);
  assert(snapshot.footer.length > 0, `${label}: expected footer transition delays`);

  const firstLegendDelay = Math.min(...snapshot.legend.slice(0, 6));
  const lastLegendDelay = Math.max(...snapshot.legend.slice(0, 6));
  const lastIdentityDelay = Math.max(...snapshot.identity);
  const firstContextDelay = Math.min(...snapshot.context);
  const firstActionDelay = Math.min(...snapshot.action);
  const firstFooterDelay = Math.min(...snapshot.footer);

  assert(
    firstLegendDelay > lastIdentityDelay,
    `${label}: legend starts at ${firstLegendDelay}ms before identity finishes staging at ${lastIdentityDelay}ms`
  );
  assert(
    firstContextDelay > lastLegendDelay,
    `${label}: top-right context starts at ${firstContextDelay}ms before top-left labels finish staging at ${lastLegendDelay}ms`
  );
  assert(
    firstActionDelay > lastLegendDelay,
    `${label}: action nav starts at ${firstActionDelay}ms before top-left labels finish staging at ${lastLegendDelay}ms`
  );
  assert(
    firstFooterDelay > firstActionDelay,
    `${label}: footer starts at ${firstFooterDelay}ms before action nav becomes established at ${firstActionDelay}ms`
  );
}

async function readHomeRevealVisibleOrder(page) {
  return page.evaluate((sampleTimeoutMs) => new Promise((resolve) => {
    const startedAt = performance.now();
    const threshold = 0.08;
    const seen = new Set();
    const sightings = {
      identity: [],
      legend: [],
      context: [],
      action: [],
      footer: [],
    };

    const overlayAllowsVisibility = () => {
      const overlay = document.getElementById('abs-boot-overlay');
      if (!overlay) return true;
      const style = getComputedStyle(overlay);
      return style.display === 'none'
        || style.visibility === 'hidden'
        || Number(style.opacity) <= 0.05;
    };

    const rootAllowsVisibility = () => {
      const root = document.getElementById('root');
      if (!root) return false;
      const style = getComputedStyle(root);
      return !root.inert
        && root.getAttribute('aria-hidden') !== 'true'
        && style.visibility !== 'hidden'
        && style.display !== 'none';
    };

    const collect = (group, selector) => {
      Array.from(document.querySelectorAll(selector)).forEach((node, index) => {
        const key = `${group}:${selector}:${index}`;
        if (seen.has(key)) return;

        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const opacity = Number(style.opacity);
        if (
          style.display !== 'none'
          && style.visibility !== 'hidden'
          && rect.width > 0
          && rect.height > 0
          && opacity >= threshold
        ) {
          seen.add(key);
          sightings[group].push({
            key,
            seenAt: performance.now() - startedAt,
            opacity,
          });
        }
      });
    };

    const tick = () => {
      if (overlayAllowsVisibility() && rootAllowsVisibility()) {
        collect('identity', '#hero-title .hero-title__name, #hero-title .hero-title__role');
        collect('legend', '#expertise-legend .legend__item');
        collect('context', '#app-frame .ui-top-right .decorative-script, #app-frame .ui-top-right .sound-toggle');
        collect('action', '#main-links .footer_link');
        collect('footer', '#social-links .footer_icon-link, #site-year.abs-meta-btn, #edge-caption, #quote-display');
      }

      if (
        document.documentElement.classList.contains('abs-home-post-boot-complete')
        || performance.now() - startedAt >= sampleTimeoutMs
      ) {
        resolve(sightings);
        return;
      }

      requestAnimationFrame(tick);
    };

    tick();
  }), Math.min(timeoutMs, 6000));
}

function firstSeenAt(group) {
  return Math.min(...group.map((item) => item.seenAt));
}

function lastSeenAt(group) {
  return Math.max(...group.map((item) => item.seenAt));
}

function assertHomeRevealUserVisibleOrder(snapshot, label) {
  assert(snapshot.identity.length >= 2, `${label}: expected identity group to become visible to the user`);
  assert(snapshot.legend.length >= 6, `${label}: expected all six legend labels to become visible to the user`);
  assert(snapshot.context.length > 0, `${label}: expected top-right context to become visible to the user`);
  assert(snapshot.action.length > 0, `${label}: expected action nav to become visible to the user`);
  assert(snapshot.footer.length > 0, `${label}: expected footer/support chrome to become visible to the user`);

  const firstIdentity = firstSeenAt(snapshot.identity);
  const firstLegend = firstSeenAt(snapshot.legend);
  const lastLegend = lastSeenAt(snapshot.legend.slice(0, 6));
  const firstContext = firstSeenAt(snapshot.context);
  const firstAction = firstSeenAt(snapshot.action);
  const firstFooter = firstSeenAt(snapshot.footer);

  assert(
    firstIdentity <= firstLegend,
    `${label}: identity became user-visible at ${Math.round(firstIdentity)}ms after legend at ${Math.round(firstLegend)}ms`
  );
  assert(
    firstContext > lastLegend,
    `${label}: top-right context became user-visible at ${Math.round(firstContext)}ms before all legend labels at ${Math.round(lastLegend)}ms`
  );
  assert(
    firstAction > lastLegend,
    `${label}: action nav became user-visible at ${Math.round(firstAction)}ms before all legend labels at ${Math.round(lastLegend)}ms`
  );
  assert(
    firstFooter > firstAction,
    `${label}: footer/support chrome became user-visible at ${Math.round(firstFooter)}ms before action nav at ${Math.round(firstAction)}ms`
  );
}

async function assertHomeRevealVisibleOrder(page, label) {
  const snapshot = await readHomeRevealVisibleOrder(page);
  assertHomeRevealUserVisibleOrder(snapshot, label);
}

function assertHomeRevealSettled(snapshot, { allowHiddenEdge = false, allowHiddenQuote = false } = {}) {
  assert(!snapshot.pending, 'home: post-boot reveal stayed pending after settle');
  assert(!snapshot.entering, 'home: post-boot reveal entering state did not clean up');
  assert(snapshot.complete, 'home: post-boot reveal did not mark complete');

  assertHomeTargetVisible(snapshot.targets.heroName, 'heroName');
  assertHomeTargetVisible(snapshot.targets.nav, 'nav');
  assertHomeTargetVisible(snapshot.targets.legend, 'legend');
  assertHomeTargetVisible(snapshot.targets.script, 'script', 0.69);
  assertHomeTargetVisible(snapshot.targets.sound, 'sound', 0.69);
  assertHomeTargetVisible(snapshot.targets.social, 'social', 0.69);
  assertHomeTargetVisible(snapshot.targets.meta, 'meta', 0.69);
  if (!(allowHiddenEdge && targetIsIntentionallyNonRenderable(snapshot.targets.edge))) {
    assertHomeTargetVisible(snapshot.targets.edge, 'edge', 0.5);
  }
  if (snapshot.targets.quote && !(allowHiddenQuote && targetIsIntentionallyNonRenderable(snapshot.targets.quote))) {
    assertHomeTargetVisible(snapshot.targets.quote, 'quote');
  }
}

async function auditRoute(browser, route, profile) {
  const routeLabel = labelForProfile(route.label, profile);
  const context = await browser.newContext(buildContextOptions(profile));
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('abs_portfolio_ok', 'boot-audit');
      sessionStorage.setItem('abs_cv_ok', 'boot-audit');
    } catch (error) {
      void error;
    }
  });

  const page = await context.newPage();
  const url = buildRouteUrl(route.path);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForSelector('#abs-boot-overlay', { state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(() => typeof window.__ABS_RELEASE_BOOT_OVERLAY__ === 'function', null, { timeout: timeoutMs });

  const held = await readBootSnapshot(page);
  assertBootSurfaceColourStable(held, routeLabel);
  assert(held.bootState === 'booting', `${routeLabel}: expected booting state while held, got ${held.bootState}`);
  assert(held.bootDetail === 'held', `${routeLabel}: expected held boot detail, got ${held.bootDetail}`);
  assert(held.overlayVisible, `${routeLabel}: boot overlay was not visibly held`);
  assert(held.rootHidden, `${routeLabel}: app root was not hidden/inert while held`);
  assert(held.spinnerDotCount === 6, `${routeLabel}: expected six boot spinner dots while held`);
  let homeRevealHeld = null;
  if (route.label === 'home') {
    homeRevealHeld = await readHomeRevealSnapshot(page);
    assertHomeRevealHeld(homeRevealHeld, profile);
  }

  await page.evaluate(() => window.__ABS_RELEASE_BOOT_OVERLAY__());
  await assertBootSpinnerHiddenDuringExit(page, routeLabel);
  await page.waitForFunction(() => document.documentElement.dataset.absBootState === 'ready', null, { timeout: timeoutMs });
  await page.waitForSelector('#abs-boot-overlay', { state: 'detached', timeout: timeoutMs });
  await assertMinimumVisibleElapsed(page, routeLabel);
  await page.waitForSelector(route.readySelector, { state: 'visible', timeout: timeoutMs });

  const released = await readBootSnapshot(page);
  assert(released.rootVisible, `${routeLabel}: app root was not visible after release`);
  assertBootSpinnerGone(released, routeLabel);
  let homeRevealReleased = null;
  let homeRevealSettled = null;
  if (route.label === 'home') {
    await page.waitForFunction(() => document.documentElement.classList.contains('abs-home-post-boot-enter'), null, { timeout: timeoutMs });
    homeRevealReleased = await readHomeRevealSnapshot(page);
    assertHomeRevealStarted(homeRevealReleased);
    const homeRevealTiming = await readHomeRevealTimingSnapshot(page);
    assertHomeRevealOrder(homeRevealTiming, routeLabel);
    await assertHomeRevealVisibleOrder(page, routeLabel);
    await page.waitForFunction(() => document.documentElement.classList.contains('abs-home-post-boot-complete'), null, { timeout: timeoutMs });
    homeRevealSettled = await readHomeRevealSnapshot(page);
    assertHomeRevealSettled(homeRevealSettled, profile);
  }

  await context.close();
  return {
    route: route.label,
    profile: profile.label,
    held: `${held.bootState}/${held.bootDetail}`,
    released: released.bootState,
    selector: route.readySelector,
    homeReveal: homeRevealSettled ? 'staged/released/settled' : '',
  };
}

async function waitForHomeBootReplay(page, label, profile) {
  await page.waitForSelector('#abs-boot-overlay', { state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(() => document.documentElement.classList.contains('abs-home-post-boot-pending'), null, { timeout: timeoutMs });
  const heldBoot = await readBootSnapshot(page);
  assertBootSurfaceColourStable(heldBoot, label);
  const spinner = await readSpinnerSnapshot(page);
  assertSpinnerReady(spinner, label);
  await page.waitForSelector('#abs-boot-overlay', { state: 'detached', timeout: timeoutMs });
  await assertMinimumVisibleElapsed(page, label);
  await page.waitForFunction(() => document.documentElement.classList.contains('abs-home-post-boot-enter'), null, { timeout: timeoutMs });
  const releasedReveal = await readHomeRevealSnapshot(page);
  const releasedBoot = await readBootSnapshot(page);
  assertBootSpinnerGone(releasedBoot, label);
  assertHomeRevealStarted(releasedReveal);
  const revealTiming = await readHomeRevealTimingSnapshot(page);
  assertHomeRevealOrder(revealTiming, label);
  await assertHomeRevealVisibleOrder(page, label);
  await page.waitForFunction(() => document.documentElement.classList.contains('abs-home-post-boot-complete'), null, { timeout: timeoutMs });
  const settledReveal = await readHomeRevealSnapshot(page);
  assertHomeRevealSettled(settledReveal, profile);
}

async function auditHomeDirectReplay(browser, profile) {
  const routeLabel = labelForProfile('home-direct', profile);
  const context = await browser.newContext(buildContextOptions(profile));
  const page = await context.newPage();

  await page.goto(buildPlainRouteUrl('/index.html'), { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitForHomeBootReplay(page, routeLabel, profile);

  await page.reload({ waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitForHomeBootReplay(page, `${routeLabel}-reload`, profile);

  await context.close();
  return {
    route: 'home-direct-reload',
    profile: profile.label,
    held: 'not-held',
    released: 'ready',
    selector: '#app-frame',
    homeReveal: 'minimum-visible/replayed',
  };
}

async function auditHomeReducedMotion(browser, profile) {
  const routeLabel = labelForProfile('home-reduced-motion', profile);
  const context = await browser.newContext({
    ...buildContextOptions(profile),
    reducedMotion: 'reduce',
  });

  const page = await context.newPage();
  const url = buildRouteUrl('/index.html');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForSelector('#abs-boot-overlay', { state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(() => typeof window.__ABS_RELEASE_BOOT_OVERLAY__ === 'function', null, { timeout: timeoutMs });

  const held = await readBootSnapshot(page);
  const heldReveal = await readHomeRevealSnapshot(page);
  assertBootSurfaceColourStable(held, routeLabel);
  assert(held.bootState === 'booting', `${routeLabel}: expected booting state while held, got ${held.bootState}`);
  assert(held.bootDetail === 'held', `${routeLabel}: expected held boot detail, got ${held.bootDetail}`);
  assert(held.overlayVisible, `${routeLabel}: boot overlay was not visibly held`);
  assert(held.rootHidden, `${routeLabel}: app root was not hidden/inert while held`);
  const heldSpinner = await readSpinnerSnapshot(page);
  assertSpinnerReady(heldSpinner, routeLabel, { reducedMotion: true });
  assert(!heldReveal.pending && !heldReveal.entering && !heldReveal.complete, `${routeLabel}: post-boot reveal state should not stage under reduced motion`);

  await page.evaluate(() => window.__ABS_RELEASE_BOOT_OVERLAY__());
  await assertBootSpinnerHiddenDuringExit(page, routeLabel);
  await page.waitForFunction(() => document.documentElement.dataset.absBootState === 'ready', null, { timeout: timeoutMs });
  await page.waitForSelector('#abs-boot-overlay', { state: 'detached', timeout: timeoutMs });
  await assertMinimumVisibleElapsed(page, routeLabel);
  await page.waitForSelector('#app-frame', { state: 'visible', timeout: timeoutMs });

  const released = await readBootSnapshot(page);
  const releasedReveal = await readHomeRevealSnapshot(page);
  assert(released.rootVisible, `${routeLabel}: app root was not visible after release`);
  assertBootSpinnerGone(released, routeLabel);
  assert(!releasedReveal.pending && !releasedReveal.entering, `${routeLabel}: staggered reveal should not run after release`);
  assertHomeTargetVisible(releasedReveal.targets.heroName, 'heroName');
  assertHomeTargetVisible(releasedReveal.targets.nav, 'nav');
  assertHomeTargetVisible(releasedReveal.targets.legend, 'legend');
  assertHomeTargetVisible(releasedReveal.targets.script, 'script', 0.69);

  await context.close();
  return {
    route: 'home-reduced-motion',
    profile: profile.label,
    held: `${held.bootState}/${held.bootDetail}`,
    released: released.bootState,
    selector: '#app-frame',
    homeReveal: 'reduced-motion settled',
  };
}

async function main() {
  assertCriticalBootSource();
  const profiles = resolveAuditProfiles();

  const browser = await browserType.launch();
  const results = [];

  try {
    for (const profile of profiles) {
      results.push(await auditHomeDirectReplay(browser, profile));
      for (const route of routes) {
        results.push(await auditRoute(browser, route, profile));
      }
      results.push(await auditHomeReducedMotion(browser, profile));
    }
  } finally {
    await browser.close();
  }

  console.table(results);
  console.log(`PASS: boot overlay verified on ${results.length} route states in ${browserName} (${profiles.map((profile) => profile.label).join(', ')}).`);
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
