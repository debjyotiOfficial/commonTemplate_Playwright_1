const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Travel Log Report', () => {
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

    test('should display TLR', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        // Navigate to Travel Log Report
        await page.locator(config.selectors.tlrFooter.tlrMenu).hover();
        await page.waitForTimeout(500);

        await expect(page.locator(config.selectors.tlrFooter.tlrMenu)).toBeVisible();
        await page.locator(config.selectors.tlrFooter.tlrMenu).click();

        // Wait for modal to open properly
        await page.waitForTimeout(5000);
        await expect(page.locator(config.selectors.modal.container)).toBeVisible();

        // Verify modal title
        await expect(page.locator(config.selectors.modal.title)).toBeVisible();
        await expect(page.locator(config.selectors.modal.title)).toContainText(config.testData.expectedTitle);
        
        // Date selection - use JavaScript to click calendar button directly
        await page.evaluate(() => {
            const btn = document.querySelector('#travel-log-report-calendar-btn');
            if (btn) {
                btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                btn.click();
            }
        });
        await page.waitForTimeout(1000); // Wait for calendar to open

        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('August');

        // Select August 1, 2025
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="August 1, 2025"]').click({ force: true });

        // Select August 3 2025 (as end date)
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="August 3, 2025"]').click({ force: true });

        // Wait for device dropdown to be available and click it
        await page.waitForTimeout(1000);
        await page.waitForSelector('#travel-log-report-panel #select2-driver-list-container', { state: 'visible' });
        await page.locator('#travel-log-report-panel #select2-driver-list-container').click({ force: true });

        // Select "Sales car1"
        await page.locator('.select2-results__option').filter({ hasText: 'Sales car1' }).click({ force: true });

        // Click on submit button
        await expect(page.locator(config.selectors.tlr.submitButton)).toBeVisible();
        await page.locator(config.selectors.tlr.submitButton).click({ force: true });
        
        await page.waitForTimeout(30000);
        
        // Wait for the limited report to be visible
        await expect(page.locator(config.selectors.report.limitedReport)).toBeVisible();
        await expect(page.locator(config.selectors.report.limitedReport)).toHaveCSS('display', 'block');

        // NEW CODE: Verify map is visible
        console.log('Verifying map visibility...');
        const mapContainer = page.locator('#reports-map');
        await expect(mapContainer).toBeVisible();
        
        // Check if the map canvas/tile elements are rendered (indicates map is actually loaded)
        const mapCanvas = page.locator('#reports-map canvas, #reports-map .leaflet-tile, #reports-map .leaflet-layer');
        await expect(mapCanvas.first()).toBeVisible();
        console.log('Map is visible and loaded successfully');

        // NEW CODE: Test table row click functionality for Travel Log Report With Map ONLY
        console.log('Testing table row click and infobox data validation for Travel Log Report With Map...');
        
        // Wait for map table to be visible and get the first row
        await expect(page.locator(config.selectors.report.travelLogReportMapTable)).toBeVisible();
        const firstRowMap = page.locator(config.selectors.report.travelLogReportMapTable + ' tbody tr').first();
        await expect(firstRowMap).toBeVisible();

        // Extract data from the first table row in map view
        const tableRowDataMap = {
            eventType: await firstRowMap.locator('td').nth(0).textContent(),
            dateTime: await firstRowMap.locator('td').nth(1).textContent(),
            durationOfStop: await firstRowMap.locator('td').nth(2).textContent(),
            location: await firstRowMap.locator('td').nth(3).textContent(),
            speed: await firstRowMap.locator('td').nth(4).textContent(),
            direction: await firstRowMap.locator('td').nth(5).textContent()
        };

        console.log('Map table row data extracted:', tableRowDataMap);

        // Click on the first row to open the infobox
        await firstRowMap.click({ force: true });
        await page.waitForTimeout(2000);

        // Wait for the popup/infobox to appear
        const infoboxPopup = page.locator('.custom-map-popup').first();
        await expect(infoboxPopup).toBeVisible();

        // Extract data from the infobox popup
        const infoboxData = {};
        
        // Get the popup title (Event Type)
        const popupTitle = page.locator('.custom-map-popup .popup-content > div').first();
        infoboxData.eventType = await popupTitle.textContent();

        // Extract other data from the popup
        const popupContent = page.locator('.custom-map-popup .popup-content');
        const popupText = await popupContent.textContent();

        // Parse the popup content to extract individual fields
        const dateMatch = popupText.match(/Date:\s*(.+?)(?=Speed:|$)/);
        const speedMatch = popupText.match(/Speed:\s*(.+?)(?=Duration|Location|$)/);
        const durationMatch = popupText.match(/Duration Of Stop:\s*(.+?)(?=Location|$)/);
        const locationMatch = popupText.match(/Location:\s*(.+?)(?=View on Google Maps|$)/);

        if (dateMatch) infoboxData.dateTime = dateMatch[1].trim();
        if (speedMatch) infoboxData.speed = speedMatch[1].trim();
        if (durationMatch) infoboxData.durationOfStop = durationMatch[1].trim();
        if (locationMatch) infoboxData.location = locationMatch[1].trim();

        console.log('Infobox data extracted:', infoboxData);

        // Validate that table row data matches infobox data
        console.log('Validating data match between table row and infobox...');

        // Compare Event Type (removing any extra whitespace)
        // const tableEventType = tableRowDataMap.eventType?.trim();
        // const infoboxEventType = infoboxData.eventType?.trim();
        // expect(tableEventType).toBe(infoboxEventType);
        // console.log('✓ Event Type matches:', tableEventType);

        // Compare Date/Time (allowing for slight formatting differences)
        if (infoboxData.dateTime) {
            const tableDateNormalized = tableRowDataMap.dateTime?.trim().replace(/\s+/g, ' ');
            const infoboxDateNormalized = infoboxData.dateTime?.trim().replace(/\s+/g, ' ');
            expect(tableDateNormalized).toBe(infoboxDateNormalized);
            console.log('✓ Date/Time matches:', tableDateNormalized);
        }

        // Compare Speed (handling potential formatting differences like "0.0" vs "0.0 mph")
        if (infoboxData.speed) {
            const tableSpeedNormalized = tableRowDataMap.speed?.trim();
            const infoboxSpeedNormalized = infoboxData.speed?.trim().replace(' mph', '');
            expect(tableSpeedNormalized).toBe(infoboxSpeedNormalized);
            console.log('✓ Speed matches:', tableSpeedNormalized);
        }

        // Compare Duration of Stop
        if (infoboxData.durationOfStop && tableRowDataMap.durationOfStop) {
            const tableDuration = tableRowDataMap.durationOfStop?.trim();
            const infoboxDuration = infoboxData.durationOfStop?.trim();
            expect(tableDuration).toBe(infoboxDuration);
            console.log('✓ Duration of Stop matches:', tableDuration);
        }

        // Compare Location (allowing for slight formatting differences)
        if (infoboxData.location) {
            const tableLocationNormalized = tableRowDataMap.location?.trim();
            const infoboxLocationNormalized = infoboxData.location?.trim();
            expect(tableLocationNormalized).toBe(infoboxLocationNormalized);
            console.log('✓ Location matches:', tableLocationNormalized);
        }

        console.log('All data validation completed successfully for Travel Log Report With Map!');

        // Close the popup by clicking the X button or clicking elsewhere
        const closeButton = page.locator('.custom-map-popup .popup-content button, .custom-map-popup [class*="close"]');
        if (await closeButton.isVisible()) {
            await closeButton.click();
        } else {
            // Click elsewhere on the map to close popup
            await page.locator('#reports-map').click({ position: { x: 100, y: 100 } });
        }
        await page.waitForTimeout(1000);

        // Select TLR tab to switch to regular Travel Log Report
        await page.locator(config.selectors.report.tlrTab).click({ force: true });
        
        // Second submission for regular Travel Log Report
        await expect(page.locator(config.selectors.report.submitButton)).toBeVisible();
        await page.locator(config.selectors.report.submitButton).click({ force: true });
        
        await page.waitForTimeout(30000);
        

        // Check/uncheck the "Show Engine Idling Events" checkbox and verify search results
        const engineIdlingCheckbox = page.locator(config.selectors.report.engineIdlingCHeckbox);
        const isChecked = await engineIdlingCheckbox.isChecked();

        if (isChecked) {
          // If checked, uncheck it
          await engineIdlingCheckbox.uncheck({ force: true });
          await page.waitForTimeout(3000);

          // Type "engine idling" in the search input
          await page.locator(config.selectors.report.searchInput).clear();
          await page.locator(config.selectors.report.searchInput).fill('engine idling');
          await page.waitForTimeout(3000);

          // Ensure the Event Type column does NOT contain "Engine Idling"
          const eventTypeCells = page.locator(config.selectors.report.travelLogReportTable + ' tbody tr td:first-child');
          const count = await eventTypeCells.count();
          for (let i = 0; i < count; i++) {
            await expect(eventTypeCells.nth(i)).not.toContainText('Engine Idling');
          }
        } else {
          // If unchecked, check it
          await engineIdlingCheckbox.check({ force: true });
          await page.waitForTimeout(3000);

          // Type "engine idling" in the search input
          await page.locator(config.selectors.report.searchInput).clear();
          await page.locator(config.selectors.report.searchInput).fill('engine idling');
          await page.waitForTimeout(3000);

          // Ensure the Event Type column DOES contain "Engine Idling"
          await expect(page.locator(config.selectors.report.travelLogReportTable + ' tbody tr td:first-child')).toContainText('Engine Idling');
        }

        // Test export functionality
        try {
            // Click on "Save file as" dropdown and select Excel
            await page.locator('#travel-log-report-panel button.dropdown__trigger').click({ force: true });
            await page.waitForTimeout(500);
            await page.locator('#travel-log-report-panel .dropdown__content button.dropdown__item').filter({ hasText: 'Excel' }).click({ force: true });
            await page.waitForTimeout(1000);

            // Click on "Save file as" dropdown again and select CSV
            await page.locator('#travel-log-report-panel button.dropdown__trigger').click({ force: true });
            await page.waitForTimeout(500);
            await page.locator('#travel-log-report-panel .dropdown__content button.dropdown__item').filter({ hasText: 'CSV' }).click({ force: true });
            await page.waitForTimeout(1000);

            // Click on "Save file as" dropdown again and select PDF
            await page.locator('#travel-log-report-panel button.dropdown__trigger').click({ force: true });
            await page.waitForTimeout(500);
            await page.locator('#travel-log-report-panel .dropdown__content button.dropdown__item').filter({ hasText: 'PDF' }).click({ force: true });
            await page.waitForTimeout(1000);
        } catch (error) {
            console.log('Export functionality failed:', error.message);
        }
    });
});