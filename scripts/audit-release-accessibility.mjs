import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { THEME_ATTR, THEME_STORAGE_KEY } from '../react-app/app/src/lib/theme-state.js';
import {
  RELEASE_SMOKE_ROUTES,
  routeUrl,
  startProductionPreview,
  waitForRouteReady,
} from './lib/release-smoke-helpers.mjs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(repoRoot, 'output/playwright/release-smoke');
const routes = RELEASE_SMOKE_ROUTES.filter(({ id }) => id === 'home' || id === 'contact');
const rules = ['aria-command-name', 'button-name', 'input-button-name', 'link-name', 'color-contrast'];
const viewport = { width: 1280, height: 900 };
const timeout = 30_000;
const port = Number(process.env.ABS_RELEASE_ACCESSIBILITY_PORT ?? 8015);
const scans = [];

const preview = await startProductionPreview({ repoRoot, host: '127.0.0.1', port });
try {
  const browser = await chromium.launch();
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport, colorScheme: theme, reducedMotion: 'reduce' });
      try {
        await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
          key: THEME_STORAGE_KEY,
          value: theme,
        });
        const page = await context.newPage();
        for (const route of routes) {
          await page.goto(routeUrl(preview.baseUrl, route.requestPath || route.path), {
            waitUntil: 'domcontentloaded',
            timeout,
          });
          await waitForRouteReady(page, route, timeout);
          await page.waitForFunction(({ attribute, value }) => (
            document.documentElement.getAttribute(attribute) === value && document.fonts.status === 'loaded'
          ), { attribute: THEME_ATTR, value: theme }, { timeout });

          const { violations, incomplete } = await new AxeBuilder({ page }).withRules(rules).analyze();
          scans.push({ route: route.id, theme, violations, incomplete });
          const findingCount = violations.reduce((count, { nodes }) => count + nodes.length, 0);
          const reviewCount = incomplete.reduce((count, { nodes }) => count + nodes.length, 0);
          console.log(`[accessibility] ${route.id}/${theme}: ${findingCount} violations, ${reviewCount} items to review manually`);
          for (const { id, nodes } of violations) {
            console.error(`- ${id}: ${nodes.map(({ target }) => target.join(' > ')).join(', ')}`);
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
} finally {
  await preview.stop();
}

await mkdir(output, { recursive: true });
const reportPath = resolve(output, 'accessibility.json');
await writeFile(reportPath, `${JSON.stringify({ viewport, rules, scans }, null, 2)}\n`);
console.log(`[accessibility] Report: ${reportPath}`);
if (scans.some(({ violations }) => violations.length > 0)) process.exitCode = 1;
