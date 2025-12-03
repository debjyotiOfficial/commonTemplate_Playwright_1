const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Posted Speed Report', () => {
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

    test('should generate and validate posted speed report', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Click on reports menu
        await expect(page.locator(config.selectors.navigation.reportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.reportMenu).click();
        
        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Fleet' }).click();
        
        // Click on posted speed report menu
        await page.locator(config.selectors.postedSpeedReport.postedSpeedMenu).scrollIntoViewIfNeeded();
        await page.locator(config.selectors.postedSpeedReport.postedSpeedMenu).click({ force: true });

        // Verify posted speed report container is visible
        await expect(page.locator(config.selectors.postedSpeedReport.postedSpeedContainer)).toBeVisible();

        //click on the container to ensure it's in focus
        await page.locator(config.selectors.postedSpeedReport.postedSpeedContainer).click();

        // Collapse the navigation sidebar to prevent interference with date picker
        try {
            // Look for a navbar toggle/hamburger menu button
            const navToggle = page.locator('[data-toggle="collapse"], .navbar-toggle, .nav-toggle, .sidebar-toggle, .menu-toggle');
            if (await navToggle.count() > 0) {
                await navToggle.first().click();
                await page.waitForTimeout(500);
            }
            
            // Alternative: Look for a close button on the sidebar
            const sidebarClose = page.locator('.sidebar .close, .navigation .close, [aria-label="Close navigation"], .nav-close');
            if (await sidebarClose.count() > 0) {
                await sidebarClose.first().click();
                await page.waitForTimeout(500);
            }

            // Try clicking outside to dismiss any overlays
            await page.evaluate(() => document.body.click());
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
        } catch (error) {
            // If navbar collapse fails, continue with the test
            console.log('Could not collapse navbar:', error.message);
        }

        // Date selection
        await page.locator(config.selectors.postedSpeedReport.DateInput).scrollIntoViewIfNeeded();
        await page.locator(config.selectors.postedSpeedReport.DateInput).click({ force: true });
        
        // Wait for calendar to open with better error handling
        try {
            await page.waitForSelector('.flatpickr-calendar.open', { timeout: 10000 });
        } catch (error) {
            // If calendar doesn't open, try clicking again
            console.log('Calendar not opened on first try, attempting again...');
            await page.locator(config.selectors.postedSpeedReport.DateInput).click({ force: true });
            await page.waitForSelector('.flatpickr-calendar.open', { timeout: 5000 });
        }
        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('July');

        // Select July 1, 2025
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="July 1, 2025"]').click({ force: true });

        // Select July 10, 2025 (as end date)
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="July 10, 2025"]').click({ force: true });
        
        // Click on the Search Device select2 dropdown
        await page.locator(config.selectors.postedSpeedReport.searchInput).click();
        
        // Type "Sales car1" in the search field
        await page.locator('.select2-search__field').fill('Sales car1');
        
        // Select "Sales car1" from the dropdown results
        await page.locator(config.selectors.postedSpeedReport.searchResult).filter({ hasText: 'Sales car1' }).click();
        
        // Type limit
        await page.locator(config.selectors.postedSpeedReport.limit).fill("10");
        
        // Click on submit button
        await expect(page.locator(config.selectors.postedSpeedReport.submitButton)).toBeVisible();
        await page.locator(config.selectors.postedSpeedReport.submitButton).click();
        
        // Click on refresh button
        await expect(page.locator(config.selectors.postedSpeedReport.refresh)).toBeVisible();
        await page.locator(config.selectors.postedSpeedReport.refresh).click();
        
        // Wait for the report to load
        await page.waitForTimeout(config.timeouts.wait);
        
        // Verify the posted speed report table is visible
        await expect(page.locator(config.selectors.postedSpeedReport.reportTable)).toBeVisible();
        
        // Verify the posted speed report table has data
        const tableRows = page.locator(config.selectors.postedSpeedReport.reportTable).locator('tbody tr');
        const rowCount = await tableRows.count();
        expect(rowCount).toBeGreaterThan(0);
        
        // Type "Sales car1" in the Posted Speed Report search input box
        await page.locator(config.selectors.postedSpeedReport.searchInput2).fill('Sales car1');
        
        // Click on the first "View Details" link in the Action column
        await page.locator(config.selectors.postedSpeedReport.viewDetails).first().click();
        
        // Verify report panel is visible
        await expect(page.locator(config.selectors.postedSpeedReport.reportPanel)).toBeVisible();
        
        // Close the report panel
        await expect(page.locator(config.selectors.postedSpeedReport.reportPanelClose)).toBeVisible();
        await page.locator(config.selectors.postedSpeedReport.reportPanelClose).click();
        
        // Click on the first "Edit" link in the Action column
        await page.locator(config.selectors.postedSpeedReport.edit).first().click();
        
        // Verify the edit modal is visible
        await expect(page.locator(config.selectors.postedSpeedReport.editModal).first()).toBeVisible();

         await page.waitForTimeout(15000);

        // Edit the speed limit - use .first() to handle duplicate IDs in modal
        await page.locator(config.selectors.postedSpeedReport.speedLimitInput).first().clear();
        await page.locator(config.selectors.postedSpeedReport.speedLimitInput).first().fill('50');
        

        // Click on the submit button in the edit modal - use .first() to handle duplicate IDs
        await expect(page.locator(config.selectors.postedSpeedReport.editSubmitButton).first()).toBeVisible();
        await page.locator(config.selectors.postedSpeedReport.editSubmitButton).first().click({ force: true });
        
        await page.waitForTimeout(15000);
        
        // Click on the first "Delete" link in the Action column
        await page.locator(config.selectors.postedSpeedReport.delete).first().click();
        
        // Click the "Delete" button in the Delete Report modal
        await page.locator(config.selectors.postedSpeedReport.delButton).click({ force: true });
        
        await page.waitForTimeout(2000);
    });
});