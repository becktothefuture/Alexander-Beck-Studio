// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      PLAYWRIGHT TEST CONFIGURATION                          ║
// ║                   Bouncy Balls Simulation Test Suite                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  
  // Maximum time one test can run for
  timeout: 30 * 1000,
  
  // Test match pattern
  testMatch: '**/*.spec.js',
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Reporter to use
  reporter: 'html',
  
  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    // baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});

