const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Change Alert Settings', () => {
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

  test('should manage alerts', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Use fast login helper which handles stored auth vs fresh login automatically
    await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

    // Click on alerts menu
    await page.locator(config.selectors.navigation.alertsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.alertsMenu)
      .click({ force: true });

    //wait for few second
    await page.waitForTimeout(2000);

    // Click on change alert settings menu
    await page.locator(config.selectors.changeAlertSettings.changeAlertSettingsMenu)
      .waitFor({ state: 'visible' })

    await page.locator(config.selectors.changeAlertSettings.changeAlertSettingsMenu)
      .click({ force: true });

    // Verify the modal is visible
    await page.locator(config.selectors.alertsContact.changeAlertModal)
      .waitFor({ state: 'visible' });

    // Click on Alerts contact button
    await page.locator(config.selectors.changeAlertSettings.alertsContactBUtton)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.changeAlertSettings.alertsContactBUtton)
      .click();

    // Add email
    await page.locator(config.selectors.alertsContact.emailInput)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.emailInput)
      .clear();
    await page.locator(config.selectors.alertsContact.emailInput)
      .fill('abcd@gmail.com');

    // Click on submit button
    await page.locator('#email_tab #save-alerts-contacts')
      .waitFor({ state: 'visible' });
    await page.locator('#email_tab #save-alerts-contacts')
      .click();

    await page.waitForTimeout(10000);

    // Assert the email appears in the table
    await expect(page.locator('#email-contacts-table'))
      .toContainText('abcd@gmail.com');

    // Click on close button
    // await page.locator(config.selectors.alertsContact.closeButton)
    //   .scrollIntoViewIfNeeded();
    // await page.locator(config.selectors.alertsContact.closeButton)
    //   .waitFor({ state: 'visible' });
    // await page.locator(config.selectors.alertsContact.closeButton)
    //   .click();

    // // Click on alerts menu
    // await page.locator(config.selectors.navigation.alertsMenu)
    //   .waitFor({ state: 'visible' });
    // await page.locator(config.selectors.navigation.alertsMenu)
    //   .click();

    // await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
    //   .waitFor({ state: 'visible' });
    // await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
    //   .click();

    await page.waitForTimeout(3000);

    // Verify the added email
    await page.locator(config.selectors.alertsContact.emailContactList)
      .waitFor({ state: 'visible' });
    await expect(page.locator(config.selectors.alertsContact.emailContactList))
      .toContainText('abcd@gmail.com');

    // Add phone number - try alternative selectors
    // First try to find phone number button by text
    const phoneButton = page.getByText('Phone Number').or(page.locator('button[data-tab="phone_tab"]')).or(page.locator('#alerts-contacts-panel button').filter({ hasText: 'Phone' }));
    
    try {
      await phoneButton.first().click({ force: true, timeout: 10000 });
    } catch (error) {
      console.log('Phone tab not found, trying direct phone input');
      // If phone tab doesn't exist, try to find phone input directly
    }

    // Click on phone input box
    await page.locator(config.selectors.alertsContact.smsInput)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.smsInput)
      .clear();
    await page.locator(config.selectors.alertsContact.smsInput)
      .fill('9777212121');

    // Select carrier
    await page.locator(config.selectors.alertsContact.carrierRadio)
      .check({ force: true });

    // Click on submit button
    const addSmsButtons = page.locator(config.selectors.alertsContact.addSmsButton);
    await addSmsButtons.nth(1)
      .waitFor({ state: 'visible' });
    await addSmsButtons.nth(1)
      .click();

    await page.waitForTimeout(10000);

    // Click on close button
    await page.locator(config.selectors.alertsContact.closeButton)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.closeButton)
      .click();

    // Click on alerts menu
    await page.locator(config.selectors.navigation.alertsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.alertsMenu)
      .click();

    await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
      .click();

    await page.waitForTimeout(10000);
        
    await page.locator(config.selectors.alertsContact.smsContactList)
      .waitFor({ state: 'visible' });
    await expect(page.locator(config.selectors.alertsContact.smsContactList))
      .toContainText('9777212121@tmomail.net');

    // Click on close button
    await page.locator(config.selectors.alertsContact.closeButton)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.closeButton)
      .click();

    await page.waitForTimeout(3000);

    // Click on alerts menu
    await page.locator(config.selectors.navigation.alertsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.alertsMenu)
      .click({ force: true });

    //wait for few second
    await page.waitForTimeout(2000);

    // Click on change alert settings menu
    await page.locator(config.selectors.changeAlertSettings.changeAlertSettingsMenu)
      .waitFor({ state: 'visible' })

    await page.locator(config.selectors.changeAlertSettings.changeAlertSettingsMenu)
      .click({ force: true });

    // Verify the modal is visible
    await page.locator(config.selectors.alertsContact.changeAlertModal)
      .waitFor({ state: 'visible' });

    //wait for few seconds
    await page.waitForTimeout(2000);

    // Click on after hours button
    await page.locator(config.selectors.changeAlertSettings.afterHourBtn)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.changeAlertSettings.afterHourBtn)
      .scrollIntoViewIfNeeded();
    await page.locator(config.selectors.changeAlertSettings.afterHourBtn)
      .click();

    // Click on the Select2 dropdown to open options
    await page.locator('#after-hours-settings-panel .select2-selection__rendered')
      .click();

    // Click on the Select2 dropdown to open options
    await page.locator('#after-hours-settings-panel .select2-selection__rendered')
      .click();

    // Click on the Select2 dropdown to open options
    await page.locator('#after-hours-settings-panel .select2-selection__rendered')
      .click();

    // Type in the Select2 search field
    await page.locator('.select2-search__field')
      .fill('Demo1');

    // Click on the result "Demo1"
    await page.locator('.select2-results__option')
      .filter({ hasText: 'Demo1' })
      .click();

    // Select the "Custom Days" radio button for Working Hours
    await page.locator('input[type="radio"][value="custom-days"]')
      .check({ force: true });

    await page.waitForTimeout(2000);

    // Handle checkbox W
    const checkboxW = page.locator('#checkbox-W');
    if (await checkboxW.isChecked()) {
      await checkboxW.uncheck({ force: true });
    } else {
      await checkboxW.check({ force: true });
    }

    // Handle checkbox TH
    const checkboxTH = page.locator('#checkbox-TH');
    if (await checkboxTH.isChecked()) {
      await checkboxTH.uncheck({ force: true });
    } else {
      await checkboxTH.check({ force: true });
    }

    // Handle checkbox F
    const checkboxF = page.locator('#checkbox-F');
    if (await checkboxF.isChecked()) {
      await checkboxF.uncheck({ force: true });
    } else {
      await checkboxF.check({ force: true });
    }

    // Click on advanced settings
    await page.locator('#advanced-settings-toggle')
      .waitFor({ state: 'visible' });
    await page.locator('#advanced-settings-toggle')
      .click();

    // Type in the "idling-hrs" input
    await page.locator('input.input-style.idling_hrs')
      .clear();
    await page.locator('input.input-style.idling_hrs')
      .fill('02:00', { force: true });

    // Type in the "stop_hrs" input
    await page.locator('input.input-style.stop_hrs')
      .clear();
    await page.locator('input.input-style.stop_hrs')
      .fill('03:00', { force: true });

    // Type in "stop-count" input
    await page.locator('input.input-style.stop_count')
      .clear();
    await page.locator('input.input-style.stop_count')
      .fill('5', { force: true });

    // Type in "post-speed-limit" input
    await page.locator('input.input-style.postSpeedLimit')
      .clear();
    await page.locator('input.input-style.postSpeedLimit')
      .fill('40', { force: true });

    // Click on submit button
    await page.locator('#after-hours-settings-submit-btn')
      .scrollIntoViewIfNeeded();
    await page.locator('#after-hours-settings-submit-btn')
      .waitFor({ state: 'visible' });
    await page.locator('#after-hours-settings-submit-btn')
      .click();

    await page.waitForTimeout(5000);
  });
});