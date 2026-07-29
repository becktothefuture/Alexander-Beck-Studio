import { readFileSync } from 'node:fs';
import { chromium, devices, webkit } from 'playwright';

const baseUrl = (process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').trim().replace(/\/+$/, '');
const timeoutMs = Number(process.env.ABS_BOOT_AUDIT_TIMEOUT_MS || 60000);
const minimumVisibleMs = 750;
const browserName = (process.env.ABS_BROWSER || 'chromium').trim().toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const requestedProfile = (process.env.ABS_BOOT_AUDIT_PROFILE || 'all').trim().toLowerCase();
const loaderOnly = process.env.ABS_BOOT_AUDIT_LOADER_ONLY === '1';
const copyOnly = process.env.ABS_BOOT_AUDIT_COPY_ONLY === '1';
const deprecatedBootChromeHex = '#3c3c3c';
const deprecatedBootChromeRgb = 'rgb(60, 60, 60)';
const longBootMessages = [
  { afterMs: 5000, text: 'Just getting things ready.' },
  { afterMs: 10000, text: 'Putting a few things in place.' },
  { afterMs: 20000, text: 'Taking a moment longer.' },
  { afterMs: 30000, text: 'Nearly there.' },
  { afterMs: 40000, text: 'Thanks for bearing with me.' },
];
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
  { label: 'contact', path: '/contact.html', readySelector: '[data-route-content="contact"]' },
  { label: 'about', path: '/about.html', readySelector: '[data-route-content="about"]' },
  { label: 'styleguide', path: '/styleguide.html', readySelector: '.styleguide-main' },
  { label: 'palette-lab', path: '/palette-lab.html', readySelector: '.palette-lab-main' },
];

