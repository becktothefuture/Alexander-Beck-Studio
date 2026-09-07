import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import { driveAboutStoryWU } from './audit-about-narrative-surfel-v2-helpers.mjs';

const browserName = process.env.ABS_BROWSER || 'chromium';
const baseUrl = process.env.ABS_BASE_URL || 'http://127.0.0.1:8013';
const output = resolve(process.env.ABS_ABOUT_TYPE_OUTPUT || 'output/playwright/about-five-type-styles', browserName);
await mkdir(output, { recursive: true });
const browser = await (browserName === 'webkit' ? webkit : chromium).launch({ headless: true,
  ...(browserName === 'chromium' && process.env.ABS_CHROMIUM_CHANNEL ? { channel: process.env.ABS_CHROMIUM_CHANNEL } : {}) });
const report = [];
try {
  for (const [profile, viewport] of [['desktop', { width: 1440, height: 1000 }], ['tablet', { width: 768, height: 1024 }], ['mobile', { width: 390, height: 844 }], ['narrow', { width: 320, height: 740 }]].filter(([id]) => !process.env.ABS_ABOUT_VIEWPORT || id === process.env.ABS_ABOUT_VIEWPORT)) {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport, colorScheme: theme, reducedMotion: profile === 'narrow' && theme === 'dark' ? 'reduce' : 'no-preference' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${baseUrl}/about.html?edit=0`);
      await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.pointWorldState === 'ready');
      await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.aboutLayoutReady === 'true');
      await page.waitForTimeout(400);
      const layout = await page.evaluate(() => {
        const root = document.querySelector('.about-narrative-lab');
        const scroll = document.querySelector('.about-narrative-scrollport');
        const leaves = [...root.querySelectorAll('*')].filter(node => [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim()));
        const formats = [...new Set(leaves.map(node => { const s = getComputedStyle(node); return [s.fontSize, s.fontFamily, s.fontWeight, s.fontStyle].join('|'); }))];
        const rows = [...root.querySelectorAll('.about-narrative-career-sequence__row')];
        const career = root.querySelector('.about-narrative-career-sequence');
        const preceding = career.previousElementSibling;
        const size = selector => parseFloat(getComputedStyle(root.querySelector(selector)).fontSize);
        return { formats, sizes: [...new Set(leaves.map(node => getComputedStyle(node).fontSize))],
          separation: career.getBoundingClientRect().top - preceding.getBoundingClientRect().bottom,
          body: size('.about-narrative-editorial-copy'), main: size('#about-route-title'), end: size('.is-finale .route-bookend-title'), intermediate: size('.about-narrative-spatial-title:not(.route-bookend-title)'),
          descriptions: rows.map(row => row.querySelector('.about-narrative-career-sequence__description')?.textContent.trim()),
          duration: Math.max(...[...root.querySelectorAll('[data-render-span-id]')].map(node => +node.dataset.storyEndWu)),
          overflow: scroll.scrollWidth - scroll.clientWidth,
          scrollScreens: (scroll.scrollHeight - scroll.clientHeight) / scroll.clientHeight };
      });
      assert.equal(layout.sizes.length, 5, JSON.stringify(layout));
      assert.equal(layout.formats.length, 5, JSON.stringify(layout.formats));
      assert.ok(layout.formats.every(format => format.endsWith('|400|normal')));
      assert.equal(layout.main, layout.end);
      assert.ok(layout.main > layout.intermediate && layout.intermediate > layout.body);
      assert.ok(layout.separation >= 96);
      assert.ok(layout.overflow <= 1);
      assert.equal(layout.descriptions.length, 5);
      assert.ok(layout.descriptions.every(text => text && text.split(/[.!?]+(?:\s+|$)/u).filter(part => part.trim()).length <= 2));
      const rows = page.locator('.about-narrative-career-sequence__row');
      for (let index = 0; index < 5; index += 1) {
        const target = await rows.nth(index).evaluate((row, duration) => {
          const scroll = document.querySelector('.about-narrative-scrollport');
          const top = row.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop;
          return (top - scroll.clientHeight * 0.3) / (scroll.scrollHeight - scroll.clientHeight) * duration;
        }, layout.duration);
        await driveAboutStoryWU(page, target);
        await page.waitForTimeout(150);
        await page.screenshot({ path: `${output}/${profile}-${theme}-role-${index + 1}.png` });
        const state = await rows.nth(index).evaluate(row => {
          const description = row.querySelector('.about-narrative-career-sequence__description');
          return {
            rowOpacity: +getComputedStyle(row).opacity,
            descriptionOpacity: +getComputedStyle(description).opacity,
            description: description.textContent.trim(),
          };
        });
        assert.ok(state.rowOpacity >= 0.99, JSON.stringify(state));
        assert.equal(state.descriptionOpacity, 1, JSON.stringify(state));
        assert.ok(state.description.length > 0);
      }
      await driveAboutStoryWU(page, 0);
      await page.screenshot({ path: `${output}/${profile}-${theme}-opening.png` });
      await driveAboutStoryWU(page, layout.duration);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${output}/${profile}-${theme}-ending.png` });
      assert.equal(await page.locator('.about-narrative-finale-actions').evaluate(node => node.inert), false);
      assert.deepEqual(errors, []);
      report.push({ profile, theme, ...layout, errors });
      console.log(`PASS ${browserName} ${profile} ${theme}: five styles, five roles`);
      await page.close();
    }
  }
} finally { await browser.close(); }
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
