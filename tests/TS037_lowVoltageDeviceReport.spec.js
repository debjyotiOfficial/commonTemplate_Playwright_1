const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Low Voltage Device Report', () => {
    let config;
    let helpers;

  test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        await page.close();
    });

  test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.clearStorageAndSetTimeouts();
        
        // Set timeouts
        test.setTimeout(600000); // 10 minutes for long test
    });

    test('should generate and validate low voltage device report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Click on reports menu
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.reportMenu).click();
        
        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Fleet' }).click();
        
        // Click on low voltage report menu
        await page.locator(config.selectors.lowVoltage.lowVoltageMenu).scrollIntoViewIfNeeded();
        await page.locator(config.selectors.lowVoltage.lowVoltageMenu).click({ force: true });

        // Verify modal is visible
        await expect(page.locator(config.selectors.lowVoltage.lowVoltageContainer)).toBeVisible();

        // Check radio button for -7 days
        await page.locator('input[type="radio"][name="low-voltage-duration"][value="-7 days"]').check({ force: true });

        // Click submit button
        await page.locator('#low-voltage-report-submit-btn').click();

        await page.waitForTimeout(5000);

        // Verify table exists
        await page.locator('#low-voltage-report-table').scrollIntoViewIfNeeded();
        await expect(page.locator('#low-voltage-report-table')).toBeVisible();
    });
});