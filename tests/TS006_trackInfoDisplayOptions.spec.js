const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Track Info Display Options', () => {
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
        test.setTimeout(600000); // 10 minutes for long test
    });

    test('should change the infobox size', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Click on accounts menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Click on drivers menu
        await expect(page.locator(config.selectors.driverCard.trackInfoMenu)).toBeVisible();
        await page.locator(config.selectors.driverCard.trackInfoMenu).click();

        // Select the "Driver Card" radio button in Track Info Display Options
        await page.locator(config.selectors.driverCard.driverCardCheckbox).scrollIntoViewIfNeeded();
        await page.locator(config.selectors.driverCard.driverCardCheckbox).check({ force: true });

        // Click on submit button
        await expect(page.locator(config.selectors.driverCard.submitButton)).toBeVisible();
        await page.locator(config.selectors.driverCard.submitButton).click();


        // Verify the driver card panel is visible
        await expect(page.locator(config.selectors.driverCard.driverCardPanel)).toBeVisible();
        await expect(page.locator(config.selectors.driverCard.driverCardPanel))
            .toContainText('Driver Card');

        // Verify the search input is visible
        await expect(page.locator(config.selectors.driverCard.driverSearchInput)).toBeVisible();
        await page.locator(config.selectors.driverCard.driverSearchInput).clear();
        await page.locator(config.selectors.driverCard.driverSearchInput).fill(config.testData.selectedVehicle);

        await page.waitForTimeout(2000);

        // Click on the specific driver card that contains "Sales car1"
        const salesCard = page.locator(config.selectors.driverCard.card).filter({ hasText: 'Sales car1' });
        await expect(salesCard).toBeVisible();
        await salesCard.click();

        // Verify the driver card details are visible
        await expect(page.locator(config.selectors.driverCard.driverName)).toBeVisible();
        await expect(page.locator(config.selectors.driverCard.driverName))
            .toContainText('Sales car1');

        // Click on the search button
        await expect(page.locator(config.selectors.driverCard.driverSearchInput)).toBeVisible();
        await page.locator(config.selectors.driverCard.driverSearchInput).clear();

        await page.waitForTimeout(4000);

        // Click on down arrow 
        await expect(page.locator(config.selectors.driverCard.driverCardArrow)).toBeVisible();
        await page.locator(config.selectors.driverCard.driverCardArrow).click();

        // Verify show card button is visible
        await expect(page.locator(config.selectors.driverCard.showDriverCard)).toBeVisible();
        await page.locator(config.selectors.driverCard.showDriverCard).click();

        // Verify the driver card details are visible
        await expect(page.locator(config.selectors.driverCard.driverCardPanel)).toBeVisible();
        await expect(page.locator(config.selectors.driverCard.driverCardPanel))
            .toContainText('Driver Card');

        // Click on driver sort button within the driver card panel
        await expect(page.locator(config.selectors.driverCard.driverCardPanel).locator('#drivers-sort')).toBeVisible();
        await page.locator(config.selectors.driverCard.driverCardPanel).locator('#drivers-sort').click();
    });
});