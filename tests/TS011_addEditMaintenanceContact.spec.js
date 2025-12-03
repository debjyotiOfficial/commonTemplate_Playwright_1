const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Add Edit Maintenance Contact', () => {
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
    
  test('should add the contact details', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Use fast login helper which handles stored auth vs fresh login automatically
    await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

    // Click on alerts menu
    await page.locator(config.selectors.navigation.alertsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.alertsMenu)
      .click();

    // Click on add/edit maint menu
    await page.locator(config.selectors.addEditmaintenance.addEditmaintenanceMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.addEditmaintenance.addEditmaintenanceMenu)
      .click();

    await page.locator(config.selectors.addEditmaintenance.addEditmaintenancepanel)
      .waitFor({ state: 'visible' });

    // Click on input and type email
    await page.locator(config.selectors.addEditmaintenance.maintenanceEmailInput)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.addEditmaintenance.maintenanceEmailInput)
      .clear();
    await page.locator(config.selectors.addEditmaintenance.maintenanceEmailInput)
      .fill('AutomatedUser@gmail.com');

    // Click on submit button
    await page.locator(config.selectors.addEditmaintenance.submitBtn)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.addEditmaintenance.submitBtn)
      .click();

    await page.waitForTimeout(2000);

    // Assert the email is visible in the table
    await expect(page.locator(config.selectors.addEditmaintenance.mainTable))
      .toContainText('AutomatedUser@gmail.com');

    // Click the delete button for AutomatedUser@gmail.com
    const emailRow = page.locator(config.selectors.addEditmaintenance.mainTable)
      .locator('tr')
      .filter({ hasText: 'AutomatedUser@gmail.com' });
    await emailRow.locator(config.selectors.addEditmaintenance.dltBtn)
      .click();

      //wait for few seconds
    await page.waitForTimeout(10000);

    // Click the sort button in the Email Contacts table
    await page.locator(config.selectors.addEditmaintenance.sort)
      .click();

    // After deleting the email, verify it is not present in the table
    await expect(page.locator(config.selectors.addEditmaintenance.mainTable))
      .not.toContainText('AutomatedUser@gmail.com');
  });
});