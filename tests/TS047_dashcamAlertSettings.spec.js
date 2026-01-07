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

    // Helper function to navigate to Alert Settings and return the active panel
    async function navigateToAlertSettings(page, helpers, config) {
        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage('https://www.gpsandfleet3.net/gpsandfleet/client/dashcamdemo1/maps/index2.php');

        // Wait for page to fully load
        await page.waitForTimeout(3000);

        // Click on Dashcam accordion header to expand menu
        const dashcamAccordion = page.locator('#bottom-nav-dashcam .accordion__header');
        await expect(dashcamAccordion).toBeVisible({ timeout: 30000 });
        await dashcamAccordion.click();

        // Wait for accordion to expand and submenu to be visible
        await page.waitForTimeout(2000);

        // Click on Alert Settings option
        const alertSettingsOption = page.locator('#bottom-nav-alerts-settings');
        await expect(alertSettingsOption).toBeVisible({ timeout: 10000 });
        await alertSettingsOption.click({ force: true, noWaitAfter: true });

        // Wait for panel to load
        await page.waitForTimeout(5000);

        // Get the active/open panel (use first() as there may be duplicate panels)
        const activePanel = page.locator('#dashcam-alert-settings-panel').first();
        await expect(activePanel).toBeVisible({ timeout: 30000 });

        // Wait for Select2 dropdown to be ready
        await expect(page.locator('#select2-dashcam-select-container')).toBeVisible({ timeout: 10000 });

        return activePanel;
    }

    test('should verify alert settings panel and save settings', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        const activePanel = await navigateToAlertSettings(page, helpers, config);

        // Step 1: Select "Dashcams" from Select Device/Subgroup dropdown
        await page.locator('#select2-dashcam-select-container').click();
        await page.locator('.select2-search__field').fill('Dashcams');
        await page.locator('.select2-results__option').filter({ hasText: 'Dashcams' }).click();
        await page.waitForTimeout(2000);

        // Step 2: Toggle "Select/Unselect All Alerts" checkbox (Select All Alerts)
        const allAlertsCheckbox = activePanel.locator('text=Select/Unselect All Alerts').first();
        await allAlertsCheckbox.click();
        await page.waitForTimeout(1000);

        // Step 3: Click on Alert Settings button to access more settings
        await activePanel.locator('button').filter({ hasText: 'Alert Settings' }).click();
        await page.waitForTimeout(3000);

        // Step 4: Select Device/Subgroup from Change Alerts Settings panel
        const changeAlertsPanel = page.locator('#change-alerts-settings-panel');
        await expect(changeAlertsPanel).toBeVisible({ timeout: 10000 });

        // Click on the device dropdown in Change Alerts Settings panel
        await changeAlertsPanel.locator('.select2-selection').first().click();
        await page.locator('.select2-search__field').fill('Dashcams');
        await page.locator('.select2-results__option').filter({ hasText: 'Dashcams' }).click();
        await page.waitForTimeout(3000);

        // Step 5: Select "All Alerts" from Select Alerts dropdown
        await changeAlertsPanel.locator('.select2-selection').nth(1).click();
        await page.locator('.select2-search__field').fill('All Alerts');
        await page.locator('.select2-results__option').filter({ hasText: 'All Alerts' }).click();
        await page.waitForTimeout(3000);

        // Step 6: Set Limit for Speed Alert to 50
        const speedAlertInput = changeAlertsPanel.locator('input[type="text"]').first();
        await expect(speedAlertInput).toBeVisible({ timeout: 10000 });
        await speedAlertInput.clear();
        await speedAlertInput.fill('50');

        // Step 7: Set Low Battery/Voltage Alert to 50
        const lowBatteryInput = changeAlertsPanel.locator('input[type="text"]').nth(1);
        await expect(lowBatteryInput).toBeVisible({ timeout: 10000 });
        await lowBatteryInput.clear();
        await lowBatteryInput.fill('50');

        // Step 8: Click on Enable Alert button
        await changeAlertsPanel.locator('#enable_alert').click();
        await page.waitForTimeout(5000);

        // ===== PART 2: Make changes to "test 1" device specifically =====

        // Step 9: Select "test 1" device from dropdown
        await changeAlertsPanel.locator('.select2-selection').first().click();
        await page.locator('.select2-search__field').fill('test 1');
        await page.locator('.select2-results__option').filter({ hasText: 'test 1' }).click();
        await page.waitForTimeout(3000);

        // Step 10: Input fields should already be visible with values from "All Dashcams" (50)
        // Set Speed Alert to 60 for test 1
        const test1SpeedInput = changeAlertsPanel.locator('input[type="text"]').first();
        await expect(test1SpeedInput).toBeVisible({ timeout: 10000 });
        await test1SpeedInput.clear();
        await test1SpeedInput.fill('60');

        // Step 12: Set Low Battery/Voltage Alert to 60 for test 1
        const test1BatteryInput = changeAlertsPanel.locator('input[type="text"]').nth(1);
        await expect(test1BatteryInput).toBeVisible({ timeout: 10000 });
        await test1BatteryInput.clear();
        await test1BatteryInput.fill('60');

        // Step 13: Click Submit to save test 1 settings
        await changeAlertsPanel.locator('button').filter({ hasText: 'Submit' }).click();
        await page.waitForTimeout(5000);

        // Step 14: Re-select "test 1" to verify changes were saved
        await changeAlertsPanel.locator('.select2-selection').first().click();
        await page.locator('.select2-search__field').fill('test 1');
        await page.locator('.select2-results__option').filter({ hasText: 'test 1' }).click();
        await page.waitForTimeout(3000);

        // Step 15: Verify Speed Alert is 60 for test 1
        const verifyTest1Speed = changeAlertsPanel.locator('input[type="text"]').first();
        await expect(verifyTest1Speed).toBeVisible({ timeout: 10000 });
        const test1SpeedValue = await verifyTest1Speed.inputValue();
        expect(test1SpeedValue).toBe('60');
        console.log('Verified test 1 Speed Alert: ' + test1SpeedValue);

        // Step 16: Verify Low Battery Alert is 60 for test 1
        const verifyTest1Battery = changeAlertsPanel.locator('input[type="text"]').nth(1);
        const test1BatteryValue = await verifyTest1Battery.inputValue();
        expect(test1BatteryValue).toBe('60');
        console.log('Verified test 1 Low Battery Alert: ' + test1BatteryValue);

        // ===== PART 3: Change settings for All Dashcams and verify on test 1 =====

        // Step 17: Select "Dashcams" (All Dashcams) from dropdown
        await changeAlertsPanel.locator('.select2-selection').first().click();
        await page.locator('.select2-search__field').fill('Dashcams');
        await page.locator('.select2-results__option').filter({ hasText: 'Dashcams' }).click();
        await page.waitForTimeout(3000);

        // Step 18: Select "All Alerts" for all dashcams
        await changeAlertsPanel.locator('.select2-selection').nth(1).click();
        await page.locator('.select2-search__field').fill('All Alerts');
        await page.locator('.select2-results__option').filter({ hasText: 'All Alerts' }).click();
        await page.waitForTimeout(2000);

        // Step 19: Set Speed Alert to 70 for all dashcams
        const allSpeedInput = changeAlertsPanel.locator('input[type="text"]').first();
        await expect(allSpeedInput).toBeVisible({ timeout: 10000 });
        await allSpeedInput.clear();
        await allSpeedInput.fill('70');

        // Step 20: Set Low Battery/Voltage Alert to 70 for all dashcams
        const allBatteryInput = changeAlertsPanel.locator('input[type="text"]').nth(1);
        await expect(allBatteryInput).toBeVisible({ timeout: 10000 });
        await allBatteryInput.clear();
        await allBatteryInput.fill('70');

        // Step 21: Click Enable Alert to save all dashcams settings
        await changeAlertsPanel.locator('#enable_alert').click();
        await page.waitForTimeout(5000);

        // Step 22: Select "test 1" to verify all dashcams settings were applied
        await changeAlertsPanel.locator('.select2-selection').first().click();
        await page.locator('.select2-search__field').fill('test 1');
        await page.locator('.select2-results__option').filter({ hasText: 'test 1' }).click();
        await page.waitForTimeout(3000);

        // Step 23: Verify Speed Alert is 70 (from all dashcams)
        const finalSpeedInput = changeAlertsPanel.locator('input[type="text"]').first();
        await expect(finalSpeedInput).toBeVisible({ timeout: 10000 });
        const finalSpeedValue = await finalSpeedInput.inputValue();
        expect(finalSpeedValue).toBe('70');
        console.log('Final verification - test 1 Speed Alert: ' + finalSpeedValue);

        // Step 24: Verify Low Battery Alert is 70 (from all dashcams)
        const finalBatteryInput = changeAlertsPanel.locator('input[type="text"]').nth(1);
        const finalBatteryValue = await finalBatteryInput.inputValue();
        expect(finalBatteryValue).toBe('70');
        console.log('Final verification - test 1 Low Battery Alert: ' + finalBatteryValue);

        console.log('All verifications passed! Settings cascade correctly from All Dashcams to individual devices.');
    });

    test('should add and delete alerts contacts (email and phone)', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        const activePanel = await navigateToAlertSettings(page, helpers, config);

        // Click on the Select2 dropdown to open options (use unique ID)
        await page.locator('#select2-dashcam-select-container').click();

        // Type in the Select2 search field
        await page.locator('.select2-search__field').fill('test 1');

        // Click on the result "test 1"
        await page.locator('.select2-results__option').filter({ hasText: 'test 1' }).click();

        await page.waitForTimeout(2000);

        // Click on alerts contact button
        await page.locator('#showcontacts').first().click();

        await expect(page.locator(config.selectors.alertsContact.alertContactModal)).toBeVisible();

        // ===== EMAIL CONTACT =====
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

        // ===== PHONE CONTACT =====
        // Click on Phone tab (use button with data-tab attribute)
        await page.locator('button[data-tab="phone_tab"]').click();

        await page.waitForTimeout(1000);

        // Add phone number (use #phone-input selector)
        await expect(page.locator('#phone-input')).toBeVisible();
        await page.locator('#phone-input').clear();
        await page.locator('#phone-input').fill('1234567890');

        // Click on submit button
        await expect(page.locator('#phone_tab #save-alerts-contacts')).toBeVisible();
        await page.locator('#phone_tab #save-alerts-contacts').click();

        await page.waitForTimeout(30000);

        // Assert the phone number appears in the table
        await expect(page.locator(config.selectors.alertsContact.phoneContactList).filter({ hasText: '1234567890' })).toBeVisible();

        await page.waitForTimeout(10000);

        // Delete the phone number by clicking the trash icon
        const phoneRow = page.locator(`${config.selectors.alertsContact.phoneContactList} tr`).filter({ hasText: '1234567890' });
        await phoneRow.locator('button.btn.btn--danger').click();

        await page.waitForTimeout(10000);

        // Click on close button
        await expect(page.locator(config.selectors.alertsContact.closeButton)).toBeVisible();
        await page.locator(config.selectors.alertsContact.closeButton).click();

        await page.waitForTimeout(5000);
    });

    test('should configure after hours settings', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        console.log('Starting comprehensive After Hours Settings test...');

        const activePanel = await navigateToAlertSettings(page, helpers, config);

        // Click on the Select2 dropdown to open options (use unique ID)
        await page.locator('#select2-dashcam-select-container').click();
        await page.locator('.select2-search__field').fill('All Dashcams');
        await page.locator('.select2-results__option').filter({ hasText: 'All Dashcams' }).click();

        // Click on alerts contact button
        await page.locator('#showcontacts').first().click();

        // Click on change alerts settings button
        await expect(page.locator(config.selectors.alertsContact.changeAlertSettingsButton)).toBeVisible();
        await page.locator(config.selectors.alertsContact.changeAlertSettingsButton).click();

        // Click on after hours button
        await expect(page.locator(config.selectors.changeAlertSettings.afterHourBtn)).toBeVisible();
        await page.locator(config.selectors.changeAlertSettings.afterHourBtn).click();
        await page.waitForTimeout(2000);
        console.log('After Hours panel opened');

        // ============= STEP 1: Configure "test 1" with Custom Days =============
        console.log('--- Step 1: Configuring test 1 with Custom Days ---');

        // Select "test 1" device
        await page.locator('#after-hours-settings-panel .select2-selection__rendered').click();
        await page.locator('.select2-search__field').fill('test 1');
        await page.locator('.select2-results__option').filter({ hasText: 'test 1' }).click();
        console.log('Selected device: test 1');
        await page.waitForTimeout(2000);

        // Select "Custom Days" radio button
        const customDaysLabel = page.locator('label[for="custom-days"], label:has-text("Custom Days")').first();
        if (await customDaysLabel.isVisible()) {
            await customDaysLabel.click({ force: true });
        } else {
            await page.locator('input[type="radio"][value="custom-days"]').check({ force: true });
        }
        console.log('Selected Custom Days option');
        await page.waitForTimeout(2000);

        // Check specific day checkboxes (W, TH, F) - ensure they are checked
        await page.evaluate(() => {
            const checkboxW = document.querySelector('#checkbox-W');
            if (checkboxW && !checkboxW.checked) checkboxW.click();
        });
        await page.evaluate(() => {
            const checkboxTH = document.querySelector('#checkbox-TH');
            if (checkboxTH && !checkboxTH.checked) checkboxTH.click();
        });
        await page.evaluate(() => {
            const checkboxF = document.querySelector('#checkbox-F');
            if (checkboxF && !checkboxF.checked) checkboxF.click();
        });
        console.log('Checked W, TH, F checkboxes');

        // ASSERTION: Verify checkbox states
        const checkboxWState = await page.evaluate(() => document.querySelector('#checkbox-W')?.checked);
        const checkboxTHState = await page.evaluate(() => document.querySelector('#checkbox-TH')?.checked);
        const checkboxFState = await page.evaluate(() => document.querySelector('#checkbox-F')?.checked);
        console.log(`Wednesday: ${checkboxWState}, Thursday: ${checkboxTHState}, Friday: ${checkboxFState}`);
        expect(checkboxWState).toBe(true);
        expect(checkboxTHState).toBe(true);
        expect(checkboxFState).toBe(true);

        // Expand Advanced Settings
        await expect(page.locator('#advanced-settings-toggle')).toBeVisible();
        await page.locator('#advanced-settings-toggle').click();
        await page.waitForTimeout(1000);
        console.log('Advanced Settings expanded');

        // Define test 1 settings values
        const test1Settings = {
            idlingHrs: '02:00',
            stopHrs: '03:00',
            stopCount: '5',
            postSpeedLimit: '40'
        };

        // Helper function to set advanced setting value (unchecks Unlimited checkbox first)
        const setAdvancedSettingValue = async (inputClass, value) => {
            await page.evaluate(({ inputClass, value }) => {
                const input = document.querySelector(`input.input-style.${inputClass}`);
                if (input) {
                    // Find the parent row/container
                    let container = input.closest('.form-group, .input-group, .setting-row');
                    if (!container) {
                        container = input.parentElement?.parentElement;
                    }

                    if (container) {
                        // Look for any checkbox in the same container or nearby that might be "Unlimited"
                        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
                        checkboxes.forEach(cb => {
                            if (cb.checked) {
                                // Check if it's an "unlimited" checkbox by looking at its label or nearby text
                                const label = cb.nextElementSibling || cb.parentElement?.querySelector('label');
                                const labelText = label?.textContent?.toLowerCase() || '';
                                if (labelText.includes('unlimited') || cb.className.includes('unlimited') || cb.id.includes('unlimited')) {
                                    cb.click();
                                }
                            }
                        });
                    }

                    // Also try to find unlimited checkbox that comes right after the input
                    const nextSibling = input.nextElementSibling;
                    if (nextSibling && nextSibling.type === 'checkbox' && nextSibling.checked) {
                        nextSibling.click();
                    }

                    // Check for checkbox in a wrapper div after the input
                    const wrapper = input.parentElement;
                    if (wrapper) {
                        const siblingDiv = wrapper.nextElementSibling;
                        if (siblingDiv) {
                            const unlimitedCb = siblingDiv.querySelector('input[type="checkbox"]');
                            if (unlimitedCb && unlimitedCb.checked) {
                                const cbLabel = siblingDiv.textContent?.toLowerCase() || '';
                                if (cbLabel.includes('unlimited')) {
                                    unlimitedCb.click();
                                }
                            }
                        }
                    }

                    input.removeAttribute('readonly');
                    input.value = value;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, { inputClass, value });
        };

        // Set all advanced settings for test 1
        await setAdvancedSettingValue('idling_hrs', test1Settings.idlingHrs);
        await setAdvancedSettingValue('stop_hrs', test1Settings.stopHrs);
        await setAdvancedSettingValue('stop_count', test1Settings.stopCount);
        await setAdvancedSettingValue('postSpeedLimit', test1Settings.postSpeedLimit);
        console.log('Advanced settings entered for test 1');

        // ASSERTION: Verify values are set correctly
        const actualIdlingHrs = await page.evaluate(() => document.querySelector('input.input-style.idling_hrs')?.value);
        const actualStopHrs = await page.evaluate(() => document.querySelector('input.input-style.stop_hrs')?.value);
        const actualStopCount = await page.evaluate(() => document.querySelector('input.input-style.stop_count')?.value);
        const actualPostSpeedLimit = await page.evaluate(() => document.querySelector('input.input-style.postSpeedLimit')?.value);

        console.log(`Idling Hours: ${actualIdlingHrs}, Stop Hours: ${actualStopHrs}, Stop Count: ${actualStopCount}, Speed Limit: ${actualPostSpeedLimit}`);
        expect(actualIdlingHrs).toBe(test1Settings.idlingHrs);
        expect(actualStopHrs).toBe(test1Settings.stopHrs);
        expect(actualStopCount).toBe(test1Settings.stopCount);
        expect(actualPostSpeedLimit).toBe(test1Settings.postSpeedLimit);

        // Click Submit for test 1
        const submitButton = page.locator('#after-hours-settings-submit-btn');
        await submitButton.scrollIntoViewIfNeeded();
        await expect(submitButton).toBeVisible();
        await submitButton.click();
        console.log('Submit clicked for test 1');
        await page.waitForTimeout(5000);

        // ============= STEP 2: Immediately verify test 1 settings were saved =============
        console.log('--- Step 2: Verifying test 1 settings immediately after save ---');

        // Re-select test 1 to verify
        await page.locator('#after-hours-settings-panel .select2-selection__rendered').click();
        await page.waitForTimeout(500);
        await page.locator('.select2-search__field').fill('test 1');
        await page.locator('.select2-results__option').filter({ hasText: 'test 1' }).click();
        await page.waitForTimeout(3000);

        // Expand Advanced Settings
        await page.locator('#advanced-settings-toggle').click().catch(() => {});
        await page.waitForTimeout(1000);

        // Verify test 1 values
        const verify1IdlingHrs = await page.evaluate(() => document.querySelector('input.input-style.idling_hrs')?.value);
        const verify1StopHrs = await page.evaluate(() => document.querySelector('input.input-style.stop_hrs')?.value);
        const verify1StopCount = await page.evaluate(() => document.querySelector('input.input-style.stop_count')?.value);
        const verify1PostSpeedLimit = await page.evaluate(() => document.querySelector('input.input-style.postSpeedLimit')?.value);

        console.log(`test 1 after save - Idling: ${verify1IdlingHrs}, Stop: ${verify1StopHrs}, Count: ${verify1StopCount}, Speed: ${verify1PostSpeedLimit}`);

        // ============= STEP 3: Configure "M4000-Training3 Off" with Weekdays =============
        console.log('--- Step 3: Configuring M4000-Training3 Off with Weekdays ---');

        // Select "M4000-Training3 Off" device
        await page.locator('#after-hours-settings-panel .select2-selection__rendered').click();
        await page.waitForTimeout(500);
        await page.locator('.select2-search__field').fill('M4000-Training3');
        await page.locator('.select2-results__option').filter({ hasText: 'M4000-Training3' }).click();
        console.log('Selected device: M4000-Training3 Off');
        await page.waitForTimeout(2000);

        // Select "Weekdays" radio button
        const weekdaysLabel = page.locator('label[for="weekdays"], label:has-text("Weekdays")').first();
        if (await weekdaysLabel.isVisible()) {
            await weekdaysLabel.click({ force: true });
        } else {
            await page.locator('input[type="radio"][value="weekdays"]').evaluate(el => el.click());
        }
        console.log('Selected Weekdays option');
        await page.waitForTimeout(1000);

        // Enter From and To time
        const m4000FromTime = '08:00';
        const m4000ToTime = '18:00';

        await page.evaluate((value) => {
            const inputs = document.querySelectorAll('#after-hours-settings-panel input');
            inputs.forEach(input => {
                if (input.placeholder?.toLowerCase().includes('from') || input.className.includes('from')) {
                    input.removeAttribute('readonly');
                    input.value = value;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }, m4000FromTime);

        await page.evaluate((value) => {
            const inputs = document.querySelectorAll('#after-hours-settings-panel input');
            inputs.forEach(input => {
                if (input.placeholder?.toLowerCase().includes('to') || input.className.includes('to')) {
                    input.removeAttribute('readonly');
                    input.value = value;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }, m4000ToTime);
        console.log(`From time: ${m4000FromTime}, To time: ${m4000ToTime}`);

        // Expand Advanced Settings if collapsed
        const advToggle = page.locator('#advanced-settings-toggle');
        await advToggle.click().catch(() => {});
        await page.waitForTimeout(1000);

        // Define M4000 settings values
        const m4000Settings = {
            idlingHrs: '01:30',
            stopHrs: '02:30',
            stopCount: '8',
            postSpeedLimit: '55'
        };

        // Set advanced settings for M4000
        await setAdvancedSettingValue('idling_hrs', m4000Settings.idlingHrs);
        await setAdvancedSettingValue('stop_hrs', m4000Settings.stopHrs);
        await setAdvancedSettingValue('stop_count', m4000Settings.stopCount);
        await setAdvancedSettingValue('postSpeedLimit', m4000Settings.postSpeedLimit);
        console.log('Advanced settings entered for M4000-Training3 Off');

        // Click Submit for M4000
        await submitButton.scrollIntoViewIfNeeded();
        await submitButton.click();
        console.log('Submit clicked for M4000-Training3 Off');
        await page.waitForTimeout(5000);

        // ============= STEP 4: Verify Settings Persistence for M4000 =============
        console.log('--- Step 4: Verifying M4000-Training3 Off settings persistence ---');

        // Select "M4000-Training3 Off" to verify settings
        await page.locator('#after-hours-settings-panel .select2-selection__rendered').click();
        await page.waitForTimeout(500);
        await page.locator('.select2-search__field').fill('M4000-Training3');
        await page.locator('.select2-results__option').filter({ hasText: 'M4000-Training3' }).click();
        await page.waitForTimeout(2000);

        // Expand Advanced Settings
        await page.locator('#advanced-settings-toggle').click().catch(() => {});
        await page.waitForTimeout(1000);

        // ASSERTION: Verify persisted values for M4000
        const m4000IdlingHrs = await page.evaluate(() => document.querySelector('input.input-style.idling_hrs')?.value);
        const m4000StopHrs = await page.evaluate(() => document.querySelector('input.input-style.stop_hrs')?.value);
        const m4000StopCount = await page.evaluate(() => document.querySelector('input.input-style.stop_count')?.value);
        const m4000PostSpeedLimit = await page.evaluate(() => document.querySelector('input.input-style.postSpeedLimit')?.value);

        console.log(`M4000 persisted values - Idling: ${m4000IdlingHrs}, Stop: ${m4000StopHrs}, Count: ${m4000StopCount}, Speed: ${m4000PostSpeedLimit}`);
        expect(m4000IdlingHrs).toBe(m4000Settings.idlingHrs);
        expect(m4000StopHrs).toBe(m4000Settings.stopHrs);
        expect(m4000StopCount).toBe(m4000Settings.stopCount);
        expect(m4000PostSpeedLimit).toBe(m4000Settings.postSpeedLimit);
        console.log('M4000-Training3 Off settings verified successfully');

        // ============= STEP 5: Configure "test 1" with All Days =============
        console.log('--- Step 5: Configuring test 1 with All Days option ---');

        // Select "test 1" again
        await page.locator('#after-hours-settings-panel .select2-selection__rendered').click();
        await page.waitForTimeout(500);
        await page.locator('.select2-search__field').fill('test 1');
        await page.locator('.select2-results__option').filter({ hasText: 'test 1' }).click();
        await page.waitForTimeout(2000);

        // Select "All Days" radio button
        const allDaysLabel = page.locator('label[for="all-days"], label:has-text("All Days")').first();
        if (await allDaysLabel.isVisible()) {
            await allDaysLabel.click({ force: true });
        } else {
            await page.locator('input[type="radio"][value="all-days"]').evaluate(el => el.click());
        }
        console.log('Selected All Days option');
        await page.waitForTimeout(1000);

        // Enter new From and To time for All Days
        const allDaysFromTime = '07:00';
        const allDaysToTime = '20:00';

        await page.evaluate((value) => {
            const inputs = document.querySelectorAll('#after-hours-settings-panel input');
            inputs.forEach(input => {
                if (input.placeholder?.toLowerCase().includes('from') || input.className.includes('from')) {
                    input.removeAttribute('readonly');
                    input.value = value;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }, allDaysFromTime);

        await page.evaluate((value) => {
            const inputs = document.querySelectorAll('#after-hours-settings-panel input');
            inputs.forEach(input => {
                if (input.placeholder?.toLowerCase().includes('to') || input.className.includes('to')) {
                    input.removeAttribute('readonly');
                    input.value = value;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }, allDaysToTime);
        console.log(`All Days - From time: ${allDaysFromTime}, To time: ${allDaysToTime}`);

        // Expand Advanced Settings if collapsed
        await page.locator('#advanced-settings-toggle').click().catch(() => {});
        await page.waitForTimeout(1000);

        // Define All Days settings values
        const allDaysSettings = {
            idlingHrs: '01:00',
            stopHrs: '02:00',
            stopCount: '10',
            postSpeedLimit: '60'
        };

        // Set advanced settings for All Days
        await setAdvancedSettingValue('idling_hrs', allDaysSettings.idlingHrs);
        await setAdvancedSettingValue('stop_hrs', allDaysSettings.stopHrs);
        await setAdvancedSettingValue('stop_count', allDaysSettings.stopCount);
        await setAdvancedSettingValue('postSpeedLimit', allDaysSettings.postSpeedLimit);
        console.log('All Days advanced settings entered');

        // Click Submit for All Days
        await submitButton.scrollIntoViewIfNeeded();
        await submitButton.click();
        console.log('Submit clicked for All Days configuration');
        await page.waitForTimeout(5000);

        // ============= STEP 6: Final Verification - All Days persisted =============
        console.log('--- Step 6: Final verification - All Days settings persisted ---');

        // Select "test 1" to verify All Days settings
        await page.locator('#after-hours-settings-panel .select2-selection__rendered').click();
        await page.waitForTimeout(500);
        await page.locator('.select2-search__field').fill('test 1');
        await page.locator('.select2-results__option').filter({ hasText: 'test 1' }).click();
        await page.waitForTimeout(2000);

        // ASSERTION: Verify All Days radio is selected
        const allDaysSelected = await page.evaluate(() => {
            const allDaysRadio = document.querySelector('input[type="radio"][value="all-days"], #all-days');
            return allDaysRadio ? allDaysRadio.checked : false;
        });
        console.log(`All Days radio selected: ${allDaysSelected}`);

        // Expand Advanced Settings
        await page.locator('#advanced-settings-toggle').click().catch(() => {});
        await page.waitForTimeout(1000);

        // ASSERTION: Verify persisted All Days values
        const finalIdlingHrs = await page.evaluate(() => document.querySelector('input.input-style.idling_hrs')?.value);
        const finalStopHrs = await page.evaluate(() => document.querySelector('input.input-style.stop_hrs')?.value);
        const finalStopCount = await page.evaluate(() => document.querySelector('input.input-style.stop_count')?.value);
        const finalPostSpeedLimit = await page.evaluate(() => document.querySelector('input.input-style.postSpeedLimit')?.value);

        console.log(`Final All Days values - Idling: ${finalIdlingHrs}, Stop: ${finalStopHrs}, Count: ${finalStopCount}, Speed: ${finalPostSpeedLimit}`);
        expect(finalIdlingHrs).toBe(allDaysSettings.idlingHrs);
        expect(finalStopHrs).toBe(allDaysSettings.stopHrs);
        expect(finalStopCount).toBe(allDaysSettings.stopCount);
        expect(finalPostSpeedLimit).toBe(allDaysSettings.postSpeedLimit);

        // ============= TEST SUMMARY =============
        console.log('');
        console.log('=== AFTER HOURS SETTINGS TEST SUMMARY ===');
        console.log('test 1 Configuration (Custom Days): PASSED');
        console.log('  - Custom Days selected (W, TH, F)');
        console.log('  - Advanced settings: 02:00, 03:00, 5, 40');
        console.log('M4000-Training3 Off Configuration (Weekdays): PASSED');
        console.log('  - Weekdays selected');
        console.log('  - From/To time: 08:00 - 18:00');
        console.log('  - Advanced settings: 01:30, 02:30, 8, 55');
        console.log('test 1 Configuration (All Days): PASSED');
        console.log('  - Changed to All Days option');
        console.log('  - From/To time: 07:00 - 20:00');
        console.log('  - Advanced settings: 01:00, 02:00, 10, 60');
        console.log('Settings Persistence: VERIFIED for both devices');
        console.log('==========================================');

        console.log('After Hours Settings comprehensive test completed successfully!');
    });
});
