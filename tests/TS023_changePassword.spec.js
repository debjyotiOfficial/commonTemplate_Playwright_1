const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Change Password Test', () => {
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

    test('should change password and login with new password', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        
        await page.goto(config.urls.backAdminLoginPage);
        
        await expect(page.locator(config.selectors.login.usernameFieldBackup)).toBeVisible();
        await page.locator(config.selectors.login.usernameFieldBackup).clear();
        await page.locator(config.selectors.login.usernameFieldBackup).fill(config.credentials.demo.usernameBackup);

        await expect(page.locator(config.selectors.login.passwordFieldBackup)).toBeVisible();
        await page.locator(config.selectors.login.passwordFieldBackup).clear();
        await page.locator(config.selectors.login.passwordFieldBackup).fill(config.credentials.demo.passwordBackup);
        
        await expect(page.locator(config.selectors.login.submitButtonBackup)).toBeVisible();
        await page.locator(config.selectors.login.submitButtonBackup).click();

        await page.waitForTimeout(config.timeouts.wait);
        await page.goto(config.urls.fleetDashboard3);

        // Click on accounts menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Click on change password menu
        await page.locator(config.selectors.changePassword.changePasswordMenu).click({ force: true });

        // Verify container is visible
        await expect(page.locator(config.selectors.changePassword.changePasswordContainer)).toBeVisible();

        // Type the old password in the input
        await expect(page.locator(config.selectors.changePassword.oldPassword)).toBeVisible();
        await page.locator(config.selectors.changePassword.oldPassword).clear();
        await page.locator(config.selectors.changePassword.oldPassword).fill('12345');

        // Type the new password in the input
        await expect(page.locator(config.selectors.changePassword.newPassword)).toBeVisible();
        await page.locator(config.selectors.changePassword.newPassword).clear();
        await page.locator(config.selectors.changePassword.newPassword).fill('123456');

        // Type the confirm password in the input
        await expect(page.locator(config.selectors.changePassword.confirmNewPassword)).toBeVisible();
        await page.locator(config.selectors.changePassword.confirmNewPassword).clear();
        await page.locator(config.selectors.changePassword.confirmNewPassword).fill('123456');

        // Click on submit button
        await expect(page.locator(config.selectors.changePassword.submitButton)).toBeVisible();
        await page.locator(config.selectors.changePassword.submitButton).click();

        // Click on the close button
        await expect(page.locator(config.selectors.changePassword.closeButton)).toBeVisible();
        await page.locator(config.selectors.changePassword.closeButton).click();

        await page.waitForTimeout(2000);

        // Click on profile menu
        await expect(page.locator(config.selectors.changePassword.profile)).toBeVisible();
        await page.locator(config.selectors.changePassword.profile).click();

        // Click on logout button
        await page.locator(config.selectors.changePassword.logoutButton).click({ force: true });

        // Click on confirm logout button
        await page.locator(config.selectors.changePassword.confirmLogoutButton).click({ force: true });

        await page.waitForTimeout(10000);

        // Navigate to login page and handle cross-origin navigation
        await page.goto('https://www.gpsandfleet.io');
        
        // Click on the submit/login button on the new origin
        await expect(page.locator('.submit.bt_login')).toBeVisible();
        await page.locator('.submit.bt_login').click({ force: true });

        await page.waitForTimeout(5000);
        
        // Complete the login flow with new password on client dashboard
        await expect(page.locator('input[name="form-username"]')).toBeVisible();
        await page.locator('input[name="form-username"]').clear();
        await page.locator('input[name="form-username"]').fill('fleetdemo', { force: true });

        // Type the new password
        await expect(page.locator('input[name="form-password"]')).toBeVisible();
        await page.locator('input[name="form-password"]').clear();
        await page.locator('input[name="form-password"]').fill('123456', { force: true });

        // Click submit button
        await expect(page.locator('.submit.bt_login')).toBeVisible();
        await page.locator('.submit.bt_login').click({ force: true });

        await page.waitForTimeout(15000);

        // Handle dashboard on different origin (gpsandfleet3.net)
        // Wait for navigation to complete
        await page.waitForURL(/.*gpsandfleet3\.net.*/);
        
        // Now we should be on the dashboard, click on accounts menu
        await expect(page.locator(config.selectors.navigation.accountsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.accountsMenu).click();

        // Click on change password menu
        await page.locator(config.selectors.changePassword.changePasswordMenu).click({ force: true });

        // Verify container is visible
        await expect(page.locator(config.selectors.changePassword.changePasswordContainer)).toBeVisible();

        // Type the new password (123456) in the old password input
        await expect(page.locator(config.selectors.changePassword.oldPassword)).toBeVisible();
        await page.locator(config.selectors.changePassword.oldPassword).clear();
        await page.locator(config.selectors.changePassword.oldPassword).fill('123456');

        // Type the original password (12345) in the new password input
        await expect(page.locator(config.selectors.changePassword.newPassword)).toBeVisible();
        await page.locator(config.selectors.changePassword.newPassword).clear();
        await page.locator(config.selectors.changePassword.newPassword).fill('12345');

        // Type the original password (12345) in the confirm password input
        await expect(page.locator(config.selectors.changePassword.confirmNewPassword)).toBeVisible();
        await page.locator(config.selectors.changePassword.confirmNewPassword).clear();
        await page.locator(config.selectors.changePassword.confirmNewPassword).fill('12345');

        // Click on submit button
        await expect(page.locator(config.selectors.changePassword.submitButton)).toBeVisible();
        await page.locator(config.selectors.changePassword.submitButton).click();
    });
});