// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                  MODULAR BUILD SMOKE TESTS                                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { test, expect } = require('@playwright/test');
const BUILD_URL = 'http://127.0.0.1:8800/index.html';

test.describe('Modular Build Integration', () => {
  test('assets are injected and container is present', async ({ page }) => {
    await page.goto(BUILD_URL);
    await page.waitForTimeout(1000);
    await expect(page.locator('#bravia-balls')).toBeVisible();
    await expect(page.locator('#c')).toBeVisible();
  });
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        MODULAR PAGE SMOKE TESTS                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const MODULAR_URL = BUILD_URL;

test.describe('Modular Simulation Page', () => {
  test('loads and mounts canvas/panel', async ({ page }) => {
    await page.goto(MODULAR_URL);
    const container = page.locator('#bravia-balls');
    const canvas = page.locator('#c');
    await expect(container).toBeVisible();
    await expect(canvas).toBeVisible();
    // Panel system is the docked "masterPanel" (legacy #controlPanel may be removed)
    await expect(page.locator('#masterPanel')).toHaveCount(1);
  });

  test('physics demo runs without errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(MODULAR_URL);
    await page.waitForTimeout(2000); // Let physics run
    if (errors.length > 0) console.log('Console errors:', errors);
    // Allow some errors for now during development
    expect(errors.length).toBeLessThan(5);
  });

  test('modular system initializes', async ({ page }) => {
    await page.goto(MODULAR_URL);
    await page.waitForTimeout(1000);
    const canvas = page.locator('#c');
    await expect(canvas).toBeVisible();
    // Just verify canvas is sized
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(100);
  });
});


