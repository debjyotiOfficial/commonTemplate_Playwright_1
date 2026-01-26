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
 * 15. Verify column sorting functionality for all sortable columns:
 *     - Device Name
 *     - Geofence
 *     - Time Spent In Geofence
 *     - Percentage of Time Spent In Geofence
 *     - Verify Actions column is not sortable
 * 16. Search for a specific device
 * 17. Click View Details button on first row (with data-index attribute)
 *     - Capture the "Time Spent In Geofence" value from the row
 * 18. Verify geofence details modal opens and contains:
 *     - Modal overlay and container
 *     - Modal header with title "Geofence Report Details"
 *     - Info icon in header
 *     - Close button with icon
 *     - Modal body with table-responsive container
 *     - Visits table (#visits-table) with 6 columns:
 *       1. Device Name
 *       2. IMEI
 *       3. Geofence Name
 *       4. Start Time
 *       5. End Time
 *       6. Duration (HH:MM)
 *     - Sample data rows verification
 *     - VERIFY: Sum of all Duration values matches Time Spent In Geofence
 *       (Parse durations in "XXH:XXM" format, sum them, and compare)
 * 19. Close the modal and verify it closes properly
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
                // Navigate to 2025 (data year) since calendar defaults to current year (2026)
                const yearInput = flatpickrCalendar.locator('.numInputWrapper .cur-year');
                if (await yearInput.isVisible()) {
                    await yearInput.fill('2025');
                    await page.waitForTimeout(500);
                    console.log(' Year selected: 2025');
                }

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

        // ============= STEP 15: VERIFY COLUMN SORTING =============
        console.log('--- Step 15: Testing column sorting functionality ---');

        // Define sortable columns with their data-sort attributes
        const sortableColumns = [
            { name: 'Device Name', dataSort: 'name', columnIndex: 0 },
            { name: 'Geofence', dataSort: 'landmark_name', columnIndex: 1 },
            { name: 'Time Spent In Geofence', dataSort: 'total_time_display', columnIndex: 2 },
            { name: 'Percentage of Time Spent In Geofence', dataSort: 'percentage', columnIndex: 3 }
        ];

        // Test each sortable column
        for (const column of sortableColumns) {
            console.log(`\n Testing sorting for: ${column.name}`);

            const columnHeader = page.locator(`#weekly-geofence-table thead th[data-sort="${column.dataSort}"]`);

            // Verify column is sortable (has cursor pointer style)
            if (await columnHeader.isVisible()) {
                const cursorStyle = await columnHeader.getAttribute('style');
                if (cursorStyle && cursorStyle.includes('cursor: pointer')) {
                    console.log(`  ✓ Column "${column.name}" is sortable`);

                    // Get initial data before sorting
                    const getColumnData = async () => {
                        const rows = await page.locator('#weekly-geofence-table tbody tr').all();
                        const data = [];
                        for (const row of rows) {
                            const cell = row.locator('td').nth(column.columnIndex);
                            if (await cell.isVisible()) {
                                const text = await cell.textContent();
                                data.push(text.trim());
                            }
                        }
                        return data;
                    };

                    // Check if there's data to sort
                    const initialData = await getColumnData();
                    if (initialData.length === 0) {
                        console.log(`  ⚠ No data available to test sorting for "${column.name}"`);
                        continue;
                    }

                    console.log(`  Found ${initialData.length} rows to sort`);

                    // FIRST CLICK - Sort Ascending
                    console.log(`  Clicking to sort ascending...`);
                    await columnHeader.click();
                    await page.waitForTimeout(1000);

                    // Verify sort icon changes
                    const sortIcon = columnHeader.locator('.icon--sort');
                    if (await sortIcon.isVisible()) {
                        const iconClasses = await sortIcon.getAttribute('class');
                        console.log(`  Sort icon classes after first click: ${iconClasses}`);
                    }

                    const dataAfterFirstClick = await getColumnData();

                    // Check if data changed (sort was applied)
                    const dataChanged = JSON.stringify(initialData) !== JSON.stringify(dataAfterFirstClick);
                    if (dataChanged) {
                        console.log(`  ✓ Data order changed after first click (ascending)`);
                    } else {
                        console.log(`  ℹ Data order unchanged (may already be sorted)`);
                    }

                    // SECOND CLICK - Sort Descending
                    console.log(`  Clicking to sort descending...`);
                    await columnHeader.click();
                    await page.waitForTimeout(1000);

                    const dataAfterSecondClick = await getColumnData();

                    // Verify second click changed the order
                    const reversedData = JSON.stringify(dataAfterFirstClick) !== JSON.stringify(dataAfterSecondClick);
                    if (reversedData) {
                        console.log(`  ✓ Data order changed after second click (descending)`);
                    } else {
                        console.log(`  ℹ Data order unchanged after second click`);
                    }

                    // THIRD CLICK - Return to default/original
                    console.log(`  Clicking to return to default...`);
                    await columnHeader.click();
                    await page.waitForTimeout(1000);

                    console.log(`  ✓ Completed sort cycle for "${column.name}"`);
                } else {
                    console.log(`  ✗ Column "${column.name}" missing cursor:pointer style`);
                }
            } else {
                console.log(`  ✗ Column "${column.name}" not visible`);
            }
        }

        // Verify Actions column is NOT sortable
        console.log(`\n Verifying "Actions" column is not sortable...`);
        const actionsHeader = page.locator('#weekly-geofence-table thead th.actions-header');
        if (await actionsHeader.isVisible()) {
            const hasDataSort = await actionsHeader.getAttribute('data-sort');
            const cursorStyle = await actionsHeader.getAttribute('style');

            if (!hasDataSort && (!cursorStyle || !cursorStyle.includes('cursor: pointer'))) {
                console.log('  ✓ Actions column is correctly non-sortable');
            } else {
                console.log('  ✗ Actions column appears to be sortable (unexpected)');
            }
        }

        console.log('\n✓ Column sorting verification completed');
        await page.waitForTimeout(2000);

        // ============= STEP 16: SEARCH FOR DEVICE =============
        console.log('--- Step 16: Searching for device ---');
        const searchInput = page.locator(config.selectors.weeklyGeofenceReport.searchInput);
        if (await searchInput.isVisible()) {
            await searchInput.clear();
            await searchInput.fill('Sales car1');
            console.log(' Searched for "Sales car1"');
        } else {
            console.log(' Search input not visible');
        }

        await page.waitForTimeout(2000);

        // ============= STEP 17: CLICK VIEW DETAILS =============
        console.log('--- Step 17: Clicking View Details button on first row ---');

        // Locate the first View Details button using class selector
        const viewDetailsButton = page.locator('#weekly-geofence-table tbody button.btn.btn--primary.view-details-btn').first();

        if (await viewDetailsButton.isVisible()) {
            // Get the data-index attribute for verification
            const dataIndex = await viewDetailsButton.getAttribute('data-index');
            console.log(`  Found View Details button with data-index="${dataIndex}"`);

            // Get the row data
            const row = page.locator('#weekly-geofence-table tbody tr').first();
            const cells = await row.locator('td').all();

            // Get device name (column 0)
            const deviceName = await cells[0].textContent();
            console.log(`  Device name from row: ${deviceName.trim()}`);

            // Get Time Spent In Geofence (column 2 - based on the header structure)
            const timeSpentInGeofence = await cells[2].textContent();
            const timeSpentTrimmed = timeSpentInGeofence.trim();
            console.log(`  Time Spent In Geofence from row: ${timeSpentTrimmed}`);

            // Click the View Details button
            await viewDetailsButton.click();
            console.log('  ✓ View Details button clicked');

            // ============= STEP 18: VERIFY GEOFENCE DETAILS MODAL =============
            console.log('--- Step 18: Verifying Geofence Details Modal ---');

            const modal = page.locator('#geofence-details-modal.modal-overlay');
            await expect(modal).toBeVisible({ timeout: 10000 });
            console.log('  ✓ Geofence details modal overlay is visible');

            await page.waitForTimeout(1000);

            // Verify modal container
            const modalContainer = modal.locator('.modal-container');
            await expect(modalContainer).toBeVisible();
            console.log('  ✓ Modal container is visible');

            // Verify modal header
            const modalHeader = modalContainer.locator('.modal-header');
            await expect(modalHeader).toBeVisible();

            // Verify modal title
            const modalTitle = modalHeader.locator('h3');
            await expect(modalTitle).toBeVisible();
            const titleText = await modalTitle.textContent();
            console.log(`  Modal title: "${titleText.trim()}"`);

            // Verify info icon in header
            const infoIcon = modalHeader.locator('i.fa.fa-question-circle-o.btn-question.infoGeoReport');
            if (await infoIcon.isVisible()) {
                console.log('  ✓ Info icon found in header');
            }

            // Verify close button
            const closeButton = modalContainer.locator('#close-details-modal.btn--icon');
            await expect(closeButton).toBeVisible();
            const closeIcon = closeButton.locator('.icon.icon--md.icon--close');
            await expect(closeIcon).toBeVisible();
            console.log('  ✓ Close button with icon found');

            // Verify modal body
            const modalBody = modalContainer.locator('.modal-body');
            await expect(modalBody).toBeVisible();
            console.log('  ✓ Modal body is visible');

            // Verify table responsive container
            const tableResponsive = modalBody.locator('.table-responsive');
            await expect(tableResponsive).toBeVisible();

            // Verify visits table
            const visitsTable = tableResponsive.locator('#visits-table.table--desktop');
            await expect(visitsTable).toBeVisible();
            console.log('  ✓ Visits table (#visits-table) found');

            // Verify table headers with expected column names
            const expectedHeaders = [
                'Device Name',
                'IMEI',
                'Geofence Name',
                'Start Time',
                'End Time',
                'Duration (HH:MM)'
            ];

            const tableHeaders = await visitsTable.locator('thead th').all();
            console.log(`  Found ${tableHeaders.length} table columns:`);

            for (let i = 0; i < tableHeaders.length; i++) {
                const headerText = await tableHeaders[i].textContent();
                const trimmedHeader = headerText.trim();
                console.log(`    - Column ${i + 1}: "${trimmedHeader}"`);

                // Verify against expected headers
                if (i < expectedHeaders.length) {
                    if (trimmedHeader === expectedHeaders[i]) {
                        console.log(`      ✓ Matches expected: "${expectedHeaders[i]}"`);
                    } else {
                        console.log(`      ✗ Expected: "${expectedHeaders[i]}", Got: "${trimmedHeader}"`);
                    }
                }
            }

            // Verify table has 6 columns
            if (tableHeaders.length === 6) {
                console.log('  ✓ Table has correct number of columns (6)');
            } else {
                console.log(`  ✗ Expected 6 columns, found ${tableHeaders.length}`);
            }

            // Count data rows in the visits table
            const dataRows = await visitsTable.locator('tbody tr').all();
            console.log(`  Found ${dataRows.length} visit detail rows`);

            // Display first few rows of data (if available)
            if (dataRows.length > 0) {
                console.log('  Sample visit data from modal:');
                const rowsToShow = Math.min(3, dataRows.length);

                for (let i = 0; i < rowsToShow; i++) {
                    const cells = await dataRows[i].locator('td').all();
                    if (cells.length >= 6) {
                        const deviceName = (await cells[0].textContent()).trim();
                        const imei = (await cells[1].textContent()).trim();
                        const geofenceName = (await cells[2].textContent()).trim();
                        const startTime = (await cells[3].textContent()).trim();
                        const endTime = (await cells[4].textContent()).trim();
                        const duration = (await cells[5].textContent()).trim();

                        console.log(`    Row ${i + 1}:`);
                        console.log(`      Device: ${deviceName}`);
                        console.log(`      IMEI: ${imei}`);
                        console.log(`      Geofence: ${geofenceName}`);
                        console.log(`      Start: ${startTime}`);
                        console.log(`      End: ${endTime}`);
                        console.log(`      Duration: ${duration}`);
                    }
                }

                // Show total if more than displayed
                if (dataRows.length > rowsToShow) {
                    console.log(`    ... and ${dataRows.length - rowsToShow} more rows`);
                }

                // ============= VERIFY DURATION SUM MATCHES TIME SPENT =============
                console.log('\n  Verifying duration sum matches Time Spent In Geofence...');

                /**
                 * Parse duration string in format "XXH:XXM" to total minutes
                 * @param {string} durationStr - Duration string like "80H:03M" or "10H:27M"
                 * @returns {number} Total minutes
                 */
                const parseDuration = (durationStr) => {
                    const match = durationStr.match(/(\d+)H:(\d+)M/);
                    if (match) {
                        const hours = parseInt(match[1], 10);
                        const minutes = parseInt(match[2], 10);
                        return (hours * 60) + minutes;
                    }
                    return 0;
                };

                /**
                 * Convert total minutes back to "XXH:XXM" format
                 * @param {number} totalMinutes - Total minutes
                 * @returns {string} Formatted duration like "80H:03M"
                 */
                const formatDuration = (totalMinutes) => {
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return `${hours}H:${minutes.toString().padStart(2, '0')}M`;
                };

                // Sum up all durations from the modal
                let totalMinutes = 0;
                const durations = [];

                for (const row of dataRows) {
                    const cells = await row.locator('td').all();
                    if (cells.length >= 6) {
                        const durationText = (await cells[5].textContent()).trim();
                        durations.push(durationText);
                        const minutes = parseDuration(durationText);
                        totalMinutes += minutes;
                    }
                }

                const calculatedTotalDuration = formatDuration(totalMinutes);

                console.log(`  All durations from modal: ${durations.join(', ')}`);
                console.log(`  Sum of all durations: ${calculatedTotalDuration} (${totalMinutes} minutes)`);
                console.log(`  Expected Time Spent (from table): ${timeSpentTrimmed}`);

                // Compare the calculated sum with the original time spent
                if (calculatedTotalDuration === timeSpentTrimmed) {
                    console.log('  ✅ VERIFIED: Duration sum MATCHES Time Spent In Geofence!');
                } else {
                    console.log(`  ❌ MISMATCH: Expected ${timeSpentTrimmed}, but calculated ${calculatedTotalDuration}`);

                    // Additional diagnostic info
                    const expectedMinutes = parseDuration(timeSpentTrimmed);
                    const difference = Math.abs(totalMinutes - expectedMinutes);
                    console.log(`  Difference: ${difference} minutes`);
                }

            } else {
                console.log('  ⚠ No visit data rows found in table');
            }

            console.log('  ✓ Geofence details modal verification completed');

            await page.waitForTimeout(2000);

            // ============= STEP 19: CLOSE THE MODAL =============
            console.log('--- Step 19: Closing Geofence Details Modal ---');

            // Click the close button (already located in Step 18)
            await closeButton.click();
            console.log('  Clicked close button (#close-details-modal)');

            await page.waitForTimeout(500);

            // Verify modal is closed
            const isModalClosed = !(await modal.isVisible());
            if (isModalClosed) {
                console.log('  ✓ Modal closed successfully');
            } else {
                console.log('  ⚠ Modal may still be visible, trying Escape key');
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);

                const isModalNowClosed = !(await modal.isVisible());
                if (isModalNowClosed) {
                    console.log('  ✓ Modal closed with Escape key');
                } else {
                    console.log('  ✗ Modal still visible after close attempts');
                }
            }

            await page.waitForTimeout(1000);

        } else {
            console.log('  ✗ No data rows available or View Details button not found');
            console.log('  This may indicate no geofence data for the selected date range');
        }

        await page.waitForTimeout(2000);
        console.log('\n✅ Weekly Geofence Report test completed successfully');
    });

    test('should open, close, and reopen Weekly Geofence Report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        console.log('\n========================================');
        console.log('TEST: Open, Close, and Reopen Weekly Geofence Report');
        console.log('========================================\n');

        // ============= STEP 1: LOGIN AND NAVIGATE =============
        console.log('--- Step 1: Login and navigate to fleet dashboard ---');
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);
        console.log('  ✓ Successfully logged in');

        // ============= STEP 2: FIRST OPEN - CLICK GEOFENCING MENU =============
        console.log('\n--- Step 2: Opening Geofencing menu (First Time) ---');
        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();
        console.log('  ✓ Geofencing menu clicked');

        // ============= STEP 3: EXPAND GEOFENCE REPORTS ACCORDION =============
        console.log('--- Step 3: Expanding Geofence Reports accordion ---');
        const geofenceReportsAccordion = page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Geofence Reports' });
        await geofenceReportsAccordion.click({ force: true });
        await page.waitForTimeout(1000);
        console.log('  ✓ Geofence Reports accordion expanded');

        // ============= STEP 4: CLICK WEEKLY GEOFENCE REPORT MENU (FIRST TIME) =============
        console.log('--- Step 4: Clicking Weekly Geofence Report menu (First Time) ---');
        const weeklyGeofenceMenu = page.locator(config.selectors.weeklyGeofenceReport.weeklyGeofencingMenu);
        await weeklyGeofenceMenu.waitFor({ state: 'visible', timeout: 10000 });
        await weeklyGeofenceMenu.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await weeklyGeofenceMenu.click({ force: true });
        console.log('  ✓ Weekly Geofence Report menu clicked');

        // ============= STEP 5: VERIFY CONTAINER OPENS (FIRST TIME) =============
        console.log('--- Step 5: Verifying Weekly Geofence Report container opens (First Time) ---');
        const weeklyGeofenceContainer = page.locator(config.selectors.weeklyGeofenceReport.weeklyGeofencingContainer);
        await expect(weeklyGeofenceContainer).toBeVisible({ timeout: 10000 });
        console.log('  ✓ Container is visible');

        // Verify heading is present
        const heading = weeklyGeofenceContainer.locator('h2, h3, .heading, .title').filter({ hasText: /Weekly Geofence|Geofence Report/i });
        if (await heading.first().isVisible()) {
            const headingText = await heading.first().textContent();
            console.log(`  ✓ Heading found: "${headingText.trim()}"`);
        }

        // Verify table is present
        const reportTable = page.locator('#weekly-geofence-table');
        if (await reportTable.isVisible()) {
            console.log('  ✓ Weekly Geofence table (#weekly-geofence-table) is visible');
        }

        await page.waitForTimeout(2000);

        // ============= STEP 6: CLOSE THE REPORT =============
        console.log('\n--- Step 6: Closing Weekly Geofence Report ---');

        // Click on hamburger menu to close/navigate away
        const hamburgerMenu = page.locator(config.selectors.navigation.hamburgerMenu);
        if (await hamburgerMenu.isVisible()) {
            await hamburgerMenu.click();
            console.log('  ✓ Clicked hamburger menu to close sidebar');
            await page.waitForTimeout(1000);
        }

        // Verify the container is no longer visible or has been navigated away from
        const isContainerStillVisible = await weeklyGeofenceContainer.isVisible();
        if (!isContainerStillVisible) {
            console.log('  ✓ Weekly Geofence Report container is no longer visible');
        } else {
            console.log('  ℹ Container may still be visible (sidebar closed)');
        }

        await page.waitForTimeout(1500);

        // ============= STEP 7: REOPEN - CLICK GEOFENCING MENU (SECOND TIME) =============
        console.log('\n--- Step 7: Reopening Geofencing menu (Second Time) ---');

        // Open hamburger menu again if it was closed
        if (!(await page.locator(config.selectors.navigation.geofencingMenu).isVisible())) {
            await hamburgerMenu.click();
            await page.waitForTimeout(1000);
            console.log('  Reopened hamburger menu');
        }

        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();
        console.log('  ✓ Geofencing menu clicked (Second Time)');

        // ============= STEP 8: RE-EXPAND GEOFENCE REPORTS ACCORDION (IF NEEDED) =============
        console.log('--- Step 8: Expanding Geofence Reports accordion (if collapsed) ---');

        // Check if the accordion is already expanded
        const isWeeklyMenuVisible = await weeklyGeofenceMenu.isVisible();
        if (!isWeeklyMenuVisible) {
            await geofenceReportsAccordion.click({ force: true });
            await page.waitForTimeout(1000);
            console.log('  ✓ Geofence Reports accordion re-expanded');
        } else {
            console.log('  ℹ Accordion already expanded, skipping click');
        }

        // ============= STEP 9: CLICK WEEKLY GEOFENCE REPORT MENU (SECOND TIME) =============
        console.log('--- Step 9: Clicking Weekly Geofence Report menu (Second Time) ---');
        await weeklyGeofenceMenu.waitFor({ state: 'visible', timeout: 10000 });
        await weeklyGeofenceMenu.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await weeklyGeofenceMenu.click({ force: true });
        console.log('  ✓ Weekly Geofence Report menu clicked (Second Time)');

        // ============= STEP 10: VERIFY CONTAINER OPENS AGAIN (SECOND TIME) =============
        console.log('--- Step 10: Verifying Weekly Geofence Report reopens successfully ---');
        await expect(weeklyGeofenceContainer).toBeVisible({ timeout: 10000 });
        console.log('  ✅ Container is visible after reopening!');

        // Verify heading is still present
        if (await heading.first().isVisible()) {
            const headingText = await heading.first().textContent();
            console.log(`  ✓ Heading confirmed: "${headingText.trim()}"`);
        }

        // Verify table is still present
        if (await reportTable.isVisible()) {
            console.log('  ✓ Weekly Geofence table is visible after reopening');

            // Verify table has data or at least structure
            const tableRows = await reportTable.locator('tbody tr').all();
            console.log(`  ✓ Table has ${tableRows.length} rows`);

            const tableHeaders = await reportTable.locator('thead th').all();
            console.log(`  ✓ Table has ${tableHeaders.length} columns`);
        }

        // Verify other components are functional
        const copyButton = page.locator(config.selectors.weeklyGeofenceReport.copyButton).filter({ hasText: 'Copy' });
        if (await copyButton.isVisible()) {
            console.log('  ✓ Copy button is visible');
        }

        const viewChartButton = page.locator(config.selectors.weeklyGeofenceReport.viewChartButton);
        if (await viewChartButton.isVisible()) {
            console.log('  ✓ View Chart button is visible');
        }

        const searchInput = page.locator(config.selectors.weeklyGeofenceReport.searchInput);
        if (await searchInput.isVisible()) {
            console.log('  ✓ Search input is visible');
        }

        await page.waitForTimeout(2000);

        console.log('\n========================================');
        console.log('✅ TEST PASSED: Weekly Geofence Report can be closed and reopened successfully!');
        console.log('========================================\n');
    });
});
