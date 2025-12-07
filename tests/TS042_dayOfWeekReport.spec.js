const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Day of Week Report', () => {
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

    test('should generate and validate day of week report', async ({ page }) => {
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

        // The day of week report button might need a more direct approach - try clicking with JavaScript
        const dayOfWeekBtn = page.locator(config.selectors.dayOfWeek.dayOfWeekMenu);
        await dayOfWeekBtn.waitFor({ state: 'attached', timeout: 10000 });
        await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (el) {
                el.scrollIntoView({ behavior: 'instant', block: 'center' });
                el.click();
            }
        }, config.selectors.dayOfWeek.dayOfWeekMenu);

        // Verify day of week report container is visible
        await expect(page.locator(config.selectors.dayOfWeek.dayOfWeekReportContainer)).toBeVisible();

        // Click on latest day of week report
        await expect(page.locator(config.selectors.dayOfWeek.getLatestDayOfWeekReport)).toBeVisible();
        await page.locator(config.selectors.dayOfWeek.getLatestDayOfWeekReport).click();

        // Wait for the requests table to load and click the first "View Report" button
        const viewReportButton = page.locator(config.selectors.dayOfWeek.dayOfWeekReportTable).locator('a').filter({ hasText: 'View Report' }).first();
        await expect(viewReportButton).toBeVisible({ timeout: 30000 });
        await viewReportButton.click();

        // Wait for report content to load
        await page.waitForTimeout(5000);

        // Scroll to the bottom of the report
        await page.locator(config.selectors.dayOfWeek.dayOfWeekReportContainer).evaluate(el => el.scrollTo(0, el.scrollHeight));

        // Verify the exit report is visible (wait longer for it to load)
        await expect(page.locator(config.selectors.dayOfWeek.viewExitsReport)).toBeVisible({ timeout: 30000 });

        // Verify all three exit report cards are visible
        const exitReportCards = page.locator('#day-of-week-report-panel .exit-report__card');
        await expect(exitReportCards).toHaveCount(3);
        
        const cardCount = await exitReportCards.count();
        for (let i = 0; i < cardCount; i++) {
            await expect(exitReportCards.nth(i)).toBeVisible();
        }

        // Verify the search input is visible
        await expect(page.locator(config.selectors.dayOfWeek.searchInput)).toBeVisible();
        await page.locator(config.selectors.dayOfWeek.searchInput).clear();
        await page.locator(config.selectors.dayOfWeek.searchInput).fill('Sales');

        // Click on "Save file as" dropdown
        await page.locator('#day-report-content button.dropdown__trigger').hover();

        // Click on "Excel"
        await page.locator('#day-report-content .dropdown__content button.dropdown__item').filter({ hasText: 'Excel' }).click({ force: true });

        // Click on "Save file as" dropdown again
        await page.locator('#day-report-content button.dropdown__trigger').hover();

        // Click on "CSV"
        await page.locator('#day-report-content .dropdown__content button.dropdown__item').filter({ hasText: 'CSV' }).click({ force: true });

        // Click on "Save file as" dropdown again
        await page.locator('#day-report-content button.dropdown__trigger').hover();

        // Click on "PDF"
        await page.locator('#day-report-content .dropdown__content button.dropdown__item').filter({ hasText: 'PDF' }).click({ force: true });

        // Scroll to the top of the report
        await page.locator(config.selectors.dayOfWeek.dayOfWeekReportContainer).evaluate(el => el.scrollTo(0, 0));

        // Click on the pagination next button
        await expect(page.locator(config.selectors.dayOfWeek.pagination)).toBeVisible();
        await page.locator(config.selectors.dayOfWeek.pagination).click();

        // Verify the next page of the report is visible
        const reportRows = page.locator(config.selectors.dayOfWeek.dayOfWeekReportRows);
        await expect(reportRows.first()).toBeVisible();
        const rowCount = await reportRows.count();
        expect(rowCount).toBeGreaterThanOrEqual(1);

        // Click on pagination previous button
        await expect(page.locator(config.selectors.dayOfWeek.paginationPrevious)).toBeVisible();
        await page.locator(config.selectors.dayOfWeek.paginationPrevious).click();

        // Verify the previous page of the report is visible
        const reportRowsPrev = page.locator(config.selectors.dayOfWeek.dayOfWeekReportRows);
        await expect(reportRowsPrev.first()).toBeVisible();
        const rowCountPrev = await reportRowsPrev.count();
        expect(rowCountPrev).toBeGreaterThanOrEqual(1);
    });
});