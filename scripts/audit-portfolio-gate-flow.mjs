/**
 * End-to-end check: home → portfolio invite modal (1234) → portfolio pit.
 * Asserts HiDPI canvas backing store, visible DOM labels, and dense-frame transition integrity
 * for the gated home → portfolio SPA path.
 *
 * Run: npm run audit:portfolio-gate
 * Needs: dev or preview server. Set ABS_DEV_URL to origin (e.g. http://127.0.0.1:8013) or full index URL.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BUFFER_WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 25000);
const FRAME_SAMPLE_MS = Number(process.env.ABS_PORTFOLIO_GATE_SAMPLE_MS || 20);
const FRAME_DURATION_MS = Number(process.env.ABS_PORTFOLIO_GATE_DURATION_MS || 1400);
const HERO_SNAP_THRESHOLD_PX = Number(process.env.ABS_PORTFOLIO_GATE_HERO_SNAP_PX || 6);
const __dirname = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(__dirname, '..', 'output', 'playwright', 'portfolio-gate-audit');

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

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function readDenseGateFrame(page) {
  return page.evaluate(() => {
    const opacityOf = (el) => {
      if (!el) return 0;
      const value = Number.parseFloat(getComputedStyle(el).opacity || '0');
      return Number.isFinite(value) ? value : 0;
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
        && Number.parseFloat(styles.opacity || '0') > 0.02
        && rect.width > 0
        && rect.height > 0
      );
    };
    const isReadable = (el) => isVisible(el) && opacityOf(el) >= 0.35;

    const wall = document.getElementById('simulations');
    const hero = document.getElementById('hero-title');
    const topbar = document.querySelector('.ui-top-main.route-topbar');
    const footer = document.querySelector('footer.ui-bottom');
    const label = document.querySelector('.portfolio-project-label');
    const wallRect = rectOf(wall);
    const heroRect = rectOf(hero);
    const topbarRect = rectOf(topbar);
    const heroInsideWall = Boolean(
      wallRect
      && heroRect
      && heroRect.left >= wallRect.left - 4
      && heroRect.right <= wallRect.right + 4
      && heroRect.top >= wallRect.top - 4
      && heroRect.bottom <= wallRect.bottom + 4
    );

    return {
      timestampMs: performance.now(),
      phase: document.documentElement.dataset.absTransitionPhase || 'idle',
      path: location.pathname,
      bodyClass: document.body.className,
      wallRect,
      heroRect,
      topbarRect,
      heroReadable: isReadable(hero),
      topbarReadable: isReadable(topbar),
      footerReadable: isReadable(footer),
      labelReadable: isReadable(label),
      heroInsideWall,
      primaryReadable: isReadable(hero) || isReadable(topbar) || isReadable(footer),
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

async function captureDenseGateFrames(page) {
  await mkdir(outputRoot, { recursive: true });
  const startedAt = Date.now();
  const frames = [];
  let index = 0;

  while ((Date.now() - startedAt) <= FRAME_DURATION_MS) {
    const frame = await readDenseGateFrame(page);
    const screenshotPath = resolve(outputRoot, `gate-frame-${String(index).padStart(3, '0')}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    frames.push({ ...frame, screenshotPath });
    index += 1;
    await sleep(FRAME_SAMPLE_MS);
  }

  await writeFile(resolve(outputRoot, 'gate-frames.json'), `${JSON.stringify(frames, null, 2)}\n`, 'utf8');
  return frames;
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
    if (!firstReadable.heroInsideWall) {
      errors.push('hero was not fully inside the inner wall on the first readable frame');
    }
    if (!firstReadable.heroReadable || !firstReadable.topbarReadable) {
      errors.push('hero and top chrome did not enter in the same readable band');
    }
    if (frames.slice(0, firstReadableIndex).some(
      (frame) => /portfolio/i.test(frame.path || '') && frame.labelReadable
    )) {
      errors.push('portfolio labels became readable before the primary hero/chrome/footer group');
    }
  }

  if (firstReadable && settled) {
    const heroSnapPx = rectDiffMagnitude(firstReadable.heroRect, settled.heroRect);
    if (heroSnapPx > HERO_SNAP_THRESHOLD_PX) {
      errors.push(`hero geometry snapped ${heroSnapPx.toFixed(2)}px between first readable and settled frames`);
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
  const denseCapture = captureDenseGateFrames(page);
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
  const denseFrames = await denseCapture;
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

  const denseAudit = assertDenseGateFrames(denseFrames);
  await writeFile(
    resolve(outputRoot, 'gate-audit-summary.json'),
    `${JSON.stringify(denseAudit, null, 2)}\n`,
    'utf8'
  );

  console.log(JSON.stringify({ snap, labelCheck, denseAudit }, null, 2));

  if (!labelCheck.nonEmpty) {
    console.error('FAIL: no non-empty .portfolio-project-label__text after gate navigation');
    process.exitCode = 1;
  } else if (denseAudit.errors.length) {
    denseAudit.errors.forEach((error) => console.error(`FAIL: ${error}`));
    process.exitCode = 1;
  } else {
    console.error(`PASS: canvas buffer OK, ${labelCheck.nonEmpty} label(s) with text, dense gate frames clean`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
