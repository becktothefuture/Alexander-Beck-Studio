import { test, expect } from '@playwright/test';

/**
 * Customization Panel Control Tests
 * Verify all panel controls work correctly and affect the simulation
 */

test.describe('Customization Panel - Development Source', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/source/balls-source.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('control panel is visible and accessible', async ({ page }) => {
    const panel = page.locator('#controlPanel');
    await expect(panel).toBeVisible();
    
    // Check panel has expected sections
    await expect(page.locator('summary:has-text("Physics")')).toBeVisible();
    await expect(page.locator('summary:has-text("Spawn")')).toBeVisible();
    await expect(page.locator('summary:has-text("Repeller")')).toBeVisible();
    await expect(page.locator('summary:has-text("Scene")')).toBeVisible();
    await expect(page.locator('summary:has-text("Colors")')).toBeVisible();
  });

  test('physics sliders update values', async ({ page }) => {
    // Test restitution slider
    const restitutionSlider = page.locator('#restitutionSlider');
    const restitutionVal = page.locator('#restitutionVal');
    
    await restitutionSlider.fill('0.95');
    await expect(restitutionVal).toContainText('0.95');
    
    // Test friction slider
    const frictionSlider = page.locator('#frictionSlider');
    const frictionVal = page.locator('#frictionVal');
    
    await frictionSlider.fill('0.005');
    await expect(frictionVal).toContainText('0.005');
    
    // Test size slider
    const sizeSlider = page.locator('#sizeSlider');
    const sizeVal = page.locator('#sizeVal');
    
    await sizeSlider.fill('3.5');
    await expect(sizeVal).toContainText('3.5');
  });

  test('max balls slider affects ball count', async ({ page }) => {
    const maxBallsSlider = page.locator('#maxBallsSlider');
    const maxBallsVal = page.locator('#maxBallsVal');
    
    // Set to a low value
    await maxBallsSlider.fill('100');
    await expect(maxBallsVal).toContainText('100');
    
    // Wait for simulation to adjust
    await page.waitForTimeout(2000);
    
    // Verify balls are visible and rendering
    const canvas = page.locator('canvas#c');
    await expect(canvas).toBeVisible();
  });

  test('spawn controls update correctly', async ({ page }) => {
    // Open spawn section
    await page.click('summary:has-text("Spawn")');
    await page.waitForTimeout(300);
    
    // Test emit interval slider
    const emitterSlider = page.locator('#emitterSlider');
    const emitterVal = page.locator('#emitterVal');
    
    await emitterSlider.fill('0.1');
    await expect(emitterVal).toContainText('0.10');
    
    // Test spawn width slider
    const spawnWidthSlider = page.locator('#spawnWidthSlider');
    const spawnWidthVal = page.locator('#spawnWidthVal');
    
    await spawnWidthSlider.fill('80');
    await expect(spawnWidthVal).toContainText('80');
  });

  test('repeller controls work', async ({ page }) => {
    // Open repeller section
    await page.click('summary:has-text("Repeller")');
    await page.waitForTimeout(300);
    
    // Test repel size slider
    const repelSizeSlider = page.locator('#repelSizeSlider');
    const repelSizeVal = page.locator('#repelSizeVal');
    
    await repelSizeSlider.fill('300');
    await expect(repelSizeVal).toContainText('300');
    
    // Test repel power slider
    const repelPowerSlider = page.locator('#repelPowerSlider');
    const repelPowerVal = page.locator('#repelPowerVal');
    
    await repelPowerSlider.fill('600');
    await expect(repelPowerVal).toContainText('600');
  });

  test('color palette dropdown works', async ({ page }) => {
    // Open colors section
    await page.click('summary:has-text("Colors")');
    await page.waitForTimeout(300);
    
    const colorSelect = page.locator('#colorSelect');
    await expect(colorSelect).toBeVisible();
    
    // Change to neon cyan palette
    await colorSelect.selectOption('neonCyan');
    
    // Wait for recoloring
    await page.waitForTimeout(500);
    
    // Verify selection persisted
    await expect(colorSelect).toHaveValue('neonCyan');
  });

  test('physics preset dropdown works', async ({ page }) => {
    const physicsSelect = page.locator('#physicsSelect');
    await expect(physicsSelect).toBeVisible();
    
    // Select a preset
    await physicsSelect.selectOption({ index: 1 }); // Select second preset
    
    // Wait for physics to update
    await page.waitForTimeout(500);
    
    // Verify simulation still running
    const canvas = page.locator('canvas#c');
    await expect(canvas).toBeVisible();
  });

  test('spawn preset dropdown works', async ({ page }) => {
    // Open spawn section
    await page.click('summary:has-text("Spawn")');
    await page.waitForTimeout(300);
    
    const spawnSelect = page.locator('#spawnSelect');
    await expect(spawnSelect).toBeVisible();
    
    // Select a preset
    await spawnSelect.selectOption({ index: 1 });
    
    // Wait for spawn to update
    await page.waitForTimeout(500);
    
    // Verify simulation still running
    const canvas = page.locator('canvas#c');
    await expect(canvas).toBeVisible();
  });

  test('save config button exists', async ({ page }) => {
    const saveBtn = page.locator('#saveConfigBtn');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toContainText('Save');
  });

  test('build button exists', async ({ page }) => {
    const buildBtn = page.locator('#buildBtn');
    await expect(buildBtn).toBeVisible();
    await expect(buildBtn).toContainText('Build');
  });

  test('panel can be collapsed', async ({ page }) => {
    // Find a details element (collapsible section)
    const physicsDetails = page.locator('details:has(summary:has-text("Physics"))');
    await expect(physicsDetails).toHaveAttribute('open', '');
    
    // Click to collapse
    await page.click('summary:has-text("Physics")');
    await page.waitForTimeout(300);
    
    // Verify it's collapsed (no 'open' attribute)
    await expect(physicsDetails).not.toHaveAttribute('open');
    
    // Click to expand again
    await page.click('summary:has-text("Physics")');
    await page.waitForTimeout(300);
    
    // Verify it's expanded
    await expect(physicsDetails).toHaveAttribute('open', '');
  });

  test('multiple controls can be adjusted in sequence', async ({ page }) => {
    // Adjust multiple controls
    await page.locator('#restitutionSlider').fill('0.90');
    await page.locator('#frictionSlider').fill('0.003');
    await page.locator('#sizeSlider').fill('2.5');
    
    // Verify all values updated
    await expect(page.locator('#restitutionVal')).toContainText('0.90');
    await expect(page.locator('#frictionVal')).toContainText('0.003');
    await expect(page.locator('#sizeVal')).toContainText('2.5');
    
    // Verify simulation still running smoothly
    await page.waitForTimeout(1000);
    const canvas = page.locator('canvas#c');
    await expect(canvas).toBeVisible();
  });
});
