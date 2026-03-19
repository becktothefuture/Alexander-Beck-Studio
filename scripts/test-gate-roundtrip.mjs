import { chromium } from 'playwright';

const WAIT = 25000;
const CYCLES = Number(process.env.ABS_GATE_CYCLES || 3);

async function waitForSimCanvasBuffer(page) {
  await page.waitForFunction(() => {
    const c = document.getElementById('c');
    if (!c) return false;
    const w = c.clientWidth, h = c.clientHeight;
    if (w < 64 || h < 64) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return c.width >= Math.ceil((w + 2) * dpr) - 2 && c.height >= Math.ceil((h + 2) * dpr) - 2;
  }, { timeout: WAIT });
}

async function enterGateCode(page) {
  await page.click('#portfolio-modal-trigger', { timeout: 10000 });
  await page.waitForSelector('#portfolio-modal.active', { timeout: 10000 });
  const portfolioNav = page.waitForURL(/portfolio/i, { timeout: WAIT });
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('.portfolio-digit'));
    '1234'.split('').forEach((d, i) => {
      inputs[i].focus();
      inputs[i].value = d;
      inputs[i].dispatchEvent(new InputEvent('input', { bubbles: true, data: d, inputType: 'insertText' }));
    });
  });
  await portfolioNav;
}

async function verifyPortfolio(page, label) {
  await page.waitForFunction(() => document.getElementById('portfolioProjectMount'), { timeout: WAIT });
  await waitForSimCanvasBuffer(page);
  await page.waitForFunction(() => {
    const labels = document.querySelectorAll('.portfolio-project-label__text');
    return Array.from(labels).some(l => (l.textContent || '').trim().length > 0);
  }, { timeout: WAIT });
  const result = await page.evaluate(() => {
    const c = document.getElementById('c');
    const labels = document.querySelectorAll('.portfolio-project-label__text');
    const nonEmpty = Array.from(labels).filter(l => (l.textContent || '').trim().length > 0);
    return { canvasW: c?.width, canvasH: c?.height, labels: nonEmpty.length };
  });
  const ok = result.canvasW > 300 && result.canvasH > 150 && result.labels > 0;
  console.log(`  ${ok ? 'PASS' : 'FAIL'} [${label}] canvas=${result.canvasW}x${result.canvasH} labels=${result.labels}`);
  return ok;
}

async function goHome(page) {
  await page.evaluate(() => window.__ABS_SPA_NAVIGATE__('/index.html', {}));
  await page.waitForFunction(() => {
    const p = window.location.pathname || '';
    return p === '/' || /index/i.test(p);
  }, { timeout: WAIT });
  await page.waitForSelector('#c', { timeout: WAIT });
  await waitForSimCanvasBuffer(page);
  await page.evaluate(() => sessionStorage.removeItem('abs_portfolio_ok'));
  await page.waitForTimeout(2500);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const url = (process.env.ABS_DEV_URL || 'http://127.0.0.1:8013').replace(/\/+$/, '') + '/index.html';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#c', { timeout: 30000 });
  await waitForSimCanvasBuffer(page);

  let allPassed = true;
  for (let cycle = 1; cycle <= CYCLES; cycle++) {
    console.log(`Cycle ${cycle}/${CYCLES}: Home → Gate → Portfolio`);
    await enterGateCode(page);
    if (!(await verifyPortfolio(page, `cycle-${cycle}`))) allPassed = false;
    if (cycle < CYCLES) {
      console.log(`Cycle ${cycle}/${CYCLES}: Portfolio → Home`);
      await goHome(page);
    }
  }
  console.log(allPassed ? `\nPASS: ${CYCLES} gate roundtrips OK` : '\nFAIL');
  process.exitCode = allPassed ? 0 : 1;
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
