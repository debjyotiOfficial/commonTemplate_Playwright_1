const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('After Hour Setting', () => {
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
    
    test('should edit the after hour settings of a device', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetNewDashboard);

        // Click on alerts menu
        await expect(page.locator(config.selectors.navigation.alertsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.alertsMenu).click();

        // Click on after hours summary menu
        await expect(page.locator(config.selectors.afterHoursSettings.afterHoursMenu)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.afterHoursMenu).click();

        // Verify the after hours settings container is visible
        await expect(page.locator(config.selectors.afterHoursSettings.AfterHoursSettingsModal)).toBeVisible();
        await expect(page.locator(config.selectors.afterHoursSettings.AfterHoursSettingsModal)).toContainText('After Hours Settings');

        // Click on the after hours search driver
        await expect(page.locator(config.selectors.afterHoursSettings.afterHoursSearchDriver)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.afterHoursSearchDriver).click();

        await page.waitForTimeout(2000);

        // Click on the after hours search driver
        await expect(page.locator(config.selectors.afterHoursSettings.afterHoursSearchDriver)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.afterHoursSearchDriver).click();
        await page.waitForTimeout(2000);

        // Click on the after hours search driver
        await expect(page.locator(config.selectors.afterHoursSettings.afterHoursSearchDriver)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.afterHoursSearchDriver).click();

        // Select "Sales car1" from the dropdown by its visible text
        await expect(page.locator('.select2-results__option').filter({ hasText: 'Sales car1' })).toBeVisible();
        await page.locator('.select2-results__option').filter({ hasText: 'Sales car1' }).click();

        // Click on custom days radio button
        await expect(page.locator(config.selectors.afterHoursSettings.customDays)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.customDays).check();

        // Click on advanced settings
        await expect(page.locator(config.selectors.afterHoursSettings.advanced_settings_toggle)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.advanced_settings_toggle).click();

        // Verify the advanced settings container is visible
        await expect(page.locator(config.selectors.afterHoursSettings.advancedsettingscontent)).toBeVisible();

        // Click on unlimited time
        await expect(page.locator(config.selectors.afterHoursSettings.UnlimitedTimeLimit)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.UnlimitedTimeLimit).check();

        // Click on outside hrs and set time
        await expect(page.locator(config.selectors.afterHoursSettings.outside_hrs)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.outside_hrs).click();
        await page.locator(config.selectors.afterHoursSettings.outside_hrs).clear();
        await page.locator(config.selectors.afterHoursSettings.outside_hrs).fill('10:00');

        // Click on inside hrs and set time
        await expect(page.locator(config.selectors.afterHoursSettings.idling_hrs)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.idling_hrs).click();
        await page.locator(config.selectors.afterHoursSettings.idling_hrs).clear();
        await page.locator(config.selectors.afterHoursSettings.idling_hrs).fill('11:00');

        // Click on stop unlimited time
        await expect(page.locator(config.selectors.afterHoursSettings.stopDurationUnlimited)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.stopDurationUnlimited).check();

        // Click on no of stops and set value
        await expect(page.locator(config.selectors.afterHoursSettings.noOfStops)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.noOfStops).click();
        await page.locator(config.selectors.afterHoursSettings.noOfStops).clear();
        await page.locator(config.selectors.afterHoursSettings.noOfStops).fill('5');

        // Click on posted speed limit
        await expect(page.locator(config.selectors.afterHoursSettings.postedSpeed)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.postedSpeed).click();
        await page.locator(config.selectors.afterHoursSettings.postedSpeed).clear();
        await page.locator(config.selectors.afterHoursSettings.postedSpeed).fill('50');

        // Click on save button
        await expect(page.locator(config.selectors.afterHoursSettings.submitButton)).toBeVisible();
        await page.locator(config.selectors.afterHoursSettings.submitButton).click();
    });
});