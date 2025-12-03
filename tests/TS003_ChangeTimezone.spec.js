const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Timezone', () => {
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
        test.setTimeout(500000);
    });

    test('should edit the timezone of users', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Click on alerts menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        await page.waitForTimeout(config.timeouts.wait);
          
        await expect(page.locator(config.selectors.navigation.timezoneMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.timezoneMenu).click();
          
        await expect(page.locator(config.selectors.modal.timezoneContainer)).toBeVisible();
          
        // Verify modal title
        await expect(page.locator(config.selectors.modal.timezoneTitle)).toBeVisible();
        await expect(page.locator(config.selectors.modal.timezoneTitle))
            .toContainText(config.testData.expectedTimezoneTitle);
          
        // Verify timezone selection
        await expect(page.locator(config.selectors.timezoneSelection.timezoneOptions)).toBeVisible();
        await page.locator(config.selectors.timezoneSelection.timezoneOptions).check();
        await expect(page.locator(config.selectors.timezoneSelection.timezoneOptions)).toBeChecked();
          
        // Save changes
        await expect(page.locator(config.selectors.timezoneSelection.saveButton)).toBeVisible();
        await page.locator(config.selectors.timezoneSelection.saveButton).click();

        await page.waitForTimeout(config.timeouts.wait);
          
        // Verify timezone change in settings
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();
          
        await expect(page.locator(config.selectors.navigation.timezoneMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.timezoneMenu).click();
          
        await expect(page.locator(config.selectors.modal.timezoneContainer)).toBeVisible();
          
        await expect(page.locator(config.selectors.timezoneSelection.selectedTimezonHead))
            .toContainText(config.testData.expectedSelectedTimezone);
    });
});