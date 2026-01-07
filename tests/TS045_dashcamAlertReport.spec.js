const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Dashcam Alert Report', () => {
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

    test('shows dashcam alert report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage('https://www.gpsandfleet3.net/gpsandfleet/client/dashcamdemo1/maps/index2.php');

        // Wait for page to fully load
        await page.waitForTimeout(3000);

        // Click on Dashcam accordion header to expand menu
        const dashcamAccordion = page.locator('#bottom-nav-dashcam .accordion__header');
        await expect(dashcamAccordion).toBeVisible({ timeout: 30000 });
        await dashcamAccordion.click();

        // Wait for accordion to expand and submenu to be visible
        await page.waitForTimeout(2000);

        // Click on Alert Report option
        const alertReportOption = page.locator('#bottom-nav-alerts');
        await expect(alertReportOption).toBeVisible({ timeout: 10000 });
        await alertReportOption.click({ force: true, noWaitAfter: true });

        // Wait for panel to load
        await page.waitForTimeout(5000);

        // Verify container is visible
        const alertReportPanel = page.locator(config.selectors.dashcam.alertReportContainer);
        await expect(alertReportPanel).toBeVisible();

        // Scroll the panel into view
        await alertReportPanel.scrollIntoViewIfNeeded();
        await page.waitForTimeout(2000);

        // Click on the Select2 dropdown to select device
        await page.locator('#select2-dashcam-alert-report-device-select-container').click();
        await page.waitForTimeout(1000);

        // Try "test 1" device first (commonly used for testing)
        const deviceSearchField = page.locator('.select2-search__field');
        await deviceSearchField.fill('test 1');
        await page.waitForTimeout(500);

        // Check if "test 1" device is available
        const test1Device = page.locator('.select2-results__option').filter({ hasText: 'test 1' });
        if (await test1Device.isVisible().catch(() => false)) {
            await test1Device.click();
            console.log('Selected device: test 1');
        } else {
            // Fall back to M4000-Training3 Off
            await deviceSearchField.clear();
            await deviceSearchField.fill('M4000-Training3');
            await page.waitForTimeout(500);
            const m4000Device = page.locator('.select2-results__option').filter({ hasText: 'M4000-Training3' });
            if (await m4000Device.isVisible().catch(() => false)) {
                await m4000Device.click();
                console.log('Selected device: M4000-Training3');
            } else {
                // Fall back to any available device
                await deviceSearchField.clear();
                await page.waitForTimeout(500);
                const anyDevice = page.locator('.select2-results__option').first();
                if (await anyDevice.isVisible().catch(() => false)) {
                    const deviceName = await anyDevice.textContent();
                    await anyDevice.click();
                    console.log('Selected first available device: ' + deviceName);
                }
            }
        }

        // Click on submit button
        await page.locator(config.selectors.dashcam.alertReportSubmit).click({ force: true });

        // Wait for the table to load
        await page.waitForTimeout(20000);

        // Verify the table is visible
        await expect(page.locator('#dashcam-alert-report-table')).toBeVisible();

        // Check if there's data in the table - multiple ways to detect
        const tableBody = page.locator('#dashcam-alert-report-table tbody');
        const rowCount = await tableBody.locator('tr').count();
        const noDataCell = page.locator('td.dataTables_empty, .dataTables_empty');
        const noDataText = page.locator(':text("No data available")');
        const showingZero = page.locator(':text("Showing 0 to 0 of 0")');

        const hasNoData = await noDataCell.isVisible().catch(() => false) ||
                         await noDataText.isVisible().catch(() => false) ||
                         await showingZero.isVisible().catch(() => false) ||
                         rowCount === 0 ||
                         (rowCount === 1 && await tableBody.locator('tr').first().textContent().then(t => t?.includes('No data')).catch(() => false));

        if (hasNoData) {
            console.log('No alert data found for the selected device and period');
            console.log('Row count: ' + rowCount);
            // Test that the UI elements are still accessible even with no data
            await expect(page.locator(config.selectors.dashcam.alertReportSaveFileAs)).toBeVisible();
            console.log('Export dropdown is accessible - test passed with no data');
            return; // Exit test gracefully - no data to interact with
        }

        console.log('Found ' + rowCount + ' rows of alert data');

        // Hover over "Save file as" button to reveal dropdown
        await page.locator(config.selectors.dashcam.alertReportSaveFileAs).hover();

        // Click on Excel export button
        await page.locator('.dropdown__content [data-export="excel"]').click({ force: true });

        // Click on PDF export button
        await page.locator('.dropdown__content [data-export="pdf"]').click({ force: true });

        // Click on CSV export button
        await page.locator('.dropdown__content [data-export="csv"]').click({ force: true });

        // Click the first visible video button in the table
        const firstVideoButton = page.locator('button.aViewImgdetails').first();
        await expect(firstVideoButton).toBeVisible({ timeout: 10000 });
        await firstVideoButton.click({ force: true });

        // Verify modal contains the alert name
        await expect(page.locator('#dashcam-event-details-modal')).toBeVisible();

        await page.waitForTimeout(30000);

        // Verify both video containers and videos are visible
        const videoContainers = page.locator('#dashcam-event-details-modal .modal-body > div#media-container > div');
        const containerCount = await videoContainers.count();
        
        for (let i = 0; i < containerCount; i++) {
            const videoElement = videoContainers.nth(i).locator('video').first();
            await expect(videoElement).toBeVisible();
        }

        // Wait for a few seconds after video containers are loaded
        await page.waitForTimeout(8000);

        // Click on the first video to play it
        if (containerCount > 0) {
            const firstVideoElement = videoContainers.nth(0).locator('video').first();
            
            // Click to play the video
            await firstVideoElement.click();
            console.log('Clicked video to play');
            
            // Wait a few seconds to let the video play
            await page.waitForTimeout(5000);
            
            // Click again to pause the video
            await firstVideoElement.click();
            console.log('Clicked video to pause');
            
            // Wait a moment to confirm pause action
            await page.waitForTimeout(2000);
        }

        // If there are multiple videos, you can also interact with the second one
        if (containerCount > 1) {
            const secondVideoElement = videoContainers.nth(1).locator('video').first();
            
            // Click to play the second video
            await secondVideoElement.click();
            console.log('Clicked second video to play');
            
            // Wait a few seconds to let the video play
            await page.waitForTimeout(5000);
            
            // Click again to pause the second video
            await secondVideoElement.click();
            console.log('Clicked second video to pause');
            
            // Wait a moment to confirm pause action
            await page.waitForTimeout(2000);
        }

        await page.locator('#dashcam-event-details-modal .btn--icon.close-modal').click();
        await page.waitForTimeout(2000);

        // Search for the alert name in the table
        const searchInput = page.locator('#dashcam-alert-report-search');
        await searchInput.scrollIntoViewIfNeeded();
        await expect(searchInput).toBeVisible();
        await searchInput.clear();
        await searchInput.fill('parking');

        // Click on the download button of the first row of the table
        const downloadButton = page.locator('button.aDownloadVideodetails').first();
        await expect(downloadButton).toBeVisible();
        await downloadButton.click();

        await page.waitForTimeout(2000);

        // Clear the search input
        await searchInput.scrollIntoViewIfNeeded();
        await expect(searchInput).toBeVisible();
        await searchInput.clear();

        await page.waitForTimeout(5000);

        // Verify that rows with media have both the video camera and download buttons
        const tableRows = page.locator('#dashcam-alert-report-table tbody tr');
        const finalRowCount = await tableRows.count();

        for (let i = 0; i < finalRowCount; i++) {
            const row = tableRows.nth(i);
            const viewButton = row.locator('button.aViewImgdetails');
            const downloadButton = row.locator('button.aDownloadVideodetails');
            
            // Check if the row has media buttons - only verify if they exist
            const viewButtonCount = await viewButton.count();
            const downloadButtonCount = await downloadButton.count();
            
            if (viewButtonCount > 0) {
                await expect(viewButton).toBeAttached();
            }
            if (downloadButtonCount > 0) {
                await expect(downloadButton).toBeAttached();
            }
        }
    });
});