const htmlEntryFiles = [
  'react-app/app/index.html',
  'react-app/app/portfolio.html',
  'react-app/app/about.html',
  'react-app/app/contact.html',
  'react-app/app/styleguide.html',
  'react-app/app/palette-lab.html',
];
const designConfigFile = 'react-app/app/public/config/design-system.json';
const homeRuntimeFile = 'react-app/app/src/legacy/main.js';

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
  const canonicalWall = designConfig?.shell?.theme?.wallBase;
  const canonicalSiteFrame = designConfig?.shell?.theme?.siteFrame;
  assert(canonicalWall, `${designConfigFile}: missing shell.theme.wallBase`);
  assert(canonicalSiteFrame, `${designConfigFile}: missing shell.theme.siteFrame`);
  assert(canonicalSiteFrame === '#000000', `${designConfigFile}: outer frame must be true black`);

  for (const file of htmlEntryFiles) {
    const source = readFileSync(file, 'utf8');
    assert(
      source.includes(`style="background:var(--abs-browser-chrome,${canonicalSiteFrame});background-color:var(--abs-browser-chrome,${canonicalSiteFrame})"`),
      `${file}: missing inline html background fallback`
    );
    assertSourceHasNoDeprecatedBootChrome(source, file);
    assert(!source.includes('html[data-abs-boot-state="booting"]::before'), `${file}: duplicate critical boot cover returned`);
    assert(!source.includes('html[data-abs-boot-state="booting"]::after'), `${file}: duplicate critical spinner returned`);
    assert(source.includes('@keyframes absBootSpin'), `${file}: missing spinner orbit keyframes`);
    assert(source.includes('animation: absBootSpin 1.1s steps(8, end) infinite'), `${file}: boot spinner cadence must match its eight dot positions`);
    assert(source.includes('transform: rotate(360deg) translateZ(0)'), `${file}: spinner rotation must finish forwards`);
    assert(source.includes('--abs-boot-loader-size: 0.5px'), `${file}: boot spinner size drifted`);
    assert(source.includes('class="abs-loader-spinner__dot"'), `${file}: explicit circular spinner dots are missing`);
    assert(source.includes('clip-path: circle(50% at 50% 50%)'), `${file}: spinner dots lost circular clipping`);
    assert(source.includes('--abs-boot-overlay-out-ms: 640ms'), `${file}: boot handoff duration drifted`);
    assert(source.includes('transition: opacity var(--abs-boot-overlay-out-ms, 480ms) cubic-bezier(0.45, 0, 0.55, 1)'), `${file}: boot crossfade easing drifted`);
    assert(source.includes('transform: scale(2.4) translateZ(0)'), `${file}: loader exit scale drifted`);
    assert(source.includes('opacity: 0.72; transform: scale(0.97)'), `${file}: studio-window reveal depth drifted`);
    assert(source.includes("var bootLoaderColors = ['rgba(255, 255, 255, 0.92)'"), `${file}: missing fixed dark-surface loader palette`);
    assert(!source.includes("rgba(32, 33, 36, 0.9)"), `${file}: light-surface loader branch must be removed`);
    assert(!source.includes('var(--ball-'), `${file}: boot loader must not inherit ball palette colors`);
    assert(source.includes('font-size: 11pt'), `${file}: long-wait copy must remain 11pt`);
    assert(source.includes('position: absolute'), `${file}: missing non-shifting message positioning`);
    assert(source.includes('--abs-boot-loader-visual-size: 31px'), `${file}: missing spinner visual-height token`);
    assert(source.includes('top: var(--abs-boot-loader-visual-size)'), `${file}: long-wait copy offset drifted`);
    assert(source.includes('--abs-boot-message-fade: 900ms'), `${file}: long-wait copy fade duration drifted`);
    assert(source.includes('role="status" aria-live="polite" aria-atomic="true"'), `${file}: missing accessible boot status semantics`);
    for (const message of longBootMessages) {
      assert(source.includes(`>${message.text}</p>`), `${file}: missing ${message.afterMs}ms long-wait message`);
    }
    assert(source.includes('--abs-boot-message-in: 5s'), `${file}: missing five-second message threshold`);
    assert(source.includes('--abs-boot-message-in: 10s'), `${file}: missing ten-second message threshold`);
    assert(source.includes('--abs-boot-message-in: 20s'), `${file}: missing twenty-second message threshold`);
    assert(source.includes('--abs-boot-message-in: 30s'), `${file}: missing thirty-second message threshold`);
    assert(source.includes('--abs-boot-message-in: 40s'), `${file}: missing forty-second message threshold`);
    assert(source.includes('@keyframes absBootMessageFadeIn'), `${file}: missing soft message fade-in`);
    assert(source.includes('@keyframes absBootMessageFadeOut'), `${file}: missing soft message fade-out`);
    assert(!source.includes('steps(1, end)'), `${file}: hard message swap returned`);
    assert(!source.includes('LONG_BOOT_MESSAGES'), `${file}: long-wait copy must remain CSS-only`);
    assert(!source.includes('updateLongBootMessage'), `${file}: long-wait copy must not use a timer script`);
    assert(source.includes('@keyframes absBootLoaderExit'), `${file}: missing loader scale-out handoff`);
    assert(source.includes('@keyframes absBootSceneReveal'), `${file}: missing studio-window material handoff`);
    assert(source.includes('transform: scale(0.97)'), `${file}: studio-window reveal depth drifted`);
    assert(!source.includes('@keyframes absBootWorldReveal'), `${file}: fixed outer shell must not scale during boot`);
    assert(source.includes("window.location.protocol === 'file:'"), `${file}: missing raw-file preview detection`);
    assert(source.includes('This preview needs the dev server.'), `${file}: missing raw-file preview guidance`);
    assert(
      source.includes('#abs-boot-overlay.is-exiting #abs-boot-spinner'),
      `${file}: missing spinner hide rule during boot overlay exit`
    );
    assert(!source.includes('animation: absBootStageExit'), `${file}: redundant loader-stage fade returned`);
    assert(
      source.includes(`wallBase: '${canonicalWall}'`),
      `${file}: inline wall fallback does not match canonical ${canonicalWall}`
    );
    assert(
      source.includes(`siteFrame: '${canonicalSiteFrame}'`),
      `${file}: inline site-frame fallback does not match canonical ${canonicalSiteFrame}`
    );
    assert(!source.includes('chromiumFrameDark'), `${file}: obsolete Chromium frame override returned`);
    assert(!source.includes('firefoxFrameDark'), `${file}: obsolete Firefox frame override returned`);
    assert(!source.includes('detectBrowserFamily'), `${file}: first paint must not branch frame color by browser`);
    assert(!source.includes('data-abs-light-browser-chrome'), `${file}: obsolete light browser chrome marker returned`);
  }

  const homeRuntimeSource = readFileSync(homeRuntimeFile, 'utf8');
  assert(homeRuntimeSource.includes('const HOME_CANVAS_READY_TIMEOUT_MS = 3200'), `${homeRuntimeFile}: canvas readiness timeout drifted`);
  assert(homeRuntimeSource.includes('const HOME_TITLE_PREPARE_GRACE_MS = 1200'), `${homeRuntimeFile}: title preparation grace drifted`);
  assert(!homeRuntimeSource.includes('45000'), `${homeRuntimeFile}: blocking 45-second runtime readiness loop returned`);
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
      rootColorScheme: documentStyle.colorScheme,
      rootHidden: Boolean(root?.inert || root?.getAttribute('aria-hidden') === 'true' || rootStyle?.visibility === 'hidden'),
      rootVisible: Boolean(root && !root.inert && root.getAttribute('aria-hidden') !== 'true' && rootStyle?.visibility !== 'hidden'),
      releaseReady: typeof window.__ABS_RELEASE_BOOT_OVERLAY__ === 'function',
    };
  });
}

