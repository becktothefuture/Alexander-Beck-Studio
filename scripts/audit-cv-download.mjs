import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { getGateInviteCode } from '../react-app/app/src/lib/access-gates.js';
import { CV_DOWNLOAD_FILENAME } from '../react-app/app/src/lib/cv-download.js';

const origin = (process.env.ABS_URL || 'http://localhost:8012').replace(/\/+$/, '');
const browserName = process.env.ABS_BROWSER || 'chromium';
const output = process.env.ABS_OUTPUT || 'output/playwright/cv-download';
// Isolate gate behavior when the About simulation is being developed in parallel.
// This mounts the real components in the existing shell; the default audits the
// actual About ending, including its visibility and native scroll behavior.
const isolated = process.env.ABS_CV_ISOLATED === '1';
const invite = getGateInviteCode('portfolio');
const source = await readFile(new URL(
  '../docs/portfolio/sources/raw/src-20260715-001/Alexander Beck – UX:UI Designer & Creative Technologist – CV.pdf',
  import.meta.url,
));
const sourceHash = createHash('sha256').update(source).digest('hex');
const { contact } = JSON.parse(await readFile(new URL(
  '../react-app/app/public/config/contents-home.json', import.meta.url,
), 'utf8'));
await mkdir(output, { recursive: true });
const reports = [];
const browser = await (browserName === 'webkit' ? webkit : chromium).launch({
  args: browserName === 'chromium'
    ? ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] : [],
});

async function fillCode(page, code) {
  const inputs = page.locator('[data-portfolio-access-gate] input');
  for (let index = 0; index < code.length; index += 1) {
    await inputs.nth(index).fill(code[index]);
  }
}

