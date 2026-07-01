/**
 * End-to-end check: home → portfolio invite modal → portfolio deck.
 * Asserts HiDPI canvas backing store, visible DOM cards, deck interaction, and dense-frame transition integrity
 * for the gated home → portfolio SPA path.
 *
 * Run: npm run audit:portfolio-gate
 * Needs: dev or preview server. Set ABS_DEV_URL to origin (e.g. http://127.0.0.1:8013) or full index URL.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const GATE_MODE = String(process.env.ABS_PORTFOLIO_GATE_MODE || 'deep').trim().toLowerCase();
const QUICK_MODE = GATE_MODE === 'quick';
const BUFFER_WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 25000);
const FRAME_SAMPLE_MS = Number(process.env.ABS_PORTFOLIO_GATE_SAMPLE_MS || (QUICK_MODE ? 40 : 20));
const FRAME_DURATION_MS = Number(process.env.ABS_PORTFOLIO_GATE_DURATION_MS || (QUICK_MODE ? 700 : 1800));
const FRAME_HARD_CAP_MS = Number(process.env.ABS_PORTFOLIO_GATE_HARD_CAP_MS || (QUICK_MODE ? 1400 : 3600));
const HERO_SNAP_THRESHOLD_PX = Number(process.env.ABS_PORTFOLIO_GATE_HERO_SNAP_PX || 6);
const __dirname = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(__dirname, '..', 'output', 'playwright', 'portfolio-gate-audit');
const SIMULATION_CANVAS_SELECTOR = '#c, #wall-repel-canvas, canvas.wall-repel-canvas, canvas.concept-simulation-canvas';

/** Normalize ABS_DEV_URL so we never do `.../index.html/` (invalid) when joining paths. */
function resolveHomeEntryUrl() {
  let raw = (process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').trim().replace(/\/+$/, '');
  const pathPart = raw.split('?')[0].split('#')[0];
  if (!/\.html$/i.test(pathPart)) {
    raw = `${raw}/index.html`;
  }
  return raw;
}

async function waitForSimulationCanvasBuffer(page) {
  await page.waitForFunction(
    (selector) => {
      const c = document.querySelector(selector);
      if (!c) return false;
      const cssW = c.clientWidth || 0;
      const cssH = c.clientHeight || 0;
      if (cssW < 64 || cssH < 64) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const minW = Math.ceil((cssW + 2) * dpr) - 2;
      const minH = Math.ceil((cssH + 2) * dpr) - 2;
      return c.width >= minW && c.height >= minH;
    },
    SIMULATION_CANVAS_SELECTOR,
    { timeout: BUFFER_WAIT_MS }
  );
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function readDenseGateFrame(page) {
  return page.evaluate(() => {
    const effectiveOpacityOf = (el) => {
      if (!el) return 0;
      let current = el;
      let opacity = 1;
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        const styles = getComputedStyle(current);
        if (styles.display === 'none' || styles.visibility === 'hidden') return 0;
        const value = Number.parseFloat(styles.opacity || '1');
        opacity *= Number.isFinite(value) ? value : 1;
        current = current.parentElement;
      }
      return opacity;
    };
    const rectOf = (el) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    };
    const isVisible = (el) => {
      const rect = el?.getBoundingClientRect?.();
      if (!el || !rect) return false;
      const styles = getComputedStyle(el);
      return (
        styles.display !== 'none'
        && styles.visibility !== 'hidden'
        && effectiveOpacityOf(el) > 0.02
        && rect.width > 0
        && rect.height > 0
      );
    };
    const isReadable = (el) => isVisible(el) && effectiveOpacityOf(el) >= 0.35;

    const wall = document.getElementById('simulations');
    const hero = document.getElementById('hero-title');
    const topbar = document.querySelector('.ui-top-main.route-topbar');
    const footer = document.querySelector('footer.ui-bottom');
    const label = document.querySelector('.portfolio-deck-card.is-active, .portfolio-project-label');
    const wallRect = rectOf(wall);
    const heroRect = rectOf(hero);
    const topbarRect = rectOf(topbar);
    const labelRect = rectOf(label);
    const heroInsideWall = Boolean(
      wallRect
      && heroRect
      && heroRect.left >= wallRect.left - 4
      && heroRect.right <= wallRect.right + 4
      && heroRect.top >= wallRect.top - 4
      && heroRect.bottom <= wallRect.bottom + 4
    );
    const labelInsideWall = Boolean(
      wallRect
      && labelRect
      && labelRect.left >= wallRect.left - 8
      && labelRect.right <= wallRect.right + 8
      && labelRect.top >= wallRect.top - 8
      && labelRect.bottom <= wallRect.bottom + Math.max(8, labelRect.height * 0.55)
    );

    return {
      timestampMs: performance.now(),
      phase: document.documentElement.dataset.absTransitionPhase || 'idle',
      path: location.pathname,
      bodyClass: document.body.className,
      wallRect,
      heroRect,
      labelRect,
      topbarRect,
      heroReadable: isReadable(hero),
      topbarReadable: isReadable(topbar),
      footerReadable: isReadable(footer),
      labelReadable: isReadable(label),
      heroInsideWall,
      labelInsideWall,
      primaryReadable: isReadable(topbar) && (isReadable(hero) || isReadable(label) || isReadable(footer)),
    };
  });
}

function rectDiffMagnitude(previous, next) {
  if (!previous || !next) return Number.POSITIVE_INFINITY;
  return Math.max(
    Math.abs(previous.top - next.top),
    Math.abs(previous.left - next.left),
    Math.abs(previous.width - next.width),
    Math.abs(previous.height - next.height),
  );
}

