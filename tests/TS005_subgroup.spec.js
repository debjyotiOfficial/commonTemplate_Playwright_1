const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Subgroup', () => {
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
        test.setTimeout(200000); // 3+ minutes for long test
    });

    test('should manage subgroups', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Click on accounts settings menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Open subgroups dropdown
        await expect(page.locator(config.selectors.subGroup.subgroupsMenu)).toBeVisible();
        await page.locator(config.selectors.subGroup.subgroupsMenu).click();

        // Verify subgroups container is visible
        await expect(page.locator(config.selectors.subGroup.subgroupsContainer)).toBeVisible();
        await expect(page.locator(config.selectors.subGroup.subgroupsContainer))
            .toContainText('Subgroups');

        // Click on search input
        const searchInput = page.locator('#subgroups-panel input[type="text"]').first();
        await expect(searchInput).toBeVisible();
        await searchInput.click();
        await searchInput.fill('TESTDE');

        await page.waitForTimeout(5000);

        // Click the "eye" icon for the TESTDE subgroup
        await page.locator('.subgroup-item[data-subgroup="TESTDE"] .subgroups-view .icon--eye')
            .click({ force: true });

        await page.waitForTimeout(10000);

        // Click the first "Add" button in the unassigned drivers list
        await page.locator('.subgroup-driver-card__name-row button[data-action="add"]')
            .first().click({ force: true });

        await page.waitForTimeout(10000);

        // Click on back to subgroup 
        await expect(page.locator(config.selectors.subGroup.back_to_subgroups_btn)).toBeVisible();
        await page.locator(config.selectors.subGroup.back_to_subgroups_btn).click();

        await page.waitForTimeout(10000);

        // Add subgroup //
        await expect(page.locator(config.selectors.subGroup.addSubGroupButton)).toBeVisible();
        await page.locator(config.selectors.subGroup.addSubGroupButton).click();

        // Verify the new subgroup modal is visible
        await expect(page.locator(config.selectors.subGroup.subgroup_name_modal)).toBeVisible();
        await expect(page.locator(config.selectors.subGroup.subgroup_name_modal))
            .toContainText('Add New Subgroup');

        await page.locator(config.selectors.subGroup.newSubGroupNameInput).clear();
        await page.locator(config.selectors.subGroup.newSubGroupNameInput).fill('testDp');

        await expect(page.locator(config.selectors.subGroup.addSubmitButton)).toBeVisible();
        await page.locator(config.selectors.subGroup.addSubmitButton).click();

        await expect(page.locator(config.selectors.subGroup.subgroup_name_modal + ' #close-subgroup-modal'))
            .toBeVisible();
        await page.locator(config.selectors.subGroup.subgroup_name_modal + ' #close-subgroup-modal').click();

        await page.waitForTimeout(5000);

        // Click on search input
        const searchInput2 = page.locator('#subgroups-panel input[type="text"]').first();
        await expect(searchInput2).toBeVisible();
        await searchInput2.click();
        await searchInput2.fill('TESTDE');

        // Clear search input
        await expect(page.locator('#subgroups-search')).toBeVisible();
        await page.locator('#subgroups-search').clear();

        // Delete subgroup
        // Search for the newly created subgroup
        // Click on search input
        const searchInput3 = page.locator('#subgroups-panel input[type="text"]').first();
        await expect(searchInput3).toBeVisible();
        await searchInput3.click();
        await searchInput3.fill('testDp');

        await page.waitForTimeout(2000);

        // Click the delete (trash) icon for the testDp subgroup
        await page.locator(config.selectors.subGroup.trashButton).click({ force: true });

        // Verify the delete confirmation modal and click on delete button
        await page.locator(config.selectors.subGroup.removeSubGroupButton).click({ force: true });

        await page.waitForTimeout(15000);

        // Click on search input
        const searchInput4 = page.locator('#subgroups-panel input[type="text"]').first();
        await expect(searchInput4).toBeVisible();
        await searchInput4.click();
        await searchInput4.fill('testDp');

        await page.waitForTimeout(10000);

        // view subgroup and driver card functionality
        //close the subgroup panel
        await expect(page.locator(config.selectors.subGroup.closeButton)).toBeVisible();
        await page.locator(config.selectors.subGroup.closeButton).click();

        await page.waitForTimeout(2000);

                // Click on accounts settings menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Open subgroups dropdown
        await expect(page.locator(config.selectors.subGroup.subgroupsMenu)).toBeVisible();
        await page.locator(config.selectors.subGroup.subgroupsMenu).click();

        // Verify subgroups container is visible
        await expect(page.locator(config.selectors.subGroup.subgroupsContainer)).toBeVisible();
        await expect(page.locator(config.selectors.subGroup.subgroupsContainer))
            .toContainText('Subgroups');

        // Click on search input
        const searchInput5 = page.locator('#subgroups-panel input[type="text"]').first();
        await expect(searchInput5).toBeVisible();
        await searchInput5.click();
        await searchInput5.fill('TESTDE');

        await page.waitForTimeout(5000);

        // Click the "eye" icon for the TESTDE subgroup
        await page.locator('.subgroup-item[data-subgroup="TESTDE"] .subgroups-view .icon--eye')
            .click({ force: true });

        await page.waitForTimeout(5000);

                // Verify driver card is visible
        await expect(page.locator(config.selectors.driverCard.driverCardPanel)).toBeVisible();

        // Verify the header title contains the subgroup name
        await expect(page.locator(config.selectors.driverCard.driverCardPanel+ ' .header__title')).toBeVisible();
        await expect(page.locator(config.selectors.driverCard.driverCardPanel+ ' .header__title')).toContainText('TESTDE');

        //close the subgroup panel
        await expect(page.locator(config.selectors.subGroup.closeButton)).toBeVisible();
        await page.locator(config.selectors.subGroup.closeButton).click();
        
        // Verify the exit subgroup element contains the subgroup name
        await expect(page.locator('#bottom-nav-exit-subgroup')).toBeVisible();
        await expect(page.locator('#bottom-nav-exit-subgroup')).toContainText('TESTDE');

        // Click to exit subgroup view
        await page.locator('#bottom-nav-exit-subgroup').click();

        await page.waitForTimeout(2000);

        // Verify the exit subgroup element is no longer visible
        await expect(page.locator('#bottom-nav-exit-subgroup')).toBeHidden();

        //verify driver card header title does not contain subgroup name
        await expect(page.locator(config.selectors.driverCard.driverCardPanel+ ' .header__title')).not.toContainText('TESTDE');


    });
});