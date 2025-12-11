// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                  MODULAR SOURCE (DEV) PAGE TESTS                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { test, expect } = require('@playwright/test');
const path = require('path');

const MODULAR_SOURCE_PATH = 'file://' + path.resolve(__dirname, '../source/source-modular.html');

test.describe('Modular Source Dev Page', () => {
  test('loads ES6 modules and runs', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
      if (msg.type() === 'log') console.log('Browser log:', msg.text());
    });
    
    await page.goto(MODULAR_SOURCE_PATH);
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }
    
    const canvas = page.locator('#c');
    await expect(canvas).toBeVisible();
    
    const container = page.locator('#bravia-balls');
    await expect(container).toBeVisible();
    
    // Should have some content (balls or panel)
    expect(errors.length).toBeLessThan(3);
  });
});


