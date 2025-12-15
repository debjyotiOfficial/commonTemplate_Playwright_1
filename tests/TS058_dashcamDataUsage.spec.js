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
        await expect(dashcamAccordion).toBeVisible();
        await dashcamAccordion.click();

        // Wait for accordion to expand
        await page.waitForTimeout(1000);

        // Click on Dashcam Data Usage option
        const dashcamUsageOption = page.locator('#bottom-nav-dashcam-data-usage');
        await expect(dashcamUsageOption).toBeVisible();
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
        await expect(deviceDropdown).toBeVisible();
        await deviceDropdown.click();
        await page.waitForTimeout(500);

        // Verify dropdown is open
        const dropdownList = page.locator('#du-deviceDropdown');
        await expect(dropdownList).toBeVisible();
        console.log('Device dropdown is open');

        // Search for "test 1" device
        const searchInput = page.locator('.device-search input, #du-deviceDropdown input[placeholder*="Search"]');
        if (await searchInput.isVisible()) {
            await searchInput.fill('test 1');
            await page.waitForTimeout(500);
        }

        // Select "test 1" device from the list
        const testDevice = page.locator('.device-item').filter({ hasText: 'test 1' });
        await expect(testDevice).toBeVisible();

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
        await expect(deviceNameDisplay).toBeVisible();

        const imeiDisplay = page.locator(`text=${apiResponseData.imei}`);
        await expect(imeiDisplay).toBeVisible();
        console.log('Device name and IMEI verified');

        // Verify period filter buttons are visible (30 Days, 7 Days, 24 Hours)
        const thirtyDaysBtn = page.locator('button:has-text("30 Days"), .period-btn:has-text("30 Days")');
        const sevenDaysBtn = page.locator('button:has-text("7 Days"), .period-btn:has-text("7 Days")');
        const twentyFourHoursBtn = page.locator('button:has-text("24 Hours"), .period-btn:has-text("24 Hours")');

        await expect(thirtyDaysBtn).toBeVisible();
        await expect(sevenDaysBtn).toBeVisible();
        await expect(twentyFourHoursBtn).toBeVisible();
        console.log('Period filter buttons are visible');

        // Verify Total Mobile Data matches API response
        const mobileDataDisplay = page.locator(`text=${apiResponseData.totalMobileDataFormatted}`).first();
        await expect(mobileDataDisplay).toBeVisible();
        console.log(`Mobile Data verified: ${apiResponseData.totalMobileDataFormatted}`);

        // Verify Live Video Requests count matches API response
        const liveVideoCard = page.locator('text=Live Video Requests').locator('..');
        await expect(liveVideoCard).toBeVisible();
        const liveVideoCount = page.locator(`text=${apiResponseData.liveVideoCount}`).first();
        await expect(liveVideoCount).toBeVisible();
        console.log(`Live Video Requests verified: ${apiResponseData.liveVideoCount}`);

        // Verify Video on Demand count matches API response
        const vodCard = page.locator('text=Video on Demand').locator('..');
        await expect(vodCard).toBeVisible();
        const vodCount = page.locator(`text=${apiResponseData.videoOnDemandCount}`).first();
        await expect(vodCount).toBeVisible();
        console.log(`Video on Demand verified: ${apiResponseData.videoOnDemandCount}`);

        // Verify Total Alerts count matches API response
        const alertsCard = page.locator('text=Total Alerts').locator('..');
        await expect(alertsCard).toBeVisible();
        const alertsCount = page.locator(`text=${apiResponseData.alertsCount}`).first();
        await expect(alertsCount).toBeVisible();
        console.log(`Total Alerts verified: ${apiResponseData.alertsCount}`);

        // Verify Video Files count matches API response
        const videoFilesCard = page.locator('text=Video Files').locator('..');
        await expect(videoFilesCard).toBeVisible();
        const videoFilesCount = page.locator(`text=${apiResponseData.videoFilesCount}`).first();
        await expect(videoFilesCount).toBeVisible();
        console.log(`Video Files verified: ${apiResponseData.videoFilesCount}`);

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
