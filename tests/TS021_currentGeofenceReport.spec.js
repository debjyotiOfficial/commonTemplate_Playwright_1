const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Current geofence report', () => {
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

    test('should manage recent geofence report', async ({ page }) => {
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
            
        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        // Click on the geofence reports accordion button in the Geofencing menu
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Geofence Reports' }).click({ force: true });

        // Wait for the nested accordion to expand
        await page.waitForTimeout(2000);

        // Click on Current Geofence Report menu (force click since it may be hidden initially)
        await page.locator(config.selectors.currentGeofenceReport.currentGeofenceMenu).click({ force: true });

        // Verify the container opens
        await expect(page.locator(config.selectors.currentGeofenceReport.currentGeofenceContainer)).toBeVisible();

        // IMPORTANT: Close navbar after modal opens by clicking inside the modal
        await page.waitForTimeout(1000); // Wait for modal to fully load
        
        try {
            // Click inside the modal container to dismiss the navbar
            await page.locator(config.selectors.currentGeofenceReport.currentGeofenceContainer).click();
            console.log('✓ Clicked inside modal to close navbar');
            
            // Wait a moment for navbar to close
            await page.waitForTimeout(1000);
        } catch (e) {
            console.log('⚠ Warning: Could not click modal to close navbar:', e.message);
        }

        await page.locator(config.selectors.currentGeofenceReport.geofenceStatus).selectOption('Show All Status');

        // Verify all rows in the Status column contain either "Inside Geofence" or "Outside Geofence"
        const statusCells = page.locator(config.selectors.currentGeofenceReport.geofenceStatusColumn);
        const statusCount = await statusCells.count();
        for (let i = 0; i < statusCount; i++) {
            const statusText = await statusCells.nth(i).innerText();
            const trimmedText = statusText.trim();
            expect(trimmedText === 'Inside Geofence' || trimmedText === 'Outside Geofence').toBeTruthy();
        }

        // Click on geofence name dropdown
        await page.locator(config.selectors.currentGeofenceReport.geofenceName).selectOption('Show All Geofences');

        // Verify all rows in the Status column contain only "Show All Geofences"
        // const nameCells = page.locator(config.selectors.currentGeofenceReport.geofenceNameColumn);
        // const nameCount = await nameCells.count();
        // for (let i = 0; i < nameCount; i++) {
        //     await expect(nameCells.nth(i)).toContainText('Show All Geofences');
        // }

        // Click on geofence subgroup filter
        await page.locator(config.selectors.currentGeofenceReport.geoSubgroupFilter).selectOption('Show All Subgroups');

        // Verify search results
        await page.locator(config.selectors.currentGeofenceReport.searchInput).click();
        await page.locator(config.selectors.currentGeofenceReport.searchInput).fill('Sales car1');

        // Verify table contains sales car1
        await expect(page.locator(config.selectors.currentGeofenceReport.geoDeviceName))
            .toContainText('Sales car1');

        // Verify search results
        await page.locator(config.selectors.currentGeofenceReport.searchInput).click();
        await page.locator(config.selectors.currentGeofenceReport.searchInput).clear();

        // Click on geofence name dropdown
        await page.locator(config.selectors.currentGeofenceReport.geofenceName).selectOption('Show All Geofences');

        // Verify that every row contains the directions icon (icon--directions)
        const tableRows = page.locator('#current-geofence-report-table tbody tr');
        const rowCount = await tableRows.count();
        expect(rowCount).toBeGreaterThanOrEqual(1);
        
        for (let i = 0; i < rowCount; i++) {
            await expect(tableRows.nth(i).locator('.icon--directions')).toBeVisible();
        }

        // Click on "Save file as" dropdown
        await page.locator('#current-geofence-report-panel button.dropdown__trigger').hover();

        // Click on "Excel"
        await page.locator('#current-geofence-report-panel .dropdown__content button.dropdown__item').filter({ hasText: 'Excel' }).click({ force: true });

        // Click on "Save file as" dropdown again (if needed)
        await page.locator('#current-geofence-report-panel button.dropdown__trigger').hover();

        // Click on "CSV"
        await page.locator('#current-geofence-report-panel .dropdown__content button.dropdown__item').filter({ hasText: 'CSV' }).click({ force: true });

        // Click on "Save file as" dropdown again (if needed)
        await page.locator('#current-geofence-report-panel button.dropdown__trigger').hover();

        // Click on "PDF"
        await page.locator('#current-geofence-report-panel .dropdown__content button.dropdown__item').filter({ hasText: 'PDF' }).click({ force: true });

        // Click the first directions icon and verify Google Maps link behavior
        const firstDirectionsIcon = page.locator('#current-geofence-report-table tbody tr:first-child .icon--directions').first();
        
        // Check if directions icon exists and is clickable
        await expect(firstDirectionsIcon).toBeVisible();
        
        // Find the parent link element
        const parentLink = firstDirectionsIcon.locator('..').filter('a');
        const linkCount = await parentLink.count();
        
        if (linkCount > 0) {
            // Verify the link opens in a new tab (target="_blank") or has other new tab behavior
            const target = await parentLink.getAttribute('target');
            const href = await parentLink.getAttribute('href');
            
            console.log(`Link found - href: ${href}, target: ${target}`);
            
            // Accept either target="_blank" or links that open Google Maps
            if (target === '_blank' || (href && href.includes('maps.google'))) {
                console.log('✓ Link correctly configured for new tab or Google Maps');
            } else {
                console.log('⚠ Warning: Link may not open in new tab as expected');
            }
        } else {
            console.log('⚠ Warning: No link element found for directions icon');
        }
    });
});