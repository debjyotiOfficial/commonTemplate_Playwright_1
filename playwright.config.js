const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Check if running on BrowserStack
const isBrowserStack = !!(process.env.BROWSERSTACK_BUILD_NAME || process.env.BROWSERSTACK_USERNAME);

// Check if auth file exists (for local runs)
const authFile = path.join(__dirname, '.auth', 'user.json');
const authFileExists = fs.existsSync(authFile);

/**
 * @see https://playwright.dev/docs/test-configuration
 *
 * AUTH SETUP STRATEGY:
 * - LOCAL: Runs auth.setup.js first, saves session to .auth/user.json, subsequent tests reuse it
 * - BROWSERSTACK: Each test performs its own login (auth file not available on remote)
 */
module.exports = defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: isBrowserStack ? true : false, // Parallel on BrowserStack, sequential locally for auth reuse
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test-reports/html' }],
    ['json', { outputFile: 'test-reports/json/test-results.json' }],
    ['junit', { outputFile: 'test-reports/junit.xml' }],
    ['list'],
    ['./reporters/custom-reporter.js', { outputDir: 'test-reports/custom' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* Global timeout settings */
    actionTimeout: 30000,
    navigationTimeout: 60000,
    testTimeout: 1800000, // 30 minutes per test
  },

  /* Configure projects for major browsers */
  projects: isBrowserStack ? [
    // BROWSERSTACK: Single project without auth setup (each test handles its own login)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        headless: true
        // No storageState - each test performs its own login
      },
    },
  ] : [
    // LOCAL: Auth setup project runs first, then tests use stored session
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        headless: true
      },
    },
    {
      name: 'chromium',
      dependencies: ['setup'], // Wait for auth setup to complete
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        headless: true,
        // Use the authenticated state from setup (only for local runs)
        storageState: '.auth/user.json',
      },
    },
  ],

  /* Global setup and teardown */
  // globalSetup: './utils/auth-setup.js', // Disabled - using project-based setup instead
  // globalTeardown: './utils/global-teardown.js',

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
