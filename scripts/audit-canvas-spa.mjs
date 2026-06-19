/**
 * Deterministic assertion (no fixed sleeps): the active simulation canvas
 * backing store must match layout×DPR after each SPA hop. Fails fast if bitmap
 * stays at default size on remount.
 *
 * Run: npm run audit:canvas-spa
 * Needs: Vite dev on 8012, or ABS_DEV_URL=http://host:port
 */
import { chromium } from 'playwright';

const BUFFER_WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 20000);
const SIMULATION_CANVAS_SELECTOR = '#c, #flock-of-birds-canvas, #wall-repel-canvas';

function resolveHomeEntryUrl() {
  let raw = (process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').trim().replace(/\/+$/, '');
  const pathPart = raw.split('?')[0].split('#')[0];
  if (!/\.html$/i.test(pathPart)) {
    raw = `${raw}/index.html`;
  }
  return raw;
}
const quiet = process.env.ABS_AUDIT_QUIET === '1' || process.env.ABS_AUDIT_QUIET === 'true';

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

async function snapshot(page, label) {
  return page.evaluate(({ label: L, selector }) => {
    const c = document.querySelector(selector);
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

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(resolveHomeEntryUrl(), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector(SIMULATION_CANVAS_SELECTOR, { timeout: 30000 });
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
    await page.waitForURL(/portfolio/i, { timeout: BUFFER_WAIT_MS });
    await page.waitForSelector(SIMULATION_CANVAS_SELECTOR, { timeout: BUFFER_WAIT_MS });
    await waitForSimulationCanvasBuffer(page);
    rows.push({ ...(await snapshot(page, `portfolio-r${round}`)) });

    await page.evaluate(() => {
      window.__ABS_SPA_NAVIGATE__('/index.html', {});
    });
    await page.waitForURL((url) => {
      const path = url.pathname || '';
      return path === '/' || /index/i.test(path) || path.startsWith('/lab/');
    }, { timeout: BUFFER_WAIT_MS });
    await page.waitForSelector(SIMULATION_CANVAS_SELECTOR, { timeout: BUFFER_WAIT_MS });
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
