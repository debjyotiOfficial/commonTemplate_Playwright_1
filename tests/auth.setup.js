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
        waitUntil: 'domcontentloaded',
        timeout: 60000  // 1 minute for login page
    });

    console.log('Login page loaded, filling credentials...');

    // Wait for the page to be fully ready
    await page.waitForTimeout(2000);

    // Fill username field - use #username selector
    const usernameField = page.locator('#username');
    await usernameField.waitFor({ state: 'visible', timeout: 30000 });
    await usernameField.click();
    await usernameField.clear();
    await usernameField.fill(config.credentials.demo.usernameBackup);
    await page.waitForTimeout(500);
    console.log('Username filled:', await usernameField.inputValue());

    // Fill password field - use #password selector
    const passwordField = page.locator('#password');
    await passwordField.waitFor({ state: 'visible', timeout: 30000 });
    await passwordField.click();
    await passwordField.clear();
    await passwordField.fill(config.credentials.demo.passwordBackup);
    await page.waitForTimeout(500);
    console.log('Password filled');

    // Verify credentials are filled before submit
    const usernameValue = await usernameField.inputValue();
    const passwordValue = await passwordField.inputValue();
    console.log('Username value before submit:', usernameValue);
    console.log('Password filled:', passwordValue ? 'Yes (hidden)' : 'No');

    // Wait a bit for any JavaScript to process the filled values
    await page.waitForTimeout(2000);

    // Click submit button using JavaScript to bypass any event issues
    const submitButton = page.locator('.submit');
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });

    console.log('Clicking submit button...');

    // Use Promise.all with navigation wait and click
    try {
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
            submitButton.click()
        ]);
    } catch (navError) {
        console.log('Navigation wait failed, checking current state...');
    }

    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL after submit:', currentUrl);

    // If still on login page, the login failed
    if (currentUrl.includes('login.php')) {
        // Take a screenshot for debugging
        await page.screenshot({ path: 'login-debug.png' });
        console.log('Debug screenshot saved to login-debug.png');

        // Try submitting the form directly via JavaScript
        console.log('Trying JavaScript form submission...');
        await page.evaluate(() => {
            const form = document.querySelector('form');
            if (form) {
                form.submit();
            }
        });

        // Wait for navigation after JS submit
        await page.waitForURL('**/index.php**', { timeout: 60000 });
    }

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
