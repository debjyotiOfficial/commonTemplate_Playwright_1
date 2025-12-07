const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Mileage Report', () => {
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
    
    test('should display start and end mileage of devices', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Click on reports menu
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.reportMenu).click();

        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Fleet' }).click();

        // Click on mileage report menu
        await expect(page.locator(config.selectors.mileageReport.mileageReportMenu)).toBeVisible();
        await page.locator(config.selectors.mileageReport.mileageReportMenu).click();

        // Wait for modal to open properly
        await page.waitForTimeout(5000);

        // Verify mileage report container is visible
        await expect(page.locator(config.selectors.mileageReport.mileageReportContainer)).toBeVisible();

        // Date selection
        await page.locator('#mileage-report-panel-calendar-btn').click({ force: true });

        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('July');

        // Select July 1, 2025
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="July 1, 2025"]').click({ force: true });

        // Select July 10, 2025 (as end date)
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="July 10, 2025"]').click({ force: true });

        // Click on the Search Device dropdown
        await page.locator('#mileage-report-panel #select2-mileage-device-select-container').click();

        // Select "Sales car1"
        await page.locator('.select2-results__option').filter({ hasText: 'Sales car1' }).click({ force: true });

        // Click the "Speed" radio button by value
        await page.locator(config.selectors.mileageReport.speed).click();

        // Specify time frame
        await page.locator(config.selectors.mileageReport.specifyTime).check();

        // Click and type time into the start time input
        await page.locator(config.selectors.mileageReport.startTime).click();
        await page.locator(config.selectors.mileageReport.startTime).fill('08:00');

        // Click and type time into the end time input
        await page.locator(config.selectors.mileageReport.endTime).click();
        await page.locator(config.selectors.mileageReport.endTime).fill('17:00');

        // Click on submit button
        await expect(page.locator(config.selectors.mileageReport.submitBtn)).toBeVisible();
        await page.locator(config.selectors.mileageReport.submitBtn).click({ force: true });

        await page.waitForTimeout(10000);

        // Verify the mileage report is visible
        await expect(page.locator(config.selectors.mileageReport.mileageReportTable)).toBeVisible();
        await expect(page.locator(config.selectors.mileageReport.mileageReportTable)).toHaveCSS('display', 'flex');

        // Click on mileage radio button
        await expect(page.locator(config.selectors.mileageReport.mileage)).toBeVisible();
        await page.locator(config.selectors.mileageReport.mileage).click({ force: true });

        // Click on submit button
        await expect(page.locator(config.selectors.mileageReport.submitBtn)).toBeVisible();
        await page.locator(config.selectors.mileageReport.submitBtn).click({ force: true });

        await page.waitForTimeout(10000);

        // Verify the mileage report is visible
        await expect(page.locator(config.selectors.mileageReport.mileageReportTable)).toBeVisible();
        await expect(page.locator(config.selectors.mileageReport.mileageReportTable)).toHaveCSS('display', 'flex');

        // Get Start Miles
        const startMilesText = await page.locator('.report-ui__field').filter({ hasText: 'Start Miles' })
            .locator('.report-ui__value').textContent();
        const startMiles = parseFloat(startMilesText);

        // Get End Miles
        const endMilesText = await page.locator('.report-ui__field').filter({ hasText: 'End Miles' })
            .locator('.report-ui__value').textContent();
        const endMiles = parseFloat(endMilesText);
        const calculatedMiles = endMiles - startMiles;

        // Get Miles Traveled
        const milesTraveledText = await page.locator('.report-ui__field').filter({ hasText: 'Miles Traveled' })
            .locator('.report-ui__value').textContent();
        const milesTraveled = parseFloat(milesTraveledText);

        // Assert the calculated value matches Miles Traveled (within 0.001 tolerance)
        expect(Math.abs(calculatedMiles - milesTraveled)).toBeLessThanOrEqual(0.001);

        // Click on the Search Device dropdown
        await page.locator('#mileage-report-panel #select2-mileage-device-select-container').click();

        // Select Demo1 from the dropdown
        await page.locator('.select2-results__option').filter({ hasText: 'Demo 1' }).click({ force: true });

        // Specify time frame
        await page.locator(config.selectors.mileageReport.specifyTime).check();

        // Click and type time into the start time input
        await page.locator(config.selectors.mileageReport.startTime).click();
        await page.locator(config.selectors.mileageReport.startTime).fill('05:00');

        // Click and type time into the end time input
        await page.locator(config.selectors.mileageReport.endTime).click();
        await page.locator(config.selectors.mileageReport.endTime).fill('23:00');

        // Click on submit button
        await expect(page.locator(config.selectors.mileageReport.submitBtn)).toBeVisible();
        await page.locator(config.selectors.mileageReport.submitBtn).click({ force: true });

        await page.waitForTimeout(10000);

        // Verify the mileage report is visible
        await expect(page.locator(config.selectors.mileageReport.mileageReportTable)).toBeVisible();
        await expect(page.locator(config.selectors.mileageReport.mileageReportTable)).toHaveCSS('display', 'flex');

        // Click on mileage radio button
        await expect(page.locator(config.selectors.mileageReport.mileage)).toBeVisible();
        await page.locator(config.selectors.mileageReport.mileage).click({ force: true });

        // Click on submit button
        await expect(page.locator(config.selectors.mileageReport.submitBtn)).toBeVisible();
        await page.locator(config.selectors.mileageReport.submitBtn).click({ force: true });

        await page.waitForTimeout(10000);

        // Verify the mileage report is visible
        await expect(page.locator(config.selectors.mileageReport.mileageReportTable)).toBeVisible();
        await expect(page.locator(config.selectors.mileageReport.mileageReportTable)).toHaveCSS('display', 'flex');

        // Get Start Miles for Demo1
        const startMilesText2 = await page.locator('.report-ui__field').filter({ hasText: 'Start Miles' })
            .locator('.report-ui__value').textContent();
        const startMiles2 = parseFloat(startMilesText2);

        // Get End Miles for Demo1
        const endMilesText2 = await page.locator('.report-ui__field').filter({ hasText: 'End Miles' })
            .locator('.report-ui__value').textContent();
        const endMiles2 = parseFloat(endMilesText2);
        const calculatedMiles2 = endMiles2 - startMiles2;

        // Get Miles Traveled for Demo1
        const milesTraveledText2 = await page.locator('.report-ui__field').filter({ hasText: 'Miles Traveled' })
            .locator('.report-ui__value').textContent();
        const milesTraveled2 = parseFloat(milesTraveledText2);

        // Assert the calculated value matches Miles Traveled (within 0.001 tolerance)
        expect(Math.abs(calculatedMiles2 - milesTraveled2)).toBeLessThanOrEqual(0.001);
    });
});