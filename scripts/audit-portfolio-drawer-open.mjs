/**
 * End-to-end check: home → portfolio invite modal (1234) → portfolio pit → open and close every project drawer.
 * Asserts each drawer becomes visible/open, has non-empty title text, and closes cleanly.
 *
 * Run: npm run audit:portfolio-drawer
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
    const inputs = Array.from(document.querySelectorAll('.portfolio-digit'));
    const code = '1234';
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

  const initialState = await page.evaluate(() => ({
    drawerClass: document.getElementById('portfolioProjectView')?.className || '',
    labelCount: document.querySelectorAll('.portfolio-project-label').length,
  }));

  const projectResults = [];

  for (let index = 0; index < initialState.labelCount; index += 1) {
    await page.evaluate((projectIndex) => {
      document.dispatchEvent(new CustomEvent('abs:portfolio:open-project', {
        detail: { index: projectIndex },
      }));
    }, index);

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
        bodyOpen: document.body.classList.contains('portfolio-project-open'),
        title: (document.getElementById('portfolioProjectTitle')?.textContent || '').trim(),
        labelCount: document.querySelectorAll('.portfolio-project-label').length,
      }));
      console.error(JSON.stringify({ failureState, pageErrors, consoleErrors, failedIndex: index }, null, 2));
      throw error;
    }

    const openState = await page.evaluate((projectIndex) => ({
      index: projectIndex,
      drawerClass: document.getElementById('portfolioProjectView')?.className || '',
      title: (document.getElementById('portfolioProjectTitle')?.textContent || '').trim(),
      bodyOpen: document.body.classList.contains('portfolio-project-open'),
    }), index);

    projectResults.push(openState);

    await page.click('.portfolio-project-view__close', { timeout: 10000 });
    await page.waitForFunction(
      () => !document.body.classList.contains('portfolio-project-open'),
      { timeout: WAIT_MS }
    );
  }

  console.log(JSON.stringify({ initialState, projectResults }, null, 2));

  const hasFailure = projectResults.some((result) => !result.title || !result.bodyOpen);
  if (hasFailure || pageErrors.length || consoleErrors.length) {
    console.error(JSON.stringify({ pageErrors, consoleErrors, projectResults }, null, 2));
    console.error('FAIL: portfolio drawer regression detected');
    process.exitCode = 1;
  } else {
    console.error(`PASS: portfolio drawer opened and closed across ${projectResults.length} project(s)`);
  }
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
