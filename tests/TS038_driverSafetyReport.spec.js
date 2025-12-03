const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Driver Safety Report', () => {
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

    test('should generate and validate driver safety report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Click on reports menu
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.reportMenu).click();
        
        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Fleet' }).click();
        
        // Click on driver safety report menu
        await page.locator(config.selectors.driverSafetyReport.driverSafetyMenu).scrollIntoViewIfNeeded();
        await page.locator(config.selectors.driverSafetyReport.driverSafetyMenu).click({ force: true });

        // Verify driver safety report container is visible
        await expect(page.locator(config.selectors.driverSafetyReport.driverSafetyContainer)).toBeVisible();

        // Click on the Select dropdown to open options
        await page.locator('#driver-safety-device-select').selectOption('Sales car1');

        // Click on submit button
        await expect(page.locator(config.selectors.driverSafetyReport.submitButton)).toBeVisible();
        await page.locator(config.selectors.driverSafetyReport.submitButton).click();
        
        // Wait for value to load
        await page.waitForTimeout(config.timeouts.wait);
        
        // Wait for driver safety report to load
        await expect(page.locator(config.selectors.driverSafetyReport.driverModal)).toBeVisible();
        
        // Verify the safety score is displayed
        await expect(page.locator(config.selectors.driverSafetyReport.safetyScore)).not.toBeEmpty();
    });
});