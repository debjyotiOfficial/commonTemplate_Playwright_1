const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Trip Report', () => {
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

    test('should generate and validate trip report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Click on reports menu
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.reportMenu).click();
        
        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Fleet' }).click();
        
        // Click on trip report menu
        await expect(page.locator(config.selectors.tripReport.tripReportMenu)).toBeVisible();
        await page.locator(config.selectors.tripReport.tripReportMenu).click();

        // Verify trip report container is visible
        await expect(page.locator(config.selectors.tripReport.tripReportContainer)).toBeVisible();

        // Select driver
        await page.locator(config.selectors.tripReport.driverSelect).selectOption("Sales car1");

        // Type 01-07-2025 in the date input
        await page.locator(config.selectors.tripReport.selectDate).clear();
        await page.locator(config.selectors.tripReport.selectDate).fill('2025-07-01');

        // Click on submit button
        await page.locator(config.selectors.tripReport.submitBtn).click();

        await page.waitForTimeout(config.timeouts.wait);

        // Click on Show entries dropdown and select 25
        await page.locator(config.selectors.tripReport.entry).selectOption('25');

        // Assert there are 25 rows in the table
        const tripReportRows = page.locator(config.selectors.tripReport.tripReportTable);
        const rowCount = await tripReportRows.count();
        expect(rowCount).toBe(25);

        // Click on "Map Trip" button of the first row of the table
        await page.locator(config.selectors.tripReport.tripReportTable).first().locator('button.map-it').click();
    });
});