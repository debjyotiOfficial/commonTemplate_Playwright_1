const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

/**
 * Test Suite: Add/Edit Device
 *
 * This test validates the complete device lifecycle management:
 * 1. Adding a new device with a selected IMEI
 * 2. Editing the device name and settings
 * 3. Verifying pulsing icon functionality
 * 4. Removing the device from the system
 */
test.describe('Add edit Device', () => {
    let config;
    let helpers;
    let selectedImei = ''; // Stores the IMEI selected during device creation for later verification

    test.beforeAll(async ({ browser }) => {
        // SETUP: Load configuration before all tests run
        const page = await browser.newPage();
        helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        await page.close();
    });

    test.beforeEach(async ({ page }) => {
        // SETUP: Initialize helpers and clear any stored state before each test
        helpers = new TestHelpers(page);
        await helpers.clearStorageAndSetTimeouts();

        // Set extended timeout for this long-running test (5 minutes)
        test.setTimeout(300000);
    });

    test('should add/edit a device', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // ========================================
        // STEP 1: LOGIN AND NAVIGATE TO DASHBOARD
        // ========================================
        // Authenticate user and navigate to the fleet dashboard
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // ========================================
        // STEP 2: OPEN ADD/EDIT DEVICE MODAL
        // ========================================
        // Open the accounts menu from the navigation bar
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Click on "Add/Edit Device" menu option to open the device management modal
        await expect(page.locator(config.selectors.addEditDevice.addEditDriverMenu)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.addEditDriverMenu).click();

        // Verify the Add/Edit Device modal is displayed
        await expect(page.locator(config.selectors.addEditDevice.addEditDriverModal)).toBeVisible();

        // ========================================
        // STEP 3: ADD A NEW DEVICE
        // ========================================
        // Switch to the "Add Device" tab within the modal
        await page.locator(config.selectors.addEditDevice.addTab).first().scrollIntoViewIfNeeded();
        await page.locator(config.selectors.addEditDevice.addTab).first().click();

        // Open the IMEI dropdown (Select2 AJAX-powered dropdown)
        await page.locator('#select2-imei-search-container').click();

        // Wait for IMEI options to load from the server
        // IMEI values are 15-digit numbers, so we filter for options containing only digits
        const imeiOptionLocator = page.locator('.select2-results__option').filter({
            hasText: /^\d{6,}$/
        }).first();

        // Select the first available IMEI and store it for later verification
        await expect(imeiOptionLocator).toBeVisible({ timeout: 10000 });
        selectedImei = await imeiOptionLocator.textContent();
        selectedImei = selectedImei.trim();
        await imeiOptionLocator.click();
        console.log('Selected IMEI: ' + selectedImei);

        // Wait for the form to populate with IMEI-related data
        await page.waitForTimeout(4000);

        // Enter a name for the new device
        await expect(page.locator(config.selectors.addEditDevice.newDeviceName)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.newDeviceName).clear();
        await page.locator(config.selectors.addEditDevice.newDeviceName).fill('AutomatedDevice');

        // Select icon category as "All" to show all available icons
        await page.locator(config.selectors.addEditDevice.iconCategoryAdd).selectOption('All');

        // Select the second icon option for the device marker
        await page.locator(config.selectors.addEditDevice.iconRadioButtonAdd).nth(1).click({ force: true });

        // Submit the form to add the new device
        await page.locator(config.selectors.addEditDevice.addDeviceBtn).scrollIntoViewIfNeeded();
        await expect(page.locator(config.selectors.addEditDevice.addDeviceBtn)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.addDeviceBtn).click({ force: true });

        // Wait for the device to be added and the device list to refresh
        await page.waitForTimeout(10000);

        // ========================================
        // STEP 4: VERIFY DEVICE WAS ADDED
        // ========================================
        // Find the row in the devices table that contains the selected IMEI
        const deviceRow = page.locator('table#devices-table tbody tr').filter({ hasText: selectedImei });
        await expect(deviceRow).toBeVisible();
        // Verify the device name appears in the same row as the IMEI
        await expect(deviceRow).toContainText('AutomatedDevice');

        // Close the device list modal
        await page.locator(config.selectors.devList.container + ' .icon--close').click({ force: true });

        await page.waitForTimeout(5000);

        // ========================================
        // STEP 5: EDIT THE DEVICE (First Edit)
        // ========================================
        // Re-open the accounts menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Navigate to Add/Edit Device modal again
        await expect(page.locator(config.selectors.addEditDevice.addEditDriverMenu)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.addEditDriverMenu).click();

        await expect(page.locator(config.selectors.addEditDevice.addEditDriverModal)).toBeVisible();

        // Switch to the "Edit Device" tab
        await page.locator(config.selectors.addEditDevice.editTab).first().scrollIntoViewIfNeeded();
        await page.locator(config.selectors.addEditDevice.editTab).first().click({ force: true });

        // Wait for the Edit Device tab content to load
        await page.waitForTimeout(5000);

        // Verify the Edit Device content area is visible
        await expect(page.locator('#edit-device-content')).toBeVisible();

        // Open the device selection dropdown (Select2 AJAX-powered)
        await page.locator('#edit-device-content .select2-selection').click();
        // Select the device we just created from the dropdown options
        await page.locator('.select2-results__option').filter({ hasText: 'AutomatedDevice' }).first().click();

        // Verify the device name input field shows the selected device name
        await expect(page.locator(config.selectors.addEditDevice.deviceNameInput)).toHaveValue('AutomatedDevice');

        // Update the device name to a new value
        await page.locator(config.selectors.addEditDevice.deviceNameInput).clear();
        await page.locator(config.selectors.addEditDevice.deviceNameInput).fill('AutomatedDeviceEdited');

        // Enable the pulsing icon feature if not already enabled
        // This makes the device marker pulse on the map for better visibility
        const checkbox = page.locator(config.selectors.addEditDevice.pulsingIconCheckbox);
        if (!(await checkbox.isChecked())) {
            await checkbox.click();
        }

        // Select "All" icon category to show all available icons
        await page.locator(config.selectors.addEditDevice.iconCategoryEdit).selectOption('All');

        // Select the second icon option for the device marker
        await page.locator(config.selectors.addEditDevice.iconRadioButton).nth(1).check({ force: true });

        // Submit the edit form to update the device
        await page.locator(config.selectors.addEditDevice.updateDeviceButton).scrollIntoViewIfNeeded();
        await expect(page.locator(config.selectors.addEditDevice.updateDeviceButton)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.updateDeviceButton).click({ force: true });

        // Wait for the update to process on the server
        await page.waitForTimeout(30000);

        // ========================================
        // STEP 6: VERIFY DEVICE WAS EDITED
        // ========================================
        // Open the accounts menu to access device list
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Click on "List of Devices" menu option
        await expect(page.locator(config.selectors.navigation.listOfDevices)).toBeVisible();
        await page.locator(config.selectors.navigation.listOfDevices).click();

        // Ensure the device list container is visible and interact with it
        await expect(page.locator(config.selectors.devList.container)).toBeVisible();
        await page.locator(config.selectors.devList.container).scrollIntoViewIfNeeded();
        await page.locator(config.selectors.devList.container).click({ force: true });

        // Confirm the device list modal is displayed
        await expect(page.locator(config.selectors.devList.container)).toBeVisible();

        // Wait for the device table to load and verify the edited device name appears
        await expect(page.locator('table#devices-table').filter({ hasText: 'AutomatedDeviceEdited' })).toBeVisible({ timeout: 30000 });

        // Iterate through table rows to find and verify the edited device
        const deviceRows = page.locator('table#devices-table tbody tr');
        const rowCount = await deviceRows.count();

        let deviceFound = false;
        for (let i = 0; i < rowCount; i++) {
            const rowText = await deviceRows.nth(i).textContent();
            if (rowText.includes('AutomatedDeviceEdited')) {
                await expect(deviceRows.nth(i).locator('div').filter({ hasText: 'AutomatedDeviceEdited' }).first()).toBeVisible();
                deviceFound = true;
                break;
            }
        }
        expect(deviceFound).toBe(true);

        // Close the device list modal
        await page.locator(config.selectors.devList.container + ' .icon--close').click({ force: true });
        await page.waitForTimeout(5000);

        // ========================================
        // STEP 7: VERIFY PULSING ICON ON MAP
        // ========================================
        // Locate the device card on the map/dashboard and get its status
        const statusElement = page.locator('h5:has-text("AutomatedDeviceEdited")').locator('..').locator('..').getByText(/Vehicle Is Off|Vehicle Is Running|Not Updating|Engine On/).first();
        await statusElement.waitFor({ state: 'visible', timeout: 10000 });
        const vehicleStatus = await statusElement.textContent();
        const status = vehicleStatus.trim();
        console.log('Vehicle Status: ' + status);

        // Verify the pulsing marker is visible based on vehicle status
        // Pulsing markers indicate active/running vehicles on the map
        if (status === 'Vehicle Is Off' || status === 'Vehicle Is Running') {
            await expect(page.locator('.pulsing-marker')).toBeVisible({ timeout: 10000 });
            await expect(page.locator('.marker-circle.pulsing-marker')).toBeVisible();
            console.log('Pulsing marker verified for status: ' + status);
        } else {
            console.log('Vehicle status is: ' + status + ' - pulsing behavior may vary');
        }

        // ========================================
        // STEP 8: REVERT DEVICE NAME (Second Edit)
        // ========================================
        // Re-open the accounts menu to access device editing
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Navigate to the Add/Edit Device modal
        await expect(page.locator(config.selectors.addEditDevice.addEditDriverMenu)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.addEditDriverMenu).click();

        await expect(page.locator(config.selectors.addEditDevice.addEditDriverModal)).toBeVisible();

        // Switch to the "Edit Device" tab
        await page.locator(config.selectors.addEditDevice.editTab).first().scrollIntoViewIfNeeded();
        await expect(page.locator(config.selectors.addEditDevice.editTab).first()).toBeVisible();
        await page.locator(config.selectors.addEditDevice.editTab).first().click();

        // Wait for the edit tab content to load
        await page.waitForTimeout(8000);

        // Open the device selection dropdown and select the edited device
        await page.locator('#edit-device-content .select2-selection').click();
        await page.locator('.select2-results__option').filter({ hasText: 'AutomatedDeviceEdited' }).first().click();

        // Verify the device name field shows the current (edited) name
        await expect(page.locator(config.selectors.addEditDevice.deviceNameInput)).toHaveValue('AutomatedDeviceEdited');

        // Revert the device name back to the original name
        await page.locator(config.selectors.addEditDevice.deviceNameInput).clear();
        await page.locator(config.selectors.addEditDevice.deviceNameInput).fill('AutomatedDevice');

        // Ensure pulsing icon is still enabled
        const checkbox2 = page.locator(config.selectors.addEditDevice.pulsingIconCheckbox);
        if (!(await checkbox2.isChecked())) {
            await checkbox2.click();
        }

        // Maintain the same icon category and selection
        await page.locator(config.selectors.addEditDevice.iconCategoryEdit).selectOption('All');
        await page.locator(config.selectors.addEditDevice.iconRadioButton).nth(1).check({ force: true });

        // Submit the form to save the reverted name
        await page.locator(config.selectors.addEditDevice.updateDeviceButton).scrollIntoViewIfNeeded();
        await expect(page.locator(config.selectors.addEditDevice.updateDeviceButton)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.updateDeviceButton).click({ force: true });

        // Brief wait for the update to process
        await page.waitForTimeout(2000);

        // ========================================
        // STEP 9: REMOVE THE DEVICE (Cleanup)
        // ========================================
        // Open the accounts menu to access device editing
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Navigate to Add/Edit Device modal
        await expect(page.locator(config.selectors.addEditDevice.addEditDriverMenu)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.addEditDriverMenu).click();

        await expect(page.locator(config.selectors.addEditDevice.addEditDriverModal)).toBeVisible();

        // Switch to the "Edit Device" tab to access removal option
        await page.locator(config.selectors.addEditDevice.editTab).first().scrollIntoViewIfNeeded();
        await expect(page.locator(config.selectors.addEditDevice.editTab).first()).toBeVisible();
        await page.locator(config.selectors.addEditDevice.editTab).first().click();

        // Wait for the edit tab content to load
        await page.waitForTimeout(8000);

        // Open the device selection dropdown and select the device to remove
        await page.locator('#edit-device-content .select2-selection').click();
        await page.locator('.select2-results__option').filter({ hasText: 'AutomatedDevice' }).first().click();

        // Verify the correct device is selected before removal
        await expect(page.locator(config.selectors.addEditDevice.deviceNameInput)).toHaveValue('AutomatedDevice');

        // Click the "Remove Device" button to initiate deletion
        await expect(page.locator(config.selectors.addEditDevice.removeDeviceButton)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.removeDeviceButton).click({ force: true });

        // ========================================
        // STEP 10: CONFIRM DEVICE DELETION
        // ========================================
        // A confirmation modal appears to prevent accidental deletions
        await expect(page.locator(config.selectors.addEditDevice.confirmationModal)).toBeVisible();

        // Click the confirm button to proceed with deletion
        await expect(page.locator(config.selectors.addEditDevice.confirmDeleteButton)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.confirmDeleteButton).click({ force: true });

        // Wait for the deletion to process on the server
        await page.waitForTimeout(10000);

        // ========================================
        // STEP 11: VERIFY DEVICE WAS REMOVED
        // ========================================
        // Confirm the device no longer appears in the devices table
        await expect(page.locator('table#devices-table td').filter({ hasText: 'AutomatedDevice' })).not.toBeVisible();

        // Close the device list modal
        await page.locator(config.selectors.devList.container + ' .icon--close').scrollIntoViewIfNeeded();
        await page.locator(config.selectors.devList.container + ' .icon--close').click({ force: true });

        await page.waitForTimeout(5000);

        // Test complete - device was successfully added, edited twice, and removed
        console.log('Device add/edit/remove test completed successfully');
    });
});
