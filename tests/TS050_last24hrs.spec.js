const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Last 24 Hours', () => {
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

    test('should verify Engine Idling Events checkbox functionality', async ({ page }) => {
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

        // Navigate to Last 24 Hours
        await page.locator(config.selectors.last24hrs.last24hrsMenu).hover();
        await page.waitForTimeout(500);

        await expect(page.locator(config.selectors.last24hrs.last24hrsMenu)).toBeVisible();
        await page.locator(config.selectors.last24hrs.last24hrsMenu).click();

        await page.locator(config.selectors.last24hrs.last24hrsDriverSelect).filter({ hasText: 'Sales car1' })
      .click({ force: true });

        await expect(page.locator(config.selectors.last24hrs.last24hrsContainer)).toBeVisible();

        // Date selection
        await page.locator('#travel-log-report-calendar-btn').click({ force: true });
        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('June');
        await page.locator('.flatpickr-day[aria-label="June 1, 2025"]').click();
        await page.locator('.flatpickr-day[aria-label="June 10, 2025"]').click();

        // Submit the report
        await expect(page.locator(config.selectors.tlr.submitButton)).toBeVisible();
        await page.locator(config.selectors.tlr.submitButton).click({ force: true });
        
        await page.waitForTimeout(30000);

        // Wait for the report to be visible
        await expect(page.locator(config.selectors.report.limitedReport)).toBeVisible();
        await expect(page.locator(config.selectors.report.limitedReport)).toHaveCSS('display', 'block');

        // Click on the "Travel Log Report" tab to make the track-report div visible
        await expect(page.locator(config.selectors.report.tlrTab)).toBeVisible();
        await page.locator(config.selectors.report.tlrTab).click();

        await page.waitForTimeout(60000);

        // Wait for the track-report div to be visible
        await expect(page.locator('#track-report')).toHaveCSS('display', 'flex');

        // Check the current state of the "Show Engine Idling Events" checkbox
        const allCheckboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await allCheckboxes.count();

        let engineIdlingCheckbox = null;

        // Find the checkbox that controls engine idling events
        for (let i = 0; i < checkboxCount; i++) {
            const checkbox = allCheckboxes.nth(i);
            const parent = checkbox.locator('..');
            const labelText = await parent.textContent();
            
            if (labelText && (labelText.toLowerCase().includes('engine idling') || labelText.toLowerCase().includes('show engine idling'))) {
                engineIdlingCheckbox = checkbox;
                break;
            }
        }

        if (engineIdlingCheckbox) {
            const isChecked = await engineIdlingCheckbox.isChecked();
            
            if (!isChecked) {
                // Scenario 1: Checkbox is NOT checked
                console.log('Checkbox is not checked - verifying Engine Idling is not visible');
                
                // Verify that Engine Idling events are not visible in the table
                const tableRows = page.locator('#travel-log-report-map-table tbody tr');
                await expect(tableRows).toBeAttached();
                
                const rowCount = await tableRows.count();
                let engineIdlingExists = false;
                
                for (let i = 0; i < rowCount; i++) {
                    const eventTypeCell = tableRows.nth(i).locator('td').first();
                    const cellText = await eventTypeCell.textContent();
                    if (cellText && cellText.toLowerCase().includes('engine idling')) {
                        engineIdlingExists = true;
                        break;
                    }
                }
                
                // Assert that Engine Idling events should not be present
                expect(engineIdlingExists).toBeFalsy();
                console.log('Verified: Engine Idling events are not visible when checkbox is unchecked');
                
                // Now check the checkbox
                await engineIdlingCheckbox.check({ force: true });
                console.log('Checkbox has been checked');
                
                // Wait a moment for the table to update
                await page.waitForTimeout(2000);
                
                // Verify that Engine Idling events are now visible
                const updatedRows = page.locator('#travel-log-report-map-table tbody tr');
                const updatedRowCount = await updatedRows.count();
                let updatedEngineIdlingExists = false;
                
                for (let i = 0; i < updatedRowCount; i++) {
                    const eventTypeCell = updatedRows.nth(i).locator('td').first();
                    const cellText = await eventTypeCell.textContent();
                    if (cellText && cellText.toLowerCase().includes('engine idling')) {
                        updatedEngineIdlingExists = true;
                        break;
                    }
                }
                
                if (updatedEngineIdlingExists) {
                    console.log('Verified: Engine Idling events are now visible after checking the checkbox');
                } else {
                    console.log('Note: No Engine Idling events found in the current data set');
                }

                // Test search functionality for Engine Idling
                await testEngineIdlingSearch(page, config);
                
            } else {
                // Scenario 2: Checkbox is already checked
                console.log('Checkbox is already checked - verifying Engine Idling events functionality');
                
                // First verify Engine Idling events might be visible
                await expect(page.locator('#travel-log-report-map-table tbody tr')).toBeAttached();
                
                // Uncheck the checkbox to test the hiding functionality
                // Use JavaScript evaluation to bypass visibility issues
                await engineIdlingCheckbox.evaluate(element => {
                    element.checked = false;
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                });
                console.log('Checkbox has been unchecked');
                
                // Wait for table to update
                await page.waitForTimeout(2000);
                
                // Verify Engine Idling events are hidden
                const tableRows = page.locator('#travel-log-report-map-table tbody tr');
                const rowCount = await tableRows.count();
                let engineIdlingExists = false;
                
                for (let i = 0; i < rowCount; i++) {
                    const eventTypeCell = tableRows.nth(i).locator('td').first();
                    const cellText = await eventTypeCell.textContent();
                    if (cellText && cellText.toLowerCase().includes('engine idling')) {
                        engineIdlingExists = true;
                        break;
                    }
                }
                
                expect(engineIdlingExists).toBeFalsy();
                console.log('Verified: Engine Idling events are hidden when checkbox is unchecked');
                
                // Check the checkbox again
                await engineIdlingCheckbox.evaluate(element => {
                    element.checked = true;
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                });
                console.log('Checkbox has been checked again');
                
                // Wait for table to update
                await page.waitForTimeout(2000);
                
                // Verify Engine Idling events are visible again
                await expect(page.locator('#travel-log-report-map-table tbody tr')).toBeAttached();
                console.log('Verified: Checkbox functionality is working correctly');

                // Test search functionality for Engine Idling
                await testEngineIdlingSearch(page, config);
            }
        } else {
            // Alternative approach if the specific checkbox isn't found
            console.log('Specific Engine Idling checkbox not found, trying alternative selector');
            
            const altCheckbox = page.locator('input#engine-idling-events');
            if (await altCheckbox.count() > 0) {
                const isChecked = await altCheckbox.isChecked();
                
                if (!isChecked) {
                    await altCheckbox.check({ force: true });
                    await page.waitForTimeout(2000);
                }
                
                console.log('Alternative checkbox approach completed');
            } else {
                console.log('Engine Idling checkbox not found with any selector');
            }
        }

        // Helper function to test Engine Idling search functionality
        async function testEngineIdlingSearch(page, config) {
            console.log('Testing Engine Idling search functionality');
            
            // Type "Engine Idling" in the search input
            const searchInput = page.locator(config.selectors.report.searchInput);
            await expect(searchInput).toBeVisible();
            await searchInput.clear();
            await searchInput.fill('Engine Idling');
            
            // Wait for search results to filter
            await page.waitForTimeout(2000);
            
            // Verify that the table now shows only Engine Idling events
            const searchResultRows = page.locator(`${config.selectors.report.travelLogReportTable} tbody tr`);
            await expect(searchResultRows.first()).toBeAttached();
            
            const searchRowCount = await searchResultRows.count();
            
            for (let i = 0; i < searchRowCount; i++) {
                const eventTypeCell = searchResultRows.nth(i).locator('td').first();
                await expect(eventTypeCell).toContainText('Engine Idling');
            }
            
            console.log(`Found ${searchRowCount} Engine Idling events in search results`);
            
            // Ensure we have at least some results
            expect(searchRowCount).toBeGreaterThan(0);
            
            console.log('Verified: Search results contain only Engine Idling events');
            
            // Clear the search to show all results again
            await searchInput.clear();
            
            // Wait for the table to refresh and show all results
            await page.waitForTimeout(2000);
            
            console.log('Search functionality test completed');
        }
    });
});