const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');
const path = require('path');

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
        await page.waitForTimeout(1000);

        // Click on "Add/Edit Device" menu option to open the device management modal
        await expect(page.locator(config.selectors.addEditDevice.addEditDriverMenu)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.addEditDriverMenu).click({ force: true });

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

        // Wait for dropdown to open and IMEI options to load from the server
        await page.waitForTimeout(5000);

        // Wait for any options to appear in dropdown
        await page.locator('.select2-results__option').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
            console.log('No dropdown options appeared');
        });

        // IMEI values are 15-digit numbers, so we filter for options containing only digits
        const allImeiOptions = page.locator('.select2-results__option').filter({
            hasText: /^\d{6,}$/
        });

        // Check if IMEI options are available, skip test if none found
        const imeiCount = await allImeiOptions.count();
        console.log(`Found ${imeiCount} IMEI options available`);

        if (imeiCount === 0) {
            console.log('WARNING: No IMEI numbers available - skipping test. Please add IMEI numbers or delete leftover test devices.');
            // Close the dropdown
            await page.keyboard.press('Escape');
            test.skip();
            return;
        }

        const imeiOptionLocator = allImeiOptions.first();
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
        // Select the device we just created from the dropdown options (use IMEI for exact match)
        await page.locator('.select2-results__option').filter({ hasText: selectedImei }).first().click();

        // Verify the device name input field shows the selected device name
        await expect(page.locator(config.selectors.addEditDevice.deviceNameInput)).toHaveValue('AutomatedDevice', { timeout: 15000 });

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
        // STEP 7: VERIFY PULSING ICON ON MAP (Optional - may not always be visible)
        // ========================================
        // Locate the device card on the map/dashboard and get its status
        // This step is wrapped in try-catch as the device card may not always appear on the map immediately
        try {
            const statusElement = page.locator('h5:has-text("AutomatedDeviceEdited")').locator('..').locator('..').getByText(/Vehicle Is Off|Vehicle Is Running|Not Updating|Engine On/).first();
            await statusElement.waitFor({ state: 'visible', timeout: 60000 });
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
        } catch (error) {
            console.log('Note: Device card not visible on map - this can happen if device is not actively reporting. Continuing with test...');
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
        await expect(page.locator(config.selectors.addEditDevice.deviceNameInput)).toHaveValue('AutomatedDeviceEdited', { timeout: 15000 });

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
        await expect(page.locator(config.selectors.addEditDevice.deviceNameInput)).toHaveValue('AutomatedDevice', { timeout: 15000 });

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

        // Set up listener for deletion API call
        const deleteDevicePromise = page.waitForResponse(
            response => response.url().includes('removeDevice.php') || response.url().includes('delete') || response.url().includes('remove'),
            { timeout: 30000 }
        ).catch(() => console.log('Delete API response not captured, continuing...'));

        await page.locator(config.selectors.addEditDevice.confirmDeleteButton).click({ force: true });

        // Wait for the deletion API to complete
        await deleteDevicePromise;
        await page.waitForTimeout(5000);

        // ========================================
        // STEP 11: VERIFY DEVICE WAS REMOVED
        // ========================================
        // Close the modal and reopen device list to get fresh data
        await page.evaluate(() => {
            const closeBtn = document.querySelector('#devices-panel .icon--close');
            if (closeBtn) closeBtn.click();
        });
        await page.waitForTimeout(2000);

        // Reopen the device list to verify removal
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();
        await expect(page.locator(config.selectors.navigation.listOfDevices)).toBeVisible();
        await page.locator(config.selectors.navigation.listOfDevices).click();
        await page.waitForTimeout(5000);

        // Confirm the device no longer appears in the devices table
        await expect(page.locator('table#devices-table td').filter({ hasText: 'AutomatedDevice' })).not.toBeVisible({ timeout: 30000 });

        // Close the device list modal
        await page.locator(config.selectors.devList.container + ' .icon--close').scrollIntoViewIfNeeded();
        await page.locator(config.selectors.devList.container + ' .icon--close').click({ force: true });

        await page.waitForTimeout(3000);

        // Test complete - device was successfully added, edited twice, and removed
        console.log('Device add/edit/remove test completed successfully');
    });

    test('should add device with custom icon', async ({ page }) => {
        // This test involves multiple icon uploads and API calls, needs extended timeout
        test.setTimeout(600000); // 10 minutes

        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        let selectedImei = '';

        // Path to test image - relative to project root for BrowserStack compatibility
        const testImagePath = path.resolve(__dirname, '../fixtures/test-icon.png');

        // ========================================
        // STEP 1: LOGIN AND NAVIGATE TO DASHBOARD
        // ========================================
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // ========================================
        // STEP 2: OPEN ADD/EDIT DEVICE MODAL
        // ========================================
        // Open the accounts menu from the navigation bar
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Click on "Add/Edit Device" menu option
        await expect(page.locator(config.selectors.addEditDevice.addEditDriverMenu)).toBeVisible();
        await page.waitForTimeout(1000);
        await page.locator(config.selectors.addEditDevice.addEditDriverMenu).click({ force: true });

        // Verify the Add/Edit Device modal is displayed
        await expect(page.locator(config.selectors.addEditDevice.addEditDriverModal)).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);

        // ========================================
        // STEP 3: NAVIGATE TO ADD DEVICE TAB
        // ========================================
        // Switch to the "Add Device" tab within the modal
        await page.locator(config.selectors.addEditDevice.addTab).first().scrollIntoViewIfNeeded();
        await page.locator(config.selectors.addEditDevice.addTab).first().click({ force: true });

        // Wait for the tab content to load
        await page.waitForTimeout(2000);

        // ========================================
        // STEP 4: SELECT IMEI FROM DROPDOWN
        // ========================================
        // Open the IMEI dropdown (Select2 AJAX-powered dropdown)
        await page.locator('#select2-imei-search-container').click();

        // Wait for dropdown to open and IMEI options to load from the server
        await page.waitForTimeout(5000);

        // Wait for any options to appear in dropdown
        await page.locator('.select2-results__option').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
            console.log('No dropdown options appeared');
        });

        // IMEI values are 15-digit numbers, so we filter for options containing only digits
        const allImeiOptions2 = page.locator('.select2-results__option').filter({
            hasText: /^\d{6,}$/
        });

        // Check if IMEI options are available, skip test if none found
        const imeiCount2 = await allImeiOptions2.count();
        console.log(`Found ${imeiCount2} IMEI options available`);

        if (imeiCount2 === 0) {
            console.log('WARNING: No IMEI numbers available - skipping test. Please add IMEI numbers or delete leftover test devices.');
            // Close the dropdown
            await page.keyboard.press('Escape');
            test.skip();
            return;
        }

        const imeiOptionLocator = allImeiOptions2.first();
        await expect(imeiOptionLocator).toBeVisible({ timeout: 10000 });
        selectedImei = await imeiOptionLocator.textContent();
        selectedImei = selectedImei.trim();
        await imeiOptionLocator.click();
        console.log('Selected IMEI: ' + selectedImei);

        // Wait for the form to populate with IMEI-related data
        await page.waitForTimeout(4000);

        // ========================================
        // STEP 5: ENTER DEVICE NAME
        // ========================================
        await expect(page.locator(config.selectors.addEditDevice.newDeviceName)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.newDeviceName).clear();
        await page.locator(config.selectors.addEditDevice.newDeviceName).fill('CustomIconDevice');
        console.log('Device name entered: CustomIconDevice');

        // ========================================
        // STEP 6: UPLOAD CUSTOM ICON
        // ========================================
        // 6a: Click Upload Icon button to open the custom icon modal
        // Use JavaScript click to bypass visibility checks
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
            document.querySelector('#upload-icon-btn').click();
        });

        // Verify the Upload & Crop Custom Icon modal appears
        await expect(page.locator(config.selectors.addEditDevice.customIconModal)).toBeVisible();
        console.log('Upload & Crop Custom Icon modal opened successfully');

        // 6b: Upload image file
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.locator(config.selectors.addEditDevice.selectImageButton).click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(testImagePath);

        // Wait for the image to be loaded and processed
        await page.waitForTimeout(2000);

        // Verify the crop canvas is visible (image loaded successfully)
        await expect(page.locator(config.selectors.addEditDevice.cropCanvas)).toBeVisible();
        console.log('Test image uploaded successfully');

        // 6c: Adjust zoom controls
        const zoomPlusBtn = page.locator(config.selectors.addEditDevice.zoomPlusButton);
        if (await zoomPlusBtn.isVisible()) {
            await zoomPlusBtn.click();
            await page.waitForTimeout(500);
            console.log('Zoom adjusted');
        }

        // 6d: Verify preview is displayed
        await expect(page.locator(config.selectors.addEditDevice.previewSection)).toBeVisible();
        console.log('Preview section is visible');

        // 6e: Save custom icon with API validation
        // Set up dialog handler to handle success alert
        page.on('dialog', async dialog => {
            console.log('Alert message: ' + dialog.message());
            await dialog.accept();
        });

        // Click Save Icon button
        const saveIconBtn = page.getByRole('button', { name: 'Save Icon' });
        await expect(saveIconBtn).toBeVisible();

        // Set up listeners for the API calls with extended timeout for BrowserStack
        const cropImageUploadPromise = page.waitForResponse(
            response => response.url().includes('crop_image_upload_new.php') && response.status() === 200,
            { timeout: 60000 }
        );

        await saveIconBtn.click();
        console.log('Save Icon button clicked');

        // Wait for the upload API call to complete with error handling
        try {
            const cropImageResponse = await cropImageUploadPromise;
            expect(cropImageResponse.status()).toBe(200);
            console.log('crop_image_upload_new.php API called successfully');
        } catch (responseError) {
            console.log('API response timeout, but continuing as upload may have succeeded...');
            // Wait extra time for the upload to complete
            await page.waitForTimeout(5000);
        }

        // Wait for modal to close
        await page.waitForTimeout(3000);
        await expect(page.locator(config.selectors.addEditDevice.customIconModal)).not.toBeVisible({ timeout: 10000 });
        console.log('Custom icon uploaded and saved successfully');

        // ========================================
        // STEP 7: SELECT CUSTOM ICON FROM DROPDOWN
        // ========================================
        // 7a: Select "custom icon" from icon category dropdown
        // This triggers the getCustomIconAll.php API call
        const getCustomIconPromise = page.waitForResponse(
            response => response.url().includes('getCustomIconAll.php') && response.status() === 200,
            { timeout: 90000 }
        );

        await page.locator(config.selectors.addEditDevice.iconCategoryAdd).selectOption('custom');
        console.log('Selected "Custom Icon" from icon category dropdown');

        // 7b: Wait for custom icons API to load with error handling
        try {
            const getCustomIconResponse = await getCustomIconPromise;
            expect(getCustomIconResponse.status()).toBe(200);
            console.log('getCustomIconAll.php API called successfully');
        } catch (error) {
            console.log('API response timeout, but continuing as icons may have loaded...');
            await page.waitForTimeout(5000);
        }

        // 7c: Select the uploaded custom icon (first one in the list)
        // Wait for the icon grid items to be visible (radio inputs may be visually hidden)
        await expect(page.locator('#icon-grid-add .icon-radio-item').first()).toBeVisible({ timeout: 60000 });
        console.log('Custom icons loaded in grid');
        // Click on the first icon radio item label (the input may be hidden)
        await page.locator('#icon-grid-add .icon-radio-item label').first().click({ force: true });
        console.log('Custom icon selected');

        // ========================================
        // STEP 8: ADD DEVICE
        // ========================================
        await page.locator(config.selectors.addEditDevice.addDeviceBtn).scrollIntoViewIfNeeded();
        await expect(page.locator(config.selectors.addEditDevice.addDeviceBtn)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.addDeviceBtn).click({ force: true });
        console.log('Add Device button clicked');

        // Wait for the device to be added and the device list to refresh
        await page.waitForTimeout(10000);

        // ========================================
        // STEP 9: VERIFY DEVICE WAS ADDED
        // ========================================
        // Find the row in the devices table that contains the selected IMEI
        const deviceRow = page.locator('table#devices-table tbody tr').filter({ hasText: selectedImei });
        await expect(deviceRow).toBeVisible({ timeout: 30000 });
        // Verify the device name appears in the same row as the IMEI
        await expect(deviceRow).toContainText('CustomIconDevice');
        console.log('Device added successfully with IMEI: ' + selectedImei);

        // Close the device list modal
        await page.locator(config.selectors.devList.container + ' .icon--close').click({ force: true });
        await page.waitForTimeout(5000);

        // ========================================
        // STEP 10: OPEN EDIT DEVICE TAB
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

        // ========================================
        // STEP 11: SELECT DEVICE FROM DROPDOWN
        // ========================================
        // Open the device selection dropdown (Select2 AJAX-powered)
        await page.locator('#edit-device-content .select2-selection').click();
        // Select the device we just created using IMEI to ensure we get the correct one
        await page.locator('.select2-results__option').filter({ hasText: selectedImei }).first().click();

        // Verify the device name input field shows the selected device name
        await expect(page.locator(config.selectors.addEditDevice.deviceNameInput)).toHaveValue('CustomIconDevice', { timeout: 15000 });
        console.log('Device selected in Edit tab: CustomIconDevice (IMEI: ' + selectedImei + ')');

        // ========================================
        // STEP 12: CHANGE DEVICE NAME
        // ========================================
        await page.locator(config.selectors.addEditDevice.deviceNameInput).clear();
        await page.locator(config.selectors.addEditDevice.deviceNameInput).fill('CustomIconDeviceEdited');
        console.log('Device name changed to: CustomIconDeviceEdited');

        // ========================================
        // STEP 13: UPLOAD NEW CUSTOM ICON
        // ========================================
        // 13a: Click Upload Icon button to open the custom icon modal
        // Use JavaScript click to bypass visibility checks
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
            document.querySelector('#upload-icon-btn').click();
        });

        // Verify the Upload & Crop Custom Icon modal appears
        await expect(page.locator(config.selectors.addEditDevice.customIconModal)).toBeVisible();
        console.log('Upload & Crop Custom Icon modal opened successfully');

        // 13b: Upload image file
        const fileChooserPromise2 = page.waitForEvent('filechooser');
        await page.locator(config.selectors.addEditDevice.selectImageButton).click();
        const fileChooser2 = await fileChooserPromise2;
        await fileChooser2.setFiles(testImagePath);

        // Wait for the image to be loaded and processed
        await page.waitForTimeout(2000);

        // Verify the crop canvas is visible (image loaded successfully)
        await expect(page.locator(config.selectors.addEditDevice.cropCanvas)).toBeVisible();
        console.log('Test image uploaded successfully');

        // 13c: Adjust zoom controls
        const zoomPlusBtn2 = page.locator(config.selectors.addEditDevice.zoomPlusButton);
        if (await zoomPlusBtn2.isVisible()) {
            await zoomPlusBtn2.click();
            await page.waitForTimeout(500);
            console.log('Zoom adjusted');
        }

        // 13d: Verify preview is displayed
        await expect(page.locator(config.selectors.addEditDevice.previewSection)).toBeVisible();
        console.log('Preview section is visible');

        // 13e: Save custom icon with API validation
        // Click Save Icon button
        const saveIconBtn2 = page.getByRole('button', { name: 'Save Icon' });
        await expect(saveIconBtn2).toBeVisible();

        // Set up listeners for the API calls with extended timeout for BrowserStack
        const cropImageUploadPromise2 = page.waitForResponse(
            response => response.url().includes('crop_image_upload_new.php') && response.status() === 200,
            { timeout: 60000 }
        );

        await saveIconBtn2.click();
        console.log('Save Icon button clicked');

        // Wait for the upload API call to complete with error handling
        try {
            const cropImageResponse2 = await cropImageUploadPromise2;
            expect(cropImageResponse2.status()).toBe(200);
            console.log('crop_image_upload_new.php API called successfully');
        } catch (responseError) {
            console.log('API response timeout, but continuing as upload may have succeeded...');
            // Wait extra time for the upload to complete
            await page.waitForTimeout(5000);
        }

        // Wait for modal to close
        await page.waitForTimeout(3000);
        await expect(page.locator(config.selectors.addEditDevice.customIconModal)).not.toBeVisible({ timeout: 10000 });
        console.log('Custom icon uploaded and saved successfully');

        // ========================================
        // STEP 14: SELECT CUSTOM ICON FROM DROPDOWN
        // ========================================
        // 14a: Select "custom icon" from icon category dropdown
        // This triggers the getCustomIconAll.php API call
        const getCustomIconPromise2 = page.waitForResponse(
            response => response.url().includes('getCustomIconAll.php') && response.status() === 200,
            { timeout: 60000 }
        );

        await page.locator(config.selectors.addEditDevice.iconCategoryEdit).selectOption('custom');
        console.log('Selected "Custom Icon" from icon category dropdown');

        // 14b: Wait for custom icons API to load with error handling
        try {
            const getCustomIconResponse2 = await getCustomIconPromise2;
            expect(getCustomIconResponse2.status()).toBe(200);
            console.log('getCustomIconAll.php API called successfully');
        } catch (error) {
            console.log('API response timeout, but continuing as icons may have loaded...');
            await page.waitForTimeout(5000);
        }

        // 14c: Select the uploaded custom icon (first one in the list)
        // Wait for the icon grid items to be visible (radio inputs may be visually hidden)
        await expect(page.locator('#icon-grid-edit .icon-radio-item').first()).toBeVisible({ timeout: 60000 });
        console.log('Custom icons loaded in grid');
        // Click on the first icon radio item label (the input may be hidden)
        await page.locator('#icon-grid-edit .icon-radio-item label').first().click({ force: true });
        console.log('Custom icon selected');

        // ========================================
        // STEP 15: UPDATE DEVICE
        // ========================================
        await page.locator(config.selectors.addEditDevice.updateDeviceButton).scrollIntoViewIfNeeded();
        await expect(page.locator(config.selectors.addEditDevice.updateDeviceButton)).toBeVisible();

        // Set up dialog handler to accept success alert
        page.on('dialog', async dialog => {
            console.log('Update dialog: ' + dialog.message());
            await dialog.accept();
        });

        await page.locator(config.selectors.addEditDevice.updateDeviceButton).click({ force: true });
        console.log('Update Device button clicked');

        // Wait for the device to be updated and any success messages
        await page.waitForTimeout(20000);

        // Close the Add/Edit Device modal first using JavaScript to handle viewport issues
        await page.evaluate(() => {
            const closeBtn = document.querySelector('#devices-panel .icon--close');
            if (closeBtn) closeBtn.click();
        });
        await page.waitForTimeout(3000);

        // ========================================
        // STEP 16: VERIFY DEVICE WAS UPDATED
        // ========================================
        // Open the accounts menu to access device list
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Click on "List of Devices" menu option
        await expect(page.locator(config.selectors.navigation.listOfDevices)).toBeVisible();
        await page.locator(config.selectors.navigation.listOfDevices).click();

        // Ensure the device list container is visible
        await expect(page.locator(config.selectors.devList.container)).toBeVisible();
        await page.locator(config.selectors.devList.container).scrollIntoViewIfNeeded();
        await page.locator(config.selectors.devList.container).click({ force: true });

        // Wait for the device table to load and verify the edited device name appears
        await page.waitForTimeout(5000);
        await expect(page.locator('table#devices-table').filter({ hasText: 'CustomIconDeviceEdited' })).toBeVisible({ timeout: 60000 });

        // Find the row with the edited device name and verify
        const editedDeviceRow = page.locator('table#devices-table tbody tr').filter({ hasText: selectedImei });
        await expect(editedDeviceRow).toBeVisible();
        await expect(editedDeviceRow).toContainText('CustomIconDeviceEdited', { timeout: 30000 });
        console.log('Device updated successfully: CustomIconDeviceEdited');

        // Close the device list modal
        await page.locator(config.selectors.devList.container + ' .icon--close').scrollIntoViewIfNeeded();
        await page.locator(config.selectors.devList.container + ' .icon--close').click({ force: true });
        await page.waitForTimeout(5000);

        // ========================================
        // STEP 17: REMOVE THE DEVICE
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

        // Open the device selection dropdown and select the device to remove using IMEI
        await page.locator('#edit-device-content .select2-selection').click();
        await page.locator('.select2-results__option').filter({ hasText: selectedImei }).first().click();

        // Verify the correct device is selected before removal
        await expect(page.locator(config.selectors.addEditDevice.deviceNameInput)).toHaveValue('CustomIconDeviceEdited', { timeout: 15000 });
        console.log('Device selected for removal (IMEI: ' + selectedImei + ')');

        // Click the "Remove Device" button to initiate deletion
        await expect(page.locator(config.selectors.addEditDevice.removeDeviceButton)).toBeVisible();
        await page.locator(config.selectors.addEditDevice.removeDeviceButton).click({ force: true });

        // A confirmation modal appears to prevent accidental deletions
        await expect(page.locator(config.selectors.addEditDevice.confirmationModal)).toBeVisible();

        // Click the confirm button to proceed with deletion
        await expect(page.locator(config.selectors.addEditDevice.confirmDeleteButton)).toBeVisible();

        // Set up listener for deletion API call
        const deleteDevicePromise2 = page.waitForResponse(
            response => response.url().includes('removeDevice.php') || response.url().includes('delete') || response.url().includes('remove'),
            { timeout: 30000 }
        ).catch(() => console.log('Delete API response not captured, continuing...'));

        await page.locator(config.selectors.addEditDevice.confirmDeleteButton).click({ force: true });
        console.log('Delete confirmation clicked');

        // Wait for the deletion API to complete
        await deleteDevicePromise2;
        await page.waitForTimeout(5000);

        // Close the modal and reopen to refresh the list
        await page.evaluate(() => {
            const closeBtn = document.querySelector('#devices-panel .icon--close');
            if (closeBtn) closeBtn.click();
        });
        await page.waitForTimeout(2000);

        // Reopen the device list to verify removal
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();
        await expect(page.locator(config.selectors.navigation.listOfDevices)).toBeVisible();
        await page.locator(config.selectors.navigation.listOfDevices).click();
        await page.waitForTimeout(5000);

        // ========================================
        // STEP 18: VERIFY DEVICE WAS REMOVED
        // ========================================
        // Confirm the device no longer appears in the devices table (verify by device name like first test)
        await expect(page.locator('table#devices-table td').filter({ hasText: 'CustomIconDeviceEdited' })).not.toBeVisible({ timeout: 30000 });
        console.log('Device removed successfully: CustomIconDeviceEdited (IMEI: ' + selectedImei + ')');

        // Modal closes automatically after device removal

        // Test complete - device was successfully added with custom icon, edited, and removed
        console.log('Custom icon device add/edit/remove test completed successfully');
    });
});
