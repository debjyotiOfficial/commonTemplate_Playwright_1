const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Pulsing Icon', () => {
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

    test('should change the size of pulse effect', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Click on accounts menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Click on pulsing icon menu - target the clickable button specifically
        const pulsingMenuItem = page.locator('#navbar').getByText('Pulsing Icon Settings');
        await expect(pulsingMenuItem).toBeVisible();
        await pulsingMenuItem.click();

        // Verify the pulsing icon container is visible
        await expect(page.locator(config.selectors.pulsingIcon.pulsingIconContainer)).toBeVisible();

        // Click on pulsing type dropdown
        await page.locator(config.selectors.pulsingIcon.pulsingTypeDropdown).selectOption('Large');

        // Click on submit button
        await page.locator(config.selectors.pulsingIcon.pulsingIconSubmitButton).click();


            // Wait for the pulsing effect to update
        await page.waitForTimeout(5000);

        // Verify the pulsing marker's scale is between 1 and 1.7
        for (let i = 0; i < 5; i++) {
        // Try different possible selectors for the pulsing marker
        const pulsingMarker = page.locator('.pulsing-marker, .marker-circle.pulsing, .pulse, [class*="puls"]').first();
        await expect(pulsingMarker).toBeVisible({ timeout: 150000 });
        
        const transform = await pulsingMarker.evaluate(el => 
            window.getComputedStyle(el).transform
        );
        
        const match = transform.match(/matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),/);
        if (match) {
            const scaleX = parseFloat(match[1]);
            expect(scaleX).toBeGreaterThanOrEqual(1);
            expect(scaleX).toBeLessThan(1.7);
        } else {
            throw new Error('Transform matrix not found');
        }
        await page.waitForTimeout(400); // Wait a bit to catch the pulse at different points
        }

        // Verify small pulsing icon
        // Click on accounts menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Click on pulsing icon menu again - target the clickable button specifically
        const pulsingMenuItem2 = page.locator('#navbar').getByText('Pulsing Icon Settings');
        await expect(pulsingMenuItem2).toBeVisible();
        await pulsingMenuItem2.click();

        // Verify the pulsing icon container is visible
        await expect(page.locator(config.selectors.pulsingIcon.pulsingIconContainer)).toBeVisible();

        // Click on pulsing type dropdown
        await page.locator(config.selectors.pulsingIcon.pulsingTypeDropdown).selectOption('Small - Default');

        // Click on submit button
        await page.locator(config.selectors.pulsingIcon.pulsingIconSubmitButton).click();

        // Wait for the pulsing effect to update
        await page.waitForTimeout(5000);

        // Verify the pulsing marker's scale is between 0.8 and 1.6
        for (let i = 0; i < 5; i++) {
        // Try different possible selectors for the pulsing marker
        const pulsingMarker = page.locator('.pulsing-marker, .marker-circle.pulsing, .pulse, [class*="puls"]').first();
        await expect(pulsingMarker).toBeVisible({ timeout: 150000 });
        
        const transform = await pulsingMarker.evaluate(el => 
            window.getComputedStyle(el).transform
        );
        
        const match = transform.match(/matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),/);
        if (match) {
            const scaleX = parseFloat(match[1]);
            expect(scaleX).toBeGreaterThanOrEqual(0.8);
            expect(scaleX).toBeLessThan(1.7);
        } else {
            throw new Error('Transform matrix not found');
        }
        await page.waitForTimeout(400); // Wait a bit to catch the pulse at different points
        }
    });

    });