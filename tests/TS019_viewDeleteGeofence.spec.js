const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('view delete geofence', () => {
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

    test('should be able to edit/delete geofence', async ({ page }) => {
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
        await page.goto(config.urls.fleetDashboard3);

        // Hover over "geofencing menu"
        await page.locator(config.selectors.navigation.geofencingMenu).hover();

        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        await page.waitForTimeout(2000); // Wait for element to be ready

        await expect(page.locator(config.selectors.navigation.viewDeleteGeofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.viewDeleteGeofencingMenu).click();

        // Verify the view delete geofencing container is visible
        await expect(page.locator(config.selectors.viewDeleteGeofencing.viewDeleteContainer)).toBeVisible();
        await expect(page.locator(config.selectors.viewDeleteGeofencing.viewDeleteContainer))
            .toContainText('View/Delete Geofences');

        // Select geofence from the list
        await expect(page.locator(config.selectors.viewDeleteGeofencing.geoList)).toBeVisible();
        await page.locator(config.selectors.viewDeleteGeofencing.geoList).selectOption('testtttUpdated (57606 CR-4, Max, MN 56659-2001, United States)');

        // Click on submit button
        await expect(page.locator(config.selectors.viewDeleteGeofencing.submitButton)).toBeVisible();
        await page.locator(config.selectors.viewDeleteGeofencing.submitButton).click();

        await page.waitForTimeout(2000); // Wait for geofence list to load

        // Verify the geo container is visible
        await expect(page.locator(config.selectors.viewDeleteGeofencing.controlContainer)).toBeVisible();

        await page.locator(config.selectors.viewDeleteGeofencing.inputField).clear({ force: true });
        await page.locator(config.selectors.viewDeleteGeofencing.inputField).fill('testtttUpdated', { force: true });
       
        // Click by text content (most reliable for custom elements)
        await page.getByText('Save').click({ force: true });

        await page.waitForTimeout(2000); // Wait for element to be ready

        await page.locator(config.selectors.navigation.geofencingMenu).hover();

        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        await page.waitForTimeout(2000); // Wait for element to be ready

        await expect(page.locator(config.selectors.navigation.viewDeleteGeofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.viewDeleteGeofencingMenu).click();

        // Verify the view delete geofencing container is visible
        await expect(page.locator(config.selectors.viewDeleteGeofencing.viewDeleteContainer)).toBeVisible();
        await expect(page.locator(config.selectors.viewDeleteGeofencing.viewDeleteContainer))
            .toContainText('View/Delete Geofences');

        // Select geofence from the list
        await expect(page.locator(config.selectors.viewDeleteGeofencing.geoList)).toBeVisible();
        await page.locator(config.selectors.viewDeleteGeofencing.geoList).selectOption('testtttUpdated (57606 CR-4, Max, MN 56659-2001, United States)');

        // Click on submit button
        await expect(page.locator(config.selectors.viewDeleteGeofencing.submitButton)).toBeVisible();
        await page.locator(config.selectors.viewDeleteGeofencing.submitButton).click();

        await page.waitForTimeout(2000); // Wait for geofence list to load
    });
});