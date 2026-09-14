import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { parseThemeColour, themeContrast } from '../react-app/app/src/lib/theme-transition.js';

const origin = process.env.ABS_DEV_URL || 'http://127.0.0.1:8013';
const browserName = process.env.ABS_BROWSER || 'chromium';
const routeFilter = (process.env.ABS_AFTERGLOW_ROUTES || '').split(',').filter(Boolean);
const viewportFilter = process.env.ABS_AFTERGLOW_VIEWPORT || '';
const { surfaceDurationMs, glowDurationMs } = JSON.parse(await readFile(new URL('../react-app/app/public/config/design-system.json', import.meta.url), 'utf8')).shell.motion.themeTransition;
const middleAt = Math.ceil(surfaceDurationMs / 2);
const tailAt = Math.ceil(surfaceDurationMs + (glowDurationMs - surfaceDurationMs) / 2);
const endAt = glowDurationMs + 48;
const browser = await ({ chromium, webkit }[browserName]).launch();
const output = `output/playwright/afterglow/${browserName}-${new URL(origin).port}`;
await mkdir(output, { recursive: true });
const results = [];
const errors = [];

async function settled(page) {
  await page.waitForFunction(() => document.documentElement.dataset.absBootState === 'ready'
    && document.querySelector('.shell-utility-control--theme')
    && [...document.querySelectorAll('[data-route-tab]')].every((button) => {
      for (let node = button; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (Number(style.opacity) < 0.99 || style.visibility !== 'visible') return false;
      }
      return true;
    })
    && [...document.querySelectorAll('[data-route-enter-glyph]')].every((glyph) => glyph.__absRouteEntranceState?.settled !== false),
  null, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
}

async function sample(page) {
  return page.evaluate(() => {
    const style = getComputedStyle(document.body);
    const root = document.documentElement;
    const windowRect = document.querySelector('#simulations').getBoundingClientRect();
    const bar = document.querySelector('.button-bar');
    const barStyle = bar ? getComputedStyle(bar) : null;
    return {
      theme: root.dataset.absTheme,
      active: root.dataset.absThemeTransition === 'afterglow',
      background: style.getPropertyValue('--studio-window-bg').trim(),
      ink: style.getPropertyValue('--text-primary').trim(),
      rim: style.getPropertyValue('--abs-theme-rim-opacity').trim(),
      grain: style.getPropertyValue('--abs-theme-noise-opacity').trim(),
      frame: style.getPropertyValue('--frame-color').trim(),
      wall: style.getPropertyValue('--abs-wall-base').trim(),
      windowRect: [windowRect.x, windowRect.y, windowRect.width, windowRect.height],
      bar: barStyle ? [barStyle.backgroundColor, barStyle.color,
        ...[...bar.querySelectorAll('[data-route-tab], .button-bar__label')].map((node) => {
          const computed = getComputedStyle(node);
          return [computed.color, computed.opacity, computed.visibility];
        })] : null,
      atmosphere: window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot(),
    };
  });
}

async function toggle(page) {
  await page.locator('.shell-utility-control--theme').evaluate((button) => button.click());
}

try {
  for (const [size, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    if (viewportFilter && size !== viewportFilter) continue;
    for (const route of ['index', 'portfolio', 'about', 'contact']) {
      if (routeFilter.length && !routeFilter.includes(route)) continue;
      const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
      await context.addInitScript(() => {
        if (window !== window.top) return;
        if (!sessionStorage.getItem('afterglow-audit-initialized')) {
          localStorage.setItem('theme-preference-v3', 'light');
          sessionStorage.setItem('afterglow-audit-initialized', 'true');
        }
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`${size}/${route}: ${error.message}`));
      await page.goto(`${origin}/${route}.html`);
      await settled(page);
      assert.equal((await sample(page)).active, false, 'Initial load must not animate theme');
      // Playwright's virtual clock cannot enter Work's script-disabled embeds.
      // Use the real clock there; keep deterministic checkpoints everywhere else.
      const controlledClock = !(route === 'portfolio' && new URL(origin).port === '8012');
      const advance = (ms) => controlledClock ? page.clock.runFor(ms) : page.waitForTimeout(ms);
      if (controlledClock) {
        await page.clock.install();
        await page.clock.pauseAt(new Date(Date.now() + 2000));
      }
      const initial = await sample(page);
      await page.screenshot({ path: `${output}/${size}-${route}-light.png` });
      for (const target of ['dark', 'light']) {
        if (!controlledClock) {
          const frames = await page.locator('.shell-utility-control--theme').evaluate((button) => new Promise((resolve) => {
            const read = () => {
              const style = getComputedStyle(document.body);
              return {
                active: document.documentElement.dataset.absThemeTransition === 'afterglow',
                background: style.getPropertyValue('--studio-window-bg').trim(),
                ink: style.getPropertyValue('--text-primary').trim(),
              };
            };
            button.click();
            const frames = [read()];
            const observe = () => {
              frames.push(read());
              if (!frames.at(-1).active) resolve(frames);
              else requestAnimationFrame(observe);
            };
            requestAnimationFrame(observe);
          }));
          const sameColour = (a, b) => JSON.stringify(parseThemeColour(a)) === JSON.stringify(parseThemeColour(b));
          const first = frames[0];
          const end = frames.at(-1);
          assert.equal(first.active, true);
          assert.ok(frames.some((frame) => !sameColour(frame.background, first.background) && !sameColour(frame.background, end.background)), 'Real frames must show an intermediate surface');
          assert.ok(frames.some((frame) => frame.active && sameColour(frame.background, end.background)), 'Real frames must show the glow tail after surface settlement');
          for (const frame of frames.filter((item) => item.active)) {
            assert.ok(themeContrast(parseThemeColour(frame.background), parseThemeColour(frame.ink)) >= 4.5);
          }
          const final = await sample(page);
          assert.equal(final.theme, target);
          assert.deepEqual(final.windowRect, initial.windowRect);
          assert.deepEqual(final.bar, initial.bar);
          await page.screenshot({ path: `${output}/${size}-${route}-${target}.png` });
          results.push({ size, route, target, frames, end: final });
          continue;
        }
        await toggle(page);
        const start = await sample(page);
        assert.equal(start.theme, target);
        assert.equal(start.active, true);
        await advance(middleAt);
        const middle = await sample(page);
        assert.deepEqual(middle.bar, initial.bar, 'Navigation must stay legible and steady during the transition');
        assert.notDeepEqual(parseThemeColour(middle.background), parseThemeColour(start.background));
        assert.ok(themeContrast(parseThemeColour(middle.background), parseThemeColour(middle.ink)) >= 4.5);
        if (controlledClock) await page.screenshot({ path: `${output}/${size}-${route}-${target}-mid.png` });
        await advance(tailAt - middleAt);
        const tail = await sample(page);
        assert.equal(tail.active, true, 'Glow must remain active after the surface settles');
        await advance(endAt - tailAt);
        const end = await sample(page);
        assert.equal(end.active, false, 'Animation must finish without a lingering layer');
        assert.deepEqual(parseThemeColour(tail.background), parseThemeColour(end.background));
        assert.deepEqual(end.windowRect, initial.windowRect);
        assert.equal(end.frame, initial.frame);
        assert.equal(end.wall, initial.wall);
        assert.deepEqual(end.bar, initial.bar);
        await page.screenshot({ path: `${output}/${size}-${route}-${target}.png` });
        results.push({ size, route, target, start, middle, tail, end });
      }
      // Reverse while the background is still moving, then reverse during the tail.
      await toggle(page);
      await advance(112);
      const reversal = await page.locator('.shell-utility-control--theme').evaluate((button) => {
        const read = () => getComputedStyle(document.body).getPropertyValue('--studio-window-bg');
        const before = read();
        button.click();
        return { before, after: read() };
      });
      assert.deepEqual(parseThemeColour(reversal.after), parseThemeColour(reversal.before));
      await advance(tailAt);
      await toggle(page);
      await advance(endAt);
      assert.equal((await sample(page)).theme, 'dark');
      assert.equal((await sample(page)).active, false);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await toggle(page);
      assert.equal((await sample(page)).active, false);
      assert.equal((await sample(page)).theme, 'light');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await toggle(page);
      await advance(112);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.screenshot({ path: `${output}/${size}-${route}-reduced.png` });
      await advance(48);
      assert.equal((await sample(page)).active, false, 'Enabling reduced motion must settle an active transition');
      if (controlledClock) await page.clock.resume();
      await page.reload();
      await settled(page);
      assert.equal((await sample(page)).theme, 'dark', 'Saved choice must survive reload');
      assert.equal((await sample(page)).active, false);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await toggle(page);
      const nextRoute = route === 'contact' ? 'home' : 'contact';
      await page.locator(`[data-route-tab='${nextRoute}']`).click();
      await page.waitForFunction((target) => document.documentElement.dataset.shellRoute === target
        && !document.documentElement.dataset.absThemeTransition
        && !['route-out', 'route-loading', 'route-in'].includes(document.documentElement.dataset.absTransitionPhase),
      nextRoute, { timeout: 60000 });
      assert.equal((await sample(page)).theme, 'light', 'Navigation during the transition must retain the requested theme');
      await context.close();
      console.log(`PASS ${browserName} ${size} ${route}: both directions, reversal, reduced motion, reload, navigation`);
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
