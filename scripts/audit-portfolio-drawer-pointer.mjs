/**
 * End-to-end pointer check: home → portfolio invite modal (1234) → portfolio pit →
 * click each rendered project label center with the mouse and verify the drawer opens.
 *
 * Run: npm run audit:portfolio-drawer:pointer
 * Needs: dev or preview server. Set ABS_DEV_URL to origin or full index URL.
 */
import { chromium } from 'playwright';

const WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 25000);

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
      const canvas = document.getElementById('c');
      if (!canvas) return false;
      const cssWidth = canvas.clientWidth || 0;
      const cssHeight = canvas.clientHeight || 0;
      if (cssWidth < 64 || cssHeight < 64) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const minWidth = Math.ceil((cssWidth + 2) * dpr) - 2;
      const minHeight = Math.ceil((cssHeight + 2) * dpr) - 2;
      return canvas.width >= minWidth && canvas.height >= minHeight;
    },
    { timeout: WAIT_MS }
  );
}

async function waitForVisibleOnScreenLabel(page) {
  await page.waitForFunction(
    () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      return Array.from(document.querySelectorAll('.portfolio-project-label')).some((label) => {
        if (!(label instanceof HTMLElement)) return false;
        const rect = label.getBoundingClientRect();
        const centerX = rect.left + (rect.width / 2);
        const centerY = rect.top + (rect.height / 2);
        return rect.width > 8
          && rect.height > 8
          && centerX >= 0
          && centerX <= viewportWidth
          && centerY >= 0
          && centerY <= viewportHeight;
      });
    },
    { timeout: WAIT_MS }
  );
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => {
    pageErrors.push(String(error?.stack || error));
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(resolveHomeEntryUrl(), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#c', { timeout: WAIT_MS });
  await waitForSimulationCanvasBuffer(page);

  await page.click('#portfolio-modal-trigger', { timeout: 10000 });
  await page.waitForSelector('#portfolio-modal.active', { timeout: 10000 });
  await page.evaluate(() => {
    const code = '1234';
    const inputs = Array.from(document.querySelectorAll('.portfolio-digit'));
    for (let index = 0; index < Math.min(code.length, inputs.length); index += 1) {
      const element = inputs[index];
      element.focus();
      element.value = code[index];
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: code[index], inputType: 'insertText' }));
    }
  });

  await page.waitForURL(/portfolio/i, { timeout: WAIT_MS });
  await page.waitForSelector('.portfolio-project-label', { timeout: WAIT_MS, state: 'attached' });
  await waitForSimulationCanvasBuffer(page);
  await waitForVisibleOnScreenLabel(page);

  const labelCount = await page.evaluate(() => document.querySelectorAll('.portfolio-project-label').length);
  const results = [];
  const openedIndexes = new Set();

  const targetOpenCount = Math.min(1, labelCount);

  while (openedIndexes.size < targetOpenCount) {
    const target = await page.evaluate((excludeIndexes) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const labels = Array.from(document.querySelectorAll('.portfolio-project-label'));
      const candidates = labels
        .map((label) => {
          if (!(label instanceof HTMLElement)) return null;
          const projectIndex = Number(label.dataset.projectIndex);
          if (!Number.isInteger(projectIndex) || excludeIndexes.includes(projectIndex)) return null;
          const rect = label.getBoundingClientRect();
          const centerX = rect.left + (rect.width / 2);
          const centerY = rect.top + (rect.height / 2);
          const onScreen = rect.width > 8
            && rect.height > 8
            && centerX >= 0
            && centerX <= viewportWidth
            && centerY >= 0
            && centerY <= viewportHeight;
          if (!onScreen) return null;
          return {
            index: projectIndex,
            x: centerX,
            y: centerY,
            width: rect.width,
            height: rect.height,
            opacity: getComputedStyle(label).opacity,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.y - b.y);

      return candidates[0] || null;
    }, Array.from(openedIndexes));

    if (!target) {
      throw new Error(`No visible on-screen portfolio label available after opening ${openedIndexes.size} project(s)`);
    }

    await page.mouse.click(target.x, target.y);

    try {
      await page.waitForFunction(
        () => {
          const drawer = document.getElementById('portfolioProjectView');
          return Boolean(drawer)
            && drawer.classList.contains('is-visible')
            && drawer.classList.contains('is-open');
        },
        { timeout: WAIT_MS }
      );
    } catch (error) {
      const failureState = await page.evaluate(() => ({
        drawerClass: document.getElementById('portfolioProjectView')?.className || '',
        title: (document.getElementById('portfolioProjectTitle')?.textContent || '').trim(),
        bodyOpen: document.body.classList.contains('portfolio-project-open'),
      }));
      console.error(JSON.stringify({ failedIndex: target.index, point: target, failureState, pageErrors, consoleErrors }, null, 2));
      throw error;
    }

    const openState = await page.evaluate((projectIndex) => ({
      index: projectIndex,
      drawerClass: document.getElementById('portfolioProjectView')?.className || '',
      title: (document.getElementById('portfolioProjectTitle')?.textContent || '').trim(),
      bodyOpen: document.body.classList.contains('portfolio-project-open'),
    }), target.index);

    results.push({ point: target, openState });
    openedIndexes.add(target.index);

    await page.click('.portfolio-project-view__close', { timeout: 10000 });
    await page.waitForFunction(
      () => !document.body.classList.contains('portfolio-project-open'),
      { timeout: WAIT_MS }
    );
    await waitForVisibleOnScreenLabel(page);
    await page.waitForTimeout(100);
  }

  console.log(JSON.stringify({ results }, null, 2));

  const hasFailure = results.length < targetOpenCount
    || results.some(({ openState }) => !openState.title || !openState.bodyOpen);
  if (hasFailure || pageErrors.length || consoleErrors.length) {
    console.error(JSON.stringify({ pageErrors, consoleErrors, results }, null, 2));
    console.error('FAIL: portfolio pointer-open regression detected');
    process.exitCode = 1;
  } else {
    console.error(`PASS: pointer click opened and closed ${results.length} portfolio project(s)`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
