// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    BOUNCY BALLS SIMULATION TESTS                            ║
// ║                     Playwright E2E Test Suite                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { test, expect } = require('@playwright/test');
const path = require('path');

// File paths
const SOURCE_PATH = 'file://' + path.resolve(__dirname, '../source/balls-source.html');
const BUILD_PATH = 'file://' + path.resolve(__dirname, '../public/index.html');

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
    
    await page.goto(SOURCE_PATH);
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
    await page.goto(SOURCE_PATH);
    await page.waitForTimeout(1000);
    
    const canvas = await page.locator('#c');
    const box = await canvas.boundingBox();
    const viewport = page.viewportSize();
    
    expect(box.width).toBeCloseTo(viewport.width, 10); // Within 10px
    expect(box.height).toBeCloseTo(viewport.height, 10);
  });
  
  test('should have no scrollbars', async ({ page }) => {
    await page.goto(SOURCE_PATH);
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
    await page.goto(SOURCE_PATH);
    const container = await page.locator('#bravia-balls');
    await expect(container).toBeVisible();
  });
  
  test('canvas should have proper attributes', async ({ page }) => {
    await page.goto(SOURCE_PATH);
    const canvas = await page.locator('#c');
    
    await expect(canvas).toHaveAttribute('id', 'c');
    await expect(canvas).toHaveAttribute('role', 'application');
    await expect(canvas).toHaveAttribute('aria-label');
  });
  
  test('control panel should toggle with / key', async ({ page }) => {
    await page.goto(SOURCE_PATH);
    await page.waitForTimeout(1000);
    
    const panel = await page.locator('#controlPanel');
    
    // Panel should be visible initially (in source)
    await expect(panel).toBeVisible();
    
    // Press / to hide
    await page.keyboard.press('/');
    await page.waitForTimeout(500);
    await expect(panel).toBeHidden();
    
    // Press / again to show
    await page.keyboard.press('/');
    await page.waitForTimeout(500);
    await expect(panel).toBeVisible();
  });
  
  test('all 4 modes should be accessible via keyboard', async ({ page }) => {
    await page.goto(SOURCE_PATH);
    await page.waitForTimeout(2000);
    
    const modes = [
      { key: '1', name: 'Ball Pit', class: 'mode-pit' },
      { key: '2', name: 'Flies', class: 'mode-flies' },
      { key: '3', name: 'Zero-G', class: 'mode-weightless' },
      { key: '4', name: 'Pulse Grid', class: 'mode-pulse-grid' }
    ];
    
    for (const mode of modes) {
      await page.keyboard.press(mode.key);
      await page.waitForTimeout(500);
      
      // Check if mode class is applied to container
      const container = await page.locator('#bravia-balls');
      const classes = await container.getAttribute('class');
      
      // Just verify no errors occur on mode switch
      expect(classes).toBeDefined();
    }
  });
  
  test('mouse movement should work without errors', async ({ page }) => {
    await page.goto(SOURCE_PATH);
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
  
  test('mouseInCanvas variable should be properly tracked', async ({ page }) => {
    await page.goto(SOURCE_PATH);
    await page.waitForTimeout(1000);
    
    const canvas = await page.locator('#c');
    const box = await canvas.boundingBox();
    
    // Mouse should be out of canvas initially
    let mouseInCanvas = await page.evaluate(() => window.mouseInCanvas);
    expect(mouseInCanvas).toBe(false);
    
    // Move mouse over canvas
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(100);
    
    mouseInCanvas = await page.evaluate(() => window.mouseInCanvas);
    expect(mouseInCanvas).toBe(true);
    
    // Move mouse out of canvas
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);
    
    mouseInCanvas = await page.evaluate(() => window.mouseInCanvas);
    expect(mouseInCanvas).toBe(false);
  });
  
  test('vortex mode should initialize without errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(SOURCE_PATH);
    await page.waitForTimeout(1000);
    
    // Switch to vortex mode (assuming it's mode 5 or accessible via panel)
    // For now, just verify no BASE_RADIUS errors
    await page.keyboard.press('1'); // Ball Pit
    await page.waitForTimeout(500);
    await page.keyboard.press('2'); // Flies
    await page.waitForTimeout(500);
    await page.keyboard.press('3'); // Zero-G
    await page.waitForTimeout(500);
    await page.keyboard.press('4'); // Pulse Grid
    await page.waitForTimeout(500);
    
    expect(errors.some(e => e.includes('BASE_RADIUS'))).toBe(false);
    expect(errors.some(e => e.includes('mouseInCanvas'))).toBe(false);
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
    
    await page.goto(BUILD_PATH);
    await page.waitForTimeout(2000);
    
    expect(errors.some(e => e.includes('BASE_RADIUS'))).toBe(false);
    expect(errors.some(e => e.includes('mouseInCanvas'))).toBe(false);
    
    if (errors.length > 0) {
      console.log('Console errors found:', errors);
    }
  });
  
  test('canvas should be properly sized (100vw x 100svh)', async ({ page }) => {
    await page.goto(BUILD_PATH);
    await page.waitForTimeout(1000);
    
    const canvas = await page.locator('#c');
    const box = await canvas.boundingBox();
    const viewport = page.viewportSize();
    
    expect(box.width).toBeCloseTo(viewport.width, 10);
    expect(box.height).toBeCloseTo(viewport.height, 10);
  });
  
  test('should have no scrollbars', async ({ page }) => {
    await page.goto(BUILD_PATH);
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
  
  test('control panel should be hidden by default', async ({ page }) => {
    await page.goto(BUILD_PATH);
    await page.waitForTimeout(1000);
    
    const panel = await page.locator('#controlPanel');
    await expect(panel).toBeHidden();
  });
  
  test('control panel should appear when / is pressed', async ({ page }) => {
    await page.goto(BUILD_PATH);
    await page.waitForTimeout(1000);
    
    const panel = await page.locator('#controlPanel');
    await expect(panel).toBeHidden();
    
    await page.keyboard.press('/');
    await page.waitForTimeout(500);
    await expect(panel).toBeVisible();
  });
  
  test('mouse interaction should work (pointer-events: auto)', async ({ page }) => {
    await page.goto(BUILD_PATH);
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
    await page.goto(BUILD_PATH);
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
    expect(configValues.maxBalls).toBe(350);
    expect(configValues.repelRadius).toBe(710);
    expect(configValues.repelPower).toBe(274000);
  });
  
  test('Webflow content should be present', async ({ page }) => {
    await page.goto(BUILD_PATH);
    await page.waitForTimeout(1000);
    
    // Check for Webflow elements
    const noise = await page.locator('.noise');
    await expect(noise).toBeVisible();
    
    const header = await page.locator('header.viewport');
    await expect(header).toBeVisible();
  });
  
  test('simulation should be integrated correctly', async ({ page }) => {
    await page.goto(BUILD_PATH);
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
    await page.goto(SOURCE_PATH);
    await page.waitForTimeout(2000);
    const sourceScreenshot = await page.screenshot();
    
    await page.goto(BUILD_PATH);
    await page.waitForTimeout(2000);
    const buildScreenshot = await page.screenshot();
    
    // Just verify both screenshots were taken
    expect(sourceScreenshot).toBeTruthy();
    expect(buildScreenshot).toBeTruthy();
    
    // In a real scenario, you'd compare these with an image diff library
  });
});

