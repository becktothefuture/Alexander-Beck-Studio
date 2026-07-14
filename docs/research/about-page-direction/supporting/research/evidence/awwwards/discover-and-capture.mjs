import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const sites = [
  { id: 'david-heckhoff', name: 'David Heckhoff Portfolio', slug: 'david-heckhoff-portfolio', live: 'https://david-hckh.com/', aboutHint: null },
  { id: 'giats', name: 'Giats — Portfolio', slug: 'https-giats-me', live: 'https://giats.me/', aboutHint: 'https://giats.me/about' },
  { id: 'pedro-matos-chaves', name: 'Pedro Matos Chaves · Design', slug: 'pedro-matos-chaves-design', live: 'https://pedromc.design/', aboutHint: 'https://pedromc.design/about.html' },
  { id: 'thibaud-fellay', name: 'Thibaud Fellay — Portfolio 24', slug: 'thibaud-fellay-portfolio-24', live: 'https://thibaud.film/', aboutHint: 'https://thibaud.film/about/' },
  { id: 'jhosue-mesias', name: 'Jhosue Mesias — Portfolio', slug: 'jhosue-mesias-portfolio', live: 'https://www.jhosuemesias.com/', aboutHint: null },
  { id: 'robin-noguier', name: 'Robin Noguier — Portfolio', slug: 'robin-noguier-portfolio', live: 'https://robin-noguier.com/', aboutHint: 'https://robin-noguier.com/about/' },
  { id: 'veronica-zubakova', name: 'Veronica Zubakova — Portfolio', slug: 'veronica-zubakova-portfolio', live: 'https://veronicazubakova.com/', aboutHint: 'https://veronicazubakova.com/about' },
  { id: 'sai-narayanan', name: 'Sai Narayanan', slug: 'sai-narayanan', live: 'https://www.sainarayanan.com', aboutHint: 'https://www.sainarayanan.com/about' },
  { id: 'leopold-manguette', name: 'Léopold Manguette', slug: 'leopold-manguette', live: 'https://leopoldmanguette.com/', aboutHint: null },
  { id: 'gregory-lalle', name: 'Grégory Lallé — 24', slug: 'gregory-lalle-24', live: 'https://gregorylalle.com', aboutHint: 'https://gregorylalle.com/about' },
  { id: 'jack-elder', name: 'Jack Elder Design', slug: 'jack-elder-design', live: 'https://www.jackelder.design/', aboutHint: null },
  { id: 'emilie-gauvin', name: 'Emilie Gauvin — Portfolio 2024', slug: 'emilie-gauvin-portfolio-2024', live: 'https://www.emiliegauvin.com/', aboutHint: null },
  { id: 'nalaprasad', name: 'Nalaprasad — Portfolio', slug: 'nalaprasad-portfolio', live: 'https://nalaprasad.com/', aboutHint: 'https://nalaprasad.com/about' },
  { id: 'luc-hohler', name: 'Luc Hohler Design', slug: 'luc-hohler-design', live: 'https://luchohler.com/', aboutHint: null },
];

const browser = await chromium.launch({ headless: true });
const results = [];

async function progressiveScroll(page) {
  const height = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
  const step = Math.max(500, Math.floor((await page.viewportSize()).height * 0.72));
  for (let y = 0; y < height; y += step) {
    await page.evaluate((value) => window.scrollTo({ top: value, behavior: 'instant' }), y);
    await page.waitForTimeout(220);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(500);
}

for (const site of sites) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const record = { ...site, awwwards: `https://www.awwwards.com/sites/${site.slug}`, discoveredLinks: [], errors: [] };
  try {
    await page.goto(site.live, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);
    record.discoveredLinks = await page.locator('a').evaluateAll((anchors) => anchors
      .map((a) => ({ text: (a.innerText || a.getAttribute('aria-label') || '').trim(), href: a.href }))
      .filter((a) => /about|profile|bio|info/i.test(`${a.text} ${a.href}`))
      .slice(0, 20));
    let aboutUrl = site.aboutHint || record.discoveredLinks.find((l) => /about/i.test(`${l.text} ${l.href}`))?.href || site.live;
    if (!site.aboutHint && aboutUrl === site.live) {
      const aboutText = page.getByText(/about( me| us)?/i, { exact: false }).first();
      if (await aboutText.count()) {
        await aboutText.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(2000);
        aboutUrl = page.url();
      }
    } else {
      await page.goto(aboutUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3000);
    }
    record.aboutUrl = aboutUrl;
    record.finalUrl = page.url();
    record.title = await page.title();
    record.status = (await page.locator('body').count()) ? 'accessible' : 'missing';
    await progressiveScroll(page);
    const text = (await page.locator('body').innerText({ timeout: 10000 })).replace(/\s+/g, ' ').trim();
    record.bodyText = text.slice(0, 25000);
    record.wordCount = (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length;
    record.scrollHeight = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    record.screenshot = `${site.id}-about-full.png`;
    await page.screenshot({ path: path.join(ROOT, record.screenshot), fullPage: true, animations: 'disabled', timeout: 60000 });
  } catch (error) {
    record.status = 'error';
    record.errors.push(String(error));
  }
  results.push(record);
  await context.close();
  console.log(`${site.id}: ${record.status} ${record.finalUrl || ''} ${record.wordCount || 0} words`);
}

await fs.writeFile(path.join(ROOT, 'capture-discovery.json'), JSON.stringify(results, null, 2));
await browser.close();
