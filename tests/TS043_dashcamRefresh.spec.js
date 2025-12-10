const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Dashcam Refresh', () => {
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

    test('should refresh dashcam functionality', async ({ page }) => {
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

        // Click on Dashcam Refresh option
        const dashcamRefreshOption = page.locator('#bottom-nav-refresh-dashcam');
        await expect(dashcamRefreshOption).toBeVisible();
        await dashcamRefreshOption.click({ force: true });

        await page.waitForTimeout(config.timeouts.wait);

        // Wait for the dashcam refresh container to be visible
        await expect(page.locator(config.selectors.dashcam.dashcamRefreshContainer)).toBeVisible();

        // Click on the Select2 dropdown to open options
        await page.locator('#dashcam-refresh-panel .select2-selection__rendered').click();

        // Select the specific device: M4000-Training3 Off (353899269355234)
        const deviceOption = page.locator('.select2-results__option').filter({ hasText: 'M4000-Training3' });
        await expect(deviceOption).toBeVisible();
        await deviceOption.click({ force: true });

        // Intercept the API call before clicking the button
        const refreshDashcamPromise = page.waitForResponse(response => 
            response.url().includes('rebootDashcam_head2.php') && response.request().method() === 'POST'
        );

        // Click on refresh button
        await page.locator(config.selectors.dashcam.refreshDashcamButton).click({ force: true });

        // Wait for the dashcam refresh container to be visible
        await expect(page.locator(config.selectors.dashcam.confirmRefreshModal)).toBeVisible();

        // Click on confirm button
        await expect(page.locator(config.selectors.dashcam.confirmRefreshButton)).toBeVisible();
        await page.locator(config.selectors.dashcam.confirmRefreshButton).click({ force: true });

        // Wait for the API call and verify status
        const response = await refreshDashcamPromise;
        expect(response.status()).toBe(200);

        //wait for few seconds to let the process complete
        await page.waitForTimeout(2000);
    });
});