const { test: setup } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const authFile = path.join(__dirname, '../.auth/user.json');

// Session validity duration (in milliseconds) - 1 hour
const SESSION_VALIDITY_MS = 60 * 60 * 1000;

setup('authenticate', async ({ page }, testInfo) => {
    // Set timeout for auth setup
    testInfo.setTimeout(300000); // 5 minutes max

    // Check if a valid auth session already exists
    if (fs.existsSync(authFile)) {
        const stats = fs.statSync(authFile);
        const fileAge = Date.now() - stats.mtimeMs;

        if (fileAge < SESSION_VALIDITY_MS) {
            console.log('Valid authentication session found (age: ' + Math.round(fileAge / 1000 / 60) + ' minutes). Skipping login.');
            return; // Skip authentication - session is still valid
        } else {
            console.log('Authentication session expired (age: ' + Math.round(fileAge / 1000 / 60) + ' minutes). Re-authenticating...');
        }
    }

    // Read config
    const configPath = path.join(__dirname, '../fixtures/tlr-config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData).testConfig;

    console.log('Performing authentication setup...');

    // Login page
    const loginUrl = config.urls.backAdminLoginPage;

    await page.goto(loginUrl, {
        waitUntil: 'networkidle',
        timeout: 60000  // 1 minute for login page
    });

    console.log('Login page loaded, filling credentials...');

    // Fill username field - use #username selector
    const usernameField = page.locator('#username');
    await usernameField.waitFor({ state: 'visible', timeout: 30000 });
    await usernameField.clear();
    await usernameField.fill(config.credentials.demo.usernameBackup);
    console.log('Username filled');

    // Fill password field - use #password selector
    const passwordField = page.locator('#password');
    await passwordField.waitFor({ state: 'visible', timeout: 30000 });
    await passwordField.clear();
    await passwordField.fill(config.credentials.demo.passwordBackup);
    console.log('Password filled');

    // Click submit button and wait for navigation
    const submitButton = page.locator('.submit');
    await submitButton.click();
    console.log('Submit clicked, waiting for login to complete...');

    // Wait for navigation away from login page (to index.php)
    await page.waitForURL('**/index.php**', { timeout: 60000 });
    console.log('Login successful! Redirected to:', page.url());

    // Wait for session to be fully established
    await page.waitForTimeout(3000);

    // Navigate to the fleet dashboard to ensure session is valid for all test pages
    console.log('Navigating to fleet dashboard...');
    await page.goto(config.urls.fleetDashboard3, {
        waitUntil: 'load',
        timeout: 180000  // 3 minutes - dashboard can be slow to load
    });

    // Wait for the dashboard to load - look for a common element
    await page.waitForSelector('body', {
        state: 'visible',
        timeout: 60000
    });

    console.log('Dashboard loaded, saving session state...');

    // Ensure .auth directory exists
    const authDir = path.dirname(authFile);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    // Save the authenticated state
    await page.context().storageState({ path: authFile });

    console.log('Session state saved to:', authFile);
});
