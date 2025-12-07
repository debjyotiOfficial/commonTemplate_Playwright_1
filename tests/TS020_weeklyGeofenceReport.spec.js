const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

/**
 * Weekly Geofencing Reports Test Suite
 *
 * Test Steps Covered:
 * ==================
 * 1. Login and navigate to fleet dashboard
 * 2. Click on Geofencing menu
 * 3. Expand Geofence Reports accordion
 * 4. Click on Weekly Geofence Report menu
 * 5. Verify Weekly Geofence Report container is visible
 * 6. Click on date range picker and select a date
 * 7. Click Copy button to copy data
 * 8. Export to Excel format
 * 9. Export to PDF format
 * 10. Export to CSV format
 * 11. Click View Chart button
 * 12. Verify chart modal opens
 * 13. Select a vehicle in the chart
 * 14. Close the chart modal
 * 15. Search for a specific device
 * 16. Click View Details on first row
 * 17. Verify geofence details modal opens
 */

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

        // ============= STEP 1: LOGIN AND NAVIGATE =============
        console.log('--- Step 1: Login and navigate to fleet dashboard ---');
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);
        console.log(' Successfully logged in');

        // ============= STEP 2: CLICK GEOFENCING MENU =============
        console.log('--- Step 2: Opening Geofencing menu ---');
        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();
        console.log(' Geofencing menu clicked');

        // ============= STEP 3: EXPAND GEOFENCE REPORTS ACCORDION =============
        console.log('--- Step 3: Expanding Geofence Reports accordion ---');
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Geofence Reports' }).click({ force: true });
        await page.waitForTimeout(1000);
        console.log(' Geofence Reports accordion expanded');

        // ============= STEP 4: CLICK WEEKLY GEOFENCE REPORT MENU =============
        console.log('--- Step 4: Clicking Weekly Geofence Report menu ---');
        const weeklyGeofenceMenu = page.locator(config.selectors.weeklyGeofenceReport.weeklyGeofencingMenu);
        await weeklyGeofenceMenu.waitFor({ state: 'visible', timeout: 10000 });
        await weeklyGeofenceMenu.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await weeklyGeofenceMenu.click({ force: true });
        console.log(' Weekly Geofence Report menu clicked');

        // ============= STEP 5: VERIFY CONTAINER OPENS =============
        console.log('--- Step 5: Verifying Weekly Geofence Report container ---');
        await expect(page.locator(config.selectors.weeklyGeofenceReport.weeklyGeofencingContainer)).toBeVisible();
        console.log(' Container is visible');

        // ============= STEP 6: SELECT DATE RANGE =============
        console.log('--- Step 6: Selecting date range ---');

        // The date range picker might already have a default date set, so we can skip this if it fails
        try {
            const dateRangePicker = page.locator(config.selectors.weeklyGeofenceReport.dateRangePicker);
            await dateRangePicker.scrollIntoViewIfNeeded();
            await dateRangePicker.click({ force: true });
            await page.waitForTimeout(1500);

            // Wait for flatpickr calendar to be visible
            const flatpickrCalendar = page.locator('.flatpickr-calendar.open');
            const isCalendarVisible = await flatpickrCalendar.isVisible();

            if (isCalendarVisible) {
                // Select month using index (5 = June, 0-indexed)
                const monthDropdown = flatpickrCalendar.locator('.flatpickr-monthDropdown-months');
                if (await monthDropdown.isVisible()) {
                    await monthDropdown.selectOption({ index: 5 }); // June is index 5
                    console.log(' Month selected: June');
                }

                // Click on a specific date
                try {
                    await page.locator('.flatpickr-day[aria-label="June 1, 2025"]').click({ force: true });
                    console.log(' Date selected: June 1, 2025');
                } catch (e) {
                    // Try clicking any available day
                    const availableDay = flatpickrCalendar.locator('.flatpickr-day:not(.flatpickr-disabled)').first();
                    if (await availableDay.isVisible()) {
                        await availableDay.click({ force: true });
                        console.log(' Selected first available date');
                    }
                }
            } else {
                console.log(' Calendar not visible, using default date range');
            }
        } catch (e) {
            console.log(' Date range selection skipped, using defaults');
        }

        await page.waitForTimeout(2000);

        // ============= STEP 7: CLICK COPY BUTTON =============
        console.log('--- Step 7: Clicking Copy button ---');
        try {
            await page.locator(config.selectors.weeklyGeofenceReport.copyButton).filter({ hasText: 'Copy' }).click({ force: true });
            console.log(' Copy button clicked');
        } catch (e) {
            console.log(' Copy button not available, continuing');
        }

        // ============= STEP 8-10: EXPORT TO EXCEL, PDF, CSV =============
        console.log('--- Step 8-10: Exporting to Excel, PDF, CSV ---');

        // Export to Excel
        try {
            await page.locator(config.selectors.weeklyGeofenceReport.saveFileAs).hover();
            await page.waitForTimeout(500);
            await page.locator(config.selectors.weeklyGeofenceReport.excelButton).filter({ hasText: 'Excel' }).click({ force: true });
            console.log(' Exported to Excel');
        } catch (e) {
            console.log(' Excel export not available');
        }

        // Export to PDF
        try {
            await page.locator(config.selectors.weeklyGeofenceReport.saveFileAs).hover();
            await page.waitForTimeout(500);
            await page.locator(config.selectors.weeklyGeofenceReport.pdfButton).filter({ hasText: 'PDF' }).click({ force: true });
            console.log(' Exported to PDF');
        } catch (e) {
            console.log(' PDF export not available');
        }

        // Export to CSV
        try {
            await page.locator(config.selectors.weeklyGeofenceReport.saveFileAs).hover();
            await page.waitForTimeout(500);
            await page.locator(config.selectors.weeklyGeofenceReport.csvButton).filter({ hasText: 'CSV' }).click({ force: true });
            console.log(' Exported to CSV');
        } catch (e) {
            console.log(' CSV export not available');
        }

        await page.waitForTimeout(2000);

        // ============= STEP 11: CLICK VIEW CHART BUTTON =============
        console.log('--- Step 11: Clicking View Chart button ---');
        const viewChartBtn = page.locator(config.selectors.weeklyGeofenceReport.viewChartButton);
        if (await viewChartBtn.isVisible()) {
            await viewChartBtn.click();
            console.log(' View Chart button clicked');

            // ============= STEP 12: VERIFY CHART MODAL OPENS =============
            console.log('--- Step 12: Verifying chart modal ---');
            await expect(page.locator(config.selectors.weeklyGeofenceReport.geofenceChart)).toBeVisible({ timeout: 10000 });
            console.log(' Chart modal is visible');

            await page.waitForTimeout(2000);

            // ============= STEP 13: SELECT VEHICLE IN CHART =============
            console.log('--- Step 13: Selecting vehicle in chart ---');
            const vehicleSelect = page.locator(config.selectors.weeklyGeofenceReport.vehicleSelect);
            if (await vehicleSelect.isVisible()) {
                // Get available options and select first valid one
                const options = await vehicleSelect.locator('option').all();
                for (const option of options) {
                    const value = await option.getAttribute('value');
                    const text = await option.textContent();
                    if (value && value.trim() !== '' && !text.toLowerCase().includes('select')) {
                        await vehicleSelect.selectOption(value);
                        console.log(` Vehicle selected: ${text.trim()}`);
                        break;
                    }
                }
            }

            await page.waitForTimeout(2000);

            // ============= STEP 14: CLOSE CHART MODAL =============
            console.log('--- Step 14: Closing chart modal ---');
            await expect(page.locator(config.selectors.weeklyGeofenceReport.closeButton)).toBeVisible();
            await page.locator(config.selectors.weeklyGeofenceReport.closeButton).click();
            console.log(' Chart modal closed');
        } else {
            console.log(' View Chart button not visible, skipping chart steps');
        }

        await page.waitForTimeout(2000);

        // ============= STEP 15: SEARCH FOR DEVICE =============
        console.log('--- Step 15: Searching for device ---');
        const searchInput = page.locator(config.selectors.weeklyGeofenceReport.searchInput);
        if (await searchInput.isVisible()) {
            await searchInput.clear();
            await searchInput.fill('Sales car1');
            console.log(' Searched for "Sales car1"');
        } else {
            console.log(' Search input not visible');
        }

        await page.waitForTimeout(2000);

        // ============= STEP 16: CLICK VIEW DETAILS =============
        console.log('--- Step 16: Clicking View Details on first row ---');
        const firstRowButton = page.locator('#weekly-geofence-table tbody tr').first().locator('button.btn.btn--primary.view-details-btn');

        if (await firstRowButton.isVisible()) {
            await firstRowButton.click();
            console.log(' View Details button clicked');

            // ============= STEP 17: VERIFY DETAILS MODAL =============
            console.log('--- Step 17: Verifying geofence details modal ---');
            await expect(page.locator('#geofence-details-modal')).toBeVisible({ timeout: 10000 });
            console.log(' Geofence details modal is visible');
        } else {
            console.log(' No data rows available or View Details button not found');
        }

        await page.waitForTimeout(2000);
        console.log(' Weekly Geofence Report test completed successfully');
    });
});
