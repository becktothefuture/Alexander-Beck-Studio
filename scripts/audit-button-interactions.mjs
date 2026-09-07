#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { PNG } from 'pngjs';

const baseUrl = process.env.ABS_DEV_URL || 'http://localhost:8012';
const output = 'output/playwright/button-interactions';
const selectors = [
  '.contact-email-row', '.contact-linkedin-action', '.simulation-focus-switcher',
  '.portfolio-access-gate__close', '.playground-lightbox__close', '.button-audit-utility',
];
await mkdir(output, { recursive: true });
const report = [];
// Serial browser runs. The audit page imports the actual production controls.
for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    // Exercise link pressure without opening an external destination.
    await page.goto(`${baseUrl}/lab/button-audit.html`);
    await page.locator('.simulation-focus-switcher').waitFor();
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.querySelector('.contact-linkedin-action').addEventListener('click', event => event.preventDefault());
    });
    for (const theme of ['dark', 'light']) {
      if (theme === 'light') await page.getByRole('button', { name: 'Switch to light mode' }).click();
      await page.waitForTimeout(400);
      const states = [];
      for (const selector of selectors) {
        const button = page.locator(selector);
        await button.hover();
        await page.waitForTimeout(400);
        const sample = (time) => button.evaluate((el, at) => {
          const transitions = el.getAnimations().filter(animation => animation.effect?.target === el);
          if (at !== null) for (const animation of transitions) {
            animation.pause();
            animation.currentTime = at;
          }
          const css = getComputedStyle(el);
          return {
            scale: css.scale, translate: css.translate, transform: css.transform,
            transition: css.transition, shadow: css.boxShadow, fill: css.backgroundColor,
            properties: transitions.map(animation => animation.transitionProperty).sort(),
          };
        }, time);
        const finish = () => button.evaluate(el => {
          for (const animation of el.getAnimations()) if (animation.effect?.target === el) animation.finish();
        });
        // Freeze at the input event itself: a busy test host can otherwise finish
        // an 80ms press before Playwright's next round trip samples it.
        const freezeNextInput = (type) => button.evaluate((el, eventType) => {
          el.addEventListener(eventType, () => {
            for (const animation of el.getAnimations()) {
              if (animation.effect?.target === el) animation.pause();
            }
          }, { once: true });
        }, type);
        const hover = await sample(null);
        await freezeNextInput('pointerdown');
        await page.mouse.down();
        const press = await sample(40);
        assert.ok(press.properties.includes('scale'), `${name} ${selector}: pressure snapped instead of transitioning`);
        assert.ok(press.properties.includes('translate'), `${name} ${selector}: missing pressure travel`);
        assert.ok(Number(press.scale.split(' ')[1]) > 0.92 && Number(press.scale.split(' ')[1]) < 1);
        await finish();
        await freezeNextInput('pointerup');
        await page.mouse.up();
        const release = await sample(128);
        assert.ok(release.properties.includes('scale'), `${name} ${selector}: missing release spring`);
        assert.ok(Number(release.scale.split(' ')[1]) > 1, `${name} ${selector}: release must overshoot`);
        states.push({ selector, hover, press, release });
        await finish();
      }
      // Compare actual intermediate frames, including edge-light interpolation.
      for (const state of states.slice(1)) for (const phase of ['hover', 'press', 'release']) {
        for (const property of ['scale', 'translate', 'transform', 'transition', 'shadow', 'fill']) {
          assert.equal(state[phase][property], states[0][phase][property], `${name} ${theme} ${state.selector} ${phase} ${property}`);
        }
      }
      await page.mouse.move(0, 0);
      await page.waitForTimeout(400);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        assert.equal(await page.locator('.simulation-focus-switcher').evaluate(el => el.offsetHeight), 36);
        await page.screenshot({ path: `${output}/${name}-${theme}-${width}.png`, fullPage: true });
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      report.push({ browser: name, theme, states });
    }
    // Inspect rasterized ink independently of the layout/font-metric calculation.
    const inkPage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 3, reducedMotion: 'reduce' });
    await inkPage.goto(`${baseUrl}/lab/button-audit.html`);
    await inkPage.locator('.simulation-focus-switcher').waitFor();
    await inkPage.evaluate(() => document.fonts.ready);
    await inkPage.addStyleTag({ content: `
      .abs-labelled-action { color: white !important; background: black !important; box-shadow: none !important; backdrop-filter: none !important; }
      .abs-labelled-action :is(i, svg) { visibility: hidden; }
    ` });
    for (const width of [1440, 390]) {
      await inkPage.setViewportSize({ width, height: 1000 });
      for (const [selector, label, casing] of [
        ['.contact-email-row', 'Copy email', 'none'],
        ['.contact-linkedin-action', 'LinkedIn', 'none'],
        ['.simulation-focus-switcher', 'CHANGE EFFECT', 'uppercase'],
        ['.contact-email-row', 'Copied', 'none'],
      ]) {
        const button = inkPage.locator(selector);
        await button.scrollIntoViewIfNeeded();
        if (label === 'Copied') {
          await button.click();
          await inkPage.locator('.contact-email-row.is-copied').waitFor();
          await inkPage.waitForTimeout(600);
        }
        assert.equal(await button.locator('.abs-action-label').first().evaluate(el => getComputedStyle(el).textTransform), casing);
        const buffer = await button.screenshot({ path: `${output}/${name}-ink-${width}-${label.replaceAll(' ', '-')}.png` });
        const png = PNG.sync.read(buffer);
        let top = Infinity;
        let bottom = -Infinity;
        // The central rectangle excludes rounded corners and all edge pixels.
        for (let y = 24; y < png.height - 24; y++) for (let x = 60; x < png.width - 60; x++) {
          const index = (y * png.width + x) * 4;
          if (png.data[index] > 200 && png.data[index + 1] > 200 && png.data[index + 2] > 200) {
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
        const inkOffset = ((top + bottom + 1) / 2 - png.height / 2) / 3;
        assert.ok(Number.isFinite(inkOffset) && Math.abs(inkOffset) <= 0.7, `${name} ${width} ${label}: visible ink offset ${inkOffset}px`);
        report.push({ browser: name, width, label, inkOffset });
      }
      await inkPage.locator('.contact-email-row:not(.is-copied)').waitFor();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(`${output}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log('PASS: six controls share intermediate pressure, rebound, fill and edge lighting; sentence-case primaries and centered visible label ink at desktop/mobile in Chromium/WebKit, dark/light.');
