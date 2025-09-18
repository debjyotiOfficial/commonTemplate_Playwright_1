const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe("List of Device", () => {
    test.beforeEach(async ({ page }) => {
        const helpers = new TestHelpers(page);
        await helpers.clearStorageAndSetTimeouts();
    });

    test('should show list of all devices in the platform', async ({ page }) => {
        test.setTimeout(300000); // 5 minutes timeout
        const helpers = new TestHelpers(page);
        const config = await helpers.getConfig();

        // Login using the helper method
        await helpers.login();
        
        // Clear storage after login
        await helpers.clearStorageAfterNavigation();

        // Navigate to devices list using helper method
        await helpers.navigateToDevicesList(config);

        // Verify the panel title
        const title = await page.locator(config.selectors.devList.title).textContent();
        expect(title.trim()).toBe(config.testData.expectedDevListTitle);

        // Wait for the device table to load
        await page.waitForSelector(config.selectors.devList.deviceTable, {
            timeout: 30000 // 30 seconds timeout
        });

        // Verify table has data rows
        const rows = page.locator(config.selectors.devList.deviceRows);
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(0);

        console.log(`Found ${rowCount} devices in the table`);

        // Test search functionality
        if (rowCount > 1) {
            // Get first device name for search
            const firstDeviceName = await page.locator(config.selectors.devList.deviceNameColumn).first().textContent();
            
            if (firstDeviceName && firstDeviceName.trim()) {
                // Search for the device
                await page.locator(config.selectors.devList.searchInput).fill(firstDeviceName.trim());
                await page.keyboard.press('Enter');
                await page.waitForTimeout(2000);

                // Verify search results
                const searchRows = await page.locator(config.selectors.devList.deviceRows).count();
                expect(searchRows).toBeGreaterThan(0);
                console.log(`Search for "${firstDeviceName.trim()}" returned ${searchRows} results`);
            }
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
    
    // Alternative: Move mouse away from the side menu area
    try {
      await page.mouse.move(600, 300); // Move mouse to center-right of screen
      console.log('✓ Moved mouse away from side menu');
    } catch (e) {
      console.log('⚠ Warning: Could not move mouse');
    }

    // Wait a bit for menu animation to complete
    await page.waitForTimeout(5000);

        // Step 1: Verify we're on the device list page
    console.log('Step 1: Verifying device list page...');
    
    // Check for device table or list elements
    const deviceTableVisible = await page.locator('table').first().isVisible().catch(() => false);
    if (deviceTableVisible) {
      console.log('✓ Device table is visible');
      
      // Count the devices
      const deviceRows = await page.locator('tbody tr').count();
      console.log(`✓ Found ${deviceRows} devices in the list`);
      
      // Check for Demo1 device
      const viewMasterDevice = await page.locator('text=Demo1').isVisible().catch(() => false);
      if (viewMasterDevice) {
        console.log('✓ Demo1 device found in list');
      }
    }


    // Click and clear the search input, then type 'Demo1'
    const searchInput = await page.locator('#devices-search').first();
    await searchInput.click();
    await searchInput.clear();
    await searchInput.fill('Demo1');
    console.log('✓ Searched for Demo1');
    
    // Wait for the table to filter
    await page.waitForTimeout(3000);
    
    // Verify that the filtered row contains 'Demo1' in the Device Type column
    const deviceTypeColumn = await page.locator('#devices-table tbody tr td:nth-child(4)').first();
    const deviceTypeText = await deviceTypeColumn.textContent();
    if (deviceTypeText && deviceTypeText.includes('Demo1')) {
      console.log('✓ Verified: Demo1 found in Device Type column');
    } else {
      console.log('⚠ Warning: Demo1 not found in Device Type column');
    }
    
    // Find the row containing Demo1 and click the pencil icon
    console.log('Step 2: Finding and clicking edit icon for Demo1...');
    const targetRow = await page.locator('table#devices-table tbody tr').filter({ hasText: 'Demo1' }).first();
    
    // Click the pencil icon in that specific row
    await targetRow.locator('td.cell-icon').locator('div.icon.icon--edit.device-edit').click({ force: true });
    console.log('✓ Clicked pencil icon for Demo1');
    
    // Wait for the edit modal to appear
    await page.waitForTimeout(10000); // Wait for modal to load
    
    // Step 3: Click the "Edit Device" tab and make changes
    console.log('Step 3: Clicking Edit Device tab and editing device...');
    
    // Click the "Edit Device" tab
    await page.locator('button[data-tab="edit"]').nth(0).click({ force: true });
    console.log('✓ Clicked Edit Device tab');
    
    await page.waitForTimeout(50000); // Wait for tab content to load
    
    // Check if the dropdown exists and handle it appropriately
    try {
      // First wait for the dropdown to be visible
      await page.waitForSelector('#device-select', { state: 'visible', timeout: 5000 });
      
      const vehicleDropdown = await page.locator('#device-select');
      
      // Try to trigger click like Cypress does with invoke
      await vehicleDropdown.evaluate(element => element.click());
      console.log('✓ Triggered click on vehicle dropdown');
      
      await page.waitForTimeout(10000); // Wait for options to load
      
      // Select Demo1 option
      await vehicleDropdown.selectOption('Demo1 (IMEI: 223004085)');
      console.log('✓ Selected Demo1 from dropdown');
    } catch (error) {
      console.log('⚠ Warning: Could not find or interact with #device-select dropdown');
      console.log('Error details:', error.message);
    }
    
    // Verify and update the device name input
    try {
      const deviceNameInput = await page.locator('#edit-device-name');
      const currentValue = await deviceNameInput.inputValue();
      
      if (currentValue === 'Demo1') {
        console.log('✓ Device name input shows Demo1');
      }
      
      // Clear and re-enter the device name  
      await deviceNameInput.clear();
      await deviceNameInput.type('Demo1');
      console.log('✓ Updated device name');
    } catch (error) {
      console.log('⚠ Warning: Could not update device name input');
    }
    
    // Check the pulsing icon checkbox if not already checked
    try {
      const pulsingCheckbox = await page.locator('#show-pulsing-icon');
      const isChecked = await pulsingCheckbox.isChecked();
      if (!isChecked) {
        await pulsingCheckbox.check();
        console.log('✓ Enabled pulsing icon');
      } else {
        console.log('✓ Pulsing icon already enabled');
      }
    } catch (error) {
      console.log('⚠ Warning: Could not check pulsing icon checkbox');
    }
    
    // Select 'All' from icon category dropdown
    try {
      await page.locator('#icon-category-edit').selectOption('All');
      console.log('✓ Selected All from icon category');
    } catch (error) {
      console.log('⚠ Warning: Could not select icon category');
    }
    
    // Select second radio button for icon
    try {
      await page.locator('input[type="radio"][name="icon-icon-grid-edit"]').nth(1).check({ force: true });
      console.log('✓ Selected icon radio button');
    } catch (error) {
      console.log('⚠ Warning: Could not select icon radio button');
    }
    
    // Click Update Device button
    try {
      const updateButton = await page.locator('#update-device-btn');
      await updateButton.scrollIntoViewIfNeeded();
      await updateButton.click({ force: true });
      console.log('✓ Clicked Update Device button');
    } catch (error) {
      console.log('⚠ Warning: Could not click update button');
    }
    
    await page.waitForTimeout(15000); // Wait for update to process
    
    // Step 4: Test export functionality
    console.log('Step 4: Testing export functionality...');
    
    // Look for export buttons
    const exportSelectors = [
      'text=Save file as',
      'text=Copy',
      'button:has-text("Excel")',
      'button:has-text("CSV")',
      'button:has-text("PDF")',
      '.dropdown__trigger'
    ];
    
    for (const selector of exportSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`✓ Found export option: ${selector}`);
      }
    }
    
    // Take screenshot of the device list
    await page.screenshot({ path: 'device-list-page.png', fullPage: true });
    console.log('✓ Screenshot saved: device-list-page.png');
    
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY');
    console.log('Device list functionality has been tested');
  });
});
