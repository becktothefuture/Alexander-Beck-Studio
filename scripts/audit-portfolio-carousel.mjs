/**
 * Portfolio orbital carousel regression audit.
 *
 * Run against a production preview:
 * ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-carousel
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 30000);
const ARTIFACT_ROOT = path.resolve(
  process.cwd(),
  process.env.ABS_CAROUSEL_ARTIFACT_DIR
    || `output/playwright/portfolio-carousel-fixes-qa-${new Date().toISOString().replace(/[:.]/g, '-')}`
);
const VIEWPORTS = [
  { name: 'desktop-wide', width: 3440, height: 1440 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile-landscape', width: 844, height: 390 },
  { name: 'mobile-small', width: 360, height: 640 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'mobile-large', width: 430, height: 932 },
];

function resolvePortfolioUrl() {
  const raw = (process.env.ABS_DEV_URL || 'http://127.0.0.1:8013').trim().replace(/\/+$/, '');
  const url = /\.html(?:[?#]|$)/i.test(raw) ? new URL(raw) : new URL(`${raw}/portfolio.html`);
  if (!/portfolio\.html$/i.test(url.pathname)) url.pathname = '/portfolio.html';
  return url.toString();
}

async function waitForCarousel(page) {
  await page.waitForSelector('.portfolio-project-card.is-active', { state: 'visible', timeout: WAIT_MS });
  await page.waitForFunction(
    () => {
      const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
      const snapshot = app?.getDeckDebugSnapshot?.();
      return Boolean(
        app
        && snapshot?.isSettled
        && snapshot?.inputState === 'idle'
        && document.body.dataset.portfolioLoadState === 'loaded'
        && document.getElementById('portfolioProjectMount')?.dataset.portfolioMediaReady === 'true'
      );
    },
    null,
    { timeout: WAIT_MS }
  );
  await page.waitForFunction(
    () => {
      const activeCard = document.querySelector('.portfolio-project-card.is-active');
      const image = activeCard?.querySelector('img');
      const video = activeCard?.querySelector('video');
      return Boolean(
        activeCard
        && (!image || (image.complete && image.naturalWidth > 0))
        && (!video || video.readyState >= 2)
      );
    },
    null,
    { timeout: WAIT_MS }
  );
  await page.waitForTimeout(600);
}

async function openViewport(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(resolvePortfolioUrl(), { waitUntil: 'networkidle', timeout: 60000 });
  await waitForCarousel(page);
}

async function getActiveCardCenter(page) {
  return page.locator('.portfolio-project-card.is-active').evaluate((card) => {
    const rect = card.getBoundingClientRect();
    return {
      x: rect.left + (rect.width / 2),
      y: rect.top + (rect.height / 2),
      width: rect.width,
      height: rect.height,
    };
  });
}

async function collectGeometry(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.portfolio-deck-stage');
    if (!(stage instanceof HTMLElement)) return { cards: [], overlaps: [], activeCenterDeltaY: null };
    const stageRect = stage.getBoundingClientRect();
    const cards = Array.from(document.querySelectorAll('.portfolio-project-card'))
      .map((card) => {
        if (!(card instanceof HTMLElement)) return null;
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        const clipped = {
          left: Math.max(rect.left, stageRect.left),
          right: Math.min(rect.right, stageRect.right),
          top: Math.max(rect.top, stageRect.top),
          bottom: Math.min(rect.bottom, stageRect.bottom),
        };
        clipped.width = Math.max(0, clipped.right - clipped.left);
        clipped.height = Math.max(0, clipped.bottom - clipped.top);
        if (style.visibility === 'hidden' || Number(style.opacity) <= 0.05 || clipped.width <= 4 || clipped.height <= 4) {
          return null;
        }
        return {
          projectId: card.dataset.projectId,
          offset: Number(card.dataset.orbitOffset),
          opacity: Number(style.opacity),
          rect: clipped,
        };
      })
      .filter(Boolean);
    const overlaps = [];
    for (let firstIndex = 0; firstIndex < cards.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < cards.length; secondIndex += 1) {
        const first = cards[firstIndex];
        const second = cards[secondIndex];
        const overlapX = Math.min(first.rect.right, second.rect.right) - Math.max(first.rect.left, second.rect.left);
        const overlapY = Math.min(first.rect.bottom, second.rect.bottom) - Math.max(first.rect.top, second.rect.top);
        if (overlapX > 4 && overlapY > 4) {
          overlaps.push({
            first: first.projectId,
            second: second.projectId,
            overlapX: Number(overlapX.toFixed(2)),
            overlapY: Number(overlapY.toFixed(2)),
          });
        }
      }
    }
    const activeCardRect = document.querySelector('.portfolio-project-card.is-active')?.getBoundingClientRect?.();
    const intro = document.querySelector('.portfolio-deck-intro');
    const introRect = intro instanceof HTMLElement && getComputedStyle(intro).display !== 'none'
      ? intro.getBoundingClientRect()
      : null;
    const activeCenterDeltaY = activeCardRect
      ? Math.abs(
        (activeCardRect.top + (activeCardRect.height / 2))
        - (stageRect.top + (stageRect.height / 2))
      )
      : null;
    return {
      cards,
      overlaps,
      activeCenterDeltaY: activeCenterDeltaY === null ? null : Number(activeCenterDeltaY.toFixed(3)),
      introCardGap: activeCardRect && introRect
        ? Number((activeCardRect.top - introRect.bottom).toFixed(3))
        : null,
    };
  });
}

async function collectDotAppearance(page) {
  return page.evaluate(() => {
    const dots = Array.from(document.querySelectorAll('.portfolio-carousel-dot'));
    const samples = dots.map((dot) => {
      const style = getComputedStyle(dot);
      const rect = dot.getBoundingClientRect();
      return {
        color: style.backgroundColor,
        opacity: Number.parseFloat(style.opacity),
        width: Number.parseFloat(style.width),
        height: Number.parseFloat(style.height),
        borderRadius: Number.parseFloat(style.borderRadius),
        cornerShape: style.cornerShape || '',
        centerX: rect.left + (rect.width / 2),
        centerY: rect.top + (rect.height / 2),
      };
    });
    const centerGaps = samples
      .slice(1)
      .map((sample, index) => Math.hypot(
        sample.centerX - samples[index].centerX,
        sample.centerY - samples[index].centerY
      ));
    const activeCardRect = document.querySelector('.portfolio-project-card.is-active')?.getBoundingClientRect?.();
    const dotDial = document.querySelector('.portfolio-carousel-dot-dial');
    const dotDialVisible = dotDial ? getComputedStyle(dotDial).display !== 'none' : false;
    const activeCardOverlaps = activeCardRect
      ? dots.filter((dot) => {
        const rect = dot.getBoundingClientRect();
        return Math.min(rect.right, activeCardRect.right) - Math.max(rect.left, activeCardRect.left) > 0
          && Math.min(rect.bottom, activeCardRect.bottom) - Math.max(rect.top, activeCardRect.top) > 0;
      }).length
      : null;
    return {
      count: samples.length,
      uniqueColors: new Set(samples.map((sample) => sample.color)).size,
      minOpacity: samples.length ? Math.min(...samples.map((sample) => sample.opacity)) : null,
      maxOpacity: samples.length ? Math.max(...samples.map((sample) => sample.opacity)) : null,
      opacities: samples.map((sample) => Number(sample.opacity.toFixed(3))).sort((a, b) => a - b),
      dotDialVisible,
      cornerShapes: Array.from(new Set(samples.map((sample) => sample.cornerShape).filter(Boolean))),
      maxAspectDelta: samples.length
        ? Math.max(...samples.map((sample) => Math.abs(sample.width - sample.height)))
        : null,
      minRadiusRatio: samples.length
        ? Math.min(...samples.map((sample) => sample.borderRadius / Math.max(1, sample.width)))
        : null,
      minCenterGap: centerGaps.length ? Math.min(...centerGaps) : null,
      dotSize: samples[0]?.width ?? null,
      activeCardOverlaps,
    };
  });
}

async function collectParticleFieldSnapshot(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.portfolio-speed-field-canvas');
    if (!canvas) {
      return {
        error: 'portfolio-speed-field-canvas-missing',
      };
    }
    const snapshot = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.getDeckDebugSnapshot?.();
    if (!snapshot?.particleField) {
      return {
        error: 'portfolio-particle-field-snapshot-missing',
      };
    }
    return {
      ...snapshot.particleField,
      mounted: canvas.isConnected,
    };
  });
}

async function auditPointerPress(page, artifactName) {
  const before = await getActiveCardCenter(page);
  await page.mouse.move(before.x, before.y);
  await page.mouse.down();
  await page.waitForTimeout(80);
  const during = await getActiveCardCenter(page);
  await page.screenshot({ path: path.join(ARTIFACT_ROOT, artifactName) });
  await page.evaluate(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    if (app) app.suppressNextCardClick = true;
  });
  await page.mouse.up();
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    if (app) app.suppressNextCardClick = false;
  });
  const delta = Math.hypot(during.x - before.x, during.y - before.y);
  return { before, during, delta: Number(delta.toFixed(3)) };
}

async function auditCursor(page) {
  const center = await getActiveCardCenter(page);
  await page.mouse.move(center.x, center.y);
  await page.waitForTimeout(100);
  return page.evaluate(() => ({
    className: document.getElementById('custom-cursor')?.className || '',
    text: (document.querySelector('#custom-cursor .abs-cursor-label')?.textContent || '').trim(),
  }));
}

async function getMotionSample(page) {
  return page.evaluate(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const snapshot = app?.getDeckDebugSnapshot?.();
    const particleField = snapshot?.particleField || {
      running: false,
      visible: false,
      opacity: 0,
      particleCount: 0,
    };
    const dot = document.querySelector('.portfolio-carousel-dot');
    const dotRect = dot?.getBoundingClientRect?.();
    const visibleProjectIndices = Array.from(new Set(
      (snapshot?.cards || [])
        .filter((card) => card.visibility !== 'hidden' && card.opacity > 0.05)
        .map((card) => card.index)
    ));
    const frontProjectIndices = Array.from(new Set(
      (snapshot?.cards || [])
        .filter((card) => card.visualSlot === 'front' && card.visibility !== 'hidden' && card.opacity > 0.05)
        .map((card) => card.index)
    ));
    return {
      projectCount: app?.projects?.length || 0,
      activeIndex: snapshot?.activeIndex ?? -1,
      intendedIndex: snapshot?.intendedIndex ?? -1,
      displayPosition: snapshot?.displayPosition ?? 0,
      targetPosition: snapshot?.targetPosition ?? 0,
      targetLead: snapshot?.targetLead ?? 0,
      maxLeadProjects: snapshot?.maxLeadProjects ?? 0,
      measuredVelocity: snapshot?.measuredVelocity ?? 0,
      rebaseCount: snapshot?.rebaseCount ?? 0,
      particleField,
      speedField: particleField,
      settled: Boolean(snapshot?.isSettled),
      inputState: snapshot?.inputState || '',
      wheelAccumulated: app?.wheelGesture?.accumulated ?? null,
      visibleProjectIndices,
      frontProjectIndices,
      cardCount: snapshot?.cards?.length || 0,
      focusableCardCount: document.querySelectorAll('.portfolio-project-card[tabindex="0"]').length,
      dot: dotRect ? { x: dotRect.x, y: dotRect.y } : null,
    };
  });
}

async function waitForDeckIdle(page) {
  await page.waitForFunction(
    () => {
      const snapshot = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.getDeckDebugSnapshot?.();
      return snapshot?.isSettled && snapshot?.inputState === 'idle';
    },
    null,
    { timeout: Math.min(WAIT_MS, 5000) }
  );
}

async function waitForParticleIdle(page) {
  await page.waitForFunction(
    () => {
      const field = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.getDeckDebugSnapshot?.()?.particleField;
      return !field || (!field.running && !field.visible && (field.opacity || 0) <= 0.02);
    },
    null,
    { timeout: Math.min(WAIT_MS, 5000) }
  );
}

async function auditInfiniteWheelStress(page, { axis, direction }) {
  await page.evaluate(() => {
    window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.setActiveProject?.(0, { immediate: true });
  });
  await waitForDeckIdle(page);
  const center = await getActiveCardCenter(page);
  await page.mouse.move(center.x, center.y);
  const before = await getMotionSample(page);
  const eventCount = Math.max(280, before.projectCount * 140);
  const inFlightSamples = await page.evaluate(async ({ wheelAxis, wheelDirection, count }) => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const stage = document.querySelector('.portfolio-deck-stage');
    if (!app || !stage) return [];
    const collectSample = () => {
      const snapshot = app.getDeckDebugSnapshot?.();
      const particleField = snapshot?.particleField || {
        running: false,
        visible: false,
        opacity: 0,
        particleCount: 0,
      };
      const visibleProjectIndices = Array.from(new Set(
        (snapshot?.cards || [])
          .filter((card) => card.visibility !== 'hidden' && card.opacity > 0.05)
          .map((card) => card.index)
      ));
      const frontProjectIndices = Array.from(new Set(
        (snapshot?.cards || [])
          .filter((card) => card.visualSlot === 'front' && card.visibility !== 'hidden' && card.opacity > 0.05)
          .map((card) => card.index)
      ));
      return {
        projectCount: app.projects?.length || 0,
        activeIndex: snapshot?.activeIndex ?? -1,
        intendedIndex: snapshot?.intendedIndex ?? -1,
        displayPosition: snapshot?.displayPosition ?? 0,
        targetPosition: snapshot?.targetPosition ?? 0,
        targetLead: snapshot?.targetLead ?? 0,
        maxLeadProjects: snapshot?.maxLeadProjects ?? 0,
        measuredVelocity: snapshot?.measuredVelocity ?? 0,
        rebaseCount: snapshot?.rebaseCount ?? 0,
        particleField,
        speedField: particleField,
        settled: Boolean(snapshot?.isSettled),
        inputState: snapshot?.inputState || '',
        wheelAccumulated: app.wheelGesture?.accumulated ?? null,
        visibleProjectIndices,
        frontProjectIndices,
        cardCount: snapshot?.cards?.length || 0,
        focusableCardCount: document.querySelectorAll('.portfolio-project-card[tabindex="0"]').length,
      };
    };
    const samples = [];
    for (let index = 0; index < count; index += 1) {
      const delta = wheelDirection * 420;
      stage.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaX: wheelAxis === 'x' ? delta : 0,
        deltaY: wheelAxis === 'y' ? delta : 0,
        deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      }));
      await new Promise((resolve) => setTimeout(resolve, 8));
      samples.push(collectSample());
    }
    return samples;
  }, { wheelAxis: axis, wheelDirection: direction, count: eventCount });
  await waitForDeckIdle(page);
  await waitForParticleIdle(page);
  const after = await getMotionSample(page);

  const projectCount = Math.max(1, before.projectCount);
  const wrapIndex = (value) => ((Math.round(value) % projectCount) + projectCount) % projectCount;
  const blankSamples = inFlightSamples
    .map((sample, index) => ({ index, sample }))
    .filter(({ sample }) => sample.visibleProjectIndices.length === 0);
  const orderMismatches = inFlightSamples
    .map((sample, index) => ({
      index,
      expectedIndex: wrapIndex(sample.displayPosition),
      frontProjectIndices: sample.frontProjectIndices,
    }))
    .filter(({ expectedIndex, frontProjectIndices }) => !frontProjectIndices.includes(expectedIndex));
  const wrappedDeltas = inFlightSamples.slice(1).map((sample, index) => {
    const rawDelta = sample.displayPosition - inFlightSamples[index].displayPosition;
    return ((((rawDelta + (projectCount / 2)) % projectCount) + projectCount) % projectCount)
      - (projectCount / 2);
  });
  const totalTravel = wrappedDeltas.reduce((sum, delta) => sum + delta, 0);
  const lateStart = Math.floor(wrappedDeltas.length * 0.75);
  const lateTravel = wrappedDeltas.slice(lateStart).reduce((sum, delta) => sum + delta, 0);
  const maxAbsLead = inFlightSamples.length
    ? Math.max(...inFlightSamples.map((sample) => Math.abs(sample.targetLead)))
    : 0;
  const maxCoordinateMagnitude = inFlightSamples.length
    ? Math.max(...inFlightSamples.flatMap((sample) => [
        Math.abs(sample.displayPosition),
        Math.abs(sample.targetPosition),
      ]))
    : 0;
  const fieldActivated = inFlightSamples.some((sample) => (
    sample.speedField?.visible || (sample.speedField?.opacity || 0) > 0.02
  ));
  const maxFieldParticleCount = inFlightSamples.length
    ? Math.max(...inFlightSamples.map((sample) => sample.speedField?.particleCount || 0))
    : 0;
  const minFieldParticleCount = inFlightSamples
    .map((sample) => sample.speedField?.particleCount)
    .filter(Number.isFinite)
    .reduce((min, count) => Math.min(min, count), Infinity);
  const cardCounts = Array.from(new Set(inFlightSamples.map((sample) => sample.cardCount)));
  const focusableWhileMoving = inFlightSamples
    .map((sample, index) => ({ index, sample }))
    .filter(({ sample }) => Math.abs(sample.measuredVelocity) > 0.05 && sample.focusableCardCount > 0)
    .map(({ index }) => index);
  const settledCoordinatesBounded = after.targetPosition >= 0
    && after.targetPosition < projectCount
    && after.displayPosition >= 0
    && after.displayPosition < projectCount;

  return {
    axis,
    direction,
    before,
    after,
    eventCount,
    totalTravel: Number(totalTravel.toFixed(4)),
    lateTravel: Number(lateTravel.toFixed(4)),
    maxAbsLead: Number(maxAbsLead.toFixed(4)),
    maxCoordinateMagnitude: Number(maxCoordinateMagnitude.toFixed(4)),
    fieldActivated,
    fieldParticleCountStable: Number.isFinite(minFieldParticleCount)
      && minFieldParticleCount === maxFieldParticleCount,
    fieldParticleCount: maxFieldParticleCount,
    cardCounts,
    focusableWhileMoving,
    blankSamples: blankSamples.map(({ index }) => index),
    orderMismatches,
    settledCoordinatesBounded,
  };
}

async function auditSpeedFieldPerformance(page, durationMs = 10_000) {
  await page.evaluate(() => {
    window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.setActiveProject?.(0, { immediate: true });
  });
  await waitForDeckIdle(page);
  const sample = await page.evaluate(async (duration) => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const stage = document.querySelector('.portfolio-deck-stage');
    if (!app || !stage) return null;
    const intervals = [];
    let previousFrameAt = 0;
    let fieldActivated = false;
    let minParticleCount = Infinity;
    let maxParticleCount = 0;
    let maxLead = 0;
    const initialCardCount = app.cards?.length || 0;

    const collectFrameIntervals = (sampleDuration, onFrame) => new Promise((resolve) => {
      const frameIntervals = [];
      const sampleStartedAt = performance.now();
      let previousSampleFrameAt = 0;
      const sampleFrame = (timestamp) => {
        if (previousSampleFrameAt) frameIntervals.push(timestamp - previousSampleFrameAt);
        previousSampleFrameAt = timestamp;
        onFrame?.();
        if (timestamp - sampleStartedAt >= sampleDuration) resolve(frameIntervals);
        else requestAnimationFrame(sampleFrame);
      };
      requestAnimationFrame(sampleFrame);
    });

    const originalFieldDraw = app.particleField?.drawFrame;
    if (app.particleField && typeof originalFieldDraw === 'function') {
      app.particleField.drawFrame = () => {};
    }
    const baselineIntervals = await collectFrameIntervals(5000, () => {
      stage.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: 420,
        deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      }));
    });
    if (app.particleField && typeof originalFieldDraw === 'function') {
      app.particleField.drawFrame = originalFieldDraw;
    }

    const startedAt = performance.now();
    await new Promise((resolve) => {
      const sampleFrame = (timestamp) => {
        if (previousFrameAt) intervals.push(timestamp - previousFrameAt);
        previousFrameAt = timestamp;
        stage.dispatchEvent(new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: 420,
          deltaMode: WheelEvent.DOM_DELTA_PIXEL,
        }));
        const fieldSnapshot = app.particleField?.getSnapshot?.();
        const particleCount = fieldSnapshot?.particleCount;
        fieldActivated ||= Boolean(fieldSnapshot?.visible || (fieldSnapshot?.opacity || 0) > 0.02);
        if (Number.isFinite(particleCount)) {
          minParticleCount = Math.min(minParticleCount, particleCount);
          maxParticleCount = Math.max(maxParticleCount, particleCount);
        }
        maxLead = Math.max(
          maxLead,
          Math.abs((app.deckTargetPosition || 0) - (app.deckDisplayPosition || 0))
        );
        if (timestamp - startedAt >= duration) resolve();
        else requestAnimationFrame(sampleFrame);
      };
      requestAnimationFrame(sampleFrame);
    });
    return {
      intervals,
      fieldActivated,
      minParticleCount: Number.isFinite(minParticleCount) ? minParticleCount : 0,
      maxParticleCount,
      maxLead,
      initialCardCount,
      finalCardCount: app.cards?.length || 0,
      baselineIntervals,
    };
  }, durationMs);
  await waitForDeckIdle(page);
  await waitForParticleIdle(page);
  const after = await page.evaluate(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const snapshot = app?.getDeckDebugSnapshot?.();
    return {
      fieldRunning: Boolean(snapshot?.particleField?.running),
      fieldActive: Boolean(snapshot?.particleField?.active),
      fieldVisible: Boolean(snapshot?.particleField?.visible),
      fieldOpacity: Number(snapshot?.particleField?.opacity || 0),
      reducedMotion: Boolean(snapshot?.particleField?.reducedMotion),
      deckRafActive: Boolean(app?.deckAnimationFrame),
    };
  });
  const intervals = sample?.intervals?.filter(Number.isFinite) || [];
  const baselineIntervals = sample?.baselineIntervals?.filter(Number.isFinite) || [];
  const sorted = [...intervals].sort((a, b) => a - b);
  const baselineSorted = [...baselineIntervals].sort((a, b) => a - b);
  const elapsed = intervals.reduce((sum, interval) => sum + interval, 0);
  const baselineElapsed = baselineIntervals.reduce((sum, interval) => sum + interval, 0);
  const p95Index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1));
  const baselineP95Index = Math.max(
    0,
    Math.min(baselineSorted.length - 1, Math.ceil(baselineSorted.length * 0.95) - 1)
  );
  const fps = intervals.length * 1000 / Math.max(1, elapsed);
  const baselineFps = baselineIntervals.length * 1000 / Math.max(1, baselineElapsed);
  const p95Ms = sorted[p95Index] ?? Infinity;
  const baselineP95Ms = baselineSorted[baselineP95Index] ?? Infinity;
  return {
    durationMs,
    fps,
    p95Ms,
    baselineFps,
    baselineP95Ms,
    absoluteGateAvailable: baselineFps >= 58 && baselineP95Ms <= 20,
    relativeFpsGateAvailable: baselineFps >= 30,
    relativeFpsRatio: baselineFps > 0 ? fps / baselineFps : 0,
    relativeP95Ratio: baselineP95Ms > 0 ? p95Ms / baselineP95Ms : Infinity,
    fieldActivated: Boolean(sample?.fieldActivated),
    hasParticleField: Boolean(sample?.maxParticleCount),
    particleCountStable: sample?.maxParticleCount
      ? sample?.minParticleCount > 0 && sample?.minParticleCount === sample?.maxParticleCount
      : true,
    particleCount: sample?.maxParticleCount || 0,
    cardCountStable: sample?.initialCardCount > 0
      && sample?.initialCardCount === sample?.finalCardCount,
    maxLead: sample?.maxLead ?? Infinity,
    after,
  };
}

async function auditRapidReversal(page) {
  await page.evaluate(() => {
    window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.setActiveProject?.(0, { immediate: true });
  });
  await waitForDeckIdle(page);
  const result = await page.evaluate(async () => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const stage = document.querySelector('.portfolio-deck-stage');
    if (!app || !stage) return null;
    const dispatch = (deltaY) => stage.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
    }));
    for (let index = 0; index < 48; index += 1) {
      dispatch(420);
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
    const beforeReversal = app.getDeckDebugSnapshot?.();
    const samples = [];
    for (let index = 0; index < 48; index += 1) {
      dispatch(-420);
      await new Promise((resolve) => setTimeout(resolve, 8));
      const snapshot = app.getDeckDebugSnapshot?.();
      samples.push({
        velocity: snapshot?.measuredVelocity || 0,
        fieldVelocity: snapshot?.particleField?.filteredVelocity || 0,
        lead: snapshot?.targetLead || 0,
        visible: (snapshot?.cards || []).some((card) => card.visibility !== 'hidden' && card.opacity > 0.05),
      });
    }
    return {
      beforeVelocity: beforeReversal?.measuredVelocity || 0,
      beforeFieldVelocity: beforeReversal?.particleField?.filteredVelocity || 0,
      reversalSample: samples.findIndex((sample) => sample.velocity < -0.5),
      fieldReversalSample: samples.findIndex((sample) => sample.fieldVelocity < -0.5),
      maxLead: Math.max(...samples.map((sample) => Math.abs(sample.lead))),
      blankSamples: samples.map((sample, index) => ({ sample, index })).filter(({ sample }) => !sample.visible).map(({ index }) => index),
    };
  });
  await waitForDeckIdle(page);
  return {
    ...result,
    after: await getMotionSample(page),
  };
}

async function waitForCommittedAdvance(page, beforeIndex) {
  try {
    await page.waitForFunction(
      (previousIndex) => {
        const snapshot = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.getDeckDebugSnapshot?.();
        return Boolean(
          snapshot?.isSettled
          && snapshot?.inputState === 'idle'
          && snapshot.activeIndex !== previousIndex
        );
      },
      beforeIndex,
      { timeout: Math.min(WAIT_MS, 5000) }
    );
    return true;
  } catch (error) {
    return false;
  }
}

function findMotionReversals(samples) {
  if (samples.length < 2) return [];
  const projectCount = Math.max(0, samples[0]?.projectCount || 0);
  const deltas = samples.slice(1).map((sample, index) => {
    const rawDelta = sample.displayPosition - samples[index].displayPosition;
    return projectCount
      ? rawDelta - (Math.round(rawDelta / projectCount) * projectCount)
      : rawDelta;
  });
  const overallDirection = Math.sign(deltas.reduce((sum, delta) => sum + delta, 0));
  if (!overallDirection) return [];
  const reversals = [];
  for (let index = 0; index < deltas.length; index += 1) {
    if (deltas[index] * overallDirection < -0.04) reversals.push({ index: index + 1, delta: deltas[index] });
  }
  return reversals;
}

async function auditWheel(page) {
  const before = await getMotionSample(page);
  const center = await getActiveCardCenter(page);
  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel(0, 260);
  const samples = [before];
  for (let index = 0; index < 12; index += 1) {
    await page.waitForTimeout(35);
    samples.push(await getMotionSample(page));
  }
  const committed = await waitForCommittedAdvance(page, before.activeIndex);
  const after = await getMotionSample(page);
  samples.push(after);
  const dotDelta = before.dot && samples[2]?.dot
    ? Math.hypot(samples[2].dot.x - before.dot.x, samples[2].dot.y - before.dot.y)
    : 0;
  return {
    before,
    after,
    samples,
    dotDelta: Number(dotDelta.toFixed(3)),
    committed,
    reversals: findMotionReversals(samples),
  };
}

async function auditContinuousWheel(page) {
  const before = await getMotionSample(page);
  const center = await getActiveCardCenter(page);
  await page.mouse.move(center.x, center.y);
  const samples = [before];
  for (let index = 0; index < 16; index += 1) {
    await page.mouse.wheel(0, 260);
    await page.waitForTimeout(30);
    samples.push(await getMotionSample(page));
  }
  await page.waitForFunction(
    () => {
      const snapshot = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.getDeckDebugSnapshot?.();
      return snapshot?.isSettled && snapshot?.inputState === 'idle';
    },
    null,
    { timeout: Math.min(WAIT_MS, 5000) }
  );
  const after = await getMotionSample(page);
  samples.push(after);
  const inFlightSamples = samples.slice(0, -1);
  const distance = inFlightSamples.reduce((maximum, sample) => Math.max(
    maximum,
    Math.abs(sample.displayPosition - before.displayPosition)
  ), 0);
  return {
    before,
    after,
    samples,
    distance: Number(distance.toFixed(3)),
    reversals: findMotionReversals(inFlightSamples),
  };
}

async function auditDrag(page, distancePx) {
  const before = await getMotionSample(page);
  const center = await getActiveCardCenter(page);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x - distancePx, center.y, { steps: 10 });
  await page.mouse.up();
  const committed = await waitForCommittedAdvance(page, before.activeIndex);
  const after = await getMotionSample(page);
  const drawerOpen = await page.evaluate(() => document.body.classList.contains('portfolio-project-open'));
  return { before, after, committed, drawerOpen };
}

async function collectPermanentRingSample(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.portfolio-deck-stage');
    const stageRect = stage?.getBoundingClientRect?.();
    const identities = [];
    const visibleProjects = {};
    const mediaFailures = [];
    const edgeOpacitySamples = [];
    const cards = Array.from(document.querySelectorAll('.portfolio-project-card'));
    cards.forEach((card) => {
      const style = getComputedStyle(card);
      const rect = card.getBoundingClientRect();
      const instanceKey = card.dataset.cardInstanceKey || '';
      const projectId = card.dataset.projectId || '';
      const media = card.querySelector('.portfolio-project-card__media');
      const image = media?.querySelector('img');
      const video = media?.querySelector('video');
      const fallback = media?.querySelector('.portfolio-project-card__media-fallback');
      identities.push({
        instanceKey,
        projectId,
        mediaSrc: media?.dataset.mediaSrc || '',
        client: card.querySelector('.portfolio-project-card__client')?.textContent || '',
        title: card.querySelector('.portfolio-project-card__title-text')?.textContent || '',
      });
      if (!stageRect) return;
      const clippedWidth = Math.max(0, Math.min(rect.right, stageRect.right) - Math.max(rect.left, stageRect.left));
      const clippedHeight = Math.max(0, Math.min(rect.bottom, stageRect.bottom) - Math.max(rect.top, stageRect.top));
      const opacity = Number.parseFloat(style.opacity || '0');
      const intersects = clippedWidth > 2 && clippedHeight > 2 && style.visibility !== 'hidden';
      if (!intersects) return;
      const clippedRatio = rect.width > 0 ? clippedWidth / rect.width : 0;
      if (clippedRatio > 0.02 && clippedRatio < 0.45 && opacity > 0.5) {
        edgeOpacitySamples.push(opacity);
      }
      const mediaReady = Boolean(
        fallback
        || (image && image.complete && image.naturalWidth > 0)
        || (video && (video.readyState >= 2 || video.poster))
      );
      if (opacity > 0.02 && !mediaReady) {
        mediaFailures.push({ instanceKey, projectId, opacity });
      }
      const previous = visibleProjects[projectId];
      if (!previous || opacity > previous.opacity) {
        visibleProjects[projectId] = {
          instanceKey,
          opacity,
          clippedRatio,
          left: rect.left,
          right: rect.right,
        };
      }
    });
    return {
      projectCount: window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.projects?.length || 0,
      identities,
      visibleProjects,
      mediaFailures,
      edgeOpacitySamples,
    };
  });
}

async function advancePermanentRingFrame(page, direction, step) {
  await page.evaluate(({ direction: deltaDirection, step: deltaStep }) => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    if (!app) return;
    app.setDeckPosition(app.deckDisplayPosition + (deltaDirection * deltaStep), {
      immediate: true,
      settle: false,
      allowFractionalReducedMotion: true,
    });
  }, { direction, step });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function auditPermanentRing(page) {
  const initial = await collectPermanentRingSample(page);
  const baselineIdentities = new Map(initial.identities.map((entry) => [entry.instanceKey, JSON.stringify(entry)]));
  const duplicateInstanceKeys = initial.identities.length - baselineIdentities.size;
  const abruptEntries = [];
  const mediaFailures = [...initial.mediaFailures];
  const edgeOpacitySamples = [...initial.edgeOpacitySamples];
  let maxOpacityJump = 0;
  const stepsPerProject = 20;

  for (const direction of [1, -1]) {
    await page.evaluate(() => {
      const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
      app?.setActiveProject?.(0, { immediate: true });
    });
    await page.waitForTimeout(180);
    let previous = await collectPermanentRingSample(page);
    const stepCount = initial.projectCount * 2 * stepsPerProject;
    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
      await advancePermanentRingFrame(page, direction, 1 / stepsPerProject);
      const current = await collectPermanentRingSample(page);
      mediaFailures.push(...current.mediaFailures);
      edgeOpacitySamples.push(...current.edgeOpacitySamples);
      for (const [projectId, state] of Object.entries(current.visibleProjects)) {
        const previousState = previous.visibleProjects[projectId];
        const previousOpacity = previousState?.opacity || 0;
        const opacityJump = state.opacity - previousOpacity;
        if (previousState) maxOpacityJump = Math.max(maxOpacityJump, opacityJump);
        if (previousOpacity <= 0.03 && state.opacity > 0.95 && state.clippedRatio > 0.2) {
          abruptEntries.push({ direction, stepIndex, projectId, previousOpacity, opacity: state.opacity });
        }
      }
      previous = current;
    }
  }

  const final = await collectPermanentRingSample(page);
  const identityMutations = final.identities.filter((entry) => {
    return baselineIdentities.get(entry.instanceKey) !== JSON.stringify(entry);
  });
  return {
    projectCount: initial.projectCount,
    instanceCount: initial.identities.length,
    duplicateInstanceKeys,
    identityMutations,
    abruptEntries,
    mediaFailures,
    maxOpacityJump: Number(maxOpacityJump.toFixed(4)),
    minEdgeOpacity: edgeOpacitySamples.length
      ? Number(Math.min(...edgeOpacitySamples).toFixed(4))
      : null,
  };
}

async function readPortfolioVeil(page) {
  return page.evaluate(() => {
    const rectOf = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return [rect.x, rect.y, rect.width, rect.height].map((value) => Number(value.toFixed(2)));
    };
    const veil = document.querySelector('.simulation-contrast-veil');
    const before = veil ? getComputedStyle(veil, '::before') : null;
    const after = veil ? getComputedStyle(veil, '::after') : null;
    const veilStyle = veil ? getComputedStyle(veil) : null;
    const wallInset = getComputedStyle(document.getElementById('simulations'), '::before');
    const rootStyle = getComputedStyle(document.documentElement);
    return {
      theme: document.querySelector('.button-bar__theme-toggle')?.dataset.state || '',
      rect: rectOf(veil),
      overlayRect: rectOf(document.getElementById('window-overlay-content-layer')),
      pointerEvents: veilStyle?.pointerEvents || '',
      zIndex: Number.parseInt(veilStyle?.zIndex || '0', 10) || 0,
      wallZ: Number.parseInt(getComputedStyle(document.getElementById('simulations')).zIndex || '0', 10) || 0,
      uiZ: Number.parseInt(getComputedStyle(document.querySelector('.fade-content')).zIndex || '0', 10) || 0,
      sheetZ: Number.parseInt(getComputedStyle(document.getElementById('portfolio-sheet-host')).zIndex || '0', 10) || 0,
      beforeContent: before?.content || '',
      beforeBackground: before?.backgroundImage || '',
      afterContent: after?.content || '',
      afterBackground: after?.backgroundImage || '',
      wallInsetContent: wallInset?.content || '',
      wallInsetShadow: wallInset?.boxShadow || '',
      wallRgb: rootStyle.getPropertyValue('--simulation-contrast-veil-rgb').trim(),
      opacity: rootStyle.getPropertyValue('--simulation-contrast-veil-opacity').trim(),
    };
  });
}

async function setPortfolioTheme(page, theme) {
  const toggle = page.locator('.button-bar__theme-toggle');
  if (await toggle.getAttribute('data-state') !== theme) await toggle.click();
  await page.waitForFunction(
    (expectedTheme) => document.querySelector('.button-bar__theme-toggle')?.dataset.state === expectedTheme,
    theme,
    { timeout: WAIT_MS }
  );
  await page.waitForTimeout(180);
}

async function captureVeilThemes(page) {
  await page.evaluate(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    app?.setActiveProject?.(0, { immediate: true });
  });
  await page.waitForTimeout(320);
  await setPortfolioTheme(page, 'light');
  const light = await readPortfolioVeil(page);
  await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'desktop-veil-light.png') });
  await setPortfolioTheme(page, 'dark');
  const dark = await readPortfolioVeil(page);
  await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'desktop-veil-dark.png') });
  await setPortfolioTheme(page, 'light');
  return { light, dark };
}

async function captureAccents(page) {
  const results = [];
  const projectCount = await page.evaluate(() => window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.projects?.length || 0);
  const viewport = page.viewportSize() || { width: 1440, height: 900 };
  await page.mouse.move(viewport.width * 0.5, viewport.height * 0.2);
  await page.waitForTimeout(120);
  for (let index = 0; index < projectCount; index += 1) {
    const result = await page.evaluate((projectIndex) => {
      const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
      app?.setActiveProject?.(projectIndex, { immediate: true });
      const card = document.querySelector('.portfolio-project-card.is-active');
      const veil = card?.querySelector('.portfolio-project-card__media-veil');
      return {
        projectIndex,
        projectId: card?.dataset.projectId || '',
        accent: card ? getComputedStyle(card).getPropertyValue('--portfolio-card-accent').trim() : '',
        veil: veil ? getComputedStyle(veil).backgroundImage : '',
      };
    }, index);
    await page.waitForFunction(
      () => {
        const image = document.querySelector('.portfolio-project-card.is-active img');
        return !image || (image.complete && image.naturalWidth > 0);
      },
      null,
      { timeout: WAIT_MS }
    );
    await page.waitForTimeout(80);
    await page.screenshot({ path: path.join(ARTIFACT_ROOT, `desktop-accent-${String(index + 1).padStart(2, '0')}.png`) });
    results.push(result);
  }
  return results;
}

async function captureDrawer(page) {
  await page.evaluate(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    app?.setActiveProject?.(0, { immediate: true });
    if (app) app.suppressNextCardClick = false;
  });
  await page.locator('.portfolio-project-card.is-active').click();
  await page.waitForSelector('#portfolioProjectView.is-visible.is-open', { state: 'visible', timeout: WAIT_MS });
  await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'desktop-drawer-open.png') });
  const state = await page.evaluate(() => ({
    bodyOpen: document.body.classList.contains('portfolio-project-open'),
    drawerVisible: document.getElementById('portfolioProjectView')?.classList.contains('is-open') || false,
  }));
  await page.locator('.portfolio-project-view__back--top').click();
  await page.waitForFunction(() => !document.body.classList.contains('portfolio-project-open'), null, { timeout: WAIT_MS });
  return state;
}

async function auditParticleFieldRemount(page) {
  await page.locator('[data-route-tab="home"]').click();
  await page.waitForURL(/\/index\.html(?:[?#]|$)/, { timeout: WAIT_MS });
  await page.waitForFunction(
    () => (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle',
    null,
    { timeout: WAIT_MS }
  );
  const homeCanvasCount = await page.locator('.portfolio-speed-field-canvas').count();

  await page.locator('[data-route-tab="portfolio"]').click();
  await page.waitForURL(/\/portfolio\.html(?:[?#]|$)/, { timeout: WAIT_MS });
  await waitForCarousel(page);
  const returnCanvasCount = await page.locator('.portfolio-speed-field-canvas').count();
  const particleField = await collectParticleFieldSnapshot(page);
  return { homeCanvasCount, returnCanvasCount, particleField };
}

async function auditReducedMotion(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openViewport(page, { width: 1440, height: 900 });
  const particleField = await collectParticleFieldSnapshot(page);
  const press = await auditPointerPress(page, 'desktop-reduced-motion-pointer-down.png');
  const wheel = await auditWheel(page);
  const infiniteStress = {
    forward: await auditInfiniteWheelStress(page, { axis: 'x', direction: 1 }),
    backward: await auditInfiniteWheelStress(page, { axis: 'x', direction: -1 }),
  };
  await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'desktop-reduced-motion-infinite-stress.png') });
  await page.evaluate(() => document.querySelector('.portfolio-project-card.is-active')?.click());
  await page.waitForSelector('#portfolioProjectView.is-visible.is-open', { state: 'visible', timeout: WAIT_MS });
  await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'desktop-reduced-motion-drawer-open.png') });
  const drawerOpen = await page.evaluate(() => document.body.classList.contains('portfolio-project-open'));
  await page.locator('.portfolio-project-view__back--top').click();
  await page.waitForFunction(() => !document.body.classList.contains('portfolio-project-open'), null, { timeout: WAIT_MS });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  return { particleField, press, wheel, infiniteStress, drawerOpen };
}

async function main() {
  await fs.mkdir(ARTIFACT_ROOT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));
  await page.addInitScript(() => {
    document.cookie = 'abs_portfolio_ok=1; Path=/; SameSite=Lax; Max-Age=31536000';
    window.sessionStorage.setItem('abs_portfolio_ok', String(Date.now()));
  });

  const summary = { url: resolvePortfolioUrl(), artifactRoot: ARTIFACT_ROOT, viewports: {}, pageErrors };
  try {
    for (const viewport of VIEWPORTS) {
      await openViewport(page, viewport);
      await waitForParticleIdle(page);
      const geometry = await collectGeometry(page);
      await page.screenshot({ path: path.join(ARTIFACT_ROOT, `${viewport.name}-closed.png`) });
      summary.viewports[viewport.name] = {
        geometry,
        dots: await collectDotAppearance(page),
        particleField: await collectParticleFieldSnapshot(page),
      };

      if (viewport.name === 'desktop') {
        summary.permanentRing = await auditPermanentRing(page);
        summary.veil = await captureVeilThemes(page);
        summary.viewports.desktop.cursor = await auditCursor(page);
        await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'desktop-hover.png') });
        summary.viewports.desktop.press = await auditPointerPress(page, 'desktop-pointer-down.png');
        summary.viewports.desktop.wheel = await auditWheel(page);
        await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'desktop-after-wheel.png') });
        summary.viewports.desktop.drag = await auditDrag(page, 220);
        await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'desktop-after-drag.png') });
        summary.viewports.desktop.continuousWheel = await auditContinuousWheel(page);
        await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'desktop-after-continuous-wheel.png') });
        summary.viewports.desktop.speedFieldPerformance = await auditSpeedFieldPerformance(page);
        summary.viewports.desktop.infiniteStress = {
          verticalForward: await auditInfiniteWheelStress(page, { axis: 'y', direction: 1 }),
          verticalBackward: await auditInfiniteWheelStress(page, { axis: 'y', direction: -1 }),
          horizontalForward: await auditInfiniteWheelStress(page, { axis: 'x', direction: 1 }),
          horizontalBackward: await auditInfiniteWheelStress(page, { axis: 'x', direction: -1 }),
        };
        summary.viewports.desktop.rapidReversal = await auditRapidReversal(page);
        await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'desktop-infinite-stress.png') });
        summary.accents = await captureAccents(page);
        summary.drawer = await captureDrawer(page);
        summary.particleFieldRemount = await auditParticleFieldRemount(page);
      }

      if (viewport.name === 'mobile') {
        summary.viewports.mobile.drag = await auditDrag(page, 150);
        await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'mobile-after-drag.png') });
        summary.viewports.mobile.infiniteStress = {
          forward: await auditInfiniteWheelStress(page, { axis: 'x', direction: 1 }),
          backward: await auditInfiniteWheelStress(page, { axis: 'x', direction: -1 }),
        };
        await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'mobile-infinite-stress.png') });
      }
    }
    summary.reducedMotion = await auditReducedMotion(page);

    const failures = [];
    for (const [name, result] of Object.entries(summary.viewports)) {
      if (result.geometry.overlaps.length) failures.push(`${name}: ${result.geometry.overlaps.length} visible overlap(s)`);
      if (result.geometry.activeCenterDeltaY === null || result.geometry.activeCenterDeltaY > 1) {
        failures.push(`${name}: active card is not vertically centered in the stage`);
      }
      if (result.geometry.introCardGap !== null && result.geometry.introCardGap < 8) {
        failures.push(`${name}: intro overlaps or crowds the active card`);
      }
      if (name === 'desktop-wide' && result.geometry.cards.length < 7) {
        failures.push('desktop-wide: ultra-wide layout does not expose all seven project cards');
      }
      if (result.dots.count !== 5) failures.push(`${name}: dot track should render exactly five dots`);
      if (result.dots.dotSize === null || result.dots.dotSize > 10) failures.push(`${name}: dot track dots are too large`);
      if (result.dots.maxOpacity === null || result.dots.maxOpacity < 0.9) failures.push(`${name}: center dot is not strong enough`);
      if (result.dots.minOpacity === null || result.dots.minOpacity > 0.35) failures.push(`${name}: side dots are not gently faded`);
      if (result.dots.cornerShapes.includes('squircle')) failures.push(`${name}: dots use squircle corners`);
      if (result.dots.maxAspectDelta === null || result.dots.maxAspectDelta > 0.5) failures.push(`${name}: dots are not square before rounding`);
      if (result.dots.minRadiusRatio === null || result.dots.minRadiusRatio < 0.49) failures.push(`${name}: dots are not circular`);
      if (result.dots.dotDialVisible && (result.dots.minCenterGap === null || result.dots.minCenterGap < result.dots.dotSize * 1.35)) {
        failures.push(`${name}: dots are not spaced clearly apart`);
      }
      if (result.dots.activeCardOverlaps === null || result.dots.activeCardOverlaps > 0) {
        failures.push(`${name}: dot track overlaps the active card`);
      }
      if (result.particleField?.error) failures.push(`${name}: ${result.particleField.error}`);
      if (!result.particleField?.error) {
        if (!result.particleField?.mounted) failures.push(`${name}: particle field canvas is not mounted`);
        if (!result.particleField?.active) failures.push(`${name}: particle field lifecycle is not active`);
        if ((result.particleField?.particleCount || 0) < 1) failures.push(`${name}: particle field did not seed particles`);
        if ((result.particleField?.cssWidth || 0) < 1 || (result.particleField?.cssHeight || 0) < 1) {
          failures.push(`${name}: particle field canvas has no display size`);
        }
        const expectedBackingWidth = Math.ceil(
          (result.particleField?.cssWidth || 0) * (result.particleField?.dpr || 1)
        );
        const expectedBackingHeight = Math.ceil(
          (result.particleField?.cssHeight || 0) * (result.particleField?.dpr || 1)
        );
        if (
          result.particleField?.backingWidth !== expectedBackingWidth
          || result.particleField?.backingHeight !== expectedBackingHeight
        ) {
          failures.push(`${name}: particle field backing store is out of sync`);
        }
      }
      if ((result.particleField?.opacity ?? 1) > 0.02 || result.particleField?.visible) {
        failures.push(`${name}: particle field should be dark while idle`);
      }
    }
    if ((summary.viewports.desktop.press?.delta ?? Infinity) > 2) failures.push('desktop: pointer-down center delta exceeded 2px');
    if (/view project/i.test(summary.viewports.desktop.cursor?.text || '')) failures.push('desktop: cursor still contains View Project');
    if (/abs-cursor-project-hover/.test(summary.viewports.desktop.cursor?.className || '')) failures.push('desktop: project-hover cursor class still active');
    if (summary.viewports.desktop.wheel?.before.activeIndex === summary.viewports.desktop.wheel?.after.activeIndex) failures.push('desktop: wheel did not advance');
    if ((summary.viewports.desktop.wheel?.dotDelta ?? 0) <= 0.5) failures.push('desktop: dot coordinates did not move');
    if (summary.viewports.desktop.wheel?.reversals.length) failures.push('desktop: wheel trace reversed after committed input');
    if ((summary.viewports.desktop.continuousWheel?.distance ?? 0) < 2) failures.push('desktop: continuous wheel did not advance multiple projects');
    if (summary.viewports.desktop.continuousWheel?.reversals.length) failures.push('desktop: continuous wheel trace reversed');
    const speedPerformance = summary.viewports.desktop.speedFieldPerformance;
    if (speedPerformance?.absoluteGateAvailable) {
      if ((speedPerformance?.fps ?? 0) < 58) failures.push('desktop: active speed field fell below 58 FPS');
      if ((speedPerformance?.p95Ms ?? Infinity) > 20) failures.push('desktop: active speed field p95 frame interval exceeded 20ms');
    } else {
      if (speedPerformance?.relativeFpsGateAvailable && (speedPerformance?.relativeFpsRatio ?? 0) < 0.85) failures.push('desktop: active speed field reduced FPS by more than 15% from the moving-carousel baseline');
      if ((speedPerformance?.relativeP95Ratio ?? Infinity) > 1.15) failures.push('desktop: active speed field worsened p95 frame time by more than 15% from the host baseline');
    }
    if (!speedPerformance?.fieldActivated) failures.push('desktop: persistent particle field was not visible during the performance burst');
    if (!speedPerformance?.hasParticleField) failures.push('desktop: persistent particle field did not contain particles');
    if (!speedPerformance?.particleCountStable) failures.push('desktop: particle field count changed during the performance burst');
    if (!speedPerformance?.cardCountStable) failures.push('desktop: permanent card count changed during the performance burst');
    if ((speedPerformance?.maxLead ?? Infinity) > 2.02) failures.push('desktop: performance burst exceeded the bounded target lead');
    if (speedPerformance?.after?.fieldRunning || speedPerformance?.after?.fieldVisible || (speedPerformance?.after?.fieldOpacity ?? 1) > 0.02) failures.push('desktop: persistent particle field stayed visible after settlement');
    if (speedPerformance?.after?.deckRafActive) failures.push('desktop: carousel RAF remained active after the performance burst settled');
    const rapidReversal = summary.viewports.desktop.rapidReversal;
    if (!(rapidReversal?.beforeVelocity > 0)) failures.push('desktop: reversal setup never reached forward carousel speed');
    if (!(rapidReversal?.beforeFieldVelocity > 0)) failures.push('desktop: reversal setup never reached forward field speed');
    if (rapidReversal?.reversalSample < 0 || rapidReversal?.reversalSample > 18) failures.push('desktop: carousel did not reverse promptly after opposite input');
    if (rapidReversal?.fieldReversalSample < 0 || rapidReversal?.fieldReversalSample > 24) failures.push('desktop: speed field did not reverse smoothly after opposite input');
    if ((rapidReversal?.maxLead ?? Infinity) > 2.02) failures.push('desktop: rapid reversal exceeded the bounded target lead');
    if (rapidReversal?.blankSamples?.length) failures.push('desktop: rapid reversal exposed a blank carousel frame');
    if (!rapidReversal?.after?.settled || rapidReversal?.after?.inputState !== 'idle') failures.push('desktop: rapid reversal did not return to a settled idle state');
    const stressGroups = [
      ['desktop', summary.viewports.desktop.infiniteStress],
      ['mobile', summary.viewports.mobile.infiniteStress],
      ['reduced motion', summary.reducedMotion?.infiniteStress],
    ];
    for (const [groupName, group] of stressGroups) {
      for (const [caseName, result] of Object.entries(group || {})) {
        const label = `${groupName} ${caseName}`;
        const projectCount = result.before?.projectCount || 0;
        const expectedDirection = result.direction || 0;
        if (Math.abs(result.totalTravel ?? 0) < projectCount * 10) failures.push(`${label}: sustained input did not exceed ten loops`);
        if (Math.sign(result.totalTravel || 0) !== expectedDirection) failures.push(`${label}: sustained travel moved in the wrong direction`);
        if (Math.abs(result.lateTravel ?? 0) < projectCount * 2) failures.push(`${label}: carousel stopped progressing during the final input quarter`);
        if ((result.maxAbsLead ?? Infinity) > (result.before?.maxLeadProjects || 0) + 0.02) failures.push(`${label}: target/display lead exceeded its bound`);
        if ((result.maxCoordinateMagnitude ?? Infinity) > projectCount + (result.before?.maxLeadProjects || 0) + 1) failures.push(`${label}: rebased coordinates escaped their bounded range`);
        if (result.cardCounts?.length !== 1 || result.cardCounts[0] !== result.before?.cardCount) failures.push(`${label}: permanent card count changed during sustained input`);
        if (result.focusableWhileMoving?.length) failures.push(`${label}: a card remained focusable while the deck was moving`);
        if (result.blankSamples?.length) failures.push(`${label}: carousel exposed a blank endpoint`);
        if (result.orderMismatches?.length) failures.push(`${label}: visible project order broke during rebasing`);
        if (!result.settledCoordinatesBounded) failures.push(`${label}: settled coordinates were not bounded`);
        if (!result.after?.settled || result.after?.inputState !== 'idle') {
          failures.push(`${label}: carousel did not return to an idle settled state`);
        }
        if (result.after?.activeIndex < 0 || result.after?.activeIndex >= (result.before?.projectCount || 0)) {
          failures.push(`${label}: carousel settled without a valid active project`);
        }
        if (groupName === 'reduced motion') {
          if (result.fieldActivated) failures.push(`${label}: particle field became visible under reduced motion`);
          if (result.after?.particleField?.running) failures.push(`${label}: particle field animated under reduced motion`);
        } else {
          if (!result.fieldActivated) failures.push(`${label}: sustained input did not reveal the particle field`);
          if (!result.fieldParticleCountStable || (result.fieldParticleCount || 0) < 1) failures.push(`${label}: particle field count was not fixed`);
          if ((result.after?.particleField?.opacity ?? 1) > 0.02 || result.after?.particleField?.visible) failures.push(`${label}: particle field stayed visible after settlement`);
        }
      }
    }
    if (summary.viewports.desktop.drag?.before.activeIndex === summary.viewports.desktop.drag?.after.activeIndex) failures.push('desktop: drag did not advance');
    if (summary.viewports.mobile.drag?.before.activeIndex === summary.viewports.mobile.drag?.after.activeIndex) failures.push('mobile: drag did not advance');
    if (summary.viewports.desktop.drag?.drawerOpen || summary.viewports.mobile.drag?.drawerOpen) failures.push('drag opened the project drawer');
    if ((summary.permanentRing?.instanceCount || 0) <= (summary.permanentRing?.projectCount || 0)) failures.push('permanent ring did not render repeated project-bound instances');
    if (summary.permanentRing?.duplicateInstanceKeys) failures.push('permanent ring contains duplicate instance keys');
    if (summary.permanentRing?.identityMutations?.length) failures.push('permanent ring changed project content on an existing card instance');
    if (summary.permanentRing?.abruptEntries?.length) failures.push('permanent ring produced an abrupt edge-opacity entry');
    if (summary.permanentRing?.mediaFailures?.length) failures.push('permanent ring exposed an undecoded thumbnail without fallback');
    if ((summary.permanentRing?.maxOpacityJump ?? Infinity) > 0.35) failures.push('permanent ring opacity changed too sharply between sampled frames');
    if (summary.permanentRing?.minEdgeOpacity == null) failures.push('permanent ring did not expose an edge-opacity sample');
    if ((summary.permanentRing?.minEdgeOpacity ?? 0) < 0.78) failures.push('permanent ring edge opacity fell below the 0.8 floor');
    if ((summary.permanentRing?.minEdgeOpacity ?? 1) > 0.9) failures.push('permanent ring edge opacity did not soften toward the 0.8 floor');
    for (const [theme, veil] of Object.entries(summary.veil || {})) {
      if (JSON.stringify(veil.rect) !== JSON.stringify(veil.overlayRect)) failures.push(`${theme}: portfolio veil does not match the inner-window rectangle`);
      if (!(veil.wallZ < veil.zIndex && veil.zIndex < veil.uiZ && veil.zIndex < veil.sheetZ)) failures.push(`${theme}: portfolio veil stacking order is incorrect`);
      if (veil.pointerEvents !== 'none') failures.push(`${theme}: portfolio veil intercepts pointer input`);
      if (veil.beforeContent !== 'none' || veil.beforeBackground !== 'none') failures.push(`${theme}: portfolio full-window edge gradient is still active`);
      if (veil.afterContent !== 'none' || veil.afterBackground !== 'none') failures.push(`${theme}: portfolio full-window dither is still active`);
      if (veil.wallInsetContent !== 'none' || veil.wallInsetShadow !== 'none') failures.push(`${theme}: portfolio wall inset shadow is still active`);
      if (!veil.wallRgb || !veil.opacity) failures.push(`${theme}: portfolio veil is not using shared wall tokens`);
    }
    const accentCount = summary.accents?.length || 0;
    const distinctAccentCount = new Set(summary.accents?.map((entry) => entry.accent)).size;
    if (!accentCount || distinctAccentCount !== accentCount) failures.push('accent audit did not resolve one distinct accent per project');
    if (!summary.drawer?.bodyOpen || !summary.drawer?.drawerVisible) failures.push('project drawer did not open after carousel checks');
    if ((summary.particleFieldRemount?.homeCanvasCount ?? Infinity) !== 0) failures.push('particle field canvas survived after leaving Portfolio');
    if (summary.particleFieldRemount?.returnCanvasCount !== 1) failures.push('particle field did not remount as exactly one canvas after returning to Portfolio');
    if (summary.particleFieldRemount?.particleField?.error) failures.push(`particle field remount: ${summary.particleFieldRemount.particleField.error}`);
    if (!summary.particleFieldRemount?.particleField?.active) failures.push('particle field lifecycle was inactive after returning to Portfolio');
    if ((summary.particleFieldRemount?.particleField?.particleCount || 0) < 1) failures.push('particle field did not reseed after returning to Portfolio');
    if ((summary.reducedMotion?.press?.delta ?? Infinity) > 2) failures.push('reduced motion: pointer-down center delta exceeded 2px');
    if (summary.reducedMotion?.particleField?.error) failures.push(`reduced motion: ${summary.reducedMotion.particleField.error}`);
    if (!summary.reducedMotion?.particleField?.active) failures.push('reduced motion: particle field lifecycle is not active');
    if (!summary.reducedMotion?.particleField?.reducedMotion) failures.push('reduced motion: particle field did not observe the motion preference');
    if ((summary.reducedMotion?.particleField?.particleCount || 0) < 1) failures.push('reduced motion: particle field did not retain its static particle composition');
    if (summary.reducedMotion?.wheel?.before.activeIndex === summary.reducedMotion?.wheel?.after.activeIndex) failures.push('reduced motion: wheel did not advance');
    if (!summary.reducedMotion?.drawerOpen) failures.push('reduced motion: project drawer did not open');
    if (pageErrors.length) failures.push(`${pageErrors.length} page error(s)`);

    summary.failures = failures;
    await fs.writeFile(path.join(ARTIFACT_ROOT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    if (failures.length) {
      console.error(JSON.stringify({ failures, artifactRoot: ARTIFACT_ROOT }, null, 2));
      process.exitCode = 1;
    } else {
      console.error(`PASS: portfolio carousel regression audit (${ARTIFACT_ROOT})`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
