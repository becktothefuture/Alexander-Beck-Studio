import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const output = 'output/playwright/panel-recovery';
await mkdir(output, { recursive: true });
const browserName = process.env.ABS_BROWSER || 'chromium';
const browser = await ({ chromium, webkit }[browserName]).launch();
try {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const launcher = page.getByRole('button', { name: 'Toggle design panel', exact: true });
    const dock = page.locator('#panelDock');
    const checkOpen = async (open) => {
      await page.waitForFunction((expected) => {
        const host = document.getElementById('panelDock');
        return !!host?.isConnected && !host.classList.contains('hidden') === expected;
      }, open, { timeout: 5000 }).catch(async error => {
        console.log(await page.evaluate(() => ({ url: location.href, dock: document.getElementById('panelDock')?.outerHTML.slice(0, 200), pressed: document.querySelector('.panel-toggle-btn')?.getAttribute('aria-pressed') })));
        throw error;
      });
      await page.evaluate(async () => {
        await Promise.all(document.getElementById('panelDock').getAnimations().map(a => a.finished.catch(() => {})));
      });
      assert.equal(await launcher.getAttribute('aria-pressed'), String(open));
      assert.equal(await dock.count(), 1);
      if (open) {
        const box = await dock.boundingBox();
        assert.ok(box.x >= 0 && box.x < viewport.width && box.y >= 0 && box.y < viewport.height);
      }
    };
    await page.goto(`${process.env.ABS_BASE_URL || 'http://localhost:8012'}/index.html`);
    await launcher.waitFor();
    await page.locator('#abs-boot-overlay').waitFor({ state: 'hidden' });
    await launcher.click();
    await checkOpen(true);
    // The open panel must not intercept the cog, even on short/narrow screens.
    await launcher.click({ timeout: 3000 });
    await checkOpen(false);
    await launcher.press('/');
    await checkOpen(true);
    await launcher.press('/');
    await checkOpen(false);
    // Reproduce a stale host after route teardown or a development replacement.
    await dock.evaluate(element => element.remove());
    await launcher.click();
    await checkOpen(true);
    await dock.evaluate(element => element.remove());
    await launcher.press('/');
    await checkOpen(true);
    await page.screenshot({ path: `${output}/${browserName}-${viewport.width}-open.png` });
    await launcher.click();
    await checkOpen(false);
    await page.getByRole('link', { name: 'Contact', exact: true }).click();
    await page.waitForURL('**/contact.html');
    await page.waitForFunction(() => document.querySelector('[data-route-tab="contact"]')?.getAttribute('aria-current') === 'page');
    await launcher.click();
    await checkOpen(true);
    await launcher.press('/');
    await checkOpen(false);
    await page.reload();
    await launcher.waitFor();
    await page.locator('#abs-boot-overlay').waitFor({ state: 'hidden' });
    await launcher.press('/');
    await checkOpen(true);
    console.log(`PASS ${browserName} ${viewport.width}: cog, slash, detached-host recovery, SPA and reload`);
    await page.close();
  }
} finally {
  await browser.close();
}
