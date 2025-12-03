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

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

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
        await page.locator(config.selectors.viewEditUser.viewEditUsername).fill('AutomatedUsername');

        // Add email 
        await expect(page.locator(config.selectors.viewEditUser.addEmail)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.addEmail).click();
        await page.locator(config.selectors.viewEditUser.addEmail).clear();
        await page.locator(config.selectors.viewEditUser.addEmail).fill('testingAuto@gmail.com');

        // Click on password and type a password
        await expect(page.locator(config.selectors.viewEditUser.viewEditPassword)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.viewEditPassword).click();
        await page.locator(config.selectors.viewEditUser.viewEditPassword).clear();
        await page.locator(config.selectors.viewEditUser.viewEditPassword).fill('AutomatedPassword');

        
        await expect(page.locator(config.selectors.viewEditUser.changeAlertSettings)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.changeAlertSettings).check();

        await expect(page.locator(config.selectors.viewEditUser.viewTracking)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.viewTracking).check();

        await expect(page.locator(config.selectors.viewEditUser.viewReports)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.viewReports).check();

        // Click on submit button
        await expect(page.locator(config.selectors.viewEditUser.addUserSubmitButton)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.addUserSubmitButton).click();

        await page.waitForTimeout(30000);

        // Handle alert dialog for sending mail
        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        // Click on the "Edit/Delete User Permissions" tab - use more specific selector
        // await expect(page.locator('[data-tab="edit-user-permissions"]')).toBeVisible();
        // await page.locator('[data-tab="edit-user-permissions"]').click();

        // await page.waitForTimeout(30000);

        // Click on search and search for entered user
        await expect(page.locator(config.selectors.viewEditUser.searchUser)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.searchUser).clear();
        await page.locator(config.selectors.viewEditUser.searchUser).fill('AutomatedUsernam');

        await page.waitForTimeout(5000);

        // Click on the user item that appears in search results
        await expect(page.locator('.user-item[data-user-id="AutomatedUsername"]')).toBeVisible();
        await page.locator('.user-item[data-user-id="AutomatedUsername"]').click();

        // Click the edit button for the user in the Operations column
        // await expect(page.locator(config.selectors.viewEditUser.pencilIcon)).toBeVisible();
        // await page.locator(config.selectors.viewEditUser.pencilIcon).click();

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

        // Click on submit button
        await page.locator(config.selectors.viewEditUser.saveEditUser).click({ force: true });

        await page.waitForTimeout(20000);

        // Click on search and search for entered user
        await expect(page.locator(config.selectors.viewEditUser.searchUser)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.searchUser).clear();
        await page.locator(config.selectors.viewEditUser.searchUser).fill('AutomatedUsername');

        // Click on the user item that appears in search results
        await expect(page.locator('.user-item[data-user-id="AutomatedUsername"]')).toBeVisible();
        await page.locator('.user-item[data-user-id="AutomatedUsername"]').click();

        // Click the delete button for the user in the Operations column
        await expect(page.locator(config.selectors.viewEditUser.deleteButton)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.deleteButton).click( { force: true });

        await page.waitForTimeout(3000);

        // Click on confirm delete
        await expect(page.locator(config.selectors.viewEditUser.confirmDelete)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.confirmDelete).click();

        await page.waitForTimeout(10000);

        // Verify the username is not visible
        await expect(page.locator(config.selectors.viewEditUser.searchUser)).toBeVisible();
        await page.locator(config.selectors.viewEditUser.searchUser).clear();
        await page.locator(config.selectors.viewEditUser.searchUser).fill('AutomatedUsername');

        // Click on the user item that appears in search results
        await expect(page.locator('.user-item[data-user-id="AutomatedUsername"]')).toHaveCount(0);
        

    });
});