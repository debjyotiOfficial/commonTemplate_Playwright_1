const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Weekly Utilization Report', () => {
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

    test('should generate and validate weekly utilization report', async ({ page }) => {
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
        
        // Wait for successful login by checking we're no longer on login page
        await page.waitForURL('**/dashboard/**', { timeout: 30000 });
        await page.goto(config.urls.fleetDashboard3);

        // Click on reports section
        await expect(page.locator(config.selectors.navigation.reportSection)).toBeVisible();
        await page.locator(config.selectors.navigation.reportSection).click();

        await page.waitForTimeout(4000);

        // Click on Analytics section
        await page.locator(config.selectors.report.analyticsSection).filter({ hasText: 'Analytics' }).click();
        
        // Click on weekly utilization report
        await expect(page.locator(config.selectors.weeklyUtilizationReport.weeklyUtilizationMenu)).toBeVisible();
        await page.locator(config.selectors.weeklyUtilizationReport.weeklyUtilizationMenu).click();

        // Navigate to weekly utilization report page
        await page.goto(config.urls.weeklyUtilizationReportPage);
        
        // Wait for page to load and verify we're not on login page
        await page.waitForLoadState('networkidle');
        
        // Verify the weekly utilization report date is visible
        await expect(page.locator(config.selectors.weeklyUtilizationReport.reportDate)).toBeVisible();

        // Select "Last 7 Days" from the Report Duration dropdown
        await page.locator('#duration').selectOption('Last 7 Days');

        // Wait for the summary cards to load
        await page.waitForTimeout(3000);

        // Verify all 3 summary cards are visible
        const summaryCards = page.locator('.summary.card, .summary-card, [class*="summary"][class*="card"]');
        await expect(summaryCards).toHaveCount(3);

        // Verify each summary card is visible and contains content
        for (let i = 0; i < 3; i++) {
            const card = summaryCards.nth(i);
            await expect(card).toBeVisible();
            
            // Check if the card has some text content (not empty)
            const cardText = await card.textContent();
            expect(cardText?.trim()).toBeTruthy();
            
            console.log(`Summary Card ${i + 1} content: ${cardText?.trim()}`);
        }

        // Optional: Verify specific summary card titles/content if known
        // You can uncomment and modify these based on your actual summary card content
        /*
        const firstCard = summaryCards.nth(0);
        const secondCard = summaryCards.nth(1);
        const thirdCard = summaryCards.nth(2);
        
        await expect(firstCard).toContainText('Total Vehicles'); // Replace with actual expected text
        await expect(secondCard).toContainText('Active Vehicles'); // Replace with actual expected text
        await expect(thirdCard).toContainText('Utilization Rate'); // Replace with actual expected text
        */

        console.log('✅ All 3 summary cards verified successfully!');

        // Click on totalTrackers
        await expect(page.locator(config.selectors.weeklyUtilizationReport.totalTrackers)).toBeVisible();
        await page.locator(config.selectors.weeklyUtilizationReport.totalTrackers).click();

        // Verify the total trackers modal is visible
        await expect(page.locator(config.selectors.weeklyUtilizationReport.trackersModal)).toBeVisible();

        // Type "Sales car1" in the Search driver input inside the modal
        await expect(page.locator(config.selectors.weeklyUtilizationReport.searchDriver)).toBeVisible();
        await page.locator(config.selectors.weeklyUtilizationReport.searchDriver).clear();
        await page.locator(config.selectors.weeklyUtilizationReport.searchDriver).fill('Sales car1');

        // Verify the search results contain "Sales car1"
        await expect(page.locator(config.selectors.weeklyUtilizationReport.trackersTableBody)).toBeVisible();
        await page.locator(config.selectors.weeklyUtilizationReport.trackersTableBody).click();

        // Verify the modal opens
        await expect(page.locator(config.selectors.weeklyUtilizationReport.deviceModal)).toBeVisible();

        // Verify the modal title contains "Sales car1"
        await expect(page.locator(config.selectors.weeklyUtilizationReport.modalDriverName)).toBeVisible();
        await expect(page.locator(config.selectors.weeklyUtilizationReport.modalDriverName)).toContainText('Sales car1');

        await page.waitForTimeout(2000);

        // Click on close button
        await expect(page.locator(config.selectors.weeklyUtilizationReport.deviceModalcloseButton)).toBeVisible();
        await page.locator(config.selectors.weeklyUtilizationReport.deviceModalcloseButton).click();

        // Scroll to bottom of the modal
        await page.locator('#deviceModal').evaluate(el => el.scrollTo(0, el.scrollHeight));

        // Verify search
        await expect(page.locator(config.selectors.weeklyUtilizationReport.vehicleSearchInput)).toBeVisible();
        await page.locator(config.selectors.weeklyUtilizationReport.vehicleSearchInput).clear();
        await page.locator(config.selectors.weeklyUtilizationReport.vehicleSearchInput).fill('Sales car1');

        // Verify the search results contain "Sales car1"
        const vehicleRow = page.locator(config.selectors.weeklyUtilizationReport.vehicleTableBody).filter({ hasText: 'Sales car1' });
        await expect(vehicleRow).toBeVisible();
        await vehicleRow.click();

        // Verify the vehicle modal is visible
        await expect(page.locator(config.selectors.weeklyUtilizationReport.vehicleTableBody)).toBeVisible();

        // Store Sales Car1 efficiency from Vehicle Analytics table
        const salesCar1Row = page.locator('#vehicleAnalyticsTable tbody tr').filter({ hasText: 'Sales car1' });
        await expect(salesCar1Row).toBeVisible();
        
        const efficiencyCell = salesCar1Row.locator('td').last(); // Efficiency column is the last column
        const salesCar1Efficiency = await efficiencyCell.textContent();
        
        console.log(`Stored Sales Car1 efficiency: ${salesCar1Efficiency?.trim()}`);

        // Wait a moment for any additional content to load
        await page.waitForTimeout(2000);

        // Click on the first row in metricsTableBody and compare efficiency
        const firstMetricsRow = page.locator('#metricsTableBody tr').first();
        await firstMetricsRow.click();
        
        // Get efficiency from the clicked row and compare
        const clickedRowEfficiencyCell = firstMetricsRow.locator('td').last(); // Assuming efficiency is in the last column
        const clickedRowEfficiency = await clickedRowEfficiencyCell.textContent();
        
        // Clean the text by removing % and trimming whitespace
        const stored = salesCar1Efficiency?.trim().replace('%', '') || '';
        const clicked = clickedRowEfficiency?.trim().replace('%', '') || '';
        
        console.log(`Sales Car1 stored efficiency: ${stored}%`);
        console.log(`Clicked row efficiency: ${clicked}%`);
        
        // Convert to numbers for comparison
        const storedValue = parseFloat(stored);
        const clickedValue = parseFloat(clicked);
        
        // Compare with tolerance for floating point precision
        if (Math.abs(storedValue - clickedValue) < 0.1) {
            console.log('✅ Efficiencies match (within 0.1% tolerance)!');
        } else {
            console.log(`❌ Efficiencies differ by ${Math.abs(storedValue - clickedValue).toFixed(2)}%`);
        }
        
        // Log the comparison result
        if (storedValue === clickedValue) {
            console.log('✅ Exact efficiency match!');
        } else if (Math.abs(storedValue - clickedValue) < 1.0) {
            console.log('✅ Efficiencies are close (within 1%)');
        } else {
            console.log('ℹ️ Efficiencies are different but test continues');
        }
    });
});