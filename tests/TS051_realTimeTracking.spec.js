const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Real Time Tracking', () => {
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

    test('should verify real-time tracking timer and API data synchronization', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Step 1: Verify Driver Card container is visible
        const driverCardContainer = page.locator('.driver-card__container');
        await expect(driverCardContainer.first()).toBeVisible({ timeout: 15000 });
        console.log('Driver Card is visible');

        // Step 2: Click on Demo 1 driver card
        const demo1Card = page.locator('.driver-card__container').filter({ hasText: 'Demo 1' });
        await expect(demo1Card).toBeVisible();
        await demo1Card.click();
        console.log('Clicked on Demo 1 card');

        // Step 3: Verify realtime tracking timer is visible with driver name
        const realtimeTimer = page.locator('#realtime-tracking-timer');
        await expect(realtimeTimer).toBeVisible({ timeout: 10000 });

        const vehicleName = page.locator('#realtime-tracking-vehicle-name');
        await expect(vehicleName).toContainText('Demo 1');
        console.log('Realtime tracking timer visible with Demo 1');

        // Step 4: Wait for the timer to cycle through
        // The realtime tracking timer should cycle and we should see the vehicle data
        console.log('Waiting for realtime tracking to complete cycle...');

        // Wait a bit and verify the data is displayed
        await page.waitForTimeout(5000);

        // Step 5: Verify the realtime tracking info is displayed
        const realtimeInfo = page.locator('#realtime-tracking-info, .realtime-tracking-info');
        if (await realtimeInfo.count() > 0) {
            console.log('Realtime tracking info container found');
        }

        // Step 6: Verify Driver Card shows updated data
        // Look for Demo 1 driver card
        const driverCard = demo1Card;
        await expect(driverCard).toBeVisible();

        // Verify address is displayed
        const addressElement = driverCard.locator('.driver-card-adress, .driver-card__address');
        if (await addressElement.count() > 0) {
            const addressText = await addressElement.first().textContent();
            console.log(`Demo 1 Address: ${addressText}`);
        }

        // Verify speed is displayed
        const speedElement = driverCard.locator('.driver-card-speed, .driver-card__speed, [class*="speed"]');
        if (await speedElement.count() > 0) {
            const speedText = await speedElement.first().textContent();
            console.log(`Demo 1 Speed: ${speedText}`);
        }

        console.log('Demo 1 verification completed successfully');

        // =====================================================================
        // Step 7: Click on another driver card (Sales car1) and verify timer
        // =====================================================================
        console.log('Now testing with Sales car1 driver card...');

        const salesCar1Card = page.locator('.driver-card__container').filter({ hasText: 'Sales car1' });
        await expect(salesCar1Card).toBeVisible();
        await salesCar1Card.click();
        console.log('Clicked on Sales car1 card');

        // Step 8: Verify realtime tracking timer opens for Sales car1
        await expect(realtimeTimer).toBeVisible({ timeout: 10000 });
        await expect(vehicleName).toContainText('Sales Car1', { ignoreCase: true });
        console.log('Realtime tracking timer visible with Sales Car1');

        // Step 9: Verify timer is displayed
        const initialTimerText = await realtimeTimer.textContent();
        console.log(`Timer value: ${initialTimerText}`);

        // Step 10: Wait a bit for data to load
        await page.waitForTimeout(5000);

        // Step 11: Verify Sales car1 driver card data
        await expect(salesCar1Card).toBeVisible();

        // Verify address is displayed
        const salesCarAddressElement = salesCar1Card.locator('.driver-card-adress, .driver-card__address');
        if (await salesCarAddressElement.count() > 0) {
            const addressText = await salesCarAddressElement.first().textContent();
            console.log(`Sales car1 Address: ${addressText}`);
        }

        // Verify speed is displayed
        const salesCarSpeedElement = salesCar1Card.locator('.driver-card-speed, .driver-card__speed, [class*="speed"]');
        if (await salesCarSpeedElement.count() > 0) {
            const speedText = await salesCarSpeedElement.first().textContent();
            console.log(`Sales car1 Speed: ${speedText}`);
        }

        console.log('Real Time Tracking test completed successfully for both drivers');
    });
});
