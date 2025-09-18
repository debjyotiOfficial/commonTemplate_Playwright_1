const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Fleet Login Tests', () => {
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
    
  test('should redirect to fleet demo page with demo credentials', async ({ page }) => {
    await page.goto(config.urls.backupLoginPage);
    
    await page.locator(config.selectors.login.usernameFieldBackup)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.login.usernameFieldBackup)
      .clear();
    await page.locator(config.selectors.login.usernameFieldBackup)
      .fill(config.credentials.demo.usernameBackup);
    
    await page.locator(config.selectors.login.passwordFieldBackup)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.login.passwordFieldBackup)
      .clear();
    await page.locator(config.selectors.login.passwordFieldBackup)
      .fill(config.credentials.demo.passwordBackup);
    
    await page.locator(config.selectors.login.submitButtonBackup)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.login.submitButtonBackup)
      .click();
    
    await page.waitForTimeout(config.timeouts.wait);
    await page.goto(config.urls.fleetNewDashboard);
    await page.waitForTimeout(5000);

    // Click on accounts menu
    await page.locator(config.selectors.navigation.accountsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.accountsMenu)
      .click();

    // Click on drivers menu
    await page.locator(config.selectors.driverCard.trackInfoMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.driverCard.trackInfoMenu)
      .click();

    // Select the "Driver Card" radio button in Track Info Display Options
    await page.locator(config.selectors.driverCard.standardCheckbox)
      .check({ force: true });

    // Click on submit button
    await page.locator(config.selectors.driverCard.submitButton)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.driverCard.submitButton)
      .click();

    await page.locator(".alert.alert-success")
      .waitFor({ state: 'visible' });

    await page.waitForTimeout(4000);

    // Click on utilization report
    await page.locator(config.selectors.waterProof.waterProofMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.waterProof.waterProofMenu)
      .click();

    // Verify report is visible
    await page.locator(config.selectors.waterProof.waterProofContainer)
      .waitFor({ state: 'visible' });
    await expect(page.locator(config.selectors.waterProof.waterProofContainer))
      .toContainText('Waterproof Locate Now');

    // Click on the "Search and select a vehicle..." dropdown
    await page.locator('#select2-waterproof-vehicle-select-container')
      .click();

    // Type "dashboard" into the search field
    await page.locator('input.select2-search__field')
      .fill('dashboard');

    // Click on "Dashboard Test" option
    await page.locator('.select2-results__option--highlighted')
      .filter({ hasText: 'Dashboard Test' })
      .click();

    // Click on locate now button
    await page.locator(config.selectors.waterProof.locate_now_btn)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.waterProof.locate_now_btn)
      .click();

    await page.waitForTimeout(5000);
    
    // Verify the infobox is visible
    await page.locator(config.selectors.waterProof.H_ib_body)
      .waitFor({ state: 'visible' });
    await expect(page.locator(config.selectors.waterProof.H_ib_body))
      .toContainText('Dashboard Test');

    // Verify the infobox contains the text "Dashboard Test"
    await expect(page.locator(config.selectors.waterProof.infoboxName))
      .toContainText('Dashboard Test');
  });
});