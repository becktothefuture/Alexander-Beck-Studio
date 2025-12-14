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

  // Run tests against real HTTP servers (avoid file:// CORS/fetch restrictions).
  // We serve:
  // - public/  → http://127.0.0.1:8000
  // - source/  → http://127.0.0.1:8001
  webServer: [
    {
      // Silence request logs to keep test output readable.
      command: 'npm run build && cd public && python3 -m http.server 8800 > /dev/null 2>&1',
      url: 'http://127.0.0.1:8800',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      // Silence request logs to keep test output readable.
      command: 'node scripts/sync-webflow-assets.js && cd source && python3 -m http.server 8801 > /dev/null 2>&1',
      url: 'http://127.0.0.1:8801',
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000,
    },
  ],
  
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

