const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Utilization Report', () => {
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

    test('should generate and validate utilization report', async ({ page }) => {
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

        // Click on reports section
        await expect(page.locator(config.selectors.navigation.reportSection)).toBeVisible();
        await page.locator(config.selectors.navigation.reportSection).click();

        await page.waitForTimeout(4000);

        // Click on Analytics section
        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Analytics' }).click();
        
        // Click on utilization report
        await expect(page.locator(config.selectors.UtilizationReport.utilizationMenu)).toBeVisible();
        await page.locator(config.selectors.UtilizationReport.utilizationMenu).click();

        // Verify report is visible
        await expect(page.locator(config.selectors.UtilizationReport.utilizationReportContainer)).toBeVisible();
        await expect(page.locator(config.selectors.UtilizationReport.utilizationReportContainer)).toContainText('Utilization Report');

        // Click the first "View Report" button in the Utilization Report table
        const viewReportButton = page.locator(config.selectors.UtilizationReport.requestTable).locator('a.view-report-btn').filter({ hasText: 'View Report' }).first();
        await expect(viewReportButton).toBeVisible();
        await viewReportButton.click();

        // Wait for report to load (60 seconds as in Cypress)
        await page.waitForTimeout(60000);

        // Verify the report is visible
        await expect(page.locator(config.selectors.UtilizationReport.reportContent)).toBeVisible();
        await expect(page.locator(config.selectors.UtilizationReport.reportContent)).toContainText('Generated Reports');

        // Verify search input is visible
        await expect(page.locator(config.selectors.UtilizationReport.searchInput)).toBeVisible();
        await page.locator(config.selectors.UtilizationReport.searchInput).clear();
        await page.locator(config.selectors.UtilizationReport.searchInput).fill('Sales car');

        // Click on "Save file as" dropdown
        await page.locator('#utilization-report-content button.dropdown__trigger').hover();

        // Click on "Excel"
        await page.locator('#utilization-report-content .dropdown__content button.dropdown__item').filter({ hasText: 'Excel' }).click({ force: true });

        // Click on "Save file as" dropdown again
        await page.locator('#utilization-report-content button.dropdown__trigger').hover();

        // Click on "CSV"
        await page.locator('#utilization-report-content .dropdown__content button.dropdown__item').filter({ hasText: 'CSV' }).click({ force: true });

        // Click on "Save file as" dropdown again
        await page.locator('#utilization-report-content button.dropdown__trigger').hover();

        // Click on "PDF"
        await page.locator('#utilization-report-content .dropdown__content button.dropdown__item').filter({ hasText: 'PDF' }).click({ force: true });

        // Click the date range picker to open the calendar
        await page.locator(config.selectors.UtilizationReport.datePicker).click();

        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('June');

        // Select the 1st of June 2025
        await page.locator(config.selectors.UtilizationReport.utilizationReportStartDate).click();

        // Select the 30th of June 2025 (this will set the range end)
        await page.locator(config.selectors.UtilizationReport.utilizationReportEndDate).click();

        // Click on submit button
        await expect(page.locator(config.selectors.UtilizationReport.utilizationSubmitBtn)).toBeVisible();
        await page.locator(config.selectors.UtilizationReport.utilizationSubmitBtn).click();

        // Wait for the table to load/refresh after submitting
        await page.waitForTimeout(5000);

        // Verify that a new row has been added to the table
        const tableRows = page.locator(config.selectors.UtilizationReport.requestTable).locator('tbody tr');
        const rowCount = await tableRows.count();
        expect(rowCount).toBeGreaterThanOrEqual(1);

        // Get the first row (most recent request) and verify its contents
        const firstRow = tableRows.first();
        
        // Verify Account Name column (should be 'fleetdemo')
        const accountNameCell = firstRow.locator('td').nth(0);
        await expect(accountNameCell).toContainText('fleetdemo');
        
        // Verify Date Range column (should contain the selected dates)
        const dateRangeCell = firstRow.locator('td').nth(1);
        await expect(dateRangeCell).toContainText('2025-06-01 to 2025-06-30');
        
        // Verify Requested Time column (should have today's date and recent time)
        const requestedTimeCell = firstRow.locator('td').nth(2);
        await expect(requestedTimeCell).not.toBeEmpty();
        
        // Verify Actions column (should show 'Queued' status)
        const actionsCell = firstRow.locator('td').nth(3);
        await expect(actionsCell).toContainText('Queued');
    });
});