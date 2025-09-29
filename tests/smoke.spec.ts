import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Quick verification that the site loads and basic elements exist
 * These tests should run fast and catch catastrophic failures
 */

test.describe('Smoke Tests - Production Build', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to production build
    await page.goto('/public/');
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('page loads without errors', async ({ page }) => {
    // Check for console errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.waitForTimeout(2000);
    
    // Should have no JavaScript errors
    expect(errors).toEqual([]);
  });

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Alexander Beck Studio/);
  });

  test('Webflow content is visible', async ({ page }) => {
    // Check for main heading
    await expect(page.locator('text=Alexander Beck Studio')).toBeVisible();
    
    // Check for legend items
    await expect(page.locator('text=Creative Strategy')).toBeVisible();
    await expect(page.locator('text=Visual Design')).toBeVisible();
  });

  test('canvas element exists', async ({ page }) => {
    const canvas = page.locator('canvas#c');
    await expect(canvas).toBeAttached();
    await expect(canvas).toHaveAttribute('aria-label', 'Bouncy balls');
  });

  test('ball simulation container exists', async ({ page }) => {
    const container = page.locator('#bravia-balls');
    await expect(container).toBeAttached();
    await expect(container).toHaveClass(/ball-simulation/);
  });

  test('no control panel in production', async ({ page }) => {
    // Production should NOT have the control panel
    const panel = page.locator('#controlPanel');
    await expect(panel).not.toBeAttached();
  });

  test('JavaScript files load successfully', async ({ page }) => {
    const response = await page.request.get('/public/js/bouncy-balls-embed.js');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('javascript');
  });

  test('CSS files load successfully', async ({ page }) => {
    const cssFiles = [
      '/public/css/normalize.css',
      '/public/css/webflow.css',
      '/public/css/alexander-beck-studio-staging.webflow.css'
    ];
    
    for (const cssFile of cssFiles) {
      const response = await page.request.get(cssFile);
      expect(response.status()).toBe(200);
    }
  });
});

test.describe('Smoke Tests - Source File (Development)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to development source file
    await page.goto('/source/balls-source.html');
    await page.waitForLoadState('networkidle');
  });

  test('development page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.waitForTimeout(2000);
    
    expect(errors).toEqual([]);
  });

  test('control panel exists in development', async ({ page }) => {
    const panel = page.locator('#controlPanel');
    await expect(panel).toBeVisible();
  });

  test('FPS counter exists in development', async ({ page }) => {
    const fpsCounter = page.locator('#fps-counter');
    await expect(fpsCounter).toBeVisible();
    await expect(fpsCounter).toContainText('fps');
  });

  test('segment buttons exist', async ({ page }) => {
    await expect(page.locator('.segment-button[data-behavior="pit"]')).toBeVisible();
    await expect(page.locator('.segment-button[data-behavior="flies"]')).toBeVisible();
    await expect(page.locator('.segment-button[data-behavior="print"]')).toBeVisible();
  });
});
