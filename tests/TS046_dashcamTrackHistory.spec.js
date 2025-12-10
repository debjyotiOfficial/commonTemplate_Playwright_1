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

        // Click on Dashcam accordion header to expand menu
        const dashcamAccordion = page.locator('#bottom-nav-dashcam .accordion__header');
        await expect(dashcamAccordion).toBeVisible();
        await dashcamAccordion.click();

        // Wait for accordion to expand
        await page.waitForTimeout(1000);

        // Click on Track History option
        const trackHistoryOption = page.locator('#bottom-nav-track-history');
        await expect(trackHistoryOption).toBeVisible();
        await trackHistoryOption.click({ force: true });

        await page.waitForTimeout(5000); // Wait for the page to load

        // Verify container is visible
        await expect(page.locator(config.selectors.dashcam.playBackContainer)).toBeVisible();

        // Click on the Select2 dropdown to open options
        await page.locator('#select2-dashcam-track-history-device-select-container').click();

        // Type in the Select2 search field
        await page.locator('.select2-search__field').fill('M4000-Varsha (353899265234672)');

        // Click on the result "M4000-Varsha (353899265234672)"
        await page.locator('.select2-results__option').filter({ hasText: 'M4000-Varsha (353899265234672)' }).click();

        // Date selection
        await page.locator('#dashcam-track-history-date-range-picker').click({ force: true });

        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('July');
        
        // Select July 1, 2025
        await page.locator('.flatpickr-day[aria-label="July 1, 2025"]').click({ force: true });

        // Select July 10, 2025 (as end date)
        await page.locator('.flatpickr-day[aria-label="July 10, 2025"]').click({ force: true });

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
        await mapMarker.click();

        // Assert that the info box appears and contains the expected text
        await expect(page.locator('.H_ib_body')).toBeVisible();
        await expect(page.locator('.H_ib_body')).toContainText('M4000-Varsha');
        console.log('✓ Info box opened for original marker with alerts');

        // Close the popup if there's a close button
        const closeButton = page.locator('.H_ib_body').locator('..').locator('[class*="close"], [class*="Close"], .popup-close').first();
        try {
            await closeButton.click({ force: true });
        } catch (error) {
            console.log('Close button not found or not clickable');
        }

        // Click on div with z-index: 0
        const zIndex0Element = page.locator('div[style*="z-index: 0"]').first();
        if (await zIndex0Element.isVisible()) {
            await zIndex0Element.click();
            await page.waitForTimeout(1000);
            
            // Verify info box opens
            await expect(page.locator('.H_ib_body')).toBeVisible();
            console.log('✓ Info box opened for z-index: 0 element with alerts');
            
            // Close popup
            try {
                await closeButton.click({ force: true });
            } catch (error) {
                console.log('Close button not found or not clickable');
            }
        } else {
            console.log('No z-index: 0 element found');
        }

        // Click on div with z-index: 1
        const zIndex1Element = page.locator('div[style*="z-index: 1"]').first();
        if (await zIndex1Element.isVisible()) {
            await zIndex1Element.click();
            await page.waitForTimeout(1000);
            
            // Verify info box opens
            await expect(page.locator('.H_ib_body')).toBeVisible();
            console.log('✓ Info box opened for z-index: 1 element with alerts');
            
            // Close popup
            try {
                await closeButton.click({ force: true });
            } catch (error) {
                console.log('Close button not found or not clickable');
            }
        } else {
            console.log('No z-index: 1 element found');
        }

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
            await mapMarkerTrackingOnly.click();

            // Assert that the info box appears and contains the expected text
            await expect(page.locator('.H_ib_body')).toBeVisible();
            await expect(page.locator('.H_ib_body')).toContainText('M4000-Varsha');
            console.log('✓ Info box opened for original marker with tracking only');

            // Close popup
            try {
                await closeButton.click({ force: true });
            } catch (error) {
                console.log('Close button not found or not clickable');
            }
        }

        // Click on div with z-index: 0 for tracking only
        const zIndex0ElementTrackingOnly = page.locator('div[style*="z-index: 0"]').first();
        if (await zIndex0ElementTrackingOnly.isVisible()) {
            await zIndex0ElementTrackingOnly.click();
            await page.waitForTimeout(1000);
            
            // Verify info box opens
            await expect(page.locator('.H_ib_body')).toBeVisible();
            console.log('✓ Info box opened for z-index: 0 element with tracking only');
            
            // Close popup
            try {
                await closeButton.click({ force: true });
            } catch (error) {
                console.log('Close button not found or not clickable');
            }
        } else {
            console.log('No z-index: 0 element found for tracking only');
        }

        // Click on div with z-index: 1 for tracking only
        const zIndex1ElementTrackingOnly = page.locator('div[style*="z-index: 1"]').first();
        if (await zIndex1ElementTrackingOnly.isVisible()) {
            await zIndex1ElementTrackingOnly.click();
            await page.waitForTimeout(1000);
            
            // Verify info box opens
            await expect(page.locator('.H_ib_body')).toBeVisible();
            console.log('✓ Info box opened for z-index: 1 element with tracking only');
        } else {
            console.log('No z-index: 1 element found for tracking only');
        }

        console.log('✅ All tracking history tests completed successfully');
    });
});