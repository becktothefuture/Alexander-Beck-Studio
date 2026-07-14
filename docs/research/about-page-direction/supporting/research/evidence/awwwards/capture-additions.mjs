import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const sites = [
  { id: 'dennis-snellenberg', name: 'Dennis Snellenberg — Portfolio', slug: 'dennis-snellenberg-portfolio', live: 'https://dennissnellenberg.com/', about: 'https://dennissnellenberg.com/about' },
  { id: 'agustin-burgos', name: 'Agustin Burgos — Portfolio', slug: 'agustin-burgos-portfolio', live: 'https://agustinburgos.com/', about: 'https://agustinburgos.com/about' },
];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const site of sites) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const result = { ...site, awwwards: `https://www.awwwards.com/sites/${site.slug}`, errors: [] };
  try {
    const response = await page.goto(site.about, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    const height = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    for (let y = 0; y <= height; y += 650) {
      await page.evaluate((value) => window.scrollTo({ top: value, behavior: 'instant' }), y);
      await page.waitForTimeout(220);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(800);
    const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
    Object.assign(result, {
      status: response?.status(),
      finalUrl: page.url(),
      title: await page.title(),
      bodyText: bodyText.slice(0, 25000),
      wordCount: (bodyText.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length,
      scrollHeight: await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)),
      screenshot: `${site.id}-about-full.png`,
    });
    await page.screenshot({ path: path.join(ROOT, result.screenshot), fullPage: true, animations: 'disabled', timeout: 60000 });
  } catch (error) {
    result.errors.push(String(error));
  }
  results.push(result);
  console.log(`${site.id}: ${result.status || 'error'} ${result.wordCount || 0} words ${result.finalUrl || ''}`);
  await context.close();
}

await fs.writeFile(path.join(ROOT, 'capture-additions.json'), JSON.stringify(results, null, 2));
await browser.close();
