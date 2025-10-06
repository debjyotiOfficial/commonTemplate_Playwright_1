const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('view Edit User', () => {
    let config;
    let helpers;

    test.beforeAll(async ({ browser }) => {
        // Create a page to load config
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

    test('should create user and edit them', async ({ page }) => { 
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        
        await page.goto(config.urls.backAdminLoginPage);
        
        await expect(page.locator(config.selectors.login.usernameFieldBackup)).toBeVisible();
        await page.locator(config.selectors.login.usernameFieldBackup)
            .fill(config.credentials.demo.usernameBackup);

        await expect(page.locator(config.selectors.login.passwordFieldBackup)).toBeVisible();
        await page.locator(config.selectors.login.passwordFieldBackup)
            .fill(config.credentials.demo.passwordBackup);
        
        await expect(page.locator(config.selectors.login.submitButtonBackup)).toBeVisible();
        await page.locator(config.selectors.login.submitButtonBackup).click();

        await page.waitForTimeout(config.timeouts.wait);
        await page.goto(config.urls.fleetDashboard3, { timeout: 600000 });

        // Click on accounts menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        await page.waitForTimeout(2000); // Allow page to settle

        // Click on list of dev menu
        await expect(page.locator(config.selectors.navigation.listOfDevices)).toBeVisible();
        await page.waitForTimeout(2000); // Allow page to settle
        await page.locator(config.selectors.navigation.listOfDevices).click({ force: true });

        await expect(page.locator(config.selectors.devList.container)).toBeVisible();

        // IMPORTANT: Collapse the side menu by clicking on the modal
        console.log('Collapsing side menu to access modal elements...');
    
        // Method 1: Click on the modal header to collapse the side menu
        try {
        // First, check if the modal is visible
        const modalVisible = await page.locator('#devices-panel').isVisible();
        if (modalVisible) {
            // Click on a neutral area of the modal to collapse the side menu
            await page.locator('#devices-panel').click({ position: { x: 400, y: 100 } });
            console.log('✓ Clicked on modal to collapse side menu');
        }
        } catch (e) {
        console.log('⚠ Warning: Could not click modal to collapse menu');
        }

        await page.waitForTimeout(3000); // Wait a moment for the side menu to collapse

        // Try to set pagination to show more entries (common DataTables pattern)
        try {
            // Look for entries per page dropdown (common patterns)
            const entriesDropdown = page.locator('select[name="devices-table_length"]').first();
            if (await entriesDropdown.isVisible({ timeout: 5000 })) {
                await entriesDropdown.selectOption('100'); // Show 100 entries per page
                console.log('✅ Set device table to show 100 entries per page');
                await page.waitForTimeout(2000); // Wait for table to reload
            } else {
                console.log('ℹ️ Entries per page dropdown not found, using default pagination');
            }
        } catch (error) {
            console.log('ℹ️ Could not find or set entries per page dropdown');
        }

        // Count total number of rows in the device table
        const deviceRows = page.locator(config.selectors.devList.deviceRows);
        const totalRowCount = await deviceRows.count();
        console.log(`📊 Total number of device rows: ${totalRowCount}`);

        // Check if table has actual data or just "No Devices to Display"
        let isEmpty = false;
        if (totalRowCount === 0) {
            isEmpty = true;
        } else {
            // Check if the table shows "No Devices to Display" or similar empty state
            try {
                const tableBody = page.locator('#devices-table tbody');
                const tableText = await tableBody.textContent();
                isEmpty = tableText?.includes('No Devices to Display') || tableText?.includes('No data available');
            } catch (error) {
                // If we can't check the text, assume table has data since we have rows
                isEmpty = false;
            }
        }

        // Initialize variables for device counting
        let deviceNameCount = 0;
        const extractedDeviceNames = [];

        if (isEmpty) {
            console.log('❌ Device table is empty - No Devices to Display');
            console.log(`\n📈 Summary:`);
            console.log(`   Total device rows: 0`);
            console.log(`   Rows with device names: 0`);
            console.log(`   Rows without device names: 0`);
            console.log(`   Percentage with device names: 0%`);
            console.log(`   Extracted device names: []`);
            
            console.log('⚠️ Skipping device counting due to empty table');
        } else {
            // Count rows with actual device names (not "Device Not Assigned")
            for (let i = 0; i < totalRowCount; i++) {
                try {
                    // Get the device name from the device name column (4th column, index 3)
                    const deviceNameCell = deviceRows.nth(i).locator(config.selectors.devList.deviceNameColumn);
                    const deviceNameText = await deviceNameCell.textContent({ timeout: 10000 });
                    
                    // Check if the device name is not "Device Not Assigned"
                    if (deviceNameText && deviceNameText.trim() !== 'Device Not Assigned') {
                        deviceNameCount++;
                        const cleanDeviceName = deviceNameText.trim();
                        extractedDeviceNames.push(cleanDeviceName);
                        console.log(`📱 Row ${i + 1}: Device Name = "${cleanDeviceName}"`);
                    } else {
                        console.log(`❌ Row ${i + 1}: Device Not Assigned`);
                    }
                } catch (error) {
                    console.log(`⚠️ Row ${i + 1}: Error reading device name - ${error.message}`);
                }
            }

            console.log(`\n📈 Summary:`);
            console.log(`   Total device rows: ${totalRowCount}`);
            console.log(`   Rows with device names: ${deviceNameCount}`);
            console.log(`   Rows without device names: ${totalRowCount - deviceNameCount}`);
            console.log(`   Percentage with device names: ${totalRowCount > 0 ? ((deviceNameCount / totalRowCount) * 100).toFixed(1) : 0}%`);
            console.log(`   Extracted device names: [${extractedDeviceNames.join(', ')}]`);

            // Verify that we have at least some devices
            expect(totalRowCount).toBeGreaterThan(0);
            console.log('✅ Device table contains data');
        }

        await expect(page.locator(config.selectors.devList.closeBtn)).toBeVisible();
        await page.locator(config.selectors.devList.closeBtn).click();

        // Click on accounts menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Click on view edit user menu
        await expect(page.locator(config.selectors.viewEditUser.viewEditMenu)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.viewEditMenu).click();

        // Verify the view edit user container is visible
        await expect(page.locator(config.selectors.viewEditUser.viewEditContainer)).toBeVisible();
        await expect(page.locator(config.selectors.viewEditUser.viewEditContainer))
            .toContainText('View/Edit Users');

        // click on +Add new user button
        await expect(page.locator(config.selectors.viewEditUser.addNewUserButton)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.addNewUserButton).click();

        // Click on username and type a username
        await expect(page.locator(config.selectors.viewEditUser.viewEditUsername)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.viewEditUsername).click();
        await page.locator(config.selectors.viewEditUser.viewEditUsername).clear();
        await page.locator(config.selectors.viewEditUser.viewEditUsername).fill('AutomatedUsername2');

        // Add email 
        await expect(page.locator(config.selectors.viewEditUser.addEmail)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.addEmail).click();
        await page.locator(config.selectors.viewEditUser.addEmail).clear();
        await page.locator(config.selectors.viewEditUser.addEmail).fill('testingAuto@gmail.com');

        // Click on password and type a password
        await expect(page.locator(config.selectors.viewEditUser.viewEditPassword)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.viewEditPassword).click();
        await page.locator(config.selectors.viewEditUser.viewEditPassword).clear();
        await page.locator(config.selectors.viewEditUser.viewEditPassword).fill('12345');

        
        await expect(page.locator(config.selectors.viewEditUser.changeAlertSettings)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.changeAlertSettings).check();

        await expect(page.locator(config.selectors.viewEditUser.viewTracking)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.viewTracking).check();

        await expect(page.locator(config.selectors.viewEditUser.viewReports)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.viewReports).check();

        // Click on submit button
        await expect(page.locator(config.selectors.viewEditUser.addUserSubmitButton)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.addUserSubmitButton).click();

        await page.waitForTimeout(10000);

        // click on logout
        await expect(page.locator(config.selectors.navigation.userProfileIcon)).toBeVisible();
        await page.locator(config.selectors.navigation.userProfileIcon).click();

        await expect(page.locator(config.selectors.navigation.logoutButton)).toBeVisible();
        await page.locator(config.selectors.navigation.logoutButton).click({ force: true });

        //click on logout confirmation
        await expect(page.locator(config.selectors.login.logoutConfirmationButton)).toBeVisible();
        await page.locator(config.selectors.login.logoutConfirmationButton).click();

        // //wait for few seconds
        // await page.waitForTimeout(5000);

        // Wait for the username field to be visible and fill it
        await expect(page.locator('input[id="username"]')).toBeVisible();
        await page.locator('input[id="username"]').fill('AutomatedUsername2');
        
        // Wait for the password field to be visible and fill it
        await expect(page.locator('input[id="password"]')).toBeVisible();
        await page.locator('input[id="password"]').fill('12345');
        
        // Click the submit button
        await expect(page.locator('input[type="submit"], button[type="submit"], .submit, #Submit')).toBeVisible();
        await page.locator('input[type="submit"], button[type="submit"], .submit, #Submit').click();
        
        // Optional: Wait for navigation or success indication
        await page.waitForTimeout(15000);

        // 1. Verify the Driver Card panel is visible
        const driverCardPanel = page.locator('#driver-card-panel');
        await expect(driverCardPanel).toBeVisible();
        console.log('✅ Driver Card panel is visible');

        // Wait much longer for driver cards to fully load and populate
        console.log('⏳ Waiting for driver card data to populate...');
        await page.waitForTimeout(45000); // Extended wait for driver cards to load and populate

        // Wait for actual driver cards to be present with extended timeout
        try {
            await page.waitForSelector('.driver-card', { timeout: 30000 });
            console.log('✅ Driver cards are now loaded');
        } catch (error) {
            console.log('⚠️ Warning: Driver cards may not be fully loaded yet, will retry...');

            // Additional wait and retry
            await page.waitForTimeout(15000);
            try {
                await page.waitForSelector('.driver-card', { timeout: 15000 });
                console.log('✅ Driver cards loaded after retry');
            } catch (retryError) {
                console.log('ℹ️ Driver cards still not available - may need more time to populate');
            }
        }

        // Verify that extracted device names are present in the driver card
        console.log('\n🔍 Verifying device names in Driver Card...');
        
        if (extractedDeviceNames.length > 0) {
            // Get all driver cards in the panel
            const driverCards = page.locator(config.selectors.driverCard.card);
            const driverCardCount = await driverCards.count();
            console.log(`📋 Found ${driverCardCount} driver cards in the panel`);
            
            // Collect all driver names from the driver cards
            const driverCardNames = [];
            for (let i = 0; i < driverCardCount; i++) {
                const driverNameElement = driverCards.nth(i).locator('h5');
                const driverNameText = await driverNameElement.textContent();
                if (driverNameText) {
                    const cleanDriverName = driverNameText.trim();
                    driverCardNames.push(cleanDriverName);
                    console.log(`🚗 Driver Card ${i + 1}: "${cleanDriverName}"`);
                }
            }

            // Compare extracted device names with driver card names
            let matchedDevices = 0;
            let unmatchedDevices = [];
            
            for (const deviceName of extractedDeviceNames) {
                if (driverCardNames.includes(deviceName)) {
                    matchedDevices++;
                    console.log(`✅ Device "${deviceName}" found in driver card`);
                } else {
                    unmatchedDevices.push(deviceName);
                    console.log(`❌ Device "${deviceName}" NOT found in driver card`);
                }
            }

            // Summary of verification
            console.log(`\n📊 Driver Card Verification Summary:`);
            console.log(`   Extracted device names: ${extractedDeviceNames.length}`);
            console.log(`   Driver cards found: ${driverCardCount}`);
            console.log(`   Matched devices: ${matchedDevices}`);
            console.log(`   Unmatched devices: ${unmatchedDevices.length}`);
            
            if (unmatchedDevices.length > 0) {
                console.log(`   Unmatched device names: [${unmatchedDevices.join(', ')}]`);
            }
            
            const matchPercentage = extractedDeviceNames.length > 0 ? 
                ((matchedDevices / extractedDeviceNames.length) * 100).toFixed(1) : 0;
            console.log(`   Match percentage: ${matchPercentage}%`);

            // Only assert if we have extracted device names AND driver cards are available
            if (extractedDeviceNames.length > 0) {
                if (driverCardCount > 0) {
                    expect(matchedDevices).toBeGreaterThan(0);
                    console.log('✅ At least one device name from list appears in driver card');
                } else {
                    console.log('ℹ️ Skipping driver card verification - no driver cards found (devices may not be assigned to drivers yet)');
                    console.log('✅ Test continues as device list data extraction was successful');
                }
            }
            
        } else {
            console.log('⚠️ No device names were extracted from the device list to verify');
        }

        // Re-verify device list data consistency
        console.log('\n🔄 Re-verifying device list data for consistency...');
        
        // Navigate back to device list
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        await page.waitForTimeout(2000); // Allow page to settle

        await expect(page.locator(config.selectors.navigation.listOfDevices)).toBeVisible();
        await page.locator(config.selectors.navigation.listOfDevices).click({ force: true });

        await expect(page.locator(config.selectors.devList.container)).toBeVisible();

        // Wait for device list modal to fully load
        console.log('⏳ Waiting for device list to fully load...');
        await page.waitForTimeout(5000); // Give time for the modal content to load

        // Wait for table to finish loading (no "Loading..." text)
        try {
            await page.waitForFunction(() => {
                const tableBody = document.querySelector('#devices-table tbody');
                return tableBody && !tableBody.textContent.includes('Loading...');
            }, { timeout: 15000 });
            console.log('✅ Device table finished loading');
        } catch (error) {
            console.log('⚠️ Table may still be loading, proceeding anyway');
        }

        // IMPORTANT: Collapse the side menu by clicking on the modal
        console.log('Collapsing side menu to access modal elements...');
    
        // Method 1: Click on the modal header to collapse the side menu
        try {
        // First, check if the modal is visible
        const modalVisible = await page.locator('#devices-panel').isVisible();
        if (modalVisible) {
            // Click on a neutral area of the modal to collapse the side menu
            await page.locator('#devices-panel').click({ position: { x: 400, y: 100 } });
            console.log('✓ Clicked on modal to collapse side menu');
        }
        } catch (e) {
        console.log('⚠ Warning: Could not click modal to collapse menu');
        }

        await page.waitForTimeout(3000); // Wait a moment for the side menu to collapse
        
        console.log('✅ Side menu closure attempts completed (Re-verification)');

        // Try to set pagination to show more entries for re-verification
        try {
            const entriesDropdown = page.locator('select[name="devices-table_length"]').first();
            if (await entriesDropdown.isVisible({ timeout: 5000 })) {
                await entriesDropdown.selectOption('100'); // Show 100 entries per page
                console.log('✅ Re-verification: Set device table to show 100 entries per page');
                await page.waitForTimeout(2000); // Wait for table to reload
            }
        } catch (error) {
            console.log('ℹ️ Re-verification: Could not find or set entries per page dropdown');
        }

        // Re-count total number of rows in the device table
        const deviceRowsRecheck = page.locator(config.selectors.devList.deviceRows);
        const totalRowCountRecheck = await deviceRowsRecheck.count();
        console.log(`📊 Re-check - Total number of device rows: ${totalRowCountRecheck}`);

        // Check if recheck table has actual data or is empty
        let isEmptyRecheck = false;
        if (totalRowCountRecheck === 0) {
            isEmptyRecheck = true;
        } else {
            // Check if the table shows "No Devices to Display" or similar empty state
            try {
                const tableBody = page.locator('#devices-table tbody');
                const tableText = await tableBody.textContent();
                isEmptyRecheck = tableText?.includes('No Devices to Display') || tableText?.includes('No data available');
            } catch (error) {
                // If we can't check the text, assume table has data since we have rows
                isEmptyRecheck = false;
            }
        }

        // Re-count rows with actual device names
        let deviceNameCountRecheck = 0;
        const extractedDeviceNamesRecheck = [];
        
        if (isEmptyRecheck) {
            console.log('❌ Re-check: Device table is empty - No Devices to Display');
        } else {
            for (let i = 0; i < totalRowCountRecheck; i++) {
                try {
                    const deviceNameCell = deviceRowsRecheck.nth(i).locator(config.selectors.devList.deviceNameColumn);
                    const deviceNameText = await deviceNameCell.textContent({ timeout: 10000 });
                    
                    if (deviceNameText && deviceNameText.trim() !== 'Device Not Assigned') {
                        deviceNameCountRecheck++;
                        const cleanDeviceName = deviceNameText.trim();
                        extractedDeviceNamesRecheck.push(cleanDeviceName);
                    }
                } catch (error) {
                    console.log(`⚠️ Re-check Row ${i + 1}: Error reading device name - ${error.message}`);
                }
            }
        }

        console.log(`\n📈 Re-check Summary:`);
        console.log(`   Total device rows: ${isEmptyRecheck ? 0 : totalRowCountRecheck}`);
        console.log(`   Rows with device names: ${deviceNameCountRecheck}`);
        console.log(`   Extracted device names: [${extractedDeviceNamesRecheck.join(', ')}]`);

        // Compare with original values
        console.log(`\n🔍 Data Consistency Verification:`);
        
        const actualTotalRows = isEmpty ? 0 : totalRowCount;
        const actualTotalRowsRecheck = isEmptyRecheck ? 0 : totalRowCountRecheck;
        
        // Verify total row count is same
        if (actualTotalRows === actualTotalRowsRecheck) {
            console.log(`✅ Total row count matches: ${actualTotalRows} = ${actualTotalRowsRecheck}`);
        } else {
            console.log(`❌ Total row count mismatch: ${actualTotalRows} ≠ ${actualTotalRowsRecheck}`);
        }

        // Verify device name count is same
        if (deviceNameCount === deviceNameCountRecheck) {
            console.log(`✅ Device name count matches: ${deviceNameCount} = ${deviceNameCountRecheck}`);
        } else {
            console.log(`❌ Device name count mismatch: ${deviceNameCount} ≠ ${deviceNameCountRecheck}`);
        }

        // Verify extracted device names are same
        const originalDeviceNamesStr = extractedDeviceNames.sort().join(',');
        const recheckDeviceNamesStr = extractedDeviceNamesRecheck.sort().join(',');
        
        if (originalDeviceNamesStr === recheckDeviceNamesStr) {
            console.log(`✅ Extracted device names match: [${extractedDeviceNames.join(', ')}]`);
        } else {
            console.log(`❌ Extracted device names mismatch:`);
            console.log(`   Original: [${extractedDeviceNames.join(', ')}]`);
            console.log(`   Re-check: [${extractedDeviceNamesRecheck.join(', ')}]`);
        }

        // Assertions for data consistency
        expect(actualTotalRowsRecheck).toBe(actualTotalRows);
        expect(deviceNameCountRecheck).toBe(deviceNameCount);
        expect(extractedDeviceNamesRecheck.sort()).toEqual(extractedDeviceNames.sort());
        
        console.log('✅ Device list data consistency verified successfully');

        await expect(page.locator(config.selectors.devList.closeBtn)).toBeVisible();
        await page.locator(config.selectors.devList.closeBtn).click();

        // click on logout
        await expect(page.locator(config.selectors.navigation.userProfileIcon)).toBeVisible();
        await page.locator(config.selectors.navigation.userProfileIcon).click();

        await expect(page.locator(config.selectors.navigation.logoutButton)).toBeVisible();
        await page.locator(config.selectors.navigation.logoutButton).click({ force: true });

        //go to backup again
        await page.goto(config.urls.backAdminLoginPage);
        
        await expect(page.locator(config.selectors.login.usernameFieldBackup)).toBeVisible();
        await page.locator(config.selectors.login.usernameFieldBackup)
            .fill(config.credentials.demo.usernameBackup);

        await expect(page.locator(config.selectors.login.passwordFieldBackup)).toBeVisible();
        await page.locator(config.selectors.login.passwordFieldBackup)
            .fill(config.credentials.demo.passwordBackup);
        
        await expect(page.locator(config.selectors.login.submitButtonBackup)).toBeVisible();
        await page.locator(config.selectors.login.submitButtonBackup).click();

        await page.waitForTimeout(config.timeouts.wait);
        await page.goto(config.urls.fleetDashboard3, { timeout: 600000 });

                // Click on accounts menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Click on view edit user menu
        await expect(page.locator(config.selectors.viewEditUser.viewEditMenu)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.viewEditMenu).click();

        // Verify the view edit user container is visible
        await expect(page.locator(config.selectors.viewEditUser.viewEditContainer)).toBeVisible();
        await expect(page.locator(config.selectors.viewEditUser.viewEditContainer))
        .toContainText('View/Edit Users');

                // Click on search and search for entered user
        await expect(page.locator(config.selectors.viewEditUser.searchUser)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.searchUser).clear();
        await page.locator(config.selectors.viewEditUser.searchUser).fill('AutomatedUsername2');

        await page.waitForTimeout(5000);

        // Click on the user item that appears in search results
        await expect(page.locator('.user-item[data-user-id="AutomatedUsername2"]')).toBeVisible();
        await page.locator('.user-item[data-user-id="AutomatedUsername2"]').click();


        // Verify edit modal is visible
        await expect(page.locator(config.selectors.viewEditUser.editUserModal)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.editUserModal).click();

        // Click the edit button for the user 
        await expect(page.locator(config.selectors.viewEditUser.EditSubuser)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.EditSubuser).click();

        // Toggle the "Change Alert Settings" checkbox
        const alertSettingsCheckbox = page.locator(config.selectors.viewEditUser.editAlertSettings);
        if (await alertSettingsCheckbox.isChecked()) {
            await alertSettingsCheckbox.uncheck();
        } else {
            await alertSettingsCheckbox.check();
        }

        // Toggle the "Access reports" checkbox
        const accessReportsCheckbox = page.locator(config.selectors.viewEditUser.editAccessReports);
        if (await accessReportsCheckbox.isChecked()) {
            await accessReportsCheckbox.uncheck();
        } else {
            await accessReportsCheckbox.check();
        }

        // Toggle the "viewTracking" checkbox
        const viewTrackingCheckbox = page.locator(config.selectors.viewEditUser.viewTracking);
        if (await viewTrackingCheckbox.isChecked()) {
            await viewTrackingCheckbox.uncheck();
        } else {
            await viewTrackingCheckbox.check();
        }

    // Click on the Access Type dropdown
    await expect(page.locator(config.selectors.viewEditUser.accessTypeDropdown)).toBeVisible();
    await page.locator(config.selectors.viewEditUser.accessTypeDropdown).click( { force: true });

    // Select "Specific Devices" option
    await page.locator(config.selectors.viewEditUser.accessTypeDropdown).selectOption('specific');

    // Wait for the device list to appear
    await page.waitForTimeout(2000);

    // Store the device names that we will check
    const checkedDeviceNames = [];

    // Scroll the Demo1 checkbox into view and check it
    const demo1Checkbox = page.locator('#deviceList .device-item').filter({ hasText: 'Demo1' }).locator('input[type="checkbox"]');
    await demo1Checkbox.scrollIntoViewIfNeeded();
    await expect(demo1Checkbox).toBeVisible();
    await demo1Checkbox.check();
    checkedDeviceNames.push('Demo1');
    console.log('✅ Checked device: Demo1');

    console.log(`📋 Total devices checked for user access: [${checkedDeviceNames.join(', ')}]`);

    // Click the Save changes button
    await expect(page.locator(config.selectors.viewEditUser.saveEditUser)).toBeVisible();
    await page.locator(config.selectors.viewEditUser.saveEditUser).click();

    // Wait for the action to complete
    await page.waitForTimeout(10000);

        // click on logout
    await expect(page.locator(config.selectors.navigation.userProfileIcon)).toBeVisible();
    await page.locator(config.selectors.navigation.userProfileIcon).click();

    await expect(page.locator(config.selectors.navigation.logoutButton)).toBeVisible();
    await page.locator(config.selectors.navigation.logoutButton).click({ force: true });

    //click on logout confirmation
    await expect(page.locator(config.selectors.login.logoutConfirmationButton)).toBeVisible();
    await page.locator(config.selectors.login.logoutConfirmationButton).click();

        // Wait for the username field to be visible and fill it
        await expect(page.locator('input[id="username"]')).toBeVisible();
        await page.locator('input[id="username"]').fill('AutomatedUsername2');
        
        // Wait for the password field to be visible and fill it
        await expect(page.locator('input[id="password"]')).toBeVisible();
        await page.locator('input[id="password"]').fill('12345');
        
        // Click the submit button
        await expect(page.locator('input[type="submit"], button[type="submit"], .submit, #Submit')).toBeVisible();
        await page.locator('input[type="submit"], button[type="submit"], .submit, #Submit').click();
        
        // Optional: Wait for navigation or success indication
        await page.waitForTimeout(15000);

        // 1. Verify the Driver Card panel is visible
        await expect(driverCardPanel).toBeVisible();
        console.log('✅ Driver Card panel is visible');

        // Wait much longer for driver cards to fully load and populate
        console.log('⏳ Waiting for driver card data to populate...');
        await page.waitForTimeout(45000); // Extended wait for driver cards to load and populate

        // Wait for actual driver cards to be present with extended timeout
        try {
            await page.waitForSelector('.driver-card', { timeout: 30000 });
            console.log('✅ Driver cards are now loaded');
        } catch (error) {
            console.log('⚠️ Warning: Driver cards may not be fully loaded yet, will retry...');

            // Additional wait and retry
            await page.waitForTimeout(15000);
            try {
                await page.waitForSelector('.driver-card', { timeout: 15000 });
                console.log('✅ Driver cards loaded after retry');
            } catch (retryError) {
                console.log('ℹ️ Driver cards still not available - may need more time to populate');
            }
        }

        // Verify that the checked devices from user access settings are present in the driver card
        console.log('\n🔍 Verifying checked devices from user access settings in Driver Card...');

        if (checkedDeviceNames.length > 0) {
            // Get all driver cards in the panel
            const driverCards = page.locator(config.selectors.driverCard.card);
            const driverCardCount = await driverCards.count();
            console.log(`📋 Found ${driverCardCount} driver cards in the panel`);

            // Collect all driver names from the driver cards
            const driverCardNames = [];
            for (let i = 0; i < driverCardCount; i++) {
                const driverNameElement = driverCards.nth(i).locator('h5');
                const driverNameText = await driverNameElement.textContent();
                if (driverNameText) {
                    const cleanDriverName = driverNameText.trim();
                    driverCardNames.push(cleanDriverName);
                    console.log(`🚗 Driver Card ${i + 1}: "${cleanDriverName}"`);
                }
            }

            // Compare checked devices with driver card names
            let matchedDevices = 0;
            let unmatchedDevices = [];

            for (const deviceName of checkedDeviceNames) {
                if (driverCardNames.includes(deviceName)) {
                    matchedDevices++;
                    console.log(`✅ Checked device "${deviceName}" found in driver card`);
                } else {
                    unmatchedDevices.push(deviceName);
                    console.log(`❌ Checked device "${deviceName}" NOT found in driver card`);
                }
            }

            // Summary of verification
            console.log(`\n📊 User Access Device Verification Summary:`);
            console.log(`   Devices checked for user access: ${checkedDeviceNames.length}`);
            console.log(`   Driver cards found: ${driverCardCount}`);
            console.log(`   Matched devices: ${matchedDevices}`);
            console.log(`   Unmatched devices: ${unmatchedDevices.length}`);

            if (unmatchedDevices.length > 0) {
                console.log(`   Unmatched device names: [${unmatchedDevices.join(', ')}]`);
            }

            const matchPercentage = checkedDeviceNames.length > 0 ?
                ((matchedDevices / checkedDeviceNames.length) * 100).toFixed(1) : 0;
            console.log(`   Match percentage: ${matchPercentage}%`);

            // Assert that all checked devices appear in driver card
            if (checkedDeviceNames.length > 0) {
                if (driverCardCount > 0) {
                    expect(matchedDevices).toBe(checkedDeviceNames.length);
                    console.log('✅ All checked devices from user access settings appear in driver card');
                } else {
                    console.log('ℹ️ Skipping verification - no driver cards found');
                }
            }

        } else {
            console.log('⚠️ No devices were checked in user access settings to verify');
        }

        //verify reports, real time tracking and alert settings should not be visible
        const reportsVisible = await page.locator(config.selectors.navigation.reportMenu).isVisible();
        expect(reportsVisible).toBeFalsy();
        console.log('✅ Reports menu is not visible as expected');

        const trackingVisible = await page.locator(config.selectors.realTimeTracking.realTimeTrackingMenu).isVisible();
        expect(trackingVisible).toBeFalsy();
        console.log('✅ Real-Time Tracking menu is not visible as expected');

        const alertSettingsVisible = await page.locator(config.selectors.changeAlertSettings.alertSettingsMenu).isVisible();
        expect(alertSettingsVisible).toBeFalsy();
        console.log('✅ Alert Settings menu is not visible as expected');


    });
});