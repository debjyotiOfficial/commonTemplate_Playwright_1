const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Low Voltage Device Report', () => {
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

    test('should generate and validate low voltage device report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // API endpoint for low voltage report
        const apiEndpoint = 'https://www.gpsandfleet3.net/gpsandfleet/gpsandfleet_common/Data/getAllDevicesVoltageReport.php';

        // Step 1: Login and navigate to Fleet Dashboard
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Step 2: Verify reports menu is visible and click on it
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.reportMenu).click();

        // Step 3: Click on the Fleet section under Analytics
        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Fleet' }).click();

        // Step 4: Scroll to and click on Low Voltage Device Report menu
        await page.locator(config.selectors.lowVoltage.lowVoltageMenu).scrollIntoViewIfNeeded();
        await page.locator(config.selectors.lowVoltage.lowVoltageMenu).click({ force: true });

        // Step 5: Verify the Low Voltage container/modal is visible
        await expect(page.locator(config.selectors.lowVoltage.lowVoltageContainer)).toBeVisible();

        // Step 6: Scroll to and select the "-7 days" radio button option
        const radio7Days = page.locator('input[type="radio"][name="low-voltage-duration"][value="-7 days"]');
        await radio7Days.scrollIntoViewIfNeeded();
        await radio7Days.check({ force: true });

        // Step 7: Click the submit button and capture API response
        let apiResponse;
        const responsePromise = page.waitForResponse(response =>
            response.url().includes('getAllDevicesVoltageReport.php') && response.status() === 200
        );
        await page.locator('#low-voltage-report-submit-btn').click();
        const response = await responsePromise;
        apiResponse = await response.json();

        // Step 8: Wait for report to load
        await page.waitForTimeout(2000);

        // Step 9: Scroll to and verify the low voltage report table is visible
        await page.locator('#low-voltage-report-table').scrollIntoViewIfNeeded();
        await expect(page.locator('#low-voltage-report-table')).toBeVisible();

        // Step 10: Verify API response data reflects correctly in the table
        if (apiResponse && apiResponse.length > 0) {
            const firstRecord = apiResponse[0];
            const tableRows = page.locator('#low-voltage-report-table tbody tr');
            const firstRow = tableRows.first();

            // Verify IMEI from API matches table
            if (firstRecord.imei) {
                await expect(firstRow).toContainText(firstRecord.imei);
            }
            // Verify Device Name from API matches table
            if (firstRecord.device_name) {
                await expect(firstRow).toContainText(firstRecord.device_name);
            }
            // Verify Speed from API matches table
            if (firstRecord.speed) {
                await expect(firstRow).toContainText(firstRecord.speed);
            }
            // Verify Battery/Voltage from API matches table
            if (firstRecord.battery) {
                await expect(firstRow).toContainText(firstRecord.battery);
            }
            console.log(`Step 10: Verified ${apiResponse.length} records from API are reflected in table`);
        } else {
            console.log('Step 10: No data returned from API for -7 days duration');
        }

        // Step 11: Test 'Current' radio button and verify response
        const radioCurrent = page.locator('input[type="radio"][name="low-voltage-duration"][value="0"]');
        await radioCurrent.scrollIntoViewIfNeeded();
        await radioCurrent.check({ force: true });

        const responsePromiseCurrent = page.waitForResponse(response =>
            response.url().includes('getAllDevicesVoltageReport.php') && response.status() === 200
        );
        await page.locator('#low-voltage-report-submit-btn').click();
        const responseCurrent = await responsePromiseCurrent;
        const apiResponseCurrent = await responseCurrent.json();
        await page.waitForTimeout(2000);

        if (apiResponseCurrent && apiResponseCurrent.length > 0) {
            await expect(page.locator('#low-voltage-report-table tbody tr').first()).toBeVisible();
            console.log(`Step 11: 'Current' returned ${apiResponseCurrent.length} records`);
        } else {
            // Table should be empty or show no data message
            console.log('Step 11: No data returned for Current duration - table may be empty');
        }

        // Step 12: Test 'Last 24 hours' radio button and verify response
        const radio24Hours = page.locator('input[type="radio"][name="low-voltage-duration"][value="-24 hours"]');
        await radio24Hours.scrollIntoViewIfNeeded();
        await radio24Hours.check({ force: true });

        const responsePromise24Hours = page.waitForResponse(response =>
            response.url().includes('getAllDevicesVoltageReport.php') && response.status() === 200
        );
        await page.locator('#low-voltage-report-submit-btn').click();
        const response24Hours = await responsePromise24Hours;
        const apiResponse24Hours = await response24Hours.json();
        await page.waitForTimeout(2000);

        if (apiResponse24Hours && apiResponse24Hours.length > 0) {
            await expect(page.locator('#low-voltage-report-table tbody tr').first()).toBeVisible();
            console.log(`Step 12: 'Last 24 hours' returned ${apiResponse24Hours.length} records`);
        } else {
            console.log('Step 12: No data returned for Last 24 hours - table may be empty');
        }

        // Step 13: Test 'Last 3 days' radio button and verify response
        const radio3Days = page.locator('input[type="radio"][name="low-voltage-duration"][value="-3 days"]');
        await radio3Days.scrollIntoViewIfNeeded();
        await radio3Days.check({ force: true });

        const responsePromise3Days = page.waitForResponse(response =>
            response.url().includes('getAllDevicesVoltageReport.php') && response.status() === 200
        );
        await page.locator('#low-voltage-report-submit-btn').click();
        const response3Days = await responsePromise3Days;
        const apiResponse3Days = await response3Days.json();
        await page.waitForTimeout(2000);

        if (apiResponse3Days && apiResponse3Days.length > 0) {
            await expect(page.locator('#low-voltage-report-table tbody tr').first()).toBeVisible();
            console.log(`Step 13: 'Last 3 days' returned ${apiResponse3Days.length} records`);
        } else {
            console.log('Step 13: No data returned for Last 3 days - table may be empty');
        }

        // Step 14: Test 'Voltage lower than 12V' radio button with 'Last 7 days' and verify response
        const radioLowBattery = page.locator('input[type="radio"][name="low-voltage-data-point"][value="lowBattery"]');
        await radioLowBattery.scrollIntoViewIfNeeded();
        await radioLowBattery.check({ force: true });

        // Select Last 7 days again
        await radio7Days.scrollIntoViewIfNeeded();
        await radio7Days.check({ force: true });

        const responsePromiseLowBattery = page.waitForResponse(response =>
            response.url().includes('getAllDevicesVoltageReport.php') && response.status() === 200
        );
        await page.locator('#low-voltage-report-submit-btn').click();
        const responseLowBattery = await responsePromiseLowBattery;
        const apiResponseLowBattery = await responseLowBattery.json();
        await page.waitForTimeout(2000);

        if (apiResponseLowBattery && apiResponseLowBattery.length > 0) {
            const firstRecordLowBattery = apiResponseLowBattery[0];
            const tableRowsLowBattery = page.locator('#low-voltage-report-table tbody tr');
            const firstRowLowBattery = tableRowsLowBattery.first();

            await expect(firstRowLowBattery).toBeVisible();

            // Verify data from API matches table for low battery filter
            if (firstRecordLowBattery.imei) {
                await expect(firstRowLowBattery).toContainText(firstRecordLowBattery.imei);
            }
            if (firstRecordLowBattery.device_name) {
                await expect(firstRowLowBattery).toContainText(firstRecordLowBattery.device_name);
            }
            if (firstRecordLowBattery.battery) {
                await expect(firstRowLowBattery).toContainText(firstRecordLowBattery.battery);
            }
            console.log(`Step 14: 'Voltage lower than 12V' with 'Last 7 days' returned ${apiResponseLowBattery.length} records - verified in table`);
        } else {
            console.log('Step 14: No data returned for Voltage lower than 12V with Last 7 days - table may be empty');
        }
    });
});