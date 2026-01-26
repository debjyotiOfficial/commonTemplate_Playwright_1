const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('view delete geofence', () => {
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

    test('should be able to view, edit and delete geofence', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Step 1: Navigate to View Geofences
        await page.locator(config.selectors.navigation.geofencingMenu).hover();
        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        await page.waitForTimeout(2000);

        const viewDeleteMenu = page.locator(config.selectors.navigation.viewDeleteGeofencingMenu);
        await expect(viewDeleteMenu).toBeVisible();

        const modalLocator = page.locator(config.selectors.viewDeleteGeofencing.viewDeleteContainer);

        // Click and wait for modal to open, retry if needed
        for (let attempt = 0; attempt < 3; attempt++) {
            await viewDeleteMenu.click({ force: true });
            try {
                await expect(modalLocator).not.toHaveClass(/hidden/, { timeout: 5000 });
                break;
            } catch {
                if (attempt === 2) throw new Error('Modal did not open after 3 attempts');
                console.log(`Modal click attempt ${attempt + 1} failed, retrying...`);
                await page.waitForTimeout(1000);
            }
        }

        // Step 2: Wait for View Geofences modal
        await expect(modalLocator).toBeVisible({ timeout: 10000 });
        await expect(modalLocator).toContainText('View Geofences');

        // Step 3: Keep "View All Geofences" selected and click Submit
        await expect(page.locator(config.selectors.viewDeleteGeofencing.geoList)).toBeVisible();
        await expect(page.locator(config.selectors.viewDeleteGeofencing.submitButton)).toBeVisible();
        await page.locator(config.selectors.viewDeleteGeofencing.submitButton).click();

        // Step 4: Wait for map to load with geofence markers
        await page.waitForTimeout(3000);
        console.log('Map loaded, looking for "Test Auto Geofence" marker...');

        // Step 5: Click on the geofence marker for "Test Auto Geofence"
        // Find the label and then click on the nearby marker (SVG element)
        console.log('Looking for "Test Auto Geofence" marker...');

        // Find the geofence marker that has "Test Auto Geofence" label nearby
        // The marker is a sibling div with class "geofence-marker" containing an SVG
        const geofenceMarker = page.locator('div:has(> div:text-is("Test Auto Geofence")) .geofence-marker').first();

        if (await geofenceMarker.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('Found geofence marker, clicking on it...');
            await geofenceMarker.click({ force: true });
        } else {
            // Alternative: Find label and click the marker near it
            console.log('Trying alternative approach - clicking marker near label...');
            const label = page.locator('div:text-is("Test Auto Geofence")').first();
            if (await label.isVisible({ timeout: 5000 })) {
                // Click on the parent container which should contain both label and marker
                const parentContainer = label.locator('xpath=ancestor::div[contains(@style, "position")]').first();
                await parentContainer.locator('.geofence-marker').click({ force: true }).catch(async () => {
                    // Last fallback - just click any geofence marker
                    console.log('Clicking first available geofence marker...');
                    await page.locator('.geofence-marker').first().click({ force: true });
                });
            } else {
                // Fallback: click first geofence marker
                console.log('Label not found, clicking first .geofence-marker...');
                await page.locator('.geofence-marker').first().click({ force: true, timeout: 10000 });
            }
        }

        await page.waitForTimeout(2000);

        // Step 6: Verify the geofence info panel is showing with full details
        console.log('Waiting for geofence info panel to expand...');

        // Close any interfering panels (driver card panel)
        const driverCardCloseBtn = page.locator('#driver-card-panel .close-btn, #driver-card-panel [class*="close"]').first();
        if (await driverCardCloseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await driverCardCloseBtn.click({ force: true });
            console.log('Closed driver card panel');
            await page.waitForTimeout(500);
        }

        // The overlay should show Name, Radius, Location - check for the view mode content
        const infoOverlay = page.locator('#geofence-info-overlay');
        await expect(infoOverlay).toBeVisible({ timeout: 10000 });

        // Wait for the overlay to be fully expanded (not collapsed)
        // Check if edit button is visible, if not, click on the overlay to expand
        const editButton = page.locator(config.selectors.viewDeleteGeofencing.editGeofenceButton);

        // Try multiple approaches to make the edit button visible
        for (let attempt = 0; attempt < 3; attempt++) {
            if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log('Edit button is now visible');
                break;
            }

            console.log(`Edit button not visible, attempt ${attempt + 1} to expand overlay...`);

            // Try selecting from dropdown first
            const geofenceDropdown = page.locator('#geofence-title select');
            if (await geofenceDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
                // Get all options and select one that contains "Test Auto Geofence" or first available
                const options = await geofenceDropdown.locator('option').allTextContents();
                const targetOption = options.find(opt => opt.includes('Test Auto Geofence')) || options[0];
                if (targetOption) {
                    await geofenceDropdown.selectOption({ label: targetOption });
                    console.log(`Selected geofence: ${targetOption}`);
                    await page.waitForTimeout(2000);
                }
            }

            // If still not visible, try clicking the overlay header to expand
            if (!await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                const overlayHeader = page.locator('#geofence-info-overlay .overlay-header, #geofence-info-overlay h3, #geofence-title').first();
                if (await overlayHeader.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await overlayHeader.click({ force: true });
                    console.log('Clicked overlay header to expand');
                    await page.waitForTimeout(1000);
                }
            }
        }

        console.log('Geofence info panel is visible');

        // ==================== EDIT GEOFENCE ====================

        // Step 7: Click the edit button (pencil icon) to enter edit mode
        await expect(editButton).toBeVisible({ timeout: 10000 });
        await editButton.click();
        console.log('Clicked edit button');

        await page.waitForTimeout(1000);

        // Step 8: Verify edit mode is visible with input fields
        const geofenceEditMode = page.locator('#geofence-edit-mode');
        await expect(geofenceEditMode).toBeVisible({ timeout: 5000 });
        console.log('Edit mode is visible');

        // Step 9: Edit the geofence name
        const geofenceNameInput = page.locator(config.selectors.viewDeleteGeofencing.geofenceNameEdit);
        await expect(geofenceNameInput).toBeVisible({ timeout: 5000 });
        await geofenceNameInput.clear();
        const editedGeofenceName = `Test Auto Geofence_Edited_${Date.now()}`;
        await geofenceNameInput.fill(editedGeofenceName);
        console.log(`Updated geofence name to: ${editedGeofenceName}`);

        // Step 10: Edit the radius
        const geofenceRadiusInput = page.locator(config.selectors.viewDeleteGeofencing.geofenceRadiusEdit);
        await expect(geofenceRadiusInput).toBeVisible({ timeout: 5000 });
        await geofenceRadiusInput.clear();
        await geofenceRadiusInput.fill('700');
        console.log('Updated geofence radius to: 700');

        // Step 11: Click Save button and wait for API calls
        const saveButton = page.locator(config.selectors.viewDeleteGeofencing.saveGeofenceEdit);
        await expect(saveButton).toBeVisible({ timeout: 5000 });

        // Set up API response listeners before clicking save
        const updateApiPromise = page.waitForResponse(
            response => response.url().includes('updategeofence_rds.php') && response.status() === 200,
            { timeout: 30000 }
        );
        const getGeofenceApiPromise = page.waitForResponse(
            response => response.url().includes('getGeofence.php') && response.status() === 200,
            { timeout: 30000 }
        );

        await saveButton.click();
        console.log('Clicked save button');

        // Wait for both API calls to complete
        const updateResponse = await updateApiPromise;
        console.log('Update API called:', updateResponse.url());

        const getGeofenceResponse = await getGeofenceApiPromise;
        console.log('Get Geofence API called:', getGeofenceResponse.url());

        await page.waitForTimeout(2000);
        console.log('Geofence edit completed successfully');

        // ==================== DELETE GEOFENCE ====================

        // Step 12: Click the edit button (pencil icon) again to enter edit mode
        await expect(editButton).toBeVisible({ timeout: 5000 });
        await editButton.click();
        console.log('Clicked edit button again for delete');

        await page.waitForTimeout(1000);

        // Step 13: Verify edit mode is visible
        await expect(geofenceEditMode).toBeVisible({ timeout: 5000 });
        console.log('Edit mode is visible');

        // Step 14: Click the delete button
        const deleteButton = page.locator(config.selectors.viewDeleteGeofencing.deleteGeofence);
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
            response => response.url().includes('deletegeofence_rds.php') && response.status() === 200,
            { timeout: 30000 }
        );
        const getGeofenceAfterDeletePromise = page.waitForResponse(
            response => response.url().includes('getGeofence.php') && response.status() === 200,
            { timeout: 30000 }
        );

        await confirmDeleteButton.click();
        console.log('Confirmed deletion by clicking Delete button');

        // Step 16: Wait for delete API calls and verify geofence is removed
        const deleteResponse = await deleteApiPromise;
        console.log('Delete API called:', deleteResponse.url());

        const getGeofenceAfterDeleteResponse = await getGeofenceAfterDeletePromise;
        console.log('Get Geofence API called after delete:', getGeofenceAfterDeleteResponse.url());

        // Verify the deleted geofence is not in the API response
        const geofenceData = await getGeofenceAfterDeleteResponse.json();
        console.log('Verifying deleted geofence is not in API response...');

        // Check that the edited geofence name is not in the response
        const geofenceNames = JSON.stringify(geofenceData);
        expect(geofenceNames).not.toContain(editedGeofenceName);
        console.log(`API Verified: "${editedGeofenceName}" is not in the geofence list`);

        await page.waitForTimeout(2000);

        // Step 17: Verify in UI - Click on geofence dropdown and check deleted geofence is not there
        console.log('Verifying deleted geofence is not in UI dropdown...');
        const geofenceDropdown = page.locator('#geofence-title select');
        await expect(geofenceDropdown).toBeVisible({ timeout: 5000 });

        // Get all options from the dropdown
        const dropdownOptions = await geofenceDropdown.locator('option').allTextContents();
        console.log('Dropdown options:', dropdownOptions.length);

        // Verify the deleted geofence name is not in the dropdown
        const isGeofenceInDropdown = dropdownOptions.some(option => option.includes(editedGeofenceName));
        expect(isGeofenceInDropdown).toBe(false);
        console.log(`UI Verified: "${editedGeofenceName}" is not in the geofence dropdown`);

        console.log('Geofence deletion completed and verified successfully');
    });

    test('should be able to toggle Hide Vehicle Markers', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // ==================== PART 1: UNCHECKED - VEHICLE MARKERS VISIBLE ====================

        // Step 1: Navigate to View Geofences
        console.log('PART 1: Testing with Hide Vehicle Markers UNCHECKED');
        await page.locator(config.selectors.navigation.geofencingMenu).hover();
        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        await page.waitForTimeout(2000);

        await expect(page.locator(config.selectors.navigation.viewDeleteGeofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.viewDeleteGeofencingMenu).click({ force: true });

        // Step 2: Wait for View Geofences modal
        await expect(page.locator(config.selectors.viewDeleteGeofencing.viewDeleteContainer)).toBeVisible({ timeout: 10000 });

        // Step 3: Verify "Hide Vehicle Markers" checkbox is initially unchecked
        const hideVehicleMarkersCheckbox = page.locator('#view-delete-geofences-modal input[type="checkbox"]');
        await expect(hideVehicleMarkersCheckbox).toBeVisible({ timeout: 5000 });

        const isChecked = await hideVehicleMarkersCheckbox.isChecked();
        expect(isChecked).toBe(false);
        console.log('Verified: Hide Vehicle Markers checkbox is initially unchecked');

        // Step 4: Click Submit button
        await expect(page.locator(config.selectors.viewDeleteGeofencing.submitButton)).toBeVisible();
        await page.locator(config.selectors.viewDeleteGeofencing.submitButton).click();

        await page.waitForTimeout(3000);
        console.log('Clicked Submit with checkbox unchecked');

        // Step 5: Verify device marker is visible
        const deviceMarker = page.locator('.marker-info').first();
        await expect(deviceMarker).toBeVisible({ timeout: 10000 });
        console.log('Verified: Device marker is visible');

        // Step 6: Click on the device marker
        await deviceMarker.click({ force: true });
        console.log('Clicked on device marker');

        await page.waitForTimeout(2000);

        // Step 7: Verify realtime-tracking-timer opens up
        const realtimeTrackingTimer = page.locator('#realtime-tracking-timer');
        await expect(realtimeTrackingTimer).toBeVisible({ timeout: 10000 });
        console.log('Verified: Realtime tracking timer is visible');

        // Verify timer text and vehicle name are present
        await expect(page.locator('#realtime-tracking-timer-text')).toBeVisible();
        await expect(page.locator('#realtime-tracking-vehicle-name')).toBeVisible();
        console.log('Verified: Timer text and vehicle name are displayed');

        // Step 8: Click close button
        const closeButton = page.locator(config.selectors.viewDeleteGeofencing.closeGeofenceOverlay);
        await expect(closeButton).toBeVisible({ timeout: 5000 });
        await closeButton.click();
        console.log('Clicked close button');

        await page.waitForTimeout(2000);

        // ==================== PART 2: CHECKED - VEHICLE MARKERS HIDDEN ====================

        console.log('PART 2: Testing with Hide Vehicle Markers CHECKED');

        // Wait for page to stabilize after closing overlay
        await page.waitForTimeout(3000);

        // Step 9: Open View Geofences modal again
        // First click to expand the Geofencing menu section
        const geofencingMenu = page.locator(config.selectors.navigation.geofencingMenu);
        await geofencingMenu.scrollIntoViewIfNeeded();
        await expect(geofencingMenu).toBeVisible({ timeout: 5000 });
        await geofencingMenu.click();
        console.log('Clicked Geofencing menu');

        await page.waitForTimeout(2000);

        // Click on View/Delete Geofences submenu
        const viewDeleteMenu = page.locator(config.selectors.navigation.viewDeleteGeofencingMenu);
        await expect(viewDeleteMenu).toBeVisible({ timeout: 5000 });
        await viewDeleteMenu.click({ force: true });
        console.log('Clicked View/Delete Geofences');

        // Step 10: Wait for View Geofences modal
        await expect(page.locator(config.selectors.viewDeleteGeofencing.viewDeleteContainer)).toBeVisible({ timeout: 10000 });

        // Step 11: Check the "Hide Vehicle Markers" checkbox
        const hideVehicleMarkersCheckbox2 = page.locator('#view-delete-geofences-modal input[type="checkbox"]');
        await expect(hideVehicleMarkersCheckbox2).toBeVisible({ timeout: 5000 });
        await hideVehicleMarkersCheckbox2.check();
        console.log('Checked: Hide Vehicle Markers checkbox');

        // Verify checkbox is now checked
        const isCheckedNow = await hideVehicleMarkersCheckbox2.isChecked();
        expect(isCheckedNow).toBe(true);
        console.log('Verified: Hide Vehicle Markers checkbox is now checked');

        // Step 12: Click Submit button
        await expect(page.locator(config.selectors.viewDeleteGeofencing.submitButton)).toBeVisible();
        await page.locator(config.selectors.viewDeleteGeofencing.submitButton).click();

        await page.waitForTimeout(3000);
        console.log('Clicked Submit with checkbox checked');

        // Step 13: Verify device marker is NOT visible
        const deviceMarkerAfter = page.locator('.marker-info').first();
        const isMarkerVisible = await deviceMarkerAfter.isVisible({ timeout: 5000 }).catch(() => false);
        expect(isMarkerVisible).toBe(false);
        console.log('Verified: Device marker is NOT visible when Hide Vehicle Markers is checked');

        console.log('Hide Vehicle Markers toggle test completed successfully');
    });
});
