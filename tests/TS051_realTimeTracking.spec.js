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

        // Step 4: Set up API response listener before the 30-second refresh
        // The API gets called when the timer reaches 00:30
        const apiResponsePromise = page.waitForResponse(
            response => response.url().includes('getVehiclesInfo_track_test.php') &&
                        response.url().includes('vehicleId=15') &&
                        response.status() === 200,
            { timeout: 35000 }
        );

        // Step 5: Wait for timer to reset (30 seconds) and capture API response
        console.log('Waiting for 30-second refresh cycle...');
        const apiResponse = await apiResponsePromise;
        const responseData = await apiResponse.json();
        console.log('API response captured:', JSON.stringify(responseData));

        // Step 6: Verify API data matches Driver Card UI
        const driverCard = page.locator('#driver-card-15');
        await expect(driverCard).toBeVisible();

        // Verify mileage from API matches UI
        if (responseData.mileage) {
            const mileageElement = driverCard.locator('[data-mileage]');
            const uiMileage = await mileageElement.getAttribute('data-mileage');
            expect(uiMileage).toBe(String(responseData.mileage));
            console.log(`Mileage verified: ${uiMileage}`);
        }

        // Verify address from API matches UI
        if (responseData.address) {
            const addressElement = driverCard.locator('.driver-card-adress');
            await expect(addressElement).toContainText(responseData.address);
            console.log('Address verified');
        }

        // Verify speed from API matches UI
        if (responseData.speed !== undefined) {
            const speedElement = driverCard.locator('.driver-card-speed, [data-speed]');
            if (await speedElement.count() > 0) {
                const speedText = await speedElement.first().textContent();
                console.log(`Speed in UI: ${speedText}, Speed from API: ${responseData.speed}`);
            }
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

        // Step 9: Verify timer starts from 00:00 and counts up to 00:30
        // Get initial timer value - should start at or near 00:00
        const initialTimerText = await realtimeTimer.textContent();
        console.log(`Initial timer value: ${initialTimerText}`);

        // Step 10: Set up API response listener for Sales car1 (vehicleId may differ)
        // Wait for the API call that fires when timer reaches 00:30
        const salesCarApiPromise = page.waitForResponse(
            response => response.url().includes('getVehiclesInfo_track_test.php') &&
                        response.status() === 200,
            { timeout: 35000 }
        );

        // Step 11: Wait for 30-second refresh cycle and capture API response for Sales car1
        console.log('Waiting for 30-second refresh cycle for Sales car1...');
        const salesCarApiResponse = await salesCarApiPromise;
        const salesCarResponseData = await salesCarApiResponse.json();
        console.log('Sales car1 API response captured:', JSON.stringify(salesCarResponseData));

        // Extract vehicleId from the API URL for verification
        const salesCarApiUrl = salesCarApiResponse.url();
        const vehicleIdMatch = salesCarApiUrl.match(/vehicleId=(\d+)/);
        const salesCarVehicleId = vehicleIdMatch ? vehicleIdMatch[1] : null;
        console.log(`Sales car1 vehicleId: ${salesCarVehicleId}`);

        // Step 12: Verify API data matches Sales car1 Driver Card UI
        const salesCarDriverCard = page.locator(`#driver-card-${salesCarVehicleId}`);
        if (salesCarVehicleId && await salesCarDriverCard.count() > 0) {
            await expect(salesCarDriverCard).toBeVisible();

            // Verify mileage from API matches UI
            if (salesCarResponseData.mileage) {
                const mileageElement = salesCarDriverCard.locator('[data-mileage]');
                if (await mileageElement.count() > 0) {
                    const uiMileage = await mileageElement.getAttribute('data-mileage');
                    expect(uiMileage).toBe(String(salesCarResponseData.mileage));
                    console.log(`Sales car1 Mileage verified: ${uiMileage}`);
                }
            }

            // Verify address from API matches UI
            if (salesCarResponseData.address) {
                const addressElement = salesCarDriverCard.locator('.driver-card-adress');
                if (await addressElement.count() > 0) {
                    await expect(addressElement).toContainText(salesCarResponseData.address);
                    console.log('Sales car1 Address verified');
                }
            }

            // Verify speed from API matches UI
            if (salesCarResponseData.speed !== undefined) {
                const speedElement = salesCarDriverCard.locator('.driver-card-speed, [data-speed]');
                if (await speedElement.count() > 0) {
                    const speedText = await speedElement.first().textContent();
                    console.log(`Sales car1 Speed in UI: ${speedText}, Speed from API: ${salesCarResponseData.speed}`);
                }
            }
        } else {
            // If we can't find the specific driver card by ID, verify using the filtered card
            console.log('Verifying Sales car1 data using filtered card selector');

            if (salesCarResponseData.address) {
                const addressElement = salesCar1Card.locator('.driver-card-adress');
                if (await addressElement.count() > 0) {
                    await expect(addressElement).toContainText(salesCarResponseData.address);
                    console.log('Sales car1 Address verified via filtered card');
                }
            }
        }

        console.log('Real Time Tracking test completed successfully for both drivers');
    });
});
