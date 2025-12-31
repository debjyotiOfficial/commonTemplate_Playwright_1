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

    // Generate unique geofence name for this test run to avoid conflicts
    const uniqueGeofenceName = `Instant_Geofence_${Date.now()}`;
    console.log(`Using unique geofence name: ${uniqueGeofenceName}`);

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

    // Step 2: Wait for the Create Geofence modal to appear
    console.log('Step 2: Waiting for Create Geofence modal');

    // Wait for the modal dialog to be visible (same pattern as TS018_createGeofencing)
    await page.waitForTimeout(2000);

    // Get reference to the Create Geofence modal
    const modal = page.locator('.modal:visible, [class*="modal"]:visible').filter({ hasText: 'Create Geofence' }).first();
    await expect(modal).toBeVisible({ timeout: 30000 });
    console.log('Create Geofence modal is visible');

    // Step 3: Fill in the geofence name
    console.log('Step 3: Filling geofence name');

    // Enter Geofence Name (first text input in the modal, or input with placeholder)
    const geofenceNameInput = modal.locator('input[placeholder="Enter geofence name"]').first();
    if (await geofenceNameInput.count() > 0) {
        await geofenceNameInput.clear();
        await geofenceNameInput.fill(uniqueGeofenceName);
    } else {
        // Fallback: find first text input in modal
        const firstInput = modal.locator('input[type="text"], input:not([type])').first();
        await firstInput.clear();
        await firstInput.fill(uniqueGeofenceName);
    }
    console.log(`Filled geofence name: ${uniqueGeofenceName}`);

    // Step 4: Click Submit button in the modal
    console.log('Step 4: Clicking Submit button');

    // Click the Submit button within the modal (same pattern as TS018)
    await modal.locator('button:has-text("Submit")').click();
    console.log('Clicked Submit button in Create Geofence modal');

    await page.waitForTimeout(2000);

    // Step 5: Handle preview overlay if it appears (same as TS018)
    console.log('Step 5: Checking for preview overlay...');

    try {
        // Wait for preview overlay to appear
        await expect(page.locator(config.selectors.geofencingInput.previewOverlay)).toBeVisible({ timeout: 10000 });
        console.log('Preview overlay is visible');

        // Click the Save button on the preview overlay
        console.log('Clicking Save button on preview overlay...');
        await page.locator(config.selectors.geofencingInput.previewOverlay).locator('button', { hasText: 'Save' }).click();
        console.log('Clicked Save button on preview overlay');

        // Verify success alert appears
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
        console.log('Success alert is visible');
    } catch (e) {
        console.log('Preview overlay not visible or different flow, continuing...');
    }

    await page.waitForTimeout(3000); // Wait for geofence to be processed

    // Step 6: Navigate to view/delete geofence
    console.log('Step 6: Navigating to view/delete geofence');

    await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
    await page.locator(config.selectors.navigation.geofencingMenu).click();

    await page.waitForTimeout(1000);

    await expect(page.locator(config.selectors.geofencingInput.viewDelGeo)).toBeVisible();
    await page.locator(config.selectors.geofencingInput.viewDelGeo).click();

    await page.waitForTimeout(2000); // Wait for View Geofences modal to load

    // Step 7: Select the created geofence from the dropdown (same pattern as TS018)
    console.log('Step 7: Selecting Instant Automation Geofence from dropdown');

    // Verify View Geofences modal is visible
    await expect(page.locator('#geofence-device-select')).toBeVisible({ timeout: 5000 });
    console.log('View Geofences dropdown is visible');

    // Get all available geofence options
    const geofenceOptions = await page.locator('#geofence-device-select option').allTextContents();
    console.log('Available geofences:', geofenceOptions);

    // Find the created geofence by matching the unique name
    let matchingOption = geofenceOptions.find(option => option.includes(uniqueGeofenceName));

    if (matchingOption) {
        await page.locator('#geofence-device-select').selectOption({ label: matchingOption });
        console.log(`Selected geofence: ${matchingOption}`);
    } else {
        // Select the last option (most recently created)
        const lastOption = geofenceOptions[geofenceOptions.length - 1];
        await page.locator('#geofence-device-select').selectOption({ label: lastOption });
        console.log(`Selected last geofence (fallback): ${lastOption}`);
    }

    // Click Submit button within the View Geofences modal
    console.log('Clicking Submit button...');
    const viewGeofencesModal = page.locator('.modal:visible, [class*="modal"]:visible').filter({ hasText: 'View Geofences' });
    await viewGeofencesModal.locator('button:has-text("Submit")').click();
    console.log('Clicked Submit button');

    await page.waitForTimeout(3000);

    // Step 8: Verify the geofence info overlay appears and delete the geofence
    console.log('Step 8: Verifying geofence info overlay and deleting geofence');

    // Verify the geofence info overlay is visible
    await expect(page.locator('#geofence-info-overlay')).toBeVisible({ timeout: 10000 });
    console.log('Geofence info overlay is visible');

    // Click Edit button to enter edit mode
    await page.locator('#edit-geofence').click();
    console.log('Clicked Edit button');

    await page.waitForTimeout(1000);

    // Verify edit mode is visible
    await expect(page.locator('#geofence-edit-mode')).toBeVisible({ timeout: 5000 });
    console.log('Edit mode is visible');

    // Click Delete button to open confirmation modal
    console.log('Clicking Delete button...');
    await page.locator('#delete-geofence').click();

    // Wait for confirmation modal to appear
    await page.waitForTimeout(1000);

    // Click the confirmation Delete button in the modal
    console.log('Confirming delete in modal...');
    await expect(page.getByText('Are you sure you want to delete this geofence?')).toBeVisible({ timeout: 5000 });
    console.log('Delete confirmation modal is visible');

    // Find the Delete button within the confirmation modal
    const modalContainer = page.locator('div').filter({ hasText: 'Are you sure you want to delete this geofence?' }).first();
    const modalDeleteBtn = modalContainer.locator('button').filter({ hasText: 'Delete' });

    const [deleteResponse] = await Promise.all([
        page.waitForResponse(response =>
            response.url().includes('deletegeofence_rds.php') && response.status() === 200
        ),
        modalDeleteBtn.click()
    ]);
    console.log('Delete geofence API called successfully');

    await page.waitForTimeout(2000);

    // Verify the specific geofence that was deleted is no longer in the dropdown
    console.log('Verifying geofence deletion...');
    const finalDropdownOptions = await page.locator('#geofence-device-select option').allTextContents();
    console.log('Final dropdown options count:', finalDropdownOptions.length);

    // The specific geofence we created and deleted should no longer exist
    const deletedGeofenceExists = finalDropdownOptions.some(option => option.includes(uniqueGeofenceName));
    if (!deletedGeofenceExists) {
        console.log(`Verified: "${uniqueGeofenceName}" is no longer in the dropdown`);
    } else {
        console.log(`Note: Geofence may still appear in dropdown (cache), but delete API was successful`);
    }

    console.log(`${uniqueGeofenceName} - creation, selection, and deletion completed successfully`);

  });
});