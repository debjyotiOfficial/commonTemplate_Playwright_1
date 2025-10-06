const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Dashcam refresh', () => {
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

    test('refresh dashcam', async ({ page }) => {
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

        // Click on live-video-stream button
        await page.locator(config.selectors.dashcam.liveVideoStreamMenu).click({ force: true });

        await page.waitForTimeout(4000);

        // Wait for the live-video-stream container to be visible
        await expect(page.locator(config.selectors.dashcam.liveVideoStreamPanel)).toBeVisible();

        // Click on the Select2 dropdown to open options
        await page.locator('#live-video-stream-panel .select2-selection__rendered').click();
        
        const firstOption = page.locator('.select2-results__option').first();
        await expect(firstOption).toBeVisible();
        await firstOption.click({ force: true });

        // Intercept the API call before clicking the button
        const liveVideoStreamPromise = page.waitForResponse(response => 
            response.url().includes('SendDashcamLiveCommand.php') && response.request().method() === 'POST'
        );

        // Check "Dash View" and "Cabin View" checkboxes
        await page.locator(config.selectors.dashcam.dashViewCheckbox).check({ force: true });
        await page.locator(config.selectors.dashcam.cabinViewCheckbox).check({ force: true });

        // Click on Submit button
        await page.locator(config.selectors.dashcam.liveVideoStreamSubmitBtn).click({ force: true });

        // Wait for the API call and verify status
        const response = await liveVideoStreamPromise;
        expect(response.status()).toBe(200);
    });
});