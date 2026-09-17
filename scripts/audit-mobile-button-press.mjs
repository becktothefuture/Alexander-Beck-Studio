#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, webkit } from 'playwright';

const base = process.env.ABS_NAV_URL || 'http://127.0.0.1:8013';
const output = process.env.ABS_BUTTON_OUTPUT || 'output/playwright/mobile-button-press';
await mkdir(output, { recursive: true });
const report = [];
const settle = async (page, id) => {
  for (let attempt = 0; attempt < 600; attempt++) {
    if (await page.evaluate(route => document.documentElement.dataset.absBootState === 'ready'
      && document.querySelector(`[data-route-tab='${route}']`)?.getAttribute('aria-current') === 'page'
      && (!document.documentElement.dataset.absTransitionPhase || document.documentElement.dataset.absTransitionPhase === 'idle'), id)) return;
    await delay(50);
  }
  throw new Error(`Route ${id} did not settle`);
};
const sample = button => button.evaluate(el => ({
  opacity: Number(getComputedStyle(el.querySelector('.tactile-nav__active')).opacity),
  ink: getComputedStyle(el.querySelector('.button-bar__icon')).color,
}));

// Real mobile contexts and native taps, run serially in both browser engines.
for (const [name, engine] of Object.entries({ chromium, webkit })) {
  if (process.env.ABS_BROWSER && process.env.ABS_BROWSER !== name) continue;
  console.log(`Checking ${name} mobile touch input`);
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await settle(page, 'home');
    const nav = id => page.locator(`[data-route-tab='${id}']`);
    const work = nav('portfolio');
    await work.click({ trial: true });
    await page.evaluate(() => document.fonts.ready);
    const box = await work.boundingBox();
    const pointer = { pointerId: 71, pointerType: 'touch', isPrimary: true, button: 0, clientX: box.x + box.width / 2, clientY: box.y + 20 };

    // Separate pointerup from click to expose a release-to-idle colour flash.
    await work.dispatchEvent('pointerdown', pointer);
    await sample(work); // Flush the transition's starting style before measuring elapsed time.
    await delay(120);
    const held = await sample(work);
    assert.equal(held.opacity, 1);
    await work.dispatchEvent('pointerup', pointer);
    await delay(100);
    assert.deepEqual(await sample(work), held, `${name}: face/ink flickered before click`);
    await page.screenshot({ path: `${output}/${name}-release-before-click.png` });
    await work.dispatchEvent('click', { button: 0, detail: 1 });
    await settle(page, 'portfolio');
    assert.deepEqual(await sample(work), held);
    assert.equal(await page.locator('[data-pressure], [data-release-pending]').count(), 0);

    // Freeze a release halfway through, then press again in the same frame.
    // Only one CSS transition may own the shadow; the rendered value must not jump.
    const interrupted = await work.evaluate(el => {
      const layer = el.querySelector('.tactile-nav__active');
      const r = el.getBoundingClientRect();
      const send = type => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 81, pointerType: 'touch', isPrimary: true, button: 0, clientX: r.x + r.width / 2, clientY: r.y + 20 }));
      const shadow = () => getComputedStyle(layer).boxShadow;
      send('pointerdown');
      shadow();
      layer.getAnimations().forEach(a => a.finish());
      send('pointerup');
      shadow();
      const animations = layer.getAnimations();
      animations.forEach(a => { a.pause(); a.currentTime = 70; });
      const before = shadow();
      send('pointerdown');
      const after = shadow();
      send('pointercancel');
      return { before, after, owners: animations.map(a => a.transitionProperty || a.id) };
    });
    assert.deepEqual(interrupted.owners, ['box-shadow'], `${name}: competing depth animations`);
    assert.equal(interrupted.after, interrupted.before, `${name}: re-press snapped to another depth`);

    // Cancelled gestures and suppressed long-press clicks must never stick.
    const home = nav('home');
    const homeBox = await home.boundingBox();
    const homePointer = { ...pointer, clientX: homeBox.x + homeBox.width / 2 };
    for (const action of ['pointercancel', 'drag-away', 'blur', 'no-click']) {
      await home.dispatchEvent('pointerdown', homePointer);
      if (action === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      else if (action === 'drag-away') {
        await home.dispatchEvent('pointermove', { ...homePointer, clientX: 1, clientY: 1 });
        await home.dispatchEvent('pointerup', { ...homePointer, clientX: 1, clientY: 1 });
      } else await home.dispatchEvent(action === 'no-click' ? 'pointerup' : action, homePointer);
      await delay(action === 'no-click' ? 650 : 100);
      assert.equal((await sample(home)).opacity, 0, `${name}: ${action} left the face lit`);
      assert.equal(await page.locator('[data-pressure], [data-release-pending]').count(), 0);
      assert.equal(await work.getAttribute('aria-current'), 'page');
    }

    for (const theme of ['light', 'dark']) {
      const current = await page.evaluate(() => document.body.classList.contains('dark-mode') ? 'dark' : 'light');
      if (current !== theme) await page.locator('[data-sound-source=theme-toggle]').first().tap();
      for (const id of ['contact', 'home', 'about', 'portfolio', 'home']) {
        await nav(id).tap();
        await settle(page, id);
        assert.equal(await page.locator('[data-visual-active=true]').count(), 1);
        assert.equal(await page.locator('[data-pressure], [data-release-pending]').count(), 0);
        assert.equal(await page.evaluate(() => getSelection().toString()), '');
      }
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 });
        await page.screenshot({ path: `${output}/${name}-${theme}-${width}.png` });
      }
      await page.setViewportSize({ width: 390, height: 844 });
    }

    // Exercise the cascade inside a selectable container, including nested ink.
    const guards = await page.evaluate(() => {
      const fixture = document.createElement('div');
      fixture.style.userSelect = 'text';
      fixture.innerHTML = '<button><span>Button label</span></button><a href="#"><span>Link label</span></a><input value="Editable text"><div contenteditable="true">Editable content</div>';
      document.body.append(fixture);
      const read = el => {
        const style = getComputedStyle(el);
        return { selection: style.getPropertyValue('user-select') || style.getPropertyValue('-webkit-user-select'), tap: style.getPropertyValue('-webkit-tap-highlight-color'), callout: style.getPropertyValue('-webkit-touch-callout') };
      };
      const controls = [...document.querySelectorAll('[data-route-tab], [data-route-tab] span, .shell-utility-control, .abs-labelled-action, .abs-labelled-action span'), ...fixture.querySelectorAll('button, a, span')].map(read);
      const editing = [...fixture.querySelectorAll('input, [contenteditable]')].map(read);
      fixture.remove();
      return { controls, editing, calloutSupported: CSS.supports('-webkit-touch-callout', 'none') };
    });
    assert.ok(guards.controls.every(style => style.selection === 'none' && style.tap === 'rgba(0, 0, 0, 0)'), `${name}: ${JSON.stringify(guards)}`);
    // Desktop-hosted WebKit emulates touch, but does not implement iOS callouts.
    if (guards.calloutSupported) assert.ok(guards.controls.every(style => style.callout === 'none'), `${name}: ${JSON.stringify(guards)}`);
    assert.ok(guards.editing.every(style => style.selection === 'text'));
    await nav('about').focus();
    await page.keyboard.press(name === 'webkit' ? 'Alt+Tab' : 'Tab');
    assert.equal(await nav('contact').evaluate(el => getComputedStyle(el.querySelector('.tactile-nav__face')).outlineStyle), 'solid');
    await page.keyboard.press('Enter');
    await settle(page, 'contact');
    const action = page.locator('.contact-linkedin-action');
    await action.waitFor();
    const edge = await action.boundingBox();
    const edgePointer = { ...pointer, clientX: edge.x + edge.width / 2, clientY: edge.y + 1 };
    await action.dispatchEvent('pointerdown', edgePointer);
    await delay(120);
    // Browser hit testing can report pointerout as the visible face squashes.
    await action.dispatchEvent('pointerout', { ...edgePointer, relatedTarget: null });
    assert.equal(await action.getAttribute('data-action-pressed'), 'true', `${name}: moving face released a stationary finger`);
    await action.dispatchEvent('pointermove', { ...edgePointer, clientX: 1, clientY: 1 });
    assert.equal(await action.getAttribute('data-action-pressed'), null, `${name}: drag-away stuck`);
    await delay(400);
    const motion = await action.evaluate(async el => {
      const r = el.getBoundingClientRect();
      const send = type => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 91, pointerType: 'touch', isPrimary: true, button: 0, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
      const read = () => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { scale: s.scale, translate: s.translate, opacity: s.opacity, display: s.display, visibility: s.visibility, x: r.x, y: r.y, width: r.width, height: r.height };
      };
      const frames = [];
      for (let tap = 0; tap < 5; tap++) {
        for (const type of ['pointerdown', 'pointerup']) {
          // Freeze time so WebKit's independent animation clock cannot advance
          // between the two reads and look like an input-induced jump.
          el.getAnimations().forEach(a => { const t = a.currentTime; a.pause(); a.currentTime = t; });
          const before = read();
          send(type);
          const after = read();
          frames.push({ type, before, after });
          el.getAnimations().forEach(a => a.play());
          await new Promise(resolve => requestAnimationFrame(resolve));
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
      }
      return frames;
    });
    for (const frame of motion) {
      // WebKit may advance its compositor by a fraction of a millisecond on
      // retarget. Bound rendered displacement below one physical pixel at DPR 3.
      for (const axis of ['x', 'y', 'width', 'height']) {
        assert.ok(Math.abs(frame.after[axis] - frame.before[axis]) < 0.25, `${name}: quick-tap ${axis} snapped: ${JSON.stringify(frame)}`);
      }
      assert.equal(frame.after.opacity, '1');
      assert.notEqual(frame.after.visibility, 'hidden');
      assert.notEqual(frame.after.display, 'none');
    }
    await delay(400);
    await page.screenshot({ path: `${output}/${name}-contact-action.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await action.dispatchEvent('pointerdown', { ...edgePointer, clientY: edge.y + edge.height / 2 });
    const reduced = await action.evaluate(el => ({ scale: getComputedStyle(el).scale, translate: getComputedStyle(el).translate }));
    assert.deepEqual(reduced, { scale: 'none', translate: 'none' });
    await action.dispatchEvent('pointercancel', edgePointer);
    await nav('home').tap();
    await settle(page, 'home');
    assert.equal(await nav('home').locator('.tactile-nav__active').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    assert.deepEqual(errors, []);
    report.push({ browser: name, widths: [320, 390], themes: 2, nativeTaps: 12, releaseHandoff: 'pass', interruptedDepth: 'continuous', rapidActionTaps: motion.length / 2, maxRetargetDeltaPx: Math.max(...motion.flatMap(f => ['x', 'y', 'width', 'height'].map(k => Math.abs(f.after[k] - f.before[k])))), stableHitArea: 'pass', cancellation: 'pass', controlSelection: 'blocked', iosCallout: guards.calloutSupported ? 'blocked' : 'requires physical iOS verification', editing: 'preserved', keyboard: 'pass', reducedMotion: 'pass', errors });
    await context.close();
  } finally { await browser.close(); }
}
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
console.log('PASS mobile button press', JSON.stringify(report));
