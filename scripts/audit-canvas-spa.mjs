/**
 * Deterministic assertion (no fixed sleeps): `#c` backing store must match layout×DPR
 * after each SPA hop. Fails fast if bitmap stays at default size on remount.
 *
 * Run: npm run audit:canvas-spa
 * Needs: Vite dev on 8012, or ABS_DEV_URL=http://host:port
 */
import { chromium } from 'playwright';

const BUFFER_WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 20000);

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
    { timeout: BUFFER_WAIT_MS }
  );
}

async function snapshot(page, label) {
  return page.evaluate(({ label: L }) => {
    const c = document.getElementById('c');
    if (!c) return { label: L, error: 'no #c' };
    const st = getComputedStyle(c);
    return {
      label: L,
      path: location.pathname,
      canvasWidth: c.width,
      canvasHeight: c.height,
      clientWidth: c.clientWidth,
      clientHeight: c.clientHeight,
      styleW: parseFloat(st.width) || 0,
      styleH: parseFloat(st.height) || 0,
      dpr: window.devicePixelRatio || 1,
    };
  }, { label });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(resolveHomeEntryUrl(), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#c', { timeout: 30000 });
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
      () => /portfolio/i.test(window.location.pathname || ''),
      { timeout: BUFFER_WAIT_MS }
    );
    await page.waitForSelector('#c', { timeout: BUFFER_WAIT_MS });
    await waitForSimulationCanvasBuffer(page);
    rows.push({ ...(await snapshot(page, `portfolio-r${round}`)) });

    await page.evaluate(() => {
      window.__ABS_SPA_NAVIGATE__('/index.html', {});
    });
    await page.waitForFunction(
      () => {
        const p = window.location.pathname || '';
        return p === '/' || /index/i.test(p);
      },
      { timeout: BUFFER_WAIT_MS }
    );
    await page.waitForSelector('#c', { timeout: BUFFER_WAIT_MS });
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
