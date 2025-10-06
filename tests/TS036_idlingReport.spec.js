const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Idling Report', () => {
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

    test('should generate and validate idling report', async ({ page }) => {
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
        
        // Click on idling report menu
        await page.locator(config.selectors.idlingReport.idlingMenu).scrollIntoViewIfNeeded();
        await page.locator(config.selectors.idlingReport.idlingMenu).click({ force: true });

        // Verify idling report container is visible
        await expect(page.locator(config.selectors.idlingReport.idlingContainer)).toBeVisible();

        // Date selection
        await page.locator('#idling-report-panel-calendar-btn').scrollIntoViewIfNeeded();
        await page.locator('#idling-report-panel-calendar-btn').click({ force: true });
        
        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('July');
        
        // Select July 1, 2025
        await page.locator('.flatpickr-day[aria-label="July 1, 2025"]').click({ force: true });
        
        // Select July 10, 2025 (as end date)
        await page.locator('.flatpickr-day[aria-label="July 10, 2025"]').click({ force: true });
        
        // Click on the Select2 dropdown to open options
        await page.locator('#select2-idling-device-select-container').click();
        
        // Type in the Select2 search field
        await page.locator('.select2-search__field').fill('Sales car1');
        
        // Click on the result "Sales car1"
        await page.locator('.select2-results__option').filter({ hasText: 'Sales car1' }).click();
        
        // Click on submit button
        await expect(page.locator(config.selectors.idlingReport.submitButton)).toBeVisible();
        await page.locator(config.selectors.idlingReport.submitButton).click();
        
        // Wait for value to load in idling time input
        await page.waitForTimeout(config.timeouts.wait);
        
        // Wait for the Idling Time value to load and verify it's not empty
        const idlingTimeField = page.locator('#idling-report-report-ui .report-ui__field').filter({ hasText: 'Idling Time' });
        const idlingTimeValue = idlingTimeField.locator('.report-ui__value');
        
        await expect(idlingTimeValue).not.toBeEmpty();
    });
});