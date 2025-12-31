const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Maintainance Report', () => {
  let helpers;
  let config;

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
    
  test('should view the vehicle maintenance report', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Use fast login helper which handles stored auth vs fresh login automatically
    await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

    // Click on alerts menu
    await page.locator(config.selectors.navigation.alertsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.alertsMenu)
      .click();

    // Wait for the alerts section to expand
    await page.waitForTimeout(2000);

    // Click on maint menu
    await page.locator(config.selectors.maintenanceReport.maintmenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.maintenanceReport.maintmenu)
      .click();

    // Verify modal is visible
    await page.locator(config.selectors.maintenanceReport.showVehicleReportModal)
      .waitFor({ state: 'visible' });
      
    await page.locator(config.selectors.maintenanceReport.entries)
      .selectOption('10');

    // Click on "Save file as" dropdown
    await page.locator('#maintenance-report-panel button.dropdown__trigger')
      .hover();

    // Click on "Excel"
    await page.locator('#maintenance-report-panel .dropdown__content button.dropdown__item')
      .filter({ hasText: 'Excel' })
      .click({ force: true });

    // Click on "Save file as" dropdown again
    await page.locator('#maintenance-report-panel button.dropdown__trigger')
      .hover();

    // Click on "CSV"
    await page.locator('#maintenance-report-panel .dropdown__content button.dropdown__item')
      .filter({ hasText: 'CSV' })
      .click({ force: true });

    // Click on "Save file as" dropdown again
    await page.locator('#maintenance-report-panel button.dropdown__trigger')
      .hover();

    // Click on "PDF"
    await page.locator('#maintenance-report-panel .dropdown__content button.dropdown__item')
      .filter({ hasText: 'PDF' })
      .click({ force: true });

    // Type "Sales car1" in the search input
    await page.locator(config.selectors.maintenanceReport.search)
      .click();
    await page.locator(config.selectors.maintenanceReport.search)
      .fill('Sales car1');

    // Click the Copy button
    await page.locator(config.selectors.maintenanceReport.copy)
      .filter({ hasText: 'Copy' })
      .click();

    // Click on pagination buttons
    await page.locator('#maintenance-report-panel .pagination__next')
      .scrollIntoViewIfNeeded();
    await page.locator('#maintenance-report-panel .pagination__next')
      .waitFor({ state: 'visible' });
    await page.locator('#maintenance-report-panel .pagination__next')
      .click();

    await page.waitForTimeout(5000);

    // Click the previous pagination button
    await page.locator('#maintenance-report-panel .pagination__prev')
      .scrollIntoViewIfNeeded();
    await page.locator('#maintenance-report-panel .pagination__prev')
      .waitFor({ state: 'visible' });
    await page.locator('#maintenance-report-panel .pagination__prev')
      .click();

    await page.waitForTimeout(5000);
  });
});