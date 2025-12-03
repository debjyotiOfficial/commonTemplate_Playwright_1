const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Geofencing Tests', () => {
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

    test('should redirect to fleet demo page with demo credentials', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);
            
        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        // Click on the "Landmarks" accordion button in the Geofencing menu
        await page.locator('.accordion__button.accordion--nested').filter({ hasText: 'Landmarks' }).click({ force: true });

        // Wait for the landmarks accordion to expand
        await page.waitForTimeout(3000);

        await expect(page.locator(config.selectors.navigation.landmarkReportMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.landmarkReportMenu).click({ force: true });

        await page.waitForTimeout(2000); // Wait for element to be ready

        // Verify the landmark report container is visible
        await expect(page.locator(config.selectors.landmarkReport.landmarkReportContainer)).toBeVisible();
        await expect(page.locator(config.selectors.landmarkReport.landmarkReportContainer))
            .toContainText('Landmarks Report');

        // Wait for the dropdown button to be available and scroll it into view
        const dropdownTrigger = page.locator('#landmarks-report-panel button.dropdown__trigger');
        await dropdownTrigger.waitFor({ state: 'visible' });
        await dropdownTrigger.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000); // Wait for any animations to complete
        
        // Hover over Save file as and download the report                    
        await dropdownTrigger.hover();

        // Click on "Excel"
        await page.locator('#landmarks-report-panel .dropdown__content button.dropdown__item').filter({ hasText: 'Excel' }).click({ force: true });

        // Click on "Save file as" dropdown again (if needed)
        await dropdownTrigger.hover();

        // Click on "CSV"
        await page.locator('#landmarks-report-panel .dropdown__content button.dropdown__item').filter({ hasText: 'CSV' }).click({ force: true });

        // Click on "Save file as" dropdown again (if needed)
        await dropdownTrigger.hover();

        // Click on "PDF"
        await page.locator('#landmarks-report-panel .dropdown__content button.dropdown__item').filter({ hasText: 'PDF' }).click({ force: true });

        // Clear hover state by clicking elsewhere to dismiss dropdown overlay
        await page.locator(config.selectors.landmarkReport.landmarkReportContainer).click();
        await page.waitForTimeout(1000);

        // Search for a landmark
        await expect(page.locator(config.selectors.landmarkReport.searchInput)).toBeVisible();
        await page.locator(config.selectors.landmarkReport.searchInput).clear();
        await page.locator(config.selectors.landmarkReport.searchInput).fill('Sales car1');

        // Verify the search results in the table
        await expect(page.locator(config.selectors.landmarkReport.landmarkReportRows)).toBeVisible();
        const rowCount = await page.locator(config.selectors.landmarkReport.landmarkReportRows).count();
        expect(rowCount).toBeGreaterThanOrEqual(1);

        // Check if directions icons exist in the landmarks report table
        const directionsIcons = page.locator(config.selectors.landmarkReport.landmarkReportRows + ' .icon--directions');
        const iconCount = await directionsIcons.count();
        
        expect(iconCount).toBeGreaterThanOrEqual(1);

        // Click the first directions icon and verify Google Maps link behavior
        const firstDirectionsIcon = directionsIcons.first();
    });
});