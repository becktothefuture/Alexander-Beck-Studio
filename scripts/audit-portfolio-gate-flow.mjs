/**
 * End-to-end check: home → portfolio invite modal (1234) → portfolio pit.
 * Asserts HiDPI canvas backing store and visible DOM labels (regression guard for SPA gate path).
 *
 * Run: npm run audit:portfolio-gate
 * Needs: dev or preview server. Set ABS_DEV_URL to origin (e.g. http://127.0.0.1:8013) or full index URL.
 */
import { chromium } from 'playwright';

const BUFFER_WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 25000);

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

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(resolveHomeEntryUrl(), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#c', { timeout: 30000 });
  await waitForSimulationCanvasBuffer(page);

  await page.click('#portfolio-modal-trigger', { timeout: 10000 });
  await page.waitForSelector('#portfolio-modal.active', { timeout: 10000 });

  const digits = page.locator('.portfolio-digit');
  const count = await digits.count();
  if (count < 4) {
    console.error('FAIL: expected 4 .portfolio-digit inputs');
    process.exitCode = 1;
    await browser.close();
    return;
  }

  // Invite code is 1234 (portfolio-modal.js). Start URL wait before input so SPA navigation isn't missed.
  const portfolioNav = page.waitForURL(/portfolio/i, { timeout: BUFFER_WAIT_MS });
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('.portfolio-digit'));
    const code = '1234';
    for (let i = 0; i < Math.min(code.length, inputs.length); i += 1) {
      const el = inputs[i];
      el.focus();
      el.value = code[i];
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: code[i], inputType: 'insertText' }));
    }
  });
  await portfolioNav;
  await page.waitForFunction(
    () => document.getElementById('portfolioProjectMount'),
    { timeout: BUFFER_WAIT_MS }
  );
  await waitForSimulationCanvasBuffer(page);

  await page.waitForFunction(
    () => document.querySelectorAll('.portfolio-project-label').length > 0,
    { timeout: BUFFER_WAIT_MS }
  );
  await page.waitForFunction(
    () => {
      const roots = Array.from(document.querySelectorAll('.portfolio-project-label__text'));
      return roots.some((r) => (r.textContent || '').trim().length > 0);
    },
    { timeout: BUFFER_WAIT_MS }
  );

  const labelCheck = await page.evaluate(() => {
    const texts = Array.from(
      document.querySelectorAll('.portfolio-project-label__text')
    );
    const nonEmpty = texts.filter((el) => (el.textContent || '').trim().length > 0);
    return { total: texts.length, nonEmpty: nonEmpty.length };
  });

  const snap = await page.evaluate(() => {
    const c = document.getElementById('c');
    return {
      path: location.pathname,
      canvasWidth: c?.width,
      canvasHeight: c?.height,
      clientWidth: c?.clientWidth,
      clientHeight: c?.clientHeight,
      dpr: window.devicePixelRatio || 1,
    };
  });

  console.log(JSON.stringify({ snap, labelCheck }, null, 2));

  if (!labelCheck.nonEmpty) {
    console.error('FAIL: no non-empty .portfolio-project-label__text after gate navigation');
    process.exitCode = 1;
  } else {
    console.error(`PASS: canvas buffer OK, ${labelCheck.nonEmpty} label(s) with text`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
