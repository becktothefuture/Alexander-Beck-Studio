import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'stitch-parts');
await fs.mkdir(OUT, { recursive: true });

const sites = [
  { id: 'giats', url: 'https://giats.me/about', frames: 9 },
  { id: 'gregory-lalle', url: 'https://gregorylalle.com/about', frames: 6 },
  { id: 'dennis-snellenberg', url: 'https://dennissnellenberg.com/about', frames: 7 },
  { id: 'tomoya-okada', url: 'https://v7.usestate.org/about/', frames: 7 },
];

const browser = await chromium.launch({ headless: false });
const report = [];
for (const site of sites) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const item = { ...site, parts: [], errors: [] };
  try {
    await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(6000);
    for (let index = 0; index < site.frames; index += 1) {
      const filename = `${site.id}-${String(index + 1).padStart(2, '0')}.png`;
      await page.screenshot({ path: path.join(OUT, filename), animations: 'disabled' });
      item.parts.push(path.join('stitch-parts', filename));
      await page.mouse.wheel(0, 850);
      await page.mouse.move(220 + ((index * 170) % 900), 250 + ((index * 91) % 420), { steps: 12 });
      await page.waitForTimeout(900);
    }
    item.finalUrl = page.url();
  } catch (error) {
    item.errors.push(String(error));
  }
  report.push(item);
  await context.close();
  console.log(`${site.id}: ${item.errors.length ? 'error' : item.parts.length + ' parts'}`);
}
await browser.close();
await fs.writeFile(path.join(ROOT, 'stitch-capture-report.json'), JSON.stringify(report, null, 2));
