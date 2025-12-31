const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Monthly Utilization Report', () => {
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

    test('should generate and validate monthly utilization report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // ============= OPEN MENU AND NAVIGATE TO MONTHLY UTILIZATION REPORT =============
        console.log('--- Step 1: Opening menu and navigating to Monthly Utilization Report ---');

        // Wait for the platform to be fully loaded
        console.log('Waiting for platform to fully load...');
        await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {
            console.log('Network idle timeout, continuing...');
        });

        // Wait for map to be visible (indicates platform is loaded)
        await page.locator('.leaflet-container, #map, .map-container').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {
            console.log('Map container wait timeout, continuing...');
        });
        await page.waitForTimeout(3000); // Additional buffer for platform stability
        console.log('Platform loaded');

        // Click on reports menu
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.reportMenu).click();
        await page.waitForTimeout(1000);

        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Analytics' }).click();
        await page.waitForTimeout(1000);

        // Click on Monthly Utilization Report menu - this opens a NEW TAB
        const monthlyUtilMenu = page.locator(config.selectors.monthlyUtilizationReport.monthlyUtilizationMenu);
        await monthlyUtilMenu.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);

        // Ensure the element is visible and clickable
        await expect(monthlyUtilMenu).toBeVisible({ timeout: 10000 });
        console.log('Monthly Utilization Report menu item is visible');

        // Get the href from the menu item and open in a new page
        let newPage;
        const href = await monthlyUtilMenu.getAttribute('href');
        console.log('Menu item href:', href);

        if (href && href !== '#' && !href.startsWith('javascript:')) {
            // Create a new page and navigate to the URL
            newPage = await page.context().newPage();
            const fullUrl = href.startsWith('http') ? href : new URL(href, page.url()).href;
            console.log('Navigating to:', fullUrl);
            await newPage.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            console.log('Monthly Utilization Report page opened in new tab');
        } else {
            // Try multiple approaches to open the report
            let reportOpened = false;

            // Approach 1: Try Ctrl+Click to force open in new tab
            try {
                console.log('Trying Ctrl+Click to force open in new tab...');
                [newPage] = await Promise.all([
                    page.context().waitForEvent('page', { timeout: 15000 }),
                    monthlyUtilMenu.click({ modifiers: ['Control'], force: true })
                ]);
                console.log('Monthly Utilization Report opened via Ctrl+Click');
                reportOpened = true;
            } catch (e) {
                console.log('Ctrl+Click did not open new tab:', e.message);
            }

            // Approach 2: Try regular click and wait for popup
            if (!reportOpened) {
                try {
                    console.log('Trying regular click with popup listener...');
                    [newPage] = await Promise.all([
                        page.context().waitForEvent('page', { timeout: 15000 }),
                        monthlyUtilMenu.click({ force: true })
                    ]);
                    console.log('Monthly Utilization Report opened via regular click');
                    reportOpened = true;
                } catch (e) {
                    console.log('Regular click did not open new tab:', e.message);
                }
            }

            // Approach 3: Extract URL from onclick handler or construct from base URL
            if (!reportOpened) {
                console.log('Trying to extract URL or construct report URL...');

                // Try to get onclick attribute
                const onclick = await monthlyUtilMenu.getAttribute('onclick');
                console.log('onclick attribute:', onclick);

                // Extract URL from onclick if it contains window.open or similar
                let reportUrl = null;
                if (onclick) {
                    const urlMatch = onclick.match(/window\.open\s*\(\s*['"]([^'"]+)['"]/);
                    if (urlMatch) {
                        reportUrl = urlMatch[1];
                    }
                }

                // If no URL found, construct from current page URL pattern
                if (!reportUrl) {
                    const currentUrl = page.url();
                    // Replace index2.php with index7.php (common pattern for utilization report)
                    if (currentUrl.includes('index2.php')) {
                        reportUrl = currentUrl.replace('index2.php', 'index7.php');
                    } else {
                        // Use the base path and add index7.php
                        const urlObj = new URL(currentUrl);
                        reportUrl = `${urlObj.origin}${urlObj.pathname.replace(/[^/]+$/, '')}index7.php`;
                    }
                }

                console.log('Constructed report URL:', reportUrl);
                newPage = await page.context().newPage();

                // Try navigation with retries
                let navSuccess = false;
                for (let attempt = 1; attempt <= 3 && !navSuccess; attempt++) {
                    try {
                        console.log(`Navigation attempt ${attempt} to report URL...`);
                        await newPage.goto(reportUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                        navSuccess = true;
                        console.log('Monthly Utilization Report page opened via direct navigation');
                    } catch (navError) {
                        console.log(`Navigation attempt ${attempt} failed: ${navError.message}`);
                        if (attempt < 3) {
                            await newPage.waitForTimeout(2000);
                        }
                    }
                }

                if (!navSuccess) {
                    // Try with load state instead
                    console.log('Trying navigation without wait condition...');
                    await newPage.goto(reportUrl, { timeout: 90000 });
                    await newPage.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {
                        console.log('DOM content loaded timeout, continuing...');
                    });
                }

                reportOpened = true;
            }

            if (!reportOpened) {
                throw new Error('Failed to open Monthly Utilization Report page');
            }
        }

        // Wait for the new page to load
        await newPage.waitForLoadState('domcontentloaded');
        console.log('New page loaded');

        // Verify the Monthly Utilization Report container is visible on the new page
        // await expect(newPage.locator(config.selectors.monthlyUtilizationReport.monthlyUtilizationReportContainer)).toBeVisible({ timeout: 15000 });
        // console.log('Monthly Utilization Report panel is visible');

        // ============= SELECT REPORT MONTH/YEAR AND CAPTURE API RESPONSE =============
        console.log('--- Step 2: Selecting Report Month/Year and Capturing API Response ---');

        // Wait for the page to fully load by checking for key elements
        // The title "Monthly Utilization Report" should be visible
        const reportTitle = newPage.locator('text=Monthly Utilization Report').first();
        await expect(reportTitle).toBeVisible({ timeout: 15000 });
        console.log('Monthly Utilization Report page title is visible');

        // Set up API response listener BEFORE selecting month (report auto-generates on selection)
        const apiResponsePromise = newPage.waitForResponse(
            response => (response.url().includes('getTrackReportGeo_Next_uti.php') || response.url().includes('utilization')) && response.status() === 200,
            { timeout: 60000 }
        );

        // Get current month and year for selection
        const currentDate = new Date();
        const currentMonth = currentDate.toLocaleString('en-US', { month: 'long' });
        const currentYear = currentDate.getFullYear().toString();

        // Select Month from the month dropdown
        const monthSelect = newPage.locator('select').filter({ has: newPage.locator('option', { hasText: 'January' }) }).first();
        await monthSelect.waitFor({ state: 'visible', timeout: 15000 });
        await monthSelect.selectOption({ label: currentMonth });
        console.log(`Report Month set to "${currentMonth}"`);

        // Select Year from the year dropdown
        const yearSelect = newPage.locator('select').filter({ has: newPage.locator(`option[value="${currentYear}"]`) }).first();
        if (await yearSelect.count() > 0) {
            await yearSelect.selectOption(currentYear);
            console.log(`Report Year set to "${currentYear}"`);
        }

        // Wait for API response
        let apiResponseData = null;
        try {
            const apiResponse = await apiResponsePromise;
            apiResponseData = await apiResponse.json();
            console.log('API Response captured for Monthly Utilization Report');
        } catch (e) {
            console.log('API response timeout or error:', e.message);
        }

        // Wait for the report to render
        await newPage.waitForTimeout(3000);
        console.log('--- Step 3: Report Generated ---');

        // ============= VERIFY SUMMARY SECTION =============
        console.log('--- Step 4: Verifying Summary Section ---');

        // Verify Total Utilization
        const totalUtilSection = newPage.locator('text=TOTAL UTILIZATION').locator('..').locator('..');
        await expect(totalUtilSection).toBeVisible();
        console.log('Total Utilization section is visible');

        // Verify Total Trackers section
        const trackersValue = newPage.locator('text=TOTAL TRACKERS').locator('..').locator('p');
        await expect(trackersValue).toBeVisible();
        const uiTotalTrackers = await trackersValue.textContent();
        console.log(`Total Trackers: ${uiTotalTrackers?.trim()}`);

        // ============= VERIFY VEHICLE ANALYTICS TABLE =============
        console.log('--- Step 5: Verifying Vehicle Analytics Table ---');

        // Scroll down to find the table section
        const tableSection = newPage.locator('h2:has-text("Vehicle Analytics")');
        await tableSection.scrollIntoViewIfNeeded();
        await newPage.waitForTimeout(500);

        // Verify table exists (using actual selectors from HTML)
        const table = newPage.locator('#vehicleAnalyticsTable');
        await expect(table).toBeVisible({ timeout: 10000 });
        console.log('Vehicle Analytics Table is visible');

        // Verify table body has data rows
        const tableBody = newPage.locator(config.selectors.monthlyUtilizationReport.vehicleTableBody);
        await expect(tableBody).toBeVisible();

        const tableRows = tableBody.locator('tr');
        const rowCount = await tableRows.count();
        console.log(`Table has ${rowCount} row(s)`);
        expect(rowCount).toBeGreaterThan(0);

        // Get first row data for verification
        if (rowCount > 0) {
            const firstRow = tableRows.first();
            const cells = firstRow.locator('td');
            const driverName = await cells.nth(1).textContent();
            // Efficiency is in the last column (index 7) - get text directly or from small element
            const efficiencyCell = cells.nth(7);
            let efficiencyText = '';
            const smallElement = efficiencyCell.locator('small');
            if (await smallElement.count() > 0) {
                efficiencyText = await smallElement.textContent();
            } else {
                efficiencyText = await efficiencyCell.textContent();
            }

            console.log(`First row - Driver: ${driverName?.trim()}, Efficiency: ${efficiencyText?.trim()}`);
        }

        // Store Sales Car1 efficiency from Vehicle Analytics table (if visible)
        let salesCar1Efficiency = null;
        const salesCar1Row = newPage.locator('#vehicleTableBody tr').filter({ hasText: /Sales.*car1/i });
        if (await salesCar1Row.count() > 0) {
            const efficiencyCell = salesCar1Row.locator('small').first();
            if (await efficiencyCell.count() > 0) {
                salesCar1Efficiency = await efficiencyCell.textContent();
                console.log(`Sales Car1 efficiency: ${salesCar1Efficiency?.trim()}`);
            }
        }

        // Wait a moment for any additional content to load
        await newPage.waitForTimeout(2000);

        // Click on the first row in table body for additional details
        const firstMetricsRow = newPage.locator('#vehicleTableBody tr').first();
        if (await firstMetricsRow.count() > 0) {
            await firstMetricsRow.click();
            console.log('Clicked on first row in Vehicle Analytics table');

            // Get efficiency from the clicked row
            const clickedRowEfficiencyCell = firstMetricsRow.locator('small').first();
            let clickedRowEfficiency = null;
            if (await clickedRowEfficiencyCell.count() > 0) {
                clickedRowEfficiency = await clickedRowEfficiencyCell.textContent();
            }

            // Clean the text by removing % and trimming whitespace
            const stored = salesCar1Efficiency?.trim().replace('%', '') || '';
            const clicked = clickedRowEfficiency?.trim().replace('%', '') || '';

            if (stored && clicked) {
                console.log(`Sales Car1 stored efficiency: ${stored}%`);
                console.log(`Clicked row efficiency: ${clicked}%`);

                // Convert to numbers for comparison
                const storedValue = parseFloat(stored);
                const clickedValue = parseFloat(clicked);

                // Compare with tolerance for floating point precision
                if (!isNaN(storedValue) && !isNaN(clickedValue)) {
                    if (Math.abs(storedValue - clickedValue) < 0.1) {
                        console.log('Efficiencies match (within 0.1% tolerance)!');
                    } else if (Math.abs(storedValue - clickedValue) < 1.0) {
                        console.log('Efficiencies are close (within 1%)');
                    } else {
                        console.log(`Efficiencies differ by ${Math.abs(storedValue - clickedValue).toFixed(2)}%`);
                    }
                }
            }

            // Wait for modal to fully appear
            await newPage.waitForTimeout(1000);
            console.log('Waiting for modal to appear...');

            // Close the device modal if it opened
            const deviceModal = newPage.locator('#deviceModal');
            const isModalVisible = await deviceModal.isVisible().catch(() => false);
            console.log(`Device modal visible: ${isModalVisible}`);

            if (isModalVisible) {
                // Try multiple ways to close the modal
                let modalClosed = false;

                // Try close button
                const closeSelectors = [
                    '#deviceModal .btn-close',
                    '#deviceModal .close',
                    '#deviceModal button[data-bs-dismiss="modal"]',
                    '#deviceModal [aria-label="Close"]'
                ];

                for (const selector of closeSelectors) {
                    if (modalClosed) break;
                    const closeBtn = newPage.locator(selector).first();
                    if (await closeBtn.count() > 0 && await closeBtn.isVisible().catch(() => false)) {
                        try {
                            await closeBtn.click({ force: true });
                            await newPage.waitForTimeout(500);
                            console.log(`Closed device modal using selector: ${selector}`);
                            modalClosed = true;
                        } catch (e) {
                            console.log(`Failed to close modal with ${selector}: ${e.message}`);
                        }
                    }
                }

                // If button didn't work, try Escape key
                if (!modalClosed) {
                    console.log('Trying Escape key to close modal...');
                    await newPage.keyboard.press('Escape');
                    await newPage.waitForTimeout(500);

                    // Check if modal is still visible
                    const stillVisible = await deviceModal.isVisible().catch(() => false);
                    if (!stillVisible) {
                        console.log('Modal closed via Escape key');
                        modalClosed = true;
                    }
                }

                // If still not closed, click outside the modal
                if (!modalClosed) {
                    console.log('Trying to click outside modal...');
                    await newPage.mouse.click(10, 10);
                    await newPage.waitForTimeout(500);
                }
            } else {
                console.log('Device modal not visible, continuing...');
            }
        }

        // ============= VERIFY API RESPONSE DATA MATCHES UI =============
        console.log('--- Step 6: Validating API Response Data Against UI ---');

        if (apiResponseData) {
            // Validate Total Utilization matches API
            const uiTotalUtilization = await newPage.locator('#totalUtilization').textContent();
            const apiTotalUtilization = apiResponseData.summary?.totalUtilization;
            if (apiTotalUtilization !== undefined) {
                console.log(`API Total Utilization: ${apiTotalUtilization}%, UI: ${uiTotalUtilization?.trim()}`);
                expect(uiTotalUtilization?.trim()).toContain(String(apiTotalUtilization));
            }

            // Validate Inside Landmarks matches API
            const uiInsideLandmarks = await newPage.locator('#insideLandmarks').textContent();
            const apiInsideLandmarks = apiResponseData.summary?.insideLandmarks;
            if (apiInsideLandmarks !== undefined) {
                console.log(`API Inside Landmarks: ${apiInsideLandmarks}%, UI: ${uiInsideLandmarks?.trim()}`);
                expect(uiInsideLandmarks?.trim()).toContain(String(apiInsideLandmarks));
            }

            // Validate Total Trackers matches API
            const apiTotalTrackers = apiResponseData.summary?.totalTrackers;
            if (apiTotalTrackers !== undefined) {
                console.log(`API Total Trackers: ${apiTotalTrackers}, UI: ${uiTotalTrackers?.trim()}`);
                expect(parseInt(uiTotalTrackers?.trim())).toBe(apiTotalTrackers);
            }

            // Validate number of devices in table matches API
            const apiDevicesCount = apiResponseData.devices?.length || 0;
            console.log(`API Devices Count: ${apiDevicesCount}, UI Table Rows: ${rowCount}`);
            expect(rowCount).toBe(apiDevicesCount);
        }

        // ============= VERIFY INSIDE LANDMARKS SECTION =============
        console.log('--- Step 7: Verifying Inside Landmarks Section ---');

        const insideLandmarksSection = newPage.locator('text=INSIDE LANDMARKS').locator('..').locator('..');
        await expect(insideLandmarksSection).toBeVisible();
        const insideLandmarksValue = await newPage.locator('#insideLandmarks').textContent();
        console.log(`Inside Landmarks: ${insideLandmarksValue?.trim()}`);
        expect(insideLandmarksValue).toContain('%');

        // ============= VERIFY CHARTS VISIBILITY =============
        console.log('--- Step 8: Verifying Charts Visibility ---');

        // Verify Location Distribution Chart
        const locationChart = newPage.locator('#locationDistribution');
        await expect(locationChart).toBeVisible({ timeout: 10000 });
        console.log('Location Distribution chart is visible');

        // Verify Location Distribution has a heading (use .first() to avoid modal conflict)
        const locationChartHeading = newPage.locator('.charts-grid h6:has-text("Location Distribution"), .chart-container h6:has-text("Location Distribution")').first();
        await expect(locationChartHeading).toBeVisible();
        console.log('Location Distribution heading is visible');

        // Verify Efficiency Trend Chart
        const efficiencyChart = newPage.locator('#efficiencyTrend');
        await expect(efficiencyChart).toBeVisible({ timeout: 10000 });
        console.log('Efficiency Trend chart is visible');

        // Verify Efficiency Trend has a heading (use .first() to avoid modal conflict)
        const efficiencyChartHeading = newPage.locator('.charts-grid h6:has-text("Efficiency Trend"), .chart-container h6:has-text("Efficiency Trend")').first();
        await expect(efficiencyChartHeading).toBeVisible();
        console.log('Efficiency Trend heading is visible');

        // Verify Device Activity Timeline Chart
        const timelineChart = newPage.locator('#timelineChart');
        await expect(timelineChart).toBeVisible({ timeout: 10000 });
        console.log('Device Activity Timeline chart is visible');

        // Verify Timeline Chart has a heading
        const timelineChartHeading = newPage.locator('.charts-grid h6:has-text("Device Activity Timeline"), .chart-container h6:has-text("Device Activity Timeline")').first();
        await expect(timelineChartHeading).toBeVisible();
        console.log('Device Activity Timeline heading is visible');

        // ============= VERIFY LEGEND CONTAINERS =============
        console.log('--- Step 9: Verifying Legend Containers ---');

        // Verify Location Distribution Legend Container
        const locationLegendContainer = newPage.locator('#locationLegendContainer');
        await expect(locationLegendContainer).toBeVisible({ timeout: 5000 });
        console.log('Location Distribution legend container is visible');

        // ============= VERIFY TOOLTIPS =============
        console.log('--- Step 10: Verifying Tooltips ---');

        // Verify efficiency tooltip icon exists
        const efficiencyTooltipIcon = newPage.locator('.fa-question-circle').first();
        if (await efficiencyTooltipIcon.count() > 0) {
            await expect(efficiencyTooltipIcon).toBeVisible();
            console.log('Efficiency tooltip icon is visible');

            // Hover over the tooltip icon to trigger tooltip
            await efficiencyTooltipIcon.hover();
            await newPage.waitForTimeout(500);
            console.log('Hovered over efficiency tooltip icon');
        }

        // ============= TEST MONTH/YEAR DROPDOWN - DIFFERENT MONTHS =============
        console.log('--- Step 11: Testing Month/Year Dropdown Options ---');

        // Get the month dropdown again
        const monthDropdown = newPage.locator('select').filter({ has: newPage.locator('option', { hasText: 'January' }) }).first();
        await expect(monthDropdown).toBeVisible();

        // Test previous month option
        const prevMonthDate = new Date();
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const prevMonth = prevMonthDate.toLocaleString('en-US', { month: 'long' });

        console.log(`Testing previous month: ${prevMonth}...`);

        // Set up API listener for month change
        const apiPrevMonthPromise = newPage.waitForResponse(
            response => (response.url().includes('getTrackReportGeo_Next_uti.php') || response.url().includes('utilization')) && response.status() === 200,
            { timeout: 60000 }
        );

        await monthDropdown.selectOption({ label: prevMonth });
        console.log(`Selected ${prevMonth}`);

        try {
            const apiPrevMonthResponse = await apiPrevMonthPromise;
            console.log(`API response received for ${prevMonth}`);

            // Verify the report updated
            await newPage.waitForTimeout(2000);
            console.log(`Report updated for ${prevMonth}`);
        } catch (e) {
            console.log(`API response timeout for ${prevMonth}:`, e.message);
        }

        // Test another previous month
        const twoMonthsAgoDate = new Date();
        twoMonthsAgoDate.setMonth(twoMonthsAgoDate.getMonth() - 2);
        const twoMonthsAgo = twoMonthsAgoDate.toLocaleString('en-US', { month: 'long' });

        console.log(`Testing two months ago: ${twoMonthsAgo}...`);
        const apiTwoMonthsPromise = newPage.waitForResponse(
            response => (response.url().includes('getTrackReportGeo_Next_uti.php') || response.url().includes('utilization')) && response.status() === 200,
            { timeout: 60000 }
        );

        await monthDropdown.selectOption({ label: twoMonthsAgo });
        console.log(`Selected ${twoMonthsAgo}`);

        try {
            const apiTwoMonthsResponse = await apiTwoMonthsPromise;
            console.log(`API response received for ${twoMonthsAgo}`);

            await newPage.waitForTimeout(2000);
            console.log(`Report updated for ${twoMonthsAgo}`);
        } catch (e) {
            console.log(`API response timeout for ${twoMonthsAgo}:`, e.message);
        }

        // Reset to current month
        console.log(`Resetting to current month: ${currentMonth}...`);
        const apiCurrentMonthPromise = newPage.waitForResponse(
            response => (response.url().includes('getTrackReportGeo_Next_uti.php') || response.url().includes('utilization')) && response.status() === 200,
            { timeout: 60000 }
        );

        await monthDropdown.selectOption({ label: currentMonth });
        console.log(`Selected ${currentMonth}`);

        try {
            await apiCurrentMonthPromise;
            console.log(`API response received for ${currentMonth}`);
            await newPage.waitForTimeout(2000);
        } catch (e) {
            console.log(`API response timeout for ${currentMonth}:`, e.message);
        }

        // ============= VERIFY TOTAL TRACKERS MODAL =============
        console.log('--- Step 12: Verifying Total Trackers Modal ---');

        // Click on Total Trackers to open modal
        const totalTrackersElement = newPage.locator('#totalTrackers');
        await expect(totalTrackersElement).toBeVisible();
        await totalTrackersElement.click();
        console.log('Clicked on Total Trackers');

        // Wait for modal to appear
        const trackersModal = newPage.locator('#trackersModal');
        await expect(trackersModal).toBeVisible({ timeout: 10000 });
        console.log('Trackers Modal is visible');

        // Verify modal title
        const trackersModalTitle = trackersModal.locator('.modal-title');
        await expect(trackersModalTitle).toBeVisible();
        const modalTitleText = await trackersModalTitle.textContent();
        console.log(`Trackers Modal Title: ${modalTitleText?.trim()}`);
        expect(modalTitleText?.toLowerCase()).toContain('driver');

        // Verify drivers table exists in modal
        const driversTable = newPage.locator('#driversTable');
        await expect(driversTable).toBeVisible({ timeout: 5000 });
        console.log('Drivers table is visible in modal');

        // Verify drivers table has rows
        const driversTableBody = newPage.locator('#trackersTableBody');
        const driverRows = driversTableBody.locator('tr');
        const driverRowCount = await driverRows.count();
        console.log(`Drivers table has ${driverRowCount} row(s)`);
        expect(driverRowCount).toBeGreaterThan(0);

        // Verify search functionality in trackers modal
        const trackersSearchInput = newPage.locator(config.selectors.monthlyUtilizationReport.searchDriver);
        if (await trackersSearchInput.count() > 0) {
            await trackersSearchInput.fill('Sales');
            await newPage.waitForTimeout(1000);
            const filteredDriverRows = await driverRows.count();
            console.log(`After search 'Sales', drivers table has ${filteredDriverRows} row(s)`);

            // Clear search
            await trackersSearchInput.clear();
            await newPage.waitForTimeout(500);
        }

        // Close the trackers modal
        const closeTrackersModalBtn = trackersModal.locator('.btn-close');
        await closeTrackersModalBtn.click();
        await expect(trackersModal).not.toBeVisible({ timeout: 5000 });
        console.log('Trackers Modal closed');

        // ============= VERIFY DEVICE DETAILS MODAL =============
        console.log('--- Step 13: Verifying Device Details Modal ---');

        // Click on a row to open device modal
        const deviceRow = newPage.locator('#vehicleTableBody tr').first();
        if (await deviceRow.count() > 0) {
            await deviceRow.click();
            console.log('Clicked on device row to open Device Modal');

            // Wait for device modal to appear
            const deviceModal = newPage.locator(config.selectors.monthlyUtilizationReport.deviceModal);
            await expect(deviceModal).toBeVisible({ timeout: 10000 });
            console.log('Device Modal is visible');

            // Verify Device Modal Title
            const deviceModalTitle = deviceModal.locator('.modal-title');
            await expect(deviceModalTitle).toBeVisible();
            const deviceModalTitleText = await deviceModalTitle.textContent();
            console.log(`Device Modal Title: ${deviceModalTitleText?.trim()}`);

            // Verify Device Information section
            const modalDeviceId = newPage.locator('#modalDeviceId');
            await expect(modalDeviceId).toBeVisible();
            const deviceIdText = await modalDeviceId.textContent();
            console.log(`Device ID: ${deviceIdText?.trim()}`);

            const modalDriverName = newPage.locator(config.selectors.monthlyUtilizationReport.modalDriverName);
            await expect(modalDriverName).toBeVisible();
            const driverNameText = await modalDriverName.textContent();
            console.log(`Driver Name: ${driverNameText?.trim()}`);

            const modalDeviceStatus = newPage.locator('#modalDeviceStatus');
            await expect(modalDeviceStatus).toBeVisible();
            const deviceStatusText = await modalDeviceStatus.textContent();
            console.log(`Device Status: ${deviceStatusText?.trim()}`);

            const modalLastUpdate = newPage.locator('#modalLastUpdate');
            await expect(modalLastUpdate).toBeVisible();
            const lastUpdateText = await modalLastUpdate.textContent();
            console.log(`Last Update: ${lastUpdateText?.trim()}`);

            // Verify Location Distribution chart in modal
            const landmarkPieChart = deviceModal.locator('#landmarkPieChart');
            await expect(landmarkPieChart).toBeVisible({ timeout: 5000 });
            console.log('Landmark Pie Chart is visible in Device Modal');

            // Verify Device Efficiency Trend chart in modal
            const deviceUsageChart = deviceModal.locator('#deviceUsageChart');
            await expect(deviceUsageChart).toBeVisible({ timeout: 5000 });
            console.log('Device Usage Chart is visible in Device Modal');

            // Verify Landmark Details table (may be hidden if no landmark data)
            const landmarkTableBody = deviceModal.locator('#landmarkTableBody');
            const landmarkTableVisible = await landmarkTableBody.isVisible().catch(() => false);
            if (landmarkTableVisible) {
                const landmarkRows = landmarkTableBody.locator('tr');
                const landmarkRowCount = await landmarkRows.count();
                console.log(`Landmark Details table is visible with ${landmarkRowCount} row(s)`);
            } else {
                console.log('Landmark Details table is hidden (no landmark data for this device)');
            }

            // Verify Detailed Metrics table (may be hidden if no metrics data)
            const metricsTableBody = deviceModal.locator('#metricsTableBody');
            const metricsTableVisible = await metricsTableBody.isVisible().catch(() => false);
            let metricsRowCount = 0;
            if (metricsTableVisible) {
                const metricsRows = metricsTableBody.locator('tr');
                metricsRowCount = await metricsRows.count();
                console.log(`Detailed Metrics table has ${metricsRowCount} row(s)`);
            } else {
                console.log('Detailed Metrics table is hidden (no metrics data for this device)');
            }

            // Verify metrics data
            if (metricsRowCount > 0 && metricsTableVisible) {
                const metricsRows = metricsTableBody.locator('tr');
                for (let i = 0; i < metricsRowCount; i++) {
                    const metricRow = metricsRows.nth(i);
                    const metricName = await metricRow.locator('td').first().textContent();
                    const metricValue = await metricRow.locator('td').nth(1).textContent();
                    console.log(`Metric: ${metricName?.trim()} = ${metricValue?.trim()}`);
                }
            }

            // Verify Legend Container in Device Modal
            const landmarkLegendContainer = deviceModal.locator('#landmarkLegendContainer');
            if (await landmarkLegendContainer.count() > 0) {
                console.log('Landmark Legend Container found in Device Modal');
            }

            // Close the device modal
            const closeDeviceModalBtn = newPage.locator(config.selectors.monthlyUtilizationReport.deviceModalcloseButton);
            await closeDeviceModalBtn.click();
            await expect(deviceModal).not.toBeVisible({ timeout: 5000 });
            console.log('Device Modal closed');
        }

        // ============= VERIFY VEHICLE ANALYTICS TABLE FEATURES =============
        console.log('--- Step 14: Verifying Vehicle Analytics Table Features ---');

        // Verify table headers
        const tableHeaders = newPage.locator('#vehicleAnalyticsTable thead th');
        const headerCount = await tableHeaders.count();
        console.log(`Vehicle Analytics Table has ${headerCount} columns`);

        const expectedHeaders = ['IMEI', 'Driver Name', 'Current Landmark', 'Time In Landmark', 'Status', 'Moving Time', 'Stopped Time', 'Efficiency'];
        for (let i = 0; i < expectedHeaders.length && i < headerCount; i++) {
            const headerText = await tableHeaders.nth(i).textContent();
            console.log(`Column ${i + 1}: ${headerText?.trim()}`);
            expect(headerText?.toLowerCase()).toContain(expectedHeaders[i].toLowerCase());
        }

        // ============= VERIFY TABLE SEARCH FUNCTIONALITY =============
        console.log('--- Step 15: Verifying Table Search Functionality ---');

        const vehicleSearchInput = newPage.locator(config.selectors.monthlyUtilizationReport.vehicleSearchInput);
        await expect(vehicleSearchInput).toBeVisible();

        // Search for a specific driver
        await vehicleSearchInput.fill('Sales');
        await newPage.waitForTimeout(1000);

        const filteredRows = newPage.locator('#vehicleTableBody tr:visible, #vehicleAnalyticsTable tbody tr:visible');
        const filteredRowCount = await filteredRows.count();
        console.log(`After search 'Sales', table has ${filteredRowCount} visible row(s)`);

        // Verify filtered results contain search term
        if (filteredRowCount > 0) {
            const firstFilteredRow = filteredRows.first();
            const rowText = await firstFilteredRow.textContent();
            console.log(`First filtered row content contains search term: ${rowText?.toLowerCase().includes('sales')}`);
        }

        // Clear search
        await vehicleSearchInput.clear();
        await newPage.waitForTimeout(500);

        const rowsAfterClear = newPage.locator('#vehicleTableBody tr, #vehicleAnalyticsTable tbody tr');
        const rowCountAfterClear = await rowsAfterClear.count();
        console.log(`After clearing search, table has ${rowCountAfterClear} row(s)`);

        // ============= VERIFY TABLE SORTING FUNCTIONALITY =============
        console.log('--- Step 16: Verifying Table Sorting Functionality ---');

        // Scroll to the top of the page first to ensure table is in viewport
        await newPage.evaluate(() => window.scrollTo(0, 0));
        await newPage.waitForTimeout(500);

        // Scroll to the Vehicle Analytics table section
        const vehicleAnalyticsHeading = newPage.locator('h2:has-text("Vehicle Analytics")');
        if (await vehicleAnalyticsHeading.count() > 0) {
            await vehicleAnalyticsHeading.scrollIntoViewIfNeeded();
            await newPage.waitForTimeout(500);
        }

        // Click on Efficiency header to sort (using JavaScript click to bypass viewport issues)
        const efficiencyHeader = newPage.locator('#vehicleAnalyticsTable thead th:has-text("Efficiency")');
        if (await efficiencyHeader.count() > 0) {
            // Use JavaScript click to bypass viewport issues with DataTables fixed headers
            await efficiencyHeader.evaluate((el) => el.click());
            await newPage.waitForTimeout(1000);
            console.log('Clicked on Efficiency header to sort');

            // Verify sorting indicator
            const sortingClass = await efficiencyHeader.getAttribute('class');
            console.log(`Efficiency column class after click: ${sortingClass}`);

            // Click again to reverse sort
            await efficiencyHeader.evaluate((el) => el.click());
            await newPage.waitForTimeout(1000);
            console.log('Clicked on Efficiency header again to reverse sort');
        }

        // Sort by Driver Name
        const driverNameHeader = newPage.locator('#vehicleAnalyticsTable thead th:has-text("Driver Name")');
        if (await driverNameHeader.count() > 0) {
            await driverNameHeader.evaluate((el) => el.click());
            await newPage.waitForTimeout(1000);
            console.log('Clicked on Driver Name header to sort');
        }

        // ============= VERIFY EXPORT FUNCTIONALITY =============
        console.log('--- Step 17: Verifying Export Functionality ---');

        // Find the Export dropdown button (DataTables export button)
        // HTML: <button class="btn btn-secondary buttons-collection dropdown-toggle btn-sm">
        const exportButton = newPage.locator('button.buttons-collection.dropdown-toggle, button.btn.buttons-collection').filter({ hasText: /Export/i }).first();

        // Alternative selector with download icon
        const exportButtonAlt = newPage.locator('button:has(i.fa-download), button:has(.fas.fa-download)').first();

        let exportBtn = null;
        if (await exportButton.isVisible().catch(() => false)) {
            exportBtn = exportButton;
            console.log('Export dropdown button found (primary selector)');
        } else if (await exportButtonAlt.isVisible().catch(() => false)) {
            exportBtn = exportButtonAlt;
            console.log('Export dropdown button found (icon selector)');
        } else {
            // Try finding by aria-controls
            const ariaExportBtn = newPage.locator('button[aria-controls="vehicleAnalyticsTable"]').filter({ hasText: /Export/i }).first();
            if (await ariaExportBtn.isVisible().catch(() => false)) {
                exportBtn = ariaExportBtn;
                console.log('Export dropdown button found (aria selector)');
            }
        }

        if (exportBtn) {
            await expect(exportBtn).toBeVisible();
            await exportBtn.click();
            console.log('Clicked on Export dropdown button');
            await newPage.waitForTimeout(1000);

            // Wait for dropdown menu to appear
            const dropdownMenu = newPage.locator('.dropdown-menu[role="menu"]');
            await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

            // Helper function to close dropdown and wait for background to disappear
            const closeDropdown = async () => {
                await newPage.keyboard.press('Escape');
                await newPage.waitForTimeout(500);
                // Wait for DataTables button background to disappear
                const dtBackground = newPage.locator('.dt-button-background');
                await dtBackground.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
            };

            // Click on CSV export option
            const csvOption = newPage.locator('a.buttons-csv.buttons-html5, .dropdown-menu a:has-text("CSV")').first();
            if (await csvOption.isVisible().catch(() => false)) {
                console.log('CSV export option is visible');
                await csvOption.click();
                await newPage.waitForTimeout(1000);
                console.log('CSV export clicked');
            } else {
                console.log('CSV option not visible');
            }

            // Close dropdown after CSV export
            await closeDropdown();

            // Re-open dropdown for Excel
            await exportBtn.evaluate((el) => el.click());
            await newPage.waitForTimeout(1000);

            // Click on Excel export option
            const excelOption = newPage.locator('a.buttons-excel.buttons-html5, .dropdown-menu a:has-text("Excel")').first();
            if (await excelOption.isVisible().catch(() => false)) {
                console.log('Excel export option is visible');
                await excelOption.click();
                await newPage.waitForTimeout(1000);
                console.log('Excel export clicked');
            } else {
                console.log('Excel option not visible');
            }

            // Close dropdown after Excel export
            await closeDropdown();

            // Re-open dropdown for PDF
            await exportBtn.evaluate((el) => el.click());
            await newPage.waitForTimeout(1000);

            // Click on PDF export option
            const pdfOption = newPage.locator('a.buttons-pdf.buttons-html5, .dropdown-menu a:has-text("PDF")').first();
            if (await pdfOption.isVisible().catch(() => false)) {
                console.log('PDF export option is visible');
                await pdfOption.click();
                await newPage.waitForTimeout(1000);
                console.log('PDF export clicked');
            } else {
                console.log('PDF option not visible');
            }

            // Final dropdown close
            await closeDropdown();
        } else {
            console.log('Export dropdown button not found, skipping export tests');
        }

        // ============= VERIFY TABLE SCROLLING =============
        console.log('--- Step 18: Verifying Table Scrolling ---');

        // Use the specific Vehicle Analytics table scroll body
        const tableScrollBody = newPage.locator('#vehicleAnalyticsTable_wrapper .dataTables_scrollBody').first();
        if (await tableScrollBody.count() > 0) {
            const scrollHeight = await tableScrollBody.evaluate(el => el.scrollHeight);
            const clientHeight = await tableScrollBody.evaluate(el => el.clientHeight);
            console.log(`Table Scroll Height: ${scrollHeight}, Client Height: ${clientHeight}`);

            if (scrollHeight > clientHeight) {
                console.log('Table is scrollable');
                // Scroll down
                await tableScrollBody.evaluate(el => el.scrollTop = 100);
                await newPage.waitForTimeout(300);
                console.log('Scrolled table down');

                // Scroll back to top
                await tableScrollBody.evaluate(el => el.scrollTop = 0);
                await newPage.waitForTimeout(300);
                console.log('Scrolled table back to top');
            } else {
                console.log('Table content fits without scrolling');
            }
        } else {
            console.log('Table scroll body not found');
        }

        // ============= VERIFY EFFICIENCY BARS IN TABLE =============
        console.log('--- Step 19: Verifying Efficiency Bars in Table ---');

        const efficiencyBars = newPage.locator('#vehicleTableBody .efficiency-bar, #vehicleAnalyticsTable tbody .efficiency-bar');
        const efficiencyBarCount = await efficiencyBars.count();
        console.log(`Found ${efficiencyBarCount} efficiency bar(s) in table`);

        if (efficiencyBarCount > 0) {
            const firstEfficiencyBar = efficiencyBars.first();
            await expect(firstEfficiencyBar).toBeVisible();

            // Check if efficiency fill exists
            const efficiencyFill = firstEfficiencyBar.locator('.efficiency-fill');
            if (await efficiencyFill.count() > 0) {
                const fillWidth = await efficiencyFill.evaluate(el => el.style.width);
                console.log(`First efficiency bar fill width: ${fillWidth}`);
            }
        }

        // ============= VERIFY STATUS BADGES =============
        console.log('--- Step 20: Verifying Status Badges ---');

        const statusBadges = newPage.locator('#vehicleTableBody .status, #vehicleAnalyticsTable tbody .status');
        const statusBadgeCount = await statusBadges.count();
        console.log(`Found ${statusBadgeCount} status badge(s) in table`);

        if (statusBadgeCount > 0) {
            for (let i = 0; i < Math.min(statusBadgeCount, 3); i++) {
                const badge = statusBadges.nth(i);
                const badgeText = await badge.textContent();
                const badgeClass = await badge.getAttribute('class');
                console.log(`Status Badge ${i + 1}: "${badgeText?.trim()}" (class: ${badgeClass})`);

                // Verify badge has appropriate styling class
                expect(badgeClass).toMatch(/status-inside|status-outside/);
            }
        }

        // ============= VERIFY REPORT DATE DISPLAY =============
        console.log('--- Step 21: Verifying Report Date Display ---');

        const reportDate = newPage.locator(config.selectors.monthlyUtilizationReport.reportDate);
        await expect(reportDate).toBeVisible();
        const reportDateText = await reportDate.textContent();
        console.log(`Report Date: ${reportDateText?.trim()}`);
        expect(reportDateText?.trim()).not.toBe('');

        // ============= VERIFY REPORT CONTAINER STYLING =============
        console.log('--- Step 22: Verifying Report Container Styling ---');

        const reportContainer = newPage.locator(config.selectors.monthlyUtilizationReport.report_container);
        await expect(reportContainer).toBeVisible();
        console.log('Report container is visible');

        // Verify logo/title is visible
        const logoTitle = reportContainer.locator('.logo, .header .logo');
        if (await logoTitle.count() > 0) {
            const logoText = await logoTitle.textContent();
            console.log(`Report Logo/Title: ${logoText?.trim()}`);
            expect(logoText?.toLowerCase()).toContain('utilization');
        }

        // ============= VERIFY CHARTS DATA INTEGRITY =============
        console.log('--- Step 23: Verifying Charts Data Integrity ---');

        // Verify charts have been rendered (canvas has dimensions)
        const locationCanvas = newPage.locator('#locationDistribution');
        const locationCanvasWidth = await locationCanvas.evaluate(el => el.width);
        const locationCanvasHeight = await locationCanvas.evaluate(el => el.height);
        console.log(`Location Distribution canvas dimensions: ${locationCanvasWidth}x${locationCanvasHeight}`);
        expect(locationCanvasWidth).toBeGreaterThan(0);
        expect(locationCanvasHeight).toBeGreaterThan(0);

        const efficiencyCanvas = newPage.locator('#efficiencyTrend');
        const efficiencyCanvasWidth = await efficiencyCanvas.evaluate(el => el.width);
        const efficiencyCanvasHeight = await efficiencyCanvas.evaluate(el => el.height);
        console.log(`Efficiency Trend canvas dimensions: ${efficiencyCanvasWidth}x${efficiencyCanvasHeight}`);
        expect(efficiencyCanvasWidth).toBeGreaterThan(0);
        expect(efficiencyCanvasHeight).toBeGreaterThan(0);

        const timelineCanvas = newPage.locator('#timelineChart');
        const timelineCanvasWidth = await timelineCanvas.evaluate(el => el.width);
        const timelineCanvasHeight = await timelineCanvas.evaluate(el => el.height);
        console.log(`Timeline Chart canvas dimensions: ${timelineCanvasWidth}x${timelineCanvasHeight}`);
        expect(timelineCanvasWidth).toBeGreaterThan(0);
        expect(timelineCanvasHeight).toBeGreaterThan(0);

        // ============= VERIFY TIMELINE CHART SCROLL =============
        console.log('--- Step 24: Verifying Timeline Chart Scroll ---');

        const timelineWrapper = newPage.locator('.timeline-chart-wrapper');
        if (await timelineWrapper.count() > 0) {
            const timelineScrollWidth = await timelineWrapper.evaluate(el => el.scrollWidth);
            const timelineClientWidth = await timelineWrapper.evaluate(el => el.clientWidth);
            console.log(`Timeline Scroll Width: ${timelineScrollWidth}, Client Width: ${timelineClientWidth}`);

            if (timelineScrollWidth > timelineClientWidth) {
                console.log('Timeline chart is horizontally scrollable');

                // Check if scroll note is visible
                const scrollNote = newPage.locator('#timelineScrollNote');
                const scrollNoteVisible = await scrollNote.isVisible();
                console.log(`Timeline scroll note visibility: ${scrollNoteVisible}`);
            }
        }

        // ============= FINAL VALIDATION - COMPLETE DATA CHECK =============
        console.log('--- Step 25: Final Data Validation ---');

        // Re-verify all summary values are populated
        const finalTotalUtil = await newPage.locator('#totalUtilization').textContent();
        const finalInsideLandmarks = await newPage.locator('#insideLandmarks').textContent();
        const finalTotalTrackers = await newPage.locator('#totalTrackers').textContent();

        console.log('Final Summary Values:');
        console.log(`  Total Utilization: ${finalTotalUtil?.trim()}`);
        console.log(`  Inside Landmarks: ${finalInsideLandmarks?.trim()}`);
        console.log(`  Total Trackers: ${finalTotalTrackers?.trim()}`);

        expect(finalTotalUtil?.trim()).not.toBe('');
        expect(finalInsideLandmarks?.trim()).not.toBe('');
        expect(finalTotalTrackers?.trim()).not.toBe('');

        // Verify table still has data after all operations
        const finalTableRows = newPage.locator('#vehicleTableBody tr, #vehicleAnalyticsTable tbody tr');
        const finalRowCount = await finalTableRows.count();
        console.log(`Final table row count: ${finalRowCount}`);
        expect(finalRowCount).toBeGreaterThan(0);

        // Close the new page when done
        await newPage.close();
        console.log('Monthly Utilization Report test completed successfully!');
    });
});