const { test, expect } = require('@playwright/test');
const TestHelpers = require('./utils/test-helpers');

test('Debug Current Location Report', async ({ page }) => {
    test.setTimeout(60000);
    
    const helpers = new TestHelpers(page);
    const config = await helpers.getConfig();
    
    console.log('Starting debug...');
    
    await page.goto(config.urls.backAdminLoginPage);
    
    // Login
    await expect(page.locator(config.selectors.login.usernameFieldBackup)).toBeVisible();
    await page.locator(config.selectors.login.usernameFieldBackup).fill(config.credentials.demo.usernameBackup);
    await page.locator(config.selectors.login.passwordFieldBackup).fill(config.credentials.demo.passwordBackup);
    await page.locator(config.selectors.login.submitButtonBackup).click();

    await page.waitForTimeout(3000);
    await page.goto(config.urls.fleetDashboard3);
    await page.waitForTimeout(3000);

    console.log('Navigated to dashboard, looking for reports menu...');
    
    // Click reports menu
    const reportMenuSelector = config.selectors.navigation.reportMenu;
    console.log('Report menu selector:', reportMenuSelector);
    
    await expect(page.locator(reportMenuSelector)).toBeVisible();
    await page.locator(reportMenuSelector).click({ force: true });
    
    await page.waitForTimeout(2000);
    
    // Look for current location report button
    const currentLocationSelector = config.selectors.navigation.currentLocationReport;
    console.log('Current location selector:', currentLocationSelector);
    
    const isVisible = await page.locator(currentLocationSelector).isVisible();
    console.log('Current location report button visible:', isVisible);
    
    if (isVisible) {
        console.log('Clicking current location report...');
        await page.locator(currentLocationSelector).click({ force: true });
        await page.waitForTimeout(3000);
        
        // Check if container opened
        const containerVisible = await page.locator(config.selectors.currentLocationReport.currentLocationContainer).isVisible();
        console.log('Container visible:', containerVisible);
    } else {
        // Take a screenshot to see what's available
        await page.screenshot({ path: 'debug-no-current-location.png' });
        console.log('Current location button not visible - screenshot saved');
    }
});