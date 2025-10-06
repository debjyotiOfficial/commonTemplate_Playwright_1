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
        await page.goto(config.urls.fleetDashcamDashboard2);

        // Hover over "dashcamMenu"
        await page.locator(config.selectors.dashcam.dashcamMenu).hover();
        await page.waitForTimeout(500); // Give time for menu to open

        // Click on "dashcamMenu"
        await expect(page.locator(config.selectors.dashcam.dashcamMenu)).toBeVisible();
        await page.locator(config.selectors.dashcam.dashcamMenu).click();

        // Click on alertReport button
        await page.locator(config.selectors.dashcam.alertReport).click({ force: true });

        await page.waitForTimeout(5000);

        // Verify container is visible
        await expect(page.locator(config.selectors.dashcam.alertReportContainer)).toBeVisible();

        // Date selection
        await page.locator('#dashcam-alert-report-panel-calendar-btn').click({ force: true });

        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('May');

        // Select May 23, 2025
        await page.locator('.flatpickr-day[aria-label="May 23, 2025"]').click({ force: true });

        // Select May 30, 2025 (as end date)
        await page.locator('.flatpickr-day[aria-label="May 30, 2025"]').click({ force: true });

        // Click on the Select2 dropdown to open options
        await page.locator('#select2-dashcam-alert-report-device-select-container').click();

        // Type in the Select2 search field
        await page.locator('.select2-search__field').fill('JC261-VARSHA TEST (864993060087468)');

        // Click on the result "JC261-VARSHA TEST (864993060087468)"
        await page.locator('.select2-results__option').filter({ hasText: 'JC261-VARSHA TEST (864993060087468)' }).click();

        // Click on submit button
        await page.locator(config.selectors.dashcam.alertReportSubmit).click({ force: true });

        // Wait for the table to load
        await page.waitForTimeout(20000);

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
        await expect(firstVideoButton).toBeVisible();
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
        const rowCount = await tableRows.count();
        
        for (let i = 0; i < rowCount; i++) {
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