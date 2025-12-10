const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Dashcam Alert Settings', () => {
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

    test('edit settings for dashcam', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashcamDashboard2);

        // Click on Dashcam accordion header to expand menu
        const dashcamAccordion = page.locator('#bottom-nav-dashcam .accordion__header');
        await expect(dashcamAccordion).toBeVisible();
        await dashcamAccordion.click();

        // Wait for accordion to expand
        await page.waitForTimeout(1000);

        // Click on Alert Settings option
        const alertSettingsOption = page.locator('#bottom-nav-alerts-settings');
        await expect(alertSettingsOption).toBeVisible();
        await alertSettingsOption.click({ force: true });

        await page.waitForTimeout(5000);

        // Verify container is visible
        await expect(page.locator(config.selectors.dashcam.alertSettingsContainer)).toBeVisible();

        // Click on the Select2 dropdown to open options
        await page.locator('#dashcam-alert-settings-panel .select2-selection__rendered').click();

        // Type in the Select2 search field
        await page.locator('.select2-search__field').fill('jc261 test2');

        // Click on the result "jc261 test2"
        await page.locator('.select2-results__option').filter({ hasText: 'jc261 test2' }).click();

        // Toggle the "Select/Unselect All Alerts" checkbox
        const allAlertsCheckbox = page.locator('#dashcam-alert-settings-panel #select-all-alerts').first();
        const isChecked = await allAlertsCheckbox.isChecked();
        if (isChecked) {
            await allAlertsCheckbox.uncheck({ force: true });
        } else {
            await allAlertsCheckbox.check({ force: true });
        }

        // Type 70 in the "Limit For Speed Alert" input box
        await page.locator(config.selectors.dashcam.speedLimit).clear();
        await page.locator(config.selectors.dashcam.speedLimit).fill('70');

        // Click volume button
        await page.locator(config.selectors.dashcam.volume).click();

        // Click on save
        await page.locator(config.selectors.dashcam.saveSettings).click();

        await page.waitForTimeout(10000);

        // Click on alerts contact button
        await page.locator(config.selectors.dashcam.alertsContactButton).click();

        await expect(page.locator(config.selectors.alertsContact.alertContactModal)).toBeVisible();

        // Add email
        await expect(page.locator(config.selectors.alertsContact.emailInput)).toBeVisible();
        await page.locator(config.selectors.alertsContact.emailInput).clear();
        await page.locator(config.selectors.alertsContact.emailInput).fill('dashcamTest@gmail.com');

        // Click on submit button
        await expect(page.locator('#email_tab #save-alerts-contacts')).toBeVisible();
        await page.locator('#email_tab #save-alerts-contacts').click();

        await page.waitForTimeout(30000);

        // Assert the email appears in the table
        await expect(page.locator(config.selectors.alertsContact.emailContactList).filter({ hasText: 'dashcamTest@gmail.com' })).toBeVisible();

        await page.waitForTimeout(10000);

        // Delete the email "dashcamTest@gmail.com" by clicking the trash icon
        const emailRow = page.locator(`${config.selectors.alertsContact.emailContactList} tr`).filter({ hasText: 'dashcamTest@gmail.com' });
        await emailRow.locator('button.btn.btn--danger').click();

        await page.waitForTimeout(10000);

        // Click on close button
        await expect(page.locator(config.selectors.alertsContact.closeButton)).toBeVisible();
        await page.locator(config.selectors.alertsContact.closeButton).click();

        await page.waitForTimeout(10000);

        // Click on the Change Alerts Settings button and make changes

        // Click on Dashcam accordion header to expand menu
        const dashcamAccordion2 = page.locator('#bottom-nav-dashcam .accordion__header');
        await expect(dashcamAccordion2).toBeVisible();
        await dashcamAccordion2.click();

        // Wait for accordion to expand
        await page.waitForTimeout(1000);

        // Click on Alert Settings option
        const alertSettingsOption2 = page.locator('#bottom-nav-alerts-settings');
        await expect(alertSettingsOption2).toBeVisible();
        await alertSettingsOption2.click({ force: true });

        await page.waitForTimeout(config.timeouts.wait);

        // Verify container is visible
        await expect(page.locator(config.selectors.dashcam.alertSettingsContainer)).toBeVisible();

        // Click on the Select2 dropdown to open options
        await page.locator('#dashcam-alert-settings-panel .select2-selection__rendered').click();

        // Type in the Select2 search field
        await page.locator('.select2-search__field').fill('All Dashcams');

        // Click on the result All Dashcams
        await page.locator('.select2-results__option').filter({ hasText: 'All Dashcams' }).click();

        // Click on alerts contact button
        await page.locator(config.selectors.dashcam.alertsContactButton).click();

        // Click on change alerts settings button
        await expect(page.locator(config.selectors.alertsContact.changeAlertSettingsButton)).toBeVisible();
        await page.locator(config.selectors.alertsContact.changeAlertSettingsButton).click();

        // Click on after hours button
        await expect(page.locator(config.selectors.changeAlertSettings.afterHourBtn)).toBeVisible();
        await page.locator(config.selectors.changeAlertSettings.afterHourBtn).click();

        // Click on the Select2 dropdown to open options
        await page.locator('#after-hours-settings-panel .select2-selection__rendered').click();

        // Type in the Select2 search field
        await page.locator('.select2-search__field').fill('jc261 test2');

        // Click on the result "jc261 test2"
        await page.locator('.select2-results__option').filter({ hasText: 'jc261 test2' }).click();

        // Select the "Weekdays" radio button for Working Hours
        await page.locator('input[type="radio"][value="custom-days"]').check({ force: true });

        await page.waitForTimeout(2000);

        // Toggle Wednesday checkbox
        const wednesdayCheckbox = page.locator('#checkbox-W');
        const isWedChecked = await wednesdayCheckbox.isChecked();
        if (isWedChecked) {
            await wednesdayCheckbox.uncheck({ force: true });
        } else {
            await wednesdayCheckbox.check({ force: true });
        }

        // Toggle Thursday checkbox
        const thursdayCheckbox = page.locator('#checkbox-TH');
        const isThurChecked = await thursdayCheckbox.isChecked();
        if (isThurChecked) {
            await thursdayCheckbox.uncheck({ force: true });
        } else {
            await thursdayCheckbox.check({ force: true });
        }

        // Toggle Friday checkbox
        const fridayCheckbox = page.locator('#checkbox-F');
        const isFriChecked = await fridayCheckbox.isChecked();
        if (isFriChecked) {
            await fridayCheckbox.uncheck({ force: true });
        } else {
            await fridayCheckbox.check({ force: true });
        }

        // Click on advanced settings
        await expect(page.locator('#advanced-settings-toggle')).toBeVisible();
        await page.locator('#advanced-settings-toggle').click();

        // Type in the "idling-hrs" input
        await page.locator('input.input-style.idling_hrs').clear();
        await page.locator('input.input-style.idling_hrs').fill('02:00', { force: true });

        // Type on "post-speed-limit" input
        await page.locator('input.input-style.postSpeedLimit').clear();
        await page.locator('input.input-style.postSpeedLimit').fill('40', { force: true });

        // Click on submit button
        const submitButton = page.locator('#after-hours-settings-submit-btn');
        await submitButton.scrollIntoViewIfNeeded();
        await expect(submitButton).toBeVisible();
        await submitButton.click();

        await page.waitForTimeout(5000);
    });
});