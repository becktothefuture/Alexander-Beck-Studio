import { test, expect, Page } from '@playwright/test';

/**
 * Simulation Initialization Tests
 * Verify the ball simulation starts correctly and runs properly
 */

// Helper to check if animation is running by comparing canvas states
async function isAnimationRunning(page: Page): Promise<boolean> {
  const snapshot1 = await page.evaluate(() => {
    const canvas = document.querySelector('#c') as HTMLCanvasElement;
    if (!canvas) return '';
    return canvas.toDataURL();
  });
  
  await page.waitForTimeout(500);
  
  const snapshot2 = await page.evaluate(() => {
    const canvas = document.querySelector('#c') as HTMLCanvasElement;
    if (!canvas) return '';
    return canvas.toDataURL();
  });
  
  return snapshot1 !== snapshot2 && snapshot1.length > 0 && snapshot2.length > 0;
}

// Helper to check if canvas has rendered content (not blank)
async function hasCanvasContent(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const canvas = document.querySelector('#c') as HTMLCanvasElement;
    if (!canvas) return false;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Count non-transparent pixels
    let opaquePixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) opaquePixels++;
    }
    
    // Should have significant content (more than 1% of pixels)
    const threshold = (canvas.width * canvas.height) * 0.01;
    return opaquePixels > threshold;
  });
}

test.describe('Simulation Initialization - Production', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/public/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500); // Give simulation time to start
  });

  test('simulation initializes and starts automatically', async ({ page }) => {
    // Canvas should exist
    const canvas = page.locator('canvas#c');
    await expect(canvas).toBeAttached();
    
    // Canvas should have dimensions
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('canvas renders content on load', async ({ page }) => {
    const hasContent = await hasCanvasContent(page);
    expect(hasContent).toBe(true);
  });

  test('animation loop is running', async ({ page }) => {
    const isRunning = await isAnimationRunning(page);
    expect(isRunning).toBe(true);
  });

  test('FPS counter is NOT visible in production', async ({ page }) => {
    const fpsCounter = page.locator('#fps-counter');
    await expect(fpsCounter).not.toBeVisible();
  });

  test('balls spawn over time', async ({ page }) => {
    // Take initial snapshot
    const initialContent = await page.evaluate(() => {
      const canvas = document.querySelector('#c') as HTMLCanvasElement;
      if (!canvas) return 0;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let opaquePixels = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 200) opaquePixels++;
      }
      return opaquePixels;
    });
    
    // Wait for more balls to spawn
    await page.waitForTimeout(3000);
    
    // Take second snapshot
    const laterContent = await page.evaluate(() => {
      const canvas = document.querySelector('#c') as HTMLCanvasElement;
      if (!canvas) return 0;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let opaquePixels = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 200) opaquePixels++;
      }
      return opaquePixels;
    });
    
    // Should have more content (more balls spawned)
    expect(laterContent).toBeGreaterThan(initialContent);
  });

  test('no JavaScript errors during initialization', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    // Wait for simulation to run
    await page.waitForTimeout(3000);
    
    expect(errors).toEqual([]);
  });

  test('simulation respects viewport size', async ({ page }) => {
    const canvas = page.locator('canvas#c');
    const canvasBox = await canvas.boundingBox();
    const viewportSize = page.viewportSize();
    
    expect(canvasBox).not.toBeNull();
    expect(viewportSize).not.toBeNull();
    
    // Canvas width should match viewport
    expect(canvasBox!.width).toBe(viewportSize!.width);
    
    // Canvas height should be 150vh (1.5x viewport height)
    expect(canvasBox!.height).toBeGreaterThan(viewportSize!.height);
  });
});