async function openCvGate(page) {
  await page.locator('[data-download-cv]').click();
  await page.waitForSelector('[data-access-purpose="cv"][data-phase="open"]');
  await page.waitForFunction(() => document.activeElement?.dataset.index === '0');
  await page.waitForFunction(() => {
    const gate = document.querySelector('[data-access-purpose="cv"]');
    const layers = [gate, ...document.querySelectorAll('.window-overlay-layer')];
    return layers.every(layer => Number(getComputedStyle(layer).opacity) > 0.999
      && layer.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
  });
}

async function prepareAction(page) {
  if (isolated) {
    await page.goto(`${origin}/contact.html`);
    await page.waitForSelector('.contact-action-stack');
    await page.evaluate(async () => {
      const [{ default: React }, ReactDom, { CvDownloadAction }, { PortfolioGateRoute }] = await Promise.all([
        import('/node_modules/.vite/deps/react.js'),
        import('/node_modules/.vite/deps/react-dom_client.js'),
        import('/src/components/app/CvDownloadAction.jsx'),
        import('/src/routes/portfolio/PortfolioGateRoute.jsx'),
      ]);
      const createRoot = ReactDom.createRoot || ReactDom.default.createRoot;
      const actionHost = document.createElement('div');
      actionHost.dataset.routeContent = 'cv-test';
      actionHost.dataset.cvActionHost = '';
      document.querySelector('.contact-action-stack').appendChild(actionHost);
      const overlayHost = document.createElement('div');
      document.querySelector('.window-overlay-modal-host').appendChild(overlayHost);
      createRoot(actionHost).render(React.createElement(CvDownloadAction));
      createRoot(overlayHost).render(React.createElement(PortfolioGateRoute, { purpose: 'cv' }));
    });
    await page.waitForSelector('[data-download-cv]');
    return;
  }

  await page.goto(`${origin}/about.html`);
  await page.waitForSelector('[data-download-cv]', { state: 'attached' });
  await page.waitForFunction(() => document.querySelector('[data-route-content="about"]')
    ?.dataset.aboutSceneReady === 'true', null, { timeout: 60000 });
  await page.waitForFunction(() => {
    const port = document.querySelector('.about-board-scrollport');
    if (port) port.scrollTop = port.scrollHeight;
    const ending = document.querySelector('.about-board-ending');
    return ending && !ending.inert && Number(getComputedStyle(ending).opacity) > 0.95;
  }, null, { timeout: 60000, polling: 'raf' });
  await page.locator('.about-game-board').evaluate(node => { node.dataset.cvActionHost = ''; });
}

try {
  for (const [width, height, theme] of [[1440, 1000, 'light'], [390, 844, 'dark']]) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
    const page = await context.newPage();
    const report = { browser: browserName, width, height, theme, isolated, errors: [] };
    const downloads = [];
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('download', download => downloads.push(download));
    try {
      await prepareAction(page);
      if (await page.locator('html').getAttribute('data-abs-theme') !== theme) {
        await page.getByRole('button', { name: `Switch to ${theme} mode` }).click();
      }
      await page.evaluate(() => {
        window.__cvAuditWorkEvents = [];
        for (const name of ['abs:portfolio:access-granted', 'abs:portfolio:access-dismissed']) {
          window.addEventListener(name, event => window.__cvAuditWorkEvents.push(event.type));
        }
      });

      await openCvGate(page);
      assert.equal(await page.locator('#portfolio-access-gate-title').textContent(), 'Download CV');
      assert.equal(await page.locator('[data-cv-action-host]').evaluate(node => node.inert), true);
      assert.equal(downloads.length, 0, 'opening the prompt must not download the CV');
      const gateBounds = await page.locator('.portfolio-access-gate__inner').boundingBox();
      assert.ok(gateBounds.x >= 0 && gateBounds.x + gateBounds.width <= width,
        'the reused access prompt must fit its viewport');
      await page.screenshot({ path: `${output}/${browserName}-${width}-gate.png` });

      // The existing six-field keyboard trap remains intact for the CV purpose.
      await page.getByRole('button', { name: 'Close CV access prompt' }).focus();
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.index), String(invite.length - 1));
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close CV access prompt');
      const wrongCode = invite === '0'.repeat(invite.length) ? '9'.repeat(invite.length) : '0'.repeat(invite.length);
      await fillCode(page, wrongCode);
      await page.waitForFunction(() => document.querySelector('.portfolio-access-gate__status')
        ?.textContent.includes('did not match'));
      await page.waitForFunction(() => [...document.querySelectorAll('.portfolio-digit')]
        .every(input => input.value === ''));
      assert.equal(downloads.length, 0, 'a wrong code must not download the CV');
      await page.keyboard.press('Escape');
      await page.waitForSelector('[data-portfolio-access-gate]', { state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-download-cv'));
      assert.equal(await page.locator('[data-cv-action-host]').evaluate(node => node.inert), false);
      assert.equal(downloads.length, 0, 'dismissing the prompt must not download the CV');

      await openCvGate(page);
      const firstDownload = page.waitForEvent('download');
      // Exercise the actual clipboard handler without changing the user's clipboard.
      await page.locator('.portfolio-digit').first().evaluate((input, code) => {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text', code);
        input.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
      }, invite);
      const downloaded = await firstDownload;
      assert.equal(downloaded.suggestedFilename(), CV_DOWNLOAD_FILENAME);
      const downloadPath = await downloaded.path();
      assert.equal(createHash('sha256').update(await readFile(downloadPath)).digest('hex'), sourceHash,
        'the downloaded PDF must be the supplied CV, unchanged');
      await page.waitForSelector('[data-portfolio-access-gate]', { state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-download-cv'));
      assert.equal(await page.locator('[data-cv-action-host]').evaluate(node => node.inert), false);
      assert.deepEqual(await page.evaluate(() => window.__cvAuditWorkEvents), [],
        'CV flow must not emit Work events or resume a pending case study');

      const directDownload = page.waitForEvent('download');
      await page.locator('[data-download-cv]').click();
      await directDownload;
      assert.equal(await page.locator('[data-portfolio-access-gate]').count(), 0,
        'an existing shared grant must download without prompting again');
      assert.equal(downloads.length, 2);
      report.gateFlow = 'wrong code, dismissal, focus trap/restore, paste success, direct repeat';
      report.pdfMatchesSource = true;
      report.workEventsIsolated = true;

      await page.goto(`${origin}/contact.html`);
      const email = page.locator('.contact-email-label--idle .contact-email-text');
      await email.waitFor();
      assert.equal((await email.textContent()).trim(), contact.email);
      assert.ok((await page.locator('[data-copy-email]').getAttribute('aria-label')).includes(contact.email),
        'the accessible name must include the visible email address');
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
          writeText: async value => { window.__cvAuditCopied = value; },
        } });
      });
      await page.locator('[data-copy-email]').click();
      await page.waitForFunction(() => document.querySelector('[data-copy-email]')?.classList.contains('is-copied'));
      assert.equal(await page.evaluate(() => window.__cvAuditCopied), contact.email);
      await page.screenshot({ path: `${output}/${browserName}-${width}-contact.png` });
      report.contactEmailCopy = true;
      assert.deepEqual(report.errors, []);
      report.passed = true;
      console.log(`PASS ${browserName} ${width}×${height}: CV gate, exact PDF download, email copy`);
    } catch (error) {
      report.passed = false;
      report.failure = error.message;
      process.exitCode = 1;
      await page.screenshot({ path: `${output}/${browserName}-${width}-failure.png` });
      console.error(`FAIL ${browserName} ${width}: ${error.message}`);
    } finally {
      reports.push(report);
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(`${output}/${browserName}-report.json`, JSON.stringify(reports, null, 2));
}
