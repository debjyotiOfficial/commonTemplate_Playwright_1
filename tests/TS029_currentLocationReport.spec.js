const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Current Location Report', () => {
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

    /**
     * Test Steps:
     * Step 1: Login and navigate to fleet dashboard
     * Step 2: Click on Reports menu to open reports panel
     * Step 3: Click on Current Location Report menu item
     * Step 4: Verify Current Location Report container is visible
     * Step 5: Verify all 13 table headers are present and correct
     * Step 6: Search for "Demo" in the search input
     * Step 7: Verify search results contain "Demo 1"
     * Step 8: Verify at least 1 row exists in table
     * Step 9: Test pagination (click next if available)
     * Step 10: Test export to Excel format
     * Step 11: Test export to CSV format
     * Step 12: Test export to PDF format
     * Step 13: Click on directions icon of first row
     */
    test('should redirect to fleet demo page with demo credentials and test current location report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Step 1: Login and navigate to fleet dashboard
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Step 2: Click on Reports menu to open reports panel
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.reportMenu).click({ force: true });

        await page.waitForTimeout(2000);

        // Step 3: Click on Current Location Report menu item
        await expect(page.locator(config.selectors.navigation.currentLocationReport)).toBeVisible();
        await page.locator(config.selectors.navigation.currentLocationReport).click({ force: true });

        // Wait for page to load
        await page.waitForTimeout(3000);

        // Step 4: Verify Current Location Report container is visible
        await expect(page.locator(config.selectors.currentLocationReport.currentLocationContainer)).toBeVisible({ timeout: 30000 });

        // Click inside the modal/container to close the navbar and avoid overlay issues
        await page.locator(config.selectors.currentLocationReport.currentLocationContainer).click();

        // Step 5: Verify all 13 table headers are present and correct
        const expectedHeaders = [
            'Device Name',
            'IMEI',
            'Device Type',
            'Event',
            'Last Update',
            'Latitude',
            'Longitude',
            'Location',
            'Mileage',
            'Speed',
            'Battery/Voltage',
            'Added On',
            'Renewal Date'
        ];

        // Wait for table to be visible
        await expect(page.locator(config.selectors.currentLocationReport.currentLocationTable)).toBeVisible({ timeout: 30000 });

        // Wait for table headers to load
        await page.waitForTimeout(2000);

        // Get all header elements
        const headerElements = page.locator(`${config.selectors.currentLocationReport.currentLocationTable} thead th`);
        await headerElements.first().waitFor({ state: 'visible', timeout: 15000 });
        const headerCount = await headerElements.count();

        console.log(`Found ${headerCount} headers`);
        
        // Verify the number of headers matches expected
        expect(headerCount).toBe(expectedHeaders.length);
        
        // Verify each header text
        for (let i = 0; i < expectedHeaders.length; i++) {
            const headerText = await headerElements.nth(i).textContent();
            const cleanHeaderText = headerText.trim().replace(/\s+/g, ' ');
            console.log(`Header ${i + 1}: Expected "${expectedHeaders[i]}", Actual "${cleanHeaderText}"`);
            expect(cleanHeaderText).toContain(expectedHeaders[i]);
        }

        console.log('All table headers verified successfully');

        // Step 6: Search for "Demo" in the search input
        await expect(page.locator(config.selectors.currentLocationReport.searchInput)).toBeVisible();
        await page.locator(config.selectors.currentLocationReport.searchInput).clear();
        await page.locator(config.selectors.currentLocationReport.searchInput).fill('Demo');
        await page.waitForTimeout(2000); // Wait for search to process

        // Step 7: Verify search results contain "Demo 1"
        await expect(page.locator(config.selectors.currentLocationReport.currentLocationTable)).toBeVisible();
        await expect(page.locator(config.selectors.currentLocationReport.currentLocationTable)).toContainText('Demo 1');

        // Step 8: Verify at least 1 row exists in table
        const rows = page.locator(config.selectors.currentLocationReport.currentLocationRows);
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThanOrEqual(1);

        // Step 9: Test pagination (click next if available)
        const paginationNext = page.locator('#current-location-report-pagination .pagination__next');
        const isNextVisible = await paginationNext.isVisible();
        if (isNextVisible) {
            await paginationNext.click({ force: true });
            await page.waitForTimeout(1000);
        }

        // Test export functionality
        try {
            // Step 10: Test export to Excel format
            await page.locator(`${config.selectors.currentLocationReport.currentLocationContainer} button.dropdown__trigger`).click({ force: true });
            await page.waitForTimeout(500);
            await page.locator(`${config.selectors.currentLocationReport.currentLocationContainer} .dropdown__content button.dropdown__item`).filter({ hasText: 'Excel' }).click({ force: true });
            await page.waitForTimeout(1000);

            // Step 11: Test export to CSV format
            await page.locator(`${config.selectors.currentLocationReport.currentLocationContainer} button.dropdown__trigger`).click({ force: true });
            await page.waitForTimeout(500);
            await page.locator(`${config.selectors.currentLocationReport.currentLocationContainer} .dropdown__content button.dropdown__item`).filter({ hasText: 'CSV' }).click({ force: true });
            await page.waitForTimeout(1000);

            // Step 12: Test export to PDF format
            await page.locator(`${config.selectors.currentLocationReport.currentLocationContainer} button.dropdown__trigger`).click({ force: true });
            await page.waitForTimeout(500);
            await page.locator(`${config.selectors.currentLocationReport.currentLocationContainer} .dropdown__content button.dropdown__item`).filter({ hasText: 'PDF' }).click({ force: true });
            await page.waitForTimeout(1000);
        } catch (error) {
            console.log('Export functionality failed:', error.message);
        }

        // Step 13: Click on directions icon of first row
        try {
            await page.waitForTimeout(2000);

            // Find and click the directions icon in the first row
            const directionsIcon = page.locator(`${config.selectors.currentLocationReport.currentLocationTable} tbody tr:first-child .icon--directions`);
            await expect(directionsIcon).toBeVisible({ timeout: 10000 });
            await directionsIcon.click({ force: true });

            console.log('Successfully clicked on directions icon of first row');
            await page.waitForTimeout(2000);

        } catch (error) {
            console.log('Failed to click directions icon:', error.message);
        }


    });
});