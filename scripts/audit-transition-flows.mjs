/**
 * Deterministic transition audit:
 * - home → portfolio modal → portfolio route → home
 * - home → CV modal → CV route → home
 * - CV route → contact modal → CV route → home
 *
 * The audit samples route/modal landmarks repeatedly around each transition segment.
 * It fails when source and destination surfaces disappear at the same time for too
 * long without an overlay bridge and when destination surfaces do not appear in time.
 *
 * Run: npm run audit:transition-flows
 * Needs: preview or dev server. Set ABS_DEV_URL to origin (e.g. http://127.0.0.1:8013).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const BROWSER = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'transition-flow-audit', BROWSER);

const WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 25000);
const SAMPLE_INTERVAL_MS = Number(process.env.ABS_TRANSITION_SAMPLE_INTERVAL_MS || 16);
const LOOP_REPEAT = Math.max(1, Number(process.env.ABS_TRANSITION_LOOPS || 1));
const MAX_GAP_FRAMES = Number(process.env.ABS_TRANSITION_MAX_GAP_FRAMES || 2);
const BRIDGE_WITHIN_MS = Number(process.env.ABS_TRANSITION_BRIDGE_WITHIN_MS || 300);
const DESTINATION_WITHIN_MS = Number(process.env.ABS_TRANSITION_DESTINATION_WITHIN_MS || 1200);
const SAMPLE_MS = Number(
  process.env.ABS_TRANSITION_SAMPLE_MS
  || Math.max(1200, DESTINATION_WITHIN_MS + 200)
);
const MAX_SAMPLE_FAILURE_PCT = Number(process.env.ABS_TRANSITION_MAX_SAMPLE_FAILURE_PCT || 15);
const MAX_RAF_GAP_MS = Number(process.env.ABS_TRANSITION_MAX_RAF_GAP_MS || 300);
const MAX_RAF_GAP_COUNT = Number(process.env.ABS_TRANSITION_MAX_RAF_GAP_COUNT || 100);

function resolveBrowserEngine() {
  if (BROWSER === 'webkit' || BROWSER === 'safari') return webkit;
  return chromium;
}

function resolveHomeEntryUrl() {
  let raw = (process.env.ABS_DEV_URL || 'http://127.0.0.1:8013').trim().replace(/\/+$/, '');
  const pathPart = raw.split('?')[0].split('#')[0];
  if (!/\.html$/i.test(pathPart)) {
    raw = `${raw}/index.html`;
  }
  return raw;
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function waitForSimulationCanvasBuffer(page) {
  await page.waitForFunction(
    () => {
      const c = document.getElementById('c');
      if (!c) return false;
      const cssW = c.clientWidth || 0;
      const cssH = c.clientHeight || 0;
      if (cssW < 64 || cssH < 64) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const minW = Math.ceil((cssW + 2) * dpr) - 2;
      const minH = Math.ceil((cssH + 2) * dpr) - 2;
      return c.width >= minW && c.height >= minH;
    },
    { timeout: WAIT_MS, polling: 50 }
  );
}

async function waitForHomeSettled(page) {
  await page.waitForFunction(
    () => {
      const hero = document.getElementById('hero-title');
      const nav = document.getElementById('main-links');
      const footer = document.querySelector('footer.ui-bottom');
      const blur = document.getElementById('modal-blur-layer');
      const content = document.getElementById('modal-content-layer');
      return Boolean(
        hero &&
          nav &&
          footer &&
          !document.body.classList.contains('portfolio-page') &&
          !document.body.classList.contains('cv-page') &&
          document.documentElement.dataset.absRouteTransition !== 'active' &&
          document.documentElement.dataset.absGateTransition !== 'active' &&
          !blur?.classList.contains('active') &&
          !content?.classList.contains('active')
      );
    },
    { timeout: WAIT_MS, polling: 50 }
  );
  await waitForSimulationCanvasBuffer(page);
}

async function waitForRouteTransitionSettled(page) {
  await page.waitForFunction(
    () => {
      const blur = document.getElementById('modal-blur-layer');
      const content = document.getElementById('modal-content-layer');
      return (
        document.documentElement.dataset.absRouteTransition !== 'active'
        && document.documentElement.dataset.absGateTransition !== 'active'
        && !blur?.classList.contains('active')
        && !content?.classList.contains('active')
      );
    },
    { timeout: WAIT_MS, polling: 50 }
  );
}

async function waitForPortfolioSettled(page) {
  await page.waitForSelector('#portfolioProjectMount', { timeout: WAIT_MS });
  await page.waitForSelector('.ui-top-main.route-topbar', { timeout: WAIT_MS });
  await waitForSimulationCanvasBuffer(page);
  await waitForRouteTransitionSettled(page);
}

async function waitForCvSettled(page) {
  await page.waitForSelector('.cv-scroll-container', { timeout: WAIT_MS });
  await page.waitForSelector('.ui-top-main.route-topbar', { timeout: WAIT_MS });
  await waitForRouteTransitionSettled(page);
}

async function snapshotState(page) {
  try {
    return await page.evaluate(() => {
      const visible = (el) => {
        if (!el) return false;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          cs.display !== 'none' &&
          cs.visibility !== 'hidden' &&
          Number.parseFloat(cs.opacity || '1') > 0.02 &&
          rect.width > 0 &&
          rect.height > 0
        );
      };

      const qs = (selector) => document.querySelector(selector);
      const navLinks = Array.from(document.querySelectorAll('.ui-main-nav .footer_link'));
      const blurLayer = qs('#modal-blur-layer');
      const contentLayer = qs('#modal-content-layer');
      const portfolioModal = qs('#portfolio-modal');
      const cvModal = qs('#cv-modal');
      const contactModal = qs('#contact-modal');
      const wallSlot = qs('#shell-wall-slot');
      const routeTopbar = qs('.ui-top-main.route-topbar');

      const heroVisible = visible(qs('#hero-title'));
      const homeNavVisible = visible(qs('#main-links'));
      const topbarVisible = visible(routeTopbar);
      const footerVisible = visible(qs('footer.ui-bottom'));
      const edgeVisible = visible(qs('#edge-caption'));
      const cvVisible = visible(qs('.cv-scroll-container'));
      const portfolioMountVisible = visible(qs('#portfolioProjectMount'));
      const projectViewVisible = visible(qs('#portfolioProjectView'));

      return {
        path: window.location.pathname,
        bodyClass: document.body.className,
        htmlModalActive: document.documentElement.classList.contains('modal-active'),
        htmlModalReturning: document.documentElement.classList.contains('modal-returning'),
        routeTransition: document.documentElement.dataset.absRouteTransition || '',
        gateTransition: document.documentElement.dataset.absGateTransition || '',
        wallVisible: visible(wallSlot),
        heroVisible,
        homeNavVisible,
        topbarVisible,
        footerVisible,
        edgeVisible,
        cvVisible,
        portfolioMountVisible,
        projectViewVisible,
        blurLayerActive: Boolean(blurLayer?.classList.contains('active')),
        contentLayerActive: Boolean(contentLayer?.classList.contains('active')),
        portfolioModalVisible: visible(portfolioModal),
        cvModalVisible: visible(cvModal),
        contactModalVisible: visible(contactModal),
        visibleNavLinks: navLinks.filter((el) => visible(el)).length,
        homeGroupVisible: heroVisible || homeNavVisible,
        routeGroupVisible: topbarVisible || cvVisible || portfolioMountVisible || projectViewVisible,
        overlayGroupVisible:
          visible(blurLayer) ||
          visible(contentLayer) ||
          visible(portfolioModal) ||
          visible(cvModal) ||
          visible(contactModal),
      };
    });
  } catch (error) {
    return { error: String(error?.message || 'snapshot failed') };
  }
}

async function sampleFrames(page, label, durationMs = SAMPLE_MS) {
  const start = Date.now();
  const frames = [];
  const endAt = start + durationMs;
  const rafMetricsPromise = page
    .evaluate(
      ({ duration }) => new Promise((resolve) => {
        if (typeof window.requestAnimationFrame !== 'function') {
          resolve({ frames: 0, maxDeltaMs: 0, gapsOver50: 0 });
          return;
        }

        const startedAt = performance.now();
        let lastTs = startedAt;
        let framesSeen = 0;
        let maxDelta = 0;
        let gapsOver50 = 0;
        let settled = false;
        const resolveOnce = (value) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };
        const fallbackTimeout = window.setTimeout(() => {
          resolveOnce({
            frames: framesSeen,
            maxDeltaMs: Number(maxDelta.toFixed(2)),
            gapsOver50,
          });
        }, duration + 120);

        const tick = (ts) => {
          const delta = ts - lastTs;
          if (framesSeen > 0) {
            if (delta > maxDelta) maxDelta = delta;
            if (delta > 50) gapsOver50 += 1;
          }
          lastTs = ts;
          framesSeen += 1;
          if ((ts - startedAt) >= duration) {
            window.clearTimeout(fallbackTimeout);
            resolveOnce({
              frames: framesSeen,
              maxDeltaMs: Number(maxDelta.toFixed(2)),
              gapsOver50,
            });
            return;
          }
          window.requestAnimationFrame(tick);
        };

        window.requestAnimationFrame(tick);
      }),
      { duration: durationMs }
    )
    .catch(() => ({ frames: 0, maxDeltaMs: 0, gapsOver50: 0 }));

  while (Date.now() < endAt) {
    const t = Date.now() - start;
    const snapshot = await snapshotState(page);

    if (snapshot && snapshot.error) {
      frames.push({ t, error: true, reason: snapshot.error });
    } else if (snapshot) {
      frames.push({ ...snapshot, t });
    }

    const nextWait = Math.max(0, SAMPLE_INTERVAL_MS - (Date.now() - (start + t)));
    if (nextWait > 0) {
      await sleep(nextWait);
    }
  }

  const rafMetrics = await rafMetricsPromise;
  return { label, durationMs, frames, rafMetrics };
}

function firstVisibleTime(frames, predicate) {
  const hit = frames.find((frame) => !frame.error && predicate(frame));
  return hit ? hit.t : null;
}

function maxGapFrames(frames, predicate) {
  let current = 0;
  let max = 0;
  let startT = null;
  let maxStartT = null;
  let segmentSeen = false;

  for (const frame of frames) {
    if (frame.error) {
      if (current > max) {
        max = current;
        maxStartT = startT;
      }
      current = 0;
      startT = null;
      continue;
    }

    segmentSeen = true;
    if (predicate(frame)) {
      current += 1;
      if (startT === null) startT = frame.t;
      if (current > max) {
        max = current;
        maxStartT = startT;
      }
    } else {
      current = 0;
      startT = null;
    }
  }

  return {
    frames: segmentSeen ? max : 0,
    startT: maxStartT,
  };
}

function failureRate(frames) {
  if (frames.length === 0) return 100;
  const failed = frames.filter((frame) => frame.error).length;
  return (failed / frames.length) * 100;
}

function evaluateSample(sample, config) {
  const failures = [];
  const { frames } = sample;

  const add = (message) => failures.push({ label: sample.label, message });

  const failedFrames = failureRate(frames);
  if (failedFrames > MAX_SAMPLE_FAILURE_PCT) {
    add(`sample context unstable: ${failedFrames.toFixed(1)}% failed samples`);
  }

  if (sample.rafMetrics && MAX_RAF_GAP_MS > 0) {
    if (sample.rafMetrics.maxDeltaMs > MAX_RAF_GAP_MS) {
      add(`frame cadence degraded: max RAF delta ${sample.rafMetrics.maxDeltaMs}ms (limit ${MAX_RAF_GAP_MS}ms)`);
    }
    if (MAX_RAF_GAP_COUNT > 0 && sample.rafMetrics.gapsOver50 > MAX_RAF_GAP_COUNT) {
      add(`frame cadence degraded: ${sample.rafMetrics.gapsOver50} RAF gaps >50ms (limit ${MAX_RAF_GAP_COUNT})`);
    }
  }

  if (frames.filter((frame) => !frame.error).length === 0) {
    add('no stable snapshots collected');
    return failures;
  }

  const firstStable = frames.find((frame) => !frame.error);
  const lastStable = [...frames].reverse().find((frame) => !frame.error);

  if (!firstStable) {
    add('no stable snapshot found');
    return failures;
  }

  if (config.requireInitial && !firstStable[config.requireInitial]) {
    add(`initial ${config.requireInitial} not visible`);
  }

  if (config.requireDestination) {
    const destinationAt = firstVisibleTime(frames, config.requireDestination);
    if (destinationAt === null) {
      add('destination landmarks never became visible');
    }
  }

  if (config.mustDestinationWithinMs != null) {
    const destinationAt = firstVisibleTime(frames, config.destination);
    if (destinationAt === null || destinationAt > config.mustDestinationWithinMs) {
      add(`destination did not appear within ${config.mustDestinationWithinMs}ms`);
    }
  }

  if (config.mustBridgeWithinMs != null && config.bridge) {
    const bridgeAt = firstVisibleTime(frames, config.bridge);
    if (bridgeAt === null || bridgeAt > config.mustBridgeWithinMs) {
      add(`bridge did not appear within ${config.mustBridgeWithinMs}ms`);
    }
  }

  if (config.maxGapFrames != null && config.source && config.destination && config.bridge) {
    const gap = maxGapFrames(
      frames,
      (frame) => !config.source(frame) && !config.destination(frame) && !config.bridge(frame)
    );
    if (gap.frames > config.maxGapFrames) {
      add(`unbridged visibility gap lasted ${gap.frames} frames starting at ${gap.startT}ms`);
    }
  }

  if (config.requireRouteTransitionInactiveEnd) {
    if (lastStable.routeTransition === 'active') {
      add('route transition state remained active at sample end');
    }
  }

  if (config.requireGateTransitionInactiveEnd) {
    if (lastStable.gateTransition === 'active') {
      add('gate transition state remained active at sample end');
    }
  }

  return failures;
}

async function enterDigits(page, selector, code) {
  await page.evaluate(
    ({ selector: inputSelector, code: value }) => {
      const inputs = Array.from(document.querySelectorAll(inputSelector));
      value.split('').forEach((digit, index) => {
        const input = inputs[index];
        if (!input) return;
        input.focus();
        input.value = digit;
        input.dispatchEvent(new InputEvent('input', { bubbles: true, data: digit, inputType: 'insertText' }));
      });
    },
    { selector, code }
  );
}

function commonChecks(label, source, destination, bridge) {
  return {
    requireInitial: label,
    source,
    destination,
    bridge,
    maxGapFrames: MAX_GAP_FRAMES,
    mustBridgeWithinMs: BRIDGE_WITHIN_MS,
    mustDestinationWithinMs: DESTINATION_WITHIN_MS,
  };
}

async function runHomePortfolioRound(index, page) {
  const report = [];
  await waitForHomeSettled(page);

  let sample = sampleFrames(page, `home-${index}-portfolio-modal-open`);
  await page.click('#portfolio-modal-trigger', { timeout: 10_000 });
  await page.waitForSelector('#portfolio-modal.active', { timeout: 10_000 });
  sample = await sample;
  report.push(sample);

  sample = sampleFrames(page, `home-${index}-portfolio-route`);
  const portfolioNav = page.waitForURL(/portfolio/i, { timeout: WAIT_MS });
  await enterDigits(page, '.portfolio-digit', '1234');
  await portfolioNav;
  await waitForPortfolioSettled(page);
  sample = await sample;
  report.push(sample);

  sample = sampleFrames(page, `home-${index}-portfolio-route-to-home`);
  const homeNavFromPortfolio = page.waitForURL(/index|\/$/i, { timeout: WAIT_MS });
  await page.click('.ui-top .gate-back', { timeout: 10_000 });
  await homeNavFromPortfolio;
  await waitForHomeSettled(page);
  sample = await sample;
  report.push(sample);

  return report;
}

async function runHomeCvRound(index, page) {
  const report = [];
  await waitForHomeSettled(page);

  let sample = sampleFrames(page, `home-${index}-cv-modal-open`);
  await page.click('#cv-modal-trigger', { timeout: 10_000 });
  await page.waitForSelector('#cv-modal.active', { timeout: 10_000 });
  sample = await sample;
  report.push(sample);

  sample = sampleFrames(page, `home-${index}-cv-route`);
  const cvNav = page.waitForURL(/cv/i, { timeout: WAIT_MS });
  await enterDigits(page, '.cv-digit', '1111');
  await cvNav;
  await waitForCvSettled(page);
  sample = await sample;
  report.push(sample);

  sample = sampleFrames(page, `home-${index}-cv-route-to-home`);
  const homeNavFromCv = page.waitForURL(/index|\/$/i, { timeout: WAIT_MS });
  await page.click('.ui-top .gate-back', { timeout: 10_000 });
  await homeNavFromCv;
  await waitForHomeSettled(page);
  sample = await sample;
  report.push(sample);

  return report;
}

async function runCvContactRound(index, page) {
  const report = [];

  await page.click('#cv-modal-trigger', { timeout: 10_000 });
  await page.waitForSelector('#cv-modal.active', { timeout: 10_000 });
  const cvNav = page.waitForURL(/cv/i, { timeout: WAIT_MS });
  await enterDigits(page, '.cv-digit', '1111');
  await cvNav;
  await waitForCvSettled(page);

  let sample = sampleFrames(page, `cv-${index}-contact-open`);
  await page.click('#contact-email', { timeout: 10_000 });
  await page.waitForSelector('#contact-modal.active', { timeout: 10_000 });
  sample = await sample;
  report.push(sample);

  sample = sampleFrames(page, `cv-${index}-contact-close`);
  await page.click('#contact-modal [data-modal-back]', { timeout: 10_000 });
  await page.waitForFunction(
    () => {
      const modal = document.getElementById('contact-modal');
      return modal && !modal.classList.contains('active') && modal.classList.contains('hidden');
    },
    { timeout: WAIT_MS, polling: 50 }
  );
  await waitForCvSettled(page);
  sample = await sample;
  report.push(sample);

  sample = sampleFrames(page, `cv-${index}-contact-route-to-home`);
  const homeNavFromContact = page.waitForURL(/index|\/$/i, { timeout: WAIT_MS });
  await page.click('.ui-top .gate-back', { timeout: 10_000 });
  await homeNavFromContact;
  await waitForHomeSettled(page);
  sample = await sample;
  report.push(sample);

  return report;
}

function collectFailures(steps) {
  const failures = [];
  const push = (step, config) => {
    failures.push(...evaluateSample(step, config));
  };

  for (const step of steps) {
    const { label } = step;
    if (label.includes('portfolio-modal-open')) {
      push(step, {
        ...commonChecks('homeGroupVisible', (frame) => frame.homeGroupVisible, (frame) => frame.portfolioModalVisible, (frame) => frame.overlayGroupVisible),
        requireInitial: 'homeGroupVisible',
      });
      push(step, { requireDestination: (frame) => frame.portfolioModalVisible });
    } else if (label.includes('portfolio-route-to-home')) {
      push(step, {
        ...commonChecks('routeGroupVisible', (frame) => frame.routeGroupVisible, (frame) => frame.homeGroupVisible, () => false),
        requireInitial: 'routeGroupVisible',
        requireDestination: (frame) => frame.homeGroupVisible,
        mustBridgeWithinMs: null,
        bridge: () => false,
      });
    } else if (label.includes('portfolio-route')) {
      push(step, {
        ...commonChecks('portfolioModalVisible', (frame) => frame.portfolioModalVisible, (frame) => frame.routeGroupVisible, (frame) => frame.overlayGroupVisible),
        requireInitial: 'portfolioModalVisible',
      });
    } else if (label.includes('cv-modal-open')) {
      push(step, {
        ...commonChecks('homeGroupVisible', (frame) => frame.homeGroupVisible, (frame) => frame.cvModalVisible, (frame) => frame.overlayGroupVisible),
        requireInitial: 'homeGroupVisible',
      });
      push(step, { requireDestination: (frame) => frame.cvModalVisible });
    } else if (label.includes('cv-route-to-home')) {
      push(step, {
        ...commonChecks('routeGroupVisible', (frame) => frame.routeGroupVisible, (frame) => frame.homeGroupVisible, () => false),
        requireInitial: 'routeGroupVisible',
        requireDestination: (frame) => frame.homeGroupVisible,
        mustBridgeWithinMs: null,
        bridge: () => false,
      });
    } else if (label.includes('cv-route')) {
      push(step, {
        ...commonChecks('cvModalVisible', (frame) => frame.cvModalVisible, (frame) => frame.routeGroupVisible, (frame) => frame.overlayGroupVisible),
        requireInitial: 'cvModalVisible',
      });
    } else if (label.includes('contact-open')) {
      push(step, {
        ...commonChecks('routeGroupVisible', (frame) => frame.routeGroupVisible, (frame) => frame.contactModalVisible, (frame) => frame.overlayGroupVisible),
        requireInitial: 'routeGroupVisible',
      });
    } else if (label.includes('contact-close')) {
      push(step, {
        ...commonChecks('contactModalVisible', (frame) => frame.contactModalVisible, (frame) => frame.routeGroupVisible, (frame) => frame.overlayGroupVisible),
        requireInitial: 'contactModalVisible',
      });
    } else if (label.includes('contact-route-to-home')) {
      push(step, {
        ...commonChecks('routeGroupVisible', (frame) => frame.routeGroupVisible, (frame) => frame.homeGroupVisible, () => false),
        requireInitial: 'routeGroupVisible',
        requireDestination: (frame) => frame.homeGroupVisible,
        mustBridgeWithinMs: null,
        bridge: () => false,
      });
    } else {
      push(step, {
        requireInitial: 'routeGroupVisible',
        source: (frame) => frame.routeGroupVisible,
        destination: (frame) => frame.homeGroupVisible,
        bridge: () => false,
        maxGapFrames: MAX_GAP_FRAMES,
        mustDestinationWithinMs: DESTINATION_WITHIN_MS,
      });
    }

  }

  return failures;
}

async function runFlowInFreshPage(browser, name, runner) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(resolveHomeEntryUrl(), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#c', { timeout: 30_000 });
  await waitForHomeSettled(page);

  const steps = await runner(page);
  const failures = collectFailures(steps);

  await context.close();
  return {
    name,
    steps,
    failures,
    ok: failures.length === 0,
  };
}

async function runAllFlows(browser) {
  const allFlows = [];

  for (let i = 0; i < LOOP_REPEAT; i += 1) {
    allFlows.push(
      await runFlowInFreshPage(
        browser,
        `home-portfolio-route-home#${i + 1}`,
        (page) => runHomePortfolioRound(i + 1, page),
      )
    );

    allFlows.push(
      await runFlowInFreshPage(
        browser,
        `home-cv-route-home#${i + 1}`,
        (page) => runHomeCvRound(i + 1, page),
      )
    );

    allFlows.push(
      await runFlowInFreshPage(
        browser,
        `cv-contact-home#${i + 1}`,
        (page) => runCvContactRound(i + 1, page),
      )
    );
  }

  return allFlows;
}

async function main() {
  await mkdir(outputRoot, { recursive: true });

  const browser = await resolveBrowserEngine().launch();
  const flows = await runAllFlows(browser);

  const failedFlows = flows.filter((flow) => flow.failures.length > 0);
  const report = {
    baseUrl: resolveHomeEntryUrl(),
    browser: BROWSER,
    repeats: LOOP_REPEAT,
    sampleMs: SAMPLE_MS,
    sampleIntervalMs: SAMPLE_INTERVAL_MS,
    ok: failedFlows.length === 0,
    flows,
  };

  await writeFile(resolve(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const summaryLines = [
    `baseUrl: ${report.baseUrl}`,
    `sampleMs: ${report.sampleMs}`,
    `sampleIntervalMs: ${report.sampleIntervalMs}`,
    `loops: ${LOOP_REPEAT}`,
    '',
    ...flows.flatMap((flow) => {
      const header = `${flow.ok ? 'PASS' : 'FAIL'} ${flow.name}`;
      if (flow.failures.length === 0) return [header];
      return [header, ...flow.failures.map((failure) => `  - ${failure.label}: ${failure.message}`)];
    }),
    '',
  ];

  await writeFile(resolve(outputRoot, 'summary.txt'), summaryLines.join('\n'), 'utf8');
  console.log(summaryLines.join('\n'));

  if (failedFlows.length > 0) {
    process.exitCode = 1;
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
