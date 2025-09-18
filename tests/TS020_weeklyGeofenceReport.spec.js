const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Weekly Geofencing reports', () => {
    let config;
    let helpers;

    test.beforeAll(async ({ browser }) => {
        // Create a page to load config
        const page = await browser.newPage();
        helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        await page.close();
    });

    test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.clearStorageAndSetTimeouts();
        
        // Set timeouts
        test.setTimeout(600000);
    });

    test('should manage recent geofence report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        
        await page.goto(config.urls.backAdminLoginPage);
        
        await expect(page.locator(config.selectors.login.usernameFieldBackup)).toBeVisible();
        await page.locator(config.selectors.login.usernameFieldBackup).clear();
        await page.locator(config.selectors.login.usernameFieldBackup).fill(config.credentials.demo.usernameBackup);

        await expect(page.locator(config.selectors.login.passwordFieldBackup)).toBeVisible();
        await page.locator(config.selectors.login.passwordFieldBackup).clear();
        await page.locator(config.selectors.login.passwordFieldBackup).fill(config.credentials.demo.passwordBackup);
        
        await expect(page.locator(config.selectors.login.submitButtonBackup)).toBeVisible();
        await page.locator(config.selectors.login.submitButtonBackup).click();

        await page.waitForTimeout(config.timeouts.wait);
        await page.goto(config.urls.fleetDashboard3);

        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        // Click on the geofence reports accordion button in the Geofencing menu
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Geofence Reports' }).click({ force: true });

        await expect(page.locator(config.selectors.weeklyGeofenceReport.weeklyGeofencingMenu)).toBeVisible();
        await page.locator(config.selectors.weeklyGeofenceReport.weeklyGeofencingMenu).click();

        // Verify the container opens
        await expect(page.locator(config.selectors.weeklyGeofenceReport.weeklyGeofencingContainer)).toBeVisible();

        // Click on the weekly geofence date range input
        await page.locator(config.selectors.weeklyGeofenceReport.dateRangePicker).click({ force: true });

        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('June');

        // Select May 1, 2025
        await page.locator('.flatpickr-day[aria-label="June 1, 2025"]').click({ force: true });

        // Click on copy button
        await page.locator(config.selectors.weeklyGeofenceReport.copyButton).filter({ hasText: 'Copy' }).click({ force: true });

        // Hover over "Save file as" dropdown trigger
        await page.locator(config.selectors.weeklyGeofenceReport.saveFileAs).hover();

        // Click on "Excel"
        await page.locator(config.selectors.weeklyGeofenceReport.excelButton).filter({ hasText: 'Excel' }).click({ force: true });

        // Hover and click "Save file as" again for next option
        await page.locator(config.selectors.weeklyGeofenceReport.saveFileAs).hover();

        // Click on "PDF"
        await page.locator(config.selectors.weeklyGeofenceReport.pdfButton).filter({ hasText: 'PDF' }).click({ force: true });

        // Hover and click "Save file as" again for next option
        await page.locator(config.selectors.weeklyGeofenceReport.saveFileAs).hover();

        // Click on "CSV"
        await page.locator(config.selectors.weeklyGeofenceReport.csvButton).filter({ hasText: 'CSV' }).click({ force: true });

        await page.waitForTimeout(4000);

        // Click on view chart button
        await expect(page.locator(config.selectors.weeklyGeofenceReport.viewChartButton)).toBeVisible();
        await page.locator(config.selectors.weeklyGeofenceReport.viewChartButton).click();

        // Verify the geofence chart modal is visible
        await expect(page.locator(config.selectors.weeklyGeofenceReport.geofenceChart)).toBeVisible();

        await page.waitForTimeout(2000);

        // Click on the vehicle select dropdown
        await expect(page.locator(config.selectors.weeklyGeofenceReport.vehicleSelect)).toBeVisible();
        await page.locator(config.selectors.weeklyGeofenceReport.vehicleSelect).selectOption('Sales car1');

        await page.waitForTimeout(2000);

        // Verify the chart is visible
        await expect(page.locator(config.selectors.weeklyGeofenceReport.geofenceChart)).toBeVisible();

        // Click on the close button to close the chart modal
        await expect(page.locator(config.selectors.weeklyGeofenceReport.closeButton)).toBeVisible();
        await page.locator(config.selectors.weeklyGeofenceReport.closeButton).click();
        
        await page.waitForTimeout(2000);

        // Click on search input and type "Sales car1"
        await expect(page.locator(config.selectors.weeklyGeofenceReport.searchInput)).toBeVisible();
        await page.locator(config.selectors.weeklyGeofenceReport.searchInput).clear();
        await page.locator(config.selectors.weeklyGeofenceReport.searchInput).fill('Sales car1');

        await page.waitForTimeout(2000);

        // Click on "View Details" button of the first row
        const firstRowButton = page.locator('#weekly-geofence-table tbody tr').first().locator('button.btn.btn--primary.view-details-btn');
        await expect(firstRowButton).toBeVisible();
        await firstRowButton.click();

        // Verify the geofence details modal is visible
        await expect(page.locator('#geofence-details-modal')).toBeVisible();

        await page.waitForTimeout(2000);
    });
});