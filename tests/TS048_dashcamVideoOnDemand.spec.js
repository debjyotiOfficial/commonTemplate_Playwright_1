const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Dashcam Video On Demand', () => {
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

    test('should add/edit a device', async ({ page }) => {
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
        await page.goto(config.urls.fleetDashcamDashboard2);
        // Hover over "dashcamMenu"
        await page.locator(config.selectors.dashcam.dashcamMenu).hover();
        await page.waitForTimeout(500); // Give time for menu to open

        // Click on "dashcamMenu"
        await expect(page.locator(config.selectors.dashcam.dashcamMenu)).toBeVisible();
        await page.locator(config.selectors.dashcam.dashcamMenu).click();

        // Click on dashcam video on demand menu
        await page.locator(config.selectors.dashcam.videoOnDemandMenu).click({ force: true });

        // Verify the modal is visible
        await expect(page.locator(config.selectors.dashcam.videoOnDemandPanel)).toBeVisible();

        // Click and type date into the start date input
        await page.locator(config.selectors.dashcam.videoStartDate).click();
        await page.locator(config.selectors.dashcam.videoStartDate).clear();
        await page.locator(config.selectors.dashcam.videoStartDate).fill('2025-05-20');

        // Click and type date into the end date input
        await page.locator(config.selectors.dashcam.videoEndDate).click();
        await page.locator(config.selectors.dashcam.videoEndDate).clear();
        await page.locator(config.selectors.dashcam.videoEndDate).fill('2025-05-30');

        // Click on the Select2 dropdown to open options
        await page.locator('#select2-video-on-request-vehicle-select-container').click();

        // Type in the Select2 search field
        await page.locator('.select2-search__field').fill('JC261-VARSHA TEST (864993060087468)');

        // Click on the result "JC261-VARSHA TEST (864993060087468)"
        await page.locator('.select2-results__option').filter({ hasText: 'JC261-VARSHA TEST (864993060087468)' }).click();

        // Click both Cabin View and Dash View checkboxes
        await page.locator(config.selectors.dashcam.cabinView).check({ force: true });
        await page.locator(config.selectors.dashcam.dashView).check({ force: true });

        // Click the Submit button
        await page.locator(config.selectors.dashcam.videoOnDemandSubmit).click();

        await page.waitForTimeout(5000);

        // Verify the table is visible
        await page.locator(config.selectors.dashcam.videoOnDemandTable).scrollIntoViewIfNeeded();
        await expect(page.locator(config.selectors.dashcam.videoOnDemandTable)).toBeVisible();

        // Hover over "Save file as" button to reveal dropdown
        await page.locator(config.selectors.dashcam.videoOnDemandSaveFileas).hover();

        // Click on Excel export button
        await page.locator('.dropdown__content [data-export="excel"]').click({ force: true });

        // Click on PDF export button
        await page.locator('.dropdown__content [data-export="pdf"]').click({ force: true });

        // Click on CSV export button
        await page.locator('.dropdown__content [data-export="csv"]').click({ force: true });

        // Verify the table headings
        const tableHeaders = page.locator(`${config.selectors.dashcam.videoOnDemandTable} thead th`);
        const headerTexts = await tableHeaders.allTextContents();
        const expectedHeaders = ['Start Date', 'End Date', 'Subject', 'View', 'Delete'];
        
        for (const expectedHeader of expectedHeaders) {
            expect(headerTexts.some(header => header.trim().includes(expectedHeader))).toBeTruthy();
        }

        // Verify that 05/21/2025 is present under Start Date column and click its View button
        const row = page.locator('#video-on-request-table tbody tr').filter({ hasText: '05/21/2025' }).first();
        await row.locator('button.viewReportBtn').click();

        await page.waitForTimeout(5000);

        // Now click the first "Request Download" button in the file listing table
        const requestDownloadBtn = page.locator('#video-on-request-file-listing button.request-btn').filter({ hasText: 'Request Download' }).first();
        await requestDownloadBtn.click();

        // Now click the first "View" button in the file listing table
        const viewBtn = page.locator('#video-on-request-file-listing button.view-btn').filter({ hasText: 'View' }).first();
        await viewBtn.click();

        // Verify that 05/21/2025 is present under Start Date column and click its Delete button
        const deleteRow = page.locator('#video-on-request-table tbody tr').filter({ hasText: '05/21/2025' }).first();
        await deleteRow.locator('button.deleteReportBtn').click();

        // Click on confirm delete
        await expect(page.locator('#deleteConfirmation_report')).toBeVisible();

        await page.waitForTimeout(2000);

        // Click on submit button
        await page.locator('#deleteConfirmation_report .btn.btn--primary.btn-confirm').click();

        await page.waitForTimeout(5000);

        // Type '05/21/2025' in the search input to filter the table
        await page.locator('#video-on-request-search').clear();
        await page.locator('#video-on-request-search').fill('05/21/2025');

        // Verify table has data
        const tableRows = page.locator('#video-on-request-table tbody tr');
        const rowCount = await tableRows.count();
        expect(rowCount).toBeGreaterThan(0);
    });
});