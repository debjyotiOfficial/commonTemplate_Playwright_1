const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Alert Contact', () => {
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

  test('should add email and phone contacts and configure alert settings', async ({ page }) => {
    await page.goto(config.urls.backAdminLoginPage);
    
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
    await page.goto(config.urls.fleetDashboard3);
    
    // Click on alerts menu
    await page.locator(config.selectors.navigation.alertsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.alertsMenu)
      .click();

    // Wait for submenu to appear
    await page.waitForTimeout(2000);

    await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
      .click({ force: true });

    await page.locator(config.selectors.alertsContact.alertContactModal)
      .waitFor({ state: 'visible' });

    // Add email
    await page.locator(config.selectors.alertsContact.emailInput)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.emailInput)
      .clear();
    await page.locator(config.selectors.alertsContact.emailInput)
      .fill('abcd@gmail.com');

    // Click on submit button in email tab - scope to email tab to avoid ambiguity
    const emailSubmitButton = page.locator('#email_tab #save-alerts-contacts');

    // Scroll to alerts contacts section first
    await page.getByRole('heading', { name: 'Alerts Contacts' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Wait for and click the submit button
    await emailSubmitButton.waitFor({ state: 'visible' });
    await emailSubmitButton.click();

    await page.waitForTimeout(5000);

    // Assert the email appears in the table
    await expect(page.locator('#email-contacts-table'))
      .toContainText('abcd@gmail.com');

    // Click on close button
    await page.locator(config.selectors.alertsContact.closeButton)
      .scrollIntoViewIfNeeded();
    await page.locator(config.selectors.alertsContact.closeButton)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.closeButton)
      .click();

    // Click on alerts menu
    await page.locator(config.selectors.navigation.alertsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.alertsMenu)
      .click();

    // Wait for submenu to appear
    await page.waitForTimeout(2000);

    await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
      .click({ force: true });

    await page.locator(config.selectors.alertsContact.alertContactModal)
      .waitFor({ state: 'visible' });

    // Verify the added email
    await page.locator(config.selectors.alertsContact.emailContactList)
      .waitFor({ state: 'visible' });
    await expect(page.locator(config.selectors.alertsContact.emailContactList))
      .toContainText('abcd@gmail.com');

    // Add phone number
    await page.getByRole('button', { name: 'Phone Number' })
      .waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Phone Number' })
      .click();

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

    await page.waitForTimeout(2000);

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

    // Wait for submenu to appear
    await page.waitForTimeout(2000);

    await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
      .click({ force: true });

    await page.locator(config.selectors.alertsContact.alertContactModal)
      .waitFor({ state: 'visible' });
        
    await page.locator(config.selectors.alertsContact.smsContactList)
      .waitFor({ state: 'visible' });
    await expect(page.locator(config.selectors.alertsContact.smsContactList))
      .toContainText('9777212121');

    // Click on close button
    await page.locator(config.selectors.alertsContact.closeButton)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.closeButton)
      .click();

   await page.waitForTimeout(10000); 

    // Click on alerts menu
    await page.locator(config.selectors.navigation.alertsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.alertsMenu)
      .click();

    // Wait for submenu to appear
    await page.waitForTimeout(2000);

    // Click on change alert settings menu
    await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
      .waitFor({ state: 'visible' })

    await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
      .click({ force: true });

    await page.locator(config.selectors.alertsContact.alertContactModal)
      .waitFor({ state: 'visible' });

    // //add some wait time to ensure modal is fully loaded
    // await page.waitForTimeout(2000);

    // Click on email tab
    await page.locator('#alerts-contacts-panel button[data-tab="email_tab"]')
      .waitFor({ state: 'visible' });
    await page.locator('#alerts-contacts-panel button[data-tab="email_tab"]')
      .scrollIntoViewIfNeeded();
    await page.locator('#alerts-contacts-panel button[data-tab="email_tab"]')
      .click({ force: true });

    await page.locator(config.selectors.alertsContact.changeAlertSettingsButton)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.changeAlertSettingsButton)
      .click();

    await page.locator(config.selectors.alertsContact.changeAlertModal)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.changeAlertModal)
      .click();
      
    await page.waitForTimeout(10000);

    // Select device
    const vehicleDropdowns = page.locator(config.selectors.alertsContact.vehicleDropdown);
    await vehicleDropdowns.nth(0)
      .click();
    
    await vehicleDropdowns.nth(0)
      .click();
    
    await vehicleDropdowns.nth(0)
      .click();
    await page.locator(config.selectors.alertsContact.vehicleOption)
      .locator('text=All Devices')
      .click();

    // Click on enable alert button
    await page.locator(config.selectors.alertsContact.enableAlertButton)
      .click();

    // Verify delete option for email
    // Click on alerts contact
    await page.locator(config.selectors.alertsContact.alertsContactButton)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.alertsContactButton)
      .click();

    await page.waitForTimeout(5000);

    // Delete email contact
    const emailRow = page.locator('#email-contacts-table tbody tr')
      .filter({ hasText: 'abcd@gmail.com' });
    await emailRow.locator('button.btn.btn--danger')
      .click();

    await page.waitForTimeout(5000);

    // Verify email contact is deleted
    await page.locator(config.selectors.alertsContact.emailContactList)
      .waitFor({ state: 'visible' });
    await expect(page.locator(config.selectors.alertsContact.emailContactList))
      .not.toContainText('abcd@gmail.com');

    // Delete phone contact
    // Click on phone tab
    await page.getByRole('button', { name: 'Phone Number' })
      .click();

    // Delete phone contact
    const phoneRow = page.locator('#phone-contacts-table tbody tr')
      .filter({ hasText: '9777212121@tmomail.net' });
    await phoneRow.locator('button.btn.btn--danger')
      .click();

    // Verify phone contact is deleted
    await page.locator(config.selectors.alertsContact.phoneContactList)
      .waitFor({ state: 'visible' });
    await expect(page.locator(config.selectors.alertsContact.phoneContactList))
      .not.toContainText('9777212121');

    // After hours alerts

    // Click on close button
    await page.locator(config.selectors.alertsContact.closeButton)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.closeButton)
      .click();

   await page.waitForTimeout(10000); 

    // Click on alerts menu
    await page.locator(config.selectors.navigation.alertsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.alertsMenu)
      .click();

    // Wait for submenu to appear
    await page.waitForTimeout(2000);

    // Click on change alert settings menu
    await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
      .waitFor({ state: 'visible' })

    await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
      .click({ force: true });

    await page.locator(config.selectors.alertsContact.alertContactModal)
      .waitFor({ state: 'visible' });

    // Click on email tab
    await page.locator('#alerts-contacts-panel button[data-tab="email_tab"]')
      .waitFor({ state: 'visible' });
    await page.locator('#alerts-contacts-panel button[data-tab="email_tab"]')
      .scrollIntoViewIfNeeded();
    await page.locator('#alerts-contacts-panel button[data-tab="email_tab"]')
      .click({ force: true });

    await page.locator(config.selectors.alertsContact.changeAlertSettingsButton)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.changeAlertSettingsButton)
      .click();

    // Click on after hours alerts
    await page.locator(config.selectors.alertsContact.afterHoursAlerts)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.afterHoursAlerts)
      .click();

    // Click the Select A Device dropdown to open it
    await page.locator('#after-hours-settings-panel #select2-vehicle-select-container')
      .click();

    await page.locator('#after-hours-settings-panel #select2-vehicle-select-container')
      .click();

    await page.locator('#after-hours-settings-panel #select2-vehicle-select-container')
      .click();

    // Click the desired option
    await page.locator('.select2-results__option')
      .locator('text=Demo1')
      .click();
      
    // Click on the "Custom Days" radio button
    await page.locator('input[type="radio"][name="working-hours"][value="custom-days"]')
      .click();

    // Check the "TH" checkbox
    await page.locator('#checkbox-TH')
      .check();

    // Click on advanced settings
    await page.locator(config.selectors.alertsContact.advanced_settings_toggle)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.alertsContact.advanced_settings_toggle)
      .click();

    // Set the post speed limit
    await page.locator('input.postSpeedLimit')
      .click();
    await page.locator('input.postSpeedLimit')
      .clear();
    await page.locator('input.postSpeedLimit')
      .fill('8');

    // Click on submit button
    await page.locator('#after-hours-settings-submit-btn')
      .click();
  });
});