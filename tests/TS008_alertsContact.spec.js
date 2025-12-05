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
    const helpers = new TestHelpers(page);

    // ========================================
    // STEP 1: Login and Navigate to Dashboard
    // ========================================
    await test.step('Step 1: Login and navigate to fleet dashboard', async () => {
      await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);
    });

    // ========================================
    // STEP 2: Open Alerts Settings Modal
    // ========================================
    await test.step('Step 2: Open Alerts Settings modal from navigation menu', async () => {
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
    });

    // ========================================
    // STEP 3: Add Email Contact
    // ========================================
    await test.step('Step 3: Add a new email contact (abcd@gmail.com)', async () => {
      // Enter email address
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
    });

    // ========================================
    // STEP 4: Close Modal and Verify Email Was Saved
    // ========================================
    await test.step('Step 4: Close modal and verify email contact was saved', async () => {
      // Click on close button
      await page.locator(config.selectors.alertsContact.closeButton)
        .scrollIntoViewIfNeeded();
      await page.locator(config.selectors.alertsContact.closeButton)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.closeButton)
        .click();

      // Reopen alerts settings to verify persistence
      await page.locator(config.selectors.navigation.alertsMenu)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.navigation.alertsMenu)
        .click();

      await page.waitForTimeout(2000);

      await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
        .click({ force: true });

      await page.locator(config.selectors.alertsContact.alertContactModal)
        .waitFor({ state: 'visible' });

      // Verify the added email persists
      await page.locator(config.selectors.alertsContact.emailContactList)
        .waitFor({ state: 'visible' });
      await expect(page.locator(config.selectors.alertsContact.emailContactList))
        .toContainText('abcd@gmail.com');
    });

    // ========================================
    // STEP 5: Add Phone Number Contact
    // ========================================
    await test.step('Step 5: Add a new phone number contact (9777212121)', async () => {
      // Switch to Phone Number tab
      await page.getByRole('button', { name: 'Phone Number' })
        .waitFor({ state: 'visible' });
      await page.getByRole('button', { name: 'Phone Number' })
        .click();

      // Enter phone number
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
    });

    // ========================================
    // STEP 6: Close Modal and Verify Phone Was Saved
    // ========================================
    await test.step('Step 6: Close modal and verify phone contact was saved', async () => {
      // Click on close button
      await page.locator(config.selectors.alertsContact.closeButton)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.closeButton)
        .click();

      // Reopen alerts settings to verify persistence
      await page.locator(config.selectors.navigation.alertsMenu)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.navigation.alertsMenu)
        .click();

      await page.waitForTimeout(2000);

      await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
        .click({ force: true });

      await page.locator(config.selectors.alertsContact.alertContactModal)
        .waitFor({ state: 'visible' });

      // Verify the added phone number persists
      await page.locator(config.selectors.alertsContact.smsContactList)
        .waitFor({ state: 'visible' });
      await expect(page.locator(config.selectors.alertsContact.smsContactList))
        .toContainText('9777212121');

      // Click on close button
      await page.locator(config.selectors.alertsContact.closeButton)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.closeButton)
        .click();
    });

    // ========================================
    // STEP 7: Configure Alert Settings for All Devices
    // ========================================
    await test.step('Step 7: Open Change Alert Settings and configure for All Devices', async () => {
      await page.waitForTimeout(10000);

      // Open alerts menu
      await page.locator(config.selectors.navigation.alertsMenu)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.navigation.alertsMenu)
        .click();

      await page.waitForTimeout(2000);

      // Open alerts settings
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

      // Click Change Alert Settings button
      await page.locator(config.selectors.alertsContact.changeAlertSettingsButton)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.changeAlertSettingsButton)
        .click();

      // Click on change alert modal
      await page.locator(config.selectors.alertsContact.changeAlertModal)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.changeAlertModal)
        .click();

      await page.waitForTimeout(10000);

      // Select "All Devices" from dropdown
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

      // Enable alerts
      await page.locator(config.selectors.alertsContact.enableAlertButton)
        .click();
    });

    // ========================================
    // STEP 8: Delete Email Contact
    // ========================================
    await test.step('Step 8: Delete the email contact and verify deletion', async () => {
      // Navigate to alerts contacts
      await page.locator(config.selectors.alertsContact.alertsContactButton)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.alertsContactButton)
        .click();

      await page.waitForTimeout(5000);

      // Find and delete the email contact
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
    });

    // ========================================
    // STEP 9: Delete Phone Contact
    // ========================================
    await test.step('Step 9: Delete the phone contact and verify deletion', async () => {
      // Switch to Phone Number tab
      await page.getByRole('button', { name: 'Phone Number' })
        .click();

      // Find and delete the phone contact
      const phoneRow = page.locator('#phone-contacts-table tbody tr')
        .filter({ hasText: '9777212121@tmomail.net' });
      await phoneRow.locator('button.btn.btn--danger')
        .click();

      // Verify phone contact is deleted
      await page.locator(config.selectors.alertsContact.phoneContactList)
        .waitFor({ state: 'visible' });
      await expect(page.locator(config.selectors.alertsContact.phoneContactList))
        .not.toContainText('9777212121');

      // Close the modal
      await page.locator(config.selectors.alertsContact.closeButton)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.closeButton)
        .click();
    });

    // ========================================
    // STEP 10: Configure After Hours Alerts
    // ========================================
    await test.step('Step 10: Open After Hours Alerts settings', async () => {
      await page.waitForTimeout(10000);

      // Open alerts menu
      await page.locator(config.selectors.navigation.alertsMenu)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.navigation.alertsMenu)
        .click();

      await page.waitForTimeout(2000);

      // Open alerts settings
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

      // Click Change Alert Settings
      await page.locator(config.selectors.alertsContact.changeAlertSettingsButton)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.changeAlertSettingsButton)
        .click();

      // Click on After Hours Alerts option
      await page.locator(config.selectors.alertsContact.afterHoursAlerts)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.afterHoursAlerts)
        .click();
    });

    // ========================================
    // STEP 11: Select Device for After Hours Alerts
    // ========================================
    await test.step('Step 11: Select "Demo 1" device for After Hours Alerts', async () => {
      // Open device dropdown (multiple clicks to ensure dropdown opens)
      await page.locator('#after-hours-settings-panel #select2-vehicle-select-container')
        .click();

      await page.locator('#after-hours-settings-panel #select2-vehicle-select-container')
        .click();

      await page.locator('#after-hours-settings-panel #select2-vehicle-select-container')
        .click();

      // Select "Demo 1" device
      await page.locator('.select2-results__option')
        .locator('text=Demo 1')
        .click();
    });

    // ========================================
    // STEP 12: Configure Custom Days and Working Hours
    // ========================================
    await test.step('Step 12: Configure custom working days (select Thursday)', async () => {
      // Select "Custom Days" radio button
      await page.locator('input[type="radio"][name="working-hours"][value="custom-days"]')
        .click();

      // Check Thursday checkbox
      await page.locator('#checkbox-TH')
        .check();
    });

    // ========================================
    // STEP 13: Configure Advanced Settings
    // ========================================
    await test.step('Step 13: Configure advanced settings (set post speed limit to 8)', async () => {
      // Expand advanced settings
      await page.locator(config.selectors.alertsContact.advanced_settings_toggle)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.advanced_settings_toggle)
        .click();

      // Set post speed limit to 8
      await page.locator('input.postSpeedLimit')
        .click();
      await page.locator('input.postSpeedLimit')
        .clear();
      await page.locator('input.postSpeedLimit')
        .fill('8');
    });

    // ========================================
    // STEP 14: Submit After Hours Settings and Verify API Response
    // ========================================
    await test.step('Step 14: Submit After Hours Alert settings and verify API response', async () => {
      // Set up API response listener before clicking submit
      const apiResponsePromise = page.waitForResponse(
        response => response.url().includes('setDeviceSettings_here_prop.php') && response.status() === 200
      );

      // Click submit button
      await page.locator('#after-hours-settings-submit-btn')
        .click();

      // Wait for and verify API response
      const response = await apiResponsePromise;
      const responseBody = await response.json();

      // Verify API response status and message
      expect(response.status()).toBe(200);
      expect(responseBody.status).toBe(true);
      expect(responseBody.saved).toBe(true);
      expect(responseBody.message).toBe('Data processed successfully');
    });

    // ========================================
    // STEP 15: Close After Hours Modal
    // ========================================
    await test.step('Step 15: Close After Hours settings modal', async () => {
      // Click close button on After Hours modal
      await page.locator('#after-hours-settings-panel .header__btn .icon--close')
        .waitFor({ state: 'visible' });
      await page.locator('#after-hours-settings-panel .header__btn .icon--close')
        .click();
    });

    // ========================================
    // STEP 16: Open Dashcam Alerts Settings
    // ========================================
    await test.step('Step 16: Navigate to Dashcam Alerts Settings', async () => {
      // Click on alerts menu
      await page.locator(config.selectors.navigation.alertsMenu)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.navigation.alertsMenu)
        .click();

      // Wait for submenu to appear
      await page.waitForTimeout(2000);

      // First open the Alerts Contacts modal (Dashcam Alerts Settings button is inside it)
      await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.alertsContact.alertsSettingsMenu)
        .click({ force: true });

      // Wait for Alerts Contacts modal to open
      await page.locator(config.selectors.alertsContact.alertContactModal)
        .waitFor({ state: 'visible' });

      // Scroll to and click on Dashcam Alerts Settings button inside the modal
      await page.locator('#bottom-nav-alerts-settings2')
        .scrollIntoViewIfNeeded();
      await page.locator('#bottom-nav-alerts-settings2')
        .click();

      // Wait for the Dashcam Alert Settings panel to be visible
      await page.locator('#dashcam-alert-settings-panel.panel--open')
        .waitFor({ state: 'visible', timeout: 15000 });
    });

    // ========================================
    // STEP 17: Verify Dashcam Alerts Settings Panel Opens
    // ========================================
    await test.step('Step 17: Verify Dashcam Alerts Settings panel is displayed', async () => {
      // Verify the Dashcam Alert Settings panel is visible (target the open panel specifically)
      await page.locator('#dashcam-alert-settings-panel.panel--open')
        .waitFor({ state: 'visible' });

      // Assert the panel is displayed
      await expect(page.locator('#dashcam-alert-settings-panel.panel--open'))
        .toBeVisible();
    });
  });
});