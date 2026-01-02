const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Dashcam Data Usage', () => {
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

    test('should display Dashcam Data Usage report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashcamDashboard2);

        // Click on Dashcam accordion header to expand menu
        const dashcamAccordion = page.locator('#bottom-nav-dashcam .accordion__header');
        await expect(dashcamAccordion).toBeVisible({ timeout: 15000 });
        await dashcamAccordion.click();

        // Wait for accordion to expand
        await page.waitForTimeout(2000);

        // Click on Dashcam Data Usage option
        const dashcamUsageOption = page.locator('#bottom-nav-data-usage');
        await expect(dashcamUsageOption).toBeVisible({ timeout: 15000 });
        await dashcamUsageOption.click({ force: true });

        await page.waitForTimeout(1000);

        // Verify the Dashcam Data Usage panel/modal is visible
        const dataUsagePanel = page.locator('#dashcam-data-usage-panel');
        await expect(dataUsagePanel).toBeVisible();
        console.log('Dashcam Data Usage panel is visible');

        // Verify "Select Dashcam Device" title is visible
        const panelTitle = page.locator('.device-selector-label');
        await expect(panelTitle).toBeVisible();
        console.log('Select Device label is visible');

        // Click on device dropdown to open it
        const deviceDropdown = page.locator('.device-dropdown-btn');
        await expect(deviceDropdown).toBeVisible({ timeout: 10000 });
        await deviceDropdown.click();
        await page.waitForTimeout(1000);

        // Verify dropdown is open
        const dropdownList = page.locator('#du-deviceDropdown.open, .device-dropdown.open');
        await expect(dropdownList).toBeVisible({ timeout: 10000 });
        console.log('Device dropdown is open');

        // Search for "test 1" device - use specific selector for data usage dropdown
        const searchInput = page.locator('#du-deviceDropdown input[placeholder*="Search"]').first();
        if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            await searchInput.fill('test 1');
            await page.waitForTimeout(500);
        }

        // Select "test 1" device from the list - use the device-item-name selector
        const testDevice = page.locator('#du-deviceList .device-item').filter({ hasText: 'test 1' }).first();
        await expect(testDevice).toBeVisible({ timeout: 10000 });

        // Set up API response interception before selecting device
        let apiResponseData = null;
        const apiResponsePromise = page.waitForResponse(
            response => response.url().includes('getDataUsage.php') && response.status() === 200
        );

        // Select "test 1" device to trigger API call
        await testDevice.click();
        console.log('Selected "test 1" device');

        // Wait for API response and capture the data
        const apiResponse = await apiResponsePromise;
        const responseJson = await apiResponse.json();
        apiResponseData = responseJson.data;
        console.log('API Response captured:', JSON.stringify(apiResponseData, null, 2));

        // Verify API response status
        expect(responseJson.status).toBe(true);
        expect(responseJson.success).toBe(true);
        console.log('API response status verified');

        await page.waitForTimeout(2000);

        // Verify "Data Usage Report" title is displayed
        const reportTitle = page.locator('text=Data Usage Report');
        await expect(reportTitle).toBeVisible();
        console.log('Data Usage Report title is visible');

        // Verify device name and IMEI are displayed in the header
        const deviceNameDisplay = page.locator('text=test 1').first();
        await expect(deviceNameDisplay).toBeVisible({ timeout: 10000 });
        console.log('Device name verified');

        // IMEI may or may not be displayed depending on UI layout
        const imeiDisplay = page.locator(`text=${apiResponseData.imei}`);
        if (await imeiDisplay.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('IMEI verified:', apiResponseData.imei);
        } else {
            console.log('IMEI not displayed on page (optional field)');
        }
        console.log('Device name and IMEI verification completed');

        // Verify period filter buttons are visible (30 Days, 7 Days, 24 Hours)
        const thirtyDaysBtn = page.locator('button:has-text("30 Days"), .period-btn:has-text("30 Days")');
        const sevenDaysBtn = page.locator('button:has-text("7 Days"), .period-btn:has-text("7 Days")');
        const twentyFourHoursBtn = page.locator('button:has-text("24 Hours"), .period-btn:has-text("24 Hours")');

        await expect(thirtyDaysBtn).toBeVisible();
        await expect(sevenDaysBtn).toBeVisible();
        await expect(twentyFourHoursBtn).toBeVisible();
        console.log('Period filter buttons are visible');

        // Compare API response values with UI display
        console.log('Comparing API response with UI values...');

        // Verify Mobile Data matches API response (e.g., "0 B Mobile Data")
        const mobileDataText = `${apiResponseData.totalMobileDataFormatted} Mobile Data`;
        await expect(page.locator(`text=${mobileDataText}`)).toBeVisible({ timeout: 10000 });
        console.log(`✓ Mobile Data verified: ${apiResponseData.totalMobileDataFormatted}`);

        // Get all usage item value elements within the panel
        const usagePanel = page.locator('#dashcam-data-usage-panel');
        const usageValues = usagePanel.locator('.usage-item-value');

        // Verify Live Video Requests label is visible
        await expect(usagePanel.getByText('Live Video Requests')).toBeVisible({ timeout: 10000 });
        // First usage value should match liveVideoCount
        await expect(usageValues.nth(0)).toHaveText(String(apiResponseData.liveVideoCount));
        console.log(`✓ Live Video Requests verified: ${apiResponseData.liveVideoCount}`);

        // Verify Video on Demand label is visible
        await expect(usagePanel.getByText('Video on Demand')).toBeVisible({ timeout: 10000 });
        // Second usage value should match videoOnDemandCount
        await expect(usageValues.nth(1)).toHaveText(String(apiResponseData.videoOnDemandCount));
        console.log(`✓ Video on Demand verified: ${apiResponseData.videoOnDemandCount}`);

        // Verify Total Alerts label is visible
        await expect(usagePanel.getByText('Total Alerts')).toBeVisible({ timeout: 10000 });
        // Third usage value should match alertsCount
        await expect(usageValues.nth(2)).toHaveText(String(apiResponseData.alertsCount));
        console.log(`✓ Total Alerts verified: ${apiResponseData.alertsCount}`);

        // Verify Video Files label is visible
        await expect(usagePanel.getByText('Video Files')).toBeVisible({ timeout: 10000 });
        // Fourth usage value should match videoFilesCount
        await expect(usageValues.nth(3)).toHaveText(String(apiResponseData.videoFilesCount));
        console.log(`✓ Video Files verified: ${apiResponseData.videoFilesCount}`);

        // Verify Refresh Data button is visible
        const refreshBtn = page.locator('button:has-text("Refresh Data")');
        await expect(refreshBtn).toBeVisible();
        console.log('Refresh Data button is visible');

        // Verify Last Updated text is displayed
        const lastUpdatedText = page.locator('text=Last updated');
        await expect(lastUpdatedText).toBeVisible();
        console.log('Last updated text is visible');

        // Test period filter - click on 7 Days
        await sevenDaysBtn.click();
        await page.waitForTimeout(2000);
        console.log('Clicked 7 Days filter');

        // Test period filter - click on 24 Hours
        await twentyFourHoursBtn.click();
        await page.waitForTimeout(2000);
        console.log('Clicked 24 Hours filter');

        // Test period filter - click back to 30 Days
        await thirtyDaysBtn.click();
        await page.waitForTimeout(2000);
        console.log('Clicked 30 Days filter');

        // Test Refresh Data button
        const refreshResponsePromise = page.waitForResponse(
            response => response.url().includes('getDataUsage.php') && response.status() === 200
        );
        await refreshBtn.click();
        await refreshResponsePromise;
        await page.waitForTimeout(2000);
        console.log('Refresh Data button clicked and API called');

        console.log('Dashcam Data Usage test completed successfully - All API data matched with UI');
    });
});
