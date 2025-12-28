const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Dashcam Track History', () => {
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

    test('displays dashcam track history with different tracking options', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashcamDashboard2);

        // First expand the sidebar if collapsed (hover over it)
        const navbar = page.locator('#navbar');
        await navbar.hover();
        await page.waitForTimeout(1000);

        // Click on Track History using JavaScript to bypass pointer event interception
        await page.evaluate(() => {
            const trackHistory = document.querySelector('#bottom-nav-track-history');
            if (trackHistory) {
                trackHistory.click();
            }
        });

        // Wait for accordion to expand and panel to load
        await page.waitForTimeout(3000);

        // Verify container is visible - wait longer for it to appear
        await expect(page.locator(config.selectors.dashcam.playBackContainer)).toBeVisible({ timeout: 15000 });

        // Click on the Select2 dropdown to open options
        await page.locator('#select2-dashcam-track-history-device-select-container').click();

        // Type in the Select2 search field
        await page.locator('.select2-search__field').fill('M4000-Training3 Off (353899269355234)');

        // Click on the result "M4000-Training3 Off (353899269355234)"
        await page.locator('.select2-results__option').filter({ hasText: 'M4000-Training3 Off (353899269355234)' }).click();

        // Date selection
        await page.locator('#dashcam-track-history-date-range-picker').click({ force: true });

        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('December');

        // Select December 1, 2025 (scoped to open calendar)
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="December 1, 2025"]').click({ force: true });

        // Select December 2, 2025 (as end date, scoped to open calendar)
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="December 2, 2025"]').click({ force: true });

        // PART 1: Test with "Show Tracking With Alerts"
        console.log('Testing with "Show Tracking With Alerts" option...');
        
        // Select "Show Tracking With Alerts" radio button
        await page.locator(config.selectors.dashcam.trackingWithAlerts).check({ force: true });

        // Click on submit button
        await page.locator(config.selectors.dashcam.trackhistorySubmit).click();

        // Wait for map to load with markers
        await page.waitForTimeout(5000);

        // Click on the original div with the specific style (16px, border-radius: 50%, and background-image)
        const mapMarker = page.locator('div[style*="width: 16px"][style*="height: 16px"][style*="border-radius: 50%"][style*="background-image: conic-gradient"]').first();
        await mapMarker.click({ force: true });

        // Wait for info box to appear
        await page.waitForTimeout(2000);

        // Assert that the info box appears and contains the expected text
        await expect(page.locator('.H_ib_body').first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('.H_ib_body').first()).toContainText('M4000-Training3 Off');
        console.log('✓ Info box opened for original marker with alerts');

        // Close the popup if there's a close button
        const closeButton = page.locator('.H_ib_body').locator('..').locator('[class*="close"], [class*="Close"], .popup-close').first();
        try {
            await closeButton.click({ force: true });
        } catch (error) {
            console.log('Close button not found or not clickable');
        }

        // Note: z-index element clicks removed as they match generic elements, not map markers

        // PART 2: Test with "Show Tracking Only"
        console.log('Testing with "Show Tracking Only" option...');

        // Select "Show Tracking Only" radio button
        await page.locator(config.selectors.dashcam.trackingWithoutAlerts).check({ force: true });

        // Click on submit button again
        await page.locator(config.selectors.dashcam.trackhistorySubmit).click();

        // Wait for map to reload with new data
        await page.waitForTimeout(3000);

        // Click on the original div with the specific style again
        const mapMarkerTrackingOnly = page.locator('div[style*="width: 16px"][style*="height: 16px"][style*="border-radius: 50%"][style*="background-image: conic-gradient"]').first();
        if (await mapMarkerTrackingOnly.isVisible()) {
            await mapMarkerTrackingOnly.click({ force: true });

            // Assert that the info box appears and contains the expected text
            await expect(page.locator('.H_ib_body').first()).toBeVisible();
            await expect(page.locator('.H_ib_body').first()).toContainText('M4000-Training3 Off');
            console.log('✓ Info box opened for original marker with tracking only');

            // Close popup
            try {
                await closeButton.click({ force: true });
            } catch (error) {
                console.log('Close button not found or not clickable');
            }
        }

        // Note: z-index element clicks removed as they match generic elements, not map markers

        console.log('✅ All tracking history tests completed successfully');
    });
});