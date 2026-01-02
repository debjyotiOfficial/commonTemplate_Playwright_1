const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('State Mileage Report', () => {
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

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Click on reports menu
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.reportMenu).click();

        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Fleet' }).click();

        // Click on state mileage report menu
        await expect(page.locator(config.selectors.stateMileageReport.stateMileageMenu)).toBeVisible();
        await page.locator(config.selectors.stateMileageReport.stateMileageMenu).click();

        // Wait for modal to open properly
        await page.waitForTimeout(5000);

        // Verify state mileage report container is visible
        await expect(page.locator(config.selectors.stateMileageReport.stateMileageContainer)).toBeVisible();

        // IMPORTANT: Close navbar after modal opens by clicking inside the modal
        await page.waitForTimeout(1000); // Wait for modal to fully load
        
        try {
            // Click inside the modal container to dismiss the navbar
            await page.locator(config.selectors.stateMileageReport.stateMileageContainer).click();
            console.log('✓ Clicked inside modal to close navbar');
            
            // Wait a moment for navbar to close
            await page.waitForTimeout(1000);
        } catch (e) {
            console.log('⚠ Warning: Could not click modal to close navbar:', e.message);
        }

        // Date selection
        await page.locator('#state-mileage-report-panel-calendar-btn').click({ force: true });

        // Navigate to 2025 (data year) since calendar defaults to current year (2026)
        await page.locator('.flatpickr-calendar.open .numInputWrapper .cur-year').fill('2025');
        await page.waitForTimeout(500);

        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('July');

        // Select July 1, 2025
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="July 1, 2025"]').click({ force: true });

        // Select July 10, 2025 (as end date)
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="July 10, 2025"]').click({ force: true });

        // Check all devices checkbox
        await expect(page.locator(config.selectors.stateMileageReport.allDevicesCheckbox)).toBeVisible();
        await page.locator(config.selectors.stateMileageReport.allDevicesCheckbox).check({ force: true });

        // Click on submit button
        await expect(page.locator(config.selectors.stateMileageReport.submitButton)).toBeVisible();
        await page.locator(config.selectors.stateMileageReport.submitButton).click();

        // Click on refresh button
        await expect(page.locator(config.selectors.stateMileageReport.refreshButton)).toBeVisible();
        await page.locator(config.selectors.stateMileageReport.refreshButton).click();

        // Wait for the report to load
        await page.waitForTimeout(config.timeouts.wait);

        // Verify the state mileage report table has data
        const tableRows = page.locator(config.selectors.stateMileageReport.reportTable).locator('tbody tr');
        const rowCount = await tableRows.count();
        expect(rowCount).toBeGreaterThan(0);

        // Click on the "View" button for the first row where status is "Ready"
        const readyRow = page.locator(config.selectors.stateMileageReport.reportRows).filter({ hasText: 'Ready' }).first();
        await readyRow.locator(config.selectors.stateMileageReport.viewReportButton).click();

        // Assert the modal is visible
        await expect(page.locator(config.selectors.stateMileageReport.mileageDataModal)).toBeVisible();

        // Click on close button
        await expect(page.locator(config.selectors.stateMileageReport.closeButton)).toBeVisible();
        await page.locator(config.selectors.stateMileageReport.closeButton).click();
    });
});