async function readMobileResponsiveCheck(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    const portfolioUrl = new URL('portfolio.html', resolveHomeEntryUrl()).href;
    await page.goto(portfolioUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(
      () => document.querySelectorAll('.portfolio-deck-card').length > 0,
      { timeout: BUFFER_WAIT_MS }
    );
    await page.waitForTimeout(250);
    const responsiveCheck = await page.evaluate(() => {
      const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
      const rectOf = (el) => {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      };
      const measureCard = (index) => {
        app?.setActiveProject?.(index, { immediate: true });
        app?.updateDeckFromScroll?.({ force: true, activeChanged: true });
        const active = document.querySelector('.portfolio-deck-card.is-active');
        const cardRect = rectOf(active);
        const childSelectors = [
          '.portfolio-project-card__media',
          '.portfolio-project-card__copy',
          '.portfolio-project-card__client',
          '.portfolio-project-card__title',
          '.portfolio-project-card__tags',
        ];
        const childOverflow = childSelectors.some((selector) => {
          const childRect = rectOf(active?.querySelector(selector));
          if (!cardRect || !childRect) return false;
          return (
            childRect.top < cardRect.top - 0.5
            || childRect.bottom > cardRect.bottom + 0.5
            || childRect.left < cardRect.left - 0.5
            || childRect.right > cardRect.right + 0.5
          );
        });
        const scrollOverflow = Boolean(
          active
          && (
            active.scrollHeight > active.clientHeight + 1
            || active.scrollWidth > active.clientWidth + 1
          )
        );
        return {
          index,
          activeIndex: active?.dataset.projectIndex || null,
          title: (active?.querySelector('.portfolio-project-card__title')?.textContent || '').trim(),
          childOverflow,
          scrollOverflow,
          cardHeight: Number(cardRect?.height?.toFixed?.(2) || 0),
        };
      };
      const mount = document.getElementById('portfolioProjectMount');
      const cardCount = document.querySelectorAll('.portfolio-deck-card').length;
      const cards = Array.from({ length: cardCount }, (_, index) => measureCard(index));
      const inlineFinalHeight = mount?.style.getPropertyValue('--portfolio-deck-card-height') || '';
      const inlineFinalWidth = mount?.style.getPropertyValue('--portfolio-deck-card-width') || '';
      return {
        available: Boolean(app),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          dpr: window.devicePixelRatio || 1,
        },
        cardCount,
        inlineFinalHeight,
        inlineFinalWidth,
        rawHeightFluid: mount?.style.getPropertyValue('--portfolio-deck-card-height-fluid') || '',
        rawWidthFluid: mount?.style.getPropertyValue('--portfolio-deck-card-width-fluid') || '',
        clippedCards: cards.filter((card) => card.childOverflow || card.scrollOverflow),
        pageOverflowX: document.documentElement.scrollWidth > window.innerWidth,
        pageOverflowY: document.documentElement.scrollHeight > window.innerHeight,
      };
    });
    return responsiveCheck;
  } finally {
    await context.close();
  }
}

