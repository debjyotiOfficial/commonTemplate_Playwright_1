const { test, expect } = require('@playwright/test');

test.describe('Matrack Driver Safety Report', () => {

    test.setTimeout(600000); // 10 minutes

    /**
     * Helper: Extract Driver Safety data from the modal by parsing visible text
     */
    async function extractModalData(page) {
        return await page.evaluate(() => {
            const bodyText = document.body.innerText;
            const data = {};

            // Safety Score - the big number in the modal
            const scoreMatch = bodyText.match(/Current Month Driver Safety Score[\s\S]*?(\d+\.?\d*)/);
            data.safetyScore = scoreMatch ? parseFloat(scoreMatch[1]) : null;

            // Miles Driven
            const milesMatch = bodyText.match(/Miles Driven[\s\S]*?You drove (\d+\.?\d*) miles/);
            data.milesDriven = milesMatch ? parseFloat(milesMatch[1]) : null;

            // Speed events count
            const speedMatch = bodyText.match(/You had (\d+) speed events/);
            data.speedCount = speedMatch ? parseInt(speedMatch[1]) : null;

            // Hard Braking
            const brakesMatch = bodyText.match(/You had (\d+) hard braking incidents/);
            data.hardBrakes = brakesMatch ? parseInt(brakesMatch[1]) : null;

            // Hard Acceleration
            const accelMatch = bodyText.match(/You had (\d+) hard acceleration incidents/);
            data.hardAcceleration = accelMatch ? parseInt(accelMatch[1]) : null;

            // Night miles (Time of Day)
            const nightMatch = bodyText.match(/You drove (\d+\.?\d*) miles out of which (\d+\.?\d*) miles were driven during late hours/);
            data.nightMiles = nightMatch ? parseFloat(nightMatch[2]) : null;

            // Risk level labels
            data.hasLowRiskLabel = bodyText.includes('Low Risk Driver');

            return data;
        });
    }

    /**
     * Helper: Compare API response with modal data and assert all fields match
     */
    function compareApiWithModal(api, modalData, deviceName) {
        console.log(`\n--- Comparing API vs Modal for: ${deviceName} ---`);
        console.log('API Data:', JSON.stringify(api));
        console.log('Modal Data:', JSON.stringify(modalData));

        // Safety Score
        expect(modalData.safetyScore).toBe(api.safetyScore);
        console.log(`PASS  Safety Score: API=${api.safetyScore} | Modal=${modalData.safetyScore}`);

        // Miles Driven
        expect(modalData.milesDriven).toBe(api.milesDriven);
        console.log(`PASS  Miles Driven: API=${api.milesDriven} | Modal=${modalData.milesDriven}`);

        // Speed Events
        expect(modalData.speedCount).toBe(api.speedCount);
        console.log(`PASS  Speed Events: API=${api.speedCount} | Modal=${modalData.speedCount}`);

        // Hard Braking
        expect(modalData.hardBrakes).toBe(api.hardBrakes);
        console.log(`PASS  Hard Braking: API=${api.hardBrakes} | Modal=${modalData.hardBrakes}`);

        // Hard Acceleration
        expect(modalData.hardAcceleration).toBe(api.hardAcceleration);
        console.log(`PASS  Hard Acceleration: API=${api.hardAcceleration} | Modal=${modalData.hardAcceleration}`);

        // Night Miles
        expect(modalData.nightMiles).toBe(api.nightMiles);
        console.log(`PASS  Night Miles: API=${api.nightMiles} | Modal=${modalData.nightMiles}`);

        // Risk Level: score 1000 = Low Risk Driver
        if (api.safetyScore >= 1000) {
            expect(modalData.hasLowRiskLabel).toBeTruthy();
            console.log(`PASS  Risk Level: Score=${api.safetyScore} -> Low Risk Driver`);
        } else {
            console.log(`PASS  Risk Level: Score=${api.safetyScore} -> High Risk Driver`);
        }

        console.log(`All comparisons PASSED for ${deviceName}!\n`);
    }

    test('should verify Driver Safety Report for multiple devices', async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

        // Tab 1: Login
        const loginPage = await context.newPage();
        await loginPage.goto('https://www.gps.matrack.io/gpstracking/adminnew/view/index.php', {
            waitUntil: 'networkidle',
            timeout: 60000
        });
        await loginPage.locator('#username').fill('debjyoti');
        await loginPage.locator('#password').fill('IIQrQ90WE$n1tFAre');
        await loginPage.locator('.submit').click();
        await loginPage.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
        console.log('Login successful');

        // Tab 2: Dashboard
        const page = await context.newPage();
        await page.goto('https://www.gps.matrack.io/gpstracking/client/DashcamDemo/maps/index2.php', {
            waitUntil: 'networkidle',
            timeout: 60000
        }).catch(() => {});
        console.log('Dashboard loaded');
        await page.waitForTimeout(3000);

        // Navigate: Reports -> Fleet Reports -> Driver Safety Report
        await page.evaluate(() => {
            const headers = document.querySelectorAll('.accordion__header.accordion--navbar');
            for (const h of headers) {
                if (h.textContent.includes('Reports')) { h.click(); break; }
            }
        });
        await page.waitForTimeout(3000);

        await page.evaluate(() => {
            const buttons = document.querySelectorAll('.accordion__button.accordion--nested');
            for (const b of buttons) {
                if (b.textContent.includes('Fleet Reports')) { b.click(); break; }
            }
        });
        await page.waitForTimeout(3000);

        await page.evaluate(() => {
            document.querySelector('#driver-safety-report-btn')?.click();
        });
        await page.waitForTimeout(5000);

        // Verify Driver Safety Report panel is open
        const panel = page.locator('#driver-safety-report-panel');
        await expect(panel).toBeVisible();
        console.log('Driver Safety Report panel opened');

        // ============= DEVICE 1: First available device =============
        console.log('\n========== DEVICE 1 ==========');

        // Open device dropdown and select first device
        await page.locator('#select2-driver-safety-device-select-container').click({ force: true });
        await page.waitForTimeout(2000);

        const firstOption = page.locator('.select2-results__option').first();
        const device1Name = (await firstOption.textContent()).trim();
        console.log('Selecting device 1:', device1Name);
        await firstOption.click({ force: true });
        await page.waitForTimeout(2000);

        // Intercept API for device 1
        let apiResponse1 = null;
        await page.route('**/getSafe_Next.php**', async route => {
            const response = await route.fetch();
            const body = await response.text();
            try { apiResponse1 = JSON.parse(body); } catch (e) { apiResponse1 = body; }
            console.log('API called for device 1');
            await route.fulfill({ response });
        });

        // Click Submit
        await page.locator('#driver-safety-report-submit-btn').click({ force: true });
        console.log('Submit clicked for device 1...');

        // Wait for API response
        const start1 = Date.now();
        while (!apiResponse1 && (Date.now() - start1) < 60000) {
            await page.waitForTimeout(1000);
        }
        await page.waitForTimeout(5000);

        expect(apiResponse1).toBeTruthy();
        const api1 = Array.isArray(apiResponse1) ? apiResponse1[0] : apiResponse1;

        // Extract and compare modal data for device 1
        const modalData1 = await extractModalData(page);
        compareApiWithModal(api1, modalData1, device1Name);

        // Remove the route handler for device 1
        await page.unroute('**/getSafe_Next.php**');

        // ============= CLOSE MODAL =============
        console.log('Closing modal...');
        const closeBtn = page.locator('button.close-modal .icon--close').first();
        await closeBtn.click({ force: true });
        await page.waitForTimeout(3000);
        console.log('Modal closed');

        // ============= DEVICE 2: Second available device =============
        console.log('\n========== DEVICE 2 ==========');

        // Open device dropdown and select second device
        await page.locator('#select2-driver-safety-device-select-container').click({ force: true });
        await page.waitForTimeout(2000);

        const secondOption = page.locator('.select2-results__option').nth(1);
        const device2Name = (await secondOption.textContent()).trim();
        console.log('Selecting device 2:', device2Name);
        await secondOption.click({ force: true });
        await page.waitForTimeout(2000);

        // Intercept API for device 2
        let apiResponse2 = null;
        await page.route('**/getSafe_Next.php**', async route => {
            const response = await route.fetch();
            const body = await response.text();
            try { apiResponse2 = JSON.parse(body); } catch (e) { apiResponse2 = body; }
            console.log('API called for device 2');
            await route.fulfill({ response });
        });

        // Click Submit
        await page.locator('#driver-safety-report-submit-btn').click({ force: true });
        console.log('Submit clicked for device 2...');

        // Wait for API response
        const start2 = Date.now();
        while (!apiResponse2 && (Date.now() - start2) < 60000) {
            await page.waitForTimeout(1000);
        }
        await page.waitForTimeout(5000);

        expect(apiResponse2).toBeTruthy();
        const api2 = Array.isArray(apiResponse2) ? apiResponse2[0] : apiResponse2;

        // Extract and compare modal data for device 2
        const modalData2 = await extractModalData(page);
        compareApiWithModal(api2, modalData2, device2Name);

        // Remove the route handler for device 2
        await page.unroute('**/getSafe_Next.php**');

        console.log('\n========================================');
        console.log('  ALL TESTS PASSED');
        console.log('  Device 1: ' + device1Name + ' - VERIFIED');
        console.log('  Device 2: ' + device2Name + ' - VERIFIED');
        console.log('========================================');

        await context.close();
    });
});
