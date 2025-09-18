const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Get Support', () => {
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

    test('should verify Get Support and Insurance form functionality', async ({ page }) => {
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

        // Navigate to Get Support
        await page.locator(config.selectors.getSupport.getSupportMenu).hover();
        await page.waitForTimeout(500);

        await expect(page.locator(config.selectors.getSupport.getSupportMenu)).toBeVisible();
        await page.locator(config.selectors.getSupport.getSupportMenu).click();

        await expect(page.locator(config.selectors.getSupport.getSupportContainer)).toBeVisible();

        // Wait for form to be fully loaded
        await page.waitForTimeout(3000);

        // === Test Get Support Form ===
        console.log('Testing Get Support form...');

        // Fill the Get Support form fields
        await page.locator(config.selectors.getSupport.firstName).fill('John');
        await page.locator(config.selectors.getSupport.lastName).fill('Doe');

        // Fill Email - target email field within Get Support container
        const emailInput = page.locator(config.selectors.getSupport.getSupportContainer).locator('input[type="email"]').first();
        await expect(emailInput).toBeVisible();
        await emailInput.clear();
        await emailInput.fill('john.doe@example.com');

        // Fill Phone - target phone field within Get Support container
        const phoneInput = page.locator(config.selectors.getSupport.getSupportContainer).getByLabel('Phone:');
        await expect(phoneInput).toBeVisible();
        await phoneInput.fill('1234567890');

        // Fill Comments - target the specific comments textarea
        const textareaField = page.locator(config.selectors.getSupport.getSupportContainer).locator('textarea#comments');
        await expect(textareaField).toBeVisible();
        await textareaField.clear();
        await textareaField.fill('This is a test support request.');

        // Wait before submitting
        await page.waitForTimeout(1000);

        // Click Submit button specifically in the Get Support section
        const submitButton = page.locator(config.selectors.getSupport.getSupportContainer).locator('#support-team-submit-btn');
        await expect(submitButton).toBeVisible();
        await submitButton.click();

        // Verify form submission (look for success message or form reset)
        await page.waitForTimeout(2000);

        // Check if form was submitted successfully by verifying the form fields are cleared or a success message appears
        const firstNameField = page.locator(config.selectors.getSupport.firstName);
        await expect(firstNameField).toHaveValue(''); // Form should be cleared after successful submission

        console.log('Get Support form test completed successfully');

        // === Test Insurance Form ===
        console.log('Testing Insurance form...');

        // Set up network response monitoring before clicking the insurance button
        let responseReceived = false;
        let responseStatus = null;

        page.on('response', async (response) => {
            if (response.url().includes('Support.php') || response.url().includes('insurance') || response.url().includes('SaveData')) {
                responseStatus = response.status();
                responseReceived = true;
                console.log(`Response received: ${response.status()} for ${response.url()}`);

                // Log response body for debugging
                try {
                    const responseBody = await response.text();
                    console.log('Response body:', responseBody);
                } catch (error) {
                    console.log('Could not read response body:', error.message);
                }
            }
        });

        // Click on "Save up to 20% on fleet insurance from our partners" button/tab
        const insuranceButton = page.locator('[data-tab="insurance"]');

        await expect(insuranceButton).toBeVisible();
        // Use JavaScript click to bypass viewport issues
        await insuranceButton.evaluate(element => element.click());

        // Wait for the insurance tab content to load
        await page.waitForTimeout(2000);

        // Fill insurance form fields using more specific selectors based on the page snapshot
        const insuranceContainer = page.locator('#support-team-panel');

        // Fill Business Name
        const businessName = insuranceContainer.getByLabel('Business Name:');
        if (await businessName.isVisible()) {
            await businessName.fill('Test Business Inc.');
        }

        // Fill Primary Contact Name
        const contactName = insuranceContainer.getByLabel('Primary Contact Name:');
        if (await contactName.isVisible()) {
            await contactName.fill('Jane Smith');
        }

        // Fill Primary Contact Email
        const contactEmail = insuranceContainer.getByLabel('Primary Contact Email:');
        if (await contactEmail.isVisible()) {
            await contactEmail.clear();
            await contactEmail.fill('jane.smith@example.com');
        }

        // Fill Primary Contact Phone Number
        const contactPhone = insuranceContainer.getByLabel('Primary Contact Phone Number:');
        if (await contactPhone.isVisible()) {
            await contactPhone.fill('9876543210');
        }

        // Fill Short Business Description
        const businessDesc = insuranceContainer.getByLabel('Short Business Description:');
        if (await businessDesc.isVisible()) {
            await businessDesc.clear();
            await businessDesc.fill('I am interested in fleet insurance options for my business.');
        }

        // Wait before submitting
        await page.waitForTimeout(1000);

        // Click Submit button for insurance form - use more specific selector
        const insuranceSubmitButton = insuranceContainer.getByRole('button', { name: 'Submit' });
        await expect(insuranceSubmitButton).toBeVisible();
        // Use JavaScript click to bypass viewport issues
        await insuranceSubmitButton.evaluate(element => element.click());

        // Wait for response
        await page.waitForTimeout(3000);

        // Verify response status is 200
        expect(responseStatus).toBe(200);

        // Verify success alert/message is visible
        const successElements = [
            page.locator('.alert-success'),
            page.locator('.success-message'),
            page.locator('.alert.alert-success'),
            page.locator('text=Success!'),
            page.locator('text=Thank you for contacting'),
            page.locator('text=Thank you'),
            page.locator('.success')
        ];

        let alertVisible = false;
        for (const element of successElements) {
            try {
                await expect(element).toBeVisible({ timeout: 5000 });
                alertVisible = true;
                console.log('Success alert found and visible');
                break;
            } catch (error) {
                // Continue to next selector
                continue;
            }
        }

        // Additional check for any visible success indication
        if (!alertVisible) {
            const anySuccessElement = page.locator('*:has-text("success"), *:has-text("Success"), *:has-text("thank you"), *:has-text("Thank you")').first();
            try {
                await expect(anySuccessElement).toBeVisible({ timeout: 5000 });
                alertVisible = true;
                console.log('Alternative success message found');
            } catch (error) {
                console.log('No success alert found with alternative selectors');
            }
        }

        expect(alertVisible).toBeTruthy();
        console.log('Insurance form submission test completed successfully');
    });
});