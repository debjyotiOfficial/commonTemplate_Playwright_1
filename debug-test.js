const { test, expect } = require('@playwright/test');
const TestHelpers = require('./utils/test-helpers');

test('Debug Travel Log Report', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const config = await helpers.getConfig();
    
    await page.goto(config.urls.backAdminLoginPage);
    
    // Login
    await expect(page.locator(config.selectors.login.usernameFieldBackup)).toBeVisible();
    await page.locator(config.selectors.login.usernameFieldBackup).fill(config.credentials.demo.usernameBackup);
    await page.locator(config.selectors.login.passwordFieldBackup).fill(config.credentials.demo.passwordBackup);
    await page.locator(config.selectors.login.submitButtonBackup).click();

    await page.waitForTimeout(3000);
    await page.goto(config.urls.fleetDashboard3);

    // Click reports menu
    await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
    await page.locator(config.selectors.navigation.reportMenu).click({ force: true });
    
    await page.waitForTimeout(2000);
    
    // Click travel log report
    await expect(page.locator(config.selectors.navigation.trackReportMenu)).toBeVisible();
    await page.locator(config.selectors.navigation.trackReportMenu).click({ force: true });
    
    // Wait and check if modal opens
    await page.waitForTimeout(3000);
    
    // Take a screenshot to see the current state
    await page.screenshot({ path: 'debug-modal.png' });
    
    // Check what elements are visible
    const modalVisible = await page.locator(config.selectors.modal.container).isVisible();
    const calendarBtn = await page.locator('#travel-log-report-calendar-btn').isVisible();
    
    console.log('Modal visible:', modalVisible);
    console.log('Calendar button visible:', calendarBtn);
    
    if (modalVisible) {
        console.log('Modal opened successfully');
    } else {
        console.log('Modal did not open');
    }
});