/**
 * Deterministic assertion (no fixed sleeps): the active simulation canvas
 * backing store must match layout×DPR after each SPA hop. Fails fast if bitmap
 * stays at default size on remount.
 *
 * Run: npm run audit:canvas-spa
 * Needs: Vite dev on 8012, or ABS_DEV_URL=http://host:port
 * Defaults to ?mode=pit because this audit verifies the legacy #c canvas
 * remount/buffer contract, not today's potentially route-backed simulation.
 */
import { chromium } from 'playwright';

const BUFFER_WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 30000);
const SIMULATION_CANVAS_SELECTOR = [
  '#c',
  '#flock-of-birds-canvas',
  '#mineral-growth-canvas',
  '#repel-room-canvas',
  '#wall-repel-canvas',
  '.beach-ball-room-canvas',
  '.napoleon-point-cloud__canvas',
  'canvas.concept-simulation-canvas',
].join(', ');

function resolveHomeEntryUrl() {
  let raw = (process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').trim().replace(/\/+$/, '');
  const url = new URL(raw);
  if (!/\.html$/i.test(url.pathname)) {
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/index.html`.replace(/\/{2,}/g, '/');
  }
  if (
    !url.searchParams.has('mode')
    && !url.searchParams.has('focus')
    && !url.searchParams.has('simulation')
  ) {
    url.searchParams.set('mode', 'pit');
  }
  url.searchParams.set('absAudit', '1');
  return url.toString();
}
const quiet = process.env.ABS_AUDIT_QUIET === '1' || process.env.ABS_AUDIT_QUIET === 'true';

async function waitForSimulationCanvasBuffer(page) {
  await page.waitForFunction(
    (selector) => {
      const c = Array.from(document.querySelectorAll(selector)).find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width >= 64 && rect.height >= 64;
      });
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

async function snapshot(page, label) {
  return page.evaluate(({ label: L, selector }) => {
    const c = Array.from(document.querySelectorAll(selector)).find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return rect.width >= 64 && rect.height >= 64;
    });
    if (!c) return { label: L, error: `no simulation canvas (${selector})` };
    const st = getComputedStyle(c);
    return {
      label: L,
      path: location.pathname,
      canvasId: c.id,
      canvasWidth: c.width,
      canvasHeight: c.height,
      clientWidth: c.clientWidth,
      clientHeight: c.clientHeight,
      styleW: parseFloat(st.width) || 0,
      styleH: parseFloat(st.height) || 0,
      dpr: window.devicePixelRatio || 1,
    };
  }, { label, selector: SIMULATION_CANVAS_SELECTOR });
}

async function readCanvasDigest(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('c');
    if (!canvas) return 0;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let digest = 2166136261;
    const stepX = Math.max(1, Math.floor(canvas.width / 32));
    const stepY = Math.max(1, Math.floor(canvas.height / 20));
    for (let y = 0; y < canvas.height; y += stepY) {
      for (let x = 0; x < canvas.width; x += stepX) {
        const offset = ((y * canvas.width) + x) * 4;
        digest ^= pixels[offset] + (pixels[offset + 1] << 8) + (pixels[offset + 2] << 16) + pixels[offset + 3];
        digest = Math.imul(digest, 16777619);
      }
    }
    return digest >>> 0;
  });
}

async function waitForCanvasDigestChange(page, initialDigest, timeoutMs = BUFFER_WAIT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await readCanvasDigest(page)) !== initialDigest) return;
    await page.waitForTimeout(50);
  }
  throw new Error('home canvas digest did not change after stale Portfolio bootstrap settled');
}

async function runCancelledPortfolioBootstrapProbe(page) {
  await page.evaluate(() => {
    sessionStorage.setItem('abs_portfolio_ok', String(Date.now()));
    window.__ABS_CANCELLED_PRELOAD_REQUESTED__ = false;
    window.__ABS_RELEASE_CANCELLED_PRELOAD__ = null;
    window.__ABS_SPA_NAVIGATE__('/portfolio.html', {
      preloadRouteModule: () => {
        window.__ABS_CANCELLED_PRELOAD_REQUESTED__ = true;
        return new Promise((resolve) => {
          window.__ABS_RELEASE_CANCELLED_PRELOAD__ = resolve;
        });
      },
    });
  });
  await page.waitForFunction(
    () => window.__ABS_CANCELLED_PRELOAD_REQUESTED__ === true,
    null,
    { timeout: BUFFER_WAIT_MS, polling: 'raf' },
  );
  const preCommitPath = new URL(page.url()).pathname;
  if (preCommitPath !== '/' && !/index/i.test(preCommitPath)) {
    throw new Error(`portfolio preload committed history before it settled: ${preCommitPath}`);
  }

  await page.evaluate(() => {
    window.__ABS_SPA_NAVIGATE__('/index.html', {});
  });
  await page.waitForURL((url) => url.pathname === '/' || /index/i.test(url.pathname), {
    timeout: BUFFER_WAIT_MS,
  });
  await page.evaluate(() => {
    window.__ABS_RELEASE_CANCELLED_PRELOAD__?.();
    delete window.__ABS_CANCELLED_PRELOAD_REQUESTED__;
    delete window.__ABS_RELEASE_CANCELLED_PRELOAD__;
  });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));

  try {
    await page.waitForFunction(() => {
    const root = document.documentElement;
    const title = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.();
    return (
      root.dataset.absRuntimeRoute === 'home'
      && root.dataset.absRuntimeStatus === 'ready'
      && root.dataset.absHomeRouteReady === 'true'
      && root.dataset.absHomeCanvasTitleReady === 'true'
      && root.dataset.absTransitionPhase === 'idle'
      && !root.classList.contains('portfolio-booting')
      && !root.classList.contains('portfolio-loaded')
      && !document.body.classList.contains('portfolio-page')
      && !document.body.dataset.portfolioLoadState
      && title?.canvasTitleVisible === true
      && title?.canvasTitleLineCount >= 3
      && title?.ballCount > 0
    );
    }, null, { timeout: BUFFER_WAIT_MS });
  } catch (error) {
    const state = await page.evaluate(() => ({
      path: location.pathname,
      htmlClass: document.documentElement.className,
      bodyClass: document.body.className,
      rootData: { ...document.documentElement.dataset },
      bodyData: { ...document.body.dataset },
      runtime: window.__ABS_RUNTIME_LIFECYCLE__ || null,
      home: window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.() || null,
    }));
    console.error('Cancelled bootstrap probe state:', JSON.stringify(state, null, 2));
    throw error;
  }

  const firstDigest = await readCanvasDigest(page);
  await waitForCanvasDigestChange(page, firstDigest);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(resolveHomeEntryUrl(), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector(SIMULATION_CANVAS_SELECTOR, { state: 'attached', timeout: 30000 });
  await waitForSimulationCanvasBuffer(page);

  await runCancelledPortfolioBootstrapProbe(page);
  await waitForSimulationCanvasBuffer(page);

  const rows = [];
  const rounds = Number(process.env.ABS_SPA_ROUNDS || 8);

  for (let round = 0; round <= rounds; round++) {
    rows.push({
      ...(await snapshot(page, round === 0 ? 'home-initial' : `home-after-${round}`)),
    });
    if (round === rounds) break;

    await page.evaluate(() => {
      sessionStorage.setItem('abs_portfolio_ok', String(Date.now()));
    });
    const spaOk = await page.evaluate(() => {
      const fn = window.__ABS_SPA_NAVIGATE__;
      if (typeof fn !== 'function') return false;
      fn('/portfolio.html', {});
      return true;
    });
    if (!spaOk) {
      console.error('FAIL: window.__ABS_SPA_NAVIGATE__ missing (not SPA build?)');
      process.exitCode = 1;
      await browser.close();
      return;
    }
    await page.waitForFunction(
      () => /portfolio/i.test(window.location.pathname),
      null,
      { timeout: BUFFER_WAIT_MS },
    );
    await page.waitForSelector(SIMULATION_CANVAS_SELECTOR, { state: 'attached', timeout: BUFFER_WAIT_MS });
    await waitForSimulationCanvasBuffer(page);
    rows.push({ ...(await snapshot(page, `portfolio-r${round}`)) });

    await page.evaluate(() => {
      window.__ABS_SPA_NAVIGATE__('/index.html', {});
    });
    try {
      await page.waitForFunction(
        () => {
          const path = window.location.pathname || '';
          return path === '/' || /index/i.test(path) || path.startsWith('/lab/');
        },
        null,
        { timeout: BUFFER_WAIT_MS },
      );
    } catch (error) {
      const state = await page.evaluate(() => ({
        path: window.location.pathname,
        phase: document.documentElement.dataset.absTransitionPhase || 'idle',
        renderedRoute: document.querySelector('[data-shell-route-view]')?.dataset.shellRouteView || '',
        currentRoute: document.querySelector('[data-route-tab][aria-current="page"]')?.dataset.routeTab || '',
        pendingRoute: document.querySelector('[data-route-tabs]')?.dataset.pendingRoute || '',
        history: window.__ABS_ROUTE_HISTORY__ || null,
        runtime: window.__ABS_RUNTIME_LIFECYCLE__ || null,
      }));
      console.error(`Home return probe failed in round ${round + 1}:`, JSON.stringify(state, null, 2));
      throw error;
    }
    await page.waitForSelector(SIMULATION_CANVAS_SELECTOR, { state: 'attached', timeout: BUFFER_WAIT_MS });
    await waitForSimulationCanvasBuffer(page);
  }

  const bad = rows.filter((r) => {
    if (r.error) return true;
    const cssW = r.styleW || r.clientWidth;
    const cssH = r.styleH || r.clientHeight;
    const dpr = Math.min(r.dpr || 1, 2);
    const minW = Math.ceil((cssW + 2) * dpr) - 2;
    const minH = Math.ceil((cssH + 2) * dpr) - 2;
    return !(r.canvasWidth >= minW && r.canvasHeight >= minH);
  });

  if (!quiet || bad.length) {
    console.log(JSON.stringify(rows, null, 2));
  }

  if (bad.length) {
    console.error(`\nFAIL: ${bad.length} snapshot(s) failed buffer check`);
    process.exitCode = 1;
  } else if (quiet) {
    console.error(`PASS canvas-spa: ${rows.length} snapshots, ${rounds} round-trips`);
  } else {
    console.error(`\nPASS: ${rows.length} snapshots, buffer OK (${rounds} round-trips)`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
