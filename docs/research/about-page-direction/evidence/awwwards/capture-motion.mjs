import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_DIR = path.join(ROOT, 'motion');
await fs.mkdir(VIDEO_DIR, { recursive: true });

const sites = [
  { id: 'thibaud-fellay', about: 'https://thibaud.film/about/' },
  { id: 'veronica-zubakova', about: 'https://veronicazubakova.com/about/' },
  { id: 'jack-elder', about: 'https://www.jackelder.design/#pixel-scroll' },
  { id: 'giats', about: 'https://giats.me/about' },
];

const browser = await chromium.launch({ headless: false });
const report = [];

for (const site of sites) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const item = { ...site, errors: [] };
  try {
    await page.goto(site.about, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(6000);
    await page.mouse.move(260, 280);
    await page.waitForTimeout(600);
    await page.mouse.move(980, 460, { steps: 24 });
    await page.waitForTimeout(600);
    const height = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    const steps = Math.max(8, Math.min(18, Math.ceil(height / 700)));
    for (let index = 0; index <= steps; index += 1) {
      const y = Math.round((height - 720) * (index / steps));
      await page.evaluate((value) => window.scrollTo({ top: value, behavior: 'smooth' }), y);
      await page.mouse.move(200 + ((index * 83) % 850), 240 + ((index * 47) % 300), { steps: 10 });
      await page.waitForTimeout(650);
    }
    await page.waitForTimeout(900);
    item.finalUrl = page.url();
    item.bodyLength = (await page.locator('body').innerText()).length;
    item.webm = path.join('motion', `${site.id}-about-motion.webm`);
    const video = page.video();
    await page.close();
    await video.saveAs(path.join(ROOT, item.webm));
  } catch (error) {
    item.errors.push(String(error));
    await page.close().catch(() => {});
  }
  await context.close();
  report.push(item);
  console.log(`${site.id}: ${item.errors.length ? 'error' : 'captured'} ${item.bodyLength || 0}`);
}

await browser.close();
await fs.writeFile(path.join(ROOT, 'motion-capture-report.json'), JSON.stringify(report, null, 2));
