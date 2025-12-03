const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Geofencing Tests', () => {
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

    test('should redirect to fleet demo page with demo credentials', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        // Click on the "Landmarks" accordion button in the Geofencing menu
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Landmarks' }).click({ force: true });

        await page.waitForTimeout(2000); // Wait for element to be ready

        await expect(page.locator(config.selectors.navigation.editLandmarkMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.editLandmarkMenu).click();

        // Verify the view delete landmark container is visible
        await expect(page.locator(config.selectors.viewEditLandmarks.viewEditContainer)).toBeVisible();
        await expect(page.locator(config.selectors.viewEditLandmarks.viewEditContainer))
            .toContainText('View/Edit Landmarks');

        // Select landmark from the list
        await page.locator(config.selectors.viewEditLandmarks.landmarkList).selectOption(config.testData.landmarkName);

        // Clear the landmark name input and type a new name
        await expect(page.locator(config.selectors.viewEditLandmarks.landmarkNameInput)).toBeVisible();
        await page.locator(config.selectors.viewEditLandmarks.landmarkNameInput).clear();
        await page.locator(config.selectors.viewEditLandmarks.landmarkNameInput).fill(config.testData.landmarkNameUpdated);

        // Click on submit button
        await page.locator(config.selectors.viewEditLandmarks.submitButton).click();

        await page.waitForTimeout(2000); // Wait for geofence list to load
       
        // Method 1: Click by text content (most reliable for custom elements)
        await page.locator('text=Save').click({ force: true });

        // Method 2: Click by text with specific case sensitivity
        await page.locator('text=/^Save$/i').click({ force: true });

        await page.waitForTimeout(2000); // Wait for element to be ready

        // Click on confirmation button
        await expect(page.locator(config.selectors.viewEditLandmarks.confirmationButton)).toBeVisible();
        await page.locator(config.selectors.viewEditLandmarks.confirmationButton).click();

        // Verify the landmark is updated
        // Click on geofence menu
        await page.locator(config.selectors.navigation.geofencingMenu).hover();

        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        // Click on the "Landmarks" accordion button in the Geofencing menu
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Landmarks' }).click({ force: true });

        await page.waitForTimeout(2000); // Wait for element to be ready

        await expect(page.locator(config.selectors.navigation.editLandmarkMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.editLandmarkMenu).click();

        // Verify the view delete landmark container is visible
        await expect(page.locator(config.selectors.viewEditLandmarks.viewEditContainer)).toBeVisible();
        await expect(page.locator(config.selectors.viewEditLandmarks.viewEditContainer))
            .toContainText('View/Edit Landmarks');

        // Select landmark from the list
        await page.locator(config.selectors.viewEditLandmarks.landmarkList).selectOption(config.testData.landmarkNameUpdated + "(2201 Camino Ramon, San Ramon, CA 94583, United States)");

        // Clear the landmark name input and type a new name
        await expect(page.locator(config.selectors.viewEditLandmarks.landmarkNameInput)).toBeVisible();
        await page.locator(config.selectors.viewEditLandmarks.landmarkNameInput).clear();
        await page.locator(config.selectors.viewEditLandmarks.landmarkNameInput).fill(config.testData.landmarkName);

        // Click on submit button
        await page.locator(config.selectors.viewEditLandmarks.submitButton).click();
        await page.waitForTimeout(2000); 

        // Method 1: Click by text content (most reliable for custom elements)
        await page.locator('text=Save').click({ force: true });

        // Method 2: Click by text with specific case sensitivity
        await page.locator('text=/^Save$/i').click({ force: true });

        // Click on confirmation button
        await expect(page.locator(config.selectors.viewEditLandmarks.confirmationButton)).toBeVisible();
        await page.locator(config.selectors.viewEditLandmarks.confirmationButton).click();
    });
});