test.describe('Simulation Initialization - Development', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/source/balls-source.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  });

  test('simulation starts with control panel visible', async ({ page }) => {
    const canvas = page.locator('canvas#c');
    const panel = page.locator('#controlPanel');
    
    await expect(canvas).toBeVisible();
    await expect(panel).toBeVisible();
  });

  test('FPS counter is visible and updating', async ({ page }) => {
    const fpsCounter = page.locator('#fps-counter');
    await expect(fpsCounter).toBeVisible();
    
    // Wait for FPS to calculate
    await page.waitForTimeout(2000);
    
    const renderFps = page.locator('#render-fps');
    const physicsFps = page.locator('#physics-fps');
    
    const renderText = await renderFps.textContent();
    const physicsText = await physicsFps.textContent();
    
    // Should not be default '--' value
    expect(renderText).not.toBe('--');
    expect(physicsText).not.toBe('--');
    
    // Should be numeric values
    const renderValue = parseInt(renderText || '0');
    const physicsValue = parseInt(physicsText || '0');
    
    expect(renderValue).toBeGreaterThan(0);
    expect(physicsValue).toBeGreaterThan(0);
  });

  test('canvas renders and animates', async ({ page }) => {
    const hasContent = await hasCanvasContent(page);
    expect(hasContent).toBe(true);
    
    const isRunning = await isAnimationRunning(page);
    expect(isRunning).toBe(true);
  });

  test('default preset is applied on load', async ({ page }) => {
    // Check that physics preset has a selected value
    const physicsSelect = page.locator('#physicsSelect');
    const selectedValue = await physicsSelect.inputValue();
    
    expect(selectedValue).toBeTruthy();
    expect(selectedValue.length).toBeGreaterThan(0);
  });

  test('simulation runs smoothly for extended period', async ({ page }) => {
    // Monitor for errors over 10 seconds
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    // Run for 10 seconds
    await page.waitForTimeout(10000);
    
    // Should have no errors
    expect(errors).toEqual([]);
    
    // Animation should still be running
    const isRunning = await isAnimationRunning(page);
    expect(isRunning).toBe(true);
  });

  test('canvas responds to window resize', async ({ page }) => {
    const canvas = page.locator('canvas#c');
    
    // Get initial size
    const initialBox = await canvas.boundingBox();
    expect(initialBox).not.toBeNull();
    
    // Resize viewport
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);
    
    // Get new size
    const newBox = await canvas.boundingBox();
    expect(newBox).not.toBeNull();
    
    // Canvas width should have changed
    expect(newBox!.width).not.toBe(initialBox!.width);
    
    // Simulation should still be running
    const isRunning = await isAnimationRunning(page);
    expect(isRunning).toBe(true);
  });

  test('keyboard shortcuts work', async ({ page }) => {
    const panel = page.locator('#controlPanel');
    
    // Panel should be visible initially
    await expect(panel).toBeVisible();
    
    // Press '/' to toggle panel
    await page.keyboard.press('/');
    await page.waitForTimeout(300);
    
    // Panel should have 'hidden' class
    await expect(panel).toHaveClass(/hidden/);
    
    // Press '/' again to show
    await page.keyboard.press('/');
    await page.waitForTimeout(300);
    
    // Panel should be visible again
    await expect(panel).not.toHaveClass(/hidden/);
  });

  test('R key resets balls', async ({ page }) => {
    // Wait for some balls to spawn
    await page.waitForTimeout(2000);
    
    // Take snapshot before reset
    const before = await page.evaluate(() => {
      const canvas = document.querySelector('#c') as HTMLCanvasElement;
      return canvas ? canvas.toDataURL() : '';
    });
    
    // Press 'r' to reset
    await page.keyboard.press('r');
    await page.waitForTimeout(500);
    
    // Take snapshot after reset
    const after = await page.evaluate(() => {
      const canvas = document.querySelector('#c') as HTMLCanvasElement;
      return canvas ? canvas.toDataURL() : '';
    });
    
    // Snapshots should be different (balls repositioned)
    expect(before).not.toBe(after);
    
    // Animation should still be running
    const isRunning = await isAnimationRunning(page);
    expect(isRunning).toBe(true);
  });
});