async function readSpinnerSnapshot(page) {
  return page.evaluate(() => {
    const spinner = document.getElementById('abs-boot-spinner');
    const message = document.getElementById('abs-boot-messages');
    const messageLine = message?.querySelector('.abs-boot-message');
    const spinnerStyle = spinner ? getComputedStyle(spinner) : null;
    const messageStyle = message ? getComputedStyle(message) : null;
    const documentStyle = getComputedStyle(document.documentElement);
    return {
      spinnerAnimation: spinnerStyle?.animationName || '',
      spinnerColor: spinnerStyle?.color || '',
      spinnerFontSize: Number.parseFloat(spinnerStyle?.fontSize || '0'),
      spinnerWidth: Number.parseFloat(spinnerStyle?.width || '0'),
      spinnerHeight: Number.parseFloat(spinnerStyle?.height || '0'),
      spinnerBorderRadius: spinnerStyle?.borderRadius || '',
      dots: Array.from(spinner?.querySelectorAll('.abs-loader-spinner__dot') || []).map((dot) => {
        const style = getComputedStyle(dot);
        return {
          width: Number.parseFloat(style.width || '0'),
          height: Number.parseFloat(style.height || '0'),
          borderRadius: style.borderRadius,
          clipPath: style.clipPath,
          backgroundColor: style.backgroundColor,
        };
      }),
      loaderStrongColor: documentStyle.getPropertyValue('--abs-boot-loader-1').trim(),
      messageColor: documentStyle.getPropertyValue('--abs-boot-message-color').trim(),
      resolvedMessageColor: messageLine ? getComputedStyle(messageLine).color : '',
      messagePosition: messageStyle?.position || '',
      messageTop: Number.parseFloat(messageStyle?.top || '0'),
      messageFontSize: Number.parseFloat(messageStyle?.fontSize || '0'),
      messageTextAlign: messageStyle?.textAlign || '',
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
  assert(snapshot.dots.length === 8, `${label}: expected eight explicit spinner dots`);
  snapshot.dots.forEach((dot, index) => {
    assert(Math.abs(dot.width - dot.height) <= 0.01, `${label}: dot ${index + 1} is not square before clipping`);
    assert(dot.borderRadius === '50%', `${label}: dot ${index + 1} lost its circular radius`);
    assert(dot.clipPath.includes('circle(50%'), `${label}: dot ${index + 1} lost circular clipping`);
  });
  assert(snapshot.spinnerFontSize >= 4.9 && snapshot.spinnerFontSize <= 5.1, `${label}: spinner core size drifted to ${snapshot.spinnerFontSize}px`);
  assert(snapshot.spinnerWidth >= 4.9 && snapshot.spinnerWidth <= 5.1, `${label}: spinner width drifted to ${snapshot.spinnerWidth}px`);
  assert(snapshot.spinnerHeight >= 4.9 && snapshot.spinnerHeight <= 5.1, `${label}: spinner height drifted to ${snapshot.spinnerHeight}px`);
  assert(snapshot.spinnerBorderRadius === '50%', `${label}: spinner dots are no longer circular (${snapshot.spinnerBorderRadius})`);
  const visualSize = snapshot.spinnerFontSize * 6.2;
  assert(visualSize >= 30.9 && visualSize <= 31.1, `${label}: spinner visual footprint drifted to ${visualSize}px`);
  assert(snapshot.messagePosition === 'absolute', `${label}: long-wait message must not affect loader layout`);
  assert(Math.abs(snapshot.messageTop - 31) <= 0.1, `${label}: long-wait message top offset drifted to ${snapshot.messageTop}px`);
  assert(snapshot.messageFontSize >= 14.6 && snapshot.messageFontSize <= 14.8, `${label}: expected 11pt copy, got ${snapshot.messageFontSize}px`);
  assert(snapshot.messageTextAlign === 'center', `${label}: long-wait message is not center aligned`);
  if (reducedMotion) {
    assert(snapshot.spinnerAnimation === 'none', `${label}: spinner should not animate under reduced motion`);
  } else {
    assert(
      snapshot.spinnerAnimation.includes('absBootSpin')
        || snapshot.spinnerAnimation.includes('absBootLoaderExit'),
      `${label}: spinner orbit animation or release handoff was not active`
    );
  }
}

function assertSpinnerTheme(bootSnapshot, spinnerSnapshot, label) {
  assert(bootSnapshot.rootColorScheme.includes('dark'), `${label}: root browser color-scheme must stay dark during boot`);
  assert(spinnerSnapshot.loaderStrongColor.includes('255, 255, 255'), `${label}: dark boot surface did not use light loader ink`);
  assert(spinnerSnapshot.spinnerColor.includes('255, 255, 255'), `${label}: loader did not resolve light ink`);
  assert(spinnerSnapshot.dots.every((dot) => dot.backgroundColor.includes('255, 255, 255')), `${label}: spinner dots did not inherit light ink`);
  assert(spinnerSnapshot.messageColor.includes('255, 255, 255'), `${label}: dark boot surface did not use light message ink`);
  assert(spinnerSnapshot.resolvedMessageColor.includes('255, 255, 255'), `${label}: message copy did not inherit its subtle light ink`);
  assert(spinnerSnapshot.resolvedMessageColor.includes('0.54'), `${label}: message copy lost its subtle opacity`);
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

async function auditBootTheme(browser, { colorScheme, reducedMotion = false }) {
  const label = `theme-${colorScheme}${reducedMotion ? '-reduced-motion' : ''}`;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();

  await page.goto(buildPlainRouteUrl('/index.html'), { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForSelector('#abs-boot-spinner', { state: 'visible', timeout: timeoutMs });

  const bootSnapshot = await readBootSnapshot(page);
  const spinnerSnapshot = await readSpinnerSnapshot(page);
  assertBootSurfaceColourStable(bootSnapshot, label);
  assertSpinnerReady(spinnerSnapshot, label, { reducedMotion });
  assertSpinnerTheme(bootSnapshot, spinnerSnapshot, label, colorScheme);

  await context.close();
  return {
    route: label,
    profile: 'desktop',
    held: 'initial-paint',
    released: bootSnapshot.bootState,
    selector: '#abs-boot-spinner',
    homeReveal: reducedMotion ? 'static loader' : 'animated loader',
  };
}

async function auditBootHandoff(browser, { reducedMotion = false }) {
  const label = reducedMotion ? 'handoff-reduced-motion' : 'handoff-spatial';
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();

  await page.goto(buildPlainRouteUrl('/index.html'), { waitUntil: 'commit', timeout: timeoutMs });
  await page.waitForFunction(() => (
    document.documentElement.dataset.absBootState === 'revealing'
    && document.getElementById('abs-boot-overlay')?.classList.contains('is-exiting')
  ), null, { polling: 'raf', timeout: timeoutMs });

  const snapshot = await page.evaluate(() => {
    const root = document.getElementById('root');
    const scene = document.getElementById('shell-wall-slot');
    const spinner = document.getElementById('abs-boot-spinner');
    const overlay = document.getElementById('abs-boot-overlay');
    const buttonBar = document.querySelector('[data-button-bar]');
    const rootStyle = root ? getComputedStyle(root) : null;
    const sceneStyle = scene ? getComputedStyle(scene) : null;
    const spinnerStyle = spinner ? getComputedStyle(spinner) : null;
    const overlayStyle = overlay ? getComputedStyle(overlay) : null;
    const buttonRect = buttonBar?.getBoundingClientRect();
    return {
      rootAnimation: rootStyle?.animationName || '',
      rootTransform: rootStyle?.transform || '',
      sceneAnimation: sceneStyle?.animationName || '',
      sceneTransform: sceneStyle?.transform || '',
      spinnerAnimation: spinnerStyle?.animationName || '',
      spinnerTransform: spinnerStyle?.transform || '',
      overlayDuration: overlayStyle?.transitionDuration || '',
      simulationReady: document.documentElement.dataset.absHomeSimulationReady || '',
      titlePrepared: document.documentElement.dataset.absHomeCanvasTitlePrepared || '',
      postBootEntering: document.documentElement.classList.contains('abs-home-post-boot-enter'),
      materialPhase: window.__ABS_SIMULATION_VISUAL_TRANSITION__?.phase || '',
      buttonRect: buttonRect ? {
        x: buttonRect.x,
        y: buttonRect.y,
        width: buttonRect.width,
        height: buttonRect.height,
      } : null,
    };
  });

  assert(snapshot.rootAnimation === 'none', `${label}: fixed outer shell received a boot animation`);
  assert(snapshot.rootTransform === 'none', `${label}: fixed outer shell received a boot transform`);
  assert(snapshot.simulationReady === 'true', `${label}: overlay released before simulation readiness`);
  assert(snapshot.titlePrepared === 'true', `${label}: overlay released before canvas-title geometry was prepared`);
  assert(!snapshot.postBootEntering, `${label}: Home copy started while the loader overlay still existed`);
  assert(snapshot.buttonRect, `${label}: missing stable Button Bar geometry`);

  if (reducedMotion) {
    assert(snapshot.sceneAnimation === 'none', `${label}: studio-window scale should be removed`);
    assert(snapshot.spinnerAnimation === 'none', `${label}: loader scale should be removed`);
  } else {
    assert(snapshot.sceneAnimation.includes('absBootSceneReveal'), `${label}: studio-window material reveal was not active`);
    assert(snapshot.spinnerAnimation.includes('absBootLoaderExit'), `${label}: loader scale-out was not active`);
    assert(snapshot.sceneTransform !== 'none', `${label}: studio-window reveal transform did not resolve`);
    assert(snapshot.spinnerTransform !== 'none', `${label}: loader exit transform did not resolve`);
    assert(snapshot.materialPhase === 'in', `${label}: simulation material bloom did not start with overlay exit`);

    await page.waitForFunction(() => {
      const overlay = document.getElementById('abs-boot-overlay');
      if (!overlay) return false;
      const opacity = Number(getComputedStyle(overlay).opacity);
      return opacity >= 0.3 && opacity <= 0.7;
    }, null, { polling: 'raf', timeout: 1200 });
    const midpoint = await page.evaluate(() => {
      const overlay = document.getElementById('abs-boot-overlay');
      const spinner = document.getElementById('abs-boot-spinner');
      const scene = document.getElementById('shell-wall-slot');
      const readScale = (node) => {
        const transform = node ? getComputedStyle(node).transform : 'none';
        return !transform || transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
      };
      return {
        overlayPresent: Boolean(overlay),
        overlayOpacity: overlay ? Number(getComputedStyle(overlay).opacity) : 0,
        spinnerOpacity: spinner ? Number(getComputedStyle(spinner).opacity) : 0,
        spinnerScale: readScale(spinner),
        sceneScale: readScale(scene),
      };
    });
    assert(midpoint.overlayPresent, `${label}: overlay detached before the handoff midpoint`);
    assert(midpoint.overlayOpacity >= 0.3 && midpoint.overlayOpacity <= 0.7, `${label}: midpoint crossfade opacity drifted to ${midpoint.overlayOpacity}`);
    assert(midpoint.spinnerOpacity >= 0.75, `${label}: spinner disappeared before its scale-out became visible`);
    assert(midpoint.spinnerScale >= 1.08 && midpoint.spinnerScale < 2, `${label}: spinner midpoint scale drifted to ${midpoint.spinnerScale}`);
    assert(midpoint.sceneScale > 0.97 && midpoint.sceneScale < 1, `${label}: studio-window midpoint scale drifted to ${midpoint.sceneScale}`);
  }

  await page.waitForSelector('#abs-boot-overlay', { state: 'detached', timeout: timeoutMs });
  await page.waitForFunction((expectsReducedMotion) => {
    const root = document.documentElement;
    return expectsReducedMotion
      ? root.classList.contains('abs-home-post-boot-complete')
      : root.classList.contains('abs-home-post-boot-enter');
  }, reducedMotion, { polling: 'raf', timeout: timeoutMs });

  const settledButtonRect = await page.locator('[data-button-bar]').evaluate((buttonBar) => {
    const rect = buttonBar.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  for (const key of ['x', 'y', 'width', 'height']) {
    assert(
      Math.abs(settledButtonRect[key] - snapshot.buttonRect[key]) <= 0.25,
      `${label}: fixed Button Bar ${key} shifted during boot handoff`
    );
  }

  await context.close();
  return {
    route: label,
    profile: 'desktop',
    held: 'handoff-frame',
    released: 'revealing',
    selector: '#abs-boot-overlay + #root',
    homeReveal: reducedMotion ? 'static scene/copy after detach' : 'loader-out/material-in/copy-after-detach',
  };
}

async function readLongBootSnapshot(page) {
  return page.evaluate(() => {
    const spinner = document.getElementById('abs-boot-spinner');
    const messageHost = document.getElementById('abs-boot-messages');
    const messages = Array.from(document.querySelectorAll('.abs-boot-message'));
    const messageOpacities = messages.map((message) => Number(getComputedStyle(message).opacity));
    const visibleMessage = messages.find((message) => {
      const style = getComputedStyle(message);
      return style.visibility !== 'hidden' && Number(style.opacity) > 0.5;
    });
    const spinnerRect = spinner?.getBoundingClientRect();
    const spinnerStyle = spinner ? getComputedStyle(spinner) : null;
    const spinnerVisualHeight = Number.parseFloat(spinnerStyle?.fontSize || '0') * 6.2;
    const messageRect = messageHost?.getBoundingClientRect();
    const messageStyle = messageHost ? getComputedStyle(messageHost) : null;
    const textRange = visibleMessage ? document.createRange() : null;
    if (textRange && visibleMessage) textRange.selectNodeContents(visibleMessage);
    return {
      message: visibleMessage?.textContent || '',
      messageVisible: Boolean(visibleMessage),
      messageOpacities,
      messageTextHeight: textRange?.getBoundingClientRect().height || 0,
      messagePosition: messageStyle?.position || '',
      messageFontSize: Number.parseFloat(messageStyle?.fontSize || '0'),
      messageTextAlign: messageStyle?.textAlign || '',
      spinnerVisualHeight,
      messageGap: spinnerRect && messageRect
        ? messageRect.top - ((spinnerRect.top + (spinnerRect.height / 2)) + (spinnerVisualHeight / 2))
        : 0,
      spinnerCenterX: spinnerRect ? spinnerRect.left + (spinnerRect.width / 2) : 0,
      spinnerCenterY: spinnerRect ? spinnerRect.top + (spinnerRect.height / 2) : 0,
    };
  });
}

async function auditLongBootMessages(browser) {
  const label = 'long-wait-copy';
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.route('**/src/entries/index.jsx*', (route) => route.abort('failed'));
  await page.route('**/assets/index-*.js', (route) => route.abort('failed'));

  await page.goto(buildPlainRouteUrl('/index.html'), { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForSelector('#abs-boot-spinner', { state: 'visible', timeout: timeoutMs });

  await page.evaluate(() => {
    document.querySelectorAll('.abs-boot-message').forEach((message) => {
      message.getAnimations().forEach((animation) => {
        animation.pause();
        animation.currentTime = 0;
      });
    });
  });
  const initial = await readLongBootSnapshot(page);
  assert(!initial.messageVisible && initial.message === '', `${label}: copy appeared before five seconds`);
  assert(initial.messagePosition === 'absolute', `${label}: message participates in loader layout`);
  assert(initial.messageFontSize >= 14.6 && initial.messageFontSize <= 14.8, `${label}: expected 11pt copy, got ${initial.messageFontSize}px`);
  assert(initial.messageTextAlign === 'center', `${label}: copy is not center aligned`);
  assert(
    Math.abs(initial.messageGap - (initial.spinnerVisualHeight / 2)) <= 0.1,
    `${label}: expected a half-spinner-height gap, got ${initial.messageGap}px`
  );

  await page.evaluate(() => {
    document.querySelectorAll('.abs-boot-message').forEach((message) => {
      message.getAnimations().forEach((animation) => {
        animation.currentTime = 9550;
      });
    });
  });
  const fadeOut = await readLongBootSnapshot(page);
  assert(
    fadeOut.messageOpacities[0] > 0.05 && fadeOut.messageOpacities[0] < 0.95,
    `${label}: outgoing copy did not fade softly (${JSON.stringify(fadeOut.messageOpacities)})`
  );

  await page.evaluate(() => {
    document.querySelectorAll('.abs-boot-message').forEach((message) => {
      message.getAnimations().forEach((animation) => {
        animation.currentTime = 10000;
      });
    });
  });
  const swapPoint = await readLongBootSnapshot(page);
  assert(
    swapPoint.messageOpacities[0] < 0.02 && swapPoint.messageOpacities[1] < 0.02,
    `${label}: message swap produced overlapping copy (${JSON.stringify(swapPoint.messageOpacities)})`
  );

  await page.evaluate(() => {
    document.querySelectorAll('.abs-boot-message').forEach((message) => {
      message.getAnimations().forEach((animation) => {
        animation.currentTime = 10450;
      });
    });
  });
  const fadeIn = await readLongBootSnapshot(page);
  assert(
    fadeIn.messageOpacities[0] < 0.02
      && fadeIn.messageOpacities[1] > 0.05 && fadeIn.messageOpacities[1] < 0.95,
    `${label}: incoming copy did not fade softly (${JSON.stringify(fadeIn.messageOpacities)})`
  );

  for (const expected of longBootMessages) {
    await page.evaluate((elapsed) => {
      document.querySelectorAll('.abs-boot-message').forEach((message) => {
        message.getAnimations().forEach((animation) => {
          animation.currentTime = elapsed;
        });
      });
    }, expected.afterMs + 920);
    const snapshot = await readLongBootSnapshot(page);
    assert(snapshot.messageVisible, `${label}: ${expected.afterMs}ms message was not visible`);
    assert(snapshot.message === expected.text, `${label}: ${expected.afterMs}ms message did not swap correctly`);
    assert(snapshot.messageTextHeight <= 21, `${label}: ${expected.afterMs}ms message wrapped onto multiple lines`);
    assert(Math.abs(snapshot.spinnerCenterX - initial.spinnerCenterX) <= 0.01, `${label}: message shifted loader horizontally at ${expected.afterMs}ms`);
    assert(Math.abs(snapshot.spinnerCenterY - initial.spinnerCenterY) <= 0.01, `${label}: message shifted loader vertically at ${expected.afterMs}ms`);
  }

  await context.close();
  return {
    route: label,
    profile: 'desktop',
    held: 'module-aborted',
    released: 'booting',
    selector: '#abs-boot-messages',
    homeReveal: '5/10/20/30/40s swapped',
  };
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
        nav: read('[data-route-tab]'),
        legend: read('#expertise-legend .legend__item'),
        script: read('.ui-top-right .decorative-script'),
        social: read('#social-links .footer_icon-link'),
        meta: read('#site-year.abs-meta-btn'),
        edge: read('#edge-caption'),
        quote: read('#quote-display'),
        simulationTab: read('.simulation-focus-switcher-slot'),
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
      context: readDelayList('#app-frame .ui-top-right .decorative-script'),
      action: readDelayList('[data-route-tab]'),
      footer: readDelayList('#social-links .footer_icon-link, #site-year.abs-meta-btn, #edge-caption, #quote-display'),
      simulationTab: readDelayList('.simulation-focus-switcher-slot'),
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
    // The Button Bar belongs to the stable shell and is covered by the boot
    // overlay, not staged as route-owned entrance content.
    if (label === 'nav') continue;
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
  assert(snapshot.simulationTab.length > 0, `${label}: expected simulation tab transition delay`);

  const firstLegendDelay = Math.min(...snapshot.legend.slice(0, 6));
  const lastLegendDelay = Math.max(...snapshot.legend.slice(0, 6));
  const lastIdentityDelay = Math.max(...snapshot.identity);
  const firstContextDelay = Math.min(...snapshot.context);
  const firstActionDelay = Math.min(...snapshot.action);
  const firstFooterDelay = Math.min(...snapshot.footer);
  const lastFooterDelay = Math.max(...snapshot.footer);
  const firstSimulationTabDelay = Math.min(...snapshot.simulationTab);

  assert(
    firstLegendDelay > lastIdentityDelay,
    `${label}: legend starts at ${firstLegendDelay}ms before identity finishes staging at ${lastIdentityDelay}ms`
  );
  assert(
    firstContextDelay > lastLegendDelay,
    `${label}: top-right context starts at ${firstContextDelay}ms before top-left labels finish staging at ${lastLegendDelay}ms`
  );
  assert(
    firstActionDelay >= 0,
    `${label}: bottom route tabs reported an invalid transition delay ${firstActionDelay}ms`
  );
  assert(
    firstFooterDelay > lastLegendDelay,
    `${label}: footer starts at ${firstFooterDelay}ms before top-left labels finish staging at ${lastLegendDelay}ms`
  );
  assert(
    firstSimulationTabDelay > lastIdentityDelay,
    `${label}: simulation tab starts at ${firstSimulationTabDelay}ms before the Home identity is staged at ${lastIdentityDelay}ms`
  );
  assert(
    firstSimulationTabDelay <= firstLegendDelay,
    `${label}: simulation tab starts at ${firstSimulationTabDelay}ms after supporting content begins at ${firstLegendDelay}ms`
  );
  assert(
    firstSimulationTabDelay < Math.max(firstContextDelay, firstActionDelay, lastFooterDelay),
    `${label}: simulation tab is still sequenced behind the complete Home support flow`
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
      simulationTab: [],
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
        collect('context', '#app-frame .ui-top-right .decorative-script');
        collect('action', '[data-route-tab]');
        collect('footer', '#social-links .footer_icon-link, #site-year.abs-meta-btn, #edge-caption, #quote-display');
        collect('simulationTab', '.simulation-focus-switcher-slot');
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
  assert(snapshot.simulationTab.length > 0, `${label}: expected simulation tab to become visible to the user`);

  const firstIdentity = firstSeenAt(snapshot.identity);
  const firstLegend = firstSeenAt(snapshot.legend);
  const lastLegend = lastSeenAt(snapshot.legend.slice(0, 6));
  const firstContext = firstSeenAt(snapshot.context);
  const firstAction = firstSeenAt(snapshot.action);
  const firstFooter = firstSeenAt(snapshot.footer);
  const lastFooter = lastSeenAt(snapshot.footer);
  const firstSimulationTab = firstSeenAt(snapshot.simulationTab);

  assert(
    firstIdentity <= firstLegend,
    `${label}: identity became user-visible at ${Math.round(firstIdentity)}ms after legend at ${Math.round(firstLegend)}ms`
  );
  assert(
    firstContext > lastLegend,
    `${label}: top-right context became user-visible at ${Math.round(firstContext)}ms before all legend labels at ${Math.round(lastLegend)}ms`
  );
  assert(
    firstAction >= 0,
    `${label}: bottom route tabs reported invalid first visible timing ${Math.round(firstAction)}ms`
  );
  assert(
    firstFooter > lastLegend,
    `${label}: footer/support chrome became user-visible at ${Math.round(firstFooter)}ms before all legend labels at ${Math.round(lastLegend)}ms`
  );
  assert(
    firstSimulationTab > lastSeenAt(snapshot.identity),
    `${label}: simulation tab became user-visible at ${Math.round(firstSimulationTab)}ms before the Home identity resolved`
  );
  assert(
    firstSimulationTab <= lastLegend,
    `${label}: simulation tab became user-visible at ${Math.round(firstSimulationTab)}ms after all expertise labels at ${Math.round(lastLegend)}ms`
  );
  assert(
    firstSimulationTab < Math.max(lastSeenAt(snapshot.context), lastSeenAt(snapshot.action), lastFooter),
    `${label}: simulation tab remained the final Home entrance target at ${Math.round(firstSimulationTab)}ms`
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
  assertHomeTargetVisible(snapshot.targets.social, 'social', 0.69);
  assertHomeTargetVisible(snapshot.targets.meta, 'meta', 0.69);
  assertHomeTargetVisible(snapshot.targets.simulationTab, 'simulationTab');
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
  await page.waitForSelector(route.readySelector, { state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(() => document.documentElement.dataset.absBootState === 'ready', null, { timeout: timeoutMs });
  await page.waitForSelector('#abs-boot-overlay', { state: 'detached', timeout: timeoutMs });

  const released = await readBootSnapshot(page);
  assertBootSurfaceColourStable(released, routeLabel);
  assert(released.rootVisible, `${routeLabel}: app root was not visible after release`);
  assertBootSpinnerGone(released, routeLabel);
  let homeRevealReleased = null;
  let homeRevealSettled = null;
  if (route.label === 'home') {
    const revealState = await page.waitForFunction(() => {
      const root = document.documentElement;
      if (root.classList.contains('abs-home-post-boot-complete')) return 'complete';
      if (root.classList.contains('abs-home-post-boot-enter')) return 'enter';
      return '';
    }, null, { timeout: timeoutMs });
    if (await revealState.jsonValue() === 'enter') {
      homeRevealReleased = await readHomeRevealSnapshot(page);
      assertHomeRevealStarted(homeRevealReleased);
      const homeRevealTiming = await readHomeRevealTimingSnapshot(page);
      assertHomeRevealOrder(homeRevealTiming, routeLabel);
      await assertHomeRevealVisibleOrder(page, routeLabel);
      await page.waitForFunction(() => document.documentElement.classList.contains('abs-home-post-boot-complete'), null, { timeout: timeoutMs });
    }
    homeRevealSettled = await readHomeRevealSnapshot(page);
    assertHomeRevealSettled(homeRevealSettled, profile);
  }

  await context.close();
  return {
    route: route.label,
    profile: profile.label,
    held: 'normal-release',
    released: released.bootState,
    selector: route.readySelector,
    homeReveal: homeRevealSettled ? 'staged/released/settled' : '',
  };
}

async function waitForHomeBootReplay(page, label, profile) {
  await page.waitForSelector('#abs-boot-overlay', { state: 'visible', timeout: timeoutMs });
  const initialRevealState = await page.waitForFunction(() => {
    const root = document.documentElement;
    if (root.classList.contains('abs-home-post-boot-complete')) return 'complete';
    if (root.classList.contains('abs-home-post-boot-pending')) return 'pending';
    return '';
  }, null, { timeout: timeoutMs });
  const startedPending = await initialRevealState.jsonValue();
  if (startedPending === 'complete') {
    await page.waitForSelector('#abs-boot-overlay', { state: 'detached', timeout: timeoutMs });
    await assertMinimumVisibleElapsed(page, label);
    const releasedBoot = await readBootSnapshot(page);
    assertBootSurfaceColourStable(releasedBoot, label);
    assertBootSpinnerGone(releasedBoot, label);
    const settledReveal = await readHomeRevealSnapshot(page);
    assertHomeRevealSettled(settledReveal, profile);
    return;
  }
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

  const homeUrl = buildPlainRouteUrl('/index.html?mode=pit');
  await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitForHomeBootReplay(page, routeLabel, profile);

  await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
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
  await page.waitForFunction(() => document.documentElement.dataset.absBootState === 'ready', null, { timeout: timeoutMs });
  await page.waitForSelector('#abs-boot-overlay', { state: 'detached', timeout: timeoutMs });
  await page.waitForSelector('#app-frame', { state: 'visible', timeout: timeoutMs });

  const released = await readBootSnapshot(page);
  const releasedReveal = await readHomeRevealSnapshot(page);
  assertBootSurfaceColourStable(released, routeLabel);
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
    held: 'normal-release',
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
    if (!copyOnly) {
      for (const themeProfile of [
        { colorScheme: 'light' },
        { colorScheme: 'dark' },
        { colorScheme: 'dark', reducedMotion: true },
      ]) {
        const themeLabel = `${themeProfile.colorScheme}${themeProfile.reducedMotion ? '-reduced-motion' : ''}`;
        console.log(`[boot-overlay] theme: ${themeLabel}`);
        results.push(await auditBootTheme(browser, themeProfile));
      }
      for (const handoffProfile of [
        { reducedMotion: false },
        { reducedMotion: true },
      ]) {
        const handoffLabel = handoffProfile.reducedMotion ? 'reduced-motion' : 'spatial';
        console.log(`[boot-overlay] handoff: ${handoffLabel}`);
        results.push(await auditBootHandoff(browser, handoffProfile));
      }
      if (!loaderOnly) {
        for (const profile of profiles) {
          console.log(`[boot-overlay] ${profile.label}: home-direct`);
          results.push(await auditHomeDirectReplay(browser, profile));
          for (const route of routes) {
            console.log(`[boot-overlay] ${profile.label}: ${route.label}`);
            results.push(await auditRoute(browser, route, profile));
          }
          console.log(`[boot-overlay] ${profile.label}: home-reduced-motion`);
          results.push(await auditHomeReducedMotion(browser, profile));
        }
      }
    }
    console.log('[boot-overlay] long-wait copy');
    results.push(await auditLongBootMessages(browser));
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
