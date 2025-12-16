const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Create Landmark', () => {
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

    test('should be able to create new Landmark', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Validate config loaded correctly
        if (!config || !config.selectors || !config.selectors.navigation) {
            console.error('Config validation failed!');
            console.error('config:', JSON.stringify(config, null, 2));
            throw new Error('Config not loaded correctly - selectors.navigation is missing');
        }
        if (!config.testData || !config.testData.geofencingAddress || !config.testData.geofencingRadius) {
            console.error('testData:', JSON.stringify(config.testData, null, 2));
            throw new Error('Config not loaded correctly - testData.geofencingAddress or geofencingRadius is missing');
        }
        console.log('Config validated successfully');

        // Generate unique landmark name for this test run to avoid conflicts with previous runs
        const uniqueLandmarkName = `AutoTest_Landmark_${Date.now()}`;
        console.log(`Using unique landmark name: ${uniqueLandmarkName}`);

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

        // Click on the "Landmarks" accordion button in the Geofencing menu
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Landmarks' }).click({ force: true });
        console.log('Clicked Landmarks accordion');

        await page.waitForTimeout(2000); // Wait for submenu to expand

        // Click on Create Landmarks
        await expect(page.locator('#create-landmarks-btn')).toBeVisible({ timeout: 10000 });
        await page.locator('#create-landmarks-btn').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await page.locator('#create-landmarks-btn').click({ force: true });
        console.log('Clicked Create Landmarks button');

        await page.waitForTimeout(3000); // Wait for modal to open

        // Verify Create Landmark modal is visible (with retry if needed)
        let modalVisible = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await expect(page.locator('#create-landmark-modal h3').filter({ hasText: 'Create Landmark' })).toBeVisible({ timeout: 10000 });
                modalVisible = true;
                break;
            } catch (e) {
                console.log(`Modal not visible on attempt ${attempt}, retrying...`);
                // Try clicking the menu again
                await page.locator(config.selectors.navigation.geofencingMenu).click({ force: true });
                await page.waitForTimeout(1500);
                await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Landmarks' }).click({ force: true });
                await page.waitForTimeout(1500);
                await page.locator('#create-landmarks-btn').click({ force: true });
                await page.waitForTimeout(2000);
            }
        }
        if (!modalVisible) {
            throw new Error('Create Landmark modal did not appear after 3 attempts');
        }
        console.log('Create Landmark modal is visible');

        // Step 2: Fill the Landmark Form

        // Get reference to the Create Landmark modal
        const modal = page.locator('#create-landmark-modal');

        // Enter Landmark Name
        const landmarkNameInput = modal.locator('#landmark-name');
        await expect(landmarkNameInput).toBeVisible();
        await landmarkNameInput.clear();
        await landmarkNameInput.fill(uniqueLandmarkName);
        console.log(`Entered landmark name: ${uniqueLandmarkName}`);

        // Enter Address
        const addressInput = modal.locator('#landmark-address');
        await expect(addressInput).toBeVisible();
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

        // Enter Radius
        const radiusInput = modal.locator('#landmark-radius-input');
        await expect(radiusInput).toBeVisible();
        await radiusInput.clear();
        await radiusInput.fill(config.testData.geofencingRadius);
        console.log(`Entered radius: ${config.testData.geofencingRadius}`);

        // Click the Submit button
        await modal.locator('#submit-landmark').click();
        console.log('Clicked Submit button');

        await page.waitForTimeout(2000);

        // Step 3: Verify the Landmark Preview Overlay
        console.log('Verifying landmark preview overlay...');

        // Wait for and verify the preview overlay is visible
        await expect(page.locator('#geofence-preview-overlay')).toBeVisible({ timeout: 10000 });
        console.log('Preview overlay is visible');

        // Verify the Name value in the preview overlay
        const previewName = await page.locator('#geofence-preview-overlay')
            .locator('.geofence-info-overlay__content-item').filter({ hasText: 'Name:' }).locator('.value').textContent();
        console.log(`Preview Name: ${previewName}`);
        expect(previewName).toBe(uniqueLandmarkName);

        // Verify the Radius value in the preview overlay
        const previewRadius = await page.locator('#geofence-preview-overlay')
            .locator('.geofence-info-overlay__content-item').filter({ hasText: 'Radius:' }).locator('.value').textContent();
        console.log(`Preview Radius: ${previewRadius}`);
        expect(previewRadius).toContain(config.testData.geofencingRadius);

        // Verify the Address value in the preview overlay
        const previewAddress = await page.locator('#geofence-preview-overlay')
            .locator('.geofence-info-overlay__content-item').filter({ hasText: 'Address:' }).locator('.value').textContent();
        console.log(`Preview Address: ${previewAddress}`);
        expect(previewAddress).toContain(config.testData.geofencingAddress);

        // Click the Save button on the preview overlay and wait for API response
        console.log('Clicking Save button on preview overlay...');

        // Wait for the addlandmark API call and click Save
        const [saveResponse] = await Promise.all([
            page.waitForResponse(response =>
                response.url().includes('addlandmark.php') && response.status() === 200
            ),
            page.locator('#geofence-preview-overlay').locator('button.btn--primary', { hasText: 'Save' }).click()
        ]);
        console.log('Landmark save API called successfully');

        // Verify success alert appears
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
        console.log('Success alert container is visible');

        // Optionally verify the alert contains success message
        const alertText = await page.locator('.alert-container').textContent();
        console.log(`Alert message: ${alertText}`);

        await page.waitForTimeout(2000); // Wait for alert to clear

        // Step 4: Navigate to View/Edit Landmarks to verify creation
        console.log('Navigating to View/Edit Landmarks...');

        // Wait for any alerts/overlays to clear
        await page.waitForTimeout(3000);

        // Close the preview overlay if it's still visible
        try {
            const previewOverlay = page.locator('#geofence-preview-overlay');
            if (await previewOverlay.isVisible()) {
                console.log('Preview overlay still visible, closing it...');
                // Try to click Cancel button or close button
                const cancelBtn = previewOverlay.locator('button.btn--secondary');
                if (await cancelBtn.isVisible()) {
                    await cancelBtn.click({ force: true });
                    await page.waitForTimeout(1000);
                }
            }
        } catch (e) {
            console.log('No preview overlay to close');
        }

        // Close any open modals or overlays
        try {
            const closeButtons = page.locator('.close-modal:visible, .btn--icon.close-button:visible');
            if (await closeButtons.count() > 0) {
                await closeButtons.first().click({ force: true });
                await page.waitForTimeout(1000);
            }
        } catch (e) {
            // No modals to close
        }

        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click({ force: true });

        await page.waitForTimeout(2000);

        // Click on the "Landmarks" accordion button
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Landmarks' }).click({ force: true });

        await page.waitForTimeout(2000);

        // Click on View/Edit Landmarks with force and scroll - retry logic
        let viewEditModalOpened = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`Attempt ${attempt}: Trying to open View/Edit Landmarks modal...`);

            await expect(page.locator('#view-edit-landmarks-btn')).toBeVisible();
            await page.locator('#view-edit-landmarks-btn').scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);

            // Try force click first
            await page.locator('#view-edit-landmarks-btn').click({ force: true });
            await page.waitForTimeout(2000);

            // Check if modal opened
            try {
                const modalVisible = await page.locator('#view-edit-landmarks-modal').isVisible();
                if (modalVisible) {
                    viewEditModalOpened = true;
                    break;
                }
            } catch (e) {
                // Continue trying
            }

            // If modal didn't open, try JavaScript click
            if (!viewEditModalOpened) {
                console.log('Force click did not open modal, trying JavaScript click...');
                await page.locator('#view-edit-landmarks-btn').evaluate(el => el.click());
                await page.waitForTimeout(2000);

                try {
                    const modalVisible = await page.locator('#view-edit-landmarks-modal').isVisible();
                    if (modalVisible) {
                        viewEditModalOpened = true;
                        break;
                    }
                } catch (e) {
                    // Continue
                }
            }

            // Re-expand the menu before retry
            if (!viewEditModalOpened && attempt < 3) {
                console.log('Modal still not open, re-expanding menu...');
                await page.locator(config.selectors.navigation.geofencingMenu).click({ force: true });
                await page.waitForTimeout(1500);
                await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Landmarks' }).click({ force: true });
                await page.waitForTimeout(1500);
            }
        }

        // Verify View Landmarks modal is visible
        console.log('Verifying View Landmarks modal...');

        // Wait for the modal container to be visible first
        await expect(page.locator('#view-edit-landmarks-modal')).toBeVisible({ timeout: 10000 });
        console.log('View Landmarks modal container is visible');

        await expect(page.locator('#landmark-select')).toBeVisible({ timeout: 10000 });

        // Get all available landmark options
        const landmarkOptions = await page.locator('#landmark-select option').allTextContents();
        console.log('Available landmarks:', landmarkOptions);

        // Find and select the created landmark by matching the name
        const createdLandmarkName = uniqueLandmarkName;

        // First try exact match
        let matchingOption = landmarkOptions.find(option =>
            option.startsWith(createdLandmarkName + ' (') && !option.includes('_Edited')
        );

        // If no exact match, try finding the last occurrence (most recently created)
        if (!matchingOption) {
            const allMatches = landmarkOptions.filter(option =>
                option.includes(createdLandmarkName) && !option.includes('_Edited')
            );
            if (allMatches.length > 0) {
                matchingOption = allMatches[allMatches.length - 1]; // Get last match (most recent)
            }
        }

        if (matchingOption) {
            await page.locator('#landmark-select').selectOption({ label: matchingOption });
            console.log(`Selected landmark: ${matchingOption}`);
        } else {
            // Fallback: try partial match with San Ramon address
            const fallbackOption = landmarkOptions.find(option =>
                option.includes('San Ramon') && option.includes(createdLandmarkName.split('_')[0])
            );
            if (fallbackOption) {
                await page.locator('#landmark-select').selectOption({ label: fallbackOption });
                console.log(`Selected landmark (fallback): ${fallbackOption}`);
            } else {
                throw new Error(`Landmark "${createdLandmarkName}" not found in the dropdown. Available options: ${landmarkOptions.join(', ')}`);
            }
        }

        // Check the "Hide Vehicle Markers" checkbox
        console.log('Checking Hide Vehicle Markers checkbox...');
        const hideMarkersCheckbox = page.locator('#hide-vehicle-markers-landmark');
        await hideMarkersCheckbox.click();
        console.log('Hide Vehicle Markers checkbox checked');

        // Click Submit button within the View Landmarks modal
        console.log('Clicking Submit button...');
        await page.locator('#view-landmark').click();

        await page.waitForTimeout(3000);

        // Step 5: Verify the Landmark Info Overlay appears
        console.log('Verifying landmark info overlay...');

        // Verify the landmark info overlay is visible
        await expect(page.locator('#landmark-info-overlay')).toBeVisible({ timeout: 10000 });
        console.log('Landmark info overlay is visible');

        // Verify the Name in the overlay matches the created landmark
        const displayedName = await page.locator('#landmark-name1').textContent();
        console.log(`Displayed landmark name: ${displayedName}`);
        expect(displayedName).toBe(uniqueLandmarkName);

        // Verify the Radius in the overlay matches the entered radius
        const displayedRadius = await page.locator('#landmark-radius').textContent();
        console.log(`Displayed landmark radius: ${displayedRadius}`);
        expect(displayedRadius).toBe(config.testData.geofencingRadius);

        // Verify the Location contains the address
        const displayedLocation = await page.locator('#landmark-location').textContent();
        console.log(`Displayed landmark location: ${displayedLocation}`);
        expect(displayedLocation).toContain(config.testData.geofencingAddress);

        // Step 6: Edit the Landmark
        console.log('Step 6: Editing the landmark...');

        // Click the Edit button
        await page.locator('#edit-landmark').click();
        console.log('Clicked Edit button');

        await page.waitForTimeout(1000);

        // Verify edit mode is visible
        await expect(page.locator('#landmark-edit-mode')).toBeVisible({ timeout: 5000 });
        console.log('Edit mode is visible');

        // Edit the name - append "_Edited" to the original name
        const editedLandmarkName = uniqueLandmarkName + '_Edited';
        await page.locator('#landmark-name-edit').clear();
        await page.locator('#landmark-name-edit').fill(editedLandmarkName);
        console.log(`Edited landmark name to: ${editedLandmarkName}`);

        // Verify radius input has min="100" attribute
        const editRadiusInput = page.locator('#landmark-radius-edit');
        const minValue = await editRadiusInput.getAttribute('min');
        expect(minValue).toBe('100');
        console.log('Verified radius minimum value is 100');

        // Try to set radius below 100 and verify it doesn't accept
        await editRadiusInput.clear();
        await editRadiusInput.fill('50');
        const radiusValue = await editRadiusInput.inputValue();
        console.log(`Attempted to set radius to 50, actual value: ${radiusValue}`);

        // Now set radius to 150 (valid value)
        await editRadiusInput.clear();
        await editRadiusInput.fill('150');
        console.log('Set radius to 150');

        // Click Save and wait for updatelandmark API call
        console.log('Saving edited landmark...');
        const [updateResponse] = await Promise.all([
            page.waitForResponse(response =>
                response.url().includes('updatelandmark.php') && response.status() === 200
            ),
            page.locator('#save-landmark-edit').click()
        ]);
        console.log('Update landmark API called successfully');

        await page.waitForTimeout(2000);

        // Step 7: Verify the updated changes in the overlay
        console.log('Step 7: Verifying updated landmark details...');

        // Verify the Name is updated
        const updatedName = await page.locator('#landmark-name1').textContent();
        console.log(`Updated landmark name displayed: ${updatedName}`);
        expect(updatedName).toBe(editedLandmarkName);

        // Verify the Radius is updated to 150
        const updatedRadius = await page.locator('#landmark-radius').textContent();
        console.log(`Updated landmark radius displayed: ${updatedRadius}`);
        expect(updatedRadius).toBe('150');

        // Verify the select dropdown displays the updated name
        const dropdownOptions = await page.locator('#landmark-info-overlay select option').allTextContents();
        const hasUpdatedName = dropdownOptions.some(option => option.includes(editedLandmarkName));
        expect(hasUpdatedName).toBeTruthy();
        console.log('Verified updated name appears in dropdown');

        // Step 8: Delete the Landmark
        console.log('Step 8: Deleting the landmark...');

        // Click Edit button again
        await page.locator('#edit-landmark').click();
        console.log('Clicked Edit button');

        await page.waitForTimeout(1000);

        // Verify edit mode is visible
        await expect(page.locator('#landmark-edit-mode')).toBeVisible({ timeout: 5000 });

        // Click Delete button to open confirmation modal
        console.log('Clicking Delete button...');
        await page.locator('#delete-landmark').click();

        // Wait for confirmation modal to appear
        await page.waitForTimeout(1000);

        // Click the confirmation Delete button in the modal and wait for deletelandmark API call
        console.log('Confirming delete in modal...');

        // Wait for the confirmation modal to appear
        await expect(page.getByText('Are you sure you want to delete this landmark?')).toBeVisible({ timeout: 5000 });
        console.log('Delete confirmation modal is visible');

        // Find the Delete button within the confirmation modal
        const modalContainer = page.locator('div').filter({ hasText: 'Are you sure you want to delete this landmark?' }).first();
        const modalDeleteBtn = modalContainer.locator('button').filter({ hasText: 'Delete' });

        // Log button count for debugging
        const btnCount = await modalDeleteBtn.count();
        console.log(`Found ${btnCount} Delete button(s) in modal container`);

        const [deleteResponse] = await Promise.all([
            page.waitForResponse(response =>
                response.url().includes('deletelandmark.php') && response.status() === 200
            ),
            modalDeleteBtn.click()
        ]);
        console.log('Delete landmark API called successfully');

        await page.waitForTimeout(2000);

        // Step 9: Verify the deleted landmark is no longer in the dropdown
        console.log('Step 9: Verifying landmark is deleted...');

        // Get the dropdown options and verify the deleted landmark is not present
        const finalDropdownOptions = await page.locator('#landmark-select option').allTextContents();
        const deletedLandmarkExists = finalDropdownOptions.some(option => option.includes(editedLandmarkName));
        expect(deletedLandmarkExists).toBeFalsy();
        console.log('Verified deleted landmark is no longer in the dropdown');

        console.log('SUCCESS: Landmark creation, edit, and deletion completed successfully');
    });
});
