#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { PNG } from 'pngjs';

const baseUrl = process.env.ABS_DEV_URL || 'http://localhost:8012';
const output = 'output/playwright/button-interactions';
const labUrl = `${baseUrl}/lab/button-audit.html`;
const desktop = { width: 1440, height: 1000 };
const phone = { width: 390, height: 844 };
const controls = [
  '.contact-email-row', '.contact-linkedin-action', '.simulation-focus-switcher',
  '.portfolio-access-gate__close', '.playground-lightbox__close', '.button-audit-utility',
  '.button-audit__native button:not(:disabled)',
  '.shell-utility-control--theme', '.shell-utility-control--sound',
  '.button-audit__settings .abs-labelled-action',
];
await mkdir(output, { recursive: true });
const report = [];

async function openPlayground(page) {
  await page.goto(labUrl);
  await page.getByText('Enable an override to start.').waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function loadStyleFixture(page) {
  let saved = {};
  await page.route(/\/config\/design-system\.json(?:\?|$)/, async route => {
    const response = await route.fetch();
    const config = await response.json();
    config.shell.surface.buttonStyles = saved;
    await route.fulfill({ response, json: config });
  });
  await page.route('**/api/design-system/config', async route => {
    const { buttonStyles, expectedButtonStyles } = route.request().postDataJSON();
    assert.deepEqual(expectedButtonStyles, saved);
    saved = buttonStyles;
    await route.fulfill({ json: { buttonStyles: saved } });
  });
}

function sample(button) {
  return button.evaluate(el => {
    const css = getComputedStyle(el);
    const { x, y, width, height } = el.getBoundingClientRect();
    return {
      geometry: [x, y, width, height], motion: [css.transform, css.translate, css.scale],
      fill: css.backgroundColor, edge: css.borderTopColor, focus: css.outlineWidth, ink: css.color,
      type: [css.fontFamily, css.fontSize, css.fontWeight],
      padding: [css.paddingInlineStart, css.paddingInlineEnd],
    };
  });
}

function assertStationary(state, resting, control) {
  assert.deepEqual(state.geometry, resting.geometry, control);
  assert.deepEqual(state.motion, ['none', 'none', 'none'], control);
}

async function verifyEditor(page) {
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  const copy = page.locator('.contact-email-row');
  const radius = page.getByRole('spinbutton', { name: 'Corner radius exact value' });
  const size = page.getByRole('slider', { name: 'Label size', exact: true });
  const save = page.getByRole('button', { name: 'Save to site' });
  const reset = page.getByRole('button', { name: 'Reset draft' });
  assert.ok(await save.isDisabled());
  await page.getByRole('checkbox', { name: 'Override corner radius' }).check();
  await radius.fill('8');
  await radius.press('Enter');
  assert.equal(await copy.evaluate(el => getComputedStyle(el).borderRadius), '8px');
  await page.getByRole('checkbox', { name: 'Override label size' }).check();
  await size.press('ArrowRight');
  assert.equal((await sample(copy)).type[1], '14.5px');
  assert.equal((await sample(page.locator('.simulation-focus-switcher'))).type[1], '14.5px');
  await page.getByRole('checkbox', { name: 'Override backdrop blur' }).check();
  assert.equal(await copy.evaluate(el => getComputedStyle(el).backdropFilter), 'blur(16px)');
  await page.getByRole('checkbox', { name: 'Flat finish' }).check();
  const selected = page.locator('.shell-utility-control--theme[aria-pressed="true"]');
  assert.equal(await selected.evaluate(el => getComputedStyle(el).boxShadow), 'none');
  assert.equal(await copy.evaluate(el => getComputedStyle(el).backdropFilter), 'blur(16px)');
  const exactSize = page.getByRole('spinbutton', { name: 'Label size exact value' });
  await exactSize.fill('20');
  await exactSize.press('Enter');
  for (const viewport of [phone, { ...phone, width: 320 }]) {
    await page.setViewportSize(viewport);
    assert.ok(await copy.evaluate(el => {
      const text = el.querySelector('.abs-action-label').getBoundingClientRect();
      const face = el.getBoundingClientRect();
      return text.left >= face.left && text.right <= face.right;
    }));
  }
  await page.setViewportSize(desktop);
  await reset.click();
  assert.ok(await save.isDisabled());
  assert.equal((await sample(copy)).type[1], '14px');

  await page.getByRole('checkbox', { name: 'Override corner radius' }).check();
  await radius.fill('8');
  await radius.press('Enter');
  await save.click();
  await page.getByText('Saved to the shared design settings.').waitFor();
  await page.reload();
  await page.getByText('Enable an override to start.').waitFor();
  assert.equal(await copy.evaluate(el => getComputedStyle(el).borderRadius), '8px');

  const backdrop = page.getByRole('combobox', { name: 'Backdrop' });
  await backdrop.selectOption('solid');
  assert.equal(await page.locator('.button-audit__background').count(), 0);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose image' }).click();
  await (await chooser).setFiles({
    name: 'test.png', mimeType: 'image/png',
    buffer: PNG.sync.write(new PNG({ width: 1, height: 1 })),
  });
  assert.equal(await backdrop.inputValue(), 'photo');
  assert.match(await page.locator('.button-audit__background').getAttribute('src'), /^blob:/);
}

// Serial browser runs. The lab imports the real components and layers its own defaults.
for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: desktop });
    await loadStyleFixture(page);
    await openPlayground(page);
    const linkedin = page.getByRole('link', { name: "Open Alexander Beck's LinkedIn profile" });
    assert.match(await linkedin.getAttribute('href'), /^https:\/\/www\.linkedin\.com\/in\//);
    // Keep drag-away testing in the document instead of opening a native link drag.
    await linkedin.evaluate(el => el.addEventListener('dragstart', event => event.preventDefault()));
    assert.equal(await linkedin.locator('i').evaluate(el => getComputedStyle(el).fontSize), '16px');
    assert.equal(await linkedin.locator('.abs-action-label').count(), 0);
    const { width, height } = await linkedin.boundingBox();
    assert.ok(width === 36 && height === 36);
    assert.ok(await linkedin.evaluate(el => {
      const { left, top, height } = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(left - 5, top + height / 2));
    }), 'LinkedIn expanded inline target');
    for (const selector of ['.contact-email-row', '.simulation-focus-switcher', 'button:has-text("Native button")']) {
      assert.deepEqual((await sample(page.locator(selector))).padding, ['16px', '16px']);
    }
    assert.equal(await page.locator('[data-route-tab]').count(), 0);
    const disabled = page.getByRole('button', { name: 'Disabled', exact: true });
    assert.ok(await disabled.isDisabled());
    assert.equal((await sample(disabled)).geometry[3], 36);
    assert.ok(await disabled.evaluate(el => Number(getComputedStyle(el).opacity) < 0.6));

    for (const theme of ['dark', 'light']) {
      for (const selector of controls) {
        const button = page.locator(selector);
        await button.scrollIntoViewIfNeeded();
        await page.mouse.move(0, 0);
        const rest = await sample(button);
        assert.equal(rest.fill, 'rgba(0, 0, 0, 0)', `${name} ${theme} ${selector}`);
        assert.equal(rest.geometry[3], 36, `${name} ${theme} ${selector} face height`);
        assert.ok(await button.evaluate(el => {
          const { left, top, width } = el.getBoundingClientRect();
          return el.contains(document.elementFromPoint(left + width / 2, top - 5));
        }), `${name} ${theme} ${selector} expanded target`);
        assert.match(rest.type[0], /Geist/);
        assert.deepEqual(rest.type.slice(1), ['14px', '500']);
        await button.hover();
        const hover = await sample(button);
        assert.notEqual(hover.edge, rest.edge, `${name} ${theme} ${selector} hover`);
        assertStationary(hover, rest, selector);
        await page.mouse.down();
        const pressed = await sample(button);
        assertStationary(pressed, rest, selector);
        assert.notEqual(pressed.fill, hover.fill, `${name} ${theme} ${selector} press tint`);
        assert.equal(pressed.ink, rest.ink, `${name} ${theme} ${selector} pressed ink`);
        await page.waitForTimeout(100);
        assertStationary(await sample(button), rest, selector);
        // Cancel activation during visual sampling.
        await page.mouse.move(0, 0);
        await page.mouse.up();
        assertStationary(await sample(button), rest, selector);
        await button.evaluate(el => Promise.allSettled(el.getAnimations().map(animation => animation.finished)));
        assert.equal((await sample(button)).fill, rest.fill, `${name} ${theme} ${selector} release fill`);
        if (await page.locator('.button-audit').getAttribute('data-audit-theme') !== theme) {
          await page.locator('.shell-utility-control--theme').click();
        }
        report.push({ browser: name, theme, selector, rest, hover, pressed });
      }

      await page.keyboard.press('Tab');
      for (const selector of controls) {
        const button = page.locator(selector);
        await button.focus();
        assert.equal((await sample(button)).focus, '2px', `${name} ${theme} ${selector} focus`);
      }
      const effect = page.locator('.simulation-focus-switcher');
      await effect.focus();
      const previousEffect = await effect.getAttribute('aria-label');
      const focused = await sample(effect);
      await page.keyboard.down('Space');
      const held = await sample(effect);
      assertStationary(held, focused, 'Change effect held via keyboard');
      assert.notEqual(held.fill, focused.fill, 'Change effect keyboard press tint');
      await page.keyboard.up('Space');
      assert.notEqual(await effect.getAttribute('aria-label'), previousEffect);
      await effect.blur();
      await page.mouse.move(0, 0);
      for (const viewport of [desktop, phone]) {
        await page.setViewportSize(viewport);
        const buttonHeights = await page.locator('.button-audit :is(button, .abs-labelled-action, .abs-circular-utility)').evaluateAll(
          buttons => buttons.map(button => button.getBoundingClientRect().height));
        assert.ok(buttonHeights.every(height => height === 36), `${name} ${viewport.width} uniform height`);
        await page.screenshot({ path: `${output}/${name}-${theme}-${viewport.width}.png`, fullPage: true });
      }
      await page.setViewportSize(desktop);
      if (theme === 'dark') await page.locator('.shell-utility-control--theme').click();
    }

    const touchPage = await browser.newPage({ viewport: phone, hasTouch: true, isMobile: true });
    await loadStyleFixture(touchPage);
    await openPlayground(touchPage);
    const mobileEffect = touchPage.locator('.simulation-focus-switcher');
    const previousEffect = await mobileEffect.getAttribute('aria-label');
    await mobileEffect.tap();
    assert.notEqual(await mobileEffect.getAttribute('aria-label'), previousEffect);
    await touchPage.getByRole('button', { name: 'Switch to light mode' }).tap();
    assert.equal(await touchPage.locator('.button-audit').getAttribute('data-audit-theme'), 'light');
    await touchPage.close();

    await verifyEditor(page);
    // Inspect rasterized ink independently of the layout/font-metric calculation.
    const inkPage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 3, reducedMotion: 'reduce' });
    await loadStyleFixture(inkPage);
    await openPlayground(inkPage);
    const reducedEffect = inkPage.locator('.simulation-focus-switcher');
    await reducedEffect.hover();
    const reducedRest = await sample(reducedEffect);
    await inkPage.mouse.down();
    const reducedPress = await sample(reducedEffect);
    assert.notEqual(reducedPress.fill, reducedRest.fill, 'Reduced Motion press tint');
    assertStationary(reducedPress, reducedRest, 'Reduced Motion press geometry');
    await inkPage.mouse.move(0, 0);
    await inkPage.mouse.up();
    assert.equal((await sample(reducedEffect)).fill, reducedRest.fill, 'Reduced Motion release is immediate');
    await inkPage.addStyleTag({ content: `
      .button-audit :is(button, .abs-labelled-action) {
        color: white !important; background: black !important; border-color: transparent !important;
        box-shadow: none !important; backdrop-filter: none !important; opacity: 1 !important;
      }
      .abs-labelled-action :is(i, svg) { visibility: hidden; }
    ` });
    for (const width of [1440, 390]) {
      await inkPage.setViewportSize({ width, height: 1000 });
      // The preceding viewport may still be showing clipboard feedback.
      const idle = inkPage.locator('.contact-email-row:not(.is-copied) .contact-email-label--idle');
      await idle.waitFor();
      await idle.evaluate(async label => {
        await new Promise(requestAnimationFrame);
        await Promise.allSettled(label.getAnimations().map(animation => animation.finished));
      });
      for (const [selector, label] of [
        ['.contact-email-row', 'Copy email'],
        ['.simulation-focus-switcher', 'Change effect'],
        ['.button-audit__settings .abs-labelled-action', 'Choose image'],
        ['button:has-text("Native button")', 'Native button'],
        ['.button-style-editor__actions button[data-button-style-save]', 'Save to site'],
        ['.contact-email-row', 'Copied'],
      ]) {
        const button = inkPage.locator(selector);
        await button.scrollIntoViewIfNeeded();
        if (label === 'Copied') {
          await button.click();
          await inkPage.locator('.contact-email-row.is-copied').waitFor();
          await inkPage.waitForTimeout(600);
        }
        const actionLabel = button.locator('.abs-action-label > span').filter({ hasText: label });
        const visibleLabel = await actionLabel.count() ? actionLabel : button;
        assert.equal((await visibleLabel.textContent()).trim(), label);
        assert.equal(await visibleLabel.evaluate(el => getComputedStyle(el).textTransform), 'none');
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
        assert.ok(Number.isFinite(inkOffset) && Math.abs(inkOffset - 1) <= 0.7, `${name} ${width} ${label}: visible ink offset ${inkOffset}px`);
        report.push({ browser: name, width, label, inkOffset });
      }
      await inkPage.locator('.contact-email-row:not(.is-copied)').waitFor();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(`${output}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log('PASS: stationary press and release, hover outlines, keyboard focus, touch, editor workflow and label alignment in Chromium and WebKit.');
