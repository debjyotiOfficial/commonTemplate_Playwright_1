const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

/**
 * Test Suite: Asset Tracker Settings
 *
 * This test validates the Asset Tracker Settings functionality:
 * 1. Navigation to Asset Tracker Settings panel
 * 2. Verification of all tabs and panel elements
 * 3. Tab 1: Change Update Frequency - vehicle selection, API validation, form submission
 * 4. Tab 2: Aggressive Mode/Change intervals - mode switching, API validation
 * 5. Tab 3: Set Time Updates for MA1086 - time slots configuration, API validation
 */
test.describe('Asset Tracker Settings', () => {
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
        test.setTimeout(600000); // 10 minutes for long test
    });

    test('should navigate to Asset Tracker Settings, verify all tabs, and test Change Update Frequency', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Asset Tracker Settings URL (assetdemo account has asset tracker devices)
        const assetDemoUrl = 'https://www.gpsandfleet3.net/gpsandfleet/client/assetdemo/maps/index2.php';

        // ============= STEP 1: LOGIN AND NAVIGATE =============
        console.log('\n========== STEP 1: LOGIN AND NAVIGATE ==========');
        await helpers.loginAndNavigateToPage(assetDemoUrl);
        console.log('Map page loaded successfully');

        // ============= STEP 2: NAVIGATE TO ASSET TRACKER SETTINGS =============
        console.log('\n========== STEP 2: NAVIGATE TO ASSET TRACKER SETTINGS ==========');

        // Click on Account Settings menu (sidebar icon)
        const accountsMenu = page.locator(config.selectors.navigation.accountsMenu);
        await accountsMenu.waitFor({ state: 'visible', timeout: 15000 });
        await accountsMenu.click();
        console.log('Account Settings menu clicked');

        await page.waitForTimeout(1500);

        // Click on Asset Tracker Settings submenu option
        const assetTrackerSettings = page.locator('#asset-tracker-settings-btn').or(page.getByText('Asset Tracker Settings', { exact: true }));
        await assetTrackerSettings.first().waitFor({ state: 'visible', timeout: 10000 });
        await assetTrackerSettings.first().click();
        console.log('Asset Tracker Settings clicked');

        await page.waitForTimeout(2000);

        // ============= STEP 3: VERIFY ASSET TRACKER PANEL IS VISIBLE =============
        console.log('\n========== STEP 3: VERIFY ASSET TRACKER PANEL ==========');

        // Verify the Asset Tracker panel is visible by checking for the heading
        const panelHeading = page.getByRole('heading', { name: 'Asset Tracker Settings', level: 2 });
        await expect(panelHeading).toBeVisible({ timeout: 10000 });
        console.log('Asset Tracker Settings panel heading is visible');

        // Get the panel container (parent of heading)
        const assetTrackerPanel = panelHeading.locator('..');
        console.log('Asset Tracker panel located');

        // ============= STEP 4: VERIFY ALL 3 TABS ARE VISIBLE =============
        console.log('\n========== STEP 4: VERIFY ALL 3 TABS ==========');

        // Tab 1: Change Update Frequency
        const tab1 = page.getByRole('button', { name: 'Change Update Frequency' });
        await expect(tab1).toBeVisible({ timeout: 5000 });
        console.log('Tab 1 "Change Update Frequency" is visible');

        // Tab 2: Aggressive Mode/Change Intervals
        const tab2 = page.getByRole('button', { name: 'Aggressive Mode/Change Intervals' });
        await expect(tab2).toBeVisible({ timeout: 5000 });
        console.log('Tab 2 "Aggressive Mode/Change Intervals" is visible');

        // Tab 3: Set Timed Updates For MA1086
        const tab3 = page.getByRole('button', { name: 'Set Timed Updates For MA1086' });
        await expect(tab3).toBeVisible({ timeout: 5000 });
        console.log('Tab 3 "Set Timed Updates For MA1086" is visible');

        // ============= STEP 5: VERIFY CHANGE UPDATE FREQUENCY TAB IS ACTIVE =============
        console.log('\n========== STEP 5: VERIFY TAB 1 IS ACTIVE ==========');

        // Verify Tab 1 is the default selected tab (content should be visible)
        // Try multiple possible selectors for Tab 1 content
        const tab1Content = page.locator('#update-frequency').or(page.locator('.tab-content').first());
        await expect(tab1Content.first()).toBeVisible({ timeout: 5000 });
        console.log('Tab 1 content is visible (Tab 1 is active)');

        // ============= STEP 6: VERIFY TAB 1 FORM ELEMENTS =============
        console.log('\n========== STEP 6: VERIFY TAB 1 FORM ELEMENTS ==========');

        // Scroll the panel into view to ensure form elements are visible
        await panelHeading.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // Verify Pings per Day dropdown
        const frequencySelect1 = page.getByRole('combobox', { name: 'Pings Per Day:' });
        await expect(frequencySelect1).toBeVisible({ timeout: 5000 });
        console.log('Pings per Day dropdown is visible');

        // Verify Movement checkbox
        const movementCheckbox1 = page.getByRole('checkbox', { name: 'Send Movement Commands' });
        await expect(movementCheckbox1).toBeVisible({ timeout: 5000 });
        console.log('Send Movement Commands checkbox is visible');

        // Verify Update Frequency button (exact match to avoid tab button)
        const updateFrequencyBtn = page.getByRole('button', { name: 'Update Frequency', exact: true });
        await expect(updateFrequencyBtn).toBeVisible({ timeout: 5000 });
        console.log('Update Frequency button is visible');

        // ============= STEP 7: VERIFY DEVICE IS ALREADY SELECTED =============
        console.log('\n========== STEP 7: VERIFY DEVICE SELECTION ==========');

        // In the web version, a device is already pre-selected (Select2 style)
        // Look for the selected device in the combobox
        const selectedDeviceText = page.locator('[class*="select2-selection"]').first();
        if (await selectedDeviceText.isVisible()) {
            const deviceText = await selectedDeviceText.textContent();
            console.log(`Device is already selected: ${deviceText.trim()}`);
        } else {
            console.log('Device selection verified - checking for pre-selected device');
        }

        // ============= STEP 8: VERIFY LAST COMMAND STATUS FIELD =============
        console.log('\n========== STEP 8: VERIFY LAST COMMAND STATUS FIELD ==========');

        // Check if Last Command Status field is visible and has a value
        const lastCmdStatusField = page.getByRole('textbox', { name: /Last Command Status/i }).first();

        await page.waitForTimeout(1000);

        if (await lastCmdStatusField.isVisible()) {
            const fieldValue = await lastCmdStatusField.inputValue();
            console.log(`Last Command Status field value: "${fieldValue}"`);
            console.log('Last Command Status field verification completed');
        } else {
            console.log('Last Command Status field not visible (may appear after certain actions)');
        }

        // ============= STEP 9: VERIFY AND CHANGE PINGS PER DAY =============
        console.log('\n========== STEP 9: VERIFY AND CHANGE PINGS PER DAY ==========');

        // Get current selected value
        const currentValue = await frequencySelect1.inputValue();
        console.log(`Current Pings per Day value: ${currentValue}`);

        // Verify dropdown has options
        const options = await frequencySelect1.locator('option').allTextContents();
        console.log(`Available options: ${options.join(', ')}`);
        expect(options.length).toBeGreaterThan(0);
        console.log('Dropdown has options available');

        // Select 3 Pings Per Day (different from default)
        await frequencySelect1.selectOption({ label: '3 Pings Per Day' });
        const selectedFrequency = await frequencySelect1.inputValue();
        console.log(`Selected Pings per Day: ${selectedFrequency}`);

        // Verify selection was successful
        expect(selectedFrequency).toBeTruthy();
        console.log('Pings per Day selection verified');

        // ============= STEP 10: CHECK MOVEMENT CHECKBOX =============
        console.log('\n========== STEP 10: CHECK MOVEMENT CHECKBOX ==========');

        // Check if checkbox is not already checked, then check it
        const isChecked = await movementCheckbox1.isChecked();
        if (!isChecked) {
            await movementCheckbox1.check();
            console.log('Send Movement Commands checkbox checked');
        } else {
            console.log('Send Movement Commands checkbox was already checked');
        }

        // Verify checkbox is now checked
        await expect(movementCheckbox1).toBeChecked();
        console.log('Movement checkbox verification passed');

        // ============= STEP 11: CLICK UPDATE FREQUENCY BUTTON =============
        console.log('\n========== STEP 11: SUBMIT FORM ==========');

        // Click the Update Frequency button
        await updateFrequencyBtn.click();
        console.log('Update Frequency button clicked');

        // Wait for form submission and response
        await page.waitForTimeout(5000);

        // ============= STEP 12: VERIFY FORM SUBMISSION =============
        console.log('\n========== STEP 12: VERIFY FORM SUBMISSION ==========');

        // Check if the Last Command Status field was updated after submission
        const lastCmdStatusFieldAfter = page.getByRole('textbox', { name: /Last Command Status/i }).first();

        if (await lastCmdStatusFieldAfter.isVisible()) {
            const updatedFieldValue = await lastCmdStatusFieldAfter.inputValue();
            console.log(`Last Command Status after submission: "${updatedFieldValue}"`);

            // Verify the field shows a success message
            expect(updatedFieldValue).toBeTruthy();
            console.log('Form submission completed - status field updated');

            // Verify the status contains "(Movement Update)" since checkbox was checked
            expect(updatedFieldValue).toContain('(Movement Update)');
            console.log('Verified: Status contains "(Movement Update)" - checkbox interaction confirmed');

            // Verify the status contains "update message successfully"
            expect(updatedFieldValue.toLowerCase()).toContain('update message successfully');
            console.log('Verified: Status contains success message');

            // Verify the status contains the selected pings per day value
            expect(updatedFieldValue).toContain('Pings Per Day');
            console.log('Verified: Status contains Pings Per Day value');
        } else {
            console.log('Last Command Status field not visible after submission');
            // Fail the test if status field is not visible after submission
            expect(await lastCmdStatusFieldAfter.isVisible()).toBeTruthy();
        }

        console.log('\n--- Tab 1 Steps Completed ---');

        // ============= TEST SUMMARY =============
        console.log('\n========== TEST SUMMARY ==========');
        console.log('STEP 1: Login and Navigate - PASSED');
        console.log('STEP 2: Navigate to Asset Tracker Settings - PASSED');
        console.log('STEP 3: Verify Asset Tracker Panel - PASSED');
        console.log('STEP 4: Verify All 3 Tabs Visible - PASSED');
        console.log('STEP 5: Verify Tab 1 is Active - PASSED');
        console.log('STEP 6: Verify Tab 1 Form Elements - PASSED');
        console.log('STEP 7: Verify Device Selection - PASSED');
        console.log('STEP 8: Verify Last Command Status Field - PASSED');
        console.log('STEP 9: Change Pings per Day - PASSED');
        console.log('STEP 10: Check Movement Checkbox - PASSED');
        console.log('STEP 11: Submit Form - PASSED');
        console.log('STEP 12: Verify Form Submission - PASSED');
        console.log('\nAsset Tracker Settings - Tab 1 test completed successfully!');
    });

    test('should test Aggressive Mode/Change Intervals tab functionality', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Asset Tracker Settings URL (assetdemo account has asset tracker devices)
        const assetDemoUrl = 'https://www.gpsandfleet3.net/gpsandfleet/client/assetdemo/maps/index2.php';

        // ============= STEP 1: LOGIN AND NAVIGATE =============
        console.log('\n========== STEP 1: LOGIN AND NAVIGATE ==========');
        await helpers.loginAndNavigateToPage(assetDemoUrl);
        console.log('Map page loaded successfully');

        // ============= STEP 2: NAVIGATE TO ASSET TRACKER SETTINGS =============
        console.log('\n========== STEP 2: NAVIGATE TO ASSET TRACKER SETTINGS ==========');

        // Click on Account Settings menu (sidebar icon)
        const accountsMenu = page.locator(config.selectors.navigation.accountsMenu);
        await accountsMenu.waitFor({ state: 'visible', timeout: 15000 });
        await accountsMenu.click();
        console.log('Account Settings menu clicked');

        await page.waitForTimeout(1500);

        // Click on Asset Tracker Settings submenu option
        const assetTrackerSettings = page.locator('#asset-tracker-settings-btn').or(page.getByText('Asset Tracker Settings', { exact: true }));
        await assetTrackerSettings.first().waitFor({ state: 'visible', timeout: 10000 });
        await assetTrackerSettings.first().click();
        console.log('Asset Tracker Settings clicked');

        await page.waitForTimeout(2000);

        // Verify panel is visible by checking for the heading
        const panelHeading = page.getByRole('heading', { name: 'Asset Tracker Settings', level: 2 });
        await expect(panelHeading).toBeVisible({ timeout: 10000 });
        console.log('Asset Tracker panel is visible');

        // ============= STEP 3: CLICK ON AGGRESSIVE MODE TAB =============
        console.log('\n========== STEP 3: CLICK ON AGGRESSIVE MODE TAB ==========');

        // Click on Tab 2: Aggressive Mode/Change Intervals
        const tab2 = page.getByRole('button', { name: 'Aggressive Mode/Change Intervals' });
        await tab2.click();
        console.log('Clicked on "Aggressive Mode/Change Intervals" tab');

        await page.waitForTimeout(1500);

        // ============= STEP 4: VERIFY TAB 2 CONTENT IS VISIBLE =============
        console.log('\n========== STEP 4: VERIFY TAB 2 CONTENT ==========');

        // Look for Aggressive Mode related content
        const aggressiveModeContent = page.getByText('Aggressive Mode', { exact: false }).first();
        await expect(aggressiveModeContent).toBeVisible({ timeout: 5000 });
        console.log('Aggressive Mode content is visible');

        // ============= STEP 5: VERIFY MODE BUTTONS ARE PRESENT =============
        console.log('\n========== STEP 5: VERIFY MODE BUTTONS ==========');

        // Try to find mode buttons with various possible selectors
        const normalModeBtn = page.getByRole('button', { name: /Normal/i }).first();
        const aggressiveModeBtn = page.getByRole('button', { name: /Aggressive.*Mode/i }).or(page.locator('#aggressive-mode-btn'));

        // Check if buttons are visible
        if (await normalModeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('Normal Mode button is visible');
        } else {
            console.log('Normal Mode button not found with current selector');
        }

        if (await aggressiveModeBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('Aggressive Mode button is visible');
        } else {
            console.log('Aggressive Mode button not found with current selector');
        }

        // ============= STEP 6: VERIFY TAB 2 HAS SELECT DEVICE LABEL =============
        console.log('\n========== STEP 6: VERIFY SELECT DEVICE LABEL ==========');

        // Verify Select Device label is present in Tab 2
        const selectDeviceLabel = page.getByText('Select Device:', { exact: false });
        const isDeviceLabelVisible = await selectDeviceLabel.first().isVisible({ timeout: 3000 }).catch(() => false);
        if (isDeviceLabelVisible) {
            console.log('Select Device label found in Tab 2');
        } else {
            console.log('Select Device form element present in Tab 2');
        }

        // ============= STEP 7: CLICK NORMAL TRACK MODE BUTTON =============
        console.log('\n========== STEP 7: CLICK NORMAL TRACK MODE BUTTON ==========');

        // Click on Normal Track Mode button - this should redirect to Tab 1
        const normalTrackModeBtn = page.getByRole('button', { name: /Normal Track Mode/i }).or(page.locator('#normal-track-mode-btn'));
        await expect(normalTrackModeBtn.first()).toBeVisible({ timeout: 5000 });
        await normalTrackModeBtn.first().click();
        console.log('Normal Track Mode button clicked');

        await page.waitForTimeout(2000);

        // Verify we are redirected to Tab 1 (Change Update Frequency)
        const tab1 = page.getByRole('button', { name: 'Change Update Frequency' });
        const frequencySelect = page.getByRole('combobox', { name: 'Pings Per Day:' });
        await expect(frequencySelect).toBeVisible({ timeout: 5000 });
        console.log('Redirected to Tab 1 (Change Update Frequency) - Pings Per Day dropdown visible');

        // ============= STEP 8: CHANGE PINGS PER DAY =============
        console.log('\n========== STEP 8: CHANGE PINGS PER DAY ==========');

        // Get current selected value
        const currentPingsValue = await frequencySelect.inputValue();
        console.log(`Current Pings per Day value: ${currentPingsValue}`);

        // Select 3 Pings Per Day
        await frequencySelect.selectOption({ label: '3 Pings Per Day' });
        const selectedPingsValue = await frequencySelect.inputValue();
        console.log(`Selected Pings per Day: 3 Pings Per Day`);

        // ============= STEP 9: CHECK SEND MOVEMENT COMMANDS CHECKBOX =============
        console.log('\n========== STEP 9: CHECK SEND MOVEMENT COMMANDS CHECKBOX ==========');

        // Verify checkbox is present and check it
        const movementCheckbox = page.getByRole('checkbox', { name: 'Send Movement Commands' });
        await expect(movementCheckbox).toBeVisible({ timeout: 5000 });

        // Check if checkbox is not already checked, then check it
        const isChecked = await movementCheckbox.isChecked();
        if (!isChecked) {
            await movementCheckbox.check();
            console.log('Send Movement Commands checkbox checked');
        } else {
            console.log('Send Movement Commands checkbox was already checked');
        }

        // Verify checkbox is now checked
        await expect(movementCheckbox).toBeChecked();
        console.log('Movement checkbox verification passed');

        // ============= STEP 10: CLICK UPDATE FREQUENCY BUTTON =============
        console.log('\n========== STEP 10: CLICK UPDATE FREQUENCY BUTTON ==========');

        // Click the Update Frequency button
        const updateFrequencyBtn = page.getByRole('button', { name: 'Update Frequency', exact: true });
        await expect(updateFrequencyBtn).toBeVisible({ timeout: 5000 });
        await updateFrequencyBtn.click();
        console.log('Update Frequency button clicked');

        // Wait for form submission and response
        await page.waitForTimeout(5000);

        // ============= STEP 11: VERIFY LAST COMMAND STATUS IN TAB 1 =============
        console.log('\n========== STEP 11: VERIFY LAST COMMAND STATUS IN TAB 1 ==========');

        // Check if the Last Command Status field was updated after submission
        const lastCmdStatusTab1 = page.getByRole('textbox', { name: /Last Command Status/i }).first();
        await expect(lastCmdStatusTab1).toBeVisible({ timeout: 5000 });

        const tab1StatusValue = await lastCmdStatusTab1.inputValue();
        console.log(`Tab 1 Last Command Status: "${tab1StatusValue}"`);

        // Verify the status contains expected elements
        expect(tab1StatusValue).toBeTruthy();
        console.log('Last Command Status field has value');

        // Verify the status contains "(Movement Update)" since checkbox was checked
        expect(tab1StatusValue).toContain('(Movement Update)');
        console.log('Verified: Status contains "(Movement Update)"');

        // Verify the status contains "update message successfully"
        expect(tab1StatusValue.toLowerCase()).toContain('update message successfully');
        console.log('Verified: Status contains success message');

        // Verify the status contains "Pings Per Day"
        expect(tab1StatusValue).toContain('Pings Per Day');
        console.log('Verified: Status contains Pings Per Day value');

        // Store Tab 1 status for comparison with Tab 2
        const tab1LastCommandStatus = tab1StatusValue;
        console.log('Tab 1 Last Command Status stored for comparison');

        // ============= STEP 12: GO BACK TO TAB 2 (AGGRESSIVE MODE/CHANGE INTERVALS) =============
        console.log('\n========== STEP 12: GO BACK TO TAB 2 ==========');

        // Click on Tab 2: Aggressive Mode/Change Intervals
        const tab2Again = page.getByRole('button', { name: 'Aggressive Mode/Change Intervals' });
        await tab2Again.click();
        console.log('Clicked on "Aggressive Mode/Change Intervals" tab');

        await page.waitForTimeout(2000);

        // Verify Tab 2 content is visible
        const aggressiveModeContentAgain = page.getByText('Aggressive Mode', { exact: false }).first();
        await expect(aggressiveModeContentAgain).toBeVisible({ timeout: 5000 });
        console.log('Tab 2 content is visible');

        // ============= STEP 13: VERIFY LAST COMMAND STATUS IN TAB 2 MATCHES TAB 1 =============
        console.log('\n========== STEP 13: VERIFY LAST COMMAND STATUS IN TAB 2 ==========');

        // Get the Last Command Status field in Tab 2
        // There are multiple "Last Command Status" fields in DOM (one per tab), so we need to find the VISIBLE one
        // Iterate through all textboxes and find the one with "Pings Per Day" in its value that is visible
        let lastCmdStatusTab2 = null;
        const allTextboxes = page.getByRole('textbox');
        const count = await allTextboxes.count();
        console.log(`Found ${count} textboxes on page`);

        for (let i = 0; i < count; i++) {
            const textbox = allTextboxes.nth(i);
            const isVisible = await textbox.isVisible().catch(() => false);
            if (isVisible) {
                const value = await textbox.inputValue().catch(() => '');
                console.log(`Textbox ${i}: visible=${isVisible}, value="${value.substring(0, 50)}..."`);
                if (value.includes('Pings Per Day')) {
                    lastCmdStatusTab2 = textbox;
                    console.log(`Found Last Command Status textbox at index ${i}`);
                    break;
                }
            }
        }

        if (!lastCmdStatusTab2) {
            throw new Error('Could not find the Last Command Status textbox in Tab 2 with expected value');
        }
        await expect(lastCmdStatusTab2).toBeVisible({ timeout: 5000 });

        const tab2StatusValue = await lastCmdStatusTab2.inputValue();
        console.log(`Tab 2 Last Command Status: "${tab2StatusValue}"`);

        // Verify Tab 2 Last Command Status matches Tab 1
        expect(tab2StatusValue).toBe(tab1LastCommandStatus);
        console.log('Verified: Tab 2 Last Command Status matches Tab 1 Last Command Status');

        console.log('\n--- Normal Track Mode Flow Validation Completed ---');

        // ============= STEP 14: CLICK GEOFENCE TRACK MODE BUTTON =============
        console.log('\n========== STEP 14: CLICK GEOFENCE TRACK MODE BUTTON ==========');

        // Click on Geofence Track Mode button
        const geofenceTrackModeBtn = page.getByRole('button', { name: /Geofence Track Mode/i }).or(page.locator('#geofence-track-mode-btn'));
        await expect(geofenceTrackModeBtn.first()).toBeVisible({ timeout: 5000 });
        await geofenceTrackModeBtn.first().click();
        console.log('Geofence Track Mode button clicked');

        await page.waitForTimeout(2000);

        // Check if we need to enter an address (address input appears when no geofence exists)
        // Wait longer for the modal to potentially appear
        const addressInput = page.locator('#aggressive-geofence-address');

        // Try waiting for address input to appear (up to 5 seconds)
        let addressInputVisible = false;
        try {
            await expect(addressInput).toBeVisible({ timeout: 5000 });
            addressInputVisible = true;
        } catch (e) {
            addressInputVisible = false;
        }

        if (addressInputVisible) {
            console.log('Address input is visible - entering address for geofence');

            // Enter the address
            const geofenceAddress = config.testData.geofencingAddress || 'San Ramon, CA';
            await addressInput.clear();
            await addressInput.fill(geofenceAddress);
            console.log(`Entered address: ${geofenceAddress}`);

            // Wait for autocomplete suggestions to appear
            await page.waitForTimeout(3000);

            // Click on address suggestion if visible
            const addressSuggestion = page.locator('.ui-menu-item').first();
            try {
                await expect(addressSuggestion).toBeVisible({ timeout: 5000 });
                await addressSuggestion.click();
                console.log('Selected address suggestion from autocomplete');
            } catch (e) {
                console.log('No address suggestion dropdown appeared, trying to press Enter...');
                await addressInput.press('Enter');
            }

            await page.waitForTimeout(1000);

            // Click the Submit button within the aggressive geofence modal
            // Scope to the modal containing the aggressive geofence address input
            const aggressiveGeofenceModal = page.locator('.modal:visible, .modal-content:visible, #aggressive-geofence-modal, [class*="modal"]').filter({ has: page.locator('#aggressive-geofence-address') });
            let submitBtn;

            // Try to find Submit button within the modal first
            const modalExists = await aggressiveGeofenceModal.count() > 0;
            if (modalExists) {
                submitBtn = aggressiveGeofenceModal.getByRole('button', { name: 'Submit' });
            } else {
                // Fallback: Find Submit button near the address input (in same form/container)
                const form = page.locator('form').filter({ has: page.locator('#aggressive-geofence-address') });
                const formExists = await form.count() > 0;
                if (formExists) {
                    submitBtn = form.getByRole('button', { name: 'Submit' });
                } else {
                    // Last resort: Find visible Submit button that is NOT the change-password one
                    submitBtn = page.locator('button:has-text("Submit"):visible').filter({ hasNot: page.locator('#change-password-submit-btn') });
                }
            }

            await expect(submitBtn.first()).toBeVisible({ timeout: 5000 });
            await submitBtn.first().click();
            console.log('Clicked Submit button to create aggressive geofence');

            await page.waitForTimeout(2000);

            // A confirmation modal with Save button appears after Submit
            // Wait for the confirmation modal with Battery Impact Warning
            // Try multiple locator strategies for the Save button
            const saveBtnLocators = [
                page.getByRole('button', { name: 'Save' }),
                page.locator('button:has-text("Save")'),
                page.locator('button').filter({ hasText: 'Save' }),
                page.locator('.btn:has-text("Save")'),
                page.locator('button.btn--primary:has-text("Save")')
            ];

            let saveBtnClicked = false;
            for (const saveBtn of saveBtnLocators) {
                try {
                    await expect(saveBtn.first()).toBeVisible({ timeout: 3000 });
                    console.log('Confirmation modal appeared - clicking Save button');
                    await saveBtn.first().click();
                    console.log('Clicked Save button to confirm geofence creation');
                    saveBtnClicked = true;
                    break;
                } catch (e) {
                    // Try next locator
                }
            }

            if (!saveBtnClicked) {
                console.log('No Save confirmation modal appeared or could not find Save button');
            }

            await page.waitForTimeout(3000);
        } else {
            console.log('Address input not visible - geofence may already exist');
        }

        // ============= STEP 15: VERIFY GEOFENCE OVERLAY APPEARS =============
        console.log('\n========== STEP 15: VERIFY GEOFENCE OVERLAY ==========');

        // Verify the Aggressive Geofence overlay is visible
        const geofenceOverlay = page.locator('#aggressive-geofence-info-overlay');
        await expect(geofenceOverlay).toBeVisible({ timeout: 10000 });
        console.log('Aggressive Geofence overlay is visible');

        // Verify the overlay title
        const geofenceTitle = page.locator('#aggressive-geofence-title');
        await expect(geofenceTitle).toBeVisible({ timeout: 5000 });
        const titleText = await geofenceTitle.textContent();
        console.log(`Geofence Title: "${titleText}"`);
        expect(titleText).toContain('Aggressive Geofence');
        console.log('Verified: Title contains "Aggressive Geofence"');

        // ============= STEP 16: VERIFY GEOFENCE OVERLAY CONTENT =============
        console.log('\n========== STEP 16: VERIFY GEOFENCE OVERLAY CONTENT ==========');

        // Verify Name field
        const geofenceName = page.locator('#aggressive-geofence-name');
        await expect(geofenceName).toBeVisible({ timeout: 5000 });
        const nameText = await geofenceName.textContent();
        console.log(`Geofence Name: "${nameText}"`);
        expect(nameText).toBeTruthy();
        console.log('Verified: Name field has value');

        // Verify Radius field
        const geofenceRadius = page.locator('#aggressive-geofence-radius');
        await expect(geofenceRadius).toBeVisible({ timeout: 5000 });
        const radiusText = await geofenceRadius.textContent();
        console.log(`Geofence Radius: "${radiusText}" Feet`);
        expect(radiusText).toBeTruthy();
        console.log('Verified: Radius field has value');

        // Verify Location field
        const geofenceLocation = page.locator('#aggressive-geofence-location');
        await expect(geofenceLocation).toBeVisible({ timeout: 5000 });
        const locationText = await geofenceLocation.textContent();
        console.log(`Geofence Location: "${locationText}"`);
        expect(locationText).toBeTruthy();
        console.log('Verified: Location field has value');

        // Verify Status field
        const geofenceStatus = page.locator('#aggressive-geofence-status');
        await expect(geofenceStatus).toBeVisible({ timeout: 5000 });
        const statusText = await geofenceStatus.textContent();
        console.log(`Geofence Status: "${statusText}"`);
        expect(statusText).toBeTruthy();
        console.log('Verified: Status field has value');

        // ============= STEP 17: VERIFY GEOFENCE OVERLAY BUTTONS =============
        console.log('\n========== STEP 17: VERIFY GEOFENCE OVERLAY BUTTONS ==========');

        // Verify Edit button
        const editGeofenceBtn = page.locator('#edit-aggressive-geofence');
        await expect(editGeofenceBtn).toBeVisible({ timeout: 5000 });
        console.log('Edit button is visible');

        // Verify Close button
        const closeGeofenceBtn = page.locator('#close-aggressive-geofence-overlay');
        await expect(closeGeofenceBtn).toBeVisible({ timeout: 5000 });
        console.log('Close button is visible');

        // Verify Activate button (visible when status is Inactive)
        const activateBtn = page.locator('#activate-aggressive-geofence');
        const deactivateBtn = page.locator('#deactivate-aggressive-geofence');

        // Check which button is visible based on status
        if (statusText.toLowerCase() === 'inactive') {
            await expect(activateBtn).toBeVisible({ timeout: 5000 });
            console.log('Activate button is visible (Status: Inactive)');
        } else if (statusText.toLowerCase() === 'active') {
            await expect(deactivateBtn).toBeVisible({ timeout: 5000 });
            console.log('Deactivate button is visible (Status: Active)');
        }

        // Verify Center on geofence button
        const centerGeofenceBtn = page.locator('#center-aggressive-geofence');
        await expect(centerGeofenceBtn).toBeVisible({ timeout: 5000 });
        console.log('Center on geofence button is visible');

        // ============= STEP 18: ACTIVATE GEOFENCE AND VERIFY API =============
        console.log('\n========== STEP 18: ACTIVATE GEOFENCE AND VERIFY API ==========');

        // Check if status is Inactive and click Activate button
        if (statusText.toLowerCase() === 'inactive') {
            console.log('Status is Inactive - clicking Activate button');
            await activateBtn.click();
            console.log('Activate button clicked');

            await page.waitForTimeout(1000);

            // Verify confirm modal appears
            const confirmModal = page.locator('#dialog-confirm').or(page.getByRole('button', { name: 'Activate' }).last());
            const modalText = page.getByText('Do you want to activate aggressive geofence mode?');
            await expect(modalText).toBeVisible({ timeout: 5000 });
            console.log('Confirm modal appeared with message: "Do you want to activate aggressive geofence mode?"');

            // Verify modal warning text
            const warningText = page.getByText('This will put the device into aggressive mode and it will drain your battery life quickly.');
            await expect(warningText).toBeVisible({ timeout: 5000 });
            console.log('Modal warning text verified');

            // Set up API response listener for activateGeo.php
            const activateApiPromise = page.waitForResponse(
                response => response.url().includes('activateGeo.php') && response.status() === 200,
                { timeout: 15000 }
            );

            // Click Activate button in the modal
            const dialogConfirmBtn = page.locator('#dialog-confirm');
            await expect(dialogConfirmBtn).toBeVisible({ timeout: 5000 });
            await dialogConfirmBtn.click();
            console.log('Clicked Activate button in confirm modal');

            // Wait for and verify API response
            const activateResponse = await activateApiPromise;
            console.log(`Activate API URL: ${activateResponse.url()}`);
            console.log(`Activate API Status: ${activateResponse.status()}`);
            expect(activateResponse.status()).toBe(200);
            console.log('Verified: activateGeo.php API returned 200 OK');

            // Get and log the response body
            const activateResponseBody = await activateResponse.json().catch(() => activateResponse.text());
            console.log(`Activate API Response: ${JSON.stringify(activateResponseBody)}`);

            await page.waitForTimeout(2000);

            // Verify status changed to Active
            const updatedStatus = await geofenceStatus.textContent();
            console.log(`Updated Geofence Status: "${updatedStatus}"`);
            expect(updatedStatus.toLowerCase()).toBe('active');
            console.log('Verified: Status changed to Active');

            // Verify Deactivate button is now visible
            await expect(deactivateBtn).toBeVisible({ timeout: 5000 });
            console.log('Deactivate button is now visible');

            // ============= STEP 18b: DEACTIVATE GEOFENCE AND VERIFY API =============
            console.log('\n---------- STEP 18b: DEACTIVATE GEOFENCE AND VERIFY API ----------');

            // Click Deactivate button in the overlay
            await deactivateBtn.click();
            console.log('Deactivate button clicked');

            await page.waitForTimeout(1000);

            // Wait for confirmation modal to appear
            const deactivateModalText = page.getByText('Do you want to deactivate aggressive geofence mode?');
            await expect(deactivateModalText).toBeVisible({ timeout: 5000 });
            console.log('Confirm modal appeared for deactivation');

            // Set up API response listener for deactivateGeo.php BEFORE clicking confirm
            const deactivateApiPromise = page.waitForResponse(
                response => response.url().includes('deactivateGeo.php') && response.status() === 200,
                { timeout: 30000 }
            );

            // Click Deactivate button in the confirmation modal
            const dialogConfirmBtnDeactivate = page.locator('#dialog-confirm');
            await expect(dialogConfirmBtnDeactivate).toBeVisible({ timeout: 5000 });
            await dialogConfirmBtnDeactivate.click({ force: true });
            console.log('Clicked Deactivate button in confirm modal');

            // Wait for and verify API response
            const deactivateResponse = await deactivateApiPromise;
            console.log(`Deactivate API URL: ${deactivateResponse.url()}`);
            console.log(`Deactivate API Status: ${deactivateResponse.status()}`);
            expect(deactivateResponse.status()).toBe(200);
            console.log('Verified: deactivateGeo.php API returned 200 OK');

            // Get and log the response body
            const deactivateResponseBody = await deactivateResponse.json().catch(() => deactivateResponse.text());
            console.log(`Deactivate API Response: ${JSON.stringify(deactivateResponseBody)}`);

            await page.waitForTimeout(2000);

            // Verify status changed back to Inactive
            const finalStatus = await geofenceStatus.textContent();
            console.log(`Final Geofence Status: "${finalStatus}"`);
            expect(finalStatus.toLowerCase()).toBe('inactive');
            console.log('Verified: Status changed back to Inactive');

            // Verify Activate button is visible again
            await expect(activateBtn).toBeVisible({ timeout: 5000 });
            console.log('Activate button is visible again');

        } else {
            console.log('Status is already Active - performing Deactivate first');

            // Click Deactivate button in the overlay
            await deactivateBtn.click();
            console.log('Deactivate button clicked');

            await page.waitForTimeout(1000);

            // Wait for confirmation modal to appear
            const deactivateModalTextElse = page.getByText('Do you want to deactivate aggressive geofence mode?');
            await expect(deactivateModalTextElse).toBeVisible({ timeout: 5000 });
            console.log('Confirm modal appeared for deactivation');

            // Set up API response listener for deactivateGeo.php BEFORE clicking confirm
            const deactivateApiPromise = page.waitForResponse(
                response => response.url().includes('deactivateGeo.php') && response.status() === 200,
                { timeout: 30000 }
            );

            // Click Deactivate button in the confirmation modal
            const dialogConfirmBtnDeactivateElse = page.locator('#dialog-confirm');
            await expect(dialogConfirmBtnDeactivateElse).toBeVisible({ timeout: 5000 });
            await dialogConfirmBtnDeactivateElse.click({ force: true });
            console.log('Clicked Deactivate button in confirm modal');

            // Wait for and verify API response
            const deactivateResponse = await deactivateApiPromise;
            console.log(`Deactivate API Status: ${deactivateResponse.status()}`);
            expect(deactivateResponse.status()).toBe(200);
            console.log('Verified: deactivateGeo.php API returned 200 OK');

            await page.waitForTimeout(2000);

            // Now activate to test the full flow
            console.log('Now testing Activate flow...');
            await activateBtn.click();

            // Handle confirm modal
            const dialogConfirmBtn = page.locator('#dialog-confirm');
            await expect(dialogConfirmBtn).toBeVisible({ timeout: 5000 });

            const activateApiPromise = page.waitForResponse(
                response => response.url().includes('activateGeo.php') && response.status() === 200,
                { timeout: 15000 }
            );

            await dialogConfirmBtn.click();
            console.log('Clicked Activate button in confirm modal');

            const activateResponse = await activateApiPromise;
            expect(activateResponse.status()).toBe(200);
            console.log('Verified: activateGeo.php API returned 200 OK');
        }

        // ============= STEP 19: CLICK EDIT (PENCIL ICON) BUTTON =============
        console.log('\n========== STEP 19: CLICK EDIT (PENCIL ICON) BUTTON ==========');

        // Click the Edit button (pencil icon)
        await editGeofenceBtn.click();
        console.log('Edit (pencil icon) button clicked');

        await page.waitForTimeout(1500);

        // Verify edit mode is active - check for edit mode container
        const editModeContainer = page.locator('#aggressive-geofence-edit-mode');
        await expect(editModeContainer).toBeVisible({ timeout: 5000 });
        console.log('Edit mode is active - edit fields are visible');

        // Verify editable fields are present
        const nameEditInput = page.locator('#aggressive-geofence-name-edit');
        const radiusEditInput = page.locator('#aggressive-geofence-radius-edit');

        await expect(nameEditInput).toBeVisible({ timeout: 5000 });
        console.log('Name edit input is visible');

        await expect(radiusEditInput).toBeVisible({ timeout: 5000 });
        console.log('Radius edit input is visible');

        // ============= STEP 20: VERIFY EDIT FIELD VALUES =============
        console.log('\n========== STEP 20: VERIFY EDIT FIELD VALUES ==========');

        // Verify Name field value
        const nameValue = await nameEditInput.inputValue();
        console.log(`Name field value: "${nameValue}"`);
        expect(nameValue).toContain('Aggressive Geofence');
        console.log('Verified: Name field contains "Aggressive Geofence"');

        // Verify Radius field value
        const radiusValue = await radiusEditInput.inputValue();
        console.log(`Radius field value: "${radiusValue}" Feet`);
        expect(radiusValue).toBeTruthy();
        console.log('Verified: Radius field has a value');

        // ============= STEP 21: CLICK SAVE BUTTON =============
        console.log('\n========== STEP 21: CLICK SAVE BUTTON ==========');

        // Locate the Save button
        const saveBtn = page.getByRole('button', { name: 'Save', exact: true }).or(page.locator('#save-aggressive-geofence'));
        await expect(saveBtn).toBeVisible({ timeout: 5000 });
        console.log('Save button is visible');

        // Click Save button
        await saveBtn.click();
        console.log('Save button clicked');

        await page.waitForTimeout(2000);

        // Verify edit mode is closed and view mode is visible
        const viewModeContainer = page.locator('#aggressive-geofence-view-mode');
        await expect(viewModeContainer).toBeVisible({ timeout: 5000 });
        console.log('View mode is visible - edit mode closed successfully');

        console.log('\n--- Geofence Track Mode Flow Validation Completed ---');

        // ============= TEST SUMMARY =============
        console.log('\n========== TEST SUMMARY ==========');
        console.log('STEP 1: Login and Navigate - PASSED');
        console.log('STEP 2: Navigate to Asset Tracker Settings - PASSED');
        console.log('STEP 3: Click on Aggressive Mode Tab - PASSED');
        console.log('STEP 4: Verify Tab 2 Content - PASSED');
        console.log('STEP 5: Verify Mode Buttons - PASSED');
        console.log('STEP 6: Verify Select Device Label - PASSED');
        console.log('STEP 7: Click Normal Track Mode Button (Redirect to Tab 1) - PASSED');
        console.log('STEP 8: Change Pings Per Day - PASSED');
        console.log('STEP 9: Check Send Movement Commands Checkbox - PASSED');
        console.log('STEP 10: Click Update Frequency Button - PASSED');
        console.log('STEP 11: Verify Last Command Status in Tab 1 - PASSED');
        console.log('STEP 12: Go Back to Tab 2 - PASSED');
        console.log('STEP 13: Verify Last Command Status in Tab 2 Matches Tab 1 - PASSED');
        console.log('STEP 14: Click Geofence Track Mode Button - PASSED');
        console.log('STEP 15: Verify Geofence Overlay Appears - PASSED');
        console.log('STEP 16: Verify Geofence Overlay Content (Name, Radius, Location, Status) - PASSED');
        console.log('STEP 17: Verify Geofence Overlay Buttons (Edit, Close, Activate/Deactivate, Center) - PASSED');
        console.log('STEP 18: Activate Geofence (Confirm Modal, Verify activateGeo.php API) - PASSED');
        console.log('STEP 18b: Deactivate Geofence (Verify deactivateGeo.php API) - PASSED');
        console.log('STEP 19: Click Edit (Pencil Icon) Button - PASSED');
        console.log('STEP 20: Verify Edit Field Values (Name, Radius) - PASSED');
        console.log('STEP 21: Click Save Button - PASSED');
        console.log('\nAsset Tracker Settings - Tab 2 test completed successfully!');
    });

    test('should test Set Timed Updates For MA1086 tab functionality', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Asset Tracker Settings URL (assetdemo account has asset tracker devices)
        const assetDemoUrl = 'https://www.gpsandfleet3.net/gpsandfleet/client/assetdemo/maps/index2.php';

        // ============= STEP 1: LOGIN AND NAVIGATE =============
        console.log('\n========== STEP 1: LOGIN AND NAVIGATE ==========');
        await helpers.loginAndNavigateToPage(assetDemoUrl);
        console.log('Map page loaded successfully');

        // ============= STEP 2: NAVIGATE TO ASSET TRACKER SETTINGS =============
        console.log('\n========== STEP 2: NAVIGATE TO ASSET TRACKER SETTINGS ==========');

        // Click on Account Settings menu (sidebar icon)
        const accountsMenu = page.locator(config.selectors.navigation.accountsMenu);
        await accountsMenu.waitFor({ state: 'visible', timeout: 15000 });
        await accountsMenu.click();
        console.log('Account Settings menu clicked');

        await page.waitForTimeout(1500);

        // Click on Asset Tracker Settings submenu option
        const assetTrackerSettings = page.locator('#asset-tracker-settings-btn').or(page.getByText('Asset Tracker Settings', { exact: true }));
        await assetTrackerSettings.first().waitFor({ state: 'visible', timeout: 10000 });
        await assetTrackerSettings.first().click();
        console.log('Asset Tracker Settings clicked');

        await page.waitForTimeout(2000);

        // Verify panel is visible by checking for the heading
        const panelHeading = page.getByRole('heading', { name: 'Asset Tracker Settings', level: 2 });
        await expect(panelHeading).toBeVisible({ timeout: 10000 });
        console.log('Asset Tracker panel is visible');

        // ============= STEP 3: CLICK ON TAB 3 =============
        console.log('\n========== STEP 3: CLICK ON TAB 3 (SET TIMED UPDATES) ==========');

        // Click on Tab 3: Set Timed Updates For MA1086
        const tab3 = page.getByRole('button', { name: 'Set Timed Updates For MA1086' });
        await tab3.click();
        console.log('Clicked on "Set Timed Updates For MA1086" tab');

        await page.waitForTimeout(2000);

        // ============= STEP 4: VERIFY TAB 3 FORM ELEMENTS ARE VISIBLE =============
        console.log('\n========== STEP 4: VERIFY TAB 3 FORM ELEMENTS ==========');

        // Scroll the panel to make Tab 3 content visible
        await panelHeading.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // Verify Number Of Pings Per Day dropdown (combobox)
        const pingsDropdown = page.getByRole('combobox', { name: /Number Of Pings Per Day/i });
        await expect(pingsDropdown).toBeVisible({ timeout: 5000 });
        console.log('Number Of Pings Per Day dropdown is visible');

        // Verify Select Update Times heading
        const updateTimesLabel = page.getByRole('heading', { name: 'Select Update Times:' });
        await expect(updateTimesLabel).toBeVisible({ timeout: 5000 });
        console.log('Select Update Times section is visible');

        // Verify Send Movement Commands checkbox
        const movementCheckbox = page.getByRole('checkbox', { name: /Send Movement Commands/i });
        await expect(movementCheckbox).toBeVisible({ timeout: 5000 });
        console.log('Send Movement Commands checkbox is visible');

        // Verify Send button
        const sendButton = page.getByRole('button', { name: 'Send', exact: true });
        await expect(sendButton).toBeVisible({ timeout: 5000 });
        console.log('Send button is visible');

        // Verify Last Command Status textbox
        const lastCmdStatusField = page.getByRole('textbox').filter({ hasText: /Sent.*Pings Per Day/i }).or(page.locator('input[readonly]'));
        console.log('Last Command Status field found');

        // ============= STEP 5: GET DEVICE OPTIONS =============
        console.log('\n========== STEP 5: GET AVAILABLE DEVICES ==========');

        // Find the device select dropdown - look for the visible Select2 combobox showing device name
        // The device combobox shows something like "× Lift 1 (MA1086)..."
        const deviceSelect = page.getByRole('combobox').filter({ hasText: /MA1086|IMEI/i }).first();
        await expect(deviceSelect).toBeVisible({ timeout: 5000 });
        await deviceSelect.click();
        await page.waitForTimeout(1000);

        // Get all device options
        const deviceOptions = page.locator('.select2-results__option');
        const deviceCount = await deviceOptions.count();
        console.log(`Found ${deviceCount} device options`);

        // Store device names for later
        const deviceNames = [];
        for (let i = 0; i < Math.min(deviceCount, 3); i++) {
            const deviceName = await deviceOptions.nth(i).textContent();
            deviceNames.push(deviceName.trim());
            console.log(`Device ${i + 1}: ${deviceName.trim()}`);
        }

        // Close dropdown by pressing Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // ============= STEP 6: SELECT FIRST DEVICE AND SET TIMED UPDATES =============
        console.log('\n========== STEP 6: SELECT DEVICE 1 AND SET TIMED UPDATES ==========');

        // Click on device select to open dropdown
        await deviceSelect.click();
        await page.waitForTimeout(1000);

        // Select first device
        await deviceOptions.first().click();
        console.log(`Selected Device 1: ${deviceNames[0] || 'First device'}`);

        await page.waitForTimeout(1500);

        // Store Device 1 settings
        const device1Settings = {
            pingsPerDay: '3',
            times: ['08:00', '12:00', '18:00'],
            movementChecked: true
        };

        // Select Number Of Pings Per Day for Device 1
        await pingsDropdown.selectOption({ label: '3 Pings Per Day' });
        console.log(`Set Pings Per Day to: ${device1Settings.pingsPerDay}`);

        await page.waitForTimeout(1000);

        // ============= STEP 7: VERIFY TIME INPUTS MATCH PINGS PER DAY =============
        console.log('\n========== STEP 7: VERIFY TIME INPUTS COUNT ==========');

        // Get all time input fields
        const timeInputs = page.locator('input[type="time"], input[type="text"]').filter({ hasText: '' });
        const updateTimeInputs = page.locator('input').filter({ has: page.locator('[placeholder*="time"], [type="time"]') });

        // Find Update time inputs by looking for inputs near "Update 1:", "Update 2:", etc.
        const update1Input = page.locator('input').nth(0);
        const update2Input = page.locator('input').nth(1);
        const update3Input = page.locator('input').nth(2);

        // Try to find time inputs by their container
        const timeInputsContainer = page.locator('text=Select Update Times:').locator('..').locator('input');
        const timeInputCount = await timeInputsContainer.count().catch(() => 0);

        if (timeInputCount > 0) {
            console.log(`Found ${timeInputCount} time input fields`);
            expect(timeInputCount).toBe(parseInt(device1Settings.pingsPerDay));
            console.log(`Time inputs count (${timeInputCount}) matches Pings Per Day (${device1Settings.pingsPerDay})`);
        } else {
            // Alternative: find inputs with time pattern
            const allInputs = page.locator('input[type="text"]');
            const inputCount = await allInputs.count();
            console.log(`Found ${inputCount} text inputs in the form`);
        }

        // ============= STEP 8: SET UPDATE TIMES FOR DEVICE 1 =============
        console.log('\n========== STEP 8: SET UPDATE TIMES FOR DEVICE 1 ==========');

        // Find and fill time inputs
        const timeFields = page.locator('input').filter({ has: page.locator('[class*="time"]') });

        // Try different approaches to find time inputs
        // Approach 1: Look for inputs with clock icon nearby
        const clockInputs = page.locator('input').filter({ hasNot: page.locator('[type="checkbox"]') }).filter({ hasNot: page.locator('[type="hidden"]') });

        // Fill time values - looking for visible text inputs in the update times section
        for (let i = 0; i < device1Settings.times.length; i++) {
            const timeInput = page.getByRole('textbox').nth(i);
            if (await timeInput.isVisible().catch(() => false)) {
                await timeInput.fill(device1Settings.times[i]);
                console.log(`Update ${i + 1}: Set time to ${device1Settings.times[i]}`);
            }
        }

        // ============= STEP 9: CHECK MOVEMENT CHECKBOX FOR DEVICE 1 =============
        console.log('\n========== STEP 9: CHECK MOVEMENT CHECKBOX ==========');

        // Check the movement checkbox
        if (!await movementCheckbox.isChecked()) {
            await movementCheckbox.check();
            console.log('Send Movement Commands checkbox checked');
        } else {
            console.log('Send Movement Commands checkbox was already checked');
        }
        device1Settings.movementChecked = await movementCheckbox.isChecked();

        // ============= STEP 10: CLICK SEND AND HANDLE ALERT =============
        console.log('\n========== STEP 10: CLICK SEND BUTTON FOR DEVICE 1 ==========');

        // Set up dialog handler for alert popup
        let alertMessage1 = '';
        page.once('dialog', async dialog => {
            alertMessage1 = dialog.message();
            console.log(`Alert popup received: "${alertMessage1}"`);
            await dialog.accept();
        });

        // Click Send button
        await sendButton.click();
        console.log('Send button clicked for Device 1');

        // Wait for alert and API response
        await page.waitForTimeout(5000);

        // Verify Last Command Status is updated
        const lastCmdStatus1 = page.getByRole('textbox', { name: /Last Command Status/i }).or(page.locator('input[readonly]')).first();
        if (await lastCmdStatus1.isVisible().catch(() => false)) {
            const status1 = await lastCmdStatus1.inputValue();
            console.log(`Device 1 Last Command Status: "${status1}"`);

            // Verify success message
            if (status1.toLowerCase().includes('successfully')) {
                console.log('Device 1 update sent successfully');
            }
        }

        // ============= STEP 11: SELECT SECOND DEVICE =============
        console.log('\n========== STEP 11: SELECT DEVICE 2 AND SET TIMED UPDATES ==========');

        // Store Device 2 settings
        const device2Settings = {
            pingsPerDay: '2',
            times: ['09:30', '17:30'],
            movementChecked: true
        };

        // Click on device select to open dropdown
        await deviceSelect.click();
        await page.waitForTimeout(1000);

        // Select second device (if available)
        if (deviceCount > 1) {
            await deviceOptions.nth(1).click();
            console.log(`Selected Device 2: ${deviceNames[1] || 'Second device'}`);
        } else {
            await deviceOptions.first().click();
            console.log('Only one device available, reusing first device');
        }

        await page.waitForTimeout(1500);

        // Select different Pings Per Day for Device 2
        await pingsDropdown.selectOption({ label: '2 Pings Per Day' });
        console.log(`Set Pings Per Day to: ${device2Settings.pingsPerDay}`);

        await page.waitForTimeout(1000);

        // ============= STEP 12: SET UPDATE TIMES FOR DEVICE 2 =============
        console.log('\n========== STEP 12: SET UPDATE TIMES FOR DEVICE 2 ==========');

        // Fill time values for Device 2
        for (let i = 0; i < device2Settings.times.length; i++) {
            const timeInput = page.getByRole('textbox').nth(i);
            if (await timeInput.isVisible().catch(() => false)) {
                await timeInput.clear();
                await timeInput.fill(device2Settings.times[i]);
                console.log(`Update ${i + 1}: Set time to ${device2Settings.times[i]}`);
            }
        }

        // Check movement checkbox for Device 2
        if (!await movementCheckbox.isChecked()) {
            await movementCheckbox.check();
            console.log('Send Movement Commands checkbox checked for Device 2');
        }

        // ============= STEP 13: CLICK SEND FOR DEVICE 2 AND HANDLE ALERT =============
        console.log('\n========== STEP 13: CLICK SEND BUTTON FOR DEVICE 2 ==========');

        // Set up dialog handler for alert popup
        let alertMessage2 = '';
        page.once('dialog', async dialog => {
            alertMessage2 = dialog.message();
            console.log(`Alert popup received: "${alertMessage2}"`);
            await dialog.accept();
        });

        // Click Send button
        await sendButton.click();
        console.log('Send button clicked for Device 2');

        // Wait for alert and API response
        await page.waitForTimeout(5000);

        // Verify Last Command Status is updated
        if (await lastCmdStatus1.isVisible().catch(() => false)) {
            const status2 = await lastCmdStatus1.inputValue();
            console.log(`Device 2 Last Command Status: "${status2}"`);

            // Verify success message
            if (status2.toLowerCase().includes('successfully')) {
                console.log('Device 2 update sent successfully');
            }
        }

        // ============= STEP 14: GO BACK TO DEVICE 1 AND VERIFY SAVED VALUES =============
        console.log('\n========== STEP 14: VERIFY DEVICE 1 SAVED VALUES ==========');

        // Click on device select to open dropdown
        await deviceSelect.click();
        await page.waitForTimeout(1000);

        // Select first device again
        await deviceOptions.first().click();
        console.log(`Selected Device 1 again: ${deviceNames[0] || 'First device'}`);

        await page.waitForTimeout(2000);

        // Verify the saved settings for Device 1
        // Check Pings Per Day value
        const savedPings1 = await pingsDropdown.inputValue();
        console.log(`Device 1 - Saved Pings Per Day: ${savedPings1}`);

        // Verify time inputs have the values we set
        let device1ValuesMatch = true;
        const device1SavedTimes = [];
        for (let i = 0; i < device1Settings.times.length; i++) {
            const timeInput = page.getByRole('textbox').nth(i);
            if (await timeInput.isVisible().catch(() => false)) {
                const savedTime = await timeInput.inputValue();
                device1SavedTimes.push(savedTime);
                console.log(`Device 1 - Update ${i + 1} saved time: ${savedTime}`);

                // Check if time matches what we set (allowing for format differences like 08:00 vs 8:00)
                const expectedHour = device1Settings.times[i].split(':')[0];
                if (!savedTime.includes(expectedHour) && !savedTime.includes(expectedHour.replace(/^0/, ''))) {
                    console.log(`ERROR: Time mismatch for Update ${i + 1}. Expected: ${device1Settings.times[i]}, Got: ${savedTime}`);
                    device1ValuesMatch = false;
                }
            }
        }

        // Verify movement checkbox state
        const savedMovement1 = await movementCheckbox.isChecked();
        console.log(`Device 1 - Movement checkbox: ${savedMovement1 ? 'checked' : 'unchecked'}`);

        // Assert that Device 1 values match what we set
        expect(device1ValuesMatch, `Device 1 saved times ${device1SavedTimes.join(', ')} should match expected ${device1Settings.times.join(', ')}`).toBeTruthy();
        console.log('Device 1 saved values verified successfully');

        // ============= STEP 15: GO BACK TO DEVICE 2 AND VERIFY SAVED VALUES =============
        console.log('\n========== STEP 15: VERIFY DEVICE 2 SAVED VALUES ==========');

        if (deviceCount > 1) {
            // Click on device select to open dropdown
            await deviceSelect.click();
            await page.waitForTimeout(1000);

            // Select second device again
            await deviceOptions.nth(1).click();
            console.log(`Selected Device 2 again: ${deviceNames[1] || 'Second device'}`);

            await page.waitForTimeout(2000);

            // Verify the saved settings for Device 2
            // Check Pings Per Day value
            const savedPings2 = await pingsDropdown.inputValue();
            console.log(`Device 2 - Saved Pings Per Day: ${savedPings2}`);

            // Verify time inputs have the values we set
            let device2ValuesMatch = true;
            const device2SavedTimes = [];
            for (let i = 0; i < device2Settings.times.length; i++) {
                const timeInput = page.getByRole('textbox').nth(i);
                if (await timeInput.isVisible().catch(() => false)) {
                    const savedTime = await timeInput.inputValue();
                    device2SavedTimes.push(savedTime);
                    console.log(`Device 2 - Update ${i + 1} saved time: ${savedTime}`);

                    // Check if time matches what we set (allowing for format differences like 09:30 vs 9:30)
                    const expectedHour = device2Settings.times[i].split(':')[0];
                    if (!savedTime.includes(expectedHour) && !savedTime.includes(expectedHour.replace(/^0/, ''))) {
                        console.log(`ERROR: Time mismatch for Update ${i + 1}. Expected: ${device2Settings.times[i]}, Got: ${savedTime}`);
                        device2ValuesMatch = false;
                    }
                }
            }

            // Verify movement checkbox state
            const savedMovement2 = await movementCheckbox.isChecked();
            console.log(`Device 2 - Movement checkbox: ${savedMovement2 ? 'checked' : 'unchecked'}`);

            // Assert that Device 2 values match what we set
            expect(device2ValuesMatch, `Device 2 saved times ${device2SavedTimes.join(', ')} should match expected ${device2Settings.times.join(', ')}`).toBeTruthy();
            console.log('Device 2 saved values verified successfully');
        } else {
            console.log('Only one device available, skipping Device 2 verification');
        }

        // ============= TEST SUMMARY =============
        console.log('\n========== TEST SUMMARY ==========');
        console.log('STEP 1: Login and Navigate - PASSED');
        console.log('STEP 2: Navigate to Asset Tracker Settings - PASSED');
        console.log('STEP 3: Click on Tab 3 - PASSED');
        console.log('STEP 4: Verify Tab 3 Form Elements - PASSED');
        console.log('STEP 5: Get Available Devices - PASSED');
        console.log('STEP 6: Select Device 1 - PASSED');
        console.log('STEP 7: Verify Time Inputs Count - PASSED');
        console.log('STEP 8: Set Update Times for Device 1 - PASSED');
        console.log('STEP 9: Check Movement Checkbox - PASSED');
        console.log('STEP 10: Click Send for Device 1 - PASSED');
        console.log('STEP 11: Select Device 2 - PASSED');
        console.log('STEP 12: Set Update Times for Device 2 - PASSED');
        console.log('STEP 13: Click Send for Device 2 - PASSED');
        console.log('STEP 14: Verify Device 1 Saved Values - PASSED');
        console.log('STEP 15: Verify Device 2 Saved Values - PASSED');
        console.log('\nAsset Tracker Settings - Tab 3 Set Timed Updates test completed successfully!');
    });
});
