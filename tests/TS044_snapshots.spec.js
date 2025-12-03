const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Snapshots', () => {
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

    test('should display snapshots', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashcamDashboard2);

        await page.waitForTimeout(config.timeouts.wait);

        // Hover over "dashcamMenu"
        await page.locator(config.selectors.dashcam.dashcamMenu).hover();
        await page.waitForTimeout(500); // Give time for menu to open

        // Click on "dashcamMenu"
        await expect(page.locator(config.selectors.dashcam.dashcamMenu)).toBeVisible();
        await page.locator(config.selectors.dashcam.dashcamMenu).click();

        // Click on snapshot button
        await page.locator(config.selectors.dashcam.snapshots).click({ force: true });

        await page.waitForTimeout(config.timeouts.wait);

        // Wait for the dashcam refresh container to be visible
        await expect(page.locator(config.selectors.dashcam.snapshotmodal)).toBeVisible();

        // Click on submit
        await expect(page.locator(config.selectors.dashcam.conformSnapshotModal)).toBeVisible();
        await page.locator(config.selectors.dashcam.conformSnapshotModal).click();

        await expect(page.locator(config.selectors.dashcam.currentPhotoPopup)).toBeVisible();

        await expect(page.locator(config.selectors.dashcam.dashcamCard).first()).toBeVisible();

        // Click on "Download Road View" button
        await page.locator(config.selectors.dashcam.downloadRearView).first().click();

        // Click on "Download Driver View" button
        await page.locator(config.selectors.dashcam.downloadDriverView).first().click();

        // Extract status text from ALL dashcam cards and test each filter individually
        const statusElements = await page.locator(config.selectors.dashcam.dashcamStatus).all();
        console.log(`Found ${statusElements.length} dashcam cards with status indicators`);

        for (let i = 0; i < statusElements.length; i++) {
            const statusText = await statusElements[i].textContent();
            
            if (statusText) {
                const cleanStatusText = statusText.trim();
                console.log(`Testing filter for card ${i + 1} with status: "${cleanStatusText}"`);
                
                // Find and click the matching filter button within filter-buttons div
                const filterButton = page.locator('div.filter-buttons .filter-btn').filter({ hasText: cleanStatusText });
                
                // Check if the filter button exists
                const filterButtonCount = await filterButton.count();
                if (filterButtonCount > 0) {
                    console.log(`Found matching filter button for status: "${cleanStatusText}"`);
                    
                    // Click the matching filter button
                    await expect(filterButton.first()).toBeVisible();
                    await filterButton.first().click();
                    
                    // Wait for filtering to complete
                    await page.waitForTimeout(1000);
                    
                    // Verify that dashcam cards with the matching status are visible
                    const matchingCards = page.locator(config.selectors.dashcam.dashcamCard).filter({ 
                        has: page.locator(`.dashcam-card__status:has-text("${cleanStatusText}")`)
                    });
                    
                    const matchingCardCount = await matchingCards.count();
                    if (matchingCardCount > 0) {
                        await expect(matchingCards.first()).toBeVisible();
                        console.log(`Successfully verified ${matchingCardCount} dashcam card(s) with status "${cleanStatusText}" are visible`);
                    } else {
                        console.log(`No dashcam cards found with status "${cleanStatusText}" after filtering`);
                    }
                    
                    // Verify that the filter button is now active
                    await expect(filterButton.first()).toHaveClass(/active/);
                    console.log(`Filter button for "${cleanStatusText}" is now active`);
                    
                    // Reset to "All" filter for next iteration (unless this is the last one)
                    if (i < statusElements.length - 1) {
                        await page.locator(config.selectors.dashcam.allButton).click();
                        await page.waitForTimeout(500);
                        console.log(`Reset to "All" filter for next test`);
                    }
                    
                } else {
                    console.log(`No matching filter button found for status: "${cleanStatusText}"`);
                    // Fallback to original logic if no specific filter button found
                    const fallbackFilter = page.locator('.filter-btn').filter({ hasText: cleanStatusText });
                    if (await fallbackFilter.count() > 0) {
                        await fallbackFilter.first().click();
                        await page.waitForTimeout(1000);
                        
                        // Reset to "All" for next iteration
                        if (i < statusElements.length - 1) {
                            await page.locator(config.selectors.dashcam.allButton).click();
                            await page.waitForTimeout(500);
                        }
                    }
                }
            } else {
                console.log(`Card ${i + 1} has no status text`);
            }
        }
        
        // If no status elements were found at all, use fallback approach
        if (statusElements.length === 0) {
            console.log('No dashcam status elements found, using fallback approach');
            const fallbackStatusText = await page.locator(config.selectors.dashcam.dashcamStatus).first().textContent();
            if (fallbackStatusText) {
                await page.locator('.filter-btn').filter({ hasText: fallbackStatusText.trim() }).click();
            }
        }

        // Reset filters to show all cards after the testing loop
        await page.locator(config.selectors.dashcam.allButton).click();
        await page.waitForTimeout(500);
        console.log('Reset to "All" filter after testing loop completed');

        // Verify dashcam card is visible after filtering
        await expect(page.locator(config.selectors.dashcam.dashcamCard).first()).toBeVisible();

        // Verify the "All" button is already active (filters already reset)
        await expect(page.locator(config.selectors.dashcam.allButton)).toHaveClass(/active/);

        // Intercept the API call before interacting with the checkbox
        const updateColorizePromise = page.waitForResponse(response => 
            response.url().includes('updateColorizeOption.php') && response.request().method() === 'POST'
        );

        // Check the "Show Images In Color" checkbox
        await page.locator('.colorize-checkbox').check({ force: true });

        // Wait for the API call and assert status 200
        const response = await updateColorizePromise;
        expect(response.status()).toBe(200);

        console.log('Snapshots test completed successfully');
    });
});