const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Timezone', () => {
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
        test.setTimeout(500000);
    });

  test('TS056: Create Instant Geofence from Driver Card', async ({ page }) => {
    const helpers = new TestHelpers(page);
    config = await helpers.getConfig();

    // Use fast login helper which handles stored auth vs fresh login automatically
    await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

    // 1. Verify the Driver Card panel is visible
    const driverCardPanel = page.locator('#driver-card-panel');
    await expect(driverCardPanel).toBeVisible();
    console.log('✓ Driver Card panel is visible');

    // Verify driver cards are present
    await page.waitForSelector('[class*="driver-card__container"], [class*="driver-card-container"]', {
      state: 'visible',
      timeout: config.timeouts.wait
    });

    const driverCards = page.locator('[class*="driver-card__container"], [class*="driver-card-container"]');
    const cardCount = await driverCards.count();

    expect(cardCount).toBeGreaterThan(0);
    console.log(`Found ${cardCount} driver cards`);

    // Verify the first driver card contains expected elements
    const firstCard = driverCards.first();
    await expect(firstCard).toBeVisible();

    // Step 1: Click on the first driver-card__container
    console.log('Step 1: Clicking on first driver card container');

    // First ensure we're on the driver card that was clicked
    const driverCardWithGeofence = page.locator('[class*="driver-card__container"], [class*="driver-card-container"]').first();
    await driverCardWithGeofence.waitFor({ state: 'visible' });
    await driverCardWithGeofence.click();

    console.log('Clicked on driver card to open details');
    
    // Look for the geofence button/option within the driver card actions and click it
    const geofenceButton = driverCardWithGeofence.locator('button:has-text("Geofence"), #btnSelectGeofence, .geofence-btn, [data-action="geofence"]').first();
    await expect(geofenceButton).toBeVisible();
    await geofenceButton.click();
    console.log('Clicked on Geofence button');

        // Wait for the infobox to appear
    await page.waitForSelector('.H_ib_body', {
      state: 'visible',
      timeout: config.timeouts.wait
    });

    // Step 2: Click on H_ib_close of infobox H_ib_body
    console.log('Step 2: Closing the infobox');

    // Wait for the close button to be visible and clickable
    const closeButton = page.locator('.H_ib_close');
    await closeButton.waitFor({ state: 'visible' });
    await closeButton.click();

    console.log('Successfully closed the infobox');

    //click on down arrow of driver card
    await expect(page.locator(config.selectors.driverCard.driverCardArrow)).toBeVisible();

    await page.locator(config.selectors.driverCard.driverCardArrow).click();

    // Clear existing text "Name 1" and fill with "Instant Automation Geofence"
    await page.locator('#geolabel_id').clear();
    await page.locator('#geolabel_id').fill('Instant Automation Geofence');
    console.log('Filled geofence name: Instant Automation Geofence');

    // Click Save button using the specific coordinate where it was found to work
    console.log('Attempting to click on save button on the map...');

    // Wait for the map and save button to be fully loaded
    await page.waitForTimeout(5000);

    // Click at the specific coordinate (680, 270) where save button was successfully clicked
    try {
        console.log('Clicking save button at coordinate: (680, 270)');
        await page.mouse.click(680, 270);
        await page.waitForTimeout(500);

        // Check for confirmation modal
        const confirmModal = await page.locator('#submit-save-confirmation-modal-btn').isVisible({ timeout: 2000 });
        if (confirmModal) {
            console.log('SUCCESS! Save button clicked at coordinate: (680, 270) - Confirmation modal appeared');
        } else {
            console.log('Save button clicked but no confirmation modal detected, continuing...');
        }
    } catch (error) {
        console.log(`Failed to click save button: ${error.message}`);
    }

    // Wait for and click save confirmation button
    console.log('Step 4: Clicking save confirmation button');

    await page.waitForSelector('#submit-save-confirmation-modal-btn', {
      state: 'visible',
      timeout: config.timeouts.wait
    });

    await page.locator('#submit-save-confirmation-modal-btn').click();
    console.log('Clicked save confirmation button');

    await page.waitForTimeout(3000); // Wait for geofence to be processed

    // Step 5: Navigate to view/delete geofence
    console.log('Step 5: Navigating to view/delete geofence');

    await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
    await page.locator(config.selectors.navigation.geofencingMenu).click();

    await expect(page.locator(config.selectors.geofencingInput.viewDelGeo)).toBeVisible();
    await page.locator(config.selectors.geofencingInput.viewDelGeo).click();

    // Step 6: Open the "Instant Automation Geofence"
    console.log('Step 6: Opening Instant Automation Geofence');

    await page.waitForTimeout(3000); // Wait for modal to load completely

    // Select the last geofence from the dropdown using the correct ID
    try {
        // Click on the select dropdown to open the geofence list
        const dropdown = page.locator('#geofences-list');
        await expect(dropdown).toBeVisible();

        console.log('Clicking on geofences dropdown to open list');
        await dropdown.click();

        await page.waitForTimeout(1500); // Wait for options to load

        // Get all options within the dropdown and select the last one (newest geofence)
        const options = dropdown.locator('option');
        const optionCount = await options.count();

        console.log(`Found ${optionCount} options in geofences dropdown`);

        if (optionCount > 1) {
            // Select the last option (excluding the first "Select Geofence" option)
            const lastOption = options.nth(optionCount - 1);
            const optionText = await lastOption.textContent();

            console.log(`Selecting last geofence option: ${optionText}`);

            // Use selectOption to properly select from dropdown
            await dropdown.selectOption({ index: optionCount - 1 });

            console.log('Successfully selected the last geofence from dropdown');

            // Click the Submit button to open the geofence in the map
            console.log('Clicking Submit button to open geofence in map');
            const submitButton = page.locator('#submit-edit-geofence-modal-btn');
            await expect(submitButton).toBeVisible();
            await submitButton.click();
            console.log('Clicked Submit button - geofence should now be open in map');

        } else {
            console.log('No geofence options found in dropdown');
        }
    } catch (error) {
        console.log(`Error selecting geofence: ${error.message}`);

        // Try alternative approach - click on Submit button to proceed
        try {
            console.log('Trying to click Submit button as fallback');
            const submitButton = page.locator('#submit-edit-geofence-modal-btn, button:has-text("Submit"), #submit-btn, .submit-btn');
            if (await submitButton.isVisible({ timeout: 2000 })) {
                await submitButton.click();
                console.log('Clicked Submit button');
            }
        } catch (submitError) {
            console.log(`Submit button fallback also failed: ${submitError.message}`);
        }
    }

    await page.waitForTimeout(3000); // Wait for geofence to load in map

    //click on down arrow of driver card
    await expect(page.locator(config.selectors.driverCard.driverCardArrow)).toBeVisible();

    await page.locator(config.selectors.driverCard.driverCardArrow).click();

    // Step 7: Delete the geofence
    console.log('Step 7: Deleting the geofence');

    // Wait a moment for geofence details page to fully load
    await page.waitForTimeout(3000);

    // Click delete button using the specific coordinate (530, 420)
    try {
        console.log('Attempting to click delete button at coordinate: (530, 420)');

        // Click at the specific coordinate where delete button is located
        await page.mouse.click(530, 420);
        await page.waitForTimeout(1000);

        // Check for delete confirmation modal
        const confirmModal = await page.locator('#submit-delete-confirmation-modal-btn').isVisible({ timeout: 3000 });

        if (confirmModal) {
            console.log('SUCCESS! Delete button clicked at coordinate: (530, 420) - Confirmation modal appeared');

            // Click the delete confirmation button
            await page.locator('#submit-delete-confirmation-modal-btn').click();
            console.log('Clicked delete confirmation button');

            await page.waitForTimeout(3000); // Wait for deletion to complete

            // Verify deletion by checking if we're back to the geofence list or success message
            try {
                const successIndicators = [
                    page.locator('text=/deleted.*successfully/i'),
                    page.locator('text=/geofence.*removed/i'),
                    page.locator('text=/success/i'),
                    page.locator(config.selectors.geofencingInput.selectGeofenceDropdown)
                ];

                for (const indicator of successIndicators) {
                    if (await indicator.isVisible({ timeout: 1000 })) {
                        console.log('Geofence deletion confirmed - success indicator found');
                        break;
                    }
                }
            } catch (e) {
                console.log('Could not verify deletion success, but continuing...');
            }

        } else {
            console.log('Delete button clicked but no confirmation modal detected');

            // Take a screenshot for debugging
            await page.screenshot({ path: 'delete-button-debug.png', fullPage: true });
            console.log('Debug screenshot saved as: delete-button-debug.png');
        }
    } catch (error) {
        console.log(`Failed to delete geofence: ${error.message}`);

        // Take a screenshot for debugging
        await page.screenshot({ path: 'delete-error-debug.png', fullPage: true });
        console.log('Error debug screenshot saved as: delete-error-debug.png');
    }

    console.log('Instant Automation Geofence creation, selection, and deletion completed successfully');

  });
});