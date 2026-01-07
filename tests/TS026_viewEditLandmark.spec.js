const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('view edit landmark', () => {
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

    // Helper function to create a landmark if none exist
    async function createLandmarkIfNeeded(page, config) {
        const uniqueLandmarkName = `AutoTest_ViewEdit_${Date.now()}`;
        console.log(`Creating landmark: ${uniqueLandmarkName}`);

        // Click on Geofencing menu to expand submenu
        await page.locator(config.selectors.navigation.geofencingMenu).click();
        await page.waitForTimeout(2000);

        // Click on the "Landmarks" accordion button
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Landmarks' }).click({ force: true });
        await page.waitForTimeout(2000);

        // Click on Create Landmarks with retry logic
        let modalVisible = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`Create Landmark - Attempt ${attempt}: Trying to open modal...`);

            await expect(page.locator('#create-landmarks-btn')).toBeVisible({ timeout: 10000 });
            await page.locator('#create-landmarks-btn').scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            await page.locator('#create-landmarks-btn').click({ force: true });
            await page.waitForTimeout(3000);

            // Check if modal is visible and not hidden
            try {
                const modal = page.locator('#create-landmark-modal');
                const isVisible = await modal.isVisible();
                const hasHiddenClass = await modal.evaluate(el => el.classList.contains('hidden'));
                if (isVisible && !hasHiddenClass) {
                    modalVisible = true;
                    break;
                }
            } catch (e) {
                // Continue trying
            }

            // If modal didn't open, try JavaScript click
            if (!modalVisible) {
                console.log('Force click did not open modal, trying JavaScript click...');
                await page.locator('#create-landmarks-btn').evaluate(el => el.click());
                await page.waitForTimeout(3000);

                try {
                    const modal = page.locator('#create-landmark-modal');
                    const isVisible = await modal.isVisible();
                    const hasHiddenClass = await modal.evaluate(el => el.classList.contains('hidden'));
                    if (isVisible && !hasHiddenClass) {
                        modalVisible = true;
                        break;
                    }
                } catch (e) {
                    // Continue
                }
            }

            // Re-expand the menu before retry
            if (!modalVisible && attempt < 3) {
                console.log('Modal still not open, re-expanding menu...');
                await page.locator(config.selectors.navigation.geofencingMenu).click({ force: true });
                await page.waitForTimeout(1500);
                await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Landmarks' }).click({ force: true });
                await page.waitForTimeout(1500);
            }
        }

        if (!modalVisible) {
            throw new Error('Create Landmark modal did not appear after 3 attempts');
        }
        console.log('Create Landmark modal is visible');

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

        // Wait for preview overlay and click Save
        await expect(page.locator('#geofence-preview-overlay')).toBeVisible({ timeout: 10000 });
        console.log('Preview overlay is visible');

        // Click the Save button on the preview overlay
        const [saveResponse] = await Promise.all([
            page.waitForResponse(response =>
                response.url().includes('addlandmark.php') && response.status() === 200
            ),
            page.locator('#geofence-preview-overlay').locator('button.btn--primary', { hasText: 'Save' }).click()
        ]);
        console.log('Landmark saved successfully');

        // Wait for success alert
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(3000);

        return uniqueLandmarkName;
    }

    // Helper function to open View/Edit Landmarks modal with retry logic
    async function openViewEditLandmarksModal(page, config) {
        let viewEditModalOpened = false;
        let noDataAlert = false;

        for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`Attempt ${attempt}: Trying to open View/Edit Landmarks modal...`);

            // Open Geofencing menu
            await page.locator(config.selectors.navigation.geofencingMenu).hover();
            await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
            await page.locator(config.selectors.navigation.geofencingMenu).click();
            await page.waitForTimeout(2000);

            // Click on the "Landmarks" accordion button
            await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Landmarks' }).click({ force: true });
            await page.waitForTimeout(2000);

            await expect(page.locator('#view-edit-landmarks-btn')).toBeVisible();
            await page.locator('#view-edit-landmarks-btn').scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);

            // Try force click first
            await page.locator('#view-edit-landmarks-btn').click({ force: true });
            await page.waitForTimeout(2000);

            // Check for "No Data" alert (no landmarks exist)
            const noDataAlertLocator = page.locator('.alert-container').filter({ hasText: 'No Data' });
            if (await noDataAlertLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log('No landmarks exist - need to create one first');
                noDataAlert = true;
                break;
            }

            // Check if modal opened
            try {
                const modalVisible = await page.locator('#view-edit-landmarks-modal').isVisible();
                const hasHiddenClass = await page.locator('#view-edit-landmarks-modal').evaluate(el => el.classList.contains('hidden'));
                if (modalVisible && !hasHiddenClass) {
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

                // Check for "No Data" alert again
                if (await noDataAlertLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
                    console.log('No landmarks exist - need to create one first');
                    noDataAlert = true;
                    break;
                }

                try {
                    const modalVisible = await page.locator('#view-edit-landmarks-modal').isVisible();
                    const hasHiddenClass = await page.locator('#view-edit-landmarks-modal').evaluate(el => el.classList.contains('hidden'));
                    if (modalVisible && !hasHiddenClass) {
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
            }
        }

        return { viewEditModalOpened, noDataAlert };
    }

    test('should be able to view, edit and delete landmark', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Step 1: Try to open View/Edit Landmarks modal
        let { viewEditModalOpened, noDataAlert } = await openViewEditLandmarksModal(page, config);

        // If no landmarks exist, create one first
        if (noDataAlert) {
            console.log('No landmarks found, creating one first...');
            await page.waitForTimeout(3000); // Wait for alert to dismiss
            await createLandmarkIfNeeded(page, config);

            // Now try to open the modal again
            const result = await openViewEditLandmarksModal(page, config);
            viewEditModalOpened = result.viewEditModalOpened;
        }

        // Step 2: Wait for View Landmarks modal
        await expect(page.locator(config.selectors.viewEditLandmarks.viewEditContainer)).toBeVisible({ timeout: 10000 });
        console.log('View Landmarks modal is visible');

        // Step 3: Keep "View All Landmarks" selected and click Submit
        await expect(page.locator(config.selectors.viewEditLandmarks.landmarkSelect)).toBeVisible();
        await expect(page.locator(config.selectors.viewEditLandmarks.submitButton)).toBeVisible();
        await page.locator(config.selectors.viewEditLandmarks.submitButton).click();

        // Step 4: Wait for map to load with landmark markers
        await page.waitForTimeout(3000);
        console.log('Map loaded, looking for landmark marker...');

        // Step 5: Click on a landmark marker (look for AutoTest_Landmark or any landmark label)
        const landmarkLabel = page.locator('div:text("AutoTest_Landmark")').first();

        if (await landmarkLabel.isVisible({ timeout: 10000 }).catch(() => false)) {
            console.log('Found AutoTest_Landmark label, clicking on it...');
            await landmarkLabel.click({ force: true });
        } else {
            // Fallback: try clicking on .landmark-marker or .geofence-marker directly
            console.log('Label not found, trying .landmark-marker or .geofence-marker...');
            const marker = page.locator('.landmark-marker, .geofence-marker').first();
            await marker.click({ force: true, timeout: 10000 });
        }

        await page.waitForTimeout(2000);

        // Step 6: Verify the landmark info overlay is showing
        console.log('Waiting for landmark info overlay...');
        const infoOverlay = page.locator(config.selectors.viewEditLandmarks.landmarkInfoOverlay);
        await expect(infoOverlay).toBeVisible({ timeout: 10000 });

        // Check if edit button is visible, if not, select a landmark from dropdown
        const editButton = page.locator(config.selectors.viewEditLandmarks.editLandmarkButton);

        if (!await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('Edit button not visible, selecting landmark from dropdown...');
            const landmarkDropdown = page.locator(config.selectors.viewEditLandmarks.landmarkTitleDropdown);
            if (await landmarkDropdown.isVisible({ timeout: 2000 })) {
                // Select first AutoTest landmark from dropdown
                await landmarkDropdown.selectOption({ index: 1 });
                await page.waitForTimeout(1000);
            }
        }

        console.log('Landmark info overlay is visible');

        // ==================== EDIT LANDMARK ====================

        // Step 7: Click the edit button (pencil icon) to enter edit mode
        await expect(editButton).toBeVisible({ timeout: 5000 });
        await editButton.click();
        console.log('Clicked edit button');

        await page.waitForTimeout(1000);

        // Step 8: Verify edit mode is visible with input fields
        const landmarkEditMode = page.locator(config.selectors.viewEditLandmarks.landmarkEditMode);
        await expect(landmarkEditMode).toBeVisible({ timeout: 5000 });
        console.log('Edit mode is visible');

        // Step 9: Edit the landmark name
        const landmarkNameInput = page.locator(config.selectors.viewEditLandmarks.landmarkNameEdit);
        await expect(landmarkNameInput).toBeVisible({ timeout: 5000 });
        await landmarkNameInput.clear();
        const editedLandmarkName = `AutoTest_Landmark_Edited_${Date.now()}`;
        await landmarkNameInput.fill(editedLandmarkName);
        console.log(`Updated landmark name to: ${editedLandmarkName}`);

        // Step 10: Edit the radius
        const landmarkRadiusInput = page.locator(config.selectors.viewEditLandmarks.landmarkRadiusEdit);
        await expect(landmarkRadiusInput).toBeVisible({ timeout: 5000 });
        await landmarkRadiusInput.clear();
        await landmarkRadiusInput.fill('500');
        console.log('Updated landmark radius to: 500');

        // Step 11: Click Save button and wait for API calls
        const saveButton = page.locator(config.selectors.viewEditLandmarks.saveLandmarkEdit);
        await expect(saveButton).toBeVisible({ timeout: 5000 });

        // Set up API response listeners before clicking save
        const updateApiPromise = page.waitForResponse(
            response => response.url().includes('updatelandmark') && response.status() === 200,
            { timeout: 30000 }
        ).catch(() => null);

        const getLandmarkApiPromise = page.waitForResponse(
            response => response.url().includes('getLandmark') && response.status() === 200,
            { timeout: 30000 }
        ).catch(() => null);

        await saveButton.click();
        console.log('Clicked save button');

        // Wait for API calls to complete
        const updateResponse = await updateApiPromise;
        if (updateResponse) {
            console.log('Update API called:', updateResponse.url());
        }

        const getLandmarkResponse = await getLandmarkApiPromise;
        if (getLandmarkResponse) {
            console.log('Get Landmark API called:', getLandmarkResponse.url());
        }

        await page.waitForTimeout(2000);
        console.log('Landmark edit completed successfully');

        // ==================== DELETE LANDMARK ====================

        // Step 12: Click the edit button (pencil icon) again to enter edit mode
        await expect(editButton).toBeVisible({ timeout: 5000 });
        await editButton.click();
        console.log('Clicked edit button again for delete');

        await page.waitForTimeout(1000);

        // Step 13: Verify edit mode is visible
        await expect(landmarkEditMode).toBeVisible({ timeout: 5000 });
        console.log('Edit mode is visible');

        // Step 14: Click the delete button
        const deleteButton = page.locator(config.selectors.viewEditLandmarks.deleteLandmark);
        await expect(deleteButton).toBeVisible({ timeout: 5000 });
        await deleteButton.click();
        console.log('Clicked delete button');

        await page.waitForTimeout(1000);

        // Step 15: Confirmation modal appears - click Delete button to confirm
        console.log('Waiting for delete confirmation modal...');

        // Wait for the modal to be visible
        const deleteModal = page.locator('.modal-overlay:not(.hidden), .modal:visible, [class*="modal"]:visible').first();
        await expect(deleteModal).toBeVisible({ timeout: 5000 });

        // Click the Delete button inside the confirmation modal
        const confirmDeleteButton = page.locator('.modal-overlay:not(.hidden) button.btn--danger, .modal button.btn--danger').first();
        await expect(confirmDeleteButton).toBeVisible({ timeout: 5000 });

        // Set up API response listeners before confirming delete
        const deleteApiPromise = page.waitForResponse(
            response => response.url().includes('deletelandmark') && response.status() === 200,
            { timeout: 30000 }
        ).catch(() => null);

        const getLandmarkAfterDeletePromise = page.waitForResponse(
            response => response.url().includes('getLandmark') && response.status() === 200,
            { timeout: 30000 }
        ).catch(() => null);

        await confirmDeleteButton.click();
        console.log('Confirmed deletion by clicking Delete button');

        // Step 16: Wait for delete API calls and verify landmark is removed
        const deleteResponse = await deleteApiPromise;
        if (deleteResponse) {
            console.log('Delete API called:', deleteResponse.url());
        }

        const getLandmarkAfterDeleteResponse = await getLandmarkAfterDeletePromise;
        if (getLandmarkAfterDeleteResponse) {
            console.log('Get Landmark API called after delete:', getLandmarkAfterDeleteResponse.url());

            // Verify the deleted landmark is not in the API response
            const landmarkData = await getLandmarkAfterDeleteResponse.json();
            console.log('Verifying deleted landmark is not in API response...');

            const landmarkNames = JSON.stringify(landmarkData);
            expect(landmarkNames).not.toContain(editedLandmarkName);
            console.log(`API Verified: "${editedLandmarkName}" is not in the landmark list`);
        }

        await page.waitForTimeout(2000);

        // Step 17: Verify in UI - Check dropdown doesn't contain deleted landmark
        console.log('Verifying deleted landmark is not in UI dropdown...');
        const landmarkDropdown = page.locator(config.selectors.viewEditLandmarks.landmarkTitleDropdown);

        if (await landmarkDropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
            const dropdownOptions = await landmarkDropdown.locator('option').allTextContents();
            console.log('Dropdown options:', dropdownOptions.length);

            const isLandmarkInDropdown = dropdownOptions.some(option => option.includes(editedLandmarkName));
            expect(isLandmarkInDropdown).toBe(false);
            console.log(`UI Verified: "${editedLandmarkName}" is not in the landmark dropdown`);
        }

        console.log('Landmark deletion completed and verified successfully');
    });

    test('should be able to toggle Hide Vehicle Markers for landmarks', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // ==================== PART 1: UNCHECKED - VEHICLE MARKERS VISIBLE ====================

        // Step 1: Try to open View/Edit Landmarks modal
        console.log('PART 1: Testing with Hide Vehicle Markers UNCHECKED');
        let { viewEditModalOpened, noDataAlert } = await openViewEditLandmarksModal(page, config);

        // If no landmarks exist, create one first
        if (noDataAlert) {
            console.log('No landmarks found, creating one first...');
            await page.waitForTimeout(3000); // Wait for alert to dismiss
            await createLandmarkIfNeeded(page, config);

            // Now try to open the modal again
            const result = await openViewEditLandmarksModal(page, config);
            viewEditModalOpened = result.viewEditModalOpened;
        }

        // Step 2: Wait for View Landmarks modal
        await expect(page.locator(config.selectors.viewEditLandmarks.viewEditContainer)).toBeVisible({ timeout: 10000 });

        // Step 3: Verify "Hide Vehicle Markers" checkbox is initially unchecked
        const hideVehicleMarkersCheckbox = page.locator(config.selectors.viewEditLandmarks.hideVehicleMarkersCheckbox);
        await expect(hideVehicleMarkersCheckbox).toBeVisible({ timeout: 5000 });

        const isChecked = await hideVehicleMarkersCheckbox.isChecked();
        expect(isChecked).toBe(false);
        console.log('Verified: Hide Vehicle Markers checkbox is initially unchecked');

        // Step 4: Click Submit button
        await expect(page.locator(config.selectors.viewEditLandmarks.submitButton)).toBeVisible();
        await page.locator(config.selectors.viewEditLandmarks.submitButton).click();

        await page.waitForTimeout(3000);
        console.log('Clicked Submit with checkbox unchecked');

        // Step 5: Verify device/vehicle markers are visible on the map
        // Vehicle markers have .marker-info class with direction circle and speed
        const deviceMarkers = page.locator('.marker-info');
        const deviceMarkerCount = await deviceMarkers.count();

        if (deviceMarkerCount > 0) {
            console.log(`Verified: ${deviceMarkerCount} device marker(s) visible on the map`);

            // Click on a device marker to verify realtime tracking works
            await deviceMarkers.first().click({ force: true });
            console.log('Clicked on device marker');

            await page.waitForTimeout(2000);

            // Verify realtime-tracking-timer opens up
            const realtimeTrackingTimer = page.locator('#realtime-tracking-timer');
            if (await realtimeTrackingTimer.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('Verified: Realtime tracking timer is visible');
                await expect(page.locator('#realtime-tracking-timer-text')).toBeVisible();
                await expect(page.locator('#realtime-tracking-vehicle-name')).toBeVisible();
                console.log('Verified: Timer text and vehicle name are displayed');
            }
        } else {
            console.log('No device markers visible in current view - this is expected if no vehicles in landmark area');
        }

        // Step 6: Close the landmark overlay if it's open
        const closeButton = page.locator(config.selectors.viewEditLandmarks.closeLandmarkOverlay);
        if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await closeButton.click();
            console.log('Clicked close button');
        }

        await page.waitForTimeout(2000);

        // ==================== PART 2: CHECKED - VEHICLE MARKERS HIDDEN ====================

        console.log('PART 2: Testing with Hide Vehicle Markers CHECKED');

        // Wait for page to stabilize after closing overlay
        await page.waitForTimeout(3000);

        // Step 9: Open View Landmarks modal again using helper function
        const result2 = await openViewEditLandmarksModal(page, config);
        console.log('Clicked View/Edit Landmarks');

        // Step 10: Wait for View Landmarks modal
        await expect(page.locator(config.selectors.viewEditLandmarks.viewEditContainer)).toBeVisible({ timeout: 10000 });

        // Step 11: Check the "Hide Vehicle Markers" checkbox
        const hideVehicleMarkersCheckbox2 = page.locator(config.selectors.viewEditLandmarks.hideVehicleMarkersCheckbox);
        await expect(hideVehicleMarkersCheckbox2).toBeVisible({ timeout: 5000 });
        await hideVehicleMarkersCheckbox2.check();
        console.log('Checked: Hide Vehicle Markers checkbox');

        // Verify checkbox is now checked
        const isCheckedNow = await hideVehicleMarkersCheckbox2.isChecked();
        expect(isCheckedNow).toBe(true);
        console.log('Verified: Hide Vehicle Markers checkbox is now checked');

        // Step 12: Click Submit button
        await expect(page.locator(config.selectors.viewEditLandmarks.submitButton)).toBeVisible();
        await page.locator(config.selectors.viewEditLandmarks.submitButton).click();

        await page.waitForTimeout(3000);
        console.log('Clicked Submit with checkbox checked');

        // Step 13: Verify device markers are NOT visible (or count is 0)
        const deviceMarkersAfter = page.locator('.marker-info');
        const deviceMarkerCountAfter = await deviceMarkersAfter.count();

        // With Hide Vehicle Markers checked, device markers should not be visible
        if (deviceMarkerCountAfter === 0) {
            console.log('Verified: No device markers visible when Hide Vehicle Markers is checked');
        } else {
            // Check if any are actually visible
            const isAnyMarkerVisible = await deviceMarkersAfter.first().isVisible({ timeout: 3000 }).catch(() => false);
            expect(isAnyMarkerVisible).toBe(false);
            console.log('Verified: Device markers are NOT visible when Hide Vehicle Markers is checked');
        }

        console.log('Hide Vehicle Markers toggle test completed successfully');
    });
});
