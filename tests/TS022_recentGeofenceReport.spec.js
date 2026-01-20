const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Recent geofence report', () => {
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

    test('should manage recent geofence report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);
            
        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        // Click on the geofence reports accordion button in the Geofencing menu
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Geofence Reports' }).click({ force: true });

        // Wait for the nested accordion to expand
        await page.waitForTimeout(2000);

        // Click on Recent Geofence Report menu (force click since it may be hidden initially)
        await page.locator(config.selectors.recentGeofenceReport.recentGeofenceMenu).click({ force: true });

        // Verify the container opens
        await expect(page.locator(config.selectors.recentGeofenceReport.recentGeofenceContainer)).toBeVisible();

        await page.locator('#geofence-status-dropdown').selectOption('Outside Geofence');

        // Wait for geofence dropdown to be populated after status change
        await page.waitForTimeout(3000);
        
        // Select the first available geofence option (skip "Select Geofence" placeholder)
        const geofenceOptions = await page.locator('#geofence-select-dropdown option').all();
        if (geofenceOptions.length > 1) {
            const firstOption = await geofenceOptions[1].getAttribute('value');
            if (firstOption) {
                await page.locator('#geofence-select-dropdown').selectOption(firstOption);
            }
        }
        
        await page.locator('#time-range-dropdown').selectOption('More than 30 Days');

        // Click on submit button
        await expect(page.locator(config.selectors.recentGeofenceReport.submitButton)).toBeVisible();
        await page.locator(config.selectors.recentGeofenceReport.submitButton).click();
        
        await page.waitForTimeout(5000); // Wait for the report to load

        // Verify all rows in the Status column contain only "Outside Geofence"
        const statusCells = page.locator('#recent-geofence-report-table tbody tr td:nth-child(4)');
        const statusCount = await statusCells.count();
        for (let i = 0; i < statusCount; i++) {
            await expect(statusCells.nth(i)).toContainText('Outside Geofence');
        }

        // Verify that the table has data rows (Recent Geofence Report doesn't have directions icons)
        const tableRows = page.locator('#recent-geofence-report-table tbody tr');
        const rowCount = await tableRows.count();
        expect(rowCount).toBeGreaterThanOrEqual(1);
        
        // Verify each row has expected data structure (Device Name, IMEI, Geofence Name, Status, etc.)
        for (let i = 0; i < rowCount; i++) {
            await expect(tableRows.nth(i).locator('td').first()).toBeVisible(); // Device Name column
        }

        // Hover over "Save file as" dropdown trigger
        await page.locator('#recent-geofence-report-panel button.dropdown__trigger').hover();

        // Click on "Excel"
        await page.locator('#recent-geofence-report-panel .dropdown__content .dropdown__item span').filter({ hasText: 'Excel' }).click({ force: true });

        // Hover and click "Save file as" again for next option
        await page.locator('#recent-geofence-report-panel button.dropdown__trigger').hover();

        // Click on "PDF"
        await page.locator('#recent-geofence-report-panel .dropdown__content .dropdown__item span').filter({ hasText: 'PDF' }).click({ force: true });

        // Hover and click "Save file as" again for next option
        await page.locator('#recent-geofence-report-panel button.dropdown__trigger').hover();

        // Click on "CSV"
        await page.locator('#recent-geofence-report-panel .dropdown__content .dropdown__item span').filter({ hasText: 'CSV' }).click({ force: true });

        // Click on copy button
        await page.locator('#recent-geofence-report-panel button.btn.btn--secondary').filter({ hasText: 'Copy' }).click({ force: true });

        // Recent Geofence Report table doesn't have directions icons like Current Geofence Report
        // Instead, verify the table structure and data content
        const firstRow = page.locator('#recent-geofence-report-table tbody tr').first();
        await expect(firstRow.locator('td').first()).toBeVisible(); // Device Name
        await expect(firstRow.locator('td').nth(1)).toBeVisible(); // IMEI
        await expect(firstRow.locator('td').nth(2)).toBeVisible(); // Geofence Name
    });
});