async function captureDenseGateFrames(page) {
  await mkdir(outputRoot, { recursive: true });
  const startedAt = Date.now();
  const frames = [];
  const checkpoints = [];
  let index = 0;
  let capturedFirstPortfolioPath = false;
  let capturedFirstReadable = false;
  let capturedFirstIdleReadable = false;

  const captureCheckpoint = async (name, frame) => {
    const screenshotPath = resolve(outputRoot, `gate-checkpoint-${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: !QUICK_MODE });
    checkpoints.push({
      name,
      timestampMs: frame.timestampMs,
      phase: frame.phase,
      path: frame.path,
      screenshotPath,
    });
  };

  while (true) {
    const frame = await readDenseGateFrame(page);
    frames.push(frame);

    if (index === 0) {
      await captureCheckpoint('start', frame);
    }

    if (!QUICK_MODE && !capturedFirstPortfolioPath && /portfolio/i.test(frame.path || '')) {
      capturedFirstPortfolioPath = true;
      await captureCheckpoint('first-portfolio-path', frame);
    }

    if (!capturedFirstReadable && /portfolio/i.test(frame.path || '') && frame.primaryReadable) {
      capturedFirstReadable = true;
      await captureCheckpoint('first-readable', frame);
    }

    if (!capturedFirstIdleReadable
      && /portfolio/i.test(frame.path || '')
      && frame.phase === 'idle'
      && frame.primaryReadable
    ) {
      capturedFirstIdleReadable = true;
      await captureCheckpoint('first-idle-readable', frame);
    }

    const elapsedMs = Date.now() - startedAt;
    const reachedSoftWindow = elapsedMs >= FRAME_DURATION_MS;
    const hasMeaningfulPortfolioSignal = QUICK_MODE
      ? (capturedFirstIdleReadable || capturedFirstReadable)
      : (capturedFirstIdleReadable || (capturedFirstReadable && capturedFirstPortfolioPath));
    if ((reachedSoftWindow && hasMeaningfulPortfolioSignal) || elapsedMs >= FRAME_HARD_CAP_MS) {
      break;
    }

    index += 1;
    await sleep(FRAME_SAMPLE_MS);
  }

  if (!capturedFirstIdleReadable && frames.length > 0) {
    await captureCheckpoint('final-frame', frames[frames.length - 1]);
  }

  await writeFile(resolve(outputRoot, 'gate-frames.json'), `${JSON.stringify(frames, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'gate-checkpoints.json'), `${JSON.stringify(checkpoints, null, 2)}\n`, 'utf8');
  return { frames, checkpoints };
}

function assertDenseGateFrames(frames) {
  const routeOutFrames = frames.filter(
    (frame) => frame.phase === 'route-out' && /portfolio/i.test(frame.path || '')
  );
  const firstReadableIndex = frames.findIndex(
    (frame) => /portfolio/i.test(frame.path || '') && frame.primaryReadable
  );
  const firstReadable = firstReadableIndex >= 0 ? frames[firstReadableIndex] : null;
  const settled = [...frames].reverse().find(
    (frame) => /portfolio/i.test(frame.path || '') && frame.phase === 'idle' && frame.primaryReadable
  );
  const errors = [];

  if (routeOutFrames.some((frame) => frame.topbarReadable || frame.labelReadable)) {
    errors.push('portfolio text became readable during route-out');
  }

  if (!firstReadable) {
    errors.push('no readable portfolio primary frame was captured');
  } else {
    const primarySurfaceInsideWall = firstReadable.heroReadable
      ? firstReadable.heroInsideWall
      : firstReadable.labelInsideWall;
    if (!primarySurfaceInsideWall) {
      errors.push('portfolio primary surface was not fully inside the inner wall on the first readable frame');
    }
    if (!(firstReadable.heroReadable || firstReadable.labelReadable) || !firstReadable.topbarReadable) {
      errors.push('portfolio card/hero and top chrome did not enter in the same readable band');
    }
    if (frames.slice(0, firstReadableIndex).some(
      (frame) => /portfolio/i.test(frame.path || '') && frame.labelReadable && !frame.topbarReadable
    )) {
      errors.push('portfolio cards became readable before the top chrome');
    }
  }

  if (firstReadable && settled) {
    const firstPrimaryRect = firstReadable.heroReadable ? firstReadable.heroRect : firstReadable.labelRect;
    const settledPrimaryRect = firstReadable.heroReadable ? settled.heroRect : settled.labelRect;
    const primarySnapPx = rectDiffMagnitude(firstPrimaryRect, settledPrimaryRect);
    if (primarySnapPx > HERO_SNAP_THRESHOLD_PX) {
      errors.push(`portfolio primary geometry snapped ${primarySnapPx.toFixed(2)}px between first readable and settled frames`);
    }
  }

  return {
    firstReadable,
    settled,
    errors,
  };
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(resolveHomeEntryUrl(), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector(SIMULATION_CANVAS_SELECTOR, { timeout: 30000 });
  await waitForSimulationCanvasBuffer(page);

  let denseCaptureResult;
  const portfolioTrigger = page.locator('#portfolio-modal-trigger');
  if (await portfolioTrigger.count()) {
    await portfolioTrigger.click({ timeout: 10000 });
    await page.waitForSelector('#portfolio-modal.active', { timeout: 10000 });

    const digits = page.locator('.portfolio-digit');
    const count = await digits.count();
    if (count < 6) {
      console.error('FAIL: expected 6 .portfolio-digit inputs');
      process.exitCode = 1;
      await browser.close();
      return;
    }

    // Start URL wait before input so SPA navigation isn't missed.
    const portfolioNav = page.waitForURL(/portfolio/i, { timeout: BUFFER_WAIT_MS });
    const denseCapture = captureDenseGateFrames(page);
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('.portfolio-digit'));
      const code = '739284';
      for (let i = 0; i < Math.min(code.length, inputs.length); i += 1) {
        const el = inputs[i];
        el.focus();
        el.value = code[i];
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: code[i], inputType: 'insertText' }));
      }
    });
    await portfolioNav;
    denseCaptureResult = await denseCapture;
  } else {
    console.warn('WARN: #portfolio-modal-trigger not present; auditing portfolio deck via direct route fallback.');
    const portfolioUrl = new URL('portfolio.html', resolveHomeEntryUrl()).href;
    await page.goto(portfolioUrl, { waitUntil: 'networkidle', timeout: 60000 });
    denseCaptureResult = await captureDenseGateFrames(page);
  }
  const denseFrames = denseCaptureResult.frames;
  await page.waitForFunction(
    () => document.getElementById('portfolioProjectMount'),
    { timeout: BUFFER_WAIT_MS }
  );
  await waitForSimulationCanvasBuffer(page);

  await page.waitForFunction(
    () => document.querySelectorAll('.portfolio-deck-card').length > 0,
    { timeout: BUFFER_WAIT_MS }
  );
  await page.waitForFunction(
    () => {
      const roots = Array.from(document.querySelectorAll('.portfolio-deck-card.is-active .portfolio-project-label__text'));
      return roots.some((r) => (r.textContent || '').trim().length > 0);
    },
    { timeout: BUFFER_WAIT_MS }
  );

  const labelCheck = await page.evaluate(() => {
    const texts = Array.from(
      document.querySelectorAll('.portfolio-deck-card .portfolio-project-label__text')
    );
    const nonEmpty = texts.filter((el) => (el.textContent || '').trim().length > 0);
    return { total: texts.length, nonEmpty: nonEmpty.length };
  });

  const deckCheck = await page.evaluate(() => {
    const mount = document.getElementById('portfolioProjectMount');
    const active = mount?.querySelector('.portfolio-deck-card.is-active');
    const rear = Array.from(mount?.querySelectorAll('.portfolio-deck-card.is-depth-card') || []);
    const activeTags = Array.from(active?.querySelectorAll('.portfolio-project-card__tags li') || []);
    const activeMedia = active?.querySelector('.portfolio-project-card__video, .portfolio-project-card__image, .portfolio-project-card__media-fallback');
    const oldLabelLayer = mount?.querySelector('.portfolio-label-layer');
    const legacyCanvas = document.getElementById('c');
    const legacyCanvasStyles = legacyCanvas ? getComputedStyle(legacyCanvas) : null;
    const legacyCanvasRect = legacyCanvas?.getBoundingClientRect?.();
    const legacyCanvasVisible = Boolean(
      legacyCanvas
      && legacyCanvasRect
      && legacyCanvasRect.width > 0
      && legacyCanvasRect.height > 0
      && legacyCanvasStyles.display !== 'none'
      && legacyCanvasStyles.visibility !== 'hidden'
      && Number.parseFloat(legacyCanvasStyles.opacity || '1') > 0.01
    );
    const parseRgb = (value) => {
      const match = String(value || '').match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1].split(/[,\s/]+/).filter(Boolean).slice(0, 3).map((part) => Number.parseFloat(part));
      if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return null;
      return {
        r: Math.max(0, Math.min(255, Math.round(parts[0]))),
        g: Math.max(0, Math.min(255, Math.round(parts[1]))),
        b: Math.max(0, Math.min(255, Math.round(parts[2]))),
      };
    };
    const hexToRgb = (hex) => {
      const value = String(hex || '').replace('#', '').trim();
      const normalized = value.length === 3
        ? value.split('').map((part) => part + part).join('')
        : value.padEnd(6, '0').slice(0, 6);
      const int = Number.parseInt(normalized, 16);
      if (!Number.isFinite(int)) return null;
      return {
        r: (int >> 16) & 255,
        g: (int >> 8) & 255,
        b: int & 255,
      };
    };
    const rgbKey = (rgb) => (rgb ? `${rgb.r},${rgb.g},${rgb.b}` : '');
    const relativeLuminance = ({ r, g, b }) => {
      const toLinear = (channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return (0.2126 * toLinear(r)) + (0.7152 * toLinear(g)) + (0.0722 * toLinear(b));
    };
    const contrastRatio = (first, second) => {
      if (!first || !second) return 0;
      const high = Math.max(relativeLuminance(first), relativeLuminance(second));
      const low = Math.min(relativeLuminance(first), relativeLuminance(second));
      return (high + 0.05) / (low + 0.05);
    };
    const addUniqueRgbKey = (keys, seen, color) => {
      const key = rgbKey(hexToRgb(color));
      if (!key || seen.has(key)) return;
      seen.add(key);
      keys.push(key);
    };
    const cards = Array.from(mount?.querySelectorAll('.portfolio-deck-card') || []);
    const cardPalette = cards.map((card) => {
      const styles = getComputedStyle(card);
      const background = parseRgb(styles.backgroundColor);
      const ink = parseRgb(styles.color);
      return {
        index: card.dataset.projectIndex || '',
        background: rgbKey(background),
        color: rgbKey(ink),
        contrast: Number(contrastRatio(background, ink).toFixed(2)),
      };
    });
    const paletteSeen = new Set();
    const availablePaletteKeys = [];
    const globals = window.__ABS_PORTFOLIO_AUDIT__?.getGlobals?.();
    const colors = Array.isArray(globals?.currentColors) ? globals.currentColors.filter(Boolean) : [];
    const distribution = Array.isArray(globals?.colorDistribution) ? globals.colorDistribution : [];
    const distributionKeys = [];
    const distributionSeen = new Set();
    distribution.forEach((entry) => {
      const paletteIndex = Math.max(0, Math.min(colors.length - 1, Math.floor(Number(entry?.colorIndex) || 0)));
      addUniqueRgbKey(distributionKeys, distributionSeen, colors[paletteIndex]);
    });
    distributionKeys.forEach((key) => {
      if (!paletteSeen.has(key)) {
        paletteSeen.add(key);
        availablePaletteKeys.push(key);
      }
    });
    colors.forEach((color) => addUniqueRgbKey(availablePaletteKeys, paletteSeen, color));
    const backgroundKeys = cardPalette.map((card) => card.background).filter(Boolean);
    const expectedDistributionKeys = distributionKeys.slice(0, Math.min(distributionKeys.length, backgroundKeys.length));
    const observedDistributionKeys = backgroundKeys.slice(0, expectedDistributionKeys.length);
    return {
      activeIndex: active?.dataset.projectIndex || null,
      activeCount: mount?.querySelectorAll('.portfolio-deck-card.is-active').length || 0,
      rearCount: rear.length,
      rearInteractiveCards: rear
        .map((card) => ({
          index: card.dataset.projectIndex || '',
          slot: card.dataset.deckVisualSlot || card.dataset.deckSlot || '',
          pointerEvents: getComputedStyle(card).pointerEvents,
        }))
        .filter((card) => card.pointerEvents !== 'none'),
      activeTitle: (active?.querySelector('.portfolio-project-label__text')?.textContent || '').trim(),
      activeClient: (active?.querySelector('.portfolio-project-card__client')?.textContent || '').trim(),
      activeTagCount: activeTags.length,
      hasMedia: Boolean(activeMedia),
      hasClosedSummary: Boolean(active?.querySelector('.portfolio-project-card__summary')),
      oldLabelLayerPresent: Boolean(oldLabelLayer),
      legacyCanvasVisible,
      cardCount: cards.length,
      cardPalette,
      availablePaletteColorCount: availablePaletteKeys.length,
      uniqueBackgroundCount: new Set(backgroundKeys).size,
      repeatedBackgrounds: backgroundKeys.filter((key, index) => backgroundKeys.indexOf(key) !== index),
      lowContrastCards: cardPalette.filter((card) => card.contrast < 4.5),
      distributionOrderMatches: expectedDistributionKeys.length === 0
        || expectedDistributionKeys.every((key, index) => key === observedDistributionKeys[index]),
      expectedDistributionKeys,
      observedDistributionKeys,
    };
  });

  const continuityCheck = await page.evaluate(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    if (!app?.getDeckDebugSnapshot || !app?.updateDeckFromScroll) {
      return { available: false };
    }

    const original = {
      target: app.deckTargetPosition,
      display: app.deckDisplayPosition,
      direction: app.deckMotionDirection,
      active: app.activeProjectIndex,
      settling: app.deckIsSettling,
    };

    const readSlots = (snapshot) => snapshot.cards.map((card) => `${card.index}:${card.zone || card.visualSlot}`).join(' ');
    const duplicateDepthSlotsFor = (snapshot) => {
      const visibleDepthSlots = snapshot.cards
        .filter((card) => card.visualSlot === 'incoming' || /^depth-\d+$/.test(card.visualSlot))
        .map((card) => card.visualSlot);
      return Array.from(new Set(
        visibleDepthSlots.filter((slot, index) => visibleDepthSlots.indexOf(slot) !== index)
      ));
    };
    const sampleAt = (display, direction, target = display) => {
      app.deckMotionDirection = direction;
      app.deckTargetPosition = target;
      app.deckDisplayPosition = display;
      app.deckIsSettling = false;
      app.activeProjectIndex = original.active;
      app.updateDeckFromScroll();
      return app.getDeckDebugSnapshot();
    };
    const cardAt = (snapshot, index) => snapshot.cards.find((card) => card.index === index);
    const increases = (items, readValue, minDelta = 0) => {
      if (items.length < 2) return false;
      for (let index = 1; index < items.length; index += 1) {
        if (readValue(items[index]) < readValue(items[index - 1]) - 0.01) return false;
      }
      return readValue(items[items.length - 1]) - readValue(items[0]) >= minDelta;
    };
    const decreases = (items, readValue, minDelta = 0) => {
      if (items.length < 2) return false;
      for (let index = 1; index < items.length; index += 1) {
        if (readValue(items[index]) > readValue(items[index - 1]) + 0.01) return false;
      }
      return readValue(items[0]) - readValue(items[items.length - 1]) >= minDelta;
    };

    const before = app.getDeckDebugSnapshot();
    const activeIndex = before.activeIndex;
    const projectCount = Math.max(1, app.projects?.length || before.cards.length || 1);
    const mid = sampleAt(-0.42, -1);
    const samePositionForward = sampleAt(-0.42, 1);
    const settledBackward = sampleAt(0, -1, 0);
    const settledForward = sampleAt(0, 1, 0);
    const rapidFlipMismatch = sampleAt(-0.061, 1, 0.143);
    const exitSamples = [0.12, 0.28, 0.42, 0.54].map((progress) => ({
      progress,
      snapshot: sampleAt(-progress, -1),
    }));
    const hiddenWrap = sampleAt(-0.7, -1);
    const rearReappear = sampleAt(-0.9, -1);
    const deepestBackPose = app.getDeckCardPose(Math.max(0, projectCount - 1));

    app.deckTargetPosition = original.target;
    app.deckDisplayPosition = original.display;
    app.deckMotionDirection = original.direction;
    app.activeProjectIndex = original.active;
    app.deckIsSettling = original.settling;
    app.updateDeckFromScroll({ force: true });

    const frontCards = mid.cards.filter((card) => card.visualSlot === 'front');
    const duplicateDepthSlots = duplicateDepthSlotsFor(mid);
    const exitCards = exitSamples
      .map(({ progress, snapshot }) => ({ progress, card: cardAt(snapshot, activeIndex) }))
      .filter((entry) => entry.card);
    const visibleExitCards = exitCards.filter((entry) => entry.card.zone === 'visible-exit');
    const visibleExitMovementOk = visibleExitCards.length >= 3
      && increases(visibleExitCards, (entry) => entry.card.y, 72)
      && increases(visibleExitCards, (entry) => entry.card.z, 24)
      && increases(visibleExitCards, (entry) => entry.card.scale, 0.008);
    const visibleExitFadeOk = visibleExitCards.length >= 3
      && decreases(visibleExitCards, (entry) => entry.card.opacity, 0.24)
      && increases(visibleExitCards, (entry) => entry.card.blur, 0.8);
    const incomingIndex = ((activeIndex - 1) % projectCount + projectCount) % projectCount;
    const incomingCards = exitSamples
      .map(({ progress, snapshot }) => ({ progress, card: cardAt(snapshot, incomingIndex) }))
      .filter((entry) => entry.card && (entry.card.zone === 'visible-stack'));
    const incomingMovesTowardFront = incomingCards.length >= 3
      && increases(incomingCards, (entry) => entry.card.y, 8)
      && increases(incomingCards, (entry) => entry.card.z, 4)
      && increases(incomingCards, (entry) => entry.card.scale, 0.004);
    const rapidExitCards = rapidFlipMismatch.cards.filter((card) => card.visualSlot === 'exit');
    const hiddenWrapCard = cardAt(hiddenWrap, activeIndex);
    const rearReappearCard = cardAt(rearReappear, activeIndex);
    const hiddenWrapInvisible = Boolean(
      hiddenWrapCard
      && hiddenWrapCard.zone === 'hidden-wrap'
      && hiddenWrapCard.opacity <= 0.01
      && hiddenWrapCard.visibility === 'hidden'
    );
    const reappearsFromRearPose = Boolean(
      rearReappearCard
      && rearReappearCard.zone === 'rear-reappear'
      && rearReappearCard.opacity > 0.04
      && Math.abs(rearReappearCard.y - deepestBackPose.y) <= 4
      && Math.abs(rearReappearCard.z - deepestBackPose.z) <= 4
      && Math.abs(rearReappearCard.scale - deepestBackPose.scale) <= 0.004
    );

    return {
      available: true,
      beforeActiveIndex: before.activeIndex,
      midActiveIndex: mid.activeIndex,
      midProgress: mid.transitionProgress,
      frontCount: frontCards.length,
      duplicateDepthSlots,
      samePositionDirectionStable: readSlots(mid) === readSlots(samePositionForward),
      settledDirectionStable: readSlots(settledBackward) === readSlots(settledForward),
      frontKeepsMovingDuringFade: visibleExitMovementOk && visibleExitFadeOk,
      noVisibleReverse: incomingMovesTowardFront,
      rapidFlipExitCountOk: rapidExitCards.length <= 1,
      hiddenWrapInvisible,
      reappearsFromRearPose,
      visibleExitCards,
      incomingCards,
      hiddenWrapCard,
      rearReappearCard,
      deepestBackPose,
      midSlots: mid.cards.map((card) => `${card.index}:${card.visualSlot}`).join(' '),
      samePositionForwardSlots: readSlots(samePositionForward),
      settledBackwardSlots: readSlots(settledBackward),
      settledForwardSlots: readSlots(settledForward),
      rapidFlipSlots: readSlots(rapidFlipMismatch),
    };
  });

  await page.focus('.portfolio-deck-card.is-active');
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(
    (beforeIndex) => {
      const active = document.querySelector('.portfolio-deck-card.is-active');
      return active && active.dataset.projectIndex !== beforeIndex;
    },
    deckCheck.activeIndex,
    { timeout: BUFFER_WAIT_MS }
  );
  const keyboardCheck = await page.evaluate(() => ({
    activeIndex: document.querySelector('.portfolio-deck-card.is-active')?.dataset.projectIndex || null,
  }));

  const pointerTarget = await page.evaluate(() => {
    const active = document.querySelector('.portfolio-deck-card.is-active');
    const rect = active?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: rect.left + rect.width * 0.22,
      y: rect.top + rect.height * 0.34,
    };
  });
  if (!pointerTarget) {
    throw new Error('Could not find active portfolio card for pointer open check');
  }
  await page.mouse.move(pointerTarget.x, pointerTarget.y);
  await page.mouse.down();
  await page.waitForTimeout(50);
  const pointerPressCheck = await page.evaluate(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const snapshot = app?.getDeckDebugSnapshot?.();
    const active = document.querySelector('.portfolio-deck-card.is-active');
    return {
      phase: snapshot?.open?.phase || '',
      pressed: Boolean(snapshot?.open?.pressed),
      activePressing: Boolean(active?.classList.contains('is-pressing')),
    };
  });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const pointerGhostCheck = await page.evaluate(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const snapshot = app?.getDeckDebugSnapshot?.();
    return {
      phase: snapshot?.open?.phase || '',
      hasGhost: Boolean(snapshot?.open?.hasGhost),
      originRect: snapshot?.open?.originRect || null,
      ghostRect: snapshot?.open?.ghostRect || null,
      drawerRect: snapshot?.open?.drawerRect || null,
      drawerTransform: snapshot?.open?.drawerTransform || '',
      drawerOpacity: Number.parseFloat(snapshot?.open?.drawerOpacity || '0'),
      deckOpacity: Number.parseFloat(snapshot?.open?.deckOpacity || '1'),
      deckVisibility: snapshot?.open?.deckVisibility || '',
    };
  });
  await page.waitForSelector('body.portfolio-project-open', { timeout: BUFFER_WAIT_MS });
  await page.waitForFunction(
    () => {
      const deckStage = document.querySelector('.portfolio-deck-stage');
      if (!deckStage) return false;
      const styles = getComputedStyle(deckStage);
      return Number.parseFloat(styles.opacity || '1') <= 0.02
        && styles.pointerEvents === 'none'
        && styles.visibility === 'hidden';
    },
    { timeout: BUFFER_WAIT_MS }
  );
  await page.waitForSelector('.portfolio-project-view.is-open', { timeout: BUFFER_WAIT_MS });
  await page.waitForFunction(
    () => {
      const drawer = document.querySelector('.portfolio-project-view__drawer');
      if (!drawer) return false;
      return Number.parseFloat(getComputedStyle(drawer).opacity || '0') >= 0.98;
    },
    { timeout: BUFFER_WAIT_MS }
  );
  const openCheck = await page.evaluate(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const snapshot = app?.getDeckDebugSnapshot?.();
    const projectView = document.getElementById('portfolioProjectView');
    const deckStage = document.querySelector('.portfolio-deck-stage');
    const drawer = document.querySelector('.portfolio-project-view__drawer');
    const drawerStyles = drawer ? getComputedStyle(drawer) : null;
    return {
      bodyOpen: document.body.classList.contains('portfolio-project-open'),
      hostHidden: document.getElementById('portfolio-sheet-host')?.getAttribute('aria-hidden'),
      activeIndex: document.querySelector('.portfolio-deck-card.is-active')?.dataset.projectIndex || null,
      projectViewZ: projectView
        ? Number.parseInt(getComputedStyle(projectView).zIndex || '0', 10) || 0
        : 0,
      maxCardZ: Math.max(
        0,
        ...Array.from(document.querySelectorAll('.portfolio-deck-card'))
          .map((card) => Number.parseInt(getComputedStyle(card).zIndex || '0', 10) || 0)
      ),
      deckStageOpacity: deckStage ? Number.parseFloat(getComputedStyle(deckStage).opacity || '1') : 1,
      deckStagePointerEvents: deckStage ? getComputedStyle(deckStage).pointerEvents : '',
      deckStageVisibility: deckStage ? getComputedStyle(deckStage).visibility : '',
      drawerTransform: drawerStyles?.transform || '',
      drawerOpacity: drawerStyles ? Number.parseFloat(drawerStyles.opacity || '0') : 0,
      debugOpen: snapshot?.open || null,
    };
  });
  await page.click('.portfolio-project-view__close', { timeout: BUFFER_WAIT_MS });
  await page.waitForFunction(
    () => !document.body.classList.contains('portfolio-project-open'),
    { timeout: BUFFER_WAIT_MS }
  );

  await page.focus('.portfolio-deck-card.is-active');
  await page.keyboard.press('Enter');
  await page.waitForSelector('body.portfolio-project-open', { timeout: BUFFER_WAIT_MS });
  await page.waitForSelector('.portfolio-project-view.is-open', { timeout: BUFFER_WAIT_MS });
  await page.waitForFunction(
    () => {
      const drawer = document.querySelector('.portfolio-project-view__drawer');
      if (!drawer) return false;
      return Number.parseFloat(getComputedStyle(drawer).opacity || '0') >= 0.98;
    },
    { timeout: BUFFER_WAIT_MS }
  );
  const keyboardOpenCheck = await page.evaluate(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const snapshot = app?.getDeckDebugSnapshot?.();
    return {
      bodyOpen: document.body.classList.contains('portfolio-project-open'),
      phase: snapshot?.open?.phase || '',
      hasGhost: Boolean(snapshot?.open?.hasGhost),
      activeIndex: document.querySelector('.portfolio-deck-card.is-active')?.dataset.projectIndex || null,
    };
  });
  await page.click('.portfolio-project-view__close', { timeout: BUFFER_WAIT_MS });
  await page.waitForFunction(
    () => !document.body.classList.contains('portfolio-project-open'),
    { timeout: BUFFER_WAIT_MS }
  );
  const closeCheck = await page.evaluate(() => ({
    bodyOpen: document.body.classList.contains('portfolio-project-open'),
    hostHidden: document.getElementById('portfolio-sheet-host')?.getAttribute('aria-hidden'),
    activeIndex: document.querySelector('.portfolio-deck-card.is-active')?.dataset.projectIndex || null,
  }));
  const mobileResponsiveCheck = await readMobileResponsiveCheck(browser);

  const snap = await page.evaluate(() => {
    const c = document.querySelector('#c, #wall-repel-canvas, canvas.wall-repel-canvas');
    return {
      path: location.pathname,
      canvasWidth: c?.width,
      canvasHeight: c?.height,
      clientWidth: c?.clientWidth,
      clientHeight: c?.clientHeight,
      dpr: window.devicePixelRatio || 1,
    };
  });

  const denseAudit = assertDenseGateFrames(denseFrames);
  await writeFile(
    resolve(outputRoot, 'gate-audit-summary.json'),
    `${JSON.stringify(denseAudit, null, 2)}\n`,
    'utf8'
  );

  console.log(JSON.stringify({
    mode: QUICK_MODE ? 'quick' : 'deep',
    snap,
    labelCheck,
    deckCheck,
    continuityCheck,
    keyboardCheck,
    pointerPressCheck,
    pointerGhostCheck,
    openCheck,
    keyboardOpenCheck,
    closeCheck,
    mobileResponsiveCheck,
    checkpoints: denseCaptureResult.checkpoints.length,
    denseAudit,
  }, null, 2));

  if (!labelCheck.nonEmpty) {
    console.error('FAIL: no non-empty .portfolio-project-label__text after gate navigation');
    process.exitCode = 1;
  } else if (deckCheck.activeCount !== 1) {
    console.error(`FAIL: expected one active deck card, got ${deckCheck.activeCount}`);
    process.exitCode = 1;
  } else if (deckCheck.rearCount < 2) {
    console.error(`FAIL: expected at least two rear depth cards, got ${deckCheck.rearCount}`);
    process.exitCode = 1;
  } else if (deckCheck.rearInteractiveCards.length) {
    console.error(`FAIL: rear depth cards must be visual-only during stacked deck interaction: ${JSON.stringify(deckCheck.rearInteractiveCards)}`);
    process.exitCode = 1;
  } else if (!deckCheck.activeTitle || !deckCheck.activeClient || !deckCheck.hasMedia) {
    console.error('FAIL: active deck card is missing title, client, or media');
    process.exitCode = 1;
  } else if (deckCheck.activeTagCount > 3) {
    console.error(`FAIL: active deck card has ${deckCheck.activeTagCount} tags; expected at most 3`);
    process.exitCode = 1;
  } else if (
    deckCheck.cardCount <= deckCheck.availablePaletteColorCount
    && deckCheck.uniqueBackgroundCount !== deckCheck.cardCount
  ) {
    console.error(`FAIL: deck cards repeat palette backgrounds: ${deckCheck.repeatedBackgrounds.join(', ')}`);
    process.exitCode = 1;
  } else if (!deckCheck.distributionOrderMatches) {
    console.error(`FAIL: deck card backgrounds do not follow colorDistribution order. expected ${deckCheck.expectedDistributionKeys.join(' | ')} got ${deckCheck.observedDistributionKeys.join(' | ')}`);
    process.exitCode = 1;
  } else if (deckCheck.lowContrastCards.length) {
    console.error(`FAIL: deck card text contrast below AA: ${JSON.stringify(deckCheck.lowContrastCards)}`);
    process.exitCode = 1;
  } else if (deckCheck.hasClosedSummary) {
    console.error('FAIL: closed deck card should not render summary text');
    process.exitCode = 1;
  } else if (deckCheck.legacyCanvasVisible) {
    console.error('FAIL: legacy portfolio canvas is visibly painting over the deck route');
    process.exitCode = 1;
  } else if (deckCheck.oldLabelLayerPresent) {
    console.error('FAIL: old portfolio label layer is still present');
    process.exitCode = 1;
  } else if (!continuityCheck.available) {
    console.error('FAIL: portfolio deck debug snapshot is unavailable');
    process.exitCode = 1;
  } else if (continuityCheck.frontCount > 1) {
    console.error(`FAIL: sampled deck state has ${continuityCheck.frontCount} front visual slots`);
    process.exitCode = 1;
  } else if (continuityCheck.duplicateDepthSlots.length) {
    console.error(`FAIL: sampled deck state has duplicate visible depth slots: ${continuityCheck.duplicateDepthSlots.join(', ')}`);
    process.exitCode = 1;
  } else if (!continuityCheck.samePositionDirectionStable) {
    console.error('FAIL: same deck position produced different stack slots when only last direction changed');
    process.exitCode = 1;
  } else if (!continuityCheck.settledDirectionStable) {
    console.error('FAIL: settled deck position produced different rear order when only last direction changed');
    process.exitCode = 1;
  } else if (!continuityCheck.frontKeepsMovingDuringFade) {
    console.error(`FAIL: outgoing front card does not keep traveling while fading: ${JSON.stringify(continuityCheck.visibleExitCards)}`);
    process.exitCode = 1;
  } else if (!continuityCheck.rapidFlipExitCountOk) {
    console.error('FAIL: rapid direction flip produced multiple exit cards');
    process.exitCode = 1;
  } else if (!continuityCheck.hiddenWrapInvisible) {
    console.error(`FAIL: outgoing deck card is not fully hidden during wrap: ${JSON.stringify(continuityCheck.hiddenWrapCard)}`);
    process.exitCode = 1;
  } else if (!continuityCheck.reappearsFromRearPose) {
    console.error(`FAIL: outgoing deck card does not reappear from the deepest rear pose: ${JSON.stringify({
      rearReappearCard: continuityCheck.rearReappearCard,
      deepestBackPose: continuityCheck.deepestBackPose,
    })}`);
    process.exitCode = 1;
  } else if (!continuityCheck.noVisibleReverse) {
    console.error(`FAIL: visible stack card reversed or failed to advance toward the front: ${JSON.stringify(continuityCheck.incomingCards)}`);
    process.exitCode = 1;
  } else if (continuityCheck.midActiveIndex !== continuityCheck.beforeActiveIndex) {
    console.error('FAIL: active deck index changed during sampled in-between state');
    process.exitCode = 1;
  } else if (keyboardCheck.activeIndex === deckCheck.activeIndex) {
    console.error('FAIL: ArrowDown did not advance active deck card');
    process.exitCode = 1;
  } else if (!pointerPressCheck.pressed || !pointerPressCheck.activePressing || pointerPressCheck.phase !== 'pressing') {
    console.error(`FAIL: pointer down did not enter the portfolio card press state: ${JSON.stringify(pointerPressCheck)}`);
    process.exitCode = 1;
  } else if (
    pointerGhostCheck.phase !== 'ghost'
    || !pointerGhostCheck.hasGhost
    || !pointerGhostCheck.originRect
    || !pointerGhostCheck.ghostRect
  ) {
    console.error(`FAIL: pointer release did not start a card ghost morph with a captured origin: ${JSON.stringify(pointerGhostCheck)}`);
    process.exitCode = 1;
  } else if (pointerGhostCheck.deckOpacity > 0.02 || pointerGhostCheck.deckVisibility !== 'hidden') {
    console.error(`FAIL: deck stage is visible behind the project ghost during open: ${JSON.stringify(pointerGhostCheck)}`);
    process.exitCode = 1;
  } else if (/matrix\([^)]*,\s*1[0-9]{3,}/.test(pointerGhostCheck.drawerTransform) || pointerGhostCheck.drawerTransform.includes('100%')) {
    console.error(`FAIL: prepared drawer still starts from a below-wall translate during ghost open: ${pointerGhostCheck.drawerTransform}`);
    process.exitCode = 1;
  } else if (!openCheck.bodyOpen || openCheck.hostHidden === 'true') {
    console.error('FAIL: active deck card did not open the wall-contained project view');
    process.exitCode = 1;
  } else if (openCheck.projectViewZ <= openCheck.maxCardZ) {
    console.error(`FAIL: project view z-index (${openCheck.projectViewZ}) must exceed deck card z-index (${openCheck.maxCardZ})`);
    process.exitCode = 1;
  } else if (
    openCheck.deckStageOpacity > 0.02
    || openCheck.deckStagePointerEvents !== 'none'
    || openCheck.deckStageVisibility !== 'hidden'
  ) {
    console.error(`FAIL: deck stage must be hidden/non-interactive while project view is open: ${JSON.stringify({
      deckStageOpacity: openCheck.deckStageOpacity,
      deckStagePointerEvents: openCheck.deckStagePointerEvents,
      deckStageVisibility: openCheck.deckStageVisibility,
    })}`);
    process.exitCode = 1;
  } else if (openCheck.drawerTransform !== 'none' && !/^matrix\(1, 0, 0, 1, 0/.test(openCheck.drawerTransform)) {
    console.error(`FAIL: opened project drawer must be final-positioned, got transform ${openCheck.drawerTransform}`);
    process.exitCode = 1;
  } else if (openCheck.drawerOpacity < 0.98) {
    console.error(`FAIL: opened project drawer is not fully visible after reveal: ${JSON.stringify(openCheck)}`);
    process.exitCode = 1;
  } else if (!keyboardOpenCheck.bodyOpen || keyboardOpenCheck.hasGhost) {
    console.error(`FAIL: keyboard open should use direct final-position reveal without ghost: ${JSON.stringify(keyboardOpenCheck)}`);
    process.exitCode = 1;
  } else if (closeCheck.bodyOpen || closeCheck.activeIndex !== openCheck.activeIndex) {
    console.error('FAIL: closing project did not restore the same active deck card');
    process.exitCode = 1;
  } else if (!mobileResponsiveCheck.available) {
    console.error('FAIL: mobile portfolio deck debug bridge is unavailable');
    process.exitCode = 1;
  } else if (mobileResponsiveCheck.inlineFinalHeight || mobileResponsiveCheck.inlineFinalWidth) {
    console.error(`FAIL: mobile deck has inline final card dimensions that can override responsive CSS: ${JSON.stringify({
      inlineFinalHeight: mobileResponsiveCheck.inlineFinalHeight,
      inlineFinalWidth: mobileResponsiveCheck.inlineFinalWidth,
    })}`);
    process.exitCode = 1;
  } else if (mobileResponsiveCheck.clippedCards.length) {
    console.error(`FAIL: mobile deck card content clips or overflows: ${JSON.stringify(mobileResponsiveCheck.clippedCards)}`);
    process.exitCode = 1;
  } else if (mobileResponsiveCheck.pageOverflowX || mobileResponsiveCheck.pageOverflowY) {
    console.error(`FAIL: mobile portfolio route introduces page overflow: ${JSON.stringify({
      pageOverflowX: mobileResponsiveCheck.pageOverflowX,
      pageOverflowY: mobileResponsiveCheck.pageOverflowY,
    })}`);
    process.exitCode = 1;
  } else if (denseAudit.errors.length) {
    denseAudit.errors.forEach((error) => console.error(`FAIL: ${error}`));
    process.exitCode = 1;
  } else {
    console.error(`PASS: canvas buffer OK, deck interaction OK, ${labelCheck.nonEmpty} label(s) with text, dense gate frames clean`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
