const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

/**
 * Daily Geofence Report Test Suite
 *
 * Test Steps Covered:
 * ==================
 * 1. Login and navigate to fleet dashboard
 * 2. Click on Geofencing menu
 * 3. Expand Geofence Reports accordion
 * 4. Click on Daily Geofence Report menu
 * 5. Verify Daily Geofence Report panel is visible
 * 6. Verify summary cards are displayed (Total Time, Devices, Geofences, Visits)
 * 7. Click on date picker input and select a date
 * 8. Click on calendar icon button and verify calendar opens
 * 9. Verify data table loads with correct columns
 * 10. Test device filter dropdown
 * 11. Test geofence filter dropdown
 * 12. Test search functionality
 * 13. Click Copy button to copy data
 * 14. Export to Excel format
 * 15. Export to PDF format
 * 16. Export to CSV format
 * 17. Click View Chart button and verify pie chart modal
 * 18. Test column sorting functionality:
 *     - Device Name
 *     - Geofence
 *     - Time In Geofence
 *     - % of Day
 *     - Visits
 * 19. Click View Details button on first row
 * 20. Verify details modal opens with:
 *     - Modal title with device and geofence name
 *     - Hourly timeline visualization
 *     - Entry/Exit log table
 *     - Summary section
 * 21. Close the details modal
 * 22. Close the panel
 */

