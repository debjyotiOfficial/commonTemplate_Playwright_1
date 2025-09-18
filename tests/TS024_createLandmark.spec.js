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
        
        await page.goto(config.urls.backupLoginPage);
        
        await expect(page.locator(config.selectors.login.usernameFieldBackup)).toBeVisible();
        await page.locator(config.selectors.login.usernameFieldBackup).clear();
        await page.locator(config.selectors.login.usernameFieldBackup).fill(config.credentials.demo.usernameBackup);
        
        await expect(page.locator(config.selectors.login.passwordFieldBackup)).toBeVisible();
        await page.locator(config.selectors.login.passwordFieldBackup).clear();
        await page.locator(config.selectors.login.passwordFieldBackup).fill(config.credentials.demo.passwordBackup);
        
        await expect(page.locator(config.selectors.login.submitButtonBackup)).toBeVisible();
        await page.locator(config.selectors.login.submitButtonBackup).click();

        await page.waitForTimeout(config.timeouts.wait);
        await page.goto(config.urls.fleetNewDashboard);
        await page.waitForTimeout(5000);
            
        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        // Click on the "Landmarks" accordion button in the Geofencing menu
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Landmarks' }).click({ force: true });

        await page.waitForTimeout(2000); // Wait for element to be ready

        await expect(page.locator(config.selectors.navigation.createLandmarkMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.createLandmarkMenu).click();

        await page.waitForTimeout(2000); // Wait for element to be ready
        
        await expect(page.locator(config.selectors.modal.landmarkContainer)).toBeVisible();
        
        // Verify modal title
        await expect(page.locator(config.selectors.modal.landmarkTitle)).toBeVisible();
        await expect(page.locator(config.selectors.modal.landmarkTitle))
            .toContainText(config.selectors.modal.expectedLandmarkTitle);

        // Verify Enter address input
        await expect(page.locator(config.selectors.landmarkInput.addressField)).toBeVisible();
        await page.locator(config.selectors.landmarkInput.addressField).clear();
        await page.locator(config.selectors.landmarkInput.addressField).fill(config.testData.geofencingAddress);
        
        // Wait for address suggestions to appear
        await page.waitForTimeout(5000);

        // Verify Enter name input - click on address suggestion
        await expect(page.locator(config.selectors.landmarkInput.nameField).filter({ hasText: 'San Ramon, CA' })).toBeVisible();
        await page.locator(config.selectors.landmarkInput.nameField).filter({ hasText: 'San Ramon, CA' }).click();

        // Verify Enter radius input
        await expect(page.locator(config.selectors.landmarkInput.radiusField)).toBeVisible();
        await page.locator(config.selectors.landmarkInput.radiusField).clear();
        await page.locator(config.selectors.landmarkInput.radiusField).fill(config.testData.geofencingRadius);

        // Enter name of geofence
        await expect(page.locator(config.selectors.landmarkInput.landmarkName)).toBeVisible();
        await page.locator(config.selectors.landmarkInput.landmarkName).clear();
        await page.locator(config.selectors.landmarkInput.landmarkName).fill(config.testData.landmarkName);

        // Click the Submit button
        await expect(page.locator(config.selectors.landmarkInput.submitButton)).toBeVisible();
        await page.locator(config.selectors.landmarkInput.submitButton).click();

        await page.waitForTimeout(60000);

        // Method 1: Click by text content (most reliable for custom elements)
        await page.locator('text=Save').click({ force: true });

        // Method 2: Click by text with specific case sensitivity
        await page.locator('text=/^SAVE$/i').click({ force: true });

        // Method 3: Try clicking by text content with more specific targeting
        await page.locator('span').filter({ hasText: 'SAVE' }).click({ force: true });

        await page.waitForTimeout(12000); // Wait for element to be ready

        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        // Click on the "Landmarks" accordion button in the Geofencing menu
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Landmarks' }).click({ force: true });

        await page.waitForTimeout(2000); // Wait for element to be ready

        await expect(page.locator(config.selectors.landmarkInput.viewDelLandmark)).toBeVisible();
        await page.locator(config.selectors.landmarkInput.viewDelLandmark).click();

        // Click the Select Geofence dropdown and select "Test Auto Geofence"
        await page.locator(config.selectors.landmarkInput.landmarkList).selectOption(config.testData.landmarkName); // Select the option by visible text

        // Click on submit button
        await expect(page.locator(config.selectors.geofencingInput.editSubmitButton)).toBeVisible();
        await page.locator(config.selectors.geofencingInput.editSubmitButton).click();

        await page.waitForTimeout(5000);
    });
});