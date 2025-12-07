const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Exit Report', () => {
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

    test('should generate and validate exit report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Click on reports section
        await expect(page.locator(config.selectors.navigation.reportSection)).toBeVisible();
        await page.locator(config.selectors.navigation.reportSection).click();

        await page.waitForTimeout(4000);

        // Click on Analytics section to expand it
        const analyticsSection = page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Analytics' });
        await analyticsSection.click();

        // Wait for accordion to expand
        await page.waitForTimeout(3000);

        // The exit report button might need a more direct approach - try clicking with JavaScript
        const exitBtn = page.locator(config.selectors.ExitReport.exit);
        await exitBtn.waitFor({ state: 'attached', timeout: 10000 });
        await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (el) {
                el.scrollIntoView({ behavior: 'instant', block: 'center' });
                el.click();
            }
        }, config.selectors.ExitReport.exit);

        // Verify exit report is visible
        await expect(page.locator(config.selectors.ExitReport.exitReport)).toBeVisible();

        // Click on latest exit report
        await expect(page.locator(config.selectors.ExitReport.getLatestExitReport)).toBeVisible();
        await page.locator(config.selectors.ExitReport.getLatestExitReport).click();

        // Wait for the requests table to load and click the first "View Report" button
        const viewReportButton = page.locator('#requests-table').locator(config.selectors.ExitReport.viewReportBtn).filter({ hasText: 'View Report' }).first();
        await expect(viewReportButton).toBeVisible();
        await viewReportButton.click();

        // Scroll to the bottom of the report
        await page.locator(config.selectors.ExitReport.exitReport).evaluate(el => el.scrollTo(0, el.scrollHeight));

        // Verify the exit report is visible
        await expect(page.locator(config.selectors.ExitReport.LandmarkExitStatistics)).toBeVisible();
        await expect(page.locator(config.selectors.ExitReport.LandmarkExitStatistics)).toContainText('Landmark Exit Statistics');

        // Verify search input is visible
        await expect(page.locator(config.selectors.ExitReport.searchInput)).toBeVisible();
        await page.locator(config.selectors.ExitReport.searchInput).clear();
        await page.locator(config.selectors.ExitReport.searchInput).fill('Sales');

        // Click on "Save file as" dropdown
        await page.locator('#exit-report-content button.dropdown__trigger').hover();

        // Click on "Excel"
        await page.locator('#exit-report-content .dropdown__content button.dropdown__item').filter({ hasText: 'Excel' }).click({ force: true });

        // Click on "Save file as" dropdown again
        await page.locator('#exit-report-content button.dropdown__trigger').hover();

        // Click on "CSV"
        await page.locator('#exit-report-content .dropdown__content button.dropdown__item').filter({ hasText: 'CSV' }).click({ force: true });

        // Click on "Save file as" dropdown again
        await page.locator('#exit-report-content button.dropdown__trigger').hover();

        // Click on "PDF"
        await page.locator('#exit-report-content .dropdown__content button.dropdown__item').filter({ hasText: 'PDF' }).click({ force: true });
    });
});