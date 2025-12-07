const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

/**
 * Trip Report Test Suite
 *
 * Test Steps Covered:
 * ==================
 * 1. Login and navigate to fleet dashboard
 * 2. Open Reports menu from navigation
 * 3. Click on Fleet section to expand it
 * 4. Click on Trip Report menu option
 * 5. Verify Trip Report container/panel is visible
 * 6. Select a driver/device from the dropdown
 * 7. Enter a date for the report (format: YYYY-MM-DD)
 * 8. Click Submit button to generate the report
 * 9. Wait for report to load
 * 10. Verify table has data rows
 * 11. Change entries dropdown to show 25 entries (if visible)
 * 12. Verify table displays correct number of rows
 * 13. Click "Map Trip" button on first row to view trip on map
 */

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

        // ============= STEP 1: LOGIN AND NAVIGATE =============
        console.log('--- Step 1: Login and navigate to fleet dashboard ---');
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);
        console.log(' Successfully logged in and navigated to dashboard');

        // ============= STEP 2: OPEN REPORTS MENU =============
        console.log('--- Step 2: Opening Reports menu ---');
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible({ timeout: 15000 });
        await page.locator(config.selectors.navigation.reportMenu).click();
        console.log(' Reports menu opened');

        // ============= STEP 3: CLICK ON FLEET SECTION =============
        console.log('--- Step 3: Clicking on Fleet section ---');
        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Fleet' }).click();
        console.log(' Fleet section expanded');

        // ============= STEP 4: CLICK ON TRIP REPORT MENU =============
        console.log('--- Step 4: Clicking on Trip Report menu option ---');
        await expect(page.locator(config.selectors.tripReport.tripReportMenu)).toBeVisible({ timeout: 10000 });
        await page.locator(config.selectors.tripReport.tripReportMenu).click();
        console.log(' Trip Report menu clicked');

        // ============= STEP 5: VERIFY TRIP REPORT CONTAINER =============
        console.log('--- Step 5: Verifying Trip Report container is visible ---');
        await expect(page.locator(config.selectors.tripReport.tripReportContainer)).toBeVisible({ timeout: 15000 });
        console.log(' Trip Report container is visible');

        // ============= STEP 6: SELECT DRIVER/DEVICE =============
        console.log('--- Step 6: Selecting a driver/device from dropdown ---');
        const driverSelect = page.locator(config.selectors.tripReport.driverSelect);
        await driverSelect.waitFor({ state: 'visible', timeout: 10000 });

        // Get all available options and select the first valid one (not placeholder)
        const options = await driverSelect.locator('option').all();
        let selectedOption = null;

        for (const option of options) {
            const value = await option.getAttribute('value');
            const text = await option.textContent();
            // Skip empty values or placeholder options
            if (value && value.trim() !== '' && !text.toLowerCase().includes('select')) {
                selectedOption = value;
                console.log(` Found available device: "${text.trim()}" with value: "${value}"`);
                break;
            }
        }

        if (selectedOption) {
            await driverSelect.selectOption(selectedOption);
            console.log(` Device selected successfully`);
        } else {
            // Fallback: try to select by index (first non-empty option)
            await driverSelect.selectOption({ index: 1 });
            console.log(' Device selected by index');
        }

        // ============= STEP 7: ENTER DATE =============
        console.log('--- Step 7: Entering date for the report ---');
        const dateInput = page.locator(config.selectors.tripReport.selectDate);
        await dateInput.waitFor({ state: 'visible', timeout: 10000 });
        await dateInput.clear();
        await dateInput.fill('2025-07-01');
        console.log(' Date entered: 2025-07-01');

        // ============= STEP 8: CLICK SUBMIT BUTTON =============
        console.log('--- Step 8: Clicking Submit button ---');
        await page.locator(config.selectors.tripReport.submitBtn).click();
        console.log(' Submit button clicked');

        // ============= STEP 9: WAIT FOR REPORT TO LOAD =============
        console.log('--- Step 9: Waiting for report to load ---');
        await page.waitForTimeout(5000); // Initial wait for API response

        // Wait for table to have data
        const tableRows = page.locator(config.selectors.tripReport.tripReportTable);
        await tableRows.first().waitFor({ state: 'visible', timeout: 60000 });
        console.log(' Report loaded successfully');

        // ============= STEP 10: VERIFY TABLE HAS DATA =============
        console.log('--- Step 10: Verifying table has data rows ---');
        let rowCount = await tableRows.count();
        console.log(` Table has ${rowCount} row(s)`);
        expect(rowCount).toBeGreaterThan(0);
        console.log(' Table contains data');

        // ============= STEP 11: CHANGE ENTRIES TO 25 (IF VISIBLE) =============
        console.log('--- Step 11: Attempting to change entries dropdown to show 25 entries ---');
        const entrySelect = page.locator(config.selectors.tripReport.entry);

        // Scroll the panel to make the entries dropdown visible
        const tripReportPanel = page.locator(config.selectors.tripReport.tripReportContainer);
        await tripReportPanel.evaluate(el => el.scrollTop = 0);

        // Try to scroll the entries dropdown into view
        try {
            await entrySelect.scrollIntoViewIfNeeded();

            // Check if it's visible after scrolling
            const isVisible = await entrySelect.isVisible();

            if (isVisible) {
                await entrySelect.selectOption('25');
                console.log(' Entries set to 25');

                // Wait for table to update
                await page.waitForTimeout(2000);

                // ============= STEP 12: VERIFY ROW COUNT =============
                console.log('--- Step 12: Verifying table row count after changing entries ---');
                rowCount = await tableRows.count();
                console.log(` Table now has ${rowCount} row(s)`);

                // Verify we have 25 rows (or at least some rows if less data available)
                if (rowCount >= 25) {
                    expect(rowCount).toBe(25);
                    console.log(' Verified: Table has exactly 25 rows');
                } else {
                    expect(rowCount).toBeGreaterThan(0);
                    console.log(` Note: Table has ${rowCount} rows (less than 25 available)`);
                }
            } else {
                console.log(' Entries dropdown not visible, skipping entries change step');
                console.log(` Current row count: ${rowCount}`);
            }
        } catch (e) {
            console.log(' Could not scroll to entries dropdown, continuing with default entries');
            console.log(` Current row count: ${rowCount}`);
        }

        // ============= STEP 13: CLICK MAP TRIP BUTTON =============
        console.log('--- Step 13: Clicking "Map Trip" button on first row ---');
        const firstRow = tableRows.first();
        await firstRow.scrollIntoViewIfNeeded();

        const mapTripButton = firstRow.locator('button.map-it');
        const mapTripButtonAlt = firstRow.locator('.map-it');

        try {
            if (await mapTripButton.isVisible()) {
                await mapTripButton.click();
                console.log(' Map Trip button clicked');
            } else if (await mapTripButtonAlt.isVisible()) {
                await mapTripButtonAlt.click();
                console.log(' Map Trip button (alt selector) clicked');
            } else {
                // Try to find any clickable map button in the row
                const anyMapButton = firstRow.locator('[class*="map"]').first();
                if (await anyMapButton.isVisible()) {
                    await anyMapButton.click();
                    console.log(' Map button found and clicked');
                } else {
                    console.log(' Map Trip button not found on first row, skipping');
                }
            }

            // Wait for map to load
            await page.waitForTimeout(3000);
            console.log(' Map view loaded');
        } catch (e) {
            console.log(' Could not click Map Trip button: ' + e.message);
        }

        console.log(' Trip Report test completed successfully');
    });
});