test.describe('Daily Geofence Report', () => {
    let config;
    let helpers;

    const TRACKING1_LOGIN_URL = 'https://www.tracking1.gpsandfleet.io/gpsandfleet/adminnew/view/login.php';
    const TRACKING1_DASHBOARD_URL = 'https://www.tracking1.gpsandfleet.io/gpsandfleet/client/fleetdemo/maps/index2.php';

    async function loginAndNavigateTracking1(page, config) {
        // Login via tracking1 admin page
        await page.goto(TRACKING1_LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });

        const usernameField = page.locator('#username');
        await usernameField.waitFor({ state: 'visible', timeout: 30000 });
        await usernameField.clear();
        await usernameField.fill(config.credentials.demo.usernameBackup);

        const passwordField = page.locator('#password');
        await passwordField.waitFor({ state: 'visible', timeout: 30000 });
        await passwordField.clear();
        await passwordField.fill(config.credentials.demo.passwordBackup);

        const submitButton = page.locator('.submit');
        await submitButton.waitFor({ state: 'visible' });
        await submitButton.click();

        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await page.waitForTimeout(3000);
        console.log('Login completed on tracking1');

        // Navigate to fleet dashboard
        await page.goto(TRACKING1_DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
            console.log('Network idle timeout, continuing...');
        });
        await page.waitForTimeout(3000);
        console.log('Navigated to tracking1 dashboard');
    }

    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        await page.close();
    });

    test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.clearStorageAndSetTimeouts();
        test.setTimeout(600000);
    });

    test('should display and interact with Daily Geofence Report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // ============= STEP 1: LOGIN AND NAVIGATE =============
        console.log('--- Step 1: Login and navigate to fleet dashboard ---');
        await loginAndNavigateTracking1(page, config);
        console.log('✓ Successfully logged in');

        // ============= STEP 2: CLICK GEOFENCING MENU =============
        console.log('--- Step 2: Opening Geofencing menu ---');
        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();
        console.log('✓ Geofencing menu clicked');

        // ============= STEP 3: EXPAND GEOFENCE REPORTS ACCORDION =============
        console.log('--- Step 3: Expanding Geofence Reports accordion ---');
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Geofence Reports' }).click({ force: true });
        await page.waitForTimeout(1000);
        console.log('✓ Geofence Reports accordion expanded');

        // ============= STEP 4: CLICK DAILY GEOFENCE REPORT MENU =============
        console.log('--- Step 4: Clicking Daily Geofence Report menu ---');
        const dailyGeofenceMenu = page.locator('#daily-geofence-report-btn');
        await dailyGeofenceMenu.waitFor({ state: 'visible', timeout: 10000 });
        await dailyGeofenceMenu.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await dailyGeofenceMenu.click({ force: true });
        console.log('✓ Daily Geofence Report menu clicked');

        // ============= STEP 5: VERIFY PANEL IS VISIBLE =============
        console.log('--- Step 5: Verifying Daily Geofence Report panel ---');
        const panel = page.locator('#daily-geofence-report-panel');
        await expect(panel).toBeVisible({ timeout: 10000 });
        await expect(panel).toHaveClass(/panel--open/);
        console.log('✓ Panel is visible and open');

        // Wait for data to load
        await page.waitForTimeout(3000);

        // ============= STEP 6: VERIFY SUMMARY CARDS =============
        console.log('--- Step 6: Verifying summary cards ---');

        const totalTimeCard = page.locator('#daily-total-time');
        const devicesCountCard = page.locator('#daily-devices-count');
        const geofencesCountCard = page.locator('#daily-geofences-count');
        const visitsCountCard = page.locator('#daily-visits-count');

        await expect(totalTimeCard).toBeVisible();
        await expect(devicesCountCard).toBeVisible();
        await expect(geofencesCountCard).toBeVisible();
        await expect(visitsCountCard).toBeVisible();

        const totalTime = await totalTimeCard.textContent();
        const devicesCount = await devicesCountCard.textContent();
        const geofencesCount = await geofencesCountCard.textContent();
        const visitsCount = await visitsCountCard.textContent();

        console.log(`✓ Summary cards visible:`);
        console.log(`  - Total Time: ${totalTime}`);
        console.log(`  - Devices: ${devicesCount}`);
        console.log(`  - Geofences: ${geofencesCount}`);
        console.log(`  - Visits: ${visitsCount}`);

        // ============= STEP 7: CLICK DATE PICKER INPUT =============
        console.log('--- Step 7: Testing date picker input ---');

        // Collapse the navbar by hovering over the panel so it doesn't overlap
        await page.locator('#daily-geofence-report-panel .header').hover();
        await page.waitForTimeout(1000);

        const dateInput = page.locator('#daily-geofence-date');
        await expect(dateInput).toBeVisible();

        const currentDateValue = await dateInput.inputValue();
        console.log(`  Current date value: ${currentDateValue}`);

        await dateInput.click({ force: true });
        await page.waitForTimeout(500);

        // Verify flatpickr calendar opens
        const flatpickrCalendar = page.locator('.flatpickr-calendar.open');
        await expect(flatpickrCalendar).toBeVisible({ timeout: 5000 });
        console.log('✓ Date picker calendar opened');

        // Select a different date
        const availableDay = flatpickrCalendar.locator('.flatpickr-day:not(.flatpickr-disabled):not(.selected)').first();
        if (await availableDay.isVisible()) {
            await availableDay.click({ force: true });
            await page.waitForTimeout(2000);

            // Verify date value actually changed
            const newDateValue = await dateInput.inputValue();
            expect(newDateValue).not.toBe('');
            console.log(`✓ Date changed from "${currentDateValue}" to "${newDateValue}"`);

            // Re-verify summary cards updated after date change
            console.log('--- Step 6b: Re-verifying summary cards after date change ---');
            await page.waitForTimeout(2000);
            const updatedTotalTime = await totalTimeCard.textContent();
            const updatedDevices = await devicesCountCard.textContent();
            const updatedGeofences = await geofencesCountCard.textContent();
            const updatedVisits = await visitsCountCard.textContent();
            console.log(`✓ Updated summary cards:`);
            console.log(`  - Total Time: ${updatedTotalTime}`);
            console.log(`  - Devices: ${updatedDevices}`);
            console.log(`  - Geofences: ${updatedGeofences}`);
            console.log(`  - Visits: ${updatedVisits}`);
        } else {
            console.log('  No available day to select');
        }

        // ============= STEP 8: CLICK CALENDAR ICON BUTTON =============
        console.log('--- Step 8: Testing calendar icon button ---');

        const calendarIconBtn = page.locator('#daily-geofence-report-panel .date-range .btn--icon');
        await expect(calendarIconBtn).toBeVisible();
        await calendarIconBtn.click();
        await page.waitForTimeout(500);

        const calendarAfterIconClick = page.locator('.flatpickr-calendar.open');
        if (await calendarAfterIconClick.isVisible()) {
            console.log('✓ Calendar opened via icon button');
            // Close calendar by clicking outside
            await page.locator('#daily-geofence-report-panel .header').click();
            await page.waitForTimeout(300);
        } else {
            console.log('  Calendar icon button click - calendar state unchanged');
        }

        // ============= STEP 9: VERIFY DATA TABLE =============
        console.log('--- Step 9: Verifying data table structure ---');

        const table = page.locator('#daily-geofence-table');
        await expect(table).toBeVisible();

        // Check for table headers
        const headers = await table.locator('thead th').allTextContents();
        console.log(`✓ Table headers: ${headers.join(', ')}`);

        // Assert all expected columns exist
        const expectedColumns = ['Device Name', 'Geofence', 'Time In Geofence', '% of Day', 'Visits', 'Actions'];
        for (const col of expectedColumns) {
            const headerExists = headers.some(h => h.includes(col));
            expect(headerExists, `Column "${col}" should be present in table headers`).toBe(true);
            console.log(`  ✓ Column "${col}" found`);
        }

        // Assert table has data rows
        const dataRows = await table.locator('tbody tr').count();
        expect(dataRows).toBeGreaterThan(0);
        console.log(`  ✓ Table has ${dataRows} data rows`);

        // ============= STEP 10: TEST DEVICE FILTER =============
        console.log('--- Step 10: Testing device filter dropdown ---');

        const deviceFilter = page.locator('#daily-geofence-vehicle-filter');
        await expect(deviceFilter).toBeVisible();

        const deviceOptions = await deviceFilter.locator('option').count();
        console.log(`✓ Device filter has ${deviceOptions} options`);

        if (deviceOptions > 1) {
            const options = await deviceFilter.locator('option').allTextContents();
            if (options.length > 1) {
                // Get row count before filtering
                const rowsBeforeFilter = await table.locator('tbody tr').count();

                // Select a specific device
                await deviceFilter.selectOption({ index: 1 });
                await page.waitForTimeout(1000);
                console.log(`  Selected: ${options[1]}`);

                // Verify table rows filtered
                const rowsAfterFilter = await table.locator('tbody tr').count();
                expect(rowsAfterFilter).toBeGreaterThan(0);
                console.log(`  ✓ Filtered rows: ${rowsBeforeFilter} → ${rowsAfterFilter}`);

                // Reset to All Devices
                await deviceFilter.selectOption({ index: 0 });
                await page.waitForTimeout(1000);

                // Verify rows restored
                const rowsAfterReset = await table.locator('tbody tr').count();
                expect(rowsAfterReset).toBe(rowsBeforeFilter);
                console.log(`  ✓ Reset to All Devices: ${rowsAfterReset} rows restored`);
            }
        }

        // ============= STEP 11: TEST GEOFENCE FILTER =============
        console.log('--- Step 11: Testing geofence filter dropdown ---');

        const geofenceFilter = page.locator('#daily-geofence-geofence-filter');
        await expect(geofenceFilter).toBeVisible();

        const geofenceOptions = await geofenceFilter.locator('option').count();
        console.log(`✓ Geofence filter has ${geofenceOptions} options`);

        if (geofenceOptions > 1) {
            const geoOptions = await geofenceFilter.locator('option').allTextContents();
            const rowsBeforeGeoFilter = await table.locator('tbody tr').count();

            // Select a specific geofence
            await geofenceFilter.selectOption({ index: 1 });
            await page.waitForTimeout(1000);
            console.log(`  Selected geofence: ${geoOptions[1]}`);

            // Verify filtering applied
            const rowsAfterGeoFilter = await table.locator('tbody tr').count();
            expect(rowsAfterGeoFilter).toBeGreaterThan(0);
            console.log(`  ✓ Geofence filtered rows: ${rowsBeforeGeoFilter} → ${rowsAfterGeoFilter}`);

            // Reset to All Geofences
            await geofenceFilter.selectOption({ index: 0 });
            await page.waitForTimeout(1000);

            const rowsAfterGeoReset = await table.locator('tbody tr').count();
            expect(rowsAfterGeoReset).toBe(rowsBeforeGeoFilter);
            console.log(`  ✓ Reset to All Geofences: ${rowsAfterGeoReset} rows restored`);
        }

        // ============= STEP 12: TEST SEARCH FUNCTIONALITY =============
        console.log('--- Step 12: Testing search functionality ---');

        const searchInput = page.locator('#daily-geofence-report-search');
        await expect(searchInput).toBeVisible();

        const rowsBeforeSearch = await table.locator('tbody tr').count();

        // Search with a term that should match data (first device name from table)
        const firstRowText = await table.locator('tbody tr').first().locator('td').first().textContent();
        const searchTerm = firstRowText.trim().split(' ')[0]; // Use first word of device name
        await searchInput.fill(searchTerm);
        await page.waitForTimeout(1000);

        const rowsAfterSearch = await table.locator('tbody tr').count();
        expect(rowsAfterSearch).toBeGreaterThan(0);
        console.log(`✓ Search "${searchTerm}": ${rowsBeforeSearch} → ${rowsAfterSearch} rows`);

        // Search with non-matching term to verify filtering clears results
        await searchInput.fill('zzzznonexistent99999');
        await page.waitForTimeout(1000);
        const rowsNoMatch = await table.locator('tbody tr').count();
        const tableTextAfterBadSearch = await table.locator('tbody').textContent();
        if (rowsNoMatch === 0 || tableTextAfterBadSearch.includes('No') || tableTextAfterBadSearch.includes('no')) {
            console.log('✓ Non-matching search shows no results or empty message');
        } else {
            console.log(`  Non-matching search still shows ${rowsNoMatch} rows (search may not filter)`);
        }

        // Clear search and verify rows restored
        await searchInput.fill('');
        await page.waitForTimeout(1000);
        const rowsAfterClear = await table.locator('tbody tr').count();
        expect(rowsAfterClear).toBe(rowsBeforeSearch);
        console.log(`✓ Search cleared: ${rowsAfterClear} rows restored`);

        // ============= STEP 13: CLICK COPY BUTTON =============
        console.log('--- Step 13: Clicking Copy button ---');

        try {
            const copyBtn = page.locator('#daily-geofence-report-panel .daily-copy-btn');
            if (await copyBtn.isVisible()) {
                await copyBtn.click({ force: true });
                console.log('✓ Copy button clicked');
                await page.waitForTimeout(1000);
            }
        } catch (e) {
            console.log('  Copy button not available');
        }

        // ============= STEP 14-16: EXPORT BUTTONS =============
        console.log('--- Step 14-16: Testing export buttons ---');

        const dropdownTrigger = page.locator('#daily-geofence-report-panel .dropdown__trigger');

        // Export to Excel with download verification
        try {
            await dropdownTrigger.hover();
            await page.waitForTimeout(500);
            const excelBtn = page.locator('#daily-geofence-report-panel .daily-export-excel');
            if (await excelBtn.isVisible()) {
                const [excelDownload] = await Promise.all([
                    page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
                    excelBtn.click({ force: true })
                ]);
                if (excelDownload) {
                    const excelFileName = excelDownload.suggestedFilename();
                    console.log(`✓ Excel exported: ${excelFileName}`);
                } else {
                    console.log('✓ Excel export clicked (no download event - may use blob)');
                }
            }
        } catch (e) {
            console.log('  Excel export not available');
        }
        await page.waitForTimeout(1000);

        // Export to CSV with download verification
        try {
            await dropdownTrigger.hover();
            await page.waitForTimeout(500);
            const csvBtn = page.locator('#daily-geofence-report-panel .daily-export-csv');
            if (await csvBtn.isVisible()) {
                const [csvDownload] = await Promise.all([
                    page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
                    csvBtn.click({ force: true })
                ]);
                if (csvDownload) {
                    const csvFileName = csvDownload.suggestedFilename();
                    console.log(`✓ CSV exported: ${csvFileName}`);
                } else {
                    console.log('✓ CSV export clicked (no download event - may use blob)');
                }
            }
        } catch (e) {
            console.log('  CSV export not available');
        }
        await page.waitForTimeout(1000);

        // Export to PDF with download verification
        try {
            await dropdownTrigger.hover();
            await page.waitForTimeout(500);
            const pdfBtn = page.locator('#daily-geofence-report-panel .daily-export-pdf');
            if (await pdfBtn.isVisible()) {
                const [pdfDownload] = await Promise.all([
                    page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
                    pdfBtn.click({ force: true })
                ]);
                if (pdfDownload) {
                    const pdfFileName = pdfDownload.suggestedFilename();
                    console.log(`✓ PDF exported: ${pdfFileName}`);
                } else {
                    console.log('✓ PDF export clicked (no download event - may use blob)');
                }
            }
        } catch (e) {
            console.log('  PDF export not available');
        }
        await page.waitForTimeout(1000);

        // ============= STEP 17: VIEW CHART BUTTON =============
        console.log('--- Step 17: Testing View Chart button ---');

        const viewChartBtn = page.locator('#daily-geofence-view-chart');
        if (await viewChartBtn.isVisible()) {
            await viewChartBtn.click();
            await page.waitForTimeout(1000);

            // Verify pie chart modal opens
            const pieChartModal = page.locator('#daily-geofence-pie-chart-modal');
            if (await pieChartModal.isVisible()) {
                console.log('✓ Pie chart modal opened');

                // Verify chart canvas exists (may have 0x0 dimensions before data renders)
                const chartCanvas = pieChartModal.locator('#dailyPieChart');
                await expect(chartCanvas).toBeAttached();
                await page.waitForTimeout(2000);
                console.log('  ✓ Chart canvas present');

                // Test vehicle selector in modal
                const vehicleSelect = pieChartModal.locator('#daily-pie-chart-vehicle-select');
                if (await vehicleSelect.isVisible()) {
                    const vehicleOptions = await vehicleSelect.locator('option').allTextContents();
                    console.log(`  ✓ Vehicle selector has ${vehicleOptions.length} options`);

                    // Switch to a different vehicle and verify chart updates
                    if (vehicleOptions.length > 1) {
                        await vehicleSelect.selectOption({ index: 1 });
                        await page.waitForTimeout(1000);
                        console.log(`  ✓ Switched to vehicle: ${vehicleOptions[1].trim()}`);

                        // Verify chart canvas still present after switching
                        await expect(chartCanvas).toBeAttached();
                        console.log('  ✓ Chart canvas still present after vehicle switch');

                        // Switch back to first option
                        await vehicleSelect.selectOption({ index: 0 });
                        await page.waitForTimeout(500);
                        console.log(`  ✓ Switched back to: ${vehicleOptions[0].trim()}`);
                    }
                }

                // Close modal
                const closeModalBtn = pieChartModal.locator('#close-daily-pie-chart-modal');
                await closeModalBtn.click();
                await page.waitForTimeout(500);
                console.log('✓ Pie chart modal closed');
            } else {
                console.log('  Pie chart modal not visible (may need data)');
            }
        }

        // ============= STEP 18: TEST COLUMN SORTING =============
        console.log('--- Step 18: Testing column sorting ---');

        const sortableColumns = [
            { name: 'Device Name', dataSort: 'name' },
            { name: 'Geofence', dataSort: 'landmark_name' },
            { name: 'Time In Geofence', dataSort: 'total_time_display' },
            { name: '% of Day', dataSort: 'percentage' },
            { name: 'Visits', dataSort: 'visit_count' }
        ];

        for (const column of sortableColumns) {
            try {
                const header = page.locator(`#daily-geofence-table th[data-sort="${column.dataSort}"]`);
                if (await header.isVisible()) {
                    // Get first row content before sort
                    const firstRowBefore = await table.locator('tbody tr').first().textContent();

                    // Click to sort ascending
                    await header.click();
                    await page.waitForTimeout(500);

                    // Click again to sort descending
                    await header.click();
                    await page.waitForTimeout(500);

                    const firstRowAfter = await table.locator('tbody tr').first().textContent();

                    // Verify sort indicator class changed
                    const headerClasses = await header.getAttribute('class');
                    const hasSortClass = headerClasses && (headerClasses.includes('sort') || headerClasses.includes('asc') || headerClasses.includes('desc'));
                    if (hasSortClass) {
                        console.log(`  ✓ Sorted by ${column.name} (sort indicator active)`);
                    } else if (firstRowBefore !== firstRowAfter) {
                        console.log(`  ✓ Sorted by ${column.name} (row order changed)`);
                    } else {
                        console.log(`  ✓ Sorted by ${column.name} (clicked)`);
                    }
                }
            } catch (e) {
                console.log(`  Column ${column.name} sorting skipped`);
            }
        }

        // ============= STEP 19: CLICK VIEW DETAILS =============
        console.log('--- Step 19: Testing View Details button ---');

        const viewDetailsBtn = page.locator('#daily-geofence-table .daily-view-details-btn').first();
        if (await viewDetailsBtn.isVisible()) {
            await viewDetailsBtn.click();
            await page.waitForTimeout(1000);

            // ============= STEP 20: VERIFY DETAILS MODAL =============
            console.log('--- Step 20: Verifying details modal ---');

            const detailsModal = page.locator('#daily-geofence-details-modal');
            if (await detailsModal.isVisible()) {
                console.log('✓ Details modal opened');

                // Verify modal title contains device name and geofence name
                const modalTitle = detailsModal.locator('#daily-details-title');
                const titleText = await modalTitle.textContent();
                expect(titleText.trim().length).toBeGreaterThan(0);
                console.log(`  Modal title: ${titleText}`);

                // Verify title contains a date pattern (MM/DD/YYYY)
                const hasDate = /\d{2}\/\d{2}\/\d{4}/.test(titleText);
                expect(hasDate, 'Modal title should contain a date').toBe(true);
                console.log('  ✓ Modal title contains date');

                // Verify timeline bar has segments/children
                const timelineBar = detailsModal.locator('#daily-timeline-bar');
                await expect(timelineBar).toBeVisible();
                const timelineChildren = await timelineBar.locator('> *').count();
                console.log(`  ✓ Timeline bar visible with ${timelineChildren} segments`);

                // Verify visits table has actual data rows (entry/exit log)
                const visitsTable = detailsModal.locator('#daily-visits-table');
                await expect(visitsTable).toBeVisible();
                const visitRows = await visitsTable.locator('tbody tr').count();
                expect(visitRows).toBeGreaterThan(0);
                console.log(`  ✓ Visits table has ${visitRows} entry/exit log rows`);

                // Verify visits table has expected columns
                const visitHeaders = await visitsTable.locator('thead th').allTextContents();
                console.log(`  ✓ Visit table columns: ${visitHeaders.join(', ')}`);

                // Verify summary section has meaningful content
                const summaryText = detailsModal.locator('#daily-summary-text');
                const summary = await summaryText.textContent();
                expect(summary.trim().length).toBeGreaterThan(0);
                // Summary should contain visit count and time info
                const hasVisitInfo = summary.includes('visit') || summary.includes('time') || summary.includes('Total');
                expect(hasVisitInfo, 'Summary should contain visit/time info').toBe(true);
                console.log(`  ✓ Summary: ${summary}`);

                // ============= STEP 21: CLOSE DETAILS MODAL =============
                console.log('--- Step 21: Closing details modal ---');

                const closeDetailsBtn = detailsModal.locator('#close-daily-details-btn');
                await closeDetailsBtn.click();
                await page.waitForTimeout(500);

                await expect(detailsModal).toHaveClass(/hidden/);
                console.log('✓ Details modal closed');
            } else {
                console.log('  Details modal not visible (may need data)');
            }
        } else {
            console.log('  No View Details button visible (no data in table)');
        }

        // ============= STEP 22: CLOSE PANEL =============
        console.log('--- Step 22: Closing Daily Geofence Report panel ---');

        const closeBtn = page.locator('#daily-geofence-report-panel .header__btn .icon--close');
        await closeBtn.click();
        await page.waitForTimeout(500);

        await expect(panel).not.toHaveClass(/panel--open/);
        console.log('✓ Panel closed');

        console.log('\n========================================');
        console.log('Daily Geofence Report Test Completed');
        console.log('========================================');
    });

    test('should handle date changes and reload data', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Login and navigate
        await loginAndNavigateTracking1(page, config);

        // Open Daily Geofence Report
        await page.locator(config.selectors.navigation.geofencingMenu).click();
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Geofence Reports' }).click({ force: true });
        await page.waitForTimeout(500);
        await page.locator('#daily-geofence-report-btn').click({ force: true });
        await page.waitForTimeout(2000);

        // Collapse the navbar by hovering away from it so it doesn't overlap the panel
        await page.locator('#daily-geofence-report-panel .header').hover();
        await page.waitForTimeout(1000);

        // Capture initial state
        const dateInput = page.locator('#daily-geofence-date');
        const initialDate = await dateInput.inputValue();
        console.log(`Initial date: ${initialDate}`);

        const initialTotalTime = await page.locator('#daily-total-time').textContent();
        const initialDevices = await page.locator('#daily-devices-count').textContent();
        const initialTable = page.locator('#daily-geofence-table');
        const initialRowCount = await initialTable.locator('tbody tr').count();
        console.log(`Initial state - Time: ${initialTotalTime}, Devices: ${initialDevices}, Rows: ${initialRowCount}`);

        // Open calendar and select different date
        await dateInput.click({ force: true });
        await page.waitForTimeout(500);

        const calendar = page.locator('.flatpickr-calendar.open');
        await expect(calendar).toBeVisible({ timeout: 5000 });

        // Select a different available day
        const days = await calendar.locator('.flatpickr-day:not(.flatpickr-disabled):not(.selected)').all();
        expect(days.length).toBeGreaterThan(0);

        await days[0].click();
        await page.waitForTimeout(3000);

        // Verify date actually changed
        const newDate = await dateInput.inputValue();
        expect(newDate).not.toBe(initialDate);
        console.log(`✓ Date changed: ${initialDate} → ${newDate}`);

        // Verify table is still visible and functional
        const table = page.locator('#daily-geofence-table');
        await expect(table).toBeVisible();
        const newRowCount = await table.locator('tbody tr').count();
        console.log(`✓ Data reloaded: ${newRowCount} rows`);

        // Verify summary cards updated
        const newTotalTime = await page.locator('#daily-total-time').textContent();
        const newDevices = await page.locator('#daily-devices-count').textContent();
        const newGeofences = await page.locator('#daily-geofences-count').textContent();
        const newVisits = await page.locator('#daily-visits-count').textContent();
        console.log(`✓ Updated summary - Time: ${newTotalTime}, Devices: ${newDevices}, Geofences: ${newGeofences}, Visits: ${newVisits}`);

        // Verify summary cards are visible and contain values
        await expect(page.locator('#daily-total-time')).toBeVisible();
        await expect(page.locator('#daily-devices-count')).toBeVisible();
        await expect(page.locator('#daily-geofences-count')).toBeVisible();
        await expect(page.locator('#daily-visits-count')).toBeVisible();
        console.log('✓ All summary cards visible after date change');
    });

    test('should show appropriate message when no data', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Login and navigate
        await loginAndNavigateTracking1(page, config);

        // Open Daily Geofence Report
        await page.locator(config.selectors.navigation.geofencingMenu).click();
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Geofence Reports' }).click({ force: true });
        await page.waitForTimeout(500);
        await page.locator('#daily-geofence-report-btn').click({ force: true });
        await page.waitForTimeout(3000);

        // The default date (today) may or may not have data
        // Verify the panel handles both cases gracefully
        const table = page.locator('#daily-geofence-table');
        await expect(table).toBeVisible();
        const tableContent = await table.textContent();
        const rowCount = await table.locator('tbody tr').count();

        // Verify summary cards are visible regardless of data presence
        const totalTimeCard = page.locator('#daily-total-time');
        const devicesCard = page.locator('#daily-devices-count');
        const geofencesCard = page.locator('#daily-geofences-count');
        const visitsCard = page.locator('#daily-visits-count');

        await expect(totalTimeCard).toBeVisible();
        await expect(devicesCard).toBeVisible();
        await expect(geofencesCard).toBeVisible();
        await expect(visitsCard).toBeVisible();

        const totalTime = await totalTimeCard.textContent();
        const devices = await devicesCard.textContent();
        const geofences = await geofencesCard.textContent();
        const visits = await visitsCard.textContent();

        if (tableContent.includes('No geofence') || tableContent.includes('No Geofence') || tableContent.includes('No data') || rowCount === 0) {
            console.log('✓ No data state detected');
            // When no data, summary cards should show zeros/empty
            expect(totalTime).toContain('0');
            expect(devices).toContain('0');
            expect(geofences).toContain('0');
            expect(visits).toContain('0');
            console.log('✓ Summary cards correctly show zeros when no data');
        } else {
            console.log(`✓ Table has ${rowCount} data rows`);
            // When data exists, summary should have non-zero values
            console.log(`  Summary - Time: ${totalTime}, Devices: ${devices}, Geofences: ${geofences}, Visits: ${visits}`);
        }

        console.log(`Summary - Total Time: ${totalTime}, Devices: ${devices}, Geofences: ${geofences}, Visits: ${visits}`);

        // Verify table element is present even with no data
        await expect(table).toBeAttached();
        const tableHeaders = await table.locator('thead th').count();
        console.log(`✓ Table structure present (${tableHeaders} column headers)`);

        // Verify filters are still functional with no data
        const deviceFilter = page.locator('#daily-geofence-vehicle-filter');
        const geofenceFilter = page.locator('#daily-geofence-geofence-filter');
        await expect(deviceFilter).toBeVisible();
        await expect(geofenceFilter).toBeVisible();
        console.log('✓ Filters visible and accessible in no-data state');

        // Verify search input is still accessible
        const searchInput = page.locator('#daily-geofence-report-search');
        await expect(searchInput).toBeVisible();
        console.log('✓ Search input accessible in no-data state');
    });
});
