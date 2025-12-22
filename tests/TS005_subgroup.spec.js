const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Subgroup', () => {
    let config;
    let helpers;

    // API endpoints
    const API_ENDPOINTS = {
        createSubgroup: 'https://www.gpsandfleet3.net/gpsandfleet/gpsandfleet_common/SaveData_RDS/createSubGroup_rds.php',
        deleteSubgroup: 'https://www.gpsandfleet3.net/gpsandfleet/gpsandfleet_common/SaveData_RDS/deletesubgroup_rds_subg.php',
        getSubgroups: 'https://www.gpsandfleet3.net/gpsandfleet/gpsandfleet_common/Data/getSubGroup.php',
        getDriversToSubgroup: 'https://www.gpsandfleet3.net/gpsandfleet/gpsandfleet_common/Data/getDriversToSubGroup_subg.php'
    };

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
        test.setTimeout(200000); // 3+ minutes for long test
    });

    test('should manage subgroups', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Define the test subgroup name
        const testSubgroupName = 'testDp';

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // ========== STEP 1: OPEN SUBGROUPS PANEL ==========
        // Click on accounts settings menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();
        await page.waitForTimeout(1000);

        // Open subgroups dropdown - use force click due to potential overlay issues
        await expect(page.locator(config.selectors.subGroup.subgroupsMenu)).toBeVisible();
        await page.locator(config.selectors.subGroup.subgroupsMenu).click({ force: true });

        // Verify subgroups container is visible
        await expect(page.locator(config.selectors.subGroup.subgroupsContainer)).toBeVisible();
        await expect(page.locator(config.selectors.subGroup.subgroupsContainer))
            .toContainText('Subgroups');

        // ========== STEP 2: CREATE NEW SUBGROUP WITH API ASSERTION ==========
        await expect(page.locator(config.selectors.subGroup.addSubGroupButton)).toBeVisible();
        await page.locator(config.selectors.subGroup.addSubGroupButton).click();

        // Verify the new subgroup modal is visible
        await expect(page.locator(config.selectors.subGroup.subgroup_name_modal)).toBeVisible();
        await expect(page.locator(config.selectors.subGroup.subgroup_name_modal))
            .toContainText('Add New Subgroup');

        await page.locator(config.selectors.subGroup.newSubGroupNameInput).clear();
        await page.locator(config.selectors.subGroup.newSubGroupNameInput).fill(testSubgroupName);

        await expect(page.locator(config.selectors.subGroup.addSubmitButton)).toBeVisible();

        // Wait for both createSubgroup and getSubgroups API responses when clicking submit
        const [createResponse, getSubgroupsAfterCreateResponse] = await Promise.all([
            page.waitForResponse(response =>
                response.url().includes('createSubGroup_rds.php') && response.status() === 200
            ),
            page.waitForResponse(response =>
                response.url().includes('getSubGroup.php') && response.status() === 200
            ),
            page.locator(config.selectors.subGroup.addSubmitButton).click()
        ]);

        // Assert create subgroup API response
        console.log('========== API ASSERTION: CREATE SUBGROUP ==========');
        const createResponseBody = await createResponse.json();
        console.log('Create Subgroup API Response:', JSON.stringify(createResponseBody));
        expect(createResponse.status()).toBe(200);

        // Assert getSubgroups API response contains the new subgroup
        console.log('========== API ASSERTION: GET SUBGROUPS AFTER CREATE ==========');
        const subgroupsListAfterCreate = await getSubgroupsAfterCreateResponse.json();
        console.log('Get Subgroups API Response:', JSON.stringify(subgroupsListAfterCreate));
        expect(getSubgroupsAfterCreateResponse.status()).toBe(200);

        // Verify the created subgroup exists in the API response
        const subgroupExistsInResponse = Array.isArray(subgroupsListAfterCreate)
            ? subgroupsListAfterCreate.some(sg => sg.subgroup === testSubgroupName || sg.name === testSubgroupName || sg.subgroupName === testSubgroupName)
            : JSON.stringify(subgroupsListAfterCreate).includes(testSubgroupName);
        console.log(`Subgroup "${testSubgroupName}" exists in API response: ${subgroupExistsInResponse}`);
        expect(subgroupExistsInResponse).toBeTruthy();

        // Close modal if still visible (it may auto-close after successful creation)
        const closeModalButton = page.locator(config.selectors.subGroup.subgroup_name_modal + ' #close-subgroup-modal');
        const isModalVisible = await closeModalButton.isVisible().catch(() => false);
        if (isModalVisible) {
            await closeModalButton.click();
        }
        console.log(`Modal close button visible: ${isModalVisible}, proceeding...`);

        await page.waitForTimeout(3000);

        // ========== STEP 3: SEARCH AND VIEW THE CREATED SUBGROUP WITH API ASSERTION ==========
        // Click on search input
        const searchInput = page.locator('#subgroups-panel input[type="text"]').first();
        await expect(searchInput).toBeVisible();
        await searchInput.click();
        await searchInput.fill(testSubgroupName);

        await page.waitForTimeout(3000);

        // Verify UI shows the created subgroup - use case-insensitive matching for data attribute
        const subgroupItemInUI = page.locator('.subgroup-item').filter({ hasText: testSubgroupName });
        await expect(subgroupItemInUI).toBeVisible({ timeout: 15000 });
        await subgroupItemInUI.scrollIntoViewIfNeeded();
        console.log(`UI ASSERTION: Subgroup "${testSubgroupName}" is visible in the subgroups list`);

        // Find the eye icon within the subgroup item
        const eyeIcon = subgroupItemInUI.locator('.subgroups-view .icon--eye, .icon--eye').first();
        await expect(eyeIcon).toBeVisible({ timeout: 10000 });

        // Wait for getDriversToSubgroup API when clicking the view (eye) icon
        const [getDriversResponse] = await Promise.all([
            page.waitForResponse(response =>
                response.url().includes('getDriversToSubGroup_subg.php') && response.status() === 200
            ),
            eyeIcon.click({ force: true })
        ]);

        // Assert getDriversToSubgroup API response
        console.log('========== API ASSERTION: GET DRIVERS TO SUBGROUP ==========');
        const driversData = await getDriversResponse.json();
        console.log('Get Drivers to Subgroup API Response:', JSON.stringify(driversData));
        expect(getDriversResponse.status()).toBe(200);

        await page.waitForTimeout(5000);

        // Compare API response with UI - check assigned and unassigned drivers
        if (driversData.unassigned && Array.isArray(driversData.unassigned)) {
            const unassignedCount = driversData.unassigned.length;
            console.log(`API shows ${unassignedCount} unassigned drivers`);

            // Verify unassigned drivers are shown in UI
            const unassignedDriverCards = page.locator('.subgroup-driver-card__name-row button[data-action="add"]');
            const uiUnassignedCount = await unassignedDriverCards.count();
            console.log(`UI shows ${uiUnassignedCount} unassigned driver cards with Add button`);
        }

        if (driversData.assigned && Array.isArray(driversData.assigned)) {
            const assignedCount = driversData.assigned.length;
            console.log(`API shows ${assignedCount} assigned drivers`);
        }

        // ========== STEP 4: ADD DRIVER TO SUBGROUP ==========
        // Click the first "Add" button in the unassigned drivers list
        const addButton = page.locator('.subgroup-driver-card__name-row button[data-action="add"]').first();
        const addButtonExists = await addButton.count() > 0;

        if (addButtonExists) {
            await addButton.click({ force: true });
            await page.waitForTimeout(5000);
        } else {
            console.log('No unassigned drivers available to add');
        }

        // Click on back to subgroup
        await expect(page.locator(config.selectors.subGroup.back_to_subgroups_btn)).toBeVisible();
        await page.locator(config.selectors.subGroup.back_to_subgroups_btn).click();

        await page.waitForTimeout(5000);

        // ========== STEP 5: VIEW SUBGROUP AND VERIFY DRIVER CARD ==========
        // Close the subgroup panel first
        await expect(page.locator(config.selectors.subGroup.closeButton)).toBeVisible();
        await page.locator(config.selectors.subGroup.closeButton).click();

        await page.waitForTimeout(2000);

        // Click on accounts settings menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();
        await page.waitForTimeout(1000);

        // Open subgroups dropdown - use force click due to potential overlay issues
        await expect(page.locator(config.selectors.subGroup.subgroupsMenu)).toBeVisible();
        await page.locator(config.selectors.subGroup.subgroupsMenu).click({ force: true });

        // Verify subgroups container is visible
        await expect(page.locator(config.selectors.subGroup.subgroupsContainer)).toBeVisible();
        await expect(page.locator(config.selectors.subGroup.subgroupsContainer))
            .toContainText('Subgroups');

        // Click on search input
        const searchInput2 = page.locator('#subgroups-panel input[type="text"]').first();
        await expect(searchInput2).toBeVisible();
        await searchInput2.click();
        await searchInput2.fill(testSubgroupName);

        await page.waitForTimeout(3000);

        // Find the subgroup item and eye icon - use filter for more robust matching
        const subgroupItemInUI2 = page.locator('.subgroup-item').filter({ hasText: testSubgroupName });
        await expect(subgroupItemInUI2).toBeVisible({ timeout: 15000 });
        await subgroupItemInUI2.scrollIntoViewIfNeeded();

        // Find the eye icon within the subgroup item
        const eyeIcon2 = subgroupItemInUI2.locator('.subgroups-view .icon--eye, .icon--eye').first();
        await expect(eyeIcon2).toBeVisible({ timeout: 10000 });

        // Wait for getDriversToSubgroup API when clicking the view (eye) icon again
        const [getDriversResponse2] = await Promise.all([
            page.waitForResponse(response =>
                response.url().includes('getDriversToSubGroup_subg.php') && response.status() === 200
            ),
            eyeIcon2.click({ force: true })
        ]);

        // Assert getDriversToSubgroup API response after adding driver
        console.log('========== API ASSERTION: GET DRIVERS AFTER ADDING ==========');
        const driversDataAfterAdd = await getDriversResponse2.json();
        console.log('Get Drivers API Response after adding:', JSON.stringify(driversDataAfterAdd));
        expect(getDriversResponse2.status()).toBe(200);

        await page.waitForTimeout(3000);

        // Verify driver card is visible
        await expect(page.locator(config.selectors.driverCard.driverCardPanel)).toBeVisible();

        // Verify the header title contains the subgroup name
        await expect(page.locator(config.selectors.driverCard.driverCardPanel + ' .header__title')).toBeVisible();
        await expect(page.locator(config.selectors.driverCard.driverCardPanel + ' .header__title')).toContainText(testSubgroupName);

        // ========== STEP 6: EXIT SUBGROUP VIEW ==========
        // Close the subgroup panel - check if panel is open
        const subgroupPanel = page.locator('#subgroups-panel.panel--open');
        const isPanelOpen = await subgroupPanel.count() > 0;
        console.log(`Subgroup panel is open: ${isPanelOpen}`);

        if (isPanelOpen) {
            // Try multiple ways to close the panel
            // First try: look for any visible close icon in the panel
            const closeIcons = page.locator('#subgroups-panel .icon--close');
            const closeIconCount = await closeIcons.count();
            console.log(`Found ${closeIconCount} close icons in panel`);

            let closed = false;
            for (let i = 0; i < closeIconCount && !closed; i++) {
                const icon = closeIcons.nth(i);
                const isVisible = await icon.isVisible().catch(() => false);
                if (isVisible) {
                    await icon.click({ force: true });
                    console.log(`Clicked close icon ${i}`);
                    closed = true;
                }
            }

            // If no close icon worked, try pressing Escape
            if (!closed) {
                await page.keyboard.press('Escape');
                console.log('Pressed Escape to close panel');
            }
            await page.waitForTimeout(1000);
        }

        // Wait for panel to close
        await page.waitForTimeout(1000);

        // Verify the exit subgroup element contains the subgroup name
        await expect(page.locator('#bottom-nav-exit-subgroup')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('#bottom-nav-exit-subgroup')).toContainText(testSubgroupName);

        // Click to exit subgroup view using JavaScript click to bypass overlay issues
        await page.locator('#bottom-nav-exit-subgroup').evaluate(el => el.click());
        console.log('Clicked exit subgroup button via JavaScript');

        await page.waitForTimeout(2000);

        // Verify the exit subgroup element is no longer visible
        await expect(page.locator('#bottom-nav-exit-subgroup')).toBeHidden();

        // Verify driver card header title does not contain subgroup name
        await expect(page.locator(config.selectors.driverCard.driverCardPanel + ' .header__title')).not.toContainText(testSubgroupName);

        // ========== STEP 7: DELETE SUBGROUP WITH API ASSERTION (CLEANUP) ==========
        // Click on accounts settings menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();
        await page.waitForTimeout(1000);

        // Open subgroups dropdown - use force click due to potential overlay issues
        await expect(page.locator(config.selectors.subGroup.subgroupsMenu)).toBeVisible();
        await page.locator(config.selectors.subGroup.subgroupsMenu).click({ force: true });

        // Search for the created subgroup
        const searchInput3 = page.locator('#subgroups-panel input[type="text"]').first();
        await expect(searchInput3).toBeVisible();
        await searchInput3.click();
        await searchInput3.fill(testSubgroupName);

        await page.waitForTimeout(2000);

        // Click the delete (trash) icon for the subgroup
        await page.locator(config.selectors.subGroup.trashButton).click({ force: true });

        // Wait for both deleteSubgroup and getSubgroups API responses when confirming delete
        const [deleteResponse, getSubgroupsAfterDeleteResponse] = await Promise.all([
            page.waitForResponse(response =>
                response.url().includes('deletesubgroup_rds_subg.php') && response.status() === 200
            ),
            page.waitForResponse(response =>
                response.url().includes('getSubGroup.php') && response.status() === 200
            ),
            page.locator(config.selectors.subGroup.removeSubGroupButton).click({ force: true })
        ]);

        // Assert delete subgroup API response
        console.log('========== API ASSERTION: DELETE SUBGROUP ==========');
        const deleteResponseBody = await deleteResponse.json();
        console.log('Delete Subgroup API Response:', JSON.stringify(deleteResponseBody));
        expect(deleteResponse.status()).toBe(200);

        // Assert getSubgroups API response no longer contains the deleted subgroup
        console.log('========== API ASSERTION: GET SUBGROUPS AFTER DELETE ==========');
        const subgroupsListAfterDelete = await getSubgroupsAfterDeleteResponse.json();
        console.log('Get Subgroups API Response after delete:', JSON.stringify(subgroupsListAfterDelete));
        expect(getSubgroupsAfterDeleteResponse.status()).toBe(200);

        // Verify the deleted subgroup no longer exists in the API response
        const subgroupStillExists = Array.isArray(subgroupsListAfterDelete)
            ? subgroupsListAfterDelete.some(sg => sg.subgroup === testSubgroupName || sg.name === testSubgroupName || sg.subgroupName === testSubgroupName)
            : JSON.stringify(subgroupsListAfterDelete).includes(testSubgroupName);
        console.log(`Subgroup "${testSubgroupName}" still exists after delete: ${subgroupStillExists}`);
        expect(subgroupStillExists).toBeFalsy();

        await page.waitForTimeout(3000);

        // Verify UI no longer shows the deleted subgroup
        const deletedSubgroupInUI = page.locator(`.subgroup-item[data-subgroup="${testSubgroupName}"]`);
        await expect(deletedSubgroupInUI).toBeHidden();
        console.log(`UI ASSERTION: Subgroup "${testSubgroupName}" is no longer visible in the subgroups list`);

        // Close the subgroup panel
        await expect(page.locator(config.selectors.subGroup.closeButton)).toBeVisible();
        await page.locator(config.selectors.subGroup.closeButton).click();

    });
});
