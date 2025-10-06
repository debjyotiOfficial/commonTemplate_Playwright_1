const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('30 Day Mileage Report', () => {
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

    test('should be redirected to fleet demo page with demo credentials', async ({ page }) => {
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

        // Click on reports menu
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.reportMenu).click();

        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Fleet' }).click();

        // Click on thirty day mileage report menu
        await expect(page.locator(config.selectors.thirtyDayMileageReport.thirtyDayMileageMenu)).toBeVisible();
        await page.locator(config.selectors.thirtyDayMileageReport.thirtyDayMileageMenu).click();

        // Verify thirty day mileage report container is visible
        await expect(page.locator(config.selectors.thirtyDayMileageReport.thirtyDayMileageContainer)).toBeVisible();

        // Date selection - scroll into view first
        await page.locator(config.selectors.thirtyDayMileageReport.calendarButton).scrollIntoViewIfNeeded();
        await page.locator(config.selectors.thirtyDayMileageReport.calendarButton).click({ force: true });

        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('July');

        // Select July 1, 2025
        await page.locator('.flatpickr-day[aria-label="July 1, 2025"]').click({ force: true });

        // Select July 30, 2025 (as end date)
        await page.locator('.flatpickr-day[aria-label="July 30, 2025"]').click({ force: true });

        // Check all devices checkbox
        await expect(page.locator(config.selectors.thirtyDayMileageReport.allDevicesCheckbox)).toBeVisible();
        await page.locator(config.selectors.thirtyDayMileageReport.allDevicesCheckbox).check({ force: true });

        // Click on submit button
        await expect(page.locator(config.selectors.thirtyDayMileageReport.submitButton)).toBeVisible();
        await page.locator(config.selectors.thirtyDayMileageReport.submitButton).click();

        // Wait for the report to load
        await page.waitForTimeout(config.timeouts.wait);

        // Verify the thirty day mileage report table has data
        const tableRows = page.locator(config.selectors.thirtyDayMileageReport.reportTable).locator('tbody tr');
        const rowCount = await tableRows.count();
        expect(rowCount).toBeGreaterThan(0);

        // Verify table headers
        const headers = page.locator(config.selectors.thirtyDayMileageReport.reportHeaders);
        const headerTexts = await headers.allTextContents();
        const cleanedHeaders = headerTexts.map(text => text.trim());
        const expectedHeaders = ['Date', 'IMEI', 'Device Name', 'Start Mileage', 'End Mileage', 'Total Miles Travelled'];
        expect(cleanedHeaders).toEqual(expectedHeaders);

        // Verify the first row of the report table
        const firstRow = page.locator(config.selectors.thirtyDayMileageReport.reportRows).first();
        const cells = firstRow.locator('td');
        
        for (let i = 0; i < 6; i++) {
            const cellText = await cells.nth(i).textContent();
            expect(cellText.trim()).not.toBe('');
        }

        // Verify search input is visible and search for a device
        await expect(page.locator(config.selectors.thirtyDayMileageReport.searchInput)).toBeVisible();
        await page.locator(config.selectors.thirtyDayMileageReport.searchInput).fill('Sales car1');

        // Verify the report table is filtered by the search input
        const filteredRows = page.locator(config.selectors.thirtyDayMileageReport.reportRows);
        const filteredCount = await filteredRows.count();
        
        for (let i = 0; i < filteredCount; i++) {
            const deviceName = await filteredRows.nth(i).locator('td').nth(2).textContent();
            expect(deviceName.toLowerCase()).toContain('sales car1');
        }

        // Click on "Save file as" dropdown
        await page.locator('#thirty-day-mileage-report-panel-2 button.dropdown__trigger').hover();

        // Click on "Excel"
        await page.locator('#thirty-day-mileage-report-panel-2 .dropdown__content button.dropdown__item').filter({ hasText: 'Excel' }).click({ force: true });

        // Click on "Save file as" dropdown again
        await page.locator('#thirty-day-mileage-report-panel-2 button.dropdown__trigger').hover();

        // Click on "CSV"
        await page.locator('#thirty-day-mileage-report-panel-2 .dropdown__content button.dropdown__item').filter({ hasText: 'CSV' }).click({ force: true });

        // Click on "Save file as" dropdown again
        await page.locator('#thirty-day-mileage-report-panel-2 button.dropdown__trigger').hover();

        // Click on "PDF"
        await page.locator('#thirty-day-mileage-report-panel-2 .dropdown__content button.dropdown__item').filter({ hasText: 'PDF' }).click({ force: true });

        // Click and clear the search input, then type 'Demo1'
        await expect(page.locator(config.selectors.thirtyDayMileageReport.searchInput)).toBeVisible();
        await page.locator(config.selectors.thirtyDayMileageReport.searchInput).clear();
        await page.locator(config.selectors.thirtyDayMileageReport.searchInput).fill('Demo1');

        // Verify that the filtered row contains 'Demo1' in the Device Name column
        await expect(page.locator(config.selectors.thirtyDayMileageReport.reportRows).first().locator('td').nth(2)).toContainText('Demo1');

        // Close the report panel
        await expect(page.locator(config.selectors.thirtyDayMileageReport.closeButton)).toBeVisible();
        await page.locator(config.selectors.thirtyDayMileageReport.closeButton).click();

        await page.waitForTimeout(10000);

        // Click on reports menu again
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.reportMenu).click();

        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Fleet' }).click();

        // Ensure Fleet Reports accordion is expanded before clicking 30 Day Mileage Report
        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Fleet' }).click({ force: true });
        await page.waitForTimeout(500);
        
        // Click on thirty day mileage report menu again
        await expect(page.locator(config.selectors.thirtyDayMileageReport.thirtyDayMileageMenu)).toBeVisible();
        await page.locator(config.selectors.thirtyDayMileageReport.thirtyDayMileageMenu).click({ force: true });

        // Verify thirty day mileage report container is visible
        await expect(page.locator(config.selectors.thirtyDayMileageReport.thirtyDayMileageContainer)).toBeVisible();

        // Search for date in search input
        await expect(page.locator(config.selectors.thirtyDayMileageReport.searchInput1)).toBeVisible();
        await page.locator(config.selectors.thirtyDayMileageReport.searchInput1).fill('19/8/2025');

        // Verify the report table is filtered by the search input and click on the view button
        await page.waitForTimeout(1000);

        // Click the first "View" button in the filtered table
        const firstReportRow = page.locator(config.selectors.thirtyDayMileageReport.firstReportRows).first();
        await expect(firstReportRow.locator('button.aViewMileageReport')).toBeVisible();
        await firstReportRow.locator('button.aViewMileageReport').click();

        // Verify the modal is visible
        await expect(page.locator(config.selectors.thirtyDayMileageReport.thirtyDayModal)).toBeVisible();
    });
});