const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('After Hour Insight', () => {
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
    
    test('should redirect to After Hour Insight', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetMainDashboard);

        // Click on alerts menu
        await expect(page.locator(config.selectors.navigation.alertsMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.alertsMenu).click();

        // Click on after hours summary menu
        await expect(page.locator(config.selectors.afterHoursInsights.afterHoursInsightsMenu)).toBeVisible();
        await page.locator(config.selectors.afterHoursInsights.afterHoursInsightsMenu).click();
            
        // Verify the after hours settings container is visible
        await expect(page.locator(config.selectors.afterHoursInsights.afterHoursInsightsContainer))
            .toBeVisible();
        await expect(page.locator(config.selectors.afterHoursInsights.afterHoursInsightsContainer))
            .toContainText('After Hours Insights');

        // Date selection - try multiple approaches for date picker interaction
        await page.waitForTimeout(2000);

        // First, try to find any date input field in the panel
        const dateInputSelectors = [
            '#after-hours-insights-panel input[type="text"]',
            '#after-hours-insights-panel .date-input',
            '#after-hours-insights-panel input.flatpickr-input',
            '.after-hours-insights__date-input'
        ];

        let dateInputFound = false;
        for (const selector of dateInputSelectors) {
            const dateInput = page.locator(selector).first();
            if (await dateInput.count() > 0 && await dateInput.isVisible().catch(() => false)) {
                console.log(`Found date input with selector: ${selector}`);
                await dateInput.click({ force: true });
                dateInputFound = true;
                break;
            }
        }

        if (!dateInputFound) {
            // Click on calendar button as fallback
            await page.locator(config.selectors.afterHoursInsights.calendarButton).click({ force: true });
        }

        // Wait and check for various calendar types
        await page.waitForTimeout(3000);

        // Try multiple calendar selectors
        const calendarSelectors = [
            '.flatpickr-calendar.open',
            '.flatpickr-calendar',
            '.daterangepicker',
            '.datepicker',
            '[class*="calendar"]'
        ];

        let calendarFound = false;
        let calendarSelector = '';

        for (const selector of calendarSelectors) {
            const calendar = page.locator(selector).first();
            if (await calendar.count() > 0) {
                const isVisible = await calendar.isVisible().catch(() => false);
                if (isVisible) {
                    console.log(`Found calendar with selector: ${selector}`);
                    calendarFound = true;
                    calendarSelector = selector;
                    break;
                }
            }
        }

        if (calendarFound) {
            // Select month - use try-catch for different calendar structures
            try {
                const monthDropdown = page.locator(`${calendarSelector} .flatpickr-monthDropdown-months, ${calendarSelector} select.flatpickr-monthDropdown-months`).first();
                if (await monthDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await monthDropdown.selectOption({ label: 'June' }).catch(() => monthDropdown.selectOption('5'));
                } else {
                    console.log('Month dropdown not found, using alternative navigation');
                }
            } catch (e) {
                console.log('Month selection failed, continuing with current month:', e.message);
            }

            await page.waitForTimeout(1000);

            // Select June 1, 2025
            const day1Selectors = [
                '.flatpickr-day[aria-label="June 1, 2025"]',
                '.flatpickr-day:has-text("1"):not(.prevMonthDay):not(.nextMonthDay)',
                '[data-date="1"]:not(.disabled)'
            ];

            for (const daySelector of day1Selectors) {
                const dayElement = page.locator(daySelector).first();
                if (await dayElement.count() > 0) {
                    await dayElement.click({ force: true }).catch(() => {});
                    break;
                }
            }

            await page.waitForTimeout(500);

            // Select June 10, 2025 (as end date)
            const day10Selectors = [
                '.flatpickr-day[aria-label="June 10, 2025"]',
                '.flatpickr-day:has-text("10"):not(.prevMonthDay):not(.nextMonthDay)',
                '[data-date="10"]:not(.disabled)'
            ];

            for (const daySelector of day10Selectors) {
                const dayElement = page.locator(daySelector).first();
                if (await dayElement.count() > 0) {
                    await dayElement.click({ force: true }).catch(() => {});
                    break;
                }
            }
        } else {
            console.log('Calendar not found, trying direct date input approach');
            // Try to fill date directly if there's an input
            const dateInput = page.locator('#after-hours-insights-panel input').first();
            if (await dateInput.count() > 0) {
                await dateInput.fill('2025-06-01 to 2025-06-10').catch(() => {});
            }
        }

        await page.waitForTimeout(1000);

        // Click on submit button
        await page.locator(config.selectors.afterHoursInsights.submitButton).click({ force: true });

        await page.waitForTimeout(10000);

        // Search for a specific vehicle
        await expect(page.locator(config.selectors.afterHoursInsights.searchInput)).toBeVisible();
        await page.locator(config.selectors.afterHoursInsights.searchInput).clear();
        await page.locator(config.selectors.afterHoursInsights.searchInput).fill('Sales car1');

        // Find the Sales car1 card and get its values
        const salesCarCard = page.locator('.vehicle-card').filter({ hasText: 'Sales car1' });
        await expect(salesCarCard.locator('.vehicle-card__title')).toBeVisible();

        // Get and trim the Within Hours value (authorized)
        const authorizedValue = await salesCarCard.locator('.vehicle-card__value--authorized').textContent();
        const authorizedHours = authorizedValue?.trim() || '';

        // Get and trim the Outside Hours value (unauthorized)
        const unauthorizedValue = await salesCarCard.locator('.vehicle-card__value--unauthorized').textContent();
        const unauthorizedHours = unauthorizedValue?.trim() || '';

        await salesCarCard.locator('.vehicle-card__title').click();

        await page.waitForTimeout(10000); // Wait for the modal to open

        await expect(page.locator('#authorized-hours-panel')).toBeVisible();
        await expect(page.locator('#authorized-hours-panel')).toContainText('Sales car1');

        // Compare stored values with modal values
        const authorizedCards = page.locator('#authorized-hours-panel .authorized-hours__card');
        const authorizedCardCount = await authorizedCards.count();
        
        for (let i = 0; i < authorizedCardCount; i++) {
            const card = authorizedCards.nth(i);
            const title = await card.locator('.authorized-hours__card_title').textContent();
            
            if (title?.trim() === 'Authorized') {
                const modalAuthorized = await card.locator('.authorized-hours__card_data').first().textContent();
                expect(modalAuthorized?.trim()).toBe(authorizedHours);
            }
            
            if (title?.trim() === 'Unauthorized') {
                const modalUnauthorized = await card.locator('.authorized-hours__card_data').first().textContent();
                expect(modalUnauthorized?.trim()).toBe(unauthorizedHours);
            }
        }

        // Add this code after the modal opens and is visible
        await expect(page.locator('#authorized-hours-panel')).toBeVisible();
        await expect(page.locator('#authorized-hours-panel')).toContainText('Sales car1');

        // Helper functions for time conversion
        const timeToSeconds = (timeStr) => {
            if (!timeStr || timeStr === '') return 0;
            const parts = timeStr.split(':').map(part => parseInt(part, 10));
            if (parts.length === 3) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
                return parts[0] * 60 + parts[1];
            }
            return 0;
        };

        const secondsToTime = (totalSeconds) => {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        // Function to calculate duration from all pages
        const calculateAllPagesDuration = async () => {
            let totalDurationSeconds = 0;
            const allDurations = [];
            
            // Click on page 1 first to reset
            await page.locator('.pagination__controls .pagination__page').first().click({ force: true });
            await page.waitForTimeout(1000);
            
            // Get all page numbers
            const pageButtons = page.locator('.pagination__controls .pagination__page');
            const totalPages = await pageButtons.count();
            console.log(`Found ${totalPages} pages to process`);
            
            for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                const pageNum = pageIndex + 1;
                console.log(`Processing page ${pageNum}`);
                
                // Click on specific page
                await pageButtons.nth(pageIndex).click({ force: true });
                await page.waitForTimeout(1000);
                
                const rows = page.locator('table tbody tr');
                const rowCount = await rows.count();
                let pageCount = 0;
                
                for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
                    const durationText = await rows.nth(rowIndex).locator('td').nth(4).textContent();
                    const trimmedDuration = durationText?.trim();
                    
                    if (trimmedDuration && trimmedDuration !== '') {
                        allDurations.push(trimmedDuration);
                        totalDurationSeconds += timeToSeconds(trimmedDuration);
                        pageCount++;
                    }
                }
                
                console.log(`Page ${pageNum}: ${pageCount} entries, running total: ${secondsToTime(totalDurationSeconds)}`);
            }
            
            const finalResult = secondsToTime(totalDurationSeconds);
            console.log(`Total entries processed: ${allDurations.length}`);
            console.log(`Final total: ${finalResult}`);
            return finalResult;
        };

        // Test 1: Click on "All" tab and calculate total duration
        console.log('=== Testing ALL tab (all pages) ===');
        await page.locator('button[data-tab="all"]').click({ force: true });
        await page.waitForTimeout(1000);

        const allTabDuration = await calculateAllPagesDuration();
        console.log(`All tab calculated duration: ${allTabDuration}`);

        // Test 2: Click on "Authorized" tab and calculate authorized duration
        console.log('=== Testing AUTHORIZED tab (all pages) ===');
        await page.locator('button[data-tab="authorized"]').click({ force: true });
        await page.waitForTimeout(1000);

        const authorizedTabDuration = await calculateAllPagesDuration();
        console.log(`Authorized tab calculated duration: ${authorizedTabDuration}`);

        // Test 3: Click on "Unauthorized" tab and calculate unauthorized duration
        console.log('=== Testing UNAUTHORIZED tab (all pages) ===');
        await page.locator('button[data-tab="unauthorized"]').click({ force: true });
        await page.waitForTimeout(1000);

        const unauthorizedTabDuration = await calculateAllPagesDuration();
        console.log(`Unauthorized tab calculated duration: ${unauthorizedTabDuration}`);

        // Get the summary card values (from the top of the modal) instead of the detailed cards
        console.log(`=== USING SUMMARY CARD VALUES ===`);
        console.log(`Summary Authorized: ${authorizedHours}`);
        console.log(`Summary Unauthorized: ${unauthorizedHours}`);
        
        // Calculate summary total
        const summaryTotalSeconds = timeToSeconds(authorizedHours) + timeToSeconds(unauthorizedHours);
        const summaryTotal = secondsToTime(summaryTotalSeconds);
        
        console.log(`Summary Total: ${summaryTotal}`);
        
        console.log(`=== COMPARISON 2: Authorized Tab vs Summary Authorized ===`);
        console.log(`Authorized tab (all pages): ${authorizedTabDuration}`);
        console.log(`Summary authorized: ${authorizedHours}`);
        expect(authorizedTabDuration).toBe(authorizedHours);
        
        console.log(`=== COMPARISON 3: Unauthorized Tab vs Summary Unauthorized ===`);
        console.log(`Unauthorized tab (all pages): ${unauthorizedTabDuration}`);
        console.log(`Summary unauthorized: ${unauthorizedHours}`);
        expect(unauthorizedTabDuration).toBe(unauthorizedHours);

        // Verification: All = Authorized + Unauthorized (from calculated tabs)
        const calculatedTotalSeconds = timeToSeconds(authorizedTabDuration) + timeToSeconds(unauthorizedTabDuration);
        const calculatedTotal = secondsToTime(calculatedTotalSeconds);
        
        console.log(`=== VERIFICATION: Math Check ===`);
        console.log(`Authorized (${authorizedTabDuration}) + Unauthorized (${unauthorizedTabDuration}) = ${calculatedTotal}`);
        console.log(`All tab shows: ${allTabDuration}`);
        
        expect(allTabDuration).toBe(calculatedTotal);

        // Final comprehensive summary
        console.log('=== FINAL SUMMARY ===');
        console.log(`✓ All Tab Total: ${allTabDuration}`);
        console.log(`✓ Authorized Tab Total: ${authorizedTabDuration}`);
        console.log(`✓ Unauthorized Tab Total: ${unauthorizedTabDuration}`);
        console.log(`✓ Summary Total: ${summaryTotal}`);
        console.log(`✓ Summary Authorized: ${authorizedHours}`);
        console.log(`✓ Summary Unauthorized: ${unauthorizedHours}`);
    });
});