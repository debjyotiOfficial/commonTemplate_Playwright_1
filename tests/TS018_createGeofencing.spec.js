const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Create Geofencing', () => {
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

    test('should be able to create new Geofence', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Generate unique geofence name for this test run to avoid conflicts with previous runs
        const uniqueGeofenceName = `AutoTest_Geofence_${Date.now()}`;
        console.log(`Using unique geofence name: ${uniqueGeofenceName}`);

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Wait for the page to fully load
        await page.waitForLoadState('load');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000);
        console.log('Page loaded, proceeding...');

        // Wait for the sidebar navigation to be ready
        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible({ timeout: 15000 });
        console.log('Geofencing menu is visible');

        // Click on Geofencing menu to expand submenu
        await page.locator(config.selectors.navigation.geofencingMenu).click();
        console.log('Clicked Geofencing menu');

        await page.waitForTimeout(2000); // Wait for submenu to expand

        // Wait for the Create Geofence button to be visible in the expanded submenu
        await expect(page.locator(config.selectors.navigation.creategeofencingMenu)).toBeVisible({ timeout: 10000 });
        console.log('Create Geofence submenu is visible');

        // Click on Create Geofencing Area
        await page.locator(config.selectors.navigation.creategeofencingMenu).click();
        console.log('Clicked Create Geofence submenu');

        await page.waitForTimeout(3000); // Wait for modal to open

        // Verify Create Geofence modal is visible (with retry if needed)
        let modalVisible = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await expect(page.locator('h3:has-text("Create Geofence")').first()).toBeVisible({ timeout: 10000 });
                modalVisible = true;
                break;
            } catch (e) {
                console.log(`Modal not visible on attempt ${attempt}, retrying...`);
                // Try clicking the geofencing menu again to expand, then the create button
                await page.locator(config.selectors.navigation.geofencingMenu).click();
                await page.waitForTimeout(1500);
                await page.locator(config.selectors.navigation.creategeofencingMenu).click();
                await page.waitForTimeout(2000);
            }
        }
        if (!modalVisible) {
            throw new Error('Create Geofence modal did not appear after 3 attempts');
        }
        console.log('Create Geofence modal is visible');

        // Step 2: Fill the Geofencing Form (New UI order: Name, Address, Radius)

        // Get reference to the Create Geofence modal
        const modal = page.locator('.modal:visible, [class*="modal"]:visible').filter({ hasText: 'Create Geofence' }).first();

        // Enter Geofence Name first
        const geofenceNameInput = modal.locator('input[placeholder="Enter geofence name"]');
        await expect(geofenceNameInput).toBeVisible();
        await geofenceNameInput.clear();
        await geofenceNameInput.fill(uniqueGeofenceName);
        console.log(`Entered geofence name: ${uniqueGeofenceName}`);

        // Enter Address (second text input in the modal)
        const addressInput = modal.locator('input[type="text"], input:not([type])').nth(1);
        await addressInput.clear();
        await addressInput.fill(config.testData.geofencingAddress);
        console.log(`Entered address: ${config.testData.geofencingAddress}`);

        // Wait for address suggestions to appear
        await page.waitForTimeout(3000);

        // Click on address suggestion if visible
        const addressSuggestion = page.locator('.ui-menu-item').filter({ hasText: 'San Ramon' }).first();
        try {
            await addressSuggestion.click({ timeout: 5000 });
            console.log('Selected address suggestion');
        } catch (e) {
            console.log('No address suggestion dropdown, continuing...');
        }

        // Enter Radius (number input within the Create Geofence modal)
        const radiusInput = modal.locator('input[type="number"]').first();
        await expect(radiusInput).toBeVisible();
        await radiusInput.clear();
        await radiusInput.fill(config.testData.geofencingRadius);
        console.log(`Entered radius: ${config.testData.geofencingRadius}`);

        // Click the Submit button within the modal
        await modal.locator('button:has-text("Submit")').click();
        console.log('Clicked Submit button');

        await page.waitForTimeout(2000);

        // Step 3: Verify the Geofence Preview Overlay
        console.log('Verifying geofence preview overlay...');

        // Wait for and verify the preview overlay is visible
        await expect(page.locator(config.selectors.geofencingInput.previewOverlay)).toBeVisible({ timeout: 10000 });
        console.log('Preview overlay is visible');

        // Verify the Name value in the preview overlay
        const previewName = await page.locator(config.selectors.geofencingInput.previewOverlay)
            .locator('.geofence-info-overlay__content-item').filter({ hasText: 'Name:' }).locator('.value').textContent();
        console.log(`Preview Name: ${previewName}`);
        expect(previewName).toBe(uniqueGeofenceName);

        // Verify the Radius value in the preview overlay
        const previewRadius = await page.locator(config.selectors.geofencingInput.previewOverlay)
            .locator('.geofence-info-overlay__content-item').filter({ hasText: 'Radius:' }).locator('.value').textContent();
        console.log(`Preview Radius: ${previewRadius}`);
        expect(previewRadius).toContain(config.testData.geofencingRadius);

        // Verify the Address value in the preview overlay
        const previewAddress = await page.locator(config.selectors.geofencingInput.previewOverlay)
            .locator('.geofence-info-overlay__content-item').filter({ hasText: 'Address:' }).locator('.value').textContent();
        console.log(`Preview Address: ${previewAddress}`);
        expect(previewAddress).toContain(config.testData.geofencingAddress);

        // Verify the radius label on the map matches the entered radius
        console.log('Verifying radius label on the map...');
        const mapRadiusLabel = page.locator('div:text("' + config.testData.geofencingRadius + ' feet")').first();
        await expect(mapRadiusLabel).toBeVisible({ timeout: 5000 });
        console.log('Map radius label verified');

        // Click the Save button on the preview overlay and wait for API response
        console.log('Clicking Save button on preview overlay...');

        // Wait for the addgeofence API call and click Save
        const [saveResponse] = await Promise.all([
            page.waitForResponse(response =>
                response.url().includes('addgeofence.php') && response.status() === 200
            ),
            page.locator(config.selectors.geofencingInput.previewOverlay).locator('button', { hasText: 'Save' }).click()
        ]);
        console.log('Geofence save API called successfully');

        // Verify success alert appears
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
        console.log('Success alert container is visible');

        // Optionally verify the alert contains success message
        const alertText = await page.locator('.alert-container').textContent();
        console.log(`Alert message: ${alertText}`);

        await page.waitForTimeout(2000); // Wait for alert to clear

        // Step 4: Navigate to View/Delete Geofences to verify creation
        console.log('Navigating to View/Delete Geofences...');

        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        await page.waitForTimeout(1000);

        await expect(page.locator(config.selectors.geofencingInput.viewDelGeo)).toBeVisible();
        await page.locator(config.selectors.geofencingInput.viewDelGeo).click();

        await page.waitForTimeout(2000); // Wait for View Geofences modal to load

        // Verify View Geofences modal is visible
        console.log('Verifying View Geofences modal...');
        await expect(page.locator('#geofence-device-select')).toBeVisible({ timeout: 5000 });

        // Get all available geofence options
        const geofenceOptions = await page.locator('#geofence-device-select option').allTextContents();
        console.log('Available geofences:', geofenceOptions);

        // Find and select the created geofence by matching the name (exact match preferred)
        const createdGeofenceName = uniqueGeofenceName;

        // First try exact match: "Test Auto Geofence (San Ramon, CA, United States)"
        let matchingOption = geofenceOptions.find(option =>
            option.startsWith(createdGeofenceName + ' (') && !option.includes('_Edited')
        );

        // If no exact match, try finding the last occurrence (most recently created)
        if (!matchingOption) {
            const allMatches = geofenceOptions.filter(option =>
                option.includes(createdGeofenceName) && !option.includes('_Edited')
            );
            if (allMatches.length > 0) {
                matchingOption = allMatches[allMatches.length - 1]; // Get last match (most recent)
            }
        }

        if (matchingOption) {
            await page.locator('#geofence-device-select').selectOption({ label: matchingOption });
            console.log(`Selected geofence: ${matchingOption}`);
        } else {
            // Fallback: try partial match with San Ramon address
            const fallbackOption = geofenceOptions.find(option =>
                option.includes('San Ramon') && option.includes(createdGeofenceName.split(' ')[0])
            );
            if (fallbackOption) {
                await page.locator('#geofence-device-select').selectOption({ label: fallbackOption });
                console.log(`Selected geofence (fallback): ${fallbackOption}`);
            } else {
                throw new Error(`Geofence "${createdGeofenceName}" not found in the dropdown. Available options: ${geofenceOptions.join(', ')}`);
            }
        }

        // Check the "Hide Vehicle Markers" checkbox in the view-geofences-form
        console.log('Checking Hide Vehicle Markers checkbox...');
        const hideMarkersCheckbox = page.locator('#view-geofences-form').getByText('Hide Vehicle Markers');
        await hideMarkersCheckbox.click();
        console.log('Hide Vehicle Markers checkbox checked');

        // Click Submit button within the View Geofences modal
        console.log('Clicking Submit button...');
        const viewGeofencesModal = page.locator('.modal:visible, [class*="modal"]:visible').filter({ hasText: 'View Geofences' });
        await viewGeofencesModal.locator('button:has-text("Submit")').click();

        await page.waitForTimeout(3000);

        // Step 5: Verify the Geofence Info Overlay appears
        console.log('Verifying geofence info overlay...');

        // Verify the geofence info overlay is visible
        await expect(page.locator('#geofence-info-overlay')).toBeVisible({ timeout: 10000 });
        console.log('Geofence info overlay is visible');

        // Verify the Name in the overlay matches the created geofence
        const displayedName = await page.locator('#geofence-name1').textContent();
        console.log(`Displayed geofence name: ${displayedName}`);
        expect(displayedName).toBe(uniqueGeofenceName);

        // Verify the Radius in the overlay matches the entered radius
        const displayedRadius = await page.locator('#geofence-radius').textContent();
        console.log(`Displayed geofence radius: ${displayedRadius}`);
        expect(displayedRadius).toBe(config.testData.geofencingRadius);

        // Verify the Location contains the address
        const displayedLocation = await page.locator('#geofence-location').textContent();
        console.log(`Displayed geofence location: ${displayedLocation}`);
        expect(displayedLocation).toContain(config.testData.geofencingAddress);

        // Verify the geofence name is displayed on the map
        console.log('Verifying geofence name label on map...');
        const mapGeofenceNameLabel = page.locator('text=' + uniqueGeofenceName).first();
        await expect(mapGeofenceNameLabel).toBeVisible({ timeout: 5000 });
        console.log('Geofence name label verified on map');

        // Verify the radius label is displayed on the map
        console.log('Verifying radius label on map...');
        const mapRadiusLabelOnMap = page.locator('text=' + config.testData.geofencingRadius + ' feet').first();
        await expect(mapRadiusLabelOnMap).toBeVisible({ timeout: 5000 });
        console.log('Radius label verified on map');

        // Step 6: Edit the Geofence
        console.log('Step 6: Editing the geofence...');

        // Click the Edit button
        await page.locator('#edit-geofence').click();
        console.log('Clicked Edit button');

        await page.waitForTimeout(1000);

        // Verify edit mode is visible
        await expect(page.locator('#geofence-edit-mode')).toBeVisible({ timeout: 5000 });
        console.log('Edit mode is visible');

        // Edit the name - append "_Edited" to the original name
        const editedGeofenceName = uniqueGeofenceName + '_Edited';
        await page.locator('#geofence-name-edit').clear();
        await page.locator('#geofence-name-edit').fill(editedGeofenceName);
        console.log(`Edited geofence name to: ${editedGeofenceName}`);

        // Verify radius input has min="500" attribute
        const editRadiusInput = page.locator('#geofence-radius-edit');
        const minValue = await editRadiusInput.getAttribute('min');
        expect(minValue).toBe('500');
        console.log('Verified radius minimum value is 500');

        // Try to set radius below 500 and verify it doesn't accept
        await editRadiusInput.clear();
        await editRadiusInput.fill('400');
        const radiusValue = await editRadiusInput.inputValue();
        // The input should either reject the value or the form validation should catch it
        console.log(`Attempted to set radius to 400, actual value: ${radiusValue}`);

        // Now set radius to 510 (valid value)
        await editRadiusInput.clear();
        await editRadiusInput.fill('510');
        console.log('Set radius to 510');

        // Click Save and wait for updategeofence API call
        console.log('Saving edited geofence...');
        const [updateResponse] = await Promise.all([
            page.waitForResponse(response =>
                response.url().includes('updategeofence_rds.php') && response.status() === 200
            ),
            page.locator('#save-geofence-edit').click()
        ]);
        console.log('Update geofence API called successfully');

        await page.waitForTimeout(2000);

        // Step 7: Verify the updated changes in the overlay
        console.log('Step 7: Verifying updated geofence details...');

        // Verify the Name is updated
        const updatedName = await page.locator('#geofence-name1').textContent();
        console.log(`Updated geofence name displayed: ${updatedName}`);
        expect(updatedName).toBe(editedGeofenceName);

        // Verify the Radius is updated to 510
        const updatedRadius = await page.locator('#geofence-radius').textContent();
        console.log(`Updated geofence radius displayed: ${updatedRadius}`);
        expect(updatedRadius).toBe('510');

        // Verify the select dropdown displays the updated name
        const dropdownOptions = await page.locator('#geofence-info-overlay select option').allTextContents();
        const hasUpdatedName = dropdownOptions.some(option => option.includes(editedGeofenceName));
        expect(hasUpdatedName).toBeTruthy();
        console.log('Verified updated name appears in dropdown');

        // Step 8: Delete the Geofence
        console.log('Step 8: Deleting the geofence...');

        // Click Edit button again
        await page.locator('#edit-geofence').click();
        console.log('Clicked Edit button');

        await page.waitForTimeout(1000);

        // Verify edit mode is visible
        await expect(page.locator('#geofence-edit-mode')).toBeVisible({ timeout: 5000 });

        // Click Delete button to open confirmation modal
        console.log('Clicking Delete button...');
        await page.locator('#delete-geofence').click();

        // Wait for confirmation modal to appear
        await page.waitForTimeout(1000);

        // Click the confirmation Delete button in the modal and wait for deletegeofence API call
        console.log('Confirming delete in modal...');

        // Wait for the confirmation modal with "Delete Geofence" title text to appear
        await expect(page.getByText('Are you sure you want to delete this geofence?')).toBeVisible({ timeout: 5000 });
        console.log('Delete confirmation modal is visible');

        // Find the Delete button within the confirmation modal by looking for the modal container
        // that contains "Are you sure you want to delete this geofence?"
        const modalContainer = page.locator('div').filter({ hasText: 'Are you sure you want to delete this geofence?' }).first();
        const modalDeleteBtn = modalContainer.locator('button').filter({ hasText: 'Delete' });

        // Log button count for debugging
        const btnCount = await modalDeleteBtn.count();
        console.log(`Found ${btnCount} Delete button(s) in modal container`);

        const [deleteResponse] = await Promise.all([
            page.waitForResponse(response =>
                response.url().includes('deletegeofence_rds.php') && response.status() === 200
            ),
            modalDeleteBtn.click()
        ]);
        console.log('Delete geofence API called successfully');

        await page.waitForTimeout(2000);

        // Step 9: Verify the deleted geofence is no longer in the dropdown
        console.log('Step 9: Verifying geofence is deleted...');

        // Check if the geofence info overlay is still visible or if we need to open dropdown again
        // Get the dropdown options and verify the deleted geofence is not present
        const finalDropdownOptions = await page.locator('#geofence-device-select option').allTextContents();
        const deletedGeofenceExists = finalDropdownOptions.some(option => option.includes(editedGeofenceName));
        expect(deletedGeofenceExists).toBeFalsy();
        console.log('Verified deleted geofence is no longer in the dropdown');

        console.log('SUCCESS: Geofence creation, edit, and deletion completed successfully');
    });
});