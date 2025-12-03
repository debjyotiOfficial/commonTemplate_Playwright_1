const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Scheduled Reports', () => {
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

  test('should view the scheduled report and manage info', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Use fast login helper which handles stored auth vs fresh login automatically
    await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

    // Click on alerts menu
    await page.locator(config.selectors.navigation.alertsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.alertsMenu)
      .click();

    // Click on scheduled report
    await page.locator(config.selectors.scheduledReport.scheduledReportMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.scheduledReport.scheduledReportMenu)
      .click();

    // Verify the scheduled report data is visible
    await page.locator(config.selectors.scheduledReport.scheduledReportContainer)
      .waitFor({ state: 'visible' });

    // Click on the "Add New Alert" search input
    await page.locator(config.selectors.scheduledReport.addNewAlert)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.scheduledReport.addNewAlert)
      .click();
    await page.locator(config.selectors.scheduledReport.addNewAlert)
      .fill('TestAutomate@gmail.com');

    // Check the "weekly alert summary" checkbox
    await page.locator(config.selectors.scheduledReport.weeklyAlertSummaryCheck)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.scheduledReport.weeklyAlertSummaryCheck)
      .check({ force: true });

    // Select the submit button
    await page.locator(config.selectors.scheduledReport.submitBtn)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.scheduledReport.submitBtn)
      .click();

    // Click on edit 
    await page.locator(config.selectors.scheduledReport.EditOption)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.scheduledReport.EditOption)
      .click();

    // Assert the email is present in the table
    await page.locator(config.selectors.scheduledReport.EditTable)
      .waitFor({ state: 'visible' });
    await expect(page.locator(config.selectors.scheduledReport.EditTable))
      .toContainText('TestAutomate@gmail.com');

    const emailRow = page.locator(config.selectors.scheduledReport.EditTable)
      .locator('tr')
      .filter({ hasText: 'TestAutomate@gmail.com' });
    await emailRow.locator('button.edit-report')
      .first()
      .click();

    // Set time
    await page.locator(config.selectors.scheduledReport.selectTime)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.scheduledReport.selectTime)
      .click();
    await page.locator(config.selectors.scheduledReport.selectTime)
      .fill('11:00');

    // Click on set time button
    await page.locator(config.selectors.scheduledReport.setTimeBtn)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.scheduledReport.setTimeBtn)
      .click();

    // Click on the "Add New Alert" search input
    await page.locator(config.selectors.scheduledReport.addNewAlert)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.scheduledReport.addNewAlert)
      .click();
    await page.locator(config.selectors.scheduledReport.addNewAlert)
      .clear();
    await page.locator(config.selectors.scheduledReport.addNewAlert)
      .fill('TestAutomate2@gmail.com');

    // Check the "checkin reports" checkbox (if enabled)
    await page.locator(config.selectors.scheduledReport.checkin)
      .waitFor({ state: 'visible' });
    
    const checkinCheckbox = page.locator(config.selectors.scheduledReport.checkin);
    const isCheckinEnabled = await checkinCheckbox.isEnabled();
    
    if (isCheckinEnabled) {
      await checkinCheckbox.check({ force: true });
      
      // Select the submit button
      await page.locator(config.selectors.scheduledReport.submitBtn)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.scheduledReport.submitBtn)
        .click();

      await page.waitForTimeout(4000);

      // Click on edit 
      await page.locator(config.selectors.scheduledReport.EditOption)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.scheduledReport.EditOption)
        .click();

      // Assert the email is present in the table
      await page.locator(config.selectors.scheduledReport.EditTable)
        .waitFor({ state: 'visible' });
      await expect(page.locator(config.selectors.scheduledReport.EditTable))
        .toContainText('TestAutomate2@');
    } else {
      console.log('Checkin checkbox is disabled, skipping second email submission and verification');
    }
  });
});