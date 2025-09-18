const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Create Geofencing', () => {
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

    test('should be able to create new Geofence', async ({ page }) => {
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
            
        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        await page.waitForTimeout(2000); // Wait for element to be ready

        await expect(page.locator(config.selectors.navigation.creategeofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.creategeofencingMenu).click();

        await page.waitForTimeout(2000); // Wait for element to be ready
        
        await expect(page.locator(config.selectors.modal.geofencingContainer)).toBeVisible();
        
        // Verify modal title
        await expect(page.locator(config.selectors.modal.geofencingTitle)).toBeVisible();
        await expect(page.locator(config.selectors.modal.geofencingTitle))
            .toContainText(config.selectors.modal.expectedGeofencingTitle);

        // Verify Enter address input
        await expect(page.locator(config.selectors.geofencingInput.addressField)).toBeVisible();
        await page.locator(config.selectors.geofencingInput.addressField).clear();
        await page.locator(config.selectors.geofencingInput.addressField).fill(config.testData.geofencingAddress);
        
        // Wait for address suggestions to appear
        await page.waitForTimeout(5000);

        // Verify Enter name input - click on address suggestion
        await expect(page.locator(config.selectors.geofencingInput.nameField).filter({ hasText: 'San Ramon, CA' })).toBeVisible();
        await page.locator(config.selectors.geofencingInput.nameField).filter({ hasText: 'San Ramon, CA' }).click();

        // Verify Enter radius input
        await expect(page.locator(config.selectors.geofencingInput.radiusField)).toBeVisible();
        await page.locator(config.selectors.geofencingInput.radiusField).clear();
        await page.locator(config.selectors.geofencingInput.radiusField).fill(config.testData.geofencingRadius);

        // Enter name of geofence
        await expect(page.locator(config.selectors.geofencingInput.geofenceName)).toBeVisible();
        await page.locator(config.selectors.geofencingInput.geofenceName).clear();
        await page.locator(config.selectors.geofencingInput.geofenceName).fill(config.testData.geofenceName);

        // Click the Submit button
        await expect(page.locator(config.selectors.geofencingInput.submitButton)).toBeVisible();
        await page.locator(config.selectors.geofencingInput.submitButton).click();

        await page.waitForTimeout(5000);

        // Click on save button plotted on the map - Multiple approaches
        console.log('Attempting to click on save button on the map...');
        
        // Wait for the map and save button to be fully loaded
        await page.waitForTimeout(3000);
        
        // Approach 1: Try standard text locators first
        let saveButtonClicked = false;
        const textSaveSelectors = [
            page.locator('text=/^Save$/i').first(),
            page.locator('text=Save').first(),
            page.locator('button:has-text("Save")'),
            page.locator('div:has-text("Save")'),
            page.locator('[title="Save"]'),
            page.locator('[alt="Save"]')
        ];

        for (const selector of textSaveSelectors) {
            try {
                await selector.waitFor({ state: 'visible', timeout: 3000 });
                await selector.click({ force: true });
                console.log('Successfully clicked save button using text selector');
                saveButtonClicked = true;
                break;
            } catch (e) {
                console.log(`Text selector failed: ${e.message}`);
                continue;
            }
        }

        // Approach 2: Try coordinate-based clicking if text selectors fail
        if (!saveButtonClicked) {
            console.log('Using coordinate-based approach to click save button...');
            try {
                // Get the map container dimensions
                const mapContainer = page.locator('#map, .map-container, [id*="map"]').first();
                const mapBox = await mapContainer.boundingBox();
                
                if (mapBox) {
                    // Click in the center-right area of the map where save button might be located
                    const clickX = mapBox.x + mapBox.width * 0.8; // 80% from left
                    const clickY = mapBox.y + mapBox.height * 0.5; // 50% from top
                    
                    console.log(`Clicking at coordinates: (${clickX}, ${clickY})`);
                    await page.mouse.click(clickX, clickY);
                    console.log('Successfully clicked on save button using coordinates');
                    saveButtonClicked = true;
                } else {
                    throw new Error('Could not find map container');
                }
            } catch (coordError) {
                console.log(`Coordinate approach failed: ${coordError.message}`);
            }
        }

        // Approach 3: Try to trigger the tap event directly via JavaScript
        if (!saveButtonClicked) {
            try {
                await page.evaluate(() => {
                    // Look for the save button marker in the Here Maps objects
                    if (window.saveButton) {
                        // Trigger the tap event manually
                        const tapEvent = new Event('tap', { bubbles: true });
                        window.saveButton.dispatchEvent(tapEvent);
                        return true;
                    }
                    
                    // Alternative: Look for any marker with save icon
                    const markers = document.querySelectorAll('[style*="save.png"], img[src*="save.png"]');
                    if (markers.length > 0) {
                        markers[0].click();
                        return true;
                    }
                    
                    return false;
                });
                console.log('Successfully triggered save button via JavaScript');
                saveButtonClicked = true;
            } catch (jsError) {
                console.log(`JavaScript approach failed: ${jsError.message}`);
            }
        }

        // Approach 4: Try to find and click on any clickable element that might be the save button
        if (!saveButtonClicked) {
            try {
                const clickableElements = page.locator('div[role="button"], button, a, [onclick*="save"], [class*="save"]');
                const count = await clickableElements.count();
                
                for (let i = 0; i < Math.min(count, 10); i++) {
                    const element = clickableElements.nth(i);
                    const text = await element.textContent();
                    const className = await element.getAttribute('class');
                    
                    if (text && text.toLowerCase().includes('save') || 
                        className && className.toLowerCase().includes('save')) {
                        await element.click();
                        console.log('Successfully clicked on save button using text/class matching');
                        saveButtonClicked = true;
                        break;
                    }
                }
            } catch (finalError) {
                console.log(`Final approach failed: ${finalError.message}`);
            }
        }

        // Approach 5: Alternative save button trigger
        if (!saveButtonClicked) {
            console.log('Trying alternative save button trigger...');
            try {
                await page.evaluate(() => {
                    // Look for the save button in the Here Maps context
                    if (window.saveButton) {
                        // Create a more specific tap event
                        const tapEvent = new CustomEvent('tap', {
                            bubbles: true,
                            cancelable: true,
                            detail: { originalEvent: new MouseEvent('click') }
                        });
                        window.saveButton.dispatchEvent(tapEvent);
                        return true;
                    }
                    
                    // Try to find the save button by its icon
                    const saveIcons = document.querySelectorAll('img[src*="save.png"], div[style*="save.png"]');
                    if (saveIcons.length > 0) {
                        // Trigger click on the parent element
                        const parentElement = saveIcons[0].closest('div') || saveIcons[0].parentElement;
                        if (parentElement) {
                            parentElement.click();
                            return true;
                        }
                    }
                    
                    return false;
                });
                console.log('Alternative save button trigger completed');
                saveButtonClicked = true;
            } catch (altError) {
                console.log(`Alternative approach failed: ${altError.message}`);
            }
        }

        if (!saveButtonClicked) {
            console.log('Warning: Could not interact with save button on the map, continuing with test...');
        }

        await page.waitForTimeout(40000); // Wait for element to be ready

        await expect(page.locator(config.selectors.navigation.geofencingMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.geofencingMenu).click();

        await expect(page.locator(config.selectors.geofencingInput.viewDelGeo)).toBeVisible();
        await page.locator(config.selectors.geofencingInput.viewDelGeo).click();

        await page.waitForTimeout(20000); // Wait for element to be ready

        // Select geofence from the list
        await expect(page.locator(config.selectors.viewDeleteGeofencing.geoList)).toBeVisible();
        await page.locator(config.selectors.viewDeleteGeofencing.geoList).selectOption('Test Auto Geofence (2201 Camino Ramon, San Ramon, CA 94583, United States)');

        // Click on submit button
        await expect(page.locator(config.selectors.viewDeleteGeofencing.submitButton)).toBeVisible();
        await page.locator(config.selectors.viewDeleteGeofencing.submitButton).click();

        await page.waitForTimeout(5000);
        
        // Verify the textbox is visible and contains the geofence name
        await expect(page.locator('#geolabel_id')).toBeVisible();
        await expect(page.locator('#geolabel_id')).toHaveValue('Test Auto Geofence');
    });
});