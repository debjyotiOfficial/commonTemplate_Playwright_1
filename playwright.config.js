// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: './test-report/html-report' }],
    ['junit', { outputFile: './test-report/test-results.xml' }],
    ['json', { outputFile: './test-report/test-results.json' }],
    ['list']
  ],
  timeout: 1800000, // 30 minutes timeout for parallel execution
  expect: {
    timeout: 120000,
  },
  use: {
    actionTimeout: 120000,
    navigationTimeout: 400000, // 6+ minutes for unified platform navigation
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

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
  ],
});