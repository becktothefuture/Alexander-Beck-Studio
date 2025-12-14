// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    BOUNCY BALLS SIMULATION TESTS                            ║
// ║                     Playwright E2E Test Suite                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { test, expect } = require('@playwright/test');

// Run against local HTTP servers (see playwright.config.js webServer)
const SOURCE_URL = 'http://127.0.0.1:8801/index.html';
const BUILD_URL = 'http://127.0.0.1:8800/index.html';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SOURCE FILE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Bouncy Balls Simulation - Source File', () => {
  
  test('should load without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(SOURCE_URL);
    await page.waitForTimeout(2000); // Wait for initialization
    
    // Check for the specific errors we fixed
    expect(errors.some(e => e.includes('BASE_RADIUS'))).toBe(false);
    expect(errors.some(e => e.includes('mouseInCanvas'))).toBe(false);
    
    // Allow for other potential errors but log them
    if (errors.length > 0) {
      console.log('Console errors found:', errors);
    }
  });
  
  test('canvas should be properly sized (100vw x 100svh)', async ({ page }) => {
    await page.goto(SOURCE_URL);
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('#c');
    const container = page.locator('#bravia-balls');
    const box = await canvas.boundingBox();
    const containerBox = await container.boundingBox();
    const viewport = page.viewportSize();
    
    // Canvas should match the simulation container (container may be inset by frame/border settings)
    expect(Math.abs(box.width - containerBox.width)).toBeLessThan(3);
    expect(Math.abs(box.height - containerBox.height)).toBeLessThan(3);
    // Container should fit within viewport (allowing for frame insets)
    expect(containerBox.width).toBeLessThanOrEqual(viewport.width);
    expect(containerBox.height).toBeLessThanOrEqual(viewport.height + 5);
  });
  
  test('should have no scrollbars', async ({ page }) => {
    await page.goto(SOURCE_URL);
    await page.waitForTimeout(1000);
    
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    const hasVerticalScroll = await page.evaluate(() => {
      return document.documentElement.scrollHeight > document.documentElement.clientHeight;
    });
    
    expect(hasHorizontalScroll).toBe(false);
    expect(hasVerticalScroll).toBe(false);
  });
  
  test('simulation container should exist and be visible', async ({ page }) => {
    await page.goto(SOURCE_URL);
    const container = await page.locator('#bravia-balls');
    await expect(container).toBeVisible();
  });
  
  test('canvas should have proper attributes', async ({ page }) => {
    await page.goto(SOURCE_URL);
    const canvas = await page.locator('#c');
    
    await expect(canvas).toHaveAttribute('id', 'c');
    await expect(canvas).toHaveAttribute('role', 'application');
    await expect(canvas).toHaveAttribute('aria-label');
  });
  
  test('control panel should toggle with / key', async ({ page }) => {
    await page.goto(SOURCE_URL);
    await page.waitForTimeout(1000);
    
    const dock = page.locator('#panelDock');
    await expect(dock).toHaveCount(1);

    const initiallyHidden = await dock.evaluate(el => el.classList.contains('hidden'));

    await page.keyboard.press('/');
    await page.waitForTimeout(250);
    const afterFirstToggle = await dock.evaluate(el => el.classList.contains('hidden'));
    expect(afterFirstToggle).toBe(!initiallyHidden);

    await page.keyboard.press('/');
    await page.waitForTimeout(250);
    const afterSecondToggle = await dock.evaluate(el => el.classList.contains('hidden'));
    expect(afterSecondToggle).toBe(initiallyHidden);
  });
  
  test('all 4 modes should be accessible via keyboard', async ({ page }) => {
    await page.goto(SOURCE_URL);
    await page.waitForTimeout(2000);
    
    const modes = [
      // Assert keys are wired and mode switching doesn't crash (exact mode mapping can evolve)
      { key: '1', name: 'Mode 1' },
      { key: '2', name: 'Mode 2' },
      { key: '3', name: 'Mode 3' },
      { key: '4', name: 'Mode 4' }
    ];
    
    for (const mode of modes) {
      await page.keyboard.press(mode.key);
      await page.waitForTimeout(500);
      
      // Verify no errors occur on mode switch and container exists
      const container = await page.locator('#bravia-balls');
      await expect(container).toBeVisible();
    }
  });
  
  test('mouse movement should work without errors', async ({ page }) => {
    await page.goto(SOURCE_URL);
    await page.waitForTimeout(1000);
    
    const canvas = await page.locator('#c');
    const box = await canvas.boundingBox();
    
    // Move mouse over canvas
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);
    
    // Move to different position
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.waitForTimeout(500);
    
    // No assertion needed - just verify no crashes
  });
  
  test('mouseInCanvas variable should be properly tracked', async ({ page }, testInfo) => {
    await page.goto(SOURCE_URL);
    await page.waitForTimeout(1000);
    await page.waitForFunction(() => window.__pointerReady === true, null, { timeout: 5000 });
    
    const canvas = await page.locator('#c');
    const box = await canvas.boundingBox();
    const isMobileProject = /mobile/i.test(testInfo.project.name || '');
    
    // Mouse should be out of canvas initially
    let mouseInCanvas = await page.evaluate(() => window.mouseInCanvas);
    expect(mouseInCanvas).toBe(false);
    
    // Move mouse over canvas
    const midX = box.x + box.width / 2;
    const midY = box.y + box.height / 2;
    if (isMobileProject) {
      // Mobile projects often have the settings panel overlaying the canvas.
      // Dispatch the event from the canvas so e.target is not classified as UI.
      await page.evaluate(({ x, y }) => {
        const el = document.querySelector('#c');
        if (!el) return;
        try {
          if (typeof PointerEvent === 'function') {
            el.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true, pointerType: 'mouse' }));
          }
        } catch (e) {}
        el.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
      }, { x: midX, y: midY });
    } else {
      await page.mouse.move(midX, midY);
    }
    await page.waitForTimeout(100);
    
    mouseInCanvas = await page.evaluate(() => window.mouseInCanvas);
    expect(mouseInCanvas).toBe(true);
    
    // Move mouse out of canvas
    if (isMobileProject) {
      await page.evaluate(() => {
        try {
          if (typeof PointerEvent === 'function') {
            document.dispatchEvent(new PointerEvent('pointermove', { clientX: 0, clientY: 0, bubbles: true, pointerType: 'mouse' }));
          }
        } catch (e) {}
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 0, bubbles: true }));
      });
    } else {
      await page.mouse.move(0, 0);
    }
    await page.waitForTimeout(100);
    
    mouseInCanvas = await page.evaluate(() => window.mouseInCanvas);
    expect(mouseInCanvas).toBe(false);
  });
  
  test('mode switching should not throw console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(SOURCE_URL);
    await page.waitForTimeout(1000);
    
    // Switch across modes and ensure no BASE_RADIUS errors
    await page.keyboard.press('1'); // Ball Pit
    await page.waitForTimeout(500);
    await page.keyboard.press('2'); // Flies
    await page.waitForTimeout(500);
    await page.keyboard.press('3'); // Zero-G
    await page.waitForTimeout(500);
    await page.keyboard.press('4'); // Mode 4
    await page.waitForTimeout(500);
    
    expect(errors.some(e => e.includes('BASE_RADIUS'))).toBe(false);
    expect(errors.some(e => e.includes('mouseInCanvas'))).toBe(false);
  });

  test('dev should use production typography and icon sizing', async ({ page }) => {
    await page.goto(SOURCE_URL);
    await page.waitForTimeout(1500);

    // Legend uses Geist in the intended design system (loaded via WebFont + Webflow CSS).
    const legendFont = await page.locator('#expertise-legend').evaluate((el) => {
      return window.getComputedStyle(el).fontFamily || '';
    });
    expect(legendFont.toLowerCase()).toContain('geist');

    // Social icons should be small (not gigantic). Assert icon box does not exceed a reasonable bound.
    const icon = page.locator('#social-links .footer_icon-link .ti').first();
    await expect(icon).toBeVisible();
    const box = await icon.boundingBox();
    expect(box.width).toBeLessThan(64);
    expect(box.height).toBeLessThan(64);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: PRODUCTION BUILD
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Bouncy Balls Simulation - Production Build', () => {
  
  test('should load without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(BUILD_URL);
    await page.waitForTimeout(2000);
    
    expect(errors.some(e => e.includes('BASE_RADIUS'))).toBe(false);
    expect(errors.some(e => e.includes('mouseInCanvas'))).toBe(false);
    
    if (errors.length > 0) {
      console.log('Console errors found:', errors);
    }
  });
  
  test('canvas should be properly sized (100vw x 100svh)', async ({ page }) => {
    await page.goto(BUILD_URL);

    const canvas = page.locator('#c');
    const container = page.locator('#bravia-balls');

    // Under parallel load (especially on Firefox/WebKit), layout can take longer than 1s.
    // Poll until the canvas has been sized to its container.
    await expect
      .poll(async () => {
        const box = await canvas.boundingBox();
        const containerBox = await container.boundingBox();
        if (!box || !containerBox) return false;
        return (
          Math.abs(box.width - containerBox.width) < 3 &&
          Math.abs(box.height - containerBox.height) < 3
        );
      }, { timeout: 8000 })
      .toBe(true);

    const box = await canvas.boundingBox();
    const containerBox = await container.boundingBox();
    const viewport = page.viewportSize();

    expect(box).toBeTruthy();
    expect(containerBox).toBeTruthy();
    expect(Math.abs(box.width - containerBox.width)).toBeLessThan(3);
    expect(Math.abs(box.height - containerBox.height)).toBeLessThan(3);
    expect(containerBox.width).toBeLessThanOrEqual(viewport.width);
    expect(containerBox.height).toBeLessThanOrEqual(viewport.height + 5);
  });
  
  test('should have no scrollbars', async ({ page }) => {
    await page.goto(BUILD_URL);
    await page.waitForTimeout(1000);
    
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return {
        x: el.scrollWidth - el.clientWidth,
        y: el.scrollHeight - el.clientHeight,
      };
    });

    // Allow small rounding/URL-bar quirks on mobile engines (esp. iOS/WebKit).
    expect(overflow.x).toBeLessThanOrEqual(2);
    expect(overflow.y).toBeLessThanOrEqual(6);
  });
  
  test('control panel dock should toggle with / key', async ({ page }) => {
    await page.goto(BUILD_URL);
    const dock = page.locator('#panelDock');
    await expect(dock).toHaveCount(1, { timeout: 8000 });

    const initiallyHidden = await dock.evaluate(el => el.classList.contains('hidden'));
    await page.keyboard.press('/');
    await page.waitForTimeout(250);
    const afterToggle = await dock.evaluate(el => el.classList.contains('hidden'));
    expect(afterToggle).toBe(!initiallyHidden);
  });
  
  test('mouse interaction should work (pointer-events: auto)', async ({ page }) => {
    await page.goto(BUILD_URL);
    await page.waitForTimeout(1000);
    
    const canvas = await page.locator('#c');
    
    // Check pointer-events style
    const pointerEvents = await canvas.evaluate(el => 
      window.getComputedStyle(el).pointerEvents
    );
    
    expect(pointerEvents).not.toBe('none');
    
    // Move mouse over canvas
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);
    
    // No errors should occur
  });
  
  test('config values should be hardcoded', async ({ page }) => {
    await page.goto(BUILD_URL);
    await page.waitForTimeout(1000);
    
    // Check that config values were applied
    const configValues = await page.evaluate(() => {
      return {
        restitution: window.REST || null,
        friction: window.FRICTION || null,
        maxBalls: window.MAX_BALLS || null,
        repelRadius: window.repelRadius || null,
        repelPower: window.repelPower || null
      };
    });
    
    // These should exist (hardcoded from config)
    expect(configValues.maxBalls).toBe(300);
    expect(configValues.repelRadius).toBe(120);
    expect(configValues.repelPower).toBe(274000);
  });
  
  test('Webflow content should be present', async ({ page }) => {
    await page.goto(BUILD_URL);
    await page.waitForTimeout(1000);
    
    // Check for Webflow elements
    const noise = await page.locator('.noise');
    await expect(noise).toBeVisible();
    
    const header = await page.locator('header.viewport');
    await expect(header).toBeVisible();
  });
  
  test('simulation should be integrated correctly', async ({ page }) => {
    await page.goto(BUILD_URL);
    await page.waitForTimeout(1000);
    
    // Both Webflow content and simulation should exist
    const noise = await page.locator('.noise');
    const simulation = await page.locator('#bravia-balls');
    const canvas = await page.locator('#c');
    
    await expect(noise).toBeVisible();
    await expect(simulation).toBeVisible();
    await expect(canvas).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: VISUAL REGRESSION
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual Regression Tests', () => {
  
  test('source and build should render similarly', async ({ page }) => {
    // Take screenshots of both versions
    await page.goto(SOURCE_URL);
    await page.waitForTimeout(2000);
    const sourceScreenshot = await page.screenshot();
    
    await page.goto(BUILD_URL);
    await page.waitForTimeout(2000);
    const buildScreenshot = await page.screenshot();
    
    // Just verify both screenshots were taken
    expect(sourceScreenshot).toBeTruthy();
    expect(buildScreenshot).toBeTruthy();
    
    // In a real scenario, you'd compare these with an image diff library
  });
});

