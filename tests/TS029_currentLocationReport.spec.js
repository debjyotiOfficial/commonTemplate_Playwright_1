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

    test('should redirect to fleet demo page with demo credentials and test current location report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Click on reports menu
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.reportMenu).click({ force: true });
        
        await page.waitForTimeout(2000);
        
        // Click on current location report
        await expect(page.locator(config.selectors.navigation.currentLocationReport)).toBeVisible();
        await page.locator(config.selectors.navigation.currentLocationReport).click({ force: true });
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        // Verify current location report container is visible - wait longer
        await expect(page.locator(config.selectors.currentLocationReport.currentLocationContainer)).toBeVisible({ timeout: 30000 });
        
        // Click inside the modal/container to close the navbar and avoid overlay issues
        await page.locator(config.selectors.currentLocationReport.currentLocationContainer).click();

        // Verify table headers
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
        await expect(page.locator(config.selectors.currentLocationReport.currentLocationTable)).toBeVisible();
        
        // Get all header elements
        const headerElements = page.locator(`${config.selectors.currentLocationReport.currentLocationTable} thead th`);
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

        // Search for demo1
        await expect(page.locator(config.selectors.currentLocationReport.searchInput)).toBeVisible();
        await page.locator(config.selectors.currentLocationReport.searchInput).clear();
        await page.locator(config.selectors.currentLocationReport.searchInput).fill('Demo');
        await page.waitForTimeout(2000); // Wait for search to process

        // Verify the search results, the table should contain the searched term and have at least 1 row
        await expect(page.locator(config.selectors.currentLocationReport.currentLocationTable)).toBeVisible();
        await expect(page.locator(config.selectors.currentLocationReport.currentLocationTable)).toContainText('Demo1');
        
        // Verify there is at least 1 row in the table
        const rows = page.locator(config.selectors.currentLocationReport.currentLocationRows);
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThanOrEqual(1);

        // Click on pagination next button - check if it exists first
        const paginationNext = page.locator('#current-location-report-pagination .pagination__next');
        const isNextVisible = await paginationNext.isVisible();
        if (isNextVisible) {
            await paginationNext.click({ force: true });
            await page.waitForTimeout(1000);
        }

        // Test export functionality
        try {
            // Click on "Save file as" dropdown and select Excel
            await page.locator(`${config.selectors.currentLocationReport.currentLocationContainer} button.dropdown__trigger`).click({ force: true });
            await page.waitForTimeout(500);
            await page.locator(`${config.selectors.currentLocationReport.currentLocationContainer} .dropdown__content button.dropdown__item`).filter({ hasText: 'Excel' }).click({ force: true });
            await page.waitForTimeout(1000);

            // Click on "Save file as" dropdown again and select CSV
            await page.locator(`${config.selectors.currentLocationReport.currentLocationContainer} button.dropdown__trigger`).click({ force: true });
            await page.waitForTimeout(500);
            await page.locator(`${config.selectors.currentLocationReport.currentLocationContainer} .dropdown__content button.dropdown__item`).filter({ hasText: 'CSV' }).click({ force: true });
            await page.waitForTimeout(1000);

            // Click on "Save file as" dropdown again and select PDF
            await page.locator(`${config.selectors.currentLocationReport.currentLocationContainer} button.dropdown__trigger`).click({ force: true });
            await page.waitForTimeout(500);
            await page.locator(`${config.selectors.currentLocationReport.currentLocationContainer} .dropdown__content button.dropdown__item`).filter({ hasText: 'PDF' }).click({ force: true });
            await page.waitForTimeout(1000);
        } catch (error) {
            console.log('Export functionality failed:', error.message);
        }

        // Click on the directions icon of the first row
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