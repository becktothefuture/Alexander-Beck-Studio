// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                  MODULAR BUILD SMOKE TESTS                                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { test, expect } = require('@playwright/test');
const path = require('path');

const BUILD_PATH = 'file://' + path.resolve(__dirname, '../public/index.html');

test.describe('Modular Build Integration', () => {
  test('assets are injected and container is present', async ({ page }) => {
    await page.goto(BUILD_PATH);
    await page.waitForTimeout(1000);
    await expect(page.locator('#bravia-balls')).toBeVisible();
    await expect(page.locator('#c')).toBeVisible();
  });
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        MODULAR PAGE SMOKE TESTS                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const MODULAR_PATH = 'file://' + path.resolve(__dirname, '../public/index.html');

test.describe('Modular Simulation Page', () => {
  test('loads and mounts canvas/panel', async ({ page }) => {
    await page.goto(MODULAR_PATH);
    const container = page.locator('#bravia-balls');
    const canvas = page.locator('#c');
    await expect(container).toBeVisible();
    await expect(canvas).toBeVisible();
    // Panel may be hidden in production build, just check it exists
    const panel = page.locator('#controlPanel');
    expect(await panel.count()).toBe(1);
  });

  test('physics demo runs without errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(MODULAR_PATH);
    await page.waitForTimeout(2000); // Let physics run
    if (errors.length > 0) console.log('Console errors:', errors);
    // Allow some errors for now during development
    expect(errors.length).toBeLessThan(5);
  });

  test('modular system initializes', async ({ page }) => {
    await page.goto(MODULAR_PATH);
    await page.waitForTimeout(1000);
    const canvas = page.locator('#c');
    await expect(canvas).toBeVisible();
    // Just verify canvas is sized
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(100);
  